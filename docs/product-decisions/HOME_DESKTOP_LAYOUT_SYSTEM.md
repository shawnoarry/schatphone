# Home Desktop Layout System

Updated: 2026-05-23

This document defines the target Home model for SchatPhone.

It is a product-decision document, not an implementation plan.

## 1. Decision Summary

Home should be treated as a phone desktop layout system, not as a fixed feature menu.

Current direction:

1. SchatPhone provides default Home templates.
2. Each Home page template defines fixed slot sizes and positions.
3. Users choose what each slot contains.
4. Empty slots are invisible in normal mode and visible only in Home edit mode.
5. Apps, folders, built-in widgets, and custom widget instances are separate content types.
6. App entries are not absolutely fixed to a page; default placement is only the initial template.
7. Dock entries stay globally reachable and should not need duplicate Home icons by default.
8. Custom widgets should separate visual code from click behavior.
9. Home return navigation must preserve the page that launched the app or widget action.

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

## 4. App Entry Placement

Apps and folders should be available through an app-entry library.

The default Home template should avoid duplicating Dock apps. For example, if Chat is in the Dock, the default Home page does not need another Chat icon.

Users may still choose to place a Dock app shortcut on any formal Home page later.

Rules:

- default templates may place high-confidence app entries;
- users can hide an app from Home without disabling the underlying function;
- users can restore hidden entries from the app-entry library;
- system-critical access should remain recoverable through Dock, More, Settings, or an app-library surface.

## 5. Widget Model

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

## 6. Custom Widget Behavior

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

## 7. Dock Return Rule

Dock entries are visible from every formal Home page.

When a Dock app is launched from Home page `N`, its return target should be Home page `N`.

The left-side Today View is the exception: launching from Today View should normalize return to formal Home page 1.

Follow `docs/process/NAVIGATION_RETURN_CONTRACT.md`.

## 8. Implementation Implications

The current implementation stores each page mostly as an ordered list of tile ids. That supports default ordering, but it does not fully represent fixed slot placement.

The target model likely needs:

- page templates;
- slot ids;
- slot dimensions;
- placed item instances;
- an app-entry library;
- a widget-definition library;
- widget instances with per-instance placement and optional action metadata;
- migration from the current ordered pages to the new template-slot model.

This should be implemented as a dedicated Home layout slice after the product model is approved.

## 9. Guardrails

- Do not return to free-form drag placement as the primary interaction.
- Do not make empty slots visible in normal mode.
- Do not hard-code app page placement as a permanent product rule.
- Do not require users to write navigation behavior inside custom widget code.
- Do not make one page the only customization page; every formal Home page can contain custom widgets.
- Do not remove recovery paths for hidden app entries.

