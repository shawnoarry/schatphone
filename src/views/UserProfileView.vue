<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const systemStore = useSystemStore()
const { t } = useI18n()
const { user } = storeToRefs(systemStore)
const saved = ref(false)
let savedTimerId = null

const userAiContextSummary = computed(() => systemStore.getUserAiContextSummary())

const contextFieldLabel = (key) => {
  if (key === 'name') return t('姓名', 'Name')
  if (key === 'gender') return t('性别', 'Gender')
  if (key === 'birthday') return t('出生日期', 'Birthday')
  if (key === 'occupation') return t('职业', 'Occupation')
  if (key === 'relationship') return t('关系设定', 'Relationship')
  if (key === 'bio') return t('详细人设', 'Bio')
  return key
}

const missingContextLabels = computed(() =>
  userAiContextSummary.value.missingRecommendedKeys.map((key) => contextFieldLabel(key)),
)

const promptPreviewLines = computed(() =>
  userAiContextSummary.value.promptText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean),
)

const goSettings = () => {
  router.push('/settings')
}

const saveProfile = () => {
  systemStore.saveNow()
  saved.value = true
  if (savedTimerId) clearTimeout(savedTimerId)
  savedTimerId = setTimeout(() => {
    saved.value = false
  }, 1200)
}

onBeforeUnmount(() => {
  if (savedTimerId) clearTimeout(savedTimerId)
})
</script>

<template>
  <div class="w-full h-full bg-[#f2f2f7] flex flex-col text-black">
    <div class="pt-12 pb-3 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goSettings" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> {{ t('设置', 'Settings') }}
      </button>
      <h1 class="text-2xl font-bold flex-1">{{ t('用户信息', 'Profile') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('头像 URL', 'Avatar URL') }}</label>
        <input
          v-model="user.avatar"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          placeholder="https://..."
        />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('姓名', 'Name') }}</label>
        <input v-model="user.name" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('性别', 'Gender') }}</label>
        <select v-model="user.gender" class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white">
          <option value="">{{ t('未设置', 'Not set') }}</option>
          <option value="female">{{ t('女', 'Female') }}</option>
          <option value="male">{{ t('男', 'Male') }}</option>
          <option value="other">{{ t('其他', 'Other') }}</option>
        </select>
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('出生日期', 'Birthday') }}</label>
        <input v-model="user.birthday" type="date" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('职业', 'Occupation') }}</label>
        <input v-model="user.occupation" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('关系设定', 'Relationship') }}</label>
        <input
          v-model="user.relationship"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          :placeholder="t('例如：朋友 / 队友 / 恋人', 'Example: friend / teammate / partner')"
        />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('详细人设（User Bio）', 'Detailed Profile (User Bio)') }}</label>
        <textarea
          v-model="user.bio"
          class="w-full h-28 border border-gray-200 rounded-lg p-2 outline-none text-sm resize-none"
          :placeholder="t('描述你的性格、偏好与背景...', 'Describe your personality, preferences, and background...')"
        ></textarea>
      </div>

      <div class="bg-white rounded-2xl p-4 space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ t('AI 上下文预览', 'AI Context Preview') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">
              {{
                t(
                  '非匿名聊天会读取这份摘要；匿名模式会隐藏这些身份信息。',
                  'Non-anonymous chats read this summary; anonymous mode hides these identity details.',
                )
              }}
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2 py-1 text-[10px] font-medium"
            :class="
              userAiContextSummary.hasRecommendedBaseline
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            "
          >
            {{
              userAiContextSummary.hasRecommendedBaseline
                ? t('基础完整', 'Baseline ready')
                : t('建议补全', 'Needs detail')
            }}
          </span>
        </div>

        <div class="rounded-xl bg-gray-50 border border-gray-100 p-3 text-[11px] text-gray-700 space-y-1">
          <p v-for="line in promptPreviewLines" :key="line" class="break-words">{{ line }}</p>
        </div>

        <p v-if="missingContextLabels.length > 0" class="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          {{
            t(
              `建议补充：${missingContextLabels.join('、')}，这样 Chat 更容易理解用户身份。`,
              `Recommended: add ${missingContextLabels.join(', ')} so Chat can understand the user identity better.`,
            )
          }}
        </p>
      </div>

      <button
        @click="saveProfile"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? t('已保存', 'Saved') : t('保存用户信息', 'Save profile') }}
      </button>
    </div>
  </div>
</template>
