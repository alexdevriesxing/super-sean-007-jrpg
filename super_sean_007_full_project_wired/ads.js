(() => {
  'use strict';

  // Adsterra production ad units for www.supersean007.com.
  // Each banner runs inside its own iframe so multiple atOptions units
  // can coexist on one page without clobbering each other.
  const AD_HOST = 'demolishwrestconclusions.com';

  const SOCIAL_BAR_SRC = `https://${AD_HOST}/93/ed/a8/93eda8aa20c1ab61e0841c91645b40a1.js`;
  const NATIVE_BANNER = {
    src: `https://${AD_HOST}/ce88b3be674af35280aa2502234d5353/invoke.js`,
    containerId: 'container-ce88b3be674af35280aa2502234d5353'
  };

  const BANNER_UNITS = {
    leaderboard728: { key: 'a4157228f205b7d03d165ecf28a4b3c8', width: 728, height: 90 },
    banner468: { key: '3a031ce4ce53b5dd6030ac97fcf64f75', width: 468, height: 60 },
    mobile320: { key: '978406dc84c1b710ab8635624db3beb4', width: 320, height: 50 },
    box300: { key: 'f999c41ff6862259f0c9d1d406dc29fb', width: 300, height: 250 },
    sky160x600: { key: '48784386625737d309fc89aadd64bcde', width: 160, height: 600 },
    sky160x300: { key: '1c892303912adafbd9f9fd8e8a19462f', width: 160, height: 300 }
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
    const tallLayout = window.matchMedia('(min-width: 1061px)').matches;
    return tallLayout ? BANNER_UNITS.sky160x600 : BANNER_UNITS.sky160x300;
  }

  function renderBannerFrame(slot, unit) {
    try {
      const frame = document.createElement('iframe');
      frame.width = String(unit.width);
      frame.height = String(unit.height);
      frame.title = 'Advertisement';
      frame.setAttribute('scrolling', 'no');
      frame.style.border = '0';
      frame.style.maxWidth = '100%';
      frame.style.display = 'block';
      slot.textContent = '';
      slot.appendChild(frame);
      slot.dataset.adLoaded = 'true';
      const doc = frame.contentWindow.document;
      const options = JSON.stringify({
        key: unit.key,
        format: 'iframe',
        height: unit.height,
        width: unit.width,
        params: {}
      });
      doc.open();
      doc.write(
        '<!doctype html><html><head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>' +
        '<scr' + 'ipt>atOptions=' + options + ';</scr' + 'ipt>' +
        '<scr' + 'ipt src="https://' + AD_HOST + '/' + unit.key + '/invoke.js"></scr' + 'ipt>' +
        '</body></html>'
      );
      doc.close();
      return true;
    } catch (error) {
      console.warn('[Ads] Banner render failed', error);
      return false;
    }
  }

  function renderNative(slot) {
    try {
      slot.textContent = '';
      slot.dataset.adLoaded = 'true';
      const container = document.createElement('div');
      container.id = NATIVE_BANNER.containerId;
      slot.appendChild(container);
      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = NATIVE_BANNER.src;
      slot.appendChild(script);
      return true;
    } catch (error) {
      console.warn('[Ads] Native banner render failed', error);
      return false;
    }
  }

  function injectSocialBar() {
    try {
      const script = document.createElement('script');
      script.src = SOCIAL_BAR_SRC;
      document.body.appendChild(script);
    } catch (error) {
      console.warn('[Ads] Social bar inject failed', error);
    }
  }

  function fillSlot(placement, slot) {
    switch (placement) {
      case 'top-banner-728x90':
      case 'below-game-responsive':
      case 'footer-banner-responsive':
        return renderBannerFrame(slot, pickLeaderboard(slot));
      case 'game-sidebar-native':
        return renderBannerFrame(slot, BANNER_UNITS.box300);
      case 'game-sidebar-skyscraper':
        return renderBannerFrame(slot, pickSkyscraper());
      case 'content-native-responsive':
        return renderNative(slot);
      default:
        return false;
    }
  }

  function initAds() {
    const slots = document.querySelectorAll('[data-adsterra-placement]');
    slots.forEach(slot => {
      const placement = slot.dataset.adsterraPlacement;
      if (!placement || slot.dataset.adLoaded === 'true') return;
      // Skip slots hidden by responsive CSS (e.g. desktop-only skyscraper on mobile).
      if (slot.offsetParent === null && getComputedStyle(slot).position !== 'fixed') return;
      fillSlot(placement, slot);
    });
    injectSocialBar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAds, { once: true });
  } else {
    initAds();
  }
})();
