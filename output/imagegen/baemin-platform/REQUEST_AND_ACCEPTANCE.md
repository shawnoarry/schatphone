# Baemin Platform Request And Acceptance

Updated: 2026-08-03

## Scope

This round addresses the user-reviewed Baemin platform advertising surfaces, entry identity, and the first multi-merchant menu gate:

- replace the rider asset whose checkerboard was baked into RGB pixels with a true-alpha PNG;
- keep the approved visual style of the three homepage banners while removing code-rendered copy layered over them;
- replace every Korean text surface in the membership banner with Simplified Chinese;
- redesign the Weekend Picks banner's left typography with a larger headline and stronger advertising hierarchy;
- deliver the contracted `3:4` Weekend Picks campaign poster with fixed advertising copy baked into the artwork;
- remove duplicate visible UI copy from the membership, weekend, and lunch campaign Hero slots.
- replace the generic dark utensils entry glyph with an original full-bleed mint app icon and code-render the `Baemin` entry name;
- generate, compare, accept, and connect one representative `768x768` menu image for each of the eleven internal merchants;
- freeze one original chicken IP anchor before generating the Crispy Chicken House pilot.
- deliver the two missing `1200x800` photographic merchant covers with distinct neighborhood-stall and tropical-advertising scene grammars;
- deliver four original `768x768` merchant marks as true-alpha RGBA PNGs;
- replace all ten Font Awesome-first category slots with original `1024x1024` true-alpha 3D PNGs while preserving the existing font-icon error fallback.
- replace the four centered-Logo discovery covers with `1360x640` merchant advertisements whose Chinese brand line and slogan are baked into the artwork; retain the transparent marks only for compact merchant identity positions.
- move each of the eleven platform merchants from the old bottom sheet into one shared route-driven full page with a wide Hero, `112x112` menu thumbnails, persistent cart access, and source-aware back navigation.

Lunch keeps its existing approved banner artwork. Membership and Weekend Picks use the revised Chinese artwork. Campaign rules, eligibility, actions, product lists, reward state, and results remain code-rendered below the Hero rather than being baked into images.

## Generation

- Mode: local `codex-image` CLI authorized by the user.
- Service/model: OpenAI-compatible Images API, `gpt-image-2` for accepted candidates.
- Request log: `requests.jsonl`.
- References: `references/` contains preserved pre-change runtime artwork.
- Candidates: `candidates/` contains generated/editable source files.
- Runtime destination: `public/images/ui-assets/apps/food-delivery/platform/`.
- Brand boundary: no official Baemin logo or mascot was generated or approximated. The rider delivery box uses an original white-heart symbol.
- Batch V2 request file: `requests-batch-v2.jsonl` contains two covers, four chroma-key merchant marks, and ten chroma-key category icons. Provider output was converted locally to RGBA; lossless masters stay in `output/`, while runtime PNGs use same-size palette reduction before being converted back to RGB/RGBA to reduce page decode cost. The original/compressed comparison is retained under `reviews/quantize-review/`.
- Merchant-cover V3 request file: `requests-merchant-covers-v3.jsonl` contains four `1360x640` advertisement requests. Accepted PNG masters stay under `candidates/merchant-covers-v3/`; runtime uses visually reviewed WebP derivatives between about `96` and `111 KB` each to avoid reintroducing preview decode stalls.

## Acceptance Log

- Rider transparency: direct transparent-output requests were rejected by the configured provider for both the default `gpt-image-2` path and a `gpt-image-1` retry. A high-fidelity chroma-magenta candidate was generated and converted locally to a true alpha channel. The accepted runtime file is `1024x1024`, RGBA PNG, and no checkerboard remains in the image pixels.
- Rider visual review: the transparent rider loads cleanly over the platform mint surface at its actual UI size. A light-background review composite is retained as `delivery-rider-mascot-transparent-v1-preview.png`.
- Membership homepage banner: the accepted `1360x496` V2 candidate preserves the mint bag, coupon, bowl, and feature-icon composition while replacing all Korean with readable Simplified Chinese. The first edit invented `3000 元`; V2 removes the amount and keeps Chinese membership/free-delivery coupon language. Runtime size is `0.70 MB`, smaller than the replaced `0.75 MB` source.
- Weekend homepage banner: the accepted `1360x496` V3 candidate keeps the approved teal-to-warm soup-rice, sushi, and pizza composition. `周末好运 / 开袋有礼` now dominates the left text area, with `周末精选`, a decorative campaign line, and `下单前先抽一次，把惊喜装进外卖袋` forming a clear secondary hierarchy. Runtime size is `0.97 MB`.
- Weekend campaign poster: the accepted `900x1200` poster uses the contracted `3:4` slot and contains the exact fixed copy `周末精选 · 限时活动`, `周末好运 开袋有礼`, `抽一次，把惊喜装进外卖袋`, and `每次活动 1 次机会`.
- UI-copy gate: homepage carousel cards and all three campaign Hero slots are image-only. Campaign meaning remains available through button `aria-label`; functional rules and actions remain visible below each Hero.
- Desktop review: homepage rider, carousel, membership campaign, lunch campaign, and weekend campaign rendered without missing images or duplicate UI copy.
- Mobile review: at `393x851`, homepage and weekend campaign have no horizontal overflow; the weekend poster reports natural dimensions `900x1200`.
- Revised-banner review: membership and weekend banners both load at natural `1360x496` on the `5174` homepage. At the actual carousel card size, Chinese text remains legible, the weekend headline has the intended larger proportion, neither text block overlaps the right-side objects, and document horizontal overflow remains false.
- Extra-slot decision: membership and lunch need no additional image slots. Weekend uses the newly delivered dedicated poster; no other campaign image position is required for this slice.
- Entry icon: V2 extends mint teal to every canvas edge so the Home UI owns the rounded clipping without white corner artifacts. The centered bag, route pin, heart, and motion mark remain clear at the real `52x52px` entry size. It contains no official Logo, wordmark, Korean characters, mascot, or readable text.
- Menu pilot gate: the accepted contact sheet `baemin-menu-pilot-contact-sheet-v1.png` confirms eleven distinct merchant families rather than one reused template. Soup rice uses warm neighborhood documentary light; sushi uses cool editorial whitespace; pizza uses oven-fire texture; salad and berry use different color-set studios; grocery uses a top-down packed catalog; noodles and dim sum use credible mobile-stall photography; bagel uses morning counter light; curry uses a tropical color set; fried chicken uses real food with the original figurine occupying a small secondary area.
- Menu runtime: every `platform/menus/<merchant>/menu-item-01.png` path now resolves to a local `768x768` PNG. The remaining `menu-item-02.png` through `menu-item-05.png` paths are intentionally still pending.
- Merchant covers: `merchant-noodle-house-01.png` is accepted as credible mobile-camera noodle-stall photography with stainless-counter context and broad noodles, braised beef, greens, and chili oil. `merchant-coconut-curry-01.png` is accepted as real food in a high-energy banana-leaf green, warm-yellow, and coral advertising set. Both remain readable under the horizontal merchant-card crop and contain no text or branding.
- Merchant marks: Berry Morning, Green Basket, Good Morning Bagel Coffee, and Elm Lane Dim Sum each have a distinct single-symbol composition. All four runtime files are `768x768` RGBA PNGs with real transparent pixels, no visible key-magenta pixels, no baked checkerboard, no readable names or letters, and no official brand approximation.
- Category icons: all ten requested themes are visually distinct at the actual `48x48px` homepage size and form one coherent original 3D family. Runtime files are `1024x1024` RGBA PNGs; the alpha diagnostic found zero strong chroma-magenta pixels above alpha 32. The review sheet `baemin-platform-batch-v2-contact-sheet.png` composites every accepted file over four ordinary light surfaces rather than a checkerboard.
- Integration: both missing photographic merchant records now resolve their local `imageUrl`. Category definitions resolve their required PNG path, render it above the old font icon, hide the font icon only after image load, and retain the font icon if image loading fails. Category image decoding is asynchronous.
- Merchant advertisements: Berry Morning uses `莓果晨光 / 把早晨装进一杯`; Green Basket uses `青禾鲜食补给站 / 今天的新鲜，18分钟送到`; Good Morning Bagel Coffee uses `早安贝果咖啡 / 咬下今天第一束光`; Elm Lane Dim Sum uses `榆树里蒸点铺 / 一笼热气，刚好到家`. Each keeps text in the left safe area and a distinct real-food plus original-character composition on the right. No UI copy overlays the artwork.
- Merchant-page integration: all eleven shops open through `platformView=merchant` and `platformMerchant=<id>` instead of `restaurantId` or a modal. The page restores Home, Search, Saved, or Campaign as its source, retains `from/homePage`, and hides the platform bottom navigation while focused on a merchant.
- Remaining count: V2 reduced the current Baemin missing set from `74` to `58`; the four V3 advertising covers reduce it again to `54`, plus the separately deferred future delayed-order illustration.

## Runtime Files

```text
public/images/ui-assets/apps/food-delivery/platform/decorations/mascot/delivery-rider-mascot-01.png
public/images/ui-assets/apps/food-delivery/platform/banners/platform-banner-member-delivery-01.png
public/images/ui-assets/apps/food-delivery/platform/banners/platform-banner-weekend-food-01.png
public/images/ui-assets/apps/food-delivery/platform/campaigns/weekend-lucky-draw-poster-01.png
public/images/ui-assets/apps/food-delivery/platform/brand/baemin-entry-icon-01.png
public/images/ui-assets/apps/food-delivery/platform/menus/*/menu-item-01.png
public/images/ui-assets/apps/food-delivery/platform/merchants/merchant-noodle-house-01.png
public/images/ui-assets/apps/food-delivery/platform/merchants/merchant-coconut-curry-01.png
public/images/ui-assets/apps/food-delivery/platform/merchants/logos/merchant-logo-*-01.png
public/images/ui-assets/apps/food-delivery/platform/merchants/covers/merchant-ad-*-01.webp
public/images/ui-assets/apps/food-delivery/platform/categories/icons/category-*-01.png
```
