import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import GalleryView from '../src/views/GalleryView.vue'
import { useGalleryStore } from '../src/stores/gallery'
import { useChatStore } from '../src/stores/chat'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/gallery', component: GalleryView },
      { path: '/home', component: DummyView },
      { path: '/camera', component: DummyView },
    ],
  })

const mountGallery = async (route = '/gallery') => {
  const router = createTestRouter()
  await router.push(route)
  await router.isReady()
  const wrapper = mount(GalleryView, {
    global: {
      plugins: [router],
    },
  })
  await flushPromises()
  await nextTick()
  return { wrapper, router }
}

const importPhoto = (store, name) =>
  store.importAssetFromUrl({
    url: `https://example.com/${encodeURIComponent(name)}.png`,
    name,
    category: 'reference',
  })

describe('GalleryView people/place albums', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('library tab shows photo grid and switches to albums tab', async () => {
    const galleryStore = useGalleryStore()
    importPhoto(galleryStore, 'photo-a')

    const { wrapper } = await mountGallery()
    expect(wrapper.get('[data-testid="gallery-tab-library"]').exists()).toBe(true)

    await wrapper.get('[data-testid="gallery-tab-albums"]').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('我的相簿')
    wrapper.unmount()
  })

  test('tagging a person in the detail sheet creates a people album', async () => {
    const galleryStore = useGalleryStore()
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({ roleId: '1001', name: 'Nova' })
    expect(profile).toBeTruthy()
    const { assetId } = importPhoto(galleryStore, 'nova-photo')

    const { wrapper } = await mountGallery()
    await wrapper.get('[data-testid="gallery-tab-albums"]').trigger('click')
    await nextTick()
    expect(wrapper.text()).not.toContain('人物')

    await wrapper.get('[data-testid="gallery-tab-library"]').trigger('click')
    await nextTick()
    await wrapper.find('.gallery-cell').trigger('click')
    await nextTick()

    const pick = wrapper.findAll('.gallery-person-pick').find((node) => node.text().includes('Nova'))
    expect(pick).toBeTruthy()
    await pick.trigger('click')
    await nextTick()
    expect(galleryStore.findAssetById(assetId).personIds).toEqual([String(profile.id)])
    expect(wrapper.findAll('.gallery-person-pick').find((node) => node.text().includes('Nova'))?.classes()).toContain('is-on')

    await wrapper.find('.gallery-sheet__close').trigger('click')
    await wrapper.get('[data-testid="gallery-tab-albums"]').trigger('click')
    await nextTick()

    const personCard = wrapper.find('.gallery-person-card')
    expect(personCard.exists()).toBe(true)
    expect(personCard.text()).toContain('Nova')

    await personCard.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('1 张')
    wrapper.unmount()
  })

  test('keeps archived profiles out of new person-tag choices', async () => {
    const galleryStore = useGalleryStore()
    const chatStore = useChatStore()
    const activeProfile = chatStore.addRoleProfile({ roleId: '1003', name: 'Active Person' })
    const archivedProfile = chatStore.addRoleProfile({ roleId: '1004', name: 'Archived Person' })
    expect(chatStore.archiveRoleProfile(archivedProfile.id)).toMatchObject({ ok: true })
    importPhoto(galleryStore, 'archive-filter-photo')

    const { wrapper } = await mountGallery()
    await wrapper.find('.gallery-cell').trigger('click')
    await nextTick()

    const labels = wrapper.findAll('.gallery-person-pick').map((node) => node.text())
    expect(labels).toContain(activeProfile.name)
    expect(labels).not.toContain(archivedProfile.name)

    wrapper.unmount()
  })

  test('free-text place tags group into place albums', async () => {
    const galleryStore = useGalleryStore()
    const { assetId } = importPhoto(galleryStore, 'place-photo')

    const { wrapper } = await mountGallery()
    await wrapper.find('.gallery-cell').trigger('click')
    await nextTick()

    const placeInput = wrapper.get('[data-testid="gallery-detail-place-text"]')
    await placeInput.setValue('练习室')
    await placeInput.trigger('change')
    await nextTick()
    expect(galleryStore.findAssetById(assetId).placeText).toBe('练习室')

    await wrapper.find('.gallery-sheet__close').trigger('click')
    await wrapper.get('[data-testid="gallery-tab-albums"]').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('练习室')
    wrapper.unmount()
  })

  test('person query opens the people album directly', async () => {
    const galleryStore = useGalleryStore()
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({ roleId: '1002', name: 'Eva' })
    const { assetId } = importPhoto(galleryStore, 'eva-photo')
    galleryStore.setAssetPersons(assetId, [profile.id])

    const { wrapper } = await mountGallery('/gallery?person=' + profile.id)
    expect(wrapper.text()).toContain('Eva')
    wrapper.unmount()
  })
})
