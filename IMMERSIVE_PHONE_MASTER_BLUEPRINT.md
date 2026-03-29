# SchatPhone Immersive Phone Master Blueprint / SchatPhone 沉浸式虚拟手机总蓝图

Updated / 更新时间: 2026-03-29

## 1. Purpose / 用途

This document is the master entry point for the next-stage design of SchatPhone.  
本文是 SchatPhone 下一阶段设计的总入口文档。

It consolidates the product definition, expansion direction, background-time strategy, state ownership rules, storage guidance, and implementation priorities into one readable overview.  
它把项目定义、扩展方向、后台时间策略、状态归属规则、存储方案和实现优先级整合为一份可直接阅读的总览。

Recommended usage / 推荐用法：

1. Read this file first / 先读本文件
2. Jump to referenced detail docs as needed / 再按需跳转到细项文档
3. Use this as the high-level brief for future AI assistants / 也可将其作为后续 AI 接手项目时的总提示

## 2. Product Definition / 项目定义

SchatPhone should be treated as a real-time immersive virtual phone game, not just a chat shell.  
SchatPhone 应被定义为一个“现实时间驱动的沉浸式虚拟手机游戏”，而不只是聊天外壳。

Core definition / 核心定义：

- the user participates through a customizable in-world identity / 用户通过可自定义的虚拟身份参与生态
- AI roles live across multiple phone modules / AI 角色应存在于多个手机模块之中
- the world rhythm is anchored to real device time / 世界节奏锚定真实设备时间
- continuity, relationship growth, and cross-module coherence are more important than page count / 连续性、关系养成和跨模块联动比页面数量更重要

In short / 简述：  
This is a virtual-phone-based relationship simulation and interactive narrative system.  
这是一个套用虚拟手机外壳的关系养成与互动叙事系统。

## 3. Core Design Principles / 核心设计原则

### 3.1 Real Time Over Fake Session Time / 真实时间优先于假想会话时间

The project should feel tied to the user's actual clock, notifications, waiting, and missed moments.  
项目应与用户真实的时间、通知、等待和错过时机形成关联。

### 3.2 System Truth Over Model Memory / 系统真值优先于模型记忆

Anything that affects continuity must be saved by the project itself.  
凡是影响连续性的内容，都必须由项目自己保存。

### 3.3 Cross-Module Life Over Single-View Novelty / 跨模块生活感优先于单页新奇

The same role should appear consistently across chat, map, wallet, calendar, files, and future modules.  
同一个角色应一致地出现在聊天、地图、钱包、日历、文件及后续模块中。

### 3.4 User Control Over Hidden Automation / 用户控制优先于黑箱自动化

Autonomous AI actions should always be governed by explicit user switches and intervals.  
AI 自主行为必须始终受用户明确的开关和间隔控制。

## 4. What the Project Already Has / 当前项目已具备的基础

The current project already provides a strong shell baseline.  
当前项目已经具备较完整的手机壳基础能力。

Main completed foundations / 已完成的核心基础：

- iOS-like phone-shell UI / 仿 iOS 手机壳界面
- lock-screen route and notification loop / 锁屏入口与通知闭环
- chat as the main interactive hub / 以聊天为主互动中枢
- global role profile archive + per-chat binding split / 全局角色档案与会话绑定拆分
- per-thread AI controls / 会话级 AI 控制
- backup and restore safety baseline / 备份恢复安全基线
- widget import safety baseline / Widget 导入安全基线
- global system-language UI baseline / 全局系统语言 UI 基线

Interpretation / 判断：  
The shell is usable. The next stage should focus on making the inner world feel alive, persistent, and coherent.  
外壳已经可用，下一阶段应聚焦于让“壳内世界”显得活着、持续、连贯。

## 5. Must-Have Systems for the Vision / 为了实现目标必须补齐的系统

### 5.1 Real-Time World Layer / 现实时间世界层

- real-time scheduler / 现实时间调度器
- restore-time settlement / 恢复时补算
- quiet-hour logic / 安静时段逻辑
- time-aware notifications / 时间感知通知

Why / 作用：  
Without this layer, the world disappears whenever the user is not actively touching it.  
没有这层，用户一停下操作，整个世界就像停止存在。

### 5.2 Relationship and Growth Layer / 关系与养成层

- relationship values / 关系数值
- relationship stages / 关系阶段
- memory summaries / 记忆摘要
- long-term impressions / 长期印象

Why / 作用：  
This is the backbone of romance growth and long-term emotional continuity.  
这是恋爱养成和长期情感连续性的骨架。

### 5.3 Role Behavior Layer / 角色行为层

- availability / 在线与可用状态
- schedule-based behavior / 作息驱动行为
- emotional state / 情绪状态
- proactive outreach rules / 主动联系规则
- silence reaction logic / 沉默后的反应逻辑

Why / 作用：  
This makes roles feel like people instead of on-demand responders.  
这一层让角色更像活人，而不是只会按需回复的脚本。

### 5.4 Event and Consequence Layer / 事件与后果层

- triggered events / 条件触发事件
- delayed events / 延迟事件
- missed-event consequences / 错过事件后的后果
- cross-module event chains / 跨模块事件链

### 5.5 Cross-Module Role Binding Layer / 跨模块角色绑定层

The same role should be reusable everywhere.  
同一个角色应能在各模块中被复用。

### 5.6 Structured Interaction Media Layer / 结构化互动媒介层

The project should continue supporting more than plain text.  
项目应继续支持不止纯文本的互动形式。

- text / 文本
- virtual voice / 虚拟语音
- images / 图片型消息
- module links / 模块链接
- transfer cards / 转账卡片
- mini HTML scenes / HTML 小互动

## 6. Ownership Rules / 数据归属规则

The project must distinguish between user-defined data, system-owned truth, AI-assisted drafts, and AI-generated presentation.  
项目必须明确区分用户定义数据、系统真值、AI 辅助草稿和 AI 生成表现层。

### 6.1 Must Be User-Defined / 必须由用户定义

- user identity / 用户身份
- world assumptions / 世界设定
- boundaries and preferences / 边界与偏好
- primary role foundations / 核心角色底稿
- high-level automation permissions / 自动化权限

### 6.2 Can Be AI-Assisted / 可由 AI 辅助建立

- extended role copy / 扩展人设文案
- memory summaries / 记忆摘要
- event templates / 事件模板
- service account templates / 服务号模板
- scene text drafts / 场景草稿

### 6.3 Must Be System-Owned Truth / 必须由系统保存为真值

- relationship values / 关系数值
- event states / 事件状态
- task progress / 任务进度
- balances and transfers / 余额与转账状态
- itinerary and location states / 行程与地点状态
- notification state / 通知状态
- message read/delivered status / 消息已读与送达状态
- scheduler timestamps / 调度时间戳

### 6.4 Can Be AI-Generated Presentation / 可由 AI 直接生成的表现层

- reply text / 回复正文
- multi-message sequences / 连续消息
- voice-style wording / 语音条文案
- image descriptions / 图片说明
- transfer wording / 转账文案
- HTML interaction copy / HTML 互动文案

## 7. Storage Strategy Summary / 存储策略摘要

The project should not keep scaling on `localStorage` alone.  
项目不能继续单靠 `localStorage` 扩张。

Recommended layered storage / 推荐分层：

### 7.1 `localStorage`

For small hot config only / 只保存轻量高频配置：

- settings / 设置
- switches / 开关
- active IDs / 当前活跃对象 ID
- scheduler checkpoints / 调度检查点

### 7.2 `IndexedDB`

For long-term structured archive / 保存长期结构化存档：

- role profiles / 角色档案
- relationship states / 关系状态
- conversations and message history / 会话与消息历史
- event logs / 事件日志
- wallet and itinerary records / 钱包与行程记录
- memory summaries / 记忆摘要

### 7.3 Optional Server Layer / 可选服务端层

Only when the product later needs:  
只有在后续需要以下能力时再引入：

- cross-device sync / 跨设备同步
- remote backup / 远程备份
- push delivery / 推送送达
- persistent scheduled jobs / 持续调度任务

## 8. Autonomous AI Control Rules / AI 自主行为控制规则

Autonomous AI activity should be explicit, configurable, and interruptible.  
AI 自主行为必须是明确的、可配置的、可打断的。

Recommended controls / 推荐控制项：

- global master switch / 全局总开关
- per-feature switch / 按功能模块开关
- per-role or per-thread switch / 按角色或按会话开关
- interval in 60-second steps / 以 60 秒为单位的间隔
- quiet hours / 安静时段
- notify-only mode / 仅通知模式
- offline settlement toggle / 是否补算离线期间事件

Rule / 规则：  
Manual user-triggered actions should always have higher priority than autonomous activity.  
用户手动触发的行为必须始终高于自主调用优先级。

## 9. Recommended Implementation Phases / 推荐实现阶段

### Phase A / 阶段 A

Foundational realism layer / 现实基础层：

- real-time scheduler / 现实时间调度器
- restore-time settlement / 恢复补算
- stronger autonomous control rules / 更稳的自主调用控制

### Phase B / 阶段 B

State and relationship layer / 状态与关系层：

- relationship values / 关系数值
- system-owned memory pipeline / 系统记忆流水线
- role behavior logic / 角色行为逻辑

### Phase C / 阶段 C

Narrative interaction layer / 叙事互动层：

- event and consequence system / 事件与后果系统
- structured message hardening / 结构化消息加固
- richer media interaction / 更丰富的互动媒介

### Phase D / 阶段 D

Ecosystem expansion layer / 生态扩展层：

- map and itinerary loops / 地图与行程闭环
- wallet and gift loops / 钱包与礼物闭环
- gallery/files evidence chain / 相册与文件证据链
- future public-social modules / 未来公共社交模块

## 10. Recommended Reading Map / 推荐阅读路径

Use the following docs for detail after reading this master blueprint:  
读完本总蓝图后，可按以下顺序进入细项文档：

1. `BACKGROUND_ACTIVITY_STRATEGY.md`  
   For real-time rhythm, background behavior, notifications, and restore-time logic.  
   用于查看现实时间、后台活动、通知和恢复补算的策略。
2. `PROJECT_EXPANSION_BLUEPRINT.md`  
   For the full product expansion direction and module roadmap.  
   用于查看完整的模块扩展方向和产品路线。
3. `STATE_OWNERSHIP_STRATEGY.md`  
   For deciding what must be stored by the system versus generated by AI.  
   用于判断哪些内容应由系统保存，哪些可以交给 AI。
4. `STORAGE_STRATEGY.md`  
   For deciding where long-term data should live.  
   用于决定长期数据应保存在哪里。

## 11. Practical Rule for Future Work / 后续工作的实际原则

Whenever a new feature is proposed, evaluate it with four questions:  
后续每当提出一个新功能，都先用这四个问题判断：

1. Does it strengthen real-time immersion? / 它是否增强了现实时间沉浸感？
2. Does it strengthen continuity? / 它是否增强了连续性？
3. Does it reuse the same world state across modules? / 它是否复用了同一套跨模块状态？
4. Can it be maintained without giving AI too much hidden authority? / 它是否可维护，并且没有把过多隐性控制交给 AI？

If the answer is mostly no, it should not be prioritized yet.  
如果答案大多是否定的，就不应优先开发。

