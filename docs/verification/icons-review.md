# Independent application icon review

## Scope and result

Model: `openai/gpt-6.1-sol`, confirmed through the model environment.

No findings in the narrow configuration and regression-test change. The reviewer independently inspected `CONTEXT.md`, [`nuxt.config.ts:73-77`](../../nuxt.config.ts#L73), [`tests/hydration-config.test.mjs:8-18`](../../tests/hydration-config.test.mjs#L8), installed Nuxt Icon 2.5.0 types and implementation, relevant generated icon bundles, and the supplied hydrated-page artifact. The broad worktree was not reviewed.

## Configuration behavior

`clientBundle.scan: true` is a supported Nuxt Icon option, documented as experimental in the installed types. It supplements configured icons and module-supplied icons with statically detected names. It does not replace the local server collections or enable an external runtime fallback.

The installed scanner reads matching source files in Nuxt layers. Its defaults include Vue and Markdown, but exclude tests and dot directories. The current literal application icon names use a supported syntax. The inspected generated client bundle contains `heart`, `expand`, `train-front`, `mail`, and `simple-icons:line`, among other icons.

The installed shared icon loader initializes this bundle before looking up an icon. That code runs for SSR as well as the client. A bundled icon returns before the asynchronous runtime loading path that emits failure warnings. This explains why enabling a client-named bundle can also remove the reported SSR warnings.

`fallbackToApi: false` remains in place. The default SSR provider is the local server provider, and the generated server bundle still imports the installed `lucide` and `simple-icons` collections. The existing hydration-boundary preservation module remains unchanged. Scanning addresses icon availability, not the separate Vue ID-boundary correction.

## Regression scope

The new test loads actual Nuxt with `dev: false`. Installed `loadNuxt` awaits readiness by default, so the assertions inspect resolved production configuration after module initialization. The test checks scan enablement, disabled external fallback, and the two server collections, then closes Nuxt in `finally`.

It is a configuration regression, not an icon-rendering regression. It does not assert generated membership, icon data, resolved runtime provider/resources, emitted warning absence, SSR delivery, or client hydration. A configuration pass alone cannot establish those results.

## Coordinator evidence

The coordinator reports that the old bundle contained 43 Nuxt UI defaults but omitted five application icons. Direct local HTTP requests returned correct bundled icon API data while SSR logged icon failures. With scanning enabled, the coordinator reports 65 icons at 17.50 KB and no icon warnings in the same local production detail reproduction. The reviewer did not run or independently observe those processes. The installed generator reports uncompressed icon JSON size, not compressed network transfer size.

[`icons-hydrated-pages.json`](icons-hydrated-pages.json) records CSS masks for sampled icons on local production Search and Property detail pages. It also records no overflow and `zh-TW` on the detail page. These are coordinator browser results, not reviewer browser actions or complete page coverage.

A successful direct icon API request does not prove the SSR runtime loader works. Prebundling the known icons avoids that loading path; it does not establish that the underlying failure for an unbundled icon has been corrected.

## Limits and execution

The scanner cannot resolve arbitrary dynamically constructed names. Plain JavaScript/TypeScript files are outside its default file patterns. Future icon additions and dependency upgrades need generated-bundle and runtime verification; the new configuration test does not cover those cases. Bundle growth remains subject to the installed default 256 KB uncompressed limit.

Only `docs/verification/icons-review.md` and `docs/verification/media-http-review.md` were written. No tests, builds, browsers, database operations, data mutations, agents, Pi processes, emails, deployments, commits, or external actions ran. No deployed production result, complete icon/accessibility approval, real session verification, or external R2/provider-outage result is claimed.
