import { describe, expect, test, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import {
  CHAT_USER_ACTION_FORMS,
  CHAT_USER_MEDIA_KINDS,
  useChatUserActionPanelModel,
} from '../src/composables/useChatUserActionPanelModel'

const t = (zh, en) => en || zh

const flushPromises = () => new Promise((resolve) => {
  setTimeout(resolve, 0)
})

const createGalleryStore = ({
  assets = [],
  previewUrls = {},
} = {}) => ({
  assets,
  getAssetsByCategory: vi.fn((category) =>
    assets.filter((asset) => category === 'all' || asset.category === category),
  ),
  findAssetById: vi.fn((assetId) => assets.find((asset) => asset.id === assetId) || null),
  getAssetPreviewUrl: vi.fn(async (assetId) => previewUrls[assetId] || `blob:${assetId}`),
  releaseAssetPreview: vi.fn(),
})

const createModel = ({
  galleryStore = createGalleryStore(),
  activeChat = { id: 1 },
  activeRoleAssetContext = {},
  currentLocationText = 'Seoul Station',
  primaryCurrency = 'CNY',
  canCommunicate = true,
  closeMessageActions = vi.fn(),
  showUiNotice = vi.fn(),
  resolveFolderAssetsByCategory,
} = {}) =>
  useChatUserActionPanelModel({
    galleryStore,
    activeChat: ref(activeChat),
    activeRoleAssetContext: ref({
      profileAssetPack: {},
      profileAssetIds: [],
      profileFolderAssetIds: [],
      ...activeRoleAssetContext,
    }),
    currentLocationText: ref(currentLocationText),
    primaryCurrency: ref(primaryCurrency),
    canActiveChatCommunicate: ref(canCommunicate),
    closeMessageActions,
    showUiNotice,
    resolveFolderAssetsByCategory,
    previewScopeId: 'test-scope',
    t,
  })

describe('Chat user action panel model interface', () => {
  test('opens and closes the panel while keeping message actions mutually exclusive', () => {
    const closeMessageActions = vi.fn()
    const model = createModel({ closeMessageActions, primaryCurrency: 'USD' })

    model.updateUserActionDraft({ key: 'transferAmount', value: '88.00' })
    model.updateUserActionDraft({ key: 'transferCurrency', value: 'KRW' })

    model.toggleUserActionPanel()

    expect(closeMessageActions).toHaveBeenCalledTimes(1)
    expect(model.showUserActionPanel.value).toBe(true)
    expect(model.userActionFormType.value).toBe(CHAT_USER_ACTION_FORMS.NONE)

    model.openUserActionForm(CHAT_USER_ACTION_FORMS.TRANSFER)
    expect(model.userActionFormType.value).toBe(CHAT_USER_ACTION_FORMS.TRANSFER)

    model.closeUserActionPanel()
    expect(model.showUserActionPanel.value).toBe(false)
    expect(model.userActionFormType.value).toBe(CHAT_USER_ACTION_FORMS.NONE)
    expect(model.galleryPickerCategory.value).toBe('all')
    expect(model.userActionDraft.transferAmount).toBe('')
    expect(model.userActionDraft.transferCurrency).toBe('USD')
  })

  test('warns instead of opening when the active chat cannot communicate', () => {
    const showUiNotice = vi.fn()
    const closeMessageActions = vi.fn()
    const model = createModel({
      canCommunicate: false,
      closeMessageActions,
      showUiNotice,
    })

    model.toggleUserActionPanel()

    expect(model.showUserActionPanel.value).toBe(false)
    expect(closeMessageActions).not.toHaveBeenCalled()
    expect(showUiNotice).toHaveBeenCalledWith(
      'warning',
      'Current communication state does not allow attachments or cards.',
    )
  })

  test('validates link, transfer, and voice drafts through panel state', () => {
    const model = createModel({ primaryCurrency: 'CRD' })

    expect(model.linkFormState.value.valid).toBe(false)
    model.updateUserActionDraft({ key: 'linkUrl', value: 'www.example.com/path' })
    model.updateUserActionDraft({ key: 'linkTitle', value: ' Example ' })
    model.updateUserActionDraft({ key: 'linkNote', value: ' note ' })
    expect(model.linkFormState.value).toMatchObject({
      valid: true,
      url: 'https://www.example.com/path',
      label: 'Example',
      note: 'note',
    })

    model.updateUserActionDraft({ key: 'transferAmount', value: '12.345' })
    expect(model.transferFormState.value.valid).toBe(false)
    model.updateUserActionDraft({ key: 'transferAmount', value: '12.30' })
    model.updateUserActionDraft({ key: 'transferCurrency', value: '' })
    model.updateUserActionDraft({ key: 'transferNote', value: ' lunch ' })
    expect(model.transferFormState.value).toMatchObject({
      valid: true,
      amount: '12.30',
      currency: 'CRD',
      note: 'lunch',
    })

    model.updateUserActionDraft({ key: 'voiceTranscript', value: ' hello ' })
    model.updateUserActionDraft({ key: 'voiceDurationSec', value: 700 })
    expect(model.voiceFormState.value).toMatchObject({
      valid: true,
      transcript: 'hello',
      durationSec: 600,
    })
  })

  test('reports gallery and location readiness in the grid hint', () => {
    const disabledModel = createModel({
      galleryStore: createGalleryStore({ assets: [] }),
      currentLocationText: '未设置',
    })

    expect(disabledModel.gallerySendState.value.enabled).toBe(false)
    expect(disabledModel.locationShareState.value.enabled).toBe(false)
    expect(disabledModel.userActionGridHint.value).toContain('Asset library is empty')
    expect(disabledModel.userActionGridHint.value).toContain('Set current location')

    const enabledModel = createModel({
      galleryStore: createGalleryStore({
        assets: [{ id: 'a1', category: 'reference', updatedAt: 1 }],
      }),
      currentLocationText: 'Gangnam',
    })

    expect(enabledModel.gallerySendState.value.enabled).toBe(true)
    expect(enabledModel.locationShareState.value.enabled).toBe(true)
    expect(enabledModel.userActionGridHint.value).toBe(
      'Use + panel to send images, links, location, transfer cards, voice cards and shopping picks.',
    )
  })

  test('chooses the preferred gallery category and sorts role assets first', async () => {
    const galleryStore = createGalleryStore({
      assets: [
        { id: 'plain', category: 'reference', updatedAt: 50 },
        { id: 'folder', category: 'reference', updatedAt: 20 },
        { id: 'profile', category: 'reference', updatedAt: 10 },
        { id: 'preferred', category: 'scenario', updatedAt: 1 },
      ],
    })
    const model = createModel({
      galleryStore,
      activeRoleAssetContext: {
        preferredImageAssetId: 'preferred',
        profileAssetPack: {
          referenceAssetIds: ['profile'],
          scenarioAssetIds: ['preferred'],
        },
        profileAssetIds: ['profile'],
        profileFolderAssetIds: ['folder'],
      },
      resolveFolderAssetsByCategory: (category) => ({
        assetIds: category === 'reference' ? ['folder'] : [],
        sourceByAssetId: {},
      }),
    })

    model.openUserActionForm(CHAT_USER_ACTION_FORMS.GALLERY)

    expect(model.galleryPickerCategory.value).toBe('scenario')

    model.setGalleryPickerCategory('reference')
    await nextTick()
    expect(model.galleryPickerAssets.value.map((asset) => asset.id)).toEqual([
      'folder',
      'profile',
      'plain',
    ])
  })

  test('loads and releases gallery preview cache for the open gallery form', async () => {
    const galleryStore = createGalleryStore({
      assets: [
        { id: 'a1', category: 'reference', updatedAt: 1 },
        { id: 'a2', category: 'reference', updatedAt: 2 },
      ],
    })
    const model = createModel({ galleryStore })

    model.openUserActionForm(CHAT_USER_ACTION_FORMS.GALLERY)
    model.setGalleryPickerCategory('reference')
    await nextTick()
    await flushPromises()

    expect(galleryStore.getAssetPreviewUrl).toHaveBeenCalledWith('a1', { scopeId: 'test-scope' })
    expect(galleryStore.getAssetPreviewUrl).toHaveBeenCalledWith('a2', { scopeId: 'test-scope' })
    expect(model.galleryPickerPreviewMap.a1).toBe('blob:a1')
    expect(model.galleryPickerPreviewMap.a2).toBe('blob:a2')

    model.closeUserActionPanel()

    expect(galleryStore.releaseAssetPreview).toHaveBeenCalledWith('a1', 'test-scope')
    expect(galleryStore.releaseAssetPreview).toHaveBeenCalledWith('a2', 'test-scope')
    expect(model.galleryPickerPreviewMap).toEqual({})
  })

  test('normalizes media kind defaults for callers', () => {
    const model = createModel()

    expect(model.pendingUserMediaKind.value).toBe(CHAT_USER_MEDIA_KINDS.IMAGE)
  })
})
