import { describe, expect, test } from 'vitest'
import {
  DEFAULT_HOME_LAYOUT_TEMPLATE_ID,
  HOME_LAYOUT_GRID_COLUMNS,
  HOME_LAYOUT_GRID_ROWS,
  HOME_LAYOUT_TEMPLATE_IDS,
  HOME_LAYOUT_TEMPLATES,
  assignHomeLayoutSlotPlacements,
  assignHomeLayoutSlots,
  createDefaultHomeLayoutTemplateIds,
  homeLayoutSlotIndex,
  homeLayoutSlotToGridStyle,
  normalizeHomeLayoutSlotPlacements,
  normalizeHomeLayoutTemplateId,
  normalizeHomeLayoutTemplateIds,
} from '../src/lib/home-layout-templates'

describe('home layout templates', () => {
  test('defines six neutral templates that fit the 4x6 grid', () => {
    expect(HOME_LAYOUT_TEMPLATES).toHaveLength(6)

    HOME_LAYOUT_TEMPLATES.forEach((template) => {
      expect(template.id).toMatch(/^layout-[a-f]$/)
      expect(template.key).toMatch(/^[A-F]$/)
      expect(template.slots.length).toBeGreaterThan(0)

      template.slots.forEach((slot) => {
        expect(['1x1', '2x1', '2x2', '4x2', '4x3']).toContain(slot.size)
        expect(slot.col).toBeGreaterThanOrEqual(1)
        expect(slot.row).toBeGreaterThanOrEqual(1)
        expect(slot.col + slot.colSpan - 1).toBeLessThanOrEqual(HOME_LAYOUT_GRID_COLUMNS)
        expect(slot.row + slot.rowSpan - 1).toBeLessThanOrEqual(HOME_LAYOUT_GRID_ROWS)
        expect(homeLayoutSlotIndex(slot)).toBeGreaterThanOrEqual(0)
        expect(homeLayoutSlotIndex(slot)).toBeLessThan(HOME_LAYOUT_GRID_COLUMNS * HOME_LAYOUT_GRID_ROWS)
        expect(homeLayoutSlotToGridStyle(slot)).toMatchObject({
          gridColumn: `${slot.col} / span ${slot.colSpan}`,
          gridRow: `${slot.row} / span ${slot.rowSpan}`,
        })
      })
    })
  })

  test('normalizes template ids with stable defaults', () => {
    expect(normalizeHomeLayoutTemplateId('layout-c')).toBe('layout-c')
    expect(normalizeHomeLayoutTemplateId('unknown')).toBe(DEFAULT_HOME_LAYOUT_TEMPLATE_ID)
    expect(normalizeHomeLayoutTemplateId('unknown', 'layout-e')).toBe('layout-e')

    const defaults = createDefaultHomeLayoutTemplateIds(5)
    expect(defaults).toHaveLength(5)
    defaults.forEach((templateId) => {
      expect(HOME_LAYOUT_TEMPLATE_IDS).toContain(templateId)
    })

    expect(normalizeHomeLayoutTemplateIds(['layout-c', 'bad'], 4)).toEqual([
      'layout-c',
      defaults[1],
      defaults[2],
      defaults[3],
    ])
  })

  test('assigns content into fixed template slots and preserves overflow', () => {
    const template = HOME_LAYOUT_TEMPLATES.find((item) => item.id === 'layout-e')
    const tileSizes = {
      hero: '4x3',
      weather: '2x2',
      music: '4x2',
      appA: '1x1',
      appB: '1x1',
      appC: '1x1',
    }

    const result = assignHomeLayoutSlots(
      ['hero', 'weather', 'music', 'appA', 'appB', 'appC'],
      template,
      (tileId) => tileSizes[tileId] || '1x1',
    )

    expect(result.placements.map((item) => item.tileId)).toEqual([
      'weather',
      'appA',
      'music',
      'appB',
      'appC',
    ])
    expect(result.placements.find((item) => item.tileId === 'weather').slot.size).toBe('2x2')
    expect(result.placements.find((item) => item.tileId === 'music').slot.size).toBe('4x2')
    expect(result.placements.find((item) => item.tileId === 'appA').slot.size).toBe('2x2')
    expect(result.placements.find((item) => item.tileId === 'appA').isExactSize).toBe(false)
    expect(result.overflow).toEqual(['hero'])
    expect(result.emptySlots).toHaveLength(0)
  })

  test('prefers explicit slot placements before auto assigning remaining content', () => {
    const template = HOME_LAYOUT_TEMPLATES.find((item) => item.id === 'layout-c')
    const result = assignHomeLayoutSlotPlacements(
      ['weather', 'music', 'appA'],
      template,
      [
        { slotId: 'c-wide', tileId: 'music' },
        { slotId: 'c-small-8', tileId: 'appA' },
      ],
      (tileId) => ({ weather: '2x2', music: '4x2', appA: '1x1' })[tileId] || '1x1',
    )

    expect(result.placements.find((item) => item.tileId === 'music')).toMatchObject({
      isExplicit: true,
      isExactSize: true,
    })
    expect(result.placements.find((item) => item.tileId === 'music').slot.id).toBe('c-wide')
    expect(result.placements.find((item) => item.tileId === 'appA').slot.id).toBe('c-small-8')
    expect(result.placements.find((item) => item.tileId === 'weather').isExplicit).toBe(false)
    expect(result.overflow).toEqual([])
  })

  test('normalizes slot placement records against pages and selected templates', () => {
    const result = normalizeHomeLayoutSlotPlacements(
      [
        [
          { slotId: 'c-wide', tileId: 'music' },
          { slotId: 'missing', tileId: 'weather' },
          { slotId: 'c-small-1', tileId: 'unknown' },
        ],
        [
          { slotId: 'f-left', tileId: 'music' },
          { slotId: 'f-small-1', tileId: 'appA' },
        ],
      ],
      [['music', 'weather'], ['music', 'appA']],
      ['layout-c', 'layout-f'],
    )

    expect(result[0]).toEqual([{ slotId: 'c-wide', tileId: 'music' }])
    expect(result[1]).toEqual([{ slotId: 'f-small-1', tileId: 'appA' }])
  })
})
