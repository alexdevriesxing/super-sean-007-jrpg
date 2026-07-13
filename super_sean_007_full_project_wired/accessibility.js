(() => {
  'use strict';

  const status = document.createElement('div');
  status.id = 'ssgA11yStatus';
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  document.body.appendChild(status);

  const controls = document.createElement('section');
  controls.id = 'ssgA11yControls';
  controls.className = 'ssg-a11y-controls';
  controls.setAttribute('aria-label', 'Accessible game controls');
  controls.innerHTML = '<h2>Accessible game controls</h2><p id="ssgA11ySummary">Start the game to enable text controls.</p><div id="ssgA11yButtons"></div>';
  document.body.appendChild(controls);

  const summary = controls.querySelector('#ssgA11ySummary');
  const buttons = controls.querySelector('#ssgA11yButtons');
  let previousAnnouncement = '';
  let previousScene = '';

  const commandLabels = {
    attack: 'Attack', slash: 'Crystal Slash', friendship: 'Friendship Burst', item: 'Use healing snack',
    guard: 'Guard', run: 'Run', gadget: 'Dave: Gadget Zap', ironguard: 'Petroman: Iron Guard',
    arrows: 'Ruush: Twin Arrows', blessing: 'Haraku: Moon Blessing'
  };

  function dispatchKey(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', {code, key: code, bubbles: true}));
    window.dispatchEvent(new KeyboardEvent('keyup', {code, key: code, bubbles: true}));
  }

  function button(label, action) {
    const node = document.createElement('button');
    node.type = 'button';
    node.textContent = label;
    node.addEventListener('click', action);
    return node;
  }

  function announce(text) {
    if (!text || text === previousAnnouncement) return;
    previousAnnouncement = text;
    status.textContent = '';
    requestAnimationFrame(() => { status.textContent = text; });
  }

  function renderControls(state) {
    buttons.replaceChildren();
    if (state.scene === 'battle' && state.battle) {
      state.battle.commands.forEach((command, index) => {
        buttons.append(button(commandLabels[command] || command, () => dispatchKey(`Digit${index + 1}`)));
      });
      return;
    }
    if (state.scene === 'dialogue') {
      buttons.append(button('Continue dialogue', () => dispatchKey('Enter')));
      return;
    }
    if (state.scene === 'fishing') {
      buttons.append(button('Cast fishing line', () => dispatchKey('Enter')));
      buttons.append(button('Cancel fishing', () => dispatchKey('Escape')));
      return;
    }
    if (state.scene === 'explore') {
      buttons.append(button('Interact', () => window.SuperSeanGame?.interact()));
      buttons.append(button('Quests', () => window.SuperSeanGame?.menu('quest')));
      buttons.append(button('Inventory', () => window.SuperSeanGame?.menu('inventory')));
      buttons.append(button('Map', () => window.SuperSeanGame?.menu('map')));
      buttons.append(button('Craft', () => window.SuperSeanGame?.menu('craft')));
      if (state.homestead?.claimed) buttons.append(button('Build', () => window.SuperSeanGame?.menu('build')));
    }
  }

  function update() {
    if (typeof window.render_game_to_text !== 'function') return;
    let state;
    try { state = JSON.parse(window.render_game_to_text()); } catch (error) { return; }
    const hero = state.hero || {};
    const quest = state.quest || {};
    let text = `${state.map?.name || 'Asteria'}, ${state.scene}. Level ${hero.level || 1}. HP ${hero.hp || 0} of ${hero.maxHp || 0}. Quest: ${quest.title || 'none'}.`;
    if (state.battle) text += ` Fighting ${state.battle.enemy.name}, enemy HP ${state.battle.enemy.hp} of ${state.battle.enemy.maxHp}. ${state.battle.log?.[0] || ''}`;
    if (state.nearby?.npcs?.length) text += ` Nearby: ${state.nearby.npcs.map(npc => npc.name).join(', ')}.`;
    summary.textContent = text;
    if (state.scene !== previousScene || state.scene === 'battle') announce(text);
    previousScene = state.scene;
    renderControls(state);
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function syncMotion() { document.documentElement.classList.toggle('reduce-motion', reduceMotion.matches); }
  syncMotion();
  reduceMotion.addEventListener?.('change', syncMotion);

  setInterval(update, 1200);
  window.addEventListener('ssg:announce', event => announce(String(event.detail || '')));
})();
