<script setup>
import { computed, ref, watch } from 'vue'
import { resolveShoppingExperienceModel } from './shopping-experience-model'

const props = defineProps({
  storefront: { type: String, default: 'city_market' },
  serviceLabel: { type: String, default: '' },
  product: { type: Object, default: null },
  relatedProducts: { type: Array, default: () => [] },
  cartQuantity: { type: Number, default: 0 },
  languageBase: { type: String, default: 'zh' },
  productImageUrl: { type: Function, required: true },
  productDisplayTitle: { type: Function, required: true },
  productDisplayDescription: { type: Function, required: true },
  productCategoryIcon: { type: Function, required: true },
  stockStatusLabel: { type: Function, required: true },
  formatPrice: { type: Function, required: true },
  isProductFavorite: { type: Function, required: true },
})

const emit = defineEmits(['back', 'open-product', 'add-to-cart', 'toggle-favorite', 'open-cart', 'open-orders'])
const model = computed(() => resolveShoppingExperienceModel(props.storefront))
const quantity = ref(1)
const selectedOption = ref('01')
const activeMedia = ref(0)
const localize = (copy) => props.languageBase === 'zh' ? copy[0] : copy[1]
const detailBodies = computed(() => {
  const title = props.product ? props.productDisplayTitle(props.product) : ''
  const bodies = {
    city_market: [
      [`${title} 可进入本地配送追踪；到货承诺与退货入口会随订单保存。`, `${title} includes local delivery tracking, with arrival and return actions preserved on the order.`],
      ['规格、库存状态和包装信息集中在这里，减少下单前来回查找。', 'Specifications, stock, and package information stay together before checkout.'],
      ['评价区优先显示耐用性、实际尺寸和配送体验等可验证信息。', 'Reviews prioritize durability, real dimensions, and delivery experience.'],
    ],
    tech_catalog: [
      ['编辑从触感、使用频率和长期留存价值解释这件物品为何入选。', 'The editor explains the object through tactility, use frequency, and long-term value.'],
      ['细节页记录材料、比例、日常使用方式和维护提示。', 'Details cover material, proportion, daily use, and care.'],
      ['同主题物件与生活画报形成一条可继续阅读的内容路径。', 'Related objects and visual stories continue the editorial path.'],
    ],
    fresh_market: [
      ['产地、净含量和建议食用人数在下单前直接可见。', 'Origin, net weight, and serving guidance are visible before purchase.'],
      ['到货温层、冷藏期限与开封后的保存方式分别说明。', 'Arrival temperature, chilled life, and after-opening storage are separated.'],
      ['搭配建议围绕一餐的完成度，而不是简单堆叠更多商品。', 'Pairings are organized around completing a meal, not adding random items.'],
    ],
    room_planner: [
      ['宽、深、高及包装尺寸同时呈现，方便确认门、电梯和摆放空间。', 'Product and package measurements help check doors, lifts, and placement.'],
      ['材料、表面处理与日常清洁方法形成完整养护信息。', 'Materials, finish, and everyday cleaning form one care guide.'],
      ['相关商品按房间功能和尺寸关系组合，而不是按同类热销排序。', 'Related items follow room function and dimensional fit rather than generic popularity.'],
    ],
    care_lab: [
      ['用肤质、使用时段和护理目标说明适用人群。', 'Suitability is explained through skin type, time of use, and routine goal.'],
      ['核心成分、预期功效和需要避开的搭配被明确分开。', 'Key ingredients, expected benefits, and cautions are clearly separated.'],
      ['护理步骤显示前后顺序、频率和可搭配的下一步。', 'Routine guidance shows order, frequency, and the next compatible step.'],
    ],
  }
  return bodies[props.storefront] || [
    ['商品档案说明设计重点、适用场景与本次选品理由。', 'The dossier explains design intent, use context, and why the piece was selected.'],
    ['材质、规格和维护方式以可比较的方式集中呈现。', 'Material, specifications, and care are presented for easy comparison.'],
    ['关联内容围绕完整造型、补货计划或服务体验继续展开。', 'Related content continues through styling, restock planning, or service.'],
  ]
})
const mediaCells = computed(() => [0, 1, 2])
watch(() => props.product?.id, () => {
  quantity.value = 1
  selectedOption.value = '01'
  activeMedia.value = 0
})
</script>

<template>
  <main v-if="product" class="shopping-pdp" :data-storefront="storefront" :data-pdp-mode="model.pdpMode" data-testid="shopping-product-page">
    <header class="pdp-appbar">
      <button type="button" :aria-label="localize(['返回商品列表', 'Back to products'])" @click="emit('back')"><i class="fas fa-arrow-left" aria-hidden="true"></i></button>
      <div><span>{{ serviceLabel }}</span><strong>{{ localize(['商品详情', 'Product']) }}</strong></div>
      <nav>
        <button type="button" :aria-label="localize(['订单', 'Orders'])" @click="emit('open-orders')"><i class="fas fa-receipt" aria-hidden="true"></i></button>
        <button type="button" :aria-label="localize(['购物车', 'Cart'])" @click="emit('open-cart')"><i class="fas fa-bag-shopping" aria-hidden="true"></i><b v-if="cartQuantity">{{ cartQuantity }}</b></button>
      </nav>
    </header>

    <section class="pdp-stage">
      <div class="pdp-gallery" :data-active-media="activeMedia">
        <button v-for="cell in mediaCells" :key="cell" type="button" class="pdp-media-cell" :class="{ 'is-active': activeMedia === cell }" @click="activeMedia = cell">
          <img v-if="cell === 0 && productImageUrl(product)" :src="productImageUrl(product)" :alt="product.image?.alt || productDisplayTitle(product)" />
          <span v-else>
            <i :class="cell === 0 ? productCategoryIcon(product) : cell === 1 ? 'fas fa-expand' : 'fas fa-layer-group'" aria-hidden="true"></i>
            <b>{{ cell === 0 ? '01' : cell === 1 ? localize(['细节', 'DETAIL']) : localize(['场景', 'SCENE']) }}</b>
          </span>
        </button>
      </div>

      <div class="pdp-purchase-panel">
        <p class="pdp-kicker">{{ localize(model.productKicker) }}</p>
        <h1>{{ productDisplayTitle(product) }}</h1>
        <p class="pdp-description">{{ productDisplayDescription(product) }}</p>
        <strong class="pdp-price">{{ formatPrice(product) }}</strong>

        <div class="pdp-service-promise">
          <i :class="storefront === 'city_market' ? 'fas fa-bolt' : storefront === 'room_planner' ? 'fas fa-ruler-combined' : storefront === 'care_lab' ? 'fas fa-droplet' : storefront === 'luxury_hall' ? 'fas fa-gem' : 'fas fa-box-open'" aria-hidden="true"></i>
          <div><strong>{{ localize(model.primaryFact) }}</strong><span>{{ localize(model.secondaryFact) }}</span></div>
        </div>

        <div v-if="storefront === 'fashion_editorial' || storefront === 'fashion_catalog' || storefront === 'buyer_atelier'" class="pdp-option-block">
          <span>{{ localize(['选择尺码', 'Select size']) }}</span>
          <div><button v-for="option in ['01','02','03','04']" :key="option" type="button" :class="{ 'is-active': selectedOption === option }" @click="selectedOption = option">{{ option === '01' ? 'S' : option === '02' ? 'M' : option === '03' ? 'L' : 'XL' }}</button></div>
        </div>
        <div v-else-if="storefront === 'room_planner'" class="pdp-measurement-board">
          <div><span>W</span><strong>84 cm</strong></div><div><span>D</span><strong>42 cm</strong></div><div><span>H</span><strong>76 cm</strong></div>
        </div>
        <div v-else-if="storefront === 'member_warehouse'" class="pdp-bulk-board">
          <div><span>{{ localize(['整箱', 'CASE']) }}</span><strong>12</strong></div><div><span>{{ localize(['每件', 'EACH']) }}</span><strong>{{ formatPrice(product) }}</strong></div>
        </div>
        <div v-else-if="storefront === 'care_lab'" class="pdp-routine-board">
          <span>01 CLEANSE</span><strong>02 TREAT</strong><span>03 SEAL</span>
        </div>
        <div v-else-if="storefront === 'neighborhood_convenience'" class="pdp-pickup-board">
          <i class="fas fa-location-dot" aria-hidden="true"></i><div><strong>{{ localize(['附近门店有货', 'In stock nearby']) }}</strong><span>{{ localize(['选择后预计 12 分钟备货完成', 'Ready around 12 minutes after selection']) }}</span></div>
        </div>
        <div v-else class="pdp-option-block">
          <span>{{ localize(['购买数量', 'Quantity']) }}</span>
          <div class="pdp-stepper"><button type="button" :disabled="quantity <= 1" @click="quantity = Math.max(1, quantity - 1)">−</button><strong>{{ quantity }}</strong><button type="button" :disabled="quantity >= 99" @click="quantity = Math.min(99, quantity + 1)">+</button></div>
        </div>

        <div class="pdp-primary-actions">
          <button type="button" class="pdp-save" :class="{ 'is-favorite': isProductFavorite(product.id) }" @click="emit('toggle-favorite', product.id)"><i class="fas fa-heart" aria-hidden="true"></i><span>{{ localize(['收藏', 'Save']) }}</span></button>
          <button type="button" class="pdp-add" :disabled="product.stockStatus === 'sold_out'" data-testid="shopping-product-add" @click="emit('add-to-cart', product.id, quantity)"><span>{{ storefront === 'buyer_atelier' ? localize(['加入试衣单', 'Add to fitting list']) : storefront === 'luxury_hall' ? localize(['申请礼宾确认', 'Request concierge']) : localize(['加入购物车', 'Add to cart']) }}</span><i class="fas fa-arrow-right" aria-hidden="true"></i></button>
        </div>
      </div>
    </section>

    <section class="pdp-depth">
      <div class="pdp-depth-index"><span>PRODUCT / {{ product.id.slice(-6).toUpperCase() }}</span><strong>{{ stockStatusLabel(product.stockStatus) }}</strong></div>
      <article v-for="(section, index) in model.detailSections" :key="section[1]" class="pdp-story-section">
        <div class="pdp-story-number">0{{ index + 1 }}</div>
        <div class="pdp-story-copy"><p>{{ localize(section) }}</p><h2>{{ index === 0 ? localize(model.primaryFact) : index === 1 ? productDisplayTitle(product) : localize(model.secondaryFact) }}</h2><span>{{ localize(detailBodies[index] || detailBodies[0]) }}</span></div>
        <div class="pdp-story-visual" :class="`is-${index + 1}`"><i :class="index === 0 ? 'fas fa-wave-square' : index === 1 ? productCategoryIcon(product) : 'fas fa-arrow-trend-up'" aria-hidden="true"></i></div>
      </article>
    </section>

    <section v-if="relatedProducts.length" class="pdp-related">
      <div class="pdp-related-head"><div><p>{{ localize(['继续探索', 'KEEP EXPLORING']) }}</p><h2>{{ storefront === 'care_lab' ? localize(['完成这套护理步骤', 'Complete the routine']) : storefront === 'room_planner' ? localize(['一起放进这个房间', 'Build the room']) : storefront === 'fashion_catalog' || storefront === 'fashion_editorial' ? localize(['完成这套造型', 'Complete the look']) : localize(['同一分类的其他选择', 'More from this category']) }}</h2></div><span>{{ relatedProducts.length }}</span></div>
      <div class="pdp-related-rail">
        <button v-for="related in relatedProducts" :key="related.id" type="button" @click="emit('open-product', related.id)">
          <span><img v-if="productImageUrl(related)" :src="productImageUrl(related)" :alt="productDisplayTitle(related)" /><i v-else :class="productCategoryIcon(related)" aria-hidden="true"></i></span>
          <strong>{{ productDisplayTitle(related) }}</strong><small>{{ formatPrice(related) }}</small>
        </button>
      </div>
    </section>
  </main>
  <main v-else class="pdp-missing" data-testid="shopping-product-missing">
    <span>404</span><h1>{{ localize(['商品不存在', 'Product not found']) }}</h1><button type="button" @click="emit('back')">{{ localize(['返回商品列表', 'Back to products']) }}</button>
  </main>
</template>

<style scoped>
.shopping-pdp{min-height:100%;color:var(--shop-ink);background:var(--shop-bg);font-family:"Noto Sans KR","Pretendard",system-ui,sans-serif}.pdp-appbar{position:sticky;top:0;z-index:30;min-height:66px;padding:10px 16px;display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:12px;border-bottom:1px solid var(--shop-line);background:color-mix(in srgb,var(--shop-bg) 91%,transparent);backdrop-filter:blur(16px)}.pdp-appbar>button,.pdp-appbar nav button{position:relative;width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--shop-line);border-radius:50%;color:var(--shop-ink);background:var(--shop-surface)}.pdp-appbar>div{display:flex;flex-direction:column}.pdp-appbar>div span{color:var(--shop-muted);font-size:9px;font-weight:900;letter-spacing:.14em}.pdp-appbar>div strong{font-size:14px}.pdp-appbar nav{display:flex;gap:8px}.pdp-appbar nav b{position:absolute;right:-3px;top:-4px;min-width:18px;height:18px;display:grid;place-items:center;border-radius:9px;color:white;background:var(--shop-accent);font-size:9px}.pdp-stage{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(300px,.92fr);min-height:620px;border-bottom:1px solid var(--shop-line);background:var(--shop-surface)}.pdp-gallery{padding:18px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:minmax(390px,1fr) 150px;gap:8px;background:var(--shop-bg)}.pdp-media-cell{overflow:hidden;border:1px solid var(--shop-line);color:var(--shop-accent);background:var(--shop-surface)}.pdp-media-cell:first-child{grid-column:1/-1}.pdp-media-cell img{width:100%;height:100%;display:block;object-fit:cover}.pdp-media-cell>span{width:100%;height:100%;padding:22px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;background:linear-gradient(145deg,var(--shop-surface),color-mix(in srgb,var(--shop-bg) 72%,var(--shop-accent) 6%))}.pdp-media-cell i{font-size:34px}.pdp-media-cell b{align-self:flex-end;color:var(--shop-muted);font-size:12px;letter-spacing:.12em}.pdp-media-cell.is-active{outline:2px solid var(--shop-accent);outline-offset:-2px}.pdp-purchase-panel{padding:44px 34px;display:flex;flex-direction:column;justify-content:center}.pdp-kicker{margin:0 0 16px;color:var(--shop-accent);font-size:9px;font-weight:900;letter-spacing:.16em}.pdp-purchase-panel h1{margin:0;font-family:"Noto Serif KR",Georgia,serif;font-size:clamp(30px,4.5vw,54px);line-height:1.05;letter-spacing:-.045em}.pdp-description{margin:18px 0 0;color:var(--shop-muted);font-size:12px;line-height:1.85}.pdp-price{margin-top:22px;font-size:20px}.pdp-service-promise{margin-top:22px;padding:15px 0;display:grid;grid-template-columns:34px 1fr;align-items:center;gap:12px;border-top:1px solid var(--shop-line);border-bottom:1px solid var(--shop-line)}.pdp-service-promise>i{color:var(--shop-accent);font-size:20px}.pdp-service-promise div{display:flex;flex-direction:column}.pdp-service-promise strong{font-size:12px}.pdp-service-promise span{margin-top:3px;color:var(--shop-muted);font-size:10px;line-height:1.5}.pdp-option-block{margin-top:20px}.pdp-option-block>span{display:block;margin-bottom:9px;color:var(--shop-muted);font-size:9px;font-weight:800;letter-spacing:.12em}.pdp-option-block>div{display:flex;gap:6px}.pdp-option-block button{min-width:44px;height:40px;border:1px solid var(--shop-line);color:var(--shop-ink);background:var(--shop-surface);font-size:11px;font-weight:800}.pdp-option-block button.is-active{border-color:var(--shop-ink);color:var(--shop-surface);background:var(--shop-ink)}.pdp-stepper{width:136px;display:grid!important;grid-template-columns:40px 1fr 40px;border:1px solid var(--shop-line)}.pdp-stepper button{min-width:0;border:0}.pdp-stepper strong{display:grid;place-items:center;border-right:1px solid var(--shop-line);border-left:1px solid var(--shop-line);font-size:12px}.pdp-measurement-board,.pdp-bulk-board{margin-top:20px;display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--shop-accent)}.pdp-bulk-board{grid-template-columns:1fr 2fr}.pdp-measurement-board div,.pdp-bulk-board div{padding:12px;display:flex;flex-direction:column;border-right:1px solid var(--shop-line)}.pdp-measurement-board div:last-child,.pdp-bulk-board div:last-child{border-right:0}.pdp-measurement-board span,.pdp-bulk-board span{color:var(--shop-muted);font-size:9px;font-weight:900}.pdp-measurement-board strong,.pdp-bulk-board strong{margin-top:4px;font-size:12px}.pdp-routine-board{margin-top:20px;display:grid;grid-template-columns:repeat(3,1fr);align-items:center;gap:5px}.pdp-routine-board>*{padding:11px 4px;border-bottom:3px solid var(--shop-line);font-size:9px;text-align:center}.pdp-routine-board strong{border-color:var(--shop-accent);color:var(--shop-accent)}.pdp-pickup-board{margin-top:20px;padding:14px;display:grid;grid-template-columns:28px 1fr;gap:10px;border-radius:12px;color:white;background:var(--shop-accent)}.pdp-pickup-board i{font-size:18px}.pdp-pickup-board div{display:flex;flex-direction:column}.pdp-pickup-board strong{font-size:11px}.pdp-pickup-board span{margin-top:3px;font-size:9px;opacity:.84}.pdp-primary-actions{margin-top:24px;display:grid;grid-template-columns:88px 1fr;gap:8px}.pdp-primary-actions button{min-height:52px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--shop-line);font-size:11px;font-weight:900}.pdp-save{color:var(--shop-ink);background:var(--shop-surface)}.pdp-save.is-favorite{color:var(--shop-accent)}.pdp-add{justify-content:space-between!important;padding:0 18px;border-color:var(--shop-accent)!important;color:white;background:var(--shop-accent)}.pdp-add:disabled{opacity:.4}.pdp-depth{padding:0 28px;background:var(--shop-surface)}.pdp-depth-index{min-height:64px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--shop-line);color:var(--shop-muted);font-size:9px;font-weight:900;letter-spacing:.12em}.pdp-story-section{min-height:280px;padding:38px 0;display:grid;grid-template-columns:54px minmax(0,1fr) minmax(150px,30%);gap:28px;align-items:center;border-bottom:1px solid var(--shop-line)}.pdp-story-number{align-self:start;color:var(--shop-accent);font-size:11px;font-weight:900}.pdp-story-copy p{margin:0;color:var(--shop-muted);font-size:9px;font-weight:900;letter-spacing:.14em}.pdp-story-copy h2{max-width:580px;margin:10px 0 0;font-family:"Noto Serif KR",Georgia,serif;font-size:clamp(24px,3.6vw,42px);line-height:1.15;letter-spacing:-.04em}.pdp-story-copy span{display:block;max-width:600px;margin-top:16px;color:var(--shop-muted);font-size:11px;line-height:1.9}.pdp-story-visual{aspect-ratio:4/3;display:grid;place-items:center;border:1px solid var(--shop-line);color:var(--shop-accent);background:linear-gradient(145deg,var(--shop-bg),var(--shop-surface))}.pdp-story-visual i{font-size:38px}.pdp-story-visual.is-2{border-radius:50%}.pdp-related{padding:44px 28px 70px;background:var(--shop-bg)}.pdp-related-head{display:flex;align-items:flex-end;justify-content:space-between}.pdp-related-head p{margin:0;color:var(--shop-accent);font-size:9px;font-weight:900;letter-spacing:.15em}.pdp-related-head h2{margin:8px 0 0;font-family:"Noto Serif KR",Georgia,serif;font-size:28px}.pdp-related-head>span{font-size:46px;font-weight:900;opacity:.12}.pdp-related-rail{margin-top:22px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.pdp-related-rail button{text-align:left}.pdp-related-rail button>span{aspect-ratio:1;display:grid;place-items:center;overflow:hidden;border:1px solid var(--shop-line);color:var(--shop-accent);background:var(--shop-surface)}.pdp-related-rail img{width:100%;height:100%;object-fit:cover}.pdp-related-rail i{font-size:28px}.pdp-related-rail strong{margin-top:9px;display:block;font-size:11px}.pdp-related-rail small{display:block;margin-top:4px;color:var(--shop-muted);font-size:9px}.pdp-missing{min-height:100%;display:grid;place-content:center;text-align:center}.pdp-missing span{font-size:72px;font-weight:900;opacity:.12}.pdp-missing button{margin-top:16px;padding:12px 18px;color:white;background:#111}
.shopping-pdp[data-pdp-mode='fulfillment-console'] .pdp-stage{grid-template-columns:minmax(320px,.8fr) minmax(360px,1.2fr)}.shopping-pdp[data-pdp-mode='fulfillment-console'] .pdp-purchase-panel h1{font-family:inherit;font-weight:900}.shopping-pdp[data-pdp-mode='fulfillment-console'] .pdp-gallery{grid-template-rows:minmax(360px,1fr) 110px}.shopping-pdp[data-pdp-mode='object-editorial'] .pdp-stage{grid-template-columns:1.25fr .75fr}.shopping-pdp[data-pdp-mode='object-editorial'] .pdp-gallery{padding:0;grid-template-rows:minmax(520px,1fr) 0;grid-template-columns:1fr}.shopping-pdp[data-pdp-mode='object-editorial'] .pdp-gallery .pdp-media-cell:not(:first-child){display:none}.shopping-pdp[data-pdp-mode='fresh-specification'] .pdp-media-cell:first-child{border-radius:180px 180px 0 0}.shopping-pdp[data-pdp-mode='streetwear-sheet']{background:#121417}.shopping-pdp[data-pdp-mode='streetwear-sheet'] .pdp-appbar,.shopping-pdp[data-pdp-mode='streetwear-sheet'] .pdp-appbar button,.shopping-pdp[data-pdp-mode='streetwear-sheet'] .pdp-stage,.shopping-pdp[data-pdp-mode='streetwear-sheet'] .pdp-depth{background:#171a20}.shopping-pdp[data-pdp-mode='streetwear-sheet'] .pdp-stage{grid-template-columns:1.3fr .7fr}.shopping-pdp[data-pdp-mode='streetwear-sheet'] .pdp-gallery{padding:0;grid-template-columns:1fr;grid-template-rows:minmax(620px,1fr)}.shopping-pdp[data-pdp-mode='streetwear-sheet'] .pdp-gallery .pdp-media-cell:not(:first-child){display:none}.shopping-pdp[data-pdp-mode='room-specification'] .pdp-gallery{background:linear-gradient(90deg,var(--shop-line) 1px,transparent 1px),linear-gradient(var(--shop-line) 1px,transparent 1px);background-size:24px 24px}.shopping-pdp[data-pdp-mode='routine-guide'] .pdp-gallery{border-radius:0 0 180px 0;background:color-mix(in srgb,var(--shop-accent) 8%,white)}.shopping-pdp[data-pdp-mode='bulk-value-sheet'] .pdp-stage{border-top:10px solid var(--shop-accent-2)}.shopping-pdp[data-pdp-mode='pickup-ticket'] .pdp-stage{min-height:560px;grid-template-columns:minmax(260px,.7fr) 1.3fr}.shopping-pdp[data-pdp-mode='pickup-ticket'] .pdp-gallery{grid-template-rows:minmax(320px,1fr) 90px}.shopping-pdp[data-pdp-mode='fashion-commerce'] .pdp-stage{grid-template-columns:1.15fr .85fr}.shopping-pdp[data-pdp-mode='fashion-commerce'] .pdp-gallery{grid-template-rows:minmax(520px,1fr) 120px}.shopping-pdp[data-pdp-mode='atelier-consultation'] .pdp-stage{grid-template-columns:.82fr 1.18fr}.shopping-pdp[data-pdp-mode='atelier-consultation'] .pdp-purchase-panel{padding-right:9vw}.shopping-pdp[data-pdp-mode='private-hall'] .pdp-stage{grid-template-columns:1.35fr .65fr}.shopping-pdp[data-pdp-mode='private-hall'] .pdp-gallery{padding:0;grid-template-columns:1fr;grid-template-rows:minmax(560px,1fr)}.shopping-pdp[data-pdp-mode='private-hall'] .pdp-gallery .pdp-media-cell:not(:first-child){display:none}.shopping-pdp[data-pdp-mode='private-hall'] .pdp-purchase-panel{border-left:12px solid var(--shop-bg)}
@media(max-width:760px){.pdp-stage,.shopping-pdp[data-pdp-mode] .pdp-stage{display:block;min-height:0}.pdp-gallery,.shopping-pdp[data-pdp-mode] .pdp-gallery{min-height:420px;padding:12px;grid-template-columns:1fr 1fr;grid-template-rows:320px 90px}.shopping-pdp[data-pdp-mode] .pdp-gallery .pdp-media-cell:not(:first-child){display:block}.pdp-purchase-panel,.shopping-pdp[data-pdp-mode='atelier-consultation'] .pdp-purchase-panel{padding:30px 20px 26px}.pdp-story-section{grid-template-columns:36px 1fr;gap:12px}.pdp-story-visual{grid-column:2}.pdp-depth{padding:0 20px}.pdp-related{padding:34px 20px 110px}.pdp-related-rail{grid-template-columns:repeat(2,minmax(0,1fr))}.pdp-primary-actions{position:sticky;bottom:10px;z-index:10;padding:8px;border:1px solid var(--shop-line);background:color-mix(in srgb,var(--shop-surface) 92%,transparent);backdrop-filter:blur(14px)}}
</style>
