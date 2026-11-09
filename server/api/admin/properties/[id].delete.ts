import { eq } from 'drizzle-orm'
import { properties, propertyImages } from '../../../database/schema'
import { ownerProperty } from '../../../utils/admin-property'
import { useImagesBucket } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  const { database, property } = await ownerProperty(event)
  const images = await database.select({ id: propertyImages.id }).from(propertyImages).where(eq(propertyImages.propertyId, property.id))
  await database.batch([
    database.delete(propertyImages).where(eq(propertyImages.propertyId, property.id)),
    database.delete(properties).where(eq(properties.id, property.id)),
  ])
  if (images.length)
    await useImagesBucket(event).delete(images.map(image => image.id))
  return { ok: true }
})
