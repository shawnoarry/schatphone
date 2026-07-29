export const LEGACY_V2_BACKUP_SCHEMA_VERSION = 2

const freezeRegistry = (entries) =>
  Object.freeze(
    entries.map((entry) =>
      Object.freeze({
        ...entry,
        dataClassIds: Object.freeze([...entry.dataClassIds]),
        payloadFields: Object.freeze(
          (entry.payloadFields || []).map((field) => Object.freeze({ ...field })),
        ),
      }),
    ),
  )

export const LEGACY_V2_BACKUP_SECTION_REGISTRY = freezeRegistry([
  { id: 'system-settings', owner: 'Settings', coverage: 'required', dataClassIds: ['settings.application-settings'], payloadFields: [{ path: 'settings', shape: 'object' }] },
  { id: 'system-user', owner: 'Settings / WorldBook', coverage: 'required', dataClassIds: ['settings.current-user-profile', 'worldbook.world-context'], payloadFields: [{ path: 'user', shape: 'object' }] },
  { id: 'system-notifications', owner: 'System', coverage: 'required', dataClassIds: ['system.notifications'], payloadFields: [{ path: 'notifications', shape: 'array' }] },
  { id: 'system-api-reports', owner: 'Module Architecture / Technical Governance', coverage: 'required', dataClassIds: ['technical-governance.api-reports'], payloadFields: [{ path: 'apiReports', shape: 'array' }] },
  { id: 'system-truth-state', owner: 'System', coverage: 'required_legacy_compatibility', dataClassIds: ['system.truth-state-legacy'], payloadFields: [{ path: 'truthState', shape: 'object' }] },
  { id: 'contacts-role-profiles', owner: 'Contacts', coverage: 'required', dataClassIds: ['contacts.role-profiles'], payloadFields: [{ path: 'roleProfiles', shape: 'array' }] },
  { id: 'chat-directory-conversations', owner: 'Chat', coverage: 'required', dataClassIds: ['chat.directory-and-conversations'], payloadFields: [{ path: 'contacts', shape: 'array' }, { path: 'conversations', shape: 'object' }] },
  { id: 'chat-messages', owner: 'Chat', coverage: 'required', dataClassIds: ['chat.user-visible-messages'], payloadFields: [{ path: 'messagesByConversation', shape: 'object' }] },
  {
    id: 'chat-module-identity-known-gap',
    owner: 'Chat',
    coverage: 'known_gap',
    dataClassIds: ['chat.module-identity-settings'],
    payloadFields: [],
    reason: 'Legacy v2 export omits moduleIdentity and moduleAvatarOverrides; changing its shape is outside this batch.',
  },
  { id: 'map', owner: 'Map', coverage: 'required', dataClassIds: ['map.navigation-and-world-state'], payloadFields: [{ path: 'map', shape: 'object' }] },
  { id: 'calendar', owner: 'Calendar', coverage: 'required', dataClassIds: ['calendar.events'], payloadFields: [{ path: 'calendar', shape: 'object' }] },
  { id: 'reminders', owner: 'Reminders', coverage: 'required', dataClassIds: ['reminders.reminder-records'], payloadFields: [{ path: 'reminders', shape: 'object' }] },
  { id: 'gallery-metadata', owner: 'Gallery', coverage: 'required', dataClassIds: ['gallery.asset-metadata'], payloadFields: [{ path: 'gallery', shape: 'object' }] },
  { id: 'gallery-binaries', owner: 'Gallery', coverage: 'user_selected', dataClassIds: ['gallery.retained-binaries'], payloadFields: [{ path: 'gallery.assetPackage', shape: 'nullable-object' }] },
  { id: 'files', owner: 'Files', coverage: 'required', dataClassIds: ['files.file-index'], payloadFields: [{ path: 'files', shape: 'object' }] },
  { id: 'book', owner: 'Book', coverage: 'required', dataClassIds: ['book.long-form-library'], payloadFields: [{ path: 'book', shape: 'object' }] },
  { id: 'shopping', owner: 'Shopping', coverage: 'required', dataClassIds: ['shopping.orders-and-logistics'], payloadFields: [{ path: 'shopping', shape: 'object' }] },
  { id: 'food-delivery', owner: 'Food Delivery', coverage: 'required', dataClassIds: ['food-delivery.orders'], payloadFields: [{ path: 'foodDelivery', shape: 'object' }] },
  { id: 'simulation', owner: 'Event Runtime / World Hub', coverage: 'required', dataClassIds: ['event-runtime.simulation-state'], payloadFields: [{ path: 'simulation', shape: 'object' }] },
  { id: 'assets', owner: 'Assets', coverage: 'required', dataClassIds: ['assets.owned-assets'], payloadFields: [{ path: 'assets', shape: 'object' }] },
  { id: 'wallet', owner: 'Wallet', coverage: 'required', dataClassIds: ['wallet.ledger'], payloadFields: [{ path: 'wallet', shape: 'object' }] },
  { id: 'phone', owner: 'Phone', coverage: 'required', dataClassIds: ['phone.call-records'], payloadFields: [{ path: 'phone', shape: 'object' }] },
  { id: 'stock', owner: 'Stock', coverage: 'required', dataClassIds: ['stock.simulated-market'], payloadFields: [{ path: 'stock', shape: 'object' }] },
  { id: 'relationship-runtime', owner: 'Relationship Runtime', coverage: 'required', dataClassIds: ['relationship-runtime.relationship-truth'], payloadFields: [{ path: 'relationshipRuntime', shape: 'object' }] },
  { id: 'image-generation', owner: 'Image Generation', coverage: 'required', dataClassIds: ['image-generation.public-configuration'], payloadFields: [{ path: 'imageGeneration', shape: 'object' }] },
])

const readPath = (value, path) => {
  const segments = path.split('.')
  let current = value
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return { present: false, value: undefined }
    }
    current = current[segment]
  }
  return { present: true, value: current }
}

const matchesShape = (value, shape) => {
  if (shape === 'array') return Array.isArray(value)
  if (shape === 'object') return Boolean(value && typeof value === 'object' && !Array.isArray(value))
  if (shape === 'nullable-object') {
    return value == null || Boolean(typeof value === 'object' && !Array.isArray(value))
  }
  return false
}

export const inspectLegacyV2BackupPayloadShape = (payload) => {
  const missing = []
  const invalid = []
  const knownGaps = LEGACY_V2_BACKUP_SECTION_REGISTRY
    .filter((section) => section.coverage === 'known_gap')
    .map((section) => ({
      sectionId: section.id,
      owner: section.owner,
      dataClassIds: [...section.dataClassIds],
      reason: section.reason,
    }))

  const schemaVersion = readPath(payload, 'backupMeta.schemaVersion')
  if (!schemaVersion.present) {
    missing.push({ sectionId: 'backup-envelope', path: 'backupMeta.schemaVersion' })
  } else if (Number(schemaVersion.value) !== LEGACY_V2_BACKUP_SCHEMA_VERSION) {
    invalid.push({
      sectionId: 'backup-envelope',
      path: 'backupMeta.schemaVersion',
      expectedShape: `schema-v${LEGACY_V2_BACKUP_SCHEMA_VERSION}`,
    })
  }

  for (const section of LEGACY_V2_BACKUP_SECTION_REGISTRY) {
    if (section.coverage === 'known_gap') continue
    for (const field of section.payloadFields) {
      const resolved = readPath(payload, field.path)
      if (!resolved.present) {
        missing.push({ sectionId: section.id, path: field.path })
        continue
      }
      if (!matchesShape(resolved.value, field.shape)) {
        invalid.push({ sectionId: section.id, path: field.path, expectedShape: field.shape })
      }
    }
  }

  const shapeOk = missing.length === 0 && invalid.length === 0
  return {
    shapeOk,
    completePackageEligible: shapeOk && knownGaps.length === 0,
    schemaVersion: LEGACY_V2_BACKUP_SCHEMA_VERSION,
    missing,
    invalid,
    knownGaps,
  }
}

export const assertLegacyV2BackupPayloadShape = (payload) => {
  const result = inspectLegacyV2BackupPayloadShape(payload)
  if (result.shapeOk) return payload

  const error = new Error('Legacy v2 backup payload shape is missing or invalid.')
  error.code = 'BACKUP_EXPORT_LEGACY_V2_SHAPE_INVALID'
  error.shapeInspection = result
  throw error
}
