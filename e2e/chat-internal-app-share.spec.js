import { expect, test } from '@playwright/test'
import {
  navigateInsideUnlockedApp,
  unlockToHome,
  waitForAppRouteReady,
} from './helpers/navigation.js'

const expectNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
    app: (() => {
      const element = document.querySelector('[data-testid="chat-page"], [data-testid="music-app"], .map-immersive-root')
      return element instanceof HTMLElement ? element.scrollWidth - element.clientWidth : 0
    })(),
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.app).toBeLessThanOrEqual(1)
}

const chooseEvaAndOpenThread = async (page) => {
  await expect(page.getByTestId('chat-internal-share-recipient-picker')).toBeVisible()
  await page.getByTestId('chat-contact-row-1').click()
  await waitForAppRouteReady(page, '/chat/1')
  await expect(page.getByTestId('chat-internal-share-composer-status')).toBeVisible()
}

test('Music shares a track into Chat, survives refresh, supports quoting, and returns without autoplay', async ({
  page,
}) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/music?track=demo_blue_hour')
  await expect(page.getByTestId('music-now-playing-sheet')).toContainText('Blue Hour Drive')
  await expect(page.getByTestId('music-now-playing-sheet')).toContainText(
    /打开详情不会自动播放|Opening details does not start playback/,
  )

  await page.getByTestId('music-share-chat').click()
  await waitForAppRouteReady(page, '/chat?share=internal')
  await expect(page.getByTestId('chat-internal-share-recipient-picker')).toContainText(
    'Blue Hour Drive',
  )
  await expectNoHorizontalOverflow(page)

  await page.reload()
  await waitForAppRouteReady(page, '/lock')
  await expect(page.getByTestId('lock-internal-share-card')).toContainText('Blue Hour Drive')
  await page.getByTestId('lock-internal-share-card').click()
  await waitForAppRouteReady(page, '/chat?share=internal')

  await chooseEvaAndOpenThread(page)
  await page.getByTestId('chat-internal-share-send').click()
  const shareCard = page.getByTestId('chat-share-card-music-demo_blue_hour').last()
  await expect(shareCard).toContainText('Blue Hour Drive')
  await expect(shareCard.getByRole('img', { name: 'Blue Hour Drive' })).toBeVisible()
  await expect(page.getByTestId('chat-internal-share-composer-status')).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('schatphone:chat:internal-share-draft')))
    .toBeNull()

  const shareMessage = page
    .getByTestId(/^chat-message-row-/)
    .filter({ has: page.getByTestId('chat-share-card-music-demo_blue_hour') })
    .last()
  await shareMessage.getByTestId('chat-message-bubble').click({ button: 'right' })
  await page.getByTestId('chat-message-action-quote').click()
  await expect(page.getByTestId('chat-pending-quote-bar')).toContainText('Blue Hour Drive')
  await page.getByTestId('chat-message-input').fill('稍后一起听。')
  await page.getByTestId('chat-message-input').press('Enter')
  const quotedReply = page.getByTestId(/^chat-message-row-/).filter({ hasText: '稍后一起听。' }).last()
  await expect(quotedReply).toContainText('Blue Hour Drive')
  await expectNoHorizontalOverflow(page)

  await shareCard.getByRole('button', { name: /在音乐中查看|View in Music/ }).click()
  await waitForAppRouteReady(page, '/music')
  await expect(page).toHaveURL(/#\/music\?source=chat&track=demo_blue_hour$/)
  await expect(page.getByTestId('music-now-playing-sheet')).toContainText('Blue Hour Drive')
  await expect(page.getByTestId('music-now-playing-sheet')).toContainText(
    /打开详情不会自动播放|Opening details does not start playback/,
  )
  await expectNoHorizontalOverflow(page)
})

test('Map share can cancel back to the place, then send and reopen the same detail', async ({ page }) => {
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/map?placeId=seoul-sm-hq')
  await expect(page.getByTestId('map-place-detail-sheet')).toContainText('SM')
  const initialLocation = await page.getByTestId('map-current-location').innerText()

  await page.getByTestId('map-place-share-chat').click()
  await waitForAppRouteReady(page, '/chat?share=internal')
  await expect(page.getByTestId('chat-internal-share-recipient-picker')).toContainText('SM')
  await page.getByTestId('chat-internal-share-cancel').click()
  await waitForAppRouteReady(page, '/map')
  await expect(page).toHaveURL(/#\/map\?placeId=seoul-sm-hq&mapPackId=/)
  await expect(page.getByTestId('map-place-detail-sheet')).toContainText('SM')
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('schatphone:chat:internal-share-draft')))
    .toBeNull()

  await page.getByTestId('map-place-share-chat').click()
  await waitForAppRouteReady(page, '/chat?share=internal')
  await chooseEvaAndOpenThread(page)
  await page.getByTestId('chat-internal-share-send').click()
  const shareCard = page.getByTestId('chat-share-card-map-seoul-sm-hq').last()
  await expect(shareCard).toContainText('SM')
  await expectNoHorizontalOverflow(page)

  await shareCard.getByRole('button', { name: /在地图中查看|View in Map/ }).click()
  await waitForAppRouteReady(page, '/map')
  await expect(page).toHaveURL(/#\/map\?placeId=seoul-sm-hq&mapPackId=.*&source=chat&intent=location_share$/)
  await expect(page.getByTestId('map-place-detail-sheet')).toContainText('SM')
  await expect(page.getByTestId('map-current-location')).toHaveText(initialLocation)
  await expect(page.locator('[data-testid="map-primary-route-card"]')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
})
