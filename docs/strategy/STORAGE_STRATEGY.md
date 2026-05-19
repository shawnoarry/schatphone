# SchatPhone Storage Strategy

Updated: 2026-05-19

Purpose: summarize how SchatPhone should store settings, saves, chat records, world state, runtime truth, and AI-related data without making browser storage too large, too fragile, or too semantically muddy.

Core recommendation:

> do not treat `localStorage` as the main database; use layered storage with clear ownership.

Use this file together with:

- `docs/strategy/STATE_OWNERSHIP_STRATEGY.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/product-decisions/FILES_INTERNAL_STORAGE_ROLE.md`
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`

## 1. Main Risk

If all long-term project data is stored directly in browser `localStorage`, the project will eventually hit:

- quota limits;
- performance problems;
- fragile restore/import behavior;
- noisy duplication of truth;
- harder future migration.

High-risk data types:

- long chat histories;
- repeated prompt fragments;
- large event logs;
- relationship-memory snapshots duplicated too many times;
- image/base64-heavy assets;
- growing runtime/audit histories.

## 2. Recommended Layered Storage Model

### Layer A: `localStorage` for small hot state

Use this only for small, high-frequency, configuration-like values:

- user settings;
- language, notification, and automation switches;
- active IDs and light route/session hints;
- scheduler checkpoints;
- last-active timestamps;
- import/export metadata;
- lightweight UI preferences.

Rule:

- keep this layer small and fast;
- do not let it become the main archive;
- do not keep large histories here just because it is easy.

### Layer B: structured local archive for long-lived app truth

This should be the main long-term structured storage layer over time.

Recommended contents:

- role profile archives;
- relationship runtime state;
- conversation records and message history;
- event logs;
- wallet and ledger state;
- map and itinerary state;
- Calendar event state;
- Reminders cue state;
- notification history;
- accepted memory summaries;
- module-owned long-lived records.

This layer should favor:

- structured retrieval;
- better capacity posture;
- clearer migration/recovery behavior than endlessly expanding `localStorage`.

### Layer C: optional server storage

This is only needed when product goals go beyond local-first single-device play.

Typical uses:

- cross-device sync;
- remote backup;
- durable push delivery;
- persistent scheduled jobs;
- later backend-orchestrated autonomy if the product explicitly chooses it.

## 3. Current Placement Guidance

### Good candidates for lightweight storage

- settings;
- toggles;
- last-open metadata;
- lightweight checkpoint values;
- tiny compatibility flags.

### Good candidates for structured archive storage

- role profiles;
- relationship metrics, stages, milestones, and memory groups;
- long chat histories;
- event and consequence records;
- map records and itinerary history;
- wallet records, gifts, receipts, and balances;
- Calendar confirmed events;
- Reminders raw cues;
- summary memories and continuity snapshots.

### Avoid long-term duplicate clutter

Avoid storing:

- repeated full prompt payloads;
- many derived copies of the same truth;
- large base64 asset payloads outside their owning asset strategy;
- giant raw text that should later become structured summary or archive.

## 4. Ownership-Aware Storage Rules

Storage must respect product ownership.

Examples:

- `Contacts` may display relationship summaries, but `relationship runtime` owns the underlying relationship truth.
- `Chat Directory` may store binding/config data, but not the live relationship truth.
- `Calendar` owns confirmed schedule/date records.
- `Reminders` owns raw cues and follow-up records.
- `Files` may keep metadata/index/bridge records, but should not become the main user-facing owner of assets or relationship data.
- `Gallery` owns visible media asset workflows; do not duplicate those records into Files as if Files were the asset source of truth.

## 5. Anti-Bloat Strategy

To prevent local storage from growing uncontrollably:

1. keep recent raw history, summarize older history where appropriate;
2. prefer structured state over repeated prose;
3. cap diagnostic/event log growth where safe;
4. archive or compress low-priority historical data later if needed;
5. avoid storing regenerated content twice;
6. avoid storing the same continuity concept in several unrelated module-local mirrors.

## 6. Safety And Reliability

Storage design should support:

- recovery;
- migration;
- import/export trust;
- backward compatibility where appropriate.

Recommended practices:

- version backup formats;
- preserve import rollback ability;
- support legacy-to-new migration;
- keep export readable and inspectable;
- treat ownership-shifting migrations as product-boundary changes, not only technical refactors.

## 7. Practical Migration Posture

Current practical posture:

1. keep settings and lightweight indexes small and hot;
2. let long-lived truth move toward stronger structured storage and clearer archive seams over time;
3. keep server storage optional until cross-device sync, durable push, or backend autonomy is truly justified;
4. do not let convenience storage choices quietly redefine product ownership.

## 8. Practical Rule

The project should save truth, not clutter.

Storage is not only a capacity problem. It is also:

- a continuity problem;
- an ownership problem;
- a migration problem;
- a long-term maintainability problem.

## 9. Change Log

1. 2026-03-29: created as the first layered-storage strategy note.
2. 2026-05-19: rewritten to align with current ownership boundaries, relationship runtime, Calendar/Reminders split, and Files/Gallery roles.
