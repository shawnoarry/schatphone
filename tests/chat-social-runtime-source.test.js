import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  CHAT_SOCIAL_EVENT_STATUS,
  CHAT_SOCIAL_EVENT_TYPES,
  chatSocialEventIdForType,
} from '../src/lib/chat-social-event-review'
import {
  CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
  CHAT_SOCIAL_RUNTIME_REASON,
  buildChatSocialRuntimeGreetingProposal,
  listChatSocialRuntimeGreetingCandidates,
} from '../src/lib/chat-social-runtime-source'
import {
  SIMULATION_EVENT_STATUS,
  SIMULATION_SURPRISE_MODE,
  useSimulationStore,
} from '../src/stores/simulation'
import { CHAT_CONTACT_SOCIAL_STATES, useChatStore } from '../src/stores/chat'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/role-profile-schema'

const createRoleBinding = (chatStore, profileInput = {}, bindingInput = {}) => {
  const profile = chatStore.addRoleProfile({
    name: 'Runtime Greeting Role',
    role: 'Runtime contact',
    bio: 'Runtime source fixture.',
    ...profileInput,
  })
  const contact = chatStore.bindRoleProfile(profile.id, {
    chatSocialState: bindingInput.chatSocialState || CHAT_CONTACT_SOCIAL_STATES.STRANGER,
    chatSocialUpdatedAt: bindingInput.chatSocialUpdatedAt || 0,
  })
  return { profile, contact }
}

describe('chat social runtime source', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T08:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('selects only safe stranger or declined role contacts with real role profiles', () => {
    const chatStore = useChatStore()
    const later = createRoleBinding(chatStore, { name: 'Later Candidate' }, {
      chatSocialUpdatedAt: Date.now() + 1000,
    }).contact
    const earlier = createRoleBinding(chatStore, { name: 'Earlier Candidate' }, {
      chatSocialUpdatedAt: Date.now() - 1000,
    }).contact
    createRoleBinding(chatStore, { name: 'Connected Role' }, {
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    })
    const selfProfile = chatStore.addRoleProfile({
      name: 'Self Profile',
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
    })
    chatStore.addContact({
      kind: 'role',
      profileId: selfProfile.id,
      name: 'Self Profile',
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.STRANGER,
    })

    const candidates = listChatSocialRuntimeGreetingCandidates({ chatStore })

    expect(candidates.map((item) => item.id)).toEqual([earlier.id, later.id])
    expect(buildChatSocialRuntimeGreetingProposal({ chatStore })).toMatchObject({
      pilotId: CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
      contactId: earlier.id,
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
      targetId: String(earlier.id),
      source: {
        moduleKey: 'chat',
        conversationId: earlier.id,
        runtimeLogId: CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
      },
    })
  })

  test('submits runtime greetings through the simulation review seam and respects cooldowns', () => {
    const chatStore = useChatStore()
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.BALANCED)
    const { contact } = createRoleBinding(chatStore)
    const eventId = chatSocialEventIdForType(CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST)

    const result = simulationStore.runChatSocialRuntimeProposal({
      chatStore,
      at: Date.now(),
    })

    expect(result).toMatchObject({
      ok: true,
      status: SIMULATION_EVENT_STATUS.TRIGGERED,
      pilotEventId: CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
      proposal: {
        eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
        status: CHAT_SOCIAL_EVENT_STATUS.APPLIED,
        targetContactId: contact.id,
      },
    })
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
    )
    expect(simulationStore.isCoolingDown(eventId, { targetId: String(contact.id) })).toBe(true)
    expect(
      simulationStore.getDailyCounterState(eventId, {
        targetId: String(contact.id),
        limit: 1,
      }).count,
    ).toBe(1)

    chatStore.setContactChatSocialState(contact.id, CHAT_CONTACT_SOCIAL_STATES.STRANGER, {
      at: Date.now() + 1000,
    })
    const blocked = simulationStore.runChatSocialRuntimeProposal({
      chatStore,
      at: Date.now() + 1000,
    })

    expect(blocked).toMatchObject({
      ok: false,
      status: SIMULATION_EVENT_STATUS.SKIPPED,
      reason: 'cooldown_active',
      proposal: {
        status: CHAT_SOCIAL_EVENT_STATUS.BLOCKED,
        reason: 'cooldown_active',
      },
    })
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.STRANGER,
    )
  })

  test('returns a stable skip when no runtime greeting candidate exists', () => {
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()

    expect(simulationStore.runChatSocialRuntimeProposal()).toEqual({
      ok: false,
      status: SIMULATION_EVENT_STATUS.SKIPPED,
      reason: CHAT_SOCIAL_RUNTIME_REASON.NO_CANDIDATE,
      pilotEventId: CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
      proposal: null,
    })
  })
})
