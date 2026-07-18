(() => {
  'use strict';

  // Every third-party ad executes inside a sandboxed opaque-origin iframe.
  // The frame deliberately omits allow-same-origin, so ad scripts cannot read
  // game localStorage, cloud-sync IDs, consent state or admin credentials.
  const AD_HOST = 'demolishwrestconclusions.com';

  const NATIVE_BANNER = {
    src: `https://${AD_HOST}/ce88b3be674af35280aa2502234d5353/invoke.js`,
    containerId: 'container-ce88b3be674af35280aa2502234d5353',
    width: 728,
    height: 260
  };

  const BANNER_UNITS = {
    leaderboard728: {key: 'a4157228f205b7d03d165ecf28a4b3c8', width: 728, height: 90},
    banner468: {key: '3a031ce4ce53b5dd6030ac97fcf64f75', width: 468, height: 60},
    mobile320: {key: '978406dc84c1b710ab8635624db3beb4', width: 320, height: 50},
    box300: {key: 'f999c41ff6862259f0c9d1d406dc29fb', width: 300, height: 250},
    sky160x600: {key: '48784386625737d309fc89aadd64bcde', width: 160, height: 600},
    sky160x300: {key: '1c892303912adafbd9f9fd8e8a19462f', width: 160, height: 300}
  };

  function slotWidth(slot) {
    const rect = slot.getBoundingClientRect();
    return rect.width || document.documentElement.clientWidth || 360;
  }

  function pickLeaderboard(slot) {
    const width = slotWidth(slot);
    if (width >= 760) return BANNER_UNITS.leaderboard728;
    if (width >= 500) return BANNER_UNITS.banner468;
    return BANNER_UNITS.mobile320;
  }

  function pickSkyscraper() {
    return window.matchMedia('(min-width: 1061px)').matches
      ? BANNER_UNITS.sky160x600
      : BANNER_UNITS.sky160x300;
  }

  function createSandbox(slot, width, height) {
    const frame = document.createElement('iframe');
    frame.width = String(width);
    frame.height = String(height);
    frame.title = 'Advertisement';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('scrolling', 'no');
    frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
    frame.style.border = '0';
    frame.style.maxWidth = '100%';
    frame.style.display = 'block';
    frame.style.marginInline = 'auto';
    slot.replaceChildren(frame);
    slot.dataset.adLoaded = 'true';
    return frame;
  }

  function writeFrame(frame, body) {
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta name="referrer" content="no-referrer"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>${body}</body></html>`);
    doc.close();
  }

  function renderBanner(slot, unit) {
    try {
      const frame = createSandbox(slot, unit.width, unit.height);
      const options = JSON.stringify({
        key: unit.key,
        format: 'iframe',
        height: unit.height,
        width: unit.width,
        params: {}
      }).replace(/</g, '\\u003c');
      writeFrame(frame,
        `<script>window.atOptions=${options};<\/script>` +
        `<script src="https://${AD_HOST}/${unit.key}/invoke.js"><\/script>`
      );
      return true;
    } catch (error) {
      console.warn('[Ads] Sandboxed banner failed', error);
      return false;
    }
  }

  function renderNative(slot) {
    try {
      const width = Math.min(NATIVE_BANNER.width, Math.max(320, Math.floor(slotWidth(slot))));
      const frame = createSandbox(slot, width, NATIVE_BANNER.height);
      writeFrame(frame,
        `<div id="${NATIVE_BANNER.containerId}"></div>` +
        `<script async data-cfasync="false" src="${NATIVE_BANNER.src}"><\/script>`
      );
      return true;
    } catch (error) {
      console.warn('[Ads] Sandboxed native unit failed', error);
      return false;
    }
  }

  function fillSlot(placement, slot) {
    switch (placement) {
      case 'top-banner-728x90':
      case 'below-game-responsive':
      case 'footer-banner-responsive':
        return renderBanner(slot, pickLeaderboard(slot));
      case 'game-sidebar-native':
        return renderBanner(slot, BANNER_UNITS.box300);
      case 'game-sidebar-skyscraper':
        return renderBanner(slot, pickSkyscraper());
      case 'content-native-responsive':
        return renderNative(slot);
      default:
        return false;
    }
  }

  function initAds() {
    document.querySelectorAll('[data-adsterra-placement]').forEach(slot => {
      const placement = slot.dataset.adsterraPlacement;
      if (!placement || slot.dataset.adLoaded === 'true') return;
      if (slot.offsetParent === null && getComputedStyle(slot).position !== 'fixed') return;
      fillSlot(placement, slot);
    });
    // Social Bar — floating overlay, loaded directly (not sandboxable).
    if (!document.getElementById('adsterra-social-bar')) {
      const sb = document.createElement('script');
      sb.id = 'adsterra-social-bar';
      sb.src = `https://${AD_HOST}/93/ed/a8/93eda8aa20c1ab61e0841c91645b40a1.js`;
      sb.defer = true;
      document.body.appendChild(sb);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAds, {once: true});
  } else {
    initAds();
  }
})();
