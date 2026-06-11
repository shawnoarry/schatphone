<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  RELATIONSHIP_FACT_SOURCE_KEYS,
  recordWalletSharedTransferRelationshipFact,
} from '../lib/relationship-fact-adapters'
import { useChatStore } from '../stores/chat'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'
import { WALLET_TRANSACTION_SOURCE_FILTERS, formatWalletExchangeRate, useWalletStore } from '../stores/wallet'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const chatStore = useChatStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const walletStore = useWalletStore()
const {
  transactionCount,
  transactionSourceSummary,
  primaryBalance,
  balances,
  primaryCurrency,
  currencyOptions,
  exchangeRateRows,
  exchangeRates,
} = storeToRefs(walletStore)

const transferDraft = ref({
  contactId: '',
  amount: '',
  currency: primaryCurrency.value,
  counterparty: '',
  note: '',
})
const primaryCurrencyDraft = ref(primaryCurrency.value)
const usdCnyDraft = ref(String(exchangeRates.value.reference?.rate || '7.2'))
const rateDrafts = ref({})
const feedback = ref('')
const feedbackType = ref('success')
const sourceFilter = ref(WALLET_TRANSACTION_SOURCE_FILTERS.ALL)

const sourceFilterOptions = computed(() => [
  {
    key: WALLET_TRANSACTION_SOURCE_FILTERS.ALL,
    label: t('全部', 'All'),
    count: transactionSourceSummary.value.all,
  },
  {
    key: WALLET_TRANSACTION_SOURCE_FILTERS.MANUAL,
    label: t('手动', 'Manual'),
    count: transactionSourceSummary.value.manual,
  },
  {
    key: WALLET_TRANSACTION_SOURCE_FILTERS.CHAT,
    label: t('Chat', 'Chat'),
    count: transactionSourceSummary.value.chat,
  },
  {
    key: WALLET_TRANSACTION_SOURCE_FILTERS.ORDERS,
    label: t('订单', 'Orders'),
    count: transactionSourceSummary.value.orders,
  },
])

const recentTransactions = computed(() =>
  walletStore.listTransactionsBySourceFilter(sourceFilter.value).slice(0, 20),
)

const relationshipContactOptions = computed(() =>
  chatStore.contacts
    .filter((contact) => contact.kind !== 'service' && contact.kind !== 'official')
    .map((contact) => ({
      ...contact,
      optionValue: String(contact.id),
      optionLabel: contact.name || `Contact ${contact.id}`,
    })),
)

const selectedRelationshipContact = computed(() =>
  relationshipContactOptions.value.find(
    (contact) => contact.optionValue === String(transferDraft.value.contactId || ''),
  ) || null,
)

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const formatTime = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return t('未知时间', 'Unknown time')
  return new Date(value).toLocaleString()
}

const showFeedback = (type, message) => {
  feedbackType.value = type
  feedback.value = message
}

const isChatSource = (transaction) => transaction?.sourceModule === 'chat_transfer'

const isOrderSource = (transaction) =>
  transaction?.sourceModule === 'shopping_wallet_expense' ||
  transaction?.sourceModule === 'food_delivery_wallet_expense'

const getTransactionSourceLabel = (transaction) =>
  isChatSource(transaction)
    ? t('来自 Chat', 'From Chat')
    : isOrderSource(transaction)
      ? t('来自订单', 'From Orders')
      : t('手动记录', 'Manual')

const getTransactionSourceClass = (transaction) =>
  isChatSource(transaction)
    ? 'bg-amber-50 text-amber-700'
    : isOrderSource(transaction)
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-gray-100 text-gray-600'

const savePrimaryCurrency = () => {
  const nextCurrency = walletStore.setPrimaryCurrency(primaryCurrencyDraft.value)
  if (!nextCurrency) {
    primaryCurrencyDraft.value = primaryCurrency.value
    showFeedback('warning', t('币种格式无效。', 'Invalid currency format.'))
    return
  }
  primaryCurrencyDraft.value = nextCurrency
  if (!transferDraft.value.currency) transferDraft.value.currency = nextCurrency
  showFeedback('success', t('主币种已更新。', 'Primary currency updated.'))
}

const saveUsdCnyRate = () => {
  const next = walletStore.setUsdCnyRate(usdCnyDraft.value)
  if (!next) {
    usdCnyDraft.value = String(exchangeRates.value.reference?.rate || '')
    showFeedback('warning', t('USD/CNY 汇率格式无效。', 'Invalid USD/CNY rate.'))
    return
  }
  usdCnyDraft.value = String(formatWalletExchangeRate(next))
  showFeedback('success', t('USD/CNY 参考汇率已更新。', 'USD/CNY reference rate updated.'))
}

const rateDraftValue = (currencyCode = '') => {
  if (rateDrafts.value[currencyCode]) return rateDrafts.value[currencyCode]
  const row = exchangeRateRows.value.find((item) => item.code === currencyCode)
  return row?.rateToCnyLabel || ''
}

const updateRateDraft = (currencyCode = '', value = '') => {
  rateDrafts.value = {
    ...rateDrafts.value,
    [currencyCode]: value,
  }
}

const saveCurrencyRate = (currencyCode = '') => {
  const next = walletStore.setCurrencyCnyRate(currencyCode, rateDraftValue(currencyCode))
  if (!next) {
    showFeedback('warning', t('汇率格式无效。', 'Invalid exchange rate.'))
    return
  }
  updateRateDraft(currencyCode, formatWalletExchangeRate(next))
  showFeedback('success', t('币种汇率已更新。', 'Currency rate updated.'))
}

const submitTransfer = () => {
  const relationshipTarget = selectedRelationshipContact.value
  const created = walletStore.addTransferTransaction({
    amount: transferDraft.value.amount,
    currency: transferDraft.value.currency,
    counterparty: relationshipTarget?.name || transferDraft.value.counterparty,
    note: transferDraft.value.note,
    relationshipBinding: relationshipTarget
      ? {
          contactId: Number(relationshipTarget.id) || 0,
          profileId: Number(relationshipTarget.profileId || 0),
          kind: relationshipTarget.kind || (relationshipTarget.profileId ? 'role' : 'contact'),
          name: relationshipTarget.name || '',
          sourceModule: 'chat',
          sourceId: String(relationshipTarget.id),
        }
      : null,
  })

  if (!created) {
    showFeedback('warning', t('请输入有效金额，例如 88 或 88.50。', 'Enter a valid amount, such as 88 or 88.50.'))
    return
  }

  if (relationshipTarget) {
    recordWalletSharedTransferRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      transaction: created,
      target: relationshipTarget,
    })
  }

  transferDraft.value.contactId = ''
  transferDraft.value.amount = ''
  transferDraft.value.currency = primaryCurrency.value
  transferDraft.value.counterparty = ''
  transferDraft.value.note = ''
  showFeedback('success', t('已记录一笔虚拟转账。', 'Virtual transfer recorded.'))
}

const removeTransaction = (transactionId) => {
  if (walletStore.removeTransaction(transactionId)) {
    relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
      RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_SHARED_TRANSFER,
      transactionId,
    )
    relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
      RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_ORDER_SUPPORT,
      transactionId,
    )
    showFeedback('success', t('流水已删除。', 'Transaction removed.'))
  }
}
</script>

<template>
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> 首页
      </button>
      <h1 class="font-bold">{{ t('钱包', 'Wallet') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar bg-gray-50 px-5 py-6 space-y-4">
      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <p class="text-xs text-gray-500">{{ t('当前余额', 'Current balance') }}</p>
        <p class="mt-1 text-3xl font-bold">{{ primaryBalance.amount }} {{ primaryBalance.currency }}</p>
        <div class="mt-3 flex items-end gap-2">
          <label class="min-w-0 flex-1 text-[11px] font-semibold text-gray-500">
            <span class="mb-1 block">{{ t('主币种', 'Primary currency') }}</span>
            <select
              v-model="primaryCurrencyDraft"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold uppercase outline-none"
              data-testid="wallet-primary-currency"
            >
              <option
                v-for="currency in currencyOptions"
                :key="currency.code"
                :value="currency.code"
              >
                {{ currency.code }} · {{ t(currency.labelZh || currency.code, currency.labelEn || currency.code) }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="rounded-lg bg-gray-950 px-3 py-2 text-xs font-semibold text-white"
            data-testid="wallet-save-primary-currency"
            @click="savePrimaryCurrency"
          >
            {{ t('保存', 'Save') }}
          </button>
        </div>
        <p class="mt-2 text-[11px] text-gray-500">
          {{
            t(
              '这是本地虚拟账本；Chat 转账卡片会以来源流水进入这里。',
              'This is a local virtual ledger; Chat transfer cards now appear here as sourced records.',
            )
          }}
        </p>
        <div v-if="balances.length > 1" class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="item in balances"
            :key="item.currency"
            class="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-600"
          >
            {{ item.amount }} {{ item.currency }}
          </span>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4 space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('汇率坐标', 'Exchange rates') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">
              {{ t('以 USD/CNY 为核心参考，世界包注入的自定义货币也在这里维护。', 'USD/CNY is the reference pair; custom world currencies are maintained here too.') }}
            </p>
          </div>
          <span class="rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">
            USD/CNY
          </span>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-2">
          <label class="text-[11px] font-semibold text-gray-500">
            <span class="mb-1 block">{{ t('1 USD 等于 CNY', '1 USD equals CNY') }}</span>
            <input
              :value="usdCnyDraft"
              inputmode="decimal"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
              data-testid="wallet-usd-cny-rate"
              @input="usdCnyDraft = $event.target.value"
            />
          </label>
          <button
            type="button"
            class="self-end rounded-lg bg-gray-950 px-3 py-2 text-xs font-semibold text-white"
            data-testid="wallet-save-usd-cny-rate"
            @click="saveUsdCnyRate"
          >
            {{ t('保存', 'Save') }}
          </button>
        </div>
        <div class="space-y-2">
          <div
            v-for="row in exchangeRateRows"
            :key="row.code"
            class="grid grid-cols-[minmax(0,1fr)_minmax(92px,120px)_auto] items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
            :data-testid="`wallet-rate-row-${row.code}`"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ row.code }} · {{ t(row.labelZh || row.code, row.labelEn || row.code) }}</p>
              <p class="text-[11px] text-gray-500">{{ row.source === 'world_pack' ? t('世界包注入', 'World pack') : t('系统货币', 'System currency') }}</p>
            </div>
            <input
              :value="rateDraftValue(row.code)"
              :disabled="row.code === 'CNY'"
              inputmode="decimal"
              class="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none disabled:bg-gray-100 disabled:text-gray-400"
              :data-testid="`wallet-cny-rate-${row.code}`"
              @input="updateRateDraft(row.code, $event.target.value)"
            />
            <button
              type="button"
              :disabled="row.code === 'CNY'"
              class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-semibold text-gray-700 disabled:text-gray-400"
              :data-testid="`wallet-save-cny-rate-${row.code}`"
              @click="saveCurrencyRate(row.code)"
            >
              {{ t('更新', 'Update') }}
            </button>
          </div>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4 space-y-3">
        <p class="text-sm font-semibold">{{ t('记录虚拟转账', 'Record virtual transfer') }}</p>
        <select
          v-model="transferDraft.contactId"
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          data-testid="wallet-relationship-contact"
        >
          <option value="">{{ t('Optional Chat contact binding', 'Optional Chat contact binding') }}</option>
          <option
            v-for="contact in relationshipContactOptions"
            :key="contact.id"
            :value="contact.optionValue"
          >
            {{ contact.optionLabel }}
          </option>
        </select>
        <div class="grid grid-cols-2 gap-2">
          <input
            v-model="transferDraft.amount"
            type="text"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
            data-testid="wallet-transfer-amount"
            :placeholder="t('金额', 'Amount')"
          />
          <select
            v-model="transferDraft.currency"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase outline-none"
            data-testid="wallet-transfer-currency"
          >
            <option
              v-for="currency in currencyOptions"
              :key="currency.code"
              :value="currency.code"
            >
              {{ currency.code }}
            </option>
          </select>
        </div>
        <input
          v-model="transferDraft.counterparty"
          type="text"
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          data-testid="wallet-transfer-counterparty"
          :disabled="Boolean(selectedRelationshipContact)"
          :placeholder="t('对象，例如角色名', 'Counterparty, e.g. role name')"
        />
        <input
          v-model="transferDraft.note"
          type="text"
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="t('备注，可选', 'Note, optional')"
        />
        <button
          @click="submitTransfer"
          class="w-full rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
          data-testid="wallet-submit-transfer"
        >
          {{ t('添加流水', 'Add transaction') }}
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
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('交易流水', 'Transactions') }}</p>
            <p class="text-[11px] text-gray-500">
              {{ t(`${transactionSourceSummary.chat} 条来自 Chat`, `${transactionSourceSummary.chat} from Chat`) }}
            </p>
          </div>
          <span class="text-[11px] text-gray-500">{{ transactionCount }}</span>
        </div>
        <div class="mb-3 flex flex-wrap gap-2">
          <button
            v-for="option in sourceFilterOptions"
            :key="option.key"
            type="button"
            class="rounded-full px-3 py-1.5 text-[11px]"
            :class="sourceFilter === option.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'"
            @click="sourceFilter = option.key"
          >
            {{ option.label }} · {{ option.count }}
          </button>
        </div>
        <div v-if="recentTransactions.length > 0" class="space-y-2">
          <div
            v-for="item in recentTransactions"
            :key="item.id"
            class="rounded-xl border border-gray-100 p-3 flex items-start gap-3"
          >
            <div
              class="mt-0.5 w-9 h-9 rounded-full flex items-center justify-center text-xs"
              :class="item.type === 'expense' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'"
            >
              <i :class="item.type === 'expense' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{{ item.title }}</p>
              <p class="text-[11px] text-gray-500 truncate">
                {{ item.counterparty || t('未设置对象', 'No counterparty') }} · {{ formatTime(item.createdAt) }}
              </p>
              <span
                class="mt-2 inline-flex rounded-full px-2 py-1 text-[11px]"
                :class="getTransactionSourceClass(item)"
              >
                {{ getTransactionSourceLabel(item) }}
              </span>
              <p v-if="item.note" class="mt-1 text-[11px] text-gray-400 truncate">{{ item.note }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold">
                {{ item.type === 'expense' ? '-' : '+' }}{{ (item.amountCents / 100).toFixed(2) }} {{ item.currency }}
              </p>
              <button
                @click="removeTransaction(item.id)"
                :data-testid="`wallet-remove-transaction-${item.id}`"
                class="mt-1 text-[11px] text-red-500 hover:text-red-600"
              >
                {{ t('删除', 'Delete') }}
              </button>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-gray-500">
          {{ t('暂无交易流水。', 'No transactions yet.') }}
        </p>
      </section>
    </div>
  </div>
</template>
