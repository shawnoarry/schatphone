# Chat And Chat Directory Product Boundary

Updated: 2026-08-28

This file defines the ownership boundary between Chat, Chat Directory, and Contacts.

## 1. Core Rule

`Chat`, `Chat Directory`, and `Contacts` are three different product surfaces.

They must not collapse back into one mixed "contact/chat/relationship" bucket.

## 2. Module Meaning

### Chat

Chat owns:

- conversations
- messages
- thread preferences
- message deletion
- the explicit `让 TA 记住 / Remember for them` action on one user-authored message in one role thread, including its conversation/message source reference
- a disabled-by-default `disclosureCandidates` parser for an explicit role-memory review checkpoint; it may return only a temporary, role-bound, exact-user-message candidate and must not persist or decide Relationship Runtime truth
- message recall as a retained Chat event that hides original text and rich-block details from UI actions, AI context, quote previews, pending quote bars, and history review while preserving who recalled it
- rich message display
- internal source-App object sharing with recipient selection, one bounded device-local pending draft, explicit `share_card` send, cancel-to-source, refresh/lock recovery, and exact source-detail return
- source-owned share-card display and transport, including Shopping `product_link`, `gift_card` / `virtual_gift`, Wallet `wallet_receipt_share`, and future tracking/location/calendar/media share objects
- legacy product-card compatibility display while the active Shopping send path migrates to `share_card`
- Chat-local saved-message flags for ordinary role/group threads
- AI reply trigger and prompt assembly
- approximate, non-persisted next-request text-token visibility derived from the same prompt/context projection, without owning provider billing or introducing content limits
- bounded consumption of Relationship Runtime's owner projection: one current relationship, relevant role-memory summaries, and active shared-experience summaries only; Chat does not receive raw supporting rows or source-audit metadata in its prompt
- the user-facing Chat App shell for message entry and thread-level controls
- Chat Settings as the Chat-local behavior, appearance-entry, and diagnostics surface
- Chat Settings as the entry surface for shared TTS provider configuration and temporary preview, without taking ownership of TTS transport, credentials, or audio truth
- Chat Appearance presentation settings for the shared Chat-owned route shell, message layout, independent avatar visibility, bubble treatments, content-fit sizing for ordinary text, and the iMessage-like thread-header identity presentation
- Chat Appearance custom CSS file import with a complete 20,000-character supported limit; oversized files are rejected visibly and never stored as partial CSS
- Chat Me as the Chat-local user identity, anonymity, and recent social-presence surface
- confirmed Chat social/channel state once the social shell lands, such as whether a role can message, is pending friend confirmation, is blocked by the user, or has blocked the user
- the idempotent role-binding and conversation-creation seam used by Chat Directory or an explicit Contacts `Start Chat` action

Chat does not own:

- the global role archive
- destructive role deletion
- current relationship truth
- Relationship Runtime memory aggregation, review state, metrics, or stage changes; Chat may call the shared disclosure Owner Adapter but does not write runtime state directly
- accepting an AI disclosure candidate as durable memory; the parser is a validation seam, not a memory store or review decision
- system-wide theme management or global custom CSS
- event eligibility for generated social events
- Shopping checkout, order truth, Wallet suggestions, or Assets transfer suggestions
- product, voucher, delivery, route, calendar, media, or asset source truth represented by a `share_card`
- ownership of the external webpage represented by a shared URL, or permission to send an incoming share without user confirmation
- shared Mini Scene world-profile resolution, Book regex execution, artifact truth, or HTML Presenter security
- TTS provider protocols, API keys, raw responses, temporary preview audio, or a durable voice-message media contract

### Mini Scene Compatibility

The current Chat `mini_scene` rich block is a Chat-owned historical message shape. Its `htmlSnippet` is displayed as inert code and must remain non-executable.

A future Chat Mini Scene Adapter may submit canonical thread/message/role facts to the shared Mini Scene Module after the user's Chat popup mode allows it. The shared Module owns the artifact, transform, presenter, fallback, and interaction audit. Chat may retain an artifact reference and compact display snapshot in message history, but any requested Chat action returns to Chat validation and normal event-review rules.

### Chat Directory

Chat Directory owns:

- service-account create/edit/delete
- bound-target review, unbinding, and Chat-local binding metadata
- group-chat target creation, member selection, and reply-mode metadata
- Chat-local binding annotations such as legacy `relationshipLevel` / `relationshipNote`, when clearly labeled as Chat tuning/note only

Chat Directory does not own:

- the global role archive
- destructive role-level relationship actions
- the authoritative source of current relationship progress

### Contacts

Contacts owns:

- the global role archive
- visible role ID
- role-centered destructive actions
- an explicit `Start Chat` entry for an eligible Main Role or NPC that delegates binding and conversation creation to Chat without copying those rules

## 3. Social Events

Role-initiated friend requests, user blocks, and being-blocked outcomes are communication-state events, not relationship-truth fields.

Safe ownership:

- Chat / Chat Directory owns the applied channel state after the event is confirmed or directly user-authored.
- Contacts may show a role-level social-channel snapshot so the user can understand the role's current reachability.
- Event runtime owns generated event eligibility, review, audit logs, and pending confirmation for high-risk social changes.
- Relationship runtime may receive a confirmed fact or memory after the social event is applied, but it remains the owner of current relationship metrics and memories.

Current V1 generated social-event seam is landed. User-authored Chat actions still happen inside Chat / Chat Directory. AI-generated or runtime-generated role social changes enter Event Runtime first: low-risk role greetings may auto-apply as audited message requests, while role-initiated refusal, block, restore, and unblock proposals wait for World Hub review before Chat applies the communication state.

## 4. Service Accounts

Service accounts are Chat-native communication identities such as:

- store/service push accounts
- logistics accounts
- delivery dispatch accounts

They are not role profiles unless explicitly designed as such.

Service-account messages may store:

- display copy;
- status or amount snapshots;
- source module, source record id, and optional source event id;
- route actions back to the owning module.

Service-account messages must not store the authoritative order, logistics, Wallet, route, or fulfillment state. The owning module remains responsible for business records.

Chat-side service notification feedback, such as source-open reminders, reply-ready state, sent-reply confirmation, read-state cleanup, and Services return-state recovery, may clarify what happened in Chat but must not be treated as a mutation of the owning source module.

Chat-side presentation may digest or compact repeated service notifications to make the thread readable, but every notification remains a message record with source-open and reply affordances. Compacting a card must not merge, delete, or mutate the owning source-module record.

Chat may expose a service-account linkage contract to other modules. This contract can describe the Chat thread route, Services route, origin ids, source bindings, derived source notification plan, required notification fields, reply/quote support, and source-record boundary. The contract is descriptive and does not give other modules ownership of Chat history or give Chat ownership of source records.

## 4.5 Share Cards

`share_card` is the peer-to-peer version of a source-owned object shared into Chat. It is not the same as a service-account notification.

Chat may store:

- `shareType`, such as `product_link`, `gift_card`, `virtual_gift`, `tracking_share`, `payee_account`, or `wallet_receipt_share`;
- `sourceModule`, `sourceId`, and optional `sourceEventId`;
- title, summary, status, amount, preview image, and source route snapshots;
- `aiContext` that explains what the object means and which app owns the truth.

Chat must not treat a `product_link` as a purchased or delivered gift. User-sent gifts inside Chat should be source-created digital objects such as gift cards, vouchers, redemption codes, or virtual gifts. Physical goods should enter Chat as product links, order shares, or tracking/signature shares, while Shopping or Logistics owns purchase, fulfillment, and delivery state.

A `payee_account` card is a system-verified reference to a persisted role-profile account. Chat may store its masked display snapshot and Wallet route, but neither the user request nor the card is a completed transfer. AI output must never create or alter bank credentials, and only Wallet may validate the matching currency, deduct funds, persist the receipt, and submit the confirmed relationship fact.

A `wallet_receipt_share` card is a snapshot of an already completed Wallet receipt. Chat owns recipient selection, explicit send, message history, and the receiving-conversation `returnChatId`; Wallet owns the transaction, receipt, amount, and original source lineage. Sending, opening, quoting, or returning from this card must not move money or replace the transaction's original `sourceChatId`.

World Pack service-account templates should surface as availability from WorldBook and be joined from Chat Directory's `Services` management area. WorldBook must not become the service-account editor or creator. Chat Directory may let the user edit/reset enabled-pack service-account candidate metadata before joining, and may review AI/pasted service-candidate proposals from active WorldBook/World Pack context. Confirming a proposal only writes a World Pack template; it does not subscribe the user, create source-module business records, or silently rewrite already joined Chat accounts. Generated entries may store origin metadata such as `worldPackId`, `worldServiceTemplateId`, and `worldAppBindingId`, and may display a source notification plan for supported source bindings, but the generated entry is still owned by Chat Directory and must not become a role profile or source-module record owner.

Further service-account behavior and feed semantics that depend on World Pack app archetypes are intentionally deferred until the World Pack direction settles.

## 5. Group Chats

Group chats are Chat-native conversation targets composed of existing Chat role contacts.

They may store:

- display name;
- Chat-side member contact ids;
- a reply-mode preference such as natural, mention-gated, round-robin, or manual.

They must not create, delete, or rewrite global Contacts role profiles. A future multi-speaker runtime may use group metadata to decide who speaks, but relationship truth and role ownership remain outside the group target itself.

## 6. Product Boundaries To Protect

1. deleting or unbinding in Chat Directory must not be confused with deleting the global role archive
2. ordinary message deletion and recall belong in Chat, but deletion is trace-free removal while recall is a retained notice without original content
3. role relationship reset/delete belongs in Contacts or approved cleanup flows, not in Chat Directory
4. Chat-side compatibility fields must not replace relationship runtime as the truth layer
5. group membership must not become a hidden duplicate role archive
6. Chat Me must not become the primary place for appearance, diagnostics, or default conversation settings
7. Chat Settings must not duplicate the Chat Me identity/social surface
8. social-channel state must not become relationship runtime truth or event eligibility by itself
9. legacy `htmlSnippet` or new generated HTML must not execute inside Chat, and Chat must not copy the shared Mini Scene regex/profile/presenter implementation
10. AI dialogue, a transfer request, or a `payee_account` card must not create Wallet ledger records or claim money moved
11. Chat Appearance controls presentation only; any iMessage-like header note/status is Chat-local display context and must not be treated as current relationship truth
12. an internal App share must not auto-send or become Chat history before the user selects a conversation and confirms; cancel returns to the source, and opening a sent card must not mutate source-owned state
13. an AI `disclosureCandidates` payload must not choose a role/profile, memory key, relationship metric, or persistence result, and must not bypass an explicit review policy

When `relationshipLevel` or `relationshipNote` appears in Chat Directory UI, label it as Chat-local tuning/note. Do not use "Affinity" or other copy that implies current relationship progress.
