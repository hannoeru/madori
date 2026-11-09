# Coordinator delivery review

## Scope

Starting revision is `133244ee6352b0c5e89c219f0f0ab9cb7a6007f9`, still HEAD. All implementation changes remain uncommitted. This review uses the working-tree diff and the new files, not an empty three-dot commit comparison.

The coordinator confirmed `PI_PROVIDER=openai` and `PI_MODEL=gpt-6.1-sol`. No new helper was started after the earlier helper processes stopped. This is an author/coordinator review, not independent approval.

The review combines earlier independent reports for their stated source scopes with current source inspection of the Agency form/shell, canonical schemas, authentication utility, Nuxt configuration, test scripts, caption, station lifecycle and new regressions. It does not claim a fresh independent full-repository review.

## Standards

The current changes retain Nuxt UI, Vue, Valibot, Drizzle and the existing Cloudflare architecture. Buyer/Agency role checks remain at request boundaries. Shared schemas own validation and publication rules. Presentation, media handlers and cleanup/recovery concerns remain separate.

The station correction uses supported controlled-open props and attribute forwarding. Its two small conditional bindings do not justify a new wrapper or application-wide DOM patch. Agency station-open state is local to its Transit entry. The serialized payload explicitly contains only station ID and walking minutes.

The caption correction uses the existing semantic background token. Hydration ID boundaries retain only the necessary Vue hook registration. Local icon scanning keeps the existing collections and disables external fallback. Test files run serially because public totals share a database; explicit races inside files remain concurrent.

No new compatibility layer, deployment, remote migration or speculative retry was found in the inspected final corrections. The existing global privacy/view-lifetime guards remain intact.

## Spec

The implementation and earlier browser evidence cover the public pages, shareable Search, Published-only visibility, Applicable facts, image/Floor plan presentation, JPY/坪, transit, declared Agency contacts, Buyer saved/history and Agency publication/freshness workflows. The scope stays within condominium/house sales in Tokyo's 23 wards.

Two-Agency/two-Buyer isolation, accepted-save and Inquiry races, role-bound one-use authentication, media cleanup and lifetime guards have rerunnable source/API tests. Fresh desktop condominium/house and mobile house publication are separately recorded. The interrupted later mobile condominium attempt is not counted as another completed workflow.

Actual Notification receipt remains missing and explicitly deferred. Local failed Notifications do not satisfy that requirement. Complete manual accessibility, actual text-resize/browser zoom and live provider/operator interruption recovery remain unverified. These limitations prevent overall goal completion.

## Finding disposition

AIC-01 exposed a real cooldown/accepted-link race during final source inspection. Its held-read actual-utility/Drizzle/SQLite regression failed before correction. The predicate now executes inside a conditional INSERT in the same D1 batch as old-token cleanup. Returning an accepted ID gates success. The rejected concurrent request cannot delete the winner.

Three isolated local tests cover the race, role independence and recent/older token behavior. The real development API test requires one success, three cooldown denials and a usable winning link. No EMAIL binding or actual send is used by these tests. See `auth-issuance.md`.

The earlier independent findings remain resolved within their reports' scopes. No additional source defect remains in the final corrections inspected here. This is not a claim about every possible runtime or provider failure.

## Current execution

| Check | Result | Evidence |
| --- | --- | --- |
| Lint | Exit 0 | `auth-issuance-final-lint.txt` |
| Typecheck | Exit 0 | `auth-issuance-final-typecheck.txt` |
| Local API/source tests | 128 passed, zero failures/skips/cancellations | `auth-issuance-final-tests.txt` |
| Cloudflare-module build | Exit 0 | `auth-issuance-final-build.txt` |
| Diff whitespace | Exit 0 | Coordinator command result |

Browser evidence and retained failures are in `public-accessibility-followup.md`, `registration-freshness.md`, `reflow-keyboard.md`, `mobile-workflows.md` and `mobile-publication.md`. These reports distinguish actual observations from source tests, computed styles, historical failures and unresolved cases.

No email, customer message, deployment, production change or commit occurred. The code and evidence are ready for handoff, but the goal remains incomplete.
