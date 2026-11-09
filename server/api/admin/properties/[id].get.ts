import type { AdminPropertyDetail } from '../../../../shared/property'
import { asc, eq } from 'drizzle-orm'
import { propertyImages } from '../../../database/schema'
import { ownerProperty } from '../../../utils/admin-property'

export default defineEventHandler(async (event): Promise<AdminPropertyDetail> => {
  const { database, property } = await ownerProperty(event)
  const images = await database.select({ id: propertyImages.id, kind: propertyImages.kind, isCover: propertyImages.isCover }).from(propertyImages).where(eq(propertyImages.propertyId, property.id)).orderBy(asc(propertyImages.position))
  return { ...property, images }
})
