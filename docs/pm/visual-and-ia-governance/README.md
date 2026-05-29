# Visual And IA Governance Package

Updated: 2026-05-29

Use this package for shell IA, visual ownership, page hierarchy, interaction consistency, and rebuild-vs-polish decisions.

Current Home customization baseline:

- `主屏 / 桌面 / Home` is the system desktop layer, not a user-facing app entry.
- The desktop edit state owns per-page layout templates and fixed slot content editing.
- `组件 / Widgets` owns widget creation, import, library state, and custom widget click-action configuration.
- `外观 / Appearance` owns broader theme, wallpaper, icon style, and possible template-management settings.
- `应用商城 / App Store` owns the app-entry management surface; `More` is no longer a Home app.
- App Library / App Store-like surfaces own app-entry visibility only.

The left-side Today View is a fixed native-system entry layer, not a selectable Home layout page; App Store stays there as the recovery entry when formal Home pages return items to their libraries.

Current visual pass:

- `应用商城 / App Store` is now a standalone native-system app with search, category filters, selected app detail, and Home-entry actions.
- `外观 / Appearance` has a first native-system control surface and first token-coverage pass for deeper subpages.
- Home Today View user-facing copy has been cleaned up for native-system language.
- Home edit mode is now slot-first: template selection and the unplaced-content library are on-demand, larger slots only offer exact-size widget/custom-widget candidates, and opening the library no longer preselects a random item.
- Widget Center style starters are protected by test as thumbnail cards, not iframe previews.
- `世界书 / WorldBook` now has a state-first Settings surface: active world overview, Current World Pack activation, service-template confirmation, world-kernel editor, profile templates, source links, and knowledge management appear in a clearer order.
- `文本库 / Book` now has a V1 installed-app-like source-library surface for read-first long text editing, export, and WorldBook source usage state.
- WorldBook's Book-source panel now supports source picking, selected-section activation, changed-source warning, and refresh action for phone-sized trials.
- WorldBook's Current World Pack panel now exposes active world-app entries, and Shopping shows the first world-app context banner for `补给站` with a user-triggered filter action.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `IMPLEMENTATION_WORKSTREAMS.md`

Also read when needed:

- `docs/design/DESIGN.md`
- `docs/overview/APPEARANCE_REBUILD_SCOPE.md`
- `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md`
- `docs/process/VISUAL_WORKFLOW.md`
- `docs/product-decisions/HOME_DESKTOP_LAYOUT_SYSTEM.md`
- `docs/references/VISUAL_ASSET_LIBRARY.md`
