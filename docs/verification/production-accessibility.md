# Local production accessibility and recovery

## Scope

The coordinator ran the Cloudflare-module build through local Wrangler at `http://localhost:3011`. The shared development app remained at port 3010. These checks do not prove deployed Worker resource limits or a complete accessibility audit. No email, deployment, production migration or commit occurred.

## Account links

The first mobile audits found `link-in-text-block` violations on Buyer and Agency login/registration pages. Their counterpart links used color alone. `AccountForm.vue` now uses `underline underline-offset-4` with its existing primary color. Routes and account behavior are unchanged.

All four routes then passed at 390×844 and 1440×1000 with zero axe 4.12.1 WCAG2A/2AA violations and zero incomplete checks. Computed styles confirmed the underline; no horizontal overflow was observed.

Evidence:

- `production-mobile-auth-a11y.json` retains the original failures.
- `production-mobile-auth-fixed-a11y.json` and `production-desktop-auth-fixed-a11y.json` record the corrected pages.
- `account-link-accessibility-review.md` is the independent narrow source review.
- `accessibility-{lint,typecheck,tests,build}.txt` record the 114-test checkpoint for this correction.

## Public pages and limits

Home, Search, guide and both fresh Property details were sampled at desktop/mobile sizes. The sampled public pages reported zero axe violations. Their incomplete checks remain unresolved evidence, not passes. These include contrast where overlapping elements prevent automatic calculation and an empty station-control `aria-controls` value. No horizontal overflow or Nuxt DevTools was observed on the inspected production pages. HTML language was `zh-TW`.

Evidence is in `production-home-a11y.json`, `production-search-guide-a11y.json` and `production-details-home-a11y.json`.

## Search network recovery

A local browser route aborted `/api/properties` while changing sorting. Search displayed `無法完成搜尋` and exposed `重試` and `清除條件`. After removing the route and requesting retry, the wait timed out. The coordinator inspected the page before repeating any action. Results had recovered with `sort=price_asc`, twelve result headings and no error message.

Evidence is in `production-search-network-failure.json` and `production-search-network-recovery-confirmed.json`. The timed-out operation is not itself recovery proof.

## Production label defect

A later manual check found that all six numeric Search inputs lacked their visible labels after hydration. Labels used IDs such as `v-0-3-7`, while inputs used `v-0-0-7`. Axe did not report this defect because the inputs had placeholders. Placeholder names do not replace these specific filter labels.

Cold navigation with hydration complete also reproduced the defect. Removing the `await` from `SearchFilters` and separately from the Search page did not correct it. Both experiments were reverted.

The coordinator reduced the case to the actual SearchFilters component:

- Filters alone preserved matching labels.
- One CSS-mode Nuxt icon before the filters produced different SSR/client ID prefixes and removed all six label associations.
- The same icon after the filters preserved all associations.
- Raw SSR IDs matched their labels in all three cases. The mismatch appeared during hydration.

Evidence:

- `production-search-labels-cold.json`
- `production-search-labels-experiment.json`
- `production-search-page-labels-experiment.json`
- `production-label-minimal.json`
- `production-label-minimal-filters.json`
- `production-label-filters-alone.json`
- `production-label-order-ssr.json`
- `production-label-icon-order.json`

The installed Nuxt 4.5.2 schema removes `onServerPrefetch` from client code in production. Nuxt Icon 2.5.0 registers this hook. Vue 3.5.41 uses its presence to mark an ID boundary. Removing the client registration changes the ID sequence when an icon precedes a form. Vue can retain the server's label attributes while patching input IDs during hydration.

The inline Nuxt module `keepHydrationIdBoundaries` removes only `onServerPrefetch` from the resolved client removal list. It keeps the other Vue debug-hook removals. Registration does not execute server-prefetch callbacks on the client. An inline module is necessary because the installed schema concatenates configured arrays with its defaults; a shorter configuration array does not remove the default entry.

The regression `tests/hydration-config.test.mjs` loads the actual production Nuxt configuration and closes the Nuxt instance. It failed before the correction and passed afterward. It verifies the configuration invariant, not the complete browser behavior.

The corrected production build then passed cold hydration on both the icon-before diagnostic and `/search`. All six inputs retained their labels. The mobile filter panel also had six named inputs, unique DOM IDs and no overflow. Native minimum/maximum price entry reached the expected URL. Evidence is in `production-search-labels-fixed.json`, `production-mobile-filter-labels-fixed.json` and `production-mobile-price-filter.json`.

Diagnostic routes were removed from `app/pages`. Their source is retained only under `.audit/hydration-labels`.

## Targeted manual follow-up

The final production Search's three header navigation labels had computed contrast ratios of 8.00, 4.91 and 4.91 at 14px. The calculation composed ancestor and pseudo-element backgrounds. It found no background images, non-unit opacity layers or covering elements at the sampled centers. These exceed 4.5 for the inspected state. `production-nav-contrast-manual.json` is computed-style evidence, not a full pixel or all-state contrast audit.

The station trigger initially had `aria-expanded=false` and an empty `aria-controls` value. On native opening, `aria-expanded` became true and `aria-controls` resolved to the actual listbox ID. Focus entered the search combobox. Native Escape removed the popup and restored focus to the station trigger. See `production-station-aria-manual.json` and `production-station-aria-dismissal.json`. This proves the expanded relationship and dismissal behavior; it does not remove or approve the initial empty-attribute audit incomplete.

The later mobile Buyer/Agency workflows, invalid-image retry and fresh mobile detached-house lifecycle are recorded in `mobile-workflows.md` and `mobile-publication.md`. No application source changed after the 115-test/final-build checkpoint.

## Current checks

Lint and typecheck exit 0. All 115 local API/Vue/SQLite/configuration tests passed with zero failures, skips or cancellations. See `hydration-final-{lint,typecheck,tests}.txt` and `hydration-config-{red,green}.txt`.

Two build attempts reached Nitro generation but exceeded their safety timeouts. A subsequent build exited 0 and supplied the corrected browser evidence above. The final build after diagnostic-route removal also exited 0. Its log is `hydration-final-build.txt`. Local Wrangler returned 404 for the removed diagnostic route. The final-source desktop Search retained six correct labels and restored both price values from its URL, with `zh-TW` and no overflow. Axe reported zero violations and retained its two incomplete categories. See `production-final-search-a11y.json`. The independent source review is `hydration-id-review.md`; it did not execute browser checks.

Local Wrangler reported server-side icon-loading warnings at this checkpoint. The later static app-icon scan removed the reproduced warnings; see `icons.md`. The controlled ordering experiment establishes the hook/ID defect, not the precise cause inside that runtime icon loader. The later media HTTP failure models are in `media-http.md`. Actual Notification receipt, live provider recovery and complete manual accessibility remain open.
