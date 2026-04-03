import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

describe('system truth layer', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('tracks chat truth metrics and recent events by role entity', () => {
    const store = useSystemStore()
    const contact = {
      id: 11,
      profileId: 101,
      kind: 'role',
      name: 'Eva',
    }

    store.touchChatTruth(contact, 'user_message', { count: 1 })
    store.touchChatTruth(contact, 'manual_trigger')
    store.touchChatTruth(contact, 'assistant_reply', { count: 2 })

    const snapshot = store.getChatTruthSnapshot(contact, { eventLimit: 3 })
    expect(snapshot?.entityKey).toBe('role:101')
    expect(snapshot?.counters.userMessageCount).toBe(1)
    expect(snapshot?.counters.assistantMessageCount).toBe(2)
    expect(snapshot?.counters.manualTriggerCount).toBe(1)
    expect(snapshot?.relationship.affinity).toBeGreaterThan(50)
    expect(snapshot?.relationship.distance).toBeLessThan(50)
    expect(Array.isArray(snapshot?.recentEvents)).toBe(true)
    expect(snapshot?.recentEvents[0]?.action).toBe('assistant_reply')
  })

  test('tracks notify-only skip and resume settlement counters', () => {
    const store = useSystemStore()
    const contact = {
      id: 22,
      profileId: 0,
      kind: 'service',
      name: 'Service Bot',
    }

    store.touchChatTruth(contact, 'notify_only_skip')
    store.touchChatTruth(contact, 'resume_settlement', { missedCycles: 3 })

    const snapshot = store.getChatTruthSnapshot(contact)
    expect(snapshot?.entityKey).toBe('contact:22')
    expect(snapshot?.counters.notifyOnlySkipCount).toBe(1)
    expect(snapshot?.counters.resumeSettlementCount).toBe(3)
    expect(snapshot?.relationship.tension).toBeGreaterThanOrEqual(11)
  })

  test('restores truth state from backup snapshots', () => {
    const baseStore = useSystemStore()
    const contact = {
      id: 33,
      profileId: 303,
      kind: 'role',
      name: 'Mia',
    }

    baseStore.touchChatTruth(contact, 'user_message')
    baseStore.touchChatTruth(contact, 'assistant_reply')
    const backup = {
      truthState: JSON.parse(JSON.stringify(baseStore.truthState)),
    }

    setActivePinia(createPinia())
    const restoredStore = useSystemStore()
    const ok = restoredStore.restoreFromBackup(backup)
    expect(ok).toBe(true)

    const snapshot = restoredStore.getChatTruthSnapshot(contact, { eventLimit: 2 })
    expect(snapshot?.entityKey).toBe('role:303')
    expect(snapshot?.counters.userMessageCount).toBe(1)
    expect(snapshot?.counters.assistantMessageCount).toBe(1)
    expect(snapshot?.recentEvents.length).toBeGreaterThan(0)
  })
})
