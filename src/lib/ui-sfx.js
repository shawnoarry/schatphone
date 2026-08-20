import { createUISFX } from 'uisfx'

export const DEFAULT_UI_SFX_PROFILE = 'wechat'
export const UI_SFX_PROFILE_OPTIONS = Object.freeze([
  {
    id: 'kakaotalk',
    labelZh: 'KakaoTalk 原声',
    labelEn: 'KakaoTalk SMS tone',
    descriptionZh: '使用 KakaoTalk SMS tone 音频。',
    descriptionEn: 'Use the KakaoTalk SMS tone audio.',
    pack: 'soft',
    customAudioPath: 'audio/ui-sfx/kakaotalk-sms-tone.mp3',
  },
  {
    id: 'kakaotalk-single',
    labelZh: 'KakaoTalk 单声',
    labelEn: 'KakaoTalk single tone',
    descriptionZh: '保留原音后半段第二声的短促版本。',
    descriptionEn: 'A short one-tone variant using the second half of the original audio.',
    pack: 'soft',
    customAudioPath: 'audio/ui-sfx/kakaotalk-sms-tone-single.wav',
  },
  {
    id: 'imessage',
    labelZh: 'iMessage 式',
    labelEn: 'iMessage-like',
    descriptionZh: '明亮、清脆的玻璃质感提示。',
    descriptionEn: 'Bright, crystalline notification feedback.',
    pack: 'glass',
    customAudioPath: 'audio/ui-sfx/imessage-like.mp3',
  },
  {
    id: 'wechat',
    labelZh: '微信式',
    labelEn: 'WeChat-like',
    descriptionZh: '柔和、圆润的消息提示。',
    descriptionEn: 'Soft, rounded message feedback.',
    pack: 'soft',
    customAudioPath: 'audio/ui-sfx/wechat-like.mp3',
  },
  {
    id: 'msn',
    labelZh: 'MSN Messenger',
    labelEn: 'MSN Messenger',
    descriptionZh: '带有桌面聊天怀旧感的消息提示。',
    descriptionEn: 'A nostalgic desktop-chat message cue.',
    pack: 'soft',
    customAudioPath: 'audio/ui-sfx/msn-message.mp3',
  },
  {
    id: 'icq',
    labelZh: 'ICQ',
    labelEn: 'ICQ',
    descriptionZh: '复古、俏皮、辨识度很高的提示。',
    descriptionEn: 'A playful, highly recognizable retro cue.',
    pack: 'arcade',
    customAudioPath: 'audio/ui-sfx/icq-messenger.mp3',
  },
  {
    id: 'line',
    labelZh: 'LINE',
    labelEn: 'LINE',
    descriptionZh: '轻快、可爱的社交消息提示。',
    descriptionEn: 'A bright, playful social-message cue.',
    pack: 'glass',
    customAudioPath: 'audio/ui-sfx/line-messenger.mp3',
  },
  {
    id: 'discord',
    labelZh: 'Discord',
    labelEn: 'Discord',
    descriptionZh: '偏社区、游戏和夜间在线感。',
    descriptionEn: 'A modern community and gaming cue.',
    pack: 'arcade',
    customAudioPath: 'audio/ui-sfx/discord-sound-effect.mp3',
  },
  {
    id: 'whatsapp',
    labelZh: 'WhatsApp',
    labelEn: 'WhatsApp',
    descriptionZh: '克制、现代、全球化的消息提示。',
    descriptionEn: 'A restrained, modern global-message cue.',
    pack: 'soft',
    customAudioPath: 'audio/ui-sfx/whatsapp-notification.mp3',
  },
  {
    id: 'samsung-over-the-horizon',
    labelZh: 'Samsung Over the Horizon',
    labelEn: 'Samsung Over the Horizon',
    descriptionZh: '熟悉的 Samsung 品牌旋律，作为较完整的基础消息提醒。',
    descriptionEn: 'A familiar Samsung brand melody used as a fuller base notification.',
    pack: 'soft',
    customAudioPath: 'audio/brand/samsung-over-the-horizon.mp3',
    customAudioDurationMs: 3200,
  },
  {
    id: 'samsung-whistle',
    labelZh: 'Samsung Whistle',
    labelEn: 'Samsung Whistle',
    descriptionZh: '短促、轻快的 Samsung 社区提示音，只用于消息通知。',
    descriptionEn: 'A short, bright Samsung community cue for message notifications only.',
    pack: 'soft',
    customAudioPath: 'audio/brand/samsung-whistle.mp3',
    customAudioDurationMs: 1800,
  },
  {
    id: 'minimal',
    labelZh: '系统提示',
    labelEn: 'System',
    descriptionZh: '干净、克制，适合长期使用的系统反馈。',
    descriptionEn: 'Clean, restrained feedback for everyday system use.',
    pack: 'minimal',
  },
  {
    id: 'arcade',
    labelZh: '街机',
    labelEn: 'Arcade',
    descriptionZh: '保留给旧存档的街机反馈，不在选择器中显示。',
    descriptionEn: 'Legacy arcade feedback kept for older saved profiles.',
    pack: 'arcade',
    visible: false,
  },
])

const UI_SFX_PACK = 'soft'
const UI_SFX_VOLUME = 0.5

let player = null
let playerFailed = false
let unlockStarted = false
let playerPack = UI_SFX_PACK
const customAudioPlayers = new Map()

const resolveProfile = (profileId) =>
  UI_SFX_PROFILE_OPTIONS.find((profile) => profile.id === profileId) ||
  UI_SFX_PROFILE_OPTIONS.find((profile) => profile.id === DEFAULT_UI_SFX_PROFILE) ||
  UI_SFX_PROFILE_OPTIONS[0]

export const normalizeUiSfxProfile = (profileId) => {
  const profile = resolveProfile(profileId)
  if (profile.visible === false) return 'minimal'
  return profile.id
}

export const getUiSfxProfile = (profileId) => resolveProfile(profileId)

export const resolveGlobalUiSfxSettings = (appearance = {}) => ({
  enabled: appearance?.soundEffectsEnabled !== false,
  profile: normalizeUiSfxProfile(appearance?.soundEffectsProfile),
  followsGlobal: false,
})

export const resolveChatUiSfxSettings = (appearance = {}) => {
  const globalSettings = resolveGlobalUiSfxSettings(appearance)
  const chatAppearance = appearance?.chat && typeof appearance.chat === 'object' ? appearance.chat : {}
  const hasEnabledOverride = typeof chatAppearance.soundEffectsEnabled === 'boolean'
  const hasProfileOverride =
    typeof chatAppearance.soundEffectsProfile === 'string' && chatAppearance.soundEffectsProfile.trim().length > 0
  const hasOverride = hasEnabledOverride || hasProfileOverride

  return {
    enabled: hasEnabledOverride ? chatAppearance.soundEffectsEnabled : globalSettings.enabled,
    profile: hasProfileOverride
      ? normalizeUiSfxProfile(chatAppearance.soundEffectsProfile)
      : globalSettings.profile,
    followsGlobal: !hasOverride,
  }
}

const resolveCustomAudioUrl = (audioPath) => {
  const baseUrl = import.meta.env?.BASE_URL || '/'
  return baseUrl.replace(/\/$/, '') + '/' + audioPath
}

const resolveCustomAudio = (audioPath) => {
  if (!audioPath) return null
  if (customAudioPlayers.has(audioPath)) return customAudioPlayers.get(audioPath)
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null
  let audio = null
  try {
    audio = new Audio(resolveCustomAudioUrl(audioPath))
    audio.preload = 'auto'
    audio.volume = UI_SFX_VOLUME
    customAudioPlayers.set(audioPath, audio)
  } catch {
    audio = null
  }
  return audio
}

const playCustomAudio = (audioPath, { maxDurationMs = 0 } = {}) => {
  const audio = resolveCustomAudio(audioPath)
  if (!audio) return null
  let stopTimer = null
  const stop = () => {
    if (stopTimer) clearTimeout(stopTimer)
    stopTimer = null
    try {
      audio.pause()
      audio.currentTime = 0
    } catch {
      // Stopping is best-effort when the browser has not created a media pipeline yet.
    }
  }
  try {
    stop()
    Promise.resolve(audio.play()).catch(() => {})
    const durationMs = Number(maxDurationMs)
    if (Number.isFinite(durationMs) && durationMs > 0) {
      stopTimer = setTimeout(stop, durationMs)
    }
    return {
      stop,
    }
  } catch {
    return null
  }
}

const resolvePlayer = (pack = UI_SFX_PACK) => {
  if (player) {
    if (playerPack !== pack && typeof player.setPack === 'function') {
      try {
        player.setPack(pack)
        playerPack = pack
      } catch {
        return player
      }
    }
    return player
  }
  if (playerFailed) return null
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  try {
    player = createUISFX({
      pack,
      volume: UI_SFX_VOLUME,
    })
    playerPack = pack
  } catch {
    playerFailed = true
    return null
  }
  return player
}

export const playUiCue = (cue, options = {}) => {
  if (typeof cue !== 'string' || !cue) return null
  const profile = resolveProfile(options.profile)
  if (profile.customAudioPath && cue === 'notification') {
    return playCustomAudio(profile.customAudioPath, {
      maxDurationMs: profile.customAudioDurationMs,
    })
  }
  const playerOptions = { ...options }
  delete playerOptions.profile
  const activePlayer = resolvePlayer(profile.pack)
  if (!activePlayer) return null
  try {
    return activePlayer.play(cue, playerOptions)
  } catch {
    return null
  }
}

export const unlockUiSfx = () => {
  if (unlockStarted) return
  unlockStarted = true
  const activePlayer = resolvePlayer()
  if (!activePlayer) return
  try {
    Promise.resolve(activePlayer.unlock()).catch(() => {})
  } catch {
    // Audio unlock is best-effort; playback stays silent on failure.
  }
}
