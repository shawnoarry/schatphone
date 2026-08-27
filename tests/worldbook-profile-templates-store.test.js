import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { useSystemStore } from '../src/stores/system'
import {
  PROFILE_TEMPLATE_FIELD_PURPOSES,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_TEMPLATE_SCOPES,
} from '../src/lib/profile-template-schema'

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
      title: 'My ABO world',
    })

    expect(copied).toMatchObject({
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'world_abo_custom',
      title: 'My ABO world',
      version: 1,
    })
    expect(store.listWorldProfileTemplates('world_abo_custom')).toHaveLength(1)
  })

  test('creates a blank world template only when the editor saves it', () => {
    const store = useSystemStore()
    const created = store.createWorldProfileTemplate({
      worldId: 'world_custom',
      title: 'Custom profile',
      description: 'Built manually.',
      categories: [{ id: 'identity', label: 'Identity', order: 0 }],
      fields: [{ id: 'occupation', label: 'Occupation', categoryId: 'identity' }],
    })

    expect(created).toMatchObject({
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'world_custom',
      title: 'Custom profile',
      version: 1,
    })
    expect(created.fields[0]).toMatchObject({ id: 'occupation', categoryId: 'identity' })
  })

  test('updates a world-specific template by bumping version and preserving field ids', () => {
    const store = useSystemStore()
    const created = store.createWorldProfileTemplateFromPreset('preset_abo', {
      worldId: 'world_abo_custom',
      title: 'My ABO world',
    })

    const updated = store.updateWorldProfileTemplate(created.id, {
      title: 'My ABO world v2',
      fields: [
        ...created.fields,
        { id: 'family_rank', label: 'Family rank', type: 'single_select', options: ['high', 'middle', 'low'] },
      ],
    })

    expect(updated.version).toBe(2)
    expect(updated.fields.map((field) => field.id)).toContain('family_rank')
    expect(store.getProfileTemplateById(created.id).title).toBe('My ABO world v2')
  })

  test('filters disabled world-specific templates from enabled current-world lists', () => {
    const store = useSystemStore()
    const created = store.createWorldProfileTemplateFromPreset('preset_basic_modern', {
      worldId: 'world_modern',
      title: 'Modern world template',
    })

    expect(store.listWorldProfileTemplates('world_modern', { enabledOnly: true })).toHaveLength(1)

    const disabled = store.setWorldProfileTemplateEnabled(created.id, false)

    expect(disabled).toMatchObject({
      id: created.id,
      enabled: false,
    })
    expect(store.listWorldProfileTemplates('world_modern')).toHaveLength(1)
    expect(store.listWorldProfileTemplates('world_modern', { enabledOnly: true })).toHaveLength(0)
  })

  test('hydrates persisted profile templates without losing versions', () => {
    const store = useSystemStore()
    const created = store.createWorldProfileTemplateFromPreset('preset_basic_modern', {
      worldId: 'world_modern',
      title: 'Modern world template',
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

  test('persists new field types and purpose markers without granting legacy fields new uses', () => {
    const store = useSystemStore()
    const created = store.createWorldProfileTemplateFromPreset('preset_basic_modern', {
      worldId: 'world_workplace',
      title: 'Workplace profile',
    })
    const updated = store.updateWorldProfileTemplate(created.id, {
      fields: [
        ...created.fields,
        {
          id: 'agency',
          label: 'Agency',
          type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
          purposes: [
            PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
            PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
          ],
        },
        {
          id: 'debut_date',
          label: 'Debut date',
          type: PROFILE_TEMPLATE_FIELD_TYPES.DATE,
          purposes: [PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY],
        },
      ],
    })
    store.saveNow()

    setActivePinia(createPinia())
    const restored = useSystemStore()
    restored.restoreFromStorage()
    const restoredTemplate = restored.getProfileTemplateById(updated.id)

    expect(restoredTemplate.fields.find((field) => field.id === 'agency')).toMatchObject({
      type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
      purposes: [
        PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
        PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
      ],
    })
    expect(restoredTemplate.fields.find((field) => field.id === 'debut_date')).toMatchObject({
      type: PROFILE_TEMPLATE_FIELD_TYPES.DATE,
      purposes: [PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY],
    })
    expect(restoredTemplate.fields.find((field) => field.id === 'identity')?.purposes).toEqual([])
  })
})
