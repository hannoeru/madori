# Fresh mobile Agency publication

## Scope and result

Agency B created a separate detached-house Listing from an empty form at 390×844 through native browser actions on `http://localhost:3010`. This was not a conversion of an existing condominium. No email, deployment, production migration or commit occurred.

The final Published Property is `fu52j64ig7pzxqm2fwtg0pq0`, titled `示範・手機完整建立獨棟住宅`. It remains a labeled local demonstration.

## Native creation

The native form selected detached house, resale, 世田谷區, 所有權 and 仲介. It entered 3LDK, original demonstration text/address, land 91.4 m², building 88.2 m², 木造 and two total floors.

Individual digit keys populated the empty native month and date controls with `2019-06` and `2026-11-12`. No scripted value assignment, dispatched input/change event, input-type override or validation bypass was used.

The coordinator saved the draft before adding media and transit. Publication without those items failed with:

`發布前請補齊：至少一筆交通、1至20張照片、一張格局圖、一張照片封面。資料尚未變更。`

The public API returned 404 for that draft.

Evidence is in `mobile-house-native-dates.json`, `mobile-house-draft.json` and `mobile-house-publication-gate.json`.

## Context loss and media acceptance

The managed session returned to `about:blank` during the first photo-upload sequence. Tab inspection found only one blank tab. The cause remains unknown. The coordinator reauthenticated with a development test link, reopened the saved draft and checked accepted server state before retrying.

The editor showed zero photos. The authenticated API confirmed an empty image list and the saved draft dates. The coordinator then retried the photo upload once.

An initial recovery extraction used the wrong API shape and failed. `mobile-house-draft-recovered-confirmed.json` supersedes that extraction. It is not evidence that the failed extraction changed data.

The original photo and Floor plan fixtures then uploaded through native file inputs. The Floor plan batch's wait expression had invalid quote nesting and timed out. A fresh snapshot showed the accepted Floor plan and unlocked controls. The coordinator did not repeat the Floor plan upload. This timeout is not an application or provider failure.

The final image IDs are:

- Photo and cover: `bbl2pjh7uece9ti1vianpabm`.
- Floor plan: `kpr3wyrzeicce0ufz8jhd7ot`.

No linked image was deleted during recovery.

## Publication and lifecycle

The native station menu selected `田園都市線 三軒茶屋`, with eight walking minutes. Native publication succeeded. The public API confirmed both image kinds, detached-house type, exact JPY price, applicable areas, dates, structure and total floors.

The coordinator changed the price from 76,000,000 to 76,500,000 JPY through the native editor and confirmed the public API value. Native withdrawal produced public API 404. Native restoration produced public API 200 with the edited price and the same image IDs. No permanent deletion was attempted.

Evidence:

- `mobile-house-published.txt`
- `mobile-house-public-api.json`
- `mobile-house-price-edit.json`
- `mobile-house-withdrawn.json`
- `mobile-house-restored.json`

The editor had no horizontal overflow. The mobile public detail also loaded through the final local production build at port 3011. The verified full-page screenshot is `docs/research/screenshots/mobile-created-house-production.png`, 390×3715. It shows original media, price, applicable house facts, transit, freshness and Agency contacts. Screenshot existence does not establish a complete accessibility audit.

## Isolation and logout

Agency B's authenticated reads returned 403 for the Buyer Inquiry API and 404 for Agency A's Property. See `mobile-agency-access-denial.json`.

The Agency logout returned to `/login`. A wait for `/` timed out because it expected the wrong route; the coordinator inspected the login page and did not repeat logout.

The native Buyer login then used the separate Buyer B account with the same email as Agency B. Buyer B's session role/name were correct, its Inquiry history was empty, Buyer A's mobile message was absent, and the Agency Inquiry API returned 403. Native Buyer B logout reached the homepage. A later check confirmed the homepage heading and a guest session.

Evidence:

- `mobile-buyer-b-history.txt`
- `mobile-buyer-b-isolation.json`
- `mobile-buyer-b-logout.json`
- `mobile-buyer-b-logout-confirmed.json`

## Limits

This completes the basic mobile creation, upload, publication, edit, withdrawal and restoration flow for a detached house. Both property types were separately created and published at desktop width in the earlier fresh-publication checks. Fresh mobile condominium creation was not repeated.

The managed-browser context-loss defect remains unresolved. These checks do not prove R2 provider-outage or lost-accepted-response recovery, operator recovery, complete manual accessibility, deployed Worker resource limits or actual Notification receipt. Real email remains explicitly deferred.
