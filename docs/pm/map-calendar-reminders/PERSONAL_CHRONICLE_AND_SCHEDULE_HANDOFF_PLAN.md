# Personal Chronicle And Schedule Handoff Plan / 生活志与日程交接规划

Updated: 2026-08-30

Status: `REFERENCE_DIRECTION_FULFILLED_BY_EVT-CHRONICLE-1_2026-08-30 / NOT_A_LIVE_ROADMAP`

Implementation note: the approved core direction is now realized by `store:chronicle` schema V1, `/chronicle`, complete-backup V7 support, and a finite deterministic projection over verified owner records. The rest of this document remains the design record that led to the implementation; later AI recall, automatic diary generation, domain consequences, public projection, and CJA-6C are still unapproved.

## 1. 文档目的

本文件回答四个产品问题：

1. 当前多个带有“日程、今天、行程”能力的 App 应如何分工；
2. `工作台 / Work Hub` 与一个面向个人生活连续性的产品应如何区分；
3. 邮件、组织工作、日历、执行、地图、账本、置物、关系与日记如何组成可追溯链路；
4. 后续应按什么顺序实现，才能减少重复功能，同时保留沉浸式体验。

本文件不是第二份 roadmap，不批准任何运行时实现，也不改变现有 package 状态。正式优先级仍只由 `docs/roadmap/TODO_ROADMAP.md` 管理。

## 2. 执行结论

“个人工作台”方向可行，但不应再创建一个拥有日历、任务和行程编辑能力的通用工作台。项目更需要的是一个暂称 `生活志 / Chronicle` 的个人连续性产品：它聚合“今天发生了什么、这些变化从哪里来、我如何记录和回看”，而不重新拥有上游事实。

核心链路应统一为：

```text
来源提出
Mail / Work Hub / Healthcare / Tickets / Travel / Career / 其他领域 App
  -> 用户审阅并确认
Calendar：唯一的长期时间承诺
  -> 隐式编排
Schedule Orchestrator：将临近承诺物化为执行请求
  -> 当日执行
Agenda Journey：步骤、完成、错过、跳过、取消
  -> 过程证据
Map Journey / Activity Session：移动、到达、时长与活动证据
  -> 领域后果
Wallet / Assets / Relationship / 来源领域 Owner：各自确认并保存变化
  -> 个人记忆
Diary / Narrative Timeline：可追溯投影 + 用户主动书写
```

产品原则是“一份事实、多个视角”。允许在 Today、Calendar、Agenda Journey 和生活志中重复展示同一条事实，但不允许它们各自保存一份可以独立编辑的日程。

## 3. 当前问题与根因

### 3.1 用户为什么会觉得 App 太多

- Calendar 有 `日程 / Agenda` 视图，而另一个独立 App 叫 `行程 / Agenda Journey`；
- Map 也使用 Journey/行程描述路线，容易与生活安排混淆；
- Work Hub 已有 Today、任务、call sheet 和排班提案，视觉上接近另一套日程系统；
- 多个来源 App 可以出现预约、面试、演出、旅行等时间信息，但目前缺少一致的确认与回返体验；
- 自动产生的事实、完成证据、关系记忆和用户写的日记还没有一个可见的个人连续性入口。

根因不是“展示重复”，而是来源、计划、执行、后果和记忆之间的状态与所有权没有在界面上被稳定表达。

### 3.2 当前日记与记忆处于什么状态

- CJA-6A 只定义了只读 `Narrative Timeline` 与受限 AI 上下文接口；目前没有 Timeline Store、可见路由、备份节点或独立 App；
- CJA-6B 的持久化、路由、备份和可见产品仍需单独立项；
- Contacts/Relationship 可以保存与角色有关的来源事实，但它不是个人全天候日记；
- 各领域 Owner 分别保存交易、物品、路线、日程等事实，当前不存在一份把所有事实复制到“记忆库”的合理依据；
- 归档的 `墨记` HTML 是有价值的日记交互参考，但主要是静态原型，不代表数据契约或现有功能已经落地。

因此，当前答案不是“记忆已经完整储存在某一个 App”，而是：事实仍在各自 Owner 中；跨域叙事层只有文档契约，尚未形成可见、可持久化的个人记忆产品。

## 4. 产品词汇与唯一所有者

| 概念 | 用户理解 | 唯一事实所有者 | 其他 App 可以做什么 | 不能做什么 |
| --- | --- | --- | --- | --- |
| 组织提案 | 公司、学校或团队希望我参加的安排 | Work Hub 或对应组织 Owner | 提交到 Calendar 审阅；显示接受/拒绝/变更状态 | 直接成为已确认 Calendar 事件 |
| 时间承诺 | 我已经确认的日期、时间、地点 | Calendar | 被来源、Today、Agenda Journey、生活志投影 | 在多个 App 中分别编辑 |
| 当日执行计划 | 今天或近期要按步骤做的事 | Agenda Journey | 引用 Calendar、Map、Activity Session 证据 | 成为第二个长期日历 |
| 路线/前往 | 从当前位置去某地点 | Map Journey | 返回到达/取消等证据 | 代表整个活动已经完成 |
| 专注活动 | 某步骤实际进行的计时与完成证据 | Activity Session | 向 Agenda Journey 返回受限结果 | 改写 Calendar 或 Map 真相 |
| 交易/账本 | 金额、支付、退款、余额变化 | Wallet 或领域 Owner | 向生活志提供确认后的摘要投影 | 由生活志直接造账或改账 |
| 置物/资产 | 物品取得、持有、移除与来源 | Assets 或领域 Owner | 向生活志提供确认后的变化投影 | 由日记文字自动新增资产 |
| 关系事实 | 与某角色相关、可审核的共同经历 | Relationship/Contacts | 引用来源事件和证据 | 把用户主观日记自动当作客观关系事实 |
| 自动记忆 | 已确认事实的只读、来源可追溯投影 | 各来源 Owner；Timeline 只做索引/投影 | 汇总、筛选、回到来源 | 复制并取得来源事实所有权 |
| 日记条目 | 用户主动写下的文字、心情、标签和媒体 | Future Diary Owner | 可主动关联已确认事实 | 悄悄改写事实或默认提供给 AI |

## 5. Work Hub 与生活志的边界

### 5.1 Work Hub：组织工作空间

Work Hub 应保留现有四个一级区域：`Today`、`Channels`、`Work`、`Org`。

它负责：

- 组织发来的任务、排班提案、call sheet、审批和状态报告；
- 团队频道、成员上下文和组织凭证；
- “组织希望发生什么”以及该请求当前处于待处理、已接受、已拒绝或已变更的状态；
- 跳转到 Calendar、Agenda Journey、Map 等 Owner，并在返回后显示只读结果。

它不应新增：

- 周/月日历编辑器；
- 一套独立的通用个人待办；
- 路线或到达状态编辑器；
- Wallet、Assets、Relationship 的编辑表单；
- 个人日记或个人生活统计。

Work Hub 的 `Today` 是“今天与该组织有关的工作视图”，不是用户全天生活总览。它可以显示 call sheet、组织任务、待确认提案和已确认 Calendar 引用，但每一项都必须标明类型和来源。

### 5.2 生活志：个人连续性与回顾

`生活志 / Chronicle` 是暂定工作名，用于避免第二个“工作台”造成语义冲突。最终命名和图标仍需单独产品评审。

它负责：

- 以个人视角汇总今天的确认安排、执行进度与已发生变化；
- 将来源事实组织成一条可追溯的 Narrative Timeline；
- 保存用户主动创作的日记条目、心情、标签、媒体引用和编辑历史；
- 提供按日、主题、人物和来源回顾的入口；
- 在明确授权和受限范围内，为 AI 回忆提供上下文。

它不负责：

- 创建或编辑 Calendar 的长期时间事实；
- 接受组织提案、完成组织任务或发送团队消息；
- 启动/修改 Map 路线；
- 直接记账、修改资产或改变关系事实；
- 把系统事件自动写成第一人称日记；
- 把所有个人数据默认暴露给 AI。

### 5.3 什么可以重复，什么不能重复

允许重复的是只读摘要、状态投影和稳定跳转。例如，演出可以同时出现在 Work Hub Today、Calendar、Agenda Journey 和生活志中，但它们显示的是同一条来源链。

禁止重复的是可编辑事实和生命周期。例如，时间只能在 Calendar 修改；组织提案只能回到 Work Hub 处理；路线只能由 Map 管理；日记正文只能由 Diary Owner 编辑。

## 6. 统一 Schedule Handoff

项目应建立一个共享的 `Schedule Handoff` 协议，使 Mail、Work Hub、Healthcare、Tickets、Travel、Career 等来源通过相同方式请求 Calendar 确认。

### 6.1 当前 Calendar 接入现状

当前 Calendar 并非只能手动录入，但各来源的接入方式尚未统一：

| 来源 | 当前行为 | 是否创建 Calendar 事件 | 当前缺口 |
| --- | --- | --- | --- |
| Calendar 内新建 | 用户完整填写标题、时间、地点等字段 | 是 | 适合主动创建，不适合重复抄写来源信息 |
| Map reminder | 专用提醒经过确认后转为事件 | 是 | 使用 Map 专用路径，不是通用 handoff |
| Phone missed-call cue | 未接来电建议经过确认后转为回拨事件 | 是 | 使用 Phone/Reminders 专用路径 |
| Stock market cue | 股票变化建议经过确认后转为复盘事件 | 是 | 使用 Stock/Reminders 专用路径 |
| Shopping delivery cue | 配送跟进建议经过确认后转为事件 | 是 | 使用 Shopping/Reminders 专用路径 |
| Mail 预约 | `添加到日历` 携带 `source=mail` 跳到 Calendar；Calendar 明确显示尚未创建并可返回 Mail | 否 | 没有预填、幂等创建或稳定双向引用 |
| Work Hub 提案 | 接受后明确保存“尚未创建日程”；`去日历确认` 携带 proposal ID 跳到 Calendar 并可返回 Work Hub | 否 | 没有把提案标题、时间、地点带入审阅页 |

因此问题不是“Calendar 完全没有确认机制”，而是“已有机制按来源分别实现，Mail 和 Work Hub 等正式安排仍要求用户重新手填”。这些专用 cue 不应被误称为已经存在的通用 `Schedule Handoff`。

对于 Work Hub，当前 `接受提案`、`去日历确认` 和 `查看行程` 都不能证明记录已经生成：接受只保存 Work Hub 的本地决定，后两个按钮只进行带 proposal/preview/reference ID 的路由跳转。Calendar 会明确显示来源与“尚未创建日程”，但仍不预填或写入。符合物化条件的 Calendar 事件进入近期窗口后，现有 Schedule Orchestrator 才会将其交给 Agenda Journey；Work Hub 不应越过 Calendar 直接创建行程。

### 6.2 最小交接数据

交接请求至少包含：

| 字段 | 作用 |
| --- | --- |
| `sourceOwner` | 来源 Owner，例如 `mail`、`workplace` |
| `sourceRecordId` | 稳定来源记录 ID |
| `sourceRevision` | 判断来源后续是否发生变化 |
| `proposedTitleZh` / `proposedTitleEn` | 有界双语建议标题，不是 Calendar 已确认标题；至少一项有效 |
| `proposedStartsAt` / `proposedEndsAt` | 建议时间范围 |
| `proposedLocationRef` | 可选的稳定 Map place ID；不可复制路线状态 |
| `participantRefs` | 可选的稳定联系人引用 |
| `sourceReturnContext` | 查看来源详情的稳定回返上下文 |
| `proposalStatus` | 待审阅、已确认、来源已变更、来源已取消等状态 |

Calendar 创建成功后，来源只保存 `calendarEventId` 和确认时的 `sourceRevision`。Calendar 可以保留反向 `sourceRef`，但双方都不复制对方完整记录。

`ScheduleHandoffDraftV1` 已冻结为纯 normalizer：只接受 `mail`、`workplace`、`healthcare`、`tickets`、`travel`、`career` 六个来源 Owner；`sourceReturnContext.path` 必须回到对应 Owner 的固定内部路由，query 只保留有界标量；地点引用若存在，必须是完整的 `owner: map + mapPackId + placeId`；参与者只保留去重后的有界 `contacts + recordId` 引用。相同 `sourceOwner + sourceRecordId` 生成同一 `idempotencyKey`，`revisionFingerprint` 则随 `sourceRevision` 变化。纯冲突解析器进一步规定：没有既有 Calendar 引用时进入首次审阅；同来源同 revision 复用既有 `calendarEventId`；revision 变化进入 `source_changed` 审阅并保留既有事件引用；取消与身份错配均阻断新建。normalizer 和冲突解析器都不读取或写入 Store，也不创建或修改 Calendar event。

### 6.3 用户交互

1. 来源页面显示 `添加到日历`，并明确这是待确认建议；
2. 用户进入 Calendar 的预填审阅页，核对标题、日期、时间、地点、提醒和参与要求；
3. 只有用户确认后，Calendar 才创建 canonical event；
4. 成功后，来源 CTA 改为 `在日历中查看`，Calendar 详情提供 `查看来源`；
5. 重复点击必须定位同一事件，不能重复创建；
6. 来源内容变化时，旧 Calendar 事件不被静默覆盖，而是显示 `来源有更新，待审阅`；
7. 来源取消时，Calendar 保留可审查状态，由用户确认取消、保留或解除关联；已经发生的执行历史不可被删除重写。

### 6.4 Mail 示例

当前 Mail 预约入口已完成第一条持久化幂等链路：Mail 只传稳定记录 ID，Calendar 通过受控来源 resolver 取得并规范化标题、起止时间与现有 Map 地点引用，再打开统一事件编辑器。进入、关闭、取消和返回均不写入；只有 Calendar 中明确保存才创建事件及其受限 `sourceRef`。重载或重复进入会定位同一事件，Mail 据此只读派生 `在日历中查看`，Calendar 详情可回到具体来源邮件。尚未完成的是来源 revision/cancellation 的用户审阅动作和 Work Hub 调用方。

当前已落地的部分与后续链路为：

```text
预约邮件详情
  -> 添加到日历
  -> Calendar 预填审阅
  -> 用户确认
  -> Calendar 创建事件并保存受限来源引用
  -> 邮件详情显示“在日历中查看”
```

未创建前不能写 `在日历中查看`，也不能仅凭进入 Calendar 就把邮件标成已安排。

### 6.5 Work Hub 示例

```text
组织发出排班提案
  -> 用户在 Work Hub 接受“提案”
  -> 提案保持来源所有、状态为待日历确认
  -> Calendar 预填审阅
  -> 用户确认后创建时间承诺
  -> Work Hub 显示已关联 Calendar
  -> 临近时由 Schedule Orchestrator 物化到 Agenda Journey
```

“接受组织提案”和“确认个人 Calendar 承诺”应是两个明确步骤。未来如果产品决定提供一步式确认，也必须在同一次用户动作中清楚展示 Calendar 将被写入，不能让组织侧静默代写。

## 7. 从计划到后果再到记忆

### 7.1 执行链

- Calendar 保存确认时间、持续时间、地点引用和提醒策略；
- Schedule Orchestrator 只负责幂等地生成临近执行请求；
- Agenda Journey 将一次活动拆成移动和活动等步骤；
- Map Journey 返回出发、到达或取消证据；
- Activity Session 返回持续时间或用户确认等活动证据；
- Agenda Journey 独立判断完成、错过、跳过或取消，Map 到达不能自动代表活动完成。

### 7.2 后果链

活动完成后，各 Owner 独立确认自己的后果：

- Wallet 保存真实交易或账本变化；
- Assets 保存真实取得、赠送、使用或移除；
- Relationship 保存经过规则和用户审核的关系事实；
- 来源领域保存预约结果、工作报告、票务状态或医疗记录等领域事实。

Agenda Journey 或生活志只能引用这些后果。不能因为行程显示“完成”，就推断消费已经发生、物品已经取得或关系已经改变。

### 7.3 记忆链

Narrative Timeline 应保存轻量索引或即时构建只读投影，至少能回答：

- 这件事来自哪个 Owner 和哪条记录；
- 计划何时确认，执行结果是什么；
- 有哪些经过确认的后果；
- 用户是否为这一天或这件事写过日记；
- 当前来源是否仍然存在、已被修订或已撤销。

Timeline 不应复制完整邮件、完整聊天、完整账单或完整人物档案。来源不可用时应 fail closed，显示“来源不可用/已移除”，不能用过期快照冒充当前真相。

## 8. 日记产品模型

### 8.1 两类记录必须分开

| 类型 | 产生方式 | 可编辑性 | 例子 |
| --- | --- | --- | --- |
| 自动事实投影 | Owner 已确认事实后生成或即时查询 | 只读；回来源修改 | 参加活动、到达地点、完成任务、发生交易、获得物品 |
| 用户日记条目 | 用户主动新建、编辑和删除 | 由 Diary Owner 管理 | 心情、感受、私人文字、标签、照片引用 |

系统可以建议“为今天写点什么”，也可以让用户主动把一个来源事实附到日记中，但不能自动代写并保存成用户口吻的正文。

### 8.2 可复用的 `墨记` 原型要素

可以复用为后续设计输入：

- 今日心情选择；
- 克制的写作提示；
- 最近日记；
- 专注的正文编辑器；
- 以写作连续性和心情为主的日记日历；
- 个人写作统计。

需要明确改造：

- 日记日历只能查看写作、心情和当日记忆，不提供日程 CRUD；
- 最近条目应区分用户正文与自动事实摘要；
- 媒体只保存 Gallery 等 Owner 的稳定引用，不复制媒体文件；
- 删除日记不删除来源事实，删除来源事实也应以明确的断链状态处理日记引用；
- 原型中的静态页面切换与本地演示状态不能直接成为生产持久化方案。

### 8.3 AI 回忆边界

AI 读取日记或 Narrative Timeline 必须满足：

- 用户显式开启，并能按来源类别关闭；
- 限定当前 world/persona，不能跨世界串联；
- 每次请求有明确日期范围、条目上限和 token 上限；
- 默认优先摘要与稳定引用，不发送完整账单、邮件、聊天或媒体；
- 私密/锁定条目默认排除；
- 缺失或已撤销来源不能被模型补全成事实；
- 用户可以查看本次使用了哪些记忆，并从来源或日记 Owner 修正它们。

## 9. 信息架构层级

| 层级 | 用户问题 | 推荐界面 | 写入边界 |
| --- | --- | --- | --- |
| L0 今日概览 | 我今天需要关注什么、发生了什么 | Work Hub Today（组织范围）或生活志 Today（个人范围） | 只做少量明确动作，其余跳 Owner |
| L1 某天/某来源详情 | 这件事为什么出现、现在是什么状态 | 日期详情、来源卡、Timeline 节点 | 日记可写；事实只读 |
| L2 Owner 管理 | 我要真正修改什么 | Calendar、Work Hub、Wallet、Assets、Relationship 等 | 只由 Owner 写入 |
| L3 执行/创作 | 我现在要前往、完成或写下它 | Agenda Journey、Map、Activity Session、日记编辑器 | 各自写入自己的执行或正文事实 |

生活志首页不应是满屏统计卡，也不应同时塞入月历、任务板、账本和资产管理。优先结构应是“今天的线索、待写/已写、确认变化、最近回顾”，深入操作再进入 Owner。

## 10. 术语清理

建议在进入实现前完成一次全项目文案审计：

| 当前容易混淆的词 | 建议用法 |
| --- | --- |
| Work Hub `Today` | `今日工作` 或保持 Today，但副标题明确组织范围 |
| Calendar `Agenda` | `日程列表`，表达它只是 Calendar 的视图 |
| Agenda Journey | 中文产品名可继续为 `行程`，但说明是“今日执行”；也可在命名评审中改为 `今日安排` |
| Map Journey | 用户文案优先 `路线`、`前往中`、`到达`，少用泛化的“行程” |
| Schedule proposal | `排班提案` 或 `安排提案`，未写入 Calendar 前不得称“已确认日程” |
| Narrative Timeline | 面向用户可称 `生活轨迹` 或 `记忆时间线`，避免暴露架构名 |
| Diary calendar | `日记日历` 或 `心情日历`，不使用与 Calendar 相同的事件编辑语言 |

命名不能单独解决所有问题。每张跨 App 卡片还应显示来源、状态和主动作，例如 `来自 Work Hub · 待确认`、`Calendar 已确认 · 09:00`、`Agenda Journey · 进行中`。

## 11. 分阶段推进

### 已完成顺序与原始前置小任务

本文件提出的顺序已经完成：生产 Work Hub organization owner/authority、普通无事件工作闭环、首条世界观中立 Work Hub 原生事件、revision-safe Calendar -> Agenda Journey -> Map/Activity 执行证据，以及 `生活志 / Chronicle` 均已落地。Chronicle 首次出现即可回看真实 Owner 链，而不是空壳或伪造摘要。

Messages/SMS 仍不是 Chronicle 前置条件；只有出现不能由 Notification Center、Mail、Chat 服务号或 Phone 承担的号码/短码场景时才单独晋升。Chronicle 完成也不自动授权 AI 回忆、自动日记、领域后果或下一条事件线。

建议先完成以下小切片，每项都可以独立验收和回滚。前六项已于 2026-08-25 落地，第七项于 2026-08-26 落地；前四项不创建 Calendar 事件，第五至第七项只有在用户明确确认后才创建并关联：

| 顺序 | 状态 | 小任务 | 难度 | 价值与验收 |
| --- | --- | --- | --- | --- |
| 1 | `DONE 2026-08-25` | 修正 Work Hub 与 Mail 的 Calendar CTA 文案 | 低 | 未创建前统一使用 `去日历确认` 或 `添加到日历`；创建成功后才显示 `在日历中查看` |
| 2 | `DONE 2026-08-25` | Calendar 识别来源跳转并显示只读落地提示 | 低 | `source=mail/workplace` 到达时明确“尚未创建日程”，并提供稳定返回来源的动作；不写 Store |
| 3 | `DONE 2026-08-25` | 定义纯函数 `ScheduleHandoffDraftV1` normalizer | 低至中 | 验证 owner、record ID、revision、双语建议标题、时间范围、Map/Contacts 稳定引用和有界 return context；非法输入 fail closed，未知来源正文不进入输出 |
| 4 | `DONE 2026-08-25` | 增加 handoff 幂等键与冲突规则单元测试 | 低至中 | 同来源同 revision 复用既有 `calendarEventId`；revision 变化进入 `source_changed` 审阅；取消、身份错配与伪造引用 fail closed，不产生第二份事件或静默覆盖 |
| 5 | `DONE 2026-08-25` | Calendar 编辑器支持从 handoff draft 预填 | 中 | Mail 稳定记录 ID 解析后打开统一编辑器，预填标题、时间与现有 Map 地点；关闭、取消、无效 ID 或返回均不产生事件，点击确认才写入 |
| 6 | `DONE 2026-08-25` | 持久化来源引用并复用同一 Calendar 事件 | 中 | Calendar V4 保存有界 `sourceRef`；同来源同 revision 跨重载复用，Mail CTA 与 Calendar 来源回返稳定；revision 变化阻断重复创建且不静默覆盖 |
| 7 | `DONE 2026-08-26` | Work Hub 作为第二个结构化调用方复用 handoff | 中 | 只有已接受的稳定提案可预填；取消零写入，Calendar 明确保存后才关联；刷新后 Work Hub 显示同一事件且可双向回返 |

这些任务中，1 和 2 只澄清现有行为；3 和 4 建立共享契约但不改变产品事实；5 和 6 形成了可重载、不会重复创建的 Mail 用户闭环；7 证明 Work Hub 可以作为第二个调用方复用同一协议而不绕过 Calendar。完整 Phase 1 仍需补齐来源更新/取消的用户审阅动作。

第一个完整纵向样板使用 Mail，因为 Mail 已有稳定消息来源和较窄的预约语义。Work Hub 已作为第二个调用方复用相同 handoff，但它仍是 S1 fixture/local-preview，并非生产 organization owner；这条接入不扩大其来源权威，也没有另写 Calendar 接入逻辑。

### Phase 0：术语与重复功能清点

目标：在写新功能前明确现有每一个“今天、日程、行程、任务、回忆”入口。

工作：

- 建立路由、组件、Store、持久化 Owner 和用户文案清单；
- 标记每个界面是 owner editor、projection、handoff 还是 execution；
- 找出重复 CRUD、无来源卡片、断裂回返和混淆文案；
- 产出最终产品词汇表与 owner matrix 的接受记录。

验收：任何日程类界面都能明确说出来源 Owner、事实 Owner、当前状态和下一步 Owner。

### Phase 1：Schedule Handoff 基础

目标：先打通一个可复用的来源到 Calendar 的确认协议。

工作：

- 定义版本化 handoff schema、稳定 ID、revision 与 return context；
- Calendar 增加预填审阅和幂等创建；
- 定义来源更新、取消、断链和冲突处理；
- 先以 Mail 做纵向样板，并覆盖创建前后 CTA 状态。

验收：同一邮件重复进入不会创建两个事件；来源变更不会静默改日历；邮件与 Calendar 可以双向回返。

### Phase 2：Work Hub 收敛

目标：让 Work Hub 成为强组织产品，而不是通用计划工具。

工作：

- 保留 Today、Channels、Work、Org；
- 明确 task、call sheet、schedule proposal、calendar commitment 四种视觉和状态；
- 接入共享 Schedule Handoff；
- 用只读引用替代重复的周/月日历、通用待办、地图和账本设想；
- 处理 proposal 接受后、Calendar 尚未确认的中间态。

验收：Work Hub 可以完成组织工作闭环，但无法绕过 Calendar 写入时间承诺，也不拥有个人生活数据。

### Phase 3：Diary Owner 与持久化契约

目标：先让用户真正能写、能找回、能备份，再扩展自动记忆。

工作：

- 定义日记 schema、稳定条目 ID、创建/编辑时间、日期、心情、标签和媒体引用；
- 定义独立 persistence owner、迁移、备份/恢复、删除和断链规则；
- 建立 Today、日期详情、最近条目和专注编辑器；
- 将 `墨记` 原型作为视觉输入进行重新设计与真实交互实现。

验收：日记可新增、编辑、删除、跨重启保留并通过备份恢复；日记操作不会改 Calendar 或来源事实。

### Phase 4：Narrative Timeline 投影

目标：把已确认事实变成有来源的个人回顾，而不是数据副本。

工作：

- 在 CJA-6A 契约基础上接受 CJA-6B 的独立实现切片；
- 先接 Calendar、Agenda Journey、Map/Activity Session；
- 每个节点显示来源、时间、状态、断链与稳定回返；
- 将 Timeline 节点与用户日记保持独立但允许显式关联。

验收：用户能从一天的回顾跳回原始事实；删除或修改来源后，Timeline 正确更新或显示断链，不保留伪造真相。

### Phase 5：领域后果接入

目标：在基础链稳定后，逐个接入账本、置物和关系等变化。

工作：

- 每个领域单独定义只读 projection adapter；
- 只接入 Owner 已确认的变化；
- 为敏感数据提供类别级显示和 AI 权限；
- 禁止由 Agenda Journey 完成状态推断领域后果。

验收：每项变化能回到唯一 Owner；生活志无法编辑或伪造金额、资产与关系事实。

### Phase 6：受限 AI 回忆

目标：在用户已经拥有可见、可修正的记忆层之后，再允许 AI 读取。

工作：

- 实现 world/date/source/entry/token 边界；
- 提供授权、撤销、来源审计和敏感条目排除；
- 建立无来源、来源失效和跨世界隔离测试。

验收：用户可以理解并控制本次调用使用的记忆范围；关闭权限后不再提供相关上下文。

## 12. 验证策略

每个阶段按变化类型执行验证，而不是一次性建设全部链路。

| 变化 | 最小验证 |
| --- | --- |
| 仅产品/架构文档 | `git diff --check`、`npm.cmd run governance:check` |
| schema、adapter、Store 或共享逻辑 | lint、单元测试、全量测试、production build |
| Mail/Work Hub -> Calendar 用户链 | 定向集成测试 + Playwright 桌面/移动端 |
| 日记编辑与备份 | schema migration、reopen、export/import、删除/断链测试 |
| Timeline 与领域投影 | owner 不变性、stable ID、来源撤销、fail-closed 测试 |
| AI 回忆 | 权限矩阵、范围上限、跨 world 隔离、来源审计测试 |

用户可见链路的端到端用例至少覆盖：

1. Mail 预约 -> Calendar 确认 -> Agenda Journey -> 完成 -> 当日回顾；
2. Work Hub 提案 -> 接受 -> Calendar 审阅 -> 来源更新 -> 用户决定；
3. Calendar 删除/变更 -> Agenda Journey 与 Timeline 的保留或审阅状态；
4. Map 到达但活动未完成，不能产生完成与领域后果；
5. 日记关联事实后删除日记，不影响事实；来源移除后日记保留正文并显示引用失效；
6. Wallet/Assets/Relationship 未确认变化时，生活志不显示确定性结果。

## 13. 风险与控制

| 风险 | 控制方式 |
| --- | --- |
| 新产品变成第二个超级 App | 只读聚合 + Owner 深链；禁止跨域 CRUD |
| Work Hub 与生活志都叫工作台 | 生活产品使用独立名称和个人叙事语言 |
| 接受提案后悄悄写 Calendar | 始终提供明确 Calendar 审阅或明确的一步写入确认 |
| 来源更新覆盖用户修改 | revision 比对，进入 review state，不静默覆盖 |
| 自动事实冒充用户日记 | 分离 schema、UI 和编辑权限 |
| 完成一次活动就推断消费/关系变化 | 后果必须由领域 Owner 确认 |
| Timeline 复制全量敏感数据 | 保存稳定引用和受限摘要，按需读取来源 |
| AI 读取范围无限扩大 | 显式授权、world/date/source/entry/token 上限 |
| 原型直接移植带来重复导航 | 只提取经过 owner matrix 审核的视觉和交互要素 |
| 旧记录没有稳定来源 | 迁移时标为 legacy/unlinked，不猜测关联 |

## 14. 非目标

本计划当前不做：

- 合并 Calendar、Agenda Journey 与 Map；
- 创建通用任务系统替换所有领域任务；
- 让 Work Hub 读取全部个人日记、账本或关系数据；
- 让日记成为第二份 Calendar；
- 自动从自然语言生成未经确认的交易、资产或关系事实；
- 默认把全部 Timeline 和日记提供给 AI；
- 直接将两个归档 HTML 复制成生产路由；
- 在本文件中批准名称、图标、roadmap 优先级或 CJA-6B 实现。

## 15. 与现有材料的关系

本计划受以下现有边界约束：

- `docs/pm/map-calendar-reminders/PRODUCT_BOUNDARY.md`：Calendar、Agenda Journey、Map、Reminders 的唯一所有权；
- `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`：Schedule Orchestrator、执行证据与 CJA-6A Narrative Timeline；
- `docs/pm/event-runtime-and-world-hub/README.md`：Work Hub 当前 S1 能力与非生产 Owner 边界；
- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`：Work Hub 当前 UI/IA 状态；
- `docs/design/prototypes/2026-08-25-workbench-and-diary/README.md`：两个用户原型的归档说明和可复用要素。

原型文件只作为设计证据：

- `kpop-schedule-workbench.html` 可支持 Work Hub Today、状态、优先级、冲突提示、备注和附件方向；
- `diary-daybook.html` 可支持心情、写作提示、最近条目、编辑器、心情日历与个人统计方向；
- K-pop 原型中的周/月日历、通用 todo 和 dashboard 不应整体复制到 Work Hub；
- 两个原型均不建立 SchatPhone 的 Owner、持久化、备份、导航或跨 App 合同。

## 16. 已完成顺序与后续停止线

产品侧已接受并实现：`Work Hub = 组织工作`、`生活志 = 个人连续性`、Calendar 是确认后的长期时间 owner，Mail 与 Work Hub 复用同一 Schedule Handoff。完成顺序为：

1. Work Hub 建立可信 organization membership/credential owner；
2. Work Hub 完成不依赖 Event Runtime 的普通组织工作闭环；
3. 首条 Work Hub 原生机构改期事件完成并产生可追溯 owner facts；
4. `EVT-CHRONICLE-1` 确认并实现 Chronicle 名称、Diary Owner、首版有限只读投影、留存、断链、迁移与 backup 合同；
5. AI 回忆、自动日记、自由文本事实提取、领域后果、公开投影与 CJA-6C 继续分别过门，不随 Chronicle 自动获批。

## 17. Roadmap And Status Impact

`PLANNING_SEQUENCE_ALIGNED 2026-08-26 / EVT-WORK-1_THROUGH_4_AND_EVT-CHRONICLE-1_DONE 2026-08-30`。

Roadmap 4.12/4.14/4.16 now records the completed Work Hub-first sequence and Chronicle implementation. Tasks 1-7 remain the original Mail/Work Hub handoff baseline; production Work Hub, its ordinary loop and first event, Diary Owner, Chronicle UI, and CJA-6B are now implemented in their owning packages. Generic source update/cancellation review, complete Schedule Handoff Phase 1, Messages/SMS, AI recall, automatic diary generation, domain consequences, and CJA-6C remain unimplemented.
