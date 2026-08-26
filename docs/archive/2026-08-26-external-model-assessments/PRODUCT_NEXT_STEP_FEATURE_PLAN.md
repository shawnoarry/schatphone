# 封存声明 / Archived External Assessment

- 封存日期：2026-08-26
- 状态：`OBSOLETE_EXTERNAL_ASSESSMENT`，不具备路线图、优先级或实施授权效力
- 封存原因：该模型输出建立了独立的 P0/P1/Sprint 队列，部分内容与当前 `TODO_ROADMAP.md` 重复，部分优先级与现行 `ON_HOLD`、备份凭据契约和已集成事实冲突，并包含已经漂移的文件尺寸数据
- 可参考部分：真机/PWA 发布证据、`CMG-08` 至 `CMG-10` 的依赖顺序，以及若干明确不应提前启动的方向；这些内容仅以当前路线图和对应 package handoff 的表述为准
- 替代权威：`docs/roadmap/TODO_ROADMAP.md`、`docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md` 及各 owning package handoff
- 使用限制：不得从本文件直接创建任务、恢复其 Sprint 顺序或引用其中 P0/P1 作为当前项目状态

以下保留模型原文，仅供审计其判断来源和偏差。

# SchatPhone 下一步功能规划（Next-Step Feature Plan）

> 产出角色：产品经理「许清楚（Xu）」
> 生成日期：2026-08-26
> 事实来源（唯一权威）：`docs/overview/PROJECT_MASTER_GUIDE.md` §9、§5.2；`docs/roadmap/TODO_ROADMAP.md`（2026-08-26）；`docs/pm/TODO_PM_STATUS_REPORT.md`；`docs/pm/PRODUCT_MANAGER_PROJECT_BRIEF.md` §6
> 定位：本文件只回答"下一步可以做什么功能"，不重写 PRD，不新增未决策需求。

---

## 1. TL;DR

**下一步以"守住安全/治理底线 + 收口可用产品预览（真机/PWA 证明）+ 一个命名架构热点切片"为发布前主线；仅在预览与治理达标后，受控推进 Mini Scene 生产触发器、Chat 群聊编排、Camera/Gallery 策展等已集成模块的深度打磨；所有守卫/推迟项（闭页自治、Cheats、高影响自动关系事件、Gallery 关系记忆、超大视图重构、个人 R2 远程备份）本阶段一律不启动。**

---

## 2. 功能候选池（按优先级）

> 看板对应关系取值：
> - **A = 看板上已有未完成验收项**：当前 roadmap/治理台账已列出、尚未验收。
> - **B = 基于模块缺口的新想法**：来自 §5.2 模块完成矩阵的"主要剩余缺口"，仍需先立项。
> - **C = 守卫/待决策项需先拍板**：当前为 ON_HOLD / DECISION，须先有产品/技术决策才能开工。

### 2.1 P0 — 发布前必须收口（价值：守住底线 + 宣称首个可用预览）

| 序号 | 功能名 | 一句话价值 / 用户故事 | 建议归属模块 | 依赖与前置条件 | 看板对应关系 |
| --- | --- | --- | --- | --- | --- |
| P0-1 | 真机产品验证 + 可安装 PWA 闭环 | 新用户在真实手机上装好 PWA、配置自有 AI、收到首条回复、备份可回滚，才能宣称"首个可用发布" | Shell / QA | 依赖 4.5-3 CI 发布门禁、发布提交 `a1418ed`；需在设备矩阵上验证 safe areas/键盘/触摸/PWA 重启动 | **A**（4.9 第 4 阶段 Hosted product proof = TODO） |
| P0-2 | Mini Scene 完整场景留存拆分（CMG-08） | 用户可选择"保留完整小剧场场景"并回放/管理，且彻底移除 120 条产物的静默截断 | Mini Scene / Event Runtime | 依赖 CMG-02（持久化前确认）已 DONE；需迁移/回滚测试 | **A**（4.5-CMG 台账 `CMG-08 = TODO`，下一个可分配的 P0 项） |
| P0-3 | 共享体验读取成本控制 + 迁移/恢复收口（CMG-09/10） | 联系人/世界中枢分页读取、Chat 只读当前关系+相关记忆，且能在 >500/240/120 行上证明保存失败/重开/恢复 | Module Architecture | 依赖 CMG-06/07 已 DONE | **A**（4.5-CMG 台账 `CMG-09`/`CMG-10 = TODO`） |
| P0-4 | 凭据备份策略收口 | 备份不再无意识泄露 AI API Key；给出"redacted/shareable 导出"或"明确分离密钥"的确定方案 | Settings / Backup | 危险确认已 DONE、prod/full audit 0/0；redacted 导出当前仍是"separate future contract" | **C**（需先拍板 redacted 导出合约；看板 4.5-2 标注为待决策） |

### 2.2 P1 — 发布硬化 + 受控深度（价值：降低最关键风险、增加可见产品深度）

| 序号 | 功能名 | 一句话价值 / 用户故事 | 建议归属模块 | 依赖与前置条件 | 看板对应关系 |
| --- | --- | --- | --- | --- | --- |
| P1-1 | World Pack 真机端到端验证与聚焦加固 | 在真机上走通 Book→WorldBook→World Pack→App Store→目标 App→Chat 服务，仅修观测到的真问题 | World Pack / App Store | 依赖 4.6 V1；与发布设备矩阵重叠 | **A**（4.6 剩余验收项） |
| P1-2 | CI/发布门禁外部校验 + 一个命名架构热点切片 | 验证外部 required-check/环境保护策略；选一个命名 seam（如 `systemStore` 门面或 `ContactsView`）做拆分，降耦合不伤语义 | CI / Module Architecture | 依赖 4.5-3 workflow 已实现；只做"一个"切片 | **A**（4.5-3 外部校验未验 + 4.5 热点分解 TODO） |
| P1-3 | Mini Scene 生产事件触发器 Adapter | 由已存在事件实例 + 源 owner 事实自动构造请求、经 AI、按 owner 校验选择，解锁首个自动小剧场 | Event Runtime / Mini Scene | 依赖 4.8 文本 Shell 已 DONE；Calendar 无触发器/按钮 | **A**（4.8 交付顺序第 6 步 TODO） |
| P1-4 | Chat 群聊多角色发言编排（V1 起点） | 群聊中出现多角色轮流发言/被 @ 触发，而非当前 target/member/reply 模式 V1 | Chat | 依赖群聊 V1；受 P1-2 热点约束（`ChatView` 4776 行） | **B**（§5.2 Chat 缺口：deeper group speaker orchestration） |
| P1-5 | 普通跨模块后果流收尾 + 物流分享 | 一条普通 Food Delivery/Shopping 后果流被浏览器证明；物流分享与后续打磨 | Shopping / Food Delivery / Wallet / Chat | 依赖"一条普通 Shopping 礼物流"已证明 | **A**（4.9 第 3 阶段部分 + 4.6 物流分享） |
| P1-6 | Camera 个人图床存档 + Gallery People 策展 | 用户把 Gallery 资产存入自有图床（不静默上传）；Gallery 出现"人物/参考"智能视图 | Camera / Gallery | 依赖 4.10 首切片、图床 token（`ACCEPTED FOLLOW-UP 2026-08-11`） | **A**（4.10 已接受后续项）+ **B**（§5.2 Gallery/人物缺口） |
| P1-7 | Calendar/Agenda Journey 后续能力 | 预约自动入档、活动会话媒体调用、CJA-6B Narrative Timeline | Calendar | 依赖 CJA-1..6A 已 DONE | **A**（CJA-6B = TODO/需决策；其余为部分项） |
| P1-8 | 跨模块事件体验 EVE-5（Mini Scene/媒体扩展） | 在事件上呈现更丰富文本/互动小剧场，解锁 CG 图像生成适配 | Event Runtime | 依赖 4.8 HTML 安全 Presenter + 安全评审先通过 | **C → A**（EVE-5 需 4.8 前置门通过后才解锁） |

### 2.3 P2 — 质量证明与更长尾扩展（价值：打磨已集成模块）

| 序号 | 功能名 | 一句话价值 / 用户故事 | 建议归属模块 | 依赖与前置条件 | 看板对应关系 |
| --- | --- | --- | --- | --- | --- |
| P2-1 | TTS 稳定端到端中文质量/播放证明 + Chat 朗读 | 中文 TTS 在 MeloTTS/MiniMax 上给出稳定质量/成本/播放证据，并提出 Chat 朗读合约 | TTS / Chat | 依赖 4.15 Worker 已部署；provider `3043` 恢复后 | **A**（4.15 剩余门） |
| P2-2 | Music 真机音频焦点/媒体控制/PWA 证明 + 可选真键冒烟 | 真机上验证音频焦点/耳机锁屏控制/安全区/PWA 重启；可选真实用户 Key 冒烟 | Music | 依赖 4.13 已集成 | **A**（4.13 剩余门） |
| P2-3 | Map MJE-5 主动区域探索 / MJE-6 公交拓扑 | 主动探索（时间/方式选择+keep/discard）+ 静态公交拓扑，后再评估独立 Transit App | Map | 依赖 4.11 MJE-1/2/4 | **A**（MJE-5/6 TODO）+ **C**（Transit App 需独立使用门槛） |
| P2-4 | Assets / Stock 更深用户面循环 | 把"可用但浅"的资产/股票 MVP 做成更清晰的日常循环，明确上线价值 | Assets / Stock | 依赖现有 MVP | **B**（§5.2 缺口） |
| P2-5 | App Shell 晋升 S2/S3（如 Career→事件家族） | 把 4.16 的 S1 壳（如 NEXT 职业）晋升为有 owner Store 的 S2，再接事件链 S3 | 多个 Shell App | 依赖 4.16 S1 已 DONE；需单独接受 owner 实现 | **A**（4.16 S2/S3  seams 已文档化未实现） |
| P2-6 | Wallet 更深经济系统 | 在"卡包+源账本"之上探索更深经济玩法 | Wallet | 依赖 4.9 Wallet 基础 | **C**（deeper economy 仍是产品决策） |

---

## 3. 推荐执行顺序（3 个 Sprint 式推进序列）

> 排布原则：**依赖优先 → 风险最低 → 发布价值最高**；严格遵循 §9 当前执行方向（先安全/治理/预览，后扩展）；任何热点重构只做"一个命名切片"；守卫项不进 Sprint。

### Sprint A — 收口可用产品预览 + P0 治理（发布前最关键）
- **范围**：P0-1（真机/PWA 闭环）、P0-2（CMG-08）、P0-3（CMG-09/10）、P0-4（凭据备份决策+实现）
- **为什么这样排**：这 4 项是宣称"首个可用发布"的最后 gates；均为边界已冻结、隔离良好的台账项（CMG-08/09/10 有确认验收证据），无广重构、风险最低、价值（发布可信度）最高。
- **退出标准**：真机矩阵证据齐全 + PWA 重启动可用 + Mini Scene 无静默截断 + 备份凭据策略确定并已回归。

### Sprint B — 发布硬化 + 一个命名热点切片 + World Pack 真机加固
- **范围**：P1-2（CI 外部校验 + 一个热点切片）、P1-1（World Pack 真机验证）、P1-5（跨模块后果流收尾+物流分享）
- **为什么这样排**：发布信心（CI 外部校验）与最大可维护性风险（`systemStore` 4644 行 / 被 24/40 视图引用）同批处理；World Pack 真机是 §9 方向第 3 条；保持"只做一个命名切片"避免超大视图重构失控；4.9 跨模块后果流收尾闭合产品预览主线。
- **退出标准**：外部 required-check 策略已验证 + 一个热点 seam 拆分并回归绿 + World Pack 真机链路无阻塞问题。

### Sprint C — 受控能力扩展（治理/预览达标后的产品深度）
- **范围**：P1-3（Mini Scene 生产触发器）、P1-4（Chat 群聊编排 V1）、P1-6（Camera 图床 + Gallery People）、P2-1/P2-2（TTS/Music 真机与质量证明，可并行）
- **为什么这样排**：这些是"已集成模块的深度打磨"，§9 方向第 5 条明确要求"仅在明确晋升后才做"；依赖 Sprint A/B 的安全/治理基础与 4.8 HTML 安全前置（P1-3 触发器先于 EVE-5 媒体扩展）；可见产品价值高且不重开守卫决策。
- **退出标准**：首个自动小剧场可用 + 群聊多角色 V1 + Gallery 人物视图可用 + TTS/Music 真机证据齐。

> 后续 backlog（Sprint D+，需先拍板守卫项）：P1-7 CJA-6B、P1-8 EVE-5、P2-3 MJE-5/6、P2-4 Assets/Stock 深度、P2-5 Shell S2/S3、P2-6 Wallet 经济。

---

## 4. 待用户确认的问题（6 条）

1. **发布目标优先级**：下一阶段是否以"完成可用产品预览（P0-1 真机/PWA 证明）"为唯一发布目标（即 Sprint A 优先），还是先补某个具体能力？
2. **凭据备份策略**：现在就做 redacted/shareable 导出合约（密钥分离），还是保持"完整迁移备份 + 危险确认"、把 redacted 推后？
3. **架构热点取舍**：是否接受 Sprint B 只做"一个命名切片"（如 `systemStore` 门面或 `ContactsView` 拆分），暂不碰 `FoodDeliveryView.vue`（10329 行，风险高、回报慢）？
4. **Mini Scene 下一步**：先做低风险"生产事件触发器 Adapter（P1-3，复用已验证运行时）"，还是优先做"HTML 安全 Presenter（解锁 EVE-5，但需安全评审）"？
5. **守卫项拍板节奏**：Cheats、闭页自治、高影响自动关系事件、Gallery 关系记忆——本阶段是否全部保持 ON_HOLD/DECISION，还是有哪一项需要现在启动决策？
6. **视觉打磨 vs 功能深度**：发布前是否把"跨模块视觉一致性 + 真机触摸打磨"列为发布门槛的一部分，还是先发布再迭代视觉？

---

## 5. 明确"不建议现在做"的清单

> 依据：看板 §5 守卫/推迟方向、§9 当前执行方向、架构风险（超大视图/跨域耦合）。本阶段一律不启动。

**守卫/推迟方向（ON_HOLD / DECISION，须先决策）**
1. 闭页自治事件生成（DECISION：需身份/隐私/服务端存储/冲突/AI 上下文决策；当前 relay 非鉴权后端）
2. Cheats 作为成品表面（DECISION：无冻结解锁源/路由/编辑合约）
3. Gallery 驱动的关系记忆创作（ON_HOLD）
4. 高影响自动关系事件（romance/conflict/exposure/stage 自动化，ON_HOLD，需 Event Runtime + World Hub 评审）
5. World Setting W2/W3（多世界/切换，需单独决策；当前 W1 DONE）
6. 个人 R2/Worker 远程备份传输（ON_HOLD，须在第一可用本地发布之后）
7. 生产推送后端（relay 仍开发级、未鉴权；非当前目标）
8. Files 成为公开文件管理 App（内部兼容面，无新决策前不得公开）
9. Wallet 更深经济系统 / 银行 App / 自动兑换（产品决策未定）
10. 广域新 World Pack 原型（marketplace/dispatch/reservation/transit 四路径未理解前不选下一原型）
11. Map 实时导航/交通/设备定位/付费 POI（4.11 明确不授权）
12. EVE-5 Mini Scene/媒体扩展 与 CG 图像生成（需 4.8 HTML Presenter + 安全评审通过才解锁）
13. CJA-6B Narrative Timeline 实现（需可见产品/持久化 owner/保留/评审/迁移/备份合约批准）
14. Community/Media 发布、调查线索系统、Player State/World State Store（4.14 明确不授权）

**架构风险（仅在"所选产品切片被其阻塞"时才做，否则推迟）**
15. 超大视图全面重构：`FoodDeliveryView.vue` 10329 行、`ContactsView.vue` 5232、`ChatView.vue` 4776、`HomeView.vue` 4373、`ChatDirectoryView.vue` 4122、`WorldBookView.vue` 4093 —— 当前方向明确"defer large-view seams"，只做"一个命名热点切片"
16. `systemStore` 全面门面化（4644 行、被 24/40 视图引用）—— 同上，仅做渐进式一个 seam，不整体重写
17. 跨 store 适配深度 / 增量类型化（P2）—— 仅在具体路径阻塞时推进，不启动全量迁移
