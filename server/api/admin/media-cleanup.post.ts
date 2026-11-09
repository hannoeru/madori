import { cleanupForAgency } from '../../utils/property-media-cleanup'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const { user } = await requireAgencySession(event)
  return { ok: true, ...await cleanupForAgency(event, user.id) }
})
