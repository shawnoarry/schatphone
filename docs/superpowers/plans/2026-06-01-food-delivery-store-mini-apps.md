# Food Delivery Store Mini Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Food Delivery from one long administrative page into a platform surface that opens individual restaurant store surfaces while preserving one shared cart, order, Wallet, Map, Chat, and event system.

**Architecture:** Keep the existing `FoodDeliveryView.vue` route and store so order ownership does not move. Use `restaurantId` route query as the immersive store mode: no `restaurantId` means platform browsing, and a valid `restaurantId` opens that restaurant's mini-app surface. Store presentation is view-level only; checkout, cart clearing between restaurants, order events, service-account pushes, Wallet suggestions, Map handoffs, and relationship facts continue to use `useFoodDeliveryStore`.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils, JavaScript ES modules.

---

## Scope Check

This plan implements Package 5 from `docs/superpowers/specs/2026-06-01-appearance-app-store-food-design.md`.

In scope:

- Keep Food Home pseudo-folder and category shortcuts.
- Add a platform browsing surface with category chips, restaurant cards, and recent order/cart summary.
- Add a store mini-app surface for each restaurant via `?restaurantId=<id>`.
- Preserve world-pack route context when entering/leaving a store.
- Let store types have different visual treatment without changing business rules.
- Keep cart/order behavior centralized in `useFoodDeliveryStore`.

Out of scope:

- Full Food Delivery visual redesign and sticky-cart polish. That is Package 6.
- New restaurant data model fields unless required for route-safe presentation.
- Separate carts per restaurant. Current single-cart behavior stays: adding from another restaurant clears the old restaurant's cart.
- New payment, Wallet, Chat, Map, or event ownership.

## File Structure

- Modify `tests/food-delivery-view.test.js`
  - Add tests for platform-to-store navigation, store-specific presentation, shared cart/checkout, category context, and Chat/order deep-link behavior.
- Modify `src/views/FoodDeliveryView.vue`
  - Add route-query state for platform vs store mode.
  - Add store-card navigation and back-to-platform behavior.
  - Split the template into platform and store main surfaces while reusing the existing cart/order/Wallet/Map/admin panels.
  - Add category-based store visual treatment classes and stable test ids.
- Modify `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
  - Record Food Delivery store mini-app ownership and remaining polish.
- Modify `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
  - Record that Food Delivery has the first platform/store IA split.

---

### Task 1: Add Failing Store Mini-App Tests

**Files:**
- Modify: `tests/food-delivery-view.test.js`

- [ ] **Step 1: Add a platform-to-store navigation test**

Add:

```js
  test('opens a restaurant as an individual store surface from the platform', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const restaurant = store.listRestaurantsByCategory('restaurants')[0]

    expect(wrapper.get('[data-testid="food-delivery-platform"]').text()).toContain('Restaurants')
    await wrapper.get(`[data-testid="food-delivery-open-store-${restaurant.id}"]`).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({
      category: 'restaurants',
      restaurantId: restaurant.id,
    })
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain(restaurant.name)
    expect(wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-id')).toBe(restaurant.id)

    await wrapper.get('[data-testid="food-delivery-store-back"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.restaurantId).toBeUndefined()
    expect(wrapper.get('[data-testid="food-delivery-platform"]').exists()).toBe(true)
    wrapper.unmount()
  })
```

- [ ] **Step 2: Add a shared cart test through store mode**

Update `creates a local food delivery order from menu actions` so it opens the active restaurant before adding menu items:

```js
    await wrapper.get(`[data-testid="food-delivery-open-store-${activeRestaurant.id}"]`).trigger('click')
    await flushPromises()
```

Keep the existing add-to-cart, checkout, and order assertions. This proves the mini-app view still uses the same cart/order backend.

- [ ] **Step 3: Add Chat deep-link store focus expectation**

In `shows Chat service source banner and highlights linked food order`, after mounting, assert:

```js
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain(activeRestaurant.name)
```

This ensures an order deep link can open the relevant store context instead of landing only on the platform list.

- [ ] **Step 4: Run the failing tests**

Run:

```bash
npm.cmd run test -- tests/food-delivery-view.test.js
```

Expected: fail because `food-delivery-platform`, `food-delivery-open-store-*`, `food-delivery-store-app`, and store navigation do not exist yet.

- [ ] **Step 5: Commit failing tests**

```bash
git add tests/food-delivery-view.test.js
git commit -m "test: cover food delivery store mini apps"
```

---

### Task 2: Add Store Mode State And Navigation

**Files:**
- Modify: `src/views/FoodDeliveryView.vue`

- [ ] **Step 1: Add route-query store selection state**

Add computed state near `activeRestaurant`:

```js
const selectedRestaurantId = computed(() =>
  typeof route.query.restaurantId === 'string' ? route.query.restaurantId.trim() : '',
)
const selectedRestaurant = computed(() =>
  selectedRestaurantId.value ? foodDeliveryStore.findRestaurantById(selectedRestaurantId.value) : null,
)
const isStoreMode = computed(() => Boolean(selectedRestaurant.value))
const activeRestaurant = computed(() =>
  selectedRestaurant.value || activeRestaurants.value[0] || foodDeliveryStore.restaurants[0] || null,
)
```

Keep `activeMenuItems` using `activeRestaurant`.

- [ ] **Step 2: Add store visual treatment helpers**

Add:

```js
const FOOD_STORE_VISUALS = {
  restaurants: { tone: 'bistro', hero: 'from-rose-500 via-orange-400 to-amber-200', chip: 'bg-rose-50 text-rose-700' },
  fast_food: { tone: 'fast', hero: 'from-red-500 via-orange-400 to-yellow-300', chip: 'bg-red-50 text-red-700' },
  cafe: { tone: 'cafe', hero: 'from-stone-700 via-amber-600 to-lime-200', chip: 'bg-stone-100 text-stone-700' },
  dessert: { tone: 'dessert', hero: 'from-pink-500 via-fuchsia-400 to-rose-100', chip: 'bg-pink-50 text-pink-700' },
  grocery_delivery: { tone: 'grocery', hero: 'from-emerald-600 via-lime-400 to-teal-100', chip: 'bg-emerald-50 text-emerald-700' },
  nearby: { tone: 'nearby', hero: 'from-sky-600 via-cyan-400 to-lime-100', chip: 'bg-sky-50 text-sky-700' },
}
const activeStoreVisual = computed(() =>
  FOOD_STORE_VISUALS[activeRestaurant.value?.category || activeCategory.value?.key] || FOOD_STORE_VISUALS.restaurants,
)
```

- [ ] **Step 3: Add navigation actions**

Add:

```js
const openRestaurantStore = (restaurant) => {
  if (!restaurant?.id) return
  router.push({
    path: '/food-delivery',
    query: {
      ...worldAppRouteQuery.value,
      category: restaurant.category || activeCategory.value?.key || 'restaurants',
      restaurantId: restaurant.id,
    },
  })
}

const closeRestaurantStore = () => {
  router.push({
    path: '/food-delivery',
    query: {
      ...worldAppRouteQuery.value,
      category: activeCategory.value?.key || activeRestaurant.value?.category || 'restaurants',
    },
  })
}
```

- [ ] **Step 4: Auto-focus store for Chat order links**

Add a watcher:

```js
watch(
  chatSourceOrder,
  (order) => {
    if (!order?.restaurantId) return
    if (selectedRestaurantId.value) return
    router.replace({
      path: '/food-delivery',
      query: {
        ...route.query,
        category: order.items?.[0]?.category || activeCategory.value?.key || 'restaurants',
        restaurantId: order.restaurantId,
      },
    })
  },
  { immediate: true },
)
```

- [ ] **Step 5: Run tests to see template failures remain**

Run:

```bash
npm.cmd run test -- tests/food-delivery-view.test.js
```

Expected: still fail because the template is not split yet.

---

### Task 3: Split Platform And Store Surfaces

**Files:**
- Modify: `src/views/FoodDeliveryView.vue`

- [ ] **Step 1: Wrap the category/restaurant browsing area as platform**

Replace the current category + restaurant/menu baseline flow with:

- Platform section `data-testid="food-delivery-platform"` when `!isStoreMode`.
- Existing category panel remains visible.
- Restaurant cards get open buttons with `data-testid="food-delivery-open-store-${restaurant.id}"`.
- Platform can show a small cart/order status strip, but menu add actions should be primary in store mode.

- [ ] **Step 2: Add store mini-app surface**

Add store section `data-testid="food-delivery-store-app"` when `isStoreMode`:

- Hero with `data-testid="food-delivery-store-shell"`, `data-store-id`, and `data-store-tone`.
- Back button `data-testid="food-delivery-store-back"`.
- Store metadata: rating, ETA, distance, delivery fee.
- Menu panel keeps `data-testid="food-delivery-menu-panel"`.
- Menu item add buttons keep `food-delivery-add-${item.id}`.

- [ ] **Step 3: Keep supporting panels shared below**

Keep these existing panels under the main platform/store section:

- custom form
- cart panel
- Map handoff
- recent orders
- Wallet suggestions
- Map boundary/source plan

This keeps behavior stable while changing the top-level user path.

- [ ] **Step 4: Run Food Delivery tests**

Run:

```bash
npm.cmd run test -- tests/food-delivery-view.test.js
```

Expected: pass.

- [ ] **Step 5: Commit implementation**

```bash
git add src/views/FoodDeliveryView.vue tests/food-delivery-view.test.js
git commit -m "feat: open food delivery stores as mini apps"
```

---

### Task 4: Verify And Document

**Files:**
- Modify: `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

- [ ] **Step 1: Update handoff docs**

Commerce handoff note:

```md
- 2026-06-01: Food Delivery now has a platform/store split. The Food entry opens a platform browser, restaurant cards open route-query store mini-app surfaces, and cart/order/event/Wallet/Map/Chat ownership remains centralized in Food Delivery and related source modules.
```

Visual handoff note:

```md
- 2026-06-01: Food Delivery has its first platform-to-store IA baseline. Store surfaces can vary visually by restaurant category while shared business logic stays untouched.
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

Expected: pass. Existing Vite `push.js` dynamic/static warning may still appear.

- [ ] **Step 4: Commit docs**

```bash
git add docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md
git commit -m "docs: record food delivery store mini apps"
```

---

## Acceptance Criteria

- Users can browse Food Delivery as a platform.
- Users can open each restaurant into an individual store mini-app surface.
- Store mode keeps category/world-pack route context.
- Chat order deep links focus the relevant restaurant store when possible.
- Adding items and checkout still use the shared Food Delivery cart/order backend.
- Existing Map, Wallet, Chat service-account, event, and relationship handoff tests keep passing.
- Advanced custom restaurant/menu authoring remains available but no longer defines the primary first-screen flow.
