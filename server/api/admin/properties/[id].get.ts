import { and, asc, eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { useDatabase } from '../../../database/client'
import { properties, propertyTransitEntries } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
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

  return { ...property, transitEntries }
})
