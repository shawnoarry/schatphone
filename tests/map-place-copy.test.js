import { describe, expect, test } from 'vitest'
import { listMapPacks } from '../src/lib/map-packs'
import { resolveMapPlaceVisual } from '../src/lib/map-place-categories'
import { MAP_PLACE_COPY_REGISTRY, resolveMapPlaceCopy } from '../src/lib/map-place-copy'

const mapPacks = listMapPacks()
const seoulPack = mapPacks.find((pack) => pack.id === 'real-seoul-v1')
const fictionalPack = mapPacks.find((pack) => pack.id === 'cyber-wasteland-v1')

describe('map place copy registry', () => {
  test('gives every Seoul place distinct bilingual authored copy', () => {
    expect(seoulPack.places).toHaveLength(106)
    expect(Object.keys(MAP_PLACE_COPY_REGISTRY[seoulPack.id])).toHaveLength(106)

    const resolved = seoulPack.places.map((place) => {
      const visual = resolveMapPlaceVisual(place, seoulPack.factions)
      const copy = resolveMapPlaceCopy(place, seoulPack.id, visual)

      expect(copy.source).toBe('map_copy_registry')
      expect(copy.summaryZh.trim()).not.toBe('')
      expect(copy.summaryEn.trim()).not.toBe('')
      expect(copy.summaryZh).not.toBe(visual.descriptionZh)
      expect(copy.summaryEn).not.toBe(visual.descriptionEn)
      return copy
    })

    expect(new Set(resolved.map((copy) => copy.summaryZh)).size).toBe(106)
    expect(new Set(resolved.map((copy) => copy.summaryEn)).size).toBe(106)
  })

  test('gives every built-in fictional place its own interaction-facing introduction', () => {
    expect(fictionalPack.places).toHaveLength(7)
    const resolved = fictionalPack.places.map((place) =>
      resolveMapPlaceCopy(
        place,
        fictionalPack.id,
        resolveMapPlaceVisual(place, fictionalPack.factions),
      ),
    )

    expect(resolved.every((copy) => copy.source === 'map_copy_registry')).toBe(true)
    expect(new Set(resolved.map((copy) => copy.summaryZh)).size).toBe(7)
    expect(new Set(resolved.map((copy) => copy.summaryEn)).size).toBe(7)
  })

  test('prefers user-authored copy and otherwise builds a bounded user-place introduction', () => {
    const authored = resolveMapPlaceCopy(
      {
        source: 'user',
        label: '排练室',
        summaryZh: '今晚排练的集合地点。',
        summaryEn: 'Meeting point for tonight rehearsal.',
      },
      'real-seoul-v1',
    )
    expect(authored).toMatchObject({
      source: 'place_record',
      summaryZh: '今晚排练的集合地点。',
    })

    const fallback = resolveMapPlaceCopy(
      {
        source: 'user',
        label: '屋顶花园',
        nameEn: 'Rooftop Garden',
        detail: '东侧楼梯上方',
      },
      'real-seoul-v1',
      {
        descriptionZh: '自定义地点',
        descriptionEn: 'a custom place',
      },
    )
    expect(fallback.source).toBe('user_place_context')
    expect(fallback.summaryZh).toContain('屋顶花园')
    expect(fallback.summaryZh).toContain('东侧楼梯上方')
    expect(fallback.summaryEn).toContain('Rooftop Garden')
  })
})
