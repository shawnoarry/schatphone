import { beforeEach, describe, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import WorkplaceView from '../src/views/WorkplaceView.vue'
import { useSystemStore } from '../src/stores/system'
import { resetWorkplaceShellStateForTesting } from '../src/composables/useWorkplaceShellState'

const DummyView = { template: '<div />' }

const mountWorkplace = async (path = '/workplace?from=home&homePage=1') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: DummyView },
      { path: '/workplace', component: WorkplaceView },
      { path: '/calendar', component: DummyView },
      { path: '/agenda-journey', component: DummyView },
      { path: '/map', component: DummyView },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push(path)
  await router.isReady()
  const wrapper = mount(WorkplaceView, { global: { plugins: [router, pinia] } })
  return { router, wrapper }
}

describe('Work Hub Organization Workplace S1 shell', () => {
  beforeEach(() => {
    localStorage.clear()
    resetWorkplaceShellStateForTesting()
  })

  test('renders the artist-first Today viewport and real owner handoffs', async () => {
    const { wrapper } = await mountWorkplace()
    expect(wrapper.get('[data-testid="workplace-app"]').attributes('data-app')).toBe('workplace')
    expect(wrapper.text()).toContain('晚上好，V')
    expect(wrapper.text()).toContain('Music Bank 预录')
    expect(wrapper.text()).toContain('向团队说明当前状态')
    expect(wrapper.get('[data-testid="workplace-open-calendar"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="workplace-open-agenda"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="workplace-open-map"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('completes tasks and submits an explicit status report', async () => {
    const { wrapper } = await mountWorkplace()
    await wrapper.get('[data-testid="workplace-today-task-task-in-ear-check"]').trigger('click')
    expect(wrapper.get('[data-testid="workplace-today-task-task-in-ear-check"]').classes()).toContain('is-complete')
    await wrapper.get('[data-testid="workplace-submit-status"]').trigger('click')
    expect(wrapper.get('[data-testid="workplace-latest-status"]').text()).toContain('最近一次报备已保存在工作台')
    wrapper.unmount()
  })

  test('reads a team channel and sends a bounded local message', async () => {
    const { wrapper } = await mountWorkplace()
    await wrapper.get('[data-testid="workplace-tab-channels"]').trigger('click')
    expect(wrapper.get('[data-testid="workplace-channels"]').text()).toContain('明早车辆 04:55 到楼下')
    await wrapper.get('.workplace-compose textarea').setValue('收到，我会提前五分钟下楼。')
    await wrapper.get('[data-testid="workplace-send-message"]').trigger('submit')
    expect(wrapper.get('[data-testid="workplace-channels"]').text()).toContain('收到，我会提前五分钟下楼。')
    wrapper.unmount()
  })

  test('accepting a schedule proposal waits for Calendar owner confirmation', async () => {
    const { wrapper } = await mountWorkplace()
    await wrapper.get('[data-testid="workplace-tab-tasks"]').trigger('click')
    await wrapper.get('[data-testid="workplace-accept-proposal-radio-20260827"]').trigger('click')
    expect(wrapper.get('[data-testid="workplace-proposal-decision"]').text()).toContain('等待排期人员写入日历')
    wrapper.unmount()
  })

  test('artist application remains pending and does not grant publishing access', async () => {
    const { wrapper } = await mountWorkplace()
    await wrapper.get('[data-testid="workplace-tab-organization"]').trigger('click')
    await wrapper.get('[data-testid="workplace-submit-artist-application"]').trigger('click')
    const pending = wrapper.get('[data-testid="workplace-artist-application-pending"]')
    expect(pending.text()).toContain('等待平台审核')
    expect(pending.text()).toContain('当前没有艺人发布权限')
    wrapper.unmount()
  })

  test('renames the App and organization from inside Workplace without changing credential truth', async () => {
    const { wrapper } = await mountWorkplace()
    const systemStore = useSystemStore()
    await wrapper.get('[data-testid="workplace-tab-organization"]').trigger('click')
    await wrapper.get('[data-testid="workplace-open-name-editor"]').trigger('click')
    await wrapper.get('[data-testid="workplace-app-name-input"]').setValue('星河工作台')
    await wrapper.get('[data-testid="workplace-organization-name-input"]').setValue('星河娱乐')
    await wrapper.get('[data-testid="workplace-save-names"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('.workplace-wordmark').text()).toContain('星河工作台')
    expect(wrapper.get('.workplace-wordmark').text()).toContain('星河娱乐')
    expect(systemStore.settings.appearance.appIconOverrides.app_workplace.displayName).toBe('星河工作台')
    expect(wrapper.get('[data-testid="workplace-credential"]').text()).toContain('Morrow · 艺人所属凭证')
    wrapper.unmount()
  })

  test('Map handoff carries a stable place reference and Workplace return context', async () => {
    const { router, wrapper } = await mountWorkplace()
    await wrapper.get('[data-testid="workplace-open-map"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/map')
    expect(router.currentRoute.value.query).toMatchObject({
      source: 'workplace',
      placeId: 'seoul-kbs-hq',
      mapPackId: 'real-seoul-v1',
      placeRevision: '1',
      world: 'world_modern_seoul',
      returnPath: '/workplace',
      homePage: '1',
    })
    wrapper.unmount()
  })

  test('English night mode localizes the visible shell', async () => {
    const { wrapper } = await mountWorkplace()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.settings.appearance.currentTheme = 'zen'
    await flushPromises()
    expect(wrapper.get('[data-testid="workplace-app"]').classes()).toContain('is-night')
    expect(wrapper.text()).toContain('Good evening, V')
    expect(wrapper.text()).toContain('Tell the team where you stand')
    expect(wrapper.text()).not.toMatch(/[\u4e00-\u9fff]/)
    wrapper.unmount()
  })
})
