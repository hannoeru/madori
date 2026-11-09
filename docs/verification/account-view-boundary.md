# Account view boundary verification

## Scope

The environment reports `PI_PROVIDER=openai` and `PI_MODEL=gpt-6.1-sol`.

This change addresses the account-view isolation requirement behind BIR-01 in `docs/verification/buyer-inquiry-review.md`. It adds `app/components/AccountViewBoundary.vue` and replaces only the existing `<NuxtPage />` in `app/app.vue` with that boundary. The existing locale, theme, loading indicator, APIs, and authentication remain unchanged.

The boundary registers its client watcher during setup, before the page child starts requests. The watcher observes the principal's role and identifier synchronously. Each identity transition clears Nuxt async data and increments a view epoch. Same-tick Buyer A to B to A changes increment the epoch twice.

The epoch is the Vue key on the whole `NuxtPage` component. It is not a `page-key` override or a key on only its route child. Remounting the whole component removes the old Suspense branch and its page-local drafts, errors, pagination, and forms. Same-principal display-name and query changes do not increment this key or clear the cache.

## Private path gate

The boundary checks the router's current route, rather than Nuxt's deferred page route. This lets it gate a pending navigation to a private route before that route becomes the completed page.

- `/admin` and its descendants require an Agency.
- `/buyer` and its descendants require a Buyer, except the public Buyer login and registration pages.
- Public marketplace pages and the existing login and registration pages remain available.

When a private path has the wrong principal, `NuxtPage` is not rendered while redirection is pending. A current Agency goes to `/admin`; a current Buyer goes to `/buyer`. A guest goes to `/login` for an Agency path or `/buyer/login` for a Buyer path. Destinations are fixed local paths. The boundary does not use a supplied return URL.

## Installed Nuxt cancellation behavior

The tests read and execute the installed Nuxt `4.5.2` declarations from `node_modules/nuxt/dist/app/composables/asyncData.js`, rather than copying a proposed cache implementation.

`clearNuxtData()` without keys enumerates only `payload.data`. A first pending request can have an async-data entry and a promise but no payload data yet. The boundary therefore passes the union of payload keys and registered `_asyncData` keys to the public clearing function.

For each supplied key, the installed clearing function removes payload data and errors, resets the async entry to its default and idle state, clears its initial cached data, and deletes the pending promise registration. Installed success and error handlers compare their operation with that registration before they apply results. A removed operation cannot restore the previous account's result or error.

This is logical cancellation of cache updates. The installed `clearNuxtData` function does not itself abort the HTTP transport. The tests confirm that distinction. Direct server-side mutations already accepted under an initiating session are not undone by the boundary. The Agency helper owns guards for its direct mutation lifetimes.

## Authentication and hydration

The boundary uses the reactive `user` from the installed `useUserSession`. It does not add another session fetch, readiness protocol, or authentication API. It clears only Nuxt async data. Global `useState`, including session and authentication readiness, remains unchanged.

Installed `nuxt-auth-utils` stores the session in Nuxt state. Its server pre-plugin loads ordinary SSR sessions before rendering; its client plugin fetches sessions for client-only rendering and schedules deferred loading for cached or prerendered payloads and the client-only auth strategy.

The boundary starts at key `0` on both server and client. It installs no server identity watcher. The immediate client callback establishes the initial identity without clearing payload data or incrementing the key. Thus the existing hydrated session does not create a different initial page key. Later observed client identity changes invalidate the view.

Unseen cookie changes are not detected until `useUserSession` updates. No focus listener, cross-tab broadcast, cookie polling, or additional session protocol was added.

## Focused verification

Commands:

```sh
node --test tests/account-view-boundary.test.mjs
./node_modules/.bin/eslint \
  app/components/AccountViewBoundary.vue \
  app/app.vue \
  tests/account-view-boundary.test.mjs \
  docs/verification/account-view-boundary.md
```

The focused test run passes 18 tests with no failures or skips. Tests compile the actual SFC and mount it with real Vue and a custom renderer. The page substitute is stateful and contains real Vue Suspense. A pending branch first retains the old resolved view, so the test can distinguish a whole-page remount from a route-child change.

The controlled Nuxt cache executes the installed `clearNuxtData`, `clearNuxtDataByKey`, `buildAsyncData`, and abort-signal functions. Controlled requests use explicit promise completion, not fixed waits. Installed route-key generation is also executed to check default query behavior and custom route keys.

The tests cover:

- Root integration without a page-key override.
- Same-principal local state, query, and cache preservation.
- Synchronous cache clearing before the replacement page starts.
- First pending requests that do not yet have payload keys.
- Old Suspense branch removal, plus ignored late success and failure.
- Same-tick A to B to A invalidation.
- Agency to guest or Buyer transitions on Agency form paths.
- Buyer to guest or Agency transitions on Buyer private paths.
- Wrong-role pending navigation through the actual router path.
- Public login, registration, and marketplace paths for guests.
- Matching initial SSR/client keys and preservation of initial data.
- Actual Nuxt promise-registration cancellation and its transport limit.

Vue emits its standard experimental Suspense notice. This is not a test failure.

## Limits

The stateful page substitute tests the boundary's actual Vue key and Suspense lifetime. It is not a full mounted Nuxt router application or browser test. Source-backed route-key and cancellation checks do not replace integrated verification.

The coordinator owns full checks, build, and any later integrated verification. No Agency page, API, server, schema, dependency, or application configuration changed. No browser runtime trial, commit, deploy, or email send occurred for this task.
