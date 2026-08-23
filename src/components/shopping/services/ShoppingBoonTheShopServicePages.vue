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
  <main class="boon-service" :data-page="pageKey" data-testid="shopping-store-service-page">
    <header class="boon-service-bar">
      <button type="button" @click="emit('back')">←</button>
      <strong>BOONTHESHOP</strong>
      <nav><button type="button" @click="pageKey === 'checkout' ? emit('open-service') : emit('open-orders')">{{ pageKey === 'checkout' ? 'ATELIER SERVICE' : 'ORDERS' }}</button></nav>
    </header>

    <section v-if="pageKey === 'checkout'" class="boon-request" data-testid="shopping-checkout-review">
      <header>
        <span>PRIVATE FITTING REQUEST</span>
        <h1>{{ l('这不是付款终点，而是一份试衣与修改委托', 'This is not a payment endpoint, but a fitting and alteration brief') }}</h1>
        <blockquote>{{ l('“衣服的最后一次设计，发生在穿着者身上。”', '“The final design decision happens on the wearer.”') }}</blockquote>
      </header>
      <div class="boon-request-layout">
        <section class="boon-brief">
          <div class="boon-brief-number">{{ String(cartQuantity).padStart(2, '0') }}</div>
          <article v-for="(line, index) in cartItems" :key="line.productId">
            <span>FITTING {{ String(index + 1).padStart(2, '0') }}</span>
            <h2>{{ productDisplayTitle(line.product) }}</h2>
            <p>{{ l('肩线 / 衣长 / 修改需求将在预约中确认', 'Shoulder / length / alteration needs reviewed at appointment') }}</p>
            <footer><b>{{ line.quantity }} PIECE</b><strong>{{ formatOrderItemSubtotal({ ...line, unitPriceCents: line.product.priceCents, currency: line.currency }) }}</strong></footer>
          </article>
        </section>
        <aside class="boon-appointment-card">
          <span>APPOINTMENT NOTE</span>
          <h2>{{ l('买手会审', 'Buyer review') }}</h2>
          <dl>
            <div><dt>FITTING</dt><dd>REQUESTED</dd></div>
            <div><dt>ALTERATION</dt><dd>DISCUSS</dd></div>
            <div><dt>PRESENTATION</dt><dd>{{ giftEnabled ? 'PRIVATE GIFT' : 'STANDARD' }}</dd></div>
            <div><dt>VALUE</dt><dd>{{ cartTotalLabel }}</dd></div>
          </dl>
          <p v-if="giftEnabled">FOR / {{ giftRecipientName || l('私人收件人', 'Private recipient') }}</p>
          <button type="button" data-testid="shopping-place-order" :disabled="!cartItems.length" @click="emit('place-order')">SEND FITTING REQUEST</button>
          <button type="button" @click="emit('open-cart')">RETURN TO FITTING LIST</button>
        </aside>
      </div>
    </section>

    <section v-else class="boon-care" data-testid="shopping-service-page">
      <header>
        <span>ATELIER SERVICE / SEOUL</span>
        <h1>{{ l('围绕衣服、身体与时间组织服务', 'Service organized around garment, body, and time') }}</h1>
      </header>
      <section class="boon-service-ledger">
        <article><span>01</span><div><strong>{{ l('预约试衣', 'Fitting appointment') }}</strong><p>{{ l('查看已经创建的预约与购买记录。', 'Review created appointments and purchase records.') }}</p></div></article>
        <article><span>02</span><div><strong>{{ l('修改建议', 'Alteration guidance') }}</strong><p>{{ l('查看已记录的版型、长度与修改偏好。', 'Review recorded fit, length, and alteration preferences.') }}</p></div></article>
        <article><span>03</span><div><strong>{{ l('专属配送', 'Private delivery') }}</strong><p>{{ l('从本店配送页查看承运和交付事件。', 'Use this store’s delivery page for fulfillment events.') }}</p></div></article>
      </section>
      <section class="boon-care-orders">
        <header><span>CURRENT DOSSIERS</span><b>{{ orders.length }}</b></header>
        <button v-for="(order, index) in orders" :key="order.id" type="button" :data-testid="`shopping-service-order-${order.id}`" @click="emit('open-order', order.id)">
          <b>{{ String(index + 1).padStart(2, '0') }}</b>
          <div><small>{{ formatLogisticsDate(order.createdAt) }}</small><strong>{{ order.items.map((item) => item.title).join(' / ') }}</strong></div>
          <em>{{ orderStatusLabel(order.status) }}</em>
          <span>{{ formatOrderTotal(order) }} →</span>
        </button>
        <p v-if="!orders.length">NO ATELIER DOSSIERS</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.boon-service{min-height:100%;color:#27221f;background:#e8e2d8;font-family:Arial,"Noto Sans KR",sans-serif}.boon-service-bar{height:62px;padding:0 18px;display:grid;grid-template-columns:42px auto 1fr;align-items:center;color:#eeeae2;background:#191714}.boon-service-bar strong{font-family:Georgia,serif;font-size:16px;letter-spacing:.08em}.boon-service-bar nav{justify-self:end}.boon-service-bar button{font-size:8px}.boon-request>header,.boon-care>header{padding:46px 24px;background:#f9f7f2}.boon-request>header span,.boon-care>header span{color:#8b2732;font-size:8px;font-weight:900;letter-spacing:.16em}.boon-request h1,.boon-care h1{max-width:780px;margin:12px 0;font-family:Georgia,"Noto Serif KR",serif;font-size:39px;line-height:1.07}.boon-request blockquote{max-width:520px;margin:18px 0 0;color:#746c64;font-family:Georgia,serif;font-size:15px}.boon-request-layout{padding:18px 20px 66px;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(260px,.7fr);gap:12px}.boon-brief{display:grid;grid-template-columns:140px 1fr;background:#f9f7f2}.boon-brief-number{padding:20px;color:#eeeae2;background:#5b1f28;font-family:Georgia,serif;font-size:62px}.boon-brief article{grid-column:2;padding:18px;border-bottom:1px solid #d5cec3}.boon-brief article>span{color:#8b2732;font-size:7px}.boon-brief h2{font-family:Georgia,"Noto Serif KR",serif;font-size:17px}.boon-brief p{color:#716a63;font-size:8px}.boon-brief footer{display:flex;justify-content:space-between;font-size:8px}.boon-appointment-card{align-self:start;padding:22px;color:#eeeae2;background:#191714}.boon-appointment-card>span{color:#be8c90;font-size:8px}.boon-appointment-card h2{margin:9px 0 26px;font-family:Georgia,"Noto Serif KR",serif;font-size:29px}.boon-appointment-card dl div{padding:11px 0;display:flex;justify-content:space-between;border-bottom:1px solid #514b45;font-size:8px}.boon-appointment-card p{color:#d5a4a9;font-size:8px}.boon-appointment-card button{width:100%;height:47px;margin-top:8px;border:1px solid #eeeae2;font-size:8px;font-weight:900}.boon-appointment-card button:first-of-type{color:#eeeae2;background:#5b1f28;border-color:#5b1f28}.boon-appointment-card button:disabled{opacity:.35}.boon-service-ledger{padding:18px 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.boon-service-ledger article{min-height:190px;padding:18px;display:flex;flex-direction:column;justify-content:space-between;background:#f9f7f2}.boon-service-ledger article>span{color:#8b2732;font-family:Georgia,serif;font-size:34px}.boon-service-ledger strong{font-family:Georgia,"Noto Serif KR",serif;font-size:15px}.boon-service-ledger p{color:#716a63;font-size:8px;line-height:1.7}.boon-care-orders{margin:0 20px 66px;background:#191714;color:#eeeae2}.boon-care-orders>header{padding:14px 17px;display:flex;justify-content:space-between;border-bottom:1px solid #514b45;font-size:8px}.boon-care-orders>button{width:100%;padding:15px 17px;display:grid;grid-template-columns:35px 1fr 90px auto;gap:10px;align-items:center;text-align:left;border-bottom:1px solid #514b45}.boon-care-orders button>b{color:#be8c90;font-family:Georgia,serif;font-size:18px}.boon-care-orders small,.boon-care-orders strong{display:block;font-size:8px}.boon-care-orders button em,.boon-care-orders button span{font-size:8px;font-style:normal}.boon-care-orders button em{color:#be8c90}.boon-care-orders>p{padding:42px;text-align:center;font-size:8px}@media(max-width:720px){.boon-request h1,.boon-care h1{font-size:31px}.boon-request-layout{grid-template-columns:1fr}.boon-brief{grid-template-columns:92px 1fr}.boon-brief-number{font-size:44px}.boon-service-ledger{grid-template-columns:1fr}.boon-service-ledger article{min-height:130px}.boon-care-orders>button{grid-template-columns:30px 1fr auto}.boon-care-orders button>em{display:none}}
</style>
