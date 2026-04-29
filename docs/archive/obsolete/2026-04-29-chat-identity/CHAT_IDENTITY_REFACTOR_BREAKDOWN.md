# Chat 模块「身份」重构任务拆解

> Obsolete archive / 过时归档：This file is retained only for historical lookup. It is superseded by `docs/README.md` and must not be used as a current roadmap, status report, or implementation source.
>
> 当前仅保留历史查询；请以 `docs/README.md` 中列出的当前文档为准。
Status: Closed / Reference only

This breakdown documents a completed refactor track. It should not compete with `docs/roadmap/TODO_ROADMAP.md`. Future Chat identity tasks must be re-entered through the live roadmap before implementation.

状态：已关闭 / 仅作参考

本文记录的是已完成的重构拆解，不应与 `docs/roadmap/TODO_ROADMAP.md` 竞争优先级。后续 Chat 身份任务必须先进入动态路线图再执行。

## 目标

把 `/chat-feature/identity` 调整为**仅管理用户在 Chat 模块中的身份**，不再承载任何 AI 角色身份配置。

该页最终只保留这些核心能力：

1. 模块头像：用户在 Chat 模块中的头像
2. 模块昵称：用户在 Chat 模块中的默认昵称
3. 匿名模式开关
4. 匿名范围选择
5. 定向匿名对象选择

---

## 当前代码状态摘要

当前进度不是从零开始，已经有一部分逻辑落地：

### 已完成

1. `chat store` 已新增 `moduleIdentity`
2. `moduleIdentity` 已支持持久化 / 恢复
3. `ChatView` 已接入模块昵称
4. `ChatView` 的系统 prompt 已接入匿名模式判断
5. 相关 store 测试已通过

### 未完成 / 已损坏

1. `ChatFeaturePlaceholderView.vue` 中匿名模式被错误放进了 `preferences`
2. 匿名模式 UI 在 `preferences` 里重复出现了两次
3. `identity` 页没有完整承载匿名模式
4. 页面内存在乱码文案
5. 页面内存在大量 `t('', '')`
6. 原来的偏好页有内容被直接 `v-if="false"` 隐掉
7. 旧的模块头像覆写逻辑还没有完全和新身份逻辑拆开

---

## 推荐执行方式

不要一次性处理全部问题。建议严格按下面的小任务逐个完成，每次只做一个任务，避免上下文膨胀。

---

## 任务 1：只修正 `identity` 页的页面归属

### 目标

把匿名模式相关 UI 从 `preferences` 页移走，放回 `identity` 页。

### 只做这些事

1. 删除 `preferences` 中误放的匿名模式区块
2. 删除匿名模式重复渲染的第二份区块
3. 把匿名模式区块挂到 `isIdentityFeature` 下

### 不要做

1. 不改 store
2. 不改 prompt
3. 不处理旧模块头像覆写逻辑
4. 不顺手重构别的页面

### 涉及文件

1. `src/views/ChatFeaturePlaceholderView.vue`

### 完成标准

1. `preferences` 页面不再出现匿名模式
2. `identity` 页面出现完整匿名模式
3. 页面中匿名模式只出现一次

---

## 任务 2：收敛 `identity` 页字段，只保留用户侧身份

### 目标

让 `identity` 页只显示用户侧配置，不再显示 AI 角色模块级覆写。

### 只做这些事

1. 保留“模块头像”
2. 保留“模块昵称”
3. 保留“匿名模式”
4. 保留“匿名范围”
5. 保留“定向匿名对象选择”
6. 隐藏或删除“按联系人覆写（模块级）”这类 AI 角色相关区块

### 不要做

1. 不删除 store 中旧 API
2. 不处理历史数据兼容
3. 不改聊天线程页中的会话级身份覆写

### 涉及文件

1. `src/views/ChatFeaturePlaceholderView.vue`

### 完成标准

1. `identity` 页只剩用户身份相关字段
2. 页面描述文案明确说明这是“用户在 Chat 模块中的身份”

---

## 任务 3：修复乱码和空文案

### 目标

把当前页面里损坏的 UI 文案恢复成可用状态。

### 只做这些事

1. 修复中文乱码
2. 补全 `t('', '')`
3. 修复操作反馈文案
4. 修复确认弹窗标题 / 按钮文案

### 不要做

1. 不调整交互结构
2. 不改业务逻辑

### 涉及文件

1. `src/views/ChatFeaturePlaceholderView.vue`

### 完成标准

1. 页面没有乱码
2. 没有空白按钮文本
3. 保存 / 清空 / 清理都有正常反馈

---

## 任务 4：恢复 `preferences` 页原本内容

### 目标

把被 `v-if="false"` 隐掉的偏好模板区域恢复为正常显示。

### 只做这些事

1. 恢复偏好模板卡片显示
2. 恢复范围预览为真正的会话范围预览
3. 删除为匿名模式临时让位而留下的空壳节点

### 不要做

1. 不追加新偏好功能
2. 不重做交互设计

### 涉及文件

1. `src/views/ChatFeaturePlaceholderView.vue`

### 完成标准

1. `preferences` 页重新显示偏好模板
2. `preferences` 页内容和 `identity` 页职责重新分离

---

## 任务 5：清理未使用变量，恢复 lint

### 目标

让当前这波改动至少回到干净的静态检查状态。

### 只做这些事

1. 处理 `preferenceScopePreviewContacts` 未使用问题
2. 处理 `activeChatIdentityAnonymous` 未使用问题
3. 跑 `npm run lint`

### 不要做

1. 不顺手做额外重构

### 涉及文件

1. `src/views/ChatFeaturePlaceholderView.vue`
2. `src/views/ChatView.vue`

### 完成标准

1. `npm run lint` 通过

---

## 任务 6：拆开新旧头像逻辑的隐式耦合

### 目标

避免新的 `moduleIdentity.avatar` 在“清空后又偷偷回退到旧 selfAvatar”。

### 背景

当前 `normalizeModuleIdentity(rawIdentity, fallbackSelfAvatar)` 会把旧的 `moduleAvatarOverrides.selfAvatar` 当成新身份头像的回退来源。

这会导致：

1. 新页面上把模块头像清空后，视觉上可能还残留旧头像
2. 数据语义不干净
3. 用户会误以为保存失败

### 只做这些事

1. 明确 `moduleIdentity.avatar` 是否允许独立为空
2. 将新用户身份头像和旧模块覆写头像分离
3. 保留必要的历史兼容恢复逻辑

### 不要做

1. 不破坏老存档恢复
2. 不修改联系人头像层级规则

### 涉及文件

1. `src/stores/chat.js`
2. `src/views/ChatView.vue`
3. `tests/chat-store-model.test.js`

### 完成标准

1. 新身份头像清空后不会被旧 `selfAvatar` 自动顶回来
2. 旧备份仍可恢复
3. 测试补齐

---

## 任务 7：补 UI 行为测试或最小回归验证

### 目标

确认这次重构不会把匿名模式和模块身份入口再次放错位置。

### 只做这些事

1. 至少补一组 store / view 级回归验证
2. 验证匿名范围 `all / selected`
3. 验证定向匿名对象存储
4. 验证 `identity` 页与 `preferences` 页职责分离

### 涉及文件

1. `tests/chat-store-model.test.js`
2. 如项目已有 view 测试基建，可按需新增

### 完成标准

1. 关键路径有回归保护

---

## 建议执行顺序

1. 任务 1：修正页面归属
2. 任务 2：收敛 `identity` 页字段
3. 任务 3：修复乱码和空文案
4. 任务 4：恢复 `preferences`
5. 任务 5：恢复 lint
6. 任务 6：拆开新旧头像逻辑
7. 任务 7：补回归验证

---

## Codex 协作流程

后续不要再手动长篇复述上下文，固定使用这 3 个文件协作：

1. `docs/archive/obsolete/2026-04-29-chat-identity/CHAT_IDENTITY_REFACTOR_BREAKDOWN.md`
2. `docs/archive/obsolete/2026-04-29-chat-identity/CHAT_IDENTITY_HANDOFF.md`
3. `docs/archive/obsolete/2026-04-29-chat-identity/CHAT_IDENTITY_SESSION_TEMPLATE.md`

使用方法：

1. 每次新开一轮时，只让 Codex 先读以上文件
2. 每次只指定一个任务编号
3. 明确写“不要扩展到其他任务”
4. 当前轮次结束时，让 Codex 更新 `CHAT_IDENTITY_HANDOFF.md`

---

## 每次开新上下文时可直接引用的最短说明

可以直接把下面这段贴给下一次会话：

```md
当前要处理 Chat 模块 identity 重构，只做 docs/archive/obsolete/2026-04-29-chat-identity/CHAT_IDENTITY_REFACTOR_BREAKDOWN.md 中的“单个任务”。

总目标：
- `/chat-feature/identity` 只管理用户在 Chat 模块中的身份
- 不要有 AI 角色模块级身份配置
- 字段只保留：模块头像、模块昵称、匿名模式、匿名范围、定向匿名对象

本次只做：
- 任务 X（写清编号）

不要顺手扩展到其他任务。
```
