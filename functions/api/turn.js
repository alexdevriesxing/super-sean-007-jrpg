import {json, rateLimit} from '../_lib/security.js';

const DEFAULT_TTL = 3600;

function base64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function onRequestGet({request, env}) {
  const limited = await rateLimit(env, request, 'turn-credentials', 20, 3600);
  if (limited) return limited;

  const secret = String(env?.TURN_SHARED_SECRET || '');
  const urls = String(env?.TURN_URLS || '')
    .split(',')
    .map(value => value.trim())
    .filter(value => /^turns?:/i.test(value));
  if (!secret || !urls.length) {
    return json({error: 'TURN relay is not configured'}, 503);
  }

  const ttl = Math.min(86_400, Math.max(600, Number(env?.TURN_TTL_SECONDS) || DEFAULT_TTL));
  const expires = Math.floor(Date.now() / 1000) + ttl;
  const nonce = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
  const username = `${expires}:ssg-${nonce}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name: 'HMAC', hash: 'SHA-1'},
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(username));
  const credential = base64(new Uint8Array(signature));

  return json({
    iceServers: [{urls, username, credential}],
    expiresAt: new Date(expires * 1000).toISOString()
  });
}
