# Map Entry And Event Preview Handoff

Updated: 2026-08-28

## 1. Handoff State

- State: `PUSH_AUTHORIZED`
- Task package: `map-calendar-reminders`
- Risk lane: elevated, because this round changes user-visible Map behavior in a dirty integration worktree and includes an authorized remote push
- Worktree: `D:\github\schatphone`
- Target branch: `main`
- Recorded base before this commit: `a2e4e68a589f31d5f061c032b1af39ef95b30ee7`
- Roadmap impact: none; the production EVE-2C trigger contract and roadmap status remain unchanged

## 2. User-Visible Result

This round closes the concrete Map testing blockers reported on 2026-08-28:

1. Place entry uses one shared 30-meter radius. A measured position such as 7 meters away is labeled as enterable, and confirming entry snaps manual position evidence to the stable place before creating the inside session.
2. Very short route estimates keep their measured distance instead of inflating to 0.3 km. Walking display has a one-minute floor instead of showing four minutes for a few meters.
3. Role-position selection accepts either a blank map point or an existing place pin. Existing pins require confirmation and retain stable place identity.
4. When a role-position marker overlaps a place marker, the role marker is non-interactive and remains below the place marker in both OpenFreeMap and LocalMap renderers.
5. The approved place-session event surface now receives the selected place's reviewed media when available.
6. Local development exposes a clearly labeled `测试事件 / Test event` entry after entering any place when no real invitation is eligible. It opens the same local three-choice scene but bypasses persona, journey, world-family, intensity, cooldown, and quota setup only for presentation QA.
7. The development preview is page-local. It creates no Simulation Event Instance, trigger log, cooldown, or quota use and is not exposed by the production Map view.

The production path remains:

`valid position -> explicit Enter -> eligible invitation -> explicit expansion -> one of three choices -> Map-owned validation -> result -> return to place`

No event waits for a timer after entry. A real invitation appears immediately only when its authored conditions are eligible.

## 3. How To Continue At Home

Use the local development server and open:

`http://127.0.0.1:5174/schatphone/#/map`

To test presentation without preparing a persona or journey:

1. Open any place at the role's current position.
2. Select `进入 / Enter`.
3. Select the `测试事件 / Test event` strip.
4. Choose any of the three responses.
5. Confirm that a consequence appears, then return to the place.

To test the production-eligible sample:

1. Set the role position to `MBC 上岩总部 / MBC Sangam Headquarters`, or move within 30 meters.
2. Open MBC and select `进入 / Enter`.
3. In a compatible daily/K-pop world with Map events enabled and no active cooldown/quota block, the invitation appears immediately.
4. Expand it, choose one response, review the result, and return.

To test pin selection and overlap:

1. Select the role-position crosshair control.
2. Select an existing place marker.
3. Confirm `确认位置 / Confirm location`.
4. Select the coincident place marker again; its place card must still open.

## 4. Implementation Boundary

The preview deliberately reuses the approved local EVE-2C scene shape and pure Map resolution validator, but keeps its instance in `MapView` memory only. It does not call the Simulation Store persistence or trigger-log actions. The source place's real category and capabilities are not mutated; preview-only compatible semantics exist only in the ephemeral materialization input.

The production entry and event paths continue to use canonical Map session provenance, Event Runtime eligibility, persisted Event Instances, cooldowns, daily caps, world compatibility, and module controls.

## 5. Validation Evidence

Completed in this worktree:

- focused Vitest: 4 files, 70 tests passed
- targeted Playwright development-preview flow: 2/2 passed across desktop Chromium and simulated Pixel 5
- complete Map K-pop Playwright spec: 10/10 passed across desktop Chromium and simulated Pixel 5
- prior focused Map regression set: 107/107 passed before the development-preview addition
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `npm.cmd run governance:check`: 19/19 passed
- `git diff --check`: passed before final staging

The focused Vitest run prints the existing jsdom `HTMLCanvasElement.getContext` warning while MapLibre initializes; all tests still pass. No physical-device evidence is claimed.

The full `npm.cmd run test` gate is not green: 338 files / 2581 tests pass, while 8 files / 5 tests fail outside this Map slice. Five suites are incorrectly discovered under `.codex/local-tools` and `.codex/tmp`; two Contacts world-field copy assertions are stale against the current Contacts implementation; and three existing image-bed/persistence tests time out. No Map test fails, and the focused Map checks above remain green.

## 6. Files In This Map Commit

Product and implementation:

- `src/views/MapView.vue`
- `src/stores/map.js`
- `src/lib/map-journey.js`
- `src/lib/simulation/adapters/map-place-session-events.js`
- `src/components/map/OpenFreeMapCanvas.vue`
- `src/components/map/LocalMapCanvas.vue`
- `src/components/map/MapPlaceFocusSheet.vue`
- `src/components/map/MapEventSurfaceSheet.vue`

Tests:

- `tests/map-journey.test.js`
- `tests/map-trip-baseline.test.js`
- `tests/map-pack-foundation.test.js`
- `tests/map-place-session-events.test.js`
- `tests/map-place-focus-sheet.test.js`
- `tests/map-event-surface-sheet.test.js`
- `tests/map-view-information-architecture.test.js`
- `tests/openfreemap-canvas.test.js`
- `e2e/map-kpop-event.spec.js`

Package documentation and evidence:

- `docs/pm/map-calendar-reminders/README.md`
- `docs/pm/map-calendar-reminders/STATUS_AND_HANDOFF.md`
- `docs/pm/map-calendar-reminders/PRODUCT_BOUNDARY.md`
- `docs/pm/map-calendar-reminders/IMPLEMENTATION_WORKSTREAMS.md`
- this handoff
- eight existing Map event screenshots under `output/e2e/map-kpop-event/`, refreshed by the complete desktop/mobile event run

## 7. Remaining Decisions And Risks

1. The development preview proves the scene UI and choice/result loop; it does not mean every production place should receive this production-arrival event.
2. Broadening real event eligibility beyond the authored broadcast-station, entertainment-agency, and production-center scope remains a product decision.
3. Persona-conditioned copy, richer participant binding, additional event families, Mini Scene generation, and CG/video presentation remain separate slices.
4. True-device mobile testing is still required before claiming physical-phone acceptance.
5. Repository-local `tmp/` assets and the `.agents` Python cache are unrelated and intentionally remain untracked and uncommitted.

## 8. Resume Check

On the next machine or session:

1. pull `origin/main`;
2. verify the commit named in the completion message is present;
3. run `npm.cmd install` only if dependencies are missing; this round changes no dependencies or lockfile;
4. start the existing Vite development server;
5. follow Section 3 for the shortest functional smoke.
