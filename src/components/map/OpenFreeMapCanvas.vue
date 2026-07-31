<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from '../../composables/useI18n'
import { mapPositionToNormalized } from '../../lib/map-packs'

const OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const SEOUL_CENTER = Object.freeze({ lat: 37.5665, lng: 126.978 })

const props = defineProps({
  mapPack: {
    type: Object,
    required: true,
  },
  pins: {
    type: Array,
    default: () => [],
  },
  pendingPosition: {
    type: Object,
    default: null,
  },
  focusPosition: {
    type: Object,
    default: null,
  },
  interactive: {
    type: Boolean,
    default: true,
  },
  allowPinPlacement: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['place-pin', 'select-pin', 'renderer-status', 'fallback'])
const { t } = useI18n()
const mapRootRef = ref(null)
const rendererStatus = ref('loading')
const mapLoaded = ref(false)
const fallbackImageStyle = computed(() => ({
  backgroundImage: props.mapPack?.assetUrl ? `url(${JSON.stringify(props.mapPack.assetUrl)})` : 'none',
}))

let maplibre = null
let mapInstance = null
let markers = []
let resizeObserver = null
let startupTimer = null
let startedAt = 0
let fallbackRequested = false

const pinLabel = (pin) =>
  t(
    pin?.nameZh || pin?.labelZh || pin?.label || pin?.name || '',
    pin?.nameEn || pin?.labelEn || pin?.label || pin?.name || '',
  )

const setRendererStatus = (status, detail = {}) => {
  rendererStatus.value = status
  emit('renderer-status', {
    status,
    provider: 'openfreemap',
    elapsedMs: startedAt ? Math.max(0, Math.round(performance.now() - startedAt)) : null,
    ...detail,
  })
}

const requestFallback = (reason = 'OPENFREEMAP_UNAVAILABLE') => {
  if (fallbackRequested || mapLoaded.value) return
  fallbackRequested = true
  clearTimeout(startupTimer)
  startupTimer = null
  emit('fallback', { reason })
}

const resolveGeoPosition = (rawPosition) => {
  if (rawPosition?.kind !== 'geo') return null
  const lat = Number(rawPosition.lat)
  const lng = Number(rawPosition.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

const resolveInitialCenter = () =>
  resolveGeoPosition(props.focusPosition) ||
  resolveGeoPosition(props.pins.find((pin) => pin?.source === 'user')?.position) ||
  SEOUL_CENTER

const createMarkerElement = (pin, pending = false) => {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = [
    'openfreemap-marker-button',
    pin?.source === 'user' ? 'is-user' : '',
    pending ? 'is-pending' : '',
  ].filter(Boolean).join(' ')
  const labelText = pending ? t('新图钉位置', 'New pin position') : pinLabel(pin)
  button.title = labelText
  button.setAttribute('aria-label', labelText)
  if (pin?.tone) button.style.setProperty('--map-marker-tone', pin.tone)

  const marker = document.createElement('span')
  marker.className = 'openfreemap-marker-shape'
  const icon = document.createElement('i')
  icon.className = pending ? 'fas fa-location-crosshairs' : pin?.icon || 'fas fa-location-dot'
  icon.setAttribute('aria-hidden', 'true')
  marker.append(icon)

  const label = document.createElement('span')
  label.className = 'openfreemap-marker-label'
  label.textContent = labelText
  button.append(marker, label)
  if (!pending && props.allowPinPlacement) {
    button.classList.add('is-placement-pass-through')
    button.tabIndex = -1
    button.setAttribute('aria-hidden', 'true')
  } else if (!pending) {
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      emit('select-pin', pin)
    })
  }
  return button
}

const clearMarkers = () => {
  markers.forEach((marker) => marker.remove())
  markers = []
}

const renderMarkers = () => {
  if (!mapInstance || !maplibre) return
  clearMarkers()
  props.pins.forEach((pin) => {
    const position = resolveGeoPosition(pin?.position)
    if (!position) return
    const marker = new maplibre.Marker({
      element: createMarkerElement(pin),
      anchor: 'bottom',
    })
      .setLngLat([position.lng, position.lat])
      .addTo(mapInstance)
    markers.push(marker)
  })

  const pendingPosition = resolveGeoPosition(props.pendingPosition)
  if (pendingPosition) {
    const marker = new maplibre.Marker({
      element: createMarkerElement({}, true),
      anchor: 'bottom',
    })
      .setLngLat([pendingPosition.lng, pendingPosition.lat])
      .addTo(mapInstance)
    markers.push(marker)
  }
}

const setInteractionEnabled = (enabled) => {
  if (!mapInstance) return
  const method = enabled ? 'enable' : 'disable'
  ;[
    mapInstance.boxZoom,
    mapInstance.dragPan,
    mapInstance.keyboard,
    mapInstance.doubleClickZoom,
    mapInstance.touchZoomRotate,
  ].forEach((handler) => handler?.[method]())
  mapInstance.dragRotate?.disable()
  mapInstance.touchPitch?.disable()
  mapInstance.scrollZoom?.disable()
}

const initializeMap = async () => {
  await nextTick()
  if (!mapRootRef.value || mapInstance) return
  startedAt = performance.now()
  setRendererStatus('loading')

  try {
    const [module] = await Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ])
    maplibre = module.default || module
    if (!mapRootRef.value) return
    const center = resolveInitialCenter()
    mapInstance = new maplibre.Map({
      container: mapRootRef.value,
      style: OPENFREEMAP_STYLE_URL,
      center: [center.lng, center.lat],
      zoom: props.focusPosition ? 13.4 : 11.8,
      minZoom: 2,
      maxZoom: 19,
      attributionControl: false,
      interactive: props.interactive,
      fadeDuration: 120,
      pitchWithRotate: false,
      dragRotate: false,
    })
    mapInstance.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-left')
    setInteractionEnabled(props.interactive)
    mapInstance.on('click', (event) => {
      if (!props.interactive || !props.allowPinPlacement) return
      const position = {
        kind: 'geo',
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
      }
      emit('place-pin', {
        position,
        point: mapPositionToNormalized(props.mapPack, position),
      })
    })
    mapInstance.once('load', () => {
      mapLoaded.value = true
      clearTimeout(startupTimer)
      startupTimer = null
      renderMarkers()
      setRendererStatus('ready')
    })
    mapInstance.on('error', (event) => {
      if (!mapLoaded.value) {
        requestFallback(event?.error?.message || 'OPENFREEMAP_STYLE_LOAD_FAILED')
      }
    })
    startupTimer = setTimeout(() => requestFallback('OPENFREEMAP_LOAD_TIMEOUT'), 10000)

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => mapInstance?.resize())
      resizeObserver.observe(mapRootRef.value)
    }
  } catch (error) {
    requestFallback(error instanceof Error ? error.message : 'MAPLIBRE_INITIALIZATION_FAILED')
  }
}

onMounted(initializeMap)

watch(
  () => [props.pins, props.pendingPosition, props.allowPinPlacement],
  () => renderMarkers(),
  { deep: true },
)

watch(
  () => props.focusPosition,
  (rawPosition) => {
    const position = resolveGeoPosition(rawPosition)
    if (!mapInstance || !position) return
    mapInstance.easeTo({
      center: [position.lng, position.lat],
      zoom: Math.max(mapInstance.getZoom(), 13.4),
      duration: 360,
    })
  },
  { deep: true },
)

watch(
  () => props.interactive,
  (interactive) => setInteractionEnabled(interactive),
)

onBeforeUnmount(() => {
  clearTimeout(startupTimer)
  startupTimer = null
  resizeObserver?.disconnect()
  resizeObserver = null
  clearMarkers()
  mapInstance?.remove()
  mapInstance = null
  maplibre = null
})
</script>

<template>
  <div
    class="openfreemap-canvas"
    :style="fallbackImageStyle"
    :data-map-pack="mapPack.id"
    :data-map-kind="mapPack.kind"
    :data-renderer="rendererStatus === 'ready' ? 'openfreemap' : 'openfreemap-loading'"
  >
    <div ref="mapRootRef" class="openfreemap-root" data-testid="map-scene-surface"></div>
    <div v-if="rendererStatus === 'loading'" class="openfreemap-loading" role="status">
      <i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i>
      <span>{{ t('正在载入首尔街区', 'Loading Seoul streets') }}</span>
    </div>
    <div class="openfreemap-identity" aria-live="polite">
      <span><i class="fas fa-earth-asia" aria-hidden="true"></i></span>
      <div>
        <strong>{{ t(mapPack.shortLabelZh, mapPack.shortLabelEn) }}</strong>
        <small>{{ t('在线街道', 'Live streets') }}</small>
      </div>
    </div>
    <p class="openfreemap-attribution">
      <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>
      · © OpenMapTiles ·
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
    </p>
  </div>
</template>

<style scoped>
.openfreemap-canvas,
.openfreemap-root {
  position: absolute;
  inset: 0;
}

.openfreemap-canvas {
  z-index: 0;
  overflow: hidden;
  background-color: #d9e0da;
  background-position: center;
  background-size: cover;
}

.openfreemap-root {
  z-index: 1;
  font-family: inherit;
}

.openfreemap-loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 9px;
  background: rgba(232, 236, 230, 0.8);
  color: #315447;
  font-size: 11px;
  font-weight: 800;
  backdrop-filter: blur(5px);
}

.openfreemap-loading i { font-size: 19px; }

.openfreemap-identity {
  position: absolute;
  left: 18px;
  top: 192px;
  z-index: 4;
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 8px;
  background: rgba(24, 39, 33, 0.82);
  padding: 5px 10px 5px 6px;
  color: #fff;
  box-shadow: 0 7px 20px rgba(22, 36, 30, 0.2);
  backdrop-filter: blur(10px);
}

.openfreemap-identity > span {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 11px;
}

.openfreemap-identity div { display: grid; gap: 1px; }
.openfreemap-identity strong { font-size: 11px; line-height: 14px; }
.openfreemap-identity small { color: rgba(255, 255, 255, 0.7); font-size: 8px; line-height: 10px; }

.openfreemap-attribution {
  position: absolute;
  right: 12px;
  top: 236px;
  z-index: 4;
  max-width: min(48%, 280px);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.88);
  padding: 3px 5px;
  color: #53615b;
  font-size: 8px;
  line-height: 1.3;
  text-align: right;
}

.openfreemap-attribution a { color: inherit; text-decoration: none; }

:deep(.maplibregl-ctrl-top-left) {
  top: 236px;
  left: 18px;
}

:deep(.maplibregl-ctrl-group) {
  overflow: hidden;
  border: 1px solid rgba(215, 224, 219, 0.9);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(22, 36, 30, 0.18);
}

:deep(.maplibregl-ctrl-group button) {
  width: 36px;
  height: 36px;
  background-color: rgba(255, 255, 255, 0.96);
}

:global(.openfreemap-marker-button) {
  --map-marker-tone: #176c57;
  position: relative;
  display: flex;
  width: max-content;
  max-width: 170px;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: #15241e;
  cursor: pointer;
  font-family: inherit;
}

:global(.openfreemap-marker-shape) {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border: 3px solid rgba(255, 255, 255, 0.96);
  border-radius: 50% 50% 50% 8px;
  background: var(--map-marker-tone);
  box-shadow: 0 7px 18px rgba(17, 35, 27, 0.3);
  color: #fff;
  transform: rotate(-45deg);
}

:global(.openfreemap-marker-shape i) { font-size: 11px; transform: rotate(45deg); }

:global(.openfreemap-marker-label) {
  overflow: hidden;
  border: 1px solid rgba(58, 77, 68, 0.18);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 3px 10px rgba(24, 40, 33, 0.14);
  opacity: 0;
  padding: 4px 6px;
  font-size: 9px;
  font-weight: 800;
  text-overflow: ellipsis;
  transform: translateX(-4px);
  transition: opacity 120ms ease, transform 120ms ease;
  white-space: nowrap;
}

:global(.openfreemap-marker-button:hover .openfreemap-marker-label),
:global(.openfreemap-marker-button:focus-visible .openfreemap-marker-label),
:global(.openfreemap-marker-button.is-user .openfreemap-marker-label),
:global(.openfreemap-marker-button.is-pending .openfreemap-marker-label) {
  opacity: 1;
  transform: translateX(0);
}

:global(.openfreemap-marker-button.is-pending) { --map-marker-tone: #d9a514; pointer-events: none; }
:global(.openfreemap-marker-button.is-placement-pass-through) { pointer-events: none; }
:global(.openfreemap-marker-button.is-pending .openfreemap-marker-shape) { animation: openfreemap-pin-pulse 1.4s ease-in-out infinite; }

@keyframes openfreemap-pin-pulse {
  0%, 100% { box-shadow: 0 7px 18px rgba(17, 35, 27, 0.3), 0 0 0 0 rgba(217, 165, 20, 0.38); }
  50% { box-shadow: 0 7px 18px rgba(17, 35, 27, 0.3), 0 0 0 10px rgba(217, 165, 20, 0); }
}

@media (prefers-reduced-motion: reduce) {
  :global(.openfreemap-marker-button.is-pending .openfreemap-marker-shape) { animation: none; }
  :global(.openfreemap-marker-label) { transition: none; }
}
</style>
