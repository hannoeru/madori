import { ownedProperty } from '../../../utils/admin-property'
import { cleanupForAgency, propertyDeletionStatements } from '../../../utils/property-media-cleanup'

export default defineEventHandler(async (event) => {
  const { property, user } = await ownedProperty(event)
  if (property.status !== 'withdrawn')
    throw createError({ statusCode: 409, statusMessage: '永久刪除前請先撤下物件。' })
  const db = event.context.cloudflare?.env.DB
  if (!db)
    throw createError({ statusCode: 500, statusMessage: '資料庫不可用。' })
  const results = await db.batch(propertyDeletionStatements(db, property.id, user.id))
  if (!results[2]?.meta.changes)
    throw createError({ statusCode: 409, statusMessage: '物件狀態已變更，請重新載入。' })
  return { ok: true, ...await cleanupForAgency(event, user.id) }
})
