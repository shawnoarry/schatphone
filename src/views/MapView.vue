<script setup>
import { reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useMapStore } from '../stores/map'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const mapStore = useMapStore()
const { t } = useI18n()

const { addresses, currentLocation, currentLocationText, tripForm, tripEstimate } = storeToRefs(mapStore)

const addressForm = reactive({
  label: '',
  detail: '',
})

const goHome = () => {
  router.push('/home')
}

const useAddressAsCurrent = (addressId) => {
  mapStore.setCurrentLocationByAddressId(addressId)
}

const applyManualLocation = () => {
  mapStore.setCurrentLocation({
    label: addressForm.label || t('自定义位置', 'Custom location'),
    detail: addressForm.detail,
    source: 'manual',
  })
}

const addAddress = () => {
  const ok = mapStore.addAddress(addressForm)
  if (!ok) return
  addressForm.label = ''
  addressForm.detail = ''
}
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
          <button
            v-for="item in addresses"
            :key="item.id"
            @click="useAddressAsCurrent(item.id)"
            class="text-left text-sm border rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            <div class="font-medium">{{ item.label }}</div>
            <div class="text-xs text-gray-500 truncate">{{ item.detail }}</div>
          </button>
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
        <h2 class="font-semibold mb-3">{{ t('打车估算（模拟）', 'Ride estimate (mock)') }}</h2>
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
