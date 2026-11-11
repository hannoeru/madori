import * as v from 'valibot'

const loginSchema = v.object({ password: v.string() })

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}

export default defineEventHandler(async (event) => {
  const { adminPassword } = useRuntimeConfig(event)
  if (!adminPassword)
    throw createError({ statusCode: 500, statusMessage: '尚未設定管理密碼。' })

  const limiter = event.context.cloudflare?.env.LOGIN_RATE_LIMIT
  if (!limiter)
    throw createError({ statusCode: 500, statusMessage: '登入服務不可用。' })
  const { success } = await limiter.limit({ key: getHeader(event, 'cf-connecting-ip') ?? 'local' })
  if (!success)
    throw createError({ statusCode: 429, statusMessage: '嘗試次數過多，請一分鐘後再試。' })

  const parsed = v.safeParse(loginSchema, await readBody(event))
  if (!parsed.success || await digest(parsed.output.password) !== await digest(adminPassword))
    throw createError({ statusCode: 401, statusMessage: '密碼不正確。' })

  await setUserSession(event, { user: { role: 'owner' } })
  return { ok: true }
})
