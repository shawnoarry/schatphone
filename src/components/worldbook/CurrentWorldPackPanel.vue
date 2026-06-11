<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  overview: {
    type: Object,
    required: true,
  },
  packs: {
    type: Array,
    default: () => [],
  },
  selectedPackId: {
    type: String,
    default: '',
  },
  activationReview: {
    type: Object,
    default: null,
  },
  enabledPacks: {
    type: Array,
    default: () => [],
  },
  worldProfile: {
    type: Object,
    default: null,
  },
  recommendationReview: {
    type: Object,
    default: null,
  },
  worldProfileLoading: {
    type: Boolean,
    default: false,
  },
  worldProfileNotice: {
    type: String,
    default: '',
  },
  serviceTemplateRows: {
    type: Array,
    default: () => [],
  },
  appBindingRows: {
    type: Array,
    default: () => [],
  },
  templateRegistryRows: {
    type: Array,
    default: () => [],
  },
  templateProposalReview: {
    type: Object,
    default: null,
  },
  templateProposalDraft: {
    type: String,
    default: '',
  },
  templateProposalLoading: {
    type: Boolean,
    default: false,
  },
  templateProposalNotice: {
    type: String,
    default: '',
  },
  templateProposalNoticeTone: {
    type: String,
    default: 'info',
  },
  walletCurrencyOptions: {
    type: Array,
    default: () => [],
  },
  currencyDraft: {
    type: Object,
    default: () => ({
      code: '',
      labelZh: '',
      labelEn: '',
      symbol: '',
      rateToCny: '',
    }),
  },
  currencyNotice: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'select-pack',
  'activate-pack',
  'reset-pack',
  'analyze-world-profile',
  'enable-pack',
  'disable-pack',
  'extract-template-proposals',
  'review-template-proposal-draft',
  'update-template-proposal-draft',
  'confirm-template-proposal',
  'clear-template-proposal-review',
  'update-currency-draft',
  'save-currency-draft',
  'inject-pack-currency',
])

const { t } = useI18n()

const packName = computed(() =>
  t(
    props.overview.activePack?.title || '默认世界',
    props.overview.activePack?.name || 'Default world',
  ),
)

const selectedPack = computed(() =>
  props.packs.find((pack) => pack.id === props.selectedPackId) ||
  props.packs.find((pack) => pack.id === props.overview.activePack?.id) ||
  props.overview.activePack,
)

const selectedPackName = computed(() =>
  t(
    selectedPack.value?.title || '默认世界',
    selectedPack.value?.name || 'Default world',
  ),
)
const isSelectedPackActive = computed(() => selectedPack.value?.id === props.overview.activePack?.id)
const visibleEnabledPacks = computed(() => props.enabledPacks.filter((pack) => pack?.id !== 'default_world'))
const canResetWorldPack = computed(
  () => props.overview.activePack?.id !== 'default_world' || visibleEnabledPacks.value.length > 0,
)

const activationStateLabel = computed(() =>
  props.overview.activePack?.id === 'default_world'
    ? t('默认启用', 'Default active')
    : t('当前启用', 'Active'),
)

const activeAppCount = computed(() => props.appBindingRows.length)
const activeServiceCount = computed(() => props.serviceTemplateRows.length)
const enabledPackIds = computed(() => new Set(props.enabledPacks.map((pack) => pack.id)))
const recommendedRows = computed(() => props.recommendationReview?.grouped?.recommended || [])
const browseableRows = computed(() => props.recommendationReview?.grouped?.browseable || [])
const unsupportedRows = computed(() => props.recommendationReview?.grouped?.unsupported || [])

const packDisplayName = (pack = {}) => t(pack.title || pack.packTitle || pack.name || pack.packName || '', pack.name || pack.packName || pack.title || pack.packTitle || 'World Pack')
const packDisplayDescription = (pack = {}) => {
  const id = pack.id || pack.packId || ''
  const descriptionMap = {
    default_world: [
      '使用当前 Book 与世界书材料，不叠加额外世界默认值。',
      'Use current Book and WorldBook material without extra world defaults.',
    ],
    modern_parallel: [
      '现实感现代世界，适合媒体、外卖、社交系统等日常设定。',
      'A realistic contemporary world for media feeds, delivery services, and familiar social systems.',
    ],
    school_life: [
      '为校园设定加入课表、校内公告和学生事务语境。',
      'Adds campus schedules, class notices, and school-service context.',
    ],
    business_family: [
      '为财阀、企业和家族资源关系加入会议与办公室语境。',
      'Adds family-office, board-calendar, and resource hierarchy context.',
    ],
    urban_mystery: [
      '为都市怪谈或调查线加入传闻、异常地点和确认入口。',
      'Adds supernatural rumor and investigation context to an urban worldview.',
    ],
    survival_city: [
      '资源紧张的灾后都市，强调补给、调度、辖区和警报。',
      'A resource-constrained city where supply, dispatch, territory, and alerts matter.',
    ],
    fandom_parallel: [
      '以粉丝、行程、发布和订阅为核心的偶像企划世界。',
      'A fandom-centered world with publication feeds, schedules, events, and subscription notices.',
    ],
  }
  const mapped = descriptionMap[id]
  if (mapped) return t(mapped[0], mapped[1])
  return t(
    pack.descriptionZh || pack.summaryZh || pack.description || '',
    pack.description || pack.descriptionZh || pack.summaryZh || '',
  )
}

const traitLabel = (raw = '') => {
  const value = String(raw || '').trim()
  const labelMap = {
    'era:modern': t('现代', 'modern era'),
    'era:future': t('未来', 'future era'),
    'era:post_apocalyptic': t('灾后', 'post-disaster era'),
    'settingTraits:school': t('校园', 'school setting'),
    'settingTraits:entertainment': t('娱乐圈', 'entertainment setting'),
    'settingTraits:urban': t('都市', 'urban setting'),
    'settingTraits:business_family': t('财阀/家族', 'business-family setting'),
    'settingTraits:corporate': t('企业组织', 'corporate setting'),
    'settingTraits:survival': t('生存压力', 'survival setting'),
    'settingTraits:investigation': t('调查线', 'investigation setting'),
    'realism:realistic': t('现实风格', 'realistic style'),
    'realism:supernatural': t('超自然', 'supernatural style'),
    'socialRoles:student': t('学生角色', 'student roles'),
    'socialRoles:celebrity': t('艺人角色', 'celebrity roles'),
    'socialRoles:fan': t('粉丝角色', 'fan roles'),
    'socialRoles:manager': t('经纪/管理角色', 'manager roles'),
    'economyTraits:ordinary': t('普通经济', 'ordinary economy'),
    'economyTraits:luxury': t('高资源/奢华', 'luxury economy'),
    'economyTraits:corporate_controlled': t('企业控制资源', 'corporate-controlled economy'),
    'economyTraits:resource_scarce': t('资源稀缺', 'resource-scarce economy'),
    'technologyLevel:real_world': t('现实科技', 'real-world technology'),
  }
  return labelMap[value] || value.replace(/^[^:]+:/, '').replace(/_/g, ' ')
}

const fitStatusLabel = (status = '') => {
  const labelMap = {
    recommended: t('高度匹配', 'Strong match'),
    adaptable: t('可适配', 'Adaptable'),
    needs_context: t('需要确认背景', 'Needs context confirmation'),
    conflicting: t('可能冲突', 'May conflict'),
    unsupported: t('暂不支持', 'Unsupported'),
  }
  return labelMap[status] || t('可检查', 'Review needed')
}

const fitStatusSummary = (row = {}) => {
  const label = fitStatusLabel(row.fitStatus)
  const matched = [
    ...(Array.isArray(row.recommended?.matched) ? row.recommended.matched : []),
    ...(Array.isArray(row.adaptable?.matched) ? row.adaptable.matched : []),
  ].slice(0, 3)
  if (matched.length === 0) return label
  return `${label} · ${t('匹配', 'Matches')}: ${matched.map(traitLabel).join(' / ')}`
}

const worldProfileSummary = computed(() => {
  const profile = props.worldProfile || {}
  const traits = [
    profile.era ? `era:${profile.era}` : '',
    ...(Array.isArray(profile.settingTraits) ? profile.settingTraits.map((item) => `settingTraits:${item}`) : []),
    profile.realism ? `realism:${profile.realism}` : '',
    ...(Array.isArray(profile.socialRoles) ? profile.socialRoles.map((item) => `socialRoles:${item}`) : []),
  ].filter(Boolean)
  return traits.length ? traits.slice(0, 8).map(traitLabel).join(' / ') : t('尚未分析', 'Not analyzed yet')
})

const activationReviewCount = (...keys) =>
  Number(props.activationReview?.effectRows?.find((row) => keys.includes(row.key))?.count || 0)

const candidateAppCount = computed(() => activationReviewCount('app_bindings'))
const candidateServiceCount = computed(() => activationReviewCount('service_templates'))

const activeAppSummary = computed(() => {
  const titles = props.appBindingRows
    .map((row) => row.title)
    .filter(Boolean)
    .slice(0, 3)
  if (titles.length === 0) return t('App Store 暂无世界专属入口', 'No world entries in App Store yet')
  return titles.join(' / ')
})

const effectRows = computed(() => [
  {
    key: 'worldview',
    icon: 'fas fa-scroll',
    label: t('世界观文本', 'Worldview text'),
    value: props.overview.hasWorldview
      ? t(`已写入 ${props.overview.worldviewCharCount} 字`, `${props.overview.worldviewCharCount} characters`)
      : t('尚未写入', 'Empty'),
  },
  {
    key: 'knowledge',
    icon: 'fas fa-sitemap',
    label: t('启用百科', 'Enabled encyclopedia'),
    value: t(
      `${props.overview.enabledKnowledgeCount} 条启用，${props.overview.disabledKnowledgeCount} 条停用`,
      `${props.overview.enabledKnowledgeCount} enabled, ${props.overview.disabledKnowledgeCount} disabled`,
    ),
  },
  {
    key: 'templates',
    icon: 'fas fa-id-card',
    label: t('世界角色模板', 'World role templates'),
    value: t(
      `${props.overview.profileTemplateCount} 个当前世界模板`,
      `${props.overview.profileTemplateCount} current-world templates`,
    ),
  },
  {
    key: 'app_bindings',
    icon: 'fas fa-mobile-screen-button',
    label: t('世界应用绑定', 'World app bindings'),
    value: t(
      `${props.overview.worldPackAppBindingCount || 0} 个应用形态`,
      `${props.overview.worldPackAppBindingCount || 0} app bindings`,
    ),
  },
  {
    key: 'service_templates',
    icon: 'fas fa-comments',
    label: t('服务号模板', 'Service templates'),
    value: t(
      `${props.overview.worldPackServiceTemplateCount || 0} 个模板`,
      `${props.overview.worldPackServiceTemplateCount || 0} templates`,
    ),
  },
])

const reviewRows = computed(() => {
  if (!props.activationReview || !Array.isArray(props.activationReview.effectRows)) return []
  const labelMap = {
    book_sources: t('设定文本', 'Setting text'),
    encyclopedia: t('百科', 'Encyclopedia'),
    knowledge: t('百科', 'Encyclopedia'),
    templates: t('角色模板', 'Role templates'),
    app_bindings: t('世界应用', 'World apps'),
    service_templates: t('服务号模板', 'Service templates'),
  }
  const iconMap = {
    book_sources: 'fas fa-link',
    encyclopedia: 'fas fa-sitemap',
    knowledge: 'fas fa-sitemap',
    templates: 'fas fa-id-card',
    app_bindings: 'fas fa-mobile-screen-button',
    service_templates: 'fas fa-comments',
  }
  return props.activationReview.effectRows.map((row) => ({
    ...row,
    icon: iconMap[row.key] || 'fas fa-circle-dot',
    label: labelMap[row.key] || row.label,
    value: t(`${row.count} 项`, `${row.count} items`),
  }))
})

const onSelectPack = (event) => {
  emit('select-pack', event.target.value)
}

const serviceTemplateKindLabel = (row) =>
  row?.kind === 'official' ? t('公众号', 'Official') : t('服务号', 'Service')

const appBindingKindLabel = (row) => {
  const labelMap = {
    marketplace: t('市场入口', 'Marketplace'),
    publication_feed: t('发布入口', 'Publication'),
    reservation: t('预约入口', 'Reservation'),
    transit: t('交通入口', 'Transit'),
    subscription: t('订阅入口', 'Subscription'),
    dispatch: t('调度入口', 'Dispatch'),
  }
  return labelMap[row?.archetype] || t('世界应用', 'World app')
}
const templateRegistrySummary = computed(() =>
  props.templateRegistryRows
    .map((template) => `${template.label || template.id} -> ${template.moduleKey}`)
    .join(' / '),
)

const confidenceLabel = (value) => {
  const labelMap = {
    high: t('高置信度', 'High confidence'),
    medium: t('中置信度', 'Medium confidence'),
    low: t('低置信度', 'Low confidence'),
  }
  return labelMap[value] || t('未标记', 'Unmarked')
}

const rejectionReasonLabel = (value) => {
  const labelMap = {
    low_confidence: t('低置信度，需要人工重新提交', 'Low confidence; revise manually before confirming'),
    duplicate_binding: t('当前世界包已有同名入口', 'Already exists in the current world pack'),
    unknown_template: t('不在内置模板白名单中', 'Not in the built-in template whitelist'),
    needs_dedicated_app: t('需要专属 App 壳，不映射到 Shopping', 'Needs a dedicated app shell; not mapped onto Shopping'),
  }
  return labelMap[value] || t('未知拒绝原因', 'Unknown rejection reason')
}

const templateTargetLabel = (proposal = {}) => {
  const template = proposal.template || {}
  return `${template.moduleKey || 'unknown'}${template.route ? ` (${template.route})` : ''}`
}

const templateReviewRowCount = computed(
  () =>
    (props.templateProposalReview?.confirmableProposals?.length || 0) +
    (props.templateProposalReview?.rejectedProposals?.length || 0),
)

const templateReviewIsEmpty = computed(
  () => Boolean(props.templateProposalReview) && templateReviewRowCount.value === 0,
)

const templateNoticeToneClass = computed(() => `is-${props.templateProposalNoticeTone || 'info'}`)
const activePackCurrencies = computed(() =>
  Array.isArray(props.overview.activePack?.economy?.currencies)
    ? props.overview.activePack.economy.currencies
    : [],
)
const activeCurrencySummary = computed(() => {
  if (activePackCurrencies.value.length === 0) {
    return t('未注入世界专属货币', 'No world currency injected')
  }
  return activePackCurrencies.value.map((currency) => currency.code).join(' / ')
})
const walletCurrencyCodeSet = computed(
  () => new Set(props.walletCurrencyOptions.map((currency) => currency?.code).filter(Boolean)),
)

const updateCurrencyDraft = (key, value) => {
  emit('update-currency-draft', { key, value })
}
</script>

<template>
  <section
    class="current-world-pack"
    data-testid="worldbook-current-pack"
  >
    <div class="current-world-pack__hero">
      <span class="current-world-pack__glyph" aria-hidden="true">
        <i class="fas fa-cube"></i>
      </span>
      <div class="current-world-pack__hero-main">
        <div class="current-world-pack__header">
          <div class="min-w-0">
            <p class="current-world-pack__eyebrow">
              {{ t('当前设定包', 'Current World Pack') }}
            </p>
            <h2
              class="current-world-pack__title"
              data-testid="worldbook-current-pack-name"
            >
              {{ packName }}
            </h2>
          </div>
          <span
            class="current-world-pack__state"
            data-testid="worldbook-current-pack-state"
          >
            {{ activationStateLabel }}
          </span>
        </div>

        <p class="current-world-pack__copy">
          {{
            t(
              '这一版先把世界书作为默认设定包使用：它不会模拟下载或解锁，只负责把当前世界材料稳定交给 Chat 与运行时。',
              'This version uses WorldBook as the default pack: no simulated downloads or unlocks, just stable world material for Chat and runtime.',
            )
          }}
        </p>
      </div>
    </div>

    <div
      class="current-world-pack__handoff-summary"
      data-testid="worldbook-current-pack-active-summary"
    >
      <span>
        <strong>{{ packName }}</strong>
        {{ t('已启用', 'active') }}
      </span>
      <span>
        {{ t('App Store 世界分区', 'App Store World section') }}:
        <strong>{{ activeAppCount }}</strong>
      </span>
      <span>
        {{ t('Chat 可添加服务号', 'Chat service accounts') }}:
        <strong>{{ activeServiceCount }}</strong>
      </span>
      <small>{{ activeAppSummary }}</small>
    </div>

    <div class="current-world-pack__profile" data-testid="worldbook-world-profile">
      <div>
        <p>{{ t('AI 世界画像', 'AI World Profile') }}</p>
        <strong>{{ worldProfileSummary }}</strong>
        <small v-if="worldProfile?.confidence">
          {{ t('置信度', 'Confidence') }}: {{ confidenceLabel(worldProfile.confidence) }}
        </small>
      </div>
      <button
        type="button"
        :disabled="worldProfileLoading"
        data-testid="worldbook-analyze-world-profile"
        @click="emit('analyze-world-profile')"
      >
        {{ worldProfileLoading ? t('分析中', 'Analyzing') : t('分析并推荐拓展包', 'Analyze for expansions') }}
      </button>
      <small v-if="worldProfileNotice">{{ worldProfileNotice }}</small>
    </div>

    <div class="current-world-pack__enabled" data-testid="worldbook-enabled-expansions">
      <div class="current-world-pack__expansion-head">
        <div>
          <p>{{ t('已启用拓展包', 'Enabled Expansions') }}</p>
          <strong>{{ visibleEnabledPacks.length }}</strong>
        </div>
      </div>
      <div v-if="visibleEnabledPacks.length > 0" class="current-world-pack__pack-list">
        <div
          v-for="pack in visibleEnabledPacks"
          :key="pack.id"
          class="current-world-pack__pack-row"
          :data-testid="`worldbook-enabled-pack-${pack.id}`"
        >
          <strong>{{ packDisplayName(pack) }}</strong>
          <span>{{ packDisplayDescription(pack) }}</span>
          <button
            type="button"
            :data-testid="`worldbook-disable-pack-${pack.id}`"
            @click="emit('disable-pack', pack.id)"
          >
            {{ t('停用', 'Disable') }}
          </button>
        </div>
      </div>
      <p v-else>{{ t('还没有启用拓展包。', 'No expansion packs are enabled yet.') }}</p>
    </div>

    <div class="current-world-pack__recommendations" data-testid="worldbook-pack-recommendations">
      <div class="current-world-pack__expansion-head">
        <div>
          <p>{{ t('推荐拓展包', 'Recommended Expansions') }}</p>
          <strong>{{ recommendedRows.length }}</strong>
        </div>
      </div>
      <div class="current-world-pack__pack-list">
        <div
          v-for="row in recommendedRows"
          :key="row.packId"
          class="current-world-pack__pack-row"
          :data-testid="`worldbook-recommended-pack-${row.packId}`"
        >
          <strong>{{ packDisplayName(row) }}</strong>
          <span>{{ fitStatusSummary(row) }}</span>
          <button
            type="button"
            :class="{ 'is-enabled': enabledPackIds.has(row.packId) }"
            :data-testid="`worldbook-enable-pack-${row.packId}`"
            @click="enabledPackIds.has(row.packId) ? emit('disable-pack', row.packId) : emit('enable-pack', row.packId)"
          >
            {{ enabledPackIds.has(row.packId) ? t('停用', 'Disable') : t('启用', 'Enable') }}
          </button>
        </div>
      </div>
    </div>

    <details class="current-world-pack__all-packs" data-testid="worldbook-pack-all" open>
      <summary>{{ t('全部拓展包', 'All Packs') }}</summary>
      <div class="current-world-pack__pack-list">
        <div
          v-for="row in browseableRows"
          :key="row.packId"
          class="current-world-pack__pack-row"
          :data-testid="`worldbook-all-pack-${row.packId}`"
        >
          <strong>{{ packDisplayName(row) }}</strong>
          <span>{{ fitStatusSummary(row) }}</span>
          <button
            type="button"
            :class="{ 'is-enabled': enabledPackIds.has(row.packId) }"
            :data-testid="`worldbook-enable-all-pack-${row.packId}`"
            @click="enabledPackIds.has(row.packId) ? emit('disable-pack', row.packId) : emit('enable-pack', row.packId)"
          >
            {{ enabledPackIds.has(row.packId) ? t('停用', 'Disable') : t('启用', 'Enable') }}
          </button>
        </div>
        <div
          v-for="row in unsupportedRows"
          :key="row.packId"
          class="current-world-pack__pack-row is-disabled"
          :data-testid="`worldbook-unsupported-pack-${row.packId}`"
        >
          <strong>{{ packDisplayName(row) }}</strong>
          <span>{{ t('当前程序不支持，需要专门 App。', 'Unsupported: needs a dedicated app or product support.') }}</span>
        </div>
      </div>
    </details>

    <div
      class="current-world-pack__candidate-preview"
      data-testid="worldbook-current-pack-candidate-preview"
    >
      <span>{{ t('待激活预览', 'Activation preview') }}</span>
      <strong>{{ selectedPackName }}</strong>
      <small>
        {{
          t(
            `${candidateAppCount} 个 App Store 世界入口，${candidateServiceCount} 个 Chat 服务号模板`,
            `${candidateAppCount} App Store world entries, ${candidateServiceCount} Chat service templates`,
          )
        }}
      </small>
    </div>

    <div class="current-world-pack__selector-row">
      <label class="current-world-pack__selector">
        <span>{{ t('选择要启用的世界包', 'Choose a world pack') }}</span>
        <select
          :value="selectedPack?.id"
          data-testid="worldbook-current-pack-select"
          @change="onSelectPack"
        >
          <option
            v-for="pack in packs"
            :key="pack.id"
            :value="pack.id"
          >
            {{ t(pack.title, pack.name) }}
          </option>
        </select>
      </label>
      <button
        type="button"
        class="current-world-pack__reset"
        :disabled="!canResetWorldPack"
        data-testid="worldbook-current-pack-reset-default"
        @click="emit('reset-pack')"
      >
        {{ canResetWorldPack ? t('恢复默认世界', 'Restore default world') : t('默认世界已启用', 'Default world active') }}
      </button>
    </div>

    <div
      class="current-world-pack__effects"
      data-testid="worldbook-current-pack-effects"
    >
      <div
        v-for="row in effectRows"
        :key="row.key"
        class="current-world-pack__effect"
      >
        <span class="current-world-pack__effect-icon" aria-hidden="true">
          <i :class="row.icon"></i>
        </span>
        <span>{{ row.label }}</span>
        <strong>{{ row.value }}</strong>
      </div>
    </div>

    <section
      class="current-world-pack__economy"
      data-testid="worldbook-current-pack-economy"
    >
      <div class="current-world-pack__economy-head">
        <span class="current-world-pack__section-mark" aria-hidden="true">
          <i class="fas fa-coins"></i>
        </span>
        <div>
          <p>{{ t('经济与货币', 'Economy & currency') }}</p>
          <strong>{{ activeCurrencySummary }}</strong>
        </div>
      </div>
      <p class="current-world-pack__economy-copy">
        {{
          t(
            '这里只声明当前世界可用的专属货币；主币种和汇率仍在 Wallet 统一选择与维护。',
            'This only declares currencies for the active world; Wallet still owns the primary currency and exchange rates.',
          )
        }}
      </p>
      <div
        v-if="activePackCurrencies.length > 0"
        class="current-world-pack__currency-list"
      >
        <div
          v-for="currency in activePackCurrencies"
          :key="currency.code"
          class="current-world-pack__currency-row"
          :data-testid="`worldbook-pack-currency-${currency.code}`"
        >
          <div>
            <strong>{{ currency.code }}</strong>
            <span>{{ t(currency.labelZh || currency.code, currency.labelEn || currency.code) }}</span>
          </div>
          <button
            type="button"
            :data-testid="`worldbook-inject-currency-${currency.code}`"
            @click="emit('inject-pack-currency', currency)"
          >
            {{ walletCurrencyCodeSet.has(currency.code) ? t('已在 Wallet', 'In Wallet') : t('注入 Wallet', 'Inject') }}
          </button>
        </div>
      </div>
      <div class="current-world-pack__currency-form">
        <label>
          <span>{{ t('代码', 'Code') }}</span>
          <input
            :value="currencyDraft.code"
            maxlength="8"
            data-testid="worldbook-currency-code"
            placeholder="CRD"
            @input="updateCurrencyDraft('code', $event.target.value)"
          />
        </label>
        <label>
          <span>{{ t('中文名', 'Chinese name') }}</span>
          <input
            :value="currencyDraft.labelZh"
            data-testid="worldbook-currency-label-zh"
            placeholder="信用点"
            @input="updateCurrencyDraft('labelZh', $event.target.value)"
          />
        </label>
        <label>
          <span>{{ t('英文名', 'English name') }}</span>
          <input
            :value="currencyDraft.labelEn"
            data-testid="worldbook-currency-label-en"
            placeholder="Credits"
            @input="updateCurrencyDraft('labelEn', $event.target.value)"
          />
        </label>
        <label>
          <span>{{ t('符号', 'Symbol') }}</span>
          <input
            :value="currencyDraft.symbol"
            maxlength="12"
            data-testid="worldbook-currency-symbol"
            placeholder="CR"
            @input="updateCurrencyDraft('symbol', $event.target.value)"
          />
        </label>
        <label>
          <span>{{ t('1 单位约等于 CNY', '1 unit equals CNY') }}</span>
          <input
            :value="currencyDraft.rateToCny"
            inputmode="decimal"
            data-testid="worldbook-currency-rate-cny"
            placeholder="0.25"
            @input="updateCurrencyDraft('rateToCny', $event.target.value)"
          />
        </label>
        <button
          type="button"
          data-testid="worldbook-save-currency"
          @click="emit('save-currency-draft')"
        >
          {{ t('保存并注入 Wallet', 'Save & inject') }}
        </button>
      </div>
      <p
        v-if="currencyNotice"
        class="current-world-pack__currency-notice"
        data-testid="worldbook-currency-notice"
      >
        {{ currencyNotice }}
      </p>
    </section>

    <div
      v-if="activationReview"
      class="current-world-pack__review"
      data-testid="worldbook-current-pack-review"
    >
      <div class="current-world-pack__review-head">
        <div>
          <p>{{ t('激活审核', 'Activation review') }}</p>
          <strong>{{ selectedPackName }}</strong>
        </div>
        <span :class="{ 'is-blocked': activationReview.blocked }">
          {{ activationReview.blocked ? t('有缺失引用', 'Blocked') : t('可以激活', 'Ready') }}
        </span>
      </div>

      <div class="current-world-pack__review-grid">
        <div
          v-for="row in reviewRows"
          :key="row.key"
          class="current-world-pack__review-row"
        >
          <span class="current-world-pack__review-icon" aria-hidden="true">
            <i :class="row.icon"></i>
          </span>
          <span>{{ row.label }}</span>
          <strong>{{ row.value }}</strong>
        </div>
      </div>

      <div
        v-if="activationReview.blockers?.length"
        class="current-world-pack__blockers"
        data-testid="worldbook-current-pack-blockers"
      >
        <p
          v-for="blocker in activationReview.blockers"
          :key="`${blocker.type}-${blocker.id}`"
        >
          {{ t('缺失引用', 'Missing reference') }}: {{ blocker.id }}
        </p>
      </div>

      <button
        type="button"
        class="current-world-pack__activate"
        :disabled="activationReview.blocked || isSelectedPackActive"
        data-testid="worldbook-current-pack-activate"
        @click="emit('activate-pack')"
      >
        {{
          isSelectedPackActive
            ? t('已是当前世界', 'Already active')
            : t('确认激活这个世界包', 'Activate this pack')
        }}
      </button>
    </div>

    <div
      class="current-world-pack__apps"
      data-testid="worldbook-current-pack-app-bindings"
    >
      <div class="current-world-pack__apps-head">
        <span class="current-world-pack__section-mark" aria-hidden="true">
          <i class="fas fa-mobile-screen-button"></i>
        </span>
        <div>
          <p>{{ t('世界应用入口', 'World app entries') }}</p>
          <strong>
            {{
              appBindingRows.length > 0
                ? t(`${appBindingRows.length} 个已启用世界入口`, `${appBindingRows.length} enabled world entries`)
                : t('当前世界包没有应用绑定', 'No app bindings in the active pack')
            }}
          </strong>
        </div>
      </div>

      <p class="current-world-pack__apps-copy">
        {{
          t(
            '激活世界包后，这里只显示当前入口快照。要浏览、放置或打开世界入口，请到应用商城的 World 分区。',
            'After activation this is only a snapshot. Browse, place, or open world entries from the App Store World section.',
          )
        }}
      </p>

      <div
        v-if="appBindingRows.length > 0"
        class="current-world-pack__app-list"
      >
        <div
          v-for="row in appBindingRows"
          :key="row.id"
          class="current-world-pack__app-row"
          :data-testid="`worldbook-current-pack-app-binding-${row.id}`"
        >
          <div class="current-world-pack__app-main">
            <span>{{ appBindingKindLabel(row) }}</span>
            <strong>{{ row.title }}</strong>
            <p>{{ row.description || t('来自当前世界包的应用入口。', 'Generated from the active World Pack app binding.') }}</p>
            <small>
              {{ t('目标模块', 'Target module') }}: {{ row.targetLabel }}
            </small>
          </div>

          <div class="current-world-pack__app-action">
            <span class="is-ready">
              {{ t('在 App Store 管理', 'Managed in App Store') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <details
      class="current-world-pack__templates"
      data-testid="worldbook-current-pack-template-review"
      :aria-busy="templateProposalLoading ? 'true' : 'false'"
    >
      <summary class="current-world-pack__templates-head">
        <span class="current-world-pack__section-mark" aria-hidden="true">
          <i class="fas fa-wand-magic-sparkles"></i>
        </span>
        <div>
          <p>{{ t('非常规 App 提案审查', 'Nonstandard app proposal review') }}</p>
          <strong>
            {{
              templateProposalReview
                ? t(
                    `${templateProposalReview.confirmableProposals?.length || 0} 个可确认，${templateProposalReview.rejectedProposals?.length || 0} 个已拒绝`,
                    `${templateProposalReview.confirmableProposals?.length || 0} confirmable, ${templateProposalReview.rejectedProposals?.length || 0} rejected`,
                  )
                : t('等待 AI 提取或粘贴 JSON', 'Waiting for AI extraction or pasted JSON')
            }}
          </strong>
        </div>
      </summary>

      <p class="current-world-pack__templates-copy">
        {{
          t(
            '这里只审查世界观是否适合启用内置 App 外观入口；确认后只写入当前世界包 appBinding，不创建新模块、不写事件判定、不绕过 App Store 白名单。',
            'This only reviews whether the world should expose a whitelisted app-style entry; confirmation writes an appBinding to the current pack without creating modules, event rules, or unlisted App Store entries.',
          )
        }}
      </p>

      <div
        v-if="templateRegistryRows.length > 0"
        class="current-world-pack__template-registry"
        data-testid="worldbook-current-pack-template-registry"
        :title="templateRegistrySummary"
      >
        <span
          v-for="template in templateRegistryRows"
          :key="template.id"
          class="current-world-pack__template-chip"
        >
          {{ template.label || template.id }}
          <small>
            {{
              template.unsupportedReason
                ? t('需专属 App', 'Dedicated app')
                : template.moduleKey
            }}
          </small>
        </span>
      </div>

      <div class="current-world-pack__template-actions">
        <button
          type="button"
          :disabled="templateProposalLoading"
          data-testid="worldbook-current-pack-template-extract-ai"
          @click="emit('extract-template-proposals')"
        >
          {{
            templateProposalLoading
              ? t('提取中', 'Extracting')
              : t('AI 提取提案', 'Extract with AI')
          }}
        </button>
        <button
          type="button"
          :disabled="templateProposalLoading"
          data-testid="worldbook-current-pack-template-review-json"
          @click="emit('review-template-proposal-draft')"
        >
          {{ t('审查粘贴 JSON', 'Review pasted JSON') }}
        </button>
        <button
          type="button"
          :disabled="templateProposalLoading"
          data-testid="worldbook-current-pack-template-clear"
          @click="emit('clear-template-proposal-review')"
        >
          {{ t('清空', 'Clear') }}
        </button>
      </div>

      <div
        v-if="templateProposalLoading"
        class="current-world-pack__template-loading"
        data-testid="worldbook-current-pack-template-loading"
        role="status"
      >
        <span aria-hidden="true"><i class="fas fa-circle-notch fa-spin"></i></span>
        <div>
          <strong>{{ t('正在审查世界上下文', 'Reviewing world context') }}</strong>
          <p>
            {{
              t(
                'AI 只会在内置白名单里寻找可确认入口；结果仍需要你明确加入世界包。',
                'AI can only match built-in whitelisted entries; you still choose what gets added to the world pack.',
              )
            }}
          </p>
        </div>
      </div>

      <textarea
        class="current-world-pack__template-draft"
        :value="templateProposalDraft"
        rows="5"
        data-testid="worldbook-current-pack-template-draft"
        :placeholder="t('粘贴 proposals JSON，或直接运行 AI 提取。', 'Paste a proposals JSON payload, or run AI extraction.')"
        @input="emit('update-template-proposal-draft', $event.target.value)"
      ></textarea>

      <p
        v-if="templateProposalNotice"
        class="current-world-pack__template-notice"
        :class="templateNoticeToneClass"
        data-testid="worldbook-current-pack-template-notice"
        :data-notice-tone="templateProposalNoticeTone"
        role="status"
      >
        {{ templateProposalNotice }}
      </p>

      <div
        v-if="templateProposalReview"
        class="current-world-pack__template-results"
      >
        <div
          class="current-world-pack__template-summary"
          data-testid="worldbook-current-pack-template-review-summary"
        >
          {{
            t(
              `${templateProposalReview.confirmableProposals?.length || 0} 个入口需要你确认；${templateProposalReview.rejectedProposals?.length || 0} 个已被白名单/置信度规则挡下。`,
              `${templateProposalReview.confirmableProposals?.length || 0} entries need confirmation; ${templateProposalReview.rejectedProposals?.length || 0} were blocked by whitelist or confidence rules.`,
            )
          }}
        </div>

        <div
          v-if="templateReviewIsEmpty"
          class="current-world-pack__template-empty"
          data-testid="worldbook-current-pack-template-empty"
        >
          <span aria-hidden="true"><i class="fas fa-filter-circle-xmark"></i></span>
          <div>
            <strong>{{ t('没有可加入的世界 App', 'No world app entries to add') }}</strong>
            <p>
              {{
                t(
                  '空结果不会影响 App Store 或主屏；请补充世界材料或粘贴更明确的 proposals JSON 再审查。',
                  'An empty review does not change App Store or Home; add clearer world context or paste a more specific proposals JSON payload.',
                )
              }}
            </p>
          </div>
        </div>

        <div
          v-for="proposal in templateProposalReview.confirmableProposals || []"
          :key="`confirmable-${proposal.bindingId || proposal.templateId}`"
          class="current-world-pack__template-row"
          :data-testid="`worldbook-current-pack-template-confirmable-${proposal.bindingId || proposal.templateId}`"
        >
          <div class="current-world-pack__template-main">
            <span>{{ confidenceLabel(proposal.confidence) }}</span>
            <strong>{{ proposal.title }}</strong>
            <p>{{ proposal.description || proposal.template?.description }}</p>
            <small>
              {{ t('目标模块', 'Target module') }}: {{ templateTargetLabel(proposal) }}
            </small>
            <small v-if="proposal.evidence">
              {{ t('依据', 'Evidence') }}: {{ proposal.evidence }}
            </small>
          </div>
          <div class="current-world-pack__template-action">
            <span>{{ proposal.bindingId }}</span>
            <button
              type="button"
              :disabled="templateProposalLoading"
              :data-testid="`worldbook-current-pack-template-confirm-${proposal.bindingId || proposal.templateId}`"
              @click="emit('confirm-template-proposal', proposal)"
            >
              {{ t('加入当前世界包', 'Add to current pack') }}
            </button>
          </div>
        </div>

        <div
          v-for="proposal in templateProposalReview.rejectedProposals || []"
          :key="`rejected-${proposal.bindingId || proposal.templateId || proposal.title}`"
          class="current-world-pack__template-row is-rejected"
          :data-testid="`worldbook-current-pack-template-rejected-${proposal.bindingId || proposal.templateId || 'unknown'}`"
        >
          <div class="current-world-pack__template-main">
            <span>{{ confidenceLabel(proposal.confidence) }}</span>
            <strong>{{ proposal.title }}</strong>
            <p
              class="current-world-pack__template-rejection"
              :data-testid="`worldbook-current-pack-template-rejection-reason-${proposal.bindingId || proposal.templateId || 'unknown'}`"
              :data-rejection-reason="proposal.rejectionReason || 'unknown'"
            >
              <b>{{ t('已阻止', 'Blocked') }}</b>
              {{ rejectionReasonLabel(proposal.rejectionReason) }}
            </p>
            <small v-if="proposal.evidence">
              {{ t('依据', 'Evidence') }}: {{ proposal.evidence }}
            </small>
          </div>
          <div class="current-world-pack__template-action">
            <span>{{ proposal.templateId || t('未知模板', 'Unknown template') }}</span>
          </div>
        </div>
      </div>
    </details>

    <div
      class="current-world-pack__services"
      data-testid="worldbook-current-pack-service-templates"
    >
      <div class="current-world-pack__services-head">
        <span class="current-world-pack__section-mark" aria-hidden="true">
          <i class="fas fa-comments"></i>
        </span>
        <div>
          <p>{{ t('服务号模板确认', 'Service template confirmation') }}</p>
          <strong>
            {{
              serviceTemplateRows.length > 0
                ? t(`${serviceTemplateRows.length} 个可在 Chat 添加`, `${serviceTemplateRows.length} available in Chat`)
                : t('当前世界包没有服务号模板', 'No service templates in the active pack')
            }}
          </strong>
        </div>
      </div>

      <p class="current-world-pack__services-copy">
        {{
          t(
            '本轮只提示可用服务号数量，不在 WorldBook 里生成联系人；Chat 壳落完后，用户可在 Chat app 内添加对应服务号。',
            'WorldBook only shows service-account availability; Chat Services handles editing, AI review, and user opt-in.',
          )
        }}
      </p>

      <div
        class="current-world-pack__service-handoff"
        data-testid="worldbook-current-pack-service-handoff"
      >
        <i class="fas fa-comments" aria-hidden="true"></i>
        <span>
          {{
            t(
              `${activeServiceCount} 个服务号模板已随当前世界包启用，可稍后在 Chat app 内添加。`,
              `${activeServiceCount} service account templates are enabled for this world pack and can be managed in Chat Services.`,
            )
          }}
        </span>
      </div>

      <div
        v-if="serviceTemplateRows.length > 0"
        class="current-world-pack__service-list"
      >
        <div
          v-for="row in serviceTemplateRows"
          :key="row.id"
          class="current-world-pack__service-row"
          :data-testid="`worldbook-current-pack-service-template-${row.id}`"
        >
          <div class="current-world-pack__service-main">
            <span>{{ serviceTemplateKindLabel(row) }}</span>
            <strong>{{ row.title }}</strong>
            <p>{{ row.description || t('来自当前世界包的服务号模板。', 'Generated from the active World Pack template.') }}</p>
            <small v-if="row.linkedAppLabel">
              {{ t('世界应用', 'World app') }}: {{ row.linkedAppLabel }}
            </small>
            <small v-if="row.chatBindingLabel">
              {{ t('模块绑定', 'Module binding') }}: {{ row.chatBindingLabel }}
            </small>
          </div>

          <div class="current-world-pack__service-action">
            <span :class="{ 'is-generated': row.generated }">
              {{ row.generated ? t('已存在于 Chat', 'Already in Chat') : t('Chat 内添加', 'Add in Chat') }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.current-world-pack {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background:
    radial-gradient(circle at 18% 0%, var(--system-info-soft), transparent 34%),
    linear-gradient(180deg, var(--system-panel-bg), var(--system-surface-muted));
  box-shadow: var(--system-shadow-card);
  padding: 16px;
  color: var(--system-text);
}

.current-world-pack__hero {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
}

.current-world-pack__glyph {
  display: grid;
  place-items: center;
  width: 54px;
  height: 62px;
  border: 1px solid var(--system-control-border);
  border-radius: 20px;
  color: var(--system-info);
  background: var(--system-control-bg-strong);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight), var(--system-shadow-control);
}

.current-world-pack__hero-main {
  min-width: 0;
}

.current-world-pack__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.current-world-pack__eyebrow {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--system-text-muted);
}

.current-world-pack__title {
  margin-top: 3px;
  font-size: 24px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: 0;
}

.current-world-pack__state {
  flex-shrink: 0;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--system-info-soft);
  color: var(--system-info);
  font-size: 11px;
  font-weight: 700;
}

.current-world-pack__copy {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--system-text-muted);
}

.current-world-pack__handoff-summary,
.current-world-pack__candidate-preview {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  padding: 10px;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.current-world-pack__handoff-summary {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.current-world-pack__handoff-summary span,
.current-world-pack__candidate-preview span {
  min-width: 0;
}

.current-world-pack__handoff-summary strong,
.current-world-pack__candidate-preview strong {
  color: var(--system-text);
  font-weight: 800;
}

.current-world-pack__handoff-summary small,
.current-world-pack__candidate-preview small {
  grid-column: 1 / -1;
  color: var(--system-text-soft);
  font-size: 11px;
  overflow-wrap: anywhere;
}

.current-world-pack__profile,
.current-world-pack__enabled,
.current-world-pack__recommendations,
.current-world-pack__all-packs,
.current-world-pack__economy {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  padding: 12px;
}

.current-world-pack__profile {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.current-world-pack__profile p,
.current-world-pack__expansion-head p,
.current-world-pack__all-packs summary {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.current-world-pack__profile strong,
.current-world-pack__expansion-head strong {
  display: block;
  margin-top: 3px;
  color: var(--system-text);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.current-world-pack__profile small {
  grid-column: 1 / -1;
  color: var(--system-text-soft);
  font-size: 11px;
}

.current-world-pack__profile button,
.current-world-pack__pack-row button {
  min-height: 34px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  background: var(--system-control-bg-strong);
  color: var(--system-info);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
}

.current-world-pack__profile button:disabled,
.current-world-pack__pack-row button:disabled {
  opacity: 0.55;
}

.current-world-pack__pack-row button.is-enabled {
  border-color: color-mix(in srgb, var(--system-danger) 32%, var(--system-control-border));
  background: var(--system-danger-soft);
  color: var(--system-danger);
}

.current-world-pack__pack-list {
  display: grid;
  gap: 8px;
}

.current-world-pack__pack-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-sm);
  background: var(--system-surface-muted);
  padding: 10px;
}

.current-world-pack__pack-row strong {
  min-width: 0;
  color: var(--system-text);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.current-world-pack__pack-row span {
  grid-column: 1 / -1;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.current-world-pack__pack-row.is-disabled {
  opacity: 0.68;
}

.current-world-pack__selector-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;
  margin-top: 14px;
}

.current-world-pack__selector {
  display: grid;
  gap: 6px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 10px;
  background: var(--system-control-bg);
  color: var(--system-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.current-world-pack__selector select {
  min-height: 42px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  color: var(--system-text);
  padding: 0 10px;
}

.current-world-pack__reset {
  min-height: 42px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  color: var(--system-info);
  padding: 0 12px;
  font-size: 12px;
  font-weight: 800;
}

.current-world-pack__reset:disabled {
  cursor: not-allowed;
  color: var(--system-text-soft);
  background: var(--system-control-bg);
}

.current-world-pack__effects {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.current-world-pack__effect {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 8px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  padding: 10px;
}

.current-world-pack__effect-icon,
.current-world-pack__review-icon,
.current-world-pack__section-mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 12px;
  color: var(--system-info);
  background: var(--system-info-soft);
}

.current-world-pack__effect > span:not(.current-world-pack__effect-icon) {
  min-width: 0;
  font-size: 12px;
  color: var(--system-text-muted);
}

.current-world-pack__effect strong {
  grid-column: 2;
  font-size: 12px;
  color: var(--system-text);
}

.current-world-pack__review {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-surface-muted);
  padding: 12px;
}

.current-world-pack__review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.current-world-pack__review-head p {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.current-world-pack__review-head strong {
  display: block;
  margin-top: 2px;
  color: var(--system-text);
  font-size: 13px;
}

.current-world-pack__review-head span {
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  padding: 5px 8px;
  color: var(--system-success);
  background: var(--system-success-soft);
  font-size: 11px;
  font-weight: 700;
}

.current-world-pack__review-head span.is-blocked {
  color: var(--system-danger);
  background: var(--system-danger-soft);
}

.current-world-pack__review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.current-world-pack__review-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 2px;
  border: 1px solid var(--system-control-border);
  border-radius: 8px;
  background: var(--system-control-bg);
  padding: 8px;
}

.current-world-pack__review-row > span:not(.current-world-pack__review-icon) {
  align-self: end;
  color: var(--system-text-muted);
  font-size: 11px;
}

.current-world-pack__review-row strong {
  grid-column: 2;
  color: var(--system-text);
  font-size: 13px;
}

.current-world-pack__blockers {
  display: grid;
  gap: 4px;
  color: var(--system-danger);
  font-size: 12px;
}

.current-world-pack__activate {
  min-height: 38px;
  border: 0;
  border-radius: 8px;
  color: var(--system-text-inverse);
  background: var(--system-text);
  font-size: 12px;
  font-weight: 800;
}

.current-world-pack__activate:disabled {
  cursor: not-allowed;
  color: var(--system-text-soft);
  background: var(--system-control-border);
}

.current-world-pack__apps,
.current-world-pack__templates,
.current-world-pack__services {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
  padding: 12px;
}

.current-world-pack__apps-head,
.current-world-pack__templates-head,
.current-world-pack__services-head,
.current-world-pack__economy-head {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
}

.current-world-pack__templates-head {
  cursor: pointer;
  list-style: none;
}

.current-world-pack__templates-head::-webkit-details-marker {
  display: none;
}

.current-world-pack__apps-head p,
.current-world-pack__templates-head p,
.current-world-pack__services-head p,
.current-world-pack__economy-head p {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.current-world-pack__apps-head strong,
.current-world-pack__templates-head strong,
.current-world-pack__services-head strong,
.current-world-pack__economy-head strong {
  display: block;
  margin-top: 2px;
  color: var(--system-text);
  font-size: 13px;
}

.current-world-pack__apps-copy,
.current-world-pack__templates-copy,
.current-world-pack__services-copy,
.current-world-pack__economy-copy {
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.current-world-pack__currency-list {
  display: grid;
  gap: 8px;
}

.current-world-pack__currency-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-sm);
  background: var(--system-surface-muted);
  padding: 10px;
}

.current-world-pack__currency-row div {
  min-width: 0;
}

.current-world-pack__currency-row strong {
  display: block;
  color: var(--system-text);
  font-size: 13px;
}

.current-world-pack__currency-row span {
  color: var(--system-text-muted);
  font-size: 11px;
}

.current-world-pack__currency-row button,
.current-world-pack__currency-form button {
  min-height: 34px;
  border: 1px solid var(--system-control-border);
  border-radius: 8px;
  background: var(--system-text);
  color: var(--system-text-inverse);
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
}

.current-world-pack__currency-form {
  display: grid;
  grid-template-columns: 0.7fr 1fr 1fr 0.65fr 1fr auto;
  gap: 8px;
  align-items: end;
}

.current-world-pack__currency-form label {
  min-width: 0;
  display: grid;
  gap: 5px;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.current-world-pack__currency-form input {
  min-height: 34px;
  width: 100%;
  border: 1px solid var(--system-control-border);
  border-radius: 8px;
  background: var(--system-panel-bg);
  color: var(--system-text);
  padding: 0 9px;
  font-size: 12px;
  outline: none;
}

.current-world-pack__currency-notice {
  border: 1px solid var(--system-success-soft);
  border-radius: 8px;
  background: var(--system-success-soft);
  color: var(--system-success);
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 800;
}

.current-world-pack__service-handoff {
  min-height: 38px;
  border: 1px solid var(--system-control-border);
  border-radius: 8px;
  background: var(--system-panel-bg);
  color: var(--system-text);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
}

.current-world-pack__service-handoff {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  line-height: 1.45;
}

.current-world-pack__service-handoff i {
  color: var(--system-info);
}

.current-world-pack__app-list,
.current-world-pack__service-list {
  display: grid;
  gap: 8px;
}

.current-world-pack__app-row,
.current-world-pack__service-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  padding: 12px;
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.current-world-pack__app-main,
.current-world-pack__service-main {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.current-world-pack__app-main span,
.current-world-pack__service-main span {
  color: var(--system-info);
  font-size: 11px;
  font-weight: 800;
}

.current-world-pack__app-main strong,
.current-world-pack__service-main strong {
  color: var(--system-text);
  font-size: 13px;
}

.current-world-pack__app-main p,
.current-world-pack__app-main small,
.current-world-pack__service-main p,
.current-world-pack__service-main small {
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.current-world-pack__app-action,
.current-world-pack__service-action {
  display: flex;
  min-width: 124px;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
}

.current-world-pack__app-action span,
.current-world-pack__service-action span {
  border-radius: 999px;
  background: var(--system-warning-soft);
  color: var(--system-warning);
  padding: 4px 7px;
  font-size: 11px;
  font-weight: 800;
}

.current-world-pack__app-action span.is-ready,
.current-world-pack__service-action span.is-generated {
  background: var(--system-success-soft);
  color: var(--system-success);
}

.current-world-pack__app-action button,
.current-world-pack__service-action button {
  min-height: 30px;
  border: 1px solid var(--system-control-border);
  border-radius: 8px;
  background: var(--system-text);
  color: var(--system-text-inverse);
  padding: 0 9px;
  font-size: 11px;
  font-weight: 800;
}

.current-world-pack__app-action button:disabled,
.current-world-pack__service-action button:disabled {
  cursor: not-allowed;
  color: var(--system-text-soft);
  background: var(--system-control-border);
}

.current-world-pack__template-registry {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.current-world-pack__template-chip {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  background: var(--system-panel-bg);
  color: var(--system-text);
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
}

.current-world-pack__template-chip small {
  color: var(--system-text-muted);
  font-size: 10px;
  font-weight: 700;
}

.current-world-pack__template-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.current-world-pack__template-actions button,
.current-world-pack__template-action button {
  min-height: 32px;
  border: 1px solid var(--system-control-border);
  border-radius: 8px;
  background: var(--system-text);
  color: var(--system-text-inverse);
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
}

.current-world-pack__template-actions button:nth-child(2),
.current-world-pack__template-actions button:nth-child(3) {
  background: var(--system-panel-bg);
  color: var(--system-text);
}

.current-world-pack__template-actions button:disabled,
.current-world-pack__template-action button:disabled {
  cursor: not-allowed;
  color: var(--system-text-soft);
  background: var(--system-control-border);
}

.current-world-pack__template-loading,
.current-world-pack__template-empty {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  border: 1px solid var(--system-info-soft);
  border-radius: var(--system-radius-md);
  background: color-mix(in srgb, var(--system-info-soft) 72%, var(--system-panel-bg));
  padding: 10px;
}

.current-world-pack__template-loading > span,
.current-world-pack__template-empty > span {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 12px;
  color: var(--system-info);
  background: var(--system-panel-bg);
}

.current-world-pack__template-loading strong,
.current-world-pack__template-empty strong {
  display: block;
  color: var(--system-text);
  font-size: 12px;
}

.current-world-pack__template-loading p,
.current-world-pack__template-empty p {
  margin-top: 2px;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.current-world-pack__template-draft {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  color: var(--system-text);
  padding: 10px;
  font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.current-world-pack__template-notice,
.current-world-pack__template-summary {
  border: 1px solid var(--system-control-border);
  border-radius: 8px;
  background: var(--system-info-soft);
  color: var(--system-info);
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.45;
}

.current-world-pack__template-notice.is-success {
  border-color: var(--system-success-soft);
  background: var(--system-success-soft);
  color: var(--system-success);
}

.current-world-pack__template-notice.is-warning {
  border-color: var(--system-warning-soft);
  background: var(--system-warning-soft);
  color: var(--system-warning);
}

.current-world-pack__template-notice.is-danger {
  border-color: var(--system-danger-soft);
  background: var(--system-danger-soft);
  color: var(--system-danger);
}

.current-world-pack__template-results {
  display: grid;
  gap: 8px;
}

.current-world-pack__template-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(136px, auto);
  gap: 12px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  padding: 12px;
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.current-world-pack__template-row.is-rejected {
  background: var(--system-surface-muted);
}

.current-world-pack__template-main {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.current-world-pack__template-main span {
  color: var(--system-info);
  font-size: 11px;
  font-weight: 800;
}

.current-world-pack__template-row.is-rejected .current-world-pack__template-main span {
  color: var(--system-warning);
}

.current-world-pack__template-main strong {
  color: var(--system-text);
  font-size: 13px;
}

.current-world-pack__template-main p,
.current-world-pack__template-main small {
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.current-world-pack__template-main .current-world-pack__template-rejection {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--system-warning);
}

.current-world-pack__template-rejection b {
  border-radius: 999px;
  background: var(--system-warning-soft);
  padding: 2px 6px;
  font-size: 10px;
  line-height: 1.3;
}

.current-world-pack__template-action {
  display: flex;
  min-width: 136px;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
}

.current-world-pack__template-action span {
  max-width: 180px;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
  overflow-wrap: anywhere;
  text-align: right;
}

@media (max-width: 640px) {
  .current-world-pack__hero {
    grid-template-columns: 1fr;
  }

  .current-world-pack__glyph {
    display: none;
  }

  .current-world-pack__title {
    font-size: 22px;
  }

  .current-world-pack__effects,
  .current-world-pack__handoff-summary,
  .current-world-pack__review-grid,
  .current-world-pack__selector-row {
    grid-template-columns: 1fr;
  }

  .current-world-pack__app-row,
  .current-world-pack__template-row,
  .current-world-pack__service-row,
  .current-world-pack__currency-row,
  .current-world-pack__currency-form {
    grid-template-columns: 1fr;
  }

  .current-world-pack__app-action,
  .current-world-pack__template-action,
  .current-world-pack__service-action {
    min-width: 0;
    align-items: stretch;
  }

  .current-world-pack__template-action span {
    max-width: none;
    text-align: left;
  }
}
</style>
