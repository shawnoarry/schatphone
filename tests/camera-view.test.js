import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CameraView from '../src/views/CameraView.vue'
import { useGalleryStore } from '../src/stores/gallery'
import { useImageGenerationStore } from '../src/stores/imageGeneration'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/camera', component: CameraView },
      { path: '/camera/tasks', component: DummyView },
      { path: '/camera/settings', component: DummyView },
    ],
  })

const mountCamera = async () => {
  const router = createTestRouter()
  await router.push('/camera')
  await router.isReady()
  const wrapper = mount(CameraView, {
    global: {
      plugins: [router],
    },
  })
  await flushPromises()
  return { router, wrapper }
}

describe('CameraView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('keeps provider configuration off the main camera surface', async () => {
    const { router, wrapper } = await mountCamera()

    expect(wrapper.get('[data-testid="camera-view"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="camera-prompt"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="camera-shutter"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="camera-settings-providers"]').exists()).toBe(false)
    expect(wrapper.find('input[type="password"]').exists()).toBe(false)

    await wrapper.get('[data-testid="camera-settings-button"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/camera/settings')

    wrapper.unmount()
  })

  test('uses Gallery references and keeps a reviewed candidate only after confirmation', async () => {
    const galleryStore = useGalleryStore()
    const imageStore = useImageGenerationStore()
    const referenceUrl = 'https://example.com/person-reference.png'
    const generatedUrl = 'https://example.com/generated-camera-image.png'
    const importedReference = galleryStore.importAssetFromUrl({
      url: referenceUrl,
      name: 'Reference portrait',
      category: 'reference',
    })
    imageStore.setCredentials(imageStore.profiles[0].id, { apiKey: 'device-only-secret' })
    const generateSpy = vi.spyOn(imageStore, 'generateForModule').mockImplementation(async ({ input }) => {
      const candidates = imageStore.addCandidates({
        imageUrls: [generatedUrl],
        request: input,
        profile: imageStore.profiles[0],
        adapterKind: 'openai_images',
      })
      return { ok: true, candidates }
    })
    const { wrapper } = await mountCamera()

    await wrapper.get('[data-testid="camera-mode-reference"]').trigger('click')
    await wrapper.get('[data-testid="camera-reference-button"]').trigger('click')
    await wrapper.get(`[data-testid="camera-reference-${importedReference.assetId}"]`).trigger('click')
    await wrapper.get('[data-testid="camera-prompt"]').setValue('A quiet window-light selfie')
    await wrapper.get('[data-testid="camera-shutter"]').trigger('click')
    await flushPromises()

    expect(generateSpy).toHaveBeenCalledWith(expect.objectContaining({
      moduleKey: 'camera',
      input: expect.objectContaining({
        intent: 'reference',
        referenceUrls: [referenceUrl],
      }),
    }))
    expect(imageStore.recentCandidates[0]).toMatchObject({
      imageUrl: generatedUrl,
      galleryAssetId: '',
    })
    expect(galleryStore.getAssetsByCategory('scenario')).toHaveLength(0)

    await wrapper.get('[data-testid="camera-keep-gallery"]').trigger('click')
    await flushPromises()

    const keptCandidate = imageStore.recentCandidates[0]
    expect(keptCandidate.galleryAssetId).toBeTruthy()
    expect(galleryStore.findAssetById(keptCandidate.galleryAssetId)).toMatchObject({
      category: 'scenario',
      sourceUrl: generatedUrl,
    })
    expect(galleryStore.findAssetById(importedReference.assetId)).toMatchObject({
      category: 'reference',
    })

    await wrapper.get('[data-testid="camera-discard-candidate"]').trigger('click')
    expect(imageStore.recentCandidates).toHaveLength(0)
    expect(galleryStore.findAssetById(keptCandidate.galleryAssetId)).toMatchObject({
      category: 'scenario',
      sourceUrl: generatedUrl,
    })

    wrapper.unmount()
  })
})
