import {
  corsHeaders,
  enforceSameOrigin,
  json,
  preflight,
  rateLimit,
  requireAdmin,
  storeFor
} from '../_lib/security.js';

const ALLOWED = new Set([
  'pageview', 'game_start', 'new_game', 'battle_win', 'boss_win',
  'homestead_claim', 'blueprint', 'gem', 'party_host', 'party_join',
  'share', 'install', 'ngplus'
]);
const BLOB_KEY = 'stat:all';
const MAX_DAYS = 120;
const MAX_EVENTS_PER_REQUEST = 50;

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function readBlob(store) {
  try {
    const raw = await store.get(BLOB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.error('[stat] failed to read analytics', error);
  }
  return {totals: {}, days: {}};
}

export function onRequestOptions({request, env}) {
  return preflight(request, env, 'GET, POST, OPTIONS');
}

export async function onRequestPost({request, env}) {
  const originError = enforceSameOrigin(request, env);
  if (originError) return originError;
  const limited = await rateLimit(env, request, 'analytics-write', 120, 60);
  if (limited) return limited;

  const store = storeFor(env, 'SSG_ANALYTICS');
  if (!store) return json({error: 'analytics storage unavailable'}, 503);

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({error: 'invalid json'}, 400, corsHeaders(request, env));
  }

  let events = Array.isArray(payload.events) ? payload.events : (payload.event ? [payload.event] : []);
  events = events.map(String).filter(event => ALLOWED.has(event)).slice(0, MAX_EVENTS_PER_REQUEST);
  if (!events.length) return json({error: 'no valid events'}, 400, corsHeaders(request, env));

  const blob = await readBlob(store);
  const day = today();
  blob.days[day] = blob.days[day] || {};
  for (const event of events) {
    blob.totals[event] = (blob.totals[event] || 0) + 1;
    blob.days[day][event] = (blob.days[day][event] || 0) + 1;
  }
  const dayKeys = Object.keys(blob.days).sort();
  while (dayKeys.length > MAX_DAYS) delete blob.days[dayKeys.shift()];

  await store.put(BLOB_KEY, JSON.stringify(blob));
  return json({ok: true, counted: events.length}, 200, corsHeaders(request, env));
}

export async function onRequestGet({request, env}) {
  const authError = requireAdmin(request, env);
  if (authError) return authError;
  const limited = await rateLimit(env, request, 'analytics-read', 30, 60);
  if (limited) return limited;

  const store = storeFor(env, 'SSG_ANALYTICS');
  if (!store) return json({error: 'analytics storage unavailable'}, 503);
  const blob = await readBlob(store);
  return json({totals: blob.totals, days: blob.days, generatedAt: Date.now()});
}
