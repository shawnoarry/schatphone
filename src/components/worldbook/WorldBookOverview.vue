<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  overview: {
    type: Object,
    required: true,
  },
  saved: {
    type: Boolean,
    default: false,
  },
})

const { t } = useI18n()

const promptConsumers = computed(() =>
  Array.isArray(props.overview.consumers)
    ? props.overview.consumers.filter((consumer) => consumer.consumesPromptContext)
    : [],
)

const displayPackName = computed(() =>
  t(
    props.overview.activePack?.title || '默认世界',
    props.overview.activePack?.name || 'Default world',
  ),
)

const worldviewStatus = computed(() =>
  props.overview.hasWorldview
    ? t('已写入基础规则', 'Base rules present')
    : t('尚未写入基础规则', 'No base rules yet'),
)
</script>

<template>
  <section
    class="worldbook-overview"
    data-testid="worldbook-overview"
  >
    <div class="worldbook-overview__hero">
      <div class="min-w-0">
        <p class="worldbook-overview__eyebrow">
          {{ t('当前生效世界', 'Active world') }}
        </p>
        <h2
          class="worldbook-overview__title"
          data-testid="worldbook-overview-pack"
        >
          {{ displayPackName }}
        </h2>
        <p class="worldbook-overview__description">
          {{
            t(
              '这里汇总当前会被 Chat 与运行时读取的世界书材料。',
              'This summarizes the WorldBook material currently read by Chat and runtime.',
            )
          }}
        </p>
      </div>
      <span
        class="worldbook-overview__status"
        :class="saved ? 'is-saved' : ''"
      >
        {{ saved ? t('刚刚保存', 'Saved') : t('生效中', 'Active') }}
      </span>
    </div>

    <div class="worldbook-overview__grid">
      <div
        class="worldbook-overview__metric"
        data-testid="worldbook-overview-worldview"
      >
        <span>{{ t('世界观', 'Worldview') }}</span>
        <strong>{{ overview.worldviewCharCount }}</strong>
        <small>{{ worldviewStatus }}</small>
      </div>
      <div
        class="worldbook-overview__metric"
        data-testid="worldbook-overview-knowledge"
      >
        <span>{{ t('知识点', 'Knowledge') }}</span>
        <strong>{{ overview.enabledKnowledgeCount }} / {{ overview.knowledgeCount }}</strong>
        <small>{{ t('启用 / 总数', 'enabled / total') }}</small>
      </div>
      <div
        class="worldbook-overview__metric"
        data-testid="worldbook-overview-templates"
      >
        <span>{{ t('角色模板', 'Role templates') }}</span>
        <strong>{{ overview.profileTemplateCount }}</strong>
        <small>{{ t('当前世界专用', 'current-world specific') }}</small>
      </div>
    </div>

    <div
      class="worldbook-overview__consumers"
      data-testid="worldbook-overview-consumers"
    >
      <span>{{ t('会读取这些设定的模块', 'Consumers') }}</span>
      <div>
        <span
          v-for="consumer in promptConsumers"
          :key="consumer.key"
          class="worldbook-overview__consumer"
          :data-testid="`worldbook-overview-consumer-${consumer.key}`"
        >
          {{ t(consumer.title || consumer.label, consumer.label || consumer.title) }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.worldbook-overview {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.52)),
    var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
  padding: 16px;
  color: var(--system-text);
}

.worldbook-overview__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.worldbook-overview__eyebrow {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--system-text-muted);
}

.worldbook-overview__title {
  margin-top: 3px;
  font-size: 22px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: 0;
}

.worldbook-overview__description {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--system-text-muted);
}

.worldbook-overview__status {
  flex-shrink: 0;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--system-success-soft);
  color: var(--system-success);
  font-size: 11px;
  font-weight: 700;
}

.worldbook-overview__status.is-saved {
  background: var(--system-info-soft);
  color: var(--system-info);
}

.worldbook-overview__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.worldbook-overview__metric {
  min-height: 82px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
  padding: 10px;
}

.worldbook-overview__metric span,
.worldbook-overview__consumers > span {
  display: block;
  font-size: 11px;
  color: var(--system-text-muted);
}

.worldbook-overview__metric strong {
  display: block;
  margin-top: 6px;
  font-size: 20px;
  line-height: 1;
  color: var(--system-text);
}

.worldbook-overview__metric small {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  line-height: 1.35;
  color: var(--system-text-soft);
}

.worldbook-overview__consumers {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.worldbook-overview__consumers div {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.worldbook-overview__consumer {
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  padding: 5px 8px;
  background: var(--system-surface-muted);
  color: var(--system-text);
  font-size: 11px;
}

@media (max-width: 430px) {
  .worldbook-overview__grid {
    grid-template-columns: 1fr;
  }

  .worldbook-overview__consumers {
    display: block;
  }

  .worldbook-overview__consumers div {
    justify-content: flex-start;
    margin-top: 8px;
  }
}
</style>
