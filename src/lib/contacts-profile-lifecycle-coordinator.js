import {
  cleanupRelationshipSourceRecords,
  buildRoleDeleteImpact,
  buildRoleRelationshipTarget,
} from './contacts-relationship-actions'
import {
  RELATIONSHIP_CLEANUP_MODES,
} from './relationship-cleanup-helpers'
import {
  isContactsProfileActive,
  isContactsProfileArchived,
} from './contacts-profile-owner'
import { CONTACTS_ENTITY_TYPES } from './role-profile-schema'

export const CONTACTS_LIFECYCLE_COORDINATOR_CODES = Object.freeze({
  PERSON_PERMANENTLY_DELETED: 'person_permanently_deleted',
  PROFILE_ARCHIVED: 'profile_archived',
  PROFILE_RESTORED: 'profile_restored',
  PROFILE_MISSING: 'profile_missing',
  PROFILE_NOT_ACTIVE: 'profile_not_active',
  PROFILE_NOT_ARCHIVED: 'profile_not_archived',
  SELF_PROFILE_LIFECYCLE_FORBIDDEN: 'self_profile_lifecycle_forbidden',
  STALE_REVISION: 'stale_revision',
  OWNER_INTERFACE_MISSING: 'owner_interface_missing',
  OWNER_SNAPSHOT_FAILED: 'owner_snapshot_failed',
  CLEANUP_OWNER_SNAPSHOT_MISSING: 'cleanup_owner_snapshot_missing',
  UNSUPPORTED_REFERENCE_POLICY_REQUIRED: 'unsupported_reference_policy_required',
  CLEANUP_FAILED: 'cleanup_failed',
  OWNER_MUTATION_FAILED: 'owner_mutation_failed',
  PERSISTENCE_FAILED: 'persistence_failed',
})

const toPositiveInt = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

const deepClone = (value) => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // Pinia snapshots can still contain Vue proxies even though they are JSON-persistable.
    }
  }
  return JSON.parse(JSON.stringify(value))
}

const uniqueText = (values = []) => [
  ...new Set(
    values
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean),
  ),
]

const isPersistenceSuccess = (result) => result === true || result?.ok === true

const createOwnerAdapter = (ownerId, store) => {
  if (
    !store ||
    typeof store.createBackupSnapshot !== 'function' ||
    typeof store.restoreFromBackup !== 'function' ||
    typeof store.saveNow !== 'function'
  ) {
    return null
  }
  return { ownerId, store, snapshot: null }
}

const createFailure = (code, extra = {}) => ({
  ok: false,
  code,
  ...extra,
})

const countWalletTransactionHistoryForProfile = (walletStore, profileId) => {
  if (typeof walletStore?.createBackupSnapshot !== 'function') return 0
  const snapshot = walletStore.createBackupSnapshot()
  return (Array.isArray(snapshot?.transactions) ? snapshot.transactions : []).filter(
    (transaction) =>
      Number(transaction?.relationshipBinding?.profileId) === Number(profileId) ||
      Number(transaction?.recipientProfileId) === Number(profileId) ||
      Number(transaction?.deletedPersonReference?.profileId) === Number(profileId),
  ).length
}

const countSimulationHistoryForProfile = (simulationStore, profileId) => {
  const proposals = Array.isArray(simulationStore?.chatSocialEventProposals)
    ? simulationStore.chatSocialEventProposals
    : []
  return proposals.filter(
    (proposal) => Number(proposal?.targetProfileId) === Number(profileId),
  ).length
}

export const buildPermanentRoleDeleteImpact = ({
  chatStore,
  relationshipRuntimeStore,
  walletStore,
  galleryStore,
  miniSceneStore,
  simulationStore,
  cleanupRegistry = {},
  profile,
} = {}) => {
  const baseImpact = buildRoleDeleteImpact({ chatStore, relationshipRuntimeStore, profile })
  const handlers = cleanupRegistry?.handlers || {}
  const sourceRefs = baseImpact.sourceRefs || []
  const unsupportedSourceModules = uniqueText(
    sourceRefs
      .filter((ref) => typeof handlers[ref.sourceModule] !== 'function')
      .map((ref) => ref.sourceModule),
  )
  const cleanupOwnerMissingModules = uniqueText(
    sourceRefs
      .filter((ref) => typeof handlers[ref.sourceModule] === 'function')
      .filter(
        (ref) =>
          !createOwnerAdapter(
            `source:${ref.sourceModule}`,
            cleanupRegistry?.ownerStoresBySourceModule?.[ref.sourceModule],
          ),
      )
      .map((ref) => ref.sourceModule),
  )
  const profileId = toPositiveInt(profile?.id)
  return {
    ...baseImpact,
    lifecycleState: profile?.lifecycle?.state || 'active',
    knownPayeeCount:
      walletStore?.listKnownPayeeAccountsForProfile?.(profileId, { includeSuspended: true })
        ?.length || 0,
    galleryPersonTagCount:
      galleryStore?.countPersonTagsForProfile?.(profileId) || 0,
    miniSceneBindingCount:
      miniSceneStore?.countProfileBindingsForProfile?.(profileId) || 0,
    retainedWalletTransactionCount: countWalletTransactionHistoryForProfile(
      walletStore,
      profileId,
    ),
    retainedSimulationProposalCount: countSimulationHistoryForProfile(
      simulationStore,
      profileId,
    ),
    unsupportedSourceModules,
    cleanupOwnerMissingModules,
    retainedHistoryPolicy: 'owner_snapshot_or_deleted_person_reference',
  }
}

const restoreOwners = (adapters = []) => {
  const results = [...adapters].reverse().map((adapter) => {
    let restored = false
    let persistence = null
    let reason = ''
    try {
      restored = adapter.store.restoreFromBackup(deepClone(adapter.snapshot)) !== false
      if (restored) {
        persistence = adapter.store.saveNow()
        if (!isPersistenceSuccess(persistence)) reason = 'rollback_persistence_failed'
      } else {
        reason = 'rollback_restore_failed'
      }
    } catch (error) {
      reason = error?.message || 'rollback_failed'
    }
    return {
      ownerId: adapter.ownerId,
      restored,
      persisted: restored && isPersistenceSuccess(persistence),
      reason,
    }
  })
  return {
    attempted: true,
    ok: results.every((result) => result.restored && result.persisted),
    results,
  }
}

const transitionRoleProfileArchiveState = ({
  chatStore,
  walletStore,
  profileId,
  expectedRevision,
  note = '',
  targetState,
} = {}) => {
  const numericProfileId = toPositiveInt(profileId)
  const profile = numericProfileId ? chatStore?.getRoleProfileById?.(numericProfileId) : null
  if (!profile) return createFailure(CONTACTS_LIFECYCLE_COORDINATOR_CODES.PROFILE_MISSING)
  if (profile.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
    return createFailure(
      CONTACTS_LIFECYCLE_COORDINATOR_CODES.SELF_PROFILE_LIFECYCLE_FORBIDDEN,
      { profileId: numericProfileId },
    )
  }
  if (Number(expectedRevision) !== Number(profile.revision)) {
    return createFailure(CONTACTS_LIFECYCLE_COORDINATOR_CODES.STALE_REVISION, {
      profileId: numericProfileId,
      revision: profile.revision,
    })
  }
  const shouldArchive = targetState === 'archived'
  if (shouldArchive ? !isContactsProfileActive(profile) : !isContactsProfileArchived(profile)) {
    return createFailure(
      shouldArchive
        ? CONTACTS_LIFECYCLE_COORDINATOR_CODES.PROFILE_NOT_ACTIVE
        : CONTACTS_LIFECYCLE_COORDINATOR_CODES.PROFILE_NOT_ARCHIVED,
      { profileId: numericProfileId, revision: profile.revision },
    )
  }

  const adapters = [
    createOwnerAdapter('wallet', walletStore),
    createOwnerAdapter('chat_contacts', chatStore),
  ]
  const missingOwnerIndex = adapters.findIndex((adapter) => !adapter)
  if (missingOwnerIndex >= 0) {
    return createFailure(CONTACTS_LIFECYCLE_COORDINATOR_CODES.OWNER_INTERFACE_MISSING, {
      profileId: numericProfileId,
      failedOwner: missingOwnerIndex === 0 ? 'wallet' : 'chat_contacts',
    })
  }
  for (const adapter of adapters) {
    try {
      adapter.snapshot = deepClone(adapter.store.createBackupSnapshot())
    } catch (error) {
      return createFailure(CONTACTS_LIFECYCLE_COORDINATOR_CODES.OWNER_SNAPSHOT_FAILED, {
        profileId: numericProfileId,
        failedOwner: adapter.ownerId,
        reason: error?.message || 'snapshot_failed',
      })
    }
  }

  let failedOwner = 'wallet'
  try {
    const payeeCount = shouldArchive
      ? walletStore.suspendKnownPayeeAccountsForProfile(numericProfileId)
      : walletStore.restoreKnownPayeeAccountsForProfile(numericProfileId)
    failedOwner = 'chat_contacts'
    const profileResult = shouldArchive
      ? chatStore.archiveRoleProfile(numericProfileId, { expectedRevision, note })
      : chatStore.restoreRoleProfile(numericProfileId, { expectedRevision })
    if (!profileResult?.ok) throw new Error(profileResult?.reason || 'profile_transition_failed')
    failedOwner = 'wallet'
    const walletPersistence = walletStore.saveNow()
    if (!isPersistenceSuccess(walletPersistence)) throw new Error('owner_persistence_failed')
    return {
      ok: true,
      code: shouldArchive
        ? CONTACTS_LIFECYCLE_COORDINATOR_CODES.PROFILE_ARCHIVED
        : CONTACTS_LIFECYCLE_COORDINATOR_CODES.PROFILE_RESTORED,
      profileId: numericProfileId,
      profile: profileResult.profile,
      walletPayeeCount: payeeCount,
      rollback: null,
    }
  } catch (error) {
    return createFailure(CONTACTS_LIFECYCLE_COORDINATOR_CODES.PERSISTENCE_FAILED, {
      profileId: numericProfileId,
      failedOwner,
      reason: error?.message || 'profile_transition_failed',
      rollback: restoreOwners(adapters),
    })
  }
}

export const archiveRoleProfileWithWallet = (options = {}) =>
  transitionRoleProfileArchiveState({ ...options, targetState: 'archived' })

export const restoreRoleProfileWithWallet = (options = {}) =>
  transitionRoleProfileArchiveState({ ...options, targetState: 'active' })

export const permanentlyDeleteArchivedRoleProfile = ({
  chatStore,
  relationshipRuntimeStore,
  walletStore,
  galleryStore,
  miniSceneStore,
  simulationStore,
  cleanupRegistry = {},
  profileId,
  expectedRevision,
  includeLinkedRecords = false,
  unsupportedReferencePolicy = '',
} = {}) => {
  const numericProfileId = toPositiveInt(profileId)
  const profile = numericProfileId ? chatStore?.getRoleProfileById?.(numericProfileId) : null
  if (!profile) return createFailure(CONTACTS_LIFECYCLE_COORDINATOR_CODES.PROFILE_MISSING)
  if (profile.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
    return createFailure(
      CONTACTS_LIFECYCLE_COORDINATOR_CODES.SELF_PROFILE_LIFECYCLE_FORBIDDEN,
      { profileId: numericProfileId },
    )
  }
  if (!isContactsProfileArchived(profile)) {
    return createFailure(CONTACTS_LIFECYCLE_COORDINATOR_CODES.PROFILE_NOT_ARCHIVED, {
      profileId: numericProfileId,
      revision: profile.revision,
    })
  }
  if (Number(expectedRevision) !== Number(profile.revision)) {
    return createFailure(CONTACTS_LIFECYCLE_COORDINATOR_CODES.STALE_REVISION, {
      profileId: numericProfileId,
      revision: profile.revision,
    })
  }

  const impact = buildPermanentRoleDeleteImpact({
    chatStore,
    relationshipRuntimeStore,
    walletStore,
    galleryStore,
    miniSceneStore,
    simulationStore,
    cleanupRegistry,
    profile,
  })
  if (
    impact.unsupportedSourceModules.length > 0 &&
    unsupportedReferencePolicy !== 'retain'
  ) {
    return createFailure(
      CONTACTS_LIFECYCLE_COORDINATOR_CODES.UNSUPPORTED_REFERENCE_POLICY_REQUIRED,
      { profileId: numericProfileId, impact },
    )
  }
  if (includeLinkedRecords && impact.cleanupOwnerMissingModules.length > 0) {
    return createFailure(
      CONTACTS_LIFECYCLE_COORDINATOR_CODES.CLEANUP_OWNER_SNAPSHOT_MISSING,
      { profileId: numericProfileId, impact },
    )
  }

  const requiredOwners = [
    ['wallet', walletStore],
    ['gallery', galleryStore],
    ['mini_scene', miniSceneStore],
    ['relationship_runtime', relationshipRuntimeStore],
    ['chat_contacts', chatStore],
  ]
  const adapters = []
  const seenStores = new Set()
  for (const [ownerId, store] of requiredOwners) {
    const adapter = createOwnerAdapter(ownerId, store)
    if (!adapter) {
      return createFailure(CONTACTS_LIFECYCLE_COORDINATOR_CODES.OWNER_INTERFACE_MISSING, {
        profileId: numericProfileId,
        failedOwner: ownerId,
        impact,
      })
    }
    adapters.push(adapter)
    seenStores.add(store)
  }
  if (includeLinkedRecords) {
    impact.sourceRefs.forEach((ref) => {
      if (typeof cleanupRegistry?.handlers?.[ref.sourceModule] !== 'function') return
      const store = cleanupRegistry.ownerStoresBySourceModule[ref.sourceModule]
      if (!store || seenStores.has(store)) return
      const adapter = createOwnerAdapter(`source:${ref.sourceModule}`, store)
      if (adapter) {
        adapters.unshift(adapter)
        seenStores.add(store)
      }
    })
  }

  for (const adapter of adapters) {
    try {
      adapter.snapshot = deepClone(adapter.store.createBackupSnapshot())
    } catch (error) {
      return createFailure(CONTACTS_LIFECYCLE_COORDINATOR_CODES.OWNER_SNAPSHOT_FAILED, {
        profileId: numericProfileId,
        failedOwner: adapter.ownerId,
        reason: error?.message || 'snapshot_failed',
        impact,
      })
    }
  }

  let failedOwner = ''
  let cleanupResult = null
  let walletRevokedCount = 0
  let walletHistoryUnlinkedCount = 0
  let galleryUnlinkedCount = 0
  let miniSceneUnlinkedCount = 0
  let runtimeResult = null
  let chatResult = null
  let phase = 'mutation'
  try {
    if (includeLinkedRecords) {
      failedOwner = 'linked_source_cleanup'
      cleanupResult = cleanupRelationshipSourceRecords(
        impact.sourceRefs,
        cleanupRegistry.handlers,
        {
          cleanupMode: RELATIONSHIP_CLEANUP_MODES.PERMANENT_DELETE_PERSON,
          profile,
        },
      )
      if (cleanupResult.failedCount > 0) throw new Error('linked_source_cleanup_failed')
    }

    failedOwner = 'wallet'
    walletRevokedCount = walletStore.removeKnownPayeeAccountsForProfile(numericProfileId)
    walletHistoryUnlinkedCount = walletStore.markTransactionsForDeletedProfile(profile).updatedCount
    failedOwner = 'gallery'
    galleryUnlinkedCount = galleryStore.unlinkPersonTagsForProfile(numericProfileId)
    failedOwner = 'mini_scene'
    miniSceneUnlinkedCount = miniSceneStore.removeProfileBindingsForProfile(numericProfileId)
    failedOwner = 'relationship_runtime'
    runtimeResult = relationshipRuntimeStore.deleteRuntimeForTarget(
      buildRoleRelationshipTarget(profile),
    )
    failedOwner = 'chat_contacts'
    chatResult = chatStore.commitArchivedRoleProfileDeletion(numericProfileId, {
      expectedRevision: profile.revision,
    })
    if (!chatResult?.ok) throw new Error(chatResult?.reason || 'chat_delete_failed')

    phase = 'persistence'
    const persistenceResults = []
    for (const adapter of adapters) {
      failedOwner = adapter.ownerId
      const persistence = adapter.store.saveNow()
      persistenceResults.push({
        ownerId: adapter.ownerId,
        ok: isPersistenceSuccess(persistence),
        code: persistence?.code || '',
      })
      if (!isPersistenceSuccess(persistence)) throw new Error('owner_persistence_failed')
    }

    return {
      ok: true,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.PERSON_PERMANENTLY_DELETED,
      profileId: numericProfileId,
      roleId: profile.roleId,
      tombstone: chatResult.tombstone,
      impact,
      affectedOwners: {
        chatBindingCount: chatResult.removedBindingCount,
        chatConversationCount: chatResult.removedConversationCount,
        relationshipEventCount: runtimeResult?.removedEventCount || 0,
        walletPayeeCount: walletRevokedCount,
        walletHistoryUnlinkedCount,
        galleryPersonTagCount: galleryUnlinkedCount,
        miniSceneBindingCount: miniSceneUnlinkedCount,
      },
      retainedHistory: {
        walletTransactionCount: impact.retainedWalletTransactionCount,
        simulationProposalCount: impact.retainedSimulationProposalCount,
        unsupportedSourceModules:
          unsupportedReferencePolicy === 'retain' ? impact.unsupportedSourceModules : [],
      },
      cleanupResult,
      persistenceResults,
      rollback: null,
    }
  } catch (error) {
    const rollback = restoreOwners(adapters)
    return createFailure(
      failedOwner === 'linked_source_cleanup'
        ? CONTACTS_LIFECYCLE_COORDINATOR_CODES.CLEANUP_FAILED
        : phase === 'persistence'
          ? CONTACTS_LIFECYCLE_COORDINATOR_CODES.PERSISTENCE_FAILED
          : CONTACTS_LIFECYCLE_COORDINATOR_CODES.OWNER_MUTATION_FAILED,
      {
        profileId: numericProfileId,
        failedOwner,
        reason: error?.message || 'permanent_delete_failed',
        impact,
        cleanupResult,
        rollback,
      },
    )
  }
}
