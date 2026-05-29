# Book Text Library And WorldBook Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Book` text-library app for long worldbook and knowledge-source documents, while keeping `Settings -> WorldBook` responsible for selecting and activating the sources that affect Chat/runtime context.

**Architecture:** Create a dedicated Book schema/store for reusable text assets, expose it through a native app-like route, and link selected Book assets into WorldBook source-link state. WorldBook remains the activation panel; `world-interface` remains the single consumer seam for prompt/runtime context. `Files` stays hidden/internal and is not reused.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vite, Vitest, Vue Test Utils, existing local persistence helpers.

**Plan Status:** `TRIAL_READY_V1`

**Implementation Note 2026-05-29:** Scheme B was selected first, then the V1 implementation landed in this round. `Book`, `/book`, `bookStore`, schema helpers, WorldBook source links, `world-interface` source resolution, and Settings backup/restore integration now exist. The trial-ready pass added single-asset export download, WorldBook source picking, section-level activation, changed-source warnings, visual diff review, and reviewed reference-version refresh. World Pack V1 activation and user-approved service-account template generation have also landed. Validation passed with `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd test`, and `npm.cmd run test:e2e`. Future work remains summary/retrieval beyond deterministic sections, subscription generation, and concrete app-archetype behavior.

---

## Required Reading

Read these files before coding:

1. `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md`
2. `docs/superpowers/specs/2026-05-29-worldbook-functional-ia-and-world-interface-design.md`
3. `docs/architecture/ARCHITECTURE.md`
4. `docs/roadmap/TODO_ROADMAP.md`
5. `src/stores/files.js`
6. `src/stores/system.js`
7. `src/views/WorldBookView.vue`
8. `src/lib/world-interface.js`
9. `src/views/HomeView.vue`
10. `src/views/AppStoreView.vue`
11. `src/views/SettingsView.vue`
12. `src/router/index.js`
13. `src/lib/planned-module-registry.js`
14. `src/lib/app-icon-presentation.js`
15. `tests/app-store-ui.test.js`
16. `tests/settings-contacts-relationship-import-rollback.test.js`

## Product Decisions Locked For This Plan

- User-facing app name: `Book`.
- Product meaning: reusable text library for worldbook, knowledge, rules, glossary, and reference material.
- `Book` is not a novel/fanfic reader. Future novel or fanfic surfaces should use a different module name.
- `Book` is not `Files`. `Files` remains hidden/internal.
- `Settings -> WorldBook` remains the activation and injection-control surface.
- Full raw long documents must not be copied into Chat prompts, event logs, or app records.
- WorldBook source links store references to Book assets and sections.
- Existing `systemStore.user.globalWorldview`, `knowledgePoints`, and `profileTemplates` must remain compatible during migration.
- All new visible Chinese copy must be valid UTF-8. If a terminal displays mojibake, reopen the file with explicit UTF-8 and use the human-readable copy in this plan/spec.

## File Map

Create:

- `src/lib/book-text-schema.js`
  - Pure helpers for Book text asset normalization, import parsing, section extraction, export payloads, and source-link validation.
- `src/stores/book.js`
  - Pinia store for Book assets, categories, import/export, lock/edit/version behavior, persistence, backup, and restore.
- `src/views/BookView.vue`
  - Route-level Book app UI with library list, detail read mode, guarded editor, import/export actions, and source usage badges.
- `tests/book-text-schema.test.js`
  - Pure helper tests.
- `tests/book-store.test.js`
  - Store behavior, persistence shape, locking, versioning, and backup/restore tests.
- `tests/book-worldbook-linking.test.js`
  - WorldBook source-link and world-interface behavior tests.
- `tests/book-view.test.js`
  - UI smoke tests for library, detail, import feedback, and guarded edit flow.

Modify:

- `src/router/index.js`
  - Add `/book`.
- `src/lib/planned-module-registry.js`
  - Add `BOOK_HOME_APP_ID` and `BOOK_ROUTE`.
- `src/lib/app-icon-presentation.js`
  - Add `app_book` label/icon/accent/customization metadata.
- `src/stores/system.js`
  - Add `app_book` as a known Home/App Store tile; keep it preinstalled and recoverable.
- `src/views/HomeView.vue`
  - Add Book to tile registry and label resolver.
- `src/views/AppStoreView.vue`
  - Add Book to the App Store list with copy that explains it is preinstalled text storage, not a real download.
- `src/views/SettingsView.vue`
  - Include `bookStore` in backup/export/import/rollback.
- `src/views/WorldBookView.vue`
  - Add linked Book source panel and entry actions.
- `src/lib/world-interface.js`
  - Resolve active source links from Book when present; fall back to existing global worldview.
- Documentation after code:
  - `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md`
  - `docs/roadmap/TODO_ROADMAP.md`
  - `docs/pm/TODO_PM_STATUS_REPORT.md`
  - `docs/architecture/ARCHITECTURE.md`
  - `docs/pm/MODULE_NAME_GLOSSARY.md`
  - `docs/pm/product-module-feature-catalog/ROLE_CHAT_AND_WORLD.md`

---

## Current Repo Audit After V1 Implementation

- `/book`, `src/stores/book.js`, `src/views/BookView.vue`, and the `tests/book-*` files now exist.
- `src/lib/world-interface.js` resolves enabled Book source links when a `bookStore` is supplied, reports missing/changed/active source counts, and preserves the legacy `globalWorldview` / `worldBook` fallback when no active Book source exists.
- `src/views/WorldBookView.vue` now provides a Book source picker with whole-document or selected-section activation and refreshes changed source references after review.
- `tests/app-store-ui.test.js` remains the App Store test anchor; there is still no `tests/app-store-view.test.js`.
- Book backup/rollback coverage was added through `tests/settings-contacts-relationship-import-rollback.test.js`.
- `src/views/SettingsView.vue` includes Book in backup payloads, rollback snapshots, recognized backup sections, restore success, restore failure rollback, and `saveNow()` calls.
- `src/lib/app-icon-presentation.js`, `src/lib/planned-module-registry.js`, Home, App Store, and router registration all include `app_book`.
- Keep this plan as the implementation record. Do not implement future refinements from older conversation notes or archived TODO files.

## Task 1: Add Pure Book Text Schema Helpers

**Files:**

- Create: `src/lib/book-text-schema.js`
- Create: `tests/book-text-schema.test.js`

- [ ] **Step 1: Define constants**

Add:

```js
export const BOOK_TEXT_ASSET_TYPES = Object.freeze([
  'worldbook_document',
  'knowledge_note',
  'glossary',
  'rule_set',
  'profile_template_note',
  'reference_note',
])

export const BOOK_TEXT_FORMATS = Object.freeze(['plain', 'markdown', 'structured_json'])

export const WORLDBOOK_SOURCE_USAGES = Object.freeze([
  'base_worldview',
  'knowledge_source',
  'pack_source',
  'profile_template_reference',
])
```

- [ ] **Step 2: Implement normalization helpers**

Implement these exported helpers:

```js
normalizeBookTextAsset(raw, index = 0)
normalizeBookTextAssets(rawAssets)
normalizeBookSection(raw, index = 0)
normalizeWorldBookSourceLink(raw, index = 0)
normalizeWorldBookSourceLinks(rawLinks)
```

Required behavior:

- invalid or empty titles get a readable fallback;
- `content` is always a string;
- `locked` is a boolean;
- `status` is one of `draft`, `active_source`, `archived`;
- ids are stable when provided and generated only when missing;
- section ids are unique per asset.

- [ ] **Step 3: Implement Markdown section extraction**

Add:

```js
export const extractMarkdownSections = (content = '') => []
```

Behavior:

- heading lines beginning with `#`, `##`, `###`, or deeper create sections;
- content before the first heading belongs to an intro section;
- empty content returns an empty array;
- section `order` follows document order.

- [ ] **Step 4: Implement import payload parsing**

Add:

```js
export const buildBookAssetFromImportedText = ({ fileName, content, mimeType }) => {}
```

Behavior:

- `.md` and `.markdown` become `format: 'markdown'`;
- `.txt` becomes `format: 'plain'`;
- `.json` and `.worldbook.json` try structured import;
- unsupported extensions return a readable error object.

- [ ] **Step 5: Add tests**

Cover:

- plain text import;
- markdown section extraction;
- structured JSON import;
- malformed JSON returns error;
- source link normalization;
- invalid asset type falls back to `reference_note`.

Run:

```powershell
npm.cmd test -- tests/book-text-schema.test.js
```

Expected: PASS.

## Task 2: Add Book Store

**Files:**

- Create: `src/stores/book.js`
- Create: `tests/book-store.test.js`

- [ ] **Step 1: Create store state**

Use storage key:

```js
const BOOK_STORAGE_KEY = 'store:book'
const BOOK_STORAGE_VERSION = 1
```

State:

```js
const assets = ref([])
const categories = ref([])
const hasFinishedStorageHydration = ref(false)
```

- [ ] **Step 2: Add getters/actions**

Required store API:

```js
assetCount
worldbookSourceAssets
findAssetById(assetId)
listAssets(filters = {})
createAsset(input)
updateAsset(assetId, patch, options = {})
deleteAsset(assetId, options = {})
lockAsset(assetId)
unlockAsset(assetId)
duplicateAsset(assetId)
importTextAsset(payload)
exportAsset(assetId)
createBackupSnapshot()
createBackupSnapshotAsync()
restoreFromBackup(snapshot)
saveNow()
resetForTesting()
```

- [ ] **Step 3: Protect active linked assets**

Initial rule:

- store-level delete accepts `options.force === true`;
- normal delete of `status: 'active_source'` returns `{ ok: false, reason: 'active_source' }`;
- UI can later request confirmation before force delete.

- [ ] **Step 4: Add tests**

Cover:

- seed or empty initial state is stable;
- create/update/delete;
- locked asset cannot be updated without explicit unlock or force option;
- active source cannot be deleted normally;
- import creates markdown sections;
- backup/restore preserves assets.

Run:

```powershell
npm.cmd test -- tests/book-store.test.js
```

Expected: PASS.

## Task 3: Register Book As A Native App Entry

**Files:**

- Modify: `src/router/index.js`
- Modify: `src/lib/planned-module-registry.js`
- Modify: `src/lib/app-icon-presentation.js`
- Modify: `src/stores/system.js`
- Modify: `src/views/HomeView.vue`
- Modify: `src/views/AppStoreView.vue`

- [ ] **Step 1: Add registry constants**

Add:

```js
export const BOOK_HOME_APP_ID = 'app_book'
export const BOOK_ROUTE = '/book'
```

- [ ] **Step 2: Add router entry**

Add lazy import and route:

```js
const BookView = () => import('../views/BookView.vue')
{ path: '/book', component: BookView }
```

- [ ] **Step 3: Add icon metadata**

Recommended icon:

```js
APP_ICON_LABELS.app_book = { zh: '文本库', en: 'Book', ko: 'Book' }
BUILT_IN_APP_ICON_META.app_book = { icon: 'fas fa-book-open', accent: 'cool' }
```

- [ ] **Step 4: Add Home tile support**

Add `BOOK_HOME_APP_ID` to Home tile ids and registries. Recommended V1 visibility:

- preinstalled app;
- listed in App Store;
- recoverable/addable to Home;
- not a dock app.

- [ ] **Step 5: Add App Store item**

Copy:

- zh: `保存世界书、知识点和规则文本，再由世界书设置选择启用。`
- en: `Store worldbooks, knowledge notes, and rule text, then activate them from WorldBook settings.`

- [ ] **Step 6: Add tests or update existing snapshots**

Run:

```powershell
npm.cmd test -- tests/home-layout-templates.test.js tests/app-store-ui.test.js
```

If the App Store test is renamed later, find the closest existing Home/App Store tests with:

```powershell
rg -n "AppStore|HomeView|home layout" tests
```

## Task 4: Build Book View V1

**Files:**

- Create: `src/views/BookView.vue`
- Create: `tests/book-view.test.js`

- [ ] **Step 1: Build library layout**

Required visible regions:

- top navigation with return behavior through `pushReturnTarget`;
- search input;
- type/category filter;
- asset list;
- selected asset detail;
- empty state.

- [ ] **Step 2: Build detail read mode**

Read mode shows:

- title;
- asset type;
- tags;
- status;
- locked state;
- char count;
- section outline for markdown;
- content preview or full scrollable content.

- [ ] **Step 3: Build guarded edit mode**

Edit mode rules:

- user must click edit;
- active/locked assets show warning before editing;
- save is explicit;
- cancel asks for confirmation when dirty;
- saving updates `updatedAt` and version.

- [ ] **Step 4: Build import controls**

V1 import supports:

- `.txt`;
- `.md`;
- `.json`;
- `.worldbook.json`.

Unsupported imports show feedback and do not create assets.

- [ ] **Step 5: Add tests**

Cover:

- library renders;
- empty state renders;
- selecting an asset shows read mode;
- edit mode is not entered accidentally;
- import success adds an asset;
- invalid import shows feedback.

Run:

```powershell
npm.cmd test -- tests/book-view.test.js
```

Expected: PASS.

## Task 5: Add WorldBook Source Links

**Files:**

- Modify: `src/stores/system.js`
- Modify: `src/views/WorldBookView.vue`
- Modify: `src/lib/world-interface.js`
- Create: `tests/book-worldbook-linking.test.js`

- [ ] **Step 1: Add source link state**

Add compatible user field:

```js
user.worldBookSourceLinks = []
```

Normalize it with `normalizeWorldBookSourceLinks`.

- [ ] **Step 2: Add store actions**

Required actions on `systemStore` or a small worldbook helper:

```js
listWorldBookSourceLinks()
addWorldBookSourceLink(input)
updateWorldBookSourceLink(linkId, patch)
removeWorldBookSourceLink(linkId)
```

- [ ] **Step 3: Add WorldBook linked-source panel**

The WorldBook page shows:

- linked Book source title;
- usage;
- enabled state;
- missing source warning;
- changed source warning when available;
- action: open in Book;
- action: choose from Book.

- [ ] **Step 4: Keep fallback world text**

If no Book source link is active:

- `world-interface` uses existing `globalWorldview` / `worldBook` fallback.

If active Book source links exist:

- primary linked sections resolve first;
- global worldview can still act as fallback or supplemental text depending on usage.
- `resolveWorldContextForConsumer({ systemStore, chatStore, bookStore, ... })` and `resolveActiveWorldOverview({ systemStore, bookStore })` should accept an optional `bookStore` parameter. When omitted, existing callers must keep their current behavior.

- [ ] **Step 5: Add tests**

Cover:

- active Book source contributes to resolved world context;
- disabled link is excluded;
- missing asset creates warning and is excluded;
- no Book links preserves existing global worldview behavior.

Run:

```powershell
npm.cmd test -- tests/book-worldbook-linking.test.js tests/world-interface.test.js
```

Expected: PASS.

## Task 6: Integrate Backup And Restore

**Files:**

- Modify: `src/views/SettingsView.vue`
- Update: `tests/settings-contacts-relationship-import-rollback.test.js`, or add a focused Book backup/restore test if extending that rollback test becomes too broad.

- [ ] **Step 1: Import and instantiate `useBookStore`**

Add Book store beside files/gallery/chat/etc.

- [ ] **Step 2: Include Book in export snapshot**

Add:

```js
book: bookStore.createBackupSnapshot()
```

- [ ] **Step 3: Include Book in rollback snapshot**

Add:

```js
book: bookStore.createBackupSnapshot()
```

- [ ] **Step 4: Include Book in import restore**

Add:

```js
const bookOk = restoreOptionalBackupSection(bookStore, parsed.book)
```

Include `bookOk` in the final restore success check.

Also add `payload.book` to `hasRecognizableBackupSections`.

- [ ] **Step 5: Save Book after restore**

Call:

```js
bookStore.saveNow()
```

- [ ] **Step 6: Add/adjust tests**

Backup export should contain `book`. Restore should restore Book assets and keep existing backups without `book` compatible.

If extending `tests/settings-contacts-relationship-import-rollback.test.js`, add `useBookStore` to the imports, include `book: clone(useBookStore().createBackupSnapshot())` in `createValidModuleSnapshots`, and verify failed imports roll Book state back together with the existing module snapshots.

## Task 7: Validation

Run focused tests first:

```powershell
npm.cmd test -- tests/book-text-schema.test.js tests/book-store.test.js tests/book-view.test.js tests/book-worldbook-linking.test.js tests/world-interface.test.js tests/worldbook-functional-ia.test.js
```

Then run full validation:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Expected:

- all focused Book/WorldBook tests pass;
- lint passes;
- build passes;
- full tests pass or unrelated existing failures are documented with exact command output.

## Task 8: Documentation Sync

**Files:**

- Modify: `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md`
- Modify: `docs/roadmap/TODO_ROADMAP.md`
- Modify: `docs/pm/TODO_PM_STATUS_REPORT.md`
- Modify: `docs/architecture/ARCHITECTURE.md`
- Modify: `docs/pm/MODULE_NAME_GLOSSARY.md`
- Modify: `docs/pm/product-module-feature-catalog/ROLE_CHAT_AND_WORLD.md`

- [x] Update spec status to `TRIAL_READY_V1` when the V1 trial slice lands.
- [x] Record Book as text-source owner.
- [x] Record WorldBook as activation owner.
- [x] Record `Files` remains hidden/internal.
- [x] Record remaining future work:
  - richer visual source diff review;
  - summary/retrieval beyond deterministic sections;
  - subscription generation and concrete app-archetype behavior after World Pack V1 activation.

---

## Acceptance Criteria

- `Book` exists as a preinstalled text-library app and is reachable through App Store/Home recovery or contextual links.
- Users can create/import `.txt`, `.md`, and structured JSON text assets.
- Users can export a single Book asset as `.worldbook.json`.
- Long assets open in read mode by default.
- Editing active or locked assets is explicit and guarded.
- `Settings -> WorldBook` can link active Book sources as whole documents or selected sections.
- Chat/world context still resolves through `world-interface`.
- Existing global worldview, knowledge points, and profile-template behavior remains compatible.
- Backup/export/import includes Book data without breaking old backups.
- `Files` remains hidden/internal and is not repurposed as the Book UI.
