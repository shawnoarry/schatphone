# Appearance, App Store, and Food Delivery Visual Ownership Design

Updated: 2026-06-01

## Goal

Reorganize SchatPhone customization so global appearance, per-app identity, per-app skins, Home editing, Widget management, and Food Delivery store immersion each have a clear user-facing owner.

## Product Principles

1. `外观 / Appearance` is the global phone customization center. It should explain "how the whole phone looks and feels."
2. `应用商城 / App Store` is the app identity management center. It should explain "what this app looks like on the phone."
3. Each installed app owns its deep in-app experience. App-specific skins, CSS, and layout modes should live in that app or be reachable from that app's App Store detail.
4. `组件 / Widgets` owns widget creation, import, collection, and editing. Home owns placing widgets on screens and slots.
5. `外卖 / Food Delivery` should feel like a real delivery platform with independent store experiences, while sharing one order, cart, wallet, map, chat, and event system.

## Scope

This design covers six implementation packages:

1. Home edit mode page switching.
2. Appearance global-only cleanup.
3. App Store app-icon and app-identity customization.
4. Per-app skin entry ownership.
5. Food Delivery platform-to-store structure.
6. Food Delivery UI and UX polish after the structure is stable.

## Current State Summary

### Appearance

Appearance currently includes theme, wallpaper, font stack, lock-clock style, status bar, haptic feedback, Home layout preview, Today smart panel toggle, Widget Center entry, app-icon customization, global CSS, app-scoped CSS, world-app-scoped CSS, and appearance-pack import/export.

This makes the page powerful but too broad. Users see global phone styling mixed with app-level styling, Widget creation, and developer-like CSS tools.

### App Store

App Store already has per-app list and detail surfaces. It can show each app's icon, status, visibility, placement, and app kind. This makes it the right place for app identity customization.

### Home And Widgets

Home owns actual placement: which app or widget appears on which screen and slot. Widget Center owns widget creation, import, and collection. Widget Center already sends users back to Home edit mode when they want to place a widget.

The current Home edit mode has a friction point: after entering edit mode, normal swipe page switching is blocked, and page dots are visually disabled by CSS. This traps users on the current screen.

### Food Delivery

Food Delivery currently behaves as one route with category filters. The Home Food entry is a pseudo-folder, and the folder children are shortcuts such as Restaurants, Nearby, Fast Food, Cafe & Drinks, Dessert, and Grocery Delivery.

The current Food Delivery page is functionally broad but presentation-heavy. It exposes restaurants, menus, custom restaurant/menu authoring, cart, map delivery context, wallet suggestions, recent orders, and service handoff notes in one long screen. It does not yet feel like separate stores inside a real delivery app.

## Target Ownership Model

### Appearance Owns Global Customization

Appearance should keep:

- Global theme.
- Wallpaper source and preview.
- Lock-screen clock style.
- Global font presets and advanced font stack.
- Status bar visibility.
- Haptic feedback.
- Today View smart panel.
- Home-level visual/display controls.
- Global CSS.
- Global appearance scheme import/export.

Appearance should remove or stop promoting:

- App icon customization.
- Widget Center as a main customization card.
- Chat appearance.
- App-scoped CSS.
- World-app-scoped CSS.
- App-level skin import/export.

Font wording must be corrected. The current feature does not import font files; it applies a CSS font-family stack. It should be described as "字体预设 / 高级字体栈", not as font import.

### App Store Owns App Identity

Every app detail surface in App Store should gain an app identity/customization entry.

The app identity entry should support:

- Built-in icon styles.
- Built-in accent/style presets.
- User-uploaded image icon.
- Gallery image icon.
- Preview before saving.
- Restore default.

Saving an app icon should update the same app icon everywhere users see it:

- Home.
- Dock.
- App Store list/detail.
- Relevant notifications when module identity is known.

The image icon flow must crop or frame images into a stable square icon shape. Raw wide or tall images should not appear unprocessed on the Home screen.

### Apps Own App-Specific Skins

App-specific skins must not live in global Appearance as a flat list of scoped CSS targets.

The same app skin editor can be opened from:

- The app's App Store detail.
- The app's own settings page when it has one.

Skin ownership rules:

- Global CSS belongs to Appearance.
- Chat layout and Chat CSS belong to Chat.
- Food Delivery skin belongs to Food Delivery.
- Map visual layers belong to Map.
- Gallery display density/cover style belongs to Gallery.
- World App skin belongs to the relevant World App or WorldBook/World Pack entry.

Single-app skin packs should only affect that app. They should not be exported as part of global appearance packs.

### Widgets Own Widget Assets, Home Owns Placement

Widget Center should own:

- Widget market/library.
- Built-in widget visibility intent.
- Custom widget creation.
- Widget import.
- Widget editing.
- Widget deletion.

Home edit mode should own:

- Choosing the target screen.
- Choosing a slot.
- Placing an app or widget into a compatible slot.
- Removing an item from Home.
- Changing a screen layout template.

Appearance may keep a Home display section, but it should not be a Widget management hub.

### Food Delivery Owns Platform And Store Experience

Food Delivery should become a platform surface plus store mini-app surfaces.

Platform surface:

- Search.
- Categories.
- Nearby/recommended stores.
- Store cards.
- Promotions.
- Order status entry.
- Cart entry.

Store surfaces:

- Store hero/header.
- Store-specific visual theme.
- Menu sections.
- Item cards.
- Cart summary.
- Delivery estimate.
- Reviews or trust cues if available.
- Service links to Chat, Map, Wallet, and orders where appropriate.

Store pages should share the same commerce logic. Independent store presentation must not create separate cart/order systems.

## Implementation Packages

### Package 1: Home Edit Mode Page Switching

User goal: while editing Home, the user can choose another screen before placing or changing content.

Required behavior:

- Page dots remain clickable in edit mode.
- Editing mode allows users to switch screens without exiting.
- A simple screen switcher can be added to the edit top bar if page dots are still hard to use.
- Widget Center return flow should preserve the requested Home page when available.
- Users can enter from Widget Center, choose a different page, and place a compatible widget.

Deferred behavior:

- Dragging an item to the screen edge to change pages is outside Package 1 and belongs to a separate polish package.

### Package 2: Appearance Global-Only Cleanup

User goal: Appearance feels like a whole-phone customization center rather than a mixed technical control panel.

Required behavior:

- Remove App Icons from Appearance.
- Remove Widget Center as a main Appearance card.
- Remove App/World App scoped CSS from the main Appearance flow.
- Keep global CSS but label it as advanced global styling.
- Keep global appearance import/export, excluding app icons, widgets, Chat appearance, app skins, and Home placement.
- Correct font wording so users understand it is a font stack, not file import.

### Package 3: App Store App Identity

User goal: each app's icon can be customized from that app's App Store detail.

Required behavior:

- Add a "图标与外观 / Icon & Appearance" action to app detail.
- Move existing built-in icon/accent editing into the app detail flow.
- Add image icon support from local upload.
- Add image icon support from Gallery.
- Normalize image icon data so Home, Dock, App Store, and notifications can render it safely.
- Provide restore default.

### Package 4: Per-App Skin Ownership

User goal: app-level appearance customization is found from that app, not global Appearance.

Required behavior:

- Define a shared app skin data shape for built-in app skins and custom CSS.
- Add app skin entry to App Store app detail where supported.
- Keep app-owned pages, such as Chat Appearance, as the deep settings owner.
- Do not include per-app skins in global appearance packs.

### Package 5: Food Delivery Store Mini-Apps

User goal: Food Delivery feels like real delivery software with independent store experiences.

Required behavior:

- Keep the Food Home pseudo-folder and category shortcuts.
- Build a Food platform landing surface for browsing and searching stores.
- Open a store detail page/surface when a restaurant is selected.
- Give different store types different visual treatments while preserving shared buying flow.
- Keep cart, order, Map, Wallet, Chat, and event behavior centralized.

### Package 6: Food Delivery UI/UX Polish

User goal: ordering food is fast, familiar, and immersive.

Required behavior:

- Reduce long administrative panels.
- Make store browsing, menu selection, cart review, and order status the primary path.
- Keep advanced/custom authoring secondary.
- Add mobile-friendly sticky cart/order affordances.
- Keep visual variety per store type without changing the core ordering rules.

## Data And Export Rules

Global appearance pack includes:

- Theme.
- Wallpaper mode and wallpaper reference.
- Status bar setting.
- Haptic setting.
- Global CSS.
- Global custom variables.
- Lock-clock style.

Global appearance pack excludes:

- App icons.
- Home placement/layout.
- Widgets.
- Chat appearance.
- App-scoped CSS.
- World-app-scoped CSS.
- Food store skins.
- Single-app skin packs.

App identity data belongs to app-specific customization settings. A separate app identity pack format is outside this design.

Widget data belongs to Widget Center import/export.

Food store presentation data belongs to Food Delivery or store definitions.

## Safety And Fallbacks

- If an uploaded icon image is missing or invalid, the app falls back to its built-in icon.
- If a Gallery icon asset is deleted, the app falls back to its built-in icon and shows a recoverable state in App Store.
- If a global appearance pack includes old app icon fields, import should ignore them safely.
- If a single-app skin fails or is disabled, only that app returns to its default skin.
- Home edit page switching must not open apps or folders by mistake.

## Testing Expectations

Package 1:

- Home edit mode can switch pages.
- Widget Center can enter Home edit mode and place content after switching pages.

Package 2:

- Appearance no longer displays App Icons or Widget Center as main cards.
- Appearance export excludes app icons, app skins, widgets, Home placement, and Chat appearance.
- Font copy describes font stack behavior.

Package 3:

- App Store can update a built-in icon preset.
- App Store can apply a Gallery or uploaded image icon.
- Home, Dock, App Store, and supported notifications resolve the same custom icon.
- Restore default returns to built-in metadata.

Package 4:

- App-specific CSS does not appear in global Appearance.
- An app skin can be changed from the owning app/App Store detail without affecting other apps.

Package 5:

- Food category shortcuts still open Food Delivery with expected context.
- Selecting a store opens a store-specific surface.
- Cart/order behavior remains shared.

Package 6:

- Food browsing, item selection, cart review, and order status are accessible without scrolling through advanced authoring panels first.

## Recommended Sequence

1. Fix Home edit mode page switching.
2. Clean up Appearance ownership.
3. Move app icon customization into App Store and add image icons.
4. Move app-level skin ownership into App Store/app settings.
5. Restructure Food Delivery into platform plus store pages.
6. Polish Food Delivery visual and interaction details.

This order keeps the customization foundation stable before Food Delivery starts depending on app identity and per-app skin behavior.
