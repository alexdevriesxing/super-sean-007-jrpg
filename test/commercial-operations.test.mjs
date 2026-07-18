import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('production build removes development-only source art', async () => {
  const [clean, source, pkg] = await Promise.all([
    read('scripts/clean-dist.mjs'),
    read('scripts/build-static.mjs'),
    read('package.json')
  ]);
  assert.match(clean, /rm\(distRoot/);
  assert.match(pkg, /npm run clean:dist && vite build/);
  assert.match(source, /generatedSourceRoot/);
  assert.match(source, /super_sean_friends_foundation_spritesheet\.png/);
  assert.match(source, /asset-manifest\.json/);
  assert.doesNotMatch(source, /'assets', 'data', 'docs'/);
  assert.doesNotMatch(source, /rm\(distRoot/);
});

test('Cloudflare deployment is gated by encrypted GitHub secrets and live verification', async () => {
  const workflow = await read('.github/workflows/cloudflare-deploy.yml');
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(workflow, /cloudflare\/wrangler-action@v3/);
  assert.match(workflow, /pages deploy dist --project-name=super-sean-007-jrpg/);
  assert.match(workflow, /npm run smoke:live/);
  assert.match(workflow, /steps\.release\.outputs\.version/);
});

test('scheduled production monitoring opens and closes one incident', async () => {
  const workflow = await read('.github/workflows/production-monitor.yml');
  assert.match(workflow, /cron: '17 \* \* \* \*'/);
  assert.match(workflow, /issues: write/);
  assert.match(workflow, /Production smoke test failed/);
  assert.match(workflow, /state: 'closed'/);
});

test('strict live smoke checks commercial release boundaries', async () => {
  const source = await read('scripts/live-smoke.mjs');
  for (const expected of [
    '/api/health', '/build-meta.json', '/performance-report.json', '/api/stat', '/api/err',
    'strict transport security', 'real 404', 'www redirects to canonical apex'
  ]) assert.ok(source.includes(expected), `live smoke must check ${expected}`);
});

test('support and status pages do not expose private diagnostics', async () => {
  const [status, statusJs, support] = await Promise.all([
    read('super_sean_007_full_project_wired/status.html'),
    read('super_sean_007_full_project_wired/status.js'),
    read('super_sean_007_full_project_wired/support.html')
  ]);
  assert.match(status, /noindex,nofollow,noarchive/);
  assert.match(statusJs, /\/api\/health/);
  assert.match(statusJs, /\/performance-report\.json/);
  assert.doesNotMatch(statusJs, /api\/stat|api\/err|adminToken/i);
  assert.match(support, /never publish a Cloud Sync ID or save code/i);
  assert.match(support, /issues\/new\/choose/);
});
