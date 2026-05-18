import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../src/stores/chat'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useWalletStore } from '../src/stores/wallet'
import {
  cleanupRelationshipSourceRecords,
  buildRoleDeleteImpact,
  deleteRoleMemoryGroup,
  deleteRoleProfileCascade,
  resetRoleRelationshipState,
} from '../src/lib/contacts-relationship-actions'

describe('contacts relationship actions', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T08:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('summarizes delete impact across Contacts, Chat Directory and relationship runtime', () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()

    const profile = chatStore.addRoleProfile({
      roleId: '900A',
      name: 'Impact Role',
      role: 'Guide',
    })
    const binding = chatStore.bindRoleProfile(profile.id)
    chatStore.appendMessage(binding.id, {
      role: 'user',
      content: 'hello',
      status: 'delivered',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_wallet_shared_transfer',
      sourceId: 'wallet_impact_1',
      memoryKey: 'impact_memory',
      factType: 'shared_expense',
      summary: 'Shared a tiny expense.',
      metricDeltas: {
        trust: 3,
      },
    })

    const impact = buildRoleDeleteImpact({ chatStore, relationshipRuntimeStore, profile })
    expect(impact).toMatchObject({
      profileId: profile.id,
      profileName: 'Impact Role',
      chatBindingCount: 1,
      chatConversationCount: 1,
      memoryGroupCount: 1,
      relationshipEventCount: 1,
      photosPolicy: 'unbind_only',
    })
    expect(impact.sourceRefs).toEqual([
      {
        sourceModule: 'relationship_wallet_shared_transfer',
        sourceId: 'wallet_impact_1',
      },
    ])
  })

  test('reset keeps role profile and Chat Directory binding but clears dynamic relationship state', () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()

    const profile = chatStore.addRoleProfile({
      roleId: '901',
      name: 'Reset Target',
      role: 'Archivist',
      detailItems: [
        {
          section: 'preferences',
          sourceKind: 'manual',
          title: 'Manual note',
          detail: 'Keep this.',
        },
        {
          section: 'lifePattern',
          sourceKind: 'event_attached',
          title: 'Event note',
          detail: 'Clear this.',
          memoryKey: 'reset_memory',
        },
      ],
    })
    const binding = chatStore.bindRoleProfile(profile.id)
    chatStore.appendMessage(binding.id, {
      role: 'assistant',
      content: 'Stored conversation',
      status: 'sent',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'phone_reset_1',
      memoryKey: 'reset_memory',
      factType: 'completed_call',
      summary: 'A call happened.',
      metricDeltas: {
        affinity: 4,
      },
    })

    const result = resetRoleRelationshipState({ chatStore, relationshipRuntimeStore, profile })
    expect(result.ok).toBe(true)
    expect(chatStore.getRoleProfileById(profile.id)).toBeTruthy()
    expect(chatStore.contacts.some((item) => Number(item.profileId) === profile.id)).toBe(true)
    expect(chatStore.getMessagesByContactId(binding.id)).toEqual([])
    expect(chatStore.listRoleDetailItems(profile.id)).toHaveLength(1)
    expect(chatStore.listRoleDetailItems(profile.id)[0]?.sourceKind).toBe('manual')
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: profile.id }).exists).toBe(false)
  })

  test('delete role cascade removes profile and chat bindings while retaining optional cleanup results', () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const cleanupHandler = vi.fn(() => true)

    const profile = chatStore.addRoleProfile({
      roleId: '902',
      name: 'Delete Target',
      role: 'Runner',
    })
    const binding = chatStore.bindRoleProfile(profile.id)
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'phone_delete_1',
      memoryKey: 'delete_memory',
      factType: 'completed_call',
      summary: 'Delete this call.',
      metricDeltas: {
        affinity: 4,
      },
    })

    const result = deleteRoleProfileCascade({
      chatStore,
      relationshipRuntimeStore,
      profile,
      includeLinkedRecords: true,
      cleanupHandlers: {
        relationship_phone_call: cleanupHandler,
      },
    })
    expect(result.ok).toBe(true)
    expect(result.cleanupResult).toMatchObject({
      requestedCount: 1,
      removedCount: 1,
    })
    expect(cleanupHandler).toHaveBeenCalledWith(
      'phone_delete_1',
      {
        sourceModule: 'relationship_phone_call',
        sourceId: 'phone_delete_1',
      },
      expect.objectContaining({
        cleanupMode: 'delete_role',
        profile: expect.objectContaining({
          id: profile.id,
          name: profile.name,
        }),
      }),
    )
    expect(chatStore.getRoleProfileById(profile.id)).toBe(null)
    expect(chatStore.contacts.some((item) => item.id === binding.id)).toBe(false)
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: profile.id }).exists).toBe(false)
  })

  test('cleanup dispatcher records missing handlers without deleting ambiguous module records', () => {
    const phoneCleanup = vi.fn(() => true)
    const result = cleanupRelationshipSourceRecords(
      [
        {
          sourceModule: 'relationship_phone_call',
          sourceId: 'phone_1:call:role_1',
        },
        {
          sourceModule: 'relationship_map_shared_route',
          sourceId: 'trip_1:shared_route:role_1',
        },
      ],
      {
        relationship_phone_call: phoneCleanup,
      },
    )

    expect(result).toMatchObject({
      requestedCount: 2,
      removedCount: 1,
      skippedCount: 1,
      failedCount: 0,
    })
    expect(phoneCleanup).toHaveBeenCalledWith(
      'phone_1:call:role_1',
      {
        sourceModule: 'relationship_phone_call',
        sourceId: 'phone_1:call:role_1',
      },
      expect.objectContaining({
        cleanupMode: 'delete_role',
      }),
    )
    expect(result.results[1]).toMatchObject({
      sourceModule: 'relationship_map_shared_route',
      skipped: true,
      reason: 'cleanup_handler_missing',
    })
  })

  test('deleting one memory group leaves free chat messages untouched', () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()

    const profile = chatStore.addRoleProfile({
      roleId: '903',
      name: 'Memory Target',
      role: 'Pilot',
    })
    const binding = chatStore.bindRoleProfile(profile.id)
    chatStore.appendMessage(binding.id, {
      role: 'user',
      content: 'This free chat message should remain.',
      status: 'delivered',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'calendar_memory_1',
      memoryKey: 'one_memory',
      factType: 'scheduled_calendar_event',
      summary: 'One relationship memory.',
      metricDeltas: {
        affinity: 4,
      },
    })

    const result = deleteRoleMemoryGroup({
      chatStore,
      relationshipRuntimeStore,
      profile,
      memoryKey: 'one_memory',
    })
    expect(result.ok).toBe(true)
    expect(relationshipRuntimeStore.listMemoryGroupsForTarget({ profileId: profile.id })).toEqual([])
    expect(chatStore.getMessagesByContactId(binding.id).at(-1)?.content).toContain('free chat message')
  })

  test('deleting one memory group only cleans the linked module record for that source', () => {
    const chatStore = useChatStore()
    const walletStore = useWalletStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()

    const profile = chatStore.addRoleProfile({
      roleId: '904',
      name: 'Scoped Cleanup',
      role: 'Pilot',
    })

    const linkedOne = walletStore.addTransferTransaction({
      amount: 36,
      counterparty: profile.name,
      note: 'Dinner with Scoped Cleanup',
      relationshipBinding: {
        profileId: profile.id,
        contactId: 0,
        kind: 'role',
        name: profile.name,
      },
    })
    const linkedTwo = walletStore.addTransferTransaction({
      amount: 64,
      counterparty: profile.name,
      note: 'Taxi with Scoped Cleanup',
      relationshipBinding: {
        profileId: profile.id,
        contactId: 0,
        kind: 'role',
        name: profile.name,
      },
    })

    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_wallet_shared_transfer',
      sourceId: `${linkedOne.id}:shared_transfer:role_${profile.id}`,
      memoryKey: 'memory_one',
      factType: 'shared_transfer',
      summary: 'Dinner together.',
      metricDeltas: {
        trust: 4,
      },
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_wallet_shared_transfer',
      sourceId: `${linkedTwo.id}:shared_transfer:role_${profile.id}`,
      memoryKey: 'memory_two',
      factType: 'shared_transfer',
      summary: 'Taxi together.',
      metricDeltas: {
        trust: 3,
      },
    })

    const cleanupHandler = vi.fn((sourceId, ref, options = {}) => {
      const recordId = sourceId.split(':')[0]
      const existed = Boolean(walletStore.findTransactionById(recordId))
      return {
        ok: !existed || walletStore.anonymizeTransaction(recordId, options.profile, 'Unknown counterparty'),
        removedCount: 0,
        unlinkedCount: existed ? 1 : 0,
        anonymizedCount: existed ? 1 : 0,
        updatedCount: existed ? 1 : 0,
      }
    })

    const result = deleteRoleMemoryGroup({
      chatStore,
      relationshipRuntimeStore,
      profile,
      memoryKey: 'memory_one',
      cleanupHandlers: {
        relationship_wallet_shared_transfer: cleanupHandler,
      },
    })

    expect(result.ok).toBe(true)
    expect(walletStore.findTransactionById(linkedOne.id)).toMatchObject({
      counterparty: 'Unknown counterparty',
      relationshipBinding: expect.objectContaining({
        profileId: 0,
        contactId: 0,
      }),
    })
    expect(walletStore.findTransactionById(linkedTwo.id)).toMatchObject({
      counterparty: profile.name,
      relationshipBinding: expect.objectContaining({
        profileId: profile.id,
      }),
    })
    expect(relationshipRuntimeStore.listMemoryGroupsForTarget({ profileId: profile.id }).map((item) => item.memoryKey))
      .toEqual(['memory_two'])
    expect(cleanupHandler).toHaveBeenCalledTimes(1)
    expect(cleanupHandler).toHaveBeenCalledWith(
      `${linkedOne.id}:shared_transfer:role_${profile.id}`,
      {
        sourceModule: 'relationship_wallet_shared_transfer',
        sourceId: `${linkedOne.id}:shared_transfer:role_${profile.id}`,
      },
      expect.objectContaining({
        cleanupMode: 'delete_memory_group',
        memoryKey: 'memory_one',
      }),
    )
  })
})
