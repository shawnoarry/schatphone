# Next Event Production Plan After The Shell Portfolio / 壳子基座完成后的下一事件生产规划

Updated: 2026-08-24

Status: `PLANNING_ONLY / NEXT_SLICE_REQUIRES_SEPARATE_ACCEPTANCE`

## 1. Decision

下一条事件生产线建议选择：

`职业机会确认 -> 机构临时改期 -> 用户处理 -> Calendar / Agenda Journey / Map 执行`

第一个产品案例使用 K-pop 默认世界中的“试镜或录制邀约临时改期”，但底层合同必须同时适用于普通职位面试、课程面谈、客户会议和校园活动。

这不是一串预先播放的剧情代码。事件只协调一次性原因、等待、超时和来源；用户必须在对应 App 中真实阅读、接受、提出替代时间或拒绝，后续 owner 才能产生结果。

## 2. Why This Is The Next Safe Event

- 用户已经可以在 `NEXT / 机会` 中理解职位、试镜与邀约，但当前 S1 只保存本机申请草稿；
- `Work Hub` 已经有组织、成员、频道、任务和日程提案的 S1 形态；
- Mail、系统通知中心、Calendar、Agenda Journey、Map 和 Phone 已有可复用入口；
- 这个案例能验证“事件在不同原生媒介中呈现”，不需要 Event Home 或突然弹出的统一卡片；
- 改期有明确的 owner 事实和数值条件，避免依赖模型从自由对话中猜测事件是否完成。

## 3. Required Foundation Before The Event

### 3.1 Career Opportunity Owner S2

建立正式的职业机会 owner，至少拥有：

- `Opportunity`：职位、试镜、邀约或面谈的 canonical record；
- `OrganizationRef`：稳定机构引用和发起权限；
- `EligibilityPolicy`：公开、申请制、邀请制三类准入；
- `Application`：用户明确提交后的正式申请记录；
- `Invitation`：由有权限机构创建的受邀凭证；
- `AppointmentProposal`：候选时间、地点、时区、期限和 revision；
- `DecisionReceipt`：接受、替代时间或拒绝的 owner receipt；
- stale、撤回、过期、重复提交和恢复语义；
- schema migration、backup/restore、写失败回滚和 stable-ID dedupe。

S1 的 `LOCAL DRAFT` 不能自动升级为申请、邀约或机构事实。升级必须经过用户明确提交和 owner 成功 receipt。

### 3.2 Organization Authority

- Work Hub 的本机 affiliation 文本不能授予机构发起权限；
- 只有未来 organization membership/credential owner 能让某机构账号创建邀请或改期；
- 艺人、经纪人、助理、普通职员和学生使用同一权限模型，不按 UI 文案猜身份；
- 无凭证、过期凭证、跨世界或 revision 不匹配时 fail closed。

### 3.3 Calendar And Journey Handoff

- Career owner 只提交时间/地点提案；
- 用户接受后，Calendar owner 才创建或修改 canonical event；
- Agenda Journey 只从已确认 Calendar occurrence materialize 执行计划；
- Map 只负责地点、路线、出发、到达和 place session，不根据坐标推断参加、迟到或完成；
- 用户拒绝或未响应时不得创建 Calendar、Agenda Journey 或 Map Journey。

## 4. First Event Family

Event family ID candidate:

`career.appointment_schedule_change.v1`

### 4.1 Trigger

必须同时满足：

1. 存在 owner-confirmed `Invitation` 或已接受的 `Application`；
2. 存在一个尚未结束的 confirmed appointment；
3. 发起机构凭证有效；
4. Event Runtime 通过 cooldown、cap、world/revision 和 one-time gate；
5. owner 提交明确的 schedule-change request，而不是 Runtime 自己改时间。

### 4.2 Native Presentation

事件不注册新 Event Surface，也不显示统一事件卡。

- 系统通知中心：显示“机构更新了时间”，点击回到 `NEXT` 对应机会；
- NEXT：在机会详情内显示原时间、新时间、地点、期限和操作；
- Mail：可选投影同一机构正式通知的稳定引用，不复制第二份 appointment；
- Work Hub：仅当用户与该机构存在正式 membership 时显示组织侧提案；
- Calendar：只在接受成功后显示新安排；
- Agenda Journey / Map：只在 Calendar owner 确认后参与执行。

### 4.3 User Choices

固定三种 owner action：

1. `Accept new time / 接受新时间`
2. `Propose another time / 提出替代时间`
3. `Decline / 拒绝`

没有“保持不变”这种模糊选择。原预约是否仍有效必须由 request 明确说明：

- `replacement_required`：原时间已撤销，用户不处理则预约进入未确认/过期；
- `optional_alternative`：原时间仍有效，用户不处理则维持原安排；
- `organization_cancelled`：原安排已取消，只能接受新时间、提出替代或结束。

### 4.4 No-Response And Timeout

- Runtime 可记录 deadline 和等待状态，但不能替用户作决定；
- deadline 到期后由 Career owner 生成 `expired` receipt；
- Calendar 是否保留原记录由 request 的 replacement policy 决定；
- “没有点击”不能被解释为接受、拒绝、迟到或爽约；
- 超时结果可以通过 NEXT 状态与系统通知呈现，不创建惩罚性关系值变化。

## 5. AI Boundary

首个事件不需要 AI 才能成立。

- 固定机构通知、时间、地点、期限、操作和结果全部使用结构化 owner 数据；
- AI 后续只能为机构说明、用户替代时间说明或通话内容生成候选文本；
- AI 不能决定受邀资格、机构权限、用户选择、Calendar 写入或事件完成；
- 如果未来 Phone 参与，通话摘要只能提出结构化 resolution proposal，仍需 Career owner 验证并落 receipt。

## 6. Delivery Slices

### EVT-NEXT-1 — Career owner foundation

- schema、Store、repository、migration、backup；
- fixture import 与 S1 local-draft reconciliation；
- opportunity/application/invitation/appointment proposal；
- invite-only fail-closed；
- focused unit and owner-interface tests。

### EVT-NEXT-2 — Ordinary non-event appointment flow

- 用户从 NEXT 正常接受邀约或提交申请；
- Calendar 创建确认安排；
- 返回 NEXT 后可看到 owner receipt；
- 无 Event Runtime 也能完成普通闭环。

### EVT-NEXT-3 — Schedule-change event coordination

- Event Runtime eligibility、one-time decision、deadline、request lineage 和 audit；
- NEXT 原生改期界面；
- 接受、替代时间、拒绝和超时四条结果；
- stale/off-world/off-revision/source-deleted fail-closed。

### EVT-NEXT-4 — System notification and execution handoff

- owner notification payload 与深链；
- Calendar revision-safe update；
- Agenda Journey reconciliation；
- Map 仅在用户明确出发后参与；
- return context、desktop/simulated Pixel 5、day/night、zh/en、accessibility、zero overflow。

## 7. Explicit Exclusions

- 不创建 Event Home App；
- 不为事件注册新的卡片 host；
- 不让 Runtime 直接写 Calendar、Map、Mail、Work Hub 或通知；
- 不根据 Self Profile 文本、UI 名称或用户自称授予机构/艺人权限；
- 不从当前位置、坐标或 Map 到达推断参加、迟到、面试完成或职业结果；
- 不实现自动录用、签约、薪资、Wallet 入账、公开新闻或粉丝传播；
- 不推进 EVE-5、CG、Mini Scene 或 Narrative Timeline；
- 不把自由对话摘要作为唯一完成条件。

## 8. Acceptance Gate

只有以下条件全部满足，才能称为首条职业事件闭环：

1. 普通无事件邀约与 Calendar 写入先独立成立；
2. 邀请制机会无凭证绝不放行；
3. Event Runtime 只创建一次 request，并保留精确来源 lineage；
4. 三种用户操作与超时都有明确 owner receipt；
5. Calendar/Agenda/Map 只消费已确认 owner fact；
6. 所有失败路径不显示假成功；
7. 完整 lint/test/build/governance/diff 与桌面/模拟 Pixel 5 E2E 通过；
8. 不声称真机、真实机构或真实投递证据。
