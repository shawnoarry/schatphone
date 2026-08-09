# Baemin Platform Order Flow Request And Acceptance

Status: `DELIVERED_ACCEPTED / CONNECTED`

Date: `2026-08-06`

## Scope

This round adds seven isolated transparent platform illustrations without changing UI code:

- checkout takeout bag with two closed meal boxes and a blank receipt;
- order placed;
- order preparing;
- order delivering;
- order delivered;
- order cancelled;
- empty order history.

## Generation

- Mode: bundled ImageGen CLI.
- Model: `gpt-image-2`.
- Quality: `high`.
- Requested output: square `1024x1024` PNG.
- The six still-life illustrations were generated in one CLI batch from `requests-static.jsonl`.
- The delivering illustration used CLI edit mode to preserve the accepted rider identity. The first candidate is retained as rejected because the scooter faced image-left. The accepted v2 uses the non-destructive mirrored reference in `references/` and faces image-right.
- Exact accepted prompts and structured request records are retained in `requests-static.jsonl`, `prompts/delivering.txt`, and `requests.jsonl`.

## Transparency And Export

- The service returned opaque `1254x1254` RGB candidates on a flat `#FF00FF` key background.
- Alpha masters were extracted with the official helper using border auto-key, soft matte, transparent threshold `12`, opaque threshold `220`, and despill.
- Accepted/runtime exports are `1024x1024` `Format32bppArgb` PNGs. Transparent edge colors were extended before high-quality bilinear downsampling to prevent chroma-key RGB from ringing into the visible matte.
- Every runtime image has four fully transparent corners, a mix of transparent/semitransparent/opaque pixels, and zero detected visible magenta-key pixels.
- Accepted and runtime SHA-256 values match for all seven files.

## Acceptance

| Asset | Accepted semantic |
| --- | --- |
| `platform-checkout-takeout-bag-01.png` | Sealed bag, two fully closed meal boxes, and blank receipt; no food or text. |
| `platform-order-status-placed-01.png` | Sealed bag, blank receipt, and prominent teal confirmation check. |
| `platform-order-status-preparing-01.png` | Teal pass counter, two closed meal boxes, chef toque, and yellow readiness marks. |
| `platform-order-status-delivering-01.png` | Preserved rider and teal scooter moving image-right, with the delivery box at image-left. |
| `platform-order-status-delivered-01.png` | Sealed bag at a standalone door with a prominent completion check. |
| `platform-order-status-cancelled-01.png` | Calm closed bag and blank curled receipt with a coral cancellation X. |
| `platform-orders-empty-receipt-01.png` | Blank curled receipt, teal fork, and small coral heart. |

All accepted images are readable at their intended thumbnail/detail sizes and contain no readable text, price, UI, watermark, official logo, or official mascot.

## Runtime Paths

```text
public/images/ui-assets/apps/food-delivery/platform/orders/platform-checkout-takeout-bag-01.png
public/images/ui-assets/apps/food-delivery/platform/orders/platform-order-status-placed-01.png
public/images/ui-assets/apps/food-delivery/platform/orders/platform-order-status-preparing-01.png
public/images/ui-assets/apps/food-delivery/platform/orders/platform-order-status-delivering-01.png
public/images/ui-assets/apps/food-delivery/platform/orders/platform-order-status-delivered-01.png
public/images/ui-assets/apps/food-delivery/platform/orders/platform-order-status-cancelled-01.png
public/images/ui-assets/apps/food-delivery/platform/orders/platform-orders-empty-receipt-01.png
```

The seven runtime files are connected to checkout, empty Orders, and the five current order-status slots. Image-load failures still fall back to the shared diagnostic placeholder.
