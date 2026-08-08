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
})
