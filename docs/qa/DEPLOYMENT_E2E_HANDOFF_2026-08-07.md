# Deployment E2E Handoff

Updated: 2026-08-07

## Current conclusion

- Remote `origin/main` was at `da65024` when this round started.
- GitHub Actions Pages Run #129 passed audit, lint, unit tests, and build, but failed the full Playwright E2E gate, so Pages deployment did not run.
- The expected Pages address remains [https://shawnoarry.github.io/schatphone/](https://shawnoarry.github.io/schatphone/), but no new version is released by Run #129.
- Run details: [#129](https://github.com/shawnoarry/schatphone/actions/runs/31166621913)

## Submitted in this round

- `src/views/ChatDirectoryView.vue`: renamed the header management button test id to `chat-directory-service-management-header`, leaving `chat-directory-service-management-toggle` unique for the management-panel action.
- Targeted `shopping-life-consequence.spec.js`: passed 1/1.
- Single-file ESLint and `git diff --check`: passed.

## Remaining blocker

The full E2E baseline had 122 tests: 98 passed, 20 failed, and 4 skipped. The remaining failures are concentrated in Map and World Pack navigation:

- the URL hash changes to `/map`, but the visible shell can remain on Home;
- returning from Map Settings can remain at `/map/settings` instead of `/map`;
- the failures occur in both desktop Chromium and mobile Chromium.

The Map rerun was intentionally stopped before completion to avoid delaying shutdown. No conclusion has been made that the Map renderer itself is broken; the next investigation should first separate router/navigation timing from parallel-test state contention.

## Next handoff steps

1. Reproduce `e2e/map-local-packs.spec.js` with one worker, then with CI's two workers.
2. Inspect `e2e/helpers/navigation.js`, Vue Router hash updates, and the Map Settings return handlers.
3. After the Map failures are fixed, run lint, unit tests, build, production/full audit, and the full E2E gate.
4. Confirm the new GitHub Actions run is green before treating the Pages URL as updated.
