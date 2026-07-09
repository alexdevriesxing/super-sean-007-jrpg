# Adsterra Integration

Production Adsterra ad units are live on www.supersean007.com. `ads.js` is the single loader that fills every placement.

## Config Files

- `ads.js` - production loader: injects the Social Bar, Native Banner and responsive iframe banners.
- `data/ad-config.json` - documents the live unit keys, placement metadata, cooldowns and safe interstitial reasons.
- `game.js` exposes `AdManager` through `window.SuperSeanGame.adManager` for reward/interstitial pacing.

## Website Placements

The HTML uses `data-adsterra-placement` attributes; `ads.js` picks the banner size by slot width (728x90 / 468x60 / 320x50):

- `top-banner-728x90` - leaderboard below the hero (728x90 desktop, 320x50 mobile).
- `game-sidebar-native` - 300x250 box in the game sidebar.
- `game-sidebar-skyscraper` - desktop-only 160x600 (160x300 on medium layouts).
- `content-native-responsive` - Adsterra Native Banner in-content.
- `below-game-responsive` - responsive leaderboard below the game.
- `footer-banner-responsive` - responsive leaderboard above the footer.

The Social Bar script is injected once per page load and handles desktop and mobile automatically. Each `atOptions` banner is rendered inside its own iframe so multiple units never clash.

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

Adsterra serves from rotating domains, so `_headers` allows `https:` for `script-src`, `frame-src`, `img-src`, `connect-src`, `style-src` and `font-src` while keeping `default-src 'self'` and strict `base-uri`. Media stays self-hosted.
