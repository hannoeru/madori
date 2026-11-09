# Madori buyer experience

## Evidence collected

This study uses direct page inspection and first-party documentation. It does not prove that one layout converts better than another. The recommendations below are design hypotheses to test on Madori.

### SUUMO separates the ways to search

The [Tokyo resale condominium page](https://suumo.jp/ms/chuko/tokyo/) offers routes for area, rail line and station, commute time, price and area, maps, and agencies. Its top navigation includes saved properties, registration, and login. The [area search page](https://suumo.jp/ms/chuko/tokyo/city/) groups wards and includes price, area, layout, and walking-time controls.

The browser confirmed that the area action opens the area search page. The desktop image is [suumo-desktop.png](screenshots/suumo-desktop.png).

**Recommendation.** Offer a short starting search on the homepage. Put the full filter set on a dedicated search page. Use ward and transit entry points without adding commute or map features that the current data cannot support.

### Buyers need definitions, not just translated labels

SUUMO's [official property information guide](https://suumo.jp/edit/joho_mikata/index.html) distinguishes condominium exclusive area from detached-house building and land area. It states that balconies are not part of exclusive area. It defines LDK, service rooms, land rights, transaction modes, information dates, and walking-time conventions. It also states that the displayed sale price excludes brokerage fees.

**Recommendation.** Keep Japanese layout notation. Explain LDK and service rooms instead of inventing a bathroom count from the notation. Show the applicable area label for each property type. Put monthly management and repair-reserve costs beside the price summary. Provide a buying guide with source links and clear limits, not a promised all-in price.

### Taiwanese property pages use familiar units

The [Sinyi Japan Traditional Chinese homepage](https://www.sinyijapan.com/tw) presents condominium area in square metres and approximate ping. It retains Japanese station and line names. Cards include layouts, walking times, and prices in ten thousand yen. Its navigation separates buying, selling, consultation, and guidance. Its FAQ covers brokerage fees, parking, and the fact that buying property does not grant residence rights.

The desktop browser and extracted page text confirmed these conventions. The image is [sinyi-desktop.png](screenshots/sinyi-desktop.png).

**Recommendation.** Use 萬日圓 for prices and 平方公尺 with approximate 坪 for area. Show Traditional Chinese station names with Japanese originals where they differ. Do not add a fixed TWD conversion as if it were a current exchange rate. Keep direct agency contact visible without making LINE the only inquiry path.

### LIFULL visual inspection is incomplete

The [Tokyo resale condominium page](https://www.homes.co.jp/mansion/chuko/tokyo/) returned a CloudFront 403 page in this browser. The image [homes-access-denied.png](screenshots/homes-access-denied.png) records the failure, not the product interface. The existing [Japanese portal study](jp-buy-sell-portals.md) contains earlier source links. Those notes are background evidence and do not replace current visual inspection.

No current LIFULL layout claim is based on the denied page.

### Nuxt UI supports one shared design system

The [Nuxt UI design-system documentation](https://ui.nuxt.com/docs/getting-started/theme/design-system) defines semantic colors, CSS theme variables, fonts, runtime color aliases, and reduced-motion support. The installed project uses Nuxt UI 4.11.0 and Tailwind 4.

**Recommendation.** Define brand tokens once in `app/assets/css/main.css` and `app/app.config.ts`. Build filters, forms, navigation, and overlays with Nuxt UI components. Use shared property cards and fact presentation rather than separate page-specific styles.

## Core buyer flow

1. Start with a ward, budget, or property type.
2. Refine a shareable search and scan comparable property cards.
3. Review photos, the floor plan, applicable facts, costs, transit, and freshness.
4. Save a property or send an inquiry to its owning Agency.
5. Return to saved properties and inquiry history after sign-in.

Searching and reading property details must not require an account. An account is required for durable saved properties and inquiry history.

## Scope decisions

- Buyers have saved properties and inquiry history. Saved searches and email alerts are excluded.
- Agencies register without platform approval. A displayed license is agency-supplied information, not a verification badge.
- The public site shows only Published Properties.
- Tokyo's 23 wards, condominiums, and detached houses remain the geographic and property-type boundary.
- A successful inquiry means the inquiry was saved. Notification delivery has a separate result.
- Demo listings and illustration images must be marked as demonstration content.

## Design hypotheses to compare

### Direction A. Warm editorial property search

Use a light paper background, dark ink, restrained forest-green actions, generous photo cards, a compact search panel, and concise buying guidance. Keep prices and property facts consistent. This direction targets readers who need orientation without hiding search.

### Direction B. Compact comparison portal

Use a neutral interface, persistent filter sidebar on desktop, denser result rows, and a smaller introductory section. This direction favors repeated comparison but can recreate the information load of existing portals.

Compare both at desktop and mobile widths. Prefer the direction that keeps the search action and first useful results visible, preserves readable facts, and requires fewer navigation steps. This is a browser layout comparison, not a conversion experiment.

## Baseline checks

The existing site runs at `http://localhost:3010`. The process on port 3000 belongs to another application and is not Madori.

The current homepage shows a large introductory section followed by twelve filters. Its first viewport does not show property results. The current detail page has a cover image and fact table but does not expose the full gallery or floor plan. The current public account flow supports agencies only.

The actual Madori baseline is [madori-baseline-desktop.png](screenshots/madori-baseline-desktop.png).

Before application changes, `pnpm typecheck` and `pnpm build` passed. `pnpm lint` failed because ESLint included generated `.pi` goal-state JSON. The project needs to exclude agent runtime artifacts, not reformat those files.

## Evidence limits

No buyer interviews, usability sessions, or conversion data were available. Taiwanese buyer needs here come from the confirmed product requirements and observable conventions on the source sites. Any claim about buyer preference remains a hypothesis until user testing provides evidence.
