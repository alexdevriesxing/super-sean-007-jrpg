/* Cloud save API for Super Sean 007 (Cloudflare Pages Function + KV).
   The sync ID is a 16-40 char random token generated client-side; possession
   of the ID is ownership. Saves are capped in size and validated as JSON. */

const ID_PATTERN = /^[a-z0-9]{16,40}$/;
const MAX_SAVE_BYTES = 150_000;
const SAVE_TTL_SECONDS = 60 * 60 * 24 * 180; // saves expire after 180 days idle

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json', 'cache-control': 'no-store'}
  });
}

function saveId(request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  return ID_PATTERN.test(id) ? id : null;
}

export async function onRequestGet({request, env}) {
  const id = saveId(request);
  if (!id) return json({error: 'invalid id'}, 400);
  const value = await env.SSG_SAVES.get(id);
  if (!value) return json({error: 'not found'}, 404);
  return new Response(value, {
    headers: {'content-type': 'application/json', 'cache-control': 'no-store'}
  });
}

export async function onRequestPut({request, env}) {
  const id = saveId(request);
  if (!id) return json({error: 'invalid id'}, 400);
  const text = await request.text();
  if (!text || text.length > MAX_SAVE_BYTES) return json({error: 'save too large'}, 413);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return json({error: 'invalid json'}, 400);
  }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.version !== 'number' || !parsed.hero) {
    return json({error: 'not a valid save'}, 400);
  }
  // Conflict guard: never let an older save clobber a newer one (multi-device safety).
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
          return json({error: 'conflict', savedAt: existingAt, message: 'A newer save exists in the cloud.'}, 409);
        }
      } catch (e) { /* stored value unparseable — allow overwrite */ }
    }
  }
  await env.SSG_SAVES.put(id, text, {expirationTtl: SAVE_TTL_SECONDS});
  return json({ok: true, savedAt: Number(parsed.savedAt) || Date.now()});
}
