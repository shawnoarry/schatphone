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
})
