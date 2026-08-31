# Hosted Product Proof - 2026-08-31

## Scope

This record covers the credential-free automated portion of roadmap 4.9 Hosted Product Proof. It does not claim an OS-installed PWA, a physical-device matrix, external required-check/environment protection, personal R2, or a new provider capability.

Primary implementation commit: `38dc329`.

Release-gate hardening follow-up: current working tree; exact commit and remote run IDs are recorded after push.

## Remote Blocker Repair

GitHub Pages run `33400238850` for `6c223d7` failed in `tests/imgbed-publishing-tooling.test.js` because a temporary Git repository had no local author identity on a clean runner. Commit `4bda2cf` configures identity only inside that fixture repository. The focused test passes 15/15 and the local full suite passes 359 files / 2753 tests. The next Pages run was cancelled only because the later implementation push superseded it under the existing Pages concurrency policy.

## Automated Contract

Commit `38dc329` adds:

1. a build-emitted `release.json` containing the exact source commit;
2. a separate `Hosted Product Proof` workflow triggered only after a successful main Pages deployment, with optional manual dispatch for the named revision;
3. an isolated Playwright configuration that does not add skips to the normal full collection;
4. desktop Chromium and simulated Pixel 5 coverage for `/schatphone/`, manifest ID/start URL/scope/icons, Service Worker control/cache, online-to-offline reload, and a second offline page;
5. a complete Settings backup exported from persisted owner identity and credential state, checked for manifest/section digests, restored into blank browser storage, and reopened with the restored data plus a completed recovery journal.
6. four independent full-product Playwright shards for both PR CI and Pages release, with zero retries, one worker per shard, fail-closed JSON summary checks, shard-specific diagnostics, and Pages deployment blocked on both the exact-commit build and every shard.

Chrome reports `in-incognito` inside Playwright's isolated browser context. The test requires zero other manifest/installability errors and retains that result as an explicit environment boundary rather than claiming OS installation.

## Local Validation

- focused hosted static-preview Playwright: 4/4 across desktop Chromium and simulated Pixel 5;
- full-product Playwright: 422 passed / 4 accepted skips / 0 failed across four local shards (`107`, `107`, `102 + 4 skipped`, `106`) with one worker and zero retries per shard;
- changed-flow Playwright: 50/50 across desktop Chromium and simulated Pixel 5;
- focused backup and Weather follow-up: 18/18 across desktop Chromium and simulated Pixel 5;
- full Vitest: 359 files / 2753 tests;
- ESLint: passed;
- GitHub-mode build: 733 modules, including `dist/release.json`;
- governance: 2 files / 19 tests;
- project asset publication check: 1220 tracked assets / 0 violations;
- production and full dependency audits: 0 vulnerabilities / 0 vulnerabilities;
- `git diff --check`: passed during the release-gate hardening round.

## Exact Remote Evidence

- Pages run `33403102743` for `38dc329` was cancelled before deployment after the full E2E log exposed stale Map expectations, so it did not trigger Hosted Product Proof and is not deployment evidence;
- manually dispatched CI run `33403195954` for `38dc329` passed audits, asset checks, lint, 359 files / 2753 tests, and build. Its full E2E log exposed the same stale Map category-count and journey-distance assertions, and the job was cancelled at the 30-minute budget while the collection was still active;
- the follow-up raises the existing full-product CI job to the same 60-minute budget already used by Pages. Map E2E now derives category counts from the shared registry, derives journey distance from the active pack and canonical distance calculation, accepts the current placement guidance semantically, and selects an actually unobstructed map point instead of a fixed ratio that may land on a pin. The local one-worker Map collection passes 16/16;
- the release-gate hardening follow-up replaces each monolithic full-product run with four independent shards. Local execution proves the complete 426-test collection as 422 passed / 4 accepted skips / 0 failed. It also repairs a stale backup schema assertion by reading `COMPLETE_BACKUP_SCHEMA_VERSION` and waits through Home's intentional 220 ms post-edit mis-tap guard before opening a newly placed Weather app;
- exact-commit CI run `33426128121` and Pages run `33426083359` both evaluated `d26de0d984ae7457781dc3d24123c7fd20db7a9c`. Their audit, asset-publication inventory, lint, 359-file / 2753-test Vitest baseline, and 733-module build gates passed. Pages did not deploy because its E2E prerequisite failed, so no post-deployment Hosted Product Proof was triggered and neither run is hosted-release evidence;
- the E2E logs exposed two reproducible test-harness defects. Work Hub asserted the Shanghai display value of a `datetime-local` field even though the stored absolute timestamp was correct on the UTC runner. Calendar's multiday fixture began on "tomorrow", which placed it outside the current Agenda month when the run occurred on the last day of a UTC month. The working-tree repair derives the input value in the browser timezone, retains the exact persisted timestamp assertion, and anchors the multiday fixture on the current day. Focused desktop Chromium and simulated Pixel 5 acceptance passes 10/10;
- every remaining Food Delivery, Map, and Weather failure resolves to the shared project image-bed read path. Required asset requests returned HTTP 500 with Cloudflare body `error code: 1101`; the static image-bed root remained HTTP 200. The working-tree route repair now throws after exhausted retryable responses instead of fulfilling an HTTP 500 body as an image, reuses only explicitly prewarmed successful bytes, and lets non-prewarmed browser requests proceed once instead of multiplying every incidental image into five API reads. Focused Vitest passes 3/3;
- the image-bed failure is confirmed as Workers KV daily read exhaustion. An authenticated project-token request to `/api/manage/list` returned HTTP 500 with `KV get() limit exceeded for the day` before token validation could complete. Cloudflare's published Workers KV Free allowance is 100,000 key reads per day and resets at `00:00 UTC`. Wrangler still has no Cloudflare account login for runtime-log inspection, and the image-bed repository has no deployment secret or variable configured, but a missing binding or R2 failure is no longer the active explanation for this incident;
- the simultaneous CI and Pages collections coincided with the exhausted quota and repeated the same complete 426-test browser suite against one KV-backed asset service. The exact contribution of those runs versus earlier daily traffic is not available, so no per-run request count is claimed. The working-tree route repair removes the fivefold retry amplification for incidental images while retaining fail-closed prewarming for named release assets;
- a single recovery probe at `2026-09-01 03:50 +08:00` requested one named Daylight Cafe asset and still received HTTP 500. No Pages or CI collection was restarted from that result; the next probe remains bounded to one named asset after the `00:00 UTC` reset;
- a new exact-commit Pages run is still required after the repair lands and the image-bed `/file/...` path returns HTTP 200 following the daily reset. CI must then be dispatched only after Pages completes to avoid another overlapping full-product collection. Post-deployment Hosted Product Proof must report that same exact commit before this automated hosted slice is marked remotely complete.

## Remaining Gates

1. Verify external branch required-check and `github-pages` environment-protection policy with the necessary repository permission.
2. Install and relaunch the PWA through real operating-system surfaces.
3. Run the named physical-device matrix for safe areas, browser chrome, keyboard/composer, touch/back behavior, platform file save/import, and relaunch.
4. Keep hosted-provider Chat evidence separate from this credential-free PWA/recovery proof; no user credential is introduced into this workflow.
