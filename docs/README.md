# SchatPhone Documentation Map / SchatPhone 文档地图

Updated / 更新时间: 2026-05-02

This is the single index for project documents. If two documents seem to overlap, use this file to decide which one is current.

本文是项目文档的统一入口。若两份文档看起来职责相近，以本文判断哪一份是当前有效文档。

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
6. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
   Engineering-oriented maturity map: module tiers, file-size hotspots, test-coverage signals, and recommended decomposition order.
   面向工程接手的成熟度地图：模块分层、文件体量热点、测试覆盖信号与推荐拆分顺序。
7. `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`
   Functional-code next steps: concrete maintainability and feature candidates after visual work was parked, without becoming a second live roadmap.
   功能代码推进项：视觉工作搁置后的可维护性与功能候选，不作为第二动态路线图。
8. `docs/overview/APPEARANCE_REBUILD_SCOPE.md`
   Visual rebuild reference: which appearance surfaces are technically present, which are still visually immature, and which should be treated as full rebuild targets.
   外观重建参考：哪些外观能力技术上已存在、哪些视觉仍未成熟、以及哪些界面应被视为完整重建对象。
9. `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md`
   Visual style direction brief: global and module-level references for the appearance rebuild, including iOS-like shell, KakaoTalk-style Chat, Google Maps-style Map, and iOS Photos-style Gallery.
   视觉风格方向简报：外观重建的全局与模块级参考，包括 iOS-like 壳层、KakaoTalk 风格 Chat、Google Maps 风格 Map、iOS Photos 风格 Gallery。
10. `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md`
   Deferred visual TODO archive: parked visual-rebuild suggestions for future use while current work returns to functional code.
   暂存视觉 TODO：当前阶段转回功能代码时，为后续视觉重建保留的建议清单。

## 2. Functional Categories / 按职能分类

| Category / 分类 | Folder / 目录 | Purpose / 用途 |
| --- | --- | --- |
| PM status and product overview / PM 状态与产品总览 | `docs/pm/` | PM weekly status, project brief, product decisions that need attention. / 给产品经理看的周报、总览与待确认事项。 |
| Roadmap and task pool / 路线图与任务池 | `docs/roadmap/` | Live execution board plus candidate module pool. / 动态执行看板与候选模块池。 |
| Project overview / 项目总说明 | `docs/overview/` | Cross-role master guide plus engineering, functional-code, and visual handoff references, including rebuild scope and style direction. / 面向产品与工程的总说明，以及工程、功能代码与视觉接手参考，包括重建范围与风格方向。 |
| Process and workflow / 流程规范 | `docs/process/` | AI collaboration rules, operation guide, validation flow. / AI 协作规则、操作指引与验收流程。 |
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
