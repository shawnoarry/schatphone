# App Store Entry Types And Food Shop Apps

Updated: 2026-06-02

This note defines how App Store, Home pseudo-folders, World Pack app entries, and reusable shop mini-app entries should relate to each other.

## Product Decision

App Store should manage user-visible entry points, not only code-level apps.

In SchatPhone, an entry can look like an app to the user even when it opens an existing module with extra context. The backend identity must stay stable, while the user-visible name, icon, placement, and skin can be customized.

## Entry Types

| Entry type | User meaning | Backend meaning | Primary placement |
| --- | --- | --- | --- |
| Independent function app | A real app such as Chat, Map, Wallet, Food Delivery | Stable app/module id such as `app_chat`, `map`, `food_delivery` | Home, Dock, App Store, App Library |
| World Pack app | A world-specific app-like entry such as Rescue Dispatch or Supply Station | Opens an existing target app with `worldPack` / `worldApp` context, UX copy, accent, and safe behavior changes | App Store World section, Home, App Library |
| Folder mini app / shop app | A reusable next-layer mini app such as Moon Bistro, a user-created noodle shop, or a world-pack potion shop | A bound source module plus source record/context. Current allowed bindings are `Food Delivery` and `Shopping`; each source module owns its own catalog/menu/cart/order truth | Inside the bound module pseudo-folder; App Store only manages install/facade/launch context |
| System entry | Protected system capability such as App Store, Settings, World Hub | Stable system entry | Fixed or protected Home/App Store surfaces |

## Naming Rule

Separate user-visible names from backend identities.

Examples:

- User can rename Chat to `Wee`, but the backend still uses `app_chat` and `/chat`.
- User can rename Food Delivery to `Takeout`, but the backend still uses `app_food_delivery` and `/food-delivery`.
- User can rename Moon Bistro to `Moon Kitchen`, but the backend still uses that restaurant's stable `restaurantId`.
- User can create a shop entry called `Potion Stand`, but it must still bind to a supported owner such as Shopping or Food Delivery before it can have products, menu items, cart, or order behavior.

This keeps immersion flexible without breaking routes, stores, event ownership, tests, CSS scopes, or cross-module records.

## Target Folder Binding Rule

`Shops` is the code/type name for shop-shaped folder mini apps, not a synonym for Food Delivery and not a consumer browsing category inside App Store.

A folder mini app with commerce behavior must declare a bounded runtime owner:

| Binding target | User meaning | Runtime owner | Current status |
| --- | --- | --- | --- |
| `Food Delivery` | restaurant, cafe, food stall, delivery shop | Food Delivery owns restaurants, menus, food cart, checkout, delivery orders, order events, Wallet suggestions, Map handoff, and Chat service pushes | First working implementation exists |
| `Shopping` | store, marketplace shop, item seller, supply desk | Shopping owns products, shopping cart, checkout, shopping orders, logistics links, Calendar cues, Wallet/Assets handoffs, and Chat service pushes | Supported binding target exposed in App Store |

Do not let App Store accept arbitrary routes as shop bindings. New binding targets require a product decision and a source module that can own the real records.

Product meaning:

- App Store manages install availability and the mini app facade: target folder, name, icon, cover, short description, tags, template, listing, and open context.
- The bound module manages the business truth: catalog/menu, cart, checkout, order lifecycle, downstream records, and service notifications.
- A shop can come from a built-in seed, user creation, or a World Pack, but it still needs a supported binding target.
- App Store must not become the user's daily shop-browsing surface. Food Delivery and Shopping own category filters, favorites, recent shops, carts, orders, and service notifications inside their own folder apps.

## World And Shops Intersection

`World` and `Shops` are different axes.

`World` means "this entry is unlocked by the active World Pack." Current World entries are built from active world-pack app bindings. They appear only while the corresponding world pack is active, and they open existing target apps with `worldPack` / `worldApp` context. When the world pack is not active, those entries should not appear in the App Store World section.

`Shops` means "this entry is a folder mini app with storefront behavior." A World Pack can generate a shop entry, but that entry should usually live in App Store's installable mini-app set with `source: world_pack` and a supported binding target such as Shopping or Food Delivery. WorldBook still owns pack activation/review; App Store only shows entries made available by active or approved sources.

Examples:

- `补给站 / Supply Station` can be a World entry that opens Shopping with survival-world context.
- `废土补给摊 / Wasteland Supply Stall` can be a Shop entry generated by the same world pack, bound to Shopping for product/cart/order behavior.
- `深夜拉面摊 / Night Ramen Stall` can be a Shop entry generated by a world pack, bound to Food Delivery for menu/cart/delivery behavior.

This avoids treating every world-specific storefront as either a full independent app or a Food Delivery-only restaurant.

## Food Delivery Pseudo-Folder Direction

Food Delivery should not feel only like a generic delivery platform.

The Food Delivery Home entry can behave like a pseudo-folder that contains a small collection of food-related app-like entries:

1. Food platform entry
   - General browsing, search, nearby, recent orders, discovery, and order management.
2. Featured shop apps
   - Built-in stores with distinct visual treatments.
   - Examples: dark tray menu shop, cafe counter, dessert window, convenience shelf, street-food stall.
3. User-created shop apps
   - Created from templates.
   - Can be named, given an icon/cover, assigned a skin, and configured with menu items.
4. Add mini app entry
   - Opens the shop-template creation flow.

Food categories such as fast food, cafe, dessert, grocery, and nearby should become filters or tags, not the first-level pseudo-folder objects.

## App Store Responsibilities

App Store should offer a clear taxonomy for entry management:

- `Apps`: independent function apps.
- `World`: World Pack app entries.
- `Mini apps / Shops`: reusable folder mini apps and shop templates, with limited target folders such as Food Delivery and Shopping.
- `System`: protected or fixed system entries.

For shop apps, App Store should support:

1. Start a folder mini app from a template or available source.
2. Choose the target folder from an allowed list:
   - Food Delivery
   - Shopping
   - future targets only after a source-owner decision
3. Edit mini app facade:
   - display name
   - icon
   - cover image
   - short description
   - tags/category
4. Edit shop skin:
   - built-in template style
   - optional shop-scoped CSS
5. Hand off source-owned editing to the target folder:
   - Food Delivery owns menu basics.
   - Shopping owns product basics.
6. Add/remove the mini app from the bound module pseudo-folder.

App Store should manage entry availability, facade, target-folder placement, and launch context. The bound module still owns records, carts, orders, fulfillment events, Wallet/Assets/Map/Calendar handoffs, Chat service notifications, and any user-facing shop browsing filters inside the folder.

## Food Delivery Responsibilities

Food Delivery should own the actual shop runtime:

- store records
- menu item records
- cart behavior
- checkout
- orders
- order events
- delivery route context
- Wallet suggestions
- Chat service-account pushes
- restaurant-specific shop pages

Food Delivery should render shop apps as immersive mini-apps when opened through `restaurantId` or the future shop-entry route context.

## Shopping Responsibilities

Shopping should become the second supported shop binding target.

Shopping should own:

- store records
- product records
- shopping cart behavior
- checkout
- shopping orders
- logistics links
- Calendar delivery cues
- Wallet suggestions
- Assets handoffs
- Chat service-account pushes

Shopping shop entries can use the same App Store facade controls as Food Delivery shop entries, but their product/order truth must stay inside Shopping.

## Pseudo-Folder UX Requirement

Pseudo-folders need scrollable or paged content.

Food Delivery shops can grow over time, especially once users can create their own shops. The pseudo-folder should not assume a fixed number of entries.

Recommended first screen:

1. Folder title and search/add controls.
2. Fixed Food platform entry.
3. Favorite or recent shop apps.
4. Scrollable shop grid/list.
5. Filter chips for tags such as all, favorite, recent, late night, cafe, dessert, grocery.

## Shop Template Direction

Initial shop templates can include:

1. `dark_tray_menu`
   - Inspired by dark POS food menu layouts.
   - Food photos sit in a raised or embedded tray/card composition.
   - Best for late-night food, ramen, barbecue, cyber-style restaurants.
2. `cafe_counter`
   - Light drink-focused layout with menu groups and gentle product imagery.
3. `dessert_window`
   - Display-window feel for cakes, bakery, ice cream, and sweets.
4. `convenience_shelf`
   - Shelf/grid layout for grocery and convenience-store delivery.
5. `street_food_stall`
   - Warmer, denser, quick-order layout for snacks and local food stalls.

Templates are visual and UX presets. They must not create separate order systems.

## Do Not Do

1. Do not treat shop apps as real independent code modules.
2. Do not split Food Delivery or Shopping cart/order ownership per shop app.
3. Do not make categories the first-level objects inside the Food Delivery pseudo-folder.
4. Do not put World Pack activation or review inside Food Delivery shop management.
5. Do not let App Store edit source-owned order, Wallet, Map, or Chat records.
6. Do not hard-code `Shops` to Food Delivery. Food Delivery is only the first supported binding target.

## Implementation Handoff

Current implementation status:

- App Store now classifies entries as `Apps`, `World`, `Mini apps` (code type: `Shops`), and `System`, while preserving `All`, `Home`, and `Library` filters.
- Standard app display names can be edited from App Store's identity sheet. This changes the phone-facing name only; routes, stable ids, CSS scopes, events, and stores still use the backend identity.
- Home tiles and Dock metadata read the same display-name override for standard apps.
- Food Delivery restaurant records are exposed in App Store as `bindingTarget: food_delivery` folder mini apps. Opening one routes to Food Delivery with `restaurantId` and shop-entry context.
- Shopping platform services are exposed in App Store as `bindingTarget: shopping` shop entries. Opening one routes to Shopping with `service`, `category`, `entry=shop`, and `shopEntryId` context while Shopping keeps product/cart/order ownership.
- Folder mini apps can now save App Store-side display/icon presentation overrides. This changes how the mini app appears in App Store; it does not rename the source record or alter Food Delivery/Shopping runtime state.
- Folder mini apps can now also save App Store-side cover images, short descriptions, display tags, and a selected shop template. App Store detail renders the cover as facade media; Food Delivery and Shopping read the cover/description/tags/template presentation when showing opened shop surfaces, while actual restaurant/menu/product/order records stay unchanged.
- App Store's mini-app section now has an add-handoff sheet. The user chooses `food_delivery` or `shopping`, then App Store routes to the selected owner with `entry=shop`, `createShop=1`, and `bindingTarget` context. Food Delivery shows a restaurant-creation handoff and creates the real restaurant record inside Food Delivery. Shopping shows a Shopping-owned creation workspace handoff for service shelves/custom products while a dedicated custom Shopping store-record model remains a later product decision.
- App Store now manages installed/not-installed placement for folder mini apps. Removing a mini app from its target folder hides it from the Food Delivery or Shopping folder list, but does not delete the restaurant, service preset, menu/product data, cart/order truth, or direct source-owned route.
- Home pseudo-folders now read the same installed/not-installed placement. Food Delivery's folder first layer is the fixed Food platform entry plus installed restaurant shop mini apps; category entries such as nearby, fast food, cafe, dessert, and grocery stay inside Food Delivery as filters/tags, not folder-level apps. Shopping uses the same reusable folder mini-app builder for its installed shop entries.
- Food Delivery shop entries opened with restaurant context now render shop-first: platform hero/list chrome is hidden, the shop owns the first screen, the cart becomes the ordering anchor, and Map/order/Wallet support panels are folded behind an order-and-delivery section.
- Template selection is a visual/UX preset only. It can change the shop surface treatment, but it must not create a separate cart, checkout, order lifecycle, Wallet handoff, Map route, or Chat service channel.
- Shop entries are not treated as independent apps in V1/V2: App Store does not place them on Home and does not edit their runtime state, menus, carts, orders, or service notifications.
- App Store detail panels show entry type, original category, open target, runtime identity, phone-facing display name, default name, and ownership boundary copy.
- Product correction after V2 is now implemented for the App Store boundary: shop entries carry an explicit binding target, existing Food Delivery shops resolve as `food_delivery`, Shopping is the second supported target, App Store-side cover facade media is supported, create-shop V0 is an owner-handoff flow instead of App Store creating business records, and installed/not-installed placement now controls whether entries appear inside target pseudo-folder lists. App Store no longer owns shop favorites, recent-opened lists, sorting, or consumer category filters; those belong inside the target pseudo-folder apps. The next implementation should continue from any future Shopping-owned custom store/service record model.
- World entries currently come from the active World Pack's app bindings. They are hidden when the related world pack is not active. A World Pack may also generate shop entries, but those should be `Shops` entries with `source: world_pack` plus a supported binding target, not Food Delivery-only records by default.

Still pending after the current slice:

- Broaden create-shop beyond the V0 owner handoff only after the selected target owns a real source record model. Food Delivery already has user-created restaurant records; Shopping still needs a product decision for custom store/service records beyond preset platform services.
- Menu basics editing from App Store, if product decides App Store should expose a light editor rather than deep-linking to Food Delivery.

Any future worker should keep this boundary: App Store manages how entries look and where users find/open them; the selected binding target owns the actual catalog/menu, cart, order, fulfillment, downstream handoffs, and Chat push records.
