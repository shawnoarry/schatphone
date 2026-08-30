# Work Hub Organization Product Boundary

Updated: 2026-08-30

## Owner Truth

Work Hub is the canonical owner of work inside an organization. Its smallest authority chain is:

`world configuration authority -> organization -> membership -> role assignment -> issued work record -> explicit user decision -> durable receipt`

Every actionable record binds to one world, organization, positive revision, issuer, validity window, and revocation state. The active user membership additionally binds to one Contacts profile ID and revision.

## Collaboration

- Contacts owns stable identity and bounded matching projections.
- World Setting owns the active world and semantic revision.
- Work Hub owns organization authority and work decisions.
- Event Runtime owns schedule-change eligibility, deterministic policy/random gating, cooldown/cap accounting, one-time owner requests, deadlines, lifecycle, and audit for the approved event family.
- Calendar owns confirmed time.
- Agenda Journey, Map, and Activity Session consume explicitly saved Calendar truth under their own contracts and carry the accepted execution revision without taking Work Hub or Calendar ownership.
- AI may draft optional wording only. Code validates, persists, deduplicates, and determines reproducible state transitions.

For `organization.work_schedule_change.v1`, an organization-issued replacement proposal remains Work Hub truth. Accepting it creates a durable Work Hub receipt but does not alter Calendar. The old Calendar commitment remains unchanged until the user explicitly reviews and saves the replacement; Calendar then updates the same event ID and retains prior source lineage. Only the exact accepted authority/runtime/receipt/owner-fact/time/source chain can create a production execution proof. Agenda Journey materializes it, Map requires explicit departure and owns arrival, and Activity Session requires explicit start. A stale revision, notification, elapsed time, or model output cannot prove attendance or completion.

## Preview Separation

`schatphone:workplace-shell:preview-state` is a durable non-authoritative hint containing fictional S1 interactions. It can be opened only as an explicit demo and is excluded from production authority, migration, and complete backup.

## User Surface

The ordinary surface shows recognizable concepts: organization, role, notice, task, proposal, response, Calendar review, and saved status. Technical evidence remains behind the owner interface unless a dedicated diagnostics surface is later accepted.
