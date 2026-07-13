import {
  corsHeaders,
  enforceSameOrigin,
  json,
  preflight,
  rateLimit,
  storeFor
} from '../_lib/security.js';

const CODE_PATTERN = /^[A-Z0-9]{6}$/;
const MAX_SDP_BYTES = 40_000;
const TTL_SECONDS = 600;
const MAX_SLOTS = 3;

function params(request) {
  const url = new URL(request.url);
  return {
    code: url.searchParams.get('code') || '',
    action: url.searchParams.get('action') || '',
    slot: parseInt(url.searchParams.get('slot') || '0', 10)
  };
}

export function onRequestOptions({request, env}) {
  return preflight(request, env, 'GET, POST, OPTIONS');
}

export async function onRequestGet({request, env}) {
  const limited = await rateLimit(env, request, 'party-read', 90, 60);
  if (limited) return limited;
  const store = storeFor(env, 'SSG_PARTY');
  if (!store) return json({error: 'party storage unavailable'}, 503);

  const {code, action, slot} = params(request);
  if (!CODE_PATTERN.test(code)) return json({error: 'invalid code'}, 400, corsHeaders(request, env));
  if (action === 'offers') {
    const offers = {};
    for (let n = 1; n <= MAX_SLOTS; n += 1) {
      const value = await store.get(`party:${code}:offer:${n}`);
      if (value) offers[n] = JSON.parse(value);
    }
    return json({offers}, 200, corsHeaders(request, env));
  }
  if (action === 'answer') {
    if (slot < 1 || slot > MAX_SLOTS) return json({error: 'invalid slot'}, 400, corsHeaders(request, env));
    const value = await store.get(`party:${code}:answer:${slot}`);
    if (!value) return json({error: 'not ready'}, 404, corsHeaders(request, env));
    return new Response(value, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...corsHeaders(request, env)
      }
    });
  }
  return json({error: 'unknown action'}, 400, corsHeaders(request, env));
}

export async function onRequestPost({request, env}) {
  const originError = enforceSameOrigin(request, env);
  if (originError) return originError;
  const limited = await rateLimit(env, request, 'party-write', 45, 60);
  if (limited) return limited;
  const store = storeFor(env, 'SSG_PARTY');
  if (!store) return json({error: 'party storage unavailable'}, 503);

  const {code, action, slot} = params(request);
  if (!CODE_PATTERN.test(code)) return json({error: 'invalid code'}, 400, corsHeaders(request, env));

  if (action === 'host') {
    const existing = await store.get(`party:${code}:host`);
    if (existing) return json({error: 'code taken'}, 409, corsHeaders(request, env));
    await store.put(`party:${code}:host`, String(Date.now()), {expirationTtl: TTL_SECONDS});
    return json({ok: true}, 200, corsHeaders(request, env));
  }

  const text = await request.text();
  if (!text || text.length > MAX_SDP_BYTES) {
    return json({error: 'payload too large'}, 413, corsHeaders(request, env));
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    return json({error: 'invalid json'}, 400, corsHeaders(request, env));
  }
  if (typeof payload.sdp !== 'string' || payload.sdp.length < 10) {
    return json({error: 'missing sdp'}, 400, corsHeaders(request, env));
  }

  if (action === 'offer') {
    for (let n = 1; n <= MAX_SLOTS; n += 1) {
      const taken = await store.get(`party:${code}:offer:${n}`);
      if (!taken) {
        await store.put(`party:${code}:offer:${n}`, JSON.stringify({
          sdp: payload.sdp,
          name: String(payload.name || 'Friend').slice(0, 20)
        }), {expirationTtl: TTL_SECONDS});
        return json({ok: true, slot: n}, 200, corsHeaders(request, env));
      }
    }
    return json({error: 'party full'}, 409, corsHeaders(request, env));
  }

  if (action === 'answer') {
    if (slot < 1 || slot > MAX_SLOTS) return json({error: 'invalid slot'}, 400, corsHeaders(request, env));
    await store.put(`party:${code}:answer:${slot}`, JSON.stringify({
      sdp: payload.sdp,
      char: String(payload.char || 'dave').slice(0, 12)
    }), {expirationTtl: TTL_SECONDS});
    return json({ok: true}, 200, corsHeaders(request, env));
  }
  return json({error: 'unknown action'}, 400, corsHeaders(request, env));
}
