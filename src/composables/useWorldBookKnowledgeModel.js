import { computed } from 'vue'
import {
  normalizeWorldBookEntryIds,
  normalizeWorldBookSource,
  normalizeWorldBookTagFilter,
  normalizeWorldBookUsageFilter,
} from '../lib/worldbook-navigation'

const defaultT = (zh, en) => en || zh

const readValue = (source) => (source && typeof source === 'object' && 'value' in source ? source.value : source)

const writeRefValue = (target, value) => {
  if (target && typeof target === 'object' && 'value' in target) {
    target.value = value
  }
}

const readArray = (source) => {
  const value = readValue(source)
  return Array.isArray(value) ? value : []
}

const usageStateOrder = Object.freeze({
  unused: 0,
  profile_only: 1,
  disabled: 2,
  chat_ready: 3,
})

const getKnowledgePointUpdatedAt = (point) => {
  const updatedAt = Number(point?.updatedAt)
  if (Number.isFinite(updatedAt) && updatedAt > 0) return updatedAt
  const createdAt = Number(point?.createdAt)
  return Number.isFinite(createdAt) && createdAt > 0 ? createdAt : 0
}

const compareKnowledgePointTitle = (a, b) => {
  const titleA = typeof a?.title === 'string' ? a.title.trim() : ''
  const titleB = typeof b?.title === 'string' ? b.title.trim() : ''
  return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' })
}

const normalizeKeyword = (keyword) => String(keyword || '').trim()

export function useWorldBookKnowledgeModel({
  systemStore,
  knowledgePoints,
  roleProfiles,
  contacts,
  knowledgeSearchKeyword,
  knowledgeTagFilter,
  knowledgeUsageFilter,
  knowledgeUsageSort,
  knowledgeDeepLinkPointIds,
  knowledgeDeepLinkSource,
  knowledgeDeepLinkKeyword,
  knowledgeDeepLinkTag,
  knowledgeDeepLinkUsage,
  t = defaultT,
} = {}) {
  const roleProfileChatBindingMap = computed(() => {
    const map = new Map()
    readArray(contacts).forEach((contact) => {
      if (!contact || (contact.kind || 'role') !== 'role') return
      const profileId = Number(contact.profileId)
      if (!Number.isFinite(profileId) || profileId <= 0) return
      map.set(profileId, (map.get(profileId) || 0) + 1)
    })
    return map
  })

  const getKnowledgePointUsage = (point) => {
    const pointId = typeof point?.id === 'string' ? point.id.trim() : ''
    if (!pointId) {
      return {
        profiles: [],
        chatBindingCount: 0,
        chatProfileCount: 0,
      }
    }

    const profiles = readArray(roleProfiles).filter((profile) =>
      Array.isArray(profile?.knowledgePointIds) && profile.knowledgePointIds.includes(pointId),
    )
    const chatProfiles = profiles.filter((profile) =>
      (roleProfileChatBindingMap.value.get(Number(profile.id)) || 0) > 0,
    )
    const chatBindingCount = chatProfiles.reduce(
      (sum, profile) => sum + (roleProfileChatBindingMap.value.get(Number(profile.id)) || 0),
      0,
    )

    return {
      profiles,
      chatBindingCount,
      chatProfileCount: chatProfiles.length,
    }
  }

  const getKnowledgePointUsageState = (point) => {
    const usage = getKnowledgePointUsage(point)
    if (point?.enabled === false) return 'disabled'
    if (usage.profiles.length <= 0) return 'unused'
    if (usage.chatBindingCount <= 0) return 'profile_only'
    return 'chat_ready'
  }

  const getKnowledgePointUsageBadge = (point) => {
    const state = getKnowledgePointUsageState(point)
    if (state === 'unused') {
      return {
        label: t('\u672a\u4f7f\u7528', 'Unused'),
        tone: 'neutral',
        icon: 'fas fa-circle',
      }
    }
    if (state === 'disabled') {
      return {
        label: t('\u5df2\u505c\u7528', 'Disabled'),
        tone: 'amber',
        icon: 'fas fa-pause',
      }
    }
    if (state === 'profile_only') {
      return {
        label: t('\u4ec5\u89d2\u8272\u6863\u6848', 'Profile only'),
        tone: 'amber',
        icon: 'fas fa-user-tag',
      }
    }
    return {
      label: t('\u8fdb\u5165 Chat', 'In Chat'),
      tone: 'emerald',
      icon: 'fas fa-comments',
    }
  }

  const enabledKnowledgePointCount = computed(() =>
    readArray(knowledgePoints).filter((point) => point.enabled !== false).length,
  )

  const boundKnowledgePointCount = computed(() =>
    readArray(knowledgePoints).filter((point) => getKnowledgePointUsage(point).profiles.length > 0).length,
  )

  const chatReadyKnowledgePointCount = computed(() =>
    readArray(knowledgePoints).filter((point) => getKnowledgePointUsageState(point) === 'chat_ready').length,
  )

  const normalizedKnowledgeSearchKeyword = computed(() => normalizeKeyword(readValue(knowledgeSearchKeyword)))

  const searchedKnowledgePoints = computed(() => {
    if (typeof systemStore?.listKnowledgePoints === 'function') {
      return systemStore.listKnowledgePoints({
        keyword: normalizedKnowledgeSearchKeyword.value,
      })
    }
    const keyword = normalizedKnowledgeSearchKeyword.value.toLowerCase()
    if (!keyword) return readArray(knowledgePoints)
    return readArray(knowledgePoints).filter((point) => {
      const haystack = [
        point?.title,
        point?.content,
        ...(Array.isArray(point?.tags) ? point.tags : []),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(keyword)
    })
  })

  const scopedKnowledgePoints = computed(() => {
    const deepLinkIds = readArray(knowledgeDeepLinkPointIds)
    if (deepLinkIds.length <= 0) return searchedKnowledgePoints.value
    const pointIdSet = new Set(deepLinkIds)
    return searchedKnowledgePoints.value.filter((point) => pointIdSet.has(point.id))
  })

  const knowledgeUsageFilterOptions = computed(() => {
    const counts = scopedKnowledgePoints.value.reduce(
      (acc, point) => {
        const state = getKnowledgePointUsageState(point)
        acc.all += 1
        acc[state] = (acc[state] || 0) + 1
        return acc
      },
      {
        all: 0,
        unused: 0,
        profile_only: 0,
        chat_ready: 0,
        disabled: 0,
      },
    )

    return [
      { value: 'all', label: t('\u5168\u90e8', 'All'), count: counts.all },
      { value: 'chat_ready', label: t('\u5df2\u8fdb\u5165 Chat', 'In Chat'), count: counts.chat_ready },
      { value: 'profile_only', label: t('\u4ec5\u89d2\u8272\u6863\u6848', 'Profile only'), count: counts.profile_only },
      { value: 'unused', label: t('\u672a\u4f7f\u7528', 'Unused'), count: counts.unused },
      { value: 'disabled', label: t('\u5df2\u505c\u7528', 'Disabled'), count: counts.disabled },
    ]
  })

  const knowledgeSearchPlaceholder = computed(() =>
    t('\u641c\u7d22\u6807\u9898\u3001\u5185\u5bb9\u6216\u6807\u7b7e', 'Search title, content, or tags'),
  )

  const knowledgeTagFilterOptions = computed(() => {
    const selectedUsageFilter = readValue(knowledgeUsageFilter)
    const selectedTagFilter = readValue(knowledgeTagFilter)
    const counts = new Map()
    const usageFilteredPoints = scopedKnowledgePoints.value.filter(
      (point) => selectedUsageFilter === 'all' || getKnowledgePointUsageState(point) === selectedUsageFilter,
    )

    usageFilteredPoints.forEach((point) => {
      if (!Array.isArray(point?.tags)) return
      point.tags.forEach((tag) => {
        if (typeof tag !== 'string' || !tag.trim()) return
        counts.set(tag, (counts.get(tag) || 0) + 1)
      })
    })

    const options = [
      {
        value: 'all',
        label: t('\u5168\u90e8\u6807\u7b7e', 'All tags'),
        count: usageFilteredPoints.length,
      },
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
        .map(([tag, count]) => ({
          value: tag,
          label: `#${tag}`,
          count,
        })),
    ]

    if (
      selectedTagFilter !== 'all' &&
      !options.some((option) => option.value === selectedTagFilter)
    ) {
      options.push({
        value: selectedTagFilter,
        label: `#${selectedTagFilter}`,
        count: 0,
      })
    }

    return options
  })

  const knowledgeUsageSortOptions = computed(() => [
    { value: 'recent', label: t('\u6700\u8fd1\u66f4\u65b0', 'Recent') },
    { value: 'state', label: t('\u4f7f\u7528\u72b6\u6001', 'Usage state') },
    { value: 'role_count', label: t('\u7ed1\u5b9a\u89d2\u8272\u6570', 'Bound roles') },
    { value: 'title', label: t('\u6807\u9898', 'Title') },
  ])

  const visibleKnowledgePoints = computed(() => {
    const filter = readValue(knowledgeUsageFilter)
    const sort = readValue(knowledgeUsageSort)
    const tagFilter = readValue(knowledgeTagFilter)

    return scopedKnowledgePoints.value
      .filter((point) => filter === 'all' || getKnowledgePointUsageState(point) === filter)
      .filter(
        (point) =>
          tagFilter === 'all' ||
          (Array.isArray(point?.tags) && point.tags.some((tag) => tag === tagFilter)),
      )
      .slice()
      .sort((a, b) => {
        if (sort === 'title') return compareKnowledgePointTitle(a, b)
        if (sort === 'role_count') {
          const usageA = getKnowledgePointUsage(a)
          const usageB = getKnowledgePointUsage(b)
          return usageB.profiles.length - usageA.profiles.length || compareKnowledgePointTitle(a, b)
        }
        if (sort === 'state') {
          return (
            usageStateOrder[getKnowledgePointUsageState(a)] -
              usageStateOrder[getKnowledgePointUsageState(b)] ||
            compareKnowledgePointTitle(a, b)
          )
        }
        return getKnowledgePointUpdatedAt(b) - getKnowledgePointUpdatedAt(a) || compareKnowledgePointTitle(a, b)
      })
  })

  const knowledgeDeepLinkPoints = computed(() =>
    readArray(knowledgeDeepLinkPointIds)
      .map((pointId) => systemStore?.getKnowledgePointById?.(pointId))
      .filter(Boolean),
  )

  const knowledgeDeepLinkActive = computed(
    () =>
      readArray(knowledgeDeepLinkPointIds).length > 0 ||
      Boolean(readValue(knowledgeDeepLinkSource)) ||
      Boolean(readValue(knowledgeDeepLinkKeyword)) ||
      readValue(knowledgeDeepLinkTag) !== 'all' ||
      readValue(knowledgeDeepLinkUsage) !== 'all',
  )

  const knowledgeDeepLinkSourceLabel = computed(() => {
    const source = readValue(knowledgeDeepLinkSource)
    if (source === 'calendar') return t('Calendar', 'Calendar')
    if (source === 'map') return t('Map', 'Map')
    if (source === 'chat') return t('Chat', 'Chat')
    return t('\u6a21\u5757\u4e0a\u4e0b\u6587', 'Module context')
  })

  const knowledgeDeepLinkSummary = computed(() => {
    const pointIds = readArray(knowledgeDeepLinkPointIds)
    const keyword = readValue(knowledgeDeepLinkKeyword)
    const tag = readValue(knowledgeDeepLinkTag)
    const usage = readValue(knowledgeDeepLinkUsage)
    if (pointIds.length > 0) {
      return t(
        `${knowledgeDeepLinkSourceLabel.value} \u5e26\u6765\u4e86 ${pointIds.length} \u6761\u76f8\u5173\u767e\u79d1\u6761\u76ee\u7b5b\u9009\u3002`,
        `${knowledgeDeepLinkSourceLabel.value} scoped ${pointIds.length} related encyclopedia entries.`,
      )
    }
    if (keyword) {
      return t(
        `${knowledgeDeepLinkSourceLabel.value} \u9884\u586b\u4e86\u5173\u952e\u5b57\uff1a${keyword}`,
        `${knowledgeDeepLinkSourceLabel.value} prefilled keyword: ${keyword}`,
      )
    }
    if (tag !== 'all' || usage !== 'all') {
      return t(
        `${knowledgeDeepLinkSourceLabel.value} \u5e26\u6765\u4e86\u7b5b\u9009\u6761\u4ef6\uff0c\u53ef\u76f4\u63a5\u7ee7\u7eed\u67e5\u770b\u76f8\u5173\u767e\u79d1\u6761\u76ee\u3002`,
        `${knowledgeDeepLinkSourceLabel.value} applied direct filters for related encyclopedia entries.`,
      )
    }
    return t(
      `${knowledgeDeepLinkSourceLabel.value} \u5df2\u628a\u4f60\u5e26\u5230\u5f53\u524d\u76f8\u5173\u7684 WorldBook \u8303\u56f4\u3002`,
      `${knowledgeDeepLinkSourceLabel.value} brought you into the relevant WorldBook scope.`,
    )
  })

  const isDeepLinkedKnowledgePoint = (point) =>
    Boolean(point?.id) && readArray(knowledgeDeepLinkPointIds).includes(point.id)

  const syncWorldBookDeepLink = (query = {}) => {
    const nextSource = normalizeWorldBookSource(query?.source)
    const nextKeyword = typeof query?.keyword === 'string' ? query.keyword.trim() : ''
    const nextTag = normalizeWorldBookTagFilter(query?.tag)
    const nextUsage = normalizeWorldBookUsageFilter(query?.usage)

    writeRefValue(knowledgeDeepLinkSource, nextSource)
    writeRefValue(knowledgeDeepLinkKeyword, nextKeyword)
    writeRefValue(knowledgeDeepLinkTag, nextTag)
    writeRefValue(knowledgeDeepLinkUsage, nextUsage)

    const pointIds = normalizeWorldBookEntryIds(query?.entries || query?.entry || query?.points || query?.point)
    const existingPointIds = new Set(readArray(knowledgePoints).map((point) => point.id))
    const nextPointIds = pointIds.filter((pointId) => existingPointIds.has(pointId))
    writeRefValue(knowledgeDeepLinkPointIds, nextPointIds)

    const singlePoint =
      nextPointIds.length === 1
        ? systemStore?.getKnowledgePointById?.(nextPointIds[0])
        : null

    writeRefValue(knowledgeSearchKeyword, nextKeyword || singlePoint?.title || '')
    writeRefValue(knowledgeTagFilter, nextTag)
    writeRefValue(knowledgeUsageFilter, nextUsage)
  }

  const describeKnowledgePointUsage = (point) => {
    const usage = getKnowledgePointUsage(point)
    if (usage.profiles.length <= 0) {
      return t(
        '\u8fd8\u6ca1\u6709\u89d2\u8272\u7ed1\u5b9a\u8fd9\u4e2a\u767e\u79d1\u6761\u76ee\u3002',
        'No role profile is bound to this entry yet.',
      )
    }

    const profileCount = usage.profiles.length
    if (point?.enabled === false) {
      return t(
        `\u5df2\u88ab ${profileCount} \u4e2a\u89d2\u8272\u7ed1\u5b9a\uff0c\u4f46\u5f53\u524d\u505c\u7528\uff0c\u4e0d\u4f1a\u6ce8\u5165 Chat\u3002`,
        `${profileCount} role profiles are bound, but this entry is disabled and will not be injected into Chat.`,
      )
    }
    if (usage.chatBindingCount <= 0) {
      return t(
        `\u5df2\u88ab ${profileCount} \u4e2a\u89d2\u8272\u7ed1\u5b9a\uff1b\u8fd9\u4e9b\u89d2\u8272\u5c1a\u672a\u7ed1\u5b9a\u5230 Chat \u4f1a\u8bdd\uff0c\u56e0\u6b64\u6682\u672a\u8fdb\u5165 Chat \u63d0\u793a\u8bcd\u94fe\u8def\u3002`,
        `${profileCount} role profiles are bound; none are bound to Chat contacts yet, so this entry is not in the Chat prompt chain.`,
      )
    }
    return t(
      `\u5df2\u88ab ${profileCount} \u4e2a\u89d2\u8272\u7ed1\u5b9a\uff0c\u5176\u4e2d ${usage.chatProfileCount} \u4e2a\u89d2\u8272\u5df2\u8fde\u63a5 ${usage.chatBindingCount} \u4e2a Chat \u4f1a\u8bdd\uff1b\u542f\u7528\u65f6\u4f1a\u8fdb\u5165\u8fd9\u4e9b\u4f1a\u8bdd\u7684\u63d0\u793a\u8bcd\u94fe\u8def\u3002`,
      `${profileCount} role profiles are bound; ${usage.chatProfileCount} profiles connect to ${usage.chatBindingCount} Chat contacts, so this enabled entry enters those Chat prompt chains.`,
    )
  }

  const formatKnowledgePointProfileNames = (point) => {
    const usage = getKnowledgePointUsage(point)
    if (usage.profiles.length <= 0) return ''
    const names = usage.profiles
      .map((profile) =>
        typeof profile.name === 'string' && profile.name.trim()
          ? profile.name.trim()
          : t('\u672a\u547d\u540d\u89d2\u8272', 'Unnamed role'),
      )
      .slice(0, 4)
    const overflow = Math.max(0, usage.profiles.length - names.length)
    return overflow > 0 ? `${names.join(' / ')} +${overflow}` : names.join(' / ')
  }

  return {
    boundKnowledgePointCount,
    chatReadyKnowledgePointCount,
    compareKnowledgePointTitle,
    describeKnowledgePointUsage,
    enabledKnowledgePointCount,
    formatKnowledgePointProfileNames,
    getKnowledgePointUpdatedAt,
    getKnowledgePointUsage,
    getKnowledgePointUsageBadge,
    getKnowledgePointUsageState,
    isDeepLinkedKnowledgePoint,
    knowledgeDeepLinkActive,
    knowledgeDeepLinkPoints,
    knowledgeDeepLinkSourceLabel,
    knowledgeDeepLinkSummary,
    knowledgeSearchPlaceholder,
    knowledgeTagFilterOptions,
    knowledgeUsageFilterOptions,
    knowledgeUsageSortOptions,
    normalizedKnowledgeSearchKeyword,
    roleProfileChatBindingMap,
    scopedKnowledgePoints,
    searchedKnowledgePoints,
    syncWorldBookDeepLink,
    visibleKnowledgePoints,
  }
}
