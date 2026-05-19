# Contacts Relationship System V2 Requirements

Updated: 2026-05-19

This file is the compatibility entry for the frozen Contacts/relationship requirement set.

The original long-form requirement has been split into a focused document pack so future engineers, PM readers, and AI assistants can find the right rule faster.

## 1. Current Requirement Package

Read this package in order:

1. [Contacts Relationship System V2 Pack](./contacts-relationship-system-v2/README.md)
2. [Product Boundary](./contacts-relationship-system-v2/PRODUCT_BOUNDARY.md)
3. [Destructive Actions](./contacts-relationship-system-v2/DESTRUCTIVE_ACTIONS.md)
4. [Role Hub Information Architecture](./contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md)
5. [Implementation Workstreams](./contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md)

## 2. What This Frozen Requirement Covers

This requirement pack freezes the product meaning for:

- Contacts vs Chat Directory boundary
- visible role ID rules
- role deletion flow
- relationship reset flow
- single memory-group deletion
- Contacts as the role-centered hub
- manual entry vs event-attached entry presentation

## 3. Core Product Meaning

- `Contacts / 通讯录` should be the global role archive and role-centered management hub.
- `Chat Directory / 会话通讯录` should remain the Chat-side binding surface.
- `Chat / 聊天` should remain the owner of ordinary message history and manual chat deletion.
- `Relationship Runtime / 关系运行时` should remain the owner of relationship progress and memory groups.
- `World Hub / 世界中枢` should remain an optional review/control surface, not the main role-authoring surface.

## 4. Semantic Guardrails

Future implementation must not:

1. treat `profileId` or `entityKey` as user-facing `roleId`;
2. treat Chat-side `relationshipLevel` and `relationshipNote` as the main relationship-truth layer unless a new product decision explicitly changes that;
3. confuse memory deletion with ordinary chat deletion;
4. make event-attached detail items indistinguishable from manual entries.

## 5. Companion References

- [Implementation Workstreams](./contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md)
- [AI Work Mode](../process/AI_WORK_MODE.md)
- [Project Master Guide](../overview/PROJECT_MASTER_GUIDE.md)
- [Module Name Glossary](./MODULE_NAME_GLOSSARY.md)
