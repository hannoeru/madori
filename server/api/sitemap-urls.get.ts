import { eq } from 'drizzle-orm'
import { useDatabase } from '../database/client'
import { properties } from '../database/schema'

export default defineEventHandler(async (event) => {
  const database = useDatabase(event)
  const rows = await database.select({ id: properties.id, updatedAt: properties.updatedAt }).from(properties).where(eq(properties.status, 'published'))
  return rows.map(row => ({ loc: `/properties/${row.id}`, lastmod: row.updatedAt.slice(0, 10) }))
})
