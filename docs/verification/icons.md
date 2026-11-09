# Local icon bundle correction

## Reproduction

The local production condominium detail returned HTTP 200 while Wrangler logged failures for `lucide:heart`, `lucide:train-front`, `lucide:expand`, `lucide:mail` and `simple-icons:line`. The ignored diagnostic `.audit/icon-ssr-check.mjs` requests that same detail and checks newly appended icon failure warnings. It failed before the correction. See `icons-ssr-red.txt`.

Both bundled icon API requests returned HTTP 200 with the requested names. The old generated client bundle contained 43 Nuxt UI icons but omitted these five app icons. Thus the warnings did not prove a missing local collection. The precise failure inside the runtime server-side loader was not established.

## Correction

`nuxt.config.ts` now enables the installed Nuxt Icon `clientBundle.scan` capability. The module scans the app's static icon names and packages them with the existing Nuxt UI icons. It retains the local lucide/simple-icons server collections and `fallbackToApi: false`; no external fallback or custom loader was added.

The build reports 65 icons and 17.50KB uncompressed client icon data, compared with 43 icons and 10.40KB before scanning. The same local production SSR diagnostic then returned HTTP 200 with no new icon-loading warnings. See `icons-ssr-green.txt` and `storage-icons-build.txt`.

The actual production Nuxt configuration regression failed before the correction and passed after it. It checks scanning, local collections and disabled external fallback. It is a configuration invariant, not an asset-rendering test. See `icons-config-{red,green}.txt` and `tests/hydration-config.test.mjs`.

## Browser and review limits

Hydrated Search and condominium detail at 320px retained no horizontal overflow. Inspected icon spans had non-empty computed mask/background images, including the five previously warned names. See `icons-hydrated-pages.json`. The Search extraction includes hidden filter controls; it does not claim they were visible. CSS availability alone is not a full pixel audit or proof that every icon in every state renders.

The independent narrow source review is `icons-review.md`. Source review does not replace production browser checks.

The full checkpoint passed lint, typecheck, all 122 tests and production build. No email, deployment, production migration or commit occurred. Unknown icon names, runtime loader behavior outside the scanned app icons and deployed Worker resource limits remain outside this correction.
