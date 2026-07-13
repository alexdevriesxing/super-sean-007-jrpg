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
const MAX_STACK = 1200;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function clip(value, max = MAX_FIELD) {
  return String(value == null ? '' : value).slice(0, max);
}

function withinRetention(entry) {
  return entry && Number(entry.at) >= Date.now() - RETENTION_MS;
}

async function readErrors(store) {
  try {
    const list = JSON.parse((await store.get(KEY)) || '[]');
    return Array.isArray(list) ? list.filter(withinRetention).slice(0, MAX) : [];
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
  try { payload = await request.json(); }
  catch (error) { return json({error: 'invalid json'}, 400, corsHeaders(request, env)); }

  const entry = {
    at: Date.now(),
    msg: clip(payload.msg),
    url: clip(payload.url),
    line: Math.max(0, Number(payload.line) || 0),
    stack: clip(payload.stack, MAX_STACK),
    version: clip(payload.version, 40),
    scene: clip(payload.scene, 40)
  };
  if (!entry.msg) return json({error: 'empty'}, 400, corsHeaders(request, env));

  const list = [entry, ...(await readErrors(store))].slice(0, MAX);
  await store.put(KEY, JSON.stringify(list));
  return json({ok: true, retainedDays: 30}, 200, corsHeaders(request, env));
}

export async function onRequestGet({request, env}) {
  const authError = requireAdmin(request, env);
  if (authError) return authError;
  const limited = await rateLimit(env, request, 'error-read', 30, 60);
  if (limited) return limited;

  const store = storeFor(env, 'SSG_ERRORS');
  if (!store) return json({error: 'error storage unavailable'}, 503);
  const list = await readErrors(store);
  return json({errors: list, count: list.length, retentionDays: 30});
}
