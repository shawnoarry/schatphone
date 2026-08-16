import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import BookView from '../src/views/BookView.vue'
import { dialogState, resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import { useBookStore } from '../src/stores/book'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/book', component: BookView },
      { path: '/home', component: DummyView },
      { path: '/worldbook', component: DummyView },
    ],
  })

const mountBookView = async (route = '/book') => {
  const router = createTestRouter()
  await router.push(route)
  await router.isReady()
  const wrapper = mount(BookView, {
    global: {
      plugins: [router],
    },
  })
  await flushPromises()
  await nextTick()
  return { wrapper, router }
}

describe('BookView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T10:00:00.000Z'))
    setActivePinia(createPinia())
    resetDialogServiceForTest()
    useSystemStore().settings.system.language = 'en-US'
  })

  test('renders library with built-in K-pop sources while user assets stay empty', async () => {
    const store = useBookStore()
    const { wrapper } = await mountBookView()

    expect(wrapper.get('[data-testid="book-library"]').text()).toContain('Import text')
    expect(store.assetCount).toBe(0)
    expect(wrapper.get('[data-testid="book-library"]').text()).toContain('现代首尔 K-pop 娱乐圈')
    expect(wrapper.get('[data-testid="book-detail"]').text()).toContain('现代首尔 K-pop 娱乐圈：主世界观')
    expect(wrapper.find('[data-testid="book-empty"]').exists()).toBe(false)
  })

  test('returns to WorldBook when opened from the world setting workspace', async () => {
    const { wrapper, router } = await mountBookView('/book?source=worldbook')

    expect(wrapper.get('.book-back').text()).toContain('WorldBook')
    await wrapper.get('.book-back').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/worldbook')
  })

  test('copies a built-in source before editing', async () => {
    const store = useBookStore()
    const { wrapper } = await mountBookView()

    await wrapper.get('[data-testid="book-edit"]').trigger('click')
    expect(wrapper.get('[data-testid="book-edit-guard"]').text()).toContain('built-in source')

    await wrapper.get('[data-testid="book-edit-guard-confirm"]').trigger('click')
    await nextTick()

    expect(store.assetCount).toBe(1)
    expect(store.assets[0].source.kind).toBe('built_in_copy')
    expect(wrapper.get('[data-testid="book-editor"]').exists()).toBe(true)
  })

  test('selecting an asset shows read mode by default', async () => {
    const store = useBookStore()
    const asset = store.createAsset({
      id: 'asset_city',
      title: 'Quiet City',
      category: 'worldview',
      format: 'markdown',
      content: '# Basics\n\nNight etiquette matters.',
      tags: ['city'],
    })

    const { wrapper } = await mountBookView()

    expect(wrapper.get('[data-testid="book-detail"]').text()).toContain('Quiet City')
    expect(wrapper.get('[data-testid="book-detail"]').text()).toContain('Worldview')
    expect(wrapper.get('[data-testid="book-read-mode"]').text()).toContain('Night etiquette matters.')
    expect(wrapper.get(`[data-testid="book-asset-${asset.id}"]`).classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="book-editor"]').exists()).toBe(false)
  })

  test('edit mode is explicit', async () => {
    const store = useBookStore()
    store.createAsset({
      id: 'asset_rules',
      title: 'Rules',
      content: 'Original rules.',
    })

    const { wrapper } = await mountBookView()

    expect(wrapper.find('[data-testid="book-editor"]').exists()).toBe(false)
    await wrapper.get('[data-testid="book-edit"]').trigger('click')
    expect(wrapper.get('[data-testid="book-editor"]').exists()).toBe(true)

    await wrapper.get('[data-testid="book-edit-title"]').setValue('Updated Rules')
    await wrapper.get('[data-testid="book-save"]').trigger('submit')

    expect(store.findAssetById('asset_rules')?.title).toBe('Updated Rules')
    expect(wrapper.find('[data-testid="book-editor"]').exists()).toBe(false)
  })

  test('active source edit shows a guard before entering editor', async () => {
    const store = useBookStore()
    store.createAsset({
      id: 'asset_active',
      title: 'Active Source',
      status: 'active_source',
      content: 'Active text.',
    })

    const { wrapper } = await mountBookView()

    await wrapper.get('[data-testid="book-edit"]').trigger('click')
    expect(wrapper.get('[data-testid="book-edit-guard"]').text()).toContain('active or locked')
    expect(wrapper.find('[data-testid="book-editor"]').exists()).toBe(false)

    await wrapper.get('[data-testid="book-edit-guard-confirm"]').trigger('click')
    expect(wrapper.get('[data-testid="book-editor"]').exists()).toBe(true)
  })

  test('successful import adds an asset and shows feedback', async () => {
    const store = useBookStore()
    const { wrapper } = await mountBookView()
    const file = {
      name: 'source.md',
      type: 'text/markdown',
      size: 128,
      text: vi.fn(async () => '# Source\n\nImported text.'),
    }

    const input = wrapper.get('[data-testid="book-import-input"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })
    await input.trigger('change')
    await flushPromises()
    await nextTick()

    expect(store.assetCount).toBe(0)
    expect(dialogState.visible).toBe(true)
    expect(dialogState.title).toContain('Import')

    useDialog().submitDialog()
    await flushPromises()
    await nextTick()

    expect(store.assetCount).toBe(1)
    expect(wrapper.get('[data-testid="book-import-feedback"]').text()).toContain('imported')
    expect(wrapper.get('[data-testid="book-detail"]').text()).toContain('source')
  })

  test('canceling import confirmation leaves the library unchanged', async () => {
    const store = useBookStore()
    const { wrapper } = await mountBookView()
    const file = {
      name: 'source.md',
      type: 'text/markdown',
      size: 128,
      text: vi.fn(async () => '# Source\n\nImported text.'),
    }

    const input = wrapper.get('[data-testid="book-import-input"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })
    await input.trigger('change')
    await flushPromises()
    await nextTick()

    expect(dialogState.visible).toBe(true)
    useDialog().cancelDialog()
    await flushPromises()
    await nextTick()

    expect(store.assetCount).toBe(0)
    expect(file.text).not.toHaveBeenCalled()
  })

  test('invalid import shows feedback without creating assets', async () => {
    const store = useBookStore()
    const { wrapper } = await mountBookView()
    const file = {
      name: 'source.pdf',
      type: 'application/pdf',
      text: vi.fn(async () => 'unsupported'),
    }

    const input = wrapper.get('[data-testid="book-import-input"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })
    await input.trigger('change')
    await flushPromises()
    await nextTick()

    expect(dialogState.visible).toBe(true)
    useDialog().submitDialog()
    await flushPromises()
    await nextTick()

    expect(store.assetCount).toBe(0)
    expect(wrapper.get('[data-testid="book-import-feedback"]').text()).toContain('.txt')
  })

  test('export offers lossless JSON plus editable Markdown and text downloads', async () => {
    const store = useBookStore()
    store.createAsset({
      id: 'asset_export',
      title: 'Export Source',
      content: 'Exportable text.',
    })
    const createObjectURL = vi.fn(() => 'blob:book-export')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    })
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    })
    const downloadedNames = []
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      downloadedNames.push(this.download)
    })

    const { wrapper } = await mountBookView()

    await wrapper.get('[data-testid="book-export"]').trigger('click')

    const exportSheet = wrapper.get('[data-testid="book-export-sheet"]')
    expect(exportSheet.text()).toContain('Lossless data file')
    expect(exportSheet.text()).toContain('Markdown manuscript')
    expect(exportSheet.text()).toContain('Plain text manuscript')
    expect(createObjectURL).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="book-export-format-worldbook_json"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="book-export"]').trigger('click')
    await wrapper.get('[data-testid="book-export-format-markdown"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="book-export"]').trigger('click')
    await wrapper.get('[data-testid="book-export-format-text"]').trigger('click')
    await nextTick()

    expect(createObjectURL).toHaveBeenCalledTimes(3)
    expect(clickSpy).toHaveBeenCalledTimes(3)
    expect(downloadedNames).toEqual([
      'Export-Source.worldbook.json',
      'Export-Source.md',
      'Export-Source.txt',
    ])
    expect(wrapper.get('[data-testid="book-import-feedback"]').text()).toContain('.txt downloaded')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:book-export')

    clickSpy.mockRestore()
  })

  test('shows WorldBook usage for active source assets', async () => {
    const bookStore = useBookStore()
    const systemStore = useSystemStore()
    const asset = bookStore.createAsset({
      id: 'asset_worldbook_used',
      title: 'Used Source',
      content: 'Active world source.',
      status: 'active_source',
    })
    systemStore.addWorldBookSourceLink({
      assetId: asset.id,
      role: 'main_worldview',
      enabled: true,
    })

    const { wrapper } = await mountBookView()

    const usage = wrapper.get('[data-testid="book-worldbook-usage"]')
    expect(usage.text()).toContain('Used by WorldBook')
    expect(usage.text()).toContain('active')
  })

  test('opens local Book AI drawer for the selected source', async () => {
    const bookStore = useBookStore()
    bookStore.createAsset({
      id: 'asset_ai_tools',
      title: 'AI Source',
      content: '# Basics\n\nUse quiet rules.',
      tags: ['rules'],
    })

    const { wrapper } = await mountBookView()

    await wrapper.get('[data-testid="book-ai-trigger"]').trigger('click')

    expect(wrapper.get('[data-testid="book-ai-sheet"]').text()).toContain('AI Source')
    expect(wrapper.get('[data-testid="book-ai-result"]').text()).toContain('Summary preview')

    await wrapper.get('[data-testid="book-ai-tool-tags"]').trigger('click')
    expect(wrapper.get('[data-testid="book-ai-result"]').text()).toContain('rules')
  })

  test('upgrades Book storage only after explicit confirmation and reports success', async () => {
    const bookStore = useBookStore()
    const requestPersistence = vi
      .spyOn(bookStore, 'requestBookPersistentStorage')
      .mockResolvedValue({ state: 'persistent', capacity: { status: 'available' } })
    const upgradeStorage = vi.spyOn(bookStore, 'upgradeBookStorage').mockImplementation(async () => {
      bookStore.storageMode = 'repository'
      bookStore.storageState = 'active'
      return { ok: true, code: 'book_storage_upgraded', pointer: { generationId: 'generation-one' } }
    })
    const systemStore = useSystemStore()
    const { wrapper } = await mountBookView()

    expect(wrapper.get('[data-testid="book-storage-status"]').attributes('data-storage-mode')).toBe('legacy')
    await wrapper.get('[data-testid="book-storage-upgrade"]').trigger('click')
    expect(dialogState.visible).toBe(true)
    expect(requestPersistence).not.toHaveBeenCalled()

    useDialog().submitDialog()
    await flushPromises()
    await nextTick()

    expect(requestPersistence).toHaveBeenCalledTimes(1)
    expect(upgradeStorage).toHaveBeenCalledWith({
      allowBestEffort: true,
      worldBookSourceLinks: systemStore.listWorldBookSourceLinks(),
    })
    expect(wrapper.get('[data-testid="book-storage-status"]').attributes('data-storage-mode')).toBe('repository')
    expect(wrapper.get('[data-testid="book-import-feedback"]').text()).toContain('upgraded')
  })

  test('does not cut over after persistence denial when best-effort continuation is canceled', async () => {
    const bookStore = useBookStore()
    vi.spyOn(bookStore, 'requestBookPersistentStorage').mockResolvedValue({
      state: 'denied',
      capacity: { status: 'available' },
    })
    const upgradeStorage = vi.spyOn(bookStore, 'upgradeBookStorage')
    const { wrapper } = await mountBookView()

    await wrapper.get('[data-testid="book-storage-upgrade"]').trigger('click')
    useDialog().submitDialog()
    await flushPromises()
    expect(dialogState.visible).toBe(true)
    expect(dialogState.title).toContain('No long-term protection')

    useDialog().cancelDialog()
    await flushPromises()
    expect(upgradeStorage).not.toHaveBeenCalled()
    expect(bookStore.storageMode).toBe('legacy')
  })
})
