# Super Sean 007 deployment and production controls

## Cloudflare Pages build

Use these production settings:

- Project: `super-sean-007-jrpg`
- Production branch: `main`
- Root directory: repository root
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22 or newer

The build runs semantic release checks and Node tests, generates and optimizes assets, builds with Vite, creates a clean production-only `dist`, renders canonical public facts, stamps the service worker with the deployment commit, validates commercial security and SEO invariants, enforces performance budgets and runs a real Chrome gameplay smoke test.

Development-only source art under `assets/generated`, the original friends foundation sheet, internal asset manifests and repository documentation are intentionally excluded from `dist`. The deployed game uses optimized tiles, sliced sprites, WebP battle backgrounds and runtime files only.

## GitHub deployment automation

`.github/workflows/cloudflare-deploy.yml` runs on `main` and on manual dispatch. It remains a safe no-op until both encrypted repository secrets exist:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The token must be restricted to the relevant Cloudflare account with **Account → Cloudflare Pages → Edit**. Never use or store a Global API Key.

When authorized, the workflow:

1. installs locked dependencies;
2. builds, validates and browser-tests the exact commit;
3. deploys `dist` with `cloudflare/wrangler-action@v3`;
4. waits for the custom domain to report version `1.2.1` and the exact commit;
5. runs `scripts/live-smoke.mjs` against production;
6. uploads deployment, browser, performance and live-smoke evidence for 30 days.

A deployment is not considered successful merely because Wrangler uploaded files. The custom-domain smoke test must pass.

## Required Cloudflare bindings and secrets

The existing KV binding must remain available:

- `SSG_SAVES` — cloud saves and backward-compatible fallback storage.

Create an encrypted `ADMIN_TOKEN` secret with at least 32 random characters. It protects reads from `/api/stat` and `/api/err`. Without it, diagnostics intentionally return HTTP 503 and the strict production smoke test fails.

Recommended isolated KV bindings:

- `SSG_ANALYTICS`
- `SSG_ERRORS`
- `SSG_PARTY`
- `SSG_RATE_LIMIT`

Preview deployments must use preview-specific namespaces and must never share production player saves. `ALLOWED_ORIGINS` should contain only approved production and explicitly tested preview origins.

## TURN relay for reliable Party Link

Provision a coturn-compatible TURN service and add:

- `TURN_URLS`
- `TURN_SHARED_SECRET`
- optional `TURN_TTL_SECONDS`

`/api/turn` issues short-lived HMAC credentials. Permanent TURN usernames or passwords must never be embedded in JavaScript. Test Wi-Fi-to-mobile and mobile-to-mobile sessions after configuration.

## Protected diagnostics

Open `/stats.html` and enter `ADMIN_TOKEN`. The page keeps the token only in JavaScript memory and never writes it to localStorage or sessionStorage.

Place `/stats.html`, `/api/stat` GET and `/api/err` GET behind Cloudflare Access as a second layer. Retain the application bearer-token check even after Access is configured.

## Rate limiting and analytics accuracy

Application limits use short-lived SHA-256 fingerprints and store no raw address. KV counters are not atomic, so configure Cloudflare edge rate limiting for:

- `/api/save*`
- `/api/party*`
- `/api/turn`
- `/api/stat`
- `/api/err`

Do not cache `/api/*`. Move business-critical metrics to Analytics Engine, D1, Durable Objects or another concurrency-safe store before relying on them for revenue reporting.

## Cloud-save operations

Cloud saves are schema-sanitized and limited to 150 KB. Players can download a backup, restore or replace the cloud copy, rotate the sync ID and delete the cloud record from Settings.

Before launch, test normal upload/restore, newer-cloud conflicts, explicit overwrite confirmation, ID rotation, deletion and version 1/2 migration into the version 3 epilogue schema.

## Player controls and accessibility

Verify every keyboard action can be rebound, duplicate keys swap safely, arrow-key movement remains available, gamepad movement and menu buttons work, text scaling does not clip, high contrast remains readable, reduced motion suppresses nonessential effects and preferences persist after reload.

## Performance budgets

`data/performance-budget.json` defines release ceilings. `npm run budget:performance` writes `dist/performance-report.json` and fails when the commercial package exceeds approved limits.

Version 1.2.1 limits the complete production package to 30 MB, permits only the title key art to exceed 2 MB and excludes generated source packs. Do not raise a threshold merely to make CI green.

## Domains and security headers

Attach both:

- `www.supersean007.com`
- `supersean007.com`

Permanently redirect `www.supersean007.com` to the canonical apex domain, `https://supersean007.com/`. Production headers include HSTS, CSP, content-type protection, referrer policy, permissions policy and dedicated restrictions for diagnostics.

The `_redirects` file only normalizes `/index.html` to `/`. There is no catch-all 200 rewrite; unknown paths must return the branded page with HTTP 404.

## Automated production monitoring

`.github/workflows/production-monitor.yml` runs every hour at minute 17 and can be run manually. It checks the current `main` commit against production.

On failure it opens or updates one issue named **Production smoke test failed** and attaches workflow evidence. After a later successful run it comments with the recovery time and closes the incident automatically.

The public `/status.html` page shows only public health, release and performance information. It never reads analytics, error reports, saves or administrator credentials.

## Post-deployment verification

The strict live smoke test verifies:

1. `/api/health` reports `ok: true`, version `1.2.1` and the exact commit;
2. `/build-meta.json` reports the same version and commit;
3. the homepage has HSTS, CSP and `nosniff`;
4. an unknown path returns HTTP 404;
5. the apex redirects to canonical `www`;
6. `robots.txt`, sitemap, `llms.txt` and `ai-summary.json` are current;
7. security contact, support and status pages are available;
8. `/performance-report.json` passes;
9. unauthenticated diagnostics return HTTP 401;
10. invalid save IDs are rejected.

The complete player smoke checklist still includes desktop/mobile startup, local and cloud saves, old-save migration, remapped controls, gamepad, accessibility preferences, TURN-backed Party Link, automatically loaded ads, service-worker updates and New Game+.

## Search and discovery

Submit `https://supersean007.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools after the deployment passes. Inspect the homepage, guides, characters, world, updates, support and security pages. Production facts are rendered from `data/site-facts.json` to prevent release drift.
