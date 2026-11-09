import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { IncomingMessage, ServerResponse } from 'node:http'
import { createRequire, registerHooks } from 'node:module'
import { Socket } from 'node:net'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(url)))
        return nextResolve(url.href, context)
    }
    return nextResolve(specifier, context)
  },
})
const { createError, createEvent, defineEventHandler, getRouterParam, setHeader } = createRequire(import.meta.resolve('nuxt'))('h3')
Object.assign(globalThis, { createError, defineEventHandler, getRouterParam, setHeader })
globalThis.requireUserSession = async (event) => {
  if (!event.context.user)
    throw createError({ statusCode: 401 })
  return { user: event.context.user }
}
const { requireBuyerSession } = await import('../server/utils/auth.ts')
globalThis.requireBuyerSession = requireBuyerSession
const { default: save } = await import('../server/api/buyer/saved/[id].put.ts')

function fixture({ withdrawAfterInsert = false } = {}) {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys=ON')
  for (const name of ['0000_mean_gamma_corps.sql', '0001_buyer_accounts_and_inquiries.sql'])
    sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'))
  sqlite.exec(`
    INSERT INTO agencies VALUES ('agency-a','本機測試公司','agency@example.invalid','本機測試','https://line.me/test','2026-10-09','2026-10-09');
    INSERT INTO buyers VALUES ('buyer-a','買方甲','a@example.invalid','2026-10-09'),('buyer-b','買方乙','b@example.invalid','2026-10-09');
    INSERT INTO properties (id,property_number,agency_id,status,property_type,build_status,title_zh_tw,description_zh_tw,price_yen,ward,address_zh_tw,layout,built_on,next_update_on,created_at,updated_at)
    VALUES ('property-a','LOCAL-A','agency-a','published','condominium','resale','公開標題','公開說明',1,'目黑區','公開地址','2LDK','2010-01','2027-01-01','2026-10-09','2026-10-09');
  `)
  const statements = []
  let withdrawalCount = 0
  const binding = {
    prepare(sql) {
      const execute = params => ({
        bind(...values) { return execute(values) },
        async raw() {
          statements.push(sql)
          const statement = sqlite.prepare(sql)
          statement.setReturnArrays(true)
          const rows = statement.all(...params)
          afterStatement(sql)
          return rows
        },
        async run() {
          statements.push(sql)
          const result = sqlite.prepare(sql).run(...params)
          afterStatement(sql)
          return { success: true, results: [], meta: { changes: Number(result.changes) } }
        },
      })
      return execute([])
    },
  }
  function afterStatement(sql) {
    if (withdrawAfterInsert && !withdrawalCount && /^insert into "saved_properties"/i.test(sql)) {
      assert.equal(sqlite.prepare('SELECT count(*) AS n FROM saved_properties').get().n, 1, 'the save is committed before withdrawal')
      sqlite.exec('UPDATE properties SET status=\'withdrawn\',title_zh_tw=\'隱藏標題\',description_zh_tw=\'隱藏說明\',address_zh_tw=\'隱藏地址\' WHERE id=\'property-a\'')
      withdrawalCount++
    }
  }
  function event(buyerId = 'buyer-a') {
    const request = new IncomingMessage(new Socket())
    request.method = 'PUT'
    request.url = '/api/buyer/saved/property-a?buyerId=buyer-b'
    const response = new ServerResponse(request)
    const event = createEvent(request, response)
    event.context.params = { id: 'property-a' }
    event.context.user = { id: buyerId, role: 'buyer' }
    event.context.cloudflare = { env: { DB: binding } }
    return event
  }
  return { sqlite, event, statements, withdrawalCount: () => withdrawalCount }
}

function savedRows(sqlite) {
  return sqlite.prepare('SELECT buyer_id,property_id,created_at FROM saved_properties ORDER BY buyer_id').all().map(row => ({ ...row }))
}

test('PUT returns accepted persistence when withdrawal commits immediately after insert', async () => {
  const { sqlite, event, statements, withdrawalCount } = fixture({ withdrawAfterInsert: true })
  try {
    const request = event()
    const result = await save(request)
    assert.equal(withdrawalCount(), 1)
    assert.equal(sqlite.prepare('SELECT status FROM properties').get().status, 'withdrawn')
    assert.equal(request.node.res.getHeader('Cache-Control'), 'private, no-store')
    assert.deepEqual(Object.keys(result).sort(), ['createdAt', 'propertyId'])
    assert.equal(result.propertyId, 'property-a')
    assert.ok(Number.isFinite(Date.parse(result.createdAt)))
    assert.deepEqual(savedRows(sqlite), [{ buyer_id: 'buyer-a', property_id: 'property-a', created_at: result.createdAt }])
    assert.ok(!JSON.stringify(result).includes('隱藏'))
    assert.equal(statements.filter(sql => /from "saved_properties"/i.test(sql)).length, 0, 'an accepted insert must not need a later confirmation query')
    const again = await save(event())
    assert.deepEqual(again, result, 'the existing owned key remains an idempotent success after withdrawal')
    assert.equal(savedRows(sqlite).length, 1)
    await assert.rejects(save(event('buyer-b')), { statusCode: 404 })
    assert.equal(savedRows(sqlite).length, 1, 'another Buyer must not create a new save for the Withdrawn Listing')
  }
  finally {
    sqlite.close()
  }
})

test('new withdrawn and draft saves are denied, while Published saves keep one owned key', async () => {
  const { sqlite, event } = fixture()
  try {
    for (const status of ['withdrawn', 'draft']) {
      sqlite.prepare('UPDATE properties SET status=?').run(status)
      await assert.rejects(save(event()), { statusCode: 404 })
      assert.deepEqual(savedRows(sqlite), [])
    }
    sqlite.exec('UPDATE properties SET status=\'published\'')
    const first = await save(event())
    const retries = await Promise.all(Array.from({ length: 4 }, () => save(event())))
    assert.ok(retries.every(result => JSON.stringify(result) === JSON.stringify(first)))
    assert.equal(savedRows(sqlite).length, 1)
    const secondBuyer = await save(event('buyer-b'))
    assert.equal(secondBuyer.propertyId, 'property-a')
    assert.deepEqual(savedRows(sqlite).map(row => row.buyer_id), ['buyer-a', 'buyer-b'])
  }
  finally {
    sqlite.close()
  }
})
