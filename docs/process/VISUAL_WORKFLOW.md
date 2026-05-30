# SchatPhone Visual Workflow

Updated: 2026-05-28

This document defines the `视觉专项` workflow.

Use it when the team is discussing or implementing:

- UI polish;
- visual design;
- interaction feel;
- layout refinement;
- motion;
- typography;
- color;
- product-grade surface quality;
- information architecture cleanup for visible frontend surfaces.

This workflow is separate from the main feature-progress track.

## 1. Trigger Phrase

Use this phrase to enter the visual workflow:

```text
视觉专项
```

Recommended variants:

```text
视觉专项：先审查，不改代码
视觉专项：直接改 Home / Lock / Appearance
视觉专项：只做设计规范，不推进功能
视觉专项：参考 awesome-design-md，整理 SchatPhone 自己的 DESIGN.md
```

When this phrase appears, the assistant should treat the task as design-focused workflow work, not as a feature-roadmap task.

## 2. Scope Boundary

`视觉专项` may change files that directly affect visual quality and interaction feel:

- global styles and tokens:
  - `src/style.css`
- shell surfaces:
  - `src/App.vue`
  - `src/views/LockScreen.vue`
  - `src/views/HomeView.vue`
- appearance and customization:
  - `src/views/AppearanceView.vue`
  - `src/views/WidgetsView.vue`
- settings presentation:
  - `src/views/SettingsView.vue`
  - `src/components/settings/*`
- shared visual components:
  - `src/components/*`
- module surfaces only when the requested polish requires it;
- project visual docs such as `docs/design/DESIGN.md` or `docs/design/*`.

`视觉专项` should avoid:

- starting new product feature tracks;
- expanding Chat, Map, Calendar, Push, backup, or storage behavior unless the change is a small design-supporting adjustment;
- large business-logic refactors;
- roadmap status changes unless the user explicitly asks for PM sync.

If a visual change needs functional code, keep the change minimal and explain why it is needed.

## 3. Default Working Rules

1. Preserve current product behavior unless the user explicitly asks for interaction changes.
2. Prefer design-system consistency over one-off styling.
3. Work in small slices: audit, define target, implement, verify.
4. Do not copy another brand directly. Use references to extract principles, then create SchatPhone-specific rules.
5. Keep the virtual-phone identity central: lock screen, Home, notifications, app icons, and Settings should feel like one coherent device.
6. Favor stable, tactile, system-like UI over marketing-page composition.
7. Avoid turning operational screens into decorative landing pages.
8. When adding motion, keep it short, useful, and respectful of reduced-motion preferences.
9. Determine visual ownership from the user's entry path and parent context before looking at code ownership or data ownership.
10. Do not restyle an in-app surface as a system page merely because it reads system/shared data.
11. Audit all visible frontend copy during visual work. Developer comments, implementation notes, TODO text, debug labels, route names, store names, and temporary explanations must not appear in rendered UI.
12. For Home widget customization, prefer the visible Widgets entry over hidden gestures.
13. When working on themes, review `default` and `zen` together as a native-system day/night pair.
14. On native-system surfaces, replace raw utility backgrounds and hardcoded semantic colors with system tokens unless the element is app-owned, media/content preview, or user-authored widget/template content.
15. Dark-theme approval requires checking panels, forms, list rows, dialogs, hover/active states, disabled states, and teleported overlays for contrast and background completeness.
16. Return controls must name their actual target layer (`Home`, `Settings`, `Chat`, `Map`, etc.). Avoid ambiguous `Back` labels when a route can be reached from multiple parents.
17. Widget Center must stay a library/import/create surface. Placement belongs to Home widget edit mode and should use same-size slot replacement, not screen-number selectors.
18. New or changed navigation must preserve Home-page return context. Follow `docs/process/NAVIGATION_RETURN_CONTRACT.md`.
19. Home edit mode should default to visible slots, not persistent picker panels. Template selection and the unplaced-content library should open only on explicit user request so the target slots remain visible.
20. Opening the Home content library is not the same as selecting a content item. Keep the unselected state explicit, and light compatible slots only after the user chooses a specific app, folder, built-in widget, or custom widget.
21. Use product-facing names in both discussion and rendered UI. Do not describe implementation-only layers as user-visible apps. For Home work, use terms such as Home desktop, app entries, entry groups, widgets, and screen slots; reserve "folder" for a real user-editable folder system.
22. Settings-owned WorldBook management should use state-first progressive disclosure: overview first, then focused panels for sources, pack, kernel, templates, and knowledge. Source picking, version review, knowledge creation/editing, import/export confirmation, and other execution steps should use dialogs, sheets, drawers, or dedicated subpages instead of indefinitely extending the same Settings screen.
23. Widget Center should stay scan-first on phone-sized screens. Keep library, starter templates, and saved widgets visible as the main page; open custom code editing and import JSON entry as focused sheets or equivalent execution panels.
24. Appearance-owned controls should keep state and preview visible first. Inputs that feel like execution work, such as wallpaper-source picking, advanced CSS editing, custom font-stack editing, or per-app icon/accent edits, should use sheets/drawers/subpages on phone-sized screens instead of extending the main settings scroll.

## 4. Entry-Context Audit

Before changing visual design, run this audit mentally or write it in task notes.

Reference:

```text
docs/design/VISUAL_ENTRY_OWNERSHIP_MAP.md
```

Audit shape:

```text
Target surface:
Actual user path:
Parent context at the moment the user sees it:
Is the parent context Native System or Installed App?
Data sources used by this surface:
Visual owner:
Allowed borrowed accents:
Must not visually jump to:
```

Decision rules:

1. System entry wins system style.
2. App entry wins app style.
3. Data source does not own the outer look.
4. Shell renders shell.
5. Full route is not always full ownership.
6. System-controlled folders keep system material until the child route opens.

Examples:

- Chat thread WorldBook summary: Chat visual owner, WorldBook data source.
- Chat attachment gallery picker: Chat visual owner, Gallery data source.
- Map area card with knowledge points: Map visual owner, WorldBook data source.
- Calendar event created from Map: Calendar visual owner after opening Calendar; Map visual owner while still inside Map.
- Contacts role-profile asset binding: Contacts visual owner, Gallery/WorldBook data sources.
- Lock-screen Chat notification: Native System container, Chat accent/icon.
- Shopping Home-folder overlay: Native System container, Shopping child entries.
- Shopping child route: Installed App identity for the selected Shopping platform.

## 5. Visible Copy Audit

Visual work reviews the words users can actually see, not only layout, color, and motion.

Before finishing a visual change, check:

- buttons, tabs, menus, settings rows, empty states, toasts, banners, dialogs, tooltips, and form helper text;
- `aria-label`, `title`, and icon-only control labels when they affect exposed UI text;
- new placeholder copy and temporary labels introduced while building a visual state;
- i18n keys and translated strings when the touched surface supports multiple languages.

Do not render:

- code comments or implementation explanations;
- `TODO`, `FIXME`, `debug`, `mock`, `placeholder`, `dev`, or similar development markers;
- internal route names, component names, store names, token names, file names, or class names unless the page is explicitly a developer tool;
- text that explains the design implementation itself, such as "glass effect" or "new visual style", unless the user-facing feature genuinely needs that term.

If temporary copy is needed, write product copy, not developer copy.

## 6. Installed Skills

The current visual workflow expects these skills.

### Global machine-local support skills

These may exist outside the repo on the current machine:

- `ui-aesthetics`
  - visual judgment, product-grade composition, color/depth/motion, diagnosis of generic or cluttered UI.
- `ui-ux-pro-max`
  - accessibility, touch targets, interaction states, layout, typography, color systems, and product-type recommendations.

These are helpful, but repo portability should not depend on them unless explicitly documented for a given workflow.

### Project-local skills

These are expected in `.agents/skills` for repo-local visual work:

- `frontend-design`
  - stronger creative direction for pages, components, and app surfaces.
- `frontend-logic-design`
  - information architecture, navigation depth, MECE grouping, and interaction consistency.
- `impeccable`
  - strict second pass across hierarchy, edge states, responsive behavior, UX copy, and implementation-shaped UI.
- `web-design-guidelines`
  - framework-neutral UI/UX/accessibility review pass.

### Skill routing guidance

- use `frontend-logic-design` first when the problem may be page structure, grouping, entry placement, or inconsistent interaction logic;
- use `frontend-design` when a surface needs stronger creative direction rather than only cleanup;
- use `impeccable` when the UI is already close but still feels noisy, generic, or under-finished;
- use `web-design-guidelines` for an external best-practice review before or after visual polish.

### Adding or discovering visual skills

Do not add a new visual skill only because one screen needs more polish. First use the current project-local visual stack:

- `frontend-logic-design` for information structure;
- `frontend-design` for stronger screen composition;
- `impeccable` for the strict polish pass;
- `web-design-guidelines` for accessibility and external UI review;
- `playwright-testing` when browser screenshots or journeys are needed.

Add a new project-local skill only when there is a repeated workflow gap that the current stack does not cover. Use `find-skills` and the Skills CLI from the confirmed SchatPhone project root:

```powershell
npx.cmd skills find "<query>"
npx.cmd skills add <owner/repo@skill>
```

Before recommending or installing a skill, verify source reputation and install count. After installing, confirm `.agents\skills` and `skills-lock.json`, then document the new dependency in this file and in `docs/process/DEVELOPMENT_TOOLING.md`.

## 7. Reference Library

The current machine keeps the `awesome-design-md` reference library here:

```text
D:\github\_references\awesome-design-md
```

Usage:

- treat it as a design reference library, not a package dependency;
- do not copy another brand directly into SchatPhone;
- extract principles and convert them into SchatPhone-specific rules.

The current machine also keeps an external visual asset reference library here:

```text
H:\SchatPhone\美化包
```

Reference:

```text
docs/references/VISUAL_ASSET_LIBRARY.md
```

Usage:

- treat it as an external, read-only reference library by default;
- do not bulk-import it into the repo;
- before copying any image or code reference into SchatPhone, confirm the concrete product use, rename/compress it, and place it under a purpose-specific project asset folder;
- on another PC, ask the machine owner to confirm the local asset-library path before relying on it.

## 8. Recommended Project Artifacts

Visual work should eventually create or maintain:

```text
docs/design/DESIGN.md
```

Suggested content:

- visual positioning for SchatPhone;
- entry-context ownership rules for system, installed app, and hybrid surfaces;
- color tokens and theme rules;
- typography scale;
- spacing, radius, border, blur, and shadow system;
- Home icon and fixed widget-slot rules;
- lock-screen visual rules;
- settings and utility-screen density rules;
- Chat, Map, Calendar, Gallery visual surface rules;
- motion and interaction-state rules;
- accessibility and responsive constraints;
- visible UI copy rules.

## 9. Reuse On Another PC

To reuse this workflow on another machine:

1. clone the SchatPhone repo;
2. ask the machine owner to confirm local installation paths before installing anything;
3. install or confirm the current visual skills;
4. clone the design reference library to a confirmed path if needed;
5. restart Codex;
6. use the trigger phrase `视觉专项`.

Confirm local paths first:

```text
1. SchatPhone project root:
2. Global Codex skills directory:
3. Project-local skills directory:
4. Design reference library parent directory:
5. External visual asset library path:
6. Whether PowerShell should use npx or npx.cmd:
```

Rules:

- project-local visual skills belong under `<repo>\.agents\skills`;
- run `npx.cmd skills add ...` from the confirmed SchatPhone project root;
- do not assume every PC has a `D:` drive or the same global Codex skill location.

## 10. Standard Work Sequence

Use this sequence for visual work unless the user asks for a narrower path:

1. Read `docs/process/VISUAL_WORKFLOW.md` and the relevant design docs.
2. Decide the target surface and scope: system shell, installed app, hybrid surface, or project documentation only.
3. If external visual references are useful, confirm the local visual asset library path using `docs/references/VISUAL_ASSET_LIBRARY.md`.
4. Run the entry-context audit.
5. Translate implementation terms into product-facing terms before discussing the work with the user or writing UI copy. For Home desktop work, avoid exposing route names, component names, tile kinds, or fake folder categories.
6. If the issue is confusing navigation or page structure, apply `frontend-logic-design` before visual styling.
7. Choose the design-supporting skills:
   - `frontend-design` for stronger creative direction;
   - `frontend-logic-design` for IA and interaction consistency;
   - `impeccable` for strict second-pass shaping;
   - `web-design-guidelines` for external review;
   - machine-local support skills when they are available and useful.
8. For interactive or editor surfaces, define the key state matrix before styling: normal, edit idle, panel open with no selection, item selected, compatible targets, incompatible targets, picker/replace state, success, empty, and error states.
9. Define the smallest useful change slice before editing.
10. Implement only visual, layout, motion, copy, or light interaction-support changes needed for that slice.
11. Audit visible copy so developer notes, TODOs, debug text, route/store/component names, and implementation explanations are not rendered to users.
12. If themes are touched, verify both `default` and `zen`.
13. If navigation or return controls are touched, check `docs/process/NAVIGATION_RETURN_CONTRACT.md`.
14. Verify with `git diff --check`, then lint/build/test when code changed.
15. Summarize:
   - changed surfaces;
   - visual-owner decisions;
   - remaining risks;
   - next visual slice.

## 11. First Prompt Templates

Audit-first visual session:

```text
视觉专项：先读取 docs/process/VISUAL_WORKFLOW.md，然后只围绕视觉设计工作。先确认本机 awesome-design-md 参考库路径；如果不存在或路径未知，先询问我。本轮不推进功能路线。先审查 [页面/模块] 的上级入口属于【本机系统】还是【装载 App】，再输出问题清单、设计方向和最小改造切片。同时审查前端显示文案，禁止把开发注释、TODO、调试提示、实现说明显示给用户。
```

Direct implementation:

```text
视觉专项：参考 docs/process/VISUAL_WORKFLOW.md，直接改 [页面/模块] 的视觉表现。先确认用户实际入口和父级上下文；保持现有功能行为，只做必要的样式、布局、动效和轻量交互支持。改完后检查页面真实显示文字，不能出现开发注释、临时说明或内部命名。
```

Hybrid or cross-module surface:

```text
视觉专项：先做入口归属排查。目标：[页面/弹层/卡片]。我希望你不要只看代码或数据来源，而是判断用户看到它时仍然处于哪个上级入口。如果它在装载 App 内，就保持该 App 的沉浸式视觉逻辑。同时检查该表面的可见文字是否是用户文案，而不是开发说明。
```

## 12. Verification

For documentation-only visual planning:

```text
git diff --check
```

For code changes:

```text
npm run lint
npm test
npm run build
```

For visual-heavy changes, also run the app and inspect the changed screens in desktop and mobile-sized viewports.

For Home desktop and template-edit work, inspect at least these states:

- normal Home screen with Dock visible;
- edit mode with template slots visible;
- content library open with no selected item;
- content selected with compatible and incompatible slots distinguishable;
- slot picker or replace state;
- normal Home screen after placement.

Confirm empty template slots are invisible in normal mode, the Dock remains outside the template grid, and system-controlled entry groups are not presented as user-editable folders.

For theme changes, inspect both built-in themes and ensure there are no leftover raw-light panels in dark mode except where app-owned or content-owned surfaces intentionally differ.

For visible-copy checks, inspect rendered pages and changed templates for development markers such as:

- `TODO`
- `FIXME`
- `debug`
- `mock`
- `placeholder`
- `dev`

The goal is not to remove legitimate code comments. The goal is to ensure those markers are not shown to users.
