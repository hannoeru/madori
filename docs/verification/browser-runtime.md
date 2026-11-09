# Browser runtime limitation

## Latest browser result

The user authorized a new `agent_browser` run and deferred email tests. Managed session `madori-resume-qa` now delivers requestAnimationFrame callbacks and normal Slideover/modal transitions. Verified screenshots and local workflows are recorded in [browser-resume.md](browser-resume.md). No application animation override or foreground OS control was used. The cause of the earlier failure and the reason for recovery remain unknown.

The sections below record the earlier failed trials. They do not describe the current fresh session's rendering state.

## Historical status

Runtime diagnosis stopped after the final permitted launch trial on 2026-10-09. The model environment reported `PI_PROVIDER=openai` and `PI_MODEL=gpt-6.1-sol` before the trials.

The failure occurs in managed Chrome 148 with default headless launch, native headed launch, and the requested GPU-disabled launch. Headed mode did not provide a successful alternative for browser verification. The exact cause is not established.

No application source, server, or configuration changed during these trials. No user browser profile or existing browser window was used. No animation was finished, paused, or otherwise forced. No external emails, deploys, full builds, or full checks ran.

## Environment

- Application: existing Nuxt development server at `http://localhost:3010`.
- Browser CLI: `agent-browser 0.38.1`.
- Browser binary: Chrome for Testing `148.0.7778.56` on macOS.
- Viewport: 390 × 844.
- Nuxt UI: `4.11.0`; Reka UI: `2.10.3`.
- Each trial used its own named managed session and a temporary browser profile.

## Observed results

| Trial | Session | Result |
| --- | --- | --- |
| Default headless | `madori-buyer-debug` | Search Slideover and simple homepage header Slideover remain offscreen. |
| Static page without a dialog | `madori-buyer-debug`, `/guide` | A normal `requestAnimationFrame` promise does not return within the 10-second safety limit. The Nuxt loading indicator animation also remains pending at time zero. |
| Native headed | `madori-buyer-headed-debug` | Homepage header Slideover remains offscreen. Frame callback and screenshot commands reach their safety limits. |
| GPU-disabled launch | `madori-software` | Plain homepage frame callback reaches its 10-second safety limit. Header Slideover readiness is false. Screenshot was not attempted because readiness failed. |

The header Slideover does not contain `SearchFilters`. It reproduces the failure without the Search page or its async station request. Async `SearchFilters` is therefore not required for this reproduction.

In every observed failed Slideover state:

- The DOM and accessibility tree contain the open dialog and its controls.
- Dialog bounds are `left=390`, `right=780`, `width=390`, and `height=844`.
- Its computed transform is `matrix(1, 0, 0, 1, 390, 0)`.
- The `slide-in-from-right` animation has duration 200 ms, `currentTime=0`, `startTime=null`, `pending=true`, and `playState=running`.
- The document timeline advances while the animation remains pending.
- The document reports visible status and focus. Fonts report loaded status.
- DOM inspection, navigation, and input commands still respond.

The default headless header trial also showed the overlay's `fade-in` animation pending at time zero. Computed CSS reports a zero delay, `animation-timeline: auto`, running playback, and visible content. The panel keyframes correctly specify `translateX(100%)` followed by `translateX(0px)`.

These observations show a failure to deliver rendering frames in the tested managed sessions. They do not identify whether Chrome, its compositor, the host display environment, or browser automation causes that failure. A progressing document timeline alone does not prove that rendering frames occur.

## Native headed inspection

The headed process had no `--headless` launch flag. Its user agent reported `Chrome/148`, rather than `HeadlessChrome/148`. Its native window state was `normal`, with outer bounds 500 × 987 and an emulated 390 × 844 viewport.

Read-only CDP inspection of that session's own target returned `Animation.getPlaybackRate = 1`. GPU compositing was enabled through Apple M1 Pro / ANGLE Metal. The launch did not contain virtual-time or begin-frame scheduling flags.

Explicit tab activation and `Page.bringToFront` did not resolve the failure. A screenshot command reached its 15-second safety limit without producing a successful image.

Native foreground status is not confirmed. An OS activation attempt targeted only the trial's managed process, but the OS reported `frontmost=false`. Further inspection of that process's native windows failed because `osascript` lacks Accessibility access. DOM focus is not proof of native foreground status.

## Final controlled launch

The final trial used the documented comma-separated arguments:

```sh
agent-browser --session madori-software \
  --args '--disable-gpu,--disable-backgrounding-occluded-windows,--disable-renderer-backgrounding' \
  open http://localhost:3010/
agent-browser --session madori-software set viewport 390 844
```

The owned browser process command line contained all three requested flags and used a new temporary profile. This trial retained the default headless mode.

A plain frame callback did not return within the runner's 10-second safety limit:

```text
new Promise(resolve => requestAnimationFrame(frame => resolve({
  frame,
  timeline: document.timeline.currentTime,
})))
```

The homepage header menu then opened through its visible `開啟導覽選單` button. A read-only check of dialog bounds and actual animation state returned readiness false, with the same offscreen bounds and pending animation listed above. No screenshot followed this failed readiness check. No further launch trials or frame-forcing attempts followed.

## Source inspection and other reported trials

`app/components/MarketHeader.vue` uses a normal Nuxt UI Slideover with static navigation content. `app/pages/search.vue` uses the same component with `SearchFilters` inside its body slot.

The installed Nuxt UI Slideover defaults `transition` to true. `.nuxt/ui/slideover.ts` assigns the 200 ms slide and fade animation classes. The installed Reka UI `Presence/usePresence.ts` reads computed animation names and listens for animation events. This path does not pause animation playback.

The coordinator separately reported that clean sessions, explicit tab activation, network-idle checks, an animation-finished condition, and the offline quick browser doctor check did not resolve the original Search failure. Earlier base-page and Property gallery/Floor plan modal screenshots worked. API and local icon requests returned 200. These earlier successes do not establish that the failing session can deliver frames.

The coordinator also tested the supported `transition=false` prop as a single-variable trial. It did not produce a successful screenshot, and the change was reverted. Disabling transitions is not a verified fix for this runtime limitation.

## Verification boundary

API, SSR, readable DOM, and accessibility-tree checks remain separate evidence. They do not prove that an open Slideover is visible, animated, or usable through a normal rendered frame.

Responsive visual verification, screenshots of the affected overlays, and browser interaction checks that require rendering remain blocked in this runtime. Do not report them as passed. Further runtime diagnosis requires a separate decision; this investigation has stopped.
