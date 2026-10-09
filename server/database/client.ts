import type { H3Event } from 'h3'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export function useDatabase(event: H3Event): ReturnType<typeof drizzle<typeof schema>> {
  const cloudflare = event.context.cloudflare

  if (!cloudflare) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Cloudflare bindings are unavailable.',
    })
  }

  return drizzle(cloudflare.env.DB, { schema })
}
