/* First-party, cookieless analytics for Super Sean 007.
   All counters live in ONE KV blob (stat:all), so a batch of events costs a
   single read + single write regardless of how many events — this keeps us far
   under the KV free-tier write quota. No cookies, no IP storage, no PII.
   Note: the read-modify-write is not atomic, so counts are approximate under
   heavy concurrency (acceptable for coarse product analytics). */

const ALLOWED = new Set([
  'pageview', 'game_start', 'new_game', 'battle_win', 'boss_win',
  'homestead_claim', 'blueprint', 'gem', 'party_host', 'party_join',
  'share', 'install', 'ngplus'
]);
const BLOB_KEY = 'stat:all';
const MAX_DAYS = 120;
const MAX_EVENTS_PER_REQUEST = 50;

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

function today() { return new Date().toISOString().slice(0, 10); }

async function readBlob(env) {
  try {
    const raw = await env.SSG_SAVES.get(BLOB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through to fresh */ }
  return {totals: {}, days: {}};
}

export function onRequestOptions() {
  return new Response(null, {status: 204, headers: CORS});
}

export async function onRequestPost({request, env}) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({error: 'invalid json'}, 400);
  }
  // Accept a batch {events:[...]} or a single {event:'x'}.
  let events = Array.isArray(payload.events) ? payload.events : (payload.event ? [payload.event] : []);
  events = events.map(String).filter(e => ALLOWED.has(e)).slice(0, MAX_EVENTS_PER_REQUEST);
  if (!events.length) return json({error: 'no valid events'}, 400);

  const blob = await readBlob(env);
  const day = today();
  blob.days[day] = blob.days[day] || {};
  for (const event of events) {
    blob.totals[event] = (blob.totals[event] || 0) + 1;
    blob.days[day][event] = (blob.days[day][event] || 0) + 1;
  }
  // Prune old day buckets to keep the blob small.
  const dayKeys = Object.keys(blob.days).sort();
  while (dayKeys.length > MAX_DAYS) delete blob.days[dayKeys.shift()];

  await env.SSG_SAVES.put(BLOB_KEY, JSON.stringify(blob));
  return json({ok: true, counted: events.length});
}

export async function onRequestGet({env}) {
  const blob = await readBlob(env);
  return json({totals: blob.totals, days: blob.days, generatedAt: Date.now()});
}
