import type { H3Event } from 'h3'
import type { AdminPropertyInput } from '../../shared/admin-property'
import { and, eq, inArray, sql } from 'drizzle-orm'
import * as v from 'valibot'
import { adminPropertyInputSchema, propertyDateError, publicationErrors } from '../../shared/admin-property'
import { useDatabase } from '../database/client'
import { properties, propertyImages, stations } from '../database/schema'

export async function ownedProperty(event: H3Event) {
  const { user } = await requireAgencySession(event)
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: '缺少物件識別碼。' })
  const database = useDatabase(event)
  const [property] = await database.select().from(properties).where(and(eq(properties.id, id), eq(properties.agencyId, user.id))).limit(1)
  if (!property)
    throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })
  return { database, property, user }
}

export async function parsePropertyInput(event: H3Event): Promise<AdminPropertyInput> {
  const parsed = v.safeParse(adminPropertyInputSchema, await readBody<unknown>(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.issues[0]?.message ?? '物件資料有誤。', data: { issues: parsed.issues.map(issue => ({ field: issue.path?.map(part => part.key).join('.'), message: issue.message })) } })
  }
  const input = parsed.output
  if (input.floorNumber != null && input.totalFloors != null && input.floorNumber > input.totalFloors)
    throw createError({ statusCode: 400, statusMessage: '所在樓層不可高於總樓層。' })
  const dateError = propertyDateError(input)
  if (dateError)
    throw createError({ statusCode: 400, statusMessage: dateError })
  const stationIds = input.transitEntries.map(entry => entry.stationId)
  if (stationIds.length) {
    const found = await useDatabase(event).select({ id: stations.id }).from(stations).where(inArray(stations.id, stationIds))
    if (found.length !== stationIds.length)
      throw createError({ statusCode: 400, statusMessage: '交通含有不存在的車站。' })
  }
  return input
}

export async function validatePublication(event: H3Event, input: AdminPropertyInput, id?: string) {
  if (input.status !== 'published')
    return
  const images = id ? await useDatabase(event).select().from(propertyImages).where(eq(propertyImages.propertyId, id)) : []
  const missing = publicationErrors(input, images)
  if (missing.length)
    throw createError({ statusCode: 400, statusMessage: `發布前請補齊：${missing.join('、')}。`, data: { missing } })
}

export function publicationMediaPredicate(id: string) {
  return sql`(SELECT count(*) FROM property_images WHERE property_id = ${id} AND kind = 'photo') BETWEEN 1 AND 20
    AND (SELECT count(*) FROM property_images WHERE property_id = ${id} AND kind = 'floor_plan') = 1
    AND (SELECT count(*) FROM property_images WHERE property_id = ${id} AND kind = 'photo' AND is_cover = 1) = 1`
}
