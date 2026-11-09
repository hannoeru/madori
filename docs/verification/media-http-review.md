# Independent media HTTP regression review

## Scope and result

Model: `openai/gpt-6.1-sol`, confirmed through the model environment.

The reviewer inspected [`tests/media-http.regression.test.mjs`](../../tests/media-http.regression.test.mjs), its imported handler/helper contracts, relevant installed H3/Drizzle behavior, and `CONTEXT.md`. The broad worktree was not reviewed. MHR-01 is resolved in the inspected source. No open finding remains in this narrow follow-up. No HTTP body/status or transaction-model defect was identified within the five defined scenarios.

## Finding disposition

### MHR-01 · P3 · Resolved

[`tests/media-http.regression.test.mjs:49-64`](../../tests/media-http.regression.test.mjs#L49) registers one disposal hook immediately after SQLite acquisition, before migrations, seeding, or HTTP initialization can fail. The hook stops the owned listening server, closes its connections, and awaits server closure. SQLite closure runs in `finally`, including a server-close rejection. This resolves the reported late-registration and skipped-database-cleanup paths.

Lines 143 and 148 add explicit five-second listening and HTTP request safety deadlines. Readiness still depends on the `listening` event, not elapsed time. The credential-bearing unqueued upload error now asserts `no-store` at line 216.

This disposition is based on independent source inspection. The reviewer did not execute teardown failures, deadline expiration, or the HTTP regressions.

## Source assessment

- The test imports actual upload, recovery, cleanup, detail, and count handlers. It resolves H3 imports to the same installed implementation used by the HTTP listener. Requests use real loopback sockets, native multipart `FormData` with an automatically generated boundary, and JSON with the correct content type. Assertions inspect actual response status, decoded JSON, and selected cache headers. They cover returned failure bodies and thrown authorization errors rather than only direct handler return values.
- SQLite uses application migrations and foreign keys. The D1-shaped adapter executes real SQL and wraps batches in `BEGIN`, `ROLLBACK`, and `COMMIT`. The failing-image trigger tests rollback after earlier Floor plan queue/deletion statements. Metadata, Published status, object retention, and subsequent cleanup are asserted.
- Lost D1 acknowledgment is an exception after a successful commit. Lost R2 acknowledgment is an exception after the object enters the test bucket. These are valid deterministic models of acceptance before an error. They are not real transport failures or provider outages.
- Recovery assertions cover missing principal 401, Buyer 403, foreign Agency and wrong nonce 404, temporary deletion failure 503, and linked-media rejection 409. The nonce mutation retains its valid format, so it tests credential rejection rather than only schema rejection. Foreign Agency cleanup must leave Agency A's queue and objects intact.
- Linked-media assertions preserve the accepted Floor plan, reject recovery deletion even with its valid test nonce, and restrict cleanup to the old Floor plan. Healthy upload response keys and queued/linked error data exclude recovery credentials. The unqueued failure intentionally supplies a test-generated recovery credential and asserts `no-store`. Denied recovery and successful retry responses also assert `no-store`. No production credentials are used.
- Successful fixture initialization waits for the explicit `listening` event. The early disposal hook closes owned HTTP connections before SQLite closure in `finally`. Listening and requests have safety deadlines. There are no fixed readiness delays.

## Limits and blind spots

- The `x-test-account` middleware and test `requireUserSession` stub bypass real session processing. The real Agency role and database lookup still execute. This does not prove cookies, session expiry, CSRF controls, Nuxt/Nitro middleware, or deployed Worker behavior.
- SQLite is not remote D1, and the bucket is an in-memory fault-controlled binding. Reads remain available. The cases do not model delayed commit/object visibility, unavailable reference reads, process interruption, lost HTTP responses, partial multi-object deletion, or real provider recovery.
- Agency B has no Property, object, or queued deletion of its own. The tests cover rejection and a foreign cleanup no-op, not simultaneous successful cleanup for two Agencies. No obsolete queue entry for currently linked media is seeded, and no concurrent queue/link/removal interleaving is tested.
- Original object existence and metadata are checked, but retained byte contents are not compared. Invalid multipart/image bodies, missing bindings, cleanup batches larger than 100, and malformed recovery payloads are outside these cases.
- Secret nondisclosure is not asserted across every detail/count/error body. The linked-media recovery nonce comes directly from test bucket metadata; that is not evidence that a normal client receives it.
- HTTP deadlines and connection closure do not cancel an in-flight handler promise or emulate provider cancellation. Shutdown has no separate safety deadline. Error-path disposal and deadline behavior have not been independently executed. No test-pass count or independent runtime result is claimed.

## Execution limits

This follow-up writes only `docs/verification/media-http-review.md` and the separate `docs/verification/icons-review.md`. The reviewer ran no tests, builds, browsers, database operations, data mutations, agents, Pi processes, emails, deployments, commits, or external actions. Application and test files were not changed.
