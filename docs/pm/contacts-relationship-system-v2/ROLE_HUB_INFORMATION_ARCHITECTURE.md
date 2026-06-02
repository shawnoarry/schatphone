# Contacts Role Hub Information Architecture / 通讯录角色中枢信息架构

Updated: 2026-06-02

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
2. role hub summary
3. relationship snapshot
4. linked activity summary
5. profile basics and WorldBook fields
6. preferences
7. life pattern
8. social graph
9. memories
10. danger zone

## 3. Section Meaning

### 3.0 Current Landed IA Baseline

The selected Contacts detail page now starts with a Role Hub summary before deeper sections.

The landed baseline shows:

- profile entity type: Self Profile, Main Role, or NPC;
- Chat-bound state without implying Chat Directory owns the role;
- manual detail count;
- event-attached detail count;
- WorldBook profile field count;
- memory-group count;
- a linked-activity summary built from relationship runtime source counts plus event-attached detail sources.

Bound roles can jump to their Chat thread. Unbound Main Role/NPC profiles can jump to Chat Directory for binding. Self Profile explains that it is context-only and not a Chat target.

The linked-activity summary is only a summary surface. Source records still belong to their owning modules.

Below the summary, preferences, life pattern, and social graph sections now split their entries into Manual details and Event-attached groups. Event-attached entries remain locked from direct deletion and can open the linked memory detail when a `memoryKey` is present. Manual entries can now be edited inline in place. Inside the memory detail itself, Contacts now shows a source-audit layer with per-module source cards, cleanup coverage hints, source record IDs, a short supporting-event list, and lightweight review facts. The memory list itself now supports basic source filtering and sort mode.

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
- source/sort review controls
- source-module hints
- source-audit cards for module ownership and cleanup coverage
- supporting relationship-event drill-down
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

Current landed baseline:

- the summary card still provides top-level counts and source text;
- an expanded event-attached activity list now appears below it;
- each linked-activity row shows section label, source module, source record ID, a short summary, and a direct entry into the linked memory when available.

### 3.8 Danger Zone / 危险操作区

Must contain:

- reset relationship
- delete role
- readable explanation of scope

## 4. Profile Entity Types

### 4.1 Self Profile / User Self Profile

Self Profile represents the user inside a world. It can appear in Contacts and can feed Chat context through visibility-gated profile values, but it is not an AI role, not a romance/route target, and must not be bound as a Chat target.

### 4.2 Main Role

Main Role is a full person/role profile. It can be bound into Chat Directory when the user wants a conversation target, and it can use relationship progress, memory groups, and route-style continuity.

### 4.3 NPC / World Role

NPC is a lightweight world-person record. NPCs can appear in world events, social/feed contexts, linked activity, and Chat Directory. They are not broken Main Roles. Upgrading an NPC to Main Role preserves the profile, existing Chat binding, and history while unlocking Main Role capabilities.

## 5. WorldBook-Driven Extensible Sections

WorldBook defines profile-template fields. Contacts stores concrete values for each Self Profile, Main Role, or NPC.

V1 rules:

- a profile has one primary world/template context;
- template changes do not silently overwrite user-entered profile values;
- Contacts can show template-applied values as extensible profile fields;
- Contacts role detail can now edit V1 concrete profile values inline: choose a current-world template, fill values, set visibility, and save into `templateLink/profileValues`;
- saving values should only replace fields covered by the selected template and preserve older/custom out-of-template values unless a later explicit cleanup flow is added;
- manual profile values remain higher priority than event-attached clues.

## 6. Visible Role ID Rule

`roleId` should be visible in the detail page in a phone-like readable style.

Recommended behavior:

- user can enter it manually on create/edit;
- duplicate role IDs must block save with a clear warning;
- show it like a role number or contact-style identifier, not like a backend primary key.

## 7. Manual vs Event-Attached Presentation

### 7.1 Why It Matters

The user must be able to tell:

- what they typed themselves;
- what the system attached from later events and memory development.

### 7.2 Required UI Treatment

Every detail item in Preferences, Life Pattern, and Social Graph should expose source kind:

- `Manual / 手动录入`
- `Event-attached / 事件挂载`

Recommended presentation:

- different badge/chip color
- short source hint
- destructive-action impact list calls out event-attached entries that will also be removed

Current landed baseline:

- role detail sections show manual and event-attached counts;
- detail sections group manual and event-attached items separately;
- source chips and short hints are visible on each item;
- event-attached entries tell the user they cannot be deleted directly from the detail item and must be cleared through the linked memory, relationship reset, or role deletion;
- event-attached entries with a memory key expose an entry point to the linked memory detail.

### 7.3 Product Rule

Event-attached entries can be auto-cleared by:

- relationship reset
- memory-group deletion
- role deletion

Manual entries should remain unless the destructive action explicitly removes the whole role profile.

## 8. Contacts vs Chat Directory Copy Rule

The product copy must help users understand:

- `Contacts / 通讯录` = role archive and role hub
- `Chat Directory / 会话通讯录` = chat-side target list

Required product meaning:

- a role may exist in Contacts without becoming a Chat target;
- Chat Directory is a chat target list, not a Main Role filter;
- NPCs may be bound as Chat targets before upgrade;
- Self Profile must not be bound as a Chat target;
- deleting/unbinding in Chat Directory must not be confused with deleting the role archive in Contacts.

## 9. IA Acceptance Checklist

- users can understand the role without opening code-like panels
- users can see the difference between manual and event-attached items
- users can find memory review in the role detail page
- users can tell whether this role is already a Chat target
- dangerous actions are clearly separated from normal editing
