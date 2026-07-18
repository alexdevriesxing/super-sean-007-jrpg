import {json} from '../_lib/security.js';

export function onRequestGet({env}) {
  return json({
    ok: true,
    service: 'super-sean-007',
    version: '1.4.0',
    deployment: env?.CF_PAGES_BRANCH || null,
    commit: env?.CF_PAGES_COMMIT_SHA || null,
    checkedAt: new Date().toISOString()
  });
}
