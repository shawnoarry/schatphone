import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import { CHAT_CONTACT_SOCIAL_STATES } from '../src/stores/chat'
import { CONTACTS_ENTITY_TYPES, ROLE_DETAIL_SECTIONS } from '../src/lib/role-profile-schema'
import {
  chatSocialSnapshotLabel,
  contactsEntityTypeLabel,
  useContactsRoleHubModel,
} from '../src/composables/useContactsRoleHubModel'

const t = (zh, en) => en || zh

const createModel = ({
  profile = { id: 7, entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE },
  entityType = profile?.entityType || CONTACTS_ENTITY_TYPES.MAIN_ROLE,
  profileValues = [],
  chatBound = false,
  chatContact = null,
  relationshipSnapshot = { totalMemoryCount: 0 },
  linkedActivitySummary = { sourceText: 'No linked activity yet' },
  detailStats = {},
  chatSocialState = CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
} = {}) =>
  useContactsRoleHubModel({
    selectedProfile: ref(profile),
    selectedProfileEntityType: ref(entityType),
    selectedProfileValues: ref(profileValues),
    selectedProfileChatBound: ref(chatBound),
    selectedRoleChatContact: ref(chatContact),
    selectedRelationshipSnapshot: ref(relationshipSnapshot),
    selectedLinkedActivitySummary: ref(linkedActivitySummary),
    t,
    getDetailItemStatsForSection: (_profile, section) => detailStats[section] || { manual: 0, eventAttached: 0 },
    getContactChatSocialState: () => chatSocialState,
    formatAuditTimestamp: (value) => `time:${value}`,
    formatEntityTypeLabel: (value) => contactsEntityTypeLabel(value, t),
  })

describe('Contacts role hub model interface', () => {
  test('labels entity types and chat social states', () => {
    expect(contactsEntityTypeLabel(CONTACTS_ENTITY_TYPES.SELF_PROFILE, t)).toBe('Self Profile')
    expect(contactsEntityTypeLabel(CONTACTS_ENTITY_TYPES.NPC, t)).toBe('NPC / World Role')
    expect(contactsEntityTypeLabel(CONTACTS_ENTITY_TYPES.MAIN_ROLE, t)).toBe('Main Role')
    expect(chatSocialSnapshotLabel(CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST, t)).toBe('Greeting request pending')
    expect(chatSocialSnapshotLabel(CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED, t)).toBe('Both sides are blocked')
  })

  test('summarizes self profile as context-only and not a chat target', () => {
    const model = createModel({
      profile: { id: 1, entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE },
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
    })

    expect(model.selectedChatStateLabel.value).toBe('Not a Chat target')
    expect(model.selectedChatStateDetail.value).toBe(
      'Self Profile only enters context through visibility gates and is not bound as a chat target.',
    )
    expect(model.selectedChatSocialSnapshot.value).toEqual({
      exists: false,
      label: 'No Chat binding',
      detail: 'Contacts keeps the role profile. Chat Directory decides whether this role can chat.',
      note: '',
      updatedAtLabel: '',
    })
  })

  test('builds role hub stat cards from detail items, world fields, memory count, and source summary', () => {
    const model = createModel({
      profileValues: [{ fieldId: 'agency' }, { fieldId: 'group' }],
      relationshipSnapshot: { totalMemoryCount: 4 },
      linkedActivitySummary: { sourceText: 'Calendar:1, Map:1' },
      detailStats: {
        [ROLE_DETAIL_SECTIONS.PREFERENCES]: { manual: 2, eventAttached: 1 },
        [ROLE_DETAIL_SECTIONS.LIFE_PATTERN]: { manual: 1, eventAttached: 2 },
        [ROLE_DETAIL_SECTIONS.SOCIAL_GRAPH]: { manual: 3, eventAttached: 0 },
      },
    })

    expect(model.selectedRoleHubStats.value).toEqual({
      manual: 6,
      eventAttached: 3,
      worldFieldCount: 2,
      memoryCount: 4,
      chatBound: false,
    })
    expect(model.selectedRoleHubCards.value.map((card) => [card.key, card.value, card.detail])).toEqual([
      ['entity', 'Main Role', 'Bind in Chat Directory when this role should enter Chat; Contacts can maintain the profile first.'],
      ['chat', 'Contacts only', 'No chat entry yet'],
      ['manual', '6', 'User-maintained stable facts'],
      ['event', '3', 'Cleared with memory or relationship reset'],
      ['world', '2', 'From WorldBook templates'],
      ['memory', '4', 'Calendar:1, Map:1'],
    ])
  })

  test('shows bound chat target and read-only social snapshot metadata', () => {
    const model = createModel({
      chatBound: true,
      chatContact: {
        id: 42,
        profileId: 7,
        chatSocialNote: 'AI proposal is waiting elsewhere.',
        chatSocialUpdatedAt: 12345,
      },
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
    })

    expect(model.selectedChatStateLabel.value).toBe('Chat target')
    expect(model.selectedChatStateDetail.value).toBe(
      'Already in Chat Directory; Contacts still owns profile, relationship, and memory management.',
    )
    expect(model.selectedRoleHubCards.value.find((card) => card.key === 'chat')).toMatchObject({
      value: 'Chat target',
      detail: 'Chat ID 42',
    })
    expect(model.selectedChatSocialSnapshot.value).toEqual({
      exists: true,
      state: CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
      label: 'They are not receiving messages',
      detail: 'Read-only from Chat. Contacts displays this state but does not apply communication changes.',
      note: 'AI proposal is waiting elsewhere.',
      updatedAtLabel: 'time:12345',
    })
  })
})
