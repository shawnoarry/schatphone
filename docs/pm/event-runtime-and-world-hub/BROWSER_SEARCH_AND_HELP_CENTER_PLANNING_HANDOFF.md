# Browser, World Search, And Help Center Planning Handoff / 浏览器、世界搜索与使用帮助规划交接

Updated: 2026-08-23

Status: `PLANNING_HANDOFF_ONLY / IMPLEMENTATION_NOT_AUTHORIZED_BY_THIS_DOCUMENT`

## 1. Purpose / 目的

本文档定义 SchatPhone 中 Google-like 工具型 `Browser / 浏览器` App 的产品边界。搜索是其第一核心能力，结果可以来自三个彼此可辨认的空间：

1. `使用帮助 / Help`：SchatPhone 面向用户的结构化操作说明；
2. `当前世界 / World`：当前虚拟世界内已经由 owner 提交的公开知识、地点、机构、人物资料、帖子和新闻；
3. `互联网 / Web`：通过可替换外部 Search Provider 获取的真实网页结果。

Owner App 可以暴露适合公开检索的应用内容，但必须归入 `Help` 或 `World` 的明确来源类型，不能成为模糊的第四份 canonical 数据。

本文档不是路线图、实现许可或 API 采购决定。当前工程优先级仍只由 `docs/roadmap/TODO_ROADMAP.md` 管理。创建 route、Store、schema、migration、Home/App Store 入口、外部代理或凭据配置前，必须单独接受 Browser 所属 package、目标成熟度和实施切片。

## 2. Product Position / 产品定位

Browser 是用户主动查找信息的普通工具 App，不是 Event Home、World Hub 的公开替代品，也不是由模型即时编造世界页面的问答框。

第一版必须在没有事件、没有 AI、没有外部 Search API、没有网络时仍有独立价值：用户可以检索使用帮助和已缓存或本地的当前世界公开资料，并从结果跳转到对应 App 或本地虚拟页面。

真实互联网搜索是可插拔增强项。外部 Provider 不可用、额度耗尽或用户关闭联网搜索时，Browser 仍需保留完整的本地搜索、帮助中心、历史和收藏路径。

## 3. User-Visible Source Model / 用户可见来源模型

### 3.1 Required source labels

每条结果和每个页面都必须持续显示来源，不能只在搜索页显示一次：

| Source | 用户标签示例 | 内容含义 | Canonical owner |
| --- | --- | --- | --- |
| `help` | `使用帮助` | 产品操作、功能状态、故障排查 | 未来 Help Content owner；Browser 只建索引 |
| `world` | `现代首尔`、当前世界名称 | 虚拟世界内已经存在的公开知识与页面 | WorldBook、Map、Community/Media 或来源业务 owner |
| `web` | `互联网` / `Web` | 真实互联网结果 | 外部网站；Browser 只持有临时结果摘要和链接 |

虚拟页面可以使用沉浸式虚构域名，例如机构站点或媒体站点，但地址栏和页面信息中必须保留当前世界标识。虚构域名不得伪装成真实政府、医疗、金融或品牌官方网站。

### 3.2 Default result presentation

推荐默认使用一个结果列表，按相关度混排，但每条结果必须有高辨识度来源标签，并提供：

- `全部`；
- `使用帮助`；
- `当前世界`；
- `互联网`。

如果同一查询同时命中产品操作和虚拟世界内容，例如“怎么修改外卖地址”，可以同时展示：

- 使用帮助：如何在允许的订单阶段修改配送地址；
- 当前世界：某外卖平台公开的配送规则页面；
- 互联网：真实网页结果。

结果不能合并成一段不标来源的 AI 答案。

### 3.3 Result projection

统一结果 projection 至少应包含：

```text
resultId
sourceKind: help | world | web
sourceLabel
title
snippet
targetKind: help_article | local_page | owner_route | external_url
targetRef
worldId? / worldRevision?
ownerModule? / ownerRecordId? / ownerRevision?
publishedAt? / updatedAt?
language
availability
```

`web` 结果不需要伪造 owner revision；`help` 和 `world` 结果必须能够判断 stale、deleted、off-world 或当前版本不适用。

## 4. Help Center Integration / 使用帮助中心融合

### 4.1 Contextual help path

用户不必知道说明属于哪一份开发文档。Browser 应成为统一的产品帮助入口，并允许每个 App 从自己的上下文直接打开针对性搜索。

示例：

- Food Delivery 订单页打开 Browser，并预填 `修改配送地址`；
- Wallet 流水详情打开 `为什么这笔交易不能删除`；
- Calendar 打开 `日历、日程和行程有什么区别`；
- Map 打开 `当前位置、地点进入和行程到达的区别`。

传入的 route、appId 和功能版本只用于缩小检索范围和排序，不能成为用户意图、事件事实或操作已经完成的证明。

### 4.2 Help article is not a raw developer document

不能把 `docs/**` 下的内部架构、路线图、测试说明和开发交接全文直接暴露给用户。面向用户的帮助内容需要单独的发布层，至少具有：

```text
helpArticleId
appId
featureId
title
summary
bodyBlocks
keywords[]
locale
minimumProductVersion?
maximumProductVersion?
availability: available | partial | planned | retired
deepLink?
relatedArticleIds[]
updatedAt
contentRevision
```

`planned` 内容可以解释“该功能尚未开放”，但不能写成已经存在的操作步骤。过期版本必须 fail closed：显示版本不适用并指向当前文章，而不是让用户执行已删除的入口。

### 4.3 Help result actions

帮助结果至少支持：

- `打开说明`：阅读完整帮助文章；
- `前往相关页面`：在功能存在且 deep link 有效时跳到 owner App；
- `相关问题`：继续本地检索；
- `仍未解决`：后期可进入反馈、诊断或 AI 辅助解释，但 V1 不要求。

从 owner App 进入帮助、再返回时，应恢复原 App、原记录和原滚动位置。帮助文章不得直接修改 owner 数据。

### 4.4 Local search behavior

V1 使用本地确定性全文检索即可，覆盖标题、摘要、关键词、App 名、常见同义词和正文片段。它必须：

- 零 token；
- 离线可用；
- 中文、英文及常见产品词能够匹配；
- 区分“没有相关说明”和“说明仅适用于其他版本”；
- 不依赖模型猜测用户到底想做什么。

后续可以增加基于已发布帮助文章的 AI 解释，但模型只允许引用当前可用文章并附来源。模型回答不能创造按钮、权限、业务规则或完成状态。

## 5. Local World Search / 当前世界搜索

### 5.1 Searchable public sources

初始 allowlist 建议按以下顺序建立：

1. WorldBook 中明确标记为公开、可检索的世界知识；
2. Map 的公开地点、机构和设施详情；
3. 公开角色、艺人和机构资料的受限 projection；
4. Community/Media 将来提交的公开帖子、新闻和频道页面；
5. 公开 Calendar 活动、票务、住房、医疗机构、Creator Rights 公共说明页等 owner projection。

第一版最安全的本地世界数据源是 `WorldBook + Map`。Community/Media 尚未成为生产 owner 前，Browser 不应自己生成新闻流或帖子库来填空。

### 5.2 Explicit private-data exclusions

以下内容默认永远不能进入世界公共索引：

- Mail 正文、草稿和附件；
- Chat 私聊、服务会话正文和角色记忆；
- Phone 通话、转写和摘要；
- Healthcare 报告、诊断、预约隐私和个人资料；
- Shopping/Food Delivery 订单、地址、售后和支付详情；
- Wallet 账户、余额、流水和单据；
- 私人 Calendar、Agenda Journey、当前位置和行程历史；
- Contacts 私有备注、关系标签、内部 profile IDs；
- Event Runtime 日志、待审核请求、World Hub 笔记和调查中的私有线索。

即使用户想搜索这些内容，也应由各 owner App 的私有搜索负责，不能因为 Browser 有统一搜索框就建立全手机私密内容索引。未来若增加 `设备内私人搜索`，必须作为独立权限和独立索引产品决定。

### 5.3 Projection, not duplicate truth

世界搜索索引是只读 projection。每条索引记录保留 owner、stable ID、revision、worldId、可见范围和更新时间。Owner 更新、撤回、删除、换世界或权限变化时，索引必须失效或重建；Browser 不保留第二份可继续显示的 canonical 正文。

索引可以缓存用于检索的标题、摘要和 token，但不能绕过 owner 的 tombstone、visibility 或 revision 检查。打开结果时再次确认来源可用性；stale/off-world 结果必须 fail closed。

## 6. Real Web Search / 真实互联网搜索

### 6.1 Provider-neutral adapter

实现不应绑定 Brave 或任何单一供应商。建议统一接口：

```text
searchWeb({
  query,
  locale,
  country?,
  safeSearch,
  count,
  cursor?,
  requestId
}) -> {
  providerId,
  results[],
  nextCursor?,
  fetchedAt,
  cachePolicy,
  quotaState?
}
```

Provider Adapter 只负责真实网页结果；Local Help Adapter 和 Local World Adapter 是独立来源。统一聚合器负责来源标签、去重、排序、分页和失败隔离。

一个 Provider 失败时，不得清空已经成功的本地结果。`全部` 页可以显示“互联网结果暂时不可用”，同时继续展示 Help 和 World。

### 6.2 Credential and network boundary

- 共享 API key 不得打包进前端；
- 正式共享服务必须通过受控后端/Worker，执行额度、来源、超时和滥用限制；
- 也可以支持用户自己的 API key，但必须通过现有安全凭据流程保存，不能出现在日志、导出或普通设置文本中；
- 查询发送到外部 Provider 前必须让用户知道当前会联网；
- private owner context、当前角色资料、世界事实和本地历史不得自动拼接到真实 Web 查询；
- 外部结果摘要只做短期缓存，不长期复制第三方网页正文。

### 6.3 Opening external pages

许多真实网站禁止 iframe、存在登录/Cookie/追踪或需要完整浏览器能力。V1 应允许在系统浏览器或受控外部标签页打开，而不是承诺所有网页都能嵌入 SchatPhone。

本地虚拟页面和帮助文章可以在 App 内完整呈现。真实网页打开失败时仍保留原搜索结果和返回上下文。

### 6.4 Zero-cost external fallback

当没有 API、免费额度耗尽或 Provider 被禁用时，可以提供“在外部搜索引擎中继续搜索”。该模式将查询交给用户选择的真实搜索网站，不能把结果抓回 SchatPhone 混排，但不需要 SchatPhone 自己支付按次 API 费用。

此降级仍会把查询发送给外部搜索网站，因此不能伪装成离线或私密搜索。

## 7. Provider Cost Snapshot / 搜索服务成本快照

以下仅是 **2026-08-23 的规划快照**，不是永久价格合同。实施、采购和发布前必须重新核对官方价格、免费额度、区域可用性、付款要求、服务条款、隐私政策和内容使用限制。

| Provider / mode | 当前公开免费能力 | 当前公开付费信息 | 适合程度与注意事项 |
| --- | --- | --- | --- |
| Brave Search API | 每月提供 `USD 5` credits；按当前 Web Search 单价约等于 1,000 requests。注册免费使用仍要求银行卡用于反滥用验证 | Web Search `USD 5 / 1,000 requests` | 传统 Web 搜索结果形态最接近目标；免费额度适合开发和小规模验证，不适合假设为多人产品的永久免费后端 |
| Tavily | Free tier 每月 1,000 API credits，官方说明不要求银行卡；基础搜索通常消耗 1 credit | 超出免费层后按其当前 plan/credit 规则 | 偏 AI 检索和答案工作流；可作 adapter，但结果体验不应直接假定等同传统 Google 页面 |
| Exa | 官方当前说明含新账户 credits，并提供无需付款方式的 monthly free credits | 搜索、内容和附加能力按各自价格计算 | 偏语义/AI 检索；适合实验，正式用量需按请求能力重新测算 |
| Serper | 当前首页提供 2,500 free queries，注册不要求银行卡 | 付费起步价与批量单价按官方当前套餐 | 更像开发试用额度，不能默认理解为每月自动续期；正式依赖前需复核结果来源和服务条款 |
| Self-hosted SearXNG | 软件开源，无按查询 API 授权费 | 仍有服务器、带宽、维护、上游限制和反爬成本 | 可控但不是“零成本托管搜索”；公共实例不应成为生产后端，稳定性和上游可用性需自行负责 |
| External search handoff | SchatPhone 无 Search API 按次费用 | 用户通过外部搜索站点访问，成本/隐私由对应站点规则决定 | 最可靠的零采购降级，但无法把 Web 结果合并到 SchatPhone 原生列表 |

Official references checked on 2026-08-23:

- Brave Search API pricing: `https://brave.com/search/api/`
- Brave Search API documentation/dashboard: `https://api.search.brave.com/app/documentation/`
- Tavily API credits: `https://docs.tavily.com/documentation/api-credits`
- Exa pricing: `https://exa.ai/docs/reference/pricing`
- Serper pricing: `https://serper.dev/`
- SearXNG documentation: `https://docs.searxng.org/`

### 7.1 Recommended cost posture

1. S0/S1 先完成 Local Help + Local World，不依赖外部 API；
2. 开发验证期通过 provider-neutral Adapter 使用 Brave 或其他免费额度；
3. 默认设置请求上限、分页上限、短期缓存和明确额度状态；
4. 额度不可用时降级为本地结果 + 外部搜索 handoff；
5. 有真实用户量后再依据查询次数、结果质量、区域、延迟和隐私决定采购；
6. 不允许前端静默切换到更昂贵套餐，也不把试用额度写成产品承诺。

## 8. Search, Ranking, And AI Boundary / 检索、排序与 AI 边界

### 8.1 Deterministic baseline

本地 Help 和 World 结果优先使用可解释的确定性排序：标题精确匹配、App/实体名称、关键词、正文相关度、当前版本/世界可用性、更新时间和用户明确选择的 scope。

不能因为模型觉得某条内容“更有戏剧性”就提升世界事实，也不能根据坐标、角色身份、私聊内容或历史订单暗中改写真实 Web 查询。

### 8.2 Optional AI answer layer

以后可以在明确开启后生成带引用的摘要，但必须遵守：

- 每个结论都能回到 Help、World 或 Web 来源；
- `Fact`、`Claim`、`Post` 和真实网页说法不相互升级；
- 不把真实世界资料写入虚拟世界 canonical truth；
- 不把虚拟世界页面当作真实互联网事实；
- 无来源或来源冲突时明确说明，而不是补写“合理答案”；
- AI 不拥有搜索历史、帮助文章、世界页面或外部网页正文。

第一版 Browser 壳不需要 AI 才能成立。

## 9. Event And World-Evolution Boundary / 事件与世界演化边界

Browser 可以让用户发现事件在世界中的公开回声，但不能成为事件真相 owner。

正确链路：

```text
owner-confirmed fact or explicit claim
-> Community/Media or institution owner commits a publication
-> Local World Search indexes the committed public record
-> user discovers it through Browser
```

错误链路：

```text
user searches a phrase
-> Browser invents a virtual news page
-> Event Runtime treats the page as proof
```

搜索行为本身只证明“用户提交过一次查询”。它不能证明用户相信结果、接受某种说法、掌握某条线索、完成事件、产生关系变化或打算执行某项操作。若未来 Investigation 需要记录用户明确收藏或提交某条线索，必须由 Investigation owner 接收一次明确动作并重新验证来源。

Browser 不注册通用 Event Surface。事件可以通过正式公开页面、站内通知或 owner-native 深链进入 Browser，但普通搜索和浏览始终独立可用。

## 10. History, Bookmarks, Tabs, And Privacy / 历史、收藏、标签页与隐私

### 10.1 Recommended S1 state

为使 Browser 不只是搜索框，S1 建议包含：

- 本地搜索历史，可逐条删除、全部清除并可关闭记录；
- 书签，保留来源类型和 stable target reference；
- 最近访问；
- 一个当前页面上下文和可靠返回；
- 简单标签页外观可以延后，真正多标签生命周期不作为首个 S1 硬门槛。

### 10.2 Privacy rules

- 历史和书签属于用户设备私有状态，不进入世界搜索索引；
- 不发送本地历史给 Web Provider 进行个性化；
- 清除历史不删除 Help、World owner 内容或外部网站记录；
- 删除书签不删除目标页面；
- 外部 URL 的追踪参数应在可安全识别时清理，但不能破坏必要签名链接；
- backup/restore、跨设备同步和无痕模式属于 S2 决策，不能在 S1 伪造。

## 11. Recommended Shell Stages / 建议壳阶段

### S0: Visual shell

- Browser 首页和搜索框；
- `全部 / 使用帮助 / 当前世界 / 互联网` 来源切换；
- fixture 结果页、帮助详情、虚拟页面、空/加载/失败/离线状态；
- 外部网页 handoff 说明；
- desktop、simulated Pixel 5、day/night、长文本、字体放大、键盘和读屏基础；
- 不调用 Provider、不保存生产历史、不注册事件。

### S1: Ordinary-use shell

- Local Help 全文检索；
- WorldBook + Map allowlisted public projection 检索，或在正式 owner 未冻结前使用稳定 fixture repository；
- 帮助文章 deep link 和完整 return context；
- 本地历史、书签、最近访问和关闭历史记录；
- Provider Adapter 可以保持未配置；若接入免费额度，只作为可关闭的 Web source；
- 无 Provider、无网络、额度耗尽时，本地路径完整成立。

### S2: Owner-ready product

- 明确 Browser/Help owner package、Store、schema、migration 和 backup；
- Help 内容发布/版本合同；
- owner public-search projection registry；
- revision、tombstone、world isolation、权限和 stale fail-closed；
- 后端 Provider gateway、credential、quota、cache、safe-search、privacy 和 error contract；
- 多标签、下载、无痕或完整网页嵌入仅在分别接受后加入。

### S3: World/event integrated product

- Community/Media committed publication 可被世界搜索发现；
- owner-native 通知、邮件或帖子可以深链到 Browser 页面；
- Event Runtime 只保留 publication request 和稳定引用；
- 搜索、打开和收藏不被误当作事件完成；
- focused unit、跨 App E2E、隐私/权限和 stale/off-world fixtures 完整。

## 12. S1 Acceptance / 第一版验收

1. 用户不联网也能找到至少一个真实的产品使用说明并跳到正确 App；
2. 用户能检索当前世界中的公开地点或知识，结果不复制 owner truth；
3. Help、World、Web 在列表、详情和地址/页面信息中始终可区分；
4. 不存在把 Mail、Chat、Phone、医疗、订单、钱包、私人日程或位置加入公共索引的路径；
5. Web Provider 缺失、失败、超时、额度耗尽时，本地结果和返回上下文不丢失；
6. history/bookmark 删除语义明确，不删除目标 owner 数据；
7. stale、deleted、off-world、wrong-revision 和 unsupported-version 全部 fail closed；
8. 搜索不会调用 Event Runtime、创建 world fact、触发事件或推断用户意图；
9. desktop 与 simulated Pixel 5 在结果、长标题、长 URL、来源标签和帮助正文中零横向溢出；
10. day/night、语言、字体放大、触控目标、键盘焦点、读屏名称和减少动态效果通过；
11. 外部 API key 不出现在前端 bundle、普通日志、导出或错误文案；
12. 价格和免费额度在实现前重新核验，不以本规划快照作为账单保证。

## 13. Suggested Workgroup Split / 建议工作组拆分

| Workgroup | Scope | Must not touch |
| --- | --- | --- |
| Browser shell and IA | 首页、结果、来源切换、详情、历史、收藏、返回上下文 | Event Runtime、owner Store、共享 API key |
| Help content contract | 用户帮助 schema、版本、deep link、示例文章、发布检查 | 直接暴露内部开发文档、修改业务 owner truth |
| Local search projection | Help/World index、ranking、revision、tombstone、world isolation | 私有 owner 内容、复制 canonical bodies |
| Web provider gateway | adapter、credential、quota、cache、timeout、safe search、privacy | Browser UI owner、世界事实、事件判定 |
| Shared QA | desktop/mobile/a11y/offline/stale/provider-failure E2E | 借测试重构无关模块 |

共享路径如 router、Home/App Store registry、Settings 凭据、backup registry 和系统网络代理必须串行整合，不建议多个小组同时编辑。

## 14. Decisions Required Before Implementation / 开工前决定

1. Browser 的正式 package owner，还是先作为 fixture-backed S1 壳；
2. 第一批 World sources 是否固定为 `WorldBook + Map`；
3. S1 是否立即启用 Web Provider，还是只提供外部搜索 handoff；
4. 默认结果采用混排还是按来源分组；本文推荐混排 + 强来源标签；
5. Help 内容最初由哪些功能提供，建议先覆盖 Calendar/Agenda Journey/Map、Food Delivery、Wallet 和 Mail；
6. 搜索历史默认开启还是首次询问；
7. 外部页面在系统浏览器、应用内受控标签页或两者中如何选择；
8. safe-search 与地区/语言设置进入 S1，还是随 Web Provider 推迟到 S2；
9. 免费 Provider 只用于开发，还是允许用户自带 key；
10. Browser 是否进入当前壳生产 wave；这必须由 Roadmap 单独晋升，本文不自动排队。

## 15. Recommended First Proof / 推荐的首次证明

在不采购 API 的前提下完成一条完整普通路径：

```text
用户在 Browser 搜索“日历、日程和行程有什么区别”
-> 看到来源为“使用帮助”的针对性说明
-> 打开文章，理解 Calendar / Agenda Journey / Map 的分工
-> 点击“前往日历”
-> 返回 Browser 后仍停留在原文章和原搜索上下文
```

同时提供一条世界路径：

```text
用户搜索一个当前世界的广播机构或地点
-> 看到来源为当前世界的 WorldBook/Map 结果
-> 打开虚拟机构页或 Map place detail
-> 返回 Browser 后结果筛选和位置保持
```

这两条路径已经能证明 Browser 是产品工具，而不是等待 Event Runtime 或付费 API 才能成立的空壳。
