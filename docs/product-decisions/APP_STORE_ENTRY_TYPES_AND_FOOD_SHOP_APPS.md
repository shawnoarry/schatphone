# App Store Entry Types And Food Shop Apps

Updated: 2026-06-01

This note defines how App Store, Home pseudo-folders, World Pack app entries, and Food Delivery shop mini-apps should relate to each other.

## Product Decision

App Store should manage user-visible entry points, not only code-level apps.

In SchatPhone, an entry can look like an app to the user even when it opens an existing module with extra context. The backend identity must stay stable, while the user-visible name, icon, placement, and skin can be customized.

## Entry Types

| Entry type | User meaning | Backend meaning | Primary placement |
| --- | --- | --- | --- |
| Independent function app | A real app such as Chat, Map, Wallet, Food Delivery | Stable app/module id such as `app_chat`, `map`, `food_delivery` | Home, Dock, App Store, App Library |
| World Pack app | A world-specific app-like entry such as Rescue Dispatch or Supply Station | Opens an existing target app with `worldPack` / `worldApp` context, UX copy, accent, and safe behavior changes | App Store World section, Home, App Library |
| Shop app | A restaurant/store mini-app such as Moon Bistro or a user-created noodle shop | Food Delivery restaurant record plus route context such as `restaurantId`; orders/cart/events stay owned by Food Delivery | Food Delivery pseudo-folder, App Store shop-management section |
| System entry | Protected system capability such as App Store, Settings, World Hub | Stable system entry | Fixed or protected Home/App Store surfaces |

## Naming Rule

Separate user-visible names from backend identities.

Examples:

- User can rename Chat to `Wee`, but the backend still uses `app_chat` and `/chat`.
- User can rename Food Delivery to `Takeout`, but the backend still uses `app_food_delivery` and `/food-delivery`.
- User can rename Moon Bistro to `Moon Kitchen`, but the backend still uses that restaurant's stable `restaurantId`.

This keeps immersion flexible without breaking routes, stores, event ownership, tests, CSS scopes, or cross-module records.

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
4. Add shop entry
   - Opens the shop-template creation flow.

Food categories such as fast food, cafe, dessert, grocery, and nearby should become filters or tags, not the first-level pseudo-folder objects.

## App Store Responsibilities

App Store should offer a clear taxonomy for entry management:

- `Apps`: independent function apps.
- `World`: World Pack app entries.
- `Shops`: Food Delivery shop apps and shop templates.
- `System`: protected or fixed system entries.

For shop apps, App Store should eventually support:

1. Create a shop from a template.
2. Edit shop identity:
   - display name
   - icon
   - cover image
   - short description
   - tags/category
3. Edit shop skin:
   - built-in template style
   - optional shop-scoped CSS
4. Edit menu basics:
   - item name
   - price
   - image
   - availability
5. Add/remove the shop from the Food Delivery pseudo-folder.

App Store should manage the entry identity and placement. Food Delivery still owns restaurants, menus, carts, orders, delivery events, Wallet handoffs, Map handoffs, and Chat service notifications.

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
2. Do not split Food Delivery cart/order ownership per shop app.
3. Do not make categories the first-level objects inside the Food Delivery pseudo-folder.
4. Do not put World Pack activation or review inside Food Delivery shop management.
5. Do not let App Store edit source-owned order, Wallet, Map, or Chat records.

## Implementation Handoff

This decision is intended for the ongoing App Store redesign thread.

That thread should use this document to add entry-type classification and future shop-app management affordances without needing to finish the full Food Delivery shop creation flow in the same slice.
