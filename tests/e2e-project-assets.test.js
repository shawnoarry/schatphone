import { describe, expect, test, vi } from 'vitest'
import {
  fetchProjectAsset,
  installProjectAssetRoute,
} from '../e2e/helpers/project-assets.js'

const createResponse = ({ status = 200, body = Buffer.from('asset') } = {}) => ({
  status: () => status,
  headers: () => ({
    'content-type': status === 200 ? 'image/webp' : 'text/html',
    'content-length': String(body.length),
  }),
  body: async () => body,
  ok: () => status >= 200 && status < 300,
})

const installRouteHandler = async (request) => {
  let handler = null
  const page = {
    request,
    route: vi.fn(async (_pattern, routeHandler) => {
      handler = routeHandler
    }),
  }
  await installProjectAssetRoute(page)
  return handler
}

describe('E2E project asset routing', () => {
  test('rejects a retryable response when the final attempt is exhausted', async () => {
    const url = 'https://cloudflare-imgbed-7z3.pages.dev/file/schatphone-assets/test/final-500.webp'
    const request = {
      get: vi.fn(async () => createResponse({ status: 500, body: Buffer.from('upstream error') })),
    }

    await expect(fetchProjectAsset(request, url, { attempts: 1 })).rejects.toThrow(
      `Project asset request failed after 1 attempt(s): ${url} (HTTP 500)`,
    )
    expect(request.get).toHaveBeenCalledTimes(1)
  })

  test('lets the browser request an asset that was not explicitly prewarmed', async () => {
    const request = { get: vi.fn() }
    const handler = await installRouteHandler(request)
    const route = {
      request: () => ({
        url: () => 'https://cloudflare-imgbed-7z3.pages.dev/file/schatphone-assets/test/unrelated.webp',
      }),
      continue: vi.fn(async () => {}),
      fulfill: vi.fn(async () => {}),
    }

    await handler(route)

    expect(route.continue).toHaveBeenCalledTimes(1)
    expect(route.fulfill).not.toHaveBeenCalled()
    expect(request.get).not.toHaveBeenCalled()
  })

  test('fulfills a prewarmed asset from the successful in-memory response', async () => {
    const url = 'https://cloudflare-imgbed-7z3.pages.dev/file/schatphone-assets/test/prewarmed.webp'
    const response = createResponse({ body: Buffer.from('stable image') })
    const request = { get: vi.fn(async () => response) }
    await fetchProjectAsset(request, url, { attempts: 1 })
    const handler = await installRouteHandler(request)
    const route = {
      request: () => ({ url: () => url }),
      continue: vi.fn(async () => {}),
      fulfill: vi.fn(async () => {}),
    }

    await handler(route)

    expect(route.fulfill).toHaveBeenCalledWith({
      status: 200,
      headers: {
        'content-type': 'image/webp',
      },
      body: Buffer.from('stable image'),
    })
    expect(route.continue).not.toHaveBeenCalled()
    expect(request.get).toHaveBeenCalledTimes(1)
  })
})
