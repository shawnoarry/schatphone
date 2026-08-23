export const COMMUNITY_SHELL_BRAND = Object.freeze({
  nameZh: '涟漪',
  nameEn: 'Ripple',
  taglineZh: '世界正在发生，这里听见回声。',
  taglineEn: 'Hear how the world carries.',
})

export const COMMUNITY_CHANNELS = Object.freeze([
  { id: 'following', labelZh: '关注', labelEn: 'Following', icon: 'fa-user-group' },
  { id: 'explore', labelZh: '发现', labelEn: 'Explore', icon: 'fa-compass' },
  { id: 'news', labelZh: '新闻', labelEn: 'News', icon: 'fa-newspaper' },
  { id: 'bookmarks', labelZh: '收藏', labelEn: 'Saved', icon: 'fa-bookmark' },
])

export const COMMUNITY_ACCOUNTS = Object.freeze([
  {
    id: 'account_hanul_official',
    handle: '@hanul_official',
    nameZh: 'Hanul 娱乐',
    nameEn: 'Hanul Entertainment',
    bioZh: '演出、行程与艺人公告的官方发布账号。',
    bioEn: 'Official schedules, performances, and artist notices.',
    kind: 'organization',
    verified: true,
    avatar: 'H',
    tone: 'vermilion',
    followersZh: '128 万',
    followersEn: '1.28M',
  },
  {
    id: 'account_stagewire',
    handle: '@stagewire',
    nameZh: '舞台通讯',
    nameEn: 'Stagewire',
    bioZh: '记录首尔的舞台、音乐与文化现场。更正会保留在原文页。',
    bioEn: 'Reporting Seoul stages, music, and culture. Corrections stay attached.',
    kind: 'media',
    verified: true,
    avatar: 'S',
    tone: 'ink',
    followersZh: '43.6 万',
    followersEn: '436K',
  },
  {
    id: 'account_nodeul_live',
    handle: '@nodeul_live',
    nameZh: '江心现场',
    nameEn: 'Nodeul Live',
    bioZh: '汉江畔的虚构现场音乐频道。',
    bioEn: 'A fictional live-music channel beside the Han River.',
    kind: 'channel',
    verified: true,
    avatar: 'N',
    tone: 'blue',
    followersZh: '18.2 万',
    followersEn: '182K',
  },
  {
    id: 'account_yun_iseo',
    handle: '@iseo_notes',
    nameZh: '尹伊瑟',
    nameEn: 'Yun I-seo',
    bioZh: '创作歌手。偶尔记下排练室外的天气。',
    bioEn: 'Singer-songwriter. Sometimes writes down the weather outside rehearsal.',
    kind: 'person',
    verified: true,
    avatar: '伊',
    tone: 'violet',
    followersZh: '76.4 万',
    followersEn: '764K',
  },
  {
    id: 'account_room404',
    handle: '@room404',
    nameZh: '404 号房',
    nameEn: 'Room 404',
    bioZh: '匿名音乐讨论账号。帖文中的说法不代表已经证实。',
    bioEn: 'Anonymous music talk. Posts may contain claims that are not verified.',
    kind: 'anonymous',
    verified: false,
    avatar: '4',
    tone: 'slate',
    followersZh: '9.8 万',
    followersEn: '98K',
  },
  {
    id: 'account_ripple_desk',
    handle: '@ripple_desk',
    nameZh: '涟漪编辑台',
    nameEn: 'Ripple Desk',
    bioZh: '聚合公开来源，并把已证实信息与未证实说法分开呈现。',
    bioEn: 'Public-source desk that keeps confirmed information separate from claims.',
    kind: 'media',
    verified: true,
    avatar: 'R',
    tone: 'coral',
    followersZh: '31.5 万',
    followersEn: '315K',
  },
])

export const COMMUNITY_FACTS = Object.freeze([
  {
    id: 'fact_hanul_showcase_confirmed',
    owner: 'calendar',
    recordId: 'calendar_public_hanul_showcase_2026_09_03',
    revision: 3,
    status: 'confirmed',
    summaryZh: 'Hanul 已确认 9 月 3 日晚间在江心现场举行公开舞台。',
    summaryEn: 'Hanul confirmed a public stage at Nodeul Live on the evening of September 3.',
    sourceLabelZh: '官方公开行程',
    sourceLabelEn: 'Official public schedule',
    available: true,
  },
  {
    id: 'fact_river_stage_access',
    owner: 'map',
    recordId: 'place_nodeul_live_hall',
    revision: 2,
    status: 'confirmed',
    summaryZh: '场馆已发布入场口与无障碍通道说明。',
    summaryEn: 'The venue published entry-gate and accessible-route guidance.',
    sourceLabelZh: '场馆公告',
    sourceLabelEn: 'Venue notice',
    available: true,
  },
  {
    id: 'fact_radio_archive_release',
    owner: 'calendar',
    recordId: 'calendar_radio_archive_release_2026_08_23',
    revision: 1,
    status: 'confirmed',
    summaryZh: '公开广播访谈的官方回听已上线。',
    summaryEn: 'The official replay of a public radio interview is now available.',
    sourceLabelZh: '广播频道公告',
    sourceLabelEn: 'Radio channel notice',
    available: false,
  },
])

export const COMMUNITY_CLAIMS = Object.freeze([
  {
    id: 'claim_midnight_rehearsal',
    assertedByAccountId: 'account_room404',
    truthStatus: 'unverified',
    summaryZh: '“深夜排练意味着下周会突然发布新歌”。',
    summaryEn: '“A late-night rehearsal means a surprise single will drop next week.”',
    statusLabelZh: '未经证实',
    statusLabelEn: 'Unverified',
  },
  {
    id: 'claim_stream_cancelled',
    assertedByAccountId: 'account_room404',
    truthStatus: 'contradicted',
    summaryZh: '“9 月 3 日舞台直播已取消”。',
    summaryEn: '“The September 3 stage livestream has been cancelled.”',
    statusLabelZh: '已被官方更正',
    statusLabelEn: 'Corrected by official source',
  },
])

export const COMMUNITY_POSTS = Object.freeze([
  {
    id: 'post_hanul_showcase_notice',
    accountId: 'account_hanul_official',
    channelIds: ['following', 'explore'],
    kind: 'notice',
    publicationState: 'committed',
    publishedAt: '2026-08-23T10:15:00+09:00',
    titleZh: '9 月「江面之外」公开舞台',
    titleEn: 'September: Beyond the River public stage',
    bodyZh: [
      'Hanul 娱乐确认，9 月 3 日 19:30 将在江心现场举行公开舞台。',
      '现场入场说明与线上直播时间将于演出前 48 小时再次公布。',
    ],
    bodyEn: [
      'Hanul Entertainment confirms a public stage at Nodeul Live on September 3 at 7:30 PM.',
      'Entry guidance and the online broadcast time will be posted again 48 hours before the show.',
    ],
    factIds: ['fact_hanul_showcase_confirmed'],
    claimIds: [],
    media: { kind: 'poster', eyebrowZh: '汉江之夜', eyebrowEn: 'NIGHT BY THE RIVER', mark: '09.03', tone: 'sunset' },
    metrics: { comments: 284, reposts: 913 },
  },
  {
    id: 'post_iseo_window_note',
    accountId: 'account_yun_iseo',
    channelIds: ['following', 'explore'],
    kind: 'moment',
    publicationState: 'committed',
    publishedAt: '2026-08-23T08:42:00+09:00',
    titleZh: '',
    titleEn: '',
    bodyZh: ['今天排练室窗外的云很慢。把最后一段和声改了，终于有了能呼吸的空间。'],
    bodyEn: ['The clouds outside the rehearsal room moved slowly today. I changed the last harmony, and the song can finally breathe.'],
    factIds: [],
    claimIds: [],
    media: { kind: 'photo', eyebrowZh: '排练室 6F', eyebrowEn: 'REHEARSAL 6F', mark: '18:42', tone: 'cloud' },
    metrics: { comments: 1836, reposts: 622 },
  },
  {
    id: 'post_room404_midnight_claim',
    accountId: 'account_room404',
    channelIds: ['explore'],
    kind: 'discussion',
    publicationState: 'committed',
    publishedAt: '2026-08-23T01:16:00+09:00',
    titleZh: '今晚有人听到 B 栋的排练声吗？',
    titleEn: 'Did anyone hear rehearsals in Building B tonight?',
    bodyZh: ['我只是猜测：这么晚还在录和声，会不会是下周有突然发布？目前没有官方消息。'],
    bodyEn: ['This is only a guess: if harmonies were being recorded this late, could there be a surprise release next week? There is no official notice.'],
    factIds: [],
    claimIds: ['claim_midnight_rehearsal'],
    media: null,
    metrics: { comments: 409, reposts: 72 },
  },
  {
    id: 'post_stagewire_showcase_report',
    accountId: 'account_stagewire',
    channelIds: ['news', 'explore'],
    kind: 'article',
    publicationState: 'committed',
    publishedAt: '2026-08-23T11:05:00+09:00',
    titleZh: '官宣落地：江心现场公开舞台将于 9 月举行',
    titleEn: 'Confirmed: public stage set for September at Nodeul Live',
    bodyZh: [
      '经主办方公开行程确认，「江面之外」将于 9 月 3 日晚间登场。本文只使用已公开的时间与场馆信息。',
      '场馆的入场口、无障碍通道和公共交通建议已另行发布。粉丝账号对曲目的猜测尚无官方信息支持。',
    ],
    bodyEn: [
      'The organizer’s public schedule confirms that Beyond the River will take the stage on the evening of September 3. This report uses only the published time and venue details.',
      'The venue has separately published entry gates, accessible routes, and public-transport guidance. Fan speculation about the setlist has no official support yet.',
    ],
    factIds: ['fact_hanul_showcase_confirmed', 'fact_river_stage_access'],
    claimIds: [],
    media: { kind: 'editorial', eyebrowZh: '舞台观察', eyebrowEn: 'STAGE DESK', mark: 'SEP', tone: 'river' },
    metrics: { comments: 96, reposts: 351 },
  },
  {
    id: 'post_ripple_correction',
    accountId: 'account_ripple_desk',
    channelIds: ['news', 'explore'],
    kind: 'correction',
    publicationState: 'committed',
    publishedAt: '2026-08-23T12:20:00+09:00',
    titleZh: '更正：9 月 3 日舞台直播并未取消',
    titleEn: 'Correction: September 3 stage livestream is not cancelled',
    bodyZh: ['稍早流传的“直播取消”说法已被主办方否认。原说法保留为发布历史，但不应再作为已证实信息传播。'],
    bodyEn: ['The organizer has denied the earlier claim that the livestream was cancelled. The claim remains in publication history, but should not be repeated as confirmed information.'],
    factIds: ['fact_hanul_showcase_confirmed'],
    claimIds: ['claim_stream_cancelled'],
    media: null,
    metrics: { comments: 54, reposts: 447 },
  },
  {
    id: 'post_nodeul_access_guide',
    accountId: 'account_nodeul_live',
    channelIds: ['following', 'news'],
    kind: 'guide',
    publicationState: 'committed',
    publishedAt: '2026-08-22T17:30:00+09:00',
    titleZh: '公开舞台入场与无障碍通道指南',
    titleEn: 'Entry and accessible-route guide for public stages',
    bodyZh: ['主入口于开演前 90 分钟开放。轮椅通道位于东侧入口，不需要经过阶梯。'],
    bodyEn: ['The main gate opens 90 minutes before showtime. The step-free route is at the east entrance and does not require stairs.'],
    factIds: ['fact_river_stage_access'],
    claimIds: [],
    media: { kind: 'map', eyebrowZh: '入场指南', eyebrowEn: 'ACCESS GUIDE', mark: 'EAST', tone: 'mint' },
    metrics: { comments: 38, reposts: 219 },
  },
  {
    id: 'post_radio_archive_unavailable',
    accountId: 'account_stagewire',
    channelIds: ['news'],
    kind: 'article',
    publicationState: 'committed',
    publishedAt: '2026-08-22T09:00:00+09:00',
    titleZh: '昨日广播访谈回听整理',
    titleEn: 'Replay notes from yesterday’s radio interview',
    bodyZh: ['访谈谈到了新专辑的乐器编排。目前原广播来源暂时无法打开，本页保留已发布文字，但不补写缺失内容。'],
    bodyEn: ['The interview discussed the instrumental arrangement of the new album. The original radio source is currently unavailable; this page keeps its published text but does not invent the missing material.'],
    factIds: ['fact_radio_archive_release'],
    claimIds: [],
    media: null,
    metrics: { comments: 21, reposts: 64 },
  },
  {
    id: 'post_long_form_city_night',
    accountId: 'account_ripple_desk',
    channelIds: ['explore', 'news'],
    kind: 'feature',
    publicationState: 'committed',
    publishedAt: '2026-08-21T20:40:00+09:00',
    titleZh: '一场公开舞台如何改变汉江畔的一个夜晚',
    titleEn: 'How one public stage changes an evening beside the Han River',
    bodyZh: [
      '公开舞台从来不只是节目单上的两个小时。对场馆周边的便利店、夜班公交、临时工作人员和提前到达的观众来说，它会把一个普通夜晚改写成同时展开的许多小行程。',
      '我们跟随三位不同的参与者，从地铁换乘、临时工牌到散场后的最后一班车。他们并不共享同一个故事，但会在同一个时间和地点留下各自可被确认的经历。',
      '文中不将粉丝猜测当作演出信息，也不从人群密度推断任何人的去向。可以确认的只有公开时间、场馆指南和受访者明确说出的经历。',
    ],
    bodyEn: [
      'A public stage is never only the two hours printed on a program. For nearby convenience stores, night buses, temporary staff, and early-arriving audiences, it turns an ordinary evening into many small journeys unfolding at once.',
      'We followed three participants through subway transfers, temporary work passes, and the last bus after the crowd dispersed. They do not share one story, but each leaves an experience that can be confirmed on its own terms.',
      'This feature does not treat fan guesses as performance information or infer anyone’s destination from crowd density. What can be confirmed is limited to public times, venue guidance, and experiences explicitly shared by the people interviewed.',
    ],
    factIds: ['fact_hanul_showcase_confirmed', 'fact_river_stage_access'],
    claimIds: [],
    media: { kind: 'feature', eyebrowZh: '城市与人群', eyebrowEn: 'CITY / CROWD', mark: '汉江', tone: 'night' },
    metrics: { comments: 113, reposts: 288 },
  },
])

export const getCommunityAccount = (accountId) =>
  COMMUNITY_ACCOUNTS.find((account) => account.id === accountId) || null

export const getCommunityFact = (factId) =>
  COMMUNITY_FACTS.find((fact) => fact.id === factId) || null

export const getCommunityClaim = (claimId) =>
  COMMUNITY_CLAIMS.find((claim) => claim.id === claimId) || null

export const getCommunityPost = (postId) =>
  COMMUNITY_POSTS.find((post) => post.id === postId) || null

export const formatCommunityMetric = (value, isZh = true) => {
  const count = Number(value) || 0
  if (isZh && count >= 10_000) return `${(count / 10_000).toFixed(count >= 100_000 ? 0 : 1)}万`
  if (!isZh && count >= 1_000) return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1)}K`
  return String(count)
}

export const formatCommunityTime = (iso, isZh = true) => {
  const timestamp = Date.parse(iso)
  if (!Number.isFinite(timestamp)) return ''
  const now = Date.parse('2026-08-23T13:00:00+09:00')
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000))
  if (minutes < 60) return isZh ? `${minutes}分钟前` : `${minutes}m`
  if (minutes < 24 * 60) return isZh ? `${Math.floor(minutes / 60)}小时前` : `${Math.floor(minutes / 60)}h`
  return isZh ? `${Math.floor(minutes / 1440)}天前` : `${Math.floor(minutes / 1440)}d`
}

export const resolveCommunityTruthPresentation = (post, isZh = true) => {
  const facts = (post?.factIds || []).map(getCommunityFact).filter(Boolean)
  const claims = (post?.claimIds || []).map(getCommunityClaim).filter(Boolean)
  const contradicted = claims.some((claim) => claim.truthStatus === 'contradicted')
  const unverified = claims.some((claim) => claim.truthStatus === 'unverified' || claim.truthStatus === 'unknown')
  const sourceUnavailable = facts.some((fact) => fact.available === false)

  if (contradicted) {
    return {
      kind: 'corrected',
      icon: 'fa-rotate',
      label: isZh ? '已更正' : 'Corrected',
      detail: isZh ? '早期说法已被官方信息否定' : 'An earlier claim was contradicted by an official source',
    }
  }
  if (unverified) {
    return {
      kind: 'unverified',
      icon: 'fa-circle-question',
      label: isZh ? '未经证实' : 'Unverified',
      detail: isZh ? '这是账号提出的说法，不是已确认事实' : 'This is an account claim, not a confirmed fact',
    }
  }
  if (facts.length && facts.every((fact) => fact.status === 'confirmed')) {
    return {
      kind: sourceUnavailable ? 'source-unavailable' : 'confirmed',
      icon: sourceUnavailable ? 'fa-link-slash' : 'fa-circle-check',
      label: sourceUnavailable
        ? isZh ? '来源暂不可用' : 'Source unavailable'
        : isZh ? '已核实' : 'Confirmed',
      detail: sourceUnavailable
        ? isZh ? '帖文已发布，但原始来源目前无法打开' : 'The post remains published, but its original source cannot be opened'
        : isZh ? '内容引用了可核对的公开来源' : 'This post cites a checkable public source',
    }
  }
  return {
    kind: 'published',
    icon: 'fa-message',
    label: isZh ? '已发布' : 'Published',
    detail: isZh ? '这是已发布的内容，不代表存在对应的世界事实' : 'This is committed content and may not reference a world fact',
  }
}

export const validateCommunityFixtureContract = () => {
  const accountIds = new Set(COMMUNITY_ACCOUNTS.map((account) => account.id))
  const factIds = new Set(COMMUNITY_FACTS.map((fact) => fact.id))
  const claimIds = new Set(COMMUNITY_CLAIMS.map((claim) => claim.id))
  const allowedClaimStatuses = new Set([
    'confirmed',
    'partially_confirmed',
    'unverified',
    'contradicted',
    'unknown',
  ])

  return (
    COMMUNITY_POSTS.every(
      (post) =>
        post.publicationState === 'committed' &&
        accountIds.has(post.accountId) &&
        post.factIds.every((id) => factIds.has(id)) &&
        post.claimIds.every((id) => claimIds.has(id)),
    ) && COMMUNITY_CLAIMS.every((claim) => allowedClaimStatuses.has(claim.truthStatus))
  )
}
