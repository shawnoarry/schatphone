# SchatPhone PM Weekly Status / SchatPhone 项目经理周报

Updated / 更新时间: 2026-04-30

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
- WorldBook 使用管理第二刀已完成：知识点现在支持按使用状态筛选，并可按最近更新、使用状态、绑定角色数、标题排序。
- WorldBook 搜索/标签筛选已完成：知识点现在支持关键字搜索和标签 chips，可与既有使用状态筛选和排序共同工作。
- WorldBook 已有知识点编辑流已完成：用户现在可以直接打开旧知识点、修改标题/内容/标签并原位保存。
- WorldBook 已开始在 Calendar 内被消费：日历提醒卡片和已确认事件卡片现在会展示相关知识点，世界书不再只服务于 Chat。
- Chat 的 WorldBook 绑定验收层已补齐：线程菜单现在能直接看见当前生效的世界观和知识点，且已有端到端测试验证 prompt 注入结果。
- 地图奖励/事件第一刀已完成：完成行程会产生探索点数和轻量事件摘要，取消行程不奖励。
- 地图路线熟悉度第二刀已完成：已完成行程会自动聚合为常走路线等级，显示完成次数、探索点和下一等级提示。
- 地图区域解锁第一刀已完成：探索点、常走路线和稳定路线会自动派生区域解锁进度。
- 地图区域反馈第一刀已完成：已解锁区域会自动生成地点反馈，展示参考路线、探索点和最近触发时间。
- 日历地图提醒第一刀已完成：Calendar 现在能展示由地图区域反馈派生出来的建议提醒。
- 日历提醒确认/固定切片已完成：建议提醒现在可以确认、固定或忽略，用户选择会随本地存储/备份保留。
- 日历事件存储第一刀已完成：已确认地图提醒现在会进入独立 Calendar 事件存储，并纳入备份/导入。
- 日历事件时间编辑已完成：Calendar event 的提醒时间可手动调整、快速后移或恢复建议时间。
- 日历事件定时推送接入已完成：已确认 Calendar event 会通过现有推送中继安排真实定时推送。
- 日历事件推送重排/取消守卫已完成：改时间会重排旧推送，忽略地图提醒会取消对应推送，避免旧提醒误送达。
- 日历推送状态可见性第一阶段已完成：Calendar 会显示真实推送是否就绪、单个事件是否已排程、最近排程/取消记录，以及 AI 安静时段说明。
- 下一步适合推进：把 WorldBook 的关联消费继续扩展到 Map，或补从 Calendar 直达 WorldBook 的深链筛选。

## 2. PM Dashboard / 项目经理仪表盘

| Area / 模块 | Status / 状态 | PM Meaning / 产品侧含义 | Next Action / 下一步 |
| --- | --- | --- | --- |
| Core shell / 手机壳层 | Green / 稳定 | 锁屏、桌面、设置、通知主体验可用。 | 保持稳定，不主动大改壳层。 |
| Chat / 聊天 | Green, but large / 可用但文件偏大 | 核心聊天、富消息、手动 AI 触发、设置入口都可用。 | 做低风险组件拆分，避免后续越改越难维护。 |
| Gallery / 相册素材中台 | Green / 可用 | 已承担全局素材中台职责，支持使用状态、删除保护、相册式体验。 | 决定是否继续抽共享缩略图选择器。 |
| Settings / 设置 | Green, but dense / 可用但偏密 | 设置、备份、诊断、推送等都集中在同一页，功能强但阅读压力高。 | 适合作为第一批拆组件目标。 |
| WorldBook + Map / 世界观与地图 | Yellow-green / 基线可用 | 世界书已具备使用可见性、基础管理筛选、搜索/标签筛选、已有知识点编辑流，并已开始在 Calendar 中展示相关知识点；地图已开始补探索奖励、事件反馈、路线熟悉度、区域解锁、区域反馈和可确认日历提醒线索。 | 优先把 WorldBook 的消费链路继续扩到 Map，或补 Calendar -> WorldBook 的直达筛选。 |
| Future modules / 未来模块 | Yellow / 待规划 | Phone、Wallet、Stock、Files、More 仍偏占位或轻量 MVP；Calendar 已有 Map 提醒消费链路、用户确认状态、事件存储、时间编辑、真实定时推送和推送状态可见性。 | 等主沉浸循环更清楚后再扩展其他模块。 |
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

9. WorldBook 使用管理第二阶段已完成。
   知识点现在可按“全部 / 已进入 Chat / 仅角色档案 / 未使用 / 已停用”筛选，并支持最近更新、使用状态、绑定角色数、标题排序。
10. WorldBook 搜索/标签筛选已完成。
    知识点现在支持关键字搜索和标签 chips，并能和既有使用状态筛选、排序一起使用。
11. WorldBook 已有知识点编辑流已完成。
   用户现在可以直接打开旧知识点、修改标题/内容/标签并原位保存。
12. WorldBook 已开始在 Calendar 中被消费。
   日历提醒卡片和已确认事件卡片现在会展示相关知识点，世界书第一次开始跨模块被读取。
13. Chat 的 WorldBook 绑定验收层已补齐。
   线程菜单现在可直接查看当前生效的全局世界观与知识点，且已有端到端测试验证 prompt 注入结果。
14. 地图奖励/事件第一阶段已完成。
    完成行程会写入探索点数和事件摘要；行程记录会展示总探索进度和单次奖励，取消行程不会奖励。
14. 地图路线熟悉度第二阶段已完成。
    已完成行程会自动聚合成路线熟悉度等级；地图页会展示常走路线、完成次数、探索点、平均距离和下一等级提示。
15. 地图区域解锁第一阶段已完成。
    已完成行程、探索点、熟悉路线和稳定路线会自动派生区域解锁进度；地图页会展示区域卡片、解锁数量、剩余条件和进度条。
16. 地图区域反馈第一阶段已完成。
    已解锁区域会自动生成轻量地点反馈；地图页会展示反馈标题、区域、最近触发时间、探索点和参考路线。
17. 日历地图提醒第一阶段已完成。
    Calendar 现在会读取地图区域反馈，展示建议型提醒卡片、建议时间、来源和返回地图入口。
18. 日历提醒确认/固定切片已完成。
    建议型提醒现在可以确认、固定或忽略；确认/固定/忽略状态会随地图 store 的本地存储和备份路径保留，但仍不创建真实推送。
19. 日历事件存储第一阶段已完成。
    已确认的地图提醒现在会写入独立 Calendar 事件存储；日历事件已纳入本地持久化、备份导出/导入和存储诊断。
20. 日历事件时间编辑已完成。
    用户可以在 Calendar 事件卡片中手动修改提醒时间，或快速后移 1 小时/1 天，也可以恢复系统建议时间。

21. 日历事件定时推送接入已完成。
    已确认 Calendar 事件现在会在同步后通过现有推送中继安排真实定时推送，卡片上会显示已安排或排程失败。
22. 日历事件推送重排/取消守卫已完成。
    用户调整事件时间时会重排推送；忽略或移除地图派生提醒时会取消旧推送，减少旧时间误触发风险。
23. 日历推送状态可见性第一阶段已完成。
    Calendar 现在会显示真实推送准备状态、事件排程状态、最近排程/取消记录，并说明 AI 安静时段不会暂停已安排的 Calendar 推送。

## 4. Current Active Queue / 当前执行队列

当前近期队列来自 `docs/roadmap/TODO_ROADMAP.md`，已从 P0.5 清理进入 P1 产品深度：

| Priority / 优先级 | Task / 任务 | Status / 状态 | PM Outcome / 产品侧结果 |
| --- | --- | --- | --- |
| P0.5 | 中文乱码回归守卫 | Done / 已完成 | 后续常见乱码会被测试拦住。 |
| P0.5 | 大组件拆分第一刀 | Done / 已完成 | Settings 快捷入口和内容菜单已抽成展示组件，行为不变。 |
| P0.5 | 共享素材选择器 / 使用标识设计切片 | Done phase-2 / 第二阶段已完成 | 共享状态标识已覆盖 Gallery、Appearance、Chat、Map、Contacts，降低后续多页面重复 UI。 |
| P1 | WorldBook 使用可见性第一刀 | Done phase-1 / 第一阶段已完成 | 产品经理和用户可以看懂知识点有没有被角色使用，以及是否进入 Chat 提示词链路。 |
| P1 | WorldBook 使用管理第二刀 | Done phase-2 / 第二阶段已完成 | 用户可以筛选和排序知识点，快速找到未使用、已停用或已进入 Chat 的条目。 |
| P1 | WorldBook 搜索/标签筛选 | Done / 已完成 | 用户可以按关键字和标签收窄知识点列表，知识点量变大后仍然能快速定位。 |
| P1 | WorldBook 已有知识点编辑流 | Done / 已完成 | 用户可以直接维护已有知识点，不必删除后重建，世界书开始具备持续管理闭环。 |
| P1 | WorldBook -> Calendar 关联知识点可见性 | Done / 已完成 | Calendar 提醒和事件卡片现在会展示相关知识点，世界书开始真正进入跨模块消费。 |
| P1 | Chat WorldBook 绑定验收层 | Done / 已完成 | Chat 线程菜单现在可见当前生效的世界观与知识点，并已有端到端测试验证 prompt 注入。 |
| P1 | Map 奖励/事件第一刀 | Done phase-1 / 第一阶段已完成 | 完成行程有可见探索奖励和事件反馈，地图开始从工具走向玩法。 |
| P1 | Map 路线熟悉度第二刀 | Done phase-2 / 第二阶段已完成 | 已完成行程会形成常走路线等级，用户可以看到路线进度和下一等级目标。 |
| P1 | Map 区域解锁第一刀 | Done phase-1 / 第一阶段已完成 | 用户可以看到探索行为正在打开哪些区域，地图玩法有了更清晰的成长层。 |
| P1 | Map 区域反馈第一刀 | Done phase-1 / 第一阶段已完成 | 解锁区域开始给出地点反馈，地图成长层开始转化为可读反馈。 |
| P1 | Calendar 地图提醒第一刀 | Done phase-1 / 第一阶段已完成 | 日历开始消费地图区域反馈，形成第一条跨模块提醒线索。 |
| P1 | Calendar 提醒确认/固定 | Done / 已完成 | 建议提醒已能被用户确认、固定或忽略，具备接入日历事件/推送前的用户意图状态。 |
| P1 | Calendar 事件存储第一刀 | Done phase-1 / 第一阶段已完成 | 已确认提醒现在会成为真正的 Calendar 事件，具备接入定时推送前的业务承载层。 |
| P1 | Calendar 事件时间编辑 | Done / 已完成 | 日历事件提醒时间可由用户调整，后续真实推送可直接读取用户确认后的时间。 |
| P1 | Calendar 事件定时推送接入 | Done / 已完成 | 已确认日历事件会通过现有推送中继安排真实推送，形成“建议提醒 -> 日历事件 -> 推送”的闭环。 |
| P1 | Calendar 事件推送重排/取消守卫 | Done / 已完成 | 改时间会重排旧推送；忽略地图提醒会取消对应日历事件推送，避免旧提醒残留。 |
| P1 | Calendar 推送状态可见性 | Done phase-1 / 第一阶段已完成 | 用户和 PM 可以看到真实推送是否就绪、事件是否已排程、最近排程/取消记录，以及 AI 安静时段说明。 |

已完成的 P0.5 切片：

- 从 `SettingsView.vue` 抽出 `SettingsMenuItem.vue`。
- 从 `SettingsView.vue` 抽出 `SettingsQuickAccessButton.vue`。
- 从 Gallery / Appearance 抽出并复用 `AssetStatusBadge.vue`。
- 将 `AssetStatusBadge.vue` 扩展到 Chat、Map、Contacts。
- 为 WorldBook 增加知识点使用状态、角色绑定数、Chat 关联数和绑定角色名单。
- Contacts 知识点绑定说明补充“可在世界书查看使用情况”。
- 为 WorldBook 增加知识点使用状态筛选和排序。
- 为 WorldBook 增加关键字搜索和标签筛选，并保持它们与现有使用状态筛选、排序共同工作。
- 为 WorldBook 增加已有知识点编辑流，支持原位打开、修改并保存标题/内容/标签。
- 让 Calendar 只读消费 WorldBook：地图提醒卡片和已确认事件卡片现在会展示相关知识点。
- 为 Chat 增加 WorldBook 绑定可见性与端到端验收：线程菜单可见当前注入上下文，测试会直接校验 system prompt。
- 为 Map 完成行程增加探索点数、轻量事件摘要和行程记录展示。
- 为 Map 增加路线熟悉度聚合、等级标识和下一等级提示。
- 为 Map 增加区域解锁进度，基于探索点、熟悉路线和稳定路线自动派生。
- 为 Map 增加区域反馈条目，基于已解锁区域、路线熟悉度和行程历史自动派生。
- 为 Calendar 增加地图派生提醒展示，先作为建议型提醒，不写入真实日程存储。
- 为 Calendar 建议提醒增加确认、固定和忽略操作，并把用户选择写入地图 store 的持久化/备份路径。
- 为 Calendar 新增独立事件存储，已确认地图提醒会转成 Calendar event，并进入备份/导入。
- 为 Calendar event 增加提醒时间编辑、快速后移和恢复建议时间。
- 为 Calendar event 接入真实定时推送，复用现有 push relay，不从 Map 建议态直接推送。
- 为 Calendar event 增加推送重排/取消守卫，覆盖改时间、恢复时间、忽略/移除提醒。
- 为 Calendar event 增加本地排程记录和状态展示，便于判断“已排程 / 未就绪 / 待重排 / 排程异常”。
- 这些改动只拆展示结构，不移动备份、推送、诊断、素材绑定等业务逻辑。

建议下一刀：

- 首选：继续把 WorldBook 的关联消费扩到 Map，或补 Calendar -> WorldBook 的直达筛选。
- 备选：先暂停做一次本地整理，避免未提交变更继续累积。
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

1. Calendar 是否需要服务端送达回执？
   Calendar 已有本地排程记录和状态可见性，但这不是服务端“已送达”证明；如果产品需要真实送达历史，需要 push relay 先提供回执或查询接口。

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
- `npm test` passed, 33 test files and 171 tests.
- `git diff --check` passed after Markdown whitespace cleanup.

本次 Chat / WorldBook 绑定验收切片额外验证：`npm test -- tests/chat-worldbook-binding-visibility.test.js tests/chat-role-knowledge-binding.test.js tests/system-world-kernel.test.js` passed（3 files / 8 tests），`npm run lint` passed，`npm test` passed（33 files / 171 tests），`npm run build` passed。由于沙盒限制，test/build 曾遇到 esbuild spawn EPERM，已用授权方式重跑通过。

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

7. 2026-04-29: Synced WorldBook usage management phase-2: knowledge points now support usage-state filtering and sorting.
   2026-04-29：同步 WorldBook 使用管理第二阶段：知识点现支持使用状态筛选与排序。

8. 2026-04-29: Synced Map rewards/events phase-1: completed trips now show exploration points and event summaries.
   2026-04-29：同步 Map 奖励/事件第一阶段：完成行程现展示探索点数与事件摘要。

9. 2026-04-29: Synced Map route familiarity phase-2: completed trips now aggregate into route tiers with next-tier hints.
   2026-04-29：同步 Map 路线熟悉度第二阶段：完成行程现聚合为路线等级，并展示下一等级提示。

10. 2026-04-29: Synced Map area unlocks phase-1: exploration points and familiar routes now derive visible area unlock progress.
    2026-04-29：同步 Map 区域解锁第一阶段：探索点与熟悉路线现派生为可见区域解锁进度。

11. 2026-04-29: Synced Map area feedback phase-1: unlocked areas now derive lightweight location feedback with route cues.
    2026-04-29：同步 Map 区域反馈第一阶段：已解锁区域现派生带参考路线的轻量地点反馈。

12. 2026-04-29: Synced Calendar map-reminder phase-1: Calendar now displays suggested reminders derived from Map area feedback.
    2026-04-29：同步 Calendar 地图提醒第一阶段：日历现展示由地图区域反馈派生的建议型提醒。
13. 2026-04-29: Synced Calendar reminder confirmation/pinning: suggested reminders can now be confirmed, pinned, or dismissed with persisted user choice.
    2026-04-29：同步 Calendar 提醒确认/固定：建议提醒现在可确认、固定或忽略，并保留用户选择。
14. 2026-04-29: Synced Calendar event store phase-1: confirmed Map reminders now become Calendar events with backup/import coverage.
    2026-04-29：同步 Calendar 事件存储第一阶段：已确认地图提醒现在会转成日历事件，并纳入备份/导入。
15. 2026-04-29: Synced Calendar event time editing: event reminder times can be adjusted, quick-shifted, reset, and preserved across Map refreshes.
    2026-04-29：同步 Calendar 事件时间编辑：事件提醒时间可调整、快速后移、恢复，并能跨地图刷新保留。
16. 2026-04-29: Synced Calendar event scheduled push handoff: confirmed Calendar events now schedule real push through the existing push relay.
    2026-04-29：同步 Calendar 事件定时推送接入：已确认日历事件现在会通过现有推送中继安排真实定时推送。
17. 2026-04-29: Synced Calendar event push reschedule/cancel guard: time edits reschedule old push jobs and dismissed Map reminders cancel their Calendar event push.
    2026-04-29：同步 Calendar 事件推送重排/取消守卫：改时间会重排旧推送任务，忽略地图提醒会取消对应日历事件推送。
18. 2026-04-29: Synced Calendar push status visibility: Calendar now shows push readiness, event schedule status, recent local schedule logs, and AI quiet-hours notes.
    2026-04-29：同步 Calendar 推送状态可见性：Calendar 现在展示推送就绪状态、事件排程状态、最近本地排程记录和 AI 安静时段说明。
19. 2026-04-30: Synced WorldBook search/tag filtering: knowledge points now support keyword search and tag chips on top of the existing usage-state filters and sorting.
   2026-04-30：同步 WorldBook 搜索/标签筛选：知识点现在支持关键字搜索和标签 chips，并可叠加既有使用状态筛选与排序。
20. 2026-04-30: Synced WorldBook edit flow: existing knowledge points can now be opened, edited in place, and saved without delete-and-recreate.
   2026-04-30：同步 WorldBook 编辑流：已有知识点现在可直接打开、原位编辑并保存，不必先删除再重建。
21. 2026-04-30: Synced WorldBook Calendar consumption phase-1: Calendar reminder cards and confirmed event cards now surface related knowledge points from WorldBook.
   2026-04-30：同步 WorldBook 在 Calendar 内的第一阶段消费：日历提醒卡片和已确认事件卡片现在会展示相关知识点。
22. 2026-04-30: Synced Chat WorldBook binding verification: thread menu now shows the active worldview/knowledge-point context, and an end-to-end test now verifies prompt injection.
   2026-04-30：同步 Chat 的 WorldBook 绑定验收：线程菜单现在会展示当前生效的世界观/知识点上下文，且已有端到端测试验证 prompt 注入。
