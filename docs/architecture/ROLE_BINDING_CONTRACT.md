# SchatPhone Role Binding Contract / SchatPhone 角色绑定契约

Updated / 更新时间: 2026-04-09

## 1. Purpose / 目的

EN: This document defines the reusable cross-module contract for role profile, avatar hierarchy, relationship metadata, and asset context consumption.  
中文：本文件定义“角色档案、头像层级、关系元数据、素材上下文”的跨模块复用契约。

EN: Goal: future modules (map/forum/scenario/etc.) should consume one stable contract instead of reassembling role data on their own.  
中文：目标：后续模块（地图/论坛/场景等）统一消费同一份契约，避免各模块重复拼装角色数据。

## 2. Contract Entry / 契约入口

EN: Primary API in `src/stores/chat.js`:  
中文：`src/stores/chat.js` 中的主入口：

1. `getRoleBindingContract(contactId, { moduleKey })`
2. `listRoleBindingContracts(contactIds?, { moduleKey })`

EN: Compatibility API kept for existing chat asset flow:  
中文：为兼容现有 Chat 素材链路，保留兼容入口：

1. `getRoleBindingAssetContext(contactId)` (legacy-friendly shape)

## 3. Contract Shape / 契约结构

EN: `getRoleBindingContract` returns:  
中文：`getRoleBindingContract` 返回结构：

1. `contractVersion`: current schema version (`1.0.0`)
2. `moduleKey`: consumer module key (for traceability)
3. `roleBound`: whether this contact is actually bound to a global role profile
4. `contact`: `{ id, kind, name, profileId }`
5. `profile`: `{ id, name, role, isMain, tags }`
6. `relationship`: `{ level, note }`
7. `avatar`:
`resolved`: final avatar URL after hierarchy resolution
`activeLayer`: one of `thread | module | global | fallback`
`threadAvatar`, `moduleAvatar`, `globalAvatar`, `fallbackSeed`: source traces
8. `assets`:
`preferredImageAssetId`: thread-level preferred asset
`recommendedImageAssetId`: preferred first, otherwise profile-pack fallback
`profileAssetPack`: categorized asset ids (`wallpaper/emoji/reference/scenario`)
`profileAssetIds`: flattened unique ids for quick filtering

## 4. Hierarchy Rules / 层级规则

EN: Avatar priority is fixed as `thread > module > global > fallback`.  
中文：头像优先级固定为 `会话 > 模块 > 全局 > 兜底`。

EN: Recommended image asset priority is fixed as:  
中文：推荐图片素材优先级固定为：

1. `preferredImageAssetId` (thread-level explicit override)
2. `referenceAssetIds[0]`
3. `scenarioAssetIds[0]`
4. `emojiAssetIds[0]`
5. `wallpaperAssetIds[0]`

## 5. New Module Checklist / 新模块接入清单

EN: For every new module that needs role context:  
中文：每个需要角色上下文的新模块：

1. Do not read `contacts/roleProfiles` directly for assembly.
2. Use `getRoleBindingContract` as the only role-context source.
3. Pass a module-specific `moduleKey` for diagnostics.
4. Treat `roleBound=false` as valid input; module must degrade gracefully.
5. Never assume `preferredImageAssetId` exists; fallback to `recommendedImageAssetId`.
6. Use `avatar.activeLayer` only for UI hints/debug, not for business branching that changes data truth.

## 6. Regression Baseline / 回归基线

EN: Current tests covering this contract:  
中文：当前覆盖该契约的测试：

1. `tests/role-binding-contract.test.js`
2. `tests/chat-store-model.test.js` (`getRoleBindingContract`/`listRoleBindingContracts` path)

EN: Any contract field change must update tests and this document in the same commit batch.  
中文：若契约字段发生变更，必须在同一提交批次同步更新测试与本文件。
