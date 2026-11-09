import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const base = process.env.MADORI_TEST_URL
const interior = await readFile(new URL('./fixtures/interior-demo.png', import.meta.url))
const floorPlan = await readFile(new URL('./fixtures/floor-plan-demo.png', import.meta.url))

class Client {
  cookie = ''
  email = ''

  async request(path, { method = 'GET', body, origin } = {}) {
    const form = body instanceof FormData
    const response = await fetch(new URL(path, base), {
      method,
      redirect: 'manual',
      headers: {
        ...(this.cookie ? { cookie: this.cookie } : {}),
        ...(body && !form ? { 'content-type': 'application/json' } : {}),
        ...(origin ? { origin } : {}),
      },
      body: body ? form ? body : JSON.stringify(body) : undefined,
    })
    const cookies = response.headers.getSetCookie()
    if (cookies.length)
      this.cookie = cookies.map(value => value.split(';')[0]).join('; ')
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text()
    return { response, data }
  }

  async register(role, suffix) {
    this.email = `${role}-${suffix}@example.invalid`
    const body = { role, name: `本機收藏測試 ${suffix}`, email: this.email }
    if (role === 'agency') {
      body.license = '東京都知事（1）第000000號・本機測試'
      body.lineUrl = 'https://line.me/ti/p/madori-test'
    }
    const result = await ok(this, '/api/auth/register', { method: 'POST', body })
    assert.equal(typeof result.link, 'string', 'use local development links, never external email')
    assert.equal(new URL(result.link).origin, base)
    assert.equal((await this.request(result.link)).response.status, 302)
  }

  async login(email) {
    const result = await ok(this, '/api/auth/login', { method: 'POST', body: { role: 'buyer', email } })
    assert.equal(new URL(result.link).origin, base)
    assert.equal((await this.request(result.link)).response.headers.get('location'), '/buyer')
  }

  async upload(id, kind, bytes) {
    const body = new FormData()
    body.append('file', new Blob([bytes], { type: 'image/png' }), `${kind}-demo.png`)
    body.append('kind', kind)
    body.append('alt', kind === 'photo' ? '原創示範客廳・本機測試' : '原創示範格局圖・本機測試')
    return ok(this, `/api/admin/properties/${id}/images`, { method: 'POST', body })
  }
}

async function ok(client, path, options) {
  const result = await client.request(path, options)
  assert.equal(result.response.status, 200, JSON.stringify(result.data))
  return result.data
}

function assertPrivate(result) {
  assert.equal(result.response.headers.get('cache-control'), 'private, no-store')
}

const savePath = id => `/api/buyer/saved/${id}`

test('Saved Properties persist and remain private for two Buyers and an Agency', { skip: !base, timeout: 120000 }, async (t) => {
  assert.equal(base, 'http://localhost:3010', 'run only against the assigned local development server')
  const suffix = crypto.randomUUID()
  const a = new Client()
  const b = new Client()
  const agency = new Client()
  const guest = new Client()
  await a.register('buyer', `${suffix}-a`)
  await b.register('buyer', `${suffix}-b`)
  await agency.register('agency', suffix)
  const aId = (await ok(a, '/api/buyer/account')).user.id
  const bId = (await ok(b, '/api/buyer/account')).user.id
  assert.notEqual(aId, bId)
  const { stations } = await ok(guest, '/api/stations')
  assert.ok(stations.length)
  const facts = {
    propertyType: 'condominium',
    buildStatus: 'resale',
    status: 'draft',
    titleZhTw: `收藏測試 A ${suffix}`,
    descriptionZhTw: '本機測試示範資料，非實際出售物件。',
    priceYen: 64800000,
    ward: '目黑區',
    addressZhTw: '東京都目黑區・本機示範地址',
    layout: '2LDK',
    floorAreaSqm: 58,
    landAreaSqm: null,
    buildingAreaSqm: null,
    builtOn: '2010-01',
    structure: 'RC',
    floorNumber: 3,
    totalFloors: 8,
    landRights: '所有權',
    managementFeeYen: 12000,
    repairReserveYen: 8000,
    transactionMode: '仲介',
    nextUpdateOn: '2026-12-01',
    transitEntries: [{ stationId: stations[0].id, walkingMinutes: 7 }],
  }
  const first = await ok(agency, '/api/admin/properties', { method: 'POST', body: facts })
  const secondFacts = { ...facts, titleZhTw: `收藏測試 B ${suffix}` }
  const second = await ok(agency, '/api/admin/properties', { method: 'POST', body: secondFacts })
  let createdAt

  try {
    await t.test('guests and Agency accounts cannot read, save or remove Buyer records', async () => {
      for (const [client, status] of [[guest, 401], [agency, 403]]) {
        assert.equal((await client.request('/api/buyer/saved')).response.status, status)
        assert.equal((await client.request(savePath(first.id), { method: 'PUT' })).response.status, status)
        assert.equal((await client.request(savePath(first.id), { method: 'DELETE' })).response.status, status)
      }
      assert.deepEqual(await ok(a, '/api/buyer/saved'), { items: [] })
      assert.deepEqual(await ok(b, '/api/buyer/saved'), { items: [] })
    })

    await t.test('only Published Properties can be saved, including with a supplied Buyer id', async () => {
      assert.equal((await a.request(savePath(first.id), { method: 'PUT', body: { buyerId: bId } })).response.status, 404)
      assert.equal((await a.request(savePath('not-a-property'), { method: 'PUT' })).response.status, 404)
      assert.deepEqual(await ok(a, '/api/buyer/saved'), { items: [] })
      for (const [property, input] of [[first, facts], [second, secondFacts]]) {
        await agency.upload(property.id, 'photo', interior)
        await agency.upload(property.id, 'floor_plan', floorPlan)
        await ok(agency, `/api/admin/properties/${property.id}`, { method: 'PATCH', body: { ...input, status: 'published' } })
      }
    })

    await t.test('PUT saves once under concurrent requests and preserves the original date', async () => {
      const results = await Promise.all(Array.from({ length: 4 }, () => a.request(`${savePath(first.id)}?buyerId=${bId}`, { method: 'PUT', body: { buyerId: bId } })))
      for (const result of results) {
        assert.equal(result.response.status, 200, JSON.stringify(result.data))
        assertPrivate(result)
      }
      createdAt = results[0].data.createdAt
      assert.ok(Number.isFinite(Date.parse(createdAt)))
      assert.ok(results.every(result => result.data.createdAt === createdAt))
      const list = await a.request(`/api/buyer/saved?buyerId=${bId}`)
      assertPrivate(list)
      assert.equal(list.data.items.length, 1)
      const entry = list.data.items[0]
      assert.equal(entry.kind, 'available')
      assert.equal(entry.propertyId, first.id)
      assert.equal(entry.createdAt, createdAt)
      assert.deepEqual(entry.property, await ok(guest, '/api/properties?pageSize=24&sort=newest').then(result => result.items.find(property => property.id === first.id)))
      assert.deepEqual(Object.keys(entry).sort(), ['createdAt', 'kind', 'property', 'propertyId'])
      assert.ok(entry.property.images.every(image => typeof image.position === 'number' && typeof image.altZhTw === 'string'))
      assert.deepEqual(await ok(b, '/api/buyer/saved'), { items: [] })
    })

    await t.test('each Buyer has an independent collection and DELETE ignores supplied Buyer ids', async () => {
      await ok(b, savePath(first.id), { method: 'PUT' })
      await ok(b, savePath(second.id), { method: 'PUT' })
      assert.equal((await ok(b, '/api/buyer/saved')).items.length, 2)
      const removed = await a.request(`${savePath(second.id)}?buyerId=${bId}`, { method: 'DELETE', body: { buyerId: bId } })
      assert.equal(removed.response.status, 200)
      assertPrivate(removed)
      assert.equal((await ok(b, '/api/buyer/saved')).items.length, 2)
      assert.equal((await ok(a, '/api/buyer/saved')).items.length, 1)
      assert.equal((await a.request(savePath(first.id), { method: 'DELETE', origin: 'https://foreign.invalid' })).response.status, 403)
      assert.equal((await a.request(savePath(second.id), { method: 'PUT', origin: 'https://foreign.invalid' })).response.status, 403)
      assert.equal((await ok(a, '/api/buyer/saved')).items.length, 1)
    })

    await t.test('a new request client and account changes keep persisted collections separate', async () => {
      const browser = new Client()
      browser.cookie = a.cookie
      assert.equal((await ok(browser, '/api/buyer/saved')).items[0].createdAt, createdAt)
      await browser.login(b.email)
      assert.equal((await ok(browser, '/api/buyer/account')).user.id, bId)
      assert.equal((await ok(browser, '/api/buyer/saved')).items.length, 2)
      assert.equal((await browser.request('/api/_auth/session', { method: 'DELETE' })).response.status, 200)
      assert.equal((await browser.request('/api/buyer/saved')).response.status, 401)
      await browser.login(a.email)
      assert.equal((await ok(browser, '/api/buyer/account')).user.id, aId)
      assert.deepEqual((await ok(browser, '/api/buyer/saved')).items.map(item => item.propertyId), [first.id])
      const page = await browser.request('/buyer/saved')
      assert.equal(page.response.status, 200)
      assert.ok(page.data.includes(facts.titleZhTw))
      assert.ok(!page.data.includes(secondFacts.titleZhTw), 'SSR and its payload must not include the other Buyer collection')
      assert.ok(page.data.includes('/buyer/inquiries'))
      assert.ok(page.data.includes('noindex, nofollow'))
    })

    await t.test('withdrawal preserves the entry but hides all Property details in API and SSR', async () => {
      await ok(agency, `/api/admin/properties/${first.id}`, { method: 'PATCH', body: { ...facts, status: 'withdrawn', titleZhTw: `隱藏標題 ${suffix}`, descriptionZhTw: `隱藏說明 ${suffix}` } })
      const list = await a.request('/api/buyer/saved')
      assertPrivate(list)
      assert.deepEqual(list.data.items, [{ kind: 'unavailable', propertyId: first.id, createdAt }])
      assert.deepEqual(await ok(a, savePath(first.id), { method: 'PUT' }), { propertyId: first.id, createdAt })
      const page = await a.request('/buyer/saved')
      assert.equal(page.response.status, 200)
      for (const text of [facts.titleZhTw, `隱藏標題 ${suffix}`, `隱藏說明 ${suffix}`, facts.addressZhTw])
        assert.ok(!page.data.includes(text), 'hidden facts must not occur in HTML or the Nuxt payload')
      assert.ok(page.data.includes('此物件已停止公開'))
      assert.ok(page.data.includes('移除收藏'))
      const bEntries = (await ok(b, '/api/buyer/saved')).items
      assert.equal(bEntries.find(item => item.propertyId === first.id).kind, 'unavailable')
      assert.equal(bEntries.find(item => item.propertyId === second.id).kind, 'available')
    })

    await t.test('a saved Property changed to draft also keeps only its unavailable entry', async () => {
      await ok(agency, `/api/admin/properties/${first.id}`, { method: 'PATCH', body: { ...facts, status: 'draft', titleZhTw: `草稿標題 ${suffix}` } })
      assert.deepEqual((await ok(a, '/api/buyer/saved')).items, [{ kind: 'unavailable', propertyId: first.id, createdAt }])
      assert.deepEqual(await ok(a, savePath(first.id), { method: 'PUT' }), { propertyId: first.id, createdAt })
      const page = await a.request('/buyer/saved')
      assert.ok(!page.data.includes(`草稿標題 ${suffix}`))
      assert.ok(page.data.includes('移除收藏'))
    })

    await t.test('restoration reveals the current summary and unavailable entries remain removable', async () => {
      await ok(agency, `/api/admin/properties/${first.id}`, { method: 'PATCH', body: { ...facts, status: 'published' } })
      const restored = (await ok(a, '/api/buyer/saved')).items[0]
      assert.equal(restored.kind, 'available')
      assert.equal(restored.property.titleZhTw, facts.titleZhTw)
      assert.equal(restored.createdAt, createdAt)
      await ok(agency, `/api/admin/properties/${first.id}`, { method: 'PATCH', body: { ...facts, status: 'withdrawn' } })
      await ok(a, `${savePath(first.id)}?buyerId=${bId}`, { method: 'DELETE', body: { buyerId: bId } })
      await ok(a, savePath(first.id), { method: 'DELETE' })
      assert.equal((await a.request(savePath(first.id), { method: 'PUT' })).response.status, 404, 'a removed key cannot be saved again while the Property is withdrawn')
      assert.deepEqual(await ok(a, '/api/buyer/saved'), { items: [] })
      assert.ok((await ok(b, '/api/buyer/saved')).items.some(item => item.propertyId === first.id))
      await ok(b, savePath(first.id), { method: 'DELETE' })
      assert.deepEqual((await ok(b, '/api/buyer/saved')).items.map(item => item.propertyId), [second.id])
      const empty = await a.request('/buyer/saved')
      assert.ok(empty.data.includes('還沒有收藏物件'))
    })
  }
  finally {
    for (const [property, input] of [[first, facts], [second, secondFacts]]) {
      await ok(agency, `/api/admin/properties/${property.id}`, { method: 'PATCH', body: { ...input, status: 'withdrawn' } })
      await ok(agency, `/api/admin/properties/${property.id}`, { method: 'DELETE' })
    }
  }
})
