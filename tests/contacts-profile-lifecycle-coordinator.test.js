import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  CONTACTS_LIFECYCLE_COORDINATOR_CODES,
  archiveRoleProfileWithWallet,
  buildPermanentRoleDeleteImpact,
  permanentlyDeleteArchivedRoleProfile,
  restoreRoleProfileWithWallet,
} from '../src/lib/contacts-profile-lifecycle-coordinator'
import { createRelationshipSourceCleanupRegistry } from '../src/lib/relationship-source-cleanup-handlers'
import { useChatStore } from '../src/stores/chat'
import { useGalleryStore } from '../src/stores/gallery'
import { useMiniSceneStore } from '../src/stores/miniScene'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSimulationStore } from '../src/stores/simulation'
import { useWalletStore } from '../src/stores/wallet'

const createStores = () => ({
  chatStore: useChatStore(),
  relationshipRuntimeStore: useRelationshipRuntimeStore(),
  walletStore: useWalletStore(),
  galleryStore: useGalleryStore(),
  miniSceneStore: useMiniSceneStore(),
  simulationStore: useSimulationStore(),
})

const createArchivedFixture = (stores, { roleId = '9901', sourceModule = '' } = {}) => {
  const profile = stores.chatStore.addRoleProfile({
    roleId,
    name: `Archived ${roleId}`,
    payeeAccounts: [
      {
        id: `payee_${roleId}`,
        institutionId: 'hana_bank',
        currency: 'KRW',
        accountNumberLast4: '7788',
        status: 'active',
      },
    ],
  })
  const contact = stores.chatStore.bindRoleProfile(profile.id)
  stores.chatStore.appendMessage(contact.id, { role: 'user', content: 'Delete with the person.' })
  const knownPayee = stores.walletStore.rememberRolePayeeAccount({
    account: profile.payeeAccounts[0],
    profile,
    contact,
    sourceChatId: contact.id,
    sourceMessageId: `message_${roleId}`,
  })
  const transaction = stores.walletStore.addTransferTransaction({
    amount: 55,
    counterparty: profile.name,
    note: 'Immutable history',
    relationshipBinding: {
      profileId: profile.id,
      contactId: contact.id,
      kind: 'role',
      name: profile.name,
    },
  })
  const imported = stores.galleryStore.importAssetFromUrl({
    url: `https://example.com/${roleId}.png`,
    name: `Photo ${roleId}`,
    category: 'reference',
  })
  stores.galleryStore.setAssetPersons(imported.assetId, [profile.id])
  stores.miniSceneStore.restoreFromBackup({
    schemaVersion: 2,
    modulePolicies: [],
    profileBindings: [
      {
        id: `binding_${roleId}`,
        worldId: 'legacy_single_world',
        profileId: String(profile.id),
        scope: { kind: 'manual', id: `role_${roleId}` },
        active: true,
      },
    ],
    artifacts: [],
    interactionAudit: [],
  })
  stores.relationshipRuntimeStore.recordRelationshipFact({
    target: { profileId: profile.id, name: profile.name },
    sourceModule: sourceModule || 'relationship_phone_call',
    sourceId: `source_${roleId}`,
    memoryKey: `memory_${roleId}`,
    factType: 'shared_history',
    summary: 'Relationship state removed with the live person.',
    metricDeltas: { affinity: 2 },
  })
  const archived = stores.chatStore.archiveRoleProfile(profile.id, {
    expectedRevision: profile.revision,
  })
  return {
    profileId: profile.id,
    roleId: profile.roleId,
    archivedRevision: archived.profile.revision,
    contactId: contact.id,
    knownPayeeId: knownPayee.id,
    transactionId: transaction.id,
    assetId: imported.assetId,
  }
}

describe('Contacts permanent-delete lifecycle coordinator', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-28T08:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('archives and restores a role while preserving the same Wallet payee identity', () => {
    const stores = createStores()
    const profile = stores.chatStore.addRoleProfile({
      roleId: '9898',
      name: 'Lifecycle payee',
    })
    const contact = stores.chatStore.bindRoleProfile(profile.id)
    const knownPayee = stores.walletStore.rememberRolePayeeAccount({
      account: profile.payeeAccounts[0],
      profile,
      contact,
    })

    const archived = archiveRoleProfileWithWallet({
      chatStore: stores.chatStore,
      walletStore: stores.walletStore,
      profileId: profile.id,
      expectedRevision: profile.revision,
    })

    expect(archived).toMatchObject({
      ok: true,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.PROFILE_ARCHIVED,
      walletPayeeCount: 1,
      profile: { lifecycle: { state: 'archived' } },
    })
    expect(stores.walletStore.findKnownPayeeAccountById(knownPayee.id)).toMatchObject({
      id: knownPayee.id,
      status: 'suspended',
    })
    expect(
      stores.walletStore.addRolePayeeTransfer({
        payeeAccountId: knownPayee.id,
        amount: '1.00',
      }),
    ).toMatchObject({ ok: false, reason: 'payee_not_found' })

    const restored = restoreRoleProfileWithWallet({
      chatStore: stores.chatStore,
      walletStore: stores.walletStore,
      profileId: profile.id,
      expectedRevision: archived.profile.revision,
    })

    expect(restored).toMatchObject({
      ok: true,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.PROFILE_RESTORED,
      walletPayeeCount: 1,
      profile: { lifecycle: { state: 'active' } },
    })
    expect(stores.walletStore.findKnownPayeeAccountById(knownPayee.id)).toMatchObject({
      id: knownPayee.id,
      status: 'active',
    })
  })

  test('rolls back Contacts and Wallet when archive persistence fails', () => {
    const stores = createStores()
    const profile = stores.chatStore.addRoleProfile({ roleId: '9899', name: 'Archive rollback' })
    const originalRevision = profile.revision
    const contact = stores.chatStore.bindRoleProfile(profile.id)
    const knownPayee = stores.walletStore.rememberRolePayeeAccount({
      account: profile.payeeAccounts[0],
      profile,
      contact,
    })
    const originalWalletSave = stores.walletStore.saveNow.bind(stores.walletStore)
    vi.spyOn(stores.walletStore, 'saveNow')
      .mockImplementationOnce(() => ({ ok: false, code: 'forced_failure' }))
      .mockImplementation(() => originalWalletSave())

    const result = archiveRoleProfileWithWallet({
      chatStore: stores.chatStore,
      walletStore: stores.walletStore,
      profileId: profile.id,
      expectedRevision: originalRevision,
    })

    expect(result).toMatchObject({
      ok: false,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.PERSISTENCE_FAILED,
      failedOwner: 'wallet',
      rollback: { attempted: true, ok: true },
    })
    expect(stores.chatStore.getRoleProfileById(profile.id)).toMatchObject({
      lifecycle: { state: 'active' },
      revision: originalRevision,
    })
    expect(stores.walletStore.findKnownPayeeAccountById(knownPayee.id)).toMatchObject({
      id: knownPayee.id,
      status: 'active',
    })
  })

  test('rejects active profiles and stale archived revisions before changing owners', () => {
    const stores = createStores()
    const active = stores.chatStore.addRoleProfile({ roleId: '9900', name: 'Active person' })
    expect(
      permanentlyDeleteArchivedRoleProfile({
        ...stores,
        profileId: active.id,
        expectedRevision: active.revision,
      }),
    ).toMatchObject({
      ok: false,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.PROFILE_NOT_ARCHIVED,
    })

    const fixture = createArchivedFixture(stores)
    expect(
      permanentlyDeleteArchivedRoleProfile({
        ...stores,
        profileId: fixture.profileId,
        expectedRevision: fixture.archivedRevision - 1,
      }),
    ).toMatchObject({
      ok: false,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.STALE_REVISION,
    })
    expect(stores.chatStore.getRoleProfileById(fixture.profileId)).toBeTruthy()
  })

  test('fails closed for an ordinary Self Profile permanent-delete command', () => {
    const stores = createStores()
    const selfProfile = stores.chatStore.addRoleProfile({
      roleId: '9905',
      name: 'Current self',
      entityType: 'self_profile',
    })

    expect(
      permanentlyDeleteArchivedRoleProfile({
        ...stores,
        profileId: selfProfile.id,
        expectedRevision: selfProfile.revision,
      }),
    ).toMatchObject({
      ok: false,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.SELF_PROFILE_LIFECYCLE_FORBIDDEN,
      profileId: selfProfile.id,
    })
    expect(stores.chatStore.getRoleProfileById(selfProfile.id)).toBeTruthy()
  })

  test('deletes one archived person, revokes live references, and retains immutable history', () => {
    const stores = createStores()
    const fixture = createArchivedFixture(stores)
    const impact = buildPermanentRoleDeleteImpact({
      ...stores,
      profile: stores.chatStore.getRoleProfileById(fixture.profileId),
    })
    expect(impact).toMatchObject({
      knownPayeeCount: 1,
      galleryPersonTagCount: 1,
      miniSceneBindingCount: 1,
      retainedWalletTransactionCount: 1,
    })

    const result = permanentlyDeleteArchivedRoleProfile({
      ...stores,
      profileId: fixture.profileId,
      expectedRevision: fixture.archivedRevision,
      unsupportedReferencePolicy: 'retain',
    })

    expect(result).toMatchObject({
      ok: true,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.PERSON_PERMANENTLY_DELETED,
      profileId: fixture.profileId,
      roleId: fixture.roleId,
      tombstone: {
        profileId: fixture.profileId,
        roleId: fixture.roleId,
        deletedAt: Date.now(),
      },
      affectedOwners: {
        chatBindingCount: 1,
        relationshipEventCount: 1,
        walletPayeeCount: 1,
        walletHistoryUnlinkedCount: 1,
        galleryPersonTagCount: 1,
        miniSceneBindingCount: 1,
      },
      retainedHistory: { walletTransactionCount: 1 },
      rollback: null,
    })
    expect(result.tombstone.name).toBeUndefined()
    expect(result.tombstone.profileValues).toBeUndefined()
    expect(stores.chatStore.getRoleProfileById(fixture.profileId)).toBeNull()
    expect(stores.chatStore.getContactById(fixture.contactId)).toBeNull()
    expect(stores.walletStore.findKnownPayeeAccountById(fixture.knownPayeeId)).toBeNull()
    expect(stores.walletStore.findTransactionById(fixture.transactionId)).toMatchObject({
      counterparty: `Archived ${fixture.roleId}`,
      relationshipBinding: { profileId: 0, contactId: 0 },
      deletedPersonReference: {
        profileId: fixture.profileId,
        roleId: fixture.roleId,
        deletedAt: Date.now(),
      },
    })
    expect(stores.galleryStore.findAssetById(fixture.assetId).personIds).toEqual([])
    expect(stores.miniSceneStore.profileBindings).toEqual([])
    expect(
      stores.relationshipRuntimeStore.summarizeEntityForTarget({ profileId: fixture.profileId }).exists,
    ).toBe(false)
    expect(stores.chatStore.contactsLifecycle.tombstones).toEqual([
      expect.objectContaining({ profileId: fixture.profileId, roleId: fixture.roleId }),
    ])

    const backup = stores.chatStore.createBackupSnapshot()
    setActivePinia(createPinia())
    const reopened = useChatStore()
    expect(reopened.restoreFromBackup(backup)).toBe(true)
    expect(reopened.getRoleProfileById(fixture.profileId)).toBeNull()
    expect(reopened.contactsLifecycle.tombstones).toEqual([
      expect.objectContaining({ profileId: fixture.profileId, roleId: fixture.roleId }),
    ])
    expect(
      reopened.addRoleProfile({
        id: fixture.profileId,
        roleId: 'replacement-id',
        name: 'Reserved profile ID',
      }),
    ).toBeNull()
    expect(reopened.addRoleProfile({ roleId: fixture.roleId, name: 'Reserved role ID' })).toBeNull()
    expect(reopened.addRoleProfile({ name: 'Next person' }).id).toBeGreaterThan(fixture.profileId)
  })

  test('requires an explicit retain policy for unsupported linked references', () => {
    const stores = createStores()
    const fixture = createArchivedFixture(stores, { sourceModule: 'unknown_history_owner' })

    const blocked = permanentlyDeleteArchivedRoleProfile({
      ...stores,
      profileId: fixture.profileId,
      expectedRevision: fixture.archivedRevision,
    })
    expect(blocked).toMatchObject({
      ok: false,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.UNSUPPORTED_REFERENCE_POLICY_REQUIRED,
      impact: { unsupportedSourceModules: ['unknown_history_owner'] },
    })
    expect(stores.chatStore.getRoleProfileById(fixture.profileId)).toBeTruthy()

    const retained = permanentlyDeleteArchivedRoleProfile({
      ...stores,
      profileId: fixture.profileId,
      expectedRevision: fixture.archivedRevision,
      includeLinkedRecords: true,
      unsupportedReferencePolicy: 'retain',
    })
    expect(retained).toMatchObject({
      ok: true,
      retainedHistory: { unsupportedSourceModules: ['unknown_history_owner'] },
      cleanupResult: { skippedCount: 1, failedCount: 0 },
    })
  })

  test('rejects registered cleanup when its owner cannot snapshot and roll back', () => {
    const stores = createStores()
    const fixture = createArchivedFixture(stores, {
      roleId: '9906',
      sourceModule: 'relationship_phone_call',
    })
    const cleanupRegistry = createRelationshipSourceCleanupRegistry()

    expect(
      permanentlyDeleteArchivedRoleProfile({
        ...stores,
        cleanupRegistry,
        profileId: fixture.profileId,
        expectedRevision: fixture.archivedRevision,
        includeLinkedRecords: true,
      }),
    ).toMatchObject({
      ok: false,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.CLEANUP_OWNER_SNAPSHOT_MISSING,
      impact: { cleanupOwnerMissingModules: ['relationship_phone_call'] },
    })
    expect(stores.chatStore.getRoleProfileById(fixture.profileId)).toBeTruthy()
    expect(stores.walletStore.findKnownPayeeAccountById(fixture.knownPayeeId)).toBeTruthy()
  })

  test('unlinks linked Wallet history without deleting or rewriting its owner snapshot', () => {
    const stores = createStores()
    const fixture = createArchivedFixture(stores, {
      roleId: '9902',
      sourceModule: 'relationship_wallet_shared_transfer',
    })
    stores.relationshipRuntimeStore.resetRelationshipForTarget({ profileId: fixture.profileId })
    stores.relationshipRuntimeStore.recordRelationshipFact({
      target: { profileId: fixture.profileId, name: `Archived ${fixture.roleId}` },
      sourceModule: 'relationship_wallet_shared_transfer',
      sourceId: `${fixture.transactionId}:shared_transfer:role_${fixture.profileId}`,
      memoryKey: `memory_${fixture.roleId}`,
      factType: 'shared_transfer',
      summary: 'Immutable Wallet transfer.',
      metricDeltas: { trust: 1 },
    })
    const cleanupRegistry = createRelationshipSourceCleanupRegistry({
      walletStore: stores.walletStore,
    })

    const result = permanentlyDeleteArchivedRoleProfile({
      ...stores,
      cleanupRegistry,
      profileId: fixture.profileId,
      expectedRevision: fixture.archivedRevision,
      includeLinkedRecords: true,
    })

    expect(result).toMatchObject({
      ok: true,
      cleanupResult: {
        removedCount: 0,
        unlinkedCount: 1,
        anonymizedCount: 0,
        updatedCount: 1,
      },
    })
    expect(stores.walletStore.findTransactionById(fixture.transactionId)).toMatchObject({
      counterparty: `Archived ${fixture.roleId}`,
      relationshipBinding: expect.objectContaining({ profileId: 0, contactId: 0 }),
      deletedPersonReference: {
        profileId: fixture.profileId,
        roleId: fixture.roleId,
        deletedAt: Date.now(),
      },
    })
  })

  test('restores every owner when the final Chat persistence step fails', () => {
    const stores = createStores()
    const fixture = createArchivedFixture(stores, { roleId: '9903' })
    const originalChatSave = stores.chatStore.saveNow.bind(stores.chatStore)
    vi.spyOn(stores.chatStore, 'saveNow')
      .mockImplementationOnce(() => ({ ok: false, code: 'forced_failure' }))
      .mockImplementation(() => originalChatSave())

    const result = permanentlyDeleteArchivedRoleProfile({
      ...stores,
      profileId: fixture.profileId,
      expectedRevision: fixture.archivedRevision,
      unsupportedReferencePolicy: 'retain',
    })

    expect(result).toMatchObject({
      ok: false,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.PERSISTENCE_FAILED,
      failedOwner: 'chat_contacts',
      rollback: { attempted: true, ok: true },
    })
    expect(stores.chatStore.getRoleProfileById(fixture.profileId)).toMatchObject({
      id: fixture.profileId,
      lifecycle: { state: 'archived' },
    })
    expect(stores.chatStore.getContactById(fixture.contactId)).toBeTruthy()
    expect(stores.walletStore.findKnownPayeeAccountById(fixture.knownPayeeId)).toBeTruthy()
    expect(stores.walletStore.findTransactionById(fixture.transactionId)).toMatchObject({
      relationshipBinding: { profileId: fixture.profileId, contactId: fixture.contactId },
      deletedPersonReference: null,
    })
    expect(stores.galleryStore.findAssetById(fixture.assetId).personIds).toEqual([
      String(fixture.profileId),
    ])
    expect(stores.miniSceneStore.profileBindings).toHaveLength(1)
    expect(
      stores.relationshipRuntimeStore.summarizeEntityForTarget({ profileId: fixture.profileId }).exists,
    ).toBe(true)
    expect(stores.chatStore.contactsLifecycle.tombstones).toEqual([])
  })

  test('restores a source owner when one registered cleanup handler fails', () => {
    const stores = createStores()
    const fixture = createArchivedFixture(stores, {
      roleId: '9904',
      sourceModule: 'relationship_wallet_shared_transfer',
    })
    const beforeTransaction = JSON.parse(
      JSON.stringify(stores.walletStore.findTransactionById(fixture.transactionId)),
    )
    const cleanupRegistry = {
      handlers: {
        relationship_wallet_shared_transfer: () => {
          stores.walletStore.anonymizeTransaction(
            fixture.transactionId,
            { id: fixture.profileId },
            'Unknown counterparty',
          )
          return { ok: false, reason: 'forced_cleanup_failure' }
        },
      },
      ownerStoresBySourceModule: {
        relationship_wallet_shared_transfer: stores.walletStore,
      },
    }

    const result = permanentlyDeleteArchivedRoleProfile({
      ...stores,
      cleanupRegistry,
      profileId: fixture.profileId,
      expectedRevision: fixture.archivedRevision,
      includeLinkedRecords: true,
    })

    expect(result).toMatchObject({
      ok: false,
      code: CONTACTS_LIFECYCLE_COORDINATOR_CODES.CLEANUP_FAILED,
      failedOwner: 'linked_source_cleanup',
      rollback: { attempted: true, ok: true },
      cleanupResult: { failedCount: 1 },
    })
    expect(stores.walletStore.findTransactionById(fixture.transactionId)).toEqual(
      beforeTransaction,
    )
    expect(stores.chatStore.getRoleProfileById(fixture.profileId)).toMatchObject({
      lifecycle: { state: 'archived' },
    })
    expect(stores.walletStore.findKnownPayeeAccountById(fixture.knownPayeeId)).toBeTruthy()
    expect(stores.chatStore.contactsLifecycle.tombstones).toEqual([])
  })
})
