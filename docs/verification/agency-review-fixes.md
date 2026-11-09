# Agency review-fix verification

## Current fixes

1. All three area number controls in `AdminPropertyForm.vue` use `step="any"`. The API test persists condominium area 58.3 m² and detached-house areas 90.7 and 85.2 m².
2. `server/utils/property-image.ts` uses `jpeg-js` 0.4.4 for strict full JPEG decoding. It requests typed `Uint8Array` RGB output, disables tolerant decoding, and sets 2 MP and 32 MiB decoder limits. The custom JPEG parser is removed. The installed package's complete README and TypeScript overloads were checked before implementation.
3. `pending_image_deletions` stores object keys, their owning Agency, and creation time. Replacement and removal queue keys in the same D1 batch as metadata removal. Cleanup attempts run after the commit. Queue entries survive R2 failure and queue-removal failure. Failed-upload compensation is also queued before cleanup. Domain success returns `cleanupPending` rather than an R2 cleanup error. The Agency can inspect its pending count and retry through authenticated endpoints and the Property list action.
4. Image settings include the Floor plan id. The D1 batch checks that id before it changes any caption or photo order. The guard also works for a draft with only a Floor plan. A stale id causes a conflict and batch rollback.
5. `AdminPropertyImages.vue` uses an awaited `refreshImages` function prop. Mutation controls and caption inputs stay locked through parent reload and Vue's next update. Parent status actions use `mediaBusy`. The real compiled component is tested with an explicitly paused refresh promise and a second attempted mutation.
6. Completion-date validation and the Freshness review queue use the shared Tokyo date function. Boundary tests cover a new Tokyo month and year while UTC remains in the previous month or year.

## Dependency and local migration

The Inquiry helper confirmed that its API tests were stopped before the dependency and migration window. After the window, `/api/stations` returned HTTP 200 from localhost:3010. The helper was told that it was safe to resume. No shared server restart ran.

Commands:

```sh
pnpm add jpeg-js --ignore-scripts
pnpm exec drizzle-kit generate --name agency_media_cleanup
pnpm exec wrangler d1 migrations apply madori-preview --local --env preview
```

The dependency command added only `jpeg-js` to the dependency list and lockfile. Existing package scripts remain intact. The generated SQL creates only `pending_image_deletions` and its Agency index. Existing tables remain unchanged. Generated metadata is `migrations/meta/0002_snapshot.json` and the journal entry.

Wrangler reported `Resource location: local`, applied only `0002_agency_media_cleanup.sql`, and reported three successful commands. No remote migration, deployment, cron, or platform resource change ran.

## Focused checks

```sh
node --test tests/agency.regression.test.mjs
MADORI_TEST_URL=http://localhost:3010 node --test tests/agency.integration.test.mjs
```

Results:

| Check | Result |
| --- | --- |
| Offline regression tests | 11 passed, 0 failed, 0 skipped |
| Local API integration tests | 12 passed, 0 failed, 0 skipped |
| Explicit-path Agency ESLint | Passed, no lint warnings |
| Agency diff whitespace check | Passed |

The offline tests use real SQLite transactions and all three migrations. R2 deletion failure is simulated because the working local bucket does not provide a failure-injection API. Tests verify queue retention, Agency isolation, successful retries, rollback, and keys that survive permanent Property deletion. They also inject a real SQLite trigger failure after R2 deletion to verify that cleanup state is retained.

The JPEG tests reject the reviewer's fabricated 28-byte JPEG, accept and retrieve a valid JPEG, reject a resolution above 2 MP, and reject a valid 2 MP JPEG whose full decode exceeds 32 MiB. A 64 MiB decoder run confirms that the memory-bound fixture is otherwise decodable. The small library-generated offline fixtures are original solid-color rasters. No external image source or network is used.

The API test uses actual local D1 and R2, two fresh Agencies, original fixture PNGs, and a derivative JPEG. It also checks authentication on the new cleanup endpoints, stale caption conflicts, safe concurrent Floor plan replacement, publication/deletion races, and withdrawal cache safety.

The H3 version used by the offline test emits a forward-looking warning about non-ASCII `statusMessage` values. This does not fail the tests. No full typecheck or build ran in this pane. The coordinator owns those checks and the final browser checks.

## Browser handoff

Latest Published local demo Property is `jcm0n1zw601uwb6mctjqod1b`. It has two original PNG photo entries, one original PNG Floor plan, and exclusive area 58.3 m². Its title clearly identifies it as a local demonstration. Fixture files, hashes, and nonsecret Agency sign-in details are in `agency.md`.

Earlier handed-off Published fixtures remain unchanged, so the coordinator can keep its existing Inquiry/browser setup.

No auth links, cookies, or other secrets are included in this report.
