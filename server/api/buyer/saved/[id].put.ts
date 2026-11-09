import { and, eq, sql } from 'drizzle-orm'
import { useDatabase } from '../../../database/client'
import { properties, savedProperties } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { user } = await requireBuyerSession(event)
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: '缺少物件識別碼。' })
  const database = useDatabase(event)
  const [accepted] = await database.insert(savedProperties).select(
    database.select({
      buyerId: sql<string>`${user.id}`.as('buyer_id'),
      propertyId: properties.id,
      createdAt: sql<string>`${new Date().toISOString()}`.as('created_at'),
    }).from(properties).where(and(eq(properties.id, id), eq(properties.status, 'published'))),
  ).onConflictDoNothing().returning({ propertyId: savedProperties.propertyId, createdAt: savedProperties.createdAt })
  if (accepted)
    return accepted

  const [saved] = await database.select({ propertyId: savedProperties.propertyId, createdAt: savedProperties.createdAt })
    .from(savedProperties)
    .where(and(eq(savedProperties.buyerId, user.id), eq(savedProperties.propertyId, id)))
    .limit(1)
  if (!saved)
    throw createError({ statusCode: 404, statusMessage: '此物件目前無法收藏。' })
  return saved
})
