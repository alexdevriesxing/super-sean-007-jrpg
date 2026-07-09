(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const GAME_W = 960;
  const GAME_H = 540;
  const TILE = 64;
  canvas.width = GAME_W;
  canvas.height = GAME_H;

  const criticalImageList = {
    sean: 'assets/characters/sean_strip.png',
    dave: 'assets/characters/dave_strip.png',
    petroman: 'assets/characters/petroman_strip.png',
    haraku: 'assets/characters/haraku_strip.png',
    ruush: 'assets/characters/ruush_strip.png',
    xelar: 'assets/characters/xelar_portrait.png',
    slime: 'assets/characters/enemy_slime.png',
    mushroom: 'assets/characters/enemy_mushroom.png',
    bat: 'assets/characters/enemy_bat.png',
    crystal: 'assets/characters/enemy_crystal.png',
    birthday: 'assets/tilesets/birthday_village_tiles.png',
    meadow: 'assets/tilesets/mushroom_meadow_tiles.png',
    cave: 'assets/tilesets/crystal_cave_tiles.png',
    petro: 'assets/tilesets/petro_plains_tiles.png',
    ruushwood: 'assets/tilesets/ruushwood_tiles.png',
    moon: 'assets/tilesets/moon_shrine_tiles.png',
    ruins: 'assets/tilesets/ancient_ruins_tiles.png',
    tower: 'assets/tilesets/bald_moon_tower_tiles.png',

    // Wired-in expanded asset pack backgrounds and key art
    keyArtMain: 'assets/key-art-main.png',
    bgCountryside: 'assets/generated/battle_backgrounds/vrolijk_fantasielandschap_met_cottages.png',
    bgFarm: 'assets/generated/battle_backgrounds/zonnig_boerderijlandschap_met_houten_hek.png',
    bgMountain: 'assets/generated/battle_backgrounds/magisch_landschap_met_kristallen_en_watervallen.png',
    bgLake: 'assets/generated/battle_backgrounds/fantasierijk_landschap_met_een_meer.png',
    bgRiver: 'assets/generated/battle_backgrounds/vrolijke_natuurlijke_strijdarena_met_riviertje.png',
    bgVillage: 'assets/generated/battle_backgrounds/zonnig_fantasiedorp_met_kastelen_en_brug.png',
    bgSky: 'assets/generated/battle_backgrounds/magische_luchtlandschappen_met_kristallen_toppen.png',
    bgWinter: 'assets/generated/battle_backgrounds/betoverend_winterlandschap_met_kristallen.png',
    bgFlowers: 'assets/generated/battle_backgrounds/sfeervol_bloemenlandschap_met_fruitbomen.png',
    bgAutumn: 'assets/generated/battle_backgrounds/herfstlandschap_met_pompoenen_en_bladeren.png'
  };

  const img = {};
  const keys = {};
  const activeTouches = {up:false,down:false,left:false,right:false};
  const runtime = {
    assetWiring: null,
    slicedAssets: null,
    assetWarnings: [],
    frameAccumulator: 0,
    deterministic: false
  };

  const AssetManager = {
    async init() {
      const [assetWiring, slicedAssets] = await Promise.all([
        fetchJson('data/asset-wiring.json'),
        fetchJson('data/sliced-assets.json')
      ]);
      runtime.assetWiring = assetWiring || {};
      runtime.slicedAssets = slicedAssets || {sheets:{}, frames:[]};
      await this.preloadImages(this.imageListFromWiring());
    },
    imageListFromWiring() {
      const list = {...criticalImageList};
      const backgrounds = runtime.assetWiring?.battleBackgrounds || {};
      Object.entries(backgrounds).forEach(([key, file]) => {
        list[`bg_${key}`] = file;
      });
      return list;
    },
    preloadImages(list) {
      const entries = Object.entries(list);
      if (!entries.length) return Promise.resolve();
      let loaded = 0;
      return new Promise(resolve => {
        entries.forEach(([k, src]) => {
          const im = new Image();
          im.onload = () => { loaded++; if (loaded === entries.length) resolve(); };
          im.onerror = () => {
            runtime.assetWarnings.push(src);
            console.warn('[AssetManager] Missing image', src);
            loaded++;
            if (loaded === entries.length) resolve();
          };
          im.src = src;
          img[k] = im;
        });
      });
    },
    getFrame(sheet, index = 0) {
      return runtime.slicedAssets?.frames?.find(frame => frame.sheet === sheet && frame.index === index) || null;
    },
    drawCharacterFrame(context, char, frame, x, y, width, height) {
      const sheet = runtime.slicedAssets?.sheets?.[char];
      const source = img[char] || img.sean;
      if (!source || !source.complete) return false;
      if (sheet) {
        const safeFrame = frame % Math.max(1, sheet.frameCount || 1);
        const col = safeFrame % Math.max(1, Math.floor(sheet.sourceWidth / sheet.frameWidth));
        const row = Math.floor(safeFrame / Math.max(1, Math.floor(sheet.sourceWidth / sheet.frameWidth)));
        context.drawImage(source, col * sheet.frameWidth, row * sheet.frameHeight, sheet.frameWidth, sheet.frameHeight, x, y, width, height);
        return true;
      }
      context.drawImage(source, frame * 88, 0, 88, 88, x, y, width, height);
      return true;
    }
  };

  const AudioManager = {
    manifest: null,
    music: {},
    sfx: {},
    currentMusic: null,
    pendingMusic: null,
    unlocked: false,
    musicMuted: readBool('super-sean-007-music-muted', false),
    sfxMuted: readBool('super-sean-007-sfx-muted', false),
    async init() {
      this.manifest = await fetchJson('data/audio-manifest.json');
      const music = this.manifest?.music || {};
      const sfx = this.manifest?.sfx || {};
      Object.entries(music).forEach(([id, entry]) => {
        const audio = new Audio(entry.file);
        audio.loop = Boolean(entry.loop);
        audio.preload = 'auto';
        audio.volume = 0.28;
        this.music[id] = audio;
      });
      Object.entries(sfx).forEach(([id, entry]) => {
        const audio = new Audio(entry.file);
        audio.preload = 'auto';
        audio.volume = 0.45;
        this.sfx[id] = audio;
      });
    },
    unlock() {
      if (this.unlocked) return;
      this.unlocked = true;
      const pending = this.pendingMusic || (state.scene === 'title' ? 'title' : 'village');
      this.pendingMusic = null;
      this.playMusic(pending);
    },
    playMusic(id) {
      if (this.musicMuted) return;
      if (!this.unlocked) {
        this.pendingMusic = id;
        return;
      }
      const next = this.music[id];
      if (!next || this.currentMusic === next) return;
      if (this.currentMusic) this.currentMusic.pause();
      next.currentTime = 0;
      next.play().catch(() => {});
      this.currentMusic = next;
    },
    playSfx(id) {
      if (this.sfxMuted || !this.unlocked) return;
      const base = this.sfx[id];
      if (!base) return;
      const sound = base.cloneNode();
      sound.volume = base.volume;
      sound.play().catch(() => {});
    },
    toggleMusic() {
      this.musicMuted = !this.musicMuted;
      writeBool('super-sean-007-music-muted', this.musicMuted);
      if (this.musicMuted && this.currentMusic) this.currentMusic.pause();
      if (!this.musicMuted) this.playMusic(this.pendingMusic || (state.scene === 'battle' ? 'battle' : state.scene === 'title' ? 'title' : 'village'));
      showToast(`Music ${this.musicMuted ? 'muted' : 'enabled'}.`);
    },
    toggleSfx() {
      this.sfxMuted = !this.sfxMuted;
      writeBool('super-sean-007-sfx-muted', this.sfxMuted);
      showToast(`SFX ${this.sfxMuted ? 'muted' : 'enabled'}.`);
    },
    status() {
      return {
        unlocked: this.unlocked,
        musicMuted: this.musicMuted,
        sfxMuted: this.sfxMuted,
        musicTracks: Object.keys(this.music).length,
        sfx: Object.keys(this.sfx).length
      };
    }
  };

  const AdManager = {
    config: null,
    lastInterstitialAt: 0,
    lastRewardByType: {},
    async init() {
      this.config = await fetchJson('data/ad-config.json') || {enabled:false, placements:{}, rewarded:{}};
      Object.keys(this.config.placements || {}).forEach(placement => this.showBanner(placement));
    },
    showBanner(placement) {
      const slot = this.findSlot(placement);
      if (!slot) return false;
      slot.hidden = false;
      slot.dataset.adStatus = this.config?.enabled ? 'ready-for-script' : 'placeholder';
      return true;
    },
    hideBanner(placement) {
      const slot = this.findSlot(placement);
      if (!slot) return false;
      slot.hidden = true;
      return true;
    },
    showInterstitial(reason) {
      const safeReasons = this.config?.safeInterstitialReasons || [];
      const minimumMs = (this.config?.minimumInterstitialSeconds || 180) * 1000;
      const now = Date.now();
      if (!safeReasons.includes(reason)) return false;
      if (['battle','dialogue'].includes(state.scene)) return false;
      if (now - this.lastInterstitialAt < minimumMs) return false;
      this.lastInterstitialAt = now;
      console.info('[AdManager] interstitial placeholder:', reason);
      return true;
    },
    canShowRewardedAd(type) {
      const rewarded = this.config?.rewarded?.[type];
      if (!rewarded || rewarded.enabled === false) return false;
      const cooldown = (rewarded.cooldownSeconds || 0) * 1000;
      const last = this.lastRewardByType[type] || 0;
      return Date.now() - last >= cooldown;
    },
    showRewardedAd(type, onSuccess) {
      if (!this.canShowRewardedAd(type)) {
        showToast('Reward is cooling down. Try again soon.');
        return false;
      }
      this.lastRewardByType[type] = Date.now();
      state.lastAdReward = Date.now();
      AudioManager.playSfx('reward');
      showToast('Rewarded ad placeholder completed.');
      setTimeout(() => onSuccess && onSuccess(), 250);
      save();
      return true;
    },
    findSlot(placement) {
      const selector = this.config?.placements?.[placement]?.selector || `[data-adsterra-placement="${placement}"]`;
      return document.querySelector(selector);
    }
  };

  const defaultState = () => ({
    scene: 'title',
    mapId: 'village',
    player: {x: 8*TILE, y: 8*TILE, speed: 3.1, dir:'down', frameTimer:0, frame:0},
    party: ['sean','dave'],
    unlocked: {meadow:true, cave:false, petro:false, ruushwood:false, moon:false, ruins:false, tower:false},
    hero: {level:1, xp:0, xpNext:30, hp:120, maxHp:120, mp:32, maxMp:32, attack:15, defense:8, coins:40, friendship:0},
    items: {'Berry Juice':3, 'Crystal Candy':1},
    flags: {},
    quest: {id:'awakening', title:'The Birthday Crystal', objective:'Talk to Elder Brightbeard in Birthday Village.', slimes:0, chests:0},
    chestsOpened: {},
    defeatedBosses: {},
    playMinutes:0,
    lastAdReward:0
  });

  let state = defaultState();
  let maps = {};
  let dialogue = null;
  let toast = '';
  let toastTimer = 0;
  let battle = null;
  let mouse = {x:0,y:0,clicked:false};
  let lastTime = 0;

  async function fetchJson(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.warn(`[Runtime] Could not load ${url}`, error);
      return null;
    }
  }

  function readBool(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value === 'true';
    } catch(e) {
      return fallback;
    }
  }

  function writeBool(key, value) {
    try { localStorage.setItem(key, String(value)); } catch(e) {}
  }

  function generateMaps() {
    maps = {
      village: createVillageMap(),
      meadow: createMeadowMap(),
      cave: createCaveMap(),
      tower: createTowerMap()
    };
  }

  function blankMap(id, name, tileset, w, h, base = 0) {
    return {id, name, tileset, w, h, tiles: Array.from({length:h}, () => Array(w).fill(base)), npcs:[], chests:[], monsters:[], portals:[], notes:[]};
  }

  function createVillageMap() {
    const m = blankMap('village', 'Birthday Village', 'birthday', 24, 17, 0);
    for (let y=0;y<m.h;y++) for (let x=0;x<m.w;x++) {
      if (x===0 || y===0 || x===m.w-1 || y===m.h-1) m.tiles[y][x] = 8;
      if (x===1 || y===1 || x===m.w-2 || y===m.h-2) if ((x+y)%3===0) m.tiles[y][x] = 9;
    }
    for (let x=2;x<m.w-2;x++) m.tiles[8][x] = 1;
    for (let y=2;y<m.h-2;y++) m.tiles[y][8] = 1;
    for (let x=5;x<=12;x++) for (let y=4;y<=6;y++) m.tiles[y][x] = 2;
    for (let x=14;x<=17;x++) { m.tiles[4][x]=7; m.tiles[5][x]=6; }
    for (let x=3;x<=5;x++) { m.tiles[11][x]=7; m.tiles[12][x]=6; }
    for (let x=17;x<=21;x++) for (let y=10;y<=13;y++) m.tiles[y][x] = 3;
    m.tiles[11][16] = 12;
    m.tiles[7][8] = 14;
    m.tiles[9][6] = 13;
    for (let x=2;x<7;x++) m.tiles[14][x]=5;
    m.npcs = [
      {id:'elder', name:'Elder Brightbeard', char:'xelar', x:7*TILE+20, y:6*TILE+14, role:'Keeper of village legends'},
      {id:'dave', name:'Dave', char:'dave', x:10*TILE+10, y:8*TILE+18, role:'Best friend and gadget genius'},
      {id:'berrybun', name:'Grandma Berrybun', char:'haraku', x:15*TILE+20, y:6*TILE+10, role:'Baker of heroic cake'},
      {id:'bobo', name:'Bobo Merchant', char:'ruush', x:5*TILE+20, y:13*TILE+10, role:'Daily goods and rumors'}
    ];
    m.chests = [
      {id:'village_chest', x:6*TILE, y:9*TILE, reward:{coins:25, item:'Berry Juice'}, label:'Village chest'},
      {id:'ad_reward_chest', x:13*TILE, y:7*TILE, reward:{coins:25}, label:'Optional reward chest', ad:true}
    ];
    m.portals = [
      {id:'to_meadow', x:22*TILE, y:8*TILE, w:80, h:80, target:'meadow', spawn:{x:2*TILE,y:8*TILE}, label:'Mushroom Meadow'},
      {id:'to_cave', x:8*TILE, y:2*TILE, w:80, h:80, target:'cave', spawn:{x:2*TILE,y:6*TILE}, locked:'cave', label:'Crystal Cave'},
      {id:'to_tower', x:21*TILE, y:2*TILE, w:80, h:80, target:'tower', spawn:{x:2*TILE,y:8*TILE}, locked:'tower', label:'Bald Moon Tower'}
    ];
    m.notes = [
      {x:8*TILE,y:7*TILE,text:'The Village Crystal hums: Courage is the first key.'},
      {x:18*TILE,y:11*TILE,text:'The pond sparkles with sleepy fish. Fishing arrives in the next content update.'}
    ];
    return m;
  }

  function createMeadowMap() {
    const m = blankMap('meadow', 'Mushroom Meadow', 'meadow', 30, 18, 0);
    for (let y=0;y<m.h;y++) for (let x=0;x<m.w;x++) {
      if (x===0 || y===0 || x===m.w-1 || y===m.h-1) m.tiles[y][x] = 10;
      else if ((x*y)%17===0) m.tiles[y][x] = 1;
      else if ((x+2*y)%23===0) m.tiles[y][x] = 6;
      else if ((x+y)%19===0) m.tiles[y][x] = 8;
    }
    for (let x=1;x<6;x++) m.tiles[8][x] = 4;
    for (let x=22;x<28;x++) for (let y=4;y<7;y++) m.tiles[y][x]=5;
    m.tiles[6][22]=12;
    m.monsters = [
      {id:'slime1', kind:'slime', name:'Slime Sprout', x:10*TILE,y:8*TILE,hp:36,maxHp:36,atk:7,xp:10,coins:5},
      {id:'slime2', kind:'slime', name:'Slime Sprout', x:16*TILE,y:10*TILE,hp:36,maxHp:36,atk:7,xp:10,coins:5},
      {id:'mush1', kind:'mushroom', name:'Grumpy Mushroom', x:20*TILE,y:13*TILE,hp:58,maxHp:58,atk:9,xp:18,coins:10},
      {id:'bat1', kind:'bat', name:'Leaf Bat', x:25*TILE,y:9*TILE,hp:42,maxHp:42,atk:8,xp:14,coins:7},
      {id:'moldor', kind:'mushroom', name:'Moldor the Mushroom Grump', x:27*TILE,y:5*TILE,hp:120,maxHp:120,atk:13,xp:50,coins:35,boss:true}
    ];
    m.chests = [
      {id:'meadow_chest_a', x:12*TILE, y:4*TILE, reward:{coins:35,item:'Crystal Candy'}, label:'Hidden meadow chest'},
      {id:'meadow_chest_b', x:25*TILE, y:14*TILE, reward:{coins:45,item:'Moon Tea'}, label:'Firefly chest'}
    ];
    m.portals = [{id:'back_village', x:1*TILE, y:8*TILE, w:80, h:80, target:'village', spawn:{x:21*TILE,y:8*TILE}, label:'Birthday Village'}];
    m.notes = [{x:5*TILE,y:8*TILE,text:'Mushroom Meadow smells like rain, berries and tiny mischief.'}];
    return m;
  }

  function createCaveMap() {
    const m = blankMap('cave', 'Crystal Cave', 'cave', 26, 15, 0);
    for (let y=0;y<m.h;y++) for (let x=0;x<m.w;x++) {
      if (x===0||y===0||x===m.w-1||y===m.h-1) m.tiles[y][x]=2;
      else if ((x+y)%7===0) m.tiles[y][x]=3;
      else if ((x*y)%13===0) m.tiles[y][x]=4;
      else m.tiles[y][x]=1;
    }
    m.monsters = [
      {id:'crystal1', kind:'crystal', name:'Crystal Spider', x:9*TILE,y:6*TILE,hp:86,maxHp:86,atk:14,xp:32,coins:25},
      {id:'guardian', kind:'crystal', name:'Cracked Crystal Guardian', x:22*TILE,y:8*TILE,hp:180,maxHp:180,atk:18,xp:80,coins:70,boss:true}
    ];
    m.chests = [{id:'cave_chest',x:18*TILE,y:3*TILE,reward:{coins:70,item:'Guardian Shard'},label:'Glowing crystal chest'}];
    m.portals = [{id:'back_village_cave',x:1*TILE,y:6*TILE,w:80,h:80,target:'village',spawn:{x:8*TILE,y:3*TILE},label:'Birthday Village'}];
    return m;
  }

  function createTowerMap() {
    const m = blankMap('tower', 'Bald Moon Tower', 'tower', 26, 16, 0);
    for (let y=0;y<m.h;y++) for (let x=0;x<m.w;x++) {
      if (x===0||y===0||x===m.w-1||y===m.h-1) m.tiles[y][x]=2;
      else if (x===13 || y===8) m.tiles[y][x]=3;
      else if ((x+y)%9===0) m.tiles[y][x]=5;
      else m.tiles[y][x]=1;
    }
    m.monsters = [
      {id:'xelar_echo', kind:'xelar', name:'Xelar Echo', x:20*TILE,y:8*TILE,hp:260,maxHp:260,atk:23,xp:160,coins:140,boss:true, final:true}
    ];
    m.portals = [{id:'back_village_tower',x:1*TILE,y:8*TILE,w:80,h:80,target:'village',spawn:{x:21*TILE,y:3*TILE},label:'Birthday Village'}];
    return m;
  }

  function blockedTile(map, tx, ty) {
    if (tx<0||ty<0||tx>=map.w||ty>=map.h) return true;
    const tile = map.tiles[ty][tx];
    const blockByTileset = {
      birthday: new Set([3,5,6,7,8,9,10]),
      meadow: new Set([5,6,7,8,9,10,11]),
      cave: new Set([2,3,4,7,8]),
      tower: new Set([2,5,7,8])
    };
    return blockByTileset[map.tileset]?.has(tile) || false;
  }

  function canMoveTo(x, y) {
    const m = maps[state.mapId];
    const pad = 20;
    const points = [[x-pad,y-pad],[x+pad,y-pad],[x-pad,y+pad],[x+pad,y+pad]];
    return points.every(([px,py]) => !blockedTile(m, Math.floor(px/TILE), Math.floor(py/TILE)));
  }

  function save() {
    try { localStorage.setItem('super-sean-007-save', JSON.stringify(state)); } catch(e) {}
  }
  function load() {
    try {
      const raw = localStorage.getItem('super-sean-007-save');
      if (raw) state = {...defaultState(), ...JSON.parse(raw)};
    } catch(e) { state = defaultState(); }
  }

  function resetGame() {
    AudioManager.unlock();
    state = defaultState();
    save();
    state.scene = 'explore';
    AudioManager.playMusic('village');
    AudioManager.playSfx('ui_confirm');
    showToast('New adventure started. Find Elder Brightbeard!');
  }

  function startGame() {
    AudioManager.unlock();
    load();
    state.scene = 'explore';
    AudioManager.playMusic('village');
    AudioManager.playSfx('ui_confirm');
    showToast('Welcome back to Asteria-007.');
  }

  function showToast(text) { toast = text; toastTimer = 180; }

  function distance(a,b) { return Math.hypot(a.x-b.x, a.y-b.y); }

  function currentMap() { return maps[state.mapId]; }

  function advanceQuest(event, payload={}) {
    const q = state.quest;
    if (q.id === 'awakening' && event === 'talk' && payload.id === 'elder') {
      state.quest = {id:'find_dave', title:'Gather the First Friend', objective:'Talk to Dave near the Birthday path.', slimes:0, chests:0};
    } else if (q.id === 'find_dave' && event === 'talk' && payload.id === 'dave') {
      state.party = Array.from(new Set([...state.party, 'dave']));
      state.items['Berry Juice'] = (state.items['Berry Juice']||0)+2;
      state.quest = {id:'meadow_entry', title:'The Meadow Road', objective:'Travel east to Mushroom Meadow and defeat 3 Slime Sprouts.', slimes:0, chests:0};
    } else if (q.id === 'meadow_entry' && event === 'defeat' && payload.kind === 'slime') {
      q.slimes = Math.min(3,(q.slimes||0)+1);
      q.objective = `Defeat Slime Sprouts in Mushroom Meadow. ${q.slimes}/3 defeated.`;
      if (q.slimes >= 3) {
        state.quest = {id:'moldor', title:'The Mushroom Grump', objective:'Find and defeat Moldor in the northeast meadow.', slimes:3, chests:0};
      }
    } else if (q.id === 'moldor' && event === 'defeat' && payload.id === 'moldor') {
      state.unlocked.cave = true;
      state.hero.friendship = Math.min(100, state.hero.friendship + 25);
      state.quest = {id:'crystal_cave', title:'Echoes in Crystal Cave', objective:'Return to Birthday Village, then enter Crystal Cave north of the crystal.', slimes:3, chests:0};
      AdManager.showInterstitial('boss_victory');
    } else if (q.id === 'crystal_cave' && event === 'defeat' && payload.id === 'guardian') {
      state.unlocked.tower = true;
      state.hero.friendship = Math.min(100, state.hero.friendship + 30);
      state.quest = {id:'tower', title:'The Bald Moon Rises', objective:'The path to Bald Moon Tower has opened. Face Xelar\'s echo.', slimes:3, chests:0};
    } else if (q.id === 'tower' && event === 'defeat' && payload.id === 'xelar_echo') {
      state.quest = {id:'postgame', title:'Portal of Future Worlds', objective:'You beat the playable launch slice. Explore, collect chests and expand the world with new regions.', slimes:3, chests:0};
      showToast('Xelar retreats! Future expansions can continue the saga.');
    }
    save();
  }

  function interact() {
    if (state.scene !== 'explore') return;
    const m = currentMap();
    const p = state.player;
    const nearbyNpc = m.npcs.find(n => Math.hypot(n.x-p.x, n.y-p.y) < 72);
    if (nearbyNpc) return talk(nearbyNpc);
    const nearbyChest = m.chests.find(c => Math.hypot(c.x-p.x, c.y-p.y) < 72);
    if (nearbyChest) return openChest(nearbyChest);
    const nearbyNote = m.notes.find(n => Math.hypot(n.x-p.x, n.y-p.y) < 72);
    if (nearbyNote) return showDialogue('Asteria-007', [nearbyNote.text]);
    const nearPortal = m.portals.find(pt => rectHit(p.x,p.y,pt));
    if (nearPortal) return usePortal(nearPortal);
    showToast('Nothing to interact with here.');
  }

  function rectHit(px, py, r) { return px > r.x-30 && py > r.y-30 && px < r.x+r.w && py < r.y+r.h; }

  function usePortal(portal) {
    if (portal.locked && !state.unlocked[portal.locked]) {
      showDialogue('Locked Path', [`${portal.label} is sealed by Gem magic. Complete more quests to unlock it.`]);
      return;
    }
    state.mapId = portal.target;
    state.player.x = portal.spawn.x;
    state.player.y = portal.spawn.y;
    AudioManager.playSfx('portal');
    AudioManager.playMusic('village');
    showToast(`Entered ${maps[state.mapId].name}.`);
    save();
  }

  function talk(npc) {
    const lines = {
      elder: [
        'Sean, the Village Crystal has dimmed. Xelar the Bald Wizard has begun draining the Seven Gems.',
        'Your crystal sword reacted when the shadow fell. That means the old Guardian promise has awakened.',
        'Find your friends, restore courage to the meadow and never let Xelar steal the laughter from this world.'
      ],
      dave: [
        'Finally! I packed snacks, gadgets and exactly one emergency slingshot. Adventure efficiency: excellent.',
        'I will mark hidden treasure on your map. Also, I borrowed two Berry Juices from Grandma. Probably legally.'
      ],
      berrybun: [
        'A hero needs cake and soup. Bring me mushroom caps later and I will bake a Courage Crumble.',
        'The inn is cozy, the village is safe and Xelar is absolutely not invited to dinner.'
      ],
      bobo: [
        'Bobo sees all roads, sells all snacks and definitely did not hide a chest near the village path.',
        'Rumor says Moldor guards a Gem fragment in Mushroom Meadow. Rumor also says he smells like wet socks.'
      ]
    }[npc.id] || ['Hello there!'];
    advanceQuest('talk', {id:npc.id});
    showDialogue(npc.name, lines);
  }

  function showDialogue(speaker, lines) {
    dialogue = {speaker, lines, index:0};
    state.scene = 'dialogue';
  }

  function nextDialogue() {
    if (!dialogue) return;
    dialogue.index++;
    if (dialogue.index >= dialogue.lines.length) {
      dialogue = null;
      state.scene = 'explore';
      AudioManager.playSfx('ui_confirm');
      save();
    }
  }

  function openChest(chest) {
    if (state.chestsOpened[chest.id] && !chest.ad) {
      showToast('Already opened.');
      return;
    }
    const award = () => {
      state.hero.coins += chest.reward.coins || 0;
      if (chest.reward.item) state.items[chest.reward.item] = (state.items[chest.reward.item] || 0) + 1;
      if (!chest.ad) state.chestsOpened[chest.id] = true;
      advanceQuest('chest', {id:chest.id});
      AudioManager.playSfx('chest');
      showToast(`${chest.label}: +${chest.reward.coins||0} coins${chest.reward.item ? ', '+chest.reward.item : ''}`);
      save();
    };
    if (chest.ad) AdManager.showRewardedAd('daily_chest', award); else award();
  }

  function selectBattleBackground(monster) {
    const map = state.mapId || 'village';
    if (monster.boss && monster.kind === 'xelar') return 'bg_sky';
    if (monster.boss && map === 'cave') return 'bg_mountain';
    if (monster.boss) return 'bg_village';
    if (map === 'village') return 'bg_village';
    if (map === 'meadow') return Math.random() > 0.5 ? 'bg_meadow' : 'bg_countryside';
    if (map === 'cave') return 'bg_mountain';
    if (map === 'petro') return 'bg_autumn';
    if (map === 'ruushwood') return Math.random() > 0.5 ? 'bg_river' : 'bg_lake';
    if (map === 'moon') return 'bg_winter';
    if (map === 'ruins') return 'bg_sky';
    if (map === 'tower') return 'bg_sky';
    return 'bg_countryside';
  }

  function startBattle(monster) {
    if (state.defeatedBosses[monster.id] || monster.defeated) return;
    battle = {
      enemy: {...monster},
      log: [`${monster.name} appears!`],
      turn: 'player',
      lock: 0,
      buttons: [],
      backgroundKey: selectBattleBackground(monster)
    };
    state.scene = 'battle';
    AudioManager.playMusic('battle');
  }

  function battleAction(action) {
    if (!battle || battle.turn !== 'player' || battle.lock > 0) return;
    const h = state.hero;
    const e = battle.enemy;
    if (action === 'attack') {
      const dmg = Math.max(3, Math.floor(h.attack + Math.random()*8 - 2));
      e.hp = Math.max(0, e.hp - dmg);
      battle.log.unshift(`Sean attacks for ${dmg} damage.`);
      AudioManager.playSfx('hit');
    } else if (action === 'slash') {
      if (h.mp < 6) { battle.log.unshift('Not enough MP for Crystal Slash.'); return; }
      h.mp -= 6;
      const dmg = Math.max(8, Math.floor(h.attack*1.8 + h.level*3 + Math.random()*12));
      e.hp = Math.max(0, e.hp - dmg);
      h.friendship = Math.min(100, h.friendship + 4);
      battle.log.unshift(`Crystal Slash shines for ${dmg} damage.`);
      AudioManager.playSfx('slash');
    } else if (action === 'friendship') {
      if (h.friendship < 40) { battle.log.unshift('Friendship meter needs 40 power.'); return; }
      h.friendship -= 40;
      const dmg = Math.max(30, Math.floor(h.attack*2.7 + h.level*8));
      e.hp = Math.max(0, e.hp - dmg);
      battle.log.unshift(`Friendship Burst hits for ${dmg} damage!`);
      AudioManager.playSfx('level_up');
    } else if (action === 'item') {
      if ((state.items['Berry Juice']||0) <= 0) { battle.log.unshift('No Berry Juice left.'); return; }
      state.items['Berry Juice']--;
      h.hp = Math.min(h.maxHp, h.hp + 45);
      battle.log.unshift('Sean drinks Berry Juice and recovers HP.');
      AudioManager.playSfx('reward');
    } else if (action === 'guard') {
      battle.guard = true;
      h.friendship = Math.min(100, h.friendship + 6);
      battle.log.unshift('Sean guards and builds friendship power.');
      AudioManager.playSfx('menu_open');
    } else if (action === 'run') {
      if (e.boss) { battle.log.unshift('Boss battles cannot be escaped.'); return; }
      state.scene = 'explore'; battle = null; AudioManager.playMusic('village'); showToast('Escaped safely.'); return;
    }
    if (e.hp <= 0) return winBattle();
    battle.turn = 'enemy'; battle.lock = 45;
  }

  function enemyTurn() {
    if (!battle) return;
    const e = battle.enemy;
    const h = state.hero;
    let dmg = Math.max(1, Math.floor(e.atk - h.defense*0.45 + Math.random()*6));
    if (battle.guard) { dmg = Math.floor(dmg*0.45); battle.guard = false; }
    h.hp = Math.max(0, h.hp - dmg);
    battle.log.unshift(`${e.name} hits for ${dmg} damage.`);
    AudioManager.playSfx('hit');
    if (h.hp <= 0) {
      battle.log.unshift('Sean falls! Use a revive ad placeholder or return to village.');
      battle.turn = 'defeat';
    } else {
      battle.turn = 'player';
    }
  }

  function winBattle() {
    const e = battle.enemy;
    const h = state.hero;
    h.xp += e.xp; h.coins += e.coins; h.friendship = Math.min(100, h.friendship + (e.boss?18:6));
    while (h.xp >= h.xpNext) {
      h.xp -= h.xpNext; h.level++; h.xpNext = Math.floor(h.xpNext*1.35 + 15); h.maxHp += 18; h.maxMp += 5; h.attack += 3; h.defense += 2; h.hp=h.maxHp; h.mp=h.maxMp;
      AudioManager.playSfx('level_up');
      showToast(`Level up! Sean reached level ${h.level}.`);
    }
    const map = currentMap();
    const mon = map.monsters.find(m => m.id === e.id);
    if (mon) mon.defeated = true;
    if (e.boss) state.defeatedBosses[e.id] = true;
    advanceQuest('defeat', {id:e.id, kind:e.kind});
    AudioManager.playMusic('victory');
    setTimeout(() => AudioManager.playMusic('village'), 2400);
    battle = null; state.scene='explore'; save();
  }

  function reviveOrReturn(useAd) {
    if (useAd) {
      AdManager.showRewardedAd('revive', () => {
        state.hero.hp = Math.floor(state.hero.maxHp*0.6);
        state.hero.mp = Math.floor(state.hero.maxMp*0.4);
        AudioManager.playSfx('reward');
        battle.turn = 'player'; battle.log.unshift('Reward revive complete. Sean stands up!');
      });
    } else {
      state.hero.hp = state.hero.maxHp;
      state.hero.mp = state.hero.maxMp;
      state.mapId='village'; state.player.x=8*TILE; state.player.y=8*TILE;
      AudioManager.playSfx('portal');
      AudioManager.playMusic('village');
      battle=null; state.scene='explore'; save();
    }
  }

  function update(dt) {
    if (toastTimer>0) toastTimer--;
    if (state.scene === 'battle' && battle && battle.lock>0) {
      battle.lock--;
      if (battle.lock === 0 && battle.turn === 'enemy') enemyTurn();
    }
    if (state.scene !== 'explore') return;
    const p = state.player;
    let dx=0, dy=0;
    if (keys.ArrowUp || keys.KeyW || activeTouches.up) dy -= 1;
    if (keys.ArrowDown || keys.KeyS || activeTouches.down) dy += 1;
    if (keys.ArrowLeft || keys.KeyA || activeTouches.left) dx -= 1;
    if (keys.ArrowRight || keys.KeyD || activeTouches.right) dx += 1;
    if (dx || dy) {
      const len = Math.hypot(dx,dy); dx/=len; dy/=len;
      const nx = p.x + dx*p.speed*dt/16.67; const ny = p.y + dy*p.speed*dt/16.67;
      if (canMoveTo(nx, p.y)) p.x = nx;
      if (canMoveTo(p.x, ny)) p.y = ny;
      p.frameTimer += dt;
      if (p.frameTimer > 140) { p.frame = (p.frame+1)%4; p.frameTimer=0; }
      p.dir = Math.abs(dx)>Math.abs(dy) ? (dx>0?'right':'left') : (dy>0?'down':'up');
    } else {
      p.frame = 0;
    }
    for (const mon of currentMap().monsters) {
      if (!mon.defeated && !state.defeatedBosses[mon.id] && Math.hypot(mon.x-p.x, mon.y-p.y)<52) startBattle(mon);
    }
  }

  function drawTile(tileset, id, sx, sy) {
    const ts = img[tileset];
    if (!ts || !ts.complete) return;
    const sheetId = {
      birthday: 'birthday_village_tiles',
      meadow: 'mushroom_meadow_tiles',
      cave: 'crystal_cave_tiles',
      petro: 'petro_plains_tiles',
      ruushwood: 'ruushwood_tiles',
      moon: 'moon_shrine_tiles',
      ruins: 'ancient_ruins_tiles',
      tower: 'bald_moon_tower_tiles'
    }[tileset];
    const sheet = runtime.slicedAssets?.sheets?.[sheetId];
    const fw = sheet?.frameWidth || TILE;
    const fh = sheet?.frameHeight || TILE;
    const cols = Math.max(1, Math.floor((sheet?.sourceWidth || ts.naturalWidth || 512) / fw));
    ctx.drawImage(ts, (id%cols)*fw, Math.floor(id/cols)*fh, fw, fh, sx, sy, TILE, TILE);
  }

  function camera() {
    const m=currentMap();
    return {
      x: Math.max(0, Math.min(m.w*TILE-GAME_W, state.player.x-GAME_W/2)),
      y: Math.max(0, Math.min(m.h*TILE-GAME_H, state.player.y-GAME_H/2))
    };
  }

  function drawExplore() {
    const m = currentMap();
    const cam = camera();
    ctx.fillStyle = '#0e2744'; ctx.fillRect(0,0,GAME_W,GAME_H);
    const startX = Math.floor(cam.x/TILE), startY = Math.floor(cam.y/TILE);
    const endX = Math.min(m.w, startX + Math.ceil(GAME_W/TILE)+2), endY = Math.min(m.h, startY + Math.ceil(GAME_H/TILE)+2);
    for (let y=startY;y<endY;y++) for (let x=startX;x<endX;x++) drawTile(m.tileset, m.tiles[y][x], x*TILE-cam.x, y*TILE-cam.y);
    for (const portal of m.portals) {
      const x=portal.x-cam.x, y=portal.y-cam.y;
      ctx.save(); ctx.globalAlpha=.32; ctx.fillStyle=portal.locked && !state.unlocked[portal.locked] ? '#9c7cff' : '#7cecff'; ctx.beginPath(); ctx.ellipse(x+32,y+32,30,18,0,0,Math.PI*2); ctx.fill(); ctx.restore();
      drawLabel(portal.label, x-15, y-10, '#ffffff');
    }
    for (const chest of m.chests) {
      if (state.chestsOpened[chest.id] && !chest.ad) continue;
      drawTile(m.tileset, chest.ad ? 14 : 13, chest.x-cam.x, chest.y-cam.y);
      if (chest.ad) drawLabel('Reward', chest.x-cam.x-8, chest.y-cam.y-14, '#fff4a9');
    }
    for (const npc of m.npcs) drawCharacter(npc.char, npc.x-cam.x, npc.y-cam.y, 0, npc.name);
    for (const mon of m.monsters) {
      if (mon.defeated || state.defeatedBosses[mon.id]) continue;
      const key = mon.kind === 'xelar' ? 'xelar' : mon.kind;
      drawMonster(key, mon.x-cam.x, mon.y-cam.y, mon.boss ? 78 : 54, mon.name);
    }
    drawParty(cam);
    drawHud();
  }

  function drawParty(cam) {
    const p=state.player;
    const companions = state.party.filter(c => c !== 'sean').slice(0,3);
    companions.forEach((c, i) => drawCharacter(c, p.x-cam.x - 28*(i+1), p.y-cam.y + 18*(i+1), 0, ''));
    const moving = (keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||activeTouches.up||activeTouches.down||activeTouches.left||activeTouches.right);
    const frame = moving ? (2 + state.player.frame%2) : 0;
    drawCharacter('sean', p.x-cam.x, p.y-cam.y, frame, '');
  }

  function drawCharacter(char, x, y, frame=0, label='') {
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.25)'; ctx.shadowBlur=8; ctx.shadowOffsetY=5;
    AssetManager.drawCharacterFrame(ctx, char, frame, x-34, y-52, 68, 68);
    ctx.restore();
    if (label) drawLabel(label, x-46, y-62, '#fff');
  }

  function drawMonster(key, x, y, size=58, label='') {
    const im = img[key] || img.slime;
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.35)'; ctx.shadowBlur=10; ctx.shadowOffsetY=5;
    ctx.drawImage(im, x-size/2, y-size/2, size, size); ctx.restore();
    if (label) drawLabel(label, x-size/2, y-size/2-17, '#fff');
  }

  function drawLabel(text, x, y, color) {
    ctx.save(); ctx.font='bold 13px Nunito, Arial'; const w=ctx.measureText(text).width+12;
    const lx = Math.max(4, Math.min(GAME_W - w - 4, x));
    const ly = Math.max(4, Math.min(GAME_H - 24, y));
    ctx.fillStyle='rgba(13,37,63,.72)'; ctx.beginPath(); ctx.roundRect(lx, ly, w, 20, 8); ctx.fill();
    ctx.fillStyle=color; ctx.fillText(text, lx+6, ly+14); ctx.restore();
  }

  function drawHud() {
    const h = state.hero;
    panel(12,12,310,88,'rgba(255,255,255,.88)');
    ctx.fillStyle='#12365a'; ctx.font='bold 18px Nunito, Arial'; ctx.fillText(`Super Sean Lv.${h.level}`, 28, 38);
    bar(28,50,220,14,h.hp/h.maxHp,'#ff5f7e','#ffe6ea'); ctx.fillStyle='#12365a'; ctx.font='12px Nunito'; ctx.fillText(`${h.hp}/${h.maxHp} HP`,254,62);
    bar(28,70,220,12,h.mp/h.maxMp,'#41b8ff','#d8f3ff'); ctx.fillText(`${h.mp}/${h.maxMp} MP`,254,81);
    panel(650,12,298,96,'rgba(255,255,255,.88)'); ctx.fillStyle='#12365a'; ctx.font='bold 15px Nunito'; ctx.fillText(state.quest.title,665,38); ctx.font='12px Nunito'; wrapText(state.quest.objective,665,58,260,16);
    panel(12,450,455,74,'rgba(12,39,69,.78)'); ctx.fillStyle='#fff'; ctx.font='14px Nunito'; ctx.fillText('Move: WASD/Arrows · Interact: E · Quest: Q · Inventory: I · Save: P',28,476); ctx.fillText(`${currentMap().name} · Coins: ${h.coins} · Friendship: ${h.friendship}/100`,28,501);
    if (toastTimer>0) { panel(260,116,440,40,'rgba(255,255,255,.94)'); ctx.fillStyle='#12365a'; ctx.font='bold 15px Nunito'; ctx.fillText(toast, 280, 141); }
  }

  function drawTitle() {
    if (img.keyArtMain && img.keyArtMain.complete && img.keyArtMain.naturalWidth) {
      ctx.drawImage(img.keyArtMain, 0, 0, GAME_W, GAME_H);
      ctx.fillStyle='rgba(0,20,46,.22)';
      ctx.fillRect(0,0,GAME_W,GAME_H);
    } else {
      const grd=ctx.createLinearGradient(0,0,0,GAME_H); grd.addColorStop(0,'#183a65'); grd.addColorStop(1,'#13a78f'); ctx.fillStyle=grd; ctx.fillRect(0,0,GAME_W,GAME_H);
    }
    panel(270,282,420,142,'rgba(255,255,255,.88)');
    ctx.textAlign='center';
    ctx.fillStyle='#12365a'; ctx.font='900 40px Nunito, Arial'; ctx.fillText('SUPER SEAN 007',480,324);
    ctx.fillStyle='#8b4a16'; ctx.font='800 23px Nunito, Arial'; ctx.fillText('Legend of the Seven Gems',480,356);
    ctx.textAlign='start';
    button(365,383,230,36,'New Game / Continue');
    ctx.font='15px Nunito'; ctx.fillStyle='#ecfbff'; ctx.fillText('Playable HTML5 JRPG foundation · expanded asset library wired in · Adsterra-ready hooks',215,505);
  }

  function drawDialogue() {
    drawExplore();
    panel(86,350,788,150,'rgba(255,255,255,.96)');
    ctx.fillStyle='#12365a'; ctx.font='bold 22px Nunito'; ctx.fillText(dialogue.speaker,112,386);
    ctx.font='18px Nunito'; wrapText(dialogue.lines[dialogue.index],112,420,720,26);
    ctx.font='bold 13px Nunito'; ctx.fillStyle='#2471a3'; ctx.fillText('Click, Space or Enter to continue',598,478);
  }

  function drawBattle() {
    const e = battle.enemy;
    const h = state.hero;
    const bgKey = battle.backgroundKey || 'bg_countryside';
    if (img[bgKey] && img[bgKey].complete && img[bgKey].naturalWidth) {
      ctx.drawImage(img[bgKey], 0, 0, GAME_W, GAME_H);
      ctx.fillStyle='rgba(0,0,0,.10)';
      ctx.fillRect(0,0,GAME_W,GAME_H);
    } else {
      const bg=ctx.createLinearGradient(0,0,0,GAME_H); bg.addColorStop(0, e.kind==='xelar'?'#322247':'#1b4669'); bg.addColorStop(1, e.kind==='xelar'?'#774166':'#74d8a0'); ctx.fillStyle=bg; ctx.fillRect(0,0,GAME_W,GAME_H);
      ctx.fillStyle='rgba(255,255,255,.18)'; for(let i=0;i<8;i++) ctx.beginPath(),ctx.arc(90+i*130,120+Math.sin(Date.now()/600+i)*22,45,0,Math.PI*2),ctx.fill();
    }
    AssetManager.drawCharacterFrame(ctx, 'sean', 0, 140, 235, 150, 150);
    const enemyImg = e.kind==='xelar' ? img.xelar : img[e.kind];
    if (enemyImg && enemyImg.complete) ctx.drawImage(enemyImg,620,115,e.boss?220:160,e.boss?220:160);
    ctx.fillStyle='#fff'; ctx.font='bold 24px Nunito'; ctx.fillText(e.name,610,82);
    bar(610,96,260,18,e.hp/e.maxHp,'#ff5f7e','#ffd3dc');
    ctx.fillText('Super Sean',100,218); bar(100,226,240,16,h.hp/h.maxHp,'#ff5f7e','#ffd3dc'); bar(100,248,240,13,h.mp/h.maxMp,'#41b8ff','#d8f3ff');
    panel(74,405,812,110,'rgba(255,255,255,.94)');
    const buttons = [
      ['Attack','attack'], ['Crystal Slash -6MP','slash'], [`Friendship Burst ${h.friendship}/40`,'friendship'], ['Berry Juice','item'], ['Guard','guard'], ['Run','run']
    ];
    battle.buttons = [];
    buttons.forEach((b,i)=>{ const x=100+(i%3)*250, y=424+Math.floor(i/3)*38; battle.buttons.push({x,y,w:210,h:30,action:b[1]}); button(x,y,210,30,b[0]); });
    ctx.fillStyle='#12365a'; ctx.font='13px Nunito'; battle.log.slice(0,3).forEach((l,i)=>ctx.fillText(l,560,438+i*22));
    if (battle.turn==='defeat') { panel(285,170,390,150,'rgba(255,255,255,.96)'); ctx.fillStyle='#12365a'; ctx.font='bold 24px Nunito'; ctx.fillText('Sean needs help!',377,210); button(326,232,145,38,'Reward Revive'); button(492,232,145,38,'Return Home'); }
  }

  function drawInventory() {
    drawExplore(); panel(160,70,640,390,'rgba(255,255,255,.96)');
    ctx.fillStyle='#12365a'; ctx.font='bold 30px Nunito'; ctx.fillText('Inventory & Party',198,120);
    ctx.font='18px Nunito'; let y=160; Object.entries(state.items).forEach(([name,count])=>{ ctx.fillText(`${name} × ${count}`,210,y); y+=28; });
    ctx.fillText(`Coins: ${state.hero.coins}`,210,y+10); ctx.fillText(`Party: ${state.party.map(cap).join(', ')}`,210,y+42);
    ctx.fillStyle='#2471a3'; ctx.font='bold 14px Nunito'; ctx.fillText('Press I/Esc to close',580,420);
  }

  function drawQuestLog() {
    drawExplore(); panel(140,68,680,410,'rgba(255,255,255,.96)');
    ctx.fillStyle='#12365a'; ctx.font='bold 30px Nunito'; ctx.fillText('Quest Log',190,120);
    ctx.font='bold 22px Nunito'; ctx.fillText(state.quest.title,190,168);
    ctx.font='18px Nunito'; wrapText(state.quest.objective,190,200,560,28);
    ctx.font='16px Nunito'; ctx.fillText('Current arc: Restore the Seven Gems, open the ancient paths and stop Xelar.',190,310);
    ctx.fillText(`Unlocked areas: ${Object.entries(state.unlocked).filter(([,v])=>v).map(([k])=>cap(k)).join(', ')}`,190,340);
    ctx.fillStyle='#2471a3'; ctx.font='bold 14px Nunito'; ctx.fillText('Press Q/Esc to close',600,430);
  }

  function drawWorldMap() {
    drawExplore(); panel(120,48,720,440,'rgba(255,255,255,.96)');
    ctx.fillStyle='#12365a'; ctx.font='bold 30px Nunito'; ctx.fillText('Asteria-007 World Map',175,95);
    const nodes = [
      ['village','Birthday Village',210,235],['meadow','Mushroom Meadow',390,205],['cave','Crystal Cave',300,120],['tower','Bald Moon Tower',650,125]
    ];
    ctx.strokeStyle='#3fa7dc'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(210,235); ctx.lineTo(390,205); ctx.lineTo(300,120); ctx.lineTo(650,125); ctx.stroke();
    nodes.forEach(([id,name,x,y])=>{ const unlocked = id==='village'||id==='meadow'||state.unlocked[id]; ctx.fillStyle=unlocked?'#ffd76a':'#cfd8e4'; ctx.beginPath(); ctx.arc(x,y,34,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#12365a'; ctx.lineWidth=3; ctx.stroke(); ctx.fillStyle='#12365a'; ctx.font='bold 14px Nunito'; ctx.fillText(name,x-60,y+58); });
    ctx.fillStyle='#2471a3'; ctx.font='bold 14px Nunito'; ctx.fillText('Press M/Esc to close. Explore paths physically in-game.',500,455);
  }

  function panel(x,y,w,h,fill) { ctx.save(); ctx.fillStyle=fill; ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(x,y,w,h,18); ctx.fill(); ctx.stroke(); ctx.restore(); }
  function button(x,y,w,h,text) { ctx.fillStyle='#ff9c2f'; ctx.beginPath(); ctx.roundRect(x,y,w,h,12); ctx.fill(); ctx.strokeStyle='#0e4f7c'; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle='#fff'; ctx.font='bold 14px Nunito'; ctx.fillText(text,x+14,y+20); }
  function bar(x,y,w,h,p,fg,bg) { ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(x,y,w,h,h/2); ctx.fill(); ctx.fillStyle=fg; ctx.beginPath(); ctx.roundRect(x,y,Math.max(4,w*Math.max(0,Math.min(1,p))),h,h/2); ctx.fill(); }
  function wrapText(text,x,y,maxWidth,lineHeight) { const words=String(text).split(' '); let line=''; for (const word of words) { const test=line+word+' '; if(ctx.measureText(test).width>maxWidth && line) {ctx.fillText(line,x,y); line=word+' '; y+=lineHeight;} else line=test; } ctx.fillText(line,x,y); }
  function cap(s) { return s.charAt(0).toUpperCase()+s.slice(1).replace(/_/g,' '); }

  function render() {
    ctx.clearRect(0,0,GAME_W,GAME_H);
    if (state.scene==='title') drawTitle();
    else if (state.scene==='dialogue') drawDialogue();
    else if (state.scene==='battle') drawBattle();
    else if (state.scene==='inventory') drawInventory();
    else if (state.scene==='quest') drawQuestLog();
    else if (state.scene==='map') drawWorldMap();
    else drawExplore();
  }

  function loop(t) {
    const dt = Math.min(40, t - lastTime || 16.67); lastTime = t;
    update(dt); render(); mouse.clicked=false; requestAnimationFrame(loop);
  }

  function clickGame(x,y) {
    AudioManager.unlock();
    if (state.scene==='title') return startGame();
    if (state.scene==='dialogue') return nextDialogue();
    if (state.scene==='battle' && battle) {
      if (battle.turn==='defeat') {
        if (x>=326&&x<=471&&y>=232&&y<=270) return reviveOrReturn(true);
        if (x>=492&&x<=637&&y>=232&&y<=270) return reviveOrReturn(false);
      }
      const btn = battle.buttons.find(b => x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
      if (btn) battleAction(btn.action);
    }
  }

  window.addEventListener('keydown', e => {
    AudioManager.unlock();
    keys[e.code] = true;
    if (e.code==='Enter' && state.scene==='title') startGame();
    if (e.code==='KeyN' && state.scene==='title') resetGame();
    if (e.code==='KeyE') interact();
    if (e.code==='Space' || e.code==='Enter') { if(state.scene==='dialogue') nextDialogue(); }
    if (e.code==='KeyI') { state.scene = state.scene==='inventory'?'explore':'inventory'; AudioManager.playSfx('menu_open'); }
    if (e.code==='KeyQ') { state.scene = state.scene==='quest'?'explore':'quest'; AudioManager.playSfx('menu_open'); }
    if (e.code==='KeyM') { state.scene = state.scene==='map'?'explore':'map'; AudioManager.playSfx('menu_open'); }
    if (e.code==='KeyP') { save(); AudioManager.playSfx('ui_confirm'); showToast('Game saved locally.'); }
    if (e.code==='KeyO') AudioManager.toggleMusic();
    if (e.code==='KeyL') AudioManager.toggleSfx();
    if (e.code==='Escape') { if(['inventory','quest','map'].includes(state.scene)) state.scene='explore'; }
    if (state.scene==='battle') {
      const keyMap = {Digit1:'attack',Digit2:'slash',Digit3:'friendship',Digit4:'item',Digit5:'guard',Digit6:'run'};
      if (keyMap[e.code]) battleAction(keyMap[e.code]);
    }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  canvas.addEventListener('mousemove', e => { const r=canvas.getBoundingClientRect(); mouse.x=(e.clientX-r.left)*GAME_W/r.width; mouse.y=(e.clientY-r.top)*GAME_H/r.height; });
  canvas.addEventListener('click', e => { const r=canvas.getBoundingClientRect(); clickGame((e.clientX-r.left)*GAME_W/r.width, (e.clientY-r.top)*GAME_H/r.height); });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); const r=canvas.getBoundingClientRect(); const t=e.changedTouches[0]; clickGame((t.clientX-r.left)*GAME_W/r.width, (t.clientY-r.top)*GAME_H/r.height); }, {passive:false});

  function renderGameToText() {
    const m = maps[state.mapId] || {npcs:[], chests:[], monsters:[], portals:[], name:'Unknown'};
    const p = state.player;
    const visibleMonsters = m.monsters
      .filter(mon => !mon.defeated && !state.defeatedBosses[mon.id])
      .map(mon => ({id:mon.id, name:mon.name, kind:mon.kind, x:Math.round(mon.x), y:Math.round(mon.y), hp:mon.hp, boss:Boolean(mon.boss)}));
    const payload = {
      coordinateSystem: 'Canvas pixels, origin top-left, x right, y down.',
      scene: state.scene,
      map: {id: state.mapId, name: m.name, width: m.w, height: m.h},
      player: {x: Math.round(p.x), y: Math.round(p.y), direction: p.dir, frame: p.frame},
      hero: {...state.hero},
      quest: state.quest,
      party: state.party,
      unlocked: state.unlocked,
      nearby: {
        npcs: m.npcs.filter(n => Math.hypot(n.x-p.x, n.y-p.y) < 120).map(n => ({id:n.id, name:n.name, x:Math.round(n.x), y:Math.round(n.y)})),
        chests: m.chests.filter(c => Math.hypot(c.x-p.x, c.y-p.y) < 140).map(c => ({id:c.id, label:c.label, ad:Boolean(c.ad), opened:Boolean(state.chestsOpened[c.id])})),
        portals: m.portals.filter(pt => rectHit(p.x, p.y, pt)).map(pt => ({id:pt.id, label:pt.label, target:pt.target, locked:Boolean(pt.locked && !state.unlocked[pt.locked])}))
      },
      visibleMonsters,
      battle: battle ? {
        enemy: {id:battle.enemy.id, name:battle.enemy.name, hp:battle.enemy.hp, maxHp:battle.enemy.maxHp, kind:battle.enemy.kind},
        turn: battle.turn,
        log: battle.log.slice(0, 4),
        backgroundKey: battle.backgroundKey
      } : null,
      assets: {
        criticalImages: Object.keys(img).length,
        missingImages: runtime.assetWarnings,
        slicedFrames: runtime.slicedAssets?.frames?.length || 0
      },
      audio: AudioManager.status()
    };
    return JSON.stringify(payload);
  }

  window.render_game_to_text = renderGameToText;

  window.advanceTime = (ms = 16.67) => {
    runtime.deterministic = true;
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) update(1000 / 60);
    render();
    return renderGameToText();
  };

  window.SuperSeanGame = {
    press(dir, down=true) { activeTouches[dir] = down; },
    interact,
    menu(type) { AudioManager.unlock(); AudioManager.playSfx('menu_open'); state.scene = state.scene === type ? 'explore' : type; },
    save,
    toggleMusic: () => AudioManager.toggleMusic(),
    toggleSfx: () => AudioManager.toggleSfx(),
    renderState: renderGameToText,
    audioStatus: () => AudioManager.status(),
    adManager: AdManager
  };

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){ this.beginPath(); this.moveTo(x+r,y); this.arcTo(x+w,y,x+w,y+h,r); this.arcTo(x+w,y+h,x,y+h,r); this.arcTo(x,y+h,x,y,r); this.arcTo(x,y,x+w,y,r); this.closePath(); return this; };
  }

  async function bootstrap() {
    generateMaps();
    await Promise.all([AssetManager.init(), AudioManager.init(), AdManager.init()]);
    load();
    state.scene = 'title';
    AudioManager.playMusic('title');
    requestAnimationFrame(loop);
  }

  bootstrap();
})();
