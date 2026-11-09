# Registration, Agency landmarks and freshness review

## Native registration

At 390×844 on the development app, a new Buyer submitted the native registration form with an explicitly local name and `browser-form-c-1791629@example.invalid`. Empty submission showed name/email errors with `aria-invalid` and resolvable `aria-describedby` associations. A later click-and-wait batch timed out without showing a test link. Inspection showed valid inputs, no alert and no captured registration request. Genuine focus and Enter on the submit control then produced the local test link. This does not count the timed-out click as an accepted registration.

The test link signed in `本機・手機註冊買方 C`. The session role was Buyer, the dashboard rendered without overflow, and the Agency Inquiry API returned 403. See `mobile-registration-validation-confirmed.json`, `mobile-registration-submit-inspection.json` and `mobile-buyer-registration-accepted.json`.

After native logout, the Agency form registered `本機・手機註冊公司 C` with the same email, an explicit demonstration/non-real license string and a line.me demonstration URL. An unsupported LINE domain first produced a specific error associated with the LINE input. Correcting that native field and submitting by keyboard produced a local test link.

The Agency signed in immediately, without an approval queue. A wait for a native `<main>` element timed out because the original shared dashboard had none; this was not failed authentication. Inspection confirmed the Agency role/name, an empty own Property collection, Buyer API 403, foreign Property 404 and no overflow. See `mobile-agency-registration-line-validation.json` and `mobile-agency-registration-confirmed.json`. No email was sent and no test-link href/token was copied into these artifacts.

## Main landmark and heading correction

The shared dashboard content panel now has `role="main"`. Installed Nuxt UI DashboardPanel has no `as` option, renders a fixed div and explicitly forwards attributes to it. This keeps the sidebar outside the main landmark and retains the existing panel structure. The standalone new/edit Property pages already use native main elements.

The authenticated SSR regression checks one native main or main role across five Agency routes. It also checks one primary h1. The inner freshness-review heading is now h2 under the shared navbar h1. Native mobile navigation confirmed one main landmark and no overflow across `/admin`, `/admin/properties`, `/admin/reviews`, `/admin/inquiries` and `/admin/properties/new`. See `mobile-agency-main-landmarks.json`.

The SSR test exposed a test-client cookie problem. A real `/admin` response sets `dashboard-sidebar-admin`. The old helper replaced all cookies with that preference cookie, discarding `nuxt-session` before the next request. The test helper now merges cookies by name; production authentication did not change. It is not a complete browser cookie jar.

The initial main-landmark and primary-heading regressions failed before their source corrections. The independent review found ALR-01, a missing role-attribute boundary in the test regex. The regex now requires whitespace before `role`, so a data-role suffix cannot count as a landmark. See `agency-landmark-review.md` and `landmark-{red,heading-red,green}.txt`.

## Freshness review lifecycle

Agency B used the existing labeled local house `fu52j64ig7pzxqm2fwtg0pq0`. It initially retained next update date `2026-11-12`.

The first native date-click/key batch lost its managed browser context to `about:blank`. Tab inspection found one blank tab. No save was issued. After local reauthentication and fresh navigation, the editor still showed the original persisted date. The cause of the browser loss remains unknown.

Native focus followed by individual digits/arrows/Tab changed the date to `2026-10-01`. Readback confirmed a valid native date. DOM/API area values remained exactly 91.4 and 88.2 m²; longer decimals in Chrome's accessibility spinbutton snapshot were not the input or stored values. See `freshness-date-recovered-focus.json` and `freshness-native-date-confirmed.json`.

Native save kept the Listing Published, retained the same photo/Floor plan IDs, and placed it in Agency B's due queue. The desktop review list and its mobile layout displayed the demo with no horizontal overflow. Agency C's own due query remained empty and did not expose that Property. See `freshness-due-api.json`, `freshness-due-browser.json` and `freshness-foreign-agency-isolation.json`.

The native review link opened the editor. Individual native keys restored `2026-11-12`; save kept Published status and the same media. A fresh API read excluded the Property from the due queue, and fresh review navigation showed `沒有到期物件`. See `freshness-restored-confirmed.json`. The local demo is not left overdue.

## Verification and limits

The final source checkpoint passes lint, typecheck, all 123 tests, production build and diff checks. Logs are `landmark-final-{lint,typecheck,tests,build}.txt`.

Registration and freshness mutations occurred only on the development app. The real local-production build was compiled but these authenticated browser checks did not submit production-build account forms. The independent source reviewer did not run tests or browsers.

Managed-browser context loss, complete manual accessibility, real provider/operator outage recovery and actual Notification receipt remain open. No email, deployment, production migration, customer message or commit occurred.
