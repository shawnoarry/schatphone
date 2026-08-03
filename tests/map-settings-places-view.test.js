import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import MapSettingsPlacesView from '../src/views/MapSettingsPlacesView.vue'
import { useMapStore } from '../src/stores/map'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/map', component: DummyView },
      { path: '/map/settings', component: DummyView },
      { path: '/map/settings/places', component: MapSettingsPlacesView },
    ],
  })

describe('Map places and pins settings', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('edits an existing user pin through explicit coordinate reselection', async () => {
    const router = createTestRouter()
    await router.push('/map/settings/places?addressId=1&from=home&homePage=1')
    await router.isReady()
    const wrapper = mount(MapSettingsPlacesView, { global: { plugins: [router] } })
    await flushPromises()
    const mapStore = useMapStore()

    expect(wrapper.get('[data-testid="map-pin-editor"]').exists()).toBe(true)
    await wrapper.get('[data-testid="map-pin-name"]').setValue('城市里的家')
    await wrapper.get('[data-testid="map-pin-detail"]').setValue('保留中的草稿地址')
    await wrapper.get('[data-testid="map-pin-icon-type-work"]').trigger('click')
    await wrapper.get('[data-testid="map-pin-reselect-coordinate"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-pin-coordinate-mode"]').exists()).toBe(true)

    const mapScene = wrapper.findComponent({ name: 'MapSceneCanvas' })
    mapScene.vm.$emit('select-pin', mapStore.activeMapPlaces.find((place) => place.source === 'user'))
    await nextTick()
    expect(wrapper.find('[data-testid="map-pin-editor"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-pin-coordinate-mode"]').exists()).toBe(true)

    mapScene.vm.$emit('place-pin', {
      position: { kind: 'geo', lat: 37.5665, lng: 126.978 },
    })
    await nextTick()
    expect(wrapper.get('[data-testid="map-pin-name"]').element.value).toBe('城市里的家')
    expect(wrapper.get('[data-testid="map-pin-detail"]').element.value).toBe('保留中的草稿地址')
    const reopenedWorkCategory = wrapper.get('[data-testid="map-pin-icon-type-work"]')
    expect(reopenedWorkCategory.classes()).toContain('is-active')
    await wrapper.get('[data-testid="map-pin-save"]').trigger('click')
    await nextTick()

    expect(mapStore.addresses.find((address) => address.id === 1)).toMatchObject({
      label: '城市里的家',
      detail: '保留中的草稿地址',
      category: 'work',
      position: { kind: 'geo', lat: 37.5665, lng: 126.978 },
    })
    expect(wrapper.get('[data-testid="map-world-pin-list"]').text()).toContain('SM 娱乐')

    await wrapper.get('[data-testid="map-pin-settings-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      path: '/map/settings',
      query: { from: 'home', homePage: '1' },
    })

    wrapper.unmount()
  })

  test('explains every broad category and concrete icon type without leaving settings', async () => {
    const router = createTestRouter()
    await router.push('/map/settings/places')
    await router.isReady()
    const wrapper = mount(MapSettingsPlacesView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.get('[data-testid="map-pin-category-guide-trigger"]').trigger('click')
    await nextTick()

    const guide = wrapper.get('[data-testid="map-pin-category-guide"]')
    expect(guide.findAll('[data-testid^="map-pin-category-guide-group-"]')).toHaveLength(14)
    expect(guide.findAll('[data-testid^="map-pin-category-guide-icon-"]')).toHaveLength(31)
    expect(guide.text()).toContain('家、宿舍、公寓、住宅区与不同档次的居住地点')
    expect(guide.text()).toContain('公司、办公室与工作场所')
    expect(guide.text()).toContain('豪华住宅')
    expect(guide.text()).toContain('整形医院')

    await guide.get('button[aria-label="关闭"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="map-pin-category-guide"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-pin-settings-view"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('filters managed pins by tolerant search and shared map categories', async () => {
    const router = createTestRouter()
    await router.push('/map/settings/places')
    await router.isReady()
    const wrapper = mount(MapSettingsPlacesView, { global: { plugins: [router] } })
    await flushPromises()
    const mapStore = useMapStore()

    expect(wrapper.get('[data-testid="map-pin-create"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-pin-management-filter"]').exists()).toBe(true)
    const categoryOrder = wrapper
      .get('[data-testid="map-pin-management-categories"]')
      .findAll('button')
      .map((button) => button.attributes('data-testid'))
    expect(categoryOrder.slice(0, 8)).toEqual([
      'map-pin-management-category-all',
      'map-pin-management-category-transit',
      'map-pin-management-category-residence',
      'map-pin-management-category-work',
      'map-pin-management-category-education',
      'map-pin-management-category-shopping',
      'map-pin-management-category-supermarket',
      'map-pin-management-category-convenience_store',
    ])
    const expectedTransitCount = mapStore.activeMapPlaces.filter((place) =>
      ['transit', 'transit_hub'].includes(place.category),
    ).length
    const expectedResidenceCount = mapStore.activeMapPlaces.filter((place) =>
      ['home', 'residence_budget', 'residence_standard', 'residence_premium', 'residence_luxury']
        .includes(place.category),
    ).length
    expect(wrapper.get('[data-testid="map-pin-management-category-transit"]').text()).toContain(
      String(expectedTransitCount),
    )
    expect(wrapper.get('[data-testid="map-pin-management-category-residence"]').text()).toContain(
      String(expectedResidenceCount),
    )

    await wrapper.get('[data-testid="map-pin-management-search"]').setValue('SM')
    await nextTick()
    const matchingWorldPins = wrapper.get('[data-testid="map-world-pin-list"]')
    expect(matchingWorldPins.text()).toContain('SM 娱乐')
    expect(matchingWorldPins.text()).not.toContain('HYBE')

    await wrapper.get('[data-testid="map-pin-management-search"]').setValue('')
    await wrapper.get('[data-testid="map-pin-management-category-leisure"]').trigger('click')
    await nextTick()

    const expectedLeisureCount = mapStore.activeMapPlaces.filter((place) =>
      ['leisure', 'nightlife', 'fitness', 'cinema', 'park'].includes(place.category),
    ).length
    expect(expectedLeisureCount).toBeGreaterThan(0)
    expect(wrapper.get('[data-testid="map-world-pin-list"]').findAll('.map-pin-row')).toHaveLength(
      expectedLeisureCount,
    )
    wrapper.unmount()
  })

  test('creates the first pin inside the settings-owned manager', async () => {
    const mapStore = useMapStore()
    mapStore.addresses.splice(0, mapStore.addresses.length)
    const router = createTestRouter()
    await router.push('/map/settings/places?from=home&homePage=1')
    await router.isReady()
    const wrapper = mount(MapSettingsPlacesView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.get('[data-testid="map-pin-create-empty"]').trigger('click')
    expect(wrapper.findAll('[data-testid^="map-pin-icon-group-"]')).toHaveLength(14)
    expect(wrapper.findAll('[data-testid^="map-pin-icon-type-"]')).toHaveLength(31)
    await wrapper.get('[data-testid="map-pin-name"]').setValue('新住处')
    await wrapper.get('[data-testid="map-pin-detail"]').setValue('地图管理页创建')
    await wrapper.get('[data-testid="map-pin-icon-type-residence_luxury"]').trigger('click')
    expect(wrapper.get('[data-testid="map-pin-selected-type"]').text()).toMatch(
      /住宅.*豪华住宅|Residence.*Luxury residences/,
    )
    await wrapper.get('[data-testid="map-pin-reselect-coordinate"]').trigger('click')
    await nextTick()

    wrapper.findComponent({ name: 'MapSceneCanvas' }).vm.$emit('place-pin', {
      position: { kind: 'geo', lat: 37.55, lng: 126.98 },
    })
    await nextTick()
    await wrapper.get('[data-testid="map-pin-save"]').trigger('click')
    await nextTick()

    expect(mapStore.addresses).toHaveLength(1)
    expect(mapStore.addresses[0]).toMatchObject({
      label: '新住处',
      detail: '地图管理页创建',
      category: 'residence_luxury',
      position: { kind: 'geo', lat: 37.55, lng: 126.98 },
    })
    wrapper.unmount()
  })
})
