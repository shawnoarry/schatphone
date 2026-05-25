# Visual And IA Governance Status And Handoff

Updated: 2026-05-25

This file is the handoff page for visual hierarchy, information architecture, and rebuild-vs-polish decisions.

## 1. Current Status

Status: `PARTIAL_DONE`

What is already landed:

1. this package now exists as the place to separate structural IA issues from simple styling issues;
2. several functional lanes already have clearer structure baselines, such as map-first Map and safer in-app confirmation/dialog patterns;
3. the product direction is explicit that current UI is still functional scaffolding in many places, not final visual immersion.
4. Contacts detail now has a first-pass Role Hub overview that separates L0 summary from deeper profile, relationship, memory, and danger-zone sections.
5. Contacts detail item sections now use grouped Manual details vs Event-attached presentation, with linked-memory entry points for event-attached items.
6. Contacts memory detail now exposes a small source-audit layer with per-module cards and supporting-event drill-down, making relationship-source provenance readable without moving ownership away from source modules.
7. Contacts detail now also supports inline editing for manual role-detail items and a visible linked-activity list below the summary card, making the page feel more like an active role-management hub.
8. Contacts memory presentation now includes a lightweight review toolbar and selected-memory headline facts, so memory management is no longer only a flat list-plus-delete flow.
9. Contacts memory review now includes lifecycle status and note management, making the role hub feel functionally complete enough to leave 4.1 and move on.
10. Home now has a product-decision baseline for a template-slot desktop layout system in `docs/product-decisions/HOME_DESKTOP_LAYOUT_SYSTEM.md`.
11. External visual reference assets are documented as a cross-PC confirmed path in `docs/references/VISUAL_ASSET_LIBRARY.md`.
12. Home now has a first-pass neutral template library: six abstract 4-column x 6-row layouts, per-formal-page template selection, explicit slot placement records, edit-mode grayscale slot previews, local slot content replacement, and a lightweight edit-mode content library for unplaced entries.
13. Home slot editing is now content-type mixed: apps, folders, built-in widgets, and custom widgets can be placed when they fit the selected slot. Widget Center remains the widget creation/import and edit-entry surface; Appearance may later expose broader template management; App Store-like surfaces should remain app-entry visibility management only.
14. Custom widget actions now have a first-pass functional loop: Widget Center stores optional click action metadata outside imported code, Home executes whitelisted app/system targets in normal mode, and edit mode still uses taps for slot editing.
15. The first cross-entry visual pass is landed for Home customization: `主屏 / 桌面 / Home` is documented as a system desktop layer, not a visible app; `组件 / Widgets`, `外观 / Appearance`, and `更多 / More` now expose coordinated UI entry points into desktop editing without making App Library-like behavior a real download store.
16. `更多 / More` now uses the native-system visual token layer and presents App Library as the primary app-entry management surface, with system-style quick entries, switches, and scene preview instead of white utility cards or developer-facing expansion notes.
17. `外观 / Appearance` root now has a first native-system control-surface pass: a current-look overview, Home desktop template preview, and grouped Theme/Font/Icon/Widget entries. The deeper Theme, Font, and Icon subpages also have a first token-coverage pass to reduce white-card and hardcoded-blue leakage in the dark system theme.
18. Home Today View copy now uses native-system language for optional entries and smart summaries instead of developer-facing install, hidden-system, fixed-placeholder, or lab labels.
19. Widget Center has a regression test that keeps style starter cards as lightweight thumbnails rather than iframe previews; live iframes remain reserved for draft and saved custom widget previews.
20. Home edit mode has been consolidated around fixed slots: template selection and the unplaced-content library are on-demand, Dock Widgets long-press enters the current page's edit mode, slot replacement candidates are exact-size filtered so app/folder entries stay in `1x1` slots, and incompatible overflow entries no longer render inside the template grid.

Still incomplete:

1. the global shell, Chat, Map, Gallery, Shopping, and Food Delivery all still need later rebuild-quality passes;
2. some pages still mix destructive actions and ordinary edits too closely;
3. Contacts detail can now move out of active IA completion work; remaining effort should focus on later polish or on 4.2 memory dedupe/recall semantics.
4. Home layout storage still keeps ordered page arrays as a compatibility/recovery layer. A later slice should add a fuller App Library / recovery manager and per-instance action overrides if users need the same widget definition to behave differently in different slots.

## 2. Recommended Next Slice

1. Continue the Home template-slot function loop before deeper visual polish: fuller App Library entry management and per-instance action overrides if needed.
2. After the loop is stable, polish the remaining related UI surfaces together: desktop edit mode microcopy/states, `组件 / Widgets` component craftsmanship, and any lingering deep `外观 / Appearance` controls that still feel utility-like; `更多 / More` has its first native-system App Library pass but still needs a fuller recovery manager later.
3. Keep deciding rebuild vs polish module by module instead of doing cosmetic passes everywhere.
4. Continue isolating destructive actions visually and structurally from normal edit flows.

## 3. Do Not Do

1. Do not use visual polish to hide unresolved IA confusion.
2. Do not overbuild a decorative system before the module workflow is stable.
3. Do not make destructive actions look equivalent to safe edits.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/process/VISUAL_WORKFLOW.md`
6. `docs/overview/APPEARANCE_REBUILD_SCOPE.md`
7. `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md`
8. `docs/product-decisions/HOME_DESKTOP_LAYOUT_SYSTEM.md`
9. `docs/references/VISUAL_ASSET_LIBRARY.md`
