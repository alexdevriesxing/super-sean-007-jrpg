/* Super Sean 007 — save schema + migration. Kept in its own module so it can be
   unit-tested in Node (see test/save.test.mjs). Pure: no DOM, no side effects. */
(() => {
  'use strict';
  window.SSG = window.SSG || {};
  const TILE = SSG.TILE || 64;
  SSG.SAVE_VERSION = 3;

  SSG.defaultState = () => ({
    version: SSG.SAVE_VERSION,
    scene: 'title',
    mapId: 'village',
    player: {x: 11 * TILE, y: 10 * TILE, speed: 3.1, dir: 'down', frameTimer: 0, frame: 0},
    party: ['sean'],
    unlocked: {meadow: true, cave: false, petro: false, ruushwood: false, moon: false, ruins: false, tower: false, homestead: false, frostpeak: false, sunsand: false},
    hero: {level: 1, xp: 0, xpNext: 30, hp: 120, maxHp: 120, mp: 32, maxMp: 32, attack: 15, defense: 8, coins: 40, friendship: 0},
    items: {'Berry Juice': 3, 'Crystal Candy': 1, 'Wood': 4, 'Stone': 2},
    equipment: {weapon: null, armor: null, charm: null},
    flags: {},
    quest: {id: 'awakening', title: 'The Birthday Crystal', objective: 'Talk to Elder Brightbeard in Birthday Village.', progress: 0},
    sideQuests: {},
    gems: [],
    chestsOpened: {},
    defeatedBosses: {},
    nodeTimers: {},
    crops: {},
    homestead: {claimed: false, level: 1, tiles: {}, blueprintsBuilt: [], perksSeen: [], lastGiftAt: 0},
    stats: {gathered: 0, battlesWon: 0, fishCaught: 0, treasuresDug: 0, dailiesDone: 0, cropsHarvested: 0},
    achievements: {},
    daily: null,
    treasure: null,
    mount: null,
    ngPlus: 0,
    playMinutes: 0,
    savedAt: 0,
    lastAdReward: 0
  });

  function migratedPostgameQuest(raw) {
    if (raw?.quest?.id !== 'postgame') return raw?.quest?.id;
    const defeated = raw.defeatedBosses || {};
    if (defeated.ss_boss) return 'postgame_legend';
    if (defeated.fp_boss || raw.unlocked?.sunsand) return 'sunsand_scout';
    return 'postgame_frostpeak';
  }

  // Merge a raw (possibly old or partial) save into the current schema without
  // ever throwing — a broken field falls back to the default rather than wiping.
  SSG.migrateSave = (raw) => {
    const base = SSG.defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const sourceQuestId = migratedPostgameQuest(raw);
    const merged = {...base, ...raw};
    ['player', 'unlocked', 'hero', 'equipment', 'quest', 'homestead'].forEach(key => {
      merged[key] = {...base[key], ...(raw[key] || {})};
    });
    ['items', 'flags', 'sideQuests', 'chestsOpened', 'defeatedBosses', 'nodeTimers', 'crops', 'achievements'].forEach(key => {
      merged[key] = {...(raw[key] || {})};
    });
    merged.stats = {...base.stats, ...(raw.stats || {})};
    merged.gems = Array.isArray(raw.gems) ? raw.gems : [];
    merged.party = Array.isArray(raw.party) && raw.party.length ? raw.party : base.party;
    merged.mount = ['animal_deerling', 'mount_dragonling'].includes(raw.mount) ? raw.mount : null;
    if (sourceQuestId) merged.quest.id = sourceQuestId;
    const quests = SSG.MAIN_QUESTS || [];
    if (!quests.some(q => q.id === merged.quest.id)) merged.quest = base.quest;
    else {
      const def = quests.find(q => q.id === merged.quest.id);
      const preserveProgress = sourceQuestId === raw.quest?.id;
      merged.quest = {
        id: def.id,
        title: def.title,
        objective: preserveProgress ? (merged.quest.objective || def.objective) : def.objective,
        progress: preserveProgress ? (merged.quest.progress || 0) : 0
      };
    }
    merged.version = SSG.SAVE_VERSION;
    return merged;
  };
})();
