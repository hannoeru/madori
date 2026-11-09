# Resumed browser verification

## Later follow-up

[Browser follow-up](browser-followup.md) records the subsequent month-keyboard check, Agency B publication/type change, accessibility and language corrections, and the final 114-test checkpoint. Statuses and counts below describe this earlier run.

## Scope

The user authorized `agent_browser` and deferred email testing. This run uses managed sessions `madori-resume-qa` and `madori-resume-agency-b` against the existing local server at `http://localhost:3010`. The environment reports `PI_PROVIDER=openai` and `PI_MODEL=gpt-6.1-sol`.

No application source, browser animation settings, production resources or remote data changed. No email was sent. Registration used development-only test links and `example.invalid` accounts. No tokens, cookies or recovery credentials are included in this report.

## Rendering recovery

A fresh managed browser returned a normal requestAnimationFrame callback. At 390 × 844, the navigation and Search Slideover completed their normal transitions. The readiness condition checked dialog position and pending/running animations before screenshots. The Floor plan modal also completed its transition and loaded its image. Escape dismissed the modal.

This supersedes the current inability to render recorded in `browser-runtime.md`. The earlier failures remain valid historical observations. Their cause and the reason this fresh run works are not established. No foreground OS control or user browser profile was needed.

## Observed workflows

| Flow | Observed result |
| --- | --- |
| Mobile navigation | Panel fully onscreen, links visible, normal transition complete. |
| Restored Search | 東急東橫線 and 中目黑 selections persisted from the URL. |
| Invalid price range | Form displayed `最高價格不可低於最低價格。` and did not change the URL. |
| Corrected price range | Applying 1,000,000–100,000,000 JPY retained line/station/walking filters in the shareable URL and closed the panel. |
| Sorting and pagination | Selecting 價格由低到高 changed `sort=price_asc`; next-page action retained sorting and added `page=2`. |
| Details | JPY costs, transit and ordered photos displayed; Floor plan modal loaded and closed with Escape. |
| Buyer A registration/login | Native form submission and local test link opened the Buyer dashboard. |
| Saved Properties | Save changed the action to 移除收藏; Saved page showed the Property; removal produced the empty state. |
| Inquiry | Buyer A submitted a labeled local message. History showed its Property snapshot and failed Notification without losing the message. |
| Buyer B isolation | A second registration/login showed zero Inquiries and no Buyer A message. Logout returned to the public homepage with login-to-save actions. |
| Receiving Agency | Existing local test Agency login showed Buyer A's message. Mark-read updated the row and removed its action; a refresh retained read state. |
| Agency media | Original fixture PNG upload increased photos from two to three. Caption editing and moving the third photo to second position persisted after reload. Public detail thumbnails showed that order. |
| Withdrawal/publication | Withdraw action showed accepted feedback. The public detail API returned 404. Restore-publication showed accepted feedback; public details loaded again. |
| Agency B registration/isolation | A new Agency registered using Buyer B's email, with a separate role. Its inbox had zero items, another Agency's detail API returned 404, and Buyer-only API returned 403. |
| Draft validation | Empty dates produced field errors and no creation. With valid dates, native submit created `qg3phpdaddksuj1hnb0q8tk5`. Publishing incomplete facts/media produced a clear missing-data summary; the persisted state stayed draft and the public API returned 404. |

Agency A's tested Property is `f97vihix6omk55rtioo84xdp`, a visibly labeled original local demonstration Listing. It remains Published with three photos. The new Agency B Property remains draft. Both Buyers and the new Agency are local test accounts, not customers.

## Native date-input limitation

Native `fill` reported success on month/date inputs but a getter still returned an empty value. A segmented keyboard attempt also left the month value empty. No application defect is assigned from these observations.

For the draft validation test only, an explicit DOM setup assigned ISO values and dispatched normal input/change events. Native form submission then persisted the dates. This verifies the form's accepted-data and publication-gate paths, not native date-field keyboard entry. Native date-field interaction remains unverified. Validation, input types and application logic were not changed to make the test pass.

## Responsive and accessibility observations

Homepage, Search and guide were captured at 1440 × 1000 and 390 × 844. All six checks showed no horizontal overflow or broken visible images. Desktop details also showed no overflow, and its photo order included the newly uploaded image.

Native axe-core 4.12.1 WCAG 2A/2AA audits reported zero violations on the mobile homepage, Search and guide, desktop guide and desktop details. Incomplete contrast checks remain. They include DevTools overlay text, desktop navigation labels and the guide alert description. Zero automated violations is not a complete accessibility approval or a production audit.

`resume-mobile-audit.json` retains the first sweep's failed wait. That wait incorrectly required lazy images below the viewport to finish. `resume-mobile-search-guide.json` records the corrected visible-image readiness checks. Other failed waits used incorrect expected text, selector or route assumptions. Current page inspection followed those failures before further actions. They are not treated as passing steps or evidence of an application defect.

One early withdraw click did not change persisted state. After inspection confirmed it was still Published, a fresh native click succeeded. Source hydration timing is not independently proven as its cause.

## Artifacts

All screenshot calls reported verified artifacts with zero missing, pending or unverified entries. Files are in `docs/research/screenshots/`:

- `resume-mobile-navigation.png`
- `resume-mobile-filters.png`
- `resume-mobile-floor-plan.png`
- `resume-mobile-inquiries.png`
- `resume-mobile-agency-inbox.png`
- `resume-desktop-home.png`, `resume-desktop-search.png`, `resume-desktop-guide.png`
- `resume-mobile-home.png`, `resume-mobile-search.png`, `resume-mobile-guide.png`
- `resume-desktop-details.png`

Bounded JSON evidence is in this directory:

- `resume-mobile-audit.json`
- `resume-mobile-search-guide.json`
- `resume-details-audit.json`
- `resume-agency-isolation.json`
- `resume-draft-publication.json`

## Remaining verification

Native date-field keyboard entry, full error-recovery/focus coverage, complete fresh-media publication for both property types, provider-outage recovery and production accessibility remain open. This run does not establish every desktop/mobile end-to-end case.

Actual email receipt is deferred by the user. Local failed Notification feedback is not delivery evidence. The goal is not complete. Existing automated evidence remains 113 passing tests, lint/typecheck and a successful build; application code was not changed in this browser run.
