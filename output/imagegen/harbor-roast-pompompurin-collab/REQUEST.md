# Harbor Roast x Pompompurin Collaboration Asset Request

Date: 2026-08-03
Mode: OpenAI Image CLI, `gpt-image-2`, high quality
Status: accepted masters packaged for runtime and visually accepted on actual pages

## Brand Capsule

Harbor Roast remains an original urban coffee chain using Copper `#C67C4E`, Blush `#EDD6C8`, Ink `#313131`, Line `#E3E3E3`, and Cream `#F9F2ED`. Product photography uses a warm copper counter, light cream backdrop, charcoal accents, and soft directional cafe light. This round is an explicitly requested Pompompurin character collaboration; it may depict the recognizable Pompompurin character but must not generate the Sanrio wordmark, official logos, prices, UI controls, or random text.

The packaging system has three separate layers:

1. permanent Harbor Roast paper cup body;
2. replaceable collaboration sleeve;
3. separate paper drink carrier.

The sleeve and carrier must never be mistaken for permanent printing on the cup body.

## Style Anchors

- `public/images/ui-assets/apps/food-delivery/harbor-roast/cover/harbor-roast-cover-01.png`: photography, palette, counter material, lighting.
- `public/images/ui-assets/apps/food-delivery/harbor-roast/brand/harbor-roast-captain-mascot-01.png`: original Harbor mark language and Copper/Cream balance.
- accepted base-cup and collaboration-poster candidates from this round become anchors for the remaining derivatives.

## Slot Contract

| Candidate | Runtime target | Slot | Crop / safety |
| --- | --- | --- | --- |
| `harbor-roast-paper-cup-standard-01.png` | `packaging/` | square packaging preview | complete cup and lid, no sleeve, center-safe at 112 px |
| `harbor-roast-pompompurin-sleeve-01.png` | `packaging/` | square packaging detail | cup and detached sleeve both fully visible |
| `harbor-roast-pompompurin-carrier-01.png` | `packaging/` | square packaging detail | carrier silhouette and cup slots fully visible |
| `harbor-roast-item-13.png` | `products/` | menu/detail/bag | combo complete at square thumbnail and detail size |
| `harbor-roast-carousel-pompompurin-01.png` | `campaigns/` | Home carousel | subjects on right, left 52% low-detail copy-safe area |
| `harbor-roast-pompompurin-poster-01.png` | `campaigns/` | activity Hero | portrait, subject lower/right, top-left title-safe area |
| `harbor-roast-pompompurin-story-01.png` | `campaigns/` | activity story band | wide exploded packaging view, all three layers readable |

Runtime reads only accepted copies under `public/images/ui-assets/apps/food-delivery/harbor-roast/`. This output directory retains prompts, candidates, acceptance reasons, and editable masters.
