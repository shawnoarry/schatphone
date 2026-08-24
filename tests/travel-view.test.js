import { beforeEach, describe, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import TravelView from '../src/views/TravelView.vue'
import { resetTravelShellStateForTesting } from '../src/composables/useTravelShellState'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }
const mountTravel = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/home', component: DummyView }, { path: '/travel', component: TravelView }] })
  const pinia = createPinia(); setActivePinia(pinia)
  await router.push('/travel?from=home&homePage=2'); await router.isReady()
  return { wrapper: mount(TravelView, { global: { plugins: [router, pinia] } }) }
}

describe('ROAM Travel S1 shell', () => {
  beforeEach(() => { localStorage.clear(); resetTravelShellStateForTesting() })

  test('renders discovery with explicit room-source states', async () => {
    const { wrapper } = await mountTravel()
    expect(wrapper.get('[data-testid="travel-app"]').attributes('data-app')).toBe('travel')
    expect(wrapper.text()).toContain('可建立意向')
    expect(wrapper.text()).toContain('当前不可用')
    expect(wrapper.text()).toContain('来源已过期')
    wrapper.unmount()
  })

  test('creates only a local stay-intent draft and shows it in Trip book', async () => {
    const { wrapper } = await mountTravel()
    await wrapper.get('[data-testid="travel-stay-roam-stay-seongsu-riverside"]').trigger('click')
    expect(wrapper.get('[data-testid="travel-stay-detail"]').text()).toContain('不扣款、不锁房')
    await wrapper.get('[data-testid="travel-save-draft"]').trigger('click')
    await wrapper.get('[data-testid="travel-stay-detail"] .detail-close').trigger('click')
    await wrapper.get('[data-testid="travel-tab-trips"]').trigger('click')
    expect(wrapper.get('[data-testid="travel-trips"]').text()).toContain('LOCAL')
    expect(wrapper.get('[data-testid="travel-trips"]').text()).toContain('不是订单、付款、房态锁定或日历行程')
    wrapper.unmount()
  })

  test('fails closed for unavailable and stale sources', async () => {
    const { wrapper } = await mountTravel()
    await wrapper.get('[data-testid="travel-stay-roam-stay-jeonju-paper-moon"]').trigger('click')
    expect(wrapper.find('[data-testid="travel-save-draft"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="travel-source-closed"]').text()).toContain('不生成候补或假房量')
    await wrapper.get('[data-testid="travel-stay-detail"] .detail-close').trigger('click')
    await wrapper.get('[data-testid="travel-stay-roam-stay-sokcho-cloudline"]').trigger('click')
    expect(wrapper.get('[data-testid="travel-source-closed"]').text()).toContain('不能用旧价格建立意向')
    wrapper.unmount()
  })

  test('localizes English night mode without Chinese UI copy', async () => {
    const { wrapper } = await mountTravel()
    const systemStore = useSystemStore(); systemStore.settings.system.language = 'en-US'; systemStore.settings.appearance.colorMode = 'night'
    await flushPromises()
    expect(wrapper.get('[data-testid="travel-app"]').classes()).toContain('is-night')
    expect(wrapper.text()).toContain('For this pause')
    expect(wrapper.text()).not.toMatch(/[\u4e00-\u9fff]/)
    wrapper.unmount()
  })
})
