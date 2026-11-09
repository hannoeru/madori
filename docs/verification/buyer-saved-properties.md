# Buyer saved Property verification

## Scope

Implemented only Buyer saved Properties and the responsive Buyer account shell. The environment reported `PI_PROVIDER=openai` and `PI_MODEL=gpt-6.1-sol` before work started.

- `shared/buyer.ts` defines an `available` or `unavailable` Saved Property. The available entry uses the existing `propertySummarySchema`, including image kind, position, and alt text.
- `GET /api/buyer/saved` returns the session Buyer's collection. It retains withdrawn and draft entries with only their Property identifier and save date. It does not return hidden titles, addresses, images, or descriptions.
- `PUT /api/buyer/saved/[id]` creates a new save only for a Published Property. The conditional insert returns its accepted row directly. A repeated request returns the session Buyer's existing saved key and original date, including after withdrawal or a change to draft. No later publication check can turn an accepted save into a failure.
- `DELETE /api/buyer/saved/[id]` removes only the session Buyer's entry. Removal also works for unavailable entries and repeated requests.
- All saved Property endpoints use the DB-backed `requireBuyerSession` and `private, no-store`. No endpoint accepts a Buyer identifier as authority.
- `SavePropertyButton` accepts `propertyId`. Guests get a Buyer sign-in link. Agency accounts cannot save. Buyer state changes only after the API confirms persistence.
- `useSavedProperties` resets its shared state when the session Buyer changes or logs out. Request results must match the current state instance before they can change that state. This also prevents an old request from restoring data after an account change.
- `BuyerDashboardShell` accepts `title`, optional `description`, and default slot content. It links to saved Properties and Inquiry history. It has desktop account navigation and visible mobile navigation, account details, and logout controls.
- `/buyer/saved` has loading, error, retry, empty, available, and unavailable states. Unavailable entries still have a remove action. `/buyer` uses the same shell.

## Checks run

Focused lint passed with exit status 0:

```sh
./node_modules/.bin/eslint \
  shared/buyer.ts \
  app/components/BuyerDashboardShell.vue \
  app/components/SavePropertyButton.vue \
  app/composables/useSavedProperties.ts \
  app/pages/buyer/index.vue \
  app/pages/buyer/saved.vue \
  server/api/buyer/saved.get.ts \
  'server/api/buyer/saved/[id].put.ts' \
  'server/api/buyer/saved/[id].delete.ts' \
  tests/buyer-saved.integration.test.mjs \
  tests/buyer-saved.regression.test.mjs \
  docs/verification/buyer-saved-properties.md \
  docs/verification/browser-runtime.md
```

Real local API and SSR integration passed on 2026-10-09:

```sh
MADORI_TEST_URL=http://localhost:3010 node --test \
  tests/buyer-saved.regression.test.mjs \
  tests/buyer-saved.integration.test.mjs
```

The final run reported 11 tests, 11 passed, 0 failed, and 0 skipped. This count includes the integration parent test, eight integration subtests, and two SQLite regression tests. The run took approximately five seconds.

The test uses two Buyers, one Agency, and a guest against the existing Nuxt server, local D1, and local R2. It covers:

- Guest and Agency denial for read, save, and remove.
- Draft and missing Property denial, followed by successful publication and save.
- Four concurrent saves, one collection entry, and an unchanged save date.
- Independent Buyer collections and ignored Buyer identifiers in request bodies and queries.
- Foreign-origin mutation denial without collection changes.
- Persistence across request clients, login account changes, and logout.
- SSR collection privacy, the Inquiry history link, and no-index metadata.
- Withdrawn and draft entry privacy in API responses, HTML, and Nuxt payloads. Repeated PUT requests retain their existing owned key and date without returning hidden facts.
- Restoration with current Published facts and the original save date.
- Removal of unavailable entries, repeated removal, and the empty state.

Published fixtures include complete Applicable facts, a Transit entry, and the original labeled `interior-demo.png` and `floor-plan-demo.png`. The test withdraws and deletes its Property fixtures and media. Local test accounts remain. Authentication uses development links and `example.invalid` addresses. No email was sent, and no token links appear in this document.

The test caught a D1 batch result column collision between the Saved Property and Property `created_at` fields. The Saved Property date now has a distinct SQL alias. The final test confirms the correct date for both available and unavailable entries.

## Accepted-save withdrawal regression

The independent review's BIR-03 finding identified a separate Published-only confirmation query after the save committed. Withdrawal between those operations caused a false 404 response.

`tests/buyer-saved.regression.test.mjs` imports and executes the actual PUT handler and its Drizzle D1 queries. A test D1 binding executes those queries against real in-memory SQLite with the existing migrations. Immediately after the insert statement completes and its saved row exists, the binding commits a Property withdrawal before it returns control to the handler. The test uses an explicit statement boundary, not a delay.

The regression failed with the original handler's 404 response. It passes with the accepted insert row returned directly. It also verifies:

- The response contains only the Property identifier and original save date.
- An accepted insert does not need a subsequent saved-row confirmation query.
- The same Buyer's retry succeeds after withdrawal and keeps one row and the original date.
- A second Buyer cannot create a new save for that Withdrawn Listing.
- New withdrawn and draft saves are denied without persistence.
- Repeated Published saves keep one owned key; another Buyer has an independent key.

The local API integration also verifies successful repeated PUT responses after withdrawal and a change to draft, followed by new-save denial after the Buyer removes the unavailable key. The deterministic statement-interleaving regression uses real SQLite, not a remote D1 service or a timed concurrent request to the local server. Expected negative-path tests emit the existing H3 warning about long `statusMessage` values; all assertions pass.

## Remaining verification

The coordinator owns full typecheck, build, and browser verification. This helper did not run those checks, restart the development server, change schema or configuration, commit, or deploy.

Browser checks must still cover narrow and wide layouts, keyboard navigation, the public save button, client-side session cache reset, and action errors with retry. API and SSR integration does not prove those browser behaviors.

The existing foreign key deletes a Saved Property when its Property is permanently deleted. This implementation retains unavailable entries while the Property still exists. It does not add a deletion snapshot or change the schema.
