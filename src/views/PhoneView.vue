<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  RELATIONSHIP_FACT_SOURCE_KEYS,
  recordPhoneCallRelationshipFact,
} from '../lib/relationship-fact-adapters'
import { useChatStore } from '../stores/chat'
import { PHONE_CALL_DIRECTION, usePhoneStore } from '../stores/phone'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const chatStore = useChatStore()
const phoneStore = usePhoneStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const { callCount, missedCallCount, completedCallCount, recentCalls } = storeToRefs(phoneStore)

const callDraft = ref({
  contactId: '',
  contactName: '',
  direction: PHONE_CALL_DIRECTION.OUTGOING,
  durationMinutes: '3',
  summary: '',
})
const feedback = ref('')
const feedbackType = ref('success')

const sortedRecentCalls = computed(() => recentCalls.value)

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
    (contact) => contact.optionValue === String(callDraft.value.contactId || ''),
  ) || null,
)

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const showFeedback = (type, message) => {
  feedbackType.value = type
  feedback.value = message
}

const formatTime = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return t('未知时间', 'Unknown time')
  return new Date(value).toLocaleString()
}

const formatDuration = (durationSec) => {
  const value = Math.max(0, Math.floor(Number(durationSec) || 0))
  if (value <= 0) return t('未接通', 'Not connected')
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const directionLabel = (direction) => {
  if (direction === PHONE_CALL_DIRECTION.INCOMING) return t('来电', 'Incoming')
  if (direction === PHONE_CALL_DIRECTION.MISSED) return t('未接', 'Missed')
  return t('去电', 'Outgoing')
}

const directionIconClass = (call) => {
  if (call.direction === PHONE_CALL_DIRECTION.MISSED || call.status === 'missed') return 'fas fa-phone-slash'
  if (call.direction === PHONE_CALL_DIRECTION.INCOMING) return 'fas fa-arrow-down'
  return 'fas fa-arrow-up'
}

const directionToneClass = (call) => {
  if (call.direction === PHONE_CALL_DIRECTION.MISSED || call.status === 'missed') return 'bg-red-50 text-red-600'
  if (call.direction === PHONE_CALL_DIRECTION.INCOMING) return 'bg-emerald-50 text-emerald-600'
  return 'bg-blue-50 text-blue-600'
}

const submitCallLog = () => {
  const direction = callDraft.value.direction
  const relationshipTarget = selectedRelationshipContact.value
  const contactName = relationshipTarget?.name || callDraft.value.contactName
  const created =
    direction === PHONE_CALL_DIRECTION.MISSED
      ? phoneStore.addMissedCallWithNotification({
          contactName,
          summary: callDraft.value.summary,
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
      : phoneStore.addRoleCallLog({
          contactName,
          direction,
          durationMinutes: callDraft.value.durationMinutes,
          summary: callDraft.value.summary,
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
    showFeedback('warning', t('请输入联系人或角色名。', 'Enter a contact or role name.'))
    return
  }

  const call = created?.call || created
  if (relationshipTarget && call) {
    recordPhoneCallRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      call,
      target: relationshipTarget,
    })
  }

  callDraft.value.contactId = ''
  callDraft.value.contactName = ''
  callDraft.value.summary = ''
  callDraft.value.durationMinutes = '3'
  showFeedback(
    'success',
    direction === PHONE_CALL_DIRECTION.MISSED
      ? t(
          '未接来电已保存，并已生成系统通知与 Calendar 线索。',
          'Missed call saved with a system notification and Calendar cue.',
        )
      : t('通话记录已保存。', 'Call log saved.'),
  )
}

const removeCall = (callId) => {
  if (phoneStore.removeCallLog(callId)) {
    relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
      RELATIONSHIP_FACT_SOURCE_KEYS.PHONE_CALL,
      callId,
    )
    showFeedback('success', t('通话记录已删除。', 'Call log removed.'))
  }
}
</script>

<template>
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('首页', 'Home') }}
      </button>
      <h1 class="font-bold">{{ t('电话', 'Phone') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar bg-gray-50 px-5 py-6 space-y-4">
      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <p class="text-xs text-gray-500">{{ t('本地角色通话基线', 'Local role-call baseline') }}</p>
        <p class="mt-1 text-2xl font-bold">{{ callCount }} {{ t('条记录', 'logs') }}</p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div class="rounded-xl bg-gray-50 p-3">
            <p class="text-[11px] text-gray-500">{{ t('已接通', 'Completed') }}</p>
            <p class="text-lg font-semibold">{{ completedCallCount }}</p>
          </div>
          <div class="rounded-xl bg-red-50 p-3">
            <p class="text-[11px] text-red-500">{{ t('未接来电', 'Missed') }}</p>
            <p class="text-lg font-semibold text-red-600">{{ missedCallCount }}</p>
          </div>
        </div>
        <p class="mt-3 text-[11px] text-gray-500">
          {{
            t(
              '这是本地模拟通话记录，不会拨打真实电话；后续可接入 Chat 角色、未接事件和 AI 通话摘要。',
              'This is a local simulated call log, not real dialing; Chat roles and AI call summaries can attach later.',
            )
          }}
        </p>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4 space-y-3">
        <p class="text-sm font-semibold">{{ t('记录一次通话', 'Record a call') }}</p>
        <select
          v-model="callDraft.contactId"
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          data-testid="phone-relationship-contact"
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
        <input
          v-model="callDraft.contactName"
          type="text"
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          data-testid="phone-contact-name"
          :disabled="Boolean(selectedRelationshipContact)"
          :placeholder="t('联系人或角色名', 'Contact or role name')"
        />
        <div class="grid grid-cols-2 gap-2">
          <select
            v-model="callDraft.direction"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          >
            <option :value="PHONE_CALL_DIRECTION.OUTGOING">{{ t('去电', 'Outgoing') }}</option>
            <option :value="PHONE_CALL_DIRECTION.INCOMING">{{ t('来电', 'Incoming') }}</option>
            <option :value="PHONE_CALL_DIRECTION.MISSED">{{ t('未接', 'Missed') }}</option>
          </select>
          <input
            v-model="callDraft.durationMinutes"
            type="number"
            min="0"
            step="1"
            :disabled="callDraft.direction === PHONE_CALL_DIRECTION.MISSED"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none disabled:bg-gray-100 disabled:text-gray-400"
            :placeholder="t('分钟', 'Minutes')"
          />
        </div>
        <input
          v-model="callDraft.summary"
          type="text"
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="t('摘要，可选', 'Summary, optional')"
        />
        <button
          @click="submitCallLog"
          class="w-full rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
          data-testid="phone-save-call"
        >
          {{ t('保存通话', 'Save call') }}
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
          <p class="text-sm font-semibold">{{ t('最近通话', 'Recent calls') }}</p>
          <span class="text-[11px] text-gray-500">{{ callCount }}</span>
        </div>
        <div v-if="sortedRecentCalls.length > 0" class="space-y-2">
          <div
            v-for="call in sortedRecentCalls"
            :key="call.id"
            class="rounded-xl border border-gray-100 p-3 flex items-start gap-3"
          >
            <div
              class="mt-0.5 w-9 h-9 rounded-full flex items-center justify-center text-xs"
              :class="directionToneClass(call)"
            >
              <i :class="directionIconClass(call)"></i>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{{ call.contactName }}</p>
              <p class="text-[11px] text-gray-500 truncate">
                {{ directionLabel(call.direction) }} · {{ formatDuration(call.durationSec) }} · {{ formatTime(call.startedAt) }}
              </p>
              <p v-if="call.summary" class="mt-1 text-[11px] text-gray-400 truncate">{{ call.summary }}</p>
            </div>
            <button
              @click="removeCall(call.id)"
              :data-testid="`phone-remove-call-${call.id}`"
              class="text-[11px] text-red-500 hover:text-red-600"
            >
              {{ t('删除', 'Delete') }}
            </button>
          </div>
        </div>
        <p v-else class="text-xs text-gray-500">
          {{ t('暂无通话记录。', 'No call logs yet.') }}
        </p>
      </section>
    </div>
  </div>
</template>
