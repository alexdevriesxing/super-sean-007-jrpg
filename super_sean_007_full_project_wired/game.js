/* Super Sean 007 — core engine: asset/audio/ad managers, state + save migration,
   input, world simulation and bootstrap. Gameplay data and systems live in js/. */
(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const g = canvas.getContext('2d');
  const GAME_W = 960;
  const GAME_H = 540;
  const TILE = SSG.TILE;
  const SAVE_VERSION = SSG.SAVE_VERSION;
  canvas.width = GAME_W;
  canvas.height = GAME_H;

  const criticalImageList = {
    sean: 'assets/characters/sean_strip.png',
    dave: 'assets/characters/dave_strip.png',
    petroman: 'assets/characters/petroman_strip.png',
    haraku: 'assets/characters/haraku_strip.png',
    ruush: 'assets/characters/ruush_strip.png',
    xelar: 'assets/characters/xelar_portrait.png',
    portrait_sean: 'assets/characters/sean_portrait.png',
    portrait_dave: 'assets/characters/dave_portrait.png',
    portrait_haraku: 'assets/characters/haraku_portrait.png',
    portrait_ruush: 'assets/characters/ruush_portrait.png',
    portrait_petroman: 'assets/characters/petroman_portrait.png',
    portrait_xelar: 'assets/characters/xelar_portrait.png',
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
    // keyArtMain is loaded lazily (it is 2.8MB and only used on the title screen)
  };

  const TILESET_SHEETS = {
    birthday: 'birthday_village_tiles',
    meadow: 'mushroom_meadow_tiles',
    cave: 'crystal_cave_tiles',
    petro: 'petro_plains_tiles',
    ruushwood: 'ruushwood_tiles',
    moon: 'moon_shrine_tiles',
    ruins: 'ancient_ruins_tiles',
    tower: 'bald_moon_tower_tiles'
  };

  const MAP_MUSIC = {
    village: 'village', homestead: 'village', meadow: 'forest', ruushwood: 'forest',
    petro: 'forest', cave: 'cave', ruins: 'cave', moon: 'moon', tower: 'moon'
  };

  const img = {};
  const keys = {};
  const activeTouches = {up: false, down: false, left: false, right: false};
  const runtime = {assetWiring: null, slicedAssets: null, assetWarnings: [], deterministic: false};
  const fx = [];

  /* ---------------- managers ---------------- */
  const AssetManager = {
    async init() {
      const [assetWiring, slicedAssets, mobManifest, objectManifest, iconManifest, vfxManifest, uiManifest] = await Promise.all([
        fetchJson('data/asset-wiring.json'),
        fetchJson('data/sliced-assets.json'),
        fetchJson('data/mob-manifest.json'),
        fetchJson('data/object-manifest.json'),
        fetchJson('data/icon-manifest.json'),
        fetchJson('data/vfx-manifest.json'),
        fetchJson('data/ui-manifest.json')
      ]);
      runtime.assetWiring = assetWiring || {};
      runtime.slicedAssets = slicedAssets || {sheets: {}, frames: []};

      // Everything beyond the small critical set streams in AFTER boot so a
      // slow or stalled asset on mobile can never hold the loader open.
      const deferred = {};
      Object.entries(runtime.assetWiring?.battleBackgrounds || {}).forEach(([key, file]) => {
        deferred[`bg_${key}`] = file; // only shown once a battle starts
      });
      // Distinct sliced creature/NPC sprites, loaded under their manifest name.
      if (mobManifest?.sprites) {
        mobManifest.sprites.forEach(name => { deferred[name] = `${mobManifest.base}${name}.png`; });
      }
      // Detailed building / landmark sprites for the homestead.
      if (objectManifest?.sprites) {
        objectManifest.sprites.forEach(name => { deferred[name] = `${objectManifest.base}${name}.png`; });
      }
      // Distinct item/gem icons for bag, crafting, shop and quest-log UI.
      if (iconManifest?.sprites) {
        iconManifest.sprites.forEach(name => { deferred[name] = `${iconManifest.base}${name}.png`; });
      }
      // Battle effect sprites (slashes, zaps, heals, ...).
      if (vfxManifest?.sprites) {
        vfxManifest.sprites.forEach(name => { deferred[name] = `${vfxManifest.base}${name}.png`; });
      }
      // Battle transition cards + status-effect icons.
      if (uiManifest?.sprites) {
        uiManifest.sprites.forEach(name => { deferred[name] = `${uiManifest.base}${name}.png`; });
      }

      // Block boot only on the handful of images the first frame truly needs;
      // draw helpers all guard on `img.complete && naturalWidth`, so the rest
      // can pop in as they arrive.
      await this.preloadImages(criticalImageList, {timeout: 12000});
      // Fire-and-forget: batched to avoid a memory spike from ~400 decodes at
      // once, and never awaited so it cannot delay or wedge the game.
      this.streamImages(deferred, 24);
    },
    // Release-scoped cache-bust: asset URLs are stable between releases, but a
    // CDN edge can hold a poisoned response for the bare URL far longer than
    // the origin intends. Versioned URLs bypass any such stale entry.
    versionedSrc(src) {
      const v = document.body?.dataset?.siteVersion;
      if (!v || /^(data:|blob:|https?:)/.test(src)) return src;
      return `${src}${src.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}`;
    },
    // Load one image, resolving on load, error, OR timeout so a single stalled
    // request can never leave the boot promise pending forever.
    loadImage(key, src, timeout) {
      return new Promise(resolve => {
        const im = new Image();
        let settled = false;
        const settle = ok => {
          if (settled) return;
          settled = true;
          if (!ok) runtime.assetWarnings.push(src);
          resolve();
        };
        im.onload = () => settle(true);
        im.onerror = () => settle(false);
        im.src = this.versionedSrc(src);
        img[key] = im;
        if (timeout) setTimeout(() => settle(false), timeout);
      });
    },
    preloadImages(list, {timeout = 12000} = {}) {
      const entries = Object.entries(list);
      if (!entries.length) return Promise.resolve();
      return Promise.all(entries.map(([k, src]) => this.loadImage(k, src, timeout)));
    },
    // Background loader: work through the list in small batches so mobile
    // browsers aren't asked to decode hundreds of images simultaneously.
    async streamImages(list, batchSize = 24) {
      const entries = Object.entries(list);
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        await Promise.all(batch.map(([k, src]) => this.loadImage(k, src, 15000)));
      }
    },
    sheetFor(tileset) {
      return runtime.slicedAssets?.sheets?.[TILESET_SHEETS[tileset]] || null;
    },
    drawTile(tileset, id, sx, sy, size = TILE) {
      const source = img[tileset];
      if (!source || !source.complete || !source.naturalWidth) return;
      const sheet = this.sheetFor(tileset);
      const fw = sheet?.frameWidth || TILE;
      const fh = sheet?.frameHeight || TILE;
      const cols = Math.max(1, Math.floor((sheet?.sourceWidth || source.naturalWidth) / fw));
      g.drawImage(source, (id % cols) * fw, Math.floor(id / cols) * fh, fw, fh, sx, sy, size, size);
    },
    drawTileScaled(tileset, id, sx, sy, w, h) {
      const source = img[tileset];
      if (!source || !source.complete || !source.naturalWidth) return;
      const sheet = this.sheetFor(tileset);
      const fw = sheet?.frameWidth || TILE;
      const fh = sheet?.frameHeight || TILE;
      const cols = Math.max(1, Math.floor((sheet?.sourceWidth || source.naturalWidth) / fw));
      g.drawImage(source, (id % cols) * fw, Math.floor(id / cols) * fh, fw, fh, sx, sy, w, h);
    },
    drawIcon(name, sx, sy, w, h) {
      const source = img[name];
      if (!source || !source.complete || !source.naturalWidth) return false;
      g.drawImage(source, sx, sy, w, h);
      return true;
    },
    // Prefer an item's distinct sliced icon; fall back to its tileset tile.
    drawItemIcon(def, sx, sy, w, h) {
      if (def?.img && this.drawIcon(def.img, sx, sy, w, h)) return;
      if (def?.icon) this.drawTileScaled(def.icon.sheet, def.icon.tile, sx, sy, w, h);
    },
    drawCharacterFrame(char, frame, x, y, width, height) {
      const sheet = runtime.slicedAssets?.sheets?.[char];
      const source = img[char] || img.sean;
      if (!source || !source.complete) return false;
      if (sheet) {
        const safeFrame = frame % Math.max(1, sheet.frameCount || 1);
        const cols = Math.max(1, Math.floor(sheet.sourceWidth / sheet.frameWidth));
        g.drawImage(source, (safeFrame % cols) * sheet.frameWidth, Math.floor(safeFrame / cols) * sheet.frameHeight,
          sheet.frameWidth, sheet.frameHeight, x, y, width, height);
        return true;
      }
      g.drawImage(source, frame * 88, 0, 88, 88, x, y, width, height);
      return true;
    }
  };

  const AudioManager = {
    manifest: null, music: {}, sfx: {}, currentMusic: null, pendingMusic: null, unlocked: false,
    musicMuted: readBool('super-sean-007-music-muted', false),
    sfxMuted: readBool('super-sean-007-sfx-muted', false),
    musicVolume: readNumber('super-sean-007-music-vol', 0.28),
    sfxVolume: readNumber('super-sean-007-sfx-vol', 0.45),
    async init() {
      this.manifest = await fetchJson('data/audio-manifest.json');
      Object.entries(this.manifest?.music || {}).forEach(([id, entry]) => {
        const audio = new Audio(entry.file);
        audio.loop = Boolean(entry.loop);
        audio.preload = 'auto';
        audio.volume = this.musicVolume;
        this.music[id] = audio;
      });
      Object.entries(this.manifest?.sfx || {}).forEach(([id, entry]) => {
        const audio = new Audio(entry.file);
        audio.preload = 'auto';
        audio.volume = this.sfxVolume;
        this.sfx[id] = audio;
      });
    },
    setMusicVolume(v) {
      this.musicVolume = Math.max(0, Math.min(1, v));
      writeNumber('super-sean-007-music-vol', this.musicVolume);
      Object.values(this.music).forEach(a => { a.volume = this.musicVolume; });
    },
    setSfxVolume(v) {
      this.sfxVolume = Math.max(0, Math.min(1, v));
      writeNumber('super-sean-007-sfx-vol', this.sfxVolume);
      Object.values(this.sfx).forEach(a => { a.volume = this.sfxVolume; });
    },
    unlock() {
      if (this.unlocked) return;
      this.unlocked = true;
      const pending = this.pendingMusic || (state.scene === 'title' ? 'title' : 'village');
      this.pendingMusic = null;
      this.playMusic(pending);
    },
    playMusic(id) {
      if (!this.music[id]) id = 'village';
      if (this.musicMuted) return;
      if (!this.unlocked) { this.pendingMusic = id; return; }
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
      sound.volume = this.sfxVolume;
      sound.play().catch(() => {});
    },
    toggleMusic() {
      this.musicMuted = !this.musicMuted;
      writeBool('super-sean-007-music-muted', this.musicMuted);
      if (this.musicMuted && this.currentMusic) this.currentMusic.pause();
      if (!this.musicMuted) this.playMusic(state.scene === 'battle' ? 'battle' : state.scene === 'title' ? 'title' : (MAP_MUSIC[state.mapId] || 'village'));
      showToast(`Music ${this.musicMuted ? 'muted' : 'enabled'}.`);
    },
    toggleSfx() {
      this.sfxMuted = !this.sfxMuted;
      writeBool('super-sean-007-sfx-muted', this.sfxMuted);
      showToast(`SFX ${this.sfxMuted ? 'muted' : 'enabled'}.`);
    },
    status() {
      return {
        unlocked: this.unlocked, musicMuted: this.musicMuted, sfxMuted: this.sfxMuted,
        musicTracks: Object.keys(this.music).length, sfx: Object.keys(this.sfx).length
      };
    }
  };

  const AdManager = {
    config: null, lastInterstitialAt: 0, lastRewardByType: {},
    async init() {
      this.config = await fetchJson('data/ad-config.json') || {enabled: false, placements: {}, rewarded: {}};
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
    adsAvailable() {
      // Third-party ads only run after the visitor accepted consent.
      return Boolean(this.config?.enabled) && Boolean(window.__ssgAdsLoaded);
    },
    // Render a real 300x250 Adsterra unit inside an isolated iframe.
    renderUnit(container) {
      const unit = {key: this.config?.units?.banner300x250?.key, width: 300, height: 250};
      if (!unit.key) return false;
      try {
        const frame = document.createElement('iframe');
        frame.width = '300'; frame.height = '250'; frame.title = 'Advertisement';
        frame.setAttribute('scrolling', 'no'); frame.style.border = '0';
        container.appendChild(frame);
        const doc = frame.contentWindow.document;
        const options = JSON.stringify({key: unit.key, format: 'iframe', height: 250, width: 300, params: {}});
        doc.open();
        doc.write('<!doctype html><html><head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>' +
          '<scr' + 'ipt>atOptions=' + options + ';</scr' + 'ipt>' +
          '<scr' + 'ipt src="https://' + this.config.adHost + '/' + unit.key + '/invoke.js"></scr' + 'ipt>' +
          '</body></html>');
        doc.close();
        return true;
      } catch (e) { return false; }
    },
    showInterstitial(reason, onClose) {
      const safeReasons = this.config?.safeInterstitialReasons || [];
      const minimumMs = (this.config?.minimumInterstitialSeconds || 180) * 1000;
      const now = Date.now();
      const forced = reason === 'reward';
      if (!forced) {
        if (!safeReasons.includes(reason)) return false;
        if (['battle', 'dialogue'].includes(state.scene)) return false;
        if (now - this.lastInterstitialAt < minimumMs) return false;
      }
      if (!this.adsAvailable()) { if (onClose) onClose(); return false; }
      this.lastInterstitialAt = now;
      ctx.stat('pageview'); // interstitial impression proxy
      this.renderOverlay(reason === 'reward' ? 'Your reward is ready!' : 'Thanks for playing!', onClose);
      return true;
    },
    renderOverlay(headline, onClose) {
      if (document.getElementById('adOverlay')) { if (onClose) onClose(); return; }
      const wasScene = state.scene;
      const overlay = document.createElement('div');
      overlay.id = 'adOverlay';
      overlay.innerHTML = '<div class="ad-overlay-card">' +
        '<span class="ad-overlay-label">Advertisement</span>' +
        '<div class="ad-overlay-unit" id="adOverlayUnit"></div>' +
        '<p class="ad-overlay-headline">' + headline + '</p>' +
        '<button id="adOverlayClose" class="ad-overlay-close" disabled>Continue in 4…</button></div>';
      document.body.appendChild(overlay);
      this.renderUnit(document.getElementById('adOverlayUnit'));
      const btn = document.getElementById('adOverlayClose');
      let left = 4;
      const tick = setInterval(() => {
        left -= 1;
        if (left <= 0) {
          clearInterval(tick);
          btn.disabled = false;
          btn.textContent = 'Continue';
        } else {
          btn.textContent = `Continue in ${left}…`;
        }
      }, 1000);
      const close = () => {
        clearInterval(tick);
        overlay.remove();
        if (state.scene === wasScene) { /* unchanged */ }
        if (onClose) onClose();
      };
      btn.addEventListener('click', () => { if (!btn.disabled) close(); });
    },
    canShowRewardedAd(type) {
      const rewarded = this.config?.rewarded?.[type];
      if (!rewarded || rewarded.enabled === false) return false;
      const cooldown = (rewarded.cooldownSeconds || 0) * 1000;
      return Date.now() - (this.lastRewardByType[type] || 0) >= cooldown;
    },
    showRewardedAd(type, onSuccess) {
      if (!this.canShowRewardedAd(type)) {
        showToast('Reward is cooling down. Try again soon.');
        return false;
      }
      this.lastRewardByType[type] = Date.now();
      state.lastAdReward = Date.now();
      const grant = () => {
        AudioManager.playSfx('reward');
        if (onSuccess) onSuccess();
        save();
      };
      // Show a real ad if the visitor opted in; otherwise grant directly (they chose no ads).
      if (this.adsAvailable()) {
        this.showInterstitial('reward', grant);
      } else {
        showToast('Reward granted!');
        setTimeout(grant, 200);
      }
      return true;
    },
    maybeInterstitial(reason) {
      // Fire-and-forget interstitial on a safe story beat.
      this.showInterstitial(reason, null);
    },
    findSlot(placement) {
      const selector = this.config?.placements?.[placement]?.selector || `[data-adsterra-placement="${placement}"]`;
      return document.querySelector(selector);
    }
  };

  /* ---------------- state ---------------- */
  const defaultState = SSG.defaultState;

  let state = defaultState();
  let maps = {};
  let dialogue = null;
  let toast = '';
  let toastTimer = 0;
  let lastTime = 0;

  const migrate = SSG.migrateSave;

  function save() {
    state.savedAt = Date.now();
    try { systems.checkAchievements(); } catch (e) {}
    try { localStorage.setItem('super-sean-007-save', JSON.stringify(state)); } catch (e) {}
    CloudSync.push();
  }
  function load() {
    try {
      const raw = localStorage.getItem('super-sean-007-save');
      if (raw) state = migrate(JSON.parse(raw));
    } catch (e) { state = defaultState(); }
  }
  function applyImportedSave(parsed) {
    state = migrate(parsed);
    try { localStorage.setItem('super-sean-007-save', JSON.stringify(state)); } catch (e) {}
    maps = SSG.buildMaps();
    state.scene = 'title';
    showToast(`Save loaded — Lv.${state.hero.level} in ${maps[state.mapId]?.name || 'Asteria'}. Press Continue!`);
  }
  function saveSummary() {
    try {
      const raw = localStorage.getItem('super-sean-007-save');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        level: parsed.hero?.level || 1,
        mapName: SSG.WORLD_NODES.find(([id]) => id === parsed.mapId)?.[1] || 'Birthday Village',
        minutes: Math.floor(parsed.playMinutes || 0),
        gems: (parsed.gems || []).length,
        ngPlus: parsed.ngPlus || 0
      };
    } catch (e) { return null; }
  }

  /* ---------------- save codes & cloud sync ---------------- */
  function exportSaveCode() {
    save();
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    const done = () => showToast('Save code copied! Paste it on any device via Load Code.');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(() => window.prompt('Copy your save code:', code));
    } else {
      window.prompt('Copy your save code:', code);
    }
    return code;
  }
  function importSaveFlow() {
    const input = (window.prompt('Paste a save code, or a cloud sync ID:') || '').trim();
    if (!input) return;
    if (/^[a-z0-9]{16,40}$/.test(input)) {
      CloudSync.pull(input);
      return;
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(input))));
      if (!parsed || typeof parsed.version !== 'number') throw new Error('bad save');
      applyImportedSave(parsed);
      AudioManager.playSfx('reward');
    } catch (e) {
      showToast('That code could not be read. Check it and try again.');
    }
  }
  const CloudSync = {
    enabled: readBool('super-sean-007-cloud-enabled', false),
    lastPush: 0,
    status: 'idle',
    get id() {
      try { return localStorage.getItem('super-sean-007-cloud-id') || ''; } catch (e) { return ''; }
    },
    ensureId() {
      let id = this.id;
      if (!id) {
        const bytes = new Uint8Array(20);
        crypto.getRandomValues(bytes);
        id = Array.from(bytes, b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
        try { localStorage.setItem('super-sean-007-cloud-id', id); } catch (e) {}
      }
      return id;
    },
    toggle() {
      this.enabled = !this.enabled;
      writeBool('super-sean-007-cloud-enabled', this.enabled);
      if (this.enabled) {
        const id = this.ensureId();
        this.push(true);
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(id).catch(() => {});
        showToast(`Cloud sync ON. Your sync ID (copied): ${id}`);
      } else {
        showToast('Cloud sync off. Progress still saves in this browser.');
      }
    },
    async push(force = false) {
      if (!this.enabled || state.scene === 'title') return;
      const now = Date.now();
      if (!force && now - this.lastPush < 45_000) return;
      this.lastPush = now;
      try {
        const response = await fetch(`/api/save?id=${this.ensureId()}${this.forceNext ? '&force=1' : ''}`, {
          method: 'PUT',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify(state),
          keepalive: force
        });
        this.forceNext = false;
        if (response.status === 409 && !this.conflictWarned) {
          this.conflictWarned = true;
          this.status = 'conflict';
          showToast('Cloud has a newer save from another device. Use "Load Code" with your sync ID to pull it, or keep playing to overwrite.');
          this.forceNext = true; // next push wins if they keep playing
        } else {
          this.status = response.ok ? 'synced' : 'error';
        }
      } catch (e) {
        this.status = 'offline';
      }
    },
    forceNext: false,
    conflictWarned: false,
    async pull(id) {
      showToast('Fetching cloud save...');
      try {
        const response = await fetch(`/api/save?id=${id}`);
        if (!response.ok) { showToast(response.status === 404 ? 'No cloud save found for that ID.' : 'Cloud save could not be loaded.'); return; }
        const parsed = await response.json();
        try { localStorage.setItem('super-sean-007-cloud-id', id); } catch (e) {}
        this.enabled = true;
        writeBool('super-sean-007-cloud-enabled', true);
        applyImportedSave(parsed);
        AudioManager.playSfx('reward');
      } catch (e) {
        showToast('Cloud is unreachable right now — try a save code instead.');
      }
    }
  };

  function downloadScreenshot() {
    try {
      const link = document.createElement('a');
      link.download = `super-sean-007-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Screenshot saved to your downloads!');
      AudioManager.playSfx('ui_confirm');
    } catch (e) {
      showToast('Screenshot failed in this browser.');
    }
  }

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
    } catch (e) { return fallback; }
  }
  function writeBool(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) {}
  }
  function readNumber(key, fallback) {
    try {
      const v = parseFloat(localStorage.getItem(key));
      return Number.isFinite(v) ? v : fallback;
    } catch (e) { return fallback; }
  }
  function writeNumber(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) {}
  }

  function showToast(text) { toast = text; toastTimer = 180; }
  function currentMap() { return maps[state.mapId]; }
  function isMoving() {
    return Boolean(keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight ||
      keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD ||
      activeTouches.up || activeTouches.down || activeTouches.left || activeTouches.right);
  }
  function addFx(text, opts = {}) {
    fx.push({
      text,
      img: opts.img || null,
      x: opts.x ?? state.player.x,
      y: opts.y ?? state.player.y - 40,
      vy: opts.vy ?? -0.6,
      life: opts.life ?? 70,
      color: opts.color ?? '#ffe98a',
      screen: Boolean(opts.screen),
      size: opts.size ?? 15
    });
  }

  // Sean face reactions popped above the player on key moments.
  const EMOTES = {
    happy: 'emote_1', smile: 'emote_2', angry: 'emote_3', worried: 'emote_4',
    cry: 'emote_5', calm: 'emote_6', neutral: 'emote_7', love: 'emote_8'
  };
  function showEmote(mood, opts = {}) {
    addFx('', {img: EMOTES[mood] || EMOTES.happy, y: state.player.y - 62, vy: -0.22, life: 95, size: 40, ...opts});
  }

  // Full-screen battle transition card (Battle Start / Victory / Level Up …):
  // scales in, holds, then fades. Drawn over everything by drawCard().
  let card = null;
  function showCard(name, life = 78) {
    if (card && card.life > 12) return; // don't clobber a card still on screen
    card = {name, life, maxLife: life};
  }
  function drawCard() {
    if (!card) return;
    const im = img[card.name];
    if (!im || !im.complete || !im.naturalWidth) { card = null; return; }
    const t = 1 - card.life / card.maxLife;           // 0 → 1 over its life
    const scale = t < 0.18 ? 0.6 + (t / 0.18) * 0.45 : 1.05 - Math.min(0.05, (t - 0.18) * 0.1);
    const alpha = card.life < 16 ? card.life / 16 : (t < 0.12 ? t / 0.12 : 1);
    const h = 210 * scale, w = h * (im.naturalWidth / im.naturalHeight);
    g.save();
    g.globalAlpha = Math.max(0, Math.min(1, alpha));
    g.drawImage(im, GAME_W / 2 - w / 2, GAME_H / 2 - h / 2 - 30, w, h);
    g.restore();
  }

  /* ---------------- module wiring ---------------- */
  const ctx = {
    g, GAME_W, GAME_H, img,
    state: () => state,
    maps: () => maps,
    currentMap,
    systems: () => systems,
    battleApi: () => battleApi,
    dialogue: () => dialogue,
    toast: () => toast,
    toastTimer: () => toastTimer,
    isMoving,
    save,
    showToast,
    fx: addFx,
    emote: showEmote,
    showCard,
    sfx: id => AudioManager.playSfx(id),
    music: id => AudioManager.playMusic(id),
    stat: (event, once) => { try { window.SSGStats && window.SSGStats.track(event, once); } catch (e) {} },
    setScene: scene => { state.scene = scene; },
    showDialogue: (speaker, lines, portraitChar) => { dialogue = {speaker, lines: [].concat(lines), index: 0, portrait: portraitChar || null}; state.scene = 'dialogue'; },
    nextDialogue: () => nextDialogue(),
    startGame: () => startGame(),
    resetGame: () => resetGame(),
    exitBuild: () => { state.scene = 'explore'; AudioManager.playSfx('menu_open'); },
    adRevive: onSuccess => AdManager.showRewardedAd('revive', onSuccess),
    interstitial: reason => AdManager.maybeInterstitial(reason),
    rebuildMaps: () => { maps = SSG.buildMaps(); },
    canMoveTo: (x, y) => canMoveTo(x, y),
    inputDir: () => {
      let dx = 0, dy = 0;
      if (keys.ArrowUp || keys.KeyW || activeTouches.up) dy -= 1;
      if (keys.ArrowDown || keys.KeyS || activeTouches.down) dy += 1;
      if (keys.ArrowLeft || keys.KeyA || activeTouches.left) dx -= 1;
      if (keys.ArrowRight || keys.KeyD || activeTouches.right) dx += 1;
      return {dx, dy};
    },
    coopApi: () => coop,
    saveSummary: () => saveSummary(),
    exportSave: () => exportSaveCode(),
    importSave: () => importSaveFlow(),
    cloud: () => ({enabled: CloudSync.enabled, id: CloudSync.id, status: CloudSync.status, toggle: () => CloudSync.toggle()}),
    drawTile: (tileset, id, sx, sy) => AssetManager.drawTile(tileset, id, sx, sy),
    drawTileScaled: (tileset, id, sx, sy, w, h) => AssetManager.drawTileScaled(tileset, id, sx, sy, w, h),
    drawIcon: (name, sx, sy, w, h) => AssetManager.drawIcon(name, sx, sy, w, h),
    drawItemIcon: (def, sx, sy, w, h) => AssetManager.drawItemIcon(def, sx, sy, w, h),
    drawCharacterFrame: (char, frame, x, y, w, h) => AssetManager.drawCharacterFrame(char, frame, x, y, w, h)
  };

  const systems = SSG.createSystems(ctx);
  const battleApi = SSG.createBattle(ctx);
  const renderer = SSG.createRenderer(ctx);
  const coop = SSG.createCoop(ctx);

  /* ---------------- world logic ---------------- */
  function blockedTile(map, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return true;
    if (map.id === 'homestead') {
      if (map.totem && map.totem.tx === tx && map.totem.ty === ty) return true;
      const piece = systems.pieceAt(tx, ty);
      if (piece?.solid) return true;
    }
    if (systems.nodeAt(map, tx, ty)) return true;
    return SSG.SOLID_TILES[map.tileset]?.has(map.tiles[ty][tx]) || false;
  }

  function canMoveTo(x, y) {
    const m = currentMap();
    const pad = 20;
    const points = [[x - pad, y - pad], [x + pad, y - pad], [x - pad, y + pad], [x + pad, y + pad]];
    return points.every(([px, py]) => !blockedTile(m, Math.floor(px / TILE), Math.floor(py / TILE)));
  }

  function startGame() {
    AudioManager.unlock();
    load();
    state.scene = 'explore';
    AudioManager.playMusic(MAP_MUSIC[state.mapId] || 'village');
    AudioManager.playSfx('ui_confirm');
    ctx.stat('game_start');
    showToast('Welcome back to Asteria-007.');
  }
  function resetGame() {
    AudioManager.unlock();
    state = defaultState();
    save();
    state.scene = 'explore';
    AudioManager.playMusic('village');
    AudioManager.playSfx('ui_confirm');
    ctx.stat('game_start');
    ctx.stat('new_game');
    showToast('New adventure started. Find Elder Brightbeard!');
    if (!readBool('super-sean-007-onboarded', false)) {
      writeBool('super-sean-007-onboarded', true);
      if (window.SSGOnboard) window.SSGOnboard();
    }
  }

  function nextDialogue() {
    if (!dialogue) return;
    dialogue.index += 1;
    if (dialogue.index >= dialogue.lines.length) {
      dialogue = null;
      state.scene = 'explore';
      AudioManager.playSfx('ui_confirm');
      save();
    }
  }

  function usePortal(portal) {
    if (portal.locked && !state.unlocked[portal.locked]) {
      ctx.showDialogue('Locked Path', [`${portal.label} is sealed by Gem magic. Continue the main quest to unlock it.`]);
      return;
    }
    state.mapId = portal.target;
    state.player.x = portal.spawn.x;
    state.player.y = portal.spawn.y;
    AudioManager.playSfx('portal');
    AudioManager.playMusic(MAP_MUSIC[state.mapId] || 'village');
    addFx('', {img: 'vfx_teleport', x: state.player.x + 16, y: state.player.y, size: 96, vy: -0.1, life: 45});
    showToast(`Entered ${maps[state.mapId].name}.`);
    save();
    if (portal.target === 'village') setTimeout(() => AdManager.maybeInterstitial('return_to_village'), 600);
  }

  function openChest(chest) {
    if (state.chestsOpened[chest.id] && !chest.ad) { showToast('Already opened.'); return; }
    if (chest.locked && !state.chestsOpened[chest.id]) {
      if (systems.countItem('Old Key') <= 0) {
        AudioManager.playSfx('menu_open');
        showToast(`${chest.label} is sealed tight. An Old Key would open it.`);
        return;
      }
      systems.removeItem('Old Key', 1);
      systems.bumpStat('lockedChestsOpened');
      showToast('The Old Key turns — the seal shatters!');
    }
    const award = () => {
      const coins = chest.reward.coins || 0;
      state.hero.coins += coins;
      if (chest.reward.item) systems.addItem(chest.reward.item, 1);
      if (!chest.ad) state.chestsOpened[chest.id] = true;
      AudioManager.playSfx('chest');
      const coinIcon = coins >= 100 ? 'icon_coin_gold' : coins >= 40 ? 'icon_coin_silver' : 'icon_coin_bronze';
      addFx('', {img: coinIcon, y: state.player.y - 66, size: 34, vy: -0.4, life: 75});
      addFx(`+${coins} coins`, {color: '#ffe98a'});
      showToast(`${chest.label}: +${coins} coins${chest.reward.item ? ', ' + chest.reward.item : ''}`);
      save();
    };
    if (chest.ad) AdManager.showRewardedAd('daily_chest', award); else award();
  }

  function interact() {
    if (state.scene !== 'explore') return;
    const m = currentMap();
    const p = state.player;
    const npc = m.npcs.find(n => systems.npcVisible(n) && Math.hypot(n.x - p.x, n.y - p.y) < 72);
    if (npc) return systems.talk(npc);
    if (systems.digTreasure()) return;
    const node = systems.nearestNode(m, p.x, p.y, 80);
    if (node) return systems.harvest(node);
    if (m.id === 'homestead') {
      if (m.totem && Math.hypot(m.totem.tx * TILE + 32 - p.x, m.totem.ty * TILE + 32 - p.y) < 90) {
        return systems.interactTotem();
      }
      const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const piece = systems.pieceAt(ptx + dx, pty + dy);
        if (piece?.station === 'soil') return systems.interactSoil(ptx + dx, pty + dy);
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const piece = systems.pieceAt(ptx + dx, pty + dy);
        if (piece?.station === 'bed') return systems.restAtBed(ptx + dx, pty + dy);
      }
    }
    if (m.board && Math.hypot(m.board.tx * TILE + 32 - p.x, m.board.ty * TILE + 32 - p.y) < 80) {
      return systems.interactBoard();
    }
    const chest = m.chests.find(c => Math.hypot(c.x - p.x, c.y - p.y) < 72);
    if (chest) return openChest(chest);
    const note = m.notes.find(n => Math.hypot(n.x - p.x, n.y - p.y) < 72);
    if (note) return ctx.showDialogue('Asteria-007', [note.text]);
    const portal = m.portals.find(pt => p.x > pt.x - 30 && p.y > pt.y - 30 && p.x < pt.x + pt.w && p.y < pt.y + pt.h);
    if (portal) return usePortal(portal);
    if (systems.nearWater(m, p.x, p.y)) return systems.startFishing();
    showToast('Nothing to interact with here.');
  }

  function toggleScene(type) {
    if (type === 'party') {
      if (state.scene === 'party') { state.scene = coop.state.mode === 'guest' ? 'coopGuest' : 'explore'; return; }
      if (['title', 'explore', 'coopGuest'].includes(state.scene)) {
        state.scene = 'party';
        AudioManager.playSfx('menu_open');
      }
      return;
    }
    if (state.scene === type) { state.scene = 'explore'; return; }
    if (!['explore', 'inventory', 'quest', 'map', 'craft', 'shop', 'build'].includes(state.scene)) return;
    if (type === 'build') {
      if (state.mapId !== 'homestead') { showToast('Build mode works at your Homestead (south of the village).'); return; }
      if (!state.homestead.claimed) { showToast('Claim the Homestead Crystal first!'); return; }
      systems.build.cursor = {tx: Math.floor(state.player.x / TILE), ty: Math.floor(state.player.y / TILE)};
      systems.build.blueprintOpen = false;
    }
    state.scene = type;
    AudioManager.playSfx('menu_open');
  }

  /* ---------------- update loop ---------------- */
  function update(dt) {
    if (toastTimer > 0) toastTimer -= 1;
    if (card) { card.life -= dt / 16.67; if (card.life <= 0) card = null; }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.y += f.vy * dt / 16.67;
      f.life -= dt / 16.67;
      if (f.life <= 0) fx.splice(i, 1);
    }
    if (state.scene !== 'title') state.playMinutes += dt / 60000;
    coop.update(dt);
    if (state.scene === 'coopGuest' || state.scene === 'party') return;
    if (state.scene === 'battle') { battleApi.update(); return; }
    if (state.scene === 'fishing') { systems.updateFishing(dt); return; }
    if (state.scene !== 'explore') return;
    const p = state.player;
    let dx = 0, dy = 0;
    if (keys.ArrowUp || keys.KeyW || activeTouches.up) dy -= 1;
    if (keys.ArrowDown || keys.KeyS || activeTouches.down) dy += 1;
    if (keys.ArrowLeft || keys.KeyA || activeTouches.left) dx -= 1;
    if (keys.ArrowRight || keys.KeyD || activeTouches.right) dx += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy); dx /= len; dy /= len;
      const nx = p.x + dx * p.speed * dt / 16.67;
      const ny = p.y + dy * p.speed * dt / 16.67;
      if (canMoveTo(nx, p.y)) p.x = nx;
      if (canMoveTo(p.x, ny)) p.y = ny;
      p.frameTimer += dt;
      if (p.frameTimer > 140) { p.frame = (p.frame + 1) % 4; p.frameTimer = 0; }
      p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    } else {
      p.frame = 0;
    }
    for (const mon of currentMap().monsters) {
      if (mon.defeated || state.defeatedBosses[mon.id]) continue;
      if (mon.requiresDefeated && !state.defeatedBosses[mon.requiresDefeated]) continue;
      if (mon.requiresGems && state.gems.length < mon.requiresGems) continue;
      if (Math.hypot(mon.x - p.x, mon.y - p.y) < 52) battleApi.start(mon);
    }
  }

  function drawFx() {
    if (!fx.length) return;
    const cam = ['explore', 'build', 'dialogue', 'fishing'].includes(state.scene) ? renderer.camera() : {x: 0, y: 0};
    g.save();
    for (const f of fx) {
      const x = f.screen ? f.x : f.x - cam.x;
      const y = f.screen ? f.y : f.y - cam.y;
      g.globalAlpha = Math.max(0, Math.min(1, f.life / 40));
      const im = f.img && img[f.img];
      if (im && im.complete && im.naturalWidth) {
        g.drawImage(im, x - f.size / 2, y - f.size / 2, f.size, f.size);
        continue;
      }
      g.font = `bold ${f.size}px Nunito, Arial`;
      g.strokeStyle = 'rgba(10,30,50,.8)'; g.lineWidth = 3;
      g.strokeText(f.text, x, y);
      g.fillStyle = f.color;
      g.fillText(f.text, x, y);
    }
    g.restore();
  }

  function loop(t) {
    const dt = Math.min(40, t - lastTime || 16.67);
    lastTime = t;
    update(dt);
    renderer.render();
    drawFx();
    drawCard();
    requestAnimationFrame(loop);
  }

  /* ---------------- input ---------------- */
  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return {x: (e.clientX - r.left) * GAME_W / r.width, y: (e.clientY - r.top) * GAME_H / r.height};
  }

  canvas.addEventListener('click', e => {
    AudioManager.unlock();
    const {x, y} = canvasPos(e);
    renderer.click(x, y);
  });
  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (state.scene === 'build') {
      const {x, y} = canvasPos(e);
      if (y < 386) {
        const cam = renderer.camera();
        systems.removePiece(Math.floor((x + cam.x) / TILE), Math.floor((y + cam.y) / TILE));
      }
    }
  });
  canvas.addEventListener('mousemove', e => {
    if (state.scene !== 'build') return;
    const {x, y} = canvasPos(e);
    if (y < 386) {
      const cam = renderer.camera();
      systems.build.cursor = {tx: Math.floor((x + cam.x) / TILE), ty: Math.floor((y + cam.y) / TILE)};
    }
  });
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    AudioManager.unlock();
    const t0 = e.changedTouches[0];
    const r = canvas.getBoundingClientRect();
    renderer.click((t0.clientX - r.left) * GAME_W / r.width, (t0.clientY - r.top) * GAME_H / r.height);
  }, {passive: false});

  window.addEventListener('keydown', e => {
    AudioManager.unlock();
    keys[e.code] = true;
    // Stop arrows/space from scrolling the page while the game is on screen.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      const rect = canvas.getBoundingClientRect();
      if (rect.bottom > 60 && rect.top < window.innerHeight - 60) e.preventDefault();
    }
    if (state.scene === 'title') {
      if (e.code === 'Enter') startGame();
      if (e.code === 'KeyN') resetGame();
      return;
    }
    if (state.scene === 'dialogue') {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') nextDialogue();
      return;
    }
    if (state.scene === 'fishing') {
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') systems.castFishing();
      if (e.code === 'Escape') systems.cancelFishing();
      return;
    }
    if (state.scene === 'coopGuest') {
      if (e.code === 'KeyE') coop.guestInteract();
      if (e.code === 'Digit1' || e.code === 'Space') coop.guestBattleAction();
      if (e.code === 'Escape') coop.leave();
      return;
    }
    if (state.scene === 'party') {
      if (e.code === 'Escape') state.scene = coop.state.mode === 'guest' ? 'coopGuest' : 'explore';
      return;
    }
    if (state.scene === 'battle') {
      const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].indexOf(e.code);
      if (idx >= 0) {
        const cmd = battleApi.commands()[idx];
        if (cmd) battleApi.action(cmd.id);
      }
      return;
    }
    if (state.scene === 'build') {
      const b = systems.build;
      const r = systems.claimRect();
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') b.cursor.tx = Math.max(r.x0 - 1, b.cursor.tx - 1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') b.cursor.tx = Math.min(r.x1 + 1, b.cursor.tx + 1);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') b.cursor.ty = Math.max(r.y0 - 1, b.cursor.ty - 1);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') b.cursor.ty = Math.min(r.y1 + 1, b.cursor.ty + 1);
      if (e.code === 'Tab') {
        e.preventDefault();
        b.cat = (b.cat + (e.shiftKey ? SSG.BUILD_CATEGORIES.length - 1 : 1)) % SSG.BUILD_CATEGORIES.length;
        b.idx = 0;
      }
      if (e.code === 'BracketLeft' || e.code === 'Comma') b.idx = Math.max(0, b.idx - 1);
      if (e.code === 'BracketRight' || e.code === 'Period') b.idx += 1;
      if (e.code === 'Enter') {
        if (b.removeMode) systems.removePiece(b.cursor.tx, b.cursor.ty);
        else systems.place(b.cursor.tx, b.cursor.ty);
      }
      if (e.code === 'KeyX') systems.removePiece(b.cursor.tx, b.cursor.ty);
      if (e.code === 'KeyV') b.blueprintOpen = !b.blueprintOpen;
      if (e.code === 'KeyB' || e.code === 'Escape') { state.scene = 'explore'; AudioManager.playSfx('menu_open'); }
      return;
    }
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyI') toggleScene('inventory');
    if (e.code === 'KeyQ') toggleScene('quest');
    if (e.code === 'KeyM') toggleScene('map');
    if (e.code === 'KeyC') toggleScene('craft');
    if (e.code === 'KeyB') toggleScene('build');
    if (e.code === 'KeyP') { save(); AudioManager.playSfx('ui_confirm'); showToast(`Game saved${CloudSync.enabled ? ' + cloud sync' : ''}.`); }
    if (e.code === 'KeyO') AudioManager.toggleMusic();
    if (e.code === 'KeyL') AudioManager.toggleSfx();
    if (e.code === 'KeyT') downloadScreenshot();
    if (e.code === 'KeyG' && state.scene === 'explore' && state.mapId === 'homestead' && state.quest.id === 'postgame') {
      const totem = currentMap().totem;
      if (totem && Math.hypot(totem.tx * TILE + 32 - state.player.x, totem.ty * TILE + 32 - state.player.y) < 110) {
        systems.startNgPlus();
      }
    }
    if (e.code === 'Escape' && ['inventory', 'quest', 'map', 'craft', 'shop'].includes(state.scene)) state.scene = 'explore';
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  /* ---------------- QA + external API ---------------- */
  function renderGameToText() {
    const m = maps[state.mapId] || {npcs: [], chests: [], monsters: [], portals: [], nodes: [], name: 'Unknown'};
    const p = state.player;
    const payload = {
      coordinateSystem: 'Canvas pixels, origin top-left, x right, y down.',
      scene: state.scene,
      map: {id: state.mapId, name: m.name, width: m.w, height: m.h},
      player: {x: Math.round(p.x), y: Math.round(p.y), direction: p.dir},
      hero: {...state.hero, effective: systems.heroStats()},
      equipment: {...state.equipment},
      quest: state.quest,
      gems: state.gems,
      party: state.party,
      unlocked: state.unlocked,
      items: {...state.items},
      homestead: {
        claimed: state.homestead.claimed,
        level: state.homestead.level,
        comfort: systems.comfort(),
        pieces: Object.keys(state.homestead.tiles).length,
        blueprintsBuilt: state.homestead.blueprintsBuilt,
        crops: Object.keys(state.crops).length
      },
      build: state.scene === 'build' ? {
        cursor: systems.build.cursor,
        category: SSG.BUILD_CATEGORIES[systems.build.cat],
        piece: systems.selectedPiece()?.id,
        removeMode: systems.build.removeMode,
        blueprintOpen: systems.build.blueprintOpen
      } : null,
      nearby: {
        npcs: m.npcs.filter(n => systems.npcVisible(n) && Math.hypot(n.x - p.x, n.y - p.y) < 130)
          .map(n => ({id: n.id, name: n.name, x: Math.round(n.x), y: Math.round(n.y)})),
        nodes: (m.nodes || []).filter(n => Math.hypot(n.tx * TILE - p.x, n.ty * TILE - p.y) < 160)
          .map(n => ({id: n.id, kind: n.kind, active: systems.nodeActive(n)})),
        chests: m.chests.filter(c => Math.hypot(c.x - p.x, c.y - p.y) < 140)
          .map(c => ({id: c.id, label: c.label, opened: Boolean(state.chestsOpened[c.id])})),
        portals: m.portals.map(pt => ({id: pt.id, label: pt.label, target: pt.target, locked: Boolean(pt.locked && !state.unlocked[pt.locked])}))
      },
      visibleMonsters: m.monsters
        .filter(mon => !mon.defeated && !state.defeatedBosses[mon.id] && (!mon.requiresDefeated || state.defeatedBosses[mon.requiresDefeated]))
        .map(mon => ({id: mon.id, name: mon.name, kind: mon.kind, x: Math.round(mon.x), y: Math.round(mon.y), hp: mon.hp, boss: Boolean(mon.boss)})),
      battle: battleApi.current ? {
        enemy: {id: battleApi.current.enemy.id, name: battleApi.current.enemy.name, hp: battleApi.current.enemy.hp, maxHp: battleApi.current.enemy.maxHp},
        turn: battleApi.current.turn,
        commands: battleApi.commands().map(c => c.id),
        log: battleApi.current.log.slice(0, 4)
      } : null,
      stats: {...state.stats},
      achievements: Object.keys(state.achievements || {}),
      daily: state.daily ? {...systems.dailyRequest()} : null,
      treasure: state.treasure ? {...state.treasure} : null,
      ngPlus: state.ngPlus || 0,
      fishing: state.scene === 'fishing' ? {pos: Number(systems.fishing.pos.toFixed(2))} : null,
      persistence: {savedAt: state.savedAt, playMinutes: Math.round(state.playMinutes), cloud: {enabled: CloudSync.enabled, status: CloudSync.status}},
      coop: {
        mode: coop.state.mode,
        code: coop.state.code,
        status: coop.state.status,
        guests: Object.values(coop.state.guests).map(gu => ({char: gu.char, name: gu.name, connected: gu.dc?.readyState === 'open'})),
        myChar: coop.state.myChar,
        remoteMap: coop.state.remote?.mapId || null
      },
      assets: {criticalImages: Object.keys(img).length, missingImages: runtime.assetWarnings, slicedFrames: runtime.slicedAssets?.frames?.length || 0},
      audio: AudioManager.status()
    };
    return JSON.stringify(payload);
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms = 16.67) => {
    runtime.deterministic = true;
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) update(1000 / 60);
    renderer.render();
    drawFx();
    drawCard();
    return renderGameToText();
  };

  window.SuperSeanGame = {
    press(dir, down = true) { activeTouches[dir] = down; },
    interact,
    menu(type) { AudioManager.unlock(); toggleScene(type); },
    save,
    screenshot: downloadScreenshot,
    exportSave: exportSaveCode,
    importSave: importSaveFlow,
    cloudSync: () => CloudSync.toggle(),
    settings: () => ({
      music: AudioManager.musicVolume, sfx: AudioManager.sfxVolume,
      musicMuted: AudioManager.musicMuted, sfxMuted: AudioManager.sfxMuted,
      cloud: CloudSync.enabled, cloudId: CloudSync.id
    }),
    setMusicVolume: v => AudioManager.setMusicVolume(v),
    setSfxVolume: v => AudioManager.setSfxVolume(v),
    toggleMusicMute: () => AudioManager.toggleMusic(),
    toggleSfxMute: () => AudioManager.toggleSfx(),
    install: () => window.SuperSeanInstall && window.SuperSeanInstall(),
    toggleMusic: () => AudioManager.toggleMusic(),
    toggleSfx: () => AudioManager.toggleSfx(),
    renderState: renderGameToText,
    audioStatus: () => AudioManager.status(),
    adManager: AdManager,
    // QA helpers for automated playtesting (client-side game, no secrets to protect)
    debug: {
      teleport(mapId, tx, ty) {
        const m = maps[mapId];
        if (!m) return false;
        // Default to map centre when coords are omitted, and ignore non-finite
        // input so a bad call can never corrupt the player position with NaN.
        if (!Number.isFinite(tx)) tx = Math.floor(m.w / 2);
        if (!Number.isFinite(ty)) ty = Math.floor(m.h / 2);
        state.mapId = mapId;
        state.player.x = tx * TILE;
        state.player.y = ty * TILE;
        state.scene = 'explore';
        return true;
      },
      grant(items) { Object.entries(items).forEach(([name, qty]) => systems.addItem(name, qty)); },
      unlock(area) { state.unlocked[area] = true; },
      setQuest(id) {
        const q = SSG.MAIN_QUESTS.find(x => x.id === id);
        if (q) state.quest = {id: q.id, title: q.title, objective: q.objective, progress: 0};
      },
      claimHomestead() { state.homestead.claimed = true; state.unlocked.homestead = true; },
      coop: () => coop
    }
  };

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      this.beginPath(); this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r);
      this.closePath(); return this;
    };
  }

  // Persistence lifecycle: autosave every 20s and on tab hide/close.
  setInterval(() => {
    if (state.scene !== 'title') save();
  }, 20_000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.scene !== 'title') { save(); CloudSync.push(true); }
  });
  window.addEventListener('pagehide', () => {
    if (state.scene !== 'title') { save(); CloudSync.push(true); }
  });

  // PWA: register the service worker for installable / offline play.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
  // Capture the install prompt so a button can trigger it.
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e;
  });
  window.addEventListener('appinstalled', () => { ctx.stat('install'); deferredInstall = null; });
  window.SuperSeanInstall = () => {
    if (!deferredInstall) { showToast('Add to Home Screen from your browser menu to install.'); return; }
    deferredInstall.prompt();
    deferredInstall.userChoice.finally(() => { deferredInstall = null; });
  };

  async function bootstrap() {
    maps = SSG.buildMaps();
    // Never let a failing/slow init step hold the loader open — the game is
    // playable with assets still streaming, so start regardless.
    try {
      await Promise.all([AssetManager.init(), AudioManager.init(), AdManager.init()]);
    } catch (e) {
      console.error('[boot] initialization error, starting anyway', e);
    }
    try { load(); } catch (e) { console.error('[boot] save load failed', e); }
    state.scene = 'title';
    try { AudioManager.playMusic('title'); } catch (e) {}
    const loader = document.getElementById('gameLoader');
    if (loader) loader.classList.add('hidden');
    requestAnimationFrame(loop);
    // Lazy-load the heavy title art after boot; drawTitle falls back to a gradient meanwhile.
    const keyArt = new Image();
    keyArt.onload = () => { img.keyArtMain = keyArt; };
    keyArt.src = 'assets/key-art-main.png';
  }

  bootstrap();
})();
