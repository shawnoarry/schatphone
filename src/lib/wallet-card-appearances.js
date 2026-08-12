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

export const WALLET_CARD_APPEARANCE_OWNERSHIP_VERSION = 1

const walletCardAssetUrl = (fileName = '') =>
  projectUiAssetUrl(`apps/wallet/cards/${String(fileName).replace(/^\/+/, '')}`)

const walletCollectorAssetUrl = (fileName = '') =>
  walletCardAssetUrl(`collector/${String(fileName).replace(/^\/+/, '')}`)

const normalizeText = (value, fallback = '', maxLength = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, maxLength) : fallback
}

const normalizeStableId = (value, fallback = '') => {
  const normalized = normalizeText(value, fallback, 120).toLowerCase()
  return /^[a-z0-9_-]+$/.test(normalized) ? normalized : fallback
}

const appearance = (input) => {
  const collectorArtworkVerified =
    input.collectorArtworkVerified === true && Boolean(input.collectorArtwork)
  return Object.freeze({
    id: input.id,
    paymentCardId: input.paymentCardId,
    titleZh: input.titleZh,
    titleEn: input.titleEn,
    series: input.series || 'standard',
    artwork: input.artwork || '',
    collectorArtwork: collectorArtworkVerified ? input.collectorArtwork : '',
    collectorArtworkVerified,
    equipSupported: input.equipSupported !== false,
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
}

export const WALLET_CARD_APPEARANCES = Object.freeze([
  appearance({
    id: 'icbc_peony_standard',
    paymentCardId: 'wallet_card_icbc_cny',
    titleZh: '牡丹标准卡',
    titleEn: 'Peony Standard',
    artwork: walletCollectorAssetUrl('icbc-peony-standard-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('icbc-peony-standard-complete.webp'),
    collectorArtworkVerified: true,
    sortOrder: 10,
    material: 'satin',
    accent: '#d6b56a',
  }),
  appearance({
    id: 'icbc_hello_kitty_gift',
    paymentCardId: 'wallet_card_icbc_cny',
    titleZh: 'Hello Kitty 礼遇',
    titleEn: 'Hello Kitty Gift',
    series: 'licensed_ip',
    artwork: walletCollectorAssetUrl('icbc-hello-kitty-gift-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('icbc-hello-kitty-gift-complete.webp'),
    collectorArtworkVerified: true,
    unlockSource: 'event',
    sortOrder: 20,
    material: 'matte',
    ink: '#4b3840',
    mutedInk: 'rgba(75, 56, 64, 0.68)',
    chip: '#e2bd76',
    accent: '#cf526e',
    overlay: 'linear-gradient(105deg, rgba(255, 244, 247, 0.16), rgba(255, 255, 255, 0.01) 54%)',
  }),
  appearance({
    id: 'icbc_blue_hour',
    paymentCardId: 'wallet_card_icbc_cny',
    titleZh: '蓝色时刻',
    titleEn: 'Blue Hour',
    series: 'art_series',
    artwork: walletCollectorAssetUrl('icbc-blue-hour-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('icbc-blue-hour-complete.webp'),
    collectorArtworkVerified: true,
    unlockSource: 'spend',
    sortOrder: 30,
    material: 'oil',
    ink: '#f4eee4',
    mutedInk: 'rgba(244, 238, 228, 0.72)',
    chip: '#d7c39a',
    accent: '#b7895c',
    overlay: 'linear-gradient(108deg, rgba(18, 35, 55, 0.22), rgba(13, 22, 36, 0.03) 62%)',
  }),
  appearance({
    id: 'icbc_gilded_muse',
    paymentCardId: 'wallet_card_icbc_cny',
    titleZh: '鎏金缪斯',
    titleEn: 'Gilded Muse',
    series: 'commemorative',
    artwork: walletCollectorAssetUrl('icbc-gilded-muse-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('icbc-gilded-muse-complete.webp'),
    collectorArtworkVerified: true,
    unlockSource: 'service_reward',
    sortOrder: 40,
    material: 'satin',
    ink: '#382a22',
    mutedInk: 'rgba(56, 42, 34, 0.66)',
    chip: '#d0ad6b',
    accent: '#9c6c3b',
    overlay: 'linear-gradient(108deg, rgba(255, 245, 222, 0.15), rgba(255, 255, 255, 0.01) 58%)',
  }),
  appearance({
    id: 'icbc_secret_garden',
    paymentCardId: 'wallet_card_icbc_cny',
    titleZh: '秘密花园',
    titleEn: 'Secret Garden',
    series: 'art_series',
    artwork: walletCollectorAssetUrl('icbc-secret-garden-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('icbc-secret-garden-complete.webp'),
    collectorArtworkVerified: true,
    unlockSource: 'draw',
    sortOrder: 50,
    material: 'matte',
    ink: '#f7f0e5',
    mutedInk: 'rgba(247, 240, 229, 0.72)',
    chip: '#d7b76c',
    accent: '#df9aaa',
    overlay: 'linear-gradient(108deg, rgba(20, 48, 40, 0.2), rgba(20, 48, 40, 0.02) 60%)',
  }),
  appearance({
    id: 'icbc_sealed_01',
    paymentCardId: 'wallet_card_icbc_cny',
    titleZh: '牡丹野餐',
    titleEn: 'Peony Picnic',
    series: 'licensed_ip',
    artwork: walletCardAssetUrl('appearances/icbc-peony-picnic-hello-kitty.webp'),
    unlockSource: 'event',
    sortOrder: 60,
    material: 'matte',
    ink: '#3b3038',
    mutedInk: 'rgba(59, 48, 56, 0.68)',
    chip: '#e2bd76',
    accent: '#cf526e',
    overlay: 'linear-gradient(105deg, rgba(255, 244, 247, 0.2), rgba(255, 255, 255, 0.02) 54%)',
  }),
  appearance({
    id: 'icbc_sealed_02',
    paymentCardId: 'wallet_card_icbc_cny',
    titleZh: '宫阙仙鹤',
    titleEn: 'Palace Cranes',
    series: 'commemorative',
    artwork: walletCardAssetUrl('appearances/icbc-palace-cranes-cloisonne.webp'),
    unlockSource: 'service_reward',
    sortOrder: 70,
    material: 'lacquer',
    ink: '#fff5dc',
    mutedInk: 'rgba(255, 245, 220, 0.74)',
    chip: '#d9bb70',
    accent: '#d0a758',
    overlay: 'linear-gradient(108deg, rgba(18, 24, 35, 0.26), rgba(18, 24, 35, 0.02) 62%)',
  }),
  appearance({
    id: 'icbc_sealed_03',
    paymentCardId: 'wallet_card_icbc_cny',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'art_series',
    assetStatus: 'pending',
    unlockSource: 'metric',
    sortOrder: 80,
    mysteryTone: 'plum',
  }),
  appearance({
    id: 'kb_seoul_standard',
    paymentCardId: 'wallet_card_kb_krw',
    titleZh: '首尔标准卡',
    titleEn: 'Seoul Standard',
    artwork: walletCollectorAssetUrl('kb-seoul-standard-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('kb-seoul-standard-complete.webp'),
    collectorArtworkVerified: true,
    sortOrder: 10,
    material: 'matte',
    ink: '#23262a',
    mutedInk: 'rgba(35, 38, 42, 0.68)',
    chip: '#d8bc68',
    accent: '#23262a',
    overlay: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(35, 38, 42, 0.08))',
  }),
  appearance({
    id: 'kb_kakao_city',
    paymentCardId: 'wallet_card_kb_krw',
    titleZh: 'Kakao 城市漫游',
    titleEn: 'Kakao City',
    series: 'licensed_ip',
    artwork: walletCollectorAssetUrl('kb-kakao-city-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('kb-kakao-city-complete.webp'),
    collectorArtworkVerified: true,
    unlockSource: 'draw',
    sortOrder: 20,
    material: 'matte',
    ink: '#26343e',
    mutedInk: 'rgba(38, 52, 62, 0.65)',
    chip: '#d8bd75',
    accent: '#547f9d',
    overlay: 'linear-gradient(106deg, rgba(241, 249, 252, 0.16), rgba(255, 255, 255, 0.01) 58%)',
  }),
  appearance({
    id: 'kb_sealed_01',
    paymentCardId: 'wallet_card_kb_krw',
    titleZh: '首尔雪日',
    titleEn: 'Seoul Snow Day',
    series: 'seasonal',
    artwork: walletCardAssetUrl('appearances/kb-seoul-snow-day-kakao-friends.webp'),
    unlockSource: 'draw',
    sortOrder: 30,
    material: 'matte',
    ink: '#26343e',
    mutedInk: 'rgba(38, 52, 62, 0.65)',
    chip: '#d8bd75',
    accent: '#547f9d',
    overlay: 'linear-gradient(106deg, rgba(241, 249, 252, 0.18), rgba(255, 255, 255, 0.01) 58%)',
  }),
  appearance({
    id: 'chase_usd_standard',
    paymentCardId: 'wallet_card_chase_usd',
    titleZh: '美元标准卡',
    titleEn: 'USD Standard',
    artwork: walletCollectorAssetUrl('chase-usd-standard-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('chase-usd-standard-complete.webp'),
    collectorArtworkVerified: true,
    sortOrder: 10,
    material: 'brushed',
    accent: '#78b6d7',
  }),
  appearance({
    id: 'chase_peanuts_rooftop',
    paymentCardId: 'wallet_card_chase_usd',
    titleZh: '花生漫画屋顶夜',
    titleEn: 'Peanuts Rooftop',
    series: 'licensed_ip',
    artwork: walletCollectorAssetUrl('chase-peanuts-rooftop-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('chase-peanuts-rooftop-complete.webp'),
    collectorArtworkVerified: true,
    unlockSource: 'event',
    sortOrder: 20,
    material: 'satin',
    ink: '#fffaf1',
    mutedInk: 'rgba(255, 250, 241, 0.76)',
    chip: '#dfbd72',
    accent: '#f2c555',
    overlay: 'linear-gradient(108deg, rgba(17, 31, 46, 0.3), rgba(17, 31, 46, 0.02) 62%)',
  }),
  appearance({
    id: 'chase_sealed_01',
    paymentCardId: 'wallet_card_chase_usd',
    titleZh: '史努比公路旅行',
    titleEn: 'Snoopy Road Trip',
    series: 'licensed_ip',
    artwork: walletCardAssetUrl('appearances/chase-snoopy-road-trip-peanuts.webp'),
    unlockSource: 'event',
    sortOrder: 30,
    material: 'satin',
    ink: '#fffaf1',
    mutedInk: 'rgba(255, 250, 241, 0.76)',
    chip: '#dfbd72',
    accent: '#f2c555',
    overlay: 'linear-gradient(108deg, rgba(17, 31, 46, 0.34), rgba(17, 31, 46, 0.02) 62%)',
  }),
  appearance({
    id: 'chase_sealed_02',
    paymentCardId: 'wallet_card_chase_usd',
    titleZh: '沙漠花境',
    titleEn: 'Desert Bloom',
    series: 'art_series',
    artwork: walletCardAssetUrl('appearances/chase-desert-bloom-precisionism.webp'),
    unlockSource: 'spend',
    sortOrder: 40,
    material: 'matte',
    ink: '#302c31',
    mutedInk: 'rgba(48, 44, 49, 0.66)',
    chip: '#cfaa68',
    accent: '#8e4952',
    overlay: 'linear-gradient(108deg, rgba(255, 240, 221, 0.2), rgba(255, 255, 255, 0.02) 58%)',
  }),
  appearance({
    id: 'bnp_euro_standard',
    paymentCardId: 'wallet_card_bnp_eur',
    titleZh: '欧元标准卡',
    titleEn: 'Euro Standard',
    artwork: walletCollectorAssetUrl('bnp-euro-standard-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('bnp-euro-standard-complete.webp'),
    collectorArtworkVerified: true,
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
    id: 'bnp_little_prince_arcade',
    paymentCardId: 'wallet_card_bnp_eur',
    titleZh: '小王子街机夜',
    titleEn: 'Little Prince Arcade',
    series: 'licensed_ip',
    artwork: walletCollectorAssetUrl('bnp-little-prince-arcade-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('bnp-little-prince-arcade-complete.webp'),
    collectorArtworkVerified: true,
    unlockSource: 'service_reward',
    sortOrder: 30,
    material: 'velvet',
    ink: '#fff2cb',
    mutedInk: 'rgba(255, 242, 203, 0.76)',
    chip: '#d3b56e',
    accent: '#e1bd5c',
    overlay: 'linear-gradient(108deg, rgba(9, 20, 60, 0.3), rgba(9, 20, 60, 0.02) 62%)',
  }),
  appearance({
    id: 'bnp_sealed_01',
    paymentCardId: 'wallet_card_bnp_eur',
    titleZh: '星辰远航',
    titleEn: 'Celestial Voyage',
    series: 'commemorative',
    artwork: walletCardAssetUrl('appearances/bnp-celestial-voyage-little-prince.webp'),
    unlockSource: 'service_reward',
    sortOrder: 40,
    material: 'velvet',
    ink: '#fff2cb',
    mutedInk: 'rgba(255, 242, 203, 0.76)',
    chip: '#d3b56e',
    accent: '#e1bd5c',
    overlay: 'linear-gradient(108deg, rgba(9, 20, 60, 0.34), rgba(9, 20, 60, 0.02) 62%)',
  }),
  appearance({
    id: 'mufg_jpy_standard',
    paymentCardId: 'wallet_card_mufg_jpy',
    titleZh: '日元标准卡',
    titleEn: 'JPY Standard',
    artwork: walletCollectorAssetUrl('mufg-jpy-standard-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('mufg-jpy-standard-complete.webp'),
    collectorArtworkVerified: true,
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
    titleZh: '宝可梦花见夜',
    titleEn: 'Pokemon Hanami Night',
    series: 'seasonal',
    artwork: walletCardAssetUrl('appearances/mufg-pokemon-hanami-night.webp'),
    unlockSource: 'event',
    sortOrder: 30,
    material: 'lacquer',
    ink: '#fff3d8',
    mutedInk: 'rgba(255, 243, 216, 0.75)',
    chip: '#d6b56f',
    accent: '#efb859',
    overlay: 'linear-gradient(108deg, rgba(18, 20, 65, 0.32), rgba(18, 20, 65, 0.02) 64%)',
  }),
  appearance({
    id: 'hsbc_hkd_standard',
    paymentCardId: 'wallet_card_hsbc_hkd',
    titleZh: '港币标准卡',
    titleEn: 'HKD Standard',
    artwork: walletCollectorAssetUrl('hsbc-hkd-standard-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('hsbc-hkd-standard-complete.webp'),
    collectorArtworkVerified: true,
    sortOrder: 10,
    material: 'satin',
    accent: '#f2d0a0',
  }),
  appearance({
    id: 'hsbc_sealed_01',
    paymentCardId: 'wallet_card_hsbc_hkd',
    titleZh: '港湾余晖',
    titleEn: 'Harbor Afterglow',
    series: 'commemorative',
    artwork: walletCardAssetUrl('appearances/hsbc-harbor-afterglow-commemorative.webp'),
    unlockSource: 'metric',
    sortOrder: 20,
    material: 'brushed',
    ink: '#27323c',
    mutedInk: 'rgba(39, 50, 60, 0.66)',
    chip: '#d1ac6b',
    accent: '#b94b48',
    overlay: 'linear-gradient(108deg, rgba(242, 247, 248, 0.2), rgba(255, 255, 255, 0.01) 58%)',
  }),
  appearance({
    id: 'hana_global_standard',
    paymentCardId: 'wallet_card_hana_global_credit',
    titleZh: 'Global One 标准卡',
    titleEn: 'Global One Standard',
    artwork: walletCollectorAssetUrl('hana-global-standard-complete.webp'),
    collectorArtwork: walletCollectorAssetUrl('hana-global-standard-complete.webp'),
    collectorArtworkVerified: true,
    sortOrder: 10,
    material: 'satin',
    accent: '#d8be76',
  }),
  appearance({
    id: 'hana_sealed_01',
    paymentCardId: 'wallet_card_hana_global_credit',
    titleZh: '月兔盛宴',
    titleEn: 'Moon Rabbit Feast',
    series: 'seasonal',
    artwork: walletCardAssetUrl('appearances/hana-moon-rabbit-minhwa.webp'),
    unlockSource: 'service_reward',
    sortOrder: 20,
    material: 'satin',
    ink: '#fff4d6',
    mutedInk: 'rgba(255, 244, 214, 0.76)',
    chip: '#d8b968',
    accent: '#e4b64d',
    overlay: 'linear-gradient(108deg, rgba(13, 31, 74, 0.3), rgba(13, 31, 74, 0.02) 62%)',
  }),
  appearance({
    id: 'hana_sealed_02',
    paymentCardId: 'wallet_card_hana_global_credit',
    titleZh: 'BT21 夜市',
    titleEn: 'BT21 Night Market',
    series: 'licensed_ip',
    artwork: walletCardAssetUrl('appearances/hana-bt21-night-market.webp'),
    unlockSource: 'draw',
    sortOrder: 30,
    material: 'satin',
    ink: '#f7eaff',
    mutedInk: 'rgba(247, 234, 255, 0.74)',
    chip: '#d4ae70',
    accent: '#ef8cc6',
    overlay: 'linear-gradient(108deg, rgba(38, 17, 72, 0.32), rgba(38, 17, 72, 0.02) 62%)',
  }),
  appearance({
    id: 'amex_world_passage',
    paymentCardId: 'wallet_card_amex_usd_global_credit',
    titleZh: '世界通行',
    titleEn: 'World Passage',
    series: 'art_series',
    artwork: walletCardAssetUrl('amex-world-passage.webp'),
    sortOrder: 10,
    material: 'satin',
    ink: '#18314a',
    mutedInk: 'rgba(24, 49, 74, 0.68)',
    chip: '#c9b16c',
    accent: '#e26d5a',
    overlay: 'linear-gradient(106deg, rgba(246, 250, 246, 0.16), rgba(255, 255, 255, 0.02) 58%)',
  }),
  appearance({
    id: 'amex_sealed_01',
    paymentCardId: 'wallet_card_amex_usd_global_credit',
    titleZh: '未揭晓副卡',
    titleEn: 'Sealed supplementary card',
    series: 'commemorative',
    assetStatus: 'pending',
    unlockSource: 'service_reward',
    sortOrder: 20,
    mysteryTone: 'cobalt',
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
  'amex_world_passage',
])

const PREVIEW_ONLY_APPEARANCE_IDS = new Set([
  'icbc_sealed_01',
  'icbc_sealed_02',
  'kb_sealed_01',
  'chase_sealed_01',
  'chase_sealed_02',
  'bnp_sealed_01',
  'mufg_sealed_01',
  'hsbc_sealed_01',
  'hana_sealed_01',
  'hana_sealed_02',
])

const DEFAULT_SELECTED_APPEARANCE_BY_CARD_ID = Object.freeze({
  wallet_card_icbc_cny: 'icbc_peony_standard',
  wallet_card_kb_krw: 'kb_seoul_standard',
  wallet_card_chase_usd: 'chase_usd_standard',
  wallet_card_bnp_eur: 'bnp_euro_standard',
  wallet_card_mufg_jpy: 'mufg_jpy_standard',
  wallet_card_hsbc_hkd: 'hsbc_hkd_standard',
  wallet_card_hana_global_credit: 'hana_global_standard',
  wallet_card_amex_usd_global_credit: 'amex_world_passage',
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

export const normalizeOwnedWalletCardAppearanceIds = (
  value = [],
  { ownershipVersion = WALLET_CARD_APPEARANCE_OWNERSHIP_VERSION } = {},
) => {
  const requested = Array.isArray(value) ? value : []
  const normalized = requested
    .map((item) => normalizeStableId(item, ''))
    .filter((id) => {
      const item = APPEARANCES_BY_ID.get(id)
      if (item?.assetStatus !== 'ready') return false
      return (
        ownershipVersion >= WALLET_CARD_APPEARANCE_OWNERSHIP_VERSION ||
        !PREVIEW_ONLY_APPEARANCE_IDS.has(id)
      )
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
          requested.equipSupported !== false &&
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
