# Super Sean 007 Website + HTML5 Game Build Notes

This package contains a static website and playable HTML5 Canvas JRPG foundation for **Super Sean 007: Legend of the Seven Gems**.

## What is included

- `index.html` - SEO/GAIO-optimized landing page with the game embedded.
- `styles.css` - responsive website styling.
- `game.js` - standalone HTML5 Canvas game foundation with asset, audio and ad managers.
- `assets/characters/` - extracted playable character strips, portraits and enemies.
- `assets/tilesets/` - region tilesets used by the canvas maps.
- `assets/generated/` - full generated art library preserved as source assets.
- `assets/audio/` - generated music loops and SFX.
- `assets/sliced/` - generated sliced graphics for characters, tiles, UI, pickups and VFX.
- `data/` - metadata JSON for lore, characters, asset wiring, audio and sliced graphics.
- `robots.txt`, `sitemap.xml`, `llms.txt`, `ai-summary.json`, `site.webmanifest` - SEO/GAIO/PWA support files.

## Build commands

From the repository root:

```bash
npm install
npm run dev
npm run build
npm run preview
```

`npm run build` generates audio, slices graphics, runs the static build, copies assets/docs/Cloudflare files into `dist/` and validates manifests.

## Playable systems in this build

- Top-down exploration.
- Birthday Village, Mushroom Meadow, Crystal Cave and Bald Moon Tower teaser paths.
- NPC dialogue, quest progression, chests and local save/load.
- Turn-based battles with XP, coins, HP, MP, level-ups and Friendship Burst.
- Generated title/village/battle/victory music and action SFX.
- Keyboard and mobile touch controls.
- Adsterra-ready placeholder hooks through `AdManager`.
- `window.render_game_to_text()` and `window.advanceTime(ms)` test hooks for browser QA.

## Adsterra integration points

HTML containers are marked with `data-adsterra-placement` attributes. The in-game `AdManager` provides these hooks:

```js
AdManager.init()
AdManager.showBanner(placement)
AdManager.hideBanner(placement)
AdManager.showRewardedAd(type, onSuccess)
AdManager.canShowRewardedAd(type)
AdManager.showInterstitial(reason)
```

Replace the placeholder logic with production Adsterra scripts only after real unit IDs and domains are available. Keep ads at natural breaks and avoid interrupting combat, cutscenes or dialogue.

## Expansion recommendations

1. Move maps, quests, items and monsters into JSON files.
2. Add Tiled map imports for large regions.
3. Add separate skill trees for Sean, Dave, Petroman, Haraku and Ruush.
4. Add village repair, cooking, fishing, gardening and room decoration systems.
5. Expand each region with new monsters, NPCs, side quests and bosses.
6. Replace the placeholder canonical URL and sitemap domain.
7. Connect real Adsterra scripts after ad domains and unit IDs are available.
8. Add Cloudflare Pages analytics or another privacy-reviewed analytics provider.

## Deployment

Use the root build command and deploy `dist/` to any static hosting platform. Recommended Cloudflare Pages settings:

- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root
