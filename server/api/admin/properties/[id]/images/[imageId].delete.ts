import { and, eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { useDatabase } from '../../../../../database/client'
import { properties, propertyImages } from '../../../../../database/schema'
import { useImagesBucket } from '../../../../../utils/storage'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')
  const imageId = getRouterParam(event, 'imageId')
  if (!id || !imageId)
    throw createError({ statusCode: 400, statusMessage: '缺少圖片識別碼。' })

  const database = useDatabase(event)
  const [property] = await database.select({ id: properties.id }).from(properties).where(and(eq(properties.id, id), eq(properties.agencyId, user.id))).limit(1)
  if (!property)
    throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })

  const [image] = await database.select().from(propertyImages).where(and(eq(propertyImages.id, imageId), eq(propertyImages.propertyId, id))).limit(1)
  if (!image)
    throw createError({ statusCode: 404, statusMessage: '找不到此圖片。' })

  const bucket = useImagesBucket(event)
  await database.delete(propertyImages).where(eq(propertyImages.id, imageId))
  await bucket.delete(image.objectKey)

  return { ok: true }
})
