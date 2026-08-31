# Work Hub Organization Implementation Workstreams

Updated: 2026-08-31

## WH-1 Contract And Authority

- canonical world-neutral records;
- authority-package normalization and validation;
- issuer scope, revision, expiry, revocation, world/profile binding;
- deterministic fingerprints, record IDs, and receipts;
- stale, duplicate, and conflict rejection.

## WH-2 Persistence And Recovery

- independent Pinia Store and layered persistence carrier;
- snapshot-before-mutation rollback;
- complete backup section and legacy empty restore;
- persistence-owner inventory and governance coverage;
- no S1 preview migration.

## WH-3 Ordinary Work Loop

- production workspace/empty state;
- notices, tasks, schedule proposals, approvals, and status reports;
- accept, request adjustment, and decline receipts;
- no inferred completion.

## WH-4 Calendar Collaboration

- accepted schedule proposal resolves to one normalized handoff;
- Calendar review and explicit Save;
- source owner/record/revision dedupe;
- reload reconciliation and stable return context;
- Work Hub stores no duplicate Calendar event.

## WH-5 Validation

- pure contract and Store tests;
- migration, backup/restore, dedupe, conflict, expiry, revocation, and rollback tests;
- component tests for empty and active workspaces;
- desktop and simulated Pixel 5 E2E through Calendar Save and reload;
- full lint, test, build, governance, and diff checks.

## WH-6 Schedule Change Event

- world-neutral `organization.work_schedule_change.v1` template and built-in resolver;
- exact package/world/profile/proposal revision binding;
- policy-controlled deterministic random gate, cooldown, daily cap, and auditable no-event paths;
- Work Hub-native accept, adjustment-request, decline, expiration, stale, revocation, and write-failure outcomes;
- one owner request and owner-fact progression with rollback-safe Work Hub and Simulation persistence;
- Calendar replacement lineage that leaves the old commitment untouched until explicit Save and then updates the same Calendar event ID.

## WH-7 Execution Handoff And Proof

- exact production authority, Event Instance, owner fact, accepted receipt, Calendar time, current source revision, and prior-source lineage verification;
- Schedule Orchestrator V2 and Agenda Journey V2 stable identity, execution revision, review-required source changes, migration, backup, and rollback;
- one Notification Center deep link per Agenda execution revision;
- Map V5 explicit departure/arrival lineage and stale-revision rejection;
- Activity Session V3 explicit start/completion evidence with the same execution revision;
- manual and S1 preview schedules remain on the ordinary zero-proof path.

## WH-8 World Semantic Evidence

- normalize bounded `semanticConceptIds` on production membership and role records without changing the authority chain;
- expose concept evidence only after exact world/profile/revision/issuer/expiry/revocation validation succeeds;
- let the generic restricted-place resolver consume that read-only evidence while Map owns place/access/session truth and Event Runtime owns the occurrence and settlement;
- keep missing, stale, cross-world, and mismatched evidence fail-closed;
- never infer or upgrade production concept evidence from Contacts prose, preview fixtures, app labels, world genre, or model output.

## Deferred

Chronicle is complete under its separate owner. SMS, Wallet/relationship/public consequences, inferred attendance/completion, Mini Scene/CG, W3 switching, closed-page autonomy, and any broader semantic authority automation remain separately gated.
