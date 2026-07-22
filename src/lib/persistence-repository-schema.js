export const PERSISTENCE_REPOSITORY_DATABASE_NAME = 'schatphone-repository'
export const PERSISTENCE_REPOSITORY_DATABASE_VERSION = 1
export const PERSISTENCE_REPOSITORY_CONTRACT_VERSION = 1

export const RECORD_VERSIONS_STORE = 'record_versions'
export const GENERATION_RECORDS_STORE = 'generation_records'
export const GENERATIONS_STORE = 'generations'
export const REPOSITORY_META_STORE = 'repository_meta'
export const OPERATION_JOURNAL_STORE = 'operation_journal'
export const WRITE_LEASES_STORE = 'write_leases'

const index = (name, keyPath, options = {}) => Object.freeze({
  name,
  keyPath,
  unique: options.unique === true,
  multiEntry: false,
})

export const PERSISTENCE_REPOSITORY_SCHEMA = Object.freeze([
  Object.freeze({
    name: RECORD_VERSIONS_STORE,
    keyPath: Object.freeze(['ownerId', 'dataClassId', 'recordId', 'revision']),
    indexes: Object.freeze([
      index('by_record', Object.freeze(['ownerId', 'dataClassId', 'recordId'])),
      index('by_digest', 'integrity.sha256'),
    ]),
  }),
  Object.freeze({
    name: GENERATION_RECORDS_STORE,
    keyPath: Object.freeze(['generationId', 'ownerId', 'dataClassId', 'recordId']),
    indexes: Object.freeze([
      index('by_generation_owner_class', Object.freeze(['generationId', 'ownerId', 'dataClassId'])),
      index(
        'by_generation_owner_class_position',
        Object.freeze(['generationId', 'ownerId', 'dataClassId', 'indexKeys.position', 'recordId']),
      ),
      index(
        'by_generation_owner_class_updated',
        Object.freeze(['generationId', 'ownerId', 'dataClassId', 'indexKeys.updatedAt', 'recordId']),
      ),
      index(
        'by_generation_owner_class_category',
        Object.freeze([
          'generationId',
          'ownerId',
          'dataClassId',
          'indexKeys.category',
          'indexKeys.position',
          'recordId',
        ]),
      ),
      index(
        'by_generation_owner_class_status',
        Object.freeze([
          'generationId',
          'ownerId',
          'dataClassId',
          'indexKeys.status',
          'indexKeys.position',
          'recordId',
        ]),
      ),
    ]),
  }),
  Object.freeze({
    name: GENERATIONS_STORE,
    keyPath: 'generationId',
    indexes: Object.freeze([
      index('by_status_updated', Object.freeze(['status', 'updatedAt', 'generationId'])),
      index('by_operation', 'operationId', { unique: true }),
    ]),
  }),
  Object.freeze({
    name: REPOSITORY_META_STORE,
    keyPath: 'key',
    indexes: Object.freeze([]),
  }),
  Object.freeze({
    name: OPERATION_JOURNAL_STORE,
    keyPath: 'operationId',
    indexes: Object.freeze([
      index('by_phase_updated', Object.freeze(['phase', 'updatedAt', 'operationId'])),
      index('by_candidate', 'candidateGenerationId'),
    ]),
  }),
  Object.freeze({
    name: WRITE_LEASES_STORE,
    keyPath: 'scopeKey',
    indexes: Object.freeze([index('by_expires_at', 'expiresAt')]),
  }),
])

export const REPOSITORY_META_KEYS = Object.freeze([
  'repository-schema',
  'container-instance',
  'active-generation',
  'persistent-storage-request',
])

const keyPathEquals = (left, right) => JSON.stringify(left) === JSON.stringify(right)

const listNames = (domStringList) => Array.from(domStringList || []).sort()

const readActualSchema = (database) =>
  listNames(database.objectStoreNames).map((storeName) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    return {
      name: storeName,
      keyPath: store.keyPath,
      indexes: listNames(store.indexNames).map((indexName) => {
        const actualIndex = store.index(indexName)
        return {
          name: indexName,
          keyPath: actualIndex.keyPath,
          unique: actualIndex.unique,
          multiEntry: actualIndex.multiEntry,
        }
      }),
    }
  })

export const inspectPersistenceRepositorySchema = (database) => {
  const expectedStores = [...PERSISTENCE_REPOSITORY_SCHEMA].sort((left, right) =>
    left.name.localeCompare(right.name),
  ).map((entry) => ({
    ...entry,
    indexes: [...entry.indexes].sort((left, right) => left.name.localeCompare(right.name)),
  }))
  const actualStores = readActualSchema(database)
  const issues = []

  if (database.version !== PERSISTENCE_REPOSITORY_DATABASE_VERSION) {
    issues.push({
      code: 'database_version_mismatch',
      expected: PERSISTENCE_REPOSITORY_DATABASE_VERSION,
      actual: database.version,
    })
  }

  const expectedNames = expectedStores.map((entry) => entry.name)
  const actualNames = actualStores.map((entry) => entry.name)
  if (!keyPathEquals(actualNames, expectedNames)) {
    issues.push({ code: 'object_store_set_mismatch', expected: expectedNames, actual: actualNames })
  }

  for (const expectedStore of expectedStores) {
    const actualStore = actualStores.find((entry) => entry.name === expectedStore.name)
    if (!actualStore) continue
    if (!keyPathEquals(actualStore.keyPath, expectedStore.keyPath)) {
      issues.push({
        code: 'object_store_key_path_mismatch',
        storeName: expectedStore.name,
        expected: expectedStore.keyPath,
        actual: actualStore.keyPath,
      })
    }

    const expectedIndexes = expectedStore.indexes
    const actualIndexes = [...actualStore.indexes].sort((left, right) =>
      left.name.localeCompare(right.name),
    )
    if (!keyPathEquals(actualIndexes, expectedIndexes)) {
      issues.push({
        code: 'object_store_index_mismatch',
        storeName: expectedStore.name,
        expected: expectedIndexes,
        actual: actualIndexes,
      })
    }
  }

  return { ok: issues.length === 0, issues, expected: expectedStores, actual: actualStores }
}

const createIndexes = (store, descriptor) => {
  for (const indexDescriptor of descriptor.indexes) {
    store.createIndex(indexDescriptor.name, indexDescriptor.keyPath, {
      unique: indexDescriptor.unique,
      multiEntry: indexDescriptor.multiEntry,
    })
  }
}

const createVersionOneStores = (database) => {
  const recordVersions = database.createObjectStore(RECORD_VERSIONS_STORE, {
    keyPath: ['ownerId', 'dataClassId', 'recordId', 'revision'],
  })
  const generationRecords = database.createObjectStore(GENERATION_RECORDS_STORE, {
    keyPath: ['generationId', 'ownerId', 'dataClassId', 'recordId'],
  })
  const generations = database.createObjectStore(GENERATIONS_STORE, { keyPath: 'generationId' })
  const repositoryMeta = database.createObjectStore(REPOSITORY_META_STORE, { keyPath: 'key' })
  const operationJournal = database.createObjectStore(OPERATION_JOURNAL_STORE, {
    keyPath: 'operationId',
  })
  const writeLeases = database.createObjectStore(WRITE_LEASES_STORE, { keyPath: 'scopeKey' })

  for (const [store, storeName] of [
    [recordVersions, RECORD_VERSIONS_STORE],
    [generationRecords, GENERATION_RECORDS_STORE],
    [generations, GENERATIONS_STORE],
    [repositoryMeta, REPOSITORY_META_STORE],
    [operationJournal, OPERATION_JOURNAL_STORE],
    [writeLeases, WRITE_LEASES_STORE],
  ]) {
    createIndexes(store, PERSISTENCE_REPOSITORY_SCHEMA.find((entry) => entry.name === storeName))
  }
}

const requestResult = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('indexeddb_request_failed'))
  })

export class PersistenceRepositorySchemaError extends Error {
  constructor(code, details = {}) {
    super(code)
    this.name = 'PersistenceRepositorySchemaError'
    this.code = code
    this.details = details
  }
}

export const openPersistenceRepositoryDatabase = ({
  databaseName = PERSISTENCE_REPOSITORY_DATABASE_NAME,
  inventoryVersion = 2,
  containerInstanceId = globalThis.crypto?.randomUUID?.() || `container-${Date.now()}`,
} = {}) => {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new PersistenceRepositorySchemaError('carrier_unavailable'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, PERSISTENCE_REPOSITORY_DATABASE_VERSION)

    request.onupgradeneeded = (event) => {
      const database = request.result
      if (event.oldVersion !== 0) {
        request.transaction.abort()
        return
      }
      createVersionOneStores(database)
      const meta = request.transaction.objectStore(REPOSITORY_META_STORE)
      meta.put({
        key: 'repository-schema',
        databaseVersion: PERSISTENCE_REPOSITORY_DATABASE_VERSION,
        contractVersion: PERSISTENCE_REPOSITORY_CONTRACT_VERSION,
        inventoryVersion,
      })
      meta.put({ key: 'container-instance', containerInstanceId, createdAt: Date.now() })
    }

    request.onerror = () => {
      const code = request.error?.name === 'VersionError' ? 'schema_drift' : 'carrier_unavailable'
      reject(new PersistenceRepositorySchemaError(code, { cause: request.error?.name || '' }))
    }
    request.onblocked = () => reject(new PersistenceRepositorySchemaError('carrier_busy'))
    request.onsuccess = () => {
      const database = request.result
      const inspection = inspectPersistenceRepositorySchema(database)
      if (!inspection.ok) {
        database.close()
        reject(new PersistenceRepositorySchemaError('schema_drift', inspection))
        return
      }
      database.onversionchange = () => database.close()
      resolve(database)
    }
  })
}

export const deletePersistenceRepositoryDatabase = ({
  databaseName = PERSISTENCE_REPOSITORY_DATABASE_NAME,
} = {}) => {
  if (typeof indexedDB === 'undefined') return Promise.resolve(false)
  return requestResult(indexedDB.deleteDatabase(databaseName)).then(() => true)
}

const canonicalize = (value, stack = new WeakSet()) => {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return null
    return value
  }
  if (stack.has(value)) throw new TypeError('canonical_json_cycle')
  stack.add(value)
  const result = Array.isArray(value)
    ? value.map((entry) => (entry === undefined ? null : canonicalize(entry, stack)))
    : Object.keys(value)
        .sort()
        .reduce((output, key) => {
          const entry = value[key]
          if (entry !== undefined && typeof entry !== 'function' && typeof entry !== 'symbol') {
            output[key] = canonicalize(entry, stack)
          }
          return output
        }, {})
  stack.delete(value)
  return result
}

export const canonicalStringify = (value) => JSON.stringify(canonicalize(value))

export const sha256Canonical = async (value) => {
  if (!globalThis.crypto?.subtle) {
    throw new PersistenceRepositorySchemaError('digest_unavailable')
  }
  const bytes = new TextEncoder().encode(canonicalStringify(value))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const sha256Text = async (value) => {
  if (!globalThis.crypto?.subtle) {
    throw new PersistenceRepositorySchemaError('digest_unavailable')
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
