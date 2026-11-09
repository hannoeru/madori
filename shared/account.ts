import * as v from 'valibot'

export const accountRoleSchema = v.picklist(['agency', 'buyer'])
export type AccountRole = v.InferOutput<typeof accountRoleSchema>

const name = v.pipe(v.string(), v.trim(), v.minLength(1, '請填寫名稱。'), v.maxLength(100, '名稱最多 100 字。'))
const email = v.pipe(v.string(), v.trim(), v.email('請填寫有效電子郵件。'), v.maxLength(254))

export const loginSchema = v.object({ role: accountRoleSchema, email })
export const buyerRegistrationSchema = v.object({ role: v.literal('buyer'), name, email })
export const agencyRegistrationSchema = v.object({
  role: v.literal('agency'),
  name,
  email,
  license: v.pipe(v.string(), v.trim(), v.minLength(1, '請填寫許可字號。'), v.maxLength(100)),
  lineUrl: v.pipe(v.string(), v.trim(), v.url('請填寫有效 LINE 連結。'), v.maxLength(500), v.check((value) => {
    const url = new URL(value)
    return url.protocol === 'https:' && ['line.me', 'lin.ee'].includes(url.hostname) && !url.username && !url.password
  }, '請使用 https://line.me 或 https://lin.ee 的連結。')),
})
export const registrationSchema = v.variant('role', [buyerRegistrationSchema, agencyRegistrationSchema])

export interface AuthResponse {
  ok: true
  link?: string
}
