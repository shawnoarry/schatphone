# 封存声明 / Archived External Assessment

- 封存日期：2026-08-26
- 状态：`OBSOLETE_EXTERNAL_ASSESSMENT`，不是项目质量门、工作流或 ship-ready 授权
- 封存原因：该模型输出将现有沉浸原则重新包装成一个新的强制治理门，形成了与路线图、task package、Event Runtime 产品边界并列的第二套验收机制，不符合项目单一权威和 workflow 分层规则
- 可参考部分：普通用户流不暴露内部 runtime 语义、World Hub 保持可选、单一 owner truth、隐藏自动化需要解释和审阅；这些原则已由现有权威文档覆盖
- 替代权威：`docs/strategy/IMMERSIVE_PHONE_MASTER_BLUEPRINT.md`、`docs/pm/event-runtime-and-world-hub/PRODUCT_BOUNDARY.md`、`docs/architecture/ARCHITECTURE.md`、`docs/design/DESIGN.md`
- 使用限制：不得把本文件的 checklist 作为新增必过门，也不得据此改变任何 roadmap 状态

以下保留模型原文，仅供审计其判断来源和重复范围。

# 沉浸游戏机制治理门（Immersive Gameplay Governance Gate）

更新时间：2026-08-26　|　阶段：Phase 6 打磨　|　评审强度：solo（主理人/用户直接定夺）

> **本闸门的性质**：这不是新设计，也不是新所有权规则。它只是把既有蓝图——`IMMERSIVE_PHONE_MASTER_BLUEPRINT.md`（§2.3–2.5、§7 Anti-Goals、§9 五问）、`IMMERSIVE_VISUAL_TODO.md`（§1、§2.6）、`README.md`（产品边界）、`TODO_ROADMAP.md`（4.3 / 4.8 / 4.9 / 4.14 真实状态）——收敛成一份**可逐条勾选、可直接落地的评审闸**。任何游戏/系统特性在打磨阶段被标记为 ship-ready 之前，必须先过本闸门。

## 0. 核心定位（闸门的总前提）

SchatPhone 是本地优先的"虚拟手机 + AI 生活模拟"产品。游戏机制（Event Runtime、Mini Scene、Surprise Mode、World Hub、relationship runtime）**必须服务于"用一台真实手机生活"的沉浸幻觉**，而不是反过来把产品变成可见的后台/管理台。

> 一句话总判：玩法可以存在，但用户应该感觉自己在"用一台手机生活"，而不是在"操作一个游戏的后台系统"。

---

## 1. 设计护栏（Guardrails）

以下 5 条将所有核心定位落成**可判定**的游戏机制设计护栏。每条配一句"判定标准"——评审时只要能用这句话回答"是/否"，就能判定该特性是否越线。

### G1 · 玩法不得跳出"手机壳"幻觉
游戏机制在普通用户流里必须表现为"这台手机上的一个 App 或系统功能"，而不是"一个网站页面 / 控制台 / 后台"。
- **判定标准**：该特性在普通用户流里是否显现出 store / route / 调试语义或开发者措辞？只要出现（且该页本身不是开发者/管理工具），即 FAIL。

### G2 · 游戏系统不得呈现为可见后台 / 管理台
运行时与系统名（Event Runtime、Mini Scene、relationship runtime、World Hub 等）不得成为用户可见的导航或主路径；普通沉浸玩家无需知晓这些内部机制名即可完成日常体验。
- **判定标准**：一个只想沉浸式玩手机/聊天的用户，是否在不知晓上述内部机制名的前提下也能正常玩？任何把运行时/系统名当成用户可见导航或日常主路径的，即 FAIL。

### G3 · 用户显式控制优先于隐藏自动化
任何自动发生的状态变化都必须有**可解释的来源**与**可审阅的入口**（World Hub 或对应 App）。高影响自动化在"解释与审阅质量"成熟前不得扩大。
- **判定标准**：是否存在"未经用户理解或审阅就自动发生的高影响状态变化"？有即 FAIL。

### G4 · 跨模块真相必须复用同一份 system-owned 真理
同一事实（关系进度、事件状态、余额、订单）在全产品只有唯一 owner，其他模块只读引用，不在本地字段另存一份 competing truth。
- **判定标准**：同一事实在 product 内是否只有唯一 owner，且其他模块只读不写？在模块本地字段另存 competing truth 的，即 FAIL。

### G5 · 每个游戏系统需有解释性与可审阅性
系统的触发源、原因、目标、adapter 边界、metrics、source record、pending effect、supporting-only 行为必须可在 World Hub / 对应 App 中解释与审阅；任何无法追因或无法 review 的自动行为都不许 ship。
- **判定标准**：该系统的触发来源与待生效影响是否可追溯、可审阅？无法追因或无法 review 的即 FAIL。

---

## 2. 沉浸一致性评审清单（Immersive Consistency Checklist）

**使用规则**：任一游戏/系统特性被标记为 ship-ready 前，以下条目必须**全部**勾选通过。未勾项 = 不达标，回退到路线图对应 gated 状态。

### 由 G1 派生（手机壳幻觉）
- [ ] 普通用户流里**不暴露** store / route / 调试语义或开发者措辞（除非该页本身是开发者/管理员工具）。
- [ ] 该特性在视觉与交互上表现为"手机上的 App / 系统功能"，而非"网站页面 / 控制台"。
- [ ] 可见文案读起来像产品文案，而非 handoff / 实现备注 / 内部模块名。
- [ ] 没有新增顶部 / 主页导航入口把运行时机制当成普通 App 暴露。

### 由 G2 派生（非可见后台 / 管理台）
- [ ] 普通沉浸玩家**无需知晓** Event Runtime / Mini Scene / relationship runtime 等内部机制名即可完成日常体验。
- [ ] 没有把运行时 / 系统名作为用户可见导航或主路径。
- [ ] World Hub **不是**普通沉浸玩家的必经路径（hidden-by-default、可选）。
- [ ] 没有把"管理事件 / 管理关系 / 管理世界"变成日常操作面。

### 由 G3 派生（显式控制优先于隐藏自动化）
- [ ] 任何自动发生的状态变化都有可解释来源（trigger source + reason 可查）。
- [ ] 高影响自动化（关系阶段 / 暴露 / 冲突 / 浪漫）必须走 **Event Runtime + World Hub 审阅**，不直接写 Chat / Contacts / relationship runtime。
- [ ] 隐藏自动化的范围未超出"解释与审阅质量"已成熟的部分。
- [ ] 用户拥有显式开关控制 Surprise Mode 等惊喜 / 自动化行为，且 **Settings 已解释其含义**。

### 由 G4 派生（单一 system-owned 真理）
- [ ] 同一事实（关系进度 / 事件状态 / 余额 / 订单）全产品只有唯一 owner，其他模块只读引用。
- [ ] 没有在模块本地字段另存 competing truth（如 Chat 不再注入 legacy relationship 答案）。
- [ ] 无跨模块重复真相（store-local 字段与 runtime truth 不双写）。
- [ ] System Store 的 compatibility 字段（`relationshipLevel` / `relationshipNote`）**不被当作**关系真相使用。

### 由 G5 派生（解释性与可审阅性）
- [ ] 该系统的触发源、原因、目标、adapter 边界、metrics、source record、pending effect、supporting-only 行为可在 World Hub / 对应 App 审阅。
- [ ] event logs 与 relationship facts 可过滤、选择、解释。
- [ ] Mini Scene 等呈现行为在关闭 / 失败时可降级为纯文本表示，**不静默失败**。
- [ ] 任何 AI 生成产物都带纯文本表示；失败调用 / 无效草稿不创建 artifact。

### 元检查（蓝图 §9 五问）
- [ ] 该特性是否强化连续性（而非仅堆叠新页面）？
- [ ] 是否复用同一份 world / relationship / runtime truth（而非另造一份）？
- [ ] 是否保留模块所有权（不抢其他模块的真相归属）？
- [ ] 是否保持用户控制优先于隐藏自动化？
- [ ] 是否提升沉浸而不把产品变成可见管理台？

---

## 3. 现有系统映射表（真实状态，来自路线图）

状态与缺口均取自 `TODO_ROADMAP.md` 当前记录，未做任何演绎或补完。

| 系统 | 关联护栏 | 当前合规状态（真实） | 已知缺口 / 风险（真实） |
|---|---|---|---|
| **Event Runtime**（§4.14，P1 PARTIAL_DONE） | G1 G2 G3 G4 G5 | 隐藏协调 Module（资格 / 门控 / 冷却 / 上限 / 提案 / 溯源 / 审阅态 / 日志）；后果经 owner-native 消息、订单、通话、Map 遭遇、可选 host card、后续 Mini Scene 呈现，**不暴露为 App / Home 入口**；World Hub 作为 hidden-by-default 审阅入口。 | ① 给 Mini Scene 的生产事件触发 Adapter 仍 gated；② EVE-5 需先过 Mini Scene + 媒体闸门；③ interactive HTML / 高影响效果 / appointment auto-entry / Gallery·Music caller 未实现；④ 真机验证 separate（roadmap 明示未声称 physical-device proof）。 |
| **Mini Scene**（§4.8，PARTIAL_DONE / AI_RUNTIME_AND_TEXT_SHELL_DONE_2026-08-19） | G1 G2 G3 G5 | 单一共享 Module 服务"源属事件发生后"的 Event Runtime 请求；schemas / `store:mini-scene` V1 / 持久化 / AI 必生成 / Event Runtime caller / root Text Presenter 已落地；用户模式 `unconfigured/off/text`，全局 Settings 仅控 `unconfigured/off \| text`；选择后返回 World Hub；每个 artifact 带纯文本表示，失败 closed。 | ① sandboxed HTML Presenter + Book transform-profile 编辑器待**安全评审**（TODO / SECURITY_REVIEW_REQUIRED）；② 生产事件触发 Adapter（TODO）；③ profile-binding UI / 自定义世界证明（TODO）；④ streaming Adapter ON_HOLD；⑤ interactive HTML 未发；⑥ Calendar 无 Mini Scene 创作字段。 |
| **Surprise Mode**（Event Runtime 评估 gate，见于 CJA-5 / §4.3） | G3 G5 | 作为 Event Runtime 评估 gate（`permission / Surprise Mode / deterministic random / cooldown / cap`）落地于 CJA-5；**Settings 已解释 Surprise Mode**（§4.3 DONE）；`off` 不弹窗、owner 校验自动 `keep_rhythm`，`text` 仅在 Focus Companion 内渲染 allowlisted 选项。 | ① 作为用户可见开关的默认态与解释需在对标时确认"无未经解释自动发生的惊喜"；② interactive HTML 路径未开通，故 text-only 为当前唯一呈现面。 |
| **World Hub / 世界中枢**（§4.3 DONE） | G2 G3 G5 | hidden-by-default 的**可选**审阅入口；event logs / relationship facts 可过滤、选择、解释；trigger source / reason / target / adapter 边界 / metrics / source record / pending effect / supporting-only 行为可审阅；Settings 已解释其审阅路径；EVE-3 event notebook 已落地（笔记不重造事件记录）。 | ① Cheats 尚未冻结解锁源 / 路由形状 / 编辑契约（属隐藏工具区，非 World Hub 本身问题）；② 高影响关系自动化的"Event Runtime + World Hub 审阅"全链路仍需待对应 gated 项闭合。 |
| **relationship runtime**（README / 蓝图 §2.5，基线稳定） | G3 G4 G5 | 拥有当前关系真相与记忆；Chat 只读一次（CMG-03 DONE 2026-08-20，不再注入 legacy relationship 答案）；supporting-only 事实仅由**显式用户动作**记录（role greeting / "让 TA 记住"），无 metric delta、source 级去重；`disclosureCandidates` parser 默认关闭、无用户审阅 UI（安全）。 | ① 高影响浪漫 / 冲突 / 阶段自动化仍需走 Event Runtime + World Hub 审阅（尚未全通）；② `disclosureCandidates` 无用户审阅 UI（但默认关闭，不自动写）。 |

> 映射结论：**G2 / G3 / G4 / G5 在当前已落地切片内总体合规**；主要风险集中在"待 gated 的扩展面"（Mini Scene 交互 HTML、生产事件触发 Adapter、高影响关系自动化审阅链路、真机验证），这些正是打磨阶段本闸门重点盯防的对象。

---

## 4. FAIL 反例库（红线）

以下情形会**直接 FAIL**本闸门，源自 Anti-Goals（§7）与 §9 五问。评审时命中任意一条即不得标记 ship-ready。

1. **把 World Hub / Event Runtime 当成日常导航入口** → FAIL G2（违反 Anti-Goal #6：World Hub 不得成为必经路径）。
2. **Chat 直接注入 legacy relationship 答案 / 阶段变更，绕开 relationship runtime** → FAIL G4。
3. **关系阶段 / 浪漫 / 冲突 / 暴露等高影响变化直接写 Chat / Contacts / relationship runtime，不经 Event Runtime 审阅与 World Hub** → FAIL G3 / G5（违反 roadmap："must not write directly to Chat, Contacts, or relationship runtime"）。
4. **Mini Scene 静默失败，或渲染未经沙箱的原始 AI HTML / 旧 `htmlSnippet`** → FAIL G1 / G5（违反 §4.8 安全约束：raw AI HTML 保持 inert，仅经沙箱 Presenter 渲染）。
5. **引入未经用户理解 / 审阅的隐藏自动化**（如后台自动改写关系 / 事件状态而 World Hub 无可追因入口）→ FAIL G3（Anti-Goal #3）。
6. **在模块本地字段另存一份 competing 真相**（如 Wallet 余额与某 App 各算各的，或 Chat 存一份"自己的"关系答案）→ FAIL G4（Anti-Goal #4）。
7. **任何界面暴露 store / route / 调试语义或开发者 handoff 措辞**（非 dev/admin 页）→ FAIL G1（Visual TODO §2.6）。
8. **把产品漂成可见后台管理台**（如"事件管理台""关系管理台"作为普通用户主路径）→ FAIL G2（Anti-Goal #2）。
9. **新功能只堆叠页面 / 机制而不强化连续性，且另造一份 world / relationship / runtime truth** → FAIL §9 五问。
10. **让 World Hub 成为"只想沉浸式玩手机 / 聊天的用户"的强制必选项** → FAIL G2 / Anti-Goal #6。
11. **Surprise Mode 在用户未开启 / 未理解的情况下自动弹出高影响惊喜** → FAIL G3。
12. **Gallery 在输入摩擦足够低之前被强制作为关系记忆主输入**（引用 Anti-Goal #5；本闸门聚焦游戏机制，但命中即阻塞该特性的沉浸一致性）。

---

## 5. 如何使用本闸门（solo 模式）

本闸门不开 formal quality gate。主理人 / 用户拿这份清单直接逐条过即可：

1. **定位对象**：确定要标记为 ship-ready 的游戏 / 系统特性（如某次 Event Runtime 扩展、Mini Scene 交互 HTML、Surprise Mode 开关、relationship runtime 新写入路径）。
2. **过护栏**：用 §1 每条"判定标准"问一句"是 / 否"。任一护栏判定为 FAIL → 不标记 ship-ready。
3. **勾清单**：逐条过 §2 Checklist。有未勾项 → 不标记 ship-ready，回退到路线图对应 gated 状态（参考 §3）。
4. **查缺口**：对照 §3 映射表，确认该系统的已知缺口是否已在本次变更中闭合；未闭合的缺口不许悄悄 ship。
5. **对红线**：用 §4 FAIL 反例库最后兜底一遍，确认未触发任何红线。
6. **结论**：全部通过 = 可标记 ship-ready；任一未过 = 记录阻塞项，回到路线图继续 gated 推进。**本闸门只评审"沉浸一致性"，不改写路线图 / 所有权边界 / 视觉待办的任何结论。**

> 一句话：护栏定边界，清单做体检，映射表看现状，反例库兜红线——五步走完，ship 与否一目了然。
