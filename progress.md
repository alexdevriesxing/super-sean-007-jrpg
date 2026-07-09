Original prompt: build this

## 2026-07-09

- Inspected the uploaded Super Sean 007 static HTML5 project.
- Found the game and landing page already exist under `super_sean_007_full_project_wired/`, but the workspace root had no `package.json`, build scripts, or progress log.
- User added a requirement to generate and wire music/SFX and cleanly slice/integrate graphics.
- Current plan: keep the existing static architecture, add npm/Vite build scripts, generate audio assets, generate sliced game-critical graphics, wire audio/sliced metadata into the game, add Cloudflare/docs, then validate with build and browser checks.
- Added root npm scripts, Vite config, static build copy, validation, audio generation, graphics slicing scripts, Cloudflare headers/redirects, README, Adsterra docs and deployment docs.
- Installed npm dependencies successfully with no vulnerabilities reported.
- Generated 12 WAV audio cues under `assets/audio/` and 363 sliced graphics frames under `assets/sliced/`.
- `npm run build` completed successfully; validation passed for JSON, generated audio, sliced graphics, dist output and manifest paths.
- Fixed production static copy for `game.js` and `asset-library.js`, added root favicon fallback, fixed canvas `roundRect` path accumulation, tightened title overlay text, clamped canvas labels, and added scroll offset polish.
- Browser verification: clean direct key-flow probe with no failed requests; start, quest, inventory, audio toggles, save, generated audio and 363 sliced frames verified. Final web-game screenshot/error pass produced no error file.

## Remaining manual notes

- Production URL is `https://super-sean-007-jrpg.pages.dev/`; canonical metadata, sitemap and robots now use it.
- Add real Adsterra unit scripts and update `_headers` CSP only after production ad domains are known.
