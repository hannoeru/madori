# Inquiry verification

## Scope

The implementation stores a Buyer's Inquiry before it attempts a Notification. The receiving Agency gets a private inbox. Each Buyer gets its own history. Agency read state is separate from Notification state.

This work changes only these assigned paths:

- `shared/inquiry.ts`.
- `server/utils/inquiries.ts`.
- `server/utils/inquiry-notification.ts`.
- `server/api/buyer/inquiries.get.ts` and `server/api/buyer/inquiries.post.ts`.
- `server/api/admin/inquiries.get.ts`.
- `server/api/admin/inquiries/[id]/read.patch.ts`.
- `app/components/PropertyInquiry.vue`.
- `app/pages/buyer/inquiries.vue` and `app/pages/admin/inquiries.vue`.
- `tests/inquiry.test.mjs`, `tests/inquiry.integration.test.mjs`, `tests/inquiry-component.test.mjs`, and `tests/inquiry-views.test.mjs`.
- This verification file and the related Inquiry check evidence.

The coordinator owns public Property wiring. The Buyer helper owns `BuyerDashboardShell`. The Agency helper owns `AdminDashboardShell` and its navigation. No schema, package, configuration, authentication, or public page change belongs to this implementation.

The model check returned `PI_PROVIDER=openai` and `PI_MODEL=gpt-6.1-sol` before work started.

## Persistence and access rules

`POST /api/buyer/inquiries` requires a current Buyer session. Valibot accepts only `propertyId`, a UUID `submissionKey`, and a trimmed message from 1 to 2,000 characters. Extra recipient, account, and contact fields are rejected.

One atomic `INSERT ... SELECT` checks that the Property is Published and copies its owning Agency, title, and Property number. The same statement copies the current Buyer's name and email from the verified account. A Property withdrawal cannot occur between a separate publication check and the insert because the check and insert are one statement.

Every SQL expression in the insert-select has its database-column alias. This keeps Drizzle's joined select typed without assertions or suppressions. A focused semantic check of `server/utils/inquiries.ts`, using the generated server TypeScript options and ambient declarations, returns zero diagnostics. The insert remains one atomic statement.

The database's unique Buyer/submission-key constraint chooses one winning request. Only that request calls the Notification function. Duplicate submissions return the stored Inquiry without another attempt. The Inquiry ID is a SHA-256 fingerprint of the Buyer, submission key, original Property ID, and normalized message. This permits exact retries and detects changed payloads after Property deletion sets `propertyId` to null. Changed messages or Properties with a reused key return HTTP 409.

All Inquiry API handlers set `Cache-Control: no-store`, including their errors. The Agency inbox and read handler scope every query by the session Agency. History scopes every query by the session Buyer. Query parameters cannot select another account. Lists use 20-item pages with stable creation-time/ID order.

History and inbox use stored Property title/number and Buyer contact snapshots. The Property join returns only the ID of a currently Published Property. A withdrawn or removed Property has no active link and does not disclose its private current title, address, or other details.

`PATCH /api/admin/inquiries/:id/read` changes only `readAt`. Repeated calls retain the first read timestamp. This operation cannot change Notification state.

## Notification behavior and email limit

Nuxt development returns `failed` with the internal reason `local-disabled` before it reads or calls the `EMAIL` binding. Local simulation is not reported as a successful send. No remote binding or email recipient is needed for these checks.

Outside development, the sender uses the existing Cloudflare Email Sending binding architecture. It sends a plain-text Notification with a fixed subject, the verified Buyer reply address, and an Agency inbox link from configured `appUrl`. It never uses request `Host`. User HTML remains plain text and is not placed in an HTML email body.

A missing binding, invalid app URL, rejected send, or send response without a message ID records `failed`. A send result with a message ID records `sent` and `notifiedAt`. `sent` means only that the email service accepted the Notification. It does not prove delivery or receipt. The UI states this limit.

A failed Notification leaves the Inquiry in both private lists. Retrying the same submission does not retry the Notification. There is no Notification resend endpoint. If the process stops after persistence or the status update cannot reach the database, the Inquiry can remain `pending`. The UI does not claim delivery for that state. There is no automatic recovery job in this scope because it would need a separate design for duplicate-send prevention.

Actual email receipt is not verified. It remains blocked until the user authorizes a real test recipient and gives inbox access. This work did not send external email, change remote production data, deploy, or commit.

## Current consolidated result

The coordinator ran all test files against the real local API. All 113 cases passed with zero failures or skips. Current Inquiry cases include 19 compiled view tests, 6 form tests, 7 SQLite/content tests and the local API suite. The additional held-GET test preserves accepted read state when an unread snapshot returns after PATCH succeeds. The view-local accepted-read map clears on identity loss and disposal. Application imports use Nuxt's canonical `#shared/inquiry` alias, which passes the production Nitro build. Full lint and typecheck also pass. See `final-tests.txt`, `final-lint.txt`, `final-typecheck.txt` and `final-build.txt`.

These automated results do not establish real browser painting or actual email receipt.

## UI behavior

The zh-TW Buyer history and Agency inbox use Nuxt UI, semantic colors, responsive cards, explicit empty/error/loading states, retry controls, and pagination. Messages are Vue text interpolation, not HTML. Contact information appears only inside the authenticated Agency inbox.

Both pages use Nuxt `useAsyncData` with reactive keys that contain the role-specific owner ID, identity epoch, and page. `useRequestFetch` forwards the real session for SSR. A synchronous identity watcher clears every cached page for the previous owner/epoch, resets pagination, and creates a new owner object. Displayed data must match both the current session ID and identity epoch. Each request captures its owner before it starts. Results and errors from a lost owner are discarded even when A changes to B and back to A within one Vue tick. Lost role, logout, and lost session readiness disable private fetches and show a sign-in state. Unmount invalidates pending work and clears its private cache.

The Agency read action also captures the owner and displayed inbox. It accepts only a row in the current displayed inbox before sending. After an accepted PATCH, it finds the current owner's displayed row by Inquiry ID and applies the persisted read timestamp. A same-Agency refresh can replace the inbox object without losing that accepted update. A stale owner's result or error cannot mutate the current owner's state. Errors for a replaced inbox are discarded. Its `finally` cleanup cannot unlock a newer read request after an identity change. Identity changes clear read errors and pending read IDs synchronously. Navigation middleware is not the page's client privacy guard.

`PropertyInquiry` accepts `propertyId` and `propertyTitle`. Guests get a Buyer sign-in link. Agency sessions get a disabled action and a Buyer-account explanation. Buyers get a labeled modal with a 2,000-character message bound. For the same Buyer identity, the component preserves the message and submission key after errors and after the modal closes. It captures the selected Property when the draft opens. A confirmed Inquiry permits a new draft to clear the message and generate a new key. A saved Inquiry gets a persistence confirmation with a separate Notification status, including failed and pending states.

A synchronous watcher resets the modal, draft, message, submission key, confirmation, error, and submitting state when the Buyer ID changes, the account loses its Buyer role, session readiness is lost, or the Buyer logs out. Each identity transition and each submission advances an operation epoch. A response, rejection, or `finally` block can change state only while its epoch remains current. A same-tick A-to-B-to-A transition therefore cannot revive A's old response or unlock a newer submission. Component unmount also invalidates pending results.

## Focused checks

Run only on the local development server:

```sh
node --test tests/inquiry.test.mjs tests/inquiry-component.test.mjs tests/inquiry-views.test.mjs
MADORI_TEST_URL=http://localhost:3010 node --test tests/inquiry.integration.test.mjs
node node_modules/eslint/bin/eslint.js shared/inquiry.ts server/utils/inquiries.ts server/utils/inquiry-notification.ts server/api/buyer/inquiries* server/api/admin/inquiries* app/pages/buyer/inquiries.vue app/pages/admin/inquiries.vue app/components/PropertyInquiry.vue tests/inquiry*.mjs
```

The integration suite rejects any origin other than `http://localhost:3010`. Authentication uses local magic links and `example.invalid` accounts. It reuses the existing complete marked Agency fixture when available. If that fixture is absent, it creates a complete marked fixture through the Agency API. New Published fixtures have all condominium publication facts, a Transit entry, an original photo, and an original Floor plan. It does not bypass publication checks.

The latest focused offline run passed all 31 tests with no failures or skips. It includes 18 compiled-view regressions, 6 compiled Inquiry-form regressions, and 7 SQLite/content tests. The separate local API suite passed all 7 cases after the SQL alias change and the authorized `jpeg-js` installation/local Agency media-cleanup migration. The API suite was not rerun for FR-01 because that correction changes only client read-state reconciliation. The API cases cover:

- Recipient routing and session-derived Buyer snapshots.
- Body ID/contact spoof rejection.
- Two-Agency and two-Buyer isolation, guests, cross-role access, foreign-Origin writes, and private no-store errors.
- Exact duplicate keys, simultaneous submissions, and different payloads competing for one key.
- Invalid messages/keys, missing Properties, and unpublished Property rejection without persistence.
- Failed local Notification without data loss and separate idempotent Agency read state.
- Snapshot history after withdrawal and permanent deletion, with no private current Property details.

The SQLite tests use the real schema migrations and Drizzle queries against `node:sqlite`, not a mocked repository. Only the external email attempt is replaced with a controlled callback. They also check an in-flight pending Notification, one attempt for simultaneous first submissions, conflict behavior after deletion, stable pagination, plain-text Notification content, configured links, and safe failure without a binding.

Focused ESLint and `git diff --check` passed for the Inquiry paths. The test run emitted the h3 advisory about long `statusMessage` strings and Vue's Suspense advisory from the compiled-view test host; neither failed a check. No full build or full typecheck ran in this pane. Those remain with the coordinator. The one-file server semantic check is separate from a full typecheck.

## Client identity regression

`tests/inquiry-component.test.mjs` compiles the actual `PropertyInquiry.vue` script and inline template with the installed Vue compiler, then runs it with the real Vue renderer and reactivity. Nuxt session references and HTTP completion are controlled test boundaries. Nuxt UI components use transparent renderer hosts so tests can drive the compiled click, input, and form handlers and inspect rendered modal/message/error/loading state. No component logic, watcher, or identity check is replaced by a test implementation. No package or configuration change is needed.

Before the fix, the first regression failed because Buyer B inherited Buyer A's open modal. After the fix, all six compiled-component cases pass:

- Buyer changes clear the private draft and key; an old success cannot confirm or unlock the new Buyer's pending request.
- A-to-B-to-A changes within one Vue tick invalidate an old success.
- The same identity sequence invalidates an old rejection and `finally` cleanup.
- Same-Buyer retries retain the original payload/key, but logout removes errors and confirmation. A stale form callback cannot submit while logged out.
- Removing the Buyer account discards a pending success.
- Changing to an Agency role discards a pending success.

All six cases pass in the latest 31-test offline run. This check does not replace browser focus/interaction checks with real Nuxt UI components.

## Mounted-view identity regressions

`tests/inquiry-views.test.mjs` compiles each actual page script and inline template and mounts it with real Vue rendering and reactivity. The session and Nuxt data-cache/HTTP boundaries are controlled. The test cache can retain old data on key changes, and held HTTP responses can complete after a clear. Transparent Nuxt UI hosts expose the compiled page's real handlers and rendered content. The application identity watchers, display gates, fetch handlers, and read action are not replaced with test logic.

The regression reproduced both defects before their fixes: Buyer B retained Buyer A's message, and Agency B retained Agency A's message/contact data. All 18 view cases now pass:

- Each view clears old messages/contact data on a live mounted account switch. Display gates reject an old cache value even when that value is available under the current key.
- Each view rejects lost success and lost failure across same-tick A-to-B-to-A changes. A same-owner cache value from an old epoch is also rejected.
- Each view hides private data and stops private requests after logout, role loss, and lost session readiness.
- Each view resets pagination and clears all previous-owner page caches.
- Agency read success and failure cannot mutate detached rows, set a private error, or unlock a new read operation for the same Inquiry ID after A-to-B-to-A.
- Agency changes clear a displayed private read error. A callback for a replaced inbox row cannot start another mutation.
- A same-Agency refresh can return a replacement unread row while PATCH is pending. The accepted PATCH reconciles that current row by ID and shows its read timestamp without another refresh or repeated PATCH.

A separate real HTTP check authenticated the latest local Buyer and Agency, then requested `/buyer/inquiries` and `/admin/inquiries`. Both returned HTTP 200 and rendered their expected private Inquiry content through SSR. This confirms that `useRequestFetch` forwards the session and that the new owner-tagged results render through the real Nuxt server. No tokens or cookies appear in the evidence.

## FR-01 read reconciliation

The deterministic compiled-page regression holds the read PATCH, completes a same-Agency refresh with a new unread inbox object, and then completes the PATCH with its persisted timestamp. Before the correction, the new row's `readAt` remained null. The regression now passes and checks the rendered read timestamp, removal of the read action, and continued denial of the detached callback after acceptance.

The success branch reconciles only the displayed row with the accepted Inquiry ID after the existing owner/epoch/disposal guard passes. It does not mutate the detached row. The before-send membership guard, stale-error guard, and guarded final cleanup remain unchanged. The existing A-to-B-to-A regressions also pass.

FR-01 changes only `app/pages/admin/inquiries.vue`, `tests/inquiry-views.test.mjs`, and this evidence file. No identity protocol, API, schema, package, configuration, authentication, or public page change was added. Focused page/test ESLint and the assigned-path diff check pass. No API or browser request, full check, email, or deployment ran for this correction. Focused work is complete; consolidated checks remain with the coordinator.

## Local browser handoff

The passing API run left these non-secret local records for inspection:

- Existing Agency A Property preserved: `rs8wd4ganbe7beb921xpz772`.
- Agency A login email: `agency-c3ff7236-8216-4af8-a364-f6a335c3769a-a@example.invalid`.
- Buyer A login email: `buyer-inquiry-a35f0c29-ac19-425a-b5be-d8024d85701b-a@example.invalid`.
- Buyer B login email: `buyer-inquiry-a35f0c29-ac19-425a-b5be-d8024d85701b-b@example.invalid`.
- Agency B login email: `agency-inquiry-a35f0c29-ac19-425a-b5be-d8024d85701b-b@example.invalid`.
- Agency B complete Published Property: `alm9mcf1co9jc13og616q0qj`.

The removed A fixture no longer exists. Its Inquiry snapshots remain in Agency A's inbox and Buyer A's history. The original Agency A source Property remains Published and unchanged. An initial test run failed because the test expected IDs and Property numbers in an Agency edit DTO that intentionally omits them. The test now reads those fields from the Agency list. That failed run can leave clearly marked local fixtures; it did not mutate the original source fixture.

## Browser evidence and remaining checks

The browser used a separate named session and only `localhost:3010`. Local authentication set the real session cookie without sending email. Browser checks resumed after the Agency dependency/local-migration window.

| Server-rendered view | Viewport width | Document width | Observed state |
| --- | --- | --- | --- |
| Buyer A populated history | 1,280 px | 1,280 px | Snapshot history, literal script text, no private withdrawn title, and no script element inside the Inquiry list. |
| New Buyer's empty history | 390 px | 390 px | zh-TW empty state and Buyer navigation. |
| Agency B populated inbox | 390 px | 390 px | Buyer contact, failed Notification notice, and explicit read action. |

These checks confirm server-rendered content and the listed overflow measurements. They do not prove client interactions. `document.querySelector('#__nuxt').__vue_app__` remained absent after an explicit 25-second readiness wait. Clicking the server-rendered Inquiry action therefore did not open a hydrated modal. No page exception appeared in the browser error list. Screenshot commands also failed to complete, so no screenshot is presented as evidence.

The coordinator still needs to verify modal opening, focus behavior, field errors, retry preservation, a stable key after an uncertain response, confirmed draft reset, client refresh/read actions, and final visual behavior after shared client readiness is restored. This work does not claim those browser checks passed. No server restart or configuration change occurred in this pane. The browser sessions used for this check were closed or stopped.

Production Notification submission, sender-domain setup, and actual receipt remain untested. The installed generated binding types provide the sender request/result shape. Cloudflare documentation retrieval returned HTTP 403 in this environment. No remote email configuration query or mutation was made. A real sender/recipient/inbox check needs separate user authorization.

Token links and cookies are not included in this document.
