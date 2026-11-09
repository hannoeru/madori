import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import * as v from 'valibot'
import { registrationSchema } from '../shared/account.ts'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('registration accepts both roles and rejects unsafe agency links', () => {
  const buyer = v.parse(registrationSchema, { role: 'buyer', name: ' 王小明 ', email: 'buyer@example.invalid' })
  assert.deepEqual(buyer, { role: 'buyer', name: '王小明', email: 'buyer@example.invalid' })
  const agency = v.parse(registrationSchema, { role: 'agency', name: '東京房屋', email: 'agency@example.invalid', license: '東京都知事（1）第000000號', lineUrl: 'https://line.me/ti/p/demo' })
  assert.equal(agency.role, 'agency')
  for (const lineUrl of ['javascript:alert(1)', 'http://line.me/test', 'https://evil.invalid', 'https://line.me@evil.invalid/test']) {
    assert.equal(v.safeParse(registrationSchema, { ...agency, lineUrl }).success, false)
  }
  assert.equal(v.safeParse(registrationSchema, { ...buyer, role: 'admin' }).success, false)
})

test('domain migration preserves media and transit and enforces ownership', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec('PRAGMA foreign_keys=ON')
    db.exec(read('../migrations/0000_mean_gamma_corps.sql'))
    db.exec(read('../db/seed.sql'))
    db.exec(read('../db/seed-demo.sql'))
    const property = db.prepare('SELECT id FROM properties LIMIT 1').get()
    db.prepare('INSERT INTO property_images (id,property_id,object_key,kind,position,is_cover,alt_zh_tw,created_at) VALUES (?,?,?,?,?,?,?,?)').run('fixture-photo', property.id, 'fixture-photo', 'photo', 0, 1, '示範照片', '2026-10-10T00:00:00Z')
    const transitBefore = db.prepare('SELECT count(*) AS total FROM property_transit_entries').get().total
    db.exec('BEGIN')
    db.exec(read('../migrations/0001_buyer_accounts_and_inquiries.sql'))
    db.exec('COMMIT')
    assert.equal(db.prepare('SELECT object_key FROM property_images WHERE id=?').get('fixture-photo').object_key, 'fixture-photo')
    assert.equal(db.prepare('SELECT count(*) AS total FROM property_transit_entries').get().total, transitBefore)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
    assert.throws(() => db.prepare('UPDATE properties SET agency_id=NULL WHERE id=?').run(property.id), /NOT NULL/)
    db.prepare('INSERT INTO buyers (id,name,email,created_at) VALUES (?,?,?,?)').run('buyer-test', '王小明', 'buyer-test@example.invalid', '2026-10-10T00:00:00Z')
    db.prepare('INSERT INTO saved_properties (buyer_id,property_id,created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING').run('buyer-test', property.id, '2026-10-10T00:00:00Z')
    db.prepare('INSERT INTO saved_properties (buyer_id,property_id,created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING').run('buyer-test', property.id, '2026-10-10T00:00:00Z')
    assert.equal(db.prepare('SELECT count(*) AS total FROM saved_properties').get().total, 1)
  }
  finally {
    db.close()
  }
})
