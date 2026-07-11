/* Super Sean 007 — DOM overlays: settings, first-run onboarding, and sharing.
   Kept out of the canvas so they use real accessible HTML controls. */
(() => {
  'use strict';

  const SITE_URL = 'https://www.supersean007.com/';
  const g = () => window.SuperSeanGame;

  function overlay(id, innerHtml) {
    close(id);
    const el = document.createElement('div');
    el.id = id;
    el.className = 'ssg-overlay';
    el.innerHTML = `<div class="ssg-panel">${innerHtml}</div>`;
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
    return el;
  }
  function close(id) { const el = document.getElementById(id); if (el) el.remove(); }

  /* ---------------- settings ---------------- */
  window.SSGSettings = () => {
    const s = g() && g().settings ? g().settings() : {music: 0.3, sfx: 0.45, cloud: false, cloudId: ''};
    const el = overlay('ssgSettings', `
      <button class="ssg-x" aria-label="Close">×</button>
      <h2>⚙ Settings</h2>
      <label class="ssg-row">Music volume
        <input type="range" id="setMusic" min="0" max="1" step="0.05" value="${s.music}">
      </label>
      <label class="ssg-row">Sound effects
        <input type="range" id="setSfx" min="0" max="1" step="0.05" value="${s.sfx}">
      </label>
      <div class="ssg-buttons">
        <button class="ssg-btn" id="setCloud">${s.cloud ? '☁ Cloud sync: ON' : '☁ Enable cloud sync'}</button>
        <button class="ssg-btn" id="setInstall">📲 Install app</button>
        <button class="ssg-btn" id="setShot">📸 Screenshot</button>
        <button class="ssg-btn" id="setHelp">❓ How to play</button>
        <button class="ssg-btn" id="setShare">🔗 Share game</button>
        <button class="ssg-btn" id="setConsent">🍪 Ad choices</button>
      </div>
      ${s.cloud && s.cloudId ? `<p class="ssg-note">Sync ID: <code>${s.cloudId}</code> — enter it via Load Code on another device.</p>` : ''}
      <p class="ssg-note">Progress autosaves in your browser. Made with the real Super Sean 007 asset pack.</p>
    `);
    el.querySelector('.ssg-x').onclick = () => el.remove();
    el.querySelector('#setMusic').oninput = e => g() && g().setMusicVolume(parseFloat(e.target.value));
    el.querySelector('#setSfx').oninput = e => g() && g().setSfxVolume(parseFloat(e.target.value));
    el.querySelector('#setCloud').onclick = () => { g() && g().cloudSync(); el.remove(); };
    el.querySelector('#setInstall').onclick = () => { g() && g().install(); };
    el.querySelector('#setShot').onclick = () => { g() && g().screenshot(); el.remove(); };
    el.querySelector('#setHelp').onclick = () => { el.remove(); window.SSGOnboard(); };
    el.querySelector('#setShare').onclick = () => { el.remove(); window.SSGShare('game'); };
    el.querySelector('#setConsent').onclick = () => { window.SSGConsent && window.SSGConsent.reset(); el.remove(); };
  };

  /* ---------------- onboarding ---------------- */
  window.SSGOnboard = () => {
    const el = overlay('ssgOnboard', `
      <button class="ssg-x" aria-label="Close">×</button>
      <h2>Welcome to Asteria-007!</h2>
      <ul class="ssg-guide">
        <li><b>Move</b> with WASD / arrows or the on-screen D-pad.</li>
        <li><b>E</b> talks to people, opens chests, harvests trees &amp; rocks, and fishes ponds.</li>
        <li><b>Beat Moldor</b> in Mushroom Meadow to earn your homestead, then press <b>B</b> to build and <b>C</b> to craft.</li>
        <li><b>Q</b> quests &amp; achievements · <b>I</b> bag &amp; gear · <b>M</b> map.</li>
        <li><b>👥 Party</b> lets friends join your adventure online.</li>
      </ul>
      <p class="ssg-note">Your first quest: talk to <b>Elder Brightbeard</b> in the village.</p>
      <button class="ssg-btn primary" id="onbGo">Let's go!</button>
    `);
    el.querySelector('.ssg-x').onclick = () => el.remove();
    el.querySelector('#onbGo').onclick = () => el.remove();
  };

  /* ---------------- sharing ---------------- */
  window.SSGShare = (kind, code) => {
    let text = 'Play Super Sean 007 — a free browser JRPG where you quest, craft and build your own homestead!';
    let url = SITE_URL;
    if (kind === 'party' && code) { text = `Join my Super Sean 007 co-op party! Code: ${code}`; url = SITE_URL; }
    if (window.SSGStats) window.SSGStats.track('share');
    if (navigator.share) {
      navigator.share({title: 'Super Sean 007', text, url}).catch(() => {});
      return;
    }
    const el = overlay('ssgShare', `
      <button class="ssg-x" aria-label="Close">×</button>
      <h2>Share Super Sean 007</h2>
      <p class="ssg-note">${text}</p>
      <div class="ssg-buttons">
        <a class="ssg-btn" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}">Share on X</a>
        <a class="ssg-btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a>
        <a class="ssg-btn" target="_blank" rel="noopener" href="https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent('Super Sean 007 — free browser JRPG')}">Reddit</a>
        <button class="ssg-btn" id="shareCopy">Copy link</button>
      </div>
    `);
    el.querySelector('.ssg-x').onclick = () => el.remove();
    el.querySelector('#shareCopy').onclick = () => {
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
        .then(() => { el.querySelector('#shareCopy').textContent = 'Copied!'; })
        .catch(() => window.prompt('Copy this link:', url));
    };
  };
})();
