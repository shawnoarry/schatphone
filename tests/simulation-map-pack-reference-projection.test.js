import { describe, expect, test } from 'vitest'
import { listSimulationMapPackReferences } from '../src/lib/simulation/map-pack-reference-projection'

describe('Simulation Map pack reference projection', () => {
  test('projects active and historical Event Runtime references without copying event bodies', () => {
    const references = listSimulationMapPackReferences({
      eventInstances: [
        {
          id: 'event-active',
          lifecycle: 'active',
          world: { mapPackId: 'catalog-neon-borough-v1' },
          text: { body: 'must not leak' },
        },
        {
          id: 'event-resolved',
          lifecycle: 'resolved',
          world: { mapPackId: 'catalog-neon-borough-v1' },
        },
        { id: 'event-no-map', lifecycle: 'active', world: {} },
      ],
      mapJourneyEventProposals: [
        {
          id: 'proposal-pending',
          status: 'pending_review',
          source: { mapPackId: 'catalog-neon-borough-v1' },
          summaryZh: 'must not leak',
        },
        {
          id: 'proposal-applied',
          status: 'applied',
          source: { mapPackId: 'catalog-neon-borough-v1' },
        },
      ],
    })

    expect(references).toEqual([
      {
        owner: 'event_runtime',
        kind: 'event_instance',
        referenceId: 'event-active',
        mapPackId: 'catalog-neon-borough-v1',
        active: true,
      },
      {
        owner: 'event_runtime',
        kind: 'event_instance',
        referenceId: 'event-resolved',
        mapPackId: 'catalog-neon-borough-v1',
        active: false,
      },
      {
        owner: 'event_runtime',
        kind: 'map_journey_event_proposal',
        referenceId: 'proposal-pending',
        mapPackId: 'catalog-neon-borough-v1',
        active: true,
      },
      {
        owner: 'event_runtime',
        kind: 'map_journey_event_proposal',
        referenceId: 'proposal-applied',
        mapPackId: 'catalog-neon-borough-v1',
        active: false,
      },
    ])
    expect(references.some((reference) => 'text' in reference || 'summaryZh' in reference)).toBe(
      false,
    )
  })

  test('fails closed to no reference for malformed records', () => {
    expect(
      listSimulationMapPackReferences({
        eventInstances: [null, { id: '', world: { mapPackId: 'map-1' } }],
        mapJourneyEventProposals: [{ id: 'proposal', source: {} }],
      }),
    ).toEqual([])
  })
})
