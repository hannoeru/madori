import { eq } from 'drizzle-orm'
import { useDatabase } from '../../database/client'
import { properties, propertyImages } from '../../database/schema'
import { useImagesBucket } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const imageId = getRouterParam(event, 'objectKey') ?? ''
  const [image] = await useDatabase(event).select({ status: properties.status }).from(propertyImages).innerJoin(properties, eq(properties.id, propertyImages.propertyId)).where(eq(propertyImages.id, imageId)).limit(1)
  if (!image)
    throw createError({ statusCode: 404, statusMessage: '找不到圖片。' })

  const published = image.status === 'published'
  if (!published)
    await requireUserSession(event)

  const object = await useImagesBucket(event).get(imageId)
  if (!object)
    throw createError({ statusCode: 404, statusMessage: '找不到圖片。' })

  setResponseHeaders(event, {
    'cache-control': published ? 'public, max-age=3600' : 'no-store',
    'content-type': object.httpMetadata?.contentType ?? 'image/jpeg',
    'x-content-type-options': 'nosniff',
  })
  return object.body
})
