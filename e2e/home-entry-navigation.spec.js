import { expect, test } from '@playwright/test'

const unlockToHome = async (page) => {
  await page.goto('/#/lock')
  await page.locator('.lock-unlock-button').click()
  await expect(page).toHaveURL(/#\/home/)
  await expect(page.locator('.home-dock')).toBeVisible()
}

const returnToHome = async (page) => {
  await page.evaluate(() => {
    window.location.hash = '/home'
  })
  await expect(page).toHaveURL(/#\/home/)
  await expect(page.locator('.home-dock')).toBeVisible()
}

const seedGalleryIconAsset = async (page) => {
  await page.addInitScript(() => {
    const now = Date.now()
    const iconUrl = 'https://example.com/icon-gallery.png'
    window.localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({
        version: 1,
        savedAt: now,
        data: {
          settings: {
            system: {
              language: 'en-US',
            },
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
              id: 'asset_e2e_gallery_icon',
              name: 'Gallery Icon',
              category: 'reference',
              sourceType: 'url',
              sourceUrl: iconUrl,
              blobId: '',
              mimeType: 'image/png',
              extension: 'png',
              sizeBytes: 0,
              fingerprint: `url:${iconUrl.toLowerCase()}`,
              createdAt: now - 1,
              updatedAt: now,
            },
          ],
          folders: [],
        },
      }),
    )
  })
}

const openVisibleIdentityAction = async (page) => {
  const inlineAction = page.getByTestId('app-store-open-identity')
  if (await inlineAction.isVisible()) {
    await inlineAction.click()
    return
  }

  await page.getByTestId('app-store-open-identity-sheet').click()
}

const openVisibleAppStoreAction = async (page) => {
  const inlineAction = page.getByTestId('app-store-open')
  if (await inlineAction.isVisible()) {
    await inlineAction.click()
    return
  }

  await page.getByTestId('app-store-open-sheet').click()
}

test.describe('Home entry navigation', () => {
  test('opens dock apps and a Home app tile from the shell', async ({ page }) => {
    const pageErrors = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })

    await unlockToHome(page)

    await page.locator('.home-dock .home-dock-icon').nth(0).click()
    await expect(page).toHaveURL(/#\/chat(?:\?|$)/)

    await returnToHome(page)
    await page.locator('.home-dock .home-dock-icon').nth(1).click()
    await expect(page).toHaveURL(/#\/contacts(?:\?|$)/)

    await returnToHome(page)
    await page.locator('.home-dock .home-dock-icon').nth(2).click()
    await expect(page).toHaveURL(/#\/settings(?:\?|$)/)

    await returnToHome(page)
    await page.getByTestId('home-dock-widgets').click()
    await expect(page).toHaveURL(/#\/widgets(?:\?|$)/)

    await returnToHome(page)
    await page.locator('[data-home-tile-id="app_network"]').click()
    await expect(page).toHaveURL(/#\/network(?:\?|$)/)

    expect(pageErrors).toEqual([])
  })

  test('opens apps from App Store detail actions', async ({ page }) => {
    const pageErrors = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })

    await unlockToHome(page)
    await page.evaluate(() => {
      window.location.hash = '/app-store'
    })
    await expect(page).toHaveURL(/#\/app-store/)

    await page.getByTestId('app-store-item-app_chat').click()
    await openVisibleAppStoreAction(page)
    await expect(page).toHaveURL(/#\/chat(?:\?|$)/)

    await page.evaluate(() => {
      window.location.hash = '/app-store'
    })
    await expect(page).toHaveURL(/#\/app-store/)

    await page.getByTestId('app-store-item-app_widgets').click()
    await openVisibleAppStoreAction(page)
    await expect(page).toHaveURL(/#\/widgets(?:\?|$)/)

    expect(pageErrors).toEqual([])
  })

  test('edits a Gallery image app icon from App Store and sees it on Home', async ({ page }) => {
    const pageErrors = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })

    await seedGalleryIconAsset(page)
    await unlockToHome(page)

    await page.evaluate(() => {
      window.location.hash = '/app-store'
    })
    await expect(page).toHaveURL(/#\/app-store/)

    await page.getByTestId('app-store-item-app_gallery').click()
    await openVisibleIdentityAction(page)
    await expect(page.getByTestId('app-store-identity-sheet')).toBeVisible()
    await page.getByTestId('app-store-identity-source-gallery').click()
    await page.getByTestId('app-store-identity-gallery-asset').selectOption('asset_e2e_gallery_icon')
    await page.getByTestId('app-store-identity-save').click()
    await expect(page.getByTestId('app-store-identity-sheet')).toBeHidden()

    const savedOverride = await page.evaluate(() => {
      const raw = window.localStorage.getItem('schatphone:store:system')
      return JSON.parse(raw)?.data?.settings?.appearance?.appIconOverrides?.app_gallery
    })
    expect(savedOverride).toMatchObject({
      sourceType: 'gallery',
      galleryAssetId: 'asset_e2e_gallery_icon',
    })

    await returnToHome(page)
    const homeGalleryIcon = page.getByTestId('home-app-icon-app_gallery').locator('img')
    await expect(homeGalleryIcon).toBeVisible()
    await expect(homeGalleryIcon).toHaveAttribute('src', 'https://example.com/icon-gallery.png')

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(hasHorizontalOverflow).toBe(false)
    expect(pageErrors).toEqual([])
  })
})
