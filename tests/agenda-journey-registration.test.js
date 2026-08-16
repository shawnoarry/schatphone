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
  AGENDA_JOURNEY_HOME_APP_ID,
  AGENDA_JOURNEY_ROUTE,
} from '../src/lib/planned-module-registry'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

describe('Agenda Journey app registration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-16T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('keeps one stable installed-app identity on the default Home', () => {
    const systemStore = useSystemStore()

    expect(AGENDA_JOURNEY_HOME_APP_ID).toBe('app_agenda_journey')
    expect(AGENDA_JOURNEY_ROUTE).toBe('/agenda-journey')
    expect(HOME_APP_REGISTRY_ADDITIONS[AGENDA_JOURNEY_HOME_APP_ID]).toMatchObject({
      kind: 'app',
      label: 'Agenda Journey',
      route: AGENDA_JOURNEY_ROUTE,
    })
    expect(HOME_PLANNED_TILE_IDS).toContain(AGENDA_JOURNEY_HOME_APP_ID)
    expect(HOME_PLANNED_LOCKED_TILE_IDS).not.toContain(AGENDA_JOURNEY_HOME_APP_ID)
    expect(systemStore.settings.appearance.homeWidgetPages[1]).toContain(
      AGENDA_JOURNEY_HOME_APP_ID,
    )
  })

  test('exposes the installed app in App Store and opens its stable route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/app-store', component: AppStoreView },
        { path: AGENDA_JOURNEY_ROUTE, component: DummyView },
      ],
    })
    await router.push('/app-store?homePage=2')
    await router.isReady()
    useSystemStore().settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, { global: { plugins: [router] } })
    const item = wrapper.get(`[data-testid="app-store-item-${AGENDA_JOURNEY_HOME_APP_ID}"]`)

    expect(item.text()).toContain('Agenda Journey')
    expect(item.classes()).toContain('is-state-home')
    expect(item.text()).toContain('Screen 2')
    expect(item.text()).toContain('Home')
    await item.trigger('click')
    await wrapper.get('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe(AGENDA_JOURNEY_ROUTE)
    expect(router.currentRoute.value.query).toMatchObject({ from: 'home', homePage: '2' })
    wrapper.unmount()
  })
})
