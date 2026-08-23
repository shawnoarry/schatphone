# Shopping 29CM Product-Grade Execution Brief

Status: `RUNTIME_INTEGRATED / ACCEPTED_MEDIA_CONNECTED`
Prepared: 2026-08-22
Executor: Luna Max
Product lead and final reviewer: Codex
Target storefront: 29CM / `nova_digital` / `tech_catalog`

Completion update, 2026-08-22: the user accepted all 62 masters through the grouped contact sheets. The accepted media now ships as 63 optimized runtime derivatives, including the motion poster, with a project-owned hash manifest. Home, Collection/Search, all nine PDPs, `OWNERS' NOTES`, and downstream 29CM transaction/state pages use the semantic media contract. Full lint, 303 Vitest files / 2187 tests, production build, and the desktop/mobile Shopping storefront E2E gate pass.

## 1. Authority And Purpose

This document is an execution brief subordinate to the current project authorities. It is not a second roadmap, package handoff, or independent backlog.

Read and obey, in order:

1. `AGENTS.md` and the current user request.
2. `docs/process/AI_WORK_MODE.md`.
3. `docs/roadmap/TODO_ROADMAP.md`.
4. `docs/pm/commerce-finance-and-assets/README.md`.
5. `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`.
6. `docs/process/VISUAL_WORKFLOW.md`.
7. `docs/process/DEVELOPMENT_TOOLING.md`.
8. `docs/design/SHOPPING_STOREFRONT_BRAND_UI_AND_ASSET_GUIDE.md`.
9. This focused brief.

The objective is to turn the existing 29CM Shopping storefront into the first genuinely product-grade, publishable Shopping mini app: complete media, coherent information depth, storefront-specific discovery, storefront-specific transaction presentation, strong product detail, robust states, and verified mobile/wide composition.

The implementation must demonstrate the quality bar for later stores without turning 29CM into a generic template that other stores inherit.

## 2. Goal, Scope, Acceptance, And Risks

### 2.1 Goal

Create a complete “quiet editorial commerce” experience around fictional objects worth keeping. The finished storefront must feel like an independent product whose discovery, product understanding, purchase review, order archive, delivery journal, and care experience all belong to one visual and interaction system.

### 2.2 In Scope

- Recompose the 29CM Home, collection/search, PDP, Bag, Checkout, Orders, Order Detail, Delivery Journal, and Object Care pages.
- Generate, review, publish, and integrate one focused first-release media pack of 62 creative masters, including 21 owner-review images for the future `OWNERS' NOTES` surface.
- Add storefront-specific loading, empty, error, offline, and media-failure states.
- Refine responsive composition, accessibility, motion, reduced motion, and missing-media fallbacks.
- Add or update focused tests and visual evidence required by the changed route family.
- Adjust media containers after accepted assets exist, including aspect ratio, focal crop, safe areas, and responsive height.

### 2.3 Out Of Scope

- Redesigning the other ten Shopping storefronts.
- Building a shared storefront template from the 29CM implementation.
- Changing Shopping persistence schema, product IDs, service IDs, order IDs, Wallet money contracts, or backup semantics.
- Creating cross-store carts, mixed checkout, a Shopping aggregate hub, or an in-app storefront switcher.
- Importing official 29CM campaigns, catalog, product images, advertisements, prices, copy, or logos into generated media.
- Claiming official affiliation, current official services, delivery promises, designers, specifications, real-world reviews, rankings, or endorsements.
- Treating seeded fictional owner notes as real-user endorsements, or building moderation, merchant-reply, social-follow, or cross-store review aggregation in this slice.
- Completing the long-term 135-slot 29CM library in this slice.

### 2.4 Completion Acceptance

The work is complete only when all conditions below are true:

1. Every route family has a distinct 29CM information hierarchy, not only matching colors.
2. Home, collection/search, and PDP form one continuous editorial-to-commerce journey.
3. All nine stable products have accepted main, detail, context, owner-scene, and owner-detail media; keyboard, stone tray, and carry-on also have one accepted owner follow-up image each.
4. Price, inventory, quantity, delivery facts, order status, controls, and localized variable copy remain code-native.
5. The 62-master pack is reviewed through role-specific contact sheets before runtime promotion.
6. Missing or failed media leaves every route usable and visually intentional.
7. `zh-CN` and `en-US` remain accurate and do not mutate persisted user-authored records.
8. Mobile and wide layouts pass visual review without horizontal overflow, clipped controls, or illegible text.
9. Reduced-motion behavior preserves hierarchy and task completion.
10. Shopping ownership, `serviceKey` isolation, hydration, backup restore, order snapshots, and Wallet quote behavior remain intact.
11. Required validation passes, and the final handoff records exact assets, files, tests, evidence, and remaining risks.

### 2.5 Main Risks

| Risk | Failure Pattern | Required Prevention |
| --- | --- | --- |
| Template regression | Reusing generic hero, tabs, cards, and order panels with new colors | Design each page from 29CM’s product thesis and route purpose; do not export a shared facade |
| Media-first decoration | Images look attractive but do not improve navigation or product understanding | Freeze IA and media roles before generating finals |
| Uncontrolled batch publication | A large candidate batch is mistaken for accepted runtime media before the commerce, editorial, and owner-review roles are reviewed together | Allow dependency-wave candidate generation when explicitly authorized, but keep runtime publication behind consolidated contact-sheet review |
| False community polish | Buyer-show media looks like another campaign shoot or carries fake social proof | Keep owner media visibly personal, text-free, and separate from code-rendered review identity, rating, and copy |
| Baked commerce truth | Price, discount, stock, buttons, ranking, delivery, or other changing commerce facts appear inside images | Permit approved fixed fictional campaign copy, but keep changing facts and interactive commands code-native |
| Brand copying | Official layouts, campaigns, products, logos, or visual assets are reproduced | Use real brands only as reference grammar; all content remains fictional |
| Product inconsistency | The same fictional product changes form, color, material, or proportions across images | Freeze a product visual bible after calibration and use accepted main images as references |
| Runtime/publishing drift | Accepted candidates differ from published derivatives or registry paths | Hash, compare, and record every promoted derivative |
| Dirty-worktree damage | Unrelated user changes are overwritten or committed | Inspect status and diffs before editing; preserve all unrelated files |
| Accessibility loss | Editorial styling weakens contrast, focus, keyboard, or readable order | Treat accessibility as a release gate, not cleanup |

## 3. Frozen Product And Data Contracts

Shopping remains the owner of products, favorites, cart, checkout, orders, logistics, service notifications, persistence, and backup/restore behavior.

Do not rename, replace, merge, or repurpose these IDs:

1. `shopping_seed_digital_lens`
2. `shopping_seed_digital_headphones`
3. `shopping_seed_digital_projector`
4. `shopping_seed_digital_keyboard`
5. `shopping_seed_nova_bedside_radio`
6. `shopping_seed_nova_stone_tray`
7. `shopping_seed_nova_letter_set`
8. `shopping_seed_nova_carry_on`
9. `shopping_seed_nova_fountain_pen`

Additional non-negotiable contracts:

- Keep the stable service key `nova_digital` and storefront template key `tech_catalog`.
- Every visible cart/order query remains scoped by `serviceKey`.
- Normal hydration may insert only missing built-in IDs and must not overwrite same-ID saved products.
- Explicit backup restore remains snapshot-faithful; do not silently reseed or rewrite restored records.
- User-authored product/order fields remain literal and are not rewritten during localization.
- Existing Wallet quote and formatting services remain the only source for user-facing money.
- Order and logistics pages show only stored owner truth; do not fabricate progress or human support availability.

## 4. Current Baseline And Observed Defects

### 4.1 Useful Existing Foundations

- The route family already covers Home, collection, PDP, Bag, Checkout, Orders, Order Detail, Logistics, and Care.
- Home already has an Issue masthead, `OBJECTS / LOOKBOOK` switching, Issue Index, categories, and editorial language.
- PDP already includes Editor’s Note, material/life/care sections, related objects, and a stable purchase action.
- Bag, Checkout, Orders, Delivery Journal, and Object Care already use archive/journal terminology rather than generic Shopping wording.
- Product and order state are already isolated under Shopping ownership.

### 4.2 Defects To Correct

- Actual 29CM product photography and editorial media are absent; most surfaces rely on icon/code placeholders.
- Home still behaves too much like one long page with a hero followed by a product grid.
- Category navigation does not yet produce enough information-depth difference between an Issue, a category collection, search results, and saved objects.
- Cards remain the dominant planning unit; they do not carry enough editorial context or varied scale.
- The current hero composition is visually improved but still depends on a familiar image-plus-copy overlay convention.
- The Home hierarchy does not yet make the four Issues, editorial modules, material studies, and object groupings feel like authored content.
- PDP has the correct section names but not the media density, object continuity, sticky purchase logic, or detailed reading rhythm expected of a product-grade commerce page.
- Transaction pages have storefront-specific copy but need stronger spatial hierarchy, responsive behavior, media continuity, states, and interaction polish.
- Empty/error/offline/media-failure states are inconsistent or represented as plain text boxes.
- Wide composition is mostly a larger grid rather than an intentional editorial layout.

## 5. Product Thesis

### 5.1 Core Proposition

**Quiet editorial commerce / objects worth keeping.**

The storefront should answer four questions in sequence:

1. Why is this object worth noticing?
2. What is it made of and how does it live in a space?
3. Is it right for the user’s actual routine?
4. How is the choice preserved after purchase?

### 5.2 Experience Principles

- Discovery before density: one authored idea should lead each viewport, not a wall of equal cards.
- Objects before promotions: do not use urgency, fake countdowns, excessive badges, or discount theater.
- Context before specification: introduce form, material, use, and care before dense attributes.
- Stable commerce: price and action remain visible when needed, without interrupting editorial reading.
- Archive after purchase: Bag, order, delivery, and care surfaces preserve the reason and context of selection.
- Controlled irregularity: image scale and alignment may vary, but spacing, type, and interaction rules remain disciplined.

### 5.3 Reference Boundary

Real 29CM and other editorial-commerce products may inform:

- content-first discovery;
- restrained black/white/warm-grey/orange grammar;
- issue covers and editorial indexes;
- asymmetrical but legible product composition;
- brand/story/material context before ordinary merchandising;
- calm transitions and deliberate whitespace.

They may not supply:

- official campaigns, catalog, product photography, product names, prices, claims, logos, or ad copy;
- traced screen layouts or page-for-page reproduction;
- official Korean wording presented as SchatPhone fact;
- affiliation or service claims.

When the official reference is repetitive or commercially generic, prefer stronger editorial and product-design references from other uncollected design-commerce apps, museum shops, design publications, and product journals. Extract principles, never copy a screen.

## 6. Information Depth Map

### L0 — Storefront Orientation

Purpose: establish current Issue, search, bag state, and editorial identity.

Surfaces:

- compact masthead;
- Issue identity and edition number;
- search entry;
- Bag and saved-object access;
- four top-level desks: `ISSUES`, `OBJECTS`, `JOURNAL`, `ARCHIVE`.

Do not expose Logistics as a universal storefront category. Delivery belongs to Archive/order context, not product discovery.

### L1 — Authored Discovery

Purpose: present an editorial reason to browse.

Surfaces:

- active Issue cover and synopsis;
- Issue rail;
- current selection;
- Objects in Use;
- material studies;
- category/collection entrances;
- saved and recently viewed continuation.

### L2 — Collection And Search

Purpose: support scanning, comparison, filtering, and result comprehension.

Surfaces:

- Issue collection;
- category collection;
- search results;
- saved objects;
- editorial lookbook chapter.

This level may use product tiles, but not one universal grid. Use a lead object, paired comparisons, text-only index rows, and secondary compact results according to context.

### L3 — Object Understanding And Ownership

Purpose: support a confident choice and preserve it after purchase.

Surfaces:

- PDP;
- Bag;
- Checkout;
- Orders and Order Detail;
- Delivery Journal;
- Object Care.

## 7. Target Page Architecture

## 7.1 Home

### Purpose

Create an authored edition, not a storefront banner followed by a catalog.

### Required Order

1. **Compact masthead**
   - Back, 29CM text identity, edition code, search, saved objects, and Bag.
   - Mobile keeps one-line task priority; wide may split wordmark and utility rail.
   - No oversized pill navigation and no Logistics category.
2. **Issue stage**
   - Full-bleed or edge-anchored cover media with a separate, stable editorial title block.
   - Four Issues are user-controlled; no automatic carousel.
   - Each Issue has a distinct composition rather than only replacing the image.
3. **Issue contents**
   - A numbered index that jumps to Home sections or opens the relevant collection.
   - Titles remain code-native and localized.
4. **Lead object essay**
   - One anchor product at large scale, with short editor note, material cue, and PDP entry.
   - No quick-add over the media; the primary action is to understand the object.
5. **Object pair / comparison spread**
   - Two related products with contrasting use or material logic.
   - Use asymmetric media and a shared editorial caption.
6. **Objects in Use**
   - One contextual image with three product anchors or an adjacent product index.
   - Hotspots must be keyboard reachable and have visible focus.
7. **Material Study**
   - One material board, short care note, and links to relevant PDP sections.
8. **Current selection**
   - A varied editorial shelf: one tall object, two compact objects, one text-led index.
   - Avoid a uniform two-column card wall.
9. **Issue rail**
   - Four cover thumbnails with number, theme, and progress state.
   - Horizontal snap on mobile; visible controls and no hidden drag-only interaction.
10. **Continue**
   - Saved objects, recent objects, Archive, and Care entrances.
   - Show only truthful state and hide empty modules gracefully.

### Home Interaction Detail

- Search opens a dedicated result state; it does not filter the Home in place while the user types.
- `OBJECTS / LOOKBOOK` becomes a collection presentation choice inside L2, not a global Home mode that reflows every section.
- Opening the Issue Index expands in place and preserves scroll position.
- Issue changes crossfade media and update the title/index without auto-advancing.
- Bag count updates without layout shift.

## 7.2 Collection And Search

### Required Variants

1. **Issue Collection** — cover-led, chapter-based, text and media interleaved.
2. **Category Collection** — lead object plus comparison shelves and a compact full index.
3. **Search Results** — query-first, filter/sort disclosure, result count, clear recovery.
4. **Saved Objects** — personal archive wall with saved date/order if truthful.
5. **Lookbook** — context-led sequence; products are inserted into chapters rather than forced into equal cards.

### Collection Rules

- Keep collection title, count, filter state, and clear/back actions visible.
- Use pagination or explicit “next chapter” navigation; do not render an indefinitely growing single page.
- Preserve route/query state through PDP entry and back navigation.
- Mobile supports two density modes only when useful: editorial and compact index.
- Wide layouts may use a 12-column grid, but visual order must remain logical in DOM order.
- Search with zero results provides query editing, category alternatives, and a return to current Issue.

## 7.3 Product Detail Page

### Required Structure

1. **Media opener**
   - Main product image at `4:5` or product-honest ratio.
   - Back, save, share, and media progress remain accessible.
   - Mobile may use swipe; wide uses a vertical media rail plus sticky purchase summary.
2. **Object identity**
   - Fictional title, category/collection, concise description, price, stock state, gift/asset eligibility when truthful.
   - No unverified manufacturer, designer, award, or specification.
3. **Stable purchase action**
   - Quantity and Add to Bag remain reachable without covering content.
   - Respect safe area and software keyboard.
   - Sold-out state has a clear disabled reason, not only reduced opacity.
4. **Editor’s Note**
   - Explain selection rationale in localized code text.
5. **Material / Detail**
   - Use the accepted detail image and one material board where relevant.
   - Any dimensions/specs are fictional approved data rendered in HTML/SVG, never inferred from the generated image.
6. **Object in Life**
   - Use the context image to show scale and use without inventing people-dependent claims.
7. **Care**
   - Practical maintenance and storage guidance; link to Object Care.
8. **Owners' Notes**
   - Show a code-rendered review summary, common-use tags, and a small strip of accepted owner-review media.
   - Owner photos are a third photographic mode, not alternate product mains or reused editorial context images.
   - Seeded notes must be explicitly fictional SchatPhone world data; verified-purchase language is allowed only when linked to a Shopping-owned completed order.
9. **Delivery and return facts**
   - Show only existing Shopping truth or neutral “confirmed at review” language.
10. **Related objects**
   - Three to four items selected by explicit category/material logic.
   - Use media-led compact rows, not the same Home card component.

### PDP Continuity

- Every product’s main, detail, and context images must depict the same object identity.
- Owner-scene, owner-detail, and owner-follow-up images must preserve that identity while allowing personal framing, ordinary phone-camera exposure, natural clutter, and minor composition imperfection.
- Preserve the collection/Issue source in navigation and return behavior where the current route contract permits.
- Add-to-Bag confirmation should be a restrained bottom confirmation or inline state, not a blocking modal.
- Long content must not push the purchase action off-screen without a recovery path.

## 7.4 Bag

Product concept: **Considered Bag / an editable object list**.

- Lead with selected objects and the reason for reviewing them together.
- Use a compact media row per object, quantity controls, subtotal, remove action, and direct return to PDP.
- Keep gift controls progressively disclosed; do not make the empty recipient fields permanent noise.
- Provide a calm summary panel with total, object count, gift state, and Checkout action.
- Empty Bag uses the branded “open paper sleeve” state illustration and returns to the current Issue.
- Mobile keeps the total/checkout action sticky; wide uses a persistent summary column.

## 7.5 Checkout

Product concept: **Final Edit / Order Review**.

- Show order lines, quantities, price truth, recipient/gift state, address/delivery truth, and final total.
- Use a numbered editorial proof layout, but do not hide standard commerce facts behind prose.
- The place-order action must have an explicit disabled/loading/success/failure state.
- Failure preserves all inputs and provides a visible retry.
- Do not invent delivery windows or support confirmation.

## 7.6 Orders

Product concept: **Purchase Archive**.

- Use time-based archive entries with order status, item count, total, and a representative object image.
- Separate active and completed/cancelled records when truthful.
- Empty Archive uses a branded closed-folder illustration and links back to Issues.
- Delivery Journal is an Archive subtask, not a top-level shopping category.

## 7.7 Order Detail

Product concept: **Object Dossier**.

- Cover section: order identity, status, total, object count, created date.
- Object section: every line item, snapshot title, quantity, unit/subtotal, and image fallback.
- Delivery notes: only stored events, in chronological order, with clear current status.
- Gift/recipient information appears only when present.
- Valid actions remain explicit: complete, cancel, delete, or return.
- Destructive action requires confirmation and must not be visually adjacent to the primary safe action.

## 7.8 Delivery Journal

Product concept: **A factual travel log for purchased objects**.

- Show active deliveries first, then completed entries.
- Each entry includes one object thumbnail, latest stored event, date, status, and Order Detail link.
- Use a vertical editorial timeline rather than generic parcel cards.
- Missing events use honest empty language; never simulate location, ETA, or courier activity.
- Offline state shows cached owner truth plus an offline notice, without implying refresh succeeded.

## 7.9 Object Care

Product concept: **Care organized around objects, not ticket numbers**.

- Start with care philosophy, then expose three tasks: material guidance, purchase source, delivery/order evidence.
- Show product-specific care links for owned products where data exists.
- Do not present a fake live-agent status, queue, or response time.
- If contact/service routing exists, label the action truthfully and preserve source order context.
- Use the material-board visual language, not generic help-center accordions.

## 7.10 Loading, Empty, Error, Offline, And Media Failure

Every route must define all relevant states:

| State | Presentation | Behavior |
| --- | --- | --- |
| Initial loading | Paper-grey structural skeleton matching final layout | No fake product text; respect reduced motion |
| Empty collection | Branded object-frame illustration plus recovery links | Keep filters/query editable |
| Empty Bag | Open paper sleeve illustration | Return to current Issue or saved objects |
| Empty Archive | Closed archive folder illustration | Return to Issues |
| Recoverable error | Ink/orange editorial notice with retry | Preserve inputs and route state |
| Offline | Cached content plus clear offline label | Disable impossible network action truthfully |
| Media failure | Product-specific silhouette or material swatch fallback | Keep title, price, CTA, and alt behavior usable |
| Order submission pending | Stable button width and progress label | Prevent duplicate submit |

Generated state art is decorative/supporting; essential text and actions remain HTML.

## 8. Responsive Composition

### 8.1 Mobile Baseline

Primary visual QA viewport: `393x851`.

- Respect safe areas and app-level back behavior.
- One dominant idea per viewport; avoid stacking multiple sticky bars.
- Minimum interactive target follows the project accessibility baseline; icon-only actions require accessible labels.
- Horizontal rails expose visible next/previous affordances or scroll position.
- Preserve 16px minimum body gutter, with full-bleed media allowed only by deliberate section rule.
- PDP purchase action must not obscure the last content or browser/app chrome.
- Text never becomes part of a raster image merely to preserve composition.

### 8.2 Narrow Fallback

Check at `320px` width:

- no single-word clipping in controls;
- no forced two-column product layout;
- no overlapping Issue title and utility actions;
- no hidden quantity or destructive action;
- no horizontal document overflow.

### 8.3 Wide Layout

Primary visual QA viewport: project default desktop plus at least `1365x900`.

- Do not stretch the mobile column to full width.
- Use a centered editorial canvas with controlled max widths and intentional full-bleed breaks.
- Home can use a 12-column composition with alternating media/copy spans.
- PDP uses a media rail plus sticky information/action column.
- Bag, Checkout, Archive, and Care use content plus summary/navigation columns where appropriate.
- Wide composition must preserve mobile DOM order and keyboard order.

## 9. Visual System

### 9.1 Palette

Use project-owned tokens rather than claiming official brand values:

| Token | Value | Role |
| --- | --- | --- |
| `--cm-ink` | `#111111` | Primary type, controls, deep media fields |
| `--cm-paper` | `#F5F4F0` | Editorial canvas |
| `--cm-white` | `#FFFFFF` | Reading panels and commerce surfaces |
| `--cm-muted` | `#6E6D69` | Secondary copy |
| `--cm-line` | `#D7D5CF` | Dividers and structure |
| `--cm-orange` | `#FF4800` | Active chapter, focus, primary action, key state only |
| `--cm-warm` | `#D8CFC2` | Material/still-life support |

Orange must not become a background default. Use it to locate action and editorial position.

### 9.2 Typography

- Use the project’s existing CJK-safe UI stack for Chinese and transactional text.
- Use a restrained editorial serif only for selected Latin/Korean display lines and issue numbers.
- Do not load a new remote font during runtime.
- Keep prices, quantities, statuses, and controls in a highly legible sans stack.
- Headline scale should come from composition, not extreme letter spacing or all-caps everywhere.
- Long Chinese titles require balanced wrapping and must not inherit narrow Latin display widths.

### 9.3 Spacing And Grid

- Base spacing rhythm: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 72`.
- Use 1px structure lines and whitespace before shadows.
- Avoid repeated rounded cards; most sections should be planes, rules, spreads, and media frames.
- Border radius is exceptional, not universal. Circular controls are reserved for compact icon actions.
- Editorial irregularity may shift columns or image heights, but the baseline rhythm must remain visible.

### 9.4 Image Treatment

- Prefer believable studio still life, tactile surfaces, natural shadows, and restrained modern-Seoul interiors.
- Avoid glossy CGI, floating objects, impossible reflections, luxury clichés, and excessive orange props.
- Preserve product shape and color across main/detail/context images.
- Product main/detail/context and owner-review media are normally advertising-free, but functional product markings that define the object are required where appropriate, such as coherent keyboard legends or control symbols.
- Issue covers, campaign posters, editorial advertisements, and fixed brand-story graphics may bake exact approved fictional English, Chinese, or Korean campaign copy into the image when typography is part of the composition. English and Chinese are the default display languages for art-directed advertising because they better support the intended visual range; Korean is a selective world-building accent reserved for a minority of covers, labels, or micro-copy rather than a requirement for every Seoul-set campaign.
- Record every baked string and language in prompt metadata, proofread it at full resolution, and generate language-specific variants when the campaign must localize; one raster asset must not pretend to translate dynamically.
- Prices, discounts, inventory, delivery claims, ratings, specifications, review identity, interactive CTAs, and other changing commerce truth remain code-rendered even when the surrounding campaign art contains fixed copy.
- Do not render fake labels, unapproved specifications, copied logos, barcodes, social-app chrome, or UI controls into product photography.

## 10. Motion System

### 10.1 Allowed Motion

- `180ms`: control feedback, save state, inline confirmation.
- `260ms`: section reveal, filter/result change, Bag feedback.
- `420ms`: Issue crossfade or editorial mask reveal.
- Horizontal rails use natural scrolling and snap; no forced autoplay.
- PDP media changes use crossfade or restrained shared-position transition, never dramatic zoom.
- The one published motion loop is decorative, silent, text-free, and must have a static poster.

### 10.2 Prohibited Motion

- bouncing CTAs;
- endless auto-carousels;
- parallax that interferes with reading or scroll position;
- particle effects;
- staggered delays that postpone purchase actions;
- animation used to hide layout instability.

### 10.3 Reduced Motion

Under `prefers-reduced-motion: reduce`:

- replace crossfades/masks with immediate state changes;
- stop the motion loop and show its poster;
- remove non-essential transforms and smooth scrolling;
- retain visible focus, selected state, and section position.

## 11. Exact First-Release Media Manifest — 62 Masters

All names below are semantic master IDs. Final file extensions and content hashes follow the project asset workflow.

### 11.1 Issue And Campaign Covers — 4

| ID | Ratio | Direction | Primary Use |
| --- | --- | --- | --- |
| `cm29-issue-01-quiet-commute` | `3:4` | Portable objects, stone/metal, dawn Seoul light, calm negative space | Home Issue 01 and Issue collection |
| `cm29-issue-02-listening-room` | `3:4` | Headphones, radio, projector light, dim domestic interior | Home Issue 02 |
| `cm29-issue-03-desk-ritual` | `3:4` | Keyboard, fountain pen, letter set, paper and controlled grid | Home Issue 03 |
| `cm29-issue-04-objects-for-leaving` | `3:4` | Carry-on, lens, tray as departure ritual, no visible brand | Home Issue 04 |

### 11.2 Product Media — 27

Each stable product receives exactly three accepted masters:

- `main`: recognisable full object, controlled still life, suitable for Home/collection/PDP opener.
- `detail`: material, mechanism, surface, edge, or construction close-up.
- `context`: believable use/scale environment without unapproved claims.

| Product ID | Main | Detail | Context |
| --- | --- | --- | --- |
| `shopping_seed_digital_lens` | `cm29-digital-lens-main` | `cm29-digital-lens-detail` | `cm29-digital-lens-context` |
| `shopping_seed_digital_headphones` | `cm29-digital-headphones-main` | `cm29-digital-headphones-detail` | `cm29-digital-headphones-context` |
| `shopping_seed_digital_projector` | `cm29-digital-projector-main` | `cm29-digital-projector-detail` | `cm29-digital-projector-context` |
| `shopping_seed_digital_keyboard` | `cm29-digital-keyboard-main` | `cm29-digital-keyboard-detail` | `cm29-digital-keyboard-context` |
| `shopping_seed_nova_bedside_radio` | `cm29-bedside-radio-main` | `cm29-bedside-radio-detail` | `cm29-bedside-radio-context` |
| `shopping_seed_nova_stone_tray` | `cm29-stone-tray-main` | `cm29-stone-tray-detail` | `cm29-stone-tray-context` |
| `shopping_seed_nova_letter_set` | `cm29-letter-set-main` | `cm29-letter-set-detail` | `cm29-letter-set-context` |
| `shopping_seed_nova_carry_on` | `cm29-carry-on-main` | `cm29-carry-on-detail` | `cm29-carry-on-context` |
| `shopping_seed_nova_fountain_pen` | `cm29-fountain-pen-main` | `cm29-fountain-pen-detail` | `cm29-fountain-pen-context` |

Preferred ratios:

- Main: `4:5`.
- Detail: `1:1` or `4:5` according to the physical feature.
- Context: `3:2`, with a mobile-safe `4:5` focal crop recorded in metadata.

### 11.3 Owner Review Media — 21

Owner-review media is a separate community photographic mode. It may share the accepted product visual bible, but it must not reuse the polished lighting, exact framing, or controlled-set grammar of `main` and `context` media.

Every stable product receives:

- `owner-scene`: a believable personal-space image with the object naturally used or stored;
- `owner-detail`: a closer phone-camera view of one practical interaction, surface, fit, or after-use condition;
- `owner-follow-up`: one additional longer-use or post-trip image for keyboard, stone tray, and carry-on only.

| Product ID | Owner Scene | Owner Detail | Owner Follow-Up |
| --- | --- | --- | --- |
| `shopping_seed_digital_lens` | `cm29-digital-lens-owner-scene` | `cm29-digital-lens-owner-detail` | — |
| `shopping_seed_digital_headphones` | `cm29-digital-headphones-owner-scene` | `cm29-digital-headphones-owner-detail` | — |
| `shopping_seed_digital_projector` | `cm29-digital-projector-owner-scene` | `cm29-digital-projector-owner-detail` | — |
| `shopping_seed_digital_keyboard` | `cm29-digital-keyboard-owner-scene` | `cm29-digital-keyboard-owner-detail` | `cm29-digital-keyboard-owner-follow-up` |
| `shopping_seed_nova_bedside_radio` | `cm29-bedside-radio-owner-scene` | `cm29-bedside-radio-owner-detail` | — |
| `shopping_seed_nova_stone_tray` | `cm29-stone-tray-owner-scene` | `cm29-stone-tray-owner-detail` | `cm29-stone-tray-owner-follow-up` |
| `shopping_seed_nova_letter_set` | `cm29-letter-set-owner-scene` | `cm29-letter-set-owner-detail` | — |
| `shopping_seed_nova_carry_on` | `cm29-carry-on-owner-scene` | `cm29-carry-on-owner-detail` | `cm29-carry-on-owner-follow-up` |
| `shopping_seed_nova_fountain_pen` | `cm29-fountain-pen-owner-scene` | `cm29-fountain-pen-owner-detail` | — |

Preferred ratios:

- Owner scene: native phone-photo portrait, normally `4:5` or `3:4`.
- Owner detail: `1:1`, `4:5`, or `3:4` according to the practical subject; preserve the uncropped master ratio in metadata.
- Owner follow-up: `4:5` preferred, with visibly different time, placement, or after-use condition from the first owner scene.

Owner-review image rules:

- Preserve the approved product identity, but allow ordinary placement, imperfect centering, mixed household light, subtle phone-camera noise, and personal surroundings.
- Do not fake screenshots, usernames, ratings, timestamps, purchase badges, review text, or social-app chrome inside the bitmap.
- Do not include recognizable faces, private documents, addresses, phone numbers, reflections of the photographer, or readable third-party branding.
- Review identity, rating, variant, use duration, verified-purchase status, and written copy are code-rendered records, never inferred from the image.

### 11.4 Collection And Editorial Images — 3

| ID | Ratio | Direction | Use |
| --- | --- | --- | --- |
| `cm29-editorial-desk-after-rain` | `3:2` | Paper, keyboard, pen, radio; grey Seoul daylight | Objects in Use / desk collection |
| `cm29-editorial-evening-wall` | `3:2` | Projector glow, headphones, tray; quiet apartment wall | Listening collection |
| `cm29-editorial-departure-table` | `3:2` | Carry-on, lens, letter set; leaving-home ritual | Travel/gift collection |

### 11.5 Material Study Boards — 2

| ID | Ratio | Direction | Use |
| --- | --- | --- | --- |
| `cm29-material-study-hard-surfaces` | `4:3` | Brushed metal, mineral stone, glass, matte polymer samples | Home Material Study and relevant PDPs |
| `cm29-material-study-soft-records` | `4:3` | Paper grain, fabric lining, leather-like trim, ink and packaging folds | Home Material Study and relevant PDPs |

The boards must not contain fake test results, dimensions, labels, or certificates.

### 11.6 Branded State Illustrations — 4

| ID | Ratio | State |
| --- | --- | --- |
| `cm29-state-empty-collection` | `1:1` | Empty object frame / collection recovery |
| `cm29-state-empty-bag` | `1:1` | Open paper sleeve / considered Bag |
| `cm29-state-empty-archive` | `1:1` | Closed archive folder / Orders |
| `cm29-state-offline-media` | `1:1` | Interrupted image contact sheet / offline and media failure |

Use original abstract illustration with paper, ink, line, and one orange locating mark. No embedded explanatory text.

### 11.7 Restrained Motion Loop — 1

| ID | Format | Direction | Use |
| --- | --- | --- | --- |
| `cm29-motion-light-across-objects` | `WebM` preferred, static poster required | Six-to-eight-second silent loop derived from an original generated still: changing window light and shadow across three fictional objects, no object deformation | Optional Home Issue stage on capable clients |

Create the original still through the approved image CLI, then produce the loop as a restrained motion derivative. Do not use generative video that changes product geometry. The poster is mandatory; reduced-motion and load failure use the poster.

## 12. Per-Product Visual Bible

Freeze each product’s silhouette, palette, material, scale cue, and distinguishing detail before generating accepted siblings.

### 12.1 `shopping_seed_digital_lens`

- Identity: compact unbranded camera lens, black anodized metal, fine focus ring, small amber index mark.
- Main: isolated on warm-grey stone with soft lateral light.
- Detail: focus ring texture and glass edge; no readable manufacturer markings.
- Context: beside a compact camera body only if the body remains secondary and unbranded; otherwise on a departure table.
- Avoid: floating lens, impossible glass, oversized cinema scale, fake focal numbers.

### 12.2 `shopping_seed_digital_headphones`

- Identity: over-ear headphones, charcoal fabric headband, matte cups, restrained orange stitch.
- Main: folded or resting naturally, showing complete silhouette.
- Detail: ear cushion fabric and hinge.
- Context: quiet listening chair or bedside setting without a visible person.
- Avoid: gaming RGB, celebrity styling, impossible cable/hinge geometry.

### 12.3 `shopping_seed_digital_projector`

- Identity: compact rectangular projector, off-white mineral shell, dark lens window, minimal ventilation.
- Main: three-quarter still life with the full body readable.
- Detail: lens window, material edge, ventilation rhythm.
- Context: believable soft projection on a wall; no copyrighted film or readable UI.
- Avoid: fake brightness claims, impossible beam, warped casing.

### 12.4 `shopping_seed_digital_keyboard`

- Identity: compact low-profile keyboard, warm-white keys, graphite frame, one orange function key.
- Main: top/oblique view with full key layout coherent but no readable brand.
- Detail: keycap texture, frame edge, switch depth.
- Context: paper-led desk with pen and radio.
- Avoid: malformed keys, nonsense text, neon gaming desk.

### 12.5 `shopping_seed_nova_bedside_radio`

- Identity: small bedside radio, warm-grey body, woven speaker cloth, one round control.
- Main: bedside still life with complete front and side.
- Detail: cloth weave and control dial.
- Context: low evening light with a book or glass, no fake time display required.
- Avoid: retro-brand copying, impossible knobs, baked radio frequency text.

### 12.6 `shopping_seed_nova_stone_tray`

- Identity: shallow oval mineral tray with subtle irregular veining and softly honed edge.
- Main: complete tray with one restrained everyday object for scale.
- Detail: edge, pore, and veining.
- Context: entryway or bedside catch-all.
- Avoid: food presentation, luxury jewelry ad clichés, physically thin stone.

### 12.7 `shopping_seed_nova_letter_set`

- Identity: unbranded correspondence set with ivory paper, translucent envelope, charcoal/orange paper accents.
- Main: complete set arranged with clear hierarchy and no readable fake copy.
- Detail: paper grain, fold, envelope edge, seal material.
- Context: active writing desk with fountain pen.
- Avoid: generated gibberish, official postal marks, excessive vintage styling.

### 12.8 `shopping_seed_nova_carry_on`

- Identity: compact hard-shell carry-on, graphite body, quiet rib pattern, restrained orange luggage tab.
- Main: full upright silhouette, wheels and handle geometry coherent.
- Detail: wheel, handle, shell texture, or zipper junction.
- Context: apartment entry or calm station-adjacent scene without official transit branding.
- Avoid: airport brand copying, impossible handle/wheels, luxury monograms.

### 12.9 `shopping_seed_nova_fountain_pen`

- Identity: slim fountain pen, black lacquer-like body, brushed metal clip, warm orange ink cue.
- Main: full pen and cap on paper, nib visible in a secondary position.
- Detail: nib, clip, lacquer edge; no fake engraving.
- Context: letter-writing scene with the fictional letter set.
- Avoid: illegible engravings, leaking ink, oversized pen, copied prestige-brand silhouette.

## 13. Media Naming, Storage, And Metadata

### 13.1 Candidate Workspace

Use an ignored generation workspace such as:

`output/imagegen/shopping-29cm-product-grade/`

Recommended structure:

```text
00-research/
01-calibration/
02-anchor-products/
03-product-families/
04-owner-notes/
05-editorial/
06-states/
07-motion/
contact-sheets/
manifests/
acceptance/
```

Keep prompts, references, candidate PNGs, contact sheets, decisions, hashes, and generation metadata here. Runtime must never read from `output/imagegen/**`.

### 13.2 Runtime Logical Paths

Use project image-bed paths following existing project conventions, under a 29CM-specific namespace such as:

```text
images/ui-assets/apps/shopping/29cm/issues/
images/ui-assets/apps/shopping/29cm/products/
images/ui-assets/apps/shopping/29cm/reviews/
images/ui-assets/apps/shopping/29cm/editorial/
images/ui-assets/apps/shopping/29cm/materials/
images/ui-assets/apps/shopping/29cm/states/
images/ui-assets/apps/shopping/29cm/motion/
```

Do not overwrite existing content at a stable URL. Revised assets receive new content/hash-backed publication records according to the current asset workflow.

### 13.3 Required Metadata

For every accepted master record:

- semantic ID;
- related product ID or page slot;
- prompt/version;
- source references and their role;
- model, quality, size, and generation timestamp;
- acceptance decision and reason;
- SHA-256 of accepted master;
- runtime derivative names, sizes, formats, and hashes;
- alt-text intent in `zh-CN` and `en-US` where the image is meaningful;
- focal point and crop-safe notes;
- whether the image is decorative or content-bearing.
- media mode: `commerce`, `editorial`, or `owner-review`;
- for owner-review media, the fictional review fixture ID, privacy audit result, and confirmation that no review identity or rating is baked into the bitmap.

## 14. Image CLI Workflow

Use the machine-local `codex-image` skill and installed launcher at `%USERPROFILE%\.codex\skills\codex-image\scripts\codex-image.cmd`. It reads the active Codex provider configuration and authentication without copying credentials into the project. Use `gpt-image-2` as the image model, never the active chat model name. Do not use the legacy project `gpt-image` launcher for execution, write a new image generator, add project `.env` credentials, or print secrets into prompts, logs, manifests, or handoff documents.

Batch execution update, user-approved 2026-08-22: candidate generation may run through dependency waves without stopping for subjective per-image approval. Generate canonical product mains first, then parallel identity-preserving detail/owner edits and independent landscape/editorial jobs. Present grouped contact sheets after the complete candidate batch. This authorization changes review timing only; no generated candidate becomes a runtime asset until the user completes consolidated visual selection.

### Phase 1 — Reference Distillation

1. Inspect the current official/reference UI only to identify durable grammar.
2. Search the bundled `references/gallery.md`.
3. Read only the nearest category file and relevant craft guidance.
4. Record one coherent brand world with three role-specific photographic modes:
   - commerce: controlled, product-readable main/detail imagery;
   - editorial: naturally integrated Seoul domestic context imagery;
   - owner-review: personal phone-camera imagery with believable imperfection and no fake social chrome.
5. Do not copy gallery prompts wholesale.

### Phase 2 — Calibration Candidates

Generate low/medium-quality candidates for:

- one Issue cover;
- `shopping_seed_digital_keyboard` main;
- `shopping_seed_nova_stone_tray` main;
- `shopping_seed_nova_carry_on` main;
- one anchor context image using the editorial mode;
- one anchor owner-scene image using the owner-review mode;
- one state illustration.

Generate enough variation to compare composition and craft, not dozens of near-duplicates. Build separate labeled contact sheets for commerce, editorial, and owner-review modes; do not present unrelated objects as a controlled A/B/C comparison.

In user-authorized batch mode, record Gate B evidence but continue into the remaining candidate waves without pausing for per-image approval.

### Phase 3 — Anchor SKU Continuity

After the three media modes are accepted:

1. Freeze the product visual bible.
2. Generate main/detail/context sets for keyboard, stone tray, and carry-on.
3. Generate owner-scene, owner-detail, and owner-follow-up sets for the same three anchor products.
4. Generate one accepted Issue cover in the same world.
5. Test the accepted images in actual Home, collection, PDP, and Owners' Notes containers before producing siblings.

In user-authorized batch mode, record continuity evidence and continue through the remaining candidate manifest. Runtime publication still waits for consolidated review.

### Phase 4 — Remaining Product Families

Generate remaining products in coherent families:

- Digital: lens, headphones, projector, keyboard.
- Quiet Home: radio, stone tray.
- Records And Travel: letter set, carry-on, fountain pen.

Use accepted main images as identity references for detail/context generations. Generate owner-scene and owner-detail media for the remaining six products through the accepted owner-review mode. Retry rejected items only. Never regenerate accepted siblings blindly.

### Phase 5 — Owner Reviews, Editorial, Material, State, Motion

- Complete and audit all 21 owner-review images, grouped by product rather than by visual similarity.
- Generate the remaining Issue covers.
- Generate three editorial scenes using accepted product identities.
- Generate two text-free material boards.
- Generate four state illustrations as one coherent system.
- Generate the motion-source still and create a restrained loop derivative with a poster.

### Phase 6 — Final Quality

- Use high quality only for accepted-direction finals.
- Review full resolution for malformed geometry, gibberish, copied marks, inconsistent products, odd shadows, fake labels, and inaccessible crop.
- Keep only serious candidates.
- Build final contact sheets grouped by Issue, product family, owner reviews, editorial, materials, and states.
- Record accept/reject reasons before runtime promotion.

## 15. Runtime Derivatives And Publication

### 15.1 Derivative Rules

- Preserve accepted master PNGs in the protected source workflow.
- Publish optimized WebP/AVIF where supported by current project conventions; keep PNG only when alpha or quality requires it.
- Create responsive derivatives only when runtime selection exists or the component uses appropriate `srcset`/picture behavior.
- Do not upscale.
- Record focal crops rather than manually creating uncontrolled near-duplicate assets.
- Motion uses `WebM` plus static poster; add another format only if the project/browser target requires it.

### 15.2 Publication Flow

1. Prepare the credential-free asset upload list defined by `docs/process/DEVELOPMENT_TOOLING.md`.
2. Confirm exact master/derivative hashes.
3. Publish through the project image-bed workflow.
4. Update `config/project-assets.json` without discarding unrelated current changes.
5. Resolve runtime URLs through `src/lib/project-assets.js` helpers; do not hardcode deployment host URLs in components.
6. Verify every published runtime object is reachable and byte/hash consistent.
7. Exclude prompts, contact sheets, screenshots, reports, and JSON evidence from runtime payloads.

Never commit `.env.local`, API keys, upload credentials, or unapproved media candidates.

## 16. Code Integration Plan

### 16.1 Primary Existing Files

- `src/components/shopping/Shopping29CmApp.vue`
- `src/components/shopping/pages/Shopping29CmPages.vue`
- `src/components/shopping/operations/Shopping29CmOperations.vue`
- `src/components/shopping/services/Shopping29CmServicePages.vue`
- `src/views/ShoppingView.vue`
- `src/stores/shopping.js`
- `src/lib/project-assets.js`
- `config/project-assets.json`

### 16.2 Preferred New Storefront-Local Modules

Create only when they reduce file density and remain 29CM-owned:

- `src/components/shopping/29cm/Shopping29CmHome.vue`
- `src/components/shopping/29cm/Shopping29CmCollection.vue`
- `src/components/shopping/29cm/Shopping29CmProduct.vue`
- `src/components/shopping/29cm/Shopping29CmStates.vue`
- `src/components/shopping/29cm/shopping-29cm-media.js`

Names may adapt to repository conventions, but do not place 29CM-specific layout inside a generic cross-store component.

### 16.3 Integration Sequence

1. Freeze route/view contracts and define semantic media mapping.
2. Add 29CM media resolver keyed by stable product IDs and editorial slot IDs.
3. Recompose Home without changing Shopping ownership or route entry.
4. Split collection/search variants and add route-faithful pagination/chapter navigation.
5. Recompose PDP around three-media continuity and stable purchase action.
6. Polish Bag and Checkout with complete commerce facts and progressive gift controls.
7. Polish Archive, Dossier, Delivery Journal, and Care.
8. Add shared 29CM state presentation only within this storefront.
9. Add reduced-motion and missing-media behavior.
10. Publish and connect accepted runtime assets.
11. Add focused tests and visual evidence.

### 16.4 Data Modeling Guidance

- Product media mapping may be code-owned presentation metadata keyed by stable product ID.
- Do not rewrite persisted product objects merely to attach runtime image URLs unless the existing Shopping contract explicitly requires it.
- Issue/editorial composition belongs to 29CM presentation code, not the Shopping store’s persisted commerce schema.
- Keep localized editorial copy in code/data with `zh-CN` and `en-US`, not inside raster media.
- Keep tests stable through semantic `data-testid` attributes; do not test private CSS structure.

## 17. Test And Visual QA Matrix

### 17.1 Focused Behavior Coverage

Verify at minimum:

- direct `/shopping/nova_digital` entry;
- Issue selection and Issue Index navigation;
- collection pagination/chapter navigation;
- search query, zero results, clear, and back restoration;
- saved-object filter and persistence;
- PDP open/return continuity;
- add to Bag, quantity changes, remove, and per-service isolation;
- gift disclosure and recipient handling;
- place-order pending/success/failure and duplicate-submit prevention;
- Orders, Order Detail, Delivery Journal, and Care navigation;
- complete/cancel/delete actions according to existing truth;
- missing image, failed image, empty state, error, and offline state;
- `zh-CN`/`en-US` switching without persisted-record mutation;
- backup restore and normal hydration behavior for the nine stable IDs.

### 17.2 Visual Viewports

Capture and review:

| Viewport | Required Routes/States |
| --- | --- |
| `393x851` | Home all Issues, collection, search, PDP for three anchor SKUs, Bag, Checkout, Archive, Dossier, Delivery, Care, all empty/error states |
| `320x568` or nearest supported narrow viewport | Home masthead, collection, PDP sticky action, Bag, destructive actions |
| Project default desktop | Home, collection, PDP, Bag, Checkout, Archive |
| `1365x900` | Home long composition, PDP two-column, transaction columns, Care |

### 17.3 Visual Acceptance Questions

For every capture ask:

1. Does this look like the same 29CM product, not a different template?
2. Is the page’s purpose obvious before reading all copy?
3. Is media carrying a specific information role?
4. Is any essential information baked into media?
5. Is the product identity consistent across all images?
6. Is there one clear primary action?
7. Does the layout remain intentional with missing media?
8. Are focus, contrast, text size, and touch targets acceptable?
9. Does wide layout add composition rather than merely columns?
10. Does reduced motion remain complete and calm?

### 17.4 Required Commands

Select checks according to actual changes, with the project contract as final authority. Expected release checks include:

- changed-file lint during iteration;
- focused unit/component tests;
- focused Shopping E2E for the user-facing route family;
- `npm.cmd run lint`;
- `npm.cmd run test`;
- `npm.cmd run build`;
- `npm.cmd run governance:check`;
- `git diff --check`.

Do not fix unrelated failures. Record them precisely with evidence and distinguish them from regressions introduced by this slice.

## 18. Codex Review Gates

Luna must stop and request review at the gates below. Do not silently pass a gate by self-approval.

### Gate A — Frozen IA And Media Slots

Deliver:

- route-by-route wire/composition notes;
- final Home section order;
- collection variants;
- PDP content order;
- exact mapping of the 62 semantic media IDs to runtime slots;
- list of code-native facts that will never be rasterized.

Pass condition: no generic Home/category/PDP/transaction template remains in the proposed architecture.

### Gate B — Three-Mode Calibration

Deliver:

- separate labeled contact sheets for commerce, editorial, and owner-review media modes;
- candidate metadata and prompts;
- one Issue cover, three anchor SKU mains, one anchor context, one anchor owner scene, and one state illustration across the useful modes;
- recommendation with rejection reasons.

Pass condition: one original, reproducible 29CM visual world and three distinct media roles are reviewable. Commerce images remain product-readable, editorial images feel physically integrated, and owner-review images feel personal without looking careless or fake. Explicitly authorized full candidate batches may exist before this pass, but they remain unpublished and replace per-image review with grouped contact sheets.

### Gate C — Anchor Continuity

Deliver:

- accepted Issue 01 cover;
- main/detail/context for keyboard, stone tray, and carry-on;
- owner-scene/owner-detail/owner-follow-up for keyboard, stone tray, and carry-on;
- actual Home/collection/PDP/Owners' Notes integration screenshots at mobile and wide sizes;
- product consistency audit.

Pass condition: editorial discovery, collection, and PDP feel continuous, and all three anchor products remain physically consistent.

### Gate D — Nine Product Families

Deliver:

- accepted main/detail/context plus owner-scene/owner-detail for all nine products;
- accepted owner-follow-up media for keyboard, stone tray, and carry-on;
- final grouped contact sheets;
- rejection/retry log;
- crop/focal metadata.

Pass condition: all 27 product masters and 21 owner-review masters are internally consistent, role-correct, privacy-audited, and runtime-safe.

### Gate E — Discovery And PDP Integration

Deliver:

- final Home, all collection variants, search, saved objects, all nine PDPs, and the Owners' Notes summary/all-media states;
- mobile/wide captures;
- missing-media fallbacks;
- interaction proof for Issue, pagination/chapter, search, save, Add to Bag, review-media expansion, and return to the same PDP position.

Pass condition: the storefront no longer reads as one page plus repeated product cards.

### Gate F — Transaction And State Polish

Deliver:

- Bag, Checkout, Orders, Order Detail, Delivery Journal, Care;
- loading, empty, recoverable error, offline, media failure, pending submit;
- keyboard/focus and reduced-motion evidence.

Pass condition: every downstream route belongs to the same product and keeps commerce truth legible.

### Gate G — Full Visual QA

Deliver:

- required viewport matrix;
- console and overflow results;
- accessibility/reduced-motion findings;
- runtime asset failure test;
- defects found and corrected.

Pass condition: no critical visual, interaction, accessibility, or responsive defect remains.

### Gate H — Publication And Final Handoff

Deliver:

- asset upload list and publication evidence;
- registry changes and hashes;
- exact code/test/doc files;
- validation results;
- remaining risks;
- confirmation that unrelated workspace changes were preserved.

Pass condition: Codex can reproduce the result and verify the release without relying on Luna’s unstated context.

## 19. Explicit Do-Not-Do List

- Do not redesign all stores or generalize this work into a shared storefront system.
- Do not treat Logistics as a Home shopping category.
- Do not preserve a weak current layout merely because the route already exists.
- Do not use one universal `header → hero → categories → cards` silhouette.
- Do not make every product block a rounded card.
- Do not make every hero “left text, right image” or “image with bottom-left white box.”
- Do not render all products on one endless page; use collection depth and pagination/chapter navigation.
- Do not ship a PDP with one image and generic description sections.
- Do not publish the 62-master candidate batch to runtime before consolidated Gate B/C review and explicit user selection.
- Do not use official product photos, campaigns, logos, slogans, prices, or copied layouts.
- Do not place prices, discounts, inventory, buttons, delivery claims, specifications, or localized variable copy inside generated images.
- Do not remove necessary functional product markings merely to avoid generated text. Keyboard legends, control symbols, and similar identity-bearing details must remain coherent; fixed fictional campaign slogans are allowed only in approved advertising/editorial slots.
- Do not invent real-world designers, manufacturers, awards, specifications, reviews, rankings, ETAs, tracking, or human-support availability. Seeded owner notes must remain explicitly fictional SchatPhone world data, and verified-purchase status requires Shopping-owned order lineage.
- Do not change stable IDs, `serviceKey`, persisted schema, hydration, backup restore, Wallet quote behavior, or cross-module ownership.
- Do not hardcode image-bed hosts in Vue components.
- Do not commit credentials, `.env.local`, contact sheets, screenshots, or rejected candidates as runtime assets.
- Do not overwrite or clean unrelated dirty-worktree changes.
- Do not claim completion without mobile/wide, missing-media, reduced-motion, and transaction-path review.

## 20. Luna Completion Handoff Format

Return one concise but complete handoff with this exact structure:

```text
Task: Shopping 29CM product-grade storefront
Status: READY_FOR_CODEX_REVIEW | BLOCKED
Base commit:
Source commit or uncommitted state:

User-visible result:
- ...

Architecture and route result:
- Home:
- Collection/Search:
- PDP:
- Bag/Checkout:
- Archive/Delivery/Care:
- States and reduced motion:

Media result:
- Accepted masters: __ / 62
- Accepted owner-review masters: __ / 21
- Published runtime assets:
- Rejected/retried assets:
- Manifest/contact-sheet locations:
- Asset registry changes:

Exact files changed:
- ...

Validation:
- command: PASS/FAIL, evidence
- visual viewport: PASS/FAIL, evidence

Contracts preserved:
- serviceKey isolation
- stable IDs
- hydration/backup restore
- Wallet money truth
- unrelated workspace changes

Remaining risks:
- ...

Reviewer actions requested:
- Gate __ decision
- ...
```

If blocked, identify the exact repeated blocker, what was attempted, which gate is affected, and the smallest user/reviewer decision needed. Do not conceal incomplete media, failed publication, or skipped visual QA behind a general “done” statement.
