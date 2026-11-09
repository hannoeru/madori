# Browser rendering diagnosis

## Reproduction

At 390 × 844, open the Search filters in a clean `madori-checks` session using agent-browser 0.38.1 and HeadlessChrome 148. The accessible tree and DOM contain the dialog. The selected line and station are correct, and an axe audit of the dialog has zero violations.

The visible panel does not complete its entry animation. Its rectangle starts at x = 390, its transform is translateX(390), and the slide-in-from-right Animation reports currentTime = 0, startTime = null, and playState = running. The document timeline continues to advance. Visibility is visible, the tab has focus, fonts are loaded, and there is no active View Transition. Waiting for the actual animation to finish reaches its safety timeout.

A screenshot of that state times out in Page.captureScreenshot. No successful filter-panel screenshot exists yet. The simple mobile header panel has the same behavior without SearchFilters, according to independent reproduction by the Buyer helper. This rules out SearchFilters as a required cause.

## Attempts

- A new named browser session reproduced the failure.
- Explicit tab activation did not start the pending animation.
- Network-idle readiness and an animation-finished condition did not resolve it.
- Browser doctor offline/quick found no failed installation checks.
- The local Nuxt Icon endpoint returns HTTP 200 with requested lucide icons after local bundling. Remote icon loading is no longer required.
- A supported transition=false trial did not yield a successful screenshot. The change was reverted.

The failing browser state is not accepted as proof of a working mobile panel. Earlier gallery/floor-plan screenshots show a partially completed overlay transition and need a stable-frame retake.

## Next diagnostic step

Compare a new managed headed browser with the same minimal header-panel flow. Do not control user browser profiles or force animations to finish. Keep the application unchanged while distinguishing the browser runtime from application code.
