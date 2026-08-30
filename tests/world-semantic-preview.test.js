import { describe, expect, test, vi } from 'vitest'
import {
  WORLD_SEMANTIC_PREVIEW_SCHEMA_VERSION,
  buildLocalWorldUnderstanding,
  buildWorldSemanticPreviewInput,
  buildWorldSemanticVersionInput,
  normalizeWorldSemanticPreview,
  requestWorldSemanticPreview,
  requestWorldSemanticVersionReview,
} from '../src/lib/simulation/world-semantic-preview'

const createWorldOverview = () => ({
  identity: {
    worldId: 'world_custom_1',
    title: '潮汐契约城',
  },
  narrative: {
    promptText: '潮汐契约决定城区通行。唱名师可以为一段街道改名，但不能改变已经发生的事实。',
    activeSources: [
      { id: 'source_1', title: '潮汐契约总则', missing: false, changed: false },
      { id: 'source_missing', title: '失落附录', missing: true, changed: false },
    ],
  },
  encyclopedia: {
    selectedEntries: [
      { id: 'entry_1', title: '唱名师', content: '负责公开确认街道称谓。', tags: ['职业'] },
    ],
  },
  profiles: {
    enabledTemplates: [
      { id: 'profile_1', title: '契约居民', fields: [{ id: 'tide_mark', label: '潮印' }] },
    ],
  },
  capabilities: {
    enabledPacks: [{ id: 'pack_1', title: '潮汐通行' }],
    appBindings: [{ appId: 'map' }],
  },
})

const createWorldContext = () => ({
  id: 'world_context_custom_tide',
  genreTags: ['custom'],
  toneTags: ['ritual'],
  techLevel: 'low',
  dangerLevel: 'medium',
  socialOrder: 'stable',
  economyMode: 'cash',
  magicLevel: 'unknown',
})

describe('world semantic preview', () => {
  test('reports what local code can read without claiming a compiled semantic boundary', () => {
    const understanding = buildLocalWorldUnderstanding({
      worldOverview: createWorldOverview(),
      worldContext: createWorldContext(),
    })

    expect(understanding).toMatchObject({
      status: 'attention',
      worldId: 'world_custom_1',
      worldTitle: '潮汐契约城',
      worldContextId: 'world_context_custom_tide',
      counts: {
        activeSources: 1,
        missingSources: 1,
        knowledgeEntries: 1,
        profileTemplates: 1,
        capabilityPacks: 1,
        appBindings: 1,
      },
    })
    expect(understanding.sourceTitles).toEqual(['潮汐契约总则'])
    expect(understanding.issues).toContain('world_sources_missing')
    expect(understanding.issues).toContain('semantic_manifest_not_compiled')
  })

  test('builds a bounded provider-neutral input from arbitrary world terms', () => {
    const overview = createWorldOverview()
    overview.narrative.promptText = '潮'.repeat(7_000)
    overview.encyclopedia.selectedEntries = Array.from({ length: 12 }, (_, index) => ({
      id: `entry_${index}`,
      title: `词条 ${index}`,
      content: '解释'.repeat(400),
      tags: ['自定义'],
    }))

    const input = buildWorldSemanticPreviewInput({
      worldOverview: overview,
      worldContext: createWorldContext(),
      locale: 'zh-CN',
    })

    expect(input.schemaVersion).toBe(WORLD_SEMANTIC_PREVIEW_SCHEMA_VERSION)
    expect(input.narrative).toHaveLength(6_000)
    expect(input.knowledge).toHaveLength(8)
    expect(input.knowledge[0].content.length).toBeLessThanOrEqual(520)
    expect(input.world.coarseTraits).toEqual(['custom', 'ritual'])
  })

  test('normalizes custom concepts and preserves unknowns and conflicts', () => {
    const preview = normalizeWorldSemanticPreview({
      summary: '这是一个由潮汐契约约束通行与公开称谓的城市。',
      concepts: Array.from({ length: 14 }, (_, index) => ({
        id: `concept_${index}`,
        label: `自定义词 ${index}`,
        kind: index === 0 ? 'unrecognized_kind' : 'rule',
        meaning: '来自用户文本的含义。',
        confidence: index === 0 ? 'invalid' : 'high',
      })),
      capabilities: [{ label: '潮汐通行', description: '根据已确认的潮汐阶段检查通行资格。' }],
      boundaries: ['不能改写已经发生的事实。'],
      unknowns: ['没有说明潮汐阶段如何结算。'],
      conflicts: ['失落附录未提供。'],
    })

    expect(preview.concepts).toHaveLength(12)
    expect(preview.concepts[0]).toMatchObject({ kind: 'custom', confidence: 'unknown' })
    expect(preview.boundaries).toEqual(['不能改写已经发生的事实。'])
    expect(preview.unknowns).toEqual(['没有说明潮汐阶段如何结算。'])
    expect(preview.conflicts).toEqual(['失落附录未提供。'])
  })

  test('calls one injected model adapter and returns transient preview provenance', async () => {
    const callAi = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        summary: '唱名师是用户世界里的自定义公共角色。',
        concepts: [{
          id: 'concept_chant_namer',
          label: '唱名师',
          kind: 'role',
          meaning: '公开确认街道称谓的角色。',
          evidence: '负责公开确认街道称谓',
          confidence: 'high',
        }],
        capabilities: [],
        boundaries: ['不改变已发生事实。'],
        unknowns: [],
        conflicts: [],
      }),
      meta: {
        provider: 'openai_compatible',
        model: 'test-model',
        requestId: 'request-1',
        generatedAt: 1_787_958_000_000,
      },
    })
    const input = buildWorldSemanticPreviewInput({
      worldOverview: createWorldOverview(),
      worldContext: createWorldContext(),
    })

    const result = await requestWorldSemanticPreview({
      input,
      settings: { api: { resolvedKind: 'openai_compatible', model: 'test-model' } },
      callAi,
    })

    expect(callAi).toHaveBeenCalledTimes(1)
    expect(callAi.mock.calls[0][0]).toMatchObject({
      withMeta: true,
      settings: { api: { resolvedKind: 'openai_compatible', model: 'test-model' } },
    })
    expect(callAi.mock.calls[0][0].messages[0].content).toContain('唱名师')
    expect(result.preview.concepts[0].kind).toBe('role')
    expect(result.provenance).toEqual({
      providerId: 'openai_compatible',
      modelId: 'test-model',
      requestId: 'request-1',
      generatedAt: 1_787_958_000_000,
    })
  })

  test('uses complete world content for a version review and returns a hash-bound proposal', async () => {
    const overview = createWorldOverview()
    overview.narrative.promptText = '潮'.repeat(7_000)
    overview.narrative.activeSources[0].promptText = overview.narrative.promptText
    const sourceFingerprint = 'c'.repeat(64)
    const input = buildWorldSemanticVersionInput({
      worldOverview: overview,
      worldContext: createWorldContext(),
      sourceSnapshot: { sourceFingerprint },
    })
    const proposal = {
      schemaVersion: 1,
      worldId: 'world_custom_1',
      namespace: 'tide_contract',
      sourceFingerprint,
      concepts: [{
        id: 'tide_contract:chant_namer',
        label: '唱名师',
        kind: 'actor',
        aliases: [],
        meaning: '公开确认街道称谓的角色。',
        confidence: 'high',
        evidence: [{ sourceId: 'source_1', excerpt: '负责公开确认街道称谓' }],
      }],
      capabilities: [],
      boundaries: [{
        id: 'tide_contract:settled_history',
        kind: 'prohibition',
        statement: '不能改变已经发生的事实。',
        capabilityIds: [],
        evidence: [{ sourceId: 'source_1', excerpt: '不能改变已经发生的事实' }],
      }],
      bridges: [],
      unknowns: [],
      conflicts: [],
    }
    const callAi = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        preview: {
          summary: '唱名师是用户世界里的自定义公共角色。',
          concepts: [{
            id: 'concept_chant_namer',
            label: '唱名师',
            kind: 'role',
            meaning: '公开确认街道称谓的角色。',
            evidence: '负责公开确认街道称谓',
            confidence: 'high',
          }],
          capabilities: [],
          boundaries: ['不能改变已经发生的事实。'],
          unknowns: [],
          conflicts: [],
        },
        proposal,
      }),
      meta: {
        provider: 'openai_compatible',
        model: 'test-model',
        requestId: 'version-request-1',
        generatedAt: 1_787_958_000_000,
      },
    })

    const result = await requestWorldSemanticVersionReview({
      input,
      settings: { api: { resolvedKind: 'openai_compatible', model: 'test-model' } },
      callAi,
    })

    expect(input.narrative).toHaveLength(7_000)
    expect(input.sources[0].text).toHaveLength(7_000)
    expect(callAi).toHaveBeenCalledTimes(1)
    expect(result.proposal).toMatchObject({ worldId: 'world_custom_1', sourceFingerprint })
    expect(result.modelReceipt).toMatchObject({
      providerId: 'openai_compatible',
      modelId: 'test-model',
      requestId: 'version-request-1',
      sourceFingerprint,
    })
    expect(result.modelReceipt.proposalHash).toMatch(/^[a-f0-9]{64}$/)
  })

  test('rejects a provider response that cannot satisfy the review schema', async () => {
    const callAi = vi.fn().mockResolvedValue({ text: '{"unrelated":true}' })

    await expect(requestWorldSemanticPreview({
      input: buildWorldSemanticPreviewInput(),
      settings: { api: {} },
      callAi,
    })).rejects.toMatchObject({ code: 'WORLD_SEMANTIC_PREVIEW_INVALID' })
  })
})
