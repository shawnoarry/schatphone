// Calendar marker (便签) registry: user-meaning event types with editable labels
// and swappable curated colors. Markers are presentation metadata for Calendar;
// they never change event truth (time, source, lifecycle).

export const CALENDAR_MARKER_COLORS = Object.freeze([
  { key: 'coral', color: '#e86657' },
  { key: 'pink', color: '#ec5b8f' },
  { key: 'violet', color: '#8b5cf6' },
  { key: 'indigo', color: '#6366f1' },
  { key: 'blue', color: '#3b82f6' },
  { key: 'teal', color: '#14b8a6' },
  { key: 'green', color: '#22a06b' },
  { key: 'amber', color: '#d99413' },
  { key: 'orange', color: '#ea7f35' },
  { key: 'brown', color: '#a0724f' },
  { key: 'slate', color: '#64748b' },
  { key: 'neutral', color: '#9aa3ad' },
])

const CALENDAR_MARKER_COLOR_KEYS = new Set(CALENDAR_MARKER_COLORS.map((entry) => entry.key))

// Whole-set color presets: each preset redefines the 12 base hues.
// Muted = desaturated reading tones; candy = brighter playful tones.
export const CALENDAR_COLOR_PRESETS = Object.freeze([
  {
    id: 'default',
    labelZh: '默认',
    labelEn: 'Default',
    colors: Object.freeze({
      coral: '#e86657',
      pink: '#ec5b8f',
      violet: '#8b5cf6',
      indigo: '#6366f1',
      blue: '#3b82f6',
      teal: '#14b8a6',
      green: '#22a06b',
      amber: '#d99413',
      orange: '#ea7f35',
      brown: '#a0724f',
      slate: '#64748b',
      neutral: '#9aa3ad',
    }),
  },
  {
    id: 'muted',
    labelZh: '低饱和',
    labelEn: 'Muted',
    colors: Object.freeze({
      coral: '#c47b72',
      pink: '#c98aa5',
      violet: '#9d8cc4',
      indigo: '#8a90c0',
      blue: '#7a9bc4',
      teal: '#6fa8a0',
      green: '#6fa188',
      amber: '#b59b6e',
      orange: '#c4977f',
      brown: '#a08d80',
      slate: '#87909b',
      neutral: '#a8adb3',
    }),
  },
  {
    id: 'candy',
    labelZh: '糖果',
    labelEn: 'Candy',
    colors: Object.freeze({
      coral: '#ff5a4e',
      pink: '#ff4fa8',
      violet: '#a855f7',
      indigo: '#818cf8',
      blue: '#38bdf8',
      teal: '#2dd4bf',
      green: '#34d399',
      amber: '#fbbf24',
      orange: '#fb923c',
      brown: '#b45309',
      slate: '#475569',
      neutral: '#94a3b8',
    }),
  },
])

const CALENDAR_COLOR_PRESET_IDS = new Set(CALENDAR_COLOR_PRESETS.map((preset) => preset.id))

export const CALENDAR_GLYPH_STYLES = Object.freeze(['bar', 'dot', 'icon_tint'])

export const normalizeCalendarColorPreset = (value, fallback = 'default') =>
  CALENDAR_COLOR_PRESET_IDS.has(value) ? value : fallback

export const normalizeCalendarGlyphStyle = (value, fallback = 'bar') =>
  CALENDAR_GLYPH_STYLES.includes(value) ? value : fallback

export const DEFAULT_CALENDAR_MARKERS = Object.freeze([
  { id: 'marker_date', labelZh: '约会', labelEn: 'Date', colorKey: 'coral' },
  { id: 'marker_birthday', labelZh: '生日', labelEn: 'Birthday', colorKey: 'pink' },
  { id: 'marker_career', labelZh: '事业活动', labelEn: 'Career', colorKey: 'blue' },
  { id: 'marker_anniversary', labelZh: '纪念日', labelEn: 'Anniversary', colorKey: 'violet' },
  { id: 'marker_meeting', labelZh: '重要会议', labelEn: 'Meeting', colorKey: 'indigo' },
  { id: 'marker_other', labelZh: '其他', labelEn: 'Other', colorKey: 'neutral' },
  { id: 'marker_custom_1', labelZh: '自定义1', labelEn: 'Custom 1', colorKey: 'teal' },
  { id: 'marker_custom_2', labelZh: '自定义2', labelEn: 'Custom 2', colorKey: 'green' },
  { id: 'marker_custom_3', labelZh: '自定义3', labelEn: 'Custom 3', colorKey: 'amber' },
  { id: 'marker_custom_4', labelZh: '自定义4', labelEn: 'Custom 4', colorKey: 'orange' },
  { id: 'marker_custom_5', labelZh: '自定义5', labelEn: 'Custom 5', colorKey: 'brown' },
  { id: 'marker_custom_6', labelZh: '自定义6', labelEn: 'Custom 6', colorKey: 'slate' },
])

const DEFAULT_MARKER_IDS = new Set(DEFAULT_CALENDAR_MARKERS.map((marker) => marker.id))

const normalizeMarkerText = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 40) : fallback

export const normalizeCalendarMarkerColorKey = (value, fallback = 'neutral') =>
  CALENDAR_MARKER_COLOR_KEYS.has(value) ? value : fallback

// User overrides apply by stable marker id; ids stay fixed so events keep meaning.
export const normalizeCalendarMarkers = (input) => {
  const overrides = new Map()
  if (Array.isArray(input)) {
    input.forEach((item) => {
      if (!item || typeof item !== 'object') return
      const id = typeof item.id === 'string' ? item.id.trim() : ''
      if (!DEFAULT_MARKER_IDS.has(id)) return
      overrides.set(id, item)
    })
  }
  return DEFAULT_CALENDAR_MARKERS.map((marker) => {
    const override = overrides.get(marker.id)
    if (!override) return { ...marker }
    return {
      id: marker.id,
      labelZh: normalizeMarkerText(override.labelZh, marker.labelZh),
      labelEn: normalizeMarkerText(override.labelEn, marker.labelEn),
      colorKey: normalizeCalendarMarkerColorKey(override.colorKey, marker.colorKey),
    }
  })
}

export const normalizeCalendarAppearance = (input = {}) => ({
  markers: normalizeCalendarMarkers(input?.markers),
  colorPreset: normalizeCalendarColorPreset(input?.colorPreset),
  glyphStyle: normalizeCalendarGlyphStyle(input?.glyphStyle),
})

export const resolveCalendarMarker = (markers, markerId) => {
  const id = typeof markerId === 'string' ? markerId.trim() : ''
  if (!id) return null
  const list = Array.isArray(markers) ? markers : []
  return list.find((marker) => marker.id === id) || null
}

export const resolveCalendarColorPreset = (presetId) =>
  CALENDAR_COLOR_PRESETS.find((preset) => preset.id === presetId) || CALENDAR_COLOR_PRESETS[0]

export const calendarMarkerColor = (marker, presetId = 'default') => {
  const preset = resolveCalendarColorPreset(presetId)
  return preset.colors[marker?.colorKey] || preset.colors.neutral
}
