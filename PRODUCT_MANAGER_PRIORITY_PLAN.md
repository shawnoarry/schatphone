# Product Manager Priority Plan / 产品经理视角优先级任务单

Updated / 更新时间: 2026-04-04

## 1. Goal / 目标

Use product value first, with clear tradeoffs between user experience gain and maintenance cost.  
以产品价值优先，明确每项任务的用户体验收益与维护成本取舍。

## 2. Priority Matrix / 优先级矩阵

| Priority / 优先级 | Task / 任务 | User Experience Gain / 体验收益 | Maintenance Cost / 维护成本 | Why Now / 为什么现在做 |
|---|---|---|---|---|
| A1 | Chat stability & safety closure / 聊天稳定性与安全收口 | Replies are more coherent; fewer broken/odd outputs / 回复更连贯，异常内容更少 | Medium / 中 | Chat is the core entry and must feel stable first / 聊天是核心入口，必须先稳 |
| A2 | Auto-reply policy refinement / 自动回复策略细化（总开关+角色级开关+手动优先） | Better control and less interruption; more immersive rhythm / 更可控、少打扰，沉浸节奏更自然 | Medium / 中 | Directly impacts long-session retention / 直接影响长时使用体验 |
| A3 | Settings IA and plain-language labels / 设置页分组与白话文案优化 | New users can configure faster / 新手更容易上手 | Low / 低 | Quick visible win with low risk / 低风险高回报 |
| A4 | Error center readability improvement / 报错中心可读性优化 | Users can self-diagnose issues / 用户可自助定位问题 | Low / 低 | Reduces support and repeated Q&A cost / 降低沟通与维护成本 |
| B1 | Relationship-growth feedback polish / 关系成长反馈打磨 | Stronger companionship/养成感 / 养成感更强 | Medium / 中 | Best after chat baseline is stable / 需建立在聊天稳定后 |
| B2 | Lock-screen notification polish / 锁屏通知质感增强 | More realistic phone-like immersion / 更像真实手机 | Medium / 中 | Baseline exists; now polish immersion / 基线已具备，进入质感提升 |
| B3 | Cross-module role reuse / 跨模块角色复用（地图/论坛等） | One profile, many scenarios / 一档多用、减少重复建设 | Medium-High / 中高 | Multi-module linkage complexity is higher / 涉及多模块联动，复杂度更高 |
| C1 | Storage layering migration / 存储分层迁移（长期稳定） | Better long-term reliability / 长期稳定性更好 | High / 高 | Foundational engineering task / 底层工程项 |
| C2 | Deep module loops (Phone/Wallet/Calendar etc.) / 电话钱包日历等深度玩法 | Content richness grows significantly / 内容丰富度显著提升 | High / 高 | Should follow stable core loops / 应在主链路稳定后推进 |
| C3 | Large-scale visual revamp / 大规模视觉复刻与重构 | Stronger first impression / 首屏观感提升明显 | Medium-High / 中高 | Best after feature baseline is stable / 建议在功能基线稳定后统一推进 |

## 3. Recommended Execution Order / 推荐执行顺序

1. A1 + A3 + A4  
2. A2  
3. B1 + B2  
4. B3 -> C1 -> C2/C3

## 4. Decision Shortcuts / 快速决策选项

1. Follow recommended order / 按推荐顺序执行  
2. Prioritize visual revamp first / 先做视觉（C3）  
3. Prioritize auto-reply policy first / 先做自动回复策略（A2）

## 5. Current Decision / 当前决策记录

- 2026-04-04: User confirmed to follow the recommended order.  
- 2026-04-04：用户确认按推荐顺序执行。
