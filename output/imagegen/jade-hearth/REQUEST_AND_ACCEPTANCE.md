# Jade Hearth Asset Request And Acceptance Record

Status: candidates generated, accepted into runtime, and visually accepted on desktop Chromium and simulated Pixel 5.

## Brand capsule

- Identity: original fictional contemporary Chinese shared-table restaurant, warm and refined without antique or festival staging.
- Mood: warm, restrained, tactile, communal, editorial.
- Palette roles: Ink Green `#1F4D3A` carries brand depth and the Hero copy-safe field; Cinnabar `#BD4B35` is a restrained accent; Rice Paper `#F5EFE2` and Warm Paper `#E9DECA` carry the table and background; Ink `#211E19` carries text contrast.
- Photography language: contemporary Chinese ceramic tableware, approximately 35-degree views, warm upper-left natural side light, gentle steam, compact soft shadows, realistic sauce and wok texture.
- Prohibited cues: real restaurants, branded packaging, antique plaques, palace or Lunar New Year staging, excessive red/gold decoration, random text, clipped serving vessels.

## Slot contract

- Hero source: `1280x800`, exact `8:5`; runtime `1200x750`; UI uses full-width `object-cover` at a minimum height of `22rem`, with code copy over the upper-left/left side.
- Products source: `1024x1024`; runtime `768x768`; UI reuses each file in square menu thumbnails, `4:5` Home signature crops, `4:3` small-plate crops, bag thumbnails, and a `16:10` detail Hero, all with `object-cover`.
- Product safety: subject occupies roughly `68%` to `75%`, remains center-safe, and keeps long platters, teapot handles, steam, and bowl rims inside generous margins.

## Generation

- Mode: explicit ImageGen CLI.
- Service/model: OpenAI Image API via bundled `image_gen.py`, `gpt-image-2` default.
- Quality/format: `high`, PNG, opaque studio backgrounds.
- Request file: `requests.jsonl`.
- Candidate directory: `candidates/`.
- Runtime destination: `public/images/ui-assets/apps/food-delivery/jade-hearth/`.
- Reference anchors: no cross-shop image reference is used; the code palette, menu semantics, and this brand capsule are the anchors.

## Acceptance log

- 2026-07-31 dry-run: 13 first-round jobs parsed as `gpt-image-2`, `high`; requested Hero `1280x800` and products `1024x1024`; stable semantic filenames verified.
- Service output: Hero master `1586x992`; most product masters `1254x1254`; first-round item 03 unexpectedly returned `1402x1122`. All outputs are opaque RGB PNG. Candidate masters remain untouched and deterministic local exports supply the exact runtime contract.
- First-round acceptance: accepted Hero and items 01, 02, 04 through 11. They preserve the warm upper-left side light, rice/warm-paper surfaces, contemporary green/pale ceramic language, restrained cinnabar accents, complete vessels, and distinct dish semantics.
- First-round rejection: `jade-hearth-item-03.png` was rejected because the non-square canvas reduced multi-slot crop safety even though the fish itself was correct. `jade-hearth-item-12.png` was rejected because it showed four whole tangyuan plus one cut-open tangyuan, five total.
- Targeted retry: `requests-retry-01.jsonl` generated `jade-hearth-item-03-v2.png` and `jade-hearth-item-12-v2.png`. Item 03 v2 is a strict square with the complete fish and platter; item 12 v2 contains exactly three whole tangyuan plus one cut-open tangyuan, four total. Both are accepted.
- Semantic gate: every stable item maps to its named dish and ingredients, including whole sea bass, four shrimp dumplings, lotus root rather than potato, chestnut/mushroom/tofu-skin claypot, broad knife noodles, pear/osmanthus/goji tea, and clear ginger-syrup black-sesame tangyuan.
- Duplication gate: accepted files have unique SHA-256 values and the accepted contact sheet shows no repeated dish composition.
- Deterministic export: center-fit LANCZOS to `1200x750` for the Hero and `768x768` for products, opaque RGB PNG with optimized lossless encoding. Runtime items 03 and 12 use the accepted v2 masters.
- Runtime paths: `public/images/ui-assets/apps/food-delivery/jade-hearth/cover/jade-hearth-cover-01.png` and `products/jade-hearth-item-01.png` through `jade-hearth-item-12.png`.
- Review artifacts: `jade-hearth-contact-sheet.png` for first-round candidates and `jade-hearth-accepted-contact-sheet.png` for the selected runtime set.
- Rendered-page gate: passed the focused Playwright flow on desktop Chromium and simulated Pixel 5. Manual screenshot review covered the Home Hero/copy overlay, Home `4:5` signature cards, Menu square thumbnails, Feast/Bag/Order flow, and `16:10` details; no delivered slot falls back to the diagnostic placeholder, no horizontal overflow was detected, and no page errors were recorded.
- Whole-fish crop decision: the first rendered Home review showed the sea-bass tail clipped by the shared `4:5 object-cover` treatment. The built-in `food_menu_jade_sea_bass` Home image alone now uses `object-contain` against the Rice Paper card background. The accepted runtime PNG remains unchanged, and Menu/detail crops keep their original behavior. The follow-up desktop/mobile screenshots show the complete fish and platter.
