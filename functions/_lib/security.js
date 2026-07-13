const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.supersean007.com',
  'https://supersean007.com'
];

function configuredOrigins(env) {
  const configured = String(env?.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}

export function allowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  const requestOrigin = new URL(request.url).origin;
  return origin === requestOrigin || configuredOrigins(env).has(origin) ? origin : '';
}

export function corsHeaders(request, env, methods = 'GET, POST, PUT, OPTIONS') {
  const origin = allowedOrigin(request, env);
  if (!origin) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': methods,
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '600',
    'vary': 'Origin'
  };
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers
    }
  });
}

export function preflight(request, env, methods) {
  if (allowedOrigin(request, env) === '') {
    return json({error: 'origin not allowed'}, 403);
  }
  return new Response(null, {status: 204, headers: corsHeaders(request, env, methods)});
}

export function enforceSameOrigin(request, env) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return null;
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (origin && allowedOrigin(request, env) === '') {
    return json({error: 'origin not allowed'}, 403);
  }
  if (!origin && fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    return json({error: 'cross-site request blocked'}, 403);
  }
  return null;
}

function safeEqual(left, right) {
  const a = new TextEncoder().encode(String(left || ''));
  const b = new TextEncoder().encode(String(right || ''));
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    mismatch |= (a[i % Math.max(1, a.length)] || 0) ^ (b[i % Math.max(1, b.length)] || 0);
  }
  return mismatch === 0;
}

export function isAdmin(request, env) {
  const expected = String(env?.ADMIN_TOKEN || '');
  if (!expected) return false;
  const authorization = request.headers.get('authorization') || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  return safeEqual(supplied, expected);
}

export function requireAdmin(request, env) {
  if (!env?.ADMIN_TOKEN) {
    return json({error: 'admin diagnostics are not configured'}, 503);
  }
  if (!isAdmin(request, env)) {
    return json(
      {error: 'admin authorization required'},
      401,
      {'www-authenticate': 'Bearer realm="Super Sean 007 diagnostics"'}
    );
  }
  return null;
}

async function clientFingerprint(request) {
  const source = (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest).slice(0, 12), value => value.toString(16).padStart(2, '0')).join('');
}

export async function rateLimit(env, request, bucket, limit, windowSeconds) {
  const store = env?.SSG_RATE_LIMIT || env?.SSG_SAVES;
  if (!store) return null;
  const windowId = Math.floor(Date.now() / 1000 / windowSeconds);
  const fingerprint = await clientFingerprint(request);
  const key = `ratelimit:${bucket}:${windowId}:${fingerprint}`;
  const count = Number(await store.get(key)) || 0;
  if (count >= limit) {
    return json(
      {error: 'rate limit exceeded'},
      429,
      {'retry-after': String(windowSeconds)}
    );
  }
  await store.put(key, String(count + 1), {expirationTtl: windowSeconds + 60});
  return null;
}

export function storeFor(env, preferred) {
  return env?.[preferred] || env?.SSG_SAVES || null;
}
