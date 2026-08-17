import { normalizeUiSfxProfile } from './ui-sfx'

export const CHAT_APPEARANCE_PRESETS = Object.freeze(['kakao_immersive'])
export const CHAT_MESSAGE_LAYOUT_MODES = Object.freeze(['wechat', 'kakao', 'imessage'])
export const CHAT_MESSAGE_AVATAR_MODES = Object.freeze(['layout', 'all', 'hidden'])
export const CHAT_MESSAGE_BUBBLE_MODES = Object.freeze(['bubble', 'soft', 'outline', 'glass'])
export const CHAT_THEME_COLOR_MODES = Object.freeze(['layout', 'ocean', 'mint', 'coral'])
export const CHAT_BUBBLE_COLOR_MODES = Object.freeze(['theme', 'contrast', 'soft', 'mono'])
export const CHAT_CUSTOM_CSS_PROFILE_LIMIT = 12
export const CHAT_CUSTOM_CSS_PROFILE_NAME_MAX_CHARS = 80

export const DEFAULT_CHAT_APPEARANCE = Object.freeze({
  presetId: 'kakao_immersive',
  messageLayout: 'kakao',
  messageAvatarMode: 'layout',
  messageBubbleMode: 'bubble',
  themeColorMode: 'layout',
  bubbleColorMode: 'theme',
  soundEffectsEnabled: null,
  soundEffectsProfile: '',
  customCss: '',
  customCssEnabled: false,
  customCssProfiles: Object.freeze([]),
  activeCustomCssProfileId: '',
})

const MAX_CHAT_CUSTOM_CSS_CHARS = 20000

const normalizeText = (value, maxLength = 120) => {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

const normalizeCssProfileId = (value, fallback, usedIds) => {
  const raw = typeof value === 'string' ? value.trim().slice(0, 80) : ''
  const base = raw.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || fallback
  let id = base
  let suffix = 2
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }
  usedIds.add(id)
  return id
}

export const normalizeChatCssProfiles = (input = []) => {
  if (!Array.isArray(input)) return []
  const usedIds = new Set()
  return input.slice(0, CHAT_CUSTOM_CSS_PROFILE_LIMIT).reduce((profiles, item, index) => {
    const source = item && typeof item === 'object' ? item : {}
    const css = typeof source.css === 'string' ? source.css.slice(0, MAX_CHAT_CUSTOM_CSS_CHARS) : ''
    if (!css.trim()) return profiles
    const name = normalizeText(source.name, CHAT_CUSTOM_CSS_PROFILE_NAME_MAX_CHARS)
    profiles.push({
      id: normalizeCssProfileId(source.id, `chat-css-${index + 1}`, usedIds),
      name: name || `Chat style ${index + 1}`,
      css,
    })
    return profiles
  }, [])
}

export const normalizeChatAppearance = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  const presetId = normalizeText(source.presetId)
  const messageLayout = normalizeText(source.messageLayout)
  const messageAvatarMode = normalizeText(source.messageAvatarMode)
  const messageBubbleMode = normalizeText(source.messageBubbleMode)
  const themeColorMode = normalizeText(source.themeColorMode)
  const bubbleColorMode = normalizeText(source.bubbleColorMode)
  const legacyCustomCss =
    typeof source.customCss === 'string'
      ? source.customCss.slice(0, MAX_CHAT_CUSTOM_CSS_CHARS)
      : DEFAULT_CHAT_APPEARANCE.customCss
  let customCssProfiles = normalizeChatCssProfiles(source.customCssProfiles)
  let activeCustomCssProfileId = normalizeText(source.activeCustomCssProfileId, '', 80)
  const activeProfile = () => customCssProfiles.find((profile) => profile.id === activeCustomCssProfileId)

  if (!activeProfile() && legacyCustomCss.trim()) {
    const matchingProfile = customCssProfiles.find((profile) => profile.css === legacyCustomCss)
    if (matchingProfile) {
      activeCustomCssProfileId = matchingProfile.id
    } else {
      customCssProfiles = normalizeChatCssProfiles([
        {
          id: 'chat-css-legacy',
          name: 'Custom CSS',
          css: legacyCustomCss,
        },
        ...customCssProfiles,
      ])
      activeCustomCssProfileId = customCssProfiles.find((profile) => profile.css === legacyCustomCss)?.id || ''
    }
  }

  const selectedCustomCssProfile = activeProfile()

  return {
    presetId: CHAT_APPEARANCE_PRESETS.includes(presetId)
      ? presetId
      : DEFAULT_CHAT_APPEARANCE.presetId,
    messageLayout: CHAT_MESSAGE_LAYOUT_MODES.includes(messageLayout)
      ? messageLayout
      : DEFAULT_CHAT_APPEARANCE.messageLayout,
    messageAvatarMode: CHAT_MESSAGE_AVATAR_MODES.includes(messageAvatarMode)
      ? messageAvatarMode
      : DEFAULT_CHAT_APPEARANCE.messageAvatarMode,
    messageBubbleMode: CHAT_MESSAGE_BUBBLE_MODES.includes(messageBubbleMode)
      ? messageBubbleMode
      : DEFAULT_CHAT_APPEARANCE.messageBubbleMode,
    themeColorMode: CHAT_THEME_COLOR_MODES.includes(themeColorMode)
      ? themeColorMode
      : DEFAULT_CHAT_APPEARANCE.themeColorMode,
    bubbleColorMode: CHAT_BUBBLE_COLOR_MODES.includes(bubbleColorMode)
      ? bubbleColorMode
      : DEFAULT_CHAT_APPEARANCE.bubbleColorMode,
    soundEffectsEnabled:
      typeof source.soundEffectsEnabled === 'boolean' ? source.soundEffectsEnabled : null,
    soundEffectsProfile:
      typeof source.soundEffectsProfile === 'string' && source.soundEffectsProfile.trim()
        ? normalizeUiSfxProfile(source.soundEffectsProfile)
        : '',
    customCss: selectedCustomCssProfile?.css || legacyCustomCss,
    customCssEnabled: source.customCssEnabled === true,
    customCssProfiles,
    activeCustomCssProfileId: selectedCustomCssProfile?.id || '',
  }
}

export const getChatAppearanceClasses = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  const messageAvatarMode = CHAT_MESSAGE_AVATAR_MODES.includes(source.messageAvatarMode)
    ? source.messageAvatarMode
    : DEFAULT_CHAT_APPEARANCE.messageAvatarMode
  const messageBubbleMode = CHAT_MESSAGE_BUBBLE_MODES.includes(source.messageBubbleMode)
    ? source.messageBubbleMode
    : DEFAULT_CHAT_APPEARANCE.messageBubbleMode
  const themeColorMode = CHAT_THEME_COLOR_MODES.includes(source.themeColorMode)
    ? source.themeColorMode
    : DEFAULT_CHAT_APPEARANCE.themeColorMode
  const bubbleColorMode = CHAT_BUBBLE_COLOR_MODES.includes(source.bubbleColorMode)
    ? source.bubbleColorMode
    : DEFAULT_CHAT_APPEARANCE.bubbleColorMode

  return [
    `chat-preset-${source.presetId || DEFAULT_CHAT_APPEARANCE.presetId}`,
    `chat-layout-${source.messageLayout || DEFAULT_CHAT_APPEARANCE.messageLayout}`,
    `chat-avatar-mode-${messageAvatarMode}`,
    `chat-bubble-mode-${messageBubbleMode}`,
    `chat-theme-color-${themeColorMode}`,
    `chat-bubble-color-${bubbleColorMode}`,
  ]
}
