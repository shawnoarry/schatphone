<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  place: { type: Object, required: true },
  visual: { type: Object, required: true },
  name: { type: String, required: true },
  secondaryName: { type: String, default: '' },
  summary: { type: String, default: '' },
  detail: { type: String, default: '' },
  secondaryDetail: { type: String, default: '' },
  sourceLabel: { type: String, required: true },
  categoryLabel: { type: String, default: '' },
  contextLabel: { type: String, required: true },
  contextTone: { type: String, default: 'remote' },
  primaryAction: {
    type: String,
    default: 'go',
    validator: (value) => ['go', 'view_journey', 'none'].includes(value),
  },
  journeyLocked: { type: Boolean, default: false },
  canManage: { type: Boolean, default: false },
  displayMode: { type: String, required: true },
  displayOptions: { type: Array, default: () => [] },
  t: { type: Function, required: true },
})

const emit = defineEmits([
  'close',
  'go',
  'view-journey',
  'share',
  'manage',
  'set-display-mode',
  'set-start',
  'set-current',
  'delete',
])

const level = ref('overview')

watch(
  () => props.place?.placeId || props.place?.id,
  () => {
    level.value = 'overview'
  },
)

const isDetail = computed(() => level.value === 'detail')
const primaryLabel = computed(() =>
  props.primaryAction === 'view_journey'
    ? props.t('查看当前行程', 'View current journey')
    : props.t('前往', 'Go'),
)
const primaryIcon = computed(() =>
  props.primaryAction === 'view_journey' ? 'fas fa-route' : 'fas fa-location-arrow',
)
const overviewActionsClass = computed(() => ({
  'has-management': props.canManage,
}))

const runPrimaryAction = () => {
  if (props.primaryAction === 'view_journey') emit('view-journey')
  else if (props.primaryAction === 'go') emit('go')
}
</script>

<template>
  <div class="map-place-focus-backdrop" @click.self="emit('close')">
    <section
      class="map-place-focus-sheet"
      role="dialog"
      aria-modal="true"
      :aria-label="name"
      :style="{ '--map-place-tone': visual.tone }"
      data-testid="map-place-detail-sheet"
      data-surface="place-focus"
      tabindex="-1"
      @keydown.esc="emit('close')"
    >
      <div class="map-place-focus-handle" aria-hidden="true"></div>

      <header class="map-place-focus-head">
        <button
          v-if="isDetail"
          type="button"
          class="map-place-focus-icon-button"
          :aria-label="t('返回地点概览', 'Back to place overview')"
          data-testid="map-place-detail-back"
          @click="level = 'overview'"
        >
          <i class="fas fa-chevron-left" aria-hidden="true"></i>
        </button>
        <span v-else class="map-place-focus-icon" aria-hidden="true">
          <i :class="visual.icon"></i>
        </span>

        <div class="map-place-focus-heading">
          <div class="map-place-focus-kicker">
            <span>{{ sourceLabel }}</span>
            <span v-if="categoryLabel">{{ categoryLabel }}</span>
          </div>
          <h2>{{ name }}</h2>
          <p v-if="secondaryName" class="map-place-focus-secondary-name" data-testid="map-place-secondary-name">
            {{ secondaryName }}
          </p>
        </div>

        <button
          type="button"
          class="map-place-focus-icon-button"
          :aria-label="t('关闭', 'Close')"
          @click="emit('close')"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </header>

      <template v-if="!isDetail">
        <p v-if="summary" class="map-place-focus-summary">{{ summary }}</p>

        <div
          class="map-place-focus-context"
          :class="`is-${contextTone}`"
          data-testid="map-place-context"
        >
          <i class="fas fa-location-dot" aria-hidden="true"></i>
          <span>{{ contextLabel }}</span>
        </div>

        <div
          v-if="journeyLocked"
          class="map-place-focus-journey-note"
          data-testid="map-place-journey-lock"
        >
          <i class="fas fa-eye" aria-hidden="true"></i>
          <span>{{ t('浏览此地点不会改变当前行程', 'Viewing this place will not change the current journey') }}</span>
        </div>

        <button
          v-if="primaryAction !== 'none'"
          type="button"
          class="map-place-focus-primary"
          :data-testid="primaryAction === 'go' ? 'map-place-use-destination' : 'map-place-view-journey'"
          @click="runPrimaryAction"
        >
          <i :class="primaryIcon" aria-hidden="true"></i>
          <span>{{ primaryLabel }}</span>
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>

        <div class="map-place-focus-actions" :class="overviewActionsClass">
          <button type="button" data-testid="map-place-open-detail" @click="level = 'detail'">
            <i class="fas fa-circle-info" aria-hidden="true"></i>
            <span>{{ t('详情', 'Details') }}</span>
          </button>
          <button type="button" data-testid="map-place-share-chat" @click="emit('share')">
            <i class="fas fa-share-nodes" aria-hidden="true"></i>
            <span>{{ t('分享', 'Share') }}</span>
          </button>
          <button
            v-if="canManage"
            type="button"
            data-testid="map-place-manage-pin"
            @click="emit('manage')"
          >
            <i class="fas fa-pen-to-square" aria-hidden="true"></i>
            <span>{{ t('管理', 'Manage') }}</span>
          </button>
        </div>
      </template>

      <div v-else class="map-place-focus-detail" data-testid="map-place-detail-view">
        <div class="map-place-focus-detail-copy">
          <span>{{ t('地点信息', 'Place information') }}</span>
          <p v-if="detail">{{ detail }}</p>
          <p
            v-if="secondaryDetail && secondaryDetail !== detail"
            class="map-place-focus-secondary-detail"
            data-testid="map-place-secondary-detail"
          >
            {{ secondaryDetail }}
          </p>
        </div>

        <div class="map-place-language-control">
          <span class="map-place-language-label">
            <i class="fas fa-language" aria-hidden="true"></i>
            {{ t('地名显示', 'Place names') }}
          </span>
          <div class="map-place-language-segments" role="group" :aria-label="t('地名显示语言', 'Place-name language')">
            <button
              v-for="option in displayOptions"
              :key="option.id"
              type="button"
              :class="{ 'is-active': displayMode === option.id }"
              :data-testid="`map-place-language-mode-${option.id}`"
              :aria-label="t(option.titleZh, option.titleEn)"
              :title="t(option.titleZh, option.titleEn)"
              :aria-pressed="displayMode === option.id"
              @click="emit('set-display-mode', option.id)"
            >
              {{ t(option.labelZh, option.labelEn) }}
            </button>
          </div>
        </div>

        <div v-if="!journeyLocked" class="map-place-focus-detail-actions">
          <button type="button" data-testid="map-place-use-start" @click="emit('set-start')">
            <i class="fas fa-route" aria-hidden="true"></i>
            <span>
              <strong>{{ t('设为行程起点', 'Use as trip start') }}</strong>
              <small>{{ t('用于下一段地图行程', 'For the next Map journey') }}</small>
            </span>
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
          <button type="button" data-testid="map-place-set-current" @click="emit('set-current')">
            <i class="fas fa-crosshairs" aria-hidden="true"></i>
            <span>
              <strong>{{ t('立即修改位置', 'Relocate now') }}</strong>
              <small>{{ t('跳过路程，不产生行程记录', 'Skips travel and creates no journey') }}</small>
            </span>
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>

        <button
          v-if="canManage"
          type="button"
          class="map-place-focus-delete"
          data-testid="map-place-delete-pin"
          @click="emit('delete')"
        >
          <i class="fas fa-trash-can" aria-hidden="true"></i>
          {{ t('删除地点', 'Delete place') }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.map-place-focus-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(16, 27, 21, 0.24);
}

.map-place-focus-sheet {
  width: min(100%, 720px);
  max-height: min(76vh, 620px);
  overflow-y: auto;
  border: 1px solid #d9e1dc;
  border-radius: 8px 8px 0 0;
  background: #fbfcfb;
  padding: 8px 18px calc(20px + env(safe-area-inset-bottom));
  color: #17211d;
  box-shadow: 0 -14px 42px rgba(25, 39, 31, 0.18);
}

.map-place-focus-handle {
  width: 38px;
  height: 4px;
  margin: 0 auto 12px;
  border-radius: 999px;
  background: #cbd3ce;
}

.map-place-focus-head {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 38px;
  align-items: start;
  gap: 11px;
}

.map-place-focus-icon,
.map-place-focus-icon-button {
  display: grid;
  place-items: center;
  border-radius: 8px;
}

.map-place-focus-icon {
  width: 46px;
  height: 46px;
  background: color-mix(in srgb, var(--map-place-tone) 14%, white);
  color: var(--map-place-tone);
  font-size: 16px;
}

.map-place-focus-icon-button {
  width: 38px;
  height: 38px;
  border: 1px solid #dce3de;
  background: #fff;
  color: #526158;
}

.map-place-focus-heading { min-width: 0; }
.map-place-focus-kicker { display: flex; min-width: 0; flex-wrap: wrap; gap: 5px 8px; color: #718078; font-size: 9px; font-weight: 800; }
.map-place-focus-kicker span + span::before { content: '/'; margin-right: 8px; color: #acb5af; }
.map-place-focus-heading h2 { overflow-wrap: anywhere; margin-top: 3px; font-size: 18px; font-weight: 850; line-height: 1.25; }
.map-place-focus-secondary-name { margin-top: 2px; color: #53665c; font-size: 11px; font-weight: 750; }
.map-place-focus-summary { margin-top: 13px; color: #5d6d64; font-size: 11px; line-height: 1.55; }

.map-place-focus-context,
.map-place-focus-journey-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 13px;
  border: 1px solid #dbe3de;
  border-radius: 7px;
  background: #f2f6f3;
  padding: 9px 10px;
  color: #466055;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.4;
}

.map-place-focus-context i,
.map-place-focus-journey-note i { flex: 0 0 auto; color: #17664f; }
.map-place-focus-context.is-current { border-color: #b9d8c9; background: #edf7f1; color: #165741; }
.map-place-focus-context.is-journey { border-color: #c7d7e2; background: #f0f5f8; color: #31576d; }
.map-place-focus-journey-note { margin-top: 7px; background: #f7f9f7; color: #617068; font-weight: 700; }

.map-place-focus-primary {
  display: grid;
  width: 100%;
  min-height: 48px;
  grid-template-columns: 18px minmax(0, 1fr) 12px;
  align-items: center;
  gap: 9px;
  margin-top: 14px;
  border-radius: 7px;
  background: #17664f;
  padding: 0 14px;
  color: #fff;
  font-size: 11px;
  font-weight: 850;
  text-align: left;
}

.map-place-focus-primary i:last-child { font-size: 8px; text-align: right; }
.map-place-focus-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 8px; }
.map-place-focus-actions.has-management { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.map-place-focus-actions button { display: flex; min-width: 0; min-height: 46px; align-items: center; justify-content: center; gap: 7px; border: 1px solid #dce3de; border-radius: 7px; background: #fff; color: #40544a; font-size: 10px; font-weight: 800; }
.map-place-focus-actions button i { color: var(--map-place-tone); }

.map-place-focus-detail { margin-top: 15px; }
.map-place-focus-detail-copy { border-bottom: 1px solid #e2e7e3; padding-bottom: 13px; }
.map-place-focus-detail-copy > span { color: #718078; font-size: 9px; font-weight: 850; }
.map-place-focus-detail-copy p { margin-top: 5px; color: #405149; font-size: 11px; line-height: 1.55; overflow-wrap: anywhere; }
.map-place-focus-detail-copy .map-place-focus-secondary-detail { color: #7a8780; font-size: 10px; }
.map-place-language-control { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 9px; margin-top: 13px; }
.map-place-language-label { display: inline-flex; min-width: 0; align-items: center; gap: 6px; color: #52635a; font-size: 9px; font-weight: 800; white-space: nowrap; }
.map-place-language-label i { color: #17664f; font-size: 11px; }
.map-place-language-segments { display: grid; min-width: 0; grid-template-columns: repeat(4, minmax(0, 1fr)); overflow: hidden; border: 1px solid #d7dfda; border-radius: 7px; background: #f4f7f5; }
.map-place-language-segments button { min-width: 0; min-height: 34px; border-left: 1px solid #d7dfda; padding: 0 5px; color: #66746d; font-size: 9px; font-weight: 850; white-space: nowrap; }
.map-place-language-segments button:first-child { border-left: 0; }
.map-place-language-segments button.is-active { background: #17664f; color: #fff; }

.map-place-focus-detail-actions { margin-top: 14px; border-top: 1px solid #e2e7e3; }
.map-place-focus-detail-actions button { display: grid; width: 100%; min-height: 54px; grid-template-columns: 28px minmax(0, 1fr) 10px; align-items: center; gap: 9px; border-bottom: 1px solid #e2e7e3; color: #315246; text-align: left; }
.map-place-focus-detail-actions button > i:first-child { color: #17664f; text-align: center; }
.map-place-focus-detail-actions button > i:last-child { color: #9aa59f; font-size: 8px; }
.map-place-focus-detail-actions strong,
.map-place-focus-detail-actions small { display: block; }
.map-place-focus-detail-actions strong { font-size: 10px; }
.map-place-focus-detail-actions small { margin-top: 3px; color: #77847d; font-size: 9px; font-weight: 650; }
.map-place-focus-delete { display: inline-flex; min-height: 40px; align-items: center; gap: 7px; margin-top: 12px; color: #a54238; font-size: 10px; font-weight: 800; }

button:focus-visible { outline: 2px solid #0f8061; outline-offset: 2px; }

@media (min-width: 720px) {
  .map-place-focus-sheet { margin-bottom: 18px; border-radius: 8px; }
}
</style>
