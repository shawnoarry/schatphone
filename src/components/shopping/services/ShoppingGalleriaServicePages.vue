<script setup>
import {
  SHOPPING_OPERATION_PAGE_EVENTS,
  SHOPPING_OPERATION_PAGE_PROPS,
  localizeOperationPage,
} from '../operations/shopping-operation-page-contract'

const props = defineProps(SHOPPING_OPERATION_PAGE_PROPS)
const emit = defineEmits(SHOPPING_OPERATION_PAGE_EVENTS)
const l = (zh, en) => localizeOperationPage(props.languageBase, zh, en)
</script>

<template>
  <main class="gal-service" :data-page="pageKey" data-testid="shopping-store-service-page">
    <header class="gal-service-bar">
      <button type="button" @click="emit('back')">←</button>
      <strong>GALLERIA</strong><span>LUXURY HALL</span>
      <button type="button" @click="emit('open-service')">CONCIERGE</button>
    </header>

    <section v-if="pageKey === 'checkout'" class="gal-review" data-testid="shopping-checkout-review">
      <header>
        <div class="gal-monogram">G</div>
        <article>
          <span>CONCIERGE REVIEW / PRIVATE SALON</span>
          <h1>{{ l('由礼宾逐项确认鉴赏、呈现与交付', 'Concierge review for viewing, presentation, and delivery') }}</h1>
          <p>{{ l('订单会在确认后创建；礼宾语言不改变 Shopping 的订单真相。', 'The order is created after confirmation; concierge language does not alter Shopping order truth.') }}</p>
        </article>
      </header>
      <section class="gal-review-ritual">
        <div><b>01</b><span>SELECTION</span></div><div><b>02</b><span>VIEWING</span></div><div><b>03</b><span>PRESENTATION</span></div><div class="is-current"><b>04</b><span>CONFIRM</span></div>
      </section>
      <div class="gal-review-layout">
        <section class="gal-salon-list">
          <article v-for="(line, index) in cartItems" :key="line.productId">
            <span>SALON {{ String(index + 1).padStart(2, '0') }}</span>
            <div><small>CURATOR SELECTION</small><strong>{{ productDisplayTitle(line.product) }}</strong><p>{{ line.quantity }} PIECE / PRIVATE REVIEW</p></div>
            <b>{{ formatOrderItemSubtotal({ ...line, unitPriceCents: line.product.priceCents, currency: line.currency }) }}</b>
          </article>
        </section>
        <aside class="gal-confirmation">
          <span>PRIVATE CONFIRMATION</span>
          <strong>{{ cartTotalLabel }}</strong>
          <dl><div><dt>VIEWING</dt><dd>RESERVED</dd></div><div><dt>PRESENTATION</dt><dd>{{ giftEnabled ? 'GIFT RITUAL' : 'SIGNATURE' }}</dd></div><div><dt>DELIVERY</dt><dd>CONCIERGE LED</dd></div></dl>
          <p v-if="giftEnabled">RECIPIENT / {{ giftRecipientName || l('待礼宾确认', 'Concierge confirmation') }}</p>
          <button type="button" data-testid="shopping-place-order" :disabled="!cartItems.length" @click="emit('place-order')">CONFIRM PRIVATE SERVICE</button>
          <button type="button" @click="emit('open-cart')">REVISE REQUEST</button>
        </aside>
      </div>
    </section>

    <section v-else class="gal-concierge" data-testid="shopping-service-page">
      <header><span>CONCIERGE DESK / SEOUL</span><h1>{{ l('服务从一份私人档案开始', 'Service begins with a private dossier') }}</h1></header>
      <section class="gal-concierge-menu">
        <article><i class="fas fa-eye"></i><span>PRIVATE VIEW</span><p>{{ l('查看鉴赏与购买记录。', 'Review viewing and purchase records.') }}</p></article>
        <article><i class="fas fa-gift"></i><span>PRESENTATION</span><p>{{ l('保留礼赠收件人与呈现语境。', 'Keep recipient and presentation context.') }}</p></article>
        <article><i class="fas fa-car-side"></i><span>DELIVERY</span><p>{{ l('进入本店私人配送事件。', 'Open this hall’s private delivery events.') }}</p></article>
        <article><i class="fas fa-rotate-left"></i><span>AFTERCARE</span><p>{{ l('仅显示订单状态允许的动作。', 'Show only actions allowed by order state.') }}</p></article>
      </section>
      <section class="gal-dossiers">
        <header><span>ACTIVE DOSSIERS</span><b>{{ orders.length }}</b></header>
        <button v-for="(order, index) in orders" :key="order.id" type="button" :data-testid="`shopping-service-order-${order.id}`" @click="emit('open-order', order.id)">
          <span class="gal-dossier-seal">{{ String(index + 1).padStart(2, '0') }}</span>
          <div><small>{{ formatLogisticsDate(order.createdAt) }}</small><strong>{{ order.items.map((item) => item.title).join(' / ') }}</strong><p>{{ orderStatusLabel(order.status) }}</p></div>
          <b>{{ formatOrderTotal(order) }}</b><em>OPEN →</em>
        </button>
        <p v-if="!orders.length">NO PRIVATE DOSSIERS</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.gal-service{min-height:100%;color:#eee7db;background:#12110f;font-family:Arial,"Noto Sans KR",sans-serif}.gal-service-bar{height:64px;padding:0 18px;display:grid;grid-template-columns:42px auto 1fr auto;align-items:center;border-bottom:1px solid #50493f}.gal-service-bar strong{font-family:Georgia,serif;font-size:17px;letter-spacing:.08em}.gal-service-bar span{margin-left:10px;color:#bfa36b;font-size:7px}.gal-service-bar button{font-size:8px}.gal-review>header{min-height:360px;padding:38px 26px;display:grid;grid-template-columns:170px 1fr;gap:34px;align-items:center;background:#1c1a17}.gal-monogram{width:145px;height:145px;display:grid;place-items:center;border:1px solid #bfa36b;border-radius:50%;color:#bfa36b;font-family:Georgia,serif;font-size:72px}.gal-review>header span,.gal-concierge>header span{color:#bfa36b;font-size:8px;font-weight:900}.gal-review h1,.gal-concierge h1{max-width:720px;font-family:Georgia,"Noto Serif KR",serif;font-size:40px;line-height:1.07}.gal-review>header p{max-width:590px;color:#aaa196;font-size:8px;line-height:1.8}.gal-review-ritual{display:grid;grid-template-columns:repeat(4,1fr);color:#171512;background:#bfa36b}.gal-review-ritual div{padding:14px 16px;display:flex;gap:10px;border-right:1px solid #715e3c}.gal-review-ritual b,.gal-review-ritual span{font-size:8px}.gal-review-ritual .is-current{color:#bfa36b;background:#171512}.gal-review-layout{padding:20px 18px 66px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(270px,.8fr);gap:10px}.gal-salon-list{border:1px solid #4b453c;background:#1c1a17}.gal-salon-list article{padding:16px;display:grid;grid-template-columns:80px 1fr auto;gap:12px;align-items:center;border-bottom:1px solid #4b453c}.gal-salon-list article>span,.gal-salon-list small,.gal-salon-list p,.gal-salon-list b{font-size:8px}.gal-salon-list article>span,.gal-salon-list small{color:#bfa36b}.gal-salon-list strong{display:block;margin:6px 0;font-family:Georgia,serif;font-size:14px}.gal-salon-list p{color:#aaa196}.gal-confirmation{align-self:start;padding:22px;color:#171512;background:#bfa36b}.gal-confirmation>span{font-size:8px}.gal-confirmation>strong{display:block;margin:10px 0 25px;font-family:Georgia,serif;font-size:25px}.gal-confirmation dl div{padding:11px 0;display:flex;justify-content:space-between;border-bottom:1px solid #715e3c;font-size:8px}.gal-confirmation p{font-size:8px}.gal-confirmation button{width:100%;height:47px;margin-top:8px;border:1px solid #171512;font-size:8px;font-weight:900}.gal-confirmation button:first-of-type{color:#bfa36b;background:#171512}.gal-confirmation button:disabled{opacity:.35}.gal-concierge>header{padding:46px 24px;background:#1c1a17}.gal-concierge-menu{padding:18px 20px;display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.gal-concierge-menu article{min-height:180px;padding:17px;border:1px solid #4b453c;background:#1c1a17}.gal-concierge-menu i{color:#bfa36b;font-size:25px}.gal-concierge-menu span{display:block;margin-top:40px;color:#bfa36b;font-size:8px}.gal-concierge-menu p{color:#aaa196;font-size:8px;line-height:1.7}.gal-dossiers{margin:0 20px 66px;border:1px solid #4b453c;background:#1c1a17}.gal-dossiers>header{padding:14px 16px;display:flex;justify-content:space-between;border-bottom:1px solid #4b453c;font-size:8px}.gal-dossiers>button{width:100%;padding:14px 16px;display:grid;grid-template-columns:54px 1fr auto 60px;gap:12px;align-items:center;text-align:left;border-bottom:1px solid #4b453c}.gal-dossier-seal{width:44px;height:44px;display:grid;place-items:center;border:1px solid #bfa36b;border-radius:50%;color:#bfa36b;font-family:Georgia,serif}.gal-dossiers small,.gal-dossiers strong,.gal-dossiers p,.gal-dossiers button>b,.gal-dossiers em{display:block;font-size:8px}.gal-dossiers small,.gal-dossiers p,.gal-dossiers em{color:#bfa36b}.gal-dossiers em{font-style:normal}.gal-dossiers>p{padding:42px;text-align:center;font-size:8px}@media(max-width:720px){.gal-review>header{grid-template-columns:100px 1fr}.gal-monogram{width:90px;height:90px;font-size:45px}.gal-review h1,.gal-concierge h1{font-size:31px}.gal-review-layout{grid-template-columns:1fr}.gal-review-ritual div{padding:11px 8px}.gal-review-ritual span{display:none}.gal-concierge-menu{grid-template-columns:repeat(2,1fr)}.gal-dossiers>button{grid-template-columns:48px 1fr auto}.gal-dossiers button>b{display:none}}
</style>
