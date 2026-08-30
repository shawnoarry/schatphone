import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'
import { createDefaultWorldSettingState } from '../src/lib/world-setting-state'

describe('system world kernel', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('migrates legacy worldBook into globalWorldview on backup restore', () => {
    const store = useSystemStore()
    const ok = store.restoreFromBackup({
      system: {
        user: {
          worldBook: 'Legacy worldview',
        },
      },
    })

    expect(ok).toBe(true)
    expect(store.user.globalWorldview).toBe('Legacy worldview')
    expect(store.user.worldBook).toBe('Legacy worldview')
    expect(Array.isArray(store.user.encyclopediaEntries)).toBe(true)
    expect(store.user.knowledgePoints).toBe(store.user.encyclopediaEntries)
  })

  test('rejects malformed world version pointers before mutating the current save', () => {
    const store = useSystemStore()
    store.user.name = 'Current player'
    store.setGlobalWorldview('Current world remains authoritative.')
    const beforeWorldSetting = structuredClone(store.getWorldSettingState())
    const malformedWorldSetting = structuredClone(createDefaultWorldSettingState({ now: 10 }))
    malformedWorldSetting.semantic.activeVersionId = 'missing_world_version'

    const restored = store.restoreFromBackup({
      system: {
        user: {
          name: 'Imported player',
          globalWorldview: 'This payload must not be applied.',
          worldSetting: malformedWorldSetting,
        },
      },
    })

    expect(restored).toBe(false)
    expect(store.user.name).toBe('Current player')
    expect(store.user.globalWorldview).toBe('Current world remains authoritative.')
    expect(store.getWorldSettingState()).toEqual(beforeWorldSetting)
  })

  test('supports encyclopedia entry add/toggle/remove lifecycle', () => {
    const store = useSystemStore()
    const created = store.upsertEncyclopediaEntry({
      title: '语言规范',
      content: '角色A始终使用敬语。',
      tags: ['chat', 'style', 'chat'],
    })

    expect(created).toBeTruthy()
    expect(created.tags).toEqual(['chat', 'style'])
    expect(store.listEncyclopediaEntries().length).toBe(1)

    const toggled = store.setEncyclopediaEntryEnabled(created.id, false)
    expect(toggled).toBe(true)
    expect(store.getEncyclopediaEntryById(created.id)?.enabled).toBe(false)
    expect(store.listEncyclopediaEntries({ enabledOnly: true })).toHaveLength(0)

    const removed = store.removeEncyclopediaEntry(created.id)
    expect(removed).toBe(true)
    expect(store.getEncyclopediaEntryById(created.id)).toBe(null)
  })

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

  test('updates an existing knowledge point without changing its identity', () => {
    const store = useSystemStore()
    const created = store.upsertKnowledgePoint({
      title: 'City etiquette',
      content: 'Formal greeting only.',
      tags: ['style'],
      enabled: true,
    })

    expect(created).toBeTruthy()
    const createdAt = created.createdAt

    const updated = store.upsertKnowledgePoint({
      id: created.id,
      title: 'City etiquette v2',
      content: 'Formal greeting and exit line.',
      tags: ['style', 'city'],
      enabled: false,
    })

    expect(updated).toBeTruthy()
    expect(updated.id).toBe(created.id)
    expect(updated.createdAt).toBe(createdAt)
    expect(updated.updatedAt).toBeGreaterThanOrEqual(createdAt)
    expect(store.getKnowledgePointById(created.id)).toMatchObject({
      id: created.id,
      title: 'City etiquette v2',
      content: 'Formal greeting and exit line.',
      enabled: false,
      tags: ['style', 'city'],
    })
  })

  test('finds relevant knowledge points from reminder context', () => {
    const store = useSystemStore()
    const routePoint = store.upsertKnowledgePoint({
      title: 'Route memory',
      content: 'Safe crossings and station exits for Home to Office.',
      tags: ['map', 'travel'],
      enabled: true,
    })
    const disabledPoint = store.upsertKnowledgePoint({
      title: 'Night exit note',
      content: 'Late-night office exit fallback.',
      tags: ['map'],
      enabled: false,
    })
    store.upsertKnowledgePoint({
      title: 'Tea rituals',
      content: 'Ceremony phrases for late evenings.',
      tags: ['culture'],
      enabled: true,
    })

    const matches = store.findRelevantKnowledgePoints({
      texts: ['Location feedback from Home to Office, ready to become a later reminder cue.'],
      tags: ['map', 'travel'],
      limit: 3,
    })

    expect(matches.map((item) => item.id)).toEqual([routePoint.id])

    const matchesWithDisabled = store.findRelevantKnowledgePoints({
      texts: ['Late-night office exit fallback.'],
      tags: ['map'],
      enabledOnly: false,
      limit: 3,
    })

    expect(matchesWithDisabled.map((item) => item.id)).toContain(disabledPoint.id)
  })

  test('setGlobalWorldview keeps worldBook alias in sync', () => {
    const store = useSystemStore()
    const next = store.setGlobalWorldview('Global baseline v2')

    expect(next).toBe('Global baseline v2')
    expect(store.user.globalWorldview).toBe('Global baseline v2')
    expect(store.user.worldBook).toBe('Global baseline v2')
  })

  test('preserves complete worldview and encyclopedia text', () => {
    const store = useSystemStore()
    const worldviewTail = 'WORLDBOOK_WORLDVIEW_TAIL'
    const encyclopediaTail = 'WORLDBOOK_ENCYCLOPEDIA_TAIL'
    const worldview = `${'world '.repeat(1400)}${worldviewTail}`
    const encyclopediaContent = `${'archive '.repeat(300)}${encyclopediaTail}`

    expect(store.setGlobalWorldview(worldview)).toBe(worldview)
    expect(store.user.globalWorldview).toContain(worldviewTail)
    expect(store.user.worldBook).toBe(store.user.globalWorldview)

    const entry = store.upsertEncyclopediaEntry({
      title: 'Complete archive',
      content: encyclopediaContent,
      tags: ['archive'],
    })

    expect(entry.content).toBe(encyclopediaContent)
    expect(store.getEncyclopediaEntryById(entry.id)?.content).toContain(encyclopediaTail)
    expect(
      store.findRelevantKnowledgePoints({
        texts: [encyclopediaTail],
        limit: 1,
      }).map((item) => item.id),
    ).toEqual([entry.id])
  })

  test('canonicalizes known single-world template aliases without claiming unknown scopes', () => {
    const store = useSystemStore()
    const fromDefault = store.createWorldProfileTemplate({
      worldId: 'default_world',
      title: 'Default alias template',
    })
    const fromLegacy = store.upsertProfileTemplate({
      id: 'legacy_alias_template',
      scope: 'world',
      worldId: 'legacy_single_world',
      title: 'Legacy alias template',
    })
    const fromPack = store.createWorldProfileTemplate({
      worldId: 'survival_city',
      title: 'Pack alias template',
    })
    const external = store.createWorldProfileTemplate({
      worldId: 'external_world_scope',
      title: 'External world template',
    })

    expect([fromDefault.worldId, fromLegacy.worldId, fromPack.worldId]).toEqual([
      'world_local_primary',
      'world_local_primary',
      'world_local_primary',
    ])
    expect(external.worldId).toBe('external_world_scope')
    expect(store.listWorldProfileTemplates()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: fromDefault.id, worldId: 'world_local_primary' }),
        expect.objectContaining({ id: fromLegacy.id, worldId: 'world_local_primary' }),
        expect.objectContaining({ id: fromPack.id, worldId: 'world_local_primary' }),
      ]),
    )
    expect(store.listWorldProfileTemplates('legacy_single_world')).toEqual(
      store.listWorldProfileTemplates('world_local_primary'),
    )
    expect(store.listWorldProfileTemplates('external_world_scope')).toEqual([
      expect.objectContaining({ id: external.id, worldId: 'external_world_scope' }),
    ])
  })
})
