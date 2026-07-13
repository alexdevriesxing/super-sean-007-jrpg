import {access, mkdtemp, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const HOST = '127.0.0.1';
const PORT = 4173;
const DEBUG_PORT = 9222;
const BASE_URL = `http://${HOST}:${PORT}`;
const VITE_BIN = path.resolve('node_modules/vite/bin/vite.js');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; } catch (error) {}
  }
  throw new Error('Chrome/Chromium was not found. Set CHROME_PATH or install a headless browser.');
}

async function waitForHttp(url, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {redirect: 'manual'});
      if (response.status < 500) return;
    } catch (error) {}
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CDP {
  constructor(url) {
    if (typeof WebSocket !== 'function') throw new Error('Node.js 22 WebSocket support is required.');
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, {once: true});
      this.socket.addEventListener('error', reject, {once: true});
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${message.error.message} (${message.error.code})`));
        else pending.resolve(message.result || {});
        return;
      }
      const listeners = this.events.get(message.method) || [];
      listeners.forEach(listener => listener(message.params || {}));
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const promise = new Promise((resolve, reject) => this.pending.set(id, {resolve, reject}));
    this.socket.send(JSON.stringify({id, method, params}));
    return promise;
  }

  on(method, listener) {
    const listeners = this.events.get(method) || [];
    listeners.push(listener);
    this.events.set(method, listeners);
  }

  waitFor(method, timeout = 15_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
      const listener = params => {
        clearTimeout(timer);
        const listeners = this.events.get(method) || [];
        this.events.set(method, listeners.filter(item => item !== listener));
        resolve(params);
      };
      this.on(method, listener);
    });
  }

  close() {
    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.close();
    }
  }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
  return result.result?.value;
}

async function poll(cdp, expression, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for browser condition: ${expression}`);
}

async function stopProcess(child, label) {
  if (!child || child.exitCode !== null || child.signalCode) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM');
  const graceful = await Promise.race([
    exited.then(() => true),
    sleep(2000).then(() => false)
  ]);
  if (!graceful && child.exitCode === null) {
    child.kill('SIGKILL');
    await Promise.race([exited, sleep(2000)]);
  }
  if (child.exitCode === null && !child.signalCode) {
    console.warn(`[smoke] ${label} did not confirm exit before cleanup.`);
  }
}

async function cleanupDirectory(directory) {
  try {
    await rm(directory, {recursive: true, force: true, maxRetries: 8, retryDelay: 250});
  } catch (error) {
    console.warn(`[smoke] Temporary profile cleanup warning: ${error.message}`);
  }
}

const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'ssg-chrome-'));
let preview;
let chrome;
let cdp;

try {
  preview = spawn(process.execPath, [VITE_BIN, 'preview', '--host', HOST, '--port', String(PORT)], {
    env: {...process.env, NO_COLOR: '1'},
    stdio: ['ignore', 'pipe', 'pipe']
  });
  preview.stdout.on('data', chunk => process.stdout.write(`[preview] ${chunk}`));
  preview.stderr.on('data', chunk => process.stderr.write(`[preview] ${chunk}`));
  await waitForHttp(BASE_URL);

  const chromePath = await findChrome();
  chrome = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
    '--mute-audio', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  chrome.stderr.on('data', () => {});
  await waitForHttp(`http://${HOST}:${DEBUG_PORT}/json/version`);

  const target = await fetch(`http://${HOST}:${DEBUG_PORT}/json/new?${encodeURIComponent(`${BASE_URL}/?qa=1`)}`, {method: 'PUT'}).then(response => response.json());
  cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open();

  const exceptions = [];
  await Promise.all([
    cdp.send('Page.enable'),
    cdp.send('Runtime.enable'),
    cdp.send('Log.enable'),
    cdp.send('Network.enable')
  ]);
  cdp.on('Runtime.exceptionThrown', event => exceptions.push(event.exceptionDetails?.text || 'Uncaught browser exception'));
  cdp.on('Log.entryAdded', event => {
    if (event.entry?.level === 'error' && !/favicon|fonts\.googleapis/.test(event.entry.text || '')) exceptions.push(event.entry.text);
  });

  const loaded = cdp.waitFor('Page.loadEventFired');
  await cdp.send('Page.navigate', {url: `${BASE_URL}/?qa=1`});
  await loaded;
  await poll(cdp, `Boolean(window.SuperSeanGame && window.render_game_to_text && window.SSGPlayerPreferences)`);
  await evaluate(cdp, `document.getElementById('consentDecline')?.click()`);
  await poll(cdp, `document.getElementById('gameLoader')?.classList.contains('hidden')`, 30_000);

  const shell = await evaluate(cdp, `(() => ({
    title: document.title,
    canvas: {width: document.getElementById('gameCanvas')?.width, height: document.getElementById('gameCanvas')?.height},
    a11y: Boolean(document.getElementById('ssgA11yControls')),
    preferences: Boolean(window.SSGPlayerPreferences),
    runtime: window.SSGRuntimeInfo || null,
    debugExposed: Boolean(window.SuperSeanGame?.debug)
  }))()`);
  if (!shell.title.includes('Super Sean 007')) throw new Error(`Unexpected title: ${shell.title}`);
  if (shell.canvas.width !== 960 || shell.canvas.height !== 540) throw new Error('Game canvas dimensions are incorrect.');
  if (!shell.a11y) throw new Error('Accessible game controls did not load.');
  if (!shell.preferences) throw new Error('Player preference runtime did not load.');
  if (!shell.runtime?.hardened) throw new Error('Production runtime hardening did not initialize.');
  if (shell.runtime.version !== '1.2.0') throw new Error(`Unexpected runtime version ${shell.runtime.version}.`);
  if (shell.runtime.production && shell.debugExposed) throw new Error('QA debug controls remain exposed in production.');

  await cdp.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Enter', code: 'Enter'});
  await cdp.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Enter', code: 'Enter'});
  await poll(cdp, `JSON.parse(window.render_game_to_text()).scene !== 'title'`);
  const state = await evaluate(cdp, `JSON.parse(window.render_game_to_text())`);
  if (!state.map?.id || !state.hero?.level) throw new Error('Rendered game state is incomplete.');

  const dialog = await evaluate(cdp, `(() => {
    window.SSGSettings();
    const node = document.getElementById('ssgSettings');
    return {
      exists: Boolean(node), role: node?.getAttribute('role'), modal: node?.getAttribute('aria-modal'),
      focusedInside: Boolean(node?.contains(document.activeElement)),
      textScale: Boolean(node?.querySelector('#prefTextScale')),
      keybinds: node?.querySelectorAll('.ssg-keybind').length || 0,
      gamepadStatus: Boolean(node?.querySelector('.ssg-gamepad-status'))
    };
  })()`);
  if (!dialog.exists || dialog.role !== 'dialog' || dialog.modal !== 'true') throw new Error('Settings dialog lacks accessible dialog semantics.');
  if (!dialog.focusedInside) throw new Error('Settings dialog did not receive focus.');
  if (!dialog.textScale || dialog.keybinds < 10 || !dialog.gamepadStatus) throw new Error('Settings does not expose complete player preferences.');

  const preferenceResult = await evaluate(cdp, `(() => {
    const api = window.SSGPlayerPreferences;
    const initial = api.get();
    api.setBinding('interact', 'KeyI');
    const remapped = api.get();
    api.update({textScale: 1.3, highContrast: true, reduceMotion: true, screenEffects: false});
    const classes = {
      highContrast: document.body.classList.contains('ssg-high-contrast'),
      reduceMotion: document.body.classList.contains('ssg-reduce-motion'),
      noEffects: document.body.classList.contains('ssg-no-screen-effects')
    };
    api.reset();
    return {
      initialInteract: initial.keys.interact,
      remappedInteract: remapped.keys.interact,
      swappedInventory: remapped.keys.inventory,
      classes,
      resetInteract: api.get().keys.interact
    };
  })()`);
  if (preferenceResult.initialInteract !== 'KeyE' || preferenceResult.remappedInteract !== 'KeyI') throw new Error('Keyboard remapping failed.');
  if (preferenceResult.swappedInventory !== 'KeyE') throw new Error('Duplicate key swapping failed.');
  if (!preferenceResult.classes.highContrast || !preferenceResult.classes.reduceMotion || !preferenceResult.classes.noEffects) throw new Error('Visual preferences were not applied.');
  if (preferenceResult.resetInteract !== 'KeyE') throw new Error('Preference reset failed.');

  await cdp.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape'});
  await cdp.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape'});

  const performance = await fetch(`${BASE_URL}/performance-report.json`).then(response => response.json());
  if (!performance.passed || !performance.totals?.criticalBytes) throw new Error('Performance budget report did not pass.');

  const guideLoaded = cdp.waitFor('Page.loadEventFired');
  await cdp.send('Page.navigate', {url: `${BASE_URL}/guides.html`});
  await guideLoaded;
  const guide = await evaluate(cdp, `({title: document.title, h1: document.querySelector('h1')?.textContent || ''})`);
  if (!guide.title.includes('Guide') || guide.h1.length < 10) throw new Error('Guide page did not render meaningful content.');

  if (exceptions.length) throw new Error(`Browser exceptions:\n${exceptions.join('\n')}`);
  console.log(JSON.stringify({
    ok: true,
    shell,
    initialState: {scene: state.scene, map: state.map.name, level: state.hero.level},
    preferences: preferenceResult,
    performance: performance.totals,
    guide
  }, null, 2));
} finally {
  cdp?.close();
  await stopProcess(chrome, 'Chrome');
  await stopProcess(preview, 'Vite preview');
  await cleanupDirectory(userDataDir);
}
