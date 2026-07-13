import {
  corsHeaders,
  enforceSameOrigin,
  json,
  preflight,
  rateLimit,
  requireAdmin,
  storeFor
} from '../_lib/security.js';

const KEY = 'stat:errors';
const MAX = 60;
const MAX_FIELD = 500;

function clip(value) {
  return String(value == null ? '' : value).slice(0, MAX_FIELD);
}

async function readErrors(store) {
  try {
    return JSON.parse((await store.get(KEY)) || '[]');
  } catch (error) {
    return [];
  }
}

export function onRequestOptions({request, env}) {
  return preflight(request, env, 'GET, POST, OPTIONS');
}

export async function onRequestPost({request, env}) {
  const originError = enforceSameOrigin(request, env);
  if (originError) return originError;
  const limited = await rateLimit(env, request, 'error-write', 12, 3600);
  if (limited) return limited;

  const store = storeFor(env, 'SSG_ERRORS');
  if (!store) return json({error: 'error storage unavailable'}, 503);

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({error: 'invalid json'}, 400, corsHeaders(request, env));
  }

  const entry = {
    at: Date.now(),
    msg: clip(payload.msg),
    url: clip(payload.url),
    line: Number(payload.line) || 0
  };
  if (!entry.msg) return json({error: 'empty'}, 400, corsHeaders(request, env));

  let list = await readErrors(store);
  list.unshift(entry);
  list = list.slice(0, MAX);
  await store.put(KEY, JSON.stringify(list));
  return json({ok: true}, 200, corsHeaders(request, env));
}

export async function onRequestGet({request, env}) {
  const authError = requireAdmin(request, env);
  if (authError) return authError;
  const limited = await rateLimit(env, request, 'error-read', 30, 60);
  if (limited) return limited;

  const store = storeFor(env, 'SSG_ERRORS');
  if (!store) return json({error: 'error storage unavailable'}, 503);
  const list = await readErrors(store);
  return json({errors: list, count: list.length});
}
