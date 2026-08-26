import { asc } from 'drizzle-orm'
import { useDatabase } from '../../database/client'
import { properties } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const database = useDatabase(event)
  return database.select({
    id: properties.id,
    propertyNumber: properties.propertyNumber,
    titleZhTw: properties.titleZhTw,
    status: properties.status,
    ward: properties.ward,
    nextUpdateOn: properties.nextUpdateOn,
    updatedAt: properties.updatedAt,
  }).from(properties).orderBy(asc(properties.nextUpdateOn))
})
