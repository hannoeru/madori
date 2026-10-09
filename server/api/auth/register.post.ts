import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { useDatabase } from '../../database/client'
import { agencies } from '../../database/schema'
import { issueMagicLink } from '../../utils/auth'

const registerSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
  email: v.pipe(v.string(), v.trim(), v.email(), v.maxLength(254)),
  license: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
  lineUrl: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500)),
})

export default defineEventHandler(async (event) => {
  const parsed = v.safeParse(registerSchema, await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: '資料有誤。' })

  const input = parsed.output
  const email = input.email.toLowerCase()
  const database = useDatabase(event)

  const existing = await database.select({ id: agencies.id }).from(agencies).where(eq(agencies.email, email)).limit(1)
  if (existing.length)
    throw createError({ statusCode: 409, statusMessage: '此電子郵件已註冊。' })

  await database.insert(agencies).values({
    name: input.name,
    email,
    license: input.license,
    lineUrl: input.lineUrl,
  })

  const link = await issueMagicLink(database, event, email)
  return import.meta.dev ? { ok: true, link } : { ok: true }
})
