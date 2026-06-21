import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import { useWorldBookProfileTemplateModel } from '../src/composables/useWorldBookProfileTemplateModel'

const t = (zh, en) => en || zh

const createModel = ({
  presets = [
    {
      id: 'preset_basic',
      title: 'Basic Profile',
      fields: [{ id: 'name' }, { id: 'age' }],
    },
  ],
  worldTemplates = [
    {
      id: 'world_1',
      title: 'Current World Profile',
      version: 3,
      enabled: true,
      fields: [{ id: 'rank' }, { id: 'guild' }, { id: 'tone' }],
    },
    {
      id: 'world_2',
      title: 'Paused Profile',
      version: 1,
      enabled: false,
      fields: [{ id: 'clan' }],
    },
  ],
} = {}) =>
  useWorldBookProfileTemplateModel({
    profileTemplatePresets: ref(presets),
    worldProfileTemplates: ref(worldTemplates),
    enabledWorldProfileTemplates: ref(worldTemplates.filter((template) => template.enabled !== false)),
    t,
  })

describe('WorldBook profile template model interface', () => {
  test('builds template stats from preset and current-world rows', () => {
    const model = createModel()

    expect(model.profileTemplateStats.value).toEqual({
      presetCount: 1,
      worldCount: 2,
      enabledWorldCount: 1,
    })
  })

  test('formats universal preset rows for copy actions', () => {
    const model = createModel()

    expect(model.profileTemplatePresetRows.value).toEqual([
      expect.objectContaining({
        id: 'preset_basic',
        title: 'Basic Profile',
        fieldCount: 2,
        fieldCountLabel: '2 fields',
        copyLabel: 'Copy as world template',
      }),
    ])
  })

  test('formats current-world template rows with enabled and disabled actions', () => {
    const model = createModel()

    expect(model.worldProfileTemplateRows.value).toEqual([
      expect.objectContaining({
        id: 'world_1',
        title: 'Current World Profile',
        enabled: true,
        versionLabel: 'v3',
        fieldCountLabel: '3 fields',
        stateLabel: 'Enabled',
        toggleLabel: 'Disable',
      }),
      expect.objectContaining({
        id: 'world_2',
        title: 'Paused Profile',
        enabled: false,
        versionLabel: 'v1',
        fieldCountLabel: '1 fields',
        stateLabel: 'Disabled',
        toggleLabel: 'Enable',
      }),
    ])
  })

  test('exposes Contacts handoff and section copy', () => {
    const model = createModel({ worldTemplates: [] })

    expect(model.profileTemplateHandoff.value).toMatchObject({
      eyebrow: 'Next step',
      title: 'Contacts fills role profiles',
      fromLabel: 'WorldBook: Enable templates',
      toLabel: 'Contacts: Values',
      actionLabel: 'Open Contacts',
    })
    expect(model.profileTemplateHandoff.value.detail).toContain('concrete values are still filled in Contacts')
    expect(model.universalTemplateSection.value).toMatchObject({
      title: 'Universal templates',
      detail: 'Universal templates are available directly in Contacts for any world.',
    })
    expect(model.worldTemplateSection.value).toMatchObject({
      title: 'Current-world enabled templates',
      emptyCopy: 'No world-specific templates yet.',
    })
  })

  test('uses safe fallback titles and version defaults', () => {
    const model = createModel({
      presets: [{ id: 'preset_missing', fields: [] }],
      worldTemplates: [{ id: 'world_missing', fields: [] }],
    })

    expect(model.profileTemplatePresetRows.value[0]).toMatchObject({
      title: 'preset_missing',
      fieldCountLabel: '0 fields',
    })
    expect(model.worldProfileTemplateRows.value[0]).toMatchObject({
      title: 'world_missing',
      versionLabel: 'v1',
      fieldCountLabel: '0 fields',
      stateLabel: 'Enabled',
    })
  })
})
