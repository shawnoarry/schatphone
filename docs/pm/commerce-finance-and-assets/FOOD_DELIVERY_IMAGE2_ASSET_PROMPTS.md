# Food Delivery Image2 Asset Prompts / 外卖 Image2 素材提示词

Updated: 2026-08-01

这份文档用于生成外卖 UI 美化需要的 PNG 素材。所有提示词都做成中英双语，方便直接复制到 image2 / 生图工具中使用。

## Portable Shop Asset Generation Playbook / 跨机器店铺素材生成方法

这套方法用于提高同一店铺在不同机器、模型或生成批次中的一致性，但它不是唯一画风模板。每家店可以保留自己的摄影、插画、IP、材质与构图语言；需要稳定的是品牌识别和 UI 适配条件，而不是让所有图片看起来完全相同。

### Why Results Drift / 为什么换机器后容易跑偏

一致性通常不只取决于提示词。模型与版本、输出尺寸、参考图支持、随机种子、质量参数、提示词编码、后处理方式，以及图片最终在 UI 中的裁切比例都会影响结果。只描述“粉色、可爱、甜品摄影”之类的宽泛气质，并把每张图当作独立任务生成，通常只能得到同类图片，不能得到同一品牌的素材组。

### Recommended Generation Stack / 推荐生成层次

1. **Brand capsule / 品牌胶囊**：先冻结店铺定位、受众、3 到 5 个气质词、主辅色职责、标志性物件、允许的材质与明确禁用项。颜色应写出色值和用途，不只写颜色名称。
2. **Asset map / 素材地图**：区分品牌 Hero、活动广告、商品图、分类图标、Logo/吉祥物和空状态插画。不同角色不应复用同一构图；Hero 负责品牌识别，活动图负责具体主题，商品图负责准确展示产品。
3. **Slot contract / 槽位合同**：按真实 UI 容器记录宽高比、`object-fit`、可见裁切、文字压盖方向、主体安全区和最小显示尺寸。先决定图片将如何被页面使用，再决定画面如何构图。
4. **Style anchors / 风格锚点**：从已验收素材中选择 3 到 5 张参考图，通常包含品牌 Hero、Logo/吉祥物、代表性商品图和一张活动图。工具支持参考图时直接传入；不支持时，把锚点中稳定的光线、镜头、材质、背景、色彩职责和主体比例写回品牌胶囊。
5. **Shared prompt + subject delta / 固定母提示词加单图变量**：同一批次锁定品牌胶囊、镜头距离、光线、背景语法、负面提示、尺寸和质量参数，每张图只替换产品主体、配料、器皿和允许的小范围构图变化。
6. **Controlled variation / 受控变化**：一致不等于复制。可以在约定范围内变化镜头角度、器皿、道具、背景形状和主体朝向，避免整套素材像同一个模板换菜；不可变化的是品牌色职责、光线逻辑、材质气质、主体识别和 UI 安全区。
7. **Candidate gate / 候选验收**：生成结果先作为候选，不直接进入运行时目录。依次检查语义准确、品牌一致、主体完整、缩略图识别、详情大图质量、文字安全区、重复构图、尺寸/透明度、版权和敏感信息。
8. **Deterministic delivery / 确定性交付**：使用可重复的裁切、缩放和 PNG 导出步骤。运行时文件放在 `public/images/ui-assets/apps/food-delivery/<shop>/`，可编辑母版放在 `output/imagegen/<shop-or-round>/`；页面不得依赖母版或临时请求文件。

### Portable Request Record / 可迁移请求记录

为了让另一台机器能继续同一批次，建议在对应母版目录保留一个请求记录，格式可以是 JSON、JSONL 或 Markdown，不强制唯一。至少记录：

- 生成服务、模型和版本（能够取得时）；
- 完整母提示词、单图变量和负面提示；
- 输出尺寸、质量、背景/透明度和随机种子（工具支持时）；
- 参考图的项目相对路径，不记录只在某台机器存在的临时绝对路径；
- 原始候选、最终裁切、运行时目标路径和接受/拒绝原因；
- 对应 UI 槽位的宽高比、文字压盖方向和缩略图验收尺寸。

Windows CLI 应使用 UTF-8 提示词文件或结构化请求文件，先检查 dry-run 请求体，再提交生成，避免 `.cmd` 内联多行提示被截断。随机种子只能辅助复现，不能替代参考图、模型版本和槽位合同。

### Reusable Prompt Skeleton / 可复用提示词骨架

```text
[Brand capsule]
Fictional shop identity, audience, mood words, palette roles with color values,
signature mascot/object, lighting, camera/material language, prohibited cues.

[Asset role]
Hero / campaign / product / category / logo, and what this asset must communicate.

[Slot contract]
Target aspect ratio, subject position and scale, text-safe area, crop-safe margins,
object-fit behavior, smallest rendered size, thumbnail and detail-view requirements.

[Subject delta]
Exact product, ingredients, vessel, garnish, temperature/texture, allowed variation.

[Negative constraints]
No unrelated product, unreadable or random text, real brand, watermark, UI frame,
distorted food, clipped key silhouette, duplicated hero composition, or unsafe crop.

[Output]
Pixel dimensions, PNG/alpha requirement, candidate only until visual QA passes.
```

同一店铺的下一批素材应先读取已验收锚点和请求记录；新店铺则先建立自己的品牌胶囊，不继承桃子云、Verdant Day 或平台素材的默认画风。允许探索多个候选方向，最终只把通过实际页面裁切检查的一组接入运行时。

核心原则：图片里不要烘入 UI 文案、价格或按钮。食物摄影不放品牌字样；明确标记为“店铺 Logo”的素材允许有独立品牌图形，但仍不放可读店名，店名继续由代码渲染。

## Shared Style Direction / 统一视觉方向

除非单条提示另有说明，所有素材都尽量遵循这个方向：

```text
中文：清爽韩系外卖 App 视觉，干净的商业食物摄影，结合柔和可爱的 3D 外卖应用装饰，明亮白色或轻盈青绿色背景，食物真实诱人，移动端外卖广告质感，柔和自然阴影，细节清晰，高级但亲切，不要文字，不要品牌 logo，不要水印，不要 UI 界面，不要手机样机，输出 PNG。

English: Fresh Korean-style food delivery app visual, clean commercial product photography mixed with soft playful 3D delivery-app accents, bright white or airy teal background, appetizing real food, polished mobile app advertising look, soft natural shadows, high detail, premium but friendly, no text, no brand logo, no watermark, no UI frame, no phone mockup, PNG output.
```

统一负面提示词：

```text
中文：不要可读文字，不要品牌 logo，不要水印，不要假 App 界面，不要手机边框，不要手持手机，不要变形食物，不要凌乱桌面，不要阴暗压抑光线，不要过度模糊，不要低清晰度，不要额外标签，不要二维码，不要随机字体。

English: no readable text, no brand logo, no watermark, no fake app screen, no phone frame, no hands holding phone, no distorted food, no messy table, no dark gloomy lighting, no excessive blur, no low resolution, no extra labels, no QR code, no random typography.
```

## 1. Platform Homepage Banner PNGs / 平台首页横幅图

用途：外卖平台首页广告轮播。图片只做氛围和主体视觉，文字在代码里编辑。

建议尺寸：`900x300` 或 `750x250`。

### Banner 1: Membership Free Delivery / 会员免配送

```text
中文：横向外卖会员活动横幅，青绿色和白色的轻盈背景，可爱的 3D 外卖优惠券和小外卖袋，右侧带一个轻微的食物碗装饰，干净的韩系外卖 App 氛围，高级亲切的商业插画质感，柔和阴影，左侧预留充足空白给可编辑 UI 文案，不要文字，不要 logo，不要水印，PNG。

English: Horizontal food delivery membership campaign banner, teal and white airy background, cute 3D delivery coupon and small delivery bag, subtle food bowl accent on the right, clean Baemin-like Korean delivery app mood, premium friendly commercial illustration, soft shadows, generous empty space on the left for editable UI text, no text, no logo, no watermark, PNG.
```

### Banner 2: Weekend Food Picks / 周末美食推荐

```text
中文：横向周末美食推荐横幅，诱人的热汤饭碗、寿司盘和披萨切片组合，清爽青绿色到暖色的渐变背景，干净的移动端外卖广告风格，食物集中在右侧，左侧留出空白给可编辑文案，明亮真实食物摄影质感，并带少量 3D 装饰，不要文字，不要 logo，不要水印，PNG。

English: Horizontal weekend food recommendation banner, appetizing arrangement of hot soup rice bowl, sushi plate, and pizza slice, fresh teal-to-warm gradient background, clean mobile food delivery campaign style, food clustered on the right with empty space on the left, bright realistic food photography with subtle 3D accents, no text, no logo, no watermark, PNG.
```

### Banner 3: Quick Lunch Shortcut / 午餐快选

```text
中文：横向午餐快选外卖横幅，浅蓝和柔粉背景，整洁的午餐组合，包括沙拉杯、炸鸡小食、冰咖啡和小票/优惠券道具，精致韩系外卖 App 广告感，轻快但不要幼稚，留出空白给可编辑文案，不要文字，不要 logo，不要水印，PNG。

English: Horizontal quick lunch food delivery banner, light blue and soft pink background, neat lunch set with salad cup, fried chicken bites, iced coffee, and small receipt/coupon prop, polished Korean delivery app advertising look, cheerful but not childish, empty space for editable copy, no text, no logo, no watermark, PNG.
```

### Weekend Lucky Draw Campaign Poster / 周末抽奖活动页海报

用途：`周末精选`活动内页的大概念竖版主视觉，不替换首页既有横幅。页面已通过 `data-required-asset` 预留以下路径；正式图缺失时回退显示现有周末横幅：

```text
public/images/ui-assets/apps/food-delivery/platform/campaigns/weekend-lucky-draw-poster-01.png
```

建议源图：`900x1200` 或 `750x1000`，竖版 `3:4`。主要食物和抽奖道具集中在上半部与右侧，下半部保留较平静、对比稳定的区域给代码叠加标题。

```text
中文：竖版周末外卖抽奖活动主视觉海报，清爽青绿色、珊瑚橙和少量暖黄色构成有节庆感但不过度喧闹的配色，画面上半部和右侧有立体外卖袋、优惠券、甜品杯、配送头盔与少量诱人食物组合，像真实大型外卖平台的周末品牌活动，构图大胆、主体清晰、有开袋掉落惊喜的动势，下半部保留干净且明暗稳定的叠字安全区，不要可读文字，不要品牌 logo，不要二维码，不要 UI 按钮，不要手机样机，不要水印，PNG。

English: Portrait hero poster for a weekend food-delivery lucky draw, fresh teal, coral orange, and small warm yellow accents with a festive but controlled palette, dimensional delivery bag, coupons, dessert cup, delivery helmet, and a small appetizing food arrangement concentrated in the upper half and right side, believable major delivery-platform weekend campaign, bold clear composition with an unpacking-surprise motion, calm high-contrast safe area in the lower portion for editable code-rendered copy, no readable text, no brand logo, no QR code, no UI button, no phone mockup, no watermark, PNG.
```

## 2. Platform Merchant Main Images / 平台小店主图

用途：外卖平台内部小店卡片主图。整体要像真实外卖软件里的商家封面。

建议尺寸：`900x600` 或 `1200x800`。

### Reverse Station Korean Beef Soup Rice / 逆站洞韩牛汤饭

```text
中文：真实商业食物摄影，一碗热气腾腾的韩式牛肉汤饭，能看到牛肉片、米饭、葱花，旁边有小份泡菜配菜，温暖诱人的光线，干净餐厅桌面，高级外卖商家封面图，居中构图，细节清晰，不要文字，不要 logo，不要水印，PNG。

English: Realistic commercial food photography of Korean beef soup rice, steaming hot bowl, sliced beef, rice, scallions, small kimchi side dishes, warm appetizing light, clean restaurant table, premium delivery app merchant cover photo, centered composition, high detail, no text, no logo, no watermark, PNG.
```

### Sushi Hana / 寿司花

```text
中文：真实商业食物摄影，精致寿司拼盘，包括三文鱼寿司、虾寿司、玉子烧、寿司卷，干净陶瓷盘，配少量芥末和姜片，明亮自然光，高级日料外卖商家封面图，清爽诱人，不要文字，不要 logo，不要水印，PNG。

English: Realistic commercial food photography of sushi platter, salmon nigiri, shrimp nigiri, tamago, maki rolls, clean ceramic plate, fresh wasabi and ginger, bright natural light, premium Japanese delivery merchant cover photo, appetizing and clean, no text, no logo, no watermark, PNG.
```

### Hwadeok Pizza Shop / 花德披萨味店

```text
中文：真实商业食物摄影，手作芝士披萨，金黄饼边，融化芝士，罗勒点缀，旁边有少量炸鸡翅，温暖桌面光线，外卖商家封面风格，诱人但构图干净，不要文字，不要 logo，不要水印，PNG。

English: Realistic commercial food photography of artisan cheese pizza, golden crust, melted cheese, basil, small fried chicken wings nearby, warm table lighting, delivery app merchant cover style, appetizing but clean composition, no text, no logo, no watermark, PNG.
```

### Salad Diary / 沙拉日记

```text
中文：真实商业食物摄影，新鲜牛油果鸡胸沙拉碗，藜麦、小番茄、生菜，旁边有莓果酸奶杯，明亮健康的咖啡馆光线，干净白色桌面，高级轻食外卖商家封面图，不要文字，不要 logo，不要水印，PNG。

English: Realistic commercial food photography of fresh avocado chicken salad bowl with quinoa, cherry tomatoes, greens, berries yogurt cup nearby, bright healthy cafe light, clean white table, premium light food delivery merchant cover photo, no text, no logo, no watermark, PNG.
```

### Crispy Fried Chicken House / 脆脆炸鸡屋

```text
中文：真实商业食物摄影，韩式酥脆炸鸡，金黄酥皮炸鸡块，薯条，年糕串，小份蘸酱，明亮诱人的光线，外卖商家封面图，构图干净，不要文字，不要 logo，不要水印，PNG。

English: Realistic commercial food photography of crispy Korean fried chicken, golden crunchy pieces, fries, rice cake skewers, small dipping sauces, bright appetizing light, delivery app merchant cover photo, clean composition, no text, no logo, no watermark, PNG.
```

### Diverse Merchant Expansion / 多样店型扩展

新增六家平台小店不再统一使用食物摄影头图。山茶牛肉面馆和南风椰香咖喱继续需要真实菜品封面；莓果晨光、青禾鲜食补给站、早安贝果咖啡、榆树里蒸点铺改为透明 PNG 店铺 Logo，以便首页同时出现食物摄影、品牌标志和店型渐变三种视觉语言。

食物摄影主图：

| 文件名                          | 店铺         | 主体建议                             |
| ------------------------------- | ------------ | ------------------------------------ |
| `merchant-noodle-house-01.png`  | 山茶牛肉面馆 | 山茶一号红烧宽面、青菜和少量店制辣油 |
| `merchant-coconut-curry-01.png` | 南风椰香咖喱 | 南风一号椰香鸡、茉莉香米和东南亚香草 |

食物摄影统一生成提示：

```text
中文：真实商业食物摄影，用于手机外卖平台小店卡片，主体食物清晰并占据画面中心，明亮自然的餐厅光线，干净但有生活感的桌面，适合横向 3:2 裁切，高级但不过度摆拍，不要文字，不要品牌 logo，不要水印，PNG。

English: Realistic commercial food photography for a mobile delivery merchant card, clearly recognizable food centered in frame, bright natural restaurant light, clean lived-in tabletop, composed for a horizontal 3:2 crop, premium but not overly staged, no text, no brand logo, no watermark, PNG.
```

店铺 Logo 统一目录：

```text
public/images/ui-assets/apps/food-delivery/platform/merchants/logos/
```

| 文件名                               | 店铺           | 品牌图形方向                             |
| ------------------------------------ | -------------- | ---------------------------------------- |
| `merchant-logo-berry-morning-01.png` | 莓果晨光       | 莓果、晨光弧线与酸奶旋纹组成的轻甜标志   |
| `merchant-logo-green-basket-01.png`  | 青禾鲜食补给站 | 青禾嫩芽与补给篮结合的社区便利标志       |
| `merchant-logo-morning-bagel-01.png` | 早安贝果咖啡   | 贝果圆环、晨日与咖啡杯负形组成的早餐标志 |
| `merchant-logo-elm-dim-sum-01.png`   | 榆树里蒸点铺   | 榆树叶、竹蒸笼与蒸汽线条组成的街坊标志   |

```text
中文：用于手机外卖平台小店头图的独立品牌 Logo，单一清晰图形标志，透明背景，轮廓简洁但有品牌记忆点，适合横向卡片中居中留白展示，也能在 48px 尺寸识别，使用对应店铺的食物或器物意象，不要可读店名，不要英文字母，不要价格，不要 UI 卡片，不要水印，带 alpha 透明通道的 PNG，建议源图 768x768。

English: Standalone brand logo for a mobile food-delivery merchant cover, one clear memorable symbol on a transparent background, simple distinctive silhouette, designed for centered whitespace in a horizontal card and readable at 48px, using food or object cues specific to the merchant, no readable shop name, no letters, no price, no UI card, no watermark, PNG with alpha, suggested source size 768x768.
```

这四张 Logo 也作为订单列表的商家身份图使用，不再另外生成同店的订单小图。

### Platform Menu Product Pack / 平台菜单产品图组

Food Platform 的 11 家小店各有 5 道菜，共需 `55` 张方形产品图。页面已经为每道菜预留 `64x64px` 稳定槽位；正式 PNG 缺失时显示高对比诊断占位图，并在 DOM 上保留完整 `data-required-asset` 路径。

统一目录：

```text
public/images/ui-assets/apps/food-delivery/platform/menus/
```

建议源图 `768x768`，主体适合方形和小尺寸裁切，同一家店保持餐具、光线与背景语言一致。每个目录固定使用 `menu-item-01.png` 到 `menu-item-05.png`，顺序与页面菜单一致。

| 商户目录            | 菜品 01–05                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `hanwoo-gukbap/`    | 逆站洞一号韩牛汤饭；泡菜红锅·双人份；清晨雪浓汤定食；逆站洞醒酒辣汤；海风泡菜煎饼              |
| `sushi-hana/`       | 花见十二贯；小町炸猪排便当；海风亲子散寿司；暮色炙鳗牛油果卷；赤味噌蛤蜊汤                     |
| `hwadeok-pizza/`    | 花德蜂蜜双芝士；周五半半鸡翅篮；炉边番茄罗勒；红椒烟熏辣肠；花德玉米焗薯                       |
| `salad-day/`        | 日记 No.1 牛油果鸡胸碗；今日莓果酸奶罐；海岸线三文鱼谷物碗；烤南瓜暖汤午餐组；青柠冰摇气泡美式 |
| `chicken-crisp/`    | 脆脆 50/50 半半鸡；金瀑芝士厚切薯；黑蒜无骨鸡块；辣年糕串串；蜂蜜黄油脆薯角                    |
| `berry-morning/`    | 晨光莓莓云朵杯；绿野牛油果鲜果碗；开心果晨曦巴斯克；南岛芒果椰露；草莓初光可颂                 |
| `green-basket/`     | 青禾今日蔬果箱；06:30 早餐补给；绿能一日轻食箱；深夜灯火补给包；厨房 SOS 调味组                |
| `camellia-noodles/` | 山茶一号红烧宽面；桂香番茄鸡蛋拌面；老街豌杂细面；山茶酸汤肥牛米线；秘制红油抄手               |
| `morning-bagel/`    | GOOD AM 烟熏鸡贝果；晨盐焦糖拿铁；绿意煎蛋贝果；早安苹果肉桂司康；柚光冰摇美式                 |
| `elm-dim-sum/`      | 榆树里虾仁三拼；十八褶鲜肉小笼；金沙流心奶黄包；荷香腊味糯米鸡；巷口咸豆浆油条                 |
| `coconut-curry/`    | 南风一号椰香鸡；槟城咖喱虾饭；青罗勒绿咖喱牛；南风冬阴功海鲜汤；斑斓椰奶小布丁                 |

统一生成提示：

```text
中文：方形真实商业食物摄影，用于手机外卖菜单产品缩略图，单份菜品清晰居中，主体占画面约 75%，边缘保留安全区，光线明亮自然，食物细节真实诱人，背景简洁且符合对应店铺气质，适合在 64px 尺寸识别，不要文字，不要价格，不要品牌 logo，不要水印，PNG。

English: Square realistic commercial food photography for a mobile delivery menu thumbnail, one dish clearly centered and filling about 75% of the frame, safe padding around edges, bright natural light, realistic appetizing detail, simple background matching the merchant identity, readable at 64px, no text, no price, no brand logo, no watermark, PNG.
```

## 3. Moon Bistro Assets / Moon Bistro 素材

Moon Bistro 是第一个特色小店 mini app，定位为现代高端餐厅。它可以保留比平台首页更暗、带烛光层次的视觉气质，但不要表达深夜营业、夜宵或夜间小酒馆；食物必须清楚、精致、好吃且可识别。

### Moon Bistro Shop Cover / 店铺封面

建议尺寸：`1200x600`。

```text
中文：现代高端餐厅店铺封面，深色优雅餐桌布景，温暖烛光层次，黑色陶瓷餐盘，克制的月光蓝色高光，精致从容的主厨晚餐氛围，可以看到几道摆盘考究的料理但不要拥挤，电影感但清晰，不表现深夜、夜宵或酒馆标签，外卖店铺封面图，不要文字，不要 logo，不要水印，PNG。

English: Modern fine-dining shop cover photo, dark elegant table setting, layered warm candlelight, black ceramic plates, restrained moonlit-blue highlights, composed chef-led dinner atmosphere, a few precisely plated dishes visible but not crowded, cinematic but clear, no late-night, night-snack, or pub cues, delivery app shop cover image, no text, no logo, no watermark, PNG.
```

### Moon Bistro Dish: Signal Soup / 菜品：Signal Soup

建议尺寸：`1024x1024`。

```text
中文：方形真实食物照片，用于深色小酒馆菜单卡片，一碗浓郁奶油汤装在深色陶瓷碗中，香草点缀，柔和热气，旁边有小块烤面包，情绪化餐厅灯光但食物细节清晰诱人，居中构图，适合圆形裁切，不要文字，不要 logo，不要水印，PNG。

English: Square realistic food photo for a dark bistro menu card, rich creamy soup in a dark ceramic bowl, herbs, soft steam, small toasted bread on the side, moody restaurant lighting with clear appetizing detail, centered for circular crop, no text, no logo, no watermark, PNG.
```

### Moon Bistro Dish: Lunar Rice Set / 菜品：Lunar Rice Set

```text
中文：方形真实食物照片，用于深色小酒馆菜单卡片，优雅米饭套餐，包含烤肉、鸡蛋、腌菜、小酱碟，放在深色陶瓷托盘上，温暖高光和月光蓝色阴影，居中构图，适合圆形裁切，不要文字，不要 logo，不要水印，PNG。

English: Square realistic food photo for a dark bistro menu card, elegant rice set with grilled meat, egg, pickled vegetables, small sauce bowls, dark ceramic tray, warm highlights and moonlit blue shadows, centered for circular crop, no text, no logo, no watermark, PNG.
```

### Moon Bistro Dish: Orbit Pasta / 菜品：Orbit Pasta

```text
中文：方形真实食物照片，用于现代高端餐厅的深色菜单卡片，浅口黑碗里的松露奶油意面，面条呈轻微旋涡状，蘑菇、香草、帕玛森芝士点缀，精致圆形摆盘，柔和烛光餐厅照明，居中构图，适合圆形裁切，不要文字，不要 logo，不要水印，PNG。

English: Square realistic food photo for a modern fine-dining dark menu card, truffle cream pasta twirled in a shallow black bowl, mushrooms, herbs, parmesan, precise circular plating, soft candlelit restaurant lighting, centered for circular crop, no text, no logo, no watermark, PNG.
```

### Moon Bistro Dish: Midnight Dessert / 菜品：Midnight Dessert

```text
中文：方形真实食物照片，用于现代高端餐厅的深色菜单卡片，小份巧克力甜点，莓果酱和奶油点缀，黑色餐盘，柔和烛光高光，克制精致的主厨甜点氛围，居中构图，适合圆形裁切，不要文字，不要 logo，不要水印，PNG。

English: Square realistic food photo for a modern fine-dining dark menu card, small chocolate dessert with berry sauce and cream, black plate, soft candle-like highlight, restrained chef-dessert mood, centered for circular crop, no text, no logo, no watermark, PNG.
```

## 4. Category Icon PNGs / 分类图标 PNG

用途：如果想把平台分类从字体图标升级为更有质感的图片图标，可以生成这一组。

建议尺寸：`512x512`，透明底。

当前素材状态（2026-07-24）：

- 仓库里已有 `source-sheets/food-category-icon-sheet-01.png`、`source-sheets/food-category-icon-sheet-02.png` 和两张 `category-rice-bowl-*.png`；
- 这些文件都是 RGB PNG（color type 2），没有 alpha 透明通道，透明棋盘格已经烘入像素，不能直接作为首页小图标；
- 首页当前继续使用 Font Awesome 图标兜底，并在每个图标槽位上通过 `data-required-asset` 标注下面 10 个目标文件名；
- 后续生成或切图时必须输出真正带 alpha 的独立 PNG，不要把整张 3x5 源图直接裁成仍带棋盘底的方块。

目标目录：`public/images/ui-assets/apps/food-delivery/platform/categories/icons/`

统一图标风格：

```text
中文：可爱精致的 3D 外卖 App 分类图标，物体居中，透明背景，柔和投影，细节清晰，友好的韩系移动 App 风格，不要文字，不要 logo，不要水印，带 alpha 透明通道的 PNG。

English: Cute polished 3D food delivery app category icon, object centered, transparent background, soft shadow, high detail, friendly Korean mobile app style, no text, no logo, no watermark, PNG with alpha.
```

### All / 全部

```text
中文：可爱精致的 3D 放大镜图标，放大镜内部有很小的食物符号，青绿色点缀，居中，透明背景，柔和投影，不要文字，不要 logo，带 alpha 透明通道的 PNG。

English: Cute polished 3D magnifying glass with tiny food symbols inside, teal accent, centered transparent background, soft shadow, no text, no logo, PNG with alpha.
```

### Meal / 正餐

```text
中文：可爱精致的 3D 正餐套餐图标，米饭碗、汤碗和筷子，暖橙色点缀，居中，透明背景，柔和投影，不要文字，不要 logo，带 alpha 透明通道的 PNG。

English: Cute polished 3D meal set icon, rice bowl with soup and chopsticks, warm orange accent, centered transparent background, soft shadow, no text, no logo, PNG with alpha.
```

### Fast Food / 快餐

```text
中文：可爱精致的 3D 汉堡和薯条图标，金黄和橙色点缀，居中，透明背景，柔和投影，不要文字，不要 logo，带 alpha 透明通道的 PNG。

English: Cute polished 3D burger and fries icon, golden and orange accent, centered transparent background, soft shadow, no text, no logo, PNG with alpha.
```

### Cafe Light Food / 咖啡轻食

```text
中文：可爱精致的 3D 冰咖啡杯和小沙拉碗图标，薄荷绿色点缀，居中，透明背景，柔和投影，不要文字，不要 logo，带 alpha 透明通道的 PNG。

English: Cute polished 3D iced coffee cup with small salad bowl, mint green accent, centered transparent background, soft shadow, no text, no logo, PNG with alpha.
```

### Dessert / 甜品

```text
中文：可爱精致的 3D 甜品图标，冰淇淋甜筒和小蛋糕切片，粉色点缀，居中，透明背景，柔和投影，不要文字，不要 logo，带 alpha 透明通道的 PNG。

English: Cute polished 3D dessert icon, ice cream cone and small cake slice, pink accent, centered transparent background, soft shadow, no text, no logo, PNG with alpha.
```

### Fried Chicken / 炸鸡

```text
中文：可爱精致的 3D 金黄炸鸡桶图标，酥脆鸡块清晰可见，暖黄色点缀，居中，透明背景，柔和投影，不要文字，不要 logo，带 alpha 透明通道的 PNG。

English: Cute polished 3D golden fried chicken bucket icon, crisp chicken pieces clearly visible, warm yellow accent, centered transparent background, soft shadow, no text, no logo, PNG with alpha.
```

### Pizza / 披萨

```text
中文：可爱精致的 3D 披萨切片图标，芝士、番茄和少量罗勒清晰可见，红橙色点缀，居中，透明背景，柔和投影，不要文字，不要 logo，带 alpha 透明通道的 PNG。

English: Cute polished 3D pizza slice icon with visible cheese, tomato, and a little basil, red-orange accent, centered transparent background, soft shadow, no text, no logo, PNG with alpha.
```

### Grocery / 生鲜

```text
中文：可爱精致的 3D 生鲜购物篮图标，篮中有绿叶菜、番茄、牛奶和面包，清新绿色点缀，居中，透明背景，柔和投影，不要文字，不要 logo，带 alpha 透明通道的 PNG。

English: Cute polished 3D grocery basket icon with leafy greens, tomato, milk, and bread, fresh green accent, centered transparent background, soft shadow, no text, no logo, PNG with alpha.
```

### Noodles / 面食

```text
中文：可爱精致的 3D 热汤面碗图标，面条、青菜、鸡蛋和少量葱花清晰可见，暖红色点缀，居中，透明背景，柔和投影，不要文字，不要 logo，带 alpha 透明通道的 PNG。

English: Cute polished 3D hot noodle bowl icon with noodles, greens, egg, and scallion, warm red accent, centered transparent background, soft shadow, no text, no logo, PNG with alpha.
```

### Sushi / 寿司

```text
中文：可爱精致的 3D 寿司小拼盘图标，三文鱼握寿司和一枚寿司卷，清爽蓝绿色点缀，居中，透明背景，柔和投影，不要文字，不要 logo，带 alpha 透明通道的 PNG。

English: Cute polished 3D small sushi platter icon with salmon nigiri and one maki roll, fresh blue-teal accent, centered transparent background, soft shadow, no text, no logo, PNG with alpha.
```

## 5. Transparent Decorative PNGs / 透明装饰 PNG

用途：用于平台 banner、空状态、未来店铺页面的小装饰，增强外卖应用的生活感和沉浸感。

建议尺寸：`1024x1024`，透明底。

### Delivery Rider Variant / 外卖骑手变体

```text
中文：可爱的 3D 外卖骑手骑着青绿色电动车，韩系外卖 App 吉祥物风格，圆润友好的角色，青绿色头盔，外卖箱，侧面视角，透明背景，柔和投影，细节清晰，不要文字，不要 logo，不要水印，带 alpha 透明通道的 PNG。

English: Cute 3D delivery rider on teal scooter, Korean food delivery app mascot style, friendly round character, teal helmet, delivery box, side view, transparent background, soft shadow, high detail, no text, no logo, no watermark, PNG with alpha.
```

### Free Delivery Coupon / 免配送优惠券

```text
中文：精致的 3D 外卖优惠券票券，青绿色和白色配色，少量闪光装饰，透明背景，柔和投影，不要可读文字，不要 logo，不要水印，带 alpha 透明通道的 PNG。

English: Polished 3D delivery coupon ticket, teal and white, small sparkle accents, transparent background, soft shadow, no readable text, no logo, no watermark, PNG with alpha.
```

### Takeout Bag / 外卖袋

```text
中文：可爱精致的 3D 外卖纸袋，只带一个简单笑脸符号，青绿色点缀，透明背景，柔和投影，不要文字，不要 logo，不要水印，带 alpha 透明通道的 PNG。

English: Cute polished 3D takeout paper bag with smiley face symbol only, teal accent, transparent background, soft shadow, no text, no logo, no watermark, PNG with alpha.
```

### Receipt And Heart / 小票和爱心

```text
中文：可爱精致的 3D 外卖小票和小爱心图标，青绿色和暖色点缀，透明背景，柔和投影，不要可读文字，不要 logo，不要水印，带 alpha 透明通道的 PNG。

English: Cute polished 3D food delivery receipt with small heart icon, teal and warm accent, transparent background, soft shadow, no readable text, no logo, no watermark, PNG with alpha.
```

## 6. Platform Order Flow PNG Pack / 平台订单流程 PNG 组

用途：替换结算页、订单列表和订单详情里已经预留好的稳定素材位。所有待补位置当前统一显示高对比诊断占位图，便于在页面中直接发现；新素材交付后再逐项接入。

诊断占位图：

```text
public/images/ui-assets/apps/food-delivery/platform/diagnostics/missing-asset-placeholder.svg
```

该图不是正式美术资源。任何 Food Delivery 图片真实加载失败时也会自动切换到它，并在 DOM 上标记 `data-asset-missing="true"`；正式资源不得覆盖或沿用这张诊断图的视觉风格。

统一目录：

```text
public/images/ui-assets/apps/food-delivery/platform/orders/
```

统一要求：

- 状态 Hero 和空状态素材使用透明背景 PNG，建议源图 `1024x1024`；主体四周保留约 12% 安全区。
- 结算装饰实际显示约 `104x104px`，订单状态 Hero 实际显示约 `112x112px`，空订单插图实际显示约 `128x112px`。
- 不含文字、价格、品牌 Logo、UI 边框、手机外框或整块背景色；不要让主体投影超出画布。
- 保持现有 Food Platform 的青绿、白色和少量暖色点缀。取消/延误状态可以使用克制的珊瑚红或琥珀色，但不要改变全局配色。

### Required Core Assets / 必须准备

| 文件名                                    | 对应素材位                         | 内容建议                                         | 当前回退                   |
| ----------------------------------------- | ---------------------------------- | ------------------------------------------------ | -------------------------- |
| `platform-checkout-takeout-bag-01.png`    | `platform-checkout-takeout-bag`    | 封好的外卖袋、餐盒与小票，主体偏右，轮廓简洁     | 诊断占位图                 |
| `platform-order-status-placed-01.png`     | `platform-order-status-placed`     | 小票、确认勾和刚封好的餐袋                       | 诊断占位图                 |
| `platform-order-status-preparing-01.png`  | `platform-order-status-preparing`  | 厨房出餐台、蒸汽餐盒或厨师帽，不出现真人品牌制服 | 诊断占位图                 |
| `platform-order-status-delivering-01.png` | `platform-order-status-delivering` | 骑手与青绿色电动车，方向朝右                     | 诊断占位图                 |
| `platform-order-status-delivered-01.png`  | `platform-order-status-delivered`  | 门口餐袋、完成勾与温和庆祝元素                   | 诊断占位图                 |
| `platform-order-status-cancelled-01.png`  | `platform-order-status-cancelled`  | 收起的餐袋、小票与克制取消符号                   | 诊断占位图                 |
| `platform-order-status-delayed-01.png`    | 未来延误状态位                     | 骑手、时钟和小范围琥珀色提醒                     | 暂未显示，留给后续订单事件 |
| `platform-orders-empty-receipt-01.png`    | `platform-orders-empty-receipt`    | 空白小票、餐叉和轻微爱心点缀                     | 诊断占位图                 |

统一生成提示：

```text
中文：SchatPhone Food Platform 订单流程状态插图，可爱但克制的精致 3D 商业插画，青绿色、白色与少量暖色点缀，主体居中且轮廓清楚，透明背景，柔和短投影，适合在手机外卖订单页以 112px 尺寸显示，高细节但不要拥挤，不要文字，不要价格，不要品牌 logo，不要水印，不要 UI 卡片，不要手机边框，带 alpha 透明通道的 PNG。

English: SchatPhone Food Platform order-flow status illustration, polished restrained 3D commercial style, teal and white with small warm accents, centered clearly readable subject, transparent background, soft compact shadow, designed to remain clear at 112px in a mobile delivery order page, detailed but uncluttered, no text, no price, no brand logo, no watermark, no UI card, no phone frame, PNG with alpha.
```

### Optional Merchant Marks / 可选商家身份小图

目录建议：

```text
public/images/ui-assets/apps/food-delivery/platform/orders/merchant-marks/
```

建议源图 `512x512`、透明背景，实际显示 `48x48px`。图形只做商家身份识别，不放可读店名。这里只需为仍以食物摄影作为主图的七家店生成订单身份小图；另外四家直接复用上方店铺 Logo。

```text
platform-merchant-mark-hanwoo-01.png
platform-merchant-mark-sushi-hana-01.png
platform-merchant-mark-hwadeok-pizza-01.png
platform-merchant-mark-salad-day-01.png
platform-merchant-mark-chicken-crisp-01.png
platform-merchant-mark-camellia-noodles-01.png
platform-merchant-mark-coconut-curry-01.png
```

当前订单列表会在这些素材缺失时显示诊断占位图。莓果晨光、青禾鲜食补给站、早安贝果咖啡和榆树里蒸点铺的订单身份图改为复用 `platform/merchants/logos/` 下的四张 Logo，避免为同一品牌重复准备两套标志。

## 5. Peach Cloud Independent App / Peach Cloud 独立店 App

Peach Cloud 使用 Iron Grey `#444545`、Jet Black `#2B303A`、浅绿 `#F2FBE0`、Petal Rouge `#FD6C93` 和 Pink Mist `#FDA1B8` 建立独立品牌感。浅绿承担大面积背景，深灰承担正文与固定导航，高饱和粉只用于主要操作和选中状态，粉雾用于顶栏与辅助层；`#FD6C93` 上使用 Jet Black 文字，不使用小号白字。它不是 Food Platform 内部商户，也不复用 Moon Bistro 的暗色图片。精确 Figma 首页节点 `47:23` 提供原始信息架构依据，当前视觉在该结构上完成桃子云自己的品牌刷新。运行时正式素材共 `26` 个：`20` 张 PNG 和 `6` 个 SVG；目录额外保留 `5` 个未被桃子云引用的原版分类 SVG，便于其他店铺复用。页面保留稳定路径与 `data-required-asset`，文件加载失败时显示共享诊断占位图。

可供人工修图的生成母版保存在 `output/imagegen/peach-cloud-refresh/ads/` 与 `output/imagegen/peach-cloud-refresh/products/`；产品目录同时保留高分辨率原图、正式 `768x768` 版本和一张套图预览。页面运行只依赖 `public/images/ui-assets/apps/food-delivery/peach-cloud/` 中的正式资源，不依赖 `output/` 母版或 `tmp/imagegen/` 中的 CLI 请求清单。

### Asset Contract / 素材合同

```text
public/images/ui-assets/apps/food-delivery/peach-cloud/
├─ cover/peach-cloud-hero-01.png
├─ brand/peach-cloud-mark-01.svg
├─ categories/
│  ├─ peach-cloud-fresh-fruit.svg
│  ├─ peach-cloud-frozen-treat.svg
│  ├─ peach-cloud-tea-coffee.svg
│  ├─ peach-cloud-warm-bakes.svg
│  ├─ peach-cloud-seasonal-pick.svg
│  ├─ vegan.svg
│  ├─ dessert.svg
│  ├─ drinks.svg
│  ├─ snacks.svg
│  └─ meal.svg
├─ promotions/
│  ├─ peach-cloud-golden-pairing-01.png
│  └─ peach-cloud-weekly-drop-01.png
└─ products/
   ├─ peach-cloud-item-01.png
   ├─ peach-cloud-item-02.png
   ├─ peach-cloud-item-03.png
   ├─ peach-cloud-item-04.png
   ├─ peach-cloud-item-05.png
   ├─ peach-cloud-item-06.png
   ├─ peach-cloud-item-07.png
   ├─ peach-cloud-item-08.png
   ├─ peach-cloud-item-09.png
   ├─ peach-cloud-item-10.png
   ├─ peach-cloud-item-11.png
   ├─ peach-cloud-item-12.png
   ├─ peach-cloud-item-13.png
   ├─ peach-cloud-item-14.png
   ├─ peach-cloud-item-15.png
   ├─ peach-cloud-item-16.png
   └─ peach-cloud-item-17.png
```

| 文件                                                | 内容                                                                          | 建议源尺寸 / 裁切                                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `cover/peach-cloud-hero-01.png`                     | 白桃气泡饮、桃子云吉祥物与云朵场景，用于全宽品牌 Hero                         | `1536x1024`；右侧主体清晰，左侧保留英文品牌文案安全区                                                   |
| `promotions/peach-cloud-golden-pairing-01.png`      | 白桃气泡饮与桃子芝士蛋糕，用于 `30% OFF` 活动                                 | `1536x1024`；主体居中偏右，左侧适配半透明促销文案压盖                                                   |
| `promotions/peach-cloud-weekly-drop-01.png`         | 白桃饮品、甜点与云桃吉祥物，用于 New 页周更品牌画面                           | `1536x1024`；主体集中在右半区，左侧保留大标题安全区                                                     |
| `brand/peach-cloud-mark-01.svg`                     | 白桃、云顶、绿色叶片与表情组成的独立品牌标志                                  | 原生 `48x48` 矢量，适合小尺寸店铺栏与文件夹入口                                                         |
| `categories/peach-cloud-*.svg`                      | Fresh Fruit、Frozen、Tea & Coffee、Bakes、Seasonal 五个桃子云专属 IP 分类插画 | 统一 `38x38` 画布、透明背景和圆润彩色线稿；Fresh Fruit 同时表达桃子、柑橘与果实，不绑定单一果味或气泡水 |
| `categories/{vegan,dessert,drinks,snacks,meal}.svg` | 原版五枚通用分类标记，桃子云不再引用，保留给其他店铺复用                      | 保持原文件内容与原路径，不纳入桃子云 `26` 个运行时正式素材计数                                          |
| `products/peach-cloud-item-01.png`                  | White Peach Lime Sparkler                                                     | `768x768`；白桃、青柠与薄荷气泡饮                                                                       |
| `products/peach-cloud-item-02.png`                  | Roasted Peach Oolong Cloud                                                    | `768x768`；白桃烘焙乌龙与厚云顶                                                                         |
| `products/peach-cloud-item-03.png`                  | Peach Cocoa Brownie                                                           | `768x768`；桃片奶油可可布朗尼                                                                           |
| `products/peach-cloud-item-04.png`                  | White Peach Macaron Parade                                                    | `768x768`；多色白桃马卡龙拼盘                                                                           |
| `products/peach-cloud-item-05.png`                  | Yuzu Peach Spark Pop                                                          | `768x768`；柚子白桃气泡饮                                                                               |
| `products/peach-cloud-item-06.png`                  | Peach Cocoa Crepe Cloud                                                       | `768x768`；可可薄饼与白桃奶油                                                                           |
| `products/peach-cloud-item-07.png`                  | Peach Macaron Milk Ice                                                        | `768x768`；白桃酱牛奶冰与马卡龙                                                                         |
| `products/peach-cloud-item-08.png`                  | Peach Cold Brew Tonic                                                         | `768x768`；白桃冷萃汤力饮                                                                               |
| `products/peach-cloud-item-09.png`                  | Peach Strawberry Cloud Slice                                                  | `768x768`；白桃草莓云朵芝士蛋糕                                                                         |
| `products/peach-cloud-item-10.png`                  | Peach Cocoa Crepe Sundae                                                      | `768x768`；白桃可可薄饼圣代                                                                             |
| `products/peach-cloud-item-11.png`                  | Black Tea Peach Creme                                                         | `768x768`；红茶白桃奶油饮                                                                               |
| `products/peach-cloud-item-12.png`                  | Golden Peach Cheesecake Pairing                                               | `768x768`；白桃气泡饮与桃子芝士蛋糕组合                                                                 |
| `products/peach-cloud-item-13.png`                  | Green Grape Jasmine Fruit Tea                                                 | `768x768`；青提、茉莉花与清透茉莉鲜果茶                                                                 |
| `products/peach-cloud-item-14.png`                  | Mango Passionfruit Yogurt                                                     | `768x768`；芒果厚酸奶与百香果果肉旋纹                                                                   |
| `products/peach-cloud-item-15.png`                  | Strawberry Peach Fruit Milk                                                   | `768x768`；草莓、白桃果肉与柔滑鲜果乳                                                                   |
| `products/peach-cloud-item-16.png`                  | Waxberry Lychee Iced Tea                                                      | `768x768`；杨梅、去壳荔枝与红宝石色冰茶                                                                 |
| `products/peach-cloud-item-17.png`                  | Osmanthus Pear Warm Infusion                                                  | `768x768`；桂花、雪梨片与清透暖饮                                                                       |

Visible product copy is locale-aware even though these stable asset filenames and English generation subjects remain unchanged. Built-in UX defaults to Chinese and retains accurate English; approved English brand-advertising copy can remain fixed. Every future retouch or replacement must keep category, product copy, ingredients, image subject, and alternative text semantically aligned in both languages.

### Delivered Menu Expansion / 已交付菜单扩展

The formal pack and runtime now contain 17 items. Fresh Fruit expands from `2` to `5` and Seasonal from `1` to `3` through these delivered bilingual products and stable asset paths:

- `peach-cloud-item-13.png`: `青提茉莉鲜果茶 / Green Grape Jasmine Fruit Tea`, `¥28.00`
- `peach-cloud-item-14.png`: `芒果百香厚酸奶 / Mango Passionfruit Yogurt`, `¥32.00`
- `peach-cloud-item-15.png`: `草莓白桃鲜果乳 / Strawberry Peach Fruit Milk`, `¥30.00`
- `peach-cloud-item-16.png`: `杨梅荔枝冰茶 / Waxberry Lychee Iced Tea`, `¥29.00`
- `peach-cloud-item-17.png`: `桂花雪梨暖饮 / Osmanthus Pear Warm Infusion`, `¥27.00`

The high-resolution editable masters and `768x768` accepted copies stay under `output/imagegen/peach-cloud-refresh/products/`; runtime uses only the corresponding files under `public/`. The reproducible CLI requests are recorded in `tmp/imagegen/peach-cloud-menu-expansion.jsonl`. This delivered content slice does not introduce automatic seasonal dates or availability rules.

### Hero Prompt / 主图提示词

```text
中文：为虚构甜饮品牌 Peach Cloud 创作精致的横向品牌广告画面。主体是一个圆润的白桃 IP：清晰桃形与中央桃缝、柔软云朵奶油帽、两颗深灰圆点眼睛、温和微笑和一片深绿色桃叶；旁边只搭配一杯浅粉白桃气泡饮和柔软云顶。场景使用浅绿、花瓣粉、粉雾、白色与少量深灰的抽象圆弧、云朵纸艺和气泡，明亮高调、触感精致、友好但不过度儿童化。3:2 横向构图，吉祥物和饮品集中在中部偏右，左侧保留稳定的英文品牌文案安全区；不要可读文字、字母、价格、UI、水印或现实品牌标志。

English: Create a polished 3:2 landscape brand campaign image for the fictional Peach Cloud dessert-drinks shop. Show its signature IP character: a small plump white-peach mascot with a rounded peach silhouette and central cleft, soft cloud-cream cap, two tiny charcoal dot eyes, gentle smile, and one dark-green peach leaf. Pair it with one elegant pale-blush white-peach sparkling drink topped with a soft cream cloud. Use an airy dessert-studio set with pale green #F2FBE0, petal rouge #FD6C93, pink mist #FDA1B8, fresh white, restrained charcoal #2B303A, abstract peach arcs, rounded cloud forms, bubbles, and tactile paper-cut depth. Keep the mascot and drink in the middle-right and preserve stable space on the left for code-rendered English brand copy. No readable text, letters, prices, UI, watermark, or real brand marks.
```

### Campaign Prompts / 活动图提示词

`peach-cloud-golden-pairing-01.png`：只展示一杯浅金白桃气泡饮和一块带饼干底、桃蜜淋面的白桃芝士蛋糕，桃子云吉祥物仅作为小型陪衬。主体集中在中部偏右，左侧必须在半透明粉色文案层压盖后仍保留清晰产品露出；不要文字、折扣数字、价格或额外甜点。

`peach-cloud-weekly-drop-01.png`：让桃子云吉祥物从云朵后探出，与新鲜白桃、一杯粉色桃子气泡饮和一份小型桃子奶油甜点组成季节上新画面。主体集中在右半区，左侧保留大标题安全区；强调周更与新鲜感，不表现折扣，不要文字、价格、UI 或现实品牌。

### Product Pack Prompt / 产品图组提示词

每张图只生成表格中对应的一项产品，保持同一套 Pink Mist 到浅绿背景、清爽浅色台面、柔和短投影和明亮自然光。

```text
中文：Peach Cloud 虚拟甜饮品牌的方形产品摄影，用于手机外卖 App 双列商品卡片。单份指定饮品或甜点清晰居中，占画面约 78%，Pink Mist `#FDA1B8` 到浅绿 `#F2FBE0` 的干净背景，允许极少量 Petal Rouge `#FD6C93` 点缀，明亮自然的甜品店光线，真实食物质感，柔和短投影，边缘保留裁切安全区，整体精致、轻快、有品牌一致性，适合在 150px 卡片和大图详情中显示，不要可读文字，不要价格，不要 logo，不要 UI 卡片，不要餐具杂物，不要人物，不要水印，768x768 PNG。

English: Square product photography for the virtual Peach Cloud drinks-and-desserts brand, used in a two-column mobile delivery menu. Show only the specified drink or dessert, clearly centered and filling about 78% of the frame, clean Pink Mist #FDA1B8 to pale green #F2FBE0 backdrop with only small Petal Rouge #FD6C93 accents, bright natural dessert-counter lighting, realistic appetizing texture, soft compact shadow, safe crop padding, polished cheerful and consistent across the set, readable both in a 150px card and a large detail view, no readable text, no price, no logo, no UI card, no cluttered tableware, no people, no watermark, 768x768 PNG.
```

### Brand Mark Prompt / 品牌图形提示词

```text
中文：Peach Cloud 甜饮品牌的独立 48px 矢量标志，不含文字。用 Pink Mist `#FDA1B8` 白桃外形作为主体，顶部叠加浅绿 `#F2FBE0` 云朵奶油帽和一片绿色桃叶，以 Jet Black `#2B303A` 描边、圆点眼睛和温和微笑建立清晰表情，并用 Petal Rouge `#FD6C93` 中线强化桃形。轮廓在 20px 到 48px 仍需清楚，不加入杯子、吸管、字母、店名、价格、投影、UI 卡片或水印。

English: Standalone 48px vector mark for the Peach Cloud dessert-drinks brand with no text. Use a Pink Mist #FDA1B8 white-peach silhouette as the body, topped with a pale-green #F2FBE0 cloud-cream cap and one green peach leaf. Jet Black #2B303A outlines, dot eyes, and a gentle smile create the face; a Petal Rouge #FD6C93 center seam reinforces the peach silhouette. Keep it legible from 20px to 48px. No cup, straw, letters, shop name, price, shadow, UI card, or watermark.
```

## 7. Dash Grill Independent App / Dash Grill 独立快餐 App

Dash Grill 是原创连锁快餐概念，视觉使用 Tomato Red `#E33D2E`、Mustard Yellow `#FFC833`、Paper `#FFF9EC` 和 Ink `#201A17`。它可以传达高频套餐、汉堡、炸鸡和奶昔的快节奏消费感，但不得使用麦当劳或其他现实品牌的名称、拱门、吉祥物、制服、包装、门店照片或可识别商标。

下列 `11` 张正式 PNG 已交付到稳定运行时路径，并完成桌面 Chromium 与模拟 Pixel 5 的 Home、Menu、Bag 和 Detail 页面验收；未发现诊断占位、横向溢出或页面错误。CLI 请求、候选母版、联系表和接受记录保存在 `output/imagegen/dash-grill/`，运行时只依赖 `public/images/ui-assets/apps/food-delivery/dash-grill/`。

### Asset Contract / 素材合同

```text
public/images/ui-assets/apps/food-delivery/dash-grill/
├─ cover/dash-grill-cover-01.png
└─ products/
   ├─ dash-grill-item-01.png
   ├─ dash-grill-item-02.png
   ├─ dash-grill-item-03.png
   ├─ dash-grill-item-04.png
   ├─ dash-grill-item-05.png
   ├─ dash-grill-item-06.png
   ├─ dash-grill-item-07.png
   ├─ dash-grill-item-08.png
   ├─ dash-grill-item-09.png
   └─ dash-grill-item-10.png
```

| 文件                              | 菜品 / 用途                         | 建议尺寸与构图                                 |
| --------------------------------- | ----------------------------------- | ---------------------------------------------- |
| `cover/dash-grill-cover-01.png`   | 品牌首页 Hero，汉堡、薯条与饮品组合 | `1200x750`；主体在中右侧，左侧留深色文案安全区 |
| `products/dash-grill-item-01.png` | Dash Double Stack                   | `768x768`；双层牛肉汉堡                        |
| `products/dash-grill-item-02.png` | Golden Chicken Stack                | `768x768`；金黄脆鸡汉堡                        |
| `products/dash-grill-item-03.png` | Smoky BBQ Stack                     | `768x768`；烟熏芝士烧烤汉堡                    |
| `products/dash-grill-item-04.png` | Classic Cheeseburger                | `768x768`；经典单层芝士汉堡                    |
| `products/dash-grill-item-05.png` | Crisp Chicken Tenders               | `768x768`；五条脆鸡与一份蘸酱                  |
| `products/dash-grill-item-06.png` | Sea-Salt Fries                      | `768x768`；细切海盐薯条                        |
| `products/dash-grill-item-07.png` | Loaded Cheese Fries                 | `768x768`；芝士酱、葱与烟熏碎料薯条            |
| `products/dash-grill-item-08.png` | Garden Crunch Wrap                  | `768x768`；烤鸡蔬菜卷饼                        |
| `products/dash-grill-item-09.png` | Vanilla Cloud Shake                 | `768x768`；香草奶昔与柔软奶油顶                |
| `products/dash-grill-item-10.png` | Choco Swirl Sundae                  | `768x768`；巧克力旋纹香草圣代                  |

### Cover Prompt / 封面提示词

```text
中文：原创虚拟连锁快餐品牌 Dash Grill 的横向商业食物摄影，用于手机外卖 App 首页 Hero，一份层次清楚的双层牛肉汉堡、金黄细薯条、脆鸡和一杯冷饮组合，Tomato Red #E33D2E、Mustard Yellow #FFC833、Paper #FFF9EC 与少量 Ink #201A17 的纸质托盘和背景点缀，明亮、快速、有食欲但不过度玩具化，主体集中在画面中部和右侧，左侧保留稳定深色区域给代码文案，适合 8:5 裁切，不要可读文字，不要价格，不要 logo，不要拱门符号，不要吉祥物，不要现实品牌包装，不要 UI，不要人物，不要水印，1200x750 PNG。

English: Horizontal commercial food photography for the original virtual quick-service brand Dash Grill, used as a mobile delivery-app hero, a clearly layered double beef burger with golden thin fries, crispy chicken, and a cold drink, paper tray and background accents in Tomato Red #E33D2E, Mustard Yellow #FFC833, Paper #FFF9EC, and small Ink #201A17, bright, fast, and appetizing without looking toy-like, subjects concentrated in the center and right with a stable dark area on the left for code-rendered copy, composed for an 8:5 crop, no readable text, no price, no logo, no arch symbol, no mascot, no real-brand packaging, no UI, no people, no watermark, 1200x750 PNG.
```

### Product Pack Prompt / 产品图组提示词

每次只生成表格中的一个产品，保持相同台面高度、镜头距离、自然高光和短投影，便于商品列表与详情页复用。

```text
中文：原创虚拟连锁快餐品牌 Dash Grill 的方形商业产品摄影，用于手机外卖 App。只展示指定的一份餐品，主体清晰居中并占画面约 78%，真实酥脆、煎烤和酱汁质感，Paper #FFF9EC 干净背景，允许 Tomato Red #E33D2E 与 Mustard Yellow #FFC833 的无字纸托盘或餐纸点缀，柔和短投影，边缘保留裁切安全区，在 100px 缩略图中仍可识别，不要可读文字，不要价格，不要 logo，不要拱门符号，不要吉祥物，不要现实品牌包装，不要 UI 卡片，不要人物，不要水印，768x768 PNG。

English: Square commercial product photography for the original virtual quick-service brand Dash Grill, used in a mobile delivery app. Show only the specified item, clearly centered and filling about 78% of the frame, realistic crisp, grilled, and sauced texture, clean Paper #FFF9EC background with optional unbranded paper-tray or liner accents in Tomato Red #E33D2E and Mustard Yellow #FFC833, compact soft shadow, safe crop padding, recognizable at a 100px thumbnail, no readable text, no price, no logo, no arch symbol, no mascot, no real-brand packaging, no UI card, no people, no watermark, 768x768 PNG.
```

## 8. Jade Hearth Independent App / Jade Hearth 独立中餐 App

Jade Hearth 是原创中式合菜概念，视觉使用 Ink Green `#1F4D3A`、Cinnabar `#BD4B35`、Rice Paper `#F5EFE2`、Warm Paper `#E9DECA` 和 Ink `#211E19`。素材应呈现温润、克制、适合共同分食的当代中餐，不使用现实餐厅品牌、可识别包装、仿古招牌或过度节庆化的装饰。

下列 `13` 张正式 PNG 已交付到稳定运行时路径，并完成桌面 Chromium 与模拟 Pixel 5 的 Home、Menu、Feast、Bag、Order 和 Detail 页面验收；未发现诊断占位、横向溢出或页面错误。CLI 首轮/重试请求、候选母版、联系表和接受记录保存在 `output/imagegen/jade-hearth/`，运行时只依赖 `public/images/ui-assets/apps/food-delivery/jade-hearth/`。首轮 `item-03` 因非方形画布、首轮 `item-12` 因汤圆数量错误被拒绝，运行时使用通过验收的 v2 母版；首页整鱼 `4:5` 卡片单独使用 `object-contain` 保全鱼尾与器皿，菜单与详情裁切不变。

### Asset Contract / 素材合同

```text
public/images/ui-assets/apps/food-delivery/jade-hearth/
├─ cover/jade-hearth-cover-01.png
└─ products/
   ├─ jade-hearth-item-01.png
   ├─ jade-hearth-item-02.png
   ├─ jade-hearth-item-03.png
   ├─ jade-hearth-item-04.png
   ├─ jade-hearth-item-05.png
   ├─ jade-hearth-item-06.png
   ├─ jade-hearth-item-07.png
   ├─ jade-hearth-item-08.png
   ├─ jade-hearth-item-09.png
   ├─ jade-hearth-item-10.png
   ├─ jade-hearth-item-11.png
   └─ jade-hearth-item-12.png
```

| 文件                               | 菜品 / 用途                    | 建议尺寸与构图                                                 |
| ---------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| `cover/jade-hearth-cover-01.png`   | 品牌首页 Hero，中式合菜桌面    | `1200x750`；桌面由左下延伸到右侧，上部与左侧保留深绿文案安全区 |
| `products/jade-hearth-item-01.png` | Tea-Smoked Half Chicken        | `768x768`；茶香半鸡、葱油与深色陶盘                            |
| `products/jade-hearth-item-02.png` | Cinnabar Char Siu              | `768x768`；晶亮叉烧、芥菜与芝麻                                |
| `products/jade-hearth-item-03.png` | Ginger-Scallion Sea Bass       | `768x768`；清蒸鲈鱼、姜丝、葱丝与热油光泽                      |
| `products/jade-hearth-item-04.png` | Crystal Shrimp Dumplings       | `768x768`；四只透明虾饺与浅色蒸笼                              |
| `products/jade-hearth-item-05.png` | Sesame Cucumber Ribbons        | `768x768`；卷叠黄瓜、芝麻酱、黑醋与花生碎                      |
| `products/jade-hearth-item-06.png` | Pepper Lotus Root              | `768x768`；脆藕片、青椒、芹菜与发酵辣椒                        |
| `products/jade-hearth-item-07.png` | Hearth Mapo Tofu               | `768x768`；麻婆豆腐、牛肉碎与青花椒油                          |
| `products/jade-hearth-item-08.png` | Chestnut Mushroom Claypot      | `768x768`；栗子、三种菌菇、腐竹与小砂锅                        |
| `products/jade-hearth-item-09.png` | Shrimp & Scallion Fried Rice   | `768x768`；虾仁、鸡蛋、葱花与粒粒分明的炒饭                    |
| `products/jade-hearth-item-10.png` | Red-Braised Beef Knife Noodles | `768x768`；宽刀削面、红烧牛肉、番茄汤与青菜                    |
| `products/jade-hearth-item-11.png` | Osmanthus Snow Pear Tea        | `768x768`；透明热茶壶、雪梨、桂花与枸杞                        |
| `products/jade-hearth-item-12.png` | Black Sesame Tangyuan          | `768x768`；四颗黑芝麻汤圆、清姜糖水与一颗剖面                  |

### Cover Prompt / 封面提示词

```text
中文：原创虚拟中餐品牌 Jade Hearth 的横向商业食物摄影，用于手机外卖 App 首页 Hero，一张当代中式共享餐桌，摆放茶熏半鸡、清蒸鲈鱼、砂锅、两道小碟和一壶热茶，深绿釉面与米纸色桌面，少量朱砂红餐巾或筷架点缀，温暖自然侧光，精致但有人情味，菜品清楚且适合共同分食，主体由画面下方延伸到右侧，上部和左侧保留稳定深绿区域给代码文案，适合 8:5 裁切，不要可读文字，不要招牌，不要 logo，不要现实品牌包装，不要宫廷或春节布景，不要人物，不要 UI，不要水印，1200x750 PNG。

English: Horizontal commercial food photography for the original virtual Chinese restaurant Jade Hearth, used as a mobile delivery-app hero, a contemporary shared table with tea-smoked half chicken, steamed sea bass, a claypot, two small plates, and a pot of warm tea, deep green glaze and rice-paper tabletop with restrained cinnabar-red napkin or chopstick-rest accents, warm natural side light, refined but welcoming, every dish clear and suitable for sharing, subjects extending from the lower frame toward the right with stable deep-green negative space above and on the left for code-rendered copy, composed for an 8:5 crop, no readable text, no signboard, no logo, no real-brand packaging, no imperial-palace or Lunar New Year staging, no people, no UI, no watermark, 1200x750 PNG.
```

### Product Pack Prompt / 产品图组提示词

每次只生成表格中的一个产品。保持同一组温暖自然侧光、深绿或米纸色餐具、俯视约 `35°` 的镜头与短柔投影；主菜允许横向椭圆盘，小碟、茶和甜汤保持方形裁切中心稳定。

```text
中文：原创虚拟中餐品牌 Jade Hearth 的方形商业菜品摄影，用于手机外卖 App。只展示指定的一道菜，使用当代中式陶瓷餐具，主体清晰并占画面约 76%，真实蒸汽、酱汁、食材纤维和锅气质感，Rice Paper #F5EFE2 或 Warm Paper #E9DECA 背景，允许 Ink Green #1F4D3A 餐具与极少 Cinnabar #BD4B35 点缀，温暖自然侧光，短柔投影，边缘留裁切安全区，在 100px 缩略图中仍可识别，不要可读文字，不要价格，不要 logo，不要现实品牌包装，不要仿古牌匾，不要过度节庆装饰，不要 UI 卡片，不要人物，不要水印，768x768 PNG。

English: Square commercial food photography for the original virtual Chinese restaurant Jade Hearth, used in a mobile delivery app. Show only the specified dish in contemporary Chinese ceramic tableware, clearly framed and filling about 76% of the image, with realistic steam, sauce, ingredient fibers, and wok texture, a Rice Paper #F5EFE2 or Warm Paper #E9DECA background, optional Ink Green #1F4D3A tableware and very restrained Cinnabar #BD4B35 accents, warm natural side light, compact soft shadow, safe crop padding, recognizable at a 100px thumbnail, no readable text, no price, no logo, no real-brand packaging, no antique signboard, no excessive festival decoration, no UI card, no people, no watermark, 768x768 PNG.
```

## 9. Verdant Day Independent App / Verdant Day 独立轻食 App

Verdant Day 使用 Ink `#1D241F`、Canvas `#F2F4EF`、Soft Green `#E4EADF`、Leaf `#496B4A`、Coral `#E96F64` 和少量 Gold `#D7A932`。品牌 Hero 以主题色、嫩芽吉祥物、品牌字标和 slogan 为核心，产品图则保持明亮、真实、有食欲，并以圆形裁切仍可识别为硬要求。当前全宽 Hero 直接使用带英文品牌字标与 slogan 的批准成图，无文字版本保留为人工修图母版；两张生活方式摄影保留为后续弹窗或店内推广素材。`01` 至 `12` 的完整产品摄影包已按稳定路径交付为 `768x768` PNG。

### Asset Contract / 素材合同

| Stable path                                                    | Subject                                       | Delivery requirement                                                                                                       |
| -------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `verdant-day/brand/verdant-day-brand-hero-art-01.png`          | Verdant Day brand Hero edit master, delivered | `1792x896`; text-free 2:1 artwork retained for later manual localization or retouching                                     |
| `verdant-day/brand/verdant-day-brand-hero-preview-02.png`      | Active Verdant Day brand Hero, delivered      | `1792x896`; fixed English wordmark and slogan are part of the approved composition and are not replaced by runtime UI copy |
| `verdant-day/promotions/verdant-day-promo-meal-spread-01.png`  | Meal-spread lifestyle photography, delivered  | Reserved for an in-app promotion, popup, or future campaign surface                                                        |
| `verdant-day/promotions/verdant-day-promo-lunch-moment-01.png` | Lunch-moment lifestyle photography, delivered | Reserved for an in-app promotion, popup, or future campaign surface                                                        |
| `verdant-day/products/verdant-day-item-01.png`                 | Aegean Garden Salad                           | Delivered; `768x768`; cucumber, tomato, feta, olives, lemon-herb dressing                                                  |
| `verdant-day/products/verdant-day-item-02.png`                 | Greenhouse Caesar                             | Delivered; `768x768`; charred chicken, baby romaine, sourdough crunch, light caper dressing                                |
| `verdant-day/products/verdant-day-item-03.png`                 | Miso Sesame Crunch                            | Delivered; `768x768`; cabbage, edamame, carrot ribbons, avocado, toasted sesame                                            |
| `verdant-day/products/verdant-day-item-04.png`                 | Golden Grain Bowl                             | Delivered; `768x768`; quinoa, roasted squash, chickpeas, kale, turmeric tahini                                             |
| `verdant-day/products/verdant-day-item-05.png`                 | Charred Corn Chicken Bowl                     | Delivered; `768x768`; pepper chicken, corn, brown rice, black beans, lime crema                                            |
| `verdant-day/products/verdant-day-item-06.png`                 | Forest Mushroom Farro                         | Delivered; `768x768`; roasted mushrooms, farro, spinach, soft egg, walnut pesto                                            |
| `verdant-day/products/verdant-day-item-07.png`                 | Avocado Herb Fold                             | Delivered; `768x768`; soft flatbread, avocado, cucumber, sprouts, feta, green tahini                                       |
| `verdant-day/products/verdant-day-item-08.png`                 | Lemon Pepper Chicken Wrap                     | Delivered; `768x768`; sliced wrap with lemon chicken, lettuce, tomato, pickled onion                                       |
| `verdant-day/products/verdant-day-item-09.png`                 | Ricotta Fig Toast                             | Delivered; `768x768`; sourdough, whipped ricotta, fresh fig, arugula, thyme honey                                          |
| `verdant-day/products/verdant-day-item-10.png`                 | Cucumber Mint Cooler                          | Delivered; `768x768`; clear sparkling cucumber, mint, and lime drink                                                       |
| `verdant-day/products/verdant-day-item-11.png`                 | Berry Kefir Sip                               | Delivered; `768x768`; strawberry-blueberry cultured drink in a clear glass                                                 |
| `verdant-day/products/verdant-day-item-12.png`                 | Olive Oil Citrus Loaf                         | Delivered; `768x768`; small citrus loaf, yogurt glaze, pistachio dust                                                      |

### Legacy Product-Photography Cover Prompt / 旧版产品摄影封面提示词

下列提示词保留为未来商品摄影或弹窗广告参考，不再作为当前顶部品牌 Hero 的生成合同。当前 Hero 使用已交付的 `verdant-day/brand/verdant-day-brand-hero-preview-02.png`；英文品牌字标与 slogan 属于画面构图，不由运行时本地化文案覆盖。无文字 `verdant-day-brand-hero-art-01.png` 保留为后续人工修图底稿。

```text
中文：原创虚拟轻食品牌 Verdant Day 的方形商业食物摄影，用于手机外卖 App 首页圆形 Hero 裁切。一份清爽沙拉、一份暖谷物碗、切开的香草卷饼和一杯黄瓜薄荷气泡饮围绕画面中心自然排列，真实蔬菜、谷物和蛋白质纹理，灰白 #F2F4EF 桌面，柔和绿 #E4EADF 与叶绿 #496B4A 餐具点缀，少量珊瑚红 #E96F64 食材提色，明亮自然侧光，中心主体在圆形裁切内完整可识别，四周留 12% 安全区，不要可读文字，不要价格，不要 logo，不要人物，不要现实品牌包装，不要 UI，不要水印，1024x1024 PNG。

English: Square commercial food photography for the original virtual light-food brand Verdant Day, used as a circular-cropped mobile app hero. Arrange one fresh salad, one warm grain bowl, a sliced herb wrap, and a cucumber-mint sparkling drink naturally around the center, with realistic vegetable, grain, and protein textures, a grey-white #F2F4EF tabletop, soft-green #E4EADF and leaf-green #496B4A tableware accents, and restrained coral #E96F64 ingredient highlights. Use bright natural side light, keep every main subject readable inside a central circular crop, preserve 12% safe padding, no readable text, no price, no logo, no people, no real-brand packaging, no UI, no watermark, 1024x1024 PNG.
```

### Product Pack Prompt / 产品图组提示词

每次只生成表格中的一个产品。允许不同餐盘与轻微不同角度，避免十二张图像同一套模板换菜；但保持明亮自然光、灰白或柔和绿背景、真实食物质感、中心安全区和短柔投影，确保圆形缩略图与详情大图都清楚。

```text
中文：原创虚拟轻食品牌 Verdant Day 的方形商业产品摄影。只展示表格指定的一份餐品或饮品，主体占画面约 74%，真实、新鲜、有食欲，灰白 #F2F4EF 或柔和绿 #E4EADF 背景，叶绿 #496B4A 餐具或布面点缀，允许少量珊瑚红 #E96F64 与金色 #D7A932 食材高光，明亮自然侧光，短柔投影，中心构图适合圆形裁切，边缘保留安全区，不要可读文字，不要价格，不要 logo，不要人物，不要现实品牌包装，不要 UI 卡片，不要水印，768x768 PNG。

English: Square commercial product photography for the original virtual light-food brand Verdant Day. Show only the specified dish or drink, filling about 74% of the frame with realistic fresh appetizing texture, on a grey-white #F2F4EF or soft-green #E4EADF background with leaf-green #496B4A tableware or textile accents and restrained coral #E96F64 and gold #D7A932 ingredient highlights. Use bright natural side light, a compact soft shadow, center-safe composition for circular cropping, and safe edge padding. No readable text, no price, no logo, no people, no real-brand packaging, no UI card, no watermark, 768x768 PNG.
```

## 10. River Noodles Independent Shop / River Noodles 独立面馆

River Noodles 是河岸市集里的当代面馆，不是 Jade Hearth 的中式合菜分支。摄影胶囊使用 River Teal `#1F6B68`、Porcelain `#F3F0E8`、Lacquer Red `#A84A3E`、Broth Amber `#C9883C` 与 Ink `#1B2525`；保持约 `35°` 俯视、自然窗侧光、深浅青釉石器、真实汤汽和湿润面条质感。汤面允许宽口深碗，拌面改用浅碗，小碟与高杯受控变化，不能把九张商品图做成同一只碗换配料。

状态：菜单与稳定运行时路径已接入；下列 `10` 张正式 PNG 尚未生成、接入或视觉验收。候选母版后续只能写入 `output/imagegen/river-noodles/`，运行时只能读取 `public/images/ui-assets/apps/food-delivery/river-noodles/`。

| 稳定路径                             | 菜品 / 用途                                  | 语义与构图要求                                                                             |
| ------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `cover/river-noodles-cover-01.png`   | River Noodles Hero / 面馆首页主图            | `1200x750`；牛肉汤面、番茄牛肉面、拌面和小碟形成河岸餐桌，主体在中右，左侧留深青文案安全区 |
| `products/river-noodles-item-01.png` | River Beef Noodles / 河岸牛肉面              | `768x768`；手工面、卤牛肉片、清亮牛骨汤、青菜、葱花                                        |
| `products/river-noodles-item-02.png` | Tomato Braised Beef Noodles / 番茄红烧牛肉面 | `768x768`；番茄牛肉汤、牛肉块、手工面、青菜                                                |
| `products/river-noodles-item-03.png` | Chicken Shiitake Noodles / 香菇鸡肉面        | `768x768`；清鸡汤、鸡肉片、香菇、幼嫩青菜                                                  |
| `products/river-noodles-item-04.png` | Pickled Mustard Fish Noodles / 酸菜鱼面      | `768x768`；白身鱼片、酸菜、辣椒、花椒与金色酸汤                                            |
| `products/river-noodles-item-05.png` | Sesame Scallion Dry Noodles / 麻酱葱油拌面   | `768x768`；麻酱包裹的拌面、黄瓜丝、葱油、芝麻，使用浅碗                                    |
| `products/river-noodles-item-06.png` | Chili Crisp Pork Noodles / 香辣肉末拌面      | `768x768`；肉末、红油辣酱、花生碎、葱花，酱汁与面条清楚分辨                                |
| `products/river-noodles-item-07.png` | Cucumber Sesame Salad / 芝麻拍黄瓜           | `768x768`；拍黄瓜、黑醋、蒜、芝麻和少量红油，使用小碟                                      |
| `products/river-noodles-item-08.png` | Crispy Pepper Lotus Root / 青椒脆藕片        | `768x768`；薄脆藕片、青椒、芝麻与片盐，不能生成炖藕                                        |
| `products/river-noodles-item-09.png` | Osmanthus Plum Cooler / 桂花酸梅饮           | `768x768`；透明高杯、深梅红冷饮、桂花、柑橘片和清楚冰块                                    |

### River Noodles Prompt Capsule / River Noodles 提示词胶囊

```text
中文 Hero：原创虚拟面馆品牌 River Noodles 的横向商业食物摄影，用于手机外卖 App 首页 Hero。展示一份清亮卤牛肉汤面、一份番茄红烧牛肉面、一份麻酱葱油拌面和两道清爽小碟，深浅青釉石器、Porcelain #F3F0E8 桌面、River Teal #1F6B68 背景与极少 Lacquer Red #A84A3E 点缀，自然窗侧光，真实汤汽、肉纹和湿润面条，主体集中在画面中部和右侧，左侧保留稳定深青文案安全区，适合 8:5 裁切，不要可读文字、价格、logo、人物、现实品牌包装、仿古牌匾、UI 或水印，1200x750 PNG。

English Hero: Horizontal commercial food photography for the original virtual noodle shop River Noodles, used as a mobile delivery-app hero. Show one clear-broth braised-beef noodle bowl, one tomato beef noodle bowl, one sesame-scallion dry noodle bowl, and two fresh side plates in varied deep and shallow teal-glazed stoneware on a Porcelain #F3F0E8 tabletop, with a River Teal #1F6B68 background and very restrained Lacquer Red #A84A3E accents. Use natural window side light and realistic steam, meat fibers, broth, and moist noodles. Keep the food clustered in the center and right with stable deep-teal negative space on the left for code-rendered copy, composed for an 8:5 crop. No readable text, price, logo, people, real-brand packaging, antique signboard, UI, or watermark, 1200x750 PNG.

中文商品：原创虚拟面馆 River Noodles 的方形商业菜品摄影。只展示表格指定的一道面、一道小碟或一杯饮品；汤面使用宽口深青釉碗，拌面使用浅青或米白碗，小碟与高杯按商品语义变化。约 35° 俯视，自然窗侧光，River Teal #1F6B68、Porcelain #F3F0E8、少量 Lacquer Red #A84A3E 与 Broth Amber #C9883C，主体占画面约 76%，汤汽、面条、肉片、蔬菜与酱汁真实清楚，短柔投影，边缘留裁切安全区，不要可读文字、价格、logo、人物、现实品牌包装、UI 卡片或水印，768x768 PNG。

English product: Square commercial product photography for the original virtual noodle shop River Noodles. Show only the specified noodle bowl, side plate, or drink. Use wide deep teal-glazed bowls for soup noodles, shallow teal or porcelain bowls for dry noodles, and semantically appropriate small plates or tall glasses for sides and drinks. Use an approximately 35-degree overhead angle, natural window side light, River Teal #1F6B68 and Porcelain #F3F0E8 with restrained Lacquer Red #A84A3E and Broth Amber #C9883C accents. The subject fills about 76% of the frame with realistic steam, noodles, meat, vegetables, and sauce, plus a compact soft shadow and safe crop padding. No readable text, price, logo, people, real-brand packaging, UI card, or watermark, 768x768 PNG.
```

## 11. Daylight Cafe Independent Shop / Daylight Cafe 独立咖啡馆

Daylight Cafe 是明亮的街角咖啡与早午餐店，不复用 Verdant Day 的圆形轻食摄影，也不使用 Sugar Lane 的珠宝盒甜点光。摄影胶囊使用 Sun Yellow `#F4C95D`、Sky `#B8DCE8`、Cream `#FFF7E8`、Leaf `#4E725F` 与 Espresso `#4B2E25`；保持早晨窗光、浅色水磨石桌面、约 `40°` 镜头与通透阴影。咖啡、玻璃冷饮、整盘早午餐和烘焙纸袋可以受控变化，但每张都要像同一个上午拍摄。

状态：下列 `10` 张正式 PNG 已由 Daylight Cafe 自有的 bright-morning terrazzo/cafe 胶囊生成并接入稳定运行时路径，候选母版、CLI 请求记录、联系表与接受理由保留在 `output/imagegen/daylight-cafe/`，运行时只读取 `public/images/ui-assets/apps/food-delivery/daylight-cafe/`。桌面 Chromium 与 `393x851` 移动视觉验收已覆盖店头构图、九张缩略图、详情完整主体、横向溢出与控制台错误；店头图使用 `68%` 横向焦点，Daylight Cafe 详情图单独使用 Cream 底 `object-contain`，不为浅详情槽破坏方形正式素材。

| 稳定路径                             | 菜品 / 用途                             | 语义与构图要求                                                                     |
| ------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------- |
| `cover/daylight-cafe-cover-01.png`   | Daylight Cafe Hero / 咖啡馆首页主图     | `1200x750`；拿铁、可颂早午餐、牛油果吐司和冷饮，主体在中右，左侧留奶油色文案安全区 |
| `products/daylight-cafe-item-01.png` | Daylight Latte / 日光拿铁               | `768x768`；陶瓷杯双份浓缩拿铁、细腻奶泡与少量可可粉                                |
| `products/daylight-cafe-item-02.png` | Honey Oat Flat White / 蜂蜜燕麦馥芮白   | `768x768`；矮陶瓷杯、燕麦奶咖啡、细蜂蜜纹，不生成厚奶油顶                          |
| `products/daylight-cafe-item-03.png` | Orange Espresso Tonic / 橙香浓缩汤力    | `768x768`；透明高杯、浓缩分层、橙片、迷迭香与冰块                                  |
| `products/daylight-cafe-item-04.png` | Sunrise Egg Croissant / 日出鸡蛋可颂    | `768x768`；剖开的层酥可颂、嫩炒蛋、切达、番茄和菠菜                                |
| `products/daylight-cafe-item-05.png` | Avocado Ricotta Toast / 牛油果乳清吐司  | `768x768`；酸种面包、乳清奶酪、牛油果扇、溏心蛋、香草和柠檬                        |
| `products/daylight-cafe-item-06.png` | Mushroom Egg Melt / 蘑菇鸡蛋芝士吐司    | `768x768`；乡村面包、烤蘑菇、折叠蛋、融化奶酪和百里香                              |
| `products/daylight-cafe-item-07.png` | Morning Butter Croissant / 晨光黄油可颂 | `768x768`；单只金黄层酥可颂，完整轮廓与明显蜂窝层次                                |
| `products/daylight-cafe-item-08.png` | Lemon Poppy Loaf / 柠檬罂粟籽蛋糕       | `768x768`；单片柠檬蛋糕、薄酸奶糖霜、柠檬屑和罂粟籽                                |
| `products/daylight-cafe-item-09.png` | Vanilla Cream Cold Brew / 香草奶盖冷萃  | `768x768`；透明杯冷萃、清楚冰块与轻薄香草奶油顶                                    |

### Daylight Cafe Prompt Capsule / Daylight Cafe 提示词胶囊

```text
中文 Hero：原创虚拟街角咖啡品牌 Daylight Cafe 的横向商业摄影，用于手机外卖 App 首页 Hero。展示一杯陶瓷杯拿铁、一份剖开的鸡蛋可颂、一份牛油果乳清吐司和一杯透明橙香浓缩汤力，Cream #FFF7E8 浅色水磨石桌面，Sun Yellow #F4C95D、Sky #B8DCE8、Leaf #4E725F 小面积器皿或布面点缀，清透明亮的早晨窗光，食物和咖啡真实但不过度造型，主体集中在中部和右侧，左侧保留稳定奶油色文案安全区，适合 8:5 裁切，不要可读文字、价格、logo、人物、现实品牌杯套或包装、UI 或水印，1200x750 PNG。

English Hero: Horizontal commercial photography for the original virtual corner cafe Daylight Cafe, used as a mobile delivery-app hero. Show a ceramic latte, a sliced egg croissant, avocado-ricotta toast, and a clear orange espresso tonic on a light Cream #FFF7E8 terrazzo table, with small Sun Yellow #F4C95D, Sky #B8DCE8, and Leaf #4E725F tableware or textile accents. Use clear bright morning window light and realistic food and coffee styling. Keep subjects in the center and right with stable cream negative space on the left for code-rendered copy, composed for an 8:5 crop. No readable text, price, logo, people, real-brand cup sleeve or packaging, UI, or watermark, 1200x750 PNG.

中文商品：原创虚拟咖啡馆 Daylight Cafe 的方形商业产品摄影。只展示表格指定的一杯咖啡、一份早午餐或一件烘焙，主体占画面约 74%，浅色水磨石与 Cream #FFF7E8 背景，Sun Yellow #F4C95D、Sky #B8DCE8、Leaf #4E725F 受控点缀，约 40° 镜头，明亮早晨窗光与通透短影。陶瓷杯、透明高杯、白色餐盘和无字烘焙纸可按商品变化，保持同一上午与同一镜头距离，不要可读文字、价格、logo、人物、现实品牌包装、UI 卡片或水印，768x768 PNG。

English product: Square commercial product photography for the original virtual cafe Daylight Cafe. Show only the specified coffee, brunch plate, or bake, filling about 74% of the frame on light terrazzo and Cream #FFF7E8 with controlled Sun Yellow #F4C95D, Sky #B8DCE8, and Leaf #4E725F accents. Use an approximately 40-degree camera angle, bright morning window light, and a clean compact shadow. Ceramic cups, clear tall glasses, white plates, and unbranded bakery paper may vary with the product while retaining the same morning and camera distance. No readable text, price, logo, people, real-brand packaging, UI card, or watermark, 768x768 PNG.
```

## 12. Sugar Lane Independent Shop / Sugar Lane 独立甜点店

Sugar Lane 是精致但轻松的街巷甜点柜，不是 Peach Cloud 的粉色云朵饮品品牌。摄影胶囊使用 Berry `#C84F72`、Butter `#F4D58D`、Mint `#B8D8C0`、Porcelain `#FFF8F2` 与 Cocoa `#4A2D2B`；以柔和橱窗侧光、白瓷和浅石台面、约 `30°` 俯视呈现清楚切面与真实奶油质感。蛋糕、塔、泡芙、杯装冰甜和饮品要使用不同器皿与轮廓，避免九张图都变成相同圆形小蛋糕。

状态：菜单与稳定运行时路径已接入；下列 `10` 张正式 PNG 尚未生成、接入或视觉验收。候选母版后续只能写入 `output/imagegen/sugar-lane/`，运行时只能读取 `public/images/ui-assets/apps/food-delivery/sugar-lane/`。

| 稳定路径                          | 菜品 / 用途                                 | 语义与构图要求                                                                             |
| --------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `cover/sugar-lane-cover-01.png`   | Sugar Lane Hero / 甜点店首页主图            | `1200x750`；月形慕斯、草莓蛋糕、开心果塔、泡芙与一杯气泡饮，主体中右，左侧留莓红文案安全区 |
| `products/sugar-lane-item-01.png` | Tiny Moon Cake / 小月亮慕斯                 | `768x768`；月形香草慕斯、梨果酱夹心、杏仁海绵与浅色可可脂淋面                              |
| `products/sugar-lane-item-02.png` | Strawberry Ribbon Shortcake / 草莓缎带蛋糕  | `768x768`；香草戚风切片、鲜草莓、轻奶油和卷曲草莓薄片                                      |
| `products/sugar-lane-item-03.png` | Burnt Honey Cheesecake / 焦香蜂蜜芝士蛋糕   | `768x768`；焦色烘烤表面、奶油芝士切面、咸蜂蜜和燕麦酥粒                                    |
| `products/sugar-lane-item-04.png` | Pistachio Raspberry Tart / 开心果覆盆子塔   | `768x768`；酥脆塔壳、开心果奶油、覆盆子中心和烤开心果碎                                    |
| `products/sugar-lane-item-05.png` | Salted Caramel Choux / 海盐焦糖泡芙         | `768x768`；单只脆皮泡芙、焦糖卡仕达夹心和深焦糖圆片                                        |
| `products/sugar-lane-item-06.png` | Mango Coconut Panna Cotta / 芒果椰香奶冻    | `768x768`；透明杯椰奶冻、芒果块、百香果酱和烤椰片                                          |
| `products/sugar-lane-item-07.png` | Black Sesame Mochi Parfait / 黑芝麻麻薯芭菲 | `768x768`；透明甜品杯、黑芝麻奶油、牛奶冰淇淋、麻薯和芝麻酥粒                              |
| `products/sugar-lane-item-08.png` | Rose Lychee Fizz / 玫瑰荔枝气泡饮           | `768x768`；透明高杯、荔枝、玫瑰、覆盆子、柠檬和冰块                                        |
| `products/sugar-lane-item-09.png` | Cocoa Cloud Milk / 可可云顶牛奶             | `768x768`；冷可可牛奶、轻薄香草奶油顶、可可粉和黑巧克力卷                                  |

### Sugar Lane Prompt Capsule / Sugar Lane 提示词胶囊

```text
中文 Hero：原创虚拟甜点品牌 Sugar Lane 的横向商业甜点摄影，用于手机外卖 App 首页 Hero。展示一只月形香草慕斯、一片草莓缎带蛋糕、一只开心果覆盆子塔、一只海盐焦糖泡芙和一杯透明玫瑰荔枝气泡饮，Porcelain #FFF8F2 浅石台面与白瓷器皿，Berry #C84F72、Butter #F4D58D、Mint #B8D8C0 和少量 Cocoa #4A2D2B 点缀，柔和橱窗侧光，切面、淋面、酥皮和奶油真实精致，主体集中在中部和右侧，左侧保留稳定莓红文案安全区，适合 8:5 裁切，不要可读文字、价格、logo、云朵或白桃吉祥物、人物、现实品牌包装、UI 或水印，1200x750 PNG。

English Hero: Horizontal commercial dessert photography for the original virtual patisserie Sugar Lane, used as a mobile delivery-app hero. Show one moon-shaped vanilla mousse, one strawberry ribbon shortcake slice, one pistachio raspberry tart, one salted caramel choux, and one clear rose lychee fizz on a Porcelain #FFF8F2 light-stone counter with white porcelain, Berry #C84F72, Butter #F4D58D, Mint #B8D8C0, and restrained Cocoa #4A2D2B accents. Use soft display-window side light and realistic refined cake layers, glaze, pastry, and cream. Keep subjects in the center and right with stable berry negative space on the left for code-rendered copy, composed for an 8:5 crop. No readable text, price, logo, cloud or peach mascot, people, real-brand packaging, UI, or watermark, 1200x750 PNG.

中文商品：原创虚拟甜点品牌 Sugar Lane 的方形商业产品摄影。只展示表格指定的一件蛋糕、酥点、杯装冰甜或饮品，主体占画面约 72%，Porcelain #FFF8F2 浅石背景、白瓷或透明玻璃器皿，Berry #C84F72、Butter #F4D58D、Mint #B8D8C0 与 Cocoa #4A2D2B 只承担局部色彩职责，约 30° 俯视，柔和橱窗侧光与短影，切面和主体轮廓完整，器皿按商品受控变化，不要可读文字、价格、logo、云朵或白桃吉祥物、人物、现实品牌包装、UI 卡片或水印，768x768 PNG。

English product: Square commercial product photography for the original virtual patisserie Sugar Lane. Show only the specified cake, pastry, chilled glass dessert, or drink, filling about 72% of the frame on a Porcelain #FFF8F2 light-stone surface with white porcelain or clear glass. Berry #C84F72, Butter #F4D58D, Mint #B8D8C0, and Cocoa #4A2D2B each carry restrained accent roles. Use an approximately 30-degree overhead angle, soft display-window side light, a compact shadow, and a complete readable cross-section or silhouette. Vary tableware in a controlled, product-appropriate way. No readable text, price, logo, cloud or peach mascot, people, real-brand packaging, UI card, or watermark, 768x768 PNG.

## 13. Harbor Roast Independent Coffee Chain / Harbor Roast 独立咖啡饮品连锁

Harbor Roast 是原创的都市精品咖啡连锁概念，只借鉴成熟咖啡连锁的品类完整度与点单认知，不复制任何现实品牌。不得使用 Starbucks 名称、海妖或相似圆形徽章、绿色围裙、现实品牌杯套、产品名或门店装潢。品牌摄影胶囊使用 Petrol `#123F3A`、Copper `#B56A3B`、Warm Ivory `#F4EFE5`、Cranberry `#A83E4B` 与 Espresso `#2B1C18`；以深色石台、拉丝金属、棱纹玻璃和温暖定向侧光建立更成熟的连锁咖啡气质，与 Daylight Cafe 的明亮早晨水磨石和早午餐摄影保持清晰差异。

状态：菜单、四个店内栏目、App Store 店面身份设置入口和下列 `13` 张 PNG 稳定路径已经接入。尚未生成候选母版，尚未接入正式素材，也尚未完成桌面或移动视觉验收。后续候选、请求记录、参考锚点与接受理由只能写入 `output/imagegen/harbor-roast/`；正式运行时副本只能写入并读取 `public/images/ui-assets/apps/food-delivery/harbor-roast/`，运行时不得依赖 `output/` 或 `tmp/`。

### Asset Contract / 素材合同

| 稳定运行时路径 | 菜单语义 | 规格与构图要求 |
| --- | --- | --- |
| `cover/harbor-roast-cover-01.png` | Harbor Roast Hero / 港湾咖啡店头主图 | `1200x750`；经典热咖、两杯招牌特调、冷萃与两件柜台烘焙形成完整产品家族，主体集中在中右，左侧保留深海绿文案安全区 |
| `products/harbor-roast-item-01.png` | Harbor House Americano / 港湾美式 | `768x768`；深色陶瓷杯中的清澈美式，薄油脂层，不出现奶泡 |
| `products/harbor-roast-item-02.png` | Copper Flat White / 铜韵馥芮白 | `768x768`；矮陶瓷杯、紧实微奶泡与细致拉花，体量明显小于拿铁 |
| `products/harbor-roast-item-03.png` | Vanilla Bean Latte / 香草籽拿铁 | `768x768`；暖象牙高杯拿铁，可见香草籽点，不使用焦糖淋酱 |
| `products/harbor-roast-item-04.png` | Sea-Salt Caramel Latte / 海盐焦糖拿铁 | `768x768`；铜色焦糖、轻薄奶泡与少量焦糖脆片，保持咖啡主体可见 |
| `products/harbor-roast-item-05.png` | Pistachio Oat Latte / 开心果燕麦拿铁 | `768x768`；淡开心果泡沫与碎开心果，颜色克制，不做荧光绿色 |
| `products/harbor-roast-item-06.png` | Cranberry Cocoa Mocha / 蔓越莓可可摩卡 | `768x768`；深可可咖啡、轻奶泡与小面积蔓越莓红点色，不变成水果奶昔 |
| `products/harbor-roast-item-07.png` | Velvet Cold Brew / 丝绒冷萃 | `768x768`；棱纹高玻璃、清晰冰块、深色冷萃与平整麦芽奶盖分层 |
| `products/harbor-roast-item-08.png` | Citrus Espresso Sparkler / 柑橘浓缩气泡 | `768x768`；透明高杯，葡萄柚气泡与浓缩咖啡分层，橙皮点明风味 |
| `products/harbor-roast-item-09.png` | Dark Cocoa Coffee Blend / 黑可可咖啡冰沙 | `768x768`；厚实深可可冰沙、少量可可碎，不使用夸张奶油山或糖果 |
| `products/harbor-roast-item-10.png` | Apricot Earl Grey Iced Tea / 杏桃伯爵冰茶 | `768x768`；琥珀茶汤、杏桃片、柠檬和透明冰块，不出现咖啡分层 |
| `products/harbor-roast-item-11.png` | Copper Sugar Scone / 铜糖司康 | `768x768`；单只完整司康，粗糖脆壳与橙皮屑清楚，配无字烘焙纸 |
| `products/harbor-roast-item-12.png` | Almond Butter Croissant / 杏仁黄油可颂 | `768x768`；单只二次烘焙可颂，杏仁片和少量糖粉，层次与完整两端可见 |

### Harbor Roast Prompt Capsule / Harbor Roast 提示词胶囊

中文 Hero：原创虚拟都市咖啡连锁 Harbor Roast 的横向商业摄影，用于手机外卖 App 店铺 Hero。展示一杯经典热美式、一杯海盐焦糖拿铁、一杯开心果燕麦拿铁、一杯棱纹玻璃冷萃、一个司康和一个杏仁黄油可颂；深色石台、拉丝铜色金属、Petrol #123F3A 背景、Warm Ivory #F4EFE5 器皿、少量 Cranberry #A83E4B 点色，温暖定向咖啡馆侧光，真实咖啡油脂、奶泡、冰块和酥皮纹理。主体集中在中部和右侧，左侧保留稳定深海绿文案安全区，适合 8:5 裁切。不要可读文字、价格、logo、人物、海妖或相似圆形徽章、绿色围裙、现实品牌杯套或包装、UI 或水印，1200x750 PNG。

English Hero: Horizontal commercial photography for the original fictional urban coffee chain Harbor Roast, used as a mobile delivery-app shop hero. Show one classic hot Americano, one sea-salt caramel latte, one pistachio oat latte, one ribbed-glass cold brew, one sugar-crusted scone, and one almond-butter croissant on a dark stone counter with brushed-copper metal, a Petrol #123F3A background, Warm Ivory #F4EFE5 tableware, and restrained Cranberry #A83E4B accents. Use warm directional cafe side light with realistic crema, microfoam, clear ice, and pastry layers. Keep the subjects clustered in the center and right with stable deep-petrol negative space on the left for code-rendered copy, composed for an 8:5 crop. No readable text, prices, logos, people, siren or similar circular emblem, green apron, real-brand cup sleeve or packaging, UI, or watermark, 1200x750 PNG.

中文商品：原创虚拟咖啡连锁 Harbor Roast 的方形商业产品摄影。只展示表格指定的一杯饮品或一件烘焙，主体占画面约 `74%`，深色石台与 Warm Ivory #F4EFE5 背景，Petrol #123F3A、Copper #B56A3B、Cranberry #A83E4B 和 Espresso #2B1C18 各自承担克制的色彩职责。使用约 `35°` 镜头、温暖定向侧光、紧凑柔影和稳定裁切留白；热饮陶瓷杯、冷饮棱纹玻璃与无字烘焙纸按商品语义受控变化，但保持同一门店、同一光线和接近的主体体量。不要可读文字、价格、logo、人物、海妖或相似圆形徽章、绿色围裙、现实品牌杯套或包装、UI 卡片或水印，768x768 PNG。

English product: Square commercial product photography for the original fictional coffee chain Harbor Roast. Show only the specified drink or bake, filling about 74% of the frame on dark stone and Warm Ivory #F4EFE5, with Petrol #123F3A, Copper #B56A3B, Cranberry #A83E4B, and Espresso #2B1C18 assigned restrained color roles. Use an approximately 35-degree camera angle, warm directional side light, a compact soft shadow, and stable crop padding. Vary ceramic cups for hot drinks, ribbed glassware for cold drinks, and unbranded bakery paper for bakes while retaining the same shop, light, lens distance, and comparable subject volume. No readable text, price, logo, people, siren or similar circular emblem, green apron, real-brand cup sleeve or packaging, UI card, or watermark, 768x768 PNG.
```

## Naming Suggestion / 文件命名建议

建议使用稳定文件名，之后接入代码会更清楚：

```text
food-platform-banner-club.png
food-platform-banner-weekend.png
food-platform-banner-lunch.png
food-platform-merchant-hanwoo-gukbap.png
food-platform-merchant-sushi-hana.png
food-platform-merchant-hwadeok-pizza.png
food-platform-merchant-salad-day.png
food-platform-merchant-chicken-crisp.png
moon-bistro-cover.png
moon-bistro-dish-signal-soup.png
moon-bistro-dish-lunar-rice.png
moon-bistro-dish-orbit-pasta.png
moon-bistro-dish-midnight-dessert.png
category-all-01.png
category-meal-01.png
category-fast-food-01.png
category-fried-chicken-01.png
category-pizza-01.png
category-cafe-01.png
category-dessert-01.png
category-grocery-01.png
category-noodles-01.png
category-sushi-01.png
food-decor-rider.png
food-decor-free-delivery-coupon.png
food-decor-takeout-bag.png
food-decor-receipt-heart.png
platform-checkout-takeout-bag-01.png
platform-order-status-placed-01.png
platform-order-status-preparing-01.png
platform-order-status-delivering-01.png
platform-order-status-delivered-01.png
platform-order-status-cancelled-01.png
platform-order-status-delayed-01.png
platform-orders-empty-receipt-01.png
jade-hearth-cover-01.png
jade-hearth-item-01.png
jade-hearth-item-02.png
jade-hearth-item-03.png
jade-hearth-item-04.png
jade-hearth-item-05.png
jade-hearth-item-06.png
jade-hearth-item-07.png
jade-hearth-item-08.png
jade-hearth-item-09.png
jade-hearth-item-10.png
jade-hearth-item-11.png
jade-hearth-item-12.png
verdant-day-brand-hero-art-01.png
verdant-day-brand-hero-preview-02.png
verdant-day-promo-meal-spread-01.png
verdant-day-promo-lunch-moment-01.png
verdant-day-item-01.png
verdant-day-item-02.png
verdant-day-item-03.png
verdant-day-item-04.png
verdant-day-item-05.png
verdant-day-item-06.png
verdant-day-item-07.png
verdant-day-item-08.png
verdant-day-item-09.png
verdant-day-item-10.png
verdant-day-item-11.png
verdant-day-item-12.png
```
