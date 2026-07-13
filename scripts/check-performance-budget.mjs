import {readFile, readdir, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';

const distRoot = path.resolve('dist');
const configPath = path.resolve('super_sean_007_full_project_wired/data/performance-budget.json');
const budget = JSON.parse(await readFile(configPath, 'utf8'));
const files = [];

async function walk(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (entry.isFile()) {
      const info = await stat(absolute);
      files.push({path: path.relative(distRoot, absolute).replaceAll('\\', '/'), bytes: info.size});
    }
  }
}

await walk(distRoot);
const byPath = new Map(files.map(file => [file.path, file.bytes]));
const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
const javascriptBytes = files.filter(file => file.path.endsWith('.js')).reduce((sum, file) => sum + file.bytes, 0);
const cssBytes = files.filter(file => file.path.endsWith('.css')).reduce((sum, file) => sum + file.bytes, 0);
const largeFiles = files.filter(file => file.bytes > 2_000_000).sort((a, b) => b.bytes - a.bytes);
const largest = [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 25);
const missingCritical = budget.criticalPaths.filter(file => !byPath.has(file));
const criticalBytes = budget.criticalPaths.reduce((sum, file) => sum + (byPath.get(file) || 0), 0);
const oversized = files.filter(file => file.bytes > budget.maxSingleAssetBytes).sort((a, b) => b.bytes - a.bytes);

const failures = [];
if (totalBytes > budget.totalDistBytes) failures.push(`Total dist size ${totalBytes} exceeds ${budget.totalDistBytes}.`);
if (javascriptBytes > budget.maxJavaScriptBytes) failures.push(`JavaScript size ${javascriptBytes} exceeds ${budget.maxJavaScriptBytes}.`);
if (cssBytes > budget.maxCssBytes) failures.push(`CSS size ${cssBytes} exceeds ${budget.maxCssBytes}.`);
if (criticalBytes > budget.maxInitialCriticalBytes) failures.push(`Critical first-play assets ${criticalBytes} exceed ${budget.maxInitialCriticalBytes}.`);
if (largeFiles.length > budget.maxFilesOverTwoMb) failures.push(`${largeFiles.length} files exceed 2 MB; budget is ${budget.maxFilesOverTwoMb}.`);
if (oversized.length) failures.push(`Oversized files: ${oversized.map(file => `${file.path} (${file.bytes})`).join(', ')}`);
if (missingCritical.length) failures.push(`Critical paths missing from dist: ${missingCritical.join(', ')}`);

const report = {
  generatedAt: new Date().toISOString(),
  passed: failures.length === 0,
  totals: {
    files: files.length,
    bytes: totalBytes,
    javascriptBytes,
    cssBytes,
    criticalBytes,
    filesOverTwoMb: largeFiles.length
  },
  budget,
  largest,
  oversized,
  missingCritical,
  failures
};

await writeFile(path.join(distRoot, 'performance-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.totals));
if (failures.length) {
  console.error(`Performance budget failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Performance budget passed.');
