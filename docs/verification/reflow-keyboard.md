# Narrow-viewport reflow and keyboard follow-up

## Scope

These checks used the local production build at port 3011 and managed Chrome. No email, deployment, production migration or commit occurred. A 320px viewport checks narrow layout; it does not prove browser zoom, text resizing, screen-reader behavior or complete WCAG compliance.

## Pagination defect and correction

The initial eight-route sample at 320×900 found horizontal overflow only on populated Search. Its pagination list was 380px wide and the document scroll width was 350px. Home, empty Search, invalid Search, guide, condominium detail, detached-house detail and Property 404 had no horizontal overflow in that sample. See `reflow-320-public.json`.

`app/pages/search.vue` now sets the existing Nuxt UI Pagination list to `flex-wrap justify-center`. The correction uses the component's `ui` slot configuration. It does not hide controls, change their DOM order, reduce targets, clip overflow or change routing.

The new local SSR regression failed before the correction and passed afterward. It checks wrapping class tokens and the four directional control labels. It does not calculate layout. See `pagination-red.txt`, `pagination-green.txt` and `tests/marketplace.integration.test.mjs`.

After rebuilding and starting local Wrangler, the hydrated Search at 320px had document width 320px with no horizontal overflow. Its controls occupied two centered rows. Every button measured 44×44px. All labels, current-page state and disabled first/previous controls remained present. At 1440px, the same controls occupied one row with no overflow. See `reflow-320-search-fixed.json` and `reflow-pagination-desktop-screenshot.json`.

The screenshot `docs/research/screenshots/pagination-320-fixed.png` was verified on disk and visually inspected. Its controls fit without overlap or clipping.

Native focus and Enter on the next-page button reached `/search?page=2`, selected page 2 and displayed twelve result headings without horizontal overflow. See `reflow-pagination-keyboard-next.json`. This checks activation, not the complete keyboard path through all results.

## Search and media dialogs

At 320px, native focus and Enter opened Search's filter dialog. Focus entered the dialog, its six numeric inputs retained their specific visible labels, and neither the dialog nor the document overflowed horizontally. Escape closed it and returned focus to `篩選`. See `keyboard-320-search-filters.json`.

Native focus and Enter opened the condominium Floor plan dialog. The original image loaded. Tab and Shift+Tab kept focus on its single close control. Escape restored focus to `放大查看`. Neither dialog nor document overflowed. See `keyboard-320-floor-plan.json`.

The photo dialog also opened from its native keyboard trigger with focus inside and a loaded original image. Escape restored focus to that photo trigger. The check sent Tab and Shift+Tab but did not capture intermediate photo-dialog focus states, so it does not independently prove its focus trap. See `keyboard-320-photo-dialog.json`.

## Shared-fixture test race

The first full suite ran local API test files concurrently. A different file changed the Published fixture count between Search requests, and the unchanged total assertion failed with 42 versus 43. The failure is retained in `pagination-concurrent-tests-failed.txt`.

Both package test scripts now set Node's `--test-concurrency=1`. These integration files share one local database and public collection; distinct Agency IDs do not isolate public totals. The test assertions were not weakened. The normal full test script then passed all 116 tests with zero failures, skips or cancellations.

## Checks and remaining limits

Lint, typecheck, all 116 tests and production build passed. Logs are `pagination-{lint,typecheck,tests,build}.txt`. The final package-script change does not change the application build. `git diff --check` passed.

The independent narrow source review is `pagination-reflow-review.md`. Its source and SSR-test review does not claim independent browser measurements.

The initial empty station `aria-controls` audit incomplete, broader manual accessibility, managed-browser context loss, provider-outage/operator recovery and actual Notification receipt remain open. This follow-up does not complete the overall goal.
