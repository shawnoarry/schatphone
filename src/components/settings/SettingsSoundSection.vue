<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  enabled: {
    type: Boolean,
    default: true,
  },
  profileId: {
    type: String,
    default: 'wechat',
  },
  profileOptions: {
    type: Array,
    default: () => [],
  },
  profile: {
    type: Object,
    default: () => ({}),
  },
  followsGlobal: {
    type: Boolean,
    default: false,
  },
  showFollowGlobal: {
    type: Boolean,
    default: false,
  },
  globalProfileLabel: {
    type: String,
    default: '',
  },
  titleZh: {
    type: String,
    default: '声音与音效',
  },
  titleEn: {
    type: String,
    default: 'Sounds & Effects',
  },
  descriptionZh: {
    type: String,
    default: '控制系统操作、消息和通知的提示音，并可随时试听。',
  },
  descriptionEn: {
    type: String,
    default: 'Control system, message, and notification sounds, then preview the current choice.',
  },
  testIdPrefix: {
    type: String,
    default: 'settings',
  },
  active: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle', 'set-profile', 'preview', 'toggle-follow-global'])
const { t } = useI18n()

const setProfile = (event) => {
  emit('set-profile', event.target.value)
}
</script>

<template>
  <section
    class="rounded-2xl border bg-white p-4 space-y-4"
    :class="active ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-gray-200'"
    :data-testid="testIdPrefix + '-sound'"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-gray-900">{{ t(titleZh, titleEn) }}</p>
        <p class="mt-1 text-[11px] leading-4 text-gray-500">{{ t(descriptionZh, descriptionEn) }}</p>
      </div>
      <button
        type="button"
        role="switch"
        class="relative h-7 w-12 shrink-0 rounded-full transition"
        :class="enabled ? 'bg-blue-500' : 'bg-gray-300'"
        :aria-checked="enabled"
        :aria-label="t('开启音效', 'Enable sound effects')"
        :data-testid="testIdPrefix + '-sound-toggle'"
        @click="emit('toggle')"
      >
        <span
          class="absolute top-1 h-5 w-5 rounded-full bg-white transition"
          :class="enabled ? 'left-6' : 'left-1'"
        ></span>
      </button>
    </div>

    <div
      v-if="showFollowGlobal"
      class="flex items-start justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5"
      :data-testid="testIdPrefix + '-sound-scope'"
    >
      <div class="min-w-0">
        <p class="text-xs font-semibold text-blue-900">
          {{ t('跟随全局设置', 'Follow global settings') }}
        </p>
        <p class="mt-1 text-[11px] leading-4 text-blue-700">
          {{
            followsGlobal
              ? t(
                  '当前跟随全局：' + (globalProfileLabel || '系统提示音') + '。',
                  'Following global: ' + (globalProfileLabel || 'System sound') + '.',
                )
              : t('Chat 已使用自己的音效设置，全局修改不会覆盖。', 'Chat uses its own sound settings; global changes will not override them.')
          }}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        class="relative h-7 w-12 shrink-0 rounded-full transition"
        :class="followsGlobal ? 'bg-blue-500' : 'bg-gray-300'"
        :aria-checked="followsGlobal"
        :aria-label="t('跟随全局声音设置', 'Follow global sound settings')"
        :data-testid="testIdPrefix + '-sound-follow-global-toggle'"
        @click="emit('toggle-follow-global')"
      >
        <span
          class="absolute top-1 h-5 w-5 rounded-full bg-white transition"
          :class="followsGlobal ? 'left-6' : 'left-1'"
        ></span>
      </button>
    </div>

    <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <label class="min-w-0">
        <span class="text-xs font-semibold text-gray-800">{{ t('音效选择', 'Sound choice') }}</span>
        <select
          class="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          :value="profileId"
          :aria-label="t('音效选择', 'Sound selection')"
          :data-testid="testIdPrefix + '-sound-select'"
          @change="setProfile"
        >
          <option v-for="option in profileOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </select>
        <span class="mt-1 block text-[11px] leading-4 text-gray-500">{{ profile.description }}</span>
      </label>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!enabled"
        :data-testid="testIdPrefix + '-sound-preview'"
        @click="emit('preview')"
      >
        <i class="fas fa-play" aria-hidden="true"></i>
        {{ t('试听', 'Preview') }}
      </button>
    </div>
  </section>
</template>
