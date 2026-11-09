import type { H3Event } from 'h3'
import type { InquiryNotificationResult } from '../../shared/inquiry'
import type { inquiries } from '../database/schema'

type NotificationInquiry = Pick<typeof inquiries.$inferSelect, 'id' | 'propertyTitle' | 'propertyNumber' | 'buyerName' | 'buyerEmail' | 'message'>

export function inquiryNotificationText({ inquiry, appUrl }: { inquiry: NotificationInquiry, appUrl: string }) {
  const url = new URL('/admin/inquiries', appUrl)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Invalid application URL')
  return [
    '您收到一筆 Madori 物件諮詢。',
    `物件：${inquiry.propertyTitle}`,
    `物件編號：${inquiry.propertyNumber}`,
    `買方：${inquiry.buyerName}`,
    `電子郵件：${inquiry.buyerEmail}`,
    '',
    '諮詢內容：',
    inquiry.message,
    '',
    `請登入房仲公司收件匣查看：${url.href}`,
    `諮詢編號：${inquiry.id}`,
  ].join('\n')
}

export async function sendInquiryNotification({ event, inquiry, recipientEmail }: {
  event: H3Event
  inquiry: NotificationInquiry
  recipientEmail: string
}): Promise<InquiryNotificationResult> {
  if (import.meta.dev)
    return { status: 'failed', error: 'local-disabled' }
  const sender = event.context.cloudflare?.env.EMAIL
  if (!sender)
    return { status: 'failed', error: 'email-unavailable' }

  const config = useRuntimeConfig(event)
  let text: string
  try {
    text = inquiryNotificationText({ inquiry, appUrl: config.appUrl })
  }
  catch {
    return { status: 'failed', error: 'invalid-email-config' }
  }
  try {
    const result = await sender.send({
      to: recipientEmail,
      from: { email: config.emailFrom, name: config.emailFromName },
      subject: 'Madori 新物件諮詢',
      replyTo: inquiry.buyerEmail,
      text,
    })
    if (!result.messageId)
      return { status: 'failed', error: 'email-send-failed' }
    return { status: 'sent', notifiedAt: new Date().toISOString() }
  }
  catch {
    return { status: 'failed', error: 'email-send-failed' }
  }
}
