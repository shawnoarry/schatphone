# Cross-App Shareable Object Continuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining cross-App share object loops so Chat can carry source-owned physical-gift tracking cards and purchased virtual gifts without owning checkout, logistics, or redemption state.

**Architecture:** Keep `src/lib/shareable-object.js` as the protocol boundary. Source modules create and own shareable records; Chat only stores a readable `share_card` snapshot, opens source routes, and passes plain-language meaning to the AI prompt. Relationship/runtime facts are created only after source-owned events such as redeemed, accepted, delivered, signed, or confirmed.

**Tech Stack:** Vue 3, Pinia setup stores, Vue Router, Vue Test Utils, Vitest, existing SchatPhone docs/process.

---

## Current Landed State

The 2026-06-18 V1 Chat + Shopping slice is already implemented:

- `src/lib/shareable-object.js` normalizes `product_link`, `virtual_gift`, `gift_card`, and `tracking_share`.
- Chat accepts/renders `share_card` blocks and still reads old `product_card` blocks for persisted compatibility.
- Chat `+` Shopping sends ordinary products as `product_link`.
- Gift-card / voucher / virtual-gift-like Shopping preview items are labeled as direct sendable virtual gifts.
- `product_card` is no longer the preferred new send path.

Validation already passed on the first machine:

```powershell
npm.cmd test -- tests/shareable-object.test.js tests/chat-user-action-shopping-entry.test.js tests/chat-settings-me-appearance.test.js tests/chat-shopping-preview-routing.test.js tests/shopping-view.test.js
npm.cmd run build
npm.cmd run lint
```

## Read First On Another Machine

- [ ] **Step 1: Install dependencies**

```powershell
npm.cmd install
```

Expected: dependency installation completes without changing source files except lockfile normalization if the local package manager version differs.

- [ ] **Step 2: Read the process and active domain docs**

Read these files before editing:

```text
docs/process/AI_WORK_MODE.md
docs/README.md
docs/overview/PROJECT_MASTER_GUIDE.md
docs/roadmap/TODO_ROADMAP.md
docs/pm/TASK_PACKAGE_INDEX.md
docs/pm/chat-and-chat-directory/README.md
docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md
docs/pm/commerce-finance-and-assets/README.md
docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md
docs/superpowers/specs/2026-06-18-cross-app-shareable-object-design.md
docs/superpowers/plans/2026-06-18-cross-app-shareable-object-v1-plan.md
```

Expected: the worker can explain these three product rules before writing code:

```text
Chat is the transport layer, not the source of product/order/logistics truth.
Ordinary Shopping products sent from Chat are product links, not gifts.
Virtual gifts can be sent from Chat only when Shopping has created a digital gift-style object.
```

- [ ] **Step 3: Confirm baseline**

Run:

```powershell
npm.cmd test -- tests/shareable-object.test.js tests/chat-shopping-preview-routing.test.js tests/shopping-view.test.js
```

Expected: all three focused test files pass before continuation work begins.

---

### Task 1: Physical Gift Tracking Share From Chat

**Product result:** When a physical gift order already exists, Chat can send a logistics/tracking card into the conversation. The card tells the AI that a package is on the way or may need signature, while Shopping/Logistics still owns delivery state.

**Files:**
- Modify: `src/views/ChatView.vue`
- Modify: `src/views/ShoppingView.vue`
- Modify: `src/lib/shareable-object.js`
- Test: `tests/chat-shopping-preview-routing.test.js`
- Test: `tests/shopping-view.test.js`

- [ ] **Step 1: Write the failing Chat test**

Add this test to `tests/chat-shopping-preview-routing.test.js` after the confirmed gift order context test:

```js
test('sends a physical gift tracking share card without mutating Shopping state', async () => {
  const router = createTestRouter()
  await router.push('/chat/1')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const shoppingStore = useShoppingStore()
  const chatStore = useChatStore()

  const order = shoppingStore.createGiftOrder({
    items: [
      {
        productId: 'desk_lamp',
        title: 'Desk Lamp',
        quantity: 1,
        price: 168,
        category: 'home',
      },
    ],
    recipient: {
      contactId: 1,
      name: 'Ari',
    },
    source: 'chat',
  })

  const wrapper = mount(ChatView, {
    global: {
      plugins: [pinia, router],
      stubs: {
        RouterLink: RouterLinkStub,
      },
    },
  })

  await flushPromises()
  await nextTick()

  await wrapper.get(`[data-testid="chat-gift-order-share-tracking-${order.id}"]`).trigger('click')
  await flushPromises()
  await nextTick()

  const messages = chatStore.getMessagesByContactId(1)
  const shareMessage = messages.find((message) =>
    Array.isArray(message.blocks) &&
    message.blocks.some((block) =>
      block.type === 'share_card' &&
      block.shareType === 'tracking_share' &&
      block.sourceModule === 'logistics' &&
      block.sourceId === order.id,
    ),
  )

  expect(shareMessage).toBeTruthy()
  expect(shoppingStore.orderCount).toBe(1)
  expect(shoppingStore.cartQuantity).toBe(0)
  expect(wrapper.get(`[data-testid="chat-share-card-open-logistics-${order.id}"]`).exists()).toBe(true)

  await wrapper.get(`[data-testid="chat-share-card-open-logistics-${order.id}"]`).trigger('click')
  await flushPromises()
  await nextTick()

  expect(router.currentRoute.value.path).toBe('/shopping')
  expect(router.currentRoute.value.query).toMatchObject({
    source: 'chat',
    intent: 'tracking_share',
    category: 'logistics',
    orderId: order.id,
  })

  wrapper.unmount()
})
```

Run:

```powershell
npm.cmd test -- tests/chat-shopping-preview-routing.test.js
```

Expected: fails because the button `chat-gift-order-share-tracking-<orderId>` does not exist yet.

- [ ] **Step 2: Enhance tracking share normalization**

In `src/lib/shareable-object.js`, keep existing exports and make `createTrackingShareObject` accept the order/event fields used by Chat:

```js
export const createTrackingShareObject = (input = {}) => {
  const sourceId = normalizeText(input.sourceId || input.orderId || input.id)
  const category = normalizeText(input.category) || 'logistics'
  const route =
    normalizeText(input.route) ||
    `/shopping?source=chat&intent=tracking_share&category=${encodeURIComponent(category)}&orderId=${encodeURIComponent(sourceId)}`

  return normalizeShareableObject({
    id: normalizeText(input.id) || `tracking_share_${sourceId || Date.now()}`,
    type: SHAREABLE_OBJECT_TYPES.TRACKING_SHARE,
    sourceModule: SHAREABLE_SOURCE_MODULES.LOGISTICS,
    sourceId,
    sourceEventId: normalizeText(input.sourceEventId),
    title: normalizeText(input.title) || 'Package tracking',
    summary: normalizeText(input.summary) || 'Delivery and signature context for a physical gift.',
    statusLabel: normalizeText(input.statusLabel) || 'Tracking share',
    amountLabel: normalizeText(input.amountLabel),
    category,
    route,
    actions: [
      {
        key: 'open_source',
        label: 'Open logistics',
        route,
        intent: 'tracking_share',
      },
    ],
    aiContext: {
      intent: 'tracking_share',
      recipientMeaning:
        normalizeText(input.recipientMeaning) ||
        'The user shared delivery or signature context for a physical gift. The recipient can react socially, but Chat does not update delivery state.',
      sourceTruthOwner: 'Logistics',
      mutationBoundary: 'Chat replies do not sign, deliver, cancel, or update package state.',
    },
  })
}
```

Run:

```powershell
npm.cmd test -- tests/shareable-object.test.js
```

Expected: existing shareable-object tests still pass.

- [ ] **Step 3: Add order summary fields in Chat**

In `src/views/ChatView.vue`, import `createTrackingShareObject` from `../lib/shareable-object`.

Update `activeGiftOrderSummaries` so each summary contains the fields needed for a card:

```js
return orders.map((order) => {
  const latestEvent = Array.isArray(order.timeline) ? order.timeline[0] : null
  const title = order.items?.[0]?.title || t('实体礼物', 'Physical gift')
  const itemCount = order.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0
  return {
    id: order.id,
    title,
    itemCount,
    amount: order.totalLabel || order.amountLabel || '',
    recipientName: order.recipient?.name || '',
    status: order.status || '',
    statusLabel: order.statusLabel || latestEvent?.typeLabel || t('物流分享', 'Tracking share'),
    latestEvent,
  }
})
```

Use the local order field names that already exist in `activeGiftOrderSummaries`; preserve any existing properties not shown here.

- [ ] **Step 4: Add the Chat send handler**

Add this function near `openShoppingGiftOrder` in `src/views/ChatView.vue`:

```js
const submitGiftOrderTrackingShare = (order = {}) => {
  if (!activeChat.value || !order?.id) return

  const route = `/shopping?source=chat&intent=tracking_share&category=logistics&orderId=${encodeURIComponent(order.id)}`
  const shareable = createTrackingShareObject({
    sourceId: order.id,
    orderId: order.id,
    sourceEventId: order.latestEvent?.id || '',
    title: order.title || t('包裹物流', 'Package tracking'),
    summary:
      order.latestEvent?.summary ||
      t('这是一份实体礼物的物流或签收信息。', 'This is delivery or signature context for a physical gift.'),
    statusLabel: order.statusLabel || t('物流分享', 'Tracking share'),
    amountLabel: order.amount,
    route,
  })
  const shareBlock = shareableObjectToChatBlock(shareable)
  if (!shareBlock) {
    showUiNotice('warning', t('物流分享卡片不可用。', 'Tracking share card is unavailable.'))
    return
  }

  appendUserMessage({
    content: `${t('物流分享', 'Tracking share')}: ${shareable.title}`,
    blocks: [shareBlock],
    source: 'shopping_tracking_share',
  })
}
```

- [ ] **Step 5: Add the UI action**

In the confirmed gift order context section of `src/views/ChatView.vue`, keep the existing "open order" action and add a second button:

```vue
<button
  type="button"
  class="rounded-full border border-sky-200 px-3 py-1 text-[11px] font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
  :data-testid="`chat-gift-order-share-tracking-${order.id}`"
  @click="submitGiftOrderTrackingShare(order)"
>
  {{ t('发送物流卡', 'Send tracking') }}
</button>
```

Expected UI meaning: users can share a logistics card from a previously created physical gift order; this action does not create a new order and does not add anything to cart.

- [ ] **Step 6: Make Shopping recognize tracking-share source routes**

In `src/views/ShoppingView.vue`, update logistics source detection:

```js
const openedFromChatLogistics = computed(() =>
  sourceModule.value === 'chat' &&
  (sourceIntent.value === 'logistics' || sourceIntent.value === 'tracking_share'),
)
```

If the banner text branches on `openedFromChatLogistics`, keep it as logistics wording. The route query is the source of precise intent.

- [ ] **Step 7: Add the Shopping route test**

Add this test to `tests/shopping-view.test.js`:

```js
test('shows Chat tracking share source banner for logistics intent', async () => {
  const router = createTestRouter()
  await router.push('/shopping?source=chat&intent=tracking_share&category=logistics&orderId=gift_order_1')
  await router.isReady()

  const wrapper = mount(ShoppingView, {
    global: {
      plugins: [createPinia(), router],
      stubs: {
        RouterLink: RouterLinkStub,
      },
    },
  })

  await flushPromises()
  await nextTick()

  expect(wrapper.get('[data-testid="shopping-chat-source-banner"]').text()).toContain('logistics')

  wrapper.unmount()
})
```

If the project language defaults to Chinese in tests, assert the test id exists and assert `router.currentRoute.value.query.intent` is `tracking_share` instead of asserting English text.

- [ ] **Step 8: Validate Task 1**

Run:

```powershell
npm.cmd test -- tests/shareable-object.test.js tests/chat-shopping-preview-routing.test.js tests/shopping-view.test.js
npm.cmd run lint
```

Expected: tests and lint pass.

- [ ] **Step 9: Commit Task 1**

```powershell
git add src/lib/shareable-object.js src/views/ChatView.vue src/views/ShoppingView.vue tests/chat-shopping-preview-routing.test.js tests/shopping-view.test.js
git commit -m "feat: share physical gift tracking cards in chat"
```

---

### Task 2: Shopping-Owned Virtual Gift And Gift Card Lifecycle

**Product result:** Chat can only send virtual gifts that Shopping has deliberately created as digital gift objects. Ordinary physical products remain product links unless Shopping converts them into a gift/order/tracking object.

**Files:**
- Modify: `src/stores/shopping.js`
- Modify: `src/views/ShoppingView.vue`
- Modify: `src/views/ChatView.vue`
- Modify: `src/lib/shareable-object.js`
- Test: `tests/shopping-view.test.js`
- Test: `tests/chat-user-action-shopping-entry.test.js`
- Test: `tests/shareable-object.test.js`

- [ ] **Step 1: Write the Shopping store test for digital gift state**

Add a focused test in the existing Shopping test file that imports `useShoppingStore`:

```js
test('creates a purchased digital gift object for Chat sharing', () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const shoppingStore = useShoppingStore()

  const gift = shoppingStore.createDigitalGift({
    productId: 'schat_gift_card_88',
    title: 'Schat Gift Card',
    kind: 'gift_card',
    amountLabel: '88 CNY',
    recipientContactId: 1,
  })

  expect(gift).toMatchObject({
    productId: 'schat_gift_card_88',
    title: 'Schat Gift Card',
    kind: 'gift_card',
    amountLabel: '88 CNY',
    owner: 'user',
    status: 'purchased',
    recipientContactId: 1,
  })
  expect(gift.id).toMatch(/^digital_gift_/)
  expect(gift.createdAt).toEqual(expect.any(Number))
})
```

Run:

```powershell
npm.cmd test -- tests/shopping-view.test.js
```

Expected: fails because `createDigitalGift` is not implemented.

- [ ] **Step 2: Add the store API**

In `src/stores/shopping.js`, add a `digitalGifts` state collection if the store does not already have one, then add this action:

```js
const digitalGifts = ref([])

const createDigitalGift = (payload = {}) => {
  const productId = typeof payload.productId === 'string' ? payload.productId.trim() : ''
  const title = typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'Digital gift'
  const kind = payload.kind === 'gift_card' ? 'gift_card' : 'virtual_gift'
  const id = `digital_gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const gift = {
    id,
    productId,
    title,
    kind,
    amountLabel: typeof payload.amountLabel === 'string' ? payload.amountLabel.trim() : '',
    owner: payload.owner === 'role' ? 'role' : 'user',
    status: 'purchased',
    recipientContactId: Number(payload.recipientContactId) || null,
    createdAt: Date.now(),
    redeemedAt: null,
  }
  digitalGifts.value.unshift(gift)
  return gift
}
```

Return `digitalGifts` and `createDigitalGift` from the store. Preserve existing persisted-state patterns in the store if Shopping already persists orders/cart.

- [ ] **Step 3: Add share helper for purchased digital gifts**

In `src/lib/shareable-object.js`, add:

```js
export const createDigitalGiftShareObject = (input = {}) => {
  const type = input.kind === SHAREABLE_OBJECT_TYPES.GIFT_CARD
    ? SHAREABLE_OBJECT_TYPES.GIFT_CARD
    : SHAREABLE_OBJECT_TYPES.VIRTUAL_GIFT

  return createVirtualGiftShareObject({
    ...input,
    id: input.id || input.sourceId,
    sourceId: input.id || input.sourceId,
    shareType: type,
    statusLabel: type === SHAREABLE_OBJECT_TYPES.GIFT_CARD ? 'Gift card' : 'Virtual gift',
    recipientMeaning:
      input.recipientMeaning ||
      'The user sent a purchased digital gift object. Shopping owns purchase, validity, and redemption state.',
  })
}
```

Add it to `tests/shareable-object.test.js`:

```js
test('converts purchased digital gift objects into Chat share cards', () => {
  const share = createDigitalGiftShareObject({
    id: 'digital_gift_1',
    productId: 'schat_gift_card_88',
    title: 'Schat Gift Card',
    kind: 'gift_card',
    amountLabel: '88 CNY',
  })

  expect(shareableObjectToChatBlock(share)).toMatchObject({
    type: 'share_card',
    shareType: 'gift_card',
    sourceModule: 'shopping',
    sourceId: 'digital_gift_1',
    title: 'Schat Gift Card',
    amountLabel: '88 CNY',
  })
})
```

Run:

```powershell
npm.cmd test -- tests/shareable-object.test.js
```

Expected: passes.

- [ ] **Step 4: Wire Chat to purchased digital gifts first**

In `src/views/ChatView.vue`, change the direct send path so a virtual gift preview uses a Shopping-owned digital gift object before appending the Chat message:

```js
const giftRecord = isVirtualGiftShareType(product.shareType)
  ? shoppingStore.createDigitalGift({
      productId: product.productId,
      title: product.title,
      kind: product.shareType === SHAREABLE_OBJECT_TYPES.GIFT_CARD ? 'gift_card' : 'virtual_gift',
      amountLabel: product.price,
      recipientContactId: activeChat.value?.contactId || activeChat.value?.id,
    })
  : null

const shareable = giftRecord
  ? createDigitalGiftShareObject(giftRecord)
  : createProductLinkShareObject(product)
```

Expected behavior: user-sent virtual gifts in Chat represent purchased digital gift records. AI role-originated gifts are a separate future source action and do not need this user purchase check.

- [ ] **Step 5: Validate Task 2**

Run:

```powershell
npm.cmd test -- tests/shareable-object.test.js tests/chat-user-action-shopping-entry.test.js tests/shopping-view.test.js
npm.cmd run lint
npm.cmd run build
```

Expected: tests, lint, and build pass.

- [ ] **Step 6: Commit Task 2**

```powershell
git add src/stores/shopping.js src/views/ShoppingView.vue src/views/ChatView.vue src/lib/shareable-object.js tests/shopping-view.test.js tests/chat-user-action-shopping-entry.test.js tests/shareable-object.test.js
git commit -m "feat: send shopping-owned digital gifts from chat"
```

---

### Task 3: Source Share Sheet Contract For Other Apps

**Product result:** Future source apps can create share objects in the same shape without Chat-specific business logic.

**Files:**
- Create: `src/lib/shareable-source-registry.js`
- Modify: `src/lib/shareable-object.js`
- Test: `tests/shareable-object.test.js`

- [ ] **Step 1: Add registry tests**

Add this to `tests/shareable-object.test.js`:

```js
import {
  getShareableSourceDefinition,
  SHAREABLE_SOURCE_DEFINITIONS,
} from '../src/lib/shareable-source-registry'

test('lists source-owned share types for staged modules', () => {
  expect(SHAREABLE_SOURCE_DEFINITIONS.shopping.types).toEqual(
    expect.arrayContaining(['gift_card', 'virtual_gift', 'product_link', 'order_share']),
  )
  expect(SHAREABLE_SOURCE_DEFINITIONS.logistics.types).toContain('tracking_share')
  expect(SHAREABLE_SOURCE_DEFINITIONS.map.types).toEqual(expect.arrayContaining(['location_share', 'route_share']))
  expect(SHAREABLE_SOURCE_DEFINITIONS.calendar.types).toContain('calendar_invite')
  expect(SHAREABLE_SOURCE_DEFINITIONS.gallery.types).toContain('gallery_asset_share')
})

test('resolves source definitions with owner wording', () => {
  expect(getShareableSourceDefinition('shopping')).toMatchObject({
    ownerLabel: 'Shopping',
    mutationBoundary: 'Shopping owns product, checkout, order, gift, and redemption state.',
  })
})
```

Run:

```powershell
npm.cmd test -- tests/shareable-object.test.js
```

Expected: fails because `src/lib/shareable-source-registry.js` does not exist.

- [ ] **Step 2: Create the registry**

Create `src/lib/shareable-source-registry.js`:

```js
export const SHAREABLE_SOURCE_DEFINITIONS = {
  shopping: {
    ownerLabel: 'Shopping',
    types: ['gift_card', 'virtual_gift', 'product_link', 'order_share'],
    mutationBoundary: 'Shopping owns product, checkout, order, gift, and redemption state.',
  },
  logistics: {
    ownerLabel: 'Logistics',
    types: ['tracking_share'],
    mutationBoundary: 'Logistics owns tracking events, delivery state, and signature state.',
  },
  food_delivery: {
    ownerLabel: 'Food Delivery',
    types: ['food_shop_link', 'food_order_share'],
    mutationBoundary: 'Food Delivery owns restaurants, menus, carts, orders, and delivery state.',
  },
  map: {
    ownerLabel: 'Map',
    types: ['location_share', 'route_share'],
    mutationBoundary: 'Map owns place, route, ETA, and travel state.',
  },
  calendar: {
    ownerLabel: 'Calendar',
    types: ['calendar_invite'],
    mutationBoundary: 'Calendar owns event time, participant state, and schedule edits.',
  },
  reminders: {
    ownerLabel: 'Reminders',
    types: ['reminder_cue_share'],
    mutationBoundary: 'Reminders owns cue state until the user promotes or dismisses it.',
  },
  gallery: {
    ownerLabel: 'Gallery',
    types: ['gallery_asset_share'],
    mutationBoundary: 'Gallery owns media asset metadata and source references.',
  },
  assets: {
    ownerLabel: 'Assets',
    types: ['asset_record_share'],
    mutationBoundary: 'Assets owns long-term ownership and asset lifecycle state.',
  },
}

export const getShareableSourceDefinition = (sourceModule) =>
  SHAREABLE_SOURCE_DEFINITIONS[sourceModule] || null
```

- [ ] **Step 3: Validate Task 3**

Run:

```powershell
npm.cmd test -- tests/shareable-object.test.js
npm.cmd run lint
```

Expected: tests and lint pass.

- [ ] **Step 4: Commit Task 3**

```powershell
git add src/lib/shareable-source-registry.js tests/shareable-object.test.js
git commit -m "feat: register source-owned share object types"
```

---

### Task 4: Relationship Events After Source Confirmation

**Product result:** Sending a share card does not automatically become relationship memory. Only source-confirmed events create compact relationship facts.

**Files:**
- Modify: `src/stores/shopping.js`
- Modify: `src/lib/shareable-object.js`
- Test: matching relationship/runtime adapter test already used by the project
- Docs: `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`

- [ ] **Step 1: Identify the existing adapter**

Search:

```powershell
rg "relationship" src tests docs/architecture
rg "compact fact|fact" src tests docs/architecture
```

Expected: locate the existing source-to-relationship adapter or confirm the project has no adapter for Shopping events yet. If no adapter exists, add only docs and store event shape in this task; do not create a new runtime pipeline in the same commit.

- [ ] **Step 2: Add source event shape for digital gift redemption**

In `src/stores/shopping.js`, add a redemption action beside `createDigitalGift`:

```js
const redeemDigitalGift = (giftId, payload = {}) => {
  const gift = digitalGifts.value.find((item) => item.id === giftId)
  if (!gift || gift.status === 'redeemed') return null
  gift.status = 'redeemed'
  gift.redeemedAt = Date.now()
  gift.redeemedByContactId = Number(payload.contactId) || gift.recipientContactId || null
  return {
    id: `shopping_event_${gift.id}_redeemed`,
    type: 'digital_gift_redeemed',
    sourceModule: 'shopping',
    sourceId: gift.id,
    title: gift.title,
    contactId: gift.redeemedByContactId,
    occurredAt: gift.redeemedAt,
  }
}
```

Expected behavior: the event is compact and source-owned. Chat messages do not create this event.

- [ ] **Step 3: Add tests for redemption state**

Add to the Shopping store test file:

```js
test('redeems a digital gift as a source-owned event', () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const shoppingStore = useShoppingStore()

  const gift = shoppingStore.createDigitalGift({
    productId: 'schat_gift_card_88',
    title: 'Schat Gift Card',
    kind: 'gift_card',
    recipientContactId: 1,
  })

  const event = shoppingStore.redeemDigitalGift(gift.id, { contactId: 1 })

  expect(event).toMatchObject({
    type: 'digital_gift_redeemed',
    sourceModule: 'shopping',
    sourceId: gift.id,
    contactId: 1,
  })
  expect(gift.status).toBe('redeemed')
  expect(shoppingStore.redeemDigitalGift(gift.id, { contactId: 1 })).toBeNull()
})
```

Run:

```powershell
npm.cmd test -- tests/shopping-view.test.js
```

Expected: passes after `redeemDigitalGift` is implemented.

- [ ] **Step 4: Validate Task 4**

Run:

```powershell
npm.cmd test -- tests/shopping-view.test.js
npm.cmd run lint
```

Expected: tests and lint pass.

- [ ] **Step 5: Commit Task 4**

```powershell
git add src/stores/shopping.js tests/shopping-view.test.js docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md
git commit -m "feat: model digital gift redemption source events"
```

---

### Task 5: Documentation Sync And Product Handoff

**Product result:** The next worker, product reviewer, and design reviewer can understand what is shipped, what is staged, and what has not been made a source-owned feature yet.

**Files:**
- Modify: `docs/superpowers/specs/2026-06-18-cross-app-shareable-object-design.md`
- Modify: `docs/superpowers/plans/2026-06-18-cross-app-shareable-object-v1-plan.md`
- Modify: `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/chat-and-chat-directory/PRODUCT_BOUNDARY.md`
- Modify: `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/commerce-finance-and-assets/PRODUCT_BOUNDARY.md`
- Modify: `docs/roadmap/TODO_ROADMAP.md`
- Modify: `docs/pm/TODO_PM_STATUS_REPORT.md`

- [ ] **Step 1: Update the design spec implementation note**

Add a dated note under the existing implementation note:

```markdown
Implementation note on 2026-06-18 continuation:

- Chat can send physical-gift `tracking_share` cards only from existing source-owned orders.
- Shopping-created digital gifts are the user-owned source records for Chat-sendable `gift_card` and `virtual_gift` cards.
- Relationship/runtime memory remains downstream of source events such as redeemed, delivered, signed, or confirmed.
```

- [ ] **Step 2: Update PM handoff docs**

Use this product-facing wording in the Chat and Commerce handoff docs:

```markdown
Chat now transports source-owned share objects. A user can share a product link, a purchased digital gift, or an existing physical-gift tracking card in a conversation, but Chat does not own checkout, redemption, delivery, or signature state. Shopping/Logistics remain the source of truth and Chat messages are readable snapshots.
```

- [ ] **Step 3: Update roadmap status**

In `docs/roadmap/TODO_ROADMAP.md`, record these statuses:

```markdown
- Cross-App share object protocol: V1 Chat + Shopping product links landed.
- Physical-gift tracking cards: landed after continuation Task 1.
- Shopping-owned digital gift lifecycle: landed after continuation Task 2.
- Map / Calendar / Gallery / Food Delivery share sheets: staged after source registry.
- Relationship facts from share cards: gated on source-confirmed events, not message send.
```

Only mark a bullet as landed after the matching task has passed validation.

- [ ] **Step 4: Run final validation**

Run:

```powershell
npm.cmd test -- tests/shareable-object.test.js tests/chat-user-action-shopping-entry.test.js tests/chat-settings-me-appearance.test.js tests/chat-shopping-preview-routing.test.js tests/shopping-view.test.js
npm.cmd run lint
npm.cmd run build
```

Expected: all focused tests, lint, and build pass.

- [ ] **Step 5: Commit docs**

```powershell
git add docs/superpowers/specs/2026-06-18-cross-app-shareable-object-design.md docs/superpowers/plans/2026-06-18-cross-app-shareable-object-v1-plan.md docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md docs/pm/chat-and-chat-directory/PRODUCT_BOUNDARY.md docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md docs/pm/commerce-finance-and-assets/PRODUCT_BOUNDARY.md docs/roadmap/TODO_ROADMAP.md docs/pm/TODO_PM_STATUS_REPORT.md
git commit -m "docs: update share object continuation handoff"
```

---

## Recommended Execution Order

1. Task 1 first: it finishes the physical-gift UX decision with the smallest product surface.
2. Task 2 second: it makes virtual gifts real source-owned Shopping objects instead of heuristic labels.
3. Task 3 third: it prevents Map/Calendar/Gallery/Food from each inventing a separate Chat card contract.
4. Task 4 fourth: it connects meaningful source events to relationship semantics without making Chat invent memory.
5. Task 5 after every implemented task: keep docs synced before changing machines again.

## Guardrails

- Do not make Chat create checkout orders, redeem gift cards, sign packages, update tracking, edit calendar events, mutate map routes, or own gallery assets.
- Do not describe ordinary physical product links as "already gifted" or "delivered".
- Do not create relationship memory from a `share_card` send action alone.
- Do not delete `product_card` compatibility until persisted historical messages have a migration or display fallback.
- Do not install new UI/state libraries for these tasks; use existing Vue, Pinia, router, and test patterns.

## Handoff Prompt For The Next Machine

```text
Continue SchatPhone cross-App shareable object work from docs/superpowers/plans/2026-06-18-cross-app-shareable-object-continuation-plan.md. Start with "Read First On Another Machine", confirm focused tests pass, then implement Task 1: Physical Gift Tracking Share From Chat. Preserve the rule that Chat transports source-owned snapshots and never owns checkout, logistics, redemption, or relationship truth.
```
