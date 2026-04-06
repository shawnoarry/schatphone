# SchatPhone Project Expansion Blueprint / SchatPhone 项目扩展蓝图

Updated / 更新时间: 2026-03-29

## 1. Purpose / 用途

This document summarizes the major product-level recommendations for expanding SchatPhone into an immersive virtual phone game.  
本文用于总结将 SchatPhone 扩展为沉浸式虚拟手机游戏所需的主要产品级建议。

## 2. Project Definition / 项目定义

SchatPhone should not be treated as only a chat interface.  
SchatPhone 不应只被视为一个聊天界面。

It should be defined as a virtual phone ecosystem where the player enters through a customizable identity, interacts with AI-driven roles, and experiences relationship growth, life simulation, and cross-module narrative loops inside a phone-like shell.  
它更准确的定义应是：用户以可自定义身份进入一个虚拟手机生态，在手机外壳之中与 AI 驱动的角色互动，经历关系养成、生活模拟与跨模块叙事循环。

Core framing / 核心定位：

- the shell is the delivery surface / 手机外壳是承载界面
- AI is both a content engine and a behavior engine / AI 既是内容引擎，也是行为引擎
- continuity matters more than isolated novelty / 连续性比零散的新奇功能更重要

## 3. Current Strengths / 当前基础优势

The project already has a usable shell baseline.  
项目已经具备可用的手机壳基线。

Current strengths / 当前优势包括：

- iOS-like phone-shell presentation / 仿 iOS 的手机壳呈现
- lock-screen entry and notification loop / 锁屏入口与通知闭环
- chat-centered AI interaction baseline / 以聊天为中心的 AI 互动基线
- split between global role profiles and per-chat bindings / 全局角色档案与会话绑定分离
- per-thread AI settings / 会话级 AI 设置
- backup and restore safety baseline / 备份恢复安全基线

Interpretation / 判断：  
The next stage should focus less on adding isolated pages and more on building the living world inside the shell.  
下一阶段应少做彼此割裂的页面堆叠，更多转向“让手机壳内的世界真正活起来”。

## 4. Must-Have System Groups / 必须补齐的系统组

### 4.1 Real-Time World Layer / 现实时间世界层

- real-time scheduler / 现实时间调度器
- inactivity settlement / 不活跃后的恢复补算
- quiet-hour logic / 安静时段逻辑
- time-aware notifications / 时间感知通知

Why / 作用：  
Without this layer, the world stops existing whenever the user stops touching the interface.  
没有这层，用户一旦停止操作，整个世界就像停止存在。

### 4.2 Relationship and Growth Layer / 关系与养成层

- relationship values / 关系数值
- trust, affection, distance, tension, dependency / 信任、好感、距离、紧张、依赖
- relationship stages / 关系阶段
- long-term impressions and memory summaries / 长期印象与记忆摘要

Why / 作用：  
This is the core of romance and relationship progression.  
这是恋爱养成与关系成长的核心。

### 4.3 Role Behavior Layer / 角色行为层

- availability state / 在线与可用状态
- schedule-based behavior / 作息驱动的行为
- emotional state / 情绪状态
- proactive outreach rules / 主动联系规则
- silence reaction rules / 沉默后的反应规则

Why / 作用：  
This makes roles feel alive instead of waiting for user clicks.  
这一层让角色更像活人，而不是只会等用户点击的机器人。

### 4.4 Event and Consequence Layer / 事件与后果层

- triggered events / 条件触发事件
- delayed events / 延迟事件
- missed-event consequences / 错过事件后的后果
- cross-module event chains / 跨模块事件链

Examples / 示例：

- missed meeting -> conflict / 错过见面 -> 产生矛盾
- completed transfer -> gratitude + memory update / 转账完成 -> 感谢 + 记忆更新
- map arrival -> chat follow-up / 地图到达 -> 聊天后续

### 4.5 Cross-Module Role Binding / 跨模块角色绑定层

The same role should be able to appear consistently across multiple modules.  
同一个角色应能一致地出现在多个模块中。

Recommended modules / 推荐支持的模块：

- chat / 聊天
- map / 地图
- wallet / 钱包
- calendar / 日历
- gallery / 相册
- files / 文件
- future forum or feed modules / 未来论坛或动态模块

Why / 作用：  
This is what turns the product into one ecosystem instead of several unrelated demos.  
这会让产品成为一个完整生态，而不是几个互不相干的 Demo。

### 4.6 Structured Interaction Media / 结构化互动媒介层

These should remain part of the main design, not be treated as decorative extras.  
这些内容应保留为主设计的一部分，而不是被视为可有可无的装饰。

- text replies / 文本回复
- virtual voice clips / 虚拟语音条
- image-style messages / 图片型消息
- module links / 模块跳转链接
- transfer cards / 转账卡片
- mini HTML scenes / HTML 小剧场与互动卡片

## 5. User Action Layer / 用户行动层

The user should not be limited to typing plain messages.  
用户的操作不应只局限于发送普通文字消息。

Suggested actions / 建议支持的行动：

- send messages / 发送消息
- reply to invitations / 回应邀约
- accept or reject tasks / 接受或拒绝任务
- send gifts / 送礼
- transfer money / 转账
- share location / 分享位置
- confirm or cancel appointments / 确认或取消约见

This improves game feel and makes the user a real participant in the ecosystem.  
这会增强游戏感，让用户真正成为生态参与者，而不是旁观者。

## 6. Suggested Module Priorities / 建议的模块优先级

### 6.1 Must Do Soon / 近期必须做

- real-time world layer / 现实时间世界层
- relationship and growth layer / 关系与养成层
- role behavior layer / 角色行为层
- stronger structured message rules / 更稳的结构化消息规则

### 6.2 Should Do Next / 随后应做

- event and consequence layer / 事件与后果层
- cross-module role binding foundation / 跨模块角色绑定底座
- map + itinerary loops / 地图与行程闭环
- wallet + transfer + gift loops / 钱包、转账、礼物闭环

### 6.3 Can Do Later / 可后续拓展

- forum or feed simulation / 论坛或动态模拟
- public social-space modules / 公共社交空间模块
- richer gallery and file evidence chains / 更丰富的相册与文件证据链
- stronger creator-side configuration tools / 更强的创作者侧配置工具

## 7. Practical Roadmap Guidance / 实际路线建议

The next stage should prioritize foundations over decorative expansion.  
下一阶段应优先补基础系统，而不是先做装饰性扩展。

Recommended order / 推荐顺序：

1. real-time timing baseline / 现实时间基线
2. state and relationship truth layer / 状态与关系真值层
3. role behavior rules / 角色行为规则
4. structured message hardening / 结构化消息加固
5. cross-module role reuse / 跨模块角色复用
6. module content expansion / 模块内容扩展

## 8. Product Quality Rule / 产品质量原则

For this project, immersion does not come mainly from page count.  
对这个项目而言，沉浸感并不主要来自页面数量。

It comes from consistency, time continuity, believable reactions, and cross-module coherence.  
真正的沉浸感来自一致性、时间连续性、可信反应和跨模块联动。

