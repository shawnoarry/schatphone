import { describe, expect, test } from 'vitest'
import {
  SHAREABLE_OBJECT_TYPES,
  createMapLocationShareObject,
  createMusicTrackShareObject,
  createPayeeAccountShareObject,
  createProductLinkShareObject,
  createTrackingShareObject,
  createVirtualGiftShareObject,
  createWalletReceiptShareObject,
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

  test('builds Map and Music shares with precise source routes and no mutation claim', () => {
    const location = createMapLocationShareObject({
      placeId: 'seoul-sm-hq',
      mapPackId: 'modern-seoul',
      title: 'SM Entertainment',
      summary: 'Seongsu, Seoul',
    })
    const track = createMusicTrackShareObject({
      trackRef: { id: 'demo_blue_hour', providerId: 'demo' },
      presentation: {
        title: 'Blue Hour Drive',
        artist: 'North Arcade',
        album: 'City in Stereo',
        coverUrl: 'https://images.example.test/blue-hour.jpg',
      },
    })

    expect(location).toMatchObject({
      type: SHAREABLE_OBJECT_TYPES.LOCATION_SHARE,
      sourceModule: 'map',
      sourceId: 'seoul-sm-hq',
      route:
        '/map?placeId=seoul-sm-hq&mapPackId=modern-seoul&source=chat&intent=location_share',
    })
    expect(location.aiContext.mutationBoundary).toContain('Map owns')
    expect(track).toMatchObject({
      type: SHAREABLE_OBJECT_TYPES.MUSIC_TRACK_SHARE,
      sourceModule: 'music',
      sourceId: 'demo_blue_hour',
      title: 'Blue Hour Drive',
      summary: 'North Arcade · City in Stereo',
      route: '/music?source=chat&track=demo_blue_hour',
      previewImageUrl: 'https://images.example.test/blue-hour.jpg',
    })
    expect(track.aiContext.mutationBoundary).toContain('Music owns playback')
  })

  test('builds a Wallet-owned role payee card without moving money', () => {
    const share = createPayeeAccountShareObject({
      payeeAccountId: 'role_payee_1_icbc_cny',
      ownerProfileId: 1,
      sourceChatId: 1,
      sourceMessageId: 'chat_payee_share_1',
      institutionId: 'icbc',
      institutionLabel: 'ICBC',
      currency: 'CNY',
      amount: '88.50',
      note: '练习结束后的晚餐',
      title: 'ICBC · CNY receiving account',
      summary: 'Eva · Account •••• 1288',
    })

    expect(share).toMatchObject({
      type: SHAREABLE_OBJECT_TYPES.PAYEE_ACCOUNT,
      sourceModule: 'wallet',
      sourceId: 'role_payee_1_icbc_cny',
      sourceEventId: 'chat_payee_share_1',
      amountLabel: '88.50 CNY',
      serviceKey: 'icbc',
      serviceLabel: 'ICBC',
    })
    expect(share.route).toContain('/wallet?source=chat&intent=payee_account')
    expect(share.route).toContain('payeeAccountId=role_payee_1_icbc_cny')
    expect(new URLSearchParams(share.route.split('?')[1]).get('note')).toBe('练习结束后的晚餐')
    expect(share.aiContext.mutationBoundary).toContain('does not move money')
  })

  test('finalizes a Wallet receipt route for the actual receiving Chat conversation', () => {
    const share = createWalletReceiptShareObject({
      receiptId: 'wallet_tx_42',
      receiptNumber: 'SP20260517000420',
      title: '转账回执',
      summary: '已向 Eva 完成转账 · SP20260517000420',
      statusLabel: '已完成',
      amount: '25.50',
      currency: 'CNY',
      createdAt: 1_747_472_400_000,
    })

    expect(share).toMatchObject({
      type: SHAREABLE_OBJECT_TYPES.WALLET_RECEIPT_SHARE,
      sourceModule: 'wallet',
      sourceId: 'wallet_tx_42',
      sourceEventId: 'SP20260517000420',
      amountLabel: '25.50 CNY',
      route: '/wallet?receiptId=wallet_tx_42&intent=wallet_receipt_share',
    })

    const block = shareableObjectToChatBlock(share, { recipientChatId: 2 })
    const routeQuery = new URLSearchParams(block.route.split('?')[1])
    expect(block).toMatchObject({
      type: 'share_card',
      shareType: SHAREABLE_OBJECT_TYPES.WALLET_RECEIPT_SHARE,
      sourceModule: 'wallet',
      sourceId: 'wallet_tx_42',
    })
    expect(routeQuery.get('receiptId')).toBe('wallet_tx_42')
    expect(routeQuery.get('intent')).toBe(SHAREABLE_OBJECT_TYPES.WALLET_RECEIPT_SHARE)
    expect(routeQuery.get('source')).toBe('chat_share')
    expect(routeQuery.get('returnChatId')).toBe('2')
    expect(share.route).not.toContain('returnChatId')
  })

  test('drops unusable share objects without title or source id', () => {
    expect(normalizeShareableObject({ type: 'product_link', title: 'Mira Lens' })).toBeNull()
    expect(normalizeShareableObject({ type: 'product_link', sourceId: 'p1' })).toBeNull()
  })
})
