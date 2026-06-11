<script setup>
import { useI18n } from '../../composables/useI18n'
import AssetStatusBadge from '../assets/AssetStatusBadge.vue'
import AssetThumbnailOption from '../assets/AssetThumbnailOption.vue'

defineProps({
  userActionFormType: {
    type: String,
    default: '',
  },
  userActionDraft: {
    type: Object,
    required: true,
  },
  gallerySendState: {
    type: Object,
    required: true,
  },
  locationShareState: {
    type: Object,
    required: true,
  },
  userActionGridHint: {
    type: String,
    default: '',
  },
  linkFormState: {
    type: Object,
    required: true,
  },
  transferFormState: {
    type: Object,
    required: true,
  },
  currencyOptions: {
    type: Array,
    default: () => [],
  },
  voiceFormState: {
    type: Object,
    required: true,
  },
  galleryPickerCategory: {
    type: String,
    default: 'all',
  },
  galleryPickerCategoryOptions: {
    type: Array,
    default: () => [],
  },
  activeRoleAssetContext: {
    type: Object,
    required: true,
  },
  galleryPickerAssets: {
    type: Array,
    default: () => [],
  },
  galleryPickerPreviewMap: {
    type: Object,
    default: () => ({}),
  },
  shoppingPreviewProducts: {
    type: Array,
    default: () => [],
  },
  suggestionFeatureEnabled: {
    type: Boolean,
    default: false,
  },
  loadingSuggestions: {
    type: Boolean,
    default: false,
  },
  loadingAI: {
    type: Boolean,
    default: false,
  },
})

defineEmits([
  'back-to-grid',
  'close',
  'generate-smart-replies',
  'open-form',
  'open-gallery',
  'open-shopping',
  'send-current-location',
  'send-product-card',
  'submit-gallery-asset',
  'submit-link-card-form',
  'submit-transfer-card-form',
  'submit-voice-card-form',
  'trigger-media-picker',
  'update-gallery-picker-category',
  'update-user-action-draft',
])

const { t } = useI18n()

const USER_MEDIA_KIND_IMAGE = 'image'
const USER_MEDIA_KIND_GIF = 'gif'
const USER_ACTION_FORM_NONE = ''
const USER_ACTION_FORM_LINK = 'link'
const USER_ACTION_FORM_TRANSFER = 'transfer'
const USER_ACTION_FORM_VOICE = 'voice'
const USER_ACTION_FORM_GALLERY = 'gallery'
</script>

<template>
  <div class="absolute bottom-[56px] left-3 right-3 rounded-xl border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
    <div v-if="userActionFormType === USER_ACTION_FORM_NONE" class="grid grid-cols-3 gap-2">
      <button
        data-testid="chat-user-action-open-image"
        @click="$emit('trigger-media-picker', USER_MEDIA_KIND_IMAGE)"
        class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-left hover:bg-gray-50"
      >
        {{ t('鍥剧墖', 'Image') }}
      </button>
      <button
        data-testid="chat-user-action-open-gif"
        @click="$emit('trigger-media-picker', USER_MEDIA_KIND_GIF)"
        class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-left hover:bg-gray-50"
      >
        GIF
      </button>
      <button
        data-testid="chat-user-action-open-gallery"
        @click="$emit('open-form', USER_ACTION_FORM_GALLERY)"
        :disabled="!gallerySendState.enabled"
        class="rounded-lg border px-2 py-1.5 text-[11px] text-left transition disabled:cursor-not-allowed disabled:opacity-70"
        :class="gallerySendState.enabled ? 'border-gray-200 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-500'"
      >
        {{ t('素材库', 'Asset library') }}
      </button>
      <button
        data-testid="chat-user-action-open-link"
        @click="$emit('open-form', USER_ACTION_FORM_LINK)"
        class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-left hover:bg-gray-50"
      >
        {{ t('閾炬帴', 'Link') }}
      </button>
      <button
        data-testid="chat-user-action-send-location"
        @click="$emit('send-current-location')"
        :disabled="!locationShareState.enabled"
        class="rounded-lg border px-2 py-1.5 text-[11px] text-left transition disabled:cursor-not-allowed disabled:opacity-70"
        :class="locationShareState.enabled ? 'border-gray-200 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-500'"
      >
        {{ t('浣嶇疆', 'Location') }}
      </button>
      <button
        data-testid="chat-user-action-open-transfer"
        @click="$emit('open-form', USER_ACTION_FORM_TRANSFER)"
        class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-left hover:bg-gray-50"
      >
        {{ t('杞处', 'Transfer') }}
      </button>
      <button
        data-testid="chat-user-action-open-voice"
        @click="$emit('open-form', USER_ACTION_FORM_VOICE)"
        class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-left hover:bg-gray-50"
      >
        {{ t('璇煶鍗＄墖', 'Voice card') }}
      </button>
      <button
        data-testid="chat-user-action-open-shopping"
        @click="$emit('open-shopping')"
        class="rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-left text-[11px] text-orange-700 transition hover:bg-orange-100"
      >
        <span class="block font-semibold">{{ t('璐墿寤鸿', 'Shopping pick') }}</span>
        <span class="block text-[10px] text-orange-500">{{ t('鍘?Shopping 纭', 'Confirm in Shopping') }}</span>
      </button>
    </div>
    <div
      v-if="userActionFormType === USER_ACTION_FORM_NONE && shoppingPreviewProducts.length > 0"
      class="mt-2 rounded-xl border border-orange-100 bg-orange-50/70 p-2"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-[11px] font-semibold text-orange-800">{{ t('鍙鍟嗗搧棰勮', 'Read-only product preview') }}</p>
        <span class="text-[10px] text-orange-500">{{ t('缁撶畻浠嶅湪 Shopping', 'Checkout stays in Shopping') }}</span>
      </div>
      <div class="mt-2 grid grid-cols-1 gap-2">
        <button
          v-for="product in shoppingPreviewProducts"
          :key="product.id"
          :data-testid="`chat-shopping-preview-${product.id}`"
          @click="$emit('open-shopping', { productId: product.id, category: product.category, serviceKey: product.serviceKey })"
          class="rounded-lg border border-orange-100 bg-white/80 px-2 py-2 text-left transition hover:border-orange-200 hover:bg-white"
        >
          <span class="flex items-start justify-between gap-2">
            <span class="min-w-0">
              <span class="block truncate text-[11px] font-semibold text-gray-900">{{ product.title }}</span>
              <span
                v-if="product.serviceLabel || product.serviceKey"
                class="mt-0.5 block truncate text-[10px] font-semibold text-amber-700"
              >
                {{ product.serviceLabel || product.serviceKey }}
              </span>
              <span class="mt-0.5 block truncate text-[10px] text-gray-500">{{ product.desc || t('鏉ヨ嚜 Shopping 鍟嗗搧鐩綍', 'From Shopping catalog') }}</span>
            </span>
            <span class="shrink-0 text-[10px] font-semibold text-orange-600">{{ product.price }}</span>
          </span>
          <span class="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-gray-500">
            <span class="rounded-full bg-orange-50 px-1.5 py-0.5 text-orange-600">{{ product.category }}</span>
            <span
              v-if="product.serviceLabel || product.serviceKey"
              class="rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-700"
            >
              {{ product.serviceLabel || product.serviceKey }}
            </span>
            <span v-if="product.assetEligible" class="rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-600">
              {{ t('鍙浆璧勪骇', 'Asset-ready') }}
            </span>
            <span v-if="product.giftable" class="rounded-full bg-rose-50 px-1.5 py-0.5 text-rose-600">
              {{ t('可赠送', 'Giftable') }}
            </span>
          </span>
          <span class="mt-2 flex items-center gap-2">
            <span
              role="button"
              tabindex="0"
              :data-testid="`chat-send-product-card-${product.id}`"
              @click.stop="$emit('send-product-card', product)"
              @keydown.enter.prevent.stop="$emit('send-product-card', product)"
              @keydown.space.prevent.stop="$emit('send-product-card', product)"
              class="rounded-full bg-orange-500 px-2 py-1 text-[10px] font-semibold text-white"
            >
              {{ t('鍙戦€佸晢鍝佸崱', 'Send card') }}
            </span>
            <span class="text-[10px] text-orange-600">{{ t('鐐瑰崱鐗囧幓纭', 'Tap card to confirm') }}</span>
          </span>
        </button>
      </div>
    </div>
    <p
      v-if="userActionFormType === USER_ACTION_FORM_NONE"
      class="mt-2 text-[10px]"
      :class="gallerySendState.enabled && locationShareState.enabled ? 'text-gray-500' : 'text-amber-600'"
    >
      {{ userActionGridHint }}
    </p>

    <div v-else-if="userActionFormType === USER_ACTION_FORM_LINK" class="space-y-2">
      <p class="text-[11px] font-medium text-gray-700">{{ t('发送链接', 'Send link') }}</p>
      <input
        data-testid="chat-user-action-link-url"
        :value="userActionDraft.linkUrl"
        @input="$emit('update-user-action-draft', { key: 'linkUrl', value: $event.target.value })"
        @keydown.enter.prevent="$emit('submit-link-card-form')"
        type="text"
        class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none"
        :placeholder="t('链接地址（http/https）', 'URL (http/https)')"
      />
      <input
        data-testid="chat-user-action-link-title"
        :value="userActionDraft.linkTitle"
        @input="$emit('update-user-action-draft', { key: 'linkTitle', value: $event.target.value })"
        type="text"
        class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none"
        :placeholder="t('閾炬帴鏍囬锛堝彲閫夛級', 'Link title (optional)')"
      />
      <input
        data-testid="chat-user-action-link-note"
        :value="userActionDraft.linkNote"
        @input="$emit('update-user-action-draft', { key: 'linkNote', value: $event.target.value })"
        type="text"
        class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none"
        :placeholder="t('闄勫姞璇存槑锛堝彲閫夛級', 'Note (optional)')"
      />
      <p
        class="text-[10px]"
        :class="linkFormState.valid ? 'text-gray-500' : 'text-amber-600'"
      >
        {{ linkFormState.message }}
      </p>
      <div class="flex items-center justify-end gap-2">
        <button
          data-testid="chat-user-action-link-back"
          @click="$emit('back-to-grid')"
          class="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
        >
          {{ t('杩斿洖', 'Back') }}
        </button>
        <button
          data-testid="chat-user-action-submit-link"
          @click="$emit('submit-link-card-form')"
          :disabled="!linkFormState.valid"
          class="rounded-lg border px-2 py-1 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="linkFormState.valid ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-gray-100 text-gray-500'"
        >
          {{ t('发送链接', 'Send link') }}
        </button>
      </div>
    </div>

    <div v-else-if="userActionFormType === USER_ACTION_FORM_TRANSFER" class="space-y-2">
      <p class="text-[11px] font-medium text-gray-700">{{ t('发送转账卡片', 'Send transfer card') }}</p>
      <div class="grid grid-cols-3 gap-2">
        <input
          data-testid="chat-user-action-transfer-amount"
          :value="userActionDraft.transferAmount"
          @input="$emit('update-user-action-draft', { key: 'transferAmount', value: $event.target.value })"
          @keydown.enter.prevent="$emit('submit-transfer-card-form')"
          type="text"
          inputmode="decimal"
          class="col-span-2 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none"
          :placeholder="t('閲戦锛屽 88.00', 'Amount, e.g. 88.00')"
        />
        <select
          data-testid="chat-user-action-transfer-currency"
          :value="userActionDraft.transferCurrency"
          @change="$emit('update-user-action-draft', { key: 'transferCurrency', value: $event.target.value })"
          class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] uppercase outline-none"
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
        data-testid="chat-user-action-transfer-note"
        :value="userActionDraft.transferNote"
        @input="$emit('update-user-action-draft', { key: 'transferNote', value: $event.target.value })"
        type="text"
        class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none"
        :placeholder="t('杞处澶囨敞锛堝彲閫夛級', 'Transfer note (optional)')"
      />
      <p
        class="text-[10px]"
        :class="transferFormState.valid ? 'text-gray-500' : 'text-amber-600'"
      >
        {{ transferFormState.message }}
      </p>
      <div class="flex items-center justify-end gap-2">
        <button
          @click="$emit('back-to-grid')"
          class="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
        >
          {{ t('杩斿洖', 'Back') }}
        </button>
        <button
          data-testid="chat-user-action-submit-transfer"
          @click="$emit('submit-transfer-card-form')"
          :disabled="!transferFormState.valid"
          class="rounded-lg border px-2 py-1 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="transferFormState.valid ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-gray-100 text-gray-500'"
        >
          {{ t('发送转账', 'Send transfer') }}
        </button>
      </div>
    </div>

    <div v-else-if="userActionFormType === USER_ACTION_FORM_VOICE" class="space-y-2">
      <p class="text-[11px] font-medium text-gray-700">{{ t('发送语音卡片', 'Send voice card') }}</p>
      <textarea
        data-testid="chat-user-action-voice-transcript"
        :value="userActionDraft.voiceTranscript"
        @input="$emit('update-user-action-draft', { key: 'voiceTranscript', value: $event.target.value })"
        rows="2"
        class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none resize-none"
        :placeholder="t('杈撳叆璇煶鍐呭', 'Enter voice transcript')"
      ></textarea>
      <div class="flex items-center gap-2">
        <span class="text-[11px] text-gray-600">{{ t('时长（秒）', 'Duration (sec)') }}</span>
        <input
          data-testid="chat-user-action-voice-duration"
          :value="userActionDraft.voiceDurationSec"
          @input="$emit('update-user-action-draft', { key: 'voiceDurationSec', value: Number($event.target.value) })"
          type="number"
          min="1"
          max="600"
          class="w-20 rounded-lg border border-gray-200 px-2 py-1 text-[11px] outline-none"
        />
      </div>
      <p
        class="text-[10px]"
        :class="voiceFormState.valid ? 'text-gray-500' : 'text-amber-600'"
      >
        {{ voiceFormState.message }}
      </p>
      <div class="flex items-center justify-end gap-2">
        <button
          @click="$emit('back-to-grid')"
          class="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
        >
          {{ t('杩斿洖', 'Back') }}
        </button>
        <button
          data-testid="chat-user-action-submit-voice"
          @click="$emit('submit-voice-card-form')"
          :disabled="!voiceFormState.valid"
          class="rounded-lg border px-2 py-1 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="voiceFormState.valid ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-gray-100 text-gray-500'"
        >
          {{ t('发送语音卡片', 'Send voice card') }}
        </button>
      </div>
    </div>

    <div v-else-if="userActionFormType === USER_ACTION_FORM_GALLERY" class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <p class="text-[11px] font-medium text-gray-700">{{ t('从素材库发送', 'Send from asset library') }}</p>
        <select
          :value="galleryPickerCategory"
          @change="$emit('update-gallery-picker-category', $event.target.value)"
          class="rounded-lg border border-gray-200 px-1.5 py-1 text-[11px] bg-white"
        >
          <option
            v-for="option in galleryPickerCategoryOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
      <p
        v-if="activeRoleAssetContext.profileId"
        class="text-[10px] text-gray-500"
      >
        {{
          activeRoleAssetContext.preferredImageAssetId
            ? `${t('会话优先素材已启用', 'Thread preferred asset is enabled')} · ${activeRoleAssetContext.profileName || t('角色档案', 'Profile')}`
            : activeRoleAssetContext.profileFolderAssetIds.length > 0
              ? `${t('正在读取角色素材包与文件夹绑定', 'Using profile pack and folder bindings')} · ${activeRoleAssetContext.profileName || t('角色档案', 'Profile')}`
              : `${t('正在读取角色素材包', 'Using profile-bound asset pack')} · ${activeRoleAssetContext.profileName || t('角色档案', 'Profile')}`
        }}
      </p>

      <div
        v-if="galleryPickerAssets.length === 0"
        class="rounded-lg border border-dashed border-gray-200 px-2 py-3 text-[11px] text-gray-500 text-center"
      >
        {{ t('该分类暂无素材，请先在相册导入。', 'No assets in this category. Import in Gallery first.') }}
      </div>

      <div v-else class="max-h-48 overflow-y-auto pr-0.5 grid grid-cols-2 gap-2">
        <AssetThumbnailOption
          v-for="asset in galleryPickerAssets"
          :key="asset.id"
          :data-testid="`chat-user-action-gallery-asset-${asset.id}`"
          :asset="asset"
          :preview-url="galleryPickerPreviewMap[asset.id]"
          @select="$emit('submit-gallery-asset', asset)"
        >
          <template #badges>
            <AssetStatusBadge
              v-if="activeRoleAssetContext.preferredImageAssetId && asset.id === activeRoleAssetContext.preferredImageAssetId"
              label-zh="会话优先"
              label-en="Thread preferred"
              icon="fas fa-star"
              :truncate="false"
              class="mt-1"
            />
            <AssetStatusBadge
              v-else-if="activeRoleAssetContext.profileFolderAssetIds.includes(asset.id)"
              label-zh="文件夹绑定"
              label-en="Folder bound"
              icon="fas fa-folder"
              tone="amber"
              :truncate="false"
              class="mt-1"
            />
            <AssetStatusBadge
              v-else-if="activeRoleAssetContext.profileAssetIds.includes(asset.id)"
              label-zh="角色素材包"
              label-en="Profile pack"
              icon="fas fa-images"
              tone="emerald"
              :truncate="false"
              class="mt-1"
            />
          </template>
        </AssetThumbnailOption>
      </div>

      <div class="flex items-center justify-end gap-2">
        <button
          @click="$emit('back-to-grid')"
          class="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
        >
          {{ t('杩斿洖', 'Back') }}
        </button>
        <button
          @click="$emit('open-gallery')"
          class="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] text-blue-700 hover:bg-blue-100"
        >
          {{ t('鎵撳紑鐩稿唽', 'Open Gallery') }}
        </button>
      </div>
    </div>

    <div class="mt-2 flex items-center justify-between gap-2">
      <button
        v-if="suggestionFeatureEnabled && userActionFormType === USER_ACTION_FORM_NONE"
        @click="$emit('generate-smart-replies')"
        class="rounded-lg border border-emerald-200 px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50"
        :disabled="loadingSuggestions || loadingAI"
      >
        <span v-if="loadingSuggestions">{{ t('鐢熸垚涓?..', 'Generating...') }}</span>
        <span v-else>{{ t('鐢熸垚寤鸿鍥炲', 'Generate suggested replies') }}</span>
      </button>
      <button
        @click="$emit('close')"
        class="ml-auto rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
      >
        {{ t('鏀惰捣', 'Collapse') }}
      </button>
    </div>
  </div>
</template>
