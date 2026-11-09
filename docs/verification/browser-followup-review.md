# Independent browser follow-up source review

## Scope and result

Model: `openai/gpt-6.1-sol`. Environment inspection confirmed `PI_PROVIDER=openai` and `PI_MODEL=gpt-6.1-sol`.

No findings in the reviewed corrections. This report records the completed narrow, independent source review. The review read `CONTEXT.md`, the then-current `browser-followup.md`, application source, regression assertions, installed dependency code, and supplied evidence files.

The review completed before the subsequent native date follow-up. It did not inspect, replay, or verify those later actions. At the reviewed checkpoint, `browser-followup.md` explicitly left native day-date keyboard entry unverified. This report preserves that checkpoint and does not assign a result to the later follow-up.

## Reviewed source and tests

| Source | Review result |
| --- | --- |
| [`app/components/AdminPropertyForm.vue:378-379`](../../app/components/AdminPropertyForm.vue#L378) | The station selector uses the indexed accessible name `交通 ${index + 1} 車站`, consistent with its visible field label. |
| [`app/pages/properties/[id].vue:24-26`](../../app/pages/properties/[id].vue#L24) | Condominiums retain the combined unit/total-floor fact. Detached houses show only total floors. The existing missing-value display remains intact. |
| [`nuxt.config.ts:23-27`](../../nuxt.config.ts#L23) and [`app/app.vue`](../../app/app.vue) | `site.defaultLocale` is `zh-TW`. The duplicate root HTML language setting is removed. Nuxt UI's `zh_tw` locale remains. |
| [`tests/agency.integration.test.mjs:374-388`](../../tests/agency.integration.test.mjs#L374) | Assertions fetch actual SSR detail responses for a Published house and condominium. They check the house's total-floor label, absence of the condominium label on the house, and retention of the condominium label. |
| [`tests/marketplace.integration.test.mjs:20-27`](../../tests/marketplace.integration.test.mjs#L20) | The new assertion fetches actual SSR HTML for `/`, `/search`, `/guide`, and `/buyer/login` and checks `lang="zh-TW"`. |

Installed Nuxt UI `SelectMenu.vue` forwards `$attrs` to `ComboboxTrigger`. Its `useFormField` helper supplies error and description attributes but does not replace the explicit accessible name.

Installed `nuxt-seo-utils` 8.4.2 registers its automatic defaults plugin. In `runtime/app/logic/applyDefaults.js`, locale resolution uses `currentLocale`, then `defaultLocale`, then `en`. It sets HTML language through `useHead` and converts `zh-TW` to OG locale `zh_TW`. Installed `nuxt-site-config` 4.2.3 passes site configuration into its runtime stack and preserves SSR configuration for the client. These implementations support the configuration correction without a second root language declaration.

## Supplied evidence

- [`resume-transit-label.json`](resume-transit-label.json) records the selector name `交通 1 車站` in an accessibility snapshot.
- [`resume-house-facts-fixed.json`](resume-house-facts-fixed.json) records the corrected house fact label and a displayed total of two floors.
- [`resume-manual-contrast.json`](resume-manual-contrast.json) separately records HTML language `zh-TW` and OG locale `zh_TW`. Its contrast results concern the four recorded elements, not a full pixel or accessibility audit.
- [`resume-agency-b-publication.json`](resume-agency-b-publication.json) and [`resume-detached-house.json`](resume-detached-house.json) support the reported facts for one local Listing before and after its type change. They do not establish separate complete creation flows for each property type.

The supplied [`resume-final-tests.txt`](resume-final-tests.txt) records 114 passes, zero failures, zero skips, and zero cancellations. The coordinator reports exit code 0 for tests, lint, typecheck, and build. The review read the test log, [`resume-final-lint.txt`](resume-final-lint.txt), [`resume-final-typecheck.txt`](resume-final-typecheck.txt), and [`resume-final-build.txt`](resume-final-build.txt). The build log records completed client, SSR, and Cloudflare-module Nitro builds with plugin-timing and OG-font warnings. Successful completion is not a warning-free or deployment-resource-limit claim.

No evidence overstatement was found within the reviewed corrections and their stated limits.

## Execution and evidence limits

- The reviewer inspected files, searched local source and installed packages, and checked the model environment. The reviewer did not execute or independently observe the supplied check processes. Exit codes remain coordinator-reported results.
- No tests, lint, typecheck, builds, browser sessions, helper agents, Pi processes, database mutations, email sends, deployments, production actions, commits, or external actions ran during this review or report creation.
- The floor regressions check labels, not numeric floor values. The supplied house artifact separately records a value; the reviewer did not reproduce it.
- The language regression checks four SSR responses. It does not test hydrated navigation or OG metadata. The recorded browser locale values are supplied evidence, not independent browser observations.
- The station snapshot covers the recorded first Transit entry. Source inspection supports the indexed naming rule, but the reviewer did not replay station selection or test screen-reader interaction.
- Browser actions, native date input, complete fresh creation flows, provider-outage recovery, production accessibility, and actual email delivery or receipt were not independently verified. The subsequent native date follow-up is outside this review.

Only `docs/verification/browser-followup-review.md` was written to record this review. No application source or other report was changed. This is not approval that the complete product has passed every required check.
