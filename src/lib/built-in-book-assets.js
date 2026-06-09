import kpopMainWorldview from '../../docs/superpowers/content/2026-06-07-modern-seoul-kpop-main-worldview-draft.md?raw'
import kpopWorldRules from '../../docs/superpowers/content/2026-06-07-modern-seoul-kpop-world-rules-draft.md?raw'
import { normalizeBookTextAsset } from './book-text-schema'

export const BUILT_IN_BOOK_ASSET_IDS = Object.freeze({
  modernSeoulKpopMainWorldview: 'built_in_modern_seoul_kpop_main_worldview',
  modernSeoulKpopWorldRules: 'built_in_modern_seoul_kpop_world_rules',
  modernSeoulKpopEncyclopediaPlaceholder: 'built_in_modern_seoul_kpop_encyclopedia_placeholder',
})

const BUILT_IN_UPDATED_AT = Date.parse('2026-06-07T00:00:00.000Z')

const extractPublishedMarkdownBody = (markdown = '', { title = '', startHeading = '', endHeading = '' } = {}) => {
  const text = typeof markdown === 'string' ? markdown.replace(/\r\n?/g, '\n').trim() : ''
  const startToken = startHeading ? `\n## ${startHeading}` : ''
  const startIndex = startToken ? text.indexOf(startToken) : -1
  const afterStart =
    startIndex >= 0
      ? text.slice(startIndex + startToken.length).replace(/^\n+/, '')
      : text
  const endToken = endHeading ? `\n## ${endHeading}` : ''
  const endIndex = endToken ? afterStart.indexOf(endToken) : -1
  const body = (endIndex >= 0 ? afterStart.slice(0, endIndex) : afterStart).trim()
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

const createPlaceholderMarkdown = (title, sections = []) =>
  [
    `# ${title}`,
    '这是一份用于调试 Book 与世界书交互的内置占位文稿。它会像真实文稿一样出现在文本库、书目卡片、段落选择和启用流程里。',
    ...sections.flatMap((section) => [`## ${section.title}`, section.content]),
  ]
    .filter(Boolean)
    .join('\n\n')

const BUILT_IN_BOOK_TEXT_ASSETS = Object.freeze([
  createBuiltInBookAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopMainWorldview,
      title: '现代首尔 K-pop 娱乐圈：主世界观',
      category: 'worldview',
      tags: ['内置', 'K-pop', '现代首尔', '娱乐圈', 'AU'],
      content: extractPublishedMarkdownBody(kpopMainWorldview, {
        title: '现代首尔 K-pop 娱乐圈：主世界观',
        startHeading: '正文草稿',
        endHeading: '草稿自查',
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
        endHeading: '草稿自查',
      }),
      sourcePath: 'docs/superpowers/content/2026-06-07-modern-seoul-kpop-world-rules-draft.md',
    },
    1,
  ),
  createBuiltInBookAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopEncyclopediaPlaceholder,
      title: '现代首尔 K-pop 娱乐圈：百科条目占位',
      category: 'encyclopedia',
      tags: ['内置', 'K-pop', '百科', '占位文稿'],
      content: createPlaceholderMarkdown('现代首尔 K-pop 娱乐圈：百科条目占位', [
        {
          title: '机构与场所',
          content: '占位：练习室、音乐节目、经纪公司、粉丝站和公演场馆会在这里形成可检索的背景条目。',
        },
        {
          title: '术语索引',
          content: '占位：回归、打歌、直拍、签售、应援、热帖、私生边界等术语会在这里保持一致解释。',
        },
      ]),
      sourcePath: 'built-in/placeholders/modern-seoul-kpop-encyclopedia.md',
    },
    2,
  ),
])

export const listBuiltInBookTextAssets = () => BUILT_IN_BOOK_TEXT_ASSETS.map(cloneAsset)

export const findBuiltInBookTextAssetById = (assetId = '') => {
  const id = typeof assetId === 'string' ? assetId.trim() : ''
  if (!id) return null
  const asset = BUILT_IN_BOOK_TEXT_ASSETS.find((item) => item.id === id)
  return asset ? cloneAsset(asset) : null
}

export const isBuiltInBookTextAssetId = (assetId = '') =>
  Boolean(findBuiltInBookTextAssetById(assetId))
