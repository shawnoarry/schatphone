# Chat Feature Decisions / Chat 功能决议记录

Updated / 更新时间: 2026-02-23

Purpose / 用途: persist user feedback on Chat feature proposals, so future sessions can continue without context loss.  
用于沉淀用户对 Chat 功能建议的反馈，便于下次对话直接续接，不丢上下文。

Reference / 关联来源: discussion after KakaoTalk-style Chat enhancement proposals (items 1-18).  
对应“模拟 KakaoTalk 风格聊天增强建议（1-18）”后的用户逐条修正反馈。

---

## 1) Confirmed Directions / 已确认方向

### #1 Input/Delivery/Read State (AI-side immersive display) / 输入中与送达已读状态（偏 AI 侧沉浸展示）

- Show "对方正在输入..." only while waiting for AI reply.  
仅在等待 AI 回复时展示“对方正在输入...”。
- Before pressing generate-reply in Chat thread, user message shows "Delivered".  
在用户未按“生成回复”前，用户消息显示“已送达”。
- When AI call starts, that user message becomes "Read".  
开始调用 AI 回复时，用户消息状态切到“已读”。
- Implementation status / 实现状态: baseline landed in Chat thread (`delivered -> read` + typing text).  
已实现基础版本（`已送达 -> 已读` 状态切换 + 输入中文本提示）。

### #2 Suggested Replies as Optional Toggle / 可选回复做成可开关

- Suggested replies must be controlled by a setting in layered menus.  
可选回复必须放在分级菜单中可开启/关闭。
- Rationale: avoid forced automation for users who dislike AI assistance.  
原因：避免对不喜欢自动辅助的用户造成干扰。
- Implementation status / 实现状态: landed in Chat layered menu as per-thread toggle.  
已在 Chat 分级菜单中落地为会话级开关。

### #3 Quote Reply Logic (Revised) / 引用回复逻辑（已修正理解）

- Quote is a **focus anchor**, not a standalone-context generation mode.  
“引用”应是**焦点锚点**，不是“脱离上下文的单句生成”。
- AI reply must always include persona + worldbook + multi-turn history.  
AI 每次回复都必须带上人设、世界书和多轮历史。
- Reading window size (how many previous turns) must be configurable in layered settings.  
“读取几轮上文”需要在分级菜单中可配置。
- Implementation status / 实现状态: context window turns are now configurable per conversation.  
已支持会话级上下文轮数配置。

### #4 One-click Rewrite / 一键改写

- Explicitly rejected for now.  
当前明确不做。
- Reason: over-polishing user messages can reduce immersion.  
原因：过度润色会破坏沉浸感。

### #8 Bilingual Translation / 双语翻译

- Needed and approved in direction.  
方向认可，确定要做。
- Target: AI message arrives with bilingual content in one call path if possible, avoiding extra translation calls.  
目标：尽量在一次调用中直接产出双语版本，避免为翻译再追加一次调用。
- Implementation status / 实现状态: baseline landed via structured `text` blocks (primary/secondary) in one call path.  
已实现基础版本：单次调用返回结构化 `text` 块（主/副语言）。

### #9 Voice-related Direction / 语音相关方向

- Keep integration points in global Settings.  
在整体 Settings 保留语音接口配置。
- Add enable/disable options in persona module and per-chat-role scope.  
在人设模块中有开关，并在 Chat 页支持按角色开关。
- Preserve "virtual voice" presentation (voice-bubble UI with text description).  
必须保留“虚拟语音”形态（语音条外观 + 文本描述）。
- Implementation status / 实现状态: virtual voice block rendering + per-thread enable flag are landed.  
已落地虚拟语音消息块渲染与会话级开关。

---

## 2) Deferred by User / 用户明确暂缓

- #5 Group chat features / 群聊功能：认可方向，暂时搁置，后续再细化。
- #6 Group unread summary / 群聊未读摘要：同上，暂时搁置。
- #7 Semantic search / 语义搜索：复杂度较高，暂时搁置。
- #11 to #18 proposals / 11 到 18 项：当前阶段先搁置，避免分散注意力。

---

## 3) Pending Clarifications / 待补充细节

- #1 Exact state transitions and UI style for Delivered/Read/Typing.  
#1 已送达/已读/输入中 的精确切换时机与 UI 细节。
- #3 Context-window strategy: default turns, max turns, token cap, and truncation priority.  
#3 上下文窗口策略：默认轮数、上限轮数、token 上限、截断优先级。
- #8 Dual-language rendering strategy in thread UI (primary/secondary language order, collapse behavior).  
#8 对话页双语展示策略（主次语言顺序、折叠方式）。
- #9 Voice provider path and fallback behavior when TTS is unavailable.  
#9 语音服务供应路径及 TTS 不可用时的回退策略。

---

## 4) Not Yet Explicitly Replied / 尚未明确回复项

- #10 Image-message intelligence (OCR/Vision Q&A/description) has not received an explicit go/no-go.  
#10 图片消息智能化（OCR/视觉问答/描述）尚未获得明确“做/不做”结论。

---

## 5) Recommended Follow-up Questions / 下次对话建议追问

1. For #3, should context window be configured by turns, tokens, or both?  
针对 #3，上下文窗口按“轮数”还是“token”配置，或两者同时？
2. For #8, should bilingual output be always-on or role-based optional?  
针对 #8，双语输出是全局常开，还是按角色可选？
3. For #9, should virtual voice be shown by default even when TTS is disabled?  
针对 #9，TTS 关闭时是否默认仍展示虚拟语音条？
4. For #10, keep deferred or include in a later P2 backlog?  
针对 #10，是继续搁置，还是纳入后续 P2 待办？

