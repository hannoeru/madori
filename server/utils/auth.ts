import type { H3Event } from 'h3'

interface EmailClient {
  send: (input: {
    to: string
    from: { email: string, name: string }
    subject: string
    html: string
    text: string
  }) => Promise<unknown>
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function sendMagicLink(event: H3Event, email: string, link: string): Promise<void> {
  const config = useRuntimeConfig(event)
  const env = (event.context.cloudflare as { env?: { EMAIL?: EmailClient } } | undefined)?.env

  if (env?.EMAIL) {
    try {
      await env.EMAIL.send({
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

  console.warn(`[auth] Magic link for ${email}: ${link}`)
}
