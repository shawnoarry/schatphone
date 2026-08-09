import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ChatMessageRow from '../src/components/chat/ChatMessageRow.vue'
import { useChatStore } from '../src/stores/chat'

const mountMessage = (blocks, overrides = {}) =>
  mount(ChatMessageRow, {
    props: {
      message: {
        id: 'rich-message',
        role: 'user',
        content: 'Rich message',
        blocks,
        status: 'delivered',
        ...overrides.message,
      },
      senderName: 'Mira',
      messageBlocks: (message) => message.blocks,
      renderMarkdown: (text) => text,
      resolveImageBlockUrl: (_messageId, _blockIndex, block) => block.url || '',
      formatVoiceDuration: (seconds) => `${seconds}s`,
      transferActionLabel: () => 'Open Wallet',
      ...overrides.props,
    },
  })

describe('Chat rich-message acceptance matrix', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('renders user-authored rich blocks at stable rich width', () => {
    const wrapper = mountMessage([
      { type: 'voice_virtual', label: 'Voice message', transcript: 'Meet at eight', durationSec: 9 },
      { type: 'link_external', label: 'Reference', url: 'https://example.com', note: 'Read later' },
      { type: 'module_link', label: 'Location share', route: '/map', note: 'Seoul Station' },
      { type: 'image_virtual', alt: 'Stage photo', caption: 'One-off send', url: 'data:image/png;base64,AA==' },
    ])

    expect(wrapper.get('.chat-message-content').attributes('data-content-width-mode')).toBe('rich')
    expect(wrapper.findAll('[data-block-type]')).toHaveLength(4)
    expect(wrapper.text()).toContain('Meet at eight')
    expect(wrapper.text()).toContain('9s')
    expect(wrapper.text()).toContain('https://example.com')
    expect(wrapper.text()).toContain('Seoul Station')
    expect(wrapper.get('img').attributes('alt')).toBe('Stage photo')
    expect(wrapper.text()).toContain('One-off send')
  })

  test('keeps external and module destinations behind explicit actions', async () => {
    const wrapper = mountMessage([
      { type: 'link_external', label: 'Reference', url: 'https://example.com/story' },
      { type: 'module_link', label: 'Location share', route: '/map' },
    ])

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('open-external-url')?.[0]).toEqual(['https://example.com/story'])
    expect(wrapper.emitted('open-module-route')?.[0]).toEqual(['/map'])
  })

  test('renders source-owned share cards without claiming source mutation', async () => {
    const block = {
      type: 'share_card',
      shareType: 'tracking_share',
      sourceModule: 'logistics',
      sourceId: 'parcel-7',
      title: 'Package tracking',
      summary: 'Arriving tomorrow',
      statusLabel: 'In transit',
      route: '/shopping?category=logistics',
      aiContext: {
        mutationBoundary: 'Chat can discuss the delivery; Logistics owns delivery state.',
      },
    }
    const wrapper = mountMessage([block])

    expect(wrapper.get('[data-testid="chat-share-card-logistics-parcel-7"]').text()).toContain(
      'Logistics owns delivery state',
    )
    await wrapper.get('[data-testid="chat-share-card-open-logistics-parcel-7"]').trigger('click')
    expect(wrapper.emitted('open-share-card-route')?.[0]).toEqual([block])
  })

  test('renders a Music share as a source-owned preview with an explicit return action', async () => {
    const block = {
      type: 'share_card',
      shareType: 'music_track_share',
      sourceModule: 'music',
      sourceId: 'demo_blue_hour',
      title: 'Blue Hour Drive',
      summary: 'North Arcade · City in Stereo',
      previewImageUrl: 'https://images.example.test/blue-hour.jpg',
      route: '/music?source=chat&track=demo_blue_hour',
      aiContext: {
        mutationBoundary: 'Chat can discuss this track; Music owns playback state.',
      },
    }
    const wrapper = mountMessage([block])

    const card = wrapper.get('[data-testid="chat-share-card-music-demo_blue_hour"]')
    expect(card.text()).toMatch(/音乐分享|Music share/)
    expect(card.text()).toContain('Blue Hour Drive')
    expect(card.get('img').attributes('alt')).toBe('Blue Hour Drive')
    expect(card.text()).toMatch(/在音乐中查看|View in Music/)
    await card.get('button').trigger('click')
    expect(wrapper.emitted('open-share-card-route')?.[0]).toEqual([block])
  })

  test('renders a Wallet receipt as a finished consumer card without internal ownership copy', async () => {
    const block = {
      type: 'share_card',
      shareType: 'wallet_receipt_share',
      sourceModule: 'wallet',
      sourceId: 'wallet_tx_42',
      sourceEventId: 'SP20260517000420',
      title: '转账回执',
      summary: '已向 Eva 完成转账 · SP20260517000420',
      statusLabel: '已完成',
      amountLabel: '25.50 CNY',
      category: 'CNY',
      route:
        '/wallet?receiptId=wallet_tx_42&intent=wallet_receipt_share&source=chat_share&returnChatId=2',
      aiContext: {
        mutationBoundary: 'Wallet owns the transaction and receipt state.',
      },
    }
    const wrapper = mountMessage([block])
    const card = wrapper.get('[data-testid="chat-share-card-wallet-wallet_tx_42"]')

    expect(card.text()).toMatch(/钱包回执|Wallet receipt/)
    expect(card.text()).toContain('25.50 CNY')
    expect(card.text()).toMatch(/查看回执|View receipt/)
    expect(card.text()).not.toContain('Wallet owns the transaction')
    expect(card.text()).not.toContain('wallet_receipt_share')
    await card.get('button').trigger('click')
    expect(wrapper.emitted('open-share-card-route')?.[0]).toEqual([block])
  })

  test('separates service source actions from Chat replies in full and compact cards', async () => {
    const block = {
      type: 'service_notification',
      kind: 'logistics_update',
      sourceModule: 'shopping_logistics',
      sourceId: 'parcel-8',
      sourceEventId: 'event-1',
      title: 'Courier picked up the parcel',
      summary: 'ETA 18:30',
      statusLabel: 'Picked up',
      actions: [{ key: 'track', label: 'Track', route: '/shopping?category=logistics' }],
    }
    const full = mountMessage([block], { message: { role: 'assistant' } })

    expect(full.find('[data-testid="chat-service-notification-source-actions"]').exists()).toBe(true)
    expect(full.find('[data-testid="chat-service-notification-reply-actions"]').exists()).toBe(true)
    await full.get('[data-testid="chat-service-notification-action-parcel-8-0"]').trigger('click')
    await full.get('[data-testid="chat-service-notification-reply-parcel-8"]').trigger('click')
    expect(full.emitted('open-service-notification-route')?.[0]).toEqual([block, block.actions[0]])
    expect(full.emitted('quote-service-notification')?.[0]?.[0]).toMatchObject({ block })

    const compact = mountMessage([block], {
      message: { role: 'assistant' },
      props: { serviceNotificationDensity: 'compact' },
    })
    expect(compact.find('[data-testid="chat-service-notification-action-hint"]').exists()).toBe(false)
    expect(compact.find('[data-testid="chat-service-notification-compact-actions"]').exists()).toBe(true)
  })

  test('keeps legacy mini-scene HTML inert', () => {
    const wrapper = mountMessage([
      {
        type: 'mini_scene',
        title: 'Legacy scene',
        description: 'Historical preview',
        htmlSnippet: '<script>window.__executed = true</script><button>Run</button>',
      },
    ])

    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('pre').text()).toContain('<script>')
    expect(wrapper.find('pre').text()).toContain('<button>Run</button>')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  test('preserves a bounded one-off image data URL in Chat history', () => {
    const store = useChatStore()
    const inlineUrl = 'data:image/png;base64,AA=='
    const message = store.appendMessage(1, {
      role: 'user',
      content: 'One-off image',
      blocks: [
        {
          type: 'image_virtual',
          alt: 'one-off.png',
          url: inlineUrl,
          caption: 'One-off send',
        },
      ],
    })

    expect(message.blocks[0]).toMatchObject({
      type: 'image_virtual',
      alt: 'one-off.png',
      url: inlineUrl,
    })
  })
})
