# POSTA / 递送 Brand Direction / 品牌方向简档

Updated: 2026-09-03

Status: `FIXED IDENTITY IMPLEMENTED / 固定身份已实现`

## 1. Decision / 决定

POSTA 是独立 App，不跟随系统昼夜/主题切换。它拥有一个固定的「邮政柜台」亮底身份。系统级面（锁屏、Home、设置、通知中心、控制中心）继续跟随系统主题；本条只约束 POSTA 自身。

Independent apps own a fixed brand look. The system appearance switch never re-skins POSTA. Any future reading-friendly skin must be an app-internal feature, not a system-theme reaction.

## 2. Identity / 身份

- Visual thesis / 视觉论点: 邮政柜台（postal counter）——明亮、单据化、可信赖
- Palette / 色彩: 米白纸面 `#f3eee2`、面单白 `#fffdf7`、墨色 `#21251f`、邮政红 `#c03a2b`（主）、邮戳蓝灰 `#3d5a6c`（辅）、状态色（在途红 / 可取件琥珀 `#a8722a` / 已送达绿 `#4e795b` / 过期灰 `#8a8578`）
- Typography / 字体: 工业 sans 正文与标题（无衬线，刻意区别于编辑风壳）；运单号、标签、时间用 `ui-monospace` 等宽体
- Shape / 形状: 6px 小圆角、2px 墨色描边、硬阴影（`3px 3px 0`）、虚线撕裂分隔
- Motif / 母题: 面单、条形码条纹、邮戳状态章（虚线框/微旋转）、贯穿式节点时间线、航空封红蓝条纹（详情页顶栏）
- Motion / 动效: 150–280ms 按压与卡片入场错落；`prefers-reduced-motion` 下全部关闭

## 3. Boundaries / 边界

- 只改视觉：fixture、state composable、localStorage key、路由、data-testid、fail-closed 语义与业务文案全部不变。
- 修复了真实 bug：详情抽屉的置顶按钮曾命中 `aside>button` 通用选择器而继承关闭按钮的绝对定位与圆形圆角（全屏椭圆溢出现象）；现在关闭按钮收敛为 `aside>.close`。

## 4. Evidence / 证据

- `output/e2e/remaining-shell-portfolio/posta-desktop-zh.png`（寄件草稿页）
- `output/e2e/remaining-shell-portfolio/posta-mobile-zen-en.png`（系统 zen 主题下仍保持固定亮底身份的详情页）
- e2e: `e2e/remaining-shell-portfolio.spec.js` 的 POSTA 用例断言系统 zen 主题下背景仍为 `rgb(243, 238, 226)`
- 单测: `tests/remaining-shell-portfolio-view.test.js` 断言 parcel-app 不再携带 `night` 类
