import { eq } from 'drizzle-orm'
import { propertyColumns } from '../../../../shared/property'
import { properties } from '../../../database/schema'
import { assertPublishable, ownerProperty, parsePropertyInput } from '../../../utils/admin-property'

export default defineEventHandler(async (event) => {
  const { database, property } = await ownerProperty(event)
  const input = await parsePropertyInput(event)
  await assertPublishable(event, input, property.id)
  await database.update(properties).set({
    ...propertyColumns(input),
    publishedAt: input.status === 'published' ? (property.publishedAt ?? new Date().toISOString()) : null,
  }).where(eq(properties.id, property.id))
  return { ok: true }
})
