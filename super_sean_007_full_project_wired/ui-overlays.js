/* Super Sean 007 — accessible DOM overlays for settings, onboarding and sharing. */
(() => {
  'use strict';

  const SITE_URL = 'https://supersean007.com/';
  const g = () => window.SuperSeanGame;
  const prefsApi = () => window.SSGPlayerPreferences;

  function focusable(root) {
    return Array.from(root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
      .filter(node => !node.disabled && !node.hidden);
  }

  function overlay(id, innerHtml, label) {
    close(id);
    const previousFocus = document.activeElement;
    const el = document.createElement('div');
    el.id = id;
    el.className = 'ssg-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', label || 'Game dialog');
    el.innerHTML = `<div class="ssg-panel">${innerHtml}</div>`;

    function dismiss() {
      el.remove();
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({preventScroll: true});
    }

    el.addEventListener('click', event => { if (event.target === el) dismiss(); });
    el.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); dismiss(); return; }
      if (event.key !== 'Tab') return;
      const nodes = focusable(el);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    el.dismiss = dismiss;
    document.body.appendChild(el);
    const initialFocus = focusable(el)[0];
    initialFocus?.focus({preventScroll: true});
    requestAnimationFrame(() => {
      if (el.isConnected && !el.contains(document.activeElement)) initialFocus?.focus({preventScroll: true});
    });
    return el;
  }

  function close(id) {
    const el = document.getElementById(id);
    if (el?.dismiss) el.dismiss();
    else el?.remove();
  }

  function setStatus(el, message, isError = false) {
    const target = el.querySelector('.ssg-cloud-status');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('error', isError);
    window.dispatchEvent(new CustomEvent('ssg:announce', {detail: message}));
  }

  async function cloudAction(el, action, confirmation) {
    if (!window.SSGCloudControls) {
      setStatus(el, 'Cloud controls are still loading. Try again in a moment.', true);
      return;
    }
    if (confirmation && !window.confirm(confirmation)) return;
    setStatus(el, 'Working…');
    try {
      const result = await window.SSGCloudControls[action]();
      setStatus(el, result.message || 'Done.');
      if (result.id && navigator.clipboard?.writeText) navigator.clipboard.writeText(result.id).catch(() => {});
      if (result.reload) setTimeout(() => location.reload(), 900);
    } catch (error) {
      setStatus(el, error.message || 'Cloud action failed.', true);
    }
  }

  function preferenceHtml() {
    const pref = prefsApi()?.get?.();
    if (!pref) return '<p class="ssg-note">Control preferences are still loading.</p>';
    const bindings = pref.actions.map(action => `
      <button type="button" class="ssg-btn ssg-keybind" data-action="${action.id}">
        <span>${action.label}</span><kbd>${action.display}</kbd>
      </button>`).join('');
    return `
      <h3>Accessibility &amp; display</h3>
      <div class="ssg-preference-grid">
        <label>Text size
          <select id="prefTextScale">
            <option value="1" ${pref.textScale === 1 ? 'selected' : ''}>Standard</option>
            <option value="1.15" ${pref.textScale === 1.15 ? 'selected' : ''}>Large</option>
            <option value="1.3" ${pref.textScale === 1.3 ? 'selected' : ''}>Extra large</option>
          </select>
        </label>
        <label>High contrast <input type="checkbox" id="prefContrast" ${pref.highContrast ? 'checked' : ''}></label>
        <label>Reduce motion <input type="checkbox" id="prefMotion" ${pref.reduceMotion ? 'checked' : ''}></label>
        <label>Screen effects <input type="checkbox" id="prefEffects" ${pref.screenEffects ? 'checked' : ''}></label>
        <label>Gamepad input <input type="checkbox" id="prefGamepad" ${pref.gamepadEnabled ? 'checked' : ''}></label>
      </div>
      <p class="ssg-gamepad-status" role="status">Controller: ${pref.gamepad.connected ? 'connected' : 'not detected'}. Left stick/D-pad moves; A confirms; B backs out; Start opens Settings.</p>
      <h3>Keyboard controls</h3>
      <p class="ssg-note">Choose a control, then press its new key. Arrow keys always remain available for movement.</p>
      <div class="ssg-key-grid">${bindings}</div>
      <button type="button" class="ssg-btn" id="prefReset">Reset controls and display</button>`;
  }

  function bindPreferences(el) {
    const api = prefsApi();
    if (!api) return;
    const update = patch => api.update(patch);
    el.querySelector('#prefTextScale')?.addEventListener('change', event => update({textScale: Number(event.target.value)}));
    el.querySelector('#prefContrast')?.addEventListener('change', event => update({highContrast: event.target.checked}));
    el.querySelector('#prefMotion')?.addEventListener('change', event => update({reduceMotion: event.target.checked}));
    el.querySelector('#prefEffects')?.addEventListener('change', event => update({screenEffects: event.target.checked}));
    el.querySelector('#prefGamepad')?.addEventListener('change', event => update({gamepadEnabled: event.target.checked}));
    el.querySelector('#prefReset')?.addEventListener('click', () => {
      api.reset();
      setStatus(el, 'Controls and display preferences reset. Reopen Settings to review them.');
    });
    el.querySelectorAll('.ssg-keybind').forEach(button => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        button.classList.add('capturing');
        button.querySelector('kbd').textContent = 'Press key';
        setStatus(el, 'Press a keyboard key now, or Escape to cancel.');
        const capture = event => {
          event.preventDefault();
          event.stopImmediatePropagation();
          button.classList.remove('capturing');
          if (event.code === 'Escape') {
            button.querySelector('kbd').textContent = api.get().actions.find(item => item.id === action)?.display || '—';
            setStatus(el, 'Key change cancelled.');
            return;
          }
          api.setBinding(action, event.code);
          button.querySelector('kbd').textContent = api.labelForCode(event.code);
          setStatus(el, `${button.querySelector('span').textContent} is now ${api.labelForCode(event.code)}.`);
        };
        window.addEventListener('keydown', capture, {capture: true, once: true});
      });
    });
    window.addEventListener('ssg:gamepad', event => {
      const target = el.querySelector('.ssg-gamepad-status');
      if (target && el.isConnected) target.textContent = event.detail.connected ? `Controller connected: ${event.detail.id || 'gamepad'}.` : 'Controller disconnected.';
    }, {once: true});
  }

  window.SSGSettings = () => {
    const settings = g()?.settings ? g().settings() : {music: 0.3, sfx: 0.45, cloud: false, cloudId: ''};
    const el = overlay('ssgSettings', `
      <button class="ssg-x" aria-label="Close settings">×</button>
      <h2>⚙ Settings</h2>
      <label class="ssg-row">Music volume
        <input type="range" id="setMusic" min="0" max="1" step="0.05" value="${Number(settings.music) || 0}">
      </label>
      <label class="ssg-row">Sound effects
        <input type="range" id="setSfx" min="0" max="1" step="0.05" value="${Number(settings.sfx) || 0}">
      </label>
      ${preferenceHtml()}
      <h3>Progress &amp; sharing</h3>
      <div class="ssg-buttons">
        <button class="ssg-btn" id="setCloud">${settings.cloud ? '☁ Cloud Sync: ON' : '☁ Enable Cloud Sync'}</button>
        <button class="ssg-btn" id="cloudLoad">⬇ Load cloud copy</button>
        <button class="ssg-btn" id="cloudOverwrite">⬆ Use this device</button>
        <button class="ssg-btn" id="cloudRotate">🔑 Rotate sync ID</button>
        <button class="ssg-btn" id="cloudDelete">🗑 Delete cloud copy</button>
        <button class="ssg-btn" id="cloudBackup">💾 Download backup</button>
        <button class="ssg-btn" id="setInstall">📲 Install app</button>
        <button class="ssg-btn" id="setShot">📸 Screenshot</button>
        <button class="ssg-btn" id="setHelp">❓ How to play</button>
        <button class="ssg-btn" id="setShare">🔗 Share game</button>
      </div>
      <p class="ssg-note cloud-id-note" hidden>Sync ID: <code></code>. Treat it like a password.</p>
      <p class="ssg-cloud-status" role="status" aria-live="polite"></p>
      <p class="ssg-note">Progress autosaves locally. Cloud Sync is optional and can be deleted or rotated here.</p>
    `, 'Game settings');

    const idNote = el.querySelector('.cloud-id-note');
    if (settings.cloud && settings.cloudId) {
      idNote.hidden = false;
      idNote.querySelector('code').textContent = settings.cloudId;
    }

    bindPreferences(el);
    el.querySelector('.ssg-x').onclick = () => el.dismiss();
    el.querySelector('#setMusic').oninput = event => g()?.setMusicVolume(parseFloat(event.target.value));
    el.querySelector('#setSfx').oninput = event => g()?.setSfxVolume(parseFloat(event.target.value));
    el.querySelector('#setCloud').onclick = () => { g()?.cloudSync(); setStatus(el, 'Cloud Sync setting changed. Reopen Settings to confirm the current ID.'); };
    el.querySelector('#cloudLoad').onclick = () => cloudAction(el, 'loadCurrent', 'Replace this browser save with the current cloud copy?');
    el.querySelector('#cloudOverwrite').onclick = () => cloudAction(el, 'overwriteCurrent', 'Explicitly replace the cloud copy with this device’s current save?');
    el.querySelector('#cloudRotate').onclick = () => cloudAction(el, 'rotateId', 'Create a new sync ID and revoke the old one?');
    el.querySelector('#cloudDelete').onclick = () => cloudAction(el, 'deleteCloud', 'Permanently delete the cloud copy? Your local browser save will remain.');
    el.querySelector('#cloudBackup').onclick = () => cloudAction(el, 'downloadBackup');
    el.querySelector('#setInstall').onclick = () => g()?.install();
    el.querySelector('#setShot').onclick = () => { g()?.screenshot(); el.dismiss(); };
    el.querySelector('#setHelp').onclick = () => { el.dismiss(); window.SSGOnboard(); };
    el.querySelector('#setShare').onclick = () => { el.dismiss(); window.SSGShare('game'); };
  };

  window.SSGOnboard = () => {
    const el = overlay('ssgOnboard', `
      <button class="ssg-x" aria-label="Close instructions">×</button>
      <h2>Welcome to Asteria-007!</h2>
      <ul class="ssg-guide">
        <li><b>Move</b> with WASD, arrow keys, the on-screen D-pad or a controller.</li>
        <li><b>E</b> talks, opens chests, harvests resources and fishes.</li>
        <li><b>Beat Moldor</b> to earn the homestead, then use <b>B</b> to build and <b>C</b> to craft.</li>
        <li><b>Q</b> quests · <b>I</b> bag · <b>M</b> map. Every keyboard action can be remapped in Settings.</li>
        <li><b>👥 Party</b> lets friends join online where network conditions permit.</li>
      </ul>
      <p class="ssg-note">First quest: talk to <b>Elder Brightbeard</b> in Birthday Village.</p>
      <button class="ssg-btn primary" id="onbGo">Let’s go!</button>
    `, 'How to play');
    el.querySelector('.ssg-x').onclick = () => el.dismiss();
    el.querySelector('#onbGo').onclick = () => el.dismiss();
  };

  window.SSGShare = (kind, code) => {
    let text = 'Play Super Sean 007 — a free browser JRPG where you quest, craft and build your own homestead!';
    const url = SITE_URL;
    if (kind === 'party' && code) text = `Join my Super Sean 007 co-op party! Code: ${code}`;
    window.SSGStats?.track('share');
    if (navigator.share) {
      navigator.share({title: 'Super Sean 007', text, url}).catch(() => {});
      return;
    }
    const el = overlay('ssgShare', `
      <button class="ssg-x" aria-label="Close sharing options">×</button>
      <h2>Share Super Sean 007</h2>
      <p class="ssg-note share-text"></p>
      <div class="ssg-buttons">
        <a class="ssg-btn" target="_blank" rel="noopener noreferrer" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}">Share on X</a>
        <a class="ssg-btn" target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a>
        <a class="ssg-btn" target="_blank" rel="noopener noreferrer" href="https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent('Super Sean 007 — free browser JRPG')}">Reddit</a>
        <button class="ssg-btn" id="shareCopy">Copy link</button>
      </div>
    `, 'Share Super Sean 007');
    el.querySelector('.share-text').textContent = text;
    el.querySelector('.ssg-x').onclick = () => el.dismiss();
    el.querySelector('#shareCopy').onclick = () => {
      const copy = navigator.clipboard?.writeText ? navigator.clipboard.writeText(url) : Promise.reject();
      copy.then(() => { el.querySelector('#shareCopy').textContent = 'Copied!'; })
        .catch(() => window.prompt('Copy this link:', url));
    };
  };
})();
