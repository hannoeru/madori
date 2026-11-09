# Browser follow-up and corrections

## Scope

This run continues the user-authorized local `agent_browser` checks. Email testing remains deferred. Model/provider stayed `openai/gpt-6.1-sol`. No deployment, production change, customer message or commit occurred.

## Date controls

A plain HTML control in `.audit/date-input-isolation.html` reproduces native `fill` returning success while both month and date values remain empty. This reproduction has no Nuxt or Vue code.

Individual native digit key presses entered `2010-01` in the isolated month control. The same method changed Agency B's construction month to `2011-02`. Native form submission persisted it, and the public API returned that value.

A separate native date-control trial lost its page. The batch reported a relaunched browser, and tab inspection showed about:blank. Its exact cause is unknown. At that checkpoint, native day-date keyboard entry remained unverified. [The subsequent native date follow-up](native-date-followup.md) records successful keyboard entry and persistence, and a later interrupted creation flow. The previously scripted ISO day-date setup is not presented as a native keyboard pass. No input type, validation rule or application date behavior changed.

## Agency publication and applicable facts

Agency B completed applicable condominium facts, selected an actual station and walking time, uploaded the original demonstration photo and Floor plan, and published its Listing through native UI actions. The public API returned 58.3 m², `2011-02`, both image kinds and 中目黑/東急東橫線 with seven minutes walking time.

The same local demonstration Listing was then changed to a detached house through the Agency UI. Its public data shows 60.8 m² land, 80.6 m² building and two total floors. Condominium-only area, unit floor and monthly fees are null. The Listing remains Published and visibly labeled as a local demonstration. This checks both type branches on one Listing, not two independent complete creation flows.

Evidence:

- `resume-agency-b-publication.json`
- `resume-detached-house.json`
- `resume-detached-house-layout.json`, before the facts correction
- `resume-house-facts-fixed.json`, after the correction
- `docs/research/screenshots/resume-mobile-detached-house.png`
- `docs/research/screenshots/resume-house-facts-fixed.png`

Both screenshot calls reported verified artifacts.

## Source corrections

### Station selector name

The Agency station control was announced as `Show popup` rather than its visible field purpose. `AdminPropertyForm.vue` now supplies `交通 ${index + 1} 車站` as its accessible name. Before the change, the corresponding aria-label count was zero. The live accessibility snapshot afterward names `交通 1 車站`. Evidence is `resume-transit-label.json`.

### Detached-house floor facts

The public house detail incorrectly displayed `所在樓層／總樓層` as `未提供／2`. A unit floor does not apply to a detached house. The detail now shows only `總樓層` for houses and retains the combined unit/total-floor fact for condominiums.

The actual local Agency integration test publishes its own house fixture and checks the SSR detail before withdrawing and deleting that fixture. The added assertion failed before the correction and passed after it. The test also checks the condominium SSR label remains intact. Focused Agency integration passed all 13 cases.

### Page language

SSR HTML declared `lang="en"` despite the previous root-component language setting. Installed `nuxt-seo-utils` resolves its default HTML and OG locale from site configuration, with an English fallback. `site.defaultLocale` is now `zh-TW`. The ineffective duplicate HTML language setting was removed from `app/app.vue`; the Nuxt UI `zh_tw` locale remains unchanged.

A new actual SSR test covers homepage, Search, guide and Buyer login. It failed on the English HTML before correction and passed after the server's configuration reload completed. An initial attempt during that reload received 503 and was not counted as passing. The browser now reports HTML `zh-TW` and OG locale `zh_TW`.

## Search recovery

An invalid price URL displayed `無法完成搜尋` and `搜尋條件無效。`. The native clear action restored `/search`, removed the error and displayed 12 results. The initial timed-out attempt remains in `resume-search-recovery.json`; inspected and confirmed recovery is in `resume-search-recovery-confirmed.json`.

## Manual contrast review

Read-only computed-style checks composited text opacity and ancestor/pseudo-element background colors for the application elements that axe marked incomplete. No background image or center-point covering element was present.

| Text | Computed contrast ratio |
| --- | --- |
| 探索物件 | 4.91 |
| 購屋指南 | 8.00 |
| 我的收藏 | 4.91 |
| Guide disclaimer description | 8.51 |

All four exceed 4.5 for their 14-pixel text. These are computed-style checks for these elements, not a full pixel audit. Evidence is `resume-manual-contrast.json`. DevTools overlay incompletes are not application content; a production accessibility sweep is still needed.

## Consolidated results after corrections

All four commands returned exit 0 on the final run:

```sh
pnpm lint
pnpm typecheck
MADORI_TEST_URL=http://localhost:3010 node --test --test-concurrency=1 tests/*.test.mjs
pnpm build
```

All 114 tests passed, with zero failures, skips or cancellations. `git diff --check` passed. The earlier lint result failed on the new test regex; its assertion was corrected and every command reran. That failed run is not a passing checkpoint.

Passing logs are `resume-final-lint.txt`, `resume-final-typecheck.txt`, `resume-final-tests.txt` and `resume-final-build.txt`. The build uses cloudflare-module and retains the documented OG-image font warnings. Build success does not prove deployment resource limits.

## Remaining scope

The subsequent [native date follow-up](native-date-followup.md) verifies keyboard entry from empty controls and saving an existing Listing. The later [fresh publication verification](fresh-publication.md) completes separate local creation and publication for both types. Provider-outage recovery, the remaining workflow matrix and production accessibility remain unverified. Some browser cases use local fixtures or explicit field setup. They do not establish every end-to-end interaction.

Actual email receipt is deferred by the user. The goal is not complete. The subsequent [independent follow-up source review](browser-followup-review.md) found no defect in these corrections. Its scope does not include independent browser replay or the later native date actions.
