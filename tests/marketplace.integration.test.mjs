import assert from 'node:assert/strict'
import test from 'node:test'

const base = process.env.MADORI_TEST_URL

async function request(path) {
  const response = await fetch(new URL(path, base))
  return { response, data: await response.json() }
}

async function search(query = {}) {
  const { response, data } = await request(`/api/properties?${new URLSearchParams(query)}`)
  assert.equal(response.status, 200)
  assert.ok(Array.isArray(data.items))
  assert.equal(typeof data.total, 'number')
  assert.ok(data.items.length <= data.pageSize)
  return data
}

test('Traditional Chinese pages keep their language in server-rendered HTML', { skip: !base }, async () => {
  assert.equal(new URL(base).hostname, 'localhost')
  for (const path of ['/', '/search', '/guide', '/buyer/login']) {
    const response = await fetch(new URL(path, base))
    assert.equal(response.status, 200, path)
    assert.match(await response.text(), /<html\s[^>]*\blang="zh-TW"/, path)
  }
})

test('the illustration notice has an opaque caption background', { skip: !base }, async () => {
  assert.equal(new URL(base).hostname, 'localhost')
  const response = await fetch(new URL('/', base))
  assert.equal(response.status, 200)
  const html = await response.text()
  const caption = html.match(/<figcaption\b[^>]*\sclass="([^"]+)"[^>]*>([\s\S]*?)<\/figcaption>/)
  assert.ok(caption)
  assert.ok(caption[1].split(/\s+/).includes('bg-default'))
  assert.match(caption[2], /街景示意圖・非實際物件/)
})

test('Search pagination keeps its controls in a wrapping list', { skip: !base }, async () => {
  assert.equal(new URL(base).hostname, 'localhost')
  const response = await fetch(new URL('/search', base))
  assert.equal(response.status, 200)
  const html = await response.text()
  const navigation = html.match(/<nav\b(?=[^>]+aria-label="搜尋結果分頁")[^>]+>([\s\S]*?)<\/nav>/)?.[1]
  assert.ok(navigation, 'load local Published demonstration listings before this test')
  const listClass = navigation.match(/<div\b(?=[^>]+data-slot="list")[^>]+class="([^"]*)"/)?.[1]
  assert.ok(listClass?.split(/\s+/).includes('flex-wrap'))
  assert.ok(listClass?.split(/\s+/).includes('justify-center'))
  for (const label of ['第一頁', '上一頁', '下一頁', '最後一頁'])
    assert.ok(navigation.includes(`aria-label="${label}"`), label)
})

test('public search validates, filters, sorts and paginates Published Properties', { skip: !base }, async () => {
  assert.equal(new URL(base).hostname, 'localhost')
  const first = await search({ pageSize: '24', sort: 'price_asc' })
  assert.ok(first.total > 0, 'load local demonstration listings before this test')
  assert.equal(first.page, 1)
  assert.equal(first.pageSize, 24)
  const prices = first.items.map(property => property.priceYen)
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b))
  const descending = await search({ pageSize: '24', sort: 'price_desc' })
  const descendingPrices = descending.items.map(property => property.priceYen)
  assert.deepEqual(descendingPrices, [...descendingPrices].sort((a, b) => b - a))
  const largest = await search({ pageSize: '24', sort: 'area_desc' })
  const areas = largest.items.map(property => property.propertyType === 'condominium' ? property.floorAreaSqm : property.landAreaSqm)
  assert.deepEqual(areas, [...areas].sort((a, b) => b - a))

  const candidate = first.items[0]
  const detail = await request(`/api/properties/${candidate.id}`)
  assert.equal(detail.response.status, 200)
  assert.equal(detail.data.id, candidate.id)
  assert.equal(typeof detail.data.agency.name, 'string')
  assert.equal(typeof detail.data.agency.license, 'string')
  assert.equal(typeof detail.data.nextUpdateOn, 'string')
  assert.equal(typeof detail.data.updatedAt, 'string')
  assert.equal('email' in detail.data.agency, false, 'private agency account fields do not leak')
  for (const image of detail.data.images) {
    assert.ok(['photo', 'floor_plan'].includes(image.kind))
    assert.equal(typeof image.altZhTw, 'string')
    assert.equal(typeof image.position, 'number')
  }

  const filtered = await search({ ward: candidate.ward, propertyType: candidate.propertyType, layout: candidate.layout, minPrice: String(candidate.priceYen), maxPrice: String(candidate.priceYen) })
  assert.ok(filtered.items.some(property => property.id === candidate.id))
  assert.ok(filtered.items.every(property => property.ward === candidate.ward && property.propertyType === candidate.propertyType && property.layout === candidate.layout && property.priceYen === candidate.priceYen))
  const area = candidate.propertyType === 'condominium' ? candidate.floorAreaSqm : candidate.landAreaSqm
  const areaFiltered = await search({ minFloorArea: String(area), maxFloorArea: String(area) })
  assert.ok(areaFiltered.items.some(property => property.id === candidate.id))
  for (const property of areaFiltered.items)
    assert.equal(property.propertyType === 'condominium' ? property.floorAreaSqm : property.landAreaSqm, area)

  const pageOne = await search({ pageSize: '1', page: '1', sort: 'price_asc' })
  const pageTwo = await search({ pageSize: '1', page: '2', sort: 'price_asc' })
  assert.equal(pageOne.items[0].id, first.items[0].id)
  if (first.total > 1) {
    assert.equal(pageTwo.items[0].id, first.items[1].id)
    assert.notEqual(pageOne.items[0].id, pageTwo.items[0].id)
  }
  assert.equal(pageOne.total, pageTwo.total)
  const beyond = await search({ page: '10000' })
  assert.equal(beyond.items.length, 0)
  assert.equal(beyond.total, first.total)
  const empty = await search({ maxPrice: '0' })
  assert.equal(empty.total, 0)
  assert.deepEqual(empty.items, [])

  for (const query of ['ward=大阪市', 'sort=random', 'page=0', 'page=1.5', 'page=Infinity', 'page=1&page=2', 'pageSize=25', 'minPrice=NaN', 'minPrice=-1', 'maxPrice=1e20', 'minPrice=2&maxPrice=1', 'minFloorArea=60&maxFloorArea=40', 'maxAgeYears=2.5', 'maxWalkingMinutes=-1', 'maxWalkingMinutes=121'])
    assert.equal((await request(`/api/properties?${query}`)).response.status, 400, query)
  assert.equal((await request('/api/properties/no-such-property')).response.status, 404)

  const stationResponse = await request('/api/stations')
  assert.equal(stationResponse.response.status, 200)
  const transit = detail.data.transitEntries[0]
  if (transit) {
    const line = stationResponse.data.lines.find(item => item.nameZhTw === transit.lineNameZhTw)
    const station = stationResponse.data.stations.find(item => item.nameZhTw === transit.stationNameZhTw && item.lineId === line.id)
    assert.ok(station)
    const connected = await search({ lineId: station.lineId, stationId: station.id, maxWalkingMinutes: String(transit.walkingMinutes) })
    assert.ok(connected.items.some(property => property.id === candidate.id))
    for (const property of connected.items) {
      const propertyDetail = (await request(`/api/properties/${property.id}`)).data
      assert.ok(propertyDetail.transitEntries.some(entry => entry.lineNameZhTw === line.nameZhTw && entry.stationNameZhTw === station.nameZhTw && entry.walkingMinutes <= transit.walkingMinutes))
    }
  }
})
