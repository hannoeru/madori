import { and, eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import * as v from 'valibot'
import { adminPropertyInputSchema } from '../../../../shared/admin-property'
import { useDatabase } from '../../../database/client'
import { properties, propertyTransitEntries } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: '缺少物件識別碼。' })

  const parsed = v.safeParse(adminPropertyInputSchema, await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: '物件資料有誤。' })

  const input = parsed.output
  if (input.propertyType === 'condominium' && input.floorAreaSqm == null)
    throw createError({ statusCode: 400, statusMessage: '公寓需填寫專有面積。' })
  if (input.propertyType === 'detached_house' && (input.landAreaSqm == null || input.buildingAreaSqm == null))
    throw createError({ statusCode: 400, statusMessage: '獨棟住宅需填寫土地面積與建物面積。' })

  const database = useDatabase(event)
  const [existing] = await database.select({ id: properties.id, publishedAt: properties.publishedAt, withdrawnAt: properties.withdrawnAt })
    .from(properties)
    .where(and(eq(properties.id, id), eq(properties.agencyId, user.id)))
    .limit(1)
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })

  const now = new Date().toISOString()
  await database.update(properties).set({
    status: input.status,
    propertyType: input.propertyType,
    buildStatus: input.buildStatus,
    titleZhTw: input.titleZhTw,
    descriptionZhTw: input.descriptionZhTw,
    priceYen: input.priceYen,
    ward: input.ward,
    addressZhTw: input.addressZhTw,
    layout: input.layout,
    floorAreaSqm: input.floorAreaSqm ?? null,
    landAreaSqm: input.landAreaSqm ?? null,
    buildingAreaSqm: input.buildingAreaSqm ?? null,
    builtOn: input.builtOn,
    structure: input.structure ?? null,
    floorNumber: input.floorNumber ?? null,
    totalFloors: input.totalFloors ?? null,
    landRights: input.landRights ?? null,
    managementFeeYen: input.managementFeeYen ?? null,
    repairReserveYen: input.repairReserveYen ?? null,
    transactionMode: input.transactionMode ?? null,
    nextUpdateOn: input.nextUpdateOn,
    publishedAt: input.status === 'published' ? (existing.publishedAt ?? now) : null,
    withdrawnAt: input.status === 'withdrawn' ? (existing.withdrawnAt ?? now) : null,
  }).where(and(eq(properties.id, id), eq(properties.agencyId, user.id)))

  await database.delete(propertyTransitEntries).where(eq(propertyTransitEntries.propertyId, id))
  if (input.transitEntries.length) {
    await database.insert(propertyTransitEntries).values(input.transitEntries.map(entry => ({
      propertyId: id,
      stationId: entry.stationId,
      walkingMinutes: entry.walkingMinutes,
    })))
  }

  return { ok: true }
})
