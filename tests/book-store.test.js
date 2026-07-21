import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookStore } from '../src/stores/book'

const BUILT_IN_KPOP_BOOK_ASSET_IDS = [
  'built_in_modern_seoul_kpop_main_worldview',
  'built_in_modern_seoul_kpop_world_rules',
  'built_in_modern_seoul_kpop_music_show_day_mini_scene_rule',
  'built_in_modern_seoul_kpop_industry_career_operation',
  'built_in_modern_seoul_kpop_production_stage_live',
  'built_in_modern_seoul_kpop_fandom_platform_public_opinion',
  'built_in_modern_seoul_kpop_city_life_state_relationship',
  'built_in_modern_seoul_kpop_real_entity_member_coordinate',
  'built_in_modern_seoul_kpop_industry_celebrity_functional_role',
]

const BUILT_IN_KPOP_ENCYCLOPEDIA_ASSETS = [
  {
    id: 'built_in_modern_seoul_kpop_industry_career_operation',
    title: 'K-pop 行业与事业',
    sourcePath:
      'docs/superpowers/content/2026-06-20-modern-seoul-kpop-industry-career-operation-merged-encyclopedia-draft.md',
    bodyText: 'K-pop 行业与事业运转由公司、厂牌、练习体系、出道机制',
  },
  {
    id: 'built_in_modern_seoul_kpop_production_stage_live',
    title: 'K-pop 作品、舞台与通告',
    sourcePath:
      'docs/superpowers/content/2026-06-21-modern-seoul-kpop-production-stage-live-merged-encyclopedia-draft.md',
    bodyText: 'K-pop 作品、舞台与现场生产由 A&R、demo、录音、编舞',
  },
  {
    id: 'built_in_modern_seoul_kpop_fandom_platform_public_opinion',
    title: 'K-pop 粉丝、平台与舆情',
    sourcePath:
      'docs/superpowers/content/2026-06-20-modern-seoul-kpop-fandom-platform-public-opinion-merged-encyclopedia-draft.md',
    bodyText: 'K-pop 粉丝、平台与舆情生态由粉籍、站子、后援会、数据组',
  },
  {
    id: 'built_in_modern_seoul_kpop_city_life_state_relationship',
    title: '首尔艺人日常与关系网络',
    sourcePath:
      'docs/superpowers/content/2026-06-21-modern-seoul-kpop-city-life-state-relationship-merged-encyclopedia-draft.md',
    bodyText: '现代首尔 K-pop 娱乐圈中的角色不只存在于舞台、公司和粉丝社区',
  },
  {
    id: 'built_in_modern_seoul_kpop_real_entity_member_coordinate',
    title: 'K-pop 实体与成员坐标',
    sourcePath:
      'docs/superpowers/content/2026-06-21-modern-seoul-kpop-real-entity-member-coordinate-merged-encyclopedia-draft.md',
    bodyText: '现代首尔 K-pop 世界中的真实实体可以作为行业参照',
  },
  {
    id: 'built_in_modern_seoul_kpop_industry_celebrity_functional_role',
    title: 'K-pop 行业名人与功能角色',
    sourcePath:
      'docs/superpowers/content/2026-06-23-modern-seoul-kpop-industry-celebrity-functional-role-encyclopedia-draft.md',
    bodyText: 'K-pop 行业中的名人、制作人、MC、PD、作家、编舞师',
  },
]

const BUILT_IN_KPOP_ENCYCLOPEDIA_IDS = BUILT_IN_KPOP_ENCYCLOPEDIA_ASSETS.map(
  (asset) => asset.id,
)

const LEGACY_BUILT_IN_KPOP_ENCYCLOPEDIA_IDS = [
  'built_in_modern_seoul_kpop_encyclopedia_placeholder',
  'built_in_modern_seoul_kpop_industry_mechanisms',
  'built_in_modern_seoul_kpop_chinese_fandom_terms',
  'built_in_modern_seoul_youth_lifestyle',
  'built_in_modern_seoul_kpop_real_entity_coordinate',
  'built_in_modern_seoul_kpop_representative_members',
]

describe('book store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T09:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('starts from an empty user library with built-in callable sources', () => {
    const store = useBookStore()

    expect(store.assetCount).toBe(0)
    expect(store.createBackupSnapshot()).toEqual({
      assets: [],
      categories: [],
    })
    expect(store.listAssets({ search: 'K-pop' }).map((asset) => asset.id)).toEqual(
      expect.arrayContaining(BUILT_IN_KPOP_BOOK_ASSET_IDS),
    )
    expect(store.findAssetById('built_in_modern_seoul_kpop_main_worldview')).toMatchObject({
      title: '现代首尔 K-pop 娱乐圈：主世界观',
      category: 'worldview',
      locked: true,
      source: {
        kind: 'built_in',
      },
    })
    expect(store.worldbookSourceAssets.map((asset) => asset.id)).toEqual(
      expect.arrayContaining(BUILT_IN_KPOP_BOOK_ASSET_IDS),
    )
    const encyclopediaIds = store.listAssets({ category: 'encyclopedia' }).map((asset) => asset.id)
    expect(encyclopediaIds).toEqual(BUILT_IN_KPOP_ENCYCLOPEDIA_IDS)
    LEGACY_BUILT_IN_KPOP_ENCYCLOPEDIA_IDS.forEach((legacyId) => {
      expect(encyclopediaIds).not.toContain(legacyId)
    })
    expect(store.findAssetById('built_in_modern_seoul_kpop_encyclopedia_placeholder')).toMatchObject({
      title: 'K-pop 行业机制',
      category: 'encyclopedia',
      locked: true,
    })
    const builtInEncyclopediaContent = BUILT_IN_KPOP_ENCYCLOPEDIA_IDS.map(
      (id) => store.findAssetById(id)?.content || '',
    ).join('\n\n')
    expect(builtInEncyclopediaContent).not.toContain('百科条目占位')
    expect(builtInEncyclopediaContent).not.toContain('内部校订备注')
    expect(builtInEncyclopediaContent).not.toContain('后续校订点')
    expect(builtInEncyclopediaContent).not.toContain('消息来源')
    expect(builtInEncyclopediaContent).not.toContain('资料来源')
    expect(builtInEncyclopediaContent).not.toContain('参考资料')
    expect(builtInEncyclopediaContent).not.toContain('参考来源')
    expect(builtInEncyclopediaContent).not.toMatch(/^\|.*\|$/m)
    expect(store.updateAsset('built_in_modern_seoul_kpop_main_worldview', { title: 'Changed' })).toMatchObject({
      ok: false,
      reason: 'built_in',
    })
    expect(store.deleteAsset('built_in_modern_seoul_kpop_main_worldview', { force: true })).toMatchObject({
      ok: false,
      reason: 'built_in',
    })
    expect(store.createBackupSnapshot()).toEqual({
      assets: [],
      categories: [],
    })
  })

  test.each(BUILT_IN_KPOP_ENCYCLOPEDIA_ASSETS)(
    'publishes $title as an independent optional built-in encyclopedia',
    ({ id, title, sourcePath, bodyText }) => {
      const store = useBookStore()
      const asset = store.findAssetById(id)

      expect(asset).toMatchObject({
        id,
        title,
        category: 'encyclopedia',
        locked: true,
        status: 'draft',
        source: {
          kind: 'built_in',
          sourceId: id,
          sourcePath,
        },
      })
      expect(asset).not.toHaveProperty('enabled')
      expect(asset?.content).toContain(bodyText)
      expect(asset?.content).not.toContain('Updated:')
      expect(asset?.content).not.toContain('Status:')
      expect(asset?.content).not.toContain('资产类型：')
      expect(asset?.content).not.toContain('用途：')
      expect(asset?.content).not.toContain('文体规范：')
      expect(asset?.content).not.toContain('## 条目定位')
      expect(asset?.content).not.toContain('## 后续校订点')
    },
  )

  test('publishes K-pop worldview and world rules without draft metadata', () => {
    const store = useBookStore()
    const mainWorldview = store.findAssetById('built_in_modern_seoul_kpop_main_worldview')
    const worldRules = store.findAssetById('built_in_modern_seoul_kpop_world_rules')

    expect(mainWorldview?.content).toContain('本世界观设定在 2026 年的现代首尔。')
    expect(worldRules?.content).toContain(
      '现代首尔 K-pop 娱乐圈中的角色生活在真实时间、手机私聊、公司日程、地点移动、官方通知和粉丝舆论共同构成的环境里。',
    )
    expect(worldRules?.content).toContain('### 1. 时间与节奏')
    expect(mainWorldview?.content).not.toContain('使用直接陈述句说明世界结构。')

    const publishedAssets = [mainWorldview, worldRules]
    publishedAssets.forEach((asset) => {
      expect(asset?.content).not.toContain('Updated:')
      expect(asset?.content).not.toContain('Status:')
      expect(asset?.content).not.toContain('资产类型：')
      expect(asset?.content).not.toContain('用途：')
      expect(asset?.content).not.toContain('文体规范：')
      expect(asset?.content).not.toContain('## 正文')
      expect(asset?.content).not.toContain('## 内部校订备注')
    })
  })

  test('publishes the music-show-day mini-scene rule as an independent optional world rule', () => {
    const store = useBookStore()
    const rule = store.findAssetById(
      'built_in_modern_seoul_kpop_music_show_day_mini_scene_rule',
    )

    expect(rule).toMatchObject({
      id: 'built_in_modern_seoul_kpop_music_show_day_mini_scene_rule',
      title: 'K-pop 音乐节目打歌日小剧场规则',
      category: 'world_rule',
      locked: true,
      status: 'draft',
      source: {
        kind: 'built_in',
        sourceId: 'built_in_modern_seoul_kpop_music_show_day_mini_scene_rule',
        sourcePath:
          'docs/superpowers/content/2026-07-21-modern-seoul-kpop-music-show-day-mini-scene-rule.md',
      },
    })
    expect(rule).not.toHaveProperty('enabled')
    expect(rule?.content).toContain('本规则只处理一个已经成立的音乐节目打歌日')
    expect(rule?.content).toContain('### 3. 必要输入')
    expect(rule?.content).toContain('### 10. 未来 mini_scene 产物的语义要求')
    expect(rule?.content).not.toContain('Updated:')
    expect(rule?.content).not.toContain('Status:')
    expect(rule?.content).not.toContain('资产类型：')
    expect(rule?.content).not.toContain('用途：')
    expect(rule?.content).not.toContain('## 正文')
    expect(rule?.content).not.toContain('## 内部校订备注')
    expect(store.listAssets({ category: 'world_rule' }).map((asset) => asset.id)).toEqual([
      'built_in_modern_seoul_kpop_world_rules',
      'built_in_modern_seoul_kpop_music_show_day_mini_scene_rule',
    ])
    expect(store.createBackupSnapshot()).toEqual({ assets: [], categories: [] })
  })

  test('creates, updates, filters, and deletes assets', () => {
    const store = useBookStore()

    const asset = store.createAsset({
      id: 'asset_city_rules',
      title: 'City Rules',
      category: 'world_rule',
      tags: ['city'],
      content: 'No loud magic on trains.',
    })

    expect(store.assetCount).toBe(1)
    expect(asset.category).toBe('world_rule')
    expect(asset.assetType).toBe('world_rule')
    expect(store.findAssetById('asset_city_rules')?.title).toBe('City Rules')
    expect(store.listAssets({ search: 'magic' })).toHaveLength(1)
    expect(store.listAssets({ category: 'world_rule' }).map((item) => item.id)).toEqual(
      expect.arrayContaining(['asset_city_rules', 'built_in_modern_seoul_kpop_world_rules']),
    )
    expect(store.listAssets({ assetType: 'rule_set' }).map((item) => item.id)).toEqual(
      expect.arrayContaining(['asset_city_rules', 'built_in_modern_seoul_kpop_world_rules']),
    )
    expect(store.listAssets({ tag: 'city' })).toHaveLength(1)

    const updated = store.updateAsset(asset.id, {
      title: 'Quiet City Rules',
      content: 'No loud magic on trains after midnight.',
    })

    expect(updated.ok).toBe(true)
    expect(updated.asset.title).toBe('Quiet City Rules')
    expect(updated.asset.version).toBe(2)

    const deleted = store.deleteAsset(asset.id)
    expect(deleted.ok).toBe(true)
    expect(store.assetCount).toBe(0)
  })

  test('locked assets cannot be updated until explicitly unlocked or forced', () => {
    const store = useBookStore()
    const asset = store.createAsset({
      id: 'asset_locked',
      title: 'Locked Source',
      content: 'Stable text.',
    })

    expect(store.lockAsset(asset.id).ok).toBe(true)
    const blocked = store.updateAsset(asset.id, { content: 'Changed text.' })
    expect(blocked).toMatchObject({ ok: false, reason: 'locked' })
    expect(store.findAssetById(asset.id)?.content).toBe('Stable text.')

    expect(store.unlockAsset(asset.id).ok).toBe(true)
    const updated = store.updateAsset(asset.id, { content: 'Changed text.' })
    expect(updated.ok).toBe(true)
    expect(store.findAssetById(asset.id)?.content).toBe('Changed text.')
  })

  test('active source assets are protected from normal delete', () => {
    const store = useBookStore()
    const asset = store.createAsset({
      id: 'asset_active',
      title: 'Active Source',
      status: 'active_source',
      content: 'Current world source.',
    })

    expect(store.deleteAsset(asset.id)).toMatchObject({
      ok: false,
      reason: 'active_source',
    })
    expect(store.assetCount).toBe(1)

    expect(store.deleteAsset(asset.id, { force: true }).ok).toBe(true)
    expect(store.assetCount).toBe(0)
  })

  test('imports markdown and creates sections', () => {
    const store = useBookStore()

    const result = store.importTextAsset({
      fileName: 'setting.md',
      content: '# City\n\nRain rules.\n\n## Transit\n\nQuiet cars.',
      mimeType: 'text/markdown',
    })

    expect(result.ok).toBe(true)
    expect(result.asset.format).toBe('markdown')
    expect(result.asset.sections.map((section) => section.title)).toEqual(['City', 'Transit'])
    expect(store.assetCount).toBe(1)
  })

  test('backup and restore preserves assets', () => {
    const store = useBookStore()
    store.createAsset({
      id: 'asset_backup',
      title: 'Backup Source',
      category: 'worldview',
      content: 'Backup text.',
    })
    const snapshot = store.createBackupSnapshot()

    setActivePinia(createPinia())
    const restoredStore = useBookStore()
    restoredStore.restoreFromBackup(snapshot)

    expect(restoredStore.assetCount).toBe(1)
    expect(restoredStore.findAssetById('asset_backup')?.content).toBe('Backup text.')
  })

  test('duplicates assets as unlocked drafts', () => {
    const store = useBookStore()
    const asset = store.createAsset({
      id: 'asset_original',
      title: 'Original',
      status: 'active_source',
      locked: true,
      content: 'Original text.',
    })

    const duplicate = store.duplicateAsset(asset.id)

    expect(duplicate.title).toBe('Original Copy')
    expect(duplicate.status).toBe('draft')
    expect(duplicate.locked).toBe(false)
    expect(duplicate.content).toBe('Original text.')
  })
})
