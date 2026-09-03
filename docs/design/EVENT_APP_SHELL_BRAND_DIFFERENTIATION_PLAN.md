# Event App Shell Brand Differentiation Plan / 事件壳品牌差异化接续计划

Updated: 2026-09-03

Status: `POSTA DONE 2026-09-03 / VIA DONE 2026-09-03 / CREDO NEXT`

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

## 4. Remaining / 待办矩阵

执行顺序即优先级。每壳一个固定身份、一次到位：

| 顺序 | App（路由 / 文件） | 固定身份方向 | 骨架 | 参照 |
| --- | --- | --- | --- | --- |
| ~~1~~ ~~VIA~~ `DONE 2026-09-03` | VIA 联程（`/intercity` / `src/views/IntercityView.vue`） | **暗底交通枢纽信息牌**：近黑 + 琥珀/信号绿，等宽 mono 为主字体 | 时刻表行 + 时长条 + 站点代码大字 | 机场出发大屏 |
| 2（下一个） | CREDO 谱权（`/creator-rights` / `src/views/CreatorRightsView.vue`） | **象牙纸文书**：纸白 + 藏青 + 金，衬线仅限文书标题 | 账簿表格 + 印章/编号美学 | 版税结算单、公证文书 |
| 3 | NEXT 机会（`/career` / `src/views/CareerView.vue`） | **亮白招聘平台**：白 + 珊瑚/品牌蓝，友好圆体 sans | 信息流卡片墙 + 组织 logo 块 | Wanted、LinkedIn |
| 4 | GATE 票务（`/tickets` / `src/views/TicketsView.vue`） | 暗底保留但转向**海报墙**，粗黑无衬线大字 | 海报优先网格 + 票根式卡片（打孔/锯齿边缘） | Interpark、票根 |
| 5 | ROAM 旅行（`/travel` / `src/views/TravelView.vue`） | **亮底目的地**：暖白 + 陶土，人文 sans | 目的地大图卡 + 地图锚点 | Airbnb、携程 |

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
