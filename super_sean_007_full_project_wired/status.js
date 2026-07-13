(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const set = (id, value) => { const node = byId(id); if (node) node.textContent = value; };
  const formatBytes = bytes => {
    const value = Number(bytes) || 0;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)} KB`;
    return `${value} B`;
  };

  async function request(path, type = 'json') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(path, {cache: 'no-store', signal: controller.signal});
      const body = type === 'text' ? await response.text() : await response.json();
      return {ok: response.ok, status: response.status, body};
    } finally {
      clearTimeout(timer);
    }
  }

  async function run() {
    const checks = [];
    try {
      const home = await fetch('/', {cache: 'no-store'});
      const html = await home.text();
      const version = html.match(/data-site-version="([^"]+)"/)?.[1] || 'unknown';
      set('siteHttp', String(home.status));
      set('siteVersion', version);
      set('siteState', home.ok ? 'Website is reachable.' : 'Website returned an error.');
      checks.push(home.ok);
    } catch (error) {
      set('siteState', 'Website check failed.');
      checks.push(false);
    }

    try {
      const health = await request('/api/health');
      set('apiBranch', health.body?.deployment || 'not reported');
      set('apiCommit', health.body?.commit ? String(health.body.commit).slice(0, 12) : 'not reported');
      set('apiState', health.ok && health.body?.ok ? `API healthy · version ${health.body.version || 'unknown'}` : 'API health check failed.');
      checks.push(Boolean(health.ok && health.body?.ok));
    } catch (error) {
      set('apiState', 'API health check failed.');
      checks.push(false);
    }

    try {
      const report = await request('/performance-report.json');
      set('perfBytes', formatBytes(report.body?.totals?.bytes));
      set('criticalBytes', formatBytes(report.body?.totals?.criticalBytes));
      set('perfState', report.ok && report.body?.passed ? 'Production artifact is within budget.' : 'Performance budget is unavailable or failing.');
      checks.push(Boolean(report.ok && report.body?.passed));
    } catch (error) {
      set('perfState', 'Performance report check failed.');
      checks.push(false);
    }

    try {
      const security = await request('/.well-known/security.txt', 'text');
      const valid = security.ok && /Contact:/i.test(security.body || '');
      set('securityState', valid ? 'Responsible disclosure contact is published.' : 'Security contact is unavailable.');
      checks.push(valid);
    } catch (error) {
      set('securityState', 'Security contact check failed.');
      checks.push(false);
    }

    const passed = checks.filter(Boolean).length;
    const overall = byId('overall');
    overall.classList.remove('checking', 'healthy', 'degraded');
    if (passed === checks.length) {
      overall.classList.add('healthy');
      overall.textContent = 'All public production checks are healthy.';
    } else {
      overall.classList.add('degraded');
      overall.textContent = `${passed} of ${checks.length} public checks passed. See the details below.`;
    }
    set('checkedAt', new Date().toLocaleString());
  }

  run();
  setInterval(run, 60_000);
})();
