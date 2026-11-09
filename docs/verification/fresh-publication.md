# Fresh Property publication verification

## Scope and result

Both property types completed separate local Agency creation flows through native `agent_browser` actions. This run does not reuse the earlier Listing type conversion as proof of fresh creation. Email testing remains deferred. No application source, validation rule, animation, production resource or deployment changed.

The Agency is the existing local demonstration Agency B. Both Listings and their media are visibly labeled as demonstrations, not real offers.

| Property | Published ID | Accepted facts |
| --- | --- | --- |
| Condominium | `t5e4objarsi9ko4gxy7dkbrd` | 64,000,000 JPY, 目黑區, 53.2 m², 2LDK, built 2015-04, unit floor 2 of 8, management 11,000 JPY/month, repair reserve 12,000 JPY/month, 中目黑/東急東橫線 six minutes |
| Detached house | `qik2imt3volkgn7udiwn2vr3` | 72,000,000 JPY, 世田谷區, 92.5 m² land, 84.3 m² building, 2LDK, built 2018-09, 木造, two total floors, 三軒茶屋/田園都市線 nine minutes |

Each flow entered facts into an empty Agency form, entered month/day-date digits with native keys, saved a draft, selected rights and transaction type, uploaded an original labeled photo and Floor plan, selected a station and walking time, and published. Both next-update dates are `2026-11-10`.

Drafts were saved before the station selector or media steps. The house's public detail API returned 404 while it was a draft. After publication, separate public API reads returned the accepted facts and media. The house's condominium-only area, unit floor and monthly fees are null. Each Property has one cover photo and one Floor plan.

## Interruptions and recovery

The managed session `madori-publish-qa` used a pinned tab. Some operation batches still timed out and the session returned to about:blank. Read-only tab inspection showed only a blank tab, not the old editor. Pinning did not prevent this context loss.

The saved drafts retained facts and dates. After local reauthentication, the editor showed that rights and transaction changes had persisted despite the timed-out batch. The media count was still zero, so the later photo upload was not a blind repeat of an unknown accepted upload. The coordinator inspected before continuing each recovery.

Later page opens waited for Nuxt hydration to finish and the expected page heading before using current interactive refs. Station selection used a separate click, fresh filtered snapshot, and current option ref. These later steps passed. This does not establish that hydration caused every earlier failure or that the browser context-loss defect is fixed.

No real email was sent by local test-link authentication. Auth URLs, tokens and cookies are not included in the evidence artifacts.

## Public desktop, mobile and keyboard checks

Both new detail pages were checked at 1440×1000 and 390×844. All four cases showed the correct title, `zh-TW` language and type-specific facts. No horizontal overflow occurred. Visible main-content images were loaded with nonzero natural width. Offscreen lazy images were not treated as failed loads.

The condominium displays `所在樓層／總樓層` as `2／8`. The house displays only `總樓層` as `2` and shows both land and building area with approximate 坪.

On the mobile house page, the Floor plan opened and its image loaded. Escape dismissed the dialog after normal transitions. Focus returned to the `放大查看` button. No forced animation completion was used.

Four screenshots were saved with every artifact verified:

- `docs/research/screenshots/fresh-desktop-condo.png`
- `docs/research/screenshots/fresh-mobile-condo.png`
- `docs/research/screenshots/fresh-desktop-house.png`
- `docs/research/screenshots/fresh-mobile-house.png`

## Evidence

- `fresh-condo-draft.json`
- `fresh-condo-publication.json`
- `fresh-condo-public-api.json`
- `fresh-house-draft.json`
- `fresh-house-publication.json`
- `fresh-house-public-api.json`
- `fresh-public-layouts.json`
- `fresh-floor-plan-keyboard.json`

The public API evidence uses raw HTTP reads. Those reads prove accepted public data, not browser liveness. The browser actions, rendered facts, image readiness, modal and focus checks have separate native-browser evidence. The expected draft 404 did not produce a saved API artifact and is recorded here as an observed tool result.

## Remaining scope

Fresh creation, media upload and publication for both types are now verified locally. The creation flows did not repeat at mobile width; public details did. The complete desktop/mobile workflow matrix, provider-outage recovery, production accessibility and actual Notification receipt remain open. Context loss remains unexplained and can still require reauthentication.

The last full source checkpoint remains 114 tests passed with no failures/skips/cancellations, and lint/typecheck/build exit 0. Source did not change in this browser run. The goal is not complete. No email, customer message, deployment, production change or commit occurred.
