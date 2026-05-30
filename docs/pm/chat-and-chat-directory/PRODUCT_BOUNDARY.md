# Chat And Chat Directory Product Boundary

Updated: 2026-05-30

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
- rich message display
- AI reply trigger and prompt assembly
- the user-facing Chat App shell for message entry and thread-level controls

Chat does not own:

- the global role archive
- destructive role deletion
- current relationship truth

### Chat Directory

Chat Directory owns:

- who can enter Chat
- service-account create/edit/delete
- role binding and unbinding for Chat
- group-chat target creation, member selection, and reply-mode metadata

Chat Directory does not own:

- the global role archive
- destructive role-level relationship actions
- the authoritative source of current relationship progress

### Contacts

Contacts owns:

- the global role archive
- visible role ID
- role-centered destructive actions

## 3. Service Accounts

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

World Pack service-account templates may create Chat Directory entries only after user confirmation. Those generated entries may store origin metadata such as `worldPackId`, `worldServiceTemplateId`, and `worldAppBindingId`, but the generated entry is still owned by Chat Directory and must not become a role profile or source-module record owner.

## 4. Group Chats

Group chats are Chat-native conversation targets composed of existing Chat role contacts.

They may store:

- display name;
- Chat-side member contact ids;
- a reply-mode preference such as natural, mention-gated, round-robin, or manual.

They must not create, delete, or rewrite global Contacts role profiles. A future multi-speaker runtime may use group metadata to decide who speaks, but relationship truth and role ownership remain outside the group target itself.

## 5. Product Boundaries To Protect

1. deleting or unbinding in Chat Directory must not be confused with deleting the global role archive
2. ordinary message deletion belongs in Chat
3. role relationship reset/delete belongs in Contacts or approved cleanup flows, not in Chat Directory
4. Chat-side compatibility fields must not replace relationship runtime as the truth layer
5. group membership must not become a hidden duplicate role archive
