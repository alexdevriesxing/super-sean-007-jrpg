/* Super Sean 007 — remappable keyboard controls, gamepad input and visual preferences. */
(() => {
  'use strict';

  const STORAGE_KEY = 'super-sean-007-player-preferences-v1';
  const ACTIONS = [
    ['moveUp', 'Move up', 'KeyW'],
    ['moveDown', 'Move down', 'KeyS'],
    ['moveLeft', 'Move left', 'KeyA'],
    ['moveRight', 'Move right', 'KeyD'],
    ['interact', 'Interact / confirm', 'KeyE'],
    ['inventory', 'Inventory', 'KeyI'],
    ['quest', 'Quest log', 'KeyQ'],
    ['map', 'World map', 'KeyM'],
    ['craft', 'Crafting', 'KeyC'],
    ['build', 'Build mode', 'KeyB'],
    ['save', 'Manual save', 'KeyP'],
    ['screenshot', 'Screenshot', 'KeyT']
  ];
  const DEFAULT_KEYS = Object.fromEntries(ACTIONS.map(([id, , code]) => [id, code]));
  const CANONICAL = {...DEFAULT_KEYS};
  const DEFAULTS = {
    keys: DEFAULT_KEYS,
    textScale: 1,
    highContrast: false,
    reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
    screenEffects: true,
    gamepadEnabled: true
  };

  function safeRead() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        ...DEFAULTS,
        ...parsed,
        keys: {...DEFAULT_KEYS, ...(parsed.keys || {})}
      };
    } catch (error) {
      return {...DEFAULTS, keys: {...DEFAULT_KEYS}};
    }
  }

  let prefs = safeRead();
  let gamepadConnected = false;
  const virtualDown = new Set();
  const previousButtons = new Map();

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (error) {}
  }

  function announce(message) {
    window.dispatchEvent(new CustomEvent('ssg:announce', {detail: message}));
  }

  function labelForCode(code) {
    const labels = {
      Space: 'Space', Enter: 'Enter', Escape: 'Escape', ArrowUp: '↑', ArrowDown: '↓',
      ArrowLeft: '←', ArrowRight: '→', BracketLeft: '[', BracketRight: ']'
    };
    if (labels[code]) return labels[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    return code.replace(/^(Numpad|Control|Shift|Alt)/, '$1 ');
  }

  function applyVisuals() {
    const root = document.documentElement;
    const body = document.body;
    root.style.setProperty('--ssg-text-scale', String(Math.max(1, Math.min(1.35, Number(prefs.textScale) || 1))));
    body?.classList.toggle('ssg-high-contrast', Boolean(prefs.highContrast));
    body?.classList.toggle('ssg-reduce-motion', Boolean(prefs.reduceMotion));
    body?.classList.toggle('ssg-screen-effects', Boolean(prefs.screenEffects));
    body?.classList.toggle('ssg-no-screen-effects', !prefs.screenEffects);
  }

  function isTypingTarget(target) {
    return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
  }

  function overlayOpen() {
    return Boolean(document.querySelector('.ssg-overlay'));
  }

  function currentState() {
    try { return JSON.parse(window.render_game_to_text?.() || '{}'); }
    catch (error) { return {}; }
  }

  function actionForCode(code) {
    return ACTIONS.find(([id]) => prefs.keys[id] === code)?.[0] || null;
  }

  function dispatchCanonical(code, down, repeat = false) {
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {
      code,
      key: labelForCode(code),
      bubbles: true,
      repeat
    }));
  }

  function maybeStartNgPlus(event) {
    if (!event.isTrusted || event.code !== 'KeyG' || isTypingTarget(event.target) || overlayOpen()) return false;
    const state = currentState();
    if (state.scene !== 'explore' || state.map?.id !== 'homestead' || state.quest?.id !== 'postgame_legend') return false;
    if (typeof window.SuperSeanGame?.startNewGamePlus !== 'function') return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.SuperSeanGame.startNewGamePlus();
    announce('New Game Plus started.');
    return true;
  }

  function translatePhysical(event, down) {
    if (down && maybeStartNgPlus(event)) return;
    if (!event.isTrusted || isTypingTarget(event.target) || overlayOpen()) return;
    const action = actionForCode(event.code);
    if (!action) return;
    const canonical = CANONICAL[action];
    if (!canonical || canonical === event.code) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    dispatchCanonical(canonical, down, event.repeat);
  }

  window.addEventListener('keydown', event => translatePhysical(event, true), true);
  window.addEventListener('keyup', event => translatePhysical(event, false), true);

  function stateScene() {
    return currentState().scene || 'unknown';
  }

  function tap(code) {
    dispatchCanonical(code, true);
    requestAnimationFrame(() => dispatchCanonical(code, false));
  }

  function confirmAction() {
    const scene = stateScene();
    if (scene === 'title' || scene === 'dialogue' || scene === 'fishing') tap('Enter');
    else if (scene === 'battle') tap('Digit1');
    else tap('KeyE');
  }

  function setVirtual(code, active) {
    const already = virtualDown.has(code);
    if (active && !already) {
      virtualDown.add(code);
      dispatchCanonical(code, true);
    } else if (!active && already) {
      virtualDown.delete(code);
      dispatchCanonical(code, false);
    }
  }

  function buttonEdge(gamepad, index) {
    const key = `${gamepad.index}:${index}`;
    const pressed = Boolean(gamepad.buttons[index]?.pressed);
    const previous = previousButtons.get(key) || false;
    previousButtons.set(key, pressed);
    return pressed && !previous;
  }

  function releaseVirtualMovement() {
    ['KeyW', 'KeyS', 'KeyA', 'KeyD'].forEach(code => setVirtual(code, false));
  }

  function pollGamepads() {
    const pads = prefs.gamepadEnabled && navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const pad = pads[0];
    const connected = Boolean(pad);
    if (connected !== gamepadConnected) {
      gamepadConnected = connected;
      announce(connected ? `Gamepad connected: ${pad.id || 'controller'}.` : 'Gamepad disconnected.');
      window.dispatchEvent(new CustomEvent('ssg:gamepad', {detail: {connected, id: pad?.id || ''}}));
    }

    if (!pad || overlayOpen()) {
      releaseVirtualMovement();
      requestAnimationFrame(pollGamepads);
      return;
    }

    const deadzone = 0.35;
    const x = Number(pad.axes[0] || 0);
    const y = Number(pad.axes[1] || 0);
    setVirtual('KeyA', x < -deadzone || Boolean(pad.buttons[14]?.pressed));
    setVirtual('KeyD', x > deadzone || Boolean(pad.buttons[15]?.pressed));
    setVirtual('KeyW', y < -deadzone || Boolean(pad.buttons[12]?.pressed));
    setVirtual('KeyS', y > deadzone || Boolean(pad.buttons[13]?.pressed));

    if (buttonEdge(pad, 0)) confirmAction();
    if (buttonEdge(pad, 1)) tap('Escape');
    if (buttonEdge(pad, 2)) tap('KeyI');
    if (buttonEdge(pad, 3)) tap('KeyQ');
    if (buttonEdge(pad, 4)) tap('KeyC');
    if (buttonEdge(pad, 5)) tap('KeyB');
    if (buttonEdge(pad, 8)) tap('KeyM');
    if (buttonEdge(pad, 9)) window.SSGSettings?.();

    requestAnimationFrame(pollGamepads);
  }

  function setBinding(action, code) {
    if (!DEFAULT_KEYS[action] || !code) return false;
    const duplicate = Object.entries(prefs.keys).find(([id, value]) => id !== action && value === code);
    if (duplicate) prefs.keys[duplicate[0]] = prefs.keys[action];
    prefs.keys[action] = code;
    save();
    announce(`${ACTIONS.find(([id]) => id === action)?.[1] || action} set to ${labelForCode(code)}.`);
    window.dispatchEvent(new CustomEvent('ssg:preferences', {detail: get()}));
    return true;
  }

  function update(partial = {}) {
    prefs = {
      ...prefs,
      ...partial,
      keys: partial.keys ? {...prefs.keys, ...partial.keys} : prefs.keys
    };
    prefs.textScale = Math.max(1, Math.min(1.35, Number(prefs.textScale) || 1));
    save();
    applyVisuals();
    window.dispatchEvent(new CustomEvent('ssg:preferences', {detail: get()}));
    return get();
  }

  function reset() {
    prefs = {...DEFAULTS, keys: {...DEFAULT_KEYS}};
    save();
    applyVisuals();
    announce('Controls and accessibility preferences reset.');
    window.dispatchEvent(new CustomEvent('ssg:preferences', {detail: get()}));
    return get();
  }

  function get() {
    return {
      ...prefs,
      keys: {...prefs.keys},
      actions: ACTIONS.map(([id, label]) => ({id, label, code: prefs.keys[id], display: labelForCode(prefs.keys[id])})),
      gamepad: {connected: gamepadConnected}
    };
  }

  window.SSGPlayerPreferences = {get, update, reset, setBinding, labelForCode, defaults: () => ({...DEFAULTS, keys: {...DEFAULT_KEYS}})};
  applyVisuals();
  requestAnimationFrame(pollGamepads);
})();
