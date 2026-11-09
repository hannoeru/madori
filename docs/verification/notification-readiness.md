# Notification receipt gate

## Current state

Seven goal milestones have local implementation and verification evidence. Inquiry persistence, owner routing, Buyer history, Agency inbox and failure handling are implemented and tested. Actual Notification receipt is the remaining gated requirement.

Email testing is explicitly deferred. There is no authorized deliverable test recipient or authorized mailbox observation in this work. Existing `example.invalid` demonstration accounts are not recipients for a real receipt test. No message has been sent to them or to a customer.

The development dispatcher returns `failed/local-disabled` before it accesses EMAIL. The production dispatcher requires the EMAIL binding and validated application URL. It records `sent` only after a service message ID is accepted; the UI explicitly says that this does not prove receipt or reading.

The Inquiry row is inserted before Notification dispatch. Only the winning insert attempts the Notification. A repeated submission confirms the existing record and does not resend it. A process stop after persistence can leave pending work that requires separate recovery; no new resend policy is claimed here.

## Read-only binding preflight

The coordinator checked the current Cloudflare documentation and installed Wrangler 4.125.0 schema. No provider account command, send request or configuration change occurred.

- [Local sending documentation](https://developers.cloudflare.com/email-service/local-development/sending/) says the default EMAIL binding simulates delivery. It logs message content and writes local files, so a local-production auth send could expose its link in simulator logs. Do not submit those forms while testing is deferred.
- The same documentation describes `remote: true` on EMAIL. The Worker runs locally but sends real mail. Thus receipt verification may not require deployment, but it still requires explicit permission for real sends and account access.
- The installed `send_email` schema accepts `remote`, `allowed_destination_addresses` and `allowed_sender_addresses`. Binding configuration is not inherited by named environments. Schema support is not proof of account readiness or a working remote connection.
- Current `wrangler.jsonc` defines EMAIL in the top level, preview and production environments without `remote: true`. No remote mode was added. D1/R2 configuration remains unchanged.
- [Workers API documentation](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/) confirms the current structured builder's named `from.email`, `replyTo`, plain `text` and `messageId` result. This confirms the source interface, not delivery.
- [Binding restrictions](https://developers.cloudflare.com/email-service/configuration/send-bindings/) and [sender setup](https://developers.cloudflare.com/email-service/get-started/send-emails/) require sender/recipient eligibility checks. An accepted config or a verified test destination must not be assumed to permit arbitrary newly registered Agency addresses. The account's Email Sending mode and sender domain remain uninspected.

After permission, an isolated local-production runtime with only EMAIL remote is one documented option. Confirm sender/recipient restrictions and resource isolation first. Authentication, application URL and secret handling still need a separate local runtime plan; no fallback or secret copying was implemented.

## Authorization needed before testing

The user must authorize:

- One dedicated Agency test recipient that can receive mail, plus a permitted test Buyer address where required by the provider.
- A real provider/runtime test path and its sender configuration. The local emulator, mocks and service response alone cannot prove receipt.
- The exact test resources. Any needed deployment, remote secret change or binding change requires separate approval; it is not implied by permission to test mail.
- Mailbox inspection by the user or explicitly authorized read access. Never paste credentials or authentication links into the report.

The test must not reroute a customer's Inquiry or add a production recipient override. Use a separately labeled test Agency/Property owned by the permitted recipient. Do not change the identity or email of an existing demonstration account just to redirect accepted Inquiries.

## Local runtime plan, not yet executed

The production build does not expose development test links. Native authentication in a real-mail runtime can send Agency and Buyer login emails as well as the Inquiry Notification. Permission must cover those messages and both role addresses. One controlled mailbox can serve both roles, but the accounts must remain separate.

`nuxt.config.ts` declares `appUrl`, `emailFrom` and `emailFromName`. The installed session utility reads `NUXT_SESSION_PASSWORD` or `runtimeConfig.session.password` and caches its session configuration for the runtime. Its installed README requires at least 32 password characters and says development can generate a password automatically. This explains why a separately started runtime must not be assumed to accept a development cookie; it does not establish the precise cause of the earlier guest result.

Once authorized, use an isolated local-production runtime and a new named browser profile. Configure its application URL to that runtime, use the approved sender domain, and supply its session secret through a protected ignored file or the approved secret mechanism. Authenticate within that runtime. Do not copy a cookie, print a secret, patch a session, or add a production test-link fallback. Restart that owned runtime after session configuration changes because the dependency caches the configuration.

The intended existing-key overrides are `NUXT_APP_URL`, `NUXT_EMAIL_FROM`, `NUXT_EMAIL_FROM_NAME` and `NUXT_SESSION_PASSWORD`. Confirm their effective behavior in the chosen Cloudflare runtime before sending. Do not infer success from a file's contents or log the complete runtime config.

An authorized temporary test configuration would make only EMAIL remote and restrict its permitted destinations/sender. Keep D1 and R2 local and use dedicated labeled fixtures. Do not alter the shared server, enable remote D1/R2 or change the checked-in production bindings. Check the exact selected config and non-inherited environment entries before starting. No temporary config, secret or runtime was created for this plan.

Source references are `nuxt.config.ts`, `server/utils/auth.ts`, `server/utils/inquiry-notification.ts`, and installed `node_modules/nuxt-auth-utils/dist/runtime/server/utils/session.js` with its README's setup/configuration sections. This is a source-derived plan. Effective configuration, native production authentication, account eligibility and receipt remain unverified.

## Permitted test sequence, once authorized

1. Verify the selected runtime, resources, sender and application URL without printing secrets. Confirm that no customer recipient or production-data write is involved.
2. Establish the test Agency and Buyer through the approved authentication path. Do not weaken session isolation or introduce a development fallback in the production build.
3. Publish a clearly labeled demonstration Property with lawful images and applicable facts.
4. Submit one native Inquiry with a unique demonstration marker. Preserve its acceptance ID and owning Agency. If a response is interrupted, inspect persisted state before any retry.
5. Confirm exactly one Inquiry in the Buyer's history and receiving Agency inbox. Check that foreign accounts remain denied.
6. Obtain independent mailbox evidence for that exact Notification. Record only permitted, redacted receipt facts such as subject, unique marker and received timestamp. A service message ID is not receipt evidence.
7. Verify that retrying the same accepted submission does not create a second Inquiry or Notification. Report any provider failure without losing the persisted Inquiry or claiming delivery.
8. Complete the Inquiry milestone only after the receipt criterion passes. Request overall completion only after every requirement and task gate is satisfied.

No part of this sequence has been run with real email. This document is preparation, not permission or delivery proof.

## Handoff evidence

Current checks pass lint, typecheck, 128 tests and production build. See `delivery-review.md`, `auth-issuance.md`, `public-accessibility-followup.md`, `registration-freshness.md`, `mobile-workflows.md` and `mobile-publication.md`.

Complete manual accessibility, actual browser zoom/text resize, real provider/operator interruption recovery and deployed Worker limits retain their stated limitations. Browser context loss remains unresolved. No email, customer message, deployment or production change occurred. The goal remains incomplete.
