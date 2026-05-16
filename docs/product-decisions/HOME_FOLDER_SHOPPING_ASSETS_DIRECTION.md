# Home Folder, Shopping, and Assets Direction / 主屏文件夹、购物与资产方向

Updated / 更新时间: 2026-05-16

## 1. Decision Summary / 决策摘要

新增方向确认：

1. 主屏需要支持“文件夹型入口”，用于还原真实手机里多个同类 App 被放入同一个文件夹的使用习惯。
2. 文件夹能力应作为 Home 的通用桌面能力建设，不应由每个业务模块单独自造一套。
3. Appearance 只负责文件夹外观配置，不负责文件夹里的业务内容。
4. Shopping 应优先作为第一个文件夹型入口落地，主屏占位大小与普通 App 一致。
5. Assets 应作为独立主屏入口落地，负责长期拥有物与资产档案。
6. Stock 暂不并入 Assets；Stock 保留为行情/市场行为入口，Assets 的“投资”分类消费或汇总 Stock 持仓结果。

## 2. Why A Home Folder Capability / 为什么需要主屏文件夹能力

真实手机里，购物、社交、工具、娱乐等同类 App 经常被用户放进同一个文件夹。SchatPhone 的产品目标是“真实手机沉浸感”，因此主屏只做普通单入口 App 会弱化这种真实感。

文件夹模式适合解决：

- 主屏入口过多导致桌面拥挤。
- 同类功能需要多个视觉入口，但业务上仍可归属同一个模块。
- Shopping 这类功能天然有多个平台入口的现实类比；品类应作为平台 App 内部货架，而不是主屏文件夹第一层。
- 后续 Social、Games、Tools、Assets 子类入口也可复用同一桌面能力。

## 3. Ownership Boundary / 归属边界

| 能力 | 归属 | 说明 |
| --- | --- | --- |
| 文件夹占位、展开、关闭、文件夹内入口排列 | Home | 文件夹是桌面系统能力，类似手机 Launcher。 |
| 文件夹圆角、背景、模糊、子图标预览密度、打开动画 | Appearance | 外观只配置视觉，不管理业务分类。 |
| 子入口名称、图标、路由、入口参数 | 对应业务模块提供，Home 统一渲染 | 例如 Shopping 提供 Schat Mall / Style Cloud / Nova Digital 等平台 App 元数据。 |
| 商品、订单、购物车、心愿单 | Shopping | 业务数据归 Shopping，不归 Home 文件夹。 |
| 资产、估值、持有状态、资产分类 | Assets | 资产数据归 Assets，不归 Wallet 或 Stock。 |
| 流水、余额、支出收入 | Wallet | 购物或资产变动可生成 Wallet 流水，但 Wallet 不拥有商品或资产。 |
| 行情、涨跌、市场复盘 | Stock | Stock 负责市场行为；Assets 可读取投资持仓摘要。 |

## 4. Recommended Technical Shape / 推荐技术形态

当前技术栈是 Vue + Pinia + Vue Router，Home 已有 App Tile、Widget、Custom Widget、主屏分页与布局编辑能力。因此最适合做成三层：

### 4.1 系统级入口定义

统一定义可渲染的桌面项目：

- `app_chat`
- `app_map`
- `folder_shopping`
- `app_assets`
- `shopping_schat_mall`
- `shopping_style_cloud`
- `shopping_nova_digital`
- `shopping_daily_fresh`
- `assets_real_estate`
- `assets_vehicle`

### 4.2 Home 渲染层

Home 根据 tile 类型渲染：

- `app`：普通 App 图标。
- `folder`：文件夹图标，占用与普通 App 相同的 1x1 主屏位置。
- `widget`：系统 Widget。
- `custom_widget`：用户自定义 Widget。

文件夹点击后由 Home 打开统一弹层，展示文件夹内子入口。Shopping 文件夹第一层子入口应表现为多个独立购物平台 App；子入口可以跳转到同一个底层模块路由，并携带平台与默认货架参数，例如 `service=style_cloud&category=fashion`。

### 4.3 Appearance 外观配置层

Appearance 后续只配置视觉：

- 文件夹样式：iOS-like、磨砂、实色卡片等。
- 子图标预览密度：4 个、9 个或首屏缩略。
- 文件夹名称是否显示。
- 文件夹背景透明度、圆角、模糊程度。
- 文件夹打开动画。
- 子图标是否跟随全局 App 图标主题。

## 5. Shopping Direction / 购物方向

入口建议：

- 中文名：购物
- English：Shopping
- 主屏表现：文件夹型入口
- Route 建议：`/shopping`
- 首批子入口：Schat Mall、Style Cloud、Nova Digital、Daily Fresh

第一阶段不需要为每个平台都做独立路由。可以统一跳转到底层 Shopping route，但必须携带平台身份，让用户感觉是进入文件夹里的某个购物 App：

- `/shopping?service=schat_mall&category=mall`
- `/shopping?service=style_cloud&category=fashion`
- `/shopping?service=nova_digital&category=digital`
- `/shopping?service=daily_fresh&category=grocery`

购物品类仍然保留，但应位于具体平台 App 内部，作为“货架 / 分类”出现。不要把 Fashion / Beauty / Digital 直接作为主屏购物文件夹的第一层入口；这会让它看起来像一个集成目录，而不是多个独立购物平台 App。

Shopping 业务归属：

- 商品浏览
- 商品详情
- 收藏 / 心愿单
- 购物车
- 下单记录
- 礼物购买
- 与 Chat 的商品卡片/推荐/赠礼互动
- 与 Wallet 的消费流水
- 与 Assets 的购买后资产生成
- 与 Calendar 的配送、预约、到达提醒

## 6. Assets Direction / 资产方向

入口建议：

- 中文名：资产
- English：Assets
- 主屏表现：独立 App 入口，后续可选文件夹型入口
- Route 建议：`/assets`

资产分类：

- 不动产：房产、公寓、商铺、土地、租赁空间。
- 投资：股票、基金、债券、加密资产、收藏型投资。
- 交通工具：汽车、摩托、船、飞机、通勤工具。
- 特殊资产：奢侈品、艺术品、稀有收藏、会员权益、身份凭证、特殊道具。

Assets 业务归属：

- 总资产概览
- 分类资产列表
- 资产详情
- 估值、购入时间、来源、状态
- 资产图片或凭证引用
- 资产变动记录
- 与 Map 的地点/房产/交通工具联动
- 与 Shopping 的购买后生成
- 与 Wallet 的资产相关流水
- 与 Stock 的投资分类汇总

## 7. Stock And Assets Relationship / Stock 与 Assets 的关系

不建议现在合并 Stock 和 Assets。

推荐关系：

- Stock 保留为独立 App，负责市场、行情、涨跌、关注标的、持仓变化、行情复盘线索。
- Assets 新增“投资”分类，读取或汇总 Stock 的持仓结果。
- Calendar 继续接收 Stock 的行情复盘线索。
- Assets 未来可以生成资产复盘、估值变化、持有结构提醒。

原因：

- Stock 是动态市场行为。
- Assets 是长期拥有物总账。
- 合并会让资产模块被行情操作污染，也会让 Stock 的复盘、波动提示变得不清晰。

## 8. Map Relationship / Assets 与 Map 的关系

Assets 与 Map 后续应优先联动：

- 不动产绑定地图位置。
- 交通工具影响出行方式或行程文案。
- Map 目的地可选择资产地点，例如“回家”“去某处房产”“去车库”。
- 地图区域解锁后可生成资产机会，例如可购入房产、特殊地点资产。
- Map 仍然拥有路线和行程模拟，Assets 不接管地图职责。

## 9. Recommended Execution Order / 推荐执行顺序

1. 建立 Home 通用文件夹 tile 基座。
2. Shopping 作为第一个文件夹型入口落地。
3. 建立 Shopping MVP 页面与基础数据结构。
4. 建立 Assets 独立入口与基础数据结构。
5. 建立 Stock -> Assets 投资分类同步或只读汇总。
6. 建立 Shopping -> Wallet / Assets 的购买后交接。
7. 建立 Chat 商品卡片与购物推荐互动。
8. 建立 Assets -> Map 的地点和交通工具联动。
9. 最后再补 Appearance 文件夹样式配置。

## 10. First Implementation Guardrails / 第一轮实现护栏

- 不要每个模块单独实现文件夹 UI。
- 不要在第一轮做完整可编辑文件夹系统。
- 不要把 Shopping 的商品分类写死在 Home 视图里；应通过统一入口元数据提供。
- 不要把 Assets 合并进 Wallet 或 Stock。
- 不要让 Appearance 管理购物分类或资产分类。
- 第一轮以可运行、可复用、可测试为目标，动画和视觉细节留给后续视觉重建。
