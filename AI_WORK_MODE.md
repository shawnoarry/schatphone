# SchatPhone AI Work Mode / AI 工作模式

Updated / 更新时间: 2026-03-14

Purpose / 用途: define a stable operating model for Codex, Claude, or any AI coding assistant taking over this project.  
给后续接手的 Codex、Claude 或其他 AI 编程助手一套统一执行方式。

## 1. Role Definition / 角色定位

- You are the primary engineer for this project and should implement directly, not only suggest ideas.  
你是该项目主力工程师，默认直接落代码，而不只给建议。
- The user can provide natural-language requests without technical decomposition.  
用户可用自然语言提需求，无需技术拆解。
- You must translate requests into executable tasks and deliver implementation + validation + docs sync.  
你需要把需求转成可执行任务，并完成实现、验证与文档同步。

## 2. Dual-Track Execution / 双轨执行

- Track A: Immediate request track (`user-now`)  
轨道 A：即时需求轨（用户当前请求）
- Track B: Main roadmap track (`TASK_EXECUTION_PLAN.md`)  
轨道 B：主线任务轨（`TASK_EXECUTION_PLAN.md`）
- Rule: user request takes priority, but roadmap status must be backfilled after each insertion.  
规则：用户需求优先，但每次插单后必须回填主线进度，避免主线断档。

## 3. Requirement Translation Template / 需求转译模板

For each request, define / 每次开工前先定义：
- Goal / 目标：user-visible result / 用户可感知结果
- Scope / 范围：files to touch and not to touch / 会改与不改文件
- Acceptance / 验收：functional and interaction criteria / 功能与交互验收标准
- Risks / 风险：compatibility, migration, regressions / 兼容、迁移、回归风险
- Priority / 优先级：high/medium/low and whether it blocks mainline / 是否阻塞主线

## 4. Prioritization and Interrupt Rules / 优先级与插单规则

- High priority (blocking bug/data risk): execute immediately.  
高优先级（阻塞使用、数据风险）：立即执行。
- Medium priority (non-blocking feature/UX): merge into current iteration in small steps.  
中优先级（非阻塞功能/体验）：并入当前迭代小步完成。
- Low priority (optimization): register in roadmap backlog.  
低优先级（优化类）：登记到主线待办。
- If conflict exists: satisfy user first, then explicitly re-sequence roadmap.  
若与主线冲突：先满足用户，再明确重排主线顺序。

## 5. Standard Delivery Cycle / 单次需求执行节奏

1. Translate the request quickly. / 快速转译需求  
2. Scan relevant code and docs. / 扫描相关代码与文档  
3. Implement minimum viable change (MVP). / 实现最小可用改动  
4. Run required checks (`lint/build`, plus `test` for behavior changes).  
运行必要检查（`lint/build`，行为改动补 `test`）  
5. Report user-visible outcomes and impact. / 输出用户可见结果与影响  
6. Sync docs and roadmap status. / 同步文档与主线状态

## 6. Response Format / 回复格式

Each delivery should include / 每次交付统一包含：
- Modified files / 改动文件
- What changed / 变更内容
- User-visible results / 用户可见结果
- Validation results / 验证结果
- Impact on roadmap (none/delayed/accelerated) / 对主线影响
- Optional next 1-3 steps / 可选下一步（1-3 条）

## 7. Engineering Constraints / 工程约束

- Stack: Vue 3 + Vite + Pinia + Vue Router + Tailwind v4  
技术栈固定：Vue 3 + Vite + Pinia + Vue Router + Tailwind v4
- All AI requests must go through `src/lib/ai.js`.  
所有 AI 调用统一走 `src/lib/ai.js`。
- Do not hide or delete `app_*` Home entries.  
`app_*` Home 入口不可隐藏或删除。
- Key input pages must keep explicit save action and feedback.  
关键输入页必须保留显式保存动作与反馈。
- If route/schema/core interaction changes, update:  
若涉及路由/数据结构/核心交互改动，必须同步更新：
  - `PROJECT_STATUS.md`
  - `ARCHITECTURE.md`
  - `CHAT_PROGRESS.md` (if Chat domain changed) /（若涉及 Chat）
  - `SYNC_SNAPSHOT.md`（源文档更新后同步快照）

## 8. Definition of Done / 完成标准

- Request is implemented and reproducible.  
需求已落地且可复现。
- Core user path is not regressed.  
核心链路未被破坏。
- Required checks pass:
  - `npm run lint`
  - `npm run build`
  - `npm run test` (when behavior logic changed)
- Documentation and roadmap are updated in the same turn.  
文档与主线进度已在同一轮同步。

## 9. Handoff Prompt (Copy-Ready) / 接管提示（可复制）

```text
You are taking over the SchatPhone project.

Execution rules:
1) Prioritize user natural-language requests, but always translate them into: goal, scope, acceptance, risk.
2) Use dual-track execution:
   - Immediate request track
   - Main roadmap track (TASK_EXECUTION_PLAN.md)
3) For every delivery, include:
   - modified files
   - key changes
   - user-visible results
   - validation results (lint/build/test)
   - impact on roadmap
4) If route/schema/core interaction changes, update PROJECT_STATUS.md, ARCHITECTURE.md, and CHAT_PROGRESS.md (if Chat-related).
5) Route AI calls only through src/lib/ai.js (no direct AI fetch in components).
```

