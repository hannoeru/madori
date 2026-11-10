# Plan 004: Limit Owner login attempts

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before the next step. If a STOP condition occurs, stop and report. Do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2d3bfef..HEAD -- server/api/auth/login.post.ts wrangler.jsonc worker-configuration.d.ts tests/site.test.mjs`
> Earlier plans in `plans/README.md` can change these files. If a file changed, compare the "Current state" excerpts with the live code. If the excerpted code is different, treat this as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-worker-tests-in-ci.md
- **Category**: security
- **Planned at**: commit `2d3bfef`, 2026-11-10

## Why this matters

One password controls every Listing, the login page is linked from the public footer, and the login route accepts unlimited attempts. A limit per IP address makes online guessing much slower. Cloudflare's rate limit binding needs no database and no new package.

The limit is approximate. Cloudflare counts per location and the counts are eventually consistent, so requests can exceed the limit. It reduces guessing, but the password must still be long and random.

## Current state

`server/api/auth/login.post.ts:10-17`:

```ts
export default defineEventHandler(async (event) => {
  const { adminPassword } = useRuntimeConfig(event)
  if (!adminPassword)
    throw createError({ statusCode: 500, statusMessage: '尚未設定管理密碼。' })

  const parsed = v.safeParse(loginSchema, await readBody(event))
  if (!parsed.success || await digest(parsed.output.password) !== await digest(adminPassword))
    throw createError({ statusCode: 401, statusMessage: '密碼不正確。' })
```

- `wrangler.jsonc` has a top-level binding block and separate `env.preview` and `env.production` blocks. Named environments do not inherit bindings, so the new binding must be in all three.
- Binding access pattern: `server/utils/storage.ts` reads `event.context.cloudflare?.env.LISTING_IMAGES` and throws a 500 error when it is missing.
- `app/pages/login.vue` shows the server's `statusMessage`, so the page needs no change.
- Installed Wrangler 4.125 supports `ratelimits`. Period must be 10 or 60 seconds. `namespace_id` is a string that contains a positive integer. The call is `await binding.limit({ key })`, which returns `{ success: boolean }`.
- `worker-configuration.d.ts` is generated and tracked. Regenerate it with `pnpm cf-typegen`.

Repository conventions: Nuxt 4 with Cloudflare Workers, antfu ESLint style (no semicolons, single quotes), no code comments unless they explain a constraint. User-facing text is Traditional Chinese. Vocabulary from `CONTEXT.md`: **Owner** is the logged-in agent, **Customer** is a visitor, **Listing** is a home, **Draft** and **Published Listing** are its states, **Property photo** and **Floor plan** are its images.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Regenerate types | `pnpm cf-typegen` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Worker tests | `pnpm test:worker` | exit 0, 0 skipped |

## Scope

**In scope**: the four files in the drift check.

**Out of scope**: password hashing, session lifetime, account lockout, `app/pages/login.vue`, and any remote Cloudflare command.

## Git workflow

- This repository commits directly on `main`, by the maintainer's instruction. Do not create a branch.
- Use one Conventional Commits message, for example `feat: limit owner login attempts`.
- Do NOT push or deploy unless the operator tells you to.
- Do not stage `docs/research/screenshots/`. These files are untracked on purpose.
- Never print or commit the values of `.env` or `.dev.vars`.

## Steps

### Step 1: Add the binding in three places

In `wrangler.jsonc`, add this key after `r2_buckets` at the top level and in `env.preview`:

```jsonc
"ratelimits": [{
  "name": "LOGIN_RATE_LIMIT",
  "namespace_id": "1001",
  "simple": { "limit": 10, "period": 60 }
}]
```

Add the same key to `env.production`, with `"namespace_id": "1002"`. Add the comma that the previous key needs.

**Verify**: `grep -c LOGIN_RATE_LIMIT wrangler.jsonc` -> `3`.

### Step 2: Regenerate the types

Run `pnpm build` if `.output/` does not exist. Then run `pnpm cf-typegen`.

**Verify**: `grep -c "LOGIN_RATE_LIMIT: RateLimit" worker-configuration.d.ts` -> at least `1`.

### Step 3: Check the limit first in the login route

In `login.post.ts`, insert this after the `adminPassword` check and before `readBody`:

```ts
  const limiter = event.context.cloudflare?.env.LOGIN_RATE_LIMIT
  if (!limiter)
    throw createError({ statusCode: 500, statusMessage: '登入服務不可用。' })
  const { success } = await limiter.limit({ key: getHeader(event, 'cf-connecting-ip') ?? 'local' })
  if (!success)
    throw createError({ statusCode: 429, statusMessage: '嘗試次數過多，請一分鐘後再試。' })
```

**Verify**: `pnpm typecheck` -> exit 0.

### Step 4: Add a test as the LAST test in the file

Add this at the end of `tests/site.test.mjs`. It must stay last, because it blocks login for this client for about one minute:

```js
test('too many login attempts are blocked', options, async () => {
  let status
  for (let attempt = 0; attempt < 40 && status !== 429; attempt++)
    status = (await request('/api/auth/login', { method: 'POST', ...json({ password: 'wrong' }) })).status
  assert.equal(status, 429)
})
```

**Verify**: `pnpm test:worker 2>&1 | grep -E '^ℹ (pass|fail|skipped)'` -> one more passed test than before, `fail 0`, `skipped 0`.

### Step 5: Confirm that development login still works

Run `NUXT_ADMIN_PASSWORD=<a random value> pnpm dev --port 3010`. Poll `/login` until it returns 200. POST the correct password as JSON to `/api/auth/login`.

**Verify**: the response status is 200. Stop the dev server.

## Test plan

One new test proves that repeated wrong passwords get a 429 response. The test loops up to 40 times because the limit is approximate.

## Done criteria

- [ ] `pnpm lint` and `pnpm typecheck` exit 0
- [ ] `pnpm test:worker` exits 0 with the new test passing
- [ ] Step 5 returned 200
- [ ] `git status --short` shows only in-scope files and the untracked `docs/research/screenshots/`
- [ ] `plans/README.md` status row updated

## STOP conditions

- The binding is missing in `pnpm dev`, so login returns the 500 error. Report this. Do not add a bypass.
- The test never gets a 429 response from the local Worker. The local emulator may differ, so report it. Do not raise the loop count or remove the test.
- The regenerated `worker-configuration.d.ts` removes existing bindings.

## Maintenance notes

- If more tests log in, keep the total below 10 logins per minute before the last test.
- The maintainer should use a long random admin password. The limit does not replace it.
