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
