/* Super Sean 007 — postgame achievement extension, loaded before game.js. */
(() => {
  'use strict';
  window.SSG = window.SSG || {};
  const originalCreateSystems = SSG.createSystems;
  if (typeof originalCreateSystems !== 'function') return;

  SSG.createSystems = ctx => {
    const api = originalCreateSystems(ctx);
    const originalCheck = api.checkAchievements;

    api.checkAchievements = () => {
      originalCheck();
      const state = ctx.state();
      state.achievements = state.achievements || {};
      const conditions = {
        frostpeak_clear: Boolean(state.defeatedBosses?.fp_boss),
        sunsand_clear: Boolean(state.defeatedBosses?.ss_boss),
        postgame_clear: state.quest?.id === 'postgame_legend' || Boolean(state.defeatedBosses?.ss_boss)
      };
      for (const definition of SSG.ACHIEVEMENTS.filter(item => Object.hasOwn(conditions, item.id))) {
        if (!conditions[definition.id] || state.achievements[definition.id]) continue;
        state.achievements[definition.id] = Date.now();
        ctx.showToast(`Achievement unlocked: ${definition.label}!`);
        ctx.emote('happy');
        ctx.sfx('level_up');
      }
    };

    return api;
  };
})();
