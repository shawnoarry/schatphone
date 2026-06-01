import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  CHAT_SOCIAL_EVENT_REVIEW_MODE,
  CHAT_SOCIAL_EVENT_STATUS,
  CHAT_SOCIAL_EVENT_TYPES,
  evaluateChatSocialEventReview,
} from '../src/lib/chat-social-event-review'
import { CHAT_CONTACT_SOCIAL_STATES, useChatStore } from '../src/stores/chat'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/role-profile-schema'

const createRoleBinding = (chatStore, profileInput = {}, bindingInput = {}) => {
  const profile = chatStore.addRoleProfile({
    name: 'Social Review Role',
    role: 'Role contact',
    bio: 'Social-event review fixture.',
    ...profileInput,
  })
  const contact = chatStore.bindRoleProfile(profile.id, {
    chatSocialState: bindingInput.chatSocialState || CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
  })
  return { profile, contact }
}

const defaultPolicy = Object.freeze({
  surpriseMode: 'low',
  userAllowsGeneratedSocialEvents: true,
  moduleEventsEnabled: true,
})

describe('chat social event review policy', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T08:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('auto-applies a safe generated greeting as a Chat message request candidate', () => {
    const chatStore = useChatStore()
    const { contact } = createRoleBinding(chatStore, {
      relationshipLabelText: 'raw prose must stay out of policy decisions',
      relationshipLabelNote: 'also not policy input',
      primaryRelationshipCategoryId: 'friendship_bond',
      relationshipModifierIds: ['mutual'],
      classificationConfidence: 'high',
      classificationSource: 'user_edited',
      classificationUpdatedAt: Date.now(),
    })

    const result = evaluateChatSocialEventReview({
      chatStore,
      contactId: contact.id,
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
      triggerSource: 'ai_assisted',
      policy: defaultPolicy,
      at: Date.now(),
    })

    expect(result).toMatchObject({
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
      targetContactId: contact.id,
      targetProfileId: contact.profileId,
      currentChatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
      requestedChatSocialState: CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
      risk: 'low',
      reviewMode: CHAT_SOCIAL_EVENT_REVIEW_MODE.AUTO_APPLY_WITH_AUDIT,
      status: CHAT_SOCIAL_EVENT_STATUS.READY_TO_APPLY,
      reason: 'eligible_low_risk_greeting',
    })
    expect(result.relationshipGate).toMatchObject({
      mode: 'soft_reference',
      decision: 'allow',
      primaryRelationshipCategoryId: 'friendship_bond',
      relationshipModifierIds: ['mutual'],
      classificationSource: 'user_edited',
    })
    expect(result.relationshipGate.relationshipLabelText).toBeUndefined()
    expect(result.relationshipGate.relationshipLabelNote).toBeUndefined()
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    )
  })

  test('keeps role-initiated block pending review without changing Chat state', () => {
    const chatStore = useChatStore()
    const { contact } = createRoleBinding(chatStore)

    const result = evaluateChatSocialEventReview({
      chatStore,
      contactId: contact.id,
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER,
      triggerSource: 'ai_assisted',
      policy: defaultPolicy,
      at: Date.now(),
    })

    expect(result).toMatchObject({
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER,
      requestedChatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
      risk: 'high',
      reviewMode: CHAT_SOCIAL_EVENT_REVIEW_MODE.PENDING_REVIEW,
      status: CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
      reason: 'high_risk_social_change_requires_review',
    })
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    )
  })

  test('keeps role refusal, restore, and unblock events pending review', () => {
    const chatStore = useChatStore()
    const refusingContact = createRoleBinding(chatStore).contact
    const restoringContact = createRoleBinding(chatStore, {}, {
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
    }).contact
    const unblockingContact = createRoleBinding(chatStore, {}, {
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
    }).contact

    const refusal = evaluateChatSocialEventReview({
      chatStore,
      contactId: refusingContact.id,
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_REFUSE_MESSAGES,
      policy: defaultPolicy,
      at: Date.now(),
    })
    const restore = evaluateChatSocialEventReview({
      chatStore,
      contactId: restoringContact.id,
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_RESTORE_MESSAGES,
      policy: defaultPolicy,
      at: Date.now(),
    })
    const unblock = evaluateChatSocialEventReview({
      chatStore,
      contactId: unblockingContact.id,
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER,
      policy: defaultPolicy,
      at: Date.now(),
    })

    expect(refusal).toMatchObject({
      status: CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
      requestedChatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
    })
    expect(restore).toMatchObject({
      status: CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
      requestedChatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    })
    expect(unblock).toMatchObject({
      status: CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
      requestedChatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    })
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(refusingContact.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    )
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(restoringContact.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
    )
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(unblockingContact.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
    )
  })

  test('blocks generated social events for service, group, self, disabled policy, and invalid transitions', () => {
    const chatStore = useChatStore()
    const selfProfile = chatStore.addRoleProfile({
      name: 'Self Profile',
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
    })
    const normal = createRoleBinding(chatStore).contact
    const selfContact = chatStore.addContact({
      kind: 'role',
      profileId: selfProfile.id,
      name: 'Self Profile',
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    })
    const service = chatStore.addContact({
      kind: 'service',
      name: 'Service Account',
    })
    const group = chatStore.addContact({
      kind: 'group',
      name: 'Group Chat',
    })

    const baseInput = {
      chatStore,
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
      triggerSource: 'ai_assisted',
      policy: defaultPolicy,
      at: Date.now(),
    }

    const cases = [
      { contactId: service.id, reason: 'target_not_role_contact' },
      { contactId: group.id, reason: 'target_not_role_contact' },
      { contactId: selfContact.id, reason: 'target_is_self_profile' },
      {
        contactId: normal.id,
        policy: { ...defaultPolicy, userAllowsGeneratedSocialEvents: false },
        reason: 'generated_social_events_disabled',
      },
      {
        contactId: normal.id,
        eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER,
        reason: 'invalid_social_state_transition',
      },
    ]

    cases.forEach((item) => {
      const result = evaluateChatSocialEventReview({ ...baseInput, ...item })
      expect(result.status).toBe(CHAT_SOCIAL_EVENT_STATUS.BLOCKED)
      expect(result.reviewMode).toBe(CHAT_SOCIAL_EVENT_REVIEW_MODE.BLOCK)
      expect(result.reason).toBe(item.reason)
    })
  })
})
