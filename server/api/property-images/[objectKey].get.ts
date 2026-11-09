import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { useDatabase } from '../../database/client'
import { properties, propertyImages } from '../../database/schema'
import { useImagesBucket } from '../../utils/storage'

function imageNotFound(event: H3Event) {
  setResponseStatus(event, 404)
  return { statusCode: 404, statusMessage: '找不到圖片。' }
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  setResponseHeader(event, 'vary', 'Cookie')
  const objectKey = getRouterParam(event, 'objectKey')
  if (!objectKey || !/^[a-z0-9]{24}$/.test(objectKey))
    return imageNotFound(event)
  const [image] = await useDatabase(event).select({ agencyId: properties.agencyId, status: properties.status, objectKey: propertyImages.objectKey }).from(propertyImages).innerJoin(properties, eq(properties.id, propertyImages.propertyId)).where(eq(propertyImages.objectKey, objectKey)).limit(1)
  if (!image)
    return imageNotFound(event)
  if (image.status !== 'published') {
    const session = await getUserSession(event)
    if (session.user?.role !== 'agency' || session.user.id !== image.agencyId)
      return imageNotFound(event)
  }
  const object = await useImagesBucket(event).get(image.objectKey)
  if (!object || !['image/png', 'image/jpeg'].includes(object.httpMetadata?.contentType ?? ''))
    return imageNotFound(event)
  setResponseHeader(event, 'content-type', object.httpMetadata?.contentType ?? 'image/png')
  setResponseHeader(event, 'x-content-type-options', 'nosniff')
  setResponseHeader(event, 'content-disposition', 'inline')
  return object.body
})
