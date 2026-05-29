import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import BookView from '../src/views/BookView.vue'
import { useBookStore } from '../src/stores/book'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/book', component: BookView },
      { path: '/home', component: DummyView },
    ],
  })

const mountBookView = async () => {
  const router = createTestRouter()
  await router.push('/book')
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
    useSystemStore().settings.system.language = 'en-US'
  })

  test('renders library and empty state', async () => {
    const { wrapper } = await mountBookView()

    expect(wrapper.get('[data-testid="book-library"]').text()).toContain('Import text')
    expect(wrapper.get('[data-testid="book-empty"]').text()).toContain('No text sources yet')
    expect(wrapper.find('[data-testid="book-detail"]').exists()).toBe(false)
  })

  test('selecting an asset shows read mode by default', async () => {
    const store = useBookStore()
    const asset = store.createAsset({
      id: 'asset_city',
      title: 'Quiet City',
      assetType: 'worldbook_document',
      format: 'markdown',
      content: '# Basics\n\nNight etiquette matters.',
      tags: ['city'],
    })

    const { wrapper } = await mountBookView()

    expect(wrapper.get('[data-testid="book-detail"]').text()).toContain('Quiet City')
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

    expect(store.assetCount).toBe(1)
    expect(wrapper.get('[data-testid="book-import-feedback"]').text()).toContain('imported')
    expect(wrapper.get('[data-testid="book-detail"]').text()).toContain('source')
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

    expect(store.assetCount).toBe(0)
    expect(wrapper.get('[data-testid="book-import-feedback"]').text()).toContain('.txt')
  })

  test('export downloads a structured worldbook JSON file when supported', async () => {
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
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const { wrapper } = await mountBookView()

    await wrapper.get('[data-testid="book-export"]').trigger('click')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:book-export')

    clickSpy.mockRestore()
  })
})
