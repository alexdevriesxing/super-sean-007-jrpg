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
      if (monster.final) return 'bg_sky';
      if (monster.boss && monster.kind === 'xelar') return 'bg_winter';
      if (monster.boss && map === 'cave') return 'bg_mountain';
      if (monster.boss) return 'bg_village';
      const table = {
        village: 'bg_village', homestead: 'bg_farm', meadow: 'bg_meadow',
        cave: 'bg_mountain', petro: 'bg_autumn', ruushwood: 'bg_river',
        moon: 'bg_winter', ruins: 'bg_sky', tower: 'bg_sky'
      };
      return table[map] || 'bg_countryside';
    }

    function start(monster) {
      const st = S();
      if (st.defeatedBosses[monster.id] || monster.defeated) return;
      if (monster.requiresDefeated && !st.defeatedBosses[monster.requiresDefeated]) return;
      battle = {
        enemy: {...monster},
        log: [`${monster.name} appears!`],
        turn: 'player',
        lock: 0,
        guard: false,
        ironGuard: 0,
        stunned: 0,
        cooldowns: {},
        buttons: [],
        backgroundKey: selectBackground(monster)
      };
      ctx.setScene('battle');
      ctx.music(monster.boss ? 'boss' : 'battle');
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

    function dealDamage(amount, source) {
      const e = battle.enemy;
      e.hp = Math.max(0, e.hp - amount);
      battle.log.unshift(`${source} for ${amount} damage.`);
      ctx.fx(`-${amount}`, {screen: true, x: 690 + Math.random() * 60, y: 170 + Math.random() * 40, color: '#ffd76a', size: 22, life: 55});
    }

    function healConsumableName() {
      return ['Mushroom Stew', 'Courage Crumble', 'Berry Juice', 'Crystal Candy', 'Moon Tea']
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
        dealDamage(Math.max(8, Math.floor(stats.attack * 1.8 + h.level * 3 + Math.random() * 12)), 'Crystal Slash shines');
        h.friendship = Math.min(100, h.friendship + 4);
        ctx.sfx('slash');
      } else if (id === 'friendship') {
        if (h.friendship < 40) { battle.log.unshift('Friendship meter needs 40 power.'); return; }
        h.friendship -= 40;
        dealDamage(Math.max(30, Math.floor(stats.attack * 2.7 + h.level * 8)), 'Friendship Burst hits');
        ctx.sfx('level_up');
      } else if (id === 'item') {
        const name = healConsumableName();
        if (!name) { battle.log.unshift('No snacks left! Craft food at your kitchen.'); return; }
        sys().useConsumable(name);
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
        dealDamage(Math.max(10, Math.floor(stats.attack * 1.4 + Math.random() * 10)), 'Dave\'s Gadget Zap crackles');
        battle.log.unshift(`${e.name} is stunned!`);
        ctx.sfx('slash');
      } else if (id === 'ironguard') {
        if ((battle.cooldowns.ironguard || 0) > 0) { battle.log.unshift('Iron Guard recharging.'); return; }
        battle.cooldowns.ironguard = 4;
        battle.ironGuard = 2;
        battle.log.unshift('Petroman plants his shield — damage halved for 2 turns.');
        ctx.sfx('menu_open');
      } else if (id === 'arrows') {
        if ((battle.cooldowns.arrows || 0) > 0) { battle.log.unshift('Ruush is repositioning.'); return; }
        if (h.mp < 6) { battle.log.unshift('Not enough MP for Twin Arrows.'); return; }
        h.mp -= 6;
        battle.cooldowns.arrows = 2;
        dealDamage(Math.max(6, Math.floor(stats.attack * 0.9 + Math.random() * 6)), 'Ruush\'s first arrow strikes');
        if (battle.enemy.hp > 0) dealDamage(Math.max(6, Math.floor(stats.attack * 0.9 + Math.random() * 6)), 'The second arrow strikes');
        ctx.sfx('slash');
      } else if (id === 'blessing') {
        if ((battle.cooldowns.blessing || 0) > 0) { battle.log.unshift('Moon Blessing recharging.'); return; }
        if (h.mp < 8) { battle.log.unshift('Not enough MP for Moon Blessing.'); return; }
        h.mp -= 8;
        battle.cooldowns.blessing = 3;
        const heal = Math.floor(h.maxHp * 0.35);
        h.hp = Math.min(h.maxHp, h.hp + heal);
        battle.log.unshift(`Haraku's Moon Blessing restores ${heal} HP.`);
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
      Object.keys(battle.cooldowns).forEach(k => { battle.cooldowns[k] = Math.max(0, battle.cooldowns[k] - 1); });
      if (battle.stunned > 0) {
        battle.stunned -= 1;
        battle.log.unshift(`${e.name} is stunned and loses a turn!`);
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
      h.friendship = Math.min(100, h.friendship + (e.boss ? 18 : 6));
      while (h.xp >= h.xpNext) {
        h.xp -= h.xpNext;
        h.level += 1;
        h.xpNext = Math.floor(h.xpNext * 1.35 + 15);
        h.maxHp += 18; h.maxMp += 5; h.attack += 3; h.defense += 2;
        h.hp = h.maxHp; h.mp = sys().heroStats().maxMp;
        ctx.sfx('level_up');
        ctx.showToast(`Level up! Sean reached level ${h.level}.`);
      }
      const drops = rollDrops(e.kind);
      if (drops.length) ctx.showToast(`Spoils: ${drops.join(', ')}!`);
      const map = ctx.currentMap();
      const monster = map.monsters.find(mo => mo.id === e.id);
      if (monster) monster.defeated = true;
      if (e.boss) st.defeatedBosses[e.id] = true;
      sys().advanceMain('defeat', {id: e.id, kind: e.kind});
      ctx.music('victory');
      setTimeout(() => ctx.music('village'), 2400);
      battle = null;
      ctx.setScene('explore');
      ctx.save();
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
