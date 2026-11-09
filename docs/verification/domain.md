# Account and domain verification

## Implemented behavior

Madori has separate Agency and Buyer records. Both use role-bound magic links. Server guards check the session role and current account before private API access. The same email can have both roles without one role's token invalidating the other.

The token verification endpoint consumes an unexpired token in one database operation. Session replacement prevents fields from an earlier role from remaining in the cookie. Registration and login return local test links only in Nuxt development. Development returns before email delivery. The Wrangler email binding is also simulated by default.

The domain includes Saved Properties and Inquiries. Their user-facing workflows are separate milestones and are not complete at this checkpoint.

## Commands and evidence

Run these commands from the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm dev --port 3010
pnpm test:integration
pnpm build
```

Run the server command in a separate terminal. Wait for an actual API response before the integration test. The integration script rejects non-local hosts and uses only `example.invalid` accounts. It requires Nuxt development test links and does not send email.

The recorded results are:

- [Lint](domain-lint.txt) passed.
- [Typecheck](domain-typecheck.txt) passed.
- [Domain tests](domain-tests.txt) passed two tests. The server-dependent test was skipped in this command.
- [API integration](domain-integration.txt) passed the server-dependent test with no skips.
- [Production build](domain-build.txt) passed.

An earlier production build failed because the SSR bundle could not resolve the relative shared schema import. `AccountForm.vue` now uses Nuxt's `#shared/account` alias. The recorded build result is the successful rerun.

## Database checks

`tests/domain.test.mjs` applies the initial schema and seed data to an in-memory SQLite database with foreign keys enabled. It adds a photo, applies the new domain migration in a transaction, and checks that photo metadata and Transit entries remain intact. It also checks required Agency ownership, foreign-key consistency, and Saved Property uniqueness.

The domain migration was applied only to local D1 with `--local --env preview`. No remote migration or deployment ran. Existing role-less login tokens are discarded, not converted into valid tokens for a guessed role.

## API checks

`tests/auth.integration.test.mjs` creates two Agencies and two Buyers. It checks:

- Registration and role-specific redirect destinations.
- Unauthenticated denial and cross-role denial.
- Buyer identity remains scoped to the session, even when a different Buyer ID appears in a query.
- An owning Agency can read its draft Property.
- Another Agency cannot read, update, or upload images to that Property.
- A Buyer cannot access that Agency Property API.
- Public details do not expose the draft Property.
- Foreign-origin mutation requests fail.
- A consumed login link fails.
- Concurrent verification produces one successful session and one rejected link.
- Same-email Buyer and Agency registrations have independent role-bound tokens.

## Browser checks

The coordinator used the `madori-auth` browser session against `http://localhost:3010`.

Buyer registration produced a local test link. Following that link opened `/buyer` and displayed the submitted Buyer name. Opening `/admin` with that session redirected to Agency login.

Agency registration produced a local test link without an approval queue. Following that link opened `/admin`. Opening `/buyer` with that session redirected to Buyer login.

The [implemented Buyer login screenshot](../research/screenshots/buyer-login-implemented.png) records the responsive form. This is an authentication checkpoint, not final visual verification of the marketplace.

## Remaining work

Saved-property pages, Inquiry creation and history, Agency inboxes, publication validation, image visibility and upload validation, the public redesign, and actual email receipt still need their own verification. This report does not claim completion of those features.
