# SchatPhone Development Tooling

Updated: 2026-08-15

Purpose: record shared development-tool assumptions, local skill inventory, and cross-PC setup rules for SchatPhone.

This file is the tooling companion to:

- `docs/process/AI_WORK_MODE.md` for the cross-task execution contract;
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
- Repository Markdown and skill files use UTF-8. In Windows PowerShell, prefer `Get-Content -Encoding UTF8` so valid Chinese text is not misread through the legacy system code page.
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
npm.cmd run test:visual
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

### 4.1 Project Asset Publishing

Repository-owned artwork uses the personal SchatPhone image bed as its development and production source.

- public runtime files use `schatphone-assets/`;
- masters, generation sources, and visual candidates that are not byte-identical to a runtime file use protected `schatphone-source/`;
- owner Gallery media will use `schatphone-user/` through a separate future application Adapter;
- a byte-identical master and runtime export are uploaded once, under the public runtime key;
- PWA/install/offline bootstrap icons remain in Git.

Project publishing uses a long-lived `SCHATPHONE_IMGBED_PROJECT_TOKEN` with `upload + list` only. It has no `delete + manage` permission and is distinct from both the retired migration token and the future Gallery device token. The owner keeps the shared value in the password-manager entry for `cloudflare-imgbed-7z3.pages.dev` named `SchatPhone-Project-Publisher`. Every workstation that publishes retrieves that same value and configures it in its own ignored `.env.local`; neither the token nor any workstation-specific archive path is project configuration.

One-time setup is portable across the home and office PCs:

1. pull the repository and run `npm install` so the tracked Git hook is active;
2. create or update that workstation's ignored `.env.local` from `.env.example` without copying another workstation's unrelated local settings;
3. retrieve `SchatPhone-Project-Publisher` from the owner's synchronized password manager and set only `SCHATPHONE_IMGBED_PROJECT_TOKEN` to its password value;
4. keep `SCHATPHONE_IMGBED_BASE_URL` at the tracked example value unless the image-bed deployment itself changes.

Normal project publishing does not use `SCHATPHONE_IMGBED_TOKEN`, the Hugging Face repository credential, or a local archive path. A workstation that only runs the application needs none of these credentials; a workstation that publishes new repository-owned artwork needs only `SCHATPHONE_IMGBED_PROJECT_TOKEN`.

The repeatable production flow is identical on both PCs and does not require a manual upload command. Its small JSON work item is called an **asset upload list** (`素材上传清单`). Confirming this list only tells the automated publisher which local bytes and destinations to process; it is not artwork approval, does not mean the image is final, and does not prevent later replacement. A changed image is uploaded as new SHA-256 content and the registry/runtime reference is updated in the later change.

1. Generate assets under ignored `output/imagegen/`.
2. Add the relevant visual assets to a confirmed local asset upload list with one or more repeated `--runtime <local>=<remote>` and `--source <local>=<remote>` mappings. The list is a small credential-free JSON document that references the original files; it is not another copy of their bytes. Runtime artwork goes to `schatphone-assets/`; masters, generation sources, and candidates go to `schatphone-source/`. Audit screenshots, Playwright reports, contact sheets, prompts, JSON/JSONL request records, and acceptance notes are not image-bed payloads:

```powershell
npm.cmd run assets:prepare -- --batch <id> --runtime <local>=<remote> --source <local>=<remote> --confirm --confirmation-source <reason>
```

3. Create the Git commit normally. The tracked pre-commit hook discovers confirmed asset upload lists and automatically publishes them before the commit is finalized.

For a pending plan, the hook splits work into batches of at most 10 files and 40 MiB, verifies the server response, downloads every public/protected object into memory, compares byte length and SHA-256, updates and stages `config/project-assets.json`, then removes the verified plan, result record, and exact `output/imagegen/` source paths. The verification download does not create another local image copy.

If the project token is missing or the network/upload/remote-verification step is temporarily unavailable, the hook does not block the commit. It force-stages only the confirmed upload list and its exact `output/imagegen/` entries as a credential-free Git fallback so another PC can pull and continue. Every later commit retries the same idempotent upload. After a successful retry, the hook stages deletion of those temporary Git files and keeps only the registry-backed image-bed references. Invalid lists, conflicting remote keys, duplicate bytes under different keys, and a local file changed after list confirmation remain hard failures rather than fallback conditions. The fallback deliberately trades a rare temporary increase in Git history for uninterrupted cross-PC handoff.

`npm.cmd run assets:publish -- --plan .imgbed-publish/<id>.plan.json --execute` remains available as a repair/diagnostic command, but it is not part of the normal user workflow.

The one-time repository migration has two additional offline controls. Its `--destination` is always supplied explicitly for the current device; a workstation that does not keep a local master archive does not need that directory.

```powershell
npm.cmd run imgbed:registry-sync -- --plan <path> --results <path> --batch <id> --execute
npm.cmd run imgbed:archive -- --plan <path> --results <path> --destination <archive-root> --execute
npm.cmd run imgbed:archive-remove -- --manifest <path> --plan <path> --results <path> --references-migrated --execute
```

Registry sync refuses incomplete or mismatched verification results. Archive first copies every primary and alias path, checks destination capacity, recomputes size and SHA-256, copies credential-free records, and writes an archive manifest. Removal is deliberately separate: it revalidates the archive manifest against the original approved plan and complete result document, rechecks both archive and source bytes, and accepts only paths named by that plan.

An independently approved follow-up batch may share a dated archive root by adding `--manifest-name <batch>-archive-manifest.json`. The archive tool rejects repository-local destinations, including cross-drive path ambiguities, and never replaces the default manifest unless that exact name is requested.

The tracked `.githooks/pre-commit` runs automatic pending publication before `assets:check --staged`. With no confirmed pending upload list it performs no network request and does not require a token. `npm install` activates the shared hooks through the repository `prepare` script. CI never receives the token or uploads; its offline check accepts only fallback media covered exactly by a tracked confirmed list and rejects all other local project media. Version-1 JSON keeps the internal `approved` and `approvalSource` field names solely for compatibility with existing lists on either PC; project language and behavior use “asset upload list,” and those fields never represent an art-final decision.

Do not commit `.env.local`, any token, or generated source files outside the hook's exact temporary fallback. Do not use a protected `schatphone-source/` URL as a browser runtime source.

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

Project-local skill contents are vendored under:

```text
.\.agents\skills
```

The generated provenance lock for externally sourced project-local skills is:

```text
skills-lock.json
```

`.agents/skills` is the truth for what a clone actually contains. `skills-lock.json` records the external source and content hash for those vendored skills. Root `AGENTS.md` and workflow documents are project instructions, not skills, and must not be placed in the skill inventory.

Workflow ownership is split like this:

- root `AGENTS.md`: stable bootstrap and independent workflow/skill audit rule.
- `docs/process/AI_WORK_MODE.md`: thin cross-task execution contract.
- `docs/process/WORKTREE_INTEGRATION_PROTOCOL.md`: cross-worktree delivery and integration ownership.
- `docs/process/EVENT_WORKFLOW.md`: event/runtime lane skill routing.
- `docs/process/VISUAL_WORKFLOW.md`: visual/IA lane skill routing.

Global machine-local skills may also exist outside the repo. Those can support work on the current machine, but they are not required for repo portability unless explicitly documented.

The OpenAI Product Design plugin is one such optional machine-provided visual capability. `docs/process/VISUAL_WORKFLOW.md` may use it for consequential direction exploration, flow audit, interaction prototyping, or design QA, but ordinary SchatPhone UI work must not depend on the plugin, Figma, or Pencil being installed. Cross-PC continuity comes from Git-eligible accepted briefs, reference images, generated assets, prototype decisions, and validation evidence; another machine may continue the same product path with the repo-local skills and normal browser/image tooling.

## 7. Current Project-Local Skill Inventory

The current externally sourced repo-local skills recorded in `.agents/skills` and `skills-lock.json` are:

| Skill | Main use | Primary workflow owner |
| --- | --- | --- |
| `grill-me` | Stress-test plans, architecture proposals, and requirement assumptions one decision branch at a time | owning task package or explicit user request |
| `find-skills` | Skill discovery and installation help when a new capability is needed | `docs/process/DEVELOPMENT_TOOLING.md` |
| `frontend-design` | Building or reshaping frontend surfaces with stronger design direction | `docs/process/VISUAL_WORKFLOW.md` |
| `frontend-logic-design` | Information architecture, navigation depth, and interaction-logic review | `docs/process/VISUAL_WORKFLOW.md` and `docs/process/EVENT_WORKFLOW.md` when event surfaces need IA cleanup |
| `image-to-code` | Pixel-level 750px source-image, screenshot, or design-export restoration into code plus high-resolution PNG slices | `docs/process/VISUAL_WORKFLOW.md` |
| `gpt-image` | Scenario-specific GPT Image prompt/reference atlas for product, food, brand, poster, UI, infographic, illustration, character, and edit workflows; execution remains separately governed | `docs/process/VISUAL_WORKFLOW.md` |
| `redesign-existing-projects` | Audit-first visual refinement of an existing app without replacing its framework, behavior, or product hierarchy | `docs/process/VISUAL_WORKFLOW.md` |
| `ui-ux-pro-max` | Local searchable UI/UX reference data for product patterns, palettes, typography, accessibility, Vue guidance, icons, charts, and motion | `docs/process/VISUAL_WORKFLOW.md` |
| `gsap-core`, `gsap-frameworks`, `gsap-performance`, `gsap-plugins`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-utils` | Official GSAP API, Vue lifecycle, plugin, sequencing, scroll-motion, utility, reduced-motion, and performance guidance | `docs/process/VISUAL_WORKFLOW.md` |
| `improve-codebase-architecture` | Refactor seams, ownership review, decomposition planning | module-architecture package; `EVENT_WORKFLOW.md` for event seams |
| `music` | ElevenLabs music-generation prototypes, composition plans, and inpainting experiments | `docs/process/ELEVENLABS_AUDIO_SKILLS_CROSS_PC_SETUP.md`; product integration remains separately gated |
| `pinia` | Store shape, actions, hydration, persistence patterns | owning task package; `EVENT_WORKFLOW.md` for event runtime |
| `vue-pinia-best-practices` | Vue + Pinia reactivity and store-consumption patterns | owning task package; `EVENT_WORKFLOW.md` for event runtime |
| `unit-test-vue-pinia` | Vue/Pinia unit tests for stores, components, composables | owning task package; `EVENT_WORKFLOW.md` for event runtime |
| `playwright-testing` | Browser-level journey testing and E2E verification | owning task package; specialist workflow when one applies |
| `sound-effects` | ElevenLabs sound-effect and ambience candidates for reviewed development/content work | `docs/process/ELEVENLABS_AUDIO_SKILLS_CROSS_PC_SETUP.md`; runtime use remains separately gated |
| `text-to-speech` | ElevenLabs speech and role-voice prototypes | `docs/process/ELEVENLABS_AUDIO_SKILLS_CROSS_PC_SETUP.md`; current Chat voice cards remain virtual |
| `game-engine` | Real game-loop, Canvas/WebGL, minigame work only | `docs/process/EVENT_WORKFLOW.md` |
| `chinese-novelist` | Chinese fiction craft helper for story-world text, character tension, dialogue, and scene texture; optional support for WorldBook source writing | `docs/process/DEVELOPMENT_TOOLING.md` |

### 7.1 What Is Already Covered Well

These workflow docs already wire skills in a clear way:

- `docs/process/EVENT_WORKFLOW.md`
  - explicit installed-skills section;
  - explicit invocation matrix for `pinia`, `vue-pinia-best-practices`, `unit-test-vue-pinia`, `playwright-testing`, `game-engine`, `improve-codebase-architecture`, and `frontend-logic-design`.
- `docs/process/VISUAL_WORKFLOW.md`
  - explicit installed-skills section;
  - narrow, mutually exclusive routing across IA, visual design, existing-surface redesign, searchable UI/UX reference, source-image restoration, and focused GSAP motion work;
  - Playwright plus `@axe-core/playwright` is the single default visual-quality verification path.

### 7.2 What Must Not Be Lost In Future Cleanup

When cleaning or splitting docs, preserve these rules:

1. root `AGENTS.md` stays a short bootstrap and never duplicates the full workflow.
2. `AI_WORK_MODE.md` remains a thin cross-task execution contract, not a specialist workflow or skill router.
3. Event/runtime work keeps its own skill matrix in `EVENT_WORKFLOW.md`.
4. Visual/IA work keeps its own skill matrix in `VISUAL_WORKFLOW.md`.
5. `.agents/skills` remains the content inventory; `skills-lock.json` remains external provenance rather than a workflow authority.
6. If a new workflow starts depending on a project-local skill, document that dependency in:
   - the workflow doc;
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
3. run `npm.cmd run governance:check` to verify inventory and active-doc references;
4. restart Codex or the agent host so the skill is loaded;
5. update `docs/process/VISUAL_WORKFLOW.md` or the relevant workflow doc with:
   - when to use the skill;
   - why the existing stack was insufficient;
   - the install command needed on another PC.

### 8.1 Visual Design And Motion Skills

The visual capability additions reviewed on 2026-08-12 are vendored project-local skills:

```text
Taste Skill source: https://github.com/leonxlnx/taste-skill
Installed skill: redesign-existing-projects

UI/UX Pro Max source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
Installed skill: ui-ux-pro-max

GSAP source: https://github.com/greensock/gsap-skills
Installed skills: gsap-core, gsap-frameworks, gsap-performance, gsap-plugins,
                  gsap-scrolltrigger, gsap-timeline, gsap-utils
```

`redesign-existing-projects` was selected from the Taste Skill repository because SchatPhone is an existing Vue product and the skill is specifically audit-first. Its upstream visual prescriptions remain suggestions: SchatPhone's product boundaries, existing icon family, design tokens, information-depth rules, mobile composition, and accessibility contracts win when they differ.

`ui-ux-pro-max` vendors its searchable CSV data and standard-library Python scripts. The reviewed copy performs local reads and searches. It makes no network calls, reads no credentials, and starts no subprocesses. Its optional `--persist` mode can write a generated `design-system/` tree, so do not use `--persist` during normal SchatPhone work. Existing `docs/design/*` files remain the design authority; any deliberate persistent design-document change must follow the normal documentation workflow.

For a bounded local query, invoke the vendored script from the project root:

```text
python .agents/skills/ui-ux-pro-max/scripts/search.py "mobile social app" --stack vue
```

The seven GSAP skills are documentation and implementation guidance only. They do not install the `gsap` npm runtime. Add or update that dependency only in an explicitly approved implementation slice, then run the dependency and behavior validation required by `docs/process/AI_WORK_MODE.md`.

Normal secondary-PC setup must not reinstall these skills from moving upstream branches. Commit and push `.agents/skills`, `skills-lock.json`, and these workflow updates; the other PC receives the reviewed copies through `git pull`, then restarts Codex or reopens the project task.

Use these commands only for a deliberate reviewed refresh of the vendored copies:

```text
npx.cmd -y skills add https://github.com/leonxlnx/taste-skill --skill redesign-existing-projects --copy
npx.cmd -y skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git --skill ui-ux-pro-max --copy
npx.cmd -y skills add https://github.com/greensock/gsap-skills --skill gsap-core gsap-frameworks gsap-performance gsap-plugins gsap-scrolltrigger gsap-timeline gsap-utils --copy
```

### 8.2 GPT Image Prompt Atlas Skill

`gpt-image` is a vendored project-local prompt/reference specialist, not an application runtime or deployment dependency. The reviewed 2026-08-15 snapshot is upstream commit `068dd9e24aadc8731e46f38548ca4dcd94515d35`; the repository was MIT-licensed and its reputation check recorded 4,555 GitHub stars, 393 forks, and 366 Skills CLI installs at review time.

The useful production surface is its routed 162-prompt atlas and prompt-craft guidance. It covers several recurring SchatPhone asset families that the generic image-generation capability does not organize by itself: product and food photography, brand systems, typography/posters, UI mockups, infographics, technical illustration, character design, photography, and reference-image edits.

Project policy narrows the upstream runbook:

- use the vendored reference files to find a close pattern, then rewrite it for the accepted SchatPhone subject, composition, crop, locale, and ownership constraints;
- keep `imagegen` or `codex-image` as the normal execution path;
- do not invoke the bundled Python CLI, load `OPENAI_API_KEY` from `.env`/`~/.env`, or use the launcher's moving-`main` `uvx` fallback without explicit user approval for local-key use and billable API execution;
- do not inherit the upstream CLI's `moderation=low` default as project policy;
- treat external author/source links as reference provenance, not licensing or approval to reproduce a prompt, public brand, character, likeness, or source image;
- generated files still enter SchatPhone's existing candidate review and asset-upload-list flow; the skill does not bypass image-bed, registry, acceptance, or archival rules.

The reviewed install command is:

```text
npx.cmd -y skills@latest add wuyoscar/gpt_image_2_skill --skill gpt-image --agent codex --copy --yes
```

Normal secondary-PC setup receives the vendored directory and lock entry through Git. A deliberate refresh must repeat the source/security review and update the recorded commit/hash before replacing the reviewed copy.

### 8.3 Chinese Novelist Skill

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

### 8.4 Image To Code Skill

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

### 8.5 ElevenLabs Audio Skills

The project vendors exactly three optional ElevenLabs development Skills:

```text
text-to-speech
music
sound-effects
```

They support temporary speech, music, and sound-effect prototypes. They are not SchatPhone runtime
providers and do not approve SDK dependencies, persisted audio, Chat/Phone voice behavior, or
automatic generation.

Cross-PC installation, secure Key setup, zero-credit verification, live smoke testing, project
boundaries, update rules, and handoff format are owned by:

```text
docs/process/ELEVENLABS_AUDIO_SKILLS_CROSS_PC_SETUP.md
```

The reviewed clean-install command is:

```powershell
npx.cmd -y skills add elevenlabs/skills --skill text-to-speech music sound-effects --copy
```

Normal secondary-PC setup should pull the vendored `.agents/skills` directories and
`skills-lock.json` through Git rather than refreshing upstream independently.

## 9. Cross-PC Setup Checklist

Use this checklist before another device takes over development:

1. Confirm local paths with the machine owner.
2. Confirm Node.js / npm versions are suitable.
3. Confirm PowerShell can run `npm.cmd` and `npx.cmd`.
4. Clone SchatPhone and run project install from the confirmed root.
5. Install OpenCLI globally if that PC needs browser/app CLI tooling.
6. Confirm the vendored project-local skills from `.agents\skills` and `skills-lock.json`; do not reinstall them from moving upstream branches during ordinary setup.
7. If visual work is in scope, follow `docs/process/VISUAL_WORKFLOW.md` for visual skill setup.
8. If visual reference assets are in scope, confirm the external asset library path documented in `docs/references/VISUAL_ASSET_LIBRARY.md`.
9. If ElevenLabs audio prototyping is in scope, follow `docs/process/ELEVENLABS_AUDIO_SKILLS_CROSS_PC_SETUP.md` for the exact three-Skill inventory, secure Key entry, zero-credit checks, and paid-smoke approval.
10. If Figma design-to-code or raster generation is in scope, follow `docs/process/FIGMA_IMAGEGEN_CROSS_PC_SETUP.md` for plugin OAuth, exact-node verification, the ljqclub-compatible ImageGen CLI, proxy setup, secure Key entry, and live smoke tests.
11. Run verification commands:

```powershell
node --version
npm.cmd --version
npx.cmd --version
opencli.cmd --version
git status --short
```

## 10. Current Project Toolchain Baseline

Verified on 2026-07-22:

- local Node: 24.13.0; CI Node: 20;
- npm: 11.6.2;
- Vite: 7.3.6, with root esbuild 0.28.1 and Rollup 4.62.2;
- Vitest: 4.1.10, reusing root Vite 7.3.6 with no nested Vite 5/vite-node 1 chain;
- Playwright: 1.60.0;
- lint, 185-file / 1170-test unit suite, build, and the full 60-case Playwright collection pass (56 passed, 4 existing project-specific skips).

Audit posture:

- `npm.cmd audit --omit=dev` reports zero production vulnerabilities;
- full `npm.cmd audit` also reports zero vulnerabilities;
- the direct Vite 7 compatible patch, isolated Vitest 4 migration, and normal-resolver compatible transitive advisory refresh are complete;
- the transitive refresh changed no direct dependency, `package.json`, override/resolution policy, or major line;
- keep development servers and Vitest UI inside a trusted development environment even with the clean audit baseline.

Dependency updates must remain isolated from product behavior and must run lint, unit, build, E2E, and both audit commands.

CI/release workflow posture:

- PR/manual CI and main/manual-main Pages build use Node 20 and fail closed on separate official-registry production/full audits, lint, unit, build, and one full Chromium E2E collection;
- CI and Pages use dedicated strict ports `5181` and `5182`; the full E2E collection already includes the focused visual-quality cases, while `npm.cmd run test:visual` remains available as a local focused command;
- CI retries once for diagnostics but `--fail-on-flaky-tests` prevents a recovered retry from passing, and the JSON summary allows at most the four existing intentional skips with zero unexpected or flaky results;
- failure-only artifacts retain the HTML report, `test-results`, and JSON summary for seven days; no browser cache, download directory, or storage state is added;
- the workflow definitions are locally parsed and simulated, but remote GitHub execution, external required checks/environment protection, and deployed base-path behavior remain unverified.

## 11. Ownership Rule

This file is for shared tooling and skill inventory only.

Keep:

- cross-task authority, safety, and completion rules in `docs/process/AI_WORK_MODE.md`;
- cross-worktree protection, handoff, integration, synchronization, and push authorization in `docs/process/WORKTREE_INTEGRATION_PROTOCOL.md`;
- event-lane skill routing in `docs/process/EVENT_WORKFLOW.md`;
- visual-lane skill routing in `docs/process/VISUAL_WORKFLOW.md`;
- product semantics in package docs and architecture/product-decision docs.
