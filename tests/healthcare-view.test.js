import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import HealthcareView from '../src/views/HealthcareView.vue'
import { useSystemStore } from '../src/stores/system'
import { resetHealthcareShellStateForTesting } from '../src/composables/useHealthcareShellState'

const DummyView = { template: '<div />' }

const mountHealthcare = async (path = '/healthcare') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: DummyView },
      { path: '/healthcare', component: HealthcareView },
      { path: '/map', component: DummyView },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push(path)
  await router.isReady()
  const wrapper = mount(HealthcareView, { global: { plugins: [router, pinia] } })
  return { router, wrapper }
}

describe('Ondam Care Healthcare S1 shell', () => {
  beforeEach(() => {
    localStorage.clear()
    resetHealthcareShellStateForTesting()
  })

  test('renders an ordinary care discovery loop with explicit simulation boundary', async () => {
    const { wrapper } = await mountHealthcare()
    expect(wrapper.get('[data-testid="ondam-care-app"]').attributes('data-app')).toBe('healthcare')
    expect(wrapper.text()).toContain('温谈健康')
    expect(wrapper.text()).toContain('世界内模拟医疗')
    expect(wrapper.text()).toContain('不会收集你的真实健康资料')
    expect(wrapper.text()).toContain('温谈大学路门诊')
    expect(wrapper.get('[data-testid="healthcare-overview-appointments"]').text()).toContain('预约中心')
    expect(wrapper.get('[data-testid="healthcare-overview-reports"]').text()).toContain('报告收件箱')
    wrapper.unmount()
  })

  test('care overview exposes appointments and reports as first-class pages', async () => {
    const { wrapper } = await mountHealthcare()
    await wrapper.get('[data-testid="healthcare-overview-reports"]').trigger('click')
    expect(wrapper.get('[data-testid="healthcare-reports"]').exists()).toBe(true)
    await wrapper.get('[data-testid="healthcare-tab-discover"]').trigger('click')
    await wrapper.get('[data-testid="healthcare-overview-appointments"]').trigger('click')
    expect(wrapper.get('[data-testid="healthcare-appointments"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('filters services and recovers from a deterministic empty state', async () => {
    const { wrapper } = await mountHealthcare()
    await wrapper.get('[data-testid="healthcare-search"]').setValue('完全不存在的医疗服务')
    expect(wrapper.get('[data-testid="healthcare-empty-state"]').text()).toContain('不会用模型补写医疗机构')
    await wrapper.get('[data-testid="healthcare-empty-state"] button').trigger('click')
    expect(wrapper.find('[data-testid="healthcare-institution-ondam-daehakro-clinic"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('books a fixture slot, shows a real local receipt, then cancels it', async () => {
    const { wrapper } = await mountHealthcare()
    await wrapper.get('[data-testid="healthcare-institution-ondam-daehakro-clinic"] button').trigger('click')
    await wrapper.get('[data-testid="healthcare-book-routine-consultation"]').trigger('click')
    expect(wrapper.get('[data-testid="healthcare-booking-sheet"]').text()).toContain('不会自动写入日历、钱包或地图')
    await wrapper.get('[data-testid="healthcare-booking-confirm"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="healthcare-appointment-detail"]').text()).toContain('预约已保存在本设备')
    await wrapper.get('[data-testid="healthcare-cancel-appointment"]').trigger('click')
    expect(wrapper.get('[data-testid="healthcare-appointment-detail"]').text()).toContain('已取消')
    wrapper.unmount()
  })

  test('stale place source fails closed without a Map action', async () => {
    const { wrapper } = await mountHealthcare()
    await wrapper.get('[data-testid="healthcare-institution-ondam-hannam-counseling"] button').trigger('click')
    expect(wrapper.get('[data-testid="healthcare-institution-detail"]').text()).toContain('地点来源已经撤回')
    expect(wrapper.find('[data-testid="healthcare-open-map"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid^="healthcare-book-"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('Map deep link carries stable place reference and Healthcare return context only', async () => {
    const { router, wrapper } = await mountHealthcare()
    await wrapper.get('[data-testid="healthcare-institution-ondam-songpa-checkup"] button').trigger('click')
    await wrapper.get('[data-testid="healthcare-open-map"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/map')
    expect(router.currentRoute.value.query).toMatchObject({
      source: 'healthcare',
      placeId: 'seoul-asan-medical-center',
      mapPackId: 'real-seoul-v1',
      placeRevision: '1',
      world: 'world_modern_seoul',
      returnPath: '/healthcare',
    })
    wrapper.unmount()
  })

  test('report read state and corrected revision acknowledgment are explicit', async () => {
    const { wrapper } = await mountHealthcare()
    await wrapper.get('[data-testid="healthcare-tab-reports"]').trigger('click')
    await wrapper.get('[data-testid="healthcare-report-report-routine-screening-2026"]').trigger('click')
    expect(wrapper.get('[data-testid="healthcare-report-detail"]').text()).toContain('第 2 版修正')
    expect(wrapper.get('[data-testid="healthcare-report-correction"]').text()).toContain('血红蛋白')
    await wrapper.get('[data-testid="healthcare-report-acknowledge"]').trigger('click')
    expect(wrapper.find('[data-testid="healthcare-report-acknowledge"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('withdrawn report source hides cached result rows', async () => {
    const { wrapper } = await mountHealthcare()
    await wrapper.get('[data-testid="healthcare-tab-reports"]').trigger('click')
    await wrapper.get('[data-testid="healthcare-report-report-source-withdrawn"]').trigger('click')
    expect(wrapper.get('[data-testid="healthcare-report-unavailable"]').text()).toContain('旧缓存正文和检查项目不会显示')
    expect(wrapper.find('table').exists()).toBe(false)
    wrapper.unmount()
  })

  test('English and zen theme localize the complete visible shell', async () => {
    const { wrapper } = await mountHealthcare()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.settings.appearance.currentTheme = 'zen'
    await flushPromises()
    expect(wrapper.get('[data-testid="ondam-care-app"]').classes()).toContain('is-night')
    expect(wrapper.text()).toContain('What care would you like to arrange?')
    expect(wrapper.text()).toContain('Source unavailable')
    expect(wrapper.text()).not.toMatch(/[\u4e00-\u9fff]/)
    wrapper.unmount()
  })
})
