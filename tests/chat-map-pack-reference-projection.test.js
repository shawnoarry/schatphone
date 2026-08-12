import { describe, expect, test } from 'vitest'
import { listChatMapPackReferences } from '../src/lib/chat-map-pack-reference-projection'

describe('Chat Map pack reference projection', () => {
  test('projects persisted Map location cards as historical references without copying message bodies', () => {
    const references = listChatMapPackReferences({
      messagesByConversation: {
        42: [
          {
            id: 'message-location-1',
            content: 'must not leak',
            blocks: [
              { type: 'text', text: 'must not leak either' },
              {
                type: 'share_card',
                shareType: 'location_share',
                sourceModule: 'map',
                title: 'Private place title',
                summary: 'Private place summary',
                route:
                  '/map?placeId=address%3A88&mapPackId=catalog-neon-borough-v1&source=chat&intent=location_share',
              },
            ],
          },
        ],
      },
    })

    expect(references).toEqual([
      {
        owner: 'chat',
        kind: 'location_share',
        referenceId: '42:message-location-1:1',
        mapPackId: 'catalog-neon-borough-v1',
        active: false,
      },
    ])
    expect(JSON.stringify(references)).not.toContain('must not leak')
    expect(JSON.stringify(references)).not.toContain('Private place')
  })

  test('fails closed for non-Map cards, malformed routes, external routes, and missing IDs', () => {
    expect(
      listChatMapPackReferences({
        messagesByConversation: {
          7: [
            {
              id: 'message-invalid-cards',
              blocks: [
                {
                  type: 'share_card',
                  shareType: 'product_link',
                  sourceModule: 'map',
                  route: '/map?mapPackId=map-1',
                },
                {
                  type: 'share_card',
                  shareType: 'location_share',
                  sourceModule: 'shopping',
                  route: '/map?mapPackId=map-1',
                },
                {
                  type: 'share_card',
                  shareType: 'location_share',
                  sourceModule: 'map',
                  route: '/shopping?mapPackId=map-1',
                },
                {
                  type: 'share_card',
                  shareType: 'location_share',
                  sourceModule: 'map',
                  route: 'https://example.com/map?mapPackId=map-1',
                },
                {
                  type: 'share_card',
                  shareType: 'location_share',
                  sourceModule: 'map',
                  route: '//example.com/map?mapPackId=map-1',
                },
                {
                  type: 'share_card',
                  shareType: 'location_share',
                  sourceModule: 'map',
                  route: '/map?placeId=place-1',
                },
              ],
            },
            {
              id: '',
              blocks: [
                {
                  type: 'share_card',
                  shareType: 'location_share',
                  sourceModule: 'map',
                  route: '/map?mapPackId=map-1',
                },
              ],
            },
          ],
        },
      }),
    ).toEqual([])
  })

  test('returns no references for malformed conversation storage', () => {
    expect(listChatMapPackReferences({ messagesByConversation: [] })).toEqual([])
    expect(listChatMapPackReferences({ messagesByConversation: null })).toEqual([])
  })
})
