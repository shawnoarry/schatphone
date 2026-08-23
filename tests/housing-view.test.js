import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import HousingView from '../src/views/HousingView.vue'
import { useSystemStore } from '../src/stores/system'
import {
  HOUSING_SHELL_PREVIEW_STATE_STORAGE_KEY,
  resetHousingShellStateForTesting,
} from '../src/composables/useHousingShellState'

const DummyView = { template: '<div />' }
const createTestRouter = () => createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/home', component: DummyView },
    { path: '/map', component: DummyView },
    { path: '/housing', component: HousingView },
  ],
})

const mountHousing = async (path = '/housing?homePage=1&from=home') => {
  const router = createTestRouter()
  const pinia = createPinia()
  await router.push(path)
  await router.isReady()
  const wrapper = mount(HousingView, { global: { plugins: [router, pinia] } })
  return { wrapper, router, pinia }
}

describe('Housing S1 shell view', () => {
  beforeEach(() => {
    localStorage.clear()
    resetHousingShellStateForTesting()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-23T09:00:00.000Z'))
  })

  test('renders the Jari shell with rentable fixture homes and Chinese copy', async () => {
    const { wrapper } = await mountHousing()
    expect(wrapper.get('[data-testid="housing-app"]').text()).toContain('住处')
    expect(wrapper.get('[data-testid="housing-listing-housing_listing_jari_001"]').text()).toContain('上溪站旁')
    expect(wrapper.text()).not.toMatch(/[가-힣]/)
    expect(wrapper.findAll('[data-testid^="housing-listing-housing_listing_jari_"]').length).toBeGreaterThanOrEqual(4)
    wrapper.unmount()
  })

  test('rent and buy modes stay distinct and preserve the chosen mode', async () => {
    const { wrapper } = await mountHousing()
    await wrapper.get('[data-testid="housing-mode-buy"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="housing-listing-housing_listing_jari_005"]').text()).toContain('39.8 亿韩元')
    expect(wrapper.find('[data-testid="housing-listing-housing_listing_jari_001"]').exists()).toBe(false)
    const stored = JSON.parse(localStorage.getItem(HOUSING_SHELL_PREVIEW_STATE_STORAGE_KEY))
    expect(stored.activeMode).toBe('buy')
    wrapper.unmount()
  })

  test('search and filters produce a recoverable empty state', async () => {
    const { wrapper } = await mountHousing()
    await wrapper.get('[data-testid="housing-search"]').setValue('完全不存在的地址')
    await flushPromises()
    expect(wrapper.get('[data-testid="housing-empty-state"]').text()).toContain('没有符合条件')
    await wrapper.get('[data-testid="housing-empty-state"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="housing-listing-housing_listing_jari_001"]').exists()).toBe(true)

    await wrapper.get('[data-testid="housing-filter-open"]').trigger('click')
    expect(wrapper.get('[data-testid="housing-filter-sheet"]').exists()).toBe(true)
    await wrapper.get('[data-testid="housing-filter-reset"]').trigger('click')
    await wrapper.get('[data-testid="housing-filter-apply"]').trigger('click')
    expect(wrapper.find('[data-testid="housing-filter-sheet"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('favorites and recent browsing feed their own sections', async () => {
    const { wrapper } = await mountHousing()
    await wrapper.get('[data-testid="housing-favorite-housing_listing_jari_002"]').trigger('click')
    await wrapper.get('[data-testid="housing-listing-housing_listing_jari_001"] .jari-listing__body').trigger('click')
    await wrapper.get('[data-testid="housing-detail-back"]').trigger('click')
    await wrapper.get('[data-testid="housing-section-favorites"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="housing-listing-housing_listing_jari_002"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="housing-listing-housing_listing_jari_001"]').exists()).toBe(false)
    await wrapper.get('[data-testid="housing-section-recent"]').trigger('click')
    expect(wrapper.get('[data-testid="housing-listing-housing_listing_jari_001"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('detail exposes long content, no-image state, and Map area-only deep link', async () => {
    const { wrapper, router } = await mountHousing()
    await wrapper.get('[data-testid="housing-listing-housing_listing_jari_004"] .jari-listing__body').trigger('click')
    const detail = wrapper.get('[data-testid="housing-listing-detail"]')
    expect(detail.text()).toContain('暂无房源图片')
    expect(detail.text()).toContain('紫谷路')
    await detail.get('[data-testid="housing-open-map"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/map')
    expect(router.currentRoute.value.query).toMatchObject({ source: 'housing', mapPackId: 'real-seoul-v1', placeId: 'seoul-lh-gangnam-complex-3', homePage: '1' })
    expect(router.currentRoute.value.query.listingId).toBeUndefined()
    wrapper.unmount()
  })

  test('area discovery opens the real Map reference without fabricating a listing pin', async () => {
    const { wrapper, router } = await mountHousing()
    await wrapper.get('[data-testid="housing-area-map-seoul-mokdong-apartment-district"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/map')
    expect(router.currentRoute.value.query).toMatchObject({
      source: 'housing',
      mapPackId: 'real-seoul-v1',
      placeId: 'seoul-mokdong-apartment-district',
      homePage: '1',
    })
    expect(router.currentRoute.value.query.listingId).toBeUndefined()
    wrapper.unmount()
  })

  test('unavailable source fails closed and disables viewing action', async () => {
    const { wrapper } = await mountHousing()
    await wrapper.get('[data-testid="housing-mode-buy"]').trigger('click')
    await wrapper.get('[data-testid="housing-listing-housing_listing_jari_006"] .jari-listing__body').trigger('click')
    expect(wrapper.get('[data-testid="housing-source-state"]').text()).toContain('来源暂时不可用')
    expect(wrapper.get('[data-testid="housing-viewing-open"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="housing-listing-detail"]').text()).toContain('148 亿韩元')
    wrapper.unmount()
  })

  test('viewing draft saves locally, can be rescheduled, and can be cancelled', async () => {
    const { wrapper } = await mountHousing()
    await wrapper.get('[data-testid="housing-listing-housing_listing_jari_001"] .jari-listing__body').trigger('click')
    await wrapper.get('[data-testid="housing-viewing-open"]').trigger('click')
    expect(wrapper.get('[data-testid="housing-viewing-sheet"]').text()).toContain('不是已确认预约')
    await wrapper.get('[data-testid="housing-viewing-note"]').setValue('确认厨房采光')
    await wrapper.get('[data-testid="housing-viewing-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="housing-viewing-sheet"]').exists()).toBe(false)

    await wrapper.get('[data-testid="housing-detail-back"]').trigger('click')
    await wrapper.get('[data-testid="housing-section-viewings"]').trigger('click')
    const row = wrapper.get('[data-testid="housing-viewing-row-housing_listing_jari_001"]')
    expect(row.text()).toContain('确认厨房采光')
    await wrapper.get('[data-testid="housing-viewing-edit-housing_listing_jari_001"]').trigger('click')
    await wrapper.findAll('input[name="viewing-slot"]')[2].setValue()
    await wrapper.get('[data-testid="housing-viewing-save"]').trigger('click')
    await wrapper.get('[data-testid="housing-viewing-row-cancel-housing_listing_jari_001"]').trigger('click')
    expect(wrapper.get('[data-testid="housing-viewing-row-housing_listing_jari_001"]').text()).toContain('已取消')
    wrapper.unmount()
  })

  test('English and zen theme render the complete shell without Korean UI', async () => {
    const { wrapper, pinia } = await mountHousing()
    const systemStore = useSystemStore(pinia)
    systemStore.settings.system.language = 'en-US'
    systemStore.settings.appearance.currentTheme = 'zen'
    await flushPromises()
    expect(wrapper.get('[data-testid="housing-app"]').classes()).toContain('is-night')
    expect(wrapper.get('[data-testid="housing-app"]').text()).toContain('Find a place')
    expect(wrapper.text()).not.toMatch(/[가-힣]/)
    wrapper.unmount()
  })
})
