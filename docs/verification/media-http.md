# Media HTTP failure and recovery checks

## Scope

`tests/media-http.regression.test.mjs` runs the actual upload, specific recovery, cleanup, Property detail and cleanup-count handlers through H3 and real loopback HTTP sockets. Requests use native multipart FormData or JSON. SQLite executes the application migrations and SQL behind a D1-shaped binding. A fault-controlled in-memory R2 binding models accepted writes, rejected writes and deletion failure.

These are isolated tests. They do not use the development database, live R2, an email binding or external accounts. A test-only principal header supplies authentication context. The actual Agency role check and database lookup run, but real cookie/session processing and Nitro middleware do not. Recovery nonces stay in test memory and are not copied into evidence files.

## Results

Five cases pass:

- A rejected R2 write returns an HTTP error, removes its compensation work and leaves linked media unchanged. A healthy retry then succeeds, retains the original cover and returns no recovery nonce.
- An R2 write accepted before acknowledgment loss leaves an Agency-owned cleanup item when deletion fails. Another Agency's cleanup cannot remove it. The owning Agency's later retry removes only the orphan.
- A failed Floor plan metadata insert rolls back the earlier queue/deletion statements. The original Floor plan, photo and Published status remain. Later cleanup removes only the new orphan.
- A D1 batch committed before acknowledgment loss returns an error that tells the caller the image is linked. The actual detail GET confirms the new Floor plan and Published status. Even a valid test nonce cannot delete that linked object. Normal cleanup removes only the superseded Floor plan.
- Failed image insertion, queue insertion and R2 deletion return specific unqueued recovery data. Missing principal, Buyer, foreign Agency and wrong nonce fail with 401, 403 or 404. An R2 deletion failure returns 503 and keeps recovery possible. The owning Agency's healthy retry returns 200. A repeated recovery returns 404 rather than inventing another success.

The original runtime and SQL helpers are not mocked. GET APIs supply the Property and queue-count assertions. The tests also inspect the controlled bucket's retained objects. They do not compare every retained byte, model delayed provider visibility or prove a real provider outage.

## Teardown and review

The independent source review found MHR-01, a fixture teardown gap. The fixture now registers its disposal hook immediately after SQLite acquisition. It closes its own server/connections before closing SQLite in `finally`. Listening and HTTP requests have explicit five-second safety timeouts, not readiness delays. The credential-bearing failure also asserts `no-store`.

See `media-http-review.md` for the source review and its limits. The reviewer did not run these tests.

## Verification

The five isolated HTTP tests pass. The subsequent full checkpoint passes lint, typecheck and all 122 tests with zero failures, skips or cancellations. That count also includes the later icon configuration regression. The application build succeeded after the icon correction. Logs are `storage-icons-{lint,typecheck,tests,build}.txt` and `media-http-tests.txt`.

This closes the defined HTTP failure models. Real R2 outage, process interruption, delayed visibility, lost whole-HTTP-response behavior and deployed provider/operator recovery remain unverified. No email, deployment, production migration or commit occurred.
