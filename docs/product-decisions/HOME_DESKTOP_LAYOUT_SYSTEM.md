# Home Desktop Layout System

Updated: 2026-05-23

This document defines the target Home model for SchatPhone.

It is a product-decision document, not an implementation plan.

## 1. Decision Summary

Home should be treated as a phone desktop layout system, not as a fixed feature menu.

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
- `4x2` large-widget slot;
- `4x3` large-widget slot.

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

- `1x1` slots may hold app shortcuts, folders, small widgets, or quick actions;
- widget slots may hold only widgets of the same size;
- a built-in widget or custom widget definition may create multiple placed instances when repeat placement is supported.

## 4. Template Selection

The layout template is a Home/Appearance concern, not an App Store concern.

Recommended ownership:

- Home edit mode owns quick per-page template changes because users see the slots there;
- Appearance may also expose template management because it owns broader visual customization;
- Widget Center owns widget creation/import and Home edit entry points, but not whole-page template catalogs.

Template rules:

- every template must fit the formal Home page grid;
- template slots must use approved sizes such as `1x1`, `2x1`, `2x2`, `4x2`, and `4x3`;
- normal mode never shows empty template slots;
- edit mode shows empty template slots clearly enough for users to understand size and placement;
- changing a page template needs a conflict rule for content that no longer fits.

Recommended first conflict rule:

1. preserve any placed item that still fits an equivalent slot;
2. move unmatched placed items into a recoverable holding area such as the app-entry library or widget library;
3. never silently delete user-created widgets or custom widget definitions.

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
3. Home stores that action as metadata outside the user-authored code;
4. normal-mode click runs the stored action;
5. edit-mode click changes the slot content.

Widget code should not be required to know SchatPhone routes.

Recommended first action types:

- no action;
- open app entry by app id;
- open approved system entry;
- later: controlled quick action.

Avoid giving imported widget code direct router control. If richer custom interaction is needed later, add a controlled message protocol instead of allowing arbitrary navigation.

## 9. Dock Return Rule

Dock entries are visible from every formal Home page.

When a Dock app is launched from Home page `N`, its return target should be Home page `N`.

The left-side Today View is the exception: launching from Today View should normalize return to formal Home page 1.

Follow `docs/process/NAVIGATION_RETURN_CONTRACT.md`.

## 10. Implementation Implications

The current implementation stores each page mostly as an ordered list of tile ids. That supports default ordering, but it does not fully represent fixed slot placement.

The target model likely needs:

- page templates;
- slot ids;
- slot dimensions;
- placed item instances;
- an app-entry library;
- an App Store-like presentation over that app-entry library;
- a widget-definition library;
- widget instances with per-instance placement and optional action metadata;
- migration from the current ordered pages to the new template-slot model.

This should be implemented as a dedicated Home layout slice after the product model is approved.

## 11. Guardrails

- Do not return to free-form drag placement as the primary interaction.
- Do not make empty slots visible in normal mode.
- Do not hard-code app page placement as a permanent product rule.
- Do not treat App Store copy as real download, unlock, entitlement, or feature gating.
- Do not put widget packages, custom widget import, themes, wallpapers, or icon-style packages under App Store.
- Do not require users to write navigation behavior inside custom widget code.
- Do not make one page the only customization page; every formal Home page can contain custom widgets.
- Do not remove recovery paths for hidden app entries.
