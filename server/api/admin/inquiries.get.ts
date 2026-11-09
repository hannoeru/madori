import { useDatabase } from '../../database/client'
import { requireAgencySession } from '../../utils/auth'
import { agencyInquiryInbox, inquiryPage, privateInquiryRequest } from '../../utils/inquiries'

export default defineEventHandler(async (event) => {
  privateInquiryRequest(event)
  const { user } = await requireAgencySession(event)
  return agencyInquiryInbox({ database: useDatabase(event), agencyId: user.id, page: inquiryPage(event) })
})
