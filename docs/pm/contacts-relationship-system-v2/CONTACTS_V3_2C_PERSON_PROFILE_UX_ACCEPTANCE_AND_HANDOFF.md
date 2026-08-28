# Contacts V3-2C Person Profile UX Acceptance And Handoff

Updated: 2026-08-28

Status: `LOCAL_ACCEPTANCE_READY / USER_REVIEW_PENDING / CONTACTS-V3-2C_IN_PROGRESS`

Execution authority: `docs/roadmap/TODO_ROADMAP.md`

## 1. 这轮解决了什么

此前联系人底层已经能保存类目、字段和整段人设归类结果，但用户看不到一张真正可填写的人物资料表，也难以理解模板、字段类型、版本和权限等技术文案。

当前可检验流程已经调整为：

`联系人个人页 -> 导入人设 / 逐项填写 -> 粘贴或选择文本文件 -> 检查归类结果 -> 确认保存 -> 按类目阅读人物资料`

这一轮不新增另一套人设文案，也不改变 Contacts、Chat、Relationship Runtime、Work Hub 或 Event Runtime 的数据归属。

## 2. 当前可见结果

### 2.1 人物首页

- 人物姓名、身份、简介和关系状态先出现；
- 已确认资料按类目直接阅读，不再先展示完成数量或系统术语；
- 空资料人物直接显示“导入人设”和“逐项填写”；
- “导入人设”是唯一主入口；二级资料阅读页不再重复放置同一操作；
- 关系、共同经历、相处细节、最近活动和档案管理仍可继续进入。

### 2.2 逐项填写

- 页面标题明确为“编辑某人的资料”；
- “资料卡样式”决定常见填写项目，用户不需要理解模板版本；
- 每个输入都有可见字段名、简短帮助和“谁可以读取”；
- 字段类型标签和 WorldBook、Runtime、修订等内部词不再占据主流程；
- 更换样式时的保留说明收进按需展开区域；
- 仍可增加人物专属资料，也可以明确选择让同世界其他人物使用同一资料项。
- 二级阅读页只展开已有确认值的类目；整类尚未填写的内容合并为一条“待补充资料”摘要，可直接继续填写，不再用多张空卡拉长手机页面。

### 2.3 导入整段人设

- 入口标题为“整理某人的人设”；
- 同一输入区支持直接粘贴，以及本地读取 `.txt`、`.md`、`.markdown`、`.json`；
- TXT/Markdown 原文保持不变，JSON 校验后以完整的格式化文本进入复核来源；
- 空文件、超限、无效 JSON、不支持的格式或读取失败都不会覆盖既有输入，也不会修改正式人物资料；
- 结果分为“可以直接填写 / 建议新增 / 需要你选择 / 暂时保留原文”；
- 每一项都可以修改名称、内容和读取范围；
- 新资料项可以选择所属类目；
- 每项必须选择“保存这项”或“不保存”，最后才可确认保存；
- 完整原文继续保留在“查看原始人设”中；
- 通用资料卡不绑定具体世界时，也可以完成确认保存。
- 打开人设整理后，既有资料列表暂时收起，让粘贴、复核和逐项决定保持单一焦点；关闭或取消后原阅读列表完整恢复。
- 入口明确说明只生成复核草稿，不会直接修改人物资料。

### 2.4 Eva 与 Jackie 样例

- 未编辑的内置 Eva、Jackie 会得到身份、关系设定、性格与习惯三项代表性资料；
- 迁移只匹配稳定内置 ID、姓名、角色、简介、初始修订和空资料状态；
- 只要用户已经编辑、保存、换过资料卡、增加扩展或产生新修订，就不会覆盖现有内容。

## 3. 用户回家后的验收路径

打开：

`http://127.0.0.1:5174/schatphone/#/contacts?homePage=0&from=home&profileId=1`

按下面顺序检查：

1. 查看 Eva 首页是否像一张人物资料，而不是后台计数面板；
2. 点击“逐项填写”，检查字段名称、帮助文字、读取范围和资料卡样式是否容易理解；
3. 返回后点击“导入人设”，分别检查粘贴文字和导入 TXT、Markdown、JSON；
4. 查看 Jackie，比较两个人物内容是否足以表现资料卡差异；
5. 新建一个空人物，确认空状态是否能自然引导到两种填写方式；
6. 重点记录内容密度、类目命名、按钮位置和仍显得像脚手架的区域。

如果本地预览提示只读，说明另一个 SchatPhone 页面持有当前存档写权。只读状态不影响视觉检查；需要实际保存时，关闭占用写权的页面后重新载入。

## 4. 已通过的验证

- 2026-08-28 人设唯一入口与本地文件导入优化：新增 9 项导入解析测试，覆盖 TXT、MD、Markdown、JSON、无效 JSON、空文件、超限、不支持格式和读取失败；Contacts 资料视图针对性测试共 33 项通过；
- 完整 `npm.cmd run test -- --dir tests`：342 个文件 / 2604 项全部通过；
- 独立 `5175` 端口完成 desktop Chromium 与模拟 Pixel 5 验证：WorldBook/Contacts Persona 8 项通过，Contacts 手机界面 4 项通过；文件导入、双语/日夜既有矩阵、取消重开、AI 失败、WCAG A/AA 和零横向溢出保持通过；
- `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run governance:check` 与 `git diff --check` 通过；
- `npm.cmd run lint`;
- `npm.cmd run build`;
- `npm.cmd run governance:check`;
- 43 个 Contacts 人物资料、World-field model、Persona classifier 和 confirmation 针对性单元测试；
- `e2e/contacts-phone-ui.spec.js`: desktop 和 mobile 共 4 项通过；
- `e2e/visual-quality.spec.js`: default/Zen、desktop/mobile 共 20 项通过；
- `e2e/worldbook-contacts-profile-fields.spec.js`: desktop Chromium 与模拟 Pixel 5 共 8 项通过，新增覆盖空类目摘要、整理态聚焦、草稿边界、取消重开、AI 失败、WCAG A/AA 和零横向溢出；
- 375px 与 1280px 浏览器检查无横向溢出。

正式 `npm.cmd run test -- --dir tests` 完成 341 个文件 / 2592 项测试，其中 340 个文件 / 2591 项通过；唯一失败是非 Contacts 的 `tests/music-store.test.js` ChKSz LRU 用例超过默认 5 秒上限。该文件随后使用 `--testTimeout=15000` 单独复跑，21/21 通过。Contacts focused tests、完整 E2E、lint、build、governance 和 diff checks 均通过。

## 5. 当前仍未完成

- 用户尚未共同验收，因此 `CONTACTS-V3-2C` 继续保持 `IN_PROGRESS`；
- 当前不是 Contacts 全应用视觉重做完成声明；
- 类目命名、输入控件节奏和人物专属新增区仍可以根据实际观感继续调整；本轮已收紧二级阅读页空类目密度、Persona 整理态焦点和唯一导入入口；
- 没有新增正式 AI 模型配置、事件触发、Work Hub 权限或下游消费者能力；
- `CONTACTS-V3-5` 继续保持 gated。

## 6. 下一次安全接续

优先做用户指出的具体视觉和理解问题，不要重新设计底层资料结构。建议顺序：

1. 根据 Eva、Jackie 和空人物三种状态记录问题；
2. 先修首屏层级、类目命名和表单阅读节奏；
3. 再检验整段人设的真实归类结果与类目选择；
4. 通过用户验收后，才把 `CONTACTS-V3-2C` 标记完成并讨论 `CONTACTS-V3-5`。

继续工作前读取：

1. 本文档；
2. `STATUS_AND_HANDOFF.md`；
3. `CONTACTS_V3_2A_EXTENSIBLE_PROFILE_CARD_DESIGN.md`；
4. `docs/roadmap/TODO_ROADMAP.md`。

## 7. 提交边界

本轮提交只应包含联系人资料 UX、Persona Confirmation 通用资料卡修正、未编辑内置人物样例、相应测试和联系人文档。地图事件美化、地图截图、地图文档和临时文件属于并行任务，不得混入。
