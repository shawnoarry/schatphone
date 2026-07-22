import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const installIndexedDbWriteMock = () => {
  const payloadByKey = new Map()
  let hasStore = false
  let writeError = null

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
      if (!hasStore || storeName !== 'state') throw new Error('object store not found')

      const tx = {
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore() {
          return {
            put(record) {
              const request = { error: null }
              setTimeout(() => {
                if (writeError) {
                  request.error = writeError
                  tx.error = writeError
                  if (typeof tx.onerror === 'function') tx.onerror()
                  return
                }
                payloadByKey.set(record.key, record.payload)
                if (typeof tx.oncomplete === 'function') tx.oncomplete()
              }, 0)
              return request
            },
          }
        },
      }
      return tx
    },
    close() {},
    onversionchange: null,
  }

  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    writable: true,
    value: {
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
          setTimeout(() => request.onsuccess?.(), 0)
        }, 0)
        return request
      },
    },
  })

  return {
    payloadByKey,
    failWritesWith(error) {
      writeError = error
    },
  }
}

describe('persistence write results', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('returns a structured local success while remaining compatible with ignored results', async () => {
    const { writePersistedState } = await import('../src/lib/persistence')

    const result = writePersistedState('store:system', { marker: 'saved' }, { version: 1 })

    expect(result).toEqual({
      ok: true,
      error: null,
      carrier: 'localStorage',
      retryable: false,
      attempted: true,
    })
    expect(() => writePersistedState('store:system', { marker: 'ignored' })).not.toThrow()
  })

  test('reports serialization failure without replacing confirmed local bytes', async () => {
    const { writePersistedState } = await import('../src/lib/persistence')
    writePersistedState('store:system', { marker: 'confirmed' })
    const previousRaw = localStorage.getItem('schatphone:store:system')
    const circular = {}
    circular.self = circular

    const result = writePersistedState('store:system', circular)

    expect(result).toEqual({
      ok: false,
      error: 'serialization_failed',
      carrier: 'serialization',
      retryable: false,
      attempted: true,
    })
    expect(localStorage.getItem('schatphone:store:system')).toBe(previousRaw)
  })

  test.each([
    ['quota', new DOMException('quota', 'QuotaExceededError'), 'quota_exceeded', true],
    ['security', new DOMException('denied', 'SecurityError'), 'security_error', false],
  ])(
    'classifies %s local failure and retains prior bytes',
    async (_label, error, code, retryable) => {
      const { writePersistedState } = await import('../src/lib/persistence')
      writePersistedState('store:chat', { marker: 'confirmed' })
      const previousRaw = localStorage.getItem('schatphone:store:chat')
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw error
      })

      const result = writePersistedState('store:chat', { marker: 'rejected' })

      expect(result).toEqual({
        ok: false,
        error: code,
        carrier: 'localStorage',
        retryable,
        attempted: true,
      })
      expect(localStorage.getItem('schatphone:store:chat')).toBe(previousRaw)
    },
  )

  test('reports an unavailable local carrier without throwing', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: undefined,
    })

    try {
      const { writePersistedState } = await import('../src/lib/persistence')
      expect(writePersistedState('store:system', { marker: 'rejected' })).toEqual({
        ok: false,
        error: 'carrier_unavailable',
        carrier: 'localStorage',
        retryable: true,
        attempted: false,
      })
    } finally {
      Object.defineProperty(window, 'localStorage', descriptor)
    }
  })

  test('reports local and mirror success independently', async () => {
    const indexedDb = installIndexedDbWriteMock()
    const { writePersistedStateAsync } = await import('../src/lib/persistence')

    const result = await writePersistedStateAsync('store:chat', { marker: 'saved' }, { version: 2 })

    expect(result).toMatchObject({
      ok: true,
      error: null,
      carrier: 'localStorage',
      retryable: false,
      local: { ok: true, carrier: 'localStorage', attempted: true },
      mirror: { ok: true, carrier: 'indexeddb', attempted: true },
    })
    expect(indexedDb.payloadByKey.get('schatphone:store:chat')).toBe(
      localStorage.getItem('schatphone:store:chat'),
    )
  })

  test('does not advance the mirror when the local primary write fails', async () => {
    const indexedDb = installIndexedDbWriteMock()
    const { writePersistedStateAsync } = await import('../src/lib/persistence')
    await writePersistedStateAsync('store:chat', { marker: 'confirmed' }, { version: 2 })
    const previousLocalRaw = localStorage.getItem('schatphone:store:chat')
    const previousMirrorRaw = indexedDb.payloadByKey.get('schatphone:store:chat')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    const result = await writePersistedStateAsync(
      'store:chat',
      { marker: 'rejected' },
      { version: 2 },
    )

    expect(result).toMatchObject({
      ok: false,
      error: 'quota_exceeded',
      carrier: 'localStorage',
      retryable: true,
      local: {
        ok: false,
        error: 'quota_exceeded',
        carrier: 'localStorage',
        attempted: true,
      },
      mirror: {
        ok: false,
        error: 'primary_write_failed',
        carrier: 'indexeddb',
        retryable: true,
        attempted: false,
      },
    })
    expect(localStorage.getItem('schatphone:store:chat')).toBe(previousLocalRaw)
    expect(indexedDb.payloadByKey.get('schatphone:store:chat')).toBe(previousMirrorRaw)
  })

  test('reports mirror failure separately and retains its last confirmed bytes', async () => {
    const indexedDb = installIndexedDbWriteMock()
    const { writePersistedStateAsync } = await import('../src/lib/persistence')
    await writePersistedStateAsync('store:chat', { marker: 'confirmed' }, { version: 2 })
    const previousMirrorRaw = indexedDb.payloadByKey.get('schatphone:store:chat')
    indexedDb.failWritesWith(new DOMException('transaction failed', 'UnknownError'))

    const result = await writePersistedStateAsync(
      'store:chat',
      { marker: 'local-only' },
      { version: 2 },
    )

    expect(result).toMatchObject({
      ok: false,
      error: 'carrier_unavailable',
      carrier: 'indexeddb',
      retryable: true,
      local: { ok: true, carrier: 'localStorage', attempted: true },
      mirror: {
        ok: false,
        error: 'carrier_unavailable',
        carrier: 'indexeddb',
        retryable: true,
        attempted: true,
      },
    })
    expect(indexedDb.payloadByKey.get('schatphone:store:chat')).toBe(previousMirrorRaw)
    expect(localStorage.getItem('schatphone:store:chat')).not.toBe(previousMirrorRaw)
  })
})
