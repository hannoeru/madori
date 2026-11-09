import { useDatabase } from '../../../../database/client'
import { requireAgencySession } from '../../../../utils/auth'
import { privateInquiryRequest, readAgencyInquiry } from '../../../../utils/inquiries'

export default defineEventHandler(async (event) => {
  privateInquiryRequest(event)
  const { user } = await requireAgencySession(event)
  const id = getRouterParam(event, 'id')
  if (!id || !/^[a-f0-9]{64}$/.test(id))
    throw createError({ statusCode: 404, statusMessage: '找不到諮詢。' })
  return readAgencyInquiry({ database: useDatabase(event), agencyId: user.id, id })
})
