import { beforeEach, describe, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import FandomView from '../src/views/FandomView.vue'
import { useSystemStore } from '../src/stores/system'
import { resetFandomShellStateForTesting } from '../src/composables/useFandomShellState'
import { resetWorkplaceShellStateForTesting, useWorkplaceShellState } from '../src/composables/useWorkplaceShellState'

const DummyView = { template: '<div />' }
const mountFandom = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/home', component: DummyView },
    { path: '/fandom', component: FandomView },
    { path: '/workplace', component: DummyView },
  ] })
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push('/fandom?from=home&homePage=2')
  await router.isReady()
  return { router, wrapper: mount(FandomView, { global: { plugins: [router, pinia] } }) }
}

describe('Aster unified fandom S1 shell', () => {
  beforeEach(() => {
    localStorage.clear()
    resetFandomShellStateForTesting()
    resetWorkplaceShellStateForTesting()
  })

  test('renders a consumer-first home over shared Community records', async () => {
    const { wrapper } = await mountFandom()
    expect(wrapper.get('[data-testid="fandom-app"]').attributes('data-app')).toBe('fandom')
    expect(wrapper.text()).toContain('社区精选')
    expect(wrapper.text()).toContain('来自涟漪的公开内容')
    expect(wrapper.text()).toContain('尹伊瑟')
    wrapper.unmount()
  })

  test('supports ordinary follow, bookmark, subscription-read, and preferences loops', async () => {
    const { wrapper } = await mountFandom()
    await wrapper.get('[data-testid="fandom-featured-follow"]').trigger('click')
    await wrapper.get('[data-testid="fandom-post-post_hanul_showcase_notice"]').trigger('click')
    expect(wrapper.get('[data-testid="fandom-post-detail"]').text()).toContain('同一稳定帖子 ID')
    await wrapper.get('[data-testid="fandom-post-detail"] .icon-button').trigger('click')
    await wrapper.get('[data-testid="fandom-tab-messages"]').trigger('click')
    await wrapper.get('[data-testid="fandom-read-subscription-yun-iseo-preview"]').trigger('click')
    await wrapper.get('[data-testid="fandom-tab-me"]').trigger('click')
    await wrapper.get('[data-testid="fandom-notification-toggle"]').trigger('click')
    expect(wrapper.get('[data-testid="fandom-notification-toggle"]').attributes('aria-checked')).toBe('false')
    wrapper.unmount()
  })

  test('keeps artist workspace locked before and after a pending Work Hub application', async () => {
    const { wrapper } = await mountFandom()
    await wrapper.get('[data-testid="fandom-tab-me"]').trigger('click')
    expect(wrapper.get('[data-testid="fandom-artist-access"]').text()).toContain('当前未开通')
    useWorkplaceShellState().submitArtistApplication()
    await flushPromises()
    expect(wrapper.get('[data-testid="fandom-artist-access"]').text()).toContain('等待平台审核')
    expect(wrapper.text()).not.toContain('发布动态')
    wrapper.unmount()
  })

  test('opens Work Hub with Fandom return context', async () => {
    const { router, wrapper } = await mountFandom()
    await wrapper.get('[data-testid="fandom-tab-me"]').trigger('click')
    await wrapper.get('[data-testid="fandom-open-workplace"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({ path: '/workplace', query: { source: 'fandom', homePage: '2' } })
    wrapper.unmount()
  })

  test('localizes English night mode without Chinese UI copy', async () => {
    const { wrapper } = await mountFandom()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.settings.appearance.colorMode = 'night'
    await flushPromises()
    expect(wrapper.get('[data-testid="fandom-app"]').classes()).toContain('is-night')
    expect(wrapper.text()).toContain('Community edit')
    expect(wrapper.text()).not.toMatch(/[\u4e00-\u9fff]/)
    wrapper.unmount()
  })
})
