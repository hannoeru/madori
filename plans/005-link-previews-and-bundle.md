# Plan 005: Add link preview images and remove unused server bundle weight

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before the next step. If a STOP condition occurs, stop and report. Do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2d3bfef..HEAD -- nuxt.config.ts app/pages/index.vue 'app/pages/properties/[id].vue' tests/site.test.mjs`
> Earlier plans in `plans/README.md` can change these files. If a file changed, compare the "Current state" excerpts with the live code. If the excerpted code is different, treat this as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: plans/001-worker-tests-in-ci.md
- **Category**: perf
- **Planned at**: commit `2d3bfef`, 2026-11-10

## Why this matters

The agent sells by sending links in LINE, but shared links have no `og:image`, so no photo appears. The server bundle also has about 8.2 MB of a 10 MB total that the site does not use: full icon sets (`icons2.mjs`, 4.7 MB) and the OG image renderer's WASM (3.6 MB). The site uses real photos as previews, so it does not need the renderer. A smaller bundle should also start faster on Workers, but this plan does not measure startup time.

## Current state

`nuxt.config.ts:67-71`:

```ts
  icon: {
    clientBundle: { scan: true },
    serverBundle: { collections: ['lucide', 'simple-icons'] },
    fallbackToApi: false,
  },
```

- `@nuxt/icon` 2.5.0 `loadIcon` calls `initClientBundle` first, also during server rendering. Icons found by the scan therefore do not need the server bundle. `serverBundle` accepts `false`.
- `nuxt-og-image` 6.7.8 comes through `@nuxtjs/seo` and has the option `ogImage: { enabled: false }`.
- `app/pages/index.vue:7-9` has `properties` from `useFetch<PropertySummary[]>('/api/properties')`, newest first, and calls `useSeoMeta({ title: ..., description: ... })`. Each item has `coverImageId: string | null`.
- `app/pages/properties/[id].vue` defines `const photos = detail.images.filter(image => image.kind === 'photo')`, and ends its script with `useSeoMeta({ title: ..., description: ... })`.
- Public images are at `/api/property-images/<id>`.
- ESLint enforces the key order of `nuxt.config.ts`. Use `pnpm exec eslint --fix nuxt.config.ts`.

Repository conventions: Nuxt 4 with Cloudflare Workers, antfu ESLint style (no semicolons, single quotes), no code comments unless they explain a constraint. User-facing text is Traditional Chinese. Vocabulary from `CONTEXT.md`: **Owner** is the logged-in agent, **Customer** is a visitor, **Listing** is a home, **Draft** and **Published Listing** are its states, **Property photo** and **Floor plan** are its images.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `pnpm lint` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Worker tests | `pnpm test:worker` | exit 0, 0 skipped |

## Scope

**In scope**: the four files in the drift check.

**Out of scope**: removing `@nuxtjs/seo`, removing `@iconify-json/*` packages, a generated preview image, and `wrangler.jsonc`.

## Git workflow

- This repository commits directly on `main`, by the maintainer's instruction. Do not create a branch.
- Use one Conventional Commits message, for example `feat: add link preview images and trim the server bundle`.
- Do NOT push or deploy unless the operator tells you to.
- Do not stage `docs/research/screenshots/`. These files are untracked on purpose.
- Never print or commit the values of `.env` or `.dev.vars`.

## Steps

### Step 1: Add tests before you change the config

Add this test to `tests/site.test.mjs`. It must be before `too many login attempts are blocked` if that test exists.

```js
test('server-rendered pages include their icons', options, async () => {
  const page = await (await request('/')).text()
  assert.match(page, /<svg[^>]*iconify|data:image\/svg\+xml/)
})
```

In the existing lifecycle test, after `assert.ok(page.includes(draft.titleZhTw))`, add:

```js
  assert.match(page, new RegExp(`<meta[^>]*og:image[^>]*property-images/${second.id}`))
```

**Verify**: `pnpm test:worker 2>&1 | grep -E '^(✔|✖)'` -> the icon test passes, and the lifecycle test FAILS on the `og:image` assertion only. This shows that the icon test works before the change.

### Step 2: Add the preview image to the detail page

In `app/pages/properties/[id].vue`, change the `useSeoMeta` call:

```ts
const cover = photos.find(image => image.isCover) ?? photos[0]
const origin = useRequestURL().origin
useSeoMeta({
  title: `${detail.titleZhTw}｜瑞哥看房`,
  description: `${detail.ward} ${detail.layout} ${formatManPrice(detail.priceYen)}`,
  ogImage: cover ? `${origin}/api/property-images/${cover.id}` : undefined,
})
```

Keep the existing title and description text if it differs from this excerpt.

**Verify**: `pnpm test:worker 2>&1 | grep -E '^ℹ fail'` -> `fail 0`.

### Step 3: Add the preview image to the homepage

In `app/pages/index.vue`, add this to the existing `useSeoMeta` argument. Keep the title and description:

```ts
  ogImage: () => properties.value?.[0]?.coverImageId ? `${useRequestURL().origin}/api/property-images/${properties.value[0].coverImageId}` : undefined,
```

If this form fails at runtime because `useRequestURL` runs outside setup, read `const origin = useRequestURL().origin` before the call and use `origin` in the getter.

**Verify**: `pnpm typecheck` -> exit 0.

### Step 4: Trim the bundle

In `nuxt.config.ts`, set `serverBundle: false` in `icon`, and add `ogImage: { enabled: false },`. Then run `pnpm exec eslint --fix nuxt.config.ts`.

**Verify**, after `pnpm test:worker` passes:
- `find .output/server -name '*takumi*' | wc -l` -> `0`
- `test ! -e .output/server/chunks/_/icons2.mjs && echo gone` -> `gone`
- `du -sk .output/server | cut -f1` -> below `5000`
- `grep -c '\[Icon\]' "${TMPDIR:-/tmp}/madori-worker.log"` -> `0`

## Test plan

Two checks are added: the detail page has the cover photo as `og:image`, and server rendering still includes icons.

## Done criteria

- [ ] `pnpm lint` and `pnpm typecheck` exit 0
- [ ] `pnpm test:worker` exits 0
- [ ] All four checks in Step 4 pass
- [ ] `git status --short` shows only in-scope files and the untracked `docs/research/screenshots/`
- [ ] `plans/README.md` status row updated

## STOP conditions

- The icon test fails in Step 1, before the config change. The test does not match the rendered icon format.
- The icon test fails after Step 4, or `[Icon]` warnings appear. Report the icon names. Do not restore the full collections.
- The WASM stays in the output with `enabled: false`, or the build fails because `@nuxtjs/seo` needs the module.

## Maintenance notes

- A new icon must be a static string that the scan can find. An icon name built at runtime will fail, because `fallbackToApi` is false and there is no server bundle.
- LINE caches link previews, so an old link can show the old image for some time after the cover changes.
- The homepage preview shows the newest Listing's cover. A dedicated brand image is a later content decision.
