<script setup>
import { computed, ref, watch } from 'vue'
import { createMapPlaceMediaFallback } from '../../lib/map-place-media'

const props = defineProps({
  place: { type: Object, required: true },
  visual: { type: Object, required: true },
  media: { type: Object, default: null },
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
    validator: (value) => ['go', 'view_journey', 'enter', 'leave', 'none'].includes(value),
  },
  eventInvitation: { type: Object, default: null },
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
  'enter',
  'leave',
  'expand-event',
  'share',
  'manage',
  'set-display-mode',
  'set-start',
  'set-current',
  'delete',
])

const level = ref('overview')
const mediaLoadFailed = ref(false)

watch(
  () => props.place?.placeId || props.place?.id,
  () => {
    level.value = 'overview'
    mediaLoadFailed.value = false
  },
)

watch(
  () => props.media?.id,
  () => {
    mediaLoadFailed.value = false
  },
)

const isDetail = computed(() => level.value === 'detail')
const displayedMedia = computed(() => (
  mediaLoadFailed.value
    ? createMapPlaceMediaFallback(props.place, props.media?.mapPackId)
    : props.media
))
const hasMediaImage = computed(() => Boolean(displayedMedia.value?.asset?.url))
const mediaLabel = computed(() => props.t(
  displayedMedia.value?.labelZh || '',
  displayedMedia.value?.labelEn || '',
))
const mediaNote = computed(() => props.t(
  displayedMedia.value?.noteZh || '',
  displayedMedia.value?.noteEn || '',
))
const mediaAlt = computed(() => props.t(
  displayedMedia.value?.asset?.altZh || '',
  displayedMedia.value?.asset?.altEn || '',
))
const mediaChanges = computed(() => props.t(
  displayedMedia.value?.source?.changesZh || '',
  displayedMedia.value?.source?.changesEn || '',
))
const primaryLabel = computed(() =>
  props.primaryAction === 'view_journey'
    ? props.t('查看当前行程', 'View current journey')
    : props.primaryAction === 'enter'
      ? props.t('进入', 'Enter')
      : props.primaryAction === 'leave'
        ? props.t('离开', 'Leave')
        : props.t('前往', 'Go'),
)
const primaryIcon = computed(() =>
  props.primaryAction === 'view_journey'
    ? 'fas fa-route'
    : props.primaryAction === 'enter'
      ? 'fas fa-door-open'
      : props.primaryAction === 'leave'
        ? 'fas fa-arrow-right-from-bracket'
        : 'fas fa-location-arrow',
)
const overviewActionsClass = computed(() => ({
  'has-management': props.canManage,
}))

const runPrimaryAction = () => {
  if (props.primaryAction === 'view_journey') emit('view-journey')
  else if (props.primaryAction === 'go') emit('go')
  else if (props.primaryAction === 'enter') emit('enter')
  else if (props.primaryAction === 'leave') emit('leave')
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

      <figure
        v-if="media"
        class="map-place-focus-media"
        :class="`is-${displayedMedia.kind}`"
        data-testid="map-place-media"
      >
        <div class="map-place-focus-media-frame">
          <img
            v-if="hasMediaImage"
            :src="displayedMedia.asset.url"
            :alt="mediaAlt"
            width="1600"
            height="900"
            decoding="async"
            data-testid="map-place-media-image"
            @error="mediaLoadFailed = true"
          />
          <div v-else class="map-place-focus-media-fallback" data-testid="map-place-media-fallback">
            <i :class="visual.icon" aria-hidden="true"></i>
          </div>
          <span class="map-place-focus-media-kind">{{ mediaLabel }}</span>
        </div>
        <figcaption>
          <span>{{ mediaNote }}</span>
          <span v-if="displayedMedia.source?.creator" class="map-place-focus-media-credit">
            <a
              :href="displayedMedia.source.sourcePageUrl"
              target="_blank"
              rel="noreferrer noopener"
              :aria-label="t('打开照片来源', 'Open photo source')"
            >{{ displayedMedia.source.creator }}</a>
            <span aria-hidden="true">·</span>
            <a
              v-if="displayedMedia.source.licenseUrl"
              :href="displayedMedia.source.licenseUrl"
              target="_blank"
              rel="noreferrer noopener"
            >{{ displayedMedia.source.licenseId }}</a>
            <span v-else>{{ displayedMedia.source.licenseId }}</span>
            <span v-if="mediaChanges" class="map-place-focus-media-changes">· {{ mediaChanges }}</span>
          </span>
        </figcaption>
      </figure>

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

        <section
          v-if="eventInvitation"
          class="map-place-event-invitation"
          data-testid="map-place-event-invitation"
          aria-labelledby="map-place-event-invitation-title"
        >
          <span class="map-place-event-invitation-icon" aria-hidden="true">
            <i class="fas fa-bolt"></i>
          </span>
          <div>
            <h3 id="map-place-event-invitation-title">{{ eventInvitation.copy.title }}</h3>
            <p>{{ eventInvitation.copy.summary }}</p>
          </div>
          <button
            type="button"
            :aria-label="t('展开事件', 'Expand event')"
            data-testid="map-place-expand-event"
            @click="emit('expand-event')"
          >
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
        </section>

        <button
          v-if="primaryAction !== 'none'"
          type="button"
          class="map-place-focus-primary"
          :class="{ 'is-leave': primaryAction === 'leave' }"
          :data-testid="primaryAction === 'go'
            ? 'map-place-use-destination'
            : primaryAction === 'view_journey'
              ? 'map-place-view-journey'
              : primaryAction === 'enter'
                ? 'map-place-enter'
                : 'map-place-leave'"
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

.map-place-focus-media {
  margin: 14px -18px 0;
  border-top: 1px solid #e1e6e3;
  border-bottom: 1px solid #e1e6e3;
  background: #eef2ef;
}

.map-place-focus-media-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #e4eae6;
}

.map-place-focus-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.map-place-focus-media-fallback {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  border-block: 1px solid color-mix(in srgb, var(--map-place-tone) 24%, transparent);
  background: color-mix(in srgb, var(--map-place-tone) 12%, #edf2ee);
  color: color-mix(in srgb, var(--map-place-tone) 74%, #27352e);
}

.map-place-focus-media-fallback::before {
  position: absolute;
  inset: 15% 9%;
  border: 1px solid color-mix(in srgb, var(--map-place-tone) 26%, transparent);
  content: '';
}

.map-place-focus-media-fallback i {
  position: relative;
  font-size: 38px;
}

.map-place-focus-media-kind {
  position: absolute;
  top: 10px;
  left: 12px;
  border: 1px solid rgba(255, 255, 255, 0.66);
  border-radius: 6px;
  background: rgba(22, 31, 27, 0.78);
  padding: 5px 7px;
  color: #fff;
  font-size: 9px;
  font-weight: 850;
  line-height: 1;
}

.map-place-focus-media figcaption {
  display: grid;
  gap: 3px;
  padding: 8px 18px 9px;
  color: #5c6b63;
  font-size: 9px;
  line-height: 1.4;
}

.map-place-focus-media-credit {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 0 4px;
  color: #7a8780;
}

.map-place-focus-media-credit a {
  color: #315f50;
  font-weight: 750;
  text-decoration: underline;
  text-decoration-color: #a8bbb1;
  text-underline-offset: 2px;
}

.map-place-focus-media-changes { color: #7a8780; }

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

.map-place-event-invitation {
  display: grid;
  min-width: 0;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 9px;
  margin-top: 12px;
  border: 1px solid #e3c893;
  border-radius: 7px;
  background: #fff9eb;
  padding: 9px;
  color: #5b4318;
}

.map-place-event-invitation-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 7px;
  background: #b45309;
  color: #fff;
  font-size: 12px;
}

.map-place-event-invitation h3,
.map-place-event-invitation p { overflow-wrap: anywhere; }
.map-place-event-invitation h3 { font-size: 10px; font-weight: 850; line-height: 1.35; }
.map-place-event-invitation p { margin-top: 2px; color: #765f34; font-size: 9px; line-height: 1.45; }
.map-place-event-invitation button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 7px;
  background: #fff;
  color: #8d4d09;
}

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
.map-place-focus-primary.is-leave { border: 1px solid #d7dfda; background: #fff; color: #40544a; }
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
  .map-place-focus-sheet {
    max-height: min(92vh, 760px);
    margin-bottom: 18px;
    border-radius: 8px;
  }
}
</style>
