# Wallet 卡面与收藏功能接手说明

Updated: 2026-08-11

Status: `FIRST_RUNTIME_SLICE_IMPLEMENTED / LOCAL_ACCEPTANCE_PASSED / UNLOCK_PRODUCERS_DEFERRED`

这是一份仅面向 Wallet 当前卡面美化与收藏功能的接手说明，不是项目级路线图，也不为其他模块安排任务。正式优先级仍以 `docs/roadmap/TODO_ROADMAP.md` 为准。

## 1. 当前目标

把 Wallet 做成有成品移动 App 质感的卡包：银行卡纵向叠放，点选一张卡后可查看并替换这张卡独有的卡面。卡面收藏使用“数字副卡”叙事，替换外观不会创建第二份余额、额度或支付能力。

Wallet 的昼夜表现跟随 SchatPhone 全局主题，不增加 Wallet 独立昼夜开关。

## 2. 已确认规则

1. 每个外观只绑定一个确定的 `paymentCardId`，同一张卡面不能被其他银行卡装备。
2. `standard`、`licensed_ip`、`art_series`、`seasonal`、`commemorative` 只是整个系统可使用的描述标签，不是每家银行必须补齐的分类表。
3. 每家银行拥有独立、稀疏且经过策展的收藏池。主题应符合该银行的地区文化、品牌气质或剧情来源；不同银行不做同一套主题换色。
4. 卡面可以完全跳出主卡默认配色。艺术、IP、季节与纪念主题各自拥有独立的 artwork、palette、text tone、chip tone、accent 和 material。
5. 解锁来源可描述为 `event`、`metric`、`spend`、`draw`、`service_reward`，但当前不一次实现所有来源。
6. Wallet 负责外观注册、库存、进度和装备状态。未来 Chat 服务号或电话只负责通知、推荐和深链，不拥有解锁状态。

## 3. 当前运行时与资产进度

### Wallet 页面方向

- 深色主方向：`output/imagegen/wallet-ui-concepts-20260809/wallet-concept-b-dark-integrated-v2.png`
- 浅色对应方向：`output/imagegen/wallet-ui-concepts-20260809/wallet-concept-b-light-integrated-v2.png`
- ICBC 收藏页 V1：`output/imagegen/wallet-ui-concepts-20260809/wallet-icbc-card-collection-v1.png`

收藏页 V1 只作为结构参考。当前运行时已改为每张银行卡读取自己的独立目录，不再把统一的 ICBC 红色锁定卡或同一套主题分类复制给所有银行。

### 已实现的 Wallet 运行时

- `src/lib/wallet-card-appearances.js` 注册每张银行卡自己的可变长度目录；当前栏位数为 ICBC `3`、KB `2`、Chase `3`、BNP `3`、MUFG `3`、HSBC `2`、Hana `3`。
- 七张标准卡面、BNP `Paris Rain` 和 MUFG `Moonlit Maki-e` 已压缩为 `960 x 640` WebP 并接入 `public/images/ui-assets/apps/wallet/cards/`。
- 干净存档默认拥有七张标准卡面、`Paris Rain` 和 `Moonlit Maki-e`；每张卡只可装备绑定给自身 `paymentCardId` 的已拥有外观。
- 无素材栏位使用 `artwork: ''` 与 `assetStatus: 'pending'`。界面只显示有意封存的卡背、序号和锁定状态，不放临时图，不显示“素材缺失”或“制作中”，也不允许装备。
- 拥有列表、当前装备映射和预留进度记录已持久化并进入 Wallet 备份/恢复；旧存档或非法跨卡选择会回退到对应银行卡的标准卡面。
- 卡片详情已提供“卡面收藏”入口；收藏页包含当前大卡预览、拥有数量、已拥有/当前使用/尚未揭晓状态和真实装备操作。桌面 Chromium 与模拟 Pixel 5 已覆盖装备、刷新保留和无横向溢出。

### 仍在设计输出中的候选资产

- 四张现实 IP 联名概念位于 `output/imagegen/wallet-card-collabs-20260810/`：ICBC / Hello Kitty、KB / Kakao Friends、Chase / Peanuts、BNP / Le Petit Prince。
- 三张 ICBC 艺术探索位于 `output/imagegen/wallet-card-art-series-20260810/`：Blue Hour、Gilded Muse、Secret Garden。它们目前只是风格验证稿，不代表三张都已正式归入 ICBC 收藏池。

### 本轮新增并通过目视检查的候选

| 绑定对象 | 候选卡面 | 主题定位 | 资产 |
| --- | --- | --- | --- |
| `wallet_card_bnp_eur` | Paris Rain | 法式印象派雨夜油画；蓝紫、雨银与暖灯色，不沿用 BNP 默认墨绿 | 已接入运行时 |
| `wallet_card_mufg_jpy` | Moonlit Maki-e | 日式漆艺与莳绘月夜；深靛、螺钿银与克制金色，不沿用 MUFG 默认红黑 | 已接入运行时 |
| 拟新增 `wallet_card_amex_usd_global_credit` | World Passage | 明快的世纪中叶现代主义环球旅行插画；青绿、珊瑚、藏红花与银色，不仿制官方蓝盒或百夫长 | 仅候选 WebP，未注册到银行卡 |

`World Passage` 拟作为钱包持有人新增的 American Express 机构参考信用卡。产品名、卡号、额度与条款必须保持 SchatPhone 虚构；不得使用真实 American Express 标志、真实产品名或官方卡面。它已生成紧凑 WebP 方便后续接入，但尚未写入 Wallet Store 或外观目录，也未决定最终额度、账单币种以外的业务细节；建议账单币种为 USD。

上述三张新图都是无字、无卡号、无芯片、无卡片轮廓的 `1536 x 1024` 背景，银行名、产品名、卡号、芯片和状态应由 Wallet 代码动态叠加。

## 4. 当前运行时模型

```text
CardAppearance
  id
  paymentCardId
  title
  series
  artwork
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

1. 为一个当前封存栏位策展并接入下一张真实卡面；先明确它只属于哪一家银行，再生成素材和开放装备，继续保持不同银行的主题不对称。
2. 只选择一家银行的一张外观接入首个 Wallet 内累计消费解锁闭环；其他 `event`、`draw`、`service_reward` 来源继续只保留数据能力，不扩展到 Chat、电话或事件系统。
3. 单独决定是否新增 American Express 参考信用卡及其虚构产品、额度和账单规则；确认前保留 `World Passage` 资产但不在 Wallet 中出现空业务卡。

## 6. 当前边界

- 本轮只修改 Wallet 的本地外观目录、Store 状态、银行卡渲染、卡片详情/收藏页和对应测试；交易、余额、额度与支付行为未改变。
- 运行时卡面已进入 `public/`，设计候选仍留在 `output/imagegen/`；候选不等于已注册或已拥有。
- American Express 新卡、会员卡、商户卡、服务号推荐和跨 App 解锁生产者均未实现。
