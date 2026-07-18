/* Super Sean's Snowball Fight! — 3D capture-the-flag in a destructible winter
   park. Vanilla ES-module port of the original React build, extended with
   three extra power-ups (Blizzard Bomb, Triple Pack, Magnet Mittens), richer
   effects (footprints, shockwaves, dizzy stars, floating damage, kill feed,
   confetti), a settings pause menu and dedicated touch controls. */
import * as THREE from '../js/vendor/three.module.min.js';

const HEROES = [
  { name: 'Super Sean', nickname: 'The Snow Captain', speed: 86, strength: 78, accuracy: 88, role: 'All-rounder', quirk: 'Aims first. Grins second.' },
  { name: 'Harkan', nickname: 'The Human Snowplough', speed: 42, strength: 99, accuracy: 58, role: 'Tank', quirk: 'Cover? He is the cover.' },
  { name: 'Ruush', nickname: 'The Slippery Menace', speed: 96, strength: 52, accuracy: 71, role: 'Scout', quirk: 'Has never used a path.' },
  { name: 'Dave', nickname: 'Dead-Eye Dave', speed: 68, strength: 64, accuracy: 96, role: 'Sharpshooter', quirk: 'Calculates wind with his thumb.' },
  { name: 'Petroman', nickname: 'Hero-ish', speed: 82, strength: 84, accuracy: 43, role: 'Charger', quirk: 'Cape first. Plan later.' },
  { name: 'K-Lee', nickname: 'The Sonic Snowstorm', speed: 78, strength: 55, accuracy: 73, role: 'Disruptor', quirk: 'Her battle cry scares birds.' },
  { name: 'Gayon', nickname: 'Shortcut King', speed: 88, strength: 60, accuracy: 76, role: 'Flanker', quirk: 'Knows every secret tunnel.' },
  { name: 'Jaaaaay', nickname: 'The Long Call', speed: 72, strength: 70, accuracy: 82, role: 'Support', quirk: "Needs five A's. Minimum." },
  { name: 'Mark', nickname: 'The Rectangle', speed: 48, strength: 35, accuracy: 91, role: 'Sniper', quirk: 'Block head. Laser focus.' },
  { name: 'Timo', nickname: 'Mittens', speed: 66, strength: 76, accuracy: 67, role: 'Builder', quirk: 'Wears three pairs of gloves.' },
  { name: 'Pip', nickname: 'Pocket Blizzard', speed: 92, strength: 38, accuracy: 69, role: 'Runner', quirk: 'Small target. Big opinions.' },
  { name: 'Noor', nickname: 'The Cool Head', speed: 74, strength: 61, accuracy: 89, role: 'Tactician', quirk: 'Actually read the map.' },
];
const BULLIES = [
  { name: 'Rick', nickname: 'The Ringleader', speed: 79, strength: 84, accuracy: 86, role: 'Captain', quirk: 'Practises villain laughs.' },
  { name: 'Gaymanuel', nickname: 'The Showboat', speed: 88, strength: 62, accuracy: 75, role: 'Flanker', quirk: 'Celebrates before he hits.' },
  { name: 'Nicolips', nickname: 'The Pout Scout', speed: 71, strength: 68, accuracy: 79, role: 'Scout', quirk: 'Can whistle in a blizzard.' },
  { name: 'Brick', nickname: 'The Wall', speed: 39, strength: 100, accuracy: 49, role: 'Tank', quirk: 'Once tackled a snowman.' },
  { name: 'Snotty Scotty', nickname: 'The Sniffler', speed: 67, strength: 58, accuracy: 72, role: 'Trickster', quirk: 'Never lends a tissue.' },
  { name: 'Vinnie', nickname: 'The Sneak', speed: 91, strength: 52, accuracy: 81, role: 'Ambusher', quirk: 'Hides behind thin trees.' },
  { name: 'Glitch', nickname: 'The Wobbler', speed: 75, strength: 56, accuracy: 64, role: 'Disruptor', quirk: 'Moves like bad Wi-Fi.' },
  { name: 'Mo', nickname: 'The Moustache', speed: 64, strength: 80, accuracy: 70, role: 'Support', quirk: 'The moustache is marker pen.' },
  { name: 'Chadwick', nickname: 'Sir Throws-a-Lot', speed: 69, strength: 73, accuracy: 89, role: 'Sharpshooter', quirk: 'Calls snowballs ammunition.' },
  { name: 'Brenda', nickname: 'The Boss', speed: 83, strength: 74, accuracy: 84, role: 'Tactician', quirk: 'Rick quietly takes notes.' },
  { name: 'Turbo Toby', nickname: 'No Brakes', speed: 99, strength: 44, accuracy: 53, role: 'Runner', quirk: 'Turning is optional.' },
  { name: 'Fizz', nickname: 'The Soda Shaker', speed: 81, strength: 59, accuracy: 77, role: 'Charger', quirk: 'Explodes into every room.' },
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const fmtTime = (s) => `${Math.floor(s / 60)}:${Math.max(0, Math.floor(s % 60)).toString().padStart(2, '0')}`;
const $ = (id) => document.getElementById(id);
const now$ = () => performance.now() / 1000;

/* ---------- roster cards (also used by the lore page sections) ---------- */
export function buildRoster(gridEl) {
  const all = [...HEROES.map(k => ({ ...k, team: 0 })), ...BULLIES.map(k => ({ ...k, team: 1 }))];
  
  // heroes_portraits.webp is a 4x4 grid of 16 cells.
  // We map the 12 heroes to 12 unique cells in the 4x4 grid.
  const HERO_CELLS = [1, 3, 15, 5, 7, 2, 13, 14, 6, 4, 8, 12];

  // bullies_portraits.webp is a 4x3 grid of 12 cells.
  // We map the 12 bullies to 12 unique cells in the 4x3 grid.
  const BULLY_CELLS = [6, 1, 2, 11, 5, 3, 9, 10, 0, 7, 8, 4];

  gridEl.innerHTML = all.map((k, i) => {
    const isBully = k.team === 1;
    const indexInTeam = isBully ? i - 12 : i;
    const imgUrl = isBully ? 'assets/snowball/bullies_portraits.webp' : 'assets/snowball/heroes_portraits.webp';
    
    let bx, by, bgSize;
    if (isBully) {
      // 4x3 grid for bullies
      const cellIndex = BULLY_CELLS[indexInTeam];
      const col = cellIndex % 4;
      const row = Math.floor(cellIndex / 4);
      bx = (col * 100) / 3;
      by = (row * 100) / 2;
      bgSize = '400% 300%';
    } else {
      // 4x4 grid for heroes
      const cellIndex = HERO_CELLS[indexInTeam];
      const col = cellIndex % 4;
      const row = Math.floor(cellIndex / 4);
      bx = (col * 100) / 3;
      by = (row * 100) / 3;
      bgSize = '400% 400%';
    }
    return `
    <article class="kid-card team-${k.team}">
      <div class="portrait p${i % 8}" style="background-image: url('${imgUrl}'); background-position: ${bx}% ${by}%; background-size: ${bgSize};"></div>
      <div class="kid-info">
        <small>${k.nickname} • ${k.role}</small>
        <h3>${k.name}</h3>
        <p>${k.quirk}</p>
        <div class="stats">
          <label>SPD <span><i style="width:${k.speed}%"></i></span><b>${k.speed}</b></label>
          <label>STR <span><i style="width:${k.strength}%"></i></span><b>${k.strength}</b></label>
          <label>AIM <span><i style="width:${k.accuracy}%"></i></span><b>${k.accuracy}</b></label>
        </div>
      </div>
    </article>`;
  }).join('');
}

/* ---------- boot ---------- */
export function startSnowball() {
  const playWrap = $('playWrap');
  const mount = $('gameStage');
  if (!playWrap || !mount) return;

  let mode = 'title';
  let difficulty = 'classic';
  let muted = localStorage.getItem('ssb-muted') === '1';
  let sensitivity = Number(localStorage.getItem('ssb-sens') || 1);
  let invertY = localStorage.getItem('ssb-invert') === '1';
  let engineReady = false;
  let startGame = null;
  let resetMatch = null;
  let audioCtx = null;
  let matchStats = { shots: 0, hits: 0, knockouts: 0, captures: 0, blue: 0, orange: 0 };

  const setMode = (m) => {
    mode = m;
    playWrap.dataset.mode = m;
    document.body.classList.toggle('snowball-playing', m === 'playing' || m === 'paused');
  };
  setMode('title');

  const soundBtn = $('btnSound');
  const syncSound = () => { if (soundBtn) soundBtn.textContent = muted ? '🔇' : '🔊'; };
  syncSound();
  soundBtn?.addEventListener('click', () => { muted = !muted; localStorage.setItem('ssb-muted', muted ? '1' : '0'); syncSound(); });

  const beep = (kind) => {
    if (muted) return;
    try {
      audioCtx = audioCtx || new AudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime;
      const config = {
        throw: [260, 90, 'sine'], hit: [110, 60, 'square'], power: [520, 260, 'triangle'],
        score: [660, 880, 'sine'], bonk: [80, 42, 'sawtooth'], reload: [180, 220, 'triangle'],
        storm: [420, 60, 'sawtooth'],
      }[kind];
      osc.type = config[2];
      osc.frequency.setValueAtTime(config[0], t);
      osc.frequency.exponentialRampToValueAtTime(config[1], t + .16);
      gain.gain.setValueAtTime(kind === 'score' ? .14 : .07, t);
      gain.gain.exponentialRampToValueAtTime(.001, t + .2);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t); osc.stop(t + .21);
    } catch { /* audio optional */ }
  };

  /* loading screen pacing */
  const loadBar = $('loadBar'), loadPct = $('loadPct'), loadTip = $('loadTip'), loadLine = $('loadLine');
  const TIPS = [
    'Blue rings are friends. Orange rings are targets.',
    'Mega Snowballs can flatten weakened forts.',
    'Blizzard Bombs park a private storm on the enemy lane.',
    'Magnet Mittens drag every nearby power-up to you.',
    'Right-click focus predicts a moving target’s path.',
  ];
  const beginLoading = () => {
    setMode('loading');
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += 80;
      const pct = Math.min(engineReady ? 100 : 92, 10 + Math.round(elapsed / 17));
      if (loadBar) loadBar.style.width = pct + '%';
      if (loadPct) loadPct.textContent = pct + '%';
      if (loadTip) loadTip.textContent = TIPS[Math.min(TIPS.length - 1, Math.floor(pct / (100 / TIPS.length)))];
      if (loadLine) loadLine.textContent = engineReady ? 'Mittens on. Tactics questionable.' : 'Building forts and waking the dog…';
      if (engineReady && elapsed >= 960) { clearInterval(timer); startGame?.(); }
    }, 80);
  };

  /* menu wiring */
  $('btnPlay')?.addEventListener('click', () => setMode('briefing'));
  $('btnBackTitle')?.addEventListener('click', () => setMode('title'));
  document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => {
    difficulty = b.dataset.diff;
    document.querySelectorAll('[data-diff]').forEach(x => x.classList.toggle('active', x === b));
  }));
  $('btnDeploy')?.addEventListener('click', () => { if (!audioCtx) { try { audioCtx = new AudioContext(); } catch {} } beginLoading(); });
  $('btnRematch')?.addEventListener('click', beginLoading);
  $('btnQuitOver')?.addEventListener('click', () => { resetMatch?.(); setMode('title'); });
  $('btnQuitPause')?.addEventListener('click', () => { resetMatch?.(); setMode('title'); document.exitFullscreen?.(); });
  const sensInput = $('sensRange');
  if (sensInput) { sensInput.value = sensitivity; sensInput.addEventListener('input', () => { sensitivity = Number(sensInput.value); localStorage.setItem('ssb-sens', String(sensitivity)); }); }
  const invertInput = $('invertY');
  if (invertInput) { invertInput.checked = invertY; invertInput.addEventListener('change', () => { invertY = invertInput.checked; localStorage.setItem('ssb-invert', invertY ? '1' : '0'); }); }
  $('btnFull')?.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else playWrap.requestFullscreen?.().catch(() => {});
  });

  /* HUD element cache */
  const hudEls = {
    blueScore: $('hudBlueScore'), orangeScore: $('hudOrangeScore'), time: $('hudTime'),
    blueAlive: $('hudBlueAlive'), orangeAlive: $('hudOrangeAlive'), msg: $('hudMsg'),
    objLabel: $('hudObjLabel'), objDist: $('hudObjDist'), ammo: $('hudAmmo'), ammoMax: $('hudAmmoMax'),
    weaponName: $('hudWeaponName'), weaponPanel: $('weaponPanel'), reloadWrap: $('reloadWrap'), reloadBar: $('reloadBar'),
    hearts: $('hudHearts'), buffs: $('hudBuffs'), streak: $('streakPop'), streakN: $('streakN'),
    target: $('targetCard'), targetName: $('targetName'), targetHp: $('targetHp'), targetTag: $('targetTag'),
    crosshair: $('crosshair'), flagCarry: $('flagCarry'), knock: $('knockOverlay'), knockN: $('knockN'),
    feed: $('killFeed'), minimap: $('minimapCanvas'), dmg: $('dmgFlash'), frost: $('frostVignette'),
  };
  const minimapCtx = hudEls.minimap ? hudEls.minimap.getContext('2d') : null;
  const feedItems = [];
  const pushFeed = (html) => {
    if (!hudEls.feed) return;
    feedItems.push({ html, until: now$() + 4.6 });
    if (feedItems.length > 4) feedItems.shift();
    hudEls.feed.innerHTML = feedItems.map(f => `<div>${f.html}</div>`).join('');
  };
  setInterval(() => {
    const t = now$();
    const keep = feedItems.filter(f => f.until > t);
    if (keep.length !== feedItems.length) { feedItems.length = 0; feedItems.push(...keep); if (hudEls.feed) hudEls.feed.innerHTML = feedItems.map(f => `<div>${f.html}</div>`).join(''); }
  }, 700);

  /* ---------- engine ---------- */
  const fallback = () => { playWrap.classList.add('webgl-fallback'); engineReady = true; startGame = () => setMode('playing'); resetMatch = () => {}; };
  let renderer;
  try {
    const probe = document.createElement('canvas');
    const ok = Boolean(probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) || probe.getContext('webgl', { failIfMajorPerformanceCaveat: true }));
    if (!ok) throw new Error('no webgl');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch { fallback(); return; }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x83d6ff);
  scene.fog = new THREE.FogExp2(0xa9def4, .0055);
  const camera = new THREE.PerspectiveCamera(72, 1, .1, 420);
  camera.position.set(-70, 3.4, 0);
  camera.rotation.order = 'YXZ';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  mount.appendChild(renderer.domElement);
  renderer.domElement.className = 'game-canvas';

  scene.add(new THREE.HemisphereLight(0xdff7ff, 0x4f80a8, 2.1));
  const sun = new THREE.DirectionalLight(0xfff3d2, 3.2);
  sun.position.set(-35, 70, 28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -105; sun.shadow.camera.right = 105;
  sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
  scene.add(sun);

  const toon = (color, rough = .82) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  const MAT = {
    snow: toon(0xf4fbff, .9), snowShade: toon(0xc8edfa),
    ice: new THREE.MeshPhysicalMaterial({ color: 0x80dbf4, roughness: .18, metalness: .02, transparent: true, opacity: .87 }),
    bark: toon(0x6f4933), pine: toon(0x176f68), pine2: toon(0x0f5553), blue: toon(0x26a9e8), blueDark: toon(0x116cae), cyan: toon(0x53e8e1),
    orange: toon(0xff6d2d), orangeDark: toon(0xa93b3d), purple: toon(0x7634b8), skin: toon(0xffbd92), skin2: toon(0xc97d55),
    coal: toon(0x192b43), white: toon(0xffffff), red: toon(0xff3e5e), gold: toon(0xffcf3e), green: toon(0x66cb59), pink: toon(0xff78aa),
    storm: toon(0xbde9ff, .5),
  };

  const world = new THREE.Group();
  scene.add(world);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(190, 132, 20, 14), MAT.snow);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.position.y = -.12;
  world.add(floor);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(23, 48), MAT.ice);
  lake.rotation.x = -Math.PI / 2; lake.position.set(2, .02, -5); lake.receiveShadow = true;
  world.add(lake);
  const lakeRim = new THREE.Mesh(new THREE.TorusGeometry(23, .8, 9, 64), MAT.snowShade);
  lakeRim.rotation.x = Math.PI / 2; lakeRim.position.copy(lake.position); world.add(lakeRim);

  const obstacles = [];
  const addBlock = (x, z, sx, sy, sz, material, destructible = false, name = 'cover', rot = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 2, 1, 2), material);
    mesh.position.set(x, sy / 2, z); mesh.rotation.y = rot; mesh.castShadow = true; mesh.receiveShadow = true;
    world.add(mesh);
    obstacles.push({ mesh, x, z, hx: Math.abs(Math.cos(rot) * sx / 2) + Math.abs(Math.sin(rot) * sz / 2), hz: Math.abs(Math.sin(rot) * sx / 2) + Math.abs(Math.cos(rot) * sz / 2), hp: destructible ? 8 : 999, maxHp: destructible ? 8 : 999, destructible, name });
    return mesh;
  };
  const addFort = (x, team) => {
    const dir = team === 0 ? 1 : -1;
    const accent = team === 0 ? MAT.blue : MAT.orange;
    addBlock(x, 0, 4, 4, 26, MAT.snowShade, true, 'fort wall');
    addBlock(x + dir * 7, -10, 12, 3, 4, MAT.snow, true, 'fort wing', -.12 * dir);
    addBlock(x + dir * 7, 10, 12, 3, 4, MAT.snow, true, 'fort wing', .12 * dir);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 6, 12), MAT.snowShade);
    tower.position.set(x - dir * 1.5, 3, 0); tower.castShadow = tower.receiveShadow = true; world.add(tower);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(5.45, .32, 8, 16), accent);
    stripe.rotation.x = Math.PI / 2; stripe.position.set(x - dir * 1.5, 5.2, 0); world.add(stripe);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(3.1, .75, 8, 18, Math.PI), MAT.snow);
    arch.rotation.z = Math.PI / 2; arch.rotation.y = Math.PI / 2; arch.position.set(x + dir * 2.05, 1.6, 0); world.add(arch);
  };
  addFort(-75, 0); addFort(75, 1);
  [[-46,-23,10,3,4,.25],[-44,20,12,3,4,-.22],[-25,-31,5,3,12,.18],[-22,26,5,3,13,-.16],
   [26,-30,5,3,13,-.18],[24,27,5,3,12,.16],[47,-21,12,3,4,-.25],[45,22,11,3,4,.24],
   [-8,-40,14,3,4,.05],[12,39,14,3,4,-.05],[-5,18,7,2.5,4,.45],[8,-20,7,2.5,4,-.45]].forEach(v => addBlock(v[0], v[1], v[2], v[3], v[4], MAT.snowShade, true, 'snow barricade', v[5]));

  const pavilion = new THREE.Group(); pavilion.position.set(0, 0, 24); world.add(pavilion);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.35, .42, 7, 8), MAT.bark);
    post.position.set(Math.cos(a) * 5, 3.5, Math.sin(a) * 5); post.castShadow = true; pavilion.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 4, 6), MAT.red); roof.position.y = 8; roof.castShadow = true; pavilion.add(roof);
  const roofSnow = new THREE.Mesh(new THREE.ConeGeometry(8.15, 1.2, 6), MAT.snow); roofSnow.position.y = 9.55; pavilion.add(roofSnow);
  obstacles.push({ mesh: pavilion, x: 0, z: 24, hx: 6, hz: 6, hp: 999, maxHp: 999, destructible: false, name: 'pavilion' });

  const addTree = (x, z, scale = 1) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); world.add(g);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.6, .8, 6, 8), MAT.bark); trunk.position.y = 3; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(4.4 - i * .7, 5.2, 9), i % 2 ? MAT.pine2 : MAT.pine);
      crown.position.y = 6 + i * 2.4; crown.castShadow = true; g.add(crown);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(4.5 - i * .7, 1.15, 9), MAT.snow); cap.position.y = 8.15 + i * 2.4; g.add(cap);
    }
    obstacles.push({ mesh: g, x, z, hx: 1.6 * scale, hz: 1.6 * scale, hp: 999, maxHp: 999, destructible: false, name: 'tree' });
  };
  [[-62,-42,1.1],[-50,42,.9],[-34,-48,1],[-18,48,1.15],[0,-49,.9],[20,49,1],[40,-46,1.2],[57,43,1],[-60,34,.8],[62,-36,.9],[-10,-34,.7],[36,10,.75],[-35,6,.75]].forEach(t => addTree(t[0], t[1], t[2]));

  const addSnowman = (x, z, funny = false) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g);
    const b = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 12), MAT.white); b.position.y = 2; b.castShadow = true; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(1.45, 16, 12), MAT.white); h.position.set(funny ? .3 : 0, 5, 0); h.castShadow = true; g.add(h);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.22, 1.4, 10), MAT.orange); nose.rotation.z = -Math.PI / 2; nose.position.set(1.3, 5, .05); g.add(nose);
    [-.45, .45].forEach(z2 => { const eye = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), MAT.coal); eye.position.set(1.18, 5.35, z2); g.add(eye); });
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.25, 1.1, 12), funny ? MAT.purple : MAT.coal); hat.position.set(0, 6.5, 0); g.add(hat);
    obstacles.push({ mesh: g, x, z, hx: 2, hz: 2, hp: 4, maxHp: 4, destructible: true, name: 'snowman' });
  };
  addSnowman(-18, -11, true); addSnowman(31, 35); addSnowman(52, 3, true);

  for (const [x, z, r] of [[-31, 35, .3], [31, -36, -.25]]) {
    const sculpture = new THREE.Mesh(new THREE.OctahedronGeometry(3.2, 1), MAT.ice);
    sculpture.position.set(x, 3.1, z); sculpture.rotation.z = r; sculpture.castShadow = true; world.add(sculpture);
  }
  for (const [x, z, rot] of [[-8, 44, 0], [13, -44, Math.PI], [39, 38, .3], [-42, -36, -.2]]) {
    const bench = new THREE.Group(); bench.position.set(x, 0, z); bench.rotation.y = rot; world.add(bench);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(5, .45, 1.5), MAT.bark); seat.position.y = 1.4; seat.castShadow = true; bench.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(5, 2, .35), MAT.bark); back.position.set(0, 2.3, .65); bench.add(back);
    obstacles.push({ mesh: bench, x, z, hx: 3, hz: 1.6, hp: 999, maxHp: 999, destructible: false, name: 'bench' });
  }

  const addFlag = (x, team) => {
    const g = new THREE.Group(); g.position.set(x, 0, 0); world.add(g);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.13, .16, 7, 10), MAT.coal); pole.position.y = 3.5; pole.castShadow = true; g.add(pole);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4, 3, 2), team === 0 ? MAT.cyan : MAT.orange);
    cloth.position.set(team === 0 ? 2 : -2, 5.6, 0); cloth.rotation.y = team === 0 ? 0 : Math.PI; g.add(cloth);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, .55, 12), team === 0 ? MAT.blueDark : MAT.orangeDark); base.position.y = .28; g.add(base);
    return g;
  };
  const flagHome = [new THREE.Vector3(-70, 0, 0), new THREE.Vector3(70, 0, 0)];
  const flags = [addFlag(-70, 0), addFlag(70, 1)];
  const flagCarrier = [null, null];

  const entities = [];
  const sharedGeo = { head: new THREE.SphereGeometry(1.05, 14, 10), eye: new THREE.SphereGeometry(.13, 8, 6), limb: new THREE.CapsuleGeometry(.24, .95, 5, 8), body: new THREE.CapsuleGeometry(.92, 1.35, 6, 12), boot: new THREE.BoxGeometry(.55, .45, 1.05), hat: new THREE.CylinderGeometry(1.05, 1.12, .55, 12) };

  const makeLabelSprite = (text, team, subtitle = '') => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const c = canvas.getContext('2d');
    const color = team === 0 ? '#08aee0' : '#ef573b'; const dark = team === 0 ? '#063b69' : '#67233b';
    c.fillStyle = 'rgba(3,24,47,.9)'; c.beginPath(); c.roundRect(8, 10, 496, 108, 24); c.fill();
    c.fillStyle = color; c.beginPath(); c.roundRect(14, 16, 484, 96, 18); c.fill();
    c.fillStyle = dark; c.beginPath(); c.roundRect(25, 26, 462, 76, 13); c.fill();
    c.fillStyle = '#fff'; c.font = '900 38px Arial'; c.textAlign = 'center'; c.fillText(text.toUpperCase(), 256, 65);
    if (subtitle) { c.fillStyle = '#dffaff'; c.font = '800 19px Arial'; c.fillText(subtitle.toUpperCase(), 256, 91); }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false }));
    sprite.scale.set(5.8, 1.45, 1); return sprite;
  };
  const blueFlagMarker = makeLabelSprite('YOUR FLAG', 0, 'DEFEND'); blueFlagMarker.position.set(0, 8.2, 0); blueFlagMarker.scale.multiplyScalar(.82); flags[0].add(blueFlagMarker);
  const orangeFlagMarker = makeLabelSprite('ENEMY FLAG', 1, 'CAPTURE'); orangeFlagMarker.position.set(0, 8.2, 0); orangeFlagMarker.scale.multiplyScalar(.82); flags[1].add(orangeFlagMarker);

  const makeKid = (profile, team, index, x, z) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g);
    const isHarkan = profile.name === 'Harkan' || profile.name === 'Brick'; const isMark = profile.name === 'Mark'; const isPip = profile.name === 'Pip';
    const bodyMat = team === 0 ? (index % 3 === 0 ? MAT.blue : index % 3 === 1 ? MAT.cyan : MAT.blueDark) : (index % 3 === 0 ? MAT.orange : index % 3 === 1 ? MAT.purple : MAT.orangeDark);
    const body = new THREE.Mesh(sharedGeo.body, bodyMat); body.position.y = 2.25;
    body.scale.set(isHarkan ? 1.5 : isPip ? .72 : 1, isHarkan ? 1.18 : isPip ? .82 : 1, isHarkan ? 1.3 : 1); body.castShadow = true; g.add(body);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(isHarkan ? 1.22 : .85, .18, 7, 14), index % 2 ? MAT.gold : MAT.red); scarf.rotation.x = Math.PI / 2; scarf.position.y = 3.2; g.add(scarf);
    const headGeo = isMark ? new THREE.BoxGeometry(1.85, 1.7, 1.7, 2, 2, 2) : sharedGeo.head;
    const head = new THREE.Mesh(headGeo, index % 4 === 2 ? MAT.skin2 : MAT.skin); head.position.y = isPip ? 3.65 : 4.2;
    head.scale.set(isHarkan ? 1.2 : 1, isHarkan ? 1.08 : 1, isHarkan ? 1.15 : 1); head.castShadow = true; g.add(head);
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(sharedGeo.eye, MAT.coal); e.position.set(.91, head.position.y + .16, s * .36); e.scale.set(1, 1.35, 1); g.add(e);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(.04, 6, 4), MAT.white); shine.position.set(.11, .05, .03); e.add(shine);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(.25, .055, 5, 10, Math.PI), MAT.coal); smile.position.set(1.02, head.position.y - .35, 0); smile.rotation.set(Math.PI / 2, 0, Math.PI / 2); g.add(smile);
    if (profile.name === 'Nicolips') { const lips = new THREE.Mesh(new THREE.TorusGeometry(.38, .15, 7, 14), MAT.pink); lips.position.set(1.12, head.position.y - .3, 0); lips.rotation.y = Math.PI / 2; g.add(lips); }
    if (profile.name === 'Mo') { const stache = new THREE.Mesh(new THREE.TorusGeometry(.3, .1, 5, 10, Math.PI), MAT.coal); stache.position.set(1.12, head.position.y - .2, 0); stache.rotation.y = Math.PI / 2; g.add(stache); }
    const hat = new THREE.Mesh(sharedGeo.hat, index % 3 === 0 ? MAT.red : index % 3 === 1 ? MAT.gold : team === 0 ? MAT.blueDark : MAT.purple); hat.position.y = head.position.y + 1.05; hat.castShadow = true; g.add(hat);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(.32, 9, 7), MAT.white); pom.position.y = head.position.y + 1.5; g.add(pom);
    if (profile.name === 'Petroman') {
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), MAT.red); cape.position.set(-.9, 2.2, 0); cape.rotation.y = Math.PI / 2; g.add(cape);
      const goggles = new THREE.Mesh(new THREE.TorusGeometry(.29, .09, 7, 12), MAT.gold); goggles.position.set(1.04, head.position.y + .2, .36); goggles.rotation.y = Math.PI / 2; g.add(goggles);
      const g2 = goggles.clone(); g2.position.z = -.36; g.add(g2);
    }
    if (profile.name === 'K-Lee') { for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.CapsuleGeometry(.25, .8, 5, 8), MAT.coal); t.position.set(-.25, head.position.y + .15, s * 1.05); t.rotation.x = s * .45; g.add(t); } }
    const limbs = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(sharedGeo.limb, bodyMat); arm.position.set(0, 2.45, side * (isHarkan ? 1.4 : 1)); arm.rotation.x = side * .18; arm.castShadow = true; g.add(arm); limbs.push(arm);
      const leg = new THREE.Mesh(sharedGeo.limb, MAT.coal); leg.position.set(0, .85, side * .52); leg.castShadow = true; g.add(leg); limbs.push(leg);
      const boot = new THREE.Mesh(sharedGeo.boot, team === 0 ? MAT.blueDark : MAT.orangeDark); boot.position.set(.28, .25, side * .52); boot.castShadow = true; g.add(boot);
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(isHarkan ? 1.8 : 1.25, 16), new THREE.MeshBasicMaterial({ color: 0x5085a0, transparent: true, opacity: .2, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = .03; g.add(shadow);
    const teamRing = new THREE.Mesh(new THREE.RingGeometry(isHarkan ? 1.65 : 1.18, isHarkan ? 2.05 : 1.5, 28), new THREE.MeshBasicMaterial({ color: team === 0 ? 0x20d7ff : 0xff5b35, transparent: true, opacity: .82, side: THREE.DoubleSide, depthWrite: false }));
    teamRing.rotation.x = -Math.PI / 2; teamRing.position.y = .055; g.add(teamRing);
    const nameplate = makeLabelSprite(profile.name, team, team === 0 ? "SEAN'S SQUAD" : 'THE BULLIES'); nameplate.position.set(0, isPip ? 5.8 : 6.35, 0); g.add(nameplate);
    const healthBack = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x08233e, depthTest: true, depthWrite: false })); healthBack.scale.set(4.1, .28, 1); healthBack.position.set(0, isPip ? 5.18 : 5.72, 0); g.add(healthBack);
    const healthFill = new THREE.Sprite(new THREE.SpriteMaterial({ color: team === 0 ? 0x5ff2ff : 0xffac38, depthTest: true, depthWrite: false })); healthFill.center.set(0, .5); healthFill.scale.set(3.85, .17, 1); healthFill.position.set(-1.925, isPip ? 5.18 : 5.72, .02); g.add(healthFill);
    // Dizzy stars orbit a knocked-out kid's head.
    const dizzy = new THREE.Group(); dizzy.position.y = head.position.y + 1.1; dizzy.visible = false; g.add(dizzy);
    for (let s = 0; s < 3; s++) { const star = new THREE.Mesh(new THREE.OctahedronGeometry(.16, 0), MAT.gold); star.position.set(Math.cos(s / 3 * Math.PI * 2) * .9, 0, Math.sin(s / 3 * Math.PI * 2) * .9); dizzy.add(star); }
    entities.push({ profile, team, group: g, limbs, head, body, speed: 4.6 + profile.speed / 18, hp: 5, knockedUntil: 0, hitTimer: 0, throwTimer: 0, cooldown: Math.random(), aiTimer: 0, strafe: Math.random() > .5 ? 1 : -1, role: index % 5 === 0 ? 'defend' : index % 4 === 0 ? 'ambush' : 'attack', hasFlag: false, target: new THREE.Vector3(), voiceTimer: 0, nameplate, healthBack, healthFill, teamRing, velocity: new THREE.Vector3(), lastPosition: g.position.clone(), windup: 0, pendingAim: null, knockStart: 0, powerWeapon: 'regular', powerAmmo: 0, shieldHits: 0, boostUntil: 0, slowUntil: 0, dizzy, stepTimer: 0 });
  };
  HEROES.slice(1).forEach((p, i) => makeKid(p, 0, i, -65 + (i % 3) * 3, -18 + (i % 6) * 6));
  BULLIES.forEach((p, i) => makeKid(p, 1, i, 65 - (i % 3) * 3, -18 + (i % 6) * 6));

  const projectiles = [];
  const projectileGeo = new THREE.SphereGeometry(.31, 10, 8);
  const iceGeo = new THREE.IcosahedronGeometry(.48, 1);
  const megaGeo = new THREE.DodecahedronGeometry(.64, 1);
  const blizzGeo = new THREE.TorusKnotGeometry(.34, .13, 32, 6);
  const particles = [];
  const burst = (pos, color = 0xffffff, count = 9) => {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(.08 + Math.random() * .08, 6, 4), new THREE.MeshBasicMaterial({ color }));
      m.position.copy(pos); world.add(m);
      particles.push({ mesh: m, vel: new THREE.Vector3((Math.random() - .5) * 5, Math.random() * 5, (Math.random() - .5) * 5), life: .55 + Math.random() * .35 });
    }
  };
  // Expanding ground shockwave ring (mega blasts, captures).
  const rings = [];
  const shockwave = (pos, color = 0xc77dff, maxR = 8) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .22, 8, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false }));
    ring.rotation.x = Math.PI / 2; ring.position.set(pos.x, .3, pos.z); world.add(ring);
    rings.push({ mesh: ring, life: .6, maxR });
  };
  // Floating damage / info text sprites.
  const floaters = [];
  const floatText = (pos, text, color = '#ffffff') => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const c = canvas.getContext('2d');
    c.font = '900 44px Arial'; c.textAlign = 'center'; c.lineWidth = 8; c.strokeStyle = 'rgba(4,26,48,.9)';
    c.strokeText(text, 64, 46); c.fillStyle = color; c.fillText(text, 64, 46);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.position.copy(pos); sprite.scale.set(2.4, 1.2, 1); world.add(sprite);
    floaters.push({ sprite, life: .9 });
  };
  // Footprint puffs while anyone sprints through fresh snow.
  const prints = [];
  const footPuff = (pos) => {
    if (prints.length > 70) return;
    const m = new THREE.Mesh(new THREE.CircleGeometry(.24 + Math.random() * .12, 8), new THREE.MeshBasicMaterial({ color: 0xe8f8ff, transparent: true, opacity: .55, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x + (Math.random() - .5) * .4, .045, pos.z + (Math.random() - .5) * .4);
    world.add(m); prints.push({ mesh: m, life: 1.4 });
  };
  // Blizzard vortices: private snow storms that batter whoever stands inside.
  const vortices = [];
  const spawnVortex = (pos, team) => {
    const g = new THREE.Group(); g.position.set(pos.x, 0, pos.z); world.add(g);
    const swirl = [];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(.14 + Math.random() * .1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: .85 }));
      g.add(m); swirl.push({ mesh: m, angle: Math.random() * Math.PI * 2, r: 1 + Math.random() * 5.5, h: Math.random() * 5, spin: 2.4 + Math.random() * 2 });
    }
    const halo = new THREE.PointLight(0x9fe4ff, 2.4, 16); halo.position.y = 3; g.add(halo);
    vortices.push({ group: g, swirl, team, until: now$() + 4.5, tick: 0 });
    beep('storm');
  };

  const launch = (pos, dir, team, owner, type, accuracy = 100, strength = 75) => {
    const spread = (100 - accuracy) / 2200;
    dir.x += (Math.random() - .5) * spread; dir.y += (Math.random() - .5) * spread; dir.z += (Math.random() - .5) * spread;
    dir.normalize();
    const geo = type === 'ice' ? iceGeo : type === 'mega' ? megaGeo : type === 'blizzard' ? blizzGeo : projectileGeo;
    const mat = type === 'ice' ? MAT.ice : type === 'mega' ? MAT.purple : type === 'blizzard' ? MAT.storm : MAT.white;
    const mesh = new THREE.Mesh(geo, mat); mesh.position.copy(pos); mesh.castShadow = true; world.add(mesh);
    if (type === 'mega') { mesh.scale.set(1.28, 1.28, 1.28); mesh.add(new THREE.PointLight(0xbd75ff, 2.8, 8)); }
    if (type === 'blizzard') { mesh.scale.set(1.4, 1.4, 1.4); mesh.add(new THREE.PointLight(0x8fdcff, 2.4, 8)); }
    const trailColor = type === 'ice' ? 0x61efff : type === 'mega' ? 0xc98aff : type === 'blizzard' ? 0xbfeaff : team === 0 ? 0xdffaff : 0xffdcc8;
    const trailGeo = new THREE.BufferGeometry().setFromPoints([pos.clone(), pos.clone()]);
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: trailColor, transparent: true, opacity: type === 'rapid' ? .55 : .82, depthWrite: false }));
    world.add(trail);
    const speed = (type === 'rapid' ? 31 : type === 'mega' ? 20 : type === 'blizzard' ? 19 : 25) + strength / 12;
    projectiles.push({ mesh, vel: dir.multiplyScalar(speed), team, owner, type, life: 4, prev: pos.clone(), trail });
    beep('throw');
  };

  const powerups = [];
  const addPower = (x, z, type) => {
    const g = new THREE.Group(); g.position.set(x, 1.4, z); world.add(g);
    const ringMat = type === 'ice' ? MAT.cyan : type === 'rapid' ? MAT.gold : type === 'mega' ? MAT.purple : type === 'shield' ? MAT.blue : type === 'blizzard' ? MAT.storm : type === 'triple' ? MAT.green : type === 'magnet' ? MAT.pink : MAT.red;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, .16, 8, 20), ringMat); ring.rotation.x = Math.PI / 2; g.add(ring);
    if (type === 'ice') g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.7, 1), MAT.ice));
    else if (type === 'rapid') { for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.33, 10, 8), MAT.white); b.position.z = (i - 1) * .62; g.add(b); } }
    else if (type === 'mega') {
      const core = new THREE.Mesh(new THREE.DodecahedronGeometry(.72, 1), MAT.purple); core.scale.set(1.2, 1.2, 1.2); g.add(core);
      for (let i = 0; i < 6; i++) { const nub = new THREE.Mesh(new THREE.SphereGeometry(.14, 7, 5), MAT.gold); const a = i / 6 * Math.PI * 2; nub.position.set(Math.cos(a) * .83, 0, Math.sin(a) * .83); g.add(nub); }
    } else if (type === 'shield') {
      g.add(new THREE.Mesh(new THREE.OctahedronGeometry(.76, 1), MAT.ice));
      for (let i = 0; i < 2; i++) { const orbit = new THREE.Mesh(new THREE.TorusGeometry(.82 + i * .18, .06, 7, 20), i ? MAT.cyan : MAT.blue); orbit.rotation.set(i ? Math.PI / 2 : 0, 0, i ? .45 : -.45); g.add(orbit); }
    } else if (type === 'blizzard') {
      const core = new THREE.Mesh(new THREE.TorusKnotGeometry(.5, .16, 40, 6), MAT.storm); g.add(core);
      const wisp = new THREE.Mesh(new THREE.TorusGeometry(.85, .07, 6, 24), MAT.white); wisp.rotation.x = .8; g.add(wisp);
    } else if (type === 'triple') {
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(.36, 10, 8), MAT.white); b.position.set(Math.cos(a) * .52, 0, Math.sin(a) * .52); g.add(b); }
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.78, .07, 6, 22), MAT.green); halo.rotation.x = Math.PI / 2; g.add(halo);
    } else if (type === 'magnet') {
      const u = new THREE.Mesh(new THREE.TorusGeometry(.55, .2, 8, 20, Math.PI), MAT.pink); u.rotation.z = Math.PI; g.add(u);
      for (const s of [-1, 1]) { const tip = new THREE.Mesh(new THREE.BoxGeometry(.24, .34, .4), MAT.white); tip.position.set(s * .55, .32, 0); g.add(tip); }
    } else {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(.52, .42, .85, 14), MAT.red); cup.position.y = -.05; g.add(cup);
      const cocoa = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .04, 14), MAT.bark); cocoa.position.y = .38; g.add(cocoa);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(.35, .1, 7, 14, Math.PI * 1.4), MAT.red); handle.position.set(.48, 0, 0); handle.rotation.y = Math.PI / 2; g.add(handle);
    }
    const glowColor = { ice: 0x5ef6ff, rapid: 0xffd05a, mega: 0xba63ff, shield: 0x39cfff, cocoa: 0xff6b45, blizzard: 0xa8e6ff, triple: 0x7fe27a, magnet: 0xff8ec9 }[type];
    g.add(new THREE.PointLight(glowColor, 2.4, 10));
    powerups.push({ group: g, type, active: true, respawn: 0, home: new THREE.Vector3(x, 1.4, z) });
  };
  addPower(-18, 5, 'ice'); addPower(18, -9, 'rapid'); addPower(0, 42, 'ice'); addPower(0, -42, 'rapid');
  addPower(2, -5, 'mega'); addPower(-37, 14, 'shield'); addPower(38, -16, 'cocoa');
  addPower(-12, -24, 'blizzard'); addPower(14, 22, 'triple'); addPower(-2, 14, 'magnet'); addPower(44, 6, 'cocoa');

  const dog = new THREE.Group(); world.add(dog); dog.position.set(0, 0, 33);
  const dogBody = new THREE.Mesh(new THREE.CapsuleGeometry(.45, 1.05, 5, 8), toon(0xd88b3e)); dogBody.rotation.z = Math.PI / 2; dogBody.position.y = .72; dogBody.castShadow = true; dog.add(dogBody);
  const dogHead = new THREE.Mesh(new THREE.SphereGeometry(.56, 12, 9), toon(0xe5a658)); dogHead.position.set(.85, 1.05, 0); dogHead.castShadow = true; dog.add(dogHead);
  const dogMuzzle = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), MAT.white); dogMuzzle.position.set(1.27, .93, 0); dog.add(dogMuzzle);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.23, .68, 8), MAT.bark); ear.position.set(.72, 1.65, s * .32); ear.rotation.z = -.15; dog.add(ear);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .35, 4, 6), MAT.white); leg.position.set(s < 0 ? -.45 : .45, .25, s * .34); dog.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .65, 4, 6), toon(0xd88b3e)); tail.position.set(-.95, .95, 0); tail.rotation.z = -1.1; dog.add(tail);
  const dogTarget = new THREE.Vector3(12, 0, 35); let dogWait = 0;

  const snowGeo = new THREE.BufferGeometry(); const snowCount = 900; const snowPos = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) { snowPos[i * 3] = (Math.random() - .5) * 190; snowPos[i * 3 + 1] = Math.random() * 45; snowPos[i * 3 + 2] = (Math.random() - .5) * 130; }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  scene.add(new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: .22, transparent: true, opacity: .85, depthWrite: false })));

  const weapon = new THREE.Group(); camera.add(weapon); scene.add(camera);
  const mitten = new THREE.Mesh(new THREE.SphereGeometry(.38, 12, 8), MAT.blue); mitten.position.set(.76, -.63, -1.2); mitten.scale.set(1.2, .9, 1); weapon.add(mitten);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.28, .43, 1.25, 10), MAT.blueDark); sleeve.position.set(.92, -.88, -.72); sleeve.rotation.x = .75; weapon.add(sleeve);
  const heldBall = new THREE.Mesh(projectileGeo, MAT.white); heldBall.position.set(.58, -.5, -1.55); heldBall.scale.setScalar(1.3); weapon.add(heldBall);

  const player = { position: new THREE.Vector3(-66, 1.72, 0), yaw: -Math.PI / 2, pitch: 0, hp: 5, ammo: 6, ammoMax: 6, weapon: 'regular', reloadUntil: 0, cooldown: 0, knockedUntil: 0, hasFlag: false, throwAnim: 0, speed: 10.6, shieldHits: 0, boostUntil: 0, tripleShots: 0, magnetUntil: 0, slowUntil: 0, stepTimer: 0 };
  camera.position.copy(player.position);
  let blueScore = 0, orangeScore = 0, timeLeft = 360, lastHud = 0, gameStart = now$(), message = 'Protect your flag. Pinch theirs!', messageUntil = 0;
  let currentAimTarget = null, currentLookTarget = null, hitMarkerUntil = 0, damageFlashUntil = 0, cameraShake = 0;
  let playerShots = 0, playerHits = 0, playerKnockouts = 0, playerCaptures = 0, hitStreak = 0, lastPlayerHit = 0;
  const keys = new Set(); let firing = false, focused = false;

  const ownerName = (owner) => owner === -1 ? 'Super Sean' : owner >= 0 ? entities[owner]?.profile.name || 'Someone' : 'The storm';
  const resetFlag = (team) => { flagCarrier[team] = null; flags[team].position.copy(flagHome[team]); flags[team].visible = true; entities.forEach(e => { if (e.team !== team) e.hasFlag = false; }); if (team === 1) player.hasFlag = false; };

  resetMatch = () => {
    blueScore = orangeScore = 0; timeLeft = 360; gameStart = now$(); message = 'Three captures wins. Stay frosty!'; messageUntil = gameStart + 3;
    player.position.set(-66, 1.72, 0); player.hp = 5; player.ammo = 6; player.ammoMax = 6; player.weapon = 'regular';
    player.reloadUntil = 0; player.cooldown = 0; player.knockedUntil = 0; player.hasFlag = false; player.throwAnim = 0;
    player.shieldHits = 0; player.boostUntil = 0; player.tripleShots = 0; player.magnetUntil = 0; player.slowUntil = 0;
    focused = false; firing = false; currentAimTarget = currentLookTarget = null; cameraShake = 0;
    playerShots = playerHits = playerKnockouts = playerCaptures = hitStreak = 0; lastPlayerHit = 0;
    entities.forEach((e, i) => {
      e.hp = 5; e.knockedUntil = 0; e.knockStart = 0; e.windup = 0; e.pendingAim = null; e.hasFlag = false;
      e.powerWeapon = 'regular'; e.powerAmmo = 0; e.shieldHits = 0; e.boostUntil = 0; e.slowUntil = 0;
      e.group.visible = true; e.nameplate.visible = true; e.healthBack.visible = true; e.healthFill.visible = true;
      e.healthFill.scale.x = 3.85; e.body.position.y = 2.25; e.group.rotation.set(0, 0, 0); e.group.scale.setScalar(1); e.dizzy.visible = false;
      if (e.team === 0) e.group.position.set(-64 + (i % 3) * 3, 0, -18 + (i % 6) * 6);
      else { const j = i - 11; e.group.position.set(64 - (j % 3) * 3, 0, -18 + (j % 6) * 6); }
      e.lastPosition.copy(e.group.position); e.velocity.set(0, 0, 0);
    });
    obstacles.forEach(o => { o.hp = o.maxHp; o.mesh.visible = true; o.mesh.scale.set(1, 1, 1); });
    powerups.forEach(p => { p.active = true; p.respawn = 0; p.group.visible = true; p.group.position.copy(p.home); });
    resetFlag(0); resetFlag(1);
    projectiles.splice(0).forEach(p => { world.remove(p.mesh); world.remove(p.trail); p.trail.geometry.dispose(); p.trail.material.dispose(); });
    particles.splice(0).forEach(p => world.remove(p.mesh));
    vortices.splice(0).forEach(v => world.remove(v.group));
    feedItems.length = 0; if (hudEls.feed) hudEls.feed.innerHTML = '';
  };
  startGame = () => { resetMatch(); setMode('playing'); setTimeout(() => renderer.domElement.requestPointerLock?.(), 80); };
  engineReady = true;

  const activeObstacle = (o) => o.hp > 0 && o.mesh.visible;
  const tryMove = (p, dx, dz, r = .75) => {
    const nx = clamp(p.x + dx, -89, 89), nz = clamp(p.z + dz, -62, 62);
    let blockX = false, blockZ = false;
    for (const o of obstacles) {
      if (!activeObstacle(o)) continue;
      if (Math.abs(nx - o.x) < o.hx + r && Math.abs(p.z - o.z) < o.hz + r) blockX = true;
      if (Math.abs(p.x - o.x) < o.hx + r && Math.abs(nz - o.z) < o.hz + r) blockZ = true;
    }
    if (!blockX) p.x = nx; if (!blockZ) p.z = nz;
  };
  const nearestOpponent = (e) => {
    let best = null, d = Infinity;
    for (const t of entities) {
      if (t.team === e.team || t.knockedUntil > now$()) continue;
      const nd = e.group.position.distanceToSquared(t.group.position);
      if (nd < d) { d = nd; best = t; }
    }
    if (e.team === 1 && player.knockedUntil <= now$()) {
      const nd = e.group.position.distanceToSquared(player.position);
      if (nd < d) return { player: true, pos: player.position, dist: Math.sqrt(nd) };
    }
    return best ? { player: false, pos: best.group.position, entity: best, dist: Math.sqrt(d) } : null;
  };
  const pointSegmentDistanceSq = (point, a, b) => {
    const ab = b.clone().sub(a); const denom = ab.lengthSq();
    if (denom < .0001) return point.distanceToSquared(a);
    const t = clamp(point.clone().sub(a).dot(ab) / denom, 0, 1);
    return point.distanceToSquared(a.clone().addScaledVector(ab, t));
  };
  const hasLineOfSight = (from, to) => {
    const steps = Math.max(5, Math.ceil(from.distanceTo(to) / 4));
    for (let s = 1; s < steps; s++) {
      const t = s / steps; const x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t;
      for (const o of obstacles) { if (activeObstacle(o) && Math.abs(x - o.x) < o.hx + .18 && Math.abs(z - o.z) < o.hz + .18) return false; }
    }
    return true;
  };
  const acquireLookTarget = (team, assist) => {
    const origin = camera.position.clone(); const direction = new THREE.Vector3(); camera.getWorldDirection(direction);
    const ray = new THREE.Ray(origin, direction);
    let best = null, bestScore = Infinity;
    for (const e of entities) {
      if ((team !== null && e.team !== team) || e.knockedUntil > now$()) continue;
      const center = e.group.position.clone().add(new THREE.Vector3(0, 2.75, 0));
      const along = center.clone().sub(origin).dot(direction);
      if (along < 1 || along > 78) continue;
      const missSq = ray.distanceSqToPoint(center);
      const radius = assist + (e.profile.name === 'Brick' ? .55 : 0);
      if (missSq > radius * radius || !hasLineOfSight(origin, center)) continue;
      const score = missSq + along * .0015;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  };
  const acquireAimTarget = () => acquireLookTarget(1, difficulty === 'rookie' ? 2.35 : difficulty === 'blizzard' ? 1.05 : 1.65);
  const say = (text, duration = 2.2) => { message = text; messageUntil = now$() + duration; };
  const knockEntity = (e, ice = false, owner = -2) => {
    const t = now$();
    e.knockedUntil = t + (ice ? 30 : 6); e.knockStart = t; e.hp = 0; e.shieldHits = 0; e.boostUntil = 0;
    e.powerWeapon = 'regular'; e.powerAmmo = 0; e.healthBack.visible = false; e.healthFill.visible = false;
    e.pendingAim = null; e.windup = 0; e.dizzy.visible = true;
    burst(e.group.position.clone().add(new THREE.Vector3(0, 3, 0)), ice ? 0x62efff : 0xffffff, ice ? 22 : 14);
    pushFeed(`<b class="t${owner === -1 ? 0 : owner >= 0 ? entities[owner].team : 2}">${ownerName(owner)}</b> bonked <b class="t${e.team}">${e.profile.name}</b>${ice ? ' ❄' : ''}`);
    if (e.hasFlag) { resetFlag(e.team === 0 ? 1 : 0); say(`${e.profile.name} dropped the flag!`); }
    beep('bonk');
  };
  const teamDirection = (t) => t === 0 ? -1 : 1;
  const hitEntity = (e, type, owner = -2) => {
    const t = now$();
    if (e.knockedUntil > t) return;
    if (e.shieldHits > 0) {
      e.shieldHits--; e.hitTimer = .35;
      burst(e.group.position.clone().add(new THREE.Vector3(0, 2.8, 0)), 0x52eaff, 19);
      if (owner === -1) { hitMarkerUntil = t + .22; say(`${e.profile.name}'s frost shield cracked!`, 1.1); }
      beep('power'); return;
    }
    const damage = type === 'ice' ? 5 : type === 'mega' ? 3 : 1;
    e.hitTimer = type === 'mega' ? .95 : .72;
    e.hp = Math.max(0, e.hp - damage);
    e.healthFill.scale.x = 3.85 * (e.hp / 5);
    const color = type === 'ice' ? 0x56e9ff : type === 'mega' ? 0xc57aff : 0xffffff;
    burst(e.group.position.clone().add(new THREE.Vector3(0, 2.8, 0)), color, type === 'ice' ? 18 : type === 'mega' ? 24 : 10);
    floatText(e.group.position.clone().add(new THREE.Vector3(0, 4.6, 0)), `-${damage}`, type === 'ice' ? '#7deeff' : type === 'mega' ? '#d9a1ff' : '#ffffff');
    if (owner === -1) {
      playerHits++; hitStreak = t - lastPlayerHit < 4 ? hitStreak + 1 : 1; lastPlayerHit = t;
      hitMarkerUntil = t + (type === 'mega' ? .34 : .22);
      if (e.hp <= 0) playerKnockouts++;
      say(e.hp > 0 ? `${e.profile.name}: ${e.hp}/5 energy${hitStreak > 1 ? ` · ${hitStreak}x streak!` : ''}` : `${e.profile.name} is out!${hitStreak > 1 ? ` · ${hitStreak}x streak!` : ''}`, 1.35);
    }
    beep('hit');
    if (e.hp <= 0) knockEntity(e, type === 'ice', owner);
  };
  const knockPlayer = (ice = false, owner = -2) => {
    const t = now$();
    player.knockedUntil = t + (ice ? 30 : 6); player.hp = 0;
    if (player.hasFlag) resetFlag(1);
    pushFeed(`<b class="t1">${ownerName(owner)}</b> bonked <b class="t0">Super Sean</b>${ice ? ' ❄' : ''}`);
    say(ice ? 'ICE-BONKED! Snow-angel recovery: 30 seconds.' : 'BONKED! Repacking snowballs…', 4);
    beep('bonk');
  };
  const hitPlayer = (type, owner = -2) => {
    const t = now$();
    if (player.knockedUntil > t) return;
    if (player.shieldHits > 0) {
      player.shieldHits--;
      burst(player.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x52eaff, 22);
      cameraShake = .16;
      say(`FROST SHIELD BLOCK! ${player.shieldHits} charge${player.shieldHits === 1 ? '' : 's'} left.`, 1.5);
      beep('power'); return;
    }
    player.hp -= type === 'ice' ? 5 : type === 'mega' ? 3 : 1;
    damageFlashUntil = t + .42;
    cameraShake = type === 'mega' ? .52 : .28;
    burst(player.position.clone(), type === 'ice' ? 0x56e9ff : type === 'mega' ? 0xc57aff : 0xffffff, type === 'mega' ? 25 : 12);
    beep('hit');
    if (player.hp <= 0) knockPlayer(type === 'ice', owner);
  };
  const megaBlast = (pos, team, owner) => {
    burst(pos, 0xc77dff, 34); burst(pos, 0xffffff, 18); shockwave(pos, 0xc77dff, 8);
    cameraShake = team === 0 ? Math.max(cameraShake, .22) : cameraShake;
    for (const e of entities) { if (e.team === team || e.knockedUntil > now$()) continue; if (e.group.position.distanceTo(pos) < 7) hitEntity(e, 'mega', owner); }
    if (team === 1 && player.position.distanceTo(pos) < 6.2) hitPlayer('mega', owner);
    for (const o of obstacles) {
      if (!o.destructible || !activeObstacle(o)) continue;
      if (Math.hypot(o.x - pos.x, o.z - pos.z) < 7.5) { o.hp -= 2; o.mesh.scale.y = clamp(o.hp / o.maxHp, .1, 1); if (o.hp <= 0) o.mesh.visible = false; }
    }
  };

  const reload = () => {
    const t = now$();
    if (player.weapon !== 'regular' || player.ammo === player.ammoMax || player.reloadUntil > t) return;
    player.reloadUntil = t + 2.45; say('Packing fresh snowballs…', 1.2); beep('reload');
  };
  const playerThrow = () => {
    const t = now$();
    if (mode !== 'playing' || player.knockedUntil > t || player.reloadUntil > t || player.cooldown > t) return;
    if (player.ammo <= 0) { reload(); return; }
    let dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    const pos = camera.position.clone().add(dir.clone().multiplyScalar(1.05)).add(new THREE.Vector3(0, -.08, 0));
    if (currentAimTarget && currentAimTarget.knockedUntil <= t) {
      const speed = (player.weapon === 'rapid' ? 31 : player.weapon === 'mega' ? 20 : 25) + 82 / 12;
      const center = currentAimTarget.group.position.clone().add(new THREE.Vector3(0, 2.75, 0));
      const flight = clamp(pos.distanceTo(center) / speed, .08, 1.8);
      center.addScaledVector(currentAimTarget.velocity, flight * .72);
      dir = center.sub(pos); dir.y += .5 * 7.8 * flight * flight; dir.normalize();
    }
    launch(pos, dir.clone(), 0, -1, player.weapon, focused ? 98 : 94, 82);
    // Triple Pack: two extra snowballs fan out beside the main throw.
    if (player.tripleShots > 0) {
      for (const spread of [-.075, .075]) {
        const d2 = dir.clone(); const cos = Math.cos(spread), sin = Math.sin(spread);
        const nx = d2.x * cos - d2.z * sin, nz = d2.x * sin + d2.z * cos; d2.x = nx; d2.z = nz;
        launch(pos.clone(), d2, 0, -1, player.weapon === 'regular' ? 'regular' : player.weapon, 92, 78);
      }
      player.tripleShots--;
      if (player.tripleShots === 0) say('Triple Pack spent — single scoops again.', 1.6);
    }
    playerShots++;
    player.ammo--;
    player.throwAnim = player.weapon === 'mega' ? .58 : .42;
    player.cooldown = t + (player.weapon === 'rapid' ? .105 : player.weapon === 'mega' ? .82 : player.weapon === 'blizzard' ? .6 : .48);
    cameraShake = player.weapon === 'mega' ? .18 : cameraShake;
    if (player.ammo <= 0 && player.weapon === 'regular') reload();
    if (player.ammo <= 0 && player.weapon !== 'regular') { player.weapon = 'regular'; player.ammoMax = 6; player.ammo = 0; reload(); say('Power-up spent — back to classic snow!', 2); }
  };

  /* input: keyboard + mouse */
  const SCROLL_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
  const onKeyDown = (e) => {
    keys.add(e.code);
    if (SCROLL_KEYS.has(e.code)) e.preventDefault();
    if (e.code === 'KeyR') reload();
    if (e.code === 'KeyM') { muted = !muted; localStorage.setItem('ssb-muted', muted ? '1' : '0'); syncSound(); }
    if (e.code === 'Escape' && mode === 'playing') setMode('paused');
    else if (e.code === 'Escape' && mode === 'paused') { setMode('playing'); setTimeout(() => renderer.domElement.requestPointerLock?.(), 30); }
  };
  const onKeyUp = (e) => keys.delete(e.code);
  const onMouseMove = (e) => {
    if (document.pointerLockElement !== renderer.domElement || mode !== 'playing') return;
    player.yaw -= e.movementX * .0022 * sensitivity;
    player.pitch = clamp(player.pitch - e.movementY * .0019 * sensitivity * (invertY ? -1 : 1), -1.18, 1.1);
  };
  const onMouseDown = (e) => { if (e.button === 0) { firing = true; playerThrow(); } if (e.button === 2) { focused = true; e.preventDefault(); } };
  const onMouseUp = (e) => { if (e.button === 0) firing = false; if (e.button === 2) focused = false; };
  const onCanvasClick = () => { if (mode === 'playing') renderer.domElement.requestPointerLock?.(); };
  const onLock = () => { if (!document.pointerLockElement && mode === 'playing') setMode('paused'); };
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove); window.addEventListener('mousedown', onMouseDown); window.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('click', onCanvasClick);
  document.addEventListener('pointerlockchange', onLock);
  renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
  $('btnResume')?.addEventListener('click', () => { setMode('playing'); setTimeout(() => renderer.domElement.requestPointerLock?.(), 50); });

  /* input: touch — left thumb moves, right thumb aims, dedicated FIRE + RELOAD buttons */
  const moveStick = { x: 0, y: 0 };
  let touchLookId = null, touchMoveId = null, touchX = 0, touchY = 0, moveX = 0, moveY = 0;
  const stickBase = $('stickBase'), stickNub = $('stickNub');
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (isTouch) playWrap.classList.add('touch');
  const touchStart = (e) => {
    for (const t of Array.from(e.changedTouches)) {
      const rect = playWrap.getBoundingClientRect();
      if (t.clientX - rect.left < rect.width * .45 && touchMoveId === null) {
        touchMoveId = t.identifier; moveX = t.clientX; moveY = t.clientY;
        if (stickBase) { stickBase.style.left = (t.clientX - rect.left) + 'px'; stickBase.style.top = (t.clientY - rect.top) + 'px'; stickBase.classList.add('on'); }
      } else if (touchLookId === null) { touchLookId = t.identifier; touchX = t.clientX; touchY = t.clientY; }
    }
  };
  const touchMove = (e) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (touchLookId === t.identifier) {
        player.yaw -= (t.clientX - touchX) * .005 * sensitivity;
        player.pitch = clamp(player.pitch - (t.clientY - touchY) * .004 * sensitivity * (invertY ? -1 : 1), -1.1, 1);
        touchX = t.clientX; touchY = t.clientY;
      }
      if (touchMoveId === t.identifier) {
        moveStick.x = clamp((t.clientX - moveX) / 48, -1, 1);
        moveStick.y = clamp((t.clientY - moveY) / 48, -1, 1);
        if (stickNub) { stickNub.style.transform = `translate(${moveStick.x * 26}px, ${moveStick.y * 26}px)`; }
      }
    }
  };
  const touchEnd = (e) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === touchLookId) touchLookId = null;
      if (t.identifier === touchMoveId) { touchMoveId = null; moveStick.x = 0; moveStick.y = 0; stickBase?.classList.remove('on'); if (stickNub) stickNub.style.transform = ''; }
    }
  };
  renderer.domElement.addEventListener('touchstart', touchStart, { passive: true });
  renderer.domElement.addEventListener('touchmove', touchMove, { passive: false });
  renderer.domElement.addEventListener('touchend', touchEnd, { passive: true });
  const fireBtn = $('btnFire');
  fireBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); firing = true; playerThrow(); }, { passive: false });
  fireBtn?.addEventListener('touchend', () => { firing = false; }, { passive: true });
  $('btnReloadTouch')?.addEventListener('touchstart', (e) => { e.preventDefault(); reload(); }, { passive: false });

  const updateFlags = () => {
    flags.forEach((flag, team) => {
      const c = flagCarrier[team];
      if (c === null) { flag.position.copy(flagHome[team]); return; }
      if (c === -1) { flag.position.copy(player.position); flag.position.y = -1.1; }
      else { const e = entities[c]; if (e) { flag.position.copy(e.group.position); flag.position.y = 2.2; } }
    });
    const t = now$();
    if (player.knockedUntil <= t && !player.hasFlag && flagCarrier[1] === null && player.position.distanceTo(flagHome[1]) < 4) {
      player.hasFlag = true; flagCarrier[1] = -1; say('FLAG SNATCHED! Bring it home!', 3); beep('power');
    }
    if (player.hasFlag && player.position.distanceTo(flagHome[0]) < 5 && flagCarrier[0] === null) {
      blueScore++; playerCaptures++; resetFlag(1);
      shockwave(flagHome[0], 0x35e2ff, 12);
      for (let i = 0; i < 26; i++) burst(flagHome[0].clone().add(new THREE.Vector3((Math.random() - .5) * 4, 2 + Math.random() * 3, (Math.random() - .5) * 4)), [0x35e2ff, 0xffffff, 0xffcf3e][i % 3], 1);
      pushFeed('<b class="t0">Super Sean</b> captured the flag! 🚩');
      say('SUPER SEAN SCORES! Snow much style!', 4); beep('score');
    }
    entities.forEach((e, i) => {
      if (e.knockedUntil > t) return;
      const enemyFlag = e.team === 0 ? 1 : 0; const ownFlag = e.team;
      if (!e.hasFlag && flagCarrier[enemyFlag] === null && e.group.position.distanceTo(flagHome[enemyFlag]) < 4) {
        e.hasFlag = true; flagCarrier[enemyFlag] = i;
        say(`${e.profile.name} grabbed the ${enemyFlag === 0 ? 'blue' : 'orange'} flag!`, 3); beep('power');
      }
      if (e.hasFlag && e.group.position.distanceTo(flagHome[ownFlag]) < 5 && flagCarrier[ownFlag] === null) {
        if (e.team === 0) blueScore++; else orangeScore++;
        resetFlag(enemyFlag);
        shockwave(flagHome[ownFlag], e.team === 0 ? 0x35e2ff : 0xff7a45, 12);
        pushFeed(`<b class="t${e.team}">${e.profile.name}</b> captured the flag! 🚩`);
        say(`${e.profile.name} scores for ${e.team === 0 ? "Sean's Squad" : 'the Bullies'}!`, 4); beep('score');
      }
    });
  };

  const updateAI = (dt, t) => {
    const diffMul = difficulty === 'rookie' ? .72 : difficulty === 'blizzard' ? 1.18 : 1;
    entities.forEach((e, i) => {
      if (e.knockedUntil > t) {
        const fall = clamp((t - e.knockStart) / .58, 0, 1); const eased = 1 - Math.pow(1 - fall, 3);
        e.group.rotation.z = e.strafe * eased * Math.PI * .47;
        e.group.position.y = Math.sin(fall * Math.PI) * .22;
        e.head.rotation.x = -eased * .35;
        e.nameplate.visible = fall < .72;
        e.dizzy.visible = true; e.dizzy.rotation.y = t * 5;
        e.dizzy.children.forEach((s, k) => { s.position.y = Math.sin(t * 6 + k) * .12; });
        if (e.knockedUntil - t < .25) {
          e.hp = 5; e.knockedUntil = 0; e.knockStart = 0; e.powerWeapon = 'regular'; e.powerAmmo = 0; e.shieldHits = 0; e.boostUntil = 0; e.slowUntil = 0;
          e.group.rotation.set(0, 0, 0); e.group.position.set(e.team === 0 ? -66 : 66, 0, (Math.random() - .5) * 18);
          e.group.scale.setScalar(1); e.body.position.y = 2.25; e.nameplate.visible = true; e.healthBack.visible = true; e.healthFill.visible = true;
          e.healthFill.scale.x = 3.85; e.lastPosition.copy(e.group.position); e.velocity.set(0, 0, 0); e.dizzy.visible = false;
        }
        return;
      }
      e.cooldown = Math.max(0, e.cooldown - dt); e.hitTimer = Math.max(0, e.hitTimer - dt); e.throwTimer = Math.max(0, e.throwTimer - dt); e.aiTimer -= dt;
      e.group.position.y = 0; e.healthBack.visible = true;
      e.nameplate.visible = e.group.position.distanceToSquared(camera.position) < (e.team === 0 ? 46 * 46 : 58 * 58);

      if (e.windup > 0) {
        e.windup = Math.max(0, e.windup - dt);
        if (e.windup === 0 && e.pendingAim) {
          const from = e.group.position.clone().add(new THREE.Vector3(0, 3.05, 0)); const aimPoint = e.pendingAim.clone();
          if (hasLineOfSight(from, aimPoint)) {
            const randomIce = Math.random() < (difficulty === 'blizzard' ? .018 : .006);
            const shotType = e.powerAmmo > 0 ? e.powerWeapon : randomIce ? 'ice' : 'regular';
            const ballSpeed = (shotType === 'rapid' ? 31 : shotType === 'mega' ? 20 : shotType === 'blizzard' ? 19 : 25) + e.profile.strength / 12;
            const flight = clamp(from.distanceTo(aimPoint) / ballSpeed, .08, 1.65);
            const aim = aimPoint.sub(from); aim.y += .5 * 7.8 * flight * flight;
            launch(from, aim.normalize(), e.team, i, shotType, clamp(e.profile.accuracy * diffMul, 34, 97), e.profile.strength);
            if (shotType === 'triple') {
              for (const spread of [-.08, .08]) {
                const d2 = aim.clone(); const cos = Math.cos(spread), sin = Math.sin(spread);
                const nx = d2.x * cos - d2.z * sin, nz = d2.x * sin + d2.z * cos; d2.x = nx; d2.z = nz;
                launch(from.clone(), d2, e.team, i, 'regular', clamp(e.profile.accuracy * diffMul, 34, 97), e.profile.strength);
              }
            }
            if (e.powerAmmo > 0) { e.powerAmmo--; if (e.powerAmmo === 0) e.powerWeapon = 'regular'; }
            if (shotType === 'rapid' && e.powerAmmo > 0) e.cooldown = .18;
            else if (shotType === 'mega') e.cooldown = 1.4;
            e.throwTimer = shotType === 'mega' ? .58 : .42;
          }
          e.pendingAim = null;
        }
      }

      const opp = nearestOpponent(e); const target = new THREE.Vector3(); const lane = ((i % 3) - 1) * 22;
      const stolenCarrier = flagCarrier[e.team];
      if (e.hasFlag) target.copy(flagHome[e.team]);
      else if (stolenCarrier !== null) { if (stolenCarrier === -1) target.copy(player.position); else target.copy(entities[stolenCarrier]?.group.position ?? flagHome[e.team]); }
      else if (e.profile.name === 'Petroman') target.copy(flagHome[1]);
      else if (e.role === 'defend') target.copy(flagHome[e.team]).add(new THREE.Vector3(teamDirection(e.team) * 13, 0, (i % 2 ? 1 : -1) * 13));
      else if (e.role === 'ambush') target.set(e.team === 0 ? -6 : 6, 0, (i % 2 ? 1 : -1) * 31);
      else target.set(e.team === 0 ? 68 : -68, 0, Math.abs(e.group.position.x) < 54 ? lane : 0);

      if (!e.hasFlag && stolenCarrier === null) {
        let wanted = null, wantedDistance = Infinity;
        for (const p of powerups) {
          if (!p.active) continue;
          const useful = p.type === 'cocoa' ? e.hp < 5 : p.type === 'shield' ? e.shieldHits === 0 : p.type === 'magnet' ? false : e.powerAmmo === 0;
          if (!useful) continue;
          const d = e.group.position.distanceTo(p.group.position);
          if (d < 26 && d < wantedDistance) { wanted = p; wantedDistance = d; }
        }
        if (wanted) {
          target.copy(wanted.group.position);
          if (wantedDistance < 2.7) {
            wanted.active = false; wanted.group.visible = false;
            wanted.respawn = t + (wanted.type === 'shield' || wanted.type === 'cocoa' ? 34 : 28);
            if (wanted.type === 'shield') e.shieldHits = 2;
            else if (wanted.type === 'cocoa') { e.hp = Math.min(5, e.hp + 1); e.boostUntil = t + 12; e.healthFill.scale.x = 3.85 * (e.hp / 5); }
            else { e.powerWeapon = wanted.type; e.powerAmmo = wanted.type === 'rapid' ? 12 : wanted.type === 'mega' ? 2 : wanted.type === 'triple' ? 4 : 1; }
            if (e.group.position.distanceTo(camera.position) < 32) say(`${e.profile.name} grabbed ${{ cocoa: 'a Cocoa Rush', shield: 'a Frost Shield', mega: 'Mega Snowballs', rapid: 'the Snow Blaster', ice: 'an Ice Ball', blizzard: 'a Blizzard Bomb', triple: 'a Triple Pack' }[wanted.type]}!`, 2);
            beep('power');
          }
        }
      }

      if (opp && opp.dist < 40) {
        const low = e.hp <= 2 && !e.hasFlag; const attackRange = 15 + e.profile.accuracy * .21;
        const from = e.group.position.clone().add(new THREE.Vector3(0, 3.05, 0));
        const oppCenter = opp.pos.clone().add(new THREE.Vector3(0, opp.player ? .05 : 2.7, 0));
        const sight = hasLineOfSight(from, oppCenter);
        if (low) {
          let cover = null, cd = Infinity;
          for (const o of obstacles) {
            if (!activeObstacle(o)) continue;
            const coverPos = new THREE.Vector3(o.x, 0, o.z);
            const d = e.group.position.distanceToSquared(coverPos) + coverPos.distanceToSquared(opp.pos) * .08;
            if (d < cd) { cd = d; cover = o; }
          }
          if (cover) target.set(cover.x - ((opp.pos.x - cover.x) > 0 ? 1 : -1) * (cover.hx + 2.2), 0, cover.z - ((opp.pos.z - cover.z) > 0 ? 1 : -1) * (cover.hz + 2.2));
        } else if (opp.dist < attackRange) {
          const away = e.group.position.clone().sub(opp.pos); away.y = 0; away.normalize();
          const side = new THREE.Vector3(-away.z, 0, away.x).multiplyScalar(e.strafe * (sight ? 7 : 12));
          target.copy(e.group.position).add(side).add(away.multiplyScalar(opp.dist < 9 ? 5 : -.8));
          if (e.cooldown <= 0 && e.windup <= 0 && sight) {
            e.pendingAim = oppCenter; e.windup = .22 + (100 - e.profile.speed) / 360;
            e.cooldown = (1.28 + (100 - e.profile.speed) / 105) / diffMul; e.strafe *= -1;
          }
        } else target.copy(opp.pos).add(new THREE.Vector3(0, 0, e.strafe * 8));
      }

      const delta = target.clone().sub(e.group.position); delta.y = 0;
      for (const mate of entities) {
        if (mate === e || mate.team !== e.team || mate.knockedUntil > t) continue;
        const gap = e.group.position.distanceTo(mate.group.position);
        if (gap > 0 && gap < 3.3) delta.add(e.group.position.clone().sub(mate.group.position).normalize().multiplyScalar((3.3 - gap) * 2.4));
      }
      const dist = delta.length(); let moving = false;
      if (dist > .55 && e.windup <= .08) {
        delta.normalize();
        let sp = e.speed * (e.hasFlag ? 1.08 : 1) * (e.boostUntil > t ? 1.28 : 1) * (e.slowUntil > t ? .55 : 1) * dt;
        if (e.profile.name === 'Petroman') sp *= 1.13;
        tryMove(e.group.position, delta.x * sp, delta.z * sp, .82);
        e.group.rotation.y = Math.atan2(delta.x, delta.z) + Math.PI / 2;
        moving = true;
        e.stepTimer -= dt;
        if (e.stepTimer <= 0) { footPuff(e.group.position); e.stepTimer = .3; }
      }
      e.velocity.copy(e.group.position).sub(e.lastPosition).divideScalar(Math.max(dt, .001));
      e.lastPosition.copy(e.group.position);
      const walk = t * (7 + e.speed * .34); const stride = moving ? Math.sin(walk) : 0;
      e.limbs[0].rotation.x = stride * .62; e.limbs[1].rotation.x = -stride * .72; e.limbs[2].rotation.x = -stride * .62; e.limbs[3].rotation.x = stride * .72;
      e.limbs[0].rotation.z = 0; e.limbs[2].rotation.z = 0;
      e.body.position.y = 2.25 + (moving ? Math.abs(Math.sin(walk)) * .1 : Math.sin(t * 2 + i) * .025);
      e.group.scale.set(1, 1, 1);
      if (e.windup > 0) { const pull = 1 - clamp(e.windup / .5, 0, 1); e.limbs[2].rotation.z = -.4 - pull * 1.3; e.limbs[2].rotation.x = -.65; e.group.rotation.x = -.08; }
      else if (e.throwTimer > 0) { const follow = e.throwTimer / .42; e.limbs[2].rotation.z = .85 * follow; e.limbs[2].rotation.x = .45; e.group.rotation.x = .11 * follow; e.group.scale.y = 1 + Math.sin((.42 - e.throwTimer) * Math.PI / .42) * .1; }
      else e.group.rotation.x = 0;
      if (e.hitTimer > 0) { e.group.rotation.z = Math.sin(e.hitTimer * 38) * .18; e.head.rotation.x = Math.sin(e.hitTimer * 28) * .2; }
      else { e.group.rotation.z = 0; e.head.rotation.x = 0; }
      const ringMat = e.teamRing.material;
      ringMat.opacity = e.hasFlag ? .95 : e.shieldHits > 0 ? .88 : .55 + Math.sin(t * 3 + i) * .1;
      ringMat.color.setHex(e.shieldHits > 0 ? 0x75f5ff : e.team === 0 ? 0x20d7ff : 0xff5b35);
      e.teamRing.scale.setScalar(e.shieldHits > 0 ? 1.08 + Math.sin(t * 7 + i) * .06 : 1);
    });
  };

  const updateProjectiles = (dt, t) => {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life -= dt; p.prev.copy(p.mesh.position);
      p.vel.y -= 7.8 * dt; p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 8; p.mesh.rotation.z += dt * 11;
      const trailPosition = p.trail.geometry.getAttribute('position');
      trailPosition.setXYZ(0, p.prev.x, p.prev.y, p.prev.z);
      trailPosition.setXYZ(1, p.mesh.position.x, p.mesh.position.y, p.mesh.position.z);
      trailPosition.needsUpdate = true;
      let remove = p.life <= 0 || p.mesh.position.y < 0;
      if (!remove) {
        const mid = p.prev.clone().lerp(p.mesh.position, .5);
        for (const o of obstacles) {
          if (!activeObstacle(o)) continue;
          const impact = [p.prev, mid, p.mesh.position].some(sample => sample.y < o.mesh.position.y + 7 && Math.abs(sample.x - o.x) < o.hx + .28 && Math.abs(sample.z - o.z) < o.hz + .28);
          if (impact) {
            if (o.destructible) {
              o.hp -= p.type === 'ice' ? 4 : p.type === 'mega' ? 6 : 1;
              burst(p.mesh.position, o.name === 'snowman' ? 0xffffff : p.type === 'mega' ? 0xc77dff : 0xcaf2ff, p.type === 'mega' ? 18 : 7);
              o.mesh.scale.y = clamp(o.hp / o.maxHp, .1, 1);
              if (o.hp <= 0) { o.mesh.visible = false; say(`${o.name[0].toUpperCase() + o.name.slice(1)} demolished!`, 1.4); }
            }
            remove = true; break;
          }
        }
      }
      if (!remove) {
        if (p.team === 0) {
          for (const e of entities) {
            if (e.team !== 1 || e.knockedUntil > t) continue;
            const center = e.group.position.clone().add(new THREE.Vector3(0, 2.65, 0));
            if (pointSegmentDistanceSq(center, p.prev, p.mesh.position) < (p.type === 'mega' ? 3.2 : 2.45)) {
              if (p.type !== 'mega' && p.type !== 'blizzard') hitEntity(e, p.type, p.owner);
              remove = true; break;
            }
          }
        } else {
          if (player.knockedUntil <= t && pointSegmentDistanceSq(player.position, p.prev, p.mesh.position) < (p.type === 'mega' ? 2.5 : 1.75)) {
            if (p.type !== 'mega' && p.type !== 'blizzard') hitPlayer(p.type, p.owner);
            remove = true;
          }
          if (!remove) {
            for (const e of entities) {
              if (e.team !== 0 || e.knockedUntil > t) continue;
              const center = e.group.position.clone().add(new THREE.Vector3(0, 2.65, 0));
              if (pointSegmentDistanceSq(center, p.prev, p.mesh.position) < (p.type === 'mega' ? 3.2 : 2.45)) {
                if (p.type !== 'mega' && p.type !== 'blizzard') hitEntity(e, p.type, p.owner);
                remove = true; break;
              }
            }
          }
        }
      }
      if (remove) {
        if (p.type === 'mega') megaBlast(p.mesh.position.clone(), p.team, p.owner);
        else if (p.type === 'blizzard') spawnVortex(p.mesh.position.clone(), p.team);
        else burst(p.mesh.position, p.type === 'ice' ? 0x67eeff : 0xffffff, p.type === 'ice' ? 12 : 5);
        world.remove(p.mesh); world.remove(p.trail);
        p.trail.geometry.dispose(); p.trail.material.dispose();
        projectiles.splice(i, 1);
      }
    }
  };

  const updateVortices = (dt, t) => {
    for (let i = vortices.length - 1; i >= 0; i--) {
      const v = vortices[i];
      v.swirl.forEach(s => {
        s.angle += dt * s.spin;
        s.mesh.position.set(Math.cos(s.angle) * s.r, s.h + Math.sin(s.angle * 2) * .4, Math.sin(s.angle) * s.r);
      });
      v.tick -= dt;
      if (v.tick <= 0) {
        v.tick = 1.1;
        for (const e of entities) {
          if (e.team === v.team || e.knockedUntil > t) continue;
          if (e.group.position.distanceTo(v.group.position) < 8) { hitEntity(e, 'regular', v.team === 0 ? -1 : -2); e.slowUntil = t + 1.6; }
        }
        if (v.team === 1 && player.position.distanceTo(v.group.position) < 7.4) { hitPlayer('regular', -2); player.slowUntil = t + 1.6; }
      }
      if (t > v.until) { world.remove(v.group); vortices.splice(i, 1); }
    }
  };

  const POWER_LINES = {
    shield: 'FROST SHIELD! The next three hits bounce off!',
    cocoa: 'HOT COCOA RUSH! Speed boost + one energy!',
    ice: 'ICE BALL! One hit = a 30-second snow nap!',
    mega: 'MEGA SNOWBALLS! Splash damage + fort-crushing power!',
    rapid: 'SNOWBALL BLASTER! Hold fire for 20 rapid shots!',
    blizzard: 'BLIZZARD BOMB! Park a snowstorm on the enemy lane!',
    triple: 'TRIPLE PACK! Your next 6 throws fan out in threes!',
    magnet: 'MAGNET MITTENS! Nearby power-ups drift to you for 12s!',
  };
  const applyPickup = (p, t) => {
    p.active = false; p.group.visible = false;
    p.respawn = t + (p.type === 'shield' || p.type === 'cocoa' ? 34 : 28);
    if (p.type === 'shield') player.shieldHits = 3;
    else if (p.type === 'cocoa') { player.boostUntil = t + 15; player.hp = Math.min(5, player.hp + 1); }
    else if (p.type === 'triple') player.tripleShots = 6;
    else if (p.type === 'magnet') player.magnetUntil = t + 12;
    else { player.weapon = p.type; player.ammoMax = p.type === 'rapid' ? 20 : p.type === 'mega' ? 3 : p.type === 'blizzard' ? 2 : 1; player.ammo = player.ammoMax; }
    say(POWER_LINES[p.type], 4);
    beep('power');
  };

  const updatePlayer = (dt, t) => {
    if (player.knockedUntil > t) { currentAimTarget = currentLookTarget = null; camera.position.set(-66, 8, 0); camera.lookAt(-58, 1, 0); return; }
    if (player.hp <= 0) {
      player.hp = 5; player.shieldHits = 0; player.boostUntil = 0; player.tripleShots = 0; player.magnetUntil = 0;
      player.position.set(-66, 1.72, (Math.random() - .5) * 12);
      say('Respawned at the blue fort — back in the fight!', 2);
    }
    let forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + -moveStick.y;
    let side = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + moveStick.x;
    const len = Math.hypot(forward, side);
    if (len > 1) { forward /= len; side /= len; }
    const sprint = keys.has('ShiftLeft') && !focused ? 1.23 : 1;
    const cocoaBoost = player.boostUntil > t ? 1.34 : 1;
    const slowMul = player.slowUntil > t ? .6 : 1;
    const dx = (Math.sin(player.yaw) * -forward + Math.cos(player.yaw) * side) * player.speed * sprint * cocoaBoost * slowMul * dt;
    const dz = (Math.cos(player.yaw) * -forward - Math.sin(player.yaw) * side) * player.speed * sprint * cocoaBoost * slowMul * dt;
    tryMove(player.position, dx, dz, .72);
    if (len > .1) { player.stepTimer -= dt; if (player.stepTimer <= 0) { footPuff(player.position); player.stepTimer = .24; } }
    const onIce = Math.hypot(player.position.x - 2, player.position.z + 5) < 22;
    if (onIce && len > .1) { tryMove(player.position, dx * .22, dz * .22, .72); camera.rotation.z = Math.sin(t * 6) * .012; }
    else camera.rotation.z = 0;
    camera.position.copy(player.position);
    camera.rotation.y = player.yaw; camera.rotation.x = player.pitch;
    const bob = len > .1 ? Math.sin(t * (cocoaBoost > 1 ? 14 : 11)) * .055 * (focused ? .35 : 1) : Math.sin(t * 2) * .012;
    camera.position.y = player.position.y + bob;
    camera.rotation.z += (side * -.018) + (cocoaBoost > 1 ? Math.sin(t * 8) * .006 : 0);
    if (cameraShake > 0) {
      camera.position.x += (Math.random() - .5) * cameraShake;
      camera.position.y += (Math.random() - .5) * cameraShake;
      camera.position.z += (Math.random() - .5) * cameraShake;
      cameraShake = Math.max(0, cameraShake - dt * 1.8);
    }
    const desiredFov = focused ? 57 : 72;
    camera.fov += (desiredFov - camera.fov) * Math.min(1, dt * 11);
    camera.updateProjectionMatrix();
    currentAimTarget = acquireAimTarget();
    currentLookTarget = acquireLookTarget(null, 1.08) ?? currentAimTarget;
    if (firing && player.weapon === 'rapid') playerThrow();
    if (player.reloadUntil > 0 && t >= player.reloadUntil) {
      player.reloadUntil = 0; player.ammo = player.ammoMax; beep('reload');
      say('Locked, loaded, and lightly chilled.', 1.5);
    }
    const heavyThrow = player.throwAnim > .42;
    const throwDuration = heavyThrow ? .58 : .42;
    player.throwAnim = Math.max(0, player.throwAnim - dt);
    const throwPhase = player.throwAnim > 0 ? 1 - player.throwAnim / throwDuration : 0;
    const throwSnap = player.throwAnim > 0 ? (throwPhase < .32 ? throwPhase / .32 : (1 - throwPhase) / .68) : 0;
    weapon.rotation.x = -throwSnap * (heavyThrow ? 1.2 : .92);
    weapon.rotation.z = throwSnap * (heavyThrow ? .24 : .14);
    weapon.position.z = throwSnap * (heavyThrow ? .28 : .18);
    weapon.position.y = -throwSnap * .05;
    if (player.reloadUntil > t) { weapon.rotation.y = Math.sin(t * 13) * .13; weapon.position.y = -.08 - Math.abs(Math.sin(t * 7)) * .08; }
    else weapon.rotation.y = 0;
    heldBall.visible = player.ammo > 0 && !(player.throwAnim > 0 && throwPhase > .22 && throwPhase < .62);
    heldBall.material = player.weapon === 'ice' ? MAT.ice : player.weapon === 'rapid' ? MAT.gold : player.weapon === 'mega' ? MAT.purple : player.weapon === 'blizzard' ? MAT.storm : MAT.white;
    heldBall.scale.setScalar(player.weapon === 'ice' ? 1.65 : player.weapon === 'mega' ? 2.05 : player.weapon === 'blizzard' ? 1.8 : 1.3);
    for (const p of powerups) {
      if (!p.active) { if (t > p.respawn) { p.active = true; p.group.visible = true; p.group.position.copy(p.home); } continue; }
      p.group.rotation.y += dt * (p.type === 'mega' ? 2.2 : 1.5);
      p.group.rotation.z = Math.sin(t * 1.7 + p.group.position.z) * .08;
      p.group.position.y = 1.5 + Math.sin(t * 2 + p.group.position.x) * .25;
      p.group.scale.setScalar(1 + Math.sin(t * 4 + p.group.position.x) * .06);
      // Magnet Mittens gently reels nearby pickups toward the player.
      if (player.magnetUntil > t) {
        const d = player.position.distanceTo(p.group.position);
        if (d < 22 && d > 1.6) {
          const pull = p.group.position.clone().sub(player.position).normalize().multiplyScalar(-dt * 9);
          p.group.position.x += pull.x; p.group.position.z += pull.z;
        }
      }
      if (player.position.distanceToSquared(p.group.position) < 5) applyPickup(p, t);
    }
  };

  const updateDog = (dt, t) => {
    const d = dogTarget.clone().sub(dog.position); d.y = 0;
    if (d.length() < 2) {
      dogWait -= dt;
      if (dogWait <= 0) { dogTarget.set((Math.random() - .5) * 120, 0, (Math.random() - .5) * 85); dogWait = 1 + Math.random() * 2; }
    } else {
      d.normalize();
      dog.position.addScaledVector(d, dt * (4 + Math.sin(t * 3)));
      dog.rotation.y = Math.atan2(d.x, d.z) + Math.PI / 2;
      dog.position.y = Math.abs(Math.sin(t * 9)) * .08;
      tail.rotation.x = Math.sin(t * 15) * .65;
    }
  };

  /* HUD DOM sync */
  const heartSpans = hudEls.hearts ? Array.from(hudEls.hearts.children) : [];
  const WEAPON_NAMES = { regular: 'CLASSIC SNOW', ice: 'ICE BALL', mega: 'MEGA SNOWBALL', rapid: 'SNOW BLASTER', blizzard: 'BLIZZARD BOMB' };
  const syncHud = (t) => {
    const stolen = flagCarrier[0];
    const objective = player.hasFlag ? flagHome[0] : stolen !== null ? (stolen === -1 ? player.position : entities[stolen]?.group.position ?? flagHome[0]) : flagHome[1];
    const objectiveLabel = player.hasFlag ? 'RETURN TO BLUE FORT' : stolen !== null ? 'INTERCEPT FLAG THIEF' : 'CAPTURE ORANGE FLAG';
    const defaultMessage = player.hasFlag ? 'Orange flag secured · Return to the blue fort' : stolen !== null ? 'BLUE FLAG STOLEN · Stop the carrier!' : 'Capture the orange flag · Defend the blue';
    hudEls.blueScore && (hudEls.blueScore.textContent = blueScore);
    hudEls.orangeScore && (hudEls.orangeScore.textContent = orangeScore);
    hudEls.time && (hudEls.time.textContent = fmtTime(timeLeft));
    hudEls.blueAlive && (hudEls.blueAlive.textContent = `${1 + entities.filter(e => e.team === 0 && e.knockedUntil <= t).length}/12 UP`);
    hudEls.orangeAlive && (hudEls.orangeAlive.textContent = `${entities.filter(e => e.team === 1 && e.knockedUntil <= t).length}/12 UP`);
    hudEls.msg && (hudEls.msg.textContent = t < messageUntil ? message : defaultMessage);
    hudEls.objLabel && (hudEls.objLabel.textContent = objectiveLabel);
    hudEls.objDist && (hudEls.objDist.textContent = Math.round(player.position.distanceTo(objective)) + 'm');
    hudEls.ammo && (hudEls.ammo.textContent = player.ammo);
    hudEls.ammoMax && (hudEls.ammoMax.textContent = '/' + player.ammoMax);
    hudEls.weaponName && (hudEls.weaponName.textContent = WEAPON_NAMES[player.weapon]);
    hudEls.weaponPanel && (hudEls.weaponPanel.dataset.weapon = player.weapon);
    const reloading = player.reloadUntil > t;
    hudEls.reloadWrap?.classList.toggle('on', reloading);
    if (reloading && hudEls.reloadBar) hudEls.reloadBar.style.width = `${(1 - (player.reloadUntil - t) / 2.45) * 100}%`;
    heartSpans.forEach((h, i) => h.classList.toggle('off', i >= player.hp));
    hudEls.frost?.classList.toggle('on', player.hp > 0 && player.hp <= 2 && player.knockedUntil <= t);
    if (hudEls.buffs) {
      const buffs = [];
      if (player.shieldHits > 0) buffs.push(`<span class="b-shield">❄ SHIELD ×${player.shieldHits}</span>`);
      if (player.boostUntil > t) buffs.push(`<span class="b-cocoa">☕ COCOA ${Math.ceil(player.boostUntil - t)}s</span>`);
      if (player.tripleShots > 0) buffs.push(`<span class="b-triple">☃ TRIPLE ×${player.tripleShots}</span>`);
      if (player.magnetUntil > t) buffs.push(`<span class="b-magnet">🧲 MAGNET ${Math.ceil(player.magnetUntil - t)}s</span>`);
      hudEls.buffs.innerHTML = buffs.join('');
    }
    const streak = t - lastPlayerHit < 4 ? hitStreak : 0;
    hudEls.streak?.classList.toggle('on', streak > 1);
    if (streak > 1 && hudEls.streakN) hudEls.streakN.textContent = streak + '×';
    if (hudEls.target) {
      if (currentLookTarget) {
        hudEls.target.className = `target-card on team-${currentLookTarget.team}`;
        hudEls.targetName.textContent = currentLookTarget.profile.name;
        hudEls.targetHp.textContent = `${currentLookTarget.hp}/5 ENERGY`;
        hudEls.targetTag.textContent = currentLookTarget.team === 0 ? 'FRIENDLY' : 'TARGET LOCK';
      } else hudEls.target.className = 'target-card';
    }
    hudEls.crosshair?.classList.toggle('locked', Boolean(currentAimTarget));
    hudEls.crosshair?.classList.toggle('hit', t < hitMarkerUntil);
    hudEls.dmg?.classList.toggle('on', t < damageFlashUntil);
    hudEls.flagCarry?.classList.toggle('on', player.hasFlag);
    const knocked = Math.max(0, player.knockedUntil - t);
    hudEls.knock?.classList.toggle('on', knocked > 0);
    if (knocked > 0 && hudEls.knockN) hudEls.knockN.textContent = Math.ceil(knocked);
    if (minimapCtx) {
      const w = hudEls.minimap.width, h = hudEls.minimap.height;
      minimapCtx.clearRect(0, 0, w, h);
      minimapCtx.fillStyle = 'rgba(6,30,55,.78)'; minimapCtx.fillRect(0, 0, w, h);
      minimapCtx.fillStyle = 'rgba(128,219,244,.4)';
      minimapCtx.beginPath(); minimapCtx.ellipse((2 + 90) / 180 * w, (-5 + 62) / 124 * h, 23 / 180 * w, 23 / 124 * h, 0, 0, Math.PI * 2); minimapCtx.fill();
      const dot = (x, z, color, size = 3) => { minimapCtx.fillStyle = color; minimapCtx.beginPath(); minimapCtx.arc(clamp((x + 90) / 180, .02, .98) * w, clamp((z + 62) / 124, .02, .98) * h, size, 0, Math.PI * 2); minimapCtx.fill(); };
      dot(flagHome[0].x, flagHome[0].z, '#35e2ff', 5); dot(flagHome[1].x, flagHome[1].z, '#ff7a45', 5);
      entities.forEach(e => { if (e.knockedUntil <= t) dot(e.group.position.x, e.group.position.z, e.team === 0 ? '#59c8ff' : '#ff8a5c', 2.5); });
      dot(player.position.x, player.position.z, '#ffffff', 4);
    }
  };

  const finishMatch = () => {
    document.exitPointerLock?.();
    matchStats = { shots: playerShots, hits: playerHits, knockouts: playerKnockouts, captures: playerCaptures, blue: blueScore, orange: orangeScore };
    const kind = blueScore > orangeScore ? 'victory' : orangeScore > blueScore ? 'defeat' : 'draw';
    const over = $('screenOver');
    if (over) {
      over.dataset.result = kind;
      $('overTitle').textContent = kind === 'victory' ? "SEAN'S SQUAD WINS!" : kind === 'defeat' ? 'THE BULLIES GOT LUCKY!' : 'A VERY SNOWY DRAW!';
      $('overEyebrow').textContent = kind === 'victory' ? 'FLAG-NABBING LEGENDS' : kind === 'defeat' ? 'SO CLOSE, SNOW HERO' : 'THE GREAT SNOW STANDOFF';
      $('overBlue').textContent = blueScore; $('overOrange').textContent = orangeScore;
      $('overLine').textContent = kind === 'victory' ? 'The park is safe, the flag is home, and Petroman is still charging somewhere.' : kind === 'defeat' ? 'Rick will be unbearable until tomorrow. A rematch seems medically necessary.' : 'Both flags survived, the forts did not, and the dog claims moral victory.';
      $('statCaps').textContent = matchStats.captures;
      $('statKos').textContent = matchStats.knockouts;
      $('statAcc').textContent = (matchStats.shots > 0 ? Math.round(matchStats.hits / matchStats.shots * 100) : 0) + '%';
      $('statShots').textContent = matchStats.shots;
    }
    setMode('gameover');
  };

  let last = now$(), raf = 0;
  const resize = () => {
    const w = mount.clientWidth, h = mount.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', () => setTimeout(resize, 60));

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const t = now$();
    const dt = Math.min(.035, t - last);
    last = t;
    const arr = snowGeo.attributes.position.array;
    for (let i = 0; i < snowCount; i++) { arr[i * 3 + 1] -= dt * (1.5 + (i % 7) * .13); arr[i * 3] += .15 * dt; if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 42; }
    snowGeo.attributes.position.needsUpdate = true;
    updateDog(dt, t);
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life -= dt; p.vel.y -= 7 * dt; p.mesh.position.addScaledVector(p.vel, dt); p.mesh.scale.setScalar(clamp(p.life / .7, 0, 1)); if (p.life <= 0) { world.remove(p.mesh); particles.splice(i, 1); } }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.life -= dt; const k = 1 - r.life / .6; r.mesh.scale.setScalar(1 + k * r.maxR); r.mesh.material.opacity = .9 * (1 - k); if (r.life <= 0) { world.remove(r.mesh); rings.splice(i, 1); } }
    for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.life -= dt; f.sprite.position.y += dt * 2.2; f.sprite.material.opacity = clamp(f.life / .5, 0, 1); if (f.life <= 0) { world.remove(f.sprite); f.sprite.material.map.dispose(); f.sprite.material.dispose(); floaters.splice(i, 1); } }
    for (let i = prints.length - 1; i >= 0; i--) { const f = prints[i]; f.life -= dt; f.mesh.material.opacity = clamp(f.life / 1.4, 0, 1) * .55; if (f.life <= 0) { world.remove(f.mesh); prints.splice(i, 1); } }
    if (mode === 'title' || mode === 'briefing' || mode === 'loading' || mode === 'gameover') {
      const orbit = t * .09;
      camera.position.set(Math.cos(orbit) * 93, 35, Math.sin(orbit) * 70);
      camera.lookAt(0, 2, 0);
    }
    if (mode === 'playing') {
      if (blueScore >= 3 || orangeScore >= 3 || timeLeft <= 0) finishMatch();
      else {
        timeLeft = Math.max(0, 360 - (t - gameStart));
        updatePlayer(dt, t); updateAI(dt, t); updateProjectiles(dt, t); updateVortices(dt, t); updateFlags();
      }
    }
    flags.forEach((f, i) => { const cloth = f.children[1]; cloth.rotation.z = Math.sin(t * 4 + i) * .06; });
    if (mode === 'playing' && t - lastHud > .1) { lastHud = t; syncHud(t); }
    renderer.render(scene, camera);
  };
  loop();
}
