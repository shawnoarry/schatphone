# World Semantic Confirmation, Versioning, And Rollback Contract

Updated: 2026-08-29

Status: `CONTRACT_FROZEN / REVIEW_COMPILER_AND_W2_PERSISTENCE_IMPLEMENTED / W3_GATED`

## 1. Purpose

This contract defines how an AI-assisted interpretation becomes a reproducible runtime input without making AI an authority and without exposing compiler concepts in ordinary Settings UI.

The implemented pure boundary is:

`authored sources -> normalized proposal -> exact user confirmation -> deterministic compilation -> versioned activation`

World Setting W2 activation, persistence, legacy migration, rollback, and event-version binding are implemented. Multiple world definitions and switching remain gated by W3.

## 2. User Mental Model

Ordinary users see four product actions:

1. edit world content;
2. ask the configured model to check the world once;
3. review what the model understood, what remains uncertain, and what rules it found;
4. confirm one exact reviewed version, keep the current version, or explicitly restore the previous version.

Users do not need to understand proposal hashes, registries, compiler versions, owner actions, or provider receipts. Those details belong to advanced audit and recovery surfaces.

## 3. Authority

| Object | Authority | May change runtime truth? |
| --- | --- | --- |
| Authored world sources | User through WorldBook | Not by themselves |
| Model proposal | Configured model through a bounded schema | No |
| Model receipt | Code records provider/model/request provenance | No |
| Review confirmation | User bound to one exact proposal/source fingerprint | Authorizes compilation only |
| Compiled manifest | Deterministic compiler | Supplies eligibility indexes only |
| Owner fact/effect | Owning Module | Yes, through its existing validation and persistence |
| Random settlement | Event Runtime code | Yes, once, with persisted evidence |

No model may confirm its own proposal, grant an owner permission, choose an unbounded numeric effect, or activate a compiled revision.

## 4. Version Identity

One reviewed revision is identified by all of:

- stable `worldId`;
- authored `sourceFingerprint`;
- provider-neutral `proposalHash`;
- monotonic `manifestRevision` within the world;
- `compilerVersion`;
- `runtimeRegistryVersion`;
- deterministic `manifestHash`.

Provider ID, model ID, request ID, and generation time remain in a separate model receipt. Changing providers cannot change an active reviewed revision unless the user confirms a new proposal.

## 5. Confirmation Rules

A confirmation is valid only when:

1. its proposal hash matches the normalized proposal byte-for-byte;
2. its source fingerprint matches the exact authored source snapshot;
3. `confirmedBy` is the user authority, never a model or background task;
4. its manifest revision is positive and new for that world;
5. every conflict that blocks compilation has been resolved in the reviewed proposal;
6. every capability bridge, concept reference, boundary reference, owner, and owner action validates against the current runtime registry.

Editing any reviewed field creates a new proposal hash and therefore requires a new confirmation. A checkbox or button must never silently confirm a different proposal than the one currently displayed.

## 6. Activation Transaction

W2 implements activation as one fail-closed state transaction:

1. build a candidate record without changing the current active pointer;
2. compile and verify its source, proposal, compiler, registry, and manifest evidence;
3. switch active/previous/candidate pointers only in the verified next-state snapshot;
4. persist that complete snapshot through the existing System carrier;
5. restore the prior in-memory state if the primary write is rejected;
6. await pending layered-storage mirror work before reporting success to the Settings action.

Any failure leaves the previous active pointer unchanged. There is no partial activation and no model-authored fallback manifest.

## 7. Source Changes And Staleness

When authored sources change:

- the prior compiled revision remains historical and reviewable;
- it cannot authorize new semantic-dependent eligibility while its source fingerprint is stale;
- ordinary owner-native product behavior and direct prompt use may continue where their existing contracts allow it;
- semantic-dependent optional events fail closed until the user confirms and activates a matching revision;
- reverting authored sources to the exact earlier fingerprint may make the earlier revision eligible for explicit rollback after validation.

The product should show a simple Settings message such as “World content changed; check it again.” It should not expose compiler errors to ordinary users.

## 8. Rollback

Rollback is an explicit pointer change to a previously confirmed revision, never a reverse model call.

Rollback requires:

- the same world ID;
- a compiler/runtime-registry compatibility check;
- no unresolved conflicts or missing owner actions;
- one durable rollback receipt linking from the replaced revision to the restored revision.

If the current WorldBook source fingerprint differs from the restored version, Settings immediately marks the world content as changed. The restored version may remain the current compatibility rule set, but future semantic-dependent eligibility must stay fail-closed until the user checks and confirms a matching version.

Rollback does not delete later proposals, model receipts, or compiled revisions. It does not rewrite owner facts or reroll settled events. Historical Event Instances continue to reference the manifest revision under which they were settled.

## 9. Multi-Model Agreement

Several models may produce receipts for the same source fingerprint. Their normalized proposals may be compared by proposal hash and field-level differences, but:

- agreement raises review confidence only;
- disagreement never selects a winner automatically;
- one provider cannot overwrite another receipt;
- compilation consumes one user-confirmed provider-neutral proposal, not raw provider output;
- ordinary runtime does not require multiple providers or continuous model calls.

## 10. Implemented Evidence

The implementation is split across:

- `src/lib/simulation/world-semantic-contract.js` for proposal validation, source/proposal hashes, separate model receipts, exact user confirmation, and an agreement/divergence summary that never selects a winner;
- `src/lib/simulation/world-semantic-compiler.js` for registry validation, fail-closed reference checks, immutable indexes, and deterministic compilation receipts;
- `src/lib/world-setting-state.js` for canonical identity, source snapshots, change classification, immutable semantic versions, activation, status, binding, rollback, and persisted-state inspection;
- `src/stores/system.js` for existing-carrier persistence, legacy alias migration, complete-backup inclusion, restore preflight, and Settings-facing activation/rollback commands;
- `src/lib/simulation/event-instance-v2.js`, `src/lib/simulation/event-contracts.js`, and `src/stores/simulation.js` for stable first-start Event Instance V1/V2 bindings;
- `tests/fixtures/world-semantic/conformance-v1.json` for equal modern K-pop, magic academy, and Tide Contract City fixtures;
- focused unit tests plus `e2e/settings-world-setup.spec.js` for deterministic, negative-path, restore, activation, reload, desktop, and simulated Pixel 5 proof.

The compiler still has no Store import, persistence call, provider field, genre branch, UI caller, or Event Runtime registration. Persistence and runtime binding consume only its verified immutable output.

## 11. Stop Line

This contract does not authorize:

- automatic activation after a model call;
- automatic recompilation after WorldBook edits;
- W3 multiple-world persistence or switching;
- owner mutation from a compiled capability alone;
- background consensus calls;
- deletion of prior revisions or receipts;
- user-facing compiler/debug terminology in Settings.
