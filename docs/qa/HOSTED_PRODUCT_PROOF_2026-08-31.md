# Hosted Product Proof - 2026-08-31

## Scope

This record covers the credential-free automated portion of roadmap 4.9 Hosted Product Proof. It does not claim an OS-installed PWA, a physical-device matrix, external required-check/environment protection, personal R2, or a new provider capability.

Primary implementation commit: `38dc329`.

Final remotely proven release-gate revision: `8d38dfa8c62a60687407d2e61659d9078cc023bc`, including the runner-independent Work Hub fixture at `987ef85` and the hosted-proof environment/base-path repair at `8d38dfa`.

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

Depending on the runner's Chromium revision, Playwright's isolated browser context reports either no installability error or one environment-only `in-incognito` error. The test allows only that optional environment result, requires zero product manifest/installability errors, and does not relabel browser automation as OS installation.

## Local Validation

- focused hosted Playwright: 4/4 across desktop Chromium and simulated Pixel 5 against the deployed exact release `987ef85cc7d3d15381822b5a98af3a709ee8663c` after the proof repair, then remotely repeated against final exact release `8d38dfa8c62a60687407d2e61659d9078cc023bc` on 2026-09-01;
- full-product Playwright: 422 passed / 4 accepted skips / 0 failed across four local shards (`107`, `107`, `102 + 4 skipped`, `106`) with one worker and zero retries per shard;
- changed-flow Playwright: 50/50 across desktop Chromium and simulated Pixel 5;
- focused backup and Weather follow-up: 18/18 across desktop Chromium and simulated Pixel 5;
- full Vitest: 360 files / 2756 tests;
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
- a single recovery probe at `2026-09-01 18:56 +08:00` requested the recorded Daylight Cafe asset and returned HTTP 200, `image/png`, and 1,292,453 bytes. The focused Weather desktop/mobile flow then passed 12/12, the exact-SHA GitHub-mode build transformed 733 modules, and local Hosted Product Proof passed 4/4 before any remote collection restarted;
- Pages run `33499931669` evaluated `5a8a10b88b6763e7b3023c08cf8046e22991128c`. Its audits, asset inventory, lint, full Vitest, build, and E2E shards 1 and 3 passed; shards 2 and 4 failed because a fixed `2026-09-01 17:00 +08:00` Work Hub journey had legitimately become missed by runner execution time, so the Map action was absent. Deployment was correctly skipped and Hosted Product Proof did not run. Commit `987ef85` keeps exact timestamp assertions while deriving the execution fixture seven days after runtime;
- Pages run `33502221742` for `987ef85cc7d3d15381822b5a98af3a709ee8663c` passed the exact-commit build, all four full-product E2E shards, and deployment. The deployed `/schatphone/release.json` reported that complete SHA. Automatic Hosted Product Proof run `33503610482` then exposed a proof-only assumption: current Chromium returned zero installability errors while the test required exactly one `in-incognito` environment error, so backup proof did not run;
- commit `8d38dfa` retains a strict zero-product-error assertion while allowing zero or one environment-only `in-incognito` result, and resolves every lock-screen navigation from the deployed `/schatphone/` base instead of the GitHub user root. Direct hosted acceptance against the deployed `987ef85` release passed 4/4 across desktop Chromium and simulated Pixel 5 before the repair was pushed;
- final Pages run `33504446970` evaluated `8d38dfa8c62a60687407d2e61659d9078cc023bc` from `2026-09-01T11:49:28Z` through `2026-09-01T12:04:59Z`. Audits, the 1,220-asset publication inventory, lint, full Vitest, the 733-module build, all four fail-closed full-product E2E shards, and deployment passed. The deployed `/schatphone/release.json` reported the same complete SHA;
- automatic Hosted Product Proof run `33505769229` checked out that exact deployed revision and passed in 1 minute 25 seconds. Desktop Chromium and simulated Pixel 5 both proved the `/schatphone/` base, manifest ID/start URL/scope/icons, zero product installability errors, Service Worker control/cache, online-to-offline reload, a second offline page, complete backup export, blank-storage restore, and reopen with restored owner/credential/identity data plus the completed recovery journal;
- only after Pages and Hosted Product Proof completed, manually dispatched CI run `33505937702` evaluated the same exact SHA. Its audits, asset inventory, lint, full Vitest, 733-module build, and all four full-product E2E shards passed from `2026-09-01T12:06:57Z` through `2026-09-01T12:21:54Z`. No CI/Pages browser collection overlapped in the final evidence sequence.

## Final Automated Hosted Evidence - 2026-09-01

The credential-free automated roadmap 4.9 hosted-browser slice is remotely complete at exact revision `8d38dfa8c62a60687407d2e61659d9078cc023bc`:

1. Pages run `33504446970` passed build plus all four full-product E2E shards and deployed that revision;
2. the live `/schatphone/release.json` reported the same complete SHA;
3. automatic Hosted Product Proof run `33505769229` passed the deployed PWA/offline and complete backup restore/reopen contract in desktop Chromium and simulated Pixel 5;
4. manually dispatched CI run `33505937702` then passed build plus all four full-product E2E shards for the same revision, without overlapping the final Pages collection.

This closes the exact-commit automated browser proof, not the whole public-release gate. It does not claim OS-installed PWA behavior, physical devices, external required-check/environment protection, personal R2, W3/multi-world, or new Event/AI capability. Unrelated `output/e2e/**` screenshots, Cloud Pastel assets, `.workbuddy/`, `.zcode/`, and `__pycache__/` remain outside this documentation scope.

## Remaining Gates

1. Verify external branch required-check and `github-pages` environment-protection policy with the necessary repository permission.
2. Install and relaunch the PWA through real operating-system surfaces.
3. Run the named physical-device matrix for safe areas, browser chrome, keyboard/composer, touch/back behavior, platform file save/import, and relaunch.
4. Keep hosted-provider Chat evidence separate from this credential-free PWA/recovery proof; no user credential is introduced into this workflow.
