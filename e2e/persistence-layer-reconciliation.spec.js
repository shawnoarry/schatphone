import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation'

const KEY = 'schatphone:store:map'
const DB_NAME = 'schatphone-layered-storage'
const STORE_NAME = 'state'

const mapRaw = ({ marker, lineage, sequence, savedAt, ordered = true }) =>
  JSON.stringify({
    version: 2,
    savedAt,
    ...(ordered ? { generation: { lineage, sequence } } : {}),
    data: {
      addresses: [],
      currentLocation: { source: 'saved', label: marker, detail: marker },
      tripForm: { from: '', to: marker },
    },
  })

const seedLayers = async (page, { localRaw, mirrorRaw }) => {
  await page.evaluate(
    async ({ key, localRaw, mirrorRaw, databaseName, storeName }) => {
      if (localRaw == null) localStorage.removeItem(key)
      else localStorage.setItem(key, localRaw)
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
        const store = tx.objectStore(storeName)
        if (mirrorRaw == null) store.delete(key)
        else store.put({ key, payload: mirrorRaw, updatedAt: Date.now() })
        tx.oncomplete = resolve
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
      db.close()
    },
    { key: KEY, localRaw, mirrorRaw, databaseName: DB_NAME, storeName: STORE_NAME },
  )
}

const openStaticSeedPage = (page) => page.goto('/manifest.webmanifest')

const readLayers = (page) =>
  page.evaluate(
    async ({ key, databaseName, storeName }) => {
      const localRaw = localStorage.getItem(key)
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      })
      const mirrorRaw = await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const request = tx.objectStore(storeName).get(key)
        request.onsuccess = () => resolve(request.result?.payload ?? null)
        request.onerror = () => reject(request.error)
      })
      db.close()
      return { localRaw, mirrorRaw }
    },
    { key: KEY, databaseName: DB_NAME, storeName: STORE_NAME },
  )

const waitForStableLayerPair = async (page) => {
  const first = await readLayers(page)
  if (!first.localRaw || first.localRaw !== first.mirrorRaw) return false

  await page.waitForTimeout(75)
  const second = await readLayers(page)
  return second.localRaw === first.localRaw && second.localRaw === second.mirrorRaw
}

const captureBootstrapWrites = async (page) => {
  await page.addInitScript((key) => {
    if (location.pathname.endsWith('/manifest.webmanifest')) return
    const originalSetItem = Storage.prototype.setItem
    const originalMirrorPut = IDBObjectStore.prototype.put
    window.__persistenceBootstrapWrites = { local: [], mirror: [] }
    Storage.prototype.setItem = function setItem(calledKey, value) {
      if (this === localStorage && calledKey === key) {
        window.__persistenceBootstrapWrites.local.push(value)
      }
      return originalSetItem.call(this, calledKey, value)
    }
    IDBObjectStore.prototype.put = function put(record, ...args) {
      if (record?.key === key && typeof record.payload === 'string') {
        window.__persistenceBootstrapWrites.mirror.push(record.payload)
      }
      return originalMirrorPut.call(this, record, ...args)
    }
  }, KEY)
}

const expectBootstrapWrite = async (page, layer, expected) => {
  await expect
    .poll(() =>
      page.evaluate(
        (targetLayer) => window.__persistenceBootstrapWrites?.[targetLayer]?.[0],
        layer,
      ),
    )
    .toBe(expected)
}

const cleanup = async (page) => {
  await page.evaluate(
    async ({ key, databaseName }) => {
      localStorage.removeItem(key)
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName)
        request.onsuccess = resolve
        request.onerror = () => reject(request.error)
        request.onblocked = () => resolve()
      })
    },
    { key: KEY, databaseName: DB_NAME },
  )
}

test.describe('layered persistence bootstrap reconciliation', () => {
  test.skip(({ browserName }) => browserName !== 'chromium')

  test('hydrates the Store from a higher mirror sequence, repairs local bytes, and reopens stably', async ({ page }) => {
    const localRaw = mapRaw({
      marker: 'Local older',
      lineage: 'bootstrap-shared',
      sequence: 2,
      savedAt: 999_999,
    })
    const mirrorRaw = mapRaw({
      marker: 'Mirror winner',
      lineage: 'bootstrap-shared',
      sequence: 7,
      savedAt: 1,
    })
    await openStaticSeedPage(page)
    await seedLayers(page, { localRaw, mirrorRaw })
    await captureBootstrapWrites(page)

    await page.goto('/#/lock')
    await expectBootstrapWrite(page, 'local', mirrorRaw)
    await expect
      .poll(() => waitForStableLayerPair(page))
      .toBe(true)
    const bootstrapped = await readLayers(page)
    expect(bootstrapped.localRaw).toBe(bootstrapped.mirrorRaw)
    expect(JSON.parse(bootstrapped.localRaw).data.tripForm.to).toBe('Mirror winner')
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')
    await expect(page.getByTestId('map-destination-search')).toHaveValue('Mirror winner')

    await page.reload()
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/map')
    await expect(page.getByTestId('map-destination-search')).toHaveValue('Mirror winner')
    const reopened = await readLayers(page)
    expect(reopened.localRaw).toBe(reopened.mirrorRaw)
    await cleanup(page)
  })

  test('repairs local-higher and corrupt-local cases without clock arbitration', async ({
    page,
    browser,
  }) => {
    await openStaticSeedPage(page)
    const localWinner = mapRaw({
      marker: 'Local winner',
      lineage: 'local-shared',
      sequence: 9,
      savedAt: 1,
    })
    const mirrorOlder = mapRaw({
      marker: 'Mirror older',
      lineage: 'local-shared',
      sequence: 3,
      savedAt: 999_999,
    })
    await seedLayers(page, { localRaw: localWinner, mirrorRaw: mirrorOlder })
    await captureBootstrapWrites(page)
    await page.goto('/#/lock')
    await expectBootstrapWrite(page, 'mirror', localWinner)
    await expect
      .poll(() => waitForStableLayerPair(page))
      .toBe(true)
    const localRecovered = await readLayers(page)
    expect(localRecovered.localRaw).toBe(localRecovered.mirrorRaw)
    expect(JSON.parse(localRecovered.localRaw).data.tripForm.to).toBe('Local winner')
    await cleanup(page)

    const secondContext = await browser.newContext()
    const secondPage = await secondContext.newPage()
    try {
      const mirrorValid = mapRaw({
        marker: 'Recovered mirror',
        lineage: 'corrupt-recovery',
        sequence: 4,
        savedAt: 1,
      })
      await openStaticSeedPage(secondPage)
      await seedLayers(secondPage, { localRaw: '{broken', mirrorRaw: mirrorValid })
      await captureBootstrapWrites(secondPage)
      await secondPage.goto('/#/lock')
      await expectBootstrapWrite(secondPage, 'local', mirrorValid)
      await expect
        .poll(() => waitForStableLayerPair(secondPage))
        .toBe(true)
      const recovered = await readLayers(secondPage)
      expect(recovered.localRaw).toBe(recovered.mirrorRaw)
      expect(JSON.parse(recovered.localRaw).data.tripForm.to).toBe('Recovered mirror')
    } finally {
      await cleanup(secondPage)
      await secondContext.close()
    }
  })

  test('preserves same-generation conflict and divergent legacy bytes with zero writes', async ({ page }) => {
    await openStaticSeedPage(page)
    const conflictLocal = mapRaw({
      marker: 'Conflict local',
      lineage: 'conflict',
      sequence: 4,
      savedAt: 1,
    })
    const conflictMirror = mapRaw({
      marker: 'Conflict mirror',
      lineage: 'conflict',
      sequence: 4,
      savedAt: 999,
    })
    await seedLayers(page, { localRaw: conflictLocal, mirrorRaw: conflictMirror })
    await page.goto('/#/lock')
    expect(await readLayers(page)).toEqual({
      localRaw: conflictLocal,
      mirrorRaw: conflictMirror,
    })

    const legacyLocal = mapRaw({ marker: 'Legacy local', savedAt: 999, ordered: false })
    const legacyMirror = mapRaw({ marker: 'Legacy mirror', savedAt: 1, ordered: false })
    await openStaticSeedPage(page)
    await seedLayers(page, { localRaw: legacyLocal, mirrorRaw: legacyMirror })
    await page.goto('/#/lock')
    expect(await readLayers(page)).toEqual({ localRaw: legacyLocal, mirrorRaw: legacyMirror })
    await cleanup(page)
  })

  test('bounds blocked IndexedDB startup and leaves the readable local head unchanged', async ({ page }) => {
    const localRaw = mapRaw({
      marker: 'Blocked local',
      lineage: 'blocked-lineage',
      sequence: 2,
      savedAt: 10,
    })
    await page.addInitScript(
      ({ key, raw }) => {
        localStorage.setItem(key, raw)
        const blockedOpen = () => {
          const request = {
            result: null,
            error: null,
            onupgradeneeded: null,
            onsuccess: null,
            onerror: null,
            onblocked: null,
          }
          setTimeout(() => request.onblocked?.(), 0)
          return request
        }
        Object.defineProperty(window.indexedDB, 'open', {
          configurable: true,
          value: blockedOpen,
        })
      },
      { key: KEY, raw: localRaw },
    )

    const startedAt = Date.now()
    await page.goto('/#/lock')
    expect(Date.now() - startedAt).toBeLessThan(5_000)
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(localRaw)
    await expect(page.locator('#app')).not.toBeEmpty()
    await page.evaluate((key) => localStorage.removeItem(key), KEY)
  })
})
