import { beforeEach, describe, expect, test, vi } from 'vitest'

const makeRaw = ({
  marker,
  lineage,
  sequence,
  savedAt = 1,
  version = 1,
  generation = lineage ? { lineage, sequence } : undefined,
} = {}) =>
  JSON.stringify({
    version,
    savedAt,
    ...(generation === undefined ? {} : { generation }),
    data: { marker },
  })

const installIndexedDbMock = () => {
  const payloadByKey = new Map()
  let hasStore = false
  let writeError = null
  let readCount = 0
  let onRead = null

  const db = {
    objectStoreNames: { contains: (name) => hasStore && name === 'state' },
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
        abort() {
          tx.onabort?.()
        },
        objectStore() {
          return {
            get(key) {
              const request = { result: undefined, error: null, onsuccess: null, onerror: null }
              setTimeout(() => {
                readCount += 1
                onRead?.({ key, readCount, payloadByKey })
                if (payloadByKey.has(key)) {
                  request.result = { key, payload: payloadByKey.get(key), updatedAt: 9_999 }
                }
                request.onsuccess?.()
              }, 0)
              return request
            },
            put(record) {
              const request = { error: null }
              setTimeout(() => {
                if (writeError) {
                  request.error = writeError
                  tx.error = writeError
                  tx.onerror?.()
                  return
                }
                payloadByKey.set(record.key, record.payload)
                tx.oncomplete?.()
              }, 0)
              return request
            },
            delete(key) {
              setTimeout(() => {
                payloadByKey.delete(key)
                tx.oncomplete?.()
              }, 0)
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
          if (!hasStore) request.onupgradeneeded?.()
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
    onRead(callback) {
      onRead = callback
    },
  }
}

const importPersistence = () => import('../src/lib/persistence')

describe('persistence layer freshness reconciliation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    localStorage.clear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    })
  })

  test('reports a disabled mirror as not applicable without degrading local operation', async () => {
    vi.stubEnv('VITE_ENABLE_INDEXEDDB_MIRROR', 'false')
    const raw = makeRaw({ marker: 'local', lineage: 'local-lineage', sequence: 2 })
    localStorage.setItem('schatphone:store:system', raw)
    const {
      inspectPersistedStateLayers,
      reconcilePersistedStateLayers,
      writePersistedStateAsync,
    } = await importPersistence()
    const report = await inspectPersistedStateLayers('store:system', { version: 1 })

    expect(report.local).toMatchObject({ availability: 'available', presence: 'present' })
    expect(report.indexeddb).toMatchObject({
      applicable: false,
      availability: 'not_applicable',
      presence: 'absent',
      issueCode: '',
    })
    expect(report.mirrorApplicable).toBe(false)
    expect(report.mirrorInSync).toBe(false)
    expect(report.fullyReconciled).toBe(true)
    await expect(reconcilePersistedStateLayers('store:system', { version: 1 })).resolves.toMatchObject({
      ok: true,
      action: 'noop',
    })
    await expect(
      writePersistedStateAsync('store:system', { marker: 'next' }, { version: 1 }),
    ).resolves.toMatchObject({
      ok: true,
      local: { ok: true },
      mirror: { ok: true, attempted: false },
    })
    expect(JSON.parse(localStorage.getItem('schatphone:store:system')).generation).toEqual({
      lineage: 'local-lineage',
      sequence: 3,
    })
  })

  test('treats an enabled but missing IndexedDB API as applicable and unavailable', async () => {
    const raw = makeRaw({ marker: 'local', lineage: 'local-lineage', sequence: 2 })
    localStorage.setItem('schatphone:store:system', raw)
    const {
      inspectPersistedStateLayers,
      reconcilePersistedStateLayers,
      writePersistedStateAsync,
    } = await importPersistence()
    const report = await inspectPersistedStateLayers('store:system', { version: 1 })

    expect(report.indexeddb).toMatchObject({
      applicable: true,
      availability: 'unavailable',
      presence: 'absent',
      issueCode: 'carrier_unavailable',
    })
    expect(report.mirrorApplicable).toBe(true)
    expect(report.fullyReconciled).toBe(false)
    await expect(reconcilePersistedStateLayers('store:system', { version: 1 })).resolves.toMatchObject({
      ok: true,
      action: 'degraded',
    })
    await expect(
      writePersistedStateAsync('store:system', { marker: 'forked' }, { version: 1 }),
    ).resolves.toMatchObject({
      ok: false,
      local: { ok: true },
      mirror: {
        ok: false,
        error: 'carrier_unavailable',
        carrier: 'indexeddb',
        attempted: false,
      },
    })
    const generation = JSON.parse(localStorage.getItem('schatphone:store:system')).generation
    expect(generation).toMatchObject({ sequence: 1 })
    expect(generation.lineage).not.toBe('local-lineage')
  })

  test('does not report corrupt local or byte-identical corrupt heads as fully reconciled', async () => {
    vi.stubEnv('VITE_ENABLE_INDEXEDDB_MIRROR', 'false')
    localStorage.setItem('schatphone:store:system', '{broken')
    let persistence = await importPersistence()
    let report = await persistence.inspectPersistedStateLayers('store:system', { version: 1 })

    expect(report).toMatchObject({
      fullyReconciled: false,
      issueCode: 'no_valid_source',
      mirrorApplicable: false,
    })

    vi.unstubAllEnvs()
    vi.resetModules()
    const idb = installIndexedDbMock()
    idb.payloadByKey.set('schatphone:store:system', '{broken')
    persistence = await importPersistence()
    report = await persistence.inspectPersistedStateLayers('store:system', { version: 1 })

    expect(report).toMatchObject({
      mirrorInSync: true,
      fullyReconciled: false,
      issueCode: 'no_valid_source',
    })
  })

  test('treats identical valid raw bytes as a local-source noop', async () => {
    const idb = installIndexedDbMock()
    const raw = makeRaw({ marker: 'same', lineage: 'same-lineage', sequence: 3 })
    localStorage.setItem('schatphone:store:system', raw)
    idb.payloadByKey.set('schatphone:store:system', raw)
    const { reconcilePersistedStateLayers } = await importPersistence()

    const result = await reconcilePersistedStateLayers('store:system', { version: 1 })

    expect(result).toMatchObject({ ok: true, action: 'noop', sourceLayer: 'local' })
    expect(localStorage.getItem('schatphone:store:system')).toBe(raw)
  })

  test('allows the first ordered write after a legacy pair has been reconciled', async () => {
    const idb = installIndexedDbMock()
    const legacy = makeRaw({ marker: 'legacy' })
    localStorage.setItem('schatphone:store:system', legacy)
    idb.payloadByKey.set('schatphone:store:system', legacy)
    const { reconcilePersistedStateLayers, writePersistedStateAsync } = await importPersistence()

    await expect(
      reconcilePersistedStateLayers('store:system', { version: 1 }),
    ).resolves.toMatchObject({ ok: true, action: 'noop' })

    const result = await writePersistedStateAsync(
      'store:system',
      { marker: 'ordered successor' },
      { version: 1 },
    )

    expect(result).toMatchObject({ ok: true, local: { ok: true }, mirror: { ok: true } })
    const saved = localStorage.getItem('schatphone:store:system')
    expect(saved).toBe(idb.payloadByKey.get('schatphone:store:system'))
    expect(JSON.parse(saved).data).toEqual({ marker: 'ordered successor' })
    expect(JSON.parse(saved).generation.sequence).toBe(1)
  })

  test.each([
    ['absent', null],
    ['corrupt', '{broken'],
  ])('repairs an available %s mirror from the sole valid local layer', async (_label, staleRaw) => {
    const idb = installIndexedDbMock()
    const raw = makeRaw({ marker: 'valid', lineage: 'sole-local', sequence: 2 })
    localStorage.setItem('schatphone:store:system', raw)
    if (staleRaw !== null) idb.payloadByKey.set('schatphone:store:system', staleRaw)
    const { reconcilePersistedStateLayers } = await importPersistence()

    const result = await reconcilePersistedStateLayers('store:system', { version: 1 })

    expect(result).toMatchObject({ ok: true, action: 'repaired', sourceLayer: 'local' })
    expect(idb.payloadByKey.get('schatphone:store:system')).toBe(raw)
  })

  test('uses a sole decodable malformed-generation payload as an unordered recovery candidate', async () => {
    const idb = installIndexedDbMock()
    const malformed = makeRaw({
      marker: 'recoverable',
      generation: { lineage: '', sequence: 3 },
    })
    localStorage.setItem('schatphone:store:system', malformed)
    const { reconcilePersistedStateLayers } = await importPersistence()

    const result = await reconcilePersistedStateLayers('store:system', { version: 1 })

    expect(result).toMatchObject({
      ok: true,
      action: 'repaired',
      sourceLayer: 'local',
      reason: 'sole_valid',
    })
    expect(result.local).toMatchObject({
      payloadValid: true,
      valid: true,
      order: 'unordered',
      orderingValid: false,
      issueCode: 'generation_invalid',
    })
    expect(idb.payloadByKey.get('schatphone:store:system')).toBe(malformed)
  })

  test.each([
    ['equal', 'same', true, 'adopted'],
    ['divergent', 'mirror', false, 'skipped'],
  ])(
    'treats a malformed-generation %s pair as unordered data',
    async (_label, mirrorMarker, ok, action) => {
      const idb = installIndexedDbMock()
      const local = makeRaw({
        marker: 'same',
        generation: { lineage: 'bad', sequence: 0 },
      })
      const mirror = makeRaw({
        marker: mirrorMarker,
        generation: { lineage: '', sequence: 7 },
      })
      localStorage.setItem('schatphone:store:system', local)
      idb.payloadByKey.set('schatphone:store:system', mirror)
      const { reconcilePersistedStateLayers } = await importPersistence()

      const result = await reconcilePersistedStateLayers('store:system', { version: 1 })

      expect(result.ok).toBe(ok)
      expect(result.action).toBe(action)
      if (ok) {
        const adopted = localStorage.getItem('schatphone:store:system')
        expect(idb.payloadByKey.get('schatphone:store:system')).toBe(adopted)
        expect(JSON.parse(adopted).generation).toMatchObject({ sequence: 1 })
      } else {
        expect(result.reason).toBe('legacy_freshness_unknown')
        expect(localStorage.getItem('schatphone:store:system')).toBe(local)
        expect(idb.payloadByKey.get('schatphone:store:system')).toBe(mirror)
      }
    },
  )

  test('repairs local from the sole valid mirror without using timestamps', async () => {
    const idb = installIndexedDbMock()
    const mirror = makeRaw({
      marker: 'mirror-valid',
      lineage: 'sole-mirror',
      sequence: 4,
      savedAt: 1,
    })
    localStorage.setItem('schatphone:store:system', '{broken')
    idb.payloadByKey.set('schatphone:store:system', mirror)
    const { reconcilePersistedStateLayers } = await importPersistence()

    const result = await reconcilePersistedStateLayers('store:system', { version: 1 })

    expect(result).toMatchObject({ ok: true, action: 'repaired', sourceLayer: 'indexeddb' })
    expect(localStorage.getItem('schatphone:store:system')).toBe(mirror)
  })

  test.each([
    ['local', 8, 3, 1, 999_999],
    ['indexeddb', 2, 9, 999_999, 1],
  ])(
    'uses higher same-lineage sequence from %s even when savedAt is reversed',
    async (winner, localSequence, mirrorSequence, localSavedAt, mirrorSavedAt) => {
      const idb = installIndexedDbMock()
      const local = makeRaw({
        marker: winner === 'local' ? 'winner' : 'loser',
        lineage: 'shared-lineage',
        sequence: localSequence,
        savedAt: localSavedAt,
      })
      const mirror = makeRaw({
        marker: winner === 'indexeddb' ? 'winner' : 'loser',
        lineage: 'shared-lineage',
        sequence: mirrorSequence,
        savedAt: mirrorSavedAt,
      })
      localStorage.setItem('schatphone:store:system', local)
      idb.payloadByKey.set('schatphone:store:system', mirror)
      const { reconcilePersistedStateLayers } = await importPersistence()

      const result = await reconcilePersistedStateLayers('store:system', { version: 1 })
      const expected = winner === 'local' ? local : mirror

      expect(result).toMatchObject({ ok: true, sourceLayer: winner, reason: 'higher_sequence' })
      expect(localStorage.getItem('schatphone:store:system')).toBe(expected)
      expect(idb.payloadByKey.get('schatphone:store:system')).toBe(expected)
    },
  )

  test.each([
    ['generation_conflict', 'same', 2, 'same', 2],
    ['lineage_conflict', 'left', 2, 'right', 7],
  ])('blocks %s with zero writes', async (reason, localLineage, localSequence, mirrorLineage, mirrorSequence) => {
    const idb = installIndexedDbMock()
    const local = makeRaw({ marker: 'local', lineage: localLineage, sequence: localSequence })
    const mirror = makeRaw({ marker: 'mirror', lineage: mirrorLineage, sequence: mirrorSequence })
    localStorage.setItem('schatphone:store:system', local)
    idb.payloadByKey.set('schatphone:store:system', mirror)
    const { reconcilePersistedStateLayers } = await importPersistence()

    const result = await reconcilePersistedStateLayers('store:system', { version: 1 })

    expect(result).toMatchObject({ ok: false, action: 'skipped', reason })
    expect(localStorage.getItem('schatphone:store:system')).toBe(local)
    expect(idb.payloadByKey.get('schatphone:store:system')).toBe(mirror)
  })

  test('adopts a fresh lineage when divergent lineages carry canonical-equal data', async () => {
    const idb = installIndexedDbMock()
    localStorage.setItem(
      'schatphone:store:system',
      makeRaw({ marker: 'equal', lineage: 'left', sequence: 8, savedAt: 900 }),
    )
    idb.payloadByKey.set(
      'schatphone:store:system',
      makeRaw({ marker: 'equal', lineage: 'right', sequence: 1, savedAt: 1 }),
    )
    const { reconcilePersistedStateLayers } = await importPersistence()

    const result = await reconcilePersistedStateLayers('store:system', { version: 1 })
    const local = localStorage.getItem('schatphone:store:system')

    expect(result).toMatchObject({ ok: true, action: 'adopted' })
    expect(idb.payloadByKey.get('schatphone:store:system')).toBe(local)
    expect(JSON.parse(local).generation).toMatchObject({ sequence: 1 })
    expect(JSON.parse(local).generation.lineage).not.toBe('left')
    expect(JSON.parse(local).generation.lineage).not.toBe('right')
  })

  test.each([
    ['ordered-equal', true, 'repaired'],
    ['ordered-different', false, 'skipped'],
    ['legacy-equal', true, 'adopted'],
    ['legacy-different', false, 'skipped'],
  ])('handles %s without inventing a timestamp winner', async (scenario, ok, action) => {
    const idb = installIndexedDbMock()
    const ordered = scenario.startsWith('ordered')
    const equal = scenario.endsWith('equal')
    const local = makeRaw({
      marker: 'local',
      ...(ordered ? { lineage: 'ordered', sequence: 3 } : {}),
      savedAt: 999,
    })
    const mirror = makeRaw({ marker: equal ? 'local' : 'mirror', savedAt: 1 })
    localStorage.setItem('schatphone:store:system', local)
    idb.payloadByKey.set('schatphone:store:system', mirror)
    const { reconcilePersistedStateLayers } = await importPersistence()

    const result = await reconcilePersistedStateLayers('store:system', { version: 1 })

    expect(result.ok).toBe(ok)
    expect(result.action).toBe(action)
    if (!ok) expect(result.reason).toBe('legacy_freshness_unknown')
  })

  test('detects source_changed before repair and performs zero writes', async () => {
    const idb = installIndexedDbMock()
    const local = makeRaw({ marker: 'winner', lineage: 'shared', sequence: 5 })
    const mirror = makeRaw({ marker: 'loser', lineage: 'shared', sequence: 2 })
    const changed = makeRaw({ marker: 'changed', lineage: 'shared', sequence: 6 })
    localStorage.setItem('schatphone:store:system', local)
    idb.payloadByKey.set('schatphone:store:system', mirror)
    idb.onRead(({ readCount, payloadByKey }) => {
      if (readCount === 2) payloadByKey.set('schatphone:store:system', changed)
    })
    const { reconcilePersistedStateLayers } = await importPersistence()

    const result = await reconcilePersistedStateLayers('store:system', { version: 1 })

    expect(result).toMatchObject({ ok: false, action: 'skipped', reason: 'source_changed' })
    expect(localStorage.getItem('schatphone:store:system')).toBe(local)
    expect(idb.payloadByKey.get('schatphone:store:system')).toBe(changed)
  })

  test('reports partial repair while retaining the winner bytes', async () => {
    const idb = installIndexedDbMock()
    const local = makeRaw({ marker: 'winner', lineage: 'shared', sequence: 5 })
    const mirror = makeRaw({ marker: 'loser', lineage: 'shared', sequence: 2 })
    localStorage.setItem('schatphone:store:system', local)
    idb.payloadByKey.set('schatphone:store:system', mirror)
    idb.failWritesWith(new DOMException('failed', 'UnknownError'))
    const { reconcilePersistedStateLayers } = await importPersistence()

    const result = await reconcilePersistedStateLayers('store:system', { version: 1 })

    expect(result).toMatchObject({
      ok: false,
      action: 'partial',
      reason: 'write_failed',
      winner: 'local',
      winnerRaw: local,
    })
    expect(localStorage.getItem('schatphone:store:system')).toBe(local)
    expect(idb.payloadByKey.get('schatphone:store:system')).toBe(mirror)
  })

  test('serves a proven mirror winner after local repair fails without hydrating stale local data', async () => {
    const idb = installIndexedDbMock()
    const local = makeRaw({ marker: 'stale-local', lineage: 'shared', sequence: 2 })
    const mirror = makeRaw({ marker: 'mirror-winner', lineage: 'shared', sequence: 5 })
    localStorage.setItem('schatphone:store:system', local)
    idb.payloadByKey.set('schatphone:store:system', mirror)
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'schatphone:store:system') {
        throw new DOMException('quota', 'QuotaExceededError')
      }
      return originalSetItem.call(this, key, value)
    })
    const {
      readPersistedState,
      readPersistedStateAsync,
      reconcilePersistedStateLayers,
    } = await importPersistence()

    const result = await reconcilePersistedStateLayers('store:system', { version: 1 })

    expect(result).toMatchObject({
      ok: false,
      action: 'partial',
      reason: 'write_failed',
      winner: 'indexeddb',
      winnerRaw: mirror,
    })
    expect(localStorage.getItem('schatphone:store:system')).toBe(local)
    expect(readPersistedState('store:system', { version: 1 })).toBe(null)
    await expect(readPersistedStateAsync('store:system', { version: 1 })).resolves.toEqual({
      marker: 'mirror-winner',
    })
  })

  test('keeps Book inspect-only and byte-identical while preparing other targets', async () => {
    const idb = installIndexedDbMock()
    const bookLocal = makeRaw({ marker: 'book-local', savedAt: 1 })
    const bookMirror = makeRaw({ marker: 'book-mirror', savedAt: 999 })
    localStorage.setItem('schatphone:store:book', bookLocal)
    idb.payloadByKey.set('schatphone:store:book', bookMirror)
    const { preparePersistedStateLayers } = await importPersistence()

    const result = await preparePersistedStateLayers([
      { key: 'store:system', version: 1 },
      { key: 'store:book', version: 1, inspectOnly: true },
    ])

    expect(result).toMatchObject({ total: 2, mutable: 1, inspectOnly: 1 })
    expect(localStorage.getItem('schatphone:store:book')).toBe(bookLocal)
    expect(idb.payloadByKey.get('schatphone:store:book')).toBe(bookMirror)
  })

  test('observes a non-Book read-only baseline without repairing either layer', async () => {
    const idb = installIndexedDbMock()
    const local = makeRaw({ marker: 'local-older', lineage: 'shared', sequence: 1 })
    const mirror = makeRaw({ marker: 'mirror-newer', lineage: 'shared', sequence: 2 })
    localStorage.setItem('schatphone:store:system', local)
    idb.payloadByKey.set('schatphone:store:system', mirror)
    const { preparePersistedStateLayers, writePersistedState } = await importPersistence()

    const result = await preparePersistedStateLayers([
      { key: 'store:system', version: 1, inspectOnly: true },
    ])

    expect(result).toMatchObject({ ok: true, total: 1, mutable: 0, inspectOnly: 1 })
    expect(result.results[0]).toMatchObject({
      action: 'inspect_only',
      promotionSafe: false,
    })
    expect(localStorage.getItem('schatphone:store:system')).toBe(local)
    expect(idb.payloadByKey.get('schatphone:store:system')).toBe(mirror)
    expect(writePersistedState('store:system', { marker: 'must-stay-blocked' })).toMatchObject({
      ok: false,
      error: 'reconciliation_required',
      attempted: false,
    })
  })
})

describe('persistence bootstrap ordering', () => {
  test('acquires writer access before preparing 17 targets, app creation, and mount', async () => {
    vi.resetModules()
    const events = []
    const initializeWriter = vi.fn(async () => {
      events.push('writer')
      return { ok: true, writable: true }
    })
    const prepare = vi.fn(async (targets) => {
      events.push('prepare')
      expect(targets).toHaveLength(17)
      expect(targets.filter((target) => target.inspectOnly)).toEqual([
        expect.objectContaining({ key: 'store:book' }),
      ])
      expect(targets.filter((target) => !target.inspectOnly)).toHaveLength(16)
      return { ok: true }
    })
    vi.doMock('../src/lib/persistence', () => ({ preparePersistedStateLayers: prepare }))
    vi.doMock('../src/lib/current-save-write-runtime', () => ({
      initializeCurrentSaveWriter: initializeWriter,
    }))
    vi.doMock('vue', () => ({
      createApp: () => {
        events.push('createApp')
        return {
          use: () => {},
          mount: () => events.push('mount'),
        }
      },
    }))
    vi.doMock('pinia', () => ({ createPinia: () => ({}) }))
    vi.doMock('../src/App.vue', () => ({ default: {} }))
    vi.doMock('../src/router', () => ({ default: {} }))
    vi.doMock('../src/lib/push', () => ({ ensurePushServiceWorkerRegistration: vi.fn() }))

    await import('../src/main.js')

    expect(events.slice(0, 4)).toEqual(['writer', 'prepare', 'createApp', 'mount'])
    expect(initializeWriter).toHaveBeenCalledTimes(1)
    expect(prepare).toHaveBeenCalledTimes(1)
  })

  test('keeps every persistence target inspect-only when writer access is denied', async () => {
    vi.resetModules()
    const prepare = vi.fn(async (targets) => {
      expect(targets).toHaveLength(17)
      expect(targets.every((target) => target.inspectOnly === true)).toBe(true)
      return { ok: true }
    })
    vi.doMock('../src/lib/persistence', () => ({ preparePersistedStateLayers: prepare }))
    vi.doMock('../src/lib/current-save-write-runtime', () => ({
      initializeCurrentSaveWriter: vi.fn(async () => ({ ok: false, readOnly: true })),
    }))
    vi.doMock('vue', () => ({
      createApp: () => ({ use: () => {}, mount: () => {} }),
    }))
    vi.doMock('pinia', () => ({ createPinia: () => ({}) }))
    vi.doMock('../src/App.vue', () => ({ default: {} }))
    vi.doMock('../src/router', () => ({ default: {} }))
    vi.doMock('../src/lib/push', () => ({ ensurePushServiceWorkerRegistration: vi.fn() }))

    await import('../src/main.js')

    expect(prepare).toHaveBeenCalledTimes(1)
  })
})
