# Wallet 卡面与收藏功能接手说明

Updated: 2026-08-12

Status: `CARD_IDENTITY_AND_COLLECTION_UX_ACCEPTED_LOCALLY / FORMAL_ASSET_PUBLICATION_PENDING / UNLOCK_PRODUCERS_DEFERRED`

这是一份仅面向 Wallet 当前卡面美化与收藏功能的接手说明，不是项目级路线图，也不为其他模块安排任务。正式优先级仍以 `docs/roadmap/TODO_ROADMAP.md` 为准。

## 1. 当前目标

把 Wallet 做成有成品移动 App 质感的卡包：银行卡纵向叠放，点选一张卡后可查看并替换这张卡独有的卡面。卡面收藏使用“数字副卡”叙事，替换外观不会创建第二份余额、额度或支付能力。

Wallet 的昼夜表现跟随 SchatPhone 全局主题，不增加 Wallet 独立昼夜开关。

卡面采用“双呈现”，但同一 `appearanceId` 必须保持同一视觉母版：Wallet 主页使用适合动态叠加余额、账户与尾号的账户呈现；卡面收藏册只有在完整成品卡与主页图已逐张核验为同一构图时，才使用保留银行标识、芯片、币种、尾号和原始排版的收藏呈现。未通过配对核验时，收藏页必须复用主页 artwork 并由代码补齐卡片信息，不能仅因文件名或标题相似而绑定另一张卡。

## 2. 已确认规则

1. 每个外观只绑定一个确定的 `paymentCardId`，同一张卡面不能被其他银行卡装备。
2. `standard`、`licensed_ip`、`art_series`、`seasonal`、`commemorative` 只是整个系统可使用的描述标签，不是每家银行必须补齐的分类表。
3. 每家银行拥有独立、稀疏且经过策展的收藏池。主题应符合该银行的地区文化、品牌气质或剧情来源；不同银行不做同一套主题换色。
4. 卡面可以完全跳出主卡默认配色。艺术、IP、季节与纪念主题各自拥有独立的 artwork、palette、text tone、chip tone、accent 和 material。
5. 解锁来源可描述为 `event`、`metric`、`spend`、`draw`、`service_reward`，但当前不一次实现所有来源。
6. Wallet 负责外观注册、库存、进度和装备状态。未来 Chat 服务号或电话只负责通知、推荐和深链，不拥有解锁状态。
7. 收藏册交互统一为：银行入口切换目录，点击任一卡面只做预览，顶部唯一明确按钮负责装备；当前使用、正在预览、已拥有、待解锁和尚未揭晓是互斥状态。

## 3. 当前运行时与资产进度

### Wallet 页面方向

- 深色主方向：`output/imagegen/wallet-ui-concepts-20260809/wallet-concept-b-dark-integrated-v2.png`
- 浅色对应方向：`output/imagegen/wallet-ui-concepts-20260809/wallet-concept-b-light-integrated-v2.png`
- ICBC 收藏页 V1：`output/imagegen/wallet-ui-concepts-20260809/wallet-icbc-card-collection-v1.png`

收藏页 V1 只作为结构参考。当前运行时已改为每张银行卡读取自己的独立目录，不再把统一的 ICBC 红色锁定卡或同一套主题分类复制给所有银行。

### 已实现的 Wallet 运行时

- `src/lib/wallet-card-appearances.js` 注册每张银行卡自己的可变长度目录；当前目录数为 ICBC `8`、KB `3`、Chase `4`、BNP `4`、MUFG `3`、HSBC `2`、Hana `3`、American Express `2`。
- 七张标准卡面、BNP `Paris Rain` 和 MUFG `Moonlit Maki-e` 已压缩为 `960 x 640` WebP 并接入 `public/images/ui-assets/apps/wallet/cards/`。
- 旧完整卡已重新作为独立银行专属副卡接回本地运行时，而不是覆盖构图不同的新背景卡：ICBC `Hello Kitty Gift / Blue Hour / Gilded Muse / Secret Garden`、KB `Kakao City`、Chase `Peanuts Rooftop`、BNP `Little Prince Arcade`。
- `WalletBankCard` 支持 `account / collector` 两种呈现。只有显式带有 `collectorArtworkVerified: true` 的完整卡才会覆盖收藏呈现；否则收藏模式复用同一 `artwork`，由代码补银行、芯片、币种和尾号，仍不显示余额。代码绘制芯片统一由组件按卡宽 `13.5%` 同比缩放，主页大卡、顶部预览和收藏缩略卡不再各自维护另一套尺寸。
- 干净存档默认拥有七张标准卡面、`Paris Rain` 和 `Moonlit Maki-e`；每张卡只可装备绑定给自身 `paymentCardId` 的已拥有外观。
- 无素材栏位使用 `artwork: ''` 与 `assetStatus: 'pending'`。界面只显示有意封存的卡背、序号和锁定状态，不放临时图，不显示“素材缺失”或“制作中”，也不允许装备。
- 拥有列表、当前装备映射和预留进度记录已持久化并进入 Wallet 备份/恢复；旧存档或非法跨卡选择会回退到对应银行卡的标准卡面。
- 卡片详情和 Wallet 主页均提供“卡面收藏”入口。收藏册包含当前大卡、全部八家银行的 `4 × 2` 可见目录入口、`全部 / 已拥有 / 待解锁` 筛选、精确六位置的 `2 × 3` 页面和超六张分页。筛选或分页产生的布局补位完全隐藏，不再伪装成“封存栏位”；只有目录中真实注册、`assetStatus: 'pending'` 的卡才显示可预览的封存卡背。
- 所有收藏缩略卡点击只更新顶部预览，缩略卡内部不再重复放装备按钮。顶部铭牌明确区分“当前使用”和“正在预览”，并保留唯一的“设为当前卡面”动作；筛选与翻页会把预览同步到当前可见页。
- 顶部预览提供“收藏成品 / 钱包主页”两种明确模式。只要卡面素材已经揭晓，即使尚未解锁，也可以查看完整收藏排版和使用真实 Wallet Home 组件渲染的主页效果；锁定卡在两种预览中都不出现装备按钮。`assetStatus: 'pending'` 的未揭晓卡仍只显示封存卡背。
- 锁定状态和解锁来源现在位于卡片外部铭牌，不再用蒙层遮挡完整卡面。收藏册可端详完整卡号与原始排版，钱包主页模式则展示真实动态余额、账户信息和代码芯片。
- Wallet 聚焦 `43/43` 单测、lint 和生产构建通过；专用 Wallet Playwright 在桌面 Chromium 与模拟 Pixel 5 合计 `6/6` 通过，覆盖预览、顶部唯一装备、刷新持久化、八家银行入口、稳定目录编号和无横向溢出。回归会逐家读取八张 Wallet 主页默认卡的最终 `--card-artwork`，再与收藏页顶部默认预览和默认目录卡逐一比对；任一家重新绑定到不同素材都会直接失败。几何断言同时证明前两张收藏卡同排，卡槽入场动画按行同步、按下一行递进，不再让同一行产生视觉台阶。真实物理设备证明仍未完成。

### 资产状态

- `public/images/ui-assets/apps/wallet/cards/collector/` 保留七张旧标准完整卡和七张已核验的完整副卡。七张旧标准完整卡与当前默认主页 artwork 不是同一母版，已从运行时默认外观解绑但没有删除；若未来重新使用，必须作为独立新外观重新命名、绑定与策展。
- 当前允许使用完整收藏图的已核验配对只有：ICBC `Hello Kitty Gift / Blue Hour / Gilded Muse / Secret Garden`、KB `Kakao City`、Chase `Peanuts Rooftop`、BNP `Little Prince Arcade`。
- `public/images/ui-assets/apps/wallet/cards/home/` 当前含上述七张旧完整副卡的主页无字衍生背景。
- 这些新增本地 WebP 还没有完成正式图床发布登记。当前只用于本机预览；在提交前必须回到项目素材上传链路，完成远端对象、登记与回读校验。
- 独立高保真原型仍位于 `tmp/wallet-card-collection-concept/`，只保留为视觉证据，不是 Wallet 运行时页面，不应提交。

### 本轮新增并通过目视检查的候选

| 绑定对象 | 候选卡面 | 主题定位 | 资产 |
| --- | --- | --- | --- |
| `wallet_card_bnp_eur` | Paris Rain | 法式印象派雨夜油画；蓝紫、雨银与暖灯色，不沿用 BNP 默认墨绿 | 已接入运行时 |
| `wallet_card_mufg_jpy` | Moonlit Maki-e | 日式漆艺与莳绘月夜；深靛、螺钿银与克制金色，不沿用 MUFG 默认红黑 | 已接入运行时 |
| `wallet_card_amex_usd_global_credit` | World Passage | 明快的世纪中叶现代主义环球旅行插画；青绿、珊瑚、藏红花与银色，不仿制官方蓝盒或百夫长 | 已接入运行时 |

`World Passage` 已作为 American Express 机构参考信用卡接入 Wallet。产品名、卡号、额度与条款保持 SchatPhone 虚构；不使用真实 American Express 标志、真实产品名或官方卡面。账单币种为 USD。

上述三张新图都是无字、无卡号、无芯片、无卡片轮廓的 `1536 x 1024` 背景，银行名、产品名、卡号、芯片和状态应由 Wallet 代码动态叠加。

## 4. 当前运行时模型

```text
CardAppearance
  id
  paymentCardId
  title
  series
  artwork
  collectorArtwork
  collectorArtworkVerified
  equipSupported
  assetStatus
  palette / textTone / chipTone / accent / material
  unlockSource

selectedAppearanceByCardId
  [paymentCardId]: appearanceId

ownedCardAppearanceIds
cardAppearanceProgress
```

收藏页只读取当前银行卡实际注册的外观，不渲染一套全银行共用的主题栏位。旧存档或不存在选择记录时，回退到该卡的 `standard` 外观。

## 5. 接下来三步

1. 把本轮 `collector/` 与 `home/` 新增 WebP 走完正式图床上传、登记与远端回读校验，再把本地临时 URL 切换为项目资产 URL；不改变当前卡面与目录策展。
2. 在 Wallet 自身范围内只选择一张现有外观接入首个累计消费解锁闭环，并让收藏册铭牌显示真实进度；其他 `event`、`draw`、`service_reward` 继续只保留数据能力。
3. 继续打磨卡面收藏册的细节状态，重点是超窄屏文字、完整图加载失败回退和日夜模式视觉验收；不扩展到 Chat、电话、会员卡或其他跨 App 解锁生产者。

## 6. 当前边界

- 本轮只修改 Wallet 的本地外观目录、Store 状态、银行卡渲染、卡片详情/收藏页和对应测试；交易、余额、额度与支付行为未改变。
- 运行时卡面已进入 `public/`，设计候选仍留在 `output/imagegen/`；候选不等于已注册或已拥有。
- American Express 新卡已接入；会员卡、商户卡、服务号推荐和跨 App 解锁生产者仍未实现。
