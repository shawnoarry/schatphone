# Contacts Destructive Actions / 通讯录破坏性操作定义

Updated: 2026-05-19

This document freezes the user-facing meaning of the three destructive actions in Contacts:

1. delete role profile
2. reset relationship
3. delete one memory group

## 1. Shared Product Rule

Destructive actions must be:

- explicit;
- readable;
- multi-step confirmed;
- clear about what will also be removed;
- clear about what the user must delete manually elsewhere.

## 2. Delete Role Profile / 删除角色档案

### 2.1 User Goal

The user wants this role to disappear from the current virtual-phone world.

### 2.2 Main Entry

`Contacts / 通讯录 -> role detail -> danger zone -> Delete role / 删除角色`

### 2.3 One Flow With Optional Scope

This is one delete flow with a scope option.

The flow must allow:

- base delete
- optional checkbox to also remove linked cross-module records

### 2.4 Base Delete Must Remove

- Contacts role profile
- Chat Directory role binding
- role chat history
- relationship progress
- memory groups
- event-attached role-detail entries derived from relationship development

### 2.5 Optional Cross-Module Cleanup

If the user checks the linked-record cleanup option, also remove directly linked structured records from source modules, such as:

- Calendar confirmed events
- Phone call logs
- Wallet linked records
- Shopping linked orders
- Food Delivery linked orders
- Map linked route/trip records

### 2.6 Visual Assets Rule

Visual assets are not force-deleted here.

Required behavior:

- unlink role-bound assets first;
- tell the user that photo/visual assets can be removed manually in `Photos / 相册` if they do not want to keep them.

### 2.7 Confirmation Rule

This action is irreversible and must use multiple confirmations.

Recommended sequence:

1. readable impact summary dialog
2. scope confirmation dialog
3. typed confirmation using role name or required confirmation token

## 3. Reset Relationship / 重置关系

### 3.1 User Goal

The user wants to keep this character but restart the route from zero.

### 3.2 Main Entry

`Contacts / 通讯录 -> role detail -> danger zone -> Reset relationship / 重置关系`

### 3.3 Must Keep

- role profile
- visible role ID
- manually entered static role information
- manual preferences/life-pattern/social-graph entries
- role-bound visual assets

### 3.4 Must Remove

- relationship progress
- memory groups
- linked relationship facts
- event-attached role-detail entries derived from those memories/events
- role chat history
- linked structured relationship-development records when the reset flow says they are part of current route continuity

### 3.5 Product Result

After reset:

- the person still exists;
- the route progress is cleared;
- future chat should behave like a fresh route;
- users should still see their manually built role archive fields.

## 4. Delete One Memory Group / 删除单条记忆组

### 4.1 User Goal

The user wants to keep the role and most of the history, but remove one specific event.

### 4.2 Main Entry

`Contacts / 通讯录 -> role detail -> Memories / 记忆 -> memory detail -> Delete memory / 删除记忆`

### 4.3 Delete Unit

The delete unit is one full memory group:

- one primary memory meaning
- supporting facts under that memory
- directly linked structured source records

It is not only one summary line.

### 4.4 Chat Boundary

Deleting a memory group does not automatically delete ordinary free-text chat messages.

The UI must explicitly tell the user:

- structured memory and linked records will be removed here;
- if they also want to remove ordinary conversation text, they should do it manually in `Chat / 聊天`.

### 4.5 Must Also Remove

- the memory from Contacts detail
- matching relationship facts in runtime
- the relationship impact contributed by that memory
- event-attached role-detail entries derived from that memory
- directly linked source records in owning modules

### 4.6 Required Impact Summary

Before delete, show a readable impact list, for example:

- this will also remove:
  - 1 Calendar event
  - 1 Wallet ledger item
  - 1 Shopping gift record
  - 2 event-attached life-pattern hints

## 5. Manual Entry vs Event-Attached Entry Rule

When a destructive action removes event-attached entries, the UI must clearly distinguish:

- manual entries the user typed themselves
- event-attached entries derived from memories/events

The user must be able to understand why some detail items are also being removed.

## 6. Product Acceptance Checklist

### Delete Role

- the role no longer appears in Contacts
- the role no longer appears in Chat Directory
- role chat history is gone
- relationship runtime no longer shows that target
- asset unlink note is shown

### Reset Relationship

- the role still exists in Contacts
- route progress and memories are cleared
- event-attached role-detail items tied to the route are cleared
- chat history is cleared

### Delete One Memory Group

- the memory is gone from Contacts
- runtime no longer surfaces it
- linked structured records are removed
- ordinary chat text is not auto-deleted
