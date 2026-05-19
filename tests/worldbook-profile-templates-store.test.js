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
})
