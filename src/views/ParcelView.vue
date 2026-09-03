<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { pushReturnTarget } from '../lib/navigation-return'
import { PARCEL_SHIPMENTS } from '../lib/parcel-shell-data'
import { useParcelShellState } from '../composables/useParcelShellState'

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const shell = useParcelShellState()
const query = ref('')
const selected = ref(null)
// POSTA is an independent app with a fixed postal-counter identity: it never
// follows the system day/night switch (independent-app rule).
const isZh = computed(() =>
  String(systemStore.settings.system.language || 'zh-CN').toLowerCase().startsWith('zh'),
)
const tx = (zh, en) => (isZh.value ? zh : en)
const lx = (o, k) => o?.[k + (isZh.value ? 'Zh' : 'En')] || ''
const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q
    ? PARCEL_SHIPMENTS.filter((x) =>
        [x.code, x.titleZh, x.titleEn, x.senderZh, x.senderEn].some((v) =>
          String(v).toLowerCase().includes(q),
        ),
      )
    : PARCEL_SHIPMENTS
})
const STATUS_ICONS = {
  delivered: 'fas fa-check',
  pickup_ready: 'fas fa-box-open',
  in_transit: 'fas fa-truck-fast',
  source_stale: 'fas fa-ban',
}
const statusIcon = (status) => STATUS_ICONS[status] || 'fas fa-truck-fast'
const onDetailKeydown = (event) => { if (event.key === 'Escape' && selected.value) selected.value = null }
onMounted(() => window.addEventListener('keydown', onDetailKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onDetailKeydown))
</script>
<template>
<main class="posta" data-testid="parcel-app">
<header>
<button class="back" type="button" :aria-label="tx('返回','Back')" data-testid="parcel-back" @click="pushReturnTarget(router,route,'/home')"><i class="fas fa-chevron-left" aria-hidden="true"/></button>
<div class="logo"><i class="fas fa-box" aria-hidden="true"/></div>
<div class="brand"><b>{{tx('递送','POSTA')}}</b><small>{{tx('包裹与寄件服务','Parcel & sending service')}}</small></div>
<span v-if="shell.pinnedShipmentIds.value.length" class="pinned-count">{{shell.pinnedShipmentIds.value.length}}</span>
</header>
<section v-if="shell.activeTab.value==='track'" class="page" data-testid="parcel-track">
<div class="hero">
<div class="hero-head"><small>{{tx('包裹板','PARCEL BOARD')}}</small><i class="fas fa-arrow-down-long" aria-hidden="true"/></div>
<h1>{{tx('每一件东西，\n都有来路。','Every parcel\nhas a trail.')}}</h1>
<i class="barcode" aria-hidden="true"/>
</div>
<label class="search"><i class="fas fa-magnifying-glass" aria-hidden="true"/><input v-model="query" data-testid="parcel-search" :placeholder="tx('运单号、物品或寄件方','Tracking code, item, or sender')"/></label>
<div class="shipments">
<button v-for="item in results" :key="item.id" type="button" :data-testid="'parcel-shipment-' + item.id" @click="selected=item">
<div class="status" :class="item.status"><i :class="statusIcon(item.status)" aria-hidden="true"/><span>{{lx(item,'status')}}</span></div>
<div class="shipment-info"><small>{{item.code}} · {{lx(item,'sender')}}</small><h2>{{lx(item,'title')}}</h2><p>{{lx(item,'last')}}</p></div>
<strong class="eta">{{lx(item,'eta')}}</strong>
</button>
</div>
</section>
<section v-else-if="shell.activeTab.value==='send'" class="page" data-testid="parcel-send">
<div class="title"><small>{{tx('寄件草稿','SEND DRAFT')}}</small><h1>{{tx('先把寄件信息准备好','Prepare the send details')}}</h1><p>{{tx('只保存本机草稿，不创建运单、不计费、不预约取件。','This saves only a local draft; it creates no label, quote, or pickup booking.')}}</p></div>
<div class="send-form">
<label><span>{{tx('收件人','Recipient')}}</span><input :value="shell.sendDraft.value.recipient" @input="shell.updateSendDraft({recipient:$event.target.value})"/></label>
<label><span>{{tx('地址标签','Address label')}}</span><input :value="shell.sendDraft.value.addressLabel" :placeholder="tx('例如：工作室 / 家','e.g. Studio / Home')" @input="shell.updateSendDraft({addressLabel:$event.target.value})"/></label>
<div class="type-row">
<button type="button" :class="{active:shell.sendDraft.value.itemType==='parcel'}" @click="shell.updateSendDraft({itemType:'parcel'})"><i class="fas fa-box" aria-hidden="true"/>{{tx('包裹','Parcel')}}</button>
<button type="button" :class="{active:shell.sendDraft.value.itemType==='document'}" @click="shell.updateSendDraft({itemType:'document'})"><i class="fas fa-envelope" aria-hidden="true"/>{{tx('文件','Document')}}</button>
</div>
<label><span>{{tx('备注','Note')}}</span><textarea :value="shell.sendDraft.value.note" @input="shell.updateSendDraft({note:$event.target.value})"/></label>
<footer><b>LOCAL DRAFT</b><span>{{tx('尚未生成运单','No shipping label created')}}</span></footer>
</div>
</section>
<section v-else-if="shell.activeTab.value==='inbox'" class="page" data-testid="parcel-inbox">
<div class="title"><small>{{tx('递送消息','DELIVERY INBOX')}}</small><h1>{{tx('只看与包裹有关的消息','Only parcel-related updates')}}</h1></div>
<div class="inbox">
<article><i class="fas fa-box-open" aria-hidden="true"/><div><b>{{tx('自提件已入柜','Pickup parcel is ready')}}</b><p>{{tx('录音棚线材包已到圣水自提柜。','The studio cable kit is at the Seongsu locker.')}}</p></div><span>16:20</span></article>
<article><i class="fas fa-triangle-exclamation" aria-hidden="true"/><div><b>{{tx('一条来源已失效','One source has expired')}}</b><p>{{tx('海外样品包需要未来物流 owner 刷新。','The overseas sample needs a future logistics owner refresh.')}}</p></div><span>09:05</span></article>
</div>
</section>
<section v-else class="page" data-testid="parcel-me">
<div class="title"><small>{{tx('我的递送','MY POSTA')}}</small><h1>{{tx('常用选择','Everyday preferences')}}</h1></div>
<article class="toggle"><div><b>{{tx('自提提醒偏好','Pickup reminder preference')}}</b><p>{{tx('首版只记录偏好，不发送系统通知。','S1 records only a preference and sends no system notification.')}}</p></div><button type="button" role="switch" :aria-checked="shell.pickupReminderEnabled.value" @click="shell.togglePickupReminder"><span/></button></article>
</section>
<nav>
<button v-for="tab in [{id:'track',zh:'查件',en:'Track',icon:'fas fa-location-crosshairs'},{id:'send',zh:'寄件',en:'Send',icon:'fas fa-paper-plane'},{id:'inbox',zh:'消息',en:'Inbox',icon:'fas fa-inbox'},{id:'me',zh:'我的',en:'Me',icon:'fas fa-user'}]" :key="tab.id" type="button" :class="{active:shell.activeTab.value===tab.id}" :data-testid="'parcel-tab-' + tab.id" @click="shell.setActiveTab(tab.id)"><i :class="tab.icon" aria-hidden="true"/><span>{{tx(tab.zh,tab.en)}}</span></button>
</nav>
<aside v-if="selected" role="dialog" :aria-label="tx('包裹详情','Parcel details')" data-testid="parcel-detail">
<button class="close" type="button" :aria-label="tx('关闭','Close')" @click="selected=null"><i class="fas fa-xmark" aria-hidden="true"/></button>
<div class="waybill-head"><small>{{selected.code}}</small><span class="stamp" :class="selected.status">{{lx(selected,'status')}}</span></div>
<h1>{{lx(selected,'title')}}</h1>
<div class="track-line"><div class="track-node"><i class="is-done" aria-hidden="true"/><small>{{tx('寄出','SENT')}}</small><b>{{lx(selected,'sender')}}</b></div><span class="track-link" aria-hidden="true"></span><div class="track-node"><i class="is-current" aria-hidden="true"/><small>{{tx('当前','NOW')}}</small><b>{{lx(selected,'status')}}</b></div><span class="track-link" aria-hidden="true"></span><div class="track-node"><i aria-hidden="true"/><small>{{tx('预计','ETA')}}</small><b>{{lx(selected,'eta')}}</b></div></div>
<h2>{{lx(selected,'status')}}</h2>
<p>{{lx(selected,'last')}}</p>
<b class="eta-line">{{lx(selected,'eta')}}</b>
<div v-if="selected.mapPlaceId" class="map-ref"><i class="fas fa-map-location-dot" aria-hidden="true"/><span>{{tx('引用现有 Map 地点','References existing Map place')}}</span><small>{{selected.mapPlaceId}} · READ ONLY</small></div>
<button class="pin" type="button" :aria-pressed="shell.pinnedShipmentIds.value.includes(selected.id)" @click="shell.togglePinned(selected.id)"><i class="fas fa-thumbtack" aria-hidden="true"/>{{shell.pinnedShipmentIds.value.includes(selected.id)?tx('取消置顶','Unpin'):tx('置顶包裹','Pin parcel')}}</button>
<p class="boundary">{{tx('固定物流记录仅供壳子预览；不会创建签收、改地址、退款、Map 路线或事件完成结果。','Authored tracking records are preview-only; they create no delivery proof, address change, refund, Map route, or event result.')}}</p>
</aside>
</main>
</template>
<style scoped>
.posta{--bg:#f3eee2;--paper:#fffdf7;--ink:#21251f;--muted:#6e6a5e;--line:#d9d2c0;--red:#c03a2b;--red-deep:#9c2d21;--stamp:#3d5a6c;--green:#4e795b;--amber:#a8722a;--stale:#8a8578;--content-max:880px;position:relative;height:100%;overflow:hidden;color:var(--ink);background:var(--bg);font-family:"Avenir Next","Noto Sans CJK SC",sans-serif}
.posta>header{height:86px;padding:calc(24px + env(safe-area-inset-top)) 22px 10px;box-sizing:border-box;display:grid;grid-template-columns:42px 42px 1fr auto;align-items:center;gap:11px;border-bottom:2px solid var(--ink);background:var(--paper)}
header>.back,aside>.close{width:40px;height:40px;border:1.5px solid var(--ink);border-radius:6px;color:inherit;background:var(--paper);cursor:pointer}
header>.back:active,aside>.close:active{transform:scale(.94)}
.logo{height:42px;display:grid;place-items:center;border-radius:6px;color:#fff;background:var(--red);box-shadow:3px 3px 0 var(--ink)}
.brand b,.brand small{display:block}.brand b{letter-spacing:.04em}.brand small{color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.12em}
.pinned-count{min-width:31px;height:31px;padding:0 6px;box-sizing:border-box;display:grid;place-items:center;border-radius:6px;color:#fff;background:var(--red);font-weight:900;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
.page{height:calc(100% - 86px);padding:25px 28px 110px;box-sizing:border-box;overflow-y:auto;display:flex;flex-direction:column}
.posta .page>*{width:min(var(--content-max),100%);margin-inline:auto}
.hero{min-height:230px;padding:30px 32px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;border:2px solid var(--ink);border-radius:6px;background:var(--paper);box-shadow:5px 5px 0 color-mix(in srgb,var(--red) 85%,#000)}
.hero-head{display:flex;justify-content:space-between;align-items:center}
.hero small,.title small{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px;font-weight:700;letter-spacing:.2em;color:var(--red)}
.hero-head>i{font-size:34px;color:var(--red)}
.hero h1{margin:16px 0;white-space:pre-line;font-size:44px;font-weight:900;line-height:1.02;letter-spacing:-.01em}
.barcode{display:block;height:34px;border-radius:2px;background:repeating-linear-gradient(90deg,var(--ink) 0 2px,transparent 2px 5px,var(--ink) 5px 8px,transparent 8px 11px,var(--ink) 11px 12px,transparent 12px 16px)}
.search{height:56px;margin:14px 0;padding:0 16px;display:flex;align-items:center;gap:11px;border:2px solid var(--ink);border-radius:6px;background:var(--paper)}
.search i{color:var(--red)}
.search input{min-width:0;flex:1;border:0;outline:0;color:inherit;background:transparent;font-size:16px}
.shipments{display:grid;gap:10px}
.shipments>button{min-height:112px;padding:0;display:grid;grid-template-columns:96px minmax(0,1fr) auto;align-items:stretch;border:2px solid var(--ink);border-radius:6px;color:inherit;background:var(--paper);text-align:left;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
.shipments>button:active{transform:scale(.985)}
.status{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;border-right:2px dashed var(--paper);border-radius:4px 0 0 4px;color:#fff;background:var(--red)}
.status.delivered{background:var(--green)}
.status.pickup_ready{background:var(--amber)}
.status.source_stale{background:var(--stale)}
.status i{font-size:22px}
.status span{font-size:10px;font-weight:900;letter-spacing:.08em}
.shipment-info{min-width:0;padding:16px}
.shipment-info small{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px;color:var(--muted);letter-spacing:.04em}
.shipment-info h2{margin:6px 0;font-size:17px;font-weight:800}
.shipment-info p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
.eta{align-self:center;margin:12px;padding:7px 10px;border:1.5px dashed var(--stamp);border-radius:4px;color:var(--stamp);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px;font-weight:700;letter-spacing:.06em}
.title{margin:18px 0 25px}
.title h1{margin:8px 0;font-size:34px;font-weight:900;line-height:1.05}
.title p{color:var(--muted);line-height:1.6}
.send-form{padding:24px;display:grid;gap:17px;border:2px solid var(--ink);border-radius:6px;background:var(--paper)}
.send-form label span{display:block;margin-bottom:7px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px;font-weight:700;letter-spacing:.14em;color:var(--red)}
.send-form input,.send-form textarea{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:6px;color:inherit;background:var(--bg);font-size:16px}
.send-form input{height:44px;padding:0 11px}
.send-form textarea{min-height:90px;padding:11px}
.send-form input:focus,.send-form textarea:focus{border-color:var(--red)}
.type-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.type-row button{min-height:54px;border:1.5px solid var(--line);border-radius:6px;color:inherit;background:transparent;font-weight:700;cursor:pointer}
.type-row button.active{border-color:var(--red);color:#fff;background:var(--red)}
.type-row i{margin-right:7px}
.send-form footer{display:flex;justify-content:space-between;padding-top:12px;border-top:2px dashed var(--line);color:var(--muted);font-size:11px}
.send-form footer b{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.12em;color:var(--red)}
.inbox{display:grid;gap:10px}
.inbox article{padding:20px;display:grid;grid-template-columns:42px 1fr auto;gap:13px;border:2px solid var(--ink);border-radius:6px;background:var(--paper)}
.inbox article>i{color:var(--red);font-size:22px}
.inbox p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
.inbox article>span{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;color:var(--muted)}
.toggle{padding:24px;display:flex;justify-content:space-between;align-items:center;gap:15px;border:2px solid var(--ink);border-radius:6px;background:var(--paper)}
.toggle p{color:var(--muted);font-size:12px;line-height:1.5}
.toggle>button{flex:none;width:56px;height:34px;padding:4px;border:2px solid var(--ink);border-radius:999px;background:var(--bg);cursor:pointer}
.toggle>button[aria-checked=true]{background:var(--red)}
.toggle>button span{display:block;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .2s ease}
.toggle>button[aria-checked=true] span{transform:translateX(22px)}
nav{position:absolute;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(520px,calc(100% - 24px));height:62px;padding:5px;box-sizing:border-box;display:grid;grid-template-columns:repeat(4,1fr);border:2px solid var(--ink);border-radius:8px;background:color-mix(in srgb,var(--paper) 94%,transparent);backdrop-filter:blur(16px)}
nav button{border:0;border-radius:5px;color:var(--muted);background:transparent;cursor:pointer}
nav button.active{color:#fff;background:var(--red)}
nav i,nav span{display:block}
nav span{margin-top:4px;font-size:10px;font-weight:700;letter-spacing:.05em}
aside{position:absolute;z-index:20;inset:0 0 0 auto;width:min(560px,100%);padding:calc(104px + env(safe-area-inset-top)) 34px 55px;box-sizing:border-box;overflow-y:auto;color:var(--ink);background:var(--paper);border-left:2px solid var(--ink);box-shadow:-25px 0 70px rgba(30,25,15,.28)}
aside::before{content:"";position:absolute;top:calc(32px + env(safe-area-inset-top));left:0;right:0;height:14px;background:repeating-linear-gradient(90deg,var(--red) 0 22px,var(--paper) 22px 30px,var(--stamp) 30px 52px,var(--paper) 52px 60px)}
:global(.app-shell[data-statusbar='off']) .posta aside::before{top:0}
aside>.close{position:absolute;right:18px;top:calc(50px + env(safe-area-inset-top))}
:global(.app-shell[data-statusbar='off']) .posta aside>.close{top:18px}
.waybill-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
.waybill-head>small{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;font-weight:700;letter-spacing:.14em;color:var(--red)}
.stamp{padding:6px 10px;border:2px solid currentColor;border-radius:4px;font-size:10px;font-weight:900;letter-spacing:.14em;color:var(--red);transform:rotate(2deg)}
.stamp.delivered{color:var(--green)}
.stamp.pickup_ready{color:var(--amber)}
.stamp.source_stale{color:var(--stale)}
aside h1{margin:14px 0 6px;font-size:34px;font-weight:900;line-height:1.08}
.track-line{margin:22px 0 6px;display:grid;grid-template-columns:auto minmax(24px,1fr) auto minmax(24px,1fr) auto;align-items:start}
.track-node{max-width:132px;display:grid;justify-items:center;gap:5px;text-align:center}
.track-node i{width:14px;height:14px;border-radius:50%;border:3px solid var(--red);background:var(--paper)}
.track-node i.is-done{background:var(--red)}
.track-node i.is-current{background:var(--red);box-shadow:0 0 0 4px color-mix(in srgb,var(--red) 18%,transparent)}
.track-node small{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:9px;font-weight:800;letter-spacing:.14em;color:var(--red)}
.track-node b{max-width:100%;font-size:11px;font-weight:700;line-height:1.4;overflow-wrap:anywhere}
.track-link{height:0;margin-top:7px;border-top:3px dashed var(--red);opacity:.55}
aside h2{margin:14px 0 4px;font-size:18px;font-weight:800}
aside>p{margin:0;color:var(--muted);line-height:1.6}
.eta-line{display:inline-block;margin-top:14px;padding:7px 12px;border:1.5px dashed var(--stamp);border-radius:4px;color:var(--stamp);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;letter-spacing:.06em}
.map-ref{margin:25px 0;padding:14px;display:grid;grid-template-columns:28px 1fr;gap:4px 10px;border:2px solid var(--ink);border-radius:6px;background:var(--bg)}
.map-ref>i{grid-row:1/3;color:var(--red)}
.map-ref small{color:var(--muted);overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px}
.pin{width:100%;min-height:48px;margin-top:4px;border:2px solid var(--ink);border-radius:6px;color:#fff;background:var(--red);font-weight:900;font-size:14px;letter-spacing:.04em;box-shadow:3px 3px 0 var(--ink);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
.pin:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
.pin[aria-pressed=true]{color:var(--red);background:var(--paper)}
.pin i{margin-right:8px}
.boundary{margin-top:18px;padding:13px;border:1.5px dashed var(--line);border-radius:6px;color:var(--muted);background:var(--bg);font-size:12px;line-height:1.55}
button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid color-mix(in srgb,var(--red) 65%,#fff);outline-offset:2px}
@media (prefers-reduced-motion:no-preference){
.shipments>button{animation:posta-rise .28s ease both}
.shipments>button:nth-child(2){animation-delay:.04s}
.shipments>button:nth-child(3){animation-delay:.08s}
.shipments>button:nth-child(4){animation-delay:.12s}
}
@keyframes posta-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media(max-width:700px){
.posta>header{height:82px;padding:calc(28px + env(safe-area-inset-top)) 10px 8px}
.page{height:calc(100% - 82px);padding:14px 12px 100px}
.hero{min-height:250px;padding:24px}
.hero h1{font-size:36px}
.shipments>button{grid-template-columns:64px minmax(0,1fr)}
.eta{grid-column:2;margin:0 12px 12px;justify-self:start}
.status span{writing-mode:vertical-rl}
.send-form{padding:17px}
.inbox article{grid-template-columns:34px 1fr}
.inbox article>span{grid-column:2}
aside{padding:calc(96px + env(safe-area-inset-top)) 20px 55px;border-left:0}
aside h1{font-size:30px}
}
</style>
