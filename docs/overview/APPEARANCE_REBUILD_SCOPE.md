# SchatPhone Appearance Rebuild Scope

Updated: 2026-07-16

Purpose: this is the handoff reference for visual rebuild breadth.

Use it to answer:

- which surfaces should be treated as light polish targets;
- which surfaces need structural restyling;
- which surfaces should be treated as full visual rebuild targets.

This file is a scope reference, not a live task board. Active work status still belongs in `docs/roadmap/TODO_ROADMAP.md`.

## 1. Core Verdict

The long-term appearance target remains a full product-grade visual system, but the current portfolio should no longer be treated as one blanket rebuild queue.

Why:

- the project already proves many visual features technically;
- Home, Map, Food Delivery, and Chat now have recognizable visual identities worth preserving;
- Gallery, Calendar/Reminders, Shopping, and dense WorldBook states still read more like functional tools than finished phone apps;
- Phone, Wallet, Stock, and Files do not yet have enough product depth to justify bespoke rebuilds;
- wide desktop viewports currently weaken the phone illusion by stretching many surfaces into sparse full-width pages.

Practical meaning:

1. keep behavior and ownership contracts;
2. preserve strong page identities and rebuild only the weak surface or state;
3. decide cross-surface shell behavior before applying desktop fixes page by page;
4. do not treat current page chrome, card skins, spacing, blur, icon feel, or motion language as final merely because the feature is complete.

Current treatment labels:

- `preserve + polish`: a strong identity exists and should not be restarted;
- `targeted rebuild`: one page, state, or hierarchy needs structural visual work;
- `inherit shell`: the module should use the shared system foundation until its product role matures;
- `decision first`: implementation would otherwise encode an unresolved cross-surface contract.

## 2. What Already Exists Technically

The project is not starting from zero on appearance capability.

Already implemented:

1. independent day/night mode and system-theme foundation, with legacy `default` / `zen` compatibility and theme wallpaper fallback
2. wallpaper source modes: theme, gallery, and URL
3. font presets and custom font stack
4. lock-screen clock style selection
5. status-bar and haptic toggles
6. custom CSS entry
7. app-icon preset and accent customization
8. system App icon themes with a curated native-app allowlist
9. one-click style-kit composition for system theme, system App icon pack, and optional recommended wallpaper, with post-application customization detection
10. widget restore, custom widget creation, and import flow
11. multi-page Home layout baseline with widgets and app entries
12. lock-screen grouped notifications and in-shell banners
13. Gallery asset categories and cross-module media reuse
14. Map visual settings and optional AI visual refresh path

Conclusion:

- the control layer is broad enough;
- the missing part is converged visual language, not basic toggle coverage.

## 3. Why Visual Rebuild Work Is Still Needed

Parts of the current UI still read as capability-first and page-local even though several key surfaces now have strong identities.

Main reasons:

1. wide viewports do not yet have a frozen device-frame or adaptive-phone-workspace contract;
2. Gallery, Calendar/Reminders, Shopping, and several dense management states still feel like tools or admin panels rather than phone apps;
3. module identity is strong in Home, Chat, Map, and Food Delivery but uneven elsewhere;
4. some system and creation surfaces still mix primary state with advanced execution controls too flatly;
5. many style tokens remain local and opportunistic rather than authoritative, especially across deep forms and secondary apps;
6. visual evidence is broadest for initial mobile states, while wide layouts, true-device behavior, and loading/error/edit/destructive states remain less consistent.

## 4. Rebuild Scope By Layer

### 4.1 Shell Layer

These remain the highest-value shared visual surfaces, but their treatment differs:

- Lock Screen
- Home shell
- notification surfaces
- theme/wallpaper shell treatment
- status bar and micro shell details

Current treatment:

- Home: preserve and polish;
- Lock and notifications: targeted state polish after broader state evidence;
- wide-viewport shell framing: decision first because it affects every route.

Preserve:

- lock guard and route-return behavior
- notification identity/routing behavior
- wallpaper source semantics
- icon/wallpaper/widget setting contracts
- safe fallbacks for missing data

### 4.2 Appearance Control Center

`AppearanceView.vue` is functionally real and has a first system-control baseline. Future work should be targeted restructuring rather than another full restart.

Why:

- daily appearance controls and advanced creation tools should not feel like one flat settings pile;
- Widget workshop concerns should be clearly separated from everyday appearance basics;
- the page should read like a system customization center, not a developer console.

Preserve:

- theme, wallpaper, font, icon, and widget-setting semantics
- day/night mode, system-theme selection, system App icon pack, and style-kit source remain separate persisted concerns; a style kit does not become an immutable profile
- personal Gallery/URL wallpaper survives style-kit application unless the user explicitly applies the recommended wallpaper
- system App icon themes affect only curated native-system entries; commercial/branded logos remain unchanged and explicit App Store per-app overrides win
- save behavior and safety feedback
- wallpaper source compatibility
- app-icon fallback rules
- widget import validation and restore safety

Current interaction baseline:

- phone-sized Appearance subpages should stay scan-first;
- wallpaper source, advanced CSS, custom font-stack, and per-app icon/accent editing should open in focused sheets/drawers/subpages instead of stretching one long Settings-style scroll;
- icon preset options must include all built-in app glyphs so default states remain visible and editable.
- the first system-App-icon V1 extends the shared app-identity resolver with two vector-font mappings, covers Home, Dock, App Store, and notification presentation for an explicit native-system allowlist, persists independently from day/night theme, and falls back to the classic pack for missing or invalid values. In-page controls and commercial brand assets are outside this setting.

### 4.3 Mature Content Modules

These modules already matter product-wise, but the 2026-07-16 audit shows they need different treatments rather than one shared rebuild instruction:

- Chat
- Settings
- Photos / Gallery
- Map
- Calendar
- Contacts
- Chat Directory
- WorldBook
- Network
- Profile

Current treatment:

- preserve + polish: Chat and Map;
- targeted rebuild: Gallery's Photos-first entry, Calendar/Reminders schedule identity, Shopping platform identity, and selected dense WorldBook/Contacts states;
- system-baseline cleanup: Settings, Network, Profile, Appearance, Widgets, and App Store;
- verify before restyling: World Pack target-app paths and other hybrid entry-context surfaces.

### 4.4 Ambiguous Or Secondary Modules

These should inherit the global shell first and receive less bespoke visual design until their product role is more mature:

- Phone
- Wallet
- Stock
- Files
- More remains a compatibility redirect rather than a visual target.

## 5. What Must Be Preserved During Rebuild

The visual layer is rebuildable. These behavior contracts are not casually disposable:

1. `/lock -> /home` shell entry logic and lock guard
2. separation between in-shell notification identity and external push privacy policy
3. theme, wallpaper, font, icon, and widget setting semantics
4. Home app-entry protection and widget data model
5. Gallery asset-binding contracts used by wallpaper, chat, map, and role assets
6. Map simulation-first rule and optional AI-visual enhancement rule
7. explicit save actions and save feedback on important settings surfaces
8. safe fallback behavior for missing icons, assets, or invalid appearance data

## 6. Recommended Rebuild Grouping

This is not a live roadmap. It is the safest dependency order for future execution:

1. wide-viewport shell decision
   - centered device frame vs deliberately adaptive phone workspace
   - supported content width and interaction scale
   - behavior of status bar, home indicator, sheets, and overlays outside phone width
2. global visual foundation
   - color system
   - typography
   - spacing scale
   - radius/shadow rules
   - blur/tint policy
   - icon style
   - motion language
3. shell surfaces
   - Lock Screen
   - Home
   - Dock
   - wallpaper readability treatment
   - notifications
4. Appearance and system-control pages
   - Appearance
   - Settings
   - Network
   - basic system pages
5. focused core-app slices
   - Chat
   - Photos
   - Map
   - Calendar
6. support modules
   - Contacts
   - Chat Directory
   - WorldBook
   - Profile
7. placeholder or secondary modules
   - Phone
   - Wallet
   - Stock
   - Files
   - More

## 7. Practical Rule For Future Contributors

1. assume current visuals are replaceable unless a contract says otherwise;
2. when doing appearance-only work, prefer rebuilding structure and skins over endlessly patching old utility classes;
3. do not confuse "feature already exists" with "visual design is finished";
4. before adding page-local styling, decide whether it belongs to the shell language or the module identity language;
5. if a rebuild changes route/schema/core behavior, sync the main docs and roadmap in the same batch.
