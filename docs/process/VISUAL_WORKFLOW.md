# SchatPhone Visual Workflow

Updated: 2026-05-14

This document defines the "Visual专项" workflow. It is separate from the feature-progress track and should be used when the team is discussing or implementing UI polish, visual design, interaction feel, layout refinement, motion, typography, color, or product-grade surface quality.

## 1. Trigger Phrase

Use this phrase to enter the visual workflow:

```text
视觉专项
```

Recommended variants:

```text
视觉专项：先审查，不改代码
视觉专项：直接改 Home/Lock/Appearance
视觉专项：只做设计规范，不推进功能
视觉专项：参考 awesome-design-md，提炼 SchatPhone 自己的 DESIGN.md
```

When this phrase appears, the assistant should treat the task as a design-focused workflow, not a feature-roadmap task.

## 2. Scope Boundary

Visual专项 may change files that directly affect visual quality and interaction feel:

- Global styles and tokens: `src/style.css`
- Shell surfaces: `src/App.vue`, `src/views/LockScreen.vue`, `src/views/HomeView.vue`
- Appearance and customization: `src/views/AppearanceView.vue`, `src/views/WidgetsView.vue`
- Settings presentation: `src/views/SettingsView.vue`, `src/components/settings/*`
- Shared visual components: `src/components/*`
- Module surfaces only when the requested polish requires it
- Project visual docs, such as `DESIGN.md` or `docs/design/*`

Visual专项 should avoid:

- Starting new product feature tracks
- Expanding Chat, Map, Calendar, Push, backup, or storage behavior unless the change is a small design-supporting adjustment
- Large business-logic refactors
- Roadmap status changes unless the user explicitly asks for project-management sync

If a visual change requires touching functional code, keep the change minimal and state why it is needed.

## 3. Default Working Rules

1. Preserve current product behavior unless the user explicitly asks for interaction changes.
2. Prefer design-system consistency over one-off styling.
3. Work in small slices: audit, define target, implement, verify.
4. Do not copy another brand directly. Use references to extract principles, then create SchatPhone-specific rules.
5. Keep the virtual-phone identity central: lock screen, home, notifications, app icons, and settings should feel like one coherent device.
6. Favor stable, tactile, system-like UI over marketing-page composition.
7. Avoid turning operational screens into decorative landing pages.
8. When adding motion, keep it short, useful, and respectful of reduced-motion preferences.
9. Determine visual ownership from the user's entry and parent context before looking at code ownership or data ownership.
10. Do not restyle an in-app surface as a system page merely because it reads system/shared data.
11. Audit all visible frontend copy during visual work. Developer comments, implementation notes, TODO text, debug labels, route names, store names, and temporary explanations must not appear in the rendered UI.
12. For Home widget customization, prefer the visible Widgets entry over hidden gestures: tap opens the Widget Center, long-press enters widget edit mode, then same-size replacement happens from the Home context.

## 4. Entry-Context Audit

Before changing visual design, run this audit mentally or write it in the task notes.

For current SchatPhone routes, app entries, and cross-module surfaces, check:

```text
docs/design/VISUAL_ENTRY_OWNERSHIP_MAP.md
```

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

1. **System entry wins system style.** If the user entered through Lock, Home, Settings, Appearance, status chrome, notification center, or an OS dialog, the native system layer owns the container.
2. **App entry wins app style.** If the user is inside Chat, Map, Gallery, Calendar, Contacts, Files, or another installed app, app-local panels and subviews should follow that app's visual logic.
3. **Data source does not own the look.** WorldBook, Gallery, Contacts, Calendar, Map, and Chat data may appear across modules, but the host surface decides the outer style.
4. **Shell renders shell.** Lock-screen notifications, foreground banners, status bar surfaces, and global dialogs use system materials, with app icon/accent metadata as a secondary cue.
5. **Full route is not always full ownership.** A full-screen route opened from Home can use its app identity; a compact embedded preview inside another app must stay host-local.

Examples:

- Chat thread WorldBook summary: Chat visual owner, WorldBook data source.
- Chat attachment gallery picker: Chat visual owner, Gallery data source.
- Map area card with related knowledge points: Map visual owner, WorldBook data source.
- Calendar event created from Map: Calendar visual owner after opening Calendar; Map visual owner while still inside Map.
- Contacts role profile asset binding: Contacts visual owner, Gallery/WorldBook data sources.
- Lock-screen Chat notification: Native System container, Chat accent/icon.

## 5. Visible Copy Audit

Visual专项 reviews the words users can actually see, not only layout, color, and motion.

Before finishing a visual change, check:

- Buttons, tabs, menus, settings rows, empty states, toasts, banners, dialogs, tooltips, and form helper text.
- `aria-label`, `title`, and icon-only control labels when they affect what assistive tools or browser tooltips expose.
- New placeholder copy and temporary labels introduced while building a visual state.
- i18n keys and translated strings when the touched surface supports multiple languages.

Do not render:

- Code comments or implementation explanations.
- `TODO`, `FIXME`, `debug`, `mock`, `placeholder`, `dev`, or similar development markers.
- Internal route names, component names, store names, token names, file names, or class names unless the page is explicitly a developer tool.
- Text that explains the design implementation itself, such as "glass effect", "new visual style", or "slot prototype", unless the user-facing feature genuinely needs that term.

If temporary copy is needed, write it as product copy, not developer copy. For example, use a calm empty state like "暂无可用组件" instead of "TODO: widget selector not implemented".

## 6. Installed Skills

The current visual workflow expects these Codex skills to be installed locally.

### `ui-aesthetics`

Purpose:

- Visual judgment
- Product-grade composition
- Color, depth, lighting, motion, component polish
- Diagnosing UI that feels generic, flat, cluttered, or AI-generated

Installed on the current machine:

```text
C:\Users\Administrator\.codex\skills\ui-aesthetics
```

Source:

```text
https://github.com/kasonye/ui-aesthetics-skill.git
```

### `ui-ux-pro-max`

Purpose:

- UI/UX design intelligence
- Accessibility, touch targets, interaction states
- Layout, responsive rules, typography, color systems
- Product-type and style recommendations

Installed on the current machine:

```text
C:\Users\Administrator\.codex\skills\ui-ux-pro-max
```

Source:

```text
https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git
```

Note:

- This repository is not a root-level Codex `SKILL.md` repository.
- The installed skill is based on `.claude/skills/ui-ux-pro-max/SKILL.md`.
- The real `data/` and `scripts/` folders should be copied from `src/ui-ux-pro-max/` into the installed skill directory.

After installing or updating skills, restart Codex so the new skills are loaded.

### `frontend-design`

Purpose:

- Distinctive, production-grade frontend creation
- Stronger aesthetic direction for pages, components, and app surfaces
- Avoiding generic AI-looking UI patterns
- Useful when a new visual slice needs a clear point of view, not only small polish

Installed in the current project:

```text
.\.agents\skills\frontend-design
```

Source:

```text
https://github.com/anthropics/claude-code.git
```

Installed subpath:

```text
plugins/frontend-design/skills/frontend-design/SKILL.md
```

Install command used on Windows:

```powershell
npx.cmd skills add https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design/skills/frontend-design
```

Note:

- Use this skill when building or reshaping a frontend surface that needs a stronger creative direction.
- For SchatPhone, its boldness must still be moderated by the default system style, entry-context ownership, and visible-copy rules.

### `frontend-logic-design`

Purpose:

- Frontend information-architecture and interaction-logic review
- MECE checks, progressive disclosure, navigation depth, and consistent drill-down behavior
- Useful when a page feels confusing, inconsistent, poorly grouped, or hard to navigate
- Especially useful before visual polish on complex settings, management, or multi-module pages

Installed in the current project:

```text
.\.agents\skills\frontend-logic-design
```

Source:

```text
http://gitlab.clouddreamai.com/clouddreamai-tools-public/frontend-logic-design.git
```

Install command used on Windows:

```powershell
npx.cmd skills add http://gitlab.clouddreamai.com/clouddreamai-tools-public/frontend-logic-design.git
```

Note:

- Use this skill before aesthetic polish when the problem may be information hierarchy, entry placement, or inconsistent interaction behavior.
- It should support the visual workflow, not reopen unrelated feature scope.

### `impeccable`

Purpose:

- Product-grade frontend shaping, auditing, polishing, and hardening
- Visual hierarchy, layout, motion, typography, accessibility, and responsive behavior
- UX copy, cognitive load, edge states, design tokens, and reusable design systems
- A stricter second pass when a UI still feels generic, noisy, or implementation-shaped

Installed in the current project:

```text
.\.agents\skills\impeccable
```

Source:

```text
https://github.com/pbakaus/impeccable.git
```

Install command used on Windows:

```powershell
npx.cmd skills add pbakaus/impeccable
```

Note:

- This skill is project-local under `.agents/skills`, not under the global Codex skills directory.
- Review the skill before use because installed skills run with full agent permissions.
- Restart Codex or the agent host if the skill does not appear in the active skill list.
- When using it for SchatPhone, still obey this workflow's entry-context ownership and visible-copy audit rules.

## 7. Reference Library

The current machine keeps the `awesome-design-md` reference library here:

```text
D:\github\_references\awesome-design-md
```

Source:

```text
https://github.com/VoltAgent/awesome-design-md.git
```

Primary reference folder:

```text
D:\github\_references\awesome-design-md\design-md
```

Usage:

- Treat it as a design reference library, not a package dependency.
- Do not copy a brand style directly into SchatPhone.
- Use it to compare visual directions and extract reusable design principles.
- For lasting project consistency, convert selected references into a SchatPhone-specific `DESIGN.md`.

## 8. Recommended Project Artifacts

Visual专项 should eventually create or maintain:

```text
DESIGN.md
```

or:

```text
docs/design/DESIGN.md
```

Suggested content:

- Visual positioning for SchatPhone
- Entry-context ownership rules for system, installed app, and embedded hybrid surfaces
- Color tokens and theme rules
- Typography scale
- Spacing, radius, border, blur, and shadow system
- Home icon and fixed widget-slot rules
- Lock-screen visual rules
- Settings and utility-screen density rules
- Chat, Map, Calendar, Gallery visual surface rules
- Motion and interaction-state rules
- Accessibility and responsive constraints
- Visible UI copy rules and no developer-comment leakage

Home visual rule:

- Treat Home as a native-system surface with a fixed layout skeleton.
- Improve widget appearance, slot picker states, icon style, wallpaper fit, and Dock polish without making free drag the default experience.
- When changing Home customization, prefer same-size slot replacement over arbitrary drag placement.

Visible copy rule:

- Every visible string must be written for the user, not for the developer.
- Do not expose code comments, TODOs, implementation notes, debug markers, or internal names in rendered UI.
- If a visual state is unfinished, use a real product empty/loading/unavailable state rather than a development note.

## 9. Reuse On Another PC

To reuse this workflow on another machine:

1. Clone the SchatPhone repo.
2. Ask the machine owner to confirm all local installation paths before installing anything.
3. Install or copy the five visual skills: `ui-aesthetics`, `ui-ux-pro-max`, `frontend-design`, `frontend-logic-design`, and `impeccable`.
4. Clone the design reference library to the confirmed path.
5. Restart Codex.
6. Use the trigger phrase `视觉专项`.

### Confirm Local Paths First

Do not assume every PC has the same user profile, drive letters, repo path, npm setup, or Codex home.

Ask the machine owner to confirm:

```text
1. SchatPhone project root:
2. Global Codex skills directory:
3. Project-local skills directory:
4. Design reference library parent directory:
5. Whether PowerShell should use npx or npx.cmd:
```

Recommended defaults on Windows:

```text
SchatPhone project root: D:\github\schatphone
Global Codex skills directory: %USERPROFILE%\.codex\skills
Project-local skills directory: <SchatPhone project root>\.agents\skills
Design reference library parent directory: ask owner; do not assume D:
PowerShell command runner: npx.cmd
```

Rules:

- `ui-aesthetics` and `ui-ux-pro-max` are global Codex skills in the confirmed global Codex skills directory.
- `frontend-design`, `frontend-logic-design`, and `impeccable` are project-local skills in the confirmed SchatPhone project root under `.agents\skills`.
- Run every `npx.cmd skills add ...` command from the confirmed SchatPhone project root so the skill is installed into the correct `.agents\skills`.
- If the owner chooses a different project path, replace every project-root-relative path in this section accordingly.
- If the owner chooses a different reference-library path, tell Codex that path before starting `视觉专项`.

### Install `ui-aesthetics`

Use the confirmed global Codex skills directory. If the owner accepts the Windows default, use:

```powershell
git clone https://github.com/kasonye/ui-aesthetics-skill.git "$env:USERPROFILE\.codex\skills\ui-aesthetics"
```

The destination must contain:

```text
SKILL.md
```

### Install `ui-ux-pro-max`

Clone the source repo first:

```powershell
git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git "$env:TEMP\ui-ux-pro-max-skill"
```

Create the Codex skill directory:

```powershell
New-Item -ItemType Directory -Path "$env:USERPROFILE\.codex\skills\ui-ux-pro-max" -Force
```

Copy the skill entry:

```powershell
Copy-Item "$env:TEMP\ui-ux-pro-max-skill\.claude\skills\ui-ux-pro-max\SKILL.md" "$env:USERPROFILE\.codex\skills\ui-ux-pro-max\SKILL.md"
```

Copy the real data and scripts:

```powershell
Copy-Item "$env:TEMP\ui-ux-pro-max-skill\src\ui-ux-pro-max\data" "$env:USERPROFILE\.codex\skills\ui-ux-pro-max\data" -Recurse
Copy-Item "$env:TEMP\ui-ux-pro-max-skill\src\ui-ux-pro-max\scripts" "$env:USERPROFILE\.codex\skills\ui-ux-pro-max\scripts" -Recurse
```

The destination should contain:

```text
SKILL.md
data/
scripts/
```

### Install `frontend-design`

From the confirmed SchatPhone project root:

```powershell
npx.cmd skills add https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design/skills/frontend-design
```

The destination should contain:

```text
.agents\skills\frontend-design\SKILL.md
```

### Install `frontend-logic-design`

From the confirmed SchatPhone project root:

```powershell
npx.cmd skills add http://gitlab.clouddreamai.com/clouddreamai-tools-public/frontend-logic-design.git
```

The destination should contain:

```text
.agents\skills\frontend-logic-design\SKILL.md
```

### Install `impeccable`

From the confirmed SchatPhone project root:

```powershell
npx.cmd skills add pbakaus/impeccable
```

The destination should contain:

```text
.agents\skills\impeccable\SKILL.md
```

### Clone `awesome-design-md`

Do not assume every PC has a `D:` drive. Before cloning, ask the machine owner to confirm the local reference-library path.

Current machine path:

```text
D:\github\_references\awesome-design-md
```

Example path if the owner confirms `D:\github\_references`:

```powershell
New-Item -ItemType Directory -Path "D:\github\_references" -Force
git clone https://github.com/VoltAgent/awesome-design-md.git "D:\github\_references\awesome-design-md"
```

If another PC uses a different path, tell Codex the path before starting a visual workflow and record it in the local handoff notes if needed.

## 10. Standard Work Sequence

Use this sequence for visual work unless the user asks for a narrower path.

1. Read `docs/process/VISUAL_WORKFLOW.md` and the relevant design docs.
2. Decide the target surface and scope: system shell, installed app, hybrid surface, or project documentation only.
3. Run the entry-context audit: actual user path, parent context, visual owner, borrowed accents, and forbidden visual jumps.
4. If the issue is confusing navigation or page structure, apply `frontend-logic-design` before visual styling.
5. Choose the design-supporting skills:
   - `ui-aesthetics` for restrained product-grade polish, spacing, depth, component craft, and visual diagnosis.
   - `ui-ux-pro-max` for accessibility, touch targets, responsive behavior, interaction states, and UX rules.
   - `frontend-design` for stronger creative direction on a page, component, or app surface.
   - `frontend-logic-design` for information architecture, MECE grouping, navigation depth, and interaction consistency.
   - `impeccable` for a strict second pass across visual hierarchy, UX copy, edge states, and implementation-shaped UI.
6. Define the smallest useful change slice before editing.
7. Implement only visual, layout, motion, copy, or light interaction-support changes needed for that slice.
8. Audit visible copy so developer notes, TODOs, debug text, route/store/component names, and implementation explanations are not rendered to users.
9. Verify with `git diff --check`, then lint/build/test when code changed.
10. Summarize the changed surfaces, the visual owner decisions, remaining risks, and any follow-up visual slices.

## 11. First Prompt Template

Use this prompt to start a visual session:

```text
视觉专项：先读取 docs/process/VISUAL_WORKFLOW.md，然后只围绕视觉设计工作。
先确认本机 awesome-design-md 参考库路径；如果不存在或路径未知，先询问我。
本轮不推进功能路线。先审查 [页面/模块] 的上级入口属于【本机系统】还是【装载APP】，再输出问题清单、设计方向和最小改造切片。
同时审核前端显示文案，禁止把开发注释、TODO、调试提示、实现说明显示给用户。
```

For direct implementation:

```text
视觉专项：参考 docs/process/VISUAL_WORKFLOW.md，直接改 [页面/模块] 的视觉表现。
先确认用户实际入口和父级上下文；保持现有功能行为，只做必要的样式、布局、动效和轻量交互支撑。
改完后检查页面真实显示文字，不能出现开发注释、临时说明或内部命名。
```

For hybrid / cross-module surfaces:

```text
视觉专项：先做入口归属排查。
目标：[页面/弹层/卡片]
我希望你不要只看代码或数据来源，而是判断用户看到它时仍处于哪个上级入口。
如果它在装载 APP 内，就保持该 APP 的沉浸式视觉逻辑。
同时检查该表面的可见文字是否是用户文案，而不是开发说明。
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

For visible-copy checks, inspect the rendered page and review changed templates for development markers such as `TODO`, `FIXME`, `debug`, `mock`, `placeholder`, `dev`, `注释`, `开发`, or `临时`. The goal is not to remove legitimate code comments; it is to ensure those markers are not shown to the user.
