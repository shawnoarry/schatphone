# Files Internal Storage Role

Updated: 2026-05-19

## 1. Decision

`Files` is not a standalone user-facing frontend app in the current product direction.

It may remain as an internal storage and coordination component for:

- metadata;
- indexes;
- quick notes;
- backup coverage;
- diagnostics;
- future cross-module references.

## 2. Product Reason

SchatPhone is aiming for a believable phone-like immersive experience. A visible generic file manager weakens that illusion because users already create and manage meaningful objects through their owning modules.

Owning surfaces should stay clear:

- `Gallery` owns photos, wallpapers, memories, journeys, and reusable visual assets.
- `Contacts` owns the global role archive and role-linked asset slots.
- `Chat Directory` owns Chat-side role binding and service-account entry management.
- `relationship runtime` owns relationship progress and shared memory groups.
- `Chat` owns conversations, message media, and conversation-scoped attachments.
- `Map` owns trip cues, places, journey context, and route-derived references.
- `Calendar` owns confirmed events and scheduling handoff.
- `Reminders` owns raw cues, callbacks, and follow-up style reminders.
- `Settings` owns backup, restore, diagnostics, and storage transparency.

Important semantic boundary:

- `Files` must not become the owner of relationship progress, relationship memory groups, or role identity.
- `Contacts` and `Chat Directory` do not co-own relationship truth; they consume or bind to it.

## 3. Engineering Role

`Files` may still provide internal capabilities:

- metadata-only local file index;
- quick notes and lightweight reference records;
- favorite/delete state for indexed records;
- shared media-size guard reuse for local metadata import;
- backup and storage-diagnostics participation;
- future bridge records that help modules find related assets without duplicating original content.

Important boundary:

- Do not copy, upload, or store original binary file content in `Files` unless a later explicit product decision changes this.
- Do not make `Files` the owner of Gallery assets, role profiles, map records, chat messages, reminder cues, or calendar events.
- Do not add Home, More, dock, or onboarding entries that present `Files` as a normal app.

## 4. Frontend Entry Policy

Current frontend policy:

- Hide `Files` from the Home default layout.
- Remove or suppress old persisted `app_files` Home tiles during layout normalization.
- Hide `Files` from More quick entries.
- Hide `Files` from user-facing app icon customization targets.
- Keep `/files` route and store code only for internal, developer, compatibility, or future diagnostic use.

If a future visible surface becomes necessary, it should not be named or framed as a generic file manager. Prefer contextual names such as:

- `资料库`
- `线索库`
- `档案索引`
- `素材引用`

Any future visible surface must explain:

1. which owning module created each item;
2. where the user should edit it;
3. whether the record is primary data or only an internal bridge/index.

## 5. Current Code Touchpoints

- `src/stores/files.js`: internal metadata-only index store.
- `src/stores/system.js`: Home layout normalization filters the hidden frontend entry tile `app_files`.
- `src/views/HomeView.vue`: no user-facing `app_files` tile registry entry.
- `src/views/MoreView.vue`: quick entries suppress the Files entry.
- `src/lib/app-icon-presentation.js`: `app_files` metadata can remain for compatibility, but it is no longer a customization target.
- `src/router/index.js`: `/files` remains available but should not be promoted as a normal frontend entry.

## 6. Workflow Reminder

When work touches `Files`, also check:

- `docs/process/AI_WORK_MODE.md`
- `docs/roadmap/TODO_ROADMAP.md`
- `docs/pm/module-architecture-governance/README.md`
- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`

If a change would make `Files` user-facing again, that is a product-boundary change and must update PM/roadmap docs in the same round.

## 7. Next Recommendation

Continue functional-code work on broader module ownership and runtime clarity before expanding `Files`.

`Files` should only grow when another module has a concrete need for an internal metadata bridge.
