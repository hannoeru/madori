import { createId } from '@paralleldrive/cuid2'
import * as v from 'valibot'
import { adminPropertyInputSchema, propertyColumns, propertyTypeAreaError } from '../../../shared/admin-property'
import { useDatabase } from '../../database/client'
import { properties, propertyTransitEntries } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const parsed = v.safeParse(adminPropertyInputSchema, await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: '物件資料有誤。' })

  const input = parsed.output
  const areaError = propertyTypeAreaError(input)
  if (areaError)
    throw createError({ statusCode: 400, statusMessage: areaError })

  const database = useDatabase(event)
  const propertyId = createId()
  const now = new Date().toISOString()

  await database.insert(properties).values({
    id: propertyId,
    propertyNumber: createId(),
    agencyId: user.id,
    ...propertyColumns(input),
    publishedAt: input.status === 'published' ? now : null,
    withdrawnAt: input.status === 'withdrawn' ? now : null,
  })

  if (input.transitEntries.length) {
    await database.insert(propertyTransitEntries).values(input.transitEntries.map(entry => ({
      propertyId,
      stationId: entry.stationId,
      walkingMinutes: entry.walkingMinutes,
    })))
  }

  return { id: propertyId }
})
