import type { H3Event } from 'h3'
import type { PropertyInput } from '../../shared/property'
import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { propertyInputSchema, publicationErrors } from '../../shared/property'
import { useDatabase } from '../database/client'
import { properties, propertyImages } from '../database/schema'

export async function ownerProperty(event: H3Event) {
  await requireUserSession(event)
  const database = useDatabase(event)
  const [property] = await database.select().from(properties).where(eq(properties.id, getRouterParam(event, 'id') ?? '')).limit(1)
  if (!property)
    throw createError({ statusCode: 404, statusMessage: '找不到此物件。' })
  return { database, property }
}

export async function parsePropertyInput(event: H3Event): Promise<PropertyInput> {
  const parsed = v.safeParse(propertyInputSchema, await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: parsed.issues[0]?.message ?? '物件資料有誤。' })
  return parsed.output
}

export async function assertPublishable(event: H3Event, input: PropertyInput, propertyId?: string) {
  if (input.status !== 'published')
    return
  const images = propertyId ? await useDatabase(event).select().from(propertyImages).where(eq(propertyImages.propertyId, propertyId)) : []
  const missing = publicationErrors(input, images)
  if (missing.length)
    throw createError({ statusCode: 400, statusMessage: `發布前請補齊：${missing.join('、')}。` })
}
