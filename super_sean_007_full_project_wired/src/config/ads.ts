export const adConfig = {
  provider: 'Adsterra',
  enabled: false,
  configFile: 'data/ad-config.json',
  notes: [
    'Paste future Adsterra placement scripts into the matching data-adsterra-placement containers.',
    'Keep interstitials at natural breaks only: dungeon completion, boss victory, or returning to village.',
    'Update _headers Content-Security-Policy once the exact Adsterra script, frame, image, and connect domains are known.'
  ]
} as const;

export type AdPlacementId =
  | 'top-banner-728x90'
  | 'game-sidebar-native'
  | 'content-native-responsive'
  | 'below-game-responsive'
  | 'footer-banner-responsive';
