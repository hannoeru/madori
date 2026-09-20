import type { PropertyDetail } from '../../../shared/property'
import { asc, eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { useDatabase } from '../../database/client'
import { properties, propertyTransitEntries } from '../../database/schema'

export default defineEventHandler(async (event): Promise<PropertyDetail> => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: '缺少物件識別碼。' })

  const database = useDatabase(event)
  const [property] = await database.select().from(properties).where(eq(properties.id, id)).limit(1)
  if (!property || property.status !== 'published')
    throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })

  const transitEntries = await database.select().from(propertyTransitEntries).where(eq(propertyTransitEntries.propertyId, property.id)).orderBy(asc(propertyTransitEntries.walkingMinutes))

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
    transitEntries,
  }
})
