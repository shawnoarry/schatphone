import { beforeEach, describe, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import IntercityView from '../src/views/IntercityView.vue'
import CreatorRightsView from '../src/views/CreatorRightsView.vue'
import ParcelView from '../src/views/ParcelView.vue'
import CareerView from '../src/views/CareerView.vue'
import { useSystemStore } from '../src/stores/system'
import { resetIntercityShellStateForTesting } from '../src/composables/useIntercityShellState'
import { resetCreatorRightsShellStateForTesting } from '../src/composables/useCreatorRightsShellState'
import { resetParcelShellStateForTesting } from '../src/composables/useParcelShellState'
import { resetCareerShellStateForTesting } from '../src/composables/useCareerShellState'

const Dummy = { template: '<div />' }
const mountAt = async (path, component) => {
  const pinia = createPinia(); setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/home', component: Dummy }, { path, component }] })
  await router.push(`${path}?from=home&homePage=3`); await router.isReady()
  return { wrapper: mount(component, { global: { plugins: [router, pinia] } }), systemStore: useSystemStore() }
}

describe('remaining S1 shell portfolio views', () => {
  beforeEach(() => { localStorage.clear(); resetIntercityShellStateForTesting(); resetCreatorRightsShellStateForTesting(); resetParcelShellStateForTesting(); resetCareerShellStateForTesting() })

  test('intercity saves only a local intent and closes stale inventory', async () => {
    const { wrapper } = await mountAt('/intercity', IntercityView)
    await wrapper.get('[data-testid="intercity-service-via-rail-seoul-busan-0828"]').trigger('click')
    expect(wrapper.get('[data-testid="intercity-service-detail"]').text()).toContain('不出票、不占座、不扣款')
    await wrapper.get('[data-testid="intercity-save-draft"]').trigger('click')
    await wrapper.get('[data-testid="intercity-tab-trips"]').trigger('click')
    expect(wrapper.get('[data-testid="intercity-trips"]').text()).toContain('不是订单、占座、付款、登机牌或日历行程')
    wrapper.unmount()
  })

  test('creator rights exposes shares and keeps declaration local', async () => {
    const { wrapper } = await mountAt('/creator-rights', CreatorRightsView)
    await wrapper.get('[data-testid="creator-work-credo-work-neon-weather"]').trigger('click')
    expect(wrapper.get('[data-testid="creator-rights-detail"]').text()).toContain('不授予版权')
    await wrapper.get('[data-testid="creator-rights-detail"] > button').trigger('click')
    await wrapper.get('[data-testid="creator-rights-tab-me"]').trigger('click')
    expect(wrapper.get('[data-testid="creator-rights-me"]').text()).toContain('不提交、不签名、不生成认证')
    wrapper.unmount()
  })

  test('parcel prepares a send draft without creating a shipment', async () => {
    const { wrapper } = await mountAt('/parcel', ParcelView)
    await wrapper.get('[data-testid="parcel-tab-send"]').trigger('click')
    expect(wrapper.get('[data-testid="parcel-send"]').text()).toContain('不创建运单、不计费、不预约取件')
    wrapper.unmount()
  })

  test('career rejects invite-only and stale applications', async () => {
    const { wrapper } = await mountAt('/career', CareerView)
    await wrapper.get('[data-testid="career-listing-next-invite-radio-0828"]').trigger('click')
    expect(wrapper.get('[data-testid="career-closed"]').text()).toContain('没有机构邀约凭证时绝不放行')
    wrapper.unmount()
  })

  test('theme-coupled shells localize English night mode without Chinese UI copy', async () => {
    for (const [path, component, testId] of [['/creator-rights', CreatorRightsView, 'creator-rights-app'], ['/career', CareerView, 'career-app']]) {
      const { wrapper, systemStore } = await mountAt(path, component)
      systemStore.settings.system.language = 'en-US'; systemStore.settings.appearance.colorMode = 'night'; await flushPromises()
      expect(wrapper.get(`[data-testid="${testId}"]`).classes()).toEqual(expect.arrayContaining([expect.stringMatching(/night/)]))
      expect(wrapper.text()).not.toMatch(/[\u4e00-\u9fff]/)
      wrapper.unmount()
    }
  })

  test('intercity keeps its fixed departure-board identity under system night mode', async () => {
    const { wrapper, systemStore } = await mountAt('/intercity', IntercityView)
    systemStore.settings.system.language = 'en-US'; systemStore.settings.appearance.colorMode = 'night'; await flushPromises()
    expect(wrapper.get('[data-testid="intercity-app"]').classes()).not.toContain('is-night')
    expect(wrapper.get('[data-testid="intercity-app"]').classes()).not.toContain('night')
    expect(wrapper.text()).not.toMatch(/[一-鿿]/)
    wrapper.unmount()
  })

  test('parcel keeps its fixed postal identity under system night mode', async () => {
    const { wrapper, systemStore } = await mountAt('/parcel', ParcelView)
    systemStore.settings.system.language = 'en-US'; systemStore.settings.appearance.colorMode = 'night'; await flushPromises()
    expect(wrapper.get('[data-testid="parcel-app"]').classes()).not.toContain('night')
    expect(wrapper.text()).not.toMatch(/[\u4e00-\u9fff]/)
    wrapper.unmount()
  })
})
