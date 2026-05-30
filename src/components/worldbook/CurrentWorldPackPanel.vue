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
  serviceTemplateRows: {
    type: Array,
    default: () => [],
  },
  appBindingRows: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'select-pack',
  'activate-pack',
  'open-app-binding',
  'create-service-template',
  'open-service-contact',
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

const activationStateLabel = computed(() =>
  props.overview.activePack?.id === 'default_world'
    ? t('默认启用', 'Default active')
    : t('当前启用', 'Active'),
)

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
    label: t('启用知识点', 'Enabled knowledge'),
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
    book_sources: t('文本来源', 'Book sources'),
    knowledge: t('知识点', 'Knowledge'),
    templates: t('角色模板', 'Role templates'),
    app_bindings: t('世界应用', 'World apps'),
    service_templates: t('服务号模板', 'Service templates'),
  }
  const iconMap = {
    book_sources: 'fas fa-link',
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
        :disabled="activationReview.blocked || selectedPack?.id === overview.activePack?.id"
        data-testid="worldbook-current-pack-activate"
        @click="emit('activate-pack')"
      >
        {{
          selectedPack?.id === overview.activePack?.id
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
                ? t(`${appBindingRows.length} 个可打开入口`, `${appBindingRows.length} launchable entries`)
                : t('当前世界包没有应用绑定', 'No app bindings in the active pack')
            }}
          </strong>
        </div>
      </div>

      <p class="current-world-pack__apps-copy">
        {{
          t(
            '世界应用只改变入口语义、默认筛选和上下文提示；商品、订单、日程、钱包记录仍由各自模块保存。',
            'World apps only change entry wording, default filters, and context; products, orders, schedules, and wallet records stay in their modules.',
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
            <span :class="{ 'is-ready': row.launchable }">
              {{ row.launchable ? t('可打开', 'Ready') : t('未配置路线', 'No route') }}
            </span>
            <button
              type="button"
              :disabled="!row.launchable"
              :data-testid="`worldbook-current-pack-open-app-${row.id}`"
              @click="emit('open-app-binding', row.id)"
            >
              {{ t('打开世界应用', 'Open world app') }}
            </button>
          </div>
        </div>
      </div>
    </div>

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
                ? t(`${serviceTemplateRows.length} 个可生成入口`, `${serviceTemplateRows.length} entries available`)
                : t('当前世界包没有服务号模板', 'No service templates in the active pack')
            }}
          </strong>
        </div>
      </div>

      <p class="current-world-pack__services-copy">
        {{
          t(
            '这里生成的是 Chat Directory 里的服务号或公众号入口；它只承载沟通身份和跳转，不会创建订单、日程或钱包记录。',
            'This creates Chat Directory service or official accounts only; it carries identity and routing, not orders, schedules, or wallet records.',
          )
        }}
      </p>

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
              {{ row.generated ? t('已生成', 'Generated') : t('待确认', 'Pending') }}
            </span>
            <button
              v-if="row.generated"
              type="button"
              :data-testid="`worldbook-current-pack-open-service-${row.id}`"
              @click="emit('open-service-contact', row.contactId)"
            >
              {{ t('打开 Chat', 'Open Chat') }}
            </button>
            <button
              v-else
              type="button"
              :disabled="!row.payload"
              :data-testid="`worldbook-current-pack-create-service-${row.id}`"
              @click="emit('create-service-template', row.id)"
            >
              {{ t('生成到 Chat Directory', 'Create in Chat Directory') }}
            </button>
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

.current-world-pack__selector {
  display: grid;
  gap: 6px;
  margin-top: 14px;
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
.current-world-pack__services-head {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
}

.current-world-pack__apps-head p,
.current-world-pack__services-head p {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.current-world-pack__apps-head strong,
.current-world-pack__services-head strong {
  display: block;
  margin-top: 2px;
  color: var(--system-text);
  font-size: 13px;
}

.current-world-pack__apps-copy,
.current-world-pack__services-copy {
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.5;
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
  .current-world-pack__review-grid {
    grid-template-columns: 1fr;
  }

  .current-world-pack__app-row,
  .current-world-pack__service-row {
    grid-template-columns: 1fr;
  }

  .current-world-pack__app-action,
  .current-world-pack__service-action {
    min-width: 0;
    align-items: stretch;
  }
}
</style>
