import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import SettingsView from '../src/views/SettingsView.vue'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import { useAssetsStore } from '../src/stores/assets'
import { useCalendarStore } from '../src/stores/calendar'
import { useBookStore } from '../src/stores/book'
import { useChatStore } from '../src/stores/chat'
import { useFilesStore } from '../src/stores/files'
import { useFoodDeliveryStore } from '../src/stores/foodDelivery'
import { useGalleryStore } from '../src/stores/gallery'
import { useMapStore } from '../src/stores/map'
import { usePhoneStore } from '../src/stores/phone'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useRemindersStore } from '../src/stores/reminders'
import { useShoppingStore } from '../src/stores/shopping'
import { useSimulationStore } from '../src/stores/simulation'
import { useStockStore } from '../src/stores/stock'
import { useSystemStore } from '../src/stores/system'
import { useWalletStore } from '../src/stores/wallet'

const DummyView = { template: '<div />' }

const clone = (value) => JSON.parse(JSON.stringify(value))

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings', component: SettingsView },
      { path: '/home', component: DummyView },
      { path: '/profile', component: DummyView },
      { path: '/worldbook', component: DummyView },
      { path: '/network', component: DummyView },
      { path: '/chat-contacts', component: DummyView },
      { path: '/appearance', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountSettingsView = async () => {
  const router = createTestRouter()
  await router.push('/settings')
  await router.isReady()
  const wrapper = mount(SettingsView, {
    global: {
      plugins: [router],
    },
  })
  await flushUi()
  return wrapper
}

const createValidModuleSnapshots = () => ({
  map: clone(useMapStore().createBackupSnapshot()),
  calendar: clone(useCalendarStore().createBackupSnapshot()),
  reminders: clone(useRemindersStore().createBackupSnapshot()),
  gallery: clone(useGalleryStore().createBackupSnapshot()),
  files: clone(useFilesStore().createBackupSnapshot()),
  book: clone(useBookStore().createBackupSnapshot()),
  shopping: clone(useShoppingStore().createBackupSnapshot()),
  foodDelivery: clone(useFoodDeliveryStore().createBackupSnapshot()),
  simulation: clone(useSimulationStore().createBackupSnapshot()),
  assets: clone(useAssetsStore().createBackupSnapshot()),
  wallet: clone(useWalletStore().createBackupSnapshot()),
  phone: clone(usePhoneStore().createBackupSnapshot()),
  stock: clone(useStockStore().createBackupSnapshot()),
})

describe('Settings Contacts relationship import rollback', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T08:00:00.000Z'))
    resetDialogServiceForTest()
    setActivePinia(createPinia())
  })

  test('rolls back Contacts changes when relationship runtime restore reports a failure', async () => {
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    const bookStore = useBookStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    systemStore.settings.system.language = 'en-US'
    relationshipRuntimeStore.resetForTesting()

    const originalProfile = chatStore.addRoleProfile({
      roleId: '801A',
      name: 'Original Role',
      role: 'Keeper',
      detailItems: [
        {
          id: 'original_manual_detail',
          section: 'preferences',
          sourceKind: 'manual',
          title: 'Original note',
          detail: 'Must survive failed import.',
        },
      ],
    })
    const originalBinding = chatStore.bindRoleProfile(originalProfile.id)
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: originalProfile.id,
        name: originalProfile.name,
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'phone_original_1',
      memoryKey: 'original_call',
      factType: 'phone_call',
      summary: 'Original relationship memory.',
      metricDeltas: {
        trust: 5,
      },
    })
    const originalBookAsset = bookStore.createAsset({
      id: 'asset_original_book',
      title: 'Original Book Source',
      content: 'Must survive failed import.',
    })

    const realRelationshipRestore = relationshipRuntimeStore.restoreFromBackup.bind(relationshipRuntimeStore)
    const restoreSpy = vi
      .spyOn(relationshipRuntimeStore, 'restoreFromBackup')
      .mockImplementation((snapshot = {}) => {
        if (snapshot?.forceFailureForTest === true) return false
        return realRelationshipRestore(snapshot)
      })

    const payload = {
      backupMeta: {
        schemaVersion: 2,
      },
      settings: clone(systemStore.settings),
      user: clone(systemStore.user),
      notifications: [],
      apiReports: [],
      roleProfiles: [
        {
          id: 901,
          roleId: '901A',
          name: 'Imported Role',
          role: 'Archivist',
        },
      ],
      contacts: [
        {
          id: 901,
          kind: 'role',
          profileId: 901,
          name: 'Imported Role',
          role: 'Archivist',
          lastMessage: 'Imported hello',
        },
      ],
      chatHistory: {},
      conversations: {
        901: {
          contactId: 901,
          lastMessage: 'Imported hello',
        },
      },
      messagesByConversation: {
        901: [
          {
            role: 'assistant',
            content: 'Imported hello',
          },
        ],
      },
      ...createValidModuleSnapshots(),
      book: {
        assets: [
          {
            id: 'asset_imported_book',
            title: 'Imported Book Source',
            content: 'Should roll back.',
          },
        ],
        categories: [],
      },
      relationshipRuntime: {
        forceFailureForTest: true,
      },
    }

    const wrapper = await mountSettingsView()
    const file = {
      name: 'contacts-relationship-import.json',
      text: vi.fn(async () => JSON.stringify(payload)),
    }
    const fileInput = wrapper.get('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      configurable: true,
    })

    await fileInput.trigger('change')
    await flushUi()
    useDialog().submitDialog()
    await flushUi()

    expect(restoreSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        forceFailureForTest: true,
      }),
    )
    expect(chatStore.getRoleProfileByRoleId('801A')).toMatchObject({
      name: 'Original Role',
    })
    expect(chatStore.getRoleProfileByRoleId('901A')).toBeNull()
    expect(chatStore.contacts.some((item) => Number(item.id) === Number(originalBinding.id))).toBe(true)
    expect(chatStore.listRoleDetailItems(originalProfile.id)[0]).toMatchObject({
      id: 'original_manual_detail',
      sourceKind: 'manual',
    })
    expect(
      relationshipRuntimeStore.listMemoryGroupsForTarget({
        profileId: originalProfile.id,
        name: originalProfile.name,
      }),
    ).toEqual([
      expect.objectContaining({
        memoryKey: 'original_call',
        displaySummary: 'Original relationship memory.',
      }),
    ])
    expect(bookStore.findAssetById(originalBookAsset.id)).toMatchObject({
      title: 'Original Book Source',
    })
    expect(bookStore.findAssetById('asset_imported_book')).toBeNull()
    expect(wrapper.text()).toContain('Import failed and rolled back automatically')

    wrapper.unmount()
    restoreSpy.mockRestore()
  })
})
