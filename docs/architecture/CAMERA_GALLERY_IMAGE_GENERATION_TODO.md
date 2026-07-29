# Camera, Gallery, And Image Generation TODO Inventory

Updated: 2026-07-29

Status: `PROMOTED_SLICE_LEDGER / REMAINING_INVENTORY / NOT_AN_EXECUTION_BOARD`

Parent proposal:

- `docs/architecture/CAMERA_GALLERY_IMAGE_GENERATION_ARCHITECTURE_PLAN.md`

Authority note:

- roadmap 4.10 owns the promoted first implementation slice and its status;
- `docs/roadmap/TODO_ROADMAP.md` remains the only live execution board;
- checked items below record capability evidence from that promoted slice rather than a second execution status;
- unchecked items remain unscheduled and unapproved until another named slice is promoted.

## 1. Promotion Checklist

- [x] Name the smallest coherent first slice and its primary package.
- [x] Record its product acceptance in the live roadmap as 4.10.
- [x] Resolve every decision gate required by that slice.
- [x] Confirm persisted-shape, migration, rollback, backup, and credential impact.
- [x] Update only the package handoffs whose product meaning changes.
- [x] Define proportional unit, build, browser, provider, and device validation.

## 2. Confirmed Product Inputs

Confirmed on 2026-07-29:

- use a dedicated shared Image Generation Module rather than expanding text-reply behavior in `src/lib/ai.js`;
- first-batch Adapter order is OpenAI-compatible Images/Edit, OpenAI-compatible Chat image output, then Grsai asynchronous generation;
- first-batch compatibility targets are `https://ljqclub.com/`, `https://api.aixoras.com/v1`, and `https://grsaiapi.com/v1/api/generate` with `gpt-image-2` and `nano-banana-2`;
- default to direct browser requests and allow an optional per-profile proxy with explicit connection diagnostics;
- keep API keys and proxy tokens local to the current container and exclude them from ordinary plaintext backup/export;
- retain unkept candidates in Camera recent generations for seven days or 30 candidates, whichever limit is reached first, and exclude them from backup;
- require an explicit `Keep in Gallery` action for durable reusable media;
- expose ratio-only controls for `ljqclub.com` with GPT Image 2 and label built-in model fallback separately from live model discovery.

## 3. Architecture Decision Inventory

- [ ] Carry the confirmed dedicated Image Generation Module into the accepted canonical provider-transport contract.
- [ ] Freeze the Image Generation Module Interface, Adapter Seam, error taxonomy, and idempotency rules.
- [ ] Freeze the three confirmed first-batch Adapter families as separately testable implementation slices.
- [ ] Define direct-browser diagnostics and optional per-profile proxy behavior without requiring a second deployment for Camera entry.
- [ ] Freeze proxy authentication, upstream allowlist, SSRF defense, CORS, rate limits, timeout, heartbeat, and redaction requirements.
- [ ] Define the local credential carrier, reset, migration, diagnostics, and plaintext-backup exclusion behavior.
- [ ] Decide whether model capability snapshots are durable records or rebuildable projections.
- [ ] Define candidate memory/blob ownership and cleanup that enforce the confirmed seven-day/30-candidate limits.
- [ ] Decide how expiring remote image URLs become locally reviewable candidates.
- [ ] Decide the first supported reference count and total-byte policy.
- [ ] Decide the no-reference fallback: ask, prompt-only, or skip, globally and per module.
- [ ] Decide multi-person behavior when a provider cannot accept one reference per subject.
- [ ] Decide real-person reference, consent, and sensitive-use policy.
- [ ] Confirm Vistack MIT notice requirements for copied or adapted source.

## 4. Contract And Fixture Inventory

- [ ] Define versioned `ImageProviderProfile` normalization and validation.
- [ ] Define versioned `ImageModelCapability` normalization.
- [ ] Define versioned `ImageGenerationPreset` and capability-gated parameters.
- [ ] Define project default profile/preset and per-module override resolution.
- [ ] Define versioned `SubjectRef` for at least role and current user.
- [ ] Define versioned person reference policy and compatibility with current `referenceAssetIds`.
- [ ] Define `ImageGenerationRequest` with source, intent, subjects, explicit references, profile, and preset.
- [ ] Define structured intent values including `selfie`, `portrait`, `profile`, `full_body`, and `group`.
- [ ] Define reference-resolution outcome, rejection reasons, fallback, and diagnostics.
- [ ] Define provider-neutral task handle and normalized task states.
- [ ] Define candidate outcome, local bytes/remote URL representation, expiry, and provenance.
- [ ] Define explicit candidate-to-Gallery keep result with `galleryAssetId`.
- [ ] Define source-module retained-result usage references.
- [ ] Define normalized errors for credential, endpoint, CORS, proxy, model, capability, task, timeout, reference, and local-storage failures.
- [ ] Add pure fixtures for URL/key/model profiles without storing real credentials.
- [ ] Add role, user, no-reference, deleted-reference, oversized-reference, and multi-person fixtures.

## 5. Vistack Capability Extraction Inventory

- [ ] Inventory `GenerateRequest`, `ApiConnectionPreset`, task, model, reference-role, and recipe types.
- [ ] Separate reusable provider logic from Vistack view and persistent-history assumptions.
- [ ] Inventory endpoint resolution for Chat, image generation, edit, and model listing.
- [ ] Inventory OpenAI-compatible Chat image response parsing.
- [ ] Inventory OpenAI-compatible Images generation and edit payloads.
- [ ] Inventory Grsai and Grsai Draw submission, polling, terminal errors, and recovery handles.
- [ ] Inventory proxy request, multipart request, heartbeat, auth, and response-header behavior.
- [ ] Inventory prompt-assistant configuration separately from image-provider configuration.
- [ ] Inventory model-aware size, quality, reference, and output constraints.
- [ ] Remove Vistack's automatic success-to-history assumption from the reusable path.
- [ ] Map Vistack failure diagnostics into SchatPhone's redacted normalized errors.
- [ ] Record copied/adapted files and required MIT notice placement.

## 6. Image Generation Module Inventory

- [x] Implement the provider-profile registry behind one shared Interface.
- [x] Implement device-local credentials without admitting raw values into public configuration or backup.
- [x] Implement model discovery and capability normalization.
- [x] Implement project default and per-module routing.
- [x] Implement generation-preset validation against selected model capability.
- [ ] Implement the person reference resolver with deterministic ranking.
- [ ] Implement explicit-reference precedence.
- [ ] Implement module/person auto-use policy resolution.
- [ ] Implement provider reference-count and byte-limit enforcement.
- [ ] Implement prompt-only, ask, and skip fallbacks as normalized outcomes.
- [x] Implement the three confirmed first-batch provider Adapter families.
- [x] Implement synchronous and, only when required, asynchronous task handling.
- [x] Implement retryability and redacted diagnostics.
- [x] Implement transient candidate creation, review access, expiry, and discard.
- [x] Implement explicit keep without automatic backup enrollment.
- [ ] Keep caller registration empty or minimal until each source-module slice is promoted.

## 7. Camera Product And IA Inventory

- [x] Add a Home/App Store Camera identity with explicit installed-app ownership.
- [x] Add `/camera` as the concise iOS-like AI camera surface.
- [x] Define text-to-image, reference generation, and image-edit mode behavior.
- [x] Keep prompt, reference input, preview, mode, and shutter action on the main screen.
- [x] Add `/camera/tasks` for running, failed, and bounded recoverable tasks.
- [x] Add `/camera/settings` as a category list rather than one full form.
- [x] Add provider profile list, create, edit, disable, and delete flows.
- [x] Add endpoint, credential, Adapter type, proxy mode, connection test, and redacted status.
- [x] Add model fetch/refresh, empty, unsupported, and visibly labeled fallback states.
- [x] Add capability-aware default parameter pages.
- [x] Add project default and per-module routing page.
- [ ] Add separate prompt-assistant configuration.
- [x] Add diagnostics and task-status pages.
- [x] Add candidate batch browsing without mutating current configuration.
- [x] Separate `Download to device`, `Keep in Gallery`, and `Discard` actions.
- [ ] Show which references and fallback were used without exposing secrets.
- [ ] Add optional Settings shortcut/status only after Camera management exists.

## 8. Gallery People And Reference Curation Inventory

- [ ] Preserve existing purpose categories; do not add `people` to `GALLERY_ASSET_CATEGORIES` as a shortcut.
- [ ] Add a People smart view derived from stable role/user bindings.
- [ ] Add user and role tiles without copying Gallery binaries.
- [ ] Add person detail with primary, confirmed, disabled, and intent-tagged references.
- [ ] Add `Use as person reference` from asset detail.
- [ ] Add `Add from Gallery` from person detail.
- [ ] Add primary-reference selection and deterministic ordering.
- [ ] Add intent eligibility such as selfie, portrait, profile, full body, and group.
- [ ] Add per-module auto/ask/off policy editing at the person-reference level.
- [ ] Show imported, URL, and generated provenance.
- [ ] Require separate confirmation before a generated Gallery asset becomes a reference.
- [ ] Make unbind distinct from Gallery delete.
- [ ] Show affected people/modules before deleting a referenced asset.
- [ ] Define missing/deleted binding placeholders and repair actions.
- [ ] Preserve host-owned embedded picker visual language in Camera, Chat, Community, and Contacts.
- [ ] Add compatibility behavior for current role asset packs and reference folder bindings.

## 9. Source-Module Integration Inventory

### Camera

- [ ] Resolve an explicitly selected role or current user.
- [ ] Convert selected mode into a normalized intent.
- [ ] Resolve and preview automatic references before generation where appropriate.
- [x] Prove explicit Gallery reference input through the shared request contract and Camera flow.

### Chat

- [ ] Preserve the existing text-AI reference path until a separate Chat image-generation slice is promoted.
- [ ] Define a manual Chat image-generation action before automatic generation.
- [ ] Define a structured assistant action/tool result for image-generation intent.
- [ ] Resolve the active role by stable id.
- [ ] Prohibit final-text substring matching as the execution trigger.
- [ ] Persist only the committed Chat message/usage record and minimum provenance after the result is used.

### Community

- [ ] Identify the owning Community source record and author identity contract.
- [ ] Define manual and structured automatic image-generation actions.
- [ ] Resolve author/mentioned subjects without using display names as ids.
- [ ] Decide review requirements before an automatically generated image is published.

### Later Callers

- [ ] Register Map, Shopping, Food Delivery, Assets, or other callers only through separate promoted slices.
- [ ] Keep source-specific prompts, records, and use meaning with each caller.
- [ ] Prevent caller-specific endpoint/key/model fields from reappearing.

## 10. Persistence, Backup, And Security Inventory

- [ ] Classify provider profile, credential, model snapshot, preset, routing, task, candidate, reference binding, provenance, and usage records by data class.
- [ ] Define persistence owner and stable ids for every durable record.
- [ ] Define migration from current role reference ids/folder bindings.
- [ ] Define rollback that preserves the previous readable role/Gallery state.
- [x] Keep discarded candidates outside durable Gallery and complete-backup material.
- [x] Include kept Gallery binaries under the existing whole-Gallery backup choice.
- [x] Include public provider profiles without credentials in core backup.
- [x] Block plaintext secret leakage through ordinary image-generation export and redacted diagnostics.
- [x] Restore public image-generation configuration independently while preserving device-local credentials and candidates.
- [ ] Preserve current-only kept Gallery material during older restore.
- [ ] Prevent automatic deletion of authoritative person bindings or still-referenced retained assets.
- [ ] Add capacity preflight for candidate download and Gallery keep.
- [ ] Add same-container writer/conflict behavior before migrating Gallery or new shared stores.
- [ ] Keep Gallery/non-Book Repository migration separately approved from feature UI.

## 11. Test And Acceptance Inventory

- [x] Unit-test the promoted normalization, capability, endpoint, adapter, and Store boundaries.
- [ ] Unit-test deterministic reference ranking and explicit-reference precedence.
- [ ] Test negation, quotation, synonyms, and multilingual intent without substring execution.
- [ ] Test missing, deleted, oversized, URL-failed, and provider-incompatible references.
- [ ] Test single- and multi-person reference limits.
- [x] Test provider sync response, async task, terminal, and malformed response paths in the promoted Adapter scope.
- [x] Test secret exclusion in public configuration/backup and non-rendering in Camera E2E.
- [x] Test candidate discard versus explicit keep.
- [ ] Test that kept generated images require separate reference confirmation.
- [ ] Test binding-aware Gallery deletion and non-destructive unbind.
- [ ] Test legacy role reference compatibility and migration rollback.
- [x] Test backup export and Store restore according to the promoted credential/candidate boundary.
- [x] Add Camera desktop and simulated-mobile E2E.
- [ ] Add Gallery People desktop and simulated-mobile E2E.
- [ ] Add one source-module end-to-end flow per promoted caller.
- [ ] Run named true-device checks for camera layout, keyboard/prompt, file import/download, safe areas, and PWA relaunch.
- [ ] Run one opt-in hosted-provider smoke outside deterministic CI fixtures.
- [ ] Verify `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build`, targeted E2E, and applicable audit commands for every promoted Implementation slice.

## 12. Documentation Promotion Inventory

- [ ] Move accepted ownership and shared Interface decisions into the canonical architecture document or a focused accepted contract.
- [x] Update `VISUAL_ENTRY_OWNERSHIP_MAP.md` for the approved Camera entry; Gallery People remains deferred.
- [x] Update module-architecture-governance handoff for the first shared Module slice.
- [x] Update visual-and-IA handoff for the promoted Camera surface.
- [ ] Update Contacts handoff when person-reference truth or migration changes.
- [ ] Update Chat handoff only when its manual or automatic image-generation caller is promoted.
- [ ] Add Community ownership documentation before its first caller Implementation.
- [ ] Update backup/recovery contracts when new durable sections or credential behavior are accepted.
- [ ] Keep this inventory unscheduled; record links to promoted roadmap items instead of mirroring their status.
