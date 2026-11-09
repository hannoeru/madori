# Madori product design

## Purpose

Madori is a website for one real-estate agent in Tokyo. It shows the agent's homes to Taiwanese customers in Traditional Chinese. The only conversion is a LINE message to the agent.

## Users

| User | Can do |
| --- | --- |
| Customer | See Published Listings, filter them, read the buying guide, open the agent's LINE link. Customers have no account. |
| Owner | Log in with one password, then create, edit, publish, withdraw and delete Listings and their images. |

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Introduction, Listings with filters, and the contact steps. |
| `/properties/:id` | Photos, price, monthly costs, facts, transit, Floor plan and LINE contact. |
| `/guide` | Buying guide. |
| `/login` | Owner login. |
| `/admin` | List of all Listings. |
| `/admin/properties/new`, `/admin/properties/:id` | Listing editor and images. |

## Rules

- A Draft is visible only to the Owner. Its images are private too.
- To publish, a Listing needs its area and at least one Property photo. A condominium needs exclusive area. A detached house needs land and building area.
- A Published Listing cannot lose its last Property photo.
- Images are JPEG or PNG, up to 10 MB each, with up to twenty Property photos and one Floor plan.
- Prices use 萬日圓. Areas use m² with approximate 坪.
- Filters are in the URL, so the agent can send a filtered link to a customer.

## Design

The name *madori* (間取り) means floor plan, so the site uses the visual language of a Japanese floor plan. The hero has an indigo floor plan on a grid. One grid square stands for half a ken. Indigo is the primary color, and LINE green is used only for the contact action. Photos carry the rest of the page, and there are no card frames around Listings.

## Out of scope

Customer accounts, saved homes, on-site inquiries, email, multiple agencies, Listing review reminders, map search and TWD conversion. Add one of these only when the agent has a real need for it.
