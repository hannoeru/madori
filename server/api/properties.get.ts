import type { PropertySummary } from '../../shared/property'
import { and, asc, eq, exists, gte, inArray, lte } from 'drizzle-orm'
import { getQuery } from 'h3'
import * as v from 'valibot'
import { propertyQuerySchema } from '../../shared/property'
import { useDatabase } from '../database/client'
import { properties, propertyImages, propertyTransitEntries } from '../database/schema'

export default defineEventHandler(async (event): Promise<PropertySummary[]> => {
  const parsedQuery = v.safeParse(propertyQuerySchema, getQuery(event))
  if (!parsedQuery.success)
    throw createError({ statusCode: 400, statusMessage: '搜尋條件無效。' })

  const query = parsedQuery.output
  const database = useDatabase(event)
  const transitFilter = query.station || query.maxWalkingMinutes !== undefined
    ? exists(database.select({ id: propertyTransitEntries.id }).from(propertyTransitEntries).where(and(
        eq(propertyTransitEntries.propertyId, properties.id),
        query.station ? eq(propertyTransitEntries.stationNameZhTw, query.station) : undefined,
        query.maxWalkingMinutes === undefined ? undefined : lte(propertyTransitEntries.walkingMinutes, query.maxWalkingMinutes),
      )))
    : undefined
  const propertyRows = await database.select().from(properties).where(and(
    eq(properties.status, 'published'),
    query.ward ? eq(properties.ward, query.ward) : undefined,
    query.propertyType ? eq(properties.propertyType, query.propertyType) : undefined,
    query.buildStatus ? eq(properties.buildStatus, query.buildStatus) : undefined,
    query.layout ? eq(properties.layout, query.layout) : undefined,
    query.minPrice === undefined ? undefined : gte(properties.priceYen, query.minPrice),
    query.maxPrice === undefined ? undefined : lte(properties.priceYen, query.maxPrice),
    query.minFloorArea === undefined ? undefined : gte(properties.floorAreaSqm, query.minFloorArea),
    query.maxFloorArea === undefined ? undefined : lte(properties.floorAreaSqm, query.maxFloorArea),
    transitFilter,
  )).orderBy(asc(properties.priceYen))

  const ids = propertyRows.map(property => property.id)
  const images = ids.length ? await database.select().from(propertyImages).where(inArray(propertyImages.propertyId, ids)) : []
  const transitEntries = ids.length ? await database.select().from(propertyTransitEntries).where(inArray(propertyTransitEntries.propertyId, ids)) : []

  return propertyRows.map(property => ({
    id: property.id,
    titleZhTw: property.titleZhTw,
    priceYen: property.priceYen,
    ward: property.ward,
    layout: property.layout,
    floorAreaSqm: property.floorAreaSqm,
    landAreaSqm: property.landAreaSqm,
    buildingAreaSqm: property.buildingAreaSqm,
    builtOn: property.builtOn,
    propertyType: property.propertyType,
    images: images.filter(image => image.propertyId === property.id).map(image => ({ id: image.id, isCover: image.isCover })),
    transitEntries: transitEntries.filter(entry => entry.propertyId === property.id).map(entry => ({ id: entry.id, stationNameZhTw: entry.stationNameZhTw, walkingMinutes: entry.walkingMinutes })),
  }))
})
