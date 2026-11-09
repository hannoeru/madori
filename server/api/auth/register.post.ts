import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { registrationSchema } from '../../../shared/account'
import { useDatabase } from '../../database/client'
import { agencies, buyers } from '../../database/schema'
import { issueMagicLink } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const parsed = v.safeParse(registrationSchema, await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: parsed.issues[0]?.message ?? '註冊資料有誤。' })

  const input = parsed.output
  const email = input.email.toLowerCase()
  const database = useDatabase(event)
  if (input.role === 'agency') {
    const [existing] = await database.select({ id: agencies.id }).from(agencies).where(eq(agencies.email, email)).limit(1)
    if (existing)
      throw createError({ statusCode: 409, statusMessage: '此電子郵件已註冊，請使用登入。' })
    await database.insert(agencies).values({ name: input.name, email, license: input.license, lineUrl: input.lineUrl })
  }
  else {
    const [existing] = await database.select({ id: buyers.id }).from(buyers).where(eq(buyers.email, email)).limit(1)
    if (existing)
      throw createError({ statusCode: 409, statusMessage: '此電子郵件已註冊，請使用登入。' })
    await database.insert(buyers).values({ name: input.name, email })
  }

  return issueMagicLink({ database, event, email, role: input.role })
})
