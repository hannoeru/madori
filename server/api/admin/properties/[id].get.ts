import type { AdminPropertyDetail } from '../../../../shared/admin-property'
import { and, asc, eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { useDatabase } from '../../../database/client'
import { properties, propertyImages, propertyTransitEntries } from '../../../database/schema'

export default defineEventHandler(async (event): Promise<AdminPropertyDetail> => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const { user } = await requireAgencySession(event)
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: '缺少物件識別碼。' })

  const database = useDatabase(event)
  const [property] = await database.select().from(properties).where(and(eq(properties.id, id), eq(properties.agencyId, user.id))).limit(1)
  if (!property)
    throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })

  const transitEntries = await database.select({
    id: propertyTransitEntries.id,
    stationId: propertyTransitEntries.stationId,
    walkingMinutes: propertyTransitEntries.walkingMinutes,
  }).from(propertyTransitEntries).where(eq(propertyTransitEntries.propertyId, id)).orderBy(asc(propertyTransitEntries.walkingMinutes))

  const images = await database.select({ id: propertyImages.id, isCover: propertyImages.isCover, kind: propertyImages.kind, position: propertyImages.position, altZhTw: propertyImages.altZhTw }).from(propertyImages).where(eq(propertyImages.propertyId, id)).orderBy(asc(propertyImages.kind), asc(propertyImages.position))

  return {
    propertyType: property.propertyType,
    buildStatus: property.buildStatus,
    status: property.status,
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
    nextUpdateOn: property.nextUpdateOn,
    transitEntries,
    images,
  }
})
