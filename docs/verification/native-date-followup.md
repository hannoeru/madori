# Native date follow-up

## Scope

The user requested continuation after compaction. The coordinator followed parentId links to `81320b1c`, read the current worktree, and continued local `agent_browser` verification. No new Pi process was started. The existing independent reviewer remained on `openai/gpt-6.1-sol`. Email testing remains deferred.

## Completed checks

- Native key presses changed Agency B's existing day-date field from `2026-11-09` to `2026-11-10`. The readback returned the exact new ISO date. Evidence is `resume-native-date-entry.json`.
- Native Save reported `物件已儲存並發布。`. The subsequent in-browser API check timed out and lost its page. The mutation was not repeated. A separate read-only public API call confirmed `nextUpdateOn: 2026-11-10`, construction month `2011-02` and detached-house type. Evidence is `resume-native-date-persistence-confirmed.json`. The raw HTTP read confirms persistence, not shared-browser liveness. The timed-out check remains in `resume-native-date-persistence.json`.
- In a fresh managed session, individual key presses entered `2026-11-10` from an empty plain HTML date control. Evidence is `resume-native-date-empty-control.json`.
- In the actual new-Property form, individual key presses entered construction month `2015-04` and day-date `2026-11-10` from empty native controls. The interactive snapshot records both values and the other condominium facts before save. Evidence is `resume-native-date-new-form.json`, extracted from the recorded tool result `abc8fcf9` without auth-link or credential data.

The keyboard sequence clicked the input, used ArrowLeft twice to reach the year, pressed the year digits individually, used ArrowRight to reach month and day, pressed those digits individually, then used Tab. No scripted value setter, synthetic input event, input-type change, validation change or animation override was used.

## Interrupted creation flow

The Agency reauthenticated using the local test link. A wait for an incorrect link label timed out; inspection showed `使用測試連結登入`, and that current link completed login. No real email was sent.

The new condominium form had its facts and dates entered, but opening the station selector returned an empty snapshot. A subsequent listbox wait timed out. Read-only recovery showed about:blank and only one blank tab. The unsaved form did not reach the create step. This is not proof of complete fresh creation or an application station-selection defect.

The browser doctor reported 14 passes, one warning and zero failures. Its warning is missing ffmpeg, which affects recording rather than these page checks. That launch/dependency check does not explain the context loss. Evidence is `resume-browser-health.json`. The cause of the context loss remains unknown.

## Independent source review

The existing `madori-architecture` reviewer completed a narrow independent review of the station-name, floor-fact and site-locale corrections. No findings remain in that scope. The report is `browser-followup-review.md`.

The reviewer confirmed the model environment, inspected the source, tests, installed dependency behavior and supplied evidence, and changed only its report. It did not run tests or browser flows. Its review predates these later date checks and does not verify them.

## Current result and remaining work

Native date entry now has direct keyboard evidence from an empty control and an empty application form. Editing and saving an existing Listing also has independent API persistence evidence. At this checkpoint, complete fresh creation/publication remained open because the new-form run lost its browser context. The later [fresh publication verification](fresh-publication.md) completes separate local creation, media upload and publication for both types, with their desktop/mobile public-detail checks.

No application source changed during this follow-up. The source checkpoint remains 114 tests passed, no failures/skips/cancellations, and lint/typecheck/build exit 0. Browser context-loss recovery, the remaining desktop/mobile matrix, provider-outage recovery and production accessibility are not complete. Actual Notification receipt remains deferred. No deployment, production change or commit occurred.
