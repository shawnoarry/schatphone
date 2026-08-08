import { describe, expect, test, vi } from 'vitest'
import { handleVercelAiProxyRequest, resolveProxyUpstreamUrl } from '../server/vercel-ai-proxy.mjs'

const baseEnv = {
  SCHATPHONE_AI_PROXY_UPSTREAM_URL: 'https://provider.example/v1/chat/completions',
  SCHATPHONE_AI_PROXY_UPSTREAM_KEY: 'upstream-secret',
  SCHATPHONE_AI_PROXY_CLIENT_TOKEN: 'client-secret',
  SCHATPHONE_AI_PROXY_ALLOWED_ORIGINS: 'http://localhost:5173',
}

const request = ({
  method = 'POST',
  origin = 'https://preview.vercel.app',
  token = 'client-secret',
  body,
} = {}) => ({
  method,
  headers: {
    authorization: token ? `Bearer ${token}` : '',
    host: 'preview.vercel.app',
    origin,
    'x-forwarded-proto': 'https',
  },
  body,
})

describe('Vercel AI proxy', () => {
  test('derives fixed OpenAI-compatible chat and model endpoints', () => {
    expect(resolveProxyUpstreamUrl('https://provider.example/v1', 'chat')?.toString()).toBe(
      'https://provider.example/v1/chat/completions',
    )
    expect(
      resolveProxyUpstreamUrl('https://provider.example/v1/chat/completions', 'models')?.toString(),
    ).toBe('https://provider.example/v1/models')
    expect(resolveProxyUpstreamUrl('http://provider.example/v1', 'chat')).toBeNull()
  })

  test('answers an allowed preflight without requiring credentials', async () => {
    const response = await handleVercelAiProxyRequest(
      request({ method: 'OPTIONS', origin: 'http://localhost:5173', token: '' }),
      { route: 'chat', env: baseEnv },
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })

  test('rejects unknown browser origins and invalid client tokens', async () => {
    const badOrigin = await handleVercelAiProxyRequest(
      request({ origin: 'https://attacker.example' }),
      { route: 'chat', env: baseEnv },
    )
    const badToken = await handleVercelAiProxyRequest(request({ token: 'wrong', body: '{}' }), {
      route: 'chat',
      env: baseEnv,
    })

    expect(badOrigin.status).toBe(403)
    expect(await badOrigin.json()).toMatchObject({ code: 'ORIGIN_NOT_ALLOWED' })
    expect(badToken.status).toBe(401)
    expect(await badToken.json()).toMatchObject({ code: 'UNAUTHORIZED' })
  })

  test('fails closed when proxy secrets or upstream settings are missing', async () => {
    const missingClient = await handleVercelAiProxyRequest(request({ body: '{}' }), {
      route: 'chat',
      env: {},
    })
    const missingUpstreamKey = await handleVercelAiProxyRequest(request({ body: '{}' }), {
      route: 'chat',
      env: {
        SCHATPHONE_AI_PROXY_CLIENT_TOKEN: 'client-secret',
        SCHATPHONE_AI_PROXY_UPSTREAM_URL: 'https://provider.example/v1',
      },
    })

    expect(missingClient.status).toBe(503)
    expect(await missingClient.json()).toMatchObject({ code: 'PROXY_NOT_CONFIGURED' })
    expect(missingUpstreamKey.status).toBe(503)
    expect(await missingUpstreamKey.json()).toMatchObject({ code: 'UPSTREAM_KEY_NOT_CONFIGURED' })
  })

  test('forwards models with only the server-side upstream credential', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: [{ id: 'model-a' }] }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    const response = await handleVercelAiProxyRequest(request({ method: 'GET' }), {
      route: 'models',
      env: baseEnv,
      fetchImpl,
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: [{ id: 'model-a' }] })
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL('https://provider.example/v1/models'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer upstream-secret' }),
      }),
    )
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('client-secret')
  })

  test('forwards chat JSON and preserves a streamed provider response', async () => {
    const encoder = new TextEncoder()
    const fetchImpl = vi.fn(async (_url, options) => {
      expect(JSON.parse(options.body)).toMatchObject({ model: 'model-a' })
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('{"choices":['))
            controller.enqueue(encoder.encode('{"message":{"content":"OK"}}]}'))
            controller.close()
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    })
    const response = await handleVercelAiProxyRequest(
      request({ body: JSON.stringify({ model: 'model-a', messages: [] }) }),
      { route: 'chat', env: baseEnv, fetchImpl },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ choices: [{ message: { content: 'OK' } }] })
  })

  test('forwards a native Request body instead of serializing its stream as an object', async () => {
    const payload = { model: 'model-a', messages: [{ role: 'user', content: 'Hello' }] }
    const fetchImpl = vi.fn(async (_url, options) => {
      expect(JSON.parse(new TextDecoder().decode(options.body))).toEqual(payload)
      return new Response('data: done\n\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    })
    const nativeRequest = new Request('https://schatphone.example/api/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer client-secret',
        'Content-Type': 'application/json',
        Origin: 'https://schatphone.example',
      },
      body: JSON.stringify(payload),
    })

    const response = await handleVercelAiProxyRequest(nativeRequest, {
      route: 'chat',
      env: baseEnv,
      fetchImpl,
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream')
    expect(await response.text()).toBe('data: done\n\n')
  })

  test('redacts upstream network failures', async () => {
    const response = await handleVercelAiProxyRequest(request({ body: '{}' }), {
      route: 'chat',
      env: baseEnv,
      fetchImpl: vi.fn(async () => {
        throw new Error('secret provider diagnostic')
      }),
    })

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ ok: false, code: 'UPSTREAM_UNAVAILABLE' })
  })
})
