# Super Sean 007 — Legend of the Seven Gems
## Full Game Design: The Homestead Expansion

The vertical slice (village, meadow, cave, tower, one quest chain) grows into a complete
cozy JRPG with **gathering, crafting, base building, gardening**, a 5-hero party, 9 regions,
7 Gems, 8 bosses, side quests and an open-ended homestead endgame. Every visual uses the
real sliced 2D assets in `assets/` — no placeholders.

---

## 1. Pillars

1. **Adventure like a JRPG** — explore regions, talk, quest, fight turn-based battles, level up.
2. **Build like Minecraft** — harvest resources from the world, craft materials, claim a base,
   place tiles piece-by-piece or stamp blueprints (cottage, castle keep, gardens, orchards).
3. **Everything feeds everything** — monsters and nodes drop materials → crafting makes food,
   gear and build pieces → the homestead gives combat/economy perks → stronger party unlocks
   deeper regions → richer materials.

## 2. World & Regions (all real tilesets)

| Region | Tileset | Role | Gather nodes | Boss (Gem) |
|---|---|---|---|---|
| Birthday Village | birthday_village | Hub: NPCs, shop, quests | berry hedges | — |
| Homestead | birthday+all | **Claimable buildable base** | pond, soil | — |
| Mushroom Meadow | mushroom_meadow | First fields | trees, rocks, mushrooms, flowers | Moldor (Meadow Gem) |
| Crystal Cave | crystal_cave | Mining zone | crystal clusters, ore veins | Crystal Guardian (Cave Gem) |
| Petro Plains | petro_plains | Machine desert | gear blocks, scrap machines | Petro Titan (Plains Gem) |
| Ruushwood | ruushwood | Deep forest | pines, fallen logs | Elder Treeguard (Forest Gem) |
| Moon Shrine | moon_shrine | Mystic night zone | moon herbs, star pools | Lunar Shade (Moon Gem) |
| Ancient Ruins | ancient_ruins | Puzzle ruins | relic dials | Guardian Prime (Ruin Gem) |
| Bald Moon Tower | bald_moon_tower | Final dungeon | — | Xelar's Echo → **Xelar** (Seventh Gem) |

Unlock chain: Village → Meadow → *(Moldor)* → Homestead deed + Cave → *(Guardian)* → Petro
→ *(recruit Petroman, Titan)* → Ruushwood → *(recruit Ruush, Treeguard)* → Moon Shrine
→ *(recruit Haraku, Shade)* → Ancient Ruins → *(Prime)* → Tower → Xelar.

## 3. Gathering (Minecraft loop, step 1)

Resource **nodes** are placed on maps as real tiles (tree, rock, mushroom, crystal, ore vein,
gear block, moon herb, relic dial…). Walk up, press **E** repeatedly — each hit plays SFX and
a floating counter; after 2–4 hits the node yields materials and depletes, respawning after
45–120 s (timers persist in the save).

Materials: **Wood, Stone, Berry, Mushroom Cap, Flower, Crystal Shard, Ore Chunk, Gear Part,
Moon Herb, Ancient Relic** (+ Plank / Stone Brick as refined mats). Monsters also drop
region materials.

## 4. Crafting (step 2)

Craft menu (**C**) anywhere for basics; **stations built at the homestead unlock tiers**:

- Anywhere: Plank, Stone Brick, seeds, Berry Juice, Crystal Candy.
- **Workbench**: build-piece bundles, Gadget Charm, upgrades.
- **Kitchen**: Mushroom Stew, Moon Tea, Courage Crumble (best heals/buffs).
- **Forge**: equipment — Crystal Sword +1, Gear Blade, Guardian Plate, Moon Charm, Relic Crown.

Equipment slots (weapon / armor / charm) equipped from the inventory; bonuses stack onto
hero stats.

## 5. Homestead: claim a base & build (step 3)

- South of the village lies the **Homestead** map (36×24). The quest *"A Place To Call Home"*
  grants the deed; interacting with the **Homestead Crystal** claims the land.
- **Build mode (B)**: grid cursor, ghost preview, category palette (Floors, Walls & Roofs,
  Fences, Garden, Water, Decor, Stations) — ~40 pieces, each a real tile with a material
  cost. Place with Enter/click, remove with X/right-click (full refund). Mouse, keyboard
  and touch all work.
- **Blueprints (V)**: stamp whole prefabs if you can afford them — **Cozy Cottage, Stone
  Keep (castle), Garden Patch, Orchard, Star Shrine** — walls, roofs, doors and floors
  auto-arranged from village/tower/moon tiles.
- **Claim expansion**: upgrade the Homestead Crystal with materials to grow the buildable
  area (14×10 → 22×14 → 30×18 → full map).
- **Comfort & perks**: every piece adds Comfort. Thresholds grant: +10 % XP (25), shop
  discount (60), +2 ATK/+2 DEF aura (100), daily gift chest at the crystal (150).
- **Bed** piece → rest for full HP/MP. **Storage/stations** are placeable pieces.

## 6. Gardening

Place **Tilled Soil**, interact to plant a seed (Berry / Flower / Moonfruit). Crops grow in
real time through 3 visible stages (works while away) and harvest into cooking/potion
ingredients plus a chance of extra seeds. Gardens also score Comfort — a pretty base is a
strong base.

## 7. Party & Battles

Recruitable friends, each with a battle skill (cooldown-based) next to Sean's Attack /
Crystal Slash / Friendship Burst / Item / Guard:

- **Dave** (start): *Gadget Zap* — damage + 1-turn stun.
- **Petroman** (Petro Plains): *Iron Guard* — halves damage for 2 turns.
- **Ruush** (Ruushwood): *Twin Arrows* — two quick hits.
- **Haraku** (Moon Shrine): *Moon Blessing* — heal 35 % of max HP.

Enemies: 4 base sprites × region **tier variants** (hue-shifted, renamed, scaled stats) ⇒
~20 monster types + 8 unique bosses. Bosses drop Gems and unlock regions.

## 8. Quests

- **Main arc**: 13 chapters from *The Birthday Crystal* to *Xelar the Bald Wizard*, including
  building chapters (claim the deed, build a cottage, brew Moon Tea for Haraku).
- **Side quests** from villagers (Berrybun's mushroom soup, Dave's spare parts, Bobo's berry
  run, garden and castle challenges) with coin/recipe/gear rewards, tracked in the quest log.
- **Gem tracker**: quest log shows collected Gems (7 to win).

## 9. Economy

Bobo's **shop** (buy seeds, potions, raw materials; sell any material) plus coin drops from
battle and chests. Homestead comfort gives a shop discount tier.

## 10. Controls

Move WASD/arrows/D-pad · **E** interact & harvest · **C** craft · **B** build ·
**V** blueprints (in build) · **I** bag & equipment · **Q** quests · **M** map · **P** save ·
battle 1–6 keys or tap. Mobile gets dedicated Craft/Build buttons.

## 11. Technical

- Plain canvas JS, no framework. `game.js` = core loop/state/input; `js/data-*.js` = pure
  data (items, build pieces, quests, maps); `js/systems.js` = gather/craft/build/garden;
  `js/battle.js`; `js/render.js`. Loaded in order via deferred script tags.
- Save v2 in localStorage with migration from v1 saves.
- QA hooks preserved: `window.render_game_to_text()`, `window.advanceTime(ms)`,
  `window.SuperSeanGame` API (+ `craft`, `build` menu ids for touch buttons).
- All sprites resolved through `data/sliced-assets.json` frame metadata; tile indices are
  documented per tileset in `js/data-build.js`.
