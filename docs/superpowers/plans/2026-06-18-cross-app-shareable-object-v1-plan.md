# Cross-App Shareable Object V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for landed steps and (`- [ ]`) syntax for remaining follow-up.

**Implementation status on 2026-06-18:** V1 Chat + Shopping slice landed. `src/lib/shareable-object.js` now normalizes product links, virtual gifts, and tracking-share objects; Chat accepts/renders `share_card`; the Chat `+` Shopping preview now sends `product_link` share cards by default and only labels gift-card/virtual-gift-like items as giftable. Logistics, Food Delivery, Map, Calendar, Gallery, Reminders, and Assets keep reserved object types but do not yet have full source-app share UI in this slice.

**Continuation handoff:** Remaining work is tracked in `docs/superpowers/plans/2026-06-18-cross-app-shareable-object-continuation-plan.md`. Start there on another machine for physical-gift tracking cards, Shopping-owned digital gift lifecycle, source share registry, and relationship-event gating.

**Goal:** Build the first working cross-App share object path so Chat can carry source-owned product links, virtual gifts, and future logistics/location/calendar/media cards without becoming the business owner.

**Architecture:** Add one shared helper in `src/lib/shareable-object.js` to normalize source-created share objects and convert them into Chat `share_card` blocks. Chat store/view/components learn `share_card` as a first-class rich block, while existing `product_card` stays compatible. Shopping preview data marks products as `product_link` or `virtual_gift`, and user-sent cards use the new block shape.

**Tech Stack:** Vue 3, Pinia setup stores, Vue Test Utils, Vitest, existing SchatPhone docs/process.

---

### Task 1: Shared Shareable Object Contract

**Files:**
- Create: `src/lib/shareable-object.js`
- Test: `tests/shareable-object.test.js`

- [x] **Step 1: Write the failing tests**

```js
import { describe, expect, test } from 'vitest'
import {
  SHAREABLE_OBJECT_TYPES,
  createProductLinkShareObject,
  createVirtualGiftShareObject,
  normalizeShareableObject,
  shareableObjectToChatBlock,
} from '../src/lib/shareable-object'

describe('shareable-object contract', () => {
  test('normalizes Shopping product links without implying a gift', () => {
    const share = createProductLinkShareObject({
      id: 'product_lens',
      title: 'Mira Lens',
      desc: 'Portable camera lens',
      category: 'digital',
      price: '1288.00 CNY',
      serviceKey: 'nova_digital',
      serviceLabel: 'Nova Digital',
    })

    expect(share).toMatchObject({
      type: SHAREABLE_OBJECT_TYPES.PRODUCT_LINK,
      sourceModule: 'shopping',
      sourceId: 'product_lens',
      title: 'Mira Lens',
      statusLabel: 'Product link',
      route: '/shopping?productId=product_lens&category=digital&source=chat&intent=product_link',
      aiContext: {
        intent: 'product_link',
        sourceTruthOwner: 'Shopping',
      },
    })
    expect(share.aiContext.recipientMeaning).toContain('shared a Shopping product link')
  })

  test('normalizes virtual gifts as sendable digital gifts', () => {
    const share = createVirtualGiftShareObject({
      id: 'gift_card',
      title: 'SchatPhone Gift Card',
      price: '88.00 CNY',
      giftable: true,
    })

    expect(share).toMatchObject({
      type: SHAREABLE_OBJECT_TYPES.VIRTUAL_GIFT,
      sourceModule: 'shopping',
      sourceId: 'gift_card',
      statusLabel: 'Virtual gift',
    })
    expect(share.aiContext.intent).toBe('virtual_gift')
  })

  test('converts a normalized share object into a Chat share card block', () => {
    const share = normalizeShareableObject({
      type: 'tracking_share',
      sourceModule: 'logistics',
      sourceId: 'order_1',
      title: 'Package tracking',
      summary: 'Courier is on the way.',
      route: '/shopping?category=logistics&orderId=order_1',
      aiContext: {
        intent: 'tracking_share',
        recipientMeaning: 'The package is on the way.',
        sourceTruthOwner: 'Logistics',
        mutationBoundary: 'Chat replies do not sign or update package state.',
      },
    })

    expect(shareableObjectToChatBlock(share)).toMatchObject({
      type: 'share_card',
      shareType: 'tracking_share',
      sourceModule: 'logistics',
      sourceId: 'order_1',
      title: 'Package tracking',
    })
  })
})
```

- [x] **Step 2: Run the failing tests**

Run: `npm.cmd test -- tests/shareable-object.test.js`

Expected: fail because `src/lib/shareable-object.js` does not exist yet.

- [x] **Step 3: Implement the helper**

Create constants, text normalizers, `normalizeShareableObject`, `shareableObjectToChatBlock`, `createProductLinkShareObject`, `createVirtualGiftShareObject`, and `createTrackingShareObject`.

- [x] **Step 4: Run helper tests**

Run: `npm.cmd test -- tests/shareable-object.test.js`

Expected: pass.

### Task 2: Chat Store And Prompt Context

**Files:**
- Modify: `src/stores/chat.js`
- Modify: `src/views/ChatView.vue`
- Test: `tests/chat-store.test.js` or focused existing Chat tests

- [x] **Step 1: Add `share_card` to valid rich blocks**

Update block normalization to accept a `share_card` block produced by `shareableObjectToChatBlock`.

- [x] **Step 2: Add ChatView context and preview support**

Update `messageBlockContextText`, `messageBlockPreviewText`, and assistant replacement sanitization so `share_card` is visible to AI as a source-owned shared object.

- [x] **Step 3: Run focused Chat tests**

Run: `npm.cmd test -- tests/chat-settings-me-appearance.test.js tests/chat-user-action-shopping-entry.test.js`

Expected: pass after expected assertion updates.

### Task 3: Chat Message Rendering And User Action Panel

**Files:**
- Modify: `src/components/chat/ChatMessageRow.vue`
- Modify: `src/components/chat/ChatUserActionPanel.vue`
- Test: `tests/chat-user-action-shopping-entry.test.js`

- [x] **Step 1: Render `share_card`**

Add a generic source-owned share card UI with share type label, source label, title, summary, amount/status chips, and a source action button.

- [x] **Step 2: Separate virtual gifts from product links in the `+` panel**

Keep the Shopping preview list compact, but label each row as `Virtual gift` or `Product link`. Direct send emits a share payload, not a legacy product gift.

- [x] **Step 3: Update panel tests**

Assert product links do not say "Giftable" unless they are virtual gifts, and emitted payload contains `shareType`.

### Task 4: ChatView Send Path

**Files:**
- Modify: `src/views/ChatView.vue`
- Test: `tests/chat-user-action-shopping-entry.test.js`

- [x] **Step 1: Convert Shopping preview products into share objects**

Import `createProductLinkShareObject`, `createVirtualGiftShareObject`, and `shareableObjectToChatBlock`.

- [x] **Step 2: Send `share_card` messages**

Update `submitShoppingProductCard` so it appends a `share_card` block and keeps old `product_card` only as persisted compatibility.

- [x] **Step 3: Keep source navigation intact**

Update `openShoppingProductCard` to read `share_card.route` or source id when opening Shopping.

### Task 5: Docs And Validation

**Files:**
- Modify: `docs/pm/chat-and-chat-directory/README.md`
- Modify: `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/chat-and-chat-directory/PRODUCT_BOUNDARY.md`
- Modify: `docs/pm/commerce-finance-and-assets/README.md`
- Modify: `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/commerce-finance-and-assets/PRODUCT_BOUNDARY.md`

- [x] **Step 1: Document product meaning**

State that Chat now carries source-owned share cards; Shopping/Logistics/Food/Map/Calendar/Gallery remain owners of truth.

- [x] **Step 2: Run full validation**

Run:

```powershell
npm.cmd test -- tests/shareable-object.test.js tests/chat-user-action-shopping-entry.test.js tests/chat-settings-me-appearance.test.js tests/shopping-view.test.js
npm.cmd run lint
npm.cmd run build
```

Validation already passed:

```powershell
npm.cmd test -- tests/shareable-object.test.js tests/chat-user-action-shopping-entry.test.js tests/chat-settings-me-appearance.test.js tests/chat-shopping-preview-routing.test.js tests/shopping-view.test.js
npm.cmd run build
npm.cmd run lint
```

## Self-Review Notes

- Spec coverage: covers shared contract, Chat rendering/context, Shopping product-link/virtual-gift semantics, logistics-ready contract, docs sync, and validation.
- Intentional V1 gap: Map, Calendar, Gallery, Reminders, Food Delivery, and Assets get reserved contract semantics but no full source UI in this slice.
- No implementation step should make Chat mutate source-module records.
