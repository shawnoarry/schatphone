import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buildOpenAiTransportRequest,
  callAI,
  detectApiKindFromUrl,
  fetchAvailableModels,
  normalizeAiTransportMode,
  requiresApiKeyForUrl,
  resolveAiProxyBaseUrl,
} from '../src/lib/ai'

const createJsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn(async () => payload),
})

describe('AI URL adapters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const value = String(url)
        if (value.includes('/models')) {
          return createJsonResponse({
            data: [{ id: 'local-model' }],
          })
        }
        if (value.includes('/messages')) {
          return createJsonResponse({
            content: [{ type: 'text', text: 'OK from Anthropic' }],
          })
        }
        if (value.includes('/responses')) {
          return createJsonResponse({
            output_text: 'OK from Responses',
          })
        }
        if (value.includes('/deployments') && !value.includes('/chat/completions')) {
          return createJsonResponse({
            data: [{ id: 'deployment-a', model: 'gpt-4o-mini' }],
          })
        }
        return createJsonResponse({
          choices: [{ message: { content: 'OK' } }],
        })
      }),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('detects Gemini OpenAI-compatible URLs separately from Gemini native URLs', () => {
    expect(
      detectApiKindFromUrl('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'),
    ).toBe('openai_compatible')
    expect(detectApiKindFromUrl('https://generativelanguage.googleapis.com/v1beta/models')).toBe('gemini')
    expect(detectApiKindFromUrl('https://api.openai.com/v1/responses')).toBe('openai_responses')
    expect(detectApiKindFromUrl('https://api.anthropic.com/v1/messages')).toBe('anthropic')
    expect(
      detectApiKindFromUrl(
        'https://demo.openai.azure.com/openai/deployments/main/chat/completions?api-version=2024-10-21',
      ),
    ).toBe('azure_openai')
    expect(
      detectApiKindFromUrl(
        'https://demo.openai.azure.com/openai/deployments/main/responses?api-version=preview',
      ),
    ).toBe('azure_openai_responses')
  })

  test('only requires API keys for official provider endpoints', () => {
    expect(requiresApiKeyForUrl('https://api.openai.com/v1')).toBe(true)
    expect(requiresApiKeyForUrl('https://generativelanguage.googleapis.com/v1beta/models')).toBe(true)
    expect(requiresApiKeyForUrl('https://api.anthropic.com/v1/messages')).toBe(true)
    expect(requiresApiKeyForUrl('https://demo.openai.azure.com/openai/deployments/main/chat/completions')).toBe(true)
    expect(requiresApiKeyForUrl('http://localhost:11434/v1')).toBe(false)
    expect(requiresApiKeyForUrl('https://gateway.example.com/v1')).toBe(false)
  })

  test('normalizes transport mode and resolves deployment-aware proxy bases', () => {
    expect(normalizeAiTransportMode('proxy')).toBe('proxy')
    expect(normalizeAiTransportMode('unexpected')).toBe('direct')
    expect(resolveAiProxyBaseUrl({}, 'https://schatphone.vercel.app/#/network')).toBe(
      'https://schatphone.vercel.app/api/openai/v1',
    )
    expect(resolveAiProxyBaseUrl({}, 'https://schatphone.noarry.workers.dev/#/network')).toBe(
      'https://schatphone.noarry.workers.dev/api/openai/v1',
    )
    expect(resolveAiProxyBaseUrl({}, 'https://shawnoarry.github.io/schatphone/#/network')).toBe(
      'https://schatphone.noarry.workers.dev/api/openai/v1',
    )
  })

  test('builds explicit proxy requests without replacing the user provider URL', () => {
    const result = buildOpenAiTransportRequest({
      settings: {
        api: {
          url: 'https://gateway.provider.com/v1/chat/completions',
          transportMode: 'proxy',
          proxyUrl: 'https://relay.example.net/api/openai/v1',
          proxyToken: 'relay-access-token',
        },
      },
      route: 'models',
      directUrl: 'https://gateway.provider.com/v1/models',
      headers: { Authorization: 'Bearer user-key' },
    })

    expect(result).toEqual({
      url: 'https://relay.example.net/api/openai/v1/models',
      headers: {
        Authorization: 'Bearer user-key',
        'X-SchatPhone-Proxy-Token': 'relay-access-token',
        'X-SchatPhone-Upstream-URL': 'https://gateway.provider.com/v1/chat/completions',
      },
    })
  })

  test('loads models from local Ollama-style URLs without Authorization header', async () => {
    const result = await fetchAvailableModels({
      settings: {
        api: {
          url: 'http://localhost:11434/api/tags',
          key: '',
        },
      },
    })

    expect(result).toEqual({
      kind: 'openai_compatible',
      models: ['local-model'],
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:11434/v1/models')
    expect(fetch.mock.calls[0][1].headers).toEqual({})
  })

  test('loads OpenAI-compatible models through the selected compatibility proxy', async () => {
    const result = await fetchAvailableModels({
      settings: {
        api: {
          url: 'https://gateway.provider.com/v1/chat/completions',
          key: 'user-key',
          transportMode: 'proxy',
          proxyUrl: 'https://relay.example.net/api/openai/v1',
          proxyToken: 'relay-access-token',
        },
      },
    })

    expect(result.models).toEqual(['local-model'])
    expect(fetch.mock.calls[0][0]).toBe('https://relay.example.net/api/openai/v1/models')
    expect(fetch.mock.calls[0][1].headers).toEqual({
      Authorization: 'Bearer user-key',
      'X-SchatPhone-Proxy-Token': 'relay-access-token',
      'X-SchatPhone-Upstream-URL': 'https://gateway.provider.com/v1/chat/completions',
    })
  })

  test('loads Anthropic models and Azure deployments with native auth headers', async () => {
    await fetchAvailableModels({
      settings: {
        api: {
          url: 'https://api.anthropic.com/v1/messages',
          key: 'anthropic-key',
        },
      },
    })
    await fetchAvailableModels({
      settings: {
        api: {
          url: 'https://demo.openai.azure.com/openai/deployments/main/responses?api-version=preview',
          key: 'azure-key',
        },
      },
    })

    expect(fetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/models')
    expect(fetch.mock.calls[0][1].headers).toEqual({
      'anthropic-version': '2023-06-01',
      'x-api-key': 'anthropic-key',
    })
    expect(fetch.mock.calls[1][0]).toBe('https://demo.openai.azure.com/openai/deployments?api-version=preview')
    expect(fetch.mock.calls[1][1].headers).toEqual({
      'api-key': 'azure-key',
    })
  })

  test('normalizes local base URLs to chat completions for calls', async () => {
    await callAI({
      messages: [{ role: 'user', content: 'ping' }],
      systemPrompt: 'Return OK',
      settings: {
        api: {
          url: 'http://127.0.0.1:1234/v1',
          key: '',
          model: 'local-model',
        },
      },
    })

    expect(fetch.mock.calls[0][0]).toBe('http://127.0.0.1:1234/v1/chat/completions')
    expect(fetch.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
    })
  })

  test('routes OpenAI-compatible chat through the selected proxy', async () => {
    await callAI({
      messages: [{ role: 'user', content: 'ping' }],
      systemPrompt: 'Return OK',
      settings: {
        api: {
          url: 'https://gateway.provider.com/v1',
          key: 'user-key',
          model: 'provider-model',
          transportMode: 'proxy',
          proxyUrl: 'https://relay.example.net/api/openai/v1',
        },
      },
    })

    expect(fetch.mock.calls[0][0]).toBe(
      'https://relay.example.net/api/openai/v1/chat/completions',
    )
    expect(fetch.mock.calls[0][1].headers).toEqual({
      Authorization: 'Bearer user-key',
      'Content-Type': 'application/json',
      'X-SchatPhone-Upstream-URL': 'https://gateway.provider.com/v1',
    })
  })

  test('normalizes browser-specific transport errors after an external abort', async () => {
    const controller = new AbortController()
    fetch.mockImplementationOnce(
      async (_url, options) =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('signal is aborted without reason', 'AbortError'))
          })
        }),
    )

    const request = callAI({
      messages: [{ role: 'user', content: 'cancel this request' }],
      systemPrompt: 'Return OK',
      settings: {
        api: {
          url: 'https://gateway.example.com/v1/chat/completions',
          key: '',
          model: 'gateway-model',
        },
      },
      signal: controller.signal,
    })

    controller.abort()

    await expect(request).rejects.toMatchObject({ code: 'CANCELED' })
  })

  test('rejects native provider protocols in compatibility proxy mode', async () => {
    await expect(
      callAI({
        messages: [{ role: 'user', content: 'ping' }],
        systemPrompt: 'Return OK',
        settings: {
          api: {
            url: 'https://api.anthropic.com/v1/messages',
            key: 'anthropic-key',
            model: 'claude-test',
            transportMode: 'proxy',
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'PROXY_UNSUPPORTED_PROVIDER' })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('uses the native Responses API for Responses URLs', async () => {
    await callAI({
      messages: [{ role: 'user', content: 'ping' }],
      systemPrompt: 'Return OK',
      settings: {
        api: {
          url: 'https://gateway.example.com/v1/responses',
          key: '',
          model: 'gateway-model',
        },
      },
    })

    expect(fetch.mock.calls[0][0]).toBe('https://gateway.example.com/v1/responses')
    expect(fetch.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      model: 'gateway-model',
      input: [
        { role: 'system', content: 'Return OK' },
        { role: 'user', content: 'ping' },
      ],
    })
  })

  test('uses Anthropic Messages headers and response parsing', async () => {
    const reply = await callAI({
      messages: [{ role: 'user', content: 'ping' }],
      systemPrompt: 'Return OK',
      settings: {
        api: {
          url: 'https://api.anthropic.com/v1',
          key: 'anthropic-key',
          model: 'claude-test',
        },
      },
    })

    expect(reply).toBe('OK from Anthropic')
    expect(fetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages')
    expect(fetch.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': 'anthropic-key',
    })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      model: 'claude-test',
      system: 'Return OK',
      messages: [{ role: 'user', content: 'ping' }],
    })
  })

  test('uses Azure OpenAI deployment URLs and api-key auth', async () => {
    const reply = await callAI({
      messages: [{ role: 'user', content: 'ping' }],
      systemPrompt: 'Return OK',
      settings: {
        api: {
          url: 'https://demo.openai.azure.com/openai/deployments/main/chat/completions?api-version=2024-10-21',
          key: 'azure-key',
          model: 'ignored-for-azure-deployment',
        },
      },
    })

    expect(reply).toBe('OK')
    expect(fetch.mock.calls[0][0]).toBe(
      'https://demo.openai.azure.com/openai/deployments/main/chat/completions?api-version=2024-10-21',
    )
    expect(fetch.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      'api-key': 'azure-key',
    })
  })

  test('uses explicit prompt caching only for official OpenAI GPT-5.6 chat requests', async () => {
    fetch.mockResolvedValueOnce(
      createJsonResponse({
        choices: [{ message: { content: 'cached reply' } }],
        usage: {
          prompt_tokens: 1400,
          completion_tokens: 20,
          total_tokens: 1420,
          prompt_tokens_details: {
            cached_tokens: 1024,
            cache_write_tokens: 0,
          },
        },
      }),
    )
    const contextEnvelope = {
      stablePrefix: 'stable role and world rules',
      dynamicContext: 'current relationship state',
      cache: { key: 'schatphone:chat:v1:id-a1b2c3d4' },
    }

    const result = await callAI({
      messages: [{ role: 'user', content: 'ping' }],
      systemPrompt: 'legacy combined prompt',
      contextEnvelope,
      settings: {
        api: {
          url: 'https://api.openai.com/v1/chat/completions',
          key: 'openai-key',
          model: 'gpt-5.6-chat-latest',
        },
      },
      withMeta: true,
    })

    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.prompt_cache_key).toBe('schatphone:chat:v1:id-a1b2c3d4')
    expect(body.prompt_cache_options).toEqual({ mode: 'explicit' })
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: [
        {
          type: 'text',
          text: 'stable role and world rules',
          prompt_cache_breakpoint: { mode: 'explicit' },
        },
        { type: 'text', text: 'current relationship state' },
      ],
    })
    expect(result).toMatchObject({
      text: 'cached reply',
      meta: {
        usage: {
          inputTokens: 1400,
          outputTokens: 20,
          totalTokens: 1420,
          cachedTokens: 1024,
          cacheWriteTokens: 0,
        },
        promptCache: {
          requested: true,
          strategy: 'explicit',
          keyApplied: true,
          breakpointApplied: true,
          hit: true,
        },
      },
    })
  })

  test('keeps absent usage fields unknown instead of reporting zero tokens', async () => {
    const result = await callAI({
      messages: [{ role: 'user', content: 'ping' }],
      systemPrompt: 'Return OK',
      settings: {
        api: {
          url: 'https://gateway.example.com/v1/chat/completions',
          key: '',
          model: 'gateway-model',
        },
      },
      withMeta: true,
    })

    expect(result.meta.usage).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      cachedTokens: null,
      cacheWriteTokens: null,
    })
    expect(result.meta.promptCache.hit).toBeNull()
    expect(result.meta.promptCache.strategy).toBe('unmanaged')
  })

  test('does not report an unmanaged compatible-provider cache hit', async () => {
    fetch.mockResolvedValueOnce(
      createJsonResponse({
        choices: [{ message: { content: 'provider reply' } }],
        usage: {
          prompt_tokens: 1200,
          completion_tokens: 10,
          total_tokens: 1210,
          prompt_tokens_details: { cached_tokens: 1024 },
        },
      }),
    )

    const result = await callAI({
      messages: [{ role: 'user', content: 'ping' }],
      systemPrompt: 'legacy prompt',
      settings: {
        api: {
          url: 'https://gateway.example.com/v1/chat/completions',
          key: '',
          model: 'gateway-model',
        },
      },
      withMeta: true,
    })

    expect(result.meta.usage.cachedTokens).toBe(1024)
    expect(result.meta.promptCache).toMatchObject({
      requested: false,
      strategy: 'unmanaged',
      hit: null,
    })
  })

  test('uses automatic cache keys for older official models without explicit fields', async () => {
    await callAI({
      messages: [{ role: 'user', content: 'ping' }],
      systemPrompt: 'legacy prompt',
      contextEnvelope: {
        stablePrefix: 'stable prefix',
        dynamicContext: 'dynamic tail',
        cache: { key: 'schatphone:chat:v1:id-b1c2d3e4' },
      },
      settings: {
        api: {
          url: 'https://api.openai.com/v1/chat/completions',
          key: 'openai-key',
          model: 'gpt-5.5',
        },
      },
    })

    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.prompt_cache_key).toBe('schatphone:chat:v1:id-b1c2d3e4')
    expect(body.prompt_cache_options).toBeUndefined()
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: 'stable prefix\n\ndynamic tail',
    })
  })

  test('keeps cache fields away from third-party OpenAI-compatible endpoints', async () => {
    await callAI({
      messages: [{ role: 'user', content: 'ping' }],
      systemPrompt: 'legacy prompt',
      contextEnvelope: {
        stablePrefix: 'stable prefix',
        dynamicContext: 'dynamic tail',
        cache: { key: 'schatphone:chat:v1:id-b1c2d3e4' },
      },
      settings: {
        api: {
          url: 'https://gateway.example.com/v1/chat/completions',
          key: '',
          model: 'gpt-5.6-chat-latest',
        },
      },
    })

    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.prompt_cache_key).toBeUndefined()
    expect(body.prompt_cache_options).toBeUndefined()
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: 'stable prefix\n\ndynamic tail',
    })
  })

  test('falls back from native image input without leaking URLs or asset ids into text cues', async () => {
    fetch
      .mockResolvedValueOnce(createJsonResponse({ error: { message: 'unsupported image' } }, 415))
      .mockResolvedValueOnce(
        createJsonResponse({ choices: [{ message: { content: 'natural reply' } }] }),
      )

    const result = await callAI({
      messages: [{ role: 'user', content: 'Look at this.' }],
      systemPrompt: 'Reply naturally.',
      settings: {
        api: {
          url: 'https://api.openai.com/v1/chat/completions',
          key: 'openai-key',
          model: 'gpt-test',
        },
      },
      imageReferences: [
        {
          label: 'Rainy street',
          note: 'Neon reflections',
          sourceUrl: 'https://private.example.test/image.png',
          assetId: 'gallery_secret_42',
        },
      ],
      withMeta: true,
    })

    expect(fetch).toHaveBeenCalledTimes(2)
    const nativeBody = JSON.parse(fetch.mock.calls[0][1].body)
    const fallbackBody = JSON.parse(fetch.mock.calls[1][1].body)
    expect(nativeBody.messages[1].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'image_url',
          image_url: { url: 'https://private.example.test/image.png' },
        }),
      ]),
    )
    expect(fallbackBody.messages[1].content).toContain('Rainy street')
    expect(fallbackBody.messages[1].content).toContain('Neon reflections')
    expect(fallbackBody.messages[1].content).not.toContain('private.example.test')
    expect(fallbackBody.messages[1].content).not.toContain('gallery_secret_42')
    expect(result).toMatchObject({
      text: 'natural reply',
      meta: {
        nativeAttempted: true,
        fallbackUsed: true,
        finalTransportMode: 'context_only',
      },
    })
  })

  test('uses safe text cues directly for unknown compatible providers', async () => {
    await callAI({
      messages: [{ role: 'user', content: 'Look at this.' }],
      systemPrompt: 'Reply naturally.',
      settings: {
        api: {
          url: 'https://gateway.example.com/v1/chat/completions',
          key: '',
          model: 'gateway-model',
        },
      },
      imageReferences: [
        {
          label: 'Concert photo',
          note: 'Shared after the show',
          sourceUrl: 'https://private.example.test/concert.png',
          assetId: 'concert_asset',
        },
      ],
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(typeof body.messages[1].content).toBe('string')
    expect(body.messages[1].content).toContain('Concert photo')
    expect(body.messages[1].content).not.toContain('private.example.test')
    expect(body.messages[1].content).not.toContain('concert_asset')
  })

  test('honors an explicit native-image preference on a compatible endpoint with safe fallback available', async () => {
    await callAI({
      messages: [{ role: 'user', content: 'Look at this.' }],
      systemPrompt: 'Reply naturally.',
      settings: {
        api: {
          url: 'https://gateway.example.com/v1/chat/completions',
          key: '',
          model: 'gateway-model',
        },
      },
      imageReferences: [
        {
          label: 'Concert photo',
          sourceUrl: 'https://images.example.test/concert.png',
        },
      ],
      imageReferenceMode: 'native_url',
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.messages[1].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'image_url',
          image_url: { url: 'https://images.example.test/concert.png' },
        }),
      ]),
    )
  })

  test('uses Responses input_text blocks and reports provider cache usage', async () => {
    fetch.mockResolvedValueOnce(
      createJsonResponse({
        output_text: 'response text',
        usage: {
          input_tokens: 1200,
          output_tokens: 30,
          total_tokens: 1230,
          input_tokens_details: {
            cached_tokens: 0,
            cache_write_tokens: 1024,
          },
        },
      }),
    )

    const result = await callAI({
      messages: [{ role: 'user', content: 'ping' }],
      systemPrompt: 'legacy prompt',
      contextEnvelope: {
        stablePrefix: 'stable prefix',
        dynamicContext: 'dynamic tail',
        cache: { key: 'schatphone:event-text:v1:id-c1d2e3f4' },
      },
      settings: {
        api: {
          url: 'https://api.openai.com/v1/responses',
          key: 'openai-key',
          model: 'gpt-5.6',
        },
      },
      withMeta: true,
    })

    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.input[0]).toEqual({
      role: 'system',
      content: [
        {
          type: 'input_text',
          text: 'stable prefix',
          prompt_cache_breakpoint: { mode: 'explicit' },
        },
        { type: 'input_text', text: 'dynamic tail' },
      ],
    })
    expect(result.meta.usage).toMatchObject({
      cachedTokens: 0,
      cacheWriteTokens: 1024,
    })
    expect(result.meta.promptCache.hit).toBe(false)
  })
})
