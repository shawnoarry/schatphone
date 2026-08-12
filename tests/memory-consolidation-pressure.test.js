import { describe, expect, test } from 'vitest'
import {
  MEMORY_CONSOLIDATION_CANDIDATE_REASONS,
  MEMORY_CONSOLIDATION_PRESSURE_LEVELS,
  MEMORY_CONSOLIDATION_PRESSURE_REASONS,
  projectMemoryConsolidationPressure,
} from '../src/lib/memory-consolidation-pressure'

const memory = (overrides = {}) => ({
  memoryKey: 'memory',
  displaySummary: 'A shared memory.',
  reviewStatus: 'active',
  supportingCount: 1,
  sourceRefs: [{ sourceModule: 'chat', sourceId: 'message_1' }],
  ...overrides,
})

describe('memory consolidation pressure Module', () => {
  test('returns an empty read-only projection for malformed input', () => {
    expect(projectMemoryConsolidationPressure(null)).toEqual({
      ownerKind: 'unknown',
      ownerKey: '',
      level: MEMORY_CONSOLIDATION_PRESSURE_LEVELS.NONE,
      counts: {
        total: 0,
        active: 0,
        pinned: 0,
        archived: 0,
        sourceReferences: 0,
        characters: 0,
      },
      reasons: [],
      candidates: [],
    })
  })

  test('reports capacity pressure across the complete memory set', () => {
    const result = projectMemoryConsolidationPressure({
      ownerKind: 'role',
      ownerKey: 'role:55',
      memories: Array.from({ length: 55 }, (_, index) =>
        memory({
          memoryKey: `memory_${index}`,
          displaySummary: `Memory ${index}.`,
          sourceRefs: [{ sourceModule: 'calendar', sourceId: `event_${index}` }],
        }),
      ),
    })

    expect(result).toMatchObject({
      ownerKind: 'role',
      ownerKey: 'role:55',
      level: MEMORY_CONSOLIDATION_PRESSURE_LEVELS.WATCH,
      counts: {
        total: 55,
        active: 55,
        pinned: 0,
        archived: 0,
        sourceReferences: 55,
      },
    })
    expect(result.reasons).toEqual([
      MEMORY_CONSOLIDATION_PRESSURE_REASONS.MEMORY_COUNT,
      MEMORY_CONSOLIDATION_PRESSURE_REASONS.ACTIVE_MEMORY_COUNT,
    ])
    expect(result.candidates).toEqual([])
  })

  test('flags only explicit memory groups with dense evidence or a long summary', () => {
    const denseRefs = Array.from({ length: 5 }, (_, index) => ({
      sourceModule: index % 2 === 0 ? 'phone' : 'calendar',
      sourceId: `source_${index}`,
    }))
    const result = projectMemoryConsolidationPressure({
      ownerKind: 'role',
      ownerKey: 'role:1',
      memories: [
        memory({
          memoryKey: 'same_words_a',
          displaySummary: 'The same remembered phrase.',
          supportingCount: 5,
          sourceRefs: denseRefs,
        }),
        memory({
          memoryKey: 'same_words_b',
          displaySummary: 'The same remembered phrase.',
          supportingCount: 1,
        }),
        memory({
          memoryKey: 'long_memory',
          displaySummary: 'x'.repeat(180),
          supportingCount: 1,
        }),
      ],
    })

    expect(result.candidates.map((candidate) => candidate.memoryKey)).toEqual([
      'same_words_a',
      'long_memory',
    ])
    expect(result.candidates[0]).toMatchObject({
      reasons: [MEMORY_CONSOLIDATION_CANDIDATE_REASONS.DENSE_EVIDENCE],
      supportingCount: 5,
    })
    expect(result.candidates[1]).toMatchObject({
      reasons: [MEMORY_CONSOLIDATION_CANDIDATE_REASONS.LONG_SUMMARY],
      summaryCharacters: 180,
    })
  })

  test('counts archived memories without returning them as consolidation candidates', () => {
    const result = projectMemoryConsolidationPressure({
      memories: [
        memory({
          memoryKey: 'archived_dense',
          reviewStatus: 'archived',
          supportingCount: 20,
          displaySummary: 'x'.repeat(500),
        }),
        memory({
          memoryKey: 'pinned_dense',
          reviewStatus: 'pinned',
          supportingCount: 5,
          sourceRefs: [
            { sourceModule: 'wallet', sourceId: 'z' },
            { sourceModule: 'calendar', sourceId: 'a' },
            { sourceModule: 'wallet', sourceId: 'z' },
          ],
        }),
      ],
    })

    expect(result.counts).toMatchObject({ total: 2, active: 0, pinned: 1, archived: 1 })
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0]).toEqual({
      memoryKey: 'pinned_dense',
      level: 'watch',
      reasons: ['dense_evidence'],
      reviewStatus: 'pinned',
      supportingCount: 5,
      summaryCharacters: 'A shared memory.'.length,
      sourceRefs: [
        { sourceModule: 'calendar', sourceId: 'a' },
        { sourceModule: 'wallet', sourceId: 'z' },
      ],
    })
  })

  test('is stable across input order and does not mutate or alias inputs', () => {
    const memories = [
      memory({
        memoryKey: 'zeta',
        supportingCount: 5,
        sourceRefs: [{ sourceModule: 'phone', sourceId: 'zeta' }],
      }),
      memory({
        memoryKey: 'alpha',
        supportingCount: 5,
        sourceRefs: [{ sourceModule: 'phone', sourceId: 'alpha' }],
      }),
    ]
    const original = structuredClone(memories)
    const first = projectMemoryConsolidationPressure({ memories })
    const second = projectMemoryConsolidationPressure({ memories: [...memories].reverse() })

    expect(first).toEqual(second)
    expect(first.candidates.map((candidate) => candidate.memoryKey)).toEqual(['alpha', 'zeta'])
    first.candidates[0].sourceRefs.push({ sourceModule: 'changed', sourceId: 'changed' })
    expect(memories).toEqual(original)
  })

  test('ignores provider and model metadata and supports conservative threshold overrides', () => {
    const input = {
      ownerKind: 'world_chronicle',
      ownerKey: 'world:seoul',
      memories: [memory({ memoryKey: 'day_one', supportingCount: 2 })],
      thresholds: { denseEvidenceWatch: 2, denseEvidenceReview: 3 },
    }
    const baseline = projectMemoryConsolidationPressure(input)
    const withProviderMetadata = projectMemoryConsolidationPressure({
      ...input,
      provider: 'any-provider',
      model: 'any-model',
    })

    expect(withProviderMetadata).toEqual(baseline)
    expect(baseline.candidates[0]).toMatchObject({
      memoryKey: 'day_one',
      level: MEMORY_CONSOLIDATION_PRESSURE_LEVELS.WATCH,
    })
  })
})
