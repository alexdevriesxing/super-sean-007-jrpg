/* Super Sean 007 — versioned consent, cookieless analytics and privacy-safe diagnostics. */
(() => {
  'use strict';

  const CONSENT_KEY = 'super-sean-007-consent';
  const CONSENT_VERSION = '2026-07-13-v2';
  const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;

  const consent = {
    read() {
      try {
        const raw = localStorage.getItem(CONSENT_KEY);
        if (!raw) return null;
        if (raw === 'accepted' || raw === 'declined') return null; // legacy choice must be renewed
        const record = JSON.parse(raw);
        if (!record || record.version !== CONSENT_VERSION || !['accepted', 'declined'].includes(record.choice)) return null;
        if (Date.now() - Number(record.at || 0) > CONSENT_MAX_AGE) return null;
        return record;
      } catch (error) { return null; }
    },
    write(choice) {
      try { localStorage.setItem(CONSENT_KEY, JSON.stringify({choice, version: CONSENT_VERSION, at: Date.now()})); }
      catch (error) {}
    },
    clear() { try { localStorage.removeItem(CONSENT_KEY); } catch (error) {} }
  };

  const Stats = {
    sent: new Set(), queue: [], timer: null,
    track(event, once) {
      if (once) {
        if (this.sent.has(event)) return;
        this.sent.add(event);
      }
      this.queue.push(event);
      if (this.queue.length >= 20) { this.flush(); return; }
      if (!this.timer) this.timer = setTimeout(() => this.flush(), 20000);
    },
    flush(useBeacon) {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (!this.queue.length) return;
      const events = this.queue.splice(0, 50);
      try {
        const body = JSON.stringify({events});
        if (useBeacon && navigator.sendBeacon) navigator.sendBeacon('/api/stat', new Blob([body], {type: 'application/json'}));
        else fetch('/api/stat', {method: 'POST', headers: {'content-type': 'application/json'}, body, keepalive: true, credentials: 'same-origin'}).catch(() => {});
      } catch (error) {}
    }
  };
  window.SSGStats = {track: (event, once = false) => Stats.track(event, once)};
  document.addEventListener('visibilitychange', () => { if (document.hidden) Stats.flush(true); });
  window.addEventListener('pagehide', () => Stats.flush(true));
  Stats.track('pageview', true);

  function gameScene() {
    try { return JSON.parse(window.render_game_to_text?.() || '{}').scene || ''; }
    catch (error) { return ''; }
  }

  let errCount = 0;
  function reportError(message, url, line, stack) {
    if (errCount >= 5 || !message) return;
    errCount += 1;
    try {
      fetch('/api/err', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({
          msg: String(message).slice(0, 500),
          url: String(url || location.pathname).slice(0, 500),
          line: line || 0,
          stack: String(stack || '').slice(0, 1200),
          version: document.body.dataset.siteVersion || '',
          scene: gameScene()
        })
      }).catch(() => {});
    } catch (error) {}
  }
  window.addEventListener('error', event => reportError(event.message, event.filename, event.lineno, event.error?.stack));
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    reportError(`unhandledrejection: ${reason && (reason.message || reason)}`, location.pathname, 0, reason?.stack);
  });

  function loadAds() {
    if (window.__ssgAdsLoaded) return;
    window.__ssgAdsLoaded = true;
    const script = document.createElement('script');
    script.src = 'ads.js';
    script.defer = true;
    document.body.appendChild(script);
  }

  function removeBanner() { document.getElementById('consentBanner')?.remove(); }

  function showBanner() {
    if (document.getElementById('consentBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'consentBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'true');
    banner.setAttribute('aria-label', 'Advertising consent');
    banner.innerHTML = `
      <div class="consent-inner">
        <p>Super Sean 007 uses aggregate, cookieless first-party analytics. With your permission, sandboxed third-party Adsterra units may set cookies for advertising and measurement. Progress stays in your browser by default and is uploaded to Cloudflare only when you enable Cloud Sync. <a href="privacy.html" style="color:#7cecff">Privacy Policy</a>.</p>
        <div class="consent-actions">
          <button type="button" class="consent-btn decline" id="consentDecline">Play without third-party ads</button>
          <button type="button" class="consent-btn accept" id="consentAccept">Accept advertising</button>
        </div>
      </div>`;
    document.body.appendChild(banner);
    document.getElementById('consentAccept').addEventListener('click', () => {
      consent.write('accepted'); removeBanner(); loadAds();
    });
    document.getElementById('consentDecline').addEventListener('click', () => {
      consent.write('declined'); removeBanner();
    });
    requestAnimationFrame(() => document.getElementById('consentDecline')?.focus());
  }

  window.SSGConsent = {
    reset() { consent.clear(); showBanner(); },
    status: () => consent.read()?.choice || null,
    version: CONSENT_VERSION
  };

  const decision = consent.read()?.choice;
  if (decision === 'accepted') loadAds();
  else if (decision !== 'declined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showBanner, {once: true});
    else showBanner();
  }
})();
