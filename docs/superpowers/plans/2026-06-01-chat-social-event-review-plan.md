# Chat Social Event Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first reviewed path for AI-generated Chat social events so role-initiated greetings can safely become message requests, while role-initiated refusing/blocking changes wait for World Hub review.

**Architecture:** Chat remains the owner of the final communication state. A new pure policy module evaluates generated social-event proposals and describes whether they auto-apply, wait for review, or get blocked. `simulationStore` persists the proposal/audit queue, World Hub reviews pending changes, and Contacts displays only a read-only snapshot.

**Tech Stack:** Vue 3.5, Pinia 3, Vite 7, Vitest 1, Vue Test Utils, existing SchatPhone stores and event-runtime helpers.

---

## File Structure

- Create `src/lib/chat-social-event-review.js`
  - Pure policy module for generated Chat social events.
  - Knows event types, review modes, status names, state-transition rules, and relationship-gate audit metadata.
  - Does not persist data and does not own Chat state.
- Modify `src/stores/simulation.js`
  - Add persisted `chatSocialEventProposals`.
  - Add submit, approve, dismiss, and normalize actions.
  - Calls Chat-owned actions only after the proposal is auto-applied or approved.
- Modify `src/views/ControlCenterView.vue`
  - Add World Hub social-event review panel.
  - Show pending/generated Chat communication changes in user-facing language.
  - Approve/dismiss pending role-initiated block/refusal/unblock changes.
- Modify `src/views/ContactsView.vue`
  - Add a read-only Chat communication snapshot to the role detail page.
  - Make clear that Contacts displays the state but does not decide it.
- Add tests:
  - `tests/chat-social-event-review.test.js`
  - Extend `tests/simulation-store.test.js`
  - Extend `tests/control-center-view.test.js`
  - Extend or add `tests/contacts-social-channel-snapshot.test.js`
- Sync docs:
  - `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
  - `docs/pm/chat-and-chat-directory/PRODUCT_BOUNDARY.md`
  - `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
  - `docs/pm/event-runtime-and-world-hub/PRODUCT_BOUNDARY.md`
  - `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
  - `docs/roadmap/TODO_ROADMAP.md`

---

## Task 1: Pure Social-Event Policy Module

**Files:**
- Create: `src/lib/chat-social-event-review.js`
- Test: `tests/chat-social-event-review.test.js`

- [ ] **Step 1: Write the failing policy tests**

Create `tests/chat-social-event-review.test.js`:

```js
import { beforeEach, describe, expect, test, vi } from 'vitest'
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

describe('chat social event review policy', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T08:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('auto-applies a safe generated greeting as a Chat message request candidate', () => {
    const chatStore = useChatStore()
    const { contact } = createRoleBinding(chatStore, {
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
      policy: {
        surpriseMode: 'low',
        userAllowsGeneratedSocialEvents: true,
        moduleEventsEnabled: true,
      },
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
    })
  })

  test('keeps role-initiated block pending review without changing Chat state', () => {
    const chatStore = useChatStore()
    const { contact } = createRoleBinding(chatStore)

    const result = evaluateChatSocialEventReview({
      chatStore,
      contactId: contact.id,
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER,
      triggerSource: 'ai_assisted',
      policy: {
        surpriseMode: 'balanced',
        userAllowsGeneratedSocialEvents: true,
        moduleEventsEnabled: true,
      },
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
      policy: {
        surpriseMode: 'low',
        userAllowsGeneratedSocialEvents: true,
        moduleEventsEnabled: true,
      },
      at: Date.now(),
    }

    expect(evaluateChatSocialEventReview({ ...baseInput, contactId: service.id }).reason).toBe('target_not_role_contact')
    expect(evaluateChatSocialEventReview({ ...baseInput, contactId: group.id }).reason).toBe('target_not_role_contact')
    expect(evaluateChatSocialEventReview({ ...baseInput, contactId: selfContact.id }).reason).toBe('target_is_self_profile')
    expect(
      evaluateChatSocialEventReview({
        ...baseInput,
        contactId: normal.id,
        policy: { ...baseInput.policy, userAllowsGeneratedSocialEvents: false },
      }).reason,
    ).toBe('generated_social_events_disabled')
    expect(
      evaluateChatSocialEventReview({
        ...baseInput,
        contactId: normal.id,
        eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER,
      }).reason,
    ).toBe('invalid_social_state_transition')
  })
})
```

- [ ] **Step 2: Run the failing policy tests**

Run:

```bash
npm.cmd test -- tests/chat-social-event-review.test.js
```

Expected: fails because `src/lib/chat-social-event-review.js` does not exist.

- [ ] **Step 3: Create the pure policy module**

Create `src/lib/chat-social-event-review.js`:

```js
import { CHAT_CONTACT_SOCIAL_STATES } from '../stores/chat'
import { CONTACTS_ENTITY_TYPES } from './role-profile-schema'
import { buildRelationshipFactGate } from './relationship-event-gating'

export const CHAT_SOCIAL_EVENT_TYPES = Object.freeze({
  ROLE_GREETING_REQUEST: 'role_greeting_request',
  ROLE_REFUSE_MESSAGES: 'role_refuse_messages',
  ROLE_RESTORE_MESSAGES: 'role_restore_messages',
  ROLE_BLOCK_USER: 'role_block_user',
  ROLE_UNBLOCK_USER: 'role_unblock_user',
  USER_ACCEPT_REQUEST: 'user_accept_request',
  USER_DECLINE_REQUEST: 'user_decline_request',
  USER_BLOCK_ROLE: 'user_block_role',
  USER_UNBLOCK_ROLE: 'user_unblock_role',
})

export const CHAT_SOCIAL_EVENT_STATUS = Object.freeze({
  READY_TO_APPLY: 'ready_to_apply',
  APPLIED: 'applied',
  PENDING_REVIEW: 'pending_review',
  DISMISSED: 'dismissed',
  BLOCKED: 'blocked',
  FAILED: 'failed',
})

export const CHAT_SOCIAL_EVENT_REVIEW_MODE = Object.freeze({
  AUTO_APPLY_WITH_AUDIT: 'auto_apply_with_audit',
  PENDING_REVIEW: 'pending_review',
  BLOCK: 'block',
  AUDIT_ONLY: 'audit_only',
})

export const CHAT_SOCIAL_EVENT_RISK = Object.freeze({
  LOW: 'low',
  HIGH: 'high',
})

const SOCIAL_EVENT_IDS = Object.freeze({
  [CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST]: 'chat.social.role_greeting_request.v1',
  [CHAT_SOCIAL_EVENT_TYPES.ROLE_REFUSE_MESSAGES]: 'chat.social.role_refuse_messages.v1',
  [CHAT_SOCIAL_EVENT_TYPES.ROLE_RESTORE_MESSAGES]: 'chat.social.role_restore_messages.v1',
  [CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER]: 'chat.social.role_block_user.v1',
  [CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER]: 'chat.social.role_unblock_user.v1',
  [CHAT_SOCIAL_EVENT_TYPES.USER_ACCEPT_REQUEST]: 'chat.social.user_accept_request.v1',
  [CHAT_SOCIAL_EVENT_TYPES.USER_DECLINE_REQUEST]: 'chat.social.user_decline_request.v1',
  [CHAT_SOCIAL_EVENT_TYPES.USER_BLOCK_ROLE]: 'chat.social.user_block_role.v1',
  [CHAT_SOCIAL_EVENT_TYPES.USER_UNBLOCK_ROLE]: 'chat.social.user_unblock_role.v1',
})

const normalizeText = (value, fallback = '', max = 220) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeEventType = (value = '') => {
  const normalized = normalizeText(value, '', 120)
  return Object.values(CHAT_SOCIAL_EVENT_TYPES).includes(normalized) ? normalized : ''
}

const normalizeTimestamp = (value, fallback = Date.now()) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(num)
}

const toPositiveInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback
}

const isGeneratedEventType = (eventType = '') =>
  [
    CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
    CHAT_SOCIAL_EVENT_TYPES.ROLE_REFUSE_MESSAGES,
    CHAT_SOCIAL_EVENT_TYPES.ROLE_RESTORE_MESSAGES,
    CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER,
    CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER,
  ].includes(eventType)

const riskForEventType = (eventType = '') =>
  eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST
    ? CHAT_SOCIAL_EVENT_RISK.LOW
    : CHAT_SOCIAL_EVENT_RISK.HIGH

export const chatSocialEventIdForType = (eventType = '') =>
  SOCIAL_EVENT_IDS[normalizeEventType(eventType)] || 'chat.social.unknown.v1'

export const resolveRequestedChatSocialState = (eventType = '', currentState = '') => {
  const state = normalizeText(currentState, CHAT_CONTACT_SOCIAL_STATES.CONNECTED, 80)
  if (eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST) {
    if (
      [
        CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
        CHAT_CONTACT_SOCIAL_STATES.STRANGER,
        CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED,
      ].includes(state)
    ) {
      return CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST
    }
    return ''
  }
  if (
    eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_REFUSE_MESSAGES ||
    eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER
  ) {
    if (state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED) return CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
    if (
      [
        CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
        CHAT_CONTACT_SOCIAL_STATES.STRANGER,
        CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
        CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST,
        CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED,
      ].includes(state)
    ) {
      return CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED
    }
    return ''
  }
  if (
    eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_RESTORE_MESSAGES ||
    eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER
  ) {
    if (state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED) return CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED
    if (state === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED) return CHAT_CONTACT_SOCIAL_STATES.CONNECTED
    return ''
  }
  return ''
}

const createBlockedProposal = ({
  eventType = '',
  contactId = 0,
  profileId = 0,
  triggerSource = 'ai_assisted',
  reason = 'blocked',
  explanation = '',
  currentChatSocialState = '',
  at = Date.now(),
  relationshipGate = null,
  policy = {},
} = {}) => ({
  id: '',
  eventType,
  eventId: chatSocialEventIdForType(eventType),
  targetContactId: toPositiveInt(contactId),
  targetProfileId: toPositiveInt(profileId),
  currentChatSocialState: currentChatSocialState || '',
  requestedChatSocialState: '',
  triggerSource: normalizeText(triggerSource, 'ai_assisted', 40),
  risk: riskForEventType(eventType),
  reviewMode: CHAT_SOCIAL_EVENT_REVIEW_MODE.BLOCK,
  status: CHAT_SOCIAL_EVENT_STATUS.BLOCKED,
  reason,
  explanation: explanation || reason,
  relationshipGate,
  policySnapshot: {
    surpriseMode: normalizeText(policy.surpriseMode, 'low', 40),
    userAllowsGeneratedSocialEvents: policy.userAllowsGeneratedSocialEvents !== false,
    moduleEventsEnabled: policy.moduleEventsEnabled !== false,
  },
  source: {
    moduleKey: 'chat',
    conversationId: toPositiveInt(contactId),
    messageId: normalizeText(policy.messageId, '', 160),
    runtimeLogId: '',
  },
  createdAt: normalizeTimestamp(at),
  reviewedAt: 0,
  appliedAt: 0,
})

export const evaluateChatSocialEventReview = ({
  chatStore,
  contactId,
  eventType,
  triggerSource = 'ai_assisted',
  policy = {},
  registry = null,
  at = Date.now(),
  explanation = '',
} = {}) => {
  const normalizedEventType = normalizeEventType(eventType)
  const normalizedContactId = toPositiveInt(contactId)
  const contact =
    normalizedContactId > 0 && typeof chatStore?.getContactById === 'function'
      ? chatStore.getContactById(normalizedContactId)
      : null
  const currentState =
    contact && typeof chatStore?.getContactChatSocialState === 'function'
      ? chatStore.getContactChatSocialState(contact)
      : ''
  const profile =
    contact?.profileId && typeof chatStore?.getRoleProfileById === 'function'
      ? chatStore.getRoleProfileById(contact.profileId)
      : null

  if (!normalizedEventType) {
    return createBlockedProposal({ eventType: '', contactId: normalizedContactId, triggerSource, reason: 'unsupported_social_event_type', at, policy })
  }
  if (!contact) {
    return createBlockedProposal({ eventType: normalizedEventType, contactId: normalizedContactId, triggerSource, reason: 'target_contact_missing', at, policy })
  }
  if (contact.kind !== 'role') {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: contact.id,
      profileId: contact.profileId,
      triggerSource,
      reason: 'target_not_role_contact',
      currentChatSocialState: currentState,
      at,
      policy,
    })
  }
  if (profile?.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: contact.id,
      profileId: contact.profileId,
      triggerSource,
      reason: 'target_is_self_profile',
      currentChatSocialState: currentState,
      at,
      policy,
    })
  }
  if (isGeneratedEventType(normalizedEventType) && policy.userAllowsGeneratedSocialEvents === false) {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: contact.id,
      profileId: contact.profileId,
      triggerSource,
      reason: 'generated_social_events_disabled',
      currentChatSocialState: currentState,
      at,
      policy,
    })
  }
  if (isGeneratedEventType(normalizedEventType) && policy.moduleEventsEnabled === false) {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: contact.id,
      profileId: contact.profileId,
      triggerSource,
      reason: 'module_events_disabled',
      currentChatSocialState: currentState,
      at,
      policy,
    })
  }
  if (isGeneratedEventType(normalizedEventType) && policy.surpriseMode === 'off') {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: contact.id,
      profileId: contact.profileId,
      triggerSource,
      reason: 'surprise_mode_off',
      currentChatSocialState: currentState,
      at,
      policy,
    })
  }

  const requestedChatSocialState = resolveRequestedChatSocialState(normalizedEventType, currentState)
  const relationshipGate = buildRelationshipFactGate({
    chatStore,
    target: contact,
    factType: normalizedEventType,
    risk: 'low',
    registry,
  })
  if (!requestedChatSocialState) {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: contact.id,
      profileId: contact.profileId,
      triggerSource,
      reason: 'invalid_social_state_transition',
      currentChatSocialState: currentState,
      at,
      relationshipGate,
      policy,
    })
  }

  const risk = riskForEventType(normalizedEventType)
  const reviewMode =
    risk === CHAT_SOCIAL_EVENT_RISK.LOW
      ? CHAT_SOCIAL_EVENT_REVIEW_MODE.AUTO_APPLY_WITH_AUDIT
      : CHAT_SOCIAL_EVENT_REVIEW_MODE.PENDING_REVIEW
  const status =
    reviewMode === CHAT_SOCIAL_EVENT_REVIEW_MODE.AUTO_APPLY_WITH_AUDIT
      ? CHAT_SOCIAL_EVENT_STATUS.READY_TO_APPLY
      : CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW

  return {
    id: '',
    eventType: normalizedEventType,
    eventId: chatSocialEventIdForType(normalizedEventType),
    targetContactId: Number(contact.id),
    targetProfileId: toPositiveInt(contact.profileId),
    targetName: normalizeText(profile?.name || contact.name, '', 120),
    currentChatSocialState: currentState,
    requestedChatSocialState,
    triggerSource: normalizeText(triggerSource, 'ai_assisted', 40),
    risk,
    reviewMode,
    status,
    reason:
      reviewMode === CHAT_SOCIAL_EVENT_REVIEW_MODE.AUTO_APPLY_WITH_AUDIT
        ? 'eligible_low_risk_greeting'
        : 'high_risk_social_change_requires_review',
    explanation:
      explanation ||
      (reviewMode === CHAT_SOCIAL_EVENT_REVIEW_MODE.AUTO_APPLY_WITH_AUDIT
        ? 'Role initiated a low-risk greeting request.'
        : 'Role initiated a high-risk communication change that requires World Hub review.'),
    relationshipGate,
    policySnapshot: {
      surpriseMode: normalizeText(policy.surpriseMode, 'low', 40),
      userAllowsGeneratedSocialEvents: policy.userAllowsGeneratedSocialEvents !== false,
      moduleEventsEnabled: policy.moduleEventsEnabled !== false,
    },
    source: {
      moduleKey: 'chat',
      conversationId: Number(contact.id),
      messageId: normalizeText(policy.messageId, '', 160),
      runtimeLogId: '',
    },
    createdAt: normalizeTimestamp(at),
    reviewedAt: 0,
    appliedAt: 0,
  }
}

export const applyChatSocialEventToChatStore = ({ chatStore, proposal, at = Date.now() } = {}) => {
  if (!proposal?.targetContactId || !proposal.requestedChatSocialState) return false
  return Boolean(
    chatStore?.setContactChatSocialState?.(proposal.targetContactId, proposal.requestedChatSocialState, {
      note: proposal.explanation || proposal.reason || '',
      at,
    }),
  )
}

export const buildChatSocialEventLogInput = (proposal = {}) => {
  const status =
    proposal.status === CHAT_SOCIAL_EVENT_STATUS.APPLIED
      ? 'triggered'
      : proposal.status === CHAT_SOCIAL_EVENT_STATUS.FAILED
        ? 'failed'
        : 'skipped'
  return {
    eventId: proposal.eventId || chatSocialEventIdForType(proposal.eventType),
    moduleKey: 'chat',
    targetId: proposal.targetContactId ? String(proposal.targetContactId) : '',
    adapterKey: 'chat.apply_social_channel_state',
    triggerSource: proposal.triggerSource || 'ai_assisted',
    status,
    reason: proposal.reason || proposal.status || 'chat_social_event_reviewed',
    at: proposal.appliedAt || proposal.reviewedAt || proposal.createdAt || Date.now(),
  }
}
```

- [ ] **Step 4: Run the policy tests**

Run:

```bash
npm.cmd test -- tests/chat-social-event-review.test.js
```

Expected: all tests in `chat-social-event-review.test.js` pass.

- [ ] **Step 5: Commit the policy module**

Run:

```bash
git add src/lib/chat-social-event-review.js tests/chat-social-event-review.test.js
git commit -m "feat: add chat social event review policy"
```

---

## Task 2: Persist And Apply Social-Event Proposals In Event Runtime

**Files:**
- Modify: `src/stores/simulation.js`
- Test: `tests/simulation-store.test.js`

- [ ] **Step 1: Extend the simulation-store tests**

Append this test to `tests/simulation-store.test.js`:

```js
test('stores generated Chat social proposals and applies only approved communication changes', () => {
  const chatStore = useChatStore()
  const store = useSimulationStore()
  store.resetForTesting()
  store.setSurpriseMode(SIMULATION_SURPRISE_MODE.BALANCED)

  const profile = chatStore.addRoleProfile({
    name: 'Runtime Social Role',
    role: 'Contact',
  })
  const contact = chatStore.bindRoleProfile(profile.id, {
    chatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
  })

  const greeting = store.submitChatSocialEventProposal(
    {
      contactId: contact.id,
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
      triggerSource: SIMULATION_TRIGGER_SOURCE.AI_ASSISTED,
    },
    { chatStore, at: Date.now() },
  )

  expect(greeting).toMatchObject({
    eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
    status: CHAT_SOCIAL_EVENT_STATUS.APPLIED,
    requestedChatSocialState: CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
  })
  expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe(
    CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
  )

  chatStore.acceptChatContactRequest(contact.id, { at: Date.now() + 1 })

  const block = store.submitChatSocialEventProposal(
    {
      contactId: contact.id,
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER,
      triggerSource: SIMULATION_TRIGGER_SOURCE.AI_ASSISTED,
    },
    { chatStore, at: Date.now() + 2 },
  )

  expect(block).toMatchObject({
    status: CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
    requestedChatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
  })
  expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe(
    CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
  )
  expect(store.pendingChatSocialEventProposalCount).toBe(1)

  const approved = store.approveChatSocialEventProposal(block.id, { chatStore, at: Date.now() + 3 })
  expect(approved?.status).toBe(CHAT_SOCIAL_EVENT_STATUS.APPLIED)
  expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe(
    CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
  )
})
```

Add these imports to the top of `tests/simulation-store.test.js`:

```js
import {
  CHAT_SOCIAL_EVENT_STATUS,
  CHAT_SOCIAL_EVENT_TYPES,
} from '../src/lib/chat-social-event-review'
import { CHAT_CONTACT_SOCIAL_STATES, useChatStore } from '../src/stores/chat'
```

- [ ] **Step 2: Run the failing simulation-store test**

Run:

```bash
npm.cmd test -- tests/simulation-store.test.js
```

Expected: fails because `submitChatSocialEventProposal`, `approveChatSocialEventProposal`, and `pendingChatSocialEventProposalCount` do not exist.

- [ ] **Step 3: Add proposal state and actions to `simulationStore`**

In `src/stores/simulation.js`, add this import near the existing imports:

```js
import {
  CHAT_SOCIAL_EVENT_REVIEW_MODE,
  CHAT_SOCIAL_EVENT_STATUS,
  applyChatSocialEventToChatStore,
  buildChatSocialEventLogInput,
  evaluateChatSocialEventReview,
} from '../lib/chat-social-event-review'
```

Add the proposal limit near existing limits:

```js
const SIMULATION_CHAT_SOCIAL_PROPOSAL_LIMIT = 120
```

Add normalization helpers before `useSimulationStore`:

```js
const normalizeChatSocialProposalSource = (rawSource = {}) => {
  const source = rawSource && typeof rawSource === 'object' ? rawSource : {}
  return {
    moduleKey: normalizeText(source.moduleKey, 'chat', 80),
    conversationId: Math.max(0, toInt(source.conversationId, 0)),
    messageId: normalizeText(source.messageId, '', 160),
    runtimeLogId: normalizeText(source.runtimeLogId, '', 180),
  }
}

const normalizeChatSocialRelationshipGate = (rawGate = null) => {
  if (!rawGate || typeof rawGate !== 'object') return null
  return {
    mode: normalizeText(rawGate.mode, '', 80),
    decision: normalizeText(rawGate.decision, '', 80),
    reason: normalizeText(rawGate.reason, '', 160),
    eventType: normalizeText(rawGate.eventType, '', 120),
    primaryRelationshipCategoryId: normalizeText(
      rawGate.primaryRelationshipCategoryId,
      'ordinary_acquaintance',
      120,
    ),
    relationshipModifierIds: normalizeTextList(rawGate.relationshipModifierIds, 12, 120),
    classificationConfidence: normalizeText(rawGate.classificationConfidence, '', 80),
    classificationSource: normalizeText(rawGate.classificationSource, '', 80),
    classificationUpdatedAt: normalizeTimestamp(rawGate.classificationUpdatedAt, 0),
    matched: Boolean(rawGate.matched),
  }
}

const normalizeChatSocialEventProposal = (rawProposal, index = 0) => {
  if (!rawProposal || typeof rawProposal !== 'object') return null
  const eventType = normalizeText(rawProposal.eventType, '', 120)
  if (!eventType) return null
  const createdAt = normalizeTimestamp(rawProposal.createdAt, Date.now() - index)
  const id =
    normalizeText(rawProposal.id, '', 180) ||
    `chat_social_event_${createdAt}_${index}_${eventType.replace(/[^a-zA-Z0-9_.-]/g, '_')}`
  return {
    id,
    eventType,
    eventId: normalizeText(rawProposal.eventId, `chat.social.${eventType}.v1`, 160),
    targetContactId: Math.max(0, toInt(rawProposal.targetContactId, 0)),
    targetProfileId: Math.max(0, toInt(rawProposal.targetProfileId, 0)),
    targetName: normalizeText(rawProposal.targetName, '', 120),
    currentChatSocialState: normalizeText(rawProposal.currentChatSocialState, '', 80),
    requestedChatSocialState: normalizeText(rawProposal.requestedChatSocialState, '', 80),
    triggerSource: normalizeTriggerSource(rawProposal.triggerSource, SIMULATION_TRIGGER_SOURCE.AI_ASSISTED),
    risk: normalizeText(rawProposal.risk, 'low', 40),
    reviewMode: normalizeText(rawProposal.reviewMode, CHAT_SOCIAL_EVENT_REVIEW_MODE.BLOCK, 80),
    status: normalizeText(rawProposal.status, CHAT_SOCIAL_EVENT_STATUS.BLOCKED, 80),
    reason: normalizeText(rawProposal.reason, '', 220),
    explanation: normalizeText(rawProposal.explanation, '', 300),
    relationshipGate: normalizeChatSocialRelationshipGate(rawProposal.relationshipGate),
    policySnapshot: {
      surpriseMode: normalizeSurpriseMode(rawProposal.policySnapshot?.surpriseMode),
      userAllowsGeneratedSocialEvents: rawProposal.policySnapshot?.userAllowsGeneratedSocialEvents !== false,
      moduleEventsEnabled: rawProposal.policySnapshot?.moduleEventsEnabled !== false,
    },
    source: normalizeChatSocialProposalSource(rawProposal.source),
    createdAt,
    reviewedAt: normalizeTimestamp(rawProposal.reviewedAt, 0),
    appliedAt: normalizeTimestamp(rawProposal.appliedAt, 0),
  }
}

const normalizeChatSocialEventProposals = (rawProposals) => {
  if (!Array.isArray(rawProposals)) return []
  const seen = new Set()
  return rawProposals
    .map((item, index) => normalizeChatSocialEventProposal(item, index))
    .filter((item) => {
      if (!item || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, SIMULATION_CHAT_SOCIAL_PROPOSAL_LIMIT)
}
```

Inside `useSimulationStore`, add the ref and computed values:

```js
const chatSocialEventProposals = ref([])
const pendingChatSocialEventProposals = computed(() =>
  chatSocialEventProposals.value.filter((item) => item.status === CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW),
)
const pendingChatSocialEventProposalCount = computed(() => pendingChatSocialEventProposals.value.length)
```

Add these actions after `recordEventTrigger`:

```js
const upsertChatSocialEventProposal = (proposal = {}) => {
  const normalized = normalizeChatSocialEventProposal(proposal, 0)
  if (!normalized) return null
  chatSocialEventProposals.value = [
    normalized,
    ...chatSocialEventProposals.value.filter((item) => item.id !== normalized.id),
  ].slice(0, SIMULATION_CHAT_SOCIAL_PROPOSAL_LIMIT)
  return normalized
}

const submitChatSocialEventProposal = (input = {}, { chatStore, registry = null, at = Date.now() } = {}) => {
  const proposal = evaluateChatSocialEventReview({
    chatStore,
    contactId: input.contactId || input.targetContactId,
    eventType: input.eventType,
    triggerSource: input.triggerSource || SIMULATION_TRIGGER_SOURCE.AI_ASSISTED,
    policy: {
      surpriseMode: settings.value.surpriseMode,
      moduleEventsEnabled: isModuleEventsEnabled('chat'),
      userAllowsGeneratedSocialEvents: input.userAllowsGeneratedSocialEvents !== false,
      messageId: input.messageId,
    },
    registry,
    at,
    explanation: input.explanation,
  })

  const withId = {
    ...proposal,
    id:
      proposal.id ||
      `chat_social_event_${normalizeTimestamp(at)}_${chatSocialEventProposals.value.length + 1}_${proposal.eventType}`,
  }

  let nextProposal = withId
  if (withId.reviewMode === CHAT_SOCIAL_EVENT_REVIEW_MODE.AUTO_APPLY_WITH_AUDIT) {
    const applied = applyChatSocialEventToChatStore({ chatStore, proposal: withId, at })
    nextProposal = {
      ...withId,
      status: applied ? CHAT_SOCIAL_EVENT_STATUS.APPLIED : CHAT_SOCIAL_EVENT_STATUS.FAILED,
      reason: applied ? withId.reason : 'chat_social_state_apply_failed',
      appliedAt: applied ? normalizeTimestamp(at) : 0,
    }
  }

  const stored = upsertChatSocialEventProposal(nextProposal)
  recordEventLog(buildChatSocialEventLogInput(stored || nextProposal))
  return stored
}

const approveChatSocialEventProposal = (proposalId, { chatStore, at = Date.now() } = {}) => {
  const id = normalizeText(proposalId, '', 180)
  const existing = chatSocialEventProposals.value.find((item) => item.id === id)
  if (!existing || existing.status !== CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW) return null
  const applied = applyChatSocialEventToChatStore({ chatStore, proposal: existing, at })
  const nextProposal = {
    ...existing,
    status: applied ? CHAT_SOCIAL_EVENT_STATUS.APPLIED : CHAT_SOCIAL_EVENT_STATUS.FAILED,
    reason: applied ? 'approved_by_world_hub' : 'chat_social_state_apply_failed',
    reviewedAt: normalizeTimestamp(at),
    appliedAt: applied ? normalizeTimestamp(at) : 0,
  }
  const stored = upsertChatSocialEventProposal(nextProposal)
  recordEventLog(buildChatSocialEventLogInput(stored || nextProposal))
  return stored
}

const dismissChatSocialEventProposal = (proposalId, { at = Date.now() } = {}) => {
  const id = normalizeText(proposalId, '', 180)
  const existing = chatSocialEventProposals.value.find((item) => item.id === id)
  if (!existing || existing.status !== CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW) return null
  const nextProposal = {
    ...existing,
    status: CHAT_SOCIAL_EVENT_STATUS.DISMISSED,
    reason: 'dismissed_by_world_hub',
    reviewedAt: normalizeTimestamp(at),
  }
  const stored = upsertChatSocialEventProposal(nextProposal)
  recordEventLog(buildChatSocialEventLogInput(stored || nextProposal))
  return stored
}
```

Update persistence:

```js
// in applyPersistedSource
chatSocialEventProposals.value = normalizeChatSocialEventProposals(rawSource.chatSocialEventProposals)

// in createBackupSnapshot
chatSocialEventProposals: chatSocialEventProposals.value.map((item) => ({
  ...item,
  relationshipGate: item.relationshipGate ? { ...item.relationshipGate } : null,
  policySnapshot: { ...item.policySnapshot },
  source: { ...item.source },
})),

// in resetForTesting
chatSocialEventProposals.value = []

// in watch source list
[eventLogs, cooldownsByEvent, dailyCounters, settings, chatSocialEventProposals]
```

Export the new state/actions from the returned object:

```js
chatSocialEventProposals,
pendingChatSocialEventProposals,
pendingChatSocialEventProposalCount,
submitChatSocialEventProposal,
approveChatSocialEventProposal,
dismissChatSocialEventProposal,
```

- [ ] **Step 4: Run the simulation-store test**

Run:

```bash
npm.cmd test -- tests/simulation-store.test.js
```

Expected: all simulation-store tests pass.

- [ ] **Step 5: Commit the event-runtime proposal store**

Run:

```bash
git add src/stores/simulation.js tests/simulation-store.test.js
git commit -m "feat: persist chat social event proposals"
```

---

## Task 3: World Hub Review For Pending Chat Social Events

**Files:**
- Modify: `src/views/ControlCenterView.vue`
- Test: `tests/control-center-view.test.js`

- [ ] **Step 1: Add World Hub test coverage**

Append this test to `tests/control-center-view.test.js`:

```js
test('reviews pending generated Chat social events before applying communication state', async () => {
  const systemStore = useSystemStore()
  const chatStore = useChatStore()
  const simulationStore = useSimulationStore()
  const relationshipRuntimeStore = useRelationshipRuntimeStore()
  systemStore.settings.system.language = 'en-US'
  systemStore.setMoreFeatureToggle('control_center', true)
  relationshipRuntimeStore.resetForTesting()
  simulationStore.resetForTesting()

  const profile = chatStore.addRoleProfile({
    roleId: '8801',
    name: 'World Hub Social Role',
    role: 'Contact',
  })
  const contact = chatStore.bindRoleProfile(profile.id, {
    chatSocialState: 'connected',
  })
  const pending = simulationStore.submitChatSocialEventProposal(
    {
      contactId: contact.id,
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER,
      triggerSource: SIMULATION_TRIGGER_SOURCE.AI_ASSISTED,
      explanation: 'The role wants to stop receiving messages after a conflict.',
    },
    { chatStore, at: Date.now() },
  )

  const { wrapper } = await mountControlCenterView()

  const panel = wrapper.get('[data-testid="control-center-chat-social-panel"]')
  expect(panel.text()).toContain('Chat social events')
  expect(panel.text()).toContain('World Hub Social Role')
  expect(panel.text()).toContain('Role blocks user')
  expect(panel.text()).toContain('Pending review')
  expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe('connected')

  await wrapper.get(`[data-testid="control-center-chat-social-approve-${pending.id}"]`).trigger('click')
  await flushUi()

  expect(simulationStore.chatSocialEventProposals.find((item) => item.id === pending.id)?.status).toBe('applied')
  expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe('contact_blocked')

  wrapper.unmount()
})
```

Add this import to `tests/control-center-view.test.js`:

```js
import { CHAT_SOCIAL_EVENT_TYPES } from '../src/lib/chat-social-event-review'
```

- [ ] **Step 2: Run the failing World Hub test**

Run:

```bash
npm.cmd test -- tests/control-center-view.test.js
```

Expected: fails because the Chat social review panel and action buttons do not exist.

- [ ] **Step 3: Add computed rows and actions to `ControlCenterView.vue`**

Add the import:

```js
import {
  CHAT_SOCIAL_EVENT_STATUS,
  CHAT_SOCIAL_EVENT_TYPES,
} from '../lib/chat-social-event-review'
```

Add store refs:

```js
const {
  eventLogCount,
  recentEventLogs,
  activeCooldownCount,
  surpriseMode,
  pendingChatSocialEventProposalCount,
} = storeToRefs(simulationStore)
```

Add label helpers:

```js
const chatSocialEventTypeLabel = (eventType = '') => {
  if (eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST) return t('Role greeting request', 'Role greeting request')
  if (eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_REFUSE_MESSAGES) return t('Role refuses messages', 'Role refuses messages')
  if (eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_RESTORE_MESSAGES) return t('Role restores messages', 'Role restores messages')
  if (eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER) return t('Role blocks user', 'Role blocks user')
  if (eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER) return t('Role unblocks user', 'Role unblocks user')
  return eventType || t('Chat social event', 'Chat social event')
}

const chatSocialEventStatusLabel = (status = '') => {
  if (status === CHAT_SOCIAL_EVENT_STATUS.APPLIED) return t('Applied', 'Applied')
  if (status === CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW) return t('Pending review', 'Pending review')
  if (status === CHAT_SOCIAL_EVENT_STATUS.BLOCKED) return t('Blocked', 'Blocked')
  if (status === CHAT_SOCIAL_EVENT_STATUS.DISMISSED) return t('Dismissed', 'Dismissed')
  if (status === CHAT_SOCIAL_EVENT_STATUS.FAILED) return t('Failed', 'Failed')
  return status || t('Unknown', 'Unknown')
}

const chatSocialEventStatusClass = (status = '') => {
  if (status === CHAT_SOCIAL_EVENT_STATUS.APPLIED) return 'bg-emerald-300/15 text-emerald-100'
  if (status === CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW) return 'bg-amber-300/15 text-amber-100'
  if (status === CHAT_SOCIAL_EVENT_STATUS.FAILED || status === CHAT_SOCIAL_EVENT_STATUS.BLOCKED) {
    return 'bg-rose-300/15 text-rose-100'
  }
  return 'bg-white/10 text-slate-300'
}
```

Add row and selected-detail computed values:

```js
const selectedChatSocialEventId = ref('')

const chatSocialEventRows = computed(() =>
  simulationStore.chatSocialEventProposals.slice(0, 8).map((proposal) => {
    const contact = chatStore.getContactById(proposal.targetContactId)
    const profile = proposal.targetProfileId ? chatStore.getRoleProfileById(proposal.targetProfileId) : null
    return {
      ...proposal,
      targetLabel: profile?.name || contact?.name || proposal.targetName || t('Unknown role', 'Unknown role'),
      typeLabel: chatSocialEventTypeLabel(proposal.eventType),
      statusLabel: chatSocialEventStatusLabel(proposal.status),
      statusClass: chatSocialEventStatusClass(proposal.status),
      canReview: proposal.status === CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
      createdAtLabel: formatRuntimeTime(proposal.createdAt),
    }
  }),
)

const selectedChatSocialEvent = computed(() =>
  chatSocialEventRows.value.find((item) => item.id === selectedChatSocialEventId.value) ||
  chatSocialEventRows.value[0] ||
  null,
)

const approveChatSocialEvent = (proposalId) => {
  simulationStore.approveChatSocialEventProposal(proposalId, { chatStore, at: Date.now() })
}

const dismissChatSocialEvent = (proposalId) => {
  simulationStore.dismissChatSocialEventProposal(proposalId, { at: Date.now() })
}
```

Add a fifth stat to `runtimeStats`:

```js
{
  id: 'pending-chat-social',
  label: t('Pending Chat social', 'Pending Chat social'),
  value: String(pendingChatSocialEventProposalCount.value),
  hint: t('Role-initiated block/refusal changes wait here before Chat changes.', 'Role-initiated block/refusal changes wait here before Chat changes.'),
}
```

- [ ] **Step 4: Add the World Hub panel markup**

Insert a section after the runtime readout panel and before the relationship panel:

```vue
<section
  class="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4"
  data-testid="control-center-chat-social-panel"
>
  <div class="flex items-start justify-between gap-3">
    <div>
      <p class="text-[11px] uppercase tracking-[0.18em] text-amber-100">
        {{ t('Chat social events', 'Chat social events') }}
      </p>
      <h2 class="mt-1 text-base font-semibold">
        {{ t('Role-initiated communication review', 'Role-initiated communication review') }}
      </h2>
    </div>
    <span class="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
      {{ t('Review first', 'Review first') }}
    </span>
  </div>
  <p class="mt-2 text-xs leading-5 text-slate-300">
    {{ t('AI may propose greetings or blocking changes, but World Hub reviews high-risk communication changes before Chat applies them.', 'AI may propose greetings or blocking changes, but World Hub reviews high-risk communication changes before Chat applies them.') }}
  </p>

  <div v-if="chatSocialEventRows.length" class="mt-3 space-y-2">
    <article
      v-for="event in chatSocialEventRows"
      :key="event.id"
      class="rounded-2xl border p-3"
      :class="selectedChatSocialEvent?.id === event.id ? 'border-amber-200/70 bg-amber-200/10' : 'border-white/10 bg-white/8'"
      data-testid="control-center-chat-social-event"
      @click="selectedChatSocialEventId = event.id"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold text-white">{{ event.typeLabel }}</p>
          <p class="mt-1 text-[11px] text-slate-500">
            {{ event.targetLabel }} / {{ event.createdAtLabel }}
          </p>
        </div>
        <span class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold" :class="event.statusClass">
          {{ event.statusLabel }}
        </span>
      </div>
      <p class="mt-2 text-[11px] leading-4 text-slate-400">
        {{ event.explanation || event.reason }}
      </p>
      <p class="mt-1 text-[10px] leading-4 text-slate-600">
        {{ t('State change', 'State change') }}:
        {{ event.currentChatSocialState || '-' }} -> {{ event.requestedChatSocialState || '-' }}
      </p>
      <div v-if="event.canReview" class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-full bg-emerald-300 px-3 py-1.5 text-[11px] font-semibold text-slate-950"
          :data-testid="`control-center-chat-social-approve-${event.id}`"
          @click.stop="approveChatSocialEvent(event.id)"
        >
          {{ t('Apply to Chat', 'Apply to Chat') }}
        </button>
        <button
          type="button"
          class="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-200"
          :data-testid="`control-center-chat-social-dismiss-${event.id}`"
          @click.stop="dismissChatSocialEvent(event.id)"
        >
          {{ t('Dismiss', 'Dismiss') }}
        </button>
      </div>
    </article>
  </div>
  <p v-else class="mt-3 rounded-2xl bg-white/8 px-3 py-3 text-xs leading-5 text-slate-400">
    {{ t('No generated Chat social events yet. User-authored Chat actions still stay inside Chat.', 'No generated Chat social events yet. User-authored Chat actions still stay inside Chat.') }}
  </p>

  <article
    v-if="selectedChatSocialEvent"
    class="mt-3 rounded-2xl border border-amber-200/20 bg-amber-200/8 p-3"
    data-testid="control-center-chat-social-detail"
  >
    <p class="text-xs font-semibold text-white">{{ t('Review detail', 'Review detail') }}</p>
    <div class="mt-3 grid gap-2 text-[11px]">
      <span class="rounded-xl bg-white/8 px-3 py-2">
        {{ t('Requested Chat state', 'Requested Chat state') }}:
        {{ selectedChatSocialEvent.requestedChatSocialState || '-' }}
      </span>
      <span class="rounded-xl bg-white/8 px-3 py-2">
        {{ t('Relationship gate', 'Relationship gate') }}:
        {{ selectedChatSocialEvent.relationshipGate?.mode || '-' }} /
        {{ selectedChatSocialEvent.relationshipGate?.primaryRelationshipCategoryId || '-' }}
      </span>
      <span class="rounded-xl bg-white/8 px-3 py-2">
        {{ t('Rule', 'Rule') }}:
        {{ t('Chat changes only after this proposal is applied.', 'Chat changes only after this proposal is applied.') }}
      </span>
    </div>
  </article>
</section>
```

- [ ] **Step 5: Run World Hub tests**

Run:

```bash
npm.cmd test -- tests/control-center-view.test.js
```

Expected: all Control Center tests pass.

- [ ] **Step 6: Commit World Hub review UI**

Run:

```bash
git add src/views/ControlCenterView.vue tests/control-center-view.test.js
git commit -m "feat: review chat social events in world hub"
```

---

## Task 4: Contacts Read-Only Social Snapshot

**Files:**
- Modify: `src/views/ContactsView.vue`
- Test: `tests/contacts-social-channel-snapshot.test.js`

- [ ] **Step 1: Add Contacts snapshot test**

Create `tests/contacts-social-channel-snapshot.test.js`:

```js
import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ContactsView from '../src/views/ContactsView.vue'
import { CHAT_CONTACT_SOCIAL_STATES, useChatStore } from '../src/stores/chat'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', component: ContactsView },
      { path: '/chat/:id', component: DummyView },
      { path: '/chat-contacts', component: DummyView },
      { path: '/home', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('Contacts social-channel snapshot', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
    useRelationshipRuntimeStore().resetForTesting()
  })

  test('shows Chat communication state as a read-only role snapshot', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '9901',
      name: 'Contacts Social Snapshot',
      role: 'Role contact',
    })
    chatStore.bindRoleProfile(profile.id, {
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
      chatSocialNote: 'Generated social event is waiting in Chat history.',
      chatSocialUpdatedAt: Date.now(),
    })

    const router = createTestRouter()
    await router.push('/contacts')
    await router.isReady()

    const wrapper = mount(ContactsView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const panel = wrapper.get('[data-testid="contacts-chat-social-snapshot"]')
    expect(panel.text()).toContain('Chat communication')
    expect(panel.text()).toContain('They are not receiving messages')
    expect(panel.text()).toContain('Read-only from Chat')
    expect(panel.text()).toContain('Generated social event is waiting')

    wrapper.unmount()
  })
})
```

- [ ] **Step 2: Run the failing Contacts snapshot test**

Run:

```bash
npm.cmd test -- tests/contacts-social-channel-snapshot.test.js
```

Expected: fails because `contacts-chat-social-snapshot` does not exist.

- [ ] **Step 3: Add snapshot labels to `ContactsView.vue`**

Add helpers near `selectedChatStateDetail` and role hub computed values:

```js
const chatSocialSnapshotLabel = (state = '') => {
  if (state === 'connected') return t('Can chat normally', 'Can chat normally')
  if (state === 'stranger') return t('Not a normal Chat contact yet', 'Not a normal Chat contact yet')
  if (state === 'incoming_request') return t('Greeting request pending', 'Greeting request pending')
  if (state === 'outgoing_request') return t('User greeting request sent', 'User greeting request sent')
  if (state === 'request_declined') return t('Request declined or ignored', 'Request declined or ignored')
  if (state === 'user_blocked') return t('Blocked by user', 'Blocked by user')
  if (state === 'contact_blocked') return t('They are not receiving messages', 'They are not receiving messages')
  if (state === 'mutual_blocked') return t('Both sides are blocked', 'Both sides are blocked')
  return t('No Chat binding', 'No Chat binding')
}

const selectedChatSocialSnapshot = computed(() => {
  const contact = selectedRoleChatContact.value
  if (!contact) {
    return {
      exists: false,
      label: t('No Chat binding', 'No Chat binding'),
      detail: t('Contacts keeps the role profile. Chat Directory decides whether this role can chat.', 'Contacts keeps the role profile. Chat Directory decides whether this role can chat.'),
      note: '',
      updatedAtLabel: '',
    }
  }
  const state = chatStore.getContactChatSocialState(contact)
  return {
    exists: true,
    state,
    label: chatSocialSnapshotLabel(state),
    detail: t('Read-only from Chat. Contacts displays this state but does not apply communication changes.', 'Read-only from Chat. Contacts displays this state but does not apply communication changes.'),
    note: contact.chatSocialNote || '',
    updatedAtLabel: contact.chatSocialUpdatedAt ? formatRelationshipAuditTimestamp(contact.chatSocialUpdatedAt) : '',
  }
})
```

- [ ] **Step 4: Add snapshot markup to Contacts role hub**

Insert inside the role hub summary section, after `contacts-role-hub-grid`:

```vue
<div
  class="rounded-2xl border border-blue-100 bg-blue-50/70 p-3"
  data-testid="contacts-chat-social-snapshot"
>
  <div class="flex items-start justify-between gap-3">
    <div>
      <p class="contacts-role-hub-label">{{ t('Chat communication', 'Chat communication') }}</p>
      <p class="text-sm font-semibold text-gray-950">{{ selectedChatSocialSnapshot.label }}</p>
      <p class="mt-1 text-[11px] leading-4 text-gray-500">{{ selectedChatSocialSnapshot.detail }}</p>
      <p
        v-if="selectedChatSocialSnapshot.note"
        class="mt-1 text-[11px] leading-4 text-blue-700"
      >
        {{ selectedChatSocialSnapshot.note }}
      </p>
    </div>
    <span class="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-blue-700">
      {{ t('Chat source', 'Chat source') }}
    </span>
  </div>
  <p
    v-if="selectedChatSocialSnapshot.updatedAtLabel"
    class="mt-2 text-[10px] text-gray-400"
  >
    {{ t('Updated', 'Updated') }}: {{ selectedChatSocialSnapshot.updatedAtLabel }}
  </p>
</div>
```

- [ ] **Step 5: Run the Contacts snapshot test**

Run:

```bash
npm.cmd test -- tests/contacts-social-channel-snapshot.test.js
```

Expected: test passes.

- [ ] **Step 6: Commit Contacts snapshot**

Run:

```bash
git add src/views/ContactsView.vue tests/contacts-social-channel-snapshot.test.js
git commit -m "feat: show chat social snapshot in contacts"
```

---

## Task 5: Regression Suite And Documentation Sync

**Files:**
- Modify: `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/chat-and-chat-directory/PRODUCT_BOUNDARY.md`
- Modify: `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/event-runtime-and-world-hub/PRODUCT_BOUNDARY.md`
- Modify: `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
- Modify: `docs/roadmap/TODO_ROADMAP.md`

- [ ] **Step 1: Run the focused regression suite**

Run:

```bash
npm.cmd test -- tests/chat-social-event-review.test.js tests/simulation-store.test.js tests/control-center-view.test.js tests/contacts-social-channel-snapshot.test.js tests/chat-social-state.test.js
```

Expected: all focused tests pass.

- [ ] **Step 2: Run project validation**

Run:

```bash
npm.cmd run lint
npm.cmd run build
npm.cmd run test
```

Expected:

- lint passes;
- build passes;
- test suite passes.

- [ ] **Step 3: Update Chat package docs**

In `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`, add a landed note:

```md
- Generated Chat social events now have a reviewed V1 seam: low-risk role greetings can become message requests through Event Runtime audit, while role-initiated refusing/blocking/unblocking changes wait in World Hub before Chat applies the communication state.
```

In `docs/pm/chat-and-chat-directory/PRODUCT_BOUNDARY.md`, update the Social Events section:

```md
Current V1 rule: direct user actions still happen inside Chat / Chat Directory. AI-generated or runtime-generated role social changes enter Event Runtime first. Chat applies only confirmed communication state, Contacts displays snapshots only, and Relationship Runtime receives no relationship-truth change from the social state alone.
```

- [ ] **Step 4: Update Event Runtime package docs**

In `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`, add:

```md
- Chat social-event review V1 is now the first generated social/channel event seam: Event Runtime stores generated proposals and audit logs, World Hub reviews high-risk proposals, and Chat applies only approved communication states.
```

In `docs/pm/event-runtime-and-world-hub/PRODUCT_BOUNDARY.md`, add:

```md
Generated Chat social proposals are runtime review records until approved. Event Runtime may store proposal status and review history, but the applied ability to message remains Chat-owned.
```

- [ ] **Step 5: Update Contacts package docs**

In `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`, add:

```md
- Contacts can now display a read-only Chat social-channel snapshot for a bound role. This helps users understand whether a role can currently message, but Contacts does not apply or approve generated friend/block/request events.
```

- [ ] **Step 6: Update the live roadmap**

In `docs/roadmap/TODO_ROADMAP.md`, add a concise implementation note under the current event/runtime or Chat social lane:

```md
- Chat social-event review V1 has landed: generated role greetings/block/refusal/unblock proposals go through Event Runtime audit and World Hub review where needed; Chat remains the applied communication-state owner; Contacts shows snapshots only.
```

- [ ] **Step 7: Run docs sanity checks**

Run:

```bash
rg -n "generated social events directly mutate|Chat social-channel state as relationship truth|raw `relationshipLabelText`|raw relationshipLabelText" docs/pm docs/process docs/architecture
git diff --check
```

Expected:

- no current doc says generated social events can directly mutate Chat without review;
- no current doc says Chat social state is relationship truth;
- `git diff --check` passes.

- [ ] **Step 8: Commit docs and final validation status**

Run:

```bash
git add docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md docs/pm/chat-and-chat-directory/PRODUCT_BOUNDARY.md docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md docs/pm/event-runtime-and-world-hub/PRODUCT_BOUNDARY.md docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md docs/roadmap/TODO_ROADMAP.md
git commit -m "docs: record chat social event review landing"
```

---

## Plan Self-Review

Spec coverage:

- AI proposal versus deterministic system rule: covered by Task 1 policy tests and helper.
- Low-risk greeting auto-applies only after policy audit: covered by Task 1 and Task 2.
- Role-initiated block/refusal/unblock wait for review: covered by Task 1, Task 2, and Task 3.
- Chat remains final state owner: `applyChatSocialEventToChatStore` calls Chat-owned state action only after auto-apply or approval.
- Contacts displays snapshots only: covered by Task 4.
- World Hub review: covered by Task 3.
- Relationship classification fields: covered by Task 1 gate assertions and helper use of `buildRelationshipFactGate`.
- Relationship Runtime does not own communication state: preserved by not touching `src/stores/relationshipRuntime.js`.

No unfilled requirement markers remain in this plan. The only direct path reference containing the word "TODO" is the existing live roadmap filename.

Type consistency:

- Event type constants use `CHAT_SOCIAL_EVENT_TYPES`.
- Status constants use `CHAT_SOCIAL_EVENT_STATUS`.
- Review mode constants use `CHAT_SOCIAL_EVENT_REVIEW_MODE`.
- Chat state writes use existing `chatStore.setContactChatSocialState`.
- World Hub actions use `simulationStore.approveChatSocialEventProposal` and `simulationStore.dismissChatSocialEventProposal`.

