# SchatPhone Task Execution Plan / 任务执行清单

Updated / 更新时间: 2026-02-23

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
3. Before merge, run:  
合并前至少执行：
- `npm run lint`
- `npm run build`
4. If behavior logic changes, also run:  
涉及行为逻辑改动时补跑：
- `npm run test`

---

## 2. P0 (Highest Priority) / P0（最高优先级）

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
- Target files / 涉及文件:
- `src/views/ChatView.vue`
- `src/stores/chat.js`
- `src/router/index.js` (only if a dedicated settings sub-route is needed) /（如需独立设置子路由）
- `tests/chat-store-model.test.js`
- `PROJECT_STATUS.md`
- `CHAT_PROGRESS.md`
- `ARCHITECTURE.md`
- Acceptance criteria / 验收标准:
- Conversation A/B settings are isolated. / 会话 A/B 配置互不影响。
- Settings persist after refresh. / 刷新后配置可恢复。
- Existing trigger/cancel/retry flow keeps working. / 不破坏现有触发/取消/重试链路。
- Risks / 风险:
- Add backward-compatible defaults for old persisted data.  
旧持久化数据需要默认值兜底，避免兼容问题。

### P0-2 Message Action Menu / 消息操作菜单（引用/编辑/删除/复制/重roll）

- Status / 状态: `TODO`
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
- Acceptance criteria / 验收标准:
- Actions work for both user and assistant messages (with role-based constraints).  
用户消息与助手消息均可操作（按角色约束能力）。
- Conversation summary/order/unread remain correct after edit/delete.  
编辑/删除后，会话摘要、排序、未读计数保持正确。
- Re-roll result is distinguishable from original output and supports retry.  
重roll结果可区分原回复，且支持失败重试。
- Risks / 风险:
- Define context window strategy for re-roll to avoid unbounded growth.  
需先定义重roll上下文策略，避免上下文无限膨胀。

### P0-3 Chat Budget Control / Chat 调用预算控制（计数/阈值提醒/确认）

- Status / 状态: `TODO`
- Goal / 目标:
- Add per-conversation usage counters, threshold warnings, and optional pre-trigger confirmation.  
增加会话级调用计数、阈值提醒与触发前二次确认（可选）。
- Target files / 涉及文件:
- `src/stores/chat.js`
- `src/views/ChatView.vue`
- `src/views/SettingsView.vue` (or `src/views/AppearanceView.vue` for global policy)  
（或在 `src/views/AppearanceView.vue` 放全局策略）
- `PROJECT_STATUS.md`
- `CHAT_PROGRESS.md`
- Acceptance criteria / 验收标准:
- Usage counting is accurate per conversation. / 每会话计数准确。
- Threshold configuration is effective. / 阈值配置生效。
- Over-threshold trigger can warn and require confirmation. / 超阈值可提醒并确认。
- Risks / 风险:
- Define counting rules first (success/failure/cancel included or not).  
先统一计数口径（成功/失败/取消是否计入）。

### P0-4 Encoding and Doc Hygiene / 编码与文档治理（乱码修复 + UTF-8 统一）

- Status / 状态: `DONE`
- Goal / 目标:
- Fix corrupted text and standardize encoding conventions.  
修复乱码文本并统一编码规范。
- Target files (expand after scan) / 涉及文件（按扫描扩展）:
- `src/stores/chat.js`
- `tests/chat-store-model.test.js`
- `README.md`
- `PROJECT_STATUS.md`
- `CHAT_PROGRESS.md`
- `ARCHITECTURE.md`
- `CHAT_FEATURE_DECISIONS.md`
- Acceptance criteria / 验收标准:
- Default contact text and test strings are readable.  
默认联系人文本和测试字符串可读。
- No new encoding-corrupted files. / 不新增乱码文件。
- Full lint/test/build passes. / lint/test/build 全通过。
- Risks / 风险:
- Prefer small-step commits before broad replacement.  
大范围替换前建议小步提交，降低误改风险。

---

## 3. P1 (After P0) / P1（P0 完成后）

### P1-1 Chat Directory Enhancements / 会话通讯录增强（搜索/批量/模板）

- Status / 状态: `TODO`
- Goal / 目标:
- Add search, batch operations, and preset templates in chat directory.  
在会话通讯录增加搜索、批量操作与模板预设。
- Target files / 涉及文件:
- `src/views/ChatDirectoryView.vue`
- `src/stores/chat.js`
- `CHAT_PROGRESS.md`
- Acceptance criteria / 验收标准:
- Search by name/type works. / 支持按名称/类型搜索。
- Batch operations include confirmation. / 批量操作有确认机制。
- Template can be applied and then directly open conversation.  
模板应用后可直接进入会话。

### P1-2 Widget Import Safety / Widget 导入安全（Schema 校验 + 危险字段过滤）

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

### P1-3 Settings UX Refinement / 设置体验优化（分组与反馈一致性）

- Status / 状态: `TODO`
- Goal / 目标:
- Improve grouping clarity and save-feedback consistency in settings flows.  
提升设置流程分组清晰度和保存反馈一致性。
- Target files / 涉及文件:
- `src/views/SettingsView.vue`
- `src/views/NetworkView.vue`
- `src/views/AppearanceView.vue`
- `操作指南-新版.md`
- Acceptance criteria / 验收标准:
- Key input pages keep explicit save actions. / 关键输入页保留显式保存动作。
- Save feedback is always visible. / 保存反馈可见且一致。
- Navigation structure remains clear and stable. / 导航结构清晰稳定。

---

## 4. Recommended Sequence / 推荐执行顺序

1. Week 1: `P0-1` + `P0-2`  
第 1 周：`P0-1` + `P0-2`
2. Week 2: `P0-3` + `P0-4`  
第 2 周：`P0-3` + `P0-4`
3. Week 3+: `P1-1` -> `P1-2` -> `P1-3`  
第 3 周起：`P1-1` -> `P1-2` -> `P1-3`

---

## 5. Progress Tracker / 进度记录

| Task ID | Owner / 负责人 | Start Date / 开始日期 | End Date / 完成日期 | Status / 状态 | Notes / 备注 |
|---|---|---|---|---|---|
| P0-1 | Codex | 2026-02-23 | 2026-02-23 | DONE | Added auto mode, reply count/style, proactive opener strategy |
| P0-2 | TBD |  |  | TODO |  |
| P0-3 | TBD |  |  | TODO |  |
| P0-4 | Codex | 2026-02-23 | 2026-02-23 | DONE | UTF-8 cleanup + doc sync completed |
| P1-1 | TBD |  |  | TODO |  |
| P1-2 | TBD |  |  | TODO |  |
| P1-3 | TBD |  |  | TODO |  |
