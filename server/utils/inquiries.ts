import type { H3Event } from 'h3'
import type { AgencyInquiry, BuyerInquiry, InquiryNotificationResult, InquirySubmission } from '../../shared/inquiry'
import type { useDatabase } from '../database/client'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import * as v from 'valibot'
import { inquiryPageSchema } from '../../shared/inquiry'
import { agencies, buyers, inquiries, properties } from '../database/schema'
import { sha256 } from './auth'

type Database = ReturnType<typeof useDatabase>
type StoredInquiry = typeof inquiries.$inferSelect

export function privateInquiryRequest(event: H3Event) {
  setResponseHeader(event, 'Cache-Control', 'no-store')
}

export function inquiryPage(event: H3Event) {
  const parsed = v.safeParse(inquiryPageSchema, getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: '頁碼有誤。' })
  return parsed.output.page
}

function confirmPayload(inquiry: StoredInquiry, expectedId: string) {
  if (inquiry.id !== expectedId)
    throw createError({ statusCode: 409, statusMessage: '此提交識別碼已用於其他諮詢內容。請先查看諮詢紀錄。' })
  return inquiry
}

export async function submitInquiry({ database, buyerId, input, notify }: {
  database: Database
  buyerId: string
  input: InquirySubmission
  notify: (inquiry: StoredInquiry, recipientEmail: string) => Promise<InquiryNotificationResult>
}): Promise<StoredInquiry> {
  // The ID retains the payload fingerprint when propertyId becomes null after deletion.
  const id = await sha256(JSON.stringify([buyerId, input.submissionKey, input.propertyId, input.message]))
  const keyCondition = and(eq(inquiries.buyerId, buyerId), eq(inquiries.submissionKey, input.submissionKey))
  const [existing] = await database.select().from(inquiries).where(keyCondition).limit(1)
  if (existing)
    return confirmPayload(existing, id)

  const [created] = await database.insert(inquiries).select(database.select({
    id: sql<string>`${id}`.as('id'),
    buyerId: buyers.id,
    agencyId: properties.agencyId,
    propertyId: properties.id,
    submissionKey: sql<string>`${input.submissionKey}`.as('submission_key'),
    propertyTitle: properties.titleZhTw,
    propertyNumber: properties.propertyNumber,
    buyerName: buyers.name,
    buyerEmail: buyers.email,
    message: sql<string>`${input.message}`.as('message'),
    notificationStatus: sql<'pending'>`'pending'`.as('notification_status'),
    notificationError: sql<null>`null`.as('notification_error'),
    notifiedAt: sql<null>`null`.as('notified_at'),
    readAt: sql<null>`null`.as('read_at'),
    createdAt: sql<string>`${new Date().toISOString()}`.as('created_at'),
  }).from(properties).innerJoin(buyers, eq(buyers.id, buyerId)).where(and(
    eq(properties.id, input.propertyId),
    eq(properties.status, 'published'),
  ))).onConflictDoNothing({ target: [inquiries.buyerId, inquiries.submissionKey] }).returning()

  if (!created) {
    const [duplicate] = await database.select().from(inquiries).where(keyCondition).limit(1)
    if (duplicate)
      return confirmPayload(duplicate, id)
    throw createError({ statusCode: 404, statusMessage: '此物件目前無法接受諮詢。' })
  }

  const [recipient] = await database.select({ email: agencies.email }).from(agencies).where(eq(agencies.id, created.agencyId)).limit(1)
  let result: InquiryNotificationResult
  try {
    result = recipient ? await notify(created, recipient.email) : { status: 'failed', error: 'email-unavailable' }
  }
  catch {
    result = { status: 'failed', error: 'email-send-failed' }
  }
  const [updated] = await database
    .update(inquiries)
    .set(result.status === 'sent'
      ? { notificationStatus: 'sent', notificationError: null, notifiedAt: result.notifiedAt }
      : { notificationStatus: 'failed', notificationError: result.error, notifiedAt: null })
    .where(eq(inquiries.id, created.id))
    .returning()
  return updated ?? created
}

const historyFields = {
  id: inquiries.id,
  propertyId: properties.id,
  propertyTitle: inquiries.propertyTitle,
  propertyNumber: inquiries.propertyNumber,
  agencyName: agencies.name,
  message: inquiries.message,
  notificationStatus: inquiries.notificationStatus,
  notifiedAt: inquiries.notifiedAt,
  readAt: inquiries.readAt,
  createdAt: inquiries.createdAt,
}
const pageSize = 20

export async function buyerInquiryHistory({ database, buyerId, page }: { database: Database, buyerId: string, page: number }) {
  const condition = eq(inquiries.buyerId, buyerId)
  const items: BuyerInquiry[] = await database
    .select(historyFields)
    .from(inquiries)
    .innerJoin(agencies, eq(agencies.id, inquiries.agencyId))
    .leftJoin(properties, and(eq(properties.id, inquiries.propertyId), eq(properties.status, 'published')))
    .where(condition)
    .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  const [total] = await database.select({ value: count() }).from(inquiries).where(condition)
  return { items, total: total?.value ?? 0, page, pageSize }
}

export async function agencyInquiryInbox({ database, agencyId, page }: { database: Database, agencyId: string, page: number }) {
  const condition = eq(inquiries.agencyId, agencyId)
  const items: AgencyInquiry[] = await database
    .select({ ...historyFields, buyerName: inquiries.buyerName, buyerEmail: inquiries.buyerEmail })
    .from(inquiries)
    .innerJoin(agencies, eq(agencies.id, inquiries.agencyId))
    .leftJoin(properties, and(eq(properties.id, inquiries.propertyId), eq(properties.status, 'published')))
    .where(condition)
    .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  const [total] = await database.select({ value: count() }).from(inquiries).where(condition)
  return { items, total: total?.value ?? 0, page, pageSize }
}

export async function readAgencyInquiry({ database, agencyId, id }: { database: Database, agencyId: string, id: string }) {
  const [inquiry] = await database
    .update(inquiries)
    .set({ readAt: sql`coalesce(${inquiries.readAt}, ${new Date().toISOString()})` })
    .where(and(eq(inquiries.id, id), eq(inquiries.agencyId, agencyId)))
    .returning({ id: inquiries.id, readAt: inquiries.readAt })
  if (!inquiry)
    throw createError({ statusCode: 404, statusMessage: '找不到諮詢。' })
  return inquiry
}
