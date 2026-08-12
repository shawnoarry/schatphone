import {
  ROLE_DETAIL_SECTIONS,
  ROLE_DETAIL_SOURCE_KINDS,
} from './role-profile-schema'

export const ROLE_CONTINUITY_LIMITS = Object.freeze({
  manualItems: 12,
  manualCharacters: 1600,
  eventClues: 3,
  eventCharacters: 600,
})

const SECTION_ORDER = Object.freeze([
  ROLE_DETAIL_SECTIONS.PREFERENCES,
  ROLE_DETAIL_SECTIONS.LIFE_PATTERN,
  ROLE_DETAIL_SECTIONS.SOCIAL_GRAPH,
])

const SECTION_LABELS = Object.freeze({
  [ROLE_DETAIL_SECTIONS.PREFERENCES]: 'Preferences',
  [ROLE_DETAIL_SECTIONS.LIFE_PATTERN]: 'Life pattern',
  [ROLE_DETAIL_SECTIONS.SOCIAL_GRAPH]: 'Social graph',
})

const normalizeText = (value) =>
  typeof value === 'string' ? value.normalize('NFKC').replace(/\s+/g, ' ').trim() : ''

const comparableText = (value) => normalizeText(value).toLowerCase()

const clampInteger = (value, fallback, min, max) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.floor(number)))
}

const formatDetailItem = (item = {}) => {
  const title = normalizeText(item.title)
  const detail = normalizeText(item.detail)
  if (title && detail) return `${title}: ${detail}`
  return title || detail
}

const compareDetailItems = (left = {}, right = {}) => {
  const sectionDelta = SECTION_ORDER.indexOf(left.section) - SECTION_ORDER.indexOf(right.section)
  if (sectionDelta !== 0) return sectionDelta
  const updatedDelta = (Number(right.updatedAt) || 0) - (Number(left.updatedAt) || 0)
  if (updatedDelta !== 0) return updatedDelta
  const leftId = normalizeText(left.id)
  const rightId = normalizeText(right.id)
  if (leftId === rightId) return 0
  return leftId < rightId ? -1 : 1
}

const selectLinesWithinBudget = (items, limit, characterBudget, formatter, render) => {
  const selected = []
  for (const item of items) {
    if (selected.length >= limit) break
    const text = formatter(item)
    if (!text) continue
    const candidate = [...selected, { item, text }]
    if (render(candidate).length > characterBudget) continue
    selected.push({ item, text })
  }
  return { selected, usedCharacters: render(selected).length }
}

const buildManualText = (selected) => {
  const grouped = new Map(SECTION_ORDER.map((section) => [section, []]))
  selected.forEach(({ item, text }) => grouped.get(item.section)?.push(text))
  const lines = SECTION_ORDER
    .map((section) => {
      const entries = grouped.get(section) || []
      return entries.length > 0 ? `${SECTION_LABELS[section]}: ${entries.join('; ')}.` : ''
    })
    .filter(Boolean)
  if (lines.length === 0) return ''
  return [
    'Confirmed role details written by the user. Treat these as stable character facts:',
    ...lines,
  ].join('\n')
}

const buildEventClueCandidates = (detailItems, recalledMemories) => {
  const recalledByKey = new Map(
    recalledMemories
      .map((memory) => [comparableText(memory?.memoryKey), memory])
      .filter(([memoryKey]) => memoryKey),
  )

  return detailItems
    .filter((item) => item?.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED)
    .filter((item) => recalledByKey.has(comparableText(item?.memoryKey)))
    .filter((item) => {
      const memory = recalledByKey.get(comparableText(item?.memoryKey))
      const detailText = comparableText(formatDetailItem(item))
      const memoryText = comparableText(memory?.recallText || memory?.recallSummary)
      return detailText && !memoryText.includes(detailText) && !detailText.includes(memoryText)
    })
    .sort(compareDetailItems)
    .filter((item, index, items) =>
      items.findIndex(
        (candidate) => comparableText(candidate.memoryKey) === comparableText(item.memoryKey),
      ) === index,
    )
}

const buildEventText = (selected) =>
  selected.length > 0
    ? [
        'Event-attached continuity clues for the recalled memories. These are supporting context and cannot override confirmed role details:',
        selected.map(({ text }) => `- ${text}`).join('\n'),
      ].join('\n')
    : ''

export const buildRoleContinuityProjection = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const {
    roleDetailItems = [],
    recalledMemories = [],
    manualItemLimit = ROLE_CONTINUITY_LIMITS.manualItems,
    manualCharacterBudget = ROLE_CONTINUITY_LIMITS.manualCharacters,
    eventClueLimit = ROLE_CONTINUITY_LIMITS.eventClues,
    eventCharacterBudget = ROLE_CONTINUITY_LIMITS.eventCharacters,
  } = source
  const items = Array.isArray(roleDetailItems) ? roleDetailItems : []
  const memories = Array.isArray(recalledMemories) ? recalledMemories : []
  const manualCandidates = items
    .filter((item) => item?.sourceKind === ROLE_DETAIL_SOURCE_KINDS.MANUAL)
    .filter((item) => SECTION_ORDER.includes(item?.section))
    .slice()
    .sort(compareDetailItems)
  const manual = selectLinesWithinBudget(
    manualCandidates,
    clampInteger(manualItemLimit, ROLE_CONTINUITY_LIMITS.manualItems, 0, 30),
    clampInteger(
      manualCharacterBudget,
      ROLE_CONTINUITY_LIMITS.manualCharacters,
      0,
      4000,
    ),
    formatDetailItem,
    buildManualText,
  )

  const eventCandidates = buildEventClueCandidates(items, memories)
  const eventClues = selectLinesWithinBudget(
    eventCandidates,
    clampInteger(eventClueLimit, ROLE_CONTINUITY_LIMITS.eventClues, 0, 10),
    clampInteger(
      eventCharacterBudget,
      ROLE_CONTINUITY_LIMITS.eventCharacters,
      0,
      2000,
    ),
    formatDetailItem,
    buildEventText,
  )
  const eventText = buildEventText(eventClues.selected)

  return {
    stableText: buildManualText(manual.selected),
    dynamicText: eventText,
    selectedRefs: {
      manualDetailIds: manual.selected.map(({ item }) => normalizeText(item.id)).filter(Boolean),
      eventDetailIds: eventClues.selected.map(({ item }) => normalizeText(item.id)).filter(Boolean),
      memoryKeys: eventClues.selected.map(({ item }) => comparableText(item.memoryKey)).filter(Boolean),
    },
    omittedCounts: {
      manual: Math.max(0, manualCandidates.length - manual.selected.length),
      eventAttached: Math.max(0, eventCandidates.length - eventClues.selected.length),
    },
  }
}
