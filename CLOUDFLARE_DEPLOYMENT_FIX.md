# Cloudflare Workers deployment fix

This repository is configured as a Cloudflare Worker with a Vite-built static frontend.

## Cloudflare Workers Builds settings

Use these values in the GitHub-connected Worker project:

- Project name: `botv5` (must match `name` in `wrangler.jsonc`)
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/` (the directory containing `package.json` and `wrangler.jsonc`)
- Preview builds: leave disabled for the first production deployment; enable after the production deploy works.

The Worker entry point is `worker/index.ts` (`main` in `wrangler.jsonc`). The static frontend is emitted to `dist/` and exposed to the Worker as the `ASSETS` binding. These explicit settings prevent Cloudflare from trying to deploy a Worker without a script entry point or static asset binding.

## Required D1 binding

The application requires Cloudflare D1:

1. In Cloudflare Dashboard, open **Workers & Pages → D1 SQL Database** and create a database named `notpanel`.
2. Copy its database ID.
3. Open `wrangler.jsonc` in the GitHub repository and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with that exact ID.
4. Commit and push the change, then redeploy.

Do not leave the placeholder in place: Wrangler requires the real D1 database ID.

## First-run bot setup

After deployment, open the Worker URL in a browser. The first-run wizard asks for the Telegram bot token first, validates it with Telegram, and then asks for the administrator Telegram ID. Complete the one-time Telegram claim link.

No `APP_ENCRYPTION_KEY` is required or requested by this version. To honor that requirement, newly entered bot tokens are stored in the private D1 settings table. Restrict access to the Cloudflare account and D1 database. Existing databases that only have a legacy encrypted token may need their old key once or a controlled `BOT_TOKEN` Worker-secret recovery before switching to this version.
