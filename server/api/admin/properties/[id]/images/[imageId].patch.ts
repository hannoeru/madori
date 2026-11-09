import { and, eq, sql } from 'drizzle-orm'
import { propertyImages } from '../../../../../database/schema'
import { ownerProperty } from '../../../../../utils/admin-property'

export default defineEventHandler(async (event) => {
  const { database, property } = await ownerProperty(event)
  const imageId = getRouterParam(event, 'imageId') ?? ''
  const [photo] = await database.select({ id: propertyImages.id }).from(propertyImages).where(and(eq(propertyImages.id, imageId), eq(propertyImages.propertyId, property.id), eq(propertyImages.kind, 'photo'))).limit(1)
  if (!photo)
    throw createError({ statusCode: 404, statusMessage: '找不到此照片。' })
  await database.update(propertyImages).set({ isCover: sql`${propertyImages.id} = ${photo.id}` }).where(and(eq(propertyImages.propertyId, property.id), eq(propertyImages.kind, 'photo')))
  return { ok: true }
})
