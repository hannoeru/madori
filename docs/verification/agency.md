# Agency lifecycle verification

## Scope

The Agency implementation provides draft creation and editing, publication, withdrawal, restoration, permanent deletion, ordered photos, cover selection, image descriptions, Floor plan replacement, and an Agency-owned Freshness review queue.

Registration has no approval queue. The integration test verifies that local Agency registration goes directly to `/admin` after email control verification. It does not send email.

Agency lifecycle files changed in this work. Inquiry pages and APIs belong to the coordinator. The authorized review fixes add `jpeg-js` and the Agency-owned `pending_image_deletions` table with generated migration `0002_agency_media_cleanup.sql`. Existing package scripts and existing schema tables remain unchanged by these fixes. No Nuxt configuration, commit, deploy, remote resource, or email change occurred.

## Publication rules

Both property types require structure, total floors, land rights, a supported transaction mode, and at least one valid Transit entry. Publication also requires 1 to 20 photos, one photo cover, exactly one Floor plan, and image descriptions.

Condominiums require positive exclusive area, a nonzero floor no higher than total floors, and nonnegative monthly management and repair-reserve fees. Basement floors are permitted. Zero fees are permitted when confirmed.

Detached houses require positive land and building areas. Condominium-only area, floor, and monthly fee fields do not persist on detached houses.

The API validates Tokyo ward membership, supported transaction modes and land rights, real calendar dates, year-month completion dates, unique valid stations, numeric bounds, and text lengths. Resale completion dates cannot be in the future. Completion dates cannot be more than five years in the future. Review dates can be overdue, but must be valid dates from 2000 through 2100. Completion month, completion-year bounds, and the Freshness review queue use Tokyo time. Area controls use `step="any"` so fractional square metres can pass native form submission.

Missing publication requirements return a named list. Failed publication does not change status or Transit entries.

## Media and transaction behavior

- Uploads use byte validation, not the supplied MIME type. The API accepts 8-bit noninterlaced PNG and 8-bit baseline or progressive JPEG. It rejects SVG and unsupported formats.
- PNG validation checks chunk lengths, CRCs, dimensions, compressed scanline size, and scanline filter types. JPEGs are fully decoded by `jpeg-js` with `tolerantDecoding: false`, `useTArray: true`, and RGB `Uint8Array` output. The custom JPEG parser is removed.
- Each file is limited to 10 MiB and 12,000 pixels on either axis. PNGs are limited to 12 million pixels. JPEG decoding is limited to 2 megapixels and approximately 32 MiB of decoder allocation. The multipart reader limits the request while it reads the stream.
- The API generates R2 object keys. Supplied filenames never select a storage path. The R2 put stores the owning Agency id and a private recovery token with the image. Successful upload responses, image GET, and public summaries do not return the token.
- Upload, update, reorder, cover selection, and delete operations require ownership. A private image GET requires the owning Agency session. Published images are public.
- Image success and 404 responses use `Cache-Control: no-store`. Withdrawal therefore does not leave a long-lived public cache response. Responses also vary on Cookie. Image responses use `nosniff`.
- Property and Transit entry writes use atomic D1 batches. Publication checks media inside the write transaction. Concurrent deletion cannot produce an incomplete Published Property.
- Photo insertion calculates its position and checks the 20-photo limit inside the D1 statement. Concurrent uploads at the limit permit only one insertion.
- Floor plan replacement uploads the validated bytes before its D1 batch. The batch replaces the metadata without changing publication status. An invalid upload keeps the existing Floor plan and status.
- Reordering chooses unused temporary positions from the bounded range `photoCount` through `3 × photoCount − 1`. A materialized SQLite CTE fixes those choices before updates. There are at least `photoCount` free positions in this range, and none overlap the final positions. This works for sparse positions and the maximum signed 64-bit position without an offset or integer overflow. The batch rejects a changed photo collection. It cannot use another Property's images. Caption updates include the Floor plan id and check that identity inside the batch, including drafts with no photos. Stale updates return a conflict without changing captions or order.
- The media component awaits the parent's image refresh before it clears busy state. Upload, caption, reorder, cover, and delete controls stay disabled through that refresh. Parent publication and withdrawal actions are also disabled. A refresh failure reports that the mutation already succeeded, rather than reporting a failed mutation.
- A Published Property cannot lose its last photo or its Floor plan through deletion. Cover deletion selects a remaining photo.
- Permanent deletion requires Withdrawn status and removes image metadata in the same D1 batch. The same batch queues every removed R2 key under its Agency. Floor plan replacement and individual image deletion also queue removed keys in their removal batch.

D1 and R2 do not share a distributed transaction. After domain persistence, cleanup attempts delete up to 100 queued, unreferenced keys. Queue rows are removed only after successful R2 deletion. R2 failure returns domain success with `cleanupPending: true`; it does not discard keys or reverse publication. A failure to remove queue rows also retains them for an idempotent retry. Failed uploads try to queue compensation keys before cleanup. If that write fails, direct R2 cleanup still runs after D1 confirms that the key has no image reference. A failed or unavailable reference check prevents deletion. If direct cleanup cannot complete, the failed response includes the specific key and recovery token with `cleanupQueued: false`. That field means that the queue write was not acknowledged; an ambiguous provider error does not prove that no row exists. The response does not claim normal queue retry can handle the key. These error responses use direct JSON with the failure HTTP status to retain `Cache-Control: no-store`.

`GET /api/admin/media-cleanup` returns the session Agency's pending count. `POST /api/admin/media-cleanup` retries only that Agency's queued keys. The Property list provides the retry action. Referenced media is never deleted by this operation. Queued bytes are not accessible through image GET because removed images no longer have metadata. No cron, additional platform service, or background cleanup layer is present.

## Specific failed-upload recovery

`POST /api/admin/media-recovery` accepts `objectKey` and `token` from a failed upload. It requires an Agency session. The R2 metadata must match that Agency and token. The helper checks all image references after the R2 lookup and refuses to delete linked media. Invalid or foreign credentials return 404; linked keys return 409; provider failures do not return success. A successful response means R2 acknowledged deletion of that specific key.

The image editor retains each failed-operation credential separately. It provides specific-key retry, private JSON download, and JSON import for later recovery. Downloaded files contain a secret and must remain private. Credentials exist only in the open editor unless the Agency downloads them. Identity changes and view disposal clear the editor credentials. Pending callbacks cannot restore credentials, messages, or images to a changed Agency view. A retired view cannot start new recovery or media operations. The Property form also ignores stale image reloads and mutation callbacks. Global Agency-view cache handling belongs to the coordinator.

No recovery token appears in image GET headers or bytes, Property summaries, or successful upload responses. No schema, dependency, platform service, bucket scan, automatic unlinked-object deletion, or pre-enqueued active upload is required.

## Provider-outage limits

D1 and R2 do not provide one transaction across both services. Complete D1 read failure prevents a safe reference check, so direct recovery waits for D1 to return. An R2 put or delete error can leave its outcome unknown. Recovery does not claim deletion when R2 has not acknowledged it, or when the object and its ownership metadata cannot be verified.

If the Worker stops before compensation and before the client receives or saves the failed response, an unqueued key can be unavailable to the Agency's normal dashboard. R2 ownership metadata remains only if the put completed. A specific key may then require operator-assisted recovery from private R2 metadata. The implementation does not guarantee recovery of lost client credentials or a response that was never delivered. A provider operation that commits late after a reported error also prevents a distributed-transaction guarantee. These cases need operator review; an unlinked object is not proof that an upload has stopped. No automatic scan or deletion is used to hide these limits.

## Checks

The coordinator's final consolidated run passed all 113 tests, with zero failures and zero skips. It includes the current Agency API suite, 22 Agency offline regressions and 6 compiled Agency view-scope cases. The current lint, full typecheck and cloudflare-module build also returned exit 0. Logs are `final-lint.txt`, `final-typecheck.txt`, `final-tests.txt` and `final-build.txt`. Earlier focused counts below describe their earlier checkpoints, not the current total. Browser and actual email receipt remain unverified.

Run the real local integration test with:

```sh
MADORI_TEST_URL=http://localhost:3010 node --test tests/agency.integration.test.mjs
```

The test rejects requests outside `http://localhost:3010`. It uses fresh local Agency accounts on each run and original fixture bytes. It leaves one clearly marked Published demo Property from each successful run for browser checks. Other successful test Listings are deleted. Failed runs can leave marked local test records.

The coordinator will rerun API checks for the current correction. The integration suite includes:

- Invalid dates, Applicable facts, and Transit entries without partial persistence.
- Two-Agency Listing and media isolation.
- Actual PNG and JPEG byte retrieval from local R2.
- False supplied MIME types, SVG, a fabricated undecodable 28-byte JPEG, truncated files, bad PNG CRCs, empty files, and oversized files.
- Photo order, descriptions, cover selection, and rejection of foreign images and Floor plan covers.
- Safe concurrent Floor plan replacement on a Published Property and stale Floor plan caption rejection.
- Session-required cleanup and specific recovery endpoints, foreign or tampered recovery denial, private image metadata, and successful responses without recovery credentials.
- Concurrent uploads at the 20-photo limit and valid cover selection after deletion.
- Agency-owned, Published-only, due-date Freshness review queues.
- Immediate withdrawn image denial with `no-store`, private owner previews, restoration gates, and permanent deletion.
- Concurrent publication and required-image deletion, including unchanged Transit entries after failed publication.
- Detached-house Applicable facts without condominium-only requirements.

`node --test tests/agency.regression.test.mjs` passed 19 offline regression tests. These use real in-memory SQLite migrations and the actual cleanup/settings SQL. Only R2 failure is simulated. They cover strict JPEG decoding, resolution and memory limits, Tokyo month/year boundaries, durable queue retention through R2 and queue-removal failures, rollback compensation, Agency isolation, permanent deletion, stale Floor plan identity, fractional area controls, the compiled media component's awaited refresh contract, queue-write failure with healthy R2, both failures with later authorized recovery, tampered or foreign recovery denial, linked-image protection, unavailable-provider safety, credential retention, stale callback disposal across identity changes, and sparse/high-position ordering through the maximum signed 64-bit position. See `agency-review-fixes.md` for commands and migration evidence.

Focused ESLint passed with no warnings. `git diff --check` passed for the Agency paths. Without `MADORI_TEST_URL`, the integration test exits successfully and skips the local API test.

No full build or full typecheck ran in this pane. The coordinator runs those checks separately. Browser verification remains with the coordinator. API tests do not prove keyboard, responsive layout, or visual behavior.

## Browser fixtures

Latest complete local demo Property:

- Property id: `jcm0n1zw601uwb6mctjqod1b`.
- Title: `示範・本機測試 88b6ce17`.
- Public route: `http://localhost:3010/properties/jcm0n1zw601uwb6mctjqod1b`.
- Owning local Agency email: `agency-88b6ce17-3b59-4028-800b-fe2294f6de20-a@example.invalid`.
- Sign-in role: `agency`. Local authentication provides a development link without email. There is no password.
- Final state: Published, two photos, one Floor plan, and a future review date.

The earlier browser handoff Property `imklqgddi2k5l1k2r1k1fvv1` remains Published and unchanged. Its local Agency email is `agency-292cb70c-5ef5-41fd-bd2d-1515958af54e-a@example.invalid`.

The coordinator supplied these original, clearly labeled fixture PNGs. Both are 960 × 640, 8-bit RGB, noninterlaced:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `tests/fixtures/interior-demo.png` | 18894 | `7bb7f8aa8f8b16d24e7141d27344dd3153b3ef3b1ae7040a255d0d41d1dbcff9` |
| `tests/fixtures/floor-plan-demo.png` | 25306 | `2683c7e713c30e2d8647b88417baa24152f5430d8cfdc676a102d887a64f500a` |

The two final photo entries use the same original interior fixture with distinct labels. They are not photographs of a real sale Property. The Floor plan uses the original Floor plan fixture. Titles, addresses, descriptions, and image labels identify the records as local tests.

The small JPEG embedded in `tests/agency.integration.test.mjs` is a 16 × 16 derivative of the original interior PNG. It was generated with the already installed Sharp package, resized to 16 × 16, and encoded as JPEG. The test does not need Sharp at runtime. That image is deleted during the test and is not part of the final browser demo.

No token links, cookies, or other authentication secrets are included here.
