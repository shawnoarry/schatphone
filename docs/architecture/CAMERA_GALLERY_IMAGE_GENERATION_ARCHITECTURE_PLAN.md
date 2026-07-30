# Camera, Gallery, And Image Generation Architecture Plan

Updated: 2026-07-31

Status: `FIRST_IMPLEMENTATION_SLICE_DONE / GALLERY_PEOPLE_AND_SOURCE_CALLERS_DEFERRED`

Companion decomposition inventory:

- `docs/architecture/CAMERA_GALLERY_IMAGE_GENERATION_TODO.md`

Authority note:

- roadmap 4.10 now owns the promoted first implementation slice;
- this document records the focused product and technical contract for that slice and the remaining deferred stages;
- if this document conflicts with the live roadmap, an accepted architecture contract, or an owning package handoff, the current authority wins;
- unchecked items in the companion TODO remain inventory, not automatically approved work.

## 0. Implementation Snapshot

Implemented on 2026-07-29:

- a dedicated shared Image Generation Module in `src/lib/image-generation-contract.js`, `src/lib/image-generation-api.js`, and `src/stores/imageGeneration.js`;
- OpenAI-compatible Images/Edit, OpenAI-compatible Chat image output, and Grsai asynchronous adapters, including model discovery, direct-first transport, optional per-profile proxy routing, redacted errors, diagnostics, and bounded tasks;
- recommended LJQ Club, Grsai, and Aixoras profiles for `gpt-image-2` and `nano-banana-2`, with model-aware size behavior and LJQ ratio-only controls;
- a first-class Home/App Store Camera entry, concise `/camera` capture surface, recent candidates, Gallery reference picker, task view, and push-navigation settings for providers, defaults, module routing, and diagnostics;
- distinct Download, Keep in Gallery, and Discard actions; only Keep creates a durable Gallery asset, and Discard never deletes an already-kept Gallery asset;
- separate persistence carriers for public configuration, device-local credentials, and bounded candidates; ordinary backup includes only public configuration and supports optional restore plus rollback;
- focused unit tests and desktop/simulated-mobile Chromium coverage for the promoted Camera flow.

Still deferred:

- Gallery `People / 人物` smart views and person-to-reference curation truth;
- automatic person/intent reference resolution and role/user policy editing;
- Chat, Community, Map, and other source-module generation callers;
- prompt-assistant management UI, hosted proxy deployment/security acceptance, expiring remote-result materialization, true-device checks, and opt-in hosted-provider smoke.

## 1. Goal

Add a first-class `Camera / 相机` app that presents a concise iOS-like camera experience while managing the project's shared image-generation providers and workflows.

The plan must also let Gallery provide user-confirmed character or user reference images through a Photos-like `People / 人物` view. Camera, Chat, Community, and future source modules can then request those references through one shared Image Generation Module instead of implementing provider routing and reference selection independently.

The target product model is:

```text
Camera owns the complete image-generation management experience.
The shared Image Generation Module owns provider and task complexity behind one Interface.
Gallery owns reusable retained media and reference-image curation UX.
Contacts/User Profile own person identity and person-to-reference truth.
Source modules own why and when an image is requested and how a kept result is used.
Settings may expose a shortcut/status row but does not duplicate image-generation configuration.
```

## 2. Existing Baseline To Preserve

### 2.1 SchatPhone

1. `src/stores/system.js` currently owns one global text-AI configuration. Network & API is its full management surface; Settings provides an entry rather than duplicating the form.
2. `src/lib/ai.js` remains the approved text/conversation provider transport entry. The promoted first slice explicitly approved a separate shared Image Generation Module in `src/lib/image-generation-contract.js`, `src/lib/image-generation-api.js`, and `src/stores/imageGeneration.js`; source modules must not bypass either shared transport boundary.
3. Gallery currently owns retained image metadata and local binaries. Its public asset categories are `wallpaper`, `emoji`, `reference`, and `scenario`; `People` is not an existing storage category.
4. Contacts role profiles already support `referenceAssetIds` and role asset-folder bindings, including an `imageReference` slot.
5. `useChatAiImageReferenceModel.js` already resolves role-bound Gallery references and limits the current Chat request to three references. The current path supplies visual context to the text-AI call; it is not a true image-generation call.
6. Generated media remains a transient candidate until the user explicitly keeps it. Gallery owns reusable retained material after keep; the source module retains its own usage and provenance record.
7. Gallery schema migration and provider-code expansion are not approved by the live roadmap merely because this proposal exists.

### 2.2 Vistack Reference Project

`D:\github\Vistack` is the implementation reference, not a drop-in page contract.

Reusable capability areas include:

- connection presets with endpoint, API key, model, proxy choice, and proxy token;
- model discovery with endpoint fallbacks;
- OpenAI-compatible Chat image output, Images generation, and Images edit behavior;
- Grsai and Grsai Draw asynchronous tasks and polling;
- reference-image roles such as character, outfit, background, product, and style;
- prompt-assistant configuration separate from the image-generation provider;
- model-aware size and parameter handling;
- task recovery, redacted diagnostics, retry, and connection checks.

Integration constraints include:

- Vistack automatically admits successful results into its persistent IndexedDB history, while SchatPhone requires an explicit keep decision before reusable Gallery retention;
- Vistack's `/api/proxy` is a server-side function with heartbeat behavior, while SchatPhone is currently a static GitHub Pages SPA;
- Vistack connection presets may retain plaintext API keys or proxy tokens and therefore cannot be copied into SchatPhone backup behavior without an explicit credential decision;
- the Vistack repository is MIT licensed, but copied or substantially reused source must preserve the required license notice.

## 3. Confirmed Product Direction

### 3.1 Camera Is The Visible Owner

Camera is the primary visible management surface for image-generation configuration and generation workflows.

Camera settings should use push-navigation pages, not one large form:

```text
/camera
/camera/tasks
/camera/settings
/camera/settings/providers
/camera/settings/providers/:profileId
/camera/settings/defaults
/camera/settings/app-routing
/camera/settings/prompt-assistant
/camera/settings/diagnostics
```

The main Camera screen remains deliberately small:

- central preview/result area;
- prompt and reference entry;
- a mode selector for text-to-image, reference generation, and image editing;
- one primary shutter/generate action;
- compact current-profile and connection status;
- a settings icon that opens the category menu.

URL, key, proxy, model discovery, capability diagnostics, and full parameter forms do not appear on the main Camera screen.

### 3.2 Camera Configuration Is Shared Domain State

Visible ownership by Camera does not mean Camera view-local state.

Provider profiles, generation presets, module routing, capability snapshots, and prompt-assistant configuration live behind a shared Image Generation Module Interface. Other modules reference stable profile or preset ids. They do not import Camera views, duplicate URL/key/model fields, or read Vistack UI state.

Settings may show a status summary and an `Open Camera image settings` action. It does not contain a second provider registry.

### 3.3 Gallery People Is A Smart View, Not A Fifth Asset Category

The existing Gallery categories describe asset purpose. `People` describes subject association and therefore sits on an independent dimension.

The proposed Gallery information architecture is:

```text
Gallery
|- Photos
|- Albums
|- People
|  |- Current user
|  |- Role A
|  `- Role B
`- Categories
   |- Reference
   |- Scenario
   |- Emoji
   `- Wallpaper
```

A retained asset can:

- appear under several people without binary duplication;
- remain in its existing purpose category;
- be selected as one person's primary identity reference;
- be eligible for one or more normalized intents such as `selfie`, `portrait`, `profile`, `full_body`, or `group`;
- be disabled as an AI reference without being deleted from Gallery.

Gallery owns the asset, source/provenance metadata, previews, and the visual curation surface. Contacts or User Profile continues to own person identity and the authoritative person-to-reference association. Gallery edits that association through the person-binding Interface rather than creating a competing copy.

### 3.4 User Confirmation Is Required

An imported or retained image becomes an automatic identity reference only after the user explicitly binds it to a person and enables it for reference use.

An AI-generated result that is kept in Gallery does not automatically become a reference image. The user must separately choose `Use as reference for ...`. This prevents recursive generation drift and preserves the distinction between a generated depiction and a confirmed identity source.

### 3.5 Source Modules Own Trigger Meaning

Camera, Chat, Community, and future modules own why and when an image request exists. They submit a normalized request; they do not select provider endpoints or reproduce reference-ranking rules.

The word `自拍` is not, by itself, an execution rule. Simple substring matching would mis-handle negation, quotation, discussion, synonyms, and multilingual text.

An automatic request should require all of the following:

1. the source module has decided that an image-generation action is intended;
2. the acting subject or subjects are resolved by stable id;
3. the request has a normalized intent such as `selfie`;
4. module and person policy allow automatic reference use;
5. the selected provider/model supports the required reference input;
6. fallback behavior is explicit when no usable reference exists.

Chat or Community should produce a structured image-generation action/tool result. Camera can use explicit subject and mode selection. Neither path should depend on scanning final display text for one keyword.

## 4. Ownership Matrix

| Owner | Owns | Does not own |
| --- | --- | --- |
| Camera | Camera app IA, full provider/profile management UI, manual generation workflow, candidate review | Gallery binaries, person identity, Chat/Community trigger truth |
| Image Generation Module | provider profiles, model capabilities, request validation, reference resolution, Adapter selection, task lifecycle, normalized outcomes | source-module business meaning, Gallery curation UI, person records |
| Provider Adapter | one provider protocol's endpoint resolution, payload, polling, response normalization, errors | global routing policy, Gallery retention, source-module records |
| Gallery | retained asset metadata/binary, People smart view, reference curation entry, usage visibility | provider credentials, role identity, generation-trigger policy |
| Contacts | role identity and authoritative role-to-reference bindings/policy | asset binary, provider routing, Chat message history |
| User Profile | current-user identity and authoritative user-to-reference bindings/policy | asset binary, provider routing |
| Chat / Community / other caller | actor, request intent, source record, source-specific user policy, kept-result usage | provider HTTP, capability probing, shared reference ranking |
| Settings | optional shortcut/status, backup and storage transparency | duplicate image-provider forms |

This creates one deep Image Generation Module. If it were deleted, provider routing, capability handling, reference selection, task recovery, candidate rules, and error normalization would reappear across every caller.

## 5. Proposed Shared Interfaces

The following shapes are conceptual. Exact schemas, versions, limits, and persistence must be frozen by a promoted architecture slice before Implementation.

### 5.1 Subject Reference

```json
{
  "subjectType": "role",
  "subjectId": "role_123"
}
```

`subjectType` must initially distinguish at least `role` and `user`. A caller must not pass a display name as identity.

### 5.2 Provider Profile

```json
{
  "id": "image_provider_...",
  "name": "Primary image provider",
  "adapterKind": "openai_image",
  "endpoint": "https://example.invalid/v1",
  "credentialRef": "credential_...",
  "proxyMode": "direct",
  "defaultModelId": "model-id",
  "capabilitySnapshot": {},
  "enabled": true
}
```

Required rule: URL alone does not determine request shape. `adapterKind` is explicit, with detection used only as a reviewed suggestion.

### 5.3 Person Reference Policy

The existing role binding contract should be extended or versioned instead of creating a second Gallery-owned truth.

```json
{
  "subject": { "subjectType": "role", "subjectId": "role_123" },
  "enabled": true,
  "primaryAssetId": "asset_...",
  "bindings": [
    {
      "assetId": "asset_...",
      "intents": ["selfie", "portrait"],
      "priority": 100,
      "confirmedAt": 0
    }
  ],
  "modulePolicy": {
    "camera": "auto",
    "chat": "auto",
    "community": "ask"
  }
}
```

The architecture group must define compatibility mapping from current `referenceAssetIds`, `preferredImageAssetId`, and `imageReference` folder bindings.

### 5.4 Generation Request

```json
{
  "requestId": "image_request_...",
  "source": {
    "moduleKey": "chat",
    "recordId": "message_or_action_id"
  },
  "intent": "selfie",
  "subjects": [
    { "subjectType": "role", "subjectId": "role_123" }
  ],
  "prompt": "...",
  "explicitAssetIds": [],
  "referencePolicy": "auto",
  "profileId": "",
  "presetId": ""
}
```

The request contains canonical user/source intent, not a provider-specific body. Credentials, raw headers, provider endpoint paths, and Gallery object URLs are excluded.

### 5.5 Reference Resolution Outcome

Resolution priority:

1. explicit assets selected for the current request;
2. each subject's primary eligible reference;
3. confirmed references ranked for the normalized intent;
4. current source-context references when allowed;
5. explicit fallback: ask, prompt-only, or skip.

The outcome must report selected asset ids, rejected candidates and reasons, provider reference limit, transport representation, and fallback. Local blob/object URLs remain execution details and never become durable identity.

### 5.6 Candidate Outcome

A successful provider response creates a candidate, not a Gallery asset by default.

```text
generated -> candidate review
candidate -> download to device
candidate -> explicit keep -> Gallery asset id
candidate -> discard/expiry
```

An asynchronous provider task handle may require bounded recovery persistence, but task recovery does not imply persistent result admission. Its retention, credential reference, expiry, and backup eligibility require a separate decision.

## 6. Provider Adapter Direction

The first-batch Adapter scope is confirmed from the user's current Vistack usage:

| Current configuration | Resolved protocol | First-batch treatment |
| --- | --- | --- |
| `https://ljqclub.com/` with `gpt-image-2` | OpenAI-compatible Images generation; Images Edit when references exist | implement first; preserve ratio-only output behavior and hide unsupported 1K/2K/4K selection |
| `https://api.aixoras.com/v1` with `gpt-image-2` | generic OpenAI-compatible Images generation/Edit | cover through the same first Adapter family |
| `https://api.aixoras.com/v1` with `nano-banana-2` | generic OpenAI-compatible Chat image output | implement second |
| `https://grsaiapi.com/v1/api/generate` with `nano-banana-2` or `gpt-image-2` | Grsai asynchronous generation with direct-result or task-id polling | implement third, including bounded task recovery |

These three Adapter families form the first supported batch, but Implementation remains sequential so each protocol can be tested independently:

1. OpenAI-compatible Images generation and Images Edit;
2. OpenAI-compatible Chat image output;
3. Grsai asynchronous generation.

Grsai Draw remains a later Adapter unless a promoted usage case requires it.

Each Adapter must expose:

- endpoint and model discovery behavior;
- model capability normalization;
- supported reference count/roles and payload representation;
- generation and optional edit behavior;
- synchronous or asynchronous task semantics;
- retryability and normalized error codes;
- redacted diagnostics;
- direct-browser/proxy requirements.

Do not port Vistack's large provider implementation into Camera views. Preserve locality by concentrating protocol complexity behind the Adapter Seam.

## 7. Confirmed Runtime And Storage Rules

The following product decisions were confirmed on 2026-07-29:

1. **Independent Module**: image generation uses a dedicated shared Image Generation Module. It may reuse low-level network and diagnostic utilities, but it does not expand the text-reply behavior inside `src/lib/ai.js`. Promotion must revise the canonical single-provider-entry wording before provider transport is added.
2. **Direct-first transport**: provider profiles attempt direct browser access by default. Proxy use is optional and configured per profile. Connection diagnostics must distinguish direct success, CORS/proxy-required failure, credential failure, and incompatible protocol. SchatPhone does not require a second deployment merely to open Camera.
3. **Optional proxy safety**: if a proxy/gateway is configured, its URL and token are explicit. The app never silently sends requests through an undeclared shared proxy. Any project-supplied production proxy still requires authentication, upstream allowlisting, rate limiting, CORS, timeout, heartbeat, SSRF, abuse, and redaction review.
4. **Local-only credentials**: image-provider API keys and proxy tokens are stored only in the current local container. Ordinary plaintext backup/export excludes raw image-provider secrets while preserving non-secret profile structure. A future encrypted backup may add an explicit credential option through a separate contract.
5. **Bounded recent candidates**: unkept successful candidates may survive reload in Camera's `Recent generations`, but are removed after seven days or when more than 30 candidates exist, whichever limit is reached first. They are rebuildable temporary data, are excluded from backup, and do not become Gallery assets.
6. **Explicit durable keep**: only `Keep in Gallery` creates a durable reusable Gallery asset. Downloading to the device, viewing a recent candidate, or recovering an asynchronous task does not imply keep.
7. **Model-aware presentation**: model discovery may fall back to a clearly labeled built-in list when an endpoint cannot list models. `ljqclub.com` with GPT Image 2 exposes ratio selection only; unsupported resolution controls remain hidden.

Remaining engineering stop conditions are exact schema/versioning, local credential-carrier behavior, optional-proxy security Implementation, expiring-result materialization, and migration/rollback. These are recorded in Section 12 and the companion TODO.

## 8. UX And Interaction Rules

### 8.1 Camera

- The camera metaphor controls hierarchy and interaction, not literal photography settings.
- The main screen shows only the current mode, prompt/reference controls, preview, and primary generate action.
- Technical configuration uses a category menu and dedicated pages.
- Unsupported model parameters are hidden or explained by capability, not displayed as a universal form.
- Batch results can be swiped or browsed without changing provider configuration.
- `Download` and `Keep in Gallery` are distinct actions.

### 8.2 Gallery People

- People is a first-class smart view backed by existing role/user identity, not face-recognition inference in the first version.
- A person detail shows confirmed references, primary reference, intent badges, disabled items, and usage status.
- Photo detail provides `Use as person reference`; person detail provides `Add from Gallery`.
- Removing a binding does not delete the asset. Deleting a referenced asset shows affected people/modules and requires an explicit resolution.
- Generated provenance is visible. A generated asset is never silently promoted into the confirmed reference set.

### 8.3 Embedded Pickers

Camera, Chat, Community, and Contacts keep host-owned picker containers. They consume Gallery data without turning every picker into the full Gallery app, consistent with `docs/design/VISUAL_ENTRY_OWNERSHIP_MAP.md`.

## 9. Staged Delivery Direction

No stage is scheduled until promoted into the live roadmap.

### Stage A: Architecture Freeze

- carry the confirmed ownership, transport, credential, proxy, candidate-retention, and first-batch Adapter direction into an accepted contract;
- define versioned pure contracts and fixtures;
- freeze compatibility, migration, rollback, and the first Camera caller acceptance.

### Stage B: Shared Foundation

- implement provider-profile, capability, request, reference-resolution, candidate, and normalized-error contracts;
- keep callers and routes unregistered by default;
- add focused unit tests before provider or UI integration.

### Stage C: First Provider And Camera Shell

- add one Adapter with model loading and connection diagnostics;
- add Camera routes and the simplified main/settings hierarchy;
- generate transient candidates and support download/discard without Gallery migration.

### Stage D: Explicit Gallery Keep

- add candidate-to-Gallery keep with provenance and stable asset id;
- prove that discarded candidates do not enter Gallery or backup;
- preserve current Gallery binary and backup contracts.

### Stage E: People Reference Curation

- add the People smart view and versioned role/user reference policy;
- migrate/derive current role reference ids without destroying legacy bindings;
- add primary reference, intent eligibility, module policy, and binding-aware deletion UX.

### Stage F: Camera Reference Generation

- resolve an explicitly selected role/user and normalized intent;
- pass selected references through the first capable Adapter;
- expose selected-reference and fallback diagnostics to the user.

### Stage G: Source Modules One At A Time

- add one registered caller per promoted slice;
- recommended order: Camera, manual Chat action, structured Chat automatic action, Community, then other modules;
- each caller keeps its own source record, trigger policy, and retained-result usage.

### Stage H: Additional Adapters And Hardening

- add Adapters only after the second provider makes the Seam real;
- add async recovery, proxy/gateway support, backup/recovery coverage, true-device checks, and hosted-provider proof as separately reviewable slices.

## 10. Acceptance Gates

A future implementation is not complete until it proves:

1. one Camera provider profile can save, test, fetch models, and produce a candidate;
2. other modules consume stable profile/preset ids rather than duplicate endpoint/key/model fields;
3. an unsupported parameter is capability-gated;
4. a generated candidate is absent from Gallery until explicit keep;
5. keep creates one reusable Gallery asset with provenance;
6. People groups by stable role/user ids without binary duplication;
7. a user can confirm, rank, disable, and unbind reference images;
8. a generated Gallery image does not become a reference without separate confirmation;
9. a structured `selfie` request resolves the correct subject references and respects module policy;
10. negated or quoted `自拍` text does not trigger generation by substring alone;
11. missing, oversized, deleted, or provider-incompatible references produce explicit fallback;
12. deleting a bound asset reports affected bindings;
13. keys/tokens never appear in UI previews, logs, screenshots, clipboard diagnostics, or unredacted errors;
14. backup/export behavior matches the promoted credential and Gallery-binary contracts;
15. desktop, simulated mobile, and named true-device paths have no overflow, blocked actions, or ambiguous keep/download behavior.

## 11. Validation Direction

When implementation is promoted, validation should scale by slice:

- pure contracts and resolver: focused Vitest fixtures plus `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build`;
- provider Adapter: mocked payload/error/task tests and one explicit hosted-provider smoke that never enters the normal deterministic suite;
- Camera or Gallery route: targeted Playwright desktop/mobile flow and visual checks;
- persistence/schema/backup: migration, legacy compatibility, complete-package accounting, restore, rollback, and reopen tests;
- proxy/gateway: authentication, upstream allowlist, SSRF, CORS, timeout, heartbeat, rate-limit, and secret-redaction checks;
- dependency or copied-source change: production/full audit plus Vistack MIT notice compliance.

## 12. Remaining Engineering And Product Decisions

The first slice resolved the provider-profile, credential-reference, capability, task, candidate, routing, local-secret, and ordinary-backup boundaries now implemented in the shared Module. These decisions still belong to later separately promoted stages:

1. exact security and deployment requirements if SchatPhone later ships or officially guides an optional proxy/gateway;
2. when expiring provider URLs are copied into local candidate bytes and how partial materialization failure is shown;
3. exact person-reference persistence schema and compatibility migration from current role reference ids/folder bindings;
4. whether Gallery stores asset-level suitability metadata or all per-person suitability stays with the person profile;
5. default behavior when automatic generation has no usable reference: ask, prompt-only, or skip, per source module;
6. multi-person reference limits and behavior when a provider cannot represent every subject;
7. Community's exact source record and structured generation-action contract;
8. whether face recognition is ever introduced; it remains outside the first version;
9. the product policy for real-person reference images, consent, and sensitive use.

## 13. Promotion Rule

To move any remaining stage into execution:

1. the architecture group resolves the relevant open decisions;
2. one smallest coherent slice is added to `docs/roadmap/TODO_ROADMAP.md` with an owner and acceptance;
3. the primary package handoff is updated, and secondary package handoffs change only where product meaning changes;
4. the accepted parts move into a focused architecture contract or the canonical architecture document;
5. the companion TODO records only the roadmap link for promoted items and does not become a parallel status board.
