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
    MockAudio.instance = this
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

    expect(wrapper.get('[data-testid="music-feature"]').text()).toContain("THIS WEEK'S PICK")
    expect(wrapper.find('[data-testid="music-player"]').exists()).toBe(false)
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

  test('uses consumer-facing primary spaces and keeps search as a top-level tool', async () => {
    const { wrapper } = await mountMusic()
    const primaryNavigation = wrapper.findAll('.music-nav-list .music-nav-item')

    expect(primaryNavigation).toHaveLength(3)
    expect(primaryNavigation.map((item) => item.text().trim())).toEqual([
      'Discover',
      'Albums',
      'My Music',
    ])
    expect(wrapper.find('.music-nav-list [data-testid="music-tab-search"]').exists()).toBe(false)
    expect(wrapper.get('.music-topbar [data-testid="music-tab-search"]').exists()).toBe(true)

    await wrapper
      .findAll('.music-discovery-shortcuts button')
      .find((button) => button.text().includes('Favorites'))
      .trigger('click')

    expect(wrapper.get('[data-testid="music-tab-library"]').classes()).toContain('is-active')
    expect(wrapper.get('.music-segmented button.is-active').text()).toBe('Favorites')

    wrapper.unmount()
  })

  test('keeps a new My Music collection empty and uses categories as its only navigation', async () => {
    const { wrapper } = await mountMusic()

    await wrapper.get('[data-testid="music-tab-library"]').trigger('click')

    expect(wrapper.get('.music-library-hero').text()).toContain('0 songs')
    expect(wrapper.findAll('.music-library-glance button')).toHaveLength(0)
    expect(wrapper.findAll('.music-library-stat')).toHaveLength(3)
    expect(wrapper.get('.music-track-list.is-library-list .music-empty-state').text()).toBe(
      'Save a song or add it to a playlist',
    )

    wrapper.unmount()
  })

  test('keeps Listen Now bounded and hands full listening history to Library', async () => {
    const { wrapper } = await mountMusic()
    const store = useMusicStore()

    expect(wrapper.get('[data-testid="music-listen-layout"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="music-recent-overview"] .music-track-row')).toHaveLength(
      0,
    )
    expect(wrapper.get('[data-testid="music-recent-overview"] .music-empty-state').text()).toBe(
      'Songs you play will appear here',
    )

    for (const track of MUSIC_DEMO_TRACKS.slice(0, 4)) {
      await store.playTrack(track)
    }
    await flushPromises()

    expect(wrapper.findAll('[data-testid="music-recent-overview"] .music-track-row')).toHaveLength(
      3,
    )

    await wrapper.get('[data-testid="music-recent-see-all"]').trigger('click')

    expect(wrapper.get('[data-testid="music-tab-library"]').classes()).toContain('is-active')
    expect(wrapper.get('.music-segmented button.is-active').text()).toBe('Recently Played')

    wrapper.unmount()
  })

  test('keeps recommendation content separate from the current player and syncs card controls', async () => {
    const { wrapper } = await mountMusic()
    const store = useMusicStore()
    const recommendationTitle = wrapper.get('[data-testid="music-feature"] h1').text()

    const heroToggle = wrapper.get('[data-testid="music-feature-play"]')
    expect(heroToggle.attributes('title')).toBe('Play')
    expect(heroToggle.get('i').classes()).toContain('fa-play')

    await heroToggle.trigger('click')
    await flushPromises()
    expect(store.currentTrack?.title).toBe(recommendationTitle)
    expect(wrapper.get('[data-testid="music-player"]').text()).toContain(recommendationTitle)
    expect(wrapper.get('[data-testid="music-feature"] h1').text()).toBe(recommendationTitle)
    expect(heroToggle.attributes('title')).toBe('Pause')
    expect(heroToggle.get('i').classes()).toContain('fa-pause')

    const toggle = wrapper.get('[data-testid="music-player-toggle"]')
    expect(toggle.attributes('title')).toBe('Pause')
    expect(toggle.get('i').classes()).toContain('fa-pause')

    await heroToggle.trigger('click')
    expect(MockAudio.instance.paused).toBe(true)
    expect(wrapper.get('[data-testid="music-feature"] h1').text()).toBe(recommendationTitle)
    expect(heroToggle.attributes('title')).toBe('Play')
    expect(heroToggle.get('i').classes()).toContain('fa-play')
    expect(toggle.attributes('title')).toBe('Play')
    expect(toggle.get('i').classes()).toContain('fa-play')

    await wrapper.get('[data-testid="music-player-stop"]').trigger('click')
    expect(wrapper.get('[data-testid="music-feature"] h1').text()).toBe(recommendationTitle)
    expect(wrapper.find('[data-testid="music-player"]').exists()).toBe(false)

    const alternateTrack = MUSIC_DEMO_TRACKS.find((track) => track.title !== recommendationTitle)
    const alternateAlbum = wrapper.get(`[data-testid="music-album-${alternateTrack.id}"]`)
    await alternateAlbum
      .get(`[data-testid="music-album-open-${alternateTrack.id}"]`)
      .trigger('click')
    expect(wrapper.get('[data-testid="music-album-detail"]').text()).toContain(alternateTrack.album)
    expect(wrapper.get('[data-testid="music-album-detail-back"]').attributes('title')).toBe(
      'Back to Discover',
    )
    expect(store.currentTrack).toBeNull()

    await wrapper.get('[data-testid="music-album-detail-play"]').trigger('click')
    await flushPromises()

    expect(store.currentTrack?.id).toBe(alternateTrack.id)
    expect(wrapper.get('[data-testid="music-player"]').text()).toContain(alternateTrack.title)
    expect(wrapper.get('[data-testid="music-feature"] h1').text()).toBe(recommendationTitle)
    expect(alternateAlbum.classes()).toContain('is-current')
    expect(alternateAlbum.classes()).toContain('is-playing')
    expect(alternateAlbum.get('.music-album-play i').classes()).toContain('fa-pause')

    await wrapper.get('[data-testid="music-album-detail-play"]').trigger('click')
    expect(alternateAlbum.classes()).toContain('is-current')
    expect(alternateAlbum.classes()).not.toContain('is-playing')
    expect(alternateAlbum.get('.music-album-play i').classes()).toContain('fa-play')

    const trackToggle = wrapper.get(`[data-testid="music-track-toggle-${alternateTrack.id}"]`)
    expect(trackToggle.attributes('title')).toBe('Play')
    await trackToggle.trigger('click')
    expect(trackToggle.attributes('title')).toBe('Pause')
    expect(trackToggle.get('i').classes()).toContain('fa-pause')

    wrapper.unmount()
  })

  test('keeps album browsing, playback, collection, and track inspection as separate actions', async () => {
    const { wrapper } = await mountMusic()
    const store = useMusicStore()
    const albumTrack = MUSIC_DEMO_TRACKS[0]

    await wrapper.get('[data-testid="music-tab-browse"]').trigger('click')
    await wrapper.get(`[data-testid="music-album-open-${albumTrack.id}"]`).trigger('click')

    const detail = wrapper.get('[data-testid="music-album-detail"]')
    expect(detail.text()).toContain(albumTrack.album)
    expect(detail.text()).toContain(albumTrack.artist)
    expect(detail.get('[data-testid="music-album-detail-back"]').attributes('title')).toBe(
      'Back to Albums',
    )
    expect(store.runtime.sessionActive).toBe(false)

    await detail.get('[data-testid="music-album-detail-favorite"]').trigger('click')
    expect(store.isFavorite(albumTrack.id)).toBe(true)
    expect(
      detail.get('[data-testid="music-album-detail-favorite"]').attributes('aria-pressed'),
    ).toBe('true')

    await detail.get('[data-testid="music-album-detail-queue"]').trigger('click')
    expect(store.queue.map((track) => track.id)).toContain(albumTrack.id)
    expect(detail.get('[data-testid="music-album-detail-queue"]').text()).toContain('Added')

    await detail.get(`[data-testid="music-album-track-open-${albumTrack.id}"]`).trigger('click')
    expect(wrapper.get('[data-testid="music-now-playing-sheet"]').text()).toContain(
      albumTrack.title,
    )
    expect(store.runtime.sessionActive).toBe(false)

    await wrapper.get('[data-testid="music-now-playing-sheet"] .music-icon-button').trigger('click')
    expect(wrapper.get('[data-testid="music-album-detail"]').exists()).toBe(true)
    await wrapper.get('[data-testid="music-album-detail-back"]').trigger('click')
    expect(wrapper.find('[data-testid="music-album-detail"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="music-tab-browse"]').classes()).toContain('is-active')

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
    expect(wrapper.get('[data-testid="music-now-playing-sheet"]').text()).not.toContain(
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

  test('shows a strong Now Playing favorite state and adds the track to Library favorites', async () => {
    const { wrapper } = await mountMusic('/music?track=demo_blue_hour')
    const store = useMusicStore()
    const favoriteButton = wrapper.get('[data-testid="music-now-playing-favorite"]')

    expect(favoriteButton.attributes('aria-pressed')).toBe('false')
    expect(favoriteButton.text()).toContain('Favorite')
    await favoriteButton.trigger('click')

    expect(favoriteButton.attributes('aria-pressed')).toBe('true')
    expect(favoriteButton.text()).toContain('Added')
    expect(store.favoriteTracks.map((track) => track.id)).toContain('demo_blue_hour')

    await wrapper.get('[data-testid="music-now-playing-sheet"] .music-icon-button').trigger('click')
    await wrapper.get('[data-testid="music-tab-library"]').trigger('click')
    expect(wrapper.get('.music-library-hero').text()).toContain('1 songs')
    expect(wrapper.findAll('.music-library-glance button')).toHaveLength(0)
    expect(wrapper.findAll('.music-library-stat')).toHaveLength(3)
    expect(wrapper.get('.music-track-list.is-library-list').text()).toContain('Blue Hour Drive')
    const favoritesTab = wrapper
      .findAll('.music-segmented button')
      .find((button) => button.text().trim() === 'Favorites')
    await favoritesTab.trigger('click')
    expect(wrapper.get('.music-track-list.is-library-list').text()).toContain('Blue Hour Drive')
    expect(localStorage.getItem('schatphone:store:system') || '').toContain('demo_blue_hour')

    wrapper.unmount()
  })

  test('moves from Now Playing to Queue without stacking both layers', async () => {
    const { wrapper } = await mountMusic('/music?track=demo_blue_hour')

    expect(wrapper.get('[data-testid="music-now-playing-sheet"]').exists()).toBe(true)
    await wrapper.get('[data-testid="music-now-playing-queue"]').trigger('click')

    expect(wrapper.find('[data-testid="music-now-playing-sheet"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="music-queue"]').exists()).toBe(true)

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

  test('docks the floating player at the Chat edge until controls are requested', async () => {
    const router = createTestRouter()
    const store = useMusicStore()
    store.openFloatingPlayer()
    store.setFloatingPlayerExpanded(true)
    await router.push('/chat/1')
    await router.isReady()

    const wrapper = mount(MusicMiniPlayer, { global: { plugins: [router] } })
    await flushPromises()

    const player = wrapper.get('[data-testid="music-mini-player"]')
    expect(player.classes()).toContain('is-chat-route')
    expect(store.floatingPlayerExpanded).toBe(false)
    expect(wrapper.find('[data-testid="music-floating-content"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="music-floating-expand"]').exists()).toBe(false)
    expect(player.classes()).not.toContain('is-chat-controls-open')
    expect(wrapper.find('.music-mini-controls').exists()).toBe(false)
    expect(wrapper.get('.music-mini-track').attributes('aria-expanded')).toBe('false')

    await wrapper.get('.music-mini-track').trigger('click')
    expect(player.classes()).toContain('is-chat-controls-open')
    expect(wrapper.get('.music-mini-track').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.music-mini-toggle').exists()).toBe(true)
    expect(wrapper.find('[data-testid="music-chat-collapse"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="music-floating-close"]').exists()).toBe(true)
    expect(wrapper.findAll('.music-mini-controls button')).toHaveLength(3)

    await wrapper.get('[data-testid="music-chat-collapse"]').trigger('click')
    expect(player.classes()).not.toContain('is-chat-controls-open')
    expect(wrapper.find('.music-mini-controls').exists()).toBe(false)

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
