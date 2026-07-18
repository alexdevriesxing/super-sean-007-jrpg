(() => {
  'use strict';

  const production = !['localhost', '127.0.0.1', '::1'].includes(location.hostname);

  function announce(message) {
    window.dispatchEvent(new CustomEvent('ssg:announce', {detail: message}));
  }

  function harden() {
    const game = window.SuperSeanGame;
    if (!game) return false;

    if (game.debug?.startNgPlus && !game.startNewGamePlus) {
      const startNgPlus = game.debug.startNgPlus;
      game.startNewGamePlus = () => startNgPlus();
    }

    if (production && game.debug) {
      try { delete game.debug; } catch (error) { game.debug = undefined; }
    }

    const ads = game.adManager;
    if (ads && !ads.__commercialPolicyApplied) {
      ads.__commercialPolicyApplied = true;
      const originalReward = ads.showRewardedAd?.bind(ads);
      ads.showRewardedAd = (type, onSuccess) => {
        if (!ads.adsAvailable?.()) {
          const message = 'Rewarded ads are unavailable because advertising was blocked or could not load. Use the normal return-home option instead.';
          announce(message);
          window.alert(message);
          return false;
        }
        return originalReward ? originalReward(type, onSuccess) : false;
      };
      const originalCanShow = ads.canShowRewardedAd?.bind(ads);
      ads.canShowRewardedAd = type => Boolean(ads.adsAvailable?.() && originalCanShow?.(type));
    }

    window.SSGRuntimeInfo = Object.freeze({
      hardened: true,
      production,
      version: document.body.dataset.siteVersion || '1.3.0'
    });
    return true;
  }

  if (!harden()) {
    const timer = setInterval(() => {
      if (harden()) clearInterval(timer);
    }, 100);
    setTimeout(() => clearInterval(timer), 15000);
  }
})();
