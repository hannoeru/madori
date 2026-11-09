import type { PropertySearchResults } from '../../shared/property'
import { and, asc, count, desc, eq, exists, gte, inArray, lte, sql } from 'drizzle-orm'
import { getQuery } from 'h3'
import * as v from 'valibot'
import { propertyQuerySchema } from '../../shared/property'
import { useDatabase } from '../database/client'
import { properties, propertyImages, propertyTransitEntries, stations } from '../database/schema'

const primaryArea = sql`CASE WHEN ${properties.propertyType} = 'condominium' THEN ${properties.floorAreaSqm} ELSE ${properties.landAreaSqm} END`

export default defineEventHandler(async (event): Promise<PropertySearchResults> => {
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

  const filters = and(
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
  )
  const [resultCount] = await database.select({ total: count() }).from(properties).where(filters)
  const total = resultCount?.total ?? 0
  const propertyRows = await database.select().from(properties).where(filters).orderBy(orderBy, asc(properties.id)).limit(query.pageSize).offset((query.page - 1) * query.pageSize)

  const ids = propertyRows.map(property => property.id)
  const images = ids.length ? await database.select().from(propertyImages).where(inArray(propertyImages.propertyId, ids)).orderBy(asc(propertyImages.kind), asc(propertyImages.position)) : []
  const transitEntries = ids.length
    ? await database.select({
        id: propertyTransitEntries.id,
        propertyId: propertyTransitEntries.propertyId,
        stationNameZhTw: stations.nameZhTw,
        walkingMinutes: propertyTransitEntries.walkingMinutes,
      }).from(propertyTransitEntries).innerJoin(stations, eq(propertyTransitEntries.stationId, stations.id)).where(inArray(propertyTransitEntries.propertyId, ids)).orderBy(asc(propertyTransitEntries.walkingMinutes), asc(propertyTransitEntries.id))
    : []

  const imagesByProperty = new Map<string, typeof images>()
  for (const image of images) {
    const list = imagesByProperty.get(image.propertyId)
    if (list)
      list.push(image)
    else
      imagesByProperty.set(image.propertyId, [image])
  }
  const transitByProperty = new Map<string, typeof transitEntries>()
  for (const entry of transitEntries) {
    const list = transitByProperty.get(entry.propertyId)
    if (list)
      list.push(entry)
    else
      transitByProperty.set(entry.propertyId, [entry])
  }

  const items = propertyRows.map(property => ({
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
    images: (imagesByProperty.get(property.id) ?? []).map(image => ({ id: image.id, isCover: image.isCover, kind: image.kind, position: image.position, altZhTw: image.altZhTw })),
    transitEntries: (transitByProperty.get(property.id) ?? []).map(entry => ({ id: entry.id, stationNameZhTw: entry.stationNameZhTw, walkingMinutes: entry.walkingMinutes })),
  }))
  return { items, total, page: query.page, pageSize: query.pageSize }
})
