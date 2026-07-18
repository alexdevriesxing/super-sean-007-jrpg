/* Super Sean 007 — canvas renderer for all scenes: world, HUD, battle,
   build mode, crafting, shop, inventory, quest log and world map. */
(() => {
  'use strict';
  window.SSG = window.SSG || {};

  SSG.createRenderer = (ctx) => {
    const g = ctx.g; // CanvasRenderingContext2D
    const {GAME_W, GAME_H} = ctx;
    const T = SSG.TILE;
    const S = () => ctx.state();
    const sys = () => ctx.systems();
    const clickables = [];
    // Party member -> distinct battle ally sprite (friends spritesheet).
    const ALLY_SPRITES = {dave: 'ally_dave', petroman: 'ally_petroman', haraku: 'ally_haraku', ruush: 'ally_ruush'};

    /* ---------- primitives ---------- */
    function panel(x, y, w, h, fill) {
      g.save(); g.fillStyle = fill; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
      g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); g.stroke(); g.restore();
    }
    function bar(x, y, w, h, p, fg, bg) {
      g.fillStyle = bg; g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fill();
      g.fillStyle = fg; g.beginPath(); g.roundRect(x, y, Math.max(4, w * Math.max(0, Math.min(1, p))), h, h / 2); g.fill();
    }
    function wrapText(text, x, y, maxWidth, lineHeight) {
      const words = String(text).split(' ');
      let line = '';
      for (const word of words) {
        const test = line + word + ' ';
        if (g.measureText(test).width > maxWidth && line) { g.fillText(line, x, y); line = word + ' '; y += lineHeight; }
        else line = test;
      }
      g.fillText(line, x, y);
      return y;
    }
    function drawLabel(text, x, y, color) {
      g.save(); g.font = 'bold 13px Nunito, Arial';
      const w = g.measureText(text).width + 12;
      const lx = Math.max(4, Math.min(GAME_W - w - 4, x));
      const ly = Math.max(4, Math.min(GAME_H - 24, y));
      g.fillStyle = 'rgba(13,37,63,.72)'; g.beginPath(); g.roundRect(lx, ly, w, 20, 8); g.fill();
      g.fillStyle = color; g.fillText(text, lx + 6, ly + 14); g.restore();
    }
    function button(x, y, w, h, text, cb, active = true) {
      g.fillStyle = active ? '#ff9c2f' : '#b9c4cf';
      g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill();
      g.strokeStyle = '#0e4f7c'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 13px Nunito, Arial';
      g.fillText(text, x + 10, y + h / 2 + 5);
      if (cb) clickables.push({x, y, w, h, cb});
    }
    function hotspot(x, y, w, h, cb) { clickables.push({x, y, w, h, cb}); }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '); }

    function camera() {
      const m = ctx.currentMap();
      return {
        x: Math.max(0, Math.min(m.w * T - GAME_W, S().player.x - GAME_W / 2)),
        y: Math.max(0, Math.min(m.h * T - GAME_H, S().player.y - GAME_H / 2))
      };
    }

    /* ---------- world ---------- */
    function drawWorld() {
      const m = ctx.currentMap();
      const cam = camera();
      g.fillStyle = '#0e2744'; g.fillRect(0, 0, GAME_W, GAME_H);
      const x0 = Math.floor(cam.x / T), y0 = Math.floor(cam.y / T);
      const x1 = Math.min(m.w, x0 + Math.ceil(GAME_W / T) + 2), y1 = Math.min(m.h, y0 + Math.ceil(GAME_H / T) + 2);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        ctx.drawTile(m.tileset, m.tiles[y][x], x * T - cam.x, y * T - cam.y);
      }
      if (m.id === 'homestead') drawHomesteadOverlays(m, cam);
      // Static scenery billboards (real building art anchored over solid tile blocks).
      for (const prop of m.props || []) {
        drawBillboard(prop.sprite, prop.tx * T - cam.x, prop.ty * T - cam.y, prop.size || 120);
      }
      drawNodes(m, cam);
      for (const portal of m.portals) {
        const x = portal.x - cam.x, y = portal.y - cam.y;
        if (x < -100 || y < -100 || x > GAME_W + 40 || y > GAME_H + 40) continue;
        const locked = portal.locked && !S().unlocked[portal.locked];
        g.save(); g.globalAlpha = .32; g.fillStyle = locked ? '#9c7cff' : '#7cecff';
        g.beginPath(); g.ellipse(x + 32, y + 32, 30, 18, 0, 0, Math.PI * 2); g.fill(); g.restore();
        drawLabel((locked ? '🔒 ' : '') + portal.label, x - 15, y - 10, '#ffffff');
      }
      for (const chest of m.chests) {
        if (S().chestsOpened[chest.id] && !chest.ad) continue;
        const sprite = chest.ad ? 'chest_gold'
          : chest.tier === 'gem' ? 'chest_gem'
          : chest.tier === 'purple' ? 'chest_purple' : 'chest_wood';
        if (!ctx.drawIcon(sprite, chest.x - cam.x + 8, chest.y - cam.y + 12, 48, 48)) {
          ctx.drawTile('birthday', 20, chest.x - cam.x, chest.y - cam.y);
        }
        if (chest.locked) {
          ctx.drawIcon('marker_lock', chest.x - cam.x + 38, chest.y - cam.y + 2, 22, 22);
          drawLabel('Locked', chest.x - cam.x - 4, chest.y - cam.y - 14, '#e8d6ff');
        }
        if (chest.ad) drawLabel('Reward', chest.x - cam.x - 8, chest.y - cam.y - 14, '#fff4a9');
      }
      if (m.board) {
        drawLabel('📌 Quest Board', m.board.tx * T - cam.x - 12, m.board.ty * T - cam.y - 16, '#ffe98a');
      }
      const treasure = S().treasure;
      if (treasure && treasure.mapId === m.id) {
        const x = treasure.tx * T - cam.x + 32, y = treasure.ty * T - cam.y + 32;
        g.save();
        g.globalAlpha = 0.65 + Math.sin(Date.now() / 300) * 0.25;
        g.strokeStyle = '#ff5f5f'; g.lineWidth = 7; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x - 16, y - 16); g.lineTo(x + 16, y + 16);
        g.moveTo(x + 16, y - 16); g.lineTo(x - 16, y + 16);
        g.stroke();
        g.restore();
        drawLabel('Dig here! (E)', x - 40, y - 44, '#ffd9d9');
      }
      for (const npc of m.npcs) {
        if (!sys().npcVisible(npc)) continue;
        // Ambient animals bob and sway gently so the homestead feels alive.
        let ox = 0, oy = 0;
        if (npc.animal) {
          const ph = (npc.x + npc.y) * 0.01;
          oy = Math.sin(Date.now() / 380 + ph) * 4;
          ox = Math.sin(Date.now() / 900 + ph) * 6;
        }
        const spr = npc.sprite && ctx.img[npc.sprite];
        if (spr && spr.complete && spr.naturalWidth) {
          drawSprite(spr, npc.x - cam.x + ox, npc.y - cam.y + oy, npc.animal ? 60 : 72, npc.name);
        } else {
          drawCharacter(npc.char, npc.x - cam.x + ox, npc.y - cam.y + oy, 0, npc.name, npc.hue);
        }
        if (npc.shop) {
          const bob = Math.sin(Date.now() / 340) * 3;
          ctx.drawIcon('marker_shop', npc.x - cam.x + 24, npc.y - cam.y - 52 + bob, 24, 24);
        }
      }
      for (const mon of m.monsters) {
        if (mon.defeated || S().defeatedBosses[mon.id]) continue;
        if (mon.requiresDefeated && !S().defeatedBosses[mon.requiresDefeated]) continue;
        if (mon.requiresGems && S().gems.length < mon.requiresGems) continue;
        drawMonster(mon, cam);
      }
      drawParty(cam);
    }

    // Draw a detailed building sprite bottom-anchored on a tile, taller than one tile.
    function drawBillboard(sprite, tileX, tileY, size = 100) {
      const im = ctx.img[sprite];
      if (!im || !im.complete || !im.naturalWidth) return false;
      g.save();
      g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
      g.drawImage(im, tileX + T / 2 - size / 2, tileY + T - size + 6, size, size);
      g.restore();
      return true;
    }

    function drawHomesteadOverlays(m, cam) {
      const hs = S().homestead;
      // Draw flat tile pieces first, then billboards sorted by y so nearer ones overlap.
      const billboards = [];
      Object.entries(hs.tiles).forEach(([key, pieceId]) => {
        const piece = SSG.BUILD_PIECES.find(p => p.id === pieceId);
        if (!piece) return;
        const [tx, ty] = key.split(',').map(Number);
        if (piece.billboard) { billboards.push({piece, tx, ty}); return; }
        ctx.drawTile(piece.sheet, piece.tile, tx * T - cam.x, ty * T - cam.y);
      });
      billboards.sort((a, b) => a.ty - b.ty).forEach(({piece, tx, ty}) => {
        drawBillboard(piece.sprite, tx * T - cam.x, ty * T - cam.y, piece.bsize || 100);
      });
      Object.entries(S().crops).forEach(([key, crop]) => {
        const [tx, ty] = key.split(',').map(Number);
        const stage = sys().cropStage(crop);
        const def = SSG.CROPS[crop.crop];
        const tile = stage === 0 ? {sheet: 'meadow', tile: 15} : stage === 1 ? {sheet: 'meadow', tile: 11} : def.ripeTile;
        g.save();
        if (stage < 2) g.globalAlpha = 0.9;
        ctx.drawTile(tile.sheet, tile.tile, tx * T - cam.x, ty * T - cam.y);
        g.restore();
        if (stage === 2) drawLabel('Ripe!', tx * T - cam.x + 6, ty * T - cam.y - 14, '#c9ffc0');
      });
      if (m.totem) {
        const x = m.totem.tx * T - cam.x, y = m.totem.ty * T - cam.y;
        g.save(); g.globalAlpha = 0.35 + Math.sin(Date.now() / 400) * 0.12;
        g.fillStyle = '#9be8ff'; g.beginPath(); g.ellipse(x + 32, y + 40, 34, 20, 0, 0, Math.PI * 2); g.fill(); g.restore();
        ctx.drawTile('birthday', 21, x, y);
        drawLabel(hs.claimed ? 'Homestead Crystal' : 'Unclaimed Crystal', x - 20, y - 16, '#d9f6ff');
      }
    }

    function drawNodes(m, cam) {
      for (const node of m.nodes || []) {
        const type = SSG.NODE_TYPES[node.kind];
        const x = node.tx * T - cam.x, y = node.ty * T - cam.y;
        if (x < -T || y < -T || x > GAME_W || y > GAME_H) continue;
        if (sys().nodeActive(node)) {
          ctx.drawTile(type.sheet, type.tile, x, y);
        } else {
          g.save(); g.globalAlpha = 0.22;
          ctx.drawTile(type.sheet, type.tile, x, y);
          g.restore();
        }
      }
    }

    function drawSprite(im, x, y, size = 72, label = '') {
      g.save();
      g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 8; g.shadowOffsetY = 5;
      g.drawImage(im, x - size / 2, y - size + 12, size, size);
      g.restore();
      if (label) drawLabel(label, x - size / 2 - 6, y - size - 4, '#fff');
    }

    function drawCharacter(char, x, y, frame = 0, label = '', hue = 0) {
      g.save();
      g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 8; g.shadowOffsetY = 5;
      if (hue) g.filter = `hue-rotate(${hue}deg)`;
      ctx.drawCharacterFrame(char, frame, x - 34, y - 52, 68, 68);
      g.restore();
      if (label) drawLabel(label, x - 46, y - 62, '#fff');
    }

    function drawMonster(mon, cam) {
      const key = mon.kind === 'xelar' ? 'xelar' : mon.kind;
      // Distinct sliced sprite when assigned; these are pre-coloured so skip the hue tint.
      const custom = mon.sprite && ctx.img[mon.sprite];
      const size = mon.boss ? 84 : 58;
      const x = mon.x - cam.x, y = mon.y - cam.y;
      const im = (custom && custom.naturalWidth ? custom : null) || ctx.img[key] || ctx.img.slime;
      g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 5;
      if (mon.hue && !(custom && custom.naturalWidth)) g.filter = `hue-rotate(${mon.hue}deg)`;
      if (im && im.complete && im.naturalWidth) g.drawImage(im, x - size / 2, y - size / 2, size, size);
      g.restore();
      if (mon.boss) {
        const bob = Math.sin(Date.now() / 320) * 3;
        ctx.drawIcon('marker_battle', x - 11, y - size / 2 - 44 + bob, 22, 22);
      }
      drawLabel(mon.name, x - size / 2, y - size / 2 - 17, mon.boss ? '#ffd76a' : '#fff');
    }

    function drawParty(cam) {
      const p = S().player;
      const coopGuests = ctx.coopApi ? ctx.coopApi().state.guests : {};
      const controlled = {};
      Object.values(coopGuests).forEach(gu => { if (gu.actor) controlled[gu.char] = gu; });
      const companions = S().party.filter(c => c !== 'sean').slice(0, 4);
      let trail = 0;
      companions.forEach(c => {
        const gu = controlled[c];
        if (gu) {
          drawCharacter(c, gu.actor.x - cam.x, gu.actor.y - cam.y, Math.floor(gu.actor.frame), gu.name);
        } else {
          trail += 1;
          drawCharacter(c, p.x - cam.x - 26 * trail, p.y - cam.y + 16 * trail, 0, '');
        }
      });
      const frame = ctx.isMoving() ? (2 + p.frame % 2) : 0;
      // Riding: draw the mount under Sean and lift him into the saddle.
      const mountImg = S().mount && ctx.img[S().mount];
      const riding = mountImg && mountImg.complete && mountImg.naturalWidth;
      if (riding) drawSprite(mountImg, p.x - cam.x, p.y - cam.y + 18, 64);
      drawCharacter('sean', p.x - cam.x, p.y - cam.y - (riding ? 16 : 0), frame, '');
    }

    /* ---------- HUD ---------- */
    function drawHud() {
      const st = S();
      const h = st.hero;
      const stats = sys().heroStats();
      panel(12, 12, 320, 92, 'rgba(255,255,255,.88)');
      g.fillStyle = '#12365a'; g.font = 'bold 17px Nunito, Arial';
      g.fillText(`Super Sean Lv.${h.level}  ·  ⚔${stats.attack} 🛡${stats.defense}`, 26, 36);
      bar(26, 46, 220, 13, h.hp / h.maxHp, '#ff5f7e', '#ffe6ea');
      g.font = '12px Nunito'; g.fillStyle = '#12365a'; g.fillText(`${h.hp}/${h.maxHp} HP`, 252, 57);
      bar(26, 64, 220, 11, h.mp / stats.maxMp, '#41b8ff', '#d8f3ff');
      g.fillText(`${h.mp}/${stats.maxMp} MP`, 252, 74);
      for (let i = 0; i < 5; i++) {
        const filled = h.friendship >= (i + 1) * 20;
        const partial = !filled && h.friendship > i * 20;
        ctx.drawIcon(filled ? 'heart_full' : partial ? 'heart_spark' : 'heart_empty', 26 + i * 19, 76, 16, 16);
      }
      g.fillText('Friendship', 252, 90);
      panel(640, 12, 308, 86, 'rgba(255,255,255,.88)');
      g.fillStyle = '#12365a'; g.font = 'bold 14px Nunito'; g.fillText(st.quest.title, 655, 34);
      g.font = '12px Nunito'; wrapText(st.quest.objective, 655, 52, 278, 15);
      const mapName = ctx.currentMap().name;
      const extra = st.mapId === 'homestead' && st.homestead.claimed ? ` · Comfort ${sys().comfort()}` : '';
      panel(12, 496, 936, 34, 'rgba(12,39,69,.78)');
      g.fillStyle = '#fff'; g.font = '13px Nunito';
      g.fillText(`${mapName} · Coins ${h.coins} · Gems ${st.gems.length}/7${extra}`, 26, 518);
      g.fillText('E interact · C craft · B build · I bag · Q quests · N foes · M map · P save', 545, 518);
      if (ctx.toastTimer() > 0) {
        panel(240, 112, 480, 38, 'rgba(255,255,255,.94)');
        g.fillStyle = '#12365a'; g.font = 'bold 14px Nunito';
        g.fillText(ctx.toast(), 258, 136);
      }
    }

    /* ---------- title & dialogue ---------- */
    function drawTitle() {
      const art = ctx.img.keyArtMain;
      if (art && art.complete && art.naturalWidth) {
        g.drawImage(art, 0, 0, GAME_W, GAME_H);
        g.fillStyle = 'rgba(0,20,46,.22)'; g.fillRect(0, 0, GAME_W, GAME_H);
      } else {
        const grd = g.createLinearGradient(0, 0, 0, GAME_H);
        grd.addColorStop(0, '#183a65'); grd.addColorStop(1, '#13a78f');
        g.fillStyle = grd; g.fillRect(0, 0, GAME_W, GAME_H);
      }
      panel(230, 240, 500, 232, 'rgba(255,255,255,.9)');
      g.textAlign = 'center';
      g.fillStyle = '#12365a'; g.font = '900 40px Nunito, Arial'; g.fillText('SUPER SEAN 007', 480, 284);
      g.fillStyle = '#8b4a16'; g.font = '800 20px Nunito, Arial'; g.fillText('Legend of the Seven Gems — Homestead Update', 480, 314);
      const summary = ctx.saveSummary();
      g.font = '700 14px Nunito';
      g.fillStyle = '#2471a3';
      g.fillText(summary
        ? `Saved hero: Lv.${summary.level} · ${summary.mapName} · ${summary.gems}/7 gems · ${summary.minutes} min played${summary.ngPlus ? ` · NG+${summary.ngPlus}` : ''}`
        : 'No save yet — your legend starts today!', 480, 340);
      g.textAlign = 'start';
      button(292, 356, 180, 38, summary ? 'Continue' : 'Start Adventure', () => ctx.startGame());
      button(492, 356, 180, 38, 'New Game', () => ctx.resetGame());
      button(292, 404, 118, 30, 'Save Code', () => ctx.exportSave());
      button(420, 404, 118, 30, 'Load Code', () => ctx.importSave());
      const cloud = ctx.cloud();
      button(548, 404, 124, 30, `Cloud: ${cloud.enabled ? 'ON' : 'OFF'}`, () => cloud.toggle(), !cloud.enabled);
      if (cloud.enabled && cloud.id) {
        g.font = '11px Nunito'; g.fillStyle = '#41576b';
        g.fillText(`Sync ID: ${cloud.id} (${cloud.status}) — use Load Code on another device`, 292, 452);
      }
      g.font = '15px Nunito'; g.fillStyle = '#ecfbff';
      g.fillText('Explore 9 regions · Gather & craft · Build your homestead · Stop Xelar the Bald Wizard', 200, 505);
    }

    function drawDialogue() {
      drawWorld(); drawHud();
      const d = ctx.dialogue();
      if (!d) return;
      panel(86, 356, 788, 150, 'rgba(255,255,255,.96)');
      const portrait = d.portrait && ctx.img[`portrait_${d.portrait}`];
      let textX = 112;
      if (portrait && portrait.complete && portrait.naturalWidth) {
        g.save();
        g.fillStyle = '#eaf6ff';
        g.beginPath(); g.roundRect(104, 366, 120, 120, 16); g.fill();
        g.beginPath(); g.roundRect(104, 366, 120, 120, 16); g.clip();
        g.drawImage(portrait, 104, 366, 120, 120);
        g.restore();
        g.strokeStyle = '#3fa7dc'; g.lineWidth = 2;
        g.beginPath(); g.roundRect(104, 366, 120, 120, 16); g.stroke();
        textX = 244;
      }
      g.fillStyle = '#12365a'; g.font = 'bold 22px Nunito'; g.fillText(d.speaker, textX, 396);
      g.font = '17px Nunito'; wrapText(d.lines[d.index], textX, 428, 858 - textX, 24);
      g.font = 'bold 13px Nunito'; g.fillStyle = '#2471a3'; g.fillText('Click, Space or Enter to continue', 620, 490);
      hotspot(0, 0, GAME_W, GAME_H, () => ctx.nextDialogue());
    }

    // Row of active status-effect icons; falsy entries are skipped. Right-anchored
    // for the enemy (icons grow leftward), left-anchored for Sean.
    function drawStatusIcons(x, y, list, rightAnchor = false) {
      const active = list.filter(Boolean);
      const S = 24;
      active.forEach((name, i) => {
        const ix = rightAnchor ? x - (i + 1) * (S + 2) : x + i * (S + 2);
        ctx.drawIcon(name, ix, y, S, S);
      });
    }

    function battleAnchor(actor, allies, enemy) {
      if (actor === 'enemy') {
        const size = enemy.boss ? 220 : 160;
        return {x: 620 + size / 2, y: 105 + size / 2};
      }
      if (actor === 'sean') return {x: 215, y: 286};
      const index = Math.max(0, allies.indexOf(actor));
      return {x: 56 + (index % 2) * 50, y: 314 + Math.floor(index / 2) * 54};
    }

    function visualProgress(visual) {
      return Math.max(0, Math.min(1, visual.age / Math.max(1, visual.duration)));
    }

    function battleMotion(battle, actor, allies, enemy) {
      if (document.body.classList.contains('ssg-reduce-motion')) return {x: 0, y: 0};
      let x = 0, y = 0;
      for (const visual of battle.visuals || []) {
        if (visual.age < 0) continue;
        const p = visualProgress(visual);
        if (['aura', 'guard', 'impact'].includes(visual.kind)) continue;
        const from = battleAnchor(visual.source, allies, enemy);
        const to = battleAnchor(visual.target, allies, enemy);
        const dx = to.x - from.x, dy = to.y - from.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / length, uy = dy / length;
        if (visual.source === actor) {
          const lunge = Math.sin(Math.min(1, p / 0.62) * Math.PI) * (visual.kind === 'melee' ? 40 : 13);
          x += ux * lunge; y += uy * lunge;
        }
        if (visual.target === actor && p > 0.55) {
          const recoil = Math.sin(Math.min(1, (p - 0.55) / 0.45) * Math.PI) * 16;
          x += ux * recoil; y += uy * recoil;
        }
      }
      return {x, y};
    }

    function drawBattleVisuals(battle, allies, enemy) {
      const reduced = document.body.classList.contains('ssg-reduce-motion');
      const simple = document.body.classList.contains('ssg-no-screen-effects');
      for (const visual of battle.visuals || []) {
        if (visual.age < 0) continue;
        const p = visualProgress(visual);
        const from = battleAnchor(visual.source, allies, enemy);
        const to = battleAnchor(visual.target, allies, enemy);
        const stationary = ['aura', 'guard', 'impact'].includes(visual.kind);
        const travel = reduced ? 1 : Math.max(0, Math.min(1, (p - 0.06) / 0.58));
        const x = stationary ? to.x : from.x + (to.x - from.x) * travel;
        const y = stationary ? to.y : from.y + (to.y - from.y) * travel - Math.sin(travel * Math.PI) * visual.arc;
        const image = visual.sprite && ctx.img[visual.sprite];

        g.save();
        g.globalCompositeOperation = simple ? 'source-over' : 'lighter';
        if (!simple && !stationary) {
          for (let i = 5; i >= 1; i--) {
            const q = Math.max(0, travel - i * 0.055);
            const tx = from.x + (to.x - from.x) * q;
            const ty = from.y + (to.y - from.y) * q - Math.sin(q * Math.PI) * visual.arc;
            g.globalAlpha = (6 - i) * 0.055;
            g.fillStyle = visual.color;
            g.beginPath(); g.arc(tx, ty, Math.max(3, visual.size * (0.12 - i * 0.009)), 0, Math.PI * 2); g.fill();
          }
        }

        const pulse = stationary ? 0.78 + Math.sin(p * Math.PI) * 0.28 : 1;
        const size = visual.size * pulse;
        g.globalAlpha = p < 0.12 ? p / 0.12 : Math.max(0, Math.min(1, (1 - p) / 0.18));
        if (image && image.complete && image.naturalWidth) {
          g.translate(x, y);
          if (!stationary && !reduced) g.rotate(Math.atan2(to.y - from.y, to.x - from.x));
          g.drawImage(image, -size / 2, -size / 2, size, size);
          g.setTransform(1, 0, 0, 1, 0, 0);
        } else {
          g.fillStyle = visual.color;
          g.beginPath(); g.arc(x, y, size * 0.22, 0, Math.PI * 2); g.fill();
        }

        if (!simple && (stationary || p > 0.52)) {
          const impact = stationary ? p : Math.max(0, Math.min(1, (p - 0.52) / 0.48));
          g.globalAlpha = Math.max(0, 1 - impact);
          g.strokeStyle = visual.color; g.lineWidth = 5 - impact * 3;
          g.beginPath(); g.arc(to.x, to.y, 18 + impact * visual.size * 0.58, 0, Math.PI * 2); g.stroke();
          for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4 + visual.id * 0.37;
            const r1 = 12 + impact * visual.size * 0.25;
            const r2 = r1 + 12 + impact * 16;
            g.beginPath();
            g.moveTo(to.x + Math.cos(angle) * r1, to.y + Math.sin(angle) * r1);
            g.lineTo(to.x + Math.cos(angle) * r2, to.y + Math.sin(angle) * r2);
            g.stroke();
          }
        }
        g.restore();
      }
    }

    /* ---------- battle ---------- */
    function drawBattle() {
      const battle = ctx.battleApi().current;
      if (!battle) return;
      const e = battle.enemy;
      const h = S().hero;
      const stats = sys().heroStats();
      const bgKey = battle.backgroundKey || 'bg_countryside';
      const bg = ctx.img[bgKey];
      if (bg && bg.complete && bg.naturalWidth) {
        g.drawImage(bg, 0, 0, GAME_W, GAME_H);
        g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(0, 0, GAME_W, GAME_H);
      } else {
        const grd = g.createLinearGradient(0, 0, 0, GAME_H);
        grd.addColorStop(0, '#1b4669'); grd.addColorStop(1, '#74d8a0');
        g.fillStyle = grd; g.fillRect(0, 0, GAME_W, GAME_H);
      }
      // Recruited friends stand with Sean — a little formation to his lower-left.
      const allies = S().party.filter(c => ALLY_SPRITES[c]);
      const seanMotion = battleMotion(battle, 'sean', allies, e);
      ctx.drawCharacterFrame('sean', 0, 140 + seanMotion.x, 225 + seanMotion.y, 150, 150);
      allies.slice(0, 4).forEach((c, i) => {
        const ax = 30 + (i % 2) * 50, ay = 288 + Math.floor(i / 2) * 54;
        const bob = document.body.classList.contains('ssg-reduce-motion') ? 0 : Math.sin(Date.now() / 360 + i) * 2;
        const motion = battleMotion(battle, c, allies, e);
        ctx.drawIcon(ALLY_SPRITES[c], ax + motion.x, ay + bob + motion.y, 52, 52);
      });
      const custom = e.sprite && ctx.img[e.sprite];
      const useCustom = custom && custom.complete && custom.naturalWidth;
      const enemyImg = useCustom ? custom : (e.kind === 'xelar' ? ctx.img.xelar : ctx.img[e.kind]);
      if (enemyImg && enemyImg.complete && enemyImg.naturalWidth) {
        const motion = battleMotion(battle, 'enemy', allies, e);
        g.save();
        if (e.hue && !useCustom) g.filter = `hue-rotate(${e.hue}deg)`;
        g.drawImage(enemyImg, 620 + motion.x, 105 + motion.y, e.boss ? 220 : 160, e.boss ? 220 : 160);
        g.restore();
      }
      drawBattleVisuals(battle, allies, e);
      g.fillStyle = '#fff'; g.font = 'bold 24px Nunito'; g.fillText(e.name, 610, 82);
      // Element badge next to the enemy name (fire/ice/water/wind/light/void).
      const ELEMENT_ICONS = {fire:'icon_fire', ice:'icon_ice', water:'icon_water', wind:'icon_wind', light:'icon_light', void:'icon_void'};
      if (e.element && ELEMENT_ICONS[e.element]) {
        ctx.drawIcon(ELEMENT_ICONS[e.element], 612 + g.measureText(e.name).width + 8, 62, 24, 24);
      }
      bar(610, 92, 260, 18, e.hp / e.maxHp, '#ff5f7e', '#ffd3dc');
      drawStatusIcons(880, 74, [
        battle.stunned > 0 && 'status_stun',
        battle.enemyGuard > 0 && 'status_barrier'
      ]);
      // Turn banner card at the top of the arena (hidden during boss intros).
      const bannerName = battle.turn === 'player' ? 'card_player_turn' : battle.turn === 'enemy' ? 'card_enemy_turn' : null;
      const banner = bannerName && ctx.img[bannerName];
      if (banner && banner.complete && banner.naturalWidth && !(battle.intro > 0)) {
        const bh = 34, bw = bh * (banner.naturalWidth / banner.naturalHeight);
        g.save(); g.globalAlpha = 0.92;
        g.drawImage(banner, GAME_W / 2 - bw / 2, 10, bw, bh);
        g.restore();
      }
      g.fillStyle = '#fff'; g.fillText('Super Sean', 100, 208);
      bar(100, 216, 240, 16, h.hp / h.maxHp, '#ff5f7e', '#ffd3dc');
      bar(100, 238, 240, 13, h.mp / stats.maxMp, '#41b8ff', '#d8f3ff');
      drawStatusIcons(348, 202, [
        battle.poison > 0 && 'status_poison',
        battle.burn > 0 && 'status_burn',
        battle.frozen > 0 && 'status_freeze',
        battle.slowed > 0 && 'status_slow',
        battle.weakened > 0 && 'status_weak',
        battle.regen > 0 && 'status_regen',
        battle.inspired > 0 && 'status_strong',
        (battle.guard || battle.ironGuard > 0) && 'status_shield'
      ]);
      panel(60, 388, 840, 132, 'rgba(255,255,255,.94)');
      const cmds = ctx.battleApi().commands();
      battle.buttons = [];
      const canAct = battle.turn === 'player' && battle.lock <= 0 && battle.intro <= 0;
      cmds.forEach((c, i) => {
        const x = 80 + (i % 3) * 205, y = 402 + Math.floor(i / 3) * 36;
        button(x, y, 192, 29, c.label, () => ctx.battleApi().action(c.id), canAct);
        battle.buttons.push({...c, x, y, w: 192, h: 29});
      });
      g.fillStyle = '#12365a'; g.font = '12px Nunito';
      battle.log.slice(0, 4).forEach((l, i) => g.fillText(l, 700, 412 + i * 20));
      if (battle.turn === 'defeat') {
        panel(285, 160, 390, 150, 'rgba(255,255,255,.97)');
        g.fillStyle = '#12365a'; g.font = 'bold 24px Nunito'; g.fillText('Sean needs help!', 377, 202);
        button(326, 226, 145, 38, 'Reward Revive', () => ctx.battleApi().reviveOrReturn(true));
        button(492, 226, 145, 38, 'Return Home', () => ctx.battleApi().reviveOrReturn(false));
      }
      if (battle.intro > 0) drawBossIntro(battle, e);
    }

    // Cinematic boss name-card: dark bands slide off as the intro timer runs out.
    function drawBossIntro(battle, e) {
      const t = battle.intro;
      const max = battle.introFinal ? 150 : 100;
      const p = t / max;                 // 1 → 0
      const ease = p * p;                // bands retract, text fades near the end
      g.save();
      // letterbox bands
      const band = 150 * ease + 60;
      g.fillStyle = 'rgba(8,10,22,.82)';
      g.fillRect(0, 0, GAME_W, band);
      g.fillRect(0, GAME_H - band, GAME_W, band);
      // enemy sprite rising in the upper band
      const spr = e.sprite && ctx.img[e.sprite];
      if (spr && spr.complete && spr.naturalWidth) {
        const size = 150;
        g.globalAlpha = Math.min(1, (1 - p) * 2 + 0.35);
        g.drawImage(spr, GAME_W / 2 - size / 2, band - size - 6 + 20 * ease, size, size);
      }
      // name card
      g.globalAlpha = Math.min(1, 1.4 - p);
      g.textAlign = 'center';
      g.fillStyle = battle.introFinal ? '#c07bff' : '#ffd76a';
      g.font = 'bold 40px Nunito';
      g.fillText(e.name, GAME_W / 2, GAME_H / 2 - 6);
      g.fillStyle = '#eaf2ff'; g.font = 'bold 16px Nunito';
      g.fillText(battle.introFinal ? 'THE DARK ARCHMAGE — FINAL BATTLE' : 'BOSS BATTLE', GAME_W / 2, GAME_H / 2 + 24);
      g.textAlign = 'left';
      g.restore();
    }

    /* ---------- inventory ---------- */
    function drawInventory() {
      drawWorld(); drawHud();
      panel(90, 56, 780, 424, 'rgba(255,255,255,.97)');
      const st = S();
      ctx.drawIcon('icon_chest', 118, 72, 30, 30);
      g.fillStyle = '#12365a'; g.font = 'bold 26px Nunito'; g.fillText('Bag, Gear & Party', 156, 96);
      g.font = '13px Nunito'; g.fillStyle = '#2471a3';
      g.fillText('Click a snack to eat it · click gear to equip/unequip · Esc to close', 122, 116);
      const entries = Object.entries(st.items).filter(([, n]) => n > 0);
      entries.slice(0, 24).forEach(([name, count], i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 118 + col * 290, y = 132 + row * 27;
        const def = SSG.ITEMS[name];
        ctx.drawItemIcon(def, x, y - 6, 22, 22);
        const equipped = def?.type === 'equipment' && Object.values(st.equipment).includes(name);
        g.fillStyle = equipped ? '#0f8a3d' : '#12365a';
        g.font = equipped ? 'bold 15px Nunito' : '15px Nunito';
        g.fillText(`${name} × ${count}${equipped ? ' ✓' : ''}`, x + 28, y + 10);
        hotspot(x, y - 8, 280, 26, () => {
          if (def?.type === 'equipment') sys().equipItem(name);
          else if (def?.type === 'consumable') sys().useConsumable(name);
          else if (def?.type === 'mount') sys().toggleMount(name);
          else if (def?.type === 'treasure_map') sys().useTreasureMap();
          else ctx.showToast(def?.desc || name);
        });
      });
      const eq = st.equipment;
      g.font = 'bold 16px Nunito'; g.fillStyle = '#12365a';
      g.fillText('Equipped', 710, 140);
      g.font = '14px Nunito';
      g.fillText(`Weapon: ${eq.weapon || '—'}`, 710, 165);
      g.fillText(`Armor: ${eq.armor || '—'}`, 710, 188);
      g.fillText(`Charm: ${eq.charm || '—'}`, 710, 211);
      g.font = 'bold 16px Nunito'; g.fillText('Party', 710, 250);
      g.font = '14px Nunito';
      st.party.forEach((c, i) => g.fillText(`· ${cap(c)}`, 710, 275 + i * 22));
      g.font = '15px Nunito';
      ctx.drawIcon('icon_coin_gold', 710, 406, 18, 18);
      g.fillText(`${st.hero.coins}`, 733, 420);
    }

    /* ---------- quest log ---------- */
    function drawQuestLog() {
      drawWorld(); drawHud();
      panel(90, 48, 780, 440, 'rgba(255,255,255,.97)');
      const st = S();
      g.fillStyle = '#12365a'; g.font = 'bold 26px Nunito'; g.fillText('Quest Log', 122, 88);
      g.font = 'bold 19px Nunito'; g.fillText(st.quest.title, 122, 126);
      g.font = '15px Nunito'; wrapText(st.quest.objective, 122, 150, 520, 21);
      g.font = 'bold 16px Nunito'; g.fillText('Seven Gems', 122, 232);
      SSG.GEMS.forEach((gem, i) => {
        const has = st.gems.includes(gem);
        const x = 122 + i * 68;
        g.save(); if (!has) g.globalAlpha = 0.25;
        if (!ctx.drawIcon(SSG.GEM_ICONS?.[gem], x, 244, 30, 30)) ctx.drawTileScaled('birthday', 21, x, 244, 30, 30);
        g.restore();
        g.font = '9px Nunito'; g.fillStyle = has ? '#0f8a3d' : '#93a6b8';
        g.fillText(gem.replace(' Gem', ''), x + 2, 290);
      });
      const unlockedCount = Object.keys(st.achievements || {}).length;
      g.font = 'bold 16px Nunito'; g.fillStyle = '#12365a';
      g.fillText(`Achievements ${unlockedCount}/${SSG.ACHIEVEMENTS.length}`, 640, 126);
      SSG.ACHIEVEMENTS.forEach((a, i) => {
        const has = Boolean(st.achievements?.[a.id]);
        const y = 146 + i * 14;
        g.save(); if (!has) g.globalAlpha = 0.3;
        ctx.drawIcon(a.badge, 640, y - 10, 12, 12);
        g.restore();
        g.font = has ? 'bold 11px Nunito' : '11px Nunito';
        g.fillStyle = has ? '#0f8a3d' : '#93a6b8';
        g.fillText(a.label, 658, y);
      });
      g.font = 'bold 16px Nunito'; g.fillStyle = '#12365a'; g.fillText('Side Quests', 122, 330);
      let y = 352;
      SSG.SIDE_QUESTS.forEach(sq => {
        const rec = st.sideQuests[sq.id];
        const status = rec === 'done' ? '✓ done' : rec === 'done_repeat' ? '↻ repeatable' : rec === 'active' ? '● active' : '○ ask ' + cap(sq.npc);
        g.font = '14px Nunito'; g.fillStyle = rec === 'done' ? '#0f8a3d' : '#12365a';
        const ask = sq.ask.item ? `${sq.ask.count} × ${sq.ask.item}` : sq.ask.comfort ? `Comfort ${sq.ask.comfort}` : 'Blueprint: Stone Keep';
        g.fillText(`${sq.title} — ${ask} (${status})`, 122, y);
        y += 24;
      });
      g.fillStyle = '#2471a3'; g.font = 'bold 13px Nunito'; g.fillText('Press Q/Esc to close', 700, 470);
    }

    /* ---------- bestiary ---------- */
    function drawBestiary() {
      drawWorld(); drawHud();
      panel(70, 44, 820, 448, 'rgba(255,255,255,.97)');
      const st = S();
      const found = Object.entries(st.bestiary || {});
      // Total distinct foe looks across every region (arena roster adds more).
      const pool = new Set();
      Object.values(ctx.maps()).forEach(m => (m.monsters || []).forEach(mo => pool.add(mo.sprite || mo.kind)));
      g.fillStyle = '#12365a'; g.font = 'bold 26px Nunito'; g.fillText('Bestiary', 102, 86);
      g.font = '13px Nunito'; g.fillStyle = '#2471a3';
      g.fillText(`Discovered ${found.length} foes (${pool.size}+ roam the regions) · milestones at 10, 25 and 40 · N/Esc to close`, 102, 108);
      const arena = st.arena || {rank: 0, best: 0};
      g.font = 'bold 14px Nunito'; g.fillStyle = '#8b4a16';
      g.fillText(`Champion's Circuit — Rank ${arena.rank} (best ${arena.best})`, 600, 86);
      found.slice(0, 40).forEach(([sprite, entry], i) => {
        const col = i % 8, row = Math.floor(i / 8);
        const x = 102 + col * 98, y = 126 + row * 70;
        g.fillStyle = '#f4f7fa'; g.beginPath(); g.roundRect(x - 4, y - 4, 90, 62, 8); g.fill();
        if (!ctx.drawIcon(sprite, x + 20, y, 42, 42)) ctx.drawIcon('marker_battle', x + 20, y, 42, 42);
        g.fillStyle = '#12365a'; g.font = 'bold 9px Nunito';
        g.fillText(entry.name.slice(0, 16), x, y + 50);
        g.fillStyle = '#7a90a5'; g.fillText(`×${entry.n}`, x + 70, y + 8);
      });
      if (!found.length) {
        g.fillStyle = '#41576b'; g.font = '15px Nunito';
        g.fillText('No foes recorded yet — win a battle to start your collection!', 240, 280);
      }
    }

    /* ---------- world map ---------- */
    function drawWorldMap() {
      drawWorld(); drawHud();
      panel(100, 40, 760, 456, 'rgba(255,255,255,.97)');
      g.fillStyle = '#12365a'; g.font = 'bold 26px Nunito'; g.fillText('Asteria-007 World Map', 140, 84);
      const st = S();
      g.strokeStyle = '#3fa7dc'; g.lineWidth = 4; g.beginPath();
      const pts = SSG.WORLD_NODES.map(([, , x, y]) => [x, y]);
      g.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
      g.stroke();
      const REGION_MARKERS = {
        village: 'marker_home', meadow: 'marker_pin', cave: 'marker_gem', petro: 'marker_camp',
        ruushwood: 'marker_quest', moon: 'marker_star', ruins: 'marker_gate', tower: 'marker_tower',
        frostpeak: 'marker_flag', sunsand: 'marker_anchor'
      };
      const allMaps = ctx.maps();
      SSG.WORLD_NODES.forEach(([id, name, x, y]) => {
        const unlocked = id === 'village' || id === 'meadow' || st.unlocked[id];
        const here = st.mapId === id;
        g.fillStyle = here ? '#7cecff' : unlocked ? '#ffd76a' : '#cfd8e4';
        g.beginPath(); g.arc(x, y, 26, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#12365a'; g.lineWidth = 3; g.stroke();
        if (unlocked) {
          const bounce = here ? Math.sin(Date.now() / 250) * 3 : 0;
          ctx.drawIcon(REGION_MARKERS[id] || 'marker_pin', x - 14, y - 16 + bounce, 28, 28);
          // Alert badge: a boss still stands in this region.
          const bossAlive = (allMaps[id]?.monsters || []).some(mo =>
            mo.boss && !mo.defeated && !st.defeatedBosses[mo.id] &&
            (!mo.requiresGems || st.gems.length >= mo.requiresGems) &&
            (!mo.requiresDefeated || st.defeatedBosses[mo.requiresDefeated]));
          if (bossAlive) ctx.drawIcon('marker_alert', x + 12, y - 28, 20, 20);
          if (id === 'village') ctx.drawIcon('marker_shop', x - 34, y - 28, 20, 20);
        } else {
          ctx.drawIcon('icon_lock', x - 11, y - 13, 22, 26);
        }
        g.fillStyle = '#12365a'; g.font = 'bold 12px Nunito';
        g.fillText(name, x - 48, y + 46);
      });
      g.fillStyle = '#2471a3'; g.font = 'bold 13px Nunito';
      g.fillText('Walk between regions through the glowing portals. Press M/Esc to close.', 300, 476);
    }

    /* ---------- crafting ---------- */
    function drawCraft() {
      drawWorld(); drawHud();
      panel(60, 40, 840, 456, 'rgba(255,255,255,.97)');
      g.fillStyle = '#12365a'; g.font = 'bold 26px Nunito'; g.fillText('Crafting', 92, 82);
      const stations = sys().stationsBuilt();
      g.font = '13px Nunito'; g.fillStyle = '#2471a3';
      const stText = ['workbench', 'kitchen', 'forge'].map(s => `${stations.has(s) ? '✓' : '✗'} ${s}`).join('   ');
      g.fillText(`Homestead stations: ${stText} · click a recipe to craft · Esc to close`, 92, 104);
      const craftMenu = sys().craftMenu;
      ['materials', 'food', 'garden', 'gear'].forEach((catName, i) => {
        button(560 + i * 88, 58, 82, 26, cap(catName), () => { craftMenu.cat = catName; }, craftMenu.cat !== catName);
      });
      SSG.RECIPES.filter(r => r.cat === craftMenu.cat).forEach((r, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 88 + col * 410, y = 116 + row * 31;
        const ok = sys().canCraft(r);
        const avail = sys().recipeAvailable(r);
        g.fillStyle = ok ? '#eafbe9' : avail ? '#f4f7fa' : '#f8ecec';
        g.beginPath(); g.roundRect(x, y, 396, 28, 8); g.fill();
        g.strokeStyle = ok ? '#0f8a3d' : '#c8d4de'; g.lineWidth = 1.5; g.stroke();
        const def = SSG.ITEMS[r.out.item];
        ctx.drawItemIcon(def, x + 5, y + 3, 21, 21);
        g.fillStyle = ok ? '#0f6f31' : '#12365a'; g.font = 'bold 13px Nunito';
        g.fillText(r.name, x + 32, y + 12);
        g.font = '11px Nunito'; g.fillStyle = '#41576b';
        const ins = r.ins.map(([item, qty]) => `${qty} ${item} (${sys().countItem(item)})`).join(', ');
        g.fillText(`${ins}${r.station ? ' · needs ' + r.station : ''}`, x + 32, y + 24);
        hotspot(x, y, 396, 28, () => sys().craft(r));
      });
    }

    /* ---------- shop ---------- */
    function drawShop() {
      drawWorld(); drawHud();
      panel(120, 48, 720, 440, 'rgba(255,255,255,.97)');
      const shop = sys().shop;
      g.fillStyle = '#12365a'; g.font = 'bold 26px Nunito'; g.fillText("Bobo's Trading Post", 152, 90);
      g.font = '14px Nunito'; g.fillText(`Your coins: ${S().hero.coins}${sys().perkActive('discount') ? ' · Homestead discount active!' : ''}`, 152, 114);
      button(560, 66, 90, 30, 'Buy', () => { shop.tab = 'buy'; }, shop.tab !== 'buy');
      button(660, 66, 90, 30, 'Sell', () => { shop.tab = 'sell'; }, shop.tab !== 'sell');
      if (shop.tab === 'buy') {
        sys().shopPrices().forEach((entry, i) => {
          const y = 132 + i * 29;
          g.fillStyle = '#f4f7fa'; g.beginPath(); g.roundRect(150, y, 560, 26, 8); g.fill();
          const def = SSG.ITEMS[entry.item];
          ctx.drawItemIcon(def, 156, y + 3, 20, 20);
          g.fillStyle = '#12365a'; g.font = 'bold 13px Nunito';
          g.fillText(`${entry.item} — ${entry.price} coins`, 186, y + 18);
          button(620, y + 2, 80, 22, 'Buy', () => sys().buy(i));
        });
      } else {
        const list = sys().sellables();
        if (!list.length) { g.fillStyle = '#41576b'; g.font = '15px Nunito'; g.fillText('Nothing to sell yet. Go gather materials!', 152, 160); }
        list.slice(0, 8).forEach((entry, i) => {
          const y = 140 + i * 38;
          g.fillStyle = '#f4f7fa'; g.beginPath(); g.roundRect(150, y, 560, 32, 8); g.fill();
          const def = SSG.ITEMS[entry.item];
          ctx.drawItemIcon(def, 156, y + 4, 24, 24);
          g.fillStyle = '#12365a'; g.font = 'bold 14px Nunito';
          g.fillText(`${entry.item} × ${entry.count} — ${entry.price} coins each`, 190, y + 21);
          button(620, y + 3, 80, 26, 'Sell', () => sys().sell(i));
        });
      }
      g.fillStyle = '#2471a3'; g.font = 'bold 13px Nunito'; g.fillText('Press Esc to leave the shop', 620, 470);
    }

    /* ---------- build mode ---------- */
    function drawBuild() {
      drawWorld();
      const st = S();
      const cam = camera();
      const build = sys().build;
      const r = sys().claimRect();
      g.save();
      g.strokeStyle = 'rgba(124,236,255,.8)'; g.lineWidth = 3; g.setLineDash([10, 6]);
      g.strokeRect(r.x0 * T - cam.x, r.y0 * T - cam.y, (r.x1 - r.x0 + 1) * T, (r.y1 - r.y0 + 1) * T);
      g.restore();
      const {tx, ty} = build.cursor;
      const piece = sys().selectedPiece();
      const valid = build.removeMode ? Boolean(sys().pieceAt(tx, ty)) : sys().canPlace(tx, ty, piece);
      const cx = tx * T - cam.x, cy = ty * T - cam.y;
      if (!build.removeMode && piece) {
        g.save(); g.globalAlpha = 0.6;
        if (piece.billboard) drawBillboard(piece.sprite, cx, cy, piece.bsize || 100);
        else ctx.drawTile(piece.sheet, piece.tile, cx, cy);
        g.restore();
      }
      g.save();
      g.strokeStyle = valid ? '#59e07c' : '#ff6d6d'; g.lineWidth = 3;
      g.strokeRect(cx + 2, cy + 2, T - 4, T - 4);
      g.restore();
      // palette
      panel(8, 386, 944, 146, 'rgba(13,37,63,.92)');
      SSG.BUILD_CATEGORIES.forEach((catName, i) => {
        const x = 18 + i * 116;
        button(x, 396, 110, 24, catName, () => { build.cat = i; build.idx = 0; }, build.cat !== i);
      });
      const pieces = sys().piecesInCategory(SSG.BUILD_CATEGORIES[build.cat]);
      // Scrolling window of up to 10 tiles, centred on the selected piece.
      const perPage = 10, y = 428;
      const start = Math.max(0, Math.min(build.idx - 4, Math.max(0, pieces.length - perPage)));
      const shown = pieces.slice(start, start + perPage);
      if (start > 0) { g.fillStyle = '#7cecff'; g.font = 'bold 20px Nunito'; g.fillText('‹', 10, y + 38); }
      if (start + perPage < pieces.length) { g.fillStyle = '#7cecff'; g.font = 'bold 20px Nunito'; g.fillText('›', 936, y + 38); }
      shown.forEach((p, j) => {
        const i = start + j;
        const x = 26 + j * 90;
        g.fillStyle = i === build.idx ? 'rgba(124,236,255,.35)' : 'rgba(255,255,255,.10)';
        g.beginPath(); g.roundRect(x, y, 82, 58, 8); g.fill();
        if (i === build.idx) { g.strokeStyle = '#7cecff'; g.lineWidth = 2; g.stroke(); }
        if (p.billboard) {
          const im = ctx.img[p.sprite];
          if (im && im.complete) g.drawImage(im, x + 18, y + 2, 46, 46);
        } else {
          ctx.drawTileScaled(p.sheet, p.tile, x + 25, y + 4, 32, 32);
        }
        g.fillStyle = '#fff'; g.font = '10px Nunito';
        g.fillText(p.name.slice(0, 14), x + 5, y + 52);
        hotspot(x, y, 82, 58, () => { build.idx = i; build.removeMode = false; });
      });
      g.fillStyle = '#9fc4dd'; g.font = '10px Nunito';
      g.fillText(`${build.idx + 1}/${pieces.length}  ·  [ ] to scroll`, 400, 424);
      const info = piece ? `${piece.name} — ${sys().costText(piece.cost)} · Comfort +${piece.comfort}` : '';
      g.fillStyle = '#d9f6ff'; g.font = 'bold 12px Nunito';
      g.fillText(build.removeMode ? 'REMOVE MODE — click or Enter on a piece to refund it' : info, 22, 505);
      g.fillText(`Comfort ${sys().comfort()} · Coins ${st.hero.coins}`, 22, 522);
      button(700, 494, 76, 26, build.removeMode ? 'Build' : 'Remove', () => { build.removeMode = !build.removeMode; });
      button(784, 494, 88, 26, 'Blueprints', () => { build.blueprintOpen = !build.blueprintOpen; });
      button(880, 494, 60, 26, 'Exit', () => ctx.exitBuild());
      // top hint
      drawLabel('Build mode: arrows move cursor · Enter place · X remove · Tab category · V blueprints · B/Esc exit', 180, 10, '#d9f6ff');
      hotspot(0, 0, GAME_W, 386, (mx, my) => {
        const ntx = Math.floor((mx + cam.x) / T), nty = Math.floor((my + cam.y) / T);
        build.cursor = {tx: ntx, ty: nty};
        if (build.removeMode) sys().removePiece(ntx, nty);
        else sys().place(ntx, nty);
      });
      if (build.blueprintOpen) drawBlueprints(build);
    }

    function drawBlueprints(build) {
      panel(190, 60, 580, 316, 'rgba(255,255,255,.97)');
      g.fillStyle = '#12365a'; g.font = 'bold 22px Nunito'; g.fillText('Blueprints — stamp at cursor', 220, 98);
      SSG.BLUEPRINTS.forEach((bp, i) => {
        const y = 116 + i * 46;
        const cost = sys().blueprintCost(bp);
        const ok = sys().hasCost(cost);
        g.fillStyle = i === build.bpIdx ? '#eaf6ff' : '#f4f7fa';
        g.beginPath(); g.roundRect(214, y, 532, 40, 8); g.fill();
        if (i === build.bpIdx) { g.strokeStyle = '#3fa7dc'; g.lineWidth = 2; g.stroke(); }
        g.fillStyle = ok ? '#0f6f31' : '#8a4444'; g.font = 'bold 14px Nunito';
        g.fillText(`${bp.name} (${bp.grid[0].length}×${bp.grid.length})`, 226, y + 17);
        g.font = '11px Nunito'; g.fillStyle = '#41576b';
        g.fillText(`${bp.desc} Cost: ${sys().costText(cost)}`, 226, y + 33);
        hotspot(214, y, 532, 40, () => {
          if (build.bpIdx === i) {
            sys().stampBlueprint(bp, build.cursor.tx, build.cursor.ty);
            build.blueprintOpen = false;
          } else build.bpIdx = i;
        });
      });
      g.fillStyle = '#2471a3'; g.font = 'bold 12px Nunito';
      g.fillText('Click once to select, again to stamp at the cursor tile (top-left corner). V/Esc closes.', 220, 366);
    }

    /* ---------- fishing ---------- */
    function drawFishing() {
      drawWorld(); drawHud();
      const f = sys().fishing;
      panel(280, 170, 400, 190, 'rgba(255,255,255,.96)');
      g.fillStyle = '#12365a'; g.font = 'bold 24px Nunito'; g.fillText('Gone Fishing 🎣', 330, 210);
      g.font = '14px Nunito'; g.fillStyle = '#41576b';
      g.fillText('Press E when the bobber is in the green zone!', 316, 238);
      const barX = 320, barY = 258, barW = 320, barH = 26;
      g.fillStyle = '#d8f3ff'; g.beginPath(); g.roundRect(barX, barY, barW, barH, 13); g.fill();
      g.fillStyle = '#59e07c';
      g.beginPath(); g.roundRect(barX + barW * 0.38, barY, barW * 0.24, barH, 13); g.fill();
      const bx = barX + barW * Math.max(0, Math.min(1, f.pos));
      g.fillStyle = '#ff9c2f'; g.beginPath(); g.arc(bx, barY + barH / 2, 13, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#0e4f7c'; g.lineWidth = 2; g.stroke();
      button(390, 306, 180, 34, 'Reel in! (E)', () => sys().castFishing());
      g.font = '11px Nunito'; g.fillStyle = '#7a90a5'; g.fillText('Esc to put the rod away', 410, 354);
    }

    /* ---------- party link (co-op) ---------- */
    function drawPartyMenu() {
      const coop = ctx.coopApi().state;
      if (S().scene === 'party' && coop.mode !== 'guest') drawWorld();
      else { g.fillStyle = '#0e2744'; g.fillRect(0, 0, GAME_W, GAME_H); }
      panel(230, 90, 500, 360, 'rgba(255,255,255,.97)');
      g.fillStyle = '#12365a'; g.font = 'bold 28px Nunito'; g.fillText('👥 Party Link', 268, 138);
      g.font = '14px Nunito'; g.fillStyle = '#41576b';
      wrapText('Play together online: the host shares a 6-letter code, friends join as Dave, Petroman, Ruush or Haraku. Friends walk, harvest and fight with their own skill. Progress saves with the host.', 268, 164, 430, 20);
      if (!coop.mode) {
        button(268, 268, 200, 42, 'Host a Party', () => ctx.coopApi().hostStart());
        button(492, 268, 200, 42, 'Join a Party', () => {
          const code = (window.prompt('Enter the 6-letter party code:') || '').trim().toUpperCase();
          if (!/^[A-Z0-9]{6}$/.test(code)) { ctx.showToast('Codes are 6 letters/numbers, like MOON42.'); return; }
          const name = (window.prompt('Your name?') || 'Friend').trim().slice(0, 16) || 'Friend';
          ctx.coopApi().guestJoin(code, name);
        });
        if (coop.error) { g.fillStyle = '#a33d3d'; g.font = 'bold 13px Nunito'; wrapText(coop.error, 268, 336, 430, 18); }
      } else if (coop.mode === 'host') {
        g.fillStyle = '#0f6f31'; g.font = 'bold 16px Nunito'; g.fillText('Party is open — share this code:', 268, 262);
        g.font = '900 44px Nunito'; g.fillStyle = '#12365a'; g.fillText(coop.code, 268, 310);
        const guests = Object.values(coop.guests);
        g.font = '14px Nunito'; g.fillStyle = '#41576b';
        g.fillText(guests.length ? `In your party: ${guests.map(gu => `${gu.name} (${cap(gu.char)})`).join(', ')}` : 'Waiting for friends to join...', 268, 344);
        button(268, 366, 132, 32, 'Share code', () => window.SSGShare && window.SSGShare('party', coop.code));
        button(414, 366, 132, 32, 'Close Party', () => ctx.coopApi().leave());
        button(560, 366, 130, 32, 'Back to game', () => ctx.setScene('explore'));
        g.font = '11px Nunito'; g.fillStyle = '#7a90a5';
        g.fillText('Friends: open the game, tap 👥 Party → Join, enter this code.', 268, 410);
      } else {
        g.font = 'bold 16px Nunito'; g.fillStyle = '#12365a';
        g.fillText(`Joining ${coop.code}... (${coop.status})`, 268, 280);
        button(268, 372, 160, 34, 'Cancel', () => ctx.coopApi().leave());
      }
      g.font = '12px Nunito'; g.fillStyle = '#7a90a5'; g.fillText('Esc closes this menu', 268, 432);
    }

    function drawCoopGuest() {
      const api = ctx.coopApi();
      const coop = api.state;
      const r = coop.remote;
      g.fillStyle = '#0e2744'; g.fillRect(0, 0, GAME_W, GAME_H);
      if (!r || !coop.myChar) {
        g.fillStyle = '#fff'; g.font = 'bold 22px Nunito';
        const msg = coop.status === 'reconnecting' ? 'Reconnecting to the host...' : 'Connecting to the host\'s world...';
        g.fillText(msg, 300, 260);
        g.font = '14px Nunito'; g.fillStyle = '#bcd6ea';
        g.fillText(`Party code: ${coop.code}`, 300, 292);
        button(300, 320, 160, 36, 'Cancel', () => ctx.coopApi().leave());
        return;
      }
      // Stale-snapshot indicator: host may have paused or dropped.
      const stale = performance.now() - coop.lastSnapshotAt > 3000;
      const m = ctx.maps()[r.mapId];
      const me = coop.smoothed[coop.myChar] || coop.smoothed.sean || {x: 0, y: 0};
      const cam = {
        x: Math.max(0, Math.min(m.w * T - GAME_W, me.x - GAME_W / 2)),
        y: Math.max(0, Math.min(m.h * T - GAME_H, me.y - GAME_H / 2))
      };
      const x0 = Math.floor(cam.x / T), y0 = Math.floor(cam.y / T);
      for (let y = y0; y < Math.min(m.h, y0 + Math.ceil(GAME_H / T) + 2); y++) {
        for (let x = x0; x < Math.min(m.w, x0 + Math.ceil(GAME_W / T) + 2); x++) {
          ctx.drawTile(m.tileset, m.tiles[y][x], x * T - cam.x, y * T - cam.y);
        }
      }
      for (const prop of m.props || []) {
        drawBillboard(prop.sprite, prop.tx * T - cam.x, prop.ty * T - cam.y, prop.size || 120);
      }
      const inactive = new Set(r.nodesInactive || []);
      for (const node of m.nodes || []) {
        const type = SSG.NODE_TYPES[node.kind];
        g.save();
        if (inactive.has(node.id)) g.globalAlpha = 0.22;
        ctx.drawTile(type.sheet, type.tile, node.tx * T - cam.x, node.ty * T - cam.y);
        g.restore();
      }
      for (const portal of m.portals) {
        drawLabel(portal.label, portal.x - cam.x - 15, portal.y - cam.y - 10, '#ffffff');
      }
      (r.monsters || []).forEach(mon => drawMonster({...mon, maxHp: 1, hp: 1}, cam));
      const seanPos = coop.smoothed.sean || r.sean;
      drawCharacter('sean', seanPos.x - cam.x, seanPos.y - cam.y, r.sean.frame || 0, 'Sean (host)');
      Object.entries(r.actors || {}).forEach(([char, actor]) => {
        const pos = coop.smoothed[char] || actor;
        drawCharacter(char, pos.x - cam.x, pos.y - cam.y, actor.frame || 0,
          char === coop.myChar ? `${actor.name} (You)` : actor.name);
      });
      // guest HUD
      panel(12, 12, 400, 58, 'rgba(255,255,255,.88)');
      g.fillStyle = '#12365a'; g.font = 'bold 15px Nunito';
      g.fillText(`You are ${cap(coop.myChar)} · Party Lv.${r.hero.level} · ${m.name}`, 26, 36);
      bar(26, 44, 240, 11, r.hero.hp / r.hero.maxHp, '#ff5f7e', '#ffe6ea');
      g.font = '11px Nunito'; g.fillText(`${r.hero.hp}/${r.hero.maxHp} party HP · coins ${r.hero.coins}`, 274, 54);
      drawLabel('Move: WASD · E harvest · 1 battle skill · Esc leave party', 12, GAME_H - 30, '#d9f6ff');
      if (stale) drawLabel('⚠ Waiting for host…', GAME_W - 210, 12, '#ffd76a');
      if (r.battle) {
        const bg = ctx.img[r.battle.bg];
        if (bg && bg.complete && bg.naturalWidth) { g.drawImage(bg, 0, 0, GAME_W, GAME_H); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 0, GAME_W, GAME_H); }
        else panel(60, 60, 840, 420, 'rgba(14,39,68,.92)');
        const gCustom = r.battle.enemy.sprite && ctx.img[r.battle.enemy.sprite];
        const gUse = gCustom && gCustom.complete && gCustom.naturalWidth;
        const enemyImg = gUse ? gCustom : (r.battle.enemy.kind === 'xelar' ? ctx.img.xelar : ctx.img[r.battle.enemy.kind]);
        if (enemyImg && enemyImg.complete && enemyImg.naturalWidth) {
          g.save();
          if (r.battle.enemy.hue && !gUse) g.filter = `hue-rotate(${r.battle.enemy.hue}deg)`;
          g.drawImage(enemyImg, 620, 110, r.battle.enemy.boss ? 210 : 150, r.battle.enemy.boss ? 210 : 150);
          g.restore();
        }
        g.fillStyle = '#fff'; g.font = 'bold 24px Nunito'; g.fillText(`⚔ ${r.battle.enemy.name}`, 96, 116);
        bar(96, 130, 300, 18, r.battle.enemy.hp / r.battle.enemy.maxHp, '#ff5f7e', '#ffd3dc');
        g.font = '13px Nunito';
        r.battle.log.forEach((l, i) => { g.fillStyle = '#eafaff'; g.fillText(l, 96, 172 + i * 20); });
        button(96, 380, 260, 44, `${api.mySkillLabel()} (1)`, () => api.guestBattleAction(), r.battle.turn === 'player');
      }
      if (r.toast) drawLabel(r.toast, 240, 90, '#fff4a9');
    }

    /* ---------- main render ---------- */
    function render() {
      clickables.length = 0;
      g.clearRect(0, 0, GAME_W, GAME_H);
      const scene = S().scene;
      if (scene === 'title') drawTitle();
      else if (scene === 'dialogue') drawDialogue();
      else if (scene === 'battle') drawBattle();
      else if (scene === 'inventory') drawInventory();
      else if (scene === 'quest') drawQuestLog();
      else if (scene === 'bestiary') drawBestiary();
      else if (scene === 'map') drawWorldMap();
      else if (scene === 'craft') drawCraft();
      else if (scene === 'shop') drawShop();
      else if (scene === 'build') drawBuild();
      else if (scene === 'fishing') drawFishing();
      else if (scene === 'party') drawPartyMenu();
      else if (scene === 'coopGuest') drawCoopGuest();
      else { drawWorld(); drawHud(); }
    }

    function click(x, y) {
      for (let i = clickables.length - 1; i >= 0; i--) {
        const c = clickables[i];
        if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
          c.cb(x, y);
          return true;
        }
      }
      return false;
    }

    return {render, click, camera};
  };
})();
