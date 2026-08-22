# 地图素材回家开工单

日期：2026-08-22

## 你只需要做什么

在家里电脑打开 SchatPhone 项目的 Codex，然后只发送这一句话：

> 请读取 `docs/pm/map-calendar-reminders/MAP_MEDIA_HOME_START_2026-08-22.md`，按文档完成图床发布、验证、提交和推送；不要下载剩余 53 张素材，也不要改动无关工作区内容。

如果 Codex 提示缺少 `SCHATPHONE_IMGBED_PROJECT_TOKEN`，从密码管理器中的
`SchatPhone-Project-Publisher` 条目取出密码，按它的提示只写入家里电脑的
`.env.local`。不要把令牌发到聊天、Git 或本文档中。

26 张原图压缩包不是发布图床的必要条件。它只用于以后重新裁切或复核来源：

```text
map-place-media-26-originals-handoff-20260822.zip
```

## 接手 Codex 必须完成的工作

目标：发布提交 `9446882` 中等待上传的 24 张地图运行时 WebP，并确认地图详情
轮播显示真实地点照片，而不是 404 占位图。

1. 阅读根目录 `AGENTS.md`、`docs/process/AI_WORK_MODE.md` 和当前包
   `STATUS_AND_HANDOFF.md`。检查分支、远端和脏工作区，保留所有无关用户修改。
2. 更新到 `origin/main`，确认历史中包含提交 `9446882`。不要重新下载剩余 52 条
   `pending_download` 和 1 条 `rate_limited` 素材。
3. 确认以下 Git 兜底文件存在：
   - `.imgbed-publish/map-place-media-integration-20260822.plan.json`
   - `output/imagegen/map-place-media-integration-20260822/runtime/` 下 24 张 WebP
4. 确认本机忽略文件 `.env.local` 已配置
   `SCHATPHONE_IMGBED_PROJECT_TOKEN`。缺少时只请求用户本地提供，不复制其他电脑
   的环境文件，也不打印令牌。
5. 执行待发布素材流程，让工具上传、逐张回读并核对字节数与 SHA-256，同时更新
   `config/project-assets.json`，清理已经发布的上传清单和 24 张 Git 兜底文件。
6. 只暂存上述注册表更新和兜底文件清理。不得夹带 Calendar、Agenda、截图、
   `tmp/` 或其他用户改动。
7. 验证注册表新增 24 个对象，并确认所有对象使用
   `schatphone-assets/images/ui-assets/apps/map/places/real-seoul-v1/` 远端键。
8. 运行素材注册检查、地图媒体聚焦单测、完整 lint、完整 test、build、治理检查和
   `git diff --check`。
9. 运行 `e2e/map-place-media.spec.js` 的桌面与手机项目，并直接检查新生成的
   `detail-gallery` 截图。当前测试曾把图床的 404 占位图片误判为“已加载”，因此
   不能只看 `naturalWidth > 0`；必须确认截图中是光化门照片，并补强测试使 404
   占位内容无法通过。
10. 提交并推送清理结果。最终向用户报告远端验证对象数、提交号、推送状态、测试
    结果，以及是否仍存在未发布素材。

## 完成标准

- 图床回读验证：24/24；
- `config/project-assets.json` 已登记 24 个对象；
- 上传清单和 24 张 Git 兜底 WebP 已从最新提交中清理；
- 光化门详情显示 `1 / 4`，切到第二张后显示真实周边照片和 `周边实景`，不是 404；
- 仁川机场只保留 #07，#01/#02 继续排除；
- 剩余 53 张未下载候选保持不动；
- 提交已推送，且没有夹带用户的其他工作区修改。

## 当前事实

- 地图接入提交：`9446882 feat(map): integrate reviewed place photo galleries`；
- 已处理原图：26 张；其中 24 张接入、2 张身份不符排除；
- 接入地点：光化门广场、首尔市厅、南山首尔塔、东大门设计广场、乐天世界塔、
  仁川国际机场一号航站楼；
- 运行时结构：6 张概览主图，详情共 24 张轮播图；
- 本办公室电脑没有项目图床令牌，所以 `9446882` 使用了 Git 兜底并已推送；
- 原始来源与逐图决定见
  `docs/qa/MAP_PLACE_MEDIA_INTEGRATION_2026-08-22.md`。
