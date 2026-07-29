import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useImageGenerationStore } from '../src/stores/imageGeneration'

const jsonResponse = (body) => new Response(JSON.stringify(body), {
  headers: { 'content-type': 'application/json' },
})

describe('image generation store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('keeps public profiles separate from local credentials', () => {
    const store = useImageGenerationStore()
    const profileId = store.profiles[0].id
    store.setCredentials(profileId, { apiKey: 'top-secret', proxyToken: 'proxy-secret' })
    store.updateDefaults({ aspectRatio: '4:5' })

    expect(store.exportForBackup()).toMatchObject({
      defaults: { aspectRatio: '4:5' },
    })
    expect(JSON.stringify(store.exportForBackup())).not.toContain('top-secret')
    expect(localStorage.getItem('schatphone:image-generation:credentials')).toContain('top-secret')
    expect(localStorage.getItem('schatphone:store:image-generation')).not.toContain('top-secret')
  })

  test('resolves per-module routing without duplicating provider state', () => {
    const store = useImageGenerationStore()
    const routed = store.profiles[1]
    store.updateModuleRoute('chat', { mode: 'profile', profileId: routed.id })
    expect(store.getProfileForModule('chat').id).toBe(routed.id)
    expect(store.getProfileForModule('map').id).toBe(store.defaults.activeProfileId)
  })

  test('loads models and records provider diagnostics', async () => {
    const store = useImageGenerationStore()
    const profile = store.profiles[2]
    store.setCredentials(profile.id, { apiKey: 'secret' })
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [{ id: 'nano-banana-2' }] }))

    const result = await store.testConnection(profile.id, { fetchImpl })
    expect(result.ok).toBe(true)
    expect(store.modelStateByProfile[profile.id].models[0].id).toBe('nano-banana-2')
    expect(store.diagnostics[0]).toMatchObject({ action: 'test_connection', code: 'OK' })
  })

  test('generates temporary candidates through the selected module profile', async () => {
    const store = useImageGenerationStore()
    const profile = store.profiles[0]
    store.setCredentials(profile.id, { apiKey: 'secret' })
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [{ url: 'https://example.com/candidate.png' }] }))

    const result = await store.generateForModule({
      moduleKey: 'camera',
      input: { prompt: 'soft portrait', aspectRatio: '4:5', count: 1 },
      fetchImpl,
    })

    expect(result.ok).toBe(true)
    expect(store.recentCandidates).toHaveLength(1)
    expect(store.recentCandidates[0]).toMatchObject({
      imageUrl: 'https://example.com/candidate.png',
      profileId: profile.id,
      galleryAssetId: '',
    })
    expect(store.activeTasks[0].status).toBe('done')
  })

  test('restores public configuration without restoring credentials', () => {
    const store = useImageGenerationStore()
    const profileId = store.profiles[0].id
    store.setCredentials(profileId, { apiKey: 'stay-local' })
    store.addCandidates({
      imageUrls: ['https://example.com/stay-local.png'],
      request: { prompt: 'temporary' },
      profile: store.profiles[0],
    })
    const snapshot = store.exportForBackup()
    snapshot.defaults.aspectRatio = '9:16'

    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.defaults.aspectRatio).toBe('9:16')
    expect(store.getCredentials(profileId).apiKey).toBe('stay-local')
    expect(store.recentCandidates[0].imageUrl).toBe('https://example.com/stay-local.png')
  })
})
