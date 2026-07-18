/* Super Sean 007 — turn-based battle system with party skills, cooldowns,
   equipment-aware stats, tiered enemies and material drops. */
(() => {
  'use strict';
  window.SSG = window.SSG || {};

  SSG.createBattle = (ctx) => {
    const S = () => ctx.state();
    const sys = () => ctx.systems();
    let battle = null;

    const PARTY_SKILLS = {
      dave:     {id:'gadget',  label:'Gadget Zap',    mp:8,  cd:3, desc:'Damage + stuns the enemy for a turn.'},
      petroman: {id:'ironguard', label:'Iron Guard',  mp:0,  cd:4, desc:'Halves damage taken for 2 turns.'},
      ruush:    {id:'arrows',  label:'Twin Arrows',   mp:6,  cd:2, desc:'Two quick strikes.'},
      haraku:   {id:'blessing', label:'Moon Blessing', mp:8, cd:3, desc:'Heals 35% of max HP.'}
    };

    function selectBackground(monster) {
      const map = S().mapId || 'village';
      if (monster.arenaBg) return monster.arenaBg;
      if (monster.final) return 'bg_arena_xelar';
      if (monster.boss) {
        if (monster.kind === 'xelar') return 'bg_darkcastle';
        const arenas = {
          meadow: 'bg_arena_mushroom', cave: 'bg_arena_crystal', petro: 'bg_arena_machine',
          moon: 'bg_arena_moon', ruins: 'bg_arena_volcano', tower: 'bg_arena_xelar',
          ruushwood: 'bg_glowswamp', homestead: 'bg_darkcastle',
          frostpeak: 'bg_winter', sunsand: 'bg_desertruins'
        };
        return arenas[map] || 'bg_village';
      }
      const table = {
        village: 'bg_festival', homestead: 'bg_farm', meadow: 'bg_mushforest',
        cave: 'bg_crystalcave', petro: 'bg_lava', ruushwood: 'bg_glowswamp',
        moon: 'bg_moonshrine', ruins: 'bg_desertruins', tower: 'bg_skyruins',
        frostpeak: 'bg_winter', sunsand: 'bg_beach'
      };
      return table[map] || 'bg_countryside';
    }

    function start(monster) {
      const st = S();
      if (st.defeatedBosses[monster.id] || monster.defeated) return;
      if (monster.requiresDefeated && !st.defeatedBosses[monster.requiresDefeated]) return;
      if (monster.requiresGems && st.gems.length < monster.requiresGems) return;
      const ng = 1 + 0.25 * (st.ngPlus || 0);
      battle = {
        enemy: {
          ...monster,
          hp: Math.floor(monster.hp * ng),
          maxHp: Math.floor(monster.maxHp * ng),
          atk: Math.floor(monster.atk * ng),
          xp: Math.floor(monster.xp * ng),
          coins: Math.floor(monster.coins * ng)
        },
        log: [`${monster.name} appears!${st.ngPlus ? ` (NG+${st.ngPlus})` : ''}`],
        turn: 'player',
        lock: 0,
        guard: false,
        ironGuard: 0,
        stunned: 0,
        poison: 0,
        weakened: 0,
        burn: 0,
        frozen: 0,
        slowed: 0,
        regen: 0,
        inspired: 0,
        enemyGuard: 0,
        phase2: false,
        cooldowns: {},
        buttons: [],
        backgroundKey: selectBackground(monster),
        // Cinematic name-card timer (frames) for boss encounters.
        intro: monster.boss ? (monster.final ? 150 : 100) : 0,
        introFinal: Boolean(monster.final)
      };
      // Well-Fed: a dish eaten in the overworld powers up the battle opening.
      const fed = st.wellFed;
      if (fed && fed.buff) {
        battle[fed.buff] = fed.turns;
        battle.log.unshift(`Well fed! The ${fed.label} kicks in.`);
        st.wellFed = null;
      }
      ctx.setScene('battle');
      ctx.music(monster.boss ? 'boss' : 'battle');
      // Bosses get the cinematic name-card; regular fights get a Battle Start! card.
      if (!monster.boss) ctx.showCard('card_battle_start', 60);
    }

    function commands() {
      const st = S();
      const h = st.hero;
      const list = [
        {id:'attack', label:'Attack'},
        {id:'slash', label:'Crystal Slash · 6MP'},
        {id:'friendship', label:`Friendship Burst ${h.friendship}/40`},
        {id:'item', label:'Use Snack'},
        {id:'guard', label:'Guard'},
        {id:'run', label:'Run'}
      ];
      st.party.filter(c => PARTY_SKILLS[c]).forEach(c => {
        const skill = PARTY_SKILLS[c];
        const cd = battle?.cooldowns[skill.id] || 0;
        list.push({id: skill.id, label: cd > 0 ? `${skill.label} (${cd})` : `${skill.label}${skill.mp ? ' · ' + skill.mp + 'MP' : ''}`});
      });
      return list;
    }

    function dealDamage(amount, source, fxName) {
      const e = battle.enemy;
      if (battle.inspired > 0) amount = Math.floor(amount * 1.25);
      if (battle.frozen > 0) amount = Math.max(1, Math.floor(amount * 0.5));
      if (battle.enemyGuard > 0) {
        amount = Math.max(1, Math.floor(amount * 0.5));
        battle.enemyGuard -= 1;
        battle.log.unshift(`${e.name}'s hardened shell absorbs half the blow!`);
      }
      if (battle.weakened > 0) amount = Math.max(1, Math.floor(amount * 0.75));
      e.hp = Math.max(0, e.hp - amount);
      battle.log.unshift(`${source} for ${amount} damage.`);
      ctx.fx(`-${amount}`, {screen: true, x: 690 + Math.random() * 60, y: 170 + Math.random() * 40, color: '#ffd76a', size: 22, life: 55});
      hitFx(fxName || 'vfx_slash', 'enemy');
      if (e.hp <= 0) hitFx('vfx_explosion', 'enemy', 150);
    }

    // Battle effect sprite: screen-space popup over a combatant.
    const FX_ANCHORS = {enemy: [700, 185], player: [215, 285]};
    function hitFx(img, target, size = 96) {
      const [ax, ay] = FX_ANCHORS[target] || FX_ANCHORS.enemy;
      ctx.fx('', {
        img, screen: true, size,
        x: ax + (Math.random() * 36 - 18),
        y: ay + (Math.random() * 24 - 12),
        vy: -0.12, life: 42
      });
    }

    function healConsumableName() {
      return ['Star Elixir', 'Mushroom Stew', 'Honey Bread', 'Courage Crumble', 'Berry Juice', 'Zest Soda', 'Crystal Candy', 'Moon Tea']
        .find(name => sys().countItem(name) > 0) || null;
    }

    function action(id) {
      if (!battle || battle.turn !== 'player' || battle.lock > 0) return;
      const st = S();
      const h = st.hero;
      const stats = sys().heroStats();
      const e = battle.enemy;
      let acted = true;
      if (id === 'attack') {
        dealDamage(Math.max(3, Math.floor(stats.attack + Math.random() * 8 - 2)), 'Sean attacks');
        ctx.sfx('hit');
      } else if (id === 'slash') {
        if (h.mp < 6) { battle.log.unshift('Not enough MP for Crystal Slash.'); return; }
        h.mp -= 6;
        dealDamage(Math.max(8, Math.floor(stats.attack * 1.8 + h.level * 3 + Math.random() * 12)), 'Crystal Slash shines', 'vfx_crit');
        h.friendship = Math.min(100, h.friendship + 4);
        ctx.sfx('slash');
      } else if (id === 'friendship') {
        if (h.friendship < 40) { battle.log.unshift('Friendship meter needs 40 power.'); return; }
        h.friendship -= 40;
        ctx.showCard('card_crit', 54);
        dealDamage(Math.max(30, Math.floor(stats.attack * 2.7 + h.level * 8)), 'Friendship Burst hits', 'vfx_stars');
        battle.inspired = 3;
        battle.log.unshift('Sean is Inspired — attacks hit 25% harder!');
        ctx.sfx('level_up');
      } else if (id === 'item') {
        const name = healConsumableName();
        if (!name) { battle.log.unshift('No snacks left! Craft food at your kitchen.'); return; }
        sys().useConsumable(name);
        ctx.showCard('card_item', 48);
        battle.log.unshift(`Sean uses ${name}.`);
      } else if (id === 'guard') {
        battle.guard = true;
        h.friendship = Math.min(100, h.friendship + 6);
        battle.log.unshift('Sean guards and builds friendship power.');
        ctx.sfx('menu_open');
      } else if (id === 'run') {
        if (e.boss) { battle.log.unshift('Boss battles cannot be escaped.'); return; }
        battle = null;
        ctx.setScene('explore');
        ctx.music('village');
        ctx.showToast('Escaped safely.');
        return;
      } else if (id === 'gadget') {
        if ((battle.cooldowns.gadget || 0) > 0) { battle.log.unshift('Gadget recharging.'); return; }
        if (h.mp < 8) { battle.log.unshift('Not enough MP for Gadget Zap.'); return; }
        h.mp -= 8;
        battle.cooldowns.gadget = 3;
        battle.stunned = 1;
        dealDamage(Math.max(10, Math.floor(stats.attack * 1.4 + Math.random() * 10)), 'Dave\'s Gadget Zap crackles', 'vfx_zap');
        battle.log.unshift(`${e.name} is stunned!`);
        ctx.sfx('slash');
      } else if (id === 'ironguard') {
        if ((battle.cooldowns.ironguard || 0) > 0) { battle.log.unshift('Iron Guard recharging.'); return; }
        battle.cooldowns.ironguard = 4;
        battle.ironGuard = 2;
        battle.log.unshift('Petroman plants his shield — damage halved for 2 turns.');
        hitFx('vfx_shield', 'player', 110);
        ctx.sfx('menu_open');
      } else if (id === 'arrows') {
        if ((battle.cooldowns.arrows || 0) > 0) { battle.log.unshift('Ruush is repositioning.'); return; }
        if (h.mp < 6) { battle.log.unshift('Not enough MP for Twin Arrows.'); return; }
        h.mp -= 6;
        battle.cooldowns.arrows = 2;
        dealDamage(Math.max(6, Math.floor(stats.attack * 0.9 + Math.random() * 6)), 'Ruush\'s first arrow strikes', 'vfx_arrows');
        if (battle.enemy.hp > 0) dealDamage(Math.max(6, Math.floor(stats.attack * 0.9 + Math.random() * 6)), 'The second arrow strikes', 'vfx_arrows');
        ctx.sfx('slash');
      } else if (id === 'blessing') {
        if ((battle.cooldowns.blessing || 0) > 0) { battle.log.unshift('Moon Blessing recharging.'); return; }
        if (h.mp < 8) { battle.log.unshift('Not enough MP for Moon Blessing.'); return; }
        h.mp -= 8;
        battle.cooldowns.blessing = 3;
        const heal = Math.floor(h.maxHp * 0.35);
        h.hp = Math.min(h.maxHp, h.hp + heal);
        battle.regen = 2;
        battle.log.unshift(`Haraku's Moon Blessing restores ${heal} HP and grants Regen (2 turns).`);
        hitFx('vfx_heal', 'player', 120);
        hitFx('vfx_nature', 'player', 90);
        ctx.sfx('reward');
      } else {
        acted = false;
      }
      if (!acted) return;
      if (battle.enemy.hp <= 0) return win();
      battle.turn = 'enemy';
      battle.lock = 45;
    }

    function enemyTurn() {
      if (!battle) return;
      const e = battle.enemy;
      const h = S().hero;
      const stats = sys().heroStats();
      // Soaked: party skill cooldowns don't recover this turn.
      if (battle.slowed > 0) battle.slowed -= 1;
      else Object.keys(battle.cooldowns).forEach(k => { battle.cooldowns[k] = Math.max(0, battle.cooldowns[k] - 1); });
      if (battle.weakened > 0) battle.weakened -= 1;
      if (battle.frozen > 0) battle.frozen -= 1;
      if (battle.inspired > 0) battle.inspired -= 1;
      if (battle.regen > 0) {
        battle.regen -= 1;
        const heal = Math.max(5, Math.floor(h.maxHp * 0.06));
        h.hp = Math.min(h.maxHp, h.hp + heal);
        battle.log.unshift(`Regen mends Sean for ${heal} HP.`);
        hitFx('vfx_nature', 'player', 70);
      }
      if (battle.poison > 0) {
        battle.poison -= 1;
        const tick = Math.max(4, Math.floor(h.maxHp * 0.04));
        h.hp = Math.max(1, h.hp - tick);
        battle.log.unshift(`Spores sting Sean for ${tick} poison damage (${battle.poison} turns left).`);
      }
      if (battle.burn > 0) {
        battle.burn -= 1;
        const tick = Math.max(5, Math.floor(h.maxHp * 0.05));
        h.hp = Math.max(1, h.hp - tick);
        battle.log.unshift(`Flames sear Sean for ${tick} burn damage (${battle.burn} turns left).`);
        hitFx('vfx_fire', 'player', 80);
      }
      if (battle.stunned > 0) {
        battle.stunned -= 1;
        battle.log.unshift(`${e.name} is stunned and loses a turn!`);
        battle.turn = 'player';
        return;
      }
      // Boss phase two: at half HP, Xelar-kind bosses rally once.
      if (e.boss && e.kind === 'xelar' && !battle.phase2 && e.hp <= e.maxHp / 2) {
        battle.phase2 = true;
        e.atk = Math.floor(e.atk * 1.3);
        e.hp = Math.min(e.maxHp, e.hp + Math.floor(e.maxHp * 0.15));
        battle.log.unshift(`${e.name} gleams with true bald power — stronger and partly restored!`);
        hitFx('vfx_spirit', 'enemy', 210);
        ctx.sfx('portal');
        battle.turn = 'player';
        return;
      }
      // Elemental abilities (fire burns, ice freezes, water soaks).
      if (e.element === 'fire' && battle.burn === 0 && Math.random() < 0.25) {
        battle.burn = 3;
        battle.log.unshift(`${e.name} breathes fire — Sean is burning!`);
        hitFx('vfx_fire', 'player', 110);
        ctx.sfx('hit');
        battle.turn = 'player';
        return;
      }
      if (e.element === 'ice' && battle.frozen === 0 && Math.random() < 0.22) {
        battle.frozen = 2;
        battle.log.unshift(`${e.name} exhales frost — Sean's attacks are halved for 2 turns!`);
        hitFx('vfx_ice', 'player', 110);
        ctx.sfx('menu_open');
        battle.turn = 'player';
        return;
      }
      if (e.element === 'water' && battle.slowed === 0 && Math.random() < 0.25) {
        battle.slowed = 2;
        const splash = Math.max(3, Math.floor(e.atk * 0.4));
        h.hp = Math.max(1, h.hp - splash);
        battle.log.unshift(`${e.name} crashes a wave — ${splash} damage and skills recover slower!`);
        hitFx('vfx_water', 'player', 110);
        ctx.sfx('hit');
        battle.turn = 'player';
        return;
      }
      // Species abilities.
      if (e.kind === 'mushroom' && Math.random() < 0.25) {
        battle.poison = 3;
        battle.log.unshift(`${e.name} bursts with toxic spores — Sean is poisoned!`);
        hitFx('vfx_poison', 'player');
        ctx.sfx('menu_open');
        battle.turn = 'player';
        return;
      }
      if (e.kind === 'bat' && Math.random() < 0.25) {
        battle.weakened = 2;
        battle.log.unshift(`${e.name} screeches — Sean's attack drops for 2 turns!`);
        hitFx('vfx_daze', 'player');
        ctx.sfx('menu_open');
        battle.turn = 'player';
        return;
      }
      if (e.kind === 'crystal' && Math.random() < 0.25 && battle.enemyGuard === 0) {
        battle.enemyGuard = 2;
        battle.log.unshift(`${e.name} hardens — your next 2 hits are halved!`);
        hitFx('vfx_ice', 'enemy');
        ctx.sfx('menu_open');
        battle.turn = 'player';
        return;
      }
      let dmg = Math.max(1, Math.floor(e.atk - stats.defense * 0.45 + Math.random() * 6));
      if (e.kind === 'xelar' && Math.random() < 0.25) {
        dmg = Math.floor(dmg * 1.6);
        battle.log.unshift(`${e.name} channels bald lightning!`);
      }
      if (battle.guard) { dmg = Math.floor(dmg * 0.45); battle.guard = false; }
      if (battle.ironGuard > 0) { dmg = Math.floor(dmg * 0.5); battle.ironGuard -= 1; }
      h.hp = Math.max(0, h.hp - dmg);
      battle.log.unshift(`${e.name} hits for ${dmg} damage.`);
      ctx.fx(`-${dmg}`, {screen: true, x: 180 + Math.random() * 50, y: 230 + Math.random() * 30, color: '#ff8ba0', size: 20, life: 55});
      const strikeFx = e.element === 'water' ? 'vfx_water'
        : e.element === 'fire' ? 'vfx_fire'
        : e.kind === 'xelar' ? 'vfx_zap' : 'vfx_claw';
      hitFx(strikeFx, 'player');
      ctx.sfx('hit');
      battle.turn = h.hp <= 0 ? 'defeat' : 'player';
      if (battle.turn === 'defeat') battle.log.unshift('Sean falls! Choose: reward revive or return home.');
    }

    function rollDrops(kind) {
      const drops = SSG.MONSTER_DROPS[kind] || [];
      const got = [];
      drops.forEach(([item, chance]) => {
        if (Math.random() < chance) { sys().addItem(item, 1); got.push(item); }
      });
      return got;
    }

    function win() {
      const st = S();
      const e = battle.enemy;
      const h = st.hero;
      const xpMult = sys().perkActive('xp') ? 1.1 : 1;
      h.xp += Math.floor(e.xp * xpMult);
      h.coins += e.coins;
      // Spoils popup with a coin icon tiered by the payout size.
      const coinIcon = e.coins >= 60 ? 'icon_coin_gold' : e.coins >= 25 ? 'icon_coin_silver' : 'icon_coin_bronze';
      ctx.fx('', {img: coinIcon, screen: true, x: 480, y: 240, size: 40, vy: -0.35, life: 70});
      ctx.fx(`+${e.coins} coins`, {screen: true, x: 452, y: 292, color: '#ffe98a', size: 18, life: 70});
      h.friendship = Math.min(100, h.friendship + (e.boss ? 18 : 6));
      let leveled = false;
      while (h.xp >= h.xpNext) {
        h.xp -= h.xpNext;
        h.level += 1;
        h.xpNext = Math.floor(h.xpNext * 1.35 + 15);
        h.maxHp += 18; h.maxMp += 5; h.attack += 3; h.defense += 2;
        h.hp = h.maxHp; h.mp = sys().heroStats().maxMp;
        leveled = true;
        ctx.sfx('level_up');
        ctx.showToast(`Level up! Sean reached level ${h.level}.`);
      }
      // A level-up card trumps the victory card (more exciting); else Victory.
      ctx.showCard(leveled ? 'card_levelup' : 'card_victory', leveled ? 96 : 84);
      sys().bumpStat('battlesWon');
      ctx.stat('battle_win');
      if (e.boss) ctx.stat('boss_win');
      // Bestiary: record the foe (keyed by its art so each look is one entry).
      st.bestiary = st.bestiary || {};
      const bKey = e.sprite || e.kind;
      const known = st.bestiary[bKey];
      st.bestiary[bKey] = {name: e.name, n: (known?.n || 0) + 1};
      if (!known) {
        const found = Object.keys(st.bestiary).length;
        [[10, 150, 'Crystal Candy'], [25, 400, 'Ancient Relic'], [40, 900, 'Gemkin Crown']].forEach(([goal, coins, item]) => {
          const flag = `bestiary${goal}`;
          if (found >= goal && !st.flags[flag]) {
            st.flags[flag] = true;
            st.hero.coins += coins;
            sys().addItem(item, 1);
            ctx.showToast(`Bestiary milestone: ${goal} foes! +${coins} coins and a ${item}.`);
          }
        });
      }
      // Champion's Circuit: rank up and pay the victory purse.
      if (e.arena) {
        st.arena = st.arena || {rank: 0, best: 0};
        st.arena.rank += 1;
        st.arena.best = Math.max(st.arena.best, st.arena.rank);
        const purse = 20 + st.arena.rank * 10;
        h.coins += purse;
        ctx.showToast(`Champion's Circuit — Rank ${st.arena.rank}! Victory purse: ${purse} coins.`);
      }
      const drops = rollDrops(e.kind);
      if (e.id === 'gemkin_avatar') {
        sys().addItem('Gemkin Crown', 1);
        drops.push('Gemkin Crown');
      }
      if (drops.length) ctx.showToast(`Spoils: ${drops.join(', ')}!`);
      const map = ctx.currentMap();
      const monster = map.monsters.find(mo => mo.id === e.id);
      if (monster) monster.defeated = true;
      if (e.boss) st.defeatedBosses[e.id] = true;
      // Defeating a gatekeeper boss opens the next postgame region.
      if (e.unlocks && !st.unlocked[e.unlocks]) {
        st.unlocked[e.unlocks] = true;
        const region = ctx.maps()[e.unlocks];
        ctx.showToast(`New region unlocked: ${region ? region.name : e.unlocks}!`);
      }
      sys().advanceMain('defeat', {id: e.id, kind: e.kind});
      ctx.music('victory');
      setTimeout(() => ctx.music('village'), 2400);
      const wasBoss = e.boss;
      battle = null;
      ctx.setScene('explore');
      ctx.save();
      if (wasBoss && ctx.interstitial) setTimeout(() => ctx.interstitial('boss_victory'), 900);
    }

    function reviveOrReturn(useAd) {
      const st = S();
      if (useAd) {
        ctx.adRevive(() => {
          st.hero.hp = Math.floor(st.hero.maxHp * 0.6);
          st.hero.mp = Math.floor(sys().heroStats().maxMp * 0.4);
          ctx.sfx('reward');
          if (battle) { battle.turn = 'player'; battle.log.unshift('Reward revive complete. Sean stands up!'); }
        });
      } else {
        st.hero.hp = st.hero.maxHp;
        st.hero.mp = sys().heroStats().maxMp;
        st.mapId = 'village';
        st.player.x = 11 * SSG.TILE; st.player.y = 10 * SSG.TILE;
        ctx.sfx('portal');
        ctx.music('village');
        battle = null;
        ctx.setScene('explore');
        ctx.save();
      }
    }

    function update() {
      if (battle && battle.intro > 0) battle.intro -= 1;
      if (battle && battle.lock > 0) {
        battle.lock -= 1;
        if (battle.lock === 0 && battle.turn === 'enemy') enemyTurn();
      }
    }

    return {
      start, action, update, reviveOrReturn, commands,
      get current() { return battle; }
    };
  };
})();
