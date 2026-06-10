import { describe, expect, test } from 'vitest'
import { normalizeHttpImageUrl, normalizeImageSource } from '../src/lib/image-source-contract'

describe('image source contract', () => {
  test('keeps http image URLs canonical', () => {
    expect(normalizeHttpImageUrl('https://example.com/food.png')).toBe('https://example.com/food.png')
  })

  test('accepts app-local public image URLs without turning them into remote URLs', () => {
    expect(normalizeHttpImageUrl('/schatphone/images/ui-assets/apps/food-delivery/moon-bistro/dish.png')).toBe(
      '/schatphone/images/ui-assets/apps/food-delivery/moon-bistro/dish.png',
    )
    expect(
      normalizeImageSource({
        imageSourceType: 'url',
        imageUrl: '/schatphone/images/ui-assets/apps/food-delivery/moon-bistro/dish.png',
        imageAlt: 'Moon Bistro dish',
      }),
    ).toMatchObject({
      sourceType: 'url',
      url: '/schatphone/images/ui-assets/apps/food-delivery/moon-bistro/dish.png',
      alt: 'Moon Bistro dish',
    })
  })

  test('rejects protocol-relative and plain text image values', () => {
    expect(normalizeHttpImageUrl('//example.com/unsafe.png')).toBe('')
    expect(normalizeHttpImageUrl('images/relative.png')).toBe('')
  })
})
