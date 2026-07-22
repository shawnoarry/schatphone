import { describe, expect, test } from 'vitest'
import {
  PERSISTENCE_REPOSITORY_DATABASE_NAME,
  PERSISTENCE_REPOSITORY_DATABASE_VERSION,
  PERSISTENCE_REPOSITORY_SCHEMA,
  REPOSITORY_META_KEYS,
  canonicalStringify,
  openPersistenceRepositoryDatabase,
  sha256Canonical,
} from '../src/lib/persistence-repository-schema'

describe('persistence repository schema contract', () => {
  test('declares the exact version-one stores, key paths, and indexes', () => {
    expect(PERSISTENCE_REPOSITORY_DATABASE_NAME).toBe('schatphone-repository')
    expect(PERSISTENCE_REPOSITORY_DATABASE_VERSION).toBe(1)
    expect(PERSISTENCE_REPOSITORY_SCHEMA).toEqual([
      {
        name: 'record_versions',
        keyPath: ['ownerId', 'dataClassId', 'recordId', 'revision'],
        indexes: [
          { name: 'by_record', keyPath: ['ownerId', 'dataClassId', 'recordId'], unique: false, multiEntry: false },
          { name: 'by_digest', keyPath: 'integrity.sha256', unique: false, multiEntry: false },
        ],
      },
      {
        name: 'generation_records',
        keyPath: ['generationId', 'ownerId', 'dataClassId', 'recordId'],
        indexes: [
          { name: 'by_generation_owner_class', keyPath: ['generationId', 'ownerId', 'dataClassId'], unique: false, multiEntry: false },
          { name: 'by_generation_owner_class_position', keyPath: ['generationId', 'ownerId', 'dataClassId', 'indexKeys.position', 'recordId'], unique: false, multiEntry: false },
          { name: 'by_generation_owner_class_updated', keyPath: ['generationId', 'ownerId', 'dataClassId', 'indexKeys.updatedAt', 'recordId'], unique: false, multiEntry: false },
          { name: 'by_generation_owner_class_category', keyPath: ['generationId', 'ownerId', 'dataClassId', 'indexKeys.category', 'indexKeys.position', 'recordId'], unique: false, multiEntry: false },
          { name: 'by_generation_owner_class_status', keyPath: ['generationId', 'ownerId', 'dataClassId', 'indexKeys.status', 'indexKeys.position', 'recordId'], unique: false, multiEntry: false },
        ],
      },
      {
        name: 'generations',
        keyPath: 'generationId',
        indexes: [
          { name: 'by_status_updated', keyPath: ['status', 'updatedAt', 'generationId'], unique: false, multiEntry: false },
          { name: 'by_operation', keyPath: 'operationId', unique: true, multiEntry: false },
        ],
      },
      { name: 'repository_meta', keyPath: 'key', indexes: [] },
      {
        name: 'operation_journal',
        keyPath: 'operationId',
        indexes: [
          { name: 'by_phase_updated', keyPath: ['phase', 'updatedAt', 'operationId'], unique: false, multiEntry: false },
          { name: 'by_candidate', keyPath: 'candidateGenerationId', unique: false, multiEntry: false },
        ],
      },
      {
        name: 'write_leases',
        keyPath: 'scopeKey',
        indexes: [
          { name: 'by_expires_at', keyPath: 'expiresAt', unique: false, multiEntry: false },
        ],
      },
    ])
    expect(REPOSITORY_META_KEYS).toEqual([
      'repository-schema',
      'container-instance',
      'active-generation',
      'persistent-storage-request',
    ])
  })

  test('canonicalizes sorted object keys while preserving array order', async () => {
    const first = { z: 3, nested: { b: 2, a: 1 }, array: [{ y: 2, x: 1 }, 'next'] }
    const second = { array: [{ x: 1, y: 2 }, 'next'], nested: { a: 1, b: 2 }, z: 3 }

    expect(canonicalStringify(first)).toBe(
      '{"array":[{"x":1,"y":2},"next"],"nested":{"a":1,"b":2},"z":3}',
    )
    expect(await sha256Canonical(first)).toBe(await sha256Canonical(second))
    expect(await sha256Canonical({ values: [1, 2] })).not.toBe(
      await sha256Canonical({ values: [2, 1] }),
    )
  })

  test('reports the absent Node carrier instead of pretending physical IndexedDB coverage', async () => {
    expect(globalThis.indexedDB).toBeUndefined()
    await expect(openPersistenceRepositoryDatabase()).rejects.toMatchObject({
      code: 'carrier_unavailable',
    })
  })
})
