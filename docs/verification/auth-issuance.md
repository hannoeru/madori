# Atomic local authentication issuance

## Finding and reproduction

Final source review found AIC-01. Two concurrent requests for the same email/role could both read an empty cooldown result before either write batch started. Both then returned local links. The second batch deleted the first token, so one successful response contained an unusable link.

The deterministic regression executes the real `issueMagicLink` utility with Drizzle and SQLite migrations behind a D1-shaped binding. A barrier holds both original cooldown reads after they capture empty results. Write batches execute serially. The test forces Nuxt's development flag so the utility returns local links; there is no EMAIL binding or email send.

Before the correction, this command failed in 26ms with two accepted requests where one was expected:

```sh
node --test tests/auth-issuance.regression.test.mjs
```

Evidence is `auth-issuance-red.txt`. Authentication tokens and returned links are not printed.

## Correction

The cooldown condition now belongs to the conditional INSERT inside the D1 write batch. The preceding DELETE removes only that identity's tokens older than the cooldown cutoff. It cannot remove another request's newly accepted token.

INSERT uses `NOT EXISTS` against recent tokens and returns its accepted ID. An empty result produces 429 before a local link or Notification call can be produced. The predicate uses both email and role. Expiry remains fifteen minutes, and only hashes are stored.

No schema, migration, compatibility path, remote resource or email configuration changed. No speculative retry was added.

The initial hypotheses were an outside-transaction cooldown read, success independent of the accepted row, and test/D1 batch differences. The real SQL sequence with serialized batches reproduces the first two conditions. Moving the predicate into the write and requiring the returning result fixes the same held-read case.

## Passing checks

The isolated tests verify:

- One accepted local issuance and one 429 under the forced race. The winning local link still matches the stored hash.
- Same-email Buyer and Agency issuance remain independent.
- A recent token remains unchanged after rejection, while an older token is replaced by the accepted one.

A further local API test sends four concurrent login requests after registering an isolated Buyer. It requires one 200 and three 429 responses, then consumes the winning link through the real verification handler and requires a Buyer redirect. It is restricted to localhost:3010 and does not send email.

```sh
MADORI_TEST_URL=http://localhost:3010 node --test \
  --test-name-pattern='concurrent local login' tests/auth.integration.test.mjs
```

See `auth-issuance-green.txt` and `auth-issuance-api.txt`. The first lint failure is retained in `auth-issuance-initial-lint-failed.txt`; adding the required blank import separation corrected it.

## Final checkpoint and native follow-up

Lint, typecheck, all 128 tests, production build and diff checks pass. Final logs are `auth-issuance-final-{lint,typecheck,tests,build}.txt`.

The final development app also completed genuine Buyer A login using the native form and local link. Fresh Inquiry history returned 200, retained both records including the earlier mobile Inquiry, and denied the Agency inbox with 403. It had one main landmark and no overflow. The first read-only probe incorrectly treated the paginated response as an array; that evaluation error remains in `auth-issuance-native-buyer-persistence.json`. The corrected probe uses the real `items` contract and is in `auth-issuance-native-buyer-persistence-confirmed.json`. No Inquiry was resubmitted.

## Limits

The isolated fixture tests actual source and SQL interleaving, not real sessions or a live email provider. The local API check uses real development sessions and local D1 but not deployed Worker behavior. Existing verification races still cover one-use token consumption.

Actual Notification receipt remains deferred. Neither these local link checks nor service acceptance prove email delivery. The current auth correction has coordinator source review and execution evidence, not a new independent helper review.
