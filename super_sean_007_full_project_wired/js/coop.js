/* Super Sean 007 — Party Link co-op. The host runs the world; friends join via a
   6-letter code (WebRTC data channels, signaled through /api/party) and control
   party members: walking, harvesting and their battle skill. Host progress is
   the shared save. */
(() => {
  'use strict';
  window.SSG = window.SSG || {};

  const SKILL_BY_CHAR = {dave: 'gadget', petroman: 'ironguard', ruush: 'arrows', haraku: 'blessing'};
  const SKILL_LABELS = {gadget: 'Gadget Zap', ironguard: 'Iron Guard', arrows: 'Twin Arrows', blessing: 'Moon Blessing'};
  const RTC_CONFIG = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]};
  const SPEED = 3.1;

  SSG.createCoop = (ctx) => {
    const T = SSG.TILE;
    const S = () => ctx.state();

    const coop = {
      mode: null,          // null | 'host' | 'guest'
      code: '',
      status: 'idle',
      guests: {},          // host: slot -> {pc, dc, char, name, actor, handled}
      myChar: null,        // guest: assigned character
      remote: null,        // guest: latest world snapshot
      smoothed: {},        // guest: eased render positions
      lastSnapshotAt: 0,
      error: ''
    };
    let pollTimer = null;
    let broadcastAt = 0;
    let guestConn = null;  // guest: {pc, dc}
    let guestInputAt = 0;
    let pendingInteract = false;

    function makeCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const bytes = new Uint8Array(6);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, b => chars[b % chars.length]).join('');
    }
    async function waitIce(pc) {
      if (pc.iceGatheringState === 'complete') return;
      await new Promise(resolve => {
        const check = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', check); resolve(); } };
        pc.addEventListener('icegatheringstatechange', check);
        setTimeout(resolve, 3500);
      });
    }
    async function api(path, body) {
      const response = await fetch(`/api/party?${path}`, body
        ? {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)}
        : undefined);
      if (!response.ok) throw new Error(`party api ${response.status}`);
      return response.json();
    }
    function send(dc, message) {
      if (dc && dc.readyState === 'open') {
        try { dc.send(JSON.stringify(message)); } catch (e) {}
      }
    }

    /* ---------------- host ---------------- */
    function freeChar() {
      const taken = new Set(Object.values(coop.guests).map(g => g.char));
      const pool = ['dave', 'petroman', 'ruush', 'haraku']
        .filter(c => S().party.includes(c) || c === 'dave');
      return pool.find(c => !taken.has(c)) || null;
    }
    async function hostStart() {
      if (coop.mode) leave();
      coop.mode = 'host';
      coop.code = makeCode();
      coop.status = 'waiting';
      coop.error = '';
      pollTimer = setInterval(pollOffers, 2500);
      ctx.showToast(`Party open! Share code ${coop.code} with friends.`);
    }
    async function pollOffers() {
      if (coop.mode !== 'host') return;
      try {
        const {offers} = await api(`code=${coop.code}&action=offers`);
        for (const [slot, offer] of Object.entries(offers || {})) {
          if (coop.guests[slot]) continue;
          answerGuest(slot, offer);
        }
      } catch (e) {
        coop.status = 'signal-error';
      }
    }
    async function answerGuest(slot, offer) {
      const char = freeChar();
      if (!char) return;
      const pc = new RTCPeerConnection(RTC_CONFIG);
      const guest = {pc, dc: null, char, name: offer.name || 'Friend', actor: null};
      coop.guests[slot] = guest;
      pc.ondatachannel = event => {
        guest.dc = event.channel;
        wireHostChannel(slot, guest);
      };
      try {
        await pc.setRemoteDescription({type: 'offer', sdp: offer.sdp});
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitIce(pc);
        await api(`code=${coop.code}&action=answer&slot=${slot}`, {sdp: pc.localDescription.sdp, char});
      } catch (e) {
        delete coop.guests[slot];
      }
    }
    function wireHostChannel(slot, guest) {
      const dc = guest.dc;
      dc.onopen = () => {
        coop.status = 'playing';
        const p = S().player;
        guest.actor = {x: p.x + 40, y: p.y + 40, dir: 'down', frame: 0, input: {dx: 0, dy: 0}};
        send(dc, {t: 'welcome', char: guest.char, name: guest.name});
        ctx.showToast(`${guest.name} joined as ${guest.char[0].toUpperCase()}${guest.char.slice(1)}!`);
        ctx.sfx('level_up');
      };
      dc.onclose = () => {
        ctx.showToast(`${guest.name} left the party.`);
        delete coop.guests[slot];
      };
      dc.onmessage = event => {
        let msg;
        try { msg = JSON.parse(event.data); } catch (e) { return; }
        if (msg.t === 'input' && guest.actor) {
          guest.actor.input = {dx: Number(msg.dx) || 0, dy: Number(msg.dy) || 0};
          if (msg.interact) guest.pendingInteract = true;
        }
        if (msg.t === 'battleAction') {
          const battle = ctx.battleApi().current;
          const skill = SKILL_BY_CHAR[guest.char];
          if (battle && battle.turn === 'player' && msg.id === skill) ctx.battleApi().action(skill);
        }
      };
    }
    function hostUpdate(dt) {
      const st = S();
      const scale = dt / 16.67;
      Object.values(coop.guests).forEach(guest => {
        const a = guest.actor;
        if (!a) return;
        let {dx, dy} = a.input;
        const len = Math.hypot(dx, dy);
        if (len > 0) {
          dx /= len; dy /= len;
          const nx = a.x + dx * SPEED * scale;
          const ny = a.y + dy * SPEED * scale;
          if (ctx.canMoveTo(nx, a.y)) a.x = nx;
          if (ctx.canMoveTo(a.x, ny)) a.y = ny;
          a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
          a.frame = (a.frame + dt / 140) % 4;
        } else {
          a.frame = 0;
        }
        if (guest.pendingInteract) {
          guest.pendingInteract = false;
          const node = ctx.systems().nearestNode(ctx.currentMap(), a.x, a.y, 80);
          if (node) ctx.systems().harvest(node);
        }
      });
      const now = performance.now();
      if (now - broadcastAt >= 100) {
        broadcastAt = now;
        broadcastState();
      }
    }
    function broadcastState() {
      const st = S();
      const m = ctx.currentMap();
      const battle = ctx.battleApi().current;
      const snapshot = {
        t: 'state',
        mapId: st.mapId,
        scene: st.scene,
        sean: {x: Math.round(st.player.x), y: Math.round(st.player.y), frame: st.player.frame},
        actors: Object.fromEntries(Object.values(coop.guests)
          .filter(g => g.actor)
          .map(g => [g.char, {x: Math.round(g.actor.x), y: Math.round(g.actor.y), frame: Math.floor(g.actor.frame), name: g.name}])),
        hero: {hp: st.hero.hp, maxHp: st.hero.maxHp, mp: st.hero.mp, level: st.hero.level, coins: st.hero.coins},
        nodesInactive: (m.nodes || []).filter(n => !ctx.systems().nodeActive(n)).map(n => n.id),
        monsters: m.monsters
          .filter(mo => !mo.defeated && !st.defeatedBosses[mo.id] &&
            (!mo.requiresDefeated || st.defeatedBosses[mo.requiresDefeated]) &&
            (!mo.requiresGems || st.gems.length >= mo.requiresGems))
          .map(mo => ({id: mo.id, name: mo.name, kind: mo.kind, hue: mo.hue || 0, boss: Boolean(mo.boss), x: Math.round(mo.x), y: Math.round(mo.y)})),
        battle: battle ? {
          enemy: {name: battle.enemy.name, hp: battle.enemy.hp, maxHp: battle.enemy.maxHp, kind: battle.enemy.kind, hue: battle.enemy.hue || 0, boss: Boolean(battle.enemy.boss)},
          turn: battle.turn,
          log: battle.log.slice(0, 4),
          bg: battle.backgroundKey
        } : null,
        toast: ctx.toastTimer() > 0 ? ctx.toast() : null
      };
      Object.values(coop.guests).forEach(g => send(g.dc, snapshot));
    }

    /* ---------------- guest ---------------- */
    async function guestJoin(code, name) {
      if (coop.mode) leave();
      coop.mode = 'guest';
      coop.code = code;
      coop.status = 'connecting';
      coop.error = '';
      try {
        const pc = new RTCPeerConnection(RTC_CONFIG);
        const dc = pc.createDataChannel('game');
        guestConn = {pc, dc};
        wireGuestChannel(dc);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitIce(pc);
        const {slot} = await api(`code=${code}&action=offer`, {sdp: pc.localDescription.sdp, name});
        for (let i = 0; i < 40; i++) {
          await new Promise(r => setTimeout(r, 2000));
          try {
            const answer = await api(`code=${code}&action=answer&slot=${slot}`);
            await pc.setRemoteDescription({type: 'answer', sdp: answer.sdp});
            return;
          } catch (e) { /* not ready yet */ }
        }
        throw new Error('host did not answer');
      } catch (e) {
        coop.error = 'Could not join — check the code and that the host keeps the party open.';
        coop.status = 'error';
        coop.mode = null;
      }
    }
    function wireGuestChannel(dc) {
      dc.onopen = () => {
        coop.status = 'playing';
        send(dc, {t: 'hello'});
        ctx.setScene('coopGuest');
        ctx.sfx('level_up');
      };
      dc.onclose = () => {
        if (coop.mode === 'guest') {
          coop.error = 'The host closed the party.';
          leave();
        }
      };
      dc.onmessage = event => {
        let msg;
        try { msg = JSON.parse(event.data); } catch (e) { return; }
        if (msg.t === 'welcome') { coop.myChar = msg.char; ctx.setScene('coopGuest'); }
        if (msg.t === 'state') { coop.remote = msg; coop.lastSnapshotAt = performance.now(); }
      };
    }
    function guestUpdate(dt) {
      if (!guestConn || guestConn.dc.readyState !== 'open') return;
      const now = performance.now();
      if (now - guestInputAt >= 90) {
        guestInputAt = now;
        const {dx, dy} = ctx.inputDir();
        send(guestConn.dc, {t: 'input', dx, dy, interact: pendingInteract});
        pendingInteract = false;
      }
      // Ease displayed positions toward the latest snapshot.
      const r = coop.remote;
      if (r) {
        const targets = {sean: r.sean, ...r.actors};
        Object.entries(targets).forEach(([id, pos]) => {
          const s = coop.smoothed[id] || (coop.smoothed[id] = {x: pos.x, y: pos.y});
          s.x += (pos.x - s.x) * 0.35;
          s.y += (pos.y - s.y) * 0.35;
        });
      }
    }
    function guestInteract() { pendingInteract = true; }
    function guestBattleAction() {
      const skill = SKILL_BY_CHAR[coop.myChar];
      if (skill && guestConn) send(guestConn.dc, {t: 'battleAction', id: skill});
    }

    function leave() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      Object.values(coop.guests).forEach(g => { try { g.pc.close(); } catch (e) {} });
      coop.guests = {};
      if (guestConn) { try { guestConn.pc.close(); } catch (e) {} guestConn = null; }
      const wasGuest = coop.mode === 'guest';
      coop.mode = null;
      coop.code = '';
      coop.status = 'idle';
      coop.remote = null;
      coop.myChar = null;
      coop.smoothed = {};
      if (wasGuest) ctx.setScene('title');
    }

    function update(dt) {
      if (coop.mode === 'host') hostUpdate(dt);
      if (coop.mode === 'guest') guestUpdate(dt);
    }

    return {
      state: coop,
      hostStart, guestJoin, leave, update,
      guestInteract, guestBattleAction,
      mySkillLabel: () => SKILL_LABELS[SKILL_BY_CHAR[coop.myChar]] || 'Cheer',
      // test hook: wire an already-open data channel pair (loopback QA)
      _test: {wireHostChannel, wireGuestChannel, coop}
    };
  };
})();
