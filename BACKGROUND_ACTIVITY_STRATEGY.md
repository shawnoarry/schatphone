# SchatPhone Background Activity Strategy / SchatPhone 后台活动策略

Updated / 更新时间: 2026-03-29

## 1. Purpose / 用途

This document summarizes how SchatPhone should handle background behavior, real-time rhythm, notifications, and autonomous AI activity.  
本文用于总结 SchatPhone 应如何处理后台活动、现实时间节奏、通知体系与 AI 自主活动。

Core principle / 核心原则：  
Identity is virtual, but rhythm is real.  
身份可以是虚拟的，但节奏必须是真实的。

The player may act through a fictional in-world identity, but the surrounding phone ecosystem should still feel anchored to the user's actual device time.  
用户可以通过虚拟身份参与生态，但整个手机生态的运行节奏应锚定用户设备的真实系统时间。

## 2. Key Conclusion / 关键结论

Pure HTML pages cannot behave like native apps that stay fully alive in the background.  
纯 HTML 页面无法像原生 App 一样在后台持续稳定运行。

The practical solution is a layered model:  
更现实可行的方案是采用分层模型：

1. Real-time scheduler / 现实时间调度器
2. Restore-time settlement / 恢复时补算
3. Notification layer / 通知层
4. Optional PWA push enhancement / 可选的 PWA 推送增强
5. Future app-shell upgrade if strong background execution is required / 若未来必须强后台，再升级到应用壳

## 3. What Pure Web Can and Cannot Do / 纯 Web 能做与不能做的事

### 3.1 Can do / 能做

- Read the current system time / 读取当前系统时间
- Store next trigger timestamps locally / 本地保存下一次触发时间
- Run timers while the page is open and active / 页面打开且活跃时运行定时器
- Recalculate elapsed time when the user returns / 用户返回时补算离开期间经过的时间
- Show in-app lock-screen style notifications / 展示应用内锁屏风格通知

### 3.2 Cannot reliably do / 不能稳定做到

- Keep precise timers running after the tab is hidden or the page is closed  
  在标签页隐藏或页面关闭后继续精确运行定时器
- Guarantee that a "reply every 60 seconds" rule fires exactly on time in a background tab  
  保证“每 60 秒回复一次”在后台标签页中精准触发
- Behave like a native mobile app with true persistent background logic  
  像原生手机应用一样持续常驻后台运行逻辑

Product implication / 产品含义：  
In pure Web mode, a 60-second reply setting should be treated as a target interval, not a guaranteed hard timer in background state.  
在纯 Web 模式下，“60 秒回复一次”应被视为目标间隔，而不是后台绝对精准执行的硬计时。

## 4. Recommended Architecture / 推荐架构

### 4.1 Layer A: Real-Time Scheduler / 第一层：现实时间调度器

This is the primary baseline for the current project.  
这是当前项目最应该优先落地的基础层。

Responsibilities / 职责：

- Use real system time as the only time source / 只使用真实系统时间作为时间源
- Store `lastActiveAt`, `nextTriggerAt`, per-role intervals, quiet hours, and event deadlines  
  存储 `lastActiveAt`、`nextTriggerAt`、按角色的触发间隔、安静时段和事件截止时间
- Check whether any role or feature should act when the page is active  
  在页面活跃时检查角色或功能是否需要行动

Best-fit use cases / 适用场景：

- AI proactive messages / AI 主动消息
- Shopping or order completion / 订单或购物完成
- Itinerary reminders / 行程提醒
- Delayed event completion / 延迟事件完成
- Silence follow-up in relationships / 长时间未互动后的关系反馈

### 4.2 Layer B: Restore-Time Settlement / 第二层：恢复时补算

This is the core technique for making the world feel alive even if the page was not actually running.  
这是让世界在页面并未真正运行时也显得“持续活着”的核心技术。

When the user returns, the system should compute:  
当用户重新进入项目时，系统应计算：

- how much real time passed / 真实过去了多久
- whether any role should have messaged / 是否有角色本应发来消息
- whether any event should have completed / 是否有事件本应完成
- whether missed deadlines should produce consequences / 是否应因错过时机产生后果
- whether notifications should be reconstructed / 是否应重建通知列表

This creates a strong pseudo-background effect without requiring actual persistent background execution.  
这样即使没有真正后台常驻，也能形成很强的“后台仍在运行”的体感。

### 4.3 Layer C: Notification Layer / 第三层：通知层

This layer turns invisible timing logic into visible immersion.  
这一层负责把看不见的时间逻辑转化为用户可以感知的沉浸体验。

Must-have behaviors / 建议必须具备的行为：

- message timestamps / 消息时间戳
- unread accumulation / 未读堆积
- lock-screen entry hints / 锁屏入口提示
- stacked notification display / 通知堆叠显示
- summary of what happened while the user was away / 用户离开期间发生事项的摘要

### 4.4 Layer D: Optional PWA Push / 第四层：可选 PWA 推送增强

If the product later needs stronger off-page notifications, PWA push can be added.  
如果后续需要更强的离页通知能力，可以增加 PWA 推送。

This requires / 需要具备：

- HTTPS
- notification permission / 通知权限
- service worker / 服务工作线程
- backend push delivery / 后端推送通道

This should be treated as an enhancement layer, not the current baseline assumption.  
这应被视为增强层，而不是当前阶段的默认前提。

### 4.5 Layer E: Future App-Shell Upgrade / 第五层：未来应用壳升级

If the product later requires stronger background persistence, better scheduling guarantees, or more native capabilities, the HTML app should eventually be wrapped in an app shell.  
如果后续产品需要更强的后台保活、更稳定的调度保证或更多原生能力，最终应考虑把 HTML 项目包裹进应用壳。

Suitable options / 可选路线：

- PWA-first enhancement / 先做 PWA 增强
- Capacitor / Capacitor
- Tauri or Electron for desktop packaging / Tauri 或 Electron 桌面封装

## 5. Required User Controls / 必须提供给用户的控制项

These settings should be user-configurable, not hard-coded.  
这些选项应由用户配置，而不是写死在系统中。

- global autonomous AI switch / 全局 AI 自主响应总开关
- per-role autonomous switch / 按角色的自主响应开关
- per-feature autonomous switch / 按功能模块的自主调用开关
- reply interval in 60-second steps / 以 60 秒为单位的回复间隔
- quiet hours / 安静时段
- notify-only mode / 仅通知不自动生成内容
- whether offline time should be settled on return / 是否在回到前台时补算离线期间事件
- limit on how many auto messages may be generated per restore / 每次恢复时最多允许补生成多少条自动消息
- whether background-style activity may consume API quota / 是否允许后台风格活动消耗 API 额度

## 6. Prompt Context Requirements / AI 上下文所需时间信息

Every AI call should include more than the current chat text.  
每次调用 AI 时，不应只提供当前聊天文字。

Recommended time-related context / 推荐传入的时间上下文：

- current real system time / 当前真实系统时间
- elapsed time since the last interaction / 距离上次互动过去了多久
- whether the app has just resumed from inactivity / 是否刚从不活跃状态恢复
- recent background-style events / 最近后台式发生的事件
- current quiet-hour status / 当前是否处于安静时段
- relationship timing signals, such as prolonged silence or recent warmth / 关系中的时间信号，如长期沉默或刚刚升温

Without this, AI replies will lose temporal continuity.  
缺少这些信息，AI 回复会失去时间连续性。

## 7. Recommended Implementation Order / 推荐实现顺序

1. Build the real-time scheduler baseline / 先做现实时间调度器基线
2. Add restore-time settlement / 再做恢复时补算
3. Connect lock-screen and notification presentation / 接入锁屏与通知呈现
4. Add per-role and per-feature user controls / 补齐按角色和按功能的用户控制
5. Consider PWA push as an optional later enhancement / 最后把 PWA 推送作为可选增强

## 8. Practical Product Rule / 实际产品规则

The project should never promise stronger background behavior than the platform can actually guarantee.  
项目不应向用户承诺超过平台真实能力的后台行为。

The correct goal is not "true background keep-alive at all costs."  
正确目标不是“不惜一切代价实现真后台保活”。

The correct goal is:  
正确目标应是：

- real-time rhythm / 真实时间节奏
- believable restore behavior / 可信的恢复补算
- strong notification immersion / 强化通知沉浸感
- controllable autonomous activity / 可控的自主活动

