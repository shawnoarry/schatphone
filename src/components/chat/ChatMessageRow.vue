<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  layoutMode: {
    type: String,
    default: 'kakao',
  },
  activeSelfAvatar: {
    type: String,
    default: '',
  },
  activeContactAvatar: {
    type: String,
    default: '',
  },
  isGroup: {
    type: Boolean,
    default: false,
  },
  senderName: {
    type: String,
    default: '',
  },
  messageBlocks: {
    type: Function,
    default: (message) => [
      { type: 'text', text: message?.content || '', variant: 'primary', lang: 'auto' },
    ],
  },
  renderMarkdown: {
    type: Function,
    default: (text) => text || '',
  },
  secondaryTextBadge: {
    type: Function,
    default: () => '',
  },
  resolveImageBlockUrl: {
    type: Function,
    default: () => '',
  },
  formatVoiceDuration: {
    type: Function,
    default: () => '',
  },
  messageMetaHintText: {
    type: Function,
    default: () => '',
  },
  messageStatusText: {
    type: Function,
    default: () => '',
  },
  transferActionLabel: {
    type: Function,
    default: () => '',
  },
  canReplyToServiceNotification: {
    type: Boolean,
    default: true,
  },
  serviceNotificationDensity: {
    type: String,
    default: 'full',
  },
})

const emit = defineEmits([
  'open-message-actions',
  'start-message-long-press',
  'cancel-message-long-press',
  'open-module-route',
  'open-external-url',
  'open-shopping-product-card',
  'open-service-notification-route',
  'quote-service-notification',
])

const { t } = useI18n()

const normalizedLayoutMode = computed(() =>
  ['kakao', 'wechat', 'imessage'].includes(props.layoutMode) ? props.layoutMode : 'kakao',
)
const normalizedServiceNotificationDensity = computed(() =>
  ['full', 'compact'].includes(props.serviceNotificationDensity)
    ? props.serviceNotificationDensity
    : 'full',
)
const hasServiceNotificationBlock = computed(() =>
  props.messageBlocks(props.message).some((block) => block?.type === 'service_notification'),
)
const isCompactServiceNotificationRow = computed(
  () => normalizedServiceNotificationDensity.value === 'compact' && hasServiceNotificationBlock.value,
)

const serviceNotificationSourceLabel = (block = {}) => {
  if (block.serviceLabel) return block.serviceLabel
  const sourceModule = typeof block.sourceModule === 'string' ? block.sourceModule : ''
  if (sourceModule.includes('shopping')) return t('Shopping', 'Shopping')
  if (sourceModule.includes('logistics')) return t('Logistics', 'Logistics')
  if (sourceModule.includes('food_delivery')) return t('Food Delivery', 'Food Delivery')
  return t('Service', 'Service')
}

const serviceNotificationKindLabel = (block = {}) => {
  if (block.kind === 'shopping_order') return t('订单更新', 'Order update')
  if (block.kind === 'logistics_update') return t('物流追踪', 'Delivery tracking')
  if (block.kind === 'food_delivery_order' || block.kind === 'food_delivery_update') {
    return t('外卖履约', 'Food delivery')
  }
  return t('订阅更新', 'Subscription update')
}

const serviceNotificationToneKey = (block = {}) => {
  const kind = typeof block.kind === 'string' ? block.kind : ''
  const sourceModule = typeof block.sourceModule === 'string' ? block.sourceModule : ''
  if (kind.startsWith('food_delivery') || sourceModule.includes('food_delivery')) return 'food'
  if (kind === 'logistics_update' || sourceModule.includes('logistics')) return 'logistics'
  if (kind === 'shopping_order' || sourceModule.includes('shopping')) return 'shopping'
  return 'service'
}

const SERVICE_NOTIFICATION_TONES = {
  shopping: {
    key: 'shopping',
    icon: 'fas fa-bag-shopping',
    card: 'border-amber-100 bg-white',
    iconWrap: 'bg-amber-50 text-amber-700',
    label: 'text-amber-700',
    statusPill: 'bg-amber-50 text-amber-700',
    hint: 'border-amber-100 bg-amber-50/70 text-amber-800',
    sourcePanel: 'border-amber-100 bg-amber-50/50',
    sourceHeading: 'text-amber-700',
    sourceButton: 'border-amber-200 bg-white text-amber-700',
    sourceTitleZh: '订单详情',
    sourceTitleEn: 'Order details',
    sourceDetailZh: 'Shopping 负责订单状态、支付、售后和履约记录。',
    sourceDetailEn: 'Shopping owns order status, checkout, returns, and fulfillment records.',
    hintZh: '订单详情会打开 Shopping；Chat 回复仍留在当前聊天。',
    hintEn: 'Order details open in Shopping; replies stay in Chat.',
    defaultActionZh: '查看订单',
    defaultActionEn: 'View order',
  },
  logistics: {
    key: 'logistics',
    icon: 'fas fa-truck-fast',
    card: 'border-sky-100 bg-white',
    iconWrap: 'bg-sky-50 text-sky-700',
    label: 'text-sky-700',
    statusPill: 'bg-sky-50 text-sky-700',
    hint: 'border-sky-100 bg-sky-50/70 text-sky-800',
    sourcePanel: 'border-sky-100 bg-sky-50/60',
    sourceHeading: 'text-sky-700',
    sourceButton: 'border-sky-200 bg-white text-sky-700',
    sourceTitleZh: '物流轨迹',
    sourceTitleEn: 'Tracking details',
    sourceDetailZh: '来源 App 负责轨迹节点、签收和配送状态。',
    sourceDetailEn: 'The source app owns tracking events, handoff, and delivery state.',
    hintZh: '物流轨迹会打开来源 App；Chat 回复仍留在当前聊天。',
    hintEn: 'Tracking opens in the source app; replies stay in Chat.',
    defaultActionZh: '查看物流',
    defaultActionEn: 'View tracking',
  },
  food: {
    key: 'food',
    icon: 'fas fa-utensils',
    card: 'border-orange-100 bg-white',
    iconWrap: 'bg-orange-50 text-orange-700',
    label: 'text-orange-700',
    statusPill: 'bg-orange-50 text-orange-700',
    hint: 'border-orange-100 bg-orange-50/70 text-orange-800',
    sourcePanel: 'border-orange-100 bg-orange-50/60',
    sourceHeading: 'text-orange-700',
    sourceButton: 'border-orange-200 bg-white text-orange-700',
    sourceTitleZh: '外卖详情',
    sourceTitleEn: 'Delivery details',
    sourceDetailZh: 'Food Delivery 负责餐厅、菜单、预计送达和订单状态。',
    sourceDetailEn: 'Food Delivery owns restaurant, menu, ETA, and order state.',
    hintZh: '外卖状态会打开 Food Delivery；Chat 回复仍留在当前聊天。',
    hintEn: 'Food Delivery opens order state; replies stay in Chat.',
    defaultActionZh: '查看外卖',
    defaultActionEn: 'View delivery',
  },
  service: {
    key: 'service',
    icon: 'fas fa-bell',
    card: 'border-emerald-100 bg-white',
    iconWrap: 'bg-emerald-50 text-emerald-700',
    label: 'text-emerald-700',
    statusPill: 'bg-emerald-50 text-emerald-700',
    hint: 'border-emerald-100 bg-emerald-50/70 text-emerald-800',
    sourcePanel: 'border-gray-100 bg-gray-50/80',
    sourceHeading: 'text-emerald-700',
    sourceButton: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    sourceTitleZh: '来源详情',
    sourceTitleEn: 'Source details',
    sourceDetailZh: '打开来源 App 查看或处理业务状态。',
    sourceDetailEn: 'Open the source app to view or handle business state.',
    hintZh: '来源动作打开详情；Chat 回复仍留在当前聊天。',
    hintEn: 'Source actions open details; replies stay in Chat.',
    defaultActionZh: '查看详情',
    defaultActionEn: 'View details',
  },
}

const serviceNotificationTone = (block = {}) =>
  SERVICE_NOTIFICATION_TONES[serviceNotificationToneKey(block)] || SERVICE_NOTIFICATION_TONES.service

const quoteLabel = (quote = {}) => {
  if (quote.sourceType === 'service_notification') return t('引用通知', 'Quoted notification')
  return quote.role === 'assistant' ? t('引用助手', 'Quoted assistant') : t('引用用户', 'Quoted user')
}

const isUserMessage = computed(() => props.message?.role === 'user')
const isRecalledMessage = computed(() => Boolean(Number(props.message?.recalledAt || 0) > 0))
const roleClass = computed(() => (isUserMessage.value ? 'is-user' : 'is-assistant'))
const rowTestId = computed(() => `chat-message-row-${props.message?.id || 'unknown'}`)
const showContactAvatar = computed(
  () => !isUserMessage.value && normalizedLayoutMode.value !== 'imessage' && !isCompactServiceNotificationRow.value,
)
const showSelfAvatar = computed(() => isUserMessage.value && normalizedLayoutMode.value === 'wechat')
const showSenderName = computed(
  () => !isUserMessage.value && !isCompactServiceNotificationRow.value && (normalizedLayoutMode.value === 'kakao' || props.isGroup),
)
const metaHintText = computed(() => props.messageMetaHintText(props.message))
const statusText = computed(() => props.messageStatusText(props.message))
const contactAvatarFallbackLabel = computed(() => (props.senderName || 'C').trim().slice(0, 1).toUpperCase())
const hasMessageMeta = computed(() => Boolean(metaHintText.value || statusText.value))
const metaTestId = computed(() => `chat-message-meta-${props.message?.id || 'unknown'}`)
const statusTestId = computed(() => `chat-message-status-${props.message?.id || 'unknown'}`)
const metaHintTestId = computed(() => `chat-message-meta-hint-${props.message?.id || 'unknown'}`)
const metaPlacement = computed(() => {
  if (normalizedLayoutMode.value === 'wechat') return 'content-gutter'
  if (normalizedLayoutMode.value === 'imessage') return isUserMessage.value ? 'read-receipt' : 'low-avatarless'
  return isUserMessage.value ? 'bubble-edge' : 'sender-stack'
})
const metaClasses = computed(() => [
  `chat-message-meta-${normalizedLayoutMode.value}`,
  isUserMessage.value ? 'is-user' : 'is-assistant',
  {
    'is-failed': props.message?.status === 'failed',
    'has-hint': Boolean(metaHintText.value),
    'has-status': Boolean(statusText.value),
  },
])
</script>

<template>
  <div
    class="chat-message-row"
    :class="[
      roleClass,
      `chat-row-layout-${normalizedLayoutMode}`,
      {
        'is-group': isGroup,
        'is-recalled': isRecalledMessage,
        'is-compact-service-notification': isCompactServiceNotificationRow,
      },
    ]"
    :data-layout-mode="normalizedLayoutMode"
    :data-testid="rowTestId"
  >
    <div
      v-if="showContactAvatar"
      class="chat-message-avatar w-8 h-8 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0"
      data-testid="chat-message-avatar-contact"
    >
      <img
        v-if="activeContactAvatar"
        :src="activeContactAvatar"
        class="w-full h-full object-cover"
        data-testid="chat-active-contact-avatar"
      />
      <span v-else class="w-full h-full inline-flex items-center justify-center bg-white/80 text-[11px] font-bold text-gray-700">
        {{ contactAvatarFallbackLabel }}
      </span>
    </div>

    <div class="chat-message-content">
      <p v-if="showSenderName" class="chat-message-sender" data-testid="chat-message-sender-name">
        {{ senderName }}
      </p>
      <div
        class="chat-message-bubble px-3 py-2 text-sm rounded-xl shadow-sm relative"
        :class="isUserMessage ? 'chat-bubble-user' : 'chat-bubble-assistant'"
        data-testid="chat-message-bubble"
        @contextmenu.prevent="emit('open-message-actions', message.id)"
        @mousedown.left="emit('start-message-long-press', message.id, $event)"
        @mouseup="emit('cancel-message-long-press')"
        @mouseleave="emit('cancel-message-long-press')"
        @touchstart="emit('start-message-long-press', message.id, $event)"
        @touchmove.passive="emit('cancel-message-long-press')"
        @touchend="emit('cancel-message-long-press')"
        @touchcancel="emit('cancel-message-long-press')"
      >
        <div v-if="message.quote" class="mb-2 rounded-lg border border-white/40 bg-black/5 px-2 py-1 text-[11px] leading-4">
          <p class="font-semibold opacity-80">{{ quoteLabel(message.quote) }}</p>
          <p class="line-clamp-2">{{ message.quote.preview }}</p>
        </div>

        <div
          v-for="(block, blockIndex) in messageBlocks(message)"
          :key="`${message.id}-block-${blockIndex}`"
          class="chat-message-block mt-1 first:mt-0"
          :data-block-type="block.type"
          :data-testid="`chat-message-block-${message.id}-${blockIndex}`"
        >
          <div
            v-if="block.type === 'text'"
            :class="
              block.variant === 'secondary'
                ? 'rounded-lg border border-black/10 bg-white/45 px-2.5 py-2'
                : ''
            "
          >
            <p
              v-if="block.variant === 'secondary'"
              class="mb-1 text-[10px] uppercase tracking-wide text-gray-500"
            >
              {{ secondaryTextBadge(block) }}
            </p>
            <div
              class="markdown-body"
              :class="
                block.variant === 'secondary'
                  ? 'text-[12px] opacity-90 leading-relaxed break-words'
                  : 'leading-relaxed break-words'
              "
              v-html="renderMarkdown(block.text)"
            ></div>
          </div>

          <div v-else-if="block.type === 'voice_virtual'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2 flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-black/10 inline-flex items-center justify-center"><i class="fas fa-play text-[10px]"></i></span>
            <div class="min-w-0 flex-1">
              <p class="text-[12px] font-semibold truncate">{{ block.label }}</p>
              <p class="text-[11px] opacity-80 line-clamp-2" v-if="block.transcript">{{ block.transcript }}</p>
            </div>
            <span class="text-[10px] opacity-70">{{ formatVoiceDuration(block.durationSec) }}</span>
          </div>

          <div v-else-if="block.type === 'module_link'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
            <p class="text-[12px] font-semibold">{{ block.label }}</p>
            <p class="text-[11px] opacity-75" v-if="block.note">{{ block.note }}</p>
            <button @click="emit('open-module-route', block.route)" class="mt-2 px-2 py-1 rounded-md border border-black/15 text-[11px]">
              {{ t('打开', 'Open') }} {{ block.route }}
            </button>
          </div>

          <div v-else-if="block.type === 'link_external'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
            <p class="text-[12px] font-semibold">{{ block.label }}</p>
            <p class="text-[11px] opacity-75 break-all">{{ block.url }}</p>
            <p class="text-[11px] opacity-75" v-if="block.note">{{ block.note }}</p>
            <button @click="emit('open-external-url', block.url)" class="mt-2 px-2 py-1 rounded-md border border-black/15 text-[11px]">
              {{ t('打开链接', 'Open link') }}
            </button>
          </div>

          <div v-else-if="block.type === 'transfer_virtual'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
            <p class="text-[12px] font-semibold">{{ block.label }}</p>
            <p class="text-base font-bold">{{ block.amount }} {{ block.currency }}</p>
            <p class="text-[11px] opacity-75" v-if="block.to">{{ t('To', 'To') }}: {{ block.to }}</p>
            <p class="text-[11px] opacity-75" v-if="block.note">{{ t('备注', 'Note') }}: {{ block.note }}</p>
            <button @click="emit('open-module-route', block.actionRoute)" class="mt-2 px-2 py-1 rounded-md border border-black/15 text-[11px]">{{ transferActionLabel(block) }}</button>
          </div>

          <div v-else-if="block.type === 'product_card'" class="rounded-lg border border-orange-200 bg-orange-50/80 px-2.5 py-2">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-orange-500">{{ t('Shopping 商品卡', 'Shopping product card') }}</p>
            <p v-if="block.serviceLabel || block.serviceKey" class="mt-1 text-[10px] font-semibold text-amber-700">
              {{ t('来自店铺', 'From shop') }} · {{ block.serviceLabel || block.serviceKey }}
            </p>
            <p class="mt-1 text-[12px] font-semibold text-gray-950">{{ block.title }}</p>
            <p v-if="block.desc" class="mt-1 text-[11px] opacity-75 line-clamp-2">{{ block.desc }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-1.5">
              <span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-orange-600">{{ block.price }}</span>
              <span v-if="block.category" class="rounded-full bg-white/70 px-2 py-0.5 text-[10px] text-gray-600">{{ block.category }}</span>
              <span v-if="block.serviceLabel || block.serviceKey" class="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{{ block.serviceLabel || block.serviceKey }}</span>
              <span v-if="block.assetEligible" class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600">{{ t('鍙浆璧勪骇', 'Asset-ready') }}</span>
              <span v-if="block.giftable" class="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600">{{ t('Giftable', 'Giftable') }}</span>
            </div>
            <button
              :data-testid="`chat-product-card-open-${block.productId}`"
              @click="emit('open-shopping-product-card', block)"
              class="mt-2 rounded-md border border-orange-200 bg-white px-2 py-1 text-[11px] text-orange-700"
            >
              {{ t('Confirm in Shopping', 'Confirm in Shopping') }}
            </button>
          </div>

          <div
            v-else-if="block.type === 'service_notification'"
            class="rounded-2xl border shadow-sm"
            :class="[
              serviceNotificationTone(block).card,
              normalizedServiceNotificationDensity === 'compact' ? 'px-2.5 py-2' : 'px-3 py-3',
            ]"
            :data-service-density="normalizedServiceNotificationDensity"
            :data-service-tone="serviceNotificationTone(block).key"
            :data-testid="`chat-service-notification-${block.sourceModule}-${block.sourceId}${block.sourceEventId ? `-${block.sourceEventId}` : ''}`"
          >
            <div class="flex items-start gap-2">
              <span
                class="mt-0.5 inline-flex shrink-0 items-center justify-center"
                :class="[
                  serviceNotificationTone(block).iconWrap,
                  normalizedServiceNotificationDensity === 'compact' ? 'h-7 w-7 rounded-lg' : 'h-8 w-8 rounded-xl',
                ]"
              >
                <i class="text-xs" :class="serviceNotificationTone(block).icon"></i>
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] font-semibold" :class="serviceNotificationTone(block).label">
                    {{ serviceNotificationKindLabel(block) }}
                  </p>
                  <p class="text-[10px] text-gray-400 truncate">
                    {{ serviceNotificationSourceLabel(block) }}
                  </p>
                </div>
                <p
                  class="font-semibold text-gray-950"
                  :class="
                    normalizedServiceNotificationDensity === 'compact'
                      ? 'mt-0.5 line-clamp-1 text-[12px] leading-4'
                      : 'mt-1 text-[13px] leading-5'
                  "
                >
                  {{ block.title }}
                </p>
                <p
                  v-if="block.summary"
                  class="text-[11px] leading-4 text-gray-600"
                  :class="normalizedServiceNotificationDensity === 'compact' ? 'mt-0.5 line-clamp-1' : 'mt-1'"
                >
                  {{ block.summary }}
                </p>
              </div>
            </div>
            <div
              class="flex flex-wrap items-center gap-1.5"
              :class="normalizedServiceNotificationDensity === 'compact' ? 'mt-2' : 'mt-3'"
            >
              <span
                v-if="block.statusLabel"
                class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                :class="serviceNotificationTone(block).statusPill"
              >
                {{ block.statusLabel }}
              </span>
              <span v-if="block.amount" class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
                {{ block.amount }}
              </span>
              <span v-if="block.serviceKey && !block.serviceLabel" class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                {{ block.serviceKey }}
              </span>
            </div>
            <p
              v-if="normalizedServiceNotificationDensity !== 'compact'"
              class="mt-3 rounded-2xl border px-2.5 py-2 text-[10px] leading-4"
              :class="serviceNotificationTone(block).hint"
              data-testid="chat-service-notification-action-hint"
            >
              {{ t(serviceNotificationTone(block).hintZh, serviceNotificationTone(block).hintEn) }}
            </p>
            <div
              v-if="normalizedServiceNotificationDensity !== 'compact'"
              class="mt-2 rounded-2xl border px-2.5 py-2"
              :class="serviceNotificationTone(block).sourcePanel"
              data-testid="chat-service-notification-source-actions"
            >
              <p class="text-[10px] font-semibold" :class="serviceNotificationTone(block).sourceHeading">
                {{ t(serviceNotificationTone(block).sourceTitleZh, serviceNotificationTone(block).sourceTitleEn) }}
              </p>
              <p class="mt-0.5 text-[10px] leading-4 text-gray-500">
                {{ t(serviceNotificationTone(block).sourceDetailZh, serviceNotificationTone(block).sourceDetailEn) }}
              </p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <button
                  v-for="(action, actionIndex) in block.actions || []"
                  :key="`${action.route}-${actionIndex}`"
                  type="button"
                  class="rounded-full border px-3 py-1 text-[11px] font-semibold"
                  :class="serviceNotificationTone(block).sourceButton"
                  :data-testid="`chat-service-notification-action-${block.sourceId}-${actionIndex}`"
                  @click="emit('open-service-notification-route', block, action)"
                >
                  {{ action.label }}
                </button>
                <button
                  v-if="!block.actions?.length"
                  type="button"
                  class="rounded-full border px-3 py-1 text-[11px] font-semibold"
                  :class="serviceNotificationTone(block).sourceButton"
                  :data-testid="`chat-service-notification-open-${block.sourceId}`"
                  @click="emit('open-service-notification-route', block)"
                >
                  {{ t(serviceNotificationTone(block).defaultActionZh, serviceNotificationTone(block).defaultActionEn) }}
                </button>
              </div>
            </div>
            <div
              v-if="normalizedServiceNotificationDensity !== 'compact' && canReplyToServiceNotification"
              class="mt-2 rounded-xl border border-gray-100 bg-white px-2.5 py-2"
              data-testid="chat-service-notification-reply-actions"
            >
              <p class="text-[10px] font-semibold text-slate-700">
                {{ t('Chat 回复', 'Chat reply') }}
              </p>
              <p class="mt-0.5 text-[10px] leading-4 text-gray-500">
                {{ t('引用这条通知继续聊天，不会改动来源记录。', 'Quote this notification and keep chatting here without changing source records.') }}
              </p>
              <button
                type="button"
                class="mt-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-700"
                :data-testid="`chat-service-notification-reply-${block.sourceId}`"
                @click="emit('quote-service-notification', { block, message })"
              >
                {{ t('回复', 'Reply') }}
              </button>
            </div>
            <div
              v-if="normalizedServiceNotificationDensity === 'compact'"
              class="mt-2 flex flex-wrap items-center gap-1.5"
              data-testid="chat-service-notification-compact-actions"
            >
              <button
                v-for="(action, actionIndex) in block.actions || []"
                :key="`${action.route}-${actionIndex}`"
                type="button"
                class="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
                :class="serviceNotificationTone(block).sourceButton"
                :data-testid="`chat-service-notification-action-${block.sourceId}-${actionIndex}`"
                @click="emit('open-service-notification-route', block, action)"
              >
                {{ action.label }}
              </button>
              <button
                v-if="!block.actions?.length"
                type="button"
                class="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
                :class="serviceNotificationTone(block).sourceButton"
                :data-testid="`chat-service-notification-open-${block.sourceId}`"
                @click="emit('open-service-notification-route', block)"
              >
                {{ t(serviceNotificationTone(block).defaultActionZh, serviceNotificationTone(block).defaultActionEn) }}
              </button>
              <button
                v-if="canReplyToServiceNotification"
                type="button"
                class="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-gray-700"
                :data-testid="`chat-service-notification-reply-${block.sourceId}`"
                @click="emit('quote-service-notification', { block, message })"
              >
                {{ t('回复', 'Reply') }}
              </button>
            </div>
            </div>

          <div v-else-if="block.type === 'image_virtual'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
            <div class="w-full h-24 rounded-md bg-black/5 overflow-hidden mb-1.5">
              <img
                v-if="resolveImageBlockUrl(message.id, blockIndex, block)"
                :src="resolveImageBlockUrl(message.id, blockIndex, block)"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-[11px] opacity-70">{{ t('图片预览', 'Image preview') }}</div>
            </div>
            <p class="text-[12px] font-semibold">{{ block.alt }}</p>
            <p class="text-[11px] opacity-75" v-if="block.caption">{{ block.caption }}</p>
          </div>

          <div v-else-if="block.type === 'mini_scene'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
            <p class="text-[12px] font-semibold">{{ block.title }}</p>
            <p class="text-[11px] opacity-75" v-if="block.description">{{ block.description }}</p>
            <pre v-if="block.htmlSnippet" class="mt-1 rounded-md bg-black/5 p-2 text-[10px] whitespace-pre-wrap break-all">{{ block.htmlSnippet }}</pre>
          </div>
        </div>
      </div>

      <div
        v-if="hasMessageMeta"
        class="chat-message-meta"
        :class="metaClasses"
        :data-meta-layout="normalizedLayoutMode"
        :data-meta-placement="metaPlacement"
        :data-testid="metaTestId"
      >
        <span
          v-if="metaHintText"
          class="chat-message-meta-hint"
          :data-testid="metaHintTestId"
        >
          {{ metaHintText }}
        </span>
        <span
          v-if="statusText"
          class="chat-message-status"
          :data-testid="statusTestId"
        >
          {{ statusText }}
        </span>
      </div>
    </div>

    <div
      v-if="showSelfAvatar"
      class="chat-message-avatar w-8 h-8 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0"
      data-testid="chat-message-avatar-self"
    >
      <img
        v-if="activeSelfAvatar"
        :src="activeSelfAvatar"
        class="w-full h-full object-cover"
        data-testid="chat-active-self-avatar"
      />
      <span v-else class="w-full h-full inline-flex items-center justify-center bg-yellow-200 text-[10px] font-bold text-yellow-950">
        Me
      </span>
    </div>
  </div>
</template>
