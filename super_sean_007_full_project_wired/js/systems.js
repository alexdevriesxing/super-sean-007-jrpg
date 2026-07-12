/* Super Sean 007 — gameplay systems: inventory/equipment, quests, gathering,
   crafting, homestead building, gardening and shop. Created by game.js with a
   context object; returns a pure API used by the core loop and renderer. */
(() => {
  'use strict';
  window.SSG = window.SSG || {};

  SSG.createSystems = (ctx) => {
    const T = SSG.TILE;
    const S = () => ctx.state();

    /* ---------------- inventory & equipment ---------------- */
    function addItem(name, qty = 1) {
      if (qty <= 0) return;
      const items = S().items;
      items[name] = (items[name] || 0) + qty;
    }
    function removeItem(name, qty = 1) {
      const items = S().items;
      if ((items[name] || 0) < qty) return false;
      items[name] -= qty;
      if (items[name] <= 0) delete items[name];
      return true;
    }
    function countItem(name) { return S().items[name] || 0; }
    function hasCost(cost) { return Object.entries(cost).every(([item, qty]) => countItem(item) >= qty); }
    function payCost(cost) {
      if (!hasCost(cost)) return false;
      Object.entries(cost).forEach(([item, qty]) => removeItem(item, qty));
      return true;
    }
    function refundCost(cost) { Object.entries(cost).forEach(([item, qty]) => addItem(item, qty)); }

    function equipBonuses() {
      const bonus = {attack: 0, defense: 0, maxMp: 0};
      Object.values(S().equipment || {}).forEach(name => {
        const def = name && SSG.ITEMS[name];
        if (!def) return;
        bonus.attack += def.attack || 0;
        bonus.defense += def.defense || 0;
        bonus.maxMp += def.maxMp || 0;
      });
      if (perkActive('aura')) { bonus.attack += 2; bonus.defense += 2; }
      return bonus;
    }
    function heroStats() {
      const h = S().hero;
      const b = equipBonuses();
      return {attack: h.attack + b.attack, defense: h.defense + b.defense, maxMp: h.maxMp + b.maxMp};
    }
    function equipItem(name) {
      const def = SSG.ITEMS[name];
      if (!def || def.type !== 'equipment' || countItem(name) <= 0) return false;
      const eq = S().equipment;
      if (eq[def.slot] === name) { eq[def.slot] = null; ctx.showToast(`Unequipped ${name}.`); }
      else { eq[def.slot] = name; ctx.showToast(`Equipped ${name} (${def.slot}).`); }
      ctx.sfx('ui_confirm'); ctx.save();
      return true;
    }
    function useConsumable(name) {
      const def = SSG.ITEMS[name];
      if (!def || def.type !== 'consumable' || countItem(name) <= 0) return false;
      const h = S().hero;
      removeItem(name, 1);
      if (def.heal) h.hp = Math.min(h.maxHp, h.hp + def.heal);
      if (def.mana) h.mp = Math.min(heroStats().maxMp, h.mp + def.mana);
      if (def.friendship) h.friendship = Math.min(100, h.friendship + def.friendship);
      ctx.sfx('reward'); ctx.showToast(`Used ${name}.`); ctx.save();
      return true;
    }

    /* ---------------- quests ---------------- */
    function currentQuest() {
      const id = S().quest?.id;
      return SSG.MAIN_QUESTS.find(q => q.id === id) || SSG.MAIN_QUESTS[0];
    }
    function setQuest(q) {
      S().quest = {id: q.id, title: q.title, objective: q.objective, progress: 0};
    }
    function applyOnDone(done) {
      if (!done) return;
      const st = S();
      if (done.unlock) { st.unlocked[done.unlock] = true; ctx.showToast(`New area unlocked: ${cap(done.unlock)}!`); }
      if (done.party && !st.party.includes(done.party)) st.party.push(done.party);
      if (done.recruit && !st.party.includes(done.recruit)) {
        st.party.push(done.recruit);
        ctx.showToast(`${cap(done.recruit)} joined the party!`);
        ctx.sfx('level_up');
      }
      if (done.gem && !st.gems.includes(done.gem)) { st.gems.push(done.gem); ctx.stat('gem'); ctx.showToast(`${done.gem} restored! (${st.gems.length}/7)`); }
      if (done.coins) st.hero.coins += done.coins;
      if (done.friendship) st.hero.friendship = Math.min(100, st.hero.friendship + done.friendship);
      Object.entries(done.items || {}).forEach(([item, qty]) => addItem(item, qty));
    }
    function advanceMain(event, payload = {}) {
      const st = S();
      const q = currentQuest();
      const trig = q.trigger || {};
      let done = false;
      if (trig.type === 'talk' && event === 'talk' && payload.npc === trig.npc) done = true;
      if (trig.type === 'defeat' && event === 'defeat' && payload.id === trig.monster) done = true;
      if (trig.type === 'defeatKind' && event === 'defeat' && payload.kind === trig.kind) {
        st.quest.progress = Math.min(trig.count, (st.quest.progress || 0) + 1);
        st.quest.objective = `${q.objective} (${st.quest.progress}/${trig.count})`;
        if (st.quest.progress >= trig.count) done = true;
      }
      if (trig.type === 'claim' && event === 'claim') done = true;
      if (trig.type === 'blueprint' && event === 'blueprint' && payload.id === trig.blueprint) done = true;
      if (trig.type === 'craft' && event === 'craft' && payload.id === trig.recipe) done = true;
      if (trig.type === 'collect' && event === 'deliver' && payload.npc === trig.npc) done = true;
      if (!done) { ctx.save(); return; }
      applyOnDone(q.onDone);
      const idx = SSG.MAIN_QUESTS.indexOf(q);
      const next = SSG.MAIN_QUESTS[Math.min(idx + 1, SSG.MAIN_QUESTS.length - 1)];
      setQuest(next);
      ctx.sfx('ui_confirm');
      ctx.emote('happy');
      ctx.showToast(`Quest: ${next.title}`);
      ctx.save();
    }
    function questDelivery(npcId) {
      // Main-quest item deliveries (collect triggers aimed at an NPC).
      const q = currentQuest();
      const trig = q.trigger || {};
      if (trig.type !== 'collect' || trig.npc !== npcId) return false;
      if (countItem(trig.item) < trig.count) {
        ctx.showDialogue(cap(npcId), [`You still need ${trig.count} × ${trig.item}. You carry ${countItem(trig.item)}.`]);
        return true;
      }
      removeItem(trig.item, trig.count);
      advanceMain('deliver', {npc: npcId});
      return true;
    }
    function sideQuestFor(npcId) {
      return SSG.SIDE_QUESTS.find(sq => {
        if (sq.npc !== npcId) return false;
        const rec = S().sideQuests[sq.id];
        return !rec || (sq.repeatable && rec !== 'active') || rec === 'active';
      });
    }
    function handleSideQuest(npc) {
      const sq = sideQuestFor(npc.id);
      if (!sq) return false;
      const st = S();
      const rec = st.sideQuests[sq.id];
      const ask = sq.ask;
      let fulfilled = false;
      if (ask.item) fulfilled = countItem(ask.item) >= ask.count;
      if (ask.comfort) fulfilled = comfort() >= ask.comfort;
      if (ask.blueprint) fulfilled = (st.homestead.blueprintsBuilt || []).includes(ask.blueprint);
      if (!rec && !fulfilled) {
        st.sideQuests[sq.id] = 'active';
        ctx.showDialogue(npc.name, [sq.lines[0]], npc.char);
        ctx.save();
        return true;
      }
      if (fulfilled) {
        if (ask.item) removeItem(ask.item, ask.count);
        if (sq.reward.coins) st.hero.coins += sq.reward.coins;
        Object.entries(sq.reward.items || {}).forEach(([item, qty]) => addItem(item, qty));
        st.sideQuests[sq.id] = sq.repeatable ? 'done_repeat' : 'done';
        ctx.sfx('reward');
        ctx.showDialogue(npc.name, [sq.lines[1]], npc.char);
        ctx.save();
        return true;
      }
      return false;
    }

    /* ---------------- gathering ---------------- */
    const nodeHits = {}; // transient hit counters per node id
    function nodeActive(node) {
      const until = S().nodeTimers[node.id] || 0;
      return Date.now() >= until;
    }
    function nodesOn(map) { return map.nodes || []; }
    function nodeAt(map, tx, ty) {
      return nodesOn(map).find(n => n.tx === tx && n.ty === ty && nodeActive(n));
    }
    function nearestNode(map, px, py, range = 80) {
      let best = null, bestD = range;
      for (const n of nodesOn(map)) {
        if (!nodeActive(n)) continue;
        const d = Math.hypot(n.tx * T + T / 2 - px, n.ty * T + T / 2 - py);
        if (d < bestD) { best = n; bestD = d; }
      }
      return best;
    }
    function harvest(node) {
      const type = SSG.NODE_TYPES[node.kind];
      if (!type) return;
      nodeHits[node.id] = (nodeHits[node.id] ?? type.hits) - 1;
      ctx.sfx('chop');
      if (nodeHits[node.id] > 0) {
        ctx.fx('•'.repeat(nodeHits[node.id]), {x: node.tx * T + 20, y: node.ty * T, color: '#c9ffc0'});
        ctx.showToast(`${type.name}: ${nodeHits[node.id]} more hit${nodeHits[node.id] > 1 ? 's' : ''}...`);
        return;
      }
      delete nodeHits[node.id];
      S().nodeTimers[node.id] = Date.now() + type.respawn;
      const got = [];
      Object.entries(type.yields).forEach(([item, [min, max]]) => {
        const qty = min + Math.floor(Math.random() * (max - min + 1));
        addItem(item, qty);
        bumpStat('gathered', qty);
        got.push(`+${qty} ${item}`);
      });
      ctx.fx(got.join(' '), {x: node.tx * T, y: node.ty * T, color: '#c9ffc0'});
      ctx.sfx('chest');
      ctx.showToast(`${type.name} harvested: ${got.join(', ')}`);
      ctx.save();
    }

    /* ---------------- crafting ---------------- */
    function stationsBuilt() {
      const set = new Set();
      Object.values(S().homestead.tiles).forEach(pieceId => {
        const piece = SSG.BUILD_PIECES.find(p => p.id === pieceId);
        if (piece?.station) set.add(piece.station);
      });
      return set;
    }
    function recipeAvailable(recipe) { return !recipe.station || stationsBuilt().has(recipe.station); }
    function canCraft(recipe) {
      return recipeAvailable(recipe) && recipe.ins.every(([item, qty]) => countItem(item) >= qty);
    }
    function craft(recipe) {
      if (!canCraft(recipe)) {
        ctx.showToast(recipeAvailable(recipe) ? 'Missing materials.' : `Requires a ${recipe.station} at your homestead.`);
        return false;
      }
      recipe.ins.forEach(([item, qty]) => removeItem(item, qty));
      addItem(recipe.out.item, recipe.out.qty);
      ctx.sfx('reward');
      ctx.showToast(`Crafted ${recipe.out.qty} × ${recipe.out.item}!`);
      advanceMain('craft', {id: recipe.id});
      ctx.save();
      return true;
    }

    /* ---------------- homestead & building ---------------- */
    const build = {cursor: {tx: 18, ty: 10}, cat: 0, idx: 0, removeMode: false, blueprintOpen: false, bpIdx: 0};
    function homestead() { return S().homestead; }
    function claimRect() {
      const lvl = SSG.HOMESTEAD_LEVELS[Math.min(homestead().level, SSG.HOMESTEAD_LEVELS.length) - 1];
      const map = ctx.maps().homestead;
      const x0 = Math.floor((map.w - lvl.w) / 2), y0 = Math.floor((map.h - lvl.h) / 2);
      return {x0, y0, x1: x0 + lvl.w - 1, y1: y0 + lvl.h - 1};
    }
    function inClaim(tx, ty) {
      const r = claimRect();
      return tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;
    }
    function pieceAt(tx, ty) {
      const id = homestead().tiles[`${tx},${ty}`];
      return id ? SSG.BUILD_PIECES.find(p => p.id === id) : null;
    }
    function piecesInCategory(cat) { return SSG.BUILD_PIECES.filter(p => p.cat === cat); }
    function selectedPiece() {
      const list = piecesInCategory(SSG.BUILD_CATEGORIES[build.cat]);
      build.idx = Math.max(0, Math.min(build.idx, list.length - 1));
      return list[build.idx];
    }
    function comfort() {
      let total = 0;
      Object.values(homestead().tiles).forEach(id => {
        const p = SSG.BUILD_PIECES.find(x => x.id === id);
        if (p) total += p.comfort;
      });
      return total;
    }
    function perkActive(id) {
      const perk = SSG.COMFORT_PERKS.find(p => p.id === id);
      return Boolean(perk && homestead().claimed && comfort() >= perk.at);
    }
    function canPlace(tx, ty, piece) {
      const map = ctx.maps().homestead;
      if (!homestead().claimed || !inClaim(tx, ty)) return false;
      if (SSG.SOLID_TILES[map.tileset]?.has(map.tiles[ty][tx])) return false;
      if (homestead().tiles[`${tx},${ty}`]) return false;
      if (map.totem && map.totem.tx === tx && map.totem.ty === ty) return false;
      if (nodeAt(map, tx, ty)) return false;
      const p = S().player;
      if (piece?.solid && Math.floor(p.x / T) === tx && Math.floor(p.y / T) === ty) return false;
      return true;
    }
    function place(tx, ty) {
      const piece = selectedPiece();
      if (!piece) return false;
      if (!canPlace(tx, ty, piece)) { ctx.sfx('menu_open'); ctx.showToast('Cannot build there.'); return false; }
      if (!payCost(piece.cost)) { ctx.showToast(`Need: ${costText(piece.cost)}`); return false; }
      homestead().tiles[`${tx},${ty}`] = piece.id;
      ctx.sfx('build');
      ctx.fx('+' + piece.name, {x: tx * T, y: ty * T, color: '#9be8ff'});
      checkComfortPerks();
      ctx.save();
      return true;
    }
    function removePiece(tx, ty) {
      const key = `${tx},${ty}`;
      const id = homestead().tiles[key];
      if (!id) { ctx.showToast('Nothing to remove here.'); return false; }
      const piece = SSG.BUILD_PIECES.find(p => p.id === id);
      delete homestead().tiles[key];
      delete S().crops[key];
      if (piece) refundCost(piece.cost);
      ctx.sfx('hit');
      ctx.showToast(`${piece ? piece.name : 'Piece'} removed (materials refunded).`);
      ctx.save();
      return true;
    }
    function costText(cost) {
      return Object.entries(cost).map(([item, qty]) => `${qty} ${item}`).join(', ');
    }
    function blueprintCost(bp) {
      const total = {};
      bp.grid.flat().forEach(id => {
        if (!id) return;
        const piece = SSG.BUILD_PIECES.find(p => p.id === id);
        Object.entries(piece.cost).forEach(([item, qty]) => { total[item] = (total[item] || 0) + qty; });
      });
      return total;
    }
    function stampBlueprint(bp, tx, ty) {
      const rows = bp.grid.length, cols = bp.grid[0].length;
      for (let dy = 0; dy < rows; dy++) for (let dx = 0; dx < cols; dx++) {
        if (bp.grid[dy][dx] && !canPlace(tx + dx, ty + dy, SSG.BUILD_PIECES.find(p => p.id === bp.grid[dy][dx]))) {
          ctx.showToast('Blueprint needs a clear claimed area.');
          return false;
        }
      }
      const cost = blueprintCost(bp);
      if (!payCost(cost)) { ctx.showToast(`Blueprint needs: ${costText(cost)}`); return false; }
      for (let dy = 0; dy < rows; dy++) for (let dx = 0; dx < cols; dx++) {
        const id = bp.grid[dy][dx];
        if (id) homestead().tiles[`${tx + dx},${ty + dy}`] = id;
      }
      const hs = homestead();
      hs.blueprintsBuilt = Array.from(new Set([...(hs.blueprintsBuilt || []), bp.id]));
      ctx.stat('blueprint');
      ctx.sfx('level_up');
      ctx.showToast(`${bp.name} built!`);
      advanceMain('blueprint', {id: bp.id});
      checkComfortPerks();
      ctx.save();
      return true;
    }
    function checkComfortPerks() {
      const c = comfort();
      const hs = homestead();
      hs.perksSeen = hs.perksSeen || [];
      SSG.COMFORT_PERKS.forEach(perk => {
        if (c >= perk.at && !hs.perksSeen.includes(perk.id)) {
          hs.perksSeen.push(perk.id);
          ctx.showToast(`Comfort ${perk.at} reached — ${perk.label}!`);
          ctx.sfx('level_up');
        }
      });
    }
    function interactTotem() {
      const st = S();
      const hs = homestead();
      if (!hs.claimed) {
        if (currentQuest().id !== 'homestead_claim' && !st.unlocked.homestead) {
          ctx.showDialogue('Homestead Crystal', ['The crystal sleeps. Earn the land deed from Elder Brightbeard first.']);
          return;
        }
        hs.claimed = true;
        ctx.stat('homestead_claim');
        ctx.sfx('level_up');
        ctx.showDialogue('Homestead Crystal', [
          'The crystal flares with warm light — this land is yours!',
          'Press B to open Build mode. Gather Wood and Stone, then stamp your first blueprint with V.'
        ]);
        advanceMain('claim');
        return;
      }
      // gift chest perk
      if (perkActive('gift') && Date.now() - (hs.lastGiftAt || 0) > 86_400_000) {
        hs.lastGiftAt = Date.now();
        const coins = 40 + comfort();
        st.hero.coins += coins;
        addItem('Berry', 2);
        ctx.sfx('chest');
        ctx.showToast(`Gift chest: +${coins} coins, +2 Berries!`);
        ctx.save();
        return;
      }
      if (currentQuest().id === 'postgame') {
        ctx.showDialogue('Homestead Crystal', [
          `The Seven Gems shine within the crystal. Comfort ${comfort()}. Your legend is complete... or is it?`,
          'Press G at this crystal to begin New Game+ — the story restarts with stronger foes, but you keep your level, gear, friends and entire homestead.'
        ]);
        return;
      }
      const next = SSG.HOMESTEAD_LEVELS[hs.level]; // next level (array is 0-indexed by level-1)
      if (!next) { ctx.showDialogue('Homestead Crystal', [`Comfort ${comfort()}. The whole valley is yours. Build freely!`]); return; }
      if (!hasCost(next.cost)) {
        ctx.showDialogue('Homestead Crystal', [
          `Comfort ${comfort()}. Expand the claim to ${next.w}×${next.h}?`,
          `Offering needed: ${costText(next.cost)}. Return when your pack is ready.`
        ]);
        return;
      }
      payCost(next.cost);
      hs.level += 1;
      ctx.sfx('level_up');
      ctx.showToast(`Claim expanded! Buildable area is now ${next.w}×${next.h}.`);
      ctx.save();
    }
    function restAtBed(tx, ty) {
      const piece = pieceAt(tx, ty);
      if (piece?.station !== 'bed') return false;
      const h = S().hero;
      h.hp = h.maxHp; h.mp = heroStats().maxMp;
      ctx.sfx('reward');
      ctx.showToast('You dream of seven shining gems. HP and MP fully restored!');
      ctx.save();
      return true;
    }

    /* ---------------- gardening ---------------- */
    function cropAt(tx, ty) { return S().crops[`${tx},${ty}`] || null; }
    function cropStage(crop) {
      const def = SSG.CROPS[crop.crop];
      const t = (Date.now() - crop.plantedAt) / def.growMs;
      return t >= 1 ? 2 : (t >= 0.45 ? 1 : 0);
    }
    function interactSoil(tx, ty) {
      const piece = pieceAt(tx, ty);
      if (piece?.station !== 'soil') return false;
      const key = `${tx},${ty}`;
      const crop = S().crops[key];
      if (!crop) {
        const seedName = Object.keys(S().items).find(name => SSG.ITEMS[name]?.type === 'seed' && countItem(name) > 0);
        if (!seedName) { ctx.showToast('No seeds! Craft or buy some (Berry Seed, Flower Seed...).'); return true; }
        removeItem(seedName, 1);
        S().crops[key] = {crop: SSG.ITEMS[seedName].crop, plantedAt: Date.now()};
        ctx.sfx('plant');
        ctx.fx('🌱', {x: tx * T + 20, y: ty * T, color: '#c9ffc0'});
        ctx.showToast(`Planted ${seedName}. Water it with patience!`);
        ctx.save();
        return true;
      }
      const def = SSG.CROPS[crop.crop];
      if (cropStage(crop) < 2) {
        const pct = Math.min(99, Math.floor(((Date.now() - crop.plantedAt) / def.growMs) * 100));
        ctx.showToast(`${def.name} growing... ${pct}%`);
        return true;
      }
      delete S().crops[key];
      def.yields.forEach(([item, qty]) => addItem(item, qty));
      bumpStat('cropsHarvested');
      if (Math.random() < def.seedBack) addItem(def.seed, 1);
      ctx.sfx('chest');
      ctx.showToast(`Harvested ${def.name}: ${def.yields.map(([i, q]) => `+${q} ${i}`).join(', ')}`);
      ctx.save();
      return true;
    }

    /* ---------------- shop ---------------- */
    const shop = {open: false, tab: 'buy', idx: 0};
    function shopPrices() {
      const mult = perkActive('discount') ? 0.85 : 1;
      return SSG.SHOP_STOCK.map(s => ({...s, price: Math.ceil(s.price * mult)}));
    }
    function sellables() {
      return Object.keys(S().items)
        .filter(name => (SSG.ITEMS[name]?.sell || 0) > 0 && countItem(name) > 0)
        .map(name => ({item: name, price: SSG.ITEMS[name].sell, count: countItem(name)}));
    }
    function buy(idx) {
      const entry = shopPrices()[idx];
      if (!entry) return;
      const h = S().hero;
      if (h.coins < entry.price) { ctx.showToast('Not enough coins.'); return; }
      h.coins -= entry.price;
      addItem(entry.item, 1);
      ctx.sfx('coin'); ctx.showToast(`Bought ${entry.item} for ${entry.price} coins.`); ctx.save();
    }
    function sell(idx) {
      const entry = sellables()[idx];
      if (!entry) return;
      removeItem(entry.item, 1);
      S().hero.coins += entry.price;
      ctx.sfx('coin'); ctx.showToast(`Sold ${entry.item} for ${entry.price} coins.`); ctx.save();
    }

    /* ---------------- NPC interaction ---------------- */
    function hasPiece(id) {
      return Object.values(S().homestead.tiles || {}).includes(id);
    }
    function npcVisible(npc) {
      const st = S();
      if (npc.hideWhenParty && st.party.includes(npc.hideWhenParty)) return false;
      if (npc.requiresClaimed && !st.homestead.claimed) return false;
      if (npc.requiresParty && !st.party.includes(npc.requiresParty)) return false;
      if (npc.requiresComfort && comfort() < npc.requiresComfort) return false;
      if (npc.requiresPiece && !hasPiece(npc.requiresPiece)) return false;
      return true;
    }
    function talk(npc) {
      if (npc.shop) { shop.open = true; shop.tab = 'buy'; shop.idx = 0; ctx.setScene('shop'); ctx.sfx('menu_open'); return; }
      if (questDelivery(npc.id)) return;
      const q = currentQuest();
      const lines = SSG.NPC_LINES[npc.id] || ['Hello there!'];
      // Main-story talk triggers take priority over side quests.
      if (q.trigger?.type === 'talk' && q.trigger.npc === npc.id) {
        advanceMain('talk', {npc: npc.id});
        ctx.showDialogue(npc.name, lines, npc.char);
        return;
      }
      if (handleSideQuest(npc)) return;
      ctx.showDialogue(npc.name, lines, npc.char);
    }

    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '); }

    /* ---------------- achievements & stats ---------------- */
    function bumpStat(key, amount = 1) {
      const st = S();
      st.stats = st.stats || {};
      st.stats[key] = (st.stats[key] || 0) + amount;
    }
    function achievementConditions() {
      const st = S();
      const stats = st.stats || {};
      return {
        first_win: (stats.battlesWon || 0) >= 1,
        gem_1: st.gems.length >= 1,
        home_claimed: st.homestead.claimed,
        first_blueprint: (st.homestead.blueprintsBuilt || []).length >= 1,
        castle: (st.homestead.blueprintsBuilt || []).includes('keep'),
        comfort_100: st.homestead.claimed && comfort() >= 100,
        first_crop: (stats.cropsHarvested || 0) >= 1,
        first_fish: (stats.fishCaught || 0) >= 1,
        first_treasure: (stats.treasuresDug || 0) >= 1,
        daily_done: (stats.dailiesDone || 0) >= 1,
        full_party: st.party.length >= 5,
        level_10: st.hero.level >= 10,
        gather_50: (stats.gathered || 0) >= 50,
        xelar_down: Boolean(st.defeatedBosses.xelar_final),
        all_gems: st.gems.length >= 7,
        ng_plus: (st.ngPlus || 0) >= 1
      };
    }
    function checkAchievements() {
      const st = S();
      st.achievements = st.achievements || {};
      const met = achievementConditions();
      SSG.ACHIEVEMENTS.forEach(def => {
        if (met[def.id] && !st.achievements[def.id]) {
          st.achievements[def.id] = Date.now();
          ctx.showToast(`Achievement unlocked: ${def.label}!`);
          ctx.emote('happy');
          ctx.sfx('level_up');
        }
      });
    }

    /* ---------------- fishing ---------------- */
    const fishing = {active: false, pos: 0, dir: 1, speed: 0.9};
    const WATER_TILES = {birthday: new Set([3, 16]), meadow: new Set([5])};
    function nearWater(map, px, py) {
      const waters = WATER_TILES[map.tileset];
      if (!waters) return false;
      const ptx = Math.floor(px / T), pty = Math.floor(py / T);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const tx = ptx + dx, ty = pty + dy;
        if (tx >= 0 && ty >= 0 && tx < map.w && ty < map.h && waters.has(map.tiles[ty][tx])) return true;
      }
      return false;
    }
    function startFishing() {
      fishing.active = true;
      fishing.pos = 0;
      fishing.dir = 1;
      fishing.speed = 0.75 + Math.random() * 0.6;
      ctx.setScene('fishing');
      ctx.sfx('menu_open');
    }
    function updateFishing(dt) {
      if (!fishing.active) return;
      fishing.pos += fishing.dir * fishing.speed * dt / 1000;
      if (fishing.pos > 1) { fishing.pos = 1; fishing.dir = -1; }
      if (fishing.pos < 0) { fishing.pos = 0; fishing.dir = 1; }
    }
    function castFishing() {
      if (!fishing.active) return;
      fishing.active = false;
      ctx.setScene('explore');
      if (fishing.pos >= 0.38 && fishing.pos <= 0.62) {
        const qty = Math.random() < 0.2 ? 2 : 1;
        addItem('Sunfish', qty);
        bumpStat('fishCaught', qty);
        ctx.sfx('chest');
        ctx.fx(`+${qty} Sunfish`, {color: '#9be8ff'});
        ctx.emote('smile');
        ctx.showToast(`Splash! Caught ${qty} Sunfish.`);
      } else {
        ctx.sfx('menu_open');
        ctx.showToast('It got away... watch for the green zone!');
      }
      ctx.save();
    }
    function cancelFishing() {
      fishing.active = false;
      ctx.setScene('explore');
    }

    /* ---------------- daily quest board ---------------- */
    function todayKey() { return new Date().toISOString().slice(0, 10); }
    function dailyRequest() {
      const st = S();
      const today = todayKey();
      if (!st.daily || st.daily.date !== today) {
        let hash = 0;
        for (const c of today) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
        st.daily = {date: today, pick: hash % SSG.DAILY_QUESTS.length, done: false};
      }
      return {...SSG.DAILY_QUESTS[st.daily.pick], done: st.daily.done};
    }
    function interactBoard() {
      const st = S();
      const req = dailyRequest();
      const reward = 40 + st.hero.level * 5;
      if (req.done) {
        ctx.showDialogue('Quest Board', ['Today\'s request is complete. A new one is pinned up every morning!']);
        return;
      }
      if (countItem(req.item) >= req.qty) {
        removeItem(req.item, req.qty);
        st.hero.coins += reward;
        addItem('Crystal Candy', 1);
        st.daily.done = true;
        bumpStat('dailiesDone');
        ctx.sfx('reward');
        ctx.showDialogue('Quest Board', [`Request fulfilled: ${req.qty} × ${req.item}. The villagers leave ${reward} coins and a Crystal Candy. Come back tomorrow!`]);
        ctx.save();
        return;
      }
      ctx.showDialogue('Quest Board', [
        `Today's request: ${req.qty} × ${req.item} (you carry ${countItem(req.item)}).`,
        `Reward: ${reward} coins and a Crystal Candy. Bring the goods and press E on the board!`
      ]);
    }

    /* ---------------- treasure maps ---------------- */
    function useTreasureMap() {
      const st = S();
      if (st.treasure) { ctx.showToast('You already follow a map! Dig up that treasure first.'); return false; }
      if (!removeItem('Treasure Map', 1)) return false;
      const candidates = Object.values(ctx.maps())
        .filter(m => m.digSpots && (m.id === 'village' || st.unlocked[m.id] || m.id === 'meadow'));
      const map = candidates[Math.floor(Math.random() * candidates.length)];
      const [tx, ty] = map.digSpots[Math.floor(Math.random() * map.digSpots.length)];
      st.treasure = {mapId: map.id, tx, ty};
      ctx.sfx('ui_confirm');
      ctx.showToast(`The map points to ${map.name}! Look for the glowing X.`);
      ctx.save();
      return true;
    }
    function digTreasure() {
      const st = S();
      const t = st.treasure;
      if (!t || t.mapId !== st.mapId) return false;
      const p = st.player;
      if (Math.hypot(t.tx * T + 32 - p.x, t.ty * T + 32 - p.y) > 80) return false;
      const coins = 60 + Math.floor(Math.random() * 60);
      st.hero.coins += coins;
      const loot = ['Crystal Shard', 'Ore Chunk', 'Moon Herb', 'Gear Part', 'Berry'][Math.floor(Math.random() * 5)];
      addItem(loot, 2);
      if (Math.random() < 0.15) addItem('Moonfruit Seed', 1);
      st.treasure = null;
      bumpStat('treasuresDug');
      ctx.sfx('chest');
      ctx.fx(`+${coins} coins  +2 ${loot}`, {color: '#ffe98a'});
      ctx.emote('love');
      ctx.showToast(`Treasure dug up: ${coins} coins and 2 × ${loot}!`);
      ctx.save();
      return true;
    }

    /* ---------------- New Game+ ---------------- */
    function startNgPlus() {
      const st = S();
      st.ngPlus = (st.ngPlus || 0) + 1;
      ctx.stat('ngplus');
      st.gems = [];
      st.defeatedBosses = {};
      st.chestsOpened = {};
      st.nodeTimers = {};
      st.sideQuests = {};
      st.treasure = null;
      st.unlocked = {meadow: true, cave: false, petro: false, ruushwood: false, moon: false, ruins: false, tower: false, homestead: true};
      const first = SSG.MAIN_QUESTS[0];
      st.quest = {id: first.id, title: first.title, objective: first.objective, progress: 0};
      st.mapId = 'village';
      st.player.x = 11 * T;
      st.player.y = 10 * T;
      ctx.rebuildMaps();
      ctx.sfx('level_up');
      ctx.showToast(`New Game+ ${st.ngPlus} begins! Enemies +${st.ngPlus * 25}% — your legend continues.`);
      ctx.save();
    }

    return {
      addItem, removeItem, countItem, hasCost, payCost, costText,
      equipBonuses, heroStats, equipItem, useConsumable,
      currentQuest, advanceMain, sideQuestFor, talk, npcVisible,
      nodeActive, nodeAt, nearestNode, harvest, nodeHits,
      stationsBuilt, recipeAvailable, canCraft, craft,
      build, claimRect, inClaim, pieceAt, piecesInCategory, selectedPiece,
      comfort, perkActive, canPlace, place, removePiece,
      blueprintCost, stampBlueprint, interactTotem, restAtBed,
      cropAt, cropStage, interactSoil,
      shop, shopPrices, sellables, buy, sell,
      bumpStat, checkAchievements,
      fishing, nearWater, startFishing, updateFishing, castFishing, cancelFishing,
      dailyRequest, interactBoard,
      useTreasureMap, digTreasure, startNgPlus
    };
  };
})();
