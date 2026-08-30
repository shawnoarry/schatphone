# Event-Adjacent App Shell Priority Matrix / 事件相关应用壳优先级矩阵

Updated: 2026-08-26

Status: `PLANNING_AND_WORKGROUP_TRIAGE_ONLY / NO_IMPLEMENTATION_AUTHORIZATION`

## 1. Purpose

本文档只解决一个问题：在“先做可见、可测试的 App 壳，再接 owner 数据和事件链”的产品策略下，哪些壳应该先做，哪些应稍后做，哪些根本不应新建独立入口。

它独立于 `EVENT_ECOSYSTEM_APP_SHELLS_PLANNING_HANDOFF.md`，不修改前一份总规划，也不取代 `docs/roadmap/TODO_ROADMAP.md`。这里的优先级是 `shell prototyping priority / 壳生产优先度`，不是当前工程队列或 Event stage 授权。

特别需要区分：

- 当前 roadmap 中 `CMG-08` 仍是正式工程队列里的待做项；
- 本文讨论的是用户希望先推进的 App 壳生产顺序；
- 一个项目可以工程优先级高但不适合“先做壳”，也可以壳优先级高但尚未获准接入 Event Runtime。

### 1.1 Portfolio index authority / 壳子总目录职责

本文件同时承担事件相邻 App 壳的**唯一总目录与成熟度索引**。其他文档继续保存产品细节，但不应再各自维护一份完整候选清单：

- `EVENT_ECOSYSTEM_APP_SHELLS_PLANNING_HANDOFF.md`：各类壳的功能结构、后续优化、owner 边界和长期生活版图；
- `NOTIFICATION_WORKPLACE_FANDOM_TICKETS_TRAVEL_SHELL_PLAN.md`：通知中心、工作台、统一粉丝社区、票务和旅行这一批的具体拆解；
- `BROWSER_SEARCH_AND_HELP_CENTER_PLANNING_HANDOFF.md`：Browser/Search/Help 专项合同；
- `docs/roadmap/TODO_ROADMAP.md` 4.16：唯一实时工程队列、实施许可和完成状态权威。

下面的组合账本用于回答“项目有哪些壳、现在做到哪、下一步补什么、去哪里读细节”。它是 roadmap/package handoff 的导航投影，不独立授权实现。每次壳子获得正式 S0-S3 验收后，应同步这一节；候选优先级调整则同步第 6 节总优先级矩阵。

## 2. Shell-First Working Model / 先壳后链路的工作方式

“先搓壳子”不等于只画一张不能操作的首页。为了避免后续全部推倒，建议把每个应用分成四级成熟度。

### S0: Visual shell / 视觉壳

最低交付：

- route、Home/App Store 入口候选和完整返回；
- 真实尺寸下的首页、列表、详情或主操作页；
- 本地 fixture 数据；
- 空状态、加载状态、失败状态和长文本状态；
- desktop、simulated Pixel 5、day/night、语言和 accessibility 基础。

S0 不创建跨模块写入、不注册 Event Surface、不调用 provider、不声称业务已完成。

### S1: Ordinary-use shell / 普通可用壳

在 S0 基础上增加：

- 用户不依赖事件即可完成一个普通操作闭环；
- 本地筛选、收藏、草稿、切换、已读或选择等轻量状态；
- 页面刷新和路由返回不会丢失当前上下文；
- 操作语义已经接近未来 owner，但仍可使用 fixture repository，避免过早冻结生产 schema。

第一批壳建议至少做到 S1。只做 S0 容易变成不可验证的静态展示。

### S2: Owner-ready product / Owner 就绪产品

在 S1 基础上增加：

- 正式 owner、Store、schema、revision 和 migration；
- durable write receipt、失败回滚、stable-id dedupe；
- backup/restore、deleted/stale source 和权限处理；
- 与 Map、Calendar、Wallet、Chat、Phone 等 owner 的正式 Interface。

### S3: Event-integrated product / 事件接入产品

在 S2 基础上增加：

- 明确 trigger、no-event、owner request 和 correlated owner fact；
- Event Runtime 只协调条件、一次性决定、等待、超时、来源和审计；
- owner-native 通知、消息、帖子、账单、预约或状态变化；
- focused unit、完整行为检查和跨 App E2E。

推荐节奏是：`S0/S1 批量建立产品世界 -> 选少数高价值壳进入 S2 -> 每次只接一条 S3 链路`。

### 2.1 Current portfolio ledger / 当前壳子总账

#### Accepted and visible / 已验收且用户可见

| 产品面 | 形态 | 当前成熟度 | 当前已实现 | 下一阶段 | 详细规划 |
| --- | --- | --- | --- | --- | --- |
| Daon Mail / 邮件 | 独立 App | `S1 DONE` | 收件箱、详情、撰写/草稿/发送、联系人/附件/日历等 owner handoff；显式 AI Receive 已单独验收 | 生产 mailbox owner、真实投递、backup、通知写入 | 总规划 + roadmap 4.16 |
| Prism / Browser、搜索与帮助 | 独立 App | `S1 DONE` | Help 与当前世界本地搜索、来源标识、历史和书签 | 公开世界索引与可选 Web Adapter 深化；继续排除私有 owner 数据 | Browser 专项 + roadmap 4.16 |
| Ripple / 社区媒体基础 | 独立 App | `S1 DONE` | fixture 账号、帖子、关注、收藏、已读与信息状态提示 | 建立 Community Fact/Claim/Post owner、发布与更正链 | 总规划 + roadmap 4.16 |
| Ondam Care / 医疗健康 | 独立 App | `S1 DONE` | 服务发现、本地预约、用户编写的报告、真实 Map 地点 handoff | Healthcare owner、预约接口、Calendar/Wallet/通知写入 | 总规划 + roadmap 4.16 |
| Jari / 住处 | 独立 App | `S1 DONE` | 房源发现、筛选、收藏、看房草稿、真实 Map 区域 handoff | Housing owner、看房接口、合同/住所 truth、Calendar/Wallet/通知写入 | 总规划 + roadmap 4.16 |
| System Notification Center / 系统通知中心 | 原生系统面，不是 App | `SYSTEM S1 DONE 2026-08-24` | 状态栏点击/下拉、App 分组、全部/未读、已读、清除、owner 深链 | 每 App 通知频道、保留策略、真机 push 证据 | 近期专项计划 + roadmap 4.16 |
| Work Hub / 组织工作台 | 独立 App | `S1 DONE 2026-08-24` | 艺人优先的今日、频道、工作、所属；本地任务/报备/提案/团队；App 与组织显示名编辑 | 下一生产优先项：organization membership/credential owner、普通无事件组织工作闭环、再接首条 Work Hub 原生事件 | 近期专项计划 + 下一事件计划 + roadmap 4.14/4.16 |
| Aster / 星集（统一粉丝社区与艺人订阅） | 独立 App、一个品牌内双工作区 | `S1 DONE 2026-08-24` | 首页、艺人目录、官方公开日程、星信预览、Ripple 稳定 post-ID 投影、本地关注/收藏/已读、锁定的艺人工作区与 Work Hub pending 回跳 | Community publication owner、平台 entitlement、真实艺人工作区、Wallet 订阅、系统通知 | 近期专项计划 + roadmap 4.16 |
| GATE / 入场（票务与文化活动） | 独立 App | `S1 DONE 2026-08-24` | 活动发现、分类/搜索/详情、售票/抽选/预约/候补/售罄状态、本地收藏/最近查看/入场意向草稿/提醒偏好 | ticket/admission owner、库存/席位/抽选结果、Wallet、Calendar、Map、Agenda、通知 | 近期专项计划 + roadmap 4.16 |
| ROAM / 漫泊（旅行与酒店） | 独立 App | `S1 DONE 2026-08-24` | 目的地/住宿发现、搜索/筛选/详情、可用/少量/不可用/过期来源、本地收藏/最近查看/日期人数房型/住宿意向草稿 | travel/reservation owner、真实房态/订单、Wallet、Mail、Calendar、Map、Agenda、通知 | 近期专项计划 + roadmap 4.16 |
| VIA / 联程（城际交通） | 独立 App | `S1 DONE 2026-08-24` | 铁路、航班、长途巴士与渡轮班次比较；明确余位/售罄/不可用/过期状态；本机票价、人数与出行意向草稿；现有 Map 交通枢纽只读引用 | transport/booking owner、真实班次/库存/出票、Wallet、Mail、Calendar、Map、Agenda、通知 | 近期专项计划 + roadmap 4.16 |
| CREDO / 谱权（创作者作品与权益） | 独立 App | `S1 DONE 2026-08-24` | 作品目录、参与角色、权利份额只读记录、结算单与年度申报草稿 | institution/works/rights/royalty owner、正式认证、登记、结算、Wallet/Files/Music | 总规划 + roadmap 4.16 |
| POSTA / 递送（快递邮政） | 独立 App | `S1 DONE 2026-08-24` | 包裹查询、明确物流/自提/送达/过期状态、递送消息、本机寄件草稿与偏好 | logistics/shipment owner、真实运单/取件/地址/签收、Shopping、Map、通知 | 总规划 + roadmap 4.16 |
| NEXT / 机会（外部职业与试镜） | 独立 App | `S1 DONE 2026-08-24` | 公开工作、外部试镜与跨组织邀约发现；收藏；申请材料与职业名片本机草稿；邀请制与过期来源 fail-closed | 仅在外部机会场景建立 opportunity/application/invitation owner；已存在所属后的内部工作转入 Work Hub | 总规划 + 下一事件计划 + roadmap 4.16 |

#### Accepted next promotions and shells / 已接受的下一升级与待做壳

| 产品面 | 形态 | 当前成熟度 | 已确认方向 | 下一可见切片 | 详细规划 |
| --- | --- | --- | --- | --- | --- |
| Work Hub owner promotion | 已有独立 S1 App | `NEXT PLANNED / S2 GATED` | 内部组织工作是默认已签约艺人、学生与职员的主要工作入口 | 先建立组织 authority/owner 与普通无事件工作闭环，再接首条 Work Hub 原生事件 | 下一事件计划 + roadmap 4.14/4.16 |
| 生活志 / Chronicle | 独立个人连续性产品 | `EVT-CHRONICLE-1 DONE 2026-08-30` | Diary Owner 拥有用户日记；有限只读投影聚合已验证的个人生活事实 | 普通 Home/App Store 产品；不复制或编辑 Calendar、Work Hub、Journey、Wallet、Assets 或关系记录；AI recall/自动日记仍 gated | 生活志专项计划 + roadmap 4.12/4.16 |
| Owner promotion for CREDO / POSTA / NEXT | 已有独立 S1 App | `S2 GATED` | 三个壳已完成普通本机预览，不再属于“壳待做”；NEXT 仅承担外部机会 | 按独立领域需求分别建立 institution/rights、logistics、external-opportunity canonical owner | 总规划 + roadmap 4.16 |

#### Conditional, extension-first, or dependency-gated / 条件型、优先扩展或受依赖限制

| 候选能力 | 当前建议形态 | 当前状态 | 升级条件/下一步 | 详细规划 |
| --- | --- | --- | --- | --- |
| Restaurant Reservations / 餐厅订位 | 先做 Map/Calendar/Food Delivery 子流程 | `B2 / TODO` | 证明地点详情、订位 owner 与 Calendar handoff 后再判断是否独立 | 总规划 |
| Fitness / Wellness / 健身习惯 | 先做 Calendar + Activity Session 模板 | `B2 / TODO` | 高频课程、会员或独立内容达到建壳阈值后再评估 | 总规划 |
| Home Services / 物业与家庭服务 | Housing 子模块 | `B2 / TODO` | Housing owner 建立后补维修、保洁、费用请求 | 总规划 |
| Pharmacy / 药房 | Healthcare 子模块 | `B2 / TODO` | Healthcare owner 建立后补处方、取药与配送 | 总规划 |
| Production activities / 演出、录制、练习 | Workplace + Calendar + Agenda/Activity 模板 | `B2 / TEMPLATE TODO` | 完成活动模板和执行链，不新建“事件 App” | 总规划第 16 节 |
| Narrative Timeline / 故事时间线 | Chronicle 内的派生只读视图 | `CJA-6B DONE 2026-08-30` | 从已验证 Owner 摘要确定性重建，不持久化第二份时间线 | 总规划 + CJA-6A/CJA-6B 合同 |
| Investigation / Knowledge / 线索案件 | 独立玩法壳候选 | `C / TODO` | 先有可玩的案件、Community owner 与稳定 Fact/Claim 引用 | 总规划 |
| Messages / SMS / 短信 | 暂不独立 | `C / TODO` | 出现不可由 Chat、Phone、服务号和通知承担的号码/短码场景 | 总规划 |
| Insurance / 保险 | Healthcare/Housing 附属设计 | `C / TODO` | 相关 owner 与制度模型成熟后再决定入口 | 总规划 |
| Campus / 校园 | 优先由 Work Hub 学生/教师模板承载 | `C / TODO` | 学生世界需要独立校园服务时再评估 App | 总规划 |
| Civic / 公共服务 | 后期专项 | `C / TODO` | 明确世界制度与 canonical owner 后再设计 | 总规划 |
| Pet Care / 宠物生活 | 后期专项 | `C / TODO` | 先建立宠物实体与生活状态 owner | 总规划 |
| Legal / 法律服务 | 后期专项 | `C / TODO` | 明确制度、高风险边界和正式 owner | 总规划 |
| Mini Scene retained library / 小剧场留存库 | 未来管理入口 | `C-SPECIAL / CMG-08 GATED` | 先完成 occurrence 复用、可选留存与删除语义 | 总规划 + Mini Scene 合同 |

#### Explicitly not a separate Home App / 明确不建立独立入口

| 后台能力/候选 | 决定 | 现有归属 |
| --- | --- | --- |
| Event Home / 事件主页 | `X / DO NOT CREATE` | 事件通过 owner-native App、系统通知、Map 等媒介呈现；World Hub 负责隐藏审阅 |
| Schedule Orchestrator / 时间编排 | `X / KEEP HIDDEN` | Calendar、Agenda Journey 与隐藏协调 owner |
| World State / Arc ledger / 世界状态或弧线账本 | `X / KEEP HIDDEN` | Event Runtime、未来 world owner 与 Community projection，不做普通 App |
| Urban Transit / 市内公共交通 | `X-CURRENT / DO NOT CREATE YET` | Map 继续拥有市内交通方式、路线和 ETA；`VIA / 联程` 只覆盖城际班次/票务意向，不实现地铁线路拓扑、实时车辆或市内导航 |

## 3. Priority Criteria / 分级依据

每个候选按以下五项判断，不用伪造过度精确的数字分数。

1. **Existing foundation reuse / 现有基础复用度**
   - 是否能复用现有 Map、Calendar、Agenda Journey、Wallet、Phone、Chat、Files/Gallery、Music、Shopping 或通知能力。
2. **Standalone life value / 无事件独立价值**
   - 用户在没有随机事件时是否仍会主动打开和使用。
3. **Default-world fit / 默认世界适配度**
   - 是否直接增强现代首尔 K-pop、职业与普通生活体验。
4. **Shell-before-chain feasibility / 先壳可行性**
   - 是否能先用本地 fixtures 做成完整 S1，而不用提前冻结复杂跨模块真相。
5. **Boundary risk / 边界风险**
   - 是否涉及高敏感数据、法规、Truth/Claim、持久化迁移或与现有 App 重复。

## 4. Existing Foundations / 当前可以直接复用的能力

| 现有能力 | 可支撑的候选壳 |
| --- | --- |
| Home + App Store 安装、图标、皮肤和入口体系 | 所有新 App 壳 |
| Contacts Self Profile、角色、机构/服务号绑定 | Mail、Healthcare、Housing、Work/HR、Fandom、Creator Rights |
| Chat 会话、服务号、未读和结构化消息 | Mail 交互参考、Fandom 消息、机构客服，但不复制 canonical 会话 |
| Phone 来电、去电、文字通话、记录和摘要建议 | Healthcare、Housing、Mail、Creator Rights、Work/HR |
| Map 真实/虚构地点、行程、到达和 place session | Healthcare、Housing、Tickets、Travel、Reservations、工作活动 |
| Map 已有 hospital、clinic、pharmacy、hotel、cinema、broadcast 等类别 | Healthcare、Travel、Tickets、Production activities |
| Calendar Month/Week/Agenda、稳定 Map 地点、提醒和 push | Healthcare、Housing、Mail、Tickets、Work/HR、Creator Rights |
| Agenda Journey + Activity Session | 就诊、看房、面试、演出、录制、练习、课程、健身 |
| Wallet 账户、支付、流水和来源单据 | Healthcare、Housing、Tickets、Fandom 订阅、Creator royalties、Travel |
| Shopping 与 Food Delivery 的商品/订单/物流模式 | Tickets、Parcel/Post、Pharmacy、Home Services 的页面与状态参考 |
| Gallery、Files、Camera 和媒体引用 | Mail 附件、报告文件、房源图片、粉丝平台媒体、作品材料 |
| Music 库、播放和分享 | Fandom、Creator Rights、Concert/Tickets、Production activities |
| 服务通知、Calendar/Map push 和 Phone missed-call push | 系统通知中心和所有新壳通知计划 |
| Event Runtime + World Hub | 只在壳进入 S3 后使用，不作为 S0/S1 前置条件 |
| WorldBook、Map 公开资料和 owner 深链 | Browser 的当前世界检索、使用帮助和来源回跳；公共搜索索引只做 projection |

## 5. Priority Tiers / 优先级定义

### A1: First shell wave / 第一批立即做壳

满足：现有基础多、普通使用闭环明确、默认世界价值高、S1 可在不接事件时成立。

### A2: First-wave second half / 第一批后半段

满足：产品价值很高，但缺少正式 owner 或系统级边界，需要先做 fixture contract 和页面，不宜立刻冻结生产 Store。

### B1: Second shell wave / 第二批壳

满足：复用基础充分，但领域模型、制度或跨模块引用更复杂；应等第一批建立统一壳模式后再做。

### B2: Extension before independent app / 先做现有 App 扩展

能力有价值，但暂时更适合作为现有 App 的页面、模式或 activity template。等独立使用频率被证明后再升级为 App。

### C: Dependency-gated / 依赖门槛后再做

依赖尚不存在的 owner、世界玩法或已冻结产品决策。可以做低保真设计稿，但不建议现在创建生产 route/Store。

### X: Do not create a separate app / 不应独立建 App

应属于隐藏协调模块、现有 owner 或系统层。独立入口会制造重复记录或错误产品边界。

## 6. Master Priority Matrix / 总优先级矩阵

| 候选 | 壳优先级 | 建议先做到 | 现有复用 | 为什么现在/以后 | 首次事件接入优先级 |
| --- | --- | --- | --- | --- | --- |
| Mail / 邮件 | `A1-1` | S1 | Contacts、Files/Gallery、Calendar、Phone、通知、Chat IA 参考 | 最容易独立成立，职业和机构场景复用极高 | `P1`，先普通邮件再正式通知链 |
| Healthcare / 医疗健康 | `A1-2` | S1 | Map 医院/诊所/药房、Calendar、Agenda、Wallet、Phone、通知 | 生活价值最高之一，现有跨 App 基础非常完整 | `P1`，先预约/报告通知，不碰随机严重病情 |
| Housing / 住房 | `A1-3` | S1 | Map 住宅/区域、Gallery、Calendar、Wallet、Phone/Chat | 可形成浏览、收藏、预约看房的完整普通闭环 | `P1`，先用户咨询或 owner 改期 |
| Browser/Search/Help / 浏览器、搜索与使用帮助 | `A1-4` | S1 | WorldBook、Map、Home/App Store、owner deep links、未来 Community/Media、可选外部 Provider | 无事件、无 AI、无付费 API 时仍能完成帮助与世界资料检索；详细合同见 `BROWSER_SEARCH_AND_HELP_CENTER_PLANNING_HANDOFF.md` | `P2`，先公开内容发现，不把搜索当事件完成 |
| Community core / 社区媒体基础 | `A2-1` | S1 fixture owner | Chat/Contacts、Gallery、Music、通知、深链 | 世界回声价值最高，但 Fact/Claim/Post owner 尚未建立 | `P1`，在 Work Hub 首链之后接公开事实传播 |
| System Notification Center / 系统通知中心 | `A2-2` | system S1 | 现有前台 banner、锁屏分组、持久通知、push、来电、Calendar/Map 通知 | 解锁后的系统通知抽屉已完成；后续补每 App 策略与真机 push 证据 | `P0 SUPPORTING`，作为 Work Hub 首链的原生提醒面 |
| Unified fandom community / 统一粉丝社区与艺人订阅 | `A2-3` | S1 | Community core、Contacts、Gallery、Music、Wallet、通知、组织凭证 | 一个品牌 App 内含粉丝空间与受权限保护的艺人工作台；艺人订阅不是普通 Chat 私聊 | `P1`，先官方日程/公告和订阅内容，不做绯闻真相 |
| Organization Workplace / 组织工作台 | `A2-4` | `S1 / S2 GATED` | Self Profile、Calendar、Agenda Journey、Map、Mail、Files、Wallet、Phone、通知 | 以经纪公司艺人模板起步，统一承载团队、内部消息、任务、排班提案、报备、审批和跨 App 鉴权；学生/职员复用同一模块体系 | `P0 NEXT`，先普通组织闭环，再接排班变化、临时任务与审批事件 |
| Tickets / 票务与文化活动 | `B1-1` | S1 | Calendar、Wallet、Map、Music、Gallery、通知 | K-pop、电影、展览都可复用，普通购票闭环清楚 | `P1`，开售/抽选/改期/退票 |
| Creator Rights/Works / 创作者作品与版税 | `B1-3` | S1 | Music、Files、Wallet、Contacts、Calendar、Mail | K-pop 职业价值高，但权利份额和制度边界复杂 | `P2`，先材料补充/结算通知 |
| Travel/Hotel / 旅行酒店 | `B1-4` | S1 | Map 酒店/交通、Calendar、Wallet、Mail、通知 | 普通使用成立，但需要预订/取消 owner | `P1`，改期、换房、付款问题 |
| Parcel/Post / 快递邮政 | `B1-5` | S1 | Shopping logistics、Map、通知、Chat 服务号 | 可大量复用现有物流模式，适合网购完成后扩展 | `P1`，地址、派送、签收问题 |
| Jobs/Career / 外部求职与试镜 | `B1-6` | S1 | Contacts、Self Profile、Mail、Calendar、Files、Phone、Work Hub | 承担公开职位、外部试镜、选角、猎头与跨组织邀请；已有所属的内部工作不在这里处理 | `P2`，仅外部机会通知或面试变化 |
| Restaurant Reservations / 餐厅订位 | `B2-1` | Map/Calendar 子流程 | Map 餐厅、Calendar、Wallet、Food Delivery 店铺 | 先验证 Map place detail + Calendar 是否已足够 | `P1`，满位、改期、特别安排 |
| Fitness/Wellness / 健身与习惯 | `B2-2` | Activity Session 模式 | Calendar、Activity Session、Map、Music | 计时与执行能力已存在，先做活动模板比新 App 更划算 | `P2`，课程变化或伙伴邀请 |
| Home Services / 物业与家庭服务 | `B2-3` | Housing 子模块 | Housing、Wallet、Calendar、Phone、通知 | 没有 Housing owner 前独立入口价值不足 | `P1` after Housing，维修/费用问题 |
| Pharmacy / 药房 | `B2-4` | Healthcare 子模块 | Healthcare、Map pharmacy、Wallet、通知 | 应先属于医疗闭环，后续频率高再独立 | `P1` after Healthcare，缺货/取药/配送 |
| Production activities / 演出录制工作过程 | `B2-5` | Agenda/Activity templates | Calendar、Agenda Journey、Map、Activity Session、Mini Scene | 本身是计划活动，不应先建“事件 App” | `P0` 功能优先，但不是新壳优先 |
| Narrative Timeline / 故事时间线 | `C-1` | 已作为 Chronicle 派生视图实现 | CJA-6A、多个 owner summary、Diary Owner | AI recall、自动日记、领域后果与 CJA-6C 仍需另行批准 | `DONE 2026-08-30` |
| Investigation/Knowledge / 线索案件 | `C-2` | 设计稿/fixture contract | Community、Map、Phone、Chat、Files | 没有首个案件和 Community owner 时容易成为空看板 | `P2`，先有可玩案件 |
| Messages/SMS / 短信 | `C-3` | 暂不独立 | Chat、Phone、服务号、通知 | 与现有消息能力重叠，需先证明手机号/短码独立价值 | `P2`，从明确短信场景开始 |
| Insurance / 保险 | `C-4` | Healthcare/Housing 附属设计 | Wallet、Healthcare、Housing、Mail | 依赖医疗/住房 owner 和制度模型 | `P2` after owners |
| Campus / 校园 | `C-5` | 世界需求后再做 | Calendar、Mail、Files、Map、Chat | 当前默认职业世界不是首要用户路径 | `P2`，学生世界启用后 |
| Civic / 公共服务 | `C-6` | 世界制度决定后 | Mail、Calendar、Wallet、Files | 需明确国家/世界制度，不能凭空模拟真实官方流程 | `P3` |
| Pet Care / 宠物生活 | `C-7` | 宠物 owner 后 | Healthcare 模式、Calendar、Shopping、Map | 当前没有稳定宠物实体与生活状态 owner | `P3` |
| Legal / 法律服务 | `C-8` | 后期专项 | Mail、Files、Calendar、Wallet | 高风险、高制度依赖，不能只做漂亮壳 | `P3` |
| Mini Scene retained library / 小剧场留存库 | `C-special` | 先完成 CMG-08 语义 | Mini Scene、Event Runtime、World Hub | 当前不是可安全独立做的纯壳；留存/删除语义必须先正确 | 工程队列 `P0`，但壳策略不抢跑 |
| Event Home / 事件主页 | `X-1` | 不创建 | World Hub 已存在 | 会把多形态事件重新缩成统一列表/卡片 | 不适用 |
| Schedule Orchestrator / 时间编排 | `X-2` | 保持隐藏 | Calendar、Agenda Journey | 是协调 owner，不是用户 App | 不适用 |
| World State/Arc ledger / 世界弧线账本 | `X-3` | 保持隐藏候选 | Event Instance V2、未来 owner facts | 即使以后需要也是后台 owner，不是普通 Home App | 不适用 |
| Transit App / 公共交通 App | `X-current` | 暂不创建 | Map 已拥有交通选择与估计 | 当前没有线路、票务、时刻、车辆等独立浏览价值 | 以后 MJE-6 再评估 |

## 7. Recommended First Production Wave / 第一批实际搓壳顺序

### Wave 1A: Three everyday anchors

建议顺序：

1. `Mail`
2. `Healthcare`
3. `Housing`

这三个壳共同建立 SchatPhone 的“机构联系、生活预约、地点与资金”基础，且彼此页面形态不同，能尽早验证新 App 模板是否真的可复用。

Browser/Search/Help 作为 `A1-4` 横向工具候选排在这三个生活锚点之后。它不抢占当前 Mail S1，也不要求在 Healthcare/Housing 之前开工；一旦被单独晋升，第一版优先完成本地使用帮助和 `WorldBook + Map` 世界搜索，真实 Web API 可后接。

#### Mail S1 scope

- Inbox、thread/detail、Compose、Drafts、Archive；
- 6 至 10 个本地机构/职业 fixture；
- read/star/search、附件引用占位、Calendar invite 占位；
- 不发送真实跨 owner 邮件，不接 Event Runtime；
- 重点验证长正文、回复/转发层级和键盘输入。

#### Healthcare S1 scope

- institution/department discovery、appointment booking、appointments、report inbox/detail；
- 使用当前 Map hospital/clinic/pharmacy 类别生成 fixture 引用；
- 可选择日期/时段、取消或改期本地 fixture；
- 不产生真实诊断、不写 Wallet/Calendar、不接随机健康事件；
- 重点验证隐私、报告表格、状态层级和移动端长信息。

#### Housing S1 scope

- rent/buy 切换、列表、筛选、收藏、房源详情、预约看房草稿；
- 使用 Map stable place/area 作为只读位置引用；
- 不创建 canonical 房产、不付款、不改变住所；
- 重点验证图片、价格、长地址、筛选和详情回返。

### Wave 1B: World voice and fandom

建议顺序：

1. `Community core`（已完成 S1）
2. `System Notification Center`（已完成 system S1）
3. `Organization Workplace`（已完成 S1）
4. `Unified fandom community`（`星集 / Aster` 已完成 S1）

这组的叙事收益最高，但应复用一套 fixture repository 和 page contracts，避免三个壳各自发明帖子、账号和订阅。

#### Community S1 scope

- Following、Explore、News；
- account/channel、post detail、follow、bookmark、read state；
- Fact/Claim/Post 只在 fixtures 中标注，不建立生产 Store；
- 普通刷新不调用 AI；
- 不允许用户发布和跨模块修改。

#### Unified fandom S1 scope

- 一个品牌 App 内同时提供粉丝社区和艺人订阅消息；
- 粉丝空间与艺人工作台共用账号、艺人、订阅和媒体 fixture IDs；
- 艺人工作台只消费正式 entitlement，不提供“切换为艺人”的自授权按钮；
- Wallet 订阅只做视觉/本地状态，不写真实流水；
- 明确艺人订阅消息不是普通 Chat 私聊。

完成结果（2026-08-24）：`星集 / Aster` 已以 `app_fandom`、`/fandom` 接入 Home、App Store、共享 App identity/skin 与返回链。普通粉丝空间可浏览精选艺人、公开日程、星信预览和 Ripple 公开内容投影，并保存设备本地的关注、收藏、已读、tab 与提醒偏好。艺人工作区保持锁定；Work Hub 的 pending 申请只改变说明文案，不授予发布权限。该壳未创建第二份 Community publication、真实订阅/Wallet 流水、系统通知、生产 owner、Event Surface 或 Event Runtime 链。专属 Playwright 在桌面 Chromium 与模拟 Pixel 5 共通过 10/10，覆盖日夜、中英文、可访问性、回返、持久化和零横向溢出；不声称真机证据。

#### Notification Center S1 scope

- 复用已存在的前台 banner、锁屏分组和持久通知，补齐解锁后的系统通知抽屉；
- 本地 fixtures 覆盖 Mail、Healthcare、Housing、Community、Phone；
- read/dismiss/group 和目标 route preview；
- 主入口为状态栏下拉/点击，Settings 只负责权限和显示策略；
- 不接真实 Web Push，不让 dismiss 改变 owner 状态。

#### Organization Workplace S1 scope

- 以经纪公司中的艺人身份作为第一可见模板，首页包含今日 call sheet、团队、任务、确认和报备；
- 内部频道、任务/DDL、日程提案、身份申请和本地状态形成普通使用闭环；
- Calendar 拥有确认日程，Agenda Journey 拥有执行，Map 拥有路线/地点 session，Workplace 只显示投影和提交组织侧请求/报备；
- 坐标或被动到场不能生成考勤，用户身份文本不能直接生成艺人权限；
- manager、assistant、student 和 employee 先通过共享 fixture/resolver contract 证明可组合性。

### Wave 2: Career and transactions

建议顺序：

1. Tickets
2. Travel/Hotel
3. Intercity transport
4. Creator Rights/Works
5. Parcel/Post
6. Jobs/Career

这组应复用第一批已经稳定的列表、详情、表单、通知、文件和交易视觉模式，不宜与第一批并行发明新的通用 UI 规则。

Wave 2 的六个壳均已完成 S1（2026-08-24）：`GATE / 入场`、`ROAM / 漫泊`、`VIA / 联程`、`CREDO / 谱权`、`POSTA / 递送` 与 `NEXT / 机会`。它们只保存本机、非权威的普通使用状态。此后的 production Work Hub owner、普通组织工作闭环、首条 Work Hub 原生事件、revision-safe 执行证据与 Chronicle 已分别完成；这些完成不把任何 S1 壳自动提升为生产 Owner，也不授权下一条事件线。

## 8. Shell Teams And Non-Overlap / 建议小组边界

如果需要多组并行，建议按以下边界分配，而不是一组一个 Store：

| 小组 | 首批工作 | 可复用产物 | 不触碰 |
| --- | --- | --- | --- |
| Group A: Institution communication | Mail S0/S1 | thread、compose、attachment、institution identity | Chat Store、Phone transcript、Event Runtime |
| Group B: Care and appointments | Healthcare S0/S1 | service discovery、booking、report presentation | Calendar/Wallet 写入、真实医疗逻辑 |
| Group C: Place and living | Housing S0/S1 | listing、filter、media、appointment draft | Map place mutation、Wallet、current residence |
| Group D: Public world surfaces | Community + unified fandom S0/S1 | account/channel/post/subscription/entitlement fixtures | Chat Me、relationship truth、Event Runtime publication |
| Group E: System presentation | Notification Center unlocked shade | existing banner/group/deep-link/lockscreen patterns | new Home App、push relay rewrite、owner record mutation |
| Group H: Organization life | Workplace agency S0/S1 | membership/role/team/channel/task/schedule-proposal/credential fixtures | Calendar/Map/Wallet writes、self-authorized artist access、Event Runtime |
| Group F: Shared shell QA | responsive/accessibility/test fixtures | common test helpers and acceptance checklist | 不重构各业务 view |
| Group G: Browser/Search/Help | Browser S0/S1、Help schema、Local World projection、可选 Web Adapter | result/source/deep-link/history/bookmark patterns | 私有 owner 数据、Event Runtime、共享前端 API key |

共享路径如 router、Home/App Store registry、系统通知 overlay 和通用 fixture contracts 必须串行整合，不建议多个小组同时编辑。

## 9. What S1 Must Prove / 壳阶段统一验收

每个第一批壳在进入 S2 前至少证明：

1. Home/App Store 入口候选、route 和返回上下文完整；
2. 至少包含一个首页/列表、一个详情和一个主操作或编辑页；
3. 普通无事件状态可以理解并操作；
4. fixture IDs 稳定，刷新和返回不随机换数据；
5. 空、加载、失败、无权限、来源不可用和超长内容有设计；
6. day/night、中文/英文、桌面和模拟 Pixel 5 无横向溢出；
7. 触控目标、键盘焦点、读屏名称和减少动态效果完整；
8. 页面没有内部架构说明、未实现按钮或伪造“成功”状态；
9. 不写其他 owner、不调用 provider、不注册 Event Surface；
10. 文档记录未来 S2 owner 和 S3 event 接入点，但不提前实现。

## 10. Promotion From Shell To Chain / 从壳升级到链路

壳进入 S2/S3 的顺序不必与 S0/S1 相同。当前已接受的生产顺序是 Work Hub 优先；下面其他链路继续作为后续候选：

1. **Work Hub organization-work chain**
   - 组织工作通知/提案 -> 用户在 Work Hub 明确处理 -> Calendar 明确确认 -> Agenda Journey/Map/Activity 执行；
   - 先完成无事件普通闭环，再由 Event Runtime 协调一次机构改期；NEXT 只在外部机会阶段参与。
2. **Community publication chain**
   - 一个 owner-confirmed 公开日程事实 -> 官方帖子 -> 通知 -> 帖子详情；
   - 这是让世界首次产生公开回声的关键链。
3. **Healthcare appointment chain**
   - 用户挂号 -> Healthcare 确认 -> Calendar 候选/确认 -> Map/Agenda 出发；
   - 不需要医疗随机事件即可证明多 App 连通。
4. **Housing viewing chain**
   - 用户预约看房 -> owner 确认 -> Calendar/Agenda/Map；
   - 后续再加房东改期或材料要求。
5. **Mail institutional chain**
   - owner-confirmed 工作/预约/版权状态 -> 正式邮件 -> 用户回复或打开来源；
   - Mail body 不作为对方已执行的证明。
6. **Fandom official notice chain**
   - 已确认公开活动 -> 官方 notice/artist post -> 粉丝平台通知；
   - 不以粉丝评论改变世界事实。
7. **Tickets chain**
   - 开售/抽选 -> Wallet 支付 -> Calendar -> Map/Agenda；
   - 适合作为演唱会计划活动的入口，而不是把演唱会本身当随机事件。

## 11. Decisions Before Any Group Starts

每个壳小组领取前只需补齐以下最小决定，不需要先把完整事件链设计完：

```text
Shell name:
Priority tier:
Target maturity: S0 or S1
Home/App Store entry candidate:
Three core screens:
Local fixture source:
Ordinary no-event loop:
Local-only interactions:
Explicit fake-success prohibitions:
Existing UI/modules reused:
Paths reserved by this group:
Paths explicitly not touched:
Desktop/mobile/accessibility evidence:
Future S2 owner candidate:
Future S3 event entry candidate:
```

## 12. Final Recommendation

如果只选择一个壳开始，优先 `Mail`：实现风险最低，能为职业、医疗、住房、版权、校园和公共机构提供共同入口。

如果选择三个并行壳，优先 `Mail + Healthcare + Housing`：分别覆盖信息、服务预约和地点生活，最能检验 SchatPhone 是否已经从聊天模拟器变成可生活的手机世界。

默认 K-pop 世界观的公共声音、粉丝关系、票务、住宿、城际交通、创作者权益、包裹与外部职业机会基座保留为 S1 夹具组合。`NEXT_EVENT_PRODUCTION_PLAN_AFTER_SHELL_PORTFOLIO.md` 中的 Work Hub owner、普通工作闭环、首条世界观中立事件链、revision-safe 执行证据与 `生活志 / Chronicle` 已完成。现代 K-pop 不构成生产权限或“完整版”定义；Messages/SMS 仍等待明确号码或短码场景，后续事件线未被授权。

如果选择一个最能减少用户迷路、同时为未来世界知识和真实互联网留接口的工具壳，选择 `Browser/Search/Help`。先做本地 Help + World 搜索即可成立，外部 Web Search 不是首版阻塞条件。

不要把演唱会、打歌、录制或练习做成新事件 App。先把它们作为 Agenda Journey/Activity Session 的活动模板做完整，再在真实 checkpoint 接入事件。
