# Shopping 六店商品分类、扩充与生图素材 Brief

> 状态：分类补齐已落地；Batch 0A 三家 specialty store 的 12 张低质量风格图已作为仓库内备选记录，无 accepted 选择且 Git 交接待完成；其余商品扩充与素材仍为提案，非已批准实现队列。
>
> 基线：2026-08-10，当前 `main` 的六店 Shopping 合同。
>
> 范围：商品分类、候选扩充、商品摄影与店铺视觉素材。
>
> 不包含：改动稳定 ID、实现更多商品数据、继续生成 Batch 0A 以外的图片、接入运行时素材、调整购物流程或宣称真机验收完成。

## 1. 目标

当前 Shopping 已有六个独立 storefront 和 31 个双语虚构种子商品。原有 24 个商品保持不变，首轮新增 7 个商品已补齐所有允许分类；商品深度与正式商品摄影仍未落地。本 brief 用于在不改变现有 Shopping 所有权边界的前提下：

1. 盘点六店现有商品与分类缺口；
2. 给出每店由 4 个扩充到 12 个商品的候选组合；
3. 明确后续生图数量、构图规范、命名建议与验收要求；
4. 为后续产品数据、图片生成和 UI 接入拆出可独立验收的批次。

本文不是第二路线图。候选商品名、候选 slug、货架标签和素材路径只有在对应实现切片获批后才能成为运行时合同。

## 2. 不可变合同

| 店铺 | `serviceKey` | 模板 | canonical route | 当前允许的商品分类 |
| --- | --- | --- | --- | --- |
| Coupang | `schat_mall` | `city_market` | `/shopping/schat_mall` | `mall`, `gifts`, `home`, `fashion`, `beauty` |
| 29CM | `nova_digital` | `tech_catalog` | `/shopping/nova_digital` | `digital`, `luxury`, `gifts` |
| Kurly | `daily_fresh` | `fresh_market` | `/shopping/daily_fresh` | `grocery`, `home`, `mall` |
| WORKSOUT | `style_cloud` | `fashion_editorial` | `/shopping/style_cloud` | `fashion`, `luxury`, `gifts` |
| IKEA Korea | `nordhus_home` | `room_planner` | `/shopping/nordhus_home` | `home`, `gifts` |
| OLIVE YOUNG | `mellow_care` | `care_lab` | `/shopping/mellow_care` | `beauty`, `gifts` |

扩充与素材接入必须继续满足以下边界：

- 六店可共用 Shopping Store、schema、quote service 和 persistence envelope，但商品、收藏、购物车、结算、订单及可见历史必须按 `serviceKey` 隔离。
- Home Shopping folder 只是六个 App 的 launcher，不得新增聚合 Shopping hub、店内跨店切换或跨 App 购物车与结算。
- 不改变已有 `serviceKey`、storefront template、canonical route、原 24 个种子商品 ID 或新增 7 个分类补齐商品 ID。
- 正常 hydration 只能补缺失的稳定商品 ID；backup restore 必须忠实恢复 snapshot，不能偷偷补货或覆盖同 ID 数据。
- `mall` 在当前 UI 中也是“当前店铺全部商品”的聚合筛选；不要把新的细分类直接塞进持久化全局 category key。
- 可参考公开品牌的标志、颜色、信息层级与品类语法，但商品、包装、价格和广告文案必须为 SchatPhone 虚构内容。
- 不使用官方商品图，不复刻可识别的官方 SKU 或包装，不暗示品牌合作、官方门店或真实库存。

## 3. 当前商品盘点

| 店铺 | 当前商品 | 当前分布 | 后续深度缺口 |
| --- | --- | --- | --- |
| Coupang | 原 4 个商品，加城市轻跑鞋、屏障护手霜双支装 | `mall` 2、`gifts` 1、`home` 1、`fashion` 1、`beauty` 1 | 分类已补齐；日常复购与广谱商城深度仍不足 |
| 29CM | 原 4 个数码商品，加 ATELIER 登机箱、LINE 金属钢笔 | `digital` 4、`luxury` 1、`gifts` 1 | 分类已补齐；编辑型生活方式选品仍偏少 |
| Kurly | 本周鲜果盒、七日早餐补给、基础居家补充包、厨房常备小仓 | `grocery` 3、`home` 1 | 缺少即食、烘焙、饮品与精细家务补给 |
| WORKSOUT | 原 4 个商品，加鞋履护理组 | `fashion` 3、`luxury` 1、`gifts` 1 | 分类已补齐；鞋履、下装与小配件仍不足 |
| IKEA Korea | 原 4 个家居商品，加 DOT 马克杯对杯 | `home` 4、`gifts` 1 | 分类已补齐；厨房、工作区和纺织品仍不足 |
| OLIVE YOUNG | 原 4 个美妆护理商品，加 Pocket Care 旅行小样组 | `beauty` 4、`gifts` 1 | 分类已补齐；防晒、底妆与头发护理仍不足 |

分类补齐切片已新增 7 个稳定商品，使总量从 24 增至 31。后续仍建议六店各达到 12 个商品，即再从下方候选中审批 41 个，总量达到 72。12 个商品足以形成有辨识度的首屏货架，同时仍能控制双语文案、价格、状态、图片和回归测试的维护成本。

## 4. 分类策略

持久化层继续使用现有全局分类。更细的店内组织先作为 presentation collection 或 tag 提案，不在本轮新增全局 category key。

| 店铺 | 建议店内货架标签 | 对应现有分类 |
| --- | --- | --- |
| Coupang | 日常速购、家居补给、穿搭、美妆、礼赠 | `mall`, `home`, `fashion`, `beauty`, `gifts` |
| 29CM | Tech、Living Design、Fashion Objects、Gifts | `digital`, `luxury`, `gifts` |
| Kurly | 果蔬、早餐、冷藏、即食、常温储备、家务补给 | `grocery`, `home`；`mall` 只作全部商品入口 |
| WORKSOUT | Outerwear、Tops、Bottoms、Footwear、Accessories、Collectibles | `fashion`, `luxury`, `gifts` |
| IKEA Korea | Living、Bedroom、Storage、Lighting、Work、Kitchen | `home`, `gifts` |
| OLIVE YOUNG | Skincare、Makeup、Body、Hair、Wellness、Gift Sets | `beauty`, `gifts` |

如果后续 UI 需要展示这些标签，应先确定它们是可筛选字段、编辑专题还是纯展示 tag，再设计迁移和测试；不能仅为生图方便就扩大持久化 schema。

## 5. 商品扩充清单

以下清单中的 7 个 `shopping_seed_*` 条目已经作为稳定分类补齐商品落地，其余 41 个 slug 仍只用于素材沟通和文件名草案，不是已批准的稳定商品 ID。剩余条目正式落地前仍需补齐双语描述、价格、币种、`giftable`、`assetEligible`、库存状态及迁移策略。

### 5.1 Coupang / `schat_mall`

定位：高密度、快速满足日常需求的综合商城。扩充后建议实际分类分布为 `mall` 4、`home` 3、`fashion` 2、`beauty` 1、`gifts` 2。

| 候选 slug | 中文名 / English | 分类 | 货架标签 | 商品图重点 |
| --- | --- | --- | --- | --- |
| `pocket-charge-bank` | 口袋快充电源 / Pocket Charge Bank | `mall` | 日常速购 | 白底三分之四角度，红色充电线形成速度线 |
| `rain-ready-umbrella` | 晴雨折叠伞 / Rain-Ready Umbrella | `mall` | 日常速购 | 收拢与半开状态同框，突出防泼水伞面 |
| `stack-utility-cart` | STACK 三层推车 / STACK Utility Cart | `home` | 家居补给 | 浅灰室内角落，三层容量清晰可读 |
| `steam-care-brush` | 便携蒸汽护理刷 / Steam Care Brush | `home` | 家居补给 | 产品与平整衣料同框，不出现人物或品牌字样 |
| `shopping_seed_mall_runner`（已落地） | 城市轻跑鞋 / City Runner Shoes | `fashion` | 穿搭 | 成对侧前方角度，白灰鞋体配一处红色细节 |
| `layer-knit-cardigan` | 叠穿针织开衫 / Layer Knit Cardigan | `fashion` | 穿搭 | ghost mannequin 或平铺，纹理与版型优先 |
| `shopping_seed_mall_hand_cream`（已落地） | 屏障护手霜双支装 / Barrier Hand Cream Duo | `beauty` | 美妆 | 两支无品牌软管，干净白底与淡蓝凝霜质感 |
| `birthday-message-box` | 生日留言礼盒 / Birthday Message Box | `gifts` | 礼赠 | 红蓝黄模块化礼盒，不生成可读祝福文字 |

### 5.2 29CM / `nova_digital`

定位：黑白编辑语境中的设计与生活方式选品。扩充后建议分布为 `digital` 8、`luxury` 2、`gifts` 2。

| 候选 slug | 中文名 / English | 分类 | 货架标签 | 商品图重点 |
| --- | --- | --- | --- | --- |
| `frame-compact-camera` | FRAME 随身相机 / FRAME Compact Camera | `digital` | Tech | 哑黑机身置于暖灰纸面，橙色快门点作为唯一强调 |
| `mono-pocket-speaker` | MONO 便携音箱 / MONO Pocket Speaker | `digital` | Tech | 几何网罩与侧面旋钮可读，大面积留白 |
| `paperlight-reader` | Paperlight 阅读器 / Paperlight Reader | `digital` | Tech | 无可读屏幕文字，以柔和空白页面和薄机身为主 |
| `halo-smart-lamp` | HALO 智能桌灯 / HALO Smart Desk Lamp | `digital` | Living Design | 雕塑感灯体与一圈暖光，黑白编辑构图 |
| `shopping_seed_nova_fountain_pen`（已落地） | LINE 金属钢笔 / LINE Fountain Pen | `gifts` | Gifts | 笔尖、笔帽与黑色礼盒分离排布，不出现品牌刻字 |
| `quiet-incense-object` | 静线香座 / Quiet Incense Object | `gifts` | Living Design | 石材香座和单缕烟，避免宗教或官方设计复刻 |
| `shopping_seed_nova_carry_on`（已落地） | ATELIER 登机箱 / ATELIER Carry-On | `luxury` | Fashion Objects | 低饱和铝灰箱体，突出轮组和拉杆工艺 |
| `meridian-watch` | MERIDIAN 自动腕表 / MERIDIAN Automatic Watch | `luxury` | Fashion Objects | 黑色台座、硬侧光、虚构无标表盘 |

### 5.3 Kurly / `daily_fresh`

定位：晨间配送、冷链与精细家庭补给。扩充后建议分布为 `grocery` 9、`home` 3；`mall` 保持全部商品入口。

| 候选 slug | 中文名 / English | 分类 | 货架标签 | 商品图重点 |
| --- | --- | --- | --- | --- |
| `morning-leaf-box` | 清晨叶菜盒 / Morning Leaf Box | `grocery` | 果蔬 | 露水感叶菜与透气纸盒，避免夸张水珠和过度饱和 |
| `orchard-yogurt-set` | 果园酸奶组 / Orchard Yogurt Set | `grocery` | 早餐 | 四杯虚构包装、果粒与亚麻餐布，不生成标签文字 |
| `slow-soup-trio` | 慢炖汤三款 / Slow Soup Trio | `grocery` | 即食 | 三只透明耐热袋或碗，颜色区分口味 |
| `market-dumpling-kit` | 市集手工饺子组 / Market Dumpling Kit | `grocery` | 冷藏 | 托盘俯拍，面皮褶皱与冷藏质感清楚 |
| `dawn-bakery-box` | 黎明烘焙盒 / Dawn Bakery Box | `grocery` | 早餐 | 可颂、餐包、吐司的纸盒组合，晨光侧逆光 |
| `roast-drip-bag-set` | 城市烘焙挂耳组 / City Roast Drip Set | `grocery` | 常温储备 | 无字独立包装与陶杯，紫色封条作轻量识别 |
| `kitchen-cloth-set` | 厨房清洁布六件组 / Kitchen Cloth Set | `home` | 家务补给 | 规则折叠、不同织纹与浅石材背景 |
| `fresh-lock-jars` | FRESH LOCK 密封罐组 / FRESH LOCK Jar Set | `home` | 家务补给 | 三种容量同框，装少量谷物展示透明度 |

### 5.4 WORKSOUT / `style_cloud`

定位：深色多品牌街头与设计师时装编辑。扩充后建议分布为 `fashion` 7、`luxury` 3、`gifts` 2。

| 候选 slug | 中文名 / English | 分类 | 货架标签 | 商品图重点 |
| --- | --- | --- | --- | --- |
| `grid-cargo-trousers` | GRID 机能工装裤 / GRID Cargo Trousers | `fashion` | Bottoms | ghost mannequin，口袋结构与膝部剪裁清晰 |
| `signal-runner-sneakers` | SIGNAL 拼接跑鞋 / SIGNAL Runner Sneakers | `fashion` | Footwear | 低机位双鞋构图，炭灰主体配黄色小面积强调 |
| `afterdark-hoodie` | AFTERDARK 重磅连帽衫 / AFTERDARK Heavy Hoodie | `fashion` | Tops | 正反面其一为主，不生成品牌印花或可读文字 |
| `panel-field-cap` | PANEL 五片帽 / PANEL Field Cap | `fashion` | Accessories | 硬侧光凸显拼片和帽檐弧度 |
| `coldframe-sunglasses` | COLDFRAME 金属墨镜 / COLDFRAME Sunglasses | `luxury` | Accessories | 黑镜片、银色框架、镜面台座，避免人物脸部 |
| `numbered-leather-wallet` | 编号皮革短夹 / Numbered Leather Wallet | `luxury` | Collectibles | 打开与闭合状态，编号只用不可读抽象压纹 |
| `shopping_seed_fashion_sole_care`（已落地） | 鞋履护理组 / Sole Care Kit | `gifts` | Gifts | 刷具、布和无品牌护理瓶按工具逻辑排布 |
| `night-accessory-box` | 夜行配件礼盒 / Night Accessory Box | `gifts` | Gifts | 袜、钥匙扣、卡套组合，黑底红黄点色 |

### 5.5 IKEA Korea / `nordhus_home`

定位：按房间与功能组织的模块化家居。扩充后建议分布为 `home` 10、`gifts` 2。

| 候选 slug | 中文名 / English | 分类 | 货架标签 | 商品图重点 |
| --- | --- | --- | --- | --- |
| `linn-work-desk` | LINN 轻量书桌 / LINN Work Desk | `home` | Work | 正三分之四角度，桌腿和走线结构完整可见 |
| `nook-dining-stool` | NOOK 餐厨凳 / NOOK Dining Stool | `home` | Kitchen | 单品白底与木纹细节，不模仿官方系列造型 |
| `lane-flatweave-rug` | LANE 平织地毯 / LANE Flatweave Rug | `home` | Living | 局部卷边展示厚度，几何纹样保持原创 |
| `roll-kitchen-cart` | ROLL 厨房推车 / ROLL Kitchen Cart | `home` | Kitchen | 三层小推车搭配少量虚构厨具，容量明确 |
| `still-blackout-curtain` | STILL 遮光窗帘 / STILL Blackout Curtain | `home` | Bedroom | 半明半暗窗边场景，展示遮光差异 |
| `arc-wall-mirror` | ARC 壁挂镜 / ARC Wall Mirror | `home` | Bedroom | 镜面不出现人物或相机，安装比例清楚 |
| `shopping_seed_nordhus_mugs`（已落地） | DOT 马克杯对杯 / DOT Mug Pair | `gifts` | Kitchen | 蓝黄双色对杯，干净桌面和柔和早餐光 |
| `evening-candle-trio` | EVENING 香氛蜡烛三件组 / EVENING Candle Trio | `gifts` | Living | 三种高度、轻微火焰与无字容器，避免烟雾遮挡 |

### 5.6 OLIVE YOUNG / `mellow_care`

定位：基于功效分类与快速发现的美妆、身体和头发护理。扩充后建议分布为 `beauty` 10、`gifts` 2。

| 候选 slug | 中文名 / English | 分类 | 货架标签 | 商品图重点 |
| --- | --- | --- | --- | --- |
| `daily-shield-sunscreen` | Daily Shield 清透防晒 / Daily Shield Sunscreen | `beauty` | Skincare | 白色软管与薄透乳液涂抹，不写 SPF 数值或医疗宣称 |
| `melt-away-balm` | Melt Away 卸妆膏 / Melt Away Cleansing Balm | `beauty` | Skincare | 打开的圆罐与膏体刮痕，鼠尾草绿底 |
| `air-veil-cushion` | Air Veil 轻透气垫 / Air Veil Cushion | `beauty` | Makeup | 打开粉盒、粉扑和单一自然色，不复制现有包装 |
| `feather-brow-pencil` | Feather Brow 眉笔 / Feather Brow Pencil | `beauty` | Makeup | 眉笔、刷头与细线色样，珊瑚色小面积点缀 |
| `root-calm-serum` | Root Calm 头皮精华 / Root Calm Scalp Serum | `beauty` | Hair | 尖嘴瓶与透明精华质地，不使用治疗性视觉 |
| `sunday-repair-mask` | Sunday Repair 发膜 / Sunday Repair Hair Mask | `beauty` | Hair | 无字罐装、柔滑发丝材质样片，不出现人脸 |
| `green-pause-kit` | Green Pause 舒缓礼盒 / Green Pause Care Kit | `gifts` | Gift Sets | 面膜、眼罩和护手霜组合，包装全部原创无字 |
| `shopping_seed_care_travel_minis`（已落地） | Pocket Care 旅行小样组 / Pocket Care Travel Minis | `gifts` | Gift Sets | 透明收纳袋与五件迷你护理品，轮廓差异明显 |

## 6. 生图素材矩阵

### 6.1 正式交付量

| 素材类型 | 数量 | 建议 master 规格 | 运行时用途 |
| --- | ---: | --- | --- |
| 当前 31 个 SKU 商品主图 | 31 | `1024 x 1024`, PNG master | 替换当前 code-native 商品舞台 |
| 剩余候选 41 个 SKU 商品主图 | 41 | `1024 x 1024`, PNG master | 商品卡片、详情与分享预览 |
| 六店 storefront hero | 6 | `1536 x 864`, PNG master | 每店头部主视觉；核心物体置于中央安全区 |
| 六店分类 / editorial banner | 12 | `1536 x 1024`, PNG master | 每店 2 张专题或分类视觉 |
| **正式生成素材合计** | **90** | 生成 master 后再派生 WebP | 不含 contact sheet 和失败候选 |

App icon 与 reference mark 已经存在，本轮不重做。缩略图、分享卡小图和低清占位图应从已验收 master 派生，不另算生成任务。

### 6.2 每店 hero 与 banner 主题

| 店铺 | Hero 主题 | Banner A | Banner B |
| --- | --- | --- | --- |
| Coupang | 红蓝黄模块化包裹与日用品组成快速到达场景 | 日常速购 | 家居与礼赠 |
| 29CM | 黑白编辑台面上的数码与设计物件，单点橙色动作色 | Tech edit | Objects & gifts |
| Kurly | 清晨自然光下的冷藏箱、鲜果与烘焙组合 | Morning fresh | Pantry restock |
| WORKSOUT | 深色混凝土空间中的夹克、鞋与包，硬光和黄色点色 | New drop | Accessories & collectibles |
| IKEA Korea | 明亮原创模块房间，展示阅读、工作与收纳关系 | Small-space living | Kitchen & storage |
| OLIVE YOUNG | 白色护理台上的护肤、彩妆和头发护理组合 | Daily skincare | Makeup & gift sets |

Hero 和 banner 不承载可读促销字、价格或 slogan；所有文字由 UI 原生叠加，避免生成图中的乱码和后续本地化障碍。

## 7. 六店统一与差异化美术规范

| 店铺 | 背景与色彩 | 光线与构图 | 材质重点 | 禁止项 |
| --- | --- | --- | --- | --- |
| Coupang | 白、浅灰为主，红蓝黄只作强调 | 高亮商业棚拍，物体轮廓直接、密度较高 | 实用塑料、织物、纸盒 | 官方包装、促销贴纸、可读折扣字 |
| 29CM | 黑、白、暖灰，橙色单点动作色 | 编辑式负空间、克制硬光、构图偏静物杂志 | 拉丝金属、哑光塑料、纸张、皮革 | 把所有商品拍成普通电商白底图 |
| Kurly | 米白、石灰、低饱和紫与鲜绿 | 清晨侧光、整齐俯拍或自然三分之四角度 | 新鲜食材、纸、亚麻、透明冷藏材质 | 过度乡村化、失真食物、夸张水珠 |
| WORKSOUT | 黑、炭灰、混凝土，黄和红点色 | 定向硬光、低机位、ghost mannequin、较强阴影 | 技术面料、皮革、金属、橡胶 | 真实品牌标、可辨识联名、完整真人脸部 |
| IKEA Korea | 白、浅木、蓝黄点色 | 明亮室内漫射光，优先展示比例和空间关系 | 木、粉末涂层金属、织物、玻璃 | 复刻官方商品、只有氛围而看不清结构 |
| OLIVE YOUNG | 白、鼠尾草绿、珊瑚与少量橙 | 柔光近景、整齐功效分组、少量质地样片 | 玻璃、软管、乳霜、凝胶、纸盒 | 官方包装、医学治疗暗示、无法辨认的密集文字 |

统一要求：

- 商品主体在 160 px 左右缩略图中仍能一眼辨识，不能依赖背景文案说明是什么。
- 同店商品保持一致的白平衡、阴影方向、镜头高度和背景材质；跨店要有明显视觉差异。
- 画面不生成价格、二维码、水印、官方 logo、品牌名、可读广告文案或真实认证标识。
- 服装首轮以单品、平铺或 ghost mannequin 为主；若未来增加模特图，应作为独立人物一致性切片。
- 食品必须结构合理、可食用且包装无乱码；护理品不得承诺治疗效果。
- 商品图保留至少 8% 四周安全边距，避免桌面卡片和 Pixel 5 裁切掉主体。

## 8. 文件与命名建议

以下是待实现时确认的建议路径，不表示目录已存在或已成为资产合同：

```text
output/imagegen/shopping-product-photography/<serviceKey>/
  candidates/
  accepted-masters/
  contact-sheets/

public/images/ui-assets/apps/shopping/<serviceKey>/
  products/<candidate-slug>-01.webp
  hero/storefront-hero-01.webp
  collections/<collection-slug>-01.webp
```

命名规则：

- 使用稳定的 ASCII kebab-case；文件名不直接依赖可变展示名。
- `serviceKey` 必须进入目录层级，避免跨店误引用。
- 同一 SKU 的候选用 `-c01`, `-c02`；只有验收通过的运行时导出使用 `-01`。
- master 保留 PNG；运行时优先导出质量可控的 WebP，并记录宽高、文件大小和 hash。
- 商品数据只保存项目内相对路径；alt text 使用真实双语商品语义，不描述“AI 生成”或装饰性背景。

跨机器素材交接规则：

- 本机外部资料库只可作为当次工作的可选参考，不能成为实现、验收、复核或后续机器接力的唯一依赖。
- 后续机器必须看到的候选图、prompt、request、manifest、hash、contact sheet、选择记录及必要的来源/许可说明，都必须复制到 Git 可提交的仓库路径，并由文档使用仓库相对路径引用。
- `output/imagegen/shopping-product-photography/` 用于可追溯候选和 master；只有验收后的运行时派生图才进入 `public/images/ui-assets/apps/shopping/`。
- 文件仅存在于某台机器的 checkout 并不等于已跨机器交接。未 commit/push 时必须显式标记 `PENDING_GIT_COMMIT`，不得声称其他机器可从 Git 取得。
- 不把本机绝对路径写成素材合同；若某个外部参考会影响后续判断，应把经过筛选且允许留档的必要证据及来源记录一并放入仓库。

## 9. 推荐执行批次

### Batch 0：风格定标

- 每店先选 2 个现有商品，各生成 2 到 3 个候选。
- 输出六店 contact sheet，确认背景、光线、裁切和缩略图辨识度。
- 风格未定标前不批量生成 90 张素材。
- `Batch 0A REPO_ALTERNATIVES_PENDING_GIT_COMMIT 2026-08-10`：WORKSOUT、IKEA Korea、OLIVE YOUNG 各取 2 个现有商品并各生成 2 张 `gpt-image-2` / `low` 图，共 12 张；原始请求、全部备选、manifest、hash、全尺寸与 160 px contact sheet、非约束观察记录位于 `output/imagegen/shopping-product-photography/batch-0a-specialty-style-calibration/`。当前无任何 accepted、recommended 或 rejected 选择；文件已进入仓库内可提交路径，但尚未 commit/push，其他机器仍不能从 Git 取得。本批未生成 high 版本、未导出 runtime WebP、未接入 UI，也不构成用户视觉接受。

### Batch 1：补齐当前 31 个商品主图

- 不改商品 ID、标题、价格或分类，只接入已验收商品图。
- 优先顺序建议为 WORKSOUT、IKEA Korea、OLIVE YOUNG、Kurly、29CM、Coupang，先验证差异最明确的 specialty visual grammar。
- 每完成一家店，独立验证图片 decode、卡片裁切、详情图、收藏、购物车与分享预览。

### Batch 2：审批并实现剩余 41 个候选商品

- 先审批商品组合与数据合同，再生成最终商品图，避免为会被删除的 SKU 生产正式素材。
- 每店独立迁移和测试，保持 `serviceKey` 隔离；不允许把六店一次性混成一笔 checkout。
- 高价值商品是否标记 `assetEligible`，礼盒是否标记 `giftable`，必须逐项评审，不能按分类自动推断。

### Batch 3：Hero 与分类视觉

- 商品卡素材稳定后，再用同一批已验收商品组合 hero 和 banner。
- 每店先接 1 张 hero，再接 2 张 banner；不得为了展示 banner 引入新的聚合 hub 或跨店 rail。

## 10. 单图 Prompt 组成规则

每个 SKU 使用独立 prompt，不使用一条 prompt 批量生成多个不可控商品。推荐包含以下字段：

```text
fictional product + exact object structure + material and color
+ storefront-specific background and lighting
+ three-quarter or top-down camera direction
+ centered safe area and thumbnail readability
+ no logo, no readable text, no price, no watermark, no official packaging
+ square commercial product photography, 1024 x 1024
```

生成记录至少包含：

- `serviceKey`、候选 slug、中文名和英文名；
- prompt、生成器、日期和候选编号；
- 选择或淘汰原因；
- master 尺寸、运行时导出尺寸、文件大小和 hash；
- alt text 与使用页面；
- 是否出现文字、logo、人体、食品或功效宣称等需额外复核的元素。

不要覆盖原始候选或 master。重新裁切、去背景、压缩和调色都应生成新的派生文件，便于追溯。

## 11. 验收清单

### 商品与分类

- [ ] 六店各 12 个商品，共 72 个；新增数量和分类分布与批准清单一致。
- [ ] 所有商品均绑定正确 `serviceKey`，没有跨店重复 ID 或错误图片引用。
- [ ] 只使用当前店铺允许的全局 category key；细分货架未偷偷升级为持久化合同。
- [ ] 双语标题、描述、价格、币种、库存、`giftable` 和 `assetEligible` 语义一致。
- [ ] 正常 hydration 与 backup restore 行为保持现有合同。

### 图片

- [ ] 72 张商品主图、6 张 hero、12 张 banner 均可解码，总计 90 张正式素材。
- [ ] 无官方商品、官方包装、官方图片、可读广告字、价格、水印或合作暗示。
- [ ] 160 px 商品卡缩略图可辨识，详情图无明显结构错误或多余部件。
- [ ] 同店视觉一致，六店之间能仅凭画面语法区分。
- [ ] 桌面 Chromium 和模拟 Pixel 5 下无错误裁切、横向溢出、布局跳动或资源 404。
- [ ] 图片加载失败时仍有可理解的 fallback；低性能状态不阻断收藏、购物车和结算。

### Shopping 边界与验证

- [ ] 每店商品、收藏、购物车、结算、订单、物流与分享预览按 `serviceKey` 隔离。
- [ ] Home 仍为 launcher-only，不存在第七个 Shopping hub 或店内切换器。
- [ ] App Store install visibility 不删除 Shopping 商品、购物车或订单真相。
- [ ] focused Shopping Vitest、相关 Home/App Store/Chat 测试、Shopping E2E、lint、完整 test、build、governance 和 `git diff --check` 通过。
- [ ] 命名真机验收只有在真实设备完成后才能勾选；模拟 Pixel 5 不能写成真机证据。

## 12. 决策点

正式实施前需要明确：

1. 是否批准“每店 12 个、总计 72 个”的首轮容量；
2. 剩余 41 个候选商品中哪些进入稳定种子，哪些只做编辑专题或后续扩充；
3. 店内货架标签是纯展示 tag、可筛选 collection，还是继续只使用现有 category；
4. 哪些高价值商品允许进入 Assets，哪些礼盒允许进入直接赠礼流程；
5. 先只做当前 31 个商品摄影，还是连同剩余 41 个候选商品一起生成；
6. hero 与 banner 是否消费 App Store cover override，还是保持 Shopping 自有静态资产路径。

在这些决策完成前，最稳妥的下一步是只执行 Batch 0 风格定标，不修改商品数据和稳定合同。
