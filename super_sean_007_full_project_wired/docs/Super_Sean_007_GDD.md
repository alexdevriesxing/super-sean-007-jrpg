# Super Sean 007: Legend of the Seven Gems
## Full Game Design Document for an Expandable HTML5 2D JRPG

**Version:** 1.0  
**Format:** Browser-based HTML5 2D JRPG  
**Recommended Engine:** Phaser 3 or Phaser 4-ready architecture  
**Target Platforms:** Desktop browser, tablet browser, mobile browser  
**Monetization:** Free-to-play with Adsterra-supported ad placements  
**Primary Design Goal:** Build a modular, expandable JRPG universe starring Super Sean and friends, designed for continuous content updates, browser-friendly sessions, cozy exploration, character progression, quests, collectibles and story-driven adventure.

---

# 1. High Concept

**Super Sean 007: Legend of the Seven Gems** is a colorful, cozy, expandable 2D browser JRPG where players guide Super Sean and his friends Dave, Petroman, Haraku and Ruush through villages, forests, caves, ruins, kingdoms and magical worlds to stop the arch enemy **Xelar the Bald Wizard**.

The game combines classic JRPG mechanics with modern browser-friendly design: short sessions, auto-save, fast battles, collectible treasures, daily quests, cozy village activities and optional ad-supported rewards.

The game is built as a living platform. Version 1 launches with a complete story arc, but the systems must be modular enough to support new regions, worlds, enemies, items, quests, events, characters and story chapters without rebuilding the core engine.

---

# 2. Core Pillars

## 2.1 Adventure First
Every session should give the player a feeling of movement and discovery. The player should always have a visible next quest, a new area to reach, a treasure to find or a character to help.

## 2.2 Cozy Between the Battles
The world should not be only combat. Villages, inns, gardens, cooking, fishing, room decoration, friendly NPCs, pets and character moments give the game warmth and retention.

## 2.3 Friendship as Power
The party is not just a set of stats. Sean’s bond with Dave, Petroman, Haraku and Ruush unlocks combo attacks, story scenes, loyalty quests and special abilities.

## 2.4 Browser-Friendly Depth
The game should feel like a real JRPG, but sessions must work in 5 to 20 minutes. Battles should be quick, UI should be simple and progression should be clear.

## 2.5 Expandable Forever
All content must be data-driven. Quests, enemies, dialogue, items, skills, maps and NPCs should be stored in JSON or similar structured files so AI coding tools can add content safely.

## 2.6 Fair Ad Monetization
Ads should support the free game but never ruin immersion. Reward ads should be optional. Interstitials should appear only at natural breaks.

---

# 3. Target Audience

## Primary Audience
Players who enjoy cozy fantasy, light RPG progression, browser games, collectible items and colorful character-driven adventures.

## Secondary Audience
Younger players, casual RPG fans, fans of Super Sean, and players who enjoy short-session games with daily rewards.

## Session Profile
- Quick check-in: 3 to 5 minutes
- Normal quest session: 10 to 20 minutes
- Dungeon session: 20 to 35 minutes
- Event session: 5 to 15 minutes

---

# 4. Platform and Technical Requirements

## 4.1 Platform
The game must run in modern browsers:
- Chrome
- Edge
- Firefox
- Safari
- Android Chrome
- iOS Safari

## 4.2 Input
The game should support:
- Keyboard
- Mouse
- Touch controls
- Optional gamepad later

## 4.3 Screen Support
Supported layouts:
- 16:9 desktop landscape
- Tablet landscape
- Mobile landscape
- Mobile portrait with adapted UI if feasible

Minimum viable layout should prioritize landscape gameplay but include a clear rotate-device message for smaller portrait screens if needed.

## 4.4 Save System
Use IndexedDB or localStorage for version 1. IndexedDB is preferred for expansion.

Save data should include:
- player profile
- story progress
- quest states
- inventory
- character levels and XP
- equipped items
- unlocked areas
- village upgrades
- collected treasures
- settings
- daily reward timestamps
- ad reward cooldowns

Future account/cloud saves can be added later.

---

# 5. Recommended Tech Stack

## 5.1 Engine
Use Phaser 3 today with Phaser 4-style modular architecture if Phaser 4 stability or tooling is uncertain.

## 5.2 Language
TypeScript is recommended.

## 5.3 Project Structure

```text
/src
  /core
    GameConfig.ts
    GameState.ts
    SaveManager.ts
    SceneManager.ts
    AudioManager.ts
    InputManager.ts
    AdManager.ts
    ResponsiveManager.ts
    EventBus.ts

  /data
    characters.json
    enemies.json
    items.json
    skills.json
    quests.json
    dialogue.json
    maps.json
    npcs.json
    lootTables.json
    craftingRecipes.json
    shops.json
    worldRegions.json
    adPlacements.json

  /scenes
    BootScene.ts
    PreloadScene.ts
    TitleScene.ts
    MainMenuScene.ts
    VillageScene.ts
    WorldMapScene.ts
    ExplorationScene.ts
    BattleScene.ts
    DialogueScene.ts
    InventoryScene.ts
    SkillTreeScene.ts
    ShopScene.ts
    InnScene.ts
    CraftingScene.ts
    QuestLogScene.ts
    GameOverScene.ts
    SettingsScene.ts

  /systems
    BattleSystem.ts
    TurnManager.ts
    DamageFormula.ts
    SkillSystem.ts
    QuestSystem.ts
    DialogueSystem.ts
    InventorySystem.ts
    EquipmentSystem.ts
    LootSystem.ts
    LevelSystem.ts
    CraftingSystem.ts
    ShopSystem.ts
    NPCSystem.ts
    MapSystem.ts
    EncounterSystem.ts
    CozySystem.ts
    RoomDecorationSystem.ts
    DailyRewardSystem.ts
    AdRewardSystem.ts

  /ui
    Hud.ts
    DialogueBox.ts
    BattleMenu.ts
    InventoryPanel.ts
    QuestTracker.ts
    SkillTreePanel.ts
    MobileControls.ts
    Toast.ts
    Modal.ts

  /assets
    /characters
    /enemies
    /maps
    /tilesets
    /ui
    /icons
    /items
    /portraits
    /music
    /sfx
```

---

# 6. Game Title and Branding

## Primary Title
**Super Sean 007: Legend of the Seven Gems**

## Short Title
**Super Sean 007**

## Tagline Options
- “A cozy browser JRPG full of friendship, treasures and magical worlds.”
- “Quest, level up, collect treasures and stop Xelar the Bald Wizard.”
- “An expandable 2D JRPG adventure starring Super Sean and friends.”

## Visual Identity
The attached Super Sean header should define the visual tone:
- colorful cartoon fantasy
- expressive characters
- bright magical crystals
- cozy forests and villages
- readable UI
- heroic but child-friendly
- polished web-game presentation

---

# 7. Story Overview

On the morning of Sean’s seventh birthday celebration, Birthday Village is full of cakes, banners, friends and music. Sean receives a mysterious crystal sword from the village elder. Nobody knows where it came from, but the sword glows when Sean touches it.

The celebration is interrupted by **Xelar the Bald Wizard**, a powerful and vain sorcerer who hates joy, friendship and birthday parties. Xelar steals the first of the Seven Gems, curses the village crystal and kidnaps Haraku because Haraku knows the location of the Moon Shrine.

Sean, Dave, Petroman and Ruush set off to restore the Gems, rescue Haraku and stop Xelar before he drains the color and magic from every world.

As the story unfolds, Sean learns that the Seven Gems are not just magical stones. They are ancient memory cores created by the first guardians of the world. Each Gem holds one virtue:
1. Courage
2. Friendship
3. Wonder
4. Wisdom
5. Laughter
6. Hope
7. Balance

Xelar wants to corrupt them and power his Bald Moon Tower, a giant magical engine designed to turn the world grey and crown him Eternal Bald Wizard King.

---

# 8. Tone and Writing Style

The tone should be:
- adventurous
- funny
- heartfelt
- cozy
- lightly heroic
- never grimdark
- accessible for younger players
- still interesting enough for older players

Xelar should be comedic but dangerous. He can make ridiculous speeches about bald wizard superiority, but his actions have real consequences.

NPC writing should include:
- short dialogue by default
- optional deeper lore lines
- recurring jokes
- emotional mini-stories
- quest hints
- world-building

Example Xelar tone:
> “Behold, Sean! While you waste time on cake and friendship, I have mastered the ancient art of dramatic cape movement!”

Example cozy NPC tone:
> “The village feels warmer when the crystal glows. Bring back even one Gem fragment and I’ll bake you something special.”

---

# 9. Main Characters

## 9.1 Super Sean

**Role:** Main hero  
**Combat Role:** Balanced sword fighter, light magic, defensive clutch saves  
**Weapon:** Crystal Sword  
**Personality:** Brave, cheerful, impulsive, kind, loyal  
**Theme:** Courage

### Gameplay Identity
Sean is easy to use and remains central throughout the game. He can deal reliable damage, defend allies and use Gem powers.

### Base Stats
- HP: Medium
- MP: Medium
- Attack: Medium-high
- Defense: Medium
- Magic: Medium
- Speed: Medium
- Luck: Medium
- Friendship gain: High

### Skill Paths
**Hero Path**
- Sword attacks
- courage buffs
- basic offensive upgrades

**Crystal Path**
- magical light attacks
- Gem powers
- elemental unlocks

**Guardian Path**
- blocking
- counterattacks
- goalkeeper-style saves
- party protection

### Signature Skills
- Crystal Slash
- Hero Guard
- Birthday Blaze
- Goalkeeper Reflex
- Gem Pulse
- Seven Gem Burst

---

## 9.2 Dave

**Role:** Best friend and strategist  
**Combat Role:** Gadget user, traps, debuffs, utility  
**Weapon:** Slingshot, gadgets, bombs  
**Personality:** Clever, sarcastic, practical, loyal  
**Theme:** Ingenuity

### Gameplay Identity
Dave makes battles easier through debuffs and field tools. He is also used for exploration shortcuts and treasure discovery.

### Base Stats
- HP: Medium-low
- MP/Energy: Medium
- Attack: Medium
- Defense: Low-medium
- Magic: Low
- Speed: Medium-high
- Luck: High

### Skill Paths
**Gadget Path**
- bombs
- traps
- mechanical attacks

**Explorer Path**
- treasure detection
- map reveals
- hidden route discovery

**Trickster Path**
- blind
- slow
- confuse
- lower enemy defense

### Signature Skills
- Gadget Toss
- Boom Berry Bomb
- Treasure Radar
- Sneaky Net
- Shortcut Finder
- Slingshot Stun

---

## 9.3 Petroman

**Role:** Powerhouse friend  
**Combat Role:** Tank, fire damage, obstacle breaker  
**Weapon:** Fuel gauntlets, flame boots  
**Personality:** Loud, energetic, brave, slightly chaotic  
**Theme:** Strength

### Gameplay Identity
Petroman is tough and powerful. He can absorb hits, burn barriers and destroy cracked obstacles.

### Base Stats
- HP: High
- MP/Energy: Medium
- Attack: High
- Defense: High
- Magic: Low-medium
- Speed: Low-medium
- Luck: Medium

### Skill Paths
**Fire Path**
- burn attacks
- area damage
- flame combos

**Tank Path**
- taunts
- shields
- damage reduction

**Machine Path**
- mechanical enemy counters
- obstacle breaking
- explosive utility

### Signature Skills
- Petro Punch
- Flame Roll
- Fuel Shield
- Ground Burst
- Overheat Mode
- Fireline Crash

---

## 9.4 Haraku

**Role:** Mystic friend and emotional heart  
**Combat Role:** Healer, shields, spirit magic  
**Weapon:** Spirit staff, charm bells  
**Personality:** Wise, calm, gentle, mysterious  
**Theme:** Wisdom

### Gameplay Identity
Haraku is rescued mid-story and becomes essential for healing, curse removal and ancient language puzzles.

### Base Stats
- HP: Low-medium
- MP: High
- Attack: Low
- Defense: Medium-low
- Magic: High
- Speed: Medium
- Luck: Medium

### Skill Paths
**Healing Path**
- healing
- revival
- regeneration

**Spirit Path**
- shields
- protection
- cleansing

**Moon Path**
- moonlight damage
- curse breaking
- enemy magic reduction

### Signature Skills
- Gem Heal
- Moon Barrier
- Calm Spirit
- Revival Song
- Ancient Whisper
- Lunar Ray

---

## 9.5 Ruush

**Role:** Fast friend and treasure hunter  
**Combat Role:** Speed attacker, rogue, rare loot specialist  
**Weapon:** Twin blades, wind shoes  
**Personality:** Hyperactive, competitive, funny, fearless  
**Theme:** Freedom

### Gameplay Identity
Ruush hits fast, dodges often and can steal or reveal rare drops. In exploration, Ruush can dash across gaps and unlock time-trial routes.

### Base Stats
- HP: Medium-low
- MP/Energy: Medium
- Attack: Medium
- Defense: Low
- Magic: Low-medium
- Speed: Very high
- Luck: High

### Skill Paths
**Speed Path**
- multi-hit attacks
- initiative boosts
- turn acceleration

**Wind Path**
- dodge
- wind damage
- movement abilities

**Loot Path**
- steal
- rare drop boost
- treasure chest bonuses

### Signature Skills
- Rush Dash
- Wind Slice
- Double Strike
- Loot Swipe
- Cyclone Sprint
- Blur Step

---

# 10. Main Villain: Xelar the Bald Wizard

## Identity
Xelar is an ancient wizard who believes emotion, friendship and color are weaknesses. He has tried to conquer the world many times but was always defeated by the ancient Gem Guardians.

## Personality
- theatrical
- vain
- bitter
- intelligent
- funny
- insecure about being bald
- obsessed with proving himself

## Visual Design
- bald head with magical shine
- oversized robe
- crescent moon staff
- sharp eyebrows
- floating cape
- glowing spell rings
- grey/purple color palette
- expressive villain poses

## Motivation
Xelar wants to steal the Seven Gems and use their power to create the Bald Moon, a magical satellite that drains color, music and joy from the world.

## Gameplay Role
Xelar appears repeatedly:
- intro attack
- dialogue projections
- mid-boss taunts
- cursed mirrors
- dream sequences
- false reward traps
- final dungeon

## Boss Design
Final battle should have multiple phases.

### Phase 1: Xelar the Bald Wizard
Uses:
- moon bolts
- silence curse
- mirror clones
- bald shine flash
- staff slam

### Phase 2: Xelar, Gem-Drained Overlord
Uses corrupted Gem powers:
- Courage Break
- Friendship Drain
- Wonder Warp
- Wisdom Lock
- Laughter Silence
- Hope Eclipse
- Balance Collapse

### Final Mechanic
The player must use friendship combo attacks to weaken the corrupted Gem shield.

---

# 11. World and Region Design

The world should be structured as an expandable map with regions unlocked through story progression.

## 11.1 Hub: Birthday Village

### Purpose
Main safe hub, story base and cozy progression center.

### Areas
- Sean’s House
- Birthday Square
- Village Crystal
- Bakery
- Item Shop
- Blacksmith
- Cozy Inn
- Training Field
- Quest Notice Board
- Garden Patch
- Fishing Pond
- Room Decoration Area
- Gate to World Map

### Systems Available
- save/load
- rest
- shopping
- crafting
- cooking
- village repair
- NPC conversations
- daily quests
- ad reward chest
- party management
- skill management

### Progression
Birthday Village changes visually as Gems are restored:
- Stage 0: cursed and grey
- Stage 1: partial color returns
- Stage 2: shops reopen
- Stage 3: garden and fishing unlock
- Stage 4: village decorations unlock
- Stage 5: NPC side stories unlock
- Stage 6: festival returns
- Stage 7: full restoration

---

## 11.2 Region 1: Mushroom Meadow

### Theme
Gentle, cozy forest with giant mushrooms, soft grass and glowing fireflies.

### Purpose
Starter exploration region.

### Mechanics
- simple battles
- first treasure chests
- gathering ingredients
- tutorial puzzles
- hidden paths
- first side quests

### Enemies
- Slime Sprout
- Grumpy Mushroom
- Leaf Bat
- Thornling
- Sleepy Snail

### Boss
**Moldor the Mushroom Grump**

### Key Reward
- first Gem Fragment
- crafting unlock
- Mushroom Soup recipe

---

## 11.3 Region 2: Crystal Cave

### Theme
Glowing caves, reflective crystals, underground lakes.

### Mechanics
- crystal switch puzzles
- light beams
- echo doors
- mine cart shortcuts
- gem mimics

### Enemies
- Rock Imp
- Crystal Spider
- Echo Bat
- Gem Mimic
- Pebble Golem

### Boss
**Cracked Crystal Guardian**

### Key Reward
- Crystal Slash II
- Dave’s Treasure Radar
- access to deeper world map routes

---

## 11.4 Region 3: Petro Plains

### Theme
Warm plains, old machines, dusty paths, fire vents and repair workshops.

### Mechanics
- flame barrier puzzles
- cracked wall smashing
- pressure valve puzzles
- machine enemies

### Enemies
- Oil Blob
- Spark Rat
- Rust Goblin
- Flame Beetle
- Pipe Gremlin

### Boss
**General Sootbeard**

### Key Reward
- Petroman joins the party
- obstacle breaking ability
- Fire Biscuit recipe

---

## 11.5 Region 4: Ruushwood

### Theme
Fast forest with wind tunnels, jump routes and racing paths.

### Mechanics
- timed switches
- dash routes
- wind bridges
- speed challenges
- hidden chests

### Enemies
- Wind Wisp
- Sprint Wolf
- Sneak Vine
- Feather Rogue
- Gust Slime

### Boss
**The Wind Trickster**

### Key Reward
- Ruush joins the party
- dash ability
- time-trial side quests

---

## 11.6 Region 5: Haraku’s Moon Shrine

### Theme
Mystical temple, moonlit water, spirit lanterns, floating platforms.

### Mechanics
- spirit gates
- moon mirrors
- ancient language tablets
- curse zones
- memory rooms

### Enemies
- Moon Shade
- Silent Mask
- Curse Candle
- Mirror Spirit
- Shrine Warden

### Boss
**Xelar’s Shadow Clone**

### Key Reward
- Haraku joins the party
- curse removal
- healing skill tree unlock

---

## 11.7 Region 6: Ancient Ruins of 007

### Theme
Ancient guardian civilization connected to Sean’s destiny.

### Mechanics
- mural puzzles
- guardian trials
- teleporter rooms
- relic doors
- optional bosses
- lore archives

### Enemies
- Ancient Drone
- Relic Knight
- Rune Serpent
- Guardian Echo
- Time Slime

### Boss
**The Forgotten Guardian**

### Key Reward
- unlock Seven Gem lore
- Sean’s Guardian Path upgrade
- ancient teleport network

---

## 11.8 Region 7: Bald Moon Tower

### Theme
Xelar’s final fortress, grey magic, moon machines, corrupted Gem engines.

### Structure
Multiple floors:
1. Grey Village Illusion
2. Birthday Memory Maze
3. Cursed Crystal Engine
4. Wizard Library
5. Moon Observatory
6. Gem Reactor
7. Throne of Baldness

### Enemies
- Bald Moon Apprentice
- Grey Slime
- Curse Knight
- Mirror Mage
- Moon Engine Drone

### Bosses
- Sootbeard Rematch
- Mirror Xelar Trio
- Bald Moon Engine
- Xelar the Bald Wizard
- Xelar, Gem-Drained Overlord

### Key Reward
- launch story completed
- post-game portal unlocked
- expansion hooks unlocked

---

# 12. Core Gameplay Loop

## 12.1 Main Loop
1. Player starts in village or last saved location.
2. Player checks active quest.
3. Player talks to NPCs or enters world map.
4. Player explores region.
5. Player battles enemies.
6. Player collects loot.
7. Player completes quest objective.
8. Player returns to village.
9. Player upgrades, crafts, rests or decorates.
10. Player unlocks new quest/area.
11. Progress auto-saves.

## 12.2 Short Session Loop
1. Claim daily reward.
2. Complete one notice board quest.
3. Fight 2 to 4 battles.
4. Open one chest.
5. Return to village.
6. Optional ad reward.
7. Save.

## 12.3 Long Session Loop
1. Accept story quest.
2. Explore full dungeon.
3. Solve puzzles.
4. Defeat mid-boss.
5. Unlock shortcut.
6. Defeat main boss.
7. Watch story scene.
8. Return to village.
9. Major upgrades and story unlocks.

---

# 13. Exploration System

## 13.1 Movement
Exploration is top-down or 2.5D-style 2D, depending on asset pipeline. Top-down is recommended for JRPG clarity.

Player movement:
- walk
- run
- interact
- inspect
- open chest
- talk
- gather
- use field ability

## 13.2 Field Abilities
Each party member unlocks exploration abilities.

Sean:
- activate Gem shrines
- cut crystal vines
- block magical projectiles in puzzle rooms

Dave:
- detect hidden chests
- unlock gadget doors
- repair small machines

Petroman:
- smash cracked rocks
- burn thorn barriers
- push heavy objects

Haraku:
- read ancient text
- cleanse cursed zones
- reveal spirit bridges

Ruush:
- dash across gaps
- trigger speed switches
- reach high-speed routes

## 13.3 Map Design Rules
Each region should include:
- clear main path
- optional side paths
- locked paths for later abilities
- visible treasure teasers
- safe rest points
- 1 to 3 NPCs or story objects
- 1 mini puzzle type
- 1 region-specific collectible

---

# 14. Battle System

## 14.1 Battle Type
Turn-based JRPG combat with fast animation and clear UI.

## 14.2 Party Size
Launch:
- 3 active party members
- reserve members can be swapped in battle after unlock

Future:
- 4 active party members for advanced content

## 14.3 Battle Commands
- Attack
- Skill
- Item
- Guard
- Swap
- Flee

## 14.4 Turn Order
Turn order is based on Speed.

Formula:
```text
TurnPriority = CharacterSpeed + Random(0 to 10) + BuffModifiers - DebuffModifiers
```

## 14.5 Damage Formula
Simple launch formula:
```text
BaseDamage = (AttackerAttack * SkillPower) - (DefenderDefense * 0.6)
FinalDamage = max(1, BaseDamage * ElementModifier * CriticalModifier * Random(0.9 to 1.1))
```

Magic formula:
```text
BaseMagicDamage = (AttackerMagic * SkillPower) - (DefenderMagicDefense * 0.5)
```

Healing formula:
```text
Healing = CasterMagic * SkillPower + FlatBonus
```

## 14.6 Elements
Initial elements:
- Neutral
- Crystal
- Fire
- Wind
- Moon
- Shadow
- Nature

Element relationships:
- Fire strong against Nature
- Nature strong against Crystal creatures
- Crystal strong against Shadow
- Moon strong against Curse/Shadow
- Wind strong against flying enemies
- Shadow resists Neutral but weak to Crystal and Moon

## 14.7 Status Effects
- Burn: damage over time
- Slow: reduced speed
- Stun: skip next action
- Sleep: inactive until hit or duration ends
- Confuse: may target random unit
- Curse: reduced healing received
- Shield: absorbs damage
- Regen: heals each turn
- Taunt: enemies target user more often
- Lucky: increased critical and drops

## 14.8 Friendship Meter
Friendship is a shared party meter.

It increases when:
- allies guard each other
- healing an ally
- defeating enemies
- taking damage
- using bond skills
- completing loyalty quests

Friendship unlocks combo attacks.

Friendship tiers:
- Tier 1: small combo
- Tier 2: medium combo
- Tier 3: ultimate combo

## 14.9 Combo Attacks
Examples:
- Sean + Dave: Crystal Gadget Cannon
- Sean + Petroman: Flaming Crystal Punch
- Sean + Haraku: Heroic Healing Light
- Sean + Ruush: Lightning Rush Slash
- Dave + Ruush: Trap Dash Ambush
- Petroman + Haraku: Sacred Flame Barrier
- Full Party: Seven Gem Friendship Burst

## 14.10 Battle Rewards
Rewards include:
- XP
- coins
- materials
- rare drops
- quest drops
- friendship points
- bestiary entries

---

# 15. Character Progression

## 15.1 Levels
Characters level from 1 to 50 in launch version. Future expansions can raise cap.

XP sources:
- battles
- quests
- boss fights
- daily quests
- exploration discoveries
- loyalty quest completion

## 15.2 Skill Points
Every level grants 1 skill point. Major levels grant 2.

Skill point rewards:
- level up
- boss defeats
- loyalty quests
- hidden training scrolls

## 15.3 Skill Trees
Each character has 3 skill trees. Each tree contains:
- active skills
- passive stat boosts
- upgrades
- final mastery node

## 15.4 Equipment Progression
Equipment should provide meaningful choices:
- higher attack
- higher defense
- elemental resistance
- status protection
- speed boost
- rare drop bonus
- skill cost reduction

## 15.5 Friendship Bonds
Each friend has a bond level with Sean from 1 to 10.

Bond levels unlock:
- dialogue scenes
- combo skills
- passive battle bonuses
- room decorations
- loyalty quests
- ultimate skills

---

# 16. Item Design

## 16.1 Currency
Main currency:
- Coins

Special currencies:
- Ancient 007 Coins
- Friendship Medals
- Gem Shards
- Event Tokens

## 16.2 Consumables
- Berry Juice: restores small HP
- Big Berry Juice: restores medium HP
- Birthday Cake Slice: restores HP and MP
- Mushroom Soup: party healing outside combat
- Crystal Candy: restores MP
- Moon Tea: removes curse
- Fire Biscuit: adds fire resistance
- Wind Muffin: increases speed temporarily
- Revival Cookie: revives fallen ally

## 16.3 Materials
- Slime Gel
- Mushroom Cap
- Crystal Dust
- Ancient Screws
- Flame Seeds
- Moon Petals
- Wind Feathers
- Rust Plates
- Spirit Thread
- Star Pebbles

## 16.4 Equipment Categories
- Sword
- Slingshot/Gadget
- Gauntlet
- Staff
- Twin Blades
- Shield
- Hat
- Boots
- Charm
- Ring
- Cloak

## 16.5 Treasure Items
Treasure items are collectibles and sometimes room decorations:
- Xelar Diary Page
- Ancient 007 Coin
- Gem Fragment
- Plush Mushroom
- Moon Lantern
- Tiny Crystal Statue
- Broken Wizard Hat
- Birthday Banner
- Guardian Relic

---

# 17. Loot and Economy

## 17.1 Loot Tables
Each enemy should have:
- common drop
- uncommon drop
- rare drop
- quest drop if relevant
- coin range
- XP value

Example:
```json
{
  "enemyId": "grumpy_mushroom",
  "xp": 12,
  "coins": [3, 7],
  "drops": [
    {"itemId": "mushroom_cap", "chance": 0.45},
    {"itemId": "soft_spore", "chance": 0.18},
    {"itemId": "plush_mushroom", "chance": 0.03}
  ]
}
```

## 17.2 Shop Economy
Shops should rotate some items daily to encourage return visits.

Shop types:
- item shop
- blacksmith
- bakery
- traveling merchant
- event vendor
- decoration shop

## 17.3 Crafting Economy
Crafting should use gathered materials, monster drops and coins.

Crafting categories:
- weapons
- armor
- consumables
- decorations
- quest items

---

# 18. Quest System

## 18.1 Quest Types
- Main story quests
- Side quests
- Character loyalty quests
- Daily quests
- Village repair quests
- Treasure map quests
- Monster hunts
- Crafting quests
- Puzzle quests
- Event quests

## 18.2 Quest Data Fields
Each quest should include:
- id
- title
- type
- giver NPC
- start conditions
- objectives
- dialogue
- rewards
- completion state
- unlocks
- region
- recommended level

Example:
```json
{
  "id": "main_001_birthday_disaster",
  "title": "The Birthday Disaster",
  "type": "main",
  "giver": "elder_brightbeard",
  "region": "birthday_village",
  "recommendedLevel": 1,
  "startConditions": [],
  "objectives": [
    {"type": "talk", "target": "dave", "count": 1},
    {"type": "inspect", "target": "village_crystal", "count": 1},
    {"type": "defeat", "target": "shadow_spark", "count": 3}
  ],
  "rewards": {
    "xp": 50,
    "coins": 25,
    "items": [{"itemId": "berry_juice", "quantity": 3}]
  },
  "unlocks": ["region_mushroom_meadow"]
}
```

## 18.3 Launch Quest Count
Version 1 should include:
- 20 main story quests
- 25 side quests
- 5 loyalty questlines
- 20 daily quest templates
- 10 village repair quests
- 10 treasure map quests

Total target: 80+ quests.

---

# 19. Example Main Story Questline

## Chapter 1: The Birthday Disaster
- Sean receives Crystal Sword
- Xelar attacks
- Haraku is kidnapped
- village crystal is cursed
- Sean and Dave leave for Mushroom Meadow

## Chapter 2: The Mushroom Meadow Mystery
- find first Gem fragment
- defeat Moldor
- restore partial color to village
- unlock crafting

## Chapter 3: Echoes in Crystal Cave
- explore cave
- learn about Seven Gems
- defeat Cracked Crystal Guardian
- Dave upgrades Treasure Radar

## Chapter 4: The Fire of Petro Plains
- meet Petroman
- stop General Sootbeard
- Petroman joins

## Chapter 5: The Fastest Path Through Ruushwood
- meet Ruush
- race through wind paths
- defeat Wind Trickster
- Ruush joins

## Chapter 6: Haraku’s Moon Shrine
- reach Moon Shrine
- solve spirit puzzles
- defeat Xelar’s Shadow Clone
- rescue Haraku

## Chapter 7: Ancient Ruins of 007
- discover Sean’s connection to the Gem Guardians
- complete guardian trials
- unlock final path

## Chapter 8: Bald Moon Tower
- climb tower
- confront Xelar
- restore Seven Gems
- unlock post-game expansion portal

---

# 20. NPC Design

## 20.1 NPC Requirements
Each major village NPC should have:
- name
- location
- visual identity
- basic dialogue
- quest dialogue
- post-quest dialogue
- schedule or state changes
- optional flavor lines

## 20.2 Key NPCs

### Elder Brightbeard
Village elder and keeper of local legends. Gives main story guidance.

### Grandma Berrybun
Runs the bakery. Gives cooking and healing recipe quests.

### Captain Pebbleboots
Retired guard. Teaches defensive mechanics and Guardian Path upgrades.

### Mila Moonleaf
Knows shrine lore and Haraku’s background.

### Grindle the Almost-Wizard
Failed wizard who knows embarrassing stories about Xelar.

### Bobo the Merchant
Traveling merchant with rotating daily goods.

### Tilly Tinkertop
Village inventor who upgrades Dave’s gadgets.

### Flora Sproutwell
Gardening NPC who unlocks village crops.

### Finn Pondwhistle
Fishing NPC who unlocks fishing and water-side quests.

### Nara Nightbell
Innkeeper who provides rest, rumors and dream hints.

---

# 21. Dialogue System

## 21.1 Dialogue Features
The dialogue system must support:
- speaker name
- portrait
- multiple lines
- branching choices
- quest conditions
- state-based dialogue
- rewards or triggers
- optional comedic lines

## 21.2 Dialogue JSON Example
```json
{
  "id": "elder_intro_after_attack",
  "speaker": "elder_brightbeard",
  "portrait": "elder_brightbeard.png",
  "lines": [
    "Sean, the village crystal has gone dim.",
    "Xelar has taken the first Gem and Haraku with it.",
    "Take the Crystal Sword. It has chosen you for a reason."
  ],
  "choices": [
    {
      "text": "I’ll bring them back.",
      "next": "elder_intro_brave"
    },
    {
      "text": "Who is Xelar?",
      "next": "elder_intro_xelar"
    }
  ]
}
```

---

# 22. Cozy Systems

## 22.1 Resting and Inns
Players can rest at inns to:
- recover HP/MP
- trigger dream hints
- unlock character conversations
- advance daily timers if needed

## 22.2 Sean’s Room
Sean has a room in Birthday Village.

Room functions:
- view collected treasures
- place decorations
- change cosmetic outfits
- see friendship memories
- access trophy shelf
- listen to unlocked music

## 22.3 Gardening
Simple cozy system:
- plant seeds
- wait real time or quest time
- harvest ingredients
- use ingredients in cooking or crafting

Initial crops:
- Berry Bush
- Moon Petal
- Fire Pepper
- Wind Herb
- Crystal Mint

## 22.4 Cooking
Cooking creates consumables and buffs.

Example recipes:
- Mushroom Soup
- Birthday Cake Slice
- Fire Biscuit
- Moon Tea
- Wind Muffin
- Crystal Candy

## 22.5 Fishing
Fishing provides:
- cooking ingredients
- rare treasures
- daily quests
- collectibles

Fish examples:
- Tiny Pondpopper
- Crystal Carp
- Moonfin
- Grumpy Boot
- Ancient Bottle

## 22.6 Village Repair
As the player restores Gem power, they can repair:
- bakery
- blacksmith
- garden
- fountain
- bridge
- festival stage
- library

Repairs unlock new systems and NPC dialogue.

---

# 23. Daily and Retention Systems

## 23.1 Daily Login Reward
Simple 7-day loop:
1. Berry Juice
2. Coins
3. Crafting materials
4. Decoration token
5. Rare material
6. Friendship Medal
7. Gem Chest

## 23.2 Daily Quests
Daily quests should be short:
- defeat 5 enemies
- gather 3 materials
- cook 1 recipe
- catch 1 fish
- talk to 3 NPCs
- open 1 treasure chest
- complete 1 battle without falling

## 23.3 Weekly Event Hooks
Future event examples:
- Birthday Festival
- Mushroom Harvest Week
- Bald Wizard Prank Week
- Crystal Fishing Derby
- Moon Shrine Night Market

---

# 24. Monetization Design with Adsterra

## 24.1 Monetization Philosophy
The game is free and ad-supported. Ads must be placed at natural pauses and should not interrupt combat, dialogue or important story scenes.

## 24.2 Ad Placement Types

### Main Menu Banner
Location:
- title screen
- main menu
- settings screen

Purpose:
- passive monetization
- no gameplay interruption

### World Map Banner
Location:
- bottom or side panel of world map on desktop
- hidden or collapsed on small mobile screens if it hurts usability

### Village Notice Board Native Ad Slot
The quest board UI can include a clearly separated sponsored/native area below quest listings.

### Optional Reward Ad Chest
Location:
- Birthday Village near the notice board

Player can watch ad for:
- bonus coins
- crafting materials
- daily chest
- cosmetic chest
- small XP boost

Cooldown:
- 15 to 30 minutes

### Revive Ad
On defeat:
- continue from last save
- use Revival Cookie
- watch ad to revive once

Limit:
- once per dungeon or once per 30 minutes

### Double Reward Ad
After completing daily quests:
- claim normal reward
- optional ad to double coins/materials only

Do not double rare story rewards.

### Interstitial Ads
Only at natural breaks:
- after dungeon completion
- after boss victory and return to village
- after 10 to 15 minutes of active play
- when exiting to main menu

Never show interstitial:
- during combat
- during cutscenes
- during dialogue
- after every map change
- immediately after loading
- immediately after a player death

## 24.3 AdManager Requirements
AdManager should abstract all ad calls so the game can run without ads in development.

Functions:
```ts
AdManager.init()
AdManager.showBanner(placementId)
AdManager.hideBanner(placementId)
AdManager.showInterstitial(reason)
AdManager.showRewardedAd(rewardType, onSuccess, onFailure)
AdManager.canShowRewardedAd(rewardType)
AdManager.logAdEvent(type, placement, result)
```

## 24.4 Fallback Behavior
If ads fail:
- never block progression
- reward ads should show “Ad unavailable, try again later”
- interstitial failure simply continues
- banner failure collapses ad container

---

# 25. UI and UX Design

## 25.1 Main HUD
Exploration HUD:
- current quest tracker
- mini-map button
- inventory button
- party status compact view
- menu button
- touch joystick/buttons on mobile

Battle HUD:
- enemy area
- party status
- command menu
- turn order indicator
- skill descriptions
- friendship meter

Village HUD:
- quest tracker
- interact prompt
- menu
- daily reward indicator
- current coins

## 25.2 Menu Screens
Required menus:
- Inventory
- Equipment
- Skills
- Quest Log
- Map
- Bestiary
- Treasures
- Settings
- Save Info
- Party
- Decorations

## 25.3 Accessibility
Include:
- readable fonts
- high contrast UI panels
- adjustable text speed
- skip/fast-forward dialogue after first viewing
- mute music/sfx
- reduced animation toggle
- clear touch targets

---

# 26. Art Direction

## 26.1 Style
Colorful cartoon fantasy inspired by the attached Super Sean visual:
- bold outlines
- expressive faces
- saturated but soft colors
- cozy villages
- magical forests
- glowing crystals
- cute monsters
- readable silhouettes

## 26.2 Character Sprite Requirements
Each playable character needs:
- idle down/up/side
- walk down/up/side
- run down/up/side
- battle idle
- attack
- skill cast
- hurt
- victory
- defeated
- portrait
- menu icon

## 26.3 Enemy Sprite Requirements
Each enemy needs:
- idle
- attack
- hurt
- defeated
- optional special cast

## 26.4 Tile and Map Assets
Needed tile sets:
- Birthday Village
- cozy house interiors
- forest
- cave
- plains/machine
- wind forest
- moon shrine
- ancient ruins
- tower/fortress
- UI panels
- icons

## 26.5 UI Art
UI should include:
- parchment/fantasy panels
- crystal buttons
- bright readable icons
- item rarity frames
- quest markers
- speech bubbles
- ad reward chest icon
- friendship meter

---

# 27. Audio Direction

## 27.1 Music
Music should be cheerful, melodic and loop-friendly.

Required tracks:
- Title Theme
- Birthday Village Day
- Birthday Village Cursed
- Mushroom Meadow
- Crystal Cave
- Petro Plains
- Ruushwood
- Moon Shrine
- Ancient Ruins
- Bald Moon Tower
- Normal Battle
- Boss Battle
- Xelar Theme
- Victory
- Cozy Inn
- Emotional Scene

## 27.2 Sound Effects
Required SFX:
- sword slash
- menu select
- dialogue blip
- item pickup
- coin pickup
- chest open
- level up
- quest complete
- magic cast
- fire attack
- wind dash
- heal
- enemy hit
- player hurt
- boss roar
- ad reward chest open

---

# 28. Enemy Design

## 28.1 Enemy Scaling
Enemies should be organized by region and recommended level.

Stats:
- HP
- Attack
- Defense
- Magic
- Speed
- XP
- Coins
- Element
- Weakness
- Drop table
- AI pattern

## 28.2 Example Enemy Data
```json
{
  "id": "slime_sprout",
  "name": "Slime Sprout",
  "region": "mushroom_meadow",
  "level": 1,
  "element": "nature",
  "stats": {
    "hp": 24,
    "attack": 6,
    "defense": 3,
    "magic": 2,
    "speed": 4
  },
  "weaknesses": ["fire"],
  "skills": ["bounce"],
  "xp": 8,
  "coins": [1, 4],
  "lootTable": "slime_sprout_loot"
}
```

## 28.3 Boss Design Template
Each boss should have:
- intro dialogue
- unique visual
- 2 to 3 mechanics
- weakness
- phase change if major boss
- reward
- story consequence

---

# 29. Launch Bosses

## Moldor the Mushroom Grump
Mechanics:
- summons mushrooms
- uses sleep spores
- weak to fire once Petroman joins later, but initially beaten with Sean/Dave tactics

## Cracked Crystal Guardian
Mechanics:
- shield phase
- crystal reflection
- weak after puzzle crystal is activated

## General Sootbeard
Mechanics:
- fire bombs
- machine minions
- overheats and becomes vulnerable

## Wind Trickster
Mechanics:
- high evasion
- creates clones
- slowed by Dave traps

## Xelar’s Shadow Clone
Mechanics:
- curse magic
- copies party skills
- weakened by Haraku’s spirit bells after rescue moment

## Forgotten Guardian
Mechanics:
- trials of courage/friendship/wisdom
- changes elemental stance

## Xelar
Mechanics:
- multi-phase
- corrupted Gem shield
- requires friendship combos

---

# 30. Content Targets for Version 1.0

Minimum launch target:
- 1 complete story arc
- 7 regions
- 5 playable characters
- 50+ NPCs
- 80+ quests
- 100+ items
- 40+ enemies
- 10+ bosses
- 25+ equipment pieces
- 30+ skills
- 10+ combo attacks
- 20+ treasures/decorations
- 7 village upgrade stages
- local save system
- Adsterra ad integration points
- responsive browser UI

Recommended vertical slice first:
- Birthday Village
- Mushroom Meadow
- Sean and Dave playable
- 10 quests
- 8 enemies
- 1 boss
- inventory
- equipment
- battle system
- dialogue
- save/load
- one optional ad reward placeholder
- one banner placeholder
- mobile controls

---

# 31. Data-Driven Content Standards

## 31.1 Characters JSON
```json
{
  "id": "sean",
  "name": "Super Sean",
  "role": "Hero",
  "element": "crystal",
  "baseStats": {
    "hp": 100,
    "mp": 30,
    "attack": 14,
    "defense": 10,
    "magic": 8,
    "speed": 9,
    "luck": 7
  },
  "growth": {
    "hp": 12,
    "mp": 4,
    "attack": 3,
    "defense": 2,
    "magic": 2,
    "speed": 2,
    "luck": 1
  },
  "skillTrees": ["hero_path", "crystal_path", "guardian_path"],
  "startingSkills": ["basic_attack", "crystal_slash"]
}
```

## 31.2 Items JSON
```json
{
  "id": "berry_juice",
  "name": "Berry Juice",
  "type": "consumable",
  "rarity": "common",
  "description": "Restores a small amount of HP.",
  "effects": [
    {"type": "restore_hp", "amount": 40}
  ],
  "sellValue": 5,
  "usableInBattle": true,
  "usableInMenu": true
}
```

## 31.3 Skills JSON
```json
{
  "id": "crystal_slash",
  "name": "Crystal Slash",
  "character": "sean",
  "type": "active",
  "element": "crystal",
  "cost": {"mp": 5},
  "target": "single_enemy",
  "power": 1.4,
  "description": "A bright sword strike powered by crystal energy.",
  "effects": [
    {"type": "damage", "formula": "physical"}
  ]
}
```

## 31.4 Maps JSON
```json
{
  "id": "birthday_village",
  "name": "Birthday Village",
  "tileset": "birthday_village_tiles",
  "music": "birthday_village_day",
  "spawnPoints": {
    "default": {"x": 120, "y": 180},
    "from_world_map": {"x": 30, "y": 220}
  },
  "npcs": ["elder_brightbeard", "grandma_berrybun", "bobo_merchant"],
  "interactables": ["village_crystal", "notice_board", "reward_chest"],
  "exits": [
    {"targetMap": "world_map", "x": 420, "y": 250}
  ]
}
```

---

# 32. AI Build Strategy

## 32.1 Development Philosophy
Build the game in layers. Do not ask AI to build everything at once.

Recommended build phases:
1. Project scaffold
2. Boot/preload/title/menu
3. Save system
4. Exploration scene
5. Dialogue system
6. Inventory system
7. Battle system
8. Quest system
9. Village hub
10. First region
11. Boss battle
12. Character progression
13. Skill trees
14. Cozy systems
15. AdManager integration
16. Mobile polish
17. Content expansion

## 32.2 AI-Friendly Acceptance Criteria
Every phase should include:
- clear files changed
- no placeholder broken imports
- works with `npm install` and `npm run dev`
- TypeScript compiles
- game loads in browser
- no console errors
- save/load tested
- responsive layout tested
- data-driven content used where possible

## 32.3 Recommended First AI Prompt
Ask the coding AI to build a vertical slice engine first, not the full game.

Prompt summary:
- create Phaser TypeScript project
- implement scene structure
- load data JSON
- build Birthday Village map placeholder
- player movement
- dialogue with NPC
- simple inventory
- simple turn-based battle
- quest tracker
- save/load
- ad placeholder manager
- responsive UI

---

# 33. Vertical Slice Specification

## 33.1 Required Content
Playable area:
- Birthday Village
- Mushroom Meadow

Characters:
- Sean
- Dave

NPCs:
- Elder Brightbeard
- Grandma Berrybun
- Bobo Merchant
- Captain Pebbleboots
- Grindle the Almost-Wizard

Enemies:
- Slime Sprout
- Grumpy Mushroom
- Leaf Bat
- Thornling
- Sleepy Snail
- Shadow Spark
- Tiny Mimic
- Mushroom Minion

Boss:
- Moldor the Mushroom Grump

Quests:
1. The Birthday Disaster
2. Talk to Dave
3. Inspect the Village Crystal
4. Clear the Shadow Sparks
5. Enter Mushroom Meadow
6. Gather Mushroom Caps
7. Find Grandma’s Lost Spoon
8. Defeat the Grumpy Mushrooms
9. Open the Hidden Chest
10. Defeat Moldor

Systems:
- movement
- interaction
- dialogue
- inventory
- equipment basics
- battle
- XP and leveling
- quest log
- save/load
- reward chest ad placeholder
- banner ad placeholder

## 33.2 Vertical Slice Success Definition
The slice is successful if the player can:
1. Start a new game.
2. Watch/read intro dialogue.
3. Move around Birthday Village.
4. Talk to NPCs.
5. Accept and complete quests.
6. Enter Mushroom Meadow.
7. Fight random or touch encounters.
8. Gain XP and items.
9. Defeat Moldor.
10. Return to village.
11. Save and reload progress.
12. Use an optional ad reward placeholder without breaking gameplay.

---

# 34. Balancing Guidelines

## 34.1 Early Game
- Player should win basic battles easily.
- Bosses should require using skills and items.
- First 30 minutes should introduce systems gradually.

## 34.2 XP Curve
Suggested level curve:
- Level 1 to 5: very fast
- Level 6 to 15: moderate
- Level 16 to 30: slower
- Level 31 to 50: long-term

## 34.3 Battle Length
Target:
- normal battle: 30 to 90 seconds
- mini-boss: 2 to 4 minutes
- major boss: 4 to 8 minutes

## 34.4 Economy
Early game:
- enough coins to buy basic healing
- equipment upgrades require some choice
- rare drops should feel exciting but not required

---

# 35. Analytics Events

Track useful gameplay events if analytics is added:
- game_start
- new_game_created
- save_loaded
- quest_started
- quest_completed
- battle_started
- battle_won
- battle_lost
- boss_defeated
- item_acquired
- level_up
- ad_banner_loaded
- ad_reward_started
- ad_reward_completed
- ad_reward_failed
- interstitial_shown
- daily_reward_claimed
- dungeon_completed

---

# 36. SEO/GAIO Website Wrapper

Because the game is browser-based, the game page should also be SEO/GAIO optimized.

## Required Web Page Elements
- descriptive title
- meta description
- Open Graph image
- FAQ section below game
- short game description
- “How to Play” section
- character section
- feature section
- structured data for WebApplication/Game
- fast-loading hero image
- internal links to updates/news
- privacy policy
- contact/legal pages

## Suggested SEO Title
**Play Super Sean 007: Legend of the Seven Gems - Free Browser JRPG**

## Suggested Meta Description
**Play Super Sean 007: Legend of the Seven Gems, a free online 2D JRPG where Sean and friends explore magical worlds, collect treasures, level up and battle Xelar the Bald Wizard.**

## Game Page Sections
1. Hero/game embed
2. Play Now button
3. About the game
4. Characters
5. How to play
6. Features
7. Latest updates
8. FAQ
9. Legal/contact/footer

---

# 37. Expansion Roadmap

## Version 1.1
- extra side quests
- bestiary
- more room decorations
- daily quest rotation
- balance polish

## Version 1.2
- Frozen Cake Kingdom
- new enemies
- new boss
- winter cosmetics
- fishing expansion

## Version 1.3
- Petroman Fire Engine City
- machine dungeon
- Petroman loyalty expansion
- advanced crafting

## Version 1.4
- Ruush Sky Islands
- airship travel
- speed challenges
- wind gear

## Version 1.5
- Haraku Spirit Realm
- dream puzzles
- spirit pets
- moon magic upgrades

## Version 2.0
- Xelar’s Revenge
- new villain apprentices
- raised level cap
- new ultimate skills
- optional account save

---

# 38. Risks and Solutions

## Risk: Scope Too Big
Solution:
Build vertical slice first. Add regions only after core systems are stable.

## Risk: Browser Performance
Solution:
Use optimized spritesheets, compressed audio, lazy-loaded regions and simple battle effects.

## Risk: Ads Hurt Retention
Solution:
Use optional rewarded ads and natural interstitial breaks only.

## Risk: AI Code Becomes Messy
Solution:
Use modular architecture, TypeScript, strict data schemas and small implementation phases.

## Risk: Content Becomes Hard to Maintain
Solution:
Keep all quests, enemies, items, skills and dialogue in JSON.

---

# 39. Definition of Done for Version 1.0

Version 1.0 is complete when:
- player can finish the main story
- all 5 heroes are playable
- Xelar final battle works
- save/load is reliable
- quests can be completed without soft locks
- inventory/equipment/skills work
- all major regions are playable
- village upgrades work
- Adsterra placements are integrated safely
- mobile and desktop layouts are usable
- game has no critical console errors
- SEO wrapper page is complete
- basic analytics events are in place
- game can be deployed as a static site

---

# 40. Final Build Recommendation

Start with a small but polished vertical slice:

**Birthday Village + Mushroom Meadow + Sean + Dave + 10 quests + 8 enemies + Moldor boss + save/load + inventory + battle + dialogue + ad placeholders.**

Once that feels good, expand in this order:
1. Crystal Cave
2. Petroman and Petro Plains
3. Ruush and Ruushwood
4. Haraku and Moon Shrine
5. Ancient Ruins
6. Bald Moon Tower
7. Cozy systems and daily systems
8. Post-game expansions

The key is to make the core engine stable and content-driven, so every future update becomes a matter of adding data, maps, sprites and dialogue rather than rewriting the entire game.
