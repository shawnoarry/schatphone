import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTtsStore } from '../src/stores/tts'
import { TTS_PROVIDER_IDS } from '../src/lib/tts-contract'

describe('TTS store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('keeps provider settings and credentials in separate device-local records', () => {
    const store = useTtsStore()
    store.setCredentials(TTS_PROVIDER_IDS.MINIMAX, { apiKey: 'device-only-secret' })
    store.updateProfile(TTS_PROVIDER_IDS.MINIMAX, { emotion: 'happy', speed: 1.2 })

    expect(localStorage.getItem('schatphone:tts:credentials')).toContain('device-only-secret')
    expect(localStorage.getItem('schatphone:tts:config')).not.toContain('device-only-secret')
    expect(localStorage.getItem('schatphone:tts:config')).toContain('happy')
  })

  test('keeps preview audio in memory and revokes Object URLs', async () => {
    const store = useTtsStore()
    const objectUrlApi = {
      createObjectURL: vi.fn(() => 'blob:tts-preview'),
      revokeObjectURL: vi.fn(),
    }
    const fetchImpl = vi.fn(async () =>
      new Response(new Uint8Array([0x49, 0x44, 0x33]), {
        headers: { 'content-type': 'audio/mpeg' },
      }),
    )
    store.updateProfile(TTS_PROVIDER_IDS.CLOUDFLARE_MELOTTS, { language: 'zh' })

    const result = await store.synthesizePreview('你好', { fetchImpl, objectUrlApi })

    expect(result.ok).toBe(true)
    expect(store.preview).toMatchObject({
      status: 'ready',
      audioUrl: 'blob:tts-preview',
      providerId: TTS_PROVIDER_IDS.CLOUDFLARE_MELOTTS,
    })
    expect(localStorage.getItem('schatphone:tts:config')).not.toContain('blob:tts-preview')

    store.clearPreview()
    expect(objectUrlApi.revokeObjectURL).toHaveBeenCalledWith('blob:tts-preview')
    expect(store.preview.audioUrl).toBe('')
  })

  test('requires a MiniMax key before making a request', async () => {
    const store = useTtsStore()
    store.setActiveProfile(TTS_PROVIDER_IDS.MINIMAX)
    const fetchImpl = vi.fn()

    const result = await store.synthesizePreview('你好', { fetchImpl })

    expect(result).toMatchObject({ ok: false, code: 'API_KEY_REQUIRED' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
