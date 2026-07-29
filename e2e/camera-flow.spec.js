import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome, waitForAppRouteReady } from './helpers/navigation.js'

const providerId = 'image_provider_ljqclub'
const deviceSecret = 'camera-device-only-secret'

const seedCameraState = async (page) => {
  await page.addInitScript(({ profileId, secret }) => {
    const now = Date.now()
    const fixtureUrl = `${window.location.origin}/schatphone/icons/pwa-icon-512.png`
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          settings: {
            system: { language: 'en-US' },
          },
        },
      }),
    )
    window.localStorage.setItem(
      'schatphone:store:gallery',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          assets: [
            {
              id: 'asset_camera_reference',
              name: 'Confirmed reference',
              category: 'reference',
              sourceType: 'url',
              sourceUrl: fixtureUrl,
              blobId: '',
              mimeType: 'image/png',
              extension: 'png',
              sizeBytes: 0,
              fingerprint: `url:${fixtureUrl.toLowerCase()}`,
              createdAt: now - 1000,
              updatedAt: now - 1000,
            },
          ],
          folders: [],
        },
      }),
    )
    window.localStorage.setItem(
      'schatphone:image-generation:credentials',
      JSON.stringify({
        version: 1,
        data: {
          [profileId]: { apiKey: secret, proxyToken: '' },
        },
      }),
    )
    window.localStorage.setItem(
      'schatphone:image-generation:recent',
      JSON.stringify({
        version: 1,
        data: {
          candidates: [
            {
              id: 'image_candidate_e2e',
              imageUrl: fixtureUrl,
              prompt: 'A reviewed camera candidate',
              profileId,
              profileName: 'LJQ Club',
              modelId: 'gpt-image-2',
              adapterKind: 'openai_images',
              requestId: 'request_camera_e2e',
              createdAt: now,
              galleryAssetId: '',
              keptAt: 0,
            },
          ],
        },
      }),
    )
  }, { profileId: providerId, secret: deviceSecret })
}

const expectNoOverflow = async (page) => {
  const overflow = await page.evaluate(() => {
    const camera = document.querySelector('.camera-view, .camera-settings-shell')
    return {
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      camera: camera instanceof HTMLElement ? camera.scrollWidth - camera.clientWidth : 0,
    }
  })
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.camera).toBeLessThanOrEqual(1)
}

test('Camera keeps capture, references, retention, and configuration as distinct steps', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedCameraState(page)
  await unlockToHome(page)

  const homeCamera = page.locator('[data-home-tile-id="app_camera"]')
  await expect(homeCamera).toBeVisible()
  await homeCamera.click()
  await waitForAppRouteReady(page, '/camera')

  await expect(page.getByTestId('camera-prompt')).toBeVisible()
  await expect(page.getByTestId('camera-settings-providers')).toHaveCount(0)
  await expect(page.getByTestId('camera-keep-gallery')).toBeEnabled()
  await expect(page.locator('.camera-result-image')).toHaveJSProperty('complete', true)
  await expectNoOverflow(page)

  await page.getByTestId('camera-reference-button').click()
  await expect(page.getByTestId('camera-reference-sheet')).toBeVisible()
  await page.getByTestId('camera-reference-asset_camera_reference').click()
  await expect(page.getByTestId('camera-reference-button')).toContainText('1')
  await page.getByRole('button', { name: 'Done', exact: true }).click()

  await testInfo.attach(`camera-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  await page.getByTestId('camera-keep-gallery').click()
  await expect(page.getByTestId('camera-keep-gallery')).toBeDisabled()
  await expect(page.getByTestId('camera-keep-gallery')).toContainText('In Gallery')

  await page.getByTestId('camera-settings-button').click()
  await expect(page).toHaveURL(/#\/camera\/settings(?:\?|$)/)
  await expect(page.getByTestId('camera-settings-providers')).toBeVisible()
  await expect(page.getByTestId('camera-settings-defaults')).toBeVisible()
  await expect(page.getByTestId('camera-settings-routing')).toBeVisible()
  await expectNoOverflow(page)

  await page.getByTestId('camera-settings-providers').click()
  await page.getByTestId(`camera-provider-${providerId}`).click()
  await expect(page.getByTestId('camera-provider-url')).toHaveValue('https://ljqclub.com/')
  await expect(page.getByTestId('camera-provider-model')).toHaveValue('gpt-image-2')
  await expect(page.getByTestId('camera-provider-key')).toHaveValue(deviceSecret)
  await expect(page.locator('body')).not.toContainText(deviceSecret)
  await expectNoOverflow(page)

  await testInfo.attach(`camera-provider-${testInfo.project.name}.png`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })

  await navigateInsideUnlockedApp(page, '/camera/settings')
  await page.getByTestId('camera-settings-defaults').click()
  await expect(page.getByRole('heading', { name: 'Generation Defaults' })).toBeVisible()

  await navigateInsideUnlockedApp(page, '/camera/settings')
  await page.getByTestId('camera-settings-routing').click()
  await expect(page.getByRole('heading', { name: 'App Routing' })).toBeVisible()
  await expectNoOverflow(page)
  expect(pageErrors).toEqual([])
})
