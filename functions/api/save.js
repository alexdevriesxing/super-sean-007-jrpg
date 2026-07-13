import {
  corsHeaders,
  enforceSameOrigin,
  json,
  preflight,
  rateLimit
} from '../_lib/security.js';
import {sanitizeSave} from '../_lib/save-schema.js';

const ID_PATTERN = /^[a-z0-9]{20,40}$/;
const MAX_SAVE_BYTES = 150_000;
const SAVE_TTL_SECONDS = 60 * 60 * 24 * 180;
const METHODS = 'GET, PUT, DELETE, OPTIONS';

function saveId(request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  return ID_PATTERN.test(id) ? id : null;
}

function bytes(text) {
  return new TextEncoder().encode(text).byteLength;
}

export function onRequestOptions({request, env}) {
  return preflight(request, env, METHODS);
}

export async function onRequestGet({request, env}) {
  const limited = await rateLimit(env, request, 'save-read', 60, 60);
  if (limited) return limited;
  if (!env?.SSG_SAVES) return json({error: 'save storage unavailable'}, 503);

  const id = saveId(request);
  if (!id) return json({error: 'invalid id'}, 400, corsHeaders(request, env, METHODS));
  const value = await env.SSG_SAVES.get(id);
  if (!value) return json({error: 'not found'}, 404, corsHeaders(request, env, METHODS));

  try {
    const clean = sanitizeSave(JSON.parse(value));
    return json(clean, 200, corsHeaders(request, env, METHODS));
  } catch (error) {
    console.error('[save] stored value is invalid', error);
    return json({error: 'stored save is invalid'}, 500, corsHeaders(request, env, METHODS));
  }
}

export async function onRequestPut({request, env}) {
  const originError = enforceSameOrigin(request, env);
  if (originError) return originError;
  const limited = await rateLimit(env, request, 'save-write', 20, 60);
  if (limited) return limited;
  if (!env?.SSG_SAVES) return json({error: 'save storage unavailable'}, 503);

  const id = saveId(request);
  if (!id) return json({error: 'invalid id'}, 400, corsHeaders(request, env, METHODS));
  const rawText = await request.text();
  if (!rawText || bytes(rawText) > MAX_SAVE_BYTES) {
    return json({error: 'save too large'}, 413, corsHeaders(request, env, METHODS));
  }

  let clean;
  try {
    clean = sanitizeSave(JSON.parse(rawText));
  } catch (error) {
    return json({error: 'invalid save schema'}, 400, corsHeaders(request, env, METHODS));
  }

  const text = JSON.stringify(clean);
  if (bytes(text) > MAX_SAVE_BYTES) {
    return json({error: 'sanitized save too large'}, 413, corsHeaders(request, env, METHODS));
  }

  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1' && request.headers.get('x-ssg-overwrite') === 'confirm';
  if (!force) {
    const existingText = await env.SSG_SAVES.get(id);
    if (existingText) {
      try {
        const existing = sanitizeSave(JSON.parse(existingText));
        if (existing.savedAt > clean.savedAt + 2000) {
          return json({
            error: 'conflict',
            savedAt: existing.savedAt,
            summary: {
              level: existing.hero.level,
              mapId: existing.mapId,
              playMinutes: Math.round(existing.playMinutes),
              gems: existing.gems.length
            },
            message: 'A newer save exists in the cloud.'
          }, 409, corsHeaders(request, env, METHODS));
        }
      } catch (error) {
        console.warn('[save] replacing an invalid historic value', error);
      }
    }
  }

  await env.SSG_SAVES.put(id, text, {expirationTtl: SAVE_TTL_SECONDS});
  return json({ok: true, savedAt: clean.savedAt}, 200, corsHeaders(request, env, METHODS));
}

export async function onRequestDelete({request, env}) {
  const originError = enforceSameOrigin(request, env);
  if (originError) return originError;
  const limited = await rateLimit(env, request, 'save-delete', 6, 3600);
  if (limited) return limited;
  if (!env?.SSG_SAVES) return json({error: 'save storage unavailable'}, 503);

  const id = saveId(request);
  if (!id) return json({error: 'invalid id'}, 400, corsHeaders(request, env, METHODS));
  await env.SSG_SAVES.delete(id);
  return json({ok: true, deleted: true}, 200, corsHeaders(request, env, METHODS));
}
