<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import WalletBankCard from '../components/wallet/WalletBankCard.vue'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import { findWalletBankInstitution } from '../lib/wallet-banking'
import {
  RELATIONSHIP_FACT_SOURCE_KEYS,
  recordWalletSharedTransferRelationshipFact,
} from '../lib/relationship-fact-adapters'
import { useChatStore } from '../stores/chat'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'
import {
  WALLET_TRANSACTION_SOURCE_FILTERS,
  formatWalletExchangeRate,
  useWalletStore,
} from '../stores/wallet'

const router = useRouter()
const route = useRoute()
const { systemLanguage, t } = useI18n()
const chatStore = useChatStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const walletStore = useWalletStore()
const {
  transactionCount,
  transactionSourceSummary,
  primaryCurrency,
  currencyOptions,
  exchangeRateRows,
  exchangeRates,
  bankAccountSummaries,
  paymentCardSummaries,
  activePaymentCard,
  knownPayeeAccountSummaries,
} = storeToRefs(walletStore)

const WALLET_WORKFLOW_QUERY_KEYS = new Set([
  'intent',
  'payeeAccountId',
  'profileId',
  'chatId',
  'messageId',
  'amount',
  'currency',
  'note',
  'receiptId',
  'transactionId',
  'source',
])

const queryText = (value = '') => {
  const source = Array.isArray(value) ? value[0] : value
  return typeof source === 'string' ? source.trim() : ''
}

const queryPositiveInt = (value = '') => {
  const number = Number(queryText(value))
  return Number.isSafeInteger(number) && number > 0 ? number : 0
}

const activeSection = ref('home')
const detailCardId = ref('')
const detailReturnSection = ref('cards')
const sourceFilter = ref(WALLET_TRANSACTION_SOURCE_FILTERS.ALL)
const primaryCurrencyDraft = ref(primaryCurrency.value)
const usdCnyDraft = ref(String(exchangeRates.value.reference?.rate || '7.2'))
const rateDrafts = ref({})
const ratesExpanded = ref(false)
const feedback = ref('')
const feedbackType = ref('success')
const cardCarouselRef = ref(null)
const selectedReceiptId = ref('')
const selectedTransactionId = ref('')
const payeeTransferSubmitting = ref(false)
let cardSelectionFrame = 0

const firstFundedAccount = () =>
  bankAccountSummaries.value.find((account) => (account.primaryBalance?.amountCents || 0) > 0) ||
  bankAccountSummaries.value[0] ||
  null

const transferDraft = ref({
  direction: 'outgoing',
  contactId: '',
  accountId: firstFundedAccount()?.id || '',
  amount: '',
  currency: firstFundedAccount()?.primaryCurrency || primaryCurrency.value,
  counterparty: '',
  note: '',
})
const receiveAccountId = ref(firstFundedAccount()?.id || '')
const payeeTransferDraft = ref({
  accountId: '',
  amount: '',
  note: '',
})

const sectionTitle = computed(() => {
  if (activeSection.value === 'activity') return t('活动', 'Activity')
  if (activeSection.value === 'cards') return t('卡片', 'Cards')
  if (activeSection.value === 'settings') return t('钱包设置', 'Wallet settings')
  if (activeSection.value === 'transfer') return t('转账', 'Transfer')
  if (activeSection.value === 'receive') return t('收款', 'Receive')
  if (activeSection.value === 'card-detail') return t('卡片详情', 'Card details')
  if (activeSection.value === 'payee-transfer') return t('确认转账', 'Confirm transfer')
  if (activeSection.value === 'receipt') return t('转账回执', 'Transfer receipt')
  if (activeSection.value === 'transaction-detail') return t('交易详情', 'Transaction details')
  return t('钱包', 'Wallet')
})

const headerBackText = computed(() => {
  if (activeSection.value === 'home') return t('首页', 'Home')
  if (activeSection.value === 'payee-transfer' && workflowChatId.value) return 'Chat'
  if (activeSection.value === 'transaction-detail') return t('活动', 'Activity')
  return t('钱包', 'Wallet')
})

const headerBackAriaLabel = computed(() => {
  if (activeSection.value === 'home') return t('返回首页', 'Return Home')
  if (activeSection.value === 'payee-transfer' && workflowChatId.value) {
    return t('返回聊天', 'Return to Chat')
  }
  if (activeSection.value === 'transaction-detail') {
    return t('返回钱包活动', 'Return to Wallet activity')
  }
  return t('返回钱包', 'Return to Wallet')
})

const showBottomNavigation = computed(() =>
  ['home', 'activity', 'cards'].includes(activeSection.value),
)

const selectedDetailCard = computed(
  () =>
    paymentCardSummaries.value.find((card) => card.id === detailCardId.value) ||
    activePaymentCard.value ||
    null,
)

const selectedTransferAccount = computed(
  () =>
    bankAccountSummaries.value.find((account) => account.id === transferDraft.value.accountId) ||
    null,
)

const transferAccountCard = computed(
  () =>
    paymentCardSummaries.value.find(
      (card) => card.kind === 'debit' && card.accountId === selectedTransferAccount.value?.id,
    ) || null,
)

const selectedReceiveAccount = computed(
  () =>
    bankAccountSummaries.value.find((account) => account.id === receiveAccountId.value) ||
    firstFundedAccount(),
)

const selectedPayeeAccount = computed(() => {
  const payeeAccountId = queryText(route.query.payeeAccountId)
  if (!payeeAccountId) return null
  return knownPayeeAccountSummaries.value.find((payee) => payee.id === payeeAccountId) || null
})

const payeeTransferContextError = computed(() => {
  const payee = selectedPayeeAccount.value
  if (!payee || payee.status !== 'active') return 'payee_not_found'
  const expectedProfileId = queryPositiveInt(route.query.profileId)
  if (expectedProfileId && expectedProfileId !== payee.ownerProfileId) return 'payee_not_found'
  const expectedCurrency = queryText(route.query.currency).toUpperCase()
  if (expectedCurrency && expectedCurrency !== payee.currency) return 'currency_mismatch'
  return ''
})

const payeeTransferAccounts = computed(() => {
  const currency = selectedPayeeAccount.value?.currency
  if (!currency) return []
  return bankAccountSummaries.value.filter((account) => account.currencies.includes(currency))
})

const selectedPayeeTransferAccount = computed(
  () =>
    payeeTransferAccounts.value.find(
      (account) => account.id === payeeTransferDraft.value.accountId,
    ) || null,
)

const selectedPayeeTransferCard = computed(
  () =>
    paymentCardSummaries.value.find(
      (card) =>
        card.kind === 'debit' &&
        card.status === 'active' &&
        card.accountId === selectedPayeeTransferAccount.value?.id &&
        card.supportedCurrencies.includes(selectedPayeeAccount.value?.currency),
    ) || null,
)

const selectedReceipt = computed(() => {
  const transaction = walletStore.findTransactionById(selectedReceiptId.value)
  return transaction?.sourceModule === 'wallet_payee_transfer' && transaction.receiptNumber
    ? transaction
    : null
})

const selectedTransaction = computed(() =>
  walletStore.findTransactionById(selectedTransactionId.value),
)

const selectedTransactionAccount = computed(() => {
  const transaction = selectedTransaction.value
  if (!transaction) return null
  const explicitAccount = bankAccountSummaries.value.find(
    (account) => account.id === transaction.accountId,
  )
  if (explicitAccount) return explicitAccount
  const fallbackAccount = walletStore.findDefaultBankAccountForCurrency(transaction.currency)
  return bankAccountSummaries.value.find((account) => account.id === fallbackAccount?.id) || null
})

const selectedTransactionCard = computed(() => {
  const cardId = selectedTransaction.value?.cardId
  if (!cardId) return null
  return paymentCardSummaries.value.find((card) => card.id === cardId) || null
})

const receiptInstitution = computed(() =>
  findWalletBankInstitution(selectedReceipt.value?.recipientInstitutionId),
)

const receiptPaymentAccount = computed(
  () =>
    bankAccountSummaries.value.find((account) => account.id === selectedReceipt.value?.accountId) ||
    null,
)

const receiptPaymentCard = computed(
  () =>
    paymentCardSummaries.value.find((card) => card.id === selectedReceipt.value?.cardId) || null,
)

const workflowChatId = computed(
  () =>
    Number(selectedReceipt.value?.sourceChatId) ||
    Number(selectedPayeeAccount.value?.sourceChatId) ||
    queryPositiveInt(route.query.chatId),
)

const payeeTransferAmountIsValid = computed(() => {
  const amount = String(payeeTransferDraft.value.amount || '').trim()
  return /^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) > 0
})

const canSubmitPayeeTransfer = computed(
  () =>
    !payeeTransferSubmitting.value &&
    !payeeTransferContextError.value &&
    Boolean(selectedPayeeTransferAccount.value) &&
    payeeTransferAmountIsValid.value,
)

const receiveCard = computed(
  () =>
    paymentCardSummaries.value.find(
      (card) => card.kind === 'debit' && card.accountId === selectedReceiveAccount.value?.id,
    ) || null,
)

const sourceFilterOptions = computed(() => [
  {
    key: WALLET_TRANSACTION_SOURCE_FILTERS.ALL,
    label: t('全部', 'All'),
    count: transactionSourceSummary.value.all,
  },
  {
    key: WALLET_TRANSACTION_SOURCE_FILTERS.MANUAL,
    label: t('钱包', 'Wallet'),
    count: transactionSourceSummary.value.manual,
  },
  {
    key: WALLET_TRANSACTION_SOURCE_FILTERS.CHAT,
    label: 'Chat',
    count: transactionSourceSummary.value.chat,
  },
  {
    key: WALLET_TRANSACTION_SOURCE_FILTERS.ORDERS,
    label: t('消费', 'Purchases'),
    count: transactionSourceSummary.value.orders,
  },
])

const filteredTransactions = computed(() =>
  walletStore.listTransactionsBySourceFilter(sourceFilter.value),
)

const recentTransactions = computed(() =>
  walletStore.listTransactionsBySourceFilter(WALLET_TRANSACTION_SOURCE_FILTERS.ALL).slice(0, 3),
)

const detailTransactions = computed(() =>
  selectedDetailCard.value
    ? walletStore.listTransactionsByCard(selectedDetailCard.value.id).slice(0, 4)
    : [],
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

const selectedRelationshipContact = computed(
  () =>
    relationshipContactOptions.value.find(
      (contact) => contact.optionValue === String(transferDraft.value.contactId || ''),
    ) || null,
)

watch(
  () => transferDraft.value.accountId,
  (accountId) => {
    const account = bankAccountSummaries.value.find((item) => item.id === accountId)
    if (account) transferDraft.value.currency = account.primaryCurrency
  },
)

const showFeedback = (type, message) => {
  feedbackType.value = type
  feedback.value = message
}

const payeeTransferErrorMessage = (reason = '') => {
  if (reason === 'payee_not_found') {
    return t(
      '收款账户已失效，请返回 Chat 重新请求账户卡。',
      'This receiving account is no longer available. Request a new account card in Chat.',
    )
  }
  if (reason === 'currency_mismatch') {
    return t(
      '账户卡币种信息不一致，请返回 Chat 重新请求。',
      'The account-card currency no longer matches. Request a new card in Chat.',
    )
  }
  if (reason === 'insufficient_funds') {
    return t('该币种账户余额不足。', 'Insufficient balance in this currency account.')
  }
  if (reason === 'payment_card_unavailable') {
    return t('该付款账户没有可用的借记卡。', 'This payment account has no available debit card.')
  }
  if (reason === 'amount_invalid') {
    return t(
      '请输入有效金额，最多保留两位小数。',
      'Enter a valid amount with up to two decimal places.',
    )
  }
  return t(
    '暂时无法完成转账，请稍后重试。',
    'The transfer could not be completed. Try again later.',
  )
}

const accountBalanceForCurrency = (account, currency = '') =>
  account?.balances?.find((balance) => balance.currency === currency) || {
    amount: '0.00',
    amountCents: 0,
    currency,
  }

const clearFeedback = () => {
  feedback.value = ''
}

const baseWalletRouteQuery = () =>
  Object.fromEntries(
    Object.entries(route.query).filter(([key]) => !WALLET_WORKFLOW_QUERY_KEYS.has(key)),
  )

const replaceWalletWorkflowQuery = (workflowQuery = {}) => {
  const nextQuery = baseWalletRouteQuery()
  Object.entries(workflowQuery).forEach(([key, value]) => {
    const normalized = queryText(String(value ?? ''))
    if (normalized) nextQuery[key] = normalized
  })
  void router.replace({ path: '/wallet', query: nextQuery })
}

const closeWalletWorkflow = (section = 'home') => {
  selectedReceiptId.value = ''
  selectedTransactionId.value = ''
  payeeTransferSubmitting.value = false
  activeSection.value = section
  replaceWalletWorkflowQuery()
}

const closeTransactionDetail = () => {
  selectedTransactionId.value = ''
  activeSection.value = 'activity'
  const nextQuery = Object.fromEntries(
    Object.entries(route.query).filter(([key]) => key !== 'transactionId'),
  )
  void router.replace({ path: '/wallet', query: nextQuery })
}

const returnToSourceChat = () => {
  const chatId = workflowChatId.value
  if (!chatId) {
    closeWalletWorkflow('home')
    return
  }
  void router.push(`/chat/${chatId}`)
}

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const navigateToSection = (section) => {
  clearFeedback()
  if (activeSection.value === 'transaction-detail') {
    selectedTransactionId.value = ''
    activeSection.value = section
    const nextQuery = Object.fromEntries(
      Object.entries(route.query).filter(([key]) => key !== 'transactionId'),
    )
    void router.replace({ path: '/wallet', query: nextQuery })
    return
  }
  const leavingWorkflow = ['payee-transfer', 'receipt'].includes(activeSection.value)
  activeSection.value = section
  if (leavingWorkflow) replaceWalletWorkflowQuery()
}

const navigateBack = () => {
  clearFeedback()
  if (activeSection.value === 'payee-transfer') {
    returnToSourceChat()
    return
  }
  if (activeSection.value === 'receipt') {
    closeWalletWorkflow('activity')
    return
  }
  if (activeSection.value === 'transaction-detail') {
    closeTransactionDetail()
    return
  }
  if (activeSection.value === 'home') {
    goHome()
    return
  }
  if (activeSection.value === 'card-detail') {
    activeSection.value = detailReturnSection.value
    return
  }
  activeSection.value = 'home'
}

const syncWalletWorkflowFromRoute = () => {
  const receiptId = queryText(route.query.receiptId)
  if (receiptId) {
    clearFeedback()
    selectedTransactionId.value = ''
    selectedReceiptId.value = receiptId
    activeSection.value = 'receipt'
    return
  }

  const transactionId = queryText(route.query.transactionId)
  if (transactionId) {
    clearFeedback()
    selectedReceiptId.value = ''
    selectedTransactionId.value = transactionId
    activeSection.value = 'transaction-detail'
    return
  }

  const payeeAccountId = queryText(route.query.payeeAccountId)
  const intent = queryText(route.query.intent)
  if (!payeeAccountId && intent !== 'payee_account') return

  clearFeedback()
  selectedReceiptId.value = ''
  selectedTransactionId.value = ''
  activeSection.value = 'payee-transfer'
  const requestedAmount = queryText(route.query.amount)
  payeeTransferDraft.value.amount = /^\d+(\.\d{1,2})?$/.test(requestedAmount) ? requestedAmount : ''
  payeeTransferDraft.value.note = queryText(route.query.note).slice(0, 240)

  const accounts = payeeTransferAccounts.value
  const activeAccountId = activePaymentCard.value?.accountId || ''
  const preferredAccount =
    accounts.find((account) => account.id === activeAccountId) ||
    accounts.find((account) => account.isDefaultForCurrency) ||
    accounts[0] ||
    null
  payeeTransferDraft.value.accountId = preferredAccount?.id || ''
}

const centerCardInCarousel = async (cardId) => {
  await nextTick()
  const carousel = cardCarouselRef.value
  if (!carousel) return
  const cardItem = [...carousel.querySelectorAll('[data-wallet-card-id]')].find(
    (item) => item.dataset.walletCardId === cardId,
  )
  if (!cardItem || typeof carousel.scrollTo !== 'function') return
  const targetLeft = cardItem.offsetLeft - (carousel.clientWidth - cardItem.clientWidth) / 2
  carousel.scrollTo({ left: Math.max(0, targetLeft), behavior: 'auto' })
}

const selectCard = (cardId) => {
  const card = walletStore.selectPaymentCard(cardId)
  if (card) void centerCardInCarousel(card.id)
  return card
}

const syncCardSelectionFromCarousel = () => {
  if (typeof window === 'undefined') return
  if (cardSelectionFrame) window.cancelAnimationFrame(cardSelectionFrame)
  cardSelectionFrame = window.requestAnimationFrame(() => {
    cardSelectionFrame = 0
    const carousel = cardCarouselRef.value
    if (!carousel) return
    const cardItems = [...carousel.querySelectorAll('[data-wallet-card-id]')]
    const maxScrollLeft = Math.max(0, carousel.scrollWidth - carousel.clientWidth)
    const edgeTolerance = 2
    let nearestCardId = ''
    if (carousel.scrollLeft <= edgeTolerance) {
      nearestCardId = cardItems[0]?.dataset.walletCardId || ''
    } else if (maxScrollLeft - carousel.scrollLeft <= edgeTolerance) {
      nearestCardId = cardItems.at(-1)?.dataset.walletCardId || ''
    }

    const carouselCenter = carousel.scrollLeft + carousel.clientWidth / 2
    let nearestDistance = Number.POSITIVE_INFINITY
    if (!nearestCardId) {
      cardItems.forEach((item) => {
        const itemCenter = item.offsetLeft + item.clientWidth / 2
        const distance = Math.abs(itemCenter - carouselCenter)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestCardId = item.dataset.walletCardId || ''
        }
      })
    }
    if (nearestCardId && nearestCardId !== activePaymentCard.value?.id) {
      walletStore.selectPaymentCard(nearestCardId)
    }
  })
}

const openCardDetail = (cardId, returnSection = 'cards') => {
  const card = walletStore.selectPaymentCard(cardId)
  if (!card) return
  detailCardId.value = card.id
  detailReturnSection.value = returnSection
  navigateToSection('card-detail')
}

const openActiveCardDetail = () => {
  if (activePaymentCard.value) openCardDetail(activePaymentCard.value.id, 'home')
}

const cardAmountLabel = (card) => {
  if (!card) return ''
  if (card.kind === 'credit' && card.creditLimit) {
    return walletStore.formatMoney(card.creditLimit, { locale: systemLanguage.value })
  }
  const balance = card.account?.primaryBalance
  return balance ? `${balance.amount} ${balance.currency}` : `0.00 ${card.settlementCurrency}`
}

const cardAmountCaption = (card) =>
  card?.kind === 'credit' ? t('可用额度', 'Available credit') : t('可用余额', 'Available balance')

const formatTime = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return t('未知时间', 'Unknown time')
  return new Date(value).toLocaleString(systemLanguage.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDetailTime = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return t('未知时间', 'Unknown time')
  return new Date(value).toLocaleString(systemLanguage.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isRolePayeeTransfer = (transaction) => transaction?.sourceModule === 'wallet_payee_transfer'

const isChatSource = (transaction) =>
  transaction?.sourceModule === 'chat_transfer' || isRolePayeeTransfer(transaction)

const isOrderSource = (transaction) =>
  transaction?.sourceModule === 'shopping_wallet_expense' ||
  transaction?.sourceModule === 'food_delivery_wallet_expense'

const getTransactionSourceLabel = (transaction) =>
  isChatSource(transaction)
    ? 'Chat'
    : isOrderSource(transaction)
      ? t('订单消费', 'Order purchase')
      : transaction?.direction === 'incoming'
        ? t('收款', 'Received')
        : transaction?.direction === 'outgoing'
          ? t('转账', 'Transfer')
          : t('钱包记录', 'Wallet record')

const getTransactionModuleLabel = (transaction) => {
  if (transaction?.sourceModule === 'shopping_wallet_expense') return 'Shopping'
  if (transaction?.sourceModule === 'food_delivery_wallet_expense') return 'Food Delivery'
  if (isChatSource(transaction)) return 'Chat'
  if (transaction?.sourceModule === 'seed') return 'SchatPhone'
  if (transaction?.sourceModule === 'wallet_manual' || transaction?.sourceModule === 'wallet') {
    return t('钱包', 'Wallet')
  }
  return transaction?.sourceModule || t('钱包', 'Wallet')
}

const getTransactionDirectionLabel = (transaction) => {
  if (transaction?.direction === 'incoming') return t('转入', 'Incoming')
  if (transaction?.direction === 'outgoing') return t('转出', 'Outgoing')
  if (transaction?.type === 'expense') return t('支出', 'Expense')
  if (transaction?.type === 'income') return t('收入', 'Income')
  return t('转账', 'Transfer')
}

const formatHistoricalMoney = (money) => {
  const definition = currencyOptions.value.find((currency) => currency.code === money?.currency)
  const formatted =
    definition && definition.source !== 'ledger'
      ? walletStore.formatMoney(money, {
          locale: systemLanguage.value,
          currencyPosition: 'suffix',
        })
      : ''
  if (formatted) return formatted
  const amountMinor = Number.isSafeInteger(money?.amountMinor) ? money.amountMinor : 0
  const currency = queryText(money?.currency).toUpperCase() || t('未知币种', 'Unknown currency')
  return `${amountMinor} ${currency} · ${t('最小单位', 'minor units')}`
}

const formatRecordedRate = (quoteSnapshot) => {
  if (!quoteSnapshot) return ''
  return `1 ${quoteSnapshot.sourceMoney.currency} = ${quoteSnapshot.rate} ${quoteSnapshot.quotedMoney.currency}`
}

const getRateSourceLabel = (rateSource = '') => {
  if (rateSource === 'bundled_average') return t('内置参考平均值', 'Bundled reference average')
  if (rateSource === 'user_edit') return t('用户设置', 'User setting')
  if (rateSource === 'world_pack') return t('世界货币设置', 'World currency setting')
  if (rateSource === 'live_provider') return t('实时汇率服务', 'Live rate provider')
  return rateSource || t('未知来源', 'Unknown source')
}

const transactionAmountLabel = (transaction) => {
  const sign = transaction.type === 'expense' ? '-' : '+'
  return `${sign}${(transaction.amountCents / 100).toFixed(2)} ${transaction.currency}`
}

const transactionIcon = (transaction) => {
  if (isOrderSource(transaction)) return 'fas fa-bag-shopping'
  if (isRolePayeeTransfer(transaction)) return 'fas fa-building-columns'
  if (transaction.type === 'expense') return 'fas fa-arrow-up'
  return 'fas fa-arrow-down'
}

const openTransfer = () => {
  const activeAccount = activePaymentCard.value?.account
  const account = activeAccount || firstFundedAccount()
  if (account) {
    transferDraft.value.accountId = account.id
    transferDraft.value.currency = account.primaryCurrency
  }
  transferDraft.value.direction = 'outgoing'
  navigateToSection('transfer')
}

const openReceive = () => {
  const activeAccount = activePaymentCard.value?.account
  receiveAccountId.value = activeAccount?.id || firstFundedAccount()?.id || ''
  navigateToSection('receive')
}

const useReceiveCard = () => {
  if (!receiveCard.value) return
  selectCard(receiveCard.value.id)
  activeSection.value = 'home'
}

const submitTransfer = () => {
  const relationshipTarget = selectedRelationshipContact.value
  const account = selectedTransferAccount.value
  const numericAmount = Number(transferDraft.value.amount)
  const amountCents = Number.isFinite(numericAmount) ? Math.round(numericAmount * 100) : 0

  if (
    transferDraft.value.direction === 'outgoing' &&
    account &&
    amountCents > (account.primaryBalance?.amountCents || 0)
  ) {
    showFeedback('warning', t('账户余额不足。', 'Insufficient account balance.'))
    return
  }

  const created = walletStore.addTransferTransaction({
    amount: transferDraft.value.amount,
    currency: transferDraft.value.currency,
    accountId: account?.id || '',
    cardId: transferAccountCard.value?.id || '',
    direction: transferDraft.value.direction,
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
    showFeedback('warning', t('请输入有效金额。', 'Enter a valid amount.'))
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
  transferDraft.value.counterparty = ''
  transferDraft.value.note = ''
  activeSection.value = 'activity'
  showFeedback(
    'success',
    created.direction === 'incoming'
      ? t('收款已记入账户。', 'Payment received.')
      : t('转账已完成。', 'Transfer complete.'),
  )
}

const submitPayeeTransfer = () => {
  if (payeeTransferSubmitting.value) return
  if (payeeTransferContextError.value) {
    showFeedback('warning', payeeTransferErrorMessage(payeeTransferContextError.value))
    return
  }
  if (!payeeTransferAmountIsValid.value) {
    showFeedback('warning', payeeTransferErrorMessage('amount_invalid'))
    return
  }

  const payee = selectedPayeeAccount.value
  const account = selectedPayeeTransferAccount.value
  if (!payee || !account) {
    showFeedback('warning', payeeTransferErrorMessage('currency_mismatch'))
    return
  }

  payeeTransferSubmitting.value = true
  const result = walletStore.addRolePayeeTransfer({
    payeeAccountId: payee.id,
    amount: payeeTransferDraft.value.amount,
    accountId: account.id,
    cardId: selectedPayeeTransferCard.value?.id || '',
    note: payeeTransferDraft.value.note,
    sourceChatId: workflowChatId.value,
    sourceMessageId: queryText(route.query.messageId) || payee.sourceMessageId,
  })

  if (!result.ok || !result.transaction) {
    payeeTransferSubmitting.value = false
    showFeedback('warning', payeeTransferErrorMessage(result.reason))
    return
  }

  const contact =
    (typeof chatStore.getContactById === 'function' &&
      chatStore.getContactById(payee.ownerContactId || workflowChatId.value)) ||
    null
  recordWalletSharedTransferRelationshipFact({
    chatStore,
    relationshipRuntimeStore,
    transaction: result.transaction,
    target: contact || {
      id: payee.ownerContactId || workflowChatId.value,
      profileId: payee.ownerProfileId,
      kind: 'role',
      name: payee.ownerName,
    },
  })

  walletStore.saveNow()
  payeeTransferSubmitting.value = false
  clearFeedback()
  selectedReceiptId.value = result.transaction.id
  selectedTransactionId.value = ''
  activeSection.value = 'receipt'
  replaceWalletWorkflowQuery({
    receiptId: result.transaction.id,
    source: 'chat',
    chatId: result.transaction.sourceChatId,
  })
}

const openTransferReceipt = (transaction) => {
  if (!isRolePayeeTransfer(transaction) || !transaction?.receiptNumber) return
  clearFeedback()
  selectedTransactionId.value = ''
  selectedReceiptId.value = transaction.id
  activeSection.value = 'receipt'
  replaceWalletWorkflowQuery({
    receiptId: transaction.id,
    source: 'activity',
    chatId: transaction.sourceChatId,
  })
}

const openTransactionDetail = (transaction) => {
  if (!transaction?.id) return
  clearFeedback()
  selectedReceiptId.value = ''
  selectedTransactionId.value = transaction.id
  activeSection.value = 'transaction-detail'
  replaceWalletWorkflowQuery({ transactionId: transaction.id })
}

const removeTransaction = (transactionId) => {
  if (!walletStore.removeTransaction(transactionId)) return
  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_SHARED_TRANSFER,
    transactionId,
  )
  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_ORDER_SUPPORT,
    transactionId,
  )
  showFeedback('success', t('记录已删除。', 'Record deleted.'))
}

const savePrimaryCurrency = () => {
  const nextCurrency = walletStore.setPrimaryCurrency(primaryCurrencyDraft.value)
  if (!nextCurrency) {
    primaryCurrencyDraft.value = primaryCurrency.value
    showFeedback('warning', t('显示币种格式无效。', 'Invalid display currency.'))
    return
  }
  primaryCurrencyDraft.value = nextCurrency
  showFeedback('success', t('显示币种已更新。', 'Display currency updated.'))
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
  return exchangeRateRows.value.find((item) => item.code === currencyCode)?.rateToCnyLabel || ''
}

const updateRateDraft = (currencyCode = '', value = '') => {
  rateDrafts.value = { ...rateDrafts.value, [currencyCode]: value }
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

const setDefaultCard = () => {
  const card = selectedDetailCard.value
  if (!card || !walletStore.setDefaultPaymentCard(card.id)) {
    showFeedback('warning', t('冻结卡不能设为默认卡。', 'A frozen card cannot be the default.'))
    return
  }
  showFeedback('success', t('默认支付卡已更新。', 'Default payment card updated.'))
}

const toggleCardFrozen = () => {
  const card = selectedDetailCard.value
  if (!card) return
  const updated = walletStore.togglePaymentCardFrozen(card.id)
  if (!updated) return
  showFeedback(
    'success',
    updated.status === 'frozen'
      ? t('卡片已冻结。', 'Card frozen.')
      : t('卡片已解冻。', 'Card unfrozen.'),
  )
}

watch(
  () => route.fullPath,
  () => syncWalletWorkflowFromRoute(),
  { immediate: true },
)

onMounted(() => {
  if (activePaymentCard.value?.id) void centerCardInCarousel(activePaymentCard.value.id)
})

onBeforeUnmount(() => {
  if (cardSelectionFrame && typeof window !== 'undefined') {
    window.cancelAnimationFrame(cardSelectionFrame)
  }
})
</script>

<template>
  <div class="wallet-app" data-app="wallet">
    <header class="wallet-header">
      <button
        type="button"
        class="wallet-header__back"
        :aria-label="headerBackAriaLabel"
        data-testid="wallet-header-back"
        @click="navigateBack"
      >
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
        <span>{{ headerBackText }}</span>
      </button>
      <h1>{{ sectionTitle }}</h1>
      <button
        v-if="activeSection === 'home'"
        type="button"
        class="wallet-icon-button"
        :title="t('钱包设置', 'Wallet settings')"
        :aria-label="t('钱包设置', 'Wallet settings')"
        data-testid="wallet-open-settings"
        @click="navigateToSection('settings')"
      >
        <i class="fas fa-gear" aria-hidden="true"></i>
      </button>
      <span v-else class="wallet-header__spacer" aria-hidden="true"></span>
    </header>

    <main class="wallet-content" :class="{ 'has-bottom-nav': showBottomNavigation }">
      <div
        v-if="feedback"
        class="wallet-feedback"
        :class="feedbackType === 'warning' ? 'is-warning' : 'is-success'"
        role="status"
      >
        <i
          :class="feedbackType === 'warning' ? 'fas fa-circle-exclamation' : 'fas fa-circle-check'"
          aria-hidden="true"
        ></i>
        <span>{{ feedback }}</span>
      </div>

      <template v-if="activeSection === 'home'">
        <section class="wallet-card-stage" aria-labelledby="wallet-cards-heading">
          <div class="wallet-section-heading wallet-section-heading--stage">
            <div>
              <p class="wallet-eyebrow">{{ t('常用卡', 'Everyday cards') }}</p>
              <h2 id="wallet-cards-heading">
                {{
                  activePaymentCard?.institution
                    ? t(activePaymentCard.institution.nameZh, activePaymentCard.institution.nameEn)
                    : ''
                }}
              </h2>
            </div>
            <button
              type="button"
              class="wallet-text-button"
              data-testid="wallet-open-active-card"
              @click="openActiveCardDetail"
            >
              {{ t('详情', 'Details') }}
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>

          <div
            ref="cardCarouselRef"
            class="wallet-card-carousel"
            data-testid="wallet-card-carousel"
            @scroll.passive="syncCardSelectionFromCarousel"
          >
            <div
              v-for="card in paymentCardSummaries"
              :key="card.id"
              class="wallet-card-carousel__item"
              :data-wallet-card-id="card.id"
            >
              <WalletBankCard
                :card="card"
                :selected="activePaymentCard?.id === card.id"
                :amount-label="cardAmountLabel(card)"
                :amount-caption="cardAmountCaption(card)"
                @select="selectCard"
              />
            </div>
          </div>

          <div class="wallet-card-stage__footer">
            <span>
              {{
                paymentCardSummaries.findIndex((card) => card.id === activePaymentCard?.id) + 1
              }}
              / {{ paymentCardSummaries.length }}
            </span>
            <span v-if="activePaymentCard?.kind === 'credit'">
              {{ activePaymentCard.supportedCurrencies.length }} {{ t('币种', 'currencies') }} ·
              {{ activePaymentCard.settlementCurrency }} {{ t('账单', 'billing') }}
            </span>
            <span v-else>{{ activePaymentCard?.settlementCurrency }}</span>
          </div>
        </section>

        <nav class="wallet-quick-actions" :aria-label="t('钱包操作', 'Wallet actions')">
          <button type="button" data-testid="wallet-open-transfer" @click="openTransfer">
            <span><i class="fas fa-arrow-up" aria-hidden="true"></i></span>
            {{ t('转账', 'Transfer') }}
          </button>
          <button type="button" data-testid="wallet-open-receive" @click="openReceive">
            <span><i class="fas fa-arrow-down" aria-hidden="true"></i></span>
            {{ t('收款', 'Receive') }}
          </button>
          <button
            type="button"
            data-testid="wallet-open-activity"
            @click="navigateToSection('activity')"
          >
            <span><i class="fas fa-clock-rotate-left" aria-hidden="true"></i></span>
            {{ t('活动', 'Activity') }}
          </button>
          <button type="button" data-testid="wallet-open-cards" @click="navigateToSection('cards')">
            <span><i class="fas fa-credit-card" aria-hidden="true"></i></span>
            {{ t('卡片', 'Cards') }}
          </button>
        </nav>

        <section class="wallet-section" aria-labelledby="wallet-recent-heading">
          <div class="wallet-section-heading">
            <div>
              <p class="wallet-eyebrow">{{ t('最近', 'Latest') }}</p>
              <h2 id="wallet-recent-heading">{{ t('钱包活动', 'Wallet activity') }}</h2>
            </div>
            <button type="button" class="wallet-text-button" @click="navigateToSection('activity')">
              {{ t('全部', 'All') }}
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
          <div v-if="recentTransactions.length" class="wallet-transaction-list" role="list">
            <div
              v-for="item in recentTransactions"
              :key="item.id"
              class="wallet-transaction-row"
              role="listitem"
            >
              <span
                class="wallet-transaction-row__icon"
                :class="{ 'is-expense': item.type === 'expense' }"
              >
                <i :class="transactionIcon(item)" aria-hidden="true"></i>
              </span>
              <span class="wallet-transaction-row__copy">
                <strong>{{ item.title }}</strong>
                <small
                  >{{ item.counterparty || getTransactionSourceLabel(item) }} ·
                  {{ formatTime(item.createdAt) }}</small
                >
              </span>
              <span
                class="wallet-transaction-row__amount"
                :class="{ 'is-expense': item.type === 'expense' }"
              >
                {{ transactionAmountLabel(item) }}
              </span>
            </div>
          </div>
          <div v-else class="wallet-empty-state">
            <i class="fas fa-receipt" aria-hidden="true"></i>
            <p>{{ t('还没有钱包活动', 'No wallet activity yet') }}</p>
          </div>
        </section>
      </template>

      <template v-else-if="activeSection === 'activity'">
        <section class="wallet-page-lead">
          <p class="wallet-eyebrow">{{ transactionCount }} {{ t('条记录', 'records') }}</p>
          <h2>
            {{ t('每一次资金变化都保留原币种', 'Every movement keeps its original currency') }}
          </h2>
        </section>

        <div class="wallet-segmented" role="group" :aria-label="t('活动筛选', 'Activity filter')">
          <button
            v-for="option in sourceFilterOptions"
            :key="option.key"
            type="button"
            :class="{ 'is-active': sourceFilter === option.key }"
            @click="sourceFilter = option.key"
          >
            {{ option.label }} <span>{{ option.count }}</span>
          </button>
        </div>

        <section class="wallet-section wallet-section--activity">
          <div v-if="filteredTransactions.length" class="wallet-transaction-list" role="list">
            <div
              v-for="item in filteredTransactions"
              :key="item.id"
              class="wallet-transaction-row wallet-transaction-row--manage"
              role="listitem"
            >
              <span
                class="wallet-transaction-row__icon"
                :class="{ 'is-expense': item.type === 'expense' }"
              >
                <i :class="transactionIcon(item)" aria-hidden="true"></i>
              </span>
              <span class="wallet-transaction-row__copy">
                <strong>{{ item.title }}</strong>
                <small
                  >{{ item.counterparty || getTransactionSourceLabel(item) }} ·
                  {{ formatTime(item.createdAt) }}</small
                >
                <em>{{ getTransactionSourceLabel(item) }}</em>
              </span>
              <span class="wallet-transaction-row__actions">
                <strong :class="{ 'is-expense': item.type === 'expense' }">{{
                  transactionAmountLabel(item)
                }}</strong>
                <span class="wallet-transaction-row__action-buttons">
                  <button
                    type="button"
                    class="is-detail"
                    :title="t('查看交易详情', 'View transaction details')"
                    :aria-label="t('查看交易详情', 'View transaction details')"
                    :data-testid="`wallet-open-transaction-detail-${item.id}`"
                    @click="openTransactionDetail(item)"
                  >
                    <i class="fas fa-circle-info" aria-hidden="true"></i>
                  </button>
                  <button
                    v-if="isRolePayeeTransfer(item)"
                    type="button"
                    class="is-receipt"
                    :title="t('查看回执', 'View receipt')"
                    :aria-label="t('查看回执', 'View receipt')"
                    :data-testid="`wallet-open-receipt-${item.id}`"
                    @click="openTransferReceipt(item)"
                  >
                    <i class="fas fa-receipt" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    :title="t('删除记录', 'Delete record')"
                    :aria-label="t('删除记录', 'Delete record')"
                    :data-testid="`wallet-remove-transaction-${item.id}`"
                    @click="removeTransaction(item.id)"
                  >
                    <i class="fas fa-trash" aria-hidden="true"></i>
                  </button>
                </span>
              </span>
            </div>
          </div>
          <div v-else class="wallet-empty-state">
            <i class="fas fa-receipt" aria-hidden="true"></i>
            <p>{{ t('这个分类还没有记录', 'No records in this category') }}</p>
          </div>
        </section>
      </template>

      <template v-else-if="activeSection === 'cards'">
        <section class="wallet-page-lead">
          <p class="wallet-eyebrow">{{ paymentCardSummaries.length }} {{ t('张卡片', 'cards') }}</p>
          <h2>{{ t('一个币种，一家主要银行', 'One currency, one primary bank') }}</h2>
        </section>

        <section class="wallet-card-library" aria-label="Cards">
          <article
            v-for="card in paymentCardSummaries"
            :key="card.id"
            class="wallet-card-library__item"
          >
            <WalletBankCard
              :card="card"
              :selected="activePaymentCard?.id === card.id"
              :amount-label="cardAmountLabel(card)"
              :amount-caption="cardAmountCaption(card)"
              @select="openCardDetail($event, 'cards')"
            />
            <div class="wallet-card-library__meta">
              <span>
                {{ card.kind === 'credit' ? t('信用卡', 'Credit') : t('借记卡', 'Debit') }}
              </span>
              <span>
                {{
                  card.kind === 'credit'
                    ? `${card.supportedCurrencies.length} ${t('币种', 'currencies')}`
                    : card.settlementCurrency
                }}
              </span>
              <button type="button" @click="openCardDetail(card.id, 'cards')">
                {{ t('管理', 'Manage') }}
                <i class="fas fa-chevron-right" aria-hidden="true"></i>
              </button>
            </div>
          </article>
        </section>
      </template>

      <template v-else-if="activeSection === 'card-detail' && selectedDetailCard">
        <section class="wallet-detail-card-wrap">
          <WalletBankCard
            :card="selectedDetailCard"
            :interactive="false"
            :amount-label="cardAmountLabel(selectedDetailCard)"
            :amount-caption="cardAmountCaption(selectedDetailCard)"
          />
        </section>

        <section class="wallet-detail-list">
          <div>
            <span>{{ t('发卡银行', 'Issuer') }}</span>
            <strong>{{
              t(
                selectedDetailCard.institution?.nameZh || '',
                selectedDetailCard.institution?.nameEn || '',
              )
            }}</strong>
          </div>
          <div>
            <span>{{ t('地区', 'Region') }}</span>
            <strong>{{
              t(
                selectedDetailCard.institution?.regionZh || '',
                selectedDetailCard.institution?.regionEn || '',
              )
            }}</strong>
          </div>
          <div>
            <span>{{ t('卡片类型', 'Card type') }}</span>
            <strong>{{
              selectedDetailCard.kind === 'credit'
                ? t('多币种信用卡', 'Multi-currency credit')
                : t('借记卡', 'Debit card')
            }}</strong>
          </div>
          <div>
            <span>{{ t('结算币种', 'Settlement') }}</span>
            <strong>{{ selectedDetailCard.settlementCurrency }}</strong>
          </div>
          <div v-if="selectedDetailCard.account">
            <span>{{ t('关联账户', 'Linked account') }}</span>
            <strong
              >{{ t(selectedDetailCard.account.nameZh, selectedDetailCard.account.nameEn) }} ·
              {{ selectedDetailCard.account.accountNumberLast4 }}</strong
            >
          </div>
        </section>

        <section class="wallet-section">
          <div class="wallet-section-heading">
            <div>
              <p class="wallet-eyebrow">{{ t('可用范围', 'Coverage') }}</p>
              <h2>{{ t('支持币种', 'Supported currencies') }}</h2>
            </div>
          </div>
          <div
            class="wallet-currency-tags"
            role="list"
            :aria-label="t('支持币种', 'Supported currencies')"
            data-testid="wallet-supported-currencies"
          >
            <span
              v-for="currency in selectedDetailCard.supportedCurrencies"
              :key="currency"
              role="listitem"
            >
              {{ currency }}
            </span>
          </div>
        </section>

        <section v-if="detailTransactions.length" class="wallet-section">
          <div class="wallet-section-heading">
            <div>
              <p class="wallet-eyebrow">{{ t('最近', 'Latest') }}</p>
              <h2>{{ t('卡片活动', 'Card activity') }}</h2>
            </div>
          </div>
          <div class="wallet-transaction-list" role="list">
            <div
              v-for="item in detailTransactions"
              :key="item.id"
              class="wallet-transaction-row"
              role="listitem"
            >
              <span
                class="wallet-transaction-row__icon"
                :class="{ 'is-expense': item.type === 'expense' }"
              >
                <i :class="transactionIcon(item)" aria-hidden="true"></i>
              </span>
              <span class="wallet-transaction-row__copy">
                <strong>{{ item.title }}</strong>
                <small>{{ formatTime(item.createdAt) }}</small>
              </span>
              <span
                class="wallet-transaction-row__amount"
                :class="{ 'is-expense': item.type === 'expense' }"
              >
                {{ transactionAmountLabel(item) }}
              </span>
            </div>
          </div>
        </section>

        <div class="wallet-detail-actions">
          <button
            v-if="!selectedDetailCard.isDefault"
            type="button"
            data-testid="wallet-set-default-card"
            @click="setDefaultCard"
          >
            <i class="fas fa-star" aria-hidden="true"></i>
            {{ t('设为默认卡', 'Set as default') }}
          </button>
          <button
            type="button"
            class="is-secondary"
            data-testid="wallet-toggle-card-frozen"
            @click="toggleCardFrozen"
          >
            <i
              :class="selectedDetailCard.status === 'frozen' ? 'fas fa-lock-open' : 'fas fa-lock'"
              aria-hidden="true"
            ></i>
            {{
              selectedDetailCard.status === 'frozen'
                ? t('解冻卡片', 'Unfreeze card')
                : t('冻结卡片', 'Freeze card')
            }}
          </button>
        </div>
      </template>

      <template v-else-if="activeSection === 'transaction-detail'">
        <article
          v-if="selectedTransaction"
          class="wallet-transaction-detail"
          data-testid="wallet-transaction-detail"
        >
          <header class="wallet-transaction-detail__summary">
            <span :class="{ 'is-expense': selectedTransaction.type === 'expense' }">
              <i :class="transactionIcon(selectedTransaction)" aria-hidden="true"></i>
            </span>
            <p>{{ getTransactionSourceLabel(selectedTransaction) }}</p>
            <h2>{{ selectedTransaction.title }}</h2>
            <strong
              :class="{ 'is-expense': selectedTransaction.type === 'expense' }"
              data-testid="wallet-transaction-detail-settled-amount"
            >
              {{ transactionAmountLabel(selectedTransaction) }}
            </strong>
            <small>{{ formatDetailTime(selectedTransaction.createdAt) }}</small>
          </header>

          <dl class="wallet-transaction-detail__facts">
            <div>
              <dt>{{ t('交易名称', 'Transaction') }}</dt>
              <dd>{{ selectedTransaction.title }}</dd>
            </div>
            <div>
              <dt>{{ t('交易对象', 'Counterparty') }}</dt>
              <dd>
                {{
                  selectedTransaction.counterparty || getTransactionSourceLabel(selectedTransaction)
                }}
              </dd>
            </div>
            <div>
              <dt>{{ t('交易时间', 'Transaction time') }}</dt>
              <dd>{{ formatDetailTime(selectedTransaction.createdAt) }}</dd>
            </div>
            <div>
              <dt>{{ t('资金方向', 'Direction') }}</dt>
              <dd>{{ getTransactionDirectionLabel(selectedTransaction) }}</dd>
            </div>
            <div>
              <dt>{{ t('记账金额', 'Recorded amount') }}</dt>
              <dd>{{ transactionAmountLabel(selectedTransaction) }}</dd>
            </div>
            <div v-if="selectedTransaction.sourceModule">
              <dt>{{ t('来源', 'Source') }}</dt>
              <dd>{{ getTransactionModuleLabel(selectedTransaction) }}</dd>
            </div>
            <div v-if="selectedTransaction.sourceId">
              <dt>{{ t('来源记录', 'Source record') }}</dt>
              <dd class="is-technical">{{ selectedTransaction.sourceId }}</dd>
            </div>
            <div v-if="selectedTransactionAccount">
              <dt>{{ t('账户', 'Account') }}</dt>
              <dd>
                {{
                  t(
                    selectedTransactionAccount.institution?.nameZh || '',
                    selectedTransactionAccount.institution?.nameEn || '',
                  )
                }}
                · •••• {{ selectedTransactionAccount.accountNumberLast4 }}
              </dd>
            </div>
            <div v-if="selectedTransactionCard">
              <dt>{{ t('卡片', 'Card') }}</dt>
              <dd>
                {{ t(selectedTransactionCard.nameZh, selectedTransactionCard.nameEn) }}
                · {{ selectedTransactionCard.last4 }}
              </dd>
            </div>
            <div v-if="selectedTransaction.note">
              <dt>{{ t('备注', 'Note') }}</dt>
              <dd>{{ selectedTransaction.note }}</dd>
            </div>
          </dl>

          <section
            v-if="selectedTransaction.quoteSnapshot"
            class="wallet-transaction-detail__quote"
            aria-labelledby="wallet-transaction-quote-heading"
          >
            <div class="wallet-transaction-detail__quote-heading">
              <p class="wallet-eyebrow">{{ t('历史结算依据', 'Historical settlement') }}</p>
              <h2 id="wallet-transaction-quote-heading">{{ t('本次报价', 'Recorded quote') }}</h2>
            </div>
            <dl class="wallet-transaction-detail__facts is-quote">
              <div>
                <dt>{{ t('源金额', 'Source amount') }}</dt>
                <dd data-testid="wallet-transaction-detail-source-money">
                  {{ formatHistoricalMoney(selectedTransaction.quoteSnapshot.sourceMoney) }}
                </dd>
              </div>
              <div>
                <dt>{{ t('成交金额', 'Settled quote') }}</dt>
                <dd data-testid="wallet-transaction-detail-quoted-money">
                  {{ formatHistoricalMoney(selectedTransaction.quoteSnapshot.quotedMoney) }}
                </dd>
              </div>
              <div>
                <dt>{{ t('成交汇率', 'Applied rate') }}</dt>
                <dd class="is-technical" data-testid="wallet-transaction-detail-rate">
                  {{ formatRecordedRate(selectedTransaction.quoteSnapshot) }}
                </dd>
              </div>
              <div>
                <dt>{{ t('报价版本', 'Quote version') }}</dt>
                <dd class="is-technical" data-testid="wallet-transaction-detail-rate-set">
                  {{ selectedTransaction.quoteSnapshot.rateSetId }}
                </dd>
              </div>
              <div>
                <dt>{{ t('汇率来源', 'Rate source') }}</dt>
                <dd
                  class="wallet-transaction-detail__rate-source"
                  data-testid="wallet-transaction-detail-rate-source"
                >
                  <span>{{
                    getRateSourceLabel(selectedTransaction.quoteSnapshot.rateSource)
                  }}</span>
                  <small>{{ selectedTransaction.quoteSnapshot.rateSource }}</small>
                </dd>
              </div>
              <div>
                <dt>{{ t('报价时间', 'Quoted at') }}</dt>
                <dd data-testid="wallet-transaction-detail-quoted-at">
                  {{ formatDetailTime(selectedTransaction.quoteSnapshot.quotedAt) }}
                </dd>
              </div>
            </dl>
          </section>

          <section
            v-else
            class="wallet-transaction-detail__legacy"
            data-testid="wallet-transaction-detail-legacy"
          >
            <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>
            <span>{{ t('旧版记录，无报价快照', 'Legacy record, no quote snapshot') }}</span>
          </section>

          <div
            v-if="isRolePayeeTransfer(selectedTransaction)"
            class="wallet-transaction-detail__actions"
          >
            <button type="button" @click="openTransferReceipt(selectedTransaction)">
              <i class="fas fa-receipt" aria-hidden="true"></i>
              {{ t('查看转账回执', 'View transfer receipt') }}
            </button>
          </div>
        </article>

        <section
          v-else
          class="wallet-workflow-unavailable"
          data-testid="wallet-transaction-detail-unavailable"
        >
          <i class="fas fa-circle-info" aria-hidden="true"></i>
          <strong>{{ t('找不到这笔交易', 'Transaction not found') }}</strong>
          <p>
            {{
              t(
                '这笔记录可能已被删除，或链接已经失效。',
                'This record may have been deleted or the link is no longer available.',
              )
            }}
          </p>
          <button
            type="button"
            data-testid="wallet-transaction-detail-return-activity"
            @click="closeTransactionDetail"
          >
            {{ t('查看钱包活动', 'View wallet activity') }}
          </button>
        </section>
      </template>

      <template v-else-if="activeSection === 'payee-transfer'">
        <section class="wallet-page-lead">
          <p class="wallet-eyebrow">
            {{ t('来自 Chat 的收款账户', 'Receiving account from Chat') }}
          </p>
          <h2>{{ t('核对收款账户', 'Review receiving account') }}</h2>
        </section>

        <section
          v-if="payeeTransferContextError"
          class="wallet-workflow-unavailable"
          data-testid="wallet-payee-transfer-unavailable"
        >
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
          <strong>{{ t('无法使用这张账户卡', 'This account card is unavailable') }}</strong>
          <p>{{ payeeTransferErrorMessage(payeeTransferContextError) }}</p>
          <button v-if="workflowChatId" type="button" @click="returnToSourceChat">
            <i class="fas fa-message" aria-hidden="true"></i>
            {{ t('返回 Chat', 'Return to Chat') }}
          </button>
        </section>

        <template v-else-if="selectedPayeeAccount">
          <section class="wallet-payee-identity" data-testid="wallet-payee-account-summary">
            <span class="wallet-payee-identity__icon">
              <i class="fas fa-building-columns" aria-hidden="true"></i>
            </span>
            <span class="wallet-payee-identity__copy">
              <small>{{ t('收款人', 'Recipient') }}</small>
              <strong>{{ selectedPayeeAccount.ownerName }}</strong>
              <em>
                {{
                  t(
                    selectedPayeeAccount.institution?.nameZh || '',
                    selectedPayeeAccount.institution?.nameEn || '',
                  )
                }}
                · {{ selectedPayeeAccount.maskedAccountNumber }}
              </em>
            </span>
            <span class="wallet-payee-identity__verified">
              <i class="fas fa-shield-check" aria-hidden="true"></i>
              {{ t('已验证', 'Verified') }}
            </span>
          </section>

          <form
            class="wallet-form wallet-payee-transfer-form"
            data-testid="wallet-payee-transfer-form"
            @submit.prevent="submitPayeeTransfer"
          >
            <label>
              <span>{{ t('付款账户', 'Payment account') }}</span>
              <select
                v-model="payeeTransferDraft.accountId"
                data-testid="wallet-payee-payment-account"
              >
                <option
                  v-for="account in payeeTransferAccounts"
                  :key="account.id"
                  :value="account.id"
                >
                  {{ t(account.institution?.nameZh || '', account.institution?.nameEn || '') }}
                  · {{ accountBalanceForCurrency(account, selectedPayeeAccount.currency).amount }}
                  {{ selectedPayeeAccount.currency }}
                </option>
              </select>
            </label>

            <div
              class="wallet-payee-payment-card"
              :class="{ 'is-unavailable': !selectedPayeeTransferCard }"
            >
              <span><i class="fas fa-credit-card" aria-hidden="true"></i></span>
              <p v-if="selectedPayeeTransferCard">
                <small>{{ t('付款卡', 'Payment card') }}</small>
                <strong>
                  {{ t(selectedPayeeTransferCard.nameZh, selectedPayeeTransferCard.nameEn) }}
                  · {{ selectedPayeeTransferCard.last4 }}
                </strong>
              </p>
              <p v-else>
                <small>{{ t('付款卡', 'Payment card') }}</small>
                <strong>{{ t('没有可用借记卡', 'No available debit card') }}</strong>
              </p>
            </div>

            <div class="wallet-form__amount">
              <label>
                <span>{{ t('金额', 'Amount') }}</span>
                <input
                  v-model="payeeTransferDraft.amount"
                  inputmode="decimal"
                  autocomplete="off"
                  data-testid="wallet-payee-transfer-amount"
                  placeholder="0.00"
                />
              </label>
              <label>
                <span>{{ t('币种', 'Currency') }}</span>
                <input
                  :value="selectedPayeeAccount.currency"
                  disabled
                  data-testid="wallet-payee-transfer-currency"
                />
              </label>
            </div>

            <label>
              <span>{{ t('备注', 'Note') }}</span>
              <input
                v-model="payeeTransferDraft.note"
                maxlength="240"
                :placeholder="t('可选', 'Optional')"
                data-testid="wallet-payee-transfer-note"
              />
            </label>

            <p class="wallet-payee-transfer-policy">
              <i class="fas fa-circle-info" aria-hidden="true"></i>
              {{
                t(
                  `仅从 ${selectedPayeeAccount.currency} 账户转出，不会自动换汇。`,
                  `Sent only from a ${selectedPayeeAccount.currency} account; no automatic currency conversion.`,
                )
              }}
            </p>

            <button
              type="submit"
              class="wallet-primary-action"
              :disabled="!canSubmitPayeeTransfer"
              data-testid="wallet-confirm-payee-transfer"
            >
              <i class="fas fa-shield-check" aria-hidden="true"></i>
              {{
                payeeTransferSubmitting
                  ? t('处理中', 'Processing')
                  : t('确认并转账', 'Confirm and transfer')
              }}
            </button>
          </form>
        </template>
      </template>

      <template v-else-if="activeSection === 'receipt'">
        <article
          v-if="selectedReceipt"
          class="wallet-receipt"
          data-testid="wallet-transfer-receipt"
        >
          <header class="wallet-receipt__status">
            <span><i class="fas fa-check" aria-hidden="true"></i></span>
            <p>{{ t('转账成功', 'Transfer complete') }}</p>
            <strong
              >{{ (selectedReceipt.amountCents / 100).toFixed(2) }}
              {{ selectedReceipt.currency }}</strong
            >
            <small>{{ formatTime(selectedReceipt.createdAt) }}</small>
          </header>

          <section class="wallet-receipt__details">
            <div>
              <span>{{ t('收款人', 'Recipient') }}</span>
              <strong>{{ selectedReceipt.counterparty }}</strong>
            </div>
            <div>
              <span>{{ t('收款银行', 'Receiving bank') }}</span>
              <strong>{{
                t(receiptInstitution?.nameZh || '', receiptInstitution?.nameEn || '')
              }}</strong>
            </div>
            <div>
              <span>{{ t('收款账户', 'Receiving account') }}</span>
              <strong>•••• {{ selectedReceipt.recipientAccountLast4 }}</strong>
            </div>
            <div>
              <span>{{ t('付款账户', 'Payment account') }}</span>
              <strong>
                {{
                  t(
                    receiptPaymentAccount?.institution?.nameZh || '',
                    receiptPaymentAccount?.institution?.nameEn || '',
                  )
                }}
                · {{ receiptPaymentAccount?.accountNumberLast4 || '' }}
              </strong>
            </div>
            <div>
              <span>{{ t('付款卡', 'Payment card') }}</span>
              <strong>
                {{
                  receiptPaymentCard ? t(receiptPaymentCard.nameZh, receiptPaymentCard.nameEn) : ''
                }}
                <template v-if="receiptPaymentCard"> · {{ receiptPaymentCard.last4 }}</template>
              </strong>
            </div>
            <div v-if="selectedReceipt.note">
              <span>{{ t('备注', 'Note') }}</span>
              <strong>{{ selectedReceipt.note }}</strong>
            </div>
            <div>
              <span>{{ t('状态', 'Status') }}</span>
              <strong>{{ t('已完成', 'Completed') }}</strong>
            </div>
            <div>
              <span>{{ t('回执编号', 'Receipt number') }}</span>
              <strong data-testid="wallet-receipt-number">{{
                selectedReceipt.receiptNumber
              }}</strong>
            </div>
          </section>

          <div class="wallet-receipt__actions">
            <button
              v-if="workflowChatId"
              type="button"
              data-testid="wallet-receipt-return-chat"
              @click="returnToSourceChat"
            >
              <i class="fas fa-message" aria-hidden="true"></i>
              {{ t('返回 Chat', 'Return to Chat') }}
            </button>
            <button
              type="button"
              class="is-secondary"
              data-testid="wallet-receipt-open-activity"
              @click="closeWalletWorkflow('activity')"
            >
              {{ t('查看钱包活动', 'View wallet activity') }}
            </button>
          </div>
        </article>

        <section
          v-else
          class="wallet-workflow-unavailable"
          data-testid="wallet-receipt-unavailable"
        >
          <i class="fas fa-receipt" aria-hidden="true"></i>
          <strong>{{ t('找不到这张回执', 'Receipt not found') }}</strong>
          <p>{{ t('这笔记录可能已被删除。', 'This transaction may have been deleted.') }}</p>
          <button type="button" @click="closeWalletWorkflow('activity')">
            {{ t('查看钱包活动', 'View wallet activity') }}
          </button>
        </section>
      </template>

      <template v-else-if="activeSection === 'transfer'">
        <section class="wallet-page-lead">
          <p class="wallet-eyebrow">{{ t('账户间保留原币种', 'Original currency retained') }}</p>
          <h2>
            {{
              transferDraft.direction === 'outgoing'
                ? t('向联系人转账', 'Send to a contact')
                : t('记录一笔收款', 'Record a payment received')
            }}
          </h2>
        </section>

        <div
          class="wallet-segmented wallet-segmented--two"
          role="group"
          :aria-label="t('转账方向', 'Transfer direction')"
        >
          <button
            type="button"
            :class="{ 'is-active': transferDraft.direction === 'outgoing' }"
            data-testid="wallet-transfer-outgoing"
            @click="transferDraft.direction = 'outgoing'"
          >
            {{ t('转出', 'Send') }}
          </button>
          <button
            type="button"
            :class="{ 'is-active': transferDraft.direction === 'incoming' }"
            data-testid="wallet-transfer-incoming"
            @click="transferDraft.direction = 'incoming'"
          >
            {{ t('收款', 'Receive') }}
          </button>
        </div>

        <form
          class="wallet-form"
          data-testid="wallet-transfer-form"
          @submit.prevent="submitTransfer"
        >
          <label>
            <span>{{ t('账户', 'Account') }}</span>
            <select v-model="transferDraft.accountId" data-testid="wallet-transfer-account">
              <option v-for="account in bankAccountSummaries" :key="account.id" :value="account.id">
                {{ t(account.institution?.nameZh || '', account.institution?.nameEn || '') }} ·
                {{ account.primaryCurrency }} · {{ account.primaryBalance?.amount || '0.00' }}
              </option>
            </select>
          </label>
          <label>
            <span>{{ t('联系人', 'Contact') }}</span>
            <select v-model="transferDraft.contactId" data-testid="wallet-relationship-contact">
              <option value="">{{ t('其他对象', 'Other recipient') }}</option>
              <option
                v-for="contact in relationshipContactOptions"
                :key="contact.id"
                :value="contact.optionValue"
              >
                {{ contact.optionLabel }}
              </option>
            </select>
          </label>
          <div class="wallet-form__amount">
            <label>
              <span>{{ t('金额', 'Amount') }}</span>
              <input
                v-model="transferDraft.amount"
                inputmode="decimal"
                data-testid="wallet-transfer-amount"
                placeholder="0.00"
              />
            </label>
            <label>
              <span>{{ t('币种', 'Currency') }}</span>
              <select
                v-model="transferDraft.currency"
                disabled
                data-testid="wallet-transfer-currency"
              >
                <option :value="transferDraft.currency">{{ transferDraft.currency }}</option>
              </select>
            </label>
          </div>
          <label>
            <span>{{ t('对象', 'Recipient') }}</span>
            <input
              v-model="transferDraft.counterparty"
              :disabled="Boolean(selectedRelationshipContact)"
              data-testid="wallet-transfer-counterparty"
              :placeholder="t('姓名或商户', 'Name or merchant')"
            />
          </label>
          <label>
            <span>{{ t('备注', 'Note') }}</span>
            <input v-model="transferDraft.note" :placeholder="t('可选', 'Optional')" />
          </label>
          <button type="submit" class="wallet-primary-action" data-testid="wallet-submit-transfer">
            {{
              transferDraft.direction === 'outgoing'
                ? t('确认转账', 'Confirm transfer')
                : t('确认收款', 'Confirm receipt')
            }}
          </button>
        </form>
      </template>

      <template v-else-if="activeSection === 'receive'">
        <section class="wallet-page-lead">
          <p class="wallet-eyebrow">{{ t('收款账户', 'Receiving account') }}</p>
          <h2>{{ t('选择资金进入的银行卡', 'Choose the destination account') }}</h2>
        </section>

        <label class="wallet-account-picker">
          <span>{{ t('账户', 'Account') }}</span>
          <select v-model="receiveAccountId" data-testid="wallet-receive-account">
            <option v-for="account in bankAccountSummaries" :key="account.id" :value="account.id">
              {{ t(account.institution?.nameZh || '', account.institution?.nameEn || '') }} ·
              {{ account.primaryCurrency }}
            </option>
          </select>
        </label>

        <section v-if="receiveCard" class="wallet-detail-card-wrap">
          <WalletBankCard
            :card="receiveCard"
            :interactive="false"
            :amount-label="cardAmountLabel(receiveCard)"
            :amount-caption="cardAmountCaption(receiveCard)"
          />
        </section>

        <section v-if="selectedReceiveAccount" class="wallet-receive-details">
          <p>
            {{
              t(
                selectedReceiveAccount.institution?.nameZh || '',
                selectedReceiveAccount.institution?.nameEn || '',
              )
            }}
          </p>
          <strong>{{ selectedReceiveAccount.accountNumber }}</strong>
          <span
            >{{ t(selectedReceiveAccount.nameZh, selectedReceiveAccount.nameEn) }} ·
            {{ selectedReceiveAccount.primaryCurrency }}</span
          >
        </section>

        <button
          v-if="receiveCard"
          type="button"
          class="wallet-primary-action"
          data-testid="wallet-use-receive-card"
          @click="useReceiveCard"
        >
          {{ t('设为当前卡', 'Use this card') }}
        </button>
      </template>

      <template v-else-if="activeSection === 'settings'">
        <section class="wallet-settings-band">
          <div class="wallet-section-heading">
            <div>
              <p class="wallet-eyebrow">{{ t('显示', 'Display') }}</p>
              <h2>{{ t('显示币种', 'Display currency') }}</h2>
            </div>
          </div>
          <div class="wallet-setting-control">
            <select v-model="primaryCurrencyDraft" data-testid="wallet-primary-currency">
              <option
                v-for="currency in currencyOptions"
                :key="currency.code"
                :value="currency.code"
              >
                {{ currency.code }} ·
                {{ t(currency.labelZh || currency.code, currency.labelEn || currency.code) }}
              </option>
            </select>
            <button
              type="button"
              data-testid="wallet-save-primary-currency"
              @click="savePrimaryCurrency"
            >
              {{ t('保存', 'Save') }}
            </button>
          </div>
        </section>

        <section class="wallet-settings-band">
          <button
            type="button"
            class="wallet-settings-disclosure"
            data-testid="wallet-toggle-rate-settings"
            :aria-expanded="ratesExpanded"
            @click="ratesExpanded = !ratesExpanded"
          >
            <span>
              <small>{{ t('货币与地区', 'Currency & region') }}</small>
              <strong>{{ t('参考汇率', 'Reference rates') }}</strong>
            </span>
            <span>{{ exchangeRates.reference?.base }}/{{ exchangeRates.reference?.quote }}</span>
            <i
              :class="ratesExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
              aria-hidden="true"
            ></i>
          </button>

          <div v-if="ratesExpanded" class="wallet-rate-settings">
            <div class="wallet-rate-reference">
              <label>
                <span>{{ t('1 USD 等于 CNY', '1 USD equals CNY') }}</span>
                <input
                  :value="usdCnyDraft"
                  inputmode="decimal"
                  data-testid="wallet-usd-cny-rate"
                  @input="usdCnyDraft = $event.target.value"
                />
              </label>
              <button type="button" data-testid="wallet-save-usd-cny-rate" @click="saveUsdCnyRate">
                {{ t('更新', 'Update') }}
              </button>
            </div>

            <div class="wallet-rate-list">
              <div
                v-for="row in exchangeRateRows"
                :key="row.code"
                class="wallet-rate-row"
                :data-testid="`wallet-rate-row-${row.code}`"
              >
                <span>
                  <strong>{{ row.code }}</strong>
                  <small>{{ t(row.labelZh || row.code, row.labelEn || row.code) }}</small>
                </span>
                <input
                  :value="rateDraftValue(row.code)"
                  :disabled="row.code === 'CNY'"
                  inputmode="decimal"
                  :data-testid="`wallet-cny-rate-${row.code}`"
                  @input="updateRateDraft(row.code, $event.target.value)"
                />
                <button
                  type="button"
                  :disabled="row.code === 'CNY'"
                  :title="t('更新汇率', 'Update rate')"
                  :aria-label="`${t('更新汇率', 'Update rate')} ${row.code}`"
                  :data-testid="`wallet-save-cny-rate-${row.code}`"
                  @click="saveCurrencyRate(row.code)"
                >
                  <i class="fas fa-check" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </div>
        </section>
      </template>
    </main>

    <nav
      v-if="showBottomNavigation"
      class="wallet-bottom-nav"
      :aria-label="t('钱包导航', 'Wallet navigation')"
    >
      <button
        type="button"
        :class="{ 'is-active': activeSection === 'home' }"
        data-testid="wallet-nav-home"
        @click="navigateToSection('home')"
      >
        <i class="fas fa-wallet" aria-hidden="true"></i>
        <span>{{ t('钱包', 'Wallet') }}</span>
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeSection === 'activity' }"
        data-testid="wallet-nav-activity"
        @click="navigateToSection('activity')"
      >
        <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>
        <span>{{ t('活动', 'Activity') }}</span>
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeSection === 'cards' }"
        data-testid="wallet-nav-cards"
        @click="navigateToSection('cards')"
      >
        <i class="fas fa-credit-card" aria-hidden="true"></i>
        <span>{{ t('卡片', 'Cards') }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.wallet-app {
  --wallet-ink: #191c20;
  --wallet-muted: #697078;
  --wallet-line: rgba(25, 28, 32, 0.1);
  --wallet-surface: #ffffff;
  --wallet-canvas: #f2f5f4;
  --wallet-accent: #d3443f;
  --wallet-positive: #19725a;
  display: flex;
  position: relative;
  width: 100%;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  color: var(--wallet-ink);
  background: var(--wallet-canvas);
}

.wallet-header {
  position: relative;
  z-index: 20;
  display: grid;
  min-height: 5.25rem;
  flex: none;
  grid-template-columns: minmax(4.25rem, 1fr) auto minmax(4.25rem, 1fr);
  align-items: end;
  gap: 0.5rem;
  border-bottom: 1px solid var(--wallet-line);
  padding: 2.75rem 1rem 0.75rem;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(18px);
}

.wallet-header h1 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0;
}

.wallet-header__back,
.wallet-icon-button {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  border: 0;
  padding: 0;
  color: var(--wallet-ink);
  background: transparent;
}

.wallet-header__back {
  justify-self: start;
  gap: 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.wallet-icon-button {
  width: 2rem;
  justify-content: center;
  justify-self: end;
  border-radius: 50%;
  font-size: 0.9rem;
}

.wallet-icon-button:focus-visible,
.wallet-header__back:focus-visible,
.wallet-text-button:focus-visible,
.wallet-bottom-nav button:focus-visible,
.wallet-quick-actions button:focus-visible {
  outline: 3px solid rgba(33, 133, 189, 0.28);
  outline-offset: 2px;
}

.wallet-header__spacer {
  width: 2rem;
  justify-self: end;
}

.wallet-content {
  min-height: 0;
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1.25rem 0 2rem;
}

.wallet-content.has-bottom-nav {
  padding-bottom: 5.5rem;
}

.wallet-feedback {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0 1rem 1rem;
  border: 1px solid rgba(25, 114, 90, 0.18);
  border-radius: 6px;
  padding: 0.7rem 0.8rem;
  color: #145a48;
  background: #e9f4ef;
  font-size: 0.75rem;
  font-weight: 700;
}

.wallet-feedback.is-warning {
  border-color: rgba(159, 91, 22, 0.22);
  color: #8b4c12;
  background: #fff3dd;
}

.wallet-card-stage {
  padding: 0 0 0.25rem;
}

.wallet-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.wallet-section-heading--stage {
  padding: 0 1rem;
}

.wallet-section-heading h2,
.wallet-page-lead h2 {
  margin: 0.1rem 0 0;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0;
}

.wallet-eyebrow {
  margin: 0;
  color: var(--wallet-muted);
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
}

.wallet-text-button {
  display: inline-flex;
  min-height: 2rem;
  flex: none;
  align-items: center;
  gap: 0.35rem;
  border: 0;
  padding: 0 0.2rem;
  color: var(--wallet-muted);
  background: transparent;
  font-size: 0.72rem;
  font-weight: 700;
}

.wallet-card-carousel {
  display: flex;
  gap: 0.85rem;
  overflow-x: auto;
  padding: 0.35rem 1rem 0.65rem;
  scroll-padding-inline: 1rem;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.wallet-card-carousel::-webkit-scrollbar {
  display: none;
}

.wallet-card-carousel__item {
  width: min(82vw, 21rem);
  max-width: calc(100% - 1.65rem);
  flex: 0 0 min(82vw, 21rem);
  scroll-snap-align: center;
}

.wallet-card-stage__footer {
  display: flex;
  min-height: 1.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1rem;
  color: var(--wallet-muted);
  font-size: 0.65rem;
  font-weight: 700;
}

.wallet-quick-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.35rem;
  margin: 1.1rem 0 0;
  border-top: 1px solid var(--wallet-line);
  border-bottom: 1px solid var(--wallet-line);
  padding: 0.9rem 0.75rem;
  background: var(--wallet-surface);
}

.wallet-quick-actions button {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 0.42rem;
  border: 0;
  padding: 0.15rem;
  color: var(--wallet-ink);
  background: transparent;
  font-size: 0.67rem;
  font-weight: 700;
}

.wallet-quick-actions button > span {
  display: inline-flex;
  width: 2.55rem;
  height: 2.55rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--wallet-line);
  border-radius: 50%;
  color: #22272c;
  background: #f4f6f6;
  font-size: 0.82rem;
}

.wallet-section {
  margin-top: 1.3rem;
  border-top: 1px solid var(--wallet-line);
  border-bottom: 1px solid var(--wallet-line);
  padding: 1rem;
  background: var(--wallet-surface);
}

.wallet-section--activity {
  margin-top: 1rem;
}

.wallet-transaction-list {
  border-top: 1px solid var(--wallet-line);
}

.wallet-transaction-row {
  display: grid;
  min-height: 4.25rem;
  grid-template-columns: 2.25rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid var(--wallet-line);
  padding: 0.7rem 0;
}

.wallet-transaction-row:last-child {
  border-bottom: 0;
}

.wallet-transaction-row__icon {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--wallet-positive);
  background: #e8f3ef;
  font-size: 0.75rem;
}

.wallet-transaction-row__icon.is-expense {
  color: #a63835;
  background: #f9e9e7;
}

.wallet-transaction-row__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.18rem;
}

.wallet-transaction-row__copy strong {
  overflow: hidden;
  font-size: 0.78rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-transaction-row__copy small {
  overflow: hidden;
  color: var(--wallet-muted);
  font-size: 0.64rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-transaction-row__copy em {
  width: fit-content;
  color: #5f676f;
  font-size: 0.6rem;
  font-style: normal;
  font-weight: 700;
}

.wallet-transaction-row__amount,
.wallet-transaction-row__actions > strong {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--wallet-positive);
  white-space: nowrap;
}

.wallet-transaction-row__amount.is-expense,
.wallet-transaction-row__actions > strong.is-expense {
  color: #9c3532;
}

.wallet-transaction-row--manage {
  grid-template-columns: 2.25rem minmax(0, 1fr) minmax(5rem, auto);
}

.wallet-transaction-row__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
}

.wallet-transaction-row__action-buttons {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.wallet-transaction-row__actions button {
  display: inline-flex;
  width: 1.8rem;
  height: 1.8rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  color: #a63835;
  background: #f9e9e7;
  font-size: 0.65rem;
}

.wallet-transaction-row__actions button.is-receipt {
  color: #17634f;
  background: #e7f3ee;
}

.wallet-transaction-row__actions button.is-detail {
  color: #39434c;
  background: #edf0f1;
}

.wallet-transaction-row__actions button:focus-visible,
.wallet-transaction-detail__actions button:focus-visible {
  outline: 3px solid rgba(33, 133, 189, 0.28);
  outline-offset: 2px;
}

.wallet-empty-state {
  display: flex;
  min-height: 7rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  color: var(--wallet-muted);
}

.wallet-empty-state i {
  font-size: 1.35rem;
}

.wallet-empty-state p {
  margin: 0;
  font-size: 0.75rem;
}

.wallet-page-lead {
  padding: 0.35rem 1rem 1rem;
}

.wallet-page-lead h2 {
  max-width: 22rem;
  font-size: 1.25rem;
  line-height: 1.35;
}

.wallet-segmented {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin: 0 1rem;
  overflow: hidden;
  border: 1px solid var(--wallet-line);
  border-radius: 7px;
  background: #e8eceb;
}

.wallet-segmented--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wallet-segmented button {
  min-height: 2.35rem;
  border: 0;
  border-right: 1px solid var(--wallet-line);
  padding: 0 0.3rem;
  color: #626a71;
  background: transparent;
  font-size: 0.66rem;
  font-weight: 750;
}

.wallet-segmented button:last-child {
  border-right: 0;
}

.wallet-segmented button.is-active {
  color: #ffffff;
  background: #24282d;
}

.wallet-segmented button span {
  opacity: 0.66;
}

.wallet-card-library {
  display: grid;
  gap: 1.35rem;
  padding: 0 1rem 1rem;
}

.wallet-card-library__item {
  min-width: 0;
}

.wallet-card-library__meta {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 0.45rem;
  padding: 0.65rem 0.1rem 0;
  color: var(--wallet-muted);
  font-size: 0.64rem;
  font-weight: 700;
}

.wallet-card-library__meta button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  justify-self: end;
  border: 0;
  padding: 0.25rem 0;
  color: var(--wallet-ink);
  background: transparent;
  font-size: 0.68rem;
  font-weight: 800;
}

.wallet-detail-card-wrap {
  width: min(100% - 2rem, 23rem);
  margin: 0 auto 1.15rem;
}

.wallet-detail-list,
.wallet-receive-details,
.wallet-settings-band {
  border-top: 1px solid var(--wallet-line);
  border-bottom: 1px solid var(--wallet-line);
  background: var(--wallet-surface);
}

.wallet-detail-list > div {
  display: grid;
  min-height: 3.35rem;
  grid-template-columns: minmax(6.2rem, 0.8fr) minmax(0, 1.4fr);
  align-items: center;
  gap: 1rem;
  margin-left: 1rem;
  border-bottom: 1px solid var(--wallet-line);
  padding: 0.65rem 1rem 0.65rem 0;
}

.wallet-detail-list > div:last-child {
  border-bottom: 0;
}

.wallet-detail-list span {
  color: var(--wallet-muted);
  font-size: 0.68rem;
}

.wallet-detail-list strong {
  overflow-wrap: anywhere;
  text-align: right;
  font-size: 0.72rem;
}

.wallet-currency-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.wallet-currency-tags span {
  display: inline-flex;
  min-width: 3.25rem;
  height: 1.8rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--wallet-line);
  border-radius: 5px;
  color: #41484f;
  background: #f1f4f3;
  font-size: 0.66rem;
  font-weight: 800;
}

.wallet-detail-actions {
  display: grid;
  gap: 0.7rem;
  padding: 1.25rem 1rem 0;
}

.wallet-detail-actions button,
.wallet-primary-action {
  display: inline-flex;
  width: 100%;
  min-height: 2.85rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid #202429;
  border-radius: 7px;
  padding: 0 1rem;
  color: #ffffff;
  background: #202429;
  font-size: 0.75rem;
  font-weight: 800;
}

.wallet-detail-actions button.is-secondary {
  color: #202429;
  background: #ffffff;
}

.wallet-primary-action:disabled {
  border-color: #c8cecb;
  color: #8a9198;
  background: #e5e9e7;
  cursor: not-allowed;
}

.wallet-form {
  display: grid;
  gap: 0.9rem;
  border-top: 1px solid var(--wallet-line);
  border-bottom: 1px solid var(--wallet-line);
  padding: 1rem;
  background: var(--wallet-surface);
}

.wallet-transaction-detail {
  padding-bottom: 1.5rem;
}

.wallet-transaction-detail__summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 1rem 1.35rem;
  text-align: center;
}

.wallet-transaction-detail__summary > span {
  display: inline-flex;
  width: 3rem;
  height: 3rem;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--wallet-positive);
  background: #e8f3ef;
  font-size: 1rem;
}

.wallet-transaction-detail__summary > span.is-expense {
  color: #a63835;
  background: #f9e9e7;
}

.wallet-transaction-detail__summary p {
  margin: 0.75rem 0 0.2rem;
  color: var(--wallet-muted);
  font-size: 0.65rem;
  font-weight: 750;
}

.wallet-transaction-detail__summary h2 {
  max-width: 100%;
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 0.96rem;
  font-weight: 800;
  letter-spacing: 0;
}

.wallet-transaction-detail__summary strong {
  margin-top: 0.45rem;
  color: var(--wallet-positive);
  font-size: 1.45rem;
  line-height: 1.2;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.wallet-transaction-detail__summary strong.is-expense {
  color: #9c3532;
}

.wallet-transaction-detail__summary small {
  margin-top: 0.35rem;
  color: var(--wallet-muted);
  font-size: 0.64rem;
}

.wallet-transaction-detail__facts {
  margin: 0;
  border-top: 1px solid var(--wallet-line);
  border-bottom: 1px solid var(--wallet-line);
  background: var(--wallet-surface);
}

.wallet-transaction-detail__facts > div {
  display: grid;
  min-height: 3.2rem;
  grid-template-columns: minmax(5.5rem, 0.72fr) minmax(0, 1.45fr);
  align-items: center;
  gap: 1rem;
  margin-left: 1rem;
  border-bottom: 1px solid var(--wallet-line);
  padding: 0.65rem 1rem 0.65rem 0;
}

.wallet-transaction-detail__facts > div:last-child {
  border-bottom: 0;
}

.wallet-transaction-detail__facts dt {
  color: var(--wallet-muted);
  font-size: 0.66rem;
}

.wallet-transaction-detail__facts dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  text-align: right;
  font-size: 0.69rem;
  font-weight: 750;
}

.wallet-transaction-detail__facts dd.is-technical {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.63rem;
  font-weight: 650;
}

.wallet-transaction-detail__quote {
  margin-top: 1rem;
}

.wallet-transaction-detail__quote-heading {
  padding: 0 1rem 0.75rem;
}

.wallet-transaction-detail__quote-heading h2 {
  margin: 0.12rem 0 0;
  font-size: 0.94rem;
  font-weight: 800;
  letter-spacing: 0;
}

.wallet-transaction-detail__facts.is-quote {
  border-bottom-color: rgba(25, 114, 90, 0.18);
}

.wallet-transaction-detail__rate-source {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
}

.wallet-transaction-detail__rate-source small {
  color: var(--wallet-muted);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.56rem;
  font-weight: 600;
}

.wallet-transaction-detail__legacy {
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  gap: 0.65rem;
  margin-top: 1rem;
  border-top: 1px solid var(--wallet-line);
  border-bottom: 1px solid var(--wallet-line);
  padding: 0.8rem 1rem;
  color: #68552f;
  background: #fff8e9;
  font-size: 0.7rem;
  font-weight: 750;
}

.wallet-transaction-detail__legacy i {
  color: #9a6b19;
}

.wallet-transaction-detail__actions {
  padding: 1.1rem 1rem 0;
}

.wallet-transaction-detail__actions button {
  display: inline-flex;
  width: 100%;
  min-height: 2.7rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid #202429;
  border-radius: 7px;
  padding: 0 1rem;
  color: #ffffff;
  background: #202429;
  font-size: 0.72rem;
  font-weight: 800;
}

.wallet-payee-identity {
  display: grid;
  grid-template-columns: 2.65rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  border-top: 1px solid var(--wallet-line);
  border-bottom: 1px solid var(--wallet-line);
  padding: 1rem;
  background: var(--wallet-surface);
}

.wallet-payee-identity__icon {
  display: inline-flex;
  width: 2.65rem;
  height: 2.65rem;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #17634f;
  background: #e7f3ee;
  font-size: 0.85rem;
}

.wallet-payee-identity__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.15rem;
}

.wallet-payee-identity__copy small,
.wallet-payee-payment-card small {
  color: var(--wallet-muted);
  font-size: 0.62rem;
  font-style: normal;
  font-weight: 700;
}

.wallet-payee-identity__copy strong {
  overflow: hidden;
  font-size: 0.86rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-payee-identity__copy em {
  overflow-wrap: anywhere;
  color: var(--wallet-muted);
  font-size: 0.65rem;
  font-style: normal;
}

.wallet-payee-identity__verified {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 5px;
  padding: 0.35rem 0.45rem;
  color: #17634f;
  background: #e7f3ee;
  font-size: 0.6rem;
  font-weight: 800;
  white-space: nowrap;
}

.wallet-payee-transfer-form {
  margin-top: 1rem;
}

.wallet-payee-payment-card {
  display: grid;
  min-height: 3.4rem;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  align-items: center;
  gap: 0.7rem;
  border: 1px solid var(--wallet-line);
  border-radius: 6px;
  padding: 0.55rem 0.7rem;
  background: #f4f6f5;
}

.wallet-payee-payment-card > span {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #17634f;
  background: #e1efe9;
  font-size: 0.72rem;
}

.wallet-payee-payment-card p {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.12rem;
  margin: 0;
}

.wallet-payee-payment-card strong {
  overflow: hidden;
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-payee-payment-card.is-unavailable {
  color: #8b4c12;
  background: #fff3dd;
}

.wallet-payee-payment-card.is-unavailable > span {
  color: #8b4c12;
  background: #f8e5c3;
}

.wallet-payee-transfer-policy {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  margin: 0;
  color: var(--wallet-muted);
  font-size: 0.64rem;
  line-height: 1.5;
}

.wallet-payee-transfer-policy i {
  margin-top: 0.16rem;
  color: #26745f;
}

.wallet-workflow-unavailable {
  display: flex;
  min-height: 15rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  border-top: 1px solid var(--wallet-line);
  border-bottom: 1px solid var(--wallet-line);
  padding: 2rem 1.25rem;
  text-align: center;
  background: var(--wallet-surface);
}

.wallet-workflow-unavailable > i {
  color: #8b4c12;
  font-size: 1.6rem;
}

.wallet-workflow-unavailable strong {
  font-size: 0.9rem;
}

.wallet-workflow-unavailable p {
  max-width: 22rem;
  margin: 0;
  color: var(--wallet-muted);
  font-size: 0.7rem;
  line-height: 1.55;
}

.wallet-workflow-unavailable button,
.wallet-receipt__actions button {
  display: inline-flex;
  min-height: 2.6rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid #202429;
  border-radius: 7px;
  padding: 0 1rem;
  color: #ffffff;
  background: #202429;
  font-size: 0.72rem;
  font-weight: 800;
}

.wallet-receipt {
  padding-bottom: 1.5rem;
}

.wallet-receipt__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.75rem 1rem 1.5rem;
  text-align: center;
}

.wallet-receipt__status > span {
  display: inline-flex;
  width: 3.25rem;
  height: 3.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #ffffff;
  background: #19725a;
  font-size: 1.15rem;
}

.wallet-receipt__status p {
  margin: 0.8rem 0 0.3rem;
  color: #19725a;
  font-size: 0.72rem;
  font-weight: 800;
}

.wallet-receipt__status strong {
  font-size: 1.65rem;
  letter-spacing: 0;
}

.wallet-receipt__status small {
  margin-top: 0.35rem;
  color: var(--wallet-muted);
  font-size: 0.65rem;
}

.wallet-receipt__details {
  border-top: 1px solid var(--wallet-line);
  border-bottom: 1px solid var(--wallet-line);
  background: var(--wallet-surface);
}

.wallet-receipt__details > div {
  display: grid;
  min-height: 3.25rem;
  grid-template-columns: minmax(5.5rem, 0.75fr) minmax(0, 1.4fr);
  align-items: center;
  gap: 1rem;
  margin-left: 1rem;
  border-bottom: 1px solid var(--wallet-line);
  padding: 0.65rem 1rem 0.65rem 0;
}

.wallet-receipt__details > div:last-child {
  border-bottom: 0;
}

.wallet-receipt__details span {
  color: var(--wallet-muted);
  font-size: 0.66rem;
}

.wallet-receipt__details strong {
  overflow-wrap: anywhere;
  text-align: right;
  font-size: 0.69rem;
}

.wallet-receipt__actions {
  display: grid;
  gap: 0.7rem;
  padding: 1.2rem 1rem 0;
}

.wallet-receipt__actions button {
  width: 100%;
}

.wallet-receipt__actions button.is-secondary {
  color: #202429;
  background: #ffffff;
}

.wallet-form label,
.wallet-account-picker,
.wallet-rate-reference label {
  display: grid;
  gap: 0.4rem;
  min-width: 0;
}

.wallet-form label > span,
.wallet-account-picker > span,
.wallet-rate-reference label > span {
  color: var(--wallet-muted);
  font-size: 0.65rem;
  font-weight: 750;
}

.wallet-form input,
.wallet-form select,
.wallet-account-picker select,
.wallet-setting-control select,
.wallet-rate-reference input,
.wallet-rate-row input {
  width: 100%;
  min-height: 2.7rem;
  border: 1px solid rgba(25, 28, 32, 0.16);
  border-radius: 6px;
  padding: 0 0.75rem;
  color: var(--wallet-ink);
  background: #ffffff;
  font-size: 0.75rem;
  outline: none;
}

.wallet-form input:focus,
.wallet-form select:focus,
.wallet-account-picker select:focus,
.wallet-setting-control select:focus,
.wallet-rate-reference input:focus,
.wallet-rate-row input:focus {
  border-color: #2c779e;
  box-shadow: 0 0 0 3px rgba(44, 119, 158, 0.12);
}

.wallet-form input:disabled,
.wallet-form select:disabled,
.wallet-rate-row input:disabled {
  color: #8a9198;
  background: #eef1f0;
}

.wallet-form__amount {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 6.5rem;
  gap: 0.7rem;
}

.wallet-account-picker {
  margin: 0 1rem 1.15rem;
}

.wallet-receive-details {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem;
}

.wallet-receive-details p,
.wallet-receive-details span {
  margin: 0;
  color: var(--wallet-muted);
  font-size: 0.68rem;
}

.wallet-receive-details strong {
  overflow-wrap: anywhere;
  font-size: 1rem;
  letter-spacing: 0;
}

.wallet-content > .wallet-primary-action {
  width: calc(100% - 2rem);
  margin: 1rem;
}

.wallet-settings-band {
  margin-bottom: 1rem;
  padding: 1rem;
}

.wallet-setting-control,
.wallet-rate-reference {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 0.65rem;
}

.wallet-setting-control button,
.wallet-rate-reference > button {
  min-height: 2.7rem;
  border: 0;
  border-radius: 6px;
  padding: 0 0.9rem;
  color: #ffffff;
  background: #202429;
  font-size: 0.7rem;
  font-weight: 800;
}

.wallet-settings-disclosure {
  display: grid;
  width: 100%;
  min-height: 3rem;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.75rem;
  border: 0;
  padding: 0;
  color: var(--wallet-ink);
  text-align: left;
  background: transparent;
}

.wallet-settings-disclosure > span:first-child {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.2rem;
}

.wallet-settings-disclosure small {
  color: var(--wallet-muted);
  font-size: 0.64rem;
}

.wallet-settings-disclosure strong {
  font-size: 0.78rem;
}

.wallet-settings-disclosure > span:nth-child(2) {
  color: var(--wallet-muted);
  font-size: 0.68rem;
  font-weight: 700;
}

.wallet-rate-settings {
  margin-top: 1rem;
  border-top: 1px solid var(--wallet-line);
  padding-top: 1rem;
}

.wallet-rate-list {
  margin-top: 1rem;
  border-top: 1px solid var(--wallet-line);
}

.wallet-rate-row {
  display: grid;
  min-height: 3.4rem;
  grid-template-columns: minmax(5.5rem, 1fr) minmax(5rem, 7.2rem) 2rem;
  align-items: center;
  gap: 0.55rem;
  border-bottom: 1px solid var(--wallet-line);
}

.wallet-rate-row > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.wallet-rate-row strong {
  font-size: 0.72rem;
}

.wallet-rate-row small {
  overflow: hidden;
  color: var(--wallet-muted);
  font-size: 0.61rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-rate-row input {
  min-height: 2rem;
  padding: 0 0.5rem;
  font-size: 0.68rem;
}

.wallet-rate-row button {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--wallet-line);
  border-radius: 6px;
  color: #ffffff;
  background: #202429;
  font-size: 0.65rem;
}

.wallet-rate-row button:disabled {
  color: #9aa0a5;
  background: #edf0ef;
}

.wallet-bottom-nav {
  position: absolute;
  z-index: 30;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  min-height: 4.2rem;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--wallet-line);
  padding: 0.45rem 1.2rem 0.5rem;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(18px);
}

.wallet-bottom-nav button {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  border: 0;
  color: #8a9095;
  background: transparent;
  font-size: 0.62rem;
  font-weight: 700;
}

.wallet-bottom-nav button i {
  font-size: 0.88rem;
}

.wallet-bottom-nav button.is-active {
  color: #202429;
}

@media (min-width: 680px) {
  .wallet-card-carousel__item {
    width: 22rem;
    flex-basis: 22rem;
  }

  .wallet-card-library {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wallet-card-library__meta {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wallet-content {
    scroll-behavior: auto;
  }
}
</style>
