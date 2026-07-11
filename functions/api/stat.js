/* First-party, cookieless analytics for Super Sean 007.
   Stores aggregate counters in KV — no cookies, no IP storage, no PII, so it
   needs no consent banner. Client POSTs {event} beacons; GET returns totals. */

const ALLOWED = new Set([
  'pageview', 'game_start', 'new_game', 'battle_win', 'boss_win',
  'homestead_claim', 'blueprint', 'gem', 'party_host', 'party_join',
  'share', 'install', 'ngplus'
]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*'}
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function onRequestOptions() {
  return new Response(null, {status: 204, headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  }});
}

export async function onRequestPost({request, env}) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({error: 'invalid json'}, 400);
  }
  const event = String(payload.event || '');
  if (!ALLOWED.has(event)) return json({error: 'unknown event'}, 400);

  const day = todayKey();
  const DAY_TTL_SECONDS = 90 * 24 * 60 * 60; // keep per-day counters for 90 days
  const keys = [`stat:total:${event}`, `stat:day:${day}:${event}`];
  // KV has no atomic increment; read-modify-write is fine for coarse counters.
  await Promise.all(keys.map(async key => {
    const current = parseInt((await env.SSG_SAVES.get(key)) || '0', 10);
    const ttl = key.startsWith('stat:day:') ? {expirationTtl: DAY_TTL_SECONDS} : undefined;
    await env.SSG_SAVES.put(key, String(current + 1), ttl);
  }));
  return json({ok: true});
}

export async function onRequestGet({request, env}) {
  const totals = {};
  await Promise.all([...ALLOWED].map(async event => {
    totals[event] = parseInt((await env.SSG_SAVES.get(`stat:total:${event}`)) || '0', 10);
  }));
  return json({totals, generatedAt: Date.now()});
}
