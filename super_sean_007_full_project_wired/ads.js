(() => {
  'use strict';

  // Banners execute on the project's stable pages.dev origin. That gives the
  // provider the cookie-capable document it requires while keeping it
  // cross-origin from game localStorage, cloud-sync IDs and credentials.
  const AD_HOST = 'demolishwrestconclusions.com';
  const AD_FRAME_ORIGIN = 'https://super-sean-007-jrpg.pages.dev';

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
    if (width >= 728) return BANNER_UNITS.leaderboard728;
    if (width >= 468) return BANNER_UNITS.banner468;
    return BANNER_UNITS.mobile320;
  }

  function pickSkyscraper() {
    return window.matchMedia('(min-width: 1061px)').matches
      ? BANNER_UNITS.sky160x600
      : BANNER_UNITS.sky160x300;
  }

  function createSandbox(slot, width, height, unitId, loading = 'lazy') {
    const available = Math.max(1, slotWidth(slot));
    const scale = Math.min(1, available / width);
    const holder = document.createElement('div');
    holder.className = 'ad-frame-holder';
    holder.style.width = `${Math.ceil(width * scale)}px`;
    holder.style.height = `${Math.ceil(height * scale)}px`;
    holder.style.overflow = 'hidden';
    holder.style.marginInline = 'auto';

    const frame = document.createElement('iframe');
    frame.width = String(width);
    frame.height = String(height);
    frame.title = 'Advertisement';
    frame.loading = loading;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('scrolling', 'no');
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
    frame.style.border = '0';
    frame.style.display = 'block';
    frame.style.transformOrigin = 'top left';
    if (scale < 1) frame.style.transform = `scale(${scale})`;
    holder.appendChild(frame);
    slot.replaceChildren(holder);
    slot.dataset.adLoaded = 'true';
    slot.dataset.adUnit = `${unitId}:${width}x${height}:${scale.toFixed(3)}`;
    slot.dataset.adStatus = 'loading';
    frame.addEventListener('load', () => { slot.dataset.adStatus = 'ready'; }, {once: true});
    return frame;
  }

  function loadFrame(frame, unitId) {
    frame.src = `${AD_FRAME_ORIGIN}/ad-frame?unit=${encodeURIComponent(unitId)}`;
  }

  function renderBanner(slot, unit, loading = 'lazy') {
    try {
      const available = Math.max(1, slotWidth(slot));
      const signature = `${unit.key}:${unit.width}x${unit.height}:${Math.min(1, available / unit.width).toFixed(3)}`;
      if (slot.dataset.adUnit === signature && slot.querySelector('iframe')) return true;
      const frame = createSandbox(slot, unit.width, unit.height, unit.key, loading);
      loadFrame(frame, unit.key);
      return true;
    } catch (error) {
      console.warn('[Ads] Sandboxed banner failed', error);
      return false;
    }
  }

  function renderNative(slot) {
    try {
      const width = Math.min(NATIVE_BANNER.width, Math.max(300, Math.floor(slotWidth(slot))));
      const available = Math.max(1, slotWidth(slot));
      const signature = `${NATIVE_BANNER.containerId}:${width}x${NATIVE_BANNER.height}:${Math.min(1, available / width).toFixed(3)}`;
      if (slot.dataset.adUnit === signature && slot.querySelector('iframe')) return true;
      const frame = createSandbox(slot, width, NATIVE_BANNER.height, NATIVE_BANNER.containerId);
      loadFrame(frame, 'native');
      return true;
    } catch (error) {
      console.warn('[Ads] Sandboxed native unit failed', error);
      return false;
    }
  }

  function fillSlot(placement, slot) {
    switch (placement) {
      case 'top-banner-728x90':
        return renderBanner(slot, pickLeaderboard(slot), 'eager');
      case 'below-game-responsive':
      case 'footer-banner-responsive':
        return renderBanner(slot, pickLeaderboard(slot));
      case 'game-sidebar-native':
        return renderBanner(slot, BANNER_UNITS.box300, 'eager');
      case 'game-sidebar-skyscraper':
        return renderBanner(slot, pickSkyscraper(), 'eager');
      case 'content-native-responsive':
        return renderNative(slot);
      default:
        return false;
    }
  }

  function initAds() {
    document.querySelectorAll('[data-adsterra-placement]').forEach(slot => {
      const placement = slot.dataset.adsterraPlacement;
      if (!placement) return;
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
    window.__ssgAdsLoaded = true;
  }

  // The game uses the same isolated 300x250 renderer at safe reward breaks.
  window.SuperSeanAds = Object.freeze({
    renderBox(container) {
      return container instanceof Element
        ? renderBanner(container, BANNER_UNITS.box300, 'eager')
        : false;
    },
    isLoaded() { return Boolean(window.__ssgAdsLoaded); }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAds, {once: true});
  } else {
    initAds();
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initAds, 180);
  }, {passive: true});
})();
