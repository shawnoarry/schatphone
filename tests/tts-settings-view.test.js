import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import TtsSettingsView from '../src/views/TtsSettingsView.vue'
import { useSystemStore } from '../src/stores/system'
import { useTtsStore } from '../src/stores/tts'

const DummyView = { template: '<div />' }

const mountView = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat-settings', component: DummyView },
      { path: '/chat-settings/voice', component: TtsSettingsView },
    ],
  })
  await router.push('/chat-settings/voice')
  await router.isReady()
  const wrapper = mount(TtsSettingsView, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper }
}

describe('TTS settings view', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('switches from the default MeloTTS profile to MiniMax device configuration', async () => {
    const { wrapper } = await mountView()

    expect(wrapper.get('[data-testid="tts-cloudflare-endpoint"]').element.value).toBe(
      '/api/tts/v1/speech',
    )
    expect(
      wrapper.findAll('[data-testid="tts-language"] option').map((option) => option.element.value),
    ).toEqual(['zh', 'en'])
    await wrapper.get('[data-testid="tts-provider-minimax-speech"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="tts-model"]').element.value).toBe('speech-2.8-turbo')
    await wrapper.get('[data-testid="tts-minimax-api-key"]').setValue('mini-device-key')
    await wrapper.get('[data-testid="tts-minimax-api-key"]').trigger('change')

    expect(useTtsStore().getCredentials('minimax-speech').apiKey).toBe('mini-device-key')
    expect(localStorage.getItem('schatphone:tts:config')).not.toContain('mini-device-key')

    wrapper.unmount()
  })

  test('sends preview text through the shared store boundary', async () => {
    const store = useTtsStore()
    const synthesizeSpy = vi.spyOn(store, 'synthesizePreview').mockResolvedValue({ ok: true })
    const { wrapper } = await mountView()

    await wrapper.get('[data-testid="tts-preview-text"]').setValue('新的中文试听文本')
    await wrapper.get('[data-testid="tts-generate"]').trigger('click')
    await flushPromises()

    expect(synthesizeSpy).toHaveBeenCalledWith(
      '新的中文试听文本',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )

    wrapper.unmount()
  })

  test('explains a temporary Cloudflare provider outage', async () => {
    const store = useTtsStore()
    const { wrapper } = await mountView()

    store.preview.status = 'error'
    store.preview.errorCode = 'TTS_PROVIDER_UNAVAILABLE'
    await flushPromises()

    expect(wrapper.get('[data-testid="tts-error"]').text()).toContain(
      'Cloudflare speech is temporarily unavailable',
    )

    wrapper.unmount()
  })
})
