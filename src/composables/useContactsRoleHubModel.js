import { computed } from 'vue'
import { CHAT_CONTACT_SOCIAL_STATES } from '../stores/chat'
import {
  CONTACTS_ENTITY_TYPES,
  ROLE_DETAIL_SECTIONS,
} from '../lib/role-profile-schema'

const defaultT = (zh, en) => en || zh

export const contactsEntityTypeLabel = (entityType, t = defaultT) => {
  if (entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) return t('自我档案', 'Self Profile')
  if (entityType === CONTACTS_ENTITY_TYPES.NPC) return t('NPC / 世界角色', 'NPC / World Role')
  return t('主要角色', 'Main Role')
}

export const chatSocialSnapshotLabel = (state = '', t = defaultT) => {
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONNECTED) return t('可正常聊天', 'Can chat normally')
  if (state === CHAT_CONTACT_SOCIAL_STATES.STRANGER) {
    return t('还不是常规 Chat 联系人', 'Not a normal Chat contact yet')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST) {
    return t('打招呼请求待处理', 'Greeting request pending')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST) {
    return t('用户已发送打招呼请求', 'User greeting request sent')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED) {
    return t('请求已被忽略或拒绝', 'Request declined or ignored')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED) return t('已被用户拉黑', 'Blocked by user')
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED) {
    return t('对方暂不接收消息', 'They are not receiving messages')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED) {
    return t('双方互相拉黑', 'Both sides are blocked')
  }
  return t('没有 Chat 绑定', 'No Chat binding')
}

export function useContactsRoleHubModel({
  selectedProfile,
  selectedProfileEntityType,
  selectedProfileValues,
  selectedProfileChatBound,
  selectedRoleChatContact,
  selectedRelationshipSnapshot,
  selectedLinkedActivitySummary,
  t = defaultT,
  getDetailItemStatsForSection = () => ({ manual: 0, eventAttached: 0 }),
  getContactChatSocialState = () => CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
  formatAuditTimestamp = () => '',
  formatEntityTypeLabel = (entityType) => contactsEntityTypeLabel(entityType, t),
} = {}) {
  const selectedRoleHubStats = computed(() => {
    const profile = selectedProfile?.value
    const totals = {
      manual: 0,
      eventAttached: 0,
    }
    if (profile?.id) {
      for (const section of Object.values(ROLE_DETAIL_SECTIONS)) {
        const stats = getDetailItemStatsForSection(profile, section) || {}
        totals.manual += Number(stats.manual) || 0
        totals.eventAttached += Number(stats.eventAttached) || 0
      }
    }
    return {
      ...totals,
      worldFieldCount: Array.isArray(selectedProfileValues?.value)
        ? selectedProfileValues.value.length
        : 0,
      memoryCount: Number(selectedRelationshipSnapshot?.value?.totalMemoryCount) || 0,
      chatBound: Boolean(selectedProfileChatBound?.value),
    }
  })

  const selectedChatStateLabel = computed(() => {
    if (selectedProfileEntityType?.value === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
      return t('不作为 Chat 目标', 'Not a Chat target')
    }
    return selectedProfileChatBound?.value ? t('Chat 目标', 'Chat target') : t('仅在 Contacts', 'Contacts only')
  })

  const selectedChatStateDetail = computed(() => {
    if (selectedProfileEntityType?.value === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
      return t(
        '自我档案只通过可见性门控进入上下文，不会绑定成聊天对象。',
        'Self Profile only enters context through visibility gates and is not bound as a chat target.',
      )
    }
    if (selectedProfileChatBound?.value) {
      return t(
        '已进入 Chat Directory；这里仍保留档案、关系和记忆管理。',
        'Already in Chat Directory; Contacts still owns profile, relationship, and memory management.',
      )
    }
    return t(
      '需要聊天时到 Chat Directory 绑定；Contacts 仍可先维护完整档案。',
      'Bind in Chat Directory when this role should enter Chat; Contacts can maintain the profile first.',
    )
  })

  const selectedChatSocialSnapshot = computed(() => {
    const contact = selectedRoleChatContact?.value
    if (!contact) {
      return {
        exists: false,
        label: t('没有 Chat 绑定', 'No Chat binding'),
        detail: t(
          'Contacts 保留角色档案；Chat Directory 决定这个角色是否能进入聊天。',
          'Contacts keeps the role profile. Chat Directory decides whether this role can chat.',
        ),
        note: '',
        updatedAtLabel: '',
      }
    }
    const state = getContactChatSocialState(contact)
    return {
      exists: true,
      state,
      label: chatSocialSnapshotLabel(state, t),
      detail: t(
        '来自 Chat 的只读快照。Contacts 只展示这个状态，不应用通讯变更。',
        'Read-only from Chat. Contacts displays this state but does not apply communication changes.',
      ),
      note: contact.chatSocialNote || '',
      updatedAtLabel: contact.chatSocialUpdatedAt
        ? formatAuditTimestamp(contact.chatSocialUpdatedAt)
        : '',
    }
  })

  const selectedRoleHubCards = computed(() => [
    {
      key: 'entity',
      label: t('实体', 'Entity'),
      value: formatEntityTypeLabel(selectedProfileEntityType?.value),
      detail: selectedChatStateDetail.value,
    },
    {
      key: 'chat',
      label: t('Chat 状态', 'Chat state'),
      value: selectedChatStateLabel.value,
      detail: selectedRoleChatContact?.value
        ? t(`会话 ID ${selectedRoleChatContact.value.id}`, `Chat ID ${selectedRoleChatContact.value.id}`)
        : t('还没有会话入口', 'No chat entry yet'),
    },
    {
      key: 'manual',
      label: t('手动条目', 'Manual details'),
      value: String(selectedRoleHubStats.value.manual),
      detail: t('用户维护的稳定设定', 'User-maintained stable facts'),
    },
    {
      key: 'event',
      label: t('事件挂载', 'Event-attached'),
      value: String(selectedRoleHubStats.value.eventAttached),
      detail: t('随记忆或关系重置清理', 'Cleared with memory or relationship reset'),
    },
    {
      key: 'world',
      label: t('世界字段', 'World fields'),
      value: String(selectedRoleHubStats.value.worldFieldCount),
      detail: t('来自 WorldBook 模板', 'From WorldBook templates'),
    },
    {
      key: 'memory',
      label: t('记忆组', 'Memories'),
      value: String(selectedRoleHubStats.value.memoryCount),
      detail: selectedLinkedActivitySummary?.value?.sourceText || '',
    },
  ])

  return {
    selectedRoleHubStats,
    selectedChatStateLabel,
    selectedChatStateDetail,
    selectedChatSocialSnapshot,
    selectedRoleHubCards,
  }
}
