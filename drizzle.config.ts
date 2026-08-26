import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url: './.wrangler/state/v3/d1/miniflare-D1DatabaseObject/madori-preview.sqlite',
  },
  dialect: 'sqlite',
  out: './migrations',
  schema: './server/database/schema.ts',
})
