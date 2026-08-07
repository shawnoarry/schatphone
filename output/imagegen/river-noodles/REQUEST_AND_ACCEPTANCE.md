# River Noodles Asset Request And Acceptance Record

Status: `DELIVERED_ACCEPTED / CONNECTED / VISUALLY_REVIEWED`

Date: `2026-08-07`

## Scope

This round delivers the complete River Noodles formal pack without changing menu, cart, checkout, order, or persistence behavior:

- one `1200x750` shop cover;
- nine `768x768` menu photographs;
- stable runtime paths already owned by the Food Delivery store.

## Generation

- Mode: bundled ImageGen CLI, explicitly selected by the user as the default SchatPhone raster-generation path.
- Model: `gpt-image-2`.
- Quality: `high`.
- Request file: `requests.jsonl`; it is the final prompt set for all ten distinct jobs.
- Execution: `generate-batch` with concurrency `5`.
- Candidate directory: `candidates/`.
- Service output: the cover candidate is an opaque `1586x992` RGB PNG; all product candidates are opaque `1254x1254` RGB PNGs.
- No reference from another shop was used. The batch follows River Teal, porcelain, restrained lacquer red, broth amber, natural window light, varied teal-glazed vessels, and the existing menu semantics.

## Acceptance

- The cover contains clear-broth beef noodles, tomato beef noodles, sesame-scallion dry noodles, cucumber salad, and lotus root, with a stable deep-teal field on the left.
- Product files map one-to-one to the nine menu records: four soup noodles, two dry noodles, two side plates, and one plum cooler.
- Soup, dry-noodle, side-plate, and tall-glass silhouettes remain distinct; the set does not reuse one bowl composition for every item.
- The pickled-mustard fish image shows boneless white-fish slices, mustard greens, golden sour broth, and noodles rather than chicken or tofu.
- No accepted image contains readable text, price, logo, people, real-brand packaging, antique signage, UI, or watermark.
- All ten candidate files have unique SHA-256 values.

## Deterministic Delivery

- Candidate masters remain untouched.
- LANCZOS exports produce one exact `1200x750` RGB cover and nine exact `768x768` RGB product PNGs with optimized lossless encoding.
- Final masters live under `accepted/cover/` and `accepted/products/`.
- Accepted and runtime SHA-256 values match for all ten files.
- Runtime reads only `public/images/ui-assets/apps/food-delivery/river-noodles/`.

## Rendered Gate

- `e2e/food-delivery-discovery-templates.spec.js` passes in desktop Chromium and simulated Pixel 5.
- The shop identity resolves the local `1200x750` cover; menu cards and shared item detail resolve local `768x768` product files.
- The test rejects hidden/broken product images and the component's `is-image-fallback` error state.
- Category switching, detail open/close, App Store template reassignment, page/console errors, and horizontal overflow pass.
- The shared item-detail control row now sits above its `z-10` image, so close and edit controls remain clickable.
- Final desktop/mobile menu and detail screenshots are reviewed in `output/imagegen/food-delivery-river-sugar-playwright-review.png`.

This is simulated-browser evidence, not named physical-device proof.
