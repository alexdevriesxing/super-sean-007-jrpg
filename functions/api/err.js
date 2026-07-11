/* Lightweight error capture for Super Sean 007.
   Appends client errors to a single capped ring-buffer KV key so production
   bugs are visible without a third-party service. No PII beyond the error text. */

const KEY = 'stat:errors';
const MAX = 60;
const MAX_FIELD = 500;

const CORS = {'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type'};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json', 'cache-control': 'no-store', ...CORS}});
}
function clip(v) { return String(v == null ? '' : v).slice(0, MAX_FIELD); }

export function onRequestOptions() {
  return new Response(null, {status: 204, headers: CORS});
}

export async function onRequestPost({request, env}) {
  let p;
  try { p = await request.json(); } catch (e) { return json({error: 'invalid json'}, 400); }
  const entry = {
    at: Date.now(),
    msg: clip(p.msg),
    url: clip(p.url),
    line: Number(p.line) || 0,
    ua: clip((request.headers.get('user-agent') || '').slice(0, 120))
  };
  if (!entry.msg) return json({error: 'empty'}, 400);
  let list = [];
  try { list = JSON.parse((await env.SSG_SAVES.get(KEY)) || '[]'); } catch (e) { list = []; }
  list.unshift(entry);
  list = list.slice(0, MAX);
  await env.SSG_SAVES.put(KEY, JSON.stringify(list));
  return json({ok: true});
}

export async function onRequestGet({env}) {
  let list = [];
  try { list = JSON.parse((await env.SSG_SAVES.get(KEY)) || '[]'); } catch (e) { list = []; }
  return json({errors: list, count: list.length});
}
