import { describe, expect, test } from 'vitest'
import {
  normalizeEntryOverrideId,
  normalizeEntryPresentationOverrides,
  resolveEntryPresentationMeta,
  resolveShopEntryBindingTargetOption,
} from '../src/lib/app-entry-presentation'

describe('app entry presentation helpers', () => {
  test('normalizes dynamic entry overrides for shop and world entries only', () => {
    const normalized = normalizeEntryPresentationOverrides({
      shop_app_food_seed_moon_bistro: {
        displayName: '  Moon   Kitchen  ',
        icon: 'fas fa-bowl-food',
        accent: 'dark',
        shortDescription: '  Late   night comfort menu  ',
        tags: 'Late night, Comfort, Comfort, Date',
        templateId: 'dessert_window',
      },
      world_app_survival_city_supply: {
        sourceType: 'gallery',
        galleryAssetId: 'asset_entry_icon',
        displayName: 'Supply Desk',
      },
      app_chat: {
        displayName: 'Should not persist here',
      },
      '../../bad': {
        displayName: 'Bad',
      },
    })

    expect(normalizeEntryOverrideId('shop_app_food_seed_moon_bistro')).toBe('shop_app_food_seed_moon_bistro')
    expect(normalized.shop_app_food_seed_moon_bistro).toEqual({
      sourceType: 'preset',
      displayName: 'Moon Kitchen',
      icon: 'fas fa-bowl-food',
      accent: 'dark',
      galleryAssetId: '',
      coverGalleryAssetId: '',
      shortDescription: 'Late night comfort menu',
      tags: ['Late night', 'Comfort', 'Date'],
      templateId: 'dessert_window',
      hasTemplateOverride: true,
      bindingTarget: 'food_delivery',
      hasBindingTargetOverride: false,
    })
    expect(normalized.world_app_survival_city_supply).toEqual({
      sourceType: 'gallery',
      displayName: 'Supply Desk',
      icon: 'fas fa-store',
      accent: 'warm',
      galleryAssetId: 'asset_entry_icon',
      coverGalleryAssetId: '',
      shortDescription: '',
      tags: [],
      templateId: '',
      hasTemplateOverride: false,
    })
    expect(normalized.app_chat).toBeUndefined()
    expect(normalized['../../bad']).toBeUndefined()
  })

  test('resolves shop entry presentation with fallback icon and display override', () => {
    const meta = resolveEntryPresentationMeta(
      {
        id: 'shop_app_food_seed_moon_bistro',
        icon: 'fas fa-store',
        accent: 'warm',
        bindingTarget: 'food_delivery',
      },
      {
        shop_app_food_seed_moon_bistro: {
          displayName: 'Moon Kitchen',
          icon: 'fas fa-bowl-food',
          accent: 'dark',
          shortDescription: 'Late night comfort menu',
          tags: ['date night'],
          templateId: 'cafe_counter',
          coverGalleryAssetId: 'asset_moon_cover',
        },
      },
    )

    expect(meta.displayName).toBe('Moon Kitchen')
    expect(meta.icon).toBe('fas fa-bowl-food')
    expect(meta.accent).toBe('dark')
    expect(meta.toneClass).toBe('accent-dark')
    expect(meta.hasImageIcon).toBe(false)
    expect(meta.shortDescription).toBe('Late night comfort menu')
    expect(meta.tags).toEqual(['date night'])
    expect(meta.templateId).toBe('cafe_counter')
    expect(meta.coverGalleryAssetId).toBe('asset_moon_cover')
    expect(meta.hasCoverImage).toBe(true)
    expect(meta.bindingTarget).toBe('food_delivery')
    expect(resolveShopEntryBindingTargetOption(meta.bindingTarget).labelEn).toBe('Food Delivery')
    expect(meta.hasOverride).toBe(true)
    expect(meta.hasTemplateOverride).toBe(true)
  })

  test('normalizes Shopping as a supported shop binding target', () => {
    const normalized = normalizeEntryPresentationOverrides({
      shop_app_shopping_daily_fresh: {
        displayName: 'Daily Fresh Store',
        bindingTarget: 'shopping',
        coverGalleryAssetId: 'asset_daily_fresh_cover',
      },
    })

    expect(normalized.shop_app_shopping_daily_fresh).toMatchObject({
      displayName: 'Daily Fresh Store',
      bindingTarget: 'shopping',
      coverGalleryAssetId: 'asset_daily_fresh_cover',
      hasBindingTargetOverride: true,
    })

    const meta = resolveEntryPresentationMeta(
      {
        id: 'shop_app_shopping_daily_fresh',
        icon: 'fas fa-basket-shopping',
        accent: 'light',
        entryKind: 'shop_app',
        shopAppEntry: true,
        sourceModule: 'shopping',
      },
      normalized,
    )

    expect(meta.bindingTarget).toBe('shopping')
    expect(meta.coverGalleryAssetId).toBe('asset_daily_fresh_cover')
    expect(meta.hasCoverImage).toBe(true)
    expect(resolveShopEntryBindingTargetOption(meta.bindingTarget).labelEn).toBe('Shopping')
  })
})
