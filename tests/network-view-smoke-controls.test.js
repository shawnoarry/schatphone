import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import NetworkView from '../src/views/NetworkView.vue'
import { useSystemStore } from '../src/stores/system'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'

const aiMockState = vi.hoisted(() => ({
  calls: [],
  modelFetchCalls: [],
  nextResult: 'OK',
  nextError: null,
  nextModelFetchError: null,
}))

vi.mock('../src/lib/ai', async () => {
  const actual = await vi.importActual('../src/lib/ai')
  return {
    ...actual,
    fetchAvailableModels: vi.fn(async (payload) => {
      aiMockState.modelFetchCalls.push(payload)
      if (aiMockState.nextModelFetchError) {
        throw aiMockState.nextModelFetchError
      }
      return {
        kind: 'openai_compatible',
        models: ['gpt-4o-mini', 'gpt-4.1-mini'],
      }
    }),
    callAI: vi.fn(async (payload) => {
      aiMockState.calls.push(payload)
      if (aiMockState.nextError) {
        throw aiMockState.nextError
      }
      return aiMockState.nextResult
    }),
  }
})

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/network', component: NetworkView },
      { path: '/home', component: DummyView },
      { path: '/settings', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountNetworkView = async () => {
  const router = createTestRouter()
  await router.push('/network')
  await router.isReady()

  const wrapper = mount(NetworkView, {
    global: {
      plugins: [router],
    },
  })

  await flushUi()
  return { wrapper, router }
}

const configureReadyApi = (store) => {
  store.settings.api.url = 'https://api.openai.com/v1/chat/completions'
  store.settings.api.key = 'sk-test'
  store.settings.api.model = 'gpt-4o-mini'
}

describe('NetworkView Chat smoke controls', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    aiMockState.calls.length = 0
    aiMockState.modelFetchCalls.length = 0
    aiMockState.nextResult = 'OK'
    aiMockState.nextError = null
    aiMockState.nextModelFetchError = null
    resetDialogServiceForTest()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    resetDialogServiceForTest()
    vi.useRealTimers()
  })

  test('blocks smoke test before API key is configured and writes diagnostics', async () => {
    const store = useSystemStore()
    store.settings.api.url = 'https://api.openai.com/v1/chat/completions'
    store.settings.api.key = ''
    store.settings.api.model = 'gpt-4o-mini'

    const { wrapper } = await mountNetworkView()

    await wrapper.get('[data-testid="network-chat-smoke-run"]').trigger('click')
    await flushUi()

    expect(aiMockState.calls).toHaveLength(0)
    expect(wrapper.get('[data-testid="network-chat-smoke-error"]').text()).toContain('Key')
    expect(store.apiReports[0]).toMatchObject({
      level: 'error',
      module: 'network',
      action: 'chat_smoke_test',
      code: 'NO_API_KEY',
    })

    wrapper.unmount()
  })

  test('blocks model connection test before URL is configured and writes diagnostics', async () => {
    const store = useSystemStore()
    store.settings.api.url = ''
    store.settings.api.key = 'sk-test'
    store.settings.api.model = 'gpt-4o-mini'

    const { wrapper } = await mountNetworkView()

    await wrapper.get('[data-testid="network-model-test-run"]').trigger('click')
    await flushUi()

    expect(aiMockState.modelFetchCalls).toHaveLength(0)
    expect(wrapper.get('[data-testid="network-model-test-error"]').text()).toContain('接口地址')
    expect(wrapper.get('[data-testid="network-connection-guidance"]').text()).toContain('MISSING_URL')
    expect(store.apiReports[0]).toMatchObject({
      level: 'error',
      module: 'network',
      action: 'fetch_models',
      code: 'MISSING_URL',
    })

    wrapper.unmount()
  })

  test('applies provider templates through the setup panel without replacing the key', async () => {
    const store = useSystemStore()
    store.settings.api.url = ''
    store.settings.api.key = 'sk-keep-me'
    store.settings.api.model = ''

    const { wrapper } = await mountNetworkView()

    await wrapper.get('[data-testid="network-provider-template-openai"]').trigger('click')
    await flushUi()

    expect(store.settings.api.url).toBe('https://api.openai.com/v1/chat/completions')
    expect(store.settings.api.key).toBe('sk-keep-me')
    expect(store.settings.api.model).toBe('gpt-4o-mini')
    expect(store.settings.api.resolvedKind).toBe('openai_compatible')
    expect(wrapper.get('[data-testid="network-setup-progress"]').text()).toBe('3/3')

    wrapper.unmount()
  })

  test('updates API URL and key through the extracted setup form', async () => {
    const store = useSystemStore()
    store.settings.api.url = ''
    store.settings.api.key = ''

    const { wrapper } = await mountNetworkView()

    await wrapper.get('[data-testid="network-api-url-input"]').setValue('https://gateway.test/v1/chat/completions')
    await wrapper.get('[data-testid="network-api-key-input"]').setValue('sk-updated')
    await wrapper.get('[data-testid="network-api-key-toggle"]').trigger('click')
    await flushUi()

    expect(store.settings.api.url).toBe('https://gateway.test/v1/chat/completions')
    expect(store.settings.api.key).toBe('sk-updated')
    expect(wrapper.get('[data-testid="network-api-key-input"]').attributes('type')).toBe('text')
    expect(wrapper.get('[data-testid="network-endpoint-guidance"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('refreshes model list through the model connection test', async () => {
    const store = useSystemStore()
    configureReadyApi(store)
    store.settings.api.model = ''

    const { wrapper } = await mountNetworkView()

    await wrapper.get('[data-testid="network-model-test-run"]').trigger('click')
    await flushUi()

    expect(aiMockState.modelFetchCalls.length).toBeGreaterThan(0)
    expect(wrapper.get('[data-testid="network-model-select"]').text()).toContain('gpt-4.1-mini')
    expect(store.settings.api.resolvedKind).toBe('openai_compatible')
    expect(store.settings.api.model).toBe('gpt-4o-mini')

    wrapper.unmount()
  })

  test('updates the manual fallback model and saves network settings', async () => {
    const store = useSystemStore()
    configureReadyApi(store)
    store.settings.api.model = ''
    const saveSpy = vi.spyOn(store, 'saveNow')

    const { wrapper } = await mountNetworkView()

    await wrapper.get('[data-testid="network-manual-model-input"]').setValue('custom-model')
    await wrapper.get('[data-testid="network-save-settings"]').trigger('click')
    await flushUi()

    expect(store.settings.api.model).toBe('custom-model')
    expect(saveSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="network-save-settings"]').text()).toMatch(/已保存|Saved/)

    wrapper.unmount()
    saveSpy.mockRestore()
  })

  test('saves and removes API presets through the setup panel', async () => {
    const store = useSystemStore()
    configureReadyApi(store)

    const { wrapper } = await mountNetworkView()

    await wrapper.get('[data-testid="network-preset-name-input"]').setValue('Primary gateway')
    await wrapper.get('[data-testid="network-preset-save"]').trigger('click')
    await flushUi()

    expect(store.settings.api.presets).toHaveLength(1)
    expect(store.settings.api.presets[0]).toMatchObject({
      name: 'Primary gateway',
      url: 'https://api.openai.com/v1/chat/completions',
      key: 'sk-test',
      model: 'gpt-4o-mini',
    })
    expect(wrapper.get('[data-testid="network-active-preset-select"]').element.value).toBe(store.settings.api.presets[0].id)

    const { submitDialog } = useDialog()
    await wrapper.get('[data-testid="network-preset-remove-active"]').trigger('click')
    await nextTick()
    submitDialog()
    await flushUi()

    expect(store.settings.api.presets).toHaveLength(0)
    expect(store.settings.api.activePresetId).toBe('')
    expect(wrapper.find('[data-testid="network-active-preset-select"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('shows smoke-test success preview and records an info diagnostic', async () => {
    const store = useSystemStore()
    configureReadyApi(store)
    aiMockState.nextResult = 'OK from mocked provider'

    const { wrapper } = await mountNetworkView()

    await wrapper.get('[data-testid="network-chat-smoke-run"]').trigger('click')
    await flushUi()

    expect(aiMockState.calls).toHaveLength(1)
    expect(aiMockState.calls[0].messages[0].content).toContain('Return exactly OK')
    expect(wrapper.get('[data-testid="network-chat-smoke-success"]').text()).toContain('OK from mocked provider')
    expect(store.apiReports[0]).toMatchObject({
      level: 'info',
      module: 'network',
      action: 'chat_smoke_test',
      code: 'CHAT_SMOKE_OK',
      model: 'gpt-4o-mini',
    })

    wrapper.unmount()
  })

  test('shows smoke-test failure, writes error diagnostic, and keeps report filters usable', async () => {
    const store = useSystemStore()
    configureReadyApi(store)
    aiMockState.nextError = Object.assign(new Error('Auth failed'), {
      code: 'AUTH',
      status: 401,
      statusCode: 401,
    })

    const { wrapper } = await mountNetworkView()

    await wrapper.get('[data-testid="network-chat-smoke-run"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="network-chat-smoke-error"]').text()).toContain('401')
    expect(store.apiReports[0]).toMatchObject({
      level: 'error',
      module: 'network',
      action: 'chat_smoke_test',
      code: 'AUTH',
      statusCode: 401,
    })

    await wrapper.get('[data-testid="network-report-module-filter"]').setValue('network')
    await wrapper.get('[data-testid="network-report-level-filter"]').setValue('error')
    await flushUi()

    const reportCards = wrapper.findAll('[data-testid="network-diagnostic-report"]')
    expect(reportCards.length).toBeGreaterThan(0)
    expect(reportCards[0].text()).toContain('Chat')
    expect(reportCards[0].text()).toContain('AUTH')

    wrapper.unmount()
  })

  test('filters and clears only matched diagnostics after confirmation', async () => {
    const store = useSystemStore()
    const networkErrorId = store.addApiReport({
      level: 'error',
      module: 'network',
      action: 'chat_smoke_test',
      code: 'AUTH',
      message: 'Network auth failure',
    })
    const chatInfoId = store.addApiReport({
      level: 'info',
      module: 'chat',
      action: 'call_ai',
      code: 'CHAT_OK',
      message: 'Chat info report',
    })
    const storageErrorId = store.addApiReport({
      level: 'error',
      module: 'storage',
      action: 'audit_storage',
      code: 'STORAGE_LAYER_INVALID',
      message: 'Storage error',
    })

    const { wrapper } = await mountNetworkView()

    await wrapper.get('[data-testid="network-report-module-filter"]').setValue('network')
    await wrapper.get('[data-testid="network-report-level-filter"]').setValue('error')
    await flushUi()

    const visibleReports = wrapper.findAll('[data-testid="network-diagnostic-report"]')
    expect(visibleReports).toHaveLength(1)
    expect(visibleReports[0].text()).toContain('AUTH')

    const { submitDialog } = useDialog()
    await wrapper.get('[data-testid="network-report-clear"]').trigger('click')
    await nextTick()
    submitDialog()
    await flushUi()

    expect(store.apiReports.some((item) => item.id === networkErrorId)).toBe(false)
    expect(store.apiReports.some((item) => item.id === chatInfoId)).toBe(true)
    expect(store.apiReports.some((item) => item.id === storageErrorId)).toBe(true)
    expect(wrapper.findAll('[data-testid="network-diagnostic-report"]')).toHaveLength(0)

    wrapper.unmount()
  })
})
