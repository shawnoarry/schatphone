# SchatPhone Development Tooling

Updated: 2026-06-02

Purpose: record shared development-tool assumptions, local skill inventory, and cross-PC setup rules for SchatPhone.

This file is the tooling companion to:

- `docs/process/AI_WORK_MODE.md` for execution rules;
- `docs/process/EVENT_WORKFLOW.md` for event/runtime lane skill routing;
- `docs/process/VISUAL_WORKFLOW.md` for visual/IA lane skill routing.

It is not a second roadmap and it does not replace package docs.

## 1. Confirm Local Paths First

Before installing tools on another PC, ask the machine owner to confirm:

```text
1. SchatPhone project root:
2. Node.js installation path:
3. npm global prefix:
4. Preferred shell in VSCode:
5. Whether PowerShell should use npm/npx or npm.cmd/npx.cmd:
6. OpenCLI global install location:
7. Any local reference or tool directories outside the repo:
8. Visual reference asset library path, if visual work is in scope:
```

Current machine values:

```text
SchatPhone project root: H:\SchatPhone\schatphone
Node.js path: H:\Nodejs\node.exe
npm.cmd path: H:\Nodejs\npm.cmd
npx.cmd path: H:\Nodejs\npx.cmd
npm global prefix: C:\Users\PC\AppData\Roaming\npm
OpenCLI command: C:\Users\PC\AppData\Roaming\npm\opencli.cmd
VSCode shell: PowerShell
Visual reference asset library: H:\SchatPhone\美化包
awesome-design-md reference library: D:\github\_references\awesome-design-md
```

Do not assume another PC has the same drive letters, user profile, npm prefix, or PowerShell policy.

Do not assume another PC has the same visual reference asset library path. If the external visual asset library is not present, visual work may continue with project-local assets and docs only.

## 2. Runtime Toolchain

Project runtime on the current machine:

```text
Node.js: v24.13.0
npm: 11.6.2
```

Recommended checks:

```powershell
node --version
npm.cmd --version
npx.cmd --version
npm.cmd config get prefix
```

On this Windows machine, PowerShell may block `.ps1` shims by policy. Prefer `.cmd` command shims:

```powershell
npm.cmd
npx.cmd
opencli.cmd
```

Avoid assuming plain `npm`, `npx`, or `opencli` will work in PowerShell.

Command naming convention:

- Cross-platform workflow docs may write `npm run ...` or `npx ...` as logical command names.
- On this Windows PowerShell machine, run the `.cmd` shims: `npm.cmd ...`, `npx.cmd ...`, and `opencli.cmd ...`.
- For `npm audit`, use the official npm registry if the configured mirror does not implement the audit endpoint:

```powershell
npm.cmd audit --omit=dev --registry=https://registry.npmjs.org/
```

## 3. Project Commands

Run from the confirmed SchatPhone project root:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

If plain `npm` fails because of PowerShell policy, retry with `npm.cmd`.

## 4. Dependency Update Policy

Safe default:

1. Batch patch and minor updates only after the baseline passes:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

2. Do not mix major dependency upgrades with feature work.
3. Major upgrades need a dedicated migration branch or tracked task slice.
4. Treat major jumps in these packages as migration work:
   - `vite`
   - `vitest`
   - `eslint`
   - `jsdom`
   - `marked`
   - `vue`
   - `vue-router`
   - `pinia`
5. After dependency changes, update `package-lock.json` in the same batch and record validation in the active roadmap item.

## 5. OpenCLI

OpenCLI is a general tool outside the visual-only skill group.

Current installation:

```text
Package: @jackwener/opencli
Version: 1.7.19
Global command: C:\Users\PC\AppData\Roaming\npm\opencli.cmd
```

The global command path is machine-specific. Confirm it against `npm.cmd config get prefix` on a new PC before copying this value into another setup note.

Install command:

```powershell
npm.cmd install -g @jackwener/opencli
```

Verification:

```powershell
opencli.cmd --version
opencli.cmd --help
opencli.cmd list
opencli.cmd doctor
```

PowerShell note:

- `opencli.cmd` is the recommended Windows invocation.
- Plain `opencli` may resolve to `opencli.ps1`, which can fail if script execution is restricted.

## 6. Skills System Overview

Project-local skills are installed under:

```text
.\.agents\skills
```

The lock file for project-local skill sources is:

```text
skills-lock.json
```

These two sources are the truth for "what this repo expects to be locally installed."

Workflow ownership is split like this:

- `schatphone-workflow`: general SchatPhone takeover and documentation sync.
- `docs/process/EVENT_WORKFLOW.md`: event/runtime lane skill routing.
- `docs/process/VISUAL_WORKFLOW.md`: visual/IA lane skill routing.
- `docs/process/AI_WORK_MODE.md`: overall workflow-to-skill map across lanes.

Global machine-local skills may also exist outside the repo. Those can support work on the current machine, but they are not required for repo portability unless explicitly documented.

## 7. Current Project-Local Skill Inventory

The current repo-local skills recorded in `.agents/skills` and `skills-lock.json` are:

| Skill | Main use | Primary workflow owner |
| --- | --- | --- |
| `schatphone-workflow` | SchatPhone takeover, reading order, doc-sync matrix, semantic guardrails | `docs/process/AI_WORK_MODE.md` |
| `brainstorming` | New feature/design discovery before implementation planning; produces reviewed specs | `docs/process/AI_WORK_MODE.md` |
| `grill-me` | Stress-test plans, architecture proposals, and requirement assumptions one decision branch at a time | `docs/process/AI_WORK_MODE.md` |
| `writing-plans` | Convert approved specs or clear requirements into executable implementation plans | `docs/process/AI_WORK_MODE.md` |
| `find-skills` | Skill discovery and installation help when a new capability is needed | `docs/process/DEVELOPMENT_TOOLING.md` |
| `frontend-design` | Building or reshaping frontend surfaces with stronger design direction | `docs/process/VISUAL_WORKFLOW.md` |
| `frontend-logic-design` | Information architecture, navigation depth, and interaction-logic review | `docs/process/VISUAL_WORKFLOW.md` and `docs/process/EVENT_WORKFLOW.md` when event surfaces need IA cleanup |
| `image-to-code` | Pixel-level 750px source-image, screenshot, or design-export restoration into code plus high-resolution PNG slices | `docs/process/VISUAL_WORKFLOW.md` |
| `impeccable` | Strict second-pass polish for layout, hierarchy, copy, and edge states | `docs/process/VISUAL_WORKFLOW.md` |
| `web-design-guidelines` | External UI/UX/accessibility review pass | `docs/process/VISUAL_WORKFLOW.md` |
| `improve-codebase-architecture` | Refactor seams, ownership review, decomposition planning | `docs/process/EVENT_WORKFLOW.md`, `docs/process/AI_WORK_MODE.md` |
| `pinia` | Store shape, actions, hydration, persistence patterns | `docs/process/EVENT_WORKFLOW.md`, `docs/process/AI_WORK_MODE.md` |
| `vue-pinia-best-practices` | Vue + Pinia reactivity and store-consumption patterns | `docs/process/EVENT_WORKFLOW.md`, `docs/process/AI_WORK_MODE.md` |
| `unit-test-vue-pinia` | Vue/Pinia unit tests for stores, components, composables | `docs/process/EVENT_WORKFLOW.md`, `docs/process/AI_WORK_MODE.md` |
| `playwright-testing` | Browser-level journey testing and E2E verification | `docs/process/EVENT_WORKFLOW.md`, `docs/process/AI_WORK_MODE.md` |
| `game-engine` | Real game-loop, Canvas/WebGL, minigame work only | `docs/process/EVENT_WORKFLOW.md` |
| `chinese-novelist` | Chinese fiction craft helper for story-world text, character tension, dialogue, and scene texture; optional support for WorldBook source writing | `docs/process/DEVELOPMENT_TOOLING.md` |

### 7.1 What Is Already Covered Well

These workflow docs already wire skills in a clear way:

- `docs/process/EVENT_WORKFLOW.md`
  - explicit installed-skills section;
  - explicit invocation matrix for `pinia`, `vue-pinia-best-practices`, `unit-test-vue-pinia`, `playwright-testing`, `game-engine`, `improve-codebase-architecture`, and `frontend-logic-design`.
- `docs/process/VISUAL_WORKFLOW.md`
  - explicit installed-skills section;
  - explicit routing for `frontend-design`, `frontend-logic-design`, `impeccable`, and `web-design-guidelines`;
  - machine-local visual support skills are documented there too.

### 7.2 What Must Not Be Lost In Future Cleanup

When cleaning or splitting docs, preserve these rules:

1. `schatphone-workflow` remains the baseline skill for any non-trivial SchatPhone continuation task.
2. Event/runtime work keeps its own skill matrix in `EVENT_WORKFLOW.md`.
3. Visual/IA work keeps its own skill matrix in `VISUAL_WORKFLOW.md`.
4. `skills-lock.json` and `.agents/skills` remain the inventory truth for repo-local skills.
5. If a new workflow starts depending on a project-local skill, document that dependency in:
   - the workflow doc;
   - `docs/process/AI_WORK_MODE.md`;
   - this file when install/inventory assumptions change.

## 8. Skills CLI

The `skills` installer is used for repo-local skills and is usually invoked through `npx.cmd`.

Common pattern:

```powershell
npx.cmd skills add <source>
```

Discover candidate skills before installing:

```powershell
npx.cmd skills find "<query>"
```

For visual-workflow additions, search narrowly by workflow gap instead of by broad words such as "design" alone. Example queries:

```powershell
npx.cmd skills find "mobile ui ux visual polish"
npx.cmd skills find "accessibility ui review frontend"
npx.cmd skills find "playwright visual regression screenshots"
```

Only promote a discovered skill into the SchatPhone visual workflow after checking:

1. whether the current project-local stack already covers the gap;
2. source reputation;
3. install count and maintenance signal;
4. whether the new skill must be project-local or can remain a machine-local helper.

Run project-local skill installs from the confirmed SchatPhone project root so they land in:

```text
<SchatPhone project root>\.agents\skills
```

After installing or updating project-local skills:

1. confirm `.agents\skills` contains the new skill;
2. confirm `skills-lock.json` contains the new source entry;
3. restart Codex or the agent host so the skill is loaded.
4. update `docs/process/VISUAL_WORKFLOW.md` or the relevant workflow doc with:
   - when to use the skill;
   - why the existing stack was insufficient;
   - the install command needed on another PC.

### 8.1 Chinese Novelist Skill

`chinese-novelist` is a repo-local optional writing-support skill.

Use it for:

- drafting Chinese story-world material;
- shaping character contradictions, relationship tension, dialogue subtext, and scene texture;
- improving WorldBook main-worldview text such as a modern entertainment-industry / K-pop setting.

Do not use it as the implementation workflow for SchatPhone features. Its native workflow is a long-form Chinese novel pipeline that creates novel project folders, chapter plans, and 3000-5000 word chapters. For SchatPhone, treat it as a creative reference only; Book, WorldBook, World Pack, App Store, Chat Services, and target-module ownership still follow SchatPhone docs.

Install source:

```text
https://github.com/penglonghuang/chinese-novelist-skill
```

Install from the confirmed SchatPhone project root:

```powershell
npx.cmd skills add https://github.com/penglonghuang/chinese-novelist-skill --skill chinese-novelist
```

If the other machine uses plain `npx` successfully, this equivalent form is acceptable:

```powershell
npx skills add https://github.com/penglonghuang/chinese-novelist-skill --skill chinese-novelist
```

Expected local files after install:

```text
.\.agents\skills\chinese-novelist\SKILL.md
skills-lock.json
```

Verification:

```powershell
Test-Path .\.agents\skills\chinese-novelist\SKILL.md
Select-String -Path .\skills-lock.json -Pattern '"chinese-novelist"'
git status --short
```

The `skills-lock.json` entry should record:

```json
"chinese-novelist": {
  "source": "penglonghuang/chinese-novelist-skill",
  "sourceType": "github",
  "skillPath": "SKILL.md"
}
```

After installation, restart Codex or the agent host before expecting the skill to appear in the active skill list.

### 8.2 Image To Code Skill

`image-to-code` is a repo-local visual production skill.

Use it for:

- restoring a user-provided UI image, screenshot, Figma export, or long design image into code;
- enforcing a 750px reference canvas before responsive scaling;
- exporting high-resolution transparent PNG slices when the source image contains icons, bitmap artwork, or complex visual layers;
- keeping source-image proportions, positions, stacking, colors, and opacity as the visual contract.

Do not use it for ordinary UI polish, broad redesign, or component-system refactoring. For those tasks, use the regular visual stack in `docs/process/VISUAL_WORKFLOW.md`.

Install source:

```text
https://github.com/yuzhworkhard-wq/image-to-code.git
```

Install from the confirmed SchatPhone project root:

```powershell
npx.cmd skills add https://github.com/yuzhworkhard-wq/image-to-code.git --skill image-to-code
```

Expected local files after install:

```text
.\.agents\skills\image-to-code\SKILL.md
skills-lock.json
```

Verification:

```powershell
Test-Path .\.agents\skills\image-to-code\SKILL.md
Select-String -Path .\skills-lock.json -Pattern '"image-to-code"'
git status --short
```

The `skills-lock.json` entry should record:

```json
"image-to-code": {
  "source": "yuzhworkhard-wq/image-to-code",
  "sourceType": "github",
  "skillPath": "SKILL.md"
}
```

After installation, restart Codex or the agent host before expecting the skill to appear in the active skill list.

## 9. Cross-PC Setup Checklist

Use this checklist before another device takes over development:

1. Confirm local paths with the machine owner.
2. Confirm Node.js / npm versions are suitable.
3. Confirm PowerShell can run `npm.cmd` and `npx.cmd`.
4. Clone SchatPhone and run project install from the confirmed root.
5. Install OpenCLI globally if that PC needs browser/app CLI tooling.
6. Install or confirm project-local skills from `.agents\skills` and `skills-lock.json`.
7. If visual work is in scope, follow `docs/process/VISUAL_WORKFLOW.md` for visual skill setup.
8. If visual reference assets are in scope, confirm the external asset library path documented in `docs/references/VISUAL_ASSET_LIBRARY.md`.
9. Run verification commands:

```powershell
node --version
npm.cmd --version
npx.cmd --version
opencli.cmd --version
git status --short
```

## 10. Ownership Rule

This file is for shared tooling and skill inventory only.

Keep:

- process rules in `docs/process/AI_WORK_MODE.md`;
- event-lane skill routing in `docs/process/EVENT_WORKFLOW.md`;
- visual-lane skill routing in `docs/process/VISUAL_WORKFLOW.md`;
- product semantics in package docs and architecture/product-decision docs.
