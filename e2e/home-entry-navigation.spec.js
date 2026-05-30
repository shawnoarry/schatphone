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
    await page.getByTestId('app-store-open').click()
    await expect(page).toHaveURL(/#\/chat(?:\?|$)/)

    await page.evaluate(() => {
      window.location.hash = '/app-store'
    })
    await expect(page).toHaveURL(/#\/app-store/)

    await page.getByTestId('app-store-item-app_widgets').click()
    await page.getByTestId('app-store-open').click()
    await expect(page).toHaveURL(/#\/widgets(?:\?|$)/)

    expect(pageErrors).toEqual([])
  })
})
