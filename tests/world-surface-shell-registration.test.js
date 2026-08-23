import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppStoreView from '../src/views/AppStoreView.vue'
import {
  HOME_APP_REGISTRY_ADDITIONS,
  HOME_PLANNED_LOCKED_TILE_IDS,
  HOME_PLANNED_TILE_IDS,
} from '../src/lib/home-entry-registry'
import {
  BROWSER_HOME_APP_ID,
  BROWSER_ROUTE,
  COMMUNITY_HOME_APP_ID,
  COMMUNITY_ROUTE,
  HEALTHCARE_HOME_APP_ID,
  HEALTHCARE_ROUTE,
  HOUSING_HOME_APP_ID,
  HOUSING_ROUTE,
} from '../src/lib/planned-module-registry'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

describe('world surface shell registration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-23T12:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('registers Browser and Community as ordinary installed apps', () => {
    const systemStore = useSystemStore()

    expect(HOME_APP_REGISTRY_ADDITIONS[BROWSER_HOME_APP_ID]).toMatchObject({
      kind: 'app',
      label: 'Browser',
      route: BROWSER_ROUTE,
    })
    expect(HOME_APP_REGISTRY_ADDITIONS[COMMUNITY_HOME_APP_ID]).toMatchObject({
      kind: 'app',
      label: 'Ripple',
      route: COMMUNITY_ROUTE,
    })
    expect(HOME_PLANNED_TILE_IDS).toEqual(
      expect.arrayContaining([BROWSER_HOME_APP_ID, COMMUNITY_HOME_APP_ID]),
    )
    expect(HOME_PLANNED_LOCKED_TILE_IDS).not.toContain(BROWSER_HOME_APP_ID)
    expect(HOME_PLANNED_LOCKED_TILE_IDS).not.toContain(COMMUNITY_HOME_APP_ID)
    expect(systemStore.settings.appearance.homeWidgetPages.flat()).toEqual(
      expect.arrayContaining([BROWSER_HOME_APP_ID, COMMUNITY_HOME_APP_ID]),
    )
  })

  test('registers Healthcare and Housing without locking their Home placement', () => {
    const systemStore = useSystemStore()

    expect(HOME_APP_REGISTRY_ADDITIONS[HEALTHCARE_HOME_APP_ID]).toMatchObject({
      label: 'Ondam Care',
      route: HEALTHCARE_ROUTE,
    })
    expect(HOME_APP_REGISTRY_ADDITIONS[HOUSING_HOME_APP_ID]).toMatchObject({
      label: 'Jari',
      route: HOUSING_ROUTE,
    })
    expect(HOME_PLANNED_TILE_IDS).toEqual(
      expect.arrayContaining([HEALTHCARE_HOME_APP_ID, HOUSING_HOME_APP_ID]),
    )
    expect(HOME_PLANNED_LOCKED_TILE_IDS).not.toContain(HEALTHCARE_HOME_APP_ID)
    expect(HOME_PLANNED_LOCKED_TILE_IDS).not.toContain(HOUSING_HOME_APP_ID)
    expect(systemStore.settings.appearance.homeWidgetPages[1]).toEqual(
      expect.arrayContaining([HEALTHCARE_HOME_APP_ID, HOUSING_HOME_APP_ID]),
    )
  })

  test.each([
    [BROWSER_HOME_APP_ID, BROWSER_ROUTE, 'Prism Browser'],
    [COMMUNITY_HOME_APP_ID, COMMUNITY_ROUTE, 'Ripple'],
    [HEALTHCARE_HOME_APP_ID, HEALTHCARE_ROUTE, 'Ondam Care'],
    [HOUSING_HOME_APP_ID, HOUSING_ROUTE, 'Jari'],
  ])('opens %s from App Store with Home return context', async (appId, appRoute, label) => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/app-store', component: AppStoreView },
        { path: appRoute, component: DummyView },
      ],
    })
    await router.push('/app-store?homePage=1')
    await router.isReady()
    useSystemStore().settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, { global: { plugins: [router] } })
    const item = wrapper.get(`[data-testid="app-store-item-${appId}"]`)

    expect(item.text()).toContain(label)
    await item.trigger('click')
    await wrapper.get('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe(appRoute)
    expect(router.currentRoute.value.query).toMatchObject({ from: 'home', homePage: '1' })
    wrapper.unmount()
  })
})
