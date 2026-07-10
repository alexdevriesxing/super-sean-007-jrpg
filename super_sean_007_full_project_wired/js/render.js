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
        ctx.drawTile('birthday', 20, chest.x - cam.x, chest.y - cam.y);
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
        drawCharacter(npc.char, npc.x - cam.x, npc.y - cam.y, 0, npc.name, npc.hue);
      }
      for (const mon of m.monsters) {
        if (mon.defeated || S().defeatedBosses[mon.id]) continue;
        if (mon.requiresDefeated && !S().defeatedBosses[mon.requiresDefeated]) continue;
        if (mon.requiresGems && S().gems.length < mon.requiresGems) continue;
        drawMonster(mon, cam);
      }
      drawParty(cam);
    }

    function drawHomesteadOverlays(m, cam) {
      const hs = S().homestead;
      Object.entries(hs.tiles).forEach(([key, pieceId]) => {
        const piece = SSG.BUILD_PIECES.find(p => p.id === pieceId);
        if (!piece) return;
        const [tx, ty] = key.split(',').map(Number);
        ctx.drawTile(piece.sheet, piece.tile, tx * T - cam.x, ty * T - cam.y);
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
      const size = mon.boss ? 78 : 54;
      const x = mon.x - cam.x, y = mon.y - cam.y;
      const im = ctx.img[key] || ctx.img.slime;
      g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 5;
      if (mon.hue) g.filter = `hue-rotate(${mon.hue}deg)`;
      g.drawImage(im, x - size / 2, y - size / 2, size, size);
      g.restore();
      drawLabel(mon.name, x - size / 2, y - size / 2 - 17, mon.boss ? '#ffd76a' : '#fff');
    }

    function drawParty(cam) {
      const p = S().player;
      const companions = S().party.filter(c => c !== 'sean').slice(0, 4);
      companions.forEach((c, i) => drawCharacter(c, p.x - cam.x - 26 * (i + 1), p.y - cam.y + 16 * (i + 1), 0, ''));
      const frame = ctx.isMoving() ? (2 + p.frame % 2) : 0;
      drawCharacter('sean', p.x - cam.x, p.y - cam.y, frame, '');
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
      bar(26, 81, 220, 9, h.friendship / 100, '#ffd76a', '#fdf3d4');
      g.fillText('Friendship', 252, 90);
      panel(640, 12, 308, 86, 'rgba(255,255,255,.88)');
      g.fillStyle = '#12365a'; g.font = 'bold 14px Nunito'; g.fillText(st.quest.title, 655, 34);
      g.font = '12px Nunito'; wrapText(st.quest.objective, 655, 52, 278, 15);
      const mapName = ctx.currentMap().name;
      const extra = st.mapId === 'homestead' && st.homestead.claimed ? ` · Comfort ${sys().comfort()}` : '';
      panel(12, 496, 936, 34, 'rgba(12,39,69,.78)');
      g.fillStyle = '#fff'; g.font = '13px Nunito';
      g.fillText(`${mapName} · Coins ${h.coins} · Gems ${st.gems.length}/7${extra}`, 26, 518);
      g.fillText('E interact · C craft · B build · I bag · Q quests · M map · P save', 560, 518);
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
      g.fillStyle = '#12365a'; g.font = 'bold 22px Nunito'; g.fillText(d.speaker, 112, 392);
      g.font = '17px Nunito'; wrapText(d.lines[d.index], 112, 424, 720, 24);
      g.font = 'bold 13px Nunito'; g.fillStyle = '#2471a3'; g.fillText('Click, Space or Enter to continue', 600, 486);
      hotspot(0, 0, GAME_W, GAME_H, () => ctx.nextDialogue());
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
      ctx.drawCharacterFrame('sean', 0, 140, 225, 150, 150);
      const enemyImg = e.kind === 'xelar' ? ctx.img.xelar : ctx.img[e.kind];
      if (enemyImg && enemyImg.complete) {
        g.save();
        if (e.hue) g.filter = `hue-rotate(${e.hue}deg)`;
        g.drawImage(enemyImg, 620, 105, e.boss ? 220 : 160, e.boss ? 220 : 160);
        g.restore();
      }
      g.fillStyle = '#fff'; g.font = 'bold 24px Nunito'; g.fillText(e.name, 610, 82);
      bar(610, 92, 260, 18, e.hp / e.maxHp, '#ff5f7e', '#ffd3dc');
      g.fillText('Super Sean', 100, 208);
      bar(100, 216, 240, 16, h.hp / h.maxHp, '#ff5f7e', '#ffd3dc');
      bar(100, 238, 240, 13, h.mp / stats.maxMp, '#41b8ff', '#d8f3ff');
      panel(60, 388, 840, 132, 'rgba(255,255,255,.94)');
      const cmds = ctx.battleApi().commands();
      battle.buttons = [];
      cmds.forEach((c, i) => {
        const x = 80 + (i % 3) * 205, y = 402 + Math.floor(i / 3) * 36;
        button(x, y, 192, 29, c.label, () => ctx.battleApi().action(c.id));
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
    }

    /* ---------- inventory ---------- */
    function drawInventory() {
      drawWorld(); drawHud();
      panel(90, 56, 780, 424, 'rgba(255,255,255,.97)');
      const st = S();
      g.fillStyle = '#12365a'; g.font = 'bold 26px Nunito'; g.fillText('Bag, Gear & Party', 122, 96);
      g.font = '13px Nunito'; g.fillStyle = '#2471a3';
      g.fillText('Click a snack to eat it · click gear to equip/unequip · Esc to close', 122, 116);
      const entries = Object.entries(st.items).filter(([, n]) => n > 0);
      entries.slice(0, 24).forEach(([name, count], i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 118 + col * 290, y = 132 + row * 27;
        const def = SSG.ITEMS[name];
        if (def?.icon) ctx.drawTileScaled(def.icon.sheet, def.icon.tile, x, y - 6, 22, 22);
        const equipped = def?.type === 'equipment' && Object.values(st.equipment).includes(name);
        g.fillStyle = equipped ? '#0f8a3d' : '#12365a';
        g.font = equipped ? 'bold 15px Nunito' : '15px Nunito';
        g.fillText(`${name} × ${count}${equipped ? ' ✓' : ''}`, x + 28, y + 10);
        hotspot(x, y - 8, 280, 26, () => {
          if (def?.type === 'equipment') sys().equipItem(name);
          else if (def?.type === 'consumable') sys().useConsumable(name);
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
      g.fillText(`Coins: ${st.hero.coins}`, 710, 420);
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
        ctx.drawTileScaled('birthday', 21, x, 244, 30, 30);
        g.restore();
        g.font = '9px Nunito'; g.fillStyle = has ? '#0f8a3d' : '#93a6b8';
        g.fillText(gem.replace(' Gem', ''), x + 2, 290);
      });
      const unlockedCount = Object.keys(st.achievements || {}).length;
      g.font = 'bold 16px Nunito'; g.fillStyle = '#12365a';
      g.fillText(`Achievements ${unlockedCount}/${SSG.ACHIEVEMENTS.length}`, 640, 126);
      SSG.ACHIEVEMENTS.forEach((a, i) => {
        const has = Boolean(st.achievements?.[a.id]);
        g.font = has ? 'bold 12px Nunito' : '12px Nunito';
        g.fillStyle = has ? '#0f8a3d' : '#93a6b8';
        g.fillText(`${has ? '★' : '☆'} ${a.label}`, 640, 148 + i * 18);
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
      SSG.WORLD_NODES.forEach(([id, name, x, y]) => {
        const unlocked = id === 'village' || id === 'meadow' || st.unlocked[id];
        const here = st.mapId === id;
        g.fillStyle = here ? '#7cecff' : unlocked ? '#ffd76a' : '#cfd8e4';
        g.beginPath(); g.arc(x, y, 26, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#12365a'; g.lineWidth = 3; g.stroke();
        g.fillStyle = '#12365a'; g.font = 'bold 12px Nunito';
        g.fillText(name, x - 48, y + 46);
        if (!unlocked) g.fillText('🔒', x - 8, y + 5);
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
      SSG.RECIPES.forEach((r, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 88 + col * 410, y = 122 + row * 36;
        const ok = sys().canCraft(r);
        const avail = sys().recipeAvailable(r);
        g.fillStyle = ok ? '#eafbe9' : avail ? '#f4f7fa' : '#f8ecec';
        g.beginPath(); g.roundRect(x, y, 396, 31, 8); g.fill();
        g.strokeStyle = ok ? '#0f8a3d' : '#c8d4de'; g.lineWidth = 1.5; g.stroke();
        const def = SSG.ITEMS[r.out.item];
        if (def?.icon) ctx.drawTileScaled(def.icon.sheet, def.icon.tile, x + 5, y + 4, 23, 23);
        g.fillStyle = ok ? '#0f6f31' : '#12365a'; g.font = 'bold 13px Nunito';
        g.fillText(r.name, x + 34, y + 14);
        g.font = '11px Nunito'; g.fillStyle = '#41576b';
        const ins = r.ins.map(([item, qty]) => `${qty} ${item} (${sys().countItem(item)})`).join(', ');
        g.fillText(`${ins}${r.station ? ' · needs ' + r.station : ''}`, x + 34, y + 27);
        hotspot(x, y, 396, 31, () => sys().craft(r));
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
          const y = 140 + i * 38;
          g.fillStyle = '#f4f7fa'; g.beginPath(); g.roundRect(150, y, 560, 32, 8); g.fill();
          const def = SSG.ITEMS[entry.item];
          if (def?.icon) ctx.drawTileScaled(def.icon.sheet, def.icon.tile, 156, y + 4, 24, 24);
          g.fillStyle = '#12365a'; g.font = 'bold 14px Nunito';
          g.fillText(`${entry.item} — ${entry.price} coins`, 190, y + 21);
          button(620, y + 3, 80, 26, 'Buy', () => sys().buy(i));
        });
      } else {
        const list = sys().sellables();
        if (!list.length) { g.fillStyle = '#41576b'; g.font = '15px Nunito'; g.fillText('Nothing to sell yet. Go gather materials!', 152, 160); }
        list.slice(0, 8).forEach((entry, i) => {
          const y = 140 + i * 38;
          g.fillStyle = '#f4f7fa'; g.beginPath(); g.roundRect(150, y, 560, 32, 8); g.fill();
          const def = SSG.ITEMS[entry.item];
          if (def?.icon) ctx.drawTileScaled(def.icon.sheet, def.icon.tile, 156, y + 4, 24, 24);
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
        ctx.drawTile(piece.sheet, piece.tile, cx, cy);
        g.restore();
      }
      g.save();
      g.strokeStyle = valid ? '#59e07c' : '#ff6d6d'; g.lineWidth = 3;
      g.strokeRect(cx + 2, cy + 2, T - 4, T - 4);
      g.restore();
      // palette
      panel(8, 386, 944, 146, 'rgba(13,37,63,.92)');
      SSG.BUILD_CATEGORIES.forEach((catName, i) => {
        const x = 22 + i * 128;
        button(x, 396, 120, 24, catName, () => { build.cat = i; build.idx = 0; }, build.cat !== i);
      });
      const pieces = sys().piecesInCategory(SSG.BUILD_CATEGORIES[build.cat]);
      pieces.forEach((p, i) => {
        const x = 22 + i * 88, y = 428;
        g.fillStyle = i === build.idx ? 'rgba(124,236,255,.35)' : 'rgba(255,255,255,.10)';
        g.beginPath(); g.roundRect(x, y, 82, 58, 8); g.fill();
        if (i === build.idx) { g.strokeStyle = '#7cecff'; g.lineWidth = 2; g.stroke(); }
        ctx.drawTileScaled(p.sheet, p.tile, x + 25, y + 4, 32, 32);
        g.fillStyle = '#fff'; g.font = '10px Nunito';
        g.fillText(p.name.slice(0, 14), x + 5, y + 50);
        hotspot(x, y, 82, 58, () => { build.idx = i; build.removeMode = false; });
      });
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
      else if (scene === 'map') drawWorldMap();
      else if (scene === 'craft') drawCraft();
      else if (scene === 'shop') drawShop();
      else if (scene === 'build') drawBuild();
      else if (scene === 'fishing') drawFishing();
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
