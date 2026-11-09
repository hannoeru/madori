import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { once } from 'node:events'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
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
})
const h3 = require('h3')

Object.assign(globalThis, {
  createError: h3.createError,
  defineEventHandler: h3.defineEventHandler,
  getRouterParam: h3.getRouterParam,
  getHeader: h3.getHeader,
  readBody: h3.readBody,
  setResponseHeader: h3.setResponseHeader,
  setResponseStatus: h3.setResponseStatus,
})
globalThis.requireUserSession = async (event) => {
  if (!event.context.user)
    throw h3.createError({ statusCode: 401 })
  return { user: event.context.user }
}
globalThis.requireAgencySession = (await import('../server/utils/auth.ts')).requireAgencySession
const upload = (await import('../server/api/admin/properties/[id]/images.post.ts')).default
const recover = (await import('../server/api/admin/media-recovery.post.ts')).default
const cleanup = (await import('../server/api/admin/media-cleanup.post.ts')).default
const cleanupStatus = (await import('../server/api/admin/media-cleanup.get.ts')).default
const detail = (await import('../server/api/admin/properties/[id].get.ts')).default

async function fixture(t) {
  const sqlite = new DatabaseSync(':memory:')
  let server
  t.after(async () => {
    try {
      if (server?.listening) {
        await new Promise((resolve, reject) => {
          server.close(error => error ? reject(error) : resolve())
          server.closeAllConnections()
        })
      }
    }
    finally {
      sqlite.close()
    }
  })
  sqlite.exec('PRAGMA foreign_keys=ON')
  for (const name of ['0000_mean_gamma_corps.sql', '0001_buyer_accounts_and_inquiries.sql', '0002_agency_media_cleanup.sql'])
    sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'))
  sqlite.exec(`
    INSERT INTO agencies VALUES ('agency-a','示範甲','a@example.invalid','本機測試','https://line.me/test','2026-10-10','2026-10-10'),('agency-b','示範乙','b@example.invalid','本機測試','https://line.me/test','2026-10-10','2026-10-10');
    INSERT INTO properties (id,property_number,agency_id,status,property_type,build_status,title_zh_tw,description_zh_tw,price_yen,ward,address_zh_tw,layout,built_on,next_update_on,created_at,updated_at)
    VALUES ('property-a','LOCAL-A','agency-a','draft','condominium','resale','示範甲','本機測試',1,'目黑區','示範地址','2LDK','2010-01','2027-01-01','2026-10-10','2026-10-10');
    INSERT INTO property_images VALUES ('photo-a','property-a','photo-a','photo',0,1,'原照片','2026-10-10'),('plan-a','property-a','plan-a','floor_plan',0,0,'原格局圖','2026-10-10');
  `)
  const state = { put: 'healthy', delete: 'healthy', loseBatchAcknowledgment: false }
  const objects = new Map([['photo-a', { bytes: Buffer.from('original photo') }], ['plan-a', { bytes: Buffer.from('original plan') }]])
  const deleted = []
  const database = {
    prepare(sql) {
      const statement = params => ({
        bind(...values) { return statement(values) },
        async raw() {
          const query = sqlite.prepare(sql)
          query.setReturnArrays(true)
          return query.all(...params)
        },
        async all() { return { success: true, results: sqlite.prepare(sql).all(...params), meta: {} } },
        async run() { return { success: true, results: [], meta: { changes: Number(sqlite.prepare(sql).run(...params).changes) } } },
      })
      return statement([])
    },
    async batch(statements) {
      const results = []
      sqlite.exec('BEGIN')
      try {
        for (const statement of statements)
          results.push(await statement.run())
      }
      catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
      sqlite.exec('COMMIT')
      if (state.loseBatchAcknowledgment) {
        state.loseBatchAcknowledgment = false
        throw new Error('D1 acknowledgment lost after commit')
      }
      return results
    },
  }
  const bucket = {
    async put(key, bytes, options) {
      if (state.put === 'reject')
        throw new Error('R2 put unavailable')
      objects.set(key, { bytes: Buffer.from(bytes), ...options })
      if (state.put === 'accept-then-reject')
        throw new Error('R2 acknowledgment lost after acceptance')
    },
    async head(key) { return objects.get(key) ?? null },
    async delete(keys) {
      if (state.delete === 'reject')
        throw new Error('R2 delete unavailable')
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        deleted.push(key)
        objects.delete(key)
      }
    },
  }
  const app = h3.createApp()
  app.use(h3.defineEventHandler((event) => {
    const id = h3.getHeader(event, 'x-test-account')
    if (id)
      event.context.user = { id, role: id === 'buyer-a' ? 'buyer' : 'agency' }
    event.context.cloudflare = { env: { DB: database, LISTING_IMAGES: bucket } }
  }))
  const router = h3.createRouter()
  router.get('/api/admin/properties/:id', detail)
  router.get('/api/admin/media-cleanup', cleanupStatus)
  router.post('/api/admin/properties/:id/images', upload)
  router.post('/api/admin/media-recovery', recover)
  router.post('/api/admin/media-cleanup', cleanup)
  app.use(router)
  server = createServer(h3.toNodeListener(app))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening', { signal: AbortSignal.timeout(5000) })
  const base = `http://127.0.0.1:${server.address().port}`
  async function request(path, body, account = 'agency-a') {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      signal: AbortSignal.timeout(5000),
      headers: { ...(account ? { 'x-test-account': account } : {}), ...(body === undefined || body instanceof FormData ? {} : { 'content-type': 'application/json' }) },
      body: body instanceof FormData ? body : JSON.stringify(body),
    })
    return { status: response.status, cache: response.headers.get('cache-control'), body: await response.json() }
  }
  function sendImage(kind = 'photo') {
    const body = new FormData()
    const file = kind === 'floor_plan' ? './fixtures/floor-plan-demo.png' : './fixtures/interior-demo.png'
    body.set('file', new Blob([readFileSync(new URL(file, import.meta.url))], { type: 'image/png' }), 'demo.png')
    body.set('kind', kind)
    body.set('alt', '示範 HTTP 上傳')
    return request('/api/admin/properties/property-a/images', body)
  }
  async function reload() {
    const result = await request('/api/admin/properties/property-a')
    assert.equal(result.status, 200)
    return result.body
  }
  async function pendingCount() {
    const result = await request('/api/admin/media-cleanup')
    assert.equal(result.status, 200)
    return result.body.pendingCount
  }
  return { sqlite, state, objects, deleted, request, sendImage, reload, pendingCount }
}

test('HTTP failed Floor plan replacement rolls back metadata and cleans only its orphan', async (t) => {
  const f = await fixture(t)
  f.sqlite.exec(`
    UPDATE properties SET status='published' WHERE id='property-a';
    CREATE TRIGGER reject_image_insert BEFORE INSERT ON property_images
      BEGIN SELECT RAISE(FAIL, 'D1 image write unavailable'); END;
  `)
  const original = await f.reload()
  f.state.delete = 'reject'
  const failed = await f.sendImage('floor_plan')
  assert.equal(failed.status, 500)
  assert.deepEqual(failed.body.data, { cleanupStatus: 'queued', cleanupQueued: true, cleanupPending: true })
  const retained = await f.reload()
  assert.equal(retained.status, 'published')
  assert.deepEqual(retained.images, original.images)
  assert.ok(f.objects.has('plan-a'))
  assert.ok(f.objects.has('photo-a'))
  assert.equal(f.objects.size, 3)
  assert.equal(await f.pendingCount(), 1)
  f.state.delete = 'healthy'
  const retried = await f.request('/api/admin/media-cleanup', {})
  assert.equal(retried.status, 200)
  assert.equal(retried.body.cleanupPending, false)
  assert.equal(await f.pendingCount(), 0)
  assert.equal(f.objects.size, 2)
  assert.deepEqual((await f.reload()).images, original.images)
  assert.ok(f.deleted.every(key => !['photo-a', 'plan-a'].includes(key)))
})

test('HTTP unqueued recovery requires the owning Agency and nonce, and remains retryable through R2 failure', async (t) => {
  const f = await fixture(t)
  const original = (await f.reload()).images
  f.sqlite.exec(`
    CREATE TRIGGER reject_image_insert BEFORE INSERT ON property_images
      BEGIN SELECT RAISE(FAIL, 'D1 image write unavailable'); END;
    CREATE TRIGGER reject_cleanup_insert BEFORE INSERT ON pending_image_deletions
      BEGIN SELECT RAISE(FAIL, 'D1 cleanup queue write unavailable'); END;
  `)
  f.state.delete = 'reject'
  const failed = await f.sendImage()
  assert.equal(failed.status, 500)
  assert.equal(failed.cache, 'no-store')
  assert.equal(failed.body.data.cleanupStatus, 'recovery_required')
  assert.equal(failed.body.data.cleanupQueued, false)
  assert.equal(failed.body.data.cleanupPending, true)
  const recovery = failed.body.data.recovery
  assert.ok(typeof recovery?.objectKey === 'string' && typeof recovery?.token === 'string')
  assert.equal(await f.pendingCount(), 0)
  assert.equal(f.objects.size, 3)
  assert.deepEqual((await f.reload()).images, original)
  const tampered = { ...recovery, token: (recovery.token[0] === '0' ? '1' : '0') + recovery.token.slice(1) }
  for (const [account, payload, status] of [
    [undefined, recovery, 401],
    ['buyer-a', recovery, 403],
    ['agency-b', recovery, 404],
    ['agency-a', tampered, 404],
  ]) {
    const denied = await f.request('/api/admin/media-recovery', payload, account ?? '')
    assert.equal(denied.status, status)
    assert.equal(denied.cache, 'no-store')
    assert.equal(f.objects.size, 3)
    assert.deepEqual(f.deleted, [])
  }
  const unavailable = await f.request('/api/admin/media-recovery', recovery)
  assert.equal(unavailable.status, 503)
  assert.ok(unavailable.body.statusMessage.includes('請保留復原資料後重試'))
  assert.equal(f.objects.size, 3)
  f.state.delete = 'healthy'
  const restored = await f.request('/api/admin/media-recovery', recovery)
  assert.equal(restored.status, 200)
  assert.equal(restored.cache, 'no-store')
  assert.deepEqual(restored.body, { ok: true })
  assert.equal(f.objects.size, 2)
  assert.equal(await f.pendingCount(), 0)
  assert.deepEqual((await f.reload()).images, original)
  assert.ok(f.deleted.every(key => !['photo-a', 'plan-a'].includes(key)))
  const repeated = await f.request('/api/admin/media-recovery', recovery)
  assert.equal(repeated.status, 404)
  assert.equal(f.objects.size, 2)
})

test('HTTP lost D1 acknowledgment preserves an accepted Floor plan and its linked bytes', async (t) => {
  const f = await fixture(t)
  f.sqlite.exec('UPDATE properties SET status=\'published\' WHERE id=\'property-a\'')
  f.state.loseBatchAcknowledgment = true
  const failed = await f.sendImage('floor_plan')
  assert.equal(failed.status, 500)
  assert.deepEqual(failed.body.data, { cleanupStatus: 'linked', cleanupQueued: false, cleanupPending: false })
  assert.ok(failed.body.statusMessage.includes('圖片已連結至物件'))
  const accepted = await f.reload()
  assert.equal(accepted.status, 'published')
  const plans = accepted.images.filter(image => image.kind === 'floor_plan')
  assert.equal(plans.length, 1)
  assert.notEqual(plans[0].id, 'plan-a')
  assert.ok(f.objects.has(plans[0].id))
  const protectedRecovery = { objectKey: plans[0].id, token: f.objects.get(plans[0].id).customMetadata.uploadRecoveryToken }
  const protectedResult = await f.request('/api/admin/media-recovery', protectedRecovery)
  assert.equal(protectedResult.status, 409)
  assert.ok(f.objects.has(plans[0].id))
  assert.deepEqual(f.deleted, [])
  assert.equal(await f.pendingCount(), 1)
  const retry = await f.request('/api/admin/media-cleanup', {})
  assert.equal(retry.status, 200)
  assert.equal(retry.body.cleanupPending, false)
  assert.equal(await f.pendingCount(), 0)
  assert.deepEqual(f.deleted, ['plan-a'])
  assert.ok(f.objects.has(plans[0].id))
  assert.ok(f.objects.has('photo-a'))
  assert.deepEqual((await f.reload()).images, accepted.images)
})

test('HTTP lost R2 acknowledgment retains owned cleanup through an outage and authorized retry', async (t) => {
  const f = await fixture(t)
  const original = (await f.reload()).images
  f.state.put = 'accept-then-reject'
  f.state.delete = 'reject'
  const failed = await f.sendImage()
  assert.equal(failed.status, 500)
  assert.deepEqual(failed.body.data, { cleanupStatus: 'queued', cleanupQueued: true, cleanupPending: true })
  assert.deepEqual((await f.reload()).images, original)
  assert.equal(f.objects.size, 3)
  assert.equal(await f.pendingCount(), 1)
  f.state.delete = 'healthy'
  const other = await f.request('/api/admin/media-cleanup', {}, 'agency-b')
  assert.equal(other.status, 200)
  assert.equal(other.body.cleanupPending, false)
  assert.equal(await f.pendingCount(), 1)
  assert.equal(f.objects.size, 3)
  const retry = await f.request('/api/admin/media-cleanup', {})
  assert.equal(retry.status, 200)
  assert.equal(retry.cache, 'no-store')
  assert.deepEqual(retry.body, { ok: true, cleanupPending: false })
  assert.equal(await f.pendingCount(), 0)
  assert.equal(f.objects.size, 2)
  assert.deepEqual((await f.reload()).images, original)
  assert.ok(f.deleted.every(key => !['photo-a', 'plan-a'].includes(key)))
})

test('HTTP upload compensates a rejected R2 write without changing linked media', async (t) => {
  const f = await fixture(t)
  const original = (await f.reload()).images
  f.state.put = 'reject'
  const result = await f.sendImage()
  assert.equal(result.status, 500)
  assert.equal(result.cache, 'no-store')
  assert.equal(result.body.data.cleanupPending, false)
  assert.equal('recovery' in result.body.data, false)
  assert.deepEqual((await f.reload()).images, original)
  assert.equal(await f.pendingCount(), 0)
  assert.equal(f.objects.size, 2)
  assert.ok(f.deleted.every(key => !['photo-a', 'plan-a'].includes(key)))
  f.state.put = 'healthy'
  const retry = await f.sendImage()
  assert.equal(retry.status, 200)
  assert.equal(retry.cache, 'no-store')
  assert.deepEqual(Object.keys(retry.body).sort(), ['cleanupPending', 'id', 'kind'])
  assert.equal(retry.body.cleanupPending, false)
  const accepted = await f.reload()
  assert.equal(accepted.images.length, 3)
  assert.ok(accepted.images.some(image => image.id === retry.body.id))
  assert.equal(accepted.images.filter(image => image.isCover).length, 1)
  assert.equal(accepted.images.find(image => image.isCover).id, 'photo-a')
})
