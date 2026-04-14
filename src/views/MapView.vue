<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useMapStore } from '../stores/map'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const mapStore = useMapStore()
const { t } = useI18n()

const { addresses, currentLocation, currentLocationText, tripForm, tripEstimate, tripRuntime, tripHistory } =
  storeToRefs(mapStore)

const addressForm = reactive({
  label: '',
  detail: '',
})
const tripActionHint = ref({
  tone: '',
  message: '',
})
let runtimeTimer = null

const goHome = () => {
  router.push('/home')
}

const useAddressAsCurrent = (addressId) => {
  mapStore.setCurrentLocationByAddressId(addressId)
  tripActionHint.value = { tone: '', message: '' }
}

const applyManualLocation = () => {
  mapStore.setCurrentLocation({
    label: addressForm.label || t('自定义位置', 'Custom location'),
    detail: addressForm.detail,
    source: 'manual',
  })
  tripActionHint.value = { tone: '', message: '' }
}

const addAddress = () => {
  const ok = mapStore.addAddress(addressForm)
  if (!ok) return
  addressForm.label = ''
  addressForm.detail = ''
}

const setTripFromAddress = (addressId) => {
  mapStore.applyAddressToTripEndpoint(addressId, 'from')
  tripActionHint.value = { tone: '', message: '' }
}

const setTripToAddress = (addressId) => {
  mapStore.applyAddressToTripEndpoint(addressId, 'to')
  tripActionHint.value = { tone: '', message: '' }
}

const isTripTraveling = computed(() => tripRuntime.value.status === 'traveling')
const isTripArrived = computed(() => tripRuntime.value.status === 'arrived')

const canStartTrip = computed(() => {
  const from = typeof tripForm.value?.from === 'string' ? tripForm.value.from.trim() : ''
  const to = typeof tripForm.value?.to === 'string' ? tripForm.value.to.trim() : ''
  return Boolean(from && to && from !== to && !isTripTraveling.value)
})

const tripStatusLabel = computed(() => {
  if (isTripTraveling.value) return t('进行中', 'In transit')
  if (isTripArrived.value) return t('已到达', 'Arrived')
  return t('待出发', 'Ready')
})

const tripProgressPercent = computed(() => {
  const progress = Number(tripRuntime.value?.progress || 0)
  if (!Number.isFinite(progress)) return 0
  return Math.max(0, Math.min(100, Math.round(progress * 100)))
})

const formatSeconds = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const remain = total % 60
  if (!minutes) return t(`${remain} 秒`, `${remain}s`)
  return t(`${minutes} 分 ${remain} 秒`, `${minutes}m ${remain}s`)
}

const formatTime = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return '--:--'
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const startTrip = () => {
  const result = mapStore.startTrip()
  if (result?.ok) {
    tripActionHint.value = {
      tone: 'success',
      message: t('行程已开始，系统会按真实时间推进。', 'Trip started. Progress now follows real time.'),
    }
    return
  }

  const code = result?.code || ''
  if (code === 'TRIP_ALREADY_IN_PROGRESS') {
    tripActionHint.value = {
      tone: 'warn',
      message: t('已有进行中的行程。', 'A trip is already in progress.'),
    }
    return
  }
  if (code === 'TRIP_ENDPOINT_SAME') {
    tripActionHint.value = {
      tone: 'warn',
      message: t('起点和终点不能相同。', 'From and to cannot be the same.'),
    }
    return
  }
  tripActionHint.value = {
    tone: 'warn',
    message: t('请先填写完整起点和终点。', 'Please fill both from and to first.'),
  }
}

const cancelTrip = () => {
  const ok = mapStore.cancelTrip()
  if (!ok) return
  tripActionHint.value = {
    tone: 'warn',
    message: t('已取消当前行程。', 'Current trip was cancelled.'),
  }
}

const acknowledgeArrival = () => {
  const ok = mapStore.acknowledgeTripArrival()
  if (!ok) return
  tripActionHint.value = {
    tone: 'success',
    message: t('行程已完成。', 'Trip marked as completed.'),
  }
}

const tickRuntime = () => {
  mapStore.tickTripRuntime(Date.now())
}

onMounted(() => {
  tickRuntime()
  runtimeTimer = setInterval(() => {
    tickRuntime()
  }, 1000)
})

onBeforeUnmount(() => {
  if (runtimeTimer) {
    clearInterval(runtimeTimer)
    runtimeTimer = null
  }
})
</script>

<template>
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> 首页
      </button>
      <h1 class="font-bold">{{ t('地图', 'Map') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 bg-gray-50">
      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">{{ t('当前位置', 'Current location') }}</h2>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {{ currentLocation.source === 'saved' ? t('地址簿', 'Address book') : t('手动设置', 'Manual') }}
          </span>
        </div>
        <p class="text-sm text-gray-600 mb-3">{{ currentLocationText }}</p>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div
            v-for="item in addresses"
            :key="item.id"
            class="text-left text-sm border rounded-lg px-3 py-2 bg-white"
          >
            <div class="font-medium">{{ item.label }}</div>
            <div class="text-xs text-gray-500 truncate mb-2">{{ item.detail }}</div>
            <div class="flex flex-wrap gap-2">
              <button @click="useAddressAsCurrent(item.id)" class="text-[11px] px-2 py-1 rounded bg-gray-900 text-white">
                {{ t('设为当前位置', 'Set current') }}
              </button>
              <button @click="setTripFromAddress(item.id)" class="text-[11px] px-2 py-1 rounded border border-gray-300">
                {{ t('设为起点', 'Use as from') }}
              </button>
              <button @click="setTripToAddress(item.id)" class="text-[11px] px-2 py-1 rounded border border-gray-300">
                {{ t('设为终点', 'Use as to') }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <h2 class="font-semibold mb-3">{{ t('新增地址 / 手动定位', 'Add address / set manually') }}</h2>
        <div class="space-y-2">
          <input
            v-model="addressForm.label"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('地点名称（如：健身房）', 'Location name (e.g. Gym)')"
          />
          <input
            v-model="addressForm.detail"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('详细地址', 'Detailed address')"
          />
          <div class="flex gap-2">
            <button @click="addAddress" class="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm">{{ t('保存到地址簿', 'Save to address book') }}</button>
            <button @click="applyManualLocation" class="px-3 py-2 rounded-lg bg-gray-800 text-white text-sm">{{ t('设为当前位置', 'Set as current') }}</button>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">{{ t('出行模拟', 'Trip simulation') }}</h2>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{{ tripStatusLabel }}</span>
        </div>
        <div class="space-y-2">
          <input
            v-model="tripForm.from"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('起点', 'From')"
          />
          <input
            v-model="tripForm.to"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('终点', 'To')"
          />
        </div>
        <div class="mt-3 text-sm text-gray-700 space-y-1">
          <p>{{ t('距离：约', 'Distance:') }} {{ tripEstimate.distanceKm }} km</p>
          <p>{{ t('时长：约', 'Duration:') }} {{ tripEstimate.minutes }} {{ t('分钟', 'min') }}</p>
          <p>{{ t('费用：约', 'Fare:') }} ₩ {{ tripEstimate.fare.toLocaleString() }}</p>
        </div>

        <div v-if="isTripTraveling || isTripArrived" class="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
          <p class="text-sm text-gray-700">
            {{ (tripRuntime.fromLabel || t('起点', 'From')) + ' → ' + (tripRuntime.toLabel || t('终点', 'To')) }}
          </p>
          <div class="h-2 rounded bg-gray-200 overflow-hidden">
            <div class="h-full bg-emerald-500 transition-all duration-500" :style="{ width: `${tripProgressPercent}%` }"></div>
          </div>
          <p class="text-xs text-gray-600">
            {{ t('进度', 'Progress') }} {{ tripProgressPercent }}% ·
            {{ t('剩余', 'Remaining') }} {{ formatSeconds(tripRuntime.remainingSeconds) }}
          </p>
          <p class="text-xs text-gray-600">
            {{ t('预计到达', 'ETA') }} {{ formatTime(tripRuntime.etaAt) }}
          </p>
          <p v-if="isTripArrived" class="text-xs text-emerald-700">
            {{ t('已在系统时间到达目的地。', 'Destination reached according to system time.') }}
          </p>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            @click="startTrip"
            :disabled="!canStartTrip"
            class="px-3 py-2 rounded-lg text-sm"
            :class="canStartTrip ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'"
          >
            {{ t('开始行程', 'Start trip') }}
          </button>
          <button
            v-if="isTripTraveling"
            @click="cancelTrip"
            class="px-3 py-2 rounded-lg bg-red-500 text-white text-sm"
          >
            {{ t('取消行程', 'Cancel trip') }}
          </button>
          <button
            v-if="isTripArrived"
            @click="acknowledgeArrival"
            class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm"
          >
            {{ t('确认完成', 'Acknowledge') }}
          </button>
        </div>

        <p
          v-if="tripActionHint.message"
          class="mt-2 text-xs"
          :class="tripActionHint.tone === 'success' ? 'text-emerald-700' : tripActionHint.tone === 'warn' ? 'text-amber-700' : 'text-gray-600'"
        >
          {{ tripActionHint.message }}
        </p>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <h2 class="font-semibold mb-2">{{ t('行程记录', 'Trip history') }}</h2>
        <p v-if="tripHistory.length === 0" class="text-xs text-gray-500">
          {{ t('暂无记录。', 'No records yet.') }}
        </p>
        <div v-else class="space-y-2">
          <div
            v-for="item in tripHistory"
            :key="item.id"
            class="border rounded-lg p-2"
          >
            <p class="text-xs text-gray-600">
              {{ item.status === 'arrived' ? t('已到达', 'Arrived') : t('已取消', 'Cancelled') }} · {{ formatTime(item.endedAt) }}
            </p>
            <p class="text-sm font-medium">
              {{ (item.fromLabel || t('起点', 'From')) + ' → ' + (item.toLabel || t('终点', 'To')) }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t('时长', 'Duration') }} {{ formatSeconds(item.durationSeconds) }} ·
              {{ t('费用', 'Fare') }} ₩ {{ Number(item.fare || 0).toLocaleString() }}
            </p>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <h2 class="font-semibold mb-2">{{ t('地址簿管理', 'Address book') }}</h2>
        <div class="space-y-2">
          <div v-for="item in addresses" :key="`row-${item.id}`" class="flex items-center justify-between border rounded-lg p-2">
            <div class="min-w-0">
              <p class="text-sm font-medium">{{ item.label }}</p>
              <p class="text-xs text-gray-500 truncate">{{ item.detail }}</p>
            </div>
            <button @click="mapStore.removeAddress(item.id)" class="text-xs text-red-500 px-2 py-1">{{ t('删除', 'Delete') }}</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
