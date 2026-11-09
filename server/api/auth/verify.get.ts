import { and, eq, gt } from 'drizzle-orm'
import { useDatabase } from '../../database/client'
import { agencies, authTokens, buyers } from '../../database/schema'
import { sha256 } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token
  if (typeof token !== 'string' || token.length > 200)
    return sendRedirect(event, '/login?error=invalid')

  const database = useDatabase(event)
  const [authToken] = await database.delete(authTokens).where(and(
    eq(authTokens.tokenHash, await sha256(token)),
    gt(authTokens.expiresAt, new Date().toISOString()),
  )).returning()
  if (!authToken)
    return sendRedirect(event, '/login?error=expired')

  const table = authToken.role === 'agency' ? agencies : buyers
  const [account] = await database.select({ id: table.id, name: table.name, email: table.email }).from(table).where(eq(table.email, authToken.email)).limit(1)
  if (!account)
    return sendRedirect(event, '/login?error=missing')

  await replaceUserSession(event, { user: { ...account, role: authToken.role } }, { maxAge: 7 * 24 * 60 * 60 })
  return sendRedirect(event, authToken.role === 'agency' ? '/admin' : '/buyer')
})
