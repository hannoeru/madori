import * as v from 'valibot'

export const inquiryMessageSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, '請填寫諮詢內容。'),
  v.maxLength(2000, '諮詢內容最多 2,000 字。'),
)

export const inquiryFormSchema = v.object({ message: inquiryMessageSchema })
export const inquirySubmissionSchema = v.strictObject({
  propertyId: v.pipe(v.string(), v.regex(/^[\w-]{1,100}$/, '物件編號有誤。')),
  submissionKey: v.pipe(v.string(), v.uuid('請使用有效的諮詢提交識別碼。')),
  message: inquiryMessageSchema,
})
export type InquirySubmission = v.InferOutput<typeof inquirySubmissionSchema>

export const inquiryPageSchema = v.strictObject({
  page: v.optional(v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1), v.maxValue(100000)), '1'),
})

export type InquiryNotificationResult
  = { status: 'sent', notifiedAt: string }
    | { status: 'failed', error: 'local-disabled' | 'email-unavailable' | 'email-send-failed' | 'invalid-email-config' }

export interface BuyerInquiry {
  id: string
  propertyId: string | null
  propertyTitle: string
  propertyNumber: string
  agencyName: string
  message: string
  notificationStatus: 'pending' | 'sent' | 'failed'
  notifiedAt: string | null
  readAt: string | null
  createdAt: string
}

export interface AgencyInquiry extends BuyerInquiry {
  buyerName: string
  buyerEmail: string
}

export interface InquiryPage<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface InquirySubmissionResponse {
  id: string
  notificationStatus: BuyerInquiry['notificationStatus']
  createdAt: string
}

export const inquiryNotificationLabels = {
  pending: '通知處理中',
  sent: '通知已交給郵件服務',
  failed: '郵件通知失敗',
} satisfies Record<BuyerInquiry['notificationStatus'], string>

export const inquiryNotificationDescriptions = {
  pending: '諮詢已儲存至房仲公司的收件匣。郵件通知尚未完成，無須重複提交。',
  sent: '諮詢已儲存，郵件服務已接受通知。這不代表房仲公司已收到或閱讀郵件。',
  failed: '諮詢已儲存至房仲公司的收件匣，且保留在您的紀錄中。郵件通知未成功，無須重複提交。',
} satisfies Record<BuyerInquiry['notificationStatus'], string>
