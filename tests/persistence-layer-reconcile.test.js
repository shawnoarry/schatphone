import { beforeEach, describe, expect, test, vi } from 'vitest'

const installIndexedDbMock = () => {
  const payloadByKey = new Map()
  let hasStore = false

  const db = {
    objectStoreNames: {
      contains(name) {
        return hasStore && name === 'state'
      },
    },
    createObjectStore(name) {
      if (name === 'state') hasStore = true
      return {}
    },
    transaction(storeName) {
      if (!hasStore || storeName !== 'state') {
        throw new Error('object store not found')
      }

      const tx = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore() {
          return store
        },
      }

      const store = {
        get(key) {
          const request = {
            result: undefined,
            onsuccess: null,
            onerror: null,
          }
          setTimeout(() => {
            if (payloadByKey.has(key)) {
              request.result = {
                key,
                payload: payloadByKey.get(key),
                updatedAt: Date.now(),
              }
            }
            if (typeof request.onsuccess === 'function') request.onsuccess()
          }, 0)
          return request
        },
        put(record) {
          setTimeout(() => {
            payloadByKey.set(record.key, record.payload)
            if (typeof tx.oncomplete === 'function') tx.oncomplete()
          }, 0)
        },
        delete(key) {
          setTimeout(() => {
            payloadByKey.delete(key)
            if (typeof tx.oncomplete === 'function') tx.oncomplete()
          }, 0)
        },
      }

      return tx
    },
    close() {},
    onversionchange: null,
  }

  const indexedDB = {
    open() {
      const request = {
        result: db,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
      }

      setTimeout(() => {
        if (!hasStore && typeof request.onupgradeneeded === 'function') {
          request.onupgradeneeded()
        }
        setTimeout(() => {
          if (typeof request.onsuccess === 'function') request.onsuccess()
        }, 0)
      }, 0)

      return request
    },
  }

  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    writable: true,
    value: indexedDB,
  })

  return {
    payloadByKey,
  }
}

describe('persistence layer reconcile', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    })
  })

  test('inspects local layer when mirror is unavailable', async () => {
    const {
      writePersistedState,
      inspectPersistedStateLayers,
    } = await import('../src/lib/persistence')

    writePersistedState('store:system', { sample: true }, { version: 1 })
    const report = await inspectPersistedStateLayers('store:system', { version: 1 })

    expect(report.mirrorApplicable).toBe(false)
    expect(report.mirrorInSync).toBe(true)
    expect(report.recommendedSource).toBe('local')
    expect(report.local.exists).toBe(true)
    expect(report.local.parseOk).toBe(true)
    expect(report.local.decodedOk).toBe(true)
  })

  test('repairs local/indexeddb drift using newest valid source', async () => {
    const idbMock = installIndexedDbMock()
    const {
      writePersistedStateAsync,
      readPersistedStateAsync,
      inspectPersistedStateLayers,
      reconcilePersistedStateLayers,
    } = await import('../src/lib/persistence')

    await writePersistedStateAsync('store:chat', { marker: 'indexeddb-old' }, { version: 2 })

    localStorage.setItem(
      'schatphone:store:chat',
      JSON.stringify({
        version: 2,
        savedAt: 9_999_999_999_999,
        data: { marker: 'local-new' },
      }),
    )

    const driftReport = await inspectPersistedStateLayers('store:chat', { version: 2 })
    expect(driftReport.mirrorApplicable).toBe(true)
    expect(driftReport.mirrorInSync).toBe(false)
    expect(driftReport.recommendedSource).toBe('local')

    const repair = await reconcilePersistedStateLayers('store:chat', {
      version: 2,
      strategy: 'newest_valid',
    })
    expect(repair.ok).toBe(true)
    expect(repair.action).toBe('repaired')
    expect(repair.sourceLayer).toBe('local')

    const syncedReport = await inspectPersistedStateLayers('store:chat', { version: 2 })
    expect(syncedReport.mirrorInSync).toBe(true)

    const restored = await readPersistedStateAsync('store:chat', { version: 2 })
    expect(restored).toEqual({ marker: 'local-new' })

    const localRaw = localStorage.getItem('schatphone:store:chat')
    expect(idbMock.payloadByKey.get('schatphone:store:chat')).toBe(localRaw)
  })
})

