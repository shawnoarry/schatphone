<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  workspace: {
    type: Object,
    required: true,
  },
  activePanel: {
    type: String,
    default: 'sources',
  },
})

const emit = defineEmits(['select-panel', 'open-book'])
const { t } = useI18n()

const layers = computed(() =>
  Array.isArray(props.workspace?.layers) ? props.workspace.layers : [],
)
</script>

<template>
  <section
    class="world-setting-workspace"
    data-testid="world-setting-workspace"
    :data-workspace-state="workspace.state"
  >
    <header class="world-setting-workspace__head">
      <div>
        <p>{{ t('世界设定工作台', 'World setting workspace') }}</p>
        <h2>{{ workspace.activeWorldTitle }}</h2>
        <span>
          {{
            t(
              'Book 负责写作与保存，WorldBook 负责决定当前世界启用哪些；其他设定层彼此独立可选。',
              'Book owns writing and storage. WorldBook controls text activation; every setting layer is independent and optional.',
            )
          }}
        </span>
      </div>
      <em :class="`is-${workspace.state}`">{{ workspace.status }}</em>
    </header>

    <div class="world-setting-workspace__metrics" data-testid="world-setting-workspace-metrics">
      <span
        v-for="metric in workspace.metrics"
        :key="metric.id"
        :class="metric.tone ? `is-${metric.tone}` : ''"
        :data-testid="`world-setting-workspace-metric-${metric.id}`"
      >
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.label }}</small>
      </span>
    </div>

    <nav
      class="world-setting-workspace__layers"
      :aria-label="t('世界设定层', 'World setting layers')"
      data-testid="world-setting-workspace-layers"
    >
      <button
        v-for="layer in layers"
        :key="layer.id"
        type="button"
        :aria-pressed="activePanel === layer.id"
        :class="[
          'world-setting-layer',
          `has-${layer.state}`,
          { 'is-selected': activePanel === layer.id },
        ]"
        :data-testid="`worldbook-panel-tab-${layer.id}`"
        @click="emit('select-panel', layer.id)"
      >
        <span class="world-setting-layer__icon" aria-hidden="true">
          <i :class="layer.icon"></i>
        </span>
        <span class="world-setting-layer__copy">
          <span class="world-setting-layer__title-row">
            <strong>{{ layer.title }}</strong>
            <em>{{ layer.status }}</em>
          </span>
          <small>{{ layer.detail }}</small>
        </span>
        <i class="fas fa-chevron-right world-setting-layer__arrow" aria-hidden="true"></i>
      </button>
    </nav>

    <footer class="world-setting-workspace__handoff">
      <span>
        <strong>{{ t('需要写作、改写或导入？', 'Need to write, revise, or import?') }}</strong>
        <small>{{ t('前往 Book；保存文本不会自动启用它。', 'Open Book; saving text never enables it automatically.') }}</small>
      </span>
      <button type="button" data-testid="world-setting-workspace-open-book" @click="emit('open-book')">
        <i class="fas fa-pen-to-square" aria-hidden="true"></i>
        {{ t('打开 Book', 'Open Book') }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.world-setting-workspace {
  display: grid;
  gap: 14px;
  padding: 18px 0;
  border-top: 1px solid var(--system-card-border);
  border-bottom: 1px solid var(--system-card-border);
  color: var(--system-text);
}

.world-setting-workspace__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.world-setting-workspace__head > div {
  min-width: 0;
}

.world-setting-workspace__head p {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.world-setting-workspace__head h2 {
  margin-top: 3px;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 850;
  overflow-wrap: anywhere;
}

.world-setting-workspace__head span {
  display: block;
  max-width: 680px;
  margin-top: 5px;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.world-setting-workspace__head > em {
  flex-shrink: 0;
  padding: 6px 9px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  background: var(--system-surface-muted);
  color: var(--system-text-muted);
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}

.world-setting-workspace__head > em.is-active {
  background: var(--system-success-soft);
  color: var(--system-success);
}

.world-setting-workspace__head > em.is-attention {
  background: var(--system-warning-soft);
  color: var(--system-warning);
}

.world-setting-workspace__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
}

.world-setting-workspace__metrics > span {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 10px 12px;
}

.world-setting-workspace__metrics > span + span {
  border-left: 1px solid var(--system-control-border);
}

.world-setting-workspace__metrics strong {
  font-size: 20px;
  line-height: 1;
  font-weight: 900;
}

.world-setting-workspace__metrics small {
  color: var(--system-text-muted);
  font-size: 10px;
  overflow-wrap: anywhere;
}

.world-setting-workspace__metrics .is-warning strong {
  color: var(--system-warning);
}

.world-setting-workspace__layers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.world-setting-layer {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 82px;
  padding: 11px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
  color: var(--system-text);
  text-align: left;
}

.world-setting-layer.is-selected {
  border-color: var(--system-accent);
  outline: 2px solid color-mix(in srgb, var(--system-accent) 20%, transparent);
  outline-offset: -2px;
}

.world-setting-layer:focus-visible,
.world-setting-workspace__handoff button:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: 2px;
}

.world-setting-layer__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: var(--system-surface-muted);
  color: var(--system-accent);
}

.world-setting-layer__copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.world-setting-layer__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.world-setting-layer__title-row strong {
  min-width: 0;
  font-size: 13px;
  line-height: 1.3;
  font-weight: 850;
  overflow-wrap: anywhere;
}

.world-setting-layer__title-row em {
  flex-shrink: 0;
  color: var(--system-text-muted);
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
}

.world-setting-layer.has-attention .world-setting-layer__title-row em {
  color: var(--system-warning);
}

.world-setting-layer__copy > small {
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.world-setting-layer__arrow {
  color: var(--system-text-soft);
  font-size: 10px;
}

.world-setting-workspace__handoff {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 2px;
}

.world-setting-workspace__handoff > span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.world-setting-workspace__handoff strong {
  font-size: 12px;
  font-weight: 820;
}

.world-setting-workspace__handoff small {
  color: var(--system-text-muted);
  font-size: 11px;
}

.world-setting-workspace__handoff button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 13px;
  border: 1px solid var(--system-accent);
  border-radius: var(--system-radius-md);
  background: var(--system-accent);
  color: var(--system-on-accent);
  font-size: 12px;
  font-weight: 820;
}

@media (max-width: 560px) {
  .world-setting-workspace__head,
  .world-setting-workspace__handoff {
    align-items: stretch;
    flex-direction: column;
  }

  .world-setting-workspace__head > em {
    align-self: flex-start;
  }

  .world-setting-workspace__layers {
    grid-template-columns: 1fr;
  }

  .world-setting-workspace__handoff button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .world-setting-layer,
  .world-setting-workspace__handoff button {
    transition: none;
  }
}
</style>
