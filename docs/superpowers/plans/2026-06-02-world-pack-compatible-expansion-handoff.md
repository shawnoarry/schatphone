# World Pack Compatible Expansion Handoff

Updated: 2026-06-02

This handoff is for resuming the WorldBook / World Pack compatible-expansion work on another machine.

## Current Product Position

WorldBook now treats the user's main worldview as the core story premise. The user can write it directly, import it from Book, or keep the built-in fallback. World Pack is no longer only "pick one current setting pack"; it is becoming an additive expansion layer on top of that main worldview.

The V1 experience now works like this:

1. The user keeps one main worldview in WorldBook.
2. AI can analyze that worldview into a readable world profile.
3. WorldBook recommends compatible expansion packs, but the recommendation is advisory.
4. The user can browse and enable other supported packs after seeing fit and warning copy.
5. Multiple enabled packs can be active together.
6. Enabled packs feed App Store `World` entries and Chat Services candidates together.

Product rule: AI helps the user choose; it must not silently decide for them.

## Relevant Commits

- `11b1fa9 docs: define compatible world pack expansions`
  - Captured the product decision: no separate visible "base worldview" setup layer.
- `b0a1f8a docs: plan compatible world pack expansions`
  - Broke the work into implementation tasks.
- `b228953 feat: add world pack compatibility scoring`
  - Added the pure compatibility and recommendation helper.
- `7b3e266 feat: add world profile analysis helper`
  - Added AI world-profile prompt and normalized response parsing.
- `72f5e77 feat: add compatible world pack metadata`
  - Added compatibility metadata and first trial expansion packs.
- `7dbe0af feat: consume enabled world pack expansions`
  - Started consuming enabled packs in shared world entry helpers.
- `61544a1 feat: enable compatible world pack expansions`
  - Landed the current user-testable V1 chain through WorldBook, App Store, and Chat Services.
- `ff8a9ce docs: add app store mini app handoff`
  - Separate but adjacent App Store / mini-app handoff. Read it only when working on shop-shaped folder mini apps.

## Landed In This Slice

1. WorldBook Pack panel now shows:
   - AI World Profile
   - Enabled Expansions
   - Recommended Expansions
   - All Packs
2. Users can enable and disable supported expansion packs from WorldBook.
3. Legacy `activateWorldPack(packId)` still works and seeds enabled packs for older single-pack flows.
4. New persisted user state includes:
   - `worldProfileAnalysis`
   - `enabledWorldPackIds`
   - `worldPackEnablements`
5. Built-in trial expansion packs include:
   - `school_life`
   - `business_family`
   - `urban_mystery`
6. App Store `World` entries can come from multiple enabled packs.
7. Chat Services can show service-account candidates from multiple enabled packs.
8. Service candidate rows preserve their source pack id, so edit/reset/join actions apply to the right pack.
9. WorldBook still does not act as an app launcher. Users browse/open world-created entries from App Store.
10. Documentation now describes the product model as "one main worldview plus enabled compatible expansions".

## Files To Read First

1. `docs/superpowers/specs/2026-06-02-world-pack-compatible-expansion-design.md`
2. `docs/superpowers/plans/2026-06-02-world-pack-compatible-expansion-plan.md`
3. `docs/roadmap/TODO_ROADMAP.md`
4. `docs/pm/TODO_PM_STATUS_REPORT.md`
5. `src/lib/world-pack-compatibility.js`
6. `src/lib/world-profile-analysis.js`
7. `src/lib/world-pack-schema.js`
8. `src/stores/system.js`
9. `src/views/WorldBookView.vue`
10. `src/components/worldbook/CurrentWorldPackPanel.vue`
11. `src/lib/world-pack-app-bindings.js`
12. `src/lib/world-pack-service-accounts.js`
13. `src/views/ChatDirectoryView.vue`

## Validation Already Run

Before the handoff, the full working feature passed:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e
```

The build emitted the existing Vite note about `src/lib/push.js` being both dynamically and statically imported; it did not fail the build.

After the latest World Pack commit, the focused chain also passed:

```powershell
npm.cmd test -- tests/system-world-pack.test.js tests/worldbook-functional-ia.test.js tests/world-pack-service-accounts.test.js tests/chat-service-subscriptions.test.js tests/app-store-ui.test.js
```

Result: 5 test files, 74 tests passed.

## Immediate Resume Checklist

- [ ] Pull latest commits on the other machine.
- [ ] Run `git status --short` before editing. Do not revert unrelated local changes.
- [ ] Install dependencies if this is a fresh machine:

```powershell
npm.cmd install
npm.cmd exec -- playwright install chromium
```

- [ ] Run the focused World Pack validation:

```powershell
npm.cmd test -- tests/world-pack-compatibility.test.js tests/world-profile-analysis.test.js tests/world-pack-schema.test.js tests/world-interface.test.js tests/world-pack-app-bindings.test.js tests/system-world-pack.test.js tests/worldbook-functional-ia.test.js tests/world-pack-service-accounts.test.js tests/chat-service-subscriptions.test.js tests/app-store-ui.test.js
```

- [ ] Run browser acceptance:

```powershell
npm.cmd run test:e2e -- e2e/worldbook-acceptance.spec.js
```

- [ ] Start the local app and manually test the phone-sized flow:
  - [ ] open `Settings -> WorldBook -> Pack`;
  - [ ] run AI world-profile analysis;
  - [ ] enable `school_life`;
  - [ ] enable `business_family`;
  - [ ] optionally review `urban_mystery` as a needs-context / theme expansion;
  - [ ] open App Store `World` and confirm entries from both enabled packs appear;
  - [ ] open one World entry and confirm its target app receives `worldPack` and `worldApp` context;
  - [ ] open Chat Directory `Services` and confirm service candidates from both packs appear;
  - [ ] join one service account and confirm no other service is auto-joined;
  - [ ] disable one enabled pack in WorldBook and confirm its App Store entries / Chat candidates disappear.

## Next Product TODO

- [ ] Add one concrete built-in main worldview for real testing.
  - Recommended first fixture: a modern parallel-world city / school / social-media world, because it can exercise `school_life`, `business_family`, entertainment/fandom, and urban-mystery style expansions without needing new app modules.
  - Keep it exportable to Book so users can copy and edit it.
- [ ] Polish the real-phone WorldBook Pack panel:
  - clearer pack preview spacing;
  - less dense compatibility reasons;
  - stronger enabled-pack summary;
  - safer disable button hierarchy;
  - empty/loading/error states for AI analysis.
- [ ] Add a user-readable "what changes after enabling this pack" preview before confirm.
  - App Store entries
  - Chat service candidates
  - target-app wording
  - unsupported effects
- [ ] Harden terminology conflict handling when multiple packs change labels for the same target app.
- [ ] Decide how world-pack-generated shop entries coordinate with the newer App Store mini-app / target-folder model.
  - Read `docs/superpowers/plans/2026-06-02-app-store-mini-app-binding-handoff.md` first.
  - Keep App Store as entry/facade/placement owner.
  - Keep Food Delivery and Shopping as business-record owners.
- [ ] Add a product review pass for `urban_mystery`.
  - It should feel like an optional atmosphere or investigation layer, not a forced supernatural rewrite of a realistic world.
- [ ] Broaden target-app coverage only after the current school/business paths are comfortable on phone.

## Engineering TODO

- [ ] Add or update acceptance coverage for the built-in main worldview once it exists.
- [ ] Add a focused test that disables one of two enabled packs and confirms App Store `World` entries are recalculated.
- [ ] Add a focused test that disables one of two enabled packs and confirms Chat Services candidates are recalculated.
- [ ] Check backup/export/import with multiple enabled packs on a realistic user save.
- [ ] Consider a small deterministic ordering helper for enabled packs before adding drag/reorder UI.
- [ ] Keep compatibility scoring pure and local; AI should only produce the world profile, not the final enablement decision.

## Do Not Do

- Do not add a mandatory visible "base worldview" picker such as modern / ancient / future.
- Do not auto-enable packs from AI analysis.
- Do not hide supported packs just because AI did not recommend them.
- Do not let WorldBook become a launcher for world-created app entries.
- Do not create arbitrary app routes, stores, event rules, products, orders, schedules, or messages from a pack.
- Do not move Food Delivery, Shopping, Calendar, Map, or Chat business records into WorldBook.
- Do not map unsupported concepts like black market onto Shopping without a separate product decision.

## Local State Note

At the time this handoff was written, the local working tree still had unrelated documentation edits in:

- `README.md`
- `docs/roadmap/TODO_ROADMAP.md`

Those edits are App Store mini-app / folder-entry wording, not required for resuming World Pack compatible expansions. Keep them separate unless the user explicitly asks to continue the App Store mini-app line.
