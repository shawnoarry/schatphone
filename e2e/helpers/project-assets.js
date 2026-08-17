import { projectUiAssetUrl } from '../../src/lib/project-assets.js'

const PROJECT_ASSET_PREFIX = 'https://cloudflare-imgbed-7z3.pages.dev/file/schatphone-assets/'
const DEFAULT_ATTEMPTS = 5
const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_CONCURRENCY = 2
const assetCache = new Map()
const assetInflightByRequest = new WeakMap()
const assetQueue = []
let activeAssetRequests = 0

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const isRetryableStatus = (status) => status === 408 || status === 425 || status === 429 || status >= 500

const headersForFulfillment = (headers = {}) =>
  Object.fromEntries(
    Object.entries(headers).filter(
      ([key]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(key),
    ),
  )

const makeFailure = (url, attempt, error) => {
  const detail = error instanceof Error ? error.message : String(error || 'unknown error')
  return new Error(`Project asset request failed after ${attempt} attempt(s): ${url} (${detail})`)
}

const drainAssetQueue = () => {
  while (activeAssetRequests < DEFAULT_CONCURRENCY && assetQueue.length > 0) {
    const { task, resolve, reject } = assetQueue.shift()
    activeAssetRequests += 1
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        activeAssetRequests -= 1
        drainAssetQueue()
      })
  }
}

const withAssetSlot = (task) =>
  new Promise((resolve, reject) => {
    assetQueue.push({ task, resolve, reject })
    drainAssetQueue()
  })

const inflightForRequest = (request) => {
  let inflight = assetInflightByRequest.get(request)
  if (!inflight) {
    inflight = new Map()
    assetInflightByRequest.set(request, inflight)
  }
  return inflight
}

export const fetchProjectAsset = async (
  request,
  url,
  { attempts = DEFAULT_ATTEMPTS, timeout = DEFAULT_TIMEOUT_MS } = {},
) => {
  const cached = assetCache.get(url)
  if (cached) return cached

  const inflight = inflightForRequest(request)
  const currentRequest = inflight.get(url)
  if (currentRequest) return currentRequest

  const requestPromise = withAssetSlot(async () => {
    let lastError = null
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await request.get(url, {
          failOnStatusCode: false,
          timeout,
        })
        const body = await response.body()
        const result = {
          status: response.status(),
          headers: headersForFulfillment(response.headers()),
          body,
        }

        if (response.ok()) {
          assetCache.set(url, result)
          return result
        }

        if (!isRetryableStatus(response.status()) || attempt === attempts) return result
        lastError = new Error(`HTTP ${response.status()}`)
      } catch (error) {
        lastError = error
        if (attempt === attempts) break
      }

      await wait(400 * attempt)
    }

    throw makeFailure(url, attempts, lastError)
  })

  inflight.set(url, requestPromise)
  try {
    return await requestPromise
  } finally {
    if (inflight.get(url) === requestPromise) inflight.delete(url)
  }
}

export const prewarmProjectAssets = async (request, urls, options = {}) => {
  const uniqueUrls = [...new Set((Array.isArray(urls) ? urls : []).filter(Boolean))]
  const results = await Promise.allSettled(
    uniqueUrls.map((url) => fetchProjectAsset(request, url, options)),
  )
  const rejected = results.find((result) => result.status === 'rejected')
  if (rejected) throw rejected.reason
  return results.map((result) => result.value)
}

const requiredAssetUrl = (assetPath) => {
  const normalizedPath = String(assetPath || '').trim()
  if (!normalizedPath) return ''
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath
  if (normalizedPath.startsWith('apps/')) return projectUiAssetUrl(normalizedPath)
  return projectUiAssetUrl(`apps/food-delivery/${normalizedPath}`)
}

export const prewarmRequiredProjectAssets = async (page, options = {}) => {
  const assetPaths = await page.locator('[data-required-asset]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-required-asset')).filter(Boolean),
  )
  const urls = assetPaths.map(requiredAssetUrl).filter(Boolean)
  return prewarmProjectAssets(page.request, urls, options)
}

export const installProjectAssetRoute = async (
  page,
  { attempts = DEFAULT_ATTEMPTS, timeout = DEFAULT_TIMEOUT_MS } = {},
) => {
  await page.route(`${PROJECT_ASSET_PREFIX}**`, async (route) => {
    const url = route.request().url()
    try {
      const result = await fetchProjectAsset(page.request, url, { attempts, timeout })
      await route.fulfill(result)
    } catch {
      await route.abort('failed')
    }
  })
}
