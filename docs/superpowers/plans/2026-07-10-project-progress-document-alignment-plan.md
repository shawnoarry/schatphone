# Project Progress And Documentation Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile SchatPhone's project, architecture, maturity, and task documents with the code and validation baseline measured on 2026-07-10.

**Architecture:** Treat code, tests, build output, and the live roadmap as evidence. Keep `TODO_ROADMAP.md` as the only execution board, move completed 4.1-4.4 work into a compact baseline, and keep unapproved K-pop planning as a decision item rather than an executable shadow backlog.

**Tech Stack:** Vue 3, Vite 7, Pinia 3, Vue Router 5, Tailwind CSS 4, Vitest, Playwright, ESLint, Markdown governance docs.

---

### Task 1: Record The Verified Repository Baseline

**Files:**
- Modify: `docs/overview/PROJECT_MASTER_GUIDE.md`
- Modify: `docs/architecture/ARCHITECTURE.md`
- Modify: `docs/architecture/ARCHITECTURE_DEBT_REVIEW.md`

- [x] **Step 1: Record current stack and repository measurements**

Use the verified values: 30 route views, 16 Pinia stores, 36 composables, 171 unit-test files, 1050 unit tests, 18 Playwright scenarios across desktop/mobile projects, and the measured hot-file and bundle sizes.

- [x] **Step 2: Correct architecture contracts and security boundaries**

Document localStorage plus IndexedDB mirroring, browser-side AI transport, the development-grade push relay, plaintext backup inclusion of system settings, production dependency audit status, and development dependency audit debt.

### Task 2: Rebuild The Live Status And Execution Order

**Files:**
- Modify: `docs/roadmap/TODO_ROADMAP.md`
- Modify: `docs/pm/TODO_PM_STATUS_REPORT.md`
- Modify: `docs/pm/PRODUCT_MANAGER_PROJECT_BRIEF.md`
- Modify: `docs/strategy/PROJECT_ITERATION_PLAN.md`

- [x] **Step 1: Compact completed roadmap history**

Keep 4.1 Contacts IA, 4.2 explicit-lineage memory dedupe, 4.3 World Hub review quality, and 4.4 service-account continuity as completed baselines instead of repeating their full implementation logs.

- [x] **Step 2: Make current work explicit**

Keep 4.5 architecture/document/security maintenance active, keep 4.6 World Pack hardening partial, and register the K-pop system-governance draft as a decision gate before any content migration or feature work.

- [x] **Step 3: Align PM and strategy language**

Remove statements that still call completed Contacts, memory, World Hub, or service-account work the next slice. Describe visual completion, production readiness, and secondary-module depth separately from functional baseline completion.

### Task 3: Refresh Maturity And Candidate References

**Files:**
- Modify: `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
- Modify: `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`
- Modify: `docs/roadmap/PROJECT_MODULE_AUDIT.md`

- [x] **Step 1: Refresh module maturity**

Use current product tiers and exact hot-file measurements. Distinguish stable core, integrated V1, partial/guarded runtime, and shallow secondary loops.

- [x] **Step 2: Replace stale candidate order**

Prioritize security/toolchain maintenance, focused architecture seams, World Pack phone QA, K-pop carrier decision, and only then broader feature expansion.

### Task 4: Align Package Handoffs And Entry Docs

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/map-calendar-reminders/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`

- [x] **Step 1: Remove stale handoff pointers**

Replace recommendations to begin completed 4.2, 4.3, or 4.4 work with the current safe next slices for each package.

- [x] **Step 2: Correct Appearance pack wording**

State that global Appearance packs export global portable fields only. App icons, app skins, app/world-app scoped CSS, Home layout/widgets, and Chat appearance are preserved outside the pack.

### Task 5: Validate Documentation Consistency

**Files:**
- Test: `tests/mojibake-guard.test.js`
- Verify: all modified Markdown files

- [x] **Step 1: Scan for stale recommendations and contradictory Appearance pack claims**

Run: `rg -n "finish Contacts V2|Move to 4.3|Move to service-account continuity|Appearance packs.*icon overrides" README.md docs --glob '!docs/archive/**' --glob '!docs/superpowers/**'`

Expected: no active document recommends already completed roadmap slices or says global Appearance packs include excluded app-specific fields.

- [x] **Step 2: Run project validation**

Run: `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build`, and `npm.cmd run test:e2e`.

Expected: lint passes, 171 unit-test files / 1050 tests pass, production build passes, and 18 Playwright tests pass across desktop and mobile projects.
