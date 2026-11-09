# Madori design system and page flows

## Chosen direction

Use Direction A's warm paper, forest-green actions, editorial headings, and full-width property photos. Use Direction B's compact introduction on mobile and its result density on the dedicated search page.

The [throwaway prototype](../../.audit/madori-prototype/index.html) compares the same three demonstration Property previews behind a radio switcher. It is not application code. The production implementation uses Nuxt UI.

### Browser comparison

| Variant | Viewport | Search top | First card top | Horizontal overflow |
| --- | --- | --- | --- | --- |
| A | 1440 × 1000 | 469 px | 746 px | None |
| B | 1440 × 1000 | 305 px | 569 px | None |
| A | 390 × 844 | 449 px | 849 px | None |
| B | 390 × 844 | 355 px | 748 px | None |

These measurements include the prototype-only switcher. They measure layout, not buyer preference or conversion.

The browser checked both radio controls and captured each variant. The coordinator inspected all four images:

- [A desktop](screenshots/design-a-desktop.png).
- [B desktop](screenshots/design-b-desktop.png).
- [A mobile](screenshots/design-a-mobile.png).
- [B mobile](screenshots/design-b-mobile.png).

A provides larger photos for discovery. B brings comparable facts into view sooner. On mobile, A's introductory copy pushes the first result beyond the viewport. Reduce the mobile introduction instead of using a narrow photo column. Keep a dedicated results page without a marketing hero.

## Tokens

| Token | Choice |
| --- | --- |
| Primary | Forest green, centered on `#31584a`. Define the full shade range in CSS. |
| Background | Warm paper, centered on `#f8f7f3`. |
| Text | Dark ink, centered on `#223c35`. |
| Secondary text | Muted green-grey. Verify each actual text/background pair for contrast. |
| Surfaces | White cards with restrained borders. |
| Headings | Traditional Chinese serif stack, with a reliable local fallback. |
| Body | Traditional Chinese sans-serif stack. Start at 16 px. |
| Numerals | Tabular figures for prices and comparable facts. |
| Corners | Small radii. Avoid large rounded containers around every section. |
| Spacing | 4 px base scale. Use 16 to 24 px card padding. |
| Controls | At least 44 px touch targets and visible keyboard focus. |
| Motion | Short state transitions only. Respect reduced motion. No rotating hero. |

Define colors in the Nuxt UI theme. Components use semantic aliases such as `primary`, `text-default`, `text-muted`, `bg-default`, and `border-default`. Do not duplicate raw color values across page templates.

The local UI/UX guidance search initially returned a generic testimonial-heavy marketplace layout. A narrower real-estate search returned relevant property guidance, but its glass treatment and Latin-only font pair are not suitable for this zh-TW content-first site. Keep the accessibility guidance. Do not invent testimonials or add tours outside the confirmed scope.

## Shared structure

The public header contains 探索物件, 購屋指南, 我的收藏, and an account action. Show 房仲入口 as a secondary action. On narrow screens, move secondary navigation into a labeled menu. Keep the search and account paths accessible without hover.

The footer explains Madori's marketplace role and links to buying guidance and Agency registration. Do not claim that Madori verifies licenses or guarantees transactions.

Use a shared Property card, price presentation, Applicable fact display, save action, and contact panel. Keep the Agency dashboard shell separate from public navigation.

## Page flows

### Homepage

Present a compact ward, budget, and property-type form. Submit to the search page with URL parameters. Use quick links only when they map to supported filters. Show actual Published Properties, not a fictional inventory count. Include concise buying guidance below the discovery content.

On mobile, omit the English eyebrow and decorative scene. Keep the search above the first Property card with a short heading and one explanatory sentence.

### Search

Read and write validated URL query parameters. Preserve filters when opening a Property and returning to results. Show result count, sorting, pagination, and removable active filters.

On desktop, use a filter column and readable photo results. On mobile, use a labeled filter button and Nuxt UI Slideover. Apply and clear actions must be explicit. Include ward, price, type, layout, applicable area, station, walking time, and the existing new/resale and building-age filters.

Show loading feedback with reserved card space. Empty results suggest clearing filters. A failed request shows a retry action and does not masquerade as an empty result.

### Property detail

Show title, price, ward, transit, and the save action near the gallery. Give the Floor plan its own reachable control and caption. Use ordered thumbnails or Nuxt UI gallery controls with keyboard support.

Place monthly costs and Applicable facts before the long description. Preserve square-metre labels for exclusive, building, and land area. Show approximate 坪 without implying that Japanese exclusive area equals Taiwan's gross registered area.

On desktop, the Agency contact panel can remain beside the content. On mobile, a sticky inquiry action must not cover content or keyboard focus. Inquiry opens a labeled form with the selected Property visible. Guests go through Buyer sign-in before submission.

### Buying guide

Explain LDK, exclusive area, land rights, management fees, repair reserves, the inquiry-to-purchase process, and questions to ask the Agency. Link to sources. State that actual fees, lending eligibility, legal obligations, and visa matters require qualified advice.

### Buyer account

Keep registration and login role-specific. After login, expose saved Properties and inquiry history. A saved withdrawn Property appears as unavailable without disclosing draft or withdrawn details. History shows the message, submission time, and recipient Agency.

### Agency registration and dashboard

Registration asks for the existing company facts and verifies email control. There is no approval queue. Do not display a verified-license badge.

The dashboard provides Properties, the Freshness review queue, and the inquiry inbox. Property editing separates basic facts, Transit entries, photos, Floor plan, and publication status. Publication errors name the missing requirements and keep the entered data.

The inquiry inbox shows only the Agency's own messages. Show Buyer contact details only inside the authenticated inbox. Read state must not imply that an email was delivered.

## Form and feedback rules

Use visible labels, field-level validation, bounded input, and preserved values after errors. Distinguish a pending action, successful persistence, and failed email notification. Disable duplicate form submission while a request is active without permanently locking the form.

Login must not accept an arbitrary return URL. Use fixed role-specific destinations or a validated local path. Keep account and inbox pages out of public indexing and shared caches.

## Implementation boundary

The visual comparison is complete. Browser usability checks still apply to the implemented Nuxt UI pages. The prototype does not prove API correctness, authorization, email delivery, or accessibility of the final product.
