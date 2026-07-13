# Super Sean 007 deployment and production controls

## Cloudflare Pages build

Use these production settings:

- Project: `super-sean-007-jrpg`
- Production branch: `main`
- Root directory: repository root
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22 or newer

The build synchronizes public game facts, runs the complete Node test suite, generates and optimizes assets, builds with Vite, copies static and Cloudflare files, stamps the service worker with the deployment commit, and validates the final `dist` directory.

## Required Cloudflare bindings

The existing binding must remain available:

- `SSG_SAVES` — cloud saves and backward-compatible fallback storage.

Create a secret named `ADMIN_TOKEN` in Cloudflare Pages → Settings → Variables and Secrets. Use a long random value of at least 32 characters. It protects reads from `/api/stat` and `/api/err`. Never commit this token to GitHub.

The following optional KV bindings are supported and recommended for cleaner isolation:

- `SSG_ANALYTICS`
- `SSG_ERRORS`
- `SSG_PARTY`
- `SSG_RATE_LIMIT`

When an optional binding is absent, the code falls back to namespaced keys in `SSG_SAVES`, so adding this release does not break the current deployment. Preview deployments should use preview-specific namespaces rather than production player data.

`ALLOWED_ORIGINS` is declared in `wrangler.toml` for the apex and `www` production domains. Add preview origins only when a preview genuinely needs to exercise write APIs.

## Protected diagnostics

Open `/stats.html`, enter the `ADMIN_TOKEN`, and the page sends it in an Authorization bearer header. The token is kept only in `sessionStorage` for that browser tab.

For stronger perimeter protection, place `/stats.html`, `/api/stat` GET and `/api/err` GET behind Cloudflare Access as an additional layer. The application-level token must remain enabled even when Access is configured.

## Rate limiting and abuse controls

Application-level limits use a short-lived SHA-256 fingerprint of the connecting IP and store no raw IP address. For stronger enforcement, also configure Cloudflare rate-limiting rules for:

- `/api/save*`
- `/api/party*`
- `/api/stat`
- `/api/err`

Recommended dashboard rules should challenge or block abnormal bursts rather than normal gameplay traffic. Do not cache any `/api/*` response.

## Domains and canonical redirect

Attach both:

- `www.supersean007.com`
- `supersean007.com`

Use a Cloudflare Redirect Rule or Bulk Redirect to send the apex hostname permanently to `https://www.supersean007.com/`. The repository canonical URLs and sitemap use the `www` hostname.

The `_redirects` file only normalizes `/index.html` to `/`. There is no catch-all rewrite. Cloudflare Pages therefore serves `404.html` with a real 404 status for unknown paths.

## Cache strategy

- Vite content-hashed files in `/assets/build/*`: one year, immutable.
- Mutable game art in `/assets/*`: one hour with revalidation.
- Data manifests: five minutes with revalidation.
- JavaScript: five minutes with revalidation.
- Service worker: no cache.

Every deployment replaces `__BUILD_VERSION__` in `sw.js` with the Cloudflare or GitHub commit SHA and removes old cache namespaces during activation.

## Post-deployment smoke checks

After Cloudflare reports a successful deployment, verify:

1. `/api/health` returns `ok: true` and the expected commit SHA.
2. `/this-path-must-not-exist` returns the branded 404 with HTTP 404.
3. `/stats.html` cannot read data without `ADMIN_TOKEN`.
4. A new game starts on desktop and mobile.
5. Local save/load works after refresh.
6. Optional Cloud Sync can upload and restore a disposable test save.
7. Party Link can reserve a code and exchange an offer/answer.
8. The browser console contains no uncaught errors.
9. `robots.txt`, `sitemap.xml`, `llms.txt` and `ai-summary.json` show version 1.1.0 and eleven regions.
10. Returning users receive the current service-worker cache version.

## Search and discovery

Submit `https://www.supersean007.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools. Inspect the homepage plus `guides.html`, `characters.html`, `world.html` and `updates.html` after deployment. The build generates all region counts, dates and machine-readable summaries from `data/site-facts.json` to prevent content drift.
