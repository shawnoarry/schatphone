import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ChatView from '../src/views/ChatView.vue'
import ChatDirectoryView from '../src/views/ChatDirectoryView.vue'
import { useChatStore } from '../src/stores/chat'
import { useGalleryStore } from '../src/stores/gallery'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat', component: ChatView },
      { path: '/chat/:id', component: ChatView },
      { path: '/chat-contacts', component: ChatDirectoryView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/wallet', component: DummyView },
      { path: '/network', component: DummyView },
      { path: '/chat-feature/:feature', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const createGalleryRoleBinding = ({ chatStore, galleryStore, name = 'Gallery Nova' } = {}) => {
  const imported = galleryStore.importAssetFromUrl({
    url: 'https://example.com/contact-gallery-avatar.png',
    name: `${name} Avatar`,
    category: 'reference',
  })
  expect(imported.ok).toBe(true)

  const profile = chatStore.addRoleProfile({
    name,
    role: 'Gallery Contact',
    avatarImage: {
      sourceType: 'gallery',
      galleryAssetId: imported.assetId,
    },
  })
  const binding = chatStore.bindRoleProfile(profile.id)
  expect(binding).toBeTruthy()

  return {
    binding,
    avatarUrl: 'https://example.com/contact-gallery-avatar.png',
  }
}

describe('chat avatar image source rendering', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('renders Gallery avatar sources in Chat list and active conversation while preserving module overrides', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const galleryStore = useGalleryStore()
    const systemStore = useSystemStore()
    galleryStore.resetForTesting()

    const { binding, avatarUrl } = createGalleryRoleBinding({ chatStore, galleryStore })
    chatStore.appendMessage(binding.id, {
      role: 'assistant',
      content: 'Assistant avatar check.',
    })
    chatStore.appendMessage(binding.id, {
      role: 'user',
      content: 'Self avatar check.',
    })

    const importedUserAvatar = galleryStore.importAssetFromUrl({
      url: 'https://example.com/user-gallery-chat-avatar.png',
      name: 'User Chat Avatar',
      category: 'reference',
    })
    expect(importedUserAvatar.ok).toBe(true)
    systemStore.user.avatar = ''
    systemStore.user.avatarImage = {
      sourceType: 'gallery',
      galleryAssetId: importedUserAvatar.assetId,
    }
    systemStore.setChatAppearance({ messageLayout: 'wechat' })

    await router.push('/chat')
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get(`[data-testid="chat-contact-avatar-${binding.id}"]`).attributes('src')).toBe(avatarUrl)

    await router.push(`/chat/${binding.id}`)
    await flushUi()

    expect(wrapper.get('[data-testid="chat-active-contact-avatar"]').attributes('src')).toBe(avatarUrl)
    expect(wrapper.get('.chat-shell').classes()).toContain('chat-layout-wechat')
    expect(wrapper.get('[data-testid="chat-active-self-avatar"]').attributes('src')).toBe(
      'https://example.com/user-gallery-chat-avatar.png',
    )

    chatStore.setModuleContactAvatarOverride(binding.id, 'https://example.com/module-contact-avatar.png')
    await flushUi()

    expect(wrapper.get('[data-testid="chat-active-contact-avatar"]').attributes('src')).toBe(
      'https://example.com/module-contact-avatar.png',
    )

    wrapper.unmount()
  })

  test('renders Gallery avatar sources in ChatDirectory role bindings', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const galleryStore = useGalleryStore()
    galleryStore.resetForTesting()

    const { binding, avatarUrl } = createGalleryRoleBinding({
      chatStore,
      galleryStore,
      name: 'Directory Gallery Nova',
    })

    await router.push('/chat-contacts')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get(`[data-testid="chat-directory-contact-avatar-${binding.id}"]`).attributes('src')).toBe(
      avatarUrl,
    )

    wrapper.unmount()
  })

  test('stores and renders Gallery avatar sources for ChatDirectory service accounts', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const galleryStore = useGalleryStore()
    galleryStore.resetForTesting()
    const imported = galleryStore.importAssetFromUrl({
      url: 'https://example.com/service-gallery-avatar.png',
      name: 'Service Avatar',
      category: 'reference',
    })
    expect(imported.ok).toBe(true)

    await router.push('/chat-contacts')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-directory-section-service"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-directory-add-service"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-directory-service-name"]').setValue('Gallery Service')
    await wrapper.get('[data-testid="chat-directory-service-avatar-image-source"]').setValue('gallery')
    await wrapper.get('[data-testid="chat-directory-service-avatar-gallery-asset"]').setValue(imported.assetId)
    await wrapper.get('[data-testid="chat-directory-save-service"]').trigger('click')
    await flushUi()

    const created = chatStore.contacts.find((contact) => contact.name === 'Gallery Service')
    expect(created).toMatchObject({
      kind: 'service',
      avatar: '',
      avatarImage: {
        sourceType: 'gallery',
        galleryAssetId: imported.assetId,
      },
    })
    expect(wrapper.get(`[data-testid="chat-directory-service-avatar-${created.id}"]`).attributes('src')).toBe(
      'https://example.com/service-gallery-avatar.png',
    )

    wrapper.unmount()
  })

  test('creates Shopping service preset accounts in ChatDirectory', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()

    await router.push('/chat-contacts')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-directory-section-service"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-shopping-service-presets"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-directory-logistics-service-presets"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-directory-food-delivery-service-presets"]').exists()).toBe(true)

    await wrapper.get('[data-testid="chat-directory-create-shopping-service-style_cloud"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-service-name"]').element.value).toBe('Style Cloud')
    expect(wrapper.get('[data-testid="chat-directory-service-shopping-service"]').element.value).toBe(
      'style_cloud',
    )

    await wrapper.get('[data-testid="chat-directory-save-service"]').trigger('click')
    await flushUi()

    const created = chatStore.contacts.find((contact) => contact.shoppingServiceKey === 'style_cloud')
    expect(created).toMatchObject({
      kind: 'service',
      name: 'Style Cloud',
      shoppingServiceKey: 'style_cloud',
    })
    expect(wrapper.get(`[data-testid="chat-directory-shopping-service-${created.id}"]`).text()).toContain(
      'Style Cloud',
    )

    await wrapper.get('[data-testid="chat-directory-create-logistics-service-standard_courier"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="chat-directory-service-logistics-service"]').element.value).toBe(
      'standard_courier',
    )
    await wrapper.get('[data-testid="chat-directory-save-service"]').trigger('click')
    await flushUi()
    const logistics = chatStore.contacts.find((contact) => contact.logisticsServiceKey === 'standard_courier')
    expect(logistics).toMatchObject({
      kind: 'service',
      logisticsServiceKey: 'standard_courier',
    })
    const logisticsLabel = wrapper.get(`[data-testid="chat-directory-logistics-service-${logistics.id}"]`).text()
    expect(logisticsLabel).toContain('物流服务号')
    expect(logisticsLabel).toMatch(/普通快递|Standard Courier/)

    await wrapper.get('[data-testid="chat-directory-create-food-delivery-service-food_delivery_dispatch"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="chat-directory-service-food-delivery-service"]').element.value).toBe(
      'food_delivery_dispatch',
    )
    await wrapper.get('[data-testid="chat-directory-save-service"]').trigger('click')
    await flushUi()
    const food = chatStore.contacts.find((contact) => contact.foodDeliveryServiceKey === 'food_delivery_dispatch')
    expect(food).toMatchObject({
      kind: 'service',
      foodDeliveryServiceKey: 'food_delivery_dispatch',
    })
    const foodDeliveryLabel = wrapper.get(`[data-testid="chat-directory-food-delivery-service-${food.id}"]`).text()
    expect(foodDeliveryLabel).toContain('外卖服务号')
    expect(foodDeliveryLabel).toMatch(/外卖通知|Food Delivery Dispatch/)

    wrapper.unmount()
  })
})
