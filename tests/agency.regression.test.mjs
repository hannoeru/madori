import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire, registerHooks } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { decode, encode } from 'jpeg-js'
import ts from 'typescript'
import { effectScope, nextTick, reactive, ref } from 'vue'

const h3Path = createRequire(import.meta.resolve('nuxt')).resolve('h3')
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
const { createError } = createRequire(import.meta.resolve('nuxt'))('h3')
globalThis.createError = createError
const { validatedImageType, MAX_JPEG_RESOLUTION_MP, MAX_JPEG_MEMORY_MB } = await import('../server/utils/property-image.ts')
const { tokyoDate, propertyDateError, adminImageRecoverySchema, adminImageRecoveryErrorSchema } = await import('../shared/admin-property.ts')
const { compensateFailedUpload, recoverFailedUpload, createUploadRecoveryToken } = await import('../server/utils/property-upload-recovery.ts')
const { requestErrorMessage } = await import('../app/utils/request-error.ts')
globalThis.requestErrorMessage = requestErrorMessage
const { imageSettingsStatements, saveImageSettings } = await import('../server/utils/property-image-settings.ts')
const { queueFloorPlanDeletion, imageDeletionStatements, propertyDeletionStatements, queueUploadCompensation, retryImageCleanup } = await import('../server/utils/property-media-cleanup.ts')

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const jpeg = encode({ data: new Uint8Array(16 * 16 * 4), width: 16, height: 16 }).data

function databaseFixture() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys=ON')
  for (const name of ['0000_mean_gamma_corps.sql', '0001_buyer_accounts_and_inquiries.sql', '0002_agency_media_cleanup.sql'])
    sqlite.exec(read(`../migrations/${name}`))
  sqlite.exec(`
    INSERT INTO agencies VALUES ('agency-a','本機測試甲','a@example.invalid','本機測試','https://line.me/test','2026-10-10','2026-10-10'),('agency-b','本機測試乙','b@example.invalid','本機測試','https://line.me/test','2026-10-10','2026-10-10');
    INSERT INTO properties (id,property_number,agency_id,status,property_type,build_status,title_zh_tw,description_zh_tw,price_yen,ward,address_zh_tw,layout,built_on,next_update_on,created_at,updated_at)
    VALUES ('property-a','LOCAL-A','agency-a','withdrawn','condominium','resale','示範甲','本機測試',1,'目黑區','示範地址','2LDK','2010-01','2027-01-01','2026-10-10','2026-10-10'),('property-b','LOCAL-B','agency-b','withdrawn','condominium','resale','示範乙','本機測試',1,'目黑區','示範地址','2LDK','2010-01','2027-01-01','2026-10-10','2026-10-10');
    INSERT INTO property_images VALUES ('photo-a','property-a','photo-a','photo',0,1,'示範照片','2026-10-10'),('plan-a','property-a','plan-a','floor_plan',0,0,'原格局圖','2026-10-10'),('photo-b','property-b','photo-b','photo',0,1,'示範照片','2026-10-10');
  `)
  const database = {
    prepare(sql) {
      const execute = params => ({
        bind(...values) { return execute(values) },
        run() {
          const result = sqlite.prepare(sql).run(...params)
          return { success: true, results: [], meta: { changes: Number(result.changes) } }
        },
        all() { return { success: true, results: sqlite.prepare(sql).all(...params), meta: {} } },
      })
      return execute([])
    },
    async batch(statements) {
      sqlite.exec('BEGIN')
      try {
        const results = statements.map(statement => statement.run())
        sqlite.exec('COMMIT')
        return results
      }
      catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },
  }
  return { sqlite, database }
}

const queued = sqlite => sqlite.prepare('SELECT object_key,agency_id FROM pending_image_deletions ORDER BY object_key').all().map(row => ({ ...row }))

test('strict jpeg-js decoding rejects fabricated JPEGs and preserves valid JPEG bytes', () => {
  const fabricated = Buffer.from('ffd8ffc0000b080001000101011100ffda0008010100003f0000ffd9', 'hex')
  assert.equal(fabricated.length, 28)
  assert.throws(() => validatedImageType(fabricated), { statusCode: 400 })
  assert.equal(validatedImageType(jpeg), 'image/jpeg')
  assert.throws(() => validatedImageType(jpeg.subarray(0, jpeg.length - 2)), { statusCode: 400 })
  const decoded = decode(jpeg, { useTArray: true, tolerantDecoding: false, formatAsRGBA: false })
  assert.ok(decoded.data instanceof Uint8Array)
  assert.equal(decoded.data.length, 16 * 16 * 3)
})

test('JPEG decoding enforces both small resolution and memory limits', () => {
  assert.equal(MAX_JPEG_RESOLUTION_MP, 2)
  assert.equal(MAX_JPEG_MEMORY_MB, 32)
  const oversized = Buffer.from(jpeg)
  const frame = oversized.indexOf(Buffer.from([0xFF, 0xC0]))
  assert.ok(frame >= 0)
  oversized.writeUInt16BE(2001, frame + 5)
  oversized.writeUInt16BE(1000, frame + 7)
  assert.throws(() => decode(oversized, { useTArray: true, tolerantDecoding: false, maxResolutionInMP: 2, maxMemoryUsageInMB: 32 }), /maxResolutionInMP/)
  assert.throws(() => validatedImageType(oversized), { statusCode: 400 })
  const memoryBound = encode({ data: new Uint8Array(2000 * 1000 * 4), width: 2000, height: 1000 }).data
  assert.equal(decode(memoryBound, { useTArray: true, tolerantDecoding: false, formatAsRGBA: false, maxResolutionInMP: 2, maxMemoryUsageInMB: 64 }).width, 2000)
  assert.throws(() => decode(memoryBound, { useTArray: true, tolerantDecoding: false, formatAsRGBA: false, maxResolutionInMP: 2, maxMemoryUsageInMB: 32 }), /maxMemoryUsageInMB/)
  assert.throws(() => validatedImageType(memoryBound), { statusCode: 400 })
})

test('completion dates use the Tokyo month at UTC month and year boundaries', () => {
  const monthBoundary = new Date('2026-09-30T15:30:00Z')
  assert.equal(tokyoDate(monthBoundary), '2026-10-01')
  assert.equal(propertyDateError({ buildStatus: 'resale', builtOn: '2026-10' }, monthBoundary), null)
  assert.ok(propertyDateError({ buildStatus: 'resale', builtOn: '2026-11' }, monthBoundary))
  const yearBoundary = new Date('2026-12-31T15:30:00Z')
  assert.equal(propertyDateError({ buildStatus: 'resale', builtOn: '2027-01' }, yearBoundary), null)
  assert.equal(propertyDateError({ buildStatus: 'new', builtOn: '2032-12' }, yearBoundary), null)
  assert.ok(propertyDateError({ buildStatus: 'new', builtOn: '2033-01' }, yearBoundary))
})

test('removal and durable cleanup keys commit together; R2 failure does not reverse domain success', async () => {
  const { sqlite, database } = databaseFixture()
  try {
    const result = await database.batch(imageDeletionStatements(database, 'property-a', 'agency-a', 'photo-a'))
    assert.equal(result[1].meta.changes, 1)
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM property_images WHERE id=\'photo-a\'').get().n, 0)
    assert.deepEqual(queued(sqlite), [{ object_key: 'photo-a', agency_id: 'agency-a' }])
    const failed = await retryImageCleanup({ database, agencyId: 'agency-a', bucket: { async delete() {
      throw new Error('R2 unavailable')
    } } })
    assert.deepEqual(failed, { cleanupPending: true })
    assert.equal(queued(sqlite).length, 1)
    assert.equal((await database.batch(imageDeletionStatements(database, 'property-b', 'agency-b', 'photo-b')))[1].meta.changes, 1)
    const deleted = []
    const success = await retryImageCleanup({ database, agencyId: 'agency-a', bucket: { async delete(keys) {
      deleted.push(...keys)
    } } })
    assert.deepEqual(success, { cleanupPending: false })
    assert.deepEqual(deleted, ['photo-a'])
    assert.deepEqual(queued(sqlite), [{ object_key: 'photo-b', agency_id: 'agency-b' }])
    await retryImageCleanup({ database, agencyId: 'agency-a', bucket: { async delete() {
      assert.fail('another Agency queue must not be retried')
    } } })
  }
  finally { sqlite.close() }
})

test('Floor plan replacement retains Published status and queued keys through cleanup failure', async () => {
  const { sqlite, database } = databaseFixture()
  try {
    sqlite.exec('UPDATE properties SET status=\'published\' WHERE id=\'property-a\'')
    const statements = [
      queueFloorPlanDeletion(database, 'property-a', 'agency-a'),
      database.prepare('DELETE FROM property_images WHERE property_id=\'property-a\' AND kind=\'floor_plan\''),
      database.prepare('INSERT INTO property_images VALUES (\'new-plan\',\'property-a\',\'new-plan\',\'floor_plan\',0,0,\'新格局圖\',\'2026-10-10\')'),
    ]
    await database.batch(statements)
    assert.equal(sqlite.prepare('SELECT status FROM properties WHERE id=\'property-a\'').get().status, 'published')
    assert.deepEqual(queued(sqlite), [{ object_key: 'plan-a', agency_id: 'agency-a' }])
    assert.equal((await retryImageCleanup({ database, agencyId: 'agency-a', bucket: { async delete() {
      throw new Error('R2 unavailable')
    } } })).cleanupPending, true)
    assert.equal(sqlite.prepare('SELECT id FROM property_images WHERE kind=\'floor_plan\'').get().id, 'new-plan')
    assert.equal(queued(sqlite).length, 1)
  }
  finally { sqlite.close() }
})

test('failed D1 batches roll back cleanup keys and retain compensation for failed uploads', async () => {
  const { sqlite, database } = databaseFixture()
  try {
    const failing = [...imageDeletionStatements(database, 'property-a', 'agency-a', 'photo-a'), database.prepare('INSERT INTO pending_image_deletions VALUES (NULL, NULL, NULL)')]
    await assert.rejects(database.batch(failing))
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM property_images WHERE id=\'photo-a\'').get().n, 1)
    assert.deepEqual(queued(sqlite), [])
    await queueUploadCompensation(database, 'agency-a', 'uncommitted-upload')
    assert.equal((await retryImageCleanup({ database, agencyId: 'agency-a', bucket: { async delete() {
      throw new Error('R2 unavailable')
    } } })).cleanupPending, true)
    assert.deepEqual(queued(sqlite), [{ object_key: 'uncommitted-upload', agency_id: 'agency-a' }])
    await retryImageCleanup({ database, agencyId: 'agency-a', bucket: { async delete(keys) {
      assert.deepEqual(keys, ['uncommitted-upload'])
    } } })
    assert.deepEqual(queued(sqlite), [])
  }
  finally { sqlite.close() }
})

const recovery = { objectKey: 'abcdefghijklmnopqrstuvwx', token: 'a'.repeat(64) }
function queueWriteFailure(sqlite) {
  return sqlite.exec(`CREATE TRIGGER fail_compensation_queue BEFORE INSERT ON pending_image_deletions
  BEGIN SELECT RAISE(FAIL, 'D1 queue writes unavailable'); END`)
}

function recoveryBucket() {
  const objects = new Map([[recovery.objectKey, { customMetadata: { agencyId: 'agency-a', uploadRecoveryToken: recovery.token } }]])
  const deleted = []
  const bucket = {
    async head(key) { return objects.get(key) ?? null },
    async delete(key) {
      deleted.push(key)
      objects.delete(key)
    },
  }
  return { objects, deleted, bucket }
}

test('an acknowledged compensation queue keeps normal retries and does not expose recovery credentials', async () => {
  const { sqlite, database } = databaseFixture()
  try {
    const result = await compensateFailedUpload({ database, agencyId: 'agency-a', recovery, bucket: { async delete() {
      throw new Error('R2 unavailable')
    } } })
    assert.deepEqual(result, { cleanupStatus: 'queued', cleanupQueued: true, cleanupPending: true })
    assert.deepEqual(queued(sqlite), [{ object_key: recovery.objectKey, agency_id: 'agency-a' }])
    assert.equal('recovery' in result, false)
  }
  finally { sqlite.close() }
})

test('queue-write failure still directly removes the failed upload when R2 is healthy', async () => {
  const { sqlite, database } = databaseFixture()
  const { bucket, objects, deleted } = recoveryBucket()
  try {
    queueWriteFailure(sqlite)
    const result = await compensateFailedUpload({ database, bucket, agencyId: 'agency-a', recovery })
    assert.deepEqual(result, { cleanupStatus: 'removed', cleanupQueued: false, cleanupPending: false })
    assert.deepEqual(deleted, [recovery.objectKey])
    assert.equal(objects.has(recovery.objectKey), false)
    assert.deepEqual(queued(sqlite), [])
    assert.equal('recovery' in result, false)
  }
  finally { sqlite.close() }
})

test('queue and R2 failure return an unqueued owned recovery key for authorized later deletion', async () => {
  const { sqlite, database } = databaseFixture()
  const { bucket, objects, deleted } = recoveryBucket()
  try {
    queueWriteFailure(sqlite)
    let attempts = 0
    const result = await compensateFailedUpload({ database, agencyId: 'agency-a', recovery, bucket: { async delete(key) {
      attempts++
      assert.equal(key, recovery.objectKey)
      throw new Error('R2 unavailable')
    } } })
    assert.deepEqual(result, { cleanupStatus: 'recovery_required', cleanupQueued: false, cleanupPending: true, recovery })
    assert.equal(attempts, 1)
    assert.deepEqual(queued(sqlite), [])
    assert.equal(objects.get(recovery.objectKey).customMetadata.agencyId, 'agency-a')
    assert.equal(objects.get(recovery.objectKey).customMetadata.uploadRecoveryToken, result.recovery.token)
    await recoverFailedUpload({ database, bucket, agencyId: 'agency-a', recovery: result.recovery })
    assert.deepEqual(deleted, [recovery.objectKey])
    assert.equal(objects.has(recovery.objectKey), false)
  }
  finally { sqlite.close() }
})

test('specific recovery denies the wrong Agency and tampered token or key', async () => {
  const { sqlite, database } = databaseFixture()
  const { bucket, objects, deleted } = recoveryBucket()
  const otherKey = 'zyxwvutsrqponmlkjihgfedc'
  objects.set(otherKey, { customMetadata: { agencyId: 'agency-a', uploadRecoveryToken: 'b'.repeat(64) } })
  try {
    for (const input of [
      { agencyId: 'agency-b', recovery },
      { agencyId: 'agency-a', recovery: { ...recovery, token: 'b'.repeat(64) } },
      { agencyId: 'agency-a', recovery: { ...recovery, objectKey: otherKey } },
    ])
      await assert.rejects(recoverFailedUpload({ database, bucket, ...input }), { statusCode: 404 })
    assert.deepEqual(deleted, [])
    assert.equal(objects.size, 2)
  }
  finally { sqlite.close() }
})

test('recovery never deletes a linked key, including a link made during its R2 lookup', async () => {
  for (const linkDuringHead of [false, true]) {
    const { sqlite, database } = databaseFixture()
    const { bucket, objects, deleted } = recoveryBucket()
    const link = () => sqlite.prepare('UPDATE property_images SET object_key=? WHERE id=\'photo-a\'').run(recovery.objectKey)
    try {
      if (!linkDuringHead)
        link()
      const protectedBucket = { ...bucket, async head(key) {
        if (linkDuringHead)
          link()
        return bucket.head(key)
      } }
      await assert.rejects(recoverFailedUpload({ database, bucket: protectedBucket, agencyId: 'agency-a', recovery }), { statusCode: 409 })
      assert.deepEqual(deleted, [])
      assert.equal(objects.has(recovery.objectKey), true)
      queueWriteFailure(sqlite)
      assert.deepEqual(await compensateFailedUpload({ database, bucket, agencyId: 'agency-a', recovery }), { cleanupStatus: 'linked', cleanupQueued: false, cleanupPending: false })
      assert.deepEqual(deleted, [])
    }
    finally { sqlite.close() }
  }
})

test('unavailable D1 reads prevent unsafe deletion and unavailable R2 never reports recovery success', async () => {
  const { sqlite, database } = databaseFixture()
  const { bucket, deleted } = recoveryBucket()
  const unavailable = {
    prepare() { throw new Error('D1 unavailable') },
  }
  try {
    assert.deepEqual(await compensateFailedUpload({ database: unavailable, bucket, agencyId: 'agency-a', recovery }), { cleanupStatus: 'recovery_required', cleanupQueued: false, cleanupPending: true, recovery })
    await assert.rejects(recoverFailedUpload({ database: unavailable, bucket, agencyId: 'agency-a', recovery }), /D1 unavailable/)
    await assert.rejects(recoverFailedUpload({ database, bucket: {
      ...bucket,
      async delete() { throw new Error('R2 unavailable') },
    }, agencyId: 'agency-a', recovery }), /R2 unavailable/)
    await assert.rejects(recoverFailedUpload({ database, bucket: {
      ...bucket,
      async head() { throw new Error('R2 unavailable') },
    }, agencyId: 'agency-a', recovery }), /R2 unavailable/)
    await assert.rejects(recoverFailedUpload({ database, bucket: {
      ...bucket,
      async head() { return null },
    }, agencyId: 'agency-a', recovery }), { statusCode: 404 })
    assert.deepEqual(deleted, [])
  }
  finally { sqlite.close() }
})

test('recovery credentials are bounded and ownership metadata stays private on success', () => {
  const token = createUploadRecoveryToken()
  assert.match(token, /^[a-f0-9]{64}$/)
  assert.notEqual(token, createUploadRecoveryToken())
  const { safeParse } = createRequire(import.meta.url)('valibot')
  assert.equal(safeParse(adminImageRecoverySchema, { ...recovery, token }).success, true)
  assert.equal(safeParse(adminImageRecoverySchema, { ...recovery, token: '../invalid' }).success, false)
  assert.equal(safeParse(adminImageRecoverySchema, { ...recovery, objectKey: '../invalid' }).success, false)
  assert.equal(safeParse(adminImageRecoveryErrorSchema, { data: { data: { cleanupQueued: false, recovery } } }).success, true)
  assert.equal(safeParse(adminImageRecoveryErrorSchema, { data: { data: { cleanupQueued: true, recovery } } }).success, false)
  const route = read('../server/api/admin/properties/[id]/images.post.ts')
  assert.match(route, /customMetadata: \{ agencyId: user.id, uploadRecoveryToken: recovery.token \}/)
  assert.match(route, /return \{ id: imageId, kind: upload.kind, \.\.\.await cleanupForAgency\(event, user.id\) \}/)
  assert.match(route, /setResponseStatus\(event, statusCode\)/)
  assert.match(route, /return \{ statusCode, statusMessage, data: cleanup \}/)
  assert.match(read('../server/api/admin/media-recovery.post.ts'), /requireAgencySession\(event\)/)
  assert.doesNotMatch(read('../server/api/property-images/[objectKey].get.ts'), /customMetadata|uploadRecoveryToken/)
  assert.doesNotMatch(read('../server/utils/property-upload-recovery.ts'), /bucket\.list\(/)
})

test('cleanup retains keys when queue removal fails and never deletes referenced media', async () => {
  const { sqlite, database } = databaseFixture()
  try {
    await queueUploadCompensation(database, 'agency-a', 'cleanup-after-r2')
    await queueUploadCompensation(database, 'agency-a', 'photo-a')
    sqlite.exec(`CREATE TRIGGER fail_queue_removal BEFORE DELETE ON pending_image_deletions
      WHEN OLD.object_key = 'cleanup-after-r2' BEGIN SELECT RAISE(FAIL, 'queue removal failure'); END`)
    const deleted = []
    const bucket = { async delete(keys) {
      deleted.push(...keys)
    } }
    assert.equal((await retryImageCleanup({ database, agencyId: 'agency-a', bucket })).cleanupPending, true)
    assert.deepEqual(deleted, ['cleanup-after-r2'])
    assert.equal(queued(sqlite).length, 1)
    sqlite.exec('DROP TRIGGER fail_queue_removal')
    assert.equal((await retryImageCleanup({ database, agencyId: 'agency-a', bucket })).cleanupPending, false)
    assert.deepEqual(deleted, ['cleanup-after-r2', 'cleanup-after-r2'])
    assert.deepEqual(queued(sqlite), [])
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM property_images WHERE id=\'photo-a\'').get().n, 1)
  }
  finally {
    sqlite.close()
  }
})

test('linked compensation is canceled only for its Agency and later deletion enqueues fresh cleanup', async () => {
  const { sqlite, database } = databaseFixture()
  const bytes = new Set(['photo-a', 'photo-b'])
  const deleted = []
  const bucket = { async delete(keys) {
    deleted.push(...keys)
    for (const key of keys)
      bytes.delete(key)
  } }
  try {
    await queueUploadCompensation(database, 'agency-a', 'photo-a')
    await queueUploadCompensation(database, 'agency-b', 'photo-b')
    assert.deepEqual(await retryImageCleanup({ database, agencyId: 'agency-a', bucket }), { cleanupPending: false })
    assert.deepEqual(queued(sqlite), [{ object_key: 'photo-b', agency_id: 'agency-b' }])
    assert.deepEqual(deleted, [])
    assert.equal(bytes.has('photo-a'), true)
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM property_images WHERE id=\'photo-a\'').get().n, 1)
    await database.batch(imageDeletionStatements(database, 'property-a', 'agency-a', 'photo-a'))
    assert.deepEqual(queued(sqlite), [{ object_key: 'photo-a', agency_id: 'agency-a' }, { object_key: 'photo-b', agency_id: 'agency-b' }])
    assert.deepEqual(await retryImageCleanup({ database, agencyId: 'agency-a', bucket }), { cleanupPending: false })
    assert.deepEqual(deleted, ['photo-a'])
    assert.equal(bytes.has('photo-a'), false)
    assert.equal(bytes.has('photo-b'), true)
    assert.deepEqual(queued(sqlite), [{ object_key: 'photo-b', agency_id: 'agency-b' }])
  }
  finally { sqlite.close() }
})

test('current-reference cancellation retains work when metadata deletion occurs first', async () => {
  const { sqlite, database } = databaseFixture()
  try {
    await queueUploadCompensation(database, 'agency-a', 'photo-a')
    const previous = sqlite.prepare('SELECT object_key FROM property_images WHERE id=\'photo-a\'').get()
    assert.equal(previous.object_key, 'photo-a')
    await database.batch(imageDeletionStatements(database, 'property-a', 'agency-a', 'photo-a'))
    let attempts = 0
    assert.deepEqual(await retryImageCleanup({ database, agencyId: 'agency-a', bucket: { async delete(keys) {
      attempts++
      assert.deepEqual(keys, ['photo-a'])
      throw new Error('R2 unavailable')
    } } }), { cleanupPending: true })
    assert.equal(attempts, 1)
    assert.deepEqual(queued(sqlite), [{ object_key: 'photo-a', agency_id: 'agency-a' }])
    assert.deepEqual(await retryImageCleanup({ database, agencyId: 'agency-a', bucket: { async delete(keys) {
      assert.deepEqual(keys, ['photo-a'])
    } } }), { cleanupPending: false })
    assert.deepEqual(queued(sqlite), [])
  }
  finally { sqlite.close() }
})

test('permanent deletion preserves cleanup keys without a Property foreign key', async () => {
  const { sqlite, database } = databaseFixture()
  try {
    const foreign = await database.batch(propertyDeletionStatements(database, 'property-b', 'agency-a'))
    assert.equal(foreign[2].meta.changes, 0)
    assert.deepEqual(queued(sqlite), [])
    const result = await database.batch(propertyDeletionStatements(database, 'property-a', 'agency-a'))
    assert.equal(result[2].meta.changes, 1)
    assert.deepEqual(queued(sqlite), [{ object_key: 'photo-a', agency_id: 'agency-a' }, { object_key: 'plan-a', agency_id: 'agency-a' }])
    assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), [])
    assert.equal((await retryImageCleanup({ database, agencyId: 'agency-a', bucket: { async delete() {
      throw new Error('R2 unavailable')
    } } })).cleanupPending, true)
    assert.equal(queued(sqlite).length, 2)
  }
  finally { sqlite.close() }
})

test('stale Floor plan captions conflict inside the batch, including Floor-plan-only drafts', async () => {
  for (const removePhoto of [false, true]) {
    const { sqlite, database } = databaseFixture()
    try {
      if (removePhoto)
        sqlite.exec('DELETE FROM property_images WHERE id=\'photo-a\'')
      const input = { photos: removePhoto ? [] : [{ id: 'photo-a', altZhTw: '不可儲存的新照片說明' }], coverImageId: removePhoto ? null : 'photo-a', floorPlanId: 'plan-a', floorPlanAltZhTw: '不可儲存的過期格局圖說明' }
      const statements = imageSettingsStatements({ database, propertyId: 'property-a', input })
      sqlite.exec('DELETE FROM property_images WHERE id=\'plan-a\'; INSERT INTO property_images VALUES (\'new-plan\',\'property-a\',\'new-plan\',\'floor_plan\',0,0,\'新格局圖\',\'2026-10-10\')')
      await assert.rejects(database.batch(statements), /NOT NULL/)
      assert.equal(sqlite.prepare('SELECT alt_zh_tw FROM property_images WHERE id=\'new-plan\'').get().alt_zh_tw, '新格局圖')
      if (!removePhoto)
        assert.equal(sqlite.prepare('SELECT alt_zh_tw FROM property_images WHERE id=\'photo-a\'').get().alt_zh_tw, '示範照片')
      assert.equal(sqlite.prepare('SELECT title_zh_tw FROM properties WHERE id=\'property-a\'').get().title_zh_tw, '示範甲')
    }
    finally { sqlite.close() }
  }
})

test('settings reject a deleted Property at the batch boundary instead of accepting no-op writes', async () => {
  const { sqlite, database } = databaseFixture()
  try {
    const input = { photos: [{ id: 'photo-a', altZhTw: '不得回報成功的說明' }], coverImageId: 'photo-a', floorPlanId: 'plan-a', floorPlanAltZhTw: '不得回報成功的格局圖說明' }
    const boundaryDatabase = { ...database, async batch(statements) {
      await database.batch(propertyDeletionStatements(database, 'property-a', 'agency-a'))
      return database.batch(statements)
    } }
    await assert.rejects(saveImageSettings({ database: boundaryDatabase, propertyId: 'property-a', input }), { statusCode: 409 })
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM properties WHERE id=\'property-a\'').get().n, 0)
    assert.equal(sqlite.prepare('SELECT alt_zh_tw FROM property_images WHERE id=\'photo-b\'').get().alt_zh_tw, '示範照片')
    assert.deepEqual(queued(sqlite), [{ object_key: 'photo-a', agency_id: 'agency-a' }, { object_key: 'plan-a', agency_id: 'agency-a' }])
    assert.match(read('../server/api/admin/properties/[id]/images.patch.ts'), /await saveImageSettings\(/)
  }
  finally { sqlite.close() }
})

test('photo settings use collision-free temporary positions for sparse, high and dense collections', async () => {
  for (const positions of [[0, 1000], [1, 1001], [2, 3], [2, 5], [0, 9223372036854775807n], Array.from({ length: 20 }, (_, index) => index), Array.from({ length: 20 }, (_, index) => index + 20)]) {
    const { sqlite, database } = databaseFixture()
    try {
      sqlite.prepare('UPDATE property_images SET position=? WHERE id=\'photo-a\'').run(positions[0])
      const ids = ['photo-a']
      for (let index = 1; index < positions.length; index++) {
        const id = `extra-photo-${index}`
        ids.push(id)
        sqlite.prepare('INSERT INTO property_images VALUES (?,\'property-a\',?,\'photo\',?,0,\'原說明\',\'2026-10-10\')').run(id, id, positions[index])
      }
      const input = { photos: ids.toReversed().map(id => ({ id, altZhTw: `新說明 ${id}` })), coverImageId: ids.at(-1), floorPlanId: 'plan-a', floorPlanAltZhTw: '新格局圖說明' }
      await database.batch(imageSettingsStatements({ database, propertyId: 'property-a', input }))
      const photos = sqlite.prepare('SELECT id,position,alt_zh_tw,is_cover FROM property_images WHERE property_id=\'property-a\' AND kind=\'photo\' ORDER BY position').all()
      assert.deepEqual(photos.map(photo => photo.id), ids.toReversed())
      assert.deepEqual(photos.map(photo => photo.position), ids.map((_, index) => index))
      assert.deepEqual(photos.map(photo => photo.alt_zh_tw), input.photos.map(photo => photo.altZhTw))
      assert.deepEqual(photos.map(photo => photo.is_cover), ids.map((_, index) => index === 0 ? 1 : 0))
      assert.equal(sqlite.prepare('SELECT alt_zh_tw FROM property_images WHERE id=\'plan-a\'').get().alt_zh_tw, input.floorPlanAltZhTw)
      assert.equal(sqlite.prepare('SELECT object_key FROM property_images WHERE id=\'photo-b\'').get().object_key, 'photo-b')
    }
    finally { sqlite.close() }
  }
})

test('fractional area controls use step=any and media inputs stay disabled through refresh', () => {
  const form = read('../app/components/AdminPropertyForm.vue')
  for (const field of ['floorAreaSqm', 'landAreaSqm', 'buildingAreaSqm'])
    assert.match(form, new RegExp(`<UInput[^>]*v-model="${field}"[^>]*step="any"`))
  assert.match(form, /:refresh-images="reloadImages"/)
  assert.doesNotMatch(form, /@refresh="reloadImages"/)
  for (const action of ['submit(\'published\')', 'submit(\'withdrawn\')', 'deleteOpen = true']) {
    const button = form.slice(form.lastIndexOf('<UButton', form.indexOf(action)), form.indexOf(action))
    assert.match(button, /saving \|\| mediaBusy/)
  }
  const media = read('../app/components/AdminPropertyImages.vue')
  for (const field of ['uploadAlt', 'image.altZhTw', 'floorPlan.altZhTw'])
    assert.match(media, new RegExp(`<UInput[^>]*v-model="${field.replaceAll('.', '\\.')}"[^>]*:disabled="busy \\|\\| disabled"`))
})

test('the real media component awaits parent refresh before clearing busy or accepting another action', async () => {
  const { parse, compileScript } = createRequire(import.meta.resolve('vue'))('@vue/compiler-sfc')
  const { descriptor } = parse(read('../app/components/AdminPropertyImages.vue'))
  const script = compileScript(descriptor, { id: 'agency-refresh-regression' }).content
  const vueUrl = import.meta.resolve('vue')
  const source = `import { ref, watch, nextTick, onScopeDispose } from '${vueUrl}';\n${script.replaceAll('from \'vue\'', `from '${vueUrl}'`).replaceAll('from \'valibot\'', `from '${import.meta.resolve('valibot')}'`).replaceAll('from \'#shared/admin-property\'', `from '${import.meta.resolve('../shared/admin-property.ts')}'`)}\n`
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  const { default: component } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
  let resolveRefresh
  const refresh = new Promise(resolve => resolveRefresh = resolve)
  let enteredRefresh
  const entered = new Promise(resolve => enteredRefresh = resolve)
  const props = reactive({ propertyId: 'property-a', images: [{ id: 'photo-a', kind: 'photo', position: 0, altZhTw: '原說明', isCover: true }], disabled: false, async refreshImages() {
    enteredRefresh()
    await refresh
    props.images = [{ ...props.images[0], altZhTw: '重新載入的說明' }]
    await nextTick()
  } })
  const events = []
  const sessionUser = ref({ id: 'agency-a', role: 'agency' })
  globalThis.useUserSession = () => ({ user: sessionUser })
  const scope = effectScope()
  const state = scope.run(() => component.setup(props, { expose() {}, emit(...event) {
    events.push(event)
  } }))
  let actions = 0
  const operation = state.run(async () => {
    actions++
    return { cleanupPending: false }
  }, '照片已儲存。')
  await entered
  assert.equal(state.busy.value, true)
  await state.run(async () => {
    actions++
    return { cleanupPending: false }
  }, '不可執行的並行動作')
  assert.equal(actions, 1)
  assert.deepEqual(events, [['busy', true]])
  resolveRefresh()
  await operation
  assert.equal(state.busy.value, false)
  assert.equal(state.photos.value[0].altZhTw, '重新載入的說明')
  state.photos.value[0].altZhTw = '重新載入後的新編輯'
  await nextTick()
  assert.equal(state.photos.value[0].altZhTw, '重新載入後的新編輯')
  assert.deepEqual(events, [['busy', true], ['busy', false]])
  const failed = item => state.run(async () => {
    throw Object.assign(new Error('未排入佇列'), { data: { statusMessage: '未排入佇列', data: { cleanupQueued: false, recovery: item } } })
  }, '不可成功')
  await failed(recovery)
  await failed({ ...recovery, objectKey: 'zyxwvutsrqponmlkjihgfedc' })
  await failed(recovery)
  assert.equal(state.recoveries.value.length, 2)
  assert.deepEqual(state.recoveries.value[0], recovery)
  assert.equal(state.success.value, '')
  assert.equal(state.error.value, '未排入佇列')
  scope.stop()
  assert.deepEqual(state.recoveries.value, [])

  for (const mode of ['agency-switch', 'buyer-switch', 'logout-login', 'view-disposal']) {
    for (const outcome of ['success', 'failure']) {
      const user = ref({ id: 'agency-a', role: 'agency' })
      globalThis.useUserSession = () => ({ user })
      const operationScope = effectScope()
      let refreshes = 0
      const state = operationScope.run(() => component.setup(reactive({
        ...props,
        async refreshImages() { refreshes++ },
      }), { expose() {}, emit() {} }))
      state.recoveries.value = [recovery]
      let finish
      const pending = state.run(() => new Promise((resolve, reject) => {
        finish = outcome === 'success' ? () => resolve({ cleanupPending: false }) : () => reject(Object.assign(new Error('私密錯誤'), { data: { statusMessage: '私密錯誤', data: { cleanupQueued: false, recovery } } }))
      }), '不可顯示的舊成功訊息')
      assert.equal(state.busy.value, true)
      if (mode === 'agency-switch') {
        user.value = { id: 'agency-b', role: 'agency' }
      }
      else if (mode === 'buyer-switch') {
        user.value = { id: 'buyer-a', role: 'buyer' }
      }
      else if (mode === 'logout-login') {
        user.value = undefined
        user.value = { id: 'agency-a', role: 'agency' }
      }
      else {
        operationScope.stop()
      }
      assert.deepEqual(state.recoveries.value, [])
      finish()
      await pending
      assert.deepEqual(state.recoveries.value, [])
      assert.equal(state.error.value, '')
      assert.equal(state.success.value, '')
      assert.equal(refreshes, 0)
      await state.run(async () => {
        assert.fail('an old view must not start a new operation')
      }, '不可執行')
      operationScope.stop()
    }
  }
})
