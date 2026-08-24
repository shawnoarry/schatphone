import { getCommunityAccount, getCommunityPost } from './community-shell-data'

export const FANDOM_SHELL_STORAGE_KEY = 'schatphone:fandom-shell:preview-state'
export const FANDOM_SHELL_STORAGE_VERSION = 1

export const FANDOM_BRAND = Object.freeze({
  nameZh: '星集',
  nameEn: 'Aster',
  nameKo: '아스터',
  taglineZh: '靠近舞台，也靠近每一次回应。',
  taglineEn: 'Closer to the stage, closer to every reply.',
})

export const FANDOM_ARTISTS = Object.freeze([
  Object.freeze({ id: 'artist-yun-iseo', communityAccountId: 'account_yun_iseo', nameZh: '尹伊瑟', nameEn: 'Yun I-seo', groupZh: 'SOLO', groupEn: 'SOLO', initialsZh: '伊', initialsEn: 'I', tone: 'cobalt', followerLabelZh: '76.4 万关注', followerLabelEn: '764K followers' }),
  Object.freeze({ id: 'artist-hanul-ari', communityAccountId: 'account_hanul_official', nameZh: '韩雅梨', nameEn: 'Han Ari', groupZh: 'HANUL', groupEn: 'HANUL', initialsZh: '雅', initialsEn: 'A', tone: 'lime', followerLabelZh: '128 万社区成员', followerLabelEn: '1.28M community members' }),
  Object.freeze({ id: 'artist-nodeul-jin', communityAccountId: 'account_nodeul_live', nameZh: '姜知温', nameEn: 'Kang Jiwon', groupZh: 'NODEUL LIVE', groupEn: 'NODEUL LIVE', initialsZh: '知', initialsEn: 'J', tone: 'coral', followerLabelZh: '18.2 万关注', followerLabelEn: '182K followers' }),
])

export const FANDOM_FEATURED_ARTIST_ID = 'artist-yun-iseo'
export const FANDOM_COMMUNITY_POST_IDS = Object.freeze([
  'post_iseo_window_note',
  'post_hanul_showcase_notice',
  'post_nodeul_access_guide',
])

export const FANDOM_PUBLIC_SCHEDULE = Object.freeze({
  id: 'fandom-schedule-nodeul-20260903',
  titleZh: '「江面之外」公开舞台',
  titleEn: 'Beyond the River public stage',
  dateZh: '9 月 3 日 · 19:30',
  dateEn: 'Sep 3 · 7:30 PM',
  placeZh: '江心现场',
  placeEn: 'Nodeul Live',
  sourceOwner: 'calendar',
  sourceRecordId: 'calendar_public_hanul_showcase_2026_09_03',
})

export const FANDOM_SUBSCRIPTION_CHANNELS = Object.freeze([
  Object.freeze({
    id: 'subscription-yun-iseo-preview',
    artistId: 'artist-yun-iseo',
    state: 'preview',
    labelZh: '伊瑟的星信',
    labelEn: "I-seo's Aster notes",
    messages: Object.freeze([
      Object.freeze({ id: 'aster-message-iseo-1', time: '18:42', bodyZh: '今天把最后一段和声改好了。回去的路上风很舒服。', bodyEn: 'I finished changing the last harmony today. The breeze on the way home felt nice.' }),
      Object.freeze({ id: 'aster-message-iseo-2', time: '21:06', bodyZh: '明天很早开始，我先去睡了。你也不要太晚。', bodyEn: 'Tomorrow starts early, so I am going to sleep. Do not stay up too late either.' }),
    ]),
  }),
])

export const getFandomArtist = (artistId) => FANDOM_ARTISTS.find((artist) => artist.id === artistId) || null
export const getFandomSubscriptionChannel = (channelId) => FANDOM_SUBSCRIPTION_CHANNELS.find((channel) => channel.id === channelId) || null
export const getFandomCommunityRows = () => FANDOM_COMMUNITY_POST_IDS.map((postId) => {
  const post = getCommunityPost(postId)
  const account = post ? getCommunityAccount(post.accountId) : null
  return post && account ? { post, account } : null
}).filter(Boolean)

export const validateFandomFixtureContract = () => (
  FANDOM_ARTISTS.every((artist) => getCommunityAccount(artist.communityAccountId)) &&
  getFandomCommunityRows().length === FANDOM_COMMUNITY_POST_IDS.length &&
  FANDOM_SUBSCRIPTION_CHANNELS.every((channel) => getFandomArtist(channel.artistId) && channel.state === 'preview')
)
