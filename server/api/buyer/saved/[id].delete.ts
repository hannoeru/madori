import { and, eq } from 'drizzle-orm'
import { useDatabase } from '../../../database/client'
import { savedProperties } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { user } = await requireBuyerSession(event)
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: '缺少物件識別碼。' })
  await useDatabase(event).delete(savedProperties).where(and(eq(savedProperties.buyerId, user.id), eq(savedProperties.propertyId, id)))
  return { propertyId: id, saved: false }
})
