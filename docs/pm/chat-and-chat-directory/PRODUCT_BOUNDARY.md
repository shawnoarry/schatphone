# Chat And Chat Directory Product Boundary

Updated: 2026-06-01

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
- message recall as a retained Chat event that hides original text and rich-block details from UI actions, AI context, quote previews, pending quote bars, and history review while preserving who recalled it
- rich message display
- Chat-local saved-message flags for ordinary role/group threads
- AI reply trigger and prompt assembly
- the user-facing Chat App shell for message entry and thread-level controls
- Chat Settings as the Chat-local behavior, appearance-entry, and diagnostics surface
- Chat Me as the Chat-local user identity, anonymity, and recent social-presence surface
- confirmed Chat social/channel state once the social shell lands, such as whether a role can message, is pending friend confirmation, is blocked by the user, or has blocked the user

Chat does not own:

- the global role archive
- destructive role deletion
- current relationship truth
- system-wide theme management or global custom CSS
- event eligibility for generated social events

### Chat Directory

Chat Directory owns:

- who can enter Chat
- service-account create/edit/delete
- role binding and unbinding for Chat
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

World Pack service-account templates should surface as availability from WorldBook and be joined from Chat Directory's `Services` management area. WorldBook must not become the service-account editor or creator. Chat Directory may let the user edit/reset active-pack service-account candidate metadata before joining, and may review AI/pasted service-candidate proposals from active WorldBook/World Pack context. Confirming a proposal only writes a World Pack template; it does not subscribe the user, create source-module business records, or silently rewrite already joined Chat accounts. Generated entries may store origin metadata such as `worldPackId`, `worldServiceTemplateId`, and `worldAppBindingId`, and may display a source notification plan for supported source bindings, but the generated entry is still owned by Chat Directory and must not become a role profile or source-module record owner.

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

When `relationshipLevel` or `relationshipNote` appears in Chat Directory UI, label it as Chat-local tuning/note. Do not use "Affinity" or other copy that implies current relationship progress.
