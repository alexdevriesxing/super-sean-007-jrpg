# Super Sean 007 deployment and production controls

## Cloudflare Pages build

Use these production settings:

- Project: `super-sean-007-jrpg`
- Production branch: `main`
- Root directory: repository root
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22 or newer

The build runs semantic release checks and Node tests, generates and optimizes assets, builds with Vite, copies static and Cloudflare files, renders canonical public facts into `dist`, stamps the service worker with the deployment commit, validates commercial security and SEO invariants, and produces a deployable artifact in GitHub Actions. CI also starts the production preview in real headless Chrome and verifies the game shell, title-screen start, accessible settings dialog and guide page.

## Required Cloudflare bindings and secrets

The existing KV binding must remain available:

- `SSG_SAVES` — cloud saves and backward-compatible fallback storage.

Create an encrypted secret named `ADMIN_TOKEN` in Cloudflare Pages → Settings → Variables and Secrets. Use at least 32 random characters. It protects reads from `/api/stat` and `/api/err`. Never commit it to GitHub or store it in a password-free browser profile.

Recommended isolated KV bindings:

- `SSG_ANALYTICS`
- `SSG_ERRORS`
- `SSG_PARTY`
- `SSG_RATE_LIMIT`

When an optional binding is absent, namespaced keys fall back to `SSG_SAVES`, so the release remains backward compatible. Preview deployments must use preview-specific namespaces and must never share production player saves.

`ALLOWED_ORIGINS` is declared in `wrangler.toml` for the apex and `www` production domains. Add preview origins only when a preview genuinely needs to exercise write APIs.

## TURN relay for reliable Party Link

STUN-only WebRTC will fail on some mobile carriers and symmetric-NAT networks. Provision a coturn-compatible TURN service, then add these production variables:

- `TURN_URLS` — comma-separated relay URLs, for example `turn:relay.example.com:3478,turns:relay.example.com:5349`
- `TURN_SHARED_SECRET` — an encrypted secret shared with the TURN server’s REST authentication configuration
- `TURN_TTL_SECONDS` — optional credential lifetime; defaults to 3600 seconds and is constrained between 600 and 86400

`/api/turn` issues short-lived HMAC credentials. Permanent TURN usernames and passwords must never be embedded in JavaScript. Test Wi-Fi-to-mobile and mobile-to-mobile sessions after configuration.

## Protected diagnostics

Open `/stats.html` and enter `ADMIN_TOKEN`. The page retains the token only in JavaScript memory and clears it when the page is left; it is not written to localStorage or sessionStorage. The route has a separate restrictive Content Security Policy.

Place `/stats.html`, `/api/stat` GET and `/api/err` GET behind Cloudflare Access as a second layer. The application bearer-token check must remain enabled even when Access is configured.

## Rate limiting and analytics accuracy

Application limits use a short-lived SHA-256 fingerprint and store no raw address. KV read-modify-write operations are not atomic, so these application counters are defence-in-depth rather than authoritative enforcement. Configure Cloudflare edge rate-limiting rules for:

- `/api/save*`
- `/api/party*`
- `/api/turn`
- `/api/stat`
- `/api/err`

Challenge or block abnormal bursts without disrupting normal play. Do not cache `/api/*` responses. Treat the fallback analytics dashboard as approximate under concurrent traffic; use Cloudflare Analytics Engine, D1/Durable Objects or another atomic analytics service before relying on metrics for financial reporting.

## Cloud-save operations

Cloud saves are schema-sanitized and limited to 150 KB. The player can download a JSON backup, restore the cloud copy, explicitly replace it, rotate the sync ID, or delete the cloud record from Settings.

Before a production launch, test:

- A normal upload and restore.
- A newer-cloud conflict.
- An explicit overwrite requiring the confirmation header.
- Sync-ID rotation and revocation of the old ID.
- Cloud deletion while retaining the local browser save.
- An old-version save migration.

## Domains and canonical redirect

Attach both:

- `www.supersean007.com`
- `supersean007.com`

Use a Cloudflare Redirect Rule or Bulk Redirect to send the apex hostname permanently to `https://www.supersean007.com/`. Canonicals and the sitemap use the `www` hostname.

The `_redirects` file only normalizes `/index.html` to `/`. There is no catch-all rewrite, so Cloudflare Pages should serve `404.html` with a genuine 404 status for unknown paths.

## Cache strategy

- Vite content-hashed files in `/assets/build/*`: one year, immutable.
- Mutable game art in `/assets/*`: one hour with revalidation.
- Data manifests: five minutes with revalidation.
- JavaScript: five minutes with revalidation.
- Service worker: no cache.

Every deployment replaces `__BUILD_VERSION__` in `sw.js` with the Cloudflare or GitHub commit SHA and removes old cache namespaces during activation.

## Deployment status and rollback

Configure Cloudflare’s GitHub integration so the production deployment status is reported on the exact commit. Keep the GitHub Actions `dist` artifact for 14 days. Document who can promote or roll back a deployment and test one rollback before public promotion.

## Post-deployment smoke checks

After Cloudflare reports a successful deployment, verify:

1. `/api/health` returns `ok: true` and the expected commit SHA.
2. `/this-path-must-not-exist` returns the branded page with HTTP 404.
3. `/stats.html` cannot read data without `ADMIN_TOKEN` and is protected by Cloudflare Access.
4. A new game starts on desktop and mobile.
5. Local save/load works after refresh.
6. Cloud upload, restore, conflict, rotation and deletion work with a disposable save.
7. Party Link reserves a code, consumes offers/answers and connects across separate networks through TURN where required.
8. The browser console contains no uncaught errors.
9. `robots.txt`, `sitemap.xml`, `llms.txt` and `ai-summary.json` show version 1.1.0 and eleven regions.
10. `/.well-known/security.txt` and `/security-policy.html` are available.
11. Third-party ad units appear only after consent and remain sandboxed.
12. Returning users receive the current service-worker cache version.
13. Production `SuperSeanGame.debug` is absent.

## Search and discovery

Submit `https://www.supersean007.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools. Inspect the homepage plus `guides.html`, `characters.html`, `world.html`, `updates.html` and `security-policy.html` after deployment. Production HTML and machine-readable summaries are rendered from `data/site-facts.json` into `dist` to prevent release-fact drift.
