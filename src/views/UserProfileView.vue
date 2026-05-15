<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useGalleryStore } from '../stores/gallery'
import { useI18n } from '../composables/useI18n'
import ImageSourcePicker from '../components/shared/ImageSourcePicker.vue'
import { resolveAvatarImageSourceUrl } from '../lib/avatar-image-source-resolver'

const router = useRouter()
const systemStore = useSystemStore()
const galleryStore = useGalleryStore()
const { t } = useI18n()
const { user } = storeToRefs(systemStore)
const saved = ref(false)
let savedTimerId = null

const readUserAvatarImage = () => {
  const source =
    user.value.avatarImage && typeof user.value.avatarImage === 'object'
      ? user.value.avatarImage
      : null

  return {
    sourceType: source?.sourceType || source?.imageSourceType || (user.value.avatar ? 'url' : 'none'),
    url: source?.url || source?.imageUrl || user.value.avatar || '',
    galleryAssetId: source?.galleryAssetId || source?.imageGalleryAssetId || '',
  }
}

const userAvatarSourceType = ref('none')
const userAvatarUrl = ref('')
const userAvatarGalleryAssetId = ref('')
let syncingAvatarDraft = false

const syncAvatarDraftFromUser = () => {
  const avatarImage = readUserAvatarImage()
  syncingAvatarDraft = true
  userAvatarSourceType.value = avatarImage.sourceType
  userAvatarUrl.value = avatarImage.url
  userAvatarGalleryAssetId.value = avatarImage.galleryAssetId
  syncingAvatarDraft = false
}

const syncUserFromAvatarDraft = () => {
  if (syncingAvatarDraft) return
  const sourceType = userAvatarSourceType.value
  const url = sourceType === 'url' ? userAvatarUrl.value : ''
  const galleryAssetId = sourceType === 'gallery' ? userAvatarGalleryAssetId.value : ''
  user.value.avatar = url
  user.value.avatarImage = {
    ...(user.value.avatarImage || {}),
    sourceType,
    url,
    galleryAssetId,
  }
}

const galleryImageAssets = computed(() => galleryStore.assets.slice(0, 80))

watch(
  () => [
    user.value.avatar,
    user.value.avatarImage?.sourceType,
    user.value.avatarImage?.imageSourceType,
    user.value.avatarImage?.url,
    user.value.avatarImage?.imageUrl,
    user.value.avatarImage?.galleryAssetId,
    user.value.avatarImage?.imageGalleryAssetId,
  ],
  syncAvatarDraftFromUser,
  { immediate: true },
)

watch([userAvatarSourceType, userAvatarUrl, userAvatarGalleryAssetId], syncUserFromAvatarDraft)

const profileAvatarUrl = computed(() => {
  return (
    resolveAvatarImageSourceUrl({
      galleryStore,
      avatarImage: user.value.avatarImage,
      legacyAvatar: user.value.avatar,
      fallbackAlt: user.value.name || 'SchatPhone',
    }) ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      user.value.name || 'SchatPhone',
    )}`
  )
})

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
  <div class="profile-shell w-full h-full bg-[#f2f2f7] flex flex-col text-black">
    <div
      class="profile-header pt-12 pb-3 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center"
    >
      <button
        @click="goSettings"
        class="profile-nav-button mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium"
      >
        <i class="fas fa-chevron-left"></i> {{ t('设置', 'Settings') }}
      </button>
      <h1 class="text-2xl font-bold flex-1">{{ t('用户信息', 'Profile') }}</h1>
    </div>

    <div class="profile-scroll flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="profile-identity-card bg-white rounded-2xl p-4">
        <div class="profile-avatar-preview">
          <img :src="profileAvatarUrl" :alt="user.name || t('用户头像', 'User avatar')" />
        </div>
        <div class="min-w-0">
          <p class="profile-identity-name">{{ user.name || t('未命名用户', 'Unnamed User') }}</p>
          <p class="profile-identity-meta">
            {{ user.relationship || user.occupation || t('系统用户资料', 'System profile') }}
          </p>
        </div>
      </div>

      <div class="profile-field-card bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-2">{{ t('头像来源', 'Avatar source') }}</label>
        <ImageSourcePicker
          v-model:source-type="userAvatarSourceType"
          v-model:image-url="userAvatarUrl"
          v-model:gallery-asset-id="userAvatarGalleryAssetId"
          :gallery-assets="galleryImageAssets"
          :source-options="[
            { value: 'none', labelZh: '默认头像', labelEn: 'Default avatar' },
            { value: 'url', labelZh: 'URL 头像', labelEn: 'URL avatar' },
            { value: 'gallery', labelZh: 'Gallery 素材', labelEn: 'Gallery asset' },
          ]"
          url-placeholder-zh="https:// 头像图片地址"
          url-placeholder-en="https:// avatar image URL"
          gallery-placeholder-zh="选择 Gallery 头像素材"
          gallery-placeholder-en="Choose Gallery avatar asset"
          test-id-prefix="user-profile-avatar"
        />
        <p class="profile-help-text mt-2 text-[11px] text-gray-500">
          {{
            t(
              '本地图片仍先进入相册，再在这里引用。',
              'Local images still enter through Gallery first, then are referenced here.',
            )
          }}
        </p>
      </div>

      <div class="profile-field-card bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('姓名', 'Name') }}</label>
        <input v-model="user.name" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="profile-field-card bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('性别', 'Gender') }}</label>
        <select v-model="user.gender" class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white">
          <option value="">{{ t('未设置', 'Not set') }}</option>
          <option value="female">{{ t('女', 'Female') }}</option>
          <option value="male">{{ t('男', 'Male') }}</option>
          <option value="other">{{ t('其他', 'Other') }}</option>
        </select>
      </div>

      <div class="profile-field-card bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('出生日期', 'Birthday') }}</label>
        <input v-model="user.birthday" type="date" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="profile-field-card bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('职业', 'Occupation') }}</label>
        <input v-model="user.occupation" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="profile-field-card bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('关系设定', 'Relationship') }}</label>
        <input
          v-model="user.relationship"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          :placeholder="t('例如：朋友 / 队友 / 恋人', 'Example: friend / teammate / partner')"
        />
      </div>

      <div class="profile-field-card bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">
          {{ t('详细人设（User Bio）', 'Detailed Profile (User Bio)') }}
        </label>
        <textarea
          v-model="user.bio"
          class="w-full h-28 border border-gray-200 rounded-lg p-2 outline-none text-sm resize-none"
          :placeholder="t('描述你的性格、偏好与背景...', 'Describe your personality, preferences, and background...')"
        ></textarea>
      </div>

      <div class="profile-field-card profile-ai-preview bg-white rounded-2xl p-4 space-y-3">
        <div class="profile-ai-preview-head">
          <div>
            <p class="profile-ai-title">{{ t('AI 上下文预览', 'AI Context Preview') }}</p>
            <p class="profile-help-text mt-1 text-[11px] text-gray-500">
              {{
                t(
                  '非匿名聊天会读取这份摘要；匿名模式会隐藏这些身份信息。',
                  'Non-anonymous chats read this summary; anonymous mode hides these identity details.',
                )
              }}
            </p>
          </div>
          <span class="profile-ai-badge" :class="{ 'is-ready': userAiContextSummary.hasRecommendedBaseline }">
            {{
              userAiContextSummary.hasRecommendedBaseline
                ? t('基础完整', 'Baseline ready')
                : t('建议补全', 'Needs detail')
            }}
          </span>
        </div>

        <div class="profile-ai-prompt">
          <p v-for="line in promptPreviewLines" :key="line" class="break-words">{{ line }}</p>
        </div>

        <p v-if="missingContextLabels.length > 0" class="profile-ai-missing">
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
        class="profile-save-button w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? t('已保存', 'Saved') : t('保存用户信息', 'Save profile') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.profile-shell {
  position: relative;
  isolation: isolate;
  background: var(--system-page-bg);
  color: var(--system-text);
}

.profile-header {
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  box-shadow: var(--system-shadow-chrome);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
}

.profile-header h1 {
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: 0;
}

.profile-nav-button {
  min-height: 36px;
  color: var(--system-accent);
  -webkit-tap-highlight-color: transparent;
}

.profile-scroll {
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.profile-identity-card,
.profile-field-card {
  border: 1px solid var(--system-card-border);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.profile-identity-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 92px;
  border-radius: var(--system-radius-lg);
}

.profile-avatar-preview {
  width: 58px;
  height: 58px;
  overflow: hidden;
  border: 2px solid var(--system-card-border);
  border-radius: 999px;
  background: linear-gradient(135deg, #e5e7eb 0%, #cbd5e1 100%);
  box-shadow: var(--system-shadow-control);
  flex: 0 0 auto;
}

.profile-avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-identity-name {
  color: var(--system-text);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.profile-identity-meta {
  margin-top: 4px;
  color: var(--system-text-muted);
  font-size: 12px;
}

.profile-field-card {
  border-radius: var(--system-radius-md);
}

.profile-field-card label {
  color: var(--system-text-muted);
  font-weight: 600;
  letter-spacing: 0;
}

.profile-field-card input,
.profile-field-card select,
.profile-field-card textarea {
  border-color: var(--system-control-border);
  border-radius: 12px;
  background: var(--system-control-bg);
  color: var(--system-text);
}

.profile-field-card input {
  min-height: 42px;
  padding-right: 10px;
  padding-left: 10px;
}

.profile-field-card textarea {
  min-height: 118px;
}

.profile-help-text {
  line-height: 1.45;
}

.profile-ai-preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.profile-ai-title {
  color: var(--system-text);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
}

.profile-ai-badge {
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--system-warning) 22%, transparent);
  border-radius: 999px;
  padding: 5px 8px;
  background: color-mix(in srgb, var(--system-warning) 13%, transparent);
  color: var(--system-warning);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.profile-ai-badge.is-ready {
  border-color: color-mix(in srgb, var(--system-success) 24%, transparent);
  background: color-mix(in srgb, var(--system-success) 12%, transparent);
  color: var(--system-success);
}

.profile-ai-prompt {
  display: grid;
  gap: 4px;
  border: 1px solid var(--system-control-border);
  border-radius: 14px;
  background: var(--system-control-bg);
  color: var(--system-text);
  padding: 12px;
  font-size: 11px;
  line-height: 1.45;
}

.profile-ai-missing {
  border: 1px solid color-mix(in srgb, var(--system-warning) 24%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--system-warning) 12%, transparent);
  color: var(--system-warning);
  padding: 10px 12px;
  font-size: 11px;
  line-height: 1.45;
}

.profile-save-button {
  min-height: 46px;
  border-radius: 14px;
  box-shadow: 0 10px 22px var(--system-focus-ring);
  -webkit-tap-highlight-color: transparent;
}

.profile-shell :deep(.bg-white),
.profile-shell :deep(.bg-gray-50) {
  background-color: var(--system-panel-bg);
}

.profile-shell :deep(.text-gray-500),
.profile-shell :deep(.text-gray-600),
.profile-shell :deep(.text-gray-700),
.profile-shell :deep(.text-gray-900) {
  color: var(--system-text-muted);
}

.profile-shell :deep(.border-gray-100),
.profile-shell :deep(.border-gray-200) {
  border-color: var(--system-control-border);
}

.profile-shell :deep(.bg-blue-500) {
  color: var(--system-on-accent);
  background-color: var(--system-accent);
}

.profile-shell :deep(.bg-green-500) {
  color: var(--system-on-success);
  background-color: var(--system-success);
}

.profile-shell :deep(.hover\:bg-blue-600:hover) {
  background-color: var(--system-pressed-bg);
}

@media (prefers-reduced-motion: reduce) {
  .profile-save-button {
    transition: none;
  }
}
</style>
