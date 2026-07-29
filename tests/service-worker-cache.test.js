import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, test, vi } from 'vitest'

const SERVICE_WORKER_SOURCE = readFileSync(resolve('public/service-worker.js'), 'utf8')

const createServiceWorkerHarness = () => {
  const listeners = {}
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  }
  const caches = {
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(null),
    open: vi.fn().mockResolvedValue(cache),
  }
  const fetch = vi.fn().mockResolvedValue({
    clone: () => ({ ok: true }),
    ok: true,
  })
  const self = {
    addEventListener: (type, handler) => {
      listeners[type] = handler
    },
    clients: {
      claim: vi.fn().mockResolvedValue(undefined),
      matchAll: vi.fn().mockResolvedValue([]),
      openWindow: vi.fn().mockResolvedValue(undefined),
    },
    location: { origin: 'http://localhost' },
    registration: {
      scope: 'http://localhost/schatphone/',
      showNotification: vi.fn().mockResolvedValue(undefined),
    },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
  }

  runInNewContext(SERVICE_WORKER_SOURCE, {
    Date,
    Promise,
    URL,
    caches,
    fetch,
    self,
  })

  return { cache, caches, fetch, listeners }
}

describe('service worker cache policy', () => {
  test('leaves Vite development modules on the network path', () => {
    const { caches, listeners } = createServiceWorkerHarness()
    const respondWith = vi.fn()

    listeners.fetch({
      request: {
        destination: 'script',
        method: 'GET',
        mode: 'cors',
        url: 'http://localhost/schatphone/src/stores/foodDelivery.js',
      },
      respondWith,
    })

    expect(respondWith).not.toHaveBeenCalled()
    expect(caches.match).not.toHaveBeenCalled()
  })

  test('keeps cache-first behavior for production build assets', () => {
    const { caches, listeners } = createServiceWorkerHarness()
    const respondWith = vi.fn()

    listeners.fetch({
      request: {
        destination: 'script',
        method: 'GET',
        mode: 'cors',
        url: 'http://localhost/schatphone/assets/index-a1b2c3.js',
      },
      respondWith,
    })

    expect(respondWith).toHaveBeenCalledTimes(1)
    expect(caches.match).toHaveBeenCalledTimes(1)
  })

  test('refreshes app images from the network before using the offline cache', async () => {
    const { cache, caches, fetch, listeners } = createServiceWorkerHarness()
    let responsePromise

    listeners.fetch({
      request: {
        destination: 'image',
        method: 'GET',
        mode: 'no-cors',
        url: 'http://localhost/schatphone/images/ui-assets/apps/food-delivery/verdant-day/item.png',
      },
      respondWith: (promise) => {
        responsePromise = promise
      },
    })
    await responsePromise
    await Promise.resolve()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(caches.match).not.toHaveBeenCalled()
    expect(cache.put).toHaveBeenCalledTimes(1)
  })

  test('removes prior SchatPhone caches when the worker activates', async () => {
    const { caches, listeners } = createServiceWorkerHarness()
    caches.keys.mockResolvedValue([
      'schatphone-pwa-v2-runtime',
      'schatphone-pwa-v3-runtime',
      'unrelated-cache',
    ])
    let activation

    listeners.activate({
      waitUntil: (promise) => {
        activation = promise
      },
    })
    await activation

    expect(caches.delete).toHaveBeenCalledTimes(2)
    expect(caches.delete).toHaveBeenCalledWith('schatphone-pwa-v2-runtime')
    expect(caches.delete).toHaveBeenCalledWith('schatphone-pwa-v3-runtime')
  })
})
