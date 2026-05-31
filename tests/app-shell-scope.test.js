import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import App from '../src/App.vue'
import { useSystemStore } from '../src/stores/system'
import {
  resolveAppShellScopeAttrs,
  resolveRouteAppScope,
} from '../src/lib/app-shell-scope'

const DummyView = { template: '<div data-testid="dummy-route" />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: DummyView },
      { path: '/food-delivery', component: DummyView },
      { path: '/chat/:id', component: DummyView },
    ],
  })

describe('app shell scope attributes', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    document.head
      .querySelectorAll(
        '[data-schatphone-custom-css], [data-schatphone-scoped-css], [data-schatphone-chat-css]',
      )
      .forEach((node) => node.remove())
    vi.useRealTimers()
  })

  test('normalizes route app and world-app scope tokens', () => {
    expect(resolveRouteAppScope({ path: '/food-delivery' })).toBe('food_delivery')
    expect(resolveRouteAppScope({ path: '/chat/42' })).toBe('chat')
    expect(resolveRouteAppScope({ path: '/' })).toBe('root')
    expect(
      resolveAppShellScopeAttrs({
        path: '/food-delivery',
        query: {
          worldPack: 'survival_city',
          worldApp: 'survival_dispatch',
        },
      }),
    ).toMatchObject({
      'data-app': 'food_delivery',
      'data-route-scope': 'food_delivery',
      'data-world-pack': 'survival_city',
      'data-world-app': 'survival_dispatch',
    })
  })

  test('exposes stable selectors on the app shell for custom CSS', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?worldPack=survival_city&worldApp=survival_dispatch')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    const shell = wrapper.get('.app-shell')
    expect(shell.attributes('data-app')).toBe('food_delivery')
    expect(shell.attributes('data-route-scope')).toBe('food_delivery')
    expect(shell.attributes('data-world-pack')).toBe('survival_city')
    expect(shell.attributes('data-world-app')).toBe('survival_dispatch')
    wrapper.unmount()
  })

  test('injects scoped custom CSS through app and world-app shell selectors', async () => {
    const store = useSystemStore()
    store.settings.appearance.scopedCustomCss = {
      app: {
        enabled: true,
        target: 'food-delivery',
        css: '.screen { color: red; }',
      },
      worldApp: {
        enabled: true,
        worldPack: 'survival_city',
        worldApp: 'survival_dispatch',
        css: '.hero { color: orange; }',
      },
    }

    const router = createTestRouter()
    await router.push('/food-delivery?worldPack=survival_city&worldApp=survival_dispatch')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    const styleEl = document.head.querySelector('[data-schatphone-scoped-css]')
    expect(styleEl?.textContent).toContain('[data-app="food_delivery"] .screen')
    expect(styleEl?.textContent).toContain(
      '[data-world-pack="survival_city"][data-world-app="survival_dispatch"] .hero',
    )
    wrapper.unmount()
  })
})
