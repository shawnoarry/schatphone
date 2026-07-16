# Files Internal Storage Role

Updated: 2026-07-16

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

- `Gallery` is the user-facing material library and owns photos, wallpapers, memories, journeys, reusable visual assets, and media that a source flow explicitly admits for reuse.
- `Contacts` owns the global role archive and role-linked asset slots.
- `Chat Directory` owns Chat-side role binding and service-account entry management.
- `relationship runtime` owns relationship progress and shared memory groups.
- `Chat` owns conversations, message media, and conversation-scoped attachments.
- `Map` owns trip cues, places, journey context, and route-derived references.
- `Calendar` owns confirmed events and scheduling handoff.
- `Reminders` owns raw cues, callbacks, and follow-up style reminders.
- `Settings` owns backup, restore, diagnostics, and storage transparency.

Generated-media boundary:

- image/media generation remains owned by the source module while a result is only a candidate;
- every generating module must let the user decide whether the candidate is kept before it becomes durable;
- once retained, the asset is persisted locally first; Gallery owns reusable retained material while the source module keeps its own usage, narrative, appearance, message, or provenance record;
- keeping an asset does not upload it or enroll it in backup; backup is a later user action;
- backup always includes complete core records and offers one default-on whole-Gallery binary choice rather than asking the user to select individual retained assets again;
- URL-backed media always carries its original URL and minimum type/name/source metadata in backup, without an exact byte copy and regardless of the Gallery-binary choice;
- personal-R2 backup is recovery-only and does not transfer Gallery ownership or allow local originals to be released;
- local export files remain under the phone/computer file system and do not create an internal `Files` or Gallery backup library;
- Settings may list and directly restore complete backup files from the configured personal R2, but that access does not make Settings, Files, or Gallery the owner of the remote backup objects;
- Settings may request permanent deletion of a selected SchatPhone backup object from the connected personal R2 only through a prominent cloud-deletion confirmation; this does not delete the current save, other backups, or local export files;
- Settings must not rotate or delete local or personal-R2 backup files automatically; it may report capacity pressure or block a new backup until the user explicitly deletes a cloud version or handles local files outside SchatPhone;
- media type is independent of source representation: URL, local binary, Gallery reference, and provider record are source choices rather than definitions of whether an item is an image, sticker, GIF, audio item, or other media;
- expanding the current image-focused Gallery into broader audio/video material support requires an explicit later contract, but it must not move ownership into the finance-oriented `Assets` module or internal `Files` surface.

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
- local backup import through a user-selected platform file and remote backup retrieval through the configured personal R2 connection, without owning a backup library;
- future bridge records that help modules find related assets without duplicating original content.

Important boundary:

- Do not copy, upload, or store original binary file content in `Files` unless a later explicit product decision changes this.
- Do not make `Files` the owner of Gallery assets, role profiles, map records, chat messages, reminder cues, or calendar events.
- Do not add Home, App Store, dock, or onboarding entries that present `Files` as a normal app.

## 4. Frontend Entry Policy

Current frontend policy:

- Hide `Files` from the Home default layout.
- Remove or suppress old persisted `app_files` Home tiles during layout normalization.
- Hide `Files` from App Store listings.
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
- `src/views/AppStoreView.vue`: listings suppress the Files entry.
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
