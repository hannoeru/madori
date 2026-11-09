import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const base = process.env.MADORI_TEST_URL
const interior = await readFile(new URL('./fixtures/interior-demo.png', import.meta.url))
const floorPlan = await readFile(new URL('./fixtures/floor-plan-demo.png', import.meta.url))
const jpeg = Buffer.from('/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAQABADASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAABAUGB//EACMQAAIBBAEDBQAAAAAAAAAAAAECAwAEERIFBhMhMUFRUnH/xAAVAQEBAAAAAAAAAAAAAAAAAAACBP/EABkRAQACAwAAAAAAAAAAAAAAAAIAEQEDIf/aAAwDAQACEQMRAD8A2EdQymGBzewp3FLDbUeh/KeNcXHZJeMvFqDvkeSSKj16fmlt48JZHEeSrS41P196Mv7rl7bipY0urFm2XVHOxK+CcEfBqdPFRawr7P/Z', 'base64')

class Client {
  cookie = ''

  async request(path, { method = 'GET', body } = {}) {
    const form = body instanceof FormData
    const url = new URL(path, base)
    assert.equal(url.origin, 'http://localhost:3010', 'requests must not leave the local test server')
    const response = await fetch(url, {
      method,
      redirect: 'manual',
      headers: { ...(this.cookie ? { cookie: this.cookie } : {}), ...(body && !form ? { 'content-type': 'application/json' } : {}) },
      body: body ? form ? body : JSON.stringify(body) : undefined,
    })
    const cookies = response.headers.getSetCookie()
    if (cookies.length) {
      const pairs = new Map(this.cookie.split(';').map(value => value.trim()).filter(Boolean).map(value => [value.slice(0, value.indexOf('=')), value]))
      for (const value of cookies) {
        const pair = value.split(';')[0]
        pairs.set(pair.slice(0, pair.indexOf('=')), pair)
      }
      this.cookie = [...pairs.values()].join('; ')
    }
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.arrayBuffer()
    return { response, data }
  }

  async register(suffix) {
    const result = await this.request('/api/auth/register', { method: 'POST', body: {
      role: 'agency',
      name: `本機測試公司 ${suffix}`,
      email: `agency-${suffix}@example.invalid`,
      license: '東京都知事（1）第000000號・本機測試',
      lineUrl: 'https://line.me/ti/p/madori-test',
    } })
    assert.equal(result.response.status, 200)
    assert.equal(typeof result.data.link, 'string', 'auth must use local links without email')
    const verified = await this.request(result.data.link)
    assert.equal(verified.response.status, 302)
    assert.equal(verified.response.headers.get('location'), '/admin', 'registration has no approval queue')
  }

  async upload(id, { kind = 'photo', bytes = interior, alt = '示範客廳・原創本機測試圖片', mime = 'image/png', filename = 'demo.png', isCover } = {}) {
    const body = new FormData()
    body.append('file', new Blob([bytes], { type: mime }), filename)
    body.append('kind', kind)
    body.append('alt', alt)
    if (isCover != null)
      body.append('isCover', String(isCover))
    return this.request(`/api/admin/properties/${id}/images`, { method: 'POST', body })
  }
}

async function ok(client, path, options) {
  const result = await client.request(path, options)
  assert.equal(result.response.status, 200, JSON.stringify(result.data))
  return result.data
}

const patch = body => ({ method: 'PATCH', body })

test('authenticated Agency pages expose one main landmark in server-rendered HTML', { skip: !base, timeout: 30000 }, async () => {
  assert.equal(new URL(base).origin, 'http://localhost:3010')
  const agency = new Client()
  await agency.register(`landmark-${crypto.randomUUID()}`)
  for (const path of ['/admin', '/admin/properties', '/admin/reviews', '/admin/inquiries', '/admin/properties/new']) {
    const { response, data } = await agency.request(path)
    assert.equal(response.status, 200, path)
    const html = new TextDecoder().decode(data)
    assert.equal(html.match(/<main(?:\s[^>]+)?>|<[a-z][^>]*\srole="main"[^>]*>/g)?.length ?? 0, 1, path)
    assert.equal(html.match(/<h1(?:\s[^>]+)?>/g)?.length ?? 0, 1, path)
  }
})

test('Agency lifecycle, local R2 bytes, publication rules and private media', { skip: !base, timeout: 120000 }, async (t) => {
  assert.equal(new URL(base).origin, 'http://localhost:3010', 'Agency integration tests run only at localhost:3010')
  const a = new Client()
  const b = new Client()
  const guest = new Client()
  const suffix = crypto.randomUUID()
  await a.register(`${suffix}-a`)
  await b.register(`${suffix}-b`)
  const stationData = await ok(guest, '/api/stations')
  assert.ok(stationData.stations.length)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const facts = {
    propertyType: 'condominium',
    buildStatus: 'resale',
    status: 'draft',
    titleZhTw: `示範・本機測試 ${suffix.slice(0, 8)}`,
    descriptionZhTw: '本機自動驗證用示範資料，非實際出售物件。圖片為原創測試圖。',
    priceYen: 64800000,
    ward: '目黑區',
    addressZhTw: '東京都目黑區・示範地址・本機測試',
    layout: '2LDK',
    floorAreaSqm: 58.3,
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
    nextUpdateOn: yesterday,
    transitEntries: [{ stationId: stationData.stations[0].id, walkingMinutes: 7 }],
  }
  const created = await ok(a, '/api/admin/properties', { method: 'POST', body: facts })
  const id = created.id
  const path = `/api/admin/properties/${id}`
  const other = await ok(b, '/api/admin/properties', { method: 'POST', body: { ...facts, titleZhTw: '示範・第二公司本機測試' } })
  let photoOne
  let photoTwo
  let plan

  await t.test('cleanup retry endpoints require the Agency session and report its own queue', async () => {
    assert.equal((await guest.request('/api/admin/media-cleanup')).response.status, 401)
    assert.equal((await guest.request('/api/admin/media-cleanup', { method: 'POST' })).response.status, 401)
    assert.equal((await guest.request('/api/admin/media-recovery', { method: 'POST', body: { objectKey: 'abcdefghijklmnopqrstuvwx', token: 'a'.repeat(64) } })).response.status, 401)
    assert.equal((await a.request('/api/admin/media-recovery', { method: 'POST', body: { objectKey: '../invalid', token: 'invalid' } })).response.status, 400)
    for (const client of [a, b]) {
      assert.deepEqual(await ok(client, '/api/admin/media-cleanup'), { pendingCount: 0 })
      assert.deepEqual(await ok(client, '/api/admin/media-cleanup', { method: 'POST', body: { agencyId: 'not-the-session-Agency' } }), { ok: true, cleanupPending: false })
    }
  })

  await t.test('writes validate dates, Applicable facts and Transit entries without partial persistence', async () => {
    const before = await ok(a, '/api/admin/properties')
    for (const change of [
      { ward: '東京以外' },
      { builtOn: '2010-13' },
      { builtOn: '2099-01' },
      { buildStatus: 'new', builtOn: '9999-01' },
      { nextUpdateOn: '2026-02-30' },
      { floorAreaSqm: -1 },
      { floorNumber: 9 },
      { floorNumber: 0 },
      { managementFeeYen: -1 },
      { transactionMode: '任意' },
      { transitEntries: [{ stationId: 'not-a-station', walkingMinutes: 1 }] },
      { transitEntries: [{ stationId: stationData.stations[0].id, walkingMinutes: -1 }] },
      { transitEntries: [facts.transitEntries[0], facts.transitEntries[0]] },
    ]) {
      const result = await a.request(path, patch({ ...facts, ...change }))
      assert.equal(result.response.status, 400, JSON.stringify(change))
    }
    const invalidCreate = await a.request('/api/admin/properties', { method: 'POST', body: { ...facts, transitEntries: [{ stationId: 'not-a-station', walkingMinutes: 1 }] } })
    assert.equal(invalidCreate.response.status, 400)
    assert.equal((await ok(a, '/api/admin/properties')).length, before.length)
    const detail = await ok(a, path)
    assert.equal(detail.floorNumber, 3)
    assert.equal(detail.floorAreaSqm, 58.3)
    assert.deepEqual(detail.transitEntries.map(({ stationId, walkingMinutes }) => ({ stationId, walkingMinutes })), facts.transitEntries)
    assert.equal((await a.request('/api/admin/properties', { method: 'POST', body: { ...facts, status: 'published' } })).response.status, 400)
    const missing = await a.request(path, patch({ ...facts, status: 'published', structure: null, managementFeeYen: null, transitEntries: [] }))
    assert.equal(missing.response.status, 400)
    for (const word of ['結構', '管理費', '交通', '照片', '格局圖'])
      assert.ok(missing.data.statusMessage.includes(word), word)
  })

  await t.test('two Agencies cannot read or mutate foreign Listings or media', async () => {
    assert.equal((await b.request(path)).response.status, 404)
    assert.equal((await b.request(path, patch(facts))).response.status, 404)
    assert.equal((await b.upload(id)).response.status, 404)
    assert.equal((await guest.request(path)).response.status, 401)
    assert.equal((await guest.request(`/api/properties/${id}`)).response.status, 404)
    const first = await a.upload(id, { mime: 'image/svg+xml' })
    assert.equal(first.response.status, 200, 'byte validation derives MIME from the PNG, not supplied MIME')
    assert.deepEqual(Object.keys(first.data).sort(), ['cleanupPending', 'id', 'kind'])
    photoOne = first.data.id
    photoTwo = (await a.upload(id, { alt: '示範客廳第二視角・本機測試' })).data.id
    const uploadedPlan = await a.upload(id, { kind: 'floor_plan', bytes: floorPlan, alt: '示範2LDK格局・本機測試' })
    assert.equal(uploadedPlan.response.status, 200)
    plan = uploadedPlan.data.id
    const bytes = await a.request(`/api/property-images/${photoOne}`)
    assert.equal(bytes.response.status, 200)
    assert.equal(bytes.response.headers.get('content-type'), 'image/png')
    assert.equal(bytes.response.headers.get('cache-control'), 'no-store')
    assert.equal(bytes.response.headers.get('x-content-type-options'), 'nosniff')
    assert.deepEqual(Buffer.from(bytes.data), interior, 'retrieves original bytes from local R2')
    assert.equal((await guest.request(`/api/property-images/${photoOne}`)).response.status, 404)
    assert.equal((await b.request(`/api/property-images/${photoOne}`)).response.status, 404)
    assert.equal((await b.request(`${path}/images/${photoOne}`, { method: 'DELETE' })).response.status, 404)
    assert.equal((await b.request(`${path}/images`, patch({ photos: [], coverImageId: null }))).response.status, 404)
  })

  await t.test('specific recovery denies foreign or tampered credentials and keeps image metadata private', async () => {
    const recovery = { objectKey: photoOne, token: 'a'.repeat(64) }
    for (const client of [a, b]) {
      const denied = await client.request('/api/admin/media-recovery', { method: 'POST', body: { ...recovery, agencyId: 'ignored-client-Agency' } })
      assert.equal(denied.response.status, 404)
      assert.equal(denied.response.headers.get('cache-control'), 'no-store')
    }
    const image = await a.request(`/api/property-images/${photoOne}`)
    assert.equal(image.response.status, 200)
    assert.deepEqual(Buffer.from(image.data), interior)
    assert.equal(image.response.headers.get('uploadRecoveryToken'), null)
    assert.equal(image.response.headers.get('x-upload-recovery-token'), null)
    assert.equal(JSON.stringify(await ok(a, path)).includes('uploadRecoveryToken'), false)
    assert.equal((await ok(a, path)).images.length, 3)
  })

  await t.test('uploads reject SVG, MIME spoofing, truncated bytes, bad checksums and oversize', async () => {
    const corrupted = Buffer.from(interior)
    corrupted[30] ^= 1
    for (const bytes of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), Buffer.from('not an image'), Buffer.from('ffd8ffc0000b080001000101011100ffda0008010100003f0000ffd9', 'hex'), interior.subarray(0, 40), corrupted, Buffer.alloc(0)]) {
      const result = await a.upload(id, { bytes, mime: 'image/png' })
      assert.equal(result.response.status, 400)
    }
    assert.equal((await a.upload(id, { bytes: Buffer.alloc(10 * 1024 * 1024 + 1) })).response.status, 413)
    assert.equal((await a.upload(id, { alt: '' })).response.status, 400)
    assert.equal((await a.upload(id, { kind: 'floor_plan', bytes: floorPlan, isCover: true })).response.status, 400)
    assert.equal((await guest.request('/api/property-images/not-a-safe-key.svg')).response.status, 404)
    assert.equal((await guest.request('/api/property-images/%2e%2e%2fsecret')).response.status, 404)
    const jpegUpload = await a.upload(id, { bytes: jpeg, mime: 'text/plain', filename: 'derived-demo.jpg' })
    assert.equal(jpegUpload.response.status, 200)
    const jpegRead = await a.request(`/api/property-images/${jpegUpload.data.id}`)
    assert.equal(jpegRead.response.headers.get('content-type'), 'image/jpeg')
    assert.deepEqual(Buffer.from(jpegRead.data), jpeg)
    assert.equal((await a.upload(id, { bytes: jpeg.subarray(0, jpeg.length - 2), mime: 'image/jpeg' })).response.status, 400)
    await ok(a, `${path}/images/${jpegUpload.data.id}`, { method: 'DELETE' })
    assert.equal((await ok(a, path)).images.length, 3)
  })

  await t.test('photo order, alt labels and cover selection persist and exclude foreign media', async () => {
    const foreign = await b.upload(other.id)
    assert.equal(foreign.response.status, 200)
    assert.equal((await a.request(`${path}/images`, patch({ photos: [{ id: photoOne, altZhTw: '一' }, { id: foreign.data.id, altZhTw: '二' }], coverImageId: photoOne }))).response.status, 400)
    assert.equal((await a.request(`${path}/images`, patch({ photos: [{ id: photoOne, altZhTw: '一' }, { id: photoTwo, altZhTw: '二' }], coverImageId: plan }))).response.status, 400)
    await ok(a, `${path}/images`, patch({ photos: [{ id: photoTwo, altZhTw: '示範客廳・封面' }, { id: photoOne, altZhTw: '示範客廳・第二張' }], coverImageId: photoTwo, floorPlanId: plan, floorPlanAltZhTw: '示範2LDK格局圖' }))
    const images = (await ok(a, path)).images
    const photos = images.filter(image => image.kind === 'photo')
    assert.deepEqual(photos.map(image => image.id), [photoTwo, photoOne])
    assert.deepEqual(photos.map(image => image.position), [0, 1])
    assert.equal(photos[0].isCover, true)
    assert.equal(photos[0].altZhTw, '示範客廳・封面')
    assert.equal(images.find(image => image.kind === 'floor_plan').altZhTw, '示範2LDK格局圖')
    await ok(a, path, patch({ ...facts, status: 'published', floorNumber: -1, managementFeeYen: 0, repairReserveYen: 0 }))
    assert.equal((await guest.request(`/api/properties/${id}`)).response.status, 200, 'basement floors and zero fees are valid')
    const publishedImage = await guest.request(`/api/property-images/${photoTwo}`)
    assert.equal(publishedImage.response.status, 200)
    assert.equal(publishedImage.response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(Buffer.from(publishedImage.data), interior)
    assert.equal((await a.request(path, { method: 'DELETE' })).response.status, 409)
  })

  await t.test('Published Floor plan replacement is atomic and failed uploads keep publication', async () => {
    const failed = await a.upload(id, { kind: 'floor_plan', bytes: Buffer.from('bad'), alt: '無效格局圖' })
    assert.equal(failed.response.status, 400)
    const unchanged = await ok(a, path)
    assert.equal(unchanged.status, 'published')
    assert.equal(unchanged.images.find(image => image.kind === 'floor_plan').id, plan)
    assert.equal((await a.request(`${path}/images/${plan}`, { method: 'DELETE' })).response.status, 409)
    const previousPlan = plan
    const replacements = await Promise.all([
      a.upload(id, { kind: 'floor_plan', bytes: floorPlan, alt: '示範格局圖替換一' }),
      a.upload(id, { kind: 'floor_plan', bytes: floorPlan, alt: '示範格局圖替換二' }),
    ])
    assert.deepEqual(replacements.map(result => result.response.status), [200, 200])
    const detail = await ok(a, path)
    assert.equal(detail.status, 'published')
    const plans = detail.images.filter(image => image.kind === 'floor_plan')
    assert.equal(plans.length, 1)
    plan = plans[0].id
    const staleCaption = await a.request(`${path}/images`, patch({ photos: [{ id: photoTwo, altZhTw: '不應儲存' }, { id: photoOne, altZhTw: '不應儲存' }], coverImageId: photoTwo, floorPlanId: previousPlan, floorPlanAltZhTw: '過期格局圖說明' }))
    assert.equal(staleCaption.response.status, 409)
    assert.notEqual((await ok(a, path)).images.find(image => image.id === photoOne).altZhTw, '不應儲存')
    const fetched = await guest.request(`/api/property-images/${plan}`)
    assert.deepEqual(Buffer.from(fetched.data), floorPlan)
    for (const replaced of replacements.filter(result => result.data.id !== plan))
      assert.equal((await guest.request(`/api/property-images/${replaced.data.id}`)).response.status, 404)
  })

  await t.test('photo limit holds for concurrent uploads and delete preserves a valid Published cover', async () => {
    const extra = []
    for (let index = 0; index < 17; index++) {
      const result = await a.upload(id)
      assert.equal(result.response.status, 200)
      extra.push(result.data.id)
    }
    const race = await Promise.all([a.upload(id), a.upload(id)])
    assert.deepEqual(race.map(result => result.response.status).sort(), [200, 409])
    extra.push(race.find(result => result.response.status === 200).data.id)
    assert.equal((await a.upload(id)).response.status, 409)
    assert.equal((await ok(a, path)).images.filter(image => image.kind === 'photo').length, 20)
    for (const imageId of extra)
      await ok(a, `${path}/images/${imageId}`, { method: 'DELETE' })
    await ok(a, `${path}/images/${photoTwo}`, { method: 'DELETE' })
    assert.equal((await guest.request(`/api/property-images/${photoTwo}`)).response.status, 404)
    const last = (await ok(a, path)).images.find(image => image.kind === 'photo')
    assert.equal(last.isCover, true)
    assert.equal((await a.request(`${path}/images/${photoOne}`, { method: 'DELETE' })).response.status, 409)
    const uploaded = await a.upload(id, { alt: '示範客廳第二視角・本機測試' })
    assert.equal(uploaded.response.status, 200)
    photoTwo = uploaded.data.id
  })

  await t.test('Freshness review queue is Agency-owned and only includes due Published Properties', async () => {
    const otherPlan = await b.upload(other.id, { kind: 'floor_plan', bytes: floorPlan })
    assert.equal(otherPlan.response.status, 200)
    await ok(b, `/api/admin/properties/${other.id}`, patch({ ...facts, titleZhTw: '示範・第二公司本機測試', status: 'published' }))
    const ownQueue = await ok(a, '/api/admin/properties?review=due')
    const otherQueue = await ok(b, '/api/admin/properties?review=due')
    assert.ok(ownQueue.some(property => property.id === id))
    assert.ok(!ownQueue.some(property => property.id === other.id))
    assert.ok(otherQueue.some(property => property.id === other.id))
    assert.ok(!otherQueue.some(property => property.id === id))
    await ok(a, path, patch({ ...facts, status: 'published', nextUpdateOn: future }))
    assert.ok(!(await ok(a, '/api/admin/properties?review=due')).some(property => property.id === id))
    await ok(a, path, patch({ ...facts, status: 'published', nextUpdateOn: today }))
    assert.ok((await ok(a, '/api/admin/properties?review=due')).some(property => property.id === id))
  })

  await t.test('withdrawal hides images immediately, restoration revalidates and deletion removes media', async () => {
    await ok(a, path, patch({ ...facts, status: 'withdrawn' }))
    assert.equal((await guest.request(`/api/properties/${id}`)).response.status, 404)
    for (const client of [guest, b]) {
      const image = await client.request(`/api/property-images/${photoOne}`)
      assert.equal(image.response.status, 404)
      assert.equal(image.response.headers.get('cache-control'), 'no-store')
    }
    assert.equal((await a.request(`/api/property-images/${photoOne}`)).response.status, 200)
    assert.ok(!(await ok(a, '/api/admin/properties?review=due')).some(property => property.id === id))
    await ok(a, `${path}/images/${plan}`, { method: 'DELETE' })
    const invalidRestore = await a.request(path, patch({ ...facts, status: 'published' }))
    assert.equal(invalidRestore.response.status, 400)
    assert.ok(invalidRestore.data.statusMessage.includes('格局圖'))
    assert.equal((await ok(a, path)).status, 'withdrawn')
    const newPlan = await a.upload(id, { kind: 'floor_plan', bytes: floorPlan, alt: '示範2LDK格局・本機測試' })
    assert.equal(newPlan.response.status, 200)
    await ok(a, path, patch({ ...facts, status: 'published', nextUpdateOn: future }))
    assert.equal((await guest.request(`/api/property-images/${photoOne}`)).response.status, 200)
    assert.equal((await guest.request(`/api/properties/${id}`)).response.status, 200)
    const otherImages = (await ok(b, `/api/admin/properties/${other.id}`)).images
    await ok(b, `/api/admin/properties/${other.id}`, patch({ ...facts, status: 'withdrawn' }))
    await ok(b, `/api/admin/properties/${other.id}`, { method: 'DELETE' })
    assert.equal((await b.request(`/api/admin/properties/${other.id}`)).response.status, 404)
    for (const image of otherImages)
      assert.equal((await b.request(`/api/property-images/${image.id}`)).response.status, 404)
  })

  await t.test('publication and image deletion cannot race into an incomplete Published Property', async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const created = await ok(a, '/api/admin/properties', { method: 'POST', body: { ...facts, titleZhTw: '示範・交易並行本機測試' } })
      const racePath = `/api/admin/properties/${created.id}`
      assert.equal((await a.upload(created.id)).response.status, 200)
      const uploadedPlan = await a.upload(created.id, { kind: 'floor_plan', bytes: floorPlan })
      assert.equal(uploadedPlan.response.status, 200)
      const results = await Promise.all([
        a.request(racePath, patch({ ...facts, status: 'published', transitEntries: [{ ...facts.transitEntries[0], walkingMinutes: 11 }] })),
        a.request(`${racePath}/images/${uploadedPlan.data.id}`, { method: 'DELETE' }),
      ])
      assert.ok(results.every(result => [200, 400, 409].includes(result.response.status)), JSON.stringify(results.map(result => result.data)))
      assert.ok(results.some(result => result.response.status !== 200), 'publication and required-image deletion cannot both succeed')
      const persisted = await ok(a, racePath)
      if (persisted.status === 'published') {
        assert.equal(persisted.images.filter(image => image.kind === 'floor_plan').length, 1)
        assert.equal(persisted.transitEntries[0].walkingMinutes, 11)
      }
      else {
        assert.equal(persisted.transitEntries[0].walkingMinutes, 7, 'failed publication must not replace Transit entries')
      }
      await ok(a, racePath, patch({ ...facts, status: 'withdrawn' }))
      await ok(a, racePath, { method: 'DELETE' })
    }
  })

  await t.test('detached-house publication requires applicable areas, not condo floor or monthly fees', async () => {
    const house = { ...facts, titleZhTw: '示範・獨棟住宅本機測試', propertyType: 'detached_house', floorAreaSqm: null, floorNumber: null, managementFeeYen: null, repairReserveYen: null, landAreaSqm: null, buildingAreaSqm: null }
    const made = await ok(a, '/api/admin/properties', { method: 'POST', body: house })
    const housePath = `/api/admin/properties/${made.id}`
    assert.equal((await a.upload(made.id)).response.status, 200)
    assert.equal((await a.upload(made.id, { kind: 'floor_plan', bytes: floorPlan })).response.status, 200)
    const invalid = await a.request(housePath, patch({ ...house, status: 'published' }))
    assert.equal(invalid.response.status, 400)
    assert.ok(invalid.data.statusMessage.includes('土地面積'))
    assert.ok(invalid.data.statusMessage.includes('建物面積'))
    const complete = { ...house, landAreaSqm: 90.7, buildingAreaSqm: 85.2 }
    await ok(a, housePath, patch({ ...complete, status: 'published' }))
    const publicPage = await fetch(new URL(`/properties/${made.id}`, base))
    assert.equal(publicPage.status, 200)
    const html = await publicPage.text()
    assert.match(html, /<dt[^>]*>\s*總樓層\s*<\/dt>/)
    assert.doesNotMatch(html, /所在樓層／總樓層/)
    await ok(a, housePath, patch({ ...complete, status: 'withdrawn' }))
    await ok(a, housePath, { method: 'DELETE' })
  })
  const remaining = await ok(a, path)
  assert.equal(remaining.status, 'published')
  assert.equal(remaining.images.filter(image => image.kind === 'photo').length, 2)
  assert.equal(remaining.images.filter(image => image.kind === 'floor_plan').length, 1)
  const condoPage = await fetch(new URL(`/properties/${id}`, base))
  assert.equal(condoPage.status, 200)
  assert.match(await condoPage.text(), /所在樓層／總樓層/)
  t.diagnostic(`Published original-fixture demo Property id: ${id}`)
  t.diagnostic(`Local demo Agency email: agency-${suffix}-a@example.invalid`)
})
