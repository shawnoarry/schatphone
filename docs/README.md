# SchatPhone Documentation Map / SchatPhone 文档地图

Updated / 更新时间: 2026-05-13

This is the single index for project documents. If two documents seem to overlap, use this file to decide which one is current.

本文是项目文档的统一入口。若两个文档看起来职能相似，以本文判断哪个是当前有效文档。

## 1. Current Reading Order / 当前阅读顺序

1. `docs/pm/TODO_PM_STATUS_REPORT.md`  
   PM weekly status: one-page verdict, dashboard, active queue, risks, and product decisions.  
   产品经理周报：一页结论、仪表盘、当前队列、风险与产品待决策点。

2. `docs/pm/PRODUCT_MANAGER_PROJECT_BRIEF.md`  
   Product overview: project direction, delivered scope, and PM-level priorities.  
   产品总览：项目方向、已交付范围、产品侧优先级。

3. `docs/roadmap/TODO_ROADMAP.md`  
   The only live execution board. Any active task with status must be here.  
   唯一动态执行看板。任何带状态的执行任务都必须在这里。

4. `docs/roadmap/PROJECT_MODULE_AUDIT.md`  
   Module maturity audit and candidate task pool. It is not a second roadmap.  
   模块成熟度梳理与候选任务池。它不是第二路线图。

5. `docs/overview/PROJECT_MASTER_GUIDE.md`  
   Full project guide for product context, architecture context, and AI engineer handoff.  
   项目总说明，用于理解产品全貌、架构背景与 AI 工程师接手。

## 2. Functional Categories / 按职能分类

| Category / 分类 | Folder / 目录 | Purpose / 用途 |
| --- | --- | --- |
| PM status and product overview / PM 状态与产品总览 | `docs/pm/` | PM weekly status, project brief, product decisions that need attention. / 给产品经理看的周报、总览与待确认事项。 |
| Roadmap and task pool / 路线图与任务池 | `docs/roadmap/` | Live execution board plus candidate module pool. / 动态执行看板与候选模块池。 |
| Project overview / 项目总说明 | `docs/overview/` | Cross-role master guide. / 面向产品与工程的总说明。 |
| Process and workflow / 流程规范 | `docs/process/` | AI collaboration rules, operation guide, validation flow. / AI 协作规则、操作指南与验收流程。 |
| Architecture contracts / 架构契约 | `docs/architecture/` | Architecture boundaries and cross-module contracts. / 架构边界与跨模块契约。 |
| Product decisions / 产品决策 | `docs/product-decisions/` | Topic-level decisions that are current but not active task boards. / 当前有效的专题决策，不作为任务看板。 |
| Strategy / 长期策略 | `docs/strategy/` | Long-range product/technical direction. / 长线产品与技术方向。 |
| Templates / 模板 | `docs/templates/` | Reusable requirement, audit, and prompt templates. / 可复用需求、审查与 AI 协作模板。 |
| Archive / 归档 | `docs/archive/` | Historical or obsolete docs only. / 仅用于历史查询或过时归档。 |

## 3. Archive Rule / 归档规则

- If a document is current, it must belong to one of the functional folders above.
- If a document is superseded, move it to `docs/archive/` and add an `Obsolete archive / 过时归档` note.
- Archived docs must not be used as active roadmaps, status reports, or implementation sources.
- Historical links inside archived docs may point to old locations; always return to this index before acting.

## 4. Current Obsolete Archives / 当前过时归档

- `docs/archive/2026-04-19-doc-audit/`  
  Superseded planning/status docs from the earlier documentation audit.

- `docs/archive/obsolete/2026-04-29-chat-identity/`  
  Closed Chat identity refactor notes and session templates. This track has no active mandatory task.

## 5. Current Process Docs

- `docs/process/AI_WORK_MODE.md`: AI collaboration and documentation governance.
- `docs/process/OPERATION_GUIDE.md`: implementation and validation operation guide.
- `docs/process/VISUAL_WORKFLOW.md`: visual-design-only workflow, skill setup, reference-library setup, and cross-PC reuse notes.

## 6. Current Design Docs

- `docs/design/DESIGN.md`: visual ownership model for native system surfaces, installed app surfaces, hybrid surfaces, entry-context ownership, and future world-theme extension.
- `docs/design/DEFAULT_SYSTEM_STYLE.md`: current default native-system visual style, defined as a soft iOS-like personal OS baseline.
- `docs/design/VISUAL_ENTRY_OWNERSHIP_MAP.md`: current route, entry, and cross-module visual ownership map.

Important visual rule:

- SchatPhone visual ownership is decided by the user's actual entry and parent context before code ownership or data ownership. If a surface appears inside an installed app, preserve that app's immersion unless the user explicitly navigated to a system-owned full page.
