# Module Architecture Governance Boundary / 模块架构治理边界

Updated: 2026-08-10

## 1. Core Rule

This package is for technical ownership and long-term maintainability, not for inventing new product requirements.

Behavior extraction is not product expansion. A governance slice can move workflow code behind a clearer Interface, but it must preserve user-visible behavior, persisted storage shape, and cross-module meaning unless the slice explicitly declares a product or migration change.

## 2. What It Owns

- state ownership clarity
- refactor and split planning
- cleanup of stale semantics or unused structures
- migration and storage boundary decisions
- file-size and test-pressure triage
- complete-package, integrity, capacity, staged-restore, migration, and rollback acceptance
- shared Mini Scene ownership, request/artifact Interfaces, world-profile resolution, transform safety, presenter seams, and persistence prerequisites
- the World Setting Module Interface, canonical world identity, owner/reference rules, consumer projections, and migration stop conditions
- the shared Image Generation Module contract, adapter boundary, public-configuration persistence, device-local credential/candidate classification, and backup exclusion rules
- the Music provider/playback/cross-module Interface contract, public-state persistence, device-local credential classification, and Chat/Map projection boundary
- the shared Text To Speech provider/Adapter contract, Cloudflare Workers AI boundary, device-local configuration/credential classification, temporary-media lifecycle, and future-caller boundary

Storage recovery preserves owner meaning: an older backup may restore valid core state without treating currently retained local Gallery material as disposable. Missing media remains an unresolved owner reference rendered through a derived fallback; it does not become fake recovered content or move media truth into Settings.

Camera is the visible configuration owner, but shared provider profiles and module routing are not view-local state. API keys and proxy tokens remain device-local secrets, temporary candidates remain bounded review state, and only explicit Gallery keep creates durable reusable media.

Music is its own visible and logical owner. Its public library/provider state may share the physical System carrier for compatibility, but Settings does not become the Music owner or duplicate its provider UI. Music API keys remain device-local, and Chat/Map receive only stable references plus bounded presentation projections. The internal Chat-share draft is one excluded transient handoff, not Music truth or Chat history; explicit send is the only transition into a durable Chat `share_card`.

Text To Speech is a shared runtime Module. Chat Settings exposes its current configuration and preview surface but does not own provider protocols, keys, raw responses, or generated audio. The first slice keeps configuration, credentials, and preview media device-local and backup-excluded; it does not change `voice_virtual` or create durable Chat audio.

## 3. What It Does Not Own

- daily PM status
- live execution ordering by itself
- visual direction by itself
- new feature scope hidden inside cleanup work
- source-module trigger meaning, source records, Book authoring UX, Settings presentation details, or Event Runtime eligibility policy by itself
- user-facing multi-world management or switching, internal save slots, Book content decisions, WorldBook selection decisions, Pack catalog content, or concrete profile values

The accepted Mini Scene contract is a cross-package architecture decision requested as product scope, not a cleanup side effect. This package owns the shared Module contract and stop conditions. Calendar, Map, Chat, future streaming modules, Event Runtime, Book/WorldBook, and Settings retain their own product meaning at their respective seams.

The world-setting architecture similarly defines the shared Interface and ownership rules without taking over owner data. Book keeps text assets; WorldBook keeps current-world identity and setting activation; the World Pack Module keeps capability definitions; Contacts keeps concrete profile values; source modules keep their own records. `activeWorldPackId` is never a canonical `worldId`, and a future world definition is never an independent save slot by implication.
