# Adsterra Integration

This project is prepared for Adsterra monetization, but it does not include production ad scripts, ad unit IDs or third-party tracking code.

## Config Files

- `data/ad-config.json` controls placement metadata, cooldowns and safe interstitial reasons.
- `src/config/ads.ts` documents the future typed config surface.
- `game.js` exposes `AdManager` through `window.SuperSeanGame.adManager`.

## Website Placements

The HTML uses `data-adsterra-placement` attributes:

- `top-banner-728x90` - header/banner placement.
- `game-sidebar-native` - game sidebar/native placement.
- `content-native-responsive` - in-content responsive/native placement.
- `below-game-responsive` - below-game responsive placement.
- `footer-banner-responsive` - footer responsive placement.

Paste future Adsterra script snippets into the matching containers or initialize them from one loader script that reads `data/ad-config.json`.

## In-Game Reward Hooks

The game supports:

- `showRewardedAd('daily_chest')`
- `showRewardedAd('revive')`
- `showRewardedAd('post_battle_bonus')`
- `showInterstitial(reason)`
- `canShowRewardedAd(type)`
- `showBanner(placement)`
- `hideBanner(placement)`

Current behavior is a safe fallback placeholder. Rewards complete locally so the game remains playable when ad scripts are absent.

## Safe Timing Rules

Interstitial hooks should only fire at natural breaks:

- Dungeon completion.
- Boss victory.
- Returning to village after enough time has passed.

Do not show interstitials:

- During combat turns.
- During cutscenes.
- During dialogue.
- Immediately after page load.
- On every map change.

## CSP Notes

`_headers` currently uses a conservative self-hosted CSP with inline support for this static build. Once Adsterra provides production domains, update:

- `script-src`
- `frame-src`
- `img-src`
- `connect-src`

Document every added third-party domain before launch.
