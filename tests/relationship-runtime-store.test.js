import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'

describe('relationship runtime store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-17T08:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('stores low-impact relationship facts and summarizes the target', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    const event = store.recordRelationshipFact({
      target: {
        profileId: 7,
        name: 'Nova',
      },
      sourceModule: 'shopping',
      sourceId: 'order_1',
      factType: 'gift_purchased',
      summary: 'Bought a quiet birthday gift.',
      metricDeltas: {
        affinity: 8,
        trust: 4,
        intimacy: 5,
      },
      milestone: 'First gift',
      growthTraits: ['warm-memory'],
    })

    expect(event).toMatchObject({
      entityKey: 'role:7',
      status: 'applied',
      sourceModule: 'shopping',
      factType: 'gift_purchased',
    })

    const summary = store.summarizeEntityForTarget({ profileId: 7, name: 'Nova' })
    expect(summary).toMatchObject({
      exists: true,
      entityKey: 'role:7',
      relationshipStage: 'friend',
    })
    expect(summary.metrics).toMatchObject({
      affinity: 58,
      trust: 54,
      intimacy: 25,
    })
    expect(summary.milestones[0]?.label).toBe('First gift')
    expect(summary.growthTraits).toContain('warm-memory')
  })

  test('keeps major effects pending until explicitly applied', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    const event = store.recordRelationshipFact({
      target: {
        profileId: 9,
        name: 'Rin',
      },
      sourceModule: 'chat',
      factType: 'confession_candidate',
      summary: 'A confession may change the relationship.',
      metricDeltas: {
        affinity: 24,
        intimacy: 24,
      },
      milestone: 'Confession candidate',
      requiresConfirmation: true,
    })

    expect(event.status).toBe('pending_confirmation')
    expect(store.pendingEventCount).toBe(1)
    expect(store.summarizeEntityForTarget({ profileId: 9, name: 'Rin' }).exists).toBe(false)

    expect(store.applyPendingRelationshipEvent(event.id)).toBe(true)
    const summary = store.summarizeEntityForTarget({ profileId: 9, name: 'Rin' })
    expect(summary.exists).toBe(true)
    expect(summary.metrics.affinity).toBe(74)
    expect(summary.metrics.intimacy).toBe(44)
    expect(summary.milestones[0]?.label).toBe('Confession candidate')
  })

  test('backs up, restores, and builds compact prompt context without API calls', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()
    store.recordRelationshipFact({
      target: {
        profileId: 3,
        name: 'Mika',
      },
      sourceModule: 'food_delivery',
      sourceId: 'meal_1',
      factType: 'shared_meal',
      summary: 'Shared a late dinner after class.',
      metricDeltas: {
        affinity: 10,
        trust: 5,
        intimacy: 6,
      },
      milestone: 'First shared meal',
      worldContext: {
        worldContextId: 'campus_world',
        eventPackId: 'campus_daily',
        variantId: 'late_dinner',
        tags: ['Campus', 'Meal'],
      },
    })

    const backup = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restored = useRelationshipRuntimeStore()
    restored.resetForTesting()
    expect(restored.restoreFromBackup({ relationshipRuntime: backup })).toBe(true)

    const promptContext = restored.buildPromptContextForTarget({ profileId: 3, name: 'Mika' })
    expect(promptContext).toContain('Relationship runtime snapshot: Mika.')
    expect(promptContext).toContain('Stage: friend')
    expect(promptContext).toContain('First shared meal')
    expect(promptContext).toContain('Memory summaries:')
    expect(promptContext).toContain('food_delivery:shared_meal')
  })

  test('merges multiple applied facts into one memory summary when they share a memory key', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    store.recordRelationshipFact({
      target: {
        profileId: 5,
        name: 'Aki',
      },
      sourceModule: 'calendar',
      sourceId: 'calendar_event_date_aki',
      memoryKey: 'aki_dorayaki_day',
      factType: 'scheduled_calendar_event',
      summary: 'Planned a dorayaki date with Aki.',
      metricDeltas: {
        affinity: 4,
        trust: 2,
      },
      growthTraits: ['calendar-plan'],
    })
    store.recordRelationshipFact({
      target: {
        profileId: 5,
        name: 'Aki',
      },
      sourceModule: 'chat',
      sourceId: 'chat_msg_dorayaki_1',
      memoryKey: 'aki_dorayaki_day',
      factType: 'shared_memory_note',
      summary: 'Talked about the same dorayaki outing in chat.',
      metricDeltas: {
        intimacy: 2,
      },
      growthTraits: ['chat-memory'],
    })

    const memories = store.listMemoryAggregatesForTarget({ profileId: 5, name: 'Aki' })
    const summary = store.summarizeEntityForTarget({ profileId: 5, name: 'Aki' })

    expect(memories).toHaveLength(1)
    expect(memories[0]).toMatchObject({
      memoryKey: 'aki_dorayaki_day',
      supportingCount: 2,
      sourceModules: ['chat', 'calendar'],
      primarySourceModule: 'calendar',
      primaryFactType: 'scheduled_calendar_event',
    })
    expect(memories[0].displaySummary).toBe('Planned a dorayaki date with Aki.')
    expect(memories[0].primarySummary).toBe('Planned a dorayaki date with Aki.')
    expect(memories[0].latestSummary).toContain('dorayaki')
    expect(summary.memorySummaries).toHaveLength(1)
    expect(summary.metrics).toMatchObject({
      affinity: 54,
      trust: 52,
      intimacy: 20,
    })
    expect(store.buildPromptContextForTarget({ profileId: 5, name: 'Aki' })).toContain(
      'Memory summaries: Planned a dorayaki date with Aki.',
    )
    expect(store.events[0].effectApplied).toBe(false)
    expect(store.events[0].memoryRole).toBe('supporting')
    expect(store.events[1].effectApplied).toBe(true)
    expect(store.events[1].memoryRole).toBe('primary')
  })
})
