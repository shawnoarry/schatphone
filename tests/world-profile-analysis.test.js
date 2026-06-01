import { describe, expect, test, vi } from 'vitest'
import {
  analyzeWorldProfileWithAI,
  buildWorldProfileAnalysisPrompt,
  parseWorldProfileAnalysisResponse,
} from '../src/lib/world-profile-analysis'

describe('world profile analysis', () => {
  test('builds a constrained prompt from active world context', () => {
    const prompt = buildWorldProfileAnalysisPrompt({
      worldContextText: 'A modern school world with idol fan culture and ordinary smartphones.',
    })

    expect(prompt).toContain('Return JSON only')
    expect(prompt).toContain('era')
    expect(prompt).toContain('settingTraits')
    expect(prompt).toContain('modern school world')
    expect(prompt).toContain('Do not enable any pack')
  })

  test('parses assistant JSON into a normalized world profile', () => {
    const profile = parseWorldProfileAnalysisResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              era: 'modern',
              settingTraits: ['school', 'entertainment'],
              realism: 'realistic',
              socialRoles: ['student', 'fan'],
              economyTraits: ['ordinary'],
              technologyLevel: 'real_world',
              confidence: 'high',
              evidence: ['campus and fan accounts are mentioned'],
            }),
          },
        },
      ],
    })

    expect(profile).toMatchObject({
      era: 'modern',
      settingTraits: ['school', 'entertainment'],
      confidence: 'high',
      evidence: ['campus and fan accounts are mentioned'],
    })
  })

  test('calls AI through the shared AI seam and never enables packs', async () => {
    const callAi = vi.fn().mockResolvedValue(
      JSON.stringify({
        era: 'modern',
        settingTraits: ['school'],
        realism: 'realistic',
        confidence: 'medium',
      }),
    )

    const result = await analyzeWorldProfileWithAI({
      worldContextText: 'A realistic campus world.',
      settings: { api: { model: 'test' } },
      callAi,
    })

    expect(result.ok).toBe(true)
    expect(result.profile).toMatchObject({
      era: 'modern',
      settingTraits: ['school'],
      confidence: 'medium',
    })
    expect(callAi).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining('You classify SchatPhone world context'),
      }),
    )
  })
})
