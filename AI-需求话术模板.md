# AI 协作话术模板（给 AI 编程助手）

Purpose / 用途: improve request quality and execution stability when prompting AI coding assistants.  
在其他 AI 工具中发需求时，提升可执行性和稳定性。

---

## 1. Task Objective / 任务目标

Please implement the following in the existing SchatPhone project:  
请在现有 SchatPhone 项目中完成：
- [One-sentence objective / 一句话目标]

## 2. Must-Do and Must-Not / 必做与禁做

- Must-Do / 必做：
1. [Must-Do 1 / 必做 1]
2. [Must-Do 2 / 必做 2]

- Must-Not / 禁做：
1. Do not change route structure unless explicitly requested.  
除非明确要求，不要随意改路由结构。
2. Do not remove existing working features.  
不要删除现有可用功能。
3. Do not write AI fetch directly inside components.  
不要在组件里直写 AI fetch。

## 3. Fixed Project Constraints / 固定项目约束

- Stack: Vue 3 + Vite + Vue Router + Pinia + Tailwind v4  
技术栈：Vue 3 + Vite + Vue Router + Pinia + Tailwind v4
- Route all AI calls through `src/lib/ai.js`  
AI 调用统一走 `src/lib/ai.js`
- Avoid duplicate entries between Home and Settings  
Home 与 Settings 避免重复入口
- Home rule: `app_*` entries cannot be deleted/hidden (reorder only)  
Home 规则：`app_*` 不可删除/隐藏，只能换位置
- Key input pages must keep explicit Save action and feedback  
输入页需要显式保存按钮并给保存反馈
- Network/Chat changes must include error grading and retry behavior  
Network/Chat 改动需考虑错误分级与重试交互
- Prefer CSS variables over hard-coded style values  
主题优先走 CSS 变量，避免大量硬编码

## 4. Change Scope / 变更范围

Please only modify / 请仅修改：
- [File 1 / 文件 1]
- [File 2 / 文件 2]

Please do not modify / 请不要修改：
- [File A / 文件 A]
- [File B / 文件 B]

## 5. Interaction Requirements / 交互要求

- Target pages / 目标页面：[`/home`, `/settings`, `/network`, `/appearance`, ...]
- Key interactions / 关键交互：[click/swipe/long-press/drag/save feedback]  
[点击/滑动/长按/拖拽/保存反馈]
- If network calls are involved / 若涉及网络调用：  
[error classification + retry behavior / 错误分级 + 重试按钮行为]
- Visual style / 视觉风格：[Y2K / Pure White / iOS settings style]

## 6. Acceptance Criteria / 验收标准

After implementation, ensure / 完成后请确保：
1. `npm run lint` passes
2. `npm run build` passes
3. `npm run test` passes when behavior logic changes  
涉及行为逻辑时 `npm run test` 通过
4. Required page behavior is reproducible  
指定页面行为可复现

## 7. Delivery Format / 交付格式

Implement code directly and report / 直接改代码并在回复中给出：
1. Modified files / 修改了哪些文件
2. What changed in each file / 每个文件改了什么
3. Remaining risks or next-step suggestions / 剩余风险与下一步建议

---

## Copy-Ready Prompt / 可直接复制版本

Please complete the following in SchatPhone:

1. Objective / 目标：[填写]
2. Must-Do / 必做：[填写]
3. Must-Not / 禁做：do not break route structure, Home locked-entry rules, or existing working modules  
不要破坏现有路由、Home 锁定入口规则和可用模块
4. Technical constraints / 技术约束：Vue3 + Vite + Pinia + Tailwind v4, all AI calls via `src/lib/ai.js`
5. Structural constraints / 结构约束：no duplicate entries between Home and Settings; key input pages must have Save
6. Change scope / 修改范围：[填写文件]
7. Validation / 验收：run `npm run lint`, `npm run build`, and `npm run test` when needed
8. Output / 输出：modified files, key changes, remaining risks
