import {readFile, writeFile} from 'node:fs/promises';

const args = Object.fromEntries(process.argv.slice(2).map(value => {
  const [key, ...rest] = value.replace(/^--/, '').split('=');
  return [key, rest.length ? rest.join('=') : 'true'];
}));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const baseUrl = String(args.url || process.env.PRODUCTION_URL || 'https://supersean007.com').replace(/\/$/, '');
const expectedVersion = String(args.version || process.env.EXPECTED_VERSION || pkg.version);
const expectedCommit = String(args.commit || process.env.EXPECTED_COMMIT || '').trim();
const attempts = Math.max(1, Number(args.attempts || process.env.SMOKE_ATTEMPTS || 30));
const delayMs = Math.max(250, Number(args.delay || process.env.SMOKE_DELAY_MS || 10_000));
const requestTimeout = Math.max(1000, Number(args.timeout || process.env.SMOKE_REQUEST_TIMEOUT_MS || 12_000));
const reportPath = String(args.report || process.env.LIVE_SMOKE_REPORT || 'live-smoke-report.json');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(pathname, {type = 'text', redirect = 'follow'} = {}) {
  const url = pathname.startsWith('http') ? pathname : `${baseUrl}${pathname}`;
  const response = await fetch(url, {
    cache: 'no-store',
    redirect,
    headers: {'user-agent': `Super-Sean-Production-Smoke/${expectedVersion}`},
    signal: AbortSignal.timeout(requestTimeout)
  });
  let body;
  if (type === 'json') {
    const text = await response.text();
    try { body = JSON.parse(text); } catch (error) { body = {__invalidJson: text.slice(0, 500)}; }
  } else {
    body = await response.text();
  }
  return {url, status: response.status, ok: response.ok, headers: Object.fromEntries(response.headers), body};
}

function commitMatches(actual) {
  if (!expectedCommit) return Boolean(actual);
  const left = String(actual || '').toLowerCase();
  const right = expectedCommit.toLowerCase();
  return left === right || left.startsWith(right) || right.startsWith(left);
}

async function waitForRelease() {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const [health, meta] = await Promise.all([
        request('/api/health', {type: 'json'}),
        request('/build-meta.json', {type: 'json'})
      ]);
      last = {attempt, health, meta};
      const versionReady = health.status === 200 && health.body?.version === expectedVersion && meta.status === 200 && meta.body?.version === expectedVersion;
      const commitReady = commitMatches(health.body?.commit) && commitMatches(meta.body?.commit);
      if (versionReady && commitReady) return last;
    } catch (error) {
      last = {attempt, error: error.message};
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  throw new Error(`Production did not converge to version ${expectedVersion}${expectedCommit ? ` / ${expectedCommit}` : ''}. Last result: ${JSON.stringify(last)}`);
}

const release = await waitForRelease();
const results = [];
function check(name, condition, detail) {
  results.push({name, passed: Boolean(condition), detail});
}

const [home, missing, robots, sitemap, llms, ai, security, performance, statusPage, supportPage, stats, errors, badSave] = await Promise.all([
  request('/'),
  request(`/production-smoke-missing-${Date.now()}`),
  request('/robots.txt'),
  request('/sitemap.xml'),
  request('/llms.txt'),
  request('/ai-summary.json', {type: 'json'}),
  request('/.well-known/security.txt'),
  request('/performance-report.json', {type: 'json'}),
  request('/status.html'),
  request('/support.html'),
  request('/api/stat', {type: 'json'}),
  request('/api/err', {type: 'json'}),
  request('/api/save?id=invalid', {type: 'json'})
]);

check('health endpoint', release.health.status === 200 && release.health.body?.ok === true, release.health.body);
check('health version', release.health.body?.version === expectedVersion, release.health.body?.version);
check('health commit', commitMatches(release.health.body?.commit), release.health.body?.commit);
check('build metadata version', release.meta.body?.version === expectedVersion, release.meta.body?.version);
check('build metadata commit', commitMatches(release.meta.body?.commit), release.meta.body?.commit);
check('homepage', home.status === 200 && home.body.includes(`data-site-version="${expectedVersion}"`), {status: home.status});
check('strict transport security', /max-age=\d+/i.test(home.headers['strict-transport-security'] || ''), home.headers['strict-transport-security'] || 'missing');
check('content security policy', Boolean(home.headers['content-security-policy']), home.headers['content-security-policy'] || 'missing');
check('content type protection', (home.headers['x-content-type-options'] || '').toLowerCase() === 'nosniff', home.headers['x-content-type-options'] || 'missing');
check('real 404', missing.status === 404, {status: missing.status, url: missing.url});
check('robots policy', robots.status === 200 && robots.body.includes('Disallow: /api/') && robots.body.includes('/sitemap.xml'), {status: robots.status});
check('sitemap pages', sitemap.status === 200 && ['guides.html','characters.html','world.html','updates.html','support.html'].every(page => sitemap.body.includes(page)), {status: sitemap.status});
check('LLM release facts', llms.status === 200 && llms.body.includes(`Version: ${expectedVersion}`), {status: llms.status});
check('AI release facts', ai.status === 200 && ai.body?.software_version === expectedVersion, ai.body?.software_version);
check('security contact', security.status === 200 && /Contact:/i.test(security.body), {status: security.status});
check('performance budget', performance.status === 200 && performance.body?.passed === true, performance.body?.totals || performance.body);
check('public status page', statusPage.status === 200 && statusPage.body.includes('Service status'), {status: statusPage.status});
check('support page', supportPage.status === 200 && supportPage.body.includes('Support and troubleshooting'), {status: supportPage.status});
check('statistics protected', stats.status === 401, {status: stats.status});
check('error diagnostics protected', errors.status === 401, {status: errors.status});
check('save API rejects invalid ID', badSave.status === 400, {status: badSave.status});

const canonicalUrl = new URL(baseUrl);
if (!canonicalUrl.hostname.startsWith('www.')) {
  const wwwUrl = `${canonicalUrl.protocol}//www.${canonicalUrl.hostname}/`;
  const www = await request(wwwUrl, {redirect: 'manual'});
  check('www redirects to canonical apex', [301,302,307,308].includes(www.status) && String(www.headers.location || '').startsWith(baseUrl), {status: www.status, location: www.headers.location || ''});
}

const failures = results.filter(result => !result.passed);
const report = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  expectedVersion,
  expectedCommit: expectedCommit || null,
  deployment: {
    branch: release.health.body?.deployment || null,
    commit: release.health.body?.commit || null,
    buildCommit: release.meta.body?.commit || null,
    builtAt: release.meta.body?.builtAt || null,
    convergenceAttempt: release.attempt
  },
  passed: failures.length === 0,
  results,
  failures
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(`Production smoke failed:\n- ${failures.map(item => `${item.name}: ${JSON.stringify(item.detail)}`).join('\n- ')}`);
  process.exit(1);
}
console.log('Production smoke passed.');
