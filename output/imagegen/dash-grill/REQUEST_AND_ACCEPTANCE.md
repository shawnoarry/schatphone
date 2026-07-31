# Dash Grill Asset Request And Acceptance Record

Status: candidates generated, accepted into runtime, and visually accepted on desktop Chromium and simulated Pixel 5.

## Brand capsule

- Identity: original fictional high-frequency quick-service grill for burgers, chicken, fries, wraps, shakes, and treats.
- Mood: bright, fast, crisp, tactile, appetizing.
- Palette roles: Tomato Red `#E33D2E` carries promotion energy; Mustard Yellow `#FFC833` carries price/deal highlights; Paper `#FFF9EC` is the clean product backdrop; Ink `#201A17` provides contrast and the Hero copy-safe field.
- Photography language: real food, low-to-35-degree product views, upper-left directional studio daylight, compact shadows, uncoated unbranded paper props.
- Prohibited cues: real brands, arches, mascots, uniforms, branded packaging, random text, toy-like food, clipped silhouettes.

## Slot contract

- Hero source: `1280x800`, exact `8:5`; runtime `1200x750`; UI uses full-width `object-cover` at a minimum height of `19rem`, with code copy over the left side.
- Products source: `1024x1024`; runtime `768x768`; UI reuses each file in square cards, `6.25rem` menu thumbnails, `5rem` bag thumbnails, and a `16:10` detail Hero, all with `object-cover`.
- Product safety: subject occupies roughly `70%` to `77%`, remains centered, and keeps every key silhouette inside a generous square-safe margin.

## Generation

- Mode: explicit ImageGen CLI.
- Service/model: OpenAI Image API via bundled `image_gen.py`, `gpt-image-2` default.
- Quality/format: `high`, PNG, opaque studio backgrounds.
- Request file: `requests.jsonl`.
- Candidate directory: `candidates/`.
- Runtime destination: `public/images/ui-assets/apps/food-delivery/dash-grill/`.
- Reference anchors: no cross-shop image reference is used; the code palette, menu semantics, and this brand capsule are the anchors.

## Acceptance log

- 2026-07-31 dry-run: 11 jobs parsed as `gpt-image-2`, `high`; requested Hero `1280x800` and products `1024x1024`; stable semantic filenames verified.
- Service output: Hero master `1586x992`, product masters `1254x1254`, all opaque RGB PNG. The service returned its own larger dimensions, so the candidate masters remain untouched and deterministic local exports supply the exact runtime contract.
- Candidate gate: accepted all 11 first-round candidates. The Hero keeps a stable dark left copy field and complete center-right meal; products contain no readable text, logos, arches, mascots, people, or branded packaging.
- Semantic gate: accepted one distinct image for each stable menu item. Items 01/03/04 remain visually different beef burgers; item 02 is crisp chicken; item 05 contains five tenders and one dip; items 06/07 distinguish plain and loaded fries; item 08 is a grilled-chicken vegetable wrap; items 09/10 distinguish a vanilla shake and chocolate sundae.
- Duplication gate: SHA-256 values are unique and the contact sheet shows no repeated product composition.
- Deterministic export: center-fit LANCZOS to `1200x750` for the Hero and `768x768` for products, opaque RGB PNG with optimized lossless encoding.
- Runtime paths: `public/images/ui-assets/apps/food-delivery/dash-grill/cover/dash-grill-cover-01.png` and `products/dash-grill-item-01.png` through `dash-grill-item-10.png`.
- Review artifact: `dash-grill-contact-sheet.png`.
- Rendered-page gate: passed the focused Playwright flow on desktop Chromium and simulated Pixel 5. Manual screenshot review covered the Home Hero/copy overlay, Menu thumbnails, Bag flow, and `16:10` detail image; subjects remain complete and recognizable, no delivered slot falls back to the diagnostic placeholder, no horizontal overflow was detected, and no page errors were recorded.
