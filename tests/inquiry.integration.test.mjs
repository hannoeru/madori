import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const base = process.env.MADORI_TEST_URL
let fixtureId = 'rs8wd4ganbe7beb921xpz772'
const fixtureAgencyEmail = 'agency-c3ff7236-8216-4af8-a364-f6a335c3769a-a@example.invalid'
const photo = await readFile(new URL('./fixtures/interior-demo.png', import.meta.url))
const plan = await readFile(new URL('./fixtures/floor-plan-demo.png', import.meta.url))

class Client {
  cookie = ''

  async request(path, { method = 'GET', body, origin } = {}) {
    const form = body instanceof FormData
    const response = await fetch(new URL(path, base), {
      method,
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      headers: { ...(this.cookie ? { cookie: this.cookie } : {}), ...(body && !form ? { 'content-type': 'application/json' } : {}), ...(origin ? { origin } : {}) },
      body: body ? form ? body : JSON.stringify(body) : undefined,
    })
    const cookies = response.headers.getSetCookie()
    if (cookies.length)
      this.cookie = cookies.map(value => value.split(';')[0]).join('; ')
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text()
    return { response, data }
  }

  async register(role, suffix) {
    this.email = `${role}-inquiry-${suffix}@example.invalid`
    const body = { role, name: `諮詢本機測試 ${suffix}`, email: this.email }
    if (role === 'agency') {
      body.license = '東京都知事（1）第000000號・本機測試'
      body.lineUrl = 'https://line.me/ti/p/madori-test'
    }
    const result = await ok(this, '/api/auth/register', { method: 'POST', body })
    assert.equal(typeof result.link, 'string', 'local auth must not send email')
    assert.equal((await this.request(result.link)).response.status, 302)
  }

  async login(role, email) {
    this.email = email
    const result = await ok(this, '/api/auth/login', { method: 'POST', body: { role, email } })
    assert.equal(typeof result.link, 'string')
    assert.equal((await this.request(result.link)).response.status, 302)
  }

  async publish(facts) {
    const created = await ok(this, '/api/admin/properties', { method: 'POST', body: { ...facts, status: 'draft' } })
    for (const [kind, bytes, alt] of [['photo', photo, '原創示範客廳・諮詢本機測試'], ['floor_plan', plan, '原創示範格局圖・諮詢本機測試']]) {
      const body = new FormData()
      body.append('file', new Blob([bytes], { type: 'image/png' }), `${kind}.png`)
      body.append('kind', kind)
      body.append('alt', alt)
      await ok(this, `/api/admin/properties/${created.id}/images`, { method: 'POST', body })
    }
    await ok(this, `/api/admin/properties/${created.id}`, { method: 'PATCH', body: { ...facts, status: 'published' } })
    const listings = await ok(this, '/api/admin/properties')
    const listing = listings.find(listing => listing.id === created.id)
    assert.ok(listing)
    return { ...await ok(this, `/api/admin/properties/${created.id}`), id: created.id, propertyNumber: listing.propertyNumber }
  }
}

async function ok(client, path, options) {
  const result = await client.request(path, options)
  assert.equal(result.response.status, 200, JSON.stringify(result.data))
  if (path.startsWith('/api/buyer/inquiries') || path.startsWith('/api/admin/inquiries'))
    assert.equal(result.response.headers.get('cache-control'), 'no-store')
  return result.data
}

const submit = body => ({ method: 'POST', body })
const patch = body => ({ method: 'PATCH', body })
const inquiry = (propertyId, message = '請問週末可以看屋嗎？') => ({ propertyId, message, submissionKey: crypto.randomUUID() })

function propertyFacts({ suffix, stationId }) {
  return {
    propertyType: 'condominium',
    buildStatus: 'resale',
    status: 'draft',
    titleZhTw: `示範・諮詢本機測試 ${suffix}`,
    descriptionZhTw: '僅供本機諮詢驗證，非實際出售物件。使用原創示範圖片。',
    priceYen: 64800000,
    ward: '目黑區',
    addressZhTw: '東京都目黑區・示範地址・諮詢本機測試',
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
    nextUpdateOn: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    transitEntries: [{ stationId, walkingMinutes: 7 }],
  }
}

test('persisted Inquiries isolate two Agencies and two Buyers on the real local API', { skip: !base, timeout: 120000 }, async (t) => {
  assert.equal(new URL(base).origin, 'http://localhost:3010', 'Inquiries integration only runs at localhost:3010')
  const suffix = crypto.randomUUID()
  const agencyA = new Client()
  const agencyB = new Client()
  const buyerA = new Client()
  const buyerB = new Client()
  const guest = new Client()
  const stations = await ok(guest, '/api/stations')
  assert.ok(stations.stations.length, 'the local database needs seeded Transit entries')
  const availableFixture = await guest.request(`/api/properties/${fixtureId}`)
  if (availableFixture.response.status === 200) {
    await agencyA.login('agency', fixtureAgencyEmail)
  }
  else {
    assert.equal(availableFixture.response.status, 404)
    await agencyA.register('agency', `${suffix}-a`)
    const newFixture = await agencyA.publish(propertyFacts({ suffix: `${suffix.slice(0, 8)}-source`, stationId: stations.stations[0].id }))
    fixtureId = newFixture.id
  }
  const published = await ok(agencyA, `/api/admin/properties/${fixtureId}`)
  const publishedNumber = (await ok(agencyA, '/api/admin/properties')).find(listing => listing.id === fixtureId).propertyNumber
  assert.equal(published.status, 'published', 'the marked Published source fixture must remain unchanged')
  await agencyB.register('agency', `${suffix}-b`)
  await buyerA.register('buyer', `${suffix}-a`)
  await buyerB.register('buyer', `${suffix}-b`)
  const factsA = propertyFacts({ suffix: `${suffix.slice(0, 8)}-a`, stationId: stations.stations[0].id })
  const factsB = propertyFacts({ suffix: `${suffix.slice(0, 8)}-b`, stationId: stations.stations[0].id })
  const removable = await agencyA.publish(factsA)
  const second = await agencyB.publish(factsB)
  const privateListing = await ok(agencyB, '/api/admin/properties', submit({ ...factsB, titleZhTw: '私密草稿・諮詢測試' }))
  const payload = inquiry(fixtureId, '<script>alert(1)</script>\n請問週末可以看屋嗎？')
  let accepted

  await t.test('recipient and verified Buyer contact derive from the session and Published Property', async () => {
    accepted = await ok(buyerA, '/api/buyer/inquiries', submit(payload))
    assert.equal(accepted.notificationStatus, 'failed', 'local default cannot claim successful email sending')
    const ownHistory = await ok(buyerA, '/api/buyer/inquiries')
    assert.equal(ownHistory.total, 1)
    assert.equal(ownHistory.items[0].propertyTitle, published.titleZhTw)
    assert.equal(ownHistory.items[0].propertyNumber, publishedNumber)
    assert.equal(ownHistory.items[0].message, payload.message)
    assert.equal(ownHistory.items[0].notifiedAt, null)
    const inbox = await ok(agencyA, '/api/admin/inquiries')
    const row = inbox.items.find(row => row.id === accepted.id)
    assert.ok(row)
    assert.equal(row.buyerEmail, buyerA.email)
    assert.equal(row.buyerName, `諮詢本機測試 ${suffix}-a`)
    assert.equal((await ok(agencyB, '/api/admin/inquiries')).total, 0)
    for (const field of ['agencyId', 'buyerId', 'buyerName', 'buyerEmail']) {
      const result = await buyerA.request('/api/buyer/inquiries', submit({ ...inquiry(fixtureId), [field]: 'spoofed' }))
      assert.equal(result.response.status, 400, `reject body ${field}`)
      assert.equal(result.response.headers.get('cache-control'), 'no-store')
    }
    const other = await ok(buyerB, '/api/buyer/inquiries', submit({ ...payload, propertyId: second.id, message: '第二買方私密內容' }))
    assert.notEqual(other.id, accepted.id, 'same key belongs to another Buyer')
    assert.equal((await ok(agencyB, '/api/admin/inquiries')).items[0].id, other.id)
    assert.equal((await ok(buyerB, '/api/buyer/inquiries')).items[0].id, other.id)
  })

  await t.test('guests, cross-role requests, query spoofing and cross-Agency read cannot expose private data', async () => {
    for (const path of ['/api/admin/inquiries', '/api/buyer/inquiries']) {
      const result = await guest.request(path)
      assert.equal(result.response.status, 401)
      assert.equal(result.response.headers.get('cache-control'), 'no-store')
    }
    assert.equal((await guest.request('/api/buyer/inquiries', submit(inquiry(fixtureId)))).response.status, 401)
    assert.equal((await agencyA.request('/api/buyer/inquiries')).response.status, 403)
    assert.equal((await agencyA.request('/api/buyer/inquiries', submit(inquiry(fixtureId)))).response.status, 403)
    assert.equal((await buyerA.request('/api/admin/inquiries')).response.status, 403)
    const readPath = `/api/admin/inquiries/${accepted.id}/read`
    assert.equal((await guest.request(readPath, patch())).response.status, 401)
    assert.equal((await buyerA.request(readPath, patch())).response.status, 403)
    assert.equal((await agencyB.request(readPath, patch())).response.status, 404)
    assert.equal((await buyerB.request('/api/buyer/inquiries?buyerId=spoofed')).response.status, 400)
    assert.equal((await agencyB.request('/api/admin/inquiries?agencyId=spoofed')).response.status, 400)
    const publicDetail = await ok(guest, `/api/properties/${fixtureId}`)
    assert.ok(!JSON.stringify(publicDetail).includes(buyerA.email))
    assert.ok(!JSON.stringify(publicDetail).includes(payload.message))
    const bHistory = await ok(buyerB, '/api/buyer/inquiries')
    assert.ok(!JSON.stringify(bHistory).includes(accepted.id))
    assert.ok(!JSON.stringify(bHistory).includes(buyerA.email))
    assert.equal((await buyerA.request('/api/buyer/inquiries', { ...submit(inquiry(fixtureId)), origin: 'https://foreign.invalid' })).response.status, 403)
  })

  await t.test('duplicate and concurrent keys produce one stored Inquiry and changed payloads conflict', async () => {
    const same = await ok(buyerA, '/api/buyer/inquiries', submit(payload))
    assert.deepEqual(same, accepted)
    const concurrentPayload = inquiry(fixtureId, '同時提交的諮詢')
    const concurrent = await Promise.all(Array.from({ length: 8 }, () => ok(buyerA, '/api/buyer/inquiries', submit(concurrentPayload))))
    assert.equal(new Set(concurrent.map(row => row.id)).size, 1)
    assert.equal((await ok(buyerA, '/api/buyer/inquiries')).total, 2)
    for (const change of [{ message: '不同內容' }, { propertyId: second.id }])
      assert.equal((await buyerA.request('/api/buyer/inquiries', submit({ ...payload, ...change }))).response.status, 409)
    const raceKey = crypto.randomUUID()
    const race = await Promise.all([
      buyerA.request('/api/buyer/inquiries', submit({ propertyId: fixtureId, submissionKey: raceKey, message: '競爭訊息甲' })),
      buyerA.request('/api/buyer/inquiries', submit({ propertyId: second.id, submissionKey: raceKey, message: '競爭訊息乙' })),
    ])
    assert.deepEqual(race.map(result => result.response.status).sort(), [200, 409])
    assert.equal((await ok(buyerA, '/api/buyer/inquiries')).total, 3)
  })

  await t.test('invalid and unpublished inputs do not persist or notify', async () => {
    for (const body of [inquiry('missing-property'), inquiry(privateListing.id), inquiry(fixtureId, ''), inquiry(fixtureId, ' '), inquiry(fixtureId, 'x'.repeat(2001)), { ...inquiry(fixtureId), submissionKey: 'not-a-uuid' }]) {
      const result = await buyerA.request('/api/buyer/inquiries', submit(body))
      assert.ok([400, 404].includes(result.response.status))
    }
    assert.equal((await ok(buyerA, '/api/buyer/inquiries')).total, 3)
    assert.equal((await buyerA.request('/api/buyer/inquiries?page=0')).response.status, 400)
    assert.equal((await buyerA.request('/api/buyer/inquiries?page=1.5')).response.status, 400)
    assert.equal((await ok(buyerA, '/api/buyer/inquiries?page=2')).items.length, 0)
  })

  await t.test('Agency read state is idempotent and separate from failed Notification', async () => {
    const path = `/api/admin/inquiries/${accepted.id}/read`
    const read = await ok(agencyA, path, patch())
    assert.ok(read.readAt)
    assert.deepEqual(await ok(agencyA, path, patch()), read)
    const row = (await ok(buyerA, '/api/buyer/inquiries')).items.find(row => row.id === accepted.id)
    assert.equal(row.readAt, read.readAt)
    assert.equal(row.notificationStatus, 'failed')
    assert.equal(row.notifiedAt, null)
  })

  await t.test('withdrawal and deletion retain snapshots without private current Property details', async () => {
    const original = inquiry(removable.id, '保留物件快照')
    const saved = await ok(buyerA, '/api/buyer/inquiries', submit(original))
    await ok(agencyA, `/api/admin/properties/${removable.id}`, patch({ ...factsA, status: 'withdrawn', titleZhTw: '私密撤下名稱', addressZhTw: '私密撤下地址' }))
    const history = await ok(buyerA, '/api/buyer/inquiries')
    const row = history.items.find(row => row.id === saved.id)
    assert.equal(row.propertyTitle, factsA.titleZhTw)
    assert.equal(row.propertyNumber, removable.propertyNumber)
    assert.equal(row.propertyId, null)
    assert.ok(!JSON.stringify(history).includes('私密撤下'))
    assert.equal((await buyerA.request('/api/buyer/inquiries', submit(inquiry(removable.id)))).response.status, 404)
    assert.equal((await guest.request(`/api/properties/${removable.id}`)).response.status, 404)
    assert.equal((await ok(buyerA, '/api/buyer/inquiries', submit(original))).id, saved.id)
    await ok(agencyA, `/api/admin/properties/${removable.id}`, { method: 'DELETE' })
    const deleted = (await ok(buyerA, '/api/buyer/inquiries')).items.find(row => row.id === saved.id)
    assert.equal(deleted.propertyId, null)
    assert.equal(deleted.propertyTitle, factsA.titleZhTw)
    assert.equal((await ok(buyerA, '/api/buyer/inquiries', submit(original))).id, saved.id)
    assert.equal((await buyerA.request('/api/buyer/inquiries', submit({ ...original, propertyId: second.id }))).response.status, 409)
    assert.equal((await ok(agencyA, '/api/admin/inquiries')).items.find(row => row.id === saved.id).propertyNumber, removable.propertyNumber)
  })

  await ok(agencyB, `/api/admin/properties/${privateListing.id}`, patch({ ...factsB, titleZhTw: '私密草稿・諮詢測試', status: 'withdrawn' }))
  await ok(agencyB, `/api/admin/properties/${privateListing.id}`, { method: 'DELETE' })
  t.diagnostic(`Published source fixture preserved: ${fixtureId}`)
  t.diagnostic(`Buyer A local email: ${buyerA.email}`)
  t.diagnostic(`Buyer B local email: ${buyerB.email}`)
  t.diagnostic(`Agency B local email: ${agencyB.email}`)
  t.diagnostic(`Agency B complete Published fixture: ${second.id}`)
  t.diagnostic('All Notification statuses remain failed locally. No email was sent.')
})
