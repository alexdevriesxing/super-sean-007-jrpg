/* Super Sean 007 — build pieces, blueprints and homestead progression data.
   Tile index reference (index = row*8 + col on each 512x256 sheet):
     birthday: 0 flower grass, 1 sand, 2 cobble, 3 water, 4 wood wall, 5 fence,
               6 cottage door wall, 7 red roof, 8 tree, 9 hedge, 10-13 flowerbeds,
               14 sign, 16-19 bridge planks, 20 chest, 21 crystal, 22-26 stone walls, 27-31 grass
     meadow:   4 dirt, 5 water, 6-9 mushrooms, 10 tree, 11 bush, 12 log, 13 stump,
               14 flower ring, 15 sprout, 16 rock, 17 lamp post, 18 potion block, 19 chest
     cave:     3 crystal, 4 rock wall, 5 ore vein, 6 geode pool, 7 stalagmite
     petro:    3 stove emblem, 4 machine, 5 plank floor, 6 gear block, 7 hazard block
     ruushwood:3 wind arc, 4 log rail, 5 great hill, 6 cloud, 7 pine tree
     moon:     3 moon emblem, 4 dream tablet, 5 pyramid sigil, 6 star pool, 7 rune slab
     ruins:    2 moss floor, 3 door slab, 4 sun dial, 5 moss path, 6 gold pillars, 7 broken block
     tower:    2 crimson floor, 3 banner, 4 dome statue, 5 X sigil, 6 striped wall, 7 spire */
(() => {
  'use strict';
  window.SSG = window.SSG || {};

  SSG.BUILD_CATEGORIES = ['Floors', 'Walls & Roofs', 'Fences', 'Garden', 'Water', 'Decor', 'Stations'];

  // solid: blocks walking. comfort: homestead score. cost: materials per tile.
  SSG.BUILD_PIECES = [
    {id:'cobble',    name:'Cobble Path',    cat:'Floors', sheet:'birthday', tile:2,  solid:false, cost:{'Stone':1}, comfort:1},
    {id:'sandpath',  name:'Sand Path',      cat:'Floors', sheet:'birthday', tile:1,  solid:false, cost:{'Stone':1}, comfort:1},
    {id:'plankfloor',name:'Plank Floor',    cat:'Floors', sheet:'petro',    tile:5,  solid:false, cost:{'Plank':1}, comfort:1},
    {id:'mossfloor', name:'Moss Floor',     cat:'Floors', sheet:'ruins',    tile:2,  solid:false, cost:{'Stone':1,'Flower':1}, comfort:1},
    {id:'moonfloor', name:'Twilight Tiles', cat:'Floors', sheet:'moon',     tile:1,  solid:false, cost:{'Stone Brick':1,'Moon Herb':1}, comfort:2},
    {id:'carpet',    name:'Crimson Carpet', cat:'Floors', sheet:'tower',    tile:2,  solid:false, cost:{'Flower':2}, comfort:2},

    {id:'woodwall',  name:'Wood Wall',      cat:'Walls & Roofs', sheet:'birthday', tile:4,  solid:true, cost:{'Plank':2}, comfort:2},
    {id:'stonewall', name:'Stone Wall',     cat:'Walls & Roofs', sheet:'birthday', tile:22, solid:true, cost:{'Stone Brick':2}, comfort:2},
    {id:'shutterwall',name:'Shutter Wall',  cat:'Walls & Roofs', sheet:'birthday', tile:24, solid:true, cost:{'Stone Brick':1,'Plank':1}, comfort:2},
    {id:'cottagedoor',name:'Cottage Door',  cat:'Walls & Roofs', sheet:'birthday', tile:6,  solid:false, cost:{'Plank':2,'Stone':1}, comfort:3},
    {id:'rockwall',  name:'Rock Wall',      cat:'Walls & Roofs', sheet:'cave',     tile:4,  solid:true, cost:{'Stone':2}, comfort:1},
    {id:'keepwall',  name:'Keep Wall',      cat:'Walls & Roofs', sheet:'tower',    tile:6,  solid:true, cost:{'Stone Brick':3}, comfort:3},
    {id:'pillar',    name:'Gold Pillar',    cat:'Walls & Roofs', sheet:'ruins',    tile:6,  solid:true, cost:{'Stone Brick':2,'Ancient Relic':1}, comfort:4},
    {id:'runewall',  name:'Rune Slab',      cat:'Walls & Roofs', sheet:'moon',     tile:7,  solid:true, cost:{'Stone Brick':2,'Moon Herb':1}, comfort:3},
    {id:'redroof',   name:'Red Roof',       cat:'Walls & Roofs', sheet:'birthday', tile:7,  solid:true, cost:{'Plank':2}, comfort:2},
    {id:'spire',     name:'Keep Spire',     cat:'Walls & Roofs', sheet:'tower',    tile:7,  solid:true, cost:{'Stone Brick':2,'Ore Chunk':1}, comfort:3},
    {id:'dome',      name:'Moon Dome',      cat:'Walls & Roofs', sheet:'tower',    tile:4,  solid:true, cost:{'Stone Brick':2,'Crystal Shard':1}, comfort:3},

    {id:'fence',     name:'Garden Fence',   cat:'Fences', sheet:'birthday',  tile:5,  solid:true, cost:{'Wood':1}, comfort:1},
    {id:'lograil',   name:'Log Rail',       cat:'Fences', sheet:'ruushwood', tile:4,  solid:true, cost:{'Wood':1}, comfort:1},
    {id:'hedge',     name:'Berry Hedge',    cat:'Fences', sheet:'birthday',  tile:9,  solid:true, cost:{'Berry':1,'Wood':1}, comfort:2},

    {id:'soil',      name:'Tilled Soil',    cat:'Garden', sheet:'meadow',   tile:4,  solid:false, cost:{'Wood':1}, comfort:1, station:'soil'},
    {id:'flowerbedA',name:'Flowerbed',      cat:'Garden', sheet:'birthday', tile:10, solid:true, cost:{'Wood':1,'Flower':1}, comfort:3},
    {id:'flowerbedB',name:'Tulip Bed',      cat:'Garden', sheet:'birthday', tile:12, solid:true, cost:{'Wood':1,'Flower':1}, comfort:3},
    {id:'flowerring',name:'Flower Ring',    cat:'Garden', sheet:'meadow',   tile:14, solid:false, cost:{'Flower':2}, comfort:2},
    {id:'tree',      name:'Shade Tree',     cat:'Garden', sheet:'birthday', tile:8,  solid:true, cost:{'Wood':2}, comfort:3},
    {id:'pine',      name:'Pine Tree',      cat:'Garden', sheet:'ruushwood',tile:7,  solid:true, cost:{'Wood':2}, comfort:3},
    {id:'mushdecor', name:'Giant Mushroom', cat:'Garden', sheet:'meadow',   tile:6,  solid:true, cost:{'Mushroom Cap':2}, comfort:2},
    {id:'stump',     name:'Sitting Stump',  cat:'Garden', sheet:'meadow',   tile:13, solid:true, cost:{'Wood':1}, comfort:1},

    {id:'pond',      name:'Garden Pond',    cat:'Water', sheet:'birthday', tile:3,  solid:true, cost:{'Stone':2}, comfort:2},
    {id:'starpool',  name:'Star Pool',      cat:'Water', sheet:'moon',     tile:6,  solid:true, cost:{'Stone Brick':2,'Crystal Shard':1}, comfort:4},
    {id:'geode',     name:'Geode Basin',    cat:'Water', sheet:'cave',     tile:6,  solid:true, cost:{'Stone':2,'Crystal Shard':1}, comfort:3},

    {id:'sign',      name:'Wooden Sign',    cat:'Decor', sheet:'birthday', tile:14, solid:false, cost:{'Plank':1}, comfort:1},
    {id:'lamppost',  name:'Lamp Post',      cat:'Decor', sheet:'meadow',   tile:17, solid:true, cost:{'Wood':1,'Crystal Shard':1}, comfort:2},
    {id:'crystal',   name:'Crystal Lamp',   cat:'Decor', sheet:'birthday', tile:21, solid:true, cost:{'Crystal Shard':2}, comfort:3},
    {id:'sundial',   name:'Sun Dial',       cat:'Decor', sheet:'ruins',    tile:4,  solid:true, cost:{'Stone Brick':1,'Ancient Relic':1}, comfort:4},
    {id:'banner',    name:'Hero Banner',    cat:'Decor', sheet:'tower',    tile:3,  solid:false, cost:{'Flower':1,'Plank':1}, comfort:2},
    {id:'moonemblem',name:'Moon Emblem',    cat:'Decor', sheet:'moon',     tile:3,  solid:false, cost:{'Moon Herb':1,'Stone':1}, comfort:3},
    {id:'stonelantern',name:'Stalagmite Statue', cat:'Decor', sheet:'cave', tile:7, solid:true, cost:{'Stone':2}, comfort:2},

    {id:'workbench', name:'Workbench',      cat:'Stations', sheet:'petro',    tile:4,  solid:true, cost:{'Plank':4,'Stone':2}, comfort:4, station:'workbench'},
    {id:'kitchen',   name:'Cozy Kitchen',   cat:'Stations', sheet:'petro',    tile:3,  solid:true, cost:{'Stone Brick':3,'Wood':3}, comfort:4, station:'kitchen'},
    {id:'forge',     name:'Crystal Forge',  cat:'Stations', sheet:'petro',    tile:6,  solid:true, cost:{'Stone Brick':4,'Ore Chunk':2,'Crystal Shard':2}, comfort:5, station:'forge'},
    {id:'bed',       name:'Dream Bed',      cat:'Stations', sheet:'moon',     tile:4,  solid:true, cost:{'Plank':3,'Flower':2}, comfort:5, station:'bed'},
    {id:'storage',   name:'Storage Chest',  cat:'Stations', sheet:'birthday', tile:20, solid:true, cost:{'Plank':2,'Stone':1}, comfort:2, station:'storage'}
  ];

  // Blueprint grids use piece ids; null = leave tile untouched.
  const C = 'cottagedoor', W = 'woodwall', R = 'redroof', P = 'plankfloor',
        K = 'keepwall', S = 'spire', D = 'dome', T = 'carpet', B = 'banner',
        F = 'fence', G = 'soil', E = 'tree', O = 'runewall', X = 'starpool', M = 'moonfloor';
  SSG.BLUEPRINTS = [
    {id:'cottage', name:'Cozy Cottage', desc:'A warm starter home with plank floors.',
      grid:[
        [R, R, R, R, R],
        [W, P, P, P, W],
        [W, P, P, P, W],
        [W, W, C, W, W]
      ]},
    {id:'keep', name:'Stone Keep', desc:'A castle keep with spires and banners.',
      grid:[
        [S, K, K, K, K, K, S],
        [K, T, T, B, T, T, K],
        [K, T, T, T, T, T, K],
        [K, T, T, T, T, T, K],
        [S, K, D, T, D, K, S]
      ]},
    {id:'garden', name:'Garden Patch', desc:'Fenced soil beds ready for seeds.',
      grid:[
        [F, F, F, F, F],
        [F, G, G, G, F],
        [F, G, G, G, F],
        [F, F, null, F, F]
      ]},
    {id:'orchard', name:'Orchard', desc:'A tidy grove of shade trees.',
      grid:[
        [E, null, E, null, E],
        [null, null, null, null, null],
        [E, null, E, null, E]
      ]},
    {id:'shrine', name:'Star Shrine', desc:'A moonlit pool ringed by rune slabs.',
      grid:[
        [O, M, O],
        [M, X, M],
        [O, M, O]
      ]}
  ];

  // Buildable area per homestead level (tiles, centered on map) and upgrade costs.
  SSG.HOMESTEAD_LEVELS = [
    {level:1, w:14, h:10, cost:null},
    {level:2, w:22, h:14, cost:{'Wood':20,'Stone':20}},
    {level:3, w:30, h:18, cost:{'Plank':25,'Stone Brick':25,'Crystal Shard':5}},
    {level:4, w:34, h:22, cost:{'Gear Part':8,'Moon Herb':8,'Ancient Relic':6}}
  ];

  SSG.COMFORT_PERKS = [
    {at:25,  id:'xp',       label:'Rested Heart: +10% battle XP'},
    {at:60,  id:'discount', label:'Friendly Fame: 15% shop discount'},
    {at:100, id:'aura',     label:'Home Aura: +2 ATK and +2 DEF'},
    {at:150, id:'gift',     label:'Gift Chest: daily coins at the Homestead Crystal'}
  ];
})();
