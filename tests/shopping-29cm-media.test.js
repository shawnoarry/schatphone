import { describe, expect, it } from 'vitest'
import { SHOPPING_29CM_EDITORIAL_MEDIA, SHOPPING_29CM_ISSUES, SHOPPING_29CM_PRODUCT_MEDIA, shopping29cmEditorialMedia, shopping29cmEditorialSource, shopping29cmIssueMedia, shopping29cmIssueSource, shopping29cmMediaSource, shopping29cmProductMedia } from '../src/components/shopping/shopping-29cm-media'

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

  it('does not claim unpublished media is runtime-ready', () => {
    expect(shopping29cmMediaSource(shopping29cmProductMedia(productIds[0]))).toBe('')
    expect(shopping29cmProductMedia('missing-product', 'main')).toBeNull()
  })

  it('keeps editorial slots addressable without publishing them early', () => {
    expect(Object.keys(SHOPPING_29CM_EDITORIAL_MEDIA)).toEqual(['desk', 'evening', 'departure', 'hard', 'soft'])
    expect(shopping29cmIssueMedia(SHOPPING_29CM_ISSUES[0].id)).toBe(SHOPPING_29CM_ISSUES[0])
    expect(shopping29cmIssueSource(SHOPPING_29CM_ISSUES[0].id)).toBe('')
    expect(shopping29cmEditorialMedia('desk')).toBe(SHOPPING_29CM_EDITORIAL_MEDIA.desk)
    expect(shopping29cmEditorialSource('desk')).toBe('')
    expect(shopping29cmEditorialMedia('missing')).toBeNull()
  })
})
