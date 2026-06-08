<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  overview: {
    type: Object,
    required: true,
  },
  textCategories: {
    type: Array,
    default: () => [],
  },
  activeTextCharCount: {
    type: Number,
    default: 0,
  },
  saved: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['open-category'])

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

const textCategories = computed(() =>
  Array.isArray(props.textCategories) ? props.textCategories : [],
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
              '这里显示当前真正会进入上下文的文本。点一个类别管理它。',
              'Shows the text currently active in context. Open a category to manage it.',
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

    <div class="worldbook-overview__context-total" data-testid="worldbook-overview-context-total">
      <span>{{ t('能起作用的文本字数', 'Active context text') }}</span>
      <strong>{{ activeTextCharCount }}</strong>
      <small>{{ t('只统计已启用文稿', 'Enabled manuscripts only') }}</small>
    </div>

    <div class="worldbook-overview__text-grid" data-testid="worldbook-overview-text-categories">
      <button
        v-for="category in textCategories"
        :key="category.id"
        type="button"
        class="worldbook-overview__text-category"
        :class="{ 'is-configured': category.configured }"
        :data-testid="`worldbook-overview-text-category-${category.id}`"
        @click="emit('open-category', category.id)"
      >
        <span class="worldbook-overview__text-category-head">
          <strong>{{ category.label }}</strong>
          <small>{{ category.detail }}</small>
        </span>
        <span class="worldbook-overview__text-tags">
          <em
            v-for="link in category.enabledLinks"
            :key="link.id"
            class="is-active"
            :data-testid="`worldbook-overview-active-text-${category.id}-${link.id}`"
          >
            {{ link.title }}
          </em>
          <em v-if="category.enabledLinks.length === 0" class="is-empty">
            {{ t('未设置', 'Not set') }}
          </em>
        </span>
      </button>
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

.worldbook-overview__context-total {
  display: grid;
  gap: 4px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
}

.worldbook-overview__context-total span {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 760;
}

.worldbook-overview__context-total strong {
  color: var(--system-text);
  font-size: 28px;
  line-height: 1;
  font-weight: 900;
}

.worldbook-overview__context-total small {
  color: var(--system-text-soft);
  font-size: 10px;
}

.worldbook-overview__text-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.worldbook-overview__text-category {
  display: grid;
  gap: 10px;
  min-width: 0;
  min-height: 98px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
  padding: 10px;
  color: var(--system-text);
  text-align: left;
}

.worldbook-overview__text-category.is-configured {
  border-color: color-mix(in srgb, var(--system-accent) 40%, var(--system-control-border));
  background:
    linear-gradient(180deg, var(--system-info-soft), transparent),
    var(--system-control-bg);
}

.worldbook-overview__text-category-head,
.worldbook-overview__text-tags {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.worldbook-overview__text-category-head strong {
  color: var(--system-text);
  font-size: 13px;
  font-weight: 850;
}

.worldbook-overview__text-category-head small,
.worldbook-overview__consumers > span {
  font-size: 11px;
  color: var(--system-text-muted);
}

.worldbook-overview__text-tags {
  align-content: start;
}

.worldbook-overview__text-tags em {
  display: block;
  min-width: 0;
  overflow: hidden;
  padding: 5px 7px;
  border-radius: 999px;
  background: var(--system-surface-muted);
  color: var(--system-text);
  font-size: 10px;
  font-style: normal;
  font-weight: 780;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worldbook-overview__text-tags em.is-active {
  background: var(--system-panel-bg);
  color: var(--system-accent);
}

.worldbook-overview__text-tags em.is-empty {
  border: 1px dashed var(--system-control-border);
  background: transparent;
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
  .worldbook-overview__text-grid {
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
