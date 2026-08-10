import { describe, expect, test, vi } from 'vitest'
import {
  DEFAULT_TTS_PROVIDER_PROFILES,
  TTS_PROVIDER_IDS,
  buildTtsRequest,
} from '../src/lib/tts-contract'
import { decodeMiniMaxAudioHex, synthesizeSpeech } from '../src/lib/tts-api'

const profileById = (id) => DEFAULT_TTS_PROVIDER_PROFILES.find((profile) => profile.id === id)

describe('TTS provider adapters', () => {
  test('normalizes a bounded speech request', () => {
    const profile = profileById(TTS_PROVIDER_IDS.CLOUDFLARE_MELOTTS)
    expect(buildTtsRequest({ text: '  你好  ' }, profile)).toMatchObject({
      ok: true,
      value: { text: '你好', language: 'zh' },
    })
    expect(buildTtsRequest({ text: 'x'.repeat(601) }, profile)).toMatchObject({
      ok: false,
      errors: [{ field: 'text', code: 'TEXT_TOO_LONG' }],
    })
  })

  test('uses the project Worker for Cloudflare MeloTTS audio', async () => {
    const profile = profileById(TTS_PROVIDER_IDS.CLOUDFLARE_MELOTTS)
    const request = buildTtsRequest({ text: '你好' }, profile).value
    const fetchImpl = vi.fn(async () =>
      new Response(new Uint8Array([0x49, 0x44, 0x33]), {
        headers: { 'content-type': 'audio/mpeg' },
      }),
    )

    const result = await synthesizeSpeech({ profile, request, fetchImpl })

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/tts/v1/speech',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ text: '你好', language: 'zh' })
    expect(result.blob.size).toBe(3)
    expect(result.providerId).toBe(TTS_PROVIDER_IDS.CLOUDFLARE_MELOTTS)
  })

  test('retries one temporary Cloudflare failure and preserves the returned MIME type', async () => {
    const profile = profileById(TTS_PROVIDER_IDS.CLOUDFLARE_MELOTTS)
    const request = buildTtsRequest({ text: '你好' }, profile).value
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: false, code: 'TTS_PROVIDER_UNAVAILABLE' }), {
          status: 502,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([0x52, 0x49, 0x46, 0x46]), {
          headers: { 'content-type': 'audio/wav' },
        }),
      )

    const result = await synthesizeSpeech({
      profile,
      request,
      fetchImpl,
      cloudflareRetryDelayMs: 0,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(result.blob).toMatchObject({ size: 4, type: 'audio/wav' })
    expect(result.mimeType).toBe('audio/wav')
  })

  test('does not retry a non-temporary Cloudflare rejection', async () => {
    const profile = profileById(TTS_PROVIDER_IDS.CLOUDFLARE_MELOTTS)
    const request = buildTtsRequest({ text: 'hello' }, profile).value
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, code: 'LANGUAGE_UNSUPPORTED' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await expect(synthesizeSpeech({ profile, request, fetchImpl })).rejects.toMatchObject({
      code: 'LANGUAGE_UNSUPPORTED',
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('cancels while waiting to retry Cloudflare', async () => {
    const profile = profileById(TTS_PROVIDER_IDS.CLOUDFLARE_MELOTTS)
    const request = buildTtsRequest({ text: '你好' }, profile).value
    const controller = new AbortController()
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, code: 'TTS_PROVIDER_UNAVAILABLE' }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const pending = synthesizeSpeech({
      profile,
      request,
      fetchImpl,
      signal: controller.signal,
      cloudflareRetryDelayMs: 5_000,
    })

    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1))
    controller.abort()

    await expect(pending).rejects.toMatchObject({ code: 'ABORTED' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('sends MiniMax Chinese settings and decodes Hex MP3 audio', async () => {
    const profile = profileById(TTS_PROVIDER_IDS.MINIMAX)
    const request = buildTtsRequest({ text: '中文试听' }, profile).value
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: { audio: '494433' },
          base_resp: { status_code: 0, status_msg: 'success' },
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
    )

    const result = await synthesizeSpeech({
      profile,
      credentials: { apiKey: 'mini-secret' },
      request,
      fetchImpl,
    })

    const options = fetchImpl.mock.calls[0][1]
    const body = JSON.parse(options.body)
    expect(options.headers.Authorization).toBe('Bearer mini-secret')
    expect(body).toMatchObject({
      model: 'speech-2.8-turbo',
      text: '中文试听',
      language_boost: 'Chinese',
      output_format: 'hex',
      voice_setting: {
        voice_id: 'Chinese (Mandarin)_Lyrical_Voice',
        emotion: 'calm',
      },
      audio_setting: { format: 'mp3', sample_rate: 32000 },
    })
    expect(result.blob).toMatchObject({ size: 3, type: 'audio/mpeg' })
  })

  test('rejects malformed MiniMax Hex audio', () => {
    expect(() => decodeMiniMaxAudioHex('not-hex')).toThrowError(
      expect.objectContaining({ code: 'INVALID_AUDIO_RESPONSE' }),
    )
  })
})
