import {
  corsHeaders,
  enforceSameOrigin,
  json,
  preflight,
  rateLimit
} from '../_lib/security.js';

const ID_PATTERN = /^[a-z0-9]{16,40}$/;
const MAX_SAVE_BYTES = 150_000;
const SAVE_TTL_SECONDS = 60 * 60 * 24 * 180;

function saveId(request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  return ID_PATTERN.test(id) ? id : null;
}

export function onRequestOptions({request, env}) {
  return preflight(request, env, 'GET, PUT, OPTIONS');
}

export async function onRequestGet({request, env}) {
  const limited = await rateLimit(env, request, 'save-read', 60, 60);
  if (limited) return limited;
  if (!env?.SSG_SAVES) return json({error: 'save storage unavailable'}, 503);

  const id = saveId(request);
  if (!id) return json({error: 'invalid id'}, 400, corsHeaders(request, env, 'GET, PUT, OPTIONS'));
  const value = await env.SSG_SAVES.get(id);
  if (!value) return json({error: 'not found'}, 404, corsHeaders(request, env, 'GET, PUT, OPTIONS'));
  return new Response(value, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...corsHeaders(request, env, 'GET, PUT, OPTIONS')
    }
  });
}

export async function onRequestPut({request, env}) {
  const originError = enforceSameOrigin(request, env);
  if (originError) return originError;
  const limited = await rateLimit(env, request, 'save-write', 20, 60);
  if (limited) return limited;
  if (!env?.SSG_SAVES) return json({error: 'save storage unavailable'}, 503);

  const id = saveId(request);
  if (!id) return json({error: 'invalid id'}, 400, corsHeaders(request, env, 'GET, PUT, OPTIONS'));
  const text = await request.text();
  if (!text || text.length > MAX_SAVE_BYTES) {
    return json({error: 'save too large'}, 413, corsHeaders(request, env, 'GET, PUT, OPTIONS'));
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return json({error: 'invalid json'}, 400, corsHeaders(request, env, 'GET, PUT, OPTIONS'));
  }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.version !== 'number' || !parsed.hero) {
    return json({error: 'not a valid save'}, 400, corsHeaders(request, env, 'GET, PUT, OPTIONS'));
  }

  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';
  if (!force) {
    const existingText = await env.SSG_SAVES.get(id);
    if (existingText) {
      try {
        const existing = JSON.parse(existingText);
        const existingAt = Number(existing.savedAt) || 0;
        const incomingAt = Number(parsed.savedAt) || 0;
        if (existingAt > incomingAt + 2000) {
          return json(
            {error: 'conflict', savedAt: existingAt, message: 'A newer save exists in the cloud.'},
            409,
            corsHeaders(request, env, 'GET, PUT, OPTIONS')
          );
        }
      } catch (error) {
        // A malformed old value may be safely replaced by a valid save.
      }
    }
  }

  await env.SSG_SAVES.put(id, text, {expirationTtl: SAVE_TTL_SECONDS});
  return json(
    {ok: true, savedAt: Number(parsed.savedAt) || Date.now()},
    200,
    corsHeaders(request, env, 'GET, PUT, OPTIONS')
  );
}
