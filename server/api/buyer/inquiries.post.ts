import * as v from 'valibot'
import { inquirySubmissionSchema } from '../../../shared/inquiry'
import { useDatabase } from '../../database/client'
import { requireBuyerSession } from '../../utils/auth'
import { privateInquiryRequest, submitInquiry } from '../../utils/inquiries'
import { sendInquiryNotification } from '../../utils/inquiry-notification'

export default defineEventHandler(async (event) => {
  privateInquiryRequest(event)
  const { user } = await requireBuyerSession(event)
  const parsed = v.safeParse(inquirySubmissionSchema, await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: parsed.issues[0]?.message ?? '諮詢資料有誤。' })
  const inquiry = await submitInquiry({
    database: useDatabase(event),
    buyerId: user.id,
    input: parsed.output,
    notify: (inquiry, recipientEmail) => sendInquiryNotification({ event, inquiry, recipientEmail }),
  })
  return { id: inquiry.id, notificationStatus: inquiry.notificationStatus, createdAt: inquiry.createdAt }
})
