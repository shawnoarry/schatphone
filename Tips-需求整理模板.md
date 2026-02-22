# 需求整理与自检模板（给自己用）

Purpose / 用途: clarify requirements before coding to reduce rework.  
在改代码前把需求讲清楚，减少返工。

---

## A. Goal and Scope / 目标与范围

- One-sentence goal / 本次目标（1 句话）：
- Must-have items / 必做项（必须完成）：
- Non-goals / 非目标（本次不做）：
- Target devices/browsers / 适配范围（设备/浏览器）：

---

## B. Impact Scope / 影响范围

- Files to modify / 会改哪些文件：
- Files explicitly not touched / 明确不改哪些文件：
- New dependency required? / 是否新增依赖：Yes/No（是/否）
- New route required? / 是否涉及路由新增：Yes/No（是/否）

---

## C. Interaction and Visual / 交互与视觉

- Core interactions (click/swipe/long-press/drag/page-swipe)  
核心交互（点击/滑动/长按/拖拽/切屏）：
- Visual direction (Y2K / Pure White / Other)  
视觉方向（Y2K / 纯白 / 其他）：
- Custom CSS capability involved? / 是否涉及自定义 CSS：Yes/No（是/否）

---

## D. Data and API / 数据与接口

- AI call involved? / 是否涉及 AI 调用：Yes/No（是/否）
- If yes, use `src/lib/ai.js` only (no direct fetch in components)  
如涉及 AI：统一走 `src/lib/ai.js`（组件内不直写 fetch）
- Persistence schema change? / 是否涉及持久化字段变更：Yes/No（是/否）
- Legacy migration needed? / 是否涉及历史数据迁移：Yes/No（是/否）

---

## E. Home/Settings Rule Check / Home 与 Settings 规则检查（必读）

- Duplicate entry between Home and Settings?  
Home 与 Settings 是否重复放入口：Yes/No（是/否）
- Touching locked Home rule (`app_*` not hideable)?  
是否触碰 Home 锁定入口规则（`app_*` 不可隐藏）：Yes/No（是/否）
- New widget involved (built-in or custom)?  
是否新增 Widget（内置或自定义）：Yes/No（是/否）
- Explicit save action on all key input pages?  
所有输入页是否有显式“保存按钮”：Yes/No（是/否）
- Visible feedback after save?  
保存后是否有反馈（如“已保存”）：Yes/No（是/否）

---

## F. Acceptance Criteria / 验收标准

- Functional acceptance definition / 功能验收（看到什么算完成）：
- Minimum regression routes to verify:  
回归路径至少检查：
`/home`, `/settings`, `/network`, `/appearance`, `/chat`, `/files`, `/more`
- Mobile gesture validation required?  
是否需要移动端手势验证（长按/拖拽/滑动）：Yes/No（是/否）
- Error and retry validation required (Network/Chat)?  
是否需要错误提示与重试验证（Network/Chat）：Yes/No（是/否）

---

## G. Pre-Commit Checks / 提交前检查

- `npm run lint`
- `npm run build`
- Run `npm run test` for behavior logic changes  
行为逻辑改动时补 `npm run test`

---

## H. Result Notes (fill after implementation) / 结果记录（改完再填）

- Actual changes / 本次实际改动：
- Remaining TODO / 还剩待办：
- Risks and cautions / 风险与注意事项：
