# Super Sean 007 production operations runbook

## Ownership

Assign named owners before public promotion for:

- deployment approval and rollback;
- Cloudflare account administration;
- TURN relay administration;
- privacy and security requests;
- player support;
- advertising quality and revenue review.

Do not rely on one person holding the only API token, Cloud Sync namespace access or rollback knowledge.

## Release procedure

1. Merge only after the `Build and validate` workflow passes.
2. Confirm `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` remain configured as restricted GitHub Actions secrets.
3. Let `Deploy Cloudflare Pages` build the exact merge commit again.
4. Require the custom-domain production smoke test to pass.
5. Open `/status.html` and confirm the version, commit and performance budget.
6. Run the manual player checks for saves, gamepad, accessibility, Party Link and advertising.
7. Record the release commit and operator in the release log or GitHub issue.

## Severity levels

### SEV-1

Use when the game cannot start, saves are being corrupted or exposed, diagnostics are publicly readable, a security incident is active, or the domain is serving malicious/unapproved content.

Actions:

- stop promotion and advertising immediately;
- disable the affected API or roll back;
- preserve logs and deployment evidence;
- rotate exposed secrets;
- notify the privacy/security owner;
- publish a concise status update when players are affected.

### SEV-2

Use when Cloud Sync, Party Link, payments/ads, a major browser, or a large part of the campaign is unavailable.

Actions:

- acknowledge the incident;
- identify the last known good commit;
- decide whether a rollback is safer than a forward fix;
- monitor save integrity separately from feature availability.

### SEV-3

Use for isolated visual, content, controller or low-impact browser issues. Track through the structured bug-report form and schedule a normal release.

## Rollback

Prefer Cloudflare Pages deployment rollback to a known-good production deployment. After rollback:

1. verify `/api/health` and `/build-meta.json` show the selected release;
2. run `node scripts/live-smoke.mjs --url=https://www.supersean007.com --version=<VERSION> --commit=<COMMIT>`;
3. test a disposable cloud save;
4. confirm the service worker no longer serves the failed cache;
5. document why the rollback was needed.

Never roll back to a release with an incompatible save schema unless migration behavior has been explicitly tested.

## Secret rotation

Rotate immediately when a token is exposed, copied into logs, shared in chat, committed, or accessible to an unauthorized person.

- Replace the GitHub Actions `CLOUDFLARE_API_TOKEN` with a newly restricted token.
- Rotate `ADMIN_TOKEN` and update authorized operators.
- Rotate `TURN_SHARED_SECRET` together with the TURN server.
- Review GitHub Actions logs and Cloudflare audit events.
- Re-run production deployment and smoke checks.

Secrets must never be added to issue bodies, support screenshots, browser storage or public status output.

## Save incident handling

When a save issue is reported:

- ask for the game version, browser and reproducible steps;
- never ask the player to post a Cloud Sync ID or save code publicly;
- recommend downloading a local JSON backup before changes;
- distinguish local-storage failure from cloud API failure;
- use a disposable test ID for operator reproduction;
- do not inspect a player cloud save without explicit permission and a documented reason.

## Monitoring

The scheduled production workflow is the primary public-service monitor. It verifies the current `main` commit, strict security behavior and performance report.

Also monitor separately in Cloudflare or another service:

- TLS and domain expiry;
- Functions error rate;
- KV/D1/Analytics Engine availability;
- TURN relay health;
- abnormal API bursts;
- ad fill and inappropriate advertising;
- deployment failures.

## Backup and recovery objectives

Define and record business-approved targets before launch:

- maximum acceptable production outage;
- maximum acceptable loss of aggregate analytics;
- Cloud Save retention and recovery expectations;
- rollback owner response time;
- TURN relay recovery time.

Anonymous Cloud Sync is not a substitute for player backups. The UI must continue offering save-code and JSON export options.

## Monthly operational review

Review:

- open production incidents and recurring bugs;
- deployment success rate and rollback tests;
- production artifact size and first-play budget;
- Cloud Sync and Party Link failure rates;
- controller/mobile/browser coverage;
- advertising consent, fill, quality and revenue;
- privacy/security requests;
- dependency, token and asset-licence changes.
