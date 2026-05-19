# Contacts Relationship System V2 Implementation Breakdown

Updated: 2026-05-19

This file is the compatibility entry for the Contacts/relationship implementation breakdown.

The previous long-form execution document has been split into a smaller workstream pack so engineers can read only the section that matches the current task.

## 1. Current Workstream Entry

Read in this order:

1. [Contacts Relationship System V2 Pack](./contacts-relationship-system-v2/README.md)
2. [Implementation Workstreams](./contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md)

Then open the matching product references as needed:

- [Product Boundary](./contacts-relationship-system-v2/PRODUCT_BOUNDARY.md)
- [Destructive Actions](./contacts-relationship-system-v2/DESTRUCTIVE_ACTIONS.md)
- [Role Hub Information Architecture](./contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md)

## 2. Current Engineering Workstreams

The package is organized into four stable workstreams:

1. data model and ownership
2. delete/reset/memory cleanup orchestration
3. Contacts detail IA and presentation
4. documentation and collaboration guardrails

## 3. Required Semantic Guardrails

Reviewers and implementers should stop and realign if any of these happens:

- Chat-side compatibility fields start acting like the main relationship-truth layer;
- internal runtime keys appear where product-facing role ID should appear;
- Contacts and Chat Directory start overlapping as destructive-management surfaces;
- memory deletion does not also remove directly linked runtime/source continuity.

## 4. Companion References

- [Frozen Requirement Entry](./CONTACTS_RELATIONSHIP_SYSTEM_V2_REQUIREMENTS.md)
- [AI Work Mode](../process/AI_WORK_MODE.md)
- [Project Master Guide](../overview/PROJECT_MASTER_GUIDE.md)
