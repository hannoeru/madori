# Independent hydration ID review

## Scope and result

Model: `openai/gpt-6.1-sol`. Environment inspection confirmed `PI_PROVIDER=openai` and `PI_MODEL=gpt-6.1-sol`.

No findings in the applied narrow correction. The reviewer independently inspected `CONTEXT.md`, [`nuxt.config.ts`](../../nuxt.config.ts), [`tests/hydration-config.test.mjs`](../../tests/hydration-config.test.mjs), relevant installed Nuxt/Vue code, the retained Search fetches, and the relocated diagnostic fixtures. Browser results below are coordinator-produced evidence, not independent browser execution.

## Configuration timing and scope

[`nuxt.config.ts:4-10`](../../nuxt.config.ts#L4) removes only `onServerPrefetch` from the resolved Vue client tree-shake list. The named inline module uses public Nuxt configuration APIs. Its guard permits development configuration without a Vue removal list.

Installed Nuxt 4.5.2 installs modules before calling `modules:done` at `dist/index.mjs:7807-7811`. Its tree-shake plugin registration occurs in that hook at lines 7629-7642. The correction therefore runs before plugin registration. It also avoids schema default-array merging, which would retain the unwanted entry if an empty configuration array were supplied instead.

Installed Vue 3.5.41 registers this hook on the client and uses its presence to allocate an ID boundary. Preserving registration restores parity with Nuxt Icon's SSR setup. Client mounting does not execute server-prefetch callbacks. The correction leaves other tree-shaking rules and server fetching intact.

The change applies to Vue hook registration across the application, not only Search. That scope matches the dependency defect. It adds no dependency, private Vue instance mutation, local label fallback, DOM repair, or template-ordering requirement. The code comment explains the non-obvious dependency constraint.

Both original awaits remain in `SearchFilters.vue` and the Search page. The diagnostic fixtures now live under `.audit/hydration-labels`; no corresponding diagnostic page files remain in `app/pages`. This is a source-location check, not a claim about routes in an already running Worker.

## Regression scope

The regression loads actual Nuxt with `dev: false`, rather than mocking configuration resolution. Installed `loadNuxt` awaits readiness by default, so assertions inspect configuration after module initialization.

The test checks that no client removal list contains `onServerPrefetch`, including lists that could affect imports from `#imports`. It also checks that `onRenderTracked` and `onRenderTriggered` remain in Vue's removal list. `nuxt.close()` runs in `finally` after successful loading, including assertion failure.

This is a configuration/lifecycle regression. It does not compile client output, render SSR controls, hydrate a browser, or verify label associations itself. Future Nuxt/Vue/Icon upgrades must retain both this regression and the production hydration loop.

## Coordinator evidence

- [`production-search-labels-fixed.json`](production-search-labels-fixed.json) records six associated controls for icon-before-Filters and real `/search`. The coordinator reports that the Search case was cold hydration. The recorded input IDs match the previously missing label associations.
- [`production-mobile-filter-labels-fixed.json`](production-mobile-filter-labels-fixed.json) records six named mobile controls, `allAssociated: true`, `uniqueIds: true`, and `overflow: false`.
- [`production-mobile-price-filter.json`](production-mobile-price-filter.json) records native fill and submit actions followed by `/search?minPrice=50000000&maxPrice=80000000`. The reviewer read that artifact but did not replay those actions or independently verify the returned Property set.
- [`hydration-config-red.txt`](hydration-config-red.txt) records the configuration assertion failing. [`hydration-config-green.txt`](hydration-config-green.txt) records one passing regression. [`hydration-final-tests.txt`](hydration-final-tests.txt) records 115 passes with zero failures, skips, or cancellations. These are supplied logs, not reviewer-run checks.

The passing diagnostic-route evidence predates fixture relocation. It does not establish that those routes remain part of the application. Local production-build evidence does not establish a deployed production result. Icon delivery failures remain separate from the confirmed ID-boundary correction.

## Execution limits

The reviewer inspected files, searched local source and dependencies, and checked the model environment. Only `docs/verification/hydration-id-review.md` was written.

No tests, lint, typecheck, builds, browsers, data operations, agents, Pi processes, external actions, emails, deployments, production actions, or commits ran during this review. No independent browser, complete accessibility, full-build, deployed-route, or email receipt approval is claimed.
