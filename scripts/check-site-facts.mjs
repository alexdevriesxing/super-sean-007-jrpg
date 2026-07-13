import {readFile} from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('super_sean_007_full_project_wired');
const read = relative => readFile(path.join(root, relative), 'utf8');
const [factsText, aiText, llms, sitemap, packageText, syncScript] = await Promise.all([
  read('data/site-facts.json'), read('ai-summary.json'), read('llms.txt'), read('sitemap.xml'),
  readFile(path.resolve('package.json'), 'utf8'), readFile(path.resolve('scripts/sync-site-facts.mjs'), 'utf8')
]);
const facts = JSON.parse(factsText);
const ai = JSON.parse(aiText);
const pkg = JSON.parse(packageText);
const errors = [];

function expect(condition, message) { if (!condition) errors.push(message); }

expect(pkg.version === facts.version, `package version ${pkg.version} does not match site version ${facts.version}`);
expect(ai.software_version === facts.version, 'AI summary version is stale');
expect(ai.last_updated === facts.lastModified, 'AI summary date is stale');
expect(ai.world?.region_count === facts.regionCount, 'AI summary region count is stale');
expect(ai.players?.maximum === facts.playerMaximum, 'AI summary player count is stale');
expect(ai.world?.regions?.length === facts.regions.length, 'AI summary region list is incomplete');
expect(ai.campaign?.main_chapters === facts.mainChapters, 'AI summary chapter count is stale');
expect(ai.campaign?.postgame_bosses === facts.postgameBosses, 'AI summary postgame boss count is stale');
expect(ai.key_pages?.security?.endsWith('/security-policy.html'), 'AI summary is missing the security policy page');
expect(ai.privacy?.includes('sandboxed frames'), 'AI summary does not describe isolated advertising');

expect(llms.includes(`Version: ${facts.version}`), 'llms.txt version is stale');
expect(llms.includes(`Regions (${facts.regionCount})`), 'llms.txt region count is stale');
expect(llms.includes(`up to ${facts.playerMaximum} players`), 'llms.txt player count is stale');
for (const region of facts.regions) expect(llms.includes(region.name), `llms.txt is missing ${region.name}`);

for (const page of ['', 'guides.html', 'characters.html', 'world.html', 'updates.html', 'privacy.html', 'terms.html', 'security-policy.html']) {
  expect(sitemap.includes(`<loc>${facts.officialUrl}${page}</loc>`), `sitemap is missing ${page || 'homepage'}`);
}
expect(syncScript.includes("process.argv.includes('--dist')"), 'production fact synchronization is not configured for dist');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Site facts are semantically aligned for ${facts.shortName} ${facts.version}.`);
