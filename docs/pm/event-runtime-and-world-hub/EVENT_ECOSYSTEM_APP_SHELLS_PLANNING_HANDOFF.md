# Event Ecosystem App Shells Planning Handoff / 事件生态应用壳规划交接

Updated: 2026-08-23

Status: `PLANNING_HANDOFF_ONLY / IMPLEMENTATION_NOT_AUTHORIZED_BY_THIS_DOCUMENT`

## 1. Purpose

本文档用于把事件生态后续可能需要的用户可见应用壳、系统级呈现面和跨模块依赖整理成可分组评审、拆解和估算的工作包。

它不是新的路线图、执行队列或实现许可。实时优先级和实施状态仍只由 `docs/roadmap/TODO_ROADMAP.md` 管理。任何小组在开始创建 route、Store、schema、migration、Home/App Store 入口或生产 Event Adapter 前，仍需获得对应产品阶段的明确接受，并在所属 package 中记录范围。

本文档回答三个问题：

1. 事件发生后，用户应该在哪种真实的手机媒介中看到它；
2. 每个壳的第一版至少要具备什么，才不是只展示一张空皮；
3. 各壳后续可以如何深化，同时不让 Event Runtime 夺走业务所有权。

## 2. Current Baseline / 当前已有基础

当前事件线已经具备以下可复用能力，不应由新壳重复实现：

- Event Runtime：条件、一次性随机决定、冷却、次数限制、Event Instance V1/V2、事实等待、超时、owner request、来源和审计；
- World Hub：事件历史、待审核项、来源链、说明和事件范围笔记；
- Map：地点、当前位置来源、行程、到达、地点进入/离开，以及唯一已注册的 Map Event Surface；
- Food Delivery：订单、配送、订单内服务消息、Service Case 和已完成的地址修改升级链；
- Shopping：商品、购物车、支付、订单、物流以及共享 commerce owner Interface 证明；用户可见 Shopping 事件案例仍待另行接受；
- Wallet：真实付款、收款、流水和来源单据；
- Phone：来电、去电、文字通话、通话记录、转写和结构化处理建议；
- Chat：角色对话、平台服务号、服务通知、关系连续性和有限的事件审核入口；
- Calendar、Agenda Journey、Activity Session：长期安排、近期执行、Map 出发/到达和活动计时；
- Mini Scene：AI 必需的结构化文本生成和全局文本 Presenter 基础；生产事件触发和完整场景留存管理仍待后续阶段；
- Player Context V1：基于结构化 Self Profile 的 K-pop 经纪人、公众 idol 身份适用性判断；它不会自行创建事件或世界事实；
- CJA-6A：Narrative Timeline 的只读、来源链接合同；可见产品、存储、留存和迁移仍待 CJA-6B 决策。

因此，后续目标不是创建一个普通的“事件 App”。事件仍是隐藏的因果协调能力，用户看到的应当是帖子、新闻、通知、电话、订单消息、日程变化、地点经历、小剧场或历史记录。

## 3. Shared Product Rules / 所有壳共同遵守

### 3.1 One owner per visible record

- 帖子和新闻正文属于 Community/Media；
- 通知记录属于系统通知层，来源业务仍属于原 App；
- 通话和短信分别属于 Phone 或未来 Messages owner；
- Narrative Timeline 只投影 owner 已确认的摘要和引用；
- 线索、用户推断和案件笔记属于未来 Investigation/Knowledge；
- 完整小剧场内容属于 Mini Scene，事件结果仍属于原 owner 和 Event Runtime 审计链。

Event Runtime 只保留请求、决定、状态、稳定引用和必要来源，不复制这些正文或业务记录。

### 3.2 Event participation does not require a card

模块可以通过原生消息、状态更新、来电、帖子、通知或行程参与事件，不需要注册 Event Surface。除当前已接受的 Map host 外，新增 host 必须单独说明为什么普通 owner-native 页面不足。

### 3.3 Ordinary capabilities remain available

关闭可选事件或没有命中事件时，用户仍能正常发消息、打电话、修改允许修改的地址、查看订单、支付、出行、管理日历和阅读普通内容。事件不能成为基础功能唯一入口。

### 3.4 Fact, claim, and publication stay separate

- `Fact`：owner 已确认的事实；
- `Claim`：某人或账号提出的说法，可能真实、部分真实、未证实、矛盾或未知；
- `Post`：用户实际看到的已发布内容，可引用 Fact 或 Claim。

“有人发布了某个说法”可以是事实，但说法内容本身不能自动成为世界真相。

### 3.5 Local-first and fail-closed

- 普通列表打开、已读切换、筛选、无事件路径不调用模型；
- AI 只能在明确入口后起草候选文本；
- 缺失、过期、跨世界、无权限或 revision 不匹配的来源不能伪造替代内容；
- owner 写入失败时不能显示为已经发布、已经修改、已经保存或已经完成；
- committed record、稳定引用、备份和恢复规则必须在生产实现前确定。

### 3.6 Cross-app navigation is part of acceptance

每个壳都必须定义：

- 从哪里进入；
- 点击内容后去哪个 owner App；
- 返回后回到哪个列表、筛选、帖子或记录；
- 来源已删除或不可访问时显示什么；
- 锁屏、前台、刷新、重开和恢复后的状态；
- 桌面和模拟移动端的零横向溢出、键盘焦点、可访问名称和触控目标。

## 4. Recommended Grouping / 建议小组划分

| 候选工作包 | 产品归属 | 当前建议 | 主要依赖 | 是否可由本文件直接开工 |
| --- | --- | --- | --- | --- |
| Retained Mini Scene Library / 小剧场留存与回放入口 | Module Architecture + Event Runtime + Visual/IA | 最接近当前路线图的可分派项 | `CMG-08` | 否；需按 CMG-08 正式占用范围 |
| Community/Media / 社区与媒体壳 | 未来独立 Community/Media package | 最优先的新应用壳候选 | Fact/Claim/Post、publication request、持久化 | 否；需先建立 owner/package 并接受 V1 |
| System Notification Center / 系统通知中心 | System/Visual IA，来源 App 各自负责 payload | 与第一个新壳并行设计 | 路由回跳、分组、权限、push 边界 | 否；需单独接受系统层范围 |
| Narrative Timeline / 故事时间线 | CJA-6B 待定 owner | 第二阶段只读壳 | CJA-6A、owner summaries、retention | 否；CJA-6B 决策前禁止 route/Store |
| Messages/SMS / 短信 | 待定独立 owner 或 Phone 子模块 | 条件候选 | 与 Chat/服务号/Phone 的边界 | 否；先证明独立价值 |
| Investigation/Knowledge / 线索与案件 | 未来独立 Investigation/Knowledge package | 后期世界玩法壳 | Fact/Claim/Post、稳定引用、用户推断 | 否；需独立产品接受 |
| Mail / 邮件 | 待定独立 owner | 职业和机构事件的补充候选 | Contacts、Calendar、附件、通知 | 否；先证明不与 Chat/短信重复 |
| Browser/Search/Help / 浏览器、搜索与使用帮助 | 待定 Browser + Help content owner | 高价值工具型壳候选 | WorldBook、Map、未来 Community/Media、owner deep links、外部 Search Provider | 否；先读 `BROWSER_SEARCH_AND_HELP_CENTER_PLANNING_HANDOFF.md` 并单独接受 S0/S1 |
| Housing And Real Estate / 住房 | 待定生活服务 owner | 默认世界生活化候选 | Map、Calendar、Wallet、Contacts、合同 owner | 否；先接受普通找房/租赁 V1 |
| Fandom Platform Facades / 粉丝平台多品牌壳 | Community/Media owner + facade manifests | K-pop 默认世界重点候选 | 账号、订阅、帖子、艺人消息、Wallet | 否；先接受 Community/Media owner |
| Creator Rights And Works / 创作者版权与作品管理 | 待定行业业务 owner | 制作人/创作者职业候选 | 身份认证、作品、权利、usage、Wallet | 否；先冻结虚构/现实参照范围 |
| Healthcare / 医疗健康 | 待定 Healthcare owner | 默认世界生活基础候选 | 医疗机构、预约、报告、药房、Wallet、Calendar | 否；需先接受模拟医疗与隐私边界 |
| Production Activity Templates / 演出录制活动模板 | Calendar + Agenda Journey + Activity Session + domain templates | 应先于新增“工作 App” | 地点、检查点、完成规则、owner facts | 否；需单独接受首个 activity family |

## 5. Shell A: Retained Mini Scene Library / 小剧场留存与回放入口

### 5.1 Product role

这是 Mini Scene 已生成完整内容的管理和回看入口，不是事件列表、世界历史或第二份 Event Instance。一次事件的结果、关系记忆和 Timeline 摘要不依赖用户是否保留完整小剧场。

### 5.2 V1 required capabilities

1. **留存选择**
   - 首次展示后明确提供“保留完整小剧场”和“不保留完整内容”；
   - 不保留只释放完整 presentation payload，不删除事件结果和已批准记忆；
   - 保存失败必须可见、可重试，不能提前显示成功。
2. **重复打开**
   - 相同 occurrence/request 优先复用已保留 artifact；
   - 刷新、返回和再次打开不重复调用 provider；
   - 明确“重新生成”才创建新 revision/request。
3. **管理入口**
   - 提供按最近、世界、事件来源和角色筛选的分页列表；
   - 列表至少显示标题、发生时间、来源模块、参与者、世界和留存状态；
   - 可以打开完整内容并返回原列表位置。
4. **生命周期**
   - 支持归档和明确删除；
   - 删除完整场景不删除 Event Instance、owner 结果、关系记忆或 Narrative Timeline；
   - 移除历史 120 条静默截断，读取成本通过分页和筛选控制。
5. **来源与失败状态**
   - 来源仍存在时可跳回 World Hub 或 owner 记录；
   - 来源缺失时保留诚实的不可用说明，不制造替代来源；
   - provider、生成、验证、保存和 Presenter 失败状态相互区分。

### 5.3 Suggested V1 screens

- `Recent / 最近`：分页的已保留场景；
- `Archived / 已归档`：明确归档的完整场景；
- `Scene detail / 场景详情`：正文、参与者、来源、发生时间、revision 和回到来源；
- `Retention decision / 留存决定`：首次展示后的保留或释放；
- `Delete confirmation / 删除确认`：说明只删除完整场景，不删除事件结果和记忆。

入口不一定要在第一版成为 Home App。可以先从 World Hub、全局 Presenter 的完成状态或 Settings 中进入，等真实使用频率证明独立安装价值。

### 5.4 Later optimization

- 收藏、标签和用户备注；
- 同一事件 occurrence 的多个明确 regeneration revision 对比；
- 角色、世界、事件家族和时间范围搜索；
- Gallery/Music 等 owner 引用的可选回放恢复；
- HTML Presenter 在安全审查完成后的独立格式适配；
- 导出单个场景或分享引用；
- 大型历史的冷归档和恢复，而不是静默删除。

### 5.5 Explicit exclusions

- 不把 Mini Scene 列表当作所有事件历史；
- 不因删除场景回滚世界或关系结果；
- 不在 reopen/retry 时重新付费生成；
- 不由 Event Runtime 保存场景正文；
- 不因这个入口自动推进 EVE-5、CG 或 HTML。

## 6. Shell B: Community/Media / 社区与媒体

### 6.1 Product role

Community/Media 是论坛、X/微博式社交媒体、粉丝社区和订阅新闻的统一内容 owner。第一版建议使用一个 App 内的不同频道或模式，而不是同时创建“论坛”“微博”“新闻”三个独立 App。

它解决的是“世界发生变化后，用户能从第三方视角看到回声”，而不是展示 Event Runtime 的内部日志。

### 6.2 V1 product decisions required before implementation

- 独立 package 和 Store owner；
- 账号、频道、Fact、Claim、Post、Reply、Subscription 和 Read State 的最小 schema；
- committed post 的持久化、编辑、删除/tombstone、备份和迁移；
- 世界隔离、账号可见范围、关注范围和访问权限；
- 本地内容包、固定 fixture 和可选 AI 起草的边界；
- 是否允许用户发布，还是 V1 只读；
- 评论是否为真实持久记录，还是第一版仅展示数量；
- 搜索、推荐和排序的本地确定性规则。

### 6.3 V1 required capabilities

1. **信息流主页**
   - `Following / 关注`：订阅账号和频道的时间流；
   - `Explore / 发现`：本地确定性推荐或编辑精选；
   - `News / 新闻`：媒体和官方频道内容；
   - 空状态、离线状态、加载失败和没有当前世界内容的状态完整。
2. **帖子详情**
   - 作者、频道、发布时间、正文、媒体引用、编辑/撤回状态；
   - 点赞、收藏、转发和评论的基础状态；
   - 支持引用相关角色、地点、日历活动、订单或其他 owner 记录；
   - 返回后保持 feed 位置和筛选。
3. **账号与频道**
   - 账号资料、类型、所属世界、认证/官方含义；
   - 关注/取消关注；
   - 账号历史帖子和频道订阅；
   - 区分角色本人账号、机构账号、媒体账号、匿名账号和系统频道。
4. **Fact/Claim/Post 可见语义**
   - 普通用户界面不需要暴露内部 schema 名，但文案必须能表达“官方确认”“未经证实”“已更正”“已撤回”等状态；
   - 一篇帖子可以没有 canonical Fact；
   - Claim 被反驳后，旧帖子保留发布历史和后续更正，不静默重写世界事实。
5. **Event Runtime 接入**
   - Runtime 只能创建 publication request；
   - Community/Media 验证账号、频道、可见范围、来源引用和正文后再 commit；
   - commit 成功后返回稳定 publication reference；
   - 失败不会回滚已发生的 owner fact，也不能生成假帖子占位；
   - 普通 feed refresh 不触发模型或新事件。
6. **深链和后续行为**
   - 帖子可跳转 Chat、Phone、Map、Calendar、Shopping、Food Delivery 或未来 Investigation；
   - 用户操作从真实 owner surface 开始，不能用帖子上的万能事件选项代替未实现功能；
   - 返回 Community 时恢复原帖子和滚动位置。
7. **基础质量**
   - day/night、语言、字体放大、长用户名、长标题、多行正文和无媒体状态；
   - 图片失败时保留来源说明和文字内容；
   - 键盘焦点、读屏顺序、触控目标、减少动态效果和零横向溢出。

### 6.4 Recommended first content proof

第一条生产证明不应直接使用高影响“绯闻即真相”。建议使用以下较安全链路之一：

1. 已确认公开日程完成后，官方媒体发布活动报道；
2. 经纪公司账号发布已确认的安排变更；
3. 匿名账号发布一个明确标记为 `unverified` 的 Claim，随后官方账号回应；
4. 已完成地点/演出事实产生粉丝讨论，但不改变关系、名誉或日程真相。

每条 fixture 必须同时包含 no-publication、stale source、provider failure、user ignore 和撤回/更正路径。

### 6.5 Later optimization

- 真实评论树、引用回复、转发附言和话题页；
- 趋势、热搜和跨帖子聚合，但排名仍需可解释、可复现；
- 账号之间的关注关系、屏蔽、静音和内容警告；
- 图片、短视频、直播或语音内容的独立媒体 owner 引用；
- 用户发帖、草稿、定时发布和审批；
- AI 基于已经确定的 Fact/Claim 起草多种文风，owner 确认后发布；
- 同一世界中的角色按有效曝光路径获知公开信息；
- 与 Investigation 的“保存为线索”引用动作；
- 大规模 feed 的索引、分页、冷归档和本地搜索。

### 6.6 Explicit exclusions

- 不把 Chat Me 的派生动态直接升级为 Community 数据库；
- 不让 Event Runtime 保存帖子正文；
- 不把 Post 或 Claim 自动当作 Fact；
- 不让 AI 直接发布或修改名誉、关系、钱包和日程；
- 不在普通刷新、Tick 或推荐排序时调用模型；
- 不把 Community 变成 World Hub、Timeline 或调查笔记。

## 7. Surface C: System Notification Center / 系统通知中心

### 7.1 Product role

通知中心是系统级呈现层，不是普通 Home App，也不是事件 owner。它只告诉用户“哪个 App 发生了什么、现在是否值得处理”，点击后进入真正负责处理的 owner 页面。

### 7.2 V1 required capabilities

1. **三种呈现**
   - 前台 banner；
   - 锁屏通知；
   - 下拉通知历史。
2. **来源和深链**
   - 每条通知带 source app、稳定 source reference、时间和目标 route；
   - 点击进入订单线程、帖子、通话、日历事件、Agenda Journey 或其他真实页面；
   - 来源失效时显示诚实的不可打开状态。
3. **生命周期**
   - unread/read、dismiss、clear group；
   - 相同来源按 conversation/order/event group 合并；
   - owner 更新时可替换同一通知，而不是堆叠矛盾状态；
   - 清除通知不删除 owner 记录和 Event Instance。
4. **优先级**
   - 普通信息、需要处理、时间敏感、来电/安全四类最小层级；
   - 可选事件关闭不影响必要的订单、日程、安全和来电通知；
   - 高优先级不能由自由文本或模型单独决定。
5. **权限和安静模式**
   - App 内通知和真实 Web Push 权限分开；
   - 模块静音、会话静音、系统声音、振动和免打扰语义清楚；
   - 浏览器/PWA 完全关闭时不承诺本地事件自动发生。
6. **质量状态**
   - 多语言、长文本、多条堆叠、safe area、键盘/读屏、锁屏隐私预览；
   - 前台 banner 不遮住当前主要操作或来电层；
   - 返回后保留用户原来的操作上下文。

### 7.3 Later optimization

- 摘要通知和同源折叠策略；
- 每个 App、账号、订单或事件家族的细粒度设置；
- 稍后提醒、快速回复和明确 allowlisted quick action；
- 已配置真实 Push 时的远端投递和设备订阅诊断；
- 锁屏隐私级别、敏感内容隐藏和预览策略；
- 通知搜索和有限历史，但不能替代 owner App 历史。

### 7.4 Explicit exclusions

- 不在通知卡内完成复杂事件分支；
- 不把清除通知解释为拒绝或完成事件；
- 不复制帖子、通话、订单或日历正文；
- 不承诺 PWA 关闭后仍持续运行完整世界模拟。

## 8. Shell D: Narrative Timeline / 故事时间线

### 8.1 Gate and product role

当前只有 CJA-6A 合同。CJA-6B 必须先决定最终产品名、route、owner、存储、留存、备份、review、迁移和用户编辑策略，才能创建可见 App。

Timeline 是用户已经真实经历并由 owner 确认的结果投影，不是事件日志、任务列表、社交 feed 或第二份业务记录。

### 8.2 Decisions required before V1

- 名称：Story、Diary、Journal、History、生活记录或其他；
- 是否为独立 Home App、隐藏入口或 Calendar/World Hub 的只读入口；
- projection 是按需重建还是持久保存稳定摘要；
- 用户能否隐藏、置顶、补充私人备注，是否允许编辑 owner summary；
- source 被删除、修订、归档或无权限后如何显示；
- 留存、归档、备份、恢复和迁移；
- Forum/Chat 使用它作为 AI context 时的权限、范围、时间和 token/character budget。

### 8.3 V1 required capabilities

1. **时间组织**
   - 今天、最近、按月或按日期分组；
   - 支持 Calendar、Agenda Journey、Map Journey、Activity Session、Event Runtime 和 domain owner 摘要；
   - 明确区分计划、进行中和已确认结果，只把允许的 confirmed summary 纳入正式历史。
2. **来源引用**
   - 每条 entry 使用 typed `sourceRefs`；
   - 可以返回原始订单、电话、地点、日历、帖子或 World Hub 审计；
   - stale、deleted、unauthorized 或 revision mismatch 时 fail closed，不留下看似可信的孤儿记录。
3. **详情与筛选**
   - 按日期、世界、角色、地点和来源模块筛选；
   - 详情显示简洁摘要、时间、参与者、地点和来源；
   - 不显示完整 raw prompt、provider response 或无界 Event Runtime 日志。
4. **只读边界**
   - Timeline 不能修改订单、关系、钱包、位置和日程；
   - ordinary read 不调用 provider；
   - Timeline 不能直接发布 Community 内容或生成事件。
5. **质量状态**
   - 大量历史使用分页/窗口化读取；
   - 空记录、来源部分不可用、跨世界切换和恢复状态；
   - 桌面/移动、文本放大、键盘、读屏和零横向溢出。

### 8.4 Later optimization

- 用户私人备注、标签、收藏或“重要的一天”；
- 地点、人物和共享体验聚合；
- 月度/年度回顾，但只基于 bounded confirmed summaries；
- 导出为文本、图片或 Book 文稿候选；
- 与 Community/Chat 的受限只读 AI context；
- 冷归档和恢复；
- 从 retained Mini Scene、Gallery 或 Music 引用可选氛围材料，但不复制资产。

### 8.5 Explicit exclusions

- 不将 projection 变成 canonical owner；
- 不自动补写缺失事实；
- 不把所有 Event Instance 都强行写成用户故事；
- 不以 Timeline 严重程度代替角色记忆重要性；
- 不在 CJA-6B 决策前创建 Store、route 或 backup child。

## 9. Shell E: Messages/SMS / 短信

### 9.1 Gate and independent-use test

只有在以下需求稳定存在时才创建独立 Messages owner：

- 发送者通过手机号或系统短码联系，而不是 Chat 角色或平台服务号；
- 短信有独立会话、送达、失败、号码、通话跳转和通知语义；
- 把它放进 Chat 或 Phone 会造成明显产品混乱。

如果只是外卖、购物平台客服消息，应继续留在 owner App 或 Chat 服务号；如果只是电话后的文字记录，应继续留在 Phone。

### 9.2 V1 required capabilities

- 会话列表、未读、时间、号码/联系人和预览；
- 单个短信线程、发送、送达、失败和重试；
- 陌生号码、短码、联系人绑定和已删除联系人状态；
- 从短信拨号、保存联系人或打开明确来源 App；
- 验证码、预约确认、机构通知和普通双向短信的不同语义；
- 深链返回、锁屏隐私、通知分组、备份和恢复；
- 没有网络/provider 时本地 fixture 和普通失败状态完整。

### 9.3 Event integration

- Event Runtime 可以请求 owner 发送一条已验证模板短信或等待一条 owner-confirmed reply fact；
- Runtime 不保存短信正文，也不把任意用户文字自动解释成完成；
- 电话是否发生由 Phone 记录确认，短信是否发送/收到由 Messages owner 确认；
- 事件关闭时普通短信仍可使用。

### 9.4 Later optimization

- 群发、附件、语音留言和富链接预览；
- 垃圾信息、屏蔽、短码订阅和机构模板；
- AI 辅助回复草稿，但必须由用户发送；
- 与 Calendar、Map、Wallet、Community 的结构化卡片；
- 已读回执和多设备语义，仅在真实产品能力存在时添加。

### 9.5 Explicit exclusions

- 不复制 Chat 角色会话和平台服务号历史；
- 不把自由文本分类直接当作高影响 owner fact；
- 不为了某一个外卖事件单独创建短信 App。

## 10. Shell F: Investigation/Knowledge / 线索与案件

### 10.1 Product role

这是未来探案、玄幻、悬疑和世界谜题的用户知识 owner。它保存用户明确收集的线索引用、案件组织和个人推断，不负责发布帖子，也不改写世界真相。

### 10.2 Product decisions required before implementation

- Case、Clue、Source Ref、User Note、Deduction 和 Resolution 的最小 schema；
- 线索是用户手动保存、owner 自动授予，还是两者都支持；
- Claim、Fact 和用户推断在 UI 中的区分方式；
- 删除来源、撤回帖子、来源修订后的 lineage；
- 案件是否由世界内容包预置，用户是否能自由创建；
- 完成案件的 owner 和验证规则；
- 备份、迁移、归档和跨世界隔离。

### 10.3 V1 required capabilities

- 案件列表：进行中、已解决、已归档；
- 案件详情：标题、目标、状态、用户备注和时间线；
- 线索列表：来源类型、摘要、发现时间、可信状态和原始来源跳转；
- 从 Community 帖子、Phone 通话、Chat 消息、Map 地点、Calendar 记录等明确执行“保存为线索”；
- 用户手动建立线索与案件关系，不能因坐标接近或文本相似自动确认；
- 区分 `confirmed fact`、`claim`、`observation`、`user deduction`；
- 来源删除或撤回后保留 tombstone 和用户笔记，不伪造原文；
- 空状态、搜索、筛选、分页、移动端布局和可访问性。

### 10.4 Event integration

- Event Runtime 可等待“用户收集了某个有效线索引用”或“案件 owner 确认了一个结果”；
- Runtime 不能把打开帖子、经过某坐标或模型推断当成已收集线索；
- Investigation owner 验证 clue/case revision 后发布 owner fact；
- 用户没有收集线索时，事件可以继续其他分支或自然结束，不能强迫完成。

### 10.5 Later optimization

- 线索关系图、地点板和人物板；
- 多种假设、支持/反对证据和矛盾检查；
- 角色协作、共享案件和受限信息权限；
- AI 辅助整理和提出问题，但不能判定真相；
- 世界包提供案件模板、可发现线索和失败/替代路径；
- 结案回顾可投影到 Narrative Timeline。

### 10.6 Explicit exclusions

- 不把 Community 数据库复制进案件 Store；
- 不把 Claim 自动标记为 Fact；
- 不把 Event Runtime 日志当作玩家已经知道的线索；
- 不让 AI 自动结案或修改 canonical world state。

## 11. Shell G: Mail / 邮件候选

### 11.1 Why it may be useful

邮件对经纪人、艺人、公司职员、学校、机构、预约、合同、正式通知和长文本交流有独立价值。它比 Chat 更正式，比短信更适合附件和结构化邀请。

但它不在当前路线图中，必须先证明有至少两类跨场景用途，不能只为一个职业事件创建。

### 11.2 V1 required capabilities if accepted

- Inbox、Sent、Drafts、Archived、Trash；
- thread、sender/recipient、subject、body、time、read/star 状态；
- 联系人和机构身份、陌生发件人、退信和发送失败；
- attachment reference，不直接复制 Gallery、Files、Calendar 或 commerce owner 数据；
- Calendar 邀请、订单/合同引用和明确深链；
- 搜索、分页、备份、恢复和删除/tombstone；
- 事件关闭时普通写信、收信和草稿仍可使用。

### 11.3 Later optimization

- 标签、规则、签名、模板和定时发送；
- 结构化邀请接受/拒绝，由 Calendar owner 最终确认；
- AI 起草和摘要，但发送仍需用户确认；
- 世界内机构域名、自动回复和服务邮箱；
- 与 Investigation 保存附件/邮件为线索。

### 11.4 Explicit exclusions

- 不复制 Chat、Messages 或平台客服线程；
- 不把邮件正文当作对方已经执行某项行动的证明；
- 不让 Event Runtime 直接发送未经 owner 验证的正式邮件。

## 12. Shell H: Housing And Real Estate / 房屋租赁与房产交易

### 12.1 Product role

住房属于长期生活基础能力，不应被建模成一个事件。用户应该能够在没有任何随机事件时正常浏览房源、收藏、联系、预约看房、申请租赁或购买，并在 owner 确认后形成地址、合同、付款和日历记录。

建议第一版使用一个 `Housing / 住房` App，同时容纳租赁和销售模式，不要先拆成两个 App。只有当租赁、买卖、物业服务和家居生活形成明显不同的高频入口后，再评估拆分。

### 12.2 V1 product decisions required

- 房源是世界包预置、用户创建还是本地生成候选；
- 租赁与购买的最低字段、币种、押金、月租/总价和可入住日期；
- 房源地点如何引用 Map stable place 或受控 residential unit，而不是让坐标自动创建房屋；
- 联系人、经纪人、房东、物业和买方/租客身份 owner；
- 看房预约、申请、合同和支付分别由谁确认；
- 当前住所、拥有房产和临时住宿是否需要独立 owner；
- 是否只做叙事模拟，还是需要严格的贷款、税费和法律流程；第一版建议保持为明确标注的世界内模拟合同。

### 12.3 V1 required capabilities

1. **房源发现**
   - 租赁/购买模式、区域、价格、户型和入住时间筛选；
   - 列表、收藏、最近浏览和搜索；
   - 图片、面积、房型、楼层、设施、费用和明确的地点引用；
   - 无图片、已下架、价格变化和来源不可用状态。
2. **房源详情**
   - 基础信息、费用明细、位置、通勤估计、附近设施和图片；
   - 联系、预约看房、收藏和分享；
   - Map 只提供地点和行程，不因浏览房源改变当前位置或发现状态。
3. **联系与预约**
   - owner App 内咨询或明确跳转 Chat/Phone/Mail；
   - 看房预约由 Calendar 确认并可生成 Agenda Journey；
   - 对方回复、确认、取消和改期都有 owner-native 记录。
4. **申请与合同**
   - 申请草稿、提交、审核中、接受、拒绝、撤回；
   - 合同摘要、双方、房源、期限、金额、稳定 revision 和签署状态；
   - 不能用一条 AI 回复直接证明合同成立。
5. **资金和入住**
   - 押金、月租、定金、房款或退款由 Wallet owner 结算；
   - 付款失败、余额不足和取消不会伪造合同完成；
   - 入住后由明确 owner 更新当前住所，Map 坐标本身不能自动改变住所。
6. **质量与恢复**
   - 长地址、长价格、不同币种、无房源、下架、重复提交和恢复；
   - 刷新、重开、备份和稳定 ID 重试；
   - 移动端筛选、键盘、读屏、图片失败和零横向溢出。

### 12.4 Event integration

可复用事件必须从真实住房流程或 owner fact 开始，例如：

- 用户主动咨询后，房东提出新的看房时间；
- 已确认预约前出现取消、改期或临时门禁说明；
- 申请提交后等待补充材料；
- 已入住后用户主动发起维修、邻里或费用问题；
- 房源下架、价格变化或竞争申请成为 owner-confirmed 状态。

事件不能凭用户坐标推断“正在找房”，不能自动替用户申请、签约或付款，也不能把“错过好房”设计成强制惩罚。

### 12.5 Later optimization

- 合租、室友、短租、宿舍和艺人宿舍模式；
- 物业费、水电、维修、搬家和家具采购；
- 房贷、分期、资产估值和出售流程；
- 与 Shopping、Map、Calendar、Wallet、Mail 和 Relationship Runtime 的生活连续性；
- 世界包预置社区、楼盘、宿舍和公司住房政策；
- 居住历史投影到 Narrative Timeline。

### 12.6 Explicit exclusions

- 不让 Event Runtime 成为房源或合同 owner；
- 不因坐标、常用地址或当前位置推断租赁/购买意图；
- 不让 Map pin 创建 canonical 房产；
- 不在第一版伪装真实韩国法律、税费或贷款准确性；
- 不用随机事件代替正常找房、看房、申请和支付功能。

## 13. Shell I: Fandom Platform Facades / 粉丝平台多品牌壳

### 13.1 Product role

默认 K-pop 世界需要的不只是一个通用论坛。可以在同一个 Community/Media owner 上提供多个平台壳，模拟不同公司的粉丝产品策略和使用感受，同时避免为每个视觉品牌复制账号、帖子、订阅和媒体数据。

公开产品可作为交互类型参考，但不直接复制现实品牌、专有文案、商标、艺人内容或付费规则：

- `artist-message subscription`：偏 Bubble 式订阅艺人消息、粉丝有限回复、照片/视频/语音和连续订阅体验；
- `artist community`：偏 Weverse 式艺人社区、粉丝发帖、官方公告、艺人帖子和可选 DM；
- `agency fan club`：公司或艺人官方会员、公告、活动报名和会员权益；
- `open fan forum`：非官方粉丝讨论、搬运、传闻、投票和话题。

### 13.2 Shared owner versus facade split

Community/Media owner 统一拥有：

- account、channel、post、reply、claim、subscription、read state、moderation 和 media refs；
- 世界、艺人、机构和用户身份引用；
- 发布、编辑、撤回、删除/tombstone 和备份。

每个平台壳只拥有：

- 首页结构、导航、品牌样式和内容分区；
- 支持哪些内容类型和互动命令；
- 订阅/会员展示、通知偏好和入口；
- 平台内的排序、可见范围和文案。

一个壳不能修改另一个壳不支持的 canonical 字段，也不能把 projection 复制成第二份帖子。

### 13.3 V1 required capabilities

1. **至少两种真实差异化壳**
   - 一个 `artist-message subscription`；
   - 一个 `artist community`；
   - 两者复用 owner contracts，但用户操作和页面结构明显不同。
2. **订阅和身份**
   - 选择艺人/团体、订阅状态、开始时间、到期/取消和昵称；
   - 普通关注、付费订阅、官方会员三种意义分开；
   - Wallet 只在真实购买确认后记录付款。
3. **艺人消息型壳**
   - 会话式消息、日期、媒体引用和有限回复；
   - 清楚表达这是平台化的一对多/订阅体验，不能伪装成普通私人 Chat；
   - 艺人没有发送内容、暂停活动或订阅到期时有完整状态。
4. **社区型壳**
   - 艺人/团体社区、粉丝 feed、官方 notice、艺人 post 和 post detail；
   - 关注、收藏、评论和举报的基础状态；
   - 账号/频道身份和 Claim 状态可被 owner 验证。
5. **通知与深链**
   - 新艺人消息、官方公告、回复和活动提醒进入系统通知；
   - 点击回到准确社区、帖子或订阅会话；
   - 返回后恢复原 tab 和滚动位置。

### 13.4 Event integration

- 已确认公开日程可触发官方 notice 或艺人 post request；
- 未证实消息必须作为 Claim 进入非官方账号/论坛，而不是直接写入艺人官方账号；
- 艺人、公司和媒体的发布权限分别验证；
- 用户回复、打电话、参加活动或购买会员从真实 owner surface 发起；
- optional events 关闭时，普通订阅内容、公告和社区浏览仍然成立。

### 13.5 Later optimization

- 会员等级、数字会员卡、活动报名、抽选和票务引用；
- 多语言翻译、媒体保存权限和内容水印语义；
- 直播、回放、付费内容和 shop 引用；
- 粉丝群体情绪、趋势和话题传播，但不能直接成为 canonical reputation；
- 艺人消息频率、活动暂停和公司审核；
- 不同娱乐公司/世界包提供独立 facade manifest。

### 13.6 Explicit exclusions

- 不复制现实平台商标、专有 UI、真实艺人付费内容或订阅价格；
- 不把艺人订阅消息混入普通 Chat 私聊；
- 不让粉丝评论或热度直接修改关系、名誉或世界事实；
- 不为每个品牌复制一套 Store 和帖子正文；
- 不把平台视觉差异误写成不同事件系统。

## 14. Shell J: Creator Rights And Works / 创作者版权与作品管理

### 14.1 Product role and naming caution

该壳适合制作人、作曲、作词、编曲和版权管理职业线。现实参照更接近音乐著作权协会、版权信托和作品登记服务，而不是泛称“音乐制作人协会”。

如果默认世界直接使用现实制度，需要进一步专项调研并避免声称不准确的法定流程。第一版更适合使用一个明确的世界内虚构机构，例如 `Korea Music Creators Registry / 韩国音乐创作者登记中心`，借鉴作品登记、权利份额、使用记录和版税结算的产品逻辑，但不冒充真实官方机构。

“每年申报作品”目前应视为可讨论的世界规则，不能写成现实 KOMCA 的既定要求。更稳妥的基础是：创作者认证后可以持续登记作品、更新权利信息、查看使用记录和版税结算；年度确认可以作为虚构机构的账户/资料复核机制。

### 14.2 Product decisions required

- 机构是现实参照、完全虚构还是世界包可替换；
- 用户身份是制作人、作曲、作词、编曲、出版方还是多个角色；
- 作品、版本、参与者、贡献类型、权利份额和争议状态的 owner；
- “登记”是世界内模拟记录还是具有法律含义；
- 使用记录和版税由哪些 owner facts 产生；
- Wallet 只记录结算结果，还是另有应收/待分配账本；
- 年度申报、税务、合同和真实法规的准确性范围。

### 14.3 V1 required capabilities

1. **身份认证**
   - 申请、材料待补、审核中、通过、拒绝和到期复核；
   - 认证结果属于机构 owner，不能只由 Self Profile 或 AI 文本证明；
   - 支持多个创作身份和公开/私密艺名。
2. **作品登记**
   - 作品列表、草稿、已提交、审核中、已登记、退回和争议；
   - 标题、版本、创作者、贡献类型、份额、发行/使用引用和稳定 revision；
   - 参与者份额总和、重复作品和版本冲突 fail closed；
   - 音频、歌词、合同和证明材料只保存 owner refs。
3. **权利与使用**
   - 作品详情显示权利参与者、登记状态和历史 revision；
   - 使用记录按演出、广播、网络、复制或其他世界内分类展示；
   - Claim、申报和 owner-confirmed usage 分开。
4. **版税与结算**
   - 待结算、已结算、争议和更正；
   - 结算单列出期间、作品、使用类型、金额、扣除和来源；
   - Wallet 只在机构确认付款后生成流水；
   - 列表金额和 Wallet 流水使用稳定 settlement reference 对账。
5. **申报与提醒**
   - 作品资料更新、身份复核、缺失信息和结算通知；
   - 若采用年度确认，必须明确它是世界内机构规则；
   - Calendar/Reminders 可以承载截止日期，但不能成为作品 owner。
6. **质量与恢复**
   - 大量作品分页、筛选、搜索和多贡献者长文本；
   - 金额、币种、负数调整、零版税和迟到更正；
   - 保存失败、重复提交、刷新、备份、恢复和 source revision 冲突。

### 14.4 Event integration

可复用事件应建立在真实 owner 状态上，例如：

- 登记材料缺失，需要用户补充；
- 权利份额存在冲突或合作者提出 Claim；
- 某次已确认广播/演出使用进入待分配；
- 结算更正、延迟或异常需要联系机构；
- 新作品完成后用户选择是否登记；
- 职业身份和已登记作品使用户具备某类行业通知资格。

事件不能随机创造一首已完成作品、伪造使用记录、自动决定权利份额或直接增加 Wallet 余额。

### 14.5 Later optimization

- 合作者邀请、份额协商和电子确认；
- 出版方、厂牌、经纪公司和海外管理引用；
- 作品版本树、采样/改编许可和争议处理；
- 详细使用统计、结算预测和报表导出；
- 与 Music、Files、Mail、Calendar、Wallet、Community 和 Narrative Timeline 的联动；
- 世界包提供不同国家/类型的机构规则 Adapter。

### 14.6 Explicit exclusions

- 不把虚构流程宣称为真实韩国法律或 KOMCA 规则；
- 不由 Event Runtime 保存作品、份额或版税正文；
- 不让 AI 自动确认作者身份、版权归属或侵权；
- 不把作品登记状态和用户 Self Profile 职业身份混为一体；
- 不在没有 owner-confirmed usage/settlement 时修改 Wallet。

## 15. Shell K: Healthcare / 医疗健康

### 15.1 Product role

医疗是默认现代世界中非常重要的生活基础 App。挂号、预约、到院、候诊、检查、查看报告、缴费、取药和复诊都应在没有随机事件时正常成立。

第一版应明确这是 `in-world simulated healthcare / 世界内模拟医疗`，用于沉浸式生活叙事，不提供现实诊断、急救或医疗建议。现实用户的真实健康数据不应被要求填写，也不应被 AI 根据聊天内容自动推断进入医疗记录。

### 15.2 Product decisions required

- 一个综合 Healthcare App，还是医院/诊所 facade 共享同一 Healthcare owner；
- 医疗机构、科室、医生、排班和预约 slot 的 owner；
- 就诊、检查、报告、处方、药品、费用和保险引用的最小 schema；
- 哪些数据是用户可见、角色可见、医疗机构可见或完全私密；
- 是否允许世界包预置常见健康状态，如何避免把严重疾病当作随意随机内容；
- 报告是 authored fixture、owner-confirmed simulation result，还是可选 AI 辅助解释；
- 现实紧急情况提示和世界内急诊叙事的边界；
- 删除角色、切换世界、备份和恢复时的敏感数据处理。

### 15.3 V1 required capabilities

1. **医疗机构和服务发现**
   - 医院、诊所、体检中心、牙科、心理咨询和药房等可配置类别；
   - 科室、医生/服务、地点、营业时间和可预约日期；
   - Map stable place 引用、通勤估计和到院路线；
   - 搜索、筛选、收藏和最近使用。
2. **线上挂号和预约**
   - 选择机构、科室、服务、医生、日期和时间；
   - 填写最小就诊原因或选择 authored reason，不要求现实敏感资料；
   - 草稿、待确认、已确认、已取消、已改期、已完成和未到诊；
   - Calendar 只在 Healthcare owner 确认预约后接收稳定引用；
   - Agenda Journey 可处理出发、到院和活动执行，但不能证明诊疗结果。
3. **到院与候诊**
   - 预约详情、到院登记、排队/候诊、叫号和完成状态；
   - Map 到达只是地点证据，不自动完成签到、检查或诊疗；
   - 用户可以改期、取消、联系机构或查看准备事项。
4. **检查和体检报告**
   - 报告收件箱：待出、已出、已阅、需复诊和已更正；
   - 报告详情：检查项目、日期、机构、结构化结果、单位、参考说明和 revision；
   - 旧报告被更正时保留历史和更正说明，不静默覆盖；
   - 不让通用 AI 自由生成 canonical 检查数值、诊断或严重疾病；
   - 用户需要时可以请求通俗解释，但解释是辅助内容，不是新的医疗事实。
5. **处方、药房和复诊**
   - 处方摘要、药品/用品引用、用法说明、有效期和开具机构；
   - 药房领取、配送或缺货状态由药房/Healthcare owner 确认；
   - 复诊建议可以生成 Calendar 候选，但必须由用户确认；
   - 不把普通 Reminders 当作医疗处方 owner。
6. **费用与结算**
   - 挂号费、检查费、药费、退款和保险承担部分的明细；
   - Wallet 仅在 Healthcare owner 确认应付和结算后记录流水；
   - 医疗账单和 Wallet transaction 使用稳定 reference 对账；
   - 余额不足、支付失败、撤销和费用更正都有完整状态。
7. **通知和联系**
   - 预约确认、到期提醒、报告已出、复诊要求和费用变化进入系统通知；
   - 点击回到准确预约、报告或账单；
   - 联系机构可使用 Healthcare 内消息、Phone 或 Mail，但不能复制三份会话正文。
8. **隐私、质量和恢复**
   - 锁屏通知默认隐藏敏感报告内容；
   - 角色和 Community 不会自动得知用户医疗记录；
   - 长机构名、长项目名、表格、单位、异常标记、无报告和来源不可用；
   - 桌面/移动端、字体放大、读屏、键盘、safe area 和零横向溢出；
   - committed appointment/report/bill 的备份、恢复和 revision 冲突。

### 15.4 Event integration

医疗事件必须建立在用户主动操作或 Healthcare owner-confirmed fact 上，例如：

- 用户已经预约，机构提出改期或补充准备要求；
- 用户完成检查，报告按正常流程到达；
- 报告存在 authored、owner-confirmed 的需复诊标记，系统提醒用户处理；
- 药房缺货、处方待确认或费用需要更正；
- 用户主动联系机构后，进入 Phone、Mail 或 Healthcare 消息处理链；
- 职业日程与已确认预约发生冲突，由用户决定如何调整。

高影响健康结果不能作为轻率的随机惊吓。严重诊断、急救、伤害、精神健康危机和长期疾病需要独立内容政策、用户控制、owner truth 和明确 no-event/opt-out 路径。Event Runtime 不能根据聊天情绪、当前位置、缺席或 AI 文本擅自创建医疗事实。

### 15.5 Later optimization

- 视频/文字问诊和 Phone 通话壳接入；
- 家庭医生、长期健康计划和复诊周期；
- 保险资格、报销、理赔和账单争议；
- 穿戴设备、运动和睡眠数据，但必须有独立权限与 owner；
- 家属/照护者授权和角色可见范围；
- 疫苗、牙科、心理咨询、康复和慢病管理；
- 医疗文件导出、Mail 附件和 Investigation/Knowledge 的受控引用；
- 不同世界包的医疗机构、技术水平和制度 Adapter。

### 15.6 Explicit exclusions

- 不提供现实诊断、处方、急救或替代专业医疗建议；
- 不要求或自动采集用户真实医疗数据；
- 不根据 Chat、位置、日程或 AI 推断创建 canonical 病情；
- 不让 Event Runtime 保存报告正文、处方或账单；
- 不让 Community、Timeline 或角色记忆自动公开医疗记录；
- 不把 Map 到达或 Activity Session 结束当作完成诊疗的证明；
- 不用随机严重疾病制造戏剧性。

## 16. Scheduled Activities Are Not Events / 演出、录制和练习不是事件本身

### 16.1 Core classification

演唱会、电视节目录制、电台节目、打歌、排练、录音、舞蹈练习、采访、签售和彩排首先是 `scheduled activity / 计划活动`。它们可以在没有任何随机事件时被正常创建、出发、进入、执行和完成。

它们的基础链路应当是：

```text
Calendar confirmed schedule
-> Schedule Orchestrator materialization
-> Agenda Journey travel/activity plan
-> Map Journey and place arrival/entry when needed
-> Activity Session checkpoints and explicit completion
-> owner-confirmed outcome summary
-> optional Narrative Timeline and role-memory projection
```

Event Runtime 只在明确检查点上判断是否出现可选变化：

```text
owner checkpoint
-> local eligibility / no-event path
-> optional incident, opportunity, request, claim, call, message, post, or Mini Scene
-> real owner action
-> correlated owner fact
-> activity continues, changes, or ends
```

### 16.2 Owner matrix

| 内容 | Owner | 不应由谁替代 |
| --- | --- | --- |
| 日期、开始/结束、地点、参与要求 | Calendar | Event Runtime、Community |
| 今日执行计划、travel/activity steps、miss/skip/cancel | Agenda Journey | Calendar projection、Event card |
| 路线、交通、当前位置、到达、地点 session | Map | Calendar、Event Runtime |
| 活动计时、暂停、检查点、完成证据 | Activity Session | Map timer、Event Runtime |
| 节目/演出的行业细节，如 call sheet、setlist、cue、出演顺序 | 未来 Production Activity template 或明确 domain owner | 通用 Event Runtime |
| 偶发变化、一次性随机决定、等待事实、超时、来源和审计 | Event Runtime | owner App 自行复制随机系统 |
| 用户看到的过程文本/场景 | Focus Companion、owner-native UI 或 Mini Scene | 通用事件首页 |
| 已确认的历史摘要 | owner summary -> Narrative Timeline | Event log 直接复制 |

### 16.3 Activity template minimum

每类活动不需要先创建独立 App，但需要可复用 activity template：

- activity type 和 owner；
- required location/place capabilities；
- expected duration 和 arrival/entry requirement；
- ordered checkpoints；
- required/optional steps；
- explicit completion policy；
- participants、staff/contact refs 和可见范围；
- base no-event presentation；
- eligible optional event families；
- late、cancel、skip、partial completion 和 resume 规则；
- owner-confirmed outcome summary。

### 16.4 Example activity templates

#### Concert / 演唱会

基础过程可以包含：到场、后台签到、彩排、候场、正式演出、谢幕、离场。可选事件可以是设备问题、临时曲序调整、嘉宾请求、身体状态提示、后台来访或媒体采访。Event Runtime 不能用一张卡代替整场演出，也不能仅凭计时结束宣称演出成功。

#### Music Show / 打歌节目

基础过程可以包含：到台、妆发、预录、待机、直播/录制、采访、退场。可选事件可以是录制顺序变化、追加采访、服装问题、工作人员请求、粉丝应援消息或舞台片段传播。节目安排和完成结果仍由活动 owner 确认。

#### TV Recording / 电视节目录制

基础过程可以包含：call time、台本确认、彩排、分段录制、补录和结束。可选事件可以是问题临时修改、追加镜头、嘉宾互动、延时或节目方通知。

#### Radio Appearance / 电台节目

基础过程可以包含：到台、资料确认、音频检查、直播/录播、听众互动和结束。可选事件可以是临时选曲、听众问题、主持人追问、电话连线或节目延期。

#### Practice Or Studio Session / 练习室与录音室

基础过程可以包含：进入场地、目标设定、练习/录制段落、休息、复盘和保存成果。可选事件可以是状态调整、成员缺席、设备故障、灵感机会或临时工作请求。

### 16.5 When an independent work app becomes justified

只有当行业活动出现大量不依赖某次事件的重复功能时，才考虑独立 `Production / 工作` App，例如：

- call sheet 和工作人员通讯录；
- setlist、cue、台本、服装和素材检查；
- 多个并行节目/演出的工作台；
- 任务确认、文件、审批和变更历史；
- 行业通知、出演邀约和结算引用。

在达到这个阈值前，优先把活动模板和 Activity Session 做完整，避免再造一个只显示日程卡的空 App。

### 16.6 Event design rule

评审任何“活动事件”时先问：

1. 没有事件时，这个演出/录制/练习能否完整进行；
2. 事件在哪个真实 checkpoint 发生；
3. 受影响的人、设备、交通或安排是谁的；
4. 用户能通过哪个现有 owner capability 处理；
5. 不处理、处理失败或采取意外行为时，owner 如何确认结果；
6. 事件结束后，活动如何继续或改变；
7. 哪些结果进入 Calendar、Agenda Journey、Relationship Runtime、Community、Wallet 或 Timeline。

如果第 1 条不成立，说明事件正在代替基础功能；如果第 3 至第 5 条说不清，说明事件仍只是展示。

## 17. Long-Range Everyday App Horizon / 长期生活 App 版图

### 17.1 Why this catalog exists

“过家家”体验需要的是一个可持续运转的生活世界，不是把所有生活情节写成事件。下面的候选只用于长期产品发现和 owner 预留，不是当前路线图任务。

判断某项能力是否需要独立 App，可以使用四个问题：

1. 没有事件时，用户是否仍会频繁主动打开它；
2. 它是否拥有独立 canonical records、列表、详情、创建/处理和历史；
3. 它是否需要独立通知、搜索、权限、备份和深链；
4. 把它塞进 Chat、Calendar、Map、Wallet 或 Event Runtime 是否会让 owner 语义混乱。

四项中至少三项成立，才值得建立独立 App 或稳定子模块。

Browser/Search/Help 是这一版图中的横向工具壳：它可以发现 owner 已公开的页面并把用户带回来源 App，但不拥有这些页面的 canonical truth。完整的来源模型、用户帮助发布层、世界公共索引、隐私排除、真实 Web Provider、费用降级和 S0-S3 边界由 `BROWSER_SEARCH_AND_HELP_CENTER_PLANNING_HANDOFF.md` 单独定义。

### 17.2 Candidate catalog

| 生活领域 | 可能的 App/子模块 | 普通使用闭环 | 可选事件只负责什么 | 当前建议 |
| --- | --- | --- | --- | --- |
| 医疗健康 | Healthcare | 挂号、就诊、报告、缴费、药房、复诊 | 改期、报告提醒、费用/药品问题 | 高价值独立壳候选 |
| 居住 | Housing | 找房、看房、申请、合同、付款、入住、维修 | 房源变化、改期、材料/维修问题 | 高价值独立壳候选 |
| 邮件 | Mail | 收发、草稿、附件、归档、机构往来 | 正式通知、回复等待、附件补充 | 高价值职业基础候选 |
| 工作与人事 | Work/HR | 合同、排班、请假、工资单、内部公告 | 临时任务、审批、排班变化 | 先证明跨职业复用 |
| 教育与校园 | Campus | 课程、作业、成绩、选课、校园通知 | 调课、截止、社团/考试变化 | 学生世界高价值 |
| 公共服务 | Civic | 身份材料、办事预约、证件、缴费、官方通知 | 材料补充、预约变化、进度通知 | 需世界制度 owner |
| 保险 | Insurance | 保单、保障、缴费、理赔、进度 | 补材料、审核、赔付争议 | 可先作为 Healthcare/Housing 子模块 |
| 水电与物业 | Home Services | 账单、报修、网络、搬家、服务预约 | 停机、维修、费用异常 | 先作为 Housing 后续 |
| 票务与文化 | Tickets | 演出/展览/电影发现、购票、入场凭证 | 开售、抽选、改期、退票 | K-pop 世界高价值 |
| 旅行与酒店 | Travel | 酒店、交通、行程单、入住、退订 | 延误、换房、文件/付款问题 | 需要独立旅行 owner 后再做 |
| 健身与生活习惯 | Fitness/Wellness | 课程、训练、记录、会员和预约 | 课程变化、目标提醒、伙伴邀请 | 可先复用 Activity Session |
| 餐厅到店 | Reservations | 搜索、订位、排队、到店、结账 | 改期、满位、特别安排 | 先验证 Map + Calendar 是否足够 |
| 快递与邮政 | Parcel/Post | 寄件、追踪、取件、签收、退回 | 地址/派送/签收问题 | 可复用 commerce/logistics owner |
| 宠物生活 | Pet Care | 档案、医疗、美容、寄养、用品 | 预约、健康/用品问题 | 有稳定宠物系统后再建 |
| 法律与合同服务 | Legal | 咨询、文件、案件、预约、费用 | 补材料、听证/合同变化 | 高风险，后期独立政策 |
| 银行与信用 | Wallet/Bank depth | 账户、转账、账单、信用、贷款 | 风控、付款争议、到期提醒 | 优先深化现有 Wallet，不新造重复 App |
| 求职与职业网络 | Jobs/Career | 职位、申请、面试、offer、履历 | 面试变化、补材料、机会通知 | 多职业世界可独立 |
| 创作者行业 | Creator Rights/Works | 认证、作品、权利、使用、版税 | 材料、冲突、结算更正 | K-pop 职业重点候选 |
| 粉丝与媒体 | Community/Fandom | 关注、订阅、帖子、艺人消息、公告 | 信息传播、Claim、回应和后续 | K-pop 世界重点候选 |

### 17.3 Recommended life-system clusters

为了减少小组互踩，可以把未来生活 App 按 owner 集群规划：

1. **Identity and institutions**：Contacts、Mail、Work/HR、Campus、Civic；
2. **Place and living**：Map、Housing、Home Services、Reservations、Travel；
3. **Money and contracts**：Wallet、Insurance、Housing contracts、Creator royalties；
4. **Health and care**：Healthcare、Pharmacy、Fitness、Pet Care；
5. **Culture and public information**：Community/Media、Fandom、Tickets、Music；
6. **Execution and history**：Calendar、Agenda Journey、Activity Session、Narrative Timeline；
7. **Hidden coordination**：Event Runtime、Schedule Orchestrator、future World Arc owner。

这些是协作边界，不表示要做七个超级 Store。每个 canonical record 仍保留一个自然 owner。

### 17.4 Event coverage rule for everyday apps

每个新生活 App 在设计时至少准备四种 fixture：

- `ordinary success`：没有事件也能完成正常流程；
- `user-initiated issue`：用户从 owner App 主动发起问题；
- `owner-confirmed change`：机构或业务状态真实变化后通知用户；
- `no action / ignore`：用户不处理时流程如何自然继续、过期或保留。

随机好事、坏事和彩蛋只能建立在这些普通能力与 owner facts 之上。

## 18. Cross-Shell Contracts Required / 跨壳通用技术合同

这些合同应由相应 owner 小组分别实现，不应集中塞进 Event Runtime：

1. **Stable source reference**
   - owner、record type、record id、revision、world id；
   - 可用、删除、撤回、无权限和 revision mismatch 的统一查询结果。
2. **Owner request and owner fact**
   - Runtime 请求一个行为；
   - owner 验证并执行；
   - owner commit 成功后发布 correlated fact；
   - Runtime 只在事实确认后推进。
3. **Deep-link and return context**
   - source app、target route、selected record、return route、return label；
   - 刷新和重开后的 bounded recovery。
4. **Publication and notification reference**
   - committed publication id 与 notification id 分开；
   - 清除通知不删除 publication；
   - 撤回 publication 更新通知可打开状态。
5. **Read-state ownership**
   - Community read state、Messages read state、Mail read state和系统通知 read state相互独立；
   - 打开通知可以请求 owner 标记已读，但必须使用明确 owner Interface。
6. **Persistence receipt**
   - 用户可见成功必须等待 owner durable write；
   - 失败回滚、重试和 stable-id dedupe；
   - committed history 不使用静默条数截断。
7. **Bounded AI context**
   - caller、purpose、permission、world/date scope、recency、entry count 和 character/token budget；
   - 不传 raw Runtime logs、完整 prompts 或无关角色私密内容。
8. **Content and media reference**
   - owner 保留正文和意义；
   - Gallery/Files/Map 等只通过稳定引用参与；
   - 图片失败不能改变 Fact/Claim/Post 语义。

## 19. Suggested Delivery Order / 建议实施顺序

本顺序是分组和评审建议，不修改当前 roadmap queue。

### Phase 0: Finish the nearest existing dependency

1. 按当前路线图单独完成 `CMG-08`；
2. 建立 retained Mini Scene 的留存、复用、分页和管理入口；
3. 证明删除完整场景不影响事件结果、记忆和未来 Timeline。

### Phase 1: First new world-facing shell

1. 先建立 Community/Media 独立 package 和 V1 产品合同；
2. 实现本地固定内容的账号、频道、feed、post detail、订阅和 read state；
3. 不接 AI、不接随机世界事件，先证明普通内容 App 本身完整；
4. 再接一条低影响、owner-fact-backed 的 publication chain；
5. 同时完成必要的系统通知和深链返回。

### Phase 1B: Default-world everyday shells

1. 在不接事件的前提下，先选择 Healthcare、Housing 或 Mail 的一个完整普通使用闭环；
2. 粉丝平台先实现共享 Community/Media owner，再做两个差异化 facade；
3. Creator Rights/Works 先冻结虚构机构和作品/版税 owner，不宣称现实法规准确性；
4. 每个壳先证明列表、详情、创建/提交、失败、恢复和跨 App 返回，再连接可选事件。

### Phase 2: First reusable commerce follow-up

1. 由 Shopping owner 接受一个具体售后产品场景；
2. 复用 EVE-4C 的显式用户发起、Service Case、Phone、Wallet、Map 和 owner fact；
3. 优先考虑改地址、取消/退货、错发、破损或赠礼配送问题；
4. 事件结果可以产生 Community、通知或 Timeline 引用，但不能要求这些壳才能完成普通售后。

### Phase 3: Durable personal history

1. 完成 CJA-6B 产品决策；
2. 实现 Narrative Timeline 只读 V1；
3. 接入 Calendar、Agenda Journey、Map、Activity Session、Event Runtime 和 commerce owner 的有限确认摘要；
4. 再考虑用户笔记、回顾和 AI context。

### Phase 4: Identity-conditioned K-pop event

1. 冻结一个经纪人或公众 idol 事件 fixture；
2. 明确 owner fact、Claim、publication、no-event、ignore 和 stale 路径；
3. 使用 Community、Chat、Phone 或 Calendar 的真实入口；
4. 不先创建通用 World State Store，也不让 AI 决定事实。

### Phase 5: Specialist shells

1. 有明确手机号交流需求后再决定 Messages；
2. 有正式机构/职业长文本场景后再决定 Mail；
3. 有至少一个可玩的探案/玄幻案例后再建立 Investigation/Knowledge；
4. 证明 Event Instance V2 无法承载首个长期世界弧线后，才评估 World State And Arc Ledger。

## 20. Workgroup Acceptance Template / 小组领取任务时必须补齐

```text
Workgroup / 小组：
Candidate shell / 壳：
Owning package / 所属 package：
User-visible result / 用户看到的结果：
Independent ordinary use / 无事件时是否可用：
First entry / 首次入口：
Core screens / 核心页面：
Canonical owner records / owner 记录：
Event Runtime role / Runtime 只负责什么：
Source refs and revisions / 来源引用：
Deep-link and return context / 跳转返回：
Persistence, migration, backup / 持久化：
No-event and provider-failure paths / 无事件与失败：
Accessibility and responsive acceptance / 可访问与适配：
Explicit exclusions / 明确不做：
Reserved files / 独占文件：
Focused tests / 定向测试：
Full checks / 全量检查：
Roadmap approval / 路线图许可：
```

## 21. Definition Of A Complete App Shell / 壳完成标准

一个壳不能只满足“路由能打开、能看到几张卡”。V1 至少必须同时满足：

1. 有清楚的独立产品职责，普通无事件状态也成立；
2. 有完整入口、列表、详情、空状态、错误状态和返回路径；
3. 有明确 canonical owner 和持久化边界；
4. committed write 失败不会显示成功；
5. 有 source reference、revision 和 stale/deleted 处理；
6. 事件接入通过 owner request/fact，不直接改跨模块状态；
7. 刷新、重开、备份恢复和 stable-id 重试不重复创建记录；
8. 桌面和模拟移动端通过可访问性、文本适配、safe area、焦点和零横向溢出；
9. 有本地 fixture、no-event 和 provider-failure 路径；
10. 文档明确当前实现、后续增强和未获准范围。

## 22. Documents To Read Before Assigning A Shell

- 所有壳：`docs/roadmap/TODO_ROADMAP.md`、本 package `README.md` 和 `STATUS_AND_HANDOFF.md`；
- Community、职业事件、世界传播和 Investigation：`docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md`；
- Timeline：`docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`；
- Shopping/售后：`docs/architecture/USER_INITIATED_COMMERCE_INTERACTION_EVENT_ARCHITECTURE.md`；
- Mini Scene：`docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` 和 roadmap `CMG-08`；
- Healthcare、Housing、Mail、粉丝平台和 Creator Rights/Works：先通过 `docs/pm/TASK_PACKAGE_INDEX.md` 明确 owner；涉及 Calendar、Map、Wallet、Chat、Phone 或 Community 时分别读取对应 package；
- Event Runtime 接入：`docs/process/EVENT_WORKFLOW.md` 和 `docs/architecture/SIMULATION_EVENT_ENGINE.md`；
- UI 壳和 Home/App Store 入口：`docs/pm/visual-and-ia-governance/README.md` 与 `STATUS_AND_HANDOFF.md`；
- 新 owner：先在 `docs/pm/TASK_PACKAGE_INDEX.md` 中建立或明确 package，再开始 route、Store 和 schema。
