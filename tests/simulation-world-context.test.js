import { describe, expect, test, vi } from 'vitest'
import {
  WORLD_CONTEXT_FAMILY,
  resolveWorldContextFamily,
  resolveWorldContextFromWorldBook,
} from '../src/lib/simulation/world-context'

describe('simulation world context resolver', () => {
  test('resolves daily, sci-fi, and apocalypse families from worldview text and tags', () => {
    expect(resolveWorldContextFamily({ globalWorldview: 'A normal modern city.' })).toBe(
      WORLD_CONTEXT_FAMILY.DAILY,
    )
    expect(resolveWorldContextFamily({ globalWorldview: '科幻城市里无人机配送和高科技公司很多。' })).toBe(
      WORLD_CONTEXT_FAMILY.SCI_FI,
    )
    expect(
      resolveWorldContextFamily({
        knowledgePoints: [
          {
            title: 'Supply rules',
            content: '封锁区和补给队决定交通。',
            tags: ['末世'],
          },
        ],
      }),
    ).toBe(WORLD_CONTEXT_FAMILY.APOCALYPSE)
  })

  test('builds compact WorldBook references without copying raw point text', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const context = resolveWorldContextFromWorldBook({
      globalWorldview: 'Sci-fi city baseline.',
      knowledgePoints: [
        {
          id: 'kp_drone_city',
          title: 'Drone city',
          content: 'Delivery drones queue in low-altitude lanes.',
          tags: ['sci_fi'],
          enabled: true,
        },
        {
          id: 'kp_disabled',
          title: 'Hidden',
          content: 'Should not become active reference.',
          tags: ['apocalypse'],
          enabled: false,
        },
      ],
      sourceScope: 'module',
      now: Date.now(),
    })

    expect(context).toMatchObject({
      source: 'worldbook_binding',
      sourceScope: 'module',
      genreTags: [WORLD_CONTEXT_FAMILY.SCI_FI],
      techLevel: 'high',
      activeWorldBookIds: ['kp_drone_city'],
    })
    expect(JSON.stringify(context)).not.toContain('Delivery drones queue')
  })
})
