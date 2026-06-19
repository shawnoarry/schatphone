import { computed } from 'vue'
import {
  findFoodDeliveryServicePreset,
  findLogisticsServicePreset,
  findShoppingServicePreset,
} from '../lib/planned-module-registry'

const translateWith = (t, zh, en) => (typeof t === 'function' ? t(zh, en) : en || zh)

export const useChatServiceThreadDisplayModel = ({
  chatStore,
  activeChat,
  activeConversation,
  activeMessages,
  isActiveServiceChat,
  activeServiceIsMuted,
  activeServiceIsFolded,
  canActiveChatCommunicate,
  serviceRouteFeedback,
  serviceNotificationActionFeedback,
  t,
} = {}) => {
  const translate = (zh, en) => translateWith(t, zh, en)

  const shoppingServiceLabel = (serviceKey) => {
    const preset = findShoppingServicePreset(serviceKey || '')
    if (!preset?.key || preset.key !== serviceKey) return ''
    return translate(preset.zh, preset.en)
  }

  const logisticsServiceLabel = (serviceKey) => {
    const preset = findLogisticsServicePreset(serviceKey || '')
    if (!preset?.key || preset.key !== serviceKey) return ''
    return translate(preset.zh, preset.en)
  }

  const foodDeliveryServiceLabel = (serviceKey) => {
    const preset = findFoodDeliveryServicePreset(serviceKey || '')
    if (!preset?.key || preset.key !== serviceKey) return ''
    return translate(preset.zh, preset.en)
  }

  const activeShoppingServiceKey = computed(() => activeChat?.value?.shoppingServiceKey || '')
  const activeLogisticsServiceKey = computed(() => activeChat?.value?.logisticsServiceKey || '')
  const activeFoodDeliveryServiceKey = computed(() => activeChat?.value?.foodDeliveryServiceKey || '')

  const activeServiceStatusTags = computed(() => {
    if (!isActiveServiceChat?.value) return []
    const tags = []
    if (activeServiceIsMuted?.value) {
      tags.push({
        key: 'muted',
        label: translate('免打扰', 'Muted'),
        className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      })
    }
    if (activeServiceIsFolded?.value) {
      tags.push({
        key: 'folded',
        label: translate('已折叠', 'Folded'),
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      })
    }
    return tags
  })

  const activeServiceHeaderStatus = computed(() => {
    if (!isActiveServiceChat?.value) return ''
    const tagText = activeServiceStatusTags.value.map((tag) => tag.label).join(' · ')
    if (tagText) return tagText
    return activeChat?.value?.kind === 'official'
      ? translate('官方订阅更新', 'Official updates')
      : translate('订阅更新', 'Subscription updates')
  })

  const activeServiceTemplateText = computed(() => {
    if (!isActiveServiceChat?.value) return ''
    return activeChat?.value?.serviceTemplate || translate('未设置服务模板', 'Service template not set')
  })

  const activeServiceChannelPreview = computed(() => {
    if (!isActiveServiceChat?.value) return ''
    const conversation = activeConversation?.value
    if (conversation?.lastMessage) return conversation.lastMessage
    return activeChat?.value?.bio || translate('还没有订阅消息', 'No subscription messages yet')
  })

  const showActiveServiceEmptyState = computed(() =>
    Boolean(isActiveServiceChat?.value && (activeMessages?.value || []).length === 0),
  )

  const activeServiceEmptyStateTitle = computed(() => {
    if (!isActiveServiceChat?.value) return ''
    return activeChat?.value?.kind === 'official'
      ? translate('还没有公告', 'No notices yet')
      : translate('还没有订阅更新', 'No updates yet')
  })

  const activeServiceEmptyStateDetail = computed(() => {
    if (!isActiveServiceChat?.value) return ''
    const name = activeChat?.value?.name || translate('服务号', 'Service account')
    if (activeChat?.value?.serviceTemplate) {
      return translate(
        `${name} 的新更新会直接出现在这里。`,
        `${name} updates will appear here.`,
      )
    }
    return translate('新的服务消息会直接出现在这条聊天里。', 'New service messages will appear in this chat.')
  })

  const activeServiceRouteFeedback = computed(() => {
    if (!isActiveServiceChat?.value || !serviceRouteFeedback?.value) return null
    return Number(serviceRouteFeedback.value.chatId) === Number(activeChat?.value?.id)
      ? serviceRouteFeedback.value
      : null
  })

  const activeServiceRouteFeedbackDetail = computed(() => {
    const feedback = activeServiceRouteFeedback.value
    if (!feedback) return ''
    const destination = feedback.destination || translate('来源', 'source')
    return translate(
      `刚刚已打开 ${destination}，回到 Chat 后可以继续围绕这条通知回复；Chat 不会改动来源记录。`,
      `Opened ${destination}; you can keep replying around this notification in Chat. Chat did not change source records.`,
    )
  })

  const activeServiceNotificationActionFeedback = computed(() =>
    isActiveServiceChat?.value ? serviceNotificationActionFeedback?.value || null : null,
  )

  const activeServiceInteractionDock = computed(() => {
    if (!isActiveServiceChat?.value) return null
    const routeFeedback = activeServiceRouteFeedback.value
    if (routeFeedback) {
      return {
        type: 'source',
        icon: 'fas fa-arrow-up-right-from-square',
        title: translate('已打开来源', 'Source opened'),
        context: routeFeedback.title,
        detail: activeServiceRouteFeedbackDetail.value,
        primaryLabel: routeFeedback.route ? translate('再次打开来源', 'Open again') : '',
        dismissLabel: translate('知道了', 'OK'),
      }
    }

    const actionFeedback = activeServiceNotificationActionFeedback.value
    if (!actionFeedback) return null
    return {
      type: actionFeedback.type || 'reply',
      icon: actionFeedback.type === 'read' ? 'fas fa-check-double' : 'fas fa-reply',
      title: actionFeedback.heading,
      context: actionFeedback.title,
      detail: actionFeedback.detail,
      primaryLabel: '',
      dismissLabel: translate('知道了', 'OK'),
    }
  })

  const activeServiceInteractionDockClasses = computed(() => {
    if (activeServiceInteractionDock.value?.type === 'source') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-950'
    }
    if (activeServiceInteractionDock.value?.type === 'read') {
      return 'border-slate-200 bg-white text-slate-800'
    }
    if (activeServiceInteractionDock.value?.type === 'sent') {
      return 'border-emerald-200 bg-white text-emerald-950'
    }
    return 'border-sky-200 bg-sky-50 text-sky-950'
  })

  const activeServiceSourceChips = computed(() => {
    if (!isActiveServiceChat?.value) return []
    const chips = []
    const shoppingLabel = shoppingServiceLabel(activeShoppingServiceKey.value)
    const logisticsLabel = logisticsServiceLabel(activeLogisticsServiceKey.value)
    const foodDeliveryLabel = foodDeliveryServiceLabel(activeFoodDeliveryServiceKey.value)

    if (shoppingLabel) {
      chips.push({
        key: 'shopping',
        label: translate(`Shopping · ${shoppingLabel}`, `Shopping · ${shoppingLabel}`),
        className: 'border-amber-100 bg-amber-50 text-amber-700',
      })
    }
    if (logisticsLabel) {
      chips.push({
        key: 'logistics',
        label: translate(`Logistics · ${logisticsLabel}`, `Logistics · ${logisticsLabel}`),
        className: 'border-sky-100 bg-sky-50 text-sky-700',
      })
    }
    if (foodDeliveryLabel) {
      chips.push({
        key: 'food-delivery',
        label: translate(`Food Delivery · ${foodDeliveryLabel}`, `Food Delivery · ${foodDeliveryLabel}`),
        className: 'border-orange-100 bg-orange-50 text-orange-700',
      })
    }

    if (chips.length === 0) {
      chips.push({
        key: 'chat-only',
        label: activeChat?.value?.kind === 'official'
          ? translate('Chat 公众号', 'Chat official channel')
          : translate('Chat 服务号', 'Chat service channel'),
        className: 'border-gray-100 bg-gray-50 text-gray-600',
      })
    }

    return chips
  })

  const activeServiceLinkContract = computed(() =>
    isActiveServiceChat?.value && activeChat?.value?.id && typeof chatStore?.getServiceAccountLinkContract === 'function'
      ? chatStore.getServiceAccountLinkContract(activeChat.value.id)
      : null,
  )

  const activeServiceSourceNotificationPlan = computed(() =>
    activeServiceLinkContract.value?.sourceNotificationPlan || null,
  )

  const activeServiceSourceScheduleRows = computed(() =>
    Array.isArray(activeServiceSourceNotificationPlan.value?.rows)
      ? activeServiceSourceNotificationPlan.value.rows
      : [],
  )

  const serviceSourceScheduleRowLabel = (row = {}) => {
    if (row.id === 'shopping_orders') return translate('购物订单', 'Shopping orders')
    if (row.id === 'shopping_logistics') return translate('物流追踪', 'Logistics tracking')
    if (row.id === 'food_delivery_orders') return translate('外卖订单', 'Food Delivery orders')
    return row?.label || translate('服务更新', 'Service updates')
  }

  const serviceSourceScheduleRowScheduleLabel = (row = {}) => {
    if (row.id === 'shopping_orders') return translate('购物订单有进展时推送', 'Triggered by Shopping order events')
    if (row.id === 'shopping_logistics') return translate('物流节点变化时推送', 'Triggered by tracking milestones')
    if (row.id === 'food_delivery_orders') return translate('外卖订单变化时推送', 'Triggered by Food Delivery order events')
    return row?.scheduleLabel || translate('有新进展时推送', 'Event-driven updates')
  }

  const activeServiceSourceScheduleLabels = computed(() =>
    activeServiceSourceScheduleRows.value.map((row) => serviceSourceScheduleRowLabel(row)).filter(Boolean),
  )

  const activeServiceSourceScheduleSummary = computed(() =>
    activeServiceSourceScheduleLabels.value.length > 0
      ? translate(
          `${activeServiceSourceScheduleLabels.value.join(' / ')} 有新进展时会推送到这里。`,
          `${activeServiceSourceScheduleLabels.value.join(' / ')} can push event-driven updates into this Chat service thread.`,
        )
      : translate(
          '暂未连接来源 App，可作为普通订阅频道使用。',
          'No source app is connected yet; this can still work as a regular subscription channel.',
        ),
  )

  const activeServiceInboxPlacement = computed(() => {
    if (!isActiveServiceChat?.value) return ''
    if (activeServiceIsFolded?.value && activeServiceIsMuted?.value) {
      return translate(
        '已折叠且免打扰：不出现在消息首页，更新会安静留在服务号页和本会话。',
        'Folded and muted: hidden from Messages, with updates kept quietly in Services and this thread.',
      )
    }
    if (activeServiceIsFolded?.value) {
      return translate(
        '已折叠：不出现在 Messages 首页，历史和新通知仍保留在这里。',
        'Folded: hidden from Messages while history and new notifications remain here.',
      )
    }
    if (activeServiceIsMuted?.value) {
      return translate(
        '免打扰：更新会保留在 Chat，但不会抢占你的消息首页注意力。',
        'Muted: updates stay in Chat without demanding attention in Messages.',
      )
    }
    return translate(
      '显示在 Messages：新更新会像普通聊天一样进入消息首页。',
      'Visible in Messages: new updates enter the message list like normal chats.',
    )
  })

  const activeServiceThreadPromises = computed(() => {
    if (!isActiveServiceChat?.value) return []
    return [
      {
        key: 'reply',
        label: translate('可直接回复', 'Reply in Chat'),
        detail: canActiveChatCommunicate?.value
          ? translate('回复会保留在这条会话里。', 'Replies stay in this thread.')
          : translate('当前状态只能查看历史。', 'This state is history-only.'),
      },
      {
        key: 'source',
        label: translate('来源负责业务', 'Source owns records'),
        detail: translate(
          '订单、物流和外卖状态仍由来源 App 处理。',
          'Orders, delivery, and fulfillment stay in source apps.',
        ),
      },
      {
        key: 'history',
        label: translate('历史不会丢', 'History kept'),
        detail: translate(
          '免打扰或折叠不会删除通知卡片。',
          'Muting or folding never deletes notification cards.',
        ),
      },
    ]
  })

  return {
    shoppingServiceLabel,
    activeShoppingServiceKey,
    activeLogisticsServiceKey,
    activeFoodDeliveryServiceKey,
    activeServiceStatusTags,
    activeServiceHeaderStatus,
    activeServiceTemplateText,
    activeServiceChannelPreview,
    showActiveServiceEmptyState,
    activeServiceEmptyStateTitle,
    activeServiceEmptyStateDetail,
    activeServiceRouteFeedback,
    activeServiceRouteFeedbackDetail,
    activeServiceNotificationActionFeedback,
    activeServiceInteractionDock,
    activeServiceInteractionDockClasses,
    activeServiceSourceChips,
    activeServiceSourceNotificationPlan,
    activeServiceSourceScheduleRows,
    serviceSourceScheduleRowScheduleLabel,
    activeServiceSourceScheduleSummary,
    activeServiceInboxPlacement,
    activeServiceThreadPromises,
  }
}
