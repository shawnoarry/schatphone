<template>
  <main
    class="ripple-app"
    :class="{ 'is-detail-open': Boolean(selectedPost) }"
    data-app="community"
    data-testid="community-app"
  >
    <header class="ripple-header">
      <button type="button" class="ripple-header__back" :aria-label="t('返回主屏幕', 'Back to Home')" data-testid="community-home-back" @click="goHome">
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>
      <div class="ripple-brand">
        <span class="ripple-brand__mark" aria-hidden="true"><i class="fas fa-wave-square"></i></span>
        <span><strong>{{ isZh ? brand.nameZh : brand.nameEn }}</strong><small>{{ isZh ? brand.taglineZh : brand.taglineEn }}</small></span>
      </div>
      <span class="ripple-header__spacer"></span>
      <button type="button" class="ripple-header__refresh" data-testid="community-refresh" :aria-label="t('刷新本地内容', 'Refresh local content')" @click="refreshFeed">
        <i class="fas fa-rotate" aria-hidden="true"></i><span>{{ t('刷新', 'Refresh') }}</span>
      </button>
    </header>

    <div class="ripple-layout">
      <aside class="ripple-nav" :aria-label="t('社区频道', 'Community channels')">
        <nav>
          <button
            v-for="channel in channelRows"
            :key="channel.id"
            type="button"
            class="ripple-nav__item"
            :class="{ 'is-active': channel.id === activeChannelId }"
            :aria-current="channel.id === activeChannelId ? 'page' : undefined"
            :data-testid="`community-channel-${channel.id}`"
            @click="selectChannel(channel.id)"
          >
            <i class="fas" :class="channel.icon" aria-hidden="true"></i>
            <span>{{ channel.label }}</span>
            <strong v-if="channel.id === 'bookmarks' && bookmarkedPostIds.length">{{ bookmarkedPostIds.length }}</strong>
          </button>
        </nav>

        <section class="ripple-nav__note">
          <span>{{ t('信息说明', 'Information note') }}</span>
          <p>{{ t('涟漪会区分已核实信息和账号说法。发布不等于属实。', 'Ripple separates verified information from account claims. Publication does not make a claim true.') }}</p>
        </section>
      </aside>

      <section class="ripple-feed" :aria-label="activeChannelLabel">
        <div class="ripple-feed__masthead">
          <span class="ripple-feed__eyebrow">{{ t('公共信息流', 'PUBLIC SIGNAL') }}</span>
          <div><h1>{{ activeChannelLabel }}</h1><p>{{ activeChannelDescription }}</p></div>
          <span class="ripple-feed__date">23 / 08 / 2026</span>
        </div>

        <div class="ripple-feed__legend" :aria-label="t('内容状态说明', 'Content status guide')">
          <span class="is-verified"><i class="fas fa-circle-check" aria-hidden="true"></i>{{ t('已核实', 'Verified') }}</span>
          <span class="is-claim"><i class="fas fa-message" aria-hidden="true"></i>{{ t('账号说法', 'Account claim') }}</span>
          <span class="is-published"><i class="fas fa-pen-nib" aria-hidden="true"></i>{{ t('已发布内容', 'Published post') }}</span>
        </div>

        <div v-if="refreshNotice" class="ripple-feed__notice" role="status" data-testid="community-refresh-notice">
          <i class="fas fa-check" aria-hidden="true"></i>{{ t('已刷新本地内容，未调用 AI。', 'Local content refreshed. No AI was called.') }}
        </div>

        <div v-if="!fixtureContractValid" class="ripple-state is-error" role="alert" data-testid="community-error-state">
          <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
          <h2>{{ t('暂时无法显示内容', 'Content is temporarily unavailable') }}</h2>
          <p>{{ t('本地内容来源没有通过完整性检查。没有用其他内容替代。', 'The local content source failed its integrity check. Nothing was substituted.') }}</p>
          <button type="button" @click="refreshFeed">{{ t('重试', 'Try again') }}</button>
        </div>

        <div v-else-if="!visiblePosts.length" class="ripple-state" data-testid="community-empty-state">
          <span class="ripple-state__rings" aria-hidden="true"><i class="far fa-bookmark"></i></span>
          <h2>{{ emptyTitle }}</h2>
          <p>{{ emptyDescription }}</p>
          <button v-if="activeChannelId === 'bookmarks'" type="button" @click="selectChannel('explore')">{{ t('去发现看看', 'Browse Explore') }}</button>
        </div>

        <div v-else class="ripple-feed__list" data-testid="community-feed-list">
          <CommunityPostCard
            v-for="item in visiblePostRows"
            :key="item.post.id"
            v-bind="item"
            @open="openPost"
            @bookmark="toggleBookmark"
          />
        </div>
      </section>

      <aside class="ripple-context">
        <CommunityAccountPanel
          v-if="selectedAccountRow"
          v-bind="selectedAccountRow"
          @close="selectedAccountId = ''"
          @toggle-follow="toggleFollow"
        />
        <template v-else>
          <section class="ripple-context__lead">
            <span>{{ t('今日编辑线', 'TODAY’S DESK') }}</span>
            <h2>{{ t('一个事实，可以有很多种回声。', 'One fact can carry many echoes.') }}</h2>
            <p>{{ t('阅读帖子时，同时看它引用了什么，以及说法目前是否得到证实。', 'Read what a post cites, and whether its claims are currently supported.') }}</p>
          </section>
          <section class="ripple-context__accounts">
            <header><h2>{{ t('值得关注', 'People & channels') }}</h2><span>{{ followedAccountIds.length }}</span></header>
            <button v-for="account in suggestedAccounts" :key="account.id" type="button" :data-testid="`community-account-${account.id}`" @click="selectedAccountId = account.id">
              <span class="ripple-context__avatar" :class="`tone-${account.tone}`" aria-hidden="true">{{ account.avatar }}</span>
              <span><strong>{{ localAccountName(account) }}</strong><small>{{ account.handle }}</small></span>
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          </section>
        </template>
      </aside>

      <section v-if="selectedPostRow" class="ripple-detail-pane">
        <CommunityPostDetail
          v-bind="selectedPostRow"
          @back="closePost"
          @bookmark="toggleBookmark"
          @account="openAccount"
        />
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import CommunityPostCard from '../components/community/CommunityPostCard.vue'
import CommunityAccountPanel from '../components/community/CommunityAccountPanel.vue'
import CommunityPostDetail from '../components/community/CommunityPostDetail.vue'
import {
  COMMUNITY_ACCOUNTS,
  COMMUNITY_CHANNELS,
  COMMUNITY_POSTS,
  COMMUNITY_SHELL_BRAND,
  formatCommunityMetric,
  formatCommunityTime,
  getCommunityAccount,
  getCommunityClaim,
  getCommunityFact,
  getCommunityPost,
  resolveCommunityTruthPresentation,
  validateCommunityFixtureContract,
} from '../lib/community-shell-data'
import {
  loadCommunityShellState,
  saveCommunityShellState,
  toggleCommunityStateId,
} from '../lib/community-shell-state'

const route = useRoute()
const router = useRouter()
// Ripple is an independent app with a fixed dark coral identity: it never
// follows the system day/night switch (independent-app rule).
const { t, isZh } = useI18n()
const brand = COMMUNITY_SHELL_BRAND
const initialState = loadCommunityShellState()

const activeChannelId = ref(initialState.activeChannelId)
const followedAccountIds = ref(initialState.followedAccountIds)
const bookmarkedPostIds = ref(initialState.bookmarkedPostIds)
const readPostIds = ref(initialState.readPostIds)
const selectedPostId = ref('')
const selectedAccountId = ref('')
const refreshNotice = ref(false)
let refreshTimer = null

const fixtureContractValid = computed(() => validateCommunityFixtureContract())
const selectedPost = computed(() => getCommunityPost(selectedPostId.value))

const persistState = () =>
  saveCommunityShellState({
    followedAccountIds: followedAccountIds.value,
    bookmarkedPostIds: bookmarkedPostIds.value,
    readPostIds: readPostIds.value,
    activeChannelId: activeChannelId.value,
  })

const localAccountName = (account) => (isZh.value ? account.nameZh : account.nameEn)
const localAccountBio = (account) => (isZh.value ? account.bioZh : account.bioEn)

const channelRows = computed(() => COMMUNITY_CHANNELS.map((channel) => ({
  ...channel,
  label: isZh.value ? channel.labelZh : channel.labelEn,
})))

const activeChannelLabel = computed(() => channelRows.value.find((item) => item.id === activeChannelId.value)?.label || '')
const activeChannelDescription = computed(() => ({
  following: t('只看你主动关注的账号，顺序稳定且不猜测偏好。', 'Only accounts you chose to follow, in a stable order without inferred preferences.'),
  explore: t('浏览本地精选的世界动态、讨论和长文。', 'Browse locally curated world moments, discussion, and features.'),
  news: t('查看媒体、机构与官方频道的公开发布。', 'Read public reports from media, institutions, and official channels.'),
  bookmarks: t('你保存的帖子仅在这个预览壳中保留。', 'Posts you save stay only inside this preview shell.'),
})[activeChannelId.value])

const visiblePosts = computed(() => {
  if (!fixtureContractValid.value) return []
  if (activeChannelId.value === 'bookmarks') return COMMUNITY_POSTS.filter((post) => bookmarkedPostIds.value.includes(post.id))
  if (activeChannelId.value === 'following') {
    return COMMUNITY_POSTS.filter((post) => post.channelIds.includes('following') && followedAccountIds.value.includes(post.accountId))
  }
  return COMMUNITY_POSTS.filter((post) => post.channelIds.includes(activeChannelId.value))
})

const emptyTitle = computed(() => activeChannelId.value === 'bookmarks' ? t('还没有收藏', 'Nothing saved yet') : t('这里还没有内容', 'Nothing here yet'))
const emptyDescription = computed(() => activeChannelId.value === 'bookmarks'
  ? t('在帖子上点击书签，它就会收到这里。', 'Use the bookmark on a post to keep it here.')
  : t('你可以切换到其他频道继续浏览。', 'Switch to another channel to keep browsing.'))

const toPostRow = (post) => {
  const account = getCommunityAccount(post.accountId)
  const body = isZh.value ? post.bodyZh : post.bodyEn
  return {
    post, account,
    accountName: localAccountName(account),
    title: isZh.value ? post.titleZh : post.titleEn,
    body: body.join(' '),
    timeLabel: formatCommunityTime(post.publishedAt, isZh.value),
    truth: resolveCommunityTruthPresentation(post, isZh.value),
    mediaEyebrow: post.media ? (isZh.value ? post.media.eyebrowZh : post.media.eyebrowEn) : '',
    read: readPostIds.value.includes(post.id),
    bookmarked: bookmarkedPostIds.value.includes(post.id),
    openLabel: t(`打开帖子 ${isZh.value ? post.titleZh || body[0] : post.titleEn || body[0]}`, `Open post ${post.titleEn || body[0]}`),
    bookmarkLabel: bookmarkedPostIds.value.includes(post.id) ? t('取消收藏', 'Remove bookmark') : t('收藏帖子', 'Bookmark post'),
    commentLabel: t('评论数', 'Comment count'), repostLabel: t('转发数', 'Repost count'),
    commentCount: formatCommunityMetric(post.metrics.comments, isZh.value),
    repostCount: formatCommunityMetric(post.metrics.reposts, isZh.value), newLabel: t('新', 'NEW'),
  }
}

const visiblePostRows = computed(() => visiblePosts.value.map(toPostRow))
const selectedPostRow = computed(() => {
  const post = selectedPost.value
  if (!post) return null
  const base = toPostRow(post)
  return {
    post, account: base.account, accountName: base.accountName, title: base.title,
    body: isZh.value ? post.bodyZh : post.bodyEn, timeLabel: base.timeLabel, truth: base.truth,
    mediaEyebrow: base.mediaEyebrow, bookmarked: base.bookmarked, bookmarkLabel: base.bookmarkLabel,
    backLabel: t('返回信息流', 'Back to feed'), backText: t('信息流', 'Feed'),
    sourcesHeading: t('可核对的公开来源', 'Checkable public sources'),
    claimsHeading: t('帖文中的说法', 'Claims in this post'),
    unavailableLabel: t('原始来源目前不可用，未补写缺失内容。', 'The original source is unavailable. Missing content was not reconstructed.'),
    committedLabel: t('已发布记录', 'Committed publication'),
    commentCount: base.commentCount, repostCount: base.repostCount,
    facts: post.factIds.map(getCommunityFact).filter(Boolean).map((fact) => ({ ...fact, summary: isZh.value ? fact.summaryZh : fact.summaryEn, sourceLabel: isZh.value ? fact.sourceLabelZh : fact.sourceLabelEn })),
    claims: post.claimIds.map(getCommunityClaim).filter(Boolean).map((claim) => ({ ...claim, summary: isZh.value ? claim.summaryZh : claim.summaryEn, statusLabel: isZh.value ? claim.statusLabelZh : claim.statusLabelEn })),
  }
})

const suggestedAccounts = computed(() => COMMUNITY_ACCOUNTS.slice(0, 5))
const accountKindLabel = (kind) => ({ organization: t('官方机构', 'Official organization'), media: t('媒体账号', 'Media account'), channel: t('频道', 'Channel'), person: t('个人账号', 'Personal account'), anonymous: t('匿名账号', 'Anonymous account') })[kind] || t('账号', 'Account')
const selectedAccountRow = computed(() => {
  const account = getCommunityAccount(selectedAccountId.value)
  if (!account) return null
  return {
    account, name: localAccountName(account), bio: localAccountBio(account), kindLabel: accountKindLabel(account.kind),
    followerCount: isZh.value ? account.followersZh : account.followersEn,
    postCount: COMMUNITY_POSTS.filter((post) => post.accountId === account.id).length,
    followed: followedAccountIds.value.includes(account.id), followerLabel: t('关注者', 'Followers'), postLabel: t('帖子', 'Posts'),
    followLabel: t('关注', 'Follow'), followingLabel: t('已关注', 'Following'), closeLabel: t('关闭账号信息', 'Close account information'),
  }
})

const goHome = () => pushReturnTarget(router, route, '/home')
const selectChannel = (channelId) => { activeChannelId.value = channelId; selectedPostId.value = ''; persistState() }
const openPost = (postId) => { selectedPostId.value = postId; readPostIds.value = [...new Set([...readPostIds.value, postId])]; persistState() }
const closePost = () => { selectedPostId.value = '' }
const toggleBookmark = (postId) => { bookmarkedPostIds.value = toggleCommunityStateId(bookmarkedPostIds.value, postId); persistState() }
const toggleFollow = (accountId) => { followedAccountIds.value = toggleCommunityStateId(followedAccountIds.value, accountId); persistState() }
const openAccount = (accountId) => { selectedPostId.value = ''; selectedAccountId.value = accountId }
const refreshFeed = () => { refreshNotice.value = true; if (refreshTimer) clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { refreshNotice.value = false }, 2400) }
onBeforeUnmount(() => { if (refreshTimer) clearTimeout(refreshTimer) })
</script>

<style scoped>
.ripple-app {
  --ripple-paper: #111416; --ripple-panel: #191d20; --ripple-soft: #23282c; --ripple-line: #343a3f; --ripple-line-strong: #596167;
  --ripple-ink: #f5f2ec; --ripple-copy: #d5d0c7; --ripple-muted: #a9a39b; --ripple-accent: #ff7a86; --ripple-action: #d94859;
  --ripple-accent-ink: #ff9aa3; --ripple-accent-soft: #42272d; --ripple-focus: #7cc8ff;
  --ripple-truth-bg: #19382e; --ripple-truth-ink: #9de0c4; --ripple-warning-bg: #3d3218; --ripple-warning-ink: #f8d578;
  --ripple-corrected-bg: #252f50; --ripple-corrected-ink: #b9c7ff; --ripple-neutral-bg: #303438; --ripple-neutral-ink: #d3cec7;
  width: 100%; height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; color: var(--ripple-ink); background: var(--ripple-paper);
  font-family: 'Aptos', 'Segoe UI', 'Noto Sans CJK SC', sans-serif;
}
:global(.app-shell:has(.ripple-app) .status-fg) { color: #f5f2ec; }
.ripple-header { min-height: 94px; padding: calc(34px + env(safe-area-inset-top)) 18px 10px; box-sizing: border-box; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--ripple-line); background: color-mix(in srgb, var(--ripple-panel) 94%, transparent); flex: none; }
:global(.app-shell[data-statusbar='off']) .ripple-header { min-height: 70px; padding-top: calc(10px + env(safe-area-inset-top)); }
.ripple-header__back, .ripple-header__refresh { min-width: 44px; min-height: 44px; border: 0; border-radius: 14px; color: var(--ripple-ink); background: transparent; cursor: pointer; }
.ripple-header__back:hover, .ripple-header__refresh:hover { background: var(--ripple-soft); }
.ripple-header__refresh { padding: 0 12px; display: inline-flex; align-items: center; gap: 7px; font-weight: 800; }
.ripple-header__spacer { flex: 1; }
.ripple-brand { min-width: 0; display: flex; align-items: center; gap: 11px; }
.ripple-brand__mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 15px 15px 15px 5px; color: #fff; background: var(--ripple-action); }
.ripple-brand > span:last-child { min-width: 0; }
.ripple-brand strong, .ripple-brand small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ripple-brand strong { font: 800 20px/1.05 Georgia, 'Noto Serif SC', serif; }.ripple-brand small { margin-top: 3px; max-width: 370px; color: var(--ripple-muted); font-size: 11px; }
.ripple-layout { flex: 1; min-height: 0; display: grid; grid-template-columns: 220px minmax(360px, 690px) minmax(250px, 1fr); justify-content: center; position: relative; }
.ripple-nav { min-width: 0; padding: 24px 18px; border-right: 1px solid var(--ripple-line); background: var(--ripple-panel); }
.ripple-nav nav { display: grid; gap: 7px; }
.ripple-nav__item { min-height: 48px; padding: 0 14px; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 9px; border: 0; border-radius: 14px; color: var(--ripple-copy); background: transparent; text-align: left; font-weight: 750; cursor: pointer; }
.ripple-nav__item:hover { background: var(--ripple-soft); }.ripple-nav__item.is-active { color: var(--ripple-accent-ink); background: var(--ripple-accent-soft); }
.ripple-nav__item strong { min-width: 22px; padding: 3px 6px; border-radius: 999px; color: #fff; background: var(--ripple-action); text-align: center; font-size: 10px; }
.ripple-nav__note { margin-top: 28px; padding: 17px; border: 1px solid var(--ripple-line); border-radius: 18px; background: var(--ripple-paper); }
.ripple-nav__note span { color: var(--ripple-accent-ink); font-size: 11px; font-weight: 900; letter-spacing: .1em; }.ripple-nav__note p { margin: 8px 0 0; color: var(--ripple-muted); font-size: 12px; line-height: 1.6; }
.ripple-feed { min-width: 0; min-height: 0; padding: 24px 22px 50px; overflow-y: auto; }
.ripple-feed__masthead { margin-bottom: 20px; padding: 0 2px 18px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: end; gap: 13px; border-bottom: 3px double var(--ripple-line-strong); }
.ripple-feed__eyebrow { writing-mode: vertical-rl; transform: rotate(180deg); color: var(--ripple-accent-ink); font-size: 9px; font-weight: 900; letter-spacing: .15em; }
.ripple-feed__masthead h1 { margin: 0; font: 850 clamp(31px, 4vw, 46px)/1 Georgia, 'Noto Serif SC', serif; letter-spacing: -.04em; }.ripple-feed__masthead p { margin: 7px 0 0; max-width: 490px; color: var(--ripple-muted); font-size: 12px; line-height: 1.45; }
.ripple-feed__date { color: var(--ripple-muted); font: 700 10px/1 Georgia, serif; letter-spacing: .08em; }
.ripple-feed__legend { margin: -8px 0 16px; display: flex; flex-wrap: wrap; gap: 7px; color: var(--ripple-muted); font-size: 10px; font-weight: 800; }
.ripple-feed__legend span { min-height: 28px; padding: 0 10px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--ripple-line); border-radius: 999px; background: var(--ripple-paper); }
.ripple-feed__legend .is-verified i { color: var(--ripple-truth-ink); }
.ripple-feed__legend .is-claim i { color: var(--ripple-warning-ink); }
.ripple-feed__legend .is-published i { color: var(--ripple-accent-ink); }
.ripple-feed__notice { margin-bottom: 12px; padding: 11px 13px; display: flex; gap: 8px; border-radius: 13px; color: var(--ripple-truth-ink); background: var(--ripple-truth-bg); font-size: 12px; font-weight: 750; }
.ripple-feed__list { display: grid; gap: 13px; }
.ripple-state { min-height: 390px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 34px; text-align: center; border: 1px dashed var(--ripple-line-strong); border-radius: 24px; background: var(--ripple-panel); }
.ripple-state__rings { width: 92px; height: 92px; display: grid; place-items: center; border: 1px solid var(--ripple-line); border-radius: 50%; box-shadow: 0 0 0 12px var(--ripple-soft), 0 0 0 13px var(--ripple-line); color: var(--ripple-accent-ink); font-size: 28px; }
.ripple-state > i { color: var(--ripple-accent); font-size: 32px; }.ripple-state h2 { margin: 28px 0 8px; font: 800 24px/1.2 Georgia, 'Noto Serif SC', serif; }.ripple-state p { max-width: 420px; margin: 0; color: var(--ripple-muted); line-height: 1.6; }.ripple-state button { margin-top: 20px; min-height: 44px; padding: 0 18px; border: 0; border-radius: 14px; color: #fff; background: var(--ripple-action); font-weight: 800; cursor: pointer; }
.ripple-context { min-width: 0; overflow-y: auto; border-left: 1px solid var(--ripple-line); background: var(--ripple-panel); }
.ripple-context__lead { padding: 30px 24px; color: #fff; background: linear-gradient(150deg, #da3f52, #f06462 58%, #f59570); }
.ripple-context__lead span { font-size: 10px; font-weight: 900; letter-spacing: .15em; }.ripple-context__lead h2 { margin: 28px 0 12px; font: 800 28px/1.14 Georgia, 'Noto Serif SC', serif; }.ripple-context__lead p { margin: 0; color: rgba(255,255,255,.88); font-size: 13px; line-height: 1.7; }
.ripple-context__accounts { padding: 24px; }.ripple-context__accounts header { margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }.ripple-context__accounts h2 { margin: 0; font: 800 17px/1.2 Georgia, 'Noto Serif SC', serif; }.ripple-context__accounts header span { color: var(--ripple-muted); font-size: 12px; }
.ripple-context__accounts button { width: 100%; min-height: 62px; padding: 9px 4px; display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; align-items: center; gap: 10px; border: 0; border-bottom: 1px solid var(--ripple-line); color: inherit; background: transparent; text-align: left; cursor: pointer; }.ripple-context__accounts button:hover { background: var(--ripple-soft); }.ripple-context__accounts button > span:nth-child(2) { min-width: 0; }.ripple-context__accounts strong, .ripple-context__accounts small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.ripple-context__accounts small { margin-top: 2px; color: var(--ripple-muted); }.ripple-context__accounts button > i { color: var(--ripple-muted); }
.ripple-context__avatar { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 14px 14px 14px 5px; color: #fff; background: #26313c; font: 800 15px/1 Georgia, serif; }.ripple-context__avatar.tone-vermilion { background: #e44a57; }.ripple-context__avatar.tone-ink { background: #1c2832; }.ripple-context__avatar.tone-blue { background: #2876a8; }.ripple-context__avatar.tone-violet { background: #7557b7; }.ripple-context__avatar.tone-slate { background: #59636d; }
.ripple-detail-pane { position: absolute; inset: 0 0 0 220px; z-index: 4; min-width: 0; min-height: 0; box-shadow: -18px 0 60px rgba(0,0,0,.12); }
button:focus-visible { outline: 3px solid var(--ripple-focus); outline-offset: 2px; }
@media (max-width: 980px) { .ripple-layout { grid-template-columns: 190px minmax(0, 1fr); }.ripple-context { display: none; }.ripple-detail-pane { left: 190px; } }
@media (max-width: 650px) {
  .ripple-header { min-height: 88px; padding: calc(34px + env(safe-area-inset-top)) 10px 10px; }.ripple-brand small { display: none; }.ripple-brand strong { font-size: 18px; }.ripple-header__refresh span { display: none; }
  :global(.app-shell[data-statusbar='off']) .ripple-header { min-height: 64px; padding-top: calc(10px + env(safe-area-inset-top)); }
  .ripple-layout { display: block; padding-bottom: calc(64px + env(safe-area-inset-bottom)); }.ripple-nav { position: absolute; z-index: 3; inset: auto 0 0; height: calc(64px + env(safe-area-inset-bottom)); padding: 6px 8px env(safe-area-inset-bottom); border: 0; border-top: 1px solid var(--ripple-line); }.ripple-nav nav { height: 100%; display: grid; grid-template-columns: repeat(4, 1fr); }.ripple-nav__item { min-width: 0; min-height: 50px; padding: 5px 2px; display: flex; flex-direction: column; justify-content: center; gap: 3px; text-align: center; font-size: 10px; }.ripple-nav__item strong { position: absolute; margin: -23px 0 0 25px; }.ripple-nav__note { display: none; }
  .ripple-feed { height: 100%; padding: 19px 0 30px; }.ripple-feed__masthead { margin-inline: 14px; grid-template-columns: minmax(0,1fr) auto; }.ripple-feed__eyebrow { display: none; }.ripple-feed__masthead h1 { font-size: 34px; }.ripple-feed__masthead p { font-size: 11px; }.ripple-feed__legend { margin-inline: 14px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }.ripple-feed__legend span { flex: 0 0 auto; }.ripple-feed__list { gap: 10px; }.ripple-feed__notice { margin-inline: 14px; }.ripple-state { margin: 0 14px; min-height: 340px; }.ripple-detail-pane { inset: 0; }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>
