# Hosted Product Proof - 2026-08-31

## Scope

This record covers the credential-free automated portion of roadmap 4.9 Hosted Product Proof. It does not claim an OS-installed PWA, a physical-device matrix, external required-check/environment protection, personal R2, or a new provider capability.

Primary implementation commit: `38dc329`.

## Remote Blocker Repair

GitHub Pages run `33400238850` for `6c223d7` failed in `tests/imgbed-publishing-tooling.test.js` because a temporary Git repository had no local author identity on a clean runner. Commit `4bda2cf` configures identity only inside that fixture repository. The focused test passes 15/15 and the local full suite passes 359 files / 2753 tests. The next Pages run was cancelled only because the later implementation push superseded it under the existing Pages concurrency policy.

## Automated Contract

Commit `38dc329` adds:

1. a build-emitted `release.json` containing the exact source commit;
2. a separate `Hosted Product Proof` workflow triggered only after a successful main Pages deployment, with optional manual dispatch for the named revision;
3. an isolated Playwright configuration that does not add skips to the normal full collection;
4. desktop Chromium and simulated Pixel 5 coverage for `/schatphone/`, manifest ID/start URL/scope/icons, Service Worker control/cache, online-to-offline reload, and a second offline page;
5. a complete Settings backup exported from persisted owner identity and credential state, checked for manifest/section digests, restored into blank browser storage, and reopened with the restored data plus a completed recovery journal.

Chrome reports `in-incognito` inside Playwright's isolated browser context. The test requires zero other manifest/installability errors and retains that result as an explicit environment boundary rather than claiming OS installation.

## Local Validation

- focused hosted static-preview Playwright: 4/4 across desktop Chromium and simulated Pixel 5;
- focused Map Playwright after clean-runner repair: 16/16 across desktop Chromium and simulated Pixel 5 with one worker;
- full Vitest: 359 files / 2753 tests;
- ESLint: passed;
- GitHub-mode build: 733 modules, including `dist/release.json`;
- governance: 2 files / 19 tests;
- `git diff --check`: passed before the implementation commit.

## Exact Remote Evidence

- Pages run `33403102743` for `38dc329` was cancelled before deployment after the full E2E log exposed stale Map expectations, so it did not trigger Hosted Product Proof and is not deployment evidence;
- manually dispatched CI run `33403195954` for `38dc329` passed audits, asset checks, lint, 359 files / 2753 tests, and build. Its full E2E log exposed the same stale Map category-count and journey-distance assertions, and the job was cancelled at the 30-minute budget while the collection was still active;
- the follow-up raises the existing full-product CI job to the same 60-minute budget already used by Pages. Map E2E now derives category counts from the shared registry, derives journey distance from the active pack and canonical distance calculation, accepts the current placement guidance semantically, and selects an actually unobstructed map point instead of a fixed ratio that may land on a pin. The local one-worker Map collection passes 16/16;
- a new exact-commit CI and Pages run is required after the follow-up lands. Post-deployment Hosted Product Proof starts only after Pages succeeds and must report that same exact commit before this automated hosted slice is marked remotely complete.

## Remaining Gates

1. Verify external branch required-check and `github-pages` environment-protection policy with the necessary repository permission.
2. Install and relaunch the PWA through real operating-system surfaces.
3. Run the named physical-device matrix for safe areas, browser chrome, keyboard/composer, touch/back behavior, platform file save/import, and relaunch.
4. Keep hosted-provider Chat evidence separate from this credential-free PWA/recovery proof; no user credential is introduced into this workflow.
