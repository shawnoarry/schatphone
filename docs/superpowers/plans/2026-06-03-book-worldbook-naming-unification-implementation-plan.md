# Book WorldBook Naming Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Book, WorldBook, World Pack, role binding, and prompt-context naming around canonical worldview, encyclopedia, world-rule, profile-template, and reference concepts while preserving old saves and exports.

**Architecture:** Add one taxonomy helper as the naming source, then move schema/store boundaries to read legacy fields and write canonical fields. Keep old helper names and mirrored fields during the transition so existing views and tests can be migrated in controlled slices.

**Tech Stack:** Vue 3, Pinia, Vite, Vitest, JavaScript ES modules.

---

## Execution Constraints

- Work from `docs/superpowers/specs/2026-06-03-book-worldbook-naming-unification-design.md`.
- The current repository may contain unrelated dirty files. Before each commit, run `git diff --cached --name-only` and confirm only the files listed in that task are staged.
- Use `apply_patch` for manual edits.
- Keep user-visible Chinese copy valid UTF-8. Do not paste terminal mojibake into source files.
- Keep compatibility wrappers for old names in the first implementation. Existing backups with `assetType`, `usage`, `globalWorldview`, `worldBook`, `knowledgePoints`, and `knowledgePointIds` must still load.

## File Structure

Create:

- `src/lib/world-taxonomy.js`
  - Canonical category/role constants.
  - Alias maps from old values to new values.
  - Label helpers for Chinese/English copy.
  - Small normalization helpers used by schema, stores, and views.
- `tests/world-taxonomy.test.js`
  - Unit tests for canonical values, alias normalization, labels, and field migration helpers.
- `tests/worldbook-naming-migration.test.js`
  - Integration-style tests for old-save migration across Book assets, source links, encyclopedia entries, role bindings, and World Pack references.

Modify:

- `src/lib/book-text-schema.js`
  - Replace local asset/usage constants with taxonomy constants.
  - Normalize Book assets to `category` and mirror `assetType` for compatibility.
  - Normalize WorldBook source links to `role` and mirror `usage` for compatibility.
  - Export canonical payloads while keeping import compatibility.
- `src/stores/book.js`
  - Make Book filters and source eligibility read `category`.
  - Accept old `assetType` filters during transition.
- `src/views/BookView.vue`
  - Show `分类 / Category` and canonical type labels.
  - Move the editor draft from `assetType` to `category`.
  - Keep old `book-edit-type` test id for one transition window unless tests are updated in the same task.
- `src/stores/system.js`
  - Add encyclopedia entry state and helpers.
  - Read old `knowledgePoints`, write canonical `encyclopediaEntries`, and mirror `knowledgePoints`.
  - Read old source-link `usage`, write canonical `role`, and mirror `usage`.
  - Keep old knowledge helper methods as wrappers.
- `src/stores/chat.js`
  - Normalize role profiles from `encyclopediaEntryIds` or old `knowledgePointIds`.
  - Store canonical `encyclopediaEntryIds` and mirror `knowledgePointIds`.
- `src/lib/role-binding-contract.js`
  - Expose canonical `encyclopediaEntryIds` in role binding contracts.
  - Keep `knowledgePointIds` as a compatibility alias.
- `src/lib/world-interface.js`
  - Resolve encyclopedia entries through the new helper when available.
  - Keep prompt behavior stable.
  - Rename prompt wording from "knowledge points" to "encyclopedia entries".
- `src/lib/world-pack-schema.js`
  - Normalize World Packs from `encyclopediaEntryIds` or old `knowledgePointIds`.
  - Store canonical `encyclopediaEntryIds` and mirror `knowledgePointIds`.
  - Update review rows and missing-reference labels to encyclopedia language.
- `src/lib/simulation/world-context.js`
  - Accept `encyclopediaEntries` while preserving `knowledgePoints` fallback.
- `src/lib/worldbook-navigation.js`
  - Add canonical encyclopedia route aliases while continuing to read old `point` and `points` query params.
- `src/views/WorldBookView.vue`
  - Switch user-facing copy from "知识点 / Knowledge point" to "百科 / Encyclopedia entry".
  - Use canonical source-link `role` in the picker and active-source text.
  - Keep existing knowledge data-test ids if changing them would cause broad test churn.
- `src/components/worldbook/WorldBookOverview.vue`
- `src/components/worldbook/CurrentWorldPackPanel.vue`
- `src/components/chat/ChatThreadMenuPanel.vue`
- `src/components/calendar/CalendarEventCard.vue`
- `src/components/calendar/CalendarMapReminderCard.vue`
- `src/components/map/MapAreaFeedbackPanel.vue`
- `src/components/map/MapRouteFamiliarityPanel.vue`
- `src/components/map/MapTripHistoryPanel.vue`
  - Update user-facing copy to encyclopedia language.
- Existing tests under `tests/`
  - Update assertions from old canonical values to new canonical values.
  - Add old-name compatibility assertions where behavior must remain readable.
- Product docs after implementation:
  - `docs/pm/MODULE_NAME_GLOSSARY.md`
  - `docs/pm/module-architecture-governance/README.md`
  - `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`
  - `docs/superpowers/specs/2026-06-03-book-worldbook-naming-unification-design.md`

---

### Task 1: Taxonomy Helper

**Files:**

- Create: `src/lib/world-taxonomy.js`
- Create: `tests/world-taxonomy.test.js`

- [ ] **Step 1: Write failing taxonomy tests**

Create `tests/world-taxonomy.test.js`:

```js
import { describe, expect, test } from 'vitest'
import {
  BOOK_TEXT_CATEGORIES,
  WORLDBOOK_SOURCE_ROLES,
  getBookTextCategoryLabel,
  getWorldBookSourceRoleLabel,
  normalizeBookTextCategory,
  normalizeWorldBookSourceRole,
  pickCanonicalField,
} from '../src/lib/world-taxonomy'

describe('world taxonomy', () => {
  test('defines the canonical Book categories in product order', () => {
    expect(BOOK_TEXT_CATEGORIES).toEqual([
      'worldview',
      'encyclopedia',
      'world_rule',
      'profile_template',
      'reference_material',
    ])
  })

  test('normalizes legacy Book asset types to canonical categories', () => {
    expect(normalizeBookTextCategory('worldbook_document')).toBe('worldview')
    expect(normalizeBookTextCategory('knowledge_note')).toBe('encyclopedia')
    expect(normalizeBookTextCategory('glossary')).toBe('encyclopedia')
    expect(normalizeBookTextCategory('rule_set')).toBe('world_rule')
    expect(normalizeBookTextCategory('profile_template_note')).toBe('profile_template')
    expect(normalizeBookTextCategory('reference_note')).toBe('reference_material')
    expect(normalizeBookTextCategory('made_up')).toBe('reference_material')
  })

  test('normalizes legacy WorldBook source usages to canonical roles', () => {
    expect(WORLDBOOK_SOURCE_ROLES).toEqual([
      'main_worldview',
      'encyclopedia',
      'world_rule',
      'world_pack_reference',
      'profile_template',
      'reference_material',
    ])
    expect(normalizeWorldBookSourceRole('base_worldview')).toBe('main_worldview')
    expect(normalizeWorldBookSourceRole('knowledge_source')).toBe('encyclopedia')
    expect(normalizeWorldBookSourceRole('pack_source')).toBe('world_pack_reference')
    expect(normalizeWorldBookSourceRole('profile_template_reference')).toBe('profile_template')
    expect(normalizeWorldBookSourceRole('made_up')).toBe('encyclopedia')
  })

  test('returns user-facing labels for canonical values', () => {
    expect(getBookTextCategoryLabel('encyclopedia')).toEqual({
      zh: '百科',
      en: 'Encyclopedia',
    })
    expect(getWorldBookSourceRoleLabel('main_worldview')).toEqual({
      zh: '主世界观',
      en: 'Main worldview',
    })
  })

  test('picks the first normalized canonical field from mixed old and new inputs', () => {
    expect(
      pickCanonicalField(
        { category: 'world_rule', assetType: 'knowledge_note' },
        ['category', 'assetType'],
        normalizeBookTextCategory,
      ),
    ).toBe('world_rule')

    expect(
      pickCanonicalField(
        { usage: 'base_worldview' },
        ['role', 'usage'],
        normalizeWorldBookSourceRole,
      ),
    ).toBe('main_worldview')
  })
})
```

- [ ] **Step 2: Run taxonomy tests and confirm they fail**

Run:

```bash
npm.cmd test -- tests/world-taxonomy.test.js
```

Expected: FAIL because `src/lib/world-taxonomy.js` does not exist.

- [ ] **Step 3: Add the taxonomy helper**

Create `src/lib/world-taxonomy.js`:

```js
export const BOOK_TEXT_CATEGORIES = Object.freeze([
  'worldview',
  'encyclopedia',
  'world_rule',
  'profile_template',
  'reference_material',
])

export const WORLDBOOK_SOURCE_ROLES = Object.freeze([
  'main_worldview',
  'encyclopedia',
  'world_rule',
  'world_pack_reference',
  'profile_template',
  'reference_material',
])

export const LEGACY_BOOK_TEXT_CATEGORY_ALIASES = Object.freeze({
  worldbook_document: 'worldview',
  knowledge_note: 'encyclopedia',
  glossary: 'encyclopedia',
  rule_set: 'world_rule',
  profile_template_note: 'profile_template',
  reference_note: 'reference_material',
})

export const LEGACY_WORLDBOOK_SOURCE_ROLE_ALIASES = Object.freeze({
  base_worldview: 'main_worldview',
  knowledge_source: 'encyclopedia',
  pack_source: 'world_pack_reference',
  profile_template_reference: 'profile_template',
})

export const BOOK_TEXT_CATEGORY_LABELS = Object.freeze({
  worldview: { zh: '世界观', en: 'Worldview' },
  encyclopedia: { zh: '百科', en: 'Encyclopedia' },
  world_rule: { zh: '世界规则', en: 'World rules' },
  profile_template: { zh: '人设模板', en: 'Profile template' },
  reference_material: { zh: '参考资料', en: 'Reference material' },
})

export const WORLDBOOK_SOURCE_ROLE_LABELS = Object.freeze({
  main_worldview: { zh: '主世界观', en: 'Main worldview' },
  encyclopedia: { zh: '百科', en: 'Encyclopedia' },
  world_rule: { zh: '世界规则', en: 'World rules' },
  world_pack_reference: { zh: '世界包参考', en: 'World Pack reference' },
  profile_template: { zh: '人设模板', en: 'Profile template' },
  reference_material: { zh: '参考资料', en: 'Reference material' },
})

const normalizeToken = (value = '') =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const normalizeWithAliases = ({
  value,
  canonicalValues,
  aliases,
  fallback,
} = {}) => {
  const normalized = normalizeToken(value)
  if (!normalized) return fallback
  if (canonicalValues.includes(normalized)) return normalized
  return aliases[normalized] || fallback
}

export const normalizeBookTextCategory = (value = '') =>
  normalizeWithAliases({
    value,
    canonicalValues: BOOK_TEXT_CATEGORIES,
    aliases: LEGACY_BOOK_TEXT_CATEGORY_ALIASES,
    fallback: 'reference_material',
  })

export const normalizeWorldBookSourceRole = (value = '') =>
  normalizeWithAliases({
    value,
    canonicalValues: WORLDBOOK_SOURCE_ROLES,
    aliases: LEGACY_WORLDBOOK_SOURCE_ROLE_ALIASES,
    fallback: 'encyclopedia',
  })

export const getBookTextCategoryLabel = (category = '') =>
  BOOK_TEXT_CATEGORY_LABELS[normalizeBookTextCategory(category)] ||
  BOOK_TEXT_CATEGORY_LABELS.reference_material

export const getWorldBookSourceRoleLabel = (role = '') =>
  WORLDBOOK_SOURCE_ROLE_LABELS[normalizeWorldBookSourceRole(role)] ||
  WORLDBOOK_SOURCE_ROLE_LABELS.encyclopedia

export const pickCanonicalField = (source = {}, fieldNames = [], normalizeValue = (value) => value) => {
  const input = source && typeof source === 'object' ? source : {}
  for (const fieldName of fieldNames) {
    if (typeof fieldName !== 'string') continue
    const rawValue = input[fieldName]
    if (typeof rawValue !== 'string' || !rawValue.trim()) continue
    return normalizeValue(rawValue)
  }
  return normalizeValue('')
}
```

- [ ] **Step 4: Run taxonomy tests and confirm they pass**

Run:

```bash
npm.cmd test -- tests/world-taxonomy.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit taxonomy helper**

Run:

```bash
git add -- src/lib/world-taxonomy.js tests/world-taxonomy.test.js
git diff --cached --name-only
git commit -m "feat: add world taxonomy helpers"
```

Expected staged files:

```text
src/lib/world-taxonomy.js
tests/world-taxonomy.test.js
```

---

### Task 2: Book Text Schema Canonical Categories And Source Roles

**Files:**

- Modify: `src/lib/book-text-schema.js`
- Modify: `tests/book-text-schema.test.js`

- [ ] **Step 1: Update schema tests for canonical fields and legacy aliases**

In `tests/book-text-schema.test.js`, update the import block to include canonical constants:

```js
import {
  BOOK_TEXT_ASSET_TYPES,
  WORLDBOOK_SOURCE_USAGES,
  buildWorldBookSourceSnapshot,
  buildBookAssetFromImportedText,
  diffWorldBookSourceText,
  extractMarkdownSections,
  normalizeBookTextAsset,
  normalizeWorldBookSourceLinks,
  resolveWorldBookSourceText,
} from '../src/lib/book-text-schema'
```

Replace the plain text import assertion:

```js
expect(result.asset.category).toBe('worldview')
expect(result.asset.assetType).toBe('worldview')
```

Replace the structured JSON assertion:

```js
expect(result.asset.category).toBe('world_rule')
expect(result.asset.assetType).toBe('world_rule')
```

Replace the source-link assertion:

```js
expect(links[0]).toMatchObject({
  id: 'link_1',
  assetId: 'book_asset_1',
  sectionIds: ['section_a', 'section_b'],
  role: 'main_worldview',
  usage: 'main_worldview',
  enabled: true,
  priority: 2,
  sourceSnapshotText: 'A saved source baseline.',
  sourceSnapshotUpdatedAt: 1770000000000,
  sourceSnapshotCharCount: 24,
})
```

Replace the invalid asset type test:

```js
test('invalid category falls back to reference material', () => {
  const asset = normalizeBookTextAsset({
    id: 'sample',
    title: '',
    assetType: 'made_up',
    content: 'Reference material.',
    locked: 'yes',
  })

  expect(asset.title).toBe('Untitled text 1')
  expect(asset.category).toBe('reference_material')
  expect(asset.assetType).toBe('reference_material')
  expect(asset.locked).toBe(false)
  expect(asset.content).toBe('Reference material.')
})
```

Add this test near the top of the describe block:

```js
test('exports canonical category and role constants with legacy export names', () => {
  expect(BOOK_TEXT_ASSET_TYPES).toEqual([
    'worldview',
    'encyclopedia',
    'world_rule',
    'profile_template',
    'reference_material',
  ])
  expect(WORLDBOOK_SOURCE_USAGES).toEqual([
    'main_worldview',
    'encyclopedia',
    'world_rule',
    'world_pack_reference',
    'profile_template',
    'reference_material',
  ])
})
```

Add this legacy import test:

```js
test('normalizes old exported assetType and usage values into canonical fields', () => {
  const asset = normalizeBookTextAsset({
    title: 'Legacy Knowledge',
    assetType: 'knowledge_note',
    content: 'Legacy knowledge text.',
  })
  const links = normalizeWorldBookSourceLinks([
    {
      id: 'legacy_link',
      assetId: asset.id,
      usage: 'knowledge_source',
    },
  ])

  expect(asset.category).toBe('encyclopedia')
  expect(asset.assetType).toBe('encyclopedia')
  expect(links[0]).toMatchObject({
    role: 'encyclopedia',
    usage: 'encyclopedia',
  })
})
```

- [ ] **Step 2: Run schema tests and confirm they fail**

Run:

```bash
npm.cmd test -- tests/book-text-schema.test.js
```

Expected: FAIL because schema still emits old `assetType` and `usage` values.

- [ ] **Step 3: Import taxonomy helpers into `book-text-schema.js`**

At the top of `src/lib/book-text-schema.js`, add:

```js
import {
  BOOK_TEXT_CATEGORIES,
  WORLDBOOK_SOURCE_ROLES,
  normalizeBookTextCategory,
  normalizeWorldBookSourceRole,
  pickCanonicalField,
} from './world-taxonomy'
```

Replace the current `BOOK_TEXT_ASSET_TYPES` and `WORLDBOOK_SOURCE_USAGES` declarations with:

```js
export const BOOK_TEXT_ASSET_TYPES = BOOK_TEXT_CATEGORIES
export const WORLDBOOK_SOURCE_USAGES = WORLDBOOK_SOURCE_ROLES
```

Delete the two old category/role set lines:

```js
const BOOK_TEXT_ASSET_TYPE_SET = new Set(BOOK_TEXT_ASSET_TYPES)
const WORLDBOOK_SOURCE_USAGE_SET = new Set(WORLDBOOK_SOURCE_USAGES)
```

Keep the existing format and status sets untouched:

```js
const BOOK_TEXT_FORMAT_SET = new Set(BOOK_TEXT_FORMATS)
const BOOK_TEXT_STATUS_SET = new Set(BOOK_TEXT_STATUSES)
```

- [ ] **Step 4: Replace local category and role normalizers**

In `src/lib/book-text-schema.js`, replace `normalizeAssetType` with:

```js
const normalizeAssetType = (value) => normalizeBookTextCategory(value)
```

Replace `normalizeUsage` with:

```js
const normalizeUsage = (value) => normalizeWorldBookSourceRole(value)
```

- [ ] **Step 5: Make Book assets write `category` and mirror `assetType`**

Inside `normalizeBookTextAsset`, before the return object, add:

```js
  const category = pickCanonicalField(
    source,
    ['category', 'assetType', 'type'],
    normalizeBookTextCategory,
  )
```

Replace the returned `assetType` line:

```js
    assetType: normalizeAssetType(source.assetType || source.type),
```

with:

```js
    category,
    assetType: category,
```

- [ ] **Step 6: Make WorldBook source links write `role` and mirror `usage`**

Inside `normalizeWorldBookSourceLink`, before the return object, add:

```js
  const role = pickCanonicalField(
    source,
    ['role', 'usage'],
    normalizeWorldBookSourceRole,
  )
```

Replace the returned `usage` line:

```js
    usage: normalizeUsage(source.usage),
```

with:

```js
    role,
    usage: role,
```

- [ ] **Step 7: Update imported text defaults to canonical categories**

In `buildBookAssetFromImportedText`, replace both markdown and text defaults:

```js
        assetType: 'worldbook_document',
```

with:

```js
        category: 'worldview',
```

Keep JSON import unchanged because `normalizeBookTextAsset` handles both old and new fields.

- [ ] **Step 8: Run focused schema tests**

Run:

```bash
npm.cmd test -- tests/world-taxonomy.test.js tests/book-text-schema.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit schema canonicalization**

Run:

```bash
git add -- src/lib/book-text-schema.js tests/book-text-schema.test.js
git diff --cached --name-only
git commit -m "feat: canonicalize Book text schema naming"
```

Expected staged files:

```text
src/lib/book-text-schema.js
tests/book-text-schema.test.js
```

---

### Task 3: Book Store And Book UI Categories

**Files:**

- Modify: `src/stores/book.js`
- Modify: `src/views/BookView.vue`
- Modify: `tests/book-store.test.js`
- Modify: `tests/book-view.test.js`

- [ ] **Step 1: Update Book store tests to use canonical category filters**

In `tests/book-store.test.js`, replace the asset creation category field:

```js
category: 'world_rule',
```

Replace the filter assertion:

```js
expect(store.listAssets({ category: 'world_rule' })).toHaveLength(1)
expect(store.listAssets({ assetType: 'rule_set' })).toHaveLength(1)
```

In the backup test, replace:

```js
assetType: 'worldbook_document',
```

with:

```js
category: 'worldview',
```

Add this compatibility assertion inside the create/update/filter test:

```js
expect(asset.category).toBe('world_rule')
expect(asset.assetType).toBe('world_rule')
```

- [ ] **Step 2: Update Book view tests to expect canonical category values**

In `tests/book-view.test.js`, replace asset creation values:

```js
category: 'worldview',
```

where the test currently creates `assetType: 'worldbook_document'`.

In the "shows WorldBook usage" test, replace the source link input:

```js
role: 'main_worldview',
```

where it currently uses `usage: 'base_worldview'`.

Add this assertion to the "selecting an asset shows read mode by default" test:

```js
expect(wrapper.get('[data-testid="book-detail"]').text()).toContain('Worldview')
```

- [ ] **Step 3: Run focused tests and confirm they fail**

Run:

```bash
npm.cmd test -- tests/book-store.test.js tests/book-view.test.js
```

Expected: FAIL because `bookStore.listAssets` and `BookView` still read old `assetType` fields.

- [ ] **Step 4: Update Book store source eligibility and filters**

In `src/stores/book.js`, add this import:

```js
import { normalizeBookTextCategory } from '../lib/world-taxonomy'
```

In `src/stores/book.js`, replace `worldbookSourceAssets` with:

```js
  const worldbookSourceAssets = computed(() =>
    assets.value.filter((asset) => {
      const category = asset.category || asset.assetType
      return (
        asset.status === 'active_source' ||
        category === 'worldview' ||
        category === 'encyclopedia' ||
        category === 'world_rule' ||
        category === 'reference_material'
      )
    }),
  )
```

In `listAssets`, replace:

```js
const type = typeof filters.assetType === 'string' ? filters.assetType.trim() : ''
```

with:

```js
const rawCategory =
  typeof filters.category === 'string' && filters.category.trim()
    ? filters.category.trim()
    : typeof filters.assetType === 'string'
      ? filters.assetType.trim()
      : ''
const category = rawCategory ? normalizeBookTextCategory(rawCategory) : ''
```

Replace the type filter condition:

```js
if (type && asset.assetType !== type) return false
```

with:

```js
if (category && asset.category !== category && asset.assetType !== category) return false
```

- [ ] **Step 5: Update BookView imports and label map**

In `src/views/BookView.vue`, replace:

```js
import { BOOK_TEXT_ASSET_TYPES } from '../lib/book-text-schema'
```

with:

```js
import { BOOK_TEXT_ASSET_TYPES } from '../lib/book-text-schema'
import { getBookTextCategoryLabel } from '../lib/world-taxonomy'
```

Replace the entire `typeLabels` object with:

```js
const typeLabels = Object.fromEntries(
  BOOK_TEXT_ASSET_TYPES.map((category) => [category, getBookTextCategoryLabel(category)]),
)
```

- [ ] **Step 6: Move BookView draft and filters to category**

In `BookView.vue`, replace the initial draft object field:

```js
assetType: 'worldbook_document',
```

with:

```js
category: 'worldview',
```

In `filteredAssets`, replace:

```js
assetType: typeFilter.value === 'all' ? '' : typeFilter.value,
```

with:

```js
category: typeFilter.value === 'all' ? '' : typeFilter.value,
```

In `selectedAssetTypeLabel`, replace:

```js
const type = selectedAsset.value?.assetType || 'reference_note'
```

with:

```js
const type = selectedAsset.value?.category || selectedAsset.value?.assetType || 'reference_material'
```

In `beginEdit`, replace:

```js
assetType: asset?.assetType || 'worldbook_document',
```

with:

```js
category: asset?.category || asset?.assetType || 'worldview',
```

In `resetDraft`, replace:

```js
assetType: 'worldbook_document',
```

with:

```js
category: 'worldview',
```

In `hasDraftChanged`, replace:

```js
draft.value.assetType !== asset.assetType ||
```

with:

```js
draft.value.category !== (asset.category || asset.assetType) ||
```

In `saveEdit`, replace:

```js
assetType: draft.value.assetType,
```

with:

```js
category: draft.value.category,
```

- [ ] **Step 7: Update BookView template category binding**

In the asset list, replace:

```vue
{{ t(typeLabels[asset.assetType]?.zh || asset.assetType, typeLabels[asset.assetType]?.en || asset.assetType) }}
```

with:

```vue
{{ t(typeLabels[asset.category || asset.assetType]?.zh || asset.category || asset.assetType, typeLabels[asset.category || asset.assetType]?.en || asset.category || asset.assetType) }}
```

In the editor label, replace:

```vue
<span>{{ t('类型', 'Type') }}</span>
<select v-model="draft.assetType" data-testid="book-edit-type">
```

with:

```vue
<span>{{ t('分类', 'Category') }}</span>
<select v-model="draft.category" data-testid="book-edit-type">
```

Keep the `book-edit-type` test id in this task so existing tests only change behavior assertions, not selector plumbing.

- [ ] **Step 8: Run focused Book tests**

Run:

```bash
npm.cmd test -- tests/world-taxonomy.test.js tests/book-text-schema.test.js tests/book-store.test.js tests/book-view.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit Book category migration**

Run:

```bash
git add -- src/stores/book.js src/views/BookView.vue tests/book-store.test.js tests/book-view.test.js
git diff --cached --name-only
git commit -m "feat: use canonical Book categories"
```

Expected staged files:

```text
src/stores/book.js
src/views/BookView.vue
tests/book-store.test.js
tests/book-view.test.js
```

---

### Task 4: WorldBook Source Link Roles

**Files:**

- Modify: `src/stores/system.js`
- Modify: `src/views/WorldBookView.vue`
- Modify: `tests/book-worldbook-linking.test.js`
- Modify: `tests/worldbook-book-source-picker.test.js`

- [ ] **Step 1: Update source-link tests to assert canonical roles**

In `tests/book-worldbook-linking.test.js`, replace all source-link inputs:

```js
usage: 'base_worldview',
```

with:

```js
role: 'main_worldview',
```

Add this assertion to the first active source test after creating the link:

```js
expect(systemStore.listWorldBookSourceLinks()[0]).toMatchObject({
  role: 'main_worldview',
  usage: 'main_worldview',
})
```

In `tests/worldbook-book-source-picker.test.js`, replace expectations:

```js
role: 'main_worldview',
usage: 'main_worldview',
```

where the current test expects `usage: 'base_worldview'`.

Add this test near the source picker tests:

```js
test('loads old source-link usage values as canonical roles', async () => {
  const bookStore = useBookStore()
  const systemStore = useSystemStore()
  const asset = bookStore.createAsset({
    id: 'asset_legacy_usage',
    title: 'Legacy Usage',
    content: 'Legacy source text.',
  })
  systemStore.addWorldBookSourceLink({
    assetId: asset.id,
    usage: 'base_worldview',
    enabled: true,
  })

  const { wrapper } = await mountWorldBook()
  const link = systemStore.listWorldBookSourceLinks()[0]

  expect(link).toMatchObject({
    role: 'main_worldview',
    usage: 'main_worldview',
  })
  expect(wrapper.get(`[data-testid="worldbook-book-source-${link.id}"]`).text()).toContain(
    'Main worldview',
  )
})
```

- [ ] **Step 2: Run source-link tests and confirm they fail**

Run:

```bash
npm.cmd test -- tests/book-worldbook-linking.test.js tests/worldbook-book-source-picker.test.js
```

Expected: FAIL because `systemStore` and `WorldBookView` still compare and display `usage`.

- [ ] **Step 3: Update duplicate detection in `systemStore`**

In `src/stores/system.js`, inside `addWorldBookSourceLink`, replace the duplicate matcher:

```js
link.usage === normalized.usage &&
```

with:

```js
(link.role || link.usage) === (normalized.role || normalized.usage) &&
```

- [ ] **Step 4: Update WorldBookView source role labels**

In `src/views/WorldBookView.vue`, replace the taxonomy import area:

```js
import {
  WORLDBOOK_SOURCE_USAGES,
  buildWorldBookSourceSnapshot,
  diffWorldBookSourceText,
  resolveWorldBookSourceText,
} from '../lib/book-text-schema'
```

with:

```js
import {
  WORLDBOOK_SOURCE_USAGES,
  buildWorldBookSourceSnapshot,
  diffWorldBookSourceText,
  resolveWorldBookSourceText,
} from '../lib/book-text-schema'
import { getWorldBookSourceRoleLabel } from '../lib/world-taxonomy'
```

Replace `sourceUsageLabels`, `getSourceUsageCopy`, `sourceUsageOptions`, and `getSourceUsageLabel` with:

```js
const getSourceRoleCopy = (role = '') => getWorldBookSourceRoleLabel(role)

const sourceRoleOptions = computed(() =>
  WORLDBOOK_SOURCE_USAGES.map((role) => ({
    id: role,
    label: t(getSourceRoleCopy(role).zh, getSourceRoleCopy(role).en),
  })),
)

function getSourceRoleLabel(role = '') {
  const copy = getSourceRoleCopy(role)
  return t(copy.zh, copy.en)
}
```

In `linkedBookSources`, replace:

```js
usageLabel: getSourceUsageLabel(link.usage),
```

with:

```js
usageLabel: getSourceRoleLabel(link.role || link.usage),
```

- [ ] **Step 5: Update WorldBookView source picker state**

In `sourcePicker`, replace:

```js
usage: 'base_worldview',
```

with:

```js
role: 'main_worldview',
```

In every reset or default assignment, replace:

```js
sourcePicker.usage = 'base_worldview'
```

with:

```js
sourcePicker.role = 'main_worldview'
```

In `addFirstBookSource`, replace:

```js
usage: 'base_worldview',
```

with:

```js
role: 'main_worldview',
```

In `linkPickedBookSource`, replace:

```js
usage: sourcePicker.usage,
```

with:

```js
role: sourcePicker.role,
```

In `buildWorldAppTemplateContextText`, replace:

```js
`${link.title} (${link.usage || 'source'}): ${text.slice(0, 1200)}`
```

with:

```js
`${link.title} (${link.role || link.usage || 'source'}): ${text.slice(0, 1200)}`
```

- [ ] **Step 6: Update WorldBookView source picker template**

In the source picker template, replace:

```vue
<select v-model="sourcePicker.usage" data-testid="worldbook-source-picker-usage">
  <option v-for="usage in sourceUsageOptions" :key="usage.id" :value="usage.id">
    {{ usage.label }}
  </option>
</select>
```

with:

```vue
<select v-model="sourcePicker.role" data-testid="worldbook-source-picker-usage">
  <option v-for="role in sourceRoleOptions" :key="role.id" :value="role.id">
    {{ role.label }}
  </option>
</select>
```

Keep the old data-testid in this task to reduce selector churn.

- [ ] **Step 7: Run focused source-link tests**

Run:

```bash
npm.cmd test -- tests/world-taxonomy.test.js tests/book-text-schema.test.js tests/book-worldbook-linking.test.js tests/worldbook-book-source-picker.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit source role migration**

Run:

```bash
git add -- src/stores/system.js src/views/WorldBookView.vue tests/book-worldbook-linking.test.js tests/worldbook-book-source-picker.test.js
git diff --cached --name-only
git commit -m "feat: use canonical WorldBook source roles"
```

Expected staged files:

```text
src/stores/system.js
src/views/WorldBookView.vue
tests/book-worldbook-linking.test.js
tests/worldbook-book-source-picker.test.js
```

---

### Task 5: Encyclopedia Entry Store API

**Files:**

- Modify: `src/stores/system.js`
- Modify: `tests/system-world-kernel.test.js`
- Create: `tests/worldbook-naming-migration.test.js`

- [ ] **Step 1: Update system world-kernel tests for canonical encyclopedia helpers**

In `tests/system-world-kernel.test.js`, replace the first restore test assertions:

```js
expect(Array.isArray(store.user.encyclopediaEntries)).toBe(true)
expect(store.user.knowledgePoints).toBe(store.user.encyclopediaEntries)
```

Replace the lifecycle test name:

```js
test('supports encyclopedia entry add/toggle/remove lifecycle', () => {
```

Replace helper calls inside that test:

```js
const created = store.upsertEncyclopediaEntry({
```

```js
expect(store.listEncyclopediaEntries().length).toBe(1)
```

```js
const toggled = store.setEncyclopediaEntryEnabled(created.id, false)
expect(toggled).toBe(true)
expect(store.getEncyclopediaEntryById(created.id)?.enabled).toBe(false)
expect(store.listEncyclopediaEntries({ enabledOnly: true })).toHaveLength(0)
```

```js
const removed = store.removeEncyclopediaEntry(created.id)
expect(removed).toBe(true)
expect(store.getEncyclopediaEntryById(created.id)).toBe(null)
```

Add this wrapper compatibility test:

```js
test('keeps old knowledge point helpers as encyclopedia wrappers', () => {
  const store = useSystemStore()
  const created = store.upsertKnowledgePoint({
    title: 'Legacy helper entry',
    content: 'Created through old helper.',
    tags: ['legacy'],
  })

  expect(created).toBeTruthy()
  expect(store.getKnowledgePointById(created.id)).toEqual(store.getEncyclopediaEntryById(created.id))
  expect(store.listKnowledgePoints()).toEqual(store.listEncyclopediaEntries())
  expect(store.findRelevantKnowledgePoints({
    texts: ['Created through old helper.'],
    tags: ['legacy'],
  }).map((item) => item.id)).toEqual([created.id])
})
```

- [ ] **Step 2: Add old-save migration test**

Create `tests/worldbook-naming-migration.test.js`:

```js
import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookStore } from '../src/stores/book'
import { useSystemStore } from '../src/stores/system'

describe('Book and WorldBook naming migration', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('restores old Book asset and source-link names as canonical fields', () => {
    const bookStore = useBookStore()
    const systemStore = useSystemStore()

    bookStore.restoreFromBackup({
      assets: [
        {
          id: 'asset_old_book',
          title: 'Old Book Source',
          assetType: 'knowledge_note',
          content: 'Old knowledge source.',
        },
      ],
    })
    systemStore.restoreFromBackup({
      system: {
        user: {
          worldBookSourceLinks: [
            {
              id: 'source_old_usage',
              assetId: 'asset_old_book',
              usage: 'knowledge_source',
            },
          ],
        },
      },
    })

    expect(bookStore.findAssetById('asset_old_book')).toMatchObject({
      category: 'encyclopedia',
      assetType: 'encyclopedia',
    })
    expect(systemStore.listWorldBookSourceLinks()[0]).toMatchObject({
      role: 'encyclopedia',
      usage: 'encyclopedia',
    })
  })

  test('restores old knowledgePoints into canonical encyclopediaEntries', () => {
    const store = useSystemStore()

    const ok = store.restoreFromBackup({
      system: {
        user: {
          knowledgePoints: [
            {
              id: 'kp_old',
              title: 'Old point',
              content: 'Old entry body.',
              tags: ['old'],
              enabled: true,
            },
          ],
        },
      },
    })

    expect(ok).toBe(true)
    expect(store.user.encyclopediaEntries).toHaveLength(1)
    expect(store.user.knowledgePoints).toBe(store.user.encyclopediaEntries)
    expect(store.listEncyclopediaEntries()[0]).toMatchObject({
      id: 'kp_old',
      title: 'Old point',
      content: 'Old entry body.',
    })
  })
})
```

- [ ] **Step 3: Run migration tests and confirm they fail**

Run:

```bash
npm.cmd test -- tests/system-world-kernel.test.js tests/worldbook-naming-migration.test.js
```

Expected: FAIL because `systemStore` does not expose `encyclopediaEntries` or canonical helpers yet.

- [ ] **Step 4: Add encyclopedia aliases beside existing knowledge helpers**

In `src/stores/system.js`, rename the private helpers in place:

```js
const sanitizeEncyclopediaEntryId = sanitizeKnowledgePointId
const createEncyclopediaEntryId = () => `encyclopedia_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const normalizeEncyclopediaEntryTags = normalizeKnowledgePointTags
const normalizeEncyclopediaEntry = normalizeKnowledgePoint
const normalizeEncyclopediaEntryList = normalizeKnowledgePointList
const buildEncyclopediaEntryMatchContext = buildKnowledgePointMatchContext
```

Place these aliases immediately after `buildKnowledgePointMatchContext`. This keeps the first implementation small while the public API moves to encyclopedia language.

- [ ] **Step 5: Normalize world kernel with canonical encyclopedia state**

In `normalizeUserWorldKernel`, replace:

```js
knowledgePoints: normalizeKnowledgePointList(source.knowledgePoints),
```

with:

```js
encyclopediaEntries: normalizeEncyclopediaEntryList(
  Array.isArray(source.encyclopediaEntries) ? source.encyclopediaEntries : source.knowledgePoints,
),
```

- [ ] **Step 6: Add default user encyclopedia state**

In the default `user` object, after `knowledgePoints: [],`, add:

```js
encyclopediaEntries: [],
```

- [ ] **Step 7: Replace internal knowledge helper implementations with canonical helpers**

In `src/stores/system.js`, add these functions before the old `getKnowledgePointById`:

```js
  const getEncyclopediaEntryById = (entryId) => {
    const id = sanitizeEncyclopediaEntryId(entryId)
    if (!id) return null
    return user.encyclopediaEntries.find((item) => item.id === id) || null
  }

  const listEncyclopediaEntries = (options = {}) => {
    const enabledOnly = Boolean(options.enabledOnly)
    const keywordRaw = typeof options.keyword === 'string' ? options.keyword.trim().toLowerCase() : ''
    return user.encyclopediaEntries.filter((item) => {
      if (enabledOnly && item.enabled === false) return false
      if (!keywordRaw) return true
      const haystack = `${item.title || ''}\n${item.content || ''}\n${Array.isArray(item.tags) ? item.tags.join(' ') : ''}`.toLowerCase()
      return haystack.includes(keywordRaw)
    })
  }

  const findRelevantEncyclopediaEntries = (options = {}) => {
    const enabledOnly = options.enabledOnly !== false
    const limit = clamp(toInt(options.limit, 3), 1, 8)
    const matchContext = buildEncyclopediaEntryMatchContext(options)
    if (
      matchContext.tokens.length === 0 &&
      matchContext.phrases.length === 0 &&
      matchContext.tags.length === 0
    ) {
      return []
    }

    return listEncyclopediaEntries({ enabledOnly })
      .map((item) => {
        const title = normalizeKnowledgePointMatchValue(item.title, MAX_KNOWLEDGE_POINT_TITLE_CHARS)
        const content = normalizeKnowledgePointMatchValue(
          item.content,
          MAX_KNOWLEDGE_POINT_CONTENT_CHARS,
        )
        const tags = normalizeEncyclopediaEntryTags(item.tags).map((tag) => tag.toLowerCase())
        let score = 0
        let tagHits = 0
        let titleHits = 0
        let contentHits = 0
        let phraseHits = 0

        matchContext.tags.forEach((term) => {
          if (tags.includes(term)) {
            score += 8
            tagHits += 1
          }
        })
        matchContext.tokens.forEach((term) => {
          if (tags.includes(term)) score += 5
          if (title.includes(term)) {
            score += term.length >= 4 ? 5 : 4
            titleHits += 1
            return
          }
          if (content.includes(term)) {
            score += term.length >= 4 ? 3 : 2
            contentHits += 1
          }
        })
        matchContext.phrases.forEach((phrase) => {
          if (title.includes(phrase)) {
            score += 6
            phraseHits += 1
            return
          }
          if (content.includes(phrase)) {
            score += 4
            phraseHits += 1
          }
        })

        const hasConfidentMatch =
          tagHits > 0 || phraseHits > 0 || titleHits + contentHits >= 2
        if (!hasConfidentMatch || score <= 0) return null
        return { item, score }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || b.item.updatedAt - a.item.updatedAt)
      .slice(0, limit)
      .map(({ item }) => item)
  }

  const upsertEncyclopediaEntry = (payload = {}) => {
    const input = payload && typeof payload === 'object' ? payload : {}
    const requestedId = sanitizeEncyclopediaEntryId(input.id)
    const normalized = normalizeEncyclopediaEntry(input, user.encyclopediaEntries.length)
    if (!normalized) return null

    if (requestedId) {
      const index = user.encyclopediaEntries.findIndex((item) => item.id === requestedId)
      if (index >= 0) {
        const existing = user.encyclopediaEntries[index]
        const next = {
          ...existing,
          ...normalized,
          id: requestedId,
          createdAt: existing.createdAt,
          updatedAt: Date.now(),
        }
        user.encyclopediaEntries.splice(index, 1, next)
        user.knowledgePoints = user.encyclopediaEntries
        return next
      }
    }

    if (user.encyclopediaEntries.length >= MAX_KNOWLEDGE_POINTS) return null
    const created = {
      ...normalized,
      id: requestedId || normalized.id || createEncyclopediaEntryId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    user.encyclopediaEntries.push(created)
    user.knowledgePoints = user.encyclopediaEntries
    return created
  }

  const setEncyclopediaEntryEnabled = (entryId, enabled) => {
    const item = getEncyclopediaEntryById(entryId)
    if (!item) return false
    item.enabled = enabled !== false
    item.updatedAt = Date.now()
    return true
  }

  const removeEncyclopediaEntry = (entryId) => {
    const id = sanitizeEncyclopediaEntryId(entryId)
    if (!id) return false
    const index = user.encyclopediaEntries.findIndex((item) => item.id === id)
    if (index < 0) return false
    user.encyclopediaEntries.splice(index, 1)
    user.knowledgePoints = user.encyclopediaEntries
    return true
  }
```

Then replace the old public helper bodies with wrappers:

```js
  const getKnowledgePointById = getEncyclopediaEntryById
  const listKnowledgePoints = listEncyclopediaEntries
  const findRelevantKnowledgePoints = findRelevantEncyclopediaEntries
  const upsertKnowledgePoint = upsertEncyclopediaEntry
  const setKnowledgePointEnabled = setEncyclopediaEntryEnabled
  const removeKnowledgePoint = removeEncyclopediaEntry
```

- [ ] **Step 8: Wire restore and persistence to the canonical array**

In `applyPersistedSnapshot`, replace:

```js
user.knowledgePoints = normalizedWorldKernel.knowledgePoints
```

with:

```js
user.encyclopediaEntries = normalizedWorldKernel.encyclopediaEntries
user.knowledgePoints = user.encyclopediaEntries
```

In `persistToStorage`, replace:

```js
knowledgePoints: Array.isArray(user.knowledgePoints)
  ? user.knowledgePoints.map((item) => ({
      ...item,
      tags: Array.isArray(item.tags) ? [...item.tags] : [],
    }))
  : [],
```

with:

```js
encyclopediaEntries: Array.isArray(user.encyclopediaEntries)
  ? user.encyclopediaEntries.map((item) => ({
      ...item,
      tags: Array.isArray(item.tags) ? [...item.tags] : [],
    }))
  : [],
knowledgePoints: Array.isArray(user.encyclopediaEntries)
  ? user.encyclopediaEntries.map((item) => ({
      ...item,
      tags: Array.isArray(item.tags) ? [...item.tags] : [],
    }))
  : [],
```

The mirrored `knowledgePoints` field is intentionally kept for one transition window.

- [ ] **Step 9: Export canonical helpers from the store return object**

In the store return object, add the new helpers before the old helpers:

```js
    getEncyclopediaEntryById,
    listEncyclopediaEntries,
    findRelevantEncyclopediaEntries,
    upsertEncyclopediaEntry,
    setEncyclopediaEntryEnabled,
    removeEncyclopediaEntry,
```

- [ ] **Step 10: Run focused system tests**

Run:

```bash
npm.cmd test -- tests/system-world-kernel.test.js tests/worldbook-naming-migration.test.js
```

Expected: PASS.

- [ ] **Step 11: Commit encyclopedia store API**

Run:

```bash
git add -- src/stores/system.js tests/system-world-kernel.test.js tests/worldbook-naming-migration.test.js
git diff --cached --name-only
git commit -m "feat: add encyclopedia entry store API"
```

Expected staged files:

```text
src/stores/system.js
tests/system-world-kernel.test.js
tests/worldbook-naming-migration.test.js
```

---

### Task 6: Role Binding, World Pack, And World Interface Encyclopedia IDs

**Files:**

- Modify: `src/stores/system.js`
- Modify: `src/stores/chat.js`
- Modify: `src/lib/role-binding-contract.js`
- Modify: `src/lib/world-pack-schema.js`
- Modify: `src/lib/world-interface.js`
- Modify: `src/lib/simulation/world-context.js`
- Modify: `tests/chat-role-knowledge-binding.test.js`
- Modify: `tests/world-pack-schema.test.js`
- Modify: `tests/world-interface.test.js`
- Modify: `tests/simulation-world-context.test.js`
- Modify: `tests/worldbook-naming-migration.test.js`

- [ ] **Step 1: Update role binding tests for canonical ids and old aliases**

In `tests/chat-role-knowledge-binding.test.js`, rename the first test:

```js
test('normalizes encyclopediaEntryIds and mirrors legacy knowledgePointIds', () => {
```

Replace profile creation:

```js
encyclopediaEntryIds: ['kp_a', 'kp_a', 'invalid id', 'kp_b'],
```

Replace assertions:

```js
expect(profile.encyclopediaEntryIds).toEqual(['kp_a', 'kp_b'])
expect(profile.knowledgePointIds).toEqual(['kp_a', 'kp_b'])
```

Replace contract assertion:

```js
expect(contract.profile.encyclopediaEntryIds).toEqual(['kp_a', 'kp_b'])
expect(contract.profile.knowledgePointIds).toEqual(['kp_a', 'kp_b'])
```

Add this legacy input test:

```js
test('accepts legacy knowledgePointIds when updating role profiles', () => {
  const store = useChatStore()
  const profile = store.addRoleProfile({
    name: 'Iris',
    role: 'Operator',
  })

  const ok = store.updateRoleProfile(profile.id, {
    knowledgePointIds: ['kp_1', 'kp_2', 'kp_2'],
  })

  expect(ok).toBe(true)
  expect(store.getRoleProfileById(profile.id)?.encyclopediaEntryIds).toEqual(['kp_1', 'kp_2'])
  expect(store.getRoleProfileById(profile.id)?.knowledgePointIds).toEqual(['kp_1', 'kp_2'])
})
```

- [ ] **Step 2: Update world pack and world interface tests**

In `tests/world-pack-schema.test.js`, replace pack input:

```js
encyclopediaEntryIds: ['kp_live', 'kp_missing'],
```

Replace review input:

```js
encyclopediaEntries: [{ id: 'kp_live' }],
```

Replace summary assertion:

```js
encyclopediaEntryCount: 2,
```

Keep `knowledgeCount` assertions if current UI still mirrors them; add:

```js
expect(review.summary.knowledgeCount).toBe(2)
```

Replace blocker assertions from:

```js
expect(review.blockers).toEqual([{ type: 'missing_knowledge', id: 'kp_missing' }])
```

to:

```js
expect(review.blockers).toEqual([{ type: 'missing_encyclopedia_entry', id: 'kp_missing' }])
```

In `tests/world-interface.test.js`, update the fake store:

```js
encyclopediaEntries = [],
```

Set both arrays in `user`:

```js
encyclopediaEntries,
knowledgePoints: encyclopediaEntries,
```

Add a canonical helper:

```js
listEncyclopediaEntries(options = {}) {
  return options.enabledOnly
    ? this.user.encyclopediaEntries.filter((point) => point.enabled !== false)
    : this.user.encyclopediaEntries
},
```

Replace role profile data with:

```js
encyclopediaEntryIds: ['kp_city', 'kp_hidden'],
```

Add assertions:

```js
expect(context.injectedEntries?.map((entry) => entry.id)).toEqual(['kp_city'])
expect(context.injectedPoints.map((point) => point.id)).toEqual(['kp_city'])
```

- [ ] **Step 3: Run focused tests and confirm they fail**

Run:

```bash
npm.cmd test -- tests/chat-role-knowledge-binding.test.js tests/world-pack-schema.test.js tests/world-interface.test.js
```

Expected: FAIL because profile, pack, system-store pack cloning, and interface layers still only know `knowledgePointIds`.

- [ ] **Step 4: Update role profile normalization in `chat.js`**

In `src/stores/chat.js`, inside `normalizeRoleProfile`, replace:

```js
knowledgePointIds: normalizeKnowledgePointIds(rawProfile?.knowledgePointIds),
```

with:

```js
encyclopediaEntryIds: normalizeKnowledgePointIds(
  rawProfile?.encyclopediaEntryIds || rawProfile?.knowledgePointIds,
),
knowledgePointIds: normalizeKnowledgePointIds(
  rawProfile?.encyclopediaEntryIds || rawProfile?.knowledgePointIds,
),
```

In `updateRoleProfile`, replace:

```js
if (Array.isArray(updates.knowledgePointIds)) {
  target.knowledgePointIds = normalizeKnowledgePointIds(updates.knowledgePointIds)
}
```

with:

```js
if (Array.isArray(updates.encyclopediaEntryIds) || Array.isArray(updates.knowledgePointIds)) {
  const nextIds = normalizeKnowledgePointIds(updates.encyclopediaEntryIds || updates.knowledgePointIds)
  target.encyclopediaEntryIds = nextIds
  target.knowledgePointIds = nextIds
}
```

When cloning/persisting role profiles, include both fields:

```js
encyclopediaEntryIds: Array.isArray(profile.encyclopediaEntryIds)
  ? [...profile.encyclopediaEntryIds]
  : [],
knowledgePointIds: Array.isArray(profile.knowledgePointIds)
  ? [...profile.knowledgePointIds]
  : [],
```

- [ ] **Step 5: Update role binding contract**

In `src/lib/role-binding-contract.js`, rename helper variables in place:

```js
const normalizeEncyclopediaEntryIdList = normalizeKnowledgePointIdList
```

Place it immediately after `normalizeKnowledgePointIdList`.

In `normalizeProfileTemplateLinkForContract`, replace:

```js
supplementalKnowledgePointIds: normalizeKnowledgePointIdList(
  source.supplementalKnowledgePointIds || source.knowledgePointIds,
),
```

with:

```js
supplementalEncyclopediaEntryIds: normalizeEncyclopediaEntryIdList(
  source.supplementalEncyclopediaEntryIds ||
    source.encyclopediaEntryIds ||
    source.supplementalKnowledgePointIds ||
    source.knowledgePointIds,
),
supplementalKnowledgePointIds: normalizeKnowledgePointIdList(
  source.supplementalEncyclopediaEntryIds ||
    source.encyclopediaEntryIds ||
    source.supplementalKnowledgePointIds ||
    source.knowledgePointIds,
),
```

In the returned `profile` object, replace:

```js
knowledgePointIds: normalizeKnowledgePointIdList(profileInput.knowledgePointIds),
```

with:

```js
encyclopediaEntryIds: normalizeEncyclopediaEntryIdList(
  profileInput.encyclopediaEntryIds || profileInput.knowledgePointIds,
),
knowledgePointIds: normalizeKnowledgePointIdList(
  profileInput.encyclopediaEntryIds || profileInput.knowledgePointIds,
),
```

- [ ] **Step 6: Update World Pack schema**

In `src/lib/world-pack-schema.js`, inside `normalizeWorldPack`, replace:

```js
knowledgePointIds: normalizeStringList(source.knowledgePointIds),
```

with:

```js
encyclopediaEntryIds: normalizeStringList(source.encyclopediaEntryIds || source.knowledgePointIds),
knowledgePointIds: normalizeStringList(source.encyclopediaEntryIds || source.knowledgePointIds),
```

In `buildWorldPackActivationReview`, replace the function params:

```js
  knowledgePoints = [],
```

with:

```js
  encyclopediaEntries = [],
  knowledgePoints = [],
```

Replace the map:

```js
const knowledgeMap = buildReferenceMap(knowledgePoints)
```

with:

```js
const encyclopediaMap = buildReferenceMap(
  Array.isArray(encyclopediaEntries) && encyclopediaEntries.length > 0
    ? encyclopediaEntries
    : knowledgePoints,
)
```

Replace blockers:

```js
normalizedPack.knowledgePointIds.forEach((id) => {
  if (!knowledgeMap.has(id)) blockers.push({ type: 'missing_knowledge', id })
})
```

with:

```js
normalizedPack.encyclopediaEntryIds.forEach((id) => {
  if (!encyclopediaMap.has(id)) blockers.push({ type: 'missing_encyclopedia_entry', id })
})
```

Replace effect row:

```js
{
  key: 'knowledge',
  label: 'Knowledge',
  count: normalizedPack.knowledgePointIds.length,
},
```

with:

```js
{
  key: 'encyclopedia',
  label: 'Encyclopedia',
  count: normalizedPack.encyclopediaEntryIds.length,
},
```

Replace summary fields:

```js
encyclopediaEntryCount: normalizedPack.encyclopediaEntryIds.length,
knowledgeCount: normalizedPack.encyclopediaEntryIds.length,
```

- [ ] **Step 7: Update systemStore World Pack cloning and review inputs**

In `src/stores/system.js`, inside `listWorldPacks`, add canonical cloned ids before `knowledgePointIds`:

```js
encyclopediaEntryIds: Array.isArray(pack.encyclopediaEntryIds)
  ? [...pack.encyclopediaEntryIds]
  : Array.isArray(pack.knowledgePointIds)
    ? [...pack.knowledgePointIds]
    : [],
knowledgePointIds: Array.isArray(pack.encyclopediaEntryIds)
  ? [...pack.encyclopediaEntryIds]
  : Array.isArray(pack.knowledgePointIds)
    ? [...pack.knowledgePointIds]
    : [],
```

In `buildWorldPackActivationReview`, replace:

```js
knowledgePoints: listKnowledgePoints({ enabledOnly: false }),
```

with:

```js
encyclopediaEntries: listEncyclopediaEntries({ enabledOnly: false }),
knowledgePoints: listKnowledgePoints({ enabledOnly: false }),
```

In `persistToStorage`, inside the `worldPacks` map, replace the existing `knowledgePointIds` clone with:

```js
encyclopediaEntryIds: Array.isArray(pack.encyclopediaEntryIds)
  ? [...pack.encyclopediaEntryIds]
  : Array.isArray(pack.knowledgePointIds)
    ? [...pack.knowledgePointIds]
    : [],
knowledgePointIds: Array.isArray(pack.encyclopediaEntryIds)
  ? [...pack.encyclopediaEntryIds]
  : Array.isArray(pack.knowledgePointIds)
    ? [...pack.knowledgePointIds]
    : [],
```

- [ ] **Step 8: Update World Interface**

In `src/lib/world-interface.js`, replace private `normalizeKnowledgePoint` with:

```js
const normalizeEncyclopediaEntry = (entry = {}) => ({
  ...entry,
  id: normalizeText(entry?.id),
  title: normalizeText(entry?.title, 'Encyclopedia entry'),
  content: normalizeText(entry?.content),
  tags: Array.isArray(entry?.tags) ? entry.tags.filter((tag) => normalizeText(tag)) : [],
  enabled: entry?.enabled !== false,
})
```

Add a compatibility alias:

```js
const normalizeKnowledgePoint = normalizeEncyclopediaEntry
```

Replace `listKnowledgePointsFromStore` with:

```js
const listEncyclopediaEntriesFromStore = (systemStore) => {
  if (typeof systemStore?.listEncyclopediaEntries === 'function') {
    return systemStore.listEncyclopediaEntries()
  }
  if (typeof systemStore?.listKnowledgePoints === 'function') {
    return systemStore.listKnowledgePoints()
  }
  if (Array.isArray(systemStore?.user?.encyclopediaEntries)) return systemStore.user.encyclopediaEntries
  return Array.isArray(systemStore?.user?.knowledgePoints) ? systemStore.user.knowledgePoints : []
}

const listKnowledgePointsFromStore = listEncyclopediaEntriesFromStore
```

In `resolveRoleKnowledgeState`, replace configured ids:

```js
const configuredIds = Array.isArray(profile.encyclopediaEntryIds)
  ? profile.encyclopediaEntryIds.filter((id) => normalizeText(id))
  : Array.isArray(profile.knowledgePointIds)
    ? profile.knowledgePointIds.filter((id) => normalizeText(id))
    : []
```

In the returned state, add canonical aliases:

```js
enabledEntries: enabledPoints,
injectedEntries: injectedPoints,
injectedEntryCount: injectedPoints.length,
```

In `buildWorldPromptBlock`, replace:

```js
`Supplemental role-bound knowledge points: ${boundSummary}.`,
```

with:

```js
`Supplemental role-bound encyclopedia entries: ${boundSummary}.`,
```

In `resolveActiveWorldOverview`, keep old count names and add canonical count names:

```js
encyclopediaEntryCount: points.length,
enabledEncyclopediaEntryCount: enabledKnowledgeCount,
disabledEncyclopediaEntryCount: disabledKnowledgeCount,
```

- [ ] **Step 9: Update simulation world context**

In `src/lib/simulation/world-context.js`, rename function parameters by accepting both:

```js
const collectText = ({ globalWorldview = '', encyclopediaEntries = [], knowledgePoints = [] } = {}) => {
  const entries = Array.isArray(encyclopediaEntries) && encyclopediaEntries.length > 0
    ? encyclopediaEntries
    : knowledgePoints
  const pointText = Array.isArray(entries)
    ? entries
        .map((point) => `${point?.title || ''} ${point?.content || ''} ${(point?.tags || []).join(' ')}`)
        .join(' ')
    : ''
  return `${globalWorldview || ''} ${pointText}`.toLowerCase()
}
```

Apply the same `entries` fallback inside `resolveWorldContextFamily` and `resolveWorldContextFromWorldBook`.

In `resolveWorldContextFromSystemStore`, replace:

```js
const knowledgePoints =
  typeof systemStore?.listKnowledgePoints === 'function'
    ? systemStore.listKnowledgePoints({ enabledOnly: true })
    : user.knowledgePoints
```

with:

```js
const encyclopediaEntries =
  typeof systemStore?.listEncyclopediaEntries === 'function'
    ? systemStore.listEncyclopediaEntries({ enabledOnly: true })
    : typeof systemStore?.listKnowledgePoints === 'function'
      ? systemStore.listKnowledgePoints({ enabledOnly: true })
      : user.encyclopediaEntries || user.knowledgePoints
```

Pass both names for compatibility:

```js
encyclopediaEntries,
knowledgePoints: encyclopediaEntries,
```

- [ ] **Step 10: Run focused contract/context tests**

Run:

```bash
npm.cmd test -- tests/chat-role-knowledge-binding.test.js tests/world-pack-schema.test.js tests/world-interface.test.js tests/simulation-world-context.test.js tests/worldbook-naming-migration.test.js
```

Expected: PASS.

- [ ] **Step 11: Commit encyclopedia ids across contracts**

Run:

```bash
git add -- src/stores/system.js src/stores/chat.js src/lib/role-binding-contract.js src/lib/world-pack-schema.js src/lib/world-interface.js src/lib/simulation/world-context.js tests/chat-role-knowledge-binding.test.js tests/world-pack-schema.test.js tests/world-interface.test.js tests/simulation-world-context.test.js tests/worldbook-naming-migration.test.js
git diff --cached --name-only
git commit -m "feat: migrate world bindings to encyclopedia ids"
```

Expected staged files:

```text
src/stores/system.js
src/stores/chat.js
src/lib/role-binding-contract.js
src/lib/world-pack-schema.js
src/lib/world-interface.js
src/lib/simulation/world-context.js
tests/chat-role-knowledge-binding.test.js
tests/world-pack-schema.test.js
tests/world-interface.test.js
tests/simulation-world-context.test.js
tests/worldbook-naming-migration.test.js
```

---

### Task 7: WorldBook, Chat, Map, And Calendar User Copy

**Files:**

- Modify: `src/views/WorldBookView.vue`
- Modify: `src/lib/worldbook-navigation.js`
- Modify: `src/components/worldbook/WorldBookOverview.vue`
- Modify: `src/components/worldbook/CurrentWorldPackPanel.vue`
- Modify: `src/components/chat/ChatThreadMenuPanel.vue`
- Modify: `src/components/calendar/CalendarEventCard.vue`
- Modify: `src/components/calendar/CalendarMapReminderCard.vue`
- Modify: `src/components/map/MapAreaFeedbackPanel.vue`
- Modify: `src/components/map/MapRouteFamiliarityPanel.vue`
- Modify: `src/components/map/MapTripHistoryPanel.vue`
- Modify: `tests/worldbook-view-filters.test.js`
- Modify: `tests/worldbook-functional-ia.test.js`
- Modify: `tests/calendar-worldbook-context.test.js`

- [ ] **Step 1: Update visible-copy assertions in tests**

In `tests/worldbook-view-filters.test.js`, keep existing data-test ids and helper calls, but rename test titles:

```js
test('supports keyword search and tag filters for encyclopedia entries', async () => {
```

```js
test('supports editing an existing encyclopedia entry in place', async () => {
```

Add this assertion after mounting:

```js
expect(wrapper.text()).toContain('Encyclopedia')
expect(wrapper.text()).not.toContain('Knowledge points')
```

In `tests/worldbook-functional-ia.test.js`, update assertions that check tab or panel text from `Knowledge` to `Encyclopedia`.

In `tests/calendar-worldbook-context.test.js`, update visible copy expectations from `Related knowledge points` to:

```js
expect(wrapper.text()).toContain('Related encyclopedia')
```

- [ ] **Step 2: Run UI copy tests and confirm they fail**

Run:

```bash
npm.cmd test -- tests/worldbook-view-filters.test.js tests/worldbook-functional-ia.test.js tests/calendar-worldbook-context.test.js
```

Expected: FAIL because UI copy still says "Knowledge points".

- [ ] **Step 3: Update `worldbook-navigation.js` route aliases**

In `src/lib/worldbook-navigation.js`, keep `normalizeWorldBookPointIds` as a wrapper and add:

```js
export const normalizeWorldBookEntryIds = normalizeWorldBookPointIds
```

In `buildWorldBookRouteQuery`, read either:

```js
const entryIds = normalizeWorldBookEntryIds(options.entryIds || options.pointIds)
```

Replace writes:

```js
if (entryIds.length === 1) {
  query.entry = entryIds[0]
  query.point = entryIds[0]
} else if (entryIds.length > 1) {
  query.entries = entryIds.join(',')
  query.points = entryIds.join(',')
}
```

This keeps old links working while adding canonical query names.

- [ ] **Step 4: Update WorldBookView computed names and visible copy**

In `src/views/WorldBookView.vue`, keep internal `knowledge*` variable names for this pass if changing them causes churn. Update visible copy only.

Replace tab label:

```js
label: t('百科', 'Encyclopedia'),
```

Replace setup title:

```js
title: t('百科', 'Encyclopedia'),
```

Replace save notices:

```js
uiNotice.value = t('百科条目保存失败（可能已达上限）。', 'Encyclopedia entry save failed (limit reached).')
pulseSaved(t('百科条目已添加。', 'Encyclopedia entry added.'))
pulseSaved(t('百科条目已更新。', 'Encyclopedia entry updated.'))
pulseSaved(t('百科条目已删除。', 'Encyclopedia entry deleted.'))
```

Replace delete dialog:

```js
title: t('删除百科条目', 'Delete encyclopedia entry'),
message: `${t('确认删除百科条目', 'Delete encyclopedia entry')}「${point.title || ''}」？`,
```

Replace panel hero copy:

```vue
<h2>{{ t('百科', 'Encyclopedia') }}</h2>
<p>
  {{
    t(
      '百科用于记录组织、术语、社会规则、行业常识和额外设定；绑定到角色后，才会进入对应 Chat 上下文。',
      'Encyclopedia entries store organizations, terms, social rules, domain facts, and extra lore; they enter Chat context only after role binding.',
    )
  }}
</p>
```

Replace composer labels:

```vue
:aria-label="isEditingKnowledgePoint ? t('编辑百科条目', 'Edit encyclopedia entry') : t('新增百科条目', 'Add encyclopedia entry')"
```

```vue
<p>{{ t('百科补充', 'Encyclopedia patch') }}</p>
<h3>{{ isEditingKnowledgePoint ? t('编辑百科条目', 'Edit encyclopedia entry') : t('新增百科条目', 'Add encyclopedia entry') }}</h3>
```

```vue
:placeholder="t('百科标题（如：打歌节目规则）', 'Entry title (e.g. music show rules)')"
:placeholder="t('百科内容', 'Encyclopedia entry content')"
```

Replace empty states:

```vue
{{ t('暂无百科条目。', 'No encyclopedia entries yet.') }}
{{ t('当前筛选下没有百科条目。', 'No encyclopedia entries match the current filter.') }}
```

Replace usage description:

```js
return t('还没有角色绑定这个百科条目。', 'No role profile is bound to this entry yet.')
```

Replace the Chat prompt copy in `buildWorldAppTemplateContextText`:

```js
knowledgeLines.length ? ['Enabled encyclopedia:', ...knowledgeLines].join('\n') : 'Enabled encyclopedia: none',
```

- [ ] **Step 5: Update WorldBook overview and pack panel copy**

In `src/components/worldbook/WorldBookOverview.vue`, replace visible labels:

```vue
<span>{{ t('百科', 'Encyclopedia') }}</span>
```

In `src/components/worldbook/CurrentWorldPackPanel.vue`, replace:

```js
label: t('启用百科', 'Enabled encyclopedia'),
```

and:

```js
knowledge: t('百科', 'Encyclopedia'),
```

- [ ] **Step 6: Update Chat thread copy**

In `src/components/chat/ChatThreadMenuPanel.vue`, replace:

```js
'Chat 会始终读取主世界观，并只注入当前角色已绑定且启用的百科条目。',
'Chat always reads the main worldview and only injects enabled encyclopedia entries bound to this role.',
```

Replace heading:

```vue
{{ t('当前注入的百科条目', 'Encyclopedia entries in effect') }}
```

Replace empty copy:

```js
'当前没有可注入的启用百科条目。',
'There are no enabled bound encyclopedia entries active for this thread.',
```

- [ ] **Step 7: Update Map and Calendar embedded copy**

In these files:

- `src/components/calendar/CalendarEventCard.vue`
- `src/components/calendar/CalendarMapReminderCard.vue`
- `src/components/map/MapAreaFeedbackPanel.vue`
- `src/components/map/MapRouteFamiliarityPanel.vue`
- `src/components/map/MapTripHistoryPanel.vue`

Replace:

```vue
{{ t('Related knowledge points', 'Related knowledge points') }}
```

with:

```vue
{{ t('相关百科', 'Related encyclopedia') }}
```

Do not rename props in this task unless a focused test requires it; these props are internal component contracts and can be renamed in a later cleanup once user-facing names are stable.

- [ ] **Step 8: Run focused UI tests and mojibake guard**

Before running tests, scan for remaining user-visible old copy:

```bash
rg -n "Knowledge point|Knowledge points|Knowledge management|knowledge points|知识点|知识补充" src/views/WorldBookView.vue src/components/worldbook src/components/chat src/components/calendar src/components/map
```

Expected: remaining hits are only internal variable names, data-test ids, CSS class names, or old compatibility helper names. User-visible `t(...)` copy should use encyclopedia language.

Run:

```bash
npm.cmd test -- tests/worldbook-view-filters.test.js tests/worldbook-functional-ia.test.js tests/calendar-worldbook-context.test.js tests/mojibake-guard.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit user-facing copy cleanup**

Run:

```bash
git add -- src/views/WorldBookView.vue src/lib/worldbook-navigation.js src/components/worldbook/WorldBookOverview.vue src/components/worldbook/CurrentWorldPackPanel.vue src/components/chat/ChatThreadMenuPanel.vue src/components/calendar/CalendarEventCard.vue src/components/calendar/CalendarMapReminderCard.vue src/components/map/MapAreaFeedbackPanel.vue src/components/map/MapRouteFamiliarityPanel.vue src/components/map/MapTripHistoryPanel.vue tests/worldbook-view-filters.test.js tests/worldbook-functional-ia.test.js tests/calendar-worldbook-context.test.js
git diff --cached --name-only
git commit -m "feat: rename WorldBook knowledge UI to encyclopedia"
```

Expected staged files are exactly the files listed in this task.

---

### Task 8: Full Migration Regression And Documentation Sync

**Files:**

- Modify: `tests/worldbook-naming-migration.test.js`
- Modify: `docs/pm/MODULE_NAME_GLOSSARY.md`
- Modify: `docs/pm/module-architecture-governance/README.md`
- Modify: `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`
- Modify: `docs/superpowers/specs/2026-06-03-book-worldbook-naming-unification-design.md`

- [ ] **Step 1: Extend migration tests to cover role profiles and World Packs**

Append to `tests/worldbook-naming-migration.test.js`:

```js
test('restores old role and pack knowledge ids as canonical encyclopedia ids', () => {
  const systemStore = useSystemStore()

  const restored = systemStore.restoreFromBackup({
    system: {
      user: {
        knowledgePoints: [{ id: 'kp_pack', title: 'Pack entry', content: 'Pack body.' }],
        worldPacks: [
          {
            id: 'legacy_pack',
            title: 'Legacy Pack',
            knowledgePointIds: ['kp_pack'],
          },
        ],
      },
    },
  })

  expect(restored).toBe(true)
  const pack = systemStore.listWorldPacks().find((item) => item.id === 'legacy_pack')
  expect(pack).toMatchObject({
    encyclopediaEntryIds: ['kp_pack'],
    knowledgePointIds: ['kp_pack'],
  })
  expect(systemStore.buildWorldPackActivationReview('legacy_pack').blocked).toBe(false)
  expect(systemStore.buildWorldPackActivationReview('legacy_pack').blockers).not.toContainEqual({
    type: 'missing_encyclopedia_entry',
    id: 'kp_pack',
  })
})
```

- [ ] **Step 2: Run the migration test**

Run:

```bash
npm.cmd test -- tests/worldbook-naming-migration.test.js
```

Expected: PASS.

- [ ] **Step 3: Update module glossary**

In `docs/pm/MODULE_NAME_GLOSSARY.md`, update the WorldBook and Book notes to canonical product language:

```md
| 世界书 | WorldBook | `/worldbook` | route only | Settings/context entry | worldview, encyclopedia entries, world rules, profile templates, source activation, and World Pack governance |
| 文本库 | Book | `/book` | `app_book` | recoverable Home/App Store app | reusable text library for worldview documents, encyclopedia material, world rules, profile templates, and references |
```

- [ ] **Step 4: Update architecture governance docs**

In `docs/pm/module-architecture-governance/README.md`, replace the current note sentence that mentions active WorldBook/world-context reading with:

```md
Current note: `src/lib/world-interface.js` is the shared seam for active WorldBook/world-context reading, including active Book source links, encyclopedia entries, and active World Pack metadata. Book V1 is now long-form text-source storage, while WorldBook remains the activation surface. World Pack service-account templates currently surface as Chat-add availability and should be added from Chat once the Chat-side flow exists. World app bindings are centralized through `src/lib/world-pack-app-bindings.js`, with Shopping/Food Delivery/Calendar/Map as current target-app consumers and App Store/Home as the global entry-management path. Nonstandard app proposals pass through `src/lib/world-app-template-registry.js` and the WorldBook Current World Pack review UI before any appBinding is written; unsupported proposals such as `black_market` stay rejected until a dedicated app shell exists.
```

In `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`, add this item under "What is already landed":

```md
8. Book / WorldBook naming has been unified around canonical worldview, encyclopedia, world-rule, profile-template, source-role, and reference concepts. Legacy Book `assetType`, source-link `usage`, `knowledgePoints`, and `knowledgePointIds` remain readable through compatibility aliases.
```

- [ ] **Step 5: Mark the naming spec implemented**

In `docs/superpowers/specs/2026-06-03-book-worldbook-naming-unification-design.md`, change:

```md
Status: `DESIGN_REVIEW`
```

to:

```md
Status: `IMPLEMENTED_COMPATIBILITY_BASELINE`
```

Add this implementation note after the status line:

```md
Implementation note, 2026-06-03:

- The canonical taxonomy is now implemented in `src/lib/world-taxonomy.js`.
- Book writes canonical `category` while still accepting old `assetType`.
- WorldBook source links write canonical `role` while still accepting old `usage`.
- Structured reusable world facts now have canonical encyclopedia helpers while old knowledge-point helpers remain wrappers for compatibility.
- Role bindings and World Packs accept canonical encyclopedia ids and old knowledge ids during the migration window.
```

- [ ] **Step 6: Run full validation**

Run:

```bash
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Expected:

- `npm.cmd run lint`: PASS.
- `npm.cmd run build`: PASS.
- `npm.cmd test`: PASS.

- [ ] **Step 7: Commit docs and final migration coverage**

Run:

```bash
git add -- tests/worldbook-naming-migration.test.js docs/pm/MODULE_NAME_GLOSSARY.md docs/pm/module-architecture-governance/README.md docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md docs/superpowers/specs/2026-06-03-book-worldbook-naming-unification-design.md
git diff --cached --name-only
git commit -m "docs: record Book WorldBook naming migration"
```

Expected staged files:

```text
tests/worldbook-naming-migration.test.js
docs/pm/MODULE_NAME_GLOSSARY.md
docs/pm/module-architecture-governance/README.md
docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md
docs/superpowers/specs/2026-06-03-book-worldbook-naming-unification-design.md
```

---

## Final Acceptance Checklist

- [ ] Book UI shows `分类 / Category` and canonical labels.
- [ ] Book assets normalize old `assetType` values and expose canonical `category`.
- [ ] WorldBook source links normalize old `usage` values and expose canonical `role`.
- [ ] `systemStore` exposes canonical encyclopedia helpers and keeps old knowledge helpers as wrappers.
- [ ] Role profiles and role binding contracts expose `encyclopediaEntryIds` and mirror `knowledgePointIds`.
- [ ] World Packs expose `encyclopediaEntryIds` and mirror `knowledgePointIds`.
- [ ] Chat prompt wording says "encyclopedia entries" instead of "knowledge points".
- [ ] User-facing WorldBook, Chat, Map, and Calendar copy says `百科 / Encyclopedia`.
- [ ] Existing old saves and exported Book assets load through alias normalization.
- [ ] `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd test` pass.

## Self-Review

Spec coverage:

- Canonical vocabulary and labels: Task 1.
- Book asset `category` migration from old `assetType`: Tasks 2 and 3.
- WorldBook source-link `role` migration from old `usage`: Tasks 2 and 4.
- Encyclopedia replacement for the old knowledge-point family: Tasks 5, 6, and 7.
- Role profile and World Pack id compatibility: Task 6.
- Old-save and old-export compatibility: Tasks 2, 5, 6, and 8.
- User-facing copy cleanup: Task 7.
- Product documentation sync: Task 8.
- Full validation: Task 8.

Known residual risk:

- This plan intentionally keeps `assetType`, `usage`, `knowledgePoints`, and `knowledgePointIds` as mirrored compatibility fields for one transition window. A later cleanup can remove those mirrors only after backup compatibility and external exports no longer need them.
