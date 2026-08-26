# Appearance 风格归类（Style Taxonomy）

Updated: 2026-08-26

Document state: `ACTIVE_REFERENCE_DIRECTION`

Governance note: this document is a style-family catalog that guides which beautification packs (system themes / icon packs / style kits) exist and how new ones are classified. It does not create an execution queue. Concrete work still requires promotion through `docs/roadmap/TODO_ROADMAP.md` and the visual package handoff (`docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`).

Purpose: 项目已内置多套美化包并计划继续扩充。本文档为"新增风格"提供统一归类框架：先对号入座到一个风格族，再按统一规格落地，避免主题越加越散。

Upstream direction: `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md` §1（Appearance theme direction）。

## 1. 归类维度

每套主题（无论已落地还是候选）都用以下维度描述。新增风格提案必须逐条回答。

| 维度 | 要回答的问题 | 示例 |
| --- | --- | --- |
| 色彩气质 | 主色/辅色/accent；饱和度与明度区间；日夜两套色板 | 低饱和粉蓝薄荷、暖香槟单色系 |
| 材质语言 | 表面是什么材质：玻璃、纸张、陶土、扁平色块、金属…… | 透明折射玻璃、羊皮纸肌理、黏土浮雕 |
| 形状与轮廓 | 圆角尺度、是否描边/内描边、边框语言 | 大圆角无描边、粗黑描边贴纸 |
| 深度与阴影 | 深度如何表达：柔和投影、浮雕内阴影、硬阴影、无阴影 | 弥散柔影、neumorphism 浮雕 |
| 文字气质 | 字体族、字重、大小写风格、中西文搭配 | 衬线西文 + 细系统中文、粗胖圆体数字 |
| 图标语言 | 配套图标包策略：复用现有包 / 新做包 / glyph 风格 | 动物照片包、线形 glyph + 玻璃壳、描边贴纸包 |
| 氛围资产 | 主题壁纸、配套 widget 集、锁屏/控制中心适配资产 | 日夜壁纸成对、companion widget collection |
| 情绪关键词 | 3~5 个词定位气质 | 轻盈、通透、复古、甜美、俏皮 |

## 2. 风格族目录

风格化定位原则：美化包的价值就是提供强风格化选项。"iPhone-like 克制系统感"约束的是**默认基线**（`classic` 主题与未选择主题时的 shell），不约束用户主动选择的主题包。opt-in 的系统主题可以大胆风格化——它们只覆盖呈现 token，不改变交互结构与 App 内部行为，因此强风格（贴纸、陶土、手账）与全局方向并不冲突，都按完整系统主题对待。

### 2.1 已落地

| id | 中文名 | 所属族 | 一句话特征 |
| --- | --- | --- | --- |
| `classic` | 系统经典 | 克制系统族 | 克制清晰的原生系统材质，无主题壁纸，accent 蓝，柔和投影 |
| `cloud-pastel` | 云朵粉彩 | 轻盈粉彩族 | 雾蓝 + 柔绿 + 浅紫的轻盈材质，自带日夜壁纸 |
| `chromatic-glass` | 彩光玻璃 | 光学玻璃族 | 近中性透明主体，低饱和粉/蓝/薄荷/蜜桃只出现在折射、高光、accent 与轻阴影 |
| `moonlit-journal` | 月光手账 | 复古手账族 | 暖白纸页 + 雾粉浅灰褐，衬线西文标题；夜间仍为降低一档亮度的浅色纸页；复用经典图标包 |
| `sticker-pop` | 贴纸涂鸦 | 贴纸涂鸦族 | 奶油纸底 + 粗圆描边 + 柔和彩色块；配套粗线系统 App 图标包 |

说明：`classic` 更接近"基线"而非风格化美化包；风格化美化包目前指 `cloud-pastel`、`chromatic-glass`、`moonlit-journal` 与 `sticker-pop` 四套（各含同名风格套件，`chromatic-glass` 套件另带 `liquid-prism` 配套组件集）。

### 2.2 风格族规格记录与候选

以下按参考方向归族。参考图仅定义方向气质；落地时所有资产必须 SchatPhone-owned 或自制，不得直接使用外部图库/社交平台素材（注意版权与水印）。

#### A. 月光手账族（Vintage Journal）— id `moonlit-journal` / 中文名「月光手账」

状态：**已落地（2026-08-26）**，见 2.1 表；以下为当前规格记录。首版未带主题壁纸与专属图标包（复用经典包），纸纹肌理资产与手账图标包留作后续增强。

- 参考方向：高明度暖白 + 雾粉 + 浅灰褐；信纸般柔和的纸面；衬线西文标题；整体低对比、安静、带月光感。
- 归类维度草案：材质=轻纸张感；形状=中大圆角、细边框或无边框；阴影=极柔弥散影；文字=衬线西文 + 细系统中文；情绪=静谧、柔和、朦胧。
- 日夜策略：日间=暖白纸页；夜间=烟粉灰纸页，仅比日间降低一档亮度，继续使用深色文字，不切换到咖啡黑。
- 图标包策略：新做"细线 + 衬线字母/手账符号"包，或先复用经典包试点主题层。
- 主要风险：低对比配色在夜间的可读性；纸纹资产的真实感（避免变成廉价滤镜）。

#### B. 奶油陶土族（Soft Clay）— 候选 id `soft-clay` / 中文名「奶油陶土」

- 参考方向：粉/蓝马卡龙色板；黏土/油画肌理的柔软 3D 造型；白色胶囊容器 + neumorphism 浮雕；粗胖圆体数字；可爱但不是儿童画（参考图：小红书粉蓝陶土 widget 包，仅作方向）。
- 归类维度草案：材质=陶土/奶油浮雕；形状=超大圆角胶囊；阴影=柔和外投影 + 内浮雕高光；文字=圆体/粗体数字 + 常规系统中英文；情绪=柔软、治愈、微甜。
- 日夜策略：日间=浅灰绿/米白底 + 粉蓝胶囊；夜间=降低明度并保留陶土浮雕感，避免泥泞。
- 图标包策略：新做"陶土迷你模型感"图标包（与现有 `cloud-pastel-animals` 动物包族内相邻但不重复）。
- 主要风险：肌理资产制作量最大；浮雕阴影在低端设备/深色下的表现。

#### C. 贴纸涂鸦族（Outlined Sticker）— id `sticker-pop` / 中文名「贴纸涂鸦」

状态：**已落地（2026-08-26）**。当前版本包含完整日夜主题 token、同名一键风格套件，以及覆盖现有系统 App allowlist 的粗线材质图标包；商业 App、Chat 与单 App 覆盖继续保持独立。

- 参考方向：粗黑描边 + 扁平色块 + 卡通贴纸造型；参考图的高饱和撞色在 SchatPhone 中收敛为珊瑚、奶油黄、叶绿、天蓝与淡紫五组柔和彩色角色。
- 归类维度草案：材质=扁平色块 + 描边；形状=中圆角 + 均匀粗描边；阴影=短距离硬投影；文字=圆润粗体；情绪=俏皮、活泼、直给。
- 实现要点：这是 token 友好度最高的强风格族——描边（宽度/颜色）、撞色板、硬阴影全部可落成 CSS 变量，主题层几乎不需要肌理资产；主要工作量在新图标包（描边贴纸风）。粗描边主要通过 border token 表达，注意与系统字号排版的间距协调。
- 日夜策略：日间=奶油白底 + 深墨描边；夜间=暖墨底 + 降饱和彩色块 + 浅奶油描边。
- 当前边界：主题不引入外部图片资产；系统图标以清晰功能 glyph + 粗线色块壳实现，后续可在不改 resolver 优先级的前提下替换为专门绘制的原创贴纸 glyph。

#### D. 既有候选（来自 Visual Style Direction Brief §1）

| 候选 | 所属族 | 状态说明 |
| --- | --- | --- |
| Dessert Bakery（甜品烘焙） | 轻盈粉彩族的姊妹方向 | brief 保留候选，奶油/烘焙质感，未做规格 |
| Misty Glass（雾玻璃） | 光学玻璃族 | brief 保留候选，可作为 `chromatic-glass` 的低饱和/雾面变体 |

落地说明（2026-08-26）：**月光手账**与**贴纸涂鸦**均已落地；**奶油陶土**的主题层不难，但标志性效果依赖肌理资产（图标/widget 的陶土质感），受资产产能约束排后。此说明不构成执行队列，后续落地仍由用户请求、roadmap 与包交接共同确认。

### 2.3 新风格如何归族

1. 先判断主轴是**材质**还是**色彩情绪**：材质主导（玻璃、纸张、陶土、描边）优先按材质归族；色彩主导且材质常规的，归入轻盈粉彩族或其姊妹方向。
2. 同族内新变体优先做成**现有主题的变体参数或姊妹 id**，而不是全新主题（例：Misty Glass 相对 Chromatic Glass）。
3. 无法归入现有族时，先在本目录新增一节"候选族"补全 8 个归类维度，再进入落地流程；不允许绕过归类直接写代码加主题。
4. 一套完整美化包 = 系统主题（必含日夜两套 token）+ 可选图标包 + 可选风格套件 + 可选配套组件集；四层独立可拆，kit 是组合不是锁定。

## 3. 落地最低规格（Definition of Ready）

进入实现前，每个新主题必须具备：

1. kebab-case 英文 id + 四字左右中文名 + 双语 label/description；
2. 日/夜两套完整 token 草案（色板、圆角、阴影、blur、字体、Dock/Home 变量）；
3. 图标包策略（复用或新做）与氛围资产清单（壁纸成对、widget 集如需）;
4. 至少一张 Home 预览稿或参考板；
5. 可读性自查：正文/次要文字对比度、夜间版本专项检查。

## 4. 落地涉及文件清单

参照 `chromatic-glass`（commit `68a8409`、`8c0e418`）的完整改动面：

必改：

1. `src/lib/system-appearance-theme.js` — 注册系统主题（及风格套件）条目；
2. `src/style.css` — 新增 `[data-system-theme='<id>'][data-color-mode='day|night']` 两组 token 覆盖；
3. `src/stores/system.js` — 确认 id 归一化与 fallback（通常无需新逻辑）。

按需：

4. `src/lib/system-app-icon-theme.js` — 新图标包；
5. `src/lib/widget-style-presets.js` — 配套组件集；
6. `src/views/AppearanceView.vue` — 预览图与文案；
7. shell 各面适配：`App.vue`、`AppIconVisual.vue`、`HomeView.vue`、`LockScreen.vue`、`SystemNotificationShade.vue`。

文档与验证：

- 文档：`docs/overview/APPEARANCE_REBUILD_SCOPE.md`、`docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md` §1、`docs/design/APPEARANCE_STYLE_TAXONOMY.md`（本文档，族目录状态更新）、`docs/pm/visual-and-ia-governance/{README,STATUS_AND_HANDOFF}.md`；
- 验证：`npm.cmd run lint`、`npm.cmd run test`、`npm.cmd run build`，用户可见路线补 `e2e/appearance-system-app-icons.spec.js` 相关断言与截图。

## 5. 与局部外观的边界

以下子系统拥有自己的外观层，**不纳入**全局美化包归类，避免混淆：Chat 外观（`chat-appearance.js`）、单 App 换肤（`app-skin-customization.js` / `appearance-scoped-css.js`）、钱包卡面（`wallet-card-appearances.js`）、日历标记配色（`calendar-markers.js`）。风格族目录只管全局系统层：day/night、系统主题、图标包、风格套件、配套组件集。
