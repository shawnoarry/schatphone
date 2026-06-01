# Food Delivery Dark Tray Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Moon Bistro the first distinctive Food Delivery shop mini-app treatment using a dark tray menu inspired by POS food cards.

**Architecture:** Keep Food Delivery store/order ownership unchanged. Add view-level template selection for Moon Bistro and render its store mode with a dark surface, embedded circular dish imagery, compact menu cards, and stable template test ids. Other restaurants continue to use the existing generic store presentation.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils, JavaScript ES modules, Tailwind utility classes.

---

## Scope Check

In scope:

- Moon Bistro should render as `dark_tray_menu`.
- The store shell should expose a stable template id for tests and future CSS/template work.
- Menu cards should use a dark tray card shape with a raised circular dish/image area.
- Add-to-cart, cart, checkout, Map, Wallet, Chat, and event behavior must remain unchanged.

Out of scope:

- Persisted shop-template settings.
- App Store shop-template editing.
- Real generated food photos.
- Full cart/checkout visual redesign.
- Applying the dark template to all restaurants.

## File Structure

- Modify `tests/food-delivery-view.test.js`
  - Add assertions that Moon Bistro opens with `data-store-template="dark_tray_menu"` and dark tray menu cards.
- Modify `src/views/FoodDeliveryView.vue`
  - Add view-level template helpers.
  - Render the Moon Bistro menu panel using dark tray layout.
  - Preserve all existing test ids for menu items and add buttons.
- Modify `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
  - Record that the first visually distinct shop mini-app is present.
- Modify `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
  - Record the dark tray menu visual direction.

---

### Task 1: Add Dark Tray Menu Tests

**Files:**
- Modify: `tests/food-delivery-view.test.js`

- [ ] **Step 1: Extend store opening test**

In `opens a restaurant as an individual store surface from the platform`, after the store shell assertion, add:

```js
    expect(wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template')).toBe(
      'dark_tray_menu',
    )
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').classes()).toContain('food-delivery-store-dark-tray')
    expect(wrapper.get(`[data-testid="food-delivery-menu-tray-${menuItem.id}"]`).text()).toContain(menuItem.title)
    expect(wrapper.get(`[data-testid="food-delivery-menu-dish-${menuItem.id}"]`).exists()).toBe(true)
```

Define `menuItem` in that test:

```js
const menuItem = store.listMenuByRestaurant(restaurant.id)[0]
```

- [ ] **Step 2: Run failing focused test**

Run:

```bash
npm.cmd run test -- tests/food-delivery-view.test.js
```

Expected: fail because the store shell has no `data-store-template`, the store app has no `food-delivery-store-dark-tray` class, and dark tray menu card ids do not exist.

- [ ] **Step 3: Commit failing test**

Run:

```bash
git add tests/food-delivery-view.test.js
git commit -m "test: cover food delivery dark tray menu"
```

---

### Task 2: Add Template Helpers

**Files:**
- Modify: `src/views/FoodDeliveryView.vue`

- [ ] **Step 1: Add template resolver**

Near `activeStoreVisual`, add:

```js
const FOOD_STORE_TEMPLATE_BY_RESTAURANT_ID = {
  food_seed_moon_bistro: 'dark_tray_menu',
}

const activeStoreTemplate = computed(
  () => FOOD_STORE_TEMPLATE_BY_RESTAURANT_ID[activeRestaurant.value?.id] || 'standard',
)
const isDarkTrayStore = computed(() => activeStoreTemplate.value === 'dark_tray_menu')
```

- [ ] **Step 2: Expose template on store app and shell**

Update store mode root:

```vue
<section
  v-else
  class="space-y-4"
  :class="{ 'food-delivery-store-dark-tray': isDarkTrayStore }"
  data-testid="food-delivery-store-app"
>
```

Update store shell:

```vue
:data-store-template="activeStoreTemplate"
```

- [ ] **Step 3: Run focused test**

Run:

```bash
npm.cmd run test -- tests/food-delivery-view.test.js
```

Expected: still fail because menu tray ids do not exist yet.

---

### Task 3: Render Dark Tray Menu Cards

**Files:**
- Modify: `src/views/FoodDeliveryView.vue`

- [ ] **Step 1: Split menu panel style by template**

Change the store menu panel class to use dark styling when `isDarkTrayStore`:

```vue
<section
  v-if="activeRestaurant"
  class="rounded-3xl p-4"
  :class="isDarkTrayStore ? 'border border-slate-800 bg-[#151826] text-white' : 'border border-orange-100 bg-white'"
  data-testid="food-delivery-menu-panel"
>
```

- [ ] **Step 2: Render dark tray cards**

Inside the `v-for`, add stable ids and dynamic classes:

```vue
<article
  v-for="item in activeMenuItems"
  :key="item.id"
  class="relative overflow-hidden"
  :class="isDarkTrayStore ? 'rounded-[1.75rem] bg-[#202436] p-3 pt-10 text-center shadow-[0_18px_40px_rgba(0,0,0,0.22)]' : 'flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-2'"
  :data-testid="`food-delivery-menu-${item.id}`"
  :data-template="activeStoreTemplate"
>
```

For the dark branch, include:

```vue
<div
  v-if="isDarkTrayStore"
  class="absolute left-1/2 top-0 h-20 w-20 -translate-x-1/2 -translate-y-1/3 overflow-hidden rounded-full border-4 border-[#2b3045] bg-[#111421] shadow-[0_14px_30px_rgba(0,0,0,0.35)]"
  :data-testid="`food-delivery-menu-dish-${item.id}`"
>
  <img v-if="foodImageUrl(item)" ... />
  <div v-else class="flex h-full w-full items-center justify-center text-xl text-orange-300">
    <i class="fas fa-bowl-food"></i>
  </div>
</div>
<div v-if="isDarkTrayStore" class="pt-8" :data-testid="`food-delivery-menu-tray-${item.id}`">
  <p class="line-clamp-2 text-xs font-bold text-white">{{ item.title }}</p>
  <p class="mt-2 text-[11px] font-semibold text-orange-200">{{ item.price }} {{ item.currency }}</p>
  <p class="mt-1 text-[10px] text-slate-400">{{ foodImageSourceLabel(item) }}</p>
  <button ...>Add</button>
</div>
```

Keep the existing light branch for standard stores and preserve `food-delivery-add-${item.id}`.

- [ ] **Step 3: Run focused test**

Run:

```bash
npm.cmd run test -- tests/food-delivery-view.test.js
```

Expected: pass.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add src/views/FoodDeliveryView.vue tests/food-delivery-view.test.js
git commit -m "feat: add dark tray menu shop style"
```

---

### Task 4: Verify And Document

**Files:**
- Modify: `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

- [ ] **Step 1: Update handoff docs**

Commerce note:

```md
Moon Bistro now has the first Food Delivery shop template treatment, `dark_tray_menu`, while checkout and order ownership remain in Food Delivery.
```

Visual note:

```md
Moon Bistro now proves the Food Delivery shop mini-app direction with a dark tray menu: raised circular dish areas embedded in dark menu cards.
```

- [ ] **Step 2: Run focused validation**

Run:

```bash
npm.cmd run test -- tests/food-delivery-view.test.js tests/food-delivery-store.test.js tests/food-delivery-event-adapter.test.js
```

Expected: pass.

- [ ] **Step 3: Run full validation**

Run:

```bash
npm.cmd run lint
npm.cmd run build
npm.cmd run test
```

Expected: pass. Existing Vite `push.js` warning may appear during build.

- [ ] **Step 4: Commit docs**

Run:

```bash
git add docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md
git commit -m "docs: record food delivery dark tray menu"
```

---

## Acceptance Criteria

- Moon Bistro opens with `data-store-template="dark_tray_menu"`.
- Moon Bistro store app root has `food-delivery-store-dark-tray`.
- Menu items render as dark tray cards with raised circular dish/image containers.
- Menu item and add-to-cart test ids remain intact.
- Other restaurants still render the standard store menu.
- Cart/order/Map/Wallet/Chat behavior remains unchanged.
