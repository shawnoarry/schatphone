import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import WorldBookView from '../src/views/WorldBookView.vue'
import { useChatStore } from '../src/stores/chat'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/worldbook', component: WorldBookView },
      { path: '/settings', component: DummyView },
      { path: '/shopping', component: DummyView },
    ],
  })

const mountWorldBook = async () => {
  const router = createTestRouter()
  await router.push('/worldbook')
  await router.isReady()

  const wrapper = mount(WorldBookView, {
    global: {
      plugins: [router],
    },
  })
  await nextTick()
  return wrapper
}

describe('WorldBook functional IA', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('leads with active world overview and current pack before editing controls', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'zh-CN'
    const worldview = '这座城市以夜间礼仪和稳定关系网为基础。'
    systemStore.setGlobalWorldview(worldview)
    systemStore.upsertKnowledgePoint({
      id: 'kp_city',
      title: '城市礼仪',
      content: '公开场合先正式问候。',
      enabled: true,
    })
    systemStore.upsertKnowledgePoint({
      id: 'kp_disabled',
      title: '停用条目',
      content: '不应该注入。',
      enabled: false,
    })
    systemStore.createWorldProfileTemplateFromPreset('preset_abo', {
      worldId: 'default_world',
    })

    const wrapper = await mountWorldBook()

    const overview = wrapper.get('[data-testid="worldbook-overview"]')
    const currentPack = wrapper.get('[data-testid="worldbook-current-pack"]')
    const worldKernel = wrapper.get('[data-testid="worldbook-world-kernel"]')

    expect(overview.text()).toContain('当前生效世界')
    expect(overview.get('[data-testid="worldbook-overview-pack"]').text()).toContain('默认世界')
    expect(overview.get('[data-testid="worldbook-overview-worldview"]').text()).toContain(
      String(worldview.length),
    )
    expect(overview.get('[data-testid="worldbook-overview-knowledge"]').text()).toContain('1 / 2')
    expect(overview.get('[data-testid="worldbook-overview-templates"]').text()).toContain('1')
    expect(overview.get('[data-testid="worldbook-overview-consumer-chat"]').text()).toContain('聊天')
    expect(overview.get('[data-testid="worldbook-overview-consumer-runtime"]').text()).toContain(
      '事件运行时',
    )

    expect(currentPack.text()).toContain('当前设定包')
    expect(currentPack.get('[data-testid="worldbook-current-pack-state"]').text()).toContain(
      '默认启用',
    )
    expect(currentPack.get('[data-testid="worldbook-current-pack-effects"]').text()).toContain(
      '1 条启用，1 条停用',
    )
    expect(overview.element.compareDocumentPosition(currentPack.element)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(currentPack.element.compareDocumentPosition(worldKernel.element)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )

    wrapper.unmount()
  })

  test('uses English pack and consumer labels when system language is English', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setGlobalWorldview('Quiet daily city.')

    const wrapper = await mountWorldBook()
    const overview = wrapper.get('[data-testid="worldbook-overview"]')

    expect(overview.get('[data-testid="worldbook-overview-pack"]').text()).toContain('Default world')
    expect(overview.get('[data-testid="worldbook-overview-consumer-chat"]').text()).toContain('Chat')
    expect(wrapper.get('[data-testid="worldbook-current-pack-name"]').text()).toContain('Default world')

    wrapper.unmount()
  })

  test('focuses source activation first and lets users switch management panels', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'zh-CN'

    const wrapper = await mountWorldBook()

    expect(wrapper.get('[data-testid="worldbook-control-deck"]').text()).toContain('世界上下文控制台')
    expect(wrapper.get('[data-testid="worldbook-panel-sources"]').element.style.display).not.toBe(
      'none',
    )
    expect(wrapper.get('[data-testid="worldbook-source-stats"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="worldbook-panel-pack"]').element.style.display).toBe('none')

    await wrapper.get('[data-testid="worldbook-panel-tab-pack"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-panel-pack"]').element.style.display).not.toBe(
      'none',
    )
    expect(wrapper.get('[data-testid="worldbook-panel-sources"]').element.style.display).toBe(
      'none',
    )

    await wrapper.get('[data-testid="worldbook-panel-tab-knowledge"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="worldbook-knowledge-manager"]').element.style.display).not.toBe(
      'none',
    )

    wrapper.unmount()
  })

  test('reviews and activates a built-in world pack from WorldBook', async () => {
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    systemStore.settings.system.language = 'zh-CN'

    const wrapper = await mountWorldBook()

    await wrapper.get('[data-testid="worldbook-current-pack-select"]').setValue('survival_city')
    await nextTick()

    const review = wrapper.get('[data-testid="worldbook-current-pack-review"]')
    expect(review.text()).toContain('灾后生存都市')
    expect(review.text()).toContain('世界应用')
    expect(review.text()).toContain('服务号模板')

    await wrapper.get('[data-testid="worldbook-current-pack-activate"]').trigger('click')
    await nextTick()

    expect(systemStore.user.activeWorldPackId).toBe('survival_city')
    expect(wrapper.get('[data-testid="worldbook-overview-pack"]').text()).toContain('灾后生存都市')
    expect(wrapper.get('[data-testid="worldbook-current-pack-state"]').text()).toContain('当前启用')

    const appBindings = wrapper.get('[data-testid="worldbook-current-pack-app-bindings"]')
    expect(appBindings.text()).toContain('补给站')
    expect(appBindings.text()).toContain('Shopping')

    await wrapper
      .get('[data-testid="worldbook-current-pack-open-app-survival_supply_board"]')
      .trigger('click')
    await flushPromises()

    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/shopping')
    expect(wrapper.vm.$router.currentRoute.value.query).toMatchObject({
      from: 'worldbook',
      worldPack: 'survival_city',
      worldApp: 'survival_supply_board',
    })

    await wrapper.vm.$router.push('/worldbook')
    await flushPromises()

    const serviceTemplates = wrapper.get('[data-testid="worldbook-current-pack-service-templates"]')
    expect(serviceTemplates.text()).toContain('补给调度员')
    expect(serviceTemplates.text()).toContain('待确认')

    await wrapper
      .get('[data-testid="worldbook-current-pack-create-service-survival_supply_dispatch"]')
      .trigger('click')
    await nextTick()

    const generated = chatStore.findWorldServiceTemplateContact(
      'survival_city',
      'survival_supply_dispatch',
    )
    expect(generated).toMatchObject({
      kind: 'service',
      name: '补给调度员',
      shoppingServiceKey: 'daily_fresh',
      worldPackId: 'survival_city',
      worldServiceTemplateId: 'survival_supply_dispatch',
      worldAppBindingId: 'survival_supply_board',
    })
    expect(
      wrapper.get('[data-testid="worldbook-current-pack-open-service-survival_supply_dispatch"]').exists(),
    ).toBe(true)

    wrapper.unmount()
  })
})
