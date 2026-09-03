# Event App Shell Brand Differentiation Plan / 事件壳品牌差异化接续计划

Updated: 2026-09-03

Status: `ALL SIX DONE 2026-09-03 (POSTA / VIA / CREDO / NEXT / GATE / ROAM)`

本文件是跨 PC 接续文档：另一台机器接手时，读本文件 + `docs/design/PARCEL_POSTA_BRAND_DIRECTION.md` 即可继续，无需重读会话。

## 1. Problem / 问题

事件层推进期批量建立的 S1 壳（CREDO 谱权 / POSTA 递送 / NEXT 机会 / VIA 联程，外加 GATE 票务 / ROAM 旅行）视觉语言高度同质：全部深色优先、Georgia 衬线大字、相近明度的 accent。这违背项目"模拟真实手机"的需求——真实手机里每个 App 有独立品牌身份（参照项目内正确先例：Shopping 十一店，见 `docs/design/SHOPPING_STOREFRONT_BRAND_UI_AND_ASSET_GUIDE.md`）。

## 2. Product Principles / 产品原则（用户已确认）

1. 项目分**系统级功能**（锁屏、Home、设置、通知中心、控制中心、Appearance 本身）与**独立 App**两类。系统级面跟随系统昼夜/主题；独立 App **不跟随**。
2. 独立 App 拥有**一个固定品牌面貌**；禁止系统或美化切换昼夜时连带换肤。
3. 独立 App 允许内置**自己的、与系统无关的**皮肤/昼夜切换（适合文字密集型功能，如阅读、日记、邮件），这是 App 内部功能。
4. Shopping / FoodDelivery 等"文件夹"集合内的店铺/品牌同样各自独立设计，已是正确范式，不动。
5. 美化只改视觉：fixture、state composable、localStorage key、路由、data-testid、fail-closed 语义、业务文案一律不动。

## 3. Done / 已完成

### POSTA 递送（2026-09-03）

- 固定亮底「邮政柜台」身份：米白纸面 + 邮政红 + 等宽运单号 + 面单条形码 + 邮戳状态章 + 贯穿式节点时间线。详见 `docs/design/PARCEL_POSTA_BRAND_DIRECTION.md`。
- 已解除系统主题耦合（删除 `night` 计算属性与 `.night` 样式块）。
- 顺带修复真实 bug：详情抽屉置顶按钮曾命中 `aside>button` 通用选择器，继承关闭按钮的绝对定位与圆形圆角，渲染成横跨全屏的椭圆。关闭按钮已收敛为 `aside>.close`。
- 证据：`output/e2e/remaining-shell-portfolio/posta-desktop-zh.png`、`posta-mobile-zen-en.png`（zen 系统主题下仍保持亮底邮政身份）。

### VIA 联程（2026-09-03）

- 固定暗底「交通枢纽信息牌」身份：近黑 `#0d1013` 底 + 琥珀 `#f0a63a` / 信号绿 `#3ecf7c`；Georgia 衬线全部换成等宽 mono（JetBrains Mono 栈，CJK 回落 Noto Sans Mono CJK），覆盖站点码 / 时刻 / 数字 / 大标题。
- 状态徽章按信号灯语义重定色：available=信号绿、limited=琥珀、closed=暖红、stale=灰蓝。
- 已解除系统主题耦合（删除 `isNight` computed、`:class` 绑定与 `.is-night` 样式块及末尾覆盖行）；zen 系统主题下仍保持同一块近黑板（e2e computed 背景断言 `rgb(13, 16, 19)` 锁定）。
- 动效：班次卡 hover 上浮、按压 120-180ms、详情抽屉 220ms 入场，全部遵守 `prefers-reduced-motion`。
- 测试迁移：`remaining-shell-portfolio-view.test.js` 中 VIA 移出 night 耦合组，新增固定身份断言（系统 night 下无 night 类 + 英文无中文）。
- 证据：`output/e2e/remaining-shell-portfolio/via-desktop-zh.png`、`via-mobile-zen-en.png`（旧名 `via-desktop-day.png` / `via-mobile-night-en.png` 已删除）。

### 验收后视觉修正（2026-09-03，POSTA / VIA 同轮）

复查验收证据后发现并修复的纯视觉/可访问性项，未触碰 fixture、state composable、localStorage key、路由、data-testid、fail-closed 语义与业务文案：

1. POSTA 详情抽屉的航空信封条纹曾渲染在系统状态栏浮层（高 32px）之下；`aside::before` 下移 `calc(32px + env(safe-area-inset-top))`，关闭按钮随之下移，`data-statusbar='off'` 时回到原位。
2. VIA 班次卡收藏按钮（34×34）曾覆盖价格文字尾部；改为 44×44 触控区并给价格行让位。
3. VIA 底部导航计数徽标原为琥珀底，与激活态琥珀色块同色相融；改为深底 + 琥珀描边/数字。
4. VIA 搜索结果行状态徽章补上缺失的 `tone-*` 色（此前与班次卡的信号灯语义不一致）。
5. 两壳桌面端内容加入 max-width 居中（VIA 1080px / POSTA 880px，范式对齐 Aster 1080、ROAM/GATE 1120）。
6. VIA mono 身份收尾：详情条日期、班次卡日期、行程卡日期进入等宽栈；两壳 8–9px 关键文字上探至 10px；POSTA 输入框 14px → 16px（避免 iOS 聚焦缩放）。
7. 两壳装饰性 Font Awesome 图标补齐 `aria-hidden="true"`。
8. 验证：lint 通过；全量 vitest 2764/2771（7 个失败均为 `world-semantic-access-map-store` 存量基线，5 个失败套件为本机 `.codex` 缓存噪音，无新增失败）；生产构建通过；`remaining-shell-portfolio` VIA/POSTA e2e 8/8（desktop + mobile-chrome，axe 零违规，固定底色断言保持）。证据截图同名重出。

已识别但未做（超出"只改视觉"严格边界，留待用户确认）：VIA fixture 的 `platformZh/platformEn` 站台信息未渲染、POSTA 详情时间线可由现有字段升级为三节点、POSTA 头部置顶计数在 0 时仍显示、两壳详情抽屉可加 `role="dialog"` 与 Esc 关闭。

### CREDO 谱权（2026-09-03）

- 固定亮底「象牙纸文书」身份：象牙纸 `#f5f2e9` + 藏青 `#25406b` + 金；衬线（Georgia / Noto Serif CJK）只留给文书标题与金额数字。
- 品牌位从绿色方块改为藏青圆形印章（金描边）；mast 从深绿改藏青渐变；份额条配色改藏青/金/灰蓝。
- 对比度按 axe 修过两轮：纸面文本用 `--gold-ink #8a6522`（原 `#b78a39` 在象牙纸上仅 2.79），辅助灰加深到 `#5b6472`；藏青 mast 上的小字用 `--gold-on-navy #d9b25f`。
- 已解除系统主题耦合（删除 `isNight`、`.night` 类与样式块）；zen 下仍保持象牙纸（e2e computed 背景断言 `rgb(245, 242, 233)` 锁定）。
- 动效：目录卡 hover 上浮、详情抽屉 220ms 入场，遵守 `prefers-reduced-motion`。
- 测试迁移：night 耦合组现只剩 NEXT；新增 CREDO 固定身份断言。
- 证据：`output/e2e/remaining-shell-portfolio/credo-desktop-zh.png`、`credo-mobile-zen-en.png`（旧名已删除）。

### NEXT 机会（2026-09-03）

- 固定亮底「招聘平台」身份：亮白信息流 `#f4f6fa`/白卡 + 品牌蓝 `#1f53d6` + 珊瑚 `#f4553f`；Georgia 衬线全撤，换友好圆体感 sans；卡片区全面圆角化。
- hero 从藏青斜切改亮蓝白渐变；草稿条 LOCAL 竖条、保存按钮、计数徽章走品牌蓝；收藏/删除走珊瑚。
- 已解除系统主题耦合；zen 下保持亮白（e2e computed 背景断言 `rgb(244, 246, 250)` 锁定）。
- axe 修过一轮：蓝压深到 `#1f53d6`（原 `#2f6bff` 对比 4.15/4.49 不达 4.5）。
- **新系统级机制**：`src/App.vue` 增加 `FIXED_IDENTITY_STATUS_TONES` 路由映射——独立 App 解耦后，状态栏文字跟随 App 面貌而非系统主题（否则浅色身份壳在 zen 下状态栏浅对浅不可读）。当前覆盖 parcel/creator-rights/career（深字）与 intercity（浅字）；后续 GATE/ROAM 完成时补入。e2e 已对四壳加状态栏颜色断言。

### GATE 票务（2026-09-03）

- 固定暗底「海报墙」身份：近黑 `#0f0f10` + 票橙红 `#ef3d25` + Arial Narrow 粗体大字；事件卡由大色块海报（`--event-accent`）主导。
- 票根化：票夹卡片加打孔缺口（分隔线上下圆孔）+ 虚线分隔 + 橙红 LOCAL DRAFT 竖条。
- 已解除系统主题耦合；zen 下保持近黑（e2e computed 背景断言 `rgb(15, 15, 16)` 锁定）。状态栏沿用 GATE 自带的 `:global` 覆盖（`status-fg` 跟 `--ink`），未纳入 App.vue 映射——若后续收敛机制可合并。
- 注意：`isNight`/`settings`/`storeToRefs` 已一并清理（lint）。
- 证据：`output/e2e/tickets-app-shell/tickets-desktop-zh.png`、`tickets-mobile-zen.png`（旧名已删除）。

### ROAM 旅行（2026-09-03）

- 固定亮底「目的地手册」身份：暖白 `#faf6ef` + 陶土 `#b85c38` + 珊瑚 `#e07856`；Georgia 衬线全撤，人文 sans 统一。
- 明信片 route-card、行程簿 DRAFT 印章竖条保留，换陶土色系；hero 改陶土渐变 + 沙点纹理。
- 已解除系统主题耦合；zen 下保持暖白（e2e computed 背景断言 `rgb(250, 246, 239)` 锁定）。axe 修过一轮：辅助灰加深到 `#6b6157`。
- 状态栏：沿用 ROAM 自带的 `:global` 覆盖（与 GATE 同机制）。**状态栏机制现状：App.vue 的 `FIXED_IDENTITY_STATUS_TONES` 覆盖 VIA/CREDO/NEXT/POSTA；GATE/ROAM 走各自的 `:global` 规则——两套并存都有 e2e/断言锁定，将来想收敛时以 App.vue 映射为准。**

## 4. Remaining / 待办矩阵

执行顺序即优先级。每壳一个固定身份、一次到位：

| 顺序 | App（路由 / 文件） | 固定身份方向 | 骨架 | 参照 |
| --- | --- | --- | --- | --- |
| ~~1~~ ~~VIA~~ `DONE 2026-09-03` | VIA 联程（`/intercity` / `src/views/IntercityView.vue`） | **暗底交通枢纽信息牌**：近黑 + 琥珀/信号绿，等宽 mono 为主字体 | 时刻表行 + 时长条 + 站点代码大字 | 机场出发大屏 |
| ~~2~~ ~~CREDO~~ `DONE 2026-09-03` | CREDO 谱权（`/creator-rights` / `src/views/CreatorRightsView.vue`） | **象牙纸文书**：纸白 + 藏青 + 金，衬线仅限文书标题 | 账簿表格 + 印章/编号美学 | 版税结算单、公证文书 |
| ~~3~~ ~~NEXT~~ `DONE 2026-09-03` | NEXT 机会（`/career` / `src/views/CareerView.vue`） | **亮白招聘平台**：白 + 珊瑚/品牌蓝，友好圆体 sans | 信息流卡片墙 + 组织 logo 块 | Wanted、LinkedIn |
| ~~4~~ ~~GATE~~ `DONE 2026-09-03` | GATE 票务（`/tickets` / `src/views/TicketsView.vue`） | 暗底保留但转向**海报墙**，粗黑无衬线大字 | 海报优先网格 + 票根式卡片（打孔/锯齿边缘） | Interpark、票根 |
| ~~5~~ ~~ROAM~~ `DONE 2026-09-03` | ROAM 旅行（`/travel` / `src/views/TravelView.vue`） | **亮底目的地**：暖白 + 陶土，人文 sans | 目的地大图卡 + 地图锚点 | Airbnb、携程 |

不动：Work Hub（暖纸）、Aster（海军蓝+青柠）已有独立身份；Shopping/FoodDelivery 各店铺已是正确范式。

### 后续独立切片（非本次范围）

第一批已验收壳（Aster、Work Hub、Daon Mail、Ondam Care、Jari、Ripple、Prism、Wallet）目前也订阅系统主题（各 1 处 `systemStore.settings.appearance` / `currentTheme` 引用）。按原则 2 它们最终也应解耦并各选一个常驻面貌（建议：Aster 固定暗、Work Hub 固定暖纸），但这是独立切片，动手前先与用户确认。

## 5. Execution Recipe / 每壳执行配方（POSTA 已验证）

1. 读目标 view 文件（注意：这些壳是单行压缩风格，用 `node .tmp` 脚本或分段读取，edit 工具处理超长行要小心）。
2. 重写单文件：删除 `night` computed 与 `:class="{night}"`、删除 `.night` 样式块；保留全部 `data-testid`、文案 `tx()` 对、状态绑定；语言切换（`systemStore.settings.system.language`）保留。
3. 按矩阵写入固定身份（色板 / 字体 / 骨架 / 母题），加 150–280ms 按压与入场动效并遵守 `prefers-reduced-motion`。
4. 更新 `tests/remaining-shell-portfolio-view.test.js`：把该壳从「night 耦合组」移出，新增「固定身份组」断言（系统 night 下无 `night` 类、英文模式无中文）。
5. 更新 `e2e/remaining-shell-portfolio.spec.js`：用例改名反映固定身份；加 computed 背景色断言锁定解耦；截图证据重命名（`{app}-desktop-zh.png` / `{app}-mobile-zen-en.png`）并删除旧图。
6. 在该壳的 design 简档（`docs/design/` 下新建或并入本文件）记录身份定义与证据。

## 6. Validation / 验证约定

- 必跑：`npm run lint`、`npm run test`、`npm run build`、目标壳 e2e（`npx playwright test e2e/remaining-shell-portfolio.spec.js -g '<APP>'`）。
- **本机 e2e 必须 `--workers=2`**：默认 4 并发时 vite dev server 冷转换会超时（未改动的用例同样失败，属环境问题）；CI 本身 workers=1 不受影响。
- 存量失败基线：`tests/world-semantic-access-map-store.test.js` 有 7 个失败，在干净 HEAD 上同样失败，与视觉工作无关；验收时以「不新增失败」为准。
- `tests/persistence-owner-inventory.test.js` 的全树扫描用例已加 20s 显式超时（负载抖动修复）。

## 7. Related Work This Round / 同轮已落地的其他工作

提交历史中有独立的 PWA 加固提交（与视觉无关）：桌面模式运行时检测提示（`src/lib/desktop-layout-guard.js`）、service worker 构建期 commit 打戳（`vite.config.js` 的 `serviceWorkerVersionStamp`）、manifest `orientation: portrait`、`mobile-web-app-capable` meta。背景：安卓 Chrome「桌面版网站」按站点覆盖 viewport 导致已安装 PWA 字体变小可缩放；网页无法代码侧强制关闭，只能检测并引导用户。
