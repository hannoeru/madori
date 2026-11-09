import type { PropertyDetail } from '../../../shared/property'
import { and, asc, eq } from 'drizzle-orm'
import { useDatabase } from '../../database/client'
import { properties, propertyImages } from '../../database/schema'

export default defineEventHandler(async (event): Promise<PropertyDetail> => {
  const database = useDatabase(event)
  const [property] = await database.select().from(properties).where(and(eq(properties.id, getRouterParam(event, 'id') ?? ''), eq(properties.status, 'published'))).limit(1)
  if (!property)
    throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })

  const images = await database.select({ id: propertyImages.id, kind: propertyImages.kind, isCover: propertyImages.isCover }).from(propertyImages).where(eq(propertyImages.propertyId, property.id)).orderBy(asc(propertyImages.position))
  const { status: _status, publishedAt: _publishedAt, createdAt: _createdAt, ...publicFields } = property
  return { ...publicFields, images }
})
