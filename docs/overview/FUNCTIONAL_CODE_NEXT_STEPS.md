# Functional Code Next Steps

Updated: 2026-07-10

> **Frozen execution status / 非执行看板**
>
> This is a candidate reference, not an active TODO. Promote a selected slice into `docs/roadmap/TODO_ROADMAP.md` and the matching package handoff before implementation.

## 1. Current Verdict

Do not restart completed Contacts 4.1, memory 4.2, World Hub 4.3, or service-account 4.4 work.

The best next code work is:

1. security/toolchain hardening;
2. release-gate alignment;
3. one measured architecture seam;
4. World Pack phone-validation fixes;
5. one approved content-carrier migration.

## 2. Completed Enough To Stop Re-Listing

- Calendar / Reminders product split;
- Contacts V2 detail and cleanup baseline;
- relationship runtime and explicit-lineage memory dedupe;
- Calendar relationship review details;
- filtered World Hub event/relationship review;
- Chat generated social-event review V1;
- Shopping/logistics/Food Delivery service notifications;
- Book source library and WorldBook activation;
- compatible World Packs, App Store world entries, reviewed app/service proposals;
- Shopping/Food Delivery/Calendar/Map world-app context;
- global/scoped appearance ownership seams;
- Settings, Chat, Contacts, and WorldBook composable extraction batches already listed in architecture docs.

## 3. Candidate A: Backup Credential Policy

Problem:

Settings backup exports the full settings object, including `settings.api.key`.

Possible product choices:

1. exclude credentials by default and require re-entry after restore;
2. add an explicit “include credentials” option with strong warning;
3. introduce encrypted export only if key management is designed.

Recommended first implementation:

- exclude API credentials by default;
- preserve non-secret provider URL/model configuration;
- show a clear restore result saying credentials must be re-entered;
- add export/import/rollback tests.

Do not implement until the product choice is promoted because backup compatibility is user-visible.

## 4. Candidate B: Toolchain And CI Hardening

Current evidence:

- production audit: clean;
- full audit: development/tool advisories, including direct Vite/Vitest findings;
- Vite has a compatible 7.x update available;
- Vitest remediation is a major migration;
- CI omits Playwright and audit;
- Pages deployment is build-only.

Safe sequence:

1. compatible Vite/transitive update;
2. full validation;
3. isolated Vitest migration plan;
4. add a Playwright browser job and audit policy;
5. gate deployment through repository/workflow policy.

## 5. Candidate C: One Named Hotspot Seam

Choose one, not several:

- Current World Pack review/display state from `WorldBookView.vue` / `CurrentWorldPackPanel.vue`;
- one Home edit/library state seam from `HomeView.vue`;
- one Chat Directory service/template management seam;
- one `systemStore` facade for API settings, Home placement, appearance, or automation;
- Contacts template-adaptation visual diff as a product slice, not another duplicate read model.

Acceptance:

- storage and route behavior unchanged;
- visible behavior unchanged unless the slice explicitly includes UX acceptance;
- focused tests cover the extracted interface;
- file/fan-out measurement is updated.

## 6. Candidate D: Deeper Calendar Relationship Adapter

Current issue:

Calendar uses the shared fact adapter but still passes concrete Chat and relationship-runtime stores.

Desired direction:

- Calendar submits a confirmed-event domain payload;
- a neutral relationship service resolves target/context and writes runtime state;
- Calendar does not need concrete relationship-owner knowledge;
- existing memory lineage and review behavior remain identical.

This is a good ownership improvement after security/toolchain work.

## 7. Candidate E: World Pack Phone Validation

Run the real product loop:

1. Book import/edit/export;
2. WorldBook activation and changed-source review;
3. compatible pack recommendation/enablement;
4. App Store world entry placement and launch;
5. Shopping/Food Delivery/Calendar/Map target context;
6. Chat Services candidate review/join;
7. recovery after invalid CSS, missing source, or rejected proposal.

Promote only the concrete failures found during testing. Do not broaden archetypes first.

## 8. Candidate F: K-pop Built-In Content Migration

The 2026-06-24 K-pop system plan is a planning draft. Current built-in Book assets still import older small drafts.

If the carrier decision is approved, the recommended first code slice is:

- point built-in Book assets to reviewed merged content;
- keep user-facing titles free of `draft`, date, and coordinate terminology;
- fix world-rule body extraction;
- preserve section-level activation and context budgets;
- update Book/WorldBook regression tests;
- archive old source drafts only after code no longer imports them.

Do not implement profile templates, schedule types, locations, service accounts, app bindings, and event seeds in the same slice.

## 9. Later Product Candidates

- explicit group multi-speaker orchestration;
- tracking/order share surfaces from source apps;
- deeper Assets and Stock loops;
- Reminders objective/task presentation;
- stronger Map visual/interaction pass;
- another World Pack archetype;
- broader runtime event families after review safety;
- production backend/autonomy only after a separate architecture decision.

## 10. Avoid

- broad Chat/store redesign;
- whole-app TypeScript migration;
- fuzzy memory merging without a product decision;
- Gallery-first relationship-memory mainline;
- automatic subscription/source-record creation;
- hiding security debt behind a production-only audit result;
- treating `docs/superpowers/**` checklists as executable status.
