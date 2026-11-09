import type { AdminPropertyListItem } from '../../../shared/property'
import { desc } from 'drizzle-orm'
import { useDatabase } from '../../database/client'
import { properties } from '../../database/schema'

export default defineEventHandler(async (event): Promise<AdminPropertyListItem[]> => {
  await requireUserSession(event)
  return useDatabase(event).select({
    id: properties.id,
    titleZhTw: properties.titleZhTw,
    status: properties.status,
    ward: properties.ward,
    priceYen: properties.priceYen,
    updatedAt: properties.updatedAt,
  }).from(properties).orderBy(desc(properties.updatedAt))
})
