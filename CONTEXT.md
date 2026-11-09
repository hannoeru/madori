# Madori glossary

- **Agency**: A licensed company (不動產公司/房仲公司) that owns its Listings and manages them through one dashboard account. Individual brokers are out of scope for the MVP. An Agency may view and edit only its own Listings.
- **Buyer**: A zh-TW user who searches Madori for a home to buy. A Buyer account can save Properties and keep its own Inquiry history. Buyers do not publish Listings.
- **Saved Property**: A Property kept in one Buyer's collection. Each Buyer can save a given Property once.
- **Inquiry**: A Buyer's message about one Property, addressed to the Agency that owns the Property when the message is accepted. The Buyer keeps its own history; the receiving Agency sees the message in its inbox.
- **Agency inbox**: The private collection of Inquiries addressed to one Agency.
- **Notification**: An email that tells the receiving Agency about an Inquiry. Notification failure does not remove the Inquiry.
- **Applicable fact**: A required Property fact that applies to its property type; condominium and detached-house facts differ.
- **Floor plan**: The one required image that represents a Property’s layout.
- **Media cleanup queue**: Agency-owned records of image objects that must be removed from R2. Image removal or replacement records its cleanup work with the D1 metadata change. A failed R2 deletion leaves that work available for retry.
- **Freshness review queue**: The dashboard list of Published Properties due or overdue for manual review.
- **Property**: A new or resale condominium or detached house offered for sale in Tokyo’s 23 wards. Each Property belongs to exactly one Agency.
- **Property photo**: One of one to twenty ordered images that show a Property.
- **Published Property**: A Property visible to Buyers.
- **Search**: A shareable Buyer query defined by Property filters.
- **Tokyo 23 wards**: The geographic boundary for every Madori Listing in the MVP.
- **Transit entry**: A station, its rail line, and walking time for a Listing.
- **Withdrawn Listing**: A Listing hidden from Buyers that its owning Agency can restore or permanently delete.
