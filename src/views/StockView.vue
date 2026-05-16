<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import { useStockStore } from '../stores/stock'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const stockStore = useStockStore()
const {
  items,
  watchlistCount,
  holdingCount,
  primaryHoldingValue,
  holdingsValueByCurrency,
  topMovers,
} = storeToRefs(stockStore)

const stockDraft = ref({
  symbol: '',
  name: '',
  price: '',
  changePercent: '0',
  quantity: '0',
  note: '',
})
const feedback = ref('')
const feedbackType = ref('success')

const visibleItems = computed(() => items.value.slice(0, 30))

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const showFeedback = (type, message) => {
  feedbackType.value = type
  feedback.value = message
}

const formatPrice = (priceCents) => ((Number(priceCents) || 0) / 100).toFixed(2)

const formatValue = (item) => ((Number(item.priceCents) * Number(item.quantity || 0)) / 100).toFixed(2)

const formatTime = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return t('未知时间', 'Unknown time')
  return new Date(value).toLocaleString()
}

const changeToneClass = (changePercent) => {
  const value = Number(changePercent) || 0
  if (value > 0) return 'text-red-600'
  if (value < 0) return 'text-emerald-600'
  return 'text-gray-500'
}

const changeBadgeClass = (changePercent) => {
  const value = Number(changePercent) || 0
  if (value > 0) return 'bg-red-50 text-red-600'
  if (value < 0) return 'bg-emerald-50 text-emerald-600'
  return 'bg-gray-100 text-gray-500'
}

const submitStock = () => {
  const created = stockStore.upsertStock({
    symbol: stockDraft.value.symbol,
    name: stockDraft.value.name,
    price: stockDraft.value.price,
    changePercent: stockDraft.value.changePercent,
    quantity: stockDraft.value.quantity,
    note: stockDraft.value.note,
    sourceModule: 'stock_manual',
  })

  if (!created) {
    showFeedback('warning', t('请输入有效代码、名称和价格。', 'Enter a valid symbol, name, and price.'))
    return
  }

  stockDraft.value.symbol = ''
  stockDraft.value.name = ''
  stockDraft.value.price = ''
  stockDraft.value.changePercent = '0'
  stockDraft.value.quantity = '0'
  stockDraft.value.note = ''
  showFeedback('success', t('模拟标的已保存。', 'Simulated asset saved.'))
}

const removeStock = (stockId) => {
  if (stockStore.removeStock(stockId)) {
    showFeedback('success', t('模拟标的已删除。', 'Simulated asset removed.'))
  }
}
</script>

<template>
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('首页', 'Home') }}
      </button>
      <h1 class="font-bold">{{ t('股票', 'Stock Market') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar bg-gray-50 px-5 py-6 space-y-4">
      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <p class="text-xs text-gray-500">{{ t('模拟持仓市值', 'Simulated holdings value') }}</p>
        <p class="mt-1 text-3xl font-bold">{{ primaryHoldingValue.amount }} {{ primaryHoldingValue.currency }}</p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div class="rounded-xl bg-gray-50 p-3">
            <p class="text-[11px] text-gray-500">{{ t('关注标的', 'Watchlist') }}</p>
            <p class="text-lg font-semibold">{{ watchlistCount }}</p>
          </div>
          <div class="rounded-xl bg-gray-50 p-3">
            <p class="text-[11px] text-gray-500">{{ t('持仓标的', 'Holdings') }}</p>
            <p class="text-lg font-semibold">{{ holdingCount }}</p>
          </div>
        </div>
        <div v-if="holdingsValueByCurrency.length > 1" class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="item in holdingsValueByCurrency"
            :key="item.currency"
            class="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-600"
          >
            {{ item.amount }} {{ item.currency }}
          </span>
        </div>
        <p class="mt-3 text-[11px] text-gray-500">
          {{
            t(
              '这是本地模拟行情，不读取真实市场；后续可接入世界观事件、日程触发涨跌和角色经济线。',
              'This is a local simulated market, not real market data; world events, calendar triggers, and role economy can attach later.',
            )
          }}
        </p>
      </section>

      <section v-if="topMovers.length > 0" class="rounded-2xl bg-white border border-gray-200 p-4">
        <p class="mb-3 text-sm font-semibold">{{ t('波动提示', 'Top movers') }}</p>
        <div class="flex gap-2 overflow-x-auto no-scrollbar">
          <div
            v-for="item in topMovers"
            :key="item.id"
            class="min-w-28 rounded-xl border border-gray-100 p-3"
          >
            <p class="text-xs font-semibold">{{ item.symbol }}</p>
            <p class="mt-1 text-[11px] text-gray-500 truncate">{{ item.name }}</p>
            <p class="mt-2 text-sm font-bold" :class="changeToneClass(item.changePercent)">
              {{ item.changePercent > 0 ? '+' : '' }}{{ item.changePercent }}%
            </p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4 space-y-3">
        <p class="text-sm font-semibold">{{ t('添加模拟标的', 'Add simulated asset') }}</p>
        <div class="grid grid-cols-2 gap-2">
          <input
            v-model="stockDraft.symbol"
            type="text"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase outline-none"
            :placeholder="t('代码', 'Symbol')"
          />
          <input
            v-model="stockDraft.price"
            type="number"
            min="0"
            step="0.01"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
            :placeholder="t('价格', 'Price')"
          />
        </div>
        <input
          v-model="stockDraft.name"
          type="text"
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="t('名称', 'Name')"
        />
        <div class="grid grid-cols-2 gap-2">
          <input
            v-model="stockDraft.changePercent"
            type="number"
            step="0.01"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
            :placeholder="t('涨跌幅 %', 'Change %')"
          />
          <input
            v-model="stockDraft.quantity"
            type="number"
            min="0"
            step="0.0001"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
            :placeholder="t('持仓数量', 'Quantity')"
          />
        </div>
        <input
          v-model="stockDraft.note"
          type="text"
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="t('备注，可选', 'Note, optional')"
        />
        <button
          @click="submitStock"
          class="w-full rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
        >
          {{ t('保存标的', 'Save asset') }}
        </button>
        <p
          v-if="feedback"
          class="rounded-lg border px-3 py-2 text-[11px]"
          :class="
            feedbackType === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          "
        >
          {{ feedback }}
        </p>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-semibold">{{ t('关注与持仓', 'Watchlist and holdings') }}</p>
          <span class="text-[11px] text-gray-500">{{ watchlistCount }}</span>
        </div>
        <div v-if="visibleItems.length > 0" class="space-y-2">
          <div
            v-for="item in visibleItems"
            :key="item.id"
            class="rounded-xl border border-gray-100 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold truncate">{{ item.symbol }} · {{ item.name }}</p>
                <p class="text-[11px] text-gray-500 truncate">
                  {{ formatPrice(item.priceCents) }} {{ item.currency }} · {{ t('更新', 'Updated') }} {{ formatTime(item.updatedAt) }}
                </p>
              </div>
              <span class="rounded-full px-2 py-1 text-[11px] font-semibold" :class="changeBadgeClass(item.changePercent)">
                {{ item.changePercent > 0 ? '+' : '' }}{{ item.changePercent }}%
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between text-[11px] text-gray-500">
              <span>{{ t('持仓', 'Qty') }} {{ item.quantity }} · {{ t('市值', 'Value') }} {{ formatValue(item) }}</span>
              <button @click="removeStock(item.id)" class="text-red-500 hover:text-red-600">
                {{ t('删除', 'Delete') }}
              </button>
            </div>
            <p v-if="item.note" class="mt-1 text-[11px] text-gray-400 truncate">{{ item.note }}</p>
          </div>
        </div>
        <p v-else class="text-xs text-gray-500">
          {{ t('暂无模拟标的。', 'No simulated assets yet.') }}
        </p>
      </section>
    </div>
  </div>
</template>
