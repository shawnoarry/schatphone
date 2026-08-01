import { getMapPlaceCategoryVisual } from './map-place-categories'

const DEFAULT_RESULT_LIMIT = 6
const LATIN_TOKEN_PATTERN = /^[a-z0-9]+$/

const FIELD_WEIGHTS = Object.freeze({
  name: 500,
  alias: 400,
  detail: 240,
  category: 180,
  keyword: 160,
})

export const normalizeMapPlaceSearchText = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const compactSearchText = (value) => normalizeMapPlaceSearchText(value).replace(/\s+/g, '')

const uniqueSearchValues = (values) => {
  const seen = new Set()
  return values
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim())
    .filter((value) => {
      const normalized = normalizeMapPlaceSearchText(value)
      if (!normalized || seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
}

// New places automatically inherit name, address, and category search. Use aliases for real
// alternate names and searchTerms only for non-display discovery words.
const buildPlaceSearchFields = (place = {}) => {
  const category = getMapPlaceCategoryVisual(place.category)
  const fieldGroups = [
    {
      kind: 'name',
      values: [place.nameZh, place.nameEn, place.label],
    },
    {
      kind: 'alias',
      values: Array.isArray(place.aliases) ? place.aliases : [],
    },
    {
      kind: 'detail',
      values: [place.detailZh, place.detailEn, place.detail],
    },
    {
      kind: 'category',
      values: [
        category.id,
        category.labelZh,
        category.labelEn,
        category.descriptionZh,
        category.descriptionEn,
        ...(Array.isArray(category.searchTerms) ? category.searchTerms : []),
      ],
    },
    {
      kind: 'keyword',
      values: Array.isArray(place.searchTerms) ? place.searchTerms : [],
    },
  ]

  return fieldGroups.flatMap(({ kind, values }) =>
    uniqueSearchValues(values).map((value) => ({
      kind,
      value,
      normalized: normalizeMapPlaceSearchText(value),
      compact: compactSearchText(value),
    })),
  )
}

const boundedEditDistance = (left, right, limit) => {
  if (Math.abs(left.length - right.length) > limit) return limit + 1
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    let rowMinimum = current[0]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      const value = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      )
      current.push(value)
      rowMinimum = Math.min(rowMinimum, value)
    }
    if (rowMinimum > limit) return limit + 1
    previous = current
  }

  return previous[right.length]
}

const fuzzyMatchQuality = (token, field) => {
  if (!LATIN_TOKEN_PATTERN.test(token) || token.length < 4) return 0
  const distanceLimit = token.length >= 8 ? 2 : 1
  const words = field.normalized.split(' ').filter((word) => LATIN_TOKEN_PATTERN.test(word))
  return words.some((word) => boundedEditDistance(token, word, distanceLimit) <= distanceLimit)
    ? 15
    : 0
}

const scoreTokenAgainstField = (token, field) => {
  const compactToken = token.replace(/\s+/g, '')
  const weight = FIELD_WEIGHTS[field.kind] || 0
  if (!compactToken || !weight) return null
  if (field.normalized === token || field.compact === compactToken) {
    return { score: weight + 140, quality: 'exact' }
  }
  if (field.normalized.split(' ').some((word) => word.startsWith(token))) {
    return { score: weight + 100, quality: 'prefix' }
  }
  if (field.compact.includes(compactToken)) {
    return { score: weight + 70, quality: 'contains' }
  }
  const fuzzyQuality = fuzzyMatchQuality(token, field)
  return fuzzyQuality ? { score: weight + fuzzyQuality, quality: 'fuzzy' } : null
}

const scorePlace = (place, normalizedQuery) => {
  const tokens = normalizedQuery.split(' ').filter(Boolean)
  const fields = buildPlaceSearchFields(place)
  if (tokens.length === 0 || fields.length === 0) return null

  const tokenMatches = tokens.map((token) => {
    const candidates = fields
      .map((field) => {
        const scored = scoreTokenAgainstField(token, field)
        return scored ? { field, ...scored } : null
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score)
    return candidates[0] || null
  })
  if (tokenMatches.some((match) => !match)) return null

  const phraseCompact = normalizedQuery.replace(/\s+/g, '')
  const phraseBonus = fields.some((field) => field.compact.includes(phraseCompact)) ? 180 : 0
  const strongestMatch = [...tokenMatches].sort((left, right) => right.score - left.score)[0]
  return {
    score: tokenMatches.reduce((total, match) => total + match.score, phraseBonus),
    match: {
      kind: strongestMatch.field.kind,
      value: strongestMatch.field.value,
      quality: strongestMatch.quality,
    },
  }
}

const filterPlacesByCategory = (places, categoryId) => {
  const normalizedCategory = typeof categoryId === 'string' ? categoryId.trim().toLowerCase() : ''
  if (!normalizedCategory || normalizedCategory === 'all') return places
  return places.filter((place) => place.category === normalizedCategory)
}

export const searchMapPlaces = (
  places,
  query,
  { categoryId = 'all', limit = DEFAULT_RESULT_LIMIT } = {},
) => {
  const normalizedQuery = normalizeMapPlaceSearchText(query)
  if (!normalizedQuery) return []

  return filterPlacesByCategory(Array.isArray(places) ? places : [], categoryId)
    .map((place, index) => {
      const scored = scorePlace(place, normalizedQuery)
      return scored ? { place, index, ...scored } : null
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, Math.max(1, Number(limit) || DEFAULT_RESULT_LIMIT))
    .map(({ place, score, match }) => ({ place, score, match }))
}

const placeMatchesExactText = (place, value) => {
  const normalized = normalizeMapPlaceSearchText(value)
  const compact = compactSearchText(value)
  if (!normalized) return false
  return buildPlaceSearchFields(place).some(
    (field) => field.normalized === normalized || field.compact === compact,
  )
}

export const suggestMapPlaces = (
  places,
  { recentDestinationTexts = [], categoryId = 'all', limit = DEFAULT_RESULT_LIMIT } = {},
) => {
  const available = filterPlacesByCategory(Array.isArray(places) ? places : [], categoryId)
  const suggestions = []
  const seenIds = new Set()
  const addPlace = (place) => {
    if (!place) return
    const identity = place.placeId || place.id
    if (!identity || seenIds.has(identity)) return
    seenIds.add(identity)
    suggestions.push({ place, match: null })
  }

  recentDestinationTexts.forEach((text) => {
    addPlace(available.find((place) => placeMatchesExactText(place, text)))
  })
  available.filter((place) => place.source === 'user').forEach(addPlace)

  const seenCategories = new Set()
  available.forEach((place) => {
    if (seenCategories.has(place.category)) return
    seenCategories.add(place.category)
    addPlace(place)
  })
  available.forEach(addPlace)

  return suggestions.slice(0, Math.max(1, Number(limit) || DEFAULT_RESULT_LIMIT))
}
