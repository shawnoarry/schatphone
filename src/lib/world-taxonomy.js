export const BOOK_TEXT_CATEGORIES = Object.freeze([
  'worldview',
  'encyclopedia',
  'world_rule',
])

export const WORLDBOOK_SOURCE_ROLES = Object.freeze([
  'main_worldview',
  'encyclopedia',
  'world_rule',
])

export const LEGACY_BOOK_TEXT_CATEGORY_ALIASES = Object.freeze({
  worldbook_document: 'worldview',
  knowledge_note: 'encyclopedia',
  glossary: 'encyclopedia',
  rule_set: 'world_rule',
  profile_template: 'encyclopedia',
  profile_template_note: 'encyclopedia',
  reference_material: 'encyclopedia',
  reference_note: 'encyclopedia',
})

export const LEGACY_WORLDBOOK_SOURCE_ROLE_ALIASES = Object.freeze({
  base_worldview: 'main_worldview',
  knowledge_source: 'encyclopedia',
  pack_source: 'encyclopedia',
  world_pack_reference: 'encyclopedia',
  profile_template: 'encyclopedia',
  profile_template_reference: 'encyclopedia',
  reference_material: 'encyclopedia',
})

export const BOOK_TEXT_CATEGORY_LABELS = Object.freeze({
  worldview: { zh: '世界观', en: 'Worldview' },
  encyclopedia: { zh: '百科', en: 'Encyclopedia' },
  world_rule: { zh: '世界规则', en: 'World rules' },
})

export const WORLDBOOK_SOURCE_ROLE_LABELS = Object.freeze({
  main_worldview: { zh: '主世界观', en: 'Main worldview' },
  encyclopedia: { zh: '百科', en: 'Encyclopedia' },
  world_rule: { zh: '世界规则', en: 'World rules' },
})

const normalizeToken = (value = '') =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const normalizeWithAliases = ({ value, canonicalValues, aliases, fallback } = {}) => {
  const normalized = normalizeToken(value)
  if (!normalized) return fallback
  if (canonicalValues.includes(normalized)) return normalized
  return aliases[normalized] || fallback
}

export const normalizeBookTextCategory = (value = '') =>
  normalizeWithAliases({
    value,
    canonicalValues: BOOK_TEXT_CATEGORIES,
    aliases: LEGACY_BOOK_TEXT_CATEGORY_ALIASES,
    fallback: 'encyclopedia',
  })

export const normalizeWorldBookSourceRole = (value = '') =>
  normalizeWithAliases({
    value,
    canonicalValues: WORLDBOOK_SOURCE_ROLES,
    aliases: LEGACY_WORLDBOOK_SOURCE_ROLE_ALIASES,
    fallback: 'encyclopedia',
  })

export const getBookTextCategoryLabel = (category = '') =>
  BOOK_TEXT_CATEGORY_LABELS[normalizeBookTextCategory(category)] ||
  BOOK_TEXT_CATEGORY_LABELS.encyclopedia

export const getWorldBookSourceRoleLabel = (role = '') =>
  WORLDBOOK_SOURCE_ROLE_LABELS[normalizeWorldBookSourceRole(role)] ||
  WORLDBOOK_SOURCE_ROLE_LABELS.encyclopedia

export const pickCanonicalField = (
  source = {},
  fieldNames = [],
  normalizeValue = (value) => value,
) => {
  const input = source && typeof source === 'object' ? source : {}
  for (const fieldName of fieldNames) {
    if (typeof fieldName !== 'string') continue
    const rawValue = input[fieldName]
    if (typeof rawValue !== 'string' || !rawValue.trim()) continue
    return normalizeValue(rawValue)
  }
  return normalizeValue('')
}
