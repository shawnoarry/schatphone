import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import BrowserView from '../src/views/BrowserView.vue'
import { useSystemStore } from '../src/stores/system'
import {
  BROWSER_SHELL_STORAGE_KEY,
  resetBrowserShellStateForTesting,
  searchBrowserShellRecords,
} from '../src/lib/browser-shell-data'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: DummyView },
      { path: '/browser', component: BrowserView },
      { path: '/calendar', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/wallet', component: DummyView },
      { path: '/food-delivery', component: DummyView },
    ],
  })

const mountBrowser = async (path = '/browser') => {
  const router = createTestRouter()
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push(path)
  await router.isReady()
  const wrapper = mount(BrowserView, { global: { plugins: [router, pinia] } })
  return { router, wrapper }
}

const submitQuery = async (wrapper, query) => {
  await wrapper.get('[data-testid="browser-search-input"]').setValue(query)
  await wrapper.get('[data-testid="browser-search-submit"]').trigger('submit')
  vi.runAllTimers()
  await flushPromises()
}

describe('Browser / Search / Help S1 shell', () => {
  beforeEach(() => {
    localStorage.clear()
    resetBrowserShellStateForTesting()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-23T10:00:00.000Z'))
  })

  test('renders a source-first home with no provider or private content claims', async () => {
    const { wrapper } = await mountBrowser()
    expect(wrapper.get('[data-testid="prism-browser-app"]').attributes('data-app')).toBe('browser')
    expect(wrapper.text()).toContain('你想找到什么？')
    expect(wrapper.text()).toContain('使用帮助')
    expect(wrapper.text()).toContain('现代首尔')
    expect(wrapper.text()).toContain('外部搜索尚未连接')
    expect(wrapper.get('[data-testid="browser-history-open"]').text()).toContain('历史')
    expect(wrapper.get('[data-testid="browser-bookmarks-open"]').text()).toContain('书签')
    expect(wrapper.text()).not.toContain('聊天记录')
    expect(wrapper.text()).not.toContain('钱包余额')
    wrapper.unmount()
  })

  test('deterministic local search mixes help and world results with stable source labels', async () => {
    const { wrapper } = await mountBrowser()
    await submitQuery(wrapper, 'Hanul 放送中心')

    const row = wrapper.get('[data-testid="browser-result-world_hanul_broadcast_center"]')
    expect(row.text()).toContain('现代首尔')
    expect(row.text()).toContain('Hanul 放送中心')
    expect(wrapper.text()).toContain('零 token')
    wrapper.unmount()
  })

  test('help article opens as readable detail and owner action navigates with Browser context', async () => {
    const { router, wrapper } = await mountBrowser()
    await submitQuery(wrapper, '日历 日程 行程')
    await wrapper.get('[data-testid="browser-result-help_calendar_agenda_journey"] button').trigger('click')
    await flushPromises()

    const detail = wrapper.get('[data-testid="browser-detail"]')
    expect(detail.text()).toContain('日历：什么时候发生')
    expect(detail.text()).toContain('受阻')
    await wrapper.get('[data-testid="browser-detail-owner-action"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/calendar')
    expect(router.currentRoute.value.query.source).toBe('browser')
    expect(router.currentRoute.value.query.browserResult).toBe('help_calendar_agenda_journey')
    wrapper.unmount()
  })

  test('world page stays visibly fictional and stale owner projection fails closed', async () => {
    const { wrapper } = await mountBrowser()
    await submitQuery(wrapper, '旧练习楼')
    expect(wrapper.get('[data-testid="browser-result-world_retired_training_annex"]').text()).toContain('来源不可用')
    await wrapper.get('[data-testid="browser-result-world_retired_training_annex"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="browser-detail"]').text()).toContain('这个页面已经不可用')
    expect(wrapper.get('[data-testid="browser-detail"]').text()).toContain('不会继续展示缓存正文')
    expect(wrapper.find('[data-testid="browser-detail-owner-action"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('web tab exposes honest unavailable recovery without erasing local results', async () => {
    const { wrapper } = await mountBrowser()
    await submitQuery(wrapper, '地图')
    const localCount = wrapper.findAll('[data-testid^="browser-result-"]').length
    expect(localCount).toBeGreaterThan(0)

    await wrapper.get('[data-testid="browser-source-web"]').trigger('click')
    expect(wrapper.get('[data-testid="browser-web-unavailable"]').text()).toContain('不会伪造网页结果')
    await wrapper.get('[data-testid="browser-web-unavailable"] button').trigger('click')
    expect(wrapper.findAll('[data-testid^="browser-result-"]').length).toBe(localCount)
    wrapper.unmount()
  })

  test('empty search stays honest and offers a deterministic recovery query', async () => {
    const { wrapper } = await mountBrowser()
    await submitQuery(wrapper, '完全不存在的内容 99999')
    expect(wrapper.get('[data-testid="browser-empty-state"]').text()).toContain('没有找到本地结果')
    expect(wrapper.get('[data-testid="browser-empty-state"]').text()).toContain('不会用模型补写答案')
    await wrapper.get('[data-testid="browser-empty-state"] button').trigger('click')
    vi.runAllTimers()
    await flushPromises()
    expect(wrapper.find('[data-testid="browser-result-help_calendar_agenda_journey"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('history and bookmarks persist as local light state with explicit delete semantics', async () => {
    const { wrapper } = await mountBrowser()
    await submitQuery(wrapper, '修改外卖地址')
    const resultId = 'help_food_delivery_change_address'
    await wrapper.get(`[data-testid="browser-bookmark-${resultId}"]`).trigger('click')
    await wrapper.get('[data-testid="browser-history-open"]').trigger('click')
    expect(wrapper.get('[data-testid="browser-library"]').text()).toContain('修改外卖地址')

    await wrapper.get('[data-testid="browser-bookmarks-open"]').trigger('click')
    expect(wrapper.get(`[data-testid="browser-result-${resultId}"]`).text()).toContain('如何修改外卖配送地址')
    const stored = JSON.parse(localStorage.getItem(BROWSER_SHELL_STORAGE_KEY))
    expect(stored.history[0].query).toBe('修改外卖地址')
    expect(stored.bookmarks[0].id).toBe(resultId)

    await wrapper.get(`[data-testid="browser-bookmark-${resultId}"]`).trigger('click')
    expect(wrapper.get('[data-testid="browser-empty-state"]').text()).toContain('还没有书签')
    wrapper.unmount()
  })

  test('English and zen mode localize the whole shell and retain readable theme class', async () => {
    const { wrapper } = await mountBrowser()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.settings.appearance.currentTheme = 'zen'
    await flushPromises()

    expect(wrapper.get('[data-testid="prism-browser-app"]').classes()).toContain('is-night')
    expect(wrapper.text()).toContain('What are you looking for?')
    expect(wrapper.text()).toContain('External search is not connected')
    expect(wrapper.text()).not.toMatch(/[\u4e00-\u9fff]/)
    wrapper.unmount()
  })

  test('search helper rejects unsupported source scopes and does not expose a web fixture', () => {
    expect(searchBrowserShellRecords({ query: '', sourceKind: 'web', isZh: true })).toEqual([])
    expect(searchBrowserShellRecords({ query: '地图', sourceKind: 'private', isZh: true }).length).toBeGreaterThan(0)
  })
})
