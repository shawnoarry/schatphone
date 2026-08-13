import { expect } from '@playwright/test'

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeHashPath = (hashPath) => {
  const withoutHash = hashPath.startsWith('#') ? hashPath.slice(1) : hashPath
  return withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`
}

const routePathFromHash = (hashPath) => normalizeHashPath(hashPath).split('?')[0]

const routeScopeFromPath = (routePath) => {
  const firstSegment = routePath.split('/').filter(Boolean)[0] || 'root'
  return firstSegment.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase()
}

const routeReadySelectors = {
  '/app-store': '[data-testid="app-store-search"]',
  '/camera': '[data-testid="camera-view"]',
  '/chat-contacts': '[data-testid="chat-directory-section-service"]',
  '/contacts': '[data-testid="contacts-search-input"]',
  '/food-delivery':
    '[data-testid="food-delivery-platform"], [data-testid="food-delivery-store-shell"]',
  '/map': '[data-testid="map-scene-surface"], [data-testid="map-scene-leaflet"]',
  '/map/settings': '[data-testid="map-settings-view"]',
  '/map/settings/places': '[data-testid="map-pin-settings-view"]',
  '/music': '[data-testid="music-app"]',
  '/phone': '[data-testid="phone-call-list"], [data-testid="phone-empty-state"]',
  '/settings': '[data-settings-menu-title="World Book"]',
  '/shopping': '.shopping-storefront-header',
  '/widgets': '.widgets-shell',
  '/worldbook': '[data-testid="worldbook-overview"]',
}

export const waitForHashRoute = async (page, hashPath) => {
  const normalizedPath = normalizeHashPath(hashPath)
  const routePath = routePathFromHash(normalizedPath)
  const expectedHash = `#${normalizedPath}`
  const shouldMatchExact = normalizedPath.includes('?')

  await page.waitForFunction(
    ({ expectedHash, routePath, shouldMatchExact }) => {
      if (routePath === '/shopping') return /^#\/shopping\/[^/?#]+(?:\?|$)/.test(window.location.hash)
      if (shouldMatchExact) return window.location.hash === expectedHash
      return window.location.hash === `#${routePath}` || window.location.hash.startsWith(`#${routePath}?`)
    },
    { expectedHash, routePath, shouldMatchExact },
    { timeout: 15000 },
  )

  const routePattern = routePath === '/shopping'
    ? '#/shopping/[^/?#]+(?:\\?|$)'
    : `#${escapeRegExp(routePath)}(?:\\?|$)`
  await expect(page).toHaveURL(new RegExp(routePattern), {
    timeout: 15000,
  })
}

export const waitForAppRouteReady = async (page, hashPath) => {
  await waitForHashRoute(page, hashPath)
  const routePath = routePathFromHash(hashPath)
  const routeScope = routeScopeFromPath(routePath)
  await expect(page.locator(`.app-shell[data-route-scope="${routeScope}"]`)).toBeVisible({
    timeout: 15000,
  })

  const readySelector = routeReadySelectors[routePath]
  if (readySelector) {
    await expect(page.locator(readySelector).first()).toBeVisible({ timeout: 15000 })
  }
}

export const expectHomeReady = async (page) => {
  await waitForAppRouteReady(page, '/home')
  await expect(page.locator('.home-dock')).toBeVisible()
  await expect(page.getByTestId('home-dock-icon-app_chat')).toBeVisible()
}

export const unlockToHome = async (page, lockUrl = '/#/lock') => {
  await page.goto(lockUrl)
  const englishUnlockButton = page.getByRole('button', { name: /Unlock to Home/ })
  if (await englishUnlockButton.isVisible()) {
    await englishUnlockButton.click()
  } else {
    await page.locator('.lock-unlock-button').click()
  }
  await expectHomeReady(page)
}

export const navigateInsideUnlockedApp = async (page, hashPath) => {
  const normalizedPath = normalizeHashPath(hashPath)
  await page.evaluate((target) => {
    const nextHash = `#${target}`
    if (window.location.hash !== nextHash) {
      window.location.hash = target
      return
    }
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: window.location.href, newURL: window.location.href }))
  }, normalizedPath)
  await waitForAppRouteReady(page, normalizedPath)
}

export const returnToHome = async (page) => {
  await navigateInsideUnlockedApp(page, '/home')
  await expectHomeReady(page)
}

export const openHomeDockApp = async (page, appId, routePath) => {
  if (appId === 'app_widgets') {
    await page.getByTestId('home-dock-widgets').click()
  } else {
    await page
      .locator('.home-dock-icon')
      .filter({ has: page.getByTestId(`home-dock-icon-${appId}`) })
      .click()
  }

  await waitForAppRouteReady(page, routePath)
}
