import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

describe('system appearance wallpaper source', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('keeps theme wallpaper synced only when wallpaper source follows theme', () => {
    const store = useSystemStore()
    const zenWallpaper = store.getThemeWallpaper('zen')

    store.setTheme('zen')
    expect(store.settings.appearance.wallpaperMode).toBe('theme')
    expect(store.settings.appearance.wallpaper).toBe(zenWallpaper)

    store.setAppearanceWallpaperUrl('https://example.com/custom-wallpaper.jpg')
    expect(store.settings.appearance.wallpaperMode).toBe('url')
    expect(store.settings.appearance.wallpaper).toBe('https://example.com/custom-wallpaper.jpg')

    store.setTheme('y2k')
    expect(store.settings.appearance.wallpaperMode).toBe('url')
    expect(store.settings.appearance.wallpaper).toBe('https://example.com/custom-wallpaper.jpg')
  })

  test('supports switching between theme, url, and gallery wallpaper sources', () => {
    const store = useSystemStore()

    store.setAppearanceWallpaperAsset('asset_wallpaper_1')
    expect(store.settings.appearance.wallpaperMode).toBe('gallery')
    expect(store.settings.appearance.wallpaperAssetId).toBe('asset_wallpaper_1')

    store.clearAppearanceWallpaperAsset()
    expect(store.settings.appearance.wallpaperMode).toBe('theme')
    expect(store.settings.appearance.wallpaperAssetId).toBe('')

    store.setAppearanceWallpaperUrl('https://example.com/fallback.jpg')
    expect(store.settings.appearance.wallpaperMode).toBe('url')
    expect(store.settings.appearance.wallpaperAssetId).toBe('')

    store.useThemeWallpaper()
    expect(store.settings.appearance.wallpaperMode).toBe('theme')
    expect(store.settings.appearance.wallpaperAssetId).toBe('')
    expect(store.settings.appearance.wallpaper).toBe(store.getThemeWallpaper())
  })

  test('infers wallpaper mode when restoring legacy snapshots', () => {
    const store = useSystemStore()
    const zenWallpaper = store.getThemeWallpaper('zen')

    const restoredTheme = store.restoreFromBackup({
      settings: {
        appearance: {
          currentTheme: 'zen',
          wallpaper: zenWallpaper,
        },
      },
    })
    expect(restoredTheme).toBe(true)
    expect(store.settings.appearance.wallpaperMode).toBe('theme')
    expect(store.settings.appearance.wallpaper).toBe(zenWallpaper)

    const restoredCustomUrl = store.restoreFromBackup({
      settings: {
        appearance: {
          currentTheme: 'zen',
          wallpaper: 'https://example.com/custom-restored.jpg',
        },
      },
    })
    expect(restoredCustomUrl).toBe(true)
    expect(store.settings.appearance.wallpaperMode).toBe('url')
    expect(store.settings.appearance.wallpaper).toBe('https://example.com/custom-restored.jpg')

    const restoredGallery = store.restoreFromBackup({
      settings: {
        appearance: {
          currentTheme: 'y2k',
          wallpaperMode: 'gallery',
          wallpaperAssetId: 'asset_gallery_2',
          wallpaper: '',
        },
      },
    })
    expect(restoredGallery).toBe(true)
    expect(store.settings.appearance.wallpaperMode).toBe('gallery')
    expect(store.settings.appearance.wallpaperAssetId).toBe('asset_gallery_2')
  })
})
