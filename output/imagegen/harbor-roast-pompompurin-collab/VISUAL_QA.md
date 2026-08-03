# Harbor Roast Collaboration Visual QA

Date: 2026-08-03
Status: passed on desktop Chromium and simulated mobile; named physical-device proof remains separate

## Automated Route Check

Command:

```text
npx.cmd playwright test e2e/food-delivery-harbor-roast.spec.js --project=chromium --project=mobile-chrome
```

Result: `2 passed`.

Covered states:

- Home carousel with four campaign slides and decoded Harbor assets;
- Pompompurin activity route with six decoded page assets;
- direct collaboration-combo add and restaurant-scoped Bag removal;
- Menu packaging deck and five real sections;
- absence of the generic Harbor Menu quick-add button;
- iced, `16oz`, removable-sleeve selection and `42.00 CNY` selected unit price;
- localized selection copy in Bag and submitted order detail;
- Supply/detail, mixed cash/gift checkout, pickup/dine-in routing, order illustration;
- page-level horizontal overflow.

## Manual Crop Check

Default in-app desktop viewport:

- Menu board has stable number/content/price columns and no clipped order controls.
- Permanent cup and campaign sleeve previews remain distinct and complete.
- Activity Hero copy stays inside its title-safe area; product and character subjects remain unobstructed.

`393x851` viewport:

- Hero measured `378x472.5` inside a `393x851` page and leaves the opening of the next section visible.
- Coffee-board rows, package previews, segmented controls, size controls, packaging controls, and CTA labels fit without horizontal overflow.
- Story band and all three packaging modules retain complete cup, sleeve, and carrier silhouettes.
- Combo image keeps drink, tart, sleeve, carrier, and figure readable above the CTA.

Browser evidence:

- broken required assets: `[]`;
- document horizontal overflow: `false`;
- warning/error console entries: `[]`.
