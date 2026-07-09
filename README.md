# Super Sean 007: Legend of the Seven Gems

Production-ready static website and expandable playable HTML5 JRPG foundation for **Super Sean 007: Legend of the Seven Gems**.

The source site lives in `super_sean_007_full_project_wired/`. The workspace root contains the build, generation, validation and deployment tooling.

## Local Development

```bash
npm install
npm run dev
```

The dev server serves the existing static site with Vite. The `dev` script also generates audio and sliced asset metadata before the server starts.

## Build

```bash
npm run build
npm run preview
```

The production output is `dist/`, suitable for Cloudflare Pages.

## Verification

The browser-game smoke payload used for Playwright client checks is `qa/gameplay-actions.json`.

## What Is Included

- SEO/GAIO landing page with crawlable lore, characters, regions, quests, FAQ and asset gallery.
- Playable HTML5 Canvas JRPG vertical slice with exploration, NPC dialogue, chests, quests, local save/load and turn-based battles.
- Existing generated art library preserved under `assets/generated/`.
- Generated audio under `assets/audio/` and `data/audio-manifest.json`.
- Sliced graphics under `assets/sliced/` and `data/sliced-assets.json`.
- Adsterra-ready placement containers plus safe placeholder ad hooks.
- Cloudflare Pages `_headers` and `_redirects`.

## Game Systems

- Movement: WASD / Arrow keys and touch controls.
- Interact: E or touch Interact.
- Menus: Q quest log, I inventory, M map.
- Save: P, using browser localStorage.
- Audio: O toggles music, L toggles SFX after browser audio unlock.
- Battle: click commands or press 1-6.

## Asset Structure

- `assets/characters/` - current character strips, portraits and enemies.
- `assets/tilesets/` - current region tilesets used by the canvas game.
- `assets/generated/` - full generated production art library.
- `assets/sliced/` - generated derivative PNG frames/tiles from the slicing script.
- `assets/audio/` - generated WAV music and SFX.
- `data/asset-manifest.json` - full generated art gallery manifest.
- `data/asset-wiring.json` - key art and battle background routing.
- `data/audio-manifest.json` - generated audio cue manifest.
- `data/sliced-assets.json` - generated graphics slicing manifest.

## SEO and GAIO

The site includes metadata, Open Graph/Twitter cards, JSON-LD for VideoGame/WebApplication/FAQ, `robots.txt`, `sitemap.xml`, `llms.txt`, `ai-summary.json`, semantic sections and an asset gallery with lazy loading.

Replace the canonical URL placeholder in `index.html` and sitemap URLs before production launch.

## Adsterra Integration

No production Adsterra script or ad unit ID is included. Future scripts should be added only after real placement IDs and domains are available.

Ad configuration lives in:

- `super_sean_007_full_project_wired/data/ad-config.json`
- `super_sean_007_full_project_wired/src/config/ads.ts`
- `super_sean_007_full_project_wired/docs/ADSTERRA_INTEGRATION.md`

Update `_headers` CSP once the exact Adsterra script, frame, image and connect domains are known.

## Cloudflare Pages

Recommended settings:

- Project name: `super-sean-007-jrpg`
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 22 or newer

See `super_sean_007_full_project_wired/docs/DEPLOYMENT.md`.

## Manual GitHub Setup

If GitHub CLI is authenticated:

```bash
git init
git add .
git commit -m "Initial Super Sean 007 HTML5 JRPG website and game foundation"
gh repo create super-sean-007-jrpg --public --source . --remote origin --push
```

If `gh` is not authenticated, run `gh auth login` first or create the repository manually on GitHub and push with the commands shown in `docs/DEPLOYMENT.md`.
