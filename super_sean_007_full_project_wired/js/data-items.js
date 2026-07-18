/* Super Sean 007 — item, material, recipe, equipment, crop and shop data.
   Pure data module; no DOM access. Icons reference real tileset tiles. */
(() => {
  'use strict';
  window.SSG = window.SSG || {};
  SSG.TILE = 64;

  // icon: {sheet: tilesetKey, tile: index} fallback drawn from the sliced tilesets.
  // img: distinct sliced icon (data/icon-manifest.json) — preferred when present.
  SSG.ITEMS = {
    'Wood':          {type:'material', icon:{sheet:'meadow', tile:12}, sell:2,  desc:'Sturdy log chopped from trees.'},
    'Stone':         {type:'material', icon:{sheet:'meadow', tile:16}, sell:2,  desc:'Rough stone from boulders and cave walls.'},
    'Plank':         {type:'material', icon:{sheet:'birthday', tile:4},  sell:4,  desc:'Refined wood, ready for building.'},
    'Stone Brick':   {type:'material', icon:{sheet:'birthday', tile:2},  sell:4,  desc:'Cut stone block for solid walls.'},
    'Berry':         {type:'material', icon:{sheet:'birthday', tile:13}, sell:3,  desc:'Sweet homegrown berry.'},
    'Mushroom Cap':  {type:'material', img:'icon_mushroom', icon:{sheet:'meadow', tile:6},  sell:3,  desc:'Bouncy meadow mushroom cap.'},
    'Flower':        {type:'material', icon:{sheet:'meadow', tile:14}, sell:3,  desc:'Bright meadow flower.'},
    'Crystal Shard': {type:'material', img:'icon_crystal', icon:{sheet:'birthday', tile:21}, sell:8,  desc:'Glowing shard from Crystal Cave.'},
    'Ore Chunk':     {type:'material', icon:{sheet:'cave', tile:5},   sell:6,  desc:'Heavy ore pulled from a cave vein.'},
    'Gear Part':     {type:'material', icon:{sheet:'petro', tile:6},  sell:9,  desc:'Machine part from Petro Plains scrap.'},
    'Moon Herb':     {type:'material', img:'icon_herb', icon:{sheet:'moon', tile:3},   sell:10, desc:'Herb that only blooms in moonlight.'},
    'Ancient Relic': {type:'material', img:'icon_medal', icon:{sheet:'ruins', tile:4},  sell:14, desc:'Golden dial from the Ancient Ruins.'},

    'Berry Juice':   {type:'consumable', img:'icon_potion_red', icon:{sheet:'meadow', tile:18}, sell:6,  heal:45,  desc:'Restores 45 HP.'},
    'Crystal Candy': {type:'consumable', img:'icon_potion_blue', icon:{sheet:'birthday', tile:21}, sell:8, mana:20, desc:'Restores 20 MP.'},
    'Deer Whistle': {type:'mount', mount:'animal_deerling', img:'icon_leaf', icon:{sheet:'meadow', tile:17}, sell:40, desc:'Call (or dismiss) a friendly deerling to ride. Riding is 55% faster!'},
    'Dragon Horn': {type:'mount', mount:'mount_dragonling', img:'icon_star_gold', icon:{sheet:'moon', tile:5}, sell:120, desc:'Summon the golden dragonling you befriended after saving Asteria-007.'},
    'Mushroom Stew': {type:'consumable', img:'icon_jar', icon:{sheet:'meadow', tile:7},  sell:14, heal:120, desc:'Hearty stew. Restores 120 HP.'},
    'Moon Tea':      {type:'consumable', img:'icon_potion_green', icon:{sheet:'moon', tile:6},   sell:16, mana:999, desc:'Restores all MP. Haraku loves it.'},
    'Courage Crumble':{type:'consumable', img:'icon_cake', icon:{sheet:'meadow', tile:14}, sell:20, heal:80, friendship:20, desc:'Grandma cake: 80 HP and +20 Friendship.'},
    'Guardian Shard':{type:'key', img:'icon_gem_blue', icon:{sheet:'cave', tile:3}, sell:0, desc:'Proof the Crystal Guardian was calmed.'},

    'Honey Bread':   {type:'consumable', img:'icon_bread', icon:{sheet:'birthday', tile:13}, sell:9,  heal:60,  desc:'Warm bakery loaf. Restores 60 HP.'},
    'Zest Soda':     {type:'consumable', img:'icon_potion_yellow', icon:{sheet:'meadow', tile:18}, sell:8, mana:30, desc:'Fizzy citrus pop. Restores 30 MP.'},
    'Star Elixir':   {type:'consumable', img:'icon_potion_purple', icon:{sheet:'moon', tile:6}, sell:28, heal:200, desc:'Bottled starlight. Restores 200 HP.'},
    'Old Key':       {type:'key', img:'icon_key', icon:{sheet:'ruins', tile:9}, sell:0, desc:'A heavy brass key. Opens one sealed chest in the far regions.'},

    'Sunfish':       {type:'consumable', icon:{sheet:'birthday', tile:16}, sell:6, heal:25, desc:'Fresh pond catch. Restores 25 HP.'},
    'Grilled Fish':  {type:'consumable', img:'icon_meat', icon:{sheet:'petro', tile:3}, sell:18, heal:150, desc:'Kitchen-grilled sunfish. Restores 150 HP.'},
    'Treasure Map':  {type:'treasure_map', img:'icon_scroll', icon:{sheet:'birthday', tile:14}, sell:10, desc:'A crinkled map. Use it from your bag to reveal a dig spot.'},
    'Gemkin Crown':  {type:'equipment', slot:'charm', img:'icon_gem_rainbow', icon:{sheet:'birthday', tile:21}, sell:400, attack:8, defense:8, maxMp:30, desc:'Trophy of the Gemkin Avatar. +8 ATK, +8 DEF, +30 MP.'},

    'Berry Seed':    {type:'seed', icon:{sheet:'meadow', tile:15}, sell:2, crop:'berry',  desc:'Plant in tilled soil. Grows berries.'},
    'Flower Seed':   {type:'seed', icon:{sheet:'meadow', tile:15}, sell:2, crop:'flower', desc:'Plant in tilled soil. Grows flowers.'},
    'Moonfruit Seed':{type:'seed', icon:{sheet:'meadow', tile:15}, sell:4, crop:'moon',   desc:'Plant in tilled soil. Grows moon herbs.'},

    'Crystal Sword +1':{type:'equipment', slot:'weapon', img:'icon_sword', icon:{sheet:'cave', tile:8},  sell:30, attack:6,  desc:'Sharpened hero blade. +6 ATK.'},
    'Gear Blade':    {type:'equipment', slot:'weapon', icon:{sheet:'petro', tile:11}, sell:60, attack:12, desc:'Petro-forged edge. +12 ATK.'},
    'Starfall Edge': {type:'equipment', slot:'weapon', img:'icon_star_gold', icon:{sheet:'moon', tile:16},  sell:110, attack:20, desc:'Blade of captured starlight. +20 ATK.'},
    'Guardian Plate':{type:'equipment', slot:'armor',  img:'icon_shield', icon:{sheet:'ruins', tile:3},  sell:55, defense:8, desc:'Stone-set armor. +8 DEF.'},
    'Moonweave Cloak':{type:'equipment', slot:'armor', icon:{sheet:'moon', tile:9},   sell:90, defense:14, desc:'Woven moonlight. +14 DEF.'},
    'Gadget Charm':  {type:'equipment', slot:'charm',  img:'icon_bolt', icon:{sheet:'petro', tile:4},  sell:40, maxMp:15, desc:'Dave-made charm. +15 max MP.'},
    'Moon Charm':    {type:'equipment', slot:'charm',  img:'icon_moon', icon:{sheet:'moon', tile:5},   sell:60, maxMp:25, desc:'Shrine token. +25 max MP.'},
    'Relic Crown':   {type:'equipment', slot:'charm',  img:'icon_crown', icon:{sheet:'ruins', tile:9},  sell:140, attack:5, defense:5, maxMp:20, desc:'Crown of the old kings. +5 ATK, +5 DEF, +20 MP.'},
    'Sage Wand':     {type:'equipment', slot:'weapon', img:'icon_wand', icon:{sheet:'moon', tile:16},  sell:95, attack:14, maxMp:20, desc:'Moon-touched focus. +14 ATK, +20 max MP.'},
    'Gear Blade +2': {type:'equipment', slot:'weapon', icon:{sheet:'petro', tile:11}, sell:110, attack:18, desc:'Forge-mastered Petro edge. +18 ATK.'},
    'Starfall Edge +2':{type:'equipment', slot:'weapon', img:'icon_star_gold', icon:{sheet:'moon', tile:16}, sell:190, attack:28, desc:'Starlight, twice-folded at the forge. +28 ATK.'},
    'Guardian Plate +2':{type:'equipment', slot:'armor', img:'icon_shield', icon:{sheet:'ruins', tile:3}, sell:100, defense:14, desc:'Reinforced stone-set armor. +14 DEF.'},
    'Moonweave Cloak +2':{type:'equipment', slot:'armor', icon:{sheet:'moon', tile:9}, sell:160, defense:20, desc:'Double-woven moonlight. +20 DEF.'},
    'Hero Sandwich': {type:'consumable', img:'icon_bread', icon:{sheet:'birthday', tile:13}, sell:14, heal:30, buff:'inspired', buffTurns:3, desc:'Hearty! Heals 30 HP and inspires your next battle (+25% damage, 3 turns).'},
    'Iceberry Smoothie':{type:'consumable', img:'icon_potion_blue', icon:{sheet:'birthday', tile:21}, sell:14, mana:15, buff:'regen', buffTurns:3, desc:'Chilly-sweet. +15 MP and regenerating HP for your next battle.'},
    'Iron Stew':     {type:'consumable', img:'icon_meat', icon:{sheet:'meadow', tile:6}, sell:16, heal:20, buff:'ironGuard', buffTurns:2, desc:'Petro classic. Heals 20 HP and halves damage early in your next battle.'},
    'Tome of Legends':{type:'equipment', slot:'charm', img:'icon_book', icon:{sheet:'ruins', tile:4},  sell:120, attack:4, defense:4, maxMp:25, desc:'Every hero\'s tale, annotated. +4 ATK, +4 DEF, +25 MP.'}
  };

  // station: null = craft anywhere; otherwise requires that homestead station piece.
  SSG.RECIPES = [
    {id:'plank',   name:'Plank ×2',        out:{item:'Plank', qty:2},        ins:[['Wood',1]], station:null, cat:'materials'},
    {id:'brick',   name:'Stone Brick ×2',  out:{item:'Stone Brick', qty:2},  ins:[['Stone',1]], station:null, cat:'materials'},
    {id:'berryjuice', name:'Berry Juice',  out:{item:'Berry Juice', qty:1},  ins:[['Berry',2]], station:null, cat:'food'},
    {id:'candy',   name:'Crystal Candy',   out:{item:'Crystal Candy', qty:1},ins:[['Crystal Shard',1],['Berry',1]], station:null, cat:'food'},
    {id:'berryseed', name:'Berry Seed',    out:{item:'Berry Seed', qty:1},   ins:[['Berry',1]], station:null, cat:'garden'},
    {id:'flowerseed', name:'Flower Seed',  out:{item:'Flower Seed', qty:1},  ins:[['Flower',1]], station:null, cat:'garden'},
    {id:'moonseed', name:'Moonfruit Seed', out:{item:'Moonfruit Seed', qty:1}, ins:[['Moon Herb',1]], station:null, cat:'garden'},

    {id:'stew',    name:'Mushroom Stew',   out:{item:'Mushroom Stew', qty:1},ins:[['Mushroom Cap',3],['Berry',1]], station:'kitchen', cat:'food'},
    {id:'moontea', name:'Moon Tea',        out:{item:'Moon Tea', qty:1},     ins:[['Moon Herb',2]], station:'kitchen', cat:'food'},
    {id:'crumble', name:'Courage Crumble', out:{item:'Courage Crumble', qty:1}, ins:[['Berry',2],['Flower',1],['Mushroom Cap',1]], station:'kitchen', cat:'food'},
    {id:'grilledfish', name:'Grilled Fish', out:{item:'Grilled Fish', qty:1}, ins:[['Sunfish',2]], station:'kitchen', cat:'food'},
    {id:'honeybread', name:'Honey Bread',   out:{item:'Honey Bread', qty:1}, ins:[['Berry',2],['Mushroom Cap',1]], station:'kitchen', cat:'food'},
    {id:'zestsoda',  name:'Zest Soda',      out:{item:'Zest Soda', qty:1},   ins:[['Berry',1],['Flower',1]], station:'kitchen', cat:'food'},
    {id:'starelixir', name:'Star Elixir',   out:{item:'Star Elixir', qty:1}, ins:[['Moon Herb',2],['Crystal Shard',2],['Berry',1]], station:'kitchen', cat:'food'},

    {id:'gadgetcharm', name:'Gadget Charm', out:{item:'Gadget Charm', qty:1}, ins:[['Gear Part',2],['Plank',1]], station:'workbench', cat:'gear'},
    {id:'sword1',  name:'Crystal Sword +1',out:{item:'Crystal Sword +1', qty:1}, ins:[['Crystal Shard',3],['Plank',2]], station:'forge', cat:'gear'},
    {id:'gearblade', name:'Gear Blade',    out:{item:'Gear Blade', qty:1},   ins:[['Gear Part',4],['Ore Chunk',2],['Crystal Shard',2]], station:'forge', cat:'gear'},
    {id:'starfall', name:'Starfall Edge',  out:{item:'Starfall Edge', qty:1},ins:[['Moon Herb',3],['Crystal Shard',4],['Ore Chunk',3]], station:'forge', cat:'gear'},
    {id:'plate',   name:'Guardian Plate',  out:{item:'Guardian Plate', qty:1}, ins:[['Stone Brick',4],['Ore Chunk',2]], station:'forge', cat:'gear'},
    {id:'cloak',   name:'Moonweave Cloak', out:{item:'Moonweave Cloak', qty:1}, ins:[['Moon Herb',4],['Flower',3],['Crystal Shard',2]], station:'forge', cat:'gear'},
    {id:'mooncharm', name:'Moon Charm',    out:{item:'Moon Charm', qty:1},   ins:[['Moon Herb',2],['Crystal Shard',2]], station:'forge', cat:'gear'},
    {id:'crown',   name:'Relic Crown',     out:{item:'Relic Crown', qty:1},  ins:[['Ancient Relic',3],['Crystal Shard',3],['Gear Part',2]], station:'forge', cat:'gear'},
    {id:'sagewand', name:'Sage Wand',      out:{item:'Sage Wand', qty:1},    ins:[['Plank',2],['Moon Herb',3],['Crystal Shard',2]], station:'forge', cat:'gear'},
    {id:'tome',    name:'Tome of Legends', out:{item:'Tome of Legends', qty:1}, ins:[['Ancient Relic',2],['Plank',1],['Moon Herb',2]], station:'workbench', cat:'gear'},
    // Forge mastery: transmute base gear + rare materials into tier-2 versions.
    {id:'gearblade2', name:'Gear Blade +2',      out:{item:'Gear Blade +2', qty:1},      ins:[['Gear Blade',1],['Gear Part',2],['Ore Chunk',2]], station:'forge', cat:'gear'},
    {id:'starfall2',  name:'Starfall Edge +2',   out:{item:'Starfall Edge +2', qty:1},   ins:[['Starfall Edge',1],['Crystal Shard',3],['Moon Herb',2]], station:'forge', cat:'gear'},
    {id:'plate2',     name:'Guardian Plate +2',  out:{item:'Guardian Plate +2', qty:1},  ins:[['Guardian Plate',1],['Stone Brick',4],['Ore Chunk',2]], station:'forge', cat:'gear'},
    {id:'cloak2',     name:'Moonweave Cloak +2', out:{item:'Moonweave Cloak +2', qty:1}, ins:[['Moonweave Cloak',1],['Moon Herb',3],['Crystal Shard',2]], station:'forge', cat:'gear'},
    // Well-Fed dishes: eat before a fight for an opening battle buff.
    {id:'sandwich', name:'Hero Sandwich',     out:{item:'Hero Sandwich', qty:1},     ins:[['Honey Bread',1],['Berry',1]], station:'kitchen', cat:'food'},
    {id:'smoothie', name:'Iceberry Smoothie', out:{item:'Iceberry Smoothie', qty:1}, ins:[['Berry',2],['Crystal Shard',1]], station:'kitchen', cat:'food'},
    {id:'ironstew', name:'Iron Stew',         out:{item:'Iron Stew', qty:1},         ins:[['Mushroom Cap',2],['Ore Chunk',1]], station:'kitchen', cat:'food'}
  ];

  SSG.CROPS = {
    berry:  {name:'Berry Bush',  growMs: 60_000,  ripeTile:{sheet:'birthday', tile:13}, yields:[['Berry',3]], seedBack:0.5, seed:'Berry Seed'},
    flower: {name:'Flower Patch',growMs: 90_000,  ripeTile:{sheet:'meadow', tile:14},  yields:[['Flower',3]], seedBack:0.5, seed:'Flower Seed'},
    moon:   {name:'Moonfruit',   growMs: 150_000, ripeTile:{sheet:'moon', tile:3},     yields:[['Moon Herb',2]], seedBack:0.4, seed:'Moonfruit Seed'}
  };

  SSG.SHOP_STOCK = [
    {item:'Deer Whistle', price:140},
    {item:'Dragon Horn', price:400, requires:'xelar_final'},
    {item:'Berry Juice', price:12},
    {item:'Crystal Candy', price:16},
    {item:'Berry Seed', price:5},
    {item:'Flower Seed', price:5},
    {item:'Moonfruit Seed', price:12},
    {item:'Wood', price:6},
    {item:'Stone', price:6},
    {item:'Mushroom Cap', price:8},
    {item:'Honey Bread', price:20},
    {item:'Zest Soda', price:18},
    {item:'Old Key', price:60},
    {item:'Treasure Map', price:30}
  ];

  // Daily quest board rotation (picked deterministically by date).
  SSG.DAILY_QUESTS = [
    {item:'Wood', qty:8},
    {item:'Stone', qty:8},
    {item:'Berry', qty:6},
    {item:'Mushroom Cap', qty:5},
    {item:'Flower', qty:5},
    {item:'Crystal Shard', qty:3},
    {item:'Sunfish', qty:2}
  ];

  // Monster material drops by enemy kind (rolled on victory).
  SSG.MONSTER_DROPS = {
    slime:    [['Berry', 0.6], ['Wood', 0.3]],
    mushroom: [['Mushroom Cap', 0.9], ['Flower', 0.3]],
    bat:      [['Berry', 0.4], ['Stone', 0.4]],
    crystal:  [['Crystal Shard', 0.8], ['Ore Chunk', 0.4], ['Old Key', 0.05]],
    xelar:    [['Moon Herb', 0.8], ['Ancient Relic', 0.5], ['Old Key', 0.15]]
  };
})();
