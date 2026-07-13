const MAPS = new Set(['village','homestead','meadow','cave','petro','ruushwood','moon','ruins','tower','frostpeak','sunsand']);
const PARTY = new Set(['sean','dave','petroman','ruush','haraku']);
const GEMS = new Set(['Meadow Gem','Cave Gem','Plains Gem','Forest Gem','Moon Gem','Ruin Gem','Seventh Gem']);
const QUESTS = new Set([
  'awakening','find_dave','meadow_entry','moldor','homestead_claim','home_foundation',
  'crystal_cave','petro_parts','petro_titan','ruush_trail','moon_tea','lunar_shade',
  'ruins_seal','tower','xelar_final','postgame_frostpeak','frostpeak_queen',
  'sunsand_scout','tide_sovereign','postgame_legend','postgame'
]);

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finite = (value, fallback, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
const integer = (value, fallback, min, max) => Math.round(finite(value, fallback, min, max));
const text = (value, fallback = '', max = 80) => typeof value === 'string' ? value.slice(0, max) : fallback;
const bool = value => value === true;

function record(raw, {maxEntries = 300, maxKey = 80, value} = {}) {
  const output = {};
  if (!isObject(raw)) return output;
  for (const [key, entry] of Object.entries(raw).slice(0, maxEntries)) {
    if (!key || key.length > maxKey) continue;
    const clean = value ? value(entry, key) : entry;
    if (clean !== undefined) output[key] = clean;
  }
  return output;
}

function cleanHero(raw) {
  const hero = isObject(raw) ? raw : {};
  return {
    level: integer(hero.level, 1, 1, 999),
    xp: integer(hero.xp, 0, 0, 10_000_000),
    xpNext: integer(hero.xpNext, 30, 1, 10_000_000),
    hp: integer(hero.hp, 120, 0, 1_000_000),
    maxHp: integer(hero.maxHp, 120, 1, 1_000_000),
    mp: integer(hero.mp, 32, 0, 1_000_000),
    maxMp: integer(hero.maxMp, 32, 0, 1_000_000),
    attack: integer(hero.attack, 15, 0, 100_000),
    defense: integer(hero.defense, 8, 0, 100_000),
    coins: integer(hero.coins, 40, 0, 100_000_000),
    friendship: integer(hero.friendship, 0, 0, 100)
  };
}

function cleanPlayer(raw) {
  const player = isObject(raw) ? raw : {};
  return {
    x: finite(player.x, 704, 0, 100_000),
    y: finite(player.y, 640, 0, 100_000),
    speed: finite(player.speed, 3.1, 1, 10),
    dir: ['up','down','left','right'].includes(player.dir) ? player.dir : 'down',
    frameTimer: finite(player.frameTimer, 0, 0, 10_000),
    frame: integer(player.frame, 0, 0, 100)
  };
}

function cleanHomestead(raw) {
  const home = isObject(raw) ? raw : {};
  const tiles = record(home.tiles, {
    maxEntries: 2000,
    maxKey: 24,
    value: (piece, key) => /^-?\d{1,4},-?\d{1,4}$/.test(key) && typeof piece === 'string' ? piece.slice(0, 64) : undefined
  });
  return {
    claimed: bool(home.claimed),
    level: integer(home.level, 1, 1, 20),
    tiles,
    blueprintsBuilt: Array.isArray(home.blueprintsBuilt)
      ? [...new Set(home.blueprintsBuilt.filter(item => typeof item === 'string').map(item => item.slice(0, 64)))].slice(0, 100)
      : [],
    perksSeen: Array.isArray(home.perksSeen)
      ? [...new Set(home.perksSeen.filter(item => typeof item === 'string').map(item => item.slice(0, 64)))].slice(0, 100)
      : [],
    lastGiftAt: integer(home.lastGiftAt, 0, 0, 9_000_000_000_000_000)
  };
}

export function sanitizeSave(raw) {
  if (!isObject(raw)) throw new TypeError('save must be an object');
  const mapId = MAPS.has(raw.mapId) ? raw.mapId : 'village';
  const party = Array.isArray(raw.party)
    ? [...new Set(raw.party.filter(member => PARTY.has(member)))].slice(0, PARTY.size)
    : ['sean'];
  if (!party.includes('sean')) party.unshift('sean');

  const hero = cleanHero(raw.hero);
  hero.hp = Math.min(hero.hp, hero.maxHp);
  hero.mp = Math.min(hero.mp, hero.maxMp + 100_000);

  return {
    version: integer(raw.version, 3, 1, 20),
    scene: ['title','explore','dialogue','battle','inventory','quest','map','craft','build','shop','fishing','party','coopGuest'].includes(raw.scene) ? raw.scene : 'title',
    mapId,
    player: cleanPlayer(raw.player),
    party,
    unlocked: record(raw.unlocked, {maxEntries: 20, maxKey: 30, value: value => bool(value)}),
    hero,
    items: record(raw.items, {maxEntries: 250, maxKey: 80, value: value => integer(value, 0, 0, 9999)}),
    equipment: {
      weapon: text(raw.equipment?.weapon, '', 80) || null,
      armor: text(raw.equipment?.armor, '', 80) || null,
      charm: text(raw.equipment?.charm, '', 80) || null
    },
    flags: record(raw.flags, {maxEntries: 500, maxKey: 80, value: value => typeof value === 'boolean' ? value : text(value, '', 120)}),
    quest: {
      id: QUESTS.has(raw.quest?.id) ? raw.quest.id : 'awakening',
      title: text(raw.quest?.title, '', 120),
      objective: text(raw.quest?.objective, '', 300),
      progress: integer(raw.quest?.progress, 0, 0, 100_000)
    },
    sideQuests: record(raw.sideQuests, {maxEntries: 100, maxKey: 80, value: value => text(value, '', 40)}),
    gems: Array.isArray(raw.gems) ? [...new Set(raw.gems.filter(gem => GEMS.has(gem)))].slice(0, 7) : [],
    chestsOpened: record(raw.chestsOpened, {maxEntries: 1000, maxKey: 100, value: value => bool(value)}),
    defeatedBosses: record(raw.defeatedBosses, {maxEntries: 200, maxKey: 100, value: value => bool(value)}),
    nodeTimers: record(raw.nodeTimers, {maxEntries: 3000, maxKey: 100, value: value => integer(value, 0, 0, 9_000_000_000_000_000)}),
    crops: record(raw.crops, {
      maxEntries: 1000,
      maxKey: 24,
      value: (crop, key) => /^-?\d{1,4},-?\d{1,4}$/.test(key) && isObject(crop)
        ? {crop: text(crop.crop, '', 64), plantedAt: integer(crop.plantedAt, Date.now(), 0, 9_000_000_000_000_000)}
        : undefined
    }),
    homestead: cleanHomestead(raw.homestead),
    stats: record(raw.stats, {maxEntries: 50, maxKey: 60, value: value => integer(value, 0, 0, 100_000_000)}),
    achievements: record(raw.achievements, {maxEntries: 200, maxKey: 80, value: value => integer(value, 0, 0, 9_000_000_000_000_000)}),
    daily: isObject(raw.daily) ? {date: text(raw.daily.date, '', 10), pick: integer(raw.daily.pick, 0, 0, 1000), done: bool(raw.daily.done)} : null,
    treasure: isObject(raw.treasure) && MAPS.has(raw.treasure.mapId)
      ? {mapId: raw.treasure.mapId, tx: integer(raw.treasure.tx, 0, -1000, 1000), ty: integer(raw.treasure.ty, 0, -1000, 1000)}
      : null,
    ngPlus: integer(raw.ngPlus, 0, 0, 999),
    playMinutes: finite(raw.playMinutes, 0, 0, 100_000_000),
    savedAt: integer(raw.savedAt, Date.now(), 0, 9_000_000_000_000_000),
    lastAdReward: integer(raw.lastAdReward, 0, 0, 9_000_000_000_000_000)
  };
}
