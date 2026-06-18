# Cross-App Shareable Object Design / 跨 App 分享对象机制设计

Updated: 2026-06-18

Status: V1 Chat + Shopping slice implemented; broader source-app share UI remains staged.

Implementation note on 2026-06-18:

- `src/lib/shareable-object.js` defines the shared object contract and helper builders for `product_link`, `virtual_gift` / `gift_card`, and `tracking_share`.
- Chat store/view/components now accept and render `share_card` blocks.
- The Chat `+` Shopping preview defaults ordinary products to `product_link`; only gift-card / voucher / virtual-gift-like products are labeled as direct sendable gifts.
- `product_card` remains a persisted compatibility block, not the preferred new send path.
- Source-app share creation for Logistics, Food Delivery, Map, Calendar, Gallery, Reminders, and Assets is reserved for later slices.

## 1. Product Intent

SchatPhone should simulate the real phone pattern where one app creates a shareable link, card, ticket, voucher, location, schedule, media item, order status, or tracking number, and the user sends that object inside Chat.

The important product shift is:

- Chat is not a universal checkout, logistics, calendar, or asset owner.
- Chat is the social transport layer for things other apps deliberately make shareable.
- Source apps keep the real records and state.
- AI characters can read the shared object in context and respond naturally, such as accepting a virtual gift, opening a product link, waiting for a delivery, reacting to a route, or acknowledging an invitation.

This resolves the current product-card ambiguity:

- Chat should not treat all Shopping products as directly giftable.
- User-sendable gifts inside Chat should be limited to source-created digital gift objects such as gift cards, coupons, redemption codes, vouchers, memberships, or online virtual gifts.
- Physical goods should be shared as product links or logistics/tracking/signature objects, not as instant Chat-owned gifts.

## 2. Design Principle

One shareable object has two layers:

| Layer | Owner | Meaning |
| --- | --- | --- |
| Source record | Source app | The real product, order, voucher, route, event, image, or tracking state. |
| Chat message card | Chat | A social rendering of the source object, with enough context for the user and AI to understand it. |

Chat may store a snapshot for message readability, but the snapshot is not the truth.

## 3. Shared Object Types

### 3.1 Commerce And Delivery

| Object type | Source app | User meaning in Chat | Source truth |
| --- | --- | --- | --- |
| `gift_card` | Shopping | A purchased digital gift card or voucher the recipient can accept/redeem. | Shopping owns purchase, balance, redemption state, and validity. |
| `virtual_gift` | Shopping | A purely online gift, skin, membership, badge, ticket, or symbolic item. | Shopping owns purchase and delivery/redeem status; Assets may later receive durable ownership records when appropriate. |
| `product_link` | Shopping | A product/store link shared for browsing, recommendation, or intent. | Shopping owns product, price, stock, cart, checkout, and order state. |
| `order_share` | Shopping | A lightweight order context card, for example "I bought this for you." | Shopping owns the order and fulfillment status. |
| `tracking_share` | Logistics / Shopping logistics | A tracking number or package-status card the recipient may sign for or wait on. | Logistics/Shopping owns tracking events and delivery state. |
| `food_shop_link` | Food Delivery | A restaurant/menu link shared for browsing or planning. | Food Delivery owns restaurant, menu, cart, and order state. |
| `food_order_share` | Food Delivery | A food order or shared-meal status card. | Food Delivery owns order and fulfillment; Wallet and relationship facts remain downstream. |

### 3.2 Place, Schedule, And Media

| Object type | Source app | User meaning in Chat | Source truth |
| --- | --- | --- | --- |
| `location_share` | Map | A current or saved location shared into the conversation. | Map owns location and place metadata. |
| `route_share` | Map | A route, ETA, or trip plan shared with the recipient. | Map owns route, trip, ETA, and travel state. |
| `calendar_invite` | Calendar | A confirmed or proposed event invitation. | Calendar owns event time, schedule state, edits, and push scheduling. |
| `reminder_cue_share` | Reminders | A soft follow-up cue shared for attention, not a confirmed schedule. | Reminders owns cue state until promoted. |
| `gallery_asset_share` | Gallery | A photo, image, or media asset shared in Chat. | Gallery owns media asset metadata and source references. |
| `asset_record_share` | Assets | A durable owned-object record shared for viewing. | Assets owns long-term ownership state. |

## 4. Unified Contract

Every shareable object should normalize into a compact contract before it enters Chat.

```ts
type ShareableObject = {
  id: string
  type: string
  sourceModule: string
  sourceId: string
  sourceEventId?: string
  title: string
  summary?: string
  statusLabel?: string
  amountLabel?: string
  previewImageUrl?: string
  route?: string
  actions?: Array<{
    key: string
    label: string
    route?: string
    intent?: string
  }>
  aiContext: {
    intent: string
    recipientMeaning?: string
    sourceTruthOwner: string
    mutationBoundary: string
  }
  createdAt: number
  expiresAt?: number
}
```

Required behavior:

- `sourceModule + sourceId + sourceEventId` identifies the owning record or event.
- `title`, `summary`, `statusLabel`, and `amountLabel` are display snapshots.
- `route` and `actions` open the source app.
- `aiContext` is the plain-language meaning sent into Chat prompt context.
- Chat must not mutate source records through replies.

## 5. Chat Rendering Model

Chat should eventually converge rich share cards into one generic block:

```ts
{
  type: 'share_card',
  shareType: 'gift_card' | 'virtual_gift' | 'product_link' | 'tracking_share' | ...,
  sourceModule: 'shopping' | 'logistics' | 'map' | 'calendar' | ...,
  sourceId: '...',
  title: '...',
  summary: '...',
  statusLabel: '...',
  route: '...',
  actions: [...]
}
```

Existing rich blocks can remain during migration:

- `product_card` becomes a compatibility display for `product_link`.
- `service_notification` remains for service-account pushes, but may reuse the same card tone and source-action rules.
- `link_external` remains for arbitrary outside URLs.
- `location`, `gallery`, and `calendar` cards can later map to `share_card` internally.

## 6. Product Rules By Scenario

### User Sends A Gift From Chat

Allowed:

- gift card
- coupon
- redemption code
- virtual item
- digital ticket
- membership or subscription token

Not allowed as direct Chat gifts:

- arbitrary physical product cards
- ordinary Shopping products that have not been converted into a gift/voucher/share object
- raw order records without explicit share intent

### User Shares A Physical Product

The source app should create `product_link`.

Chat meaning:

- "I am showing/recommending this item."
- "I may want to buy this for you."
- "This is a product link, not a delivered gift."

AI should understand the product link without assuming it has been purchased or delivered.

### User Sends Something Physical To A Role

The source app should create either:

- `order_share`, if the important meaning is "I bought this for you"; or
- `tracking_share`, if the important meaning is "this package is on the way / needs signature."

AI should understand:

- it may need to wait for the package;
- it may react after delivery or signature;
- source status still lives in Shopping/Logistics.

### AI Role Sends A Gift

AI role gifts can bypass user purchase state because the role is the giver.

However, AI-generated gifts should still use a normalized share type when possible:

- `virtual_gift` for symbolic/online gifts;
- `product_link` for "look at this";
- future `role_gift_offer` if the role offers something from its world context.

AI should not silently create user-owned source records unless a future reviewed source-module action explicitly supports that.

## 7. Cross-Module IA Matrix

| Source module | L0 visible share affordance | L1 focused detail | L2 source management | L3 execution |
| --- | --- | --- | --- | --- |
| Shopping | Share product, buy gift card, share order | Product/gift/order sheet | Product/order/gift-card list | Checkout/redeem/cancel in Shopping |
| Logistics | Share tracking/signature card | Tracking detail | Tracking/order logistics list | Sign/confirm in Logistics/Shopping |
| Food Delivery | Share restaurant/menu/order | Restaurant/order sheet | Food orders/restaurants | Checkout/delivery actions in Food Delivery |
| Map | Share location/route/ETA | Route/place detail | Saved places/trip history | Start/complete trip in Map |
| Calendar | Share invite/event | Event detail | Calendar event list | Accept/edit/schedule in Calendar |
| Reminders | Share follow-up cue | Cue detail | Reminder inbox | Promote/dismiss in Reminders |
| Gallery | Share asset/media | Asset preview | Gallery library | Import/edit/delete in Gallery |
| Assets | Share owned-object record | Asset detail | Asset list | Ownership lifecycle in Assets |
| Chat | Send/render/share cards | Message actions | Thread history | Reply/quote/AI context only |

Rule:

- Source apps create and manage shareable objects.
- Chat transports and displays them.
- Relationship runtime may receive compact facts only after explicit meaningful source events, such as accepted gift, delivered gift, shared meal, confirmed event, or completed route.

## 8. Relationship And Memory Semantics

Share cards are not relationship facts by themselves.

Relationship facts should be created only when the source event becomes meaningful enough:

| Share object | Possible relationship moment | Timing |
| --- | --- | --- |
| `gift_card` | gift offered / gift accepted / gift redeemed | after send or redeem, depending on product decision |
| `virtual_gift` | virtual gift received | after send or accept |
| `product_link` | recommendation or wish context | no automatic relationship fact by default |
| `tracking_share` | physical gift sent / package received | after delivery/signature |
| `route_share` | shared route/trip memory | after trip completion |
| `calendar_invite` | shared plan/date memory | after event confirmation |
| `gallery_asset_share` | shared photo/media memory | opt-in later, not V1 default |

This keeps the current relationship-runtime rule intact: modules submit compact facts through adapters; Chat does not invent relationship truth from display cards alone.

## 9. Recommended Approaches

### Option A: Patch Current Product Card Only

Change Chat product cards so only virtual gifts/gift cards can be sent.

Pros:

- fastest;
- fixes the immediate UX confusion.

Cons:

- does not solve future Map/Calendar/Gallery/Food sharing;
- keeps several card types growing independently.

### Option B: Build A Unified Shareable Object Protocol First

Add a shared contract/helper and migrate source apps gradually.

Pros:

- best long-term architecture;
- keeps one owner per concept;
- makes AI context consistent;
- prevents every module from inventing its own Chat card semantics.

Cons:

- needs a small foundational design pass before feature work.

### Option C: Use Service Notifications For Everything

Treat all source-origin cards as `service_notification`.

Pros:

- reuses existing rendering and source-action behavior.

Cons:

- wrong product meaning for user-authored social sharing;
- service notifications are account/feed messages, while share objects are peer-to-peer objects;
- would make Chat services and ordinary role threads feel mixed.

Recommendation: Option B.

## 10. V1 Scope

V1 should design the whole protocol but implement only the safest user-visible slice.

### V1A: Contract And Chat Rendering

- Add a shared `shareable-object` helper/contract.
- Add `share_card` display support in Chat.
- Keep existing `product_card` and `service_notification` compatibility.
- Make AI context extraction understand `share_card`.

### V1B: Shopping Share Types

- Add Shopping-created `gift_card`, `virtual_gift`, and `product_link` objects.
- Change Chat `+` Shopping entry:
  - direct send list shows only `gift_card` / `virtual_gift`;
  - product browsing opens Shopping or sends `product_link`, not instant gift.
- Product links say they are links/recommendations, not gifts.

### V1C: Logistics Share Type

- Add `tracking_share` for order tracking/signature context.
- Let Chat render package/tracking cards.
- AI context says the role may wait for delivery or sign after arrival.

### V1D: Map / Calendar / Gallery Design Hooks

Implement only if small after V1B/V1C:

- Map can create `location_share` or `route_share`.
- Calendar can create `calendar_invite`.
- Gallery can create `gallery_asset_share`.

If V1B/V1C becomes large, keep these as protocol-ready next slices.

## 11. Later Scope

Later work can add:

- share object history inside each source app;
- redemption state for gift cards;
- recipient acceptance/decline in Chat;
- share expiry;
- group-chat share behavior;
- source app "share sheet" UI;
- relationship facts after accepted/redeemed/delivered events;
- World Pack share-object variants, such as transit passes, fan-event tickets, survival supply vouchers, bounty notices, clinic appointments, or guild invitations.

## 12. Guardrails

Treat these as bugs:

1. Chat starts owning checkout, order status, delivery state, schedule truth, route truth, media library truth, or asset ownership.
2. A product link is rendered as if the user already gifted or delivered the item.
3. A logistics card creates a gift memory before the package is delivered or explicitly accepted.
4. Calendar invites become Reminders cues without confirmation, or Reminders cues become Calendar events without user action.
5. Gallery media sharing becomes an automatic relationship-memory engine before there is a low-friction opt-in design.
6. AI replies mutate source records.
7. World Pack app bindings create share objects or source records by themselves.

## 13. Proposed Implementation Order

1. Create shared shareable-object contract and normalizers.
2. Add Chat `share_card` rendering and AI context extraction.
3. Migrate current Chat Shopping product card into `product_link` semantics.
4. Add Shopping gift-card / virtual-gift share objects.
5. Add Logistics tracking/signature share object.
6. Add Map route/location share object.
7. Add Calendar invite share object.
8. Add Gallery asset share object.
9. Add relationship-runtime adapters only for accepted/redeemed/delivered/confirmed/completed source events.

## 14. Acceptance Criteria

The design is ready for implementation when:

- a product manager can explain the difference between a gift card, a product link, and a tracking card;
- Chat can render a shared object without becoming the source app;
- AI context can describe what the object means and who owns the truth;
- Shopping and Logistics have clear first implementations;
- Map, Calendar, Gallery, Food Delivery, Assets, and Reminders have reserved object types and ownership boundaries;
- old Chat product-card behavior no longer implies that every product is directly giftable.

## 15. Open Decisions

1. Should `gift_card` be considered received immediately after send, or only after the AI role accepts/redeems it?
2. Should physical-gift `tracking_share` produce relationship memory after delivery automatically, or only after user/AI acknowledgement?
3. Should `product_link` have a "wishlist / I want to buy this for you" intent variant, or stay neutral in V1?
4. Should Chat support a universal share picker, or should each source app own "share to Chat" first?

Recommended default decisions for V1:

- Gift cards count as offered when sent and received when accepted/redeemed.
- Tracking cards create no relationship memory until delivered or acknowledged.
- Product links stay neutral.
- Source apps own share creation first; Chat only renders and sends.
