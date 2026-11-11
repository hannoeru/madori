import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const baseUrl = process.env.MADORI_TEST_URL
const password = process.env.MADORI_TEST_PASSWORD
const options = { skip: baseUrl && password ? false : 'Set MADORI_TEST_URL and MADORI_TEST_PASSWORD.' }

const draft = {
  status: 'draft',
  propertyType: 'condominium',
  buildStatus: 'resale',
  titleZhTw: `測試物件 ${crypto.randomUUID()}`,
  descriptionZhTw: '測試說明',
  priceYen: 64800000,
  ward: '目黑區',
  addressZhTw: '目黑區上目黑',
  layout: '2LDK',
  floorAreaSqm: 58.3,
  landAreaSqm: null,
  buildingAreaSqm: null,
  builtOn: '2010-01',
  structure: null,
  floorNumber: null,
  totalFloors: null,
  landRights: null,
  managementFeeYen: 18000,
  repairReserveYen: 12000,
  equipmentZhTw: null,
  transit: [{ line: '東急東橫線', station: '中目黑', walkingMinutes: 5 }],
}

function request(path, init = {}, cookie) {
  const headers = { ...init.headers, ...(cookie ? { cookie } : {}) }
  return fetch(`${baseUrl}${path}`, { redirect: 'manual', ...init, headers })
}

function json(body) {
  return { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
}

function imageForm(bytes, kind = 'photo') {
  const form = new FormData()
  form.append('file', new Blob([bytes]), 'image.png')
  form.append('kind', kind)
  return { method: 'POST', body: form }
}

async function login() {
  const response = await request('/api/auth/login', { method: 'POST', ...json({ password }) })
  assert.equal(response.status, 200)
  return response.headers.getSetCookie()[0].split(';')[0]
}

async function publicTitles() {
  const items = await (await request('/api/properties')).json()
  return items.map(item => item.titleZhTw)
}

test('a wrong password does not log in', options, async () => {
  const response = await request('/api/auth/login', { method: 'POST', ...json({ password: 'wrong-password' }) })
  assert.equal(response.status, 401)
})

test('owner API routes reject a guest', options, async () => {
  assert.equal((await request('/api/admin/properties')).status, 401)
  assert.equal((await request('/api/admin/properties', { method: 'POST', ...json(draft) })).status, 401)
})

test('a Listing goes from draft to public and is removed with its images', options, async () => {
  const cookie = await login()
  const created = await (await request('/api/admin/properties', { method: 'POST', ...json(draft) }, cookie)).json()
  const adminPath = `/api/admin/properties/${created.id}`

  assert.ok(!(await publicTitles()).includes(draft.titleZhTw))
  assert.equal((await request(`/api/properties/${created.id}`)).status, 404)

  const published = { ...draft, status: 'published' }
  const blocked = await request(adminPath, { method: 'PATCH', ...json(published) }, cookie)
  assert.equal(blocked.status, 400)

  const invalid = await request(`${adminPath}/images`, imageForm(new TextEncoder().encode('not an image')), cookie)
  assert.equal(invalid.status, 400)

  const bytes = await readFile(new URL('./fixtures/interior-demo.png', import.meta.url))
  const first = await (await request(`${adminPath}/images`, imageForm(bytes), cookie)).json()
  const second = await (await request(`${adminPath}/images`, imageForm(bytes), cookie)).json()

  assert.equal((await request(`/api/property-images/${first.id}`)).status, 401)
  assert.equal((await request(`/api/property-images/${first.id}`, {}, cookie)).status, 200)

  assert.equal((await request(adminPath, { method: 'PATCH', ...json(published) }, cookie)).status, 200)
  assert.ok((await publicTitles()).includes(draft.titleZhTw))

  const cover = await request(`${adminPath}/images/${second.id}`, { method: 'PATCH' }, cookie)
  assert.equal(cover.status, 200)
  const summary = (await (await request('/api/properties')).json()).find(item => item.id === created.id)
  assert.equal(summary.coverImageId, second.id)

  const image = await request(`/api/property-images/${first.id}`)
  assert.equal(image.status, 200)
  assert.equal(image.headers.get('content-type'), 'image/png')

  const page = await (await request(`/properties/${created.id}`)).text()
  assert.ok(page.includes(draft.titleZhTw))

  assert.equal((await request(`${adminPath}/images/${first.id}`, { method: 'DELETE' }, cookie)).status, 200)
  assert.equal((await request(`${adminPath}/images/${second.id}`, { method: 'DELETE' }, cookie)).status, 409)

  assert.equal((await request(adminPath, { method: 'DELETE' }, cookie)).status, 200)
  assert.equal((await request(`/api/properties/${created.id}`)).status, 404)
  assert.equal((await request(`/api/property-images/${second.id}`)).status, 404)
})

test('deleting the cover photo makes the next photo the cover', options, async () => {
  const cookie = await login()
  const created = await (await request('/api/admin/properties', { method: 'POST', ...json(draft) }, cookie)).json()
  const adminPath = `/api/admin/properties/${created.id}`
  const bytes = await readFile(new URL('./fixtures/interior-demo.png', import.meta.url))
  const first = await (await request(`${adminPath}/images`, imageForm(bytes), cookie)).json()
  const second = await (await request(`${adminPath}/images`, imageForm(bytes), cookie)).json()

  assert.equal((await request(`${adminPath}/images/${first.id}`, { method: 'DELETE' }, cookie)).status, 200)
  const detail = await (await request(adminPath, {}, cookie)).json()
  assert.deepEqual(detail.images.map(image => [image.id, image.isCover]), [[second.id, true]])

  assert.equal((await request(adminPath, { method: 'DELETE' }, cookie)).status, 200)
})
