import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire, registerHooks } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import * as v from 'valibot'
import { inquirySubmissionSchema } from '../shared/inquiry.ts'

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
const { createError } = createRequire(import.meta.resolve('nuxt'))('h3')
globalThis.createError = createError
const { submitInquiry, buyerInquiryHistory, agencyInquiryInbox, readAgencyInquiry } = await import('../server/utils/inquiries.ts')
const { inquiryNotificationText, sendInquiryNotification } = await import('../server/utils/inquiry-notification.ts')

function localDatabase() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys=ON')
  for (const name of ['0000_mean_gamma_corps.sql', '0001_buyer_accounts_and_inquiries.sql'])
    sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'))
  sqlite.exec(`
    INSERT INTO agencies (id,name,email,license,line_url,created_at,updated_at) VALUES
      ('agency-a','測試公司甲','a@example.invalid','本機測試','https://line.me/test','2026-10-09','2026-10-09'),
      ('agency-b','測試公司乙','b@example.invalid','本機測試','https://line.me/test','2026-10-09','2026-10-09');
    INSERT INTO buyers (id,name,email,created_at) VALUES
      ('buyer-a','買方甲','buyer-a@example.invalid','2026-10-09'),
      ('buyer-b','買方乙','buyer-b@example.invalid','2026-10-09');
    INSERT INTO properties (id,property_number,agency_id,status,property_type,build_status,title_zh_tw,description_zh_tw,price_yen,ward,address_zh_tw,layout,floor_area_sqm,built_on,structure,floor_number,total_floors,land_rights,management_fee_yen,repair_reserve_yen,transaction_mode,next_update_on,created_at,updated_at) VALUES
      ('property-a','LOCAL-A','agency-a','published','condominium','resale','示範甲','本機測試',64000000,'目黑區','示範地址','2LDK',58,'2010-01','RC',3,8,'所有權',12000,8000,'仲介','2027-01-01','2026-10-09','2026-10-09'),
      ('property-b','LOCAL-B','agency-b','published','condominium','resale','示範乙','本機測試',64000000,'目黑區','示範地址','2LDK',58,'2010-01','RC',3,8,'所有權',12000,8000,'仲介','2027-01-01','2026-10-09','2026-10-09');
    INSERT INTO lines (id,name_ja,name_zh_tw) VALUES ('line','本機線','本機線');
    INSERT INTO stations (id,line_id,name_ja,name_zh_tw) VALUES ('station','line','本機站','本機站');
    INSERT INTO property_transit_entries (id,property_id,station_id,walking_minutes) VALUES ('transit-a','property-a','station',7),('transit-b','property-b','station',7);
    INSERT INTO property_images (id,property_id,object_key,kind,position,is_cover,alt_zh_tw,created_at) VALUES
      ('photo-a','property-a','photo-a','photo',0,1,'示範照片','2026-10-09'),('plan-a','property-a','plan-a','floor_plan',0,0,'示範格局圖','2026-10-09'),
      ('photo-b','property-b','photo-b','photo',0,1,'示範照片','2026-10-09'),('plan-b','property-b','plan-b','floor_plan',0,0,'示範格局圖','2026-10-09');
  `)
  const database = drizzle(async (sql, params, method) => {
    const statement = sqlite.prepare(sql)
    statement.setReturnArrays(true)
    if (method === 'run') {
      statement.run(...params)
      return { rows: [] }
    }
    return { rows: method === 'get' ? statement.get(...params) : statement.all(...params) }
  })
  return { sqlite, database }
}

const input = (change = {}) => v.parse(inquirySubmissionSchema, { propertyId: 'property-a', submissionKey: crypto.randomUUID(), message: '請問看屋時間？', ...change })

test('bounded Inquiry validation rejects recipient and contact spoofing', () => {
  assert.equal(input({ message: ' 問題 ' }).message, '問題')
  const valid = input()
  for (const change of [{ message: '' }, { message: ' ' }, { message: 'x'.repeat(2001) }, { submissionKey: 'not-random' }, { propertyId: '../secret' }, { agencyId: 'agency-b' }, { buyerId: 'buyer-b' }, { buyerName: '偽造' }, { buyerEmail: 'spoof@example.invalid' }])
    assert.equal(v.safeParse(inquirySubmissionSchema, { ...valid, ...change }).success, false)
})

test('concurrent persistence has one Notification attempt and rejects changed payloads', async () => {
  const { sqlite, database } = localDatabase()
  try {
    const payload = input()
    let attempts = 0
    let release
    const completion = new Promise(resolve => release = resolve)
    let entered
    const started = new Promise(resolve => entered = resolve)
    const notify = async (inquiry, email) => {
      attempts++
      assert.equal(email, 'a@example.invalid')
      assert.equal(inquiry.buyerName, '買方甲')
      assert.equal(inquiry.buyerEmail, 'buyer-a@example.invalid')
      assert.equal(sqlite.prepare('SELECT count(*) AS count FROM inquiries').get().count, 1, 'persist before notification')
      entered()
      await completion
      throw new Error('Email failure under test')
    }
    const first = submitInquiry({ database, buyerId: 'buyer-a', input: payload, notify })
    await started
    const retries = await Promise.all(Array.from({ length: 8 }, () => submitInquiry({ database, buyerId: 'buyer-a', input: payload, notify })))
    assert.equal(attempts, 1)
    assert.ok(retries.every(inquiry => inquiry.notificationStatus === 'pending'))
    assert.equal(new Set(retries.map(inquiry => inquiry.id)).size, 1)
    await assert.rejects(submitInquiry({ database, buyerId: 'buyer-a', input: { ...payload, message: '不同訊息' }, notify }), { statusCode: 409 })
    await assert.rejects(submitInquiry({ database, buyerId: 'buyer-a', input: { ...payload, propertyId: 'property-b' }, notify }), { statusCode: 409 })
    release()
    const saved = await first
    assert.equal(saved.notificationStatus, 'failed')
    assert.equal(saved.notificationError, 'email-send-failed')
    assert.equal(saved.notifiedAt, null)
    const retry = await submitInquiry({ database, buyerId: 'buyer-a', input: payload, notify })
    assert.equal(retry.id, saved.id)
    assert.equal(attempts, 1, 'failed notifications are not re-sent on duplicate submissions')
    assert.equal(sqlite.prepare('SELECT count(*) AS count FROM inquiries').get().count, 1)
  }
  finally {
    sqlite.close()
  }
})

test('simultaneous first submissions with the same key create one Inquiry and one Notification attempt', async () => {
  const { sqlite, database } = localDatabase()
  try {
    let attempts = 0
    const notify = async () => {
      attempts++
      return { status: 'failed', error: 'local-disabled' }
    }
    const payload = input()
    const results = await Promise.all(Array.from({ length: 12 }, () => submitInquiry({ database, buyerId: 'buyer-a', input: payload, notify })))
    assert.equal(new Set(results.map(inquiry => inquiry.id)).size, 1)
    assert.equal(attempts, 1)
    assert.equal(sqlite.prepare('SELECT count(*) AS count FROM inquiries').get().count, 1)
  }
  finally {
    sqlite.close()
  }
})

test('racing different payloads with the same key creates only the winning Inquiry', async () => {
  const { sqlite, database } = localDatabase()
  try {
    let attempts = 0
    const notify = async () => {
      attempts++
      return { status: 'failed', error: 'local-disabled' }
    }
    const payload = input()
    const results = await Promise.allSettled([
      submitInquiry({ database, buyerId: 'buyer-a', input: payload, notify }),
      submitInquiry({ database, buyerId: 'buyer-a', input: { ...payload, propertyId: 'property-b', message: '另一筆' }, notify }),
    ])
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
    assert.equal(results.find(result => result.status === 'rejected').reason.statusCode, 409)
    assert.equal(attempts, 1)
    assert.equal(sqlite.prepare('SELECT count(*) AS count FROM inquiries').get().count, 1)
  }
  finally {
    sqlite.close()
  }
})

test('two Agencies and Buyers retain isolated snapshots after withdrawal and deletion', async () => {
  const { sqlite, database } = localDatabase()
  try {
    const notify = async () => ({ status: 'failed', error: 'local-disabled' })
    const payload = input()
    const a = await submitInquiry({ database, buyerId: 'buyer-a', input: payload, notify })
    const b = await submitInquiry({ database, buyerId: 'buyer-b', input: { ...payload, propertyId: 'property-b', message: '買方乙的私密訊息' }, notify })
    assert.notEqual(a.id, b.id, 'submission keys are scoped to each Buyer')
    assert.equal((await buyerInquiryHistory({ database, buyerId: 'buyer-a', page: 1 })).items.length, 1)
    assert.equal((await agencyInquiryInbox({ database, agencyId: 'agency-b', page: 1 })).items[0].id, b.id)
    await assert.rejects(readAgencyInquiry({ database, agencyId: 'agency-b', id: a.id }), { statusCode: 404 })
    const read = await readAgencyInquiry({ database, agencyId: 'agency-a', id: a.id })
    const again = await readAgencyInquiry({ database, agencyId: 'agency-a', id: a.id })
    assert.equal(again.readAt, read.readAt)
    assert.equal(sqlite.prepare('SELECT notification_status FROM inquiries WHERE id=?').get(a.id).notification_status, 'failed')
    sqlite.prepare(`UPDATE properties SET status='withdrawn',title_zh_tw='私密草稿',address_zh_tw='私密地址' WHERE id='property-a'`).run()
    const history = await buyerInquiryHistory({ database, buyerId: 'buyer-a', page: 1 })
    assert.equal(history.items[0].propertyId, null)
    assert.equal(history.items[0].propertyTitle, '示範甲')
    assert.equal(history.items[0].propertyNumber, 'LOCAL-A')
    assert.ok(!JSON.stringify(history).includes('私密'))
    await assert.rejects(submitInquiry({ database, buyerId: 'buyer-a', input: input(), notify }), { statusCode: 404 })
    sqlite.prepare(`DELETE FROM properties WHERE id='property-a'`).run()
    assert.equal(sqlite.prepare('SELECT property_id FROM inquiries WHERE id=?').get(a.id).property_id, null)
    assert.equal((await submitInquiry({ database, buyerId: 'buyer-a', input: payload, notify })).id, a.id)
    await assert.rejects(submitInquiry({ database, buyerId: 'buyer-a', input: { ...payload, propertyId: 'property-b' }, notify }), { statusCode: 409 })
    assert.equal((await agencyInquiryInbox({ database, agencyId: 'agency-a', page: 1 })).items[0].propertyTitle, '示範甲')
  }
  finally {
    sqlite.close()
  }
})

test('history and inbox pagination have bounded pages and stable ordering', async () => {
  const { sqlite, database } = localDatabase()
  try {
    const notify = async () => ({ status: 'failed', error: 'local-disabled' })
    for (let index = 0; index < 23; index++)
      await submitInquiry({ database, buyerId: 'buyer-a', input: input({ message: `訊息 ${index}` }), notify })
    const first = await buyerInquiryHistory({ database, buyerId: 'buyer-a', page: 1 })
    const second = await buyerInquiryHistory({ database, buyerId: 'buyer-a', page: 2 })
    assert.equal(first.total, 23)
    assert.equal(first.items.length, 20)
    assert.equal(second.items.length, 3)
    assert.equal(new Set([...first.items, ...second.items].map(inquiry => inquiry.id)).size, 23)
    assert.deepEqual((await buyerInquiryHistory({ database, buyerId: 'buyer-a', page: 1 })).items.map(row => row.id), first.items.map(row => row.id))
    assert.equal((await agencyInquiryInbox({ database, agencyId: 'agency-a', page: 2 })).items.length, 3)
    assert.equal((await buyerInquiryHistory({ database, buyerId: 'buyer-b', page: 1 })).total, 0)
  }
  finally {
    sqlite.close()
  }
})

test('Notification uses plain text and configured appUrl; absent binding fails safely', async () => {
  const inquiry = { id: 'local', propertyTitle: '<img src=x onerror=alert(1)>', propertyNumber: 'LOCAL', buyerName: '<b>買方</b>', buyerEmail: 'buyer@example.invalid', message: '<script>alert(1)</script>' }
  const text = inquiryNotificationText({ inquiry, appUrl: 'https://configured.example.invalid/path' })
  assert.ok(text.includes('https://configured.example.invalid/admin/inquiries'))
  assert.ok(text.includes(inquiry.message), 'plain text does not interpret HTML')
  assert.throws(() => inquiryNotificationText({ inquiry, appUrl: 'javascript:alert(1)' }))
  const result = await sendInquiryNotification({ event: { context: {} }, inquiry, recipientEmail: 'agency@example.invalid' })
  assert.deepEqual(result, { status: 'failed', error: 'email-unavailable' })
})
