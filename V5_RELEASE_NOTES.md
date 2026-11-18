# CP SMM V5 — source package revision notes

## Scope of this package

This is a backwards-compatible source update based on the uploaded `multi-provider-smm-v4-cloudflare.zip`. It is not a completed implementation of every item in the CP SMM V5 master specification.

## Changes in this revision

- Expanded the theme palette from 10 to the 36 named themes in the V5 specification.
- Kept `cobalt` as the stable preset identifier and preserved its original color values; its customer-facing label is now **Ocean Blue**. Existing installations that stored `brand_preset = 'cobalt'` continue to resolve without a data migration.
- Added a test asserting the exact 36 theme labels, unique IDs and count.
- Updated implementation status and README to distinguish completed work from outstanding V5 requirements.
- Retained all original V4 source files, existing integrations, and migrations 0001–0021.

## Validation performed here

- Confirmed 36 theme entries, 36 unique IDs and 36 unique labels with a source-level check.
- Applied all 21 existing SQL migration files to a fresh in-memory SQLite database successfully.
- Attempted `npm ci` twice; dependency installation did not finish before the environment timeout.
- The available runtime is Node v22.16.0, but `package.json` requires Node >=24.
- `tsc --noEmit` could not run because the timed-out install left required `@cloudflare/workers-types` and `vite/client` definitions unavailable.
- Consequently, Vitest and the production build are **not certified** in this environment.

## Before deployment

Use Node 24 or newer and run:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Then deploy to a staging Cloudflare Worker/D1 database and smoke-test Telegram setup, owner authorization, provider import/routing, order placement, Stars, Khalti/eSewa/Paytm sandbox flows, payment reconciliation, scheduled jobs and backups before production use.

## Outstanding V5 work

The complete V5 master specification still requires implementation and testing of customer/admin redesign beyond existing V4 screens, individual customer/admin theme settings, dashboard expansion, VIP memberships/discounts, coupons, support tickets, promotions and proof verification, free-service campaigns, referrals/loyalty/cashback, AI assistant and confirmed AI ordering, broadcast studio and shared dynamic message templating, legal policy versioning/acceptance, backend maintenance enforcement, expanded analytics/automation, full backup/restore, setup wizard expansion, monitoring and final security/integration testing.

No claim is made that those outstanding features are functional in this source package.


## V5 implementation update — customer/rewards foundations (items 1–8)

This revision adds an additive migration (`0022_v5_customer_rewards.sql`), authenticated `/api/v5/*` endpoints, and a customer V5 hub linked from Profile.

Implemented in this source update:
- Per-user theme/style preference storage and validation (`GET/PUT /api/v5/preferences`).
- VIP level seed data (Bronze through Diamond), spend-based level/progress calculation, and a customer VIP summary endpoint.
- Coupon creation/listing for owners and customer coupon eligibility checks, including date windows, global/per-user limits and first-order-only checks.
- Customer support ticket creation, listing, detail and replies; owner ticket listing and replies with status/priority updates.
- Promotion listing and unique claim requests; owner promotion creation and claim review queue listing.
- Free-service campaign listing with per-user daily claim counts.
- Loyalty and cashback account/history summary endpoints.
- A customer V5 hub UI for preferences, VIP, coupon validation, promotion listing, free-service listing, loyalty summary and ticket creation/listing.

Important remaining work (not represented as complete):
- The chosen theme is persisted but the complete 36-theme palette is not yet applied globally to every component/screen; font, custom color and layout controls need full UI.
- VIP discounts are not yet applied to balance or Telegram Stars checkout, and membership history/manual level management is not yet exposed.
- Coupon checks are eligibility-only: atomic redemption and discount application at checkout are not connected. Do not treat a valid coupon response as a price quote.
- Ticket attachments, customer ticket conversation/detail UI, admin agent assignment UI and Telegram notifications are not implemented.
- Promotion channel verification, proof upload/review decision workflow and safe reward credit are not implemented. Claims remain pending and no balance is credited.
- Free-service claim-to-provider-order fulfillment, daily/global budget enforcement and duplicate-order protection are not implemented. The endpoint only lists campaigns and usage counts.
- Loyalty point earning, check-in, redemption, cashback accrual/refunds and fraud controls are not implemented; the customer UI currently displays the account summary only.
- The admin frontend for the new V5 endpoints is not yet added.

## Validation for this revision

- Applied all 21 original SQL migrations plus the new migration to a fresh in-memory SQLite database successfully.
- Typecheck, unit tests and production build have not been certified. The project requires Node >=24; the available runtime in the prior environment was Node 22 and dependency installation did not complete.
