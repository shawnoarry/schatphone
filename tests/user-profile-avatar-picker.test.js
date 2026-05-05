import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import UserProfileView from '../src/views/UserProfileView.vue'
import { useGalleryStore } from '../src/stores/gallery'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', component: UserProfileView },
      { path: '/settings', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const waitFor = async (predicate, attempts = 8) => {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return
    await flushUi()
  }
}

describe('UserProfileView avatar source picker', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('stores URL and Gallery avatar image sources through the shared picker', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const galleryStore = useGalleryStore()
    galleryStore.resetForTesting()
    const imported = galleryStore.importAssetFromUrl({
      url: 'https://example.com/user-gallery-avatar.png',
      name: 'User Gallery Avatar',
      category: 'reference',
    })
    expect(imported.ok).toBe(true)

    await router.push('/profile')
    await router.isReady()

    const wrapper = mount(UserProfileView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()
    await waitFor(() => systemStore.hasFinishedStorageHydration === true)

    await wrapper.get('[data-testid="user-profile-avatar-image-source"]').setValue('url')
    await flushUi()
    await wrapper.get('[data-testid="user-profile-avatar-image-url"]').setValue('https://example.com/user-avatar.png')
    await flushUi()

    expect(systemStore.user.avatar).toBe('https://example.com/user-avatar.png')
    expect(systemStore.user.avatarImage).toMatchObject({
      sourceType: 'url',
      url: 'https://example.com/user-avatar.png',
    })

    await wrapper.get('[data-testid="user-profile-avatar-image-source"]').setValue('gallery')
    await flushUi()
    await wrapper.get('[data-testid="user-profile-avatar-gallery-asset"]').setValue(imported.assetId)
    await flushUi()

    expect(systemStore.user.avatar).toBe('')
    expect(systemStore.user.avatarImage).toMatchObject({
      sourceType: 'gallery',
      galleryAssetId: imported.assetId,
    })

    wrapper.unmount()
  })
})
