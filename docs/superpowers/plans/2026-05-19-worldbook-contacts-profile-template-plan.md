# WorldBook Contacts Profile Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 WorldBook-driven profile-template system and Contacts entity model for Self Profile, Main Role, and NPC without breaking existing role profiles, Chat Directory bindings, relationship runtime, or memory deletion flows.

**Architecture:** Add small schema/helper modules first, then extend existing Pinia stores through normalized backward-compatible fields. WorldBook owns template definitions; Contacts/chat role profiles store copied template links and profile values. UI work is staged after store tests so existing Contacts and Chat behavior stays stable.

**Tech Stack:** Vue 3, Pinia, JavaScript, Vitest, Vue Test Utils, existing localStorage-style store persistence.

---

## Required Reading

Before starting implementation, read:

1. `docs/superpowers/specs/2026-05-19-role-profile-template-index.md`
2. `docs/superpowers/specs/2026-05-19-worldbook-role-profile-templates-design.md`
3. `docs/superpowers/specs/2026-05-19-contacts-profile-entities-design.md`
4. `docs/pm/contacts-relationship-system-v2/README.md`
5. `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
6. `docs/pm/contacts-relationship-system-v2/ROLE_PROFILE_TEMPLATE_DECISION_LOG.md`
7. `src/lib/role-profile-schema.js`
8. `src/stores/chat.js`
9. `src/stores/system.js`
10. `src/views/ContactsView.vue`
11. `src/views/WorldBookView.vue`

## File Map

Create:

- `src/lib/profile-template-schema.js`
  - constants and normalizers for template field types, visibility levels, template scopes, entity types, capability flags, profile values, and template links.
- `tests/profile-template-schema.test.js`
  - unit tests for schema normalization, version links, default presets, entity capability defaults, and value preservation.
- `tests/worldbook-profile-templates-store.test.js`
  - system store tests for template persistence and update review metadata.
- `tests/contacts-profile-entities-store.test.js`
  - chat store tests for Self Profile, Main Role, NPC, template links, profile values, and NPC upgrade.
- `tests/contacts-profile-template-view.test.js`
  - focused Contacts UI tests for entity sections and template-applied fields.
- `tests/worldbook-profile-template-view.test.js`
  - focused WorldBook UI tests for template authoring baseline.

Modify:

- `src/stores/system.js`
  - add WorldBook global preset/world-specific profile templates and store actions.
- `src/stores/chat.js`
  - extend role profile normalization with entity type, primary world/template links, profile values, and capability flags.
- `src/lib/role-profile-schema.js`
  - re-export or bridge profile entity constants where Contacts already imports role-detail constants.
- `src/views/WorldBookView.vue`
  - add a compact profile-template management section.
- `src/views/ContactsView.vue`
  - add entity type UI, self profile/NPC/main role grouping, template application, profile values, and NPC upgrade affordance.
- `src/views/ChatView.vue`
  - adjust world/role/user context assembly gates after store-level tests exist.
- `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
  - update implementation status after tasks land.
- `docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md`
  - update detail IA when UI is implemented.
- `docs/architecture/ROLE_BINDING_CONTRACT.md`
  - update Chat Directory binding semantics when entity type/capability fields are added.

---

## Task 1: Profile Template Schema

**Files:**
- Create: `src/lib/profile-template-schema.js`
- Create: `tests/profile-template-schema.test.js`

- [ ] **Step 1: Write the schema tests first**

Create `tests/profile-template-schema.test.js`:

```js
import {
  CONTACTS_ENTITY_TYPES,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_TEMPLATE_SCOPES,
  PROFILE_VISIBILITY_LEVELS,
  createDefaultCapabilitiesForEntityType,
  createDefaultProfileTemplatePresets,
  normalizeProfileTemplate,
  normalizeProfileTemplateField,
  normalizeProfileTemplateLink,
  normalizeProfileValues,
} from '../src/lib/profile-template-schema'

describe('profile template schema', () => {
  test('normalizes template fields with V1 field types and visibility levels', () => {
    const field = normalizeProfileTemplateField({
      id: 'pheromone',
      label: '信息素',
      type: 'single_select',
      defaultVisibilityLevel: 'familiar',
      entityTypes: ['self_profile', 'main_role', 'npc', 'bad'],
      options: ['白茶', '雪松', '白茶'],
      required: true,
      recommended: true,
      order: 2,
    })

    expect(field).toMatchObject({
      id: 'pheromone',
      label: '信息素',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
      defaultVisibilityLevel: PROFILE_VISIBILITY_LEVELS.FAMILIAR,
      entityTypes: [
        CONTACTS_ENTITY_TYPES.SELF_PROFILE,
        CONTACTS_ENTITY_TYPES.MAIN_ROLE,
        CONTACTS_ENTITY_TYPES.NPC,
      ],
      options: ['白茶', '雪松'],
      required: true,
      recommended: true,
      order: 2,
    })
  })

  test('normalizes world-specific templates and keeps version metadata', () => {
    const template = normalizeProfileTemplate({
      id: 'abo_world_template',
      title: 'ABO 世界模板',
      scope: 'world',
      worldId: 'world_abo',
      version: 3,
      fields: [
        { id: 'pheromone', label: '信息素', type: 'short_text' },
        { id: 'bond', label: '标记关系', type: 'long_text' },
      ],
    })

    expect(template).toMatchObject({
      id: 'abo_world_template',
      title: 'ABO 世界模板',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'world_abo',
      version: 3,
    })
    expect(template.fields.map((field) => field.id)).toEqual(['pheromone', 'bond'])
  })

  test('normalizes profile template link and values without dropping unknown user data', () => {
    const link = normalizeProfileTemplateLink({
      primaryWorldId: 'world_abo',
      profileTemplateId: 'template_abo',
      profileTemplateVersion: 2,
      supplementalKnowledgePointIds: ['kp_a', 'kp_a', 'bad id'],
    })
    const values = normalizeProfileValues([
      { fieldId: 'pheromone', value: '白茶', visibilityLevel: 'familiar', sourceKind: 'manual' },
      { fieldId: 'note', value: '只给亲密角色知道', visibilityLevel: 'intimate' },
    ])

    expect(link).toMatchObject({
      primaryWorldId: 'world_abo',
      profileTemplateId: 'template_abo',
      profileTemplateVersion: 2,
      supplementalKnowledgePointIds: ['kp_a'],
    })
    expect(values).toHaveLength(2)
    expect(values[0]).toMatchObject({
      fieldId: 'pheromone',
      value: '白茶',
      visibilityLevel: PROFILE_VISIBILITY_LEVELS.FAMILIAR,
      sourceKind: 'manual',
    })
  })

  test('sets safe default capabilities for self profile, main role, and NPC', () => {
    expect(createDefaultCapabilitiesForEntityType(CONTACTS_ENTITY_TYPES.SELF_PROFILE)).toMatchObject({
      canAppearInChatDirectory: false,
      canUseFullRelationshipProgress: false,
      canUseMemoryGroups: false,
      canUseRouteProgression: false,
      canAppearInWorldEvents: true,
      canAppearInSocialFeed: true,
    })
    expect(createDefaultCapabilitiesForEntityType(CONTACTS_ENTITY_TYPES.MAIN_ROLE)).toMatchObject({
      canAppearInChatDirectory: true,
      canUseFullRelationshipProgress: true,
      canUseMemoryGroups: true,
      canUseRouteProgression: true,
    })
    expect(createDefaultCapabilitiesForEntityType(CONTACTS_ENTITY_TYPES.NPC)).toMatchObject({
      canAppearInChatDirectory: true,
      canUseFullRelationshipProgress: false,
      canUseMemoryGroups: false,
      canUseRouteProgression: false,
      canAppearInWorldEvents: true,
      canAppearInSocialFeed: true,
    })
  })

  test('ships a small preset library without forcing active world templates', () => {
    const presets = createDefaultProfileTemplatePresets()

    expect(presets.length).toBeGreaterThanOrEqual(3)
    expect(presets.every((template) => template.scope === PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET)).toBe(true)
    expect(presets.some((template) => /ABO/i.test(template.title))).toBe(true)
  })
})
```

- [ ] **Step 2: Run the failing schema test**

Run:

```bash
npm test -- tests/profile-template-schema.test.js
```

Expected: FAIL because `src/lib/profile-template-schema.js` does not exist.

- [ ] **Step 3: Create the schema module**

Create `src/lib/profile-template-schema.js` with:

```js
export const CONTACTS_ENTITY_TYPES = Object.freeze({
  SELF_PROFILE: 'self_profile',
  MAIN_ROLE: 'main_role',
  NPC: 'npc',
})

export const CONTACTS_ENTITY_TYPE_KEYS = Object.freeze(Object.values(CONTACTS_ENTITY_TYPES))

export const PROFILE_TEMPLATE_SCOPES = Object.freeze({
  GLOBAL_PRESET: 'global_preset',
  WORLD: 'world',
  ROLE_SPECIFIC: 'role_specific',
})

export const PROFILE_TEMPLATE_SCOPE_KEYS = Object.freeze(Object.values(PROFILE_TEMPLATE_SCOPES))

export const PROFILE_TEMPLATE_FIELD_TYPES = Object.freeze({
  SHORT_TEXT: 'short_text',
  LONG_TEXT: 'long_text',
  SINGLE_SELECT: 'single_select',
  MULTI_SELECT_TAGS: 'multi_select_tags',
  PERSON_REFERENCE: 'person_reference',
})

export const PROFILE_TEMPLATE_FIELD_TYPE_KEYS = Object.freeze(Object.values(PROFILE_TEMPLATE_FIELD_TYPES))

export const PROFILE_VISIBILITY_LEVELS = Object.freeze({
  PUBLIC: 'public',
  FAMILIAR: 'familiar',
  INTIMATE: 'intimate',
  HIDDEN: 'hidden',
  WORLD_SPECIFIC: 'world_specific',
})

export const PROFILE_VISIBILITY_LEVEL_KEYS = Object.freeze(Object.values(PROFILE_VISIBILITY_LEVELS))

export const PROFILE_VALUE_SOURCE_KINDS = Object.freeze({
  MANUAL: 'manual',
  TEMPLATE_DEFAULT: 'template_default',
  EVENT_ATTACHED: 'event_attached',
})

export const PROFILE_VALUE_SOURCE_KIND_KEYS = Object.freeze(Object.values(PROFILE_VALUE_SOURCE_KINDS))

const MAX_TEXT = 600
const MAX_SHORT_TEXT = 120
const MAX_ID = 80
const MAX_FIELDS = 80
const MAX_VALUES = 160
const MAX_OPTIONS = 80
const MAX_KNOWLEDGE_POINTS = 40

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeText = (value, fallback = '', max = MAX_SHORT_TEXT) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeId = (value, fallback = '') => {
  const normalized = normalizeText(value, fallback, MAX_ID)
  return /^[a-z0-9_-]+$/i.test(normalized) ? normalized : fallback
}

const unique = (items = []) => [...new Set(items)]

export const normalizeContactsEntityType = (value, fallback = CONTACTS_ENTITY_TYPES.MAIN_ROLE) =>
  CONTACTS_ENTITY_TYPE_KEYS.includes(value) ? value : fallback

export const normalizeProfileTemplateScope = (value, fallback = PROFILE_TEMPLATE_SCOPES.WORLD) =>
  PROFILE_TEMPLATE_SCOPE_KEYS.includes(value) ? value : fallback

export const normalizeProfileTemplateFieldType = (
  value,
  fallback = PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
) => (PROFILE_TEMPLATE_FIELD_TYPE_KEYS.includes(value) ? value : fallback)

export const normalizeProfileVisibilityLevel = (
  value,
  fallback = PROFILE_VISIBILITY_LEVELS.FAMILIAR,
) => (PROFILE_VISIBILITY_LEVEL_KEYS.includes(value) ? value : fallback)

export const normalizeProfileValueSourceKind = (
  value,
  fallback = PROFILE_VALUE_SOURCE_KINDS.MANUAL,
) => (PROFILE_VALUE_SOURCE_KIND_KEYS.includes(value) ? value : fallback)

export const normalizeKnowledgePointIdsForTemplate = (ids = []) =>
  unique(
    Array.isArray(ids)
      ? ids.map((id) => normalizeId(id)).filter(Boolean)
      : [],
  ).slice(0, MAX_KNOWLEDGE_POINTS)

export const createDefaultCapabilitiesForEntityType = (entityType = CONTACTS_ENTITY_TYPES.MAIN_ROLE) => {
  const type = normalizeContactsEntityType(entityType)
  if (type === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
    return {
      canAppearInChatDirectory: false,
      canUseFullRelationshipProgress: false,
      canUseMemoryGroups: false,
      canUseRouteProgression: false,
      canAppearInWorldEvents: true,
      canAppearInSocialFeed: true,
    }
  }
  if (type === CONTACTS_ENTITY_TYPES.NPC) {
    return {
      canAppearInChatDirectory: true,
      canUseFullRelationshipProgress: false,
      canUseMemoryGroups: false,
      canUseRouteProgression: false,
      canAppearInWorldEvents: true,
      canAppearInSocialFeed: true,
    }
  }
  return {
    canAppearInChatDirectory: true,
    canUseFullRelationshipProgress: true,
    canUseMemoryGroups: true,
    canUseRouteProgression: true,
    canAppearInWorldEvents: true,
    canAppearInSocialFeed: true,
  }
}

export const normalizeProfileCapabilities = (rawCapabilities = {}, entityType) => {
  const defaults = createDefaultCapabilitiesForEntityType(entityType)
  const source = rawCapabilities && typeof rawCapabilities === 'object' ? rawCapabilities : {}
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [
      key,
      typeof source[key] === 'boolean' ? source[key] : fallback,
    ]),
  )
}

export const normalizeProfileTemplateField = (rawField = {}, fallbackIndex = 0) => {
  const source = rawField && typeof rawField === 'object' ? rawField : {}
  const id = normalizeId(source.id, `field_${Math.max(0, toInt(fallbackIndex, 0))}`)
  const label = normalizeText(source.label || source.title || id, id, MAX_SHORT_TEXT)
  const entityTypes = unique(
    Array.isArray(source.entityTypes)
      ? source.entityTypes.map((type) => CONTACTS_ENTITY_TYPE_KEYS.includes(type) ? type : '').filter(Boolean)
      : CONTACTS_ENTITY_TYPE_KEYS,
  )
  return {
    id,
    label,
    description: normalizeText(source.description || source.helpText, '', MAX_TEXT),
    type: normalizeProfileTemplateFieldType(source.type),
    defaultVisibilityLevel: normalizeProfileVisibilityLevel(source.defaultVisibilityLevel),
    entityTypes: entityTypes.length > 0 ? entityTypes : CONTACTS_ENTITY_TYPE_KEYS,
    options: unique(
      Array.isArray(source.options)
        ? source.options.map((option) => normalizeText(option, '', MAX_SHORT_TEXT)).filter(Boolean)
        : [],
    ).slice(0, MAX_OPTIONS),
    required: source.required === true,
    recommended: source.recommended !== false,
    order: Math.max(0, toInt(source.order, fallbackIndex)),
  }
}

export const normalizeProfileTemplateFields = (fields = []) => {
  if (!Array.isArray(fields)) return []
  const seen = new Set()
  return fields
    .map((field, index) => normalizeProfileTemplateField(field, index))
    .filter((field) => {
      if (seen.has(field.id)) return false
      seen.add(field.id)
      return true
    })
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .slice(0, MAX_FIELDS)
}

export const normalizeProfileTemplate = (rawTemplate = {}, fallbackIndex = 0) => {
  const source = rawTemplate && typeof rawTemplate === 'object' ? rawTemplate : {}
  const scope = normalizeProfileTemplateScope(source.scope)
  const id = normalizeId(source.id, `profile_template_${Date.now()}_${fallbackIndex}`)
  const now = Date.now()
  return {
    id,
    title: normalizeText(source.title || source.name || id, id, MAX_SHORT_TEXT),
    description: normalizeText(source.description || source.summary, '', MAX_TEXT),
    scope,
    worldId: scope === PROFILE_TEMPLATE_SCOPES.WORLD ? normalizeId(source.worldId, 'default_world') : '',
    version: Math.max(1, toInt(source.version, 1)),
    fields: normalizeProfileTemplateFields(source.fields),
    createdAt: Math.max(0, toInt(source.createdAt, now)),
    updatedAt: Math.max(0, toInt(source.updatedAt, now)),
  }
}

export const normalizeProfileTemplates = (templates = []) => {
  if (!Array.isArray(templates)) return []
  const seen = new Set()
  return templates
    .map((template, index) => normalizeProfileTemplate(template, index))
    .filter((template) => {
      if (seen.has(template.id)) return false
      seen.add(template.id)
      return true
    })
}

export const normalizeProfileTemplateLink = (rawLink = {}) => {
  const source = rawLink && typeof rawLink === 'object' ? rawLink : {}
  return {
    primaryWorldId: normalizeId(source.primaryWorldId),
    profileTemplateId: normalizeId(source.profileTemplateId),
    profileTemplateVersion: Math.max(0, toInt(source.profileTemplateVersion, 0)),
    supplementalKnowledgePointIds: normalizeKnowledgePointIdsForTemplate(
      source.supplementalKnowledgePointIds || source.knowledgePointIds,
    ),
  }
}

export const normalizeProfileValue = (rawValue = {}, fallbackIndex = 0) => {
  const source = rawValue && typeof rawValue === 'object' ? rawValue : {}
  const fieldId = normalizeId(source.fieldId || source.id, `value_${fallbackIndex}`)
  return {
    id: normalizeId(source.id, `${fieldId}_${fallbackIndex}`),
    fieldId,
    value: Array.isArray(source.value)
      ? unique(source.value.map((item) => normalizeText(item, '', MAX_SHORT_TEXT)).filter(Boolean)).slice(0, MAX_OPTIONS)
      : normalizeText(source.value, '', MAX_TEXT),
    visibilityLevel: normalizeProfileVisibilityLevel(source.visibilityLevel),
    sourceKind: normalizeProfileValueSourceKind(source.sourceKind),
    updatedAt: Math.max(0, toInt(source.updatedAt, Date.now())),
  }
}

export const normalizeProfileValues = (values = []) => {
  if (!Array.isArray(values)) return []
  const seen = new Set()
  return values
    .map((value, index) => normalizeProfileValue(value, index))
    .filter((value) => {
      if (seen.has(value.fieldId)) return false
      seen.add(value.fieldId)
      return Boolean(value.fieldId)
    })
    .slice(0, MAX_VALUES)
}

export const createDefaultProfileTemplatePresets = () =>
  normalizeProfileTemplates([
    {
      id: 'preset_basic_modern',
      title: 'Basic Modern Profile',
      scope: PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET,
      fields: [
        { id: 'identity', label: '身份', type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT },
        { id: 'relationship_setting', label: '关系设定', type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT },
        { id: 'life_habit', label: '生活习惯', type: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS },
      ],
    },
    {
      id: 'preset_abo',
      title: 'ABO Profile',
      scope: PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET,
      fields: [
        { id: 'secondary_gender', label: '第二性别', type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT, options: ['Alpha', 'Beta', 'Omega'] },
        { id: 'pheromone', label: '信息素', type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT },
        { id: 'bond_mark', label: '标记关系', type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT },
      ],
    },
    {
      id: 'preset_xianxia',
      title: 'Xianxia Profile',
      scope: PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET,
      fields: [
        { id: 'cultivation_stage', label: '境界', type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT },
        { id: 'spiritual_root', label: '灵根', type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT },
        { id: 'sect', label: '宗门', type: PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE },
      ],
    },
  ])
```

- [ ] **Step 4: Run the schema test again**

Run:

```bash
npm test -- tests/profile-template-schema.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add src/lib/profile-template-schema.js tests/profile-template-schema.test.js
git commit -m "feat: add profile template schema"
```

Expected: commit succeeds.

---

## Task 2: WorldBook Template Store Baseline

**Files:**
- Modify: `src/stores/system.js`
- Create: `tests/worldbook-profile-templates-store.test.js`

- [ ] **Step 1: Write WorldBook template store tests**

Create `tests/worldbook-profile-templates-store.test.js`:

```js
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { useSystemStore } from '../src/stores/system'
import { PROFILE_TEMPLATE_SCOPES } from '../src/lib/profile-template-schema'

describe('WorldBook profile templates in system store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('starts with global preset templates and can create a world-specific copy', () => {
    const store = useSystemStore()

    const presets = store.listProfileTemplatePresets()
    expect(presets.some((template) => /ABO/i.test(template.title))).toBe(true)

    const copied = store.createWorldProfileTemplateFromPreset('preset_abo', {
      worldId: 'world_abo_custom',
      title: '我的 ABO 世界',
    })

    expect(copied).toMatchObject({
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'world_abo_custom',
      title: '我的 ABO 世界',
      version: 1,
    })
    expect(store.listWorldProfileTemplates('world_abo_custom')).toHaveLength(1)
  })

  test('updates a world-specific template by bumping version and preserving field ids', () => {
    const store = useSystemStore()
    const created = store.createWorldProfileTemplateFromPreset('preset_abo', {
      worldId: 'world_abo_custom',
      title: '我的 ABO 世界',
    })

    const updated = store.updateWorldProfileTemplate(created.id, {
      title: '我的 ABO 世界 v2',
      fields: [
        ...created.fields,
        { id: 'family_rank', label: '家族等级', type: 'single_select', options: ['高', '中', '低'] },
      ],
    })

    expect(updated.version).toBe(2)
    expect(updated.fields.map((field) => field.id)).toContain('family_rank')
    expect(store.getProfileTemplateById(created.id).title).toBe('我的 ABO 世界 v2')
  })

  test('hydrates persisted profile templates without losing versions', () => {
    const store = useSystemStore()
    const created = store.createWorldProfileTemplateFromPreset('preset_basic_modern', {
      worldId: 'world_modern',
      title: '现代世界模板',
    })
    store.saveNow()

    setActivePinia(createPinia())
    const restored = useSystemStore()
    restored.restoreFromStorage()

    expect(restored.getProfileTemplateById(created.id)).toMatchObject({
      id: created.id,
      version: 1,
      worldId: 'world_modern',
    })
  })
})
```

- [ ] **Step 2: Run the failing store test**

Run:

```bash
npm test -- tests/worldbook-profile-templates-store.test.js
```

Expected: FAIL because the store has no profile template actions yet.

- [ ] **Step 3: Add imports and default state to `src/stores/system.js`**

In `src/stores/system.js`, import:

```js
import {
  PROFILE_TEMPLATE_SCOPES,
  createDefaultProfileTemplatePresets,
  normalizeProfileTemplate,
  normalizeProfileTemplates,
} from '../lib/profile-template-schema'
```

Add a default to the user/world kernel state near existing worldview/knowledge point defaults:

```js
profileTemplates: createDefaultProfileTemplatePresets(),
```

Exact location:

- in `src/stores/system.js`, find the reactive `user` object that currently contains `worldBook`, `globalWorldview`, and `knowledgePoints`;
- add `profileTemplates: createDefaultProfileTemplatePresets(),` immediately after `knowledgePoints: [],`.

- [ ] **Step 4: Add store getters/actions**

In `src/stores/system.js`, add actions near existing knowledge-point actions:

```js
const listProfileTemplates = () => normalizeProfileTemplates(user.profileTemplates)

const listProfileTemplatePresets = () =>
  listProfileTemplates().filter((template) => template.scope === PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET)

const listWorldProfileTemplates = (worldId = '') => {
  const targetWorldId = typeof worldId === 'string' && worldId.trim() ? worldId.trim() : 'default_world'
  return listProfileTemplates().filter(
    (template) => template.scope === PROFILE_TEMPLATE_SCOPES.WORLD && template.worldId === targetWorldId,
  )
}

const getProfileTemplateById = (templateId = '') =>
  listProfileTemplates().find((template) => template.id === templateId) || null

const replaceProfileTemplateList = (templates = []) => {
  user.profileTemplates = normalizeProfileTemplates(templates)
}

const upsertProfileTemplate = (templateInput = {}) => {
  const template = normalizeProfileTemplate(templateInput)
  const current = listProfileTemplates()
  const index = current.findIndex((item) => item.id === template.id)
  if (index >= 0) {
    current[index] = template
  } else {
    current.push(template)
  }
  replaceProfileTemplateList(current)
  return template
}

const createWorldProfileTemplateFromPreset = (presetId, options = {}) => {
  const preset = getProfileTemplateById(presetId)
  if (!preset) return null
  return upsertProfileTemplate({
    ...preset,
    id: `world_template_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    scope: PROFILE_TEMPLATE_SCOPES.WORLD,
    worldId: options.worldId || 'default_world',
    title: options.title || preset.title,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
}

const updateWorldProfileTemplate = (templateId, updates = {}) => {
  const existing = getProfileTemplateById(templateId)
  if (!existing || existing.scope !== PROFILE_TEMPLATE_SCOPES.WORLD) return null
  return upsertProfileTemplate({
    ...existing,
    ...updates,
    id: existing.id,
    scope: PROFILE_TEMPLATE_SCOPES.WORLD,
    worldId: updates.worldId || existing.worldId,
    version: existing.version + 1,
    updatedAt: Date.now(),
  })
}
```

Return these actions from the store:

```js
listProfileTemplates,
listProfileTemplatePresets,
listWorldProfileTemplates,
getProfileTemplateById,
upsertProfileTemplate,
createWorldProfileTemplateFromPreset,
updateWorldProfileTemplate,
```

- [ ] **Step 5: Ensure hydration normalizes templates**

Where persisted user/world state is restored in `src/stores/system.js`, ensure:

```js
user.profileTemplates = normalizeProfileTemplates(
  Array.isArray(user.profileTemplates) && user.profileTemplates.length > 0
    ? user.profileTemplates
    : createDefaultProfileTemplatePresets(),
)
```

Exact location:

- in `applyPersistedSnapshot`, after:

```js
user.knowledgePoints = normalizedWorldKernel.knowledgePoints
```

- insert the `user.profileTemplates = ...` normalization shown above.

Also update `persistToStorage` in the `user` snapshot object. After the `knowledgePoints` copy, add:

```js
          profileTemplates: Array.isArray(user.profileTemplates)
            ? normalizeProfileTemplates(user.profileTemplates).map((template) => ({
                ...template,
                fields: template.fields.map((field) => ({
                  ...field,
                  entityTypes: [...field.entityTypes],
                  options: [...field.options],
                })),
              }))
            : createDefaultProfileTemplatePresets(),
```

- [ ] **Step 6: Run the store test**

Run:

```bash
npm test -- tests/worldbook-profile-templates-store.test.js
```

Expected: PASS.

- [ ] **Step 7: Run existing WorldBook/knowledge tests**

Run:

```bash
npm test -- tests/chat-role-knowledge-binding.test.js tests/chat-worldbook-binding-visibility.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

Run:

```bash
git add src/stores/system.js tests/worldbook-profile-templates-store.test.js
git commit -m "feat: store worldbook profile templates"
```

Expected: commit succeeds.

---

## Task 3: Contacts Entity Type And Profile Value Store Baseline

**Files:**
- Modify: `src/stores/chat.js`
- Modify: `src/lib/role-profile-schema.js`
- Create: `tests/contacts-profile-entities-store.test.js`

- [ ] **Step 1: Write Contacts entity store tests**

Create `tests/contacts-profile-entities-store.test.js`:

```js
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { useChatStore } from '../src/stores/chat'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/profile-template-schema'

describe('Contacts profile entity model', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('creates self profile without chat-target capabilities', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      roleId: '1000',
      name: '我的档案',
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
      profileValues: [{ fieldId: 'pheromone', value: '白茶', visibilityLevel: 'familiar' }],
    })

    expect(profile.entityType).toBe(CONTACTS_ENTITY_TYPES.SELF_PROFILE)
    expect(profile.capabilities.canAppearInChatDirectory).toBe(false)
    expect(profile.profileValues[0]).toMatchObject({ fieldId: 'pheromone', value: '白茶' })
  })

  test('creates NPC with lightweight relationship defaults and allows chat binding', () => {
    const store = useChatStore()
    const npc = store.addRoleProfile({
      roleId: '1001',
      name: '宗门长老',
      entityType: CONTACTS_ENTITY_TYPES.NPC,
    })
    const binding = store.bindRoleProfile(npc.id)

    expect(npc.capabilities.canUseFullRelationshipProgress).toBe(false)
    expect(npc.capabilities.canAppearInChatDirectory).toBe(true)
    expect(binding.profileId).toBe(npc.id)
  })

  test('upgrades NPC to main role while preserving values and existing chat binding', () => {
    const store = useChatStore()
    const npc = store.addRoleProfile({
      roleId: '1002',
      name: '同班同学',
      entityType: CONTACTS_ENTITY_TYPES.NPC,
      profileValues: [{ fieldId: 'club', value: '摄影社' }],
    })
    const binding = store.bindRoleProfile(npc.id)

    const upgraded = store.upgradeNpcToMainRole(npc.id, {
      relationshipMode: 'lightweight',
      role: '主角同学',
      bio: '后来变得重要的同学。',
    })

    expect(upgraded.entityType).toBe(CONTACTS_ENTITY_TYPES.MAIN_ROLE)
    expect(upgraded.profileValues).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldId: 'club', value: '摄影社' }),
    ]))
    expect(upgraded.capabilities.canUseFullRelationshipProgress).toBe(false)
    expect(store.getContactById(binding.id).profileId).toBe(npc.id)
  })

  test('stores one primary world/template context plus supplemental knowledge points', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      roleId: '1003',
      name: 'ABO 角色',
      templateLink: {
        primaryWorldId: 'world_abo',
        profileTemplateId: 'template_abo',
        profileTemplateVersion: 2,
        supplementalKnowledgePointIds: ['kp_a', 'kp_a', 'bad id'],
      },
    })

    expect(profile.templateLink).toMatchObject({
      primaryWorldId: 'world_abo',
      profileTemplateId: 'template_abo',
      profileTemplateVersion: 2,
      supplementalKnowledgePointIds: ['kp_a'],
    })
  })
})
```

- [ ] **Step 2: Run the failing entity store test**

Run:

```bash
npm test -- tests/contacts-profile-entities-store.test.js
```

Expected: FAIL because entity fields/actions do not exist yet.

- [ ] **Step 3: Bridge exports in `src/lib/role-profile-schema.js`**

At the top or bottom of `src/lib/role-profile-schema.js`, export from the new schema:

```js
export {
  CONTACTS_ENTITY_TYPES,
  PROFILE_VISIBILITY_LEVELS,
  createDefaultCapabilitiesForEntityType,
  normalizeContactsEntityType,
  normalizeProfileCapabilities,
  normalizeProfileTemplateLink,
  normalizeProfileValues,
} from './profile-template-schema'
```

- [ ] **Step 4: Import schema helpers into `src/stores/chat.js`**

Add to the existing role-profile-schema import:

```js
  CONTACTS_ENTITY_TYPES,
  createDefaultCapabilitiesForEntityType,
  normalizeContactsEntityType,
  normalizeProfileCapabilities,
  normalizeProfileTemplateLink,
  normalizeProfileValues,
```

- [ ] **Step 5: Extend `normalizeRoleProfile`**

Inside `normalizeRoleProfile`, after `avatarImage` is calculated, add:

```js
  const entityType = normalizeContactsEntityType(
    rawProfile?.entityType,
    rawProfile?.isSelfProfile ? CONTACTS_ENTITY_TYPES.SELF_PROFILE : CONTACTS_ENTITY_TYPES.MAIN_ROLE,
  )
```

Then add these fields to the returned object:

```js
    entityType,
    templateLink: normalizeProfileTemplateLink(rawProfile?.templateLink),
    profileValues: normalizeProfileValues(rawProfile?.profileValues),
    capabilities: normalizeProfileCapabilities(rawProfile?.capabilities, entityType),
```

Keep existing `isMain` for backward compatibility. For new entity meaning, do not remove `isMain` yet.

- [ ] **Step 6: Extend `updateRoleProfile`**

In `updateRoleProfile`, add:

```js
    if (typeof updates.entityType === 'string') {
      const entityType = normalizeContactsEntityType(updates.entityType, target.entityType)
      target.entityType = entityType
      target.capabilities = normalizeProfileCapabilities(target.capabilities, entityType)
    }
    if (updates.templateLink && typeof updates.templateLink === 'object') {
      target.templateLink = normalizeProfileTemplateLink(updates.templateLink)
    }
    if (Array.isArray(updates.profileValues)) {
      target.profileValues = normalizeProfileValues(updates.profileValues)
    }
    if (updates.capabilities && typeof updates.capabilities === 'object') {
      target.capabilities = normalizeProfileCapabilities(updates.capabilities, target.entityType)
    }
```

- [ ] **Step 7: Add `upgradeNpcToMainRole` action**

Near `updateRoleProfile`, add:

```js
  const upgradeNpcToMainRole = (profileId, options = {}) => {
    const target = getRoleProfileById(profileId)
    if (!target || target.entityType !== CONTACTS_ENTITY_TYPES.NPC) return null

    const relationshipMode = options.relationshipMode === 'full' ? 'full' : 'lightweight'
    target.entityType = CONTACTS_ENTITY_TYPES.MAIN_ROLE
    target.isMain = true
    if (typeof options.role === 'string') target.role = options.role
    if (typeof options.bio === 'string') target.bio = options.bio
    target.capabilities = normalizeProfileCapabilities(
      {
        ...createDefaultCapabilitiesForEntityType(CONTACTS_ENTITY_TYPES.MAIN_ROLE),
        canUseFullRelationshipProgress: relationshipMode === 'full',
        canUseMemoryGroups: relationshipMode === 'full',
        canUseRouteProgression: relationshipMode === 'full',
      },
      CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    )
    target.updatedAt = nowTs()
    return target
  }
```

Return it from the store:

```js
upgradeNpcToMainRole,
```

- [ ] **Step 8: Include new fields in backup snapshots**

Where `roleProfiles` are exported in `src/stores/chat.js`, ensure the spread or object includes:

```js
entityType: profile.entityType,
templateLink: { ...profile.templateLink },
profileValues: profile.profileValues.map((item) => ({ ...item })),
capabilities: { ...profile.capabilities },
```

If profiles are exported via `{ ...profile }`, verify nested arrays/objects are cloned.

- [ ] **Step 9: Run store tests**

Run:

```bash
npm test -- tests/contacts-profile-entities-store.test.js tests/chat-store-model.test.js tests/contacts-relationship-backup-restore.test.js
```

Expected: PASS.

- [ ] **Step 10: Commit Task 3**

Run:

```bash
git add src/stores/chat.js src/lib/role-profile-schema.js tests/contacts-profile-entities-store.test.js
git commit -m "feat: add contacts profile entity model"
```

Expected: commit succeeds.

---

## Task 4: WorldBook Template Authoring UI

**Files:**
- Modify: `src/views/WorldBookView.vue`
- Create: `tests/worldbook-profile-template-view.test.js`

- [ ] **Step 1: Write WorldBook UI test**

Create `tests/worldbook-profile-template-view.test.js`:

```js
import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import WorldBookView from '../src/views/WorldBookView.vue'
import { useSystemStore } from '../src/stores/system'

describe('WorldBookView profile templates', () => {
  test('shows preset templates and creates a world-specific template copy', async () => {
    const wrapper = mount(WorldBookView, {
      global: {
        plugins: [
          createTestingPinia({
            stubActions: false,
            createSpy: vi.fn,
          }),
        ],
        stubs: ['RouterLink'],
      },
    })
    const store = useSystemStore()

    expect(wrapper.text()).toContain('角色档案模板')
    expect(wrapper.text()).toContain('ABO Profile')

    await wrapper.get('[data-testid="worldbook-template-copy-preset_abo"]').trigger('click')

    expect(store.listWorldProfileTemplates('default_world')).toHaveLength(1)
    expect(wrapper.text()).toContain('世界观专属模板')
  })
})
```

- [ ] **Step 2: Run the failing UI test**

Run:

```bash
npm test -- tests/worldbook-profile-template-view.test.js
```

Expected: FAIL because WorldBookView has no profile template section.

- [ ] **Step 3: Add computed template data to `WorldBookView.vue`**

In `<script setup>`, add:

```js
const profileTemplatePresets = computed(() => systemStore.listProfileTemplatePresets())
const worldProfileTemplates = computed(() => systemStore.listWorldProfileTemplates('default_world'))

const copyProfileTemplatePreset = (presetId) => {
  const created = systemStore.createWorldProfileTemplateFromPreset(presetId, {
    worldId: 'default_world',
  })
  if (!created) {
    uiNotice.value = t('模板复制失败。', 'Template copy failed.')
    return
  }
  systemStore.saveNow()
  pulseSaved(t('角色档案模板已复制到当前世界观。', 'Profile template copied into this worldview.'))
}
```

- [ ] **Step 4: Add a compact template section to the template**

In `WorldBookView.vue`, place this section after knowledge-point management or near the worldview panel:

```vue
<section class="worldbook-card space-y-3" data-testid="worldbook-profile-templates">
  <div>
    <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
      {{ t('角色档案模板', 'Role profile templates') }}
    </p>
    <h2 class="text-lg font-semibold">{{ t('世界书定义档案结构', 'WorldBook defines profile structure') }}</h2>
    <p class="text-sm text-gray-500">
      {{ t('先从全局预设复制到当前世界观，再在通讯录中为角色填写具体值。', 'Copy a preset into the current worldview, then fill concrete values in Contacts.') }}
    </p>
  </div>

  <div class="space-y-2">
    <p class="text-sm font-semibold">{{ t('全局预设模板', 'Global preset templates') }}</p>
    <div v-for="preset in profileTemplatePresets" :key="preset.id" class="worldbook-template-row">
      <div>
        <p class="font-medium">{{ preset.title }}</p>
        <p class="text-xs text-gray-500">{{ preset.fields.length }} {{ t('个栏位', 'fields') }}</p>
      </div>
      <button
        type="button"
        class="worldbook-secondary-action"
        :data-testid="`worldbook-template-copy-${preset.id}`"
        @click="copyProfileTemplatePreset(preset.id)"
      >
        {{ t('复制到当前世界观', 'Copy to worldview') }}
      </button>
    </div>
  </div>

  <div class="space-y-2">
    <p class="text-sm font-semibold">{{ t('世界观专属模板', 'World-specific templates') }}</p>
    <p v-if="worldProfileTemplates.length === 0" class="text-sm text-gray-500">
      {{ t('还没有专属模板。', 'No world-specific templates yet.') }}
    </p>
    <div v-for="template in worldProfileTemplates" :key="template.id" class="worldbook-template-row">
      <div>
        <p class="font-medium">{{ template.title }}</p>
        <p class="text-xs text-gray-500">
          v{{ template.version }} · {{ template.fields.length }} {{ t('个栏位', 'fields') }}
        </p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 5: Add minimal styles**

In the `<style>` block of `WorldBookView.vue`, add:

```css
.worldbook-template-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.worldbook-secondary-action {
  border: 1px solid rgba(99, 102, 241, 0.28);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #4338ca;
  background: rgba(238, 242, 255, 0.9);
}
```

Do not spend this task on broader visual polish. If style names conflict, rename these two classes to `worldbook-template-row-v1` and `worldbook-template-action-v1` and use those exact names in the markup.

- [ ] **Step 6: Run WorldBook tests**

Run:

```bash
npm test -- tests/worldbook-profile-template-view.test.js tests/worldbook-profile-templates-store.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

Run:

```bash
git add src/views/WorldBookView.vue tests/worldbook-profile-template-view.test.js
git commit -m "feat: show worldbook profile templates"
```

Expected: commit succeeds.

---

## Task 5: Contacts Entity UI And Template Values

**Files:**
- Modify: `src/views/ContactsView.vue`
- Create: `tests/contacts-profile-template-view.test.js`

- [ ] **Step 1: Write Contacts UI test**

Create `tests/contacts-profile-template-view.test.js`:

```js
import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import ContactsView from '../src/views/ContactsView.vue'
import { useChatStore } from '../src/stores/chat'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/profile-template-schema'

describe('ContactsView profile entity UI', () => {
  test('groups self profile, main roles, and NPCs with clear labels', async () => {
    const wrapper = mount(ContactsView, {
      global: {
        plugins: [
          createTestingPinia({
            stubActions: false,
            createSpy: vi.fn,
          }),
        ],
        stubs: ['RouterLink', 'ImageSourcePicker', 'AssetStatusBadge', 'AssetThumbnailOption'],
      },
    })
    const chatStore = useChatStore()
    chatStore.addRoleProfile({ roleId: '1200', name: '我的档案', entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE })
    chatStore.addRoleProfile({ roleId: '1201', name: '主角色 A', entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE })
    chatStore.addRoleProfile({ roleId: '1202', name: '路人 NPC', entityType: CONTACTS_ENTITY_TYPES.NPC })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('我的档案')
    expect(wrapper.text()).toContain('主角色')
    expect(wrapper.text()).toContain('NPC / 世界角色')
  })

  test('shows template-applied profile values in role detail', async () => {
    const wrapper = mount(ContactsView, {
      global: {
        plugins: [
          createTestingPinia({
            stubActions: false,
            createSpy: vi.fn,
          }),
        ],
        stubs: ['RouterLink', 'ImageSourcePicker', 'AssetStatusBadge', 'AssetThumbnailOption'],
      },
    })
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1203',
      name: '白茶角色',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      profileValues: [{ fieldId: 'pheromone', value: '白茶', visibilityLevel: 'familiar' }],
    })
    await wrapper.vm.$nextTick()

    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')

    expect(wrapper.get('[data-testid="contacts-role-detail"]').text()).toContain('白茶')
    expect(wrapper.get('[data-testid="contacts-role-detail"]').text()).toContain('familiar')
  })
})
```

- [ ] **Step 2: Run the failing Contacts UI test**

Run:

```bash
npm test -- tests/contacts-profile-template-view.test.js
```

Expected: FAIL because the UI does not show entity groups or profile values yet.

- [ ] **Step 3: Import entity constants in `ContactsView.vue`**

Extend the existing `role-profile-schema` import:

```js
  CONTACTS_ENTITY_TYPES,
```

- [ ] **Step 4: Replace legacy grouping computed values**

Near current `mainProfiles` and `npcProfiles`, add:

```js
const selfProfiles = computed(() =>
  roleProfiles.value.filter((item) => item.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE),
)
const mainRoleProfiles = computed(() =>
  roleProfiles.value.filter((item) => (item.entityType || CONTACTS_ENTITY_TYPES.MAIN_ROLE) === CONTACTS_ENTITY_TYPES.MAIN_ROLE),
)
const npcRoleProfiles = computed(() =>
  roleProfiles.value.filter((item) => item.entityType === CONTACTS_ENTITY_TYPES.NPC),
)
```

Keep `mainProfiles` / `npcProfiles` as aliases during the transition if existing template code still uses them:

```js
const mainProfiles = mainRoleProfiles
const npcProfiles = npcRoleProfiles
```

- [ ] **Step 5: Add profile value display helpers**

In `<script setup>`, add:

```js
const selectedProfileValues = computed(() =>
  Array.isArray(selectedProfile.value?.profileValues) ? selectedProfile.value.profileValues : [],
)

const profileValueLabel = (value) => {
  if (!value?.fieldId) return t('自定义栏位', 'Custom field')
  if (value.fieldId === 'pheromone') return t('信息素', 'Pheromone')
  if (value.fieldId === 'relationship_setting') return t('关系设定', 'Relationship setting')
  return value.fieldId
}
```

- [ ] **Step 6: Add self profile and NPC list groups**

In the Contacts list template, add sections for:

```vue
<section v-if="selfProfiles.length > 0" class="contacts-list-section">
  <p class="contacts-list-heading">{{ t('我的档案', 'My Profile') }}</p>
  <!-- reuse existing row markup with selfProfiles -->
</section>

<section class="contacts-list-section">
  <p class="contacts-list-heading">{{ t('主角色', 'Main Roles') }}</p>
  <!-- reuse existing row markup with mainRoleProfiles -->
</section>

<section v-if="npcRoleProfiles.length > 0" class="contacts-list-section">
  <p class="contacts-list-heading">{{ t('NPC / 世界角色', 'NPC / World roles') }}</p>
  <!-- reuse existing row markup with npcRoleProfiles -->
</section>
```

Use the existing `contacts-row-${profile.id}` data-testid for rows.

- [ ] **Step 7: Add profile values in detail**

Inside `[data-testid="contacts-role-detail"]`, add a section before existing detail item sections:

```vue
<section v-if="selectedProfileValues.length > 0" class="contacts-detail-section space-y-2">
  <div>
    <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
      {{ t('世界观档案栏位', 'World profile fields') }}
    </p>
    <h3 class="font-semibold">{{ t('扩展设定', 'Extended settings') }}</h3>
  </div>
  <div v-for="value in selectedProfileValues" :key="value.fieldId" class="contacts-detail-item">
    <div>
      <p class="font-medium">{{ profileValueLabel(value) }}</p>
      <p class="text-sm text-gray-600">{{ Array.isArray(value.value) ? value.value.join('、') : value.value }}</p>
    </div>
    <span class="contacts-detail-source-chip">{{ value.visibilityLevel }}</span>
  </div>
</section>
```

- [ ] **Step 8: Run Contacts UI tests**

Run:

```bash
npm test -- tests/contacts-profile-template-view.test.js tests/contacts-detail-danger-flows.test.js tests/contacts-chat-directory-boundary-copy.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit Task 5**

Run:

```bash
git add src/views/ContactsView.vue tests/contacts-profile-template-view.test.js
git commit -m "feat: show contacts profile entity sections"
```

Expected: commit succeeds.

---

## Task 6: NPC Upgrade Flow

**Files:**
- Modify: `src/views/ContactsView.vue`
- Modify: `tests/contacts-profile-template-view.test.js`

- [ ] **Step 1: Add NPC upgrade UI test**

Append to `tests/contacts-profile-template-view.test.js`:

```js
test('upgrades an NPC to main role while preserving chat binding', async () => {
  const wrapper = mount(ContactsView, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: false,
          createSpy: vi.fn,
        }),
      ],
      stubs: ['RouterLink', 'ImageSourcePicker', 'AssetStatusBadge', 'AssetThumbnailOption'],
    },
  })
  const chatStore = useChatStore()
  const npc = chatStore.addRoleProfile({
    roleId: '1301',
    name: '可升级 NPC',
    entityType: CONTACTS_ENTITY_TYPES.NPC,
  })
  const binding = chatStore.bindRoleProfile(npc.id)
  await wrapper.vm.$nextTick()

  await wrapper.get(`[data-testid="contacts-row-${npc.id}"]`).trigger('click')
  await wrapper.get('[data-testid="contacts-upgrade-npc"]').trigger('click')

  const upgraded = chatStore.getRoleProfileById(npc.id)
  expect(upgraded.entityType).toBe(CONTACTS_ENTITY_TYPES.MAIN_ROLE)
  expect(chatStore.getContactById(binding.id).profileId).toBe(npc.id)
})
```

- [ ] **Step 2: Run the failing upgrade UI test**

Run:

```bash
npm test -- tests/contacts-profile-template-view.test.js
```

Expected: FAIL because the upgrade button does not exist.

- [ ] **Step 3: Add selected-profile entity helpers**

In `ContactsView.vue`, add:

```js
const selectedProfileEntityType = computed(
  () => selectedProfile.value?.entityType || CONTACTS_ENTITY_TYPES.MAIN_ROLE,
)
const selectedProfileIsNpc = computed(() => selectedProfileEntityType.value === CONTACTS_ENTITY_TYPES.NPC)
const selectedProfileChatBound = computed(() =>
  selectedProfile.value?.id ? chatStore.isRoleProfileBound(selectedProfile.value.id) : false,
)
```

- [ ] **Step 4: Add upgrade handler**

In `ContactsView.vue`, add:

```js
const upgradeSelectedNpcToMainRole = async () => {
  const profile = selectedProfile.value
  if (!profile || profile.entityType !== CONTACTS_ENTITY_TYPES.NPC) return
  const confirmed = await confirmDialog({
    title: t('升级为主角色', 'Upgrade to main role'),
    message: t(
      '这会保留 NPC 档案、关联活动和已有会话绑定，并解锁主角色能力。默认先使用轻量关系。',
      'This preserves the NPC profile, linked activity, and existing chat binding while unlocking main-role capabilities. Lightweight relationship is used by default.',
    ),
    confirmText: t('升级', 'Upgrade'),
    cancelText: t('取消', 'Cancel'),
    tone: 'primary',
  })
  if (!confirmed) return
  const upgraded = chatStore.upgradeNpcToMainRole(profile.id, {
    relationshipMode: 'lightweight',
  })
  if (upgraded) {
    setUiNotice('success', t('NPC 已升级为主角色。', 'NPC upgraded to main role.'))
    chatStore.saveNow?.()
  }
}
```

`confirmDialog` already returns a truthy/falsy value in existing Contacts danger flows. Use the exact `const confirmed = await confirmDialog(...)` style shown above.

- [ ] **Step 5: Add button in detail overview**

In the detail overview section, add:

```vue
<button
  v-if="selectedProfileIsNpc"
  type="button"
  class="contacts-primary-action"
  data-testid="contacts-upgrade-npc"
  @click="upgradeSelectedNpcToMainRole"
>
  {{ t('升级为主角色', 'Upgrade to main role') }}
</button>
```

Add a small copy line near it:

```vue
<p v-if="selectedProfileIsNpc" class="text-xs text-gray-500">
  {{ selectedProfileChatBound
    ? t('已有会话绑定会被保留。', 'Existing Chat binding will be preserved.')
    : t('升级不会强制加入会话通讯录。', 'Upgrade will not force Chat Directory binding.') }}
</p>
```

- [ ] **Step 6: Run upgrade tests**

Run:

```bash
npm test -- tests/contacts-profile-template-view.test.js tests/contacts-detail-danger-flows.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit Task 6**

Run:

```bash
git add src/views/ContactsView.vue tests/contacts-profile-template-view.test.js
git commit -m "feat: add npc upgrade flow"
```

Expected: commit succeeds.

---

## Task 7: Chat Context Assembly Gates

**Files:**
- Modify: `src/views/ChatView.vue`
- Modify: `tests/chat-worldbook-binding-visibility.test.js`

- [ ] **Step 1: Add Chat context priority test**

Append to `tests/chat-worldbook-binding-visibility.test.js`:

```js
test('chat prompt orders worldview before role profile and gates self profile fields by visibility', async () => {
  const chatStore = useChatStore()
  const systemStore = useSystemStore()
  systemStore.setGlobalWorldview('ABO 世界规则：信息素存在。')

  const selfProfile = chatStore.addRoleProfile({
    roleId: '1400',
    name: '我的档案',
    entityType: 'self_profile',
    profileValues: [
      { fieldId: 'public_identity', value: '公开身份', visibilityLevel: 'public' },
      { fieldId: 'private_secret', value: '亲密秘密', visibilityLevel: 'intimate' },
    ],
  })
  expect(selfProfile).toBeTruthy()

  const role = chatStore.addRoleProfile({
    roleId: '1401',
    name: '测试角色',
    entityType: 'main_role',
    profileValues: [{ fieldId: 'pheromone', value: '雪松', visibilityLevel: 'public' }],
  })
  const binding = chatStore.bindRoleProfile(role.id)

  const contract = chatStore.getRoleBindingContract(binding.id, { moduleKey: 'chat' })
  expect(contract.profile.profileValues).toEqual(expect.arrayContaining([
    expect.objectContaining({ fieldId: 'pheromone', value: '雪松' }),
  ]))
})
```

This test locks the store contract first. Do not export `buildWorldKernelPromptBlock` from `ChatView.vue` in this task.

- [ ] **Step 2: Run Chat contract tests**

Run:

```bash
npm test -- tests/chat-worldbook-binding-visibility.test.js tests/chat-role-knowledge-binding.test.js
```

Expected: PASS after Task 3. If it fails, continue with Step 3 and run this command again.

- [ ] **Step 3: Ensure role binding contract includes new profile fields**

In `src/stores/chat.js`, find `getRoleBindingContract`. Ensure the returned `profile` includes:

```js
entityType: profile.entityType,
templateLink: { ...profile.templateLink },
profileValues: profile.profileValues.map((item) => ({ ...item })),
capabilities: { ...profile.capabilities },
```

- [ ] **Step 4: Update Chat prompt assembly comments/order**

In `src/views/ChatView.vue`, find the world-kernel / prompt assembly logic around `buildWorldKernelPromptBlock`.

Adjust the prompt block order to follow the spec:

1. global/primary worldview;
2. current role profile;
3. visible user self-profile fields;
4. relationship progress and memory;
5. module/event context;
6. supplemental knowledge points.

Add this narrow helper in `ChatView.vue` near `getGlobalWorldviewText`:

```js
const visibleSelfProfileValuesForRole = (visibilityLimit = 'familiar') => {
  const selfProfile = chatStore.roleProfiles.find((profile) => profile.entityType === 'self_profile')
  if (!selfProfile || !Array.isArray(selfProfile.profileValues)) return []
  const allowed = new Set(['public', 'familiar'])
  if (visibilityLimit === 'intimate') allowed.add('intimate')
  return selfProfile.profileValues.filter((value) => allowed.has(value.visibilityLevel))
}
```

Use `familiar` as the V1 default until relationship-stage mapping is explicitly designed.

Then update `buildWorldKernelPromptBlock(contact)` to include role profile values and visible self-profile values:

```js
const formatProfileValuesForPrompt = (values = []) =>
  Array.isArray(values) && values.length > 0
    ? values
        .map((item) => `${item.fieldId}: ${Array.isArray(item.value) ? item.value.join(', ') : item.value}`)
        .join('; ')
    : 'none'

const buildWorldKernelPromptBlock = (contact) => {
  const worldview = getGlobalWorldviewText() || 'none'
  const profile = contact?.profileId ? chatStore.getRoleProfileById(contact.profileId) : null
  const roleProfileValues = profile?.profileValues || []
  const visibleSelfValues = visibleSelfProfileValuesForRole('familiar')
  const boundPoints = resolveBoundKnowledgePointsForContact(contact)
  const boundSummary =
    boundPoints.length > 0
      ? boundPoints
          .map((item) => {
            const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Knowledge'
            const content = typeof item.content === 'string' ? item.content.trim() : ''
            const tags = Array.isArray(item.tags) && item.tags.length > 0 ? ` [tags: ${item.tags.join(', ')}]` : ''
            return `${title}: ${content || title}${tags}`
          })
          .join('; ')
      : 'none'

  return [
    `Primary worldview rules: ${worldview}`,
    `Current role profile values: ${formatProfileValuesForPrompt(roleProfileValues)}.`,
    `Visible user self-profile values: ${formatProfileValuesForPrompt(visibleSelfValues)}.`,
    `Supplemental role-bound knowledge points: ${boundSummary}.`,
  ].join('\n')
}
```

Keep the existing relationship runtime prompt block separate so relationship memory stays after role/self profile context in `buildSystemPrompt`.

- [ ] **Step 5: Run Chat tests**

Run:

```bash
npm test -- tests/chat-worldbook-binding-visibility.test.js tests/chat-role-knowledge-binding.test.js tests/chat-store-model.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 7**

Run:

```bash
git add src/views/ChatView.vue src/stores/chat.js tests/chat-worldbook-binding-visibility.test.js
git commit -m "feat: gate chat profile context"
```

Expected: commit succeeds.

---

## Task 8: Documentation Sync

**Files:**
- Modify: `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md`
- Modify: `docs/architecture/ROLE_BINDING_CONTRACT.md`
- Modify: `docs/roadmap/TODO_ROADMAP.md`
- Modify: `docs/pm/TODO_PM_STATUS_REPORT.md`

- [ ] **Step 1: Update Contacts package status**

In `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`, update:

```md
Status: `PARTIAL_DONE`
```

Keep `PARTIAL_DONE` unless all UI and Chat context work are complete. Add landed bullets:

```md
- WorldBook profile-template store baseline exists.
- Contacts profile entities now distinguish Self Profile, Main Role, and NPC.
- NPC -> Main Role upgrade preserves existing Chat binding and history.
- Chat context contract carries entity type, template links, profile values, and capability flags.
```

- [ ] **Step 2: Update role hub IA**

In `docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md`, add sections for:

```md
## Self Profile / 用户自我档案
## Main Role / 主角色
## NPC / 世界角色
## WorldBook-Driven Extensible Sections / 世界书驱动扩展区
```

Make clear:

- WorldBook defines fields.
- Contacts stores values.
- Self Profile is not an AI role.
- NPCs can be in Chat Directory without being Main Role.

- [ ] **Step 3: Update Role Binding Contract**

In `docs/architecture/ROLE_BINDING_CONTRACT.md`, add:

```md
Chat Directory is a chat target list, not a Main Role filter.

Role binding contracts may reference:

- `entityType`
- `templateLink`
- `profileValues`
- `capabilities`

Self Profile must not be bound as a Chat target.
NPC may be bound as a Chat target before being upgraded to Main Role.
```

- [ ] **Step 4: Update roadmap**

In `docs/roadmap/TODO_ROADMAP.md`, update the Contacts V2 item with current implementation state. If all tasks landed, set Contacts V2 detail IA to `PARTIAL_DONE` or `DONE` based on acceptance.

- [ ] **Step 5: Update PM status**

In `docs/pm/TODO_PM_STATUS_REPORT.md`, add a PM-readable summary:

```md
Contacts now has a designed/implemented path for Self Profile, Main Role, NPC, and WorldBook-driven profile templates. WorldBook owns template rules; Contacts owns concrete person values.
```

- [ ] **Step 6: Commit docs**

Run:

```bash
git add docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md docs/architecture/ROLE_BINDING_CONTRACT.md docs/roadmap/TODO_ROADMAP.md docs/pm/TODO_PM_STATUS_REPORT.md
git commit -m "docs: sync profile template implementation status"
```

Expected: commit succeeds.

---

## Task 9: Final Validation

**Files:**
- No new files are expected in this task.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js tests/contacts-profile-entities-store.test.js tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/chat-worldbook-binding-visibility.test.js
```

Expected: PASS.

- [ ] **Step 2: Run existing related regression tests**

Run:

```bash
npm test -- tests/chat-role-knowledge-binding.test.js tests/chat-store-model.test.js tests/contacts-detail-danger-flows.test.js tests/contacts-chat-directory-boundary-copy.test.js tests/contacts-relationship-backup-restore.test.js
```

Expected: PASS.

- [ ] **Step 3: Run full project checks**

Run:

```bash
npm run lint
npm run build
npm run test
```

Expected: PASS.

- [ ] **Step 4: Record validation results**

Update `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md` with:

```md
Validation:

- `npm run lint`: pass
- `npm run build`: pass
- `npm run test`: pass
```

Use actual results. If a command fails because of pre-existing unrelated issues, record the failure and exact reason.

- [ ] **Step 5: Commit validation note**

Run:

```bash
git add docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md
git commit -m "docs: record profile template validation"
```

Expected: commit succeeds.

---

## Self-Review

Spec coverage:

- WorldBook template definitions: Task 1, Task 2, Task 4.
- Field types and visibility: Task 1, Task 4.
- Template versioning: Task 1, Task 2.
- Contacts entity types: Task 3, Task 5.
- Self Profile protection: Task 3, Task 5, Task 7.
- NPC lightweight model and upgrade: Task 3, Task 6.
- Chat Directory boundary: Task 3, Task 6, Task 8.
- Chat context priority: Task 7.
- Docs sync: Task 8, Task 9.

Known V1 exclusions:

- full onboarding implementation;
- full user manual implementation;
- numeric/date/formula field engine;
- multi-world template stacking;
- automatic template changes overwriting existing profile values.

No placeholder tasks remain. Any implementation worker should keep the first pass narrow and avoid turning this into a generic form-builder project.
