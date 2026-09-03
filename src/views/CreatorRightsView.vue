<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { pushReturnTarget } from '../lib/navigation-return'
import { useCreatorRightsShellState } from '../composables/useCreatorRightsShellState'
import { CREATOR_RIGHTS_STATUS, CREATOR_RIGHTS_WORKS } from '../lib/creator-rights-shell-data'

const router = useRouter(); const route = useRoute(); const systemStore = useSystemStore(); const shell = useCreatorRightsShellState(); const selected = ref(null)
const isZh = computed(() => String(systemStore.settings.system.language || 'zh-CN').toLowerCase().startsWith('zh'))
const tx = (zh, en) => isZh.value ? zh : en
const lx = (record, key) => record?.[`${key}${isZh.value ? 'Zh' : 'En'}`] || ''
const money = (value) => new Intl.NumberFormat(isZh.value ? 'zh-CN' : 'en-US').format(value)
const yearlyWorks = computed(() => CREATOR_RIGHTS_WORKS.filter((work) => work.year === shell.selectedYear.value))
const statementTotal = computed(() => yearlyWorks.value.reduce((sum, work) => sum + work.statementAmount, 0))
</script>

<template>
  <main class="credo" data-testid="creator-rights-app">
    <header><button type="button" :aria-label="tx('返回', 'Back')" data-testid="creator-rights-back" @click="pushReturnTarget(router, route, '/home')"><i class="fas fa-chevron-left" /></button><div class="mark">C</div><div><b>{{ tx('谱权', 'CREDO') }}</b><small>{{ tx('创作者作品与权益台账', 'Creator works & rights desk') }}</small></div><span>{{ shell.selectedYear.value }}</span></header>
    <section v-if="shell.activeTab.value === 'desk'" class="page desk" data-testid="creator-rights-desk">
      <div class="mast"><small>{{ tx('个人创作案卷', 'PERSONAL CREATOR LEDGER') }}</small><h1>{{ tx('作品有出处，\n权益有脉络。', 'Trace the work.\nTrace the rights.') }}</h1><p>{{ tx('整理作品、参与角色、份额与结算单；认证仍由未来机构 owner 决定。', 'Organize works, roles, shares, and statements; certification remains with a future institution owner.') }}</p></div>
      <div class="ledger-summary"><article><span>{{ tx('收录作品', 'Works') }}</span><b>{{ CREATOR_RIGHTS_WORKS.length }}</b></article><article><span>{{ tx('待补材料', 'Need files') }}</span><b>01</b></article><article><span>{{ tx('可见结算', 'Visible statement') }}</span><b>₩{{ money(statementTotal) }}</b></article></div>
      <div class="section-title"><small>{{ tx('最近案卷', 'RECENT FILES') }}</small><h2>{{ tx('先看作品，再看权利', 'Work first, rights second') }}</h2></div>
      <div class="work-list"><button v-for="work in CREATOR_RIGHTS_WORKS" :key="work.id" type="button" :data-testid="`creator-work-${work.id}`" @click="selected = work"><span>{{ work.year }}</span><div><h3>{{ lx(work, 'title') }}</h3><p>{{ lx(work, 'type') }} · {{ lx(work, 'role') }}</p></div><em :class="CREATOR_RIGHTS_STATUS[work.status].tone">{{ tx(CREATOR_RIGHTS_STATUS[work.status].zh, CREATOR_RIGHTS_STATUS[work.status].en) }}</em><i class="fas fa-chevron-right" /></button></div>
    </section>
    <section v-else-if="shell.activeTab.value === 'works'" class="page" data-testid="creator-rights-works"><div class="section-title"><small>{{ tx('作品目录', 'WORKS CATALOG') }}</small><h1>{{ tx('我的创作记录', 'My work records') }}</h1></div><div class="catalog-grid"><article v-for="work in CREATOR_RIGHTS_WORKS" :key="work.id"><span>{{ work.year }} / {{ lx(work, 'type') }}</span><h2>{{ lx(work, 'title') }}</h2><p>{{ lx(work, 'role') }}</p><button type="button" :aria-pressed="shell.savedWorkIds.value.includes(work.id)" @click="shell.toggleSaved(work.id)"><i :class="shell.savedWorkIds.value.includes(work.id) ? 'fas fa-star' : 'far fa-star'" /> {{ tx('关注案卷', 'Watch file') }}</button></article></div></section>
    <section v-else-if="shell.activeTab.value === 'statements'" class="page" data-testid="creator-rights-statements"><div class="statement-head"><div><small>{{ tx('版税结算单', 'ROYALTY STATEMENTS') }}</small><h1>{{ shell.selectedYear.value }}</h1></div><select :value="shell.selectedYear.value" :aria-label="tx('年份', 'Year')" @change="shell.setYear($event.target.value)"><option>2026</option><option>2025</option></select></div><div class="statement-sheet"><div v-for="work in yearlyWorks" :key="work.id"><span>{{ lx(work, 'title') }}</span><b>{{ work.statementAmount ? `₩ ${money(work.statementAmount)}` : tx('待出单', 'Pending') }}</b></div><footer><span>{{ tx('当前可见合计', 'VISIBLE TOTAL') }}</span><b>₩ {{ money(statementTotal) }}</b></footer></div><p class="boundary">{{ tx('金额仅来自当前世界的固定预览资料；不代表版权归属、机构确认或真实入账。', 'Amounts come only from authored world-preview records; they do not prove ownership, institution approval, or payment.') }}</p></section>
    <section v-else class="page" data-testid="creator-rights-me"><div class="section-title"><small>{{ tx('年度申报草稿', 'ANNUAL DECLARATION DRAFT') }}</small><h1>{{ tx('整理后再递交', 'Prepare before submission') }}</h1></div><div class="declaration"><p>{{ tx('选择要纳入草稿的作品。首版只保存本机清单，不提交、不签名、不生成认证。', 'Choose works for a local draft. S1 does not submit, sign, or create certification.') }}</p><label v-for="work in CREATOR_RIGHTS_WORKS" :key="work.id"><input type="checkbox" :checked="shell.declarationDraft.value.workIds.includes(work.id)" @change="shell.toggleDeclarationWork(work.id)" /><span>{{ lx(work, 'title') }}</span></label><textarea :value="shell.declarationDraft.value.note" :placeholder="tx('补充说明', 'Notes')" @input="shell.updateDeclarationNote($event.target.value)" /><div><b>LOCAL DRAFT</b><span>{{ shell.declarationDraft.value.workIds.length }} {{ tx('项作品', 'works') }}</span></div></div></section>
    <nav><button v-for="tab in [{id:'desk',zh:'案头',en:'Desk',icon:'fas fa-landmark'},{id:'works',zh:'作品',en:'Works',icon:'fas fa-compact-disc'},{id:'statements',zh:'结算',en:'Statements',icon:'fas fa-receipt'},{id:'me',zh:'申报',en:'Declare',icon:'fas fa-file-signature'}]" :key="tab.id" type="button" :class="{ active: shell.activeTab.value === tab.id }" :data-testid="`creator-rights-tab-${tab.id}`" @click="shell.setActiveTab(tab.id)"><i :class="tab.icon" /><span>{{ tx(tab.zh, tab.en) }}</span></button></nav>
    <aside v-if="selected" data-testid="creator-rights-detail"><button type="button" :aria-label="tx('关闭', 'Close')" @click="selected = null"><i class="fas fa-xmark" /></button><small>{{ selected.year }} · {{ lx(selected, 'type') }}</small><h1>{{ lx(selected, 'title') }}</h1><p>{{ lx(selected, 'role') }}</p><h2>{{ tx('权利份额记录', 'Rights-share record') }}</h2><div class="share-bar"><i v-for="share in selected.shares" :key="share.nameEn" :style="{ width: `${share.share}%` }" /></div><ul><li v-for="share in selected.shares" :key="share.nameEn"><span>{{ lx(share, 'name') }} · {{ lx(share, 'role') }}</span><b>{{ share.share }}%</b></li></ul><div class="boundary"><i class="fas fa-shield-halved" />{{ tx('这是固定资料的只读预览，不授予版权、不改变份额，也不代表机构认证。', 'This read-only authored preview grants no copyright, changes no shares, and proves no institution credential.') }}</div></aside>
  </main>
</template>

<style scoped>
.credo {
  --paper: #f5f2e9;
  --ink: #1f2a3d;
  --muted: #5b6472;
  --line: #d9d4c5;
  --panel: #fdfcf7;
  --navy: #25406b;
  --gold: #b78a39;
  --gold-ink: #8a6522;
  --gold-on-navy: #d9b25f;
  --seal: #a3442e;
  position: relative;
  height: 100%;
  overflow: hidden;
  color: var(--ink);
  background: var(--paper);
  font-family: "Avenir Next", "Noto Sans CJK SC", sans-serif;
}

.credo > header {
  height: 86px;
  padding: calc(24px + env(safe-area-inset-top)) 24px 10px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 42px 42px 1fr auto;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--line);
}

header button,
aside > button {
  width: 40px;
  height: 40px;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: inherit;
  background: var(--panel);
  transition: border-color 160ms ease, background 160ms ease;
}

header .mark {
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--paper);
  background: var(--navy);
  font: 900 24px/1 Georgia, serif;
  box-shadow: inset 0 0 0 3px var(--paper), inset 0 0 0 4px var(--gold);
}

header b,
header small {
  display: block;
}

header small {
  color: var(--muted);
  font-size: 9px;
}

header > span {
  font: 900 20px/1 Georgia, serif;
  color: var(--navy);
}

.page {
  height: calc(100% - 86px);
  padding: 30px 30px 110px;
  box-sizing: border-box;
  overflow-y: auto;
}

.mast {
  padding: 42px;
  color: #f4f6fa;
  border-radius: 4px 24px 4px 4px;
  background: linear-gradient(150deg, #22375c 0%, #2c4a7a 58%, #3a5c8f 100%);
  box-shadow: 0 20px 48px rgba(31, 42, 61, 0.22);
}

.mast small,
.section-title small,
.statement-head small {
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .16em;
  color: var(--gold-ink);
}

.mast small {
  color: var(--gold-on-navy);
}

.mast h1 {
  margin: 16px 0;
  white-space: pre-line;
  font: 900 48px/.98 Georgia, "Noto Serif CJK SC", serif;
  color: #f4f6fa;
}

.mast p {
  max-width: 620px;
  color: #c3cede;
  line-height: 1.6;
}

.ledger-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--line);
  background: var(--panel);
}

.ledger-summary article {
  padding: 20px;
  border-right: 1px solid var(--line);
}

.ledger-summary article:last-child {
  border-right: 0;
}

.ledger-summary span,
.ledger-summary b {
  display: block;
}

.ledger-summary span {
  color: var(--muted);
  font-size: 9px;
}

.ledger-summary b {
  margin-top: 13px;
  font: 900 28px/1 Georgia, serif;
  color: var(--navy);
}

.ledger-summary article:last-child b {
  color: var(--gold-ink);
}

.section-title {
  margin: 32px 0 14px;
}

.section-title h1,
.section-title h2 {
  margin: 7px 0;
  font: 900 34px/1 Georgia, "Noto Serif CJK SC", serif;
}

.work-list {
  border-top: 2px solid var(--ink);
}

.work-list button {
  width: 100%;
  min-height: 88px;
  padding: 13px 8px;
  display: grid;
  grid-template-columns: 55px minmax(0, 1fr) auto 24px;
  align-items: center;
  gap: 12px;
  border: 0;
  border-bottom: 1px solid var(--line);
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 160ms ease;
}

.work-list button:hover {
  background: color-mix(in srgb, var(--gold) 6%, transparent);
}

.work-list button > span {
  font: 900 18px/1 Georgia, serif;
  color: var(--navy);
}

.work-list h3 {
  margin: 0;
  font-size: 18px;
}

.work-list p {
  margin: 5px 0 0;
  color: var(--muted);
}

.work-list em {
  padding: 5px 7px;
  font-size: 9px;
  font-style: normal;
}

.ready {
  color: #2f6449;
  background: #dcebe0;
}

.attention {
  color: #8a4d22;
  background: #f4e0c8;
}

.pending {
  color: #4d5670;
  background: #e3e6ee;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.catalog-grid article {
  min-height: 220px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  background: var(--panel);
  transition: border-color 160ms ease, transform 180ms ease;
}

.catalog-grid article:hover {
  border-color: var(--gold);
  transform: translateY(-2px);
}

.catalog-grid article > span {
  font-size: 9px;
  letter-spacing: .1em;
  color: var(--muted);
}

.catalog-grid h2 {
  margin: 28px 0 8px;
  font: 900 27px/1 Georgia, "Noto Serif CJK SC", serif;
}

.catalog-grid p {
  color: var(--muted);
}

.catalog-grid button {
  margin-top: auto;
  min-height: 40px;
  border: 1px solid var(--line);
  color: inherit;
  background: transparent;
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease;
}

.catalog-grid button:hover {
  border-color: var(--navy);
  color: var(--navy);
}

.statement-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
}

.statement-head h1 {
  margin: 4px 0;
  font: 900 64px/1 Georgia, serif;
  color: var(--navy);
}

.statement-head select {
  height: 42px;
  border: 1px solid var(--line);
  color: inherit;
  background: var(--panel);
}

.statement-sheet {
  margin-top: 22px;
  padding: 28px;
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: 0 12px 32px rgba(31, 42, 61, 0.08);
}

.statement-sheet > div,
.statement-sheet footer {
  padding: 16px 0;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed var(--line);
}

.statement-sheet footer {
  margin-top: 18px;
  border: 0;
}

.statement-sheet footer b {
  font: 900 27px/1 Georgia, serif;
  color: var(--gold-ink);
}

.boundary {
  padding: 14px;
  color: var(--muted);
  background: color-mix(in srgb, var(--gold) 12%, var(--panel));
  line-height: 1.55;
}

.declaration {
  max-width: 720px;
  padding: 25px;
  border: 1px solid var(--line);
  background: var(--panel);
}

.declaration > p {
  color: var(--muted);
  line-height: 1.6;
}

.declaration label {
  padding: 13px 0;
  display: flex;
  gap: 12px;
  border-bottom: 1px solid var(--line);
}

.declaration textarea {
  width: 100%;
  min-height: 100px;
  margin: 18px 0;
  padding: 12px;
  box-sizing: border-box;
  border: 1px solid var(--line);
  color: inherit;
  background: var(--paper);
}

.declaration > div {
  display: flex;
  justify-content: space-between;
}

.declaration > div b {
  color: var(--gold-ink);
  letter-spacing: .12em;
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
  border-radius: 6px;
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  backdrop-filter: blur(16px);
  box-shadow: 0 14px 34px rgba(31, 42, 61, 0.14);
}

nav button {
  border: 0;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  transition: color 160ms ease, background 160ms ease;
}

nav button.active {
  color: #f4f6fa;
  background: var(--navy);
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
  width: min(590px, 100%);
  padding: calc(110px + env(safe-area-inset-top)) 42px 60px;
  box-sizing: border-box;
  overflow-y: auto;
  color: var(--ink);
  background: var(--panel);
  border-left: 1px solid var(--line);
  box-shadow: -25px 0 70px rgba(31, 42, 61, 0.22);
  animation: credo-detail-in 220ms ease both;
}

@keyframes credo-detail-in {
  from { transform: translateX(22px); opacity: 0; }
  to { transform: none; opacity: 1; }
}

aside > button {
  position: absolute;
  right: 20px;
  top: calc(28px + env(safe-area-inset-top));
}

aside > small {
  letter-spacing: .14em;
  color: var(--gold-ink);
  font-weight: 950;
}

aside h1 {
  font: 900 46px/1 Georgia, "Noto Serif CJK SC", serif;
}

aside h2 {
  margin-top: 40px;
  font-family: Georgia, "Noto Serif CJK SC", serif;
}

.share-bar {
  height: 18px;
  display: flex;
  background: var(--line);
}

.share-bar i:nth-child(1) {
  background: var(--navy);
}

.share-bar i:nth-child(2) {
  background: var(--gold);
}

.share-bar i:nth-child(3) {
  background: #7d8ba1;
}

aside ul {
  padding: 0;
  list-style: none;
}

aside li {
  padding: 13px 0;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}

aside li b {
  font-family: Georgia, serif;
  color: var(--navy);
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 3px solid #d6b66f;
  outline-offset: 2px;
}

@media (max-width: 700px) {
  .credo > header { height: 82px; padding: calc(28px + env(safe-area-inset-top)) 10px 8px; }
  .page { height: calc(100% - 82px); padding: 15px 13px 100px; }
  .mast { padding: 28px; }
  .mast h1 { font-size: 40px; }
  .ledger-summary { grid-template-columns: 1fr; }
  .ledger-summary article { border-right: 0; border-bottom: 1px solid var(--line); }
  .work-list button { grid-template-columns: 44px minmax(0, 1fr) 22px; }
  .work-list em { grid-column: 2; }
  .catalog-grid { grid-template-columns: 1fr; }
  .statement-sheet { padding: 17px; }
  aside { padding: 100px 21px 60px; }
  aside h1 { font-size: 38px; }
}

@media (prefers-reduced-motion: reduce) {
  .credo *,
  .credo *::before,
  .credo *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
