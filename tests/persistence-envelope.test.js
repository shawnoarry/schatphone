import { beforeEach, describe, expect, test } from 'vitest'
import {
  decodePersistedEnvelope,
  encodePersistedEnvelope,
  inspectPersistedStateLayers,
} from '../src/lib/persistence'

describe('persistence envelope helpers', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    })
  })

  test('encodes payload with version and savedAt', () => {
    const envelope = encodePersistedEnvelope({ foo: 1 }, { version: 3, savedAt: 12345 })
    expect(envelope).toEqual({
      version: 3,
      savedAt: 12345,
      data: { foo: 1 },
    })
  })

  test('decodes backward-compatible plain object payload', () => {
    const payload = { legacy: true, count: 2 }
    expect(decodePersistedEnvelope(payload)).toEqual(payload)
  })

  test('optionally encodes stable generation metadata without changing legacy helpers', () => {
    expect(
      encodePersistedEnvelope(
        { foo: 1 },
        { version: 1, savedAt: 10, generation: { lineage: 'lineage-a', sequence: 2 } },
      ),
    ).toEqual({
      version: 1,
      savedAt: 10,
      generation: { lineage: 'lineage-a', sequence: 2 },
      data: { foo: 1 },
    })
  })

  test.each([
    ['bare payload', JSON.stringify({ legacy: true })],
    ['old envelope', JSON.stringify({ version: 1, savedAt: 5, data: { legacy: true } })],
  ])('inspects %s as valid unordered data', async (_label, raw) => {
    localStorage.setItem('schatphone:store:system', raw)
    const report = await inspectPersistedStateLayers('store:system', { version: 1 })

    expect(report.local).toMatchObject({
      parseOk: true,
      decodedOk: true,
      payloadValid: true,
      valid: true,
      order: 'unordered',
      issueCode: '',
    })
  })

  test.each([
    null,
    { lineage: '', sequence: 1 },
    { lineage: 'lineage-a', sequence: 0 },
    { lineage: 'lineage-a', sequence: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects malformed generation metadata %#', async (generation) => {
    localStorage.setItem(
      'schatphone:store:system',
      JSON.stringify({ version: 1, savedAt: 5, generation, data: { legacy: true } }),
    )
    const report = await inspectPersistedStateLayers('store:system', { version: 1 })

    expect(report.local).toMatchObject({
      parseOk: true,
      decodedOk: true,
      payloadValid: true,
      valid: true,
      order: 'unordered',
      orderingValid: false,
      issueCode: 'generation_invalid',
    })
  })

  test('decodes envelope with matching version', () => {
    const payload = {
      version: 2,
      savedAt: 100,
      data: { hello: 'world' },
    }
    expect(decodePersistedEnvelope(payload, { version: 2 })).toEqual({ hello: 'world' })
  })

  test('returns null when version mismatch and no migrate handler', () => {
    const payload = {
      version: 1,
      savedAt: 100,
      data: { old: true },
    }
    expect(decodePersistedEnvelope(payload, { version: 2 })).toBe(null)
  })

  test('uses migrate handler on version mismatch', () => {
    const payload = {
      version: 1,
      savedAt: 100,
      data: { old: true },
    }
    const migrated = decodePersistedEnvelope(payload, {
      version: 2,
      migrate: ({ version, data }) => ({
        migratedFrom: version,
        next: data.old,
      }),
    })
    expect(migrated).toEqual({
      migratedFrom: 1,
      next: true,
    })
  })
})
