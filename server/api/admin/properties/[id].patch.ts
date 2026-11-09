import { and, eq, sql } from 'drizzle-orm'
import { propertyColumns } from '../../../../shared/admin-property'
import { properties, propertyTransitEntries } from '../../../database/schema'
import { ownedProperty, parsePropertyInput, publicationMediaPredicate, validatePublication } from '../../../utils/admin-property'

export default defineEventHandler(async (event) => {
  const { database, property, user } = await ownedProperty(event)
  const input = await parsePropertyInput(event)
  await validatePublication(event, input, property.id)
  const now = new Date().toISOString()
  const update = database.update(properties).set({
    ...propertyColumns(input),
    status: input.status === 'published' ? sql`CASE WHEN ${publicationMediaPredicate(property.id)} THEN 'published' ELSE NULL END` : input.status,
    publishedAt: input.status === 'published' ? (property.publishedAt ?? now) : property.publishedAt,
    withdrawnAt: input.status === 'withdrawn' ? (property.withdrawnAt ?? now) : null,
  }).where(and(eq(properties.id, property.id), eq(properties.agencyId, user.id))).returning({ id: properties.id })
  const removeTransit = database.delete(propertyTransitEntries).where(eq(propertyTransitEntries.propertyId, property.id))
  try {
    const results = input.transitEntries.length
      ? await database.batch([update, removeTransit, database.insert(propertyTransitEntries).values(input.transitEntries.map(entry => ({ propertyId: property.id, ...entry })))])
      : await database.batch([update, removeTransit])
    if (!results[0].length)
      throw createError({ statusCode: 409, statusMessage: '物件已移除，請重新載入。' })
  }
  catch (error) {
    if (error instanceof Error && error.cause instanceof Error && error.cause.message.includes('NOT NULL constraint failed: properties.status'))
      throw createError({ statusCode: 409, statusMessage: '圖片已變更，請重新確認發布條件。資料尚未儲存。' })
    throw error
  }
  return { ok: true }
})
