# Visual Reference Asset Library

Updated: 2026-05-23

This document records the external visual reference library used during SchatPhone visual work.

The library is a reference source, not a package dependency and not a default runtime asset folder.

## 1. Current Machine Path

Current machine:

```text
D:\github\美化包
```

Other machines must not assume this path exists. Before starting visual work on another PC, ask the machine owner to confirm the local asset-library path.

If the library is missing, continue the workflow with project docs and project assets only, and record that the external library was unavailable for the round.

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
4. place it under a purpose-specific project folder such as `public/assets/`;
5. record why it was added in the relevant visual or product-decision document.

The full external library should stay outside git unless a separate Git LFS-backed reference repository is explicitly created.

## 5. Cross-PC Setup Prompt

Use this prompt before visual work on a new machine:

```text
Please confirm the local visual reference asset library path.
Current-machine example: D:\github\美化包
If the library is unavailable, should this round continue with project-local resources only?
```

