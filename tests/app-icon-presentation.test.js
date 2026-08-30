import { describe, expect, test } from 'vitest'
import {
  isAppIconCustomizationTarget,
  normalizeAppIconOverrides,
  resolveAppIconMeta,
} from '../src/lib/app-icon-presentation'
import { resolveNotificationModuleMeta } from '../src/lib/notification-presentation'

describe('app icon presentation helpers', () => {
  test('supports every independent App Store identity target', () => {
    expect(isAppIconCustomizationTarget('app_chat')).toBe(true)
    expect(isAppIconCustomizationTarget('app_agenda_journey')).toBe(true)
    expect(isAppIconCustomizationTarget('app_files')).toBe(true)
    expect(isAppIconCustomizationTarget('app_more')).toBe(false)
  })

  test('normalizes only supported icon overrides', () => {
    const normalized = normalizeAppIconOverrides({
      app_chat: {
        icon: 'fas fa-comment-dots',
        accent: 'cool',
      },
      app_map: {
        icon: 'not-valid',
        accent: 'invalid',
      },
      random_key: {
        icon: 'fas fa-cog',
        accent: 'dark',
      },
    })

    expect(normalized.app_chat).toEqual({
      sourceType: 'preset',
      icon: 'fas fa-comment-dots',
      accent: 'cool',
      galleryAssetId: '',
      displayName: '',
    })
    expect(normalized.app_map).toBeUndefined()
    expect(normalized.random_key).toBeUndefined()
  })

  test('normalizes gallery image icon overrides while preserving legacy built-in overrides', () => {
    const normalized = normalizeAppIconOverrides({
      app_chat: {
        icon: 'fas fa-comment-dots',
        accent: 'cool',
      },
      app_gallery: {
        sourceType: 'gallery',
        galleryAssetId: 'asset_gallery_icon',
        accent: 'warm',
      },
      app_map: {
        sourceType: 'gallery',
        galleryAssetId: '',
        icon: 'fas fa-route',
        accent: 'cool',
      },
    })

    expect(normalized.app_chat).toEqual({
      sourceType: 'preset',
      icon: 'fas fa-comment-dots',
      accent: 'cool',
      galleryAssetId: '',
      displayName: '',
    })
    expect(normalized.app_gallery).toEqual({
      sourceType: 'gallery',
      icon: 'fas fa-images',
      accent: 'warm',
      galleryAssetId: 'asset_gallery_icon',
      displayName: '',
    })
    expect(normalized.app_map).toEqual({
      sourceType: 'preset',
      icon: 'fas fa-route',
      accent: 'cool',
      galleryAssetId: '',
      displayName: '',
    })
  })

  test('normalizes display-name-only app identity overrides', () => {
    const normalized = normalizeAppIconOverrides({
      app_chat: {
        displayName: '  My   Messages  ',
      },
      random_key: {
        displayName: 'Should not persist',
      },
    })

    expect(normalized.app_chat).toEqual({
      sourceType: 'preset',
      icon: 'fas fa-comment',
      accent: 'default',
      galleryAssetId: '',
      displayName: 'My Messages',
    })
    expect(normalized.random_key).toBeUndefined()

    const meta = resolveAppIconMeta('app_chat', normalized, 'en-US')
    expect(meta.displayName).toBe('My Messages')
  })

  test('normalizes Agenda Journey and Files identity overrides', () => {
    const normalized = normalizeAppIconOverrides({
      app_agenda_journey: {
        icon: 'fas fa-map-location-dot',
        accent: 'warm',
      },
      app_files: {
        displayName: 'My Files',
      },
    })

    expect(normalized.app_agenda_journey).toMatchObject({
      icon: 'fas fa-map-location-dot',
      accent: 'warm',
    })
    expect(normalized.app_files).toMatchObject({
      icon: 'fas fa-folder',
      displayName: 'My Files',
    })
  })

  test('resolves home app icon metadata with overrides', () => {
    const meta = resolveAppIconMeta(
      'app_gallery',
      {
        app_gallery: {
          icon: 'fas fa-camera',
          accent: 'warm',
        },
      },
      'zh-CN',
    )

    expect(meta.label).toBe('相册')
    expect(meta.icon).toBe('fas fa-camera')
    expect(meta.accent).toBe('warm')
    expect(meta.toneClass).toBe('accent-warm')
  })

  test('resolves gallery image app icons with a built-in fallback glyph', () => {
    const meta = resolveAppIconMeta(
      'app_gallery',
      {
        app_gallery: {
          sourceType: 'gallery',
          galleryAssetId: 'asset_gallery_icon',
          accent: 'warm',
        },
      },
      'en-US',
    )

    expect(meta.sourceType).toBe('gallery')
    expect(meta.galleryAssetId).toBe('asset_gallery_icon')
    expect(meta.hasImageIcon).toBe(true)
    expect(meta.icon).toBe('fas fa-images')
    expect(meta.toneClass).toBe('accent-warm')
  })

  test('resolves planned Shopping, Reminders, and Assets app metadata', () => {
    const shopping = resolveAppIconMeta('app_shopping', {}, 'zh-CN')
    const music = resolveAppIconMeta('app_music', {}, 'en-US')
    const weather = resolveAppIconMeta('app_weather', {}, 'zh-CN')
    const reminders = resolveAppIconMeta('app_reminders', {}, 'en-US')
    const food = resolveAppIconMeta('app_food_delivery', {}, 'en-US')
    const assets = resolveAppIconMeta('app_assets', {}, 'en-US')
    const worldHub = resolveAppIconMeta('app_control_center', {}, 'zh-CN')
    const appStore = resolveAppIconMeta('app_store', {}, 'zh-CN')

    expect(shopping.label).toBe('购物')
    expect(shopping.icon).toBe('fas fa-bag-shopping')
    expect(shopping.accent).toBe('warm')
    expect(music.label).toBe('Music')
    expect(music.icon).toBe('fas fa-music')
    expect(music.accent).toBe('warm')
    expect(weather.label).toBe('天气')
    expect(weather.icon).toBe('fas fa-cloud-sun')
    expect(weather.accent).toBe('cool')
    expect(reminders.label).toBe('Reminders')
    expect(reminders.icon).toBe('fas fa-list-check')
    expect(reminders.accent).toBe('warm')
    expect(food.label).toBe('Food')
    expect(food.icon).toBe('fas fa-bowl-food')
    expect(food.accent).toBe('warm')
    expect(assets.label).toBe('Assets')
    expect(assets.icon).toBe('fas fa-vault')
    expect(assets.accent).toBe('cool')
    expect(worldHub.label).toBe('世界中枢')
    expect(worldHub.icon).toBe('fas fa-wand-magic-sparkles')
    expect(worldHub.accent).toBe('dark')
    expect(appStore.label).toBe('应用商城')
    expect(appStore.icon).toBe('fas fa-store')
    expect(appStore.accent).toBe('default')
  })

  test('resolves the accepted Browser, Community, Healthcare, and Housing brand images', () => {
    const expected = {
      app_browser: 'prism-browser-app-icon-v1.png',
      app_community: 'ripple-community-app-icon-v1.png',
      app_healthcare: 'ondam-care-app-icon-v2.png',
      app_jari_housing: 'jari-housing-app-icon-v1.png',
    }

    Object.entries(expected).forEach(([appId, fileName]) => {
      const meta = resolveAppIconMeta(appId, {}, 'zh-CN')
      expect(meta.imageUrl).toContain(
        `/schatphone-assets/images/ui-assets/shared/app-icons/${fileName}`,
      )
    })

    expect(
      resolveAppIconMeta(
        'app_healthcare',
        { app_healthcare: { icon: 'fas fa-heart-pulse', accent: 'warm' } },
        'zh-CN',
      ).imageUrl,
    ).toBe('')
  })

  test('registers the Workplace shell as an independent customizable App identity', () => {
    const meta = resolveAppIconMeta('app_workplace', {}, 'zh-CN')
    expect(meta.label).toBe('工作台')
    expect(meta.icon).toBe('fas fa-id-badge')
    expect(meta.accent).toBe('dark')
    expect(meta.imageUrl).toBe('')
  })

  test('registers the Tickets shell as an independent customizable App identity', () => {
    const meta = resolveAppIconMeta('app_tickets', {}, 'zh-CN')
    expect(meta.label).toBe('入场')
    expect(meta.icon).toBe('fas fa-ticket')
    expect(meta.accent).toBe('warm')
    expect(meta.imageUrl).toBe('')
  })

  test('registers the Travel shell as an independent customizable App identity', () => {
    const meta = resolveAppIconMeta('app_travel', {}, 'zh-CN')
    expect(meta.label).toBe('漫泊')
    expect(meta.icon).toBe('fas fa-suitcase-rolling')
    expect(meta.accent).toBe('cool')
    expect(meta.imageUrl).toBe('')
  })

  test('registers the remaining shell portfolio as independent customizable App identities', () => {
    expect(resolveAppIconMeta('app_intercity', {}, 'zh-CN')).toMatchObject({
      label: '联程',
      icon: 'fas fa-train',
      accent: 'cool',
    })
    expect(resolveAppIconMeta('app_creator_rights', {}, 'zh-CN')).toMatchObject({
      label: '谱权',
      icon: 'fas fa-copyright',
      accent: 'dark',
    })
    expect(resolveAppIconMeta('app_parcel', {}, 'zh-CN')).toMatchObject({
      label: '递送',
      icon: 'fas fa-box',
      accent: 'warm',
    })
    expect(resolveAppIconMeta('app_career', {}, 'zh-CN')).toMatchObject({
      label: '机会',
      icon: 'fas fa-briefcase',
      accent: 'default',
    })
  })

  test('resolves bundled system-pack images without treating them as gallery overrides', () => {
    const meta = resolveAppIconMeta('app_map', {}, 'zh-CN', 'cloud-pastel-animals')

    expect(meta.imageUrl).toContain('cloud-pastel-animals-v1/map-turtle.webp')
    expect(meta.hasImageIcon).toBe(false)
    expect(meta.sourceType).toBe('preset')
    expect(meta.galleryAssetId).toBe('')
  })

  test('reuses app icon overrides in in-shell notification presentation', () => {
    const meta = resolveNotificationModuleMeta(
      {
        source: 'chat_ai_reply',
        route: '/chat/7',
      },
      'en-US',
      {
        app_chat: {
          icon: 'fas fa-paper-plane',
          accent: 'dark',
        },
      },
    )

    expect(meta.key).toBe('chat')
    expect(meta.label).toBe('Chat')
    expect(meta.icon).toBe('fas fa-paper-plane')
    expect(meta.toneClass).toBe('accent-dark')
  })

  test('keeps independent Chat notification identity outside the system app icon pack', () => {
    const meta = resolveNotificationModuleMeta(
      {
        source: 'chat_ai_reply',
        route: '/chat/7',
      },
      'en-US',
      {},
      'soft-rounded',
    )

    expect(meta.appId).toBe('app_chat')
    expect(meta.icon).toBe('fas fa-comment')
    expect(meta.toneClass).toBe('accent-default')
  })
})
