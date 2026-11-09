import { and, eq } from 'drizzle-orm'
import { propertyImages } from '../../../../../database/schema'
import { ownedProperty } from '../../../../../utils/admin-property'
import { cleanupForAgency, imageDeletionStatements } from '../../../../../utils/property-media-cleanup'

export default defineEventHandler(async (event) => {
  const { database, property, user } = await ownedProperty(event)
  const imageId = getRouterParam(event, 'imageId')
  if (!imageId)
    throw createError({ statusCode: 400, statusMessage: '缺少圖片識別碼。' })
  const [image] = await database.select().from(propertyImages).where(and(eq(propertyImages.id, imageId), eq(propertyImages.propertyId, property.id))).limit(1)
  if (!image)
    throw createError({ statusCode: 404, statusMessage: '找不到此圖片。' })
  const db = event.context.cloudflare?.env.DB
  if (!db)
    throw createError({ statusCode: 500, statusMessage: '資料庫不可用。' })
  const results = await db.batch(imageDeletionStatements(db, property.id, user.id, imageId))
  if (!results[1]?.meta.changes)
    throw createError({ statusCode: 409, statusMessage: '已發布物件須保留至少一張照片及一張格局圖。請先撤下，或直接上傳替換格局圖。' })
  return { ok: true, ...await cleanupForAgency(event, user.id) }
})
