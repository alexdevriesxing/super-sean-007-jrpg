# Deployment

## Local Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

Production output is generated in `dist/`.

## GitHub Repository

Repository name:

```text
super-sean-007-jrpg
```

Commit message:

```text
Initial Super Sean 007 HTML5 JRPG website and game foundation
```

If GitHub CLI is installed and authenticated:

```bash
git init
git add .
git commit -m "Initial Super Sean 007 HTML5 JRPG website and game foundation"
gh repo create super-sean-007-jrpg --public --source . --remote origin --push
```

If GitHub CLI is not authenticated:

```bash
gh auth login
gh repo create super-sean-007-jrpg --public --source . --remote origin --push
```

Manual fallback:

```bash
git init
git add .
git commit -m "Initial Super Sean 007 HTML5 JRPG website and game foundation"
git remote add origin https://github.com/YOUR_ACCOUNT/super-sean-007-jrpg.git
git push -u origin main
```

## Cloudflare Pages

Recommended Pages settings:

- Project name: `super-sean-007-jrpg`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root
- Node version: 22 or newer

The build script generates audio, slices graphics, runs Vite, copies static assets/docs/Cloudflare files and validates manifests.

## Wrangler Fallback

If Wrangler is installed and authenticated:

```bash
npx wrangler pages project create super-sean-007-jrpg --production-branch main
npm run build
npx wrangler pages deploy dist --project-name super-sean-007-jrpg
```

If authentication is missing:

```bash
npx wrangler login
npx wrangler pages deploy dist --project-name super-sean-007-jrpg
```

## Troubleshooting

- Missing audio: run `npm run generate:audio`.
- Missing sliced graphics: run `npm run slice:assets`.
- Missing gallery images: run `npm run validate` and check `data/asset-manifest.json`.
- Ad script blocked: update `_headers` CSP after confirming the real Adsterra domains.
- Broken canonical URLs: replace the placeholder domain in `index.html`, `sitemap.xml`, `llms.txt` and `ai-summary.json`.
