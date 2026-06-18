import { describe, expect, test } from 'vitest'
import {
  SHAREABLE_OBJECT_TYPES,
  createProductLinkShareObject,
  createTrackingShareObject,
  createVirtualGiftShareObject,
  normalizeShareableObject,
  shareableObjectToChatBlock,
} from '../src/lib/shareable-object'

describe('shareable-object contract', () => {
  test('normalizes Shopping product links without implying a gift', () => {
    const share = createProductLinkShareObject({
      id: 'product_lens',
      title: 'Mira Lens',
      desc: 'Portable camera lens',
      category: 'digital',
      price: '1288.00 CNY',
      serviceKey: 'nova_digital',
      serviceLabel: 'Nova Digital',
    })

    expect(share).toMatchObject({
      type: SHAREABLE_OBJECT_TYPES.PRODUCT_LINK,
      sourceModule: 'shopping',
      sourceId: 'product_lens',
      title: 'Mira Lens',
      summary: 'Portable camera lens',
      statusLabel: 'Product link',
      amountLabel: '1288.00 CNY',
      route: '/shopping?productId=product_lens&category=digital&service=nova_digital&source=chat&intent=product_link',
      aiContext: {
        intent: 'product_link',
        sourceTruthOwner: 'Shopping',
      },
    })
    expect(share.aiContext.recipientMeaning).toContain('shared a Shopping product link')
    expect(share.aiContext.recipientMeaning).toContain('does not mean')
    expect(share.aiContext.mutationBoundary).toContain('Shopping owns product')
  })

  test('normalizes virtual gifts as sendable digital gifts', () => {
    const share = createVirtualGiftShareObject({
      id: 'gift_card',
      title: 'SchatPhone Gift Card',
      price: '88.00 CNY',
      giftable: true,
    })

    expect(share).toMatchObject({
      type: SHAREABLE_OBJECT_TYPES.VIRTUAL_GIFT,
      sourceModule: 'shopping',
      sourceId: 'gift_card',
      title: 'SchatPhone Gift Card',
      statusLabel: 'Virtual gift',
      amountLabel: '88.00 CNY',
    })
    expect(share.aiContext.intent).toBe('virtual_gift')
    expect(share.aiContext.recipientMeaning).toContain('digital gift')
  })

  test('normalizes tracking share objects for package context', () => {
    const share = createTrackingShareObject({
      sourceId: 'order_1',
      title: 'Package tracking',
      summary: 'Courier is on the way.',
      trackingCode: 'SF123456',
      route: '/shopping?category=logistics&orderId=order_1',
    })

    expect(share).toMatchObject({
      type: SHAREABLE_OBJECT_TYPES.TRACKING_SHARE,
      sourceModule: 'logistics',
      sourceId: 'order_1',
      title: 'Package tracking',
      summary: 'Courier is on the way.',
      statusLabel: 'Tracking',
      route: '/shopping?category=logistics&orderId=order_1',
      aiContext: {
        intent: 'tracking_share',
        sourceTruthOwner: 'Logistics',
      },
    })
    expect(share.aiContext.recipientMeaning).toContain('package or delivery')
  })

  test('converts a normalized share object into a Chat share card block', () => {
    const share = normalizeShareableObject({
      type: 'tracking_share',
      sourceModule: 'logistics',
      sourceId: 'order_1',
      title: 'Package tracking',
      summary: 'Courier is on the way.',
      route: '/shopping?category=logistics&orderId=order_1',
      aiContext: {
        intent: 'tracking_share',
        recipientMeaning: 'The package is on the way.',
        sourceTruthOwner: 'Logistics',
        mutationBoundary: 'Chat replies do not sign or update package state.',
      },
    })

    expect(shareableObjectToChatBlock(share)).toMatchObject({
      type: 'share_card',
      shareType: 'tracking_share',
      sourceModule: 'logistics',
      sourceId: 'order_1',
      title: 'Package tracking',
      summary: 'Courier is on the way.',
      route: '/shopping?category=logistics&orderId=order_1',
      aiContext: {
        intent: 'tracking_share',
        sourceTruthOwner: 'Logistics',
      },
    })
  })

  test('drops unusable share objects without title or source id', () => {
    expect(normalizeShareableObject({ type: 'product_link', title: 'Mira Lens' })).toBeNull()
    expect(normalizeShareableObject({ type: 'product_link', sourceId: 'p1' })).toBeNull()
  })
})
