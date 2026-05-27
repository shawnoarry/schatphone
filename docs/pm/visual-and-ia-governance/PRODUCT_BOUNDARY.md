# Visual And IA Product Boundary / 视觉与信息架构治理边界

Updated: 2026-05-27

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

## 3. What It Should Not Replace

- module-owned business truth
- roadmap execution status
- feature requirement ownership
