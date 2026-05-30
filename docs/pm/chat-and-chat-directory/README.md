# Chat And Chat Directory Package

Updated: 2026-05-30

Use this package for Chat thread behavior, Chat Directory, service accounts, role binding into Chat, and message-surface work.

Current 4.4 note: Shopping, Logistics, and Food Delivery can now push reusable Chat service-notification messages with source references and route actions. Chat owns the message history; the source modules keep the business records.

Current WorldBook note: Chat prompt assembly and the thread WorldBook summary now consume the same `world-interface` result, so the user-visible active knowledge state matches the world context sent to AI.

Current World Pack note: active World Pack service-account templates can now be generated into Chat Directory after user confirmation. Chat Directory owns the generated service/official account; World Pack only records the template origin.

Current Chat App shell note: Chat now presents a messaging-app style product shell with first-level tabs for `Messages`, `Objects`, `Groups`, `Services`, and `More`. Messages stays the immersive conversation home; object binding, group management, and service accounts have their own first-level tabs. `More` is the Chat identity/anonymity and diagnostics page, not a bulk-control or shortcut hub.

Current group-chat note: group chats are first-class Chat targets backed by Chat-side role member ids and a group reply mode. V1 stores and surfaces the group target cleanly; deeper multi-speaker orchestration remains a future behavior layer.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `IMPLEMENTATION_WORKSTREAMS.md`

Also read when needed:

- `docs/architecture/ROLE_BINDING_CONTRACT.md`
- `docs/pm/contacts-relationship-system-v2/README.md`
