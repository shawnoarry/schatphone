# 现代首尔 K-pop 娱乐圈：第一批百科文稿索引

Updated: 2026-06-12

Status: `ENCYCLOPEDIA_FIRST_BATCH_REVIEW`

## 批次定位

本索引用于审核第一批 K-pop 百科文稿。第一批目标是让世界观具备可进入 Chat、WorldBook、Book、Contacts、Calendar、Map 和后续论坛功能的行业背景。

第一批不追求完整行业百科。它先覆盖最常用的上下文：行业机制、中文饭圈术语、真实实体坐标。

## 当前 Book / WorldBook 集成状态

| 文稿 | 当前状态 | Book / WorldBook 调用状态 |
| --- | --- | --- |
| `2026-06-07-modern-seoul-kpop-main-worldview-draft.md` | 主世界观草稿 | 已作为内置只读 Book 文本进入功能，可在 WorldBook 选择和启用。 |
| `2026-06-07-modern-seoul-kpop-world-rules-draft.md` | 世界规则草稿 | 已作为内置只读 Book 文本进入功能，可在 WorldBook 选择和启用。 |
| `2026-06-09-modern-seoul-kpop-encyclopedia-entries-draft.md` | 第一批行业机制百科 | 已提交为文稿；当前代码里仍只有百科占位进入 Book，不是本文正式内容。 |
| `2026-06-12-modern-seoul-kpop-chinese-fandom-terminology-draft.md` | 中文饭圈术语百科 | 文稿阶段，未进入 Book 内置资产。 |
| `2026-06-12-modern-seoul-kpop-real-entity-coordinate-draft.md` | 真实实体坐标百科 | 文稿阶段，未进入 Book 内置资产。 |

当前代码层面的内置 Book 资产只有三项：

1. `现代首尔 K-pop 娱乐圈：主世界观`
2. `现代首尔 K-pop 娱乐圈：世界规则`
3. `现代首尔 K-pop 娱乐圈：百科条目占位`

因此，第一批百科文稿审核通过后，还需要单独做一次数据集成，把百科占位替换或扩展为真实百科文稿。

## 第一批百科文稿清单

### 1. 行业机制百科

文件：`docs/superpowers/content/2026-06-09-modern-seoul-kpop-encyclopedia-entries-draft.md`

覆盖内容：

- 公司、厂牌与资源阶层
- 练习生、出道与名册机制
- 代际坐标、团体定位与行业资历
- 回归、打歌与宣传周期
- 平台、榜单、销量与粉丝经济
- 论坛、社媒与中文饭圈社区
- 创作、舞台与视觉制作部门
- 合同、商务、品牌与 PR 危机
- 海外市场、巡演与全球粉圈
- 空间、日程与行业动线

用途：提供行业骨架和机制词。适合进入 WorldBook 百科上下文。

### 2. 中文饭圈术语百科

文件：`docs/superpowers/content/2026-06-12-modern-seoul-kpop-chinese-fandom-terminology-draft.md`

覆盖内容：

- 粉丝身份与立场
- CP 与关系讨论
- 回归、打歌与舞台
- 榜单、销量与数据
- 站子、前线与物料
- 论坛、争议与澄清
- 翻译、搬运与跨圈传播

用途：服务 Chat、论坛、社媒、服务号和粉丝角色档案。术语用于解释语境，不用于把传闻变成事实。

### 3. 真实实体坐标百科

文件：`docs/superpowers/content/2026-06-12-modern-seoul-kpop-real-entity-coordinate-draft.md`

覆盖内容：

- 公司与厂牌坐标
- 代表团体与代际坐标
- 2024-2026 补充新坐标
- 音乐节目与舞台
- 粉丝平台、社媒与内容平台
- 榜单、销量与奖项
- 实体使用边界

用途：提供真实行业坐标。所有实体都是 AU 可变坐标，不固定现实名册。

## 第一批完成标准

- 文稿类别全部使用百科，不使用旧分类。
- 百科文稿服务上下文，不写成小说正文。
- 真实实体作为坐标，不作为硬名册。
- 中文饭圈术语提供语境解释，不确认传闻事实。
- 每份文稿都保留用户设定最高优先级。
- 后续集成时，Book 分类使用 `encyclopedia`，WorldBook 角色使用 `encyclopedia`。

## 下一步建议

1. 用户先审核第一批百科文稿内容。
2. 删除不需要的实体、术语或条目。
3. 确认是否把三份百科作为三个独立 Book 资产，或合并成一个大型百科资产。
4. 审核通过后再进入代码集成，替换当前百科占位。
5. 人设模板字段在下一批按 Contacts 结构单独写，不混进 Book 文本资产。

## 草稿自查

- 说明了哪些文稿已经进入功能，哪些还只是文稿阶段。
- 说明了当前 Book 里仍是百科占位。
- 说明了第一批百科的完成边界。
- 移除了不适合作为上下文百科的角色身份说明类文稿。
- 没有引入新的代码字段名作为用户可见概念。
