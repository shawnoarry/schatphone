# Daylight Cafe Asset Request And Acceptance Record

Status: candidates generated, accepted into runtime, and visually accepted in desktop Chromium and at `393x851` mobile.

## Brand capsule

- Identity: original fictional bright neighborhood corner cafe for espresso, cold coffee, brunch, and morning bakes.
- Mood: clear, airy, fresh, tactile, optimistic without toy-like styling.
- Palette roles: Sun Yellow `#F4C95D` carries warmth; Sky `#B8DCE8` carries freshness; Cream `#FFF7E8` is the stable terrazzo field; Leaf `#4E725F` is a restrained botanical accent; Espresso `#4B2E25` anchors coffee and contrast.
- Photography language: approximately 40-degree views, upper-left bright morning window light, transparent short shadows, light terrazzo, modern ceramic and clear glass.
- Controlled variation: cream and sky ceramic cups, clear tall glasses, white plates, and plain unbranded bakery paper may vary by product while camera distance, morning light, surface, and subject scale remain stable.
- Prohibited cues: real brands, readable text, cup-sleeve logos, people, dark rustic cafe staging, UI, watermarks, clipped silhouettes, toy-like food.

## Slot contract

- Hero source request: `1280x800`, exact `8:5`; runtime target `1200x750`. The generic store facade displays it through a shallow full-width `object-cover` banner, so all Hero subjects remain in a compact center-right horizontal band with broad outer margins.
- Products source request: `1024x1024`; runtime target `768x768`. The generic facade reuses each file in a `56x56` square thumbnail and an approximately `2.25:1` detail image, both with `object-cover`.
- Product safety: the main subject occupies roughly `68%` to `72%`, stays centered and horizontally legible, and preserves cups, handles, plate rims, bread, pastry, and glass rims inside generous crop-safe margins. Runtime exports must not distort or destructively recompose the accepted master for one slot.

## Generation

- Mode: explicit ImageGen CLI authorized by the user.
- Service/model: OpenAI Image API via bundled `image_gen.py`, `gpt-image-2` default.
- Quality/format: `high`, PNG, opaque photographic backgrounds.
- Full request file: `requests.jsonl`.
- Pilot request file: `requests-pilot.jsonl` for Hero, latte, egg croissant, and vanilla cold brew.
- Candidate directory: `candidates/`.
- Runtime destination: `public/images/ui-assets/apps/food-delivery/daylight-cafe/`.
- Reference anchors: the Daylight Cafe menu semantics, code palette, UI crop geometry, and this brand capsule. No cross-shop image reference is used.

## Acceptance log

- 2026-07-31 preparation stage: verified one Hero plus nine product paths against the current seed menu and inspected the generic facade's identity, square thumbnail, and shallow detail crops; no candidate or runtime PNG had been accepted at that point.
- 2026-07-31 dry-run: the four-job pilot and six-job remainder parsed as `gpt-image-2`, `high`; stable semantic filenames and output locations were verified before live generation.
- Pilot transport note: the first four-job process was interrupted after writing item 01. The accepted item 01 master was preserved, and `requests-pilot-retry-01.jsonl` generated only the missing Hero, item 04, and item 09 without overwriting it.
- Service output: the Hero master is `1586x992`; all nine product masters are opaque RGB `1254x1254` PNGs. Candidate masters remain untouched; deterministic local LANCZOS exports supply exact runtime dimensions.
- Candidate gate: accepted all ten first-round images. The Hero contains one latte, one egg croissant, one avocado-ricotta toast, and one orange espresso tonic with a stable cream left field. Products contain no readable text, logos, people, real-brand packaging, UI, or watermarks.
- Semantic gate: each stable menu item maps to its named drink, brunch plate, or bake. The two hot coffees remain visibly different; orange espresso tonic and vanilla cream cold brew have different liquid, garnish, and color structures; the three brunch dishes preserve their named bread, egg, cheese, vegetable, and mushroom ingredients; the croissant and lemon-poppy loaf remain distinct single bakes.
- Brand-continuity gate: every image uses bright upper-left morning window light, light terrazzo, airy short shadows, natural food color, and controlled Sun/Sky/Leaf accents while cups, clear glasses, white plates, and plain bakery paper vary by product.
- Duplication gate: all ten accepted files have unique SHA-256 values, and `daylight-cafe-contact-sheet.png` shows no repeated product composition.
- Deterministic export: direct ratio-preserving LANCZOS resize to `1200x750` for the Hero and `768x768` for products, opaque RGB PNG with optimized lossless encoding.
- Runtime paths: `public/images/ui-assets/apps/food-delivery/daylight-cafe/cover/daylight-cafe-cover-01.png` and `products/daylight-cafe-item-01.png` through `daylight-cafe-item-09.png`.
- Rendered-page gate: passed desktop Chromium and `393x851` mobile review. All runtime images report their exact natural dimensions and complete load state; square thumbnails stay recognizable; horizontal `scrollWidth` equals `clientWidth`; console warning/error logs are empty.
- Crop decision: the generic shallow detail slot's `object-cover` treatment clipped cup rims, glass bases, and plated silhouettes in `daylight-cafe-object-cover-preview.png` and the first rendered cold-brew review. Daylight Cafe detail images alone now use `object-contain` on Cream, while menu thumbnails retain `object-cover` and runtime files remain unchanged. The shop identity image uses a `68%` horizontal focal point to retain the center-right Hero subjects.
