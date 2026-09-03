<script setup>
import {computed,ref} from 'vue';import{useRoute,useRouter}from'vue-router';import{useSystemStore}from'../stores/system';import{pushReturnTarget}from'../lib/navigation-return';import{CAREER_LISTINGS,getCareerListing}from'../lib/career-shell-data';import{useCareerShellState}from'../composables/useCareerShellState'
const router=useRouter(),route=useRoute(),systemStore=useSystemStore(),shell=useCareerShellState(),selected=ref(null),note=ref(''),filter=ref('all');const zh=computed(()=>String(systemStore.settings.system.language||'zh-CN').toLowerCase().startsWith('zh')),tx=(a,b)=>zh.value?a:b,lx=(o,k)=>o?.[`${k}${zh.value?'Zh':'En'}`]||'';const visible=computed(()=>CAREER_LISTINGS.filter(x=>filter.value==='all'||x.kind===filter.value));const drafts=computed(()=>shell.applicationDrafts.value.map(d=>({...d,listing:getCareerListing(d.listingId)})).filter(x=>x.listing));const open=x=>{selected.value=x;note.value=shell.applicationDrafts.value.find(d=>d.listingId===x.id)?.materialNote||''};const save=()=>{if(shell.saveApplicationDraft({listingId:selected.value?.id,materialNote:note.value}).ok)selected.value=null}
</script>
<template><main class="next" data-testid="career-app"><header><button type="button" :aria-label="tx('返回','Back')" data-testid="career-back" @click="pushReturnTarget(router,route,'/home')"><i class="fas fa-chevron-left"/></button><div class="wordmark">N<span>EXT</span></div><div><b>{{tx('机会','NEXT')}}</b><small>{{tx('工作、试镜与职业邀约','Work, auditions & invitations')}}</small></div><em>{{shell.applicationDrafts.value.length}}</em></header>
<section v-if="shell.activeTab.value==='discover'" class="page" data-testid="career-discover"><div class="hero"><small>{{tx('下一次可能','YOUR NEXT POSSIBILITY')}}</small><h1>{{tx('不是所有机会，\n都要立刻答应。','Not every opening\nneeds an instant yes.')}}</h1><p>{{tx('先了解岗位、试镜与邀约，再准备一份属于你的申请草稿。','Read the role, audition, or invitation first; prepare your own draft after.') }}</p></div><div class="filters"><button v-for="f in [{id:'all',zh:'全部',en:'All'},{id:'job',zh:'工作',en:'Jobs'},{id:'audition',zh:'试镜',en:'Auditions'},{id:'invite',zh:'邀约',en:'Invites'}]" :key="f.id" type="button" :class="{active:filter===f.id}" @click="filter=f.id">{{tx(f.zh,f.en)}}</button></div><div class="listings"><article v-for="item in visible" :key="item.id"><button type="button" :data-testid="`career-listing-${item.id}`" @click="open(item)"><span>{{item.deadline.slice(5).replace('-','.')}}</span><div><small>{{lx(item,'org')}} · {{lx(item,'location')}}</small><h2>{{lx(item,'title')}}</h2><p>{{lx(item,'summary')}}</p><div><b v-for="tag in (zh?item.tagsZh:item.tagsEn)" :key="tag">{{tag}}</b></div></div><em :class="item.status">{{lx(item,'status')}}</em></button><button type="button" :aria-label="tx('收藏机会','Save opportunity')" :aria-pressed="shell.savedListingIds.value.includes(item.id)" @click="shell.toggleSaved(item.id)"><i :class="shell.savedListingIds.value.includes(item.id)?'fas fa-bookmark':'far fa-bookmark'"/></button></article></div></section>
<section v-else-if="shell.activeTab.value==='saved'" class="page" data-testid="career-saved"><div class="title"><small>{{tx('稍后再看','SAVED FOR LATER')}}</small><h1>{{tx('我留下的机会','Opportunities I kept')}}</h1></div><div v-if="shell.savedListingIds.value.length" class="saved-grid"><button v-for="id in shell.savedListingIds.value" :key="id" type="button" @click="open(getCareerListing(id))"><small>{{lx(getCareerListing(id),'org')}}</small><h2>{{lx(getCareerListing(id),'title')}}</h2><span>{{getCareerListing(id).deadline}}</span></button></div><div v-else class="empty"><i class="far fa-bookmark"/><h2>{{tx('还没有收藏','Nothing saved yet')}}</h2></div></section>
<section v-else-if="shell.activeTab.value==='applications'" class="page" data-testid="career-applications"><div class="title"><small>{{tx('申请草稿','APPLICATION DRAFTS')}}</small><h1>{{tx('还没有递交的材料','Prepared, not submitted')}}</h1><p>{{tx('这里没有录用、面试确认或机构收件结果。','There is no hiring, interview confirmation, or institution receipt here.')}}</p></div><div class="drafts"><article v-for="row in drafts" :key="row.listingId"><span>LOCAL</span><div><small>{{lx(row.listing,'org')}}</small><h2>{{lx(row.listing,'title')}}</h2><p>{{row.materialNote||tx('未写材料说明','No material note')}}</p></div><button type="button" :aria-label="tx('删除草稿','Delete draft')" @click="shell.removeApplicationDraft(row.listingId)"><i class="fas fa-trash-can"/></button></article></div></section>
<section v-else class="page" data-testid="career-profile"><div class="title"><small>{{tx('职业名片草稿','CAREER CARD DRAFT')}}</small><h1>{{tx('让机会知道你是谁','A short way to say who you are')}}</h1></div><div class="profile-card"><span>NEXT / LOCAL PROFILE</span><textarea :value="shell.profileDraft.value.headline" :placeholder="tx('例如：独立制作人，擅长流行编曲与声乐指导','e.g. Independent producer focused on pop arrangement and vocal direction')" @input="shell.updateProfile({headline:$event.target.value})"/><p>{{tx('这不是 Self Profile、公司认证或公开简历，只是本机申请材料草稿。','This is not Self Profile, an organization credential, or a public résumé; it is a local application note.')}}</p></div></section>
<nav><button v-for="tab in [{id:'discover',zh:'发现',en:'Discover',icon:'fas fa-compass'},{id:'saved',zh:'收藏',en:'Saved',icon:'fas fa-bookmark'},{id:'applications',zh:'申请',en:'Drafts',icon:'fas fa-folder'},{id:'profile',zh:'名片',en:'Profile',icon:'fas fa-address-card'}]" :key="tab.id" type="button" :class="{active:shell.activeTab.value===tab.id}" :data-testid="`career-tab-${tab.id}`" @click="shell.setActiveTab(tab.id)"><i :class="tab.icon"/><span>{{tx(tab.zh,tab.en)}}</span></button></nav>
<aside v-if="selected" data-testid="career-detail"><button type="button" :aria-label="tx('关闭','Close')" @click="selected=null"><i class="fas fa-xmark"/></button><small>{{lx(selected,'org')}} · {{selected.deadline}}</small><h1>{{lx(selected,'title')}}</h1><p>{{lx(selected,'summary')}}</p><div class="tag-row"><b v-for="tag in (zh?selected.tagsZh:selected.tagsEn)" :key="tag">{{tag}}</b></div><template v-if="selected.status==='open'"><label><span>{{tx('材料说明','Material note')}}</span><textarea v-model="note" :placeholder="tx('准备提交哪些材料？','What would you prepare?')"/></label><p class="boundary">{{tx('保存后只形成本机申请草稿；不投递、不联系机构、不创建面试或日历安排。','Saving creates only a local application draft; it does not contact the institution or create an interview or Calendar item.')}}</p><button class="save" type="button" data-testid="career-save-draft" @click="save">{{tx('保存申请草稿','Save application draft')}}</button></template><div v-else class="closed" data-testid="career-closed"><i class="fas fa-lock"/><h2>{{lx(selected,'status')}}</h2><p>{{selected.status==='invite_only'?tx('没有机构邀约凭证时绝不放行。','Without an institution invitation credential, access stays closed.'):tx('旧职位资料不能建立申请。','A stale listing cannot create an application.')}}</p></div></aside>
</main></template>
<style scoped>
.next {
  --bg: #f4f6fa;
  --paper: #ffffff;
  --ink: #1a1f2c;
  --muted: #5f6672;
  --line: #e2e7ef;
  --blue: #1f53d6;
  --blue-strong: #1a46b5;
  --coral: #f4553f;
  position: relative;
  height: 100%;
  overflow: hidden;
  color: var(--ink);
  background: var(--bg);
  font-family: "Avenir Next", "Noto Sans CJK SC", sans-serif;
}

.next > header {
  height: 86px;
  padding: calc(24px + env(safe-area-inset-top)) 22px 10px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 42px 62px 1fr auto;
  align-items: center;
  gap: 11px;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}

header > button,
aside > button {
  width: 40px;
  height: 40px;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: inherit;
  background: var(--paper);
  transition: border-color 160ms ease;
}

.wordmark {
  font: 950 27px/1 "Avenir Next", "Noto Sans CJK SC", sans-serif;
  color: var(--coral);
  letter-spacing: -.02em;
}

.wordmark span {
  font-size: 11px;
  color: var(--ink);
  letter-spacing: .04em;
}

header b,
header small {
  display: block;
}

header small {
  color: var(--muted);
  font-size: 9px;
}

header em {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--blue);
  font-style: normal;
}

.page {
  height: calc(100% - 86px);
  padding: 28px 30px 110px;
  box-sizing: border-box;
  overflow-y: auto;
}

.hero {
  min-height: 265px;
  padding: 42px;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 20px;
  color: var(--ink);
  background:
    radial-gradient(circle at 92% 8%, rgba(47, 107, 255, 0.12), transparent 42%),
    linear-gradient(140deg, #ffffff 0%, #eef3fe 100%);
  box-shadow: 0 16px 42px rgba(31, 83, 214, 0.1);
}

.hero small,
.title small {
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .17em;
  color: var(--blue);
}

.hero h1 {
  margin: 16px 0;
  white-space: pre-line;
  font: 850 48px/1.02 "Avenir Next", "Noto Sans CJK SC", sans-serif;
  letter-spacing: -.03em;
}

.hero p {
  max-width: 600px;
  color: var(--muted);
  line-height: 1.6;
}

.filters {
  margin: 18px 0;
  display: flex;
  gap: 7px;
  overflow-x: auto;
}

.filters button {
  min-height: 38px;
  padding: 0 17px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: inherit;
  background: var(--paper);
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
}

.filters button.active {
  color: #fff;
  border-color: var(--blue);
  background: var(--blue);
}

.listings {
  display: grid;
  gap: 10px;
}

.listings article {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 180ms ease;
}

.listings article:hover {
  border-color: #c9d6f6;
  box-shadow: 0 12px 30px rgba(31, 83, 214, 0.09);
  transform: translateY(-1px);
}

.listings article > button:first-child {
  width: 100%;
  min-height: 145px;
  padding: 18px;
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr) auto;
  gap: 17px;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.listings article > button:first-child > span {
  font: 850 20px/1 "Avenir Next", sans-serif;
  color: var(--coral);
}

.listings h2 {
  margin: 8px 0;
  font: 800 24px/1.15 "Avenir Next", "Noto Sans CJK SC", sans-serif;
  letter-spacing: -.01em;
}

.listings p,
.listings small {
  color: var(--muted);
}

.listings div div {
  display: flex;
  gap: 5px;
}

.listings div div b,
.tag-row b {
  padding: 5px 7px;
  border-radius: 6px;
  background: var(--bg);
  font-size: 9px;
}

.listings em {
  font-size: 9px;
  font-style: normal;
}

.listings em.open {
  color: var(--blue-strong);
}

.listings em.source_stale {
  color: #7a6478;
}

.listings em.invite_only {
  color: var(--coral);
}

.listings article > button:last-child {
  position: absolute;
  right: 11px;
  bottom: 10px;
  width: 38px;
  height: 38px;
  border: 0;
  color: var(--coral);
  background: transparent;
  cursor: pointer;
}

.title {
  margin: 20px 0 28px;
}

.title h1 {
  margin: 8px 0;
  font: 850 40px/1.05 "Avenir Next", "Noto Sans CJK SC", sans-serif;
  letter-spacing: -.02em;
}

.title p {
  color: var(--muted);
}

.saved-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.saved-grid button {
  min-height: 180px;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 14px;
  color: inherit;
  background: var(--paper);
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, transform 180ms ease;
}

.saved-grid button:hover {
  border-color: #c9d6f6;
  transform: translateY(-1px);
}

.saved-grid h2 {
  font: 800 27px/1.1 "Avenir Next", "Noto Sans CJK SC", sans-serif;
}

.saved-grid span,
.saved-grid small {
  color: var(--muted);
}

.empty {
  margin: 70px auto;
  text-align: center;
}

.empty > i {
  font-size: 50px;
  color: var(--coral);
}

.drafts {
  display: grid;
  gap: 10px;
}

.drafts article {
  display: grid;
  grid-template-columns: 70px 1fr 48px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: var(--paper);
}

.drafts article > span {
  height: 100%;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--blue);
  font-size: 9px;
  writing-mode: vertical-rl;
}

.drafts article > div {
  padding: 18px;
}

.drafts h2 {
  margin: 6px 0;
}

.drafts p,
.drafts small {
  color: var(--muted);
}

.drafts button {
  border: 0;
  color: var(--coral);
  background: transparent;
  cursor: pointer;
}

.profile-card {
  max-width: 680px;
  padding: 30px;
  border-radius: 18px;
  color: #fff;
  background: linear-gradient(140deg, #1f53d6 0%, #1a46b5 60%, #143792 100%);
  box-shadow: 0 20px 48px rgba(31, 83, 214, 0.28);
}

.profile-card > span {
  font-size: 9px;
  letter-spacing: .15em;
}

.profile-card textarea {
  width: 100%;
  min-height: 130px;
  margin: 28px 0;
  padding: 15px;
  box-sizing: border-box;
  border: 1px solid #ffffff44;
  border-radius: 12px;
  color: #fff;
  background: #ffffff14;
  font: 800 20px/1.5 inherit;
}

.profile-card p {
  color: #dfe6fb;
  line-height: 1.6;
}

nav {
  position: absolute;
  left: 50%;
  bottom: calc(10px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(520px, calc(100% - 24px));
  height: 62px;
  padding: 5px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid var(--line);
  border-radius: 16px;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: blur(16px);
  box-shadow: 0 14px 34px rgba(31, 83, 214, 0.1);
}

nav button {
  border: 0;
  border-radius: 12px;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  transition: color 160ms ease, background 160ms ease;
}

nav button.active {
  color: #fff;
  background: var(--blue);
}

nav i,
nav span {
  display: block;
}

nav span {
  margin-top: 4px;
  font-size: 9px;
}

aside {
  position: absolute;
  z-index: 20;
  inset: 0 0 0 auto;
  width: min(610px, 100%);
  padding: calc(110px + env(safe-area-inset-top)) 40px 60px;
  box-sizing: border-box;
  overflow-y: auto;
  color: var(--ink);
  background: var(--paper);
  border-left: 1px solid var(--line);
  box-shadow: -25px 0 70px rgba(26, 31, 44, 0.18);
  animation: next-detail-in 220ms ease both;
}

@keyframes next-detail-in {
  from { transform: translateX(22px); opacity: 0; }
  to { transform: none; opacity: 1; }
}

aside > button {
  position: absolute;
  right: 18px;
  top: calc(28px + env(safe-area-inset-top));
}

aside > small {
  letter-spacing: .1em;
  color: var(--blue);
  font-weight: 900;
}

aside h1 {
  font: 850 43px/1.02 "Avenir Next", "Noto Sans CJK SC", sans-serif;
  letter-spacing: -.02em;
}

aside > p {
  color: var(--muted);
  line-height: 1.65;
}

.tag-row {
  display: flex;
  gap: 6px;
  margin: 22px 0;
}

aside label span {
  display: block;
  margin-bottom: 7px;
  font-size: 10px;
  font-weight: 900;
}

aside textarea {
  width: 100%;
  min-height: 110px;
  padding: 12px;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: inherit;
  background: var(--bg);
}

.boundary {
  padding: 13px;
  border-radius: 10px;
  background: var(--bg);
  color: var(--muted);
}

.save {
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: var(--blue);
  font-weight: 900;
  cursor: pointer;
  transition: background 160ms ease, transform 120ms ease;
}

.save:hover {
  background: var(--blue-strong);
}

.save:active {
  transform: scale(.99);
}

.closed {
  margin-top: 28px;
  padding: 30px;
  border-radius: 12px;
  background: var(--bg);
  text-align: center;
}

.closed > i {
  font-size: 35px;
  color: var(--muted);
}

button:focus-visible,
textarea:focus-visible {
  outline: 3px solid #9db8ff;
  outline-offset: 2px;
}

@media (max-width: 700px) {
  .next > header { height: 82px; padding: calc(28px + env(safe-area-inset-top)) 10px 8px; }
  .page { height: calc(100% - 82px); padding: 14px 12px 100px; }
  .hero { min-height: 330px; padding: 28px; }
  .hero h1 { font-size: 40px; }
  .listings article > button:first-child { grid-template-columns: 46px minmax(0, 1fr); }
  .listings em { grid-column: 2; }
  .saved-grid { grid-template-columns: 1fr; }
  .drafts article { grid-template-columns: 55px 1fr 42px; }
  aside { padding: 100px 20px 60px; }
  aside h1 { font-size: 36px; }
}

@media (prefers-reduced-motion: reduce) {
  .next *,
  .next *::before,
  .next *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
