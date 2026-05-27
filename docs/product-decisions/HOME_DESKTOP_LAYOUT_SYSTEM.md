# Home Desktop Layout System

Updated: 2026-05-25

This document defines the target Home model for SchatPhone.

It is a product-decision document, not an implementation plan.

## 1. Decision Summary

Home should be treated as a phone desktop layout system, not as a fixed feature menu.

Naming clarification:

- `主屏 / 桌面 / Home` is the visible system desktop layer. It is not a user-facing app entry.
- When product work says "apps", it should mean visible app destinations such as `外观 / Appearance`, `组件 / Widgets`, `更多 / More`, `聊天 / Chat`, and similar entries from `docs/pm/MODULE_NAME_GLOSSARY.md`.
- The Home layout editor is a desktop edit state, not a `Home app`.

Current direction:

1. SchatPhone provides default Home templates.
2. Each formal Home page can use a selectable layout template.
3. Each selected template defines fixed slot sizes and positions.
4. Users choose what each slot contains.
5. Empty slots are invisible in normal mode and visible only in Home edit mode.
6. Apps, folders, built-in widgets, and custom widget instances are separate content types.
7. App entries are not absolutely fixed to a page; default placement is only the initial template.
8. App Store is an App Library presentation layer for entry management, not a real download, unlock, or install system.
9. Dock entries stay globally reachable and should not need duplicate Home icons by default.
10. Custom widgets should separate visual code from click behavior.
11. Home return navigation must preserve the page that launched the app or widget action.
12. Layout templates express geometry only. They should not tell users that a page is for social, planning, media, assets, or any other specific purpose.

## 2. Home Page Model

User-facing Home consists of:

- left-side Today View;
- five formal Home pages;
- persistent Dock.

The Today View is a native-system surface and does not count as a formal layout page.

Formal Home pages should be template-based. A page template defines slots such as:

- `1x1` app or small-widget slot;
- `2x1` widget slot;
- `2x2` widget slot;
- `4x1` strip-widget slot;
- `4x2` large-widget slot;
- `4x3` large-widget slot;
- `4x4` poster-widget slot.

The template owns slot shape. The user owns slot content.

Each formal Home page may later switch between approved templates. Template switching changes the available slot shapes for that page; it should not change which app or widget capabilities exist in the system.

## 3. Slot Rules

Normal mode:

- filled slots render their content;
- empty slots render nothing and show only wallpaper;
- widgets run their normal interaction;
- app and folder slots launch their targets.

Edit mode:

- every template slot is visible;
- empty slots show their size and placement;
- filled slots can be changed or cleared;
- the picker filters candidates by slot size.

Candidate filtering:

- slots filter by size and content type, not by a prescribed screen purpose;
- apps and folders are `1x1` Home entries and may only use `1x1` slots;
- built-in widgets and custom widget instances must match the selected slot size exactly;
- larger slots are widget slots and should not accept smaller app or folder entries as automatic filler;
- a built-in widget or custom widget definition may create multiple placed instances when repeat placement is supported.

## 4. Template Selection

The layout template is a Home/Appearance concern, not an App Store concern.

Template selection should stay visually simple. The product meaning is "choose a layout framework", not "choose a workflow type".

Preferred presentation:

- show abstract 4-column x 6-row thumbnails;
- use neutral labels such as `Layout A` through `Layout F`;
- avoid category names, popularity badges, trend labels, user counts, pricing, or recommendations;
- do not show sample app icons, real widget content, or example copy inside the thumbnails;
- use grayscale placeholder blocks to communicate only slot proportions and placement.

Recommended ownership:

- Home edit mode owns quick per-page template changes because users see the slots there;
- Appearance may also expose template management because it owns broader visual customization;
- Widget Center owns widget creation/import and Home edit entry points, but not whole-page template catalogs.
- App Library / App Store-like presentation owns app-entry visibility management only. It should not own layout templates, widget packs, themes, wallpapers, or icon styles.

Template rules:

- every template must fit the formal Home page grid;
- template slots must use approved sizes such as `1x1`, `2x1`, `2x2`, `4x1`, `4x2`, `4x3`, and `4x4`;
- normal mode never shows empty template slots;
- edit mode shows empty template slots clearly enough for users to understand size and placement;
- changing a page template needs a conflict rule for content that no longer fits.

Recommended first conflict rule:

1. preserve any placed item that still fits an equivalent slot;
2. move unmatched placed items into a recoverable holding area such as the app-entry library or widget library;
3. never silently delete user-created widgets or custom widget definitions.

Starter template library:

| Template | Neutral geometry |
| --- | --- |
| Layout A | `4x2`, `2x2`, four `1x1`, `4x2` |
| Layout B | `4x3`, two `2x1`, eight `1x1` |
| Layout C | two `2x2`, `4x2`, eight `1x1` |
| Layout D | `4x2`, `4x1`, `4x2`, four `1x1` |
| Layout E | two `2x2`, `4x2`, two `2x2` |
| Layout F | two `2x2`, `4x1`, `4x2`, four `1x1` |
| Layout G | `4x4`, two `2x2` |

These names are deliberately neutral. The system may use them as defaults for initial pages, but the UI should not imply that a specific template belongs to a specific kind of content.

Current first-pass implementation:

- template ids are stored per formal Home page;
- page content is still stored as ordered tile ids for compatibility and recovery;
- explicit `homeLayoutSlotPlacements` records can bind a tile id to a concrete template slot id;
- the renderer honors explicit slot placements first, and template changes keep only placements that remain valid for the selected template instead of auto-filling the new layout from the old page order;
- compatible means exact size match; app and folder entries remain `1x1` and do not fill larger widget slots;
- items that cannot fit the selected template stay recoverable rather than being deleted: normal mode does not render them, and edit mode returns them to the on-demand content library;
- in edit mode, empty and filled slots open the same local content picker filtered by what fits that slot, and the picker can show the full compatible app/widget library rather than only items that are currently unplaced;
- the picker groups available content as apps, folders, built-in widgets, and custom widgets;
- filled slots can be replaced or cleared from that picker;
- edit mode also exposes a lightweight content library for currently unplaced apps, folders, built-in widgets, and custom widgets; selecting an item highlights compatible empty slots for recovery;
- default Home content is distributed across multiple formal pages so visible entries fit their selected template slots without relying on a normal-mode overflow row;
- persisted Home desktop layouts carry a setup version; unversioned local layouts are treated as legacy setup data and migrate once to the cleaned default so old browser state cannot keep the crowded pre-slot Home arrangement alive;
- default app entries are initial placement only, so removing a Home shortcut must not remove the underlying app capability;
- empty template slots remain invisible outside edit mode;
- edit mode is now slot-first: tapping a filled or empty slot opens the same-size content picker, while the old free-move / grid-absorption path is disabled in the visible editing loop;
- overflow entries must not render inside `.home-grid`, because that makes app icons appear to occupy large widget slots after a template switch;
- the per-page template picker and global content library are collapsed by default so the user can see the target slots before choosing a template or unplaced item;
- built-in widget metadata is shared between Home and Widget Center so size labels, icons, and library previews stay aligned.
- the first visual pass now connects the desktop edit state with three visible app surfaces: `组件 / Widgets`, `外观 / Appearance`, and `更多 / More`;
- `组件 / Widgets` provides direct entry into desktop slot editing and keeps custom-widget action controls;
- `组件 / Widgets` presents official and custom widgets as visual preview cards, supports exact-size filtering, and keeps imported visual code in the widget library until the user chooses a matching Home slot;
- `外观 / Appearance` shows neutral Home layout template previews and enters desktop editing for concrete placement;
- `更多 / More` contains the first App Library-like entry-management surface: category filters, app detail, open/add-to-Home/remove-from-Home actions, and a protected system entry rule, without acting as a real download store.

## 5. App Entry Placement

Apps and folders should be available through an app-entry library.

The default Home template should avoid duplicating Dock apps. For example, if Chat is in the Dock, the default Home page does not need another Chat icon.

Users may still choose to place a Dock app shortcut on any formal Home page later.

Rules:

- default templates may place high-confidence app entries;
- users can hide an app from Home without disabling the underlying function;
- users can restore hidden entries from the app-entry library;
- system-critical access should remain recoverable through Dock, More, Settings, or an app-library surface.

## 6. App Store Presentation

SchatPhone may present the app-entry library as an App Store-like surface for immersion.

This surface is not a real download, unlock, or entitlement system. All normal app modules are understood as available inside the virtual phone. The store presentation only manages Home entry visibility and gives each app a more polished listing.

Expected listing content:

- app icon;
- app name;
- short description;
- category;
- current Home-entry state;
- actions such as open, add to Home, remove from Home, or choose slot.

Preferred language:

- "Add to Home" is the product meaning;
- "Get" or "Install" may be used as immersive copy only if the UI makes it clear that no real download or feature unlock is happening.

Do not use the App Store presentation for:

- widget packages;
- custom widget import;
- theme packages;
- wallpaper, icon-style, or font customization.

Those belong to Widget Center or Appearance.

## 7. Widget Model

Built-in functions, Home icons, and widget visibility are separate concerns.

Example: weather can exist as a system capability without requiring a standalone weather app icon.

Weather may be exposed through:

- a built-in weather widget;
- a custom widget bound to weather behavior;
- data available to Chat or role interaction logic;
- no visible Home item if the user removes it.

This means:

```text
capability exists
does not imply
Home app icon exists
does not imply
widget must be visible
```

Widget Center remains a standalone entry because widget customization is a major Home/Appearance feature and needs fast access to create, import, bind actions, and enter Home edit mode.

## 8. Custom Widget Behavior

Custom widget import should primarily import appearance.

Preferred user path:

1. user creates or imports widget visual code in Widget Center;
2. user chooses an optional click action in SchatPhone UI;
3. Home stores that action as normalized metadata outside the user-authored code;
4. normal-mode click runs the stored action and preserves the current Home page return source;
5. edit-mode click changes the slot content.

Widget code should not be required to know SchatPhone routes.

Recommended first action types:

- no action;
- open app entry by app id;
- open approved system entry;
- later: controlled quick action.

Avoid giving imported widget code direct router control. If richer custom interaction is needed later, add a controlled message protocol instead of allowing arbitrary navigation.

Current implementation:

- Widget Center exposes the first click-action controls on custom widget definitions.
- Imported widget JSON still accepts only `name`, `size`, and `code`; unsupported `action` fields are ignored with the same unsupported-field warning path.
- Home normal mode executes only the normalized action metadata. Edit mode keeps using custom widget taps for slot replacement.
- Supported app/system targets are centrally whitelisted in `src/lib/custom-widget-actions.js`.

## 9. Dock Return Rule

Dock entries are visible from every formal Home page.

When a Dock app is launched from Home page `N`, its return target should be Home page `N`.

The left-side Today View is the exception: launching from Today View should normalize return to formal Home page 1.

Current default Dock direction:

- keep `组件 / Widgets` in the Dock so the Home beautification loop is reachable from every formal Home page;
- short-pressing Dock `组件 / Widgets` opens Widget Center, while long-pressing it enters the current Home page's slot edit mode;
- keep `相册 / Photos` as a normal Home app entry by default, not as the default Dock entry;
- avoid duplicating the Dock `组件 / Widgets` entry on the default Home page.

Follow `docs/process/NAVIGATION_RETURN_CONTRACT.md`.

## 10. Implementation Implications

The current implementation now stores both ordered page content and explicit slot placements. Ordered page arrays remain useful as a compatibility and recovery layer; slot placement records are the beginning of the fixed-slot model.

The target model likely needs:

- page templates;
- slot ids;
- slot dimensions;
- placed item instances with per-slot metadata;
- per-page selected template ids;
- abstract template thumbnails for edit mode;
- an app-entry library;
- an App Store-like presentation over that app-entry library;
- a widget-definition library;
- widget instances with per-instance placement and optional action metadata;
- stronger recovery affordances for hidden, unmatched, or unplaced app and widget entries.

The current implementation has the first Home layout slice: template selection, edit-mode slot previews, explicit slot placement, slot content replacement, an on-demand edit-mode content library, shared built-in widget metadata, Dock Widgets long-press entry, definition-level custom widget click actions, and first App Library-style entry management are available. The next structural step is per-instance metadata if one widget definition needs different actions in different slots, plus stronger recovery affordances if user testing shows the current library paths are still too indirect.

## 11. Guardrails

- Do not return to free-form drag placement as the primary interaction.
- Do not make empty slots visible in normal mode.
- Do not hard-code app page placement as a permanent product rule.
- Do not treat App Store copy as real download, unlock, entitlement, or feature gating.
- Do not put widget packages, custom widget import, themes, wallpapers, or icon-style packages under App Store.
- Do not require users to write navigation behavior inside custom widget code.
- Do not make one page the only customization page; every formal Home page can contain custom widgets.
- Do not remove recovery paths for hidden app entries.
