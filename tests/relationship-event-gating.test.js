import { describe, expect, test } from 'vitest'
import {
  RELATIONSHIP_EVENT_GATE_DECISION,
  RELATIONSHIP_EVENT_GATE_PRESET_IDS,
  buildRelationshipClassificationContextForTarget,
  buildRelationshipFactGateFromPreset,
  evaluateRelationshipEventGate,
  resolveRelationshipEventGatePreset,
} from '../src/lib/relationship-event-gating'

describe('relationship event gating', () => {
  test('builds classification context from saved role-profile fields only', () => {
    const chatStore = {
      getRoleProfileById: () => ({
        id: 1,
        relationshipLabelText: 'secret crush',
        relationshipLabelNote: 'Do not read this for event decisions.',
        primaryRelationshipCategoryId: 'romance_candidate',
        relationshipModifierIds: ['secret', 'mutual'],
        classificationConfidence: 'high',
        classificationSource: 'ai_auto',
        classificationUpdatedAt: 1772294400000,
      }),
    }

    const context = buildRelationshipClassificationContextForTarget({
      chatStore,
      target: { profileId: 1 },
    })

    expect(context).toMatchObject({
      profileId: 1,
      primaryRelationshipCategoryId: 'romance_candidate',
      relationshipModifierIds: ['secret', 'mutual'],
      classificationConfidence: 'high',
      classificationSource: 'ai_auto',
      classificationUpdatedAt: 1772294400000,
    })
    expect(context.relationshipLabelText).toBeUndefined()
    expect(context.relationshipLabelNote).toBeUndefined()
  })

  test('preserves saved world-specific classification when no registry is supplied', () => {
    const chatStore = {
      getRoleProfileById: () => ({
        id: 2,
        primaryRelationshipCategoryId: 'marked_bond',
        relationshipModifierIds: ['heat_cycle'],
        classificationConfidence: 'high',
        classificationSource: 'world_template',
      }),
    }

    const context = buildRelationshipClassificationContextForTarget({
      chatStore,
      target: { profileId: 2 },
    })

    expect(context.primaryRelationshipCategoryId).toBe('marked_bond')
    expect(context.relationshipModifierIds).toEqual(['heat_cycle'])
  })

  test('uses low-risk category rules as soft references', () => {
    const decision = evaluateRelationshipEventGate({
      eventType: 'gift_purchased',
      risk: 'low',
      classification: {
        primaryRelationshipCategoryId: 'family_bond',
        relationshipModifierIds: ['caretaking'],
      },
      rule: {
        preferredPrimaryCategoryIds: ['friendship_bond', 'romance_candidate', 'romantic_bond'],
      },
    })

    expect(decision).toMatchObject({
      decision: RELATIONSHIP_EVENT_GATE_DECISION.ALLOW,
      mode: 'soft_reference',
      matched: false,
      reason: 'soft_mismatch_allowed',
    })
  })

  test('blocks high-risk romance events when category does not match', () => {
    const decision = evaluateRelationshipEventGate({
      eventType: 'confession_candidate',
      risk: 'high',
      classification: {
        primaryRelationshipCategoryId: 'family_bond',
        relationshipModifierIds: ['caretaking'],
      },
      rule: {
        allowedPrimaryCategoryIds: ['romance_candidate', 'romantic_bond'],
      },
    })

    expect(decision).toMatchObject({
      decision: RELATIONSHIP_EVENT_GATE_DECISION.BLOCK,
      mode: 'hard_gate',
      reason: 'primary_category_not_allowed',
      matched: false,
    })
  })

  test('can request confirmation for high-risk modifier mismatches', () => {
    const decision = evaluateRelationshipEventGate({
      eventType: 'confession_candidate',
      risk: 'high',
      classification: {
        primaryRelationshipCategoryId: 'romance_candidate',
        relationshipModifierIds: ['secret'],
      },
      rule: {
        allowedPrimaryCategoryIds: ['romance_candidate', 'romantic_bond'],
        requiredModifierIds: ['mutual'],
        confirmOnModifierMismatch: true,
      },
    })

    expect(decision).toMatchObject({
      decision: RELATIONSHIP_EVENT_GATE_DECISION.CONFIRM,
      mode: 'hard_gate',
      reason: 'required_modifier_missing',
      matched: false,
    })
  })

  test('allows high-risk romance events only when hard gate matches', () => {
    const decision = evaluateRelationshipEventGate({
      eventType: 'confession_candidate',
      risk: 'high',
      classification: {
        primaryRelationshipCategoryId: 'romance_candidate',
        relationshipModifierIds: ['mutual'],
      },
      rule: {
        allowedPrimaryCategoryIds: ['romance_candidate', 'romantic_bond'],
        requiredModifierIds: ['mutual'],
      },
    })

    expect(decision).toMatchObject({
      decision: RELATIONSHIP_EVENT_GATE_DECISION.ALLOW,
      mode: 'hard_gate',
      reason: 'matched',
      matched: true,
    })
  })

  test('resolves high-risk gate presets as cloned reusable rules', () => {
    const preset = resolveRelationshipEventGatePreset(
      RELATIONSHIP_EVENT_GATE_PRESET_IDS.ROMANCE_CONFESSION,
    )
    const secondPreset = resolveRelationshipEventGatePreset(
      RELATIONSHIP_EVENT_GATE_PRESET_IDS.ROMANCE_CONFESSION,
    )

    expect(preset).toMatchObject({
      id: 'romance_confession',
      eventType: 'confession_candidate',
      risk: 'high',
      rule: {
        allowedPrimaryCategoryIds: ['romance_candidate', 'romantic_bond'],
        requiredModifierIds: ['mutual'],
        confirmOnModifierMismatch: true,
      },
    })

    preset.rule.allowedPrimaryCategoryIds.push('family_bond')
    expect(secondPreset.rule.allowedPrimaryCategoryIds).toEqual([
      'romance_candidate',
      'romantic_bond',
    ])
    expect(resolveRelationshipEventGatePreset('missing_preset')).toBe(null)
  })

  test('builds high-risk romance confession gates from saved classification presets', () => {
    const chatStore = {
      getRoleProfileById: () => ({
        id: 3,
        relationshipLabelText: 'raw prose must not be inspected',
        primaryRelationshipCategoryId: 'romance_candidate',
        relationshipModifierIds: ['secret'],
        classificationConfidence: 'high',
        classificationSource: 'user_edited',
      }),
    }

    const decision = buildRelationshipFactGateFromPreset({
      chatStore,
      target: { profileId: 3 },
      presetId: RELATIONSHIP_EVENT_GATE_PRESET_IDS.ROMANCE_CONFESSION,
    })

    expect(decision).toMatchObject({
      decision: RELATIONSHIP_EVENT_GATE_DECISION.CONFIRM,
      mode: 'hard_gate',
      eventType: 'confession_candidate',
      primaryRelationshipCategoryId: 'romance_candidate',
      relationshipModifierIds: ['secret'],
      classificationSource: 'user_edited',
      reason: 'required_modifier_missing',
    })
    expect(decision.relationshipLabelText).toBeUndefined()
  })

  test('blocks high-risk preset gates when saved category is incompatible', () => {
    const chatStore = {
      getRoleProfileById: () => ({
        id: 4,
        primaryRelationshipCategoryId: 'family_bond',
        relationshipModifierIds: ['caretaking', 'mutual'],
        classificationConfidence: 'high',
        classificationSource: 'ai_confirmed',
      }),
    }

    const decision = buildRelationshipFactGateFromPreset({
      chatStore,
      target: { profileId: 4 },
      presetId: RELATIONSHIP_EVENT_GATE_PRESET_IDS.ROMANCE_CONFESSION,
    })

    expect(decision).toMatchObject({
      decision: RELATIONSHIP_EVENT_GATE_DECISION.BLOCK,
      mode: 'hard_gate',
      reason: 'primary_category_not_allowed',
      primaryRelationshipCategoryId: 'family_bond',
      matched: false,
    })
  })

  test('allows high-risk preset gates when category and modifiers match', () => {
    const chatStore = {
      getRoleProfileById: () => ({
        id: 5,
        primaryRelationshipCategoryId: 'romantic_bond',
        relationshipModifierIds: ['mutual'],
        classificationConfidence: 'high',
        classificationSource: 'user_edited',
      }),
    }

    const decision = buildRelationshipFactGateFromPreset({
      chatStore,
      target: { profileId: 5 },
      presetId: RELATIONSHIP_EVENT_GATE_PRESET_IDS.ROMANCE_CONFESSION,
    })

    expect(decision).toMatchObject({
      decision: RELATIONSHIP_EVENT_GATE_DECISION.ALLOW,
      mode: 'hard_gate',
      reason: 'matched',
      eventType: 'confession_candidate',
      matched: true,
    })
  })
})
