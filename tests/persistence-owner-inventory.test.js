import { readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  PERSISTENCE_OWNER_DATA_CLASSES,
  PERSISTENCE_PHYSICAL_CARRIERS,
  PERSISTED_STATE_AUDIT_TARGETS,
  PERSISTED_STORE_CARRIERS,
  getBackupRelevantPersistenceDataClasses,
} from '../src/lib/persistence-owner-inventory'
import {
  LEGACY_V2_BACKUP_SECTION_REGISTRY,
  inspectLegacyV2BackupPayloadShape,
} from '../src/lib/backup-section-registry'

const projectRoot = process.cwd()

const listSourceFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) return listSourceFiles(absolutePath)
    if (['persistence-owner-inventory.js', 'backup-section-registry.js'].includes(entry.name)) {
      return []
    }
    return ['.js', '.vue'].includes(extname(entry.name)) ? [absolutePath] : []
  })

const readSource = (relativePath) => readFileSync(join(projectRoot, relativePath), 'utf8')

const collectMatches = (pattern) => {
  const matches = new Set()
  for (const file of listSourceFiles(join(projectRoot, 'src'))) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(pattern)) matches.add(match[1])
  }
  return [...matches].sort()
}

const resolveSourceConstant = (token, constants) => {
  const normalized = token.trim()
  const quoted = normalized.match(/^(['"])(.*)\1$/s)
  if (quoted) return quoted[2]
  if (/^\d+$/.test(normalized)) return Number(normalized)
  return constants.get(normalized)
}

const resolveSourceString = (token, constants) => {
  const resolved = resolveSourceConstant(token, constants)
  return typeof resolved === 'string' && resolved.length > 0
    ? resolved
    : `<unresolved:${token.trim()}>`
}

const parseIndexedDbDefinitions = (source, sourceFile = 'inline') => {
  const constants = new Map()
  const constantPattern = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:(['"])(.*?)\2|(\d+))/g

  for (const match of source.matchAll(constantPattern)) {
    constants.set(match[1], match[4] == null ? match[3] : Number(match[4]))
  }

  const defaultParameterPattern = /\b([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\b/g
  for (const match of source.matchAll(defaultParameterPattern)) {
    if (constants.has(match[2])) constants.set(match[1], constants.get(match[2]))
  }

  const objectStoreNames = [...source.matchAll(/createObjectStore\(\s*([^,\s)]+)/g)]
    .map((match) => resolveSourceString(match[1], constants))
    .sort()

  const definitions = [
    ...source.matchAll(/(?:window\.)?indexedDB\.open\(\s*([^,\s)]+)\s*,\s*([^)]+?)\s*\)/g),
  ].map((match) => ({
    sourceFile,
    databaseName: resolveSourceString(match[1], constants),
    databaseVersion: resolveSourceConstant(match[2], constants),
    objectStoreNames: [...objectStoreNames],
  }))

  if (definitions.length === 0 && objectStoreNames.length > 0) {
    return [
      {
        sourceFile,
        databaseName: '<unresolved:no-indexeddb-open>',
        databaseVersion: undefined,
        objectStoreNames,
      },
    ]
  }
  return definitions
}

const indexedDbDefinitionKey = (entry) => `${entry.sourceFile}\u0000${entry.databaseName}`

const duplicateValues = (values) => {
  const counts = values.reduce((result, value) => {
    result.set(value, (result.get(value) || 0) + 1)
    return result
  }, new Map())
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }))
}

const aggregateExpectedIndexedDbDefinitions = (carriers) => {
  const groups = new Map()
  for (const carrier of carriers) {
    const key = indexedDbDefinitionKey(carrier)
    const group = groups.get(key) || {
      sourceFile: carrier.sourceFile,
      databaseName: carrier.databaseName,
      versions: [],
      objectStoreNames: [],
    }
    group.versions.push(carrier.databaseVersion)
    group.objectStoreNames.push(carrier.objectStoreName)
    groups.set(key, group)
  }

  const versionConflicts = []
  const duplicateStoreDeclarations = []
  const definitions = []
  for (const group of groups.values()) {
    const versions = [...new Set(group.versions)]
    if (versions.length !== 1) {
      versionConflicts.push({
        sourceFile: group.sourceFile,
        databaseName: group.databaseName,
        versions: versions.sort((left, right) => left - right),
      })
    }
    for (const duplicate of duplicateValues(group.objectStoreNames)) {
      duplicateStoreDeclarations.push({
        sourceFile: group.sourceFile,
        databaseName: group.databaseName,
        objectStoreName: duplicate.value,
        count: duplicate.count,
      })
    }
    definitions.push({
      sourceFile: group.sourceFile,
      databaseName: group.databaseName,
      databaseVersion: versions[0],
      objectStoreNames: [...new Set(group.objectStoreNames)].sort(),
    })
  }

  return {
    definitions: definitions.sort((left, right) =>
      indexedDbDefinitionKey(left).localeCompare(indexedDbDefinitionKey(right)),
    ),
    versionConflicts,
    duplicateStoreDeclarations,
  }
}

const inspectIndexedDbDefinitionCoverage = (actual, expectedCarriers) => {
  const expectedAggregation = aggregateExpectedIndexedDbDefinitions(expectedCarriers)
  const expected = expectedAggregation.definitions
  const actualByKey = new Map(actual.map((entry) => [indexedDbDefinitionKey(entry), entry]))
  const expectedByKey = new Map(expected.map((entry) => [indexedDbDefinitionKey(entry), entry]))
  const databaseCounts = actual.reduce((counts, entry) => {
    const key = indexedDbDefinitionKey(entry)
    counts.set(key, (counts.get(key) || 0) + 1)
    return counts
  }, new Map())
  const missingDatabases = []
  const unexpectedDatabases = []
  const duplicateDatabases = [...databaseCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const entry = actualByKey.get(key)
      return { sourceFile: entry.sourceFile, databaseName: entry.databaseName, count }
    })
  const duplicateActualStores = actual.flatMap((entry) =>
    duplicateValues(entry.objectStoreNames).map((duplicate) => ({
      sourceFile: entry.sourceFile,
      databaseName: entry.databaseName,
      objectStoreName: duplicate.value,
      count: duplicate.count,
    })),
  )
  const versionMismatches = []
  const missingStores = []
  const unexpectedStores = []

  for (const [key, expectedEntry] of expectedByKey) {
    const actualEntry = actualByKey.get(key)
    if (!actualEntry) {
      missingDatabases.push({
        sourceFile: expectedEntry.sourceFile,
        databaseName: expectedEntry.databaseName,
      })
      continue
    }
    if (actualEntry.databaseVersion !== expectedEntry.databaseVersion) {
      versionMismatches.push({
        sourceFile: expectedEntry.sourceFile,
        databaseName: expectedEntry.databaseName,
        expected: expectedEntry.databaseVersion,
        actual: actualEntry.databaseVersion,
      })
    }

    const actualStores = new Set(actualEntry.objectStoreNames)
    const expectedStores = new Set(expectedEntry.objectStoreNames)
    for (const objectStoreName of expectedStores) {
      if (!actualStores.has(objectStoreName)) {
        missingStores.push({
          sourceFile: expectedEntry.sourceFile,
          databaseName: expectedEntry.databaseName,
          objectStoreName,
        })
      }
    }
    for (const objectStoreName of actualStores) {
      if (!expectedStores.has(objectStoreName)) {
        unexpectedStores.push({
          sourceFile: actualEntry.sourceFile,
          databaseName: actualEntry.databaseName,
          objectStoreName,
        })
      }
    }
  }

  for (const [key, entry] of actualByKey) {
    if (!expectedByKey.has(key)) {
      unexpectedDatabases.push({ sourceFile: entry.sourceFile, databaseName: entry.databaseName })
    }
  }

  const result = {
    missingDatabases,
    unexpectedDatabases,
    duplicateDatabases,
    duplicateActualStores,
    inventoryVersionConflicts: expectedAggregation.versionConflicts,
    duplicateInventoryStores: expectedAggregation.duplicateStoreDeclarations,
    versionMismatches,
    missingStores,
    unexpectedStores,
  }
  return {
    ok: Object.values(result).every((items) => items.length === 0),
    ...result,
  }
}

describe('canonical persistence-owner inventory', () => {
  test('classifies every persisted store key found in source and keeps the 17-target audit order stable', () => {
    const sourceStoreKeys = collectMatches(/["'`](store:[a-z0-9-]+)["'`]/g)
    const inventoriedStoreKeys = PERSISTED_STORE_CARRIERS.map((entry) => entry.storageKey).sort()

    expect(sourceStoreKeys).toEqual(inventoriedStoreKeys)
    expect(PERSISTED_STATE_AUDIT_TARGETS).toHaveLength(17)
    expect(PERSISTED_STATE_AUDIT_TARGETS.map((entry) => entry.key)).toEqual(
      PERSISTED_STORE_CARRIERS.map((entry) => entry.storageKey),
    )
    expect(PERSISTED_STATE_AUDIT_TARGETS.map((entry) => entry.key)).toContain('store:book')

    const mapTarget = PERSISTED_STATE_AUDIT_TARGETS.find((entry) => entry.key === 'store:map')
    expect(mapTarget.migrate({ version: 2, data: { marker: 'legacy-map' } })).toEqual({
      marker: 'legacy-map',
    })
    expect(mapTarget.migrate({ version: 1, data: { marker: 'too-old' } })).toBeNull()

    const simulationTarget = PERSISTED_STATE_AUDIT_TARGETS.find(
      (entry) => entry.key === 'store:simulation',
    )
    expect(simulationTarget.migrate({ version: 1, data: { marker: 'legacy-events' } })).toEqual({
      marker: 'legacy-events',
    })

    for (const carrier of PERSISTED_STORE_CARRIERS) {
      const source = readSource(carrier.sourceFile)
      expect(source).toContain(`'${carrier.storageKey}'`)
      expect(source).toMatch(new RegExp(`STORAGE_VERSION\\s*=\\s*${carrier.schemaVersion}\\b`))
    }
  })

  test('classifies every IndexedDB database/store/version and direct browser-storage key found in source', () => {
    const indexedDbCarriers = PERSISTENCE_PHYSICAL_CARRIERS.filter(
      (entry) => entry.carrierType === 'indexedDB',
    )
    const actualDefinitions = listSourceFiles(join(projectRoot, 'src')).flatMap((absolutePath) => {
      const source = readFileSync(absolutePath, 'utf8')
      if (!/(?:window\.)?indexedDB\.open\s*\(|createObjectStore\s*\(/.test(source)) return []
      const sourceFile = relative(projectRoot, absolutePath).replaceAll('\\', '/')
      return parseIndexedDbDefinitions(source, sourceFile)
    })
    const sourceDirectKeys = collectMatches(/["'`](schatphone:[a-z0-9_:-]+)["'`]/g)
    const inventoriedDirectKeys = PERSISTENCE_PHYSICAL_CARRIERS.map((entry) => entry.fullKey)
      .filter(Boolean)
      .sort()

    expect(inspectIndexedDbDefinitionCoverage(actualDefinitions, indexedDbCarriers)).toEqual({
      ok: true,
      missingDatabases: [],
      unexpectedDatabases: [],
      duplicateDatabases: [],
      duplicateActualStores: [],
      inventoryVersionConflicts: [],
      duplicateInventoryStores: [],
      versionMismatches: [],
      missingStores: [],
      unexpectedStores: [],
    })
    expect(sourceDirectKeys).toEqual(inventoriedDirectKeys)
  })

  test('IndexedDB source parser detects an added object store and a version change', () => {
    const source = `
      const TEST_DB_NAME = 'synthetic-db'
      const TEST_DB_VERSION = 4
      const TEST_DB_STORE = 'records'
      const EXTRA_DB_STORE = 'unexpected'
      window.indexedDB.open(TEST_DB_NAME, TEST_DB_VERSION)
      db.createObjectStore(TEST_DB_STORE, { keyPath: 'id' })
    `
    const expected = [
      {
        sourceFile: 'synthetic.js',
        databaseName: 'synthetic-db',
        databaseVersion: 4,
        objectStoreName: 'records',
      },
    ]

    expect(
      inspectIndexedDbDefinitionCoverage(
        parseIndexedDbDefinitions(source, 'synthetic.js'),
        expected,
      ),
    ).toMatchObject({ ok: true })

    const withExtraStore = `${source}\n      db.createObjectStore(EXTRA_DB_STORE, { keyPath: 'id' })`
    expect(
      inspectIndexedDbDefinitionCoverage(
        parseIndexedDbDefinitions(withExtraStore, 'synthetic.js'),
        expected,
      ),
    ).toMatchObject({
      ok: false,
      unexpectedStores: [
        {
          sourceFile: 'synthetic.js',
          databaseName: 'synthetic-db',
          objectStoreName: 'unexpected',
        },
      ],
    })

    const withVersionChange = source.replace('TEST_DB_VERSION = 4', 'TEST_DB_VERSION = 5')
    expect(
      inspectIndexedDbDefinitionCoverage(
        parseIndexedDbDefinitions(withVersionChange, 'synthetic.js'),
        expected,
      ),
    ).toMatchObject({
      ok: false,
      versionMismatches: [
        {
          sourceFile: 'synthetic.js',
          databaseName: 'synthetic-db',
          expected: 4,
          actual: 5,
        },
      ],
    })
  })

  test('detects an unregistered database discovered in an independent source file', () => {
    const registeredSource = `
      const DB_NAME = 'registered-db'
      const DB_VERSION = 1
      const DB_STORE = 'records'
      indexedDB.open(DB_NAME, DB_VERSION)
      db.createObjectStore(DB_STORE, { keyPath: 'id' })
    `
    const independentSource = `
      const DB_NAME = 'unregistered-db'
      const DB_VERSION = 1
      const DB_STORE = 'other-records'
      indexedDB.open(DB_NAME, DB_VERSION)
      db.createObjectStore(DB_STORE, { keyPath: 'id' })
    `
    const actual = [
      ...parseIndexedDbDefinitions(registeredSource, 'src/lib/registered.js'),
      ...parseIndexedDbDefinitions(independentSource, 'src/new/unregistered.js'),
    ]
    const expectedCarriers = [
      {
        sourceFile: 'src/lib/registered.js',
        databaseName: 'registered-db',
        databaseVersion: 1,
        objectStoreName: 'records',
      },
    ]

    expect(inspectIndexedDbDefinitionCoverage(actual, expectedCarriers)).toMatchObject({
      ok: false,
      unexpectedDatabases: [
        {
          sourceFile: 'src/new/unregistered.js',
          databaseName: 'unregistered-db',
        },
      ],
    })
  })

  test('aggregates multiple inventory stores and rejects duplicate or conflicting declarations', () => {
    const source = `
      const DB_NAME = 'multi-store-db'
      const DB_VERSION = 3
      const FIRST_STORE = 'first'
      const SECOND_STORE = 'second'
      indexedDB.open(DB_NAME, DB_VERSION)
      db.createObjectStore(FIRST_STORE, { keyPath: 'id' })
      db.createObjectStore(SECOND_STORE, { keyPath: 'id' })
    `
    const actual = parseIndexedDbDefinitions(source, 'src/lib/multi-store.js')
    const expectedCarriers = [
      {
        sourceFile: 'src/lib/multi-store.js',
        databaseName: 'multi-store-db',
        databaseVersion: 3,
        objectStoreName: 'first',
      },
      {
        sourceFile: 'src/lib/multi-store.js',
        databaseName: 'multi-store-db',
        databaseVersion: 3,
        objectStoreName: 'second',
      },
    ]

    expect(inspectIndexedDbDefinitionCoverage(actual, expectedCarriers)).toMatchObject({ ok: true })

    expect(
      inspectIndexedDbDefinitionCoverage(actual, [...expectedCarriers, expectedCarriers[0]]),
    ).toMatchObject({
      ok: false,
      duplicateInventoryStores: [
        {
          sourceFile: 'src/lib/multi-store.js',
          databaseName: 'multi-store-db',
          objectStoreName: 'first',
          count: 2,
        },
      ],
    })

    const conflictingVersion = {
      ...expectedCarriers[1],
      databaseVersion: 4,
    }
    expect(
      inspectIndexedDbDefinitionCoverage(actual, [expectedCarriers[0], conflictingVersion]),
    ).toMatchObject({
      ok: false,
      inventoryVersionConflicts: [
        {
          sourceFile: 'src/lib/multi-store.js',
          databaseName: 'multi-store-db',
          versions: [3, 4],
        },
      ],
    })
  })

  test('keeps logical ownership explicit when physical stores carry another module data', () => {
    const contacts = PERSISTENCE_OWNER_DATA_CLASSES.find(
      (entry) => entry.id === 'contacts.role-profiles',
    )
    const worldBook = PERSISTENCE_OWNER_DATA_CLASSES.find(
      (entry) => entry.id === 'worldbook.world-context',
    )
    const reminders = PERSISTENCE_OWNER_DATA_CLASSES.find(
      (entry) => entry.id === 'reminders.reminder-records',
    )
    const calendar = PERSISTENCE_OWNER_DATA_CLASSES.find((entry) => entry.id === 'calendar.events')
    const music = PERSISTENCE_OWNER_DATA_CLASSES.find(
      (entry) => entry.id === 'music.library-and-provider-settings',
    )
    const musicCredentials = PERSISTENCE_OWNER_DATA_CLASSES.find(
      (entry) => entry.id === 'music.credentials',
    )
    const musicLocalMedia = PERSISTENCE_OWNER_DATA_CLASSES.find(
      (entry) => entry.id === 'music.local-media-binaries',
    )
    const musicProviderCache = PERSISTENCE_OWNER_DATA_CLASSES.find(
      (entry) => entry.id === 'music.provider-cache',
    )
    const internalShareDraft = PERSISTENCE_OWNER_DATA_CLASSES.find(
      (entry) => entry.id === 'chat.internal-share-draft',
    )

    expect(contacts).toMatchObject({ logicalOwner: 'Contacts', storageKeys: ['store:chat'] })
    expect(worldBook).toMatchObject({ logicalOwner: 'WorldBook', storageKeys: ['store:system'] })
    expect(reminders).toMatchObject({ logicalOwner: 'Reminders', storageKeys: ['store:reminders'] })
    expect(calendar.referenceRule).toContain('import compatibility only')
    expect(music).toMatchObject({ logicalOwner: 'Music', storageKeys: ['store:system'] })
    expect(musicCredentials).toMatchObject({
      logicalOwner: 'Music',
      backupRequirement: 'excluded',
      physicalCarrierIds: ['local:music-credentials'],
    })
    expect(musicLocalMedia).toMatchObject({
      logicalOwner: 'Music',
      backupRequirement: 'excluded',
      physicalCarrierIds: ['idb:music-local-media'],
      durability: 'durable-authoritative-device-binary',
    })
    expect(musicProviderCache).toMatchObject({
      logicalOwner: 'Music',
      backupRequirement: 'excluded',
      physicalCarrierIds: ['idb:music-provider-cache'],
      durability: 'durable-rebuildable-cache',
    })
    expect(internalShareDraft).toMatchObject({
      logicalOwner: 'Chat',
      backupRequirement: 'excluded',
      physicalCarrierIds: ['local:chat-internal-share-draft'],
      durability: 'bounded-device-transient',
    })
  })

  test('separates covered required data classes from the named legacy v2 required gap', () => {
    const relevantDataClasses = getBackupRelevantPersistenceDataClasses()
    const registeredClassCoverage = new Map()

    for (const section of LEGACY_V2_BACKUP_SECTION_REGISTRY) {
      for (const dataClassId of section.dataClassIds) {
        expect(registeredClassCoverage.has(dataClassId)).toBe(false)
        registeredClassCoverage.set(dataClassId, section.coverage)
      }
    }

    expect([...registeredClassCoverage.keys()].sort()).toEqual(
      relevantDataClasses.map((entry) => entry.id).sort(),
    )

    const coveredRequiredClassIds = new Set(
      LEGACY_V2_BACKUP_SECTION_REGISTRY.filter((section) =>
        ['required', 'required_legacy_compatibility'].includes(section.coverage),
      ).flatMap((section) => section.dataClassIds),
    )
    const namedRequiredGapClassIds = LEGACY_V2_BACKUP_SECTION_REGISTRY.filter(
      (section) => section.coverage === 'known_gap',
    ).flatMap((section) => section.dataClassIds)

    expect(namedRequiredGapClassIds).toEqual(['chat.module-identity-settings'])
    expect(coveredRequiredClassIds.has('chat.module-identity-settings')).toBe(false)

    for (const entry of relevantDataClasses) {
      const coverage = registeredClassCoverage.get(entry.id)
      if (entry.backupRequirement === 'user_selected') {
        expect(coverage).toBe('user_selected')
        continue
      }
      if (namedRequiredGapClassIds.includes(entry.id)) {
        expect(coverage).toBe('known_gap')
        expect(coveredRequiredClassIds.has(entry.id)).toBe(false)
        continue
      }
      expect(coveredRequiredClassIds.has(entry.id)).toBe(true)
      expect(['required', 'required_legacy_compatibility']).toContain(coverage)
    }
  })

  test('reports valid legacy v2 shape separately from complete-package eligibility', () => {
    const payload = Object.fromEntries(
      LEGACY_V2_BACKUP_SECTION_REGISTRY.flatMap((section) =>
        section.payloadFields
          .filter((field) => !field.path.includes('.'))
          .map((field) => [field.path, field.shape === 'array' ? [] : {}]),
      ),
    )
    payload.backupMeta = { schemaVersion: 2 }
    payload.gallery.assetPackage = null

    expect(inspectLegacyV2BackupPayloadShape(payload)).toMatchObject({
      shapeOk: true,
      completePackageEligible: false,
      knownGaps: [
        {
          sectionId: 'chat-module-identity-known-gap',
          dataClassIds: ['chat.module-identity-settings'],
        },
      ],
    })

    delete payload.book
    expect(inspectLegacyV2BackupPayloadShape(payload)).toMatchObject({
      shapeOk: false,
      completePackageEligible: false,
      missing: [{ sectionId: 'book', path: 'book' }],
    })

    payload.book = []
    expect(inspectLegacyV2BackupPayloadShape(payload)).toMatchObject({
      shapeOk: false,
      completePackageEligible: false,
      invalid: [{ sectionId: 'book', path: 'book', expectedShape: 'object' }],
    })
  })

  test('inventory source paths remain real independent evidence', () => {
    const sourcePaths = new Set([
      ...PERSISTENCE_PHYSICAL_CARRIERS.map((entry) => entry.sourceFile),
      ...PERSISTED_STORE_CARRIERS.map((entry) => entry.sourceFile),
    ])

    for (const sourcePath of sourcePaths) {
      expect(relative(projectRoot, join(projectRoot, sourcePath)).replaceAll('\\', '/')).toBe(
        sourcePath,
      )
      expect(readSource(sourcePath).length).toBeGreaterThan(0)
    }
  })
})
