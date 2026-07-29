# Food Delivery Image2 Asset Prompts / 外卖 Image2 素材提示词

Updated: 2026-07-29

这份文档用于生成外卖 UI 美化需要的 PNG 素材。所有提示词都做成中英双语，方便直接复制到 image2 / 生图工具中使用。

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

Peach Cloud 使用 Iron Grey `#444545`、Jet Black `#2B303A`、浅绿 `#F2FBE0`、Petal Rouge `#FD6C93` 和 Pink Mist `#FDA1B8` 建立独立品牌感。浅绿承担大面积背景，深灰承担正文与固定导航，高饱和粉只用于主要操作和选中状态，粉雾用于顶栏与辅助层；`#FD6C93` 上使用 Jet Black 文字，不使用小号白字。它不是 Food Platform 内部商户，也不复用 Moon Bistro 的暗色图片。精确 Figma 首页节点 `47:23` 的素材已落到下列 `19` 个本地文件：`13` 张 PNG 和 `6` 个 SVG。现有 PNG 在本轮保持不变，页面保留稳定路径与 `data-required-asset`，文件加载失败时显示共享诊断占位图。

### Asset Contract / 素材合同

```text
public/images/ui-assets/apps/food-delivery/peach-cloud/
├─ cover/peach-cloud-hero-01.png
├─ brand/peach-cloud-mark-01.svg
├─ categories/
│  ├─ drinks.svg
│  ├─ vegan.svg
│  ├─ dessert.svg
│  ├─ snacks.svg
│  └─ meal.svg
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
   └─ peach-cloud-item-12.png
```

| 文件                               | 内容                                                                          | 建议源尺寸 / 裁切                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `cover/peach-cloud-hero-01.png`    | 三杯奶昔摄影，用于 Figma 风格 `30% OFF` 促销                                  | 横向摄影，右侧主体清晰，适合促销位裁切                                   |
| `brand/peach-cloud-mark-01.svg`    | Figma 甜点线稿，用作顶部品牌/资料入口                                         | 矢量，适合 `20px` 到 `48px` 显示                                         |
| `categories/*.svg`                 | Drinks、Vegan/Fruit、Dessert、Snacks/Bakes、Meal/Seasonal 五个 Figma 分类线稿 | 矢量，使用 Jet Black `#2B303A` 描边；Snacks 底色使用 Pink Mist `#FDA1B8` |
| `products/peach-cloud-item-01.png` | Peach Oolong Cloud                                                            | `768x768`                                                                |
| `products/peach-cloud-item-02.png` | Brown Sugar Creme No. 7                                                       | `768x768`                                                                |
| `products/peach-cloud-item-03.png` | Cocoa Cloud Brownie                                                           | Figma 产品摄影                                                           |
| `products/peach-cloud-item-04.png` | Peach Macaron Parade                                                          | Figma 产品摄影                                                           |
| `products/peach-cloud-item-05.png` | Yuzu Spark Pop                                                                | `768x768`                                                                |
| `products/peach-cloud-item-06.png` | Crepe Gelato Cloud                                                            | Figma 产品摄影                                                           |
| `products/peach-cloud-item-07.png` | Macaron Milk Drift                                                            | Figma 产品摄影                                                           |
| `products/peach-cloud-item-08.png` | Hojicha Cloud Float                                                           | Figma 产品摄影                                                           |
| `products/peach-cloud-item-09.png` | Strawberry Sunbeam Slice                                                      | Figma 产品摄影                                                           |
| `products/peach-cloud-item-10.png` | Cloud Nine Cocoa Crepes                                                       | Figma 产品摄影                                                           |
| `products/peach-cloud-item-11.png` | Midnight Creme No. 11                                                         | Figma 产品摄影                                                           |
| `products/peach-cloud-item-12.png` | Golden Hour Pairing，气泡饮与迷你巴斯克组合                                   | `768x768`                                                                |

### Hero Prompt / 主图提示词

```text
中文：用于虚拟手机外卖独立甜饮 App 的品牌主图，明亮真实的商业饮品与甜点摄影，白桃乌龙奶盖、粉红渐层鲜果气泡饮、芒果牛奶冰、巴斯克芝士蛋糕和一份黄油华夫饼陈列在清爽的现代甜饮柜台上，Petal Rouge `#FD6C93`、Pink Mist `#FDA1B8`、浅绿 `#F2FBE0` 与少量 Jet Black `#2B303A` 配色，明快但不过度儿童化，食物清晰诱人，主体集中在画面右侧和中部，左侧保留稳定的深浅对比区域给代码渲染标题，适合横向 8:5 裁切，不要可读文字，不要 logo，不要价格，不要 UI，不要手机边框，不要水印，PNG。

English: Brand hero for an independent dessert-and-drinks delivery app inside a virtual phone, bright realistic commercial food photography of white-peach oolong milk tea, pink layered fruit fizz, mango milk snow, Basque cheesecake, and a butter waffle on a clean contemporary dessert counter, Petal Rouge #FD6C93, Pink Mist #FDA1B8, pale green #F2FBE0, and small Jet Black #2B303A accents, bright and polished without looking childish, crisp appetizing food, subjects concentrated in the center and right with stable contrast-safe space on the left for code-rendered copy, composed for a horizontal 8:5 crop, no readable text, no logo, no price, no UI, no phone frame, no watermark, PNG.
```

### Product Pack Prompt / 产品图组提示词

每张图只生成表格中对应的一项产品，保持同一套 Pink Mist 到浅绿背景、清爽浅色台面、柔和短投影和明亮自然光。

```text
中文：Peach Cloud 虚拟甜饮品牌的方形产品摄影，用于手机外卖 App 双列商品卡片。单份指定饮品或甜点清晰居中，占画面约 78%，Pink Mist `#FDA1B8` 到浅绿 `#F2FBE0` 的干净背景，允许极少量 Petal Rouge `#FD6C93` 点缀，明亮自然的甜品店光线，真实食物质感，柔和短投影，边缘保留裁切安全区，整体精致、轻快、有品牌一致性，适合在 150px 卡片和大图详情中显示，不要可读文字，不要价格，不要 logo，不要 UI 卡片，不要餐具杂物，不要人物，不要水印，768x768 PNG。

English: Square product photography for the virtual Peach Cloud drinks-and-desserts brand, used in a two-column mobile delivery menu. Show only the specified drink or dessert, clearly centered and filling about 78% of the frame, clean Pink Mist #FDA1B8 to pale green #F2FBE0 backdrop with only small Petal Rouge #FD6C93 accents, bright natural dessert-counter lighting, realistic appetizing texture, soft compact shadow, safe crop padding, polished cheerful and consistent across the set, readable both in a 150px card and a large detail view, no readable text, no price, no logo, no UI card, no cluttered tableware, no people, no watermark, 768x768 PNG.
```

### Brand Mark Prompt / 品牌图形提示词

```text
中文：Peach Cloud 甜饮品牌的独立图形标志，不含文字，将简化白桃轮廓、柔软云朵和一只带吸管的冷饮杯组合成一个清晰轮廓，以 Petal Rouge `#FD6C93` 为主，搭配 Jet Black `#2B303A` 结构线和少量浅绿 `#F2FBE0` 高光，友好但不过度卡通，适合在 48px 仍可识别，透明背景，无投影或仅极短柔和投影，不要字母，不要店名，不要价格，不要 UI 卡片，不要水印，带 alpha 通道的 768x768 PNG。

English: Standalone symbol for the Peach Cloud dessert-drinks brand with no text, combining a simplified white-peach outline, soft cloud, and cold drink cup with straw into one clear silhouette, primarily Petal Rouge #FD6C93 with Jet Black #2B303A structure and small pale-green #F2FBE0 highlights, friendly without becoming overly cartoonish, recognizable at 48px, transparent background, no shadow or only a very compact soft shadow, no letters, no shop name, no price, no UI card, no watermark, 768x768 PNG with alpha.
```

## 7. Dash Grill Independent App / Dash Grill 独立快餐 App

Dash Grill 是原创连锁快餐概念，视觉使用 Tomato Red `#E33D2E`、Mustard Yellow `#FFC833`、Paper `#FFF9EC` 和 Ink `#201A17`。它可以传达高频套餐、汉堡、炸鸡和奶昔的快节奏消费感，但不得使用麦当劳或其他现实品牌的名称、拱门、吉祥物、制服、包装、门店照片或可识别商标。

当前 UI 已为下列 `11` 张 PNG 接好稳定路径。文件未交付时统一显示共享诊断占位图，这些占位图不是正式素材。

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

当前 UI 已为下列 `13` 张 PNG 接好稳定路径。文件未交付时统一显示共享诊断占位图，这些占位图不是正式素材。

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

| 文件                               | 菜品 / 用途                         | 建议尺寸与构图                                                   |
| ---------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `cover/jade-hearth-cover-01.png`   | 品牌首页 Hero，中式合菜桌面         | `1200x750`；桌面由左下延伸到右侧，上部与左侧保留深绿文案安全区   |
| `products/jade-hearth-item-01.png` | Tea-Smoked Half Chicken             | `768x768`；茶香半鸡、葱油与深色陶盘                              |
| `products/jade-hearth-item-02.png` | Cinnabar Char Siu                   | `768x768`；晶亮叉烧、芥菜与芝麻                                  |
| `products/jade-hearth-item-03.png` | Ginger-Scallion Sea Bass            | `768x768`；清蒸鲈鱼、姜丝、葱丝与热油光泽                        |
| `products/jade-hearth-item-04.png` | Crystal Shrimp Dumplings            | `768x768`；四只透明虾饺与浅色蒸笼                                |
| `products/jade-hearth-item-05.png` | Sesame Cucumber Ribbons             | `768x768`；卷叠黄瓜、芝麻酱、黑醋与花生碎                        |
| `products/jade-hearth-item-06.png` | Pepper Lotus Root                   | `768x768`；脆藕片、青椒、芹菜与发酵辣椒                          |
| `products/jade-hearth-item-07.png` | Hearth Mapo Tofu                    | `768x768`；麻婆豆腐、牛肉碎与青花椒油                            |
| `products/jade-hearth-item-08.png` | Chestnut Mushroom Claypot           | `768x768`；栗子、三种菌菇、腐竹与小砂锅                          |
| `products/jade-hearth-item-09.png` | Shrimp & Scallion Fried Rice        | `768x768`；虾仁、鸡蛋、葱花与粒粒分明的炒饭                      |
| `products/jade-hearth-item-10.png` | Red-Braised Beef Knife Noodles      | `768x768`；宽刀削面、红烧牛肉、番茄汤与青菜                      |
| `products/jade-hearth-item-11.png` | Osmanthus Snow Pear Tea             | `768x768`；透明热茶壶、雪梨、桂花与枸杞                          |
| `products/jade-hearth-item-12.png` | Black Sesame Tangyuan               | `768x768`；四颗黑芝麻汤圆、清姜糖水与一颗剖面                    |

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
