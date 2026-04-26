# Product Manager Requirement Template / 产品经理需求模板

Purpose / 用途: provide a low-threshold, reusable requirement template for product-side communication, especially when the requester does not write code.  
用于产品侧提出需求时的低门槛可复用模板，尤其适合不会写代码的使用者。

Who this is for / 适用对象:
- Product manager / 产品经理
- Non-technical collaborator / 非技术协作者
- Future AI coding assistants / 后续接手的 AI 编程助手

Best practice / 最佳实践:
- If you can only provide one thing, provide screenshots first.  
  如果你只能提供一种信息，优先给截图。
- If you cannot describe style clearly, use “like / unlike” examples.  
  如果你说不清风格，优先用“像什么 / 不像什么”来表达。
- If you feel lost in the product, describe the path you clicked.  
  如果你在产品里迷路，请直接写出你点了哪些入口。

---

## 1. What You Can Provide / 你可以提供什么

You do **not** need to provide all items. Any subset is useful.  
你**不需要**一次提供全部信息，任意一部分都能帮助推进。

Supported input types / 支持的输入方式:
1. Screenshots / 截图
   - Current project screenshots / 当前项目截图
   - Reference app screenshots / 参考 App 截图
   - Annotated screenshots with circles/arrows/text / 带圈点、箭头、文字标注的截图
2. Direct image upload / 直接上传图片
   - PNG / JPG / WEBP / GIF are all useful for visual discussion  
     PNG / JPG / WEBP / GIF 都适合用于视觉讨论
3. Figma or design links / Figma 或设计链接
4. Website or app references / 网址或 App 参考
5. Screen recording / 录屏
6. Rough text description / 文字描述
7. Hand-drawn sketch / 手绘草图

If your text is unclear / 如果文字说不清楚:
- Send a screenshot and write “I like this part / I dislike this part.”  
  发截图并写“我喜欢这里 / 我不喜欢这里”。
- Send a screenshot and mark “too messy / too plain / unclear button / cannot find entry.”  
  发截图并标记“太乱 / 太素 / 按钮不明确 / 找不到入口”。
- Say “like KakaoTalk”, “not like a backend dashboard”, etc.  
  直接说“像 KakaoTalk”“不要像后台管理系统”这类判断。

---

## 2. Quick Version / 快速版

If you want to start fast, fill only this section first.  
如果你想快速开工，只填这一段也可以。

```md
# Quick PM Requirement / 快速产品需求

- Module / 模块:
  例如：Chat / Settings / Gallery / Home / Map

- What feels wrong now / 当前最不满意的地方:
  例如：按钮层级不清楚、找不到入口、太像后台、视觉太普通

- What result you want / 你想要的结果:
  例如：更像真实手机设置、更像聊天软件、看起来更细腻

- References / 参考:
  可填：截图 / Figma / 网址 / App 名称 / 无

- Must keep / 必须保留:
  例如：某个按钮、某个功能位置、某个交互

- Must avoid / 绝对不要:
  例如：太白、太像表格、太像办公软件

- Priority / 优先级:
  High / Medium / Low
```

---

## 3. Full Version / 完整版

Copy the block below and fill it when possible.  
有条件时，复制下面完整模板填写。

```md
# Product Requirement Brief / 产品需求单

## 1) Basic Info / 基础信息
- Task name / 任务名称:
- Date / 日期:
- Priority / 优先级: P0 / P1 / P2
- Module / 模块:
- Expected delivery order / 希望处理顺序:

## 2) Background / 需求背景
- Why this matters / 为什么要做:
- Current problem / 当前问题:
- What user pain it solves / 解决什么用户痛点:

## 3) Current Path / 当前使用路径
- Where the user enters from / 用户从哪里进入:
- What the user clicks next / 接着点哪里:
- Where the user gets confused / 用户在哪一步开始迷路:
- If entry is missing or unclear / 如果入口缺失或不明确:
  - I expected to find it in / 我本来以为会在:
  - But actually found it in / 但实际上它在:

## 4) Desired Result / 目标效果
- What should change / 希望改变什么:
- What should remain / 希望保持什么:
- What should become easier / 希望变得更顺手的地方:
- What emotion or feeling should it give / 希望呈现的气质或情绪:

## 5) Visual Direction / 视觉方向
- Like / 像什么:
- Unlike / 不像什么:
- Keywords / 关键词:
  例如：真实、细腻、克制、恋爱感、清晰、轻盈、系统感
- Color preference / 颜色偏好:
- Typography preference / 字体气质偏好:
- Motion preference / 动效偏好:

## 6) Materials / 参考素材
- Current project screenshots / 当前项目截图:
- Reference screenshots / 参考截图:
- Figma / 设计链接:
- Website / 网址:
- Recording / 录屏:
- Notes on each reference / 每份参考的说明:

## 7) Interaction Requirements / 交互要求
- Required interactions / 必做交互:
  例如：点击、滑动、长按、返回、保存反馈
- Entry and exit behavior / 进入与返回逻辑:
- Button hierarchy / 按钮层级要求:
  例如：主按钮、次按钮、说明项要明显区分
- Empty/loading/error states / 空状态、加载态、错误态:

## 8) Structure and Navigation / 结构与入口
- Is this a top-level page or sub-page? / 这是一级页还是二级页:
- Should it be reachable from Settings? / 是否应从 Settings 进入:
- Should it also exist inside the related module? / 是否也应在相关模块内有入口:
- Any duplicated entry to merge? / 是否有重复入口需要合并:
- Any missing “back” or “home” path? / 是否缺返回或回主页路径:

## 9) Must Keep / 必须保留
- Feature logic that cannot change / 不能改的功能逻辑:
- Existing UI positions that must stay / 必须保留的位置:
- Existing copy that must stay / 必须保留的文案:

## 10) Must Avoid / 绝对不要
- Visual directions to avoid / 不要的视觉方向:
- Interaction patterns to avoid / 不要的交互方式:
- Structural risks to avoid / 不要发生的结构性问题:

## 11) Scope / 本次范围
- In scope / 本次包含:
- Out of scope / 本次不包含:
- “Can do later” items / 可以后做的项:

## 12) Acceptance / 验收标准
- What counts as “done” / 怎么算完成:
- What should be easier after change / 改完后哪里应更清楚:
- Screenshots or states to verify / 需要验收的截图或状态:

## 13) Extra Notes / 补充说明
- Anything hard to explain in words / 文字难说明的点:
- Any uncertainty / 还没想清楚的点:
- Any open questions for AI engineer / 希望 AI 程序员帮你判断的点:
```

---

## 4. Special Section for Visual Requests / 视觉美化需求专用补充

Use this when the request is mostly about UI polish, atmosphere, or page beauty.  
当需求主要是页面美化、氛围、观感提升时，优先补这一段。

```md
## Visual Add-on / 视觉补充
- Most important page to improve first / 最想优先改善的页面:
- Current page screenshot / 当前页面截图:
- Reference image / 参考图:
- What feels ugly or weak now / 现在最不好看的地方:
- What feeling should it have / 希望变成什么感觉:
- Must keep functional layout? / 是否必须保留现有功能布局:
- Can structure be adjusted? / 是否允许调整结构:
```

---

## 5. Special Section for “I Cannot Find the Entry” Problems / “找不到入口”问题专用补充

Use this when the product feels confusing rather than simply ugly.  
当问题主要是“迷路、层级不清、入口难找”时，用这一段最有效。

```md
## Entry Problem Add-on / 入口问题补充
- I wanted to do / 我原本想做:
- I expected the entry in / 我以为入口会在:
- What I actually clicked / 我实际点击了:
  1.
  2.
  3.
- Where I got confused / 我在哪一步开始困惑:
- Which button or label felt unclear / 哪个按钮或标签不明确:
- What would feel more natural / 你觉得怎样会更自然:
```

---

## 6. Filled Example / 示例

```md
# Quick PM Requirement / 快速产品需求

- Module / 模块:
  Settings + Appearance

- What feels wrong now / 当前最不满意的地方:
  主 setting 里有快捷入口，但进入相关板块后层级和入口不清楚，像是被拆散了。

- What result you want / 你想要的结果:
  更像真实手机设置，入口关系清楚，进入子页面后还能顺手找到相关功能。

- References / 参考:
  iPhone 设置页截图 + KakaoTalk 某个列表页截图

- Must keep / 必须保留:
  当前已有功能逻辑和双语能力

- Must avoid / 绝对不要:
  不要像后台管理系统，不要满屏一样的白卡片

- Priority / 优先级:
  High
```

---

## 7. How AI Should Read This / AI 程序员读取说明

When an AI engineer receives this brief, they should extract:  
AI 程序员接到此模板后，应优先提取以下信息：

1. The actual user pain / 真正的用户痛点
2. Whether the issue is visual, structural, or functional / 问题属于视觉、结构还是功能
3. What is fixed and must not move / 哪些点是固定不可动的
4. What can be redesigned / 哪些点可以重构
5. What should be solved first / 哪些问题应优先解决

---

## 8. Recommended Storage / 建议存放方式

- Use this as a reusable template file / 本文件作为长期复用模板
- Duplicate it into task-specific briefs when needed / 需要时复制为单次需求单
- If the request becomes execution-ready, link it inside task docs / 如果需求已经可执行，可在任务文档中引用它

