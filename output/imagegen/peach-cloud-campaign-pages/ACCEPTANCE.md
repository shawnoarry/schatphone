# Peach Cloud Campaign Page Asset Acceptance

Accepted: 2026-08-03

Status: all six candidates are generated, accepted, connected to stable runtime paths, and visually accepted in desktop Chromium plus a `393x851` mobile viewport. Named physical-device proof remains separate.

## Generation Record

- CLI: `scripts/image_gen.py edit`
- Model: `gpt-image-2`
- Quality: high
- Master format: PNG
- Hero size: `1024x1536`
- Sensory and ingredient size: `1536x1024`
- Exact requests: `prompts/*.txt`
- Generated candidates: `candidates/*.png`
- Accepted editable masters: `accepted/*.png`
- Runtime derivatives: `public/images/ui-assets/apps/food-delivery/peach-cloud/campaigns/*.webp`

White Peach Lime used the accepted White Peach Lime poster and `products/peach-cloud-item-01.png` as its brand/composition and exact-product anchors. Waxberry Lychee used the accepted Waxberry Lychee poster and `products/peach-cloud-item-16.png`. References preserve Peach Cloud's tactile pale-green/pink paper studio and the exact drink semantics; they are not runtime dependencies for the long pages.

## Accepted Set

- `peach-cloud-white-peach-lime-campaign-hero-01.png`: one complete tall sparkling drink, white peach, green lime, mint, transparent ice, carbonation, condensation, and the established small mascot; quiet upper-left copy area remains usable.
- `peach-cloud-white-peach-lime-campaign-bubbles-01.png`: close sensory view with physically plausible glass, bubbles, fruit, ice, mint, and condensation.
- `peach-cloud-white-peach-lime-campaign-ingredients-01.png`: text-free white-peach, lime, mint, clear-ice, and sparkling-water still life.
- `peach-cloud-waxberry-lychee-campaign-hero-01.png`: one complete faceted ruby iced tea with waxberry, peeled lychee, clear ice, tea leaves, and quiet upper-left copy space.
- `peach-cloud-waxberry-lychee-campaign-ice-01.png`: close sensory view retaining ruby tea translucency, faceted glass, clear ice, waxberry texture, lychee flesh, and condensation.
- `peach-cloud-waxberry-lychee-campaign-ingredients-01.png`: text-free waxberry, lychee, tea-leaf, green-leaf, and clear-ice still life.

All first-round candidates were accepted. The two sets retain the same Peach Cloud brand capsule while remaining visibly product-specific: White Peach Lime is airy, tall, pale, and bubble-led; Waxberry Lychee is low, faceted, ruby, and jewel-like. No candidate introduces readable text, prices, logos, UI, packaging, people, extra drinks, unrelated fruit, or watermarks.

## Runtime And Page Decision

The app reads only the six WebP derivatives under `public/`; it never reads `output/`. Each product poster opens `shopView=campaign` with its stable `shopCampaign` key. The long page code-renders localized copy and the Wallet-following price over the text-free Hero, then uses the two landscape images as full-width story bands. `选择数量 / Choose quantity` opens the existing product detail and quantity sheet; no second cart or checkout owner is introduced. The mascot poster continues to open Merch.

## Visual QA

- Desktop Chromium and simulated Mobile Chrome target E2E passed both campaign routes, all six media paths, image decode, edge-tap carousel navigation, CTA-to-detail flow, mascot-to-Merch routing, and horizontal-overflow checks.
- Manual desktop and `393x851` review confirmed complete Hero subjects, readable code copy, intact landscape crops, visible CTA above the fixed navigation, and no text/product overlap.
- The Merch Hero keeps its existing image and route while replacing the old left `48%` solid-color mask with direct editorial copy, restrained translucent labels, and small decorative accents.
- Browser console review returned zero warnings and zero errors.

