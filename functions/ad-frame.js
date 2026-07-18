const AD_HOST = 'demolishwrestconclusions.com';
const NATIVE_KEY = 'ce88b3be674af35280aa2502234d5353';
const BANNERS = Object.freeze({
  'a4157228f205b7d03d165ecf28a4b3c8': {width: 728, height: 90},
  '3a031ce4ce53b5dd6030ac97fcf64f75': {width: 468, height: 60},
  '978406dc84c1b710ab8635624db3beb4': {width: 320, height: 50},
  'f999c41ff6862259f0c9d1d406dc29fb': {width: 300, height: 250},
  '48784386625737d309fc89aadd64bcde': {width: 160, height: 600},
  '1c892303912adafbd9f9fd8e8a19462f': {width: 160, height: 300}
});

function page(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="strict-origin-when-cross-origin"><base target="_blank"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}body{display:grid;place-items:start center}</style></head><body>${body}</body></html>`;
}

function response(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=300' : 'no-store',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https:; style-src 'unsafe-inline' https:; img-src data: blob: https:; connect-src https:; frame-src data: blob: https:; font-src data: https:; form-action https:; base-uri 'none'; frame-ancestors 'self' https://supersean007.com https://www.supersean007.com",
      'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive'
    }
  });
}

export async function onRequestGet({request}) {
  const unit = new URL(request.url).searchParams.get('unit') || '';
  if (unit === 'native') {
    return response(page(
      `<div id="container-${NATIVE_KEY}"></div>` +
      `<script async data-cfasync="false" src="https://${AD_HOST}/${NATIVE_KEY}/invoke.js"></script>`
    ));
  }

  const banner = BANNERS[unit];
  if (!banner) return response(page('<p>Unknown advertisement unit.</p>'), 400);
  const options = JSON.stringify({key: unit, format: 'iframe', height: banner.height, width: banner.width, params: {}}).replace(/</g, '\\u003c');
  return response(page(
    `<script>window.atOptions=${options};</script>` +
    `<script src="https://${AD_HOST}/${unit}/invoke.js"></script>`
  ));
}
