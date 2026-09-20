import type { PropertyDetail } from '../../../shared/property'
import { asc, eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { useDatabase } from '../../database/client'
import { agencies, lines, properties, propertyTransitEntries, stations } from '../../database/schema'

export default defineEventHandler(async (event): Promise<PropertyDetail> => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: '缺少物件識別碼。' })

  const database = useDatabase(event)
  const [row] = await database.select({
    property: properties,
    agencyName: agencies.name,
    agencyLicense: agencies.license,
    agencyLineUrl: agencies.lineUrl,
  }).from(properties).innerJoin(agencies, eq(properties.agencyId, agencies.id)).where(eq(properties.id, id)).limit(1)

  const property = row?.property
  if (!property || property.status !== 'published')
    throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })

  const transitEntries = await database
    .select({
      id: propertyTransitEntries.id,
      lineNameZhTw: lines.nameZhTw,
      stationNameZhTw: stations.nameZhTw,
      lineNameJa: lines.nameJa,
      stationNameJa: stations.nameJa,
      walkingMinutes: propertyTransitEntries.walkingMinutes,
    })
    .from(propertyTransitEntries)
    .innerJoin(stations, eq(propertyTransitEntries.stationId, stations.id))
    .innerJoin(lines, eq(stations.lineId, lines.id))
    .where(eq(propertyTransitEntries.propertyId, property.id))
    .orderBy(asc(propertyTransitEntries.walkingMinutes))

  return {
    id: property.id,
    titleZhTw: property.titleZhTw,
    descriptionZhTw: property.descriptionZhTw,
    priceYen: property.priceYen,
    ward: property.ward,
    addressZhTw: property.addressZhTw,
    layout: property.layout,
    floorAreaSqm: property.floorAreaSqm,
    landAreaSqm: property.landAreaSqm,
    buildingAreaSqm: property.buildingAreaSqm,
    builtOn: property.builtOn,
    structure: property.structure,
    floorNumber: property.floorNumber,
    totalFloors: property.totalFloors,
    landRights: property.landRights,
    managementFeeYen: property.managementFeeYen,
    repairReserveYen: property.repairReserveYen,
    transactionMode: property.transactionMode,
    equipmentZhTw: property.equipmentZhTw,
    propertyType: property.propertyType,
    buildStatus: property.buildStatus,
    nextUpdateOn: property.nextUpdateOn,
    agency: {
      name: row.agencyName,
      license: row.agencyLicense,
      lineUrl: row.agencyLineUrl,
    },
    transitEntries,
  }
})
