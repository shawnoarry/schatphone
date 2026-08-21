import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  RELATIONSHIP_MEMORY_REVIEW_STATES,
  useRelationshipRuntimeStore,
} from '../src/stores/relationshipRuntime'
import { writePersistedState } from '../src/lib/persistence'

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

  test('persists gate audit metadata and blocks hard-gated relationship facts', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    const event = store.recordRelationshipFact({
      target: {
        profileId: 91,
        name: 'Gate Block',
      },
      sourceModule: 'relationship_runtime',
      sourceId: 'gate_block_1',
      factType: 'confession_candidate',
      summary: 'This high-risk effect should be blocked by classification.',
      metricDeltas: {
        affinity: 20,
      },
      relationshipGate: {
        decision: 'block',
        mode: 'hard_gate',
        reason: 'primary_category_not_allowed',
        eventType: 'confession_candidate',
        primaryRelationshipCategoryId: 'family_bond',
        relationshipModifierIds: ['caretaking'],
        matched: false,
      },
    })

    expect(event).toMatchObject({
      status: 'dismissed',
      effectApplied: false,
      relationshipGate: expect.objectContaining({
        decision: 'block',
        mode: 'hard_gate',
        reason: 'primary_category_not_allowed',
        primaryRelationshipCategoryId: 'family_bond',
        relationshipModifierIds: ['caretaking'],
      }),
    })
    expect(store.summarizeEntityForTarget({ profileId: 91, name: 'Gate Block' }).exists).toBe(false)

    const backup = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restored = useRelationshipRuntimeStore()
    restored.resetForTesting()
    expect(restored.restoreFromBackup({ relationshipRuntime: backup })).toBe(true)
    expect(restored.events[0].relationshipGate).toMatchObject({
      decision: 'block',
      mode: 'hard_gate',
      primaryRelationshipCategoryId: 'family_bond',
      relationshipModifierIds: ['caretaking'],
    })
  })

  test('keeps confirmation-gated relationship facts pending without applying metrics', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    const event = store.recordRelationshipFact({
      target: {
        profileId: 92,
        name: 'Gate Confirm',
      },
      sourceModule: 'relationship_runtime',
      sourceId: 'gate_confirm_1',
      factType: 'confession_candidate',
      summary: 'This high-risk effect should wait for confirmation.',
      metricDeltas: {
        affinity: 10,
      },
      relationshipGate: {
        decision: 'confirm',
        mode: 'hard_gate',
        reason: 'required_modifier_missing',
        eventType: 'confession_candidate',
        primaryRelationshipCategoryId: 'romance_candidate',
        relationshipModifierIds: ['secret'],
        matched: false,
      },
    })

    expect(event.status).toBe('pending_confirmation')
    expect(event.effectApplied).toBe(false)
    expect(store.summarizeEntityForTarget({ profileId: 92, name: 'Gate Confirm' }).exists).toBe(false)
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
    expect(summary.primaryMemory?.memoryKey).toBe('aki_dorayaki_day')
    expect(summary.totalMemoryCount).toBe(1)
    expect(summary.visibleMemoryCount).toBe(1)
    expect(summary.archivedMemoryCount).toBe(0)
    expect(summary.hasArchivedOnlyMemories).toBe(false)
    expect(summary.sourceRefs).toEqual([
      { sourceModule: 'calendar', sourceId: 'calendar_event_date_aki' },
      { sourceModule: 'chat', sourceId: 'chat_msg_dorayaki_1' },
    ])
    expect(summary.sourceModuleCounts).toEqual({
      calendar: 1,
      chat: 1,
    })
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

  test('lets supporting progress update one memory summary without applying metrics again', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()
    const target = { profileId: 5, name: 'Aki' }

    store.recordRelationshipFact({
      target,
      sourceModule: 'relationship_shopping_gift',
      sourceId: 'shopping_order_aki_1:gift',
      sharedExperienceId: 'gift:shopping_order_aki_1',
      memoryKey: 'shared_experience__gift:shopping_order_aki_1',
      factType: 'gift_purchased',
      summary: 'Gift purchased for Aki.',
      memorySummary: 'A gift for Aki was ordered and delivery was planned.',
      metricDeltas: { affinity: 8 },
      createdAt: 100,
    })
    const feedback = store.recordRelationshipFact({
      target,
      sourceModule: 'relationship_phone_call',
      sourceId: 'phone_call_aki_1:call:role_5',
      sharedExperienceId: 'gift:shopping_order_aki_1',
      memoryKey: 'shared_experience__gift:shopping_order_aki_1',
      factType: 'recipient_feedback_received',
      summary: 'Aki called with gift feedback: I love it.',
      memorySummary: 'The gift for Aki was delivered, and Aki called to say she loved it.',
      metricDeltas: {},
      forceSupportingMemory: true,
      createdAt: 200,
    })

    const memory = store.listMemoryAggregatesForTarget(target)[0]
    expect(feedback).toMatchObject({
      sharedExperienceId: 'gift:shopping_order_aki_1',
      memoryRole: 'supporting',
      effectApplied: false,
    })
    expect(memory).toMatchObject({
      supportingCount: 2,
      displaySummary: 'The gift for Aki was delivered, and Aki called to say she loved it.',
      primarySummary: 'Gift purchased for Aki.',
    })
    expect(store.summarizeEntityForTarget(target).metrics.affinity).toBe(58)
  })

  test('builds recall summaries from the primary memory while exposing linked supporting facts', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    const primary = store.recordRelationshipFact({
      target: {
        profileId: 6,
        name: 'Rin',
      },
      sourceModule: 'relationship_shopping_gift',
      sourceId: 'shopping_order_rin_1:gift',
      memoryKey: 'shopping_gift__shopping_order_rin_1',
      factType: 'gift_purchased',
      summary: 'Gift purchased for Rin: Dorayaki Box.',
      metricDeltas: {
        affinity: 8,
        trust: 3,
        intimacy: 4,
      },
      createdAt: Date.parse('2026-05-17T09:00:00.000Z'),
    })
    const supporting = store.recordRelationshipFact({
      target: {
        profileId: 6,
        name: 'Rin',
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'calendar_event_rin_delivery:calendar_event:role_6',
      memoryKey: 'shopping_gift__shopping_order_rin_1',
      factType: 'scheduled_calendar_event',
      summary: 'Calendar plan recorded with Rin: Gift delivery follow-up.',
      metricDeltas: {
        affinity: 4,
        trust: 2,
        intimacy: 2,
      },
      createdAt: Date.parse('2026-05-17T10:00:00.000Z'),
    })

    const summary = store.summarizeEntityForTarget({ profileId: 6, name: 'Rin' }, {
      eventLimit: 3,
      memoryLimit: 2,
    })
    const promptContext = store.buildPromptContextForTarget({ profileId: 6, name: 'Rin' })

    expect(primary.effectApplied).toBe(true)
    expect(supporting.effectApplied).toBe(false)
    expect(summary.primaryMemory).toMatchObject({
      memoryKey: 'shopping_gift__shopping_order_rin_1',
      displaySummary: 'Gift purchased for Rin: Dorayaki Box.',
      latestSummary: 'Calendar plan recorded with Rin: Gift delivery follow-up.',
      supportingCount: 2,
    })
    expect(summary.primaryMemory.recallSummary).toBe(
      'Gift purchased for Rin: Dorayaki Box. (2 linked records: Shopping gift, Calendar plan)',
    )
    expect(summary.primaryMemory.reviewSummary).toBe(
      'Gift purchased for Rin: Dorayaki Box. (2 related records)',
    )
    expect(summary.latestEventSummary).toBe('Gift purchased for Rin: Dorayaki Box.')
    expect(promptContext).toContain(
      'Memory summaries: Gift purchased for Rin: Dorayaki Box. (2 linked records: Shopping gift, Calendar plan).',
    )
    expect(promptContext).not.toContain('Memory summaries: Calendar plan recorded with Rin')
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

  test('stores and restores memory review lifecycle metadata for a memory group', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    store.recordRelationshipFact({
      target: {
        profileId: 41,
        name: 'Review Me',
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'calendar_review_1:calendar_event:role_41',
      memoryKey: 'review_memory',
      factType: 'scheduled_calendar_event',
      summary: 'Reviewable memory.',
      metricDeltas: {
        trust: 2,
      },
    })

    const updated = store.updateMemoryReviewForTarget({ profileId: 41, name: 'Review Me' }, 'review_memory', {
      status: RELATIONSHIP_MEMORY_REVIEW_STATES.PINNED,
      note: 'Keep at the top for now.',
    })

    expect(updated).toMatchObject({
      status: 'pinned',
      note: 'Keep at the top for now.',
    })
    expect(store.getMemoryGroupDetail({ profileId: 41, name: 'Review Me' }, 'review_memory')).toMatchObject({
      reviewStatus: 'pinned',
      reviewNote: 'Keep at the top for now.',
    })

    const backup = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restored = useRelationshipRuntimeStore()
    restored.resetForTesting()
    expect(restored.restoreFromBackup({ relationshipRuntime: backup })).toBe(true)
    expect(restored.getMemoryGroupDetail({ profileId: 41, name: 'Review Me' }, 'review_memory')).toMatchObject({
      reviewStatus: 'pinned',
      reviewNote: 'Keep at the top for now.',
    })
  })

  test('omits archived memories from prompt context by default and prioritizes pinned memories', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    store.recordRelationshipFact({
      target: {
        profileId: 51,
        name: 'Recall Me',
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'calendar_prompt_1:calendar_event:role_51',
      memoryKey: 'archived_memory',
      factType: 'scheduled_calendar_event',
      summary: 'Archived memory should stay out of default prompt recall.',
      metricDeltas: {
        trust: 2,
      },
    })
    store.recordRelationshipFact({
      target: {
        profileId: 51,
        name: 'Recall Me',
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'phone_prompt_1:call:role_51',
      memoryKey: 'active_memory',
      factType: 'completed_call',
      summary: 'Active memory should remain in prompt recall.',
      metricDeltas: {
        affinity: 2,
      },
    })
    store.recordRelationshipFact({
      target: {
        profileId: 51,
        name: 'Recall Me',
      },
      sourceModule: 'relationship_shopping_gift',
      sourceId: 'shopping_prompt_1:gift',
      memoryKey: 'pinned_memory',
      factType: 'gift_purchased',
      summary: 'Pinned memory should be recalled first.',
      metricDeltas: {
        intimacy: 2,
      },
    })

    store.updateMemoryReviewForTarget({ profileId: 51, name: 'Recall Me' }, 'archived_memory', {
      status: RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED,
    })
    store.updateMemoryReviewForTarget({ profileId: 51, name: 'Recall Me' }, 'pinned_memory', {
      status: RELATIONSHIP_MEMORY_REVIEW_STATES.PINNED,
    })

    const memoryOrder = store
      .listMemoryAggregatesForTarget({ profileId: 51, name: 'Recall Me' }, 10)
      .map((item) => item.memoryKey)
    const defaultPrompt = store.buildPromptContextForTarget({ profileId: 51, name: 'Recall Me' })
    const promptWithArchived = store.buildPromptContextForTarget(
      { profileId: 51, name: 'Recall Me' },
      { includeArchivedMemories: true },
    )
    const summaryWithArchived = store.summarizeEntityForTarget(
      { profileId: 51, name: 'Recall Me' },
      { eventLimit: 5, memoryLimit: 5, includeArchivedMemories: true },
    )

    expect(memoryOrder).toEqual(['pinned_memory', 'active_memory', 'archived_memory'])
    expect(defaultPrompt).toContain('Pinned memory should be recalled first.')
    expect(defaultPrompt).toContain('Active memory should remain in prompt recall.')
    expect(defaultPrompt).not.toContain('Archived memory should stay out of default prompt recall.')
    expect(defaultPrompt.indexOf('Pinned memory should be recalled first.')).toBeLessThan(
      defaultPrompt.indexOf('Active memory should remain in prompt recall.'),
    )
    expect(summaryWithArchived.memorySummaries.map((item) => item.memoryKey)).toEqual([
      'pinned_memory',
      'active_memory',
      'archived_memory',
    ])
    expect(summaryWithArchived.recentEvents.map((item) => item.summary)).toContain(
      'Archived memory should stay out of default prompt recall.',
    )
    expect(promptWithArchived).toContain('Archived memory should stay out of default prompt recall.')
  })

  test('recalls a relevant older memory without changing stored memory order', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()
    const target = { profileId: 58, name: 'Context Recall' }

    store.recordRelationshipFact({
      target,
      sourceModule: 'relationship_shopping_gift',
      sourceId: 'recall_birthday_gift',
      memoryKey: 'birthday_necklace',
      factType: 'gift_purchased',
      summary: 'You gave Context Recall a silver birthday necklace.',
      metricDeltas: { affinity: 2 },
      createdAt: Date.parse('2026-05-01T10:00:00.000Z'),
    })
    store.recordRelationshipFact({
      target,
      sourceModule: 'relationship_phone_call',
      sourceId: 'recall_recent_call',
      memoryKey: 'recent_work_call',
      factType: 'completed_call',
      summary: 'You had a recent phone call about work.',
      metricDeltas: { trust: 2 },
      createdAt: Date.parse('2026-05-17T10:00:00.000Z'),
    })

    const storedOrder = store
      .listMemoryAggregatesForTarget(target, 10)
      .map((item) => item.memoryKey)
    const recall = store.recallMemoriesForTarget(target, {
      queryText: 'Do you remember the birthday necklace?',
      limit: 1,
    })
    const prompt = store.buildPromptContextForTarget(target, {
      recallQuery: 'Do you remember the birthday necklace?',
      memoryLimit: 1,
    })

    expect(storedOrder).toEqual(['recent_work_call', 'birthday_necklace'])
    expect(recall.items.map((item) => item.memoryKey)).toEqual(['birthday_necklace'])
    expect(prompt).toContain('Memory summaries: You gave Context Recall a silver birthday necklace.')
    expect(prompt).not.toContain('Memory summaries: You had a recent phone call about work.')
  })

  test('returns one shared prompt projection and excludes memories while runtime is disabled', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()
    const target = { profileId: 59, name: 'Disabled Recall' }

    store.recordRelationshipFact({
      target,
      sourceModule: 'relationship_shopping_gift',
      sourceId: 'disabled_recall_gift',
      memoryKey: 'disabled_gift',
      factType: 'gift_purchased',
      summary: 'A disabled runtime memory.',
      metricDeltas: { affinity: 2 },
    })
    const enabledProjection = store.buildPromptProjectionForTarget(target, {
      recallQuery: 'disabled runtime memory',
    })
    store.setRuntimeEnabled(false)
    const disabledProjection = store.buildPromptProjectionForTarget(target, {
      recallQuery: 'disabled runtime memory',
    })

    expect(enabledProjection.text).toContain(enabledProjection.memoryRecall.text)
    expect(enabledProjection.memoryRecall.items).toHaveLength(1)
    expect(disabledProjection).toEqual({
      text: '',
      memoryRecall: {
        items: [],
        text: '',
        candidateCount: 0,
        relevantCount: 0,
        querySignalCount: 0,
        characterCount: 0,
      },
    })
  })

  test('summarizes recent events by createdAt instead of insertion order', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    store.recordRelationshipFact({
      target: {
        profileId: 61,
        name: 'Time Order',
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'time_order_newer:call:role_61',
      memoryKey: 'time_order_newer',
      factType: 'completed_call',
      summary: 'Newer relationship event.',
      metricDeltas: {
        trust: 2,
      },
      createdAt: Date.parse('2026-05-17T10:00:00.000Z'),
    })
    store.recordRelationshipFact({
      target: {
        profileId: 61,
        name: 'Time Order',
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'time_order_older:calendar_event:role_61',
      memoryKey: 'time_order_older',
      factType: 'scheduled_calendar_event',
      summary: 'Older relationship event imported later.',
      metricDeltas: {
        affinity: 2,
      },
      createdAt: Date.parse('2026-05-17T09:00:00.000Z'),
    })

    const summary = store.summarizeEntityForTarget({ profileId: 61, name: 'Time Order' }, {
      eventLimit: 2,
      memoryLimit: 2,
    })
    const promptContext = store.buildPromptContextForTarget({ profileId: 61, name: 'Time Order' }, {
      eventLimit: 2,
    })

    expect(summary.recentEvents.map((event) => event.summary)).toEqual([
      'Newer relationship event.',
      'Older relationship event imported later.',
    ])
    expect(summary.latestEventSummary).toBe('Newer relationship event.')
    expect(promptContext.indexOf('Newer relationship event.')).toBeLessThan(
      promptContext.indexOf('Older relationship event imported later.'),
    )
  })

  test('hides archived-only memories and their events from default entity summaries', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()

    store.recordRelationshipFact({
      target: {
        profileId: 62,
        name: 'Archived Summary',
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'archived_only_1:calendar_event:role_62',
      memoryKey: 'archived_only_memory',
      factType: 'scheduled_calendar_event',
      summary: 'Archived-only memory should stay out of default summaries.',
      metricDeltas: {
        trust: 2,
      },
      createdAt: Date.parse('2026-05-17T10:00:00.000Z'),
    })

    store.updateMemoryReviewForTarget({ profileId: 62, name: 'Archived Summary' }, 'archived_only_memory', {
      status: RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED,
    })

    const defaultSummary = store.summarizeEntityForTarget({ profileId: 62, name: 'Archived Summary' }, {
      eventLimit: 3,
      memoryLimit: 3,
    })
    const fullSummary = store.summarizeEntityForTarget(
      { profileId: 62, name: 'Archived Summary' },
      {
        eventLimit: 3,
        memoryLimit: 3,
        includeArchivedMemories: true,
      },
    )

    expect(defaultSummary.memorySummaries).toEqual([])
    expect(defaultSummary.recentEvents).toEqual([])
    expect(defaultSummary.latestEventSummary).toBe('')
    expect(defaultSummary.primaryMemory).toBe(null)
    expect(defaultSummary.totalMemoryCount).toBe(1)
    expect(defaultSummary.visibleMemoryCount).toBe(0)
    expect(defaultSummary.archivedMemoryCount).toBe(1)
    expect(defaultSummary.hasArchivedOnlyMemories).toBe(true)
    expect(defaultSummary.sourceRefs).toEqual([])
    expect(defaultSummary.sourceModuleCounts).toEqual({})
    expect(fullSummary.memorySummaries).toHaveLength(1)
    expect(fullSummary.recentEvents).toHaveLength(1)
    expect(fullSummary.latestEventSummary).toBe('Archived-only memory should stay out of default summaries.')
    expect(fullSummary.primaryMemory?.memoryKey).toBe('archived_only_memory')
    expect(fullSummary.totalMemoryCount).toBe(1)
    expect(fullSummary.visibleMemoryCount).toBe(1)
    expect(fullSummary.archivedMemoryCount).toBe(1)
    expect(fullSummary.hasArchivedOnlyMemories).toBe(false)
    expect(fullSummary.sourceModuleCounts).toEqual({
      relationship_calendar_confirmed_event: 1,
    })
  })

  test('keeps memory counts canonical when summary display is capped or disabled', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()
    const target = { profileId: 63, name: 'Count Contract' }

    for (let index = 0; index < 55; index += 1) {
      store.recordRelationshipFact({
        target,
        sourceModule: 'relationship_calendar_confirmed_event',
        sourceId: `count_contract_${index}:calendar_event:role_63`,
        memoryKey: `count_contract_memory_${index}`,
        factType: 'scheduled_calendar_event',
        summary: `Count contract memory ${index}.`,
        metricDeltas: {
          trust: 1,
        },
        createdAt: Date.parse('2026-05-17T10:00:00.000Z') + index,
      })
    }

    store.updateMemoryReviewForTarget(target, 'count_contract_memory_0', {
      status: RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED,
    })
    store.updateMemoryReviewForTarget(target, 'count_contract_memory_1', {
      status: RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED,
    })

    const cappedSummary = store.summarizeEntityForTarget(target, {
      eventLimit: 0,
      memoryLimit: 3,
    })
    const noDisplaySummary = store.summarizeEntityForTarget(target, {
      eventLimit: 0,
      memoryLimit: 0,
    })
    const fullSummary = store.summarizeEntityForTarget(target, {
      eventLimit: 0,
      memoryLimit: 3,
      includeArchivedMemories: true,
    })

    expect(cappedSummary.memorySummaries).toHaveLength(3)
    expect(cappedSummary.totalMemoryCount).toBe(55)
    expect(cappedSummary.visibleMemoryCount).toBe(53)
    expect(cappedSummary.archivedMemoryCount).toBe(2)
    expect(cappedSummary.hasArchivedOnlyMemories).toBe(false)
    expect(cappedSummary.memorySummaries.every((memory) => memory.reviewStatus !== 'archived')).toBe(true)

    expect(noDisplaySummary.memorySummaries).toEqual([])
    expect(noDisplaySummary.totalMemoryCount).toBe(55)
    expect(noDisplaySummary.visibleMemoryCount).toBe(53)
    expect(noDisplaySummary.archivedMemoryCount).toBe(2)

    expect(fullSummary.memorySummaries).toHaveLength(3)
    expect(fullSummary.totalMemoryCount).toBe(55)
    expect(fullSummary.visibleMemoryCount).toBe(55)
    expect(fullSummary.archivedMemoryCount).toBe(2)
  })

  test('projects consolidation pressure per role without mutating relationship truth', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()
    const targetA = { profileId: 71, name: 'Pressure A' }
    const targetB = { profileId: 72, name: 'Pressure B' }

    for (let index = 0; index < 55; index += 1) {
      store.recordRelationshipFact({
        target: targetA,
        sourceModule: 'relationship_calendar_confirmed_event',
        sourceId: `pressure_a_${index}:calendar_event:role_71`,
        memoryKey: `pressure_a_memory_${index}`,
        factType: 'scheduled_calendar_event',
        summary: `Pressure A memory ${index}.`,
        metricDeltas: {},
        createdAt: Date.parse('2026-05-17T10:00:00.000Z') + index,
      })
    }
    for (let index = 0; index < 5; index += 1) {
      store.recordRelationshipFact({
        target: targetB,
        sourceModule: index % 2 === 0 ? 'relationship_phone_call' : 'relationship_map_shared_route',
        sourceId: `pressure_b_source_${index}`,
        memoryKey: 'pressure_b_dense_memory',
        factType: 'shared_experience',
        summary: `Pressure B evidence ${index}.`,
        metricDeltas: {},
        createdAt: Date.parse('2026-05-17T11:00:00.000Z') + index,
      })
    }
    store.recordRelationshipFact({
      target: targetB,
      sourceModule: 'simulation_event_engine',
      sourceId: 'event_audit_without_memory',
      factType: 'eligibility_audit',
      summary: 'An event audit record is not relationship memory.',
      metricDeltas: {},
    })
    store.updateMemoryReviewForTarget(targetA, 'pressure_a_memory_0', {
      status: RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED,
    })
    store.updateMemoryReviewForTarget(targetB, 'pressure_b_dense_memory', {
      status: RELATIONSHIP_MEMORY_REVIEW_STATES.PINNED,
    })

    const before = store.createBackupSnapshot()
    const pressureA = store.projectMemoryConsolidationPressureForTarget(targetA)
    const pressureB = store.projectMemoryConsolidationPressureForTarget(targetB)
    const after = store.createBackupSnapshot()

    expect(pressureA).toMatchObject({
      ownerKind: 'role',
      ownerKey: 'role:71',
      level: 'watch',
      counts: { total: 55, active: 54, pinned: 0, archived: 1 },
    })
    expect(pressureA.candidates).toEqual([])
    expect(pressureB).toMatchObject({
      ownerKind: 'role',
      ownerKey: 'role:72',
      counts: { total: 1, active: 0, pinned: 1, archived: 0, sourceReferences: 5 },
    })
    expect(pressureB.candidates).toEqual([
      expect.objectContaining({
        memoryKey: 'pressure_b_dense_memory',
        reasons: ['dense_evidence'],
        reviewStatus: 'pinned',
        supportingCount: 5,
        sourceRefs: [
          { sourceModule: 'relationship_map_shared_route', sourceId: 'pressure_b_source_1' },
          { sourceModule: 'relationship_map_shared_route', sourceId: 'pressure_b_source_3' },
          { sourceModule: 'relationship_phone_call', sourceId: 'pressure_b_source_0' },
          { sourceModule: 'relationship_phone_call', sourceId: 'pressure_b_source_2' },
          { sourceModule: 'relationship_phone_call', sourceId: 'pressure_b_source_4' },
        ],
      }),
    ])
    expect(pressureB.candidates[0].memoryKey).not.toContain('pressure_a')
    expect(after).toEqual(before)
  })

  test('keeps relationship facts above 500 and pages memory projections', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()
    const events = Array.from({ length: 501 }, (_, index) => ({
      id: `long_history_event_${index}`,
      entityKey: 'role:501',
      targetLabel: 'Long history',
      sourceModule: 'relationship_test',
      sourceId: `long_history_source_${index}`,
      memoryKey: `long_history_memory_${index}`,
      factType: 'history_note',
      summary: `History item ${index}.`,
      metricDeltas: {},
      status: 'applied',
      effectApplied: false,
      createdAt: index,
    }))

    expect(store.restoreFromBackup({
      entities: [{ entityKey: 'role:501', profileId: 501, kind: 'role', displayName: 'Long history' }],
      events,
    })).toBe(true)
    expect(store.events).toHaveLength(501)
    expect(store.summarizeEntityForTarget({ profileId: 501 }).totalMemoryCount).toBe(501)
    const prompt = store.buildPromptProjectionForTarget(
      { profileId: 501 },
      { memoryLimit: 3, memoryCharacterBudget: 120 },
    )
    expect(prompt.memoryRecall.items).toHaveLength(3)
    expect(prompt.memoryRecall.characterCount).toBeLessThanOrEqual(120)

    const firstPage = store.listMemoryGroupPageForTarget(
      { profileId: 501 },
      { limit: 12, offset: 0 },
    )
    const lastPage = store.listMemoryGroupPageForTarget(
      { profileId: 501 },
      { limit: 12, offset: 500 },
    )
    expect(firstPage).toMatchObject({
      totalCount: 501,
      page: 1,
      pageCount: 42,
      hasPrevious: false,
      hasNext: true,
    })
    expect(firstPage.items).toHaveLength(12)
    expect(lastPage).toMatchObject({
      totalCount: 501,
      page: 42,
      hasPrevious: true,
      hasNext: false,
    })
    expect(lastPage.items).toHaveLength(1)
    expect(lastPage.items[0].memoryKey).toBe('long_history_memory_0')

    const manyRoles = Array.from({ length: 301 }, (_, index) => ({
      entityKey: `role:long_history_${index}`,
      profileId: 1000 + index,
      kind: 'role',
      displayName: `Long history role ${index}`,
    }))
    expect(store.restoreFromBackup({ entities: manyRoles, events: [] })).toBe(true)
    expect(store.entities).toHaveLength(301)
  })

  test('keeps more than 500 facts after close/reopen and backup restore', async () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()
    const events = Array.from({ length: 501 }, (_, index) => ({
      id: `reopen_event_${index}`,
      entityKey: 'role:502',
      targetLabel: 'Reopen history',
      sourceModule: 'relationship_test',
      sourceId: `reopen_source_${index}`,
      memoryKey: `reopen_memory_${index}`,
      factType: 'history_note',
      summary: `Reopen item ${index}.`,
      metricDeltas: {},
      status: 'applied',
      effectApplied: false,
      createdAt: index,
    }))
    store.restoreFromBackup({
      entities: [{ entityKey: 'role:502', profileId: 502, kind: 'role', displayName: 'Reopen history' }],
      events,
    })
    const backup = store.createBackupSnapshot()
    expect(store.saveNow().ok).toBe(true)

    setActivePinia(createPinia())
    const reopened = useRelationshipRuntimeStore()
    expect(reopened.events).toHaveLength(501)
    expect(reopened.restoreFromBackup({ relationshipRuntime: backup })).toBe(true)
    expect(reopened.events).toHaveLength(501)
    expect(reopened.createBackupSnapshot().events).toHaveLength(501)
    await Promise.resolve()
  })

  test('migrates a version 1 runtime payload without reapplying a retention cap', () => {
    const legacyEvents = Array.from({ length: 501 }, (_, index) => ({
      id: `legacy_event_${index}`,
      entityKey: 'role:503',
      targetLabel: 'Legacy history',
      sourceModule: 'relationship_test',
      sourceId: `legacy_source_${index}`,
      memoryKey: `legacy_memory_${index}`,
      factType: 'history_note',
      summary: `Legacy item ${index}.`,
      metricDeltas: {},
      status: 'applied',
      effectApplied: false,
      createdAt: index,
    }))
    writePersistedState(
      'store:relationship-runtime',
      {
        settings: {},
        entities: [{ entityKey: 'role:503', profileId: 503, kind: 'role', displayName: 'Legacy history' }],
        events: legacyEvents,
      },
      { version: 1 },
    )

    setActivePinia(createPinia())
    const store = useRelationshipRuntimeStore()
    expect(store.events).toHaveLength(501)
    expect(store.createBackupSnapshot().events).toHaveLength(501)
  })

  test('restores the previous full history when the expanded save fails', () => {
    const store = useRelationshipRuntimeStore()
    store.resetForTesting()
    const events = Array.from({ length: 500 }, (_, index) => ({
      id: `rollback_event_${index}`,
      entityKey: 'role:504',
      targetLabel: 'Rollback history',
      sourceModule: 'relationship_test',
      sourceId: `rollback_source_${index}`,
      memoryKey: `rollback_memory_${index}`,
      factType: 'history_note',
      summary: `Rollback item ${index}.`,
      metricDeltas: {},
      status: 'applied',
      effectApplied: false,
      createdAt: index,
    }))
    store.restoreFromBackup({
      entities: [{ entityKey: 'role:504', profileId: 504, kind: 'role', displayName: 'Rollback history' }],
      events,
    })
    expect(store.saveNow().ok).toBe(true)
    const setItem = Storage.prototype.setItem
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'schatphone:store:relationship-runtime' && String(value).includes('rollback_new_event')) {
        const error = new Error('quota')
        error.name = 'QuotaExceededError'
        throw error
      }
      return setItem.call(this, key, value)
    })

    expect(store.recordRelationshipFact({
      id: 'rollback_new_event',
      target: { profileId: 504, name: 'Rollback history' },
      sourceModule: 'relationship_test',
      sourceId: 'rollback_new_source',
      memoryKey: 'rollback_new_memory',
      factType: 'history_note',
      summary: 'This write must be rejected without losing history.',
      metricDeltas: {},
    })).toBeNull()
    expect(store.events).toHaveLength(500)
    expect(store.events.some((event) => event.id === 'rollback_new_event')).toBe(false)
    setItemSpy.mockRestore()
  })
})
