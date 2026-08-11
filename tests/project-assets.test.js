import { describe, expect, test } from 'vitest'
import {
  PROJECT_ASSET_BASE_URL,
  projectAssetUrl,
  projectUiAssetUrl,
} from '../src/lib/project-assets'
import { resolveFoodDeliveryAssetUrl } from '../src/lib/food-shop-presentation'

describe('project asset URLs', () => {
  test('builds one canonical public image-bed URL', () => {
    expect(projectAssetUrl('/images/ui-assets/apps/map/seoul map.webp')).toBe(
      `${PROJECT_ASSET_BASE_URL}/file/schatphone-assets/images/ui-assets/apps/map/seoul%20map.webp`,
    )
    expect(projectUiAssetUrl('/apps/wallet/cards/card.webp')).toBe(
      `${PROJECT_ASSET_BASE_URL}/file/schatphone-assets/images/ui-assets/apps/wallet/cards/card.webp`,
    )
  })

  test('rejects unsafe or incomplete project asset paths', () => {
    expect(projectAssetUrl('../secret.png')).toBe('')
    expect(projectAssetUrl('images/ui-assets/')).toBe('')
  })

  test('migrates same-origin legacy food assets and preserves external URLs', () => {
    const expected =
      `${PROJECT_ASSET_BASE_URL}/file/schatphone-assets/images/ui-assets/` +
      'apps/food-delivery/moon-bistro/dish.png?v=2#hero'
    expect(
      resolveFoodDeliveryAssetUrl(
        'https://schatphone.example/schatphone/images/ui-assets/apps/food-delivery/moon-bistro/dish.png?v=2#hero',
        { origin: 'https://schatphone.example' },
      ),
    ).toBe(expected)
    expect(
      resolveFoodDeliveryAssetUrl('https://images.example.com/dish.png', {
        origin: 'https://schatphone.example',
      }),
    ).toBe('https://images.example.com/dish.png')
  })
})
