/* Super Sean 007 — world data: 9 regions + buildable homestead, resource nodes,
   NPCs, monsters, chests and portals. Deterministic layouts, real tile indices. */
(() => {
  'use strict';
  window.SSG = window.SSG || {};
  const T = SSG.TILE;

  // Tiles that block movement, per tileset (index = row*8+col).
  SSG.SOLID_TILES = {
    birthday: new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20, 21, 22, 23, 24, 25, 26]),
    meadow:   new Set([5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19]),
    cave:     new Set([3, 4, 5, 6, 7]),
    petro:    new Set([3, 4, 6, 7]),
    ruushwood:new Set([2, 4, 5, 6, 7]),
    moon:     new Set([4, 5, 6, 7]),
    ruins:    new Set([3, 4, 6, 7]),
    tower:    new Set([4, 5, 6, 7])
  };

  // Gatherable node types. yields: item -> [min,max]. respawn in ms, hits to break.
  SSG.NODE_TYPES = {
    tree:     {name:'Tree',           sheet:'meadow',    tile:10, hits:3, respawn:45000,  yields:{'Wood':[2,3]}},
    berry:    {name:'Berry Hedge',    sheet:'birthday',  tile:9,  hits:2, respawn:50000,  yields:{'Berry':[2,3]}},
    rock:     {name:'Boulder',        sheet:'meadow',    tile:16, hits:3, respawn:50000,  yields:{'Stone':[2,3]}},
    mushroom: {name:'Wild Mushroom',  sheet:'meadow',    tile:6,  hits:2, respawn:40000,  yields:{'Mushroom Cap':[1,2]}},
    mushroom2:{name:'Amber Mushroom', sheet:'meadow',    tile:7,  hits:2, respawn:40000,  yields:{'Mushroom Cap':[1,2]}},
    flower:   {name:'Flower Ring',    sheet:'meadow',    tile:14, hits:1, respawn:35000,  yields:{'Flower':[1,2]}},
    crystal:  {name:'Crystal Cluster',sheet:'cave',      tile:3,  hits:4, respawn:90000,  yields:{'Crystal Shard':[1,2]}},
    ore:      {name:'Ore Vein',       sheet:'cave',      tile:5,  hits:4, respawn:90000,  yields:{'Ore Chunk':[1,2]}},
    gear:     {name:'Gear Block',     sheet:'petro',     tile:6,  hits:4, respawn:110000, yields:{'Gear Part':[1,1]}},
    scrap:    {name:'Scrap Machine',  sheet:'petro',     tile:4,  hits:3, respawn:90000,  yields:{'Gear Part':[1,1],'Stone':[1,2]}},
    pine:     {name:'Great Pine',     sheet:'ruushwood', tile:7,  hits:3, respawn:45000,  yields:{'Wood':[2,4]}},
    logpile:  {name:'Fallen Log',     sheet:'ruushwood', tile:4,  hits:2, respawn:40000,  yields:{'Wood':[1,3]}},
    moonherb: {name:'Moon Herb',      sheet:'moon',      tile:3,  hits:2, respawn:100000, yields:{'Moon Herb':[1,2]}},
    relic:    {name:'Relic Dial',     sheet:'ruins',     tile:4,  hits:4, respawn:150000, yields:{'Ancient Relic':[1,1]}}
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function blank(id, name, tileset, w, h, base) {
    return {id, name, tileset, w, h,
      tiles: Array.from({length: h}, () => Array(w).fill(base)),
      npcs: [], chests: [], monsters: [], portals: [], notes: [], nodes: []};
  }
  function border(m, tile) {
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (x === 0 || y === 0 || x === m.w - 1 || y === m.h - 1) m.tiles[y][x] = tile;
    }
  }
  function rect(m, x0, y0, x1, y1, tile) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.tiles[y][x] = tile;
    }
  }
  function scatter(m, rng, tiles, count, clearOnly = true) {
    const floor = m.tiles[Math.floor(m.h / 2)][Math.floor(m.w / 2)];
    for (let i = 0; i < count; i++) {
      const x = 2 + Math.floor(rng() * (m.w - 4));
      const y = 2 + Math.floor(rng() * (m.h - 4));
      if (!clearOnly || m.tiles[y][x] === floor || m.tiles[y][x] <= 2 || m.tiles[y][x] >= 27) {
        m.tiles[y][x] = tiles[Math.floor(rng() * tiles.length)];
      }
    }
  }
  function grassVariants(m, rng, variants) {
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      if (rng() < 0.18) m.tiles[y][x] = variants[Math.floor(rng() * variants.length)];
    }
  }
  function node(m, kind, tx, ty) {
    m.nodes.push({id: `${m.id}_${kind}_${tx}_${ty}`, kind, tx, ty});
  }
  function portal(m, id, tx, ty, target, sx, sy, label, locked) {
    m.portals.push({id, x: tx * T, y: ty * T, w: 80, h: 80, target,
      spawn: {x: sx * T, y: sy * T}, label, locked: locked || null});
  }
  function mon(m, def) { m.monsters.push({maxHp: def.hp, ...def}); }

  function villageMap() {
    const m = blank('village', 'Birthday Village', 'birthday', 32, 20, 27);
    const rng = mulberry32(7);
    grassVariants(m, rng, [0, 28, 29, 30, 31]);
    border(m, 8);
    // main roads
    rect(m, 2, 9, 29, 9, 2); rect(m, 10, 2, 10, 17, 2); rect(m, 22, 9, 22, 17, 2);
    // plaza + fountain crystal
    rect(m, 8, 7, 13, 11, 2); m.tiles[8][11] = 21;
    // elder hall (north)
    rect(m, 6, 3, 12, 3, 7); rect(m, 6, 4, 12, 4, 22); m.tiles[4][9] = 6;
    // bakery (east)
    rect(m, 16, 5, 19, 5, 7); rect(m, 16, 6, 19, 6, 6);
    // shop (west)
    rect(m, 3, 12, 6, 12, 7); rect(m, 3, 13, 6, 13, 24); m.tiles[13][4] = 6;
    // pond with dock
    rect(m, 24, 12, 29, 16, 3); rect(m, 25, 14, 27, 14, 17);
    // flower gardens + fences
    m.tiles[12][12] = 10; m.tiles[12][13] = 12; m.tiles[13][12] = 11; m.tiles[13][13] = 13;
    rect(m, 14, 15, 18, 15, 5); m.tiles[15][16] = 5;
    m.tiles[6][14] = 14; m.tiles[10][23] = 14;
    scatter(m, rng, [8], 8); scatter(m, rng, [9], 5);
    m.npcs = [
      {id:'elder', name:'Elder Brightbeard', char:'xelar', x:9*T+32, y:5*T+20, role:'Keeper of village legends'},
      {id:'dave', name:'Dave', char:'dave', x:12*T+10, y:9*T+50, role:'Best friend and gadget genius', hideWhenParty:'dave'},
      {id:'berrybun', name:'Grandma Berrybun', char:'haraku', x:17*T+20, y:7*T+10, role:'Baker of heroic cake'},
      {id:'bobo', name:'Bobo Merchant', char:'ruush', x:4*T+32, y:14*T+20, role:'Shopkeeper — press E to trade', shop:true},
      {id:'mila', name:'Mila', char:'haraku', hue:140, x:25*T, y:11*T, role:'Pond dreamer'},
      {id:'pip', name:'Pip', char:'ruush', hue:200, x:13*T, y:12*T+30, role:'Future castle owner'}
    ];
    m.chests = [
      {id:'village_chest', x:7*T, y:15*T, reward:{coins:25, item:'Berry Juice'}, label:'Village chest'},
      {id:'ad_reward_chest', x:19*T, y:12*T, reward:{coins:25}, label:'Optional reward chest', ad:true}
    ];
    node(m, 'berry', 20, 3); node(m, 'berry', 27, 5); node(m, 'flower', 15, 12);
    m.board = {tx: 14, ty: 6}; // daily quest board (sign tile)
    m.digSpots = [[6, 7], [19, 13], [16, 17]];
    portal(m, 'to_meadow', 30, 9, 'meadow', 2, 9, 'Mushroom Meadow');
    portal(m, 'to_cave', 10, 1, 'cave', 2, 8, 'Crystal Cave', 'cave');
    portal(m, 'to_petro', 1, 9, 'petro', 31, 10, 'Petro Plains', 'petro');
    portal(m, 'to_tower', 27, 1, 'tower', 2, 8, 'Bald Moon Tower', 'tower');
    portal(m, 'to_homestead', 22, 18, 'homestead', 18, 3, 'Your Homestead', 'homestead');
    m.notes = [
      {x:11*T, y:8*T, text:'The Village Crystal hums: Courage is the first key.'},
      {x:26*T, y:13*T, text:'The pond sparkles with sleepy fish. They approve of your future garden.'}
    ];
    return m;
  }

  function homesteadMap() {
    const m = blank('homestead', 'Sunrise Homestead', 'birthday', 36, 24, 27);
    const rng = mulberry32(21);
    grassVariants(m, rng, [0, 28, 29, 30, 31]);
    border(m, 8);
    rect(m, 30, 18, 34, 22, 3); // corner pond
    rect(m, 17, 1, 19, 1, 2);   // north gate path
    m.totem = {tx: 18, ty: 6};   // Homestead Crystal (drawn + handled by systems)
    node(m, 'berry', 4, 4); node(m, 'berry', 31, 4); node(m, 'tree', 5, 19);
    node(m, 'rock', 4, 12); node(m, 'flower', 30, 12);
    m.npcs = [
      {id:'dave_home', name:'Dave', char:'dave', x:23*T, y:7*T, role:'Homestead tinkerer', requiresClaimed:true, requiresParty:'dave'},
      {id:'mila_home', name:'Mila', char:'haraku', hue:140, x:28*T, y:16*T, role:'Homestead visitor', requiresClaimed:true, requiresComfort:60},
      {id:'pip_home', name:'Pip', char:'ruush', hue:200, x:10*T, y:16*T, role:'Homestead visitor', requiresClaimed:true, requiresComfort:100}
    ];
    portal(m, 'home_to_village', 18, 0, 'village', 22, 16, 'Birthday Village');
    m.notes = [{x:18*T, y:8*T, text:'Rich soil, open sky, a crystal humming with welcome. This could be home.'}];
    return m;
  }

  function meadowMap() {
    const m = blank('meadow', 'Mushroom Meadow', 'meadow', 34, 20, 1);
    const rng = mulberry32(3);
    grassVariants(m, rng, [0, 2, 3, 20, 24, 28]);
    border(m, 10);
    rect(m, 24, 3, 31, 6, 5);   // lake
    rect(m, 2, 10, 8, 10, 4);   // dirt trail
    rect(m, 8, 10, 8, 14, 4);
    scatter(m, rng, [11], 8); scatter(m, rng, [15], 10); scatter(m, rng, [13], 4);
    node(m, 'tree', 5, 4); node(m, 'tree', 12, 6); node(m, 'tree', 20, 14); node(m, 'tree', 7, 16);
    node(m, 'rock', 15, 3); node(m, 'rock', 27, 15); node(m, 'rock', 3, 7);
    node(m, 'mushroom', 10, 12); node(m, 'mushroom', 18, 8); node(m, 'mushroom2', 24, 11); node(m, 'mushroom2', 14, 17);
    node(m, 'flower', 6, 8); node(m, 'flower', 22, 16); node(m, 'flower', 29, 9);
    mon(m, {id:'slime1', kind:'slime', name:'Slime Sprout', x:11*T, y:8*T, hp:36, atk:7, xp:10, coins:5});
    mon(m, {id:'slime2', kind:'slime', name:'Slime Sprout', x:17*T, y:11*T, hp:36, atk:7, xp:10, coins:5});
    mon(m, {id:'slime3', kind:'slime', name:'Slime Sprout', x:9*T, y:15*T, hp:36, atk:7, xp:10, coins:5});
    mon(m, {id:'mush1', kind:'mushroom', name:'Grumpy Mushroom', x:21*T, y:14*T, hp:58, atk:9, xp:18, coins:10});
    mon(m, {id:'bat1', kind:'bat', name:'Leaf Bat', x:26*T, y:10*T, hp:42, atk:8, xp:14, coins:7});
    mon(m, {id:'moldor', kind:'mushroom', name:'Moldor the Mushroom Grump', x:30*T, y:4*T, hp:130, atk:13, xp:55, coins:35, boss:true});
    m.chests = [
      {id:'meadow_chest_a', x:13*T, y:4*T, reward:{coins:35, item:'Crystal Candy'}, label:'Hidden meadow chest'},
      {id:'meadow_chest_b', x:28*T, y:17*T, reward:{coins:45, item:'Moon Tea'}, label:'Firefly chest'}
    ];
    m.digSpots = [[5, 7], [20, 5], [26, 14]];
    portal(m, 'back_village', 1, 9, 'village', 29, 9, 'Birthday Village');
    portal(m, 'to_ruushwood', 32, 12, 'ruushwood', 2, 10, 'Ruushwood', 'ruushwood');
    m.notes = [{x:5*T, y:10*T, text:'Mushroom Meadow smells like rain, berries and tiny mischief.'}];
    return m;
  }

  function caveMap() {
    const m = blank('cave', 'Crystal Cave', 'cave', 30, 18, 0);
    const rng = mulberry32(11);
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      const r = rng();
      m.tiles[y][x] = r < 0.12 ? 1 : (r < 0.2 ? 2 : 0);
    }
    border(m, 4);
    rect(m, 8, 5, 9, 12, 4); rect(m, 18, 3, 19, 10, 4);   // rock ridges
    rect(m, 13, 14, 16, 15, 6);                            // geode pools
    scatter(m, rng, [7], 6);
    node(m, 'crystal', 4, 4); node(m, 'crystal', 12, 9); node(m, 'crystal', 24, 5); node(m, 'crystal', 21, 14);
    node(m, 'ore', 6, 13); node(m, 'ore', 15, 4); node(m, 'ore', 26, 11); node(m, 'ore', 11, 15);
    node(m, 'rock', 17, 12);
    mon(m, {id:'crystal1', kind:'crystal', name:'Crystal Spider', x:10*T, y:7*T, hp:86, atk:14, xp:32, coins:25});
    mon(m, {id:'rockslime', kind:'slime', name:'Rock Slime', x:14*T, y:11*T, hp:70, atk:12, xp:26, coins:18, hue:180});
    mon(m, {id:'cavebat', kind:'bat', name:'Cave Bat', x:22*T, y:8*T, hp:64, atk:13, xp:28, coins:20, hue:220});
    mon(m, {id:'guardian', kind:'crystal', name:'Cracked Crystal Guardian', x:26*T, y:9*T, hp:190, atk:18, xp:85, coins:70, boss:true});
    m.chests = [{id:'cave_chest', x:20*T, y:3*T, reward:{coins:70, item:'Guardian Shard'}, label:'Glowing crystal chest'}];
    m.digSpots = [[5, 5], [22, 12], [14, 8]];
    portal(m, 'back_village_cave', 1, 8, 'village', 10, 2, 'Birthday Village');
    m.notes = [{x:5*T, y:8*T, text:'The crystals sing in chords. Mine gently and they sing brighter.'}];
    return m;
  }

  function petroMap() {
    const m = blank('petro', 'Petro Plains', 'petro', 34, 20, 0);
    const rng = mulberry32(17);
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      const r = rng();
      m.tiles[y][x] = r < 0.15 ? 1 : (r < 0.2 ? 2 : 0);
    }
    border(m, 7);
    rect(m, 6, 8, 27, 8, 5); rect(m, 16, 8, 16, 16, 5);   // plank roads
    rect(m, 10, 3, 13, 4, 7); rect(m, 22, 13, 24, 14, 7); // hazard blocks
    m.tiles[5][28] = 3; m.tiles[15][6] = 3;               // furnace emblems
    node(m, 'gear', 4, 5); node(m, 'gear', 19, 12); node(m, 'gear', 29, 16); node(m, 'gear', 8, 15);
    node(m, 'scrap', 14, 6); node(m, 'scrap', 25, 4); node(m, 'scrap', 30, 10);
    node(m, 'rock', 20, 16); node(m, 'rock', 5, 11);
    mon(m, {id:'oilslime', kind:'slime', name:'Oil Slime', x:12*T, y:11*T, hp:95, atk:16, xp:38, coins:26, hue:260});
    mon(m, {id:'rustbat', kind:'bat', name:'Rust Bat', x:20*T, y:6*T, hp:88, atk:17, xp:40, coins:28, hue:30});
    mon(m, {id:'gearGolem', kind:'crystal', name:'Gear Golem', x:26*T, y:12*T, hp:120, atk:19, xp:48, coins:34, hue:60});
    mon(m, {id:'petro_titan', kind:'crystal', name:'Petro Titan', x:30*T, y:5*T, hp:260, atk:23, xp:120, coins:110, boss:true, hue:40});
    m.chests = [{id:'petro_chest', x:9*T, y:17*T, reward:{coins:60, item:'Crystal Candy'}, label:'Rusted supply chest'}];
    m.npcs = [
      {id:'petroman', name:'Petroman', char:'petroman', x:17*T, y:9*T+40, role:'Machine whisperer', hideWhenParty:'petroman'}
    ];
    m.digSpots = [[7, 4], [22, 10], [30, 14]];
    portal(m, 'petro_to_village', 32, 10, 'village', 2, 9, 'Birthday Village');
    m.notes = [{x:7*T, y:9*T, text:'Old plank roads hum underfoot. The machines only sleep.'}];
    return m;
  }

  function ruushwoodMap() {
    const m = blank('ruushwood', 'Ruushwood', 'ruushwood', 34, 20, 0);
    const rng = mulberry32(29);
    grassVariants(m, rng, [1]);
    border(m, 5);
    rect(m, 12, 4, 12, 15, 2); rect(m, 13, 4, 14, 4, 2);  // stream
    scatter(m, rng, [3], 8); scatter(m, rng, [6], 5);
    node(m, 'pine', 5, 5); node(m, 'pine', 9, 12); node(m, 'pine', 18, 7); node(m, 'pine', 24, 15); node(m, 'pine', 28, 5);
    node(m, 'logpile', 7, 16); node(m, 'logpile', 21, 11); node(m, 'logpile', 30, 12);
    node(m, 'mushroom', 16, 14); node(m, 'flower', 26, 9); node(m, 'berry', 10, 3);
    mon(m, {id:'mossslime', kind:'slime', name:'Moss Slime', x:8*T, y:9*T, hp:120, atk:19, xp:50, coins:32, hue:90});
    mon(m, {id:'woodshroom', kind:'mushroom', name:'Barkcap Bruiser', x:19*T, y:12*T, hp:150, atk:21, xp:58, coins:38, hue:40});
    mon(m, {id:'forestbat', kind:'bat', name:'Forest Bat', x:25*T, y:7*T, hp:110, atk:20, xp:52, coins:34, hue:120});
    mon(m, {id:'treeguard', kind:'mushroom', name:'Elder Treeguard', x:30*T, y:16*T, hp:320, atk:26, xp:150, coins:130, boss:true, hue:100});
    m.chests = [{id:'ruush_chest', x:15*T, y:17*T, reward:{coins:80, item:'Mushroom Stew'}, label:'Mossy chest'}];
    m.npcs = [
      {id:'ruush', name:'Ruush', char:'ruush', x:27*T, y:13*T, role:'Silent forest scout', hideWhenParty:'ruush'}
    ];
    m.digSpots = [[6, 8], [16, 16], [26, 4]];
    portal(m, 'ruush_to_meadow', 1, 10, 'meadow', 31, 12, 'Mushroom Meadow');
    portal(m, 'to_moon', 20, 1, 'moon', 14, 15, 'Moon Shrine', 'moon');
    m.notes = [{x:13*T, y:6*T, text:'Wind arcs dance between the pines. The forest is watching, kindly.'}];
    return m;
  }

  function moonMap() {
    const m = blank('moon', 'Moon Shrine', 'moon', 28, 18, 0);
    const rng = mulberry32(31);
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      const r = rng();
      m.tiles[y][x] = r < 0.15 ? 1 : (r < 0.22 ? 2 : 0);
    }
    border(m, 5);
    rect(m, 11, 4, 16, 4, 7); rect(m, 11, 8, 16, 8, 7);  // rune walls
    rect(m, 13, 5, 14, 7, 6);                            // star pools (shrine heart)
    m.tiles[6][13] = 0; m.tiles[6][14] = 0;
    scatter(m, rng, [4], 4);
    node(m, 'moonherb', 4, 4); node(m, 'moonherb', 22, 5); node(m, 'moonherb', 7, 13); node(m, 'moonherb', 19, 14); node(m, 'moonherb', 24, 11);
    node(m, 'rock', 9, 9);
    mon(m, {id:'starslime', kind:'slime', name:'Star Slime', x:8*T, y:6*T, hp:150, atk:23, xp:65, coins:42, hue:300});
    mon(m, {id:'moonbat', kind:'bat', name:'Moon Bat', x:20*T, y:9*T, hp:140, atk:24, xp:68, coins:44, hue:280});
    mon(m, {id:'voidcrystal', kind:'crystal', name:'Void Crystal', x:12*T, y:12*T, hp:170, atk:26, xp:72, coins:48, hue:260});
    mon(m, {id:'lunar_shade', kind:'xelar', name:'The Lunar Shade', x:24*T, y:3*T, hp:380, atk:30, xp:180, coins:160, boss:true, hue:200});
    m.chests = [{id:'moon_chest', x:3*T, y:15*T, reward:{coins:90, item:'Moonfruit Seed'}, label:'Starlit chest'}];
    m.npcs = [
      {id:'haraku', name:'Haraku', char:'haraku', x:14*T-20, y:6*T+10, role:'Shrine keeper', hideWhenParty:'haraku'}
    ];
    m.digSpots = [[5, 6], [20, 12], [11, 14]];
    portal(m, 'moon_to_ruush', 14, 17, 'ruushwood', 20, 2, 'Ruushwood');
    portal(m, 'to_ruins', 1, 9, 'ruins', 28, 9, 'Ancient Ruins', 'ruins');
    m.notes = [{x:10*T, y:10*T, text:'Two moons share this sky. One of them is humming your name.'}];
    return m;
  }

  function ruinsMap() {
    const m = blank('ruins', 'Ancient Ruins', 'ruins', 30, 18, 0);
    const rng = mulberry32(41);
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      const r = rng();
      m.tiles[y][x] = r < 0.25 ? 1 : (r < 0.4 ? 2 : (r < 0.48 ? 5 : 0));
    }
    border(m, 6);
    rect(m, 6, 4, 6, 13, 6); rect(m, 23, 4, 23, 13, 6);   // pillar rows
    rect(m, 10, 8, 19, 8, 5);                             // moss avenue
    m.tiles[3][14] = 3; m.tiles[3][15] = 3;               // sealed door slabs
    scatter(m, rng, [7], 5);
    node(m, 'relic', 4, 15); node(m, 'relic', 14, 5); node(m, 'relic', 26, 14); node(m, 'relic', 20, 12);
    node(m, 'rock', 9, 14); node(m, 'ore', 27, 4);
    mon(m, {id:'relicgolem', kind:'crystal', name:'Relic Golem', x:9*T, y:6*T, hp:200, atk:28, xp:85, coins:56, hue:120});
    mon(m, {id:'tombbat', kind:'bat', name:'Tomb Bat', x:17*T, y:12*T, hp:180, atk:27, xp:80, coins:52, hue:160});
    mon(m, {id:'ancientshroom', kind:'mushroom', name:'Ancient Sporecap', x:24*T, y:8*T, hp:210, atk:29, xp:90, coins:60, hue:180});
    mon(m, {id:'guardian_prime', kind:'crystal', name:'Guardian Prime', x:14*T, y:4*T+30, hp:460, atk:34, xp:220, coins:200, boss:true, hue:150});
    mon(m, {id:'gemkin_avatar', kind:'xelar', name:'Gemkin Avatar', x:4*T, y:4*T, hp:900, atk:44, xp:500, coins:500, boss:true, hue:120, requiresGems:7});
    m.chests = [{id:'ruins_chest', x:27*T, y:15*T, reward:{coins:120, item:'Courage Crumble'}, label:'Kingly chest'}];
    m.digSpots = [[8, 10], [18, 14], [25, 6]];
    portal(m, 'ruins_to_moon', 29, 9, 'moon', 2, 9, 'Moon Shrine');
    m.notes = [{x:12*T, y:9*T, text:'The old kings built with gold pillars and moss. Take notes for your keep.'}];
    return m;
  }

  function towerMap() {
    const m = blank('tower', 'Bald Moon Tower', 'tower', 26, 16, 0);
    const rng = mulberry32(53);
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      const r = rng();
      m.tiles[y][x] = r < 0.15 ? 1 : (r < 0.25 ? 2 : 0);
    }
    border(m, 6);
    rect(m, 12, 2, 12, 13, 6); rect(m, 13, 8, 24, 8, 6);
    m.tiles[8][12] = 2; m.tiles[8][13] = 2;               // gate gaps
    m.tiles[2][3] = 3; m.tiles[13][22] = 3;               // banners
    scatter(m, rng, [5], 4); scatter(m, rng, [4], 3);
    mon(m, {id:'shadowslime', kind:'slime', name:'Shadow Slime', x:6*T, y:5*T, hp:220, atk:30, xp:95, coins:62, hue:230});
    mon(m, {id:'voidbat', kind:'bat', name:'Void Bat', x:8*T, y:12*T, hp:200, atk:31, xp:98, coins:64, hue:250});
    mon(m, {id:'darkcrystal', kind:'crystal', name:'Dark Crystal', x:17*T, y:5*T, hp:250, atk:33, xp:105, coins:70, hue:290});
    mon(m, {id:'xelar_echo', kind:'xelar', name:"Xelar's Echo", x:20*T, y:11*T, hp:420, atk:34, xp:200, coins:170, boss:true, hue:40});
    mon(m, {id:'xelar_final', kind:'xelar', name:'Xelar the Bald Wizard', x:23*T, y:3*T, hp:640, atk:40, xp:400, coins:400, boss:true, final:true,
      requiresDefeated:'xelar_echo'});
    m.chests = [{id:'tower_chest', x:3*T, y:13*T, reward:{coins:150, item:'Moon Tea'}, label:'Wizard supply chest'}];
    portal(m, 'back_village_tower', 1, 8, 'village', 27, 2, 'Birthday Village');
    m.notes = [{x:5*T, y:8*T, text:'Xelar\'s X sigils crackle. Somewhere above, a bald head gleams with menace.'}];
    return m;
  }

  SSG.buildMaps = () => ({
    village: villageMap(),
    homestead: homesteadMap(),
    meadow: meadowMap(),
    cave: caveMap(),
    petro: petroMap(),
    ruushwood: ruushwoodMap(),
    moon: moonMap(),
    ruins: ruinsMap(),
    tower: towerMap()
  });

  SSG.WORLD_NODES = [
    ['village', 'Birthday Village', 300, 250],
    ['homestead', 'Sunrise Homestead', 300, 350],
    ['meadow', 'Mushroom Meadow', 470, 230],
    ['cave', 'Crystal Cave', 330, 130],
    ['petro', 'Petro Plains', 150, 220],
    ['ruushwood', 'Ruushwood', 620, 260],
    ['moon', 'Moon Shrine', 640, 140],
    ['ruins', 'Ancient Ruins', 500, 90],
    ['tower', 'Bald Moon Tower', 730, 70]
  ];
})();
