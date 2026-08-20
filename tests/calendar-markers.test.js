import { describe, expect, test } from 'vitest'
import {
  CALENDAR_MARKER_COLORS,
  DEFAULT_CALENDAR_MARKERS,
  calendarMarkerColor,
  normalizeCalendarAppearance,
  normalizeCalendarMarkerColorKey,
  normalizeCalendarMarkers,
  resolveCalendarMarker,
} from '../src/lib/calendar-markers'

describe('calendar markers', () => {
  test('ships 12 built-in markers with stable ids and curated colors', () => {
    const markers = normalizeCalendarMarkers()
    expect(markers).toHaveLength(12)
    expect(markers.map((marker) => marker.id)).toEqual(DEFAULT_CALENDAR_MARKERS.map((marker) => marker.id))
    markers.forEach((marker) => {
      expect(CALENDAR_MARKER_COLORS.some((entry) => entry.key === marker.colorKey)).toBe(true)
    })
    expect(markers[0].labelZh).toBe('约会')
    expect(markers[6].labelZh).toBe('自定义1')
  })

  test('applies user overrides by stable id without changing marker identity', () => {
    const markers = normalizeCalendarMarkers([
      { id: 'marker_birthday', labelZh: '  家人生日  ', labelEn: ' Family birthday ', colorKey: 'teal' },
      { id: 'marker_custom_3', labelZh: '探店', labelEn: 'Cafe hopping', colorKey: 'orange' },
      { id: 'marker_unknown', labelZh: '幽灵', colorKey: 'coral' },
      { id: 'marker_date', colorKey: 'not-a-color' },
    ])

    const birthday = resolveCalendarMarker(markers, 'marker_birthday')
    expect(birthday).toMatchObject({ labelZh: '家人生日', labelEn: 'Family birthday', colorKey: 'teal' })
    expect(resolveCalendarMarker(markers, 'marker_custom_3')).toMatchObject({ labelZh: '探店', colorKey: 'orange' })
    expect(resolveCalendarMarker(markers, 'marker_unknown')).toBeNull()
    // invalid colorKey falls back to the marker default
    expect(resolveCalendarMarker(markers, 'marker_date').colorKey).toBe('coral')
  })

  test('resolves marker colors with neutral fallback', () => {
    const markers = normalizeCalendarMarkers()
    expect(calendarMarkerColor(resolveCalendarMarker(markers, 'marker_meeting'))).toBe('#6366f1')
    expect(calendarMarkerColor(resolveCalendarMarker(markers, 'marker_other'))).toBe('#9aa3ad')
    expect(calendarMarkerColor(null)).toBe('#9aa3ad')
  })

  test('normalizeCalendarAppearance keeps only the markers field', () => {
    const appearance = normalizeCalendarAppearance({ markers: [{ id: 'marker_career', colorKey: 'green' }] })
    const career = resolveCalendarMarker(appearance.markers, 'marker_career')
    expect(career.colorKey).toBe('green')
    expect(career.labelZh).toBe('事业活动')
    expect(normalizeCalendarAppearance(null).markers).toHaveLength(12)
  })

  test('normalizeCalendarMarkerColorKey rejects unknown keys', () => {
    expect(normalizeCalendarMarkerColorKey('amber')).toBe('amber')
    expect(normalizeCalendarMarkerColorKey('#ff0000')).toBe('neutral')
  })
})
