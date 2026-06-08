import kpopMainWorldview from '../../docs/superpowers/content/2026-06-07-modern-seoul-kpop-main-worldview-draft.md?raw'
import kpopWorldRules from '../../docs/superpowers/content/2026-06-07-modern-seoul-kpop-world-rules-draft.md?raw'
import { normalizeBookTextAsset } from './book-text-schema'

export const BUILT_IN_BOOK_ASSET_IDS = Object.freeze({
  modernSeoulKpopMainWorldview: 'built_in_modern_seoul_kpop_main_worldview',
  modernSeoulKpopWorldRules: 'built_in_modern_seoul_kpop_world_rules',
  modernSeoulKpopEncyclopediaPlaceholder: 'built_in_modern_seoul_kpop_encyclopedia_placeholder',
  modernSeoulKpopProfileTemplatePlaceholder: 'built_in_modern_seoul_kpop_profile_template_placeholder',
  modernSeoulKpopWorldPackReferencePlaceholder: 'built_in_modern_seoul_kpop_world_pack_reference_placeholder',
  modernSeoulKpopReferenceMaterialPlaceholder: 'built_in_modern_seoul_kpop_reference_material_placeholder',
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
  createBuiltInBookAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopProfileTemplatePlaceholder,
      title: '现代首尔 K-pop 娱乐圈：人设模板占位',
      category: 'profile_template',
      tags: ['内置', 'K-pop', '人设模板', '占位文稿'],
      content: createPlaceholderMarkdown('现代首尔 K-pop 娱乐圈：人设模板占位', [
        {
          title: '艺人字段',
          content: '占位：艺名、本名、所属组合、担当、练习年限、公开人设、私下压力源和关系禁区。',
        },
        {
          title: '工作人员字段',
          content: '占位：职位、所属部门、对外权限、危机处理风格、掌握的非公开信息和与艺人的边界。',
        },
        {
          title: '粉丝与媒体字段',
          content: '占位：身份来源、立场、可见信息、应援方式、传播影响力和潜在冲突点。',
        },
      ]),
      sourcePath: 'built-in/placeholders/modern-seoul-kpop-profile-template.md',
    },
    3,
  ),
  createBuiltInBookAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopWorldPackReferencePlaceholder,
      title: '现代首尔 K-pop 娱乐圈：世界包参考占位',
      category: 'reference_material',
      tags: ['内置', 'K-pop', '世界包参考', '占位文稿'],
      content: createPlaceholderMarkdown('现代首尔 K-pop 娱乐圈：世界包参考占位', [
        {
          title: '可扩展世界包',
          content: '占位：校园练习生线、豪门商务线、都市悬疑线等扩展包可以在这里说明适配前提。',
        },
        {
          title: '应用入口映射',
          content: '占位：行程板、粉丝站、热帖榜、造型室、练习室预约等入口只描述体验方向，不创建业务真相。',
        },
      ]),
      sourcePath: 'built-in/placeholders/modern-seoul-kpop-world-pack-reference.md',
    },
    4,
  ),
  createBuiltInBookAsset(
    {
      id: BUILT_IN_BOOK_ASSET_IDS.modernSeoulKpopReferenceMaterialPlaceholder,
      title: '现代首尔 K-pop 娱乐圈：参考资料占位',
      category: 'reference_material',
      tags: ['内置', 'K-pop', '参考资料', '占位文稿'],
      content: createPlaceholderMarkdown('现代首尔 K-pop 娱乐圈：参考资料占位', [
        {
          title: '语气参考',
          content: '占位：粉丝评论、经纪人通知、群聊闲谈、媒体报道和危机公关的语气样本可以放在这里。',
        },
        {
          title: '剧情参考',
          content: '占位：回归周、签售前夜、热搜发酵、练习室冲突、品牌活动等常用场景参考。',
        },
      ]),
      sourcePath: 'built-in/placeholders/modern-seoul-kpop-reference-material.md',
    },
    5,
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
