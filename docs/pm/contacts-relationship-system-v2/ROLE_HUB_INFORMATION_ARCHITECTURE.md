# Contacts Role Hub Information Architecture / 通讯录角色中枢信息架构

Updated: 2026-05-19

This document defines the product-facing information architecture for `Contacts / 通讯录` as a role-centered hub.

## 1. Product Position

`Contacts / 通讯录` is no longer only a simple list of lightweight cards.

It should become the main user-facing place to:

- create role profiles;
- read role details;
- understand relationship continuity;
- inspect what is manual vs what came from events;
- run destructive actions safely.

## 2. Top-Level Screen Structure

### 2.1 List Page / 列表页

The list page should answer:

- who exists in my role archive?
- who has active relationship continuity?
- who has entered Chat and who has not?

Recommended summary fields:

- name
- visible role number
- role/identity label
- relationship snapshot summary
- memory/activity hint
- Chat-bound state

### 2.2 Detail Page / 详情页

Each role needs its own detail page.

Recommended section order:

1. overview
2. profile basics
3. preferences
4. life pattern
5. memories
6. social graph
7. linked activity summary
8. danger zone

## 3. Section Meaning

### 3.1 Overview / 概览

Shows:

- avatar
- name
- visible role ID
- role/identity label
- high-level relationship summary
- quick actions such as enter Chat or manage binding

### 3.2 Profile Basics / 人物简介

Shows:

- introduction / bio
- role/identity
- tags
- world/knowledge linkage if relevant

### 3.3 Preferences / 喜好

Can contain:

- food preferences
- gift preferences
- daily likes/dislikes
- soft rules and boundaries

### 3.4 Life Pattern / 生活规律

Can contain:

- active time windows
- common schedule habits
- recurring routines
- time-linked hints from events

### 3.5 Memories / 记忆

Shows:

- memory groups
- memory summaries
- source-module hints
- delete-memory entry

### 3.6 Social Graph / 人物关系网

Shows:

- user <-> role relation positioning
- role <-> role relation hints
- manually entered relationship notes
- event-derived social hints

### 3.7 Linked Activity Summary / 关联活动摘要

Optional supporting area for:

- recent Calendar links
- recent Phone links
- Wallet/Shopping/Food Delivery/Map continuity

This is a summary surface, not the owner of those records.

### 3.8 Danger Zone / 危险操作区

Must contain:

- reset relationship
- delete role
- readable explanation of scope

## 4. Visible Role ID Rule

`roleId` should be visible in the detail page in a phone-like readable style.

Recommended behavior:

- user can enter it manually on create/edit;
- duplicate role IDs must block save with a clear warning;
- show it like a role number or contact-style identifier, not like a backend primary key.

## 5. Manual vs Event-Attached Presentation

### 5.1 Why It Matters

The user must be able to tell:

- what they typed themselves;
- what the system attached from later events and memory development.

### 5.2 Required UI Treatment

Every detail item in Preferences, Life Pattern, and Social Graph should expose source kind:

- `Manual / 手动录入`
- `Event-attached / 事件挂载`

Recommended presentation:

- different badge/chip color
- short source hint
- destructive-action impact list calls out event-attached entries that will also be removed

Current landed baseline:

- role detail sections show manual and event-attached counts;
- source chips and short hints are visible on each item;
- event-attached entries tell the user they cannot be deleted directly from the detail item and must be cleared through the linked memory, relationship reset, or role deletion.

### 5.3 Product Rule

Event-attached entries can be auto-cleared by:

- relationship reset
- memory-group deletion
- role deletion

Manual entries should remain unless the destructive action explicitly removes the whole role profile.

## 6. Contacts vs Chat Directory Copy Rule

The product copy must help users understand:

- `Contacts / 通讯录` = role archive and role hub
- `Chat Directory / 会话通讯录` = chat-side target list

Required product meaning:

- a role may exist in Contacts without becoming a Chat target;
- deleting/unbinding in Chat Directory must not be confused with deleting the role archive in Contacts.

## 7. IA Acceptance Checklist

- users can understand the role without opening code-like panels
- users can see the difference between manual and event-attached items
- users can find memory review in the role detail page
- users can tell whether this role is already a Chat target
- dangerous actions are clearly separated from normal editing
