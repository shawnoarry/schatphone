# Peach Cloud Dynamic Price Pilot Acceptance

Date: 2026-08-03

Status: accepted as a one-poster experiment. This is not a migration of all Peach Cloud posters and not a shared finance-system rollout.

## Scope

- Poster: White Peach Lime Sparkler / `food_menu_peach_oolong_cloud`
- Original formal asset: `public/images/ui-assets/apps/food-delivery/peach-cloud/promotions/posters/peach-cloud-poster-white-peach-lime-01.png`
- Candidate: `candidates/peach-cloud-poster-white-peach-lime-dynamic-price-pilot-01.png`
- Accepted composite: `accepted/peach-cloud-poster-white-peach-lime-dynamic-price-pilot-01.png`
- Runtime copy: `public/images/ui-assets/apps/food-delivery/peach-cloud/promotions/posters/peach-cloud-poster-white-peach-lime-dynamic-price-pilot-01.png`
- Prompt and mask records: `prompts/white-peach-lime-price-removal.md`, `prompts/white-peach-lime-price-removal.txt`, `prompts/white-peach-lime-price-mask.png`, and `prompts/white-peach-lime-price-mask-preview.png`

The original poster remains unchanged and available. The versioned runtime derivative is an additional experimental file and is excluded from the existing 33-file formal Peach Cloud pack count.

## Generation Request

- CLI: `scripts/image_gen.py edit`
- Model: `gpt-image-2`
- Quality: high
- Output size: `1024x1536` PNG
- Mask rectangle: source coordinates `x=50..395`, `y=535..700`
- Requested change: remove only the baked `26 CNY` text and reconstruct the pale-green background without adding replacement text or changing any other poster element.

The complete prompt is preserved in the two prompt records rather than repeated here.

## Candidate And Composite Decision

The generated candidate removed the price without a readable ghost and reconstructed a usable pale-green price field. It was not accepted directly because an image edit may alter unmasked pixels even when the request forbids it.

The accepted file composites only the repaired price region back onto the exact original poster with a narrow stepped blend. Pixel comparison against the original found no changed pixel outside the price-region composite bounds (`outside_bbox: None`). This preserves the original typography, product, mascot, fruit, props, lighting, color, and framing outside the accepted repair.

## Runtime Price Slot

- Position: `left: 6.6%`, `top: 35.5%`, `width: 35.5%`
- Source amount and currency: the stable Peach Cloud menu item record
- Target currency and rates: Wallet primary currency and Wallet exchange-rate table
- Fraction policy: up to two decimals for CNY/USD/EUR; zero decimals for JPY/KRW
- Layout policy: container-relative type size; longer amounts shrink; currency codes longer than three characters stack vertically

The same slot is rendered on both Peach Cloud Home and Discover/New. The other two posters still use their original baked prices and have no dynamic slot.

## Visual QA

- CNY: `26 CNY`, matched the original hierarchy and remained inside the poster.
- EUR: `3.34 EUR`, amount reduced automatically without covering the product name, drink, or release time.
- KRW: `5015 KRW`, zero-decimal formatting remained inside the independent slot.
- Mobile `393x851`: Home and Discover/New poster, product thumbnails, detail flow, and full checkout/order route passed with no horizontal overflow or page errors.
- Desktop Chromium: the same targeted Peach Cloud route and bounds checks passed.
- Browser console during the manual currency pass contained only Vite connection and hot-update debug entries; no warnings or errors.

Playwright attachments `peach-cloud-palette-home` and `peach-cloud-poster-gallery` retain the CNY route views in the targeted test result. EUR and KRW behavior is also covered by the focused component test.

## Rejected Expansion

No second or third poster was migrated in this round. A full finance-wide display conversion, shared poster schema, poster authoring UI, historical-order conversion, and live real-world rate feed all remain outside this pilot.
