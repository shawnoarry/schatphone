# SchatPhone Task Execution Plan / 任务执行清单

Updated / 更新时间: 2026-04-04

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
5. Mainline alignment rule: roadmap decisions must stay aligned with:  
主线对齐规则：路线决策必须与以下文档保持一致：
- `IMMERSIVE_PHONE_MASTER_BLUEPRINT.md`
- `BACKGROUND_ACTIVITY_STRATEGY.md`
- `STATE_OWNERSHIP_STRATEGY.md`
- `STORAGE_STRATEGY.md`

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

- Status / 状态: `DONE`
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
- Implemented scope / 已实现范围:
- Added manual-priority guard, autonomous scheduling hints, and call/error report filtering UX.  
已落地手动优先防冲突、会话内自主调用状态提示与报错记录筛选体验。

### P0-5 Widget Import Safety Baseline / Widget 导入安全基线

- Status / 状态: `DONE`
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
- Implemented scope / 已实现范围:
- Added dedicated import schema module (`src/lib/widget-schema.js`) with adjustable limits and danger-pattern checks.  
新增独立导入校验模块（`src/lib/widget-schema.js`），支持可调阈值与危险模式检测。
- Refactored import flow to transactional apply with rollback-safe behavior on errors.  
导入流程改为事务式写入，异常时回滚保护，不污染现有布局。
- Appearance import area now includes recognized template, rules, and structured feedback (success/warning/error).  
外观导入区已提供可识别模板、规则说明与结构化反馈（成功/提醒/失败）。
- Added test coverage for valid import, invalid JSON, dangerous code blocking, warning path, and rollback safety.  
新增合法导入、非法 JSON、危险代码拦截、告警路径与回滚安全测试。

### P0-6 Backup Restore & Rollback Safety / 备份恢复与回滚安全

- Status / 状态: `DONE`
- Goal / 目标:
- Add Settings JSON restore import with rollback-safe fallback and compatibility for both legacy and current chat data shapes.  
新增 Settings 的 JSON 恢复导入能力，并提供失败回滚保护，兼容旧版与新版聊天数据结构。
- Target files / 涉及文件:
- `src/views/SettingsView.vue`
- `src/stores/system.js`
- `src/stores/chat.js`
- `src/stores/map.js`
- `tests/chat-store-model.test.js`
- Acceptance criteria / 验收标准:
- Import can restore system/chat/map snapshots from JSON in one flow. / 可通过 JSON 一次性恢复 system/chat/map。
- Import failure triggers automatic rollback to pre-import state. / 导入失败自动回滚到导入前状态。
- Chat restore supports both legacy (`contacts + chatHistory`) and new shape (`roleProfiles + conversations + messagesByConversation`).  
Chat 恢复同时兼容旧结构（`contacts + chatHistory`）与新结构（`roleProfiles + conversations + messagesByConversation`）。
- Implemented scope / 已实现范围:
- Added restore APIs in system/chat/map stores and wired Settings import entry.  
已在 system/chat/map store 新增恢复 API，并接入 Settings 导入入口。
- Added rollback snapshot around restore flow in Settings import handler.  
Settings 导入流程已加入导入前快照与失败回滚机制。
- Added tests for chat backup restore in both new and legacy shapes.  
新增 Chat 新旧结构备份恢复测试。

---

## 3. Active Mainline (2026-03-30) / 当前主线（2026-03-30）

### P0-7 Mainline Unification / 主线统一收口

- Status / 状态: `DONE`
- Goal / 目标:
- Align execution checklist with immersive real-time direction and keep docs in one coherent route.  
将执行清单与“现实时间驱动沉浸方向”统一，保持文档路线一致。

### P1-1 Chat Directory Enhancements / 会话通讯录增强（搜索/批量/模板）

- Status / 状态: `DONE`
- Goal / 目标:
- Add search, batch operations, and preset templates in chat directory.  
在会话通讯录增加搜索、批量操作与模板预设。
- Progress / 进度:
- M1 (search + quick filters) completed on 2026-03-16.  
M1（搜索 + 快速筛选）已于 2026-03-16 完成。
- M2 (batch mode + bulk unbind/delete + filtered batch bind) completed on 2026-03-16.  
M2（批量模式 + 批量解绑/删除 + 按筛选结果批量绑定）已于 2026-03-16 完成。
- Remaining / 剩余:
- None. M3 template presets completed on 2026-03-30.  
无。M3 模板预设已于 2026-03-30 完成。

### P0-A1 Real-Time Scheduler Baseline / 现实时间调度器基线

- Status / 状态: `DONE` (2026-03-30)
- Goal / 目标:
- Build time-driven trigger checkpoints for autonomous actions based on real system time.  
基于真实系统时间建立自主触发检查点机制。

### P0-A2 Restore-Time Settlement / 恢复时补算

- Status / 状态: `DONE` (2026-03-30)
- Goal / 目标:
- Compute elapsed-time consequences when returning from inactivity.  
在应用从不活跃状态恢复时完成离线期间事件补算。

### P0-A3 Notification Reconstruction / 通知重建与堆叠

- Status / 状态: `DONE` (2026-03-30)
- Goal / 目标:
- Reconstruct pending events into lock-screen style notifications with timeline order.  
将补算出的待发生事项重建为带时间顺序的锁屏通知队列。

### P0-A4 Autonomous Control Refinement / 自主调用控制细化

- Status / 状态: `DONE` (2026-03-30)
- Goal / 目标:
- Finish user-facing control policy: interval/quiet-hours/notify-only/manual-priority consistency.  
完成用户可感知控制策略：间隔、安静时段、仅通知、手动优先一致性。

### P0-B1 State Truth Minimal Layer / 系统真值最小层

- Status / 状态: `DONE` (2026-04-03)
- Goal / 目标:
- Introduce minimal system-owned truth fields for relationship/event/time continuity across providers.  
补齐关系/事件/时间连续性的系统真值最小字段，确保跨供应商稳定。
- Implemented scope / 已实现范围:
- Added system-owned truth state in `system` store (`truthState.chatEntities/chatEvents`) with normalized metrics and stage derivation.  
在 `system` store 中新增系统真值层（`truthState.chatEntities/chatEvents`），包含指标归一化与关系阶段推导。
- Chat runtime now records truth events for user message, manual/auto trigger, assistant reply, reroll, notify-only skip, and resume settlement.  
Chat 运行态已接入真值事件记录：用户发言、手动/自动触发、助手回复、重roll、仅通知跳过、恢复补算。
- Truth snapshot is injected into prompt context and included in backup export/restore path.  
真值快照已接入提示词上下文，并纳入备份导出/恢复链路。
- Added dedicated tests: `tests/system-truth.test.js`.  
已新增专项测试：`tests/system-truth.test.js`。

### P1-2 Structured Block Policy Hardening / 结构化消息策略加固

- Status / 状态: `IN_PROGRESS` (started 2026-04-03)
- Goal / 目标:
- Harden block fallback consistency, quote safety, and mixed-content readability.  
加强块级回退一致性、引用安全、混合内容可读性。
- Implemented in current batch / 当前批次已实现:
- Chat/store block normalization now applies route/url safety and content-length guards.  
Chat/store 的 block 归一化已接入 route/url 安全校验与文本长度上限。
- Quote safety now prefers real context candidates and downgrades invalid quote replies to plain.  
引用安全已改为优先绑定真实上下文候选，非法引用会降级为普通回复。
- Markdown rendering now uses HTML sanitization before `v-html` mount.  
Markdown 渲染已在 `v-html` 挂载前进行 HTML 清洗。
- Added regression tests for block hardening and assistant fallback behavior.  
已补充 block 加固与助手回退行为的回归测试。

### P1-3 Settings UX Refinement / 设置体验优化（分组与反馈一致性）

- Status / 状态: `IN_PROGRESS` (started 2026-04-04)
- Goal / 目标:
- Improve grouping clarity and save-feedback consistency in settings flows.  
提升设置流程分组清晰度和保存反馈一致性。
- Implemented in current batch / 当前批次已实现:
- Added beginner tip and quick-access shortcuts in settings root page (Network/Chat settings/Appearance).  
设置首页新增新手提示与快捷入口（网络、会话设置、外观工坊）。
- Added per-item subtitles to reduce ambiguity for non-technical users.  
为核心设置项补充说明副标题，降低新手理解成本。
- Report center cards now include issue type, suggested fix, and one-click copy payload for support/debug handoff.  
调用/报错中心新增“问题类型 + 建议处理 + 一键复制报告”，便于排查与反馈。

### P1-4 Storage Layering Preparation / 分层存储迁移准备

- Status / 状态: `TODO`
- Goal / 目标:
- Prepare migration path from localStorage-heavy records to IndexedDB-first long-term storage.  
准备从 localStorage 偏重存储向 IndexedDB 主存档层迁移的路径。

---

## 4. Recommended Sequence / 推荐执行顺序

1. Immediate: `P1-2`.  
立即：`P1-2`。
2. Then: `P1-3`.  
再做：`P1-3`。
3. Finally: `P1-4`.  
最后：`P1-4`。

---

## 5. Progress Tracker / 进度记录

| Task ID | Owner / 负责人 | Start Date / 开始日期 | End Date / 完成日期 | Status / 状态 | Notes / 备注 |
|---|---|---|---|---|---|
| P0-0 | Codex | 2026-03-14 | 2026-03-14 | DONE | Core docs synced with lock/i18n reality |
| P0-1 | Codex | 2026-02-23 | 2026-02-23 | DONE | Added auto mode, reply count/style, proactive opener strategy |
| P0-2 | Codex | 2026-03-14 | 2026-03-14 | DONE | Remaining target pages migrated to `useI18n` |
| P0-3 | Codex | 2026-03-15 | 2026-03-15 | DONE | Message action menu with reroll replace flow |
| P0-4 | Codex | 2026-03-15 | 2026-03-15 | DONE | Manual-priority guard + report center UX and validation completed |
| P0-5 | Codex | 2026-03-15 | 2026-03-15 | DONE | Widget import schema + rollback-safe transactional pipeline |
| P0-6 | Codex | 2026-03-16 | 2026-03-16 | DONE | Backup restore import + rollback safety + legacy/new chat compatibility |
| P0-7 | Codex | 2026-03-30 | 2026-03-30 | DONE | Mainline docs aligned with immersive real-time blueprint |
| P1-1 | Codex | 2026-03-16 | 2026-03-30 | DONE | M1+M2+M3 completed |
| P0-A1 | Codex | 2026-03-30 | 2026-03-30 | DONE | Global real-time chat scheduler baseline + focus/visibility resume checks |
| P0-A2 | Codex | 2026-03-30 | 2026-03-30 | DONE | Resume-time elapsed settlement integrated into chat loop |
| P0-A3 | Codex | 2026-03-30 | 2026-03-30 | DONE | Resume settlements now reconstruct lock-style stacked notifications |
| P0-A4 | Codex | 2026-03-30 | 2026-03-30 | DONE | Quiet-hours + notify-only policy integrated across settings and chat runtime |
| P0-B1 | Codex | 2026-04-03 | 2026-04-03 | DONE | System-owned truth state layer integrated (store + chat runtime + prompt + backup + tests) |
| P1-2 | Codex | 2026-04-03 |  | IN_PROGRESS | Batch-1 landed: block/url sanitization + quote candidate safety + markdown sanitize |
| P1-3 | Codex | 2026-04-04 |  | IN_PROGRESS | Batch-1 landed: beginner guidance + quick access + report readability/copy |
| P1-4 | TBD |  |  | TODO | Storage layering preparation (`localStorage` -> `IndexedDB`) |
