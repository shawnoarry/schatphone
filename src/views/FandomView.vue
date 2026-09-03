<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useFandomShellState } from '../composables/useFandomShellState'
import { useWorkplaceShellState } from '../composables/useWorkplaceShellState'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  FANDOM_ARTISTS,
  FANDOM_BRAND,
  FANDOM_FEATURED_ARTIST_ID,
  FANDOM_PUBLIC_SCHEDULE,
  FANDOM_SUBSCRIPTION_CHANNELS,
  getFandomArtist,
  getFandomCommunityRows,
  validateFandomFixtureContract,
} from '../lib/fandom-shell-data'

const router = useRouter()
const route = useRoute()
// Aster is an independent app with a fixed night-sky identity (navy + lime):
// it never follows the system day/night switch (independent-app rule).
const { languageBase, t } = useI18n()
const fandomState = useFandomShellState()
const workplaceState = useWorkplaceShellState()

const selectedArtistId = ref(FANDOM_FEATURED_ARTIST_ID)
const selectedPostId = ref('')
const feedback = ref('')
const isZh = computed(() => languageBase.value === 'zh')
const fixtureValid = computed(() => validateFandomFixtureContract())
const activeTab = computed(() => fandomState.activeTab.value)
const featuredArtist = computed(() => getFandomArtist(FANDOM_FEATURED_ARTIST_ID))
const selectedArtist = computed(() => getFandomArtist(selectedArtistId.value) || featuredArtist.value)
const communityRows = computed(() => getFandomCommunityRows())
const selectedPostRow = computed(() => communityRows.value.find(({ post }) => post.id === selectedPostId.value) || null)
const artistApplicationPending = computed(() => workplaceState.artistApplication.value?.status === 'pending')
const unreadMessageCount = computed(() => FANDOM_SUBSCRIPTION_CHANNELS.flatMap((channel) => channel.messages).filter((message) => !fandomState.readMessageIds.value.includes(message.id)).length)

const text = (record, zhKey, enKey) => (isZh.value ? record?.[zhKey] : record?.[enKey]) || ''
const postTitle = (post) => text(post, 'titleZh', 'titleEn') || text(post, 'bodyZh', 'bodyEn')?.[0] || ''
const postBody = (post) => (isZh.value ? post.bodyZh : post.bodyEn) || []
const accountName = (account) => text(account, 'nameZh', 'nameEn')
const artistInitials = (artist) => text(artist, 'initialsZh', 'initialsEn')

const notify = (zh, en) => {
  feedback.value = t(zh, en)
  window.setTimeout(() => { feedback.value = '' }, 2200)
}
const selectTab = (tab) => fandomState.setActiveTab(tab)
const toggleFollow = (artistId) => {
  const result = fandomState.toggleFollow(artistId)
  if (result.ok) notify(result.active ? '已加入关注' : '已取消关注', result.active ? 'Now following' : 'Unfollowed')
}
const toggleBookmark = (postId) => {
  const result = fandomState.toggleBookmark(postId)
  if (result.ok) notify(result.active ? '已收藏到星集' : '已取消收藏', result.active ? 'Saved to Aster' : 'Removed from saved')
}
const openChannel = (channelId) => {
  fandomState.markChannelRead(channelId)
  notify('预览消息已标记为已读', 'Preview messages marked as read')
}
const openWorkplace = () => router.push({ path: '/workplace', query: { source: 'fandom', homePage: route.query.homePage || undefined } })
const closeApp = () => pushReturnTarget(router, route, '/home')
</script>

<template>
  <main class="aster-app" data-app="fandom" data-testid="fandom-app">
    <header class="aster-header">
      <button type="button" class="icon-button" :aria-label="t('返回', 'Back')" data-testid="fandom-back" @click="closeApp"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
      <div class="aster-wordmark"><span class="aster-mark" aria-hidden="true">✦</span><span><strong>{{ isZh ? FANDOM_BRAND.nameZh : FANDOM_BRAND.nameEn }}</strong><small>{{ isZh ? FANDOM_BRAND.taglineZh : FANDOM_BRAND.taglineEn }}</small></span></div>
      <div class="consumer-badge"><i class="fas fa-user" aria-hidden="true"></i>{{ t('粉丝空间', 'Fan space') }}</div>
    </header>

    <div v-if="feedback" class="aster-toast" role="status">{{ feedback }}</div>
    <section v-if="!fixtureValid" class="aster-error" role="alert"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i><h1>{{ t('内容暂不可用', 'Content unavailable') }}</h1><p>{{ t('本地内容引用不完整，星集没有补写缺失内容。', 'Local content references are incomplete. Aster did not invent replacements.') }}</p></section>

    <template v-else>
      <div class="aster-content">
        <section v-if="activeTab === 'home'" class="aster-page" data-testid="fandom-home">
          <article class="aster-hero">
            <div class="aster-hero__copy"><span>{{ t('本周靠近', 'THIS WEEK, CLOSER') }}</span><h1>{{ text(featuredArtist, 'nameZh', 'nameEn') }}</h1><p>{{ t('排练结束后，她留下了一封只写给订阅空间的晚安短笺。', 'After rehearsal, she left a short goodnight note for the subscription space.') }}</p><button type="button" data-testid="fandom-featured-follow" @click="toggleFollow(featuredArtist.id)">{{ fandomState.followedArtistIds.value.includes(featuredArtist.id) ? t('已关注', 'Following') : t('关注艺人', 'Follow artist') }}</button></div>
            <div class="aster-hero__portrait" :class="`tone-${featuredArtist.tone}`"><b>{{ artistInitials(featuredArtist) }}</b><span>{{ text(featuredArtist, 'groupZh', 'groupEn') }}</span></div>
          </article>

          <div class="aster-home-grid">
            <article class="schedule-ticket" data-testid="fandom-public-schedule"><div><span>{{ t('官方公开日程', 'OFFICIAL PUBLIC SCHEDULE') }}</span><h2>{{ text(FANDOM_PUBLIC_SCHEDULE, 'titleZh', 'titleEn') }}</h2><p>{{ text(FANDOM_PUBLIC_SCHEDULE, 'dateZh', 'dateEn') }} · {{ text(FANDOM_PUBLIC_SCHEDULE, 'placeZh', 'placeEn') }}</p></div><small>{{ t('来源：日历公开记录', 'Source: public Calendar record') }}</small></article>
            <article class="message-preview"><header><span>{{ t('星信预览', 'ASTER NOTE PREVIEW') }}</span><strong>{{ unreadMessageCount }}</strong></header><p>“{{ text(FANDOM_SUBSCRIPTION_CHANNELS[0].messages[0], 'bodyZh', 'bodyEn') }}”</p><button type="button" data-testid="fandom-open-messages" @click="selectTab('messages')">{{ t('查看订阅空间', 'Open subscription space') }}</button></article>
          </div>

          <section class="aster-section"><header><div><span>{{ t('来自涟漪的公开内容', 'PUBLIC CONTENT FROM RIPPLE') }}</span><h2>{{ t('社区精选', 'Community edit') }}</h2></div><small>{{ t('同一内容记录 · 品牌化展示', 'Same publication records · branded view') }}</small></header><div class="post-grid"><article v-for="row in communityRows" :key="row.post.id" class="post-card"><button type="button" class="post-card__open" :data-testid="`fandom-post-${row.post.id}`" @click="selectedPostId = row.post.id"><span class="post-card__account">{{ accountName(row.account) }} <i v-if="row.account.verified" class="fas fa-circle-check" aria-label="Verified"></i></span><h3>{{ postTitle(row.post) }}</h3><p>{{ postBody(row.post)[0] }}</p></button><button type="button" class="save-button" :aria-label="t('收藏内容', 'Save post')" @click="toggleBookmark(row.post.id)"><i :class="fandomState.bookmarkedPostIds.value.includes(row.post.id) ? 'fas fa-bookmark' : 'far fa-bookmark'" aria-hidden="true"></i></button></article></div></section>
        </section>

        <section v-else-if="activeTab === 'artists'" class="aster-page" data-testid="fandom-artists">
          <div class="page-heading"><span>{{ t('ARTIST DIRECTORY', 'ARTIST DIRECTORY') }}</span><h1>{{ t('艺人与社区', 'Artists & communities') }}</h1><p>{{ t('关注只改变星集内的本地浏览偏好，不创建关系事实。', 'Following changes only local Aster discovery preferences. It creates no relationship fact.') }}</p></div>
          <div class="artist-layout"><div class="artist-list"><button v-for="artist in FANDOM_ARTISTS" :key="artist.id" type="button" :class="{ 'is-active': selectedArtist.id === artist.id }" :data-testid="`fandom-artist-${artist.id}`" @click="selectedArtistId = artist.id"><span class="artist-avatar" :class="`tone-${artist.tone}`">{{ artistInitials(artist) }}</span><span><strong>{{ text(artist, 'nameZh', 'nameEn') }}</strong><small>{{ text(artist, 'groupZh', 'groupEn') }}</small></span><i class="fas fa-chevron-right" aria-hidden="true"></i></button></div><article class="artist-profile"><div class="artist-profile__portrait" :class="`tone-${selectedArtist.tone}`">{{ artistInitials(selectedArtist) }}</div><span>{{ text(selectedArtist, 'groupZh', 'groupEn') }}</span><h2>{{ text(selectedArtist, 'nameZh', 'nameEn') }}</h2><p>{{ text(selectedArtist, 'followerLabelZh', 'followerLabelEn') }}</p><button type="button" data-testid="fandom-selected-follow" @click="toggleFollow(selectedArtist.id)">{{ fandomState.followedArtistIds.value.includes(selectedArtist.id) ? t('正在关注', 'Following') : t('加入关注', 'Follow') }}</button></article></div>
        </section>

        <section v-else-if="activeTab === 'messages'" class="aster-page" data-testid="fandom-messages">
          <div class="page-heading"><span>{{ t('ARTIST SUBSCRIPTION', 'ARTIST SUBSCRIPTION') }}</span><h1>{{ t('星信', 'Aster notes') }}</h1><p>{{ t('这是平台订阅内容预览，不是 Chat 私聊，也没有发生真实扣款。', 'This is a preview of committed platform subscription content, not a Chat DM, and no payment occurred.') }}</p></div>
          <article v-for="channel in FANDOM_SUBSCRIPTION_CHANNELS" :key="channel.id" class="message-channel"><header><div class="artist-avatar tone-cobalt">{{ artistInitials(getFandomArtist(channel.artistId)) }}</div><div><span>{{ t('免费预览频道', 'FREE PREVIEW CHANNEL') }}</span><h2>{{ text(channel, 'labelZh', 'labelEn') }}</h2></div><button type="button" :data-testid="`fandom-read-${channel.id}`" @click="openChannel(channel.id)">{{ t('全部已读', 'Mark read') }}</button></header><div class="message-bubbles"><p v-for="message in channel.messages" :key="message.id" :class="{ 'is-unread': !fandomState.readMessageIds.value.includes(message.id) }"><small>{{ message.time }}</small>{{ text(message, 'bodyZh', 'bodyEn') }}</p></div><footer><i class="fas fa-lock" aria-hidden="true"></i>{{ t('正式订阅、续费和退款需等待 Wallet 与平台 owner 接入。', 'Activation, renewal, and refunds wait for Wallet and the platform owner.') }}</footer></article>
        </section>

        <section v-else class="aster-page" data-testid="fandom-me">
          <div class="page-heading"><span>{{ t('MY ASTER', 'MY ASTER') }}</span><h1>{{ t('我的空间', 'My space') }}</h1></div>
          <div class="me-grid"><article class="membership-card"><span>{{ t('当前会员', 'CURRENT MEMBERSHIP') }}</span><h2>{{ t('免费成员', 'Free member') }}</h2><p>{{ t('可关注、收藏和阅读公开内容。没有付费订阅或艺人发布权限。', 'Follow, save, and read public content. No paid subscription or artist publishing access is active.') }}</p></article><article class="preference-card"><div><span>{{ t('星集内提醒', 'Aster alerts') }}</span><p>{{ t('只保存本机偏好，尚未创建系统通知频道。', 'Stores a local preference only; no system notification channel is created yet.') }}</p></div><button type="button" role="switch" :aria-label="t('星集内提醒', 'Aster alerts')" :aria-checked="fandomState.notificationsEnabled.value" data-testid="fandom-notification-toggle" @click="fandomState.toggleNotifications()"><span></span></button></article></div>
          <article class="artist-access" data-testid="fandom-artist-access"><div class="artist-access__mark"><i class="fas fa-star" aria-hidden="true"></i></div><div><span>{{ t('艺人工作区', 'ARTIST WORKSPACE') }}</span><h2>{{ artistApplicationPending ? t('等待平台审核', 'Platform review pending') : t('当前未开通', 'Not available yet') }}</h2><p>{{ artistApplicationPending ? t('工作台申请已存在，但尚未签发平台发布资格。', 'A Work Hub application exists, but the platform has not issued publishing entitlement.') : t('需要由所属组织确认身份，再由星集平台单独批准。', 'Your organization must attest the identity before Aster separately approves access.') }}</p></div><button type="button" data-testid="fandom-open-workplace" @click="openWorkplace">{{ t('前往工作台', 'Open Work Hub') }}</button></article>
        </section>
      </div>

      <nav class="aster-nav" :aria-label="t('星集导航', 'Aster navigation')">
        <button v-for="tab in [{ id: 'home', zh: '首页', en: 'Home', icon: 'fa-house' }, { id: 'artists', zh: '艺人', en: 'Artists', icon: 'fa-star' }, { id: 'messages', zh: '星信', en: 'Notes', icon: 'fa-envelope' }, { id: 'me', zh: '我的', en: 'Me', icon: 'fa-user' }]" :key="tab.id" type="button" :class="{ 'is-active': activeTab === tab.id }" :data-testid="`fandom-tab-${tab.id}`" @click="selectTab(tab.id)"><i :class="`fas ${tab.icon}`" aria-hidden="true"></i><span>{{ isZh ? tab.zh : tab.en }}</span><b v-if="tab.id === 'messages' && unreadMessageCount">{{ unreadMessageCount }}</b></button>
      </nav>
    </template>

    <section v-if="selectedPostRow" class="post-detail" role="dialog" aria-modal="true" :aria-label="t('社区内容详情', 'Community post detail')" data-testid="fandom-post-detail"><button type="button" class="icon-button" :aria-label="t('关闭', 'Close')" @click="selectedPostId = ''"><i class="fas fa-xmark" aria-hidden="true"></i></button><span>{{ accountName(selectedPostRow.account) }}</span><h2>{{ postTitle(selectedPostRow.post) }}</h2><p v-for="paragraph in postBody(selectedPostRow.post)" :key="paragraph">{{ paragraph }}</p><small>{{ t('此页面读取 Ripple fixture 的同一稳定帖子 ID，不保存第二份发布记录。', 'This page reads the same stable Ripple fixture post ID and stores no second publication record.') }}</small></section>
  </main>
</template>

<style scoped>
.aster-app{--paper:#0d1020;--panel:#161a2d;--ink:#f6f3e9;--muted:#aeb3c4;--line:#30364f;--blue:#405cc4;--blue-text:#9cb0ff;--blue2:#20367f;--lime:#d8ef70;--coral:#ff8b78;--focus:#89c8ff;width:100%;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;color:var(--ink);background:var(--paper);font-family:"Aptos","Segoe UI","Noto Sans CJK SC",sans-serif}:global(.app-shell:has(.aster-app) .status-fg){color:#f6f3e9}
.aster-header{min-height:94px;padding:calc(34px + env(safe-area-inset-top)) 18px 10px;display:flex;align-items:center;gap:13px;box-sizing:border-box;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--panel) 94%,transparent);flex:none}.icon-button{width:44px;height:44px;border:0;border-radius:50%;color:inherit;background:transparent;cursor:pointer}.icon-button:hover{background:color-mix(in srgb,var(--blue) 9%,transparent)}.aster-wordmark{min-width:0;display:flex;align-items:center;gap:11px}.aster-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:50% 50% 12px 50%;color:var(--ink);background:var(--lime);font-size:22px;transform:rotate(-8deg)}.aster-wordmark>span:last-child{min-width:0}.aster-wordmark strong,.aster-wordmark small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.aster-wordmark strong{font:900 21px/1 Georgia,"Noto Serif SC",serif}.aster-wordmark small{margin-top:2px;color:var(--muted);font-size:10px}.consumer-badge{margin-left:auto;min-height:34px;padding:0 12px;display:flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:999px;font-size:11px;font-weight:850}.aster-content{flex:1;min-height:0;overflow-y:auto;padding-bottom:78px}.aster-page{width:min(1080px,100%);margin:auto;padding:24px;box-sizing:border-box}.aster-toast{position:absolute;z-index:12;top:98px;left:50%;transform:translateX(-50%);padding:10px 16px;border-radius:999px;color:#fff;background:#111936;box-shadow:0 12px 30px #0003;font-size:12px;font-weight:800}.aster-error{margin:auto;text-align:center}.aster-error i{font-size:38px;color:var(--coral)}
.aster-hero{min-height:330px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(260px,.85fr);overflow:hidden;border-radius:32px;color:#fff;background:linear-gradient(135deg,var(--blue2),#174fdc 62%,#557cff);box-shadow:0 24px 54px #142a7730}.aster-hero__copy{padding:42px}.aster-hero__copy>span,.aster-section header span,.page-heading>span,.message-channel header span,.membership-card>span,.artist-access span{font-size:9px;font-weight:950;letter-spacing:.16em}.aster-hero h1{margin:35px 0 12px;font:900 clamp(43px,7vw,74px)/.9 Georgia,"Noto Serif SC",serif;letter-spacing:-.06em}.aster-hero p{max-width:480px;margin:0;color:#e4eaff;line-height:1.65}.aster-hero button,.artist-profile button,.message-preview button,.artist-access button{min-height:44px;margin-top:26px;padding:0 18px;border:0;border-radius:999px;color:#10172f;background:var(--lime);font-weight:900;cursor:pointer}.aster-hero__portrait{position:relative;display:grid;place-items:center;isolation:isolate}.aster-hero__portrait:before,.aster-hero__portrait:after{content:"";position:absolute;border:1px solid #ffffff35;border-radius:50%}.aster-hero__portrait:before{width:240px;height:240px;box-shadow:0 0 0 46px #ffffff0b}.aster-hero__portrait:after{width:120px;height:120px;background:#ffffff12}.aster-hero__portrait b{z-index:1;font:900 100px/1 Georgia,serif}.aster-hero__portrait span{position:absolute;z-index:1;bottom:30px;font-size:10px;font-weight:900;letter-spacing:.2em}.aster-home-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;margin-top:16px}.schedule-ticket,.message-preview,.membership-card,.preference-card{padding:22px;border:1px solid var(--line);border-radius:24px;background:var(--panel)}.schedule-ticket{display:flex;justify-content:space-between;gap:20px;border-left:8px solid var(--coral)}.schedule-ticket span,.message-preview header span{color:var(--blue-text);font-size:9px;font-weight:950;letter-spacing:.12em}.schedule-ticket h2{margin:14px 0 6px;font:850 22px/1.1 Georgia,"Noto Serif SC",serif}.schedule-ticket p,.schedule-ticket small{color:var(--muted);font-size:11px}.message-preview header{display:flex;justify-content:space-between}.message-preview header strong{width:25px;height:25px;display:grid;place-items:center;border-radius:50%;color:#10172f;background:var(--lime);font-size:10px}.message-preview p{margin:20px 0 0;font:700 17px/1.55 Georgia,"Noto Serif SC",serif}.message-preview button{margin-top:15px;color:#fff;background:var(--blue)}
.aster-section{margin-top:30px}.aster-section>header{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:14px}.aster-section h2,.page-heading h1{margin:5px 0 0;font:900 32px/1 Georgia,"Noto Serif SC",serif}.aster-section header small{color:var(--muted)}.post-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.post-card{position:relative;min-width:0;border:1px solid var(--line);border-radius:20px;background:var(--panel);overflow:hidden}.post-card__open{width:100%;min-height:220px;padding:20px 20px 48px;border:0;color:inherit;background:transparent;text-align:left;cursor:pointer}.post-card__account{color:var(--blue-text);font-size:11px;font-weight:850}.post-card h3{margin:23px 0 10px;font:850 21px/1.18 Georgia,"Noto Serif SC",serif}.post-card p{display:-webkit-box;overflow:hidden;color:var(--muted);font-size:12px;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:3}.save-button{position:absolute;right:12px;bottom:10px;width:40px;height:40px;border:0;border-radius:50%;color:var(--blue-text);background:transparent;cursor:pointer}
.page-heading{padding:16px 0 25px;border-bottom:3px double var(--line)}.page-heading>span{color:var(--blue-text)}.page-heading p{max-width:650px;color:var(--muted);line-height:1.6}.artist-layout{display:grid;grid-template-columns:minmax(300px,1fr) minmax(280px,.8fr);gap:20px;margin-top:22px}.artist-list{display:grid;gap:9px}.artist-list button{min-height:76px;padding:10px 14px;display:grid;grid-template-columns:52px minmax(0,1fr) auto;align-items:center;gap:12px;border:1px solid var(--line);border-radius:18px;color:inherit;background:var(--panel);text-align:left;cursor:pointer}.artist-list button.is-active{border-color:var(--blue);box-shadow:inset 4px 0 var(--blue)}.artist-list strong,.artist-list small{display:block}.artist-list small{margin-top:3px;color:var(--muted);font-size:10px}.artist-avatar{width:48px;height:48px;display:grid;place-items:center;border-radius:50% 50% 12px 50%;color:#fff;background:var(--blue);font:850 18px/1 Georgia,serif}.tone-lime{color:#17203c!important;background:#d9f45a!important}.tone-coral{background:#ff745f!important}.artist-profile{padding:30px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-radius:26px;color:#fff;background:var(--blue2)}.artist-profile__portrait{width:130px;height:150px;display:grid;place-items:center;border-radius:70px 70px 24px 24px;background:#2f62e8;font:900 62px/1 Georgia,serif}.artist-profile>span{margin-top:23px;color:#bfcaff;font-size:9px;font-weight:900;letter-spacing:.18em}.artist-profile h2{margin:7px 0;font:900 30px/1 Georgia,"Noto Serif SC",serif}.artist-profile p{margin:0;color:#dbe2ff}.artist-profile button{margin-top:22px}
.message-channel{margin-top:22px;border:1px solid var(--line);border-radius:28px;background:var(--panel);overflow:hidden}.message-channel>header{padding:20px;display:grid;grid-template-columns:50px minmax(0,1fr) auto;align-items:center;gap:12px;border-bottom:1px solid var(--line)}.message-channel h2{margin:4px 0 0;font:850 20px/1.1 Georgia,"Noto Serif SC",serif}.message-channel header button{min-height:40px;padding:0 14px;border:1px solid var(--line);border-radius:999px;color:inherit;background:transparent;font-weight:800;cursor:pointer}.message-bubbles{padding:26px;display:grid;gap:14px;background:color-mix(in srgb,var(--blue) 4%,var(--paper))}.message-bubbles p{max-width:620px;margin:0;padding:16px 18px;border-radius:6px 20px 20px 20px;background:var(--panel);box-shadow:0 8px 20px #11162a12;line-height:1.6}.message-bubbles p.is-unread{box-shadow:inset 4px 0 var(--lime),0 8px 20px #11162a12}.message-bubbles small{display:block;margin-bottom:5px;color:var(--muted)}.message-channel footer{padding:14px 20px;color:var(--muted);font-size:11px}.message-channel footer i{margin-right:7px}.me-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:22px}.membership-card h2{margin:28px 0 8px;font:900 26px/1 Georgia,"Noto Serif SC",serif}.membership-card p,.preference-card p{color:var(--muted);line-height:1.55}.preference-card{display:flex;justify-content:space-between;gap:18px}.preference-card button{width:54px;height:32px;padding:3px;border:0;border-radius:999px;background:#b8b9bd;cursor:pointer}.preference-card button[aria-checked="true"]{background:var(--blue)}.preference-card button span{display:block;width:26px;height:26px;border-radius:50%;background:#fff;transition:transform .2s}.preference-card button[aria-checked="true"] span{transform:translateX(22px)}.artist-access{margin-top:16px;padding:24px;display:grid;grid-template-columns:62px minmax(0,1fr) auto;align-items:center;gap:18px;border:1px solid var(--line);border-radius:26px;background:var(--panel)}.artist-access__mark{width:62px;height:62px;display:grid;place-items:center;border-radius:22px;color:var(--ink);background:var(--lime);font-size:22px}.artist-access h2{margin:5px 0}.artist-access p{margin:0;color:var(--muted);line-height:1.5}.artist-access button{margin:0;color:#fff;background:var(--blue)}
.aster-nav{position:absolute;z-index:5;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(520px,calc(100% - 24px));height:60px;padding:5px;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid color-mix(in srgb,var(--line) 80%,transparent);border-radius:22px;background:color-mix(in srgb,var(--panel) 92%,transparent);box-shadow:0 15px 38px #11152b2b;backdrop-filter:blur(18px)}.aster-nav button{position:relative;min-width:0;border:0;border-radius:17px;color:var(--muted);background:transparent;cursor:pointer}.aster-nav button.is-active{color:#fff;background:var(--blue)}.aster-nav i,.aster-nav span{display:block}.aster-nav span{margin-top:3px;font-size:10px;font-weight:800}.aster-nav b{position:absolute;top:4px;right:calc(50% - 20px);width:17px;height:17px;display:grid;place-items:center;border-radius:50%;color:#10172f;background:var(--lime);font-size:9px}.post-detail{position:absolute;z-index:20;inset:0 0 0 auto;width:min(560px,100%);padding:calc(38px + env(safe-area-inset-top)) 34px 60px;box-sizing:border-box;overflow-y:auto;color:var(--ink);background:var(--panel);box-shadow:-20px 0 60px #0003}.post-detail>.icon-button{float:right}.post-detail>span{display:block;margin-top:80px;color:var(--blue-text);font-weight:900}.post-detail h2{font:900 34px/1.15 Georgia,"Noto Serif SC",serif}.post-detail p{font-size:15px;line-height:1.8}.post-detail small{display:block;margin-top:30px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);line-height:1.6}button:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
@media(max-width:680px){.aster-header{min-height:88px;padding:calc(34px + env(safe-area-inset-top)) 10px 10px}.aster-wordmark small,.consumer-badge{display:none}.aster-page{padding:16px 14px 100px}.aster-hero{min-height:410px;display:block;position:relative}.aster-hero__copy{position:relative;z-index:2;padding:28px}.aster-hero h1{font-size:50px}.aster-hero__portrait{position:absolute;right:-28px;bottom:-25px;width:210px;height:240px;opacity:.5}.aster-hero__portrait:before{width:190px;height:190px}.aster-hero__portrait b{font-size:78px}.aster-home-grid,.post-grid,.artist-layout,.me-grid{grid-template-columns:1fr}.schedule-ticket{display:block}.schedule-ticket small{display:block;margin-top:16px}.aster-section>header{display:block}.aster-section header small{display:block;margin-top:8px}.post-card__open{min-height:180px}.artist-layout{display:flex;flex-direction:column}.artist-profile{order:-1;min-height:280px}.message-channel>header{grid-template-columns:48px minmax(0,1fr)}.message-channel header button{grid-column:1/-1}.artist-access{grid-template-columns:52px minmax(0,1fr)}.artist-access__mark{width:52px;height:52px}.artist-access button{grid-column:1/-1;width:100%}.post-detail{padding-inline:22px}.post-detail h2{font-size:29px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
