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
