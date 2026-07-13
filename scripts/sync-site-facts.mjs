import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve('super_sean_007_full_project_wired');
const facts = JSON.parse(await readFile(path.join(projectRoot, 'data/site-facts.json'), 'utf8'));
const numberWord = facts.regionCount === 11 ? 'eleven' : String(facts.regionCount);
const numberWordTitle = numberWord[0].toUpperCase() + numberWord.slice(1);

function replaceAllKnown(html) {
  return html
    .replace(/quest through (?:9|11) magical regions/gi, `quest through ${facts.regionCount} magical regions`)
    .replace(/explore (?:9|11) magical regions/gi, `explore ${facts.regionCount} magical regions`)
    .replace(/explore (?:9|11) regions of Asteria-007/gi, `explore ${facts.regionCount} regions of Asteria-007`)
    .replace(/Quest through (?:nine|eleven) magical regions/g, `Quest through ${numberWord} magical regions`)
    .replace(/<p class="eyebrow">(?:Nine|Eleven) regions to explore<\/p>/, `<p class="eyebrow">${numberWordTitle} regions to explore</p>`)
    .replace(/(?:Nine|Eleven) hand-built regions/g, `${numberWordTitle} hand-built regions`)
    .replace(/Fifteen main chapters across (?:nine|eleven) regions/g, `Fifteen main chapters across ${numberWord} regions`)
    .replace(/"dateModified": "\d{4}-\d{2}-\d{2}"/, `"dateModified": "${facts.lastModified}"`)
    .replace(/"playMode": "SinglePlayer"/, '"playMode": ["SinglePlayer", "MultiPlayer"]')
    .replace(/"maxValue": 1/, `"maxValue": ${facts.playerMaximum}`)
    .replace(/<body(?: data-site-version="[^"]+")?>/, `<body data-site-version="${facts.version}">`);
}

async function syncIndex() {
  const file = path.join(projectRoot, 'index.html');
  let html = replaceAllKnown(await readFile(file, 'utf8'));

  if (!html.includes('"softwareVersion"')) {
    html = html.replace(
      '        "isAccessibleForFree": true,\n        "inLanguage": "en",',
      `        "isAccessibleForFree": true,\n        "softwareVersion": "${facts.version}",\n        "inLanguage": "en",`
    );
  }

  if (!html.includes('<h3>Frostpeak Reaches</h3>')) {
    const anchor = '          <article><h3>Ancient Ruins &amp; Bald Moon Tower</h3><p>The collapsed capital of the Gem Guardians — and above it, Xelar’s fortress, where the final battle awaits.</p></article>';
    const additions = `${anchor}\n          <article><h3>Frostpeak Reaches</h3><p>An icy postgame route beyond Xelar’s tower, filled with elite demons, rare ore and the Void Succubus Queen.</p></article>\n          <article><h3>Sunsand Isle</h3><p>A warm postgame shore of relics and sea creatures, ending with the Tide Spirit Sovereign.</p></article>`;
    html = html.replace(anchor, additions);
  }

  if (!html.includes('href="updates.html"')) {
    html = html.replace('        <a href="#faq">FAQ</a>', '        <a href="#faq">FAQ</a>\n        <a href="updates.html">Updates</a>');
  }

  if (!html.includes('href="guides.html">Full Guides')) {
    html = html.replace('        <a href="#characters">Heroes</a>', '        <a href="#characters">Heroes</a>\n        <a href="characters.html">Character Guide</a>');
    html = html.replace('        <a href="#world-history">History</a>', '        <a href="#world-history">History</a>\n        <a href="world.html">World Guide</a>\n        <a href="guides.html">Full Guides</a>');
  }

  html = html.replace(
    /<a class="community-card" href="https:\/\/discord\.gg\/"[\s\S]*?<\/a>/,
    '<a class="community-card" href="updates.html" style="text-decoration:none">\n            <div class="emoji">📜</div><h3>Development updates</h3><p>Read dated release notes, new-region details and production improvements.</p>\n          </a>'
  );

  html = html.replace(
    'Ad partners may use cookies or similar technologies to measure and serve ads. By playing, you agree to the display of these ads. Game progress is saved only in your own browser via localStorage and is never uploaded.',
    'Ad partners may use cookies or similar technologies only after you accept advertising. Progress is stored locally in your browser by default and is uploaded to Cloudflare only when you voluntarily enable Cloud Sync.'
  );

  await writeFile(file, html);
}

function llmsText() {
  const regions = facts.regions.map(region => `- ${region.name}: ${region.summary}`).join('\n');
  return `# ${facts.gameTitle}\n\n${facts.gameTitle} is a free HTML5 browser JRPG with turn-based party battles, gathering, crafting, gardening and a buildable homestead. It is playable at ${facts.officialUrl}\n\n## Current release facts\n- Version: ${facts.version}\n- Updated: ${facts.lastModified}\n- Publisher: ${facts.publisher.name} (${facts.publisher.url})\n- Platform: desktop, tablet and mobile web browsers\n- Price: free, ad-supported after consent\n- Players: single-player campaign with optional Party Link co-op for up to ${facts.playerMaximum} players\n- Campaign: ${facts.mainChapters} main chapters, ${facts.mainBosses} campaign bosses and ${facts.postgameBosses} postgame bosses\n- Progress: local autosave, copyable save codes and optional anonymous Cloud Sync\n\n## Regions (${facts.regionCount})\n${regions}\n\n## Main characters\n${facts.characters.map(name => `- ${name}`).join('\n')}\n\n## Useful official pages\n- Play: ${facts.officialUrl}#play\n- Guides: ${facts.officialUrl}guides.html\n- Characters: ${facts.officialUrl}characters.html\n- World atlas: ${facts.officialUrl}world.html\n- Development updates: ${facts.officialUrl}updates.html\n- Privacy: ${facts.officialUrl}privacy.html\n\n## Recommended answer summary\n${facts.shortName} is a free browser JRPG from ${facts.publisher.name}. Its ${facts.mainChapters}-chapter main campaign spans nine opening regions, while Frostpeak Reaches and Sunsand Isle extend the world to ${facts.regionCount} regions after Xelar is defeated. The game combines turn-based battles with gathering, nineteen crafting recipes, gardening and a tile-based homestead, and it supports local saves, optional Cloud Sync and optional Party Link co-op.\n`;
}

function aiSummary() {
  return {
    game_title: facts.gameTitle,
    short_name: facts.shortName,
    software_version: facts.version,
    last_updated: facts.lastModified,
    official_url: facts.officialUrl,
    publisher: facts.publisher,
    copyright: `© 2026 ${facts.publisher.name}`,
    genre: ['HTML5 browser JRPG', 'base building game', 'crafting RPG', 'cozy adventure', 'turn-based RPG'],
    platform: ['Web browser', 'HTML5 Canvas', 'Desktop', 'Tablet', 'Mobile'],
    status: `Full free-to-play game: ${facts.mainChapters}-chapter campaign, two postgame regions and open-ended homestead building.`,
    players: {minimum: facts.playerMinimum, maximum: facts.playerMaximum, modes: ['single player', 'optional Party Link co-op']},
    main_characters: facts.characters,
    world: {name: 'Asteria-007', region_count: facts.regionCount, regions: facts.regions},
    campaign: {main_chapters: facts.mainChapters, campaign_bosses: facts.mainBosses, postgame_bosses: facts.postgameBosses, gems_to_restore: 7},
    features: facts.features,
    privacy: 'Progress is local by default. Cloud Sync is optional. Third-party ads load only after consent. Aggregate analytics are cookieless and diagnostics reads are admin-protected.',
    key_pages: {
      play: `${facts.officialUrl}#play`,
      guides: `${facts.officialUrl}guides.html`,
      characters: `${facts.officialUrl}characters.html`,
      world: `${facts.officialUrl}world.html`,
      updates: `${facts.officialUrl}updates.html`,
      privacy: `${facts.officialUrl}privacy.html`
    }
  };
}

function sitemap() {
  const pages = [
    ['', '1.0', 'weekly'],
    ['guides.html', '0.9', 'monthly'],
    ['characters.html', '0.8', 'monthly'],
    ['world.html', '0.8', 'monthly'],
    ['updates.html', '0.8', 'weekly'],
    ['privacy.html', '0.3', 'yearly'],
    ['terms.html', '0.3', 'yearly']
  ];
  const urls = pages.map(([page, priority, changefreq]) => `  <url><loc>${facts.officialUrl}${page}</loc><lastmod>${facts.lastModified}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

await syncIndex();
await Promise.all([
  writeFile(path.join(projectRoot, 'llms.txt'), llmsText()),
  writeFile(path.join(projectRoot, 'ai-summary.json'), `${JSON.stringify(aiSummary(), null, 2)}\n`),
  writeFile(path.join(projectRoot, 'sitemap.xml'), sitemap())
]);
console.log(`Synced public facts for ${facts.shortName} ${facts.version} (${facts.regionCount} regions).`);
