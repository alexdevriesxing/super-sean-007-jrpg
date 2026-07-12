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
    'Mushroom Stew': {type:'consumable', img:'icon_jar', icon:{sheet:'meadow', tile:7},  sell:14, heal:120, desc:'Hearty stew. Restores 120 HP.'},
    'Moon Tea':      {type:'consumable', img:'icon_potion_green', icon:{sheet:'moon', tile:6},   sell:16, mana:999, desc:'Restores all MP. Haraku loves it.'},
    'Courage Crumble':{type:'consumable', img:'icon_cake', icon:{sheet:'meadow', tile:14}, sell:20, heal:80, friendship:20, desc:'Grandma cake: 80 HP and +20 Friendship.'},
    'Guardian Shard':{type:'key', img:'icon_gem_blue', icon:{sheet:'cave', tile:3}, sell:0, desc:'Proof the Crystal Guardian was calmed.'},

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
    'Relic Crown':   {type:'equipment', slot:'charm',  img:'icon_crown', icon:{sheet:'ruins', tile:9},  sell:140, attack:5, defense:5, maxMp:20, desc:'Crown of the old kings. +5 ATK, +5 DEF, +20 MP.'}
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

    {id:'gadgetcharm', name:'Gadget Charm', out:{item:'Gadget Charm', qty:1}, ins:[['Gear Part',2],['Plank',1]], station:'workbench', cat:'gear'},
    {id:'sword1',  name:'Crystal Sword +1',out:{item:'Crystal Sword +1', qty:1}, ins:[['Crystal Shard',3],['Plank',2]], station:'forge', cat:'gear'},
    {id:'gearblade', name:'Gear Blade',    out:{item:'Gear Blade', qty:1},   ins:[['Gear Part',4],['Ore Chunk',2],['Crystal Shard',2]], station:'forge', cat:'gear'},
    {id:'starfall', name:'Starfall Edge',  out:{item:'Starfall Edge', qty:1},ins:[['Moon Herb',3],['Crystal Shard',4],['Ore Chunk',3]], station:'forge', cat:'gear'},
    {id:'plate',   name:'Guardian Plate',  out:{item:'Guardian Plate', qty:1}, ins:[['Stone Brick',4],['Ore Chunk',2]], station:'forge', cat:'gear'},
    {id:'cloak',   name:'Moonweave Cloak', out:{item:'Moonweave Cloak', qty:1}, ins:[['Moon Herb',4],['Flower',3],['Crystal Shard',2]], station:'forge', cat:'gear'},
    {id:'mooncharm', name:'Moon Charm',    out:{item:'Moon Charm', qty:1},   ins:[['Moon Herb',2],['Crystal Shard',2]], station:'forge', cat:'gear'},
    {id:'crown',   name:'Relic Crown',     out:{item:'Relic Crown', qty:1},  ins:[['Ancient Relic',3],['Crystal Shard',3],['Gear Part',2]], station:'forge', cat:'gear'}
  ];

  SSG.CROPS = {
    berry:  {name:'Berry Bush',  growMs: 60_000,  ripeTile:{sheet:'birthday', tile:13}, yields:[['Berry',3]], seedBack:0.5, seed:'Berry Seed'},
    flower: {name:'Flower Patch',growMs: 90_000,  ripeTile:{sheet:'meadow', tile:14},  yields:[['Flower',3]], seedBack:0.5, seed:'Flower Seed'},
    moon:   {name:'Moonfruit',   growMs: 150_000, ripeTile:{sheet:'moon', tile:3},     yields:[['Moon Herb',2]], seedBack:0.4, seed:'Moonfruit Seed'}
  };

  SSG.SHOP_STOCK = [
    {item:'Berry Juice', price:12},
    {item:'Crystal Candy', price:16},
    {item:'Berry Seed', price:5},
    {item:'Flower Seed', price:5},
    {item:'Moonfruit Seed', price:12},
    {item:'Wood', price:6},
    {item:'Stone', price:6},
    {item:'Mushroom Cap', price:8},
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
    crystal:  [['Crystal Shard', 0.8], ['Ore Chunk', 0.4]],
    xelar:    [['Moon Herb', 0.8], ['Ancient Relic', 0.5]]
  };
})();
