/* Party Link signaling for Super Sean 007 co-op (Cloudflare Pages Function + KV).
   Only used for the WebRTC handshake — gameplay traffic is peer-to-peer.
   Keys: party:CODE:offer:SLOT and party:CODE:answer:SLOT, TTL 10 minutes. */

const CODE_PATTERN = /^[A-Z0-9]{6}$/;
const MAX_SDP_BYTES = 40_000;
const TTL_SECONDS = 600;
const MAX_SLOTS = 3;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json', 'cache-control': 'no-store', ...CORS}
  });
}

function params(request) {
  const url = new URL(request.url);
  return {
    code: url.searchParams.get('code') || '',
    action: url.searchParams.get('action') || '',
    slot: parseInt(url.searchParams.get('slot') || '0', 10)
  };
}

export function onRequestOptions() {
  return new Response(null, {status: 204, headers: CORS});
}

export async function onRequestGet({request, env}) {
  const {code, action, slot} = params(request);
  if (!CODE_PATTERN.test(code)) return json({error: 'invalid code'}, 400);
  if (action === 'offers') {
    const offers = {};
    for (let n = 1; n <= MAX_SLOTS; n++) {
      const value = await env.SSG_SAVES.get(`party:${code}:offer:${n}`);
      if (value) offers[n] = JSON.parse(value);
    }
    return json({offers});
  }
  if (action === 'answer') {
    if (slot < 1 || slot > MAX_SLOTS) return json({error: 'invalid slot'}, 400);
    const value = await env.SSG_SAVES.get(`party:${code}:answer:${slot}`);
    if (!value) return json({error: 'not ready'}, 404);
    return new Response(value, {headers: {'content-type': 'application/json', 'cache-control': 'no-store', ...CORS}});
  }
  return json({error: 'unknown action'}, 400);
}

export async function onRequestPost({request, env}) {
  const {code, action, slot} = params(request);
  if (!CODE_PATTERN.test(code)) return json({error: 'invalid code'}, 400);
  const text = await request.text();
  if (!text || text.length > MAX_SDP_BYTES) return json({error: 'payload too large'}, 413);
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    return json({error: 'invalid json'}, 400);
  }
  if (typeof payload.sdp !== 'string' || payload.sdp.length < 10) return json({error: 'missing sdp'}, 400);

  if (action === 'offer') {
    for (let n = 1; n <= MAX_SLOTS; n++) {
      const taken = await env.SSG_SAVES.get(`party:${code}:offer:${n}`);
      if (!taken) {
        await env.SSG_SAVES.put(`party:${code}:offer:${n}`, JSON.stringify({
          sdp: payload.sdp,
          name: String(payload.name || 'Friend').slice(0, 20)
        }), {expirationTtl: TTL_SECONDS});
        return json({ok: true, slot: n});
      }
    }
    return json({error: 'party full'}, 409);
  }
  if (action === 'answer') {
    if (slot < 1 || slot > MAX_SLOTS) return json({error: 'invalid slot'}, 400);
    await env.SSG_SAVES.put(`party:${code}:answer:${slot}`, JSON.stringify({
      sdp: payload.sdp,
      char: String(payload.char || 'dave').slice(0, 12)
    }), {expirationTtl: TTL_SECONDS});
    return json({ok: true});
  }
  return json({error: 'unknown action'}, 400);
}
