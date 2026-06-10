# UI Visual Assets / UI 视觉素材库

This folder is the canonical project location for UI-ready visual assets.

这里是项目内统一的“可被 UI 直接使用的成品视觉素材库”。之后需要接进页面、app、主题、世界包或商店外观的 PNG / WebP / SVG，优先放这里。

## Why This Folder

- `public/` files are copied as-is by Vite and can be referenced by stable URL paths.
- Code can use assets here without bundling imports.
- Assets stay separate from Gallery user data and from design-only docs.

运行时引用建议：

```js
const imageUrl = `${import.meta.env.BASE_URL || '/'}images/ui-assets/apps/food-delivery/platform/banners/platform-banner-weekend-food-01.png`
```

## Folder Map

```text
public/images/ui-assets/
  _inbox/                         临时收件箱：刚生成、还没筛选/压缩/命名的素材
  shared/                         多个 app 都可能复用的通用素材
    app-icons/                    通用 app 图标、启动图标、伪文件夹图标候选
    backgrounds/                  壁纸、页面背景、模糊背景、纹理背景
    category-icons/               分类图标，如食物分类、购物分类、功能分类
    decorations/                  优惠券、贴纸、票据、袋子、光效等装饰
    empty-states/                 空状态插图
    mascots/                      骑手、角色、品牌感小人、引导形象
    textures/                     颗粒、纸张、玻璃、暗纹等可复用纹理
  apps/                           某个具体 app 专属素材
    food-delivery/
      platform/
        banners/                  外卖平台首页横幅广告
        merchants/                外卖平台内部商家主图
        categories/               外卖平台分类图标
        decorations/              外卖平台装饰
      moon-bistro/
        cover/                    Moon Bistro 店铺封面
        dishes/                   Moon Bistro 菜品图
        decorations/              Moon Bistro 专属装饰
    shopping/                     购物 app 专属素材
    chat/                         Chat 专属素材
    map/                          Map 专属素材
    wallet/                       Wallet 专属素材
    appearance/                   外观/主题设置专属素材
  world-packs/                    世界包或世界观套壳专属素材
    default/
    survival-city/
  experiments/                    已筛选但暂不接入的候选方案
```

## Storage Rules

1. Put new AI-generated batches in `_inbox/` first.
2. Keep only UI-usable files in this tree: `png`, `webp`, `svg`, and occasionally optimized `jpg`.
3. Use lowercase English filenames with hyphens. Do not use spaces or Chinese filenames.
4. Prefer stable semantic names, not random export names.
5. Do not overwrite a used asset casually. Add a version suffix if needed, such as `-v2`.
6. Do not put huge source files here. PSD, Figma exports, prompt notes, and raw generation batches should stay outside runtime assets or in docs.
7. When an asset becomes official, move it from `_inbox/` to the matching app/shared/world-pack folder and reference that final path in code.

## Current Food Delivery Batch

- Platform ad banners: `apps/food-delivery/platform/banners/`
- Platform merchant photos: `apps/food-delivery/platform/merchants/`
- Platform decorative PNGs: `apps/food-delivery/platform/decorations/`
- Platform category candidates: `apps/food-delivery/platform/categories/`
- Moon Bistro shop covers: `apps/food-delivery/moon-bistro/cover/`
- Moon Bistro dish candidates: `apps/food-delivery/moon-bistro/dishes/`

The `source-sheets/` files under platform categories are grouped AI outputs. They are kept for now, but should be sliced into individual category icons before being used directly in app UI.

## Naming Pattern

```text
<scope>-<surface>-<purpose>[-variant].png
```

Examples:

```text
food-platform-banner-club.png
food-platform-merchant-sushi-hana.png
food-category-cafe.png
moon-bistro-dish-signal-soup.png
shared-decor-free-delivery-coupon.png
```

## Size Guidance

- App/banner images: `900x300`, `750x250`, or similar horizontal ratios.
- Merchant covers: `900x600` or `1200x800`.
- Dish cards: `1024x1024`, centered for circular crop.
- Transparent icons/decorations: `512x512` or `1024x1024` PNG with alpha.
- Backgrounds/wallpapers: keep source large, but ship optimized app-ready versions.

## Review Checklist Before Use

- The image has no baked-in UI text unless it is intentionally decorative and not user-facing copy.
- The image has no external brand logo or watermark.
- Transparent PNGs really have an alpha background.
- Food images remain recognizable after mobile crop.
- File name tells future contributors what it is.
- The asset has been moved out of `_inbox/` before code references it.
