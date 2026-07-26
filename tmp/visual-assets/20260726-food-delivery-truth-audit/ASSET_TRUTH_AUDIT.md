# Food Delivery 现有资产真值审计

审计基线：`54befc4c0361a4c2e6088bc52e1ee06710af1c16`

审计范围：`public/images/ui-assets/apps/food-delivery/`、旧目录 `public/images/food-delivery/`、实际源码映射、测试与 `FOOD_DELIVERY_IMAGE2_ASSET_PROMPTS.md`。

结论边界：仓库文件和运行时代码是真值；提示词文档只作为对照证据，不能直接转换成生图任务。

## 一眼结论

- 实际图片文件共 `109` 个。
- `38` 个已存在且已接线；另有 `1` 个首页骑手素材正在使用，但因透明度和品牌问题单列为“仅可明确批准后替换”。
- `57` 个文件已存在但当前未接线，必须先评估复用，禁止按“缺失”重复生成。
- `13` 个实际文件属于旧路径、旧版本、重复版本或已确认不可直接使用的源图。
- 共核对 `88` 个文件缺失的代码/文档期待槽位；其中只有 `55` 个平台菜单菜品图属于真实生图缺口。
- 本轮没有调用 Vistack，没有上传图床，没有修改或覆盖正式素材，也没有修改源码或正式项目文档。

完整逐项记录见 [asset-truth-matrix.json](asset-truth-matrix.json)。其中每个实际文件都记录仓库路径、尺寸、格式、Alpha、SHA-256、源码/文档证据和分类；每个缺失槽位都记录真实运行状态和可复用候选。

## 去重后的资产矩阵

| 产品位置 / 素材族 | 数量 | 真值分类 | 当前页面实际状态 | 是否进入生图清单 | 主要证据 |
| --- | ---: | --- | --- | --- | --- |
| Peach Cloud 封面、品牌、5 个分类、12 个产品图 | 19 | `present_and_wired` | 全部通过静态或动态路径加载 | **禁止重复生成** | `src/stores/foodDelivery.js:516-520`、`src/views/FoodDeliveryView.vue:163` |
| Moon Bistro 当前封面和 9 个当前菜品图 | 10 | `present_and_wired` | Seed 数据直接加载 | **禁止重复生成** | `src/stores/foodDelivery.js:509`、`src/stores/foodDelivery.js:521-529` |
| Moon Bistro 其余封面/菜品库 | 44 | `present_not_wired` | 文件存在，当前菜单未引用这些编号 | 否，先决定是否扩展菜单 | `public/images/ui-assets/apps/food-delivery/moon-bistro/` |
| 平台首页 3 张当前轮播横幅 | 3 | `present_and_wired` | 会员、周末、午餐横幅已加载 | **禁止重复生成** | `src/views/FoodDeliveryView.vue:428`、`:475`、`:554` |
| 平台 5 家核心商户当前主图 | 5 | `present_and_wired` | `*-02.png` 已加载 | **禁止重复生成** | `src/views/FoodDeliveryView.vue:636-760` |
| 平台首页骑手吉祥物 | 1 | `replacement_candidate` | 正在首页搜索框旁显示 | 仅明确批准替换时 | `src/views/FoodDeliveryView.vue:180`、`:3232` |
| 周末抽奖竖版活动海报 | 1 | `wired_missing` | 文件缺失，但自动回退到现有周末横幅 | 否，非首批优先 | `src/views/FoodDeliveryView.vue:478`、`:2216-2220` |
| 4 家品牌型商户 Logo | 4 | `wired_missing` | 加载失败后显示代码文字 Logo 与渐变底 | 否，属于视觉提升 | `src/views/FoodDeliveryView.vue:793-916` |
| 山茶面馆、南风咖喱主图 | 2 | `fallback_only` | 代码没有加载图片，只显示图标渐变 | 否，属于视觉提升 | `src/views/FoodDeliveryView.vue:851-852`、`:943-944` |
| 平台 10 个分类图标 | 10 | `fallback_only` | 当前稳定显示 Font Awesome 图标；目标路径只在 `data-required-asset` | 否，文档明确为可选升级 | `src/views/FoodDeliveryView.vue:330-396`、`:3486-3501` |
| 订单流程：结算、5 个当前状态、空订单 | 7 | `fallback_only` | 硬编码诊断占位；仓库已有骑手、小票、外卖袋等同语义候选 | **先复用/修复评估** | `src/views/FoodDeliveryView.vue:4706-4712`、`:5036-5043`、`:5128-5135` |
| 订单列表 7 家非 Logo 商户身份图 | 7 | `fallback_only` | 硬编码诊断占位；已有商户主图或包装素材可评估复用 | **先复用评估** | `src/views/FoodDeliveryView.vue:1204-1207`、`:4988-4994` |
| 11 家平台商户的 55 张菜单菜品图 | 55 | `wired_missing` | 页面真实请求文件；失败后显示高对比诊断占位 | **真实生图缺口** | `src/views/FoodDeliveryView.vue:2325-2328`、`:4055-4058`、根级错误捕获 `:2304-2312` |
| 延误状态插图 | 1 | `obsolete_or_duplicate` | 当前状态机不显示 | 否，未来需求 | `docs/pm/commerce-finance-and-assets/FOOD_DELIVERY_IMAGE2_ASSET_PROMPTS.md:417` |
| Peach Cloud `.png` 品牌路径 | 1 | `obsolete_or_duplicate` | 一处 `data-required-asset` 误写 PNG；页面实际加载已有 SVG | 否，属于代码标记不一致 | `src/views/FoodDeliveryView.vue:163`、`:7714-7721` |
| 旧目录骑手、旧横幅、商户 `*-01`、无 Alpha 分类源图 | 13 | `obsolete_or_duplicate` | 当前代码未使用或已有明确替代版本 | 否，保留历史证据 | 逐项见机器矩阵 |
| 优惠券、外卖袋、搜索装饰等现有未接线素材 | 13 | `present_not_wired` | 文件存在，尚未接线 | 否，优先用于复用评估 | `public/images/ui-assets/apps/food-delivery/platform/decorations/` |

## 对刚才骑手任务的更正

“配送中状态主插图”不能再列为无条件生图任务。

当前首页已使用：

`public/images/ui-assets/apps/food-delivery/platform/decorations/mascot/delivery-rider-mascot-01.png`

- 尺寸：`1024x1024`
- 格式：RGB PNG，没有 Alpha
- SHA-256：`ab4233b24eeb1a3c1dcedfe6c857c15ddca720fe31f22e9aa2afbc5a4f9db024`
- 当前用途：外卖平台首页搜索框旁的骑手吉祥物
- 已知问题：棋盘格烘入像素，外卖箱有可读韩文品牌字样

因此正确决策顺序是：先决定“保留现状 / 本地修复并复用 / 明确批准替换”，而不是按另一个文件名直接重新生成。刚才生成的新骑手图继续只留在 `tmp/`，不通过、不接线。

## 真实缺口清单

真实缺口只有平台菜单产品图，共 `55` 张。它们都不存在于仓库，代码会根据下面的稳定路径真实加载，失败后显示诊断占位图。

| 商户 | 菜品图数量 | 稳定路径 |
| --- | ---: | --- |
| 逆站洞韩牛汤饭 | 5 | `platform/menus/hanwoo-gukbap/menu-item-01.png` 至 `05.png` |
| 寿司花 | 5 | `platform/menus/sushi-hana/menu-item-01.png` 至 `05.png` |
| 花德披萨味店 | 5 | `platform/menus/hwadeok-pizza/menu-item-01.png` 至 `05.png` |
| 沙拉日记 | 5 | `platform/menus/salad-day/menu-item-01.png` 至 `05.png` |
| 脆脆炸鸡屋 | 5 | `platform/menus/chicken-crisp/menu-item-01.png` 至 `05.png` |
| 莓果晨光 | 5 | `platform/menus/berry-morning/menu-item-01.png` 至 `05.png` |
| 青禾鲜食补给站 | 5 | `platform/menus/green-basket/menu-item-01.png` 至 `05.png` |
| 山茶牛肉面馆 | 5 | `platform/menus/camellia-noodles/menu-item-01.png` 至 `05.png` |
| 早安贝果咖啡 | 5 | `platform/menus/morning-bagel/menu-item-01.png` 至 `05.png` |
| 榆树里蒸点铺 | 5 | `platform/menus/elm-dim-sum/menu-item-01.png` 至 `05.png` |
| 南风椰香咖喱 | 5 | `platform/menus/coconut-curry/menu-item-01.png` 至 `05.png` |

每张图对应的中文菜品名、完整路径和证据行均已展开在 `asset-truth-matrix.json`，不需要根据文件名猜测。

## 建议的第一个有界批次

建议首批只处理“逆站洞韩牛汤饭”一家店的 `5` 张菜单图，不处理订单骑手，不处理分类图标，也不上传图床。

选择理由：

- 这 5 项是真实缺口，不与现有素材重复。
- 同一家店一次完成 5 张，能保证餐具、光线和背景一致。
- 页面实际以 `64x64px` 显示，验收边界明确。
- 产品摄影不需要 Alpha，避开当前透明背景工作流的不稳定性。
- 仍按“每次先生成候选 -> 人工选图 -> 再决定正式归档”的边界执行。

在用户确认首批范围前，不生成这 5 张，不上传，不接线。

## 发现的实现/文档不一致

1. `FOOD_DELIVERY_IMAGE2_ASSET_PROMPTS.md` 同时包含历史提示词、已完成素材说明、可选升级和真实缺口，不能整体当作待办清单。
2. 文件命名建议区仍保留旧的通用文件名，它们不是当前稳定运行路径。
3. `FoodDeliveryView.vue:4058` 使用了未定义的 `handlePlatformMenuImageError`，根级捕获仍会应用诊断图，但该局部处理器名称与实现不一致；本轮只记录，不改代码。
4. Peach Cloud 一处 `data-required-asset` 写成 `.png`，实际正式素材和加载路径是 `.svg`；这是标记错误，不是图片缺失。
