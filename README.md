# Madori

Madori is a website for one real-estate agent in Tokyo. Taiwanese customers look at the agent's homes in Traditional Chinese and contact the agent by LINE. The agent manages the homes on a password-protected page.

Read [CONTEXT.md](CONTEXT.md) for the domain vocabulary and [docs/product-design.md](docs/product-design.md) for the product scope.

## Stack

- Nuxt 4, Nuxt UI 4, Tailwind CSS and Nuxt SEO
- Valibot schemas and nuxt-auth-utils sessions
- Drizzle with Cloudflare D1
- Cloudflare R2 for images
- Cloudflare Workers

## Agent details

Replace the placeholder values under `agent` in `app/app.config.ts` before launch: name, company, license number, LINE link and introduction.

## Local development

Copy `.env.example` to `.env`. Set `NUXT_SESSION_PASSWORD` to a random value of at least 32 characters, and set `NUXT_ADMIN_PASSWORD`.

```sh
pnpm install --frozen-lockfile
pnpm exec wrangler d1 migrations apply DB --local
pnpm dev --port 3010
```

Open `/login` to manage Listings.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm build
MADORI_TEST_URL=http://localhost:3010 MADORI_TEST_PASSWORD=<admin password> pnpm test
```

The tests need a running local server and change its local database. Do not point them at a deployed site.

## Schema changes

After a change to `server/database/schema.ts`, run `pnpm exec drizzle-kit generate`.

## Deployment

The deployed Worker needs these secrets: `NUXT_SESSION_PASSWORD` and `NUXT_ADMIN_PASSWORD`. Set `NUXT_APP_URL` to the public site address, because the server rejects write requests from any other origin. Apply the migrations to an empty D1 database before the first deployment.
