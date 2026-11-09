import { useDatabase } from '../../database/client'
import { requireBuyerSession } from '../../utils/auth'
import { buyerInquiryHistory, inquiryPage, privateInquiryRequest } from '../../utils/inquiries'

export default defineEventHandler(async (event) => {
  privateInquiryRequest(event)
  const { user } = await requireBuyerSession(event)
  return buyerInquiryHistory({ database: useDatabase(event), buyerId: user.id, page: inquiryPage(event) })
})
