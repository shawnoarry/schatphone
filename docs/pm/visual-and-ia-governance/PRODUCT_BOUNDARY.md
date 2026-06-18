# Visual And IA Product Boundary / 视觉与信息架构治理边界

Updated: 2026-06-18

## 1. Core Rule

Visual quality work is not only repainting screens.

It also owns:

- entry hierarchy
- parent-child page logic
- visual ownership by entry context
- user-readable interaction structure

## 2. What This Package Decides

- when a page needs full rebuild instead of small polish
- which module visual language should dominate
- how shell vs app entry ownership is interpreted
- whether a page is suffering from IA confusion rather than styling only
- which Home customization surface owns a user action:
  - `主屏 / 桌面 / Home` is the system desktop layer, not a user-facing app entry;
  - the desktop edit state owns per-page layout template selection and slot content editing;
  - `组件 / Widgets` owns widget creation, import, widget library, custom widget click-action configuration, and fast entry into desktop edit mode;
  - `外观 / Appearance` owns broader theme, wallpaper, icon style, and possible template-management settings;
  - `应用商城 / App Store` owns app-entry visibility and Home-entry placement recovery;
  - App Library / App Store-like presentation owns app-entry visibility only, not widget packs, themes, wallpapers, or layout templates.
- which installed-app entry owns a visible Chat action:
  - Chat `Me` owns user identity, anonymity, recent interaction data, and lightweight derived social feed;
  - Chat Settings owns Chat appearance, default-behavior entry points, and diagnostics;
  - global `Appearance` still owns system-wide theme, wallpaper, font, icon, and global custom CSS.
- how user customization should layer with world-driven presentation:
  - user-controlled Appearance CSS is an explicit override layer above system defaults and World Pack defaults;
  - Chat-scoped CSS remains Chat-owned and should not be moved into global Appearance CSS;
  - app-scoped and world-app-scoped CSS should target the shell-level `data-app`, `data-route-scope`, `data-world-pack`, and `data-world-app` attributes rather than utility classes, test ids, or generated DOM structure;
  - when app-scoped and world-app-scoped CSS both target the same view, the world-app scope is the narrower per-world override layer;
  - World Pack should provide immersive defaults, not block user-authored appearance packs.
- how active World Pack presentation should behave:
  - `WorldBook` remains the Settings-owned activation/review surface;
  - active World Pack effects must be visible outside Settings when they change an app's UI/UX;
  - world-specific app bindings now have a first global app-entry seam available to Home/App Store/App Library rules;
  - Current World Pack may summarize enabled world entries and service-account availability, but App Store owns browse/place/open for world app entries and Chat will own service-account add flows;
  - nonstandard-app proposals must be reviewed inside Current World Pack before they become appBindings, with loading, empty, error, and rejected states staying readable and rejected suggestions staying invisible outside the review surface;
  - source apps still keep their own visual owner after launch, with the World Pack providing labels, terminology, accents, default context, and safe UX variants through target-app UX context seams.
- how Network setup should be interpreted:
  - `Network & API` is a native-system configuration surface;
  - the primary user action is entering or loading an API endpoint configuration, not choosing a provider brand;
  - Gemini vs OpenAI-compatible behavior is inferred from the URL and confirmed through diagnostics/smoke tests;
  - saved API configurations are the appropriate dropdown content, while provider-brand templates should stay secondary helpers rather than visible first-level choices.

## 3. What It Should Not Replace

- module-owned business truth
- roadmap execution status
- feature requirement ownership
- source-module business records or event truth

World Pack global UX effects must not become a decorative overlay that hides the owning app's workflow. If Shopping is opened as a survival-world supply board, Shopping still owns browsing, cart, checkout, and order UI. If Food Delivery is opened as survival-world rescue dispatch, Food Delivery still owns restaurants, menus, carts, food orders, and delivery events. If Calendar is opened as a world schedule board, Calendar still owns confirmed events, time edits, reminder promotion, and push scheduling. The world package only changes the appropriate entry label, copy, accent, banner context, and safe contextual defaults.

User custom CSS must not be treated as an error when it changes a World Pack screen. The product expectation is that World Pack gives the default immersive treatment, while the user can deliberately override it. The risky case is unscoped global CSS accidentally breaking many apps; shell-level app/world-app selectors and the Appearance scoped CSS editor with active World Pack entry selection, target preview, and pause/clear recovery reduce that risk, while future work should add import/export.
