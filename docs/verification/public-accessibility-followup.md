# Public accessibility follow-up

## Scope

These checks use the latest local Cloudflare-module production build at port 3011 and explicitly local demonstration data. Authenticated Agency station checks use development port 3010. No production resource changed and no email was sent.

The previous local server and helper processes were no longer running after continuation. The coordinator inspected pane/process state, then restarted only the owned local development and production servers. The first connection-refused browser result remains in `production-agency-session-readonly.json`.

A development Agency session did not authenticate against the local production build. Both production read-only probes redirected to login with a guest session. No authentication or Inquiry form was submitted there, and no secret/configuration was changed to make the session transfer work. These probes do not establish authenticated production-build coverage. See `production-agency-session-readonly-confirmed.json` and `production-agency-session-reused.json`.

## Illustration notice contrast

The illustration notice used a 95%-opaque paper background. Computed-color bounds were 4.39:1 over black and 4.93:1 over white. The black bound is hypothetical, not proof that a current illustration pixel failed. The result showed that the caption's contrast depended on the image behind it.

`TokyoScene.vue` now uses opaque `bg-default`. Its measured foreground `[98,111,103]` and background `[248,247,243]` give 4.91:1 at 12px, with unit opacity through its ancestor chain. The caption remains visibly marked `街景示意圖・非實際物件` and does not overlap other content.

The actual homepage SSR regression failed before this class correction and passed afterward. The first lint run rejected its regex; the corrected regex requires whitespace before the class attribute. That lint failure remains in `caption-initial-lint-failed.txt`.

Evidence:

- `production-caption-guide-contrast.json` records the original caption bounds and guide notice contrast of 8.51:1 after its 0.9 text opacity.
- `caption-red.txt` and `caption-green.txt` record the SSR regression.
- `production-caption-contrast-fixed.json` records the final opaque colors and ratio.
- `production-home-caption-a11y-focus.json` records zero axe violations and only the three header-navigation contrast incompletes. The caption no longer appears among them.
- `docs/research/screenshots/home-caption-production.png` was captured after all three card images loaded and fonts settled, and was visually inspected. The earlier unsettled image is retained as `home-caption-production-loading.png`; it is not settled-image evidence.

These measurements do not establish complete pixel contrast or all-state accessibility approval.

## Mobile navigation and focus

At 320×900, genuine focus and Enter opened the production navigation panel. Native Shift+Tab wrapped from Close to its last link. Seven subsequent Tab presses followed Close, the three navigation links, Buyer login and Agency entry, then wrapped to Close. Every sampled stop remained inside the panel and had a visible 3px forest outline. Escape removed the panel and returned focus to the opening button.

The panel has the accessible name `Madori 導覽`. Its background root has `aria-hidden=true` while open. All six panel controls have at least 44×44 targets. It fits the 320px viewport without horizontal overflow.

The open-panel axe audit reports zero violations and two incomplete categories: hidden-background focus and obscured background contrast. The direct keyboard loop verifies the sampled modal focus containment; it is not a general exemption for hidden focusable content. See `production-mobile-navigation-keyboard.json` and `production-mobile-navigation-modal-a11y.json`.

Native Tab on the desktop homepage first focused the named homepage link with `:focus-visible`, a 3px outline and 4px offset. See `production-home-caption-a11y-focus.json`.

## Station controlled-element lifecycle

The production Search trigger initially emitted `aria-controls=""` after hydration. A proposed SSR regression did not reproduce this client-only state and was removed. Its passing non-reproduction result remains in `station-controls-ssr-non-reproduction.txt`; it is not a red test or regression proof.

The [WAI-ARIA 1.2 attribute-value definition](https://www.w3.org/TR/wai-aria-1.2/#propcharacteristic_value) defines an ID reference list as one or more ID references. Installed Reka ComboboxTrigger binds its context's content ID before the lazy popup has a usable ID. Nuxt UI forwards explicit attributes to that trigger.

Search and Agency station menus now control their existing open state. While closed, a declarative attribute binding omits `aria-controls`. While open, the app supplies no override, so Reka's native listbox ID remains in use. Agency open state belongs to each view-local Transit entry and is excluded from the existing serialized Property payload. No custom IDs, DOM patch, timing delay, dependency edit or compatibility fallback was added.

Desktop production Search verifies zero empty controls, all six correct numeric-label associations, no overflow and no remaining ARIA-value audit incomplete. Native opening resolves the actual listbox, enters its search combobox, and preserves zero empty controls. Escape restores the station trigger and omits the attribute again.

At 390×844, the production filter panel retained all six labels, no overflow and no empty controls. Native station opening and its first Escape completed with the same listbox/focus behavior. The subsequent outer-panel Escape command lost its browser context before reporting completion; outer dismissal is not established by that result. Earlier independent filter-dialog Escape evidence remains in `keyboard-320-search-filters.json`.

Authenticated Agency B at 390×844 opened the existing house's station menu. Its closed trigger omitted the attribute; the open relationship resolved a listbox and focus entered the combobox; Escape restored the named trigger and omitted the attribute. No Listing or media mutation was submitted during this check.

Evidence:

- `station-controls-browser-before.json`
- `station-controls-dev-{closed,lifecycle}.json`
- `station-controls-production-{closed,lifecycle}.json`
- `station-controls-production-mobile-{closed,lifecycle}.json`
- `station-controls-agency-{closed,lifecycle}.json`

To repeat the browser regression, open hydrated Search, assert that no element has `aria-controls=""`, focus the visible station trigger and press Enter, wait until its controlled ID resolves to a listbox, assert combobox focus, then press Escape and assert trigger focus with no controls attribute. Run this on desktop and inside the mobile filter panel. Use fresh interactive snapshots at mutation boundaries.

## Additional limits and current checks

Native browser zoom shortcuts did not change the measured viewport, device-pixel ratio or root font size. `production-native-zoom-shortcut.json` is non-verification evidence. Actual browser zoom/text-resize remains open; CSS-width reflow checks are not a substitute for claiming that test ran.

An additional fresh mobile condominium form was filled for Agency C. A later dropdown/date-key batch lost its browser context before draft save. No save command was issued and no successful creation/publication is claimed for that attempt. The earlier desktop condominium and mobile detached-house lifecycles remain separately verified.

The final station-control source checkpoint passes lint, typecheck, all 124 tests with zero failures/skips/cancellations, production build and diff checks. Logs are `station-controls-{lint,typecheck,tests,build}.txt`. The station lifecycle has direct browser evidence, not a newly added automated hydration test. Its narrow source changes have not received an independent reviewer follow-up after the earlier helper processes stopped.

Managed-browser context loss, complete manual accessibility, real provider/operator outage recovery and actual Notification receipt remain open. No deployment, production migration, customer message or commit occurred.
