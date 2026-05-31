import { describe, expect, test, vi } from 'vitest'
import {
  buildWorldServiceAccountTemplateFromProposal,
  buildWorldServiceTemplateProposalReview,
  extractWorldServiceTemplateProposals,
} from '../src/lib/world-service-template-proposals'

const survivalPack = {
  id: 'survival_city',
  appBindings: [
    {
      id: 'survival_dispatch',
      title: 'Dispatch Board',
      archetype: 'dispatch',
      moduleKey: 'food_delivery',
      enabled: true,
    },
  ],
  serviceAccountTemplates: [
    {
      id: 'survival_supply_dispatch',
      title: 'Supply Dispatch',
    },
  ],
}

describe('world service template proposals', () => {
  test('separates confirmable service candidates from unsafe proposals', () => {
    const review = buildWorldServiceTemplateProposalReview({
      worldPack: survivalPack,
      worldPackId: 'survival_city',
      proposals: [
        {
          id: 'shelter_bulletin',
          title: 'Shelter Bulletin',
          category: 'publication',
          linkedAppBindingId: 'survival_dispatch',
          confidence: 'medium',
        },
        {
          id: 'survival_supply_dispatch',
          title: 'Duplicate',
          category: 'publication',
          confidence: 'high',
        },
        {
          id: 'mystery_feed',
          title: 'Mystery Feed',
          category: 'service_notification',
          linkedAppBindingId: 'unknown_app',
          confidence: 'high',
        },
        {
          id: 'weak_feed',
          title: 'Weak Feed',
          category: 'service_notification',
          confidence: 'low',
        },
      ],
    })

    expect(review.confirmableProposals).toEqual([
      expect.objectContaining({
        id: 'shelter_bulletin',
        category: 'publication',
        linkedAppBindingId: 'survival_dispatch',
        reviewStatus: 'confirmable',
      }),
    ])
    expect(review.rejectedProposals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'survival_supply_dispatch', rejectionReason: 'duplicate_template' }),
        expect.objectContaining({ id: 'mystery_feed', rejectionReason: 'unknown_app_binding' }),
        expect.objectContaining({ id: 'weak_feed', rejectionReason: 'low_confidence' }),
      ]),
    )
  })

  test('builds a normalized world service template from a confirmed proposal', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-31T10:00:00Z'))

    const template = buildWorldServiceAccountTemplateFromProposal({
      id: 'shelter_bulletin',
      title: 'Shelter Bulletin',
      category: 'publication',
      description: 'Publishes shelter notices.',
      linkedAppBindingId: 'survival_dispatch',
      confidence: 'high',
      evidence: 'The world has public shelter bulletins.',
    })

    expect(template).toMatchObject({
      id: 'shelter_bulletin',
      title: 'Shelter Bulletin',
      category: 'publication',
      description: 'Publishes shelter notices.',
      linkedAppBindingId: 'survival_dispatch',
      source: 'ai_confirmed',
      proposalConfidence: 'high',
      proposalEvidence: 'The world has public shelter bulletins.',
      confirmedAt: 1780221600000,
    })

    vi.useRealTimers()
  })

  test('reviews AI-extracted service proposals through the same guard rules', async () => {
    const callAi = vi.fn(async () => ({
      content: JSON.stringify({
        proposals: [
          {
            id: 'shelter_bulletin',
            title: 'Shelter Bulletin',
            category: 'publication',
            linkedAppBindingId: 'survival_dispatch',
            confidence: 'high',
          },
          {
            id: 'shadow_feed',
            title: 'Shadow Feed',
            category: 'publication',
            linkedAppBindingId: 'missing_binding',
            confidence: 'high',
          },
        ],
      }),
    }))

    const result = await extractWorldServiceTemplateProposals({
      worldContextText: 'Shelters publish notices through a public bulletin channel.',
      worldPack: survivalPack,
      callAi,
    })

    expect(callAi).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      ok: true,
      review: {
        worldPackId: 'survival_city',
        confirmableProposals: [
          expect.objectContaining({
            id: 'shelter_bulletin',
          }),
        ],
        rejectedProposals: [
          expect.objectContaining({
            id: 'shadow_feed',
            rejectionReason: 'unknown_app_binding',
          }),
        ],
      },
    })
  })
})
