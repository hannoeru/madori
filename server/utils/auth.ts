import type { H3Event } from 'h3'
import type { AccountRole, AuthResponse } from '../../shared/account'
import type { useDatabase } from '../database/client'
import { createId } from '@paralleldrive/cuid2'
import { and, eq, gt, lte, notExists, sql } from 'drizzle-orm'
import { useDatabase as databaseFor } from '../database/client'
import { agencies, authTokens, buyers } from '../database/schema'

export async function requireAgencySession(event: H3Event) {
  const { user } = await requireUserSession(event)
  if (user.role !== 'agency')
    throw createError({ statusCode: 403, statusMessage: '請使用房仲公司帳號。' })
  const [agency] = await databaseFor(event).select({ id: agencies.id, name: agencies.name, email: agencies.email }).from(agencies).where(eq(agencies.id, user.id)).limit(1)
  if (!agency)
    throw createError({ statusCode: 401, statusMessage: '請重新登入。' })
  return { user: { ...agency, role: user.role } }
}

export async function requireBuyerSession(event: H3Event) {
  const { user } = await requireUserSession(event)
  if (user.role !== 'buyer')
    throw createError({ statusCode: 403, statusMessage: '請使用買方帳號。' })
  const [buyer] = await databaseFor(event).select({ id: buyers.id, name: buyers.name, email: buyers.email }).from(buyers).where(eq(buyers.id, user.id)).limit(1)
  if (!buyer)
    throw createError({ statusCode: 401, statusMessage: '請重新登入。' })
  return { user: { ...buyer, role: user.role } }
}

export async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function issueMagicLink({ database, event, email, role }: {
  database: ReturnType<typeof useDatabase>
  event: H3Event
  email: string
  role: AccountRole
}): Promise<AuthResponse> {
  const token = crypto.randomUUID() + crypto.randomUUID()
  const now = new Date()
  const cutoff = new Date(now.getTime() - 60_000).toISOString()
  const identity = and(eq(authTokens.email, email), eq(authTokens.role, role))
  const recent = database.select({ id: authTokens.id }).from(authTokens).where(and(identity, gt(authTokens.createdAt, cutoff)))
  const [, accepted] = await database.batch([
    database.delete(authTokens).where(and(identity, lte(authTokens.createdAt, cutoff))),
    database.insert(authTokens).select(
      database.select({
        id: sql<string>`${createId()}`.as('id'),
        email: sql<string>`${email}`.as('email'),
        role: sql<AccountRole>`${role}`.as('role'),
        tokenHash: sql<string>`${await sha256(token)}`.as('token_hash'),
        expiresAt: sql<string>`${new Date(now.getTime() + 15 * 60_000).toISOString()}`.as('expires_at'),
        createdAt: sql<string>`${now.toISOString()}`.as('created_at'),
      }).from(sql`(SELECT 1)`).where(notExists(recent)),
    ).returning({ id: authTokens.id }),
  ])
  if (!accepted.length)
    throw createError({ statusCode: 429, statusMessage: '請稍後再取得登入連結。' })

  const config = useRuntimeConfig(event)
  const origin = import.meta.dev ? getRequestURL(event).origin : new URL(config.appUrl).origin
  const link = `${origin}/api/auth/verify?token=${token}`
  if (import.meta.dev)
    return { ok: true, link }

  const emailClient = event.context.cloudflare?.env.EMAIL
  if (!emailClient)
    throw createError({ statusCode: 503, statusMessage: '電子郵件服務目前無法使用。' })
  try {
    await emailClient.send({
      to: email,
      from: { email: config.emailFrom, name: config.emailFromName },
      subject: 'Madori 登入連結',
      html: `<p>請使用下方連結登入 Madori。連結在 15 分鐘後失效，且只能使用一次。</p><p><a href="${link}">登入 Madori</a></p>`,
      text: `請使用下方連結登入 Madori。連結在 15 分鐘後失效，且只能使用一次。\n${link}`,
    })
  }
  catch {
    await database.delete(authTokens).where(eq(authTokens.tokenHash, await sha256(token)))
    throw createError({ statusCode: 503, statusMessage: '登入郵件寄送失敗。請稍後重試。' })
  }
  return { ok: true }
}
