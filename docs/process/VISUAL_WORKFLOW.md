# SchatPhone Visual Workflow

Updated: 2026-05-13

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
- Appearance and customization: `src/views/AppearanceView.vue`
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

## 5. Installed Skills

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

## 6. Reference Library

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

## 7. Recommended Project Artifacts

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
- Home icon and widget rules
- Lock-screen visual rules
- Settings and utility-screen density rules
- Chat, Map, Calendar, Gallery visual surface rules
- Motion and interaction-state rules
- Accessibility and responsive constraints

## 8. Reuse On Another PC

To reuse this workflow on another machine:

1. Clone the SchatPhone repo.
2. Install or copy the two Codex skills.
3. Ask the machine owner to confirm where the design reference library should live on that PC.
4. Clone the design reference library to the confirmed path.
5. Restart Codex.
6. Use the trigger phrase `视觉专项`.

### Install `ui-aesthetics`

Recommended command:

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

## 9. First Prompt Template

Use this prompt to start a visual session:

```text
视觉专项：先读取 docs/process/VISUAL_WORKFLOW.md，然后只围绕视觉设计工作。
先确认本机 awesome-design-md 参考库路径；如果不存在或路径未知，先询问我。
本轮不推进功能路线。先审查 [页面/模块] 的上级入口属于【本机系统】还是【装载APP】，再输出问题清单、设计方向和最小改造切片。
```

For direct implementation:

```text
视觉专项：参考 docs/process/VISUAL_WORKFLOW.md，直接改 [页面/模块] 的视觉表现。
先确认用户实际入口和父级上下文；保持现有功能行为，只做必要的样式、布局、动效和轻量交互支撑。
```

For hybrid / cross-module surfaces:

```text
视觉专项：先做入口归属排查。
目标：[页面/弹层/卡片]
我希望你不要只看代码或数据来源，而是判断用户看到它时仍处于哪个上级入口。
如果它在装载 APP 内，就保持该 APP 的沉浸式视觉逻辑。
```

## 10. Verification

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
