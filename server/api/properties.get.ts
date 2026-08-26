import { asc, eq, inArray } from 'drizzle-orm'
import { getQuery } from 'h3'
import { useDatabase } from '../database/client'
import { properties, propertyImages, propertyTransitEntries } from '../database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const database = useDatabase(event)
  const rows = await database
    .select()
    .from(properties)
    .where(eq(properties.status, 'published'))
    .orderBy(asc(properties.priceYen))

  const filteredProperties = rows.filter((property) => {
    if (typeof query.ward === 'string' && property.ward !== query.ward)
      return false
    if (typeof query.propertyType === 'string' && property.propertyType !== query.propertyType)
      return false
    if (typeof query.buildStatus === 'string' && property.buildStatus !== query.buildStatus)
      return false
    if (typeof query.maxPrice === 'string' && property.priceYen > Number(query.maxPrice))
      return false
    return true
  })

  const ids = filteredProperties.map(property => property.id)
  const images = ids.length
    ? await database.select().from(propertyImages).where(inArray(propertyImages.propertyId, ids))
    : []
  const transitEntries = ids.length
    ? await database.select().from(propertyTransitEntries).where(inArray(propertyTransitEntries.propertyId, ids))
    : []

  return filteredProperties.map(property => ({
    ...property,
    images: images.filter(image => image.propertyId === property.id),
    transitEntries: transitEntries.filter(entry => entry.propertyId === property.id)
  }))
})
