# Independent account link accessibility review

## Model, scope, and result

Model: `openai/gpt-6.1-sol`. Environment inspection confirmed `PI_PROVIDER=openai` and `PI_MODEL=gpt-6.1-sol`.

No findings in this narrow source correction. The review read `CONTEXT.md`, [`AccountForm.vue`](../../app/components/AccountForm.vue), the four account page wrappers, installed Nuxt UI link code, the generated link theme, application styles, compiled underline utilities, and the supplied audit and check logs.

## Correction review

[`AccountForm.vue:87`](../../app/components/AccountForm.vue#L87) gives the login/register counterpart link `text-primary underline underline-offset-4`. The underline is unconditional, not restricted to hover or focus. It supplies a non-color distinction from the surrounding paragraph, which addresses the reported `link-in-text-block` trigger without requiring a color change.

Installed Nuxt UI `Link.vue` merges the supplied class into the rendered link. The generated link theme does not remove underlining. The inspected built CSS contains `text-decoration-line: underline` and `text-underline-offset: 4px`. Application styles contain no competing link-decoration rule. These are source and static-artifact checks, not observations of the corrected browser rendering.

The current `counterpart` expression at line 13 retains these destinations, consistent with the anchors recorded in the pre-correction audit:

| Account page | Counterpart destination |
| --- | --- |
| `/buyer/login` | `/buyer/register` |
| `/buyer/register` | `/buyer/login` |
| `/login` | `/register` |
| `/register` | `/login` |

All four page wrappers use this shared component with the corresponding Buyer or Agency role and login or register mode. The correction adds presentation classes to the counterpart link. It adds no routing or submission logic. The separate footer role-switch link remains outside this correction. This review does not certify the full authentication flow.

## Supplied evidence

[`production-mobile-auth-a11y.json`](production-mobile-auth-a11y.json) records the pre-correction mobile audit for all four pages. Each has one serious `link-in-text-block` violation. The recorded anchors lack an underline, and axe reports a 1.51:1 contrast ratio between the link and surrounding text. The artifact uses axe 4.12.1 and local URLs at `http://localhost:3011`; it is evidence from a production build served locally, not a deployed production site.

The coordinator reports that full lint, typecheck, 114 local tests, and build each exited with code 0. The review read:

- [`accessibility-lint.txt`](accessibility-lint.txt)
- [`accessibility-typecheck.txt`](accessibility-typecheck.txt)
- [`accessibility-tests.txt`](accessibility-tests.txt)
- [`accessibility-build.txt`](accessibility-build.txt)

The test log records 114 passes, zero failures, zero skips, and zero cancellations. The build log records completed client, SSR, and Cloudflare-module Nitro builds. It retains plugin-timing and OG-font warnings. The exit codes are coordinator-reported, not independently observed process results.

The supplied audit is a failure baseline. Neither that artifact nor the local test log establishes a post-correction axe pass. This report does not claim one.

## Execution and evidence limits

The reviewer inspected files, performed local text and file searches, and checked the model environment. The reviewer ran no tests, lint, typecheck, builds, browser sessions, axe scans, agents, Pi processes, database operations, email sends, deployments, production actions, commits, or external actions.

The review did not independently verify rendered underline visibility, computed styles in a browser, keyboard interaction, screen-reader behavior, or a new production-build accessibility audit. It did not verify actual email delivery or receipt. No complete-page or site-wide accessibility conformance is claimed.

Only `docs/verification/account-link-accessibility-review.md` was written. No application source, evidence file, or other report was changed.
