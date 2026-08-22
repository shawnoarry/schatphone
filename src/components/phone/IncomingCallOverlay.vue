<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { usePhoneStore } from '../../stores/phone'
import { useSystemStore } from '../../stores/system'
import { useI18n } from '../../composables/useI18n'
import {
  DEFAULT_RINGTONE_ID,
  normalizeRingtoneId,
  playRingtone,
  stopRingtone,
} from '../../lib/ringtone'
import {
  playCallAudio,
  resolveGlobalCallAudioSettings,
  stopCallAudio,
} from '../../lib/call-audio'
import { startRingVibration, stopRingVibration } from '../../lib/haptics'

const phoneStore = usePhoneStore()
const systemStore = useSystemStore()
const router = useRouter()
const { t } = useI18n()
const { settings } = storeToRefs(systemStore)
const { incomingCall } = storeToRefs(phoneStore)
const dialogElement = ref(null)

let focusRestoreTarget = null
let focusRequest = 0

const isRinging = computed(() => incomingCall.value?.status === 'ringing')
const callerName = computed(() => incomingCall.value?.participant?.name || '')
const callerNumber = computed(() => incomingCall.value?.participant?.phoneNumber || '')
const callAudioSettings = computed(() =>
  resolveGlobalCallAudioSettings(settings.value.appearance),
)

const callerInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

const avatarToneClass = (name = '') => {
  const tones = ['is-tone-a', 'is-tone-b', 'is-tone-c', 'is-tone-d']
  let hash = 0
  for (const char of String(name)) hash = (hash * 31 + char.charCodeAt(0)) % 997
  return tones[hash % tones.length]
}

const focusIncomingCallDialog = () => {
  if (typeof document === 'undefined') return
  const activeElement = document.activeElement
  if (activeElement && activeElement !== document.body && typeof activeElement.focus === 'function') {
    focusRestoreTarget = activeElement
  }
  const request = ++focusRequest
  void nextTick(() => {
    if (request !== focusRequest || !isRinging.value) return
    dialogElement.value?.focus({ preventScroll: true })
  })
}

const restoreIncomingCallFocus = () => {
  const target = focusRestoreTarget
  focusRestoreTarget = null
  const request = ++focusRequest
  void nextTick(() => {
    if (request !== focusRequest || isRinging.value || !target?.isConnected) return
    target.focus({ preventScroll: true })
  })
}

const containDialogFocus = (event) => {
  if (event.key !== 'Tab') return
  const dialog = dialogElement.value
  if (!dialog) return
  const focusable = Array.from(dialog.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ))
  if (!focusable.length) {
    event.preventDefault()
    dialog.focus({ preventScroll: true })
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const activeElement = document.activeElement
  if (event.shiftKey && (activeElement === first || activeElement === dialog || !dialog.contains(activeElement))) {
    event.preventDefault()
    last.focus({ preventScroll: true })
  } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
    event.preventDefault()
    first.focus({ preventScroll: true })
  }
}

watch(
  isRinging,
  (ringing) => {
    if (ringing) {
      focusIncomingCallDialog()
      if (settings.value.appearance?.ringtoneEnabled !== false) {
        const ringtoneId = normalizeRingtoneId(settings.value.appearance?.ringtoneId || DEFAULT_RINGTONE_ID)
        playRingtone(ringtoneId, { loop: true })
      }
      startRingVibration({
        enabled: settings.value.appearance?.hapticFeedbackEnabled !== false,
      })
      return
    }
    stopRingtone()
    stopRingVibration()
    restoreIncomingCallFocus()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  focusRequest += 1
  stopRingtone()
  stopRingVibration()
})

const acceptCall = () => {
  phoneStore.acceptIncomingCall()
  if (systemStore.isLocked) systemStore.unlockPhone()
  router.push('/phone')
}

const declineCall = () => {
  phoneStore.declineIncomingCall()
  stopCallAudio()
  if (callAudioSettings.value.enabled) {
    playCallAudio('call-ended', { profile: callAudioSettings.value.profile })
  }
}
</script>

<template>
  <div v-if="isRinging" class="incoming-call" data-testid="incoming-call-overlay">
    <section
      ref="dialogElement"
      class="incoming-call__inner"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      :aria-label="t('来电', 'Incoming call')"
      @keydown="containDialogFocus"
    >
      <p class="incoming-call__label">
        <i class="fas fa-phone-volume" aria-hidden="true"></i>
        {{ t('来电', 'Incoming call') }}
      </p>

      <div class="incoming-call__identity">
        <span class="incoming-call__avatar" :class="avatarToneClass(callerName)" aria-hidden="true">
          <span>{{ callerInitials(callerName) }}</span>
        </span>
        <h2 data-testid="incoming-call-name">{{ callerName || t('未知号码', 'Unknown caller') }}</h2>
        <p>{{ callerNumber || t('SchatPhone 通话', 'SchatPhone call') }}</p>
      </div>

      <div class="incoming-call__actions">
        <button
          type="button"
          class="incoming-call__action is-decline"
          :aria-label="t('拒接', 'Decline')"
          data-testid="incoming-call-decline"
          @click="declineCall"
        >
          <i class="fas fa-phone-slash" aria-hidden="true"></i>
          <span>{{ t('拒接', 'Decline') }}</span>
        </button>
        <button
          type="button"
          class="incoming-call__action is-accept"
          :aria-label="t('接听', 'Accept')"
          data-testid="incoming-call-accept"
          @click="acceptCall"
        >
          <i class="fas fa-phone" aria-hidden="true"></i>
          <span>{{ t('接听', 'Accept') }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.incoming-call {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 24%, rgba(126, 158, 191, 0.24), transparent 36%),
    linear-gradient(165deg, #1b2431 0%, #10151d 100%);
  color: #f2f6fa;
  animation: incoming-call-enter 220ms ease-out;
}

@keyframes incoming-call-enter {
  from {
    opacity: 0;
    transform: scale(1.02);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.incoming-call__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: clamp(32px, 12vh, 96px) 24px 48px;
  text-align: center;
}

.incoming-call__label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(242, 246, 250, 0.72);
}

.incoming-call__identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.incoming-call__identity h2 {
  margin-top: 6px;
  font-size: 26px;
  font-weight: 700;
}

.incoming-call__identity p {
  font-size: 14px;
  color: rgba(242, 246, 250, 0.66);
}

.incoming-call__avatar {
  display: grid;
  place-items: center;
  width: 92px;
  height: 92px;
  border-radius: 9999px;
  font-size: 30px;
  font-weight: 600;
  color: #fff;
  animation: incoming-call-pulse 1.8s ease-in-out infinite;
}

.incoming-call__avatar.is-tone-a {
  background: linear-gradient(150deg, #6a9980, #40614e);
}

.incoming-call__avatar.is-tone-b {
  background: linear-gradient(150deg, #7e9ebf, #4c617a);
}

.incoming-call__avatar.is-tone-c {
  background: linear-gradient(150deg, #b98a7e, #7a544c);
}

.incoming-call__avatar.is-tone-d {
  background: linear-gradient(150deg, #9b87b8, #63537a);
}

@keyframes incoming-call-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(242, 246, 250, 0.22);
  }
  50% {
    box-shadow: 0 0 0 18px rgba(242, 246, 250, 0);
  }
}

.incoming-call__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(36px, 12vw, 88px);
}

.incoming-call__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(242, 246, 250, 0.82);
}

.incoming-call__action i {
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  border-radius: 9999px;
  font-size: 22px;
  color: #fff;
  transition: transform 140ms ease-out;
}

.incoming-call__action:active i {
  transform: scale(0.92);
}

.incoming-call__action.is-decline i {
  background: linear-gradient(150deg, #d4675d, #a03f37);
}

.incoming-call__action.is-accept i {
  background: linear-gradient(150deg, #6dbb8a, #3f8a5c);
}
</style>
