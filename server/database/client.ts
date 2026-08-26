import type { D1Database } from '@cloudflare/workers-types'
import type { H3Event } from 'h3'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

interface CloudflareEnvironment {
  DB: D1Database
}

interface CloudflareContext {
  env: CloudflareEnvironment
}

export function useDatabase(event: H3Event): ReturnType<typeof drizzle<typeof schema>> {
  const context = event.context.cloudflare as CloudflareContext | undefined

  if (!context) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Cloudflare bindings are unavailable.',
    })
  }

  return drizzle(context.env.DB, { schema })
}
