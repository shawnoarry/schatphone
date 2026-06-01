# Food Delivery Pseudo-Folder Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Food Delivery default screen feel like a pseudo-folder of food app entries: a Food platform entry plus restaurant shop mini-apps, with categories moved into filters.

**Architecture:** Keep the existing `/food-delivery` route and `useFoodDeliveryStore` ownership. The platform state remains `!restaurantId`, but the platform template changes from category-first to entry-first. Restaurant cards are treated as shop app launch entries; category keys continue to filter the visible shop list and preserve world-pack query context.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils, JavaScript ES modules.

---

## Scope Check

This plan implements the next Food Delivery visual/IA slice after `docs/product-decisions/APP_STORE_ENTRY_TYPES_AND_FOOD_SHOP_APPS.md`.

In scope:

- The first screen of Food Delivery should show a pseudo-folder style entry surface.
- Include a fixed Food platform entry.
- Show restaurants as shop app entries with stable `food-delivery-open-store-*` launch buttons.
- Keep category filters, but make them filters/tags rather than the first visible object group.
- Preserve existing cart/order/Map/Wallet/Chat behavior and route context.

Out of scope:

- App Store shop creation/management.
- Real shop-template persistence.
- Per-shop user naming and icon editing.
- Full dark tray menu store redesign.
- New cart/order ownership.

## File Structure

- Modify `tests/food-delivery-view.test.js`
  - Add/adjust assertions that Food Delivery platform renders a pseudo-folder home and treats category buttons as filters.
- Modify `src/views/FoodDeliveryView.vue`
  - Add small computed helpers for pseudo-folder entries and platform summary.
  - Rework the `!isStoreMode` template into fixed Food platform entry + shop app grid/list + filter chips.
  - Preserve old test ids where possible for current regression coverage.
- Modify `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
  - Record the pseudo-folder first-screen IA update.
- Modify `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
  - Record that Food Delivery now reflects the shop-app entry taxonomy in the actual app.

---

### Task 1: Add Pseudo-Folder Home Tests

**Files:**
- Modify: `tests/food-delivery-view.test.js`

- [ ] **Step 1: Update the category baseline test**

In `renders folder-backed categories and Map handoff boundaries`, add assertions:

```js
    expect(wrapper.get('[data-testid="food-delivery-pseudo-folder-home"]').text()).toMatch(/Platform|平台/)
    expect(wrapper.get('[data-testid="food-delivery-platform-entry"]').text()).toMatch(/Platform|平台/)
    expect(wrapper.get('[data-testid="food-delivery-shop-app-list"]').text()).toContain('Moon Bistro')
```

Keep the existing assertions for `food-delivery-category-panel`, `food-delivery-data-baseline`, `food-delivery-cart-panel`, Map boundary, Map handoff, cafe filter, and source plan.

- [ ] **Step 2: Update the store opening test**

In `opens a restaurant as an individual store surface from the platform`, add:

```js
    expect(wrapper.get(`[data-testid="food-delivery-shop-app-${restaurant.id}"]`).text()).toContain(restaurant.name)
```

Keep the existing `food-delivery-open-store-${restaurant.id}` click path.

- [ ] **Step 3: Run failing focused test**

Run:

```bash
npm.cmd run test -- tests/food-delivery-view.test.js
```

Expected: fail because `food-delivery-pseudo-folder-home`, `food-delivery-platform-entry`, `food-delivery-shop-app-list`, and `food-delivery-shop-app-*` do not exist yet.

- [ ] **Step 4: Commit failing tests**

Run:

```bash
git add tests/food-delivery-view.test.js
git commit -m "test: cover food delivery pseudo folder home"
```

---

### Task 2: Add Pseudo-Folder View Helpers

**Files:**
- Modify: `src/views/FoodDeliveryView.vue`

- [ ] **Step 1: Add platform count helpers**

Near `activeRestaurants`, add:

```js
const platformRestaurantCount = computed(() => foodDeliveryStore.restaurantCount)
const platformMenuItemCount = computed(() => foodDeliveryStore.menuItemCount)
```

- [ ] **Step 2: Add shop-app entry helpers**

Add:

```js
const shopAppEntries = computed(() =>
  activeRestaurants.value.map((restaurant) => ({
    ...restaurant,
    visual: FOOD_STORE_VISUALS[restaurant.category] || FOOD_STORE_VISUALS.restaurants,
  })),
)
```

This is view-level presentation only. It must not mutate restaurant records.

- [ ] **Step 3: Run focused test**

Run:

```bash
npm.cmd run test -- tests/food-delivery-view.test.js
```

Expected: still fail until the template exposes the new test ids.

---

### Task 3: Rework Platform Template Entry Order

**Files:**
- Modify: `src/views/FoodDeliveryView.vue`

- [ ] **Step 1: Wrap platform mode in pseudo-folder home id**

Change the platform root from:

```vue
<div v-if="!isStoreMode" class="space-y-4" data-testid="food-delivery-platform">
```

to:

```vue
<div
  v-if="!isStoreMode"
  class="space-y-4"
  data-testid="food-delivery-platform"
>
  <section
    class="rounded-3xl border border-orange-100 bg-white p-4"
    data-testid="food-delivery-pseudo-folder-home"
  >
```

Close the section before the custom form. Keep the custom form outside the pseudo-folder home but still in platform mode.

- [ ] **Step 2: Add fixed Food platform entry**

Inside `food-delivery-pseudo-folder-home`, before filters, add:

```vue
<article
  class="rounded-3xl bg-gray-950 p-4 text-white"
  data-testid="food-delivery-platform-entry"
>
  <div class="flex items-start justify-between gap-3">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-200">
        {{ t('固定入口', 'Fixed entry') }}
      </p>
      <h2 class="mt-1 text-lg font-black">{{ t('外卖平台', 'Food Platform') }}</h2>
      <p class="mt-2 text-xs leading-5 text-white/70">
        {{ t('搜索、附近、订单与所有店铺发现都从这里进入。', 'Search, nearby, orders, and broad discovery stay here.') }}
      </p>
    </div>
    <span class="rounded-2xl bg-white/10 px-3 py-2 text-right text-[11px] font-bold">
      {{ platformRestaurantCount }} {{ t('店', 'shops') }}
    </span>
  </div>
</article>
```

- [ ] **Step 3: Move category panel into filter role**

Keep `data-testid="food-delivery-category-panel"`, but change visible copy to filter language:

```vue
<p class="text-sm font-bold">{{ t('筛选店铺', 'Filter shops') }}</p>
```

The existing category buttons and `openCategory(category.key)` behavior stay unchanged.

- [ ] **Step 4: Replace restaurant baseline list with shop app list**

Keep the surrounding baseline section and `data-testid="food-delivery-data-baseline"` for compatibility, but change its copy and render `shopAppEntries`:

```vue
<div class="mt-3 grid grid-cols-2 gap-3" data-testid="food-delivery-shop-app-list">
  <article
    v-for="restaurant in shopAppEntries"
    :key="restaurant.id"
    class="rounded-3xl border border-orange-100 bg-orange-50/70 p-3"
    :data-testid="`food-delivery-shop-app-${restaurant.id}`"
  >
    ...
  </article>
</div>
```

Each card must still include:

- `data-testid="food-delivery-restaurant-${restaurant.id}"` on an inner or same element for existing image tests.
- `data-testid="food-delivery-open-store-${restaurant.id}"` on the open button.
- Restaurant image or fallback icon.
- Restaurant name, category/cuisine, rating, ETA, distance, and delivery fee.

- [ ] **Step 5: Keep menu preview for compatibility**

Leave the existing compact `food-delivery-menu-panel` preview in platform mode for current custom-image tests. It can be visually smaller and should not be the first thing users see.

- [ ] **Step 6: Run focused test**

Run:

```bash
npm.cmd run test -- tests/food-delivery-view.test.js
```

Expected: pass.

- [ ] **Step 7: Commit implementation**

Run:

```bash
git add src/views/FoodDeliveryView.vue tests/food-delivery-view.test.js
git commit -m "feat: make food delivery home shop first"
```

---

### Task 4: Verify And Document

**Files:**
- Modify: `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

- [ ] **Step 1: Update commerce handoff**

Add to landed status:

```md
Food Delivery platform mode now opens as a pseudo-folder style surface: a fixed Food platform entry plus shop-app restaurant entries. Category keys continue to filter shops and do not own order/cart behavior.
```

- [ ] **Step 2: Update visual handoff**

Add to landed status:

```md
Food Delivery now reflects the App Store shop-entry taxonomy in-app: the default Food surface is entry-first, with categories demoted to filters and restaurants presented as shop mini-app launch cards.
```

- [ ] **Step 3: Run focused validation**

Run:

```bash
npm.cmd run test -- tests/food-delivery-view.test.js tests/food-delivery-store.test.js tests/food-delivery-event-adapter.test.js
```

Expected: pass.

- [ ] **Step 4: Run full validation**

Run:

```bash
npm.cmd run lint
npm.cmd run build
npm.cmd run test
```

Expected: pass. The existing Vite `push.js` dynamic/static import warning may still appear during build.

- [ ] **Step 5: Commit docs**

Run:

```bash
git add docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md
git commit -m "docs: record food delivery pseudo folder home"
```

---

## Acceptance Criteria

- Opening `/food-delivery` with no `restaurantId` reads as a pseudo-folder home.
- Users see a fixed Food platform entry and restaurant shop app entries before deeper category/admin content.
- Category keys still work as filters and preserve world-pack route context.
- Restaurant shop app entries still open store mini-app mode.
- Existing custom restaurant/menu image flow still renders in platform mode.
- Cart, checkout, orders, Map, Wallet, Chat source banner, and event behavior remain unchanged.
