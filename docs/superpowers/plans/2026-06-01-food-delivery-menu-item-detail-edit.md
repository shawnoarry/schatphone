# Food Delivery Menu Item Detail Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users tap one food item to view details, add it to cart, and enter a small edit mode for only that item to update copy and image.

**Architecture:** Keep Food Delivery as the owner of restaurants, menus, cart, and orders. Reuse `upsertMenuItem` for single-item edits, add an `ingredients` field to menu items, and keep the edit UI inside the item detail sheet so platform/store navigation remains unchanged.

**Tech Stack:** Vue 3, Pinia, Vitest, Vue Test Utils, existing `ImageSourcePicker`.

---

### Task 1: Store Support

**Files:**
- Modify: `src/stores/foodDelivery.js`
- Test: `tests/food-delivery-store.test.js`

- [ ] Add `ingredients` normalization to `normalizeMenuItem`, using `rawItem.ingredients` or `rawItem.baseIngredients`, max length 180.
- [ ] Preserve `id`, `restaurantId`, `price`, `category`, cart/order behavior, and image normalization through existing `upsertMenuItem`.
- [ ] Add a store test proving an existing menu item can be updated with new `title`, `desc`, `ingredients`, and URL image without changing its id or restaurant.

### Task 2: Detail And Edit Sheet

**Files:**
- Modify: `src/views/FoodDeliveryView.vue`
- Test: `tests/food-delivery-view.test.js`

- [ ] Add state for selected menu item id, detail mode, edit feedback, and a single-item edit draft.
- [ ] Make menu cards open a detail sheet from the card/body while keeping the add button as direct add-to-cart.
- [ ] Detail mode shows image, title, price, desc, ingredients, source label, a small edit icon button, close, and add-to-cart.
- [ ] Edit mode swaps the body to item-only fields: title, desc, ingredients, image source picker, save, and cancel.
- [ ] Saving calls `foodDeliveryStore.upsertMenuItem` with the selected item id and restaurant id, then returns to detail mode.
- [ ] Closing or route restaurant changes exits the sheet cleanly.
- [ ] Add a view test for: open store -> click menu item -> detail appears -> add-to-cart works from detail -> edit -> update text and URL image -> save -> same item detail and card reflect updates.

### Task 3: Validation

**Files:**
- Modify: `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

- [ ] Run `npm.cmd run test -- tests/food-delivery-store.test.js tests/food-delivery-view.test.js`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Run `npm.cmd run test`.
- [ ] Record that Food Delivery now has single-menu-item detail/edit without moving app-wide appearance or order ownership.
