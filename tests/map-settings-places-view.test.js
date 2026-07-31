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
    const workCategory = wrapper
      .findAll('.map-pin-category-grid button')
      .find((button) => button.text().includes('工作') || button.text().includes('Work'))
    await workCategory.trigger('click')
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
    const reopenedWorkCategory = wrapper
      .findAll('.map-pin-category-grid button')
      .find((button) => button.text().includes('工作') || button.text().includes('Work'))
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

  test('explains all editable pin categories without leaving settings', async () => {
    const router = createTestRouter()
    await router.push('/map/settings/places')
    await router.isReady()
    const wrapper = mount(MapSettingsPlacesView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.get('[data-testid="map-pin-category-guide-trigger"]').trigger('click')
    await nextTick()

    const guide = wrapper.get('[data-testid="map-pin-category-guide"]')
    expect(guide.findAll('[data-testid^="map-pin-category-guide-"]')).toHaveLength(6)
    expect(guide.text()).toContain('家、宿舍与长期落脚点')
    expect(guide.text()).toContain('公司、办公室与工作场所')

    await guide.get('button[aria-label="关闭"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="map-pin-category-guide"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-pin-settings-view"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
