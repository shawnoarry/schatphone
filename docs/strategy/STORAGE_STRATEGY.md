# SchatPhone Storage Strategy / SchatPhone 存储策略

Updated / 更新时间: 2026-03-29

## 1. Purpose / 用途

This document summarizes how SchatPhone should store settings, saves, chat records, world state, and AI-related data without making browser storage too large or too fragile.  
本文用于总结 SchatPhone 应如何保存设置、存档、聊天记录、世界状态与 AI 相关数据，同时避免浏览器本地存储过大或过于脆弱。

Core recommendation / 核心建议：  
Do not treat `localStorage` as the main database. Use layered storage.  
不要把 `localStorage` 当作主数据库，应采用分层存储。

## 2. Main Risk / 主要风险

If all long-term project data is stored directly in browser local storage, the project will eventually encounter quota limits, performance issues, and recovery problems.  
如果把所有长期数据都直接塞进浏览器本地存储，项目迟早会遇到容量限制、性能问题和恢复问题。

High-risk data types / 高风险数据类型：

- large multi-role chat histories / 多角色的大量聊天记录
- repeated prompt fragments / 重复保存的 Prompt 片段
- HTML mini-scene payloads / HTML 小剧场内容
- base64-heavy assets / 大型 base64 资源
- long event logs / 超长事件日志

## 3. Recommended Layered Storage Model / 推荐的分层存储模型

### 3.1 Layer A: `localStorage` for hot small state / 第一层：`localStorage` 存热数据与小状态

Use this layer only for small, high-frequency, configuration-like values.  
这一层只应用于小型、高频、偏配置性质的数据。

Recommended examples / 推荐保存内容：

- user settings / 用户设置
- language and notification switches / 语言与通知开关
- automation switches / 自动化开关
- active conversation or route hints / 当前会话或页面提示
- scheduler index values / 调度器索引值
- last active timestamp / 上次活跃时间戳
- import/export metadata / 导入导出元数据

Rule / 规则：  
Keep this layer small and fast. It should not become the main archive.  
这一层应保持小而快，不应发展成主存档层。

### 3.2 Layer B: `IndexedDB` for main save data / 第二层：`IndexedDB` 作为主存档层

This should become the long-term structured storage layer for the project.  
这一层应成为项目长期结构化存档的主存储层。

Recommended examples / 推荐保存内容：

- role profile archives / 角色档案
- relationship states / 关系状态
- conversation records / 会话记录
- message history / 消息历史
- event logs / 事件日志
- wallet and transfer state / 钱包与转账状态
- map and itinerary state / 地图与行程状态
- notification history / 通知历史
- summary memories / 摘要记忆

Why / 原因：

- better suited for structured app data / 更适合结构化应用数据
- better capacity and organization / 容量与组织能力更强
- less fragile than endlessly expanding `localStorage` / 比无限扩张 `localStorage` 更稳

### 3.3 Layer C: Optional Server Storage / 第三层：可选服务端存储

This is only needed when product goals go beyond single-device local play.  
只有当产品目标超出单设备本地使用时，才需要服务端存储。

Typical use cases / 常见用途：

- cross-device sync / 跨设备同步
- remote backup / 远程备份
- push notification delivery / 推送通知
- persistent scheduled jobs / 持续调度任务
- account-based progression / 基于账号的成长数据

## 4. Suggested Data Placement / 建议的数据归位

### 4.1 Put in `localStorage` / 建议放入 `localStorage`

- `settings`
- language, notification, and automation switches / 语言、通知与自动化开关
- last open time / 上次打开时间
- next scheduler checkpoints / 下次调度检查点
- small cache version flags / 小型缓存版本标记

### 4.2 Put in `IndexedDB` / 建议放入 `IndexedDB`

- all role profile archives / 全部角色档案
- relationship values and stage history / 关系数值与阶段历史
- long chat histories / 长期聊天记录
- event and consequence records / 事件与后果记录
- map records and itinerary history / 地图记录与行程历史
- wallet records, gifts, receipts, and balances / 钱包记录、礼物、收据与余额
- memory summaries and snapshots / 记忆摘要与快照

### 4.3 Avoid storing raw long-term duplicates / 避免长期保存的原始重复内容

- repeated full prompt payloads / 重复的完整 Prompt 内容
- multiple derived copies of the same state / 同一状态的多份派生副本
- large base64 assets / 大型 base64 资源
- long text that can later be summarized / 未来可摘要化的长文本

## 5. Anti-Bloat Strategies / 防膨胀策略

To prevent local storage from growing uncontrollably, the project should adopt these rules:  
为了防止本地数据无限膨胀，项目应采用以下规则：

1. Keep recent raw history, summarize older history / 近期保留原文，较早内容做摘要
2. Store structured state instead of repeated prose / 优先保存结构化状态，而不是重复大段文本
3. Cap notification and event log size / 对通知与事件日志设置上限
4. Archive or compress low-priority historical data / 对低优先级旧数据归档或压缩
5. Avoid storing regenerated content twice / 避免重复保存可重新生成的内容

## 6. Safety and Reliability / 安全与可靠性

Storage design should support recovery, migration, and user trust.  
存储设计应支持恢复、迁移和用户信任。

Recommended practices / 建议做法：

- version backup formats / 对备份格式做版本管理
- keep import rollback ability / 保留导入失败回滚能力
- support legacy-to-new migration / 支持旧结构到新结构迁移
- make export readable and inspectable / 让导出内容可读可检查

## 7. Migration Recommendation / 迁移建议

Current project stage / 当前阶段建议：

1. Keep settings and lightweight indexes in `localStorage` / 继续把设置和轻量索引保留在 `localStorage`
2. Plan a gradual move of long-term records into `IndexedDB` / 逐步把长期记录迁移到 `IndexedDB`
3. Keep server storage optional until cross-device sync or strong push delivery becomes necessary / 在真正需要跨设备同步或强推送前，服务端存储保持可选

## 8. Practical Rule / 实际原则

The project should save truth, not clutter.  
项目要保存的是真值，而不是杂乱堆积物。

Storage is not only about capacity. It is also about long-term maintainability.  
存储问题不只是容量问题，更是长期维护问题。

