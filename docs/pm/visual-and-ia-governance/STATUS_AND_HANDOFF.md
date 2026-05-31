# Visual And IA Governance Status And Handoff

Updated: 2026-05-31

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
15. The first cross-entry visual pass is landed for Home customization: `主屏 / 桌面 / Home` is documented as a system desktop layer, not a visible app; `组件 / Widgets`, `外观 / Appearance`, and `应用商城 / App Store` now expose coordinated UI entry points into desktop editing without making App Store behavior a real download store.
16. `更多 / More` has been retired as a Home app. Its useful responsibilities were merged into clearer owners: `应用商城 / App Store` owns app-entry visibility, `外观 / Appearance` owns the Home smart panel display switch, and `设置 / Settings` owns lock-screen focus mode.
17. `外观 / Appearance` root now has a first native-system control-surface pass: a current-look overview, Home desktop template preview, and grouped Theme/Font/Icon/Widget entries. The deeper Theme, Font, and Icon subpages also have a first token-coverage pass to reduce white-card and hardcoded-blue leakage in the dark system theme.
18. Home Today View copy now uses native-system language for optional entries and smart summaries instead of developer-facing install, hidden-system, fixed-placeholder, or lab labels.
19. Widget Center has a regression test that keeps style starter cards as lightweight thumbnails rather than iframe previews; live iframes remain reserved for draft and saved custom widget previews.
20. Home edit mode has been consolidated around fixed slots: template selection and the unplaced-content library are on-demand, Dock Widgets long-press enters the current page's edit mode, slot replacement candidates are exact-size filtered so app/folder entries stay in `1x1` slots, and incompatible overflow entries no longer render inside the template grid.
21. Home template switching now behaves like a new-device layout setup: when a page changes to a template with fewer or different slots, unmatched entries leave the visible desktop and return to the recoverable library instead of being auto-filled into the new layout. Slot replacement can browse the full compatible app/widget library and marks whether an item is already on another Home page, in the Dock, or only in the library.
22. Unversioned persisted Home desktop layouts now migrate once into the cleaned setup layout on hydration, so old local browser state does not keep showing the previous crowded Home arrangement after the template-slot model changes.
23. Widget Center now has a more visual market/custom/import pass: official widget styles render as effect thumbnails with size filters and preview sheets, custom widget creation leads with starter thumbnails and live previews, saved widgets render as preview cards, and import stays a visual-code library step instead of placing content directly on Home.
24. `应用商城 / App Store` now has a first standalone simulated-store management pass: search, category filters, selected app detail, open/add-to-Home/remove-from-Home actions, protected App Store entry handling, empty search state, and a route into Home slot edit mode with the selected hidden app ready for placement.
25. Home edit mode now separates opening the recoverable content library from selecting a specific item. Library-open-but-unselected keeps slots tappable for size-specific replacement, while selecting an item lights only compatible slots; slot picker filters now hide content-type tabs that cannot fit the selected slot size.
26. Home Today View now has a fixed `1x1` recovery-entry template: App Store is always reachable there, World Hub and future Cheats remain conditionally fixed system entries, and reserved slots are visible without making the `-1` screen a selectable formal Home layout.
27. WorldBook now has a state-first IA baseline inside Settings: active world overview, Current World Pack activation, service-template confirmation, Book source links, world-kernel editor, profile templates, and knowledge management appear in a clearer L0 -> L3 order. The page now uses a single-focus control console so Sources, Pack, Kernel, Templates, and Knowledge are task panels rather than one endlessly stacked Settings page.
28. Book now has a V1 app-like text-library surface with library list, read-first detail view, guarded editing, import/export controls, and WorldBook source usage state.
29. WorldBook's Book-source panel now has a phone-testable source picker with whole-document/selected-section activation, changed-source warning, and refresh action. Source picking and changed-source review now open as layered sheets instead of expanding inline inside the Settings page.
30. WorldBook's Current World Pack panel now shows active world-app entries, and Shopping has the first world-app banner/action pattern for `补给站` that explains ownership boundaries before normal Shopping controls.

31. WorldBook's Current World Pack and Knowledge panels now have a first internal craft pass: pack effects use clearer icon cards, knowledge starts with status metrics, and knowledge create/edit work opens in a focused bottom sheet instead of stretching the Settings page inline.
32. WorldBook's Sources panel now has a source-control surface: active/review/available/disabled stats, a clearer system fallback block, linked-source cards with status badges, and destructive source removal separated from ordinary open/toggle actions.
33. WorldBook's Kernel and Templates panels now match the same task-panel system: Kernel is a fallback editor with a compact count/status header, and Templates uses preset/world stats plus stronger template cards.
34. Book now follows a native-app IA split on phone-sized screens: open Book into the source shelf, tap a text asset to enter its read-first detail page, and open long-form editing as a root-level guarded sheet instead of an inline editor trapped inside the reading page.
35. App Store now follows the same mobile progressive-disclosure rule: the catalog list is the main view, and app details open as a root-level sheet on phone-sized screens while desktop keeps the list/detail management layout.
36. Widget Center now applies the same phone IA rule: library/starter/created widgets remain the scan-first page, while custom editing and import JSON entry open as focused mobile sheets. Widget code/import work should not be stretched inline across the whole phone page.
37. Appearance Theme now starts applying the same native-system execution-panel rule: phone-sized screens keep theme/wallpaper status scan-first, while wallpaper-source selection and advanced CSS editing open as focused sheets instead of staying inline in the main scroll.
38. Appearance Font and App Icons now follow the same rule: font presets and current app-icon states remain scan-first on phone-sized screens, while custom font-stack editing and per-app icon/accent edits open as focused sheets. Built-in app glyphs are also included in the icon preset list so default icons do not render as blank select values.
39. Chat App now has the first Kakao-like entry-ownership split for this visual pass: bottom `Me` is the identity/social surface, the gear opens Chat Settings, and Chat Appearance owns Kakao/WeChat/iMessage layout modes plus Chat-scoped CSS without moving global Appearance CSS.
40. World Pack direction is clarified for the next lane: activation remains in Settings -> WorldBook, but the effects must not stay trapped there. Active packs should provide a global world UX package for existing apps and unlock world-specific app entries into Home/App Store/App Library entry management.
41. The first World Pack global app-entry unlock seam is landed: active pack app bindings show as World entries in App Store, can be routed into Home/App Library placement, and open target apps with `worldPack`/`worldApp` context. Activation/review still belongs to Settings -> WorldBook.
42. The first World Pack target-app UX seam is landed: `world-pack-app-bindings` resolves active-pack labels, terminology, accent, route query, and boundary copy. Food Delivery shows dispatch world-app hero/banner plus safe Nearby default without taking over food-order workflow, Calendar shows reservation context without taking over schedule/push ownership, and Map shows transit context without taking over trip/location truth.
43. The Appearance / World Pack layering direction is clarified and has a working authoring/import path: World Pack supplies default immersive treatment, while user customization remains a higher-priority explicit override layer. `src/lib/app-shell-scope.js` adds stable `data-app`, `data-route-scope`, `data-world-pack`, and `data-world-app` hooks; Appearance Advanced CSS can save app/world-app scoped CSS through `settings.appearance.scopedCustomCss`; world-app scoped CSS is narrower and emitted after app-scoped CSS when both target the same element; and Appearance packs now export/import portable theme, wallpaper, icon, global CSS, and scoped CSS layers without carrying Home layout, widgets, or Chat-specific appearance.

44. WorldBook's Current World Pack panel now exposes the nonstandard-app proposal review UI: AI extraction or pasted JSON can be reviewed against the built-in whitelist, loading/empty/error states are explicit, rejected suggestions show why they were blocked, and confirmable suggestions require an explicit add-to-pack action before they become appBindings. Confirmed entries now carry world-pack/target-module metadata in App Store detail, can be placed from Home's library, and open their target app with world context; dynamic `transit_pass -> Map`, `reservation_board -> Calendar`, and `dispatch_board -> Food Delivery` paths have regression coverage.
45. Current World Pack now separates activation/status from global entry management: it shows the active world-app snapshot, routes users to App Store's `World` section for browse/place/open flows, shows service-account template availability as a Chat handoff, and keeps nonstandard proposal review as an advanced/collapsible area. `black_market` is blocked as `needs_dedicated_app` and does not masquerade as a Shopping world app.

Still incomplete:

1. the global shell, Chat, Map, Gallery, Shopping, and Food Delivery all still need later rebuild-quality passes;
2. some pages still mix destructive actions and ordinary edits too closely;
3. Contacts detail can now move out of active IA completion work; remaining effort should focus on later polish or on 4.2 memory dedupe/recall semantics.
4. Home layout storage still keeps ordered page arrays as a compatibility/recovery layer. A later slice should add per-instance action overrides if users need the same widget definition to behave differently in different slots.
5. World Pack app-entry unlocking now has a first implementation; the world UX package has first target-app context treatment in Shopping, Food Delivery, Calendar, and Map, Current World Pack hands off to App Store's `World` section instead of launching entries from Settings, and the nonstandard-app review UI is landed with loading/empty/error/rejection handling, but these paths still need phone-sized user testing and broader hardening for labels, accents, safe UX variants, and copy readability.
6. Custom CSS currently exists as global Appearance CSS, Chat-scoped CSS, and app/world-app scoped CSS from Appearance Advanced CSS. World-app target selection reads active World Pack entries, manual target fields remain as fallback, exact selector previews and pause/clear recovery are in place, and Appearance packs can now move the portable visual layer between saves. Finer component hooks should be added only when actual packs prove the current scopes too broad.

## 2. Recommended Next Slice

1. Continue the Home template-slot function loop before deeper visual polish: per-instance action overrides and stronger placement recovery if user testing still shows friction.
2. After the loop is stable, polish the remaining related UI surfaces together: desktop edit mode microcopy/states, deeper `组件 / Widgets` component craftsmanship, `应用商城 / App Store` listing craft, and any lingering deep `外观 / Appearance` controls that still feel utility-like.
3. Keep deciding rebuild vs polish module by module instead of doing cosmetic passes everywhere.
4. Continue isolating destructive actions visually and structurally from normal edit flows.
5. User-test the WorldBook -> `补给站` -> Shopping path, `救援调度` -> Food Delivery hero/banner/default Nearby path, `fandom_schedule_board` -> Calendar context, and `survival_safe_route_pass` -> Map context on mobile before broadening the same pattern to other archetypes.
6. When World Pack resumes, continue from the landed scoped CSS authoring/recovery/import, App Store handoff, service-account handoff, and nonstandard-app review slices: user-test Appearance packs, harden the world UX package seam, verify rejected/unsupported AI proposals stay invisible outside WorldBook, and only then add another archetype so an app's changed UI/UX appears in the actual app and user CSS can intentionally override it.

## 3. Do Not Do

1. Do not use visual polish to hide unresolved IA confusion.
2. Do not overbuild a decorative system before the module workflow is stable.
3. Do not make destructive actions look equivalent to safe edits.
4. Do not make World Pack UI/UX changes visible only in Settings when the user is meant to experience them globally.

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
