import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  callAI,
  detectApiKindFromUrl,
  fetchAvailableModels,
  requiresApiKeyForUrl,
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
})
