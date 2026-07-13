(() => {
  'use strict';

  const tokenInput = document.getElementById('token');
  const status = document.getElementById('status');
  const dashboard = document.getElementById('dashboard');
  let adminToken = '';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  async function api(path) {
    const response = await fetch(path, {
      headers: {authorization: `Bearer ${adminToken}`},
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  }

  function renderTotals(totals) {
    const target = document.getElementById('totals');
    target.replaceChildren();
    const keys = Object.keys(totals || {}).sort((a, b) => totals[b] - totals[a]);
    if (!keys.length) target.append(element('p', 'muted', 'No data yet.'));
    for (const key of keys) {
      const card = element('div', 'card');
      card.append(element('div', 'n', String(totals[key] || 0)));
      card.append(element('div', 'l', key.replace(/_/g, ' ')));
      target.append(card);
    }
  }

  function renderDays(days) {
    const target = document.getElementById('daily');
    target.replaceChildren();
    const keys = Object.keys(days || {}).sort().slice(-14);
    const max = Math.max(1, ...keys.map(day => days[day].pageview || 0));
    if (!keys.length) target.append(element('p', 'muted', 'No daily data yet.'));
    for (const day of keys) {
      const pageviews = days[day].pageview || 0;
      const newGames = days[day].new_game || 0;
      const row = element('div', 'barrow');
      row.append(element('span', 'muted', day.slice(5)));
      const barWrap = element('div', 'bar-wrap');
      const bar = element('div', 'bar');
      bar.style.width = `${Math.round(pageviews / max * 100)}%`;
      barWrap.append(bar);
      row.append(barWrap);
      row.append(element('span', '', `${pageviews}/${newGames}`));
      target.append(row);
    }
  }

  function renderErrors(errors) {
    const target = document.getElementById('errors');
    target.replaceChildren();
    if (!errors?.length) {
      const row = document.createElement('tr');
      const cell = element('td', 'muted', 'No errors logged.');
      cell.colSpan = 3;
      row.append(cell);
      target.append(row);
      return;
    }
    for (const entry of errors) {
      const row = document.createElement('tr');
      row.append(element('td', 'muted', new Date(entry.at).toLocaleString()));
      row.append(element('td', 'err', entry.msg || ''));
      row.append(element('td', 'muted', `${entry.url || ''}:${entry.line || 0}`));
      target.append(row);
    }
  }

  async function load() {
    status.textContent = 'Loading protected diagnostics…';
    dashboard.hidden = true;
    const [stats, errors] = await Promise.all([api('/api/stat'), api('/api/err')]);
    renderTotals(stats.totals);
    renderDays(stats.days);
    renderErrors(errors.errors);
    dashboard.hidden = false;
    status.textContent = `Loaded ${new Date().toLocaleTimeString()}. Counts may be approximate while KV fallback storage is in use.`;
  }

  document.getElementById('loginForm').addEventListener('submit', event => {
    event.preventDefault();
    adminToken = tokenInput.value.trim();
    tokenInput.value = '';
    load().catch(error => {
      dashboard.hidden = true;
      status.textContent = error.message;
      adminToken = '';
    });
  });

  document.getElementById('logout').addEventListener('click', () => {
    adminToken = '';
    tokenInput.value = '';
    dashboard.hidden = true;
    status.textContent = 'Token cleared from memory.';
  });

  window.addEventListener('pagehide', () => { adminToken = ''; });
})();
