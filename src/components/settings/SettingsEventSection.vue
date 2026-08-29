<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  simulationSettings: { type: Object, required: true },
  simulationForegroundTickIntervalMinutes: { type: Number, required: true },
  simulationForegroundTickRuntimeLabel: { type: String, required: true },
  simulationForegroundTickCoverageItems: { type: Array, default: () => [] },
  simulationForegroundTickLatestLabel: { type: String, required: true },
  simulationSurpriseModeOptions: { type: Array, default: () => [] },
  simulationSurpriseModeRuntimeLabel: { type: String, required: true },
  simulationModuleEventControls: { type: Array, default: () => [] },
  simulationEventPresentationControls: { type: Array, default: () => [] },
  miniScenePresentationControls: { type: Array, default: () => [] },
})

defineEmits([
  'open-world-hub',
  'update-simulation-foreground-tick-enabled',
  'update-simulation-foreground-tick-interval-minutes',
  'update-simulation-surprise-mode',
  'update-simulation-module-events-enabled',
  'update-simulation-event-presentation-mode',
  'update-mini-scene-presentation-mode',
])

const { t } = useI18n()
</script>

<template>
  <div class="event-settings-stack" data-testid="settings-simulation-runtime-controls">
    <section class="event-settings-card">
      <div>
        <h2 class="event-settings-title">
          {{ t('事件活跃度', 'Event activity') }}
        </h2>
        <p class="event-settings-copy">
          {{
            t(
              '修改后立即生效，只影响后续判定；打开本页不会触发事件。',
              'Changes apply immediately to future checks; opening this page never triggers an event.',
            )
          }}
        </p>
      </div>

      <label class="event-settings-field">
        <span>{{ t('随机事件频率', 'Random event frequency') }}</span>
        <select
          :value="simulationSettings.surpriseMode"
          data-testid="settings-simulation-surprise-mode"
          @change="$emit('update-simulation-surprise-mode', $event.target.value)"
        >
          <option
            v-for="option in simulationSurpriseModeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
      <p class="event-settings-runtime" data-testid="settings-simulation-surprise-mode-runtime">
        {{ simulationSurpriseModeRuntimeLabel }}
      </p>
    </section>

    <section class="event-settings-card">
      <div>
        <h2 class="event-settings-title">{{ t('可以发生在哪里', 'Where events can happen') }}</h2>
        <p class="event-settings-copy">
          {{
            t(
              '关闭某个 App 的事件，不会关闭该 App 的普通功能。',
              'Disabling events for an app does not disable its ordinary features.',
            )
          }}
        </p>
      </div>
      <div class="event-settings-list">
        <label
          v-for="item in simulationModuleEventControls"
          :key="item.id"
          class="event-settings-row"
          :data-testid="`settings-simulation-module-event-row-${item.id}`"
        >
          <span class="event-settings-row-copy">
            <strong>{{ item.label }}</strong>
            <small>{{ item.detail }}</small>
            <small class="event-settings-status">{{ item.status }}</small>
          </span>
          <input
            :checked="item.enabled"
            type="checkbox"
            :aria-label="item.label"
            :data-testid="`settings-simulation-module-events-${item.id}`"
            @change="
              $emit(
                'update-simulation-module-events-enabled',
                item.moduleKey,
                $event.target.checked,
              )
            "
          />
        </label>
      </div>
    </section>

    <section
      v-if="simulationEventPresentationControls.length || miniScenePresentationControls.length"
      class="event-settings-card"
    >
      <div>
        <h2 class="event-settings-title">{{ t('事件如何呈现', 'How events appear') }}</h2>
        <p class="event-settings-copy">
          {{
            t(
              '呈现方式只改变你看到和操作事件的方式，不改写事件是否发生或最终结果。',
              'Presentation changes how an event is shown, not whether it occurs or its canonical result.',
            )
          }}
        </p>
      </div>

      <div v-if="simulationEventPresentationControls.length" class="event-settings-list">
        <label
          v-for="item in simulationEventPresentationControls"
          :key="item.id"
          class="event-settings-presentation"
          :data-testid="`settings-simulation-event-presentation-row-${item.id}`"
        >
          <span class="event-settings-row-copy">
            <strong>{{ item.label }}</strong>
            <small>{{ item.detail }}</small>
          </span>
          <select
            :value="item.value"
            :data-testid="`settings-simulation-event-presentation-${item.id}`"
            @change="
              $emit(
                'update-simulation-event-presentation-mode',
                item.moduleKey,
                $event.target.value,
              )
            "
          >
            <option v-for="option in item.options" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <div
        v-if="miniScenePresentationControls.length"
        class="event-settings-list"
        data-testid="settings-mini-scene-presentation-controls"
      >
        <label
          v-for="item in miniScenePresentationControls"
          :key="item.id"
          class="event-settings-presentation"
          :data-testid="`settings-mini-scene-presentation-row-${item.id}`"
        >
          <span class="event-settings-row-copy">
            <strong>{{ item.label }}</strong>
            <small>{{ item.detail }}</small>
          </span>
          <select
            :value="item.value"
            :data-testid="`settings-mini-scene-presentation-${item.id}`"
            @change="
              $emit('update-mini-scene-presentation-mode', item.moduleKey, $event.target.value)
            "
          >
            <option
              v-for="option in item.options"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>
    </section>

    <section class="event-settings-card">
      <div class="event-settings-heading-row">
        <div>
          <h2 class="event-settings-title">
            {{ t('使用中自动检查', 'Checks while using the app') }}
          </h2>
          <p class="event-settings-copy">
            {{
              t(
                '仅在 App 打开且未锁定时低频检查安全事件。',
                'Low-frequency safe checks run only while the app is open and unlocked.',
              )
            }}
          </p>
        </div>
        <input
          :checked="simulationSettings.foregroundSessionTickEnabled"
          type="checkbox"
          :aria-label="t('使用中自动检查', 'Checks while using the app')"
          data-testid="settings-simulation-foreground-tick-enabled"
          @change="$emit('update-simulation-foreground-tick-enabled', $event.target.checked)"
        />
      </div>

      <label
        v-if="simulationSettings.foregroundSessionTickEnabled"
        class="event-settings-inline-field"
      >
        <span>{{ t('检查间隔（分钟）', 'Interval (minutes)') }}</span>
        <input
          :value="simulationForegroundTickIntervalMinutes"
          type="number"
          inputmode="numeric"
          min="1"
          max="120"
          data-testid="settings-simulation-foreground-tick-interval"
          @change="
            $emit('update-simulation-foreground-tick-interval-minutes', Number($event.target.value))
          "
        />
      </label>
      <p class="event-settings-runtime" data-testid="settings-simulation-foreground-tick-runtime">
        {{ simulationForegroundTickRuntimeLabel }}
      </p>

      <div class="event-settings-list" data-testid="settings-simulation-foreground-tick-coverage">
        <div
          v-for="item in simulationForegroundTickCoverageItems"
          :key="item.id"
          class="event-settings-summary-row"
          :data-testid="`settings-simulation-foreground-tick-coverage-${item.id}`"
        >
          <span class="event-settings-row-copy">
            <strong>{{ item.label }}</strong>
            <small>{{ item.detail }}</small>
          </span>
          <span class="event-settings-badge">{{ item.status }}</span>
        </div>
      </div>

      <div class="event-settings-review">
        <p data-testid="settings-simulation-foreground-tick-latest">
          {{ simulationForegroundTickLatestLabel }}
        </p>
        <button
          type="button"
          data-testid="settings-open-world-hub"
          @click="$emit('open-world-hub')"
        >
          {{ t('查看世界中枢', 'Open World Hub') }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.event-settings-stack {
  display: grid;
  gap: 16px;
}

.event-settings-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background: var(--system-panel-bg);
  color: var(--system-text);
  box-shadow: var(--system-shadow-card);
}

.event-settings-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.event-settings-copy,
.event-settings-runtime,
.event-settings-row-copy small,
.event-settings-review p {
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  line-height: 1.5;
}

.event-settings-copy {
  margin-top: 4px;
  font-size: 11px;
}

.event-settings-runtime,
.event-settings-review p {
  font-size: 11px;
}

.event-settings-field,
.event-settings-presentation {
  display: grid;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
}

.event-settings-field select,
.event-settings-presentation select,
.event-settings-inline-field input {
  min-height: 44px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
  color: var(--system-text);
  font-size: 13px;
}

.event-settings-field select,
.event-settings-presentation select {
  width: 100%;
  padding: 0 12px;
}

.event-settings-list {
  display: grid;
  gap: 8px;
}

.event-settings-row,
.event-settings-presentation,
.event-settings-summary-row,
.event-settings-review,
.event-settings-inline-field {
  min-width: 0;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-md);
  background: var(--system-surface-muted);
}

.event-settings-row,
.event-settings-summary-row,
.event-settings-heading-row,
.event-settings-inline-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
}

.event-settings-row,
.event-settings-summary-row {
  min-height: 52px;
  padding: 12px;
}

.event-settings-row input,
.event-settings-heading-row input {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  accent-color: var(--system-accent);
}

.event-settings-row-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.event-settings-row-copy strong {
  overflow-wrap: anywhere;
  color: var(--system-text);
  font-size: 12px;
  line-height: 1.4;
}

.event-settings-row-copy small {
  font-size: 10px;
}

.event-settings-status {
  font-weight: 700;
}

.event-settings-presentation {
  padding: 12px;
}

.event-settings-heading-row {
  align-items: center;
}

.event-settings-inline-field {
  align-items: center;
  padding: 8px 8px 8px 12px;
  color: var(--system-text-muted);
  font-size: 12px;
}

.event-settings-inline-field input {
  width: 88px;
  padding: 0 10px;
  text-align: right;
}

.event-settings-badge {
  align-self: start;
  border-radius: 999px;
  background: color-mix(in srgb, var(--system-accent) 12%, transparent);
  padding: 3px 8px;
  color: var(--system-accent-strong);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.event-settings-review {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.event-settings-review button {
  min-height: 44px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
  color: var(--system-accent-strong);
  font-size: 12px;
  font-weight: 700;
}

select:focus-visible,
input:focus-visible,
button:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: 2px;
}

@media (hover: hover) {
  .event-settings-review button:hover {
    background: var(--system-hover-bg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .event-settings-review button {
    transition: none;
  }
}
</style>
