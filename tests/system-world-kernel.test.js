import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

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
    expect(Array.isArray(store.user.knowledgePoints)).toBe(true)
  })

  test('supports knowledge point add/toggle/remove lifecycle', () => {
    const store = useSystemStore()
    const created = store.upsertKnowledgePoint({
      title: '语言规范',
      content: '角色A始终使用敬语。',
      tags: ['chat', 'style', 'chat'],
    })

    expect(created).toBeTruthy()
    expect(created.tags).toEqual(['chat', 'style'])
    expect(store.listKnowledgePoints().length).toBe(1)

    const toggled = store.setKnowledgePointEnabled(created.id, false)
    expect(toggled).toBe(true)
    expect(store.getKnowledgePointById(created.id)?.enabled).toBe(false)
    expect(store.listKnowledgePoints({ enabledOnly: true })).toHaveLength(0)

    const removed = store.removeKnowledgePoint(created.id)
    expect(removed).toBe(true)
    expect(store.getKnowledgePointById(created.id)).toBe(null)
  })

  test('setGlobalWorldview keeps worldBook alias in sync', () => {
    const store = useSystemStore()
    const next = store.setGlobalWorldview('Global baseline v2')

    expect(next).toBe('Global baseline v2')
    expect(store.user.globalWorldview).toBe('Global baseline v2')
    expect(store.user.worldBook).toBe('Global baseline v2')
  })
})

