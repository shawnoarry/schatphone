<script setup>
import { computed } from 'vue'
import { resolveShoppingExperienceModel } from './shopping-experience-model'

const props = defineProps({
  storefront: { type: String, default: 'city_market' },
  serviceLabel: { type: String, default: '' },
  category: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  products: { type: Array, default: () => [] },
  page: { type: Number, default: 1 },
  pageCount: { type: Number, default: 1 },
  totalCount: { type: Number, default: 0 },
  searchQuery: { type: String, default: '' },
  favoritesOnly: { type: Boolean, default: false },
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

const emit = defineEmits([
  'back',
  'select-category',
  'open-product',
  'add-to-cart',
  'toggle-favorite',
  'open-cart',
  'open-orders',
  'change-page',
  'update:searchQuery',
  'submit-search',
])

const model = computed(() => resolveShoppingExperienceModel(props.storefront))
const localize = (copy) => props.languageBase === 'zh' ? copy[0] : copy[1]
const searchChanged = (event) => emit('update:searchQuery', event.target.value)
const numberedPages = computed(() => {
  const start = Math.max(1, Math.min(props.page - 2, Math.max(1, props.pageCount - 4)))
  return Array.from({ length: Math.min(5, props.pageCount) }, (_, index) => start + index)
})
</script>

<template>
  <main
    class="shopping-collection"
    :data-storefront="storefront"
    :data-list-mode="model.listMode"
    data-testid="shopping-collection-page"
  >
    <header class="collection-appbar">
      <button type="button" class="collection-icon-button" :aria-label="localize(['返回店铺首页', 'Back to store home'])" @click="emit('back')">
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>
      <div class="collection-appbar-title">
        <span>{{ serviceLabel }}</span>
        <strong>{{ favoritesOnly ? localize(['收藏清单', 'Saved']) : category?.label || localize(['全部商品', 'All products']) }}</strong>
      </div>
      <div class="collection-appbar-actions">
        <button type="button" class="collection-icon-button" :aria-label="localize(['订单', 'Orders'])" @click="emit('open-orders')">
          <i class="fas fa-receipt" aria-hidden="true"></i>
        </button>
        <button type="button" class="collection-icon-button" :aria-label="localize(['购物车', 'Cart'])" @click="emit('open-cart')">
          <i class="fas fa-bag-shopping" aria-hidden="true"></i><b v-if="cartQuantity">{{ cartQuantity }}</b>
        </button>
      </div>
    </header>

    <section class="collection-intro">
      <div class="collection-intro-copy">
        <p>{{ localize(model.indexLabel) }}</p>
        <h1>{{ favoritesOnly ? localize(['为稍后保留的选择', 'Your considered edit']) : category?.label || localize(['商品目录', 'Catalog']) }}</h1>
        <span>{{ totalCount }} {{ localize(['件商品', 'items']) }} · {{ localize(model.secondaryFact) }}</span>
      </div>
      <div v-if="storefront === 'room_planner'" class="collection-signature collection-room-plan" aria-hidden="true">
        <span>240</span><i></i><span>180</span><b>ROOM 01</b>
      </div>
      <div v-else-if="storefront === 'fresh_market'" class="collection-signature collection-temperature" aria-hidden="true">
        <span>CHILLED</span><span>FROZEN</span><span>AMBIENT</span>
      </div>
      <div v-else-if="storefront === 'fashion_editorial' || storefront === 'fashion_catalog'" class="collection-signature collection-fashion-issue" aria-hidden="true">
        <b>ISSUE</b><span>08 / SEOUL</span>
      </div>
      <div v-else-if="storefront === 'buyer_atelier' || storefront === 'luxury_hall'" class="collection-signature collection-edition" aria-hidden="true">
        <span>PRIVATE</span><b>EDIT Nº{{ String(page).padStart(2, '0') }}</b>
      </div>
      <div v-else class="collection-signature collection-index-mark" aria-hidden="true">
        <b>{{ String(totalCount).padStart(2, '0') }}</b><span>INDEX</span>
      </div>
    </section>

    <form class="collection-search" @submit.prevent="emit('submit-search')">
      <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
      <input
        type="search"
        role="searchbox"
        :value="searchQuery"
        :placeholder="localize(['在本店搜索商品、品牌或用途', 'Search products, labels, or uses'])"
        @input="searchChanged"
      />
      <button type="submit">{{ localize(['搜索', 'Search']) }}</button>
    </form>

    <nav class="collection-category-rail" :aria-label="localize(['商品分类', 'Product categories'])">
      <button
        v-for="item in categories"
        :key="item.key"
        type="button"
        :class="{ 'is-active': item.key === category?.key }"
        @click="emit('select-category', item.key)"
      >
        <span>{{ item.label }}</span><small>{{ item.count }}</small>
      </button>
    </nav>

    <section v-if="products.length" class="collection-results" :aria-label="localize(['商品结果', 'Product results'])">
      <article
        v-for="(product, index) in products"
        :key="product.id"
        class="collection-product"
        :data-rank="index + 1 + (page - 1) * products.length"
        :data-testid="`shopping-product-${product.id}`"
      >
        <button type="button" class="collection-product-media" @click="emit('open-product', product.id)">
          <img v-if="productImageUrl(product)" :src="productImageUrl(product)" :alt="product.image?.alt || productDisplayTitle(product)" />
          <span v-else class="collection-product-placeholder">
            <i :class="productCategoryIcon(product)" aria-hidden="true"></i>
            <b>{{ String(index + 1 + (page - 1) * products.length).padStart(2, '0') }}</b>
          </span>
          <em v-if="storefront === 'fashion_catalog' || storefront === 'care_lab'">#{{ index + 1 + (page - 1) * products.length }}</em>
        </button>
        <div class="collection-product-copy">
          <div class="collection-product-meta">
            <span>{{ stockStatusLabel(product.stockStatus) }}</span>
            <button type="button" :class="{ 'is-favorite': isProductFavorite(product.id) }" :aria-label="localize(['收藏商品', 'Save product'])" @click="emit('toggle-favorite', product.id)">
              <i class="fas fa-heart" aria-hidden="true"></i>
            </button>
          </div>
          <button type="button" class="collection-product-title" @click="emit('open-product', product.id)">
            <small>{{ serviceLabel }}</small>
            <strong>{{ productDisplayTitle(product) }}</strong>
          </button>
          <p>{{ productDisplayDescription(product) }}</p>
          <div class="collection-product-buyline">
            <strong>{{ formatPrice(product) }}</strong>
            <button type="button" :disabled="product.stockStatus === 'sold_out'" @click="emit('add-to-cart', product.id)">
              <i class="fas fa-plus" aria-hidden="true"></i><span>{{ localize(['加入', 'Add']) }}</span>
            </button>
          </div>
        </div>
      </article>
    </section>
    <section v-else class="collection-empty">
      <span>00</span>
      <h2>{{ localize(['没有找到商品', 'No products found']) }}</h2>
      <p>{{ localize(['换一个分类或关键词继续逛。', 'Try another category or search term.']) }}</p>
    </section>

    <nav v-if="pageCount > 1" class="collection-pagination" :aria-label="localize(['商品分页', 'Catalog pagination'])" data-testid="shopping-pagination">
      <button type="button" :disabled="page <= 1" @click="emit('change-page', page - 1)"><i class="fas fa-arrow-left" aria-hidden="true"></i></button>
      <button v-for="pageNumber in numberedPages" :key="pageNumber" type="button" :class="{ 'is-active': pageNumber === page }" :aria-current="pageNumber === page ? 'page' : undefined" @click="emit('change-page', pageNumber)">{{ String(pageNumber).padStart(2, '0') }}</button>
      <button type="button" :disabled="page >= pageCount" @click="emit('change-page', page + 1)"><i class="fas fa-arrow-right" aria-hidden="true"></i></button>
    </nav>
  </main>
</template>

<style scoped>
.shopping-collection{min-height:100%;color:var(--shop-ink);background:var(--shop-bg);font-family:"Noto Sans KR","Pretendard",system-ui,sans-serif}.collection-appbar{position:sticky;top:0;z-index:20;min-height:64px;padding:10px 16px;display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:10px;border-bottom:1px solid var(--shop-line);background:color-mix(in srgb,var(--shop-bg) 92%,transparent);backdrop-filter:blur(16px)}.collection-icon-button{position:relative;width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--shop-line);border-radius:50%;color:var(--shop-ink);background:var(--shop-surface)}.collection-icon-button b{position:absolute;right:-3px;top:-4px;min-width:18px;height:18px;padding:0 4px;display:grid;place-items:center;border-radius:9px;color:white;background:var(--shop-accent);font-size:9px}.collection-appbar-title{min-width:0;display:flex;flex-direction:column}.collection-appbar-title span{overflow:hidden;color:var(--shop-muted);font-size:9px;font-weight:800;letter-spacing:.12em;text-overflow:ellipsis;white-space:nowrap}.collection-appbar-title strong{overflow:hidden;font-size:15px;text-overflow:ellipsis;white-space:nowrap}.collection-appbar-actions{display:flex;gap:8px}.collection-intro{min-height:250px;padding:34px 20px 26px;display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,34%);align-items:end;gap:20px;border-bottom:1px solid var(--shop-line);background:var(--shop-surface)}.collection-intro-copy p{margin:0 0 10px;color:var(--shop-accent);font-size:10px;font-weight:900;letter-spacing:.16em}.collection-intro-copy h1{max-width:520px;margin:0;font-family:"Noto Serif KR",Georgia,serif;font-size:clamp(30px,7vw,62px);font-weight:700;line-height:1.02;letter-spacing:-.055em}.collection-intro-copy span{display:block;max-width:520px;margin-top:18px;color:var(--shop-muted);font-size:11px;line-height:1.6}.collection-signature{min-height:138px;align-self:stretch}.collection-index-mark{display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end;border-left:1px solid var(--shop-line)}.collection-index-mark b{font-size:60px;line-height:.9}.collection-index-mark span{margin-top:9px;color:var(--shop-accent);font-size:10px;font-weight:900;letter-spacing:.2em}.collection-temperature{display:grid;grid-template-rows:repeat(3,1fr);gap:5px}.collection-temperature span{padding:10px;display:flex;align-items:center;border-radius:5px;color:white;background:var(--shop-accent);font-size:9px;font-weight:900;letter-spacing:.12em}.collection-temperature span:nth-child(2){opacity:.72}.collection-temperature span:nth-child(3){color:var(--shop-ink);background:var(--shop-bg)}.collection-room-plan{position:relative;border:2px solid var(--shop-accent);background:linear-gradient(90deg,transparent 49.5%,var(--shop-line) 50%,transparent 50.5%)}.collection-room-plan:after{position:absolute;inset:18px;border:1px dashed var(--shop-accent-2);content:""}.collection-room-plan span{position:absolute;padding:2px 4px;color:var(--shop-accent);background:var(--shop-surface);font-size:9px}.collection-room-plan span:first-child{left:38%;top:-8px}.collection-room-plan span:nth-child(3){right:-8px;top:45%;transform:rotate(90deg)}.collection-room-plan b{position:absolute;left:26px;bottom:24px;font-size:11px}.collection-fashion-issue,.collection-edition{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;border-top:8px solid var(--shop-accent);border-bottom:1px solid var(--shop-line)}.collection-fashion-issue b{font-size:42px;letter-spacing:-.08em}.collection-fashion-issue span,.collection-edition span{font-size:9px;font-weight:900;letter-spacing:.16em}.collection-edition b{font-family:Georgia,serif;font-size:24px;font-style:italic}.collection-search{margin:20px;min-height:50px;display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:8px;border-bottom:2px solid var(--shop-ink)}.collection-search input{min-width:0;border:0;outline:0;color:var(--shop-ink);background:transparent;font-size:13px}.collection-search button{height:34px;padding:0 13px;border-radius:4px;color:var(--shop-surface);background:var(--shop-ink);font-size:11px;font-weight:800}.collection-category-rail{padding:0 20px 18px;display:flex;gap:8px;overflow:auto}.collection-category-rail button{flex:0 0 auto;padding:10px 12px;display:flex;align-items:center;gap:8px;border:1px solid var(--shop-line);border-radius:999px;color:var(--shop-muted);background:var(--shop-surface);font-size:11px;font-weight:700}.collection-category-rail button.is-active{border-color:var(--shop-ink);color:var(--shop-surface);background:var(--shop-ink)}.collection-category-rail small{opacity:.64}.collection-results{padding:0 20px 22px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 16px}.collection-product{min-width:0}.collection-product-media{position:relative;width:100%;aspect-ratio:4/5;display:block;overflow:hidden;border:1px solid var(--shop-line);border-radius:2px;background:var(--shop-surface)}.collection-product-media img{width:100%;height:100%;display:block;object-fit:cover}.collection-product-placeholder{width:100%;height:100%;padding:18px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;color:var(--shop-accent);background:linear-gradient(145deg,var(--shop-surface),var(--shop-bg))}.collection-product-placeholder i{font-size:34px}.collection-product-placeholder b{align-self:flex-end;color:var(--shop-muted);font-size:42px}.collection-product-media em{position:absolute;left:8px;top:8px;padding:4px 6px;color:white;background:var(--shop-ink);font-size:9px;font-style:normal;font-weight:900}.collection-product-copy{padding-top:11px}.collection-product-meta{display:flex;align-items:center;justify-content:space-between;color:var(--shop-muted);font-size:9px;font-weight:800;text-transform:uppercase}.collection-product-meta button{width:30px;height:30px;color:var(--shop-muted)}.collection-product-meta button.is-favorite{color:var(--shop-accent)}.collection-product-title{width:100%;display:flex;flex-direction:column;align-items:flex-start;text-align:left}.collection-product-title small{margin-top:4px;color:var(--shop-muted);font-size:9px}.collection-product-title strong{margin-top:3px;font-size:14px;line-height:1.35}.collection-product-copy>p{min-height:34px;margin:7px 0 0;display:-webkit-box;overflow:hidden;color:var(--shop-muted);font-size:10px;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:2}.collection-product-buyline{margin-top:11px;padding-top:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid var(--shop-line)}.collection-product-buyline>strong{font-size:12px}.collection-product-buyline button{min-width:42px;height:34px;padding:0 10px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:3px;color:white;background:var(--shop-accent);font-size:10px;font-weight:800}.collection-product-buyline button:disabled{opacity:.35}.collection-empty{margin:0 20px;padding:64px 20px;text-align:center;border-top:1px solid var(--shop-line)}.collection-empty span{font-size:58px;font-weight:900;opacity:.12}.collection-empty h2{margin:8px 0 0;font-size:18px}.collection-empty p{color:var(--shop-muted);font-size:11px}.collection-pagination{padding:18px 20px 36px;display:flex;align-items:center;justify-content:center;gap:6px;border-top:1px solid var(--shop-line)}.collection-pagination button{width:38px;height:38px;border:1px solid var(--shop-line);border-radius:50%;color:var(--shop-muted);background:var(--shop-surface);font-size:10px;font-weight:900}.collection-pagination button.is-active{border-color:var(--shop-accent);color:white;background:var(--shop-accent)}.collection-pagination button:disabled{opacity:.25}
.shopping-collection[data-list-mode='fulfillment-list'] .collection-intro{min-height:190px;background:linear-gradient(135deg,#fff 0 67%,color-mix(in srgb,var(--shop-accent-2) 12%,#fff) 67%)}.shopping-collection[data-list-mode='fulfillment-list'] .collection-intro-copy h1{font-family:inherit;font-size:clamp(28px,6vw,48px);font-weight:900}.shopping-collection[data-list-mode='fulfillment-list'] .collection-results{gap:8px;grid-template-columns:1fr}.shopping-collection[data-list-mode='fulfillment-list'] .collection-product{padding:10px;display:grid;grid-template-columns:112px 1fr;gap:14px;border:1px solid var(--shop-line);border-radius:12px;background:var(--shop-surface)}.shopping-collection[data-list-mode='fulfillment-list'] .collection-product-media{aspect-ratio:1;border-radius:8px}.shopping-collection[data-list-mode='fulfillment-list'] .collection-product-copy{padding-top:0}.shopping-collection[data-list-mode='fulfillment-list'] .collection-product-copy>p{min-height:0}.shopping-collection[data-list-mode='fresh-aisle'] .collection-product-media{aspect-ratio:3/4;border-radius:14px 14px 4px 4px}.shopping-collection[data-list-mode='fresh-aisle'] .collection-product:nth-child(3n) {grid-column:1/-1;display:grid;grid-template-columns:1.2fr 1fr;gap:14px}.shopping-collection[data-list-mode='fresh-aisle'] .collection-product:nth-child(3n) .collection-product-media{aspect-ratio:16/10}.shopping-collection[data-list-mode='drop-lookbook']{background:#121417}.shopping-collection[data-list-mode='drop-lookbook'] .collection-intro,.shopping-collection[data-list-mode='drop-lookbook'] .collection-appbar,.shopping-collection[data-list-mode='drop-lookbook'] .collection-icon-button,.shopping-collection[data-list-mode='drop-lookbook'] .collection-category-rail button,.shopping-collection[data-list-mode='drop-lookbook'] .collection-product-media,.shopping-collection[data-list-mode='drop-lookbook'] .collection-pagination button{background:#171a20}.shopping-collection[data-list-mode='drop-lookbook'] .collection-results{grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.shopping-collection[data-list-mode='drop-lookbook'] .collection-product{grid-column:span 3;padding-bottom:22px}.shopping-collection[data-list-mode='drop-lookbook'] .collection-product:nth-child(3n+1){grid-column:span 4}.shopping-collection[data-list-mode='drop-lookbook'] .collection-product:nth-child(3n+2){grid-column:span 2}.shopping-collection[data-list-mode='drop-lookbook'] .collection-product-media{aspect-ratio:3/4}.shopping-collection[data-list-mode='room-inventory'] .collection-results{grid-template-columns:1fr}.shopping-collection[data-list-mode='room-inventory'] .collection-product{display:grid;grid-template-columns:minmax(180px,42%) 1fr;gap:18px;align-items:end}.shopping-collection[data-list-mode='room-inventory'] .collection-product-media{aspect-ratio:4/3}.shopping-collection[data-list-mode='routine-ranking'] .collection-product-media{aspect-ratio:1;border-radius:50% 50% 12px 12px}.shopping-collection[data-list-mode='warehouse-ledger'] .collection-results{grid-template-columns:1fr;gap:0;border-top:3px solid var(--shop-ink)}.shopping-collection[data-list-mode='warehouse-ledger'] .collection-product{padding:12px 0;display:grid;grid-template-columns:92px 1fr;gap:14px;border-bottom:1px solid var(--shop-line)}.shopping-collection[data-list-mode='warehouse-ledger'] .collection-product-media{aspect-ratio:1;border-radius:0}.shopping-collection[data-list-mode='pickup-shelf'] .collection-results{grid-template-columns:1fr;gap:10px}.shopping-collection[data-list-mode='pickup-shelf'] .collection-product{padding:10px;display:grid;grid-template-columns:96px 1fr;gap:12px;border:1px solid var(--shop-line);border-radius:18px;background:var(--shop-surface)}.shopping-collection[data-list-mode='pickup-shelf'] .collection-product-media{aspect-ratio:1;border-radius:12px}.shopping-collection[data-list-mode='fashion-ranking'] .collection-results{grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 6px}.shopping-collection[data-list-mode='fashion-ranking'] .collection-product-media{aspect-ratio:3/4}.shopping-collection[data-list-mode='fashion-ranking'] .collection-product-copy>p{display:none}.shopping-collection[data-list-mode='buyer-rack'] .collection-results{grid-template-columns:1fr;gap:36px}.shopping-collection[data-list-mode='buyer-rack'] .collection-product{display:grid;grid-template-columns:1.1fr 1fr;gap:22px;align-items:center}.shopping-collection[data-list-mode='buyer-rack'] .collection-product:nth-child(even){grid-template-columns:1fr 1.1fr}.shopping-collection[data-list-mode='buyer-rack'] .collection-product:nth-child(even) .collection-product-media{order:2}.shopping-collection[data-list-mode='luxury-hall'] .collection-results{grid-template-columns:1fr;gap:48px}.shopping-collection[data-list-mode='luxury-hall'] .collection-product-media{aspect-ratio:16/10}.shopping-collection[data-list-mode='luxury-hall'] .collection-product-copy{max-width:72%;margin:-44px 18px 0 auto;padding:18px;position:relative;background:var(--shop-surface)}
@media(max-width:520px){.collection-intro{min-height:220px;padding:28px 16px 22px;grid-template-columns:1fr 108px}.collection-search{margin:16px}.collection-category-rail{padding-right:16px;padding-left:16px}.collection-results{padding-right:16px;padding-left:16px}.shopping-collection[data-list-mode='fashion-ranking'] .collection-results{grid-template-columns:repeat(2,minmax(0,1fr))}.shopping-collection[data-list-mode='buyer-rack'] .collection-product,.shopping-collection[data-list-mode='buyer-rack'] .collection-product:nth-child(even){grid-template-columns:1fr}.shopping-collection[data-list-mode='buyer-rack'] .collection-product:nth-child(even) .collection-product-media{order:0}.shopping-collection[data-list-mode='luxury-hall'] .collection-product-copy{max-width:calc(100% - 24px);margin:-28px 12px 0}.shopping-collection[data-list-mode='room-inventory'] .collection-product{grid-template-columns:1fr}.shopping-collection[data-list-mode='drop-lookbook'] .collection-results{grid-template-columns:repeat(2,minmax(0,1fr))}.shopping-collection[data-list-mode='drop-lookbook'] .collection-product,.shopping-collection[data-list-mode='drop-lookbook'] .collection-product:nth-child(3n+1),.shopping-collection[data-list-mode='drop-lookbook'] .collection-product:nth-child(3n+2){grid-column:span 1}}
</style>
