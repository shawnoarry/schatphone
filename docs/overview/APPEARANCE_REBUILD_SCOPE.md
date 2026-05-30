# SchatPhone Appearance Rebuild Scope

Updated: 2026-05-30

Purpose: this is the handoff reference for visual rebuild breadth.

Use it to answer:

- which surfaces should be treated as light polish targets;
- which surfaces need structural restyling;
- which surfaces should be treated as full visual rebuild targets.

This file is a scope reference, not a live task board. Active work status still belongs in `docs/roadmap/TODO_ROADMAP.md`.

## 1. Core Verdict

Under the current plan, the appearance layer should be treated as a full rebuild, not an incremental polish pass.

Why:

- the project already proves many visual features technically;
- the missing part is not capability coverage, but a converged product-grade visual language;
- many mature modules still read like functional tools instead of one believable virtual phone.

Practical meaning:

1. keep behavior and ownership contracts;
2. feel free to rebuild presentation aggressively;
3. do not treat current page chrome, card skins, spacing, blur, icon feel, or motion language as final.

## 2. What Already Exists Technically

The project is not starting from zero on appearance capability.

Already implemented:

1. theme switching and wallpaper fallback
2. wallpaper source modes: theme, gallery, and URL
3. font presets and custom font stack
4. lock-screen clock style selection
5. status-bar and haptic toggles
6. custom CSS entry
7. app-icon preset and accent customization
8. widget restore, custom widget creation, and import flow
9. multi-page Home layout baseline with widgets and app entries
10. lock-screen grouped notifications and in-shell banners
11. Gallery asset categories and cross-module media reuse
12. Map visual settings and optional AI visual refresh path

Conclusion:

- the control layer is broad enough;
- the missing part is converged visual language, not basic toggle coverage.

## 3. Why A Full Rebuild Is Still Needed

The current UI still reads as capability-first and page-local.

Main reasons:

1. there is no single shell-level visual language across Lock, Home, Settings, Chat, Photos, and Map;
2. many pages still feel like tools or admin panels rather than a phone OS;
3. module identity exists semantically, but not yet as a polished product-grade visual system;
4. Appearance still mixes system controls with visual-authoring tools too flatly;
5. many style tokens are local and opportunistic rather than authoritative;
6. mature modules already have meaningful behavior, but still lack a unified immersive presentation.

## 4. Rebuild Scope By Layer

### 4.1 Shell Layer

These should all be treated as full visual rebuild targets:

- Lock Screen
- Home shell
- notification surfaces
- theme/wallpaper shell treatment
- status bar and micro shell details

Preserve:

- lock guard and route-return behavior
- notification identity/routing behavior
- wallpaper source semantics
- icon/wallpaper/widget setting contracts
- safe fallbacks for missing data

### 4.2 Appearance Control Center

`AppearanceView.vue` is functionally real, but should be fully restructured visually.

Why:

- daily appearance controls and advanced creation tools should not feel like one flat settings pile;
- Widget workshop concerns should be clearly separated from everyday appearance basics;
- the page should read like a system customization center, not a developer console.

Preserve:

- theme, wallpaper, font, icon, and widget-setting semantics
- save behavior and safety feedback
- wallpaper source compatibility
- app-icon fallback rules
- widget import validation and restore safety

Current interaction baseline:

- phone-sized Appearance subpages should stay scan-first;
- wallpaper source, advanced CSS, custom font-stack, and per-app icon/accent editing should open in focused sheets/drawers/subpages instead of stretching one long Settings-style scroll;
- icon preset options must include all built-in app glyphs so default states remain visible and editable.

### 4.3 Mature Content Modules

These modules already matter product-wise, so their current visuals should not be protected just because they are functional:

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

Each of these should be treated as a real rebuild target.

### 4.4 Ambiguous Or Secondary Modules

These should inherit the new global shell first and receive less bespoke visual design until their product role is more mature:

- Phone
- Wallet
- Stock
- Files
- More

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

This is not a live roadmap. It is the safest grouping logic for future execution:

1. global visual foundation
   - color system
   - typography
   - spacing scale
   - radius/shadow rules
   - blur/tint policy
   - icon style
   - motion language
2. shell surfaces
   - Lock Screen
   - Home
   - Dock
   - wallpaper readability treatment
   - notifications
3. Appearance and system-control pages
   - Appearance
   - Settings
   - Network
   - basic system pages
4. core immersive apps
   - Chat
   - Photos
   - Map
   - Calendar
5. support modules
   - Contacts
   - Chat Directory
   - WorldBook
   - Profile
6. placeholder or secondary modules
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
