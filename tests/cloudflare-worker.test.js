import { describe, expect, test, vi } from 'vitest'
import worker from '../server/cloudflare-worker.mjs'

const assets = {
  fetch: vi.fn(async () => new Response('<!doctype html><title>SchatPhone</title>')),
}

describe('Cloudflare Worker', () => {
  test('routes static requests through the Workers Assets binding', async () => {
    assets.fetch.mockClear()
    const request = new Request('https://schatphone.example/lock')

    const response = await worker.fetch(request, { ASSETS: assets })

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('SchatPhone')
    expect(assets.fetch).toHaveBeenCalledWith(request)
  })

  test('fails closed at the models endpoint when secrets are absent', async () => {
    const response = await worker.fetch(
      new Request('https://schatphone.example/api/openai/v1/models'),
      { ASSETS: assets },
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ ok: false, code: 'PROXY_NOT_CONFIGURED' })
  })

  test('does not serve the SPA shell for unknown API paths', async () => {
    const response = await worker.fetch(
      new Request('https://schatphone.example/api/openai/v1/unknown'),
      { ASSETS: assets },
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ ok: false, code: 'NOT_FOUND' })
  })

  test('advertises dynamic proxy headers and blocks private targets', async () => {
    const preflight = await worker.fetch(
      new Request('https://schatphone.example/api/openai/v1/models', {
        method: 'OPTIONS',
        headers: { Origin: 'https://schatphone.example' },
      }),
      { ASSETS: assets, SCHATPHONE_AI_PROXY_DYNAMIC_MODE: 'public' },
    )
    const blocked = await worker.fetch(
      new Request('https://schatphone.example/api/openai/v1/models', {
        headers: {
          Origin: 'https://schatphone.example',
          'X-SchatPhone-Upstream-URL': 'https://127.0.0.1/v1',
        },
      }),
      { ASSETS: assets, SCHATPHONE_AI_PROXY_DYNAMIC_MODE: 'public' },
    )

    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-headers')).toContain(
      'X-SchatPhone-Upstream-URL',
    )
    expect(blocked.status).toBe(403)
    expect(await blocked.json()).toEqual({ ok: false, code: 'PROXY_TARGET_NOT_ALLOWED' })
  })

  test('generates MeloTTS audio through the Workers AI binding', async () => {
    const ai = {
      run: vi.fn(async () => ({ audio: btoa(String.fromCharCode(0x49, 0x44, 0x33)) })),
    }
    const response = await worker.fetch(
      new Request('https://schatphone.example/api/tts/v1/speech', {
        method: 'POST',
        headers: {
          Origin: 'https://schatphone.example',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: '你好', language: 'zh' }),
      }),
      { ASSETS: assets, AI: ai },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('audio/mpeg')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([0x49, 0x44, 0x33]),
    )
    expect(ai.run).toHaveBeenCalledWith('@cf/myshell-ai/melotts', {
      prompt: '你好',
      lang: 'ZH',
    })
  })

  test('reports the WAV container returned by MeloTTS', async () => {
    const wavHeader = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ])
    const ai = {
      run: vi.fn(async () => ({ audio: btoa(String.fromCharCode(...wavHeader)) })),
    }
    const response = await worker.fetch(
      new Request('https://schatphone.example/api/tts/v1/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '你好', language: 'zh' }),
      }),
      { ASSETS: assets, AI: ai },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('audio/wav')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(wavHeader)
  })

  test('rejects unrecognized MeloTTS audio bytes', async () => {
    const ai = {
      run: vi.fn(async () => ({ audio: btoa('not audio') })),
    }
    const response = await worker.fetch(
      new Request('https://schatphone.example/api/tts/v1/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '你好', language: 'zh' }),
      }),
      { ASSETS: assets, AI: ai },
    )

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ ok: false, code: 'INVALID_AUDIO_RESPONSE' })
  })

  test('fails closed when the MeloTTS binding is absent', async () => {
    const response = await worker.fetch(
      new Request('https://schatphone.example/api/tts/v1/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'hello', language: 'en' }),
      }),
      { ASSETS: assets },
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ ok: false, code: 'TTS_NOT_CONFIGURED' })
  })

  test('restricts MeloTTS origins and request language', async () => {
    const env = {
      ASSETS: assets,
      AI: { run: vi.fn() },
      SCHATPHONE_TTS_ALLOWED_ORIGINS: 'https://allowed.example',
    }
    const blocked = await worker.fetch(
      new Request('https://schatphone.example/api/tts/v1/speech', {
        method: 'OPTIONS',
        headers: { Origin: 'https://blocked.example' },
      }),
      env,
    )
    const invalidLanguage = await worker.fetch(
      new Request('https://schatphone.example/api/tts/v1/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'hola', language: 'es' }),
      }),
      env,
    )

    expect(blocked.status).toBe(403)
    expect(invalidLanguage.status).toBe(400)
    expect(await invalidLanguage.json()).toEqual({ ok: false, code: 'LANGUAGE_UNSUPPORTED' })
    expect(env.AI.run).not.toHaveBeenCalled()
  })
})
