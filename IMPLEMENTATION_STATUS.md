# Implementation status

## Included

- Generic SMM provider add/edit/enable/disable, catalogue import and service management.
- Provider-specific order routing, cheapest matching-provider selection, scheduled status polling, cancel/refill capability handling and six-hour price synchronization.
- Provider health records (last check/success, latency, consecutive failures and last error), visible in Admin → Providers.
- Admin pages for providers, imports, icons, currencies, payment methods, editable bot messages and manual top-up review.
- Customer top-up screen with currency and method selection, Telegram Stars, manual requests and configured API gateway checkout.
- **Khalti ePayment:** server-side initiate + lookup verification (NPR).
- **eSewa ePay V2:** HMAC-signed checkout, signed callback validation and server-side transaction-status verification (NPR).
- **Paytm Payment Gateway:** SHA-256/AES-128-CBC checksum signing, transaction-token initiation and server-side order-status verification (INR). UPI is routed through the Paytm PG account when the merchant account has UPI enabled.
- Payment request history for customers and admin status filters for pending, paid, failed, approved and rejected requests.
- Scheduled gateway reconciliation for pending transactions and expiry of stale sessions.
- Payment audit events and one-time wallet credit + ledger entry guarded by a pending-to-paid state transition.
- Admin alerts for repeated provider sync failures and payment verification/reconciliation errors.
- Gateway merchant secrets are read only from Worker environment secrets; they are never stored in D1 or returned to the customer app.
- Migration `0020_payment_gateways_reliability.sql` adds gateway transaction state, audit and provider-health storage.

## Requires merchant configuration and live validation

- Khalti, eSewa and Paytm merchant credentials must be configured as Cloudflare Worker secrets. Test credentials must be used first.
- The relevant merchant accounts must be eligible, approved and KYC-verified by their providers. Paytm/UPI requires an eligible India merchant account and UPI enabled on the Paytm PG account.
- A successful local code build does not prove a live merchant transaction. Complete provider sandbox checkout, callback, status lookup, exact amount/currency checks and wallet-credit tests before switching to live credentials.
- bKash, Binance Pay and generic crypto payment methods remain disabled/unintegrated in this update. Bank transfer and other manual methods continue to use owner verification.
- Gateway refunds/chargebacks are not automated; these must be handled through the provider merchant dashboard and reconciled by the owner.

## Validation performed for this update

- All 20 SQL migrations applied successfully to an in-memory SQLite database.
- Wallet-credit idempotency tested: a repeated payment confirmation produced one balance credit, one ledger row and one gateway audit event.
- TypeScript/TSX syntax transpilation passed for all modified source files.
- Full typecheck, unit tests and production build could not be completed: dependencies could not be installed in this environment, and the available Node runtime is v22 while this project requires Node 24 (`.nvmrc`).

Before deployment, use Node 24, run `npm ci`, then `npm run typecheck && npm test && npm run build`.

## V4 first-run and customer currency update

- First-run browser setup now accepts the Telegram bot token and the intended first administrator Telegram ID.
- The first-run wizard validates the Telegram bot token and saves it in the private D1 settings table; no app encryption key is required.
- The first-admin claim deep link is restricted to the Telegram ID entered during setup. A different ID cannot claim the initial admin role.
- Existing `BOT_TOKEN` Worker-secret deployments remain supported as a backwards-compatible fallback when no encrypted token exists.
- Added migration `0021_first_run_encryption_currency.sql`: customer currency preference defaults to USDT and USDT is added as an enabled currency.
- Customers can select an individual display currency in Profile. Wallet balances, service prices, order totals, refunds and ledger amounts use the selected currency symbol and configured exchange rate; stored wallet values remain USDT-equivalent micro-units to avoid rounding loss.
- Admin's Telegram Stars conversion setting is labelled Stars per USDT. It controls Telegram Stars payment calculations, not each customer's display currency.
- Top-up currency selection defaults to the customer's preferred currency when an enabled payment method supports it; otherwise it falls back to an available payment currency.

## V4 validation

- All 21 SQL migrations applied successfully to an in-memory SQLite database.
- TypeScript/TSX syntax transpilation passed for 98 non-declaration source files.
- Full TypeScript typecheck, unit tests and production build remain unverified because dependency installation timed out and the available runtime is Node 22 (project requirement: Node 24+).
- Cloudflare deployment, AES-GCM round-trip in the Workers runtime, Telegram setup, webhook registration and first-admin claim still require deployment smoke testing.

## CP SMM V5 upgrade work (this package revision)

### Implemented in this revision

- Expanded the branding palette from 10 presets to the 36 named V5 color themes.
- Preserved the existing `cobalt` preset ID and its exact shipped light/dark values under the customer-facing name **Ocean Blue**, so existing installations do not need a theme-setting migration.
- Kept the existing shared theme engine, custom accent support, light/dark CSS variables and WCAG contrast derivation for every preset.
- Added a regression test for the exact 36-theme list and unique preset IDs; the existing theme contrast tests automatically cover all 36 presets.

### Not yet implemented or verified

The uploaded V5 specification is substantially larger than a theme update. This package revision does **not** claim the remaining V5 features are complete. In particular, VIP/membership discounts, coupon redemption, support tickets, campaign/promotion verification, daily free-service claims, loyalty/cashback, AI ordering, per-customer theme preferences, the full messaging studio, legal policy versioning, backend maintenance enforcement, expanded analytics/automation, and the full setup/monitoring/backup workflows still require implementation and testing.

The source package was inspected, but dependency installation did not complete in this environment. The available Node runtime is v22 while the project requires Node 24+. Therefore TypeScript typecheck, Vitest, and the Cloudflare production build have not been certified in this revision. Run the checks below on Node 24 before deploying:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Existing migrations 0001–0021 and existing V4 integrations are retained unchanged. No live database was accessed or migrated during this source update.

- In this package revision, all 21 existing migration SQL files were also applied successfully to a fresh in-memory SQLite database. This validates SQL syntax/application order only; it is not a production D1 backup/restore or live-data migration test.


## CP SMM V5 items 1–8 update

The latest customer/rewards foundation adds migration `0022_v5_customer_rewards.sql`, authenticated `/api/v5/*` APIs and a customer V5 hub. It includes per-user theme preference storage, seeded VIP tiers and spend progress, coupon eligibility checks, support ticket creation/replies, promotion claim requests, free-service campaign listings, and loyalty/cashback summaries. See `V5_RELEASE_NOTES.md` for the precise scope and limitations.

These eight areas are **not yet fully complete**. In particular, theme application across the entire UI, checkout discounts/redemptions, VIP discount/refund calculations, ticket attachments/agent workflow, promotion verification/reward credit, free-service order fulfillment and budget enforcement, and loyalty earning/redemption/cashback/fraud logic still require implementation and tests. The new APIs deliberately do not issue unverified rewards or claim that a coupon has reduced an order price.
