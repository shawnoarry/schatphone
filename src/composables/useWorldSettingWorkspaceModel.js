import { computed } from 'vue'

const defaultT = (zh, en) => en || zh

const readValue = (source) =>
  source && typeof source === 'object' && 'value' in source ? source.value : source

const readCount = (value) => {
  const numeric = Number(readValue(value))
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0
}

const readArrayCount = (value) => {
  const items = readValue(value)
  return Array.isArray(items) ? items.length : 0
}

export function useWorldSettingWorkspaceModel({
  worldOverview,
  activeBookSourceCount,
  sourcePickerAssets,
  bookSourceIssueCount,
  worldProfileTemplates,
  enabledExpansionPackIds,
  fallbackWorldview,
  t = defaultT,
} = {}) {
  const worldSettingWorkspace = computed(() => {
    const overview = readValue(worldOverview) || {}
    const activeTextCount = readCount(activeBookSourceCount)
    const catalogTextCount = readArrayCount(sourcePickerAssets)
    const issueCount = readCount(bookSourceIssueCount)
    const profileTemplateCount = readArrayCount(worldProfileTemplates)
    const expansionIds = readValue(enabledExpansionPackIds)
    const expansionCount = Array.isArray(expansionIds)
      ? expansionIds.filter((id) => id && id !== 'default_world').length
      : 0
    const fallbackCharCount = String(readValue(fallbackWorldview) || '').length
    const knowledgeCount = readCount(overview.knowledgeCount)
    const enabledKnowledgeCount = readCount(overview.enabledKnowledgeCount)
    const capabilityCount =
      readCount(overview.worldPackAppBindingCount) +
      readCount(overview.worldPackServiceTemplateCount)
    const hasActivePackLayer = expansionCount > 0 || capabilityCount > 0
    const activeLayerCount = [
      activeTextCount > 0,
      enabledKnowledgeCount > 0,
      profileTemplateCount > 0,
      hasActivePackLayer,
      fallbackCharCount > 0,
    ].filter(Boolean).length
    const identityTitle =
      typeof overview.identity?.title === 'string' ? overview.identity.title.trim() : ''
    const activeWorldTitle = !identityTitle || identityTitle === 'Current world'
      ? t('当前世界设定', 'Current world setting')
      : identityTitle

    const state = issueCount > 0 ? 'attention' : activeLayerCount > 0 ? 'active' : 'empty'

    return {
      activeWorldTitle,
      state,
      status:
        state === 'attention'
          ? t('需要确认', 'Needs review')
          : state === 'active'
            ? t('设定生效中', 'Settings active')
            : t('未启用设定层', 'No layers active'),
      metrics: [
        {
          id: 'active-texts',
          value: activeTextCount,
          label: t('已启用设定', 'Active texts'),
        },
        {
          id: 'book-catalog',
          value: catalogTextCount,
          label: t('Book 可选文本', 'Book catalog'),
        },
        {
          id: 'issues',
          value: issueCount,
          label: t('需要确认', 'Needs review'),
          tone: issueCount > 0 ? 'warning' : 'quiet',
        },
      ],
      layers: [
        {
          id: 'sources',
          icon: 'fas fa-book-open',
          title: t('书籍设定', 'Book texts'),
          kind: 'independent',
          state: issueCount > 0 ? 'attention' : activeTextCount > 0 ? 'active' : 'empty',
          status:
            issueCount > 0
              ? t(`${issueCount} 份待确认`, `${issueCount} to review`)
              : activeTextCount > 0
                ? t(`${activeTextCount} 份已启用`, `${activeTextCount} active`)
                : t('尚未启用', 'None active'),
          detail: t(
            `书架里有 ${catalogTextCount} 本书可选；在这里决定这个世界要读哪几本。`,
            `${catalogTextCount} book(s) on the shelf; choose which ones this world reads.`,
          ),
        },
        {
          id: 'knowledge',
          icon: 'fas fa-sitemap',
          title: t('百科便签', 'Encyclopedia notes'),
          kind: 'optional',
          state: enabledKnowledgeCount > 0 ? 'active' : 'optional',
          status:
            knowledgeCount > 0
              ? t(`${enabledKnowledgeCount} / ${knowledgeCount} 已启用`, `${enabledKnowledgeCount} / ${knowledgeCount} enabled`)
              : t('可选', 'Optional'),
          detail: t(
            '写给角色的短条目；绑定给谁，谁聊天时就能想起来。',
            'Short notes for roles; once bound, that role recalls them in chat.',
          ),
        },
        {
          id: 'templates',
          icon: 'fas fa-id-card',
          title: t('角色档案模板', 'Profile templates'),
          kind: 'optional',
          state: profileTemplateCount > 0 ? 'active' : 'optional',
          status:
            profileTemplateCount > 0
              ? t(`${profileTemplateCount} 个模板`, `${profileTemplateCount} template(s)`)
              : t('可选', 'Optional'),
          detail: t(
            '定义这个世界里的角色需要填哪些资料；具体内容到通讯录里写。',
            'Decide which profile fields this world needs; the actual values are filled in Contacts.',
          ),
        },
        {
          id: 'pack',
          icon: 'fas fa-puzzle-piece',
          title: t('功能与应用', 'Apps & features'),
          kind: 'optional',
          state: hasActivePackLayer ? 'active' : 'optional',
          status:
            expansionCount > 0
              ? t(`${expansionCount} 个扩展已启用`, `${expansionCount} expansion(s)`)
              : capabilityCount > 0
                ? t(`${capabilityCount} 项能力`, `${capabilityCount} capabilities`)
                : t('可选', 'Optional'),
          detail: t(
            '管理这个世界里能用的应用和功能；和书架上的书互不影响。',
            'Manage the apps and features available in this world; independent from the bookshelf.',
          ),
        },
        {
          id: 'kernel',
          icon: 'fas fa-shield-halved',
          title: t('备用世界观', 'Fallback worldview'),
          kind: 'advanced',
          state: fallbackCharCount > 0 ? 'active' : 'optional',
          status:
            fallbackCharCount > 0
              ? t(`${fallbackCharCount} 字`, `${fallbackCharCount} chars`)
              : t('未设置', 'Not set'),
          detail: t(
            '书架没有启用任何文本时，临时顶替的一段简短说明。',
            'A short note that fills in only when no book is active.',
          ),
        },
      ],
    }
  })

  return {
    worldSettingWorkspace,
  }
}
