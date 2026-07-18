/* Super Sean 007 — versioned consent, cookieless analytics and privacy-safe diagnostics. */
(() => {
  'use strict';

  const CONSENT_KEY = 'super-sean-007-consent';
  const CONSENT_VERSION = '2026-07-13-v2';
  const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;

  const consent = {
    read() {
      return {choice: 'accepted', version: CONSENT_VERSION, at: Date.now()};
    },
    write(choice) {},
    clear() {}
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

  function removeBanner() {}
  function showBanner() {}

  window.SSGConsent = {
    reset() {},
    status: () => 'accepted',
    version: CONSENT_VERSION
  };

  loadAds();
})();
