const MAX_INTERNAL_ROUTE_LENGTH = 2048

const normalizeId = (value, maxLength = 180) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

const readMapPackIdFromLocationShareRoute = (rawRoute) => {
  if (typeof rawRoute !== 'string') return ''
  const route = rawRoute.trim()
  if (!route || route.length > MAX_INTERNAL_ROUTE_LENGTH) return ''
  if (!route.startsWith('/') || route.startsWith('//')) return ''

  try {
    const url = new URL(route, 'https://schatphone.local')
    if (url.origin !== 'https://schatphone.local' || url.pathname !== '/map') return ''
    return normalizeId(url.searchParams.get('mapPackId'), 120)
  } catch {
    return ''
  }
}

export const listChatMapPackReferences = ({ messagesByConversation = {} } = {}) => {
  if (
    !messagesByConversation ||
    typeof messagesByConversation !== 'object' ||
    Array.isArray(messagesByConversation)
  ) {
    return []
  }

  const references = []
  const seen = new Set()

  Object.entries(messagesByConversation).forEach(([rawConversationKey, rawMessages]) => {
    const conversationKey = normalizeId(rawConversationKey, 40)
    if (!conversationKey || !Array.isArray(rawMessages)) return

    rawMessages.forEach((message) => {
      const messageId = normalizeId(message?.id, 120)
      if (!messageId || !Array.isArray(message?.blocks)) return

      message.blocks.forEach((block, blockIndex) => {
        if (
          block?.type !== 'share_card' ||
          block?.shareType !== 'location_share' ||
          block?.sourceModule !== 'map'
        ) {
          return
        }

        const mapPackId = readMapPackIdFromLocationShareRoute(block.route)
        if (!mapPackId) return

        const referenceId = `${conversationKey}:${messageId}:${blockIndex}`
        if (seen.has(referenceId)) return
        seen.add(referenceId)
        references.push({
          owner: 'chat',
          kind: 'location_share',
          referenceId,
          mapPackId,
          active: false,
        })
      })
    })
  })

  return references
}
