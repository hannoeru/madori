import type { H3Event } from 'h3'
import { useImagesBucket } from './storage'

export function queueFloorPlanDeletion(database: D1Database, propertyId: string, agencyId: string) {
  return database.prepare(`INSERT INTO pending_image_deletions (object_key, agency_id, created_at)
    SELECT images.object_key, properties.agency_id, ? FROM property_images AS images
    JOIN properties ON properties.id = images.property_id
    WHERE images.property_id = ? AND images.kind = 'floor_plan' AND properties.agency_id = ?
    ON CONFLICT (object_key) DO NOTHING`).bind(new Date().toISOString(), propertyId, agencyId)
}

export function imageDeletionStatements(database: D1Database, propertyId: string, agencyId: string, imageId: string) {
  const deletable = `property_id = ? AND id = ? AND EXISTS (
    SELECT 1 FROM properties WHERE id = ? AND agency_id = ? AND (status != 'published' OR
    (property_images.kind = 'photo' AND (SELECT count(*) FROM property_images WHERE property_id = ? AND kind = 'photo') > 1)))`
  const args = [propertyId, imageId, propertyId, agencyId, propertyId]
  return [
    database.prepare(`INSERT INTO pending_image_deletions (object_key, agency_id, created_at)
      SELECT object_key, ?, ? FROM property_images WHERE ${deletable}
      ON CONFLICT (object_key) DO NOTHING`).bind(agencyId, new Date().toISOString(), ...args),
    database.prepare(`DELETE FROM property_images WHERE ${deletable}`).bind(...args),
    database.prepare(`UPDATE property_images SET is_cover = 1 WHERE property_id = ? AND kind = 'photo'
      AND id = (SELECT id FROM property_images WHERE property_id = ? AND kind = 'photo' ORDER BY position LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM property_images WHERE property_id = ? AND is_cover = 1)`).bind(propertyId, propertyId, propertyId),
  ]
}

export function propertyDeletionStatements(database: D1Database, propertyId: string, agencyId: string) {
  const withdrawn = `EXISTS (SELECT 1 FROM properties WHERE id = ? AND agency_id = ? AND status = 'withdrawn')`
  return [
    database.prepare(`INSERT INTO pending_image_deletions (object_key, agency_id, created_at)
      SELECT object_key, ?, ? FROM property_images WHERE property_id = ? AND ${withdrawn}
      ON CONFLICT (object_key) DO NOTHING`).bind(agencyId, new Date().toISOString(), propertyId, propertyId, agencyId),
    database.prepare(`DELETE FROM property_images WHERE property_id = ? AND ${withdrawn}`).bind(propertyId, propertyId, agencyId),
    database.prepare('DELETE FROM properties WHERE id = ? AND agency_id = ? AND status = \'withdrawn\'').bind(propertyId, agencyId),
  ]
}

export async function queueUploadCompensation(database: D1Database, agencyId: string, objectKey: string) {
  await database.prepare(`INSERT INTO pending_image_deletions (object_key, agency_id, created_at)
    VALUES (?, ?, ?) ON CONFLICT (object_key) DO NOTHING`).bind(objectKey, agencyId, new Date().toISOString()).run()
}

export async function cleanupForAgency(event: H3Event, agencyId: string): Promise<{ cleanupPending: boolean }> {
  try {
    const database = event.context.cloudflare?.env.DB
    if (!database)
      return { cleanupPending: true }
    return await retryImageCleanup({ database, agencyId, bucket: useImagesBucket(event) })
  }
  catch {
    return { cleanupPending: true }
  }
}

export async function retryImageCleanup({ database, agencyId, bucket }: {
  database: D1Database
  agencyId: string
  bucket: Pick<R2Bucket, 'delete'>
}): Promise<{ cleanupPending: boolean }> {
  try {
    await database.prepare(`DELETE FROM pending_image_deletions WHERE agency_id = ?
      AND EXISTS (SELECT 1 FROM property_images WHERE property_images.object_key = pending_image_deletions.object_key)`)
      .bind(agencyId)
      .run()
    const pending = await database.prepare(`SELECT object_key FROM pending_image_deletions
      WHERE agency_id = ? AND NOT EXISTS (SELECT 1 FROM property_images WHERE property_images.object_key = pending_image_deletions.object_key)
      ORDER BY created_at, object_key LIMIT 100`).bind(agencyId).all<{ object_key: string }>()
    const keys = pending.results.map(image => image.object_key)
    if (keys.length) {
      await bucket.delete(keys)
      await database.batch(keys.map(key => database.prepare('DELETE FROM pending_image_deletions WHERE agency_id = ? AND object_key = ?').bind(agencyId, key)))
    }
    const remaining = await database.prepare('SELECT object_key FROM pending_image_deletions WHERE agency_id = ? LIMIT 1').bind(agencyId).all()
    return { cleanupPending: remaining.results.length > 0 }
  }
  catch {
    return { cleanupPending: true }
  }
}
