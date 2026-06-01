# Visual And IA Governance Package

Updated: 2026-05-31

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
- `世界书 / WorldBook` now has a state-first Settings surface: active world overview, then a single-focus control console for source links, Current World Pack activation, world-kernel fallback, profile templates, and knowledge management.
- WorldBook source selection and changed-source review use layered sheets instead of stretching the Settings page inline.
- WorldBook's Sources panel now uses stats plus linked-source cards instead of a generic Settings list; source removal is visually separated from normal open/toggle actions.
- WorldBook's Current World Pack and Knowledge panels have a first craft pass; knowledge creation and editing now use a bottom sheet so the Settings page stays scan-first.
- WorldBook's Kernel and Templates panels now share the same task-panel treatment: compact state headers, controlled editing/list areas, and stronger mobile card rhythm.
- `文本库 / Book` now has a V1 installed-app-like source-library surface for read-first long text editing, export, and WorldBook source usage state; on phone-sized screens it separates Shelf -> Detail -> Editor so long text editing is a focused sheet rather than inline page expansion.
- WorldBook's Book-source panel now supports source picking, selected-section activation, changed-source warning, and refresh action for phone-sized trials.
- WorldBook's Current World Pack panel now exposes active world-app entries as a snapshot and tells users to use App Store's `World` section for browsing, placement, and launch. It does not provide an App Store jump button or behave as a Settings-local launcher.
- World Pack's global app-entry unlock seam now has a first implementation: enabled compatible expansion-pack app bindings appear together as World entries in App Store and Home/App Library placement, while the target app still owns the launched workflow.
- WorldBook's Current World Pack panel now has a compatible-expansion IA: AI world-profile analysis recommends matching packs, users can still browse and enable other supported packs, and the enabled-pack list stays separate from the legacy single-pack activation preview.
- World Pack's world UX package now has a first target-app seam: Shopping, Food Delivery, Calendar, and Map can show active-pack title/context/boundary treatment in the actual app while the source module keeps workflow ownership. Broader labels, accents, and safe UX variants still need hardening.
- WorldBook's Current World Pack panel now also has a guarded nonstandard-app proposal review surface: AI extraction or pasted JSON shows whitelist matches, loading/empty/error states, rejection reasons, and explicit confirmation before adding an appBinding. Confirmed entries are visible in App Store detail with world-pack/target-module metadata, can be placed from Home's library, and open the target app with world context; current dynamic coverage includes `transit_pass -> Map`, `reservation_board -> Calendar`, and `dispatch_board -> Food Delivery`. `black_market` is blocked as needing a dedicated app shell, so it is not presented as Shopping.
- User customization remains a first-class layer above World Pack defaults. Global Appearance CSS and Chat-scoped CSS already exist, the root app shell now exposes stable `data-app`, `data-route-scope`, `data-world-pack`, and `data-world-app` hooks, and Appearance Advanced CSS now has app/world-app scoped CSS authoring with active World Pack entry selection, manual fallback, exact target previews, pause/clear recovery, app-vs-world-app layer-order protection, and Appearance pack import/export for portable visual layers without copying Home layout, widgets, or Chat-specific appearance.
- `应用商城 / App Store` keeps desktop list/detail management, but phone-sized screens now open selected app details as a root-level sheet instead of stretching the catalog.
- `组件 / Widgets` now keeps phone-sized pages scan-first: custom widget editing and import JSON entry open as focused sheets instead of extending the Widget Center page inline.
- `外观 / Appearance` Theme, Font, and App Icons keep state/previews visible first; phone-sized wallpaper-source selection, advanced CSS editing, custom font editing, and per-app icon/accent edits now open as focused sheets.

- Chat App now applies the same entry-ownership rule inside the installed app: bottom `Me` is the user/social surface, the top-right gear opens Chat Settings, and Chat Appearance is a Chat-owned subpage with Kakao/WeChat/iMessage layout modes plus Chat-scoped CSS.

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
