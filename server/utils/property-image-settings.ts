import type { AdminImagesInput } from '../../shared/admin-property'

export function imageSettingsStatements({ database, propertyId, input }: {
  database: D1Database
  propertyId: string
  input: AdminImagesInput
}) {
  const statements = [
    database.prepare(`UPDATE properties SET title_zh_tw = CASE WHEN
      (SELECT count(*) FROM property_images WHERE property_id = ? AND kind = 'photo') = ?
      AND (SELECT count(*) FROM property_images WHERE property_id = ? AND kind = 'photo' AND id IN (${input.photos.map(() => '?').join(',') || 'NULL'})) = ?
      AND (? = 0 OR (SELECT count(*) FROM property_images WHERE property_id = ? AND kind = 'floor_plan' AND id = ?) = 1)
      THEN title_zh_tw ELSE NULL END WHERE id = ?`)
      .bind(propertyId, input.photos.length, propertyId, ...input.photos.map(photo => photo.id), input.photos.length, input.floorPlanAltZhTw ? 1 : 0, propertyId, input.floorPlanId ?? '', propertyId),
  ]
  if (input.photos.length) {
    statements.push(database.prepare(`WITH RECURSIVE candidates(position) AS (
      SELECT ? UNION ALL SELECT position + 1 FROM candidates WHERE position < ?
    ), temporary_positions AS MATERIALIZED (
      SELECT position, row_number() OVER (ORDER BY position) - 1 AS photo_index FROM candidates
      WHERE position NOT IN (SELECT position FROM property_images WHERE property_id = ? AND kind = 'photo')
    ) UPDATE property_images SET position = (
      SELECT position FROM temporary_positions WHERE photo_index = CASE property_images.id
      ${input.photos.map((_, index) => `WHEN ? THEN ${index}`).join(' ')} END
    ) WHERE property_id = ? AND kind = 'photo'`)
      .bind(input.photos.length, input.photos.length * 3 - 1, propertyId, ...input.photos.map(photo => photo.id), propertyId))
    statements.push(...input.photos.map((photo, position) => database.prepare('UPDATE property_images SET position = ?, alt_zh_tw = ?, is_cover = ? WHERE id = ? AND property_id = ? AND kind = \'photo\'').bind(position, photo.altZhTw, photo.id === input.coverImageId ? 1 : 0, photo.id, propertyId)))
  }
  if (input.floorPlanId && input.floorPlanAltZhTw)
    statements.push(database.prepare('UPDATE property_images SET alt_zh_tw = ? WHERE id = ? AND property_id = ?').bind(input.floorPlanAltZhTw, input.floorPlanId, propertyId))
  return statements
}

export async function saveImageSettings(input: Parameters<typeof imageSettingsStatements>[0]): Promise<void> {
  const results = await input.database.batch(imageSettingsStatements(input))
  if (!results[0]?.meta.changes)
    throw createError({ statusCode: 409, statusMessage: '物件已移除，請重新載入。' })
}
