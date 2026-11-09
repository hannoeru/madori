# Madori

Madori is a Traditional Chinese marketplace for Taiwanese Buyers who search for new and resale condominiums and detached houses in Tokyo's 23 wards.

Buyers have Saved Properties and private Inquiry history. Each Agency has one account and manages only its own Listings, images, Inbox and Freshness review queue. Agencies can publish without administrator approval. An Inquiry persists independently of its email Notification.

## Stack

- Nuxt 4, Nuxt UI 4, Vue, Tailwind CSS, VueUse and Nuxt SEO
- Valibot schemas and nuxt-auth-utils sessions
- Drizzle with Cloudflare D1
- Cloudflare R2 for photos and Floor plans
- Cloudflare Workers module output and an EMAIL binding

Read [CONTEXT.md](CONTEXT.md) for the domain vocabulary.

## Local development

Use the Node and pnpm versions selected by the repository. Copy `.env.example` to an ignored `.env` file and replace the session-password example with a random value of at least 32 characters. Never commit or publish that value.

```sh
pnpm install --frozen-lockfile
```

For a **new local database only**, apply the migrations and load the station/line master:

```sh
pnpm exec wrangler d1 migrations apply DB --local
pnpm exec wrangler d1 execute DB --local --file=db/seed.sql
```

These commands use the top-level local binding. Do not add `--remote` to a local verification command. Inspect an existing database before changing or reseeding it.

Start the development server in a separate terminal:

```sh
pnpm dev --port 3010
```

Development authentication returns a local one-use test link and sends no email. Local Inquiry Notifications report `failed/local-disabled`; this is not delivery evidence.

Register clearly marked local Buyer and Agency accounts with `example.invalid` email addresses. Create demonstration Listings through the Agency form, save a draft, upload original fixtures from `tests/fixtures/`, add Transit entries, then publish. Use at least two Published demos for pagination checks. A SQL Listing seed does not provision image bytes in R2 and is not proof that publication requirements passed.

## Checks

With the local development server running:

```sh
pnpm lint
pnpm typecheck
MADORI_TEST_URL=http://localhost:3010 pnpm test
pnpm build
```

`pnpm test` without `MADORI_TEST_URL` runs offline tests and skips the live API cases. A passing offline run is not full integration evidence. `pnpm test:integration` runs the local API files only.

Test files run serially because they share public fixture totals. Explicit races inside test files still run concurrently. Tests create labeled local fixtures and can change the local database; never point them at a deployed site. Authentication issuance API checks require localhost:3010 and local test links.

## Local production-build inspection

Build first, then start a local Worker:

```sh
pnpm build
WRANGLER_SEND_METRICS=false pnpm exec wrangler dev --local \
  --port 3011 --inspector-port 9239 --log-level warn
```

This is local emulation, not deployment. Development test-link authentication is not enabled in the production build. Do not submit account or Inquiry forms there while email testing is deferred. Development sessions must not be assumed to authenticate against a separately configured build.

## Migrations and remote operations

After an authorized schema change, generate its migration:

```sh
pnpm exec drizzle-kit generate
```

Applying remote migrations, configuring remote secrets, changing bindings or deploying requires explicit authorization for the exact target environment and resources. No such operation is part of the current local verification.

## Evidence and current limits

- [Implementation status](docs/implementation-status.md)
- [Research and UX findings](docs/research/marketplace-ux.md)
- [Design system](docs/research/design-system.md)
- [Coordinator delivery review](docs/verification/delivery-review.md)
- [Public accessibility follow-up](docs/verification/public-accessibility-followup.md)
- [Atomic local authentication issuance](docs/verification/auth-issuance.md)
- [Notification receipt gate and binding preflight](docs/verification/notification-readiness.md)

The current checkpoint passes lint, typecheck, 128 tests and the production build. Desktop/mobile Buyer and Agency workflows have local browser evidence, including original image uploads and publication lifecycle checks.

Actual Notification receipt remains deferred. Complete manual accessibility, real provider/operator interruption recovery and deployed Worker resource limits are not verified. Browser context loss remains unresolved. No email, customer message, deployment or production change occurred. The overall goal is not complete.
