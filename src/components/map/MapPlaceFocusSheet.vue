<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createMapPlaceMediaFallback } from '../../lib/map-place-media'

const props = defineProps({
  place: { type: Object, required: true },
  visual: { type: Object, required: true },
  media: { type: Object, default: null },
  mediaGallery: { type: Array, default: () => [] },
  name: { type: String, required: true },
  secondaryName: { type: String, default: '' },
  summary: { type: String, default: '' },
  detail: { type: String, default: '' },
  secondaryDetail: { type: String, default: '' },
  sourceLabel: { type: String, required: true },
  categoryLabel: { type: String, default: '' },
  contextLabel: { type: String, required: true },
  contextTone: { type: String, default: 'remote' },
  anchor: { type: Object, default: null },
  primaryAction: {
    type: String,
    default: 'go',
    validator: (value) => ['go', 'current', 'view_journey', 'none'].includes(value),
  },
  entryAction: {
    type: String,
    default: 'unavailable',
    validator: (value) => ['unavailable', 'enter', 'leave'].includes(value),
  },
  eventInvitation: { type: Object, default: null },
  canManage: { type: Boolean, default: false },
  pinVisible: { type: Boolean, default: true },
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
  'show-pin',
])

const level = ref('overview')
const overviewMediaLoadFailed = ref(false)
const detailMediaIndex = ref(0)
const detailMediaLoadFailures = ref(new Set())
const cardRef = ref(null)
const scrollRef = ref(null)
const detailBackRef = ref(null)
const primaryActionNotice = ref('')
const entryNotice = ref('')
const addressCopyNotice = ref('')
const viewportSize = ref({ width: 1024, height: 768 })
const cardSize = ref({ width: 360, height: 340 })
let opener = null
let cardResizeObserver = null
let primaryActionNoticeTimer = null
let entryNoticeTimer = null
let addressCopyNoticeTimer = null
let detailTouchStartX = null

const resetCardScroll = () => {
  if (scrollRef.value) scrollRef.value.scrollTop = 0
}

const openDetail = async () => {
  level.value = 'detail'
  detailMediaIndex.value = 0
  await nextTick()
  resetCardScroll()
  detailBackRef.value?.focus?.({ preventScroll: true })
}

const showOverview = async () => {
  level.value = 'overview'
  await nextTick()
  resetCardScroll()
}

const closeCard = () => emit('close')

const handleDocumentKeydown = (event) => {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  event.preventDefault()
  closeCard()
}

watch(
  () => props.place?.placeId || props.place?.id,
  async () => {
    level.value = 'overview'
    overviewMediaLoadFailed.value = false
    detailMediaIndex.value = 0
    detailMediaLoadFailures.value = new Set()
    primaryActionNotice.value = ''
    entryNotice.value = ''
    addressCopyNotice.value = ''
    clearTimeout(primaryActionNoticeTimer)
    await nextTick()
    resetCardScroll()
  },
)

watch(
  () => props.media?.id,
  () => {
    overviewMediaLoadFailed.value = false
    detailMediaIndex.value = 0
    detailMediaLoadFailures.value = new Set()
  },
)

watch(
  () => props.mediaGallery.map((item) => item?.id).join('|'),
  () => {
    detailMediaIndex.value = 0
    detailMediaLoadFailures.value = new Set()
  },
)

watch(
  () => props.primaryAction,
  () => {
    primaryActionNotice.value = ''
    clearTimeout(primaryActionNoticeTimer)
  },
)

const isDetail = computed(() => level.value === 'detail')
const displayedMedia = computed(() => (
  overviewMediaLoadFailed.value
    ? createMapPlaceMediaFallback(props.place, props.media?.mapPackId)
    : props.media
))
const detailGallery = computed(() => (
  props.mediaGallery.length > 0
    ? props.mediaGallery
    : displayedMedia.value ? [displayedMedia.value] : []
))
const activeDetailMedia = computed(() => (
  detailGallery.value[detailMediaIndex.value] || detailGallery.value[0] || displayedMedia.value
))
const displayedDetailMedia = computed(() => (
  detailMediaLoadFailures.value.has(activeDetailMedia.value?.id)
    ? createMapPlaceMediaFallback(props.place, activeDetailMedia.value?.mapPackId)
    : activeDetailMedia.value
))
const hasMediaImage = computed(() => Boolean(displayedMedia.value?.asset?.url))
const hasDetailMediaImage = computed(() => Boolean(displayedDetailMedia.value?.asset?.url))
const isCategoryFallback = computed(() => displayedMedia.value?.kind === 'category_fallback')
const isDetailCategoryFallback = computed(() => displayedDetailMedia.value?.kind === 'category_fallback')
const mediaLabel = computed(() => props.t(
  displayedMedia.value?.labelZh || '',
  displayedMedia.value?.labelEn || '',
))
const mediaNote = computed(() => props.t(
  displayedMedia.value?.noteZh || '',
  displayedMedia.value?.noteEn || '',
))
const detailMediaLabel = computed(() => props.t(
  displayedDetailMedia.value?.labelZh || '',
  displayedDetailMedia.value?.labelEn || '',
))
const detailMediaNote = computed(() => props.t(
  displayedDetailMedia.value?.noteZh || '',
  displayedDetailMedia.value?.noteEn || '',
))
const mediaAlt = computed(() => props.t(
  displayedMedia.value?.asset?.altZh || '',
  displayedMedia.value?.asset?.altEn || '',
))
const detailMediaAlt = computed(() => props.t(
  displayedDetailMedia.value?.asset?.altZh || '',
  displayedDetailMedia.value?.asset?.altEn || '',
))
const detailMediaChanges = computed(() => props.t(
  displayedDetailMedia.value?.source?.changesZh || '',
  displayedDetailMedia.value?.source?.changesEn || '',
))
const addressToCopy = computed(() => props.detail || props.secondaryDetail || '')
const primaryLabel = computed(() =>
  props.primaryAction === 'view_journey'
    ? props.t('查看行程', 'View journey')
    : props.t('前往', 'Go'),
)
const primaryIcon = computed(() =>
  props.primaryAction === 'view_journey'
    ? 'fas fa-route'
    : 'fas fa-location-arrow',
)
const entryLabel = computed(() => (
  props.entryAction === 'leave'
    ? props.t('离开', 'Leave')
    : props.t('进入', 'Enter')
))
const entryIcon = computed(() => (
  props.entryAction === 'leave' ? 'fas fa-arrow-right-from-bracket' : 'fas fa-door-open'
))

const moveDetailMedia = (direction) => {
  const count = detailGallery.value.length
  if (count < 2) return
  detailMediaIndex.value = (detailMediaIndex.value + direction + count) % count
}

const markDetailMediaFailed = () => {
  if (!activeDetailMedia.value?.id) return
  detailMediaLoadFailures.value = new Set([
    ...detailMediaLoadFailures.value,
    activeDetailMedia.value.id,
  ])
}

const beginDetailSwipe = (event) => {
  detailTouchStartX = event.changedTouches?.[0]?.clientX ?? null
}

const finishDetailSwipe = (event) => {
  const endX = event.changedTouches?.[0]?.clientX
  if (!Number.isFinite(detailTouchStartX) || !Number.isFinite(endX)) return
  const distance = endX - detailTouchStartX
  detailTouchStartX = null
  if (Math.abs(distance) < 40) return
  moveDetailMedia(distance < 0 ? 1 : -1)
}

const cardLayout = computed(() => {
  const viewportWidth = Math.max(320, Number(viewportSize.value.width) || 1024)
  const viewportHeight = Math.max(480, Number(viewportSize.value.height) || 768)
  const cardWidth = Math.min(
    Math.max(280, Number(cardSize.value.width) || 360),
    viewportWidth - 24,
  )
  const anchorX = Number.isFinite(Number(props.anchor?.x))
    ? Number(props.anchor.x)
    : viewportWidth / 2
  const anchorY = Number.isFinite(Number(props.anchor?.y))
    ? Number(props.anchor.y)
    : viewportHeight / 2
  const safeTop = viewportWidth < 720 ? 162 : 24
  const safeBottom = viewportWidth < 720 ? 82 : 24
  const gap = 18
  const availableAbove = Math.max(0, anchorY - safeTop - gap)
  const availableBelow = Math.max(0, viewportHeight - safeBottom - anchorY - gap)
  const placement = availableAbove >= availableBelow ? 'above' : 'below'
  const availableHeight = Math.max(180, placement === 'above' ? availableAbove : availableBelow)
  const renderedHeight = isDetail.value
    ? Math.min(Math.max(180, Number(cardSize.value.height) || 480), availableHeight)
    : Math.max(180, Number(cardSize.value.height) || 340)
  const left = Math.min(
    viewportWidth - cardWidth - 12,
    Math.max(12, anchorX - cardWidth / 2),
  )
  const unclampedTop = placement === 'above'
    ? anchorY - gap - renderedHeight
    : anchorY + gap
  const top = Math.min(
    viewportHeight - safeBottom - renderedHeight,
    Math.max(safeTop, unclampedTop),
  )
  const pointerX = Math.min(cardWidth - 24, Math.max(24, anchorX - left))

  return {
    placement,
    style: {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      width: `${Math.round(cardWidth)}px`,
      maxHeight: isDetail.value ? `${Math.round(availableHeight)}px` : undefined,
      '--map-place-pointer-x': `${Math.round(pointerX)}px`,
    },
  }
})

const runPrimaryAction = () => {
  entryNotice.value = ''
  clearTimeout(entryNoticeTimer)

  if (props.primaryAction === 'current') {
    primaryActionNotice.value = props.t('目前正在此处', 'You are currently here')
    clearTimeout(primaryActionNoticeTimer)
    primaryActionNoticeTimer = setTimeout(() => { primaryActionNotice.value = '' }, 2600)
    return
  }

  primaryActionNotice.value = ''
  clearTimeout(primaryActionNoticeTimer)
  if (props.primaryAction === 'view_journey') emit('view-journey')
  else if (props.primaryAction === 'go') emit('go')
}

const runEntryAction = () => {
  primaryActionNotice.value = ''
  clearTimeout(primaryActionNoticeTimer)

  if (props.entryAction === 'enter') {
    emit('enter')
    return
  }
  if (props.entryAction === 'leave') {
    emit('leave')
    return
  }
  entryNotice.value = props.t('当前不在设施附近', 'You are not near this facility')
  clearTimeout(entryNoticeTimer)
  entryNoticeTimer = setTimeout(() => { entryNotice.value = '' }, 2600)
}

const copyTextFallback = (value) => {
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand?.('copy') === true
  textarea.remove()
  return copied
}

const copyAddress = async () => {
  const value = addressToCopy.value
  if (!value) return

  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value)
    else if (!copyTextFallback(value)) throw new Error('clipboard_unavailable')
    addressCopyNotice.value = props.t('地址已复制', 'Address copied')
  } catch {
    addressCopyNotice.value = props.t('复制失败，请稍后重试', 'Copy failed. Please try again.')
  }

  clearTimeout(addressCopyNoticeTimer)
  addressCopyNoticeTimer = setTimeout(() => { addressCopyNotice.value = '' }, 2400)
}

const syncViewportSize = () => {
  viewportSize.value = {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

onMounted(() => {
  opener = document.activeElement
  document.addEventListener('keydown', handleDocumentKeydown)
  syncViewportSize()
  window.addEventListener('resize', syncViewportSize)
  if (typeof ResizeObserver !== 'undefined') {
    cardResizeObserver = new ResizeObserver(([entry]) => {
      if (!entry?.contentRect) return
      cardSize.value = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }
    })
    if (cardRef.value) cardResizeObserver.observe(cardRef.value)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleDocumentKeydown)
  window.removeEventListener('resize', syncViewportSize)
  cardResizeObserver?.disconnect()
  clearTimeout(primaryActionNoticeTimer)
  clearTimeout(entryNoticeTimer)
  clearTimeout(addressCopyNoticeTimer)
  if (opener?.isConnected) opener.focus?.({ preventScroll: true })
})
</script>

<template>
  <section
    ref="cardRef"
    class="map-place-focus-card"
    :class="{ 'is-detail': isDetail, 'is-category-fallback': isCategoryFallback }"
    role="region"
    :aria-labelledby="`map-place-title-${place.placeId || place.id}`"
    :style="[cardLayout.style, { '--map-place-tone': visual.tone }]"
    :data-placement="cardLayout.placement"
    data-testid="map-place-detail-sheet"
    data-surface="place-focus"
  >
    <span class="map-place-focus-pointer" aria-hidden="true"></span>
    <div ref="scrollRef" class="map-place-focus-scroll">
      <header class="map-place-focus-head">
      <button
        v-if="isDetail"
        ref="detailBackRef"
        type="button"
        class="map-place-focus-icon-button"
        :aria-label="t('返回地点概览', 'Back to place overview')"
        data-testid="map-place-detail-back"
        @click="showOverview"
      >
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <span v-else class="map-place-focus-icon" aria-hidden="true">
        <i :class="visual.icon"></i>
      </span>

      <div class="map-place-focus-heading">
        <div class="map-place-focus-kicker">
          <span>{{ categoryLabel || sourceLabel }}</span>
          <span v-if="categoryLabel && sourceLabel">{{ sourceLabel }}</span>
        </div>
        <h2 :id="`map-place-title-${place.placeId || place.id}`">{{ name }}</h2>
        <p v-if="secondaryName" class="map-place-focus-secondary-name" data-testid="map-place-secondary-name">
          {{ secondaryName }}
        </p>
      </div>

        <div class="map-place-focus-head-actions">
          <button
            v-if="isDetail"
            type="button"
            class="map-place-focus-icon-button"
            :aria-label="t('分享地点', 'Share place')"
            :title="t('分享地点', 'Share place')"
            data-testid="map-place-share-chat"
            @click="emit('share')"
          >
            <i class="fas fa-share-nodes" aria-hidden="true"></i>
          </button>
          <button
            v-if="isDetail && canManage"
            type="button"
            class="map-place-focus-icon-button"
            :aria-label="t('管理地点', 'Manage place')"
            :title="t('管理地点', 'Manage place')"
            data-testid="map-place-manage-pin"
            @click="emit('manage')"
          >
            <i class="fas fa-pen-to-square" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="map-place-focus-icon-button"
            :aria-label="t('关闭', 'Close')"
            :title="t('关闭', 'Close')"
            @click="closeCard"
          >
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      </header>

    <template v-if="!isDetail">
      <figure class="map-place-focus-media" data-testid="map-place-media">
        <div class="map-place-focus-media-frame">
          <img
            v-if="hasMediaImage"
            :src="displayedMedia.asset.url"
            :alt="mediaAlt"
            width="1600"
            height="900"
            decoding="async"
            data-testid="map-place-media-image"
            @error="overviewMediaLoadFailed = true"
          />
          <span class="map-place-focus-media-kind">{{ mediaLabel }}</span>
        </div>
      </figure>

      <div class="map-place-overview-content">
        <div class="map-place-overview-copy">
          <div class="map-place-introduction">
            <span class="map-place-section-label">{{ t('关于这里', 'About this place') }}</span>
            <p class="map-place-focus-summary" data-testid="map-place-summary">{{ summary }}</p>
          </div>

          <div
            class="map-place-focus-context"
            :class="`is-${contextTone}`"
            data-testid="map-place-context"
          >
            <i class="fas fa-location-dot" aria-hidden="true"></i>
            <span>{{ contextLabel }}</span>
          </div>

          <p v-if="isCategoryFallback" class="map-place-media-truth" data-testid="map-place-media-truth">
            <i class="fas fa-shapes" aria-hidden="true"></i>
            <span>{{ mediaNote }}</span>
          </p>
        </div>

        <div
          v-if="!pinVisible"
          class="map-place-focus-pin-state"
          data-testid="map-place-pin-hidden"
        >
          <i class="fas fa-eye-slash" aria-hidden="true"></i>
          <span>{{ t('这个图钉当前没有显示在地图上', 'This pin is currently hidden from the map') }}</span>
          <button type="button" data-testid="map-place-show-pin" @click="emit('show-pin')">
            {{ t('恢复显示', 'Show pin') }}
          </button>
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
            :aria-label="t('打开互动', 'Open interaction')"
            :title="t('打开互动', 'Open interaction')"
            data-testid="map-place-expand-event"
            @click="emit('expand-event')"
          >
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
        </section>
      </div>

      <div class="map-place-focus-actions">
        <div v-if="['go', 'current', 'view_journey'].includes(primaryAction)" class="map-place-primary-slot">
          <button
            type="button"
            class="map-place-focus-primary"
            :class="{ 'is-current': primaryAction === 'current' }"
            :aria-label="primaryAction === 'current'
              ? t('前往，目前正在此处', 'Go, you are currently here')
              : primaryLabel"
            :title="primaryAction === 'current'
              ? t('目前正在此处', 'You are currently here')
              : primaryLabel"
            :data-primary-state="primaryAction"
            :data-testid="primaryAction === 'go'
              ? 'map-place-use-destination'
              : primaryAction === 'current'
                ? 'map-place-current-location-action'
                : 'map-place-view-journey'"
            @click="runPrimaryAction"
          >
            <i :class="primaryIcon" aria-hidden="true"></i>
            <span class="map-place-action-label">{{ primaryLabel }}</span>
          </button>
          <p
            v-if="primaryActionNotice"
            class="map-place-primary-notice"
            role="status"
            data-testid="map-place-primary-action-notice"
          >
            {{ primaryActionNotice }}
          </p>
        </div>

        <button type="button" class="map-place-focus-secondary" data-testid="map-place-open-detail" @click="openDetail">
          <i class="fas fa-circle-info" aria-hidden="true"></i>
          <span class="map-place-action-label">{{ t('地点详情', 'Place details') }}</span>
        </button>
        <div class="map-place-entry-slot">
          <button
            type="button"
            class="map-place-entry-action"
            :class="`is-${entryAction}`"
            :aria-label="entryAction === 'unavailable'
              ? t('进入地点，当前不在设施附近', 'Enter place, currently not near this facility')
              : entryLabel"
            :title="entryAction === 'unavailable'
              ? t('当前不在设施附近', 'You are not near this facility')
              : entryLabel"
            :data-entry-state="entryAction"
            :data-testid="entryAction === 'enter'
              ? 'map-place-enter'
              : entryAction === 'leave'
                ? 'map-place-leave'
                : 'map-place-entry-action'"
            @click="runEntryAction"
          >
            <i :class="entryIcon" aria-hidden="true"></i>
            <span class="map-place-action-label">{{ entryLabel }}</span>
          </button>
          <p v-if="entryNotice" class="map-place-entry-notice" role="status" data-testid="map-place-entry-notice">
            {{ entryNotice }}
          </p>
        </div>
      </div>
    </template>

    <div v-else class="map-place-focus-detail" data-testid="map-place-detail-view">
      <figure
        class="map-place-detail-media"
        :class="{ 'is-category-fallback': isDetailCategoryFallback }"
        data-testid="map-place-detail-media"
        :tabindex="detailGallery.length > 1 ? 0 : undefined"
        :aria-label="detailGallery.length > 1
          ? t(`地点图片 ${detailMediaIndex + 1}，共 ${detailGallery.length} 张`, `Place image ${detailMediaIndex + 1} of ${detailGallery.length}`)
          : undefined"
        @keydown.left.prevent="moveDetailMedia(-1)"
        @keydown.right.prevent="moveDetailMedia(1)"
        @touchstart.passive="beginDetailSwipe"
        @touchend.passive="finishDetailSwipe"
      >
        <img
          v-if="hasDetailMediaImage"
          :src="displayedDetailMedia.asset.url"
          :alt="detailMediaAlt"
          width="1600"
          height="900"
          decoding="async"
          data-testid="map-place-detail-media-image"
          @error="markDetailMediaFailed"
        />
        <span class="map-place-focus-media-kind">{{ detailMediaLabel }}</span>
        <template v-if="detailGallery.length > 1">
          <button
            type="button"
            class="map-place-gallery-button is-previous"
            :aria-label="t('上一张图片', 'Previous image')"
            :title="t('上一张图片', 'Previous image')"
            data-testid="map-place-gallery-previous"
            @click="moveDetailMedia(-1)"
          >
            <i class="fas fa-chevron-left" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="map-place-gallery-button is-next"
            :aria-label="t('下一张图片', 'Next image')"
            :title="t('下一张图片', 'Next image')"
            data-testid="map-place-gallery-next"
            @click="moveDetailMedia(1)"
          >
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
          <span class="map-place-gallery-count" aria-live="polite" data-testid="map-place-gallery-count">
            {{ detailMediaIndex + 1 }} / {{ detailGallery.length }}
          </span>
        </template>
      </figure>

      <div class="map-place-detail-copy">
        <section class="map-place-detail-about" data-testid="map-place-about-section">
          <span class="map-place-section-label">{{ t('关于这里', 'About this place') }}</span>
          <p class="map-place-detail-summary">{{ summary }}</p>
        </section>

        <div class="map-place-detail-location" data-testid="map-place-location-section">
          <i class="fas fa-location-dot" aria-hidden="true"></i>
          <span class="map-place-detail-address-copy">
            <strong v-if="detail">{{ detail }}</strong>
            <small v-if="secondaryDetail && secondaryDetail !== detail" data-testid="map-place-secondary-detail">
              {{ secondaryDetail }}
            </small>
            <small>{{ contextLabel }}</small>
            <small
              v-if="addressCopyNotice"
              class="map-place-copy-notice"
              role="status"
              data-testid="map-place-address-copy-notice"
            >{{ addressCopyNotice }}</small>
          </span>
          <button
            v-if="addressToCopy"
            type="button"
            class="map-place-address-copy-button"
            :aria-label="t('复制地址', 'Copy address')"
            :title="t('复制地址', 'Copy address')"
            data-testid="map-place-copy-address"
            @click="copyAddress"
          >
            <i class="fas fa-copy" aria-hidden="true"></i>
          </button>
        </div>

        <div
          v-if="!pinVisible"
          class="map-place-detail-inline-action"
          data-testid="map-place-pin-hidden"
        >
          <span>{{ t('图钉已隐藏', 'Pin hidden') }}</span>
          <button type="button" data-testid="map-place-show-pin" @click="emit('show-pin')">
            {{ t('恢复显示', 'Show pin') }}
          </button>
        </div>

        <details class="map-place-media-source" data-testid="map-place-media-source">
          <summary>
            <span>
              <i class="fas fa-circle-info" aria-hidden="true"></i>
              {{ t('图片信息', 'Image information') }}
            </span>
            <i class="fas fa-chevron-down map-place-media-source-chevron" aria-hidden="true"></i>
          </summary>
          <div class="map-place-media-source-content">
            <span>{{ detailMediaNote }}</span>
            <span class="map-place-media-links">
              <a
                v-if="displayedDetailMedia.source?.sourcePageUrl"
                :href="displayedDetailMedia.source.sourcePageUrl"
                target="_blank"
                rel="noreferrer noopener"
              >{{ displayedDetailMedia.source.creator || t('照片来源', 'Photo source') }}</a>
              <a
                v-if="displayedDetailMedia.source?.licenseUrl"
                :href="displayedDetailMedia.source.licenseUrl"
                target="_blank"
                rel="noreferrer noopener"
              >{{ displayedDetailMedia.source.licenseId }}</a>
              <span v-if="detailMediaChanges">{{ detailMediaChanges }}</span>
            </span>
          </div>
        </details>
      </div>
    </div>
    </div>
  </section>
</template>

<style scoped>
.map-place-focus-card {
  position: fixed;
  z-index: 70;
  max-width: calc(100vw - 24px);
  overflow: visible;
  color: #17211d;
  filter: drop-shadow(0 18px 34px rgba(18, 38, 27, 0.2));
  animation: map-place-card-enter 170ms cubic-bezier(0.2, 0.78, 0.32, 1) both;
}

.map-place-focus-scroll {
  box-sizing: border-box;
  max-height: inherit;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid rgba(207, 219, 212, 0.94);
  border-radius: 8px;
  background: rgba(252, 253, 252, 0.96);
  padding: 12px;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(18px) saturate(1.08);
}

.map-place-focus-card:not(.is-detail) .map-place-focus-scroll {
  display: grid;
  grid-template-rows: repeat(4, auto);
  overflow: hidden;
}

.map-place-overview-content {
  min-height: 0;
}

.map-place-focus-pointer {
  position: absolute;
  left: var(--map-place-pointer-x);
  z-index: 2;
  width: 14px;
  height: 14px;
  border: solid rgba(207, 219, 212, 0.94);
  background: rgba(252, 253, 252, 0.98);
  transform: translateX(-50%) rotate(45deg);
}

.map-place-focus-card[data-placement='above'] .map-place-focus-pointer {
  bottom: -6px;
  border-width: 0 1px 1px 0;
}

.map-place-focus-card[data-placement='below'] .map-place-focus-pointer {
  top: -6px;
  border-width: 1px 0 0 1px;
}

@keyframes map-place-card-enter {
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.map-place-focus-head {
  position: sticky;
  top: -12px;
  z-index: 3;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
  margin: -2px -2px 0;
  padding: 2px 2px 10px;
  background: linear-gradient(to bottom, rgba(252, 253, 252, 0.99) 78%, rgba(252, 253, 252, 0));
}

.map-place-focus-head-actions { display: flex; align-items: center; gap: 5px; }

.map-place-focus-icon,
.map-place-focus-icon-button {
  display: grid;
  place-items: center;
  border-radius: 7px;
}

.map-place-focus-icon {
  width: 40px;
  height: 40px;
  background: color-mix(in srgb, var(--map-place-tone) 13%, white);
  color: var(--map-place-tone);
  font-size: 14px;
}

.map-place-focus-icon-button {
  width: 40px;
  height: 40px;
  border: 1px solid #dce3de;
  background: rgba(255, 255, 255, 0.9);
  color: #526158;
  transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease, transform 150ms ease;
}

.map-place-focus-icon-button:hover { border-color: #b9cbc1; background: #f3f7f4; color: #17664f; }
.map-place-focus-icon-button:active { transform: scale(0.96); }

.map-place-focus-heading { min-width: 0; }
.map-place-focus-kicker { display: flex; min-width: 0; flex-wrap: wrap; gap: 4px 7px; color: #718078; font-size: 12px; font-weight: 800; }
.map-place-focus-kicker span + span::before { content: '/'; margin-right: 7px; color: #acb5af; }
.map-place-focus-heading h2 { overflow-wrap: anywhere; margin-top: 3px; font-size: 17px; font-weight: 850; line-height: 1.24; }
.map-place-focus-secondary-name { margin-top: 2px; color: #607168; font-size: 12px; font-weight: 700; }

.map-place-focus-media { min-width: 0; overflow: hidden; margin: 0 -12px; background: #e7ece9; }
.map-place-focus-media-frame,
.map-place-detail-media { position: relative; overflow: hidden; background: #e4eae6; }
.map-place-focus-media-frame { aspect-ratio: 16 / 7; }
.map-place-focus-media img,
.map-place-detail-media img { display: block; width: 100%; height: 100%; object-fit: cover; }

.is-category-fallback .map-place-focus-media-frame::after,
.map-place-detail-media.is-category-fallback::after {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--map-place-tone) 14%, transparent);
  content: '';
  pointer-events: none;
}

.map-place-focus-media-kind {
  position: absolute;
  top: 7px;
  left: 7px;
  z-index: 2;
  max-width: calc(100% - 14px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 5px;
  background: rgba(21, 31, 26, 0.74);
  padding: 4px 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  backdrop-filter: blur(8px);
}

.map-place-overview-copy { display: flex; min-width: 0; flex-direction: column; padding-top: 11px; }
.map-place-introduction { min-width: 0; }
.map-place-section-label { display: block; margin-bottom: 4px; color: #76837c; font-size: 12px; font-weight: 850; letter-spacing: 0; }
.map-place-focus-summary { color: #3e4f46; font-size: 14px; font-weight: 650; line-height: 1.55; text-wrap: pretty; }

.map-place-focus-context {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  color: #416052;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.map-place-focus-context i { flex: 0 0 auto; color: #17664f; }
.map-place-focus-context.is-current { color: #165741; }
.map-place-focus-context.is-journey { color: #31576d; }

.map-place-media-truth { display: flex; min-width: 0; align-items: center; gap: 6px; margin-top: 7px; color: #7a8780; font-size: 12px; font-weight: 650; line-height: 1.35; }
.map-place-media-truth i { flex: 0 0 auto; color: var(--map-place-tone); }

.map-place-focus-pin-state,
.map-place-detail-inline-action {
  display: grid;
  min-width: 0;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  border-top: 1px solid #e3e8e5;
  padding-top: 9px;
  color: #665f4c;
  font-size: 12px;
  font-weight: 750;
}

.map-place-focus-pin-state > i { color: #8c7032; }
.map-place-focus-pin-state button,
.map-place-detail-inline-action button { min-height: 40px; border: 1px solid #d9dfdb; border-radius: 6px; background: #fff; padding: 0 10px; color: #315246; font-size: 14px; font-weight: 850; }

.map-place-event-invitation {
  display: grid;
  min-width: 0;
  grid-template-columns: 32px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  border: 1px solid #e4ca95;
  border-radius: 7px;
  background: #fff9ec;
  padding: 8px;
  color: #5b4318;
}

.map-place-event-invitation-icon { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 6px; background: #a95a0c; color: #fff; font-size: 11px; }
.map-place-event-invitation h3,
.map-place-event-invitation p { overflow-wrap: anywhere; }
.map-place-event-invitation h3 { font-size: 14px; font-weight: 850; line-height: 1.35; }
.map-place-event-invitation p { margin-top: 2px; color: #765f34; font-size: 12px; line-height: 1.4; }
.map-place-event-invitation button { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 6px; background: #fff; color: #8d4d09; }

.map-place-focus-actions { position: relative; z-index: 2; display: grid; min-width: 0; grid-template-columns: repeat(3, 40px); align-items: center; justify-content: end; gap: 7px; margin-top: 11px; border-top: 1px solid #e3e8e5; background: rgba(252, 253, 252, 0.98); padding-top: 10px; }
.map-place-focus-primary,
.map-place-focus-secondary,
.map-place-focus-tool,
.map-place-entry-action { display: inline-flex; width: 40px; min-width: 40px; height: 40px; align-items: center; justify-content: center; border-radius: 7px; font-size: 14px; font-weight: 850; transition: transform 140ms ease, background-color 140ms ease, border-color 140ms ease, color 140ms ease; }
.map-place-primary-slot { position: relative; width: 40px; min-width: 40px; grid-column: 1; }
.map-place-focus-primary { background: #17664f; padding: 0; color: #fff; }
.map-place-focus-secondary { grid-column: 2; border: 1px solid #dce3de; background: #fff; padding: 0; color: #40544a; }
.map-place-focus-secondary i { color: var(--map-place-tone); }
.map-place-focus-tool { width: 40px; flex: 0 0 40px; border: 1px solid #dce3de; background: #fff; color: var(--map-place-tone); }
.map-place-entry-slot { position: relative; width: 40px; min-width: 40px; grid-column: 3; }
.map-place-entry-action { border: 1px solid color-mix(in srgb, var(--map-place-tone) 50%, #dce3de); background: color-mix(in srgb, var(--map-place-tone) 12%, white); padding: 0; color: var(--map-place-tone); }
.map-place-action-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.map-place-focus-primary.is-current { border: 1px solid #dfe4e1; background: #f2f4f3; color: #59665f; }
.map-place-entry-action.is-unavailable { border-color: #dfe4e1; background: #f2f4f3; color: #66736c; }
.map-place-entry-action.is-unavailable:hover { border-color: #d9dfdc; background: #eef1ef; color: #59665f; }
.map-place-entry-action.is-leave { border-color: #d8dedb; background: #fff; color: #536159; }
.map-place-entry-notice,
.map-place-primary-notice { position: absolute; z-index: 4; bottom: calc(100% + 7px); width: max-content; max-width: min(210px, calc(100vw - 32px)); margin: 0; border: 1px solid #ddd3bd; border-radius: 6px; background: #fffdf8; padding: 7px 9px; box-shadow: 0 5px 14px rgb(58 50 34 / 14%); color: #6f5a35; font-size: 12px; font-weight: 750; line-height: 1.35; pointer-events: none; text-align: left; }
.map-place-entry-notice { right: 0; }
.map-place-primary-notice { left: 0; }
.map-place-entry-notice::after { position: absolute; right: 24px; bottom: -5px; width: 8px; height: 8px; border-right: 1px solid #ddd3bd; border-bottom: 1px solid #ddd3bd; background: #fffdf8; content: ''; transform: rotate(45deg); }
.map-place-primary-notice::after { position: absolute; bottom: -5px; left: 24px; width: 8px; height: 8px; border-right: 1px solid #ddd3bd; border-bottom: 1px solid #ddd3bd; background: #fffdf8; content: ''; transform: rotate(45deg); }
.map-place-focus-primary:hover { background: #125640; }
.map-place-focus-primary.is-current:hover { border-color: #d9dfdc; background: #eef1ef; color: #4f5c55; }
.map-place-focus-secondary:hover,
.map-place-focus-tool:hover,
.map-place-entry-action:hover { border-color: #b8c9bf; background: #f3f7f4; }
.map-place-focus-primary:active,
.map-place-focus-secondary:active,
.map-place-focus-tool:active,
.map-place-entry-action:active { transform: scale(0.97); }

.map-place-focus-detail { margin-top: 2px; }
.map-place-detail-media { aspect-ratio: 16 / 7; margin: 0 -12px; outline: none; touch-action: pan-y; }
.map-place-gallery-button {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 7px;
  background: rgb(19 29 24 / 68%);
  color: #fff;
  transform: translateY(-50%);
  backdrop-filter: blur(8px);
}
.map-place-gallery-button:hover { background: rgb(19 29 24 / 82%); }
.map-place-gallery-button:active { transform: translateY(-50%) scale(0.96); }
.map-place-gallery-button.is-previous { left: 7px; }
.map-place-gallery-button.is-next { right: 7px; }
.map-place-gallery-count {
  position: absolute;
  right: 7px;
  bottom: 7px;
  z-index: 2;
  border-radius: 5px;
  background: rgb(19 29 24 / 72%);
  padding: 4px 7px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  backdrop-filter: blur(8px);
}
.map-place-detail-copy { padding-top: 12px; }
.map-place-detail-about { min-width: 0; }
.map-place-detail-summary { color: #33483e; font-size: 14px; font-weight: 650; line-height: 1.62; text-wrap: pretty; }

.map-place-detail-location { display: grid; min-width: 0; grid-template-columns: 18px minmax(0, 1fr) 40px; align-items: start; gap: 8px; margin-top: 12px; border-top: 1px solid #e3e8e5; padding-top: 11px; color: #43564d; }
.map-place-detail-location > i { padding-top: 2px; color: #17664f; text-align: center; }
.map-place-detail-address-copy { display: grid; min-width: 0; gap: 3px; }
.map-place-detail-location strong { overflow-wrap: anywhere; font-size: 14px; line-height: 1.45; }
.map-place-detail-location small { overflow-wrap: anywhere; color: #748179; font-size: 12px; font-weight: 650; line-height: 1.4; }
.map-place-address-copy-button { display: grid; width: 40px; height: 40px; place-items: center; border: 1px solid #dce3de; border-radius: 7px; background: #fff; color: #315f50; transition: border-color 140ms ease, background-color 140ms ease, color 140ms ease, transform 140ms ease; }
.map-place-address-copy-button:hover { border-color: #b8c9bf; background: #f3f7f4; color: #17664f; }
.map-place-address-copy-button:active { transform: scale(0.96); }
.map-place-copy-notice { color: #17664f !important; font-weight: 800 !important; }
.map-place-detail-inline-action { grid-template-columns: minmax(0, 1fr) auto; }

.map-place-media-source { margin-top: 12px; border-top: 1px solid #e3e8e5; padding-top: 7px; color: #75827b; font-size: 12px; line-height: 1.4; }
.map-place-media-source summary { display: flex; min-height: 40px; align-items: center; justify-content: space-between; gap: 10px; border-radius: 6px; padding: 0 7px; color: #526159; cursor: pointer; font-size: 14px; font-weight: 800; list-style: none; }
.map-place-media-source summary::-webkit-details-marker { display: none; }
.map-place-media-source summary:hover { background: #f3f6f4; color: #315f50; }
.map-place-media-source summary > span { display: inline-flex; min-width: 0; align-items: center; gap: 7px; }
.map-place-media-source summary > span i { color: #17664f; }
.map-place-media-source-chevron { flex: 0 0 auto; color: #87938d; font-size: 8px; transition: transform 150ms ease; }
.map-place-media-source[open] .map-place-media-source-chevron { transform: rotate(180deg); }
.map-place-media-source-content { display: grid; gap: 5px; padding: 3px 7px 7px 25px; }
.map-place-media-links { display: flex; min-width: 0; flex-wrap: wrap; gap: 4px 9px; }
.map-place-media-source a { color: #315f50; font-weight: 750; text-decoration: underline; text-decoration-color: #a8bbb1; text-underline-offset: 2px; }
button:focus-visible,
a:focus-visible { outline: 2px solid #0f8061; outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .map-place-focus-card { animation: none; }
  .map-place-focus-icon-button,
  .map-place-focus-primary,
  .map-place-focus-secondary,
  .map-place-focus-tool,
  .map-place-entry-action,
  .map-place-address-copy-button,
  .map-place-media-source-chevron { transition: none; }
}

@media (min-width: 720px) {
  .map-place-focus-card { max-width: 408px; }
}

@media (min-width: 720px) and (max-height: 820px) {
  .map-place-focus-media-frame { height: 128px; aspect-ratio: auto; }
  .map-place-focus-actions { margin-top: 8px; padding-top: 8px; }
  .map-place-focus-primary,
  .map-place-focus-secondary,
  .map-place-entry-action { height: 40px; }
}

@media (max-width: 719px) {
  .map-place-focus-head { grid-template-columns: 44px minmax(0, 1fr) auto; }
  .map-place-focus-icon-button { width: 44px; height: 44px; }
  .map-place-focus-actions { grid-template-columns: repeat(3, 44px); }
  .map-place-focus-primary,
  .map-place-focus-secondary,
  .map-place-entry-action { width: 44px; min-width: 44px; height: 44px; }
  .map-place-primary-slot,
  .map-place-entry-slot { width: 44px; min-width: 44px; }
  .map-place-event-invitation { grid-template-columns: 32px minmax(0, 1fr) 44px; }
  .map-place-event-invitation button,
  .map-place-address-copy-button { width: 44px; height: 44px; }
  .map-place-gallery-button { width: 44px; height: 44px; }
  .map-place-detail-location { grid-template-columns: 18px minmax(0, 1fr) 44px; }
  .map-place-focus-pin-state button,
  .map-place-detail-inline-action button,
  .map-place-media-source summary { min-height: 44px; }
}

@media (max-width: 719px) and (max-height: 880px) {
  .map-place-focus-scroll { padding-block: 4px 8px; }
  .map-place-focus-head { top: -4px; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 8px; padding-block: 0 2px; }
  .map-place-focus-icon { width: 34px; height: 34px; }
  .map-place-focus-heading h2 { font-size: 15px; }
  .map-place-focus-media-frame { height: clamp(96px, 18vh, 130px); aspect-ratio: auto; }
  .map-place-overview-copy { padding-top: 7px; }
  .map-place-section-label { margin-bottom: 2px; }
  .map-place-focus-summary { font-size: 13px; font-weight: 600; line-height: 1.45; }
  .map-place-focus-context { margin-top: 4px; font-size: 12px; line-height: 1.25; }
  .map-place-media-truth { margin-top: 3px; font-size: 11px; font-weight: 600; line-height: 1.25; }
  .map-place-focus-actions { gap: 5px; margin-top: 5px; padding-top: 7px; }
  .map-place-focus-card.is-detail .map-place-focus-head {
    grid-template-columns: 44px minmax(0, 1fr) auto;
  }

  .map-place-focus-card.is-detail .map-place-detail-media { aspect-ratio: 16 / 7; }
  .map-place-focus-card.is-detail .map-place-detail-summary { font-size: 14px; line-height: 1.62; }
}

@media (max-width: 360px) {
  .map-place-focus-actions { gap: 5px; }
}
</style>
