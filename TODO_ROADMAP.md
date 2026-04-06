# SchatPhone TODO Roadmap / SchatPhone 动态待办清单

Updated / 更新时间: 2026-04-06

## 1. Purpose / 用途

This is the live execution board for next implementation steps.  
这是项目后续实现的动态执行清单。

Use this file to decide "what to build next".  
后续“先做什么”以本文件为准。

---

## 2. Update Rules / 维护规则

1. Any status change must update this file in the same commit batch.  
任何任务状态变化都要在同一批提交中更新本文件。
2. If priority conflicts appear, follow `PRODUCT_MANAGER_PRIORITY_PLAN.md` and sync here immediately.  
如出现优先级冲突，以 `PRODUCT_MANAGER_PRIORITY_PLAN.md` 为准并立即同步到这里。
3. Keep each task readable for non-coding product owners.  
任务描述要保证非技术产品也能读懂。

---

## 3. Status Legend / 状态说明

- `TODO`: not started / 未开始  
- `IN_PROGRESS`: currently active / 进行中  
- `PARTIAL_DONE`: core baseline landed, still needs closure / 基线已落地，仍需收口  
- `DONE`: accepted and closed / 已验收关闭  
- `ON_HOLD`: intentionally deferred / 主动搁置

---

## 4. Current P0 Priorities / 当前 P0 优先级主线

### P0-1 AI Single-Message Semantic Revision / AI 单条语义修订

Status / 状态: `TODO`

Goal / 目标:
1. Let user revise one assistant message without full reroll.  
允许用户修订单条助手消息，而不是整轮重roll。
2. Revised text becomes default context for later turns.  
修订文本进入后续轮次上下文。
3. Non-text media can stay unchanged unless user requests regeneration.  
非文本媒体默认不重生成，除非用户主动要求。

Acceptance / 验收:
1. Assistant message can be edited directly in chat UI.  
助手消息可直接编辑。
2. Revised content is used in next AI call context.  
下一轮 AI 调用使用修订内容。
3. Rollback-to-original is available.  
可恢复原文。

---

### P0-2 Chat Top-Level Bottom Dock / Chat 一级页底部功能位

Status / 状态: `TODO`

Goal / 目标:
1. Add at least 3 fixed bottom buttons on chat list page.  
在聊天列表一级页增加至少 3 个底部固定按钮。
2. Keep conversation entry behavior unchanged.  
不影响原会话入口主交互。
3. Connect each button to stable placeholder routes first.  
首期接入稳定占位路由。

Acceptance / 验收:
1. Buttons are always visible on `/chat` top-level view.  
在 `/chat` 一级视图始终可见。
2. Each button route is functional.  
每个按钮都有可用跳转。
3. No regression in opening chat threads.  
进入会话流程无回归。

---

### P0-3 Avatar Hierarchy B / 头像层级 B（会话 > 模块 > 全局 > 兜底）

Status / 状态: `PARTIAL_DONE`

Current progress / 当前进展:
1. Shared resolver landed (`thread > module > global > fallback`).  
统一解析器已落地（会话 > 模块 > 全局 > 兜底）。
2. Module-level overrides available in `/chat-feature/identity`.  
模块级覆写已在 `/chat-feature/identity` 可配。
3. Thread-level self/contact overrides available in thread menu.  
会话级自己/对方覆写已在会话菜单可配。

Remaining closure / 剩余收口:
1. Cross-module reuse (forum/map future modules) still pending.  
跨模块复用（论坛/地图等）仍待接线。
2. UX validation for edge cases (missing avatar/fallback consistency).  
边界体验验收（缺头像时兜底一致性）。

---

### P0-4 User Rich Message Lane Hardening / 用户富消息链路加固

Status / 状态: `IN_PROGRESS` (mapped from execution id `P0-C2`)

Current progress / 当前进展:
1. `+` panel send lane landed (image/gif/link/location/transfer/voice-card).  
`+` 面板发送链路已落地（图片/gif/链接/位置/转账/语音卡片）。
2. Link/transfer/voice-card switched to inline forms.  
链接/转账/语音卡片已改为内联表单。
3. `Trigger Reply` remains separate persistent AI invoke lane.  
`Trigger Reply` 继续保持独立常驻 AI 调用通道。

Remaining closure / 剩余收口:
1. Validation polish and failure-state UX consistency.  
校验细节与失败态体验统一。
2. Editing behavior alignment with P0-1 semantic revision model.  
与 P0-1 语义修订模型对齐编辑逻辑。

---

### P0-5 Gallery Global Asset Center v1 / 相册全局素材中心 v1

Status / 状态: `TODO`

Goal / 目标:
1. One-time global import (`png/jpg/webp/gif` + URL).  
支持一次导入全局复用（`png/jpg/webp/gif` + URL）。
2. Asset categories: wallpaper/emoji/reference/scenario.  
素材分类：壁纸/表情/参考图/场景图。
3. Safe dedupe and deletion flow.  
安全去重与删除机制。

---

### P0-6 Role Binding and Asset Reuse / 角色绑定与素材复用

Status / 状态: `TODO`

Goal / 目标:
1. Bind global asset packs to role profiles in `/contacts`.  
在 `/contacts` 角色档案绑定素材包。
2. Allow chat and later modules to consume bound packs with optional thread overrides.  
允许 chat 及后续模块读取绑定素材包，并支持会话级覆写。

---

### P0-7 Storage and Backup Hardening (Asset Binary Focus) / 存储与备份加固（素材二进制重点）

Status / 状态: `PARTIAL_DONE`

Already done / 已完成:
1. Layered persistence preparation and mirror diagnostics are landed.  
分层存储准备与镜像诊断已落地。
2. Backup/restore rollback-safe baseline is available.  
备份恢复回滚基线已可用。

Remaining / 剩余:
1. Asset binary should move to IndexedDB-first path (avoid heavy localStorage binary writes).  
素材二进制要切到 IndexedDB 主路径（避免 localStorage 承担大体积二进制）。
2. Export strategy for metadata-first and optional asset package.  
导出策略要明确“元数据优先 + 素材包可选”。

---

## 5. P1 Backlog (After P0 Stabilizes) / P1 后续队列（P0 稳定后）

1. AI image-reference pipeline (provider capability dependent).  
AI 图生图参考链路（依赖供应商能力）。
2. Scenario cards (pseudo video call/offline date/mini scenes) expansion.  
场景卡片扩展（伪视频通话/线下约会/小剧场）。
3. Cross-module role identity reuse (forum/map/future social modules).  
跨模块角色身份复用（论坛/地图/后续社交模块）。

---

## 6. Recently Completed Milestones / 近期完成里程碑

1. Chat message action entry migrated to long-press + bottom action sheet (`P0-C1`).  
Chat 消息操作入口已迁移为长按 + 底部动作面板（`P0-C1`）。
2. Avatar hierarchy baseline phase-1 landed (`thread > module > global > fallback`).  
头像层级基线第一阶段已落地（会话 > 模块 > 全局 > 兜底）。
3. Storage layering preparation (`P1-4`) completed.  
分层存储准备（`P1-4`）已完成。
4. Structured block hardening (`P1-2`) completed batch-1/2/3.  
结构化消息加固（`P1-2`）三批已完成。
5. Settings UX refinement (`P1-3`) completed batch-1/2/3.  
设置体验优化（`P1-3`）三批已完成。

---

## 7. Known Risks to Watch / 需要持续关注的风险

1. Documentation drift when old and new task IDs are mixed.  
历史任务编号与新优先级混用导致文档漂移。
2. Cross-module consistency risk as avatar/asset systems expand beyond chat.  
头像/素材机制扩展到多模块后的一致性风险。
3. Storage growth risk when rich assets are imported heavily before IndexedDB closure.  
在 IndexedDB 收口前大量导入富素材造成存储膨胀风险。

---

## 8. Change Log / 变更记录

1. 2026-04-06: created as consolidated live TODO board for product + AI engineer collaboration.  
2026-04-06：创建为面向产品经理与 AI 工程师协作的动态待办主清单。
