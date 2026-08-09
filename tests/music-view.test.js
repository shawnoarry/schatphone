import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MusicMiniPlayer from '../src/components/MusicMiniPlayer.vue'
import { MUSIC_DEMO_TRACKS } from '../src/lib/music-contract'
import { musicPlaybackRuntime } from '../src/lib/music-playback-runtime'
import { useMusicStore } from '../src/stores/music'
import { useSystemStore } from '../src/stores/system'
import MusicView from '../src/views/MusicView.vue'

class MockAudio {
  constructor() {
    this.currentTime = 0
    this.duration = 240
    this.volume = 1
    this.muted = false
    this.paused = true
    this.listeners = new Map()
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  emit(type) {
    ;(this.listeners.get(type) || []).forEach((listener) => listener())
  }

  pause() {
    this.paused = true
    this.emit('pause')
  }

  load() {
    this.emit('loadstart')
    this.emit('durationchange')
    this.emit('canplay')
  }

  async play() {
    this.paused = false
    this.emit('play')
  }

  removeAttribute() {}
}

Object.defineProperty(globalThis, 'Audio', {
  configurable: true,
  writable: true,
  value: MockAudio,
})

const DummyView = { template: '<div />' }
let pinia

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: DummyView },
      { path: '/settings', component: DummyView },
      { path: '/chat/:id?', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/music', component: MusicView },
    ],
  })

const mountMusic = async (route = '/music') => {
  const router = createTestRouter()
  await router.push(route)
  await router.isReady()
  const wrapper = mount(MusicView, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper }
}

describe('MusicView', () => {
  beforeEach(() => {
    musicPlaybackRuntime.stop()
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.unlockPhone()
  })

  afterEach(() => {
    musicPlaybackRuntime.stop()
    disposePinia(pinia)
  })

  test('keeps listening primary while search and provider setup stay focused', async () => {
    const { wrapper } = await mountMusic()
    const store = useMusicStore()

    expect(wrapper.get('[data-testid="music-feature"]').text()).toContain('Night Transit')
    expect(wrapper.get('[data-testid="music-player"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(false)

    await wrapper.get('[data-testid="music-tab-search"]').trigger('click')
    await wrapper.get('[data-testid="music-search-input"]').setValue('Blue Hour')
    await wrapper.get('.music-search-form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('.is-search-results').text()).toContain('Blue Hour Drive')

    await wrapper.get('[data-testid="music-settings-button"]').trigger('click')
    expect(wrapper.get('[data-testid="music-add-panel"]').exists()).toBe(true)
    await wrapper.get('[data-testid="music-add-custom-source"]').trigger('click')
    await wrapper.get('[data-testid="music-provider-name"]').setValue('Broken Source')
    await wrapper.get('[data-testid="music-provider-url"]').setValue('not-a-url')
    await wrapper.get('[data-testid="music-provider-save"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('.music-form-error').text()).toContain('valid HTTP or HTTPS')
    expect(store.profiles).toHaveLength(0)

    await wrapper.get('[data-testid="music-provider-url"]').setValue('https://music.example.com')
    await wrapper.get('[data-testid="music-provider-save"]').trigger('click')
    await flushPromises()
    expect(store.profiles).toHaveLength(1)
    expect(wrapper.find('[data-testid="music-settings"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('keeps URL and local-file intake together under Music Settings', async () => {
    const { wrapper } = await mountMusic()

    await wrapper.get('[data-testid="music-settings-button"]').trigger('click')
    expect(wrapper.get('[data-testid="music-settings-add-entry"]').classes()).toContain('is-active')
    expect(wrapper.get('[data-testid="music-url-import-form"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="music-direct-url"]').element.type).toBe('url')

    await wrapper.get('[data-testid="music-add-files-tab"]').trigger('click')
    const fileInput = wrapper.get('[data-testid="music-local-files"]')
    expect(fileInput.attributes('multiple')).toBeDefined()
    expect(fileInput.attributes('accept')).toContain('audio/*')
    expect(wrapper.find('[data-testid="music-url-import-form"]').exists()).toBe(false)

    await wrapper.get('[data-testid="music-add-url-tab"]').trigger('click')
    expect(wrapper.get('[data-testid="music-url-import-form"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('accepts a bounded Chat search deep link without starting playback', async () => {
    const { wrapper } = await mountMusic('/music?source=chat&action=search&q=Signal%20Bloom')
    const store = useMusicStore()

    expect(wrapper.get('[data-testid="music-tab-search"]').classes()).toContain('is-active')
    expect(wrapper.get('[data-testid="music-search-input"]').element.value).toBe('Signal Bloom')
    expect(wrapper.get('.is-search-results').text()).toContain('Signal Bloom')
    expect(store.runtime.sessionActive).toBe(false)

    wrapper.unmount()
  })

  test('opens a shared track as details without playback and can prepare a Chat share', async () => {
    const { router, wrapper } = await mountMusic('/music?source=chat&track=demo_blue_hour')
    const store = useMusicStore()

    expect(wrapper.get('[data-testid="music-now-playing-sheet"]').text()).toContain(
      'Blue Hour Drive',
    )
    expect(wrapper.get('[data-testid="music-now-playing-sheet"]').text()).toContain(
      'Opening details does not start playback',
    )
    expect(store.runtime.sessionActive).toBe(false)

    await wrapper.get('[data-testid="music-share-chat"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      path: '/chat',
      query: { share: 'internal' },
    })
    expect(JSON.parse(localStorage.getItem('schatphone:chat:internal-share-draft'))).toMatchObject({
      sourceRoute: '/music?track=demo_blue_hour',
      shareable: {
        type: 'music_track_share',
        sourceModule: 'music',
        sourceId: 'demo_blue_hour',
      },
    })

    wrapper.unmount()
  })

  test('offers a focused ChKSz preset without exposing generic endpoint mapping', async () => {
    const { wrapper } = await mountMusic()
    const store = useMusicStore()

    await wrapper.get('[data-testid="music-settings-button"]').trigger('click')
    await wrapper.get('[data-testid="music-add-chksz"]').trigger('click')

    expect(wrapper.get('[data-testid="music-chksz-platform"]').element.value).toBe('netease')
    expect(wrapper.get('[data-testid="music-chksz-quality"]').element.value).toBe('jymaster')
    expect(wrapper.find('[data-testid="music-provider-url"]').exists()).toBe(false)
    expect(wrapper.find('.music-advanced-settings').exists()).toBe(false)

    await wrapper.get('[data-testid="music-provider-key"]').setValue('chksz_test_device_key')
    await wrapper.get('[data-testid="music-provider-save"]').trigger('click')
    await flushPromises()

    expect(store.activeProfile).toMatchObject({
      adapterKind: 'chksz',
      platform: 'netease',
      baseUrl: 'https://api.chksz.com/',
    })
    expect(store.getCredential(store.activeProfile.id).apiKey).toBe('chksz_test_device_key')
    expect(JSON.stringify(store.state)).not.toContain('chksz_test_device_key')

    wrapper.unmount()
  })

  test('offers a no-key Radio Browser preset for HTTPS MP3 live stations', async () => {
    const { wrapper } = await mountMusic()
    const store = useMusicStore()

    await wrapper.get('[data-testid="music-settings-button"]').trigger('click')
    await wrapper.get('[data-testid="music-add-radio-browser"]').trigger('click')

    expect(wrapper.get('[data-testid="music-radio-browser-form"]').text()).toContain(
      'Global live radio',
    )
    expect(wrapper.get('[data-testid="music-radio-browser-no-key"]').text()).toContain(
      'No API key required',
    )
    expect(wrapper.find('[data-testid="music-provider-url"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="music-provider-key"]').exists()).toBe(false)
    expect(wrapper.find('.music-advanced-settings').exists()).toBe(false)

    await wrapper.get('[data-testid="music-provider-save"]').trigger('click')
    await flushPromises()

    expect(store.activeProfile).toMatchObject({
      name: 'Radio Browser',
      baseUrl: 'https://all.api.radio-browser.info/',
      queryParam: 'name',
      authMode: 'none',
      fieldMap: {
        id: 'stationuuid',
        audioUrl: 'url_resolved',
      },
    })
    expect(store.getCredential(store.activeProfile.id).apiKey).toBe('')

    wrapper.unmount()
  })

  test('keeps playback available in the shell mini player after leaving Music', async () => {
    const router = createTestRouter()
    await router.push('/home?homePage=1')
    await router.isReady()
    const wrapper = mount(MusicMiniPlayer, { global: { plugins: [router] } })
    const store = useMusicStore()

    await store.playTrack(MUSIC_DEMO_TRACKS[0], { queue: MUSIC_DEMO_TRACKS.slice(0, 2) })
    await flushPromises()
    expect(wrapper.get('[data-testid="music-mini-player"]').text()).toContain('Afterglow Lines')

    await wrapper.get('.music-mini-track').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      path: '/music',
      query: { from: 'home', homePage: '1' },
    })
    expect(wrapper.find('[data-testid="music-mini-player"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('keeps the floating player independently expandable and dismissible on Map', async () => {
    const router = createTestRouter()
    await router.push('/map?from=home&homePage=2')
    await router.isReady()
    const wrapper = mount(MusicMiniPlayer, { global: { plugins: [router] } })
    const store = useMusicStore()

    store.openFloatingPlayer()
    await flushPromises()
    expect(wrapper.get('[data-testid="music-mini-player"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="music-floating-content"]').exists()).toBe(false)

    await wrapper.get('[data-testid="music-floating-expand"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="music-floating-content"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="music-floating-track-"]')).toHaveLength(6)

    await wrapper.get('[data-testid="music-floating-radio-tab"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid^="music-floating-station-"]')).toHaveLength(3)
    expect(wrapper.html()).not.toContain('audioUrl')
    expect(wrapper.html()).not.toContain('mediaId')

    await wrapper.get('[data-testid="music-floating-close"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="music-mini-player"]').exists()).toBe(false)
    expect(store.floatingPlayerExpanded).toBe(false)

    wrapper.unmount()
  })
})
