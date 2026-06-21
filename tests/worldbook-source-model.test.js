import { describe, expect, test } from 'vitest'
import { computed, reactive, ref } from 'vue'
import { buildWorldBookSourceSnapshot } from '../src/lib/book-text-schema'
import {
  inferWorldBookSourceRole,
  useWorldBookSourceModel,
} from '../src/composables/useWorldBookSourceModel'

const t = (zh, en) => en || zh

const createBookStore = (assets = []) => ({
  get worldbookSourceAssets() {
    return assets
  },
  findAssetById: (assetId = '') => assets.find((asset) => asset.id === assetId) || null,
})

const createSystemStore = (links = []) => ({
  listWorldBookSourceLinks: () => links,
})

const createModel = ({ assets = [], links = [], worldview = '', sourceReviewId = '' } = {}) => {
  const sourceDirectory = reactive({
    open: false,
    categoryId: 'worldview',
    menu: '',
    assetId: '',
    draftTitle: '',
    draftContent: '',
    notice: '',
  })
  const sourcePicker = reactive({
    open: true,
    assetId: assets[0]?.id || '',
    role: 'main_worldview',
    mode: 'whole',
    sectionIds: [],
  })
  const sourceReview = reactive({
    linkId: sourceReviewId,
  })

  const model = useWorldBookSourceModel({
    systemStore: createSystemStore(links),
    bookStore: createBookStore(assets),
    globalWorldview: ref(worldview),
    worldOverview: computed(() => ({ worldviewCharCount: worldview.length })),
    sourceDirectory,
    sourcePicker,
    sourceReview,
    t,
  })

  return {
    model,
    sourceDirectory,
    sourcePicker,
    sourceReview,
  }
}

describe('WorldBook source model interface', () => {
  test('builds source link display rows with role labels, sections, and status counts', () => {
    const activeAsset = {
      id: 'asset_world',
      title: 'World Source',
      category: 'worldview',
      content: 'Current world text.',
      version: 1,
      contentFingerprint: 'fp_current',
      sections: [
        { id: 'section_a', title: 'Basics', content: 'Current world text.', charCount: 19 },
      ],
    }
    const disabledAsset = {
      id: 'asset_rules',
      title: 'Rule Source',
      category: 'world_rule',
      content: 'Rule text.',
      version: 1,
      contentFingerprint: 'fp_rules',
      sections: [],
    }
    const links = [
      {
        id: 'link_active',
        assetId: activeAsset.id,
        role: 'main_worldview',
        sectionIds: ['section_a'],
        enabled: true,
        sourceFingerprint: activeAsset.contentFingerprint,
        ...buildWorldBookSourceSnapshot('Current world text.'),
      },
      {
        id: 'link_disabled',
        assetId: disabledAsset.id,
        role: 'world_rule',
        enabled: false,
      },
      {
        id: 'link_missing',
        assetId: 'asset_missing',
        role: 'encyclopedia',
        enabled: true,
      },
    ]

    const { model } = createModel({
      assets: [activeAsset, disabledAsset],
      links,
      worldview: 'Fallback world.',
    })

    expect(model.activeBookSourceCount.value).toBe(1)
    expect(model.bookSourceIssueCount.value).toBe(1)
    expect(model.disabledBookSourceCount.value).toBe(1)
    expect(model.sourceMaintenanceLinks.value.map((link) => link.id)).toEqual([
      'link_disabled',
      'link_missing',
    ])
    expect(model.activeBookSources.value[0]).toMatchObject({
      id: 'link_active',
      title: 'World Source',
      usageLabel: 'Main worldview',
      sectionSummary: 'Basics',
      missing: false,
      changed: false,
    })
    expect(model.fallbackWorldviewPreview.value).toBe('Fallback world.')
    expect(model.activeContextTextCharCount.value).toBe(15)
  })

  test('groups source picker assets and directory categories by inferred worldbook role', () => {
    const worldviewAsset = {
      id: 'asset_world',
      title: 'World Source',
      category: 'worldview',
      content: 'World text.',
      sections: [],
    }
    const rulesAsset = {
      id: 'asset_rules',
      title: 'Rule Source',
      category: 'world_rule',
      content: 'Rule text.',
      sections: [],
    }
    const profileTemplateAsset = {
      id: 'asset_template_note',
      title: 'Template Note',
      category: 'profile_template',
      content: 'Template note.',
      sections: [],
    }

    const { model, sourceDirectory } = createModel({
      assets: [worldviewAsset, rulesAsset, profileTemplateAsset],
      links: [
        {
          id: 'link_world',
          assetId: worldviewAsset.id,
          role: 'main_worldview',
          enabled: true,
        },
      ],
    })

    expect(inferWorldBookSourceRole(rulesAsset)).toBe('world_rule')
    expect(inferWorldBookSourceRole(profileTemplateAsset)).toBe('encyclopedia')
    expect(model.sourcePickerGroups.value.map((group) => [group.id, group.assets.map((asset) => asset.id)])).toEqual([
      ['main_worldview', ['asset_world']],
      ['encyclopedia', ['asset_template_note']],
      ['world_rule', ['asset_rules']],
    ])
    expect(model.contextTextCategories.value.map((category) => ({
      id: category.id,
      configured: category.configured,
      availableAssets: category.availableAssets.map((asset) => asset.id),
    }))).toEqual([
      { id: 'worldview', configured: true, availableAssets: ['asset_world'] },
      { id: 'rules', configured: false, availableAssets: ['asset_rules'] },
      { id: 'encyclopedia', configured: false, availableAssets: ['asset_template_note'] },
    ])

    sourceDirectory.categoryId = 'worldview'
    sourceDirectory.assetId = worldviewAsset.id
    expect(model.selectedTextCategory.value.id).toBe('worldview')
    expect(model.selectedDirectoryAsset.value.id).toBe(worldviewAsset.id)
    expect(model.directoryLinkForAsset(worldviewAsset.id)?.id).toBe('link_world')
    expect(model.isSourcePickerAssetLinked(worldviewAsset.id)).toBe(true)
    expect(model.isSourcePickerAssetLinked(rulesAsset.id)).toBe(false)
  })

  test('reports changed source review diff and snapshot payloads without touching stores', () => {
    const asset = {
      id: 'asset_changed',
      title: 'Changed Source',
      category: 'worldview',
      content: 'Original block.\n\nAdded block.',
      version: 2,
      contentFingerprint: 'fp_next',
      sections: [],
    }
    const links = [
      {
        id: 'link_changed',
        assetId: asset.id,
        role: 'main_worldview',
        enabled: true,
        sourceFingerprint: 'fp_previous',
        ...buildWorldBookSourceSnapshot('Original block.\n\nRemoved block.'),
      },
    ]
    const { model } = createModel({
      assets: [asset],
      links,
      sourceReviewId: 'link_changed',
    })

    expect(model.linkedBookSources.value[0]).toMatchObject({
      id: 'link_changed',
      changed: true,
      currentSourceText: 'Original block.\n\nAdded block.',
    })
    expect(model.reviewingBookSource.value?.id).toBe('link_changed')
    expect(model.sourceReviewSummary.value).toBe('1 added, 1 removed, 1 unchanged')
    expect(model.sourceReviewDiff.value.entries.map((entry) => entry.type)).toEqual([
      'unchanged',
      'removed',
      'added',
    ])
    expect(model.buildSourceSnapshotForLink(asset)).toMatchObject({
      sourceSnapshotText: 'Original block.\n\nAdded block.',
      sourceSnapshotCharCount: 29,
    })
  })
})
