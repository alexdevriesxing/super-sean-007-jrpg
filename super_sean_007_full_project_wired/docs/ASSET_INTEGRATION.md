# Super Sean 007 Full Project Asset Integration

This project has been rebuilt from the original HTML5 JRPG website/game foundation and expanded with the generated production asset library.

## What is wired in

- **Game canvas**
  - Uses the new key art on the title screen.
  - Uses the new JRPG battle scenery backgrounds during turn-based battles.
  - Uses `data/asset-wiring.json` through the runtime `AssetManager` for title art and battle background routing.
  - Uses `data/sliced-assets.json` for character frame and tileset crop metadata.
  - Keeps the original playable vertical slice: movement, NPC interaction, quests, chests, save/load, battle loop, XP, items and Adsterra placeholder hooks.

- **Website**
  - Adds a full visual asset browser section.
  - Loads `data/asset-manifest.json` and displays the asset library by category.
  - Reports generated audio cue and sliced frame counts when `data/audio-manifest.json` and `data/sliced-assets.json` are present.
  - Keeps SEO/GAIO foundations: schema, FAQ, llms.txt, ai-summary.json, sitemap, robots and semantic content sections.

- **Asset library**
  - Includes the original game assets.
  - Includes all generated spritesheets, tilesets, UI/HUD sheets, key art, loading/event screens, VFX, world maps, interiors, battle backgrounds and the split ultimate asset pack.
  - Preserves every source sheet while generating derivative slices under `assets/sliced/`.

- **Audio library**
  - `npm run generate:audio` creates original procedural WAV music and SFX under `assets/audio/`.
  - `data/audio-manifest.json` maps title, village, battle and victory music plus UI/battle/reward SFX.

## Asset counts by category

- battle_backgrounds: 14
- key_art: 1
- loading_event_screens: 4
- raw: 7
- split_pack: 30
- spritesheets: 18
- tilesets: 13
- ui_vfx: 13

## Key paths

- Playable game: `index.html` + `game.js`
- Main generated asset library: `assets/generated/`
- Generated audio: `assets/audio/`
- Generated slices: `assets/sliced/`
- Asset manifest: `data/asset-manifest.json`
- Split ultimate asset pack: `assets/generated/split_pack/`
- Audio manifest: `data/audio-manifest.json`
- Sliced graphics manifest: `data/sliced-assets.json`
- Main key art: `assets/key-art-main.png`
- Original GDD: `docs/Super_Sean_007_GDD.md`
- Expanded GDD: `docs/Super_Sean_007_Legend_of_the_Seven_Gems_GDD.md`

## Slicing workflow

Run:

```bash
npm run slice:assets
```

The slicer currently creates:

- 88x88 character frames from Sean, Dave, Petroman, Haraku and Ruush strips.
- 64x64 tiles from each current region tileset.
- Single enemy portrait/sprite slices.
- HUD, pickup and VFX slices from the generated split pack.

The canvas renderer still draws from the original source sheets for efficient batching, but it reads the generated metadata so frame and tile coordinates stay consistent with the slice output. Future animation systems can load the individual `assets/sliced/` PNGs directly.

## Audio workflow

Run:

```bash
npm run generate:audio
```

The audio generator writes mono 44.1kHz WAV files. Browsers require a user gesture before playback, so the game unlocks music/SFX on the first click, key press or touch event.

## AI expansion notes

The current game remains a browser-playable foundation rather than a fully finished 80+ quest JRPG. It is now asset-complete enough for AI coding tools to continue production by:

1. Slicing individual frames from the generated sheets.
2. Replacing placeholder/simple sprites with the sheet-specific animation frames.
3. Adding map definitions for the expanded tilesets.
4. Adding battle backgrounds per region and enemy type.
5. Expanding quests, NPCs, enemies, bosses and items in data-driven JSON.
6. Connecting Adsterra scripts to the marked ad containers and `AdManager` hooks.

## Recommended next build tasks

1. Create a sprite atlas slicer script for all generated character/enemy sheets.
2. Add a background selector per map/biome using the included battle backgrounds.
3. Create separate Tiled-compatible maps from the tileset sheets.
4. Add an in-game gallery/bestiary using the `asset-manifest.json`.
5. Replace all placeholder UI with the generated UI/HUD elements.
