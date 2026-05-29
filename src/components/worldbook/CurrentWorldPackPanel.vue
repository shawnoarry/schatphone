<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  overview: {
    type: Object,
    required: true,
  },
})

const { t } = useI18n()

const packName = computed(() =>
  t(
    props.overview.activePack?.title || '默认世界',
    props.overview.activePack?.name || 'Default world',
  ),
)

const effectRows = computed(() => [
  {
    key: 'worldview',
    label: t('世界观文本', 'Worldview text'),
    value: props.overview.hasWorldview
      ? t(`已写入 ${props.overview.worldviewCharCount} 字`, `${props.overview.worldviewCharCount} characters`)
      : t('尚未写入', 'Empty'),
  },
  {
    key: 'knowledge',
    label: t('启用知识点', 'Enabled knowledge'),
    value: t(
      `${props.overview.enabledKnowledgeCount} 条启用，${props.overview.disabledKnowledgeCount} 条停用`,
      `${props.overview.enabledKnowledgeCount} enabled, ${props.overview.disabledKnowledgeCount} disabled`,
    ),
  },
  {
    key: 'templates',
    label: t('世界角色模板', 'World role templates'),
    value: t(
      `${props.overview.profileTemplateCount} 个当前世界模板`,
      `${props.overview.profileTemplateCount} current-world templates`,
    ),
  },
])
</script>

<template>
  <section
    class="current-world-pack"
    data-testid="worldbook-current-pack"
  >
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
        {{ t('默认启用', 'Default active') }}
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

    <div
      class="current-world-pack__effects"
      data-testid="worldbook-current-pack-effects"
    >
      <div
        v-for="row in effectRows"
        :key="row.key"
        class="current-world-pack__effect"
      >
        <span>{{ row.label }}</span>
        <strong>{{ row.value }}</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.current-world-pack {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
  padding: 16px;
  color: var(--system-text);
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
  font-size: 18px;
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
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--system-text-muted);
}

.current-world-pack__effects {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 12px;
}

.current-world-pack__effect {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
  padding: 10px 12px;
}

.current-world-pack__effect span {
  font-size: 12px;
  color: var(--system-text-muted);
}

.current-world-pack__effect strong {
  text-align: right;
  font-size: 12px;
  color: var(--system-text);
}
</style>
