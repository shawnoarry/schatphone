# Event Runtime Product Boundary / 事件运行时语义边界

Updated: 2026-06-01

## 1. Core Rule

The runtime lane is a coordination layer, not a replacement for module-owned records.

## 2. Ownership Split

### Event Runtime / 事件运行时

Owns:

- event logs
- cooldowns
- caps
- trigger policy
- adapter orchestration
- generated social-event eligibility/review/audit for role-initiated greetings, refusal, block, restore, and unblock proposals

Does not own:

- module-native records such as orders, routes, reminders, or role profiles
- applied Chat channel state after a social event is confirmed

### Relationship Runtime / 关系运行时

Owns:

- relationship metrics
- stages
- milestones
- growth traits
- memory groups
- primary-led memory recall summaries consumed by Chat, Contacts, and World Hub
- relationship fact gate audit metadata derived from saved profile classification fields
- reusable named high-risk gate presets for future event packs
- confirmed relationship facts or memories that result after an applied social event, while Chat still owns the channel state

### World Hub / 世界中枢

Owns:

- optional runtime review
- narrow override/review actions
- future GM-like control entry
- filtered event-log and relationship-fact review details
- read-only relationship classification gate audit review

Does not own:

- normal role/data entry
- daily reminders
- role profile editing
- relationship premise/classification editing
- broad value, funds, unlock, or freeform override editing in the current baseline

Current high-risk gate presets are contracts only. They do not trigger events, mutate module records, or turn World Hub into an editor.

Friend/block/refusal social events use the same boundary: event runtime records and reviews generated proposals; World Hub approves or dismisses high-risk proposals; Chat applies confirmed channel state; Contacts displays snapshots; relationship runtime records confirmed relationship continuity only after the event is accepted.

World Pack nonstandard-app template extraction is outside runtime ownership in the current baseline. Its WorldBook Current World Pack UI can propose and confirm reviewed appBindings only; it must not create event rules, mutate module records, or turn World Hub into the editing surface.

### Cheats / 金手指

Owns later:

- stronger override lane than World Hub
- debug correction and high-power controls when explicitly unlocked

Does not own yet:

- stable route
- default Home visibility
- mandatory user workflow
