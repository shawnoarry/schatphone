import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookStore } from '../src/stores/book'
import { useChatStore } from '../src/stores/chat'
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

  test('restores old role and pack knowledge ids as canonical encyclopedia ids', () => {
    const chatStore = useChatStore()
    const systemStore = useSystemStore()

    expect(
      chatStore.restoreFromBackup({
        roleProfiles: [
          {
            id: 42,
            name: 'Legacy role',
            role: 'Archivist',
            knowledgePointIds: ['kp_pack', 'kp_pack', 'kp_role'],
          },
        ],
        contacts: [
          {
            id: 'contact_legacy',
            kind: 'role',
            name: 'Legacy role',
            profileId: 42,
          },
        ],
        conversations: {},
        messagesByConversation: {},
      }),
    ).toBe(true)

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
    expect(chatStore.getRoleProfileById(42)).toMatchObject({
      encyclopediaEntryIds: ['kp_pack', 'kp_role'],
      knowledgePointIds: ['kp_pack', 'kp_role'],
    })
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
})
