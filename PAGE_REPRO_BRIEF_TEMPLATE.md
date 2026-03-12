# Page Recreation Brief Template / 页面复现需求模板

Purpose / 用途: provide a reusable brief format for page visual recreation tasks.  
用于页面外观复现任务的可复用需求单格式。

Best practice / 最佳实践: provide both screenshots and URL.  
建议同时提供截图和页面地址，复现质量更高。

---

## A. Required Inputs / 必填信息

| Field / 字段 | Required / 必填 | Format / 格式 | Notes / 说明 |
|---|---|---|---|
| Reference screenshots / 参考截图 | Yes | PNG/JPG (multiple states) | First screen + key states |
| Target page URL / 目标页面地址 | Yes | URL | Used for interaction flow and motion rhythm |
| Device and viewport / 设备与尺寸 | Yes | e.g. iPhone 15 Pro, 390x844 | Defines layout baseline |
| Scope / 复现范围 | Yes | List | Specify included and excluded areas |
| Required states / 必做状态 | Yes | List | default/pressed/loading/empty/error, etc. |
| Fidelity level / 还原标准 | Yes | One choice | Pixel-perfect or style-consistent |
| Priority / 优先级 | Yes | P0/P1/P2 | Helps scheduling |

---

## B. Optional but Recommended / 选填但强烈建议

| Field / 字段 | Format / 格式 | Notes / 说明 |
|---|---|---|
| Screen recording / 录屏 | MP4/GIF | Useful for transitions and timing |
| Design source / 设计源文件 | Figma/Sketch/PDF | Improves spacing and typography accuracy |
| Font and icon source / 字体与图标来源 | Link or package | Avoids visual mismatch |
| Asset package / 资源包 | ZIP/folder | Original images, logos, backgrounds |
| Interaction rules / 交互规则 | Bullet list | Click/hover/long-press/swipe behavior |
| Constraints / 限制条件 | Bullet list | Copyright, no external CDN, etc. |
| Deadline / 截止时间 | Date and timezone | Helps batch planning |

---

## C. Reusable Submission Format / 可复用提交格式

Copy and fill the block below.  
复制下面模板后填写。

```md
# Page Recreation Brief / 页面复现需求单

## 1) Basic Info / 基础信息
- Task name / 任务名称:
- Priority / 优先级: P0 / P1 / P2
- Due date / 截止时间:
- Owner / 提交人:

## 2) Target Platform / 目标平台
- Device / 设备:
- Viewport / 尺寸:
- Runtime / 运行环境: Web mobile shell
- Orientation / 方向: Portrait / Landscape

## 3) Source Materials / 参考素材
- Screenshots / 截图:
  - [ ] Default state / 默认态
  - [ ] Active or pressed state / 操作态
  - [ ] Loading state / 加载态
  - [ ] Empty state / 空状态
  - [ ] Error state / 错误态
- URL / 页面地址:
- Recording / 录屏:
- Design file / 设计文件:
- Asset package / 资源包:

## 4) Scope / 复现范围
- In scope / 包含:
- Out of scope / 不包含:

## 5) Fidelity Target / 还原目标
- [ ] Pixel-perfect (1:1) / 像素级还原（1:1）
- [ ] Style-consistent / 风格一致
- Notes / 备注:

## 6) Interaction Requirements / 交互要求
- Must-have interactions / 必做交互:
- Scroll behavior / 滚动行为:
- Gesture behavior / 手势行为:
- Animation expectations / 动效预期:

## 7) Visual Tokens (if known) / 视觉变量（如已知）
- Primary color / 主色:
- Accent color / 强调色:
- Font family / 字体:
- Radius / 圆角:
- Shadow / 阴影:
- Spacing rule / 间距规则:

## 8) Content and Locale / 文案与语言
- Keep exact copy? / 是否保持原文案:
- Language mode / 语言模式: CN / EN / Bilingual
- Placeholder policy / 占位文案策略:

## 9) Constraints / 约束条件
- Dependency limits / 依赖限制:
- Asset usage limits / 资源使用限制:
- Performance limits / 性能限制:

## 10) Acceptance Criteria / 验收标准
- Required routes/pages / 验收页面:
- Required states completed / 状态覆盖完成:
- Responsive check / 自适应检查:
- Regression check / 回归检查:

## 11) Delivery / 交付要求
- Output path / 输出路径:
- Naming convention / 命名规则:
- Need screenshot comparison / 是否需要对比图:
- Need commit message format / 是否指定提交格式:
```

---

## D. Quick Start Version / 快速版（最少信息）

If you want to start immediately, fill this short version first.  
如需快速开工，先填这个最小版本即可。

```md
# Quick Brief / 快速需求
- Target page / 目标页面:
- Device + viewport / 设备与尺寸:
- URL / 地址:
- Screenshot folder / 截图文件:
- In scope / 复现范围:
- Required states / 必做状态:
- Fidelity level / 还原标准:
```


