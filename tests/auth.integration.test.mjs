import assert from 'node:assert/strict'
import test from 'node:test'

const base = process.env.MADORI_TEST_URL

class Client {
  cookie = ''

  async request(path, { method = 'GET', body, origin } = {}) {
    const response = await fetch(new URL(path, base), {
      method,
      redirect: 'manual',
      headers: { ...(this.cookie ? { cookie: this.cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...(origin ? { origin } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const cookies = response.headers.getSetCookie()
    if (cookies.length)
      this.cookie = cookies.map(value => value.split(';')[0]).join('; ')
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
    return { response, data }
  }

  async register(role, suffix) {
    const body = { role, name: `驗證${suffix}`, email: `${role}-${suffix}@example.invalid` }
    if (role === 'agency') {
      body.license = '東京都知事（1）第000000號・測試'
      body.lineUrl = 'https://line.me/ti/p/madori-test'
    }
    const { response, data } = await this.request('/api/auth/register', { method: 'POST', body })
    assert.equal(response.status, 200)
    assert.equal(data.ok, true)
    assert.equal(typeof data.link, 'string', 'integration auth runs only on a local Nuxt development server')
    const verification = await this.request(data.link)
    assert.equal(verification.response.status, 302)
    assert.equal(verification.response.headers.get('location'), role === 'agency' ? '/admin' : '/buyer')
    return data.link
  }
}

test('concurrent local login requests keep the one accepted link usable', { skip: !base }, async () => {
  const url = new URL(base)
  assert.equal(url.hostname, 'localhost')
  assert.equal(url.port, '3010', 'local development test links only; never send email')
  const suffix = `cooldown-${crypto.randomUUID()}`
  const account = new Client()
  await account.register('buyer', suffix)
  const body = { role: 'buyer', email: `buyer-${suffix}@example.invalid` }
  const results = await Promise.all(Array.from({ length: 4 }, () => new Client().request('/api/auth/login', { method: 'POST', body })))
  assert.equal(results.filter(result => result.response.status === 200).length, 1)
  assert.equal(results.filter(result => result.response.status === 429).length, 3)
  const accepted = results.find(result => result.response.status === 200)
  assert.equal(typeof accepted.data.link, 'string')
  const verification = await new Client().request(accepted.data.link)
  assert.equal(verification.response.status, 302)
  assert.equal(verification.response.headers.get('location'), '/buyer')
})

test('role-bound sessions isolate two agencies and two buyers', { skip: !base }, async () => {
  assert.equal(new URL(base).hostname, 'localhost', 'use only a local development server')
  const suffix = crypto.randomUUID()
  const agencies = [new Client(), new Client()]
  const buyers = [new Client(), new Client()]
  const guest = new Client()
  const firstLink = await agencies[0].register('agency', `${suffix}-a`)
  await agencies[1].register('agency', `${suffix}-b`)
  await buyers[0].register('buyer', `${suffix}-a`)
  await buyers[1].register('buyer', `${suffix}-b`)

  const consumed = await guest.request(firstLink)
  assert.equal(consumed.response.headers.get('location'), '/login?error=expired')
  assert.equal((await guest.request('/api/admin/properties')).response.status, 401)
  for (const buyer of buyers) {
    assert.equal((await buyer.request('/api/admin/properties')).response.status, 403)
    const account = await buyer.request('/api/buyer/account')
    assert.equal(account.response.status, 200)
    assert.equal(account.data.user.role, 'buyer')
  }
  const buyerA = await buyers[0].request('/api/buyer/account')
  const buyerB = await buyers[1].request('/api/buyer/account')
  assert.notEqual(buyerA.data.user.id, buyerB.data.user.id)
  const foreignAccount = await buyers[0].request(`/api/buyer/account?id=${buyerB.data.user.id}`)
  assert.equal(foreignAccount.data.user.id, buyerA.data.user.id)
  assert.equal(foreignAccount.data.user.email, buyerA.data.user.email)
  for (const agency of agencies) {
    assert.equal((await agency.request('/api/buyer/account')).response.status, 403)
    assert.equal((await agency.request('/api/admin/properties')).response.status, 200)
  }

  const body = { propertyType: 'condominium', buildStatus: 'resale', status: 'draft', titleZhTw: '測試物件・不公開', descriptionZhTw: '只用於本機驗證。', priceYen: 64800000, ward: '目黑區', addressZhTw: '東京都目黑區・測試', layout: '2LDK', floorAreaSqm: 58, builtOn: '2010-01', nextUpdateOn: '2026-12-01', transitEntries: [] }
  const own = await agencies[0].request('/api/admin/properties', { method: 'POST', body })
  assert.equal(own.response.status, 200)
  const id = own.data.id
  assert.equal((await agencies[0].request(`/api/admin/properties/${id}`)).response.status, 200)
  assert.equal((await agencies[1].request(`/api/admin/properties/${id}`)).response.status, 404)
  assert.equal((await agencies[1].request(`/api/admin/properties/${id}`, { method: 'PATCH', body })).response.status, 404)
  assert.equal((await agencies[1].request(`/api/admin/properties/${id}/images`, { method: 'POST' })).response.status, 404)
  assert.equal((await buyers[0].request(`/api/admin/properties/${id}`)).response.status, 403)
  assert.equal((await guest.request(`/api/properties/${id}`)).response.status, 404)
  assert.equal((await agencies[0].request(`/api/admin/properties/${id}`, { method: 'PATCH', body, origin: 'https://foreign.invalid' })).response.status, 403)

  const sameEmail = `dual-${suffix}@example.invalid`
  const company = new Client()
  const buyer = new Client()
  const companyReg = await company.request('/api/auth/register', { method: 'POST', body: { role: 'agency', name: '雙角色公司', email: sameEmail, license: '測試', lineUrl: 'https://lin.ee/madori-test' } })
  const buyerReg = await buyer.request('/api/auth/register', { method: 'POST', body: { role: 'buyer', name: '雙角色買方', email: sameEmail } })
  assert.equal(companyReg.response.status, 200)
  assert.equal(buyerReg.response.status, 200)
  const verification = await Promise.all([company.request(companyReg.data.link), guest.request(companyReg.data.link)])
  assert.deepEqual(verification.map(result => result.response.headers.get('location')).sort(), ['/admin', '/login?error=expired'])
  assert.equal((await buyer.request(buyerReg.data.link)).response.headers.get('location'), '/buyer')
  assert.equal((await buyer.request('/api/admin/properties')).response.status, 403)
})
