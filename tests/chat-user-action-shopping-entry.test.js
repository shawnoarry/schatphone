import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ChatUserActionPanel from '../src/components/chat/ChatUserActionPanel.vue'

const createBaseProps = () => ({
  userActionFormType: '',
  userActionDraft: {
    linkUrl: 'https://',
    linkTitle: '',
    linkNote: '',
    transferAmount: '',
    transferCurrency: 'CNY',
    transferNote: '',
    voiceTranscript: '',
    voiceDurationSec: 8,
  },
  gallerySendState: {
    enabled: true,
    message: 'Assets can be sent.',
  },
  locationShareState: {
    enabled: true,
    message: 'Location can be sent.',
  },
  userActionGridHint: 'Chat can recommend products, but Shopping owns checkout.',
  linkFormState: {
    valid: true,
    message: '',
  },
  transferFormState: {
    valid: true,
    message: '',
  },
  voiceFormState: {
    valid: true,
    message: '',
  },
  galleryPickerCategory: 'all',
  galleryPickerCategoryOptions: [],
  activeRoleAssetContext: {
    profileId: 0,
    profileName: '',
    preferredImageAssetId: '',
    profileAssetPack: {},
    profileAssetIds: [],
    profileFolderAssetIds: [],
  },
  galleryPickerAssets: [],
  galleryPickerPreviewMap: {},
  shoppingPreviewProducts: [
    {
      id: 'shopping_preview_lens',
      title: 'Mira Lens',
      category: 'digital',
      desc: 'Portable camera lens',
      price: '1288.00 CNY',
      serviceKey: 'nova_digital',
      serviceLabel: 'Nova Digital',
      assetEligible: true,
      shareType: 'product_link',
      shareLabel: 'Product link',
      giftable: false,
    },
  ],
  suggestionFeatureEnabled: false,
  loadingSuggestions: false,
  loadingAI: false,
})

describe('ChatUserActionPanel Shopping entry', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('keeps Shopping as a compact source launcher without embedding its catalog', async () => {
    const wrapper = mount(ChatUserActionPanel, {
      props: createBaseProps(),
    })

    const shoppingButton = wrapper.get('[data-testid="chat-user-action-open-shopping"]')
    expect(shoppingButton.text()).toMatch(/商品|Shopping/)
    expect(wrapper.text()).not.toContain('Mira Lens')
    expect(wrapper.find('[data-testid="chat-shopping-preview-shopping_preview_lens"]').exists()).toBe(false)

    await shoppingButton.trigger('click')

    expect(wrapper.emitted('open-shopping')).toHaveLength(1)
    expect(wrapper.emitted('submit-transfer-card-form')).toBeUndefined()
    expect(wrapper.emitted('submit-gallery-asset')).toBeUndefined()
    expect(wrapper.emitted('send-product-card')).toBeUndefined()
    wrapper.unmount()
  })
})
