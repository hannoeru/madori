# Buyer and Inquiry independent review

## Scope and status

The environment reports `PI_PROVIDER=openai` and `PI_MODEL=gpt-6.1-sol`.

This report covers Buyer saved Properties, Inquiry submission and history, the Agency inbox, and the current `PropertyInquiry` identity watcher and operation epoch. It uses the terms in `CONTEXT.md`.

There are two open findings. The earlier Inquiry draft identity finding is resolved in the current source. No new actionable defect was found in that fix.

This report is the only file changed by this review task. No application source was changed. No tests, full checks, deployment commands, or email sends were run during this report update. The coordinator is running consolidated checks. Dependency, schema, and notification queue work already assigned to the Agency helper is outside these findings.

Line references describe the source read for this update. Other helpers can change these locations after publication.

## Open findings

### BIR-01: Private Inquiry views do not reset on a live identity change

Priority: P1.

Locations:

- [`app/pages/buyer/inquiries.vue:7–9`](../../app/pages/buyer/inquiries.vue#L7), the page and its `useFetch` request.
- [`app/pages/admin/inquiries.vue:8–11`](../../app/pages/admin/inquiries.vue#L8), the inbox request and local read-operation state.
- [`app/pages/admin/inquiries.vue:14–28`](../../app/pages/admin/inquiries.vue#L14), asynchronous read-state completion without an initiating-identity guard.

The requests depend on their endpoint and page number, not the active Buyer or Agency identity. Neither page clears its private response when the session changes. Route middleware checks entry to the route, but does not watch identity changes in a page that remains mounted. HTTP `no-store` headers do not reset component memory.

#### Reproducible trigger

1. Mount the Buyer history page with Buyer A's session and load A's Inquiries. For the Agency variant, mount the inbox with Agency A and load its messages and Buyer contact details.
2. Keep that page mounted. Refresh or replace the active session with Buyer B or Agency B. A focused Vue harness can change the shared session ref to reproduce this transition without navigating.
3. Observe the page before pressing refresh. The old response is still the page's `data`; the request options have no identity dependency that would clear or replace it.
4. Repeat with A's history or inbox request still pending when the identity changes. Its response has no application-level owner check before it becomes the rendered response.
5. For the inbox, leave a mark-read request pending during the identity change. Its success, failure, and final cleanup can still change local state after the initiating identity is no longer active.

#### Impact

A mounted page can display the previous account's private Inquiry messages under the new session. The Agency inbox can also retain Buyer names and email addresses. Late completions can reintroduce old-account state. Backend ownership checks remain separate and are not shown to be bypassed by this finding.

#### Required correction

Tie the private response and read-operation state to the current principal. Clear and hide old private data synchronously when that principal changes. Abort or discard responses and local read-operation completions from the previous principal. Reset pagination and operation errors where needed.

A reactive fetch key alone is not sufficient evidence of isolation. Verify that old data is not displayed while the new request is pending.

#### Evidence and limits

This is a source-level finding. The reviewed scripts have no session watcher, identity-dependent request key, or owner gate around the rendered response. The earlier review also inspected the installed Nuxt fetch implementation.

This finding is limited to a live identity change while the view stays mounted. It does not claim that ordinary route remounts reuse another account's history. Installed Nuxt defaults purge standard async data on unmount, so the absence of an explicit `refreshNuxtData` call after submission is not, by itself, a stale-history defect.

A real-browser account-transition check remains outstanding.

### BIR-03: Saving can report failure after the save commits

Priority: P2.

Locations:

- [`server/api/buyer/saved/[id].put.ts:12–18`](../../server/api/buyer/saved/[id].put.ts#L12), the guarded insert.
- [`server/api/buyer/saved/[id].put.ts:20–26`](../../server/api/buyer/saved/[id].put.ts#L20), the separate published-only confirmation query and 404 response.
- [`app/composables/useSavedProperties.ts:119–120`](../../app/composables/useSavedProperties.ts#L119), the client failure message after a rejected request.

The insert correctly checks that the Property is Published at the write boundary. The confirmation is a later database operation that checks current publication again. A withdrawal between these operations changes the response without undoing the accepted save.

#### Reproducible trigger

1. Start with a Published Property that Buyer A has not saved.
2. Submit `PUT /api/buyer/saved/{propertyId}` as A.
3. Let the `INSERT ... SELECT` commit a Saved Property, then pause the handler before its confirmation query.
4. Withdraw the Property through the owning Agency.
5. Resume the confirmation query. Its join requires `properties.status = 'published'`, so it returns no row.
6. Observe a 404 response, although A's Saved Property exists. A later saved-list request returns the unavailable entry.

A controlled database interleaving or database-adapter hook can reproduce this without elapsed-time assumptions.

#### Impact

The API reports that the save failed after it has persisted. The client keeps its old saved IDs and displays a failure message. Retrying while the Property remains withdrawn repeats the 404. The Buyer must refresh the collection to discover and remove the entry.

#### Required correction

Make the write and confirmation one atomic database operation or batch, or return the accepted insert result without a later visibility check that can turn success into failure. Preserve the rule that a new save cannot start from an unpublished Property.

#### Evidence and limits

The earlier review reproduced this SQL interleaving in an in-memory SQLite database. It produced one persisted Saved Property and no confirmation row, which takes the handler's 404 branch. That check was not a real D1 endpoint or browser test, and it was not rerun during this report update.

## Resolved finding and current fix review

### BIR-02: An Inquiry draft could cross Buyer accounts

Previous priority: P1.

Status: resolved in the current source, subject to the coordinator's consolidated checks.

Current locations:

- [`app/components/PropertyInquiry.vue:16–28`](../../app/components/PropertyInquiry.vue#L16), the Buyer identity and synchronous reset watcher.
- [`app/components/PropertyInquiry.vue:30`](../../app/components/PropertyInquiry.vue#L30), unmount invalidation.
- [`app/components/PropertyInquiry.vue:32–47`](../../app/components/PropertyInquiry.vue#L32), start and submit guards.
- [`app/components/PropertyInquiry.vue:49–67`](../../app/components/PropertyInquiry.vue#L49), the operation epoch and guarded asynchronous completions.
- [`tests/inquiry-component.test.mjs`](../../tests/inquiry-component.test.mjs), the six compiled-component regressions.

#### Original reproducible trigger and impact

1. Mount the Property Inquiry component as Buyer A.
2. Open the modal and enter A's private message.
3. Change the active session to Buyer B without unmounting the component.
4. Submit the retained message.

In the earlier isolated component-script check, A's draft remained in the modal and the submission used B's active identity. The component could also accept a late response from A's request after the session changed. This could disclose A's draft and attribute that message to B.

#### Identity watcher review

The new `buyerId` is non-null only when the session is ready, logged in, and has the Buyer role. The watcher uses `flush: 'sync'`.

Each identity transition increments `operationEpoch`, closes the modal, clears the draft and captured Property, removes the submission key and confirmation, clears errors, and releases the local submitting state. Initial empty state makes an immediate watcher unnecessary.

Both `startInquiry` and `submit` reject calls without a current Buyer identity. A stale form callback cannot submit while the session is a guest or Agency account.

The synchronous watcher also handles Buyer A to B to A transitions in the same tick. Comparing only the final Buyer ID would not distinguish the old A operation from the new A session. Incrementing the epoch at each transition does.

#### Operation epoch review

Each submission captures a newly incremented epoch. Success, failure, and `finally` update state only if that epoch still matches.

This prevents an old response from installing its confirmation, an old failure from exposing its error, and an old `finally` from unlocking a newer submission. `onBeforeUnmount` also increments the epoch so a completion cannot update the component after disposal.

For the same Buyer, a failed submission retains its message and submission key. The fix therefore preserves retry idempotence instead of creating a new key after every failure.

The epoch does not cancel a server-side Inquiry already accepted under the initiating session. That is expected. The accepted Inquiry remains in the initiating Buyer's history. Preventing stale local state is not equivalent to deleting an accepted Inquiry.

#### Regression evidence

The coordinator reports that all six real-Vue component regressions passed. This review read their source but did not rerun them.

The tests compile the current SFC with `@vue/compiler-sfc` and mount it with Vue's custom renderer. UI components are test substitutes, and `$fetch` uses deferred promises. They exercise:

1. Buyer A to B reset, ignoring A's late success, and retaining B's active submission lock.
2. Same-tick A to B to A transitions with an old success.
3. Same-tick A to B to A transitions with an old failure.
4. Same-Buyer retry preservation, logout reset, rejection of a stale form callback, and removal of previous confirmation state.
5. Switching a pending submission to a guest session.
6. Switching a pending submission to an Agency session.

These are component regression checks, not a real-browser or production-email test. The current source addresses the original defect. No new actionable defect was found in the watcher or epoch implementation.

## Other reviewed behavior and evidence

The earlier review read the shared Buyer and Inquiry contracts, saved-state composable and buttons, Buyer account/saved/history pages, Agency inbox, saved and Inquiry endpoints, submission/history/read utilities, notification helper, and focused tests.

Earlier checks in this session, before the current no-tests report update:

- All seven tests in `tests/inquiry.test.mjs` passed. They use an in-memory database and notification substitutes.
- An additional isolated check submitted the same Property, submission key, and identical message as two different Buyers. It produced two different Inquiry IDs, two records, and two notification-substitute calls. No real email was sent.
- The saved/withdraw interleaving reproduced BIR-03.
- The isolated component-script identity check reproduced the original BIR-02 before its fix.

Source review found the following protections in the reviewed implementation:

- Saved-state responses are owner-gated, and asynchronous saved-state results check their initiating state object before applying changes.
- Saved Property writes use the authenticated Buyer, not submitted Buyer IDs.
- Inquiry creation captures the current Published Property, owning Agency, verified Buyer contact, and Property title/number in its guarded insert.
- The Inquiry payload fingerprint includes Buyer ID. Identical messages from different Buyers do not collide.
- Reusing one Buyer's submission key with changed content conflicts. A valid retry remains recognizable after Property deletion sets the foreign key to null.
- Buyer history and Agency inbox queries constrain the requesting owner. Read-state updates constrain the receiving Agency and preserve the first read timestamp.
- Withdrawal hides the current Property reference while Inquiry title/number snapshots remain available. Deletion does not remove the Inquiry.
- Notification failure does not delete the Inquiry. The UI distinguishes saved state, provider acceptance, notification failure, and Agency read state.

These observations do not close the two open findings or replace browser checks. Notification recovery and queue changes assigned elsewhere need their own final verification against the integrated source.

## Missing browser and integrated-runtime evidence

The following are verification gaps, not additional confirmed defects:

- Real-browser identity transitions on mounted Buyer history, Agency inbox, and Property Inquiry views.
- Modal behavior, focus, keyboard use, and responsive layout with the actual Nuxt UI components.
- Same-Buyer lost-response retry and new-Inquiry recovery through the complete workflow.
- Saved-list state after a concurrent withdrawal and after a failed refresh.
- History navigation immediately after submission, pagination, and visible Agency read-state updates.
- Real D1 behavior for the saved/withdraw interleaving and the final integrated notification queue.
- Permitted real-email receipt and delivery evidence. Provider acceptance alone is not proof of receipt.

The coordinator owns these workflow and consolidated checks. No additional commands are requested or run by this report.
