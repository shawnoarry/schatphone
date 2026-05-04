# Files Internal Storage Role / Files 内部储存角色决策

Updated / 更新时间: 2026-05-04

## 1. Decision / 决策

`Files` is not a standalone user-facing frontend app in the current product direction.

`Files` 在当前产品方向中不作为独立前台应用展示。

It may remain as an internal storage and coordination component for metadata, indexes, quick notes, backup coverage, diagnostics, and future cross-module references.

它可以保留为内部储存与协调组件，用于元数据、索引、便签、备份覆盖、诊断以及后续跨模块引用。

## 2. Product Reason / 产品原因

The project is aiming for a real-phone immersive experience. A visible generic file manager breaks part of that immersion because users already create and manage meaningful objects through their owning modules.

本项目目标是“真实手机沉浸感”。一个独立、泛化的文件管理器会削弱沉浸感，因为用户已经通过各自所属模块创建与管理有意义的对象。

Owning surfaces should stay clear:

- Gallery owns photos, wallpapers, memories, journeys, and reusable visual assets.
- Contacts and Chat Directory own role profiles, relationship data, and role-linked asset slots.
- Chat owns conversations, message media, and conversation-scoped attachments.
- Map owns trip cues, places, journey context, and route-derived references.
- Calendar owns events, reminders, and real scheduling handoff.
- Settings owns backup, restore, diagnostics, and storage transparency.

## 3. Engineering Role / 工程角色

`Files` may still provide internal capabilities:

- Metadata-only local file index.
- Quick notes and lightweight reference records.
- Favorite/delete state for indexed records.
- Shared media-size guard reuse for local metadata import.
- Backup and storage-diagnostics participation.
- Future bridge records that help modules find related assets without duplicating original content.

Important boundary:

- Do not copy, upload, or store original binary file content in `Files` unless a later explicit product decision changes this.
- Do not make `Files` the owner of Gallery assets, role profiles, map records, chat messages, or calendar events.
- Do not add Home, More, dock, or onboarding entries that present `Files` as a normal app.

## 4. Frontend Entry Policy / 前台入口策略

Current frontend policy:

- Hide `Files` from Home default layout.
- Remove or suppress old persisted `app_files` Home tiles during layout normalization.
- Hide `Files` from More quick entries.
- Hide `Files` from user-facing app icon customization targets.
- Keep `/files` route and store code only for internal, developer, compatibility, or future diagnostic use.

If a future visible surface becomes necessary, it should not be named or framed as a generic file manager. Prefer contextual names such as:

- `资料库`
- `线索库`
- `档案索引`
- `素材引用`

Any future visible surface must explain which owning module created each item and where the user should edit it.

## 5. Current Code Touchpoints / 当前代码触点

- `src/stores/files.js`: internal metadata-only index store.
- `src/stores/system.js`: Home layout normalization filters hidden frontend entry tile `app_files`.
- `src/views/HomeView.vue`: no user-facing `app_files` tile registry entry.
- `src/views/MoreView.vue`: quick entries suppress the Files entry.
- `src/lib/app-icon-presentation.js`: `app_files` metadata can remain for compatibility, but it is no longer a customization target.
- `src/router/index.js`: `/files` remains available but should not be promoted as a normal frontend entry.

## 6. Next Recommendation / 下一步建议

Continue functional-code work on Network component coverage before expanding Files.

Files should only grow when another module has a concrete need for an internal metadata bridge.
