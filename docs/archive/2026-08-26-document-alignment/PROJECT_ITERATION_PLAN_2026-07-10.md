# 封存声明 / Historical Alignment Snapshot

- 封存日期：2026-08-26
- 原快照日期：2026-07-10
- 状态：`HISTORICAL_ITERATION_SNAPSHOT`
- 封存原因：原阶段图仍有历史价值，但其“当前 I2”判断已被后续持久化、发布、事件、App Shell、Calendar、Map、Commerce 和 Appearance 集成进度超越
- 使用限制：当前阶段与顺序只看原路径的新版本和实时路线图

# SchatPhone Project Iteration Plan

Updated: 2026-07-10

> **Strategy reference / 战略参考**
>
> This file describes sequencing and exit gates. It is not a task board. Concrete work must be promoted into `docs/roadmap/TODO_ROADMAP.md`.

## 1. Current Thesis

SchatPhone has completed its initial ownership-closure phase and now has an integrated local-first V1.

The main risk is no longer a missing feature list. It is the gap between broad functional capability and production quality:

1. security/toolchain debt;
2. large view/store hotspots;
3. uneven visual and true-device quality;
4. guarded runtime/product decisions;
5. content plans that can become shadow backlogs if not promoted carefully.

The project should harden and simplify the current product before adding another broad system.

## 2. Phase Map

| Phase | Status | Goal | Current exit judgment |
| --- | --- | --- | --- |
| `I0 Governance Reset` | `DONE` | create trustworthy workflow, docs, CI baseline, and dependency policy | workflow/task-package authority exists |
| `I1 Ownership Closure` | `DONE` | freeze Contacts/Chat, Calendar/Reminders, Book/WorldBook, commerce/Wallet, World Hub/Cheats boundaries | core ownership splits are documented and implemented |
| `I2 Architecture And Security Deepening` | `IN_PROGRESS` | reduce hotspots and close production-facing security/release gaps | credential policy, tooling advisories, CI gates, and measured hotspots remain |
| `I3 Cross-Module Continuity` | `DONE_BASELINE` | connect explicit user actions through deduped memories and source-owned adapters | 4.2 explicit-lineage acceptance and 4.4 service continuity are complete |
| `I4 World-Aware Product Expansion` | `PARTIAL_DONE` | make Book/WorldBook/World Pack affect real app entries and target experiences | V1 works; phone hardening and another archetype decision remain |
| `I5 Runtime Expansion` | `GUARDED` | expand explainable events and controls | foreground pilot/review exists; high-impact and closed-page behavior remain constrained |
| `I6 Background Autonomy` | `DECISION` | decide whether a real backend simulation is worth the cost | no authenticated orchestration design exists |
| `I7 Visual Completion` | `PARTIAL` | bring the whole phone to consistent product-grade visual quality | several focused passes landed; end-to-end visual completion remains |

## 3. Current Phase: I2 Architecture And Security Deepening

### Goal

Make the integrated V1 safer to export, develop, validate, and extend without changing product semantics.

### Workstreams

1. Credential and backup policy
   - decide whether API keys are excluded, opt-in, or explicitly warned;
   - preserve rollback and migration behavior;
   - add regression tests around export/import treatment.
2. Toolchain maintenance
   - take compatible Vite and transitive updates first;
   - isolate the Vitest major migration;
   - keep framework changes separate from product work.
3. CI/release gating
   - decide E2E and audit gates;
   - prevent build-only deployment from being mistaken for full validation.
4. Hotspot decomposition
   - one named view/store seam per slice;
   - preserve storage shapes and visible behavior;
   - measure before and after.
5. Adapter depth and contract typing
   - deepen one cross-owner adapter at a time;
   - introduce types only where shared contracts gain real safety.

### Exit Criteria

- backup credential treatment is explicit and tested;
- development-tool advisories have been resolved or accepted with written reasoning;
- the release path has a clear quality gate;
- at least one high-risk hotspot or adapter path has a narrower tested interface;
- active docs agree on the next lane.

## 4. I3 Baseline: Cross-Module Continuity

This phase has reached its current baseline and should be preserved rather than restarted.

Landed:

- explicit source lineage dedupes current Phone, Shopping, Food Delivery, Wallet, Map, and Calendar relationship chains;
- Chat prompt recall and UI review copy use separate contracts;
- Calendar exposes source/role/growth review details;
- service-account notifications preserve source-module truth;
- role deletion/reset/memory cleanup uses guarded ownership-aware paths.

Future work belongs here only when a new explicit source chain appears or a new product decision changes memory semantics. Fuzzy text merging and Gallery-first memory remain outside the current baseline.

## 5. I4 Partial: World-Aware Product Expansion

Landed:

- Book long-text library and WorldBook activation;
- compatible World Pack expansion model;
- App Store/Home world app entries;
- reviewed nonstandard app/service proposals;
- Shopping, Food Delivery, Calendar, and Map target-app contexts;
- Wallet currency integration.

Next gate:

1. true-device end-to-end testing;
2. fix observed clarity/recovery issues;
3. exercise existing service notification plans;
4. choose one next archetype only after evidence.

The Modern Seoul K-pop planning draft belongs at the boundary of content and I4. It must first receive a carrier decision, then one exact migration slice can be promoted.

## 6. I5 Guarded: Runtime Expansion

Current baseline:

- foreground/session event tick;
- logs, cooldowns, caps, Surprise Mode, and module permissions;
- conservative Food Delivery event pilot;
- conservative Chat greeting source and reviewed higher-risk social proposals;
- World Hub filtered event/relationship review.

Do not broaden until:

- source and ownership explanations remain readable;
- high-impact behavior remains review-first;
- dismissal, cooldown, and cap behavior is explicit;
- the team distinguishes local foreground behavior from server autonomy.

## 7. I6 Decision: Background Autonomy

The current push relay schedules and delivers notifications. It does not own world state or generate events after the app is closed.

A backend path would require decisions for:

- user/device identity and authentication;
- encrypted secrets and AI context privacy;
- authoritative storage and client/server conflict policy;
- scheduling, receipts, retries, and recovery;
- deployment and operational ownership.

Do not promise closed-page autonomy until these are designed.

## 8. I7 Partial: Visual Completion

Focused visual/IA work has already landed in Home, App Store, Appearance, Chat, Contacts, WorldBook, Book, Food Delivery, Network, lock notifications, and Settings.

What remains is not a fresh “visual rebuild start.” It is consistent completion:

- shell and navigation rhythm;
- large-module density and progressive disclosure;
- touch/keyboard/safe-area behavior on real phones;
- coherent app identity while preserving app-specific immersion;
- accessibility and performance review.

Promote one visual scope at a time. Do not combine visual completion with ownership migration.

## 9. Promotion Rules

1. product/data ownership changes require a decision or package boundary update;
2. runtime changes require tests plus runtime/World Hub documentation;
3. route/schema/backup changes require master, PM, roadmap, and architecture sync;
4. concrete implementation belongs in the live roadmap;
5. `docs/superpowers/**` remains reference unless the exact slice is promoted;
6. major dependency migrations remain isolated from feature work.

## 10. Recommended Sequence

1. finish the current I2 security/toolchain decision slice;
2. strengthen CI and one measured architecture seam;
3. run the I4 true-device product loop and apply focused fixes;
4. decide the K-pop carrier split and promote one migration task;
5. broaden runtime or visual work only through an explicit package/roadmap slice.
