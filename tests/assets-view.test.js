import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AssetsView from '../src/views/AssetsView.vue'
import { ASSET_STATUS, useAssetsStore } from '../src/stores/assets'
import { useGalleryStore } from '../src/stores/gallery'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: DummyView },
      { path: '/assets', component: AssetsView },
    ],
  })

describe('AssetsView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('renders category assets and supports local create, edit, and delete', async () => {
    const router = createTestRouter()
    await router.push('/assets?category=vehicles')
    await router.isReady()
    const store = useAssetsStore()
    const galleryStore = useGalleryStore()
    store.resetForTesting()
    galleryStore.resetForTesting()
    const imported = galleryStore.importAssetFromUrl({
      url: 'https://example.com/asset-gallery.png',
      name: 'Asset Gallery Cover',
      category: 'reference',
    })
    const vehicle = store.upsertAsset({
      id: 'asset_view_bike',
      name: 'Night Bike',
      category: 'vehicles',
      estimatedValue: '1200.00',
      location: 'Garage A',
      imageSourceType: 'url',
      imageUrl: 'https://example.com/bike.png',
    })

    const wrapper = mount(AssetsView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find(`[data-testid="assets-record-${vehicle.id}"]`).exists()).toBe(true)
    expect(wrapper.text()).toContain('Night Bike')
    expect(wrapper.get(`[data-testid="assets-record-${vehicle.id}"] img`).attributes('src')).toBe(
      'https://example.com/bike.png',
    )

    await wrapper.find('[data-testid="assets-draft-name"]').setValue('City Apartment')
    await wrapper.find('[data-testid="assets-draft-category"]').setValue('vehicles')
    await wrapper.find('[data-testid="assets-draft-value"]').setValue('8888.88')
    await wrapper.find('[data-testid="assets-draft-location"]').setValue('Bayside')
    await wrapper.find('[data-testid="assets-draft-image-source"]').setValue('gallery')
    expect(imported.ok).toBe(true)
    await wrapper.find('[data-testid="assets-draft-gallery-asset"]').setValue(imported.assetId)
    await wrapper.find('[data-testid="assets-draft-form"]').trigger('submit')
    await flushPromises()

    const created = store.listAssetsByCategory('vehicles').find((item) => item.name === 'City Apartment')
    expect(created).toMatchObject({
      name: 'City Apartment',
      estimatedValueCents: 888888,
      location: 'Bayside',
      image: {
        sourceType: 'gallery',
        galleryAssetId: imported.assetId,
      },
    })
    expect(wrapper.get(`[data-testid="assets-record-${created.id}"] img`).attributes('src')).toBe(
      'https://example.com/asset-gallery.png',
    )

    await wrapper.find(`[data-testid="assets-status-${vehicle.id}"]`).setValue(ASSET_STATUS.ARCHIVED)
    expect(store.findAssetById(vehicle.id)?.status).toBe(ASSET_STATUS.ARCHIVED)

    await wrapper.find(`[data-testid="assets-edit-${vehicle.id}"]`).trigger('click')
    await wrapper.find('[data-testid="assets-draft-name"]').setValue('Night Bike Pro')
    await wrapper.find('[data-testid="assets-draft-form"]').trigger('submit')
    expect(store.findAssetById(vehicle.id)?.name).toBe('Night Bike Pro')

    await wrapper.find(`[data-testid="assets-delete-${vehicle.id}"]`).trigger('click')
    expect(store.findAssetById(vehicle.id)).toBeNull()
    wrapper.unmount()
  })
})
