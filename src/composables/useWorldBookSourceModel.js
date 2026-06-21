import { computed } from 'vue'
import {
  buildWorldBookSourceSnapshot,
  diffWorldBookSourceText,
  resolveWorldBookSourceText,
} from '../lib/book-text-schema'
import {
  WORLDBOOK_SOURCE_ROLES,
  getBookTextCategoryLabel,
  getWorldBookSourceRoleLabel,
} from '../lib/world-taxonomy'
import { isBuiltInBookTextAssetId } from '../lib/built-in-book-assets'

const defaultT = (zh, en) => en || zh

const readValue = (source) => (source && typeof source === 'object' && 'value' in source ? source.value : source)

export const WORLDBOOK_CONTEXT_TEXT_CATEGORIES = Object.freeze([
  {
    id: 'worldview',
    roles: ['main_worldview'],
    assetCategories: ['worldview'],
    labelZh: '\u4e16\u754c\u89c2',
    labelEn: 'Worldview',
    detailZh: '\u5f53\u524d\u4e16\u754c\u7684\u57fa\u7840\u524d\u63d0',
    detailEn: 'Core premise for this world',
  },
  {
    id: 'rules',
    roles: ['world_rule'],
    assetCategories: ['world_rule'],
    labelZh: '\u89c4\u5219',
    labelEn: 'Rules',
    detailZh: '\u7ea6\u675f\u5bf9\u8bdd\u548c\u8fd0\u884c\u65f6\u7684\u89c4\u5219',
    detailEn: 'Rules read by chat and runtime',
  },
  {
    id: 'encyclopedia',
    roles: ['encyclopedia'],
    assetCategories: ['encyclopedia'],
    labelZh: '\u767e\u79d1',
    labelEn: 'Encyclopedia',
    detailZh: '\u5730\u70b9\u3001\u672f\u8bed\u548c\u80cc\u666f\u8d44\u6599',
    detailEn: 'Places, terms, and reference notes',
  },
])

export const inferWorldBookSourceRole = (asset = {}) => {
  const category = asset?.category || asset?.assetType
  if (category === 'world_rule') return 'world_rule'
  if (category === 'encyclopedia') return 'encyclopedia'
  if (category === 'profile_template' || category === 'reference_material') return 'encyclopedia'
  return 'main_worldview'
}

export function useWorldBookSourceModel({
  systemStore,
  bookStore,
  globalWorldview,
  worldOverview,
  sourceDirectory,
  sourcePicker,
  sourceReview,
  t = defaultT,
} = {}) {
  const getSourceRoleCopy = (role = '') => getWorldBookSourceRoleLabel(role)

  const getSourceRoleLabel = (role = '') => {
    const copy = getSourceRoleCopy(role)
    return t(copy.zh, copy.en)
  }

  const getBookAssetCategoryLabel = (asset = {}) => {
    const copy = getBookTextCategoryLabel(asset.category || asset.assetType)
    return t(copy.zh, copy.en)
  }

  const describeBookLinkSections = (asset, sectionIds = []) => {
    const ids = Array.isArray(sectionIds) ? sectionIds.filter(Boolean) : []
    if (ids.length === 0) return t('\u5168\u6587', 'Whole document')
    const sections = Array.isArray(asset?.sections) ? asset.sections : []
    const selectedTitles = sections
      .filter((section) => ids.includes(section.id))
      .map((section) => section.title)
      .filter(Boolean)
    if (selectedTitles.length === 0) {
      return t(`${ids.length} \u4e2a\u7ae0\u8282`, `${ids.length} sections`)
    }
    return selectedTitles.slice(0, 3).join(' / ')
  }

  const buildSourceSnapshotForLink = (asset, sectionIds = []) =>
    buildWorldBookSourceSnapshot(resolveWorldBookSourceText(asset, sectionIds))

  const sourcePickerAssets = computed(() =>
    Array.isArray(bookStore?.worldbookSourceAssets) ? bookStore.worldbookSourceAssets : [],
  )

  const linkedBookSources = computed(() =>
    (typeof systemStore?.listWorldBookSourceLinks === 'function'
      ? systemStore.listWorldBookSourceLinks()
      : []
    ).map((link) => {
      const asset = bookStore?.findAssetById?.(link.assetId)
      const currentSourceText = resolveWorldBookSourceText(asset, link.sectionIds)
      const snapshotText = typeof link.sourceSnapshotText === 'string' ? link.sourceSnapshotText : ''
      const snapshotIsPartial = Number(link.sourceSnapshotCharCount || 0) > snapshotText.length
      return {
        ...link,
        asset,
        title: link.titleOverride || asset?.title || link.assetId,
        missing: !asset,
        currentSourceText,
        snapshotIsPartial,
        changed:
          Boolean(asset) &&
          Boolean(link.sourceFingerprint) &&
          Boolean(asset.contentFingerprint) &&
          link.sourceFingerprint !== asset.contentFingerprint &&
          (snapshotIsPartial || snapshotText !== currentSourceText),
        usageLabel: getSourceRoleLabel(link.role || link.usage),
        sectionSummary: describeBookLinkSections(asset, link.sectionIds),
        builtIn: isBuiltInBookTextAssetId(link.assetId),
      }
    }),
  )

  const contextTextCategories = computed(() =>
    WORLDBOOK_CONTEXT_TEXT_CATEGORIES.map((category) => {
      const enabledLinks = linkedBookSources.value.filter(
        (link) => link.enabled !== false && category.roles.includes(link.role || link.usage),
      )
      const availableAssets = sourcePickerAssets.value.filter((asset) => {
        const role = inferWorldBookSourceRole(asset)
        return category.roles.includes(role) || category.assetCategories.includes(asset.category || asset.assetType)
      })
      const enabledCharCount = enabledLinks.reduce(
        (total, link) => total + String(link.currentSourceText || '').length,
        0,
      )
      return {
        ...category,
        label: t(category.labelZh, category.labelEn),
        detail: t(category.detailZh, category.detailEn),
        enabledLinks,
        availableAssets,
        enabledCharCount,
        configured: enabledLinks.length > 0,
      }
    }),
  )

  const selectedTextCategory = computed(
    () => contextTextCategories.value.find((category) => category.id === sourceDirectory?.categoryId) || null,
  )

  const selectedDirectoryAsset = computed(() =>
    bookStore?.findAssetById?.(sourceDirectory?.assetId) || null,
  )

  const directoryLinkForAsset = (assetId = '') => {
    const asset = bookStore?.findAssetById?.(assetId)
    if (!asset || !selectedTextCategory.value) return null
    return selectedTextCategory.value.enabledLinks.find((link) => link.assetId === asset.id) || null
  }

  const fallbackWorldviewPreview = computed(() => {
    const text = String(readValue(globalWorldview) || '').trim().replace(/\s+/g, ' ')
    if (!text) {
      return t(
        '\u8fd8\u6ca1\u6709\u5199\u5165\u57fa\u7840\u4e16\u754c\u89c2\u3002',
        'No base worldview has been written yet.',
      )
    }
    return text.length > 140 ? `${text.slice(0, 140)}...` : text
  })

  const hasBookSourceLinks = computed(() => linkedBookSources.value.length > 0)
  const showWorldBookOnboarding = computed(() => !hasBookSourceLinks.value)
  const availableBookSourceAssets = computed(() => {
    const linkedIds = new Set(linkedBookSources.value.map((link) => link.assetId))
    return sourcePickerAssets.value.filter((asset) => !linkedIds.has(asset.id))
  })
  const sourcePickerLinkedAssetIds = computed(() => new Set(linkedBookSources.value.map((link) => link.assetId)))

  const sourceRoleOptions = computed(() =>
    WORLDBOOK_SOURCE_ROLES.map((role) => ({
      id: role,
      label: getSourceRoleLabel(role),
    })),
  )

  const isSourcePickerAssetLinked = (assetId = '') => sourcePickerLinkedAssetIds.value.has(assetId)

  const sourcePickerGroups = computed(() =>
    WORLDBOOK_SOURCE_ROLES.map((role) => {
      const assets = sourcePickerAssets.value.filter((asset) => inferWorldBookSourceRole(asset) === role)
      return {
        id: role,
        label: getSourceRoleLabel(role),
        count: assets.length,
        assets,
      }
    }).filter((group) => group.assets.length > 0),
  )

  const sourcePickerAsset = computed(() =>
    bookStore?.findAssetById?.(sourcePicker?.assetId) || sourcePickerAssets.value[0] || null,
  )

  const sourcePickerSections = computed(() =>
    Array.isArray(sourcePickerAsset.value?.sections) ? sourcePickerAsset.value.sections : [],
  )

  const sourcePickerSelectedSections = computed(() =>
    sourcePicker?.mode === 'sections'
      ? sourcePickerSections.value.filter((section) => sourcePicker.sectionIds.includes(section.id))
      : [],
  )

  const reviewingBookSource = computed(() =>
    linkedBookSources.value.find((link) => link.id === sourceReview?.linkId) || null,
  )

  const sourceReviewDiff = computed(() => {
    const link = reviewingBookSource.value
    if (!link) return diffWorldBookSourceText('', '')
    return diffWorldBookSourceText(link.sourceSnapshotText || '', link.currentSourceText || '')
  })

  const sourceReviewSummary = computed(() =>
    t(
      `\u65b0\u589e ${sourceReviewDiff.value.addedCount} \u6bb5\uff0c\u79fb\u9664 ${sourceReviewDiff.value.removedCount} \u6bb5\uff0c\u672a\u53d8 ${sourceReviewDiff.value.unchangedCount} \u6bb5`,
      `${sourceReviewDiff.value.addedCount} added, ${sourceReviewDiff.value.removedCount} removed, ${sourceReviewDiff.value.unchangedCount} unchanged`,
    ),
  )

  const activeBookSources = computed(() =>
    linkedBookSources.value.filter((link) => link.enabled !== false && !link.missing),
  )
  const bookSourceIssueLinks = computed(() =>
    linkedBookSources.value.filter((link) => link.missing || link.changed),
  )
  const sourceMaintenanceLinks = computed(() =>
    linkedBookSources.value.filter((link) => link.enabled === false || link.missing),
  )
  const activeBookSourceCount = computed(() => activeBookSources.value.length)
  const bookSourceIssueCount = computed(() => bookSourceIssueLinks.value.length)
  const disabledBookSourceCount = computed(() =>
    linkedBookSources.value.filter((link) => link.enabled === false).length,
  )
  const activeContextTextCharCount = computed(() => Number(readValue(worldOverview)?.worldviewCharCount || 0))

  return {
    activeBookSourceCount,
    activeBookSources,
    activeContextTextCharCount,
    availableBookSourceAssets,
    bookSourceIssueCount,
    bookSourceIssueLinks,
    buildSourceSnapshotForLink,
    contextTextCategories,
    describeBookLinkSections,
    directoryLinkForAsset,
    disabledBookSourceCount,
    fallbackWorldviewPreview,
    getBookAssetCategoryLabel,
    getSourceRoleLabel,
    hasBookSourceLinks,
    inferBookSourceRole: inferWorldBookSourceRole,
    isSourcePickerAssetLinked,
    linkedBookSources,
    reviewingBookSource,
    selectedDirectoryAsset,
    selectedTextCategory,
    showWorldBookOnboarding,
    sourceMaintenanceLinks,
    sourcePickerAsset,
    sourcePickerAssets,
    sourcePickerGroups,
    sourcePickerLinkedAssetIds,
    sourcePickerSections,
    sourcePickerSelectedSections,
    sourceReviewDiff,
    sourceReviewSummary,
    sourceRoleOptions,
  }
}
