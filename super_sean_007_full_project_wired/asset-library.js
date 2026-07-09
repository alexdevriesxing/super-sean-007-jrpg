
(() => {
  const grid = document.getElementById('assetGrid');
  const stats = document.getElementById('assetStats');
  const buttons = Array.from(document.querySelectorAll('.asset-filter'));
  if (!grid || !stats) return;

  const labels = {
    battle_backgrounds: 'Battle backgrounds',
    key_art: 'Key art',
    loading_event_screens: 'Loading / event screens',
    raw: 'Raw extras',
    split_pack: 'Split pack',
    spritesheets: 'Spritesheets',
    tilesets: 'Tiles / buildings',
    ui_vfx: 'UI / VFX'
  };

  let assets = [];
  let audioManifest = null;
  let slicedManifest = null;
  let activeFilter = 'all';

  function normalizeTitle(text) {
    return text
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
  }

  function render() {
    const filtered = activeFilter === 'all' ? assets : assets.filter(item => item.category === activeFilter);
    const counts = assets.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    stats.innerHTML = `
      <span><strong>${assets.length}</strong> generated asset sheets included</span>
      <span><strong>${counts.spritesheets || 0}</strong> spritesheets</span>
      <span><strong>${counts.tilesets || 0}</strong> tiles/building sheets</span>
      <span><strong>${counts.battle_backgrounds || 0}</strong> battle/background sheets</span>
      <span><strong>${counts.ui_vfx || 0}</strong> UI/VFX sheets</span>
      <span><strong>${slicedManifest?.frames?.length || 0}</strong> generated slices</span>
      <span><strong>${Object.keys(audioManifest?.music || {}).length + Object.keys(audioManifest?.sfx || {}).length}</strong> generated audio cues</span>
    `;

    grid.innerHTML = filtered.map(item => `
      <article class="asset-card" data-category="${item.category}">
        <a href="${item.file}" target="_blank" rel="noopener">
          <img src="${item.file}" loading="lazy" alt="${normalizeTitle(item.title)} asset sheet">
        </a>
        <div class="asset-card-body">
          <strong>${normalizeTitle(item.title)}</strong>
          <span>${labels[item.category] || item.category} · ${item.width || '?'}×${item.height || '?'}</span>
        </div>
      </article>
    `).join('');
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      activeFilter = button.dataset.filter || 'all';
      render();
    });
  });

  Promise.all([
    fetch('data/asset-manifest.json').then(response => response.json()),
    fetch('data/audio-manifest.json').then(response => response.ok ? response.json() : null).catch(() => null),
    fetch('data/sliced-assets.json').then(response => response.ok ? response.json() : null).catch(() => null)
  ])
    .then(([data, audio, sliced]) => {
      audioManifest = audio;
      slicedManifest = sliced;
      assets = data.sort((a, b) => (a.category + a.title).localeCompare(b.category + b.title));
      render();
    })
    .catch(() => {
      stats.textContent = 'Asset manifest could not be loaded, but all files are included in assets/generated/.';
    });
})();
