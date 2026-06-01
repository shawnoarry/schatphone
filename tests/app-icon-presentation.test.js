import { describe, expect, test } from 'vitest'
import {
  normalizeAppIconOverrides,
  resolveAppIconMeta,
} from '../src/lib/app-icon-presentation'
import { resolveNotificationModuleMeta } from '../src/lib/notification-presentation'

describe('app icon presentation helpers', () => {
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
    const reminders = resolveAppIconMeta('app_reminders', {}, 'en-US')
    const food = resolveAppIconMeta('app_food_delivery', {}, 'en-US')
    const assets = resolveAppIconMeta('app_assets', {}, 'en-US')
    const worldHub = resolveAppIconMeta('app_control_center', {}, 'zh-CN')
    const appStore = resolveAppIconMeta('app_store', {}, 'zh-CN')

    expect(shopping.label).toBe('购物')
    expect(shopping.icon).toBe('fas fa-bag-shopping')
    expect(shopping.accent).toBe('warm')
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
})
