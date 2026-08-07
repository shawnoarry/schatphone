import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation'

const SYSTEM_KEY = 'schatphone:store:system'
const DB_NAME = 'schatphone-layered-storage'
const STORE_NAME = 'state'

const seedConflictingSystemHeads = async (page) => {
  const localRaw = JSON.stringify({
    version: 1,
    savedAt: 1,
    generation: { lineage: 'ui-conflict', sequence: 2 },
    data: { marker: 'local' },
  })
  const mirrorRaw = JSON.stringify({
    version: 1,
    savedAt: 2,
    generation: { lineage: 'ui-conflict', sequence: 2 },
    data: { marker: 'mirror' },
  })

  await page.goto('/manifest.webmanifest')
  await page.evaluate(
    async ({ key, localRaw, mirrorRaw, databaseName, storeName }) => {
      localStorage.setItem(key, localRaw)
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1)
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(storeName)) {
            request.result.createObjectStore(storeName, { keyPath: 'key' })
          }
        }
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      })
      await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.objectStore(storeName).put({ key, payload: mirrorRaw, updatedAt: Date.now() })
        tx.oncomplete = resolve
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
      db.close()
    },
    { key: SYSTEM_KEY, localRaw, mirrorRaw, databaseName: DB_NAME, storeName: STORE_NAME },
  )
}

test.describe('product-level persistence recovery', () => {
  test.skip(({ browserName }) => browserName !== 'chromium')

  test('shows a failed save and clears it after retry succeeds', async ({ page }) => {
    await page.addInitScript((key) => {
      const originalSetItem = Storage.prototype.setItem
      window.__failSystemPersistence = false
      Storage.prototype.setItem = function setItem(calledKey, value) {
        if (
          window.__failSystemPersistence === true &&
          this === localStorage &&
          calledKey === key
        ) {
          throw new DOMException('Injected quota failure', 'QuotaExceededError')
        }
        return originalSetItem.call(this, calledKey, value)
      }
    }, SYSTEM_KEY)

    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/settings?menu=general')
    await page.evaluate(() => {
      window.__failSystemPersistence = true
    })
    await page.getByTestId('settings-general-save').click()

    const recovery = page.getByTestId('persistence-recovery-sheet')
    await expect(recovery).toBeVisible()
    await expect(recovery).toHaveAttribute('data-mode', 'save_failed')
    await expect(recovery).toContainText('最近的更改尚未保存')
    const viewport = page.viewportSize()
    const recoveryBox = await recovery.boundingBox()
    expect(recoveryBox).not.toBeNull()
    expect(recoveryBox.x).toBeGreaterThanOrEqual(0)
    expect(recoveryBox.x + recoveryBox.width).toBeLessThanOrEqual(viewport.width)
    for (const testId of [
      'persistence-recovery-retry',
      'persistence-recovery-refresh',
      'persistence-recovery-backup',
    ]) {
      const actionBox = await page.getByTestId(testId).boundingBox()
      expect(actionBox).not.toBeNull()
      expect(actionBox.height).toBeGreaterThanOrEqual(44)
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)

    await page.evaluate(() => {
      window.__failSystemPersistence = false
    })
    await page.getByTestId('persistence-recovery-retry').click()
    await expect(recovery).toBeHidden()
  })

  test('keeps a frozen conflict read-only and hands off to complete backup', async ({ page }) => {
    await seedConflictingSystemHeads(page)
    await unlockToHome(page)

    const recovery = page.getByTestId('persistence-recovery-sheet')
    await expect(recovery).toBeVisible()
    await expect(recovery).toHaveAttribute('data-mode', 'read_only')
    await expect(recovery).toContainText('当前存档已进入只读保护')

    await page.getByTestId('persistence-recovery-backup').click()
    await expect(page).toHaveURL(/#\/settings\?focus=backup&recovery=read_only$/)
    await expect(page.getByTestId('settings-backup-focus')).toBeVisible()
    await expect(recovery).toBeVisible()
  })
})
