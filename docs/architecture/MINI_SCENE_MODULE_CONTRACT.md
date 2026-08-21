# Mini Scene Module Contract / 小剧场共享模块合同

Updated: 2026-08-21

Status: `STAGE_1_FOUNDATION_DONE / AI_RUNTIME_AND_TEXT_SHELL_PARTIAL_DONE`

This contract defines a reusable Mini Scene Module requested by Event Runtime after an event actually occurs. Calendar, Map, Chat, Agenda Journey, future streaming apps, and other source owners may later contribute bounded event facts through explicit Adapters, but users do not author the scene in those Apps and those Apps do not generate it themselves. This replaces both the earlier incomplete Chat-block assumption and the rejected Calendar form/card interpretation.

The Module has two different kinds of durable information: the source owner keeps the event's confirmed result and the approved memory/diary projections, while the Mini Scene Module keeps the complete presentation only when the user explicitly chooses to retain it. The current AI/text shell commits every generated artifact before presentation; that is a transitional implementation behavior. `CMG-08` is the approved follow-up that separates temporary presentation from optional retained replay without weakening event-result or memory persistence.

### 简单中文解释

- **事件记录**：这件事实际发生了什么，以及数值、关系、订单或日程产生了什么结果。无论是否保存小剧场，都要保留。
- **日记/角色记忆**：以后需要回忆时使用的简短总结。无论是否保存小剧场，都要保留。
- **临时小剧场**：这次用来展示和互动的完整内容。不选择保存，结束后只释放这份完整内容。
- **已保存小剧场**：用户主动保留后，未来可以回看的完整互动内容。它可以在回忆入口中分页、归档或删除，但不会删除事件结果和记忆。

这里的“库”也分两种：Book 是可重复使用的规则/模板素材库；小剧场回忆入口是用户过去主动保存的内容，不是提前准备好的随机场景库。文字、HTML、动画或其他表现形式都只是展示方式，之后可以分别设计。

The first planned world-specific example is the Modern Seoul K-pop music-show day. The Module itself must remain world-neutral and support user-authored or imported worlds.

## 1. Product Decisions

1. Mini Scene is one shared Module, not a renderer copied into each calling module.
2. A registered calling module may let the user choose `off`, `text`, or `interactive_html`. A new unconfigured module behaves as `off` until the user chooses.
3. Calendar, Map, Chat, Agenda Journey, future streaming apps, and other callers own why and when a Mini Scene is requested. They do not parse regex, render HTML, or select a world profile themselves.
4. Different worlds may use different Mini Scene profiles, rules, templates, terminology, and scene types.
5. Book owns independently selectable authoring assets for Mini Scene narrative rules and structured transform profiles. WorldBook narrative activation and Mini Scene profile binding are separate user choices.
6. World Pack may reference or recommend a reviewed Mini Scene profile only when it represents a real grouped capability. It never contains arbitrary executable HTML, auto-enables a Book asset, or overrides the user's per-module mode.
7. Interactive HTML is generated from a validated structured document and trusted templates. Raw AI HTML and the current Chat `htmlSnippet` field are never executed.
8. Every interactive artifact has a plain-text fallback. Validation, transform, asset, or rendering failure falls back visibly to text without mutating source-module truth.
9. Built-in K-pop material is an optional example. No K-pop profile, sensitive-content choice, World Pack, or built-in Book asset is a global product default.
10. A profile may declare optional content dimensions, including sensitive dimensions, but it cannot preset the user's choice. Each declared dimension begins `unconfigured`; the user may explicitly choose `include` or `exclude` per world/profile. This is not a global input filter.
11. AI generation is mandatory for every newly committed Mini Scene. Event facts, narrative rules, and an optional validated transform profile constrain the generation, but no deterministic Calendar/source-module text builder may impersonate a generated scene.
12. Missing provider configuration, provider failure, invalid JSON/schema, forbidden markup, or missing AI provenance fails closed without committing or opening an artifact. The required text representation is part of a valid AI artifact; it is not a locally fabricated provider-failure fallback.
13. A Mini Scene is a presentation of one concrete event occurrence, not the event result itself. A new occurrence may generate a different scene; reopening the same retained occurrence must reuse its saved artifact; explicit regeneration creates a new request/revision.
14. Event result, approved role-memory facts, and any diary/timeline projection are persisted by their owners regardless of whether the user retains the full Mini Scene. Declining full retention releases only the complete presentation payload.
15. There is no prebuilt library of finished AI scenes or animations. Book is the reusable rules/profile/template source library; `store:mini-scene` is the store for user-retained past presentation artifacts. A future recall/library page is a management projection over retained artifacts, not a generator pool.
16. Retained presentation artifacts have no silent row-count eviction. Lists and prompts may page or project bounded relevant data. The user may explicitly archive or delete a retained Mini Scene, but that action never deletes the source event result, role memory, diary/timeline projection, or owner audit evidence.
17. Presenter formats are deliberately open-ended. Text is the current production presenter; trusted interactive HTML and other future presenters are adapters behind the same artifact contract and are not the definition of a Mini Scene.

## 2. Ownership And Interfaces

| Owner | Owns | Does not own |
| --- | --- | --- |
| Source module | source record and authoritative facts exposed through an approved Event Adapter | scene authoring, event eligibility, AI generation, regex execution, HTML security, Mini Scene artifact truth |
| Event Runtime | event eligibility, cooldown/cap policy, trigger provenance, bounded `MiniSceneRequest`, and review when required | source-module records, generated artifact content, presenter behavior |
| Mini Scene Module | request validation, profile resolution, AI-required structured artifact creation, transform execution, presentation selection, optional retained-artifact lifecycle, interaction audit | Calendar/Map/Chat/streaming business truth, event eligibility, source-owner result/memory truth, WorldBook activation, Book asset editing |
| Book | narrative rule assets and structured Mini Scene transform-profile source assets | runtime activation, popup mode, renderer execution, generated artifacts |
| WorldBook | narrative context activation and review of Book source links | automatic Mini Scene profile binding, renderer policy, source-module events |
| World Pack | optional reviewed capability references and world-specific suggestions | pure-content bundling, hidden Book selection, user-mode override, executable HTML |
| Settings | global presentation policy, world/profile binding, validation status, preview/retry/reset controls | source-event truth, characters, plot, choices, Book content editing, generated scene history |
| Gallery | reusable retained media and asset references admitted by the user | generated Mini Scene artifact truth or arbitrary iframe network access |

The Mini Scene Module must be deep: callers submit one structured request and receive one structured outcome. If the Module were deleted, profile selection, regex safety, artifact validation, presentation, optional retention, fallback, and interaction security would otherwise be duplicated across every caller.

### 2.1 Calling Interface

The external Interface accepts a request shaped like:

```json
{
  "requestId": "req_...",
  "source": {
    "moduleKey": "simulation",
    "recordId": "event_instance_...",
    "eventId": "event_instance_...",
    "route": "/control-center"
  },
  "sceneType": "event.runtime",
  "worldContext": {
    "mainWorldviewAssetId": "built_in_modern_seoul_kpop_main_worldview",
    "activeWorldPackId": "default_world"
  },
  "participants": [],
  "time": {},
  "place": {},
  "facts": [],
  "presentationHint": "interactive_html"
}
```

Required invariants:

- `moduleKey` and `sceneType` must exist in registries; the current functional registration is Event Runtime only;
- `recordId` must identify an Event Instance that Event Runtime can still resolve, while its source reference continues to point at owner truth;
- `route` must match the registered source-module route; arbitrary caller/profile/generated routes are discarded;
- `facts` are bounded, canonical source facts rather than an assembled prompt or raw provider response;
- caller hints never override Settings policy;
- request failure cannot change the source record;
- request ids are idempotent within the configured retention window.

### 2.2 Result Interface

The Module returns one of:

- `skipped`: module is unconfigured/off or the source event is not eligible;
- `presented_text`: a validated artifact was shown through the Text Presenter Adapter;
- `presented_interactive`: a validated artifact was shown through the HTML Presenter Adapter;
- `presented_fallback`: interactive presentation failed and the text fallback was shown;
- `failed`: AI was unavailable, failed, or did not produce a valid artifact, with a stable error code and no committed substitute.

Callers do not receive raw HTML and do not directly persist presenter state.

### 2.3 Occurrence, Request, And Revision Identity

The source `recordId`/`eventId` pair identifies one concrete event occurrence. `requestId` is the idempotency key for one scene-generation request within the configured retention window.

- A repeat delivery, refresh, reopen, or retry for the same occurrence/request looks up the existing retained artifact before any provider call.
- A new event occurrence receives a new request and may receive a different generated presentation.
- User-requested regeneration is explicit and receives a new revision/request; it never overwrites the prior retained artifact silently.
- If the user declines full retention, the occurrence still keeps its owner result and memory projections, but no complete Mini Scene artifact is available for later replay.

## 3. Event Runtime Registration And User Policy

The registry is data-driven, but the current functional registration is `simulation / event.runtime / /control-center`. Calendar is not a scene-authoring surface and has no Mini Scene-specific event fields, form, or generator button. Map, Chat, Agenda Journey, Calendar, and future streaming modules may later expose approved source-owner event facts to Event Runtime; none registers merely because the App exists.

Each registered module exposes this persisted policy:

```text
unconfigured -> treated as off; Settings shows that the user has not chosen
off          -> source event continues under its owning module/Event Runtime automatic-resolution policy; no AI scene is requested or opened
text         -> ask AI for a structured artifact and open its plain-text presenter after validation
interactive_html -> attempt interactive presentation; always retain text fallback
```

Global Settings presents one row for the registered Event Runtime presentation capability. The current visible choices are `未设置 / 不展示 / 纯文本`; an untouched row behaves as off. This control selects presentation form only: it cannot edit roles, plot, beats, choices, event facts, or triggering rules. Future caller-specific controls may exist only if a real product distinction requires them, and they must reuse this canonical policy instead of creating local scene-authoring state. An optional `pauseAll` control may temporarily suppress every popup without erasing the saved choice.

Presentation policy is not event eligibility. Selecting `off` cannot disable an owning activity, Map Journey, Calendar event, or Event Runtime rule. If the source flow supports automatic resolution, that policy is validated before the Mini Scene request seam and its outcome is still logged by the proper owner. High-impact effects retain their existing confirmation/review requirements even when presentation is off.

World/profile content dimensions use a separate explicit state:

```text
unconfigured -> no choice is stored; the dimension cannot be selected for generation
include      -> the profile may use that dimension where the source facts and scene type allow it
exclude      -> the profile must not use that dimension
```

A profile can declare a dimension and explain it, but cannot mark it included or excluded for the user. Changing one world's choice does not become a global filter or constrain user-authored/imported material.

Resolution precedence is fixed:

1. explicit `pauseAll`;
2. explicit per-module user mode;
3. caller/scene capability, which may only downgrade the selected mode;
4. security downgrade from `interactive_html` to `text`.

World Pack, Book, Event Runtime, the source module, and the selected profile cannot silently change a user's mode.

## 4. World Scope And Profile Resolution

Mini Scene behavior is world-specific without requiring every world to become a World Pack.

Stage 1 compatibility note: the current unreferenced pure schema carries `mainWorldviewAssetId`, `activeWorldPackId`, and `manualScopeId`, but no canonical `worldId`. Before Stage 2 persists a binding or Stage 3 accepts a runtime request, both shapes must receive the stable `worldId` from the World Setting Interface. In the current single-world baseline that value is `legacy_single_world`. The three references below remain explicit profile-selection inputs only: a Book asset is content, a Pack is capability, and a manual selector is user-authored binding metadata. None can create or replace world identity.

Supported scope references are:

- `book_worldview`: stable Book asset id for the explicitly selected main worldview;
- `world_pack`: a user-confirmed active capability pack id;
- `manual`: a stable user-created Mini Scene world/profile scope for a world that has no Book worldview asset.

The resolver uses this order:

1. an explicit user binding for the current `book_worldview` scope;
2. an explicit user binding for the current `manual` scope;
3. a profile reference explicitly accepted with the active World Pack;
4. the neutral built-in profile.

The resolver must expose why a profile was selected. Missing, invalid, incompatible, or changed profiles never cause a hidden lore fallback. They produce a neutral text scene or no scene according to user policy.

Changing the main worldview does not delete old profile bindings. It changes the current resolution input and leaves prior bindings available when that worldview is selected again.

## 5. Book Assets For Mini Scene

Book remains the source library. It supplies two independent asset roles:

1. narrative scene rules, normally `category: world_rule`, `format: markdown`, optionally activated as AI context through WorldBook;
2. structured transform profiles, `category: world_rule`, `format: structured_json`, selected through Mini Scene Settings and never injected as ordinary prose.

The existing `K-pop 音乐节目打歌日小剧场规则` remains a narrative rule. A later implementation slice adds a separate structured K-pop transform-profile asset; it must not mutate the prose rule into executable configuration.

### 5.1 Structured Profile Shape

```json
{
  "type": "schatphone.mini_scene_transform_profile",
  "schemaVersion": 1,
  "profileId": "modern_seoul_kpop.music_show_day.v1",
  "worldScopes": [
    {
      "kind": "book_worldview",
      "id": "built_in_modern_seoul_kpop_main_worldview"
    }
  ],
  "appliesTo": {
    "moduleKeys": ["simulation"],
    "sceneTypes": ["event.runtime"]
  },
  "contentDimensions": [],
  "templateId": "mini_scene.music_show_day.v1",
  "rules": [
    {
      "id": "normalize_stage_label",
      "order": 10,
      "operation": "replace_text",
      "inputField": "beat_text",
      "pattern": "...",
      "flags": "gu",
      "replacement": "..."
    }
  ]
}
```

The Book asset itself has no `enabled` field. Activation belongs to an explicit Mini Scene profile binding in Settings. This preserves the existing Book rule that built-in candidates are available content, not pre-enabled behavior.

`contentDimensions` may declare stable dimension ids and user-facing explanations, but never a default `include`/`exclude` value. User choices live in the Mini Scene profile binding, not in the built-in Book asset.

### 5.2 Regex Role And Limits

Regex is an optional, world-specific transform stage after a structured draft has passed schema validation. It is not:

- the parser for an arbitrary full AI response;
- a prompt-injection defense;
- an HTML sanitizer;
- a trigger engine for source-module business events;
- a way to execute code.

V1 limits are contract values:

- at most 32 rules per profile;
- pattern length at most 512 characters;
- replacement length at most 2,000 characters;
- each input field at most 12,000 characters;
- allowed flags: `g`, `i`, `m`, `s`, and `u`; duplicates and all other flags are rejected;
- allowed input fields: `title`, `summary`, `beat_text`, and `choice_label` only;
- allowed operations: `replace_text`, `capture_slot`, and `select_variant` only;
- deterministic ascending `order`, then stable rule id ordering;
- no dynamic evaluation, JavaScript replacement function, arbitrary property path, or template expression.

The implementation must use a proven linear-time RE2-compatible engine, or an isolated worker with a hard termination deadline approved by security review. If neither is available, profile validation may ship but regex execution must remain disabled. Native unbounded `RegExp` execution on the UI thread is forbidden.

Stable profile errors include:

- `MINI_SCENE_PROFILE_INVALID`
- `MINI_SCENE_PROFILE_SCOPE_MISMATCH`
- `MINI_SCENE_REGEX_INVALID`
- `MINI_SCENE_REGEX_UNSUPPORTED`
- `MINI_SCENE_REGEX_LIMIT_EXCEEDED`
- `MINI_SCENE_REGEX_TIMEOUT`
- `MINI_SCENE_TEMPLATE_MISSING`

Any transform error produces the unchanged validated draft and continues toward text fallback. It does not partially apply later rules.

## 6. Generation And Transform Pipeline

```text
source owner establishes facts
  -> Event Runtime establishes eligibility and trigger provenance
  -> MiniSceneRequest validation
  -> user module-policy resolution
  -> world/profile resolution
  -> bounded AI generation (required)
  -> MiniSceneDraft schema validation
  -> optional Book transform profile
  -> validated temporary presentation payload
  -> Text Presenter or a future Presenter Adapter
  -> allowlisted interaction command
  -> owning source module validates any requested source action
  -> owner persists canonical event result
  -> Relationship Runtime / diary or timeline owner persists concise projections
  -> user chooses full-scene retention
      -> save receipt -> retained Mini Scene artifact and recall entry
      -> decline -> release temporary presentation payload only
```

Generation output is structured. It includes a title, text fallback, ordered beats, optional choices, template slots, source references, and minimum provenance. It does not include executable JavaScript or trusted HTML.

There is no deterministic generation branch. If AI cannot be called or does not return a valid exact Draft with provider provenance, the request fails and no artifact is committed. `textFallback` means the AI artifact's universal text representation for non-HTML presentation and future renderer downgrade; it does not authorize a local source-module story on provider failure.

The transform stage can normalize world terminology, capture a bounded slot, or select an allowlisted template variant. It cannot invent missing authoritative facts. Facts not supplied by the caller remain unknown unless clearly marked as generated fiction that cannot mutate source truth.

## 7. Presenter Adapters

The presenter seam is real because it has two current/future Adapters. More presenter forms may be added without changing event-result or memory ownership.

### 7.1 Text Presenter Adapter

- displays the AI artifact's title, text representation, beats, and bounded choices in an accessible modal;
- supports close, return to source, and copy where product policy permits;
- is the required fallback for every interactive artifact;
- must work without HTML capability or a selected world profile, but never without a validated AI artifact.

### 7.2 Interactive HTML Presenter Adapter

The interactive mode renders a validated declarative `MiniSceneDocument` through trusted app templates. Generated content supplies data, slots, and allowlisted actions, not scripts.

Required isolation:

- sandboxed iframe using `srcdoc` with an opaque origin; never `allow-same-origin`;
- restrictive CSP with no network, forms, top navigation, nested frames, or arbitrary media origins;
- only the app's trusted bootstrap may run; generated/profile content cannot add scripts or event-handler attributes;
- no app DOM, cookies, localStorage, IndexedDB, Service Worker, clipboard, geolocation, camera, microphone, or unrestricted route access;
- a per-instance `MessageChannel` token and allowlisted commands instead of accepting arbitrary window messages;
- Gallery/data/blob assets only through explicit artifact asset grants;
- fixed size and content limits, accessible focus containment, close control, reduced-motion support, and mobile safe-area handling.

Initial command allowlist:

- `mini_scene.choose`
- `mini_scene.close`
- `mini_scene.open_source`
- `mini_scene.request_granted_asset`

An interaction command is a request, not a business mutation. The Mini Scene Module records the interaction, and the owning source module separately validates any source action.

The current Chat sanitizer that only removes `<script>` and `javascript:` is not an HTML security model and must not be reused by this Adapter.

## 8. Artifact And Persistence Contract

The V1 `mini-scene.artifacts-and-policies` owner stores only a retained full presentation artifact. The source owner and Relationship Runtime remain responsible for canonical event results and approved memory/diary projections. A generated payload can be presented temporarily without becoming a retained artifact.

### 8.1 Retention And Replay Lifecycle

| State | Durable complete scene? | What must remain durable |
| --- | --- | --- |
| `presenting` | no, unless already retained | validated temporary payload in the active presentation; source event is not changed by rendering |
| `retained` | yes | complete structured artifact, interaction state, minimum provenance, source references, and audit |
| `released` | no | confirmed event result, approved role-memory facts, diary/timeline projection, and owner audit/reference evidence |
| `deleted` / `archived` | deleted or hidden by explicit user action | the source event result, memories, projections, and owner audit evidence remain |

The user-facing choice to retain a full Mini Scene is separate from settling the event. It must not be phrased or implemented as a choice to keep/discard the event result. If a retained-scene write fails, the UI reports that the full replay was not saved and offers retry; it does not roll back a successfully persisted event result or memory.

When a retained artifact is reopened, the presenter rebuilds its display from the stored structured data and does not call the provider. Explicit regeneration creates a new revision/request. No fixed row count may evict retained artifacts; management views use paging, filters, and bounded projections.

The V1 `mini-scene.artifacts-and-policies` owner stores:

- artifact id and schema version;
- source module/record/event references;
- scene type and resolved profile id/version;
- canonical text fallback and structured document;
- retention state (`retained`, `archived`, or an explicit user-deleted tombstone where deletion/audit policy requires it), interaction state, and audit summary;
- minimum provenance and timestamps.

Minimum provenance for newly committed artifacts is `sourceKind: ai`, provider id, and generation timestamp. Optional model/request ids may be retained. A deterministic or manually authored artifact is rejected by the Store boundary.

Do not persist:

- full prompts;
- raw provider responses;
- transport headers/payloads;
- rendered iframe HTML;
- failed uncommitted drafts;
- transient object URLs.

Rendered HTML or any other presenter output is a rebuildable projection. Source modules retain their own records and may store an artifact reference plus a compact display snapshot only when the user retained the full scene. An unsaved presentation must not leave a durable full-content copy in the Mini Scene Store.

The 2026-08-19 text baseline adds `store:mini-scene` V1 to the persistence-owner inventory and layered persistence audit, adds a required `miniScene` section to complete-backup v4, preserves manifest verification for complete-backup v3, and includes the Store in staged restore, rollback, crash recovery, and save ordering. `CMG-08` must extend this owner with explicit retention state, no silent artifact cap, idempotent lookup-before-provider, and a user-facing retained-scene management projection. This remains a separately authorized roadmap 4.8 owner, not a retroactive addition to Batch 2B and not a Repository migration.

## 9. Current Chat Compatibility

Today Chat accepts a `mini_scene` rich block with `title`, `description`, and `htmlSnippet`. The UI displays `htmlSnippet` in a `<pre>` element; it does not execute it. Normalization only strips obvious script tags and `javascript:` strings.

Future migration rules:

1. preserve existing Chat messages as Chat history;
2. continue treating legacy `htmlSnippet` as inert text;
3. do not auto-convert or execute old snippets;
4. new Chat requests use the shared Mini Scene Interface and store an artifact reference/display snapshot;
5. a compatibility Adapter may present an old block through the Text Presenter only.

## 10. Delivery Plan

### Stage 0 - Contract And Roadmap

Status: `DONE 2026-07-21`

- freeze ownership, Interfaces, user modes, world resolution, Book profile shape, security, persistence, and stop conditions;
- make no runtime, schema, UI, or dependency change.

### Stage 1 - Pure Foundation

Status: `DONE 2026-07-21`

- add registries and pure schemas for request, draft, artifact, module policy, world scope, profile, and template references;
- add Book structured-profile validation and deterministic resolver tests;
- add regex validation only; execution requires the approved safe engine;
- no store, route, popup, iframe, AI call, source-module trigger, or persistence change.

Landed files:

- `src/lib/mini-scene-contract.js`
- `src/lib/mini-scene-schema.js`
- `src/lib/mini-scene-module-registry.js`
- `src/lib/mini-scene-transform-profile.js`
- `src/lib/mini-scene-profile-resolver.js`
- `tests/mini-scene-schema.test.js`
- `tests/mini-scene-module-registry.test.js`
- `tests/mini-scene-transform-profile.test.js`
- `tests/mini-scene-profile-resolver.test.js`

The caller registry is intentionally empty until a source Adapter is separately promoted. The transform module validates syntax, RE2 compatibility, limits, ordering, and profile shape but exports no regex execution path.

### Stage 2 - Persistence And Policy Foundation

Status: `PARTIAL_DONE 2026-08-19`

- `DONE`: add Mini Scene ownership and backup inventory entries;
- `DONE`: add canonical `worldId` from the World Setting Interface to request, artifact, and profile-binding persistence; the current single-world baseline records `legacy_single_world` and keeps Book, Pack, and manual references as non-identity selection inputs;
- add Repository Adapter/fixtures only after the Book foundation pilot is accepted;
- `DONE`: add the dynamic registered-module Settings presentation policy model and migration defaults;
- `DONE`: preserve `unconfigured -> off` policy resolution and complete-backup restore behavior;
- `OPEN / CMG-08`: split temporary presentation from explicit full-scene retention, add lookup-before-provider idempotence, remove the historical 120-artifact cap, and add retained-scene management without weakening event-result or memory persistence;
- `OPEN`: add profile-binding selection UI and any separately approved Repository Adapter/fixtures.

### Stage 3 - AI Core Module And Text Presenter

Status: `PARTIAL_DONE 2026-08-19`

- `DONE SHELL`: register Event Runtime as the only functional caller and implement provider-neutral, AI-required structured generation. Missing providers, provider failures, invalid exact schema, forbidden markup, unsupported participant references, and missing provider provenance fail closed without a committed substitute;
- `DONE SHELL`: implement AI artifact commit and a global accessible Text Presenter with copy, close, choice audit, an explicit `mini_scene.choose` owner-validation request, and generic return to World Hub. The shell currently commits every generated artifact; `CMG-08` changes full-scene retention to an explicit user choice;
- `DONE SHELL`: add global Settings `unconfigured | off | text` presentation policy without plot/role/choice authoring;
- `OPEN`: connect runtime profile resolution, add profile-binding UI, and prove custom/manual worlds work without a World Pack.

### Stage 4 - Interactive HTML Presenter

Status: `TODO / SECURITY_REVIEW_REQUIRED`

- implement the sandboxed iframe, trusted template registry, CSP, MessageChannel bridge, asset grants, interaction audit, and visible text fallback;
- add Book transform-profile editor/validator/preview without making WorldBook the editor;
- do not enable interactive mode until malicious-input and isolation tests pass.

### Stage 5 - First Event Runtime Integration

Status: `TODO / SHELL_ONLY`

- add a separate structured K-pop music-show-day transform-profile Book asset;
- connect one already-materialized Event Instance through an Event Runtime Adapter using source-owner facts and the configured AI provider;
- retain the existing narrative Book rule as optional context;
- return a selected choice to Event Runtime/source-owner validation before any outcome or mutation;
- do not add Mini Scene authoring fields or a generator button to Calendar, invent schedule truth, auto-enable encyclopedias, or create a dedicated K-pop World Pack.

### Stage 6 - Map And Chat Integrations

Status: `TODO`

- add one focused Adapter per source module with separate acceptance;
- migrate new Chat Mini Scene generation away from executable-looking `htmlSnippet` data;
- keep source records, trigger rules, and failure handling local to each owner.

### Stage 7 - Future Streaming Integrations

Status: `ON_HOLD`

- begin only after a streaming module has its own product contract and source-record model;
- reuse the shared Interface and presenter seam instead of adding a streaming-specific renderer.

## 11. Validation Matrix

Every implementation stage must add focused tests at the Interface it changes.

Required before first user-visible release:

1. schema rejection, canonical ordering, unknown-field stripping, and stable error codes;
2. world-profile precedence across Book worldview, manual scope, reviewed World Pack reference, missing profile, and neutral fallback;
3. zero hidden activation: Book catalog presence, WorldBook activation, profile binding, and per-module popup mode remain separate;
4. declared content dimensions remain unconfigured until explicit per-world/profile include/exclude choice and never become a global input filter;
5. regex invalid/unsupported/limit/timeout tests plus deterministic repeated output;
6. module-policy tests for unconfigured, off, text, interactive, pause-all, and interactive-to-text downgrade;
7. persistence and complete-backup round-trip for settings, bindings, content-dimension choices, artifacts, and interaction state;
8. one-occurrence/reopen/regeneration tests proving lookup-before-provider, no reroll on reopen, and a new revision only after explicit regeneration;
9. save/decline/archive/delete tests proving full-scene retention is optional while event results, approved role memories, diary/timeline projections, and owner audit evidence remain;
10. no-cap and paging tests above the historical 120-artifact baseline, including visible save failure/retry behavior;
11. iframe isolation tests for app DOM, storage, network, navigation, form, nested-frame, script, inline-handler, and forged-message attempts;
12. text and future presenter accessibility, keyboard, focus containment, mobile overflow, safe area, reduced motion, and fallback;
13. source event and Event Instance remain unchanged when provider lookup, generation, transform, retention, or presentation fails;
14. custom world without World Pack, built-in K-pop world, and changed/missing profile coverage;
15. legacy Chat `htmlSnippet` stays inert and cannot become executable through migration.

## 12. Stop Conditions

Stop the current slice if it would:

- add runtime Mini Scene work to persistence Batch 2B;
- execute raw AI/profile/legacy HTML;
- run unbounded native regex on the UI thread;
- make Book catalog presence or WorldBook activation enable a popup automatically;
- require a World Pack for a custom world;
- let World Pack override user mode or auto-bind encyclopedias;
- let the Mini Scene Module mutate Calendar, Map, Chat, streaming, relationship, or runtime truth directly;
- delete or discard a full Mini Scene by deleting the source event result, approved role memory, diary/timeline projection, or owner audit evidence;
- treat Book's reusable rules/profile/template library as a library of previously generated user scenes;
- make a presenter format, including HTML animation, the canonical event or memory record;
- persist raw prompts/provider responses or rendered iframe HTML;
- commit a deterministic, user-authored, or provider-less scene as if AI generated it;
- add Mini Scene-specific character, phase, place, plot, or choice authoring fields to Calendar or another source App;
- add a future streaming source model before that module is separately approved;
- treat the K-pop example or any sensitive-content dimension as a global default.
