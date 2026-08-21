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
  <main class="mu-service" :data-page="pageKey" data-testid="shopping-store-service-page">
    <header class="mu-service-bar">
      <button type="button" @click="emit('back')">←</button>
      <strong>MUSINSA</strong>
      <nav>
        <button type="button" @click="emit('open-service')">RETURNS</button>
        <button type="button" @click="emit('open-cart')">BAG {{ cartQuantity || '' }}</button>
      </nav>
    </header>

    <section v-if="pageKey === 'checkout'" class="mu-fit-review" data-testid="shopping-checkout-review">
      <header>
        <span>FIT REVIEW / 03</span>
        <h1>{{ l('下单前，把尺码和造型关系一起存档', 'Save fit and styling context before ordering') }}</h1>
        <div class="mu-progress"><i></i><i></i><i class="is-active"></i><i></i></div>
      </header>

      <div class="mu-review-layout">
        <section class="mu-look-sheet">
          <div class="mu-look-no">LOOK<br />{{ String(cartQuantity).padStart(2, '0') }}</div>
          <article v-for="(line, index) in cartItems" :key="line.productId">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <small>SIZE SNAPSHOT / STANDARD FIT</small>
              <strong>{{ productDisplayTitle(line.product) }}</strong>
              <p>{{ l('订单将保留当前数量与尺码核对语境', 'The order keeps the current quantity and fit-review context') }}</p>
            </div>
            <b>{{ line.quantity }}×</b>
            <em>{{ formatOrderItemSubtotal({ ...line, unitPriceCents: line.product.priceCents, currency: line.currency }) }}</em>
          </article>
        </section>

        <aside class="mu-fit-passport">
          <span>FIT PASSPORT</span>
          <h2>{{ l('购买快照', 'Purchase snapshot') }}</h2>
          <dl>
            <div><dt>PIECES</dt><dd>{{ cartQuantity }}</dd></div>
            <div><dt>FIT CHECK</dt><dd>READY</dd></div>
            <div><dt>RETURN PATH</dt><dd>ATTACHED</dd></div>
            <div><dt>TOTAL</dt><dd>{{ cartTotalLabel }}</dd></div>
          </dl>
          <p v-if="giftEnabled">GIFT LOOK / {{ giftRecipientName || l('已附收件人', 'Recipient attached') }}</p>
          <button
            type="button"
            data-testid="shopping-place-order"
            :disabled="!cartItems.length"
            @click="emit('place-order')"
          >
            SAVE FIT & PLACE ORDER
          </button>
          <button type="button" @click="emit('open-cart')">EDIT BAG</button>
        </aside>
      </div>
    </section>

    <section v-else class="mu-returns" data-testid="shopping-service-page">
      <header>
        <span>SELF SERVICE / RETURNS</span>
        <h1>{{ l('先定位商品，再判断可执行的退换路径', 'Find the item first, then reveal the available return path') }}</h1>
      </header>
      <div class="mu-return-steps">
        <article><b>01</b><strong>{{ l('选择购买记录', 'Choose purchase') }}</strong><p>{{ l('从本店订单进入，不混入其他店铺。', 'Start from this store’s purchases only.') }}</p></article>
        <article><b>02</b><strong>{{ l('核对尺码与状态', 'Review fit and status') }}</strong><p>{{ l('可取消与完成状态以 Shopping 订单为准。', 'Eligibility follows Shopping order truth.') }}</p></article>
        <article><b>03</b><strong>{{ l('进入配送记录', 'Open shipping record') }}</strong><p>{{ l('物流事件与退换判断分开呈现。', 'Shipping events stay separate from return decisions.') }}</p></article>
      </div>
      <section class="mu-return-orders">
        <header><span>RECENT PURCHASES</span><b>{{ orders.length }}</b></header>
        <button
          v-for="order in orders"
          :key="order.id"
          type="button"
          :data-testid="`shopping-service-order-${order.id}`"
          @click="emit('open-order', order.id)"
        >
          <span>{{ formatLogisticsDate(order.createdAt) }}</span>
          <strong>{{ order.items.map((item) => item.title).join(' / ') }}</strong>
          <em>{{ orderStatusLabel(order.status) }}</em>
          <b>{{ formatOrderTotal(order) }} →</b>
        </button>
        <p v-if="!orders.length">NO PURCHASES AVAILABLE</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.mu-service{min-height:100%;color:#0a0a0a;background:#f3f3f3;font-family:Arial,"Noto Sans KR",sans-serif}.mu-service-bar{height:62px;padding:0 18px;display:grid;grid-template-columns:42px auto 1fr;align-items:center;color:#fff;background:#050505}.mu-service-bar strong{font-size:18px;letter-spacing:-.06em}.mu-service-bar nav{display:flex;justify-content:flex-end;gap:18px}.mu-service-bar button{font-size:8px;font-weight:900}.mu-fit-review>header,.mu-returns>header{padding:40px 22px 32px;background:#fff;border-bottom:1px solid #111}.mu-fit-review>header span,.mu-returns>header span{font-size:8px;font-weight:900}.mu-fit-review h1,.mu-returns h1{max-width:720px;margin-top:12px;font-size:39px;line-height:1.02;letter-spacing:-.05em}.mu-progress{margin-top:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:3px}.mu-progress i{height:4px;background:#ddd}.mu-progress i.is-active{background:#111}.mu-review-layout{padding:18px 20px 64px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(240px,.65fr);gap:10px}.mu-look-sheet{background:#fff;border-top:6px solid #111}.mu-look-no{padding:18px;font-size:48px;font-weight:900;line-height:.78;border-bottom:1px solid #111}.mu-look-sheet article{padding:15px 14px;display:grid;grid-template-columns:34px 1fr 36px auto;gap:10px;align-items:center;border-bottom:1px solid #d8d8d8}.mu-look-sheet article>span,.mu-look-sheet small,.mu-look-sheet p,.mu-look-sheet b,.mu-look-sheet em{font-size:8px}.mu-look-sheet strong{display:block;margin:5px 0;font-size:13px}.mu-look-sheet p{margin:0;color:#777}.mu-look-sheet em{font-style:normal;font-weight:900}.mu-fit-passport{align-self:start;padding:20px;color:#fff;background:#111}.mu-fit-passport>span{font-size:8px}.mu-fit-passport h2{margin:8px 0 24px;font-size:25px}.mu-fit-passport dl div{padding:11px 0;display:flex;justify-content:space-between;border-bottom:1px solid #444;font-size:8px}.mu-fit-passport p{padding:12px 0;color:#b7ff34;font-size:8px}.mu-fit-passport button{width:100%;height:46px;margin-top:8px;border:1px solid #fff;font-size:8px;font-weight:900}.mu-fit-passport button:first-of-type{color:#111;background:#b7ff34;border-color:#b7ff34}.mu-fit-passport button:disabled{opacity:.35}.mu-return-steps{padding:18px 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.mu-return-steps article{min-height:190px;padding:17px;color:#fff;background:#111}.mu-return-steps b{font-size:35px}.mu-return-steps strong{display:block;margin-top:44px;font-size:12px}.mu-return-steps p{color:#aaa;font-size:8px;line-height:1.7}.mu-return-orders{margin:0 20px 64px;background:#fff;border-top:6px solid #111}.mu-return-orders>header{padding:14px;display:flex;justify-content:space-between;border-bottom:1px solid #111;font-size:8px}.mu-return-orders>button{width:100%;padding:14px;display:grid;grid-template-columns:90px 1fr 90px auto;gap:10px;text-align:left;border-bottom:1px solid #ddd}.mu-return-orders button>*{font-size:8px}.mu-return-orders button em{font-style:normal}.mu-return-orders>p{padding:40px;text-align:center;font-size:8px}@media(max-width:720px){.mu-fit-review h1,.mu-returns h1{font-size:31px}.mu-review-layout{grid-template-columns:1fr}.mu-look-sheet article{grid-template-columns:28px 1fr auto}.mu-look-sheet article>b{display:none}.mu-return-steps{grid-template-columns:1fr}.mu-return-steps article{min-height:130px}.mu-return-steps strong{margin-top:22px}.mu-return-orders>button{grid-template-columns:1fr auto}.mu-return-orders button>span,.mu-return-orders button>em{display:none}}
</style>
