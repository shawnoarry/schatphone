import {
  BOOK_TEXT_CATEGORIES,
  LEGACY_BOOK_TEXT_CATEGORY_ALIASES,
  WORLDBOOK_SOURCE_ROLES,
  normalizeBookTextCategory,
  normalizeWorldBookSourceRole,
  pickCanonicalField,
} from './world-taxonomy'

export const BOOK_TEXT_ASSET_TYPES = BOOK_TEXT_CATEGORIES

export const BOOK_TEXT_FORMATS = Object.freeze(['plain', 'markdown', 'structured_json'])

export const BOOK_TEXT_STATUSES = Object.freeze(['draft', 'active_source', 'archived'])

export const BOOK_TEXT_EXPORT_FORMATS = Object.freeze([
  'worldbook_json',
  'markdown',
  'text',
])

const BOOK_TEXT_EXPORT_TYPE = 'schatphone.bookTextAsset'
const BOOK_TEXT_EXPORT_VERSION = 1
const PORTABLE_MARKDOWN_MARKER = 'schatphoneBookText'

export const WORLDBOOK_SOURCE_USAGES = WORLDBOOK_SOURCE_ROLES

export const WORLDBOOK_SOURCE_REVIEW_PREVIEW_CHAR_LIMIT = 12000
export const WORLDBOOK_SOURCE_SNAPSHOT_CHAR_LIMIT = WORLDBOOK_SOURCE_REVIEW_PREVIEW_CHAR_LIMIT
export const WORLDBOOK_SOURCE_DIFF_BLOCK_LIMIT = 120

const BOOK_TEXT_FORMAT_SET = new Set(BOOK_TEXT_FORMATS)
const BOOK_TEXT_STATUS_SET = new Set(BOOK_TEXT_STATUSES)

const toInt = (value, fallback = 0) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(0, Math.floor(numeric))
}

const normalizeText = (value, fallback = '', maxLength = 1000) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  if (!normalized) return fallback
  return normalized.slice(0, maxLength)
}

const normalizeInlineText = (value, fallback = '', maxLength = 180) =>
  normalizeText(value, fallback, maxLength).replace(/\s+/g, ' ')

const normalizeArrayOfText = (value, maxLength = 80) => {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const items = []
  value.forEach((item) => {
    const normalized = normalizeInlineText(item, '', maxLength)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    items.push(normalized)
  })
  return items
}

const normalizeStringId = (value, fallback = '') => {
  const normalized = normalizeInlineText(value, '', 120)
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || fallback
}

const createGeneratedId = (prefix, index = 0) => `${prefix}_${Date.now()}_${index}`

const slugifyTitle = (value, fallback = 'section') =>
  normalizeInlineText(value, fallback, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback

const makeUniqueId = (id, seenIds, fallbackPrefix, index = 0) => {
  const normalized = normalizeStringId(id, `${fallbackPrefix}_${index + 1}`)
  let candidate = normalized
  let suffix = 2
  while (seenIds.has(candidate)) {
    candidate = `${normalized}_${suffix}`
    suffix += 1
  }
  seenIds.add(candidate)
  return candidate
}

const normalizeFormat = (value, fallback = 'plain') => {
  const normalized = normalizeInlineText(value, '').toLowerCase()
  return BOOK_TEXT_FORMAT_SET.has(normalized) ? normalized : fallback
}

const normalizeStatus = (value) => {
  const normalized = normalizeInlineText(value, '').toLowerCase()
  return BOOK_TEXT_STATUS_SET.has(normalized) ? normalized : 'draft'
}

const hasOwn = (source, key) => Object.prototype.hasOwnProperty.call(source, key)

const normalizeBookTextCategoryId = (source = {}) => {
  const explicitCategoryId = normalizeStringId(source.categoryId, '')
  if (explicitCategoryId) return explicitCategoryId

  const rawCategory = typeof source.category === 'string' ? source.category.trim() : ''
  if (!rawCategory) return ''

  const normalizedCategory = rawCategory.toLowerCase()
  const isClassifier =
    BOOK_TEXT_CATEGORIES.includes(normalizedCategory) ||
    hasOwn(LEGACY_BOOK_TEXT_CATEGORY_ALIASES, normalizedCategory)

  return isClassifier ? '' : normalizeStringId(rawCategory, '')
}

const readExtension = (fileName = '') => {
  const normalized = typeof fileName === 'string' ? fileName.trim().toLowerCase() : ''
  if (!normalized) return ''
  if (normalized.endsWith('.worldbook.json')) return 'worldbook.json'
  const dotIndex = normalized.lastIndexOf('.')
  if (dotIndex < 0) return ''
  return normalized.slice(dotIndex + 1)
}

const readTitleFromFileName = (fileName = '') => {
  const normalized = typeof fileName === 'string' ? fileName.trim() : ''
  if (!normalized) return ''
  const leaf = normalized.split(/[\\/]/).pop() || normalized
  if (leaf.toLowerCase().endsWith('.worldbook.json')) {
    return leaf.slice(0, -'.worldbook.json'.length)
  }
  const dotIndex = leaf.lastIndexOf('.')
  return dotIndex > 0 ? leaf.slice(0, dotIndex) : leaf
}

const normalizeSnapshotPreviewText = (value = '') => {
  const text = typeof value === 'string' ? value : ''
  return text.slice(0, WORLDBOOK_SOURCE_REVIEW_PREVIEW_CHAR_LIMIT)
}

const splitMarkdownFrontMatter = (content = '') => {
  const text = typeof content === 'string' ? content : ''
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return { attributes: {}, body: text }

  const rawAttributes = {}
  match[1].split(/\r?\n/).forEach((line) => {
    const colonIndex = line.indexOf(':')
    if (colonIndex <= 0) return
    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim()
    if (key && value) rawAttributes[key] = value
  })

  if (rawAttributes[PORTABLE_MARKDOWN_MARKER] !== String(BOOK_TEXT_EXPORT_VERSION)) {
    return { attributes: {}, body: text }
  }

  const readJsonAttribute = (key, fallback) => {
    if (!hasOwn(rawAttributes, key)) return fallback
    try {
      return JSON.parse(rawAttributes[key])
    } catch {
      return fallback
    }
  }

  return {
    attributes: {
      title: readJsonAttribute('title', ''),
      category: readJsonAttribute('category', ''),
      categoryId: readJsonAttribute('categoryId', ''),
      tags: readJsonAttribute('tags', []),
    },
    body: text.slice(match[0].length),
  }
}

const normalizePortableFileStem = (value = '') => {
  const visibleTitle = [...normalizeInlineText(value, 'book-source', 120)]
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
  const stem = visibleTitle
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
  return stem || 'book-source'
}

const buildPortableMarkdown = (asset = {}) => {
  const normalized = normalizeBookTextAsset(asset)
  const lines = [
    '---',
    `${PORTABLE_MARKDOWN_MARKER}: ${BOOK_TEXT_EXPORT_VERSION}`,
    `title: ${JSON.stringify(normalized.title)}`,
    `category: ${JSON.stringify(normalized.category)}`,
    `categoryId: ${JSON.stringify(normalized.categoryId)}`,
    `tags: ${JSON.stringify(normalized.tags)}`,
    '---',
  ]
  return `${lines.join('\n')}\n${normalized.content}`
}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const validateWorldBookExportEnvelope = (parsed) => {
  if (
    !isPlainObject(parsed) ||
    parsed.type !== BOOK_TEXT_EXPORT_TYPE ||
    !hasOwn(parsed, 'version') ||
    !hasOwn(parsed, 'asset')
  ) {
    return {
      ok: false,
      reason: 'invalid_worldbook_envelope',
      message: 'The selected .worldbook.json file is not a SchatPhone Book export.',
    }
  }

  if (parsed.version !== BOOK_TEXT_EXPORT_VERSION) {
    return {
      ok: false,
      reason: 'unsupported_worldbook_version',
      message: `This .worldbook.json version is not supported (expected ${BOOK_TEXT_EXPORT_VERSION}).`,
    }
  }

  const asset = parsed.asset
  const hasRequiredAssetShape =
    isPlainObject(asset) &&
    typeof asset.id === 'string' && asset.id.trim().length > 0 &&
    typeof asset.title === 'string' && asset.title.trim().length > 0 &&
    BOOK_TEXT_CATEGORIES.includes(asset.category) &&
    BOOK_TEXT_FORMATS.includes(asset.format) &&
    typeof asset.content === 'string'

  if (!hasRequiredAssetShape) {
    return {
      ok: false,
      reason: 'invalid_worldbook_asset',
      message: 'The selected .worldbook.json file does not contain a valid Book asset.',
    }
  }

  return { ok: true, asset }
}

export const computeBookContentFingerprint = (value = '') => {
  const text = typeof value === 'string' ? value : ''
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return `fp_${hash.toString(36)}_${text.length}`
}

export const normalizeBookSection = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const title = normalizeInlineText(raw.title || raw.heading, `Section ${index + 1}`, 160)
  const content = typeof raw.content === 'string' ? raw.content : ''
  const level = Math.max(1, Math.min(6, toInt(raw.level, 2) || 2))

  return {
    id: normalizeStringId(raw.id, `section_${slugifyTitle(title)}_${index + 1}`),
    title,
    level,
    content,
    tags: normalizeArrayOfText(raw.tags, 80),
    order: toInt(raw.order, index),
    charCount: content.length,
  }
}

export const extractMarkdownSections = (content = '') => {
  const text = typeof content === 'string' ? content : ''
  if (!text.trim()) return []

  const lines = text.split(/\r?\n/)
  const rawSections = []
  let current = null
  const introLines = []

  const flushCurrent = () => {
    if (!current) return
    rawSections.push({
      ...current,
      content: current.lines.join('\n').trim(),
    })
    current = null
  }

  lines.forEach((line) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (headingMatch) {
      if (!current && introLines.join('\n').trim()) {
        rawSections.push({
          title: 'Intro',
          level: 1,
          content: introLines.join('\n').trim(),
        })
      }
      flushCurrent()
      current = {
        title: headingMatch[2].trim(),
        level: headingMatch[1].length,
        lines: [],
      }
      return
    }

    if (current) current.lines.push(line)
    else introLines.push(line)
  })

  flushCurrent()
  if (rawSections.length === 0 && introLines.join('\n').trim()) {
    rawSections.push({
      title: 'Intro',
      level: 1,
      content: introLines.join('\n').trim(),
    })
  }

  const seenIds = new Set()
  return rawSections
    .map((section, index) => normalizeBookSection({ ...section, order: index }, index))
    .filter(Boolean)
    .map((section, index) => ({
      ...section,
      id: makeUniqueId(section.id, seenIds, 'section', index),
      order: index,
    }))
}

export const normalizeBookTextAsset = (raw, index = 0) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const now = Date.now()
  const title = normalizeInlineText(
    source.title || source.name,
    `Untitled text ${index + 1}`,
    160,
  )
  const format = normalizeFormat(source.format, 'plain')
  const content = typeof source.content === 'string' ? source.content : ''
  const createdAt = toInt(source.createdAt, now)
  const updatedAt = toInt(source.updatedAt, createdAt)
  const category = pickCanonicalField(
    source,
    ['category', 'assetType', 'type'],
    normalizeBookTextCategory,
  )

  const providedSections = Array.isArray(source.sections)
    ? source.sections.map((section, sectionIndex) => normalizeBookSection(section, sectionIndex)).filter(Boolean)
    : []
  const sections = providedSections.length > 0
    ? providedSections
    : format === 'markdown'
      ? extractMarkdownSections(content)
      : []
  const seenSectionIds = new Set()

  return {
    id: normalizeStringId(source.id, createGeneratedId('book_asset', index)),
    title,
    category,
    assetType: category,
    format,
    categoryId: normalizeBookTextCategoryId(source),
    tags: normalizeArrayOfText(source.tags, 80),
    content,
    sections: sections.map((section, sectionIndex) => ({
      ...section,
      id: makeUniqueId(section.id, seenSectionIds, 'section', sectionIndex),
      order: sectionIndex,
      charCount: typeof section.content === 'string' ? section.content.length : 0,
    })),
    status: normalizeStatus(source.status),
    locked: source.locked === true,
    favorite: source.favorite === true,
    source: source.source && typeof source.source === 'object' ? { ...source.source } : {},
    version: Math.max(1, toInt(source.version, 1)),
    createdAt,
    updatedAt,
    contentFingerprint: normalizeInlineText(
      source.contentFingerprint,
      computeBookContentFingerprint(content),
      80,
    ),
  }
}

export const normalizeBookTextAssets = (rawAssets) => {
  if (!Array.isArray(rawAssets)) return []
  const seenIds = new Set()
  return rawAssets
    .map((item, index) => normalizeBookTextAsset(item, index))
    .filter(Boolean)
    .map((asset, index) => ({
      ...asset,
      id: makeUniqueId(asset.id, seenIds, 'book_asset', index),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export const resolveWorldBookSourceText = (asset, sectionIds = []) => {
  if (!asset || typeof asset !== 'object') return ''
  const selectedSectionIds = Array.isArray(sectionIds)
    ? sectionIds.map((id) => normalizeStringId(id, '')).filter(Boolean)
    : []

  if (selectedSectionIds.length > 0) {
    const sections = Array.isArray(asset.sections) ? asset.sections : []
    return sections
      .filter((section) => selectedSectionIds.includes(normalizeStringId(section.id, '')))
      .map((section) => (typeof section.content === 'string' && section.content.trim()
        ? section.content
        : section.title || ''))
      .filter(Boolean)
      .join('\n\n')
  }

  return typeof asset.content === 'string' ? asset.content : ''
}

export const buildWorldBookSourceSnapshot = (text = '', now = Date.now()) => {
  const sourceText = typeof text === 'string' ? text : ''
  return {
    sourceSnapshotText: normalizeSnapshotPreviewText(sourceText),
    sourceSnapshotFingerprint: computeBookContentFingerprint(sourceText),
    sourceSnapshotUpdatedAt: toInt(now, Date.now()),
    sourceSnapshotCharCount: sourceText.length,
  }
}

const splitDiffBlocks = (text = '') => {
  const normalized = typeof text === 'string' ? text.replace(/\r\n?/g, '\n').trim() : ''
  if (!normalized) return []
  const paragraphBlocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  const blocks =
    paragraphBlocks.length > 1
      ? paragraphBlocks
      : normalized
          .split('\n')
          .map((block) => block.trim())
          .filter(Boolean)
  return blocks.slice(0, WORLDBOOK_SOURCE_DIFF_BLOCK_LIMIT)
}

const countDiffBlocks = (text = '') => {
  const normalized = typeof text === 'string' ? text.replace(/\r\n?/g, '\n').trim() : ''
  if (!normalized) return 0
  const paragraphBlocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  if (paragraphBlocks.length > 1) return paragraphBlocks.length
  return normalized
    .split('\n')
    .map((block) => block.trim())
    .filter(Boolean).length
}

export const diffWorldBookSourceText = (previousText = '', nextText = '') => {
  const previousBlocks = splitDiffBlocks(previousText)
  const nextBlocks = splitDiffBlocks(nextText)
  const rows = Array.from({ length: previousBlocks.length + 1 }, () =>
    Array(nextBlocks.length + 1).fill(0),
  )

  for (let previousIndex = previousBlocks.length - 1; previousIndex >= 0; previousIndex -= 1) {
    for (let nextIndex = nextBlocks.length - 1; nextIndex >= 0; nextIndex -= 1) {
      rows[previousIndex][nextIndex] =
        previousBlocks[previousIndex] === nextBlocks[nextIndex]
          ? rows[previousIndex + 1][nextIndex + 1] + 1
          : Math.max(rows[previousIndex + 1][nextIndex], rows[previousIndex][nextIndex + 1])
    }
  }

  const entries = []
  let previousIndex = 0
  let nextIndex = 0
  while (previousIndex < previousBlocks.length && nextIndex < nextBlocks.length) {
    if (previousBlocks[previousIndex] === nextBlocks[nextIndex]) {
      entries.push({ type: 'unchanged', text: previousBlocks[previousIndex] })
      previousIndex += 1
      nextIndex += 1
    } else if (rows[previousIndex + 1][nextIndex] >= rows[previousIndex][nextIndex + 1]) {
      entries.push({ type: 'removed', text: previousBlocks[previousIndex] })
      previousIndex += 1
    } else {
      entries.push({ type: 'added', text: nextBlocks[nextIndex] })
      nextIndex += 1
    }
  }

  while (previousIndex < previousBlocks.length) {
    entries.push({ type: 'removed', text: previousBlocks[previousIndex] })
    previousIndex += 1
  }
  while (nextIndex < nextBlocks.length) {
    entries.push({ type: 'added', text: nextBlocks[nextIndex] })
    nextIndex += 1
  }

  const addedCount = entries.filter((entry) => entry.type === 'added').length
  const removedCount = entries.filter((entry) => entry.type === 'removed').length
  const unchangedCount = entries.filter((entry) => entry.type === 'unchanged').length

  return {
    entries,
    addedCount,
    removedCount,
    unchangedCount,
    hasPreviousSnapshot: previousBlocks.length > 0,
    hasChanges: addedCount > 0 || removedCount > 0,
    previousBlockCount: previousBlocks.length,
    nextBlockCount: nextBlocks.length,
    truncated:
      countDiffBlocks(previousText) > WORLDBOOK_SOURCE_DIFF_BLOCK_LIMIT ||
      countDiffBlocks(nextText) > WORLDBOOK_SOURCE_DIFF_BLOCK_LIMIT,
  }
}

export const normalizeWorldBookSourceLink = (raw, index = 0) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const assetId = normalizeStringId(source.assetId || source.bookAssetId, '')
  const sectionIds = normalizeArrayOfText(source.sectionIds || source.sections || [], 120)
    .map((item) => normalizeStringId(item, ''))
    .filter(Boolean)
  const createdAt = toInt(source.createdAt, Date.now())
  const rawSnapshotText = typeof source.sourceSnapshotText === 'string' ? source.sourceSnapshotText : ''
  const sourceSnapshotText = normalizeSnapshotPreviewText(rawSnapshotText)
  const role = pickCanonicalField(
    source,
    ['role', 'usage'],
    normalizeWorldBookSourceRole,
  )

  return {
    id: normalizeStringId(source.id, createGeneratedId('world_source', index)),
    assetId,
    sectionIds,
    role,
    usage: role,
    enabled: source.enabled !== false,
    priority: Math.max(0, Math.min(9999, toInt(source.priority, 100))),
    budgetHint: normalizeInlineText(source.budgetHint, 'primary', 40),
    titleOverride: normalizeInlineText(source.titleOverride, '', 160),
    lastResolvedAt: toInt(source.lastResolvedAt, 0),
    sourceVersion: toInt(source.sourceVersion, 0),
    sourceFingerprint: normalizeInlineText(source.sourceFingerprint, '', 80),
    sourceSnapshotText,
    sourceSnapshotFingerprint: normalizeInlineText(source.sourceSnapshotFingerprint, '', 80),
    sourceSnapshotUpdatedAt: toInt(source.sourceSnapshotUpdatedAt, 0),
    sourceSnapshotCharCount: toInt(source.sourceSnapshotCharCount, rawSnapshotText.length),
    warning: normalizeInlineText(source.warning, '', 240),
    createdAt,
    updatedAt: toInt(source.updatedAt, createdAt),
  }
}

export const normalizeWorldBookSourceLinks = (rawLinks) => {
  if (!Array.isArray(rawLinks)) return []
  const seenIds = new Set()
  return rawLinks
    .map((item, index) => normalizeWorldBookSourceLink(item, index))
    .filter((item) => item.assetId)
    .map((link, index) => ({
      ...link,
      id: makeUniqueId(link.id, seenIds, 'world_source', index),
    }))
    .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt)
}

export const buildBookAssetFromImportedText = ({ fileName, content, mimeType } = {}) => {
  const extension = readExtension(fileName)
  const rawContent = typeof content === 'string' ? content : ''
  const title = normalizeInlineText(readTitleFromFileName(fileName), 'Imported text', 160)
  const importedAt = Date.now()

  if (extension === 'md' || extension === 'markdown') {
    const { attributes: frontMatter, body } = splitMarkdownFrontMatter(rawContent)
    return {
      ok: true,
      asset: normalizeBookTextAsset({
        title: frontMatter.title || title,
        category: frontMatter.category || 'worldview',
        format: 'markdown',
        categoryId: frontMatter.categoryId || '',
        tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
        content: body,
        status: 'draft',
        source: {
          kind: 'imported_file',
          fileName: normalizeInlineText(fileName, title, 200),
          mimeType: normalizeInlineText(mimeType, '', 120),
          importedAt,
        },
        createdAt: importedAt,
        updatedAt: importedAt,
      }),
    }
  }

  if (extension === 'txt' || extension === 'text') {
    return {
      ok: true,
      asset: normalizeBookTextAsset({
        title,
        category: 'worldview',
        format: 'plain',
        content: rawContent,
        status: 'draft',
        source: {
          kind: 'imported_file',
          fileName: normalizeInlineText(fileName, title, 200),
          mimeType: normalizeInlineText(mimeType, '', 120),
          importedAt,
        },
        createdAt: importedAt,
        updatedAt: importedAt,
      }),
    }
  }

  if (extension === 'worldbook.json') {
    try {
      const parsed = JSON.parse(rawContent)
      const validation = validateWorldBookExportEnvelope(parsed)
      if (!validation.ok) return validation
      const assetSource = validation.asset
      return {
        ok: true,
        asset: normalizeBookTextAsset({
          ...assetSource,
          title: assetSource.title || title,
          format: normalizeFormat(assetSource.format, 'structured_json'),
          source: {
            ...(assetSource.source && typeof assetSource.source === 'object' ? assetSource.source : {}),
            kind: 'imported_file',
            fileName: normalizeInlineText(fileName, title, 200),
            mimeType: normalizeInlineText(mimeType, '', 120),
            importedAt,
          },
          createdAt: assetSource.createdAt || importedAt,
          updatedAt: assetSource.updatedAt || importedAt,
        }),
      }
    } catch {
      return {
        ok: false,
        reason: 'malformed_json',
        message: 'The selected JSON file could not be parsed.',
      }
    }
  }

  if (extension === 'json') {
    try {
      const parsed = JSON.parse(rawContent)
      const assetSource = isPlainObject(parsed?.asset) ? parsed.asset : parsed
      return {
        ok: true,
        asset: normalizeBookTextAsset({
          ...assetSource,
          title: assetSource?.title || title,
          format: normalizeFormat(assetSource?.format, 'structured_json'),
          source: {
            ...(isPlainObject(assetSource?.source) ? assetSource.source : {}),
            kind: 'imported_file',
            fileName: normalizeInlineText(fileName, title, 200),
            mimeType: normalizeInlineText(mimeType, '', 120),
            importedAt,
          },
          createdAt: assetSource?.createdAt || importedAt,
          updatedAt: assetSource?.updatedAt || importedAt,
        }),
      }
    } catch {
      return {
        ok: false,
        reason: 'malformed_json',
        message: 'The selected JSON file could not be parsed.',
      }
    }
  }

  return {
    ok: false,
    reason: 'unsupported_extension',
    message: 'Book can import .txt, .md, .json, and .worldbook.json files.',
  }
}

export const buildBookAssetExportPayload = (asset) => ({
  type: BOOK_TEXT_EXPORT_TYPE,
  version: BOOK_TEXT_EXPORT_VERSION,
  exportedAt: Date.now(),
  asset: normalizeBookTextAsset(asset),
})

export const buildBookAssetPortableExport = (asset, format = 'worldbook_json') => {
  if (!BOOK_TEXT_EXPORT_FORMATS.includes(format)) return null
  const normalized = normalizeBookTextAsset(asset)
  const stem = normalizePortableFileStem(normalized.title)

  if (format === 'markdown') {
    return {
      format,
      fileName: `${stem}.md`,
      mimeType: 'text/markdown;charset=utf-8',
      content: buildPortableMarkdown(normalized),
    }
  }

  if (format === 'text') {
    return {
      format,
      fileName: `${stem}.txt`,
      mimeType: 'text/plain;charset=utf-8',
      content: normalized.content,
    }
  }

  return {
    format,
    fileName: `${stem}.worldbook.json`,
    mimeType: 'application/json;charset=utf-8',
    content: JSON.stringify(buildBookAssetExportPayload(normalized), null, 2),
  }
}
