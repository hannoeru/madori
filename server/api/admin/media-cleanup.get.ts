import { eq, sql } from 'drizzle-orm'
import { useDatabase } from '../../database/client'
import { pendingImageDeletions } from '../../database/schema'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const { user } = await requireAgencySession(event)
  const [result] = await useDatabase(event).select({ pendingCount: sql<number>`count(*)` }).from(pendingImageDeletions).where(eq(pendingImageDeletions.agencyId, user.id))
  return { pendingCount: result?.pendingCount ?? 0 }
})
