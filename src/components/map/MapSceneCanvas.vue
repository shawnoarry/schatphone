<script setup>
import { computed, ref, watch } from 'vue'
import LocalMapCanvas from './LocalMapCanvas.vue'
import OpenFreeMapCanvas from './OpenFreeMapCanvas.vue'

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

const emit = defineEmits(['place-pin', 'select-pin', 'renderer-status'])
const forceLocalFallback = ref(false)
const usesOnlineBasemap = computed(
  () => props.mapPack?.coordinateKind === 'geo' && !forceLocalFallback.value,
)

watch(
  () => props.mapPack?.id,
  () => { forceLocalFallback.value = false },
)

const forwardPlacePin = (payload) => emit('place-pin', payload)
const forwardSelectedPin = (pin) => emit('select-pin', pin)
const forwardRendererStatus = (payload) => emit('renderer-status', payload)
const useLocalFallback = (payload) => {
  forceLocalFallback.value = true
  emit('renderer-status', { status: 'fallback', provider: 'local', ...payload })
}
</script>

<template>
  <OpenFreeMapCanvas
    v-if="usesOnlineBasemap"
    :map-pack="mapPack"
    :pins="pins"
    :pending-position="pendingPosition"
    :focus-position="focusPosition"
    :interactive="interactive"
    :allow-pin-placement="allowPinPlacement"
    @place-pin="forwardPlacePin"
    @select-pin="forwardSelectedPin"
    @renderer-status="forwardRendererStatus"
    @fallback="useLocalFallback"
  />
  <LocalMapCanvas
    v-else
    :map-pack="mapPack"
    :pins="pins"
    :pending-position="pendingPosition"
    :focus-position="focusPosition"
    :interactive="interactive"
    :allow-pin-placement="allowPinPlacement"
    :provider-state="forceLocalFallback ? 'fallback' : 'local'"
    @place-pin="forwardPlacePin"
    @select-pin="forwardSelectedPin"
  />
</template>
