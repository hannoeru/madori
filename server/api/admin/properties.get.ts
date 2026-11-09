import { and, asc, eq, like, lte, or } from 'drizzle-orm'
import { getQuery } from 'h3'
import * as v from 'valibot'
import { tokyoDate } from '../../../shared/admin-property'
import { useDatabase } from '../../database/client'
import { properties } from '../../database/schema'

const adminPropertyQuerySchema = v.object({
  query: v.optional(v.pipe(v.string(), v.maxLength(100))),
  status: v.optional(v.picklist(['draft', 'published', 'withdrawn'])),
  review: v.optional(v.literal('due')),
})

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const { user } = await requireAgencySession(event)
  const parsedQuery = v.safeParse(adminPropertyQuerySchema, getQuery(event))
  if (!parsedQuery.success)
    throw createError({ statusCode: 400, statusMessage: '篩選條件無效。' })

  const query = parsedQuery.output
  const search = query.query?.trim()
  const database = useDatabase(event)
  return database.select({
    id: properties.id,
    propertyNumber: properties.propertyNumber,
    titleZhTw: properties.titleZhTw,
    status: properties.status,
    ward: properties.ward,
    nextUpdateOn: properties.nextUpdateOn,
    updatedAt: properties.updatedAt,
  }).from(properties).where(and(
    eq(properties.agencyId, user.id),
    query.status ? eq(properties.status, query.status) : undefined,
    query.review ? and(eq(properties.status, 'published'), lte(properties.nextUpdateOn, tokyoDate())) : undefined,
    search ? or(like(properties.propertyNumber, `%${search}%`), like(properties.titleZhTw, `%${search}%`)) : undefined,
  )).orderBy(asc(properties.nextUpdateOn))
})
