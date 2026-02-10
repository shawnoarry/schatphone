import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, writePersistedState } from '../lib/persistence'

const MAP_STORAGE_KEY = 'store:map'
const MAP_STORAGE_VERSION = 1

const SEED_ADDRESSES = [
  { id: 1, label: '家', detail: '首尔市江南区清潭洞 88-1' },
  { id: 2, label: '公司', detail: '首尔市麻浦区世界杯北路 400' },
  { id: 3, label: '练习室', detail: '首尔市龙山区汉江大路 120' },
]

export const useMapStore = defineStore('map', () => {
  const addresses = reactive(SEED_ADDRESSES.map((item) => ({ ...item })))

  const currentLocation = ref({
    source: 'saved',
    label: SEED_ADDRESSES[0].label,
    detail: SEED_ADDRESSES[0].detail,
  })

  const tripForm = reactive({
    from: SEED_ADDRESSES[0].detail,
    to: SEED_ADDRESSES[1].detail,
  })

  const tripEstimate = computed(() => {
    const baseKm = Math.max(3, Math.abs((tripForm.from || '').length - (tripForm.to || '').length) % 18 + 3)
    const minutes = Math.round(baseKm * 3.5)
    const fare = 4800 + baseKm * 900
    return { distanceKm: baseKm, minutes, fare }
  })

  const currentLocationText = computed(() => {
    if (!currentLocation.value.detail) return '未设置当前位置'
    return `${currentLocation.value.label} · ${currentLocation.value.detail}`
  })

  const setCurrentLocation = ({ label, detail, source = 'manual' }) => {
    if (!detail?.trim()) return
    currentLocation.value = {
      source,
      label: label?.trim() || '当前位置',
      detail: detail.trim(),
    }
  }

  const setCurrentLocationByAddressId = (addressId) => {
    const match = addresses.find((item) => item.id === Number(addressId))
    if (!match) return
    setCurrentLocation({ label: match.label, detail: match.detail, source: 'saved' })
  }

  const addAddress = ({ label, detail }) => {
    if (!label?.trim() || !detail?.trim()) return false
    addresses.push({
      id: Date.now(),
      label: label.trim(),
      detail: detail.trim(),
    })
    return true
  }

  const removeAddress = (addressId) => {
    const index = addresses.findIndex((item) => item.id === Number(addressId))
    if (index < 0) return
    addresses.splice(index, 1)
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(MAP_STORAGE_KEY, {
      version: MAP_STORAGE_VERSION,
    })
    if (!persisted || typeof persisted !== 'object') return

    if (Array.isArray(persisted.addresses)) {
      addresses.splice(0, addresses.length, ...persisted.addresses.map((item) => ({ ...item })))
    }

    if (persisted.currentLocation && typeof persisted.currentLocation === 'object') {
      currentLocation.value = {
        source: persisted.currentLocation.source || 'manual',
        label: persisted.currentLocation.label || '当前位置',
        detail: persisted.currentLocation.detail || '',
      }
    }

    if (persisted.tripForm && typeof persisted.tripForm === 'object') {
      if (typeof persisted.tripForm.from === 'string') {
        tripForm.from = persisted.tripForm.from
      }
      if (typeof persisted.tripForm.to === 'string') {
        tripForm.to = persisted.tripForm.to
      }
    }
  }

  const persistToStorage = () => {
    writePersistedState(
      MAP_STORAGE_KEY,
      {
        addresses: addresses.map((item) => ({ ...item })),
        currentLocation: { ...currentLocation.value },
        tripForm: { ...tripForm },
      },
      { version: MAP_STORAGE_VERSION },
    )
  }

  hydrateFromStorage()
  watch([addresses, currentLocation, tripForm], persistToStorage, { deep: true })

  return {
    addresses,
    currentLocation,
    currentLocationText,
    tripForm,
    tripEstimate,
    setCurrentLocation,
    setCurrentLocationByAddressId,
    addAddress,
    removeAddress,
  }
})
