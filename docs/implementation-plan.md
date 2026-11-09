# Madori implementation plan

## Workflow

The confirmed goal defines the product boundary and completion gates. This file records the execution order without changing that contract.

- [x] Read the Principles section of the poteto-mode skill.
- [x] Phase A: Frame.
- [x] Phase B: Design the workflow.
- [ ] Phase C: Run the loop.
- [x] Inspect the existing architecture and research property marketplace UI/UX for Taiwanese buyers.
- [x] Compare design directions and define the chosen Nuxt UI design system and page flows.
- [x] Extend the domain model, authentication, and authorization for buyers and multiple agencies.
- [x] Implement the public homepage, search, property details, and buying guidance.
- [x] Implement agency listing and image management with publication and freshness controls.
- [x] Implement buyer saved properties and inquiry history.
- [ ] Implement inquiry submission, agency inboxes, and email notifications.
- [x] Complete local end-to-end verification and hand off the implementation with explicit remaining integration limits.
- [ ] Phase D: Keep the audit trail.
- [ ] Phase E: Verify and hand back.

## Definition of done

All eight confirmed milestones must pass their verification contracts. The full buyer and Agency workflows must work in a real browser. Required email delivery must have a receipt from a permitted test inbox. A build or mock notification is not sufficient evidence.

## Work size and order

The work spans the public homepage, search, property detail, guidance, authentication, buyer pages, Agency pages, server API routes, D1 schema, R2 images, and email delivery. Existing Agency property management and public search reduce the amount of new code.

First capture the baseline. Then compare the two design directions. Establish role-aware authentication and ownership tests before adding private Buyer or inquiry data. Deliver each subsequent workflow with its own check.

## Throughput checkpoint

The coordinator owns application code and browser verification. One `pi` helper researches architecture and competing domain extensions. Both use `openai/gpt-6.1-sol`. The helper owns only `docs/research/architecture-baseline.md` and does not change application code or shared state.

No code-writing fan-out is planned before domain boundaries settle. Keep changes sequential within the shared repository. Use the existing dependencies before adding a library. Reassess delegation after the first complete private-data workflow passes its tests.

## Verification order

1. Capture the current build, typecheck, lint result, and real homepage screenshot.
2. Establish rerunnable local checks and safe email test configuration.
3. Compare visual directions at desktop and mobile widths.
4. Test two Agencies and two Buyers for ownership and privacy.
5. Verify public search and property details.
6. Verify image upload and the listing lifecycle.
7. Verify saved properties and inquiry history across sessions.
8. Verify persisted inquiry routing, notification failure behavior, and actual email receipt.
9. Run the complete check suite and capture final screenshots.

## Constraints and open integration needs

Do not deploy or change remote data. Do not send messages to customers. Local testing must not invoke the existing remote email binding without a permitted test recipient.

Real email receipt may require the user's test recipient and access to that inbox. Continue independent work if this blocks delivery verification. Do not declare the goal complete with an unverified notification path.

The existing lint baseline includes generated `.pi` state. Exclude runtime artifacts before treating lint as an application-code gate.

## Decision record

Keep the append-only record at `docs/research/decisions.tsv`. Record decisions and verified results, not planned results. Evidence must point to files, logs, or screenshots that exist.
