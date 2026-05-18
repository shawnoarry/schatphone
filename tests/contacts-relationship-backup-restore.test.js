import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../src/stores/chat'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'

const clone = (value) => JSON.parse(JSON.stringify(value))

const createContactsRelationshipBackup = ({ chatStore, relationshipRuntimeStore } = {}) => ({
  backupMeta: {
    schemaVersion: 2,
  },
  roleProfiles: clone(chatStore.roleProfiles),
  contacts: clone(chatStore.contacts),
  chatHistory: clone(chatStore.chatHistory),
  conversations: clone(chatStore.conversations),
  messagesByConversation: clone(chatStore.messagesByConversation),
  relationshipRuntime: clone(relationshipRuntimeStore.createBackupSnapshot()),
})

describe('Contacts relationship backup and restore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T08:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('round-trips role ids, mixed detail items, chat bindings, and memory groups', () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()

    const profile = chatStore.addRoleProfile({
      roleId: '700A',
      name: 'Backup Role',
      role: 'Archivist',
      detailItems: [
        {
          id: 'manual_detail_backup',
          section: 'preferences',
          sourceKind: 'manual',
          title: 'Tea',
          detail: 'Keeps jasmine tea nearby.',
          createdAt: 1_000,
          updatedAt: 1_000,
        },
        {
          id: 'event_detail_backup',
          section: 'lifePattern',
          sourceKind: 'event_attached',
          title: 'Calendar promise',
          detail: 'Saved a planned museum visit.',
          sourceModule: 'relationship_calendar_confirmed_event',
          sourceId: 'calendar_backup_1',
          memoryKey: 'museum_day',
          relationshipEventId: 'relationship_event_backup',
          createdAt: 2_000,
          updatedAt: 2_000,
        },
      ],
    })
    const binding = chatStore.bindRoleProfile(profile.id, {
      relationshipLevel: 73,
      relationshipNote: 'Thread-local backup note',
    })
    chatStore.appendMessage(binding.id, {
      role: 'assistant',
      content: 'Backup message from this role.',
      status: 'sent',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'calendar_backup_1',
      memoryKey: 'museum_day',
      factType: 'scheduled_calendar_event',
      summary: 'Planned a museum visit together.',
      metricDeltas: {
        affinity: 7,
        trust: 4,
      },
      milestone: 'Museum day planned',
    })

    const backup = createContactsRelationshipBackup({ chatStore, relationshipRuntimeStore })

    setActivePinia(createPinia())
    const restoredChatStore = useChatStore()
    const restoredRelationshipRuntimeStore = useRelationshipRuntimeStore()
    restoredRelationshipRuntimeStore.resetForTesting()

    expect(restoredChatStore.restoreFromBackup(backup)).toBe(true)
    expect(restoredRelationshipRuntimeStore.restoreFromBackup(backup.relationshipRuntime)).toBe(true)

    const restoredProfile = restoredChatStore.getRoleProfileByRoleId('700A')
    expect(restoredProfile).toMatchObject({
      name: 'Backup Role',
      roleId: '700A',
      role: 'Archivist',
    })
    expect(restoredChatStore.listRoleDetailItems(restoredProfile.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'manual_detail_backup',
          sourceKind: 'manual',
          title: 'Tea',
        }),
        expect.objectContaining({
          id: 'event_detail_backup',
          sourceKind: 'event_attached',
          memoryKey: 'museum_day',
          sourceModule: 'relationship_calendar_confirmed_event',
        }),
      ]),
    )

    const restoredBinding = restoredChatStore.contacts.find(
      (item) => item.kind === 'role' && Number(item.profileId) === Number(restoredProfile.id),
    )
    expect(restoredBinding).toMatchObject({
      relationshipLevel: 73,
      relationshipNote: 'Thread-local backup note',
    })
    expect(restoredChatStore.getMessagesByContactId(restoredBinding.id)[0]?.content).toBe(
      'Backup message from this role.',
    )

    const memories = restoredRelationshipRuntimeStore.listMemoryGroupsForTarget({
      profileId: restoredProfile.id,
      name: restoredProfile.name,
    })
    expect(memories).toHaveLength(1)
    expect(memories[0]).toMatchObject({
      memoryKey: 'museum_day',
      primarySourceModule: 'relationship_calendar_confirmed_event',
      primaryFactType: 'scheduled_calendar_event',
      displaySummary: 'Planned a museum visit together.',
    })
    expect(
      restoredRelationshipRuntimeStore
        .buildPromptContextForTarget({ profileId: restoredProfile.id, name: restoredProfile.name })
        .includes('Museum day planned'),
    ).toBe(true)
  })

  test('migrates older role backups without roleId into visible seeded ids', () => {
    const chatStore = useChatStore()
    expect(
      chatStore.restoreFromBackup({
        roleProfiles: [
          {
            id: 42,
            name: 'Legacy Role',
            role: 'Guide',
          },
        ],
        contacts: [
          {
            id: 11,
            kind: 'role',
            profileId: 42,
            name: 'Legacy Role',
            role: 'Guide',
          },
        ],
        conversations: {
          11: {
            contactId: 11,
            lastMessage: 'Legacy hello',
          },
        },
        messagesByConversation: {
          11: [
            {
              role: 'assistant',
              content: 'Legacy hello',
            },
          ],
        },
      }),
    ).toBe(true)

    const restoredProfile = chatStore.getRoleProfileById(42)
    expect(restoredProfile).toMatchObject({
      name: 'Legacy Role',
      roleId: '42',
    })
    expect(chatStore.getRoleProfileByRoleId('42')?.id).toBe(42)
    expect(chatStore.getMessagesByContactId(11)[0]?.content).toBe('Legacy hello')
  })

  test('rejects malformed relationship runtime payloads before mutating current state', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: 9,
        name: 'Stable Role',
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'phone_stable_1',
      memoryKey: 'stable_call',
      factType: 'phone_call',
      summary: 'A stable memory before import.',
      metricDeltas: {
        trust: 5,
      },
    })
    const before = relationshipRuntimeStore.createBackupSnapshot()

    expect(relationshipRuntimeStore.restoreFromBackup(null)).toBe(false)
    expect(relationshipRuntimeStore.createBackupSnapshot()).toEqual(before)
  })
})
