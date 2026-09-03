import { beforeEach, describe, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import TicketsView from '../src/views/TicketsView.vue'
import { useSystemStore } from '../src/stores/system'
import { resetTicketsShellStateForTesting } from '../src/composables/useTicketsShellState'

const DummyView = { template: '<div />' }
const mountTickets = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/home', component: DummyView },
    { path: '/tickets', component: TicketsView },
  ] })
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push('/tickets?from=home&homePage=2')
  await router.isReady()
  return { router, wrapper: mount(TicketsView, { global: { plugins: [router, pinia] } }) }
}

describe('GATE Tickets S1 shell', () => {
  beforeEach(() => {
    localStorage.clear()
    resetTicketsShellStateForTesting()
  })

  test('renders discovery with multiple product-owned admission states', async () => {
    const { wrapper } = await mountTickets()
    expect(wrapper.get('[data-testid="tickets-app"]').attributes('data-app')).toBe('tickets')
    expect(wrapper.text()).toContain('抽选开放')
    expect(wrapper.text()).toContain('开放预约')
    expect(wrapper.text()).toContain('已售罄')
    wrapper.unmount()
  })

  test('creates only a local admission-intent draft and shows it in Passes', async () => {
    const { wrapper } = await mountTickets()
    await wrapper.get('[data-testid="tickets-event-gate-event-hanul-dome-20260912"]').trigger('click')
    expect(wrapper.get('[data-testid="tickets-event-detail"]').text()).toContain('不锁座、不付款')
    await wrapper.get('[data-testid="tickets-save-draft"]').trigger('click')
    await wrapper.get('[data-testid="tickets-event-detail"] .detail-close').trigger('click')
    await wrapper.get('[data-testid="tickets-tab-passes"]').trigger('click')
    expect(wrapper.get('[data-testid="tickets-passes"]').text()).toContain('LOCAL')
    expect(wrapper.get('[data-testid="tickets-passes"]').text()).toContain('不是订单、付款记录或有效电子票')
    wrapper.unmount()
  })

  test('does not invent inventory for a sold-out event', async () => {
    const { wrapper } = await mountTickets()
    await wrapper.get('[data-testid="tickets-event-gate-event-iseo-listening-20260920"]').trigger('click')
    expect(wrapper.get('[data-testid="tickets-save-draft"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="tickets-save-draft"]').text()).toContain('当前售罄')
    wrapper.unmount()
  })

  test('keeps its fixed poster-wall identity under system night mode', async () => {
    const { wrapper } = await mountTickets()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.settings.appearance.colorMode = 'night'
    await flushPromises()
    expect(wrapper.get('[data-testid="tickets-app"]').classes()).not.toContain('is-night')
    expect(wrapper.text()).toContain('Upcoming rooms')
    expect(wrapper.text()).not.toMatch(/[\u4e00-\u9fff]/)
    wrapper.unmount()
  })
})
