# Multi-provider SMM Telegram Mini App

A white-label Telegram Mini App and bot for selling social-media services through multiple standard SMM v2 API providers. The admin connects providers, imports services, configures prices and branding, and manages orders from the built-in admin panel.

## Features

- Telegram Mini App customer storefront, wallet, orders and profile.
- Owner-only admin dashboard, user/order management, price rules and branding.
- Multiple standard SMM v2 providers (API URL + key), service import by provider/category/platform, and per-order provider routing.
- Scheduled provider order status checks; provider cancellation and refill where supported.
- Admin configuration for service/category icons, currencies and payment methods.
- Editable bot message templates for welcome, order lifecycle, top-ups, refunds, help and referrals.
- Telegram Stars top-ups (the only fully implemented live payment flow).
- Cloudflare Workers + D1 deployment.

## Requirements

- Node.js 24 or newer
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A Cloudflare account with Workers and D1 enabled
- One or more providers that implement the common SMM v2 `key` + `action` API

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.dev.vars.example` to `.dev.vars` for optional local-only settings. No application encryption key is required. Enter the Telegram bot token and first admin Telegram ID in the first-run browser setup.
3. Run `npm run dev`.
4. Open the local setup page, enter the bot token, and complete the Telegram setup steps, including the first-admin claim.
5. Claim the owner account, open the Admin page in Telegram, and connect providers under **Providers**.
6. Import services by selecting a provider, category, platform and services.

## Cloudflare deployment

1. Deploy the project to Cloudflare Workers.
2. Create a D1 database named `notpanel` in Cloudflare. Copy its database ID into `wrangler.jsonc` in the `database_id` field. Do not add the bot token to source control or Worker variables; enter it in the first-run setup wizard. The token is saved in the private D1 settings table. The first admin is verified through a one-time claim link sent to the bot.
3. Deploy the Worker and open its URL to complete the Telegram setup wizard.
4. Claim the owner account, then connect supplier API endpoints and keys from **Admin → Providers**.
5. Apply migrations with `npm run db:migrate:remote` if your deployment process does not apply them automatically.

Provider keys are stored server-side and masked in admin responses. Never share the `.dev.vars` file or provider credentials.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for what is implemented and what remains intentionally unfinished.


## Payment gateways

See [PAYMENT_GATEWAYS.md](./PAYMENT_GATEWAYS.md) for Khalti, eSewa and Paytm/UPI configuration, secret management, sandbox testing and production safety checks.


## First-run Cloudflare setup

1. Create a D1 database named `notpanel` in the Cloudflare dashboard.
2. Copy its database ID into `wrangler.jsonc` (`d1_databases[0].database_id`).
3. Deploy the Worker. The `main` entry point is `worker/index.ts`; static assets are served from `./dist` through the `ASSETS` binding.
4. Open the deployed app URL. The first-run wizard asks for the Telegram bot token from @BotFather and your numeric Telegram administrator ID.
5. The token is validated with Telegram and stored in the private D1 settings table. No `APP_ENCRYPTION_KEY` or other application encryption key is required.
6. Complete the one-time Telegram admin claim link, then configure providers under **Admin → Providers**.

**Token storage note:** To honor the no-app-encryption-key setup requirement, new installations store the Telegram bot token as a private D1 setting rather than encrypting it with an application-managed key. Restrict access to the Cloudflare account and D1 database accordingly. Existing installations using the older encrypted-token format can continue using their old key; they can also use a `BOT_TOKEN` Worker secret during controlled recovery.

The customer wallet is stored in micro-USD/USDT-equivalent units to avoid rounding loss. Each customer can select an enabled display currency in Profile; currency conversion affects presentation only, not the underlying wallet value. Telegram Stars remain an optional payment method, with the Stars-per-USDT rate controlled by the administrator.

## V5 upgrade status

This source ZIP contains the V4 application plus the first V5 implementation slice: all 36 named theme presets, with the original `cobalt` theme ID and visual values preserved as **Ocean Blue** for backwards compatibility. The full V5 feature specification is not yet complete in this package. See `IMPLEMENTATION_STATUS.md` for implemented work, outstanding features, and required pre-deployment validation.
