# SchatPhone Task Execution Plan / 任务执行清单

Updated / 更新时间: 2026-03-15

Purpose / 用途: turn the current roadmap into an execution-ready checklist for implementation, validation, and documentation sync.  
将当前路线图落成可直接执行的清单，用于开发、验收与文档同步。

---

## 1. Ground Rules / 执行规则

1. Priority order: complete `P0` before `P1`.  
优先级顺序：先完成 `P0`，再进入 `P1`。
2. After each completed item, sync docs:  
每完成一项，需同步以下文档：
- `PROJECT_STATUS.md`
- `CHAT_PROGRESS.md` (if Chat is affected) /（若涉及 Chat）
- `ARCHITECTURE.md` (if schema or core interaction changes) /（若涉及数据结构或核心交互）
- `SYNC_SNAPSHOT.md` (always refresh summary after source docs) /（源文档更新后同步快照）
3. Before merge, run:  
合并前至少执行：
- `npm run lint`
- `npm run build`
4. If behavior logic changes, also run:  
涉及行为逻辑改动时补跑：
- `npm run test`

---

## 2. P0 (Highest Priority) / P0（最高优先级）

### P0-0 Documentation Reality Sync / 文档现实对齐

- Status / 状态: `DONE`
- Goal / 目标: sync lock-screen, notification loop, and system-language reality across core docs.  
将锁屏、通知闭环、系统语言现状同步到核心文档。
- Target files / 涉及文件:
- `README.md`
- `PROJECT_STATUS.md`
- `ARCHITECTURE.md`
- `CHAT_PROGRESS.md`
- `SYNC_SNAPSHOT.md`
- `TASK_EXECUTION_PLAN.md`
- `操作指南-新版.md`
- Acceptance criteria / 验收标准:
- Main docs reflect current route/store/interaction reality. / 主文档与当前路由/Store/交互一致。
- No stale "2026-02-23 only" status remains in core progress docs. / 核心进度文档不再停留在 2026-02-23。

### P0-1 Conversation Settings / 会话设置页（每会话回复策略）

- Status / 状态: `DONE`
- Goal / 目标:
- Add per-conversation settings: manual/auto response, response count, response style, proactive opener strategy.  
为每个会话增加独立配置：手动/自动回复、回复条数、回复风格、主动开场策略。
- Implemented scope / 已实现范围:
- Per-conversation controls: manual/auto mode, reply count, response style, proactive opener strategy.  
已支持会话级控制：手动/自动模式、回复条数、回复风格、主动开场策略。
- Existing baseline kept: suggested replies toggle, context turns, bilingual output, quote mode, virtual voice.  
并保留基础项：可选回复开关、上下文轮数、双语输出、引用模式、虚拟语音。

### P0-2 System Language Completion (UI Scope) / 系统语言收口（UI 范围）

- Status / 状态: `DONE`
- Goal / 目标:
- Complete `useI18n` migration for remaining system pages, keeping AI content untouched.  
完成剩余系统页面的 `useI18n` 迁移，保持 AI 内容不被系统语言改写。
- Target files / 涉及文件:
- `src/views/AppearanceView.vue`
- `src/views/ChatDirectoryView.vue`
- `src/views/LockScreen.vue`
- `src/views/UserProfileView.vue`
- `src/views/WorldBookView.vue`
- `README.md`
- `PROJECT_STATUS.md`
- Implemented scope / 已实现范围:
- Remaining system pages migrated to `useI18n` and `t(...)` labels under UI scope.  
剩余系统页面已完成 `useI18n` 接入与 `t(...)` 文案迁移。
- Lock-screen notification time formatting now follows current system language locale.  
锁屏通知时间格式已跟随系统语言 locale。
- Acceptance criteria / 验收标准:
- Remaining pages respect `settings.system.language` for UI labels.  
剩余页面系统 UI 文案受 `settings.system.language` 控制。
- Chat AI content remains context/model-driven.  
Chat AI 内容仍保持上下文与模型驱动。
- No mixed-language critical navigation labels.  
关键导航文案不出现混杂语言。
- Risks / 风险:
- Hard-coded text spread across large views may cause漏改。  
大型页面硬编码文本分散，存在漏改风险。

### P0-3 Message Action Menu / 消息操作菜单（引用/编辑/删除/复制/重roll）

- Status / 状态: `DONE`
- Goal / 目标:
- Provide core message actions and per-turn re-roll capability.  
提供消息常用操作，并支持按轮重roll（重新生成）。
- Target files / 涉及文件:
- `src/views/ChatView.vue`
- `src/stores/chat.js`
- `src/lib/ai.js`
- `tests/chat-store-model.test.js`
- `PROJECT_STATUS.md`
- `CHAT_PROGRESS.md`
- Implemented scope / 已实现范围:
- Added per-message action menu in chat thread: quote, copy, edit, delete, and reroll (role-aware constraints).  
已在会话页落地消息操作菜单：引用、复制、编辑、删除、重roll（含角色约束）。
- Reroll now uses context before target assistant message and replaces the target message in-place.  
重roll 改为读取目标助手消息之前的上下文，并原位替换目标消息。
- Store supports message-level edit/delete/replace primitives with summary/unread consistency guards.  
Store 增加消息级编辑/删除/替换原子能力，并补齐摘要/未读一致性保障。
- Added test coverage for edit/replace/delete path.  
已补充编辑/替换/删除路径测试覆盖。
- Acceptance criteria / 验收标准:
- Actions work for both user and assistant messages (with role-based constraints).  
用户消息与助手消息均可操作（按角色约束能力）。
- Conversation summary/order/unread remain correct after edit/delete.  
编辑/删除后，会话摘要、排序、未读计数保持正确。
- Re-roll result is distinguishable from original output and supports retry.  
重roll结果可区分原回复，且支持失败重试。

### P0-4 Autonomous AI Control & Report Center / 自主调用控制与报错中心

- Status / 状态: `TODO`
- Goal / 目标:
- Implement a global autonomous switch, module-level switch/priority, and per-thread interval control with conflict/dedupe handling and unified call-error history center.  
落地全局自主调用总开关、模块开关/优先级、会话级间隔控制，并补齐冲突/去重策略与统一调用报错中心。
- Target files / 涉及文件:
- `src/stores/system.js`
- `src/stores/chat.js`
- `src/views/ChatView.vue`
- `src/views/SettingsView.vue`
- `src/views/NetworkView.vue`
- `PROJECT_STATUS.md`
- `CHAT_PROGRESS.md`
- Acceptance criteria / 验收标准:
- Global switch off disables all autonomous calls. / 全局开关关闭后，所有自主调用失效。
- Chat module and per-thread interval controls work together. / Chat 模块开关与会话级间隔设置可协同生效。
- Manual trigger has priority and avoids overlap duplication with autonomous calls. / 手动触发优先，并避免与自主调用重叠导致重复回复。
- API call failures and cancellations are visible in history center. / API 调用失败与取消记录可在报错中心查看。

### P0-5 Widget Import Safety Baseline / Widget 导入安全基线

- Status / 状态: `TODO`
- Goal / 目标:
- Add import schema validation and rollback-safe error handling.  
增加导入结构校验与失败回退机制。
- Target files / 涉及文件:
- `src/stores/system.js`
- `src/views/AppearanceView.vue`
- Optional new file / 可选新文件: `src/lib/widget-schema.js`
- Acceptance criteria / 验收标准:
- Invalid JSON/missing fields/dangerous fields are blocked with clear error.  
非法 JSON、缺字段、危险字段可拦截并清晰提示。
- Failed import does not mutate current layout data.  
导入失败不污染当前布局数据。

---

## 3. P1 (After P0) / P1（P0 完成后）

### P1-1 Chat Directory Enhancements / 会话通讯录增强（搜索/批量/模板）

- Status / 状态: `TODO`
- Goal / 目标:
- Add search, batch operations, and preset templates in chat directory.  
在会话通讯录增加搜索、批量操作与模板预设。

### P1-2 Structured Block Policy Hardening / 结构化消息策略加固

- Status / 状态: `TODO`
- Goal / 目标:
- Harden block fallback consistency, quote safety, and mixed-content readability.  
加强块级回退一致性、引用安全、混合内容可读性。

### P1-3 Settings UX Refinement / 设置体验优化（分组与反馈一致性）

- Status / 状态: `TODO`
- Goal / 目标:
- Improve grouping clarity and save-feedback consistency in settings flows.  
提升设置流程分组清晰度和保存反馈一致性。

---

## 4. Recommended Sequence / 推荐执行顺序

1. Week 1: `P0-4` + `P0-5`  
第 1 周：`P0-4` + `P0-5`
2. Week 2+: `P1-1` -> `P1-2` -> `P1-3`  
第 2 周起：`P1-1` -> `P1-2` -> `P1-3`

---

## 5. Progress Tracker / 进度记录

| Task ID | Owner / 负责人 | Start Date / 开始日期 | End Date / 完成日期 | Status / 状态 | Notes / 备注 |
|---|---|---|---|---|---|
| P0-0 | Codex | 2026-03-14 | 2026-03-14 | DONE | Core docs synced with lock/i18n reality |
| P0-1 | Codex | 2026-02-23 | 2026-02-23 | DONE | Added auto mode, reply count/style, proactive opener strategy |
| P0-2 | Codex | 2026-03-14 | 2026-03-14 | DONE | Remaining target pages migrated to `useI18n` |
| P0-3 | Codex | 2026-03-15 | 2026-03-15 | DONE | Message action menu with reroll replace flow |
| P0-4 | Codex | 2026-03-15 |  | IN_PROGRESS | Global/module/thread auto controls + call/error history center |
| P0-5 | TBD |  |  | TODO | Widget import schema + rollback |
| P1-1 | TBD |  |  | TODO | Directory search/batch/templates |
| P1-2 | TBD |  |  | TODO | Structured block hardening |
| P1-3 | TBD |  |  | TODO | Settings UX consistency |
