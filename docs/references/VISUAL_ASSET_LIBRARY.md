# Visual Reference Asset Library

Updated: 2026-08-10

This document records the external visual reference library used during SchatPhone visual work.

The library is an optional machine-local reference source, not a package dependency, cross-machine handoff dependency, or default runtime asset folder.

## 1. Current Machine Path

Current machine:

```text
D:\github\美化包
```

Other machines must not assume this path exists. Visual work and handoff must start from project docs and repository assets; confirming or recreating this external path is optional and must not block the round.

If the library is missing, continue with project-local resources. Its absence is expected on another machine and is not a missing project artifact.

## 2. Current Inventory Snapshot

Snapshot from 2026-05-23:

```text
Total files: 347
Total size: about 98.94 MB
Main file types: png, jpg, jpeg, txt, docx, json
```

Top-level areas observed on the current machine:

| Folder | Current use |
| --- | --- |
| `布局示例图原图` | Home layout and screen-composition reference |
| `ios图标` | icon shape, icon sizing, and phone-like launcher reference |
| `app` | installed-app shell, app surface, and mobile UI reference |
| `趣味图标` | decorative icon and custom-widget reference |
| `330美化`, `兔k美化`, `全局`, `气泡` | CSS/chat/theme reference from related visual packs |
| `logo`, `npc头像` | identity/avatar reference |

## 3. Usage Rules

Use this library to study:

- Home screen layout templates;
- widget proportions and placeholder rhythm;
- app icon sizing, masks, and launcher density;
- installed-app visual archetypes;
- chat bubble and theme references;
- mood, texture, and interaction ideas.

Do not:

- copy another product or visual pack directly into SchatPhone;
- bulk-import the full library into the repo;
- treat docx/txt/json references as production-ready code;
- rely on this path in source code, tests, or build scripts.

## 4. Bringing Assets Into The Repo

Only selected, reviewed assets should be copied into SchatPhone.

Before copying an asset:

1. confirm the asset is needed by a concrete feature or screen;
2. rename it with a stable, descriptive ASCII filename;
3. compress or resize large images when appropriate;
4. place it under a purpose-specific project folder such as `public/images/ui-assets/`;
5. record why it was added in the relevant visual or product-decision document.

Cross-machine handoff contract:

- anything a later machine must inspect or consume must live in a Git-eligible repository path, including selected reference excerpts, generated candidates, prompts/requests, manifests, hashes, contact sheets, source/license notes, accepted masters, and runtime derivatives;
- use repository-relative paths in task, acceptance, and handoff documents; a machine-local absolute path is never sufficient evidence;
- keep traceable generation material under `output/imagegen/<feature>/<batch>/` and accepted runtime assets under the owning `public/images/ui-assets/` subtree;
- a file in the working tree is not yet cross-machine evidence: mark it `PENDING_GIT_COMMIT` until it is committed and pushed through the normal project workflow;
- do not copy the whole external library merely for portability; import only the reviewed subset and provenance required by the concrete task.

The full external library should stay outside git unless a separate Git LFS-backed reference repository is explicitly created.

## 5. Project UI Asset Library

Runtime visual assets that are meant to ship with SchatPhone live under:

```text
public/images/ui-assets/
```

Current structure:

| Folder | Current use |
| --- | --- |
| `apps/food-delivery/platform/` | Food Platform banners, platform merchant photos, category/decorative assets, and rider mascot. |
| `apps/food-delivery/moon-bistro/` | Moon Bistro cover images and dish photos used by the first shop template. |
| `_inbox/` | Temporary holding area for user-provided images before classification. Files here should be renamed and moved before code references them. |

Use stable ASCII filenames once an image is selected for product use. Code may reference these project-local public URLs through `/images/ui-assets/...` or Vite base-prefixed URLs.

## 6. Cross-PC Starting Point

Use this prompt before visual work on a new machine:

```text
Start from the project docs and repository assets in this checkout.
Do not depend on a prior machine's local visual reference library.
If an external reference is required for later review, place the reviewed, redistributable evidence and provenance in a Git-eligible repository path and mark it PENDING_GIT_COMMIT until committed and pushed.
```
