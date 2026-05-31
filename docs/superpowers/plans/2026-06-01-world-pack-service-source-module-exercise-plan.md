# World Pack Service Source Module Exercise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect concrete Shopping, logistics, and Food Delivery source-module pushes to already-joined World Pack service/official accounts without touching AI role conversation behavior.

**Architecture:** Chat remains the service-account receiver and linkage-contract owner; it does not own source records or create subscriptions from source modules. A small source-route resolver reads `sourceNotificationPlan` rows and origin metadata, while Shopping and Food Delivery preserve world-app context on their own orders and ask Chat for a ready target before appending `service_notification` messages. AI role conversation, Chat social state, Contacts relationship truth, World Hub review, and Cheats overrides stay out of this lane.

**Tech Stack:** Vue 3, Pinia, Vitest, existing SchatPhone stores, `src/lib/service-account-source-plan.js`, and Chat service-account link contracts.

---

## Parallel Chat Boundary

The parallel Chat work owns AI role conversations and direct role messaging. This plan may touch `src/stores/chat.js` only to expose a narrow service-account source-plan lookup beside `getServiceAccountLinkContract(contactId)`.

Do not edit these areas for this slice:

- `src/views/ChatView.vue` role conversation UX, AI reply flow, composer behavior, or friend/block social-event UI;
- AI role prompt construction except for existing service-account notification context tests;
- Contacts relationship truth or relationship runtime ownership;
- WorldBook service-account template generation or Chat Services subscribe/edit UI;
- any source-module business records from Chat.

Likely conflict surface with the other Chat branch:

- `src/stores/chat.js` imports and returned actions. Keep changes tiny and easy to rebase.

## File Structure

- Create: `src/lib/service-account-source-routing.js`
  - Pure resolver that matches ready `sourceNotificationPlan` rows to existing service/official contacts.
- Create: `tests/service-account-source-routing.test.js`
  - Pure resolver unit tests with no Pinia dependency.
- Modify: `src/stores/chat.js`
  - Import the resolver and expose `resolveServiceAccountSourcePlanRoute(options)` plus `findServiceAccountBySourcePlan(options)`.
- Modify: `tests/chat-store-model.test.js`
  - Store-level contract tests for source-plan route resolution.
- Modify: `src/stores/shopping.js`
  - Persist optional `worldPackId` and `worldAppBindingId` on Shopping orders; route order/logistics notifications through the source-plan helper before legacy key lookup.
- Modify: `src/views/ShoppingView.vue`
  - Pass current `worldAppContext` into checkout payload.
- Modify: `tests/shopping-store.test.js`
  - Shopping order/logistics route tests and no-auto-subscribe assertions.
- Modify: `src/stores/foodDelivery.js`
  - Persist optional `worldPackId` and `worldAppBindingId` on Food Delivery orders; route notifications through the source-plan helper before legacy key lookup.
- Modify: `src/views/FoodDeliveryView.vue`
  - Pass current `worldAppUxContext` into checkout payload.
- Modify: `tests/food-delivery-store.test.js`
  - Food Delivery route tests and no-auto-subscribe assertions.
- Modify: `tests/service-account-source-plan.test.js`
  - Alignment assertions for source module keys.
- Docs:
  - `docs/pm/chat-and-chat-directory/SERVICE_ACCOUNT_LINK_CONTRACT.md`
  - `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
  - `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
  - `docs/overview/PROJECT_MASTER_GUIDE.md`
  - `docs/roadmap/TODO_ROADMAP.md`
  - `docs/pm/TODO_PM_STATUS_REPORT.md`

---

### Task 1: Pure Service-Account Source Route Resolver

**Files:**
- Create: `src/lib/service-account-source-routing.js`
- Create: `tests/service-account-source-routing.test.js`

- [ ] **Step 1: Write failing resolver tests**

Create `tests/service-account-source-routing.test.js`:

```js
import { describe, expect, test } from 'vitest'
import {
  SERVICE_ACCOUNT_SOURCE_ROUTE_STATUS,
  resolveServiceAccountSourceRoute,
} from '../src/lib/service-account-source-routing'

const readyContract = ({
  contactId,
  worldPackId = '',
  worldAppBindingId = '',
  sourceModule = 'shopping_order_update',
  serviceBindingKey = 'shoppingServiceKey',
  serviceKey = 'daily_fresh',
  rowStatus = 'ready',
  planStatus = 'ready',
} = {}) => ({
  contactId,
  origin: {
    worldPackId,
    worldServiceTemplateId: contactId ? `${contactId}_template` : '',
    worldAppBindingId,
  },
  sourceNotificationPlan: {
    status: planStatus,
    rows: [
      {
        sourceModule,
        serviceBindingKey,
        serviceKey,
        status: rowStatus,
      },
    ],
  },
})

describe('service account source routing', () => {
  test('prefers a ready World Pack service account when origin context matches', () => {
    const contacts = [
      { id: 1, name: 'Generic Daily Fresh', kind: 'service' },
      {
        id: 2,
        name: 'Supply Dispatch',
        kind: 'official',
        worldPackId: 'survival_city',
        worldAppBindingId: 'survival_supply_board',
      },
    ]
    const contracts = new Map([
      [1, readyContract({ contactId: 1 })],
      [
        2,
        readyContract({
          contactId: 2,
          worldPackId: 'survival_city',
          worldAppBindingId: 'survival_supply_board',
        }),
      ],
    ])

    const result = resolveServiceAccountSourceRoute({
      contacts,
      getContract: (contact) => contracts.get(contact.id),
      sourceModule: 'shopping_order_update',
      serviceBindingKey: 'shoppingServiceKey',
      serviceKey: 'daily_fresh',
      worldPackId: 'survival_city',
      worldAppBindingId: 'survival_supply_board',
    })

    expect(result).toMatchObject({
      ok: true,
      status: SERVICE_ACCOUNT_SOURCE_ROUTE_STATUS.READY,
      contactId: 2,
      contact: { name: 'Supply Dispatch' },
      row: {
        sourceModule: 'shopping_order_update',
        serviceBindingKey: 'shoppingServiceKey',
        serviceKey: 'daily_fresh',
      },
    })
  })

  test('does not route available-after-join plans', () => {
    const contacts = [{ id: 7, name: 'Candidate Only', kind: 'service' }]
    const result = resolveServiceAccountSourceRoute({
      contacts,
      getContract: (contact) =>
        readyContract({
          contactId: contact.id,
          rowStatus: 'available_after_join',
          planStatus: 'available_after_join',
        }),
      sourceModule: 'shopping_order_update',
      serviceBindingKey: 'shoppingServiceKey',
      serviceKey: 'daily_fresh',
    })

    expect(result).toMatchObject({
      ok: false,
      status: SERVICE_ACCOUNT_SOURCE_ROUTE_STATUS.NOT_READY,
      contactId: '',
    })
  })

  test('returns no match instead of creating or guessing a service account', () => {
    const result = resolveServiceAccountSourceRoute({
      contacts: [{ id: 9, name: 'Role Contact', kind: 'role' }],
      getContract: () => null,
      sourceModule: 'food_delivery_chat_push',
      serviceBindingKey: 'foodDeliveryServiceKey',
      serviceKey: 'food_delivery_dispatch',
    })

    expect(result).toEqual({
      ok: false,
      status: SERVICE_ACCOUNT_SOURCE_ROUTE_STATUS.NO_MATCHING_ACCOUNT,
      contactId: '',
      contact: null,
      contract: null,
      row: null,
    })
  })
})
```

Run:

```powershell
npm.cmd test -- tests/service-account-source-routing.test.js
```

Expected: FAIL because `src/lib/service-account-source-routing.js` does not exist.

- [ ] **Step 2: Implement the resolver**

Create `src/lib/service-account-source-routing.js`:

```js
export const SERVICE_ACCOUNT_SOURCE_ROUTE_STATUS = Object.freeze({
  READY: 'ready',
  NOT_READY: 'not_ready',
  NO_MATCHING_ACCOUNT: 'no_matching_account',
})

const READY_STATUS = 'ready'

const normalizeText = (value, fallback = '', maxLength = 160) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return fallback
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

const isServiceAccountContact = (contact = {}) =>
  contact?.kind === 'service' || contact?.kind === 'official'

const normalizeRequest = (options = {}) => ({
  sourceModule: normalizeText(options.sourceModule, '', 80),
  serviceBindingKey: normalizeText(options.serviceBindingKey, '', 80),
  serviceKey: normalizeText(options.serviceKey, '', 80),
  worldPackId: normalizeText(options.worldPackId, '', 120),
  worldAppBindingId: normalizeText(options.worldAppBindingId, '', 120),
})

const resolveOrigin = (contact = {}, contract = {}) => {
  const origin = contract?.origin && typeof contract.origin === 'object' ? contract.origin : {}
  return {
    worldPackId: normalizeText(origin.worldPackId || contact.worldPackId, '', 120),
    worldAppBindingId: normalizeText(origin.worldAppBindingId || contact.worldAppBindingId, '', 120),
  }
}

const rowMatchesRequest = (row = {}, request = {}) => {
  if (request.sourceModule && row.sourceModule !== request.sourceModule) return false
  if (request.serviceBindingKey && row.serviceBindingKey !== request.serviceBindingKey) return false
  if (request.serviceKey && row.serviceKey !== request.serviceKey) return false
  return true
}

const scoreCandidate = (candidate = {}, request = {}) => {
  let score = 0
  if (request.worldPackId && candidate.origin.worldPackId === request.worldPackId) score += 100
  if (request.worldAppBindingId && candidate.origin.worldAppBindingId === request.worldAppBindingId) score += 50
  if (request.serviceKey && candidate.row.serviceKey === request.serviceKey) score += 10
  return score
}

const emptyResult = (status) => ({
  ok: false,
  status,
  contactId: '',
  contact: null,
  contract: null,
  row: null,
})

export const resolveServiceAccountSourceRoute = ({
  contacts = [],
  getContract = () => null,
  ...options
} = {}) => {
  const request = normalizeRequest(options)
  const candidates = []
  let matchedUnready = false

  contacts.forEach((contact) => {
    if (!isServiceAccountContact(contact)) return
    const contract = getContract(contact) || getContract(contact.id)
    const plan = contract?.sourceNotificationPlan
    const rows = Array.isArray(plan?.rows) ? plan.rows : []

    rows.forEach((row) => {
      if (!rowMatchesRequest(row, request)) return
      if (plan.status !== READY_STATUS || row.status !== READY_STATUS) {
        matchedUnready = true
        return
      }
      candidates.push({
        contact,
        contract,
        row,
        origin: resolveOrigin(contact, contract),
      })
    })
  })

  if (candidates.length === 0) {
    return emptyResult(
      matchedUnready
        ? SERVICE_ACCOUNT_SOURCE_ROUTE_STATUS.NOT_READY
        : SERVICE_ACCOUNT_SOURCE_ROUTE_STATUS.NO_MATCHING_ACCOUNT,
    )
  }

  candidates.sort((left, right) => {
    const scoreDelta = scoreCandidate(right, request) - scoreCandidate(left, request)
    if (scoreDelta !== 0) return scoreDelta
    return String(left.contact.id).localeCompare(String(right.contact.id))
  })

  const selected = candidates[0]
  return {
    ok: true,
    status: SERVICE_ACCOUNT_SOURCE_ROUTE_STATUS.READY,
    contactId: selected.contact.id,
    contact: selected.contact,
    contract: selected.contract,
    row: selected.row,
  }
}
```

Run:

```powershell
npm.cmd test -- tests/service-account-source-routing.test.js
```

Expected: PASS.

---

### Task 2: Chat Store Source-Plan Lookup Contract

**Files:**
- Modify: `src/stores/chat.js`
- Modify: `tests/chat-store-model.test.js`

- [ ] **Step 1: Add a failing Chat store lookup test**

Append this test near the existing service-account contract tests in `tests/chat-store-model.test.js`:

```js
  test('resolves service-account source-plan routes without touching role conversations', () => {
    const store = useChatStore()
    const generic = store.addContact({
      name: 'Generic Daily Fresh',
      kind: 'service',
      role: 'Service account',
      shoppingServiceKey: 'daily_fresh',
    })
    const world = store.createWorldServiceTemplateContact({
      name: 'Supply Dispatch',
      kind: 'service',
      role: 'Service account',
      serviceTemplate: 'Supply Dispatch',
      shoppingServiceKey: 'daily_fresh',
      worldPackId: 'survival_city',
      worldServiceTemplateId: 'survival_supply_dispatch',
      worldAppBindingId: 'survival_supply_board',
    })

    const route = store.resolveServiceAccountSourcePlanRoute({
      sourceModule: 'shopping_order_update',
      serviceBindingKey: 'shoppingServiceKey',
      serviceKey: 'daily_fresh',
      worldPackId: 'survival_city',
      worldAppBindingId: 'survival_supply_board',
    })

    expect(route).toMatchObject({
      ok: true,
      contactId: world.id,
      row: {
        sourceModule: 'shopping_order_update',
        serviceBindingKey: 'shoppingServiceKey',
        serviceKey: 'daily_fresh',
      },
    })
    expect(store.findServiceAccountBySourcePlan({
      sourceModule: 'shopping_order_update',
      serviceBindingKey: 'shoppingServiceKey',
      serviceKey: 'daily_fresh',
      worldPackId: 'survival_city',
      worldAppBindingId: 'survival_supply_board',
    })?.id).toBe(world.id)
    expect(store.getMessagesByContactId(generic.id)).toEqual([])
    expect(store.getMessagesByContactId(world.id)).toEqual([])
  })
```

Run:

```powershell
npm.cmd test -- tests/chat-store-model.test.js -t "resolves service-account source-plan routes"
```

Expected: FAIL because the two store methods do not exist yet.

- [ ] **Step 2: Add the narrow Chat store methods**

In `src/stores/chat.js`, add this import after `buildServiceAccountSourceNotificationPlan`:

```js
import { resolveServiceAccountSourceRoute } from '../lib/service-account-source-routing'
```

Add these methods near `getServiceAccountLinkContract`:

```js
  const resolveServiceAccountSourcePlanRoute = (options = {}) =>
    resolveServiceAccountSourceRoute({
      ...options,
      contacts,
      getContract: (contact) => getServiceAccountLinkContract(contact),
    })

  const findServiceAccountBySourcePlan = (options = {}) => {
    const route = resolveServiceAccountSourcePlanRoute(options)
    if (!route.ok || !route.contactId) return null
    return getRawContactById(route.contactId)
  }
```

Expose both methods in the store return object beside `getServiceAccountLinkContract`:

```js
      getServiceAccountLinkContract,
      resolveServiceAccountSourcePlanRoute,
      findServiceAccountBySourcePlan,
```

Run:

```powershell
npm.cmd test -- tests/service-account-source-routing.test.js tests/chat-store-model.test.js -t "source-plan"
```

Expected: PASS for the new resolver and Chat store source-plan tests. If the `-t` filter misses existing test names, run `npm.cmd test -- tests/service-account-source-routing.test.js tests/chat-store-model.test.js`.

---

### Task 3: Preserve World App Context On Source-Module Orders

**Files:**
- Modify: `src/stores/shopping.js`
- Modify: `src/views/ShoppingView.vue`
- Modify: `tests/shopping-store.test.js`
- Modify: `src/stores/foodDelivery.js`
- Modify: `src/views/FoodDeliveryView.vue`
- Modify: `tests/food-delivery-store.test.js`

- [ ] **Step 1: Add failing Shopping order context test**

Add this test to `tests/shopping-store.test.js`:

```js
  test('preserves World Pack checkout context on Shopping orders', () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({
      id: 'product_world_supply',
      title: 'World Supply Crate',
      category: 'grocery',
      serviceKey: 'daily_fresh',
      price: '22.50',
    })

    store.addToCart(product.id)
    const order = store.checkoutCart({
      worldContext: {
        packId: 'survival_city',
        bindingId: 'survival_supply_board',
      },
    })

    expect(order).toMatchObject({
      worldPackId: 'survival_city',
      worldAppBindingId: 'survival_supply_board',
    })
  })
```

Run:

```powershell
npm.cmd test -- tests/shopping-store.test.js -t "preserves World Pack checkout context"
```

Expected: FAIL because Shopping orders do not persist world context yet.

- [ ] **Step 2: Implement Shopping order context persistence**

In `src/stores/shopping.js`, add this helper near the other normalizers:

```js
const normalizeWorldCheckoutContext = (source = {}) => {
  const context = source && typeof source === 'object' ? source : {}
  return {
    worldPackId: normalizeText(context.worldPackId || context.packId, '', 120),
    worldAppBindingId: normalizeText(context.worldAppBindingId || context.bindingId, '', 120),
  }
}
```

Add the fields to `normalizeShoppingOrder(rawOrder, index)`:

```js
    worldPackId: normalizeText(rawOrder.worldPackId, '', 120),
    worldAppBindingId: normalizeText(rawOrder.worldAppBindingId, '', 120),
```

Add `worldContext = null` to the `checkoutCart` parameter destructuring:

```js
    worldContext = null,
```

Before `const order = normalizeShoppingOrder({`, add:

```js
    const normalizedWorldContext = normalizeWorldCheckoutContext(worldContext)
```

Pass the context into the order raw object:

```js
      worldPackId: normalizedWorldContext.worldPackId,
      worldAppBindingId: normalizedWorldContext.worldAppBindingId,
```

In `src/views/ShoppingView.vue`, pass the current context:

```js
  shoppingStore.checkoutCart({
    ...buildGiftCheckoutPayload(),
    note: t('Local shopping baseline order', 'Local shopping baseline order'),
    worldContext: worldAppContext.value,
  })
```

Run:

```powershell
npm.cmd test -- tests/shopping-store.test.js -t "preserves World Pack checkout context"
```

Expected: PASS.

- [ ] **Step 3: Add failing Food Delivery order context test**

Add this test to `tests/food-delivery-store.test.js`:

```js
  test('preserves World Pack checkout context on Food Delivery orders', () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()
    const restaurant = store.upsertRestaurant({
      id: 'food_world_dispatch',
      name: 'Dispatch Kitchen',
      category: 'nearby',
      deliveryFee: '3.00',
    })
    const item = store.upsertMenuItem({
      id: 'food_world_dispatch_item',
      restaurantId: restaurant.id,
      title: 'Dispatch Meal',
      price: '18.00',
    })

    store.addToCart(item.id)
    const order = store.checkoutCart({
      worldContext: {
        packId: 'survival_city',
        bindingId: 'survival_dispatch',
      },
    })

    expect(order).toMatchObject({
      worldPackId: 'survival_city',
      worldAppBindingId: 'survival_dispatch',
    })
  })
```

Run:

```powershell
npm.cmd test -- tests/food-delivery-store.test.js -t "preserves World Pack checkout context"
```

Expected: FAIL because Food Delivery orders do not persist world context yet.

- [ ] **Step 4: Implement Food Delivery order context persistence**

In `src/stores/foodDelivery.js`, add this helper near the other normalizers:

```js
const normalizeWorldCheckoutContext = (source = {}) => {
  const context = source && typeof source === 'object' ? source : {}
  return {
    worldPackId: normalizeText(context.worldPackId || context.packId, '', 120),
    worldAppBindingId: normalizeText(context.worldAppBindingId || context.bindingId, '', 120),
  }
}
```

Add the fields to the food order normalizer return object:

```js
    worldPackId: normalizeText(rawOrder.worldPackId, '', 120),
    worldAppBindingId: normalizeText(rawOrder.worldAppBindingId, '', 120),
```

Add `worldContext = null` to the `checkoutCart` parameter destructuring:

```js
    worldContext = null,
```

Before `const order = normalizeFoodOrder({`, add:

```js
    const normalizedWorldContext = normalizeWorldCheckoutContext(worldContext)
```

Pass the context into the order raw object:

```js
      worldPackId: normalizedWorldContext.worldPackId,
      worldAppBindingId: normalizedWorldContext.worldAppBindingId,
```

In `src/views/FoodDeliveryView.vue`, pass the current context:

```js
    worldContext: worldAppUxContext.value,
```

Run:

```powershell
npm.cmd test -- tests/food-delivery-store.test.js -t "preserves World Pack checkout context"
```

Expected: PASS.

---

### Task 4: Shopping And Logistics Use Ready Source Plans Before Legacy Lookup

**Files:**
- Modify: `src/stores/shopping.js`
- Modify: `tests/shopping-store.test.js`

- [ ] **Step 1: Add failing Shopping route-preference test**

Add this test to `tests/shopping-store.test.js`:

```js
  test('routes World Pack Shopping notifications to the matching joined service account', () => {
    const store = useShoppingStore()
    const chatStore = useChatStore()
    store.resetForTesting()
    const generic = chatStore.addContact({
      name: 'Generic Daily Fresh',
      kind: 'service',
      role: 'Service account',
      shoppingServiceKey: 'daily_fresh',
    })
    const world = chatStore.createWorldServiceTemplateContact({
      name: 'Supply Dispatch',
      kind: 'official',
      role: 'Service account',
      serviceTemplate: 'Supply Dispatch',
      shoppingServiceKey: 'daily_fresh',
      worldPackId: 'survival_city',
      worldServiceTemplateId: 'survival_supply_dispatch',
      worldAppBindingId: 'survival_supply_board',
    })
    const contactCount = chatStore.contacts.length
    const product = store.upsertProduct({
      id: 'product_world_supply_notification',
      title: 'World Supply Crate',
      category: 'grocery',
      serviceKey: 'daily_fresh',
      price: '22.50',
    })

    store.addToCart(product.id)
    const order = store.checkoutCart({
      worldContext: {
        packId: 'survival_city',
        bindingId: 'survival_supply_board',
      },
    })

    expect(chatStore.findServiceNotificationBySource(
      world.id,
      SHOPPING_SOURCE_KEYS.ORDER_UPDATE,
      order.id,
    )?.blocks[0]).toMatchObject({
      type: 'service_notification',
      sourceModule: SHOPPING_SOURCE_KEYS.ORDER_UPDATE,
      serviceKey: 'daily_fresh',
    })
    expect(chatStore.getMessagesByContactId(generic.id)).toHaveLength(0)
    expect(chatStore.contacts).toHaveLength(contactCount)
  })
```

Run:

```powershell
npm.cmd test -- tests/shopping-store.test.js -t "routes World Pack Shopping notifications"
```

Expected: FAIL while Shopping only uses first legacy `shoppingServiceKey` match.

- [ ] **Step 2: Implement source-plan target helper in Shopping**

In `src/stores/shopping.js`, add this helper near the service push functions:

```js
  const findShoppingNotificationTarget = ({
    sourceModule,
    serviceBindingKey,
    serviceKey,
    order = {},
  } = {}) => {
    const chatStore = getChatStore()
    const worldRoute = chatStore.findServiceAccountBySourcePlan?.({
      sourceModule,
      serviceBindingKey,
      serviceKey,
      worldPackId: order.worldPackId || '',
      worldAppBindingId: order.worldAppBindingId || '',
    })
    if (worldRoute) return worldRoute
    if (serviceBindingKey === 'logisticsServiceKey') {
      return chatStore.findLogisticsServiceContact(serviceKey)
    }
    return chatStore.findShoppingServiceContact(serviceKey)
  }
```

In `pushShoppingOrderServiceMessage(order)`, replace:

```js
    const chatStore = getChatStore()
    const serviceContact = chatStore.findShoppingServiceContact(serviceKey)
```

with:

```js
    const chatStore = getChatStore()
    const serviceContact = findShoppingNotificationTarget({
      sourceModule: SHOPPING_SOURCE_KEYS.ORDER_UPDATE,
      serviceBindingKey: 'shoppingServiceKey',
      serviceKey,
      order,
    })
```

Keep the existing `chatStore.appendServiceNotification(...)` call unchanged.

Run:

```powershell
npm.cmd test -- tests/service-account-source-routing.test.js tests/chat-store-model.test.js tests/shopping-store.test.js -t "World Pack Shopping|source-plan|service-account source routing"
```

Expected: PASS for the new Shopping route-preference test and the source-plan contract tests.

- [ ] **Step 3: Add failing logistics route-preference test**

Add this test to `tests/shopping-store.test.js`:

```js
  test('routes World Pack logistics notifications to the matching joined service account', () => {
    const store = useShoppingStore()
    const chatStore = useChatStore()
    store.resetForTesting()
    const generic = chatStore.addContact({
      name: 'Generic Courier',
      kind: 'service',
      role: 'Service account',
      logisticsServiceKey: 'standard_courier',
    })
    const world = chatStore.createWorldServiceTemplateContact({
      name: 'Relief Courier',
      kind: 'official',
      role: 'Service account',
      serviceTemplate: 'Relief Courier',
      logisticsServiceKey: 'standard_courier',
      worldPackId: 'survival_city',
      worldServiceTemplateId: 'survival_courier',
      worldAppBindingId: 'survival_supply_board',
    })
    const product = store.upsertProduct({
      id: 'product_world_logistics_notification',
      title: 'World Logistics Crate',
      category: 'grocery',
      serviceKey: 'daily_fresh',
      price: '31.00',
    })

    store.addToCart(product.id)
    const order = store.checkoutCart({
      worldContext: {
        packId: 'survival_city',
        bindingId: 'survival_supply_board',
      },
    })
    const event = store.addOrderEvent(order.id, {
      type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED,
      summary: 'Relief Courier picked up this parcel.',
      carrierName: 'Relief Courier',
    })

    expect(chatStore.findServiceNotificationBySource(
      world.id,
      SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING,
      order.id,
      event.id,
    )?.blocks[0]).toMatchObject({
      type: 'service_notification',
      kind: 'logistics_update',
      sourceModule: SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING,
      serviceKey: 'standard_courier',
    })
    expect(chatStore.getMessagesByContactId(generic.id)).toHaveLength(0)
  })
```

Run:

```powershell
npm.cmd test -- tests/shopping-store.test.js -t "routes World Pack logistics notifications"
```

Expected: FAIL while logistics only uses first legacy `logisticsServiceKey` match.

- [ ] **Step 4: Route logistics through the same helper**

In `pushShoppingLogisticsServiceMessage(order, event)`, replace:

```js
    const chatStore = getChatStore()
    const serviceContact = chatStore.findLogisticsServiceContact(serviceKey)
```

with:

```js
    const chatStore = getChatStore()
    const serviceContact = findShoppingNotificationTarget({
      sourceModule: SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING,
      serviceBindingKey: 'logisticsServiceKey',
      serviceKey,
      order,
    })
```

Run:

```powershell
npm.cmd test -- tests/shopping-store.test.js
```

Expected: PASS.

---

### Task 5: Food Delivery Uses Ready Source Plans Before Legacy Lookup

**Files:**
- Modify: `src/stores/foodDelivery.js`
- Modify: `tests/food-delivery-store.test.js`

- [ ] **Step 1: Add failing Food Delivery route-preference test**

Add this test to `tests/food-delivery-store.test.js`:

```js
  test('routes World Pack Food Delivery notifications to the matching joined dispatch account', () => {
    const store = useFoodDeliveryStore()
    const chatStore = useChatStore()
    store.resetForTesting()
    const generic = chatStore.addContact({
      name: 'Generic Dispatch',
      kind: 'service',
      role: 'Service account',
      foodDeliveryServiceKey: 'food_delivery_dispatch',
    })
    const world = chatStore.createWorldServiceTemplateContact({
      name: 'Relief Dispatch',
      kind: 'official',
      role: 'Service account',
      serviceTemplate: 'Relief Dispatch',
      foodDeliveryServiceKey: 'food_delivery_dispatch',
      worldPackId: 'survival_city',
      worldServiceTemplateId: 'survival_relief_dispatch',
      worldAppBindingId: 'survival_dispatch',
    })
    const contactCount = chatStore.contacts.length
    const restaurant = store.upsertRestaurant({
      id: 'food_world_notification_shop',
      name: 'Relief Kitchen',
      category: 'nearby',
      deliveryFee: '3.00',
    })
    const item = store.upsertMenuItem({
      id: 'food_world_notification_item',
      restaurantId: restaurant.id,
      title: 'Relief Meal',
      price: '18.00',
    })

    store.addToCart(item.id)
    const order = store.checkoutCart({
      worldContext: {
        packId: 'survival_city',
        bindingId: 'survival_dispatch',
      },
    })

    expect(chatStore.findServiceNotificationBySource(
      world.id,
      'food_delivery_chat_push',
      order.id,
    )?.blocks[0]).toMatchObject({
      type: 'service_notification',
      kind: 'food_delivery_order',
      sourceModule: 'food_delivery_chat_push',
      serviceKey: 'food_delivery_dispatch',
    })
    expect(chatStore.getMessagesByContactId(generic.id)).toHaveLength(0)
    expect(chatStore.contacts).toHaveLength(contactCount)

    const event = store.addOrderEvent(order.id, {
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      summary: 'Rider needs five more minutes.',
      etaMinutes: 35,
    })

    expect(chatStore.findServiceNotificationBySource(
      world.id,
      'food_delivery_chat_push',
      order.id,
      event.id,
    )?.blocks[0]).toMatchObject({
      type: 'service_notification',
      kind: 'food_delivery_update',
      sourceEventId: event.id,
      statusLabel: 'ETA updated',
    })
  })
```

Run:

```powershell
npm.cmd test -- tests/food-delivery-store.test.js -t "routes World Pack Food Delivery notifications"
```

Expected: FAIL while Food Delivery only uses first legacy `foodDeliveryServiceKey` match.

- [ ] **Step 2: Implement source-plan target helper in Food Delivery**

In `src/stores/foodDelivery.js`, add this helper near the service push functions:

```js
  const findFoodDeliveryNotificationTarget = (order = {}) => {
    const chatStore = getChatStore()
    return chatStore.findServiceAccountBySourcePlan?.({
      sourceModule: FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH,
      serviceBindingKey: 'foodDeliveryServiceKey',
      serviceKey: 'food_delivery_dispatch',
      worldPackId: order.worldPackId || '',
      worldAppBindingId: order.worldAppBindingId || '',
    }) || chatStore.findFoodDeliveryServiceContact('food_delivery_dispatch')
  }
```

In both `pushFoodDeliveryOrderServiceMessage(order)` and `pushFoodDeliveryEventServiceMessage(order, event)`, replace:

```js
    const chatStore = getChatStore()
    const serviceContact = chatStore.findFoodDeliveryServiceContact('food_delivery_dispatch')
```

with:

```js
    const chatStore = getChatStore()
    const serviceContact = findFoodDeliveryNotificationTarget(order)
```

Run:

```powershell
npm.cmd test -- tests/food-delivery-store.test.js
```

Expected: PASS.

---

### Task 6: Negative Contract And Source-Key Alignment

**Files:**
- Modify: `tests/shopping-store.test.js`
- Modify: `tests/food-delivery-store.test.js`
- Modify: `tests/service-account-source-plan.test.js`

- [ ] **Step 1: Add no-auto-subscribe Shopping assertion**

Add this test to `tests/shopping-store.test.js`:

```js
  test('does not auto-create Shopping service accounts when no joined target exists', () => {
    const store = useShoppingStore()
    const chatStore = useChatStore()
    store.resetForTesting()
    const contactCount = chatStore.contacts.length
    const product = store.upsertProduct({
      id: 'product_no_service_account',
      title: 'No Service Account Item',
      category: 'grocery',
      serviceKey: 'daily_fresh',
      price: '9.00',
    })

    store.addToCart(product.id)
    const order = store.checkoutCart({
      worldContext: {
        packId: 'survival_city',
        bindingId: 'survival_supply_board',
      },
    })

    expect(order.id).toBeTruthy()
    expect(chatStore.contacts).toHaveLength(contactCount)
    expect(chatStore.contacts.some((contact) => contact.shoppingServiceKey === 'daily_fresh')).toBe(false)
  })
```

Run:

```powershell
npm.cmd test -- tests/shopping-store.test.js -t "does not auto-create Shopping service accounts"
```

Expected: PASS.

- [ ] **Step 2: Add no-auto-subscribe Food Delivery assertion**

Add this test to `tests/food-delivery-store.test.js`:

```js
  test('does not auto-create Food Delivery dispatch accounts when no joined target exists', () => {
    const store = useFoodDeliveryStore()
    const chatStore = useChatStore()
    store.resetForTesting()
    const contactCount = chatStore.contacts.length
    const restaurant = store.upsertRestaurant({
      id: 'food_no_dispatch_shop',
      name: 'No Dispatch Kitchen',
      category: 'nearby',
      deliveryFee: '1.00',
    })
    const item = store.upsertMenuItem({
      id: 'food_no_dispatch_item',
      restaurantId: restaurant.id,
      title: 'No Dispatch Meal',
      price: '12.00',
    })

    store.addToCart(item.id)
    const order = store.checkoutCart({
      worldContext: {
        packId: 'survival_city',
        bindingId: 'survival_dispatch',
      },
    })

    expect(order.id).toBeTruthy()
    expect(chatStore.contacts).toHaveLength(contactCount)
    expect(chatStore.contacts.some((contact) => contact.foodDeliveryServiceKey === 'food_delivery_dispatch')).toBe(false)
  })
```

Run:

```powershell
npm.cmd test -- tests/food-delivery-store.test.js -t "does not auto-create Food Delivery dispatch accounts"
```

Expected: PASS.

- [ ] **Step 3: Add source-key alignment assertions**

Append this test to `tests/service-account-source-plan.test.js`:

```js
  test('keeps source notification plan rows aligned with source-module push keys', () => {
    const plan = buildServiceAccountSourceNotificationPlan({
      shoppingServiceKey: 'daily_fresh',
      logisticsServiceKey: 'standard_courier',
      foodDeliveryServiceKey: 'food_delivery_dispatch',
    })

    expect(plan.rows.map((row) => [row.serviceBindingKey, row.sourceModule])).toEqual([
      ['shoppingServiceKey', 'shopping_order_update'],
      ['logisticsServiceKey', 'shopping_logistics_tracking'],
      ['foodDeliveryServiceKey', 'food_delivery_chat_push'],
    ])
    expect(plan.rows.every((row) => row.schedule.autoCreatesSubscription === false)).toBe(true)
    expect(plan.rows.every((row) => row.schedule.autoCreatesSourceRecords === false)).toBe(true)
  })
```

Run:

```powershell
npm.cmd test -- tests/service-account-source-plan.test.js
```

Expected: PASS.

---

### Task 7: Documentation And Validation

**Files:**
- Modify: `docs/pm/chat-and-chat-directory/SERVICE_ACCOUNT_LINK_CONTRACT.md`
- Modify: `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
- Modify: `docs/overview/PROJECT_MASTER_GUIDE.md`
- Modify: `docs/roadmap/TODO_ROADMAP.md`
- Modify: `docs/pm/TODO_PM_STATUS_REPORT.md`

- [ ] **Step 1: Update the Chat service-account contract docs**

In `docs/pm/chat-and-chat-directory/SERVICE_ACCOUNT_LINK_CONTRACT.md`, add this behavioral note under the `sourceNotificationPlan` section:

```md
Source modules may resolve a ready target by matching `sourceModule`, `serviceBindingKey`, `serviceKey`, and optional World Pack origin (`worldPackId`, `worldAppBindingId`). A ready match means the user has already joined the service/official account. Source modules may then append a `service_notification` block to that Chat account. They must not create the account, subscribe the user, or copy source-module business records into Chat.
```

- [ ] **Step 2: Update package handoff docs**

Add a short current-status bullet to:

- `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
- `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`

Use this wording:

```md
World Pack generated service/official accounts can now be selected by concrete Shopping, logistics, and Food Delivery push paths through the ready `sourceNotificationPlan` route resolver. Chat receives `service_notification` history only; Shopping and Food Delivery keep source records, order state, and fulfillment state.
```

- [ ] **Step 3: Update overview and roadmap**

Update:

- `docs/overview/PROJECT_MASTER_GUIDE.md`
- `docs/roadmap/TODO_ROADMAP.md`
- `docs/pm/TODO_PM_STATUS_REPORT.md`

Use product-facing wording:

```md
The next World Pack service-account slice is exercised from real source modules: when a user has joined a matching World Pack service/official account, Shopping, logistics, and Food Delivery can send their normal service notifications to that account. If the user has not joined, no subscription is created automatically.
```

- [ ] **Step 4: Run focused tests**

Run:

```powershell
npm.cmd test -- tests/service-account-source-routing.test.js tests/service-account-source-plan.test.js tests/chat-store-model.test.js tests/shopping-store.test.js tests/food-delivery-store.test.js
```

Expected: PASS.

- [ ] **Step 5: Run required full validation**

Run:

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
git diff --check
```

Expected: PASS. The build may continue to show the existing `src/lib/push.js` dynamic/static import chunk warning; do not treat that warning as a new failure unless the command exits non-zero.

---

## Self-Review

- Spec coverage: The plan keeps Chat as receiver/contract owner, lets source modules own records, supports already-joined World Pack service accounts, avoids AI role conversation work, and preserves no-auto-subscribe behavior.
- Placeholder scan: No placeholder markers or unspecified test steps remain.
- Type consistency: The plan consistently uses `sourceNotificationPlan`, `sourceModule`, `serviceBindingKey`, `serviceKey`, `worldPackId`, `worldAppBindingId`, `shopping_order_update`, `shopping_logistics_tracking`, and `food_delivery_chat_push`.
