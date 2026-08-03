# Harbor Roast x Pompompurin Asset Acceptance

Date: 2026-08-03
Model path: OpenAI Image CLI, `gpt-image-2`, high quality
Status: accepted masters copied to stable runtime paths and visually accepted

## Accepted Group

| Master | Decision | Runtime target |
| --- | --- | --- |
| `accepted/harbor-roast-paper-cup-standard-01.png` | Accepted because the cream cup, charcoal lid, and small copper anchor read as permanent Harbor packaging without collaboration printing. | `public/images/ui-assets/apps/food-delivery/harbor-roast/packaging/harbor-roast-paper-cup-standard-01.png` |
| `accepted/harbor-roast-pompompurin-sleeve-01.png` | Accepted because detached and assembled sleeve states make the replaceable campaign layer explicit. | `public/images/ui-assets/apps/food-delivery/harbor-roast/packaging/harbor-roast-pompompurin-sleeve-01.png` |
| `accepted/harbor-roast-pompompurin-carrier-01.png` | Accepted because the handled kraft carrier remains visibly separate from the cup and reads as the combo transport layer on the activity page. | `public/images/ui-assets/apps/food-delivery/harbor-roast/packaging/harbor-roast-pompompurin-carrier-01.png` |
| `accepted/harbor-roast-item-13.png` | Accepted because the drink, custard tart, removable sleeve, carrier, and character figure remain complete in a square crop. | `public/images/ui-assets/apps/food-delivery/harbor-roast/products/harbor-roast-item-13.png` |
| `accepted/harbor-roast-carousel-pompompurin-01.png` | Accepted because the product group stays right-weighted with useful left-side copy space. | `public/images/ui-assets/apps/food-delivery/harbor-roast/campaigns/harbor-roast-carousel-pompompurin-01.png` |
| `accepted/harbor-roast-pompompurin-poster-01.png` | Accepted as the portrait campaign atmosphere image; the code-rendered product contract remains anchored by the exact square combo image. | `public/images/ui-assets/apps/food-delivery/harbor-roast/campaigns/harbor-roast-pompompurin-poster-01.png` |
| `accepted/harbor-roast-pompompurin-story-01.png` | Accepted because the base cup, detached sleeve, assembled cup, and carrier are readable as a sequence. | `public/images/ui-assets/apps/food-delivery/harbor-roast/campaigns/harbor-roast-pompompurin-story-01.png` |

## Rejection Notes

- No candidate may be used from `output/` at runtime.
- The permanent cup must never be described as a collaboration cup; the Pompompurin artwork belongs to the removable sleeve and carrier only.
- Generated text and official Sanrio wordmarks are not accepted as UI copy or identity assets. All campaign copy is rendered in code.

## Actual-Page QA

- Focused Playwright passed in desktop Chromium and Mobile Chrome for Home, all four campaigns, the menu packaging deck, customized detail, activity CTA, Bag, checkout, and order detail.
- Manual default-desktop and `393x851` review passed for the coffee board, permanent-cup/sleeve previews, rectangular product detail, activity Hero, packaging story, base-cup/sleeve/carrier modules, and combo CTA.
- The activity Hero leaves the next section visible at `393x851`; the product group, Pompompurin character, cup, sleeve, carrier, tart, and ceramic latte stay complete in the accepted portrait crop.
- All `data-required-asset` images decoded, page-level horizontal overflow was false, and the in-app browser reported no warning or error console entries.
- The carrier reads as a separate handled combo caddy. It is intentionally not presented as a ring tray, permanent cup print, or removable sleeve.
