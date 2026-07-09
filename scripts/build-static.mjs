import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve('super_sean_007_full_project_wired');
const distRoot = path.resolve('dist');
const entries = ['assets', 'data', 'docs', 'game.js', 'asset-library.js', 'styles.css', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'llms.txt', 'ai-summary.json', 'site.webmanifest', 'humans.txt', 'security.txt', '_headers', '_redirects'];

await mkdir(distRoot, { recursive: true });

for (const entry of entries) {
  const from = path.join(projectRoot, entry);
  const to = path.join(distRoot, entry);
  await cp(from, to, { recursive: true, force: true, errorOnExist: false }).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

console.log('Copied static assets, data, docs, and Cloudflare files to dist/');
