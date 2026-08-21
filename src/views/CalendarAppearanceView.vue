<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  CALENDAR_COLOR_PRESETS,
  calendarMarkerColor,
  normalizeCalendarAppearance,
  resolveCalendarColorPreset,
} from '../lib/calendar-markers'

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const { t } = useI18n()

const saved = ref(false)
let savedTimerId = null

const draft = reactive(normalizeCalendarAppearance(systemStore.settings.appearance?.calendar))

const activePreset = computed(() => resolveCalendarColorPreset(draft.colorPreset))

const glyphOptions = computed(() => [
  {
    key: 'bar',
    labelZh: '色条',
    labelEn: 'Bar',
    hintZh: '在安排左侧放一条颜色细条',
    hintEn: 'A slim color bar beside the event',
  },
  {
    key: 'dot',
    labelZh: '圆点',
    labelEn: 'Dot',
    hintZh: '用一个小圆点标识类型',
    hintEn: 'A small dot marks the type',
  },
  {
    key: 'icon_tint',
    labelZh: '浅色块',
    labelEn: 'Tint',
    hintZh: '整个安排块带一点类型色',
    hintEn: 'The whole event chip carries the tint',
  },
])

const glyphPreviewClass = (key) => `calendar-appearance-glyph-preview--${key}`

const setMarkerLabel = (marker, field, value) => {
  marker[field] = typeof value === 'string' ? value : ''
}

const setMarkerColor = (marker, colorKey) => {
  marker.colorKey = colorKey
}

const resetAll = () => {
  const fresh = normalizeCalendarAppearance()
  draft.markers = fresh.markers
  draft.colorPreset = fresh.colorPreset
  draft.glyphStyle = fresh.glyphStyle
}

const save = () => {
  systemStore.settings.appearance.calendar = normalizeCalendarAppearance({
    markers: draft.markers,
    colorPreset: draft.colorPreset,
    glyphStyle: draft.glyphStyle,
  })
  systemStore.saveNow()
  saved.value = true
  if (savedTimerId) clearTimeout(savedTimerId)
  savedTimerId = setTimeout(() => {
    saved.value = false
  }, 1400)
}

const goBack = () => {
  pushReturnTarget(router, route, '/calendar')
}
</script>

<template>
  <div class="calendar-appearance-page" data-testid="calendar-appearance-page">
    <header class="calendar-appearance-header">
      <button type="button" class="calendar-appearance-back" @click="goBack">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
        <span>{{ t('日历', 'Calendar') }}</span>
      </button>
      <h1>{{ t('日历外观', 'Calendar Appearance') }}</h1>
    </header>

    <main class="calendar-appearance-content no-scrollbar">
      <section class="calendar-appearance-section" data-testid="calendar-appearance-presets">
        <h2>{{ t('整体色彩预设', 'Color presets') }}</h2>
        <p class="calendar-appearance-hint">
          {{ t('一键替换全部便签颜色，便签标签保留。', 'Recolor every marker at once; labels stay as they are.') }}
        </p>
        <div class="calendar-appearance-preset-grid">
          <button
            v-for="preset in CALENDAR_COLOR_PRESETS"
            :key="preset.id"
            type="button"
            class="calendar-appearance-preset-card"
            :class="{ 'is-selected': draft.colorPreset === preset.id }"
            :data-testid="`calendar-appearance-preset-${preset.id}`"
            @click="draft.colorPreset = preset.id"
          >
            <span class="calendar-appearance-preset-name">{{ t(preset.labelZh, preset.labelEn) }}</span>
            <span class="calendar-appearance-preset-strip" aria-hidden="true">
              <i
                v-for="(color, key) in preset.colors"
                :key="key"
                :style="{ background: color }"
              ></i>
            </span>
          </button>
        </div>
      </section>

      <section class="calendar-appearance-section" data-testid="calendar-appearance-glyph">
        <h2>{{ t('标记样式', 'Marker style') }}</h2>
        <div class="calendar-appearance-glyph-grid">
          <button
            v-for="option in glyphOptions"
            :key="option.key"
            type="button"
            class="calendar-appearance-glyph-card"
            :class="{ 'is-selected': draft.glyphStyle === option.key }"
            :data-testid="`calendar-appearance-glyph-${option.key}`"
            @click="draft.glyphStyle = option.key"
          >
            <span
              class="calendar-appearance-glyph-preview"
              :class="glyphPreviewClass(option.key)"
              aria-hidden="true"
            ></span>
            <strong>{{ t(option.labelZh, option.labelEn) }}</strong>
            <small>{{ t(option.hintZh, option.hintEn) }}</small>
          </button>
        </div>
      </section>

      <section class="calendar-appearance-section" data-testid="calendar-appearance-markers">
        <h2>{{ t('便签', 'Markers') }}</h2>
        <p class="calendar-appearance-hint">
          {{ t('改标签名或换一个颜色；事件本身不受影响。', 'Rename or recolor; events themselves are untouched.') }}
        </p>
        <div class="calendar-appearance-marker-list">
          <div
            v-for="marker in draft.markers"
            :key="marker.id"
            class="calendar-appearance-marker-row"
            :data-testid="`calendar-appearance-marker-${marker.id}`"
          >
            <span
              class="calendar-appearance-marker-dot"
              :style="{ background: calendarMarkerColor(marker, activePreset.id) }"
              aria-hidden="true"
            ></span>
            <input
              :value="marker.labelZh"
              type="text"
              maxlength="40"
              class="calendar-appearance-marker-label"
              :aria-label="t('便签标签', 'Marker label')"
              :data-testid="`calendar-appearance-marker-label-${marker.id}`"
              @input="setMarkerLabel(marker, 'labelZh', $event.target.value)"
            />
            <div class="calendar-appearance-marker-swatches" role="radiogroup" :aria-label="t('便签颜色', 'Marker color')">
              <button
                v-for="entry in Object.entries(activePreset.colors)"
                :key="entry[0]"
                type="button"
                role="radio"
                :aria-checked="marker.colorKey === entry[0]"
                class="calendar-appearance-swatch"
                :class="{ 'is-selected': marker.colorKey === entry[0] }"
                :style="{ background: entry[1] }"
                :title="entry[0]"
                :data-testid="`calendar-appearance-swatch-${marker.id}-${entry[0]}`"
                @click="setMarkerColor(marker, entry[0])"
              ></button>
            </div>
          </div>
        </div>
      </section>

      <section class="calendar-appearance-actions">
        <button
          type="button"
          class="calendar-appearance-reset"
          data-testid="calendar-appearance-reset"
          @click="resetAll"
        >
          {{ t('全部重置', 'Reset all') }}
        </button>
        <button
          type="button"
          class="calendar-appearance-save"
          :class="{ 'is-saved': saved }"
          data-testid="calendar-appearance-save"
          @click="save"
        >
          {{ saved ? t('已保存', 'Saved') : t('保存', 'Save') }}
        </button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.calendar-appearance-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--system-text);
  background: var(--system-page-bg);
}

.calendar-appearance-header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(40px + env(safe-area-inset-top)) 16px 12px;
  border-bottom: 1px solid var(--system-subtle-border);
  background: var(--system-chrome-bg);
  backdrop-filter: blur(var(--system-blur-md));
}

.calendar-appearance-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  padding: 0;
  color: var(--system-accent);
  background: transparent;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.calendar-appearance-header h1 {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
}

.calendar-appearance-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 16px calc(24px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.calendar-appearance-section {
  padding: 14px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.calendar-appearance-section h2 {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 800;
}

.calendar-appearance-hint {
  margin: 0 0 12px;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.calendar-appearance-preset-grid {
  display: grid;
  gap: 10px;
}

.calendar-appearance-preset-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: 12px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.calendar-appearance-preset-card.is-selected {
  border-color: var(--system-accent);
  background: var(--system-accent-soft);
}

.calendar-appearance-preset-name {
  font-size: 13px;
  font-weight: 700;
}

.calendar-appearance-preset-strip {
  display: flex;
  gap: 4px;
}

.calendar-appearance-preset-strip i {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.calendar-appearance-glyph-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.calendar-appearance-glyph-card {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 12px 8px;
  border: 1px solid var(--system-control-border);
  border-radius: 12px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font: inherit;
  text-align: center;
  cursor: pointer;
}

.calendar-appearance-glyph-card.is-selected {
  border-color: var(--system-accent);
  background: var(--system-accent-soft);
}

.calendar-appearance-glyph-card strong {
  font-size: 12px;
}

.calendar-appearance-glyph-card small {
  color: var(--system-text-muted);
  font-size: 10px;
  line-height: 1.4;
}

.calendar-appearance-glyph-preview {
  position: relative;
  width: 56px;
  height: 24px;
  border-radius: 8px;
  background: var(--system-surface-muted);
  border: 1px solid var(--system-subtle-border);
}

.calendar-appearance-glyph-preview--bar::before {
  content: '';
  position: absolute;
  inset: 2px auto 2px 2px;
  width: 3px;
  border-radius: 2px;
  background: var(--system-accent);
}

.calendar-appearance-glyph-preview--dot::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--system-accent);
  transform: translateY(-50%);
}

.calendar-appearance-glyph-preview--icon_tint {
  background: var(--system-accent-soft);
  border-color: transparent;
}

.calendar-appearance-marker-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.calendar-appearance-marker-row {
  display: grid;
  grid-template-columns: 14px minmax(72px, 120px) minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.calendar-appearance-marker-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.calendar-appearance-marker-label {
  min-width: 0;
  min-height: 32px;
  padding: 0 9px;
  border: 1px solid var(--system-control-border);
  border-radius: 8px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font: inherit;
  font-size: 12px;
  outline: none;
}

.calendar-appearance-marker-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.calendar-appearance-swatch {
  width: 22px;
  height: 22px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
}

.calendar-appearance-swatch.is-selected {
  border-color: var(--system-text);
  box-shadow: 0 0 0 2px var(--system-panel-bg), 0 0 0 4px currentColor;
}

.calendar-appearance-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}

.calendar-appearance-reset,
.calendar-appearance-save {
  min-height: 44px;
  border-radius: 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
}

.calendar-appearance-reset {
  border: 1px solid var(--system-danger-soft);
  color: var(--system-danger);
  background: var(--system-panel-bg);
}

.calendar-appearance-save {
  border: 0;
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.calendar-appearance-save.is-saved {
  color: var(--system-on-success);
  background: var(--system-success);
}

@media (min-width: 720px) {
  .calendar-appearance-content {
    width: min(680px, 100%);
    margin: 0 auto;
  }

  .calendar-appearance-preset-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
