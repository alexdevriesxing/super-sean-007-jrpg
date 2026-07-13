import {rm} from 'node:fs/promises';
import path from 'node:path';

const distRoot = path.resolve('dist');
await rm(distRoot, {recursive: true, force: true});
console.log('Removed stale dist/ output before the production build.');
