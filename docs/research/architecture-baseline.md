# Madori architecture baseline

## Overview

Madori is a Nuxt 4 application with a public Property search site and an Agency dashboard. Nitro runs the server on Cloudflare Workers. Drizzle accesses D1, R2 stores Property images, and a Cloudflare Email Service binding sends Agency magic links. Valibot validates API inputs. `nuxt-auth-utils` manages sealed cookie sessions.

This report describes the source at Git revision `133244ee6352b0c5e89c219f0f0ab9cb7a6007f9` and the installed dependencies inspected in this session. It is a source review, not a production audit or a completed runtime test. Application code, deployment state, email delivery, and secrets were not changed or inspected through authenticated services. No helper agents were started.

### Confirmed scope

- Buyers are Taiwanese users. Buyer pages and messages use zh-TW.
- Properties are new or resale condominiums and detached houses in Tokyo's 23 wards.
- Multiple Agencies can register immediately. Each Agency has one dashboard account. Individual brokers, staff accounts, invitations, and approval queues are not required.
- Buyers need accounts, saved Properties, and inquiry history.
- Each Inquiry must persist and reach the owning Agency's inbox. The Agency must also receive an email notification.
- Saved searches are out of scope. A shareable Search is not a saved search.

The confirmed scope governs this recommendation. The existing portal research contains wider suggestions, but those suggestions do not add requirements here.

Sources: [CONTEXT.md](../../CONTEXT.md), [README.md](../../README.md), [package.json](../../package.json), and the confirmed task scope.

### Dependency baseline

The installed versions were Nuxt `4.5.2`, Nitro `2.13.4`, `nuxt-auth-utils` `0.5.30`, Drizzle ORM `0.45.2`, Valibot `1.4.2`, and Wrangler `4.125.0`. The application uses Nitro 2's `event.context.cloudflare.env` binding access, not Nitro 3's runtime API.

`package.json` declares compatible version ranges. Installed package source was used to check session behavior, D1 batch support, and local binding behavior. Current online examples must not override the installed API signatures.

## Key concepts

| Concept | Meaning and current representation |
| --- | --- |
| Agency | A licensed company that owns Listings and uses one dashboard account. The `agencies` row currently holds both company facts and its account email. Email is unique within this table. |
| Buyer | A zh-TW user who searches for a home to buy. There is no Buyer table or Buyer account flow yet. |
| Property | A condominium or detached house offered for sale in Tokyo's 23 wards. `properties` stores the facts, Agency reference, publication state, and review date. |
| Published Property | A Property with `status = 'published'`. Public search and detail handlers apply this visibility rule. |
| Withdrawn Listing | A Property with `status = 'withdrawn'`. Agencies can restore it through the edit form. Permanent Property deletion is not implemented. |
| Applicable fact | A fact required for a particular Property type. The server requires condominium floor area, or detached-house land and building areas. Other type-specific facts remain optional. |
| Transit entry | A Property's station and walking time. A station belongs to a rail line. Japanese and zh-TW names are stored separately. |
| Floor plan | The one required layout image in the glossary. The database supports a `floor_plan` image kind, but the dashboard does not provide this workflow or enforce its required count. |
| Property photo | An ordered image. The glossary specifies one to twenty photos. The current API does not enforce these counts. |
| Freshness review queue | Published Properties due or overdue for manual review. The dashboard derives this list from `nextUpdateOn`. It does not automatically withdraw stale Properties. |
| Search | A shareable query defined by Property filters. The API accepts query parameters, but the public page does not restore or write its filter state through the browser URL. |
| SavedProperty | Proposed persistent association between one Buyer and one Property. It is not a copy of a Search. |
| Inquiry | Proposed persistent Buyer message about one Property, addressed to the Agency that owns the Property when the server accepts it. |

The glossary says every Property belongs to exactly one Agency. The database does not fully enforce this rule. `properties.agencyId` is nullable and uses `ON DELETE SET NULL`.

Sources: [CONTEXT.md](../../CONTEXT.md), [database schema](../../server/database/schema.ts), [shared Property schemas](../../shared/property.ts), [shared Agency input schema](../../shared/admin-property.ts), [public search page](../../app/pages/index.vue), and [Agency overview](../../app/pages/admin/index.vue).

## Runtime flow

### Public search and Property detail

1. `app/app.vue` sets the document language to `zh-Hant-TW` and renders the current Nuxt page inside Nuxt UI.
2. `/` loads station options from `/api/stations` and Property results from `/api/properties` with `useFetch`.
3. The search handler validates query parameters with `propertyQuerySchema`. It filters Published Properties through Drizzle, loads their images and Transit entries, and returns a public summary.
4. `/properties/[id]` loads `/api/properties/[id]`. The handler joins the Agency, rejects non-published Properties, and returns public facts and Agency contact details.
5. Image requests go through `/api/property-images/[objectKey]`. The handler reads R2 directly and applies a one-year immutable public cache header.
6. The detail page's contact action opens the Agency's LINE link. Madori does not record this action or create an Inquiry.

`useFetch` supports server rendering and transfers response data in the Nuxt payload for hydration. The existing pages use this framework path rather than a separate client data layer. See the official [Nuxt pages](https://nuxt.com/docs/4.x/directory-structure/app/pages), [server directory](https://nuxt.com/docs/4.x/directory-structure/server), and [useFetch](https://nuxt.com/docs/4.x/api/composables/use-fetch) documentation.

Sources: [app root](../../app/app.vue), [search page](../../app/pages/index.vue), [detail page](../../app/pages/properties/[id].vue), [search API](../../server/api/properties.get.ts), [detail API](../../server/api/properties/[id].get.ts), [stations API](../../server/api/stations.get.ts), and [image API](../../server/api/property-images/[objectKey].get.ts).

### Agency registration and authentication

1. `/register` submits a company name, email, license text, and LINE link to `/api/auth/register`.
2. The handler validates lengths and email format, lowercases the email, checks for an existing Agency email, and inserts the Agency. There is no approval step.
3. `issueMagicLink` creates a CUID2 token, deletes earlier tokens for that email, and stores the SHA-256 token hash with a 15-minute expiry.
4. The helper constructs the verification URL from the request origin and attempts to send it through `EMAIL`.
5. In Nuxt development, the handler also returns the link. This does not prevent email delivery.
6. `/api/auth/verify` hashes the supplied token, finds an unexpired token and its Agency, deletes the token, sets a session with `{ id, name, email }`, and redirects to `/admin`.
7. `/login` repeats the token issue flow for an existing Agency. `/api/auth/logout` clears the session.

There is no password or Buyer authentication. The session has no role, and its `user.id` currently means an Agency ID. The dashboard middleware checks only `loggedIn`.

Sources: [registration page](../../app/pages/register.vue), [login page](../../app/pages/login.vue), [registration handler](../../server/api/auth/register.post.ts), [login handler](../../server/api/auth/login.post.ts), [verification handler](../../server/api/auth/verify.get.ts), [logout handler](../../server/api/auth/logout.post.ts), [auth helpers](../../server/utils/auth.ts), [session types](../../shared/auth.d.ts), and [page middleware](../../app/middleware/auth.ts).

### Agency Property management

1. Agency pages declare the `auth` route middleware.
2. Each Agency Property API calls `requireUserSession`.
3. List and detail queries constrain `properties.agencyId` to the session's `user.id`. Update and image operations also check ownership.
4. Property creation assigns the Agency from the session, not from the submitted body.
5. Create and update handlers validate through the shared Valibot schema and check the required area facts for the Property type.
6. Property rows and Transit entries are written through separate database operations. They are not one atomic batch.
7. Image upload stores the object in R2, updates the cover flag when requested, and inserts image metadata in D1. Image deletion removes metadata and then the R2 object. D1 and R2 changes are not atomic together.
8. The overview computes the Freshness review queue in the page from Published Properties whose review date is due.

Ownership checks already provide a useful tenant boundary. Role checks must be added before Buyer sessions can exist.

Sources: [Agency list API](../../server/api/admin/properties.get.ts), [create API](../../server/api/admin/properties.post.ts), [detail API](../../server/api/admin/properties/[id].get.ts), [update API](../../server/api/admin/properties/[id].patch.ts), [upload API](../../server/api/admin/properties/[id]/images.post.ts), [image deletion API](../../server/api/admin/properties/[id]/images/[imageId].delete.ts), and [Property form](../../app/components/AdminPropertyForm.vue).

### Cloudflare bindings and persistence

- `nuxt.config.ts` selects `cloudflare_module`. Wrangler serves `.output/server/index.mjs` and `.output/public`.
- `DB` is a D1 binding. `useDatabase(event)` constructs a typed Drizzle client from the request binding.
- `LISTING_IMAGES` is an R2 binding. `useImagesBucket(event)` resolves it from the request.
- `EMAIL` is a `send_email` binding. The auth helper uses the structured message builder with both HTML and text.
- Top-level bindings point to preview resources. Named `preview` and `production` environments each declare D1, R2, and email bindings.
- `server/env.d.ts` references generated `worker-configuration.d.ts` and augments H3's event context. Generated types declare the session-password binding name, but do not prove that any deployed secret is present.
- The checked-in initial SQL migration creates seven tables. Seed files provide station data and demo Agencies and Properties, but no image objects or Buyer records.

Sources: [Nuxt configuration](../../nuxt.config.ts), [Wrangler configuration](../../wrangler.jsonc), [D1 client](../../server/database/client.ts), [R2 helper](../../server/utils/storage.ts), [binding augmentation](../../server/env.d.ts), [generated binding types](../../worker-configuration.d.ts), [initial migration](../../migrations/0000_mean_gamma_corps.sql), [station seed](../../db/seed.sql), and [demo seed](../../db/seed-demo.sql).

## Where things live

| Concern | Existing files |
| --- | --- |
| Domain terms and product boundary | `CONTEXT.md`, `README.md` |
| Public Buyer pages | `app/pages/index.vue`, `app/pages/properties/[id].vue` |
| Agency registration and login pages | `app/pages/register.vue`, `app/pages/login.vue` |
| Agency dashboard | `app/pages/admin/index.vue`, `app/pages/admin/properties/`, `app/components/AdminDashboardShell.vue` |
| Property editing and cover upload | `app/components/AdminPropertyForm.vue` |
| Client route access check | `app/middleware/auth.ts` |
| zh-TW formatting and ward options | `app/utils/format.ts`, `shared/tokyo.ts`, `app/app.vue` |
| Shared public validation and types | `shared/property.ts` |
| Shared Agency Property input and types | `shared/admin-property.ts` |
| Session type augmentation | `shared/auth.d.ts` |
| Public APIs | `server/api/properties.get.ts`, `server/api/properties/[id].get.ts`, `server/api/stations.get.ts` |
| Public image delivery and sitemap data | `server/api/property-images/[objectKey].get.ts`, `server/api/sitemap-urls.get.ts` |
| Agency APIs | `server/api/admin/properties/` and adjacent list/create handlers |
| Magic-link endpoints and helper | `server/api/auth/`, `server/utils/auth.ts` |
| Database model and client | `server/database/schema.ts`, `server/database/client.ts` |
| Database DDL and local fixtures | `migrations/`, `db/seed.sql`, `db/seed-demo.sql`, `drizzle.config.ts` |
| Worker, storage, and email configuration | `wrangler.jsonc`, `nuxt.config.ts`, `server/env.d.ts`, `worker-configuration.d.ts` |
| Stack commands and dependencies | `package.json`, `pnpm-workspace.yaml` |
| Existing portal research | `docs/research/zh-tw-japan-portals.md`, `docs/research/jp-buy-sell-portals.md` |

Nuxt page middleware controls navigation. It does not replace API authorization. Keep database access and notification delivery in `server/`, shared contracts in `shared/`, and Buyer interaction state in `app/`.

## Existing capabilities

### Implemented

- Public zh-TW Property search with ward, type, new/resale, layout, price, area, rail line, station, building age, and walking-time filters.
- Newest, price, and area sorting. Detached-house area filtering uses land area through `coalesce(floorAreaSqm, landAreaSqm)`.
- Public detail facts, Agency name and license text, localized station names, and LINE contact.
- Yen, square-metre, and approximate 坪 formatting. There is no TWD conversion.
- Immediate multi-Agency registration with one unique email per Agency row.
- Agency magic-link authentication and cookie sessions.
- Agency-owned Property creation, editing, draft/publication/withdrawal states, cover upload, and image deletion.
- Agency Property filtering by number/title and status, plus a manual Freshness review queue.
- Published Property sitemap data and robots exclusions for Agency/login/registration routes.

Sources: the public pages, Agency pages, shared schemas, API handlers, and configuration listed above.

### Absent or incomplete

- No Buyer account, saved Property, Inquiry, inquiry history, or Agency inbox model or route exists.
- LINE contact does not provide persistent routing or an email notification record.
- Search filters are not synchronized with the browser URL, despite the glossary's shareable Search definition.
- Public and Agency list endpoints have no pagination.
- The dashboard exposes a cover-image workflow, not an ordered photo gallery or Floor plan workflow.
- Publication does not enforce the required Floor plan, one-to-twenty photos, all Applicable facts, or at least one Transit entry.
- The glossary's permanent deletion of a Withdrawn Listing has no Property deletion endpoint.
- No test runner script or test/spec files were found in the application repository.

The existing research documents provide field and portal context. Their wider recommendations, including additional property types and currency options, are not implemented requirements. Their external links were not re-audited for this architecture report.

Sources: [portal research for Taiwanese Buyers](./zh-tw-japan-portals.md), [Japanese portal research](./jp-buy-sell-portals.md), [Property form](../../app/components/AdminPropertyForm.vue), [shared Agency input schema](../../shared/admin-property.ts), [API tree](../../server/api/), and [package scripts](../../package.json).

## Security gaps

These findings describe source-level behavior. They do not establish that an attack occurred or that production infrastructure lacks controls outside this repository.

| Gap | When it matters | Required action |
| --- | --- | --- |
| No role-aware authorization | All Agency APIs accept any session with a `user` key. A future Buyer session would pass that initial check. | Add server-side Agency and Buyer guards before adding Buyer authentication. Keep ownership predicates on every query. |
| Token consumption is not atomic | Two concurrent verification requests can both select the same valid token before either deletes it. | Consume an unexpired token with one conditional database operation and require a returned row before issuing a session. |
| Request-origin magic links | Auth links use `getRequestURL(event).origin`. Correctness depends on the accepted host and proxy headers. | Build links from a configured, trusted application origin. Do not accept an arbitrary redirect target. |
| Auth abuse controls are absent in source | Registration and login can repeatedly create records, invalidate links, and attempt email delivery. | Add request limits by IP and normalized identity. Use a bot check only if needed; do not make Agency approval a substitute. |
| Account enumeration | Login returns a distinct missing-account error. Registration reports an existing email. | Use neutral responses where account existence need not be disclosed. |
| Email failure is hidden | `sendMagicLink` catches delivery errors. Production callers still receive `ok: true` without a usable fallback. | Record and expose an appropriate delivery outcome. Do not claim successful delivery after a failed send. |
| Development can send real email | The top-level email binding has `remote: true`; the helper attempts delivery before its development fallback. | Use an explicitly simulated email binding for local tests. Correct the page copy that says development does not send email. |
| Weak external-link validation | `lineUrl` is validated as bounded text, then becomes a public link. | Validate HTTPS and the intended LINE host/path rules on the server. |
| Uploads trust client content type | Upload checks a filename and non-empty bytes, but not file size, image signatures, or safe image formats. The public route serves the supplied type on the application origin. | Bound request size and decode or validate allowed image content. Reject active content. Set suitable response headers. |
| Images ignore Property visibility | Anyone with an object key can request an image of a draft or withdrawn Property. Responses can remain publicly cached for a year. | Resolve image metadata and Property visibility. Permit private previews only for the owning Agency. Define cache behavior for withdrawal. |
| Property ownership can become null | Agency deletion sets `agencyId` to null. Search and sitemap may still include a published row whose detail join cannot resolve an Agency. Inquiry routing would have no recipient. | Require a non-null owner and restrict Agency deletion while dependent Properties or Inquiries exist. |
| Product constraints rely on UI choices | The API accepts arbitrary non-empty ward and date strings and incomplete publication data. | Validate Tokyo ward membership, date formats, and publication requirements on the server. |
| Multi-step writes can partially succeed | Property/Transit changes and R2/D1 changes use separate operations. | Use D1 batches for related database writes. Add explicit cleanup for storage failures. |
| Session lifecycle is not explicit | The app sets no session maximum age or database-backed account check after login. Clearing one browser cookie does not invalidate other copies. | Set a lifetime and validate the current principal in role guards. Define account revocation before account deletion or disabling is added. |
| Mutation origin checks are absent in app source | Cookie-authenticated APIs have broad `/api/**` CORS configuration and no explicit request-origin check. | Keep CORS limited to intended callers and reject foreign origins for authenticated mutations. SameSite cookies help but are not an authorization policy. |

References: [auth helpers](../../server/utils/auth.ts), [verification](../../server/api/auth/verify.get.ts), [login](../../server/api/auth/login.post.ts), [registration](../../server/api/auth/register.post.ts), [Agency handlers](../../server/api/admin/), [upload](../../server/api/admin/properties/[id]/images.post.ts), [image delivery](../../server/api/property-images/[objectKey].get.ts), [database schema](../../server/database/schema.ts), [input schema](../../shared/admin-property.ts), and [Nuxt configuration](../../nuxt.config.ts).

### Existing library protections and limits

`nuxt-auth-utils` uses sealed cookie sessions. Its installed `requireUserSession` checks that a session contains `user`; it does not implement roles or Agency ownership. Its installed defaults use SameSite Lax. H3 `1.15.11` supplies Secure and HttpOnly cookie defaults. This is not a finding that session cookies are unprotected.

The installed auth utility merges data in `setUserSession`. It also has `replaceUserSession`, which clears and replaces session data. Use replacement on a role-specific login so an earlier session cannot leave unrelated fields behind. Keep the cookie payload small and do not put Inquiry messages or saved Property lists in it.

Primary package evidence: `node_modules/nuxt-auth-utils/README.md`, `dist/runtime/server/utils/session.js`, `dist/module.mjs`, and H3 `1.15.11`'s session implementation under `node_modules/.pnpm/`. The auth README specifies a session password of at least 32 characters. No secret value was read.

### Email-service deployment uncertainty

The structured `EMAIL.send` call matches both generated project types and the current official Workers API. A binding declaration does not prove domain onboarding, recipient eligibility, quotas, or delivery.

Cloudflare's send-binding documentation says an unrestricted binding can send to verified destination addresses in the account. Its sending tutorial also shows general transactional recipients. Do not assume that arbitrary new Agency and Buyer addresses are eligible in the configured account. Confirm the account's actual sending policy before relying on immediate self-service magic-link onboarding. If per-recipient administrator verification is required, that setup does not meet the confirmed scope.

Official sources: [Workers email API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), [send-binding restrictions](https://developers.cloudflare.com/email-service/configuration/send-bindings/), and [domain onboarding](https://developers.cloudflare.com/email-service/get-started/send-emails/). No Cloudflare account or DNS configuration was inspected.

## Buyer account and Inquiry additions needed

This section is a proposal, not a description of implemented behavior.

### Shared domain additions

| Entity | Minimum proposed data and constraints |
| --- | --- |
| Buyer | ID, display name, normalized email, creation/update timestamps. Email is unique within the chosen account model. Use the verified login email as the default contact address. |
| SavedProperty | Buyer ID, Property ID, creation timestamp. Use a composite primary key or unique constraint on the pair. Both IDs have foreign keys. |
| Inquiry | ID, Buyer ID, Property reference, owning Agency ID, message, contact-name/email snapshot, Property-number/title snapshot, creation timestamp, and an optional Agency read timestamp. |
| Inquiry notification state | Pending/sent/failed state, attempt count, next attempt time, provider message ID, and a bounded error code. Store it with the Inquiry for this single notification type. |

Require the Inquiry's Agency reference and restrict deletion of an Agency with retained Inquiries. Capture the recipient Agency from the Property on the server. Do not accept an Agency ID, Buyer ID, or recipient email from the Buyer as routing authority.

Allow a saved Property to remain visible as an unavailable item after withdrawal, but do not disclose private Property facts. A hard Property deletion can remove its saved associations. Inquiry history must survive withdrawal and any future Property deletion. A nullable Property foreign key with `ON DELETE SET NULL`, plus limited Property snapshots, provides that behavior. Keep the original Agency recipient unchanged if Property ownership ever changes.

Use a unique Buyer-scoped submission key for Inquiry retries so a repeated request does not create duplicate Inquiries or notification jobs. Do not make the Buyer/Property pair unique for Inquiries, since a Buyer may send a later message about the same Property.

Contact snapshots and messages contain personal data. Define a retention and deletion policy before release. Do not cascade account deletion through Inquiry history without an explicit policy. An Agency must see only contact data needed to handle its own Inquiries, not the Buyer's saved list or other Agency history.

### Authentication additions

- Retain magic-link authentication and `nuxt-auth-utils`. Do not add another auth framework.
- Bind every issued token to its intended role. Verification must derive that role from the stored token, not from an editable verification query.
- Use a session discriminant such as `role: 'agency' | 'buyer'`. Validate and narrow it in server guards, then load the corresponding current database row.
- Require the Buyer role on saved Property and Inquiry creation/history APIs. Require the Agency role on Property management and Agency inbox APIs.
- Scope Buyer reads and deletes to the authenticated Buyer. Scope inbox reads and updates to the authenticated Agency.
- Preserve immediate Agency registration. Email verification proves control of an email address, not the validity of a license. Do not describe registered Agencies as independently license-verified.
- Use fixed role-specific landing pages, or validate an allowed local return path. The current middleware supplies a `redirect` parameter, but verification always redirects to `/admin`.

### UI and API additions

Proposed paths follow the existing Nuxt conventions. None exists at this baseline.

| Concern | Proposed location |
| --- | --- |
| Buyer registration/login and account area | `app/pages/buyer/register.vue`, `app/pages/buyer/login.vue`, `app/pages/buyer/index.vue` |
| Saved Properties and inquiry history | `app/pages/buyer/saved.vue`, `app/pages/buyer/inquiries.vue` |
| Save action and Inquiry form | Small components used by `app/pages/index.vue` and `app/pages/properties/[id].vue` |
| Agency inbox | `app/pages/admin/inquiries/index.vue`, `app/pages/admin/inquiries/[id].vue`; add navigation in `AdminDashboardShell.vue` |
| Buyer API | `server/api/buyer/` for saved Property list/add/remove and Inquiry create/list/detail |
| Agency inbox API | `server/api/admin/inquiries/` for list/detail/read-state operations |
| Shared contracts | `shared/buyer.ts`, `shared/inquiry.ts`, `shared/saved-property.ts`, and the existing session augmentation |
| Authorization and routing logic | Extend `server/utils/auth.ts`; put Inquiry persistence and notification functions in focused server utilities |
| Database and binding changes | Existing schema, SQL migration directory, and Worker configuration |

Build shared request and response schemas with Valibot and infer their TypeScript types. Keep submitted messages bounded and render them as plain text. Escape user content if it enters HTML email. The official [Valibot type-inference guide](https://valibot.dev/guides/infer-types/) documents `InferOutput` and its relationship to validated output.

### Persistent Inquiry and notification flow

1. The Buyer submits a Property ID, message, and submission key through an authenticated Buyer endpoint.
2. The server validates the input and loads a Published Property with a valid owning Agency.
3. One database operation captures the accepted Property/Agency relationship and persists the Inquiry with pending notification state. Recheck visibility at the write boundary so a concurrent withdrawal cannot bypass the rule.
4. The Buyer receives the persistent Inquiry ID. The owning Agency can immediately see the Inquiry in its database-backed inbox.
5. The server sends a minimal notification through `EMAIL`, addressed from server-resolved Agency data. The message links to the authenticated inbox; email possession is not inbox authorization.
6. Record the send result or failure. A failed email must not remove the Inquiry or cause a repeated Buyer submission to duplicate it.
7. A bounded retry worker processes due notification rows. Claim rows with a conditional update and a recoverable lease so concurrent workers do not send the same row at the same time.

Use notification fields on Inquiry rather than a general message bus or CRM model. A scheduled Cloudflare execution path is sufficient for retrying this one notification type, but it needs explicit Worker/Nitro integration and trigger configuration. The baseline has no scheduled handler or retry trigger. An in-request send or `waitUntil` call alone is not persistent retry processing.

D1 and an email provider do not share a transaction. A crash after a provider accepts a message but before D1 records success can cause a duplicate notification. Promise at-least-once notification attempts, not exactly-once delivery. A returned provider message ID records acceptance, not proof that the Agency read the email.

The official [D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) documents transactional batches and rollback on failure. The installed Drizzle `0.45.2` D1 driver exposes `db.batch` and delegates to D1's batch operation. This was checked in `node_modules/drizzle-orm/d1/driver.d.ts` and `session.js`. Use that installed API for related writes rather than assuming a callback transaction works on D1.

## Two simple domain extensions

Both options add the same SavedProperty, Inquiry, and notification behavior. They differ in account ownership and authentication structure.

### Option A: separate Buyer and Agency account records

Keep `agencies` as the Agency account and company record. Add `buyers` as a separate account record. SavedProperty and Inquiry reference `buyers.id`; Properties and Inquiry routing reference `agencies.id`.

Extend the existing token table with a required role. Token replacement and lookup are scoped by normalized email and role. Each account table keeps its own email uniqueness. The same mailbox can therefore own a Buyer account and an Agency account without role guessing or token invalidation across roles.

The sealed session contains a discriminated user with role and ID. The ID names the corresponding Buyer or Agency row. Existing Agency ownership predicates keep using the Agency ID after an Agency guard validates the role and current row.

Benefits:

- Adds one account table without separating the current Agency record into account and profile tables.
- Keeps current Property ownership relationships and most Agency API queries unchanged.
- Supports the confirmed one-account-per-Agency rule without memberships or invitations.
- Allows Buyer and Agency accounts to use the same email through explicit, role-specific login paths.

Costs:

- Auth lookup must branch between two tables.
- Shared identity fields exist in both account tables.
- The token table's role/email relationship is application-enforced rather than one foreign key to a shared account table.
- A person using both roles has two account records and switches the active session by logging into the intended role.

Keep email changes out of scope for this addition. If they are later introduced, they must invalidate pending role-scoped tokens and use a verified update flow.

### Option B: one account table with separate Agency and Buyer profiles

Add `accounts` with an ID, unique normalized email, role, and timestamps. Agency and Buyer profiles each have a unique account foreign key. Each account has one role in this simple version. SavedProperty and Inquiry still reference Buyer profiles; Property ownership and inbox routing still reference Agency profiles.

Tokens reference one account ID. Verification loads that account and its role-specific profile. Server guards resolve the profile before a tenant query. The session's account ID must not be treated as an Agency ID.

Benefits:

- One login identity, email uniqueness rule, and token foreign key.
- Central account lifecycle checks and auth queries.
- Clear separation between credentials and company/Buyer facts.

Costs:

- Adds account/profile relationships and changes the existing Agency authentication path.
- Requires every existing `user.id` ownership assumption to be reviewed.
- Global email uniqueness prevents a separate Buyer and Agency account using the same mailbox in this single-role version.
- Supporting both roles on one account would require more role/profile rules than this option describes. It is not part of the confirmed scope.
- Cross-table rules must still ensure that each account has exactly the profile required by its role.

### Recommendation

Choose Option A.

The current Agency row already provides exactly one dashboard account. The confirmed additions need a Buyer identity, not a shared staff identity or membership system. A separate Buyer table and explicit role guards meet the scope with fewer changes to working Agency ownership checks.

The duplicated identity fields and two auth lookups are a small, visible cost. Share email normalization, token issue/consume logic, and notification delivery helpers. Keep role-specific registration contracts separate. Do not add a generic account repository, permission framework, or compatibility fallback for role-less sessions.

Option B is preferable only if a central single-role account lifecycle is a current product requirement. It is not required here. Its global email rule is also a product constraint, not just a database detail.

Recommended order:

1. Make authentication role-aware, atomically consume tokens, and add trusted-origin and abuse protections. Preserve immediate Agency registration and existing Agency ownership checks.
2. Add Buyer registration/login and saved Properties as a complete working flow.
3. Add persistent Inquiries, Buyer history, and the owning Agency inbox as a complete database-backed flow.
4. Add notification sending, persistent failure state, and bounded retry execution before declaring the confirmed scope complete.

Do not add saved searches, staff accounts, chat, attachments, or a general CRM.

## Local verification setup

### What was and was not verified

This session read application source, schemas, configuration, migrations, seed files, existing research, installed package source, and official public documentation. It checked installed dependency versions and the Git revision.

It did not install dependencies, run lint/typecheck/build, start a development server, apply database changes, send email, deploy, inspect Cloudflare resources, or read secret files. The commands below are a setup guide for a later authorized verification run, not reported test results.

### Prerequisites and safe binding choice

- Use the repository's package manager version, `pnpm@11.22.0`.
- Use a Node version accepted by the installed Nuxt package. Its engines are `^22.19.0 || ^24.11.0 || >=26.0.0`; installed Wrangler requires Node `>=22.0.0`.
- An operator must supply a local session password of at least 32 characters without printing or committing it. Do not copy a production secret. The auth module can otherwise create and write a development password automatically.
- Keep D1 and R2 local. Never use `--remote`, production resource commands, or real-recipient email tests in a no-send verification run.
- Use the named preview configuration and `wrangler dev --local`. The installed Wrangler flag explicitly disables remote bindings. The preview email binding also has no `remote: true` entry.

Do not submit auth forms under bare `pnpm dev` for a no-send test. Nitro's installed dev plugin calls `getPlatformProxy` without disabling remote bindings. Installed Wrangler enables remote bindings by default, and the top-level `EMAIL` configuration sets `remote: true`.

The register/login page text says development does not send email. The actual helper sends first and only then uses a development link fallback. That text is not a safety control.

Evidence: [Wrangler configuration](../../wrangler.jsonc), [auth helper](../../server/utils/auth.ts), installed Nitro `2.13.4`'s `dist/presets/cloudflare/runtime/plugin.dev.mjs`, and installed Wrangler `4.125.0`'s `GetPlatformProxyOptions`, `getPlatformProxy`, and `dev` flag definitions. Cloudflare's official [local email development guide](https://developers.cloudflare.com/email-service/local-development/sending/) confirms that remote bindings send real emails and simulated bindings do not.

### Local database and build commands

Run these only in a later authorized local verification session:

```bash
pnpm install --frozen-lockfile

pnpm exec wrangler d1 migrations apply madori-preview --local --env preview
pnpm exec wrangler d1 execute madori-preview --local --env preview --file=db/seed.sql
pnpm exec wrangler d1 execute madori-preview --local --env preview --file=db/seed-demo.sql

pnpm lint
pnpm typecheck
pnpm build

pnpm exec wrangler dev --env preview --local
```

The built Worker tests the Cloudflare runtime path. It does not have `import.meta.dev` link responses. An operator can complete local authentication through the simulator's generated message, but must not put its token or link into reports or shared artifacts. Do not use an R2 object containing private data as a fixture.

Wait for an explicit server-ready condition and verify a local API response. Do not use a fixed delay as proof of readiness. Confirm that Wrangler reports local/simulated bindings before any auth request.

Nitro development persists bindings under `.wrangler/state/v3`. The README uses Wrangler's local state for seeding. Verify that the selected server and CLI see the same seeded data before testing ownership. `drizzle.config.ts` contains a fixed local SQLite filename; do not assume that filename matches a generated Miniflare database filename. Generate DDL from the schema and apply it through Wrangler rather than relying on that path for runtime tests.

Sources: [README](../../README.md), [scripts](../../package.json), [Drizzle configuration](../../drizzle.config.ts), [initial migration](../../migrations/0000_mean_gamma_corps.sql), and [seed files](../../db/).

### Baseline verification cases

- Confirm `/api/stations`, public search, and each seeded Property detail load locally.
- Confirm the two demo Agencies cannot read, update, upload to, or delete images from each other's Properties.
- Confirm unauthenticated Agency API calls fail.
- Test a valid, expired, consumed, and concurrently submitted magic link. The concurrency test should expose the current select/delete race until fixed.
- Confirm draft and withdrawn Properties do not appear through public detail/search. Separately test direct image access, which currently does not enforce visibility.
- Test local image upload and deletion with generated public fixtures. Demo seed data has no R2 images.
- Confirm publication accepts incomplete media today. Treat this as a documented gap, not a successful publication-policy test.
- Test email failure and confirm the current handler reports success despite the failed send. Do not test this by sending to real or nonexistent recipients.

The demo seed contains two Agencies and four Published Properties, including a detached house. It has no draft or withdrawn Property fixtures. Add test-owned local fixtures only in a separately authorized implementation/test task.

### Verification required for the proposed additions

- A Buyer session must fail every Agency management endpoint. An Agency session must fail Buyer saved/history endpoints.
- Buyer A cannot access Buyer B's saved Properties or Inquiries, even with a known record ID.
- Only the owning Agency can read or update an Inquiry in its inbox.
- The server ignores or rejects submitted routing identities and derives the recipient from the Property.
- Saving twice produces one SavedProperty; removing it is idempotent.
- An Inquiry accepted before withdrawal remains in history and the inbox. A new Inquiry after withdrawal is rejected.
- A repeated submission key returns the same Inquiry without another notification record.
- Email failure leaves the Inquiry visible and schedules a retry. Concurrent retry workers claim one attempt. A worker crash does not leave a permanent claim.
- Local retries remain simulated and never send real email.
- Same-email Agency and Buyer accounts use distinct role-bound tokens under Option A.
- Private account/inbox routes are excluded from indexing and do not use shared public response caches.

## Primary-source notes

| Source | What it supports |
| --- | --- |
| Repository files cited above | Current application behavior, domain terms, schema constraints, configuration, and missing capabilities. |
| Installed `nuxt-auth-utils` `0.5.30` README and implementation | Sealed sessions, minimal user-presence checks, session replacement, password requirement, and cookie payload limits. |
| Installed Nitro `2.13.4` and Wrangler `4.125.0` source/types | Request binding injection, dev proxy persistence, remote binding defaults, and the no-remote `--local` flag. |
| Installed Drizzle ORM `0.45.2` D1 driver/types | Typed D1 batch support in the version used by Madori. |
| [Nuxt pages](https://nuxt.com/docs/4.x/directory-structure/app/pages), [server](https://nuxt.com/docs/4.x/directory-structure/server), and [useFetch](https://nuxt.com/docs/4.x/api/composables/use-fetch) | File-based routes, server/app boundaries, and SSR data transfer. |
| [Valibot inference](https://valibot.dev/guides/infer-types/) | Schema-derived request/response types. |
| [Cloudflare D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) | Transactional batch execution and rollback. |
| [Cloudflare Workers email API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/) | Structured message sending, message IDs, and delivery errors. |
| [Cloudflare send bindings](https://developers.cloudflare.com/email-service/configuration/send-bindings/) and [sending setup](https://developers.cloudflare.com/email-service/get-started/send-emails/) | Sender-domain setup and recipient-policy checks that require separate account verification. |
| [Cloudflare local email development](https://developers.cloudflare.com/email-service/local-development/sending/) | Simulation versus real delivery with remote bindings. |

Open release checks are the actual Email Service recipient policy, sender-domain readiness, session-secret provisioning, notification trigger integration, and runtime verification. None can be inferred from a checked-in binding declaration alone.
