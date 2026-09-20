import { eq } from 'drizzle-orm'
import { getQuery } from 'h3'
import { useDatabase } from '../../database/client'
import { agencies, authTokens } from '../../database/schema'
import { sha256 } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token
  if (typeof token !== 'string')
    return sendRedirect(event, '/login?error=invalid')

  const database = useDatabase(event)
  const hash = await sha256(token)
  const rows = await database.select().from(authTokens).where(eq(authTokens.tokenHash, hash)).limit(1)
  const authToken = rows[0]

  if (!authToken || authToken.expiresAt <= new Date().toISOString()) {
    if (authToken)
      await database.delete(authTokens).where(eq(authTokens.tokenHash, hash))
    return sendRedirect(event, '/login?error=expired')
  }

  const agencyRows = await database.select().from(agencies).where(eq(agencies.email, authToken.email)).limit(1)
  const agency = agencyRows[0]
  if (!agency)
    return sendRedirect(event, '/login?error=missing')

  await database.delete(authTokens).where(eq(authTokens.tokenHash, hash))
  await setUserSession(event, { user: { id: agency.id, name: agency.name, email: agency.email } })

  return sendRedirect(event, '/admin')
})
