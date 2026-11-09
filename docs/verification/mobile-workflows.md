# Mobile Buyer and Agency workflows

## Scope

The coordinator used the named managed Chrome session `madori-mobile-workflows` at 390×844 on the owned development app, `http://localhost:3010`. Development authentication returns test links without sending mail. Development Inquiry notifications return `failed/local-disabled` before accessing EMAIL. No account or Inquiry form was submitted to the production-build preview on port 3011.

Only existing, labeled local demo accounts and original media were used. No real email, deployment, production change or commit occurred. The later `mobile-publication.md` completes a fresh mobile detached-house publication/lifecycle flow and Buyer B isolation. Provider-outage and complete manual-accessibility checks remain open.

## Buyer A

- Logged in through the native Buyer form and local test link.
- Saved fresh condominium `t5e4objarsi9ko4gxy7dkbrd` from its mobile detail page.
- Opened Saved Properties and observed the condominium.
- Submitted `示範・手機流程驗證：請確認公寓管理費與修繕積立金。僅限本機驗證，不寄送郵件。` through the native Inquiry modal.
- Followed the accepted result to Inquiry history. The message appeared there.
- An authenticated read confirmed exactly one matching Inquiry, addressed to `本機瀏覽驗證公司 B`, with Notification status `failed`.
- Removed the Saved Property. The empty state persisted after explicit fresh navigation.
- Logged out. A subsequent session read returned no user. The earlier URL wait was too broad to prove a homepage redirect; that redirect is not claimed here.

Evidence:

- `mobile-buyer-saved.json`
- `mobile-buyer-inquiry-accepted.json`
- `mobile-buyer-inquiry-history.json`
- `mobile-buyer-inquiry-persistence.json`
- `mobile-buyer-unsaved.json`
- `mobile-buyer-unsaved-fresh-navigation.json`

Two waits used incorrect expected button labels and timed out. The coordinator inspected the actual state before continuing. The Save mutation had succeeded and was not repeated. A reload batch failed its page-verification guard. `mobile-buyer-unsaved-reload-confirmed.json` records only subsequent inspection, not proof that reload executed. The separate fresh-navigation artifact establishes persistence.

## Receiving Agency B

The native Agency login used the same local Agency B account from earlier checks. The mobile inbox displayed Inquiry `d39f92e0ec77cf5103d019a06a6746038a4b845ba2946f6e2886db39ecc03357`. Native `標示已讀` removed the action. Fresh navigation retained that state. An authenticated Agency read confirmed `readAt: 2026-10-10T08:21:20.192Z` and Notification status `failed`.

Evidence is in `mobile-agency-inquiry-read.json` and `mobile-agency-inquiry-read-persistence.json`. The inspected Inquiry history and inbox had no horizontal overflow.

The mobile sidebar opened and navigated to All Properties. The first snapshot after the URL change still showed the previous sidebar. A later close attempt was rejected as stale because navigation had already closed it. A fresh snapshot showed the All Properties page. The stale-ref rejection is not an application defect or a second successful close action.

## Media validation and retry

The coordinator opened Agency B's fresh condominium editor. It initially had original photo `yaqrgerlb0flac46wggtywky` and Floor plan `h8qevnyebjbtgu6h4g6l0x6f`.

A native file upload supplied `.audit/media-invalid.png`, which contains text rather than image bytes. The media region announced:

`圖片內容無效。僅接受完整的 PNG 或 JPEG 點陣圖片。`

The original image IDs and kinds remained unchanged. The file input cleared and the upload/settings controls became enabled. No horizontal overflow was observed.

The coordinator then entered a new description and uploaded the original `tests/fixtures/interior-demo.png` through the same native file input. The success message appeared before the awaited image refresh finished, so the coordinator waited for two rendered photos and unlocked controls before checking persistence.

The editor and authenticated API then showed two photos and one Floor plan. New photo `xjtg7f80iq94bi39cby7vati` has description `示範・手機失敗後重新上傳照片`. The original photo remains the cover and the original Floor plan remains linked. The prior error disappeared. This added photo remains on the local Published demonstration Property.

Evidence:

- `mobile-media-before-invalid.json`
- `mobile-media-invalid-error.json`
- `mobile-media-invalid-preserved.json`
- `mobile-media-valid-retry.json`
- `mobile-media-valid-retry-persistence.json`

This proves invalid-content rejection followed by valid upload recovery. It does not simulate an R2 provider outage, worker interruption, compensation-insert failure, lost accepted response or operator recovery.

## Remaining checks

Fresh mobile detached-house creation/publication and Buyer B isolation are recorded in `mobile-publication.md`. Real provider-outage/recovery checks and the complete manual accessibility audit remain open. Actual Notification receipt remains explicitly deferred.
