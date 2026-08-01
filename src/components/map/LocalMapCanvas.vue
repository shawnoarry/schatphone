<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useI18n } from '../../composables/useI18n'
import { mapPositionToNormalized, normalizedToMapPosition } from '../../lib/map-packs'

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
  providerState: {
    type: String,
    default: 'local',
  },
})

const emit = defineEmits(['place-pin', 'select-pin', 'map-interact'])
const { t } = useI18n()
const sceneRootRef = ref(null)
const mapAssetReady = computed(() => Boolean(props.mapPack?.assetUrl))
const factionLegendOpen = ref(false)

let mapInstance = null
let imageLayer = null
let markerLayer = null
let factionLayer = null
let resizeObserver = null

const createTextNode = (text, className = '') => {
  const element = document.createElement('span')
  element.className = className
  element.textContent = text
  return element
}

const createPinIcon = (pin, pending = false) => {
  const wrapper = document.createElement('span')
  wrapper.className = `map-scene-marker${pending ? ' map-scene-marker-pending' : ''}`
  if (pin?.tone) wrapper.style.setProperty('--map-marker-tone', pin.tone)
  const icon = document.createElement('i')
  icon.className = pending ? 'fas fa-location-crosshairs' : pin?.icon || 'fas fa-location-dot'
  icon.setAttribute('aria-hidden', 'true')
  wrapper.append(icon)
  return L.divIcon({
    className: 'map-scene-marker-shell',
    html: wrapper,
    iconAnchor: [18, 34],
    iconSize: [36, 36],
    tooltipAnchor: [0, -30],
  })
}

const createFactionIcon = (faction) => {
  const label = createTextNode(t(faction.labelZh, faction.labelEn), 'map-scene-faction-label')
  label.style.setProperty('--map-faction-tone', faction.tone)
  return L.divIcon({
    className: 'map-scene-faction-shell',
    html: label,
    iconAnchor: [70, 13],
    iconSize: [140, 26],
  })
}

const normalizedToLatLng = (point) => {
  const width = Math.max(1, Number(props.mapPack?.assetWidth) || 1)
  const height = Math.max(1, Number(props.mapPack?.assetHeight) || 1)
  return L.latLng(height * (1 - point.y), width * point.x)
}

const latLngToNormalized = (latLng) => {
  const width = Math.max(1, Number(props.mapPack?.assetWidth) || 1)
  const height = Math.max(1, Number(props.mapPack?.assetHeight) || 1)
  return {
    x: Math.max(0, Math.min(1, latLng.lng / width)),
    y: Math.max(0, Math.min(1, 1 - latLng.lat / height)),
  }
}

const getImageBounds = () => {
  const width = Math.max(1, Number(props.mapPack?.assetWidth) || 1)
  const height = Math.max(1, Number(props.mapPack?.assetHeight) || 1)
  return L.latLngBounds([0, 0], [height, width])
}

const resolveFocusLatLng = () => {
  const point = mapPositionToNormalized(props.mapPack, props.focusPosition)
  return point ? normalizedToLatLng(point) : null
}

const clearLayers = () => {
  imageLayer?.remove()
  markerLayer?.remove()
  factionLayer?.remove()
  imageLayer = null
  markerLayer = null
  factionLayer = null
}

const renderMarkers = () => {
  if (!mapInstance) return
  markerLayer?.remove()
  factionLayer?.remove()
  markerLayer = L.layerGroup().addTo(mapInstance)
  factionLayer = L.layerGroup().addTo(mapInstance)

  props.pins.forEach((pin) => {
    const point = mapPositionToNormalized(props.mapPack, pin?.position)
    if (!point) return
    const marker = L.marker(normalizedToLatLng(point), {
      icon: createPinIcon(pin),
      interactive: !props.allowPinPlacement,
      keyboard: !props.allowPinPlacement,
      riseOnHover: true,
      title: t(pin.nameZh || pin.labelZh || pin.name, pin.nameEn || pin.labelEn || pin.name),
    })
    const label = t(pin.nameZh || pin.labelZh || pin.name, pin.nameEn || pin.labelEn || pin.name)
    marker.bindTooltip(createTextNode(label, 'map-scene-tooltip'), {
      direction: 'top',
      opacity: 1,
    })
    if (!props.allowPinPlacement) marker.on('click', () => emit('select-pin', pin))
    marker.addTo(markerLayer)
  })

  const pendingPoint = mapPositionToNormalized(props.mapPack, props.pendingPosition)
  if (pendingPoint) {
    const pendingMarker = L.marker(normalizedToLatLng(pendingPoint), {
      icon: createPinIcon({}, true),
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    })
    pendingMarker.bindTooltip(
      createTextNode(t('新图钉位置', 'New pin position'), 'map-scene-tooltip'),
      { direction: 'top', permanent: true, opacity: 1 },
    )
    pendingMarker.addTo(markerLayer)
  }

  ;(props.mapPack?.factions || []).forEach((faction) => {
    const point = mapPositionToNormalized(props.mapPack, faction.position)
    if (!point) return
    L.marker(normalizedToLatLng(point), {
      icon: createFactionIcon(faction),
      interactive: false,
      keyboard: false,
      zIndexOffset: -200,
    }).addTo(factionLayer)
  })
}

const renderMapPack = () => {
  if (!mapInstance) return
  clearLayers()
  const bounds = getImageBounds()
  if (mapAssetReady.value) {
    imageLayer = L.imageOverlay(props.mapPack.assetUrl, bounds, {
      alt: t(props.mapPack.labelZh, props.mapPack.labelEn),
      interactive: false,
    }).addTo(mapInstance)
  }
  mapInstance.setMaxBounds(bounds.pad(0.18))
  const containZoom = mapInstance.getBoundsZoom(bounds, false, [0, 0])
  const coverZoom = mapInstance.getBoundsZoom(bounds, true, [0, 0])
  mapInstance.setMinZoom(containZoom)
  const focusZoomOffset = props.mapPack?.kind === 'real' ? 2 : 0.75
  const maxZoom = Math.max(containZoom + 3.25, coverZoom + 3)
  mapInstance.setMaxZoom(maxZoom)
  mapInstance.setView(
    resolveFocusLatLng() || bounds.getCenter(),
    Math.min(maxZoom, Math.max(containZoom, coverZoom + focusZoomOffset)),
    { animate: false },
  )
  renderMarkers()
}

const initializeMap = async () => {
  await nextTick()
  if (!sceneRootRef.value || mapInstance) return
  mapInstance = L.map(sceneRootRef.value, {
    crs: L.CRS.Simple,
    attributionControl: false,
    zoomControl: true,
    scrollWheelZoom: false,
    doubleClickZoom: props.interactive,
    dragging: props.interactive,
    tap: props.interactive,
    keyboard: props.interactive,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    minZoom: -6,
    maxZoom: 6,
  })
  mapInstance.on('click', (event) => {
    if (!props.interactive) return
    emit('map-interact')
    if (!props.allowPinPlacement) return
    const point = latLngToNormalized(event.latlng)
    const position = normalizedToMapPosition(props.mapPack, point)
    if (!position) return
    emit('place-pin', { position, point })
  })
  renderMapPack()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => mapInstance?.invalidateSize({ animate: false }))
    resizeObserver.observe(sceneRootRef.value)
  }
}

onMounted(initializeMap)

watch(
  () => `${props.mapPack?.id || ''}:${props.mapPack?.assetUrl || ''}`,
  async () => {
    await nextTick()
    renderMapPack()
  },
)

watch(
  () => props.focusPosition,
  () => {
    const focus = resolveFocusLatLng()
    if (!mapInstance || !focus) return
    const focusZoom = Math.min(
      mapInstance.getMaxZoom(),
      Math.max(mapInstance.getZoom(), mapInstance.getMinZoom() + 2),
    )
    mapInstance.flyTo(focus, focusZoom, { animate: true, duration: 0.35 })
  },
  { deep: true },
)

watch(
  () => [props.pins, props.pendingPosition, props.mapPack?.factions, props.allowPinPlacement],
  () => renderMarkers(),
  { deep: true },
)

watch(
  () => props.interactive,
  (interactive) => {
    if (!mapInstance) return
    const method = interactive ? 'enable' : 'disable'
    mapInstance.dragging?.[method]()
    mapInstance.doubleClickZoom?.[method]()
    mapInstance.keyboard?.[method]()
  },
)

watch(
  () => props.mapPack?.id,
  () => {
    factionLegendOpen.value = false
  },
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  clearLayers()
  mapInstance?.remove()
  mapInstance = null
})
</script>

<template>
  <div
    class="map-scene-canvas"
    :data-map-pack="mapPack.id"
    :data-map-kind="mapPack.kind"
    :data-renderer="providerState === 'fallback' ? 'local-fallback' : 'local-pack'"
  >
    <div ref="sceneRootRef" class="map-scene-leaflet" data-testid="map-scene-leaflet"></div>
    <div v-if="!mapAssetReady" class="map-scene-loading" role="status">
      <i class="fas fa-map" aria-hidden="true"></i>
      <span>{{ t('正在载入地图', 'Loading map') }}</span>
    </div>
    <div class="map-scene-identity" aria-live="polite">
      <span class="map-scene-kind-icon">
        <i :class="mapPack.kind === 'real' ? 'fas fa-earth-asia' : 'fas fa-radiation'" aria-hidden="true"></i>
      </span>
      <span>{{ t(mapPack.shortLabelZh, mapPack.shortLabelEn) }}</span>
      <small v-if="providerState === 'fallback'">{{ t('离线', 'Offline') }}</small>
    </div>
    <div v-if="mapPack.factions?.length" class="map-scene-faction-control">
      <button
        type="button"
        class="map-scene-faction-toggle"
        data-testid="map-faction-legend-toggle"
        :aria-expanded="factionLegendOpen"
        @click="factionLegendOpen = !factionLegendOpen"
      >
        <i class="fas fa-shield-halved" aria-hidden="true"></i>
        <span>{{ t('阵营', 'Factions') }}</span>
        <i :class="factionLegendOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" aria-hidden="true"></i>
      </button>
      <div v-if="factionLegendOpen" class="map-scene-faction-legend" data-testid="map-faction-legend">
        <span v-for="faction in mapPack.factions" :key="faction.id" class="map-scene-faction-key">
          <i :style="{ backgroundColor: faction.tone }" aria-hidden="true"></i>
          <span>{{ t(faction.labelZh, faction.labelEn) }}</span>
        </span>
      </div>
    </div>
    <p class="map-scene-attribution">{{ t(mapPack.attributionZh, mapPack.attributionEn) }}</p>
  </div>
</template>

<style scoped>
.map-scene-canvas,
.map-scene-leaflet {
  position: absolute;
  inset: 0;
}

.map-scene-canvas {
  z-index: 0;
  background: #161d20;
}

.map-scene-leaflet {
  z-index: 0;
  font-family: inherit;
}

.map-scene-loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  gap: 10px;
  background: #202a27;
  color: rgba(248, 250, 252, 0.84);
  font-size: 12px;
  font-weight: 750;
  text-align: center;
}

.map-scene-loading i {
  font-size: 22px;
}

.map-scene-identity {
  position: absolute;
  left: 18px;
  top: 192px;
  z-index: 3;
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.78);
  padding: 5px 10px 5px 6px;
  color: #f8fafc;
  font-size: 12px;
  font-weight: 750;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(12px);
}

.map-scene-kind-icon {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 11px;
}

.map-scene-identity small {
  color: rgba(248, 250, 252, 0.68);
  font-size: 8px;
}

.map-scene-faction-control {
  position: absolute;
  left: 18px;
  top: 236px;
  z-index: 3;
  width: min(152px, calc(100% - 92px));
}

.map-scene-faction-toggle {
  display: grid;
  width: 100%;
  min-height: 32px;
  grid-template-columns: 18px minmax(0, 1fr) 12px;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.8);
  padding: 5px 8px;
  color: #f8fafc;
  font-size: 9px;
  font-weight: 800;
  text-align: left;
  backdrop-filter: blur(8px);
}

.map-scene-faction-legend {
  display: grid;
  gap: 4px;
  margin-top: 4px;
  width: 100%;
}

.map-scene-faction-key {
  display: flex;
  min-width: 0;
  min-height: 21px;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.76);
  padding: 3px 7px;
  color: #f8fafc;
  font-size: 9px;
  font-weight: 750;
  line-height: 13px;
  backdrop-filter: blur(8px);
}

.map-scene-faction-key > i {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 2px;
}

.map-scene-faction-key > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-scene-attribution {
  position: absolute;
  right: 18px;
  top: 302px;
  z-index: 3;
  max-width: 45%;
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.68);
  padding: 3px 6px;
  color: rgba(248, 250, 252, 0.8);
  font-size: 9px;
  line-height: 1.25;
  text-align: right;
  backdrop-filter: blur(8px);
}

:deep(.leaflet-control-zoom) {
  margin-top: 350px;
  margin-left: 18px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 14px;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.16);
}

.map-scene-canvas[data-map-kind='real'] :deep(.leaflet-control-zoom) {
  margin-top: 236px;
}

:deep(.leaflet-control-zoom a) {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-bottom-color: rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.94);
  color: #0f172a;
  font-size: 20px;
  line-height: 1;
}

:deep(.map-scene-marker-shell),
:deep(.map-scene-faction-shell) {
  border: 0;
  background: transparent;
}

:deep(.map-scene-marker) {
  --map-marker-tone: #2563eb;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 3px solid rgba(255, 255, 255, 0.94);
  border-radius: 50% 50% 50% 8px;
  background: var(--map-marker-tone);
  color: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
  transform: rotate(-45deg);
}

:deep(.map-scene-marker i) {
  transform: rotate(45deg);
  font-size: 12px;
}

:deep(.map-scene-marker-pending) {
  --map-marker-tone: #eab308;
  animation: map-pin-pulse 1.4s ease-in-out infinite;
}

:deep(.map-scene-faction-label) {
  --map-faction-tone: #94a3b8;
  display: block;
  width: 140px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--map-faction-tone) 72%, white 28%);
  border-radius: 7px;
  background: color-mix(in srgb, var(--map-faction-tone) 34%, #111827 66%);
  padding: 5px 8px;
  color: #fff;
  font-size: 10px;
  font-weight: 850;
  line-height: 14px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: 0 8px 18px rgba(2, 6, 23, 0.25);
}

:deep(.leaflet-tooltip) {
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.96);
  padding: 6px 8px;
  color: #0f172a;
  font-size: 11px;
  font-weight: 750;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.16);
}

@keyframes map-pin-pulse {
  0%,
  100% {
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28), 0 0 0 0 rgba(234, 179, 8, 0.38);
  }
  50% {
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28), 0 0 0 10px rgba(234, 179, 8, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.map-scene-marker-pending) {
    animation: none;
  }
}

@media (min-width: 768px) {
  .map-scene-faction-control {
    width: 304px;
  }

  .map-scene-faction-legend { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  .map-scene-canvas[data-map-kind='fictional'] :deep(.leaflet-control-zoom) {
    display: flex;
    margin-top: 294px;
  }

  .map-scene-canvas[data-map-kind='fictional'] :deep(.leaflet-control-zoom a) {
    border-right: 1px solid rgba(226, 232, 240, 0.9);
    border-bottom: 0;
  }
}
</style>
