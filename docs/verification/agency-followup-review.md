# Agency fixes and saved Property follow-up review

## Scope and result

The environment reports `PI_PROVIDER=openai` and `PI_MODEL=gpt-6.1-sol`.

This independent source review checked the six original Agency defects against the current implementation and [`agency-review-fixes.md`](agency-review-fixes.md). It also checked the BIR-03 saved Property fix and its actual-handler SQLite regression.

All six original Agency defect triggers are addressed. BIR-03 is also addressed. One related upload recovery defect remains, AFR-01 below. It is separate from the original failure to retain old-object deletion keys after an R2 cleanup error.

Only this report was written. No application source edits, tests, builds, deployments, email sends, or database mutations ran during this review. Test results below are helper-reported results. This review inspected the test source but did not rerun it. The coordinator owns consolidated checks and browser verification.

## Residual finding

### AFR-01: An upload can create an R2 object before its recovery key is durable

Priority: P2.

Locations:

- [`server/api/admin/properties/[id]/images.post.ts:16-29`](../../server/api/admin/properties/[id]/images.post.ts#L16), R2 creation before the metadata batch.
- [`server/api/admin/properties/[id]/images.post.ts:34-36`](../../server/api/admin/properties/[id]/images.post.ts#L34), compensation insertion before cleanup.
- [`server/utils/property-media-cleanup.ts:39-41`](../../server/utils/property-media-cleanup.ts#L39), the compensation write.
- [`server/utils/property-media-cleanup.ts:62-65`](../../server/utils/property-media-cleanup.ts#L62), retry discovers objects only through persisted queue entries.

#### Reproducible trigger

1. Authenticate as the owning Agency and let the handler read an existing Property.
2. Let `bucket.put(imageId, ...)` succeed.
3. Fail the subsequent D1 metadata batch because D1 writes are unavailable.
4. Keep the same write failure active when the catch block calls `queueUploadCompensation`.
5. That awaited insertion throws. The handler exits before calling `cleanupForAgency`.
6. Restore D1 and request the Agency's cleanup count and retry. Neither the metadata nor the queue contains the new object key, so retry cannot find the object.

A deterministic handler regression can use a bucket substitute that retains the uploaded key and a D1 binding that fails both writes after the successful put. No timing delay is needed. This review did not run that regression.

#### Impact

A single D1 write outage after the R2 put leaves an unreferenced object with no durable cleanup record. A new upload retry uses a different image ID and does not recover the old object. The cleanup UI can report no pending work while the orphan remains in R2. This causes storage leakage; it does not establish public access to the orphan.

Process interruption after the put and before the compensation record has the same persistence gap.

#### Required correction

Persist recoverable upload intent before creating the R2 object. Protect active uploads from concurrent cleanup, and finalize that intent with the metadata change. Recording compensation only after an unsuccessful metadata operation cannot retain the key when that compensation write also fails.

#### Evidence and limits

This is a source-level failure-path finding, not a reproduced provider outage. The existing regression at [`tests/agency.regression.test.mjs:162`](../../tests/agency.regression.test.mjs#L162) rolls back a failed D1 batch, then successfully inserts upload compensation. It checks an R2 failure after that insert. It does not cover failure of the compensation insert itself or interruption before that insert.

## Re-review of the six original Agency defects

### 1. Decimal area inputs

Status: the original defect is addressed.

[`app/components/AdminPropertyForm.vue:270-279`](../../app/components/AdminPropertyForm.vue#L270) sets `step="any"` on condominium floor area and detached-house land and building area inputs. The existing schema accepts finite positive decimal areas, and conversion uses `Number` rather than integer parsing.

The installed Nuxt UI Input forwards input attributes to its native input. The new step attribute therefore removes the native integer-step barrier that previously prevented `submit()` from running for values such as `58.3`.

[`tests/agency.regression.test.mjs:244`](../../tests/agency.regression.test.mjs#L244) checks all three controls. The local API tests persist decimal areas, but those API calls do not prove browser constraint validation. No residual source defect was found in this fix. A native-form browser submission remains a coordinator check.

### 2. Undecodable JPEG acceptance

Status: the original defect is addressed.

[`server/utils/property-image.ts:100-116`](../../server/utils/property-image.ts#L100) uses `jpeg-js` decoding instead of the former JPEG marker parser. Its options request typed RGB output, disable tolerant decoding, and set a 2 MP resolution limit and a 32 MiB decoder memory limit. The handler also checks dimensions and the decoded RGB byte count. It rejects decoding failures with a 400 response.

The installed package README and TypeScript overloads confirm these options. The memory option bounds the decoder's approximate allocation accounting; it is not a hard cap on all Worker memory.

[`tests/agency.regression.test.mjs:76-101`](../../tests/agency.regression.test.mjs#L76) covers the original fabricated 28-byte JPEG, missing end bytes, valid decoding, resolution rejection, and memory rejection. The API test checks accepted JPEG bytes through the local image-serving endpoint. Upload instructions state the new JPEG limits in [`app/components/AdminPropertyImages.vue:102-104`](../../app/components/AdminPropertyImages.vue#L102).

No residual source defect was found against the original malformed-JPEG trigger. Built-Worker behavior and resource limits were not measured by this review.

### 3. Lost cleanup state after R2 deletion failure

Status: the original removal and replacement defect is addressed. AFR-01 is a separate upload recovery gap.

[`server/utils/property-media-cleanup.ts:4-36`](../../server/utils/property-media-cleanup.ts#L4) queues old object keys with the corresponding metadata removal. The image-removal, Floor plan replacement, and permanent-Property-deletion handlers execute these statements in D1 batches before cleanup.

[`migrations/0002_agency_media_cleanup.sql`](../../migrations/0002_agency_media_cleanup.sql) stores the owning Agency and has no Property foreign key. Permanent Property deletion therefore does not cascade away cleanup work.

[`server/utils/property-media-cleanup.ts:56-75`](../../server/utils/property-media-cleanup.ts#L56) selects at most 100 unreferenced keys for the session Agency, deletes them from R2, and removes queue entries only after R2 succeeds. R2 failure leaves the keys. Queue-removal failure also leaves the keys, which supports another idempotent R2 deletion attempt. The handler reports `cleanupPending` without reversing a completed domain mutation.

The count and retry endpoints derive authority from `requireAgencySession`, not request-body Agency IDs:

- [`server/api/admin/media-cleanup.get.ts:5-9`](../../server/api/admin/media-cleanup.get.ts#L5).
- [`server/api/admin/media-cleanup.post.ts:3-6`](../../server/api/admin/media-cleanup.post.ts#L3).

[`app/components/AdminMediaCleanup.vue`](../../app/components/AdminMediaCleanup.vue) provides the pending count and retry action. The reviewed retries cannot select another Agency's queue. A referenced image is excluded from R2 deletion.

Regression source at [`tests/agency.regression.test.mjs:114-221`](../../tests/agency.regression.test.mjs#L114) covers failure retention, isolation, successful retry, transaction rollback, queue-removal failure, referenced-image protection, and Property deletion. This addresses the original old-object cleanup loss. It does not close AFR-01.

### 4. Stale Floor plan caption accepted as success

Status: the original defect is addressed.

[`shared/admin-property.ts:88-93`](../../shared/admin-property.ts#L88) accepts a Floor plan ID with its caption. [`server/api/admin/properties/[id]/images.patch.ts:20-24`](../../server/api/admin/properties/[id]/images.patch.ts#L20) rejects a missing or already stale target before the batch.

The important race check is inside [`server/utils/property-image-settings.ts:8-19`](../../server/utils/property-image-settings.ts#L8). When a Floor plan caption is supplied, the first batch statement requires the exact Floor plan ID to remain present. A mismatch tries to set the required Property title to null. Its constraint failure aborts the batch before photo order, captions, or cover changes commit. The endpoint translates the failure to 409.

This guard does not depend on the presence of photos. [`tests/agency.regression.test.mjs:225-242`](../../tests/agency.regression.test.mjs#L225) replaces the Floor plan after building the settings statements and checks rollback with and without photos. The API test also rejects an already stale Floor plan ID.

No residual source defect was found against the original stale-caption race.

### 5. Media controls unlocked before parent reload

Status: the original defect is addressed.

[`app/components/AdminPropertyImages.vue:34-55`](../../app/components/AdminPropertyImages.vue#L34) keeps `busy` true while it awaits the mutation, the parent's `refreshImages`, and Vue's next update. The component emits busy state to the parent and disables caption, order, cover, upload, and removal controls during that interval.

[`app/components/AdminPropertyForm.vue:62-68`](../../app/components/AdminPropertyForm.vue#L62) reloads image data and awaits the Vue update. The binding at line 348 passes this function rather than emitting an unawaited refresh event. Parent submission and deletion functions check `mediaBusy`; publication, withdrawal, deletion, and save buttons also disable on it at lines 354-364.

The catch path distinguishes a saved mutation followed by a failed reload from a failed mutation. It directs the user to refresh rather than stating that the accepted mutation failed.

[`tests/agency.regression.test.mjs:259`](../../tests/agency.regression.test.mjs#L259) compiles the actual component and holds parent refresh on an explicit promise. It verifies the lock, refusal of a second action, replacement of image state before unlock, and retention of a new edit after refresh.

No residual source defect was found in the awaited-refresh fix. This regression calls the compiled setup with Vue reactivity; it is not a browser check of the rendered Nuxt UI controls.

### 6. UTC month rejected a valid Tokyo resale date

Status: the original defect is addressed.

[`shared/admin-property.ts:44-55`](../../shared/admin-property.ts#L44) computes the calendar date with `Asia/Tokyo` and derives the current month from it. Both resale validation and the future-year bound use that month. [`server/utils/admin-property.ts:29-32`](../../server/utils/admin-property.ts#L29) uses the shared validation. The Freshness review queue uses the same Tokyo date at [`server/api/admin/properties.get.ts:35`](../../server/api/admin/properties.get.ts#L35).

[`tests/agency.regression.test.mjs:103-112`](../../tests/agency.regression.test.mjs#L103) checks month and year boundaries while UTC remains in the preceding period. It accepts the current Tokyo resale month and rejects the following month.

No residual source defect was found in the date fix.

## BIR-03 saved Property follow-up

Status: resolved in the current source, subject to consolidated checks.

[`server/api/buyer/saved/[id].put.ts:12-20`](../../server/api/buyer/saved/[id].put.ts#L12) adds `RETURNING` to the guarded Published-Property insert. The handler returns an accepted row directly, so a later withdrawal cannot turn the accepted save into a 404.

If no row was inserted, lines 22-28 query only the authenticated Buyer's existing saved key. This supports an idempotent retry after withdrawal or a change to draft. The result contains only the Property ID and original save date. It does not expose hidden Property facts. A Buyer with no existing key still cannot create a save for an unpublished Property.

[`tests/buyer-saved.regression.test.mjs:31-84`](../../tests/buyer-saved.regression.test.mjs#L31) provides a D1-compatible binding backed by real in-memory SQLite. It imports the actual PUT handler, its Buyer guard, and its Drizzle queries. The binding commits withdrawal immediately after the insert has produced a saved row and before it returns control to the handler. This is an explicit statement interleaving, not a delay or a reimplementation of the handler.

The regression at line 91 checks that the handler returns the accepted key and date, performs no later saved-row confirmation query on the accepted path, retains the same row on retry, and denies a new save by another Buyer after withdrawal. The regression at line 116 checks new draft and withdrawn denial, concurrent Published retries, and independent Buyer keys.

The local integration source also checks retry after withdrawal and draft status, followed by new-save denial after the Buyer removes the unavailable entry. These changes address the earlier response/persistence mismatch. No residual defect was found in the BIR-03 fix.

This follow-up records BIR-03's new status. It does not edit the earlier [`buyer-inquiry-review.md`](buyer-inquiry-review.md), which described the source before this fix.

## Reported checks and remaining evidence

The Agency helper reports 11 offline regressions and 12 local API tests passed in [`agency-review-fixes.md`](agency-review-fixes.md). The Buyer helper reports 11 tests passed across actual-handler SQLite regressions and local API/SSR integration in [`buyer-saved-properties.md`](buyer-saved-properties.md). This review did not independently confirm those results by execution.

Remaining checks are separate from confirmed source defects:

- Rendered decimal-input submission and keyboard behavior in the browser.
- Actual media-control and parent-action locking during a paused reload, including reload failure recovery.
- Cleanup warning, count, and retry behavior with the real UI.
- Built-Worker JPEG decoding and resource behavior.
- AFR-01's deterministic failure-path regression after correction.
- Consolidated lint, typecheck, build, and integrated workflow verification owned by the coordinator.

No missing browser evidence was reported as an additional defect.
