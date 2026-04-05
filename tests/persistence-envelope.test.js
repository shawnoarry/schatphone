import { describe, expect, test } from 'vitest'
import { decodePersistedEnvelope, encodePersistedEnvelope } from '../src/lib/persistence'

describe('persistence envelope helpers', () => {
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
