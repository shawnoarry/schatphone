import { computed } from 'vue'
import {
  ROLE_DETAIL_SECTIONS,
  ROLE_DETAIL_SOURCE_KINDS,
} from '../lib/role-profile-schema'

const defaultT = (zh, en) => en || zh

const createSectionDefinitions = (t = defaultT) => [
  {
    key: ROLE_DETAIL_SECTIONS.PREFERENCES,
    title: t('\u504f\u597d', 'Preferences'),
    empty: t('\u6682\u65e0\u504f\u597d\u6761\u76ee\u3002', 'No preference entries yet.'),
    placeholderTitle: t('\u504f\u597d\u6807\u9898', 'Preference title'),
    placeholderDetail: t('\u504f\u597d\u8bf4\u660e', 'Preference detail'),
  },
  {
    key: ROLE_DETAIL_SECTIONS.LIFE_PATTERN,
    title: t('\u751f\u6d3b\u6a21\u5f0f', 'Life Pattern'),
    empty: t('\u6682\u65e0\u751f\u6d3b\u6a21\u5f0f\u6761\u76ee\u3002', 'No life-pattern entries yet.'),
    placeholderTitle: t('\u6a21\u5f0f\u6807\u9898', 'Pattern title'),
    placeholderDetail: t('\u751f\u6d3b\u8282\u594f\u3001\u4f5c\u606f\u6216\u4e60\u60ef', 'Rhythm, schedule, or habit'),
  },
  {
    key: ROLE_DETAIL_SECTIONS.SOCIAL_GRAPH,
    title: t('\u793e\u4f1a\u5173\u7cfb', 'Social Graph'),
    empty: t('\u6682\u65e0\u793e\u4f1a\u5173\u7cfb\u6761\u76ee\u3002', 'No social-graph entries yet.'),
    placeholderTitle: t('\u5173\u7cfb\u6807\u9898', 'Relationship title'),
    placeholderDetail: t('\u4eba\u7269\u3001\u7ec4\u7ec7\u6216\u5173\u7cfb\u8bf4\u660e', 'Person, group, or relationship detail'),
  },
]

export function splitRoleDetailItems(items = []) {
  const list = Array.isArray(items) ? items : []
  const manualItems = list.filter((item) => item?.sourceKind !== ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED)
  const eventAttachedItems = list.filter((item) => item?.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED)
  return {
    items: list,
    stats: {
      total: list.length,
      manual: manualItems.length,
      eventAttached: eventAttachedItems.length,
    },
    manualItems,
    eventAttachedItems,
  }
}

export function buildRoleDetailItemGroups(
  items = [],
  {
    t = defaultT,
  } = {},
) {
  const { manualItems, eventAttachedItems } = splitRoleDetailItems(items)
  return [
    {
      key: ROLE_DETAIL_SOURCE_KINDS.MANUAL,
      title: t('\u624b\u52a8\u6761\u76ee', 'Manual details'),
      description: t(
        '\u7528\u6237\u7ef4\u62a4\u7684\u7a33\u5b9a\u8bbe\u5b9a\uff0c\u53ef\u5728\u8fd9\u91cc\u5355\u72ec\u5220\u9664\u3002',
        'User-maintained stable facts that can be deleted here.',
      ),
      items: manualItems,
    },
    {
      key: ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED,
      title: t('\u4e8b\u4ef6\u6302\u8f7d', 'Event-attached'),
      description: t(
        '\u7531\u804a\u5929\u3001\u5730\u56fe\u3001\u65e5\u7a0b\u7b49\u53d1\u5c55\u6302\u8f7d\uff1b\u901a\u8fc7\u5bf9\u5e94\u8bb0\u5fc6\u6216\u5173\u7cfb\u91cd\u7f6e\u6e05\u7406\u3002',
        'Attached by Chat, Map, Calendar, or other development; clear through the linked memory or relationship reset.',
      ),
      items: eventAttachedItems,
    },
  ].filter((group) => group.items.length > 0)
}

export function roleDetailSourceLabel(item, t = defaultT) {
  return item?.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED
    ? t('\u4e8b\u4ef6\u6302\u8f7d', 'Event-attached')
    : t('\u624b\u52a8', 'Manual')
}

export function roleDetailSourceHint(item, t = defaultT) {
  if (item?.sourceKind !== ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED) {
    return t(
      '\u7528\u6237\u624b\u52a8\u8f93\u5165\uff0c\u53ef\u5355\u72ec\u5220\u9664\u3002',
      'User-entered detail. It can be deleted directly.',
    )
  }
  const refs = [
    item.memoryKey ? `${t('\u8bb0\u5fc6', 'Memory')}: ${item.memoryKey}` : '',
    item.sourceModule ? `${t('\u6765\u6e90', 'Source')}: ${item.sourceModule}` : '',
  ].filter(Boolean)
  const suffix = refs.length ? ` \u00b7 ${refs.join(' \u00b7 ')}` : ''
  return `${t(
    '\u4e8b\u4ef6\u53d1\u5c55\u6302\u8f7d\uff0c\u9700\u5220\u9664\u5bf9\u5e94\u8bb0\u5fc6\u6216\u91cd\u7f6e\u5173\u7cfb\u540e\u81ea\u52a8\u6e05\u7406\u3002',
    'Attached by relationship events; delete the linked memory or reset the relationship to clear it.',
  )}${suffix}`
}

export function useContactsDetailSectionModel({
  selectedProfile,
  t = defaultT,
  listDetailItemsForSection = () => [],
} = {}) {
  const roleDetailSections = computed(() => createSectionDefinitions(t))

  const detailItemsForSection = (profile, section) =>
    profile?.id ? listDetailItemsForSection(profile, section) : []

  const detailItemStatsForSection = (profile, section) =>
    splitRoleDetailItems(detailItemsForSection(profile, section)).stats

  const detailItemGroupsForSection = (profile, section) =>
    buildRoleDetailItemGroups(detailItemsForSection(profile, section), { t })

  const selectedDetailSectionRows = computed(() => {
    const profile = selectedProfile?.value
    return roleDetailSections.value.map((section) => {
      const items = detailItemsForSection(profile, section.key)
      return {
        ...section,
        items,
        stats: splitRoleDetailItems(items).stats,
        groups: buildRoleDetailItemGroups(items, { t }),
      }
    })
  })

  const roleDetailPolicyText = computed(() =>
    t(
      '\u624b\u52a8\u6761\u76ee\u7531\u7528\u6237\u7ef4\u62a4\uff1b\u4e8b\u4ef6\u6302\u8f7d\u6761\u76ee\u6765\u81ea\u804a\u5929\u3001\u5730\u56fe\u3001\u65e5\u7a0b\u7b49\u53d1\u5c55\uff0c\u4f1a\u968f\u8bb0\u5fc6\u5220\u9664\u6216\u5173\u7cfb\u91cd\u7f6e\u4e00\u8d77\u6e05\u7406\u3002',
      'Manual entries are user-maintained; event-attached entries come from Chat, Map, Calendar, and other development, and are cleared with memory deletion or relationship reset.',
    ),
  )

  return {
    roleDetailSections,
    selectedDetailSectionRows,
    roleDetailPolicyText,
    detailItemsForSection,
    detailItemStatsForSection,
    detailItemGroupsForSection,
    roleDetailSourceLabel: (item) => roleDetailSourceLabel(item, t),
    roleDetailSourceHint: (item) => roleDetailSourceHint(item, t),
  }
}
