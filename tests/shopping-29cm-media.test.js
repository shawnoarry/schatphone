import { describe, expect, it } from 'vitest'
import { SHOPPING_29CM_EDITORIAL_MEDIA, SHOPPING_29CM_ISSUES, SHOPPING_29CM_MOTION_MEDIA, SHOPPING_29CM_PRODUCT_MEDIA, SHOPPING_29CM_STATE_MEDIA, shopping29cmEditorialMedia, shopping29cmEditorialSource, shopping29cmIssueMedia, shopping29cmIssueSource, shopping29cmMediaSource, shopping29cmOwnerNotes, shopping29cmProductMedia, shopping29cmStateSource } from '../src/components/shopping/shopping-29cm-media'

const productIds = [
  'shopping_seed_digital_lens',
  'shopping_seed_digital_headphones',
  'shopping_seed_digital_projector',
  'shopping_seed_digital_keyboard',
  'shopping_seed_nova_bedside_radio',
  'shopping_seed_nova_stone_tray',
  'shopping_seed_nova_letter_set',
  'shopping_seed_nova_carry_on',
  'shopping_seed_nova_fountain_pen',
]

describe('29CM media contract', () => {
  it('keeps four issue masters distinct', () => {
    expect(SHOPPING_29CM_ISSUES).toHaveLength(4)
    expect(new Set(SHOPPING_29CM_ISSUES.map((issue) => issue.id)).size).toBe(4)
  })

  it('maps every stable product to main, detail, and context slots', () => {
    expect(Object.keys(SHOPPING_29CM_PRODUCT_MEDIA)).toEqual(productIds)
    productIds.forEach((productId) => {
      expect(shopping29cmProductMedia(productId, 'main')?.id).toMatch(/^cm29-.+-main$/)
      expect(shopping29cmProductMedia(productId, 'detail')?.mediaPath).toContain('-detail.webp')
      expect(shopping29cmProductMedia(productId, 'context')?.mediaPath).toContain('-context.webp')
    })
  })

  it('publishes accepted product and owner media', () => {
    expect(shopping29cmMediaSource(shopping29cmProductMedia(productIds[0]))).toContain('/products/')
    const reviews = productIds.flatMap((productId) => shopping29cmOwnerNotes(productId))
    expect(reviews).toHaveLength(21)
    reviews.forEach((review) => {
      expect(review.rating).toBeGreaterThanOrEqual(1)
      expect(review.rating).toBeLessThanOrEqual(5)
      expect(review.scores).toHaveLength(3)
      expect(review.metricsZh).toHaveLength(3)
      expect(review.optionZh).toBeTruthy()
      expect(review.periodZh).toBeTruthy()
    })
    expect(shopping29cmOwnerNotes('shopping_seed_digital_keyboard')).toHaveLength(3)
    expect(shopping29cmProductMedia('missing-product', 'main')).toBeNull()
  })

  it('keeps editorial, state, and motion slots addressable', () => {
    expect(Object.keys(SHOPPING_29CM_EDITORIAL_MEDIA)).toEqual(['desk', 'evening', 'departure', 'hard', 'soft'])
    expect(shopping29cmIssueMedia(SHOPPING_29CM_ISSUES[0].id)).toBe(SHOPPING_29CM_ISSUES[0])
    expect(shopping29cmIssueSource(SHOPPING_29CM_ISSUES[0].id)).toContain('/issues/')
    expect(shopping29cmEditorialMedia('desk')).toBe(SHOPPING_29CM_EDITORIAL_MEDIA.desk)
    expect(shopping29cmEditorialSource('desk')).toContain('/editorial/')
    expect(shopping29cmStateSource('collection')).toContain('/states/')
    expect(Object.keys(SHOPPING_29CM_STATE_MEDIA)).toEqual(['collection', 'bag', 'archive', 'offline'])
    expect(shopping29cmMediaSource(SHOPPING_29CM_MOTION_MEDIA.loop)).toContain('/motion/')
    expect(shopping29cmEditorialMedia('missing')).toBeNull()
  })
})
