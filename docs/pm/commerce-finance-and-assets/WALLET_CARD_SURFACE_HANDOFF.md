# Wallet Card Surface Handoff

Updated: 2026-08-12

Scope: Wallet 卡包、卡面收藏、完整卡素材与卡外账户信息。本文件是本轮 Wallet 专项的连续工作记录，不是第二份项目路线图；项目优先级仍以 `docs/roadmap/TODO_ROADMAP.md` 为准。

## 当前状态

本轮已完成 Wallet 卡片视觉模型的纠正：银行卡的完整成品卡面是第一视觉资产，Wallet 自己拥有的余额、额度、默认卡和冻结状态全部移到卡片外的信息层。已有完整卡不再被代码 Logo、通用芯片、动态金额或裁切版背景覆盖。

已经落地的体验：

- Wallet 主页保留纵向叠放卡包，当前卡位于最前方；卡堆下方只显示当前卡的账户摘要。
- Cards 列表、卡片详情和收款卡片都复用同一套卡外账户摘要。
- 卡面收藏继续使用每页六个栏位，支持 `全部 / 已拥有 / 待解锁`、跨页目录和八张银行卡之间的专属切换。
- “收藏成品”和“钱包主页”两种预览使用同一张完整卡面；区别仅在于钱包主页预览会出现卡外账户摘要。
- 锁定卡可以查看完整卡面及钱包主页效果，但不会出现装备按钮；卡面仍只允许装备到声明的银行卡。
- 默认主题和实际 `zen` 系统主题均有独立 Wallet 配色，主题来自系统设置而不是浏览器暗色偏好。
- Wallet 近期账单和交易详情保留来源 App 标识，让用户能识别 Shopping、Food Delivery、Chat 或 Wallet 自身产生的记录。
- 卡面拥有状态、当前选择和预留进度继续通过 Wallet 备份恢复；旧存档不会因新增预览卡而自动获得这些卡面。

## 完整成品卡矩阵

下列 14 张卡面已经作为完整成品卡接入。它们保留素材自身的银行标识、芯片、卡号、边框、材质和主题构图；账户数据不再画进卡面。

| 银行 / 卡片 | 完整卡面 |
| --- | --- |
| ICBC 牡丹借记卡 | Peony Standard、Hello Kitty Gift、Blue Hour、Gilded Muse、Secret Garden |
| KB 首尔借记卡 | Seoul Standard、Kakao City |
| Chase 美元借记卡 | USD Standard、Peanuts Rooftop |
| BNP 欧元借记卡 | Euro Standard、Little Prince Arcade |
| MUFG 日元借记卡 | JPY Standard |
| HSBC 港币借记卡 | HKD Standard |
| Hana Global One 信用卡 | Global One Standard |

American Express `World Passage` 当前仍是唯一没有完整成品卡的支付卡，继续使用代码卡兜底；这不是其他完整卡的视觉标准。

## 图床发布记录

运行时统一通过 `projectUiAssetUrl()` 读取项目图床，不再依赖 `public/` 中的 Wallet 卡面副本。

| 批次 | 内容 | 结果 |
| --- | --- | --- |
| `wallet-card-appearances-20260812` | 10 张补充卡面运行时 WebP + 10 张受保护原始 PNG | 20 / 20 已上传并登记 |
| `wallet-card-complete-surface-20260812` | 本轮接受的 14 张完整成品 WebP | 14 / 14 已上传、远端下载回读、字节数与 SHA-256 一致 |

完整成品卡的公开远端前缀为：

```text
schatphone-assets/images/ui-assets/apps/wallet/cards/collector/
```

素材注册表由 `config/project-assets.json` 持有。曾用于主页让位的 7 张裁切图已退出运行时，未上传为正式素材，也没有删除；当前机器的审计副本位于 `tmp/wallet-card-collection-concept/runtime-exports-20260812/home-crops-retired/`。

## 固定设计规则

1. 有完整成品卡时，主页、卡片详情、收款页和收藏页必须复用同一张完整素材，不允许再制作只为通用数据让位的主页裁切版。
2. 余额、额度、尾号、网络、默认和冻结状态属于 Wallet 信息层，不属于卡面素材。
3. 代码 Logo、代码芯片和代码卡号只服务于尚无完整成品卡的兜底卡；它们不能覆盖已完成的素材设计。
4. 卡面目录按银行卡独立拥有。不同银行可以有完全不同的主题、色彩和数量，不能把同一套艺术分类机械复制给所有银行。
5. 锁定状态限制装备，不限制预览；预览不会改变拥有状态、余额、信用额度或支付工具数量。

## 本轮验证记录

2026-08-12 收尾验证结果：

- Wallet Vitest：`tests/wallet-store.test.js` 与 `tests/wallet-view.test.js` 共 44 项通过。
- Wallet Playwright：Chromium 桌面端与模拟 Pixel 5 共 8 项通过，覆盖卡包、账户摘要、收款、冻结、收藏、锁定预览、装备、重载持久化及 `zen` 夜间主题。
- 项目检查：`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run governance:check` 与 `git diff --check` 通过。
- 图床登记复核：`wallet-card-appearances-20260812` 为 20 项（10 项公开运行时 WebP、10 项受保护原始 PNG）；`wallet-card-complete-surface-20260812` 为 14 项公开完整成品 WebP。
- 全量 Vitest 当前为 1895 / 1896 通过。唯一失败位于其他线程正在修改的 `tests/appearance-wallpaper-picker.test.js`：Home 桌面布局版本实际为 `6`，旧断言仍期待 `5`。该问题不属于 Wallet，本轮没有越界修改。

## 接下来最多四步

1. 为 American Express `World Passage` 制作一张完整成品卡，使八张默认支付卡全部退出代码卡兜底。
2. 从当前 10 张背景型补充卡面中逐张挑选，按各银行自己的艺术方向升级为完整成品卡；不要求所有银行拥有同类主题。
3. 把现有 `event / spend / metric / draw / service_reward` 解锁字段接到真实的 Wallet 事件、累计消费和银行服务消息上，并保留明确的获得记录。
4. 在不改变支付卡余额模型的前提下，增加卡面获得后的收藏反馈与银行服务号推荐入口，为后续会员卡等不同卡种预留独立目录。
