Original prompt: build this

## 2026-07-09

- Inspected the uploaded Super Sean 007 static HTML5 project.
- Found the game and landing page already exist under `super_sean_007_full_project_wired/`, but the workspace root had no `package.json`, build scripts, or progress log.
- User added a requirement to generate and wire music/SFX and cleanly slice/integrate graphics.
- Current plan: keep the existing static architecture, add npm/Vite build scripts, generate audio assets, generate sliced game-critical graphics, wire audio/sliced metadata into the game, add Cloudflare/docs, then validate with build and browser checks.
- Added root npm scripts, Vite config, static build copy, validation, audio generation, graphics slicing scripts, Cloudflare headers/redirects, README, Adsterra docs and deployment docs.
- Installed npm dependencies successfully with no vulnerabilities reported.
- Generated 12 WAV audio cues under `assets/audio/` and 363 sliced graphics frames under `assets/sliced/`.
- `npm run build` completed successfully; validation passed for JSON, generated audio, sliced graphics, dist output and manifest paths.
- Fixed production static copy for `game.js` and `asset-library.js`, added root favicon fallback, fixed canvas `roundRect` path accumulation, tightened title overlay text, clamped canvas labels, and added scroll offset polish.
- Browser verification: clean direct key-flow probe with no failed requests; start, quest, inventory, audio toggles, save, generated audio and 363 sliced frames verified. Final web-game screenshot/error pass produced no error file.

## 2026-07-10 — Homestead Expansion (full game)

- Designed the complete game beyond the vertical slice: `super_sean_007_full_project_wired/docs/GAME_DESIGN.md`.
- Mapped every tile index of all 8 sliced tilesets via labeled contact sheets so building/gathering uses real art, no placeholders.
- New modular game code in `js/` (loaded before `game.js`): `data-items.js` (28 items, 19 recipes, crops, shop), `data-build.js` (41 build pieces, 5 blueprints, claim levels, comfort perks), `data-quests.js` (15 main chapters, 5 side quests, 7 Gems), `data-maps.js` (9 regions + buildable Sunrise Homestead, resource nodes, tier-variant monsters, 8 bosses), `systems.js` (gathering/crafting/building/gardening/shop/quest engine), `battle.js` (party skills: Gadget Zap, Iron Guard, Twin Arrows, Moon Blessing), `render.js` (all scenes incl. build mode UI).
- `game.js` rewritten as the core: managers, save v2 with migration from v1, input (keys, mouse, right-click remove, touch), floating-text VFX, QA hooks (`render_game_to_text`, `advanceTime`, `SuperSeanGame.debug`).
- Audio upgraded: richer synth (bass, hats, detuned pads) + 4 new music tracks (forest, cave, moon, boss) and 4 new SFX (chop, build, plant, coin) — 20 generated files.
- Homepage made consumer-facing and immersive: removed dev/pipeline/asset-library/SEO sections, new hero with floating sprites and pulse CTA, Homestead feature section, "Scenes of Asteria-007" gallery, rewritten FAQ/quests/mechanics, Craft/Build touch buttons; all ad placements preserved.
- Build scripts updated (`js/` copied to dist, validation checks new files); `npm run build` + validation pass.
- Browser-verified end-to-end: quest chain (elder→dave→slimes), harvesting, battle with party skill, homestead claim, piece placement, Cozy Cottage blueprint stamp (advanced quest + unlocked cave), planting crops, crafting planks, buying at Bobo's shop. No console errors.
- Fixed during verification: side quests no longer hijack main-quest talk triggers.

## 2026-07-10 — Persistence suite + depth features (commit 9e3a1fd)

- Persistence: 20s autosave, save on tab hide/close, playtime tracking, title-screen
  progress summary, base64 save codes, opt-in cloud sync (Pages Function `/api/save`
  + KV `SSG_SAVES`, personal sync ID, cross-device restore). API verified live:
  PUT/GET roundtrip 200, 404 on missing, 400 on invalid IDs.
- Combat depth: mushroom poison spores, bat screech weaken, crystal harden,
  Xelar-kind bosses rally at 50% HP, boss-battle music, NG+ scaling (+25%/cycle).
- Homestead life: pond fishing minigame (Sunfish, Grilled Fish recipe), comfort-based
  NPC visitors at the homestead (Mila 60, Pip 100).
- Content cadence: daily quest board (date-seeded), Bobo sells Treasure Maps with dig
  spots in every region, Gemkin Avatar superboss gated on 7 gems (drops Gemkin Crown),
  New Game+ via G at the Homestead Crystal (postgame).
- Meta: 16 achievements with toasts + quest-log panel, stats counters, screenshot
  export (T / Photo button). Fixed dig-vs-node interact priority during verification.
- All verified in preview via QA hooks; build + validation pass; deployed with
  Functions bundle via `npx wrangler pages deploy`.

## 2026-07-10 — Real art, bigger game area, Party Link co-op (commit e01a7a3)

- Real pack art: painted logo, hero-lineup og-image, Sean-face icons, parchment world
  map cropped from actual key-art/map sheets (scripts/generate-brand-assets.mjs);
  served as WebP (logo 46KB, map 139KB). Placeholders removed.
- Bigger game area: wider container, sticky sidebar ads, Theater + Fullscreen via a
  game frame bar; mobile full-bleed canvas; tighter section rhythm for ad viewability.
- Input fix: arrows/space no longer scroll the page while the canvas is on screen
  (viewport-guarded so normal page scroll still works elsewhere). Verified logic.
- Party Link multiplayer: WebRTC data-channel co-op (js/coop.js + functions/api/party.js
  + KV signaling). Host runs world; up to 3 friends join via 6-letter code as
  Dave/Petroman/Ruush/Haraku. Verified via fake-channel loopback: guest movement (93px),
  harvest (+2 berries), and Gadget Zap relayed into host battle (23 dmg + stun). Party
  signaling API verified on pages.dev: offer→answer roundtrip all 200.
- KNOWN INFRA ITEM: www 301-redirects to apex supersean007.com, but canonical/sitemap/
  og:url point to www. Harmless for players (same-origin relative fetches on apex) but
  SEO-inconsistent — reconcile the redirect direction or the canonical tags.

## 2026-07-11 — Gap-analysis batch (commit af95f9c, deployed)

Built from the critical gap analysis (everything except SEO/GAIO, already done):
- **Analytics**: first-party cookieless counters — `functions/api/stat.js` + KV,
  `consent.js` beacon client, `ctx.stat()` events (pageview/game_start/battle_win/
  boss_win/gem/blueprint/homestead_claim/ngplus/party_*/install/share). Verified live.
- **Consent**: `consent.js` gates all Adsterra scripts until Accept; Decline = no
  third-party cookies. `ads.js` now injected dynamically post-consent.
- **Real ads**: interstitial overlay (300x250 unit + countdown Continue) fires on
  boss victory / village return, and the rewarded flow (revive, daily chest) shows
  it then grants. Was a no-op placeholder. Verified overlay+reward in preview.
- **Cloud-save conflict**: `save.js` rejects PUT older than stored (409), `?force=1`
  overrides; client warns. Verified 200→409→force on production.
- **PWA**: `sw.js` runtime caching (offline/installable), install prompt, manifest.
- **Co-op robustness**: TURN hook `window.SSG_TURN`, host code-claim (`action=host`
  409 on collision — verified), guest auto-reconnect, stale-host indicator, share code.
- **Polish**: settings overlay (volume sliders/cloud/install/screenshot/share/ad
  choices) via `ui-overlays.js`, first-run onboarding, canvas loader, dialogue now
  shows character portraits. Moved ad reward chest off the quest-board tile (both
  were within one interact radius so the chest was unreachable).

### Open item for the user (needs dashboard, my token is 403 on rulesets)
- **Redirect still www→apex** (the reverse of intended). Flip in Cloudflare dashboard:
  the zone's Redirect Rules → edit the www rule to target apex→www, OR set www as the
  Pages primary domain. Canonical/sitemap/og:url already say www, so once flipped
  everything is consistent. A repo `_redirects` entry would loop against the edge rule.
- **Multiplayer across mobile carriers** needs a TURN server (STUN-only today). Set
  `window.SSG_TURN=[{urls,username,credential}]` once you have one (e.g. Cloudflare
  Calls / Metered / Twilio).
- **Community card** links to a placeholder `discord.gg/` — drop in the real invite.

## 2026-07-11 — Gap-analysis batch (commit ba49547, deployed)

Built and shipped the full gap-analysis follow-up:
- **Distinct sprites**: sliced 16 real sprites (4 bosses, 4 monsters, 8 NPCs) from the
  generated pack sheets (`scripts/slice-mobs.mjs`, flood-fill bg removal + largest-component
  isolation); wired into overworld/battle/co-op, replacing hue-shifted reskins. Fixed a
  pipeline bug where `slice:assets` wiped the mobs dir (now `slice:mobs` runs after it in
  dev + build).
- **KV write-quota fix**: analytics rewritten to one KV blob + client batching (was
  2 writes/event). Verified in prod: 3 events → 1 write (`counted:3`).
- **Error monitoring**: `functions/api/err.js` + throttled window.onerror; `/stats` dashboard.
- **Automated tests + CI**: extracted `js/save-core.js`, added `node --test` suite (15 tests:
  data integrity + save migration), GitHub Actions `ci.yml`.
- **Legal**: real `privacy.html` + `terms.html`, linked in footer + consent banner.
- **iOS/mobile**: CSS-maximize fullscreen fallback; lazy-load the 2.8MB title art off boot.
- All verified in preview (no console errors, sprites render — 9294 green px confirms the
  moss-troll boss draws) + production API checks pass. 15/15 tests green, build+validate pass.

## Open items for the user
- Flip the www→apex redirect (dashboard only; my token is 403 on rulesets).
- Add a real Discord/community URL (placeholder in the community card).
- Provision a TURN server (`window.SSG_TURN`) for co-op across mobile carrier NAT.
- KV analytics blob is still non-atomic (approximate under heavy concurrency) — fine for now.

## Remaining manual notes

- Production domain is `https://www.supersean007.com/`; canonical metadata, sitemap, robots, llms.txt and ai-summary.json now use it.
- Production Adsterra units (Social Bar, Native Banner, 728x90/468x60/320x50/300x250/160x600/160x300) are live via `ads.js`; `_headers` CSP allows the network's rotating HTTPS domains.
- Footer credits © 2026 Fire Dragon Interactive (www.firedragoninteractive.com).

## 2026-07-11 (cont.) — Landmark buildings + tile/object audit
- Answered "are tiles/objects sliced & wired": terrain tiles are drawn by INDEX
  from the 8 regional tilesets (correct tilemap approach, no per-tile files);
  game objects (nodes, build pieces, item icons) reference tileset indices.
  Only characters (bosses/monsters/NPCs) previously got rich distinct art.
- Added scripts/slice-objects.mjs: sliced 23 detailed buildings from
  ui_vfx/gedetailleerde_rpg_bouwwerken_en_iconen.png (flood-fill bg removal +
  largest-component + trim) -> assets/sliced/objects/ + data/object-manifest.json.
- New "Landmarks" build category (SSG.LANDMARKS pushed into BUILD_PIECES):
  place buildings as bottom-anchored billboard decor with high comfort.
  render.js: drawBillboard helper, y-sorted overlay, scrolling/windowed palette
  (8 categories now), billboard thumbnails + ghost. Preloaded via object-manifest.
- slice:objects added to dev + generate:assets; validate + tests cover objects;
  fixed data test to allow billboard pieces (16/16 pass). Deployed; assets 200 on prod.
- NOTE: item/material icons still use tileset indices (rich icon sheets exist,
  e.g. kleurrijke_rpg_ui_elementensheet.png — a future upgrade like the buildings).

## 2026-07-11 (cont.) — Max asset extraction (commit ec64af8, deployed)
- 19 more distinct enemies sliced from cave/swamp, forest, undead, flying-fae,
  and Xelar-soldier sheets → mob-manifest now 35 sprites. All 18 previously
  hue-shifted region monsters now have unique art (cave lizard, bog toad,
  thorn boar, owlbear, fox spirit, skeleton pup, ghost wisp, cursed doll,
  bone beetle, batling, griffin, skull knight, goblin brute, lizard guard, ...).
- 3 ambient villagers (Farmer Gil/Baker Tom/Timmy) using spare townsfolk sprites,
  with NPC_LINES dialogue.
- 12 decorative billboard props (trees, crystals, statue, campfire, lamp, flowerpot,
  market stall, bush, rocks, signpost) → Decor build category (bsize-scaled).
- New test: every monster/NPC sprite ref must exist in mob-manifest (17 tests pass).
- REMAINING (documented, not done): item/material ICONS still use tileset indices —
  the UI icon sheet (kleurrijke_rpg_ui_elementensheet.png) has clean icon rows but
  they're tiny/dense (risky crops); left as a future upgrade.
