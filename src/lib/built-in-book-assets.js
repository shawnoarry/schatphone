import kpopMainWorldview from '../../docs/superpowers/content/2026-06-07-modern-seoul-kpop-main-worldview-draft.md?raw'
import kpopWorldRules from '../../docs/superpowers/content/2026-06-07-modern-seoul-kpop-world-rules-draft.md?raw'
import kpopIndustryMechanisms from '../../docs/superpowers/content/2026-06-09-modern-seoul-kpop-encyclopedia-entries-draft.md?raw'
import kpopChineseFandomTerms from '../../docs/superpowers/content/2026-06-12-modern-seoul-kpop-chinese-fandom-terminology-draft.md?raw'
import seoulYouthLifestyle from '../../docs/superpowers/content/2026-06-12-modern-seoul-youth-lifestyle-encyclopedia-draft.md?raw'
import kpopRealEntityCoordinate from '../../docs/superpowers/content/2026-06-12-modern-seoul-kpop-real-entity-coordinate-draft.md?raw'
import kpopRepresentativeMembers from '../../docs/superpowers/content/2026-06-12-modern-seoul-kpop-representative-member-coordinate-draft.md?raw'
import { normalizeBookTextAsset } from './book-text-schema'

export const BUILT_IN_BOOK_ASSET_IDS = Object.freeze({
  modernSeoulKpopMainWorldview: 'built_in_modern_seoul_kpop_main_worldview',
  modernSeoulKpopWorldRules: 'built_in_modern_seoul_kpop_world_rules',
  modernSeoulKpopEncyclopediaPlaceholder: 'built_in_modern_seoul_kpop_encyclopedia_placeholder',
  modernSeoulKpopIndustryMechanisms: 'built_in_modern_seoul_kpop_industry_mechanisms',
  modernSeoulKpopChineseFandomTerms: 'built_in_modern_seoul_kpop_chinese_fandom_terms',
  modernSeoulYouthLifestyle: 'built_in_modern_seoul_youth_lifestyle',
  modernSeoulKpopRealEntityCoordinate: 'built_in_modern_seoul_kpop_real_entity_coordinate',
  modernSeoulKpopRepresentativeMembers: 'built_in_modern_seoul_kpop_representative_members',
})

const BUILT_IN_UPDATED_AT = Date.parse('2026-06-12T00:00:00.000Z')

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const findMarkdownH2 = (text = '', heading = '') => {
  const label = typeof heading === 'string' ? heading.trim() : ''
  if (!label) return null
  const pattern = new RegExp(`(^|\\n)##\\s+(?:\\d+\\.\\s*)?${escapeRegExp(label)}\\s*$`, 'm')
  const match = pattern.exec(text)
  if (!match) return null
  const leadingLength = match[1] === '\n' ? 1 : 0
  return {
    start: match.index + leadingLength,
    end: match.index + match[0].length,
  }
}

const extractPublishedMarkdownBody = (markdown = '', { title = '', startHeading = '', endHeading = '' } = {}) => {
  const text = typeof markdown === 'string' ? markdown.replace(/\r\n?/g, '\n').trim() : ''
  const startMatch = findMarkdownH2(text, startHeading)
  const afterStart = startMatch
    ? text.slice(startMatch.end).replace(/^\n+/, '')
    : text
  const endMatch = findMarkdownH2(afterStart, endHeading)
  const body = (endMatch ? afterStart.slice(0, endMatch.start) : afterStart).trim()
  return [`# ${title}`, body].filter(Boolean).join('\n\n')
}

const createBuiltInBookAsset = (input, index = 0) =>
  normalizeBookTextAsset(
    {
      ...input,
      format: 'markdown',
      locked: true,
      favorite: true,
      status: 'draft',
      categoryId: 'built_in_worlds',
      source: {
        kind: 'built_in',
        sourceId: input.id,
        sourcePath: input.sourcePath,
      },
      createdAt: BUILT_IN_UPDATED_AT,
      updatedAt: BUILT_IN_UPDATED_AT + index,
      version: 1,
    },
    index,
  )

const cloneAsset = (asset) => ({
  ...asset,
  tags: Array.isArray(asset.tags) ? [...asset.tags] : [],
  sections: Array.isArray(asset.sections) ? asset.sections.map((section) => ({ ...section })) : [],
  source: asset.source && typeof asset.source === 'object' ? { ...asset.source } : {},
})

const createBuiltInEncyclopediaAsset = (
  { id, title, rawMarkdown, sourcePath, tags = [], endHeading = '后续校订点' },
  index,
) =>
  createBuiltInBookAsset(
    {
      id,
      title,
      category: 'encyclopedia',
      tags: ['内置', 'K-pop', '百科', ...tags],
      content: extractPublishedMarkdownBody(rawMarkdown, {
        title,
        startHeading: '条目定位',
        endHeading,
      }),
      sourcePath,
    },
    index,
  )

const BUILT_IN_BOOK_TEXT_ASSETS = Object.freeze([
  createBuiltInBookAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopMainWorldview,
      title: '现代首尔 K-pop 娱乐圈：主世界观',
      category: 'worldview',
      tags: ['内置', 'K-pop', '现代首尔', '娱乐圈', 'AU'],
      content: extractPublishedMarkdownBody(kpopMainWorldview, {
        title: '现代首尔 K-pop 娱乐圈：主世界观',
        startHeading: '正文',
        endHeading: '内部校订备注',
      }),
      sourcePath: 'docs/superpowers/content/2026-06-07-modern-seoul-kpop-main-worldview-draft.md',
    },
    0,
  ),
  createBuiltInBookAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopWorldRules,
      title: '现代首尔 K-pop 娱乐圈：世界规则',
      category: 'world_rule',
      tags: ['内置', 'K-pop', '世界规则', 'Chat', 'Calendar', 'Map'],
      content: extractPublishedMarkdownBody(kpopWorldRules, {
        title: '现代首尔 K-pop 娱乐圈：世界规则',
        startHeading: '规则定位',
        endHeading: '内部校订备注',
      }),
      sourcePath: 'docs/superpowers/content/2026-06-07-modern-seoul-kpop-world-rules-draft.md',
    },
    1,
  ),
  createBuiltInEncyclopediaAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopIndustryMechanisms,
      title: 'K-pop 行业机制',
      rawMarkdown: kpopIndustryMechanisms,
      sourcePath: 'docs/superpowers/content/2026-06-09-modern-seoul-kpop-encyclopedia-entries-draft.md',
      tags: ['行业机制', '经纪公司', '回归', '打歌', '舆情'],
      endHeading: '内部校订备注',
    },
    2,
  ),
  createBuiltInEncyclopediaAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopChineseFandomTerms,
      title: '中文饭圈术语',
      rawMarkdown: kpopChineseFandomTerms,
      sourcePath: 'docs/superpowers/content/2026-06-12-modern-seoul-kpop-chinese-fandom-terminology-draft.md',
      tags: ['中文饭圈', '术语', '论坛', '粉丝社区'],
    },
    3,
  ),
  createBuiltInEncyclopediaAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulYouthLifestyle,
      title: '首尔年轻人生活方式',
      rawMarkdown: seoulYouthLifestyle,
      sourcePath: 'docs/superpowers/content/2026-06-12-modern-seoul-youth-lifestyle-encyclopedia-draft.md',
      tags: ['首尔', '生活方式', '作息', '社交', '网络语言'],
    },
    4,
  ),
  createBuiltInEncyclopediaAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopRealEntityCoordinate,
      title: 'K-pop 公司、团体与节目',
      rawMarkdown: kpopRealEntityCoordinate,
      sourcePath: 'docs/superpowers/content/2026-06-12-modern-seoul-kpop-real-entity-coordinate-draft.md',
      tags: ['真实实体', '公司', '团体', '节目', '平台'],
    },
    5,
  ),
  createBuiltInEncyclopediaAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopRepresentativeMembers,
      title: 'K-pop 代表成员资料',
      rawMarkdown: kpopRepresentativeMembers,
      sourcePath: 'docs/superpowers/content/2026-06-12-modern-seoul-kpop-representative-member-coordinate-draft.md',
      tags: ['成员', '艺人', '代际', 'MBTI', '生日'],
    },
    6,
  ),
])

const LEGACY_BUILT_IN_BOOK_TEXT_ASSETS = Object.freeze([
  createBuiltInEncyclopediaAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopEncyclopediaPlaceholder,
      title: 'K-pop 行业机制',
      rawMarkdown: kpopIndustryMechanisms,
      sourcePath: 'docs/superpowers/content/2026-06-09-modern-seoul-kpop-encyclopedia-entries-draft.md',
      tags: ['行业机制', '经纪公司', '回归', '打歌', '旧占位兼容'],
      endHeading: '内部校订备注',
    },
    7,
  ),
])

export const listBuiltInBookTextAssets = () => BUILT_IN_BOOK_TEXT_ASSETS.map(cloneAsset)

export const findBuiltInBookTextAssetById = (assetId = '') => {
  const id = typeof assetId === 'string' ? assetId.trim() : ''
  if (!id) return null
  const asset =
    BUILT_IN_BOOK_TEXT_ASSETS.find((item) => item.id === id) ||
    LEGACY_BUILT_IN_BOOK_TEXT_ASSETS.find((item) => item.id === id)
  return asset ? cloneAsset(asset) : null
}

export const isBuiltInBookTextAssetId = (assetId = '') =>
  Boolean(findBuiltInBookTextAssetById(assetId))
