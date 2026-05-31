# Relationship Tag Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stored relationship premise classification so Contacts edits relationship meaning, relationship runtime owns current values, and event logic reads stable saved categories instead of raw prose.

**Architecture:** Add a pure relationship-classification schema/registry helper, persist classification fields on Contacts role profiles through the existing Chat store profile archive, then add an AI classification seam that only writes high-confidence suggestions automatically and protects user-edited classifications. Contacts renders current runtime state first and profile-side premise editing second; event/runtime gates consume saved classification through a pure mixed-gating helper and record gate audit metadata on relationship facts.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vite, Vitest, Vue Test Utils, ESLint, existing `src/lib/ai.js` provider seam.

---

## Fixed Implementation Order

1. Schema/store and registry seam.
2. AI classification seam and result normalization.
3. Contacts UI for current relationship plus editable premise.
4. Event/runtime classification gating.

Do not move event decisions into Contacts. Do not make Chat or Chat Directory a relationship-truth owner. Do not build a finished Cheats surface in this slice.

## File Map

- Create `src/lib/relationship-classification-schema.js`
  - Own base categories, base modifiers, confidence/source enums, seed normalization, profile-field normalization, registry merge, and display helpers.
- Create `src/lib/relationship-label-classifier.js`
  - Own prompt construction, AI invocation through `callAI`, provider JSON parsing, suggestion normalization, and save-policy decisions.
- Create `src/lib/relationship-event-gating.js`
  - Own mixed hard/soft event gating against saved classification and current runtime snapshots.
- Modify `src/stores/chat.js`
  - Normalize, persist, restore, and update relationship premise/classification fields on role profiles.
  - Add focused profile actions that protect `user_edited` classification from later silent AI overwrite.
- Modify `src/lib/world-pack-schema.js`
  - Add world-pack extension arrays for relationship categories/modifiers without adding an editor UI.
- Modify `src/stores/relationshipRuntime.js`
  - Persist optional relationship gate audit metadata on relationship events.
- Modify `src/lib/relationship-fact-adapters.js`
  - Accept an optional `chatStore`, resolve saved profile classification, and attach low-risk soft gate metadata to current low-impact facts.
- Modify caller files:
  - `src/views/ShoppingView.vue`
  - `src/views/FoodDeliveryView.vue`
  - `src/views/PhoneView.vue`
  - `src/views/MapView.vue`
  - `src/views/WalletView.vue`
  - `src/stores/calendar.js`
- Modify `src/views/ContactsView.vue`
  - Render current relationship from `relationshipRuntimeStore` at the top.
  - Render editable relationship premise below it.
  - Add AI classify, confirm, save, and manual edit flows.
- Modify `src/views/ControlCenterView.vue`
  - Show read-only gate audit details for relationship facts.
- Add or update tests:
  - `tests/relationship-classification-schema.test.js`
  - `tests/relationship-label-classifier.test.js`
  - `tests/relationship-event-gating.test.js`
  - `tests/contacts-relationship-classification-view.test.js`
  - `tests/chat-store-model.test.js`
  - `tests/relationship-fact-adapters.test.js`
  - `tests/control-center-view.test.js`
- Sync docs after each round:
  - `docs/overview/PROJECT_MASTER_GUIDE.md`
  - `docs/roadmap/TODO_ROADMAP.md`
  - `docs/pm/TODO_PM_STATUS_REPORT.md`
  - `docs/pm/contacts-relationship-system-v2/README.md`
  - `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
  - `docs/pm/contacts-relationship-system-v2/PRODUCT_BOUNDARY.md`
  - `docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md`
  - `docs/pm/event-runtime-and-world-hub/README.md` when the event round lands
  - `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md` when the event round lands
  - `docs/pm/event-runtime-and-world-hub/PRODUCT_BOUNDARY.md` when the event round lands
  - `docs/pm/event-runtime-and-world-hub/IMPLEMENTATION_WORKSTREAMS.md` when the event round lands
  - `docs/pm/chat-and-chat-directory/README.md` only if Chat binding docs mention consumed fields
  - `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md` only if Chat binding docs mention consumed fields
  - `docs/architecture/ROLE_BINDING_CONTRACT.md` only if the role binding contract exposes classification
  - `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
  - `docs/architecture/SIMULATION_EVENT_ENGINE.md` when the event round lands
  - `docs/process/EVENT_WORKFLOW.md` when the event round lands

## Round 1: Schema/Store And Registry Seam

**Files:**
- Create: `src/lib/relationship-classification-schema.js`
- Modify: `src/stores/chat.js:765`
- Modify: `src/stores/chat.js:2092`
- Modify: `src/stores/chat.js:2590`
- Modify: `src/lib/world-pack-schema.js:46`
- Modify: `src/lib/world-pack-schema.js:238`
- Test: `tests/relationship-classification-schema.test.js`
- Test: `tests/chat-store-model.test.js`

- [ ] **Step 1: Write failing schema tests**

Create `tests/relationship-classification-schema.test.js`:

```js
import { describe, expect, test } from 'vitest'
import {
  BASE_RELATIONSHIP_CATEGORIES,
  BASE_RELATIONSHIP_MODIFIERS,
  RELATIONSHIP_CLASSIFICATION_CONFIDENCE,
  RELATIONSHIP_CLASSIFICATION_SOURCE,
  buildRelationshipClassificationRegistry,
  normalizeInitialRelationshipSeed,
  normalizeRelationshipProfileFields,
} from '../src/lib/relationship-classification-schema'

describe('relationship classification schema', () => {
  test('exposes the fixed base category and modifier registry', () => {
    expect(BASE_RELATIONSHIP_CATEGORIES.map((item) => item.id)).toEqual([
      'ordinary_acquaintance',
      'family_bond',
      'friendship_bond',
      'romance_candidate',
      'romantic_bond',
      'mentor_bond',
      'professional_bond',
      'power_bond',
      'fandom_bond',
      'rival_bond',
    ])
    expect(BASE_RELATIONSHIP_MODIFIERS.map((item) => item.id)).toContain('childhood_connection')
    expect(BASE_RELATIONSHIP_MODIFIERS.map((item) => item.id)).toContain('obsessive')
  })

  test('normalizes profile relationship fields with safe defaults', () => {
    const fields = normalizeRelationshipProfileFields({
      relationshipLabelText: '  childhood friend  ',
      relationshipLabelNote: '  knows my family  ',
      initialRelationshipSeed: {
        affinity: 95,
        trust: 88,
        intimacy: '51',
        tension: -12,
        dependency: 101,
      },
      primaryRelationshipCategoryId: 'friendship_bond',
      relationshipModifierIds: ['childhood_connection', 'childhood_connection', 'secret'],
      classificationConfidence: 'medium',
      classificationSource: 'ai_confirmed',
      classificationUpdatedAt: 1772294400000,
      classificationExplanation: 'The label describes a long-term friend.',
    })

    expect(fields.relationshipLabelText).toBe('childhood friend')
    expect(fields.relationshipLabelNote).toBe('knows my family')
    expect(fields.initialRelationshipSeed).toEqual({
      affinity: 95,
      trust: 88,
      intimacy: 51,
      tension: 0,
      dependency: 100,
    })
    expect(fields.primaryRelationshipCategoryId).toBe('friendship_bond')
    expect(fields.relationshipModifierIds).toEqual(['childhood_connection', 'secret'])
    expect(fields.classificationConfidence).toBe(RELATIONSHIP_CLASSIFICATION_CONFIDENCE.MEDIUM)
    expect(fields.classificationSource).toBe(RELATIONSHIP_CLASSIFICATION_SOURCE.AI_CONFIRMED)
  })

  test('merges explicit world extensions without replacing base categories', () => {
    const registry = buildRelationshipClassificationRegistry({
      worldCategories: [
        {
          id: 'marked_bond',
          label: 'Marked bond',
          fallbackCategoryId: 'romantic_bond',
          description: 'ABO-style marked relationship.',
        },
      ],
      worldModifiers: [
        {
          id: 'heat_cycle',
          label: 'Heat cycle',
          description: 'World-specific biological timing.',
        },
      ],
    })

    expect(registry.categories.map((item) => item.id)).toContain('ordinary_acquaintance')
    expect(registry.categories.map((item) => item.id)).toContain('marked_bond')
    expect(registry.modifiers.map((item) => item.id)).toContain('heat_cycle')
    expect(registry.categoryById.get('marked_bond').fallbackCategoryId).toBe('romantic_bond')
  })

  test('clamps seed values even when a partial seed is provided', () => {
    expect(normalizeInitialRelationshipSeed({ affinity: 76 })).toEqual({
      affinity: 76,
      trust: 50,
      intimacy: 20,
      tension: 10,
      dependency: 10,
    })
  })
})
```

- [ ] **Step 2: Run the schema tests and verify they fail**

Run:

```bash
npm.cmd test -- tests/relationship-classification-schema.test.js
```

Expected: fail because `src/lib/relationship-classification-schema.js` does not exist yet.

- [ ] **Step 3: Add the classification schema helper**

Create `src/lib/relationship-classification-schema.js` with these exported constants and helpers:

```js
const METRIC_KEYS = ['affinity', 'trust', 'intimacy', 'tension', 'dependency']

const DEFAULT_INITIAL_RELATIONSHIP_SEED = Object.freeze({
  affinity: 50,
  trust: 50,
  intimacy: 20,
  tension: 10,
  dependency: 10,
})

export const RELATIONSHIP_CLASSIFICATION_CONFIDENCE = Object.freeze({
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
})

export const RELATIONSHIP_CLASSIFICATION_SOURCE = Object.freeze({
  AI_AUTO: 'ai_auto',
  AI_CONFIRMED: 'ai_confirmed',
  USER_EDITED: 'user_edited',
  WORLD_TEMPLATE: 'world_template',
})

export const BASE_RELATIONSHIP_CATEGORIES = Object.freeze([
  { id: 'ordinary_acquaintance', label: 'Ordinary acquaintance', fallbackCategoryId: '' },
  { id: 'family_bond', label: 'Family bond', fallbackCategoryId: 'ordinary_acquaintance' },
  { id: 'friendship_bond', label: 'Friendship bond', fallbackCategoryId: 'ordinary_acquaintance' },
  { id: 'romance_candidate', label: 'Romance candidate', fallbackCategoryId: 'friendship_bond' },
  { id: 'romantic_bond', label: 'Romantic bond', fallbackCategoryId: 'romance_candidate' },
  { id: 'mentor_bond', label: 'Mentor bond', fallbackCategoryId: 'professional_bond' },
  { id: 'professional_bond', label: 'Professional bond', fallbackCategoryId: 'ordinary_acquaintance' },
  { id: 'power_bond', label: 'Power bond', fallbackCategoryId: 'professional_bond' },
  { id: 'fandom_bond', label: 'Fandom bond', fallbackCategoryId: 'ordinary_acquaintance' },
  { id: 'rival_bond', label: 'Rival bond', fallbackCategoryId: 'ordinary_acquaintance' },
])

export const BASE_RELATIONSHIP_MODIFIERS = Object.freeze([
  { id: 'childhood_connection', label: 'Childhood connection' },
  { id: 'long_term_companion', label: 'Long-term companion' },
  { id: 'unrequited', label: 'Unrequited' },
  { id: 'mutual', label: 'Mutual' },
  { id: 'secret', label: 'Secret' },
  { id: 'protective', label: 'Protective' },
  { id: 'admiring', label: 'Admiring' },
  { id: 'obsessive', label: 'Obsessive' },
  { id: 'estranged', label: 'Estranged' },
  { id: 'high_status_gap', label: 'High status gap' },
  { id: 'caretaking', label: 'Caretaking' },
])

const toInt = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.floor(numeric) : fallback
}

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, toInt(value, min)))

const normalizeText = (value, fallback = '', max = 240) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeId = (value, fallback = '') =>
  normalizeText(value, fallback, 120)
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback

const normalizeIdList = (value, max = 12) => {
  const seen = new Set()
  return (Array.isArray(value) ? value : [])
    .map((item) => normalizeId(item, ''))
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
    .slice(0, max)
}

const normalizeRegistryEntry = (item, fallbackId = '') => {
  const source = item && typeof item === 'object' ? item : { id: item }
  const id = normalizeId(source.id, fallbackId)
  if (!id) return null
  return {
    id,
    label: normalizeText(source.label || source.name, id, 80),
    description: normalizeText(source.description, '', 300),
    fallbackCategoryId: normalizeId(source.fallbackCategoryId || source.fallbackId, ''),
    source: normalizeId(source.source, 'base'),
  }
}

export const normalizeInitialRelationshipSeed = (seed = {}) =>
  METRIC_KEYS.reduce((acc, key) => {
    acc[key] = clamp(seed?.[key] ?? DEFAULT_INITIAL_RELATIONSHIP_SEED[key], 0, 100)
    return acc
  }, {})

export const buildRelationshipClassificationRegistry = ({
  worldCategories = [],
  worldModifiers = [],
} = {}) => {
  const categories = [
    ...BASE_RELATIONSHIP_CATEGORIES.map((item) => ({ ...item, source: 'base' })),
    ...worldCategories
      .map((item, index) => normalizeRegistryEntry(item, `world_category_${index + 1}`))
      .filter(Boolean)
      .map((item) => ({ ...item, source: item.source === 'base' ? 'world' : item.source })),
  ]
  const modifiers = [
    ...BASE_RELATIONSHIP_MODIFIERS.map((item) => ({ ...item, source: 'base', description: '' })),
    ...worldModifiers
      .map((item, index) => normalizeRegistryEntry(item, `world_modifier_${index + 1}`))
      .filter(Boolean)
      .map((item) => ({ ...item, source: item.source === 'base' ? 'world' : item.source })),
  ]
  const dedupeById = (items) => [...new Map(items.map((item) => [item.id, item])).values()]
  const normalizedCategories = dedupeById(categories)
  const normalizedModifiers = dedupeById(modifiers)
  return {
    categories: normalizedCategories,
    modifiers: normalizedModifiers,
    categoryById: new Map(normalizedCategories.map((item) => [item.id, item])),
    modifierById: new Map(normalizedModifiers.map((item) => [item.id, item])),
  }
}

export const normalizeRelationshipProfileFields = (rawProfile = {}) => {
  const confidence = normalizeId(rawProfile.classificationConfidence, '')
  const source = normalizeId(rawProfile.classificationSource, '')
  return {
    relationshipLabelText: normalizeText(rawProfile.relationshipLabelText, '', 120),
    relationshipLabelNote: normalizeText(rawProfile.relationshipLabelNote, '', 600),
    initialRelationshipSeed: normalizeInitialRelationshipSeed(rawProfile.initialRelationshipSeed),
    primaryRelationshipCategoryId: normalizeId(rawProfile.primaryRelationshipCategoryId, ''),
    relationshipModifierIds: normalizeIdList(rawProfile.relationshipModifierIds, 12),
    classificationConfidence: Object.values(RELATIONSHIP_CLASSIFICATION_CONFIDENCE).includes(confidence)
      ? confidence
      : '',
    classificationSource: Object.values(RELATIONSHIP_CLASSIFICATION_SOURCE).includes(source)
      ? source
      : '',
    classificationUpdatedAt: Math.max(0, toInt(rawProfile.classificationUpdatedAt, 0)),
    classificationExplanation: normalizeText(rawProfile.classificationExplanation, '', 500),
  }
}

export const cloneRelationshipProfileFields = (profile = {}) => {
  const fields = normalizeRelationshipProfileFields(profile)
  return {
    ...fields,
    initialRelationshipSeed: { ...fields.initialRelationshipSeed },
    relationshipModifierIds: [...fields.relationshipModifierIds],
  }
}
```

- [ ] **Step 4: Extend world-pack normalization with registry additions**

In `src/lib/world-pack-schema.js`, add a focused registry-entry normalizer next to `normalizeStringList`:

```js
const normalizeRelationshipRegistryEntries = (value, type = 'category') => {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value
    .map((item, index) => {
      const source = item && typeof item === 'object' ? item : { id: item }
      const id = normalizeId(source.id, `world_${type}_${index + 1}`)
      if (!id || seen.has(id)) return null
      seen.add(id)
      return {
        id,
        label: normalizeInlineText(source.label || source.name, id, 100),
        description: normalizeInlineText(source.description, '', 300),
        fallbackCategoryId: normalizeId(source.fallbackCategoryId || source.fallbackId, ''),
      }
    })
    .filter(Boolean)
    .slice(0, 20)
}
```

Add these two fields to the object returned by `normalizeWorldPack`:

```js
relationshipCategories: normalizeRelationshipRegistryEntries(source.relationshipCategories, 'category'),
relationshipModifiers: normalizeRelationshipRegistryEntries(source.relationshipModifiers, 'modifier'),
```

When cloning world packs in `src/stores/system.js`, include shallow clones for both arrays:

```js
relationshipCategories: Array.isArray(pack.relationshipCategories)
  ? pack.relationshipCategories.map((item) => ({ ...item }))
  : [],
relationshipModifiers: Array.isArray(pack.relationshipModifiers)
  ? pack.relationshipModifiers.map((item) => ({ ...item }))
  : [],
```

- [ ] **Step 5: Add profile fields to the Chat store role profile schema**

In `src/stores/chat.js`, import:

```js
import {
  RELATIONSHIP_CLASSIFICATION_SOURCE,
  cloneRelationshipProfileFields,
  normalizeRelationshipProfileFields,
} from '../lib/relationship-classification-schema'
```

Inside `normalizeRoleProfile`, compute and spread the new fields:

```js
const relationshipFields = normalizeRelationshipProfileFields(rawProfile)

return {
  id,
  roleId: normalizeRoleId(rawProfile?.roleId, createRoleIdFromProfileId(id, fallbackIndex)),
  name,
  role: typeof rawProfile?.role === 'string' ? rawProfile.role : '',
  entityType,
  isMain:
    typeof rawProfile?.isMain === 'boolean'
      ? rawProfile.isMain
      : entityType === CONTACTS_ENTITY_TYPES.MAIN_ROLE,
  avatar: avatarImageToLegacyAvatar(avatarImage) || legacyAvatar,
  avatarImage,
  bio: typeof rawProfile?.bio === 'string' ? rawProfile.bio : '',
  ...relationshipFields,
  knowledgePointIds: normalizeKnowledgePointIds(rawProfile?.knowledgePointIds),
  templateLink: normalizeProfileTemplateLink(rawProfile?.templateLink),
  profileValues: normalizeProfileValues(rawProfile?.profileValues),
  capabilities: normalizeProfileCapabilities(rawProfile?.capabilities, entityType),
  detailItems: normalizeRoleDetailItems(rawProfile?.detailItems, fallbackIndex),
  assetPack: normalizeRoleProfileAssetPack(rawProfile?.assetPack),
  assetFolderBindings: normalizeRoleProfileAssetFolderBindings(rawProfile?.assetFolderBindings),
  tags: Array.isArray(rawProfile?.tags)
    ? rawProfile.tags.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [],
  createdAt:
    typeof rawProfile?.createdAt === 'number' && Number.isFinite(rawProfile.createdAt)
      ? Math.max(0, Math.floor(rawProfile.createdAt))
      : nowTs(),
  updatedAt:
    typeof rawProfile?.updatedAt === 'number' && Number.isFinite(rawProfile.updatedAt)
      ? Math.max(0, Math.floor(rawProfile.updatedAt))
      : nowTs(),
}
```

In `updateRoleProfile`, support direct edits to the new fields:

```js
const relationshipFieldKeys = [
  'relationshipLabelText',
  'relationshipLabelNote',
  'initialRelationshipSeed',
  'primaryRelationshipCategoryId',
  'relationshipModifierIds',
  'classificationConfidence',
  'classificationSource',
  'classificationUpdatedAt',
  'classificationExplanation',
]
if (relationshipFieldKeys.some((key) => Object.prototype.hasOwnProperty.call(updates, key))) {
  const normalizedRelationshipFields = normalizeRelationshipProfileFields({
    ...target,
    ...updates,
  })
  Object.assign(target, normalizedRelationshipFields)
}
```

Add a focused action near `updateRoleProfile`:

```js
const updateRoleRelationshipPremise = (profileId, updates = {}) =>
  updateRoleProfile(profileId, {
    relationshipLabelText: updates.relationshipLabelText,
    relationshipLabelNote: updates.relationshipLabelNote,
    initialRelationshipSeed: updates.initialRelationshipSeed,
  })

const saveRoleRelationshipClassification = (profileId, classification = {}, options = {}) => {
  const target = getRoleProfileById(profileId)
  if (!target) return { ok: false, reason: 'profile_not_found' }
  const requestedSource = options.source || classification.classificationSource || ''
  const protectedUserEdit =
    target.classificationSource === RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED &&
    requestedSource !== RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED &&
    options.force !== true
  if (protectedUserEdit) return { ok: false, reason: 'user_edited_protected' }

  const normalized = normalizeRelationshipProfileFields({
    ...target,
    ...classification,
    classificationSource: requestedSource || classification.classificationSource,
    classificationUpdatedAt: classification.classificationUpdatedAt || nowTs(),
  })
  Object.assign(target, normalized, { updatedAt: nowTs() })
  return { ok: true, profile: { ...target } }
}
```

Persist cloned fields inside `roleProfiles.map`:

```js
...cloneRelationshipProfileFields(profile),
```

Return both new actions from the store:

```js
updateRoleRelationshipPremise,
saveRoleRelationshipClassification,
```

- [ ] **Step 6: Add store persistence tests**

Append to `tests/chat-store-model.test.js`:

```js
test('persists relationship premise and classification fields on role profiles', () => {
  const store = useChatStore()
  const profile = store.addRoleProfile({
    roleId: '2401',
    name: 'Classified Role',
    relationshipLabelText: 'childhood friend',
    relationshipLabelNote: 'Grew up together.',
    initialRelationshipSeed: {
      affinity: 78,
      trust: 82,
      intimacy: 45,
      tension: 8,
      dependency: 30,
    },
    primaryRelationshipCategoryId: 'friendship_bond',
    relationshipModifierIds: ['childhood_connection', 'mutual'],
    classificationConfidence: 'high',
    classificationSource: 'ai_auto',
    classificationExplanation: 'The label points to a stable friendship.',
  })

  store.saveNow()

  const restored = useChatStore()
  restored.restoreFromBackup({
    roleProfiles: store.roleProfiles.map((item) => ({ ...item })),
    contacts: store.contacts.map((item) => ({ ...item })),
    conversations: {},
    messagesByConversation: {},
  })

  const restoredProfile = restored.getRoleProfileById(profile.id)
  expect(restoredProfile).toMatchObject({
    relationshipLabelText: 'childhood friend',
    relationshipLabelNote: 'Grew up together.',
    primaryRelationshipCategoryId: 'friendship_bond',
    relationshipModifierIds: ['childhood_connection', 'mutual'],
    classificationConfidence: 'high',
    classificationSource: 'ai_auto',
  })
  expect(restoredProfile.initialRelationshipSeed).toMatchObject({
    affinity: 78,
    trust: 82,
    intimacy: 45,
    tension: 8,
    dependency: 30,
  })
})

test('does not silently overwrite user-edited relationship classification with AI output', () => {
  const store = useChatStore()
  const profile = store.addRoleProfile({
    roleId: '2402',
    name: 'Protected Role',
    primaryRelationshipCategoryId: 'family_bond',
    relationshipModifierIds: ['caretaking'],
    classificationConfidence: 'high',
    classificationSource: 'user_edited',
  })

  const blocked = store.saveRoleRelationshipClassification(profile.id, {
    primaryRelationshipCategoryId: 'romantic_bond',
    relationshipModifierIds: ['secret'],
    classificationConfidence: 'high',
    classificationExplanation: 'AI guess.',
  }, {
    source: 'ai_auto',
  })

  expect(blocked).toEqual({ ok: false, reason: 'user_edited_protected' })
  expect(store.getRoleProfileById(profile.id).primaryRelationshipCategoryId).toBe('family_bond')
  expect(store.getRoleProfileById(profile.id).relationshipModifierIds).toEqual(['caretaking'])
})
```

- [ ] **Step 7: Run Round 1 tests**

Run:

```bash
npm.cmd test -- tests/relationship-classification-schema.test.js tests/chat-store-model.test.js
```

Expected: pass.

- [ ] **Step 8: Sync Round 1 docs**

Update docs to state that role profiles now persist profile-side relationship premise and stored classification fields, while relationship runtime remains current-truth owner:

```text
docs/overview/PROJECT_MASTER_GUIDE.md
docs/roadmap/TODO_ROADMAP.md
docs/pm/TODO_PM_STATUS_REPORT.md
docs/pm/contacts-relationship-system-v2/README.md
docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md
docs/pm/contacts-relationship-system-v2/PRODUCT_BOUNDARY.md
docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md
docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md
```

- [ ] **Step 9: Validate Round 1 behavior**

Run:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Expected: all pass. Record any existing Vite warning exactly in the handoff note.

- [ ] **Step 10: Commit Round 1**

Run:

```bash
git add src/lib/relationship-classification-schema.js src/lib/world-pack-schema.js src/stores/chat.js src/stores/system.js tests/relationship-classification-schema.test.js tests/chat-store-model.test.js docs/overview/PROJECT_MASTER_GUIDE.md docs/roadmap/TODO_ROADMAP.md docs/pm/TODO_PM_STATUS_REPORT.md docs/pm/contacts-relationship-system-v2/README.md docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md docs/pm/contacts-relationship-system-v2/PRODUCT_BOUNDARY.md docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md
git commit -m "feat: add relationship classification profile schema"
```

## Round 2: Classification Seam

**Files:**
- Create: `src/lib/relationship-label-classifier.js`
- Modify: `src/stores/chat.js:2092`
- Test: `tests/relationship-label-classifier.test.js`
- Test: `tests/chat-store-model.test.js`

- [ ] **Step 1: Write failing classifier tests**

Create `tests/relationship-label-classifier.test.js`:

```js
import { describe, expect, test, vi } from 'vitest'
import {
  buildRelationshipClassificationPrompt,
  classifyRelationshipLabel,
  normalizeRelationshipClassificationSuggestion,
} from '../src/lib/relationship-label-classifier'
import { buildRelationshipClassificationRegistry } from '../src/lib/relationship-classification-schema'

describe('relationship label classifier', () => {
  test('normalizes provider output against the known registry', () => {
    const registry = buildRelationshipClassificationRegistry()
    const suggestion = normalizeRelationshipClassificationSuggestion({
      primaryCategoryId: 'friendship_bond',
      modifierIds: ['childhood_connection', 'unknown_modifier', 'mutual'],
      confidence: 'high',
      explanation: 'Long-term friendly wording.',
    }, registry)

    expect(suggestion).toEqual({
      primaryRelationshipCategoryId: 'friendship_bond',
      relationshipModifierIds: ['childhood_connection', 'mutual'],
      classificationConfidence: 'high',
      classificationExplanation: 'Long-term friendly wording.',
    })
  })

  test('falls back to ordinary acquaintance when provider returns an unknown category', () => {
    const registry = buildRelationshipClassificationRegistry()
    const suggestion = normalizeRelationshipClassificationSuggestion({
      primaryCategoryId: 'not_a_category',
      modifierIds: ['secret'],
      confidence: 'low',
      explanation: 'Ambiguous label.',
    }, registry)

    expect(suggestion.primaryRelationshipCategoryId).toBe('ordinary_acquaintance')
    expect(suggestion.relationshipModifierIds).toEqual(['secret'])
    expect(suggestion.classificationConfidence).toBe('low')
  })

  test('builds a prompt that contains label text and registry ids but asks for JSON only', () => {
    const registry = buildRelationshipClassificationRegistry()
    const prompt = buildRelationshipClassificationPrompt({
      profile: {
        name: 'Aki',
        relationshipLabelText: 'white moonlight',
        relationshipLabelNote: 'Important but not confirmed as a lover.',
      },
      registry,
    })

    expect(prompt).toContain('white moonlight')
    expect(prompt).toContain('ordinary_acquaintance')
    expect(prompt).toContain('relationshipModifierIds')
    expect(prompt).toContain('Return JSON only')
  })

  test('classifies through the injected AI caller and marks high confidence for auto-save', async () => {
    const callAi = vi.fn(async () => JSON.stringify({
      primaryRelationshipCategoryId: 'romance_candidate',
      relationshipModifierIds: ['secret', 'mutual'],
      classificationConfidence: 'high',
      classificationExplanation: 'The label implies possible attraction.',
    }))
    const result = await classifyRelationshipLabel({
      profile: {
        id: 9,
        name: 'Mira',
        relationshipLabelText: 'ambiguous crush',
        relationshipLabelNote: 'Both sides hide it.',
      },
      settings: {
        api: {
          key: 'test-key',
          url: 'https://example.test/v1/chat/completions',
          model: 'test-model',
        },
      },
      registry: buildRelationshipClassificationRegistry(),
      callAi,
    })

    expect(callAi).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    expect(result.requiresConfirmation).toBe(false)
    expect(result.classification.primaryRelationshipCategoryId).toBe('romance_candidate')
    expect(result.classification.relationshipModifierIds).toEqual(['secret', 'mutual'])
  })

  test('marks medium and low confidence suggestions as requiring confirmation', async () => {
    const callAi = vi.fn(async () => JSON.stringify({
      primaryCategoryId: 'friendship_bond',
      modifierIds: ['long_term_companion'],
      confidence: 'medium',
      explanation: 'Likely a friend, but wording is not certain.',
    }))

    const result = await classifyRelationshipLabel({
      profile: {
        id: 10,
        name: 'Rin',
        relationshipLabelText: 'important person',
      },
      settings: {
        api: {
          key: 'test-key',
          url: 'https://example.test/v1/chat/completions',
          model: 'test-model',
        },
      },
      registry: buildRelationshipClassificationRegistry(),
      callAi,
    })

    expect(result.ok).toBe(true)
    expect(result.requiresConfirmation).toBe(true)
    expect(result.classification.classificationConfidence).toBe('medium')
  })
})
```

- [ ] **Step 2: Run the classifier tests and verify they fail**

Run:

```bash
npm.cmd test -- tests/relationship-label-classifier.test.js
```

Expected: fail because `src/lib/relationship-label-classifier.js` does not exist yet.

- [ ] **Step 3: Implement the AI classification seam**

Create `src/lib/relationship-label-classifier.js`:

```js
import { callAI as defaultCallAI } from './ai'
import { parseAssistantJsonPayload } from './chat-response'
import {
  RELATIONSHIP_CLASSIFICATION_CONFIDENCE,
  RELATIONSHIP_CLASSIFICATION_SOURCE,
  buildRelationshipClassificationRegistry,
  normalizeRelationshipProfileFields,
} from './relationship-classification-schema'

const normalizeText = (value, fallback = '', max = 1000) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeProviderPayload = (payload = {}) => {
  const source = payload && typeof payload === 'object' ? payload : {}
  return {
    primaryRelationshipCategoryId:
      source.primaryRelationshipCategoryId || source.primaryCategoryId || source.categoryId || '',
    relationshipModifierIds:
      source.relationshipModifierIds || source.modifierIds || source.modifiers || [],
    classificationConfidence:
      source.classificationConfidence || source.confidence || RELATIONSHIP_CLASSIFICATION_CONFIDENCE.LOW,
    classificationExplanation:
      source.classificationExplanation || source.explanation || source.reason || '',
  }
}

export const buildRelationshipClassificationPrompt = ({ profile = {}, registry = buildRelationshipClassificationRegistry() } = {}) => {
  const categories = registry.categories
    .map((item) => `${item.id}: ${item.label}${item.description ? ` - ${item.description}` : ''}`)
    .join('\n')
  const modifiers = registry.modifiers
    .map((item) => `${item.id}: ${item.label}${item.description ? ` - ${item.description}` : ''}`)
    .join('\n')
  return [
    'Classify one relationship label into stable SchatPhone runtime categories.',
    'Return JSON only with keys: primaryRelationshipCategoryId, relationshipModifierIds, classificationConfidence, classificationExplanation.',
    'classificationConfidence must be one of: high, medium, low.',
    `Role name: ${normalizeText(profile.name, 'Unnamed role', 120)}`,
    `Free-text label: ${normalizeText(profile.relationshipLabelText, '', 120) || '(empty)'}`,
    `User explanation: ${normalizeText(profile.relationshipLabelNote, '', 600) || '(empty)'}`,
    'Primary category ids:',
    categories,
    'Modifier ids:',
    modifiers,
  ].join('\n')
}

export const normalizeRelationshipClassificationSuggestion = (
  payload = {},
  registry = buildRelationshipClassificationRegistry(),
) => {
  const normalized = normalizeRelationshipProfileFields(normalizeProviderPayload(payload))
  const categoryExists = registry.categoryById.has(normalized.primaryRelationshipCategoryId)
  const modifierSet = registry.modifierById
  return {
    primaryRelationshipCategoryId: categoryExists
      ? normalized.primaryRelationshipCategoryId
      : 'ordinary_acquaintance',
    relationshipModifierIds: normalized.relationshipModifierIds.filter((id) => modifierSet.has(id)),
    classificationConfidence:
      normalized.classificationConfidence || RELATIONSHIP_CLASSIFICATION_CONFIDENCE.LOW,
    classificationExplanation: normalized.classificationExplanation,
  }
}

export const shouldAutoSaveClassification = (classification = {}) =>
  classification.classificationConfidence === RELATIONSHIP_CLASSIFICATION_CONFIDENCE.HIGH

export const classifyRelationshipLabel = async ({
  profile = {},
  settings = {},
  registry = buildRelationshipClassificationRegistry(),
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const prompt = buildRelationshipClassificationPrompt({ profile, registry })
  const text = await callAi({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt:
      'You classify user-written relationship labels into stable runtime categories. Return valid JSON only.',
    settings,
    signal,
  })
  const payload = parseAssistantJsonPayload(text)
  if (!payload) {
    return {
      ok: false,
      reason: 'parse_failed',
      requiresConfirmation: true,
      classification: null,
    }
  }
  const classification = normalizeRelationshipClassificationSuggestion(payload, registry)
  return {
    ok: true,
    reason: 'classified',
    requiresConfirmation: !shouldAutoSaveClassification(classification),
    saveSource: shouldAutoSaveClassification(classification)
      ? RELATIONSHIP_CLASSIFICATION_SOURCE.AI_AUTO
      : RELATIONSHIP_CLASSIFICATION_SOURCE.AI_CONFIRMED,
    classification,
  }
}
```

- [ ] **Step 4: Add store action coverage for AI save policy**

Append to `tests/chat-store-model.test.js`:

```js
test('saves high-confidence AI classification while preserving user-edited protection', () => {
  const store = useChatStore()
  const profile = store.addRoleProfile({
    roleId: '2403',
    name: 'AI Classified',
    relationshipLabelText: 'fanatic supporter',
  })

  const saved = store.saveRoleRelationshipClassification(profile.id, {
    primaryRelationshipCategoryId: 'fandom_bond',
    relationshipModifierIds: ['admiring', 'obsessive'],
    classificationConfidence: 'high',
    classificationExplanation: 'Supporter wording maps to fandom intensity.',
  }, {
    source: 'ai_auto',
  })

  expect(saved.ok).toBe(true)
  expect(store.getRoleProfileById(profile.id)).toMatchObject({
    primaryRelationshipCategoryId: 'fandom_bond',
    relationshipModifierIds: ['admiring', 'obsessive'],
    classificationConfidence: 'high',
    classificationSource: 'ai_auto',
  })

  const manual = store.saveRoleRelationshipClassification(profile.id, {
    primaryRelationshipCategoryId: 'friendship_bond',
    relationshipModifierIds: ['long_term_companion'],
    classificationConfidence: 'high',
    classificationExplanation: 'User corrected the classification.',
  }, {
    source: 'user_edited',
  })

  expect(manual.ok).toBe(true)
  expect(store.getRoleProfileById(profile.id).classificationSource).toBe('user_edited')
})
```

- [ ] **Step 5: Run Round 2 tests**

Run:

```bash
npm.cmd test -- tests/relationship-label-classifier.test.js tests/chat-store-model.test.js
```

Expected: pass.

- [ ] **Step 6: Sync Round 2 docs**

Update the same docs as Round 1, adding:

```text
AI classification goes through src/lib/ai.js.
High confidence is saved as ai_auto.
Medium or low confidence requires user confirmation before saving as ai_confirmed.
Existing user_edited classifications are protected from silent AI or world-template overwrite.
```

- [ ] **Step 7: Validate Round 2 behavior**

Run:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Expected: all pass.

- [ ] **Step 8: Commit Round 2**

Run:

```bash
git add src/lib/relationship-label-classifier.js src/stores/chat.js tests/relationship-label-classifier.test.js tests/chat-store-model.test.js docs/overview/PROJECT_MASTER_GUIDE.md docs/roadmap/TODO_ROADMAP.md docs/pm/TODO_PM_STATUS_REPORT.md docs/pm/contacts-relationship-system-v2/README.md docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md docs/pm/contacts-relationship-system-v2/PRODUCT_BOUNDARY.md docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md
git commit -m "feat: add relationship label classification seam"
```

## Round 3: Contacts UI As Role Control Page

**Files:**
- Modify: `src/views/ContactsView.vue:460`
- Modify: `src/views/ContactsView.vue:1187`
- Modify: `src/views/ContactsView.vue:2490`
- Modify: `src/views/ContactsView.vue:3339`
- Test: `tests/contacts-relationship-classification-view.test.js`

- [ ] **Step 1: Write failing Contacts UI tests**

Create `tests/contacts-relationship-classification-view.test.js`:

```js
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ContactsView from '../src/views/ContactsView.vue'
import { callAI } from '../src/lib/ai'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import { useChatStore } from '../src/stores/chat'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'

vi.mock('../src/lib/ai', () => ({
  callAI: vi.fn(),
}))

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', component: ContactsView },
      { path: '/home', component: DummyView },
      { path: '/chat-contacts', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountContactsView = async () => {
  const router = createTestRouter()
  await router.push('/contacts')
  await router.isReady()
  const wrapper = mount(ContactsView, {
    global: {
      plugins: [router],
      stubs: ['ImageSourcePicker', 'AssetStatusBadge', 'AssetThumbnailOption'],
    },
  })
  await flushUi()
  return wrapper
}

describe('Contacts relationship classification UI', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDialogServiceForTest()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
    useRelationshipRuntimeStore().resetForTesting()
    vi.mocked(callAI).mockReset()
  })

  test('shows current relationship snapshot before editable relationship premise', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const profile = chatStore.addRoleProfile({
      roleId: '2501',
      name: 'Premise Role',
      relationshipLabelText: 'childhood friend',
      relationshipLabelNote: 'Grew up together.',
      primaryRelationshipCategoryId: 'friendship_bond',
      relationshipModifierIds: ['childhood_connection'],
      classificationConfidence: 'high',
      classificationSource: 'ai_auto',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: { profileId: profile.id, name: profile.name },
      sourceModule: 'relationship_phone_call',
      sourceId: 'call_2501',
      factType: 'completed_call',
      summary: 'Call recorded with Premise Role.',
      metricDeltas: { affinity: 4, trust: 2 },
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()

    const detailText = wrapper.get('[data-testid="contacts-role-detail"]').text()
    const snapshotIndex = detailText.indexOf('Current relationship')
    const premiseIndex = detailText.indexOf('Relationship premise')
    expect(snapshotIndex).toBeGreaterThanOrEqual(0)
    expect(premiseIndex).toBeGreaterThan(snapshotIndex)
    expect(wrapper.get('[data-testid="contacts-relationship-premise"]').text()).toContain('childhood friend')
    expect(wrapper.get('[data-testid="contacts-relationship-premise"]').text()).toContain('friendship_bond')

    wrapper.unmount()
  })

  test('saves manual relationship premise and classification edits as user edited', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '2502',
      name: 'Manual Classified',
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()

    await wrapper.get('[data-testid="relationship-label-text"]').setValue('like family')
    await wrapper.get('[data-testid="relationship-label-note"]').setValue('Caregiving but not romance.')
    await wrapper.get('[data-testid="relationship-category-select"]').setValue('family_bond')
    await wrapper.get('[data-testid="relationship-modifier-caretaking"]').setValue(true)
    await wrapper.get('[data-testid="relationship-seed-affinity"]').setValue('72')
    await wrapper.get('[data-testid="relationship-premise-save"]').trigger('click')
    await flushUi()

    const updated = chatStore.getRoleProfileById(profile.id)
    expect(updated.relationshipLabelText).toBe('like family')
    expect(updated.relationshipLabelNote).toBe('Caregiving but not romance.')
    expect(updated.primaryRelationshipCategoryId).toBe('family_bond')
    expect(updated.relationshipModifierIds).toEqual(['caretaking'])
    expect(updated.initialRelationshipSeed.affinity).toBe(72)
    expect(updated.classificationSource).toBe('user_edited')

    wrapper.unmount()
  })

  test('auto-saves high-confidence AI classification', async () => {
    vi.mocked(callAI).mockResolvedValue(JSON.stringify({
      primaryRelationshipCategoryId: 'fandom_bond',
      relationshipModifierIds: ['admiring', 'obsessive'],
      classificationConfidence: 'high',
      classificationExplanation: 'Supporter wording maps to fandom.',
    }))
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '2503',
      name: 'Fan Role',
      relationshipLabelText: 'fanatic supporter',
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="relationship-classify-ai"]').trigger('click')
    await flushUi()

    const updated = chatStore.getRoleProfileById(profile.id)
    expect(updated.primaryRelationshipCategoryId).toBe('fandom_bond')
    expect(updated.relationshipModifierIds).toEqual(['admiring', 'obsessive'])
    expect(updated.classificationSource).toBe('ai_auto')
    expect(wrapper.get('[data-testid="contacts-relationship-premise"]').text()).toContain('Supporter wording')

    wrapper.unmount()
  })

  test('requires confirmation for medium confidence AI classification', async () => {
    vi.mocked(callAI).mockResolvedValue(JSON.stringify({
      primaryRelationshipCategoryId: 'friendship_bond',
      relationshipModifierIds: ['long_term_companion'],
      classificationConfidence: 'medium',
      classificationExplanation: 'Likely friendship, but label is broad.',
    }))
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '2504',
      name: 'Ambiguous Role',
      relationshipLabelText: 'important person',
    })
    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()

    await wrapper.get('[data-testid="relationship-classify-ai"]').trigger('click')
    await flushUi()

    expect(chatStore.getRoleProfileById(profile.id).primaryRelationshipCategoryId).toBe('')
    expect(wrapper.get('[data-testid="relationship-classification-confirm"]').text()).toContain('friendship_bond')

    const { submitDialog } = useDialog()
    await wrapper.get('[data-testid="relationship-classification-confirm-save"]').trigger('click')
    await flushUi()
    submitDialog(true)
    await flushUi()

    expect(chatStore.getRoleProfileById(profile.id).primaryRelationshipCategoryId).toBe('friendship_bond')
    expect(chatStore.getRoleProfileById(profile.id).classificationSource).toBe('ai_confirmed')

    wrapper.unmount()
  })
})
```

- [ ] **Step 2: Run the Contacts UI tests and verify they fail**

Run:

```bash
npm.cmd test -- tests/contacts-relationship-classification-view.test.js
```

Expected: fail because the Contacts UI does not yet expose the premise editor or classification controls.

- [ ] **Step 3: Add Contacts state and registry wiring**

In `src/views/ContactsView.vue`, import:

```js
import {
  BASE_RELATIONSHIP_MODIFIERS,
  RELATIONSHIP_CLASSIFICATION_SOURCE,
  buildRelationshipClassificationRegistry,
  normalizeInitialRelationshipSeed,
} from '../lib/relationship-classification-schema'
import { classifyRelationshipLabel } from '../lib/relationship-label-classifier'
```

Add local state near the existing refs:

```js
const relationshipPremiseDraft = reactive({
  relationshipLabelText: '',
  relationshipLabelNote: '',
  initialRelationshipSeed: normalizeInitialRelationshipSeed(),
  primaryRelationshipCategoryId: '',
  relationshipModifierIds: [],
})
const relationshipClassificationBusy = ref(false)
const pendingClassificationSuggestion = ref(null)
```

Add computed registry using the active World Pack extensions from `systemStore.user`:

```js
const activeWorldRelationshipRegistry = computed(() => {
  const activePackId = user.value.activeWorldPackId || 'default_world'
  const activePack = Array.isArray(user.value.worldPacks)
    ? user.value.worldPacks.find((pack) => pack.id === activePackId)
    : null
  return buildRelationshipClassificationRegistry({
    worldCategories: activePack?.relationshipCategories || [],
    worldModifiers: activePack?.relationshipModifiers || [],
  })
})

const relationshipCategoryOptions = computed(() => activeWorldRelationshipRegistry.value.categories)
const relationshipModifierOptions = computed(() => activeWorldRelationshipRegistry.value.modifiers)
```

Add draft reset and watcher:

```js
const resetRelationshipPremiseDraft = (profile = selectedProfile.value) => {
  relationshipPremiseDraft.relationshipLabelText = profile?.relationshipLabelText || ''
  relationshipPremiseDraft.relationshipLabelNote = profile?.relationshipLabelNote || ''
  relationshipPremiseDraft.initialRelationshipSeed = normalizeInitialRelationshipSeed(profile?.initialRelationshipSeed)
  relationshipPremiseDraft.primaryRelationshipCategoryId = profile?.primaryRelationshipCategoryId || ''
  relationshipPremiseDraft.relationshipModifierIds = Array.isArray(profile?.relationshipModifierIds)
    ? [...profile.relationshipModifierIds]
    : []
  pendingClassificationSuggestion.value = null
}

watch(
  () => selectedProfile.value?.id,
  () => resetRelationshipPremiseDraft(),
  { immediate: true },
)
```

- [ ] **Step 4: Add premise save, modifier toggle, and AI classification actions**

Add methods in `ContactsView.vue`:

```js
const toggleRelationshipModifierDraft = (modifierId) => {
  const current = new Set(relationshipPremiseDraft.relationshipModifierIds)
  if (current.has(modifierId)) current.delete(modifierId)
  else current.add(modifierId)
  relationshipPremiseDraft.relationshipModifierIds = [...current].filter((id) =>
    activeWorldRelationshipRegistry.value.modifierById.has(id),
  )
}

const saveRelationshipPremiseDraft = (source = RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED) => {
  const profile = selectedProfile.value
  if (!profile?.id) return
  chatStore.updateRoleRelationshipPremise(profile.id, {
    relationshipLabelText: relationshipPremiseDraft.relationshipLabelText,
    relationshipLabelNote: relationshipPremiseDraft.relationshipLabelNote,
    initialRelationshipSeed: relationshipPremiseDraft.initialRelationshipSeed,
  })
  const result = chatStore.saveRoleRelationshipClassification(profile.id, {
    primaryRelationshipCategoryId: relationshipPremiseDraft.primaryRelationshipCategoryId,
    relationshipModifierIds: relationshipPremiseDraft.relationshipModifierIds,
    classificationConfidence: source === RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED ? 'high' : '',
    classificationExplanation:
      source === RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED
        ? 'User manually edited relationship classification in Contacts.'
        : '',
  }, {
    source,
    force: source === RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED,
  })
  if (!result.ok) {
    setUiNotice('warning', t('关系分类未保存。', 'Relationship classification was not saved.'))
    return
  }
  resetRelationshipPremiseDraft(chatStore.getRoleProfileById(profile.id))
  setUiNotice('success', t('关系前提已保存。', 'Relationship premise saved.'))
}

const runRelationshipClassification = async () => {
  const profile = selectedProfile.value
  if (!profile?.id) return
  relationshipClassificationBusy.value = true
  pendingClassificationSuggestion.value = null
  try {
    chatStore.updateRoleRelationshipPremise(profile.id, {
      relationshipLabelText: relationshipPremiseDraft.relationshipLabelText,
      relationshipLabelNote: relationshipPremiseDraft.relationshipLabelNote,
      initialRelationshipSeed: relationshipPremiseDraft.initialRelationshipSeed,
    })
    const latestProfile = chatStore.getRoleProfileById(profile.id)
    const result = await classifyRelationshipLabel({
      profile: latestProfile,
      settings: settings.value,
      registry: activeWorldRelationshipRegistry.value,
    })
    if (!result.ok) {
      setUiNotice('error', t('关系分类解析失败。', 'Relationship classification parsing failed.'))
      return
    }
    if (result.requiresConfirmation) {
      pendingClassificationSuggestion.value = result
      setUiNotice('warning', t('AI 分类需要确认。', 'AI classification needs confirmation.'))
      return
    }
    const saved = chatStore.saveRoleRelationshipClassification(profile.id, result.classification, {
      source: result.saveSource,
    })
    if (!saved.ok) {
      setUiNotice('warning', t('用户手动分类已保留，AI 未覆盖。', 'User-edited classification was kept; AI did not overwrite it.'))
      return
    }
    resetRelationshipPremiseDraft(chatStore.getRoleProfileById(profile.id))
    setUiNotice('success', t('AI 关系分类已保存。', 'AI relationship classification saved.'))
  } catch (error) {
    setUiNotice('error', t('AI 分类请求失败。', 'AI classification request failed.'))
  } finally {
    relationshipClassificationBusy.value = false
  }
}

const confirmPendingRelationshipClassification = async () => {
  const profile = selectedProfile.value
  const suggestion = pendingClassificationSuggestion.value
  if (!profile?.id || !suggestion?.classification) return
  const ok = await confirmDialog({
    title: t('确认关系分类', 'Confirm relationship classification'),
    message: suggestion.classification.classificationExplanation || suggestion.classification.primaryRelationshipCategoryId,
    confirmText: t('保存分类', 'Save classification'),
    cancelText: t('取消', 'Cancel'),
  })
  if (!ok) return
  const saved = chatStore.saveRoleRelationshipClassification(profile.id, suggestion.classification, {
    source: RELATIONSHIP_CLASSIFICATION_SOURCE.AI_CONFIRMED,
  })
  if (saved.ok) {
    pendingClassificationSuggestion.value = null
    resetRelationshipPremiseDraft(chatStore.getRoleProfileById(profile.id))
    setUiNotice('success', t('AI 分类已确认保存。', 'AI classification confirmed and saved.'))
  }
}
```

- [ ] **Step 5: Render current relationship first and premise editor second**

Rename the visible copy in the existing `contacts-relationship-panel` so it is explicitly current runtime state:

```vue
<p class="text-[11px] uppercase text-gray-400 font-bold">
  {{ t('当前关系', 'Current relationship') }}
</p>
```

Below the current relationship block, add:

```vue
<section
  class="contacts-detail-section contacts-relationship-premise space-y-3"
  data-testid="contacts-relationship-premise"
>
  <div class="flex items-start justify-between gap-3">
    <div>
      <p class="text-[11px] uppercase text-gray-400 font-bold">
        {{ t('关系前提', 'Relationship premise') }}
      </p>
      <h3 class="text-sm font-bold">
        {{ relationshipPremiseDraft.primaryRelationshipCategoryId || t('未分类', 'Unclassified') }}
      </h3>
      <p class="text-[11px] text-gray-500">
        {{
          selectedProfile?.classificationSource
            ? `${selectedProfile.classificationSource} / ${selectedProfile.classificationConfidence || 'unset'}`
            : t('尚未保存分类', 'No saved classification yet')
        }}
      </p>
    </div>
    <button
      type="button"
      class="contacts-small-action"
      data-testid="relationship-classify-ai"
      :disabled="relationshipClassificationBusy"
      @click="runRelationshipClassification"
    >
      {{ relationshipClassificationBusy ? t('分类中', 'Classifying') : t('AI 分类', 'AI classify') }}
    </button>
  </div>

  <label class="contacts-premise-field">
    <span>{{ t('自由标签', 'Free label') }}</span>
    <input
      v-model="relationshipPremiseDraft.relationshipLabelText"
      data-testid="relationship-label-text"
      :placeholder="t('例如：青梅竹马、白月光、狂热支持者', 'Example: childhood friend, white moonlight, fanatic supporter')"
    />
  </label>

  <label class="contacts-premise-field">
    <span>{{ t('说明', 'Note') }}</span>
    <textarea
      v-model="relationshipPremiseDraft.relationshipLabelNote"
      data-testid="relationship-label-note"
      rows="3"
      :placeholder="t('解释这个关系前提，不影响当前关系数值。', 'Explain the premise; this does not directly edit current runtime values.')"
    />
  </label>

  <label class="contacts-premise-field">
    <span>{{ t('主类别', 'Primary category') }}</span>
    <select
      v-model="relationshipPremiseDraft.primaryRelationshipCategoryId"
      data-testid="relationship-category-select"
    >
      <option value="">{{ t('未分类', 'Unclassified') }}</option>
      <option
        v-for="category in relationshipCategoryOptions"
        :key="category.id"
        :value="category.id"
      >
        {{ category.label }} ({{ category.id }})
      </option>
    </select>
  </label>

  <div class="contacts-premise-modifiers">
    <p>{{ t('修饰标签', 'Modifier tags') }}</p>
    <label
      v-for="modifier in relationshipModifierOptions"
      :key="modifier.id"
      class="contacts-premise-modifier"
    >
      <input
        type="checkbox"
        :data-testid="`relationship-modifier-${modifier.id}`"
        :checked="relationshipPremiseDraft.relationshipModifierIds.includes(modifier.id)"
        @change="toggleRelationshipModifierDraft(modifier.id)"
      />
      <span>{{ modifier.label }}</span>
    </label>
  </div>

  <div class="contacts-seed-grid">
    <label
      v-for="metricKey in ['affinity', 'trust', 'intimacy', 'tension', 'dependency']"
      :key="metricKey"
      class="contacts-premise-field"
    >
      <span>{{ metricKey }}</span>
      <input
        v-model.number="relationshipPremiseDraft.initialRelationshipSeed[metricKey]"
        :data-testid="`relationship-seed-${metricKey}`"
        type="number"
        min="0"
        max="100"
      />
    </label>
  </div>

  <div
    v-if="pendingClassificationSuggestion"
    class="contacts-classification-confirm"
    data-testid="relationship-classification-confirm"
  >
    <p class="text-[12px] font-semibold">
      {{ pendingClassificationSuggestion.classification.primaryRelationshipCategoryId }}
    </p>
    <p class="text-[11px] text-gray-500">
      {{ pendingClassificationSuggestion.classification.classificationExplanation }}
    </p>
    <button
      type="button"
      class="contacts-small-action"
      data-testid="relationship-classification-confirm-save"
      @click="confirmPendingRelationshipClassification"
    >
      {{ t('确认保存', 'Confirm save') }}
    </button>
  </div>

  <button
    type="button"
    class="contacts-primary-action"
    data-testid="relationship-premise-save"
    @click="saveRelationshipPremiseDraft()"
  >
    {{ t('保存关系前提', 'Save relationship premise') }}
  </button>
</section>
```

- [ ] **Step 6: Add compact styles**

Add near the existing relationship panel CSS:

```css
.contacts-relationship-premise {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(244, 249, 255, 0.75)),
    var(--contacts-surface-strong);
}

.contacts-premise-field {
  display: grid;
  gap: 5px;
  color: var(--contacts-muted);
  font-size: 11px;
  font-weight: 700;
}

.contacts-premise-field input,
.contacts-premise-field textarea,
.contacts-premise-field select {
  width: 100%;
  border: 1px solid var(--contacts-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--contacts-text);
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 500;
}

.contacts-premise-modifiers {
  display: grid;
  gap: 8px;
  color: var(--contacts-muted);
  font-size: 11px;
  font-weight: 700;
}

.contacts-premise-modifier {
  display: inline-grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  border-radius: 10px;
  background: rgba(49, 64, 86, 0.07);
  padding: 6px 8px;
  font-size: 11px;
}

.contacts-seed-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.contacts-classification-confirm {
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 12px;
  background: rgba(255, 251, 235, 0.85);
  padding: 10px;
}

@media (max-width: 720px) {
  .contacts-seed-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

- [ ] **Step 7: Run Round 3 tests**

Run:

```bash
npm.cmd test -- tests/contacts-relationship-classification-view.test.js tests/contacts-profile-template-view.test.js tests/contacts-detail-danger-flows.test.js
```

Expected: pass.

- [ ] **Step 8: Sync Round 3 docs**

Update docs to state:

```text
Contacts detail is now the role control page.
The top relationship block is a read-only current runtime snapshot.
The relationship premise block edits profile-side label, note, seed, primary category, and modifiers.
Manual edits set classificationSource=user_edited.
Contacts still does not own event decisions or current relationship metrics.
```

Required docs for this round:

```text
docs/overview/PROJECT_MASTER_GUIDE.md
docs/roadmap/TODO_ROADMAP.md
docs/pm/TODO_PM_STATUS_REPORT.md
docs/pm/contacts-relationship-system-v2/README.md
docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md
docs/pm/contacts-relationship-system-v2/PRODUCT_BOUNDARY.md
docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md
docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md
docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md
```

- [ ] **Step 9: Validate Round 3 behavior**

Run:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Expected: all pass.

- [ ] **Step 10: Commit Round 3**

Run:

```bash
git add src/views/ContactsView.vue tests/contacts-relationship-classification-view.test.js docs/overview/PROJECT_MASTER_GUIDE.md docs/roadmap/TODO_ROADMAP.md docs/pm/TODO_PM_STATUS_REPORT.md docs/pm/contacts-relationship-system-v2/README.md docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md docs/pm/contacts-relationship-system-v2/PRODUCT_BOUNDARY.md docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md
git commit -m "feat: edit relationship premise in contacts"
```

## Round 4: Event Runtime Reads Saved Classification

**Files:**
- Create: `src/lib/relationship-event-gating.js`
- Modify: `src/stores/relationshipRuntime.js:217`
- Modify: `src/lib/relationship-fact-adapters.js:183`
- Modify: `src/views/ShoppingView.vue:635`
- Modify: `src/views/FoodDeliveryView.vue:449`
- Modify: `src/views/PhoneView.vue:136`
- Modify: `src/views/MapView.vue:1004`
- Modify: `src/views/WalletView.vue:137`
- Modify: `src/stores/calendar.js:954`
- Modify: `src/views/ControlCenterView.vue:393`
- Test: `tests/relationship-event-gating.test.js`
- Test: `tests/relationship-fact-adapters.test.js`
- Test: `tests/control-center-view.test.js`

- [ ] **Step 1: Write failing event-gating tests**

Create `tests/relationship-event-gating.test.js`:

```js
import { describe, expect, test } from 'vitest'
import {
  RELATIONSHIP_EVENT_GATE_DECISION,
  buildRelationshipClassificationContextForTarget,
  evaluateRelationshipEventGate,
} from '../src/lib/relationship-event-gating'

describe('relationship event gating', () => {
  test('builds event context from saved classification and excludes raw free-text label', () => {
    const chatStore = {
      getRoleProfileById: () => ({
        id: 7,
        name: 'Saved Classification',
        relationshipLabelText: 'white moonlight',
        relationshipLabelNote: 'raw prose should not gate events',
        primaryRelationshipCategoryId: 'romance_candidate',
        relationshipModifierIds: ['secret', 'mutual'],
        classificationConfidence: 'high',
        classificationSource: 'ai_auto',
      }),
    }

    const context = buildRelationshipClassificationContextForTarget({
      chatStore,
      target: { profileId: 7, name: 'Saved Classification' },
    })

    expect(context).toMatchObject({
      primaryRelationshipCategoryId: 'romance_candidate',
      relationshipModifierIds: ['secret', 'mutual'],
      classificationSource: 'ai_auto',
    })
    expect(context.relationshipLabelText).toBeUndefined()
    expect(context.relationshipLabelNote).toBeUndefined()
  })

  test('uses low-risk category rules as soft references', () => {
    const decision = evaluateRelationshipEventGate({
      eventType: 'gift_purchased',
      risk: 'low',
      classification: {
        primaryRelationshipCategoryId: 'family_bond',
        relationshipModifierIds: ['caretaking'],
      },
      rule: {
        preferredPrimaryCategoryIds: ['friendship_bond', 'romance_candidate', 'romantic_bond'],
      },
    })

    expect(decision.decision).toBe(RELATIONSHIP_EVENT_GATE_DECISION.ALLOW)
    expect(decision.mode).toBe('soft_reference')
    expect(decision.matched).toBe(false)
  })

  test('blocks high-risk romance events when category does not match', () => {
    const decision = evaluateRelationshipEventGate({
      eventType: 'confession_candidate',
      risk: 'high',
      classification: {
        primaryRelationshipCategoryId: 'family_bond',
        relationshipModifierIds: ['caretaking'],
      },
      rule: {
        allowedPrimaryCategoryIds: ['romance_candidate', 'romantic_bond'],
      },
    })

    expect(decision.decision).toBe(RELATIONSHIP_EVENT_GATE_DECISION.BLOCK)
    expect(decision.mode).toBe('hard_gate')
    expect(decision.reason).toBe('primary_category_not_allowed')
  })

  test('allows high-risk romance events only when hard gate matches', () => {
    const decision = evaluateRelationshipEventGate({
      eventType: 'confession_candidate',
      risk: 'high',
      classification: {
        primaryRelationshipCategoryId: 'romance_candidate',
        relationshipModifierIds: ['mutual'],
      },
      rule: {
        allowedPrimaryCategoryIds: ['romance_candidate', 'romantic_bond'],
        requiredModifierIds: ['mutual'],
      },
    })

    expect(decision.decision).toBe(RELATIONSHIP_EVENT_GATE_DECISION.ALLOW)
    expect(decision.mode).toBe('hard_gate')
    expect(decision.reason).toBe('matched')
  })
})
```

- [ ] **Step 2: Run the event-gating tests and verify they fail**

Run:

```bash
npm.cmd test -- tests/relationship-event-gating.test.js
```

Expected: fail because `src/lib/relationship-event-gating.js` does not exist yet.

- [ ] **Step 3: Implement the mixed-gating helper**

Create `src/lib/relationship-event-gating.js`:

```js
import {
  buildRelationshipClassificationRegistry,
  normalizeRelationshipProfileFields,
} from './relationship-classification-schema'

export const RELATIONSHIP_EVENT_GATE_DECISION = Object.freeze({
  ALLOW: 'allow',
  BLOCK: 'block',
  CONFIRM: 'confirm',
})

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const toIdSet = (value = []) =>
  new Set((Array.isArray(value) ? value : []).map((item) => normalizeText(item, '', 120)).filter(Boolean))

export const buildRelationshipClassificationContextForTarget = ({
  chatStore,
  target = {},
  registry = buildRelationshipClassificationRegistry(),
} = {}) => {
  const profileId = Number(target.profileId || target.roleProfileId || 0)
  const profile = profileId > 0 && typeof chatStore?.getRoleProfileById === 'function'
    ? chatStore.getRoleProfileById(profileId)
    : null
  const fields = normalizeRelationshipProfileFields(profile || {})
  const categoryExists = registry.categoryById.has(fields.primaryRelationshipCategoryId)
  return {
    profileId: profileId > 0 ? Math.floor(profileId) : 0,
    primaryRelationshipCategoryId: categoryExists
      ? fields.primaryRelationshipCategoryId
      : 'ordinary_acquaintance',
    relationshipModifierIds: fields.relationshipModifierIds.filter((id) => registry.modifierById.has(id)),
    classificationConfidence: fields.classificationConfidence,
    classificationSource: fields.classificationSource,
    classificationUpdatedAt: fields.classificationUpdatedAt,
  }
}

export const evaluateRelationshipEventGate = ({
  eventType = '',
  risk = 'low',
  classification = {},
  rule = {},
} = {}) => {
  const primaryCategoryId = normalizeText(
    classification.primaryRelationshipCategoryId,
    'ordinary_acquaintance',
    120,
  )
  const modifierIds = new Set(Array.isArray(classification.relationshipModifierIds)
    ? classification.relationshipModifierIds
    : [])
  const allowedPrimaryCategoryIds = toIdSet(rule.allowedPrimaryCategoryIds)
  const preferredPrimaryCategoryIds = toIdSet(rule.preferredPrimaryCategoryIds)
  const blockedPrimaryCategoryIds = toIdSet(rule.blockedPrimaryCategoryIds)
  const requiredModifierIds = toIdSet(rule.requiredModifierIds)

  const blocked = blockedPrimaryCategoryIds.has(primaryCategoryId)
  const allowedMatch = allowedPrimaryCategoryIds.size === 0 || allowedPrimaryCategoryIds.has(primaryCategoryId)
  const preferredMatch = preferredPrimaryCategoryIds.size === 0 || preferredPrimaryCategoryIds.has(primaryCategoryId)
  const requiredModifiersMatch = [...requiredModifierIds].every((id) => modifierIds.has(id))
  const matched = allowedMatch && preferredMatch && requiredModifiersMatch && !blocked

  if (risk === 'high') {
    if (blocked) {
      return {
        decision: RELATIONSHIP_EVENT_GATE_DECISION.BLOCK,
        mode: 'hard_gate',
        reason: 'primary_category_blocked',
        eventType: normalizeText(eventType, 'relationship_event', 100),
        primaryRelationshipCategoryId: primaryCategoryId,
        relationshipModifierIds: [...modifierIds],
        matched: false,
      }
    }
    if (!allowedMatch) {
      return {
        decision: RELATIONSHIP_EVENT_GATE_DECISION.BLOCK,
        mode: 'hard_gate',
        reason: 'primary_category_not_allowed',
        eventType: normalizeText(eventType, 'relationship_event', 100),
        primaryRelationshipCategoryId: primaryCategoryId,
        relationshipModifierIds: [...modifierIds],
        matched: false,
      }
    }
    if (!requiredModifiersMatch) {
      return {
        decision: rule.confirmOnModifierMismatch === true
          ? RELATIONSHIP_EVENT_GATE_DECISION.CONFIRM
          : RELATIONSHIP_EVENT_GATE_DECISION.BLOCK,
        mode: 'hard_gate',
        reason: 'required_modifier_missing',
        eventType: normalizeText(eventType, 'relationship_event', 100),
        primaryRelationshipCategoryId: primaryCategoryId,
        relationshipModifierIds: [...modifierIds],
        matched: false,
      }
    }
    return {
      decision: RELATIONSHIP_EVENT_GATE_DECISION.ALLOW,
      mode: 'hard_gate',
      reason: 'matched',
      eventType: normalizeText(eventType, 'relationship_event', 100),
      primaryRelationshipCategoryId: primaryCategoryId,
      relationshipModifierIds: [...modifierIds],
      matched: true,
    }
  }

  return {
    decision: RELATIONSHIP_EVENT_GATE_DECISION.ALLOW,
    mode: 'soft_reference',
    reason: matched ? 'matched' : 'soft_mismatch_allowed',
    eventType: normalizeText(eventType, 'relationship_event', 100),
    primaryRelationshipCategoryId: primaryCategoryId,
    relationshipModifierIds: [...modifierIds],
    matched,
  }
}

export const buildRelationshipFactGate = ({
  chatStore,
  target,
  factType,
  risk = 'low',
  rule = {},
  registry,
} = {}) => {
  const classification = buildRelationshipClassificationContextForTarget({
    chatStore,
    target,
    registry,
  })
  return evaluateRelationshipEventGate({
    eventType: factType,
    risk,
    classification,
    rule,
  })
}
```

- [ ] **Step 4: Persist gate audit metadata in relationship runtime**

In `src/stores/relationshipRuntime.js`, add:

```js
const normalizeRelationshipGate = (rawGate = {}) => {
  const source = rawGate && typeof rawGate === 'object' ? rawGate : {}
  const decision = normalizeText(source.decision, '', 40)
  return {
    decision: ['allow', 'block', 'confirm'].includes(decision) ? decision : '',
    mode: normalizeText(source.mode, '', 40),
    reason: normalizeText(source.reason, '', 120),
    eventType: normalizeText(source.eventType, '', 100),
    primaryRelationshipCategoryId: normalizeText(source.primaryRelationshipCategoryId, '', 120),
    relationshipModifierIds: Array.isArray(source.relationshipModifierIds)
      ? [...new Set(source.relationshipModifierIds.map(normalizeTag).filter(Boolean))].slice(0, 12)
      : [],
    matched: source.matched === true,
  }
}
```

Add this field to `normalizeRelationshipEvent`:

```js
relationshipGate: normalizeRelationshipGate(source.relationshipGate),
```

In `recordRelationshipFact`, before major-effect handling, block hard-gated events:

```js
if (event.relationshipGate?.decision === 'block') {
  event.status = RELATIONSHIP_EVENT_STATUS.DISMISSED
  event.effectApplied = false
  event.dismissedAt = Date.now()
} else if (event.relationshipGate?.decision === 'confirm') {
  event.status = RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION
  event.effectApplied = false
} else if (!settings.value.enabled && input.force !== true) {
```

Keep the existing disabled, major, supporting-only, auto-apply, and pending branches after this new gate block.

- [ ] **Step 5: Attach low-risk soft gates from existing relationship fact adapters**

In `src/lib/relationship-fact-adapters.js`, import:

```js
import { buildRelationshipFactGate } from './relationship-event-gating'
```

Add a small helper:

```js
const lowRiskRelationshipGate = ({ chatStore, target, factType }) =>
  buildRelationshipFactGate({
    chatStore,
    target,
    factType,
    risk: 'low',
    rule: {
      preferredPrimaryCategoryIds: [
        'ordinary_acquaintance',
        'family_bond',
        'friendship_bond',
        'romance_candidate',
        'romantic_bond',
        'mentor_bond',
        'professional_bond',
        'power_bond',
        'fandom_bond',
        'rival_bond',
      ],
    },
  })
```

For each existing `record*RelationshipFact` function, accept `chatStore` and pass:

```js
relationshipGate: lowRiskRelationshipGate({
  chatStore,
  target: suggestion.target,
  factType: 'gift_purchased',
}),
```

Use the function-specific fact type for each call:

```text
gift_purchased
shared_meal
completed_call
missed_call
shared_route
shared_expense
transfer_recorded
wallet_order_support
scheduled_calendar_event
```

- [ ] **Step 6: Pass `chatStore` at adapter call sites**

Update the callers:

```js
recordShoppingGiftRelationshipFact({
  chatStore,
  relationshipRuntimeStore,
  order: suggestion.order,
  transaction,
})
```

```js
recordFoodDeliverySharedMealRelationshipFact({
  chatStore,
  relationshipRuntimeStore,
  order: suggestion.order,
  target: selectedSharedMealContact(suggestion.orderId),
  transaction,
})
```

```js
recordPhoneCallRelationshipFact({
  chatStore,
  relationshipRuntimeStore,
  call,
  target,
})
```

```js
recordMapSharedRouteRelationshipFact({
  chatStore,
  relationshipRuntimeStore,
  trip: latestReward,
  target: sharedRouteTarget,
})
```

```js
recordWalletSharedTransferRelationshipFact({
  chatStore,
  relationshipRuntimeStore,
  transaction,
  target,
})
```

In `src/stores/calendar.js`, import `useChatStore` and pass:

```js
chatStore: useChatStore(),
```

inside `recordCalendarConfirmedEventRelationshipFact`.

- [ ] **Step 7: Add adapter and World Hub tests**

Append to `tests/relationship-fact-adapters.test.js`:

```js
test('attaches saved relationship classification gate metadata to low-risk facts', () => {
  const relationshipRuntimeStore = useRelationshipRuntimeStore()
  relationshipRuntimeStore.resetForTesting()
  const chatStore = {
    getRoleProfileById: () => ({
      id: 1,
      primaryRelationshipCategoryId: 'friendship_bond',
      relationshipModifierIds: ['long_term_companion'],
      classificationConfidence: 'high',
      classificationSource: 'user_edited',
    }),
  }
  const event = recordShoppingGiftRelationshipFact({
    chatStore,
    relationshipRuntimeStore,
    order: {
      id: 'shopping_order_gate_1',
      giftRecipient: { name: 'Eva', profileId: 1, contactId: 1, kind: 'role' },
      items: [{ title: 'Tea' }],
    },
    transaction: { amount: '12.00', currency: 'CNY' },
  })

  expect(event.relationshipGate).toMatchObject({
    decision: 'allow',
    mode: 'soft_reference',
    primaryRelationshipCategoryId: 'friendship_bond',
    relationshipModifierIds: ['long_term_companion'],
  })
})
```

Append to `tests/control-center-view.test.js`:

```js
test('shows relationship classification gate details for relationship facts', async () => {
  const systemStore = useSystemStore()
  const relationshipRuntimeStore = useRelationshipRuntimeStore()
  const simulationStore = useSimulationStore()
  systemStore.settings.system.language = 'en-US'
  systemStore.setMoreFeatureToggle('control_center', true)
  relationshipRuntimeStore.resetForTesting()
  simulationStore.resetForTesting()

  relationshipRuntimeStore.recordRelationshipFact({
    target: { profileId: 30, name: 'Gate Review' },
    sourceModule: 'relationship_shopping_gift',
    sourceId: 'gate_review_order:gift',
    factType: 'gift_purchased',
    summary: 'Gift purchased for gate review.',
    metricDeltas: { affinity: 4 },
    relationshipGate: {
      decision: 'allow',
      mode: 'soft_reference',
      reason: 'soft_mismatch_allowed',
      eventType: 'gift_purchased',
      primaryRelationshipCategoryId: 'family_bond',
      relationshipModifierIds: ['caretaking'],
      matched: false,
    },
  })

  const { wrapper } = await mountControlCenterView()
  const detail = wrapper.get('[data-testid="control-center-relationship-detail"]').text()

  expect(detail).toContain('soft_reference')
  expect(detail).toContain('family_bond')
  expect(detail).toContain('soft_mismatch_allowed')

  wrapper.unmount()
})
```

In `src/views/ControlCenterView.vue`, add a gate note to `relationshipEventSafetyNotes`:

```js
event.relationshipGate?.mode
  ? t(
      `Classification gate: ${event.relationshipGate.mode} / ${event.relationshipGate.primaryRelationshipCategoryId || 'ordinary_acquaintance'} / ${event.relationshipGate.reason || 'matched'}`,
      `Classification gate: ${event.relationshipGate.mode} / ${event.relationshipGate.primaryRelationshipCategoryId || 'ordinary_acquaintance'} / ${event.relationshipGate.reason || 'matched'}`,
    )
  : t(
      'No relationship classification gate was recorded for this fact.',
      'No relationship classification gate was recorded for this fact.',
    ),
```

- [ ] **Step 8: Run Round 4 tests**

Run:

```bash
npm.cmd test -- tests/relationship-event-gating.test.js tests/relationship-fact-adapters.test.js tests/relationship-runtime-store.test.js tests/control-center-view.test.js
```

Expected: pass.

- [ ] **Step 9: Sync Round 4 docs**

Update docs to state:

```text
Event/runtime reads saved classification fields, not relationshipLabelText or relationshipLabelNote.
Current low-risk facts attach soft-reference gate audit metadata.
High-risk event classes have a pure hard-gating helper but no new high-impact automation is enabled.
World Hub reviews gate audit metadata and remains read-only/narrow for this slice.
Cheats remains future override scope.
```

Required docs for this round:

```text
docs/overview/PROJECT_MASTER_GUIDE.md
docs/roadmap/TODO_ROADMAP.md
docs/pm/TODO_PM_STATUS_REPORT.md
docs/pm/event-runtime-and-world-hub/README.md
docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md
docs/pm/event-runtime-and-world-hub/PRODUCT_BOUNDARY.md
docs/pm/event-runtime-and-world-hub/IMPLEMENTATION_WORKSTREAMS.md
docs/process/EVENT_WORKFLOW.md
docs/architecture/SIMULATION_EVENT_ENGINE.md
docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md
docs/pm/contacts-relationship-system-v2/README.md
docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md
```

- [ ] **Step 10: Validate Round 4 behavior**

Run:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Expected: all pass.

- [ ] **Step 11: Commit Round 4**

Run:

```bash
git add src/lib/relationship-event-gating.js src/stores/relationshipRuntime.js src/lib/relationship-fact-adapters.js src/views/ShoppingView.vue src/views/FoodDeliveryView.vue src/views/PhoneView.vue src/views/MapView.vue src/views/WalletView.vue src/stores/calendar.js src/views/ControlCenterView.vue tests/relationship-event-gating.test.js tests/relationship-fact-adapters.test.js tests/control-center-view.test.js docs/overview/PROJECT_MASTER_GUIDE.md docs/roadmap/TODO_ROADMAP.md docs/pm/TODO_PM_STATUS_REPORT.md docs/pm/event-runtime-and-world-hub/README.md docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md docs/pm/event-runtime-and-world-hub/PRODUCT_BOUNDARY.md docs/pm/event-runtime-and-world-hub/IMPLEMENTATION_WORKSTREAMS.md docs/process/EVENT_WORKFLOW.md docs/architecture/SIMULATION_EVENT_ENGINE.md docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md docs/pm/contacts-relationship-system-v2/README.md docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md
git commit -m "feat: gate relationship events by saved classification"
```

## Final Acceptance Checklist

- [ ] Role profiles persist `relationshipLabelText`, `relationshipLabelNote`, `initialRelationshipSeed`, `primaryRelationshipCategoryId`, `relationshipModifierIds`, `classificationConfidence`, `classificationSource`, `classificationUpdatedAt`, and `classificationExplanation`.
- [ ] Base categories are fixed and world-specific additions are explicit registry extensions.
- [ ] AI classification goes through `src/lib/ai.js`.
- [ ] High-confidence AI classification auto-saves as `ai_auto`.
- [ ] Medium/low-confidence AI classification requires confirmation and saves as `ai_confirmed`.
- [ ] Manual Contacts edits save as `user_edited`.
- [ ] Later AI passes cannot silently overwrite `user_edited` classification.
- [ ] Contacts shows current relationship from relationship runtime before editable profile-side premise.
- [ ] Contacts does not own event decisions.
- [ ] Relationship runtime still owns current metrics, stage, milestones, and memories.
- [ ] Event/runtime reads saved classification fields and never gates on raw label/note prose.
- [ ] Low-risk facts use classification as a soft reference.
- [ ] High-risk helper supports hard gating without enabling new high-impact automation.
- [ ] World Hub remains review-only/narrow and does not become the main editor.
- [ ] Cheats remains future override scope.
- [ ] After the final round, these commands pass:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Self-Review

- Spec coverage:
  - Schema/store fields and registry seam are covered in Round 1.
  - AI classification, confidence save policy, and user-edit overwrite protection are covered in Round 2.
  - Contacts role-control IA, current runtime snapshot, and editable premise are covered in Round 3.
  - Event/runtime saved-classification reads and mixed gating are covered in Round 4.
- Placeholder scan:
  - The plan uses concrete file paths, test commands, UI selectors, field names, and doc sync targets.
- Type consistency:
  - Profile fields use the same names as the approved spec.
  - Store action names are consistent across UI and tests.
  - Gate metadata uses `relationshipGate` consistently across adapters, runtime, and World Hub.
