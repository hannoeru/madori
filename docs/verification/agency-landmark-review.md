# Independent Agency landmark review

## Scope and result

Model: `openai/gpt-6.1-sol`, confirmed through the model environment.

The reviewer inspected `CONTEXT.md`, the narrow `AdminDashboardShell.vue` change, the new Agency SSR test and its Client cookie merge, relevant installed dashboard components, and the five page entry points. The broad worktree and production authentication implementation were not reviewed.

The landmark correction and name-based cookie merge match the stated scope. ALR-01 is resolved in the inspected source. No open finding remains in this narrow follow-up.

## Finding disposition

### ALR-01 · P3 · Resolved

[`tests/agency.integration.test.mjs:79`](../../tests/agency.integration.test.mjs#L79) now requires whitespace immediately before `role="main"`. This rejects `data-role="main"` and other attribute-name suffixes, while retaining the native `<main>` alternative. A native `<main role="main">` still produces one opening-tag match.

Line 80 also requires exactly one native `<h1>` on each of the same five authenticated SSR pages. [`app/pages/admin/reviews.vue:13-15`](../../app/pages/admin/reviews.vue#L13) uses `<h2>` for the secondary instruction heading. Installed `DashboardNavbar.vue` retains its native `<h1>` for the shell's page title, so the reviewed page hierarchy is a page-level heading followed by a subordinate section heading.

The added assertion checks the native `<h1>` count, not heading text, visibility, association with the main landmark, or the complete heading hierarchy. It does not check ARIA level-one headings or assert the secondary `<h2>` directly. The existing SSR-format, DOM, and browser limits remain.

This disposition is based on independent source inspection. The reviewer did not run the corrected assertion, SSR requests, or browser checks.

## Landmark semantics

[`app/components/AdminDashboardShell.vue:33`](../../app/components/AdminDashboardShell.vue#L33) sets `role="main"` on the existing content panel. Installed `DashboardPanel.vue` has no `as` prop, renders a fixed `div`, disables implicit attribute inheritance, and explicitly forwards `$attrs` to that root. The role therefore reaches the content container rather than becoming an ineffective component option.

The panel contains the page navbar and primary content. The sidebar remains outside it. A single `main` landmark does not require an accessible name or added focusability. The correction preserves component layout, IDs, resizing behavior, slots, and controls.

Four reviewed page entry points use this shared shell. `/admin/properties/new` retains its existing native `<main>` instead. The test's alternatives count a native `<main role="main">` only once, because one regex match consumes the opening tag.

## Cookie merge

[`tests/agency.integration.test.mjs:24-32`](../../tests/agency.integration.test.mjs#L24) reads individual `Set-Cookie` headers, retains existing cookie names, and replaces only names supplied by the response. It extracts each name at the first equals sign but retains the full name/value pair, including equals signs within a value. Separate Client instances retain separate cookie state.

This permits a dashboard preference cookie to coexist with `nuxt-session`. Installed sidebar storage uses the `dashboard-sidebar-admin` key and cookie-backed persistence. The coordinator's reported session loss after SSR `/admin` is consistent with that storage path; the reviewer did not observe that HTTP sequence.

The helper remains test-only. It enforces the fixed local origin and uses manual redirects. It is not a browser cookie jar: path/domain distinctions, expiry/deletion, and browser security attributes are not enforced. Those limits are separate from the required name merge and do not imply a production auth change.

## Test scope and execution limits

The new test registers through the existing local Agency auth flow, requests five SSR pages with the same Client, requires HTTP 200, and counts matching opening tags. Its sequential requests can expose loss of the session cookie between pages. It skips without `MADORI_TEST_URL` and has a 30-second test safety timeout.

The regex assumes the current lowercase, double-quoted SSR format. It is not a DOM or accessibility-tree check: hidden content, comments/scripts, or an explicit role override on native `<main>` can differ from its count. It does not cover the Property edit page, hydration, client navigation, mobile dialogs, keyboard access, browser cookie behavior, or production session security.

Only `docs/verification/agency-landmark-review.md` was written. No tests, builds, browsers, database operations, data mutations, agents, Pi processes, emails, deployments, commits, or external actions ran. No test-pass count or independent runtime/accessibility approval is claimed.
