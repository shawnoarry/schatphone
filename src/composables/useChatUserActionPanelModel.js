import { computed, reactive, ref, watch } from 'vue'
import { GALLERY_ASSET_CATEGORIES } from '../stores/gallery'

export const CHAT_USER_MEDIA_KINDS = Object.freeze({
  IMAGE: 'image',
  GIF: 'gif',
})

export const CHAT_USER_ACTION_FORMS = Object.freeze({
  NONE: '',
  LINK: 'link',
  TRANSFER: 'transfer',
  VOICE: 'voice',
  GALLERY: 'gallery',
})

const translateWith = (t, zh, en) => (typeof t === 'function' ? t(zh, en) : en || zh)

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')

const isKnownUserActionForm = (formType) =>
  formType === CHAT_USER_ACTION_FORMS.LINK ||
  formType === CHAT_USER_ACTION_FORMS.TRANSFER ||
  formType === CHAT_USER_ACTION_FORMS.VOICE ||
  formType === CHAT_USER_ACTION_FORMS.GALLERY

export const normalizeExternalUrl = (value) => {
  const raw = normalizeString(value)
  if (!raw) return ''
  const candidate = /^https?:\/\//i.test(raw) ? raw : /^www\./i.test(raw) ? `https://${raw}` : ''
  if (!candidate) return ''
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

export const useChatUserActionPanelModel = ({
  galleryStore,
  activeChat,
  activeRoleAssetContext,
  currentLocationText,
  primaryCurrency,
  canActiveChatCommunicate,
  resolveFolderAssetsByCategory,
  closeMessageActions,
  showUiNotice,
  previewScopeId = 'chat-view',
  t,
} = {}) => {
  const translate = (zh, en) => translateWith(t, zh, en)

  const showUserActionPanel = ref(false)
  const pendingUserMediaKind = ref(CHAT_USER_MEDIA_KINDS.IMAGE)
  const userActionFormType = ref(CHAT_USER_ACTION_FORMS.NONE)
  const galleryPickerCategory = ref('all')

  const userActionDraft = reactive({
    linkUrl: 'https://',
    linkTitle: '',
    linkNote: '',
    transferAmount: '',
    transferCurrency: primaryCurrency?.value || 'CNY',
    transferNote: '',
    voiceTranscript: '',
    voiceDurationSec: 8,
  })

  const galleryPickerPreviewMap = reactive({})

  const notify = (type, message) => {
    if (typeof showUiNotice === 'function') showUiNotice(type, message)
  }

  const galleryCategoryLabel = (categoryKey) => {
    if (categoryKey === 'all') return translate('全部', 'All')
    if (categoryKey === 'wallpaper') return translate('壁纸', 'Wallpaper')
    if (categoryKey === 'emoji') return translate('表情', 'Emoji')
    if (categoryKey === 'reference') return translate('参考图', 'Reference')
    if (categoryKey === 'scenario') return translate('场景图', 'Scenario')
    return categoryKey
  }

  const galleryPickerCategoryOptions = computed(() => [
    { value: 'all', label: galleryCategoryLabel('all') },
    ...GALLERY_ASSET_CATEGORIES.map((categoryKey) => ({
      value: categoryKey,
      label: galleryCategoryLabel(categoryKey),
    })),
  ])

  const galleryPickerAssets = computed(() => {
    const getAssetsByCategory =
      typeof galleryStore?.getAssetsByCategory === 'function'
        ? galleryStore.getAssetsByCategory.bind(galleryStore)
        : () => []
    const baseList = getAssetsByCategory(galleryPickerCategory.value)
    const chatId = Number(activeChat?.value?.id)
    if (!Number.isFinite(chatId) || chatId <= 0) {
      return baseList.slice(0, 36)
    }

    const context = activeRoleAssetContext?.value || {}
    const preferredId = context.preferredImageAssetId || ''
    const profileIdSet = new Set(
      Array.isArray(context.profileAssetIds) ? context.profileAssetIds : [],
    )
    const categoryFolderAssets =
      typeof resolveFolderAssetsByCategory === 'function'
        ? resolveFolderAssetsByCategory(galleryPickerCategory.value)
        : null
    const folderIdSet = new Set(
      Array.isArray(categoryFolderAssets?.assetIds)
        ? categoryFolderAssets.assetIds
        : Array.isArray(context.profileFolderAssetIds)
          ? context.profileFolderAssetIds
          : [],
    )

    const sorted = [...baseList].sort((left, right) => {
      const getPriority = (asset) => {
        const preferredBoost = preferredId && asset.id === preferredId ? 100 : 0
        const folderBoost = folderIdSet.has(asset.id) ? 10 : 0
        const profileBoost = profileIdSet.has(asset.id) ? 1 : 0
        return preferredBoost + folderBoost + profileBoost
      }
      const leftPriority = getPriority(left)
      const rightPriority = getPriority(right)
      if (leftPriority !== rightPriority) return rightPriority - leftPriority
      return (right.updatedAt || 0) - (left.updatedAt || 0)
    })

    return sorted.slice(0, 36)
  })

  const gallerySendState = computed(() => {
    const total = Array.isArray(galleryStore?.assets) ? galleryStore.assets.length : 0
    if (total > 0) {
      return {
        enabled: true,
        message: translate('可从素材库选择发送。', 'Assets are available to send.'),
      }
    }
    return {
      enabled: false,
      message: translate('素材库为空，请先在相册导入素材。', 'Asset library is empty. Import assets in Gallery first.'),
    }
  })

  const locationShareState = computed(() => {
    const raw = normalizeString(currentLocationText?.value)
    if (!raw || raw.includes('未设置') || raw.toLowerCase().includes('not set')) {
      return {
        enabled: false,
        message: translate('请先在地图中设置当前位置。', 'Set current location in Map first.'),
      }
    }
    return {
      enabled: true,
      message: translate('可发送当前位置。', 'Current location is ready to send.'),
    }
  })

  const userActionGridHint = computed(() => {
    const hints = []
    if (!gallerySendState.value.enabled) hints.push(gallerySendState.value.message)
    if (!locationShareState.value.enabled) hints.push(locationShareState.value.message)
    if (hints.length > 0) return hints.join(' · ')
    return translate(
      '可通过 + 面板发送图片、链接、位置、转账、语音卡片与购物建议。',
      'Use + panel to send images, links, location, transfer cards, voice cards and shopping picks.',
    )
  })

  const linkFormState = computed(() => {
    const normalizedUrl = normalizeExternalUrl(userActionDraft.linkUrl)
    if (!normalizedUrl) {
      return {
        valid: false,
        message: translate('链接格式无效，仅支持 http/https。', 'Invalid URL. Only http/https is supported.'),
        url: '',
        label: '',
        note: '',
      }
    }

    const label = normalizeString(userActionDraft.linkTitle) || translate('外部链接', 'External link')
    const note = normalizeString(userActionDraft.linkNote)
    return {
      valid: true,
      message: translate('链接格式可用。', 'URL format looks good.'),
      url: normalizedUrl,
      label,
      note,
    }
  })

  const transferFormState = computed(() => {
    const amount = normalizeString(userActionDraft.transferAmount)
    if (!amount) {
      return {
        valid: false,
        message: translate('请输入转账金额。', 'Please enter transfer amount.'),
        amount: '',
        currency: '',
        note: '',
      }
    }
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      return {
        valid: false,
        message: translate('金额格式无效。', 'Invalid amount format.'),
        amount: '',
        currency: '',
        note: '',
      }
    }

    const rawCurrency = normalizeString(userActionDraft.transferCurrency)
    const currency = rawCurrency ? rawCurrency.toUpperCase() : primaryCurrency?.value || 'CNY'
    if (!/^[A-Z]{2,8}$/.test(currency)) {
      return {
        valid: false,
        message: translate('币种格式无效。', 'Invalid currency format.'),
        amount: '',
        currency: '',
        note: '',
      }
    }

    return {
      valid: true,
      message: translate('转账卡片信息可发送。', 'Transfer card is ready to send.'),
      amount,
      currency,
      note: normalizeString(userActionDraft.transferNote),
    }
  })

  const voiceFormState = computed(() => {
    const transcript = normalizeString(userActionDraft.voiceTranscript)
    if (!transcript) {
      return {
        valid: false,
        message: translate('语音内容不能为空。', 'Voice transcript cannot be empty.'),
        transcript: '',
        durationSec: 0,
      }
    }

    const duration = Number(userActionDraft.voiceDurationSec)
    if (!Number.isFinite(duration)) {
      return {
        valid: false,
        message: translate('时长格式无效。', 'Invalid duration format.'),
        transcript: '',
        durationSec: 0,
      }
    }

    return {
      valid: true,
      message: translate('语音卡片信息可发送。', 'Voice card is ready to send.'),
      transcript,
      durationSec: Math.min(600, Math.max(1, Math.floor(duration))),
    }
  })

  const resetUserActionDraft = () => {
    userActionDraft.linkUrl = 'https://'
    userActionDraft.linkTitle = ''
    userActionDraft.linkNote = ''
    userActionDraft.transferAmount = ''
    userActionDraft.transferCurrency = primaryCurrency?.value || 'CNY'
    userActionDraft.transferNote = ''
    userActionDraft.voiceTranscript = ''
    userActionDraft.voiceDurationSec = 8
  }

  const backToUserActionGrid = () => {
    userActionFormType.value = CHAT_USER_ACTION_FORMS.NONE
  }

  const clearGalleryPickerPreviewMap = () => {
    Object.keys(galleryPickerPreviewMap).forEach((assetId) => {
      if (typeof galleryStore?.releaseAssetPreview === 'function') {
        galleryStore.releaseAssetPreview(assetId, previewScopeId)
      }
      delete galleryPickerPreviewMap[assetId]
    })
  }

  const closeUserActionPanel = () => {
    showUserActionPanel.value = false
    backToUserActionGrid()
    galleryPickerCategory.value = 'all'
    clearGalleryPickerPreviewMap()
    resetUserActionDraft()
  }

  const toggleUserActionPanel = () => {
    if (!canActiveChatCommunicate?.value) {
      notify(
        'warning',
        translate(
          '当前通讯状态不允许发送附件或卡片。',
          'Current communication state does not allow attachments or cards.',
        ),
      )
      return
    }
    if (!showUserActionPanel.value) {
      if (typeof closeMessageActions === 'function') closeMessageActions()
      showUserActionPanel.value = true
      backToUserActionGrid()
      return
    }
    closeUserActionPanel()
  }

  const resolveInitialGalleryCategory = () => {
    const context = activeRoleAssetContext?.value || {}
    if (context.preferredImageAssetId) {
      const preferredAsset =
        typeof galleryStore?.findAssetById === 'function'
          ? galleryStore.findAssetById(context.preferredImageAssetId)
          : null
      if (preferredAsset?.category) return preferredAsset.category
    }
    if ((context.profileAssetPack?.referenceAssetIds || []).length > 0) return 'reference'
    if ((context.profileAssetPack?.scenarioAssetIds || []).length > 0) return 'scenario'
    if ((context.profileAssetPack?.emojiAssetIds || []).length > 0) return 'emoji'
    return galleryPickerCategory.value
  }

  const openUserActionForm = (formType) => {
    const nextType = isKnownUserActionForm(formType)
      ? formType
      : CHAT_USER_ACTION_FORMS.NONE
    if (nextType === CHAT_USER_ACTION_FORMS.GALLERY && !gallerySendState.value.enabled) {
      notify('warning', gallerySendState.value.message)
      return
    }
    showUserActionPanel.value = true
    userActionFormType.value = nextType
    if (nextType === CHAT_USER_ACTION_FORMS.GALLERY) {
      galleryPickerCategory.value = resolveInitialGalleryCategory()
    }
  }

  const updateUserActionDraft = ({ key, value } = {}) => {
    if (typeof key !== 'string' || !(key in userActionDraft)) return
    userActionDraft[key] = value
  }

  const setGalleryPickerCategory = (category) => {
    const normalized = normalizeString(category) || 'all'
    galleryPickerCategory.value = normalized
  }

  const ensureGalleryPickerPreview = async (assetId) => {
    if (!assetId || galleryPickerPreviewMap[assetId]) return
    if (typeof galleryStore?.getAssetPreviewUrl !== 'function') return
    const previewUrl = await galleryStore.getAssetPreviewUrl(assetId, {
      scopeId: previewScopeId,
    })
    if (!previewUrl) return
    galleryPickerPreviewMap[assetId] = previewUrl
  }

  watch(
    galleryPickerAssets,
    (assets) => {
      if (!showUserActionPanel.value || userActionFormType.value !== CHAT_USER_ACTION_FORMS.GALLERY) return
      const activeIds = new Set(assets.map((asset) => asset.id))
      assets.forEach((asset) => {
        void ensureGalleryPickerPreview(asset.id)
      })
      Object.keys(galleryPickerPreviewMap).forEach((assetId) => {
        if (!activeIds.has(assetId)) {
          if (typeof galleryStore?.releaseAssetPreview === 'function') {
            galleryStore.releaseAssetPreview(assetId, previewScopeId)
          }
          delete galleryPickerPreviewMap[assetId]
        }
      })
    },
    { immediate: true },
  )

  watch(
    () => ({
      panelOpened: showUserActionPanel.value,
      formType: userActionFormType.value,
      category: galleryPickerCategory.value,
    }),
    () => {
      if (!showUserActionPanel.value || userActionFormType.value !== CHAT_USER_ACTION_FORMS.GALLERY) return
      galleryPickerAssets.value.forEach((asset) => {
        void ensureGalleryPickerPreview(asset.id)
      })
    },
  )

  return {
    showUserActionPanel,
    pendingUserMediaKind,
    userActionFormType,
    userActionDraft,
    galleryPickerCategory,
    galleryPickerCategoryOptions,
    galleryPickerAssets,
    galleryPickerPreviewMap,
    gallerySendState,
    locationShareState,
    userActionGridHint,
    linkFormState,
    transferFormState,
    voiceFormState,
    normalizeExternalUrl,
    resetUserActionDraft,
    backToUserActionGrid,
    closeUserActionPanel,
    toggleUserActionPanel,
    openUserActionForm,
    updateUserActionDraft,
    setGalleryPickerCategory,
    clearGalleryPickerPreviewMap,
  }
}
