# Chat And Chat Directory Product Boundary

Updated: 2026-05-19

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

Chat does not own:

- the global role archive
- destructive role deletion
- current relationship truth

### Chat Directory

Chat Directory owns:

- who can enter Chat
- service-account create/edit/delete
- role binding and unbinding for Chat

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

## 4. Product Boundaries To Protect

1. deleting or unbinding in Chat Directory must not be confused with deleting the global role archive
2. ordinary message deletion belongs in Chat
3. role relationship reset/delete belongs in Contacts or approved cleanup flows, not in Chat Directory
4. Chat-side compatibility fields must not replace relationship runtime as the truth layer
