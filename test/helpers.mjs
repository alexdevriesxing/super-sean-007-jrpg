/* Load the browser SSG data/logic modules into a fake window so we can unit-test
   the pure logic in Node without a DOM. Only data + pure helpers are exercised. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve('super_sean_007_full_project_wired');

export function loadSSG(files) {
  const sandbox = {
    document: { getElementById: () => null, addEventListener: () => {}, createElement: () => ({}) },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    navigator: { sendBeacon: () => true },
    crypto: { getRandomValues: a => { for (let i = 0; i < a.length; i++) a[i] = (i * 37) % 256; return a; } },
    performance: { now: () => Date.now() },
    setTimeout, clearTimeout, setInterval, clearInterval,
    console, Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map,
    isNaN, parseInt, parseFloat, isFinite
  };
  // In the browser the modules assign `window.SSG` and then read bare `SSG`,
  // which works because `window` IS the global. Mirror that: make `window`
  // (and `globalThis`) point at the sandbox's own global object.
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  for (const file of files) {
    const code = readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  }
  return sandbox.SSG;
}
