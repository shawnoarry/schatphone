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
    await wrapper.get('[data-testid="map-pin-reselect-coordinate"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-pin-coordinate-mode"]').exists()).toBe(true)

    wrapper.findComponent({ name: 'MapSceneCanvas' }).vm.$emit('place-pin', {
      position: { kind: 'geo', lat: 37.5665, lng: 126.978 },
    })
    await nextTick()
    await wrapper.get('[data-testid="map-pin-save"]').trigger('click')
    await nextTick()

    expect(mapStore.addresses.find((address) => address.id === 1)).toMatchObject({
      label: '城市里的家',
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
})
