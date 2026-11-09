import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire, registerHooks } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.resolve('nuxt'))
const h3Path = require.resolve('h3')
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'h3')
      return nextResolve(h3Path, context)
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(url)))
        return nextResolve(url.href, context)
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    const loaded = nextLoad(url, context)
    if (url.endsWith('/server/utils/auth.ts'))
      return { ...loaded, source: String(loaded.source).replaceAll('import.meta.dev', 'true') }
    return loaded
  },
})
const { createError } = require('h3')

globalThis.createError = createError
globalThis.useRuntimeConfig = () => ({})
globalThis.getRequestURL = () => new URL('http://localhost:3010')
const { issueMagicLink, sha256 } = await import('../server/utils/auth.ts')
const { useDatabase } = await import('../server/database/client.ts')

function fixture(t, { gateReads = false } = {}) {
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  sqlite.exec(readFileSync(new URL('../migrations/0000_mean_gamma_corps.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0001_buyer_accounts_and_inquiries.sql', import.meta.url), 'utf8'))
  let reads = 0
  let release
  const readGate = new Promise(resolve => release = resolve)
  let batchQueue = Promise.resolve()
  const binding = {
    prepare(sql) {
      const statement = params => ({
        bind(...values) { return statement(values) },
        async raw() {
          const query = sqlite.prepare(sql)
          query.setReturnArrays(true)
          const rows = query.all(...params)
          if (gateReads && sql.startsWith('select') && sql.includes('from "auth_tokens"')) {
            if (++reads === 2)
              release()
            await readGate
          }
          return rows
        },
        async all() {
          const query = sqlite.prepare(sql)
          const results = query.columns().length ? query.all(...params) : (query.run(...params), [])
          return { success: true, results, meta: { changes: sqlite.prepare('SELECT changes() AS count').get().count } }
        },
        async run() { return this.all() },
      })
      return statement([])
    },
    batch(statements) {
      const result = batchQueue.then(async () => {
        sqlite.exec('BEGIN')
        try {
          const results = []
          for (const statement of statements)
            results.push(await statement.all())
          sqlite.exec('COMMIT')
          return results
        }
        catch (error) {
          sqlite.exec('ROLLBACK')
          throw error
        }
      })
      batchQueue = result.catch(() => {})
      return result
    },
  }
  const event = { context: { cloudflare: { env: { DB: binding } } } }
  return { sqlite, event, database: useDatabase(event) }
}

test('concurrent local magic-link requests accept only one issuance per identity', { timeout: 5000 }, async (t) => {
  const { sqlite, event, database } = fixture(t, { gateReads: true })
  const outcomes = await Promise.allSettled([
    issueMagicLink({ database, event, email: 'same@example.invalid', role: 'buyer' }),
    issueMagicLink({ database, event, email: 'same@example.invalid', role: 'buyer' }),
  ])
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1)
  const rejected = outcomes.filter(result => result.status === 'rejected')
  assert.equal(rejected.length, 1)
  assert.equal(rejected[0].reason.statusCode, 429)
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM auth_tokens').get().count, 1)
  const accepted = outcomes.find(result => result.status === 'fulfilled').value
  const token = new URL(accepted.link).searchParams.get('token')
  assert.ok(sqlite.prepare('SELECT token_hash FROM auth_tokens').get().token_hash === await sha256(token), 'the accepted local link remains usable')
})

test('local issuance cooldowns keep same-email Buyer and Agency identities separate', { timeout: 5000 }, async (t) => {
  const { sqlite, event, database } = fixture(t)
  const outcomes = await Promise.allSettled(['buyer', 'agency'].map(role => issueMagicLink({ database, event, email: 'same@example.invalid', role })))
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 2)
  assert.deepEqual(sqlite.prepare('SELECT role FROM auth_tokens ORDER BY role').all().map(row => row.role), ['agency', 'buyer'])
})

test('local issuance preserves a recent token and replaces an older token', { timeout: 5000 }, async (t) => {
  const { sqlite, event, database } = fixture(t)
  const now = new Date()
  const insert = sqlite.prepare('INSERT INTO auth_tokens (id,email,role,token_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)')
  insert.run('recent', 'recent@example.invalid', 'buyer', 'recent-fixture-hash', new Date(now.getTime() + 900000).toISOString(), now.toISOString())
  insert.run('older', 'older@example.invalid', 'buyer', 'older-fixture-hash', new Date(now.getTime() + 900000).toISOString(), new Date(now.getTime() - 90000).toISOString())
  await assert.rejects(issueMagicLink({ database, event, email: 'recent@example.invalid', role: 'buyer' }), { statusCode: 429 })
  assert.equal(sqlite.prepare('SELECT id FROM auth_tokens WHERE email=?').get('recent@example.invalid').id, 'recent')
  const accepted = await issueMagicLink({ database, event, email: 'older@example.invalid', role: 'buyer' })
  const rows = sqlite.prepare('SELECT id,token_hash FROM auth_tokens WHERE email=?').all('older@example.invalid')
  assert.equal(rows.length, 1)
  assert.notEqual(rows[0].id, 'older')
  assert.ok(rows[0].token_hash === await sha256(new URL(accepted.link).searchParams.get('token')), 'replacement stores the accepted local link')
})
