import type { PropertySummary } from '../../shared/property'
import { and, asc, desc, eq, exists, gte, inArray, lte, sql } from 'drizzle-orm'
import { getQuery } from 'h3'
import * as v from 'valibot'
import { propertyQuerySchema } from '../../shared/property'
import { useDatabase } from '../database/client'
import { properties, propertyImages, propertyTransitEntries, stations } from '../database/schema'

const primaryArea = sql`coalesce(${properties.floorAreaSqm}, ${properties.landAreaSqm})`

export default defineEventHandler(async (event): Promise<PropertySummary[]> => {
  const parsedQuery = v.safeParse(propertyQuerySchema, getQuery(event))
  if (!parsedQuery.success)
    throw createError({ statusCode: 400, statusMessage: '搜尋條件無效。' })

  const query = parsedQuery.output
  const database = useDatabase(event)

  const transitFilter = query.stationId || query.lineId || query.maxWalkingMinutes !== undefined
    ? exists(database.select({ id: propertyTransitEntries.id }).from(propertyTransitEntries)
        .innerJoin(stations, eq(propertyTransitEntries.stationId, stations.id))
        .where(and(
          eq(propertyTransitEntries.propertyId, properties.id),
          query.stationId ? eq(propertyTransitEntries.stationId, query.stationId) : undefined,
          query.lineId ? eq(stations.lineId, query.lineId) : undefined,
          query.maxWalkingMinutes === undefined ? undefined : lte(propertyTransitEntries.walkingMinutes, query.maxWalkingMinutes),
        )))
    : undefined

  const orderBy = query.sort === 'price_asc'
    ? asc(properties.priceYen)
    : query.sort === 'price_desc'
      ? desc(properties.priceYen)
      : query.sort === 'area_desc'
        ? desc(primaryArea)
        : desc(properties.publishedAt)

  const propertyRows = await database.select().from(properties).where(and(
    eq(properties.status, 'published'),
    query.ward ? eq(properties.ward, query.ward) : undefined,
    query.propertyType ? eq(properties.propertyType, query.propertyType) : undefined,
    query.buildStatus ? eq(properties.buildStatus, query.buildStatus) : undefined,
    query.layout ? eq(properties.layout, query.layout) : undefined,
    query.minPrice === undefined ? undefined : gte(properties.priceYen, query.minPrice),
    query.maxPrice === undefined ? undefined : lte(properties.priceYen, query.maxPrice),
    query.minFloorArea === undefined ? undefined : sql`${primaryArea} >= ${query.minFloorArea}`,
    query.maxFloorArea === undefined ? undefined : sql`${primaryArea} <= ${query.maxFloorArea}`,
    query.maxAgeYears === undefined ? undefined : gte(properties.builtOn, `${new Date().getFullYear() - query.maxAgeYears}-01`),
    transitFilter,
  )).orderBy(orderBy)

  const ids = propertyRows.map(property => property.id)
  const images = ids.length ? await database.select().from(propertyImages).where(inArray(propertyImages.propertyId, ids)) : []
  const transitEntries = ids.length
    ? await database.select({
        id: propertyTransitEntries.id,
        propertyId: propertyTransitEntries.propertyId,
        stationNameZhTw: stations.nameZhTw,
        walkingMinutes: propertyTransitEntries.walkingMinutes,
      }).from(propertyTransitEntries).innerJoin(stations, eq(propertyTransitEntries.stationId, stations.id)).where(inArray(propertyTransitEntries.propertyId, ids))
    : []

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
