# Book Text Library And WorldBook Activation Design

Updated: 2026-05-29

Status: `TRIAL_READY_V1`

Implementation note, 2026-05-29:

- Scheme B was selected for the current round: revise the plan/spec before coding.
- Book V1 has landed: `/book`, `src/stores/book.js`, `src/views/BookView.vue`, Book schema helpers, and Book-specific tests now exist.
- `Settings -> WorldBook` can link active Book source assets, and `src/lib/world-interface.js` resolves active Book source text before falling back to legacy worldview text.
- The trial-ready pass adds browser download for single-asset export, a WorldBook source picker, section-level activation, changed-source warnings, visual diff review, and reviewed reference-version refresh.
- Settings backup/export/import now includes Book state and rolls it back with the other domain stores.
- Validation for this slice passed: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd test`, and `npm.cmd run test:e2e`.
- World Pack V1 activation and user-approved service-account template generation have now landed; remaining future work is summary/retrieval beyond deterministic sections, subscription generation, and concrete app-archetype behavior.
- New visible Chinese copy must be written as valid UTF-8. Do not copy mojibake from terminal output into UI files.
- 2026-05-30 visual/IA follow-up: `Settings -> WorldBook` now keeps the active-world overview visible first, then uses a single-focus control console for Sources, Pack, Kernel, Templates, and Knowledge. Source selection and changed-source review are layered sheets, not inline page expansion.
- 2026-05-30 Book follow-up: `Book` now treats the source shelf, read detail, and long-form editor as separate phone-depth states. The editor is a root-level sheet so long imported worldbooks are not edited inside the same scroll stack as the reader.
- 2026-05-30 visual/IA follow-up: Sources now uses a stats-first source-control panel with linked-source cards, clearer fallback state, and separated destructive removal.
- 2026-05-30 visual/IA follow-up: Current World Pack and Knowledge panels now have a first craft pass; knowledge create/edit work uses a bottom sheet rather than an always-visible inline authoring form.
- 2026-05-30 visual/IA follow-up: Kernel and Templates now use the same task-panel treatment as Sources/Pack/Knowledge, with compact state headers and stronger mobile cards.
- 2026-06-08 content-source follow-up: `现代首尔 K-pop 娱乐圈` now ships as built-in read-only Book assets for main worldview and world rules. They appear in Book and WorldBook source picking, can be linked into active context, stay outside user backup/persistence payloads, and create user-owned copies before editing.
- 2026-06-08 IA correction: opening the Book/text library from `Settings -> WorldBook` now stays in the WorldBook flow and shows an in-place Book-card catalog. It must not route to `/book`; Book remains the editing workspace, while WorldBook only chooses and activates text.
- 2026-06-08 placeholder-asset follow-up: the K-pop trial library now includes real built-in placeholder manuscripts for encyclopedia, profile-template, world-pack-reference, and reference-material interaction testing. They are Book assets, not static mock cards.
- 2026-06-08 picker-grouping follow-up: WorldBook's Book-card picker now groups manuscripts by activation role/category, so users choose from a category project card before selecting a specific Book manuscript.

## 1. Decision Summary

SchatPhone should separate long-form text storage from WorldBook activation.

The current V1 WorldBook baseline is usable for short worldview text, knowledge points, profile-template rules, and Chat/runtime context injection. It becomes fragile when users import or edit very long worldbooks, because a Settings page with a large editable text area is easy to misread, accidentally change, or overload visually.

New direction:

1. Add a visible app-like text workspace named `Book`.
2. Treat `Book` as a text library, not a novel reader, not a file manager, and not a world-store storefront.
3. Keep `Settings -> WorldBook` as the system-owned activation panel.
4. Let WorldBook link to selected Book documents or sections instead of owning all long text directly.
5. Keep Chat, runtime, Contacts, Map, and Calendar reading compiled world context through `src/lib/world-interface.js`.

Short version:

> Book stores reusable text material. WorldBook decides what becomes active world context. World Interface compiles the active context. Chat/runtime consume the compiled result.

## 2. Problem

The current WorldBook page still carries too much authoring responsibility.

Known issues:

1. Import format is not clear to users.
2. A short demo text can fit in a Settings editor, but a 10,000-50,000 word worldbook cannot.
3. Long editable text inside Settings creates accidental edit/delete risk.
4. Users need a way to choose existing worldbook templates instead of pasting raw text every time.
5. Users need a way to edit reusable templates without immediately changing the active world context.
6. Future reusable text types, such as knowledge notes, terminology, rules, or reference material, should not all become WorldBook page sections.

## 3. Product Boundary

### 3.1 Book

`Book` owns reusable text assets.

It should own:

- worldbook source documents;
- knowledge notes;
- glossary or terminology notes;
- rule sets;
- profile-template notes;
- reusable reference text;
- imported `.txt`, `.md`, and structured worldbook export files;
- categories, tags, favorites, draft state, lock state, and version snapshots for text assets.

It should not own:

- active world state;
- prompt injection rules;
- current World Pack activation;
- Chat history;
- Contacts concrete profile values;
- app business records;
- event runtime state;
- ordinary images or media assets.

### 3.2 WorldBook

`Settings -> WorldBook` owns activation and world-context governance.

It should own:

- the active world overview;
- the current World Pack panel;
- selected Book source links;
- global worldview override or fallback text;
- enabled knowledge sources;
- world profile-template rules;
- pack expansion state;
- warnings about missing, disabled, or changed source links;
- preview of what will affect Chat/runtime.

It should not own:

- full long-form text editing as the main user path;
- a giant raw text library;
- source document version history;
- file import/index behavior;
- ordinary app records or runtime-control behavior.

### 3.3 Files

`Files` remains a hidden/internal storage index component.

Do not turn `Files` into this feature. Existing `Files` records metadata and local file indexes; it does not read, own, or edit long text content as a semantic world source. Reusing it for Book would blur product meaning.

### 3.4 Gallery

`Gallery / Photos` owns media and image assets. It may later be referenced by Book or WorldBook, but it is not the text owner.

### 3.5 World Hub And Cheats

`World Hub` and future `Cheats` remain runtime review/control surfaces. They may review effects produced under a world context, but they are not the source-authoring or activation surface.

## 4. User Mental Model

Users should understand the system in three places:

1. `Book`: Where do I keep and edit my source text?
2. `Settings -> WorldBook`: Which text is active for this world right now?
3. Chat/runtime surfaces: What world context is currently being used?

Expected primary flow:

1. User opens `Book`.
2. User imports or creates a worldbook document.
3. User edits it in Book as a reusable source document.
4. User opens `Settings -> WorldBook`.
5. User chooses one or more Book documents or sections as the current world source.
6. WorldBook shows an activation preview and warnings.
7. Chat receives compiled context through `world-interface`.

## 5. Import And Export Formats

### 5.1 Plain Text

`.txt` should import as one plain source document.

Use for:

- fast paste/import;
- simple personal worldbooks;
- old notes without structure.

Rule:

- The whole file becomes a Book asset.
- It should not be automatically injected in full into Chat.

### 5.2 Markdown

`.md` should be the recommended authoring format.

Example:

```md
# 世界书标题

---
category: 默认世界
tags: 城市, 关系, 规则
---

## 基础世界观

这里写世界基础。

## 社会规则

这里写规则。

## 重要地点

这里写地点。
```

Rules:

- The file becomes one Book asset.
- Headings can become sections.
- Front matter is optional.
- Sections can later be linked separately by WorldBook.

### 5.3 Structured JSON

`.json` or `.worldbook.json` should be used for structured backup, import, and cross-device migration.

Recommended shape:

```json
{
  "type": "schatphone.bookTextAsset",
  "version": 1,
  "asset": {
    "title": "Default World",
    "assetType": "worldbook_document",
    "format": "markdown",
    "categoryId": "world_default",
    "tags": ["city", "relationship"],
    "content": "# Default World\n\n## Basics\n...",
    "sections": [
      {
        "id": "section_basics",
        "title": "Basics",
        "content": "..."
      }
    ]
  }
}
```

Rules:

- JSON preserves metadata, sections, tags, and version data.
- JSON should not be the required format for ordinary users.
- Export should use JSON when preserving reusable template structure matters.

## 6. Data Model Direction

### 6.1 Book Text Asset

Recommended record:

```js
{
  id: 'book_asset_...',
  title: 'Default World',
  assetType: 'worldbook_document',
  format: 'markdown',
  categoryId: 'world_default',
  tags: ['city', 'relationship'],
  content: '# Default World\n...',
  sections: [],
  status: 'draft',
  locked: false,
  source: {
    kind: 'imported_file',
    fileName: 'default-world.md',
    importedAt: 0
  },
  version: 1,
  createdAt: 0,
  updatedAt: 0
}
```

V1 asset types:

- `worldbook_document`
- `knowledge_note`
- `glossary`
- `rule_set`
- `profile_template_note`
- `reference_note`

### 6.2 Book Section

Markdown headings may become sections:

```js
{
  id: 'section_...',
  title: 'Social Rules',
  level: 2,
  content: '...',
  tags: [],
  order: 0,
  charCount: 0
}
```

Sections are useful because WorldBook can activate only the needed part of a long document.

### 6.3 WorldBook Source Link

WorldBook should store references to Book assets or sections.

Recommended record:

```js
{
  id: 'world_source_...',
  assetId: 'book_asset_...',
  sectionIds: ['section_basics'],
  usage: 'base_worldview',
  enabled: true,
  priority: 100,
  budgetHint: 'primary',
  lastResolvedAt: 0,
  warning: ''
}
```

V1 usage types:

- `base_worldview`
- `knowledge_source`
- `pack_source`
- `profile_template_reference`

Rule:

- WorldBook source links reference Book records.
- They do not copy the full Book content into a second truth layer.

## 7. UX Direction

### 7.1 Book App

Book should feel like a native phone app for text storage.

Primary surfaces:

1. Library list
   - search;
   - categories;
   - asset type filters;
   - tags;
   - favorites;
   - locked/draft/active-source badges.
2. Document detail
   - read mode first;
   - explicit edit button;
   - section outline for long documents;
   - linked-world usage summary.
3. Editor
   - explicit save;
   - cancel/discard confirmation;
   - version snapshot on save for active sources;
   - no accidental active-world mutation.
4. Import/export
   - import `.txt`, `.md`, `.json`, `.worldbook.json`;
   - export one asset or selected assets;
   - show unsupported-file feedback.

### 7.2 Settings -> WorldBook

WorldBook should become lighter.

Primary surfaces:

1. Active world overview.
2. Current World Pack.
3. Linked Book sources.
4. Knowledge activation.
5. Profile-template rules.
6. Pack expansion controls.

Expected actions:

- Choose from Book.
- Open source in Book.
- Enable/disable source link.
- Review warnings.
- Activate or save world context.

The WorldBook page may keep a short global worldview fallback editor, but long-form editing should move to Book.

### 7.3 Safety And Accidental Edit Prevention

When a Book asset is linked to the active world:

1. It opens in read mode by default.
2. Editing requires an explicit edit action.
3. Saving an active source should create or update a version snapshot.
4. WorldBook should show changed-source warnings before using newly edited material.
5. Deleting an asset referenced by WorldBook should be blocked or require typed confirmation.

## 8. Context Compilation

WorldBook must not send every long source document directly into prompts.

Required direction:

1. Book stores full text.
2. WorldBook stores selected links and activation state.
3. `world-interface` resolves active source summaries and selected sections.
4. Chat receives compact, prompt-ready context.
5. Runtime and event logs store references and compact context ids, not raw full text.

V1 can begin with deterministic section selection and char-budget limits. Later versions may add summary generation, retrieval, or keyword-triggered source selection.

## 9. Approaches Considered

### A. Keep Everything In Settings

Pros:

- smallest code change;
- keeps V1 route stable.

Cons:

- poor long-text UX;
- high accidental edit risk;
- makes Settings too heavy;
- does not solve reusable source templates.

Decision:

- rejected for long-term direction.

### B. Reuse Files

Pros:

- existing route and store exist;
- already has basic file-like records.

Cons:

- current Files is intentionally hidden/internal;
- it indexes file metadata and does not own text content meaning;
- turning it into Book would undo the Files product decision;
- it lacks semantic categories, versions, source links, and WorldBook activation awareness.

Decision:

- rejected.

### C. Add Book Text Library And Keep WorldBook As Activation Panel

Pros:

- matches user mental model;
- scales to long documents;
- keeps Settings lightweight;
- preserves WorldBook as the active context authority;
- keeps source editing separate from prompt injection.

Cons:

- needs a new store, route, app entry, backup section, and linking UI;
- requires migration and tests.

Decision:

- recommended.

## 10. Implementation Slices

### Slice 0: Plan Readiness Audit

- Completed before implementation: confirmed the current repo had no Book route, store, view, or tests yet.
- Confirm the existing WorldBook V1 baseline remains the active-world and `world-interface` foundation.
- Confirm current test anchors before coding: `tests/app-store-ui.test.js`, `tests/home-layout-templates.test.js`, `tests/world-interface.test.js`, and `tests/settings-contacts-relationship-import-rollback.test.js`.
- Kept code unchanged in the audit slice.

### Slice 1: Documentation And Registry Decision

- Record Book/WorldBook/Files ownership.
- Add Book to naming and roadmap docs.
- Completed before the V1 implementation pass.

### Slice 2: Book Schema And Store

- Implemented pure schema helpers in `src/lib/book-text-schema.js`.
- Added `bookStore` in `src/stores/book.js`.
- Supports create/edit/delete, lock/unlock, import/export payloads, backup/restore, active-source protection, and version/fingerprint tracking.

### Slice 3: Book App Shell

- Added `/book`.
- Added `BookView`.
- Added library list, detail read mode, guarded edit mode, import controls, and export feedback.
- Added App Store entry and Home tile recovery support.

### Slice 4: WorldBook Source Links

- Added source-link state to WorldBook-compatible user state.
- Added V1 source picker, section selection, link/open/remove/toggle controls, and changed-source refresh for Book sources.
- Shows linked sources before world-kernel editing controls.
- Keeps current global worldview fallback compatible.

### Slice 5: World Interface Compilation

- Updated `world-interface` to resolve Book-linked sources.
- Keep Chat prompt and thread summary aligned.
- Excludes disabled, missing, or over-budget material from prompts.

### Slice 6: Pack And Template Refinement

- Future work:
  - Let World Pack refer to Book assets and WorldBook source links.
  - Keep profile-template values owned by Contacts.
  - Keep pack activation inside WorldBook.

## 11. Non-Goals For V1

Do not build in this slice:

- a novel reader;
- a fanfic reader/writer app;
- a Steam-like world store;
- a token economy;
- paid DLC language;
- automatic AI retrieval over all user text;
- a general public file manager;
- a backend document database;
- multi-user sync;
- automatic rewriting of historical Chat messages, Calendar records, event logs, or app business records.

## 12. Cross-PC Handoff

On another PC, start with this order:

1. Pull the latest repo.
2. Confirm local paths and Node/npm setup with `docs/process/DEVELOPMENT_TOOLING.md`.
3. Read:
   - `docs/README.md`
   - `docs/overview/PROJECT_MASTER_GUIDE.md`
   - `docs/roadmap/TODO_ROADMAP.md`
   - this spec
   - `docs/superpowers/plans/2026-05-29-book-text-library-worldbook-plan.md`
4. Run baseline checks:

```powershell
npm.cmd install
npm.cmd test -- tests/world-interface.test.js tests/worldbook-functional-ia.test.js
npm.cmd test -- tests/home-layout-templates.test.js tests/app-store-ui.test.js
npm.cmd run lint
npm.cmd run build
```

5. Start implementation from the plan, not from conversation memory.

## 13. Acceptance Criteria

This direction is ready for implementation planning when:

1. `Book` is accepted as the text-source library.
2. `Settings -> WorldBook` remains the activation and injection-control surface.
3. `Files` remains hidden/internal and is not reused as Book.
4. `.txt`, `.md`, and structured JSON import/export expectations are accepted.
5. Long active sources are read-only by default and edited through guarded Book flows.
6. Chat/runtime context continues through `world-interface`.
7. World Pack and Pack extensions reference Book/WorldBook sources instead of becoming a second lore truth layer.
