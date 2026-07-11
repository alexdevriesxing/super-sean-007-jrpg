/* Super Sean 007 — consent gate + cookieless analytics bootstrap.
   Loads FIRST (before ads.js). Ads (third-party, cookie-dropping) load only
   after the visitor accepts. Analytics is first-party and cookieless, so it
   runs regardless of the ad choice. */
(() => {
  'use strict';

  const CONSENT_KEY = 'super-sean-007-consent';
  const api = {
    read() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } },
    write(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {} }
  };

  /* ---------- cookieless analytics (no consent required) ---------- */
  const Stats = {
    sent: new Set(),
    beacon(event, once) {
      if (once && this.sent.has(event)) return;
      this.sent.add(event);
      try {
        const body = JSON.stringify({event});
        if (navigator.sendBeacon) navigator.sendBeacon('/api/stat', new Blob([body], {type: 'application/json'}));
        else fetch('/api/stat', {method: 'POST', headers: {'content-type': 'application/json'}, body, keepalive: true}).catch(() => {});
      } catch (e) {}
    }
  };
  window.SSGStats = {track: (event, once = false) => Stats.beacon(event, once)};
  // Page view once per load.
  Stats.beacon('pageview', true);

  /* ---------- ad consent gate ---------- */
  function loadAds() {
    if (window.__ssgAdsLoaded) return;
    window.__ssgAdsLoaded = true;
    const script = document.createElement('script');
    script.src = 'ads.js';
    script.defer = true;
    document.body.appendChild(script);
  }

  function removeBanner() {
    const el = document.getElementById('consentBanner');
    if (el) el.remove();
  }

  function showBanner() {
    if (document.getElementById('consentBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'consentBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie and ads consent');
    banner.innerHTML = `
      <div class="consent-inner">
        <p>Super Sean 007 is free thanks to ads. We use our own cookieless analytics, and — with your OK — third-party ads (Adsterra) that may set cookies. Your game progress stays in your browser.</p>
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
  if (decision === 'accepted') {
    loadAds();
  } else if (decision === 'declined') {
    // respect the choice; no ads this session
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner, {once: true});
    } else {
      showBanner();
    }
  }
})();
