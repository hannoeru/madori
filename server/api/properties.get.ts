import type { PropertySummary } from '../../shared/property'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { useDatabase } from '../database/client'
import { properties, propertyImages } from '../database/schema'

export default defineEventHandler(async (event): Promise<PropertySummary[]> => {
  const database = useDatabase(event)
  const rows = await database.select().from(properties).where(eq(properties.status, 'published')).orderBy(desc(properties.publishedAt))
  const ids = rows.map(row => row.id)
  const covers = ids.length
    ? await database.select({ id: propertyImages.id, propertyId: propertyImages.propertyId }).from(propertyImages).where(and(inArray(propertyImages.propertyId, ids), eq(propertyImages.isCover, true)))
    : []
  const coverByProperty = new Map(covers.map(cover => [cover.propertyId, cover.id]))

  return rows.map(row => ({
    id: row.id,
    propertyType: row.propertyType,
    titleZhTw: row.titleZhTw,
    priceYen: row.priceYen,
    ward: row.ward,
    layout: row.layout,
    floorAreaSqm: row.floorAreaSqm,
    landAreaSqm: row.landAreaSqm,
    buildingAreaSqm: row.buildingAreaSqm,
    builtOn: row.builtOn,
    transit: row.transit,
    publishedAt: row.publishedAt,
    coverImageId: coverByProperty.get(row.id) ?? null,
  }))
})
