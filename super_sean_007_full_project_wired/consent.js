/* Super Sean 007 — consent gate and cookieless analytics bootstrap.
   Third-party advertising loads only after the visitor accepts. */
(() => {
  'use strict';

  const CONSENT_KEY = 'super-sean-007-consent';
  const api = {
    read() { try { return localStorage.getItem(CONSENT_KEY); } catch (error) { return null; } },
    write(value) { try { localStorage.setItem(CONSENT_KEY, value); } catch (error) {} }
  };

  const Stats = {
    sent: new Set(),
    queue: [],
    timer: null,
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
        if (useBeacon && navigator.sendBeacon) {
          navigator.sendBeacon('/api/stat', new Blob([body], {type: 'application/json'}));
        } else {
          fetch('/api/stat', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body,
            keepalive: true,
            credentials: 'same-origin'
          }).catch(() => {});
        }
      } catch (error) {}
    }
  };
  window.SSGStats = {track: (event, once = false) => Stats.track(event, once)};
  document.addEventListener('visibilitychange', () => { if (document.hidden) Stats.flush(true); });
  window.addEventListener('pagehide', () => Stats.flush(true));
  Stats.track('pageview', true);

  let errCount = 0;
  function reportError(message, url, line) {
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
          line: line || 0
        })
      }).catch(() => {});
    } catch (error) {}
  }
  window.addEventListener('error', event => reportError(event.message, event.filename, event.lineno));
  window.addEventListener('unhandledrejection', event => {
    reportError(`unhandledrejection: ${event.reason && (event.reason.message || event.reason)}`, location.pathname, 0);
  });

  function loadAds() {
    if (window.__ssgAdsLoaded) return;
    window.__ssgAdsLoaded = true;
    const script = document.createElement('script');
    script.src = 'ads.js';
    script.defer = true;
    document.body.appendChild(script);
  }

  function removeBanner() {
    document.getElementById('consentBanner')?.remove();
  }

  function showBanner() {
    if (document.getElementById('consentBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'consentBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie and ads consent');
    banner.innerHTML = `
      <div class="consent-inner">
        <p>Super Sean 007 is free thanks to ads. We use aggregate, cookieless first-party analytics and — with your permission — third-party Adsterra ads that may set cookies. Progress stays in your browser by default and is uploaded to Cloudflare only when you enable Cloud Sync. <a href="privacy.html" style="color:#7cecff">Privacy Policy</a>.</p>
        <div class="consent-actions">
          <button type="button" class="consent-btn decline" id="consentDecline">Play without ad cookies</button>
          <button type="button" class="consent-btn accept" id="consentAccept">Accept &amp; play</button>
        </div>
      </div>`;
    document.body.appendChild(banner);
    document.getElementById('consentAccept').addEventListener('click', () => {
      api.write('accepted');
      removeBanner();
      loadAds();
    });
    document.getElementById('consentDecline').addEventListener('click', () => {
      api.write('declined');
      removeBanner();
    });
  }

  window.SSGConsent = {
    reset() { api.write(''); showBanner(); },
    status: () => api.read()
  };

  const decision = api.read();
  if (decision === 'accepted') loadAds();
  else if (decision !== 'declined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showBanner, {once: true});
    else showBanner();
  }
})();
