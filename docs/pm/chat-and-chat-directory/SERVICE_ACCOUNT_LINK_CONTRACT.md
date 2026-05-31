# Chat Service Account Link Contract

Updated: 2026-05-31

This is the Chat-side contract for service/official accounts, including World Pack generated subscription channels.

## 1. Account Creation

Chat Directory owns the created Chat account. A caller may create or reuse a generated service/official account through `chatStore.createWorldServiceTemplateContact(payload)`.

Required origin fields for generated accounts:

- `worldPackId`
- `worldServiceTemplateId`

Optional origin field:

- `worldAppBindingId`

Generated accounts must be `kind: "service"` or `kind: "official"`. Chat clears role-profile ownership fields on this path: the account is not a Contacts role, not a Main Role, and not current relationship truth.

After creation, callers can inspect `chatStore.getServiceAccountLinkContract(contactId)`. The contract returns:

- thread and Services routes;
- origin ids;
- source bindings such as `shoppingServiceKey`, `logisticsServiceKey`, and `foodDeliveryServiceKey`;
- `sourceNotificationPlan`, a descriptive plan for supported source-module event streams;
- Chat capabilities: receive notifications, reply in Chat, quote service notifications, retain history, own unread state, mute/fold;
- source boundary: source modules own business records and Chat stores source references only.

## 2. Source Notification Plan

`sourceNotificationPlan` is derived from the account's source bindings. It is not an executor and it does not create a subscription by itself.

Supported V1 rows:

- `shoppingServiceKey` -> Shopping order updates (`shopping_order_update`);
- `logisticsServiceKey` -> Shopping logistics tracking (`shopping_logistics_tracking`);
- `foodDeliveryServiceKey` -> Food Delivery order/event pushes (`food_delivery_chat_push`).

Each row carries:

- `sourceModule`;
- `serviceBindingKey`;
- `serviceKey`;
- `notificationKinds`;
- `schedule.mode: "event_driven"`;
- `schedule.owner: "source_module"`;
- `schedule.autoCreatesSubscription: false`;
- `schedule.autoCreatesSourceRecords: false`.

Template candidates may show `available_after_join`. Joined Chat service accounts expose `ready`. If no supported source binding exists, the status is `not_connected`.

## 3. Notification Message Contract

Source modules push Chat messages through `chatStore.appendServiceNotification(contactId, notification)`.

The notification block type is always `service_notification`.

Required fields:

- `sourceModule`
- `sourceId`
- `title`

Optional fields:

- `kind`
- `summary`
- `statusLabel`
- `amount`
- `sourceEventId`
- `serviceKey`
- `serviceLabel`
- `route`
- `actions`

Dedupe key:

- `contactId`
- `sourceModule`
- `sourceId`
- `sourceEventId`

If `sourceEventId` is omitted, Chat dedupes by contact, source module, and source id.

## 4. Interaction Semantics

Service and official threads are normal Chat threads:

- users can reply in Chat;
- users can quote service notification cards;
- notification history remains visible;
- Chat unread, mute, and fold state is Chat-owned;
- source actions open the owning module route.

Replies stay in Chat. They do not update, cancel, refund, deliver, confirm, or mutate source-module business records.

## 5. Do Not Do

- Do not make WorldBook directly own or edit Chat Directory accounts.
- Do not copy full source-module business records into Chat messages.
- Do not make a service/official account a role profile or Contacts archive record.
- Do not make Chat replies mutate source records.
- Do not make service/official messages read-only subscription posts; they remain replyable Chat messages.
