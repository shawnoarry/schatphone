import { projectUiAssetUrl } from './project-assets'

const APPEARANCE_SERIES = new Set([
  'standard',
  'licensed_ip',
  'art_series',
  'seasonal',
  'commemorative',
])

const APPEARANCE_ASSET_STATUSES = new Set(['ready', 'pending'])
const APPEARANCE_UNLOCK_SOURCES = new Set([
  'initial',
  'event',
  'metric',
  'spend',
  'draw',
  'service_reward',
])

const walletCardAssetUrl = (fileName = '') =>
  projectUiAssetUrl(`apps/wallet/cards/${String(fileName).replace(/^\/+/, '')}`)

const normalizeText = (value, fallback = '', maxLength = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, maxLength) : fallback
}

const normalizeStableId = (value, fallback = '') => {
  const normalized = normalizeText(value, fallback, 120).toLowerCase()
  return /^[a-z0-9_-]+$/.test(normalized) ? normalized : fallback
}

const appearance = (input) =>
  Object.freeze({
    id: input.id,
    paymentCardId: input.paymentCardId,
    titleZh: input.titleZh,
    titleEn: input.titleEn,
    series: input.series || 'standard',
    artwork: input.artwork || '',
    assetStatus: input.assetStatus || 'ready',
    unlockSource: input.unlockSource || 'initial',
    sortOrder: input.sortOrder || 0,
    material: input.material || 'satin',
    ink: input.ink || '#ffffff',
    mutedInk: input.mutedInk || 'rgba(255, 255, 255, 0.72)',
    chip: input.chip || '#e8c46c',
    accent: input.accent || '#f3c35a',
    overlay:
      input.overlay || 'linear-gradient(135deg, rgba(8, 12, 18, 0.1), rgba(8, 12, 18, 0.24))',
    mysteryTone: input.mysteryTone || 'graphite',
  })

export const WALLET_CARD_APPEARANCES = Object.freeze([
  appearance({
    id: 'icbc_peony_standard',
    paymentCardId: 'wallet_card_icbc_cny',
    titleZh: '牡丹标准卡',
    titleEn: 'Peony Standard',
    artwork: walletCardAssetUrl('icbc-peony-standard.webp'),
    sortOrder: 10,
    material: 'satin',
    accent: '#d6b56a',
  }),
  appearance({
    id: 'icbc_sealed_01',
    paymentCardId: 'wallet_card_icbc_cny',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'licensed_ip',
    assetStatus: 'pending',
    unlockSource: 'event',
    sortOrder: 20,
    mysteryTone: 'plum',
  }),
  appearance({
    id: 'icbc_sealed_02',
    paymentCardId: 'wallet_card_icbc_cny',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'commemorative',
    assetStatus: 'pending',
    unlockSource: 'service_reward',
    sortOrder: 30,
    mysteryTone: 'ink',
  }),
  appearance({
    id: 'kb_seoul_standard',
    paymentCardId: 'wallet_card_kb_krw',
    titleZh: '首尔标准卡',
    titleEn: 'Seoul Standard',
    artwork: walletCardAssetUrl('kb-seoul-standard.webp'),
    sortOrder: 10,
    material: 'matte',
    ink: '#23262a',
    mutedInk: 'rgba(35, 38, 42, 0.68)',
    chip: '#d8bc68',
    accent: '#23262a',
    overlay: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(35, 38, 42, 0.08))',
  }),
  appearance({
    id: 'kb_sealed_01',
    paymentCardId: 'wallet_card_kb_krw',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'seasonal',
    assetStatus: 'pending',
    unlockSource: 'draw',
    sortOrder: 20,
    mysteryTone: 'mist',
  }),
  appearance({
    id: 'chase_usd_standard',
    paymentCardId: 'wallet_card_chase_usd',
    titleZh: '美元标准卡',
    titleEn: 'USD Standard',
    artwork: walletCardAssetUrl('chase-usd-standard.webp'),
    sortOrder: 10,
    material: 'brushed',
    accent: '#78b6d7',
  }),
  appearance({
    id: 'chase_sealed_01',
    paymentCardId: 'wallet_card_chase_usd',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'licensed_ip',
    assetStatus: 'pending',
    unlockSource: 'event',
    sortOrder: 20,
    mysteryTone: 'cobalt',
  }),
  appearance({
    id: 'chase_sealed_02',
    paymentCardId: 'wallet_card_chase_usd',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'art_series',
    assetStatus: 'pending',
    unlockSource: 'spend',
    sortOrder: 30,
    mysteryTone: 'graphite',
  }),
  appearance({
    id: 'bnp_euro_standard',
    paymentCardId: 'wallet_card_bnp_eur',
    titleZh: '欧元标准卡',
    titleEn: 'Euro Standard',
    artwork: walletCardAssetUrl('bnp-euro-standard.webp'),
    sortOrder: 10,
    material: 'velvet',
    accent: '#d8c46b',
  }),
  appearance({
    id: 'bnp_paris_rain',
    paymentCardId: 'wallet_card_bnp_eur',
    titleZh: '巴黎雨夜',
    titleEn: 'Paris Rain',
    series: 'art_series',
    artwork: walletCardAssetUrl('bnp-paris-rain.webp'),
    sortOrder: 20,
    material: 'oil',
    ink: '#f8f4eb',
    mutedInk: 'rgba(248, 244, 235, 0.76)',
    chip: '#d7c6a4',
    accent: '#f1b26f',
    overlay: 'linear-gradient(135deg, rgba(19, 33, 70, 0.08), rgba(12, 17, 34, 0.32))',
  }),
  appearance({
    id: 'bnp_sealed_01',
    paymentCardId: 'wallet_card_bnp_eur',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'commemorative',
    assetStatus: 'pending',
    unlockSource: 'service_reward',
    sortOrder: 30,
    mysteryTone: 'lilac',
  }),
  appearance({
    id: 'mufg_jpy_standard',
    paymentCardId: 'wallet_card_mufg_jpy',
    titleZh: '日元标准卡',
    titleEn: 'JPY Standard',
    artwork: walletCardAssetUrl('mufg-jpy-standard.webp'),
    sortOrder: 10,
    material: 'brushed',
    accent: '#d2b98a',
  }),
  appearance({
    id: 'mufg_moonlit_makie',
    paymentCardId: 'wallet_card_mufg_jpy',
    titleZh: '月夜莳绘',
    titleEn: 'Moonlit Maki-e',
    series: 'art_series',
    artwork: walletCardAssetUrl('mufg-moonlit-makie.webp'),
    sortOrder: 20,
    material: 'lacquer',
    ink: '#fbf5df',
    mutedInk: 'rgba(251, 245, 223, 0.76)',
    chip: '#d6c08e',
    accent: '#d8b458',
    overlay: 'linear-gradient(135deg, rgba(4, 12, 27, 0.04), rgba(2, 7, 16, 0.28))',
  }),
  appearance({
    id: 'mufg_sealed_01',
    paymentCardId: 'wallet_card_mufg_jpy',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'seasonal',
    assetStatus: 'pending',
    unlockSource: 'event',
    sortOrder: 30,
    mysteryTone: 'indigo',
  }),
  appearance({
    id: 'hsbc_hkd_standard',
    paymentCardId: 'wallet_card_hsbc_hkd',
    titleZh: '港币标准卡',
    titleEn: 'HKD Standard',
    artwork: walletCardAssetUrl('hsbc-hkd-standard.webp'),
    sortOrder: 10,
    material: 'satin',
    accent: '#f2d0a0',
  }),
  appearance({
    id: 'hsbc_sealed_01',
    paymentCardId: 'wallet_card_hsbc_hkd',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'commemorative',
    assetStatus: 'pending',
    unlockSource: 'metric',
    sortOrder: 20,
    mysteryTone: 'silver',
  }),
  appearance({
    id: 'hana_global_standard',
    paymentCardId: 'wallet_card_hana_global_credit',
    titleZh: 'Global One 标准卡',
    titleEn: 'Global One Standard',
    artwork: walletCardAssetUrl('hana-global-standard.webp'),
    sortOrder: 10,
    material: 'satin',
    accent: '#d8be76',
  }),
  appearance({
    id: 'hana_sealed_01',
    paymentCardId: 'wallet_card_hana_global_credit',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'seasonal',
    assetStatus: 'pending',
    unlockSource: 'service_reward',
    sortOrder: 20,
    mysteryTone: 'jade',
  }),
  appearance({
    id: 'hana_sealed_02',
    paymentCardId: 'wallet_card_hana_global_credit',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'licensed_ip',
    assetStatus: 'pending',
    unlockSource: 'draw',
    sortOrder: 30,
    mysteryTone: 'rose',
  }),
])

const APPEARANCES_BY_ID = new Map(WALLET_CARD_APPEARANCES.map((item) => [item.id, item]))

const APPEARANCES_BY_CARD_ID = new Map()
WALLET_CARD_APPEARANCES.forEach((item) => {
  const existing = APPEARANCES_BY_CARD_ID.get(item.paymentCardId) || []
  APPEARANCES_BY_CARD_ID.set(item.paymentCardId, [...existing, item])
})

const DEFAULT_OWNED_APPEARANCE_IDS = Object.freeze([
  'icbc_peony_standard',
  'kb_seoul_standard',
  'chase_usd_standard',
  'bnp_euro_standard',
  'bnp_paris_rain',
  'mufg_jpy_standard',
  'mufg_moonlit_makie',
  'hsbc_hkd_standard',
  'hana_global_standard',
])

const DEFAULT_SELECTED_APPEARANCE_BY_CARD_ID = Object.freeze({
  wallet_card_icbc_cny: 'icbc_peony_standard',
  wallet_card_kb_krw: 'kb_seoul_standard',
  wallet_card_chase_usd: 'chase_usd_standard',
  wallet_card_bnp_eur: 'bnp_euro_standard',
  wallet_card_mufg_jpy: 'mufg_jpy_standard',
  wallet_card_hsbc_hkd: 'hsbc_hkd_standard',
  wallet_card_hana_global_credit: 'hana_global_standard',
})

export const createDefaultOwnedWalletCardAppearanceIds = () => [...DEFAULT_OWNED_APPEARANCE_IDS]

export const createDefaultSelectedWalletCardAppearances = () => ({
  ...DEFAULT_SELECTED_APPEARANCE_BY_CARD_ID,
})

export const findWalletCardAppearanceById = (appearanceId = '') =>
  APPEARANCES_BY_ID.get(normalizeStableId(appearanceId, '')) || null

export const listWalletCardAppearances = (paymentCardId = '') =>
  [...(APPEARANCES_BY_CARD_ID.get(normalizeStableId(paymentCardId, '')) || [])].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )

export const normalizeOwnedWalletCardAppearanceIds = (value = []) => {
  const requested = Array.isArray(value) ? value : []
  const normalized = requested
    .map((item) => normalizeStableId(item, ''))
    .filter((id) => {
      const item = APPEARANCES_BY_ID.get(id)
      return item?.assetStatus === 'ready'
    })
  return [...new Set([...DEFAULT_OWNED_APPEARANCE_IDS, ...normalized])]
}

export const normalizeSelectedWalletCardAppearances = (
  value = {},
  ownedAppearanceIds = DEFAULT_OWNED_APPEARANCE_IDS,
) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const owned = new Set(normalizeOwnedWalletCardAppearanceIds(ownedAppearanceIds))
  return Object.fromEntries(
    Object.entries(DEFAULT_SELECTED_APPEARANCE_BY_CARD_ID).map(
      ([paymentCardId, defaultAppearanceId]) => {
        const requestedId = normalizeStableId(source[paymentCardId], '')
        const requested = APPEARANCES_BY_ID.get(requestedId)
        const selectedId =
          requested?.paymentCardId === paymentCardId &&
          requested.assetStatus === 'ready' &&
          owned.has(requested.id)
            ? requested.id
            : defaultAppearanceId
        return [paymentCardId, selectedId]
      },
    ),
  )
}

export const normalizeWalletCardAppearanceProgress = (value = {}) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(
    Object.entries(source).flatMap(([appearanceId, rawProgress]) => {
      const id = normalizeStableId(appearanceId, '')
      const item = APPEARANCES_BY_ID.get(id)
      if (!item || !APPEARANCE_UNLOCK_SOURCES.has(item.unlockSource)) return []
      const current = Math.max(0, Math.trunc(Number(rawProgress?.current) || 0))
      const target = Math.max(current, Math.trunc(Number(rawProgress?.target) || 0))
      return [[id, { current, target }]]
    }),
  )
}

export const isWalletCardAppearanceDefinition = (value) =>
  Boolean(
    value &&
    APPEARANCE_SERIES.has(value.series) &&
    APPEARANCE_ASSET_STATUSES.has(value.assetStatus) &&
    APPEARANCE_UNLOCK_SOURCES.has(value.unlockSource),
  )
