import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { useDatabase } from '../../database/client'
import { agencies } from '../../database/schema'
import { issueMagicLink } from '../../utils/auth'

const loginSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email(), v.maxLength(254)),
})

export default defineEventHandler(async (event) => {
  const parsed = v.safeParse(loginSchema, await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: '電子郵件無效。' })

  const email = parsed.output.email.toLowerCase()
  const database = useDatabase(event)
  const agency = await database.select({ id: agencies.id }).from(agencies).where(eq(agencies.email, email)).limit(1)
  if (!agency.length)
    throw createError({ statusCode: 404, statusMessage: '查無此帳號。' })

  const link = await issueMagicLink(database, event, email)
  return import.meta.dev ? { ok: true, link } : { ok: true }
})
