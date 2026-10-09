import type { H3Event } from 'h3'
import type { useDatabase } from '../database/client'
import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { getRequestURL } from 'h3'
import { authTokens } from '../database/schema'

export const MAGIC_LINK_TTL_MS = 1000 * 60 * 15

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function sendMagicLink(event: H3Event, email: string, link: string): Promise<void> {
  const config = useRuntimeConfig(event)
  const emailClient = event.context.cloudflare?.env.EMAIL

  if (emailClient) {
    try {
      await emailClient.send({
        to: email,
        from: { email: config.emailFrom, name: config.emailFromName },
        subject: 'Madori 登入連結',
        html: `<p>請點擊下方連結以登入 Madori：</p><p><a href="${link}">${link}</a></p><p>此連結 15 分鐘內有效。</p>`,
        text: `請點擊下方連結以登入 Madori：\n${link}\n此連結 15 分鐘內有效。`,
      })
      return
    }
    catch (err) {
      console.warn('[auth] 電子郵件寄送失敗，改用記錄輸出。', err)
    }
  }

  if (import.meta.dev)
    console.warn(`[auth] Magic link for ${email}: ${link}`)
}

export async function issueMagicLink(
  database: ReturnType<typeof useDatabase>,
  event: H3Event,
  email: string,
): Promise<string> {
  const token = createId()
  await database.delete(authTokens).where(eq(authTokens.email, email))
  await database.insert(authTokens).values({
    email,
    tokenHash: await sha256(token),
    expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString(),
  })

  const link = `${getRequestURL(event).origin}/api/auth/verify?token=${token}`
  await sendMagicLink(event, email, link)
  return link
}
