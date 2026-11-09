import type { SavedProperties, SavedProperty } from '../../../shared/buyer'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import * as v from 'valibot'
import { propertySummarySchema } from '../../../shared/property'
import { useDatabase } from '../../database/client'
import { properties, propertyImages, propertyTransitEntries, savedProperties, stations } from '../../database/schema'

export default defineEventHandler(async (event): Promise<SavedProperties> => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { user } = await requireBuyerSession(event)
  const database = useDatabase(event)
  const savedQuery = database.select({
    propertyId: savedProperties.propertyId,
    createdAt: sql<string>`${savedProperties.createdAt}`.as('saved_created_at'),
    property: properties,
  }).from(savedProperties).leftJoin(properties, and(
    eq(savedProperties.propertyId, properties.id),
    eq(properties.status, 'published'),
  )).where(eq(savedProperties.buyerId, user.id)).orderBy(desc(savedProperties.createdAt), asc(savedProperties.propertyId))

  const imagesQuery = database.select({ image: propertyImages }).from(savedProperties).innerJoin(properties, and(eq(savedProperties.propertyId, properties.id), eq(properties.status, 'published'))).innerJoin(propertyImages, eq(propertyImages.propertyId, properties.id)).where(eq(savedProperties.buyerId, user.id)).orderBy(asc(propertyImages.kind), asc(propertyImages.position))
  const transitQuery = database.select({
    id: propertyTransitEntries.id,
    propertyId: propertyTransitEntries.propertyId,
    stationNameZhTw: stations.nameZhTw,
    walkingMinutes: propertyTransitEntries.walkingMinutes,
  }).from(savedProperties).innerJoin(properties, and(eq(savedProperties.propertyId, properties.id), eq(properties.status, 'published'))).innerJoin(propertyTransitEntries, eq(propertyTransitEntries.propertyId, properties.id)).innerJoin(stations, eq(propertyTransitEntries.stationId, stations.id)).where(eq(savedProperties.buyerId, user.id)).orderBy(asc(propertyTransitEntries.walkingMinutes), asc(propertyTransitEntries.id))
  const [rows, imageRows, transitEntries] = await database.batch([savedQuery, imagesQuery, transitQuery])
  const imagesByProperty = new Map<string, (typeof imageRows)[number]['image'][]>()
  for (const { image } of imageRows) {
    const images = imagesByProperty.get(image.propertyId)
    if (images)
      images.push(image)
    else
      imagesByProperty.set(image.propertyId, [image])
  }
  const transitByProperty = new Map<string, typeof transitEntries>()
  for (const entry of transitEntries) {
    const entries = transitByProperty.get(entry.propertyId)
    if (entries)
      entries.push(entry)
    else
      transitByProperty.set(entry.propertyId, [entry])
  }

  const items = rows.map((row): SavedProperty => row.property
    ? {
        kind: 'available',
        propertyId: row.propertyId,
        createdAt: row.createdAt,
        property: v.parse(propertySummarySchema, {
          ...row.property,
          images: imagesByProperty.get(row.propertyId) ?? [],
          transitEntries: transitByProperty.get(row.propertyId) ?? [],
        }),
      }
    : { kind: 'unavailable', propertyId: row.propertyId, createdAt: row.createdAt })
  return { items }
})
