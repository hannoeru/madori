import { and, eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import * as v from 'valibot'
import { adminPropertyInputSchema, propertyColumns, propertyTypeAreaError } from '../../../../shared/admin-property'
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
  const areaError = propertyTypeAreaError(input)
  if (areaError)
    throw createError({ statusCode: 400, statusMessage: areaError })

  const database = useDatabase(event)
  const [existing] = await database.select({ id: properties.id, publishedAt: properties.publishedAt, withdrawnAt: properties.withdrawnAt })
    .from(properties)
    .where(and(eq(properties.id, id), eq(properties.agencyId, user.id)))
    .limit(1)
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })

  const now = new Date().toISOString()
  await database.update(properties).set({
    ...propertyColumns(input),
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
