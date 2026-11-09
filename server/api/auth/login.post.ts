import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { loginSchema } from '../../../shared/account'
import { useDatabase } from '../../database/client'
import { agencies, buyers } from '../../database/schema'
import { issueMagicLink } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const parsed = v.safeParse(loginSchema, await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: '電子郵件或帳號類型無效。' })

  const { role } = parsed.output
  const email = parsed.output.email.toLowerCase()
  const database = useDatabase(event)
  const table = role === 'agency' ? agencies : buyers
  const [account] = await database.select({ id: table.id }).from(table).where(eq(table.email, email)).limit(1)
  if (!account)
    return { ok: true }
  return issueMagicLink({ database, event, email, role })
})
