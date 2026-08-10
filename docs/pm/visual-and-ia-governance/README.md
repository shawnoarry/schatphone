# Visual And IA Governance Package

Updated: 2026-08-10

Use this package for shell IA, visual ownership, page hierarchy, interaction consistency, and rebuild-vs-polish decisions.

Current Home customization baseline:

- `主屏 / 桌面 / Home` is the system desktop layer, not a user-facing app entry.
- The desktop edit state owns per-page layout templates and fixed slot content editing.
- `组件 / Widgets` owns widget creation, import, library state, and custom widget click-action configuration.
- `外观 / Appearance` owns broader theme, wallpaper, icon style, and possible template-management settings.
- `应用商城 / App Store` owns the app-entry management surface; `More` is no longer a Home app.
- App Library / App Store-like surfaces own app-entry visibility only.
- The default release Home shows three normal-mode pages: glanceable widgets and personal tools first, daily communication/planning/life apps including Music second, then System Status, Quick Heart, and Quick Disc. Appearance lets users choose two through five visible screens without altering any retained page template, slot placement, or content; Home edit mode always exposes all five pages.

The left-side Today View is a fixed native-system entry layer, not a selectable Home layout page; App Store stays there as the recovery entry when formal Home pages return items to their libraries.

Current visual pass:

- Visual governance now has a product-grade first-implementation gate. Visible surfaces must define user purpose, entry ownership, L0-L3 depth, state coverage, icon/control semantics, palette/material/background/media/depth/motion, responsive composition, and a reference/asset plan before implementation. Construction narration, flat all-in-one pages, excessive text buttons, unconsidered imagery, and label-swapped template reuse are acceptance failures rather than later-polish notes. `视觉专项：原型检索` provides a free-first reference discovery and adaptation stage when the user has no suitable prototype.
- `音乐 / Music` is a standalone installed app with a restrained record-library identity rather than a system dashboard. Its primary spaces are `发现 / Discover`, `专辑 / Albums`, and `我的 / My Music`; Search is a top utility, while Queue and Music Settings remain utility actions instead of competing bottom tabs. Discover uses a full-width real-cover weekly recommendation, four explicit personal/catalog shortcuts, the album shelf, and a bounded three-track Recently Played overview; `See All` enters My Music -> Recently Played. Albums gets a catalog-specific stacked-cover header and complete grid, while My Music gets a personal cover mosaic, collection summary, glance controls, and focused subcategories. Phone-sized layouts recompose these surfaces into the same three-space hierarchy with gesture-safe bottom navigation. Playback, queue, Now Playing, lyrics, playlist intake, and Track Details sharing stay consumer-facing; the Now Playing favorite action changes immediately to a strong accent solid-heart `Added` state and feeds My Music Favorites. Music Settings separates `Add Music` (URL/local files) from external `Music Sources` (ChKSz, no-key Radio Browser live radio, and custom JSON), local audio remains Music-owned rather than entering Gallery, and the global floating player preserves the live session without covering Home or app-owned bottom controls. During an active Map journey, a separate focused Map panel offers quick music/radio choices above that floating layer; closing the Map panel leaves Music playback and the float intact. A Chat-returned track opens as details without auto-play.
- `相机 / Camera` now has an installed-app identity: a restrained dark capture surface keeps prompt, mode, references, preview, and shutter together, while provider/model/default/routing/diagnostic work uses separate Camera-owned push-navigation pages. Gallery reference selection stays an embedded Camera sheet, and generated candidates expose separate Download, Keep in Gallery, and Discard outcomes.

- `应用商城 / App Store` is now a standalone native-system app with search, category filters, selected app detail, and Home-entry actions.
- `外观 / Appearance` has a first native-system control surface and first token-coverage pass for deeper subpages.
- Home Today View user-facing copy has been cleaned up for native-system language.
- Home edit mode is now slot-first: template selection and the unplaced-content library are on-demand, larger slots only offer exact-size widget/custom-widget candidates, and opening the library no longer preselects a random item.
- Widget Center style starters are protected by test as thumbnail cards, not iframe previews. Custom and imported appearance code now shares one validation/sanitization contract, renders in scriptless sandboxed previews, and keeps SchatPhone-owned click actions outside imported code.
- `世界书 / WorldBook` now has a state-first Settings surface: stable current-world-setting overview, then a single-focus workspace for Setting Text, structured encyclopedia entries, profile templates, optional capabilities/apps, and advanced compatibility; Pack identity stays inside capability surfaces.
- WorldBook Setting Text selection and changed-text review use layered sheets instead of stretching the Settings page inline.
- WorldBook's Setting Text panel answers which Book text AI reads now. WorldBook chooses active context; Book owns writing/editing. Unused or missing text references live in Advanced management, while active changed text stays in the active list with a confirm-new-version action.
- WorldBook's workspace presents those concerns as parallel setting layers rather than a required progression. Book writing/storage and WorldBook activation form one visible workflow, while structured encyclopedia entries, profile templates, capability packs, and fallback text remain independently optional.
- WorldBook's Profile Templates panel now has a clear Contacts handoff: WorldBook defines the fields a world needs, while `通讯录 / Contacts` owns filling concrete role, user, and NPC profile values; Contacts recognizes the handoff route, shows a focused entry note, and role detail has a V1 inline editor for those concrete values.
- Contacts now has a phone-like first entry pass: Search, My Profile, Recent interactions, Main Roles, and NPC / World Roles appear in the order users expect from a real contacts app, while deeper role hub work stays in the selected profile detail.
- Contacts world-field editing now gives dynamic worldview-template fields stable visual controls, so different world content can vary without creating a separate custom screen for every world.
- Contacts template changes now use a save-review card in the world-field editor so users can see update and preservation rules before committing a new template.
- Contacts AI world-field drafting appears as a secondary editor action: it fills draft fields only, shows status inline, and leaves Save as the user's explicit commit action.
- Contacts current-world template adaptation now appears as a soft review card in role detail, not a blocking modal: it explains why the profile may need the current-world template, shows carry-over/custom counts, and opens an AI draft adaptation path while keeping Save as the explicit commit.
- The full WorldBook Profile Templates -> Contacts concrete-value loop now has E2E coverage; visual follow-up should focus on making the template-adaptation review read like a clear before/after diff, not on rebuilding the handoff itself.
- WorldBook's Optional capability Packs and Knowledge panels have a first craft pass; knowledge creation and editing now use a bottom sheet so the Settings page stays scan-first.
- WorldBook's old Kernel panel is now advanced compatibility: a short base-worldview note only for cases with no active Book text. Templates keeps the same task-panel treatment with compact state headers, controlled editing/list areas, and stronger mobile card rhythm.
- `文本库 / Book` now has a V1 installed-app-like source-library surface for read-first long text editing, portable export, and WorldBook usage state; strict versioned `.worldbook.json` preserves lossless re-import data, while `.md` and `.txt` support external editing, expansion, reading, and copying. On phone-sized screens it separates Shelf -> Detail -> Editor so long text editing is a focused sheet rather than inline page expansion.
- WorldBook's Setting Text panel now supports Book text picking, selected-section activation, changed-text warning, and refresh action for phone-sized trials.
- The Modern Seoul K-pop Book catalog now exposes two independent core texts, six independent merged encyclopedia manuscripts, and one optional focused world rule for a confirmed music-show-day mini scene. WorldBook links each manuscript only after an explicit user choice, permits any encyclopedia subset including zero, and does not use a dedicated World Pack or hidden content binding. The focused rule defines content semantics only; no module trigger or renderer is implied.
- Roadmap 4.8 now defines the future Mini Scene UI as a shared product surface rather than a Chat card: Settings will show a dynamic per-module off/text/interactive choice and world-profile binding, Book will edit separate structured transform profiles, and Text/HTML Presenter Adapters will provide accessible modal states with visible fallback. None of this UI is implemented yet.
- WorldBook's Optional capability Packs panel now exposes active world-app entries as a snapshot and tells users to use App Store's `World` section for browsing, placement, and launch. It does not provide an App Store jump button or behave as a Settings-local launcher.
- World Pack's global app-entry unlock seam now has a first implementation: enabled compatible expansion-pack app bindings appear together as World entries in App Store and Home/App Library placement, while the target app still owns the launched workflow.
- WorldBook's Optional capability Packs panel now has a compatible-expansion IA: AI world-profile analysis recommends matching packs, users can still browse and toggle other supported packs, and the enabled-pack list stays separate from the legacy single-pack activation preview.
- World Pack's world UX package now has a first target-app seam: Shopping, Food Delivery, Calendar, and Map can show active-pack title/context/boundary treatment in the actual app while the source module keeps workflow ownership. Broader labels, accents, and safe UX variants still need hardening.
- The existing World Pack loop now has one focused Playwright journey across desktop and simulated-phone Chromium: explicit WorldBook activation, App Store World entries, Home placement, refresh persistence, Shopping/Food Delivery/Calendar/Map launch-and-return context, disabled fallback, long labels, overflow, page errors, and critical accessibility. This is automated simulated-device evidence only; true-device touch, browser chrome, keyboard, and safe-area acceptance remains open.
- WorldBook's Optional capability Packs panel now also has a guarded nonstandard-app proposal review surface: AI extraction or pasted JSON shows whitelist matches, loading/empty/error states, rejection reasons, and explicit confirmation before adding an appBinding. Confirmed entries are visible in App Store detail with world-pack/target-module metadata, can be placed from Home's library, and open the target app with world context; current dynamic coverage includes `transit_pass -> Map`, `reservation_board -> Calendar`, and `dispatch_board -> Food Delivery`. `black_market` is blocked as needing a dedicated app shell, so it is not presented as Shopping.
- User customization remains a first-class layer above World Pack defaults. Global Appearance CSS and Chat-scoped CSS exist, and the root shell exposes stable `data-app`, `data-route-scope`, `data-world-pack`, and `data-world-app` hooks. Persisted app/world-app scoped CSS remains runtime-compatible, but the current global Appearance surface no longer authors or exports app-owned layers. Global Appearance packs exclude app icons, app skins, scoped CSS, Home layout/widgets, and Chat appearance.
- `应用商城 / App Store` keeps desktop list/detail management, but phone-sized screens now open selected app details as a root-level sheet instead of stretching the catalog.
- `组件 / Widgets` now keeps phone-sized pages scan-first: custom widget editing and import JSON entry open as focused sheets instead of extending the Widget Center page inline. Those sheets now trap and restore focus, close with Escape, and keep validation feedback inside the active execution surface.
- `外观 / Appearance` Theme, Font, and App Icons keep state/previews visible first; phone-sized wallpaper-source selection, advanced CSS editing, custom font editing, and per-app icon/accent edits now open as focused sheets.
- Visual work now uses zero or one specialist skill per round. Playwright is the single default verification path, with focused day/night, desktop/mobile, screenshot, overflow, page-error, and critical axe coverage for Home, Settings, and Appearance.

- Chat App now applies the same entry-ownership rule inside the installed app: bottom `Me` is the user/social surface, the top-right gear opens Chat Settings, and Chat Appearance is a Chat-owned subpage with Kakao/WeChat/iMessage layout modes plus Chat-scoped CSS. The latest polish strengthens the phone-native feel with a Kakao-like Messages header/list sheet, clearer active bottom tabs, `Me` compact social stats plus recent-interaction avatars, and layout thumbnails in Chat Appearance.
- `网络与 API / Network & API` now treats endpoint entry as the primary setup path: users paste or type a URL, the app auto-detects Gemini native, OpenAI-compatible, OpenAI Responses, Anthropic Messages, and Azure OpenAI transport, and saved API configurations appear as the loadable dropdown. Common base/model/chat URLs, native responses/messages/deployment URLs, and local/server-auth compatible gateways should be handled through URL affordances; provider-brand templates should not return as first-level choice buttons on this system settings page.

- Network & API's current compact IA keeps URL, key, model input/selection, model-list refresh, connection test, and save-current-settings in one primary connection panel. Saved-configuration management and diagnostics remain available behind secondary disclosures instead of becoming default stacked page blocks.
- Network & API keeps Direct as the default and exposes Compatibility Proxy as an explicit segmented choice only for OpenAI-compatible endpoints. The disclosure names that the user's provider URL and Key pass through the selected relay; custom relay URL and optional independent proxy-access token stay inside advanced details. Native Gemini, Anthropic, Azure, and Responses transports remain direct.
- The first-use Chat activation loop is now complete at desktop and simulated-mobile browser acceptance: missing provider setup opens the existing Network & API flow, the originating thread and draft remain intact, and save plus a successful smoke test exposes an explicit return for the first manual AI reply. Hosted-provider and true-device evidence remain release-stage work.

## 2026-07-16 Portfolio Audit Baseline

The visual portfolio is no longer one undifferentiated rebuild queue. Current evidence supports four maturity treatments:

1. preserve and polish strong identities such as Home, Map, Food Delivery, and Chat instead of restarting them;
2. use targeted rebuild slices for usable but still tool-like surfaces such as Gallery, Calendar/Reminders, Shopping, and dense WorldBook states;
3. keep Phone, Wallet, Stock, and Files on the shared shell baseline until their product roles justify bespoke visual systems;
4. treat wide-viewport phone-shell behavior as a cross-surface product contract that must be decided before page-local desktop polish.

The complete target is a believable phone system rather than one universal skin: Native System surfaces share a coherent device language, installed apps keep deliberate identities, and hybrid surfaces inherit their active parent context. The current maturity matrix and candidate slices live in `STATUS_AND_HANDOFF.md`; they are audit classifications, not a second roadmap.

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
- `UI_APP_STORE_SAFE_POLISH_GUIDE.md`
- `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md`
