(() => {
  'use strict';

  async function loadTurn() {
    try {
      const response = await fetch('/api/turn', {credentials: 'same-origin', cache: 'no-store'});
      if (!response.ok) return;
      const payload = await response.json();
      if (Array.isArray(payload.iceServers) && payload.iceServers.length) {
        window.SSG_TURN = payload.iceServers;
        window.SSGTurnStatus = {configured: true, expiresAt: payload.expiresAt || null};
      }
    } catch (error) {
      window.SSGTurnStatus = {configured: false, error: 'unavailable'};
    }
  }

  window.SSGTurnStatus = {configured: false, loading: true};
  loadTurn().finally(() => { window.SSGTurnStatus.loading = false; });
})();
