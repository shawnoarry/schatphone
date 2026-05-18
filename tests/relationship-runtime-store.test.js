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

  test('deletes one memory group and recomputes relationship metrics from remaining events', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    store.recordRelationshipFact({
      target: {
        profileId: 12,
        name: 'Lena',
      },
      sourceModule: 'calendar',
      sourceId: 'calendar_lena_1',
      memoryKey: 'lena_market_day',
      factType: 'scheduled_calendar_event',
      summary: 'Visited the market with Lena.',
      metricDeltas: {
        affinity: 8,
        trust: 4,
      },
      milestone: 'Market day',
    })
    store.recordRelationshipFact({
      target: {
        profileId: 12,
        name: 'Lena',
      },
      sourceModule: 'phone',
      sourceId: 'phone_lena_1',
      memoryKey: 'lena_call',
      factType: 'completed_call',
      summary: 'Called Lena after dinner.',
      metricDeltas: {
        affinity: 5,
        intimacy: 3,
      },
      milestone: 'Dinner call',
    })

    expect(store.summarizeEntityForTarget({ profileId: 12, name: 'Lena' }).metrics.affinity).toBe(63)

    const result = store.removeMemoryGroupForTarget({ profileId: 12, name: 'Lena' }, 'lena_market_day')
    expect(result).toMatchObject({
      ok: true,
      removedEventCount: 1,
      sourceModuleCounts: {
        calendar: 1,
      },
    })
    expect(result.sourceRefs).toEqual([{ sourceModule: 'calendar', sourceId: 'calendar_lena_1' }])

    const summary = store.summarizeEntityForTarget({ profileId: 12, name: 'Lena' })
    expect(summary.metrics).toMatchObject({
      affinity: 55,
      trust: 50,
      intimacy: 23,
    })
    expect(summary.milestones.map((item) => item.label)).toEqual(['Dinner call'])
    expect(store.listMemoryGroupsForTarget({ profileId: 12, name: 'Lena' })).toHaveLength(1)
  })

  test('removes relationship facts for one source record and leaves sibling records intact', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    store.recordRelationshipFact({
      target: {
        profileId: 31,
        name: 'Source One',
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'call_1:call:role_31',
      memoryKey: 'call_1',
      factType: 'completed_call',
      summary: 'First call.',
      metricDeltas: {
        affinity: 4,
        trust: 2,
      },
      milestone: 'First call',
    })
    store.recordRelationshipFact({
      target: {
        profileId: 31,
        name: 'Source One',
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'call_2:call:role_31',
      memoryKey: 'call_2',
      factType: 'completed_call',
      summary: 'Second call.',
      metricDeltas: {
        affinity: 5,
        intimacy: 2,
      },
      milestone: 'Second call',
    })
    store.recordRelationshipFact({
      target: {
        profileId: 32,
        name: 'Other Role',
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'call_1:call:role_32',
      memoryKey: 'other_call',
      factType: 'completed_call',
      summary: 'Same source record, different target.',
      metricDeltas: {
        trust: 3,
      },
    })

    const result = store.removeRelationshipFactsForSourceRecord('relationship_phone_call', 'call_1')

    expect(result).toMatchObject({
      ok: true,
      removedEventCount: 2,
      sourceModuleCounts: {
        relationship_phone_call: 2,
      },
    })
    expect(store.events.map((event) => event.sourceId)).toEqual(['call_2:call:role_31'])
    expect(store.summarizeEntityForTarget({ profileId: 31, name: 'Source One' }).metrics).toMatchObject({
      affinity: 55,
      trust: 50,
      intimacy: 22,
    })
    expect(store.summarizeEntityForTarget({ profileId: 32, name: 'Other Role' }).exists).toBe(false)
  })

  test('resets all relationship runtime state for one role target', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    store.recordRelationshipFact({
      target: {
        profileId: 21,
        name: 'Reset Me',
      },
      sourceModule: 'wallet',
      sourceId: 'wallet_reset_1',
      factType: 'shared_expense',
      summary: 'Shared a bill.',
      metricDeltas: {
        trust: 6,
      },
    })
    store.recordRelationshipFact({
      target: {
        profileId: 22,
        name: 'Keep Me',
      },
      sourceModule: 'wallet',
      sourceId: 'wallet_keep_1',
      factType: 'shared_expense',
      summary: 'Shared another bill.',
      metricDeltas: {
        trust: 6,
      },
    })

    const result = store.resetRelationshipForTarget({ profileId: 21, name: 'Reset Me' })
    expect(result).toMatchObject({
      ok: true,
      removedEventCount: 1,
      removedEntityCount: 1,
    })
    expect(result.sourceRefs).toEqual([{ sourceModule: 'wallet', sourceId: 'wallet_reset_1' }])
    expect(store.summarizeEntityForTarget({ profileId: 21, name: 'Reset Me' }).exists).toBe(false)
    expect(store.summarizeEntityForTarget({ profileId: 22, name: 'Keep Me' }).exists).toBe(true)
  })
})
