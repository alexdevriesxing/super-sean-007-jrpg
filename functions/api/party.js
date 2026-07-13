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
const METHODS = 'GET, POST, DELETE, OPTIONS';
const CHARS = new Set(['dave', 'petroman', 'ruush', 'haraku']);

function params(request) {
  const url = new URL(request.url);
  return {
    code: url.searchParams.get('code') || '',
    action: url.searchParams.get('action') || '',
    slot: parseInt(url.searchParams.get('slot') || '0', 10)
  };
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

async function hostExists(store, code) {
  return Boolean(await store.get(`party:${code}:host`));
}

export function onRequestOptions({request, env}) {
  return preflight(request, env, METHODS);
}

export async function onRequestGet({request, env}) {
  const limited = await rateLimit(env, request, 'party-read', 90, 60);
  if (limited) return limited;
  const store = storeFor(env, 'SSG_PARTY');
  if (!store) return json({error: 'party storage unavailable'}, 503);

  const {code, action, slot} = params(request);
  if (!CODE_PATTERN.test(code)) return json({error: 'invalid code'}, 400, corsHeaders(request, env, METHODS));
  if (!(await hostExists(store, code))) return json({error: 'party not found'}, 404, corsHeaders(request, env, METHODS));

  if (action === 'status') return json({ok: true, active: true}, 200, corsHeaders(request, env, METHODS));

  if (action === 'offers') {
    const offers = {};
    for (let n = 1; n <= MAX_SLOTS; n += 1) {
      const key = `party:${code}:offer:${n}`;
      const value = await store.get(key);
      if (!value) continue;
      try { offers[n] = JSON.parse(value); } catch (error) {}
      await store.delete(key);
    }
    return json({offers}, 200, corsHeaders(request, env, METHODS));
  }

  if (action === 'answer') {
    if (slot < 1 || slot > MAX_SLOTS) return json({error: 'invalid slot'}, 400, corsHeaders(request, env, METHODS));
    const key = `party:${code}:answer:${slot}`;
    const value = await store.get(key);
    if (!value) return json({error: 'not ready'}, 404, corsHeaders(request, env, METHODS));
    await store.delete(key);
    return new Response(value, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        ...corsHeaders(request, env, METHODS)
      }
    });
  }
  return json({error: 'unknown action'}, 400, corsHeaders(request, env, METHODS));
}

export async function onRequestPost({request, env}) {
  const originError = enforceSameOrigin(request, env);
  if (originError) return originError;
  const limited = await rateLimit(env, request, 'party-write', 45, 60);
  if (limited) return limited;
  const store = storeFor(env, 'SSG_PARTY');
  if (!store) return json({error: 'party storage unavailable'}, 503);

  const {code, action, slot} = params(request);
  if (!CODE_PATTERN.test(code)) return json({error: 'invalid code'}, 400, corsHeaders(request, env, METHODS));

  if (action === 'host') {
    if (await hostExists(store, code)) return json({error: 'code taken'}, 409, corsHeaders(request, env, METHODS));
    await store.put(`party:${code}:host`, String(Date.now()), {expirationTtl: TTL_SECONDS});
    return json({ok: true, expiresIn: TTL_SECONDS}, 200, corsHeaders(request, env, METHODS));
  }

  if (!(await hostExists(store, code))) return json({error: 'party not found'}, 404, corsHeaders(request, env, METHODS));

  const text = await request.text();
  if (!text || byteLength(text) > MAX_SDP_BYTES) {
    return json({error: 'payload too large'}, 413, corsHeaders(request, env, METHODS));
  }
  let payload;
  try { payload = JSON.parse(text); }
  catch (error) { return json({error: 'invalid json'}, 400, corsHeaders(request, env, METHODS)); }
  if (typeof payload.sdp !== 'string' || payload.sdp.length < 10 || byteLength(payload.sdp) > MAX_SDP_BYTES) {
    return json({error: 'invalid sdp'}, 400, corsHeaders(request, env, METHODS));
  }

  if (action === 'offer') {
    for (let n = 1; n <= MAX_SLOTS; n += 1) {
      const offerKey = `party:${code}:offer:${n}`;
      const answerKey = `party:${code}:answer:${n}`;
      const [offer, answer] = await Promise.all([store.get(offerKey), store.get(answerKey)]);
      if (!offer && !answer) {
        await store.put(offerKey, JSON.stringify({
          sdp: payload.sdp,
          name: String(payload.name || 'Friend').replace(/[<>]/g, '').slice(0, 20)
        }), {expirationTtl: TTL_SECONDS});
        return json({ok: true, slot: n}, 200, corsHeaders(request, env, METHODS));
      }
    }
    return json({error: 'party full'}, 409, corsHeaders(request, env, METHODS));
  }

  if (action === 'answer') {
    if (slot < 1 || slot > MAX_SLOTS) return json({error: 'invalid slot'}, 400, corsHeaders(request, env, METHODS));
    const char = CHARS.has(payload.char) ? payload.char : 'dave';
    await store.put(`party:${code}:answer:${slot}`, JSON.stringify({sdp: payload.sdp, char}), {expirationTtl: TTL_SECONDS});
    return json({ok: true}, 200, corsHeaders(request, env, METHODS));
  }
  return json({error: 'unknown action'}, 400, corsHeaders(request, env, METHODS));
}

export async function onRequestDelete({request, env}) {
  const originError = enforceSameOrigin(request, env);
  if (originError) return originError;
  const limited = await rateLimit(env, request, 'party-delete', 12, 60);
  if (limited) return limited;
  const store = storeFor(env, 'SSG_PARTY');
  if (!store) return json({error: 'party storage unavailable'}, 503);

  const {code} = params(request);
  if (!CODE_PATTERN.test(code)) return json({error: 'invalid code'}, 400, corsHeaders(request, env, METHODS));
  await Promise.all([
    store.delete(`party:${code}:host`),
    ...Array.from({length: MAX_SLOTS}, (_, index) => index + 1).flatMap(slot => [
      store.delete(`party:${code}:offer:${slot}`),
      store.delete(`party:${code}:answer:${slot}`)
    ])
  ]);
  return json({ok: true, closed: true}, 200, corsHeaders(request, env, METHODS));
}
