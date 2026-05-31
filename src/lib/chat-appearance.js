export const CHAT_APPEARANCE_PRESETS = Object.freeze(['kakao_immersive'])
export const CHAT_MESSAGE_LAYOUT_MODES = Object.freeze(['wechat', 'kakao', 'imessage'])

export const DEFAULT_CHAT_APPEARANCE = Object.freeze({
  presetId: 'kakao_immersive',
  messageLayout: 'kakao',
  customCss: '',
  customCssEnabled: false,
})

const MAX_CHAT_CUSTOM_CSS_CHARS = 20000

const normalizeText = (value, maxLength = 120) => {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

export const normalizeChatAppearance = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  const presetId = normalizeText(source.presetId)
  const messageLayout = normalizeText(source.messageLayout)

  return {
    presetId: CHAT_APPEARANCE_PRESETS.includes(presetId)
      ? presetId
      : DEFAULT_CHAT_APPEARANCE.presetId,
    messageLayout: CHAT_MESSAGE_LAYOUT_MODES.includes(messageLayout)
      ? messageLayout
      : DEFAULT_CHAT_APPEARANCE.messageLayout,
    customCss:
      typeof source.customCss === 'string'
        ? source.customCss.slice(0, MAX_CHAT_CUSTOM_CSS_CHARS)
        : DEFAULT_CHAT_APPEARANCE.customCss,
    customCssEnabled: source.customCssEnabled === true,
  }
}
