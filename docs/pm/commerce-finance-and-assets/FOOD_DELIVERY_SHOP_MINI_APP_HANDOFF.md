# Food Delivery Shop Mini App Handoff

Updated: 2026-08-07

This note captures the current product direction, implemented progress, and unscheduled visual reference for Food Delivery shop mini apps. It is not an execution board; the live roadmap and package status handoff own promotion and sequencing.

## Product Model

Food Delivery is a pseudo-folder collection, not a single app that owns every first-level entry.

The first layer inside the Home pseudo-folder should contain peer mini apps:

- Food Platform: broad browsing, search, lightweight categories, platform campaigns, and platform-internal merchant discovery. It is a peer mini app in the folder, not the controller for the other peer shop mini apps.
- Shop mini apps: individual restaurants or themed shops, such as Moon Bistro.
- Future shops: App Store-installed, user-created, or World Pack-generated shop entries.

Categories such as restaurants, nearby, fast food, cafe, dessert, and grocery are filters inside Food Platform. They are not first-level pseudo-folder apps.

## Current Progress

The pseudo-folder direction is now implemented for Food Delivery and Shopping.

- Food Delivery folder first layer now renders the fixed Food Platform entry plus installed restaurant shop mini apps.
- Shopping uses the same reusable folder mini app model for installed shopping shop entries.
- App Store mini app install/remove state controls whether a shop appears inside its target pseudo-folder.
- The pseudo-folder grid can grow and scroll; it is no longer capped to the first eight entries.
- The old Food Delivery first-layer category entries are removed from Home's pseudo-folder layer.

Food Platform now has a consumer-facing discovery homepage.

- The platform first screen uses a Baemin-like delivery-app rhythm adapted to SchatPhone: top actions, delivery address chip, real search input, rider illustration layering, a shorter horizontal ad-carousel rail, icon-first category shortcuts, a horizontal platform-merchant rail, and a light bottom navigation row.
- The earlier load-reduction pass folded the membership coupon strip into the ad carousel and removed redundant Nearby/More mechanisms. The latest category pass restores the useful density of the 2026-06-08 ten-entry layout without restoring its duplicate behavior: All, Restaurants, Fast Food, Fried Chicken, Pizza, Cafe, Dessert, Grocery, Noodles, and Sushi now produce distinct platform-filter outcomes where applicable.
- The current layout polish keeps the existing platform palette and project-local banner/merchant PNG assets while strengthening the delivery-address hierarchy, adding a lightweight greeting, rendering the ten category shortcuts as a stable two-row five-column icon grid, enriching merchant cards with rating/delivery/ETA summaries, and making `View all` expand the merchant rail into a scan-friendly full list.
- The two category source sheets and two rice-bowl derivatives remain RGB references with baked checkerboards and never render at runtime. All ten exact category paths now contain original `1024x1024` RGBA PNGs. The homepage renders those PNGs first, hides the old Font Awesome icon only after image load, and keeps the font icon as the error fallback.
- Food Platform now carries eleven platform-only seed merchants instead of five. The merchant mix is intentionally non-repeating: Korean soup rice, sushi, pizza, salad/light food, fried chicken, yogurt dessert, grocery, hand-pulled noodles, breakfast coffee, steamed dim sum, and Southeast Asian curry. Each opens a route-driven full merchant page with a wide Hero, rating/delivery summary, `112x112` menu thumbnails, cart controls, and source-aware back navigation; no merchant uses the old bottom-sheet card. Merchant identity is intentionally mixed rather than templated: seven shops keep food-photo covers, while Berry Morning, Green Basket, Morning Bagel, and Elm Lane Dim Sum use distinct horizontal advertisements with baked Chinese brand copy and original small characters. Their four transparent marks remain reusable in order history instead of requiring duplicate merchant marks. The collapsed `All` homepage rail draws three random shops once per mounted platform session and keeps that set stable while the user browses; `View all`, category filters, Search, and Saved expose their complete matching sets.
- The ad rail now behaves as a real carousel: it advances about every five seconds, loops, exposes stable dot controls, synchronizes the active dot after native swipe/scroll, pauses after direct interaction or while hovered/focused, and disables automatic motion when reduced-motion is requested or the document is hidden.
- The platform discovery surface now follows one interaction rule: every visible action must produce a clear result. The delivery-address control opens an inline chooser; header notifications/cart open focused panels; merchant hearts toggle a session-level platform favorite; and bottom navigation routes Search, Saved, Orders, and Mine to dedicated pages. Mine is now a route-driven platform account page with order/saved summaries, selectable delivery addresses, membership, past-order, delivery-contact, and update entries. Delivery contact deliberately returns through an owned platform order rather than opening a detached Chat flow.
- The three homepage banners no longer share one generic campaign-page template. Membership renders a pass-style benefit page with claim/use states and eligible shops; Weekend Picks is a large-concept poster campaign with a three-benefit pool and a one-draw App-local reward reveal; the lunch editorial renders specific menu-item recommendations with product-image slots. Their primary actions also differ: claim/use a benefit, reveal a session-only weekend reward, or open the first recommended menu respectively. The draw deliberately creates no Wallet, Assets, Chat, Map, or order-side effect.
- Platform merchant menus now support add/decrease/increase actions and a persistent single-merchant platform cart with line totals and quantity feedback. That cart is Food Delivery platform state and remains separate from the restaurant cart/order flow used by peer independent shop apps such as Moon Bistro.
- All eleven platform merchants now carry five menu products, for a 55-item baseline. Menu copy now follows eleven distinct naming systems rather than a shared ingredient template: neighborhood/location names for soup rice and noodles, poetic set names for sushi and dessert, numbered sauces for fried chicken, time-based packs for grocery and breakfast, craft language for dim sum, and city/spice language for curry. The merchant sheet uses stable square product-media slots; every `platform/menus/<merchant>/menu-item-01..05.png` path now resolves an accepted image, while load failures retain the shared diagnostic fallback and existing item indices remain stable for persisted platform carts and orders.
- The folder entry now code-renders `Baemin` and uses an original full-bleed mint delivery-bag icon instead of the generic dark utensils glyph. The asset contains no official Baemin Logo, wordmark, Korean letters, or mascot.
- The menu-asset gate is complete: all eleven merchant families now provide accepted `768x768` `menu-item-01..05.png` images. The final 36-image continuation follows the recorded selection manifest, including the user-selected black-garlic boneless chicken V2 and the corrected Hwadeok half-and-half wings; rejected texture variants and the mistaken fries retouch are not promoted. Contact sheets, requests, accepted masters, hashes, and selection evidence remain under `output/imagegen/baemin-platform/`.
- The second Baemin asset gate is delivered: Camellia Beef Noodle House and South Wind Coconut Curry use distinct local `1200x800` photographic covers; Berry Morning, Green Basket, Good Morning Bagel Coffee, and Elm Lane Dim Sum use original `768x768` true-alpha marks; all ten category shortcuts use the accepted 3D PNG family. The following V3 gate adds four `1360x640` merchant advertisements and connects about `96` to `111 KB` WebP runtime derivatives. Seven additional photography-merchant true-alpha marks close the compact order-identity set. The generation requests, PNG masters, contact-sheet/alpha evidence, and acceptance decisions live under `output/imagegen/baemin-platform/`.
- The platform cart now has a complete App-internal order flow: checkout opens a route-driven confirmation page with address selection, order note, delivery fee, total, and a simulated platform payment choice; submission creates a persisted `platformOrders` record, clears only the platform cart, and opens an order success/detail page. The bottom-nav Orders page lists only those platform-internal merchant orders and can reopen their details. This baseline deliberately does not call Wallet, Assets, Chat, rider tracking, or independent shop checkout logic.
- The platform order-flow visual pass is complete: checkout has a compact meal summary and the accepted takeout-bag illustration; empty Orders uses the accepted receipt illustration; order cards use status-driven badges and fixed merchant-mark slots; and order detail maps placed, preparing, delivering, delivered, and cancelled states to their accepted illustrations, copy, and four-stage progress treatment. Focused checkout/order-detail pages hide the main bottom navigation, internal architecture explanations stay out of visible copy, and image-load failures retain the shared high-contrast diagnostic fallback.
- The seven current order-flow illustrations are `DELIVERED_ACCEPTED / CONNECTED` at `1024x1024`. The separately deferred future delayed-order illustration remains outside this completed pack.
- Future platform-order lifecycle, rider route, service Chat, Wallet expense, notification, and relationship integration is preserved in `FOOD_DELIVERY_PLATFORM_CROSS_MODULE_UI_UX_PLAN.md` for later architecture/execution coordination. That reference is not active implementation scope. Roadmap 4.9 owns the next commerce-relevant proof; no visual item in this handoff is automatically current work.
- The platform now reads from the project UI asset library under `public/images/ui-assets/apps/food-delivery/platform/`: ad carousel banners use the generated banner PNGs, platform merchant cards use generated food photos, and the rider illustration uses `decorations/mascot/delivery-rider-mascot-01.png`. This removes the remaining external Unsplash dependency from the platform homepage and keeps future visual swaps inside the project asset library. The 2026-08-02 platform-only pass replaces the baked-checkerboard rider with a true-alpha PNG, converts the membership banner from Korean to Chinese, redesigns the weekend banner around a larger two-line Chinese headline, delivers the dedicated `3:4` weekend poster, removes duplicate visible UI copy from carousel/campaign Hero slots, and adds a consistent status-bar safe area to platform page headers.
- Food Platform bottom navigation includes Home, route-driven Search, platform-only Orders, route-driven Saved, and a route-driven Mine account page. Orders never aggregate peer shop-app orders.
- Platform search filters platform-internal merchants by shop name, cuisine, category, badge, and menu text. It does not search, open, or re-skin same-level shop mini apps such as Moon Bistro.
- Tapping a platform merchant stays inside Food Platform and opens a focused merchant detail sheet with summary metrics and menu preview. Opening a peer shop mini app still happens through the pseudo-folder/App Store/shop route context.
- Seed restaurants and seed dishes now include default food-photo URLs so fresh saves do not open with icon-only food cards. Moon Bistro now uses project-local UI assets under `public/images/ui-assets/apps/food-delivery/moon-bistro/` for its cover and initial dish photos, while user-edited dish images still use the normal URL/Gallery image picker.
- The restaurant/menu creation tools are hidden from ordinary Food Platform browsing. They appear only when the user arrives through the App Store create-shop handoff, and creating a restaurant keeps that handoff open so the user can immediately add menu items and images.
- Food Platform still does not show peer-shop cart, peer-shop orders, Wallet suggestions, Map support panels, or delivery event controls. Those remain inside opened shop mini apps.

The first Food Delivery shop is Moon Bistro.

- Moon Bistro is opened by restaurant context and renders as a shop-first mini app.
- Its product position is modern fine dining. The dark and candlelit palette is an atmosphere choice, not a late-night or night-snack category claim.
- The platform hero and platform list chrome are hidden in shop mode.
- The shop owns the first screen: shop header, dark tray menu, dish cards, item details, and cart.
- Dish cards use the dark tray treatment: food imagery is embedded as a raised circular image over each card.
- Moon Bistro now uses a candlelit cover image as the dark header background, with stronger overlay depth so the first screen reads more like a distinct shop app instead of a generic module panel.
- Tapping a dish opens a detail sheet with description, base ingredients, quantity, total price, add-to-cart, and a small edit icon.
- The edit mode is scoped to one dish and can change item title, description, base ingredients, and image source.
- The cart becomes the ordering anchor in shop mode.
- Map, order, Wallet, and support information are folded behind an Order & delivery section so they do not dominate the shop first screen.
- Current visual polish pass adds a shop status pill, scan-friendly rating/ETA/distance metrics, user-facing delivery fee/ETA/distance cards, a project-local Moon Bistro cover image, richer dark tray dish cards with embedded real-food imagery and quieter icon-only add buttons, a clearer checkout bar, and a softer empty-cart prompt.
- The shop checkout is now a shop-local confirmation sheet. Tapping checkout previews the current shop cart, delivery address, ETA, delivery fee, and total; the order is created only after the user submits from that sheet.
- Shop orders, delivery events, and Wallet suggestions are scoped to the currently opened shop. Food Platform does not render the shop cart, order panel, Wallet suggestions, or Map support panels, so it no longer behaves like a total order controller.
- The shop header no longer has a `Food platform` return button. Home remains available, while the platform is treated as a peer mini app in the pseudo-folder rather than the parent of the shop.
- Moon Bistro now seeds or migrates a fuller nine-dish menu using project-local photos. The shop menu is grouped by a sticky side rail: all, warm soup, rice set, grill, seafood, greens, pasta, and dessert. Filtering changes the dish list in place, while tapping a dish still opens the item detail/edit sheet.
- The empty shop surface no longer shows an empty cart card or empty Order & delivery support drawer. The checkout bar appears after the user adds food; order/Wallet/Map support appears only after real shop-scoped order support exists.
- Food Delivery watches Wallet's persisted primary currency, but numerical conversion is not yet complete. The White Peach Lime poster pilot now converts through Wallet's shared exact quote/format service and keeps its CNY source price when a selected custom currency has no rate; most restaurant/menu paths currently replace the currency field without converting the stored number, and several Baemin minimum-order strings remain hard-coded in KRW-style text. Those surfaces must continue to be treated as partial adoption until they use `WALLET_CURRENCY_AND_MONEY_CONVERSION_PLAN.md`. Existing orders remain in their recorded currency because they are historical order/ledger snapshots rather than live menu quotations.
- World Pack explainer banners are not user-facing UI. World Pack context should appear through app wording, defaults, visual treatment, and flow behavior; boundary explanations stay in docs/tests instead of rendering as an in-app card.
- Food Delivery now requires an explicit World Pack `uiThemePackage.enabled=true` before consuming a World Pack UI/UX override. If a world app binding only maps a route or entry, Food Delivery falls back to the original app UI and defaults.
- Commit `5bd7003` established the earlier fail-closed ownership baseline. The current runtime now matches the pseudo-folder App model more closely: valid restaurant lines for multiple independent shops may coexist in the persisted `cartItems` container, while every shop facade derives its own lines, quantity, delivery-fee total, and checkout by `restaurantId`. Adding or checking out in one shop never names, replaces, clears, or orders another shop's lines; unknown menu ownership remains excluded by normalization. The platform cart stays separate, the backup field shape remains compatible, and Peach Cloud order progress still maps cancelled to stage 0 and placed, preparing, delivering, and delivered to stages 1 through 4.
- Commit `7194f1c` makes Moon Bistro's `Order & delivery` surface consumer-facing and folded by default. Existing delivery events drive `Check for update`, `Confirm delivery`, and `Remove from history`; Wallet export remains an explicit `Save to Wallet` action, and route information remains a Map snapshot rather than a claim of live tracking. Delivery details use real pickup, drop-off, carrier, tracking, and positive-distance values when present, retain stable boundary/pickup/dropoff/meta hooks, and use a safe `ETA pending` fallback for missing, non-finite, or non-positive ETA values. The accepted pass also protects 44px targets, visible focus, long-copy wrapping, and reduced-motion behavior. Moon Bistro is consequently close to product-ready, subject to true-device review rather than another broad redesign.

The second built-in shop app is Peach Cloud.

- Peach Cloud is a peer entry inside the Food Delivery pseudo-folder, not a Food Platform merchant and not a new runtime owner.
- Its stable restaurant identity is `food_seed_peach_cloud`; its default template is the existing `dessert_window` facade option.
- The original Figma node `361:2286` is only a flattened cover, but the later prototype link exposes exact home node `47:23` (`3 - A - Home Page`). `get_design_context` confirms the yellow search/greeting header, five circular categories, horizontal Best Seller rail, orange photographic promotion, two-column Recommend grid, and orange five-action footer used by the current implementation.
- Peach Cloud now has a dedicated Vue app branch instead of conditional styling on the shared shop template. Its petal-pink, pink-mist, pale-green, and charcoal app frame, restored `3:2` horizontal brand Hero, five always-visible Home category shortcuts, switchable poster/menu content region, and lightweight Pink Mist bottom navigation with Petal Rouge selected states deliberately contrast with Moon Bistro's dark side-rail tray menu. Home no longer duplicates the menu as Best Seller and Recommend product rails: below the Hero and category navigation, one complete `2:3` vertical advertisement appears at a time, with each formal poster's campaign copy baked into its accepted image and no split copy panel or adjacent-slide strip. The White Peach Lime experiment is the only exception: its versioned derivative clears the baked price alone and receives a poster-specific code price slot. Selecting a category replaces that poster region with the category menu, while `返回海报 / Posters` restores the carousel; Search remains a separate menu-discovery route. Peach Club remains a separate action outside the poster. Home and Discover/New remove the detached header arrow controls; each complete poster now owns `48px` previous/next hit zones at its left and right edges while its center remains the campaign action. White Peach Lime and Waxberry Lychee open distinct `shopView=campaign` long pages with text-free portrait/landscape media, localized editorial copy, Wallet-following price, and a `选择数量 / Choose quantity` CTA into the standard detail sheet. The mascot poster still opens Merch, whose existing Hero media and navigation remain intact while direct editorial copy replaces the old left `48%` solid-color mask. Discover/New then shows the original-size Golden Peach horizontal advertisement as one fixed `48 CNY` product that continues to open the standard product detail sheet. There is no Pairing route and no Solo/Double/Party specification chooser. This palette is a later Peach Cloud brand decision layered over the Figma-derived information architecture; it does not change the Figma evidence or shared order runtime.
- Seventeen menu items now cover five fresh-fruit specials, three tea/coffee drinks, four frozen desserts, two baked sweets, and three seasonal products. `鲜果特饮 / Fresh Fruit` is intentionally broader than peach or sparkling drinks: it now includes `青提茉莉鲜果茶 / Green Grape Jasmine Fruit Tea`, `芒果百香厚酸奶 / Mango Passionfruit Yogurt`, and `草莓白桃鲜果乳 / Strawberry Peach Fruit Milk`, while Peach Cold Brew Tonic remains in Tea & Coffee. Seasonal now adds `杨梅荔枝冰茶 / Waxberry Lychee Iced Tea` and `桂花雪梨暖饮 / Osmanthus Pear Warm Infusion` alongside the existing pairing.
- The five added products use stable IDs and `peach-cloud-item-13.png` through `peach-cloud-item-17.png`. Fresh and existing saves receive only missing IDs, while same-ID user titles, descriptions, prices, ingredients, and custom images remain untouched. This content expansion does not introduce automatic seasonal dates or availability rules.
- Built-in product names, descriptions, ingredients, image alternative text, bag lines, checkout lines, and order items now resolve through the system language. `zh-CN` is the default presentation, `en-US` preserves the approved English menu copy, and user-edited fields remain literal in every language. Search indexes both built-in language versions plus current user-authored copy without writing translated presentation text back into Food Delivery storage. The three poster campaigns intentionally retain their approved Chinese/English advertising copy inside the finished image.
- Menu cards, quantity detail, add-to-bag, shop-local cart, confirmation checkout, order creation, delivery support, Wallet suggestions, and later service notifications continue to use the shared Food Delivery store and order runtime.
- The five-action footer uses Peach Cloud-local `shopView` route state. Its third action is `Discover`, with New, Campaign, Club, and Merch sharing that selected state while retaining distinct URLs and back behavior. Empty Bag and Orders actions open their own empty-state pages; Bag owns mixed menu/merchandise quantity review and the existing confirmation-checkout entry; Orders opens a shop-scoped order list, and submitted orders open a dedicated detail/progress page. These surfaces reuse Food Delivery state and checkout actions without rendering the generic inline cart or support drawer beneath the Peach Cloud home.
- Fresh saves receive the shop and menu through normal seeds. Existing local saves receive missing Peach Cloud records plus missing built-in menu IDs; legacy built-in titles are refreshed only when they still equal the old seed title, so user-renamed items remain untouched. Explicit backup restore remains snapshot-faithful and does not inject the seed migration.
- Peach Cloud's formal runtime pack now contains `39` assets under `public/images/ui-assets/apps/food-delivery/peach-cloud/`: `27` PNGs, `6` WebPs, and `6` SVGs. It keeps one Club Hero PNG, three landscape campaign PNGs, three complete `1024x1536` poster PNGs, two long-page campaign sets with one `1024x1536` Hero and two `1536x1024` story bands each, seventeen unique square product PNGs, three square merchandise PNGs, one original brand-mark SVG, and five Peach Cloud-prefixed category SVGs. The three posters carry their own final advertising copy; the long-page media remains text-free so localized copy and Wallet-following prices stay code-rendered. The Golden Peach card keeps its product image on the right and renders the fixed `48 CNY` product identity separately on the left. The same peach/cloud brand mark appears in the Home Food Delivery folder and the shop bar. The five active category marks use one colorful, background-free IP illustration system, and the category container owns each pastel background. The original `vegan.svg`, `dessert.svg`, `drinks.svg`, `snacks.svg`, and `meal.svg` files remain unchanged as inactive reusable source marks for other shops. Image failures still show the shared high-contrast diagnostic placeholder and retain exact `data-required-asset` paths.
- A one-poster dynamic-price pilot adds a versioned White Peach Lime derivative beside that formal pack. Only its baked price field is cleared; Home and Discover/New render `26 CNY`, `3.34 EUR`, or `5015 KRW` from the stable menu item through Wallet's shared quote/format service in an independent percentage slot. A selected custom currency without a rate renders the honest `26 CNY` source value instead of a relabeled amount. The original White Peach Lime poster remains unchanged, the other two posters retain baked prices, and the derivative is excluded from the current `39`-asset formal count. Prompt, mask, candidate, accepted composite, pixel invariant, and visual-QA decisions are retained under `output/imagegen/peach-cloud-dynamic-price-pilot/`; this does not yet create a shared poster-anchor authoring schema or migrate any other Food Delivery price path.
- The 17 product paths map one-to-one to 17 visually distinct `768x768` product photographs whose subjects match the current menu titles. The accepted mascot-market banner and plush, bag-charm, and tote product images were generated from the existing Hero as a high-fidelity identity reference. Exact prompts, accepted file copies, and acceptance records remain under `output/imagegen/peach-cloud-refresh/merchandise/`, `output/imagegen/peach-cloud-refresh/posters/`, and `output/imagegen/peach-cloud-campaign-pages/`; older editable masters and the product contact sheet remain under `ads/` and `products/`. These masters are not runtime dependencies; the app displays only accepted copies under `public/`. The Peach Cloud pack remains separate from the Food Platform art pack.
- Peach Cloud adds three stable cash-purchase merchandise records to the existing Food Delivery-owned `merchandise` cart line schema. Merchandise and menu lines share the Peach Cloud restaurant bag, total, checkout, backup, and order snapshot; submitted mixed orders localize both built-in menu and merchandise titles. Harbor Roast's purchase/redeemed-gift APIs and bean-stamp refund behavior remain intact. No Peach Club points, automatic membership, Wallet record, Assets record, or external reward owner is introduced.

The third built-in shop app is Dash Grill.

- Dash Grill is an original McDonald's-like quick-service category concept without copied names, arches, mascots, uniforms, packaging, or other brand assets.
- Its stable restaurant identity is `food_seed_dash_grill`; its default template is `quick_service_chain`.
- The first screen uses a tomato-red, mustard-yellow, paper, and ink system with a large promotion hero, delivery-address disclosure, service metrics, horizontal quick picks, a deal block, and a two-column popular-product grid. It is structurally different from Moon Bistro and Peach Cloud.
- The fixed footer opens real `shopView=menu|deals|bag|orders|order` pages. It does not append generic shop panels beneath Home.
- Ten menu records cover featured combos, burgers, chicken, sides, drinks, and treats. Product detail, quantity, restaurant-scoped cart persistence, checkout confirmation, and order creation continue through the Food Delivery-owned runtime.
- All ten built-in menu records now resolve product title, description, ingredients, image alternative text, Bag/checkout labels, and Order titles through the system language. `zh-CN` is the default presentation, accurate `en-US` remains available, and Dash menu search indexes both built-in languages plus the current saved copy. Same-ID user-authored fields remain literal and are never rewritten by language switching.
- The two `featured` records are now explicit complete combos rather than burger-only products. Their main item is fixed; the user chooses Sea-Salt or Loaded Cheese Fries and Fountain Cola, Sparkling Water, or Vanilla Cloud Shake. Loaded fries and the shake add visible deltas to the selected unit price. Home/Menu quick-add opens the configuration instead of silently choosing, and the side, drink, selection key, localized labels, and selected unit price persist through Bag, checkout, backup, and order detail. Exact historical default copy migrates to the new complete-meal wording, while any same-ID user-edited field remains literal.
- Combo detail now exposes `2/2` completion, a live selected-content summary, existing Sea-Salt Fries / Loaded Cheese Fries / Vanilla Cloud Shake photography, icon fallbacks for pending drink media, and a compact quantity-plus-total footer. Crisp Chicken Tenders routes through a required House Dash, Smoky BBQ, or Honey Mustard sauce choice; the localized sauce selection uses the same stable line-key, Bag, checkout, backup, and Order snapshot contract.
- Fresh saves receive the normal seed. Existing saves receive missing Dash Grill restaurant/menu IDs plus the exact known burger-only default wording migration for the two combos; any same-ID field that differs from that historical default remains untouched. Explicit backup restore still skips seed-content migration.
- The one cover, ten product PNGs, and two complete default-tray PNGs under `dash-grill/` are delivered on their stable runtime paths. Each file was generated and accepted from the shop's own quick-service brand capsule rather than a Peach Cloud or Verdant Day reference; editable masters, portable CLI request files, contact sheets, and acceptance records remain under `output/imagegen/dash-grill/`. Focused desktop Chromium and simulated Pixel 5 Home/Menu/Detail review confirms complete subjects, distinct compositions, no diagnostic fallback, no horizontal overflow, and no page errors. `data-required-asset` remains as the failure diagnostic contract.
- The accepted single-item pack remains unchanged. `dash-grill/combos/dash-grill-double-stack-combo-01.png` and `dash-grill/combos/dash-grill-golden-chicken-combo-01.png` show the fixed burger/chicken stack, Sea-Salt Fries, and Fountain Cola as one complete quick-service tray in Dash Grill's paper/mustard/ink/red photography language. Each is connected only for that exact default combination; choosing another side or drink returns the large media to item `01` or `02` while the selected side/drink map remains authoritative. Status: `DELIVERED_ACCEPTED / CONNECTED`; the tray-ticket UI remains `IMPLEMENTED / USER_VISUAL_ACCEPTANCE_PENDING`.

The fourth built-in shop app is Jade Hearth.

- Jade Hearth is an original Chinese shared-table concept. It is not assigned to, or claimed as a reproduction of, any Figma reference that has not been read through exact-node design context.
- Its stable restaurant identity is `food_seed_jade_hearth`; its default template is `jade_table_menu`.
- Its Chinese presentation name is `玉炉雅席`, while `Jade Hearth` remains the English name. The built-in identity and all twelve built-in dishes follow system language at presentation time; saved restaurant/menu records and user-authored same-ID fields remain literal.
- The visual system uses rice-paper neutrals, ink green, cinnabar accents, ruled dividers, and an editorial menu-book rhythm. The full-width hero, shared/solo selector, feast collections, and restrained bottom navigation deliberately avoid Moon Bistro's tray cards, Peach Cloud's dessert grid, and Dash Grill's chain promotion layout.
- The current integrated UI candidate turns Home and Menu into a contemporary banquet-menu sequence: real chapter tabs replace `All`, dishes receive stable numbers, vertical title slips, vessel-aware image proportions, and rectangular `添菜 / Add dish` columns, while detail becomes a generous celadon-framed menu leaf with ingredient notes and a sticky quantity/total action.
- Chapter and small-plate rails expose visible branded scrollbars and support touch swipe, wheel/trackpad, mouse drag, arrow controls, and keyboard navigation. Feast provides shared- and solo-table suggestions assembled from current menu sections rather than fixed duplicate products.
- The footer opens real `shopView=menu|feast|bag|orders|order` pages. Home remains a browse surface instead of growing generic cart and order panels beneath itself.
- Twelve dishes cover house-table signatures, small plates, wok favorites, claypot, rice/noodles, and tea/sweets. Product detail, selected quantity, restaurant-scoped cart persistence, checkout confirmation, order creation, and order progress continue through the Food Delivery-owned runtime.
- Jade Hearth's order list receives the complete shop-scoped history, and Chat order links resolve directly to its dedicated `shopView=order&shopOrderId=...` detail. That page presents persisted delivery events, check-update and confirm-delivery actions, plus the existing explicit Wallet-record adapter without moving order or ledger ownership into the facade.
- Fresh saves receive the normal seed. Existing saves receive only missing Jade Hearth restaurant/menu IDs and preserve same-ID user edits; explicit backup restore still skips seed-content migration.
- Seed migration reserves capacity for current built-in menu IDs in addition to the 360 user-menu limit, so adding Jade Hearth cannot evict older user-created dishes. Explicit backup restore remains a faithful snapshot and does not silently add seeds.
- One cover and twelve product PNGs under `jade-hearth/` are delivered on their stable runtime paths. The first-round non-square whole-fish candidate and incorrect five-piece tangyuan candidate remain preserved as rejected evidence; accepted v2 masters drive runtime items `03` and `12`. Editable masters, both portable CLI request files, contact sheets, and the acceptance record remain under `output/imagegen/jade-hearth/`. The existing asset pack remains accepted and is reused unchanged by the new UI candidate; the built-in whole-fish Home card keeps its item-scoped complete-subject crop without modifying Menu/detail media or the runtime PNG. Each image retains its exact `data-required-asset` path. User visual acceptance of the integrated menu composition remains pending.

The fifth built-in shop app is Verdant Day.

- Its stable restaurant identity is `food_seed_verdant_day`; its default template is `minimal_light_food`.
- Verdant Day is a peer entry in the Food Delivery pseudo-folder, not a Food Platform merchant. Its grey-white canvas, full-width brand Hero, circular product-photo treatment, icon-led Home category shortcuts, focused Menu tabs, spacious rows, and low-noise bottom navigation deliberately avoid the other four shops' tray, dessert-grid, chain-promotion, and Chinese menu-book structures.
- The footer and header open real `shopView=menu|detail|bag|orders|order` pages. Search opens the full menu, product taps open a dedicated image-led detail page, Bag opens a branded quantity and checkout surface, and submitted orders open a dedicated progress page instead of extending Home.
- Twelve menu records cover salads, warm bowls, wraps/toasts, drinks, and light sweets. Food Delivery still owns item edits, quantities, restaurant-scoped cart persistence, checkout, orders, and delivery-event state.
- Fresh and existing saves receive only missing stable Verdant Day restaurant/menu IDs. Same-ID user edits are preserved, built-in menu capacity remains reserved beyond the 360 user-menu limit, and explicit backup restore stays snapshot-faithful.
- The active Hero uses `verdant-day/brand/verdant-day-brand-hero-preview-02.png`; its English wordmark and slogan remain part of the approved artwork instead of being replaced by runtime translations. The text-free `verdant-day-brand-hero-art-01.png` remains the manual-edit master. Home categories are destination shortcuts with no false selected state. Menu removes the overlapping `All` category, defaults to the first real non-empty category, searches across the whole shop with grouped results, and exposes unknown user-authored sections through a conditional `More` fallback. Two generated photography assets live under `verdant-day/promotions/` for the active popup and in-app campaign surfaces. The complete `verdant-day-item-01.png` through `verdant-day-item-12.png` product pack is delivered as full-square `768x768` photography with center-safe circular cropping; the shared diagnostic placeholder remains only as load-failure protection.
- Exact `get_design_context` was called for Figma file `IU2qDGgi9weqgHcDO0niWV`, node `1:73`, before implementation, but Figma returned `You've reached the Figma MCP tool call limit on the Starter plan.` The user had already approved using the visible canvas as a non-pixel-exact style reference, so the current UI adapts those visible traits without claiming exact-node reproduction.

## Important Ownership Boundaries

Food Delivery owns:

- restaurant records
- menu item records
- cart behavior
- checkout
- order records and order status
- food delivery service events

Food Platform is a Food Delivery-owned discovery mini app, but it is not the visible owner of peer shop order workflows. Its own platform merchants can use a unified platform template; individual same-level shop mini apps should present their own cart, checkout, order status, and downstream Wallet suggestions.

Map is a context provider:

- delivery address
- distance
- ETA
- route context

Wallet is a downstream record target:

- delivered food orders can become Wallet expense suggestions or records

Chat can provide service-account notification context, but the order truth remains in Food Delivery.

App Store manages:

- install/remove from target pseudo-folder
- user-facing entry name
- icon/facade presentation
- cover image
- short description
- tags
- visual template selection

App Store must not own restaurant/menu/cart/order records.

## Unscheduled Visual Reference

Food Platform's first consumer-homepage pass is done, including the Baemin-like reference decomposition, homepage-load reduction, and real banner autoplay/manual navigation. Keep it as discovery-first: future work can add real favorite/recent behavior for platform-internal merchants and richer platform-specific empty states. Bottom navigation should remain a discovery/navigation affordance, not a hidden aggregate controller for peer shop mini apps.

The checkout, order-card, and order-detail layout slice is done, but the formal order artwork is not. Its PNG positions and fallbacks are stable; any later approved art pass should deliver the core order-state pack before optional merchant marks. The deferred cross-module plan must not block that replacement, and no Map, Chat, Wallet, notification, or relationship writes should be added during asset work.

Two failed ImageGen drafts were never imported into the product asset library or referenced by code. The diagnosed failure combined a Windows `.cmd` inline multiline-prompt truncation with a compatibility service that did not honor the requested square output. Any later CLI generation trial must use a UTF-8 prompt file, inspect a dry-run payload before submitting, and treat every returned image as an unaccepted candidate until dimensions, content, transparency, compression, copyright, and sensitive-information checks pass.

Vistack is only a validated candidate for a semi-automatic asset workbench. It is not currently configured or approved as project tooling, does not create a second roadmap, and does not make downloaded output a formal asset. A controlled future trial may prepare a bounded asset list, generate items one at a time, download them into a temporary intake area, apply human selection and the normal quality gate, and wire accepted files in a separate reviewed slice.

Food Delivery now has nine intentionally different built-in browsing directions. Moon Bistro, Peach Cloud, Dash Grill, Jade Hearth, Verdant Day, and Harbor Roast remain brand-owned facades. Daylight Cafe proves `daypart_journal`, Sugar Lane proves `convenience_shelf`, and River Noodles proves `street_food_stall`. Do not normalize them into one visual system; each new brand pass must begin from a named shop identity and its own content needs.

River Noodles, Daylight Cafe, and Sugar Lane each own nine stable menu IDs across four semantic sections and open through three structurally different reusable templates instead of the previous generic Hero/list facade. These templates own browsing composition only: they open the first real section, omit `All`, and reuse Food Delivery item detail, restaurant-scoped cart, checkout, order, and delivery runtime. Existing saves receive missing restaurant/menu IDs; the six exact historical default Unsplash URLs and unchanged copy for the three original items migrate to the new local contracts, while custom URLs and other same-ID user edits remain untouched. Explicit backup restore remains snapshot-faithful. Their asset contracts remain fully enumerated in `FOOD_DELIVERY_IMAGE2_ASSET_PROMPTS.md`.

Daylight Cafe's `10` formal files are now delivered under `public/images/ui-assets/apps/food-delivery/daylight-cafe/`. Its accepted masters, CLI request variants, contact sheet, object-cover diagnostic preview, and request/acceptance log remain under `output/imagegen/daylight-cafe/`; runtime does not read that directory. Focused desktop Chromium and simulated Pixel 5 review covers the `daypart_journal` identity crop, daypart selector, lead/supporting product layout, full-subject product details, and overflow/error checks. The identity image uses a `68%` horizontal focal point within the journal cover slot, and Daylight detail images alone use `object-contain` on Cream because the shared shallow detail slot otherwise clips cup rims, glass bases, and plated food. The square runtime masters remain unchanged for thumbnail use.

River Noodles and Sugar Lane now each deliver one `1200x750` cover plus nine `768x768` product PNGs, closing their recorded `20`-file formal-media gap. River Noodles keeps its river-teal stoneware, natural window light, varied soup/dry-noodle/side/drink vessels, and distinct food semantics; Sugar Lane keeps its berry/porcelain display-window language with crescent, slice, tart, choux, chilled-dessert, and drink silhouettes rather than inheriting Daylight Cafe or Peach Cloud styling. Exact CLI requests, untouched candidates, accepted exports, contact sheets, and acceptance records remain under `output/imagegen/river-noodles/` and `output/imagegen/sugar-lane/`; runtime reads only the matching stable `public/` folders. Focused desktop Chromium and simulated Pixel 5 Playwright verify local cover/product dimensions, category switching, menu cards, shared detail open/close, App Store template reassignment, console state, and horizontal overflow. The shared detail control row now sits above the image layer so loaded media cannot intercept Close or Edit. Named physical-device proof remains separate.

The App Store selector offers six general structures: `standard`, `cafe_counter`, `convenience_shelf`, `street_food_stall`, `daypart_journal`, and `menu_mosaic`. `daypart_journal` replaces the previous Daylight counter reuse with a time-indexed editorial composition; `menu_mosaic` adds a color-block category atlas and asymmetric product grid without claiming a fixed built-in brand. Applying reusable structures to another restaurant has focused regression coverage and must not leak Daylight Cafe, Sugar Lane, or River Noodles wording or assets. The six brand-owned facade IDs remain visible while editing the built-in shop currently using them, but they are not offered as general replacements until their special routes and fixed brand material are extracted.

Harbor Roast owns the non-general `harbor_roast_chain` facade, and its stable restaurant identity is `food_seed_harbor_roast`. It now provides thirteen items across espresso classics, Harbor signatures, cold/blended drinks, tea/counter bakes, and one collaboration section. The full Menu is a dark coffee-board list that foregrounds order number, roast/flavor copy, hot/iced availability, cup sizes, starting price, and a rectangular customize command instead of a generic circular quick-add button. Product detail persists actual temperature, `8 / 12 / 16oz` size, and packaging choices; size and campaign-sleeve deltas update the current line price. Old cart/order records remain readable, while customized lines merge only when their selection keys match and preserve localized selection labels plus the selected unit price through Bag, checkout, and order detail. The attractive retired circular-detail composition remains a transferable future-shop pattern candidate, but no destination shop is selected and this round does not migrate it.

Home now uses four large clickable campaigns. The fourth opens route-driven `shopView=pompompurin`, whose activity page uses code-rendered bilingual copy, a portrait Hero, a packaging relationship band, separate base-cup/sleeve/carrier modules, and one purchasable `Pompompurin Dockside Custard Set / 布丁狗港湾布蕾套餐`. Harbor's cream paper cup, charcoal lid, and copper anchor are the permanent packaging layer; Pompompurin artwork belongs only to a replaceable sleeve and a separate handled carrier. A single drink may add the removable sleeve, while the collaboration combo includes both sleeve and carrier. Future collaborations replace campaign layers without redrawing the permanent cup. This user-requested IP activity may show the recognizable Pompompurin character, but generated assets must not invent or approximate Sanrio wordmarks or official logos. The Captain Roast commercial band and Passport still lead to the dedicated `supply` station, while each of four stable merchandise records opens a route-driven `supply-detail` advertisement page. The built-in restaurant continues to produce the `shop_app_food_seed_harbor_roast` App Store entry, and user-provided Gallery icon/cover overrides remain higher priority than delivered defaults. Fresh and existing saves receive missing stable IDs while same-ID user edits remain intact; explicit backup restore remains snapshot-faithful.

Harbor Roast ordering adds an optional fulfillment snapshot to the existing Food Delivery order schema: historical and unspecified orders normalize to `delivery`; new Harbor orders may use `pickup`, with `takeout` or `dine_in` as the pickup mode. Pickup orders persist a store location, normalize delivery fee to zero, and open Harbor's order detail immediately after submission. The restaurant-scoped cart now supports backward-compatible `menu` and `merchandise` lines. Merchandise may be `purchase` or `redeemed_gift`: purchased lines use their cash price, eligible redemption atomically deducts the product's bean-stamp cost and creates a zero-price gift line, insufficient balances cannot create a line, and removing an unsubmitted gift returns its stamps. Checkout snapshots both acquisition modes, clears only Harbor's bag, and never charges a redeemed gift. This remains one Food Delivery-owned reward/cart/order store. Browsing, redemption, purchase, and bag actions add no Wallet, Assets, Chat, Map, or external campaign writes; submitted orders retain the package's existing service-account notification path.

Harbor Roast's audited contract now contains `41` `DELIVERED_ACCEPTED` PNGs under `public/images/ui-assets/apps/food-delivery/harbor-roast/`. The previously accepted `34` remain unchanged. Seven new runtime files add the permanent paper cup, removable Pompompurin sleeve, separate carrier, exact collaboration combo, fourth Home carousel, portrait activity Hero, and wide packaging story. Their CLI prompts, reference roles, candidates, accepted masters, contact sheet, acceptance reasons, and visual-QA evidence remain under `output/imagegen/harbor-roast-pompompurin-collab/`; runtime never reads that directory. Focused Playwright passes in desktop Chromium and Mobile Chrome, while manual default-desktop and `393x851` review confirms Home/menu/detail/activity/Bag/order crop and semantics, image decode, no horizontal overflow, and no warning/error console entries. Named physical-device proof remains separate.

Deferred shop UI decisions are recorded rather than partially implemented. Jade Hearth's integrated paper-banquet-menu candidate is now connected, but user visual acceptance remains pending before the direction can be closed. Verdant Day keeps circular food photography but still needs ingredient-level salad customization: each ingredient must own explicit plus/minus controls and a visible price delta, which requires a modifier snapshot contract before UI work. Dash Grill now has connected image-led order tickets on Home/Menu plus a tray-ticket combo detail. Selection pricing and Bag/checkout/order snapshots are implemented, and both accepted complete default-tray photographs are connected only while their matching default side and drink remain selected; user visual acceptance remains pending.

Unscheduled framework candidates include Korean fried chicken, Southeast Asian food, Korean soup, and an additional pizza app. They are accepted reference directions, not a remaining approved execution queue. The Chinese-food slot is represented by Jade Hearth and the light-food slot by Verdant Day. The general food ordering `YCNJqicXdksq2gdaKqINQc` node `0:1`, coffee `JJi7C0USRtDL3QKVFcaMnh` node `2:2`, and pizza `M3EEtlpk26gLRtDifyGCcV` node `0:1` references remain reserved for later evaluation. The minimalist light-food reference `IU2qDGgi9weqgHcDO0niWV` node `1:73` informed Verdant Day only through its visible canvas because the required exact-node context call hit the current Figma Starter quota. Retry `get_design_context` after quota reset before claiming closer node-level fidelity.

Moon Bistro polish direction: modern fine dining with a dark tray menu. Preserve its candlelit atmosphere without presenting it as a late-night restaurant.

Moon Bistro reference checklist, with no implied execution order:

1. Shop header
   - First polish pass is done: the first screen now has shop status, rating, ETA, delivery fee, distance, short shop identity, and a project-local Moon Bistro cover image.
   - Next pass can tune the cover crop and add more brand-specific microcopy or motion if the shop needs a stronger personality.
   - Keep Home and Food Platform navigation visible but visually quiet.

2. Dish cards
   - First polish pass is done: cards now push the embedded tray feel further, use project-local Moon Bistro dish photos for the initial menu, and show dish descriptions instead of backend-like image-source labels.
   - Latest pass is done: the shop has nine dishes across multiple sections and a sticky side category rail for browseability.
   - Next pass should tune responsive card density and polish the section labels/selected states after real-device review.
   - Keep title, price, visual identity, and add action easy to scan.

3. Bottom cart
   - First polish pass is done: it reads more like a delivery-app checkout bar and uses checkout language.
   - Latest pass hides it while empty, so the shop home does not start with a backend-looking empty-cart module.
   - Show quantity, total price, and checkout action.
   - Keep empty-cart state quiet.

4. Dish detail sheet
   - Keep the large circular image composition.
   - First polish pass removes image-source language from the dark detail view and uses delivery/fee context instead.
   - Continue improving spacing, hierarchy, tags, ingredients, quantity stepper, and add-to-cart affordance.
   - Keep the small edit icon available but low-noise.

5. Order & delivery section
   - The accepted consumerization pass is landed: keep it folded by default in shop mode and preserve the consumer-facing delivery details and actions.
   - Do not restore ownership, simulation, source-plan, or other technical-console wording.
   - Preserve stable event/route hooks, safe ETA fallback, explicit Wallet/Map actions, 44px targets, visible focus, long-copy wrapping, and reduced-motion behavior.

## Files To Read First

Start with these files:

- `docs/pm/commerce-finance-and-assets/FOOD_DELIVERY_SHOP_MINI_APP_HANDOFF.md`
- `docs/product-decisions/APP_STORE_ENTRY_TYPES_AND_FOOD_SHOP_APPS.md`
- `src/views/HomeView.vue`
- `src/lib/home-folder-mini-app-entries.js`
- `src/views/FoodDeliveryView.vue`
- `src/stores/foodDelivery.js`
- `tests/home-folder-entry.test.js`
- `tests/food-delivery-view.test.js`

## Validation Commands

Run focused validation while working on this slice:

```bash
npm run test -- tests/food-delivery-view.test.js tests/home-folder-entry.test.js
npm run lint
npm run build
```

If App Store placement is touched, also run:

```bash
npm run test -- tests/app-store-mini-app-placement.test.js tests/planned-module-registry.test.js
```

## Other Device Startup Commands

Use the current repo state, not an old bookmarked local preview.

```bash
cd d:\github\schatphone
git status --short
git pull
npm install
npm run test -- tests/food-delivery-view.test.js tests/home-folder-entry.test.js
npm run dev -- --host 127.0.0.1
```

After starting the dev server, use the URL printed by Vite. Do not assume a fixed port and do not reuse an old local preview link from another session.

If a known old preview is still open in the browser, close it and refresh from the newly printed Vite URL. If the page looks like the early legacy Home layout, it is not a valid reference for this work.

## Historical Prompt (Do Not Use As Current Scope)

The text below is retained only as historical handoff evidence. It predates the live roadmap's ordinary consequence priority and must not be used to start work without a new roadmap promotion:

```text
继续 SchatPhone 外卖 mini app 工作。先阅读 docs/pm/commerce-finance-and-assets/FOOD_DELIVERY_SHOP_MINI_APP_HANDOFF.md 和 docs/product-decisions/APP_STORE_ENTRY_TYPES_AND_FOOD_SHOP_APPS.md。

当前目标：继续打磨 Food Delivery。保持外卖伪文件夹第一层为 Food Platform + 店铺 mini app；不要把分类重新做成第一层入口。Food Platform 只展示平台内商家流，不打开、不汇总同级店铺 mini app。Moon Bistro 打开后必须是 shop-first，不显示外卖平台大头图和平台列表。保留菜品详情弹窗、单菜品编辑按钮、图片可更换、加购物车与订单归 Food Delivery 所有。

先检查 src/views/FoodDeliveryView.vue、src/lib/home-folder-mini-app-entries.js、tests/food-delivery-view.test.js、tests/home-folder-entry.test.js。不要使用旧本地预览链接；用当前仓库启动的 Vite 输出 URL。完成后运行 npm run test -- tests/food-delivery-view.test.js tests/home-folder-entry.test.js、npm run lint、npm run build。
```
