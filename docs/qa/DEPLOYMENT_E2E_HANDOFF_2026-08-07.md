# Deployment E2E Handoff

Updated: 2026-08-07

## Current conclusion

- Remote `origin/main` is at `9c263cb`.
- GitHub Actions Pages Run #130 passed the fail-closed build gate and the `deploy` job, so GitHub Pages released the current `main` artifact.
- [https://shawnoarry.github.io/schatphone/](https://shawnoarry.github.io/schatphone/) returns the deployed app and manifest from the `/schatphone/` base path. A deployed-browser smoke unlocked to Home, entered Map at `#/map?homePage=0&from=home`, rendered the Seoul map, reported no console errors, and had no horizontal overflow.
- Run details: [#130](https://github.com/shawnoarry/schatphone/actions/runs/31168706100)

## Repair evidence

- `src/views/ChatDirectoryView.vue`: renamed the header management button test id to `chat-directory-service-management-header`, leaving `chat-directory-service-management-toggle` unique for the management-panel action.
- Targeted `shopping-life-consequence.spec.js`: passed 1/1.
- Single-file ESLint and `git diff --check`: passed.
- `e2e/map-local-packs.spec.js` passed 14/14 both with one worker and with CI's two workers.
- Run #130 then passed the complete remote CI collection and deployed successfully.

## Resolved blocker

Run #129 had 20 Map and World Pack navigation failures after the URL hash changed. The current branch no longer reproduces the focused Map failure under either worker count, and Run #130 is green. The previous failed run remains historical evidence only; it is not a current deployment blocker.

## Remaining release proof

1. Confirm external branch required-check and `github-pages` environment-protection policy separately.
2. Collect the separately scheduled installed-PWA/relaunch and named true-device evidence.
