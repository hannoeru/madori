# Madori

Madori is a zh-TW property-search site for new and resale condominiums and detached houses in Tokyo’s 23 wards. It includes a single-administrator dashboard for managing Properties, their media, and their publication lifecycle.

## Stack

- Nuxt 4, Nuxt UI, Tailwind CSS, VueUse, Nuxt SEO
- Drizzle ORM with Cloudflare D1
- Cloudflare R2 for Property images
- Cloudflare Workers module deployment

## Development

```bash
pnpm install
pnpm dev
```

The D1 and R2 bindings only exist under a Cloudflare runtime, not `pnpm dev`. To run against local D1, build then use wrangler:

```bash
pnpm build
npx wrangler dev --env preview --local
```

Run validation:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Database migrations

Generate a Drizzle migration after changing `server/database/schema.ts`:

```bash
pnpm exec drizzle-kit generate
```

Apply it to Cloudflare D1:

```bash
pnpm exec wrangler d1 migrations apply madori-preview --remote --env preview
pnpm exec wrangler d1 migrations apply madori-production --remote --env production
```

Seed the station/line master (`db/seed.sql`):

```bash
pnpm exec wrangler d1 execute madori-preview --local --env preview --file=db/seed.sql
pnpm exec wrangler d1 execute madori-preview --remote --env preview --file=db/seed.sql
pnpm exec wrangler d1 execute madori-production --remote --env production --file=db/seed.sql
```
