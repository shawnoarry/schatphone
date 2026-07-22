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
          title: t('设定文本', 'Setting texts'),
          kind: 'independent',
          state: issueCount > 0 ? 'attention' : activeTextCount > 0 ? 'active' : 'empty',
          status:
            issueCount > 0
              ? t(`${issueCount} 份待确认`, `${issueCount} to review`)
              : activeTextCount > 0
                ? t(`${activeTextCount} 份已启用`, `${activeTextCount} active`)
                : t('尚未启用', 'None active'),
          detail: t(
            `Book 中共有 ${catalogTextCount} 份可选文稿；在这里逐份决定当前世界使用哪些。`,
            `${catalogTextCount} manuscript(s) are available in Book; independently choose any combination, including none.`,
          ),
        },
        {
          id: 'knowledge',
          icon: 'fas fa-sitemap',
          title: t('结构化百科条目', 'Structured encyclopedia'),
          kind: 'optional',
          state: enabledKnowledgeCount > 0 ? 'active' : 'optional',
          status:
            knowledgeCount > 0
              ? t(`${enabledKnowledgeCount} / ${knowledgeCount} 已启用`, `${enabledKnowledgeCount} / ${knowledgeCount} enabled`)
              : t('可选', 'Optional'),
          detail: t(
            '供角色按需引用的短条目；与 Book 中可整篇启用的百科文稿分开管理。',
            'Short entries for role-specific recall, managed separately from full encyclopedia manuscripts in Book.',
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
            '定义这个世界需要哪些角色字段，具体人物资料仍由通讯录填写。',
            'Defines fields this world needs; Contacts still owns each person\'s values.',
          ),
        },
        {
          id: 'pack',
          icon: 'fas fa-puzzle-piece',
          title: t('功能与应用', 'Capabilities and apps'),
          kind: 'optional',
          state: hasActivePackLayer ? 'active' : 'optional',
          status:
            expansionCount > 0
              ? t(`${expansionCount} 个扩展已启用`, `${expansionCount} expansion(s)`)
              : capabilityCount > 0
                ? t(`${capabilityCount} 项能力`, `${capabilityCount} capabilities`)
                : t('可选', 'Optional'),
          detail: t(
            '仅管理应用入口、服务模板等已审核能力，不承载或自动绑定 Book 文稿。',
            'Only manages reviewed app and service capabilities; it never contains or auto-binds Book text.',
          ),
        },
        {
          id: 'kernel',
          icon: 'fas fa-shield-halved',
          title: t('兼容兜底', 'Compatibility fallback'),
          kind: 'advanced',
          state: fallbackCharCount > 0 ? 'active' : 'optional',
          status:
            fallbackCharCount > 0
              ? t(`${fallbackCharCount} 字`, `${fallbackCharCount} chars`)
              : t('未设置', 'Not set'),
          detail: t(
            '只在没有启用 Book 设定文本时提供短说明，不是第二套世界书。',
            'A short fallback only when no Book text is active, not a second worldbook system.',
          ),
        },
      ],
    }
  })

  return {
    worldSettingWorkspace,
  }
}
