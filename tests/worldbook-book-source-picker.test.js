import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import WorldBookView from '../src/views/WorldBookView.vue'
import { useBookStore } from '../src/stores/book'
import { useSystemStore } from '../src/stores/system'
import { buildWorldBookSourceSnapshot } from '../src/lib/book-text-schema'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/worldbook', component: WorldBookView },
      { path: '/settings', component: DummyView },
      { path: '/book', component: DummyView },
    ],
  })

const mountWorldBook = async () => {
  const router = createTestRouter()
  await router.push('/worldbook')
  await router.isReady()

  const wrapper = mount(WorldBookView, {
    global: {
      plugins: [router],
    },
  })
  await flushPromises()
  await nextTick()
  return { wrapper, router }
}

describe('WorldBook Book source picker', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'))
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('links selected Book sections instead of the whole document', async () => {
    const bookStore = useBookStore()
    const systemStore = useSystemStore()
    const asset = bookStore.createAsset({
      id: 'asset_sections',
      title: 'Sectioned World',
      assetType: 'worldbook_document',
      format: 'markdown',
      content: '# Basics\n\nVisible rules.\n\n## Secrets\n\nHidden rules.',
    })

    const { wrapper } = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-book-source-add"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-source-picker"]').text()).toContain('Sectioned World')

    await wrapper.get('input[value="sections"]').setValue(true)
    await nextTick()
    await wrapper
      .get('[data-testid="worldbook-source-picker-section-section_basics_1"] input')
      .setValue(true)
    await wrapper.get('[data-testid="worldbook-source-picker-confirm"]').trigger('click')
    await nextTick()

    const link = systemStore.listWorldBookSourceLinks()[0]
    expect(link).toMatchObject({
      assetId: asset.id,
      sectionIds: ['section_basics_1'],
      usage: 'base_worldview',
      enabled: true,
      sourceSnapshotText: 'Visible rules.',
    })
    expect(bookStore.findAssetById(asset.id)?.status).toBe('active_source')
    expect(wrapper.get(`[data-testid="worldbook-book-source-${link.id}"]`).text()).toContain(
      'Basics',
    )
  })

  test('reviews and accepts a changed Book source reference', async () => {
    const bookStore = useBookStore()
    const systemStore = useSystemStore()
    const asset = bookStore.createAsset({
      id: 'asset_changed_ui',
      title: 'Changed UI Source',
      content: 'Original source text.',
    })
    const link = systemStore.addWorldBookSourceLink({
      assetId: asset.id,
      sourceVersion: asset.version,
      sourceFingerprint: asset.contentFingerprint,
      ...buildWorldBookSourceSnapshot(asset.content),
    })

    bookStore.updateAsset(asset.id, { content: 'Updated source text.' })

    const { wrapper } = await mountWorldBook()
    const changedAsset = bookStore.findAssetById(asset.id)

    await wrapper.get(`[data-testid="worldbook-book-source-review-${link.id}"]`).trigger('click')
    await nextTick()

    const panel = wrapper.get('[data-testid="worldbook-book-source-review-panel"]')
    expect(panel.text()).toContain('Original source text.')
    expect(panel.text()).toContain('Updated source text.')
    expect(wrapper.find('[data-testid="worldbook-source-diff-removed"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="worldbook-source-diff-added"]').exists()).toBe(true)

    await wrapper.get('[data-testid="worldbook-book-source-review-accept"]').trigger('click')
    await nextTick()

    const refreshed = systemStore.listWorldBookSourceLinks()[0]
    expect(refreshed.sourceFingerprint).toBe(changedAsset.contentFingerprint)
    expect(refreshed.sourceVersion).toBe(changedAsset.version)
    expect(refreshed.sourceSnapshotText).toBe('Updated source text.')
    expect(wrapper.find(`[data-testid="worldbook-book-source-review-${link.id}"]`).exists()).toBe(
      false,
    )
  })
})
