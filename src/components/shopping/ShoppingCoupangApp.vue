<script setup>
import {
  SHOPPING_STOREFRONT_EVENTS,
  SHOPPING_STOREFRONT_PROPS,
  localizeShoppingCopy,
} from './shopping-storefront-contract'

const props = defineProps(SHOPPING_STOREFRONT_PROPS)
const emit = defineEmits(SHOPPING_STOREFRONT_EVENTS)
const localize = (zh, en) => localizeShoppingCopy(props.languageBase, zh, en)
const searchChanged = (event) => emit('update:searchQuery', event.target.value)
const iconForCategory = (category) => category.icon || 'fas fa-tag'
const quickSearches = Object.freeze([
  { zh: '雨天通勤', en: 'Rainy commute', noteZh: '伞、收纳与随身用品', noteEn: 'Umbrellas, bags, daily carry', icon: 'fas fa-cloud-rain', tone: 'is-blue' },
  { zh: '厨房补货', en: 'Kitchen restock', noteZh: '常温、清洁与餐桌用品', noteEn: 'Pantry, cleaning, table', icon: 'fas fa-kitchen-set', tone: 'is-green' },
  { zh: '临时礼物', en: 'Last-minute gifts', noteZh: '今天就能决定的心意', noteEn: 'Easy gifts to choose today', icon: 'fas fa-gift', tone: 'is-red' },
])
const chooseSearch = (term) => {
  emit('update:searchQuery', localize(term.zh, term.en))
  emit('submit-search')
}
</script>

<template>
  <main class="cp-home shopping-storefront-header" data-storefront="city_market" data-testid="shopping-coupang-home">
    <header class="cp-shell-header">
      <div class="cp-topline">
        <button type="button" class="cp-icon" :aria-label="localize('返回主屏幕', 'Back to Home')" data-testid="shopping-go-home" @click="emit('go-home')"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
        <div class="cp-brand"><span><img v-if="brandAssetUrl" :src="brandAssetUrl" alt="" /><b v-else>C</b></span><h1>{{ activeLabel || 'Coupang' }}</h1></div>
        <nav class="cp-head-actions" :aria-label="localize('订单与购物车', 'Orders and cart')">
          <button type="button" class="cp-icon" :aria-label="localize('订单', 'Orders')" @click="emit('open-orders')"><i class="fas fa-receipt" aria-hidden="true"></i><b v-if="orderCount">{{ orderCount }}</b></button>
          <button type="button" class="cp-icon" :aria-label="localize('购物车', 'Cart')" @click="emit('open-cart')"><i class="fas fa-cart-shopping" aria-hidden="true"></i><b v-if="cartQuantity">{{ cartQuantity }}</b></button>
        </nav>
      </div>

      <div v-if="mapReference?.placeId" class="cp-address" data-testid="shopping-map-reference" :data-map-place-id="mapReference.placeId">
        <i class="fas fa-location-dot" aria-hidden="true"></i><span>{{ localize('配送到', 'Deliver to') }}</span><strong>{{ mapReference.district }}</strong><small>{{ localize('结算时确认可用时段', 'Confirm available window at checkout') }}</small>
      </div>

      <form class="cp-search" role="search" @submit.prevent="emit('submit-search')">
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
        <input type="search" role="searchbox" :aria-label="localize('搜索商品', 'Search products')" :placeholder="localize('搜索商品或生活场景', 'Search products or daily needs')" :value="searchQuery" @input="searchChanged" />
        <button type="submit">{{ localize('搜索', 'Search') }}</button>
      </form>
      <div class="cp-search-suggestions"><span>{{ localize('试试', 'Try') }}</span><button v-for="term in quickSearches" :key="term.en" type="button" @click="chooseSearch(term)">{{ localize(term.zh, term.en) }}</button></div>
    </header>

    <section class="cp-hero">
      <div class="cp-hero-media"><img v-if="coverImageUrl" :src="coverImageUrl" :alt="localize('Coupang 城市补给专题', 'Coupang city restock edit')" /><div v-else class="cp-hero-placeholder" aria-hidden="true"><i class="fas fa-box-open"></i><span>COUPANG / SEOUL</span></div></div>
      <div class="cp-hero-copy"><span>{{ localize('城市补给清单', 'CITY RESTOCK') }}</span><h2>{{ localize('今天要用的，先找到。', 'Find today’s needs first.') }}</h2><p>{{ localize('通勤、厨房和临时礼物，都可以从一个具体需要开始。', 'Start with one specific need—from commuting and kitchens to last-minute gifts.') }}</p><button type="button" @click="emit('select-category', 'mall')">{{ localize('查看全部商品', 'Shop all products') }} <i class="fas fa-arrow-right" aria-hidden="true"></i></button></div>
    </section>

    <section class="cp-task-grid" :aria-label="localize('快捷购物任务', 'Quick shopping tasks')">
      <button v-for="term in quickSearches" :key="term.en" type="button" @click="chooseSearch(term)"><span :class="term.tone"><i :class="term.icon"></i></span><div><strong>{{ localize(term.zh, term.en) }}</strong><small>{{ localize(term.noteZh, term.noteEn) }}</small></div><i class="fas fa-chevron-right"></i></button>
    </section>

    <section class="cp-section cp-category-section">
      <header><div><span>SHOP BY NEED</span><h2>{{ localize('按需要逛', 'Shop by need') }}</h2></div><small>{{ localize('通勤、家居、数码与日常补给', 'Commute, home, digital, and daily needs') }}</small></header>
      <div class="cp-category-row"><button v-for="category in categoryCards" :key="category.key" type="button" :class="{ 'is-active': category.active }" :data-testid="`shopping-category-${category.key}`" @click="emit('select-category', category.key)"><span><i :class="iconForCategory(category)" aria-hidden="true"></i></span><strong>{{ category.label }}</strong><small>{{ category.count }}</small></button></div>
    </section>

    <section id="shopping-products" class="cp-section cp-recommendations">
      <header><div><span>{{ favoritesOnly ? 'SAVED ITEMS' : 'READY TO SHOP' }}</span><h2>{{ favoritesOnly ? localize('稍后再买', 'Saved for later') : localize('今日推荐', 'Recommended today') }}</h2></div><button v-if="favoritesOnly" type="button" @click="emit('show-all')">{{ localize('查看全部', 'View all') }}</button><button v-else type="button" @click="emit('select-category', activeCategory?.key || 'mall')">{{ localize('更多', 'More') }} <i class="fas fa-chevron-right"></i></button></header>
      <div v-if="!visibleProducts.length" class="cp-empty"><i class="fas fa-box-open"></i><strong>{{ favoritesOnly ? localize('还没有收藏商品', 'No saved products yet') : localize('没有找到商品', 'No products found') }}</strong><p>{{ localize('换一个关键词或分类继续查找。', 'Try another search or category.') }}</p></div>
      <div v-else class="cp-product-grid">
        <article v-for="product in visibleProducts.slice(0, 6)" :key="product.id" class="shopping-product-card" :data-testid="`shopping-product-${product.id}`">
          <button type="button" class="cp-product-image" :aria-label="`${localize('查看商品', 'View product')}: ${productDisplayTitle(product)}`" @click="emit('open-product', product.id)"><img v-if="productImageUrl(product)" :src="productImageUrl(product)" :alt="productDisplayTitle(product)" /><span v-else aria-hidden="true"><i :class="productCategoryIcon(product)"></i></span><em>{{ localize('配送时段待确认', 'Window at checkout') }}</em></button>
          <button type="button" class="cp-save" :class="{ 'is-saved': isProductFavorite(product.id) }" :aria-label="localize('收藏或取消收藏', 'Toggle saved')" @click="emit('toggle-favorite', product.id)"><i class="fas fa-heart"></i></button>
          <button type="button" class="cp-product-copy coupang-product-open" @click="emit('open-product', product.id)"><small>{{ productServiceLabel(product) }}</small><strong>{{ productDisplayTitle(product) }}</strong><p>{{ productDisplayDescription(product) }}</p></button>
          <footer><div><small :class="stockStatusClass(product.stockStatus)">{{ stockStatusLabel(product.stockStatus) }}</small><strong>{{ formatPrice(product) }}</strong></div><button type="button" :disabled="product.stockStatus === 'sold_out'" :aria-label="`${localize('加入购物车', 'Add to cart')}: ${productDisplayTitle(product)}`" :data-testid="`shopping-add-cart-${product.id}`" @click="emit('add-to-cart', product.id)"><i class="fas fa-plus"></i></button></footer>
        </article>
      </div>
    </section>

    <nav class="cp-bottom-nav" :aria-label="localize('店内导航', 'Store navigation')">
      <button type="button" :class="{ 'is-active': !favoritesOnly }" @click="emit('show-all')"><i class="fas fa-house"></i><span>{{ localize('首页', 'Home') }}</span></button>
      <button type="button" :class="{ 'is-active': favoritesOnly }" @click="emit('open-favorites')"><i class="fas fa-heart"></i><span>{{ localize('收藏', 'Saved') }}</span><b v-if="favoriteCount">{{ favoriteCount }}</b></button>
      <button type="button" @click="emit('open-cart')"><i class="fas fa-cart-shopping"></i><span>{{ localize('购物车', 'Cart') }}</span><b v-if="cartQuantity">{{ cartQuantity }}</b></button>
      <button type="button" @click="emit('open-orders')"><i class="fas fa-receipt"></i><span>{{ localize('订单', 'Orders') }}</span><b v-if="orderCount">{{ orderCount }}</b></button>
    </nav>
  </main>
</template>

<style scoped>
.cp-home{--red:#e3262e;--blue:#2469d8;--ink:#17191d;--muted:#6e747d;--line:#e6e8eb;min-height:100%;padding-bottom:76px;color:var(--ink);background:#f6f7f8;font-family:Arial,"Noto Sans KR",sans-serif}.cp-shell-header{padding:12px 16px 14px;background:#fff;border-bottom:1px solid var(--line)}.cp-topline,.cp-head-actions,.cp-brand,.cp-address,.cp-search,.cp-section>header,.cp-task-grid button,.cp-product-grid footer,.cp-product-grid footer>div{display:flex;align-items:center}.cp-topline{justify-content:space-between;gap:10px}.cp-icon{position:relative;width:40px;height:40px;display:grid;place-items:center;border:1px solid var(--line);border-radius:12px;background:#fff}.cp-icon>b,.cp-bottom-nav b{position:absolute;min-width:17px;height:17px;padding:0 4px;display:grid;place-items:center;border-radius:9px;color:#fff;background:var(--red);font-size:8px}.cp-icon>b{top:-4px;right:-3px}.cp-brand{min-width:0;flex:1;gap:9px}.cp-brand>span{width:36px;height:36px;display:grid;place-items:center;overflow:hidden;border-radius:10px;color:#fff;background:var(--red)}.cp-brand img{width:100%;height:100%;object-fit:cover}.cp-brand>h1{margin:0;font-size:18px}.cp-head-actions{gap:6px}.cp-address{margin-top:11px;display:grid;grid-template-columns:18px auto 1fr;gap:2px 6px}.cp-address>i{grid-row:1/span 2;color:var(--red)}.cp-address>span{font-size:9px;color:var(--muted)}.cp-address>strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.cp-address>small{grid-column:2/-1;color:#8a9097;font-size:8px}.cp-search{height:50px;margin-top:13px;padding:0 6px 0 14px;gap:10px;border:2px solid var(--red);border-radius:12px;background:#fff}.cp-search>i{color:#777}.cp-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;font-size:12px}.cp-search button{height:36px;padding:0 15px;border-radius:8px;color:#fff;background:var(--red);font-size:10px;font-weight:800}.cp-search-suggestions{margin-top:9px;display:flex;align-items:center;gap:6px;overflow:auto}.cp-search-suggestions span,.cp-search-suggestions button{white-space:nowrap;font-size:9px}.cp-search-suggestions span{color:var(--red);font-weight:800}.cp-search-suggestions button{padding:6px 9px;border:1px solid var(--line);border-radius:14px;color:#60666d;background:#fafafa}.cp-hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(260px,.85fr);background:#111923}.cp-hero-media{min-height:300px;overflow:hidden;background:#e9edf1}.cp-hero-media img{width:100%;height:100%;display:block;object-fit:cover}.cp-hero-placeholder{height:100%;min-height:300px;padding:24px;display:flex;flex-direction:column;justify-content:space-between;color:#fff;background:linear-gradient(135deg,#dfe5ea,#b8c3cc)}.cp-hero-placeholder i{font-size:42px}.cp-hero-placeholder span{font-size:9px;font-weight:900;letter-spacing:.14em}.cp-hero-copy{padding:30px;display:flex;flex-direction:column;justify-content:center;color:#fff}.cp-hero-copy>span,.cp-section>header span{color:#73a8ff;font-size:8px;font-weight:900;letter-spacing:.13em}.cp-hero-copy h2{max-width:9ch;margin:13px 0 0;font-size:34px;line-height:1.08}.cp-hero-copy p{max-width:31ch;margin:15px 0 0;color:#bfc9d3;font-size:10px;line-height:1.7}.cp-hero-copy button{align-self:flex-start;margin-top:21px;padding:12px 15px;border-radius:7px;color:#fff;background:var(--red);font-size:10px;font-weight:900}.cp-task-grid{padding:14px 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.cp-task-grid button{min-width:0;padding:13px;gap:10px;text-align:left;border:1px solid var(--line);border-radius:12px;background:#fff}.cp-task-grid button>span{width:34px;height:34px;display:grid;place-items:center;border-radius:10px}.cp-task-grid .is-blue{color:var(--blue);background:#edf4ff}.cp-task-grid .is-green{color:#158455;background:#edf8f2}.cp-task-grid .is-gray{color:#565d65;background:#f0f1f3}.cp-task-grid button>div{min-width:0;flex:1}.cp-task-grid strong,.cp-task-grid small{display:block}.cp-task-grid strong{font-size:10px}.cp-task-grid small{margin-top:3px;overflow:hidden;color:var(--muted);font-size:8px;text-overflow:ellipsis;white-space:nowrap}.cp-task-grid button>i{color:#a3a8ae;font-size:9px}.cp-section{padding:18px 16px}.cp-section>header{justify-content:space-between;gap:12px;margin-bottom:13px}.cp-section>header h2{margin:5px 0 0;font-size:22px}.cp-section>header>small{color:var(--muted);font-size:8px}.cp-section>header>button{color:var(--blue);font-size:9px;font-weight:800}.cp-category-section{background:#fff}.cp-category-row{display:grid;grid-template-columns:repeat(5,minmax(74px,1fr));gap:8px;overflow:auto}.cp-category-row button{padding:13px 8px 10px;display:flex;flex-direction:column;align-items:flex-start;border:1px solid var(--line);border-radius:12px;background:#fff}.cp-category-row button>span{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;color:#606872;background:#f2f4f6}.cp-category-row button>strong{margin-top:12px;font-size:9px}.cp-category-row button>small{margin-top:3px;color:var(--muted);font-size:8px}.cp-category-row button.is-active{border-color:var(--red);box-shadow:0 0 0 1px var(--red)}.cp-category-row button.is-active>span{color:var(--red);background:#fff0f1}.cp-recommendations{padding-bottom:28px}.cp-product-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.cp-product-grid article{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:#fff}.cp-product-image{position:relative;width:100%;aspect-ratio:1/1;display:block;overflow:hidden;background:#eef1f4}.cp-product-image img{width:100%;height:100%;object-fit:cover}.cp-product-image>span{width:100%;height:100%;display:grid;place-items:center;color:var(--red);font-size:36px}.cp-product-image em{position:absolute;left:8px;bottom:8px;padding:5px 7px;border-radius:5px;color:#fff;background:rgba(23,25,29,.78);font-size:7px;font-style:normal;font-weight:800}.cp-save{position:absolute;top:8px;right:8px;width:32px;height:32px;border:1px solid rgba(0,0,0,.08);border-radius:50%;color:#aab0b6;background:rgba(255,255,255,.94)}.cp-save.is-saved{color:var(--red)}.cp-product-copy{width:100%;padding:12px 12px 0;text-align:left}.cp-product-copy small{color:var(--muted);font-size:8px}.cp-product-copy strong{display:block;margin-top:5px;font-size:12px;line-height:1.35}.cp-product-copy p{min-height:31px;margin:6px 0 0;display:-webkit-box;overflow:hidden;color:var(--muted);font-size:9px;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:2}.cp-product-grid footer{padding:12px;justify-content:space-between;gap:8px}.cp-product-grid footer>div{align-items:flex-start;flex-direction:column;gap:4px}.cp-product-grid footer small{color:#158455;font-size:8px}.cp-product-grid footer strong{font-size:12px}.cp-product-grid footer>button{width:34px;height:34px;border-radius:9px;color:#fff;background:var(--red)}.cp-product-grid footer>button:disabled{opacity:.35}.cp-empty{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);text-align:center}.cp-empty i{font-size:34px;color:#c8cdd2}.cp-empty strong{margin-top:13px;font-size:15px}.cp-empty p{font-size:9px}.cp-bottom-nav{position:sticky;bottom:0;z-index:15;margin-top:4px;padding:7px 12px calc(7px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);background:rgba(255,255,255,.96);backdrop-filter:blur(16px)}.cp-bottom-nav button{position:relative;min-height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#777e86;font-size:9px}.cp-bottom-nav button.is-active{color:var(--red)}.cp-bottom-nav b{top:1px;right:25%}
@media(max-width:720px){.cp-shell-header{padding-inline:12px}.cp-hero{grid-template-columns:1fr}.cp-hero-media{min-height:220px}.cp-hero-copy{padding:22px 18px}.cp-hero-copy h1{font-size:29px}.cp-task-grid{grid-template-columns:1fr;padding-inline:12px}.cp-task-grid button{min-height:62px}.cp-section{padding-inline:12px}.cp-category-row{grid-template-columns:repeat(5,76px)}.cp-product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.cp-product-copy{padding-inline:10px}.cp-product-grid footer{padding:10px}}
@media(min-width:1100px){.cp-hero-media{min-height:340px}.cp-product-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.cp-task-grid .is-red{color:var(--red);background:#fff0f1}
</style>
