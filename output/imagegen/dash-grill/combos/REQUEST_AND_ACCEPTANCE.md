# Dash Grill Complete Combo Tray Request And Acceptance

Status: `DELIVERED_ACCEPTED / CONNECTED`

Date: `2026-08-06`

## Scope

This round adds exactly two complete default-combo photographs without replacing any accepted single-item image:

- `dash-grill-double-stack-combo-01.png`
- `dash-grill-golden-chicken-combo-01.png`

Each tray contains exactly one fixed burger, one regular Sea-Salt Fries, and one unbranded Fountain Cola. The accepted `dash-grill-item-01.png` and `dash-grill-item-02.png` remain the honest single-main references and placeholders.

## Generation

- Mode: bundled ImageGen CLI, edit endpoint with three ordered reference inputs.
- Model: `gpt-image-2`.
- Quality: `high`.
- Requested output: opaque square PNG, `1024x1024`.
- Reference roles: item 01 or 02 fixes the main; item 06 fixes plain Sea-Salt Fries; the accepted Hero supplies only paper-tray, palette, and quick-service photography language.
- Exact prompts and structured request records are stored in `prompts/` and `requests.jsonl`.

## Acceptance

- Both candidates contain exactly one correct main, one plain fries serving, one cola, and one complete paper tray.
- Double Stack retains two beef patties, cheddar, pickles, onion, sesame bun, and house sauce.
- Golden Chicken retains one thick crisp fillet, shredded lettuce, pepper mayo, and a potato bun; it does not add loose chicken tenders.
- Both images use Paper, Mustard, Ink, and concentrated Tomato Red with direct-flash quick-service photography.
- No readable text, price, logo, letters, arch, mascot, people, hands, UI, watermark, or real-brand packaging is visible.
- The service returned opaque `1254x1254` RGB candidate masters. Deterministic high-quality exports produce exact `1024x1024` RGB accepted/runtime files.
- Accepted and runtime SHA-256 values match for both assets.

## Runtime Paths

```text
public/images/ui-assets/apps/food-delivery/dash-grill/combos/dash-grill-double-stack-combo-01.png
public/images/ui-assets/apps/food-delivery/dash-grill/combos/dash-grill-golden-chicken-combo-01.png
```

Both files are connected to the corresponding combo detail while the default Sea-Salt Fries and Fountain Cola remain selected. Choosing a different side or drink switches the main media back to the honest single-main image while the option map shows the selected components.
