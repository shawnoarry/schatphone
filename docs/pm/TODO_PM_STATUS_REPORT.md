# SchatPhone PM Weekly Status / SchatPhone 项目经理周报

Updated / 更新时间: 2026-04-29

Source / 来源:

- `docs/roadmap/TODO_ROADMAP.md`
- `docs/roadmap/PROJECT_MODULE_AUDIT.md`
- `docs/README.md`

## 1. One-Page Verdict / 一页结论

项目当前不再是“能不能跑起来”的阶段，而是进入了“稳定基线之上继续扩展”的阶段。

当前判断：

- P0 收口已完成，核心壳层、Chat、Gallery、存储、通知、地图基线都已经可用。
- 当前主线进入 P1 前的 P0.5 稳定与整理期，目的是先降风险，再继续扩展沉浸功能。
- 文档已经按职能重构，任务池已经形成，当前执行看板只有一个：`docs/roadmap/TODO_ROADMAP.md`。
- 中文乱码已经补了回归守卫，后续源码里出现常见乱码会被测试拦住。
- “共享素材选择器 / 使用标识设计切片”已完成第二阶段：共享状态标识已覆盖 Gallery、Appearance、Chat、Map、Contacts。
- 已转入 P1 产品深度第一刀：WorldBook 现在能显示每条知识点被哪些角色使用、是否会进入 Chat 提示词链路。
- 下一步适合判断：继续补 WorldBook 使用状态筛选/排序，还是切到地图奖励/事件。

## 2. PM Dashboard / 项目经理仪表盘

| Area / 模块 | Status / 状态 | PM Meaning / 产品侧含义 | Next Action / 下一步 |
| --- | --- | --- | --- |
| Core shell / 手机壳层 | Green / 稳定 | 锁屏、桌面、设置、通知主体验可用。 | 保持稳定，不主动大改壳层。 |
| Chat / 聊天 | Green, but large / 可用但文件偏大 | 核心聊天、富消息、手动 AI 触发、设置入口都可用。 | 做低风险组件拆分，避免后续越改越难维护。 |
| Gallery / 相册素材中台 | Green / 可用 | 已承担全局素材中台职责，支持使用状态、删除保护、相册式体验。 | 决定是否继续抽共享缩略图选择器。 |
| Settings / 设置 | Green, but dense / 可用但偏密 | 设置、备份、诊断、推送等都集中在同一页，功能强但阅读压力高。 | 适合作为第一批拆组件目标。 |
| WorldBook + Map / 世界观与地图 | Yellow-green / 基线可用 | 世界书已开始补使用可见性；地图行程和视觉基线可用，但玩法深度还不够。 | 判断继续 WorldBook 筛选/排序，或切地图奖励/事件。 |
| Future modules / 未来模块 | Yellow / 待规划 | Phone、Calendar、Wallet、Stock、Files、More 仍偏占位或轻量 MVP。 | 等主沉浸循环更清楚后再扩展。 |
| Documentation / 文档 | Green / 已收束 | 已按 PM、路线图、流程、架构、产品决策、归档分类。 | 新任务不要再新建零散路线图。 |
| Quality guard / 质量守门 | Green / 已增强 | lint/build/test 最近已通过；新增中文乱码守门测试。 | 新功能继续保持同一检查标准。 |

## 3. What Changed Recently / 最近完成了什么

1. 文档结构重构完成。
   当前文档按职能放入 `docs/pm/`、`docs/roadmap/`、`docs/process/`、`docs/architecture/`、`docs/product-decisions/`、`docs/archive/` 等目录。

2. 过时文档已归档。
   旧任务单、旧状态报告、旧 Chat 身份专题都已标注 `Obsolete archive / 过时归档`，只保留历史查询，不再作为执行依据。

3. 任务池已经形成。
   模块候选池在 `docs/roadmap/PROJECT_MODULE_AUDIT.md`，真正执行的任务进入 `docs/roadmap/TODO_ROADMAP.md`。

4. 中文乱码防线已补上。
   新增 `tests/mojibake-guard.test.js`，用于扫描 `src` 源码中的常见乱码片段。

5. 已做一轮全局清理。
   清掉了一些未使用代码和直接依赖，修复了多个页面的中文文案乱码。

6. 共享素材状态标识第一阶段已完成。
   新增 `AssetStatusBadge.vue`，Gallery 的使用状态标签和 Appearance 的当前壁纸标签已共用同一组件。

7. 共享素材状态标识第二阶段已完成。
   Chat 素材发送面板、Map 视觉快速切换、Contacts 槽位绑定状态也已接入 `AssetStatusBadge.vue`。

8. WorldBook 使用可见性第一阶段已完成。
   每条知识点现在会显示绑定角色数、Chat 关联数、注入状态和绑定角色名单；Contacts 也补充了“可在世界书查看使用情况”的说明。

## 4. Current Active Queue / 当前执行队列

当前近期队列来自 `docs/roadmap/TODO_ROADMAP.md`，已从 P0.5 清理进入 P1 产品深度：

| Priority / 优先级 | Task / 任务 | Status / 状态 | PM Outcome / 产品侧结果 |
| --- | --- | --- | --- |
| P0.5 | 中文乱码回归守卫 | Done / 已完成 | 后续常见乱码会被测试拦住。 |
| P0.5 | 大组件拆分第一刀 | Done / 已完成 | Settings 快捷入口和内容菜单已抽成展示组件，行为不变。 |
| P0.5 | 共享素材选择器 / 使用标识设计切片 | Done phase-2 / 第二阶段已完成 | 共享状态标识已覆盖 Gallery、Appearance、Chat、Map、Contacts，降低后续多页面重复 UI。 |
| P1 | WorldBook 使用可见性第一刀 | Done phase-1 / 第一阶段已完成 | 产品经理和用户可以看懂知识点有没有被角色使用，以及是否进入 Chat 提示词链路。 |

已完成的 P0.5 切片：

- 从 `SettingsView.vue` 抽出 `SettingsMenuItem.vue`。
- 从 `SettingsView.vue` 抽出 `SettingsQuickAccessButton.vue`。
- 从 Gallery / Appearance 抽出并复用 `AssetStatusBadge.vue`。
- 将 `AssetStatusBadge.vue` 扩展到 Chat、Map、Contacts。
- 为 WorldBook 增加知识点使用状态、角色绑定数、Chat 关联数和绑定角色名单。
- Contacts 知识点绑定说明补充“可在世界书查看使用情况”。
- 这些改动只拆展示结构，不移动备份、推送、诊断、素材绑定等业务逻辑。

建议下一刀：

- 首选：给 WorldBook 增加使用状态筛选/排序，例如“未使用 / 仅角色档案 / 已进入 Chat / 已停用”。
- 备选：转入地图奖励/事件，开始补玩法深度。
- 暂不建议：直接重构 Chat 主消息流，因为风险更高。

## 5. Risks / 当前风险

| Risk / 风险 | Level / 等级 | Why It Matters / 为什么重要 | Suggested Handling / 建议处理 |
| --- | --- | --- | --- |
| 大页面继续膨胀 | Medium / 中 | Chat 和 Settings 已经承担太多职责，后续修改容易互相影响。 | 先做低风险组件拆分。 |
| 素材选择 UI 分散 | Medium / 中 | 多个模块都在选素材、显示使用状态，重复逻辑会增加体验不一致。 | 先盘点，再抽共享展示组件。 |
| 未来模块仍偏占位 | Medium / 中 | Phone、Wallet、Stock 等还不像完整手机应用。 | 暂不急扩展，等主沉浸循环更明确。 |
| 关闭页面后的自动事件生成尚未完成 | Medium / 中 | 当前真推送解决“送达”，还没有完整解决“后台自动生成事件”。 | 需要产品确认是否接受服务端复杂度。 |
| 文档再次分散 | Low / 低 | 如果继续随手新建计划文档，会重新难读。 | 新任务先进入现有目录和现有看板。 |

## 6. Product Decisions Needed Later / 后续可能需要产品确认

1. WorldBook 第二刀还是 Map 玩法？
   建议如果目标是继续降低配置理解成本，就做 WorldBook 筛选/排序；如果目标是增强可玩性，就切地图奖励/事件。

2. 外部推送默认展示模式是否继续保持“极简”？
   当前支持 `极简 / 标准 / 预览`，默认策略后续可根据体验调整。

3. 功能图标是否要支持用户上传图片？
   当前是预设图标方案，稳定但自由度有限。

4. 是否要投入“页面关闭后仍自动生成事件”？
   这会带来更多服务端编排复杂度，需要产品侧判断价值是否足够。

## 7. Reading Path / 阅读路径

产品经理只需要按这个顺序看：

1. `docs/pm/TODO_PM_STATUS_REPORT.md`：当前状态和下一步。
2. `docs/pm/PRODUCT_MANAGER_PROJECT_BRIEF.md`：项目整体方向。
3. `docs/roadmap/TODO_ROADMAP.md`：真实执行看板。
4. `docs/roadmap/PROJECT_MODULE_AUDIT.md`：模块梳理和候选任务池。
5. `docs/README.md`：不知道该看哪个文档时，从这里开始。

## 8. Latest Verification / 最近验证

最近一轮代码级验证结果：

- `npm run lint` passed.
- `npm run build` passed.
- `npm test` passed, 29 test files and 160 tests.
- `git diff --check` passed after Markdown whitespace cleanup.

本次共享素材状态标识与 WorldBook 使用可见性切片额外验证：`git diff --check` passed，`npm run lint` passed，`npm run build` passed，`npm test` passed（29 files / 160 tests）。由于沙盒限制，test/build 曾遇到 esbuild spawn EPERM，已用授权方式重跑通过。

## 9. Change Log / 变更记录

1. 2026-04-29: Rebuilt this report from a long engineering mirror into a PM-readable weekly status format.
   2026-04-29：将本报告从较长的工程镜像版重构为产品经理可读的周报格式。

2. 2026-04-29: Added explicit dashboard, active queue, risk table, and decision list.
   2026-04-29：新增仪表盘、当前队列、风险表和产品待决策列表。

3. 2026-04-29: Synced first component-extraction slice: Settings quick-access and menu display components are now extracted without behavior changes.
   2026-04-29：同步第一刀组件拆分：Settings 快捷入口与菜单展示组件已抽出，未改变业务行为。

4. 2026-04-29: Synced shared asset badge phase-1: Gallery and Appearance now reuse `AssetStatusBadge.vue`.
   2026-04-29：同步共享素材状态标识第一阶段：Gallery 与 Appearance 现共用 `AssetStatusBadge.vue`。

5. 2026-04-29: Synced shared asset badge phase-2: Chat, Map, and Contacts now also reuse `AssetStatusBadge.vue`.
   2026-04-29：同步共享素材状态标识第二阶段：Chat、Map、Contacts 也已共用 `AssetStatusBadge.vue`。

6. 2026-04-29: Synced WorldBook usage visibility phase-1: knowledge points now show role usage, Chat readiness, and bound role names.
   2026-04-29：同步 WorldBook 使用可见性第一阶段：知识点现显示角色使用情况、Chat 就绪状态与绑定角色名单。
