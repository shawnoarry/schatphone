import { describe, expect, test, vi } from 'vitest'
import {
  buildWorldAppBindingFromTemplateProposal,
  buildWorldAppTemplateExtractionReview,
  extractWorldAppTemplateProposals,
  listWorldAppTemplateRegistry,
} from '../src/lib/world-app-template-registry'

describe('world app template registry', () => {
  test('lists only reviewed target-module templates', () => {
    const templates = listWorldAppTemplateRegistry()

    expect(templates.map((template) => template.id)).toEqual(
      expect.arrayContaining(['black_market', 'transit_pass', 'reservation_board']),
    )
    expect(new Set(templates.map((template) => template.moduleKey))).toEqual(
      new Set(['shopping', 'food_delivery', 'chat', 'map', 'calendar']),
    )
  })

  test('separates confirmable proposals from low-confidence or unknown suggestions', () => {
    const review = buildWorldAppTemplateExtractionReview({
      worldPackId: 'my_world',
      existingBindings: [],
      proposals: [
        { templateId: 'transit_pass', title: 'Metro Pass', confidence: 'medium' },
        { templateId: 'black_market', title: 'Night Market', confidence: 'high' },
        { templateId: 'clinic_dispatch', title: 'Weak Clinic', confidence: 'low' },
        { templateId: 'invented_app', title: 'Invented', confidence: 'high' },
      ],
    })

    expect(review.confirmableProposals).toEqual([
      expect.objectContaining({
        templateId: 'transit_pass',
        bindingId: 'my_world_transit_pass',
        reviewStatus: 'confirmable',
      }),
    ])
    expect(review.rejectedProposals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ templateId: 'black_market', rejectionReason: 'needs_dedicated_app' }),
        expect.objectContaining({ templateId: 'clinic_dispatch', rejectionReason: 'low_confidence' }),
        expect.objectContaining({ templateId: 'invented_app', rejectionReason: 'unknown_template' }),
      ]),
    )
  })

  test('builds normalized world app bindings from approved templates', () => {
    const binding = buildWorldAppBindingFromTemplateProposal({
      templateId: 'transit_pass',
      bindingId: 'my_world_transit_pass',
      title: 'Metro Pass',
      description: 'Transit access for this world.',
      confidence: 'high',
    })

    expect(binding).toMatchObject({
      id: 'my_world_transit_pass',
      archetype: 'transit',
      title: 'Metro Pass',
      moduleKey: 'map',
      route: '/map',
      enabled: true,
    })

    expect(
      buildWorldAppBindingFromTemplateProposal({
        templateId: 'black_market',
        bindingId: 'my_world_black_market',
        title: 'Night Market',
        confidence: 'high',
      }),
    ).toBeNull()
  })

  test('reviews AI-extracted proposals through the same whitelist seam', async () => {
    const callAi = vi.fn(async () => ({
      content: JSON.stringify({
        proposals: [
          {
            templateId: 'reservation_board',
            title: 'Ritual Calendar',
            confidence: 'high',
            evidence: 'The world describes appointments and public ceremonies.',
          },
          {
            templateId: 'unknown_dashboard',
            title: 'Unknown Dashboard',
            confidence: 'high',
          },
        ],
      }),
    }))

    const result = await extractWorldAppTemplateProposals({
      worldContextText: 'Public rituals require reservations and calendar coordination.',
      worldPack: { id: 'ritual_world', appBindings: [] },
      callAi,
    })

    expect(callAi).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      ok: true,
      review: {
        worldPackId: 'ritual_world',
        confirmableProposals: [
          expect.objectContaining({
            templateId: 'reservation_board',
            bindingId: 'ritual_world_reservation_board',
          }),
        ],
        rejectedProposals: [
          expect.objectContaining({
            templateId: 'unknown_dashboard',
            rejectionReason: 'unknown_template',
          }),
        ],
      },
    })
  })
})
