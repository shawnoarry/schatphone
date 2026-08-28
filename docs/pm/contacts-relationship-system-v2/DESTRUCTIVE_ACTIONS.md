# Contacts Destructive Actions / 通讯录破坏性操作定义

Updated: 2026-08-28

This document freezes the user-facing meaning of Contacts lifecycle and destructive actions:

1. archive or restore a person
2. permanently delete a role profile
3. reset relationship
4. delete one memory group

`CONTACTS_V3_4_ROLE_LIFECYCLE_DECISION_FREEZE.md` is the focused authority for archive/restore/tombstone behavior. V3-4A implements internal archive/restore persistence and archived-consumer suspension; V3-4B implements the internal archive-first permanent-delete coordinator, tombstone commit, Wallet revocation/history unlinking, registered cleanup, and rollback. No lifecycle UI is exposed yet, and the existing direct-delete UI remains legacy behavior until V3-4C replaces the complete path.

## 1. Shared Product Rule

Destructive actions must be:

- explicit;
- readable;
- multi-step confirmed;
- clear about what will also be removed;
- clear about what the user must delete manually elsewhere.

## 2. Archive Or Restore Person / 归档或恢复人物

### 2.1 User Goal

The user wants to temporarily put a person away without losing who they are or what happened with them.

### 2.2 Archive Must Keep

- the same profile and visible role IDs
- the complete profile card and person extensions
- Chat binding, conversation, and messages
- relationship progress, facts, memories, and review state
- source lineage and immutable owner history
- receiving-account identity and learned Wallet reference

### 2.3 Archive Must Pause

- new Chat generation and new Chat binding
- new event eligibility and relationship effects
- Work Hub/public projections and matching
- new payee disclosure or transfer to the archived person

### 2.4 Restore

Restore reactivates the same archived record after a successful persisted revision. It does not create a new person, merge by name, or grant organization authority.

## 3. Permanently Delete Role Profile / 永久删除角色档案

### 3.1 User Goal

The user wants this role to disappear from the current virtual-phone world.

### 3.2 Main Entry

Target flow: `Contacts / 通讯录 -> Archived people / 已归档人物 -> person detail -> Permanently delete / 永久删除`

The target V3.4 flow requires archive first. Ordinary Self Profile deletion is excluded.

### 3.3 One Flow With Optional Scope

This is one delete flow with a scope option.

The flow must allow:

- base delete
- optional checkbox to also remove linked cross-module records

### 3.4 Base Delete Must Remove

- Contacts role profile
- Chat Directory role binding
- role chat history
- relationship progress
- memory groups
- event-attached role-detail entries derived from relationship development
- Wallet payee references disclosed from the deleted role profile
- the live receiving-account definition

It must also create a minimal tombstone that reserves the old profile and role IDs without retaining private profile bodies.

### 3.5 Optional Cross-Module Cleanup

If the user checks the linked-record cleanup option, also remove directly linked structured records from source modules, such as:

- Calendar confirmed events
- Phone call logs
- non-immutable Wallet relationship links, never confirmed transactions or receipts
- Shopping linked orders
- Food Delivery linked orders
- Map linked route/trip records

### 3.6 Retained History And Visual Assets

Visual assets are not force-deleted here.

Required behavior:

- unlink role-bound assets first;
- tell the user that photo/visual assets can be removed manually in `Photos / 相册` if they do not want to keep them.

Immutable transactions, receipts, orders, Calendar history, event audit, and other owner records are not reassigned or silently rewritten. They keep their owner snapshot or show a neutral deleted-person reference.

### 3.7 Confirmation Rule

This action is irreversible and must use multiple confirmations.

Recommended sequence:

1. readable impact summary dialog
2. scope confirmation dialog
3. typed confirmation using the visible role ID
4. explicit notice that ordinary restore is impossible after permanent deletion

## 4. Reset Relationship / 重置关系

### 4.1 User Goal

The user wants to keep this character but restart the route from zero.

### 4.2 Main Entry

`Contacts / 通讯录 -> role detail -> danger zone -> Reset relationship / 重置关系`

### 4.3 Must Keep

- role profile
- visible role ID
- manually entered static role information
- manual preferences/life-pattern/social-graph entries
- role-bound visual assets
- stable role receiving-account definitions and Wallet's disclosed reference to them

### 4.4 Must Remove

- relationship progress
- memory groups
- linked relationship facts
- event-attached role-detail entries derived from those memories/events
- role chat history
- linked structured relationship-development records when the reset flow says they are part of current route continuity

### 4.5 Product Result

After reset:

- the person still exists;
- the route progress is cleared;
- future chat should behave like a fresh route;
- users should still see their manually built role archive fields.

## 5. Delete One Memory Group / 删除单条记忆组

### 5.1 User Goal

The user wants to keep the role and most of the history, but remove one specific event.

### 5.2 Main Entry

`Contacts / 通讯录 -> role detail -> Memories / 记忆 -> memory detail -> Delete memory / 删除记忆`

### 5.3 Delete Unit

The delete unit is one full memory group:

- one primary memory meaning
- supporting facts under that memory
- directly linked structured source records

It is not only one summary line.

### 5.4 Chat Boundary

Deleting a memory group does not automatically delete ordinary free-text chat messages.

The UI must explicitly tell the user:

- structured memory and linked records will be removed here;
- if they also want to remove ordinary conversation text, they should do it manually in `Chat / 聊天`.

### 5.5 Must Also Remove

- the memory from Contacts detail
- matching relationship facts in runtime
- the relationship impact contributed by that memory
- event-attached role-detail entries derived from that memory
- directly linked source records in owning modules

### 5.6 Required Impact Summary

Before delete, show a readable impact list, for example:

- this will also remove:
  - 1 Calendar event
  - 1 Wallet ledger item
  - 1 Shopping gift record
  - 2 event-attached life-pattern hints

## 6. Manual Entry vs Event-Attached Entry Rule

When a destructive action removes event-attached entries, the UI must clearly distinguish:

- manual entries the user typed themselves
- event-attached entries derived from memories/events

The user must be able to understand why some detail items are also being removed.

## 7. Product Acceptance Checklist

### Archive And Restore

- archive removes the person from active use without deleting profile, Chat, relationship, memory, source, or account continuity
- archived people are reviewable in one explicit archived-people surface
- new Chat, projection, event, matching, and payee actions stay paused until restore
- restore returns the same person and IDs after successful persistence

### Permanently Delete Role

- the role no longer appears in Contacts
- the role no longer appears in Chat Directory
- role chat history is gone
- relationship runtime no longer shows that target
- asset unlink note is shown
- the old profile and role IDs remain reserved by a minimal tombstone
- learned payee access is revoked while immutable receipts and owner history remain reviewable

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
