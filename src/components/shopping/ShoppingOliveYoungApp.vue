<script setup>
import { computed, ref } from 'vue'
import {
  SHOPPING_STOREFRONT_EVENTS,
  SHOPPING_STOREFRONT_PROPS,
  localizeShoppingCopy,
} from './shopping-storefront-contract'

const props = defineProps(SHOPPING_STOREFRONT_PROPS)
const emit = defineEmits(SHOPPING_STOREFRONT_EVENTS)
const localize = (zh, en) => localizeShoppingCopy(props.languageBase, zh, en)
const searchChanged = (event) => emit('update:searchQuery', event.target.value)
const activeRoutine = ref('am')
const routineItems = ref([])
const routineSlotCount = 4
const routineOptions = Object.freeze([
  { key: 'am', zh: '晨间', en: 'AM' },
  { key: 'pm', zh: '夜间', en: 'PM' },
  { key: 'travel', zh: '旅行', en: 'TRAVEL' },
  { key: 'gift', zh: '礼物', en: 'GIFT' },
])
const activeRoutineCopy = computed(() => {
  const routine = routineOptions.find((option) => option.key === activeRoutine.value) || routineOptions[0]
  return { label: localize(routine.zh, routine.en) }
})
const routineSelected = (productId) => routineItems.value.some((item) => item.id === productId)
const toggleRoutine = (product) => {
  const existingIndex = routineItems.value.findIndex((item) => item.id === product.id)
  if (existingIndex >= 0) {
    routineItems.value.splice(existingIndex, 1)
    return
  }
  if (routineItems.value.length >= routineSlotCount) return
  routineItems.value.push({
    id: product.id,
    title: props.productDisplayTitle(product),
    icon: props.productCategoryIcon(product),
  })
}
const removeRoutineItem = (productId) => {
  const existingIndex = routineItems.value.findIndex((item) => item.id === productId)
  if (existingIndex >= 0) routineItems.value.splice(existingIndex, 1)
}
const iconForCategory = (category) => category.icon || 'fas fa-sparkles'
const oliveTitle = () =>
  props.languageBase === 'zh'
    ? props.activeService?.heroZh || props.activeService?.zh || '给日常一点护理'
    : props.activeService?.heroEn || props.activeService?.en || 'A little care, every day'
</script>

<template>
  <header
    class="shopping-storefront-header shopping-olive-young-app"
    :data-storefront="activeService?.storefrontTemplate || 'care_lab'"
    :data-routine="activeRoutine"
    data-storefront-kind="specialty"
  >
    <div class="olive-topbar">
      <button
        type="button"
        class="olive-back"
        data-testid="shopping-go-home"
        :aria-label="localize('返回主屏幕', 'Back to Home')"
        :title="localize('返回主屏幕', 'Back to Home')"
        @click="emit('go-home')"
      ><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
      <div class="olive-brand">
        <span class="olive-mark"><img v-if="brandAssetUrl" :src="brandAssetUrl" alt="" /><template v-else>O</template></span>
        <div>
          <h1>{{ activeLabel || activeService?.en || activeService?.zh || 'OLIVE YOUNG' }}</h1>
          <p>{{ localize('日常护理实验室', 'EVERYDAY CARE LAB') }}</p>
        </div>
      </div>
      <div class="olive-actions">
        <button
          type="button"
          class="olive-action"
          :aria-label="localize('收藏', 'Favorites')"
          :title="localize('收藏', 'Favorites')"
          @click="emit('open-favorites')"
        ><i class="fas fa-heart" aria-hidden="true"></i><b v-if="favoriteCount">{{ favoriteCount }}</b></button>
        <button
          type="button"
          class="olive-action"
          :aria-label="localize('购物车', 'Cart')"
          :title="localize('购物车', 'Cart')"
          @click="emit('open-cart')"
        ><i class="fas fa-bag-shopping" aria-hidden="true"></i><b v-if="cartQuantity">{{ cartQuantity }}</b></button>
      </div>
    </div>

    <div class="olive-search-row">
      <label class="olive-search">
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
        <input
          type="search"
          role="searchbox"
          :aria-label="localize('搜索商品', 'Search products')"
          :placeholder="localize('搜索肌肤、香气与护理', 'Search skin, scent, and care')"
          :value="searchQuery"
          @input="searchChanged"
        />
      </label>
      <button
        type="button"
        class="olive-manage"
        :aria-label="localize('管理商品', 'Manage catalog')"
        :title="localize('管理商品', 'Manage catalog')"
        @click="emit('open-manager')"
      ><i class="fas fa-sliders" aria-hidden="true"></i></button>
    </div>

    <nav class="olive-store-nav" :aria-label="localize('店内导航', 'Store navigation')">
      <button type="button" :class="{ 'is-active': !favoritesOnly }" @click="emit('show-all')">{{ localize('排行榜', 'RANKING') }}</button>
      <button type="button" :class="{ 'is-active': favoritesOnly }" @click="emit('open-favorites')">{{ localize('心愿', 'WISHLIST') }}<b v-if="favoriteCount">{{ favoriteCount }}</b></button>
      <button type="button" @click="emit('open-cart')">{{ localize('购物袋', 'BAG') }}<b v-if="cartQuantity">{{ cartQuantity }}</b></button>
      <button type="button" @click="emit('open-orders')">{{ localize('我的', 'MY') }}<b v-if="orderCount">{{ orderCount }}</b></button>
    </nav>

    <div class="olive-hero">
      <div class="olive-hero-copy">
        <p class="olive-eyebrow">{{ localize('今天的护理清单', 'TODAY\'S CARE LIST') }}</p>
        <h2>{{ oliveTitle() }}</h2>
        <p>{{ activeDescription || activeService?.descZh || activeService?.descEn || '' }}</p>
        <p
          v-if="mapReference?.placeId"
          class="shopping-map-reference olive-map-reference"
          data-testid="shopping-map-reference"
          :data-map-place-id="mapReference.placeId"
        >
          <i class="fas fa-location-dot" aria-hidden="true"></i>
          <span>{{ localize('首尔场景锚点', 'SEOUL SETTING') }}</span>
          <strong>{{ mapReference.district }}</strong>
        </p>
      </div>
      <div class="olive-hero-stage" aria-hidden="true">
        <img v-if="coverImageUrl" :src="coverImageUrl" :alt="`${activeService?.en || 'OLIVE YOUNG'} cover`" />
        <template v-else>
          <div class="olive-sun"></div>
          <div class="olive-bottle"><i :class="activeService?.icon || 'fas fa-spa'"></i></div>
          <span>{{ localize('轻盈 · 清爽 · 今天', 'LIGHT · FRESH · TODAY') }}</span>
        </template>
      </div>
    </div>

    <div class="olive-category-title">
      <div>
        <p>{{ localize('按护理步骤', 'SHOP BY STEP') }}</p>
        <strong>{{ activeCategory?.label || localize('全部护理', 'All care') }}</strong>
      </div>
      <span>{{ visibleProducts.length }}</span>
    </div>
    <div class="olive-category-grid">
      <button
        v-for="category in categoryCards"
        :key="category.key"
        type="button"
        class="olive-category"
        :class="{ 'is-active': category.active, 'border-orange-300': category.active }"
        :data-testid="`shopping-category-${category.key}`"
        @click="emit('select-category', category.key)"
      >
        <i :class="iconForCategory(category)" aria-hidden="true"></i>
        <span>{{ category.label }}</span>
        <small>{{ category.count }}</small>
      </button>
    </div>

    <div class="olive-routine-tabs">
      <span>{{ localize('搭配护理', 'BUILD A ROUTINE') }}</span>
      <button
        v-for="routine in routineOptions"
        :key="routine.key"
        type="button"
        :class="{ 'is-active': activeRoutine === routine.key }"
        :aria-pressed="activeRoutine === routine.key"
        :data-testid="`shopping-olive-routine-${routine.key}`"
        @click="activeRoutine = routine.key"
      >
        {{ localize(routine.zh, routine.en) }}
      </button>
    </div>

    <div class="olive-routine-shelf" aria-live="polite">
      <div class="olive-routine-heading">
        <div><span>{{ localize('我的护理架', 'MY ROUTINE SHELF') }}</span><strong>{{ activeRoutineCopy.label }}</strong></div>
        <b>{{ routineItems.length }}/{{ routineSlotCount }}</b>
      </div>
      <div v-if="routineItems.length" class="olive-routine-items">
        <button v-for="item in routineItems" :key="item.id" type="button" class="olive-routine-item" :aria-label="`${localize('移除步骤', 'Remove step')}: ${item.title}`" @click="removeRoutineItem(item.id)">
          <i :class="item.icon" aria-hidden="true"></i><span>{{ item.title }}</span><i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <p v-else class="olive-routine-empty">{{ localize('浏览榜单，在商品旁加入护理步骤。', 'Browse the ranking and add steps beside each product.') }}</p>
      <div class="olive-routine-progress"><span :style="{ width: `${Math.min((routineItems.length / routineSlotCount) * 100, 100)}%` }"></span></div>
    </div>
  </header>

  <section v-if="!activeCategoryIsLogistics" id="shopping-products" class="shopping-products-section olive-products">
    <div v-if="!favoritesOnly && !searchQuery && visibleProducts.length" class="olive-ranking-strip">
      <button v-for="(product, index) in visibleProducts.slice(0, 3)" :key="product.id" type="button" @click="emit('open-product', product.id)">
        <b>0{{ index + 1 }}</b>
        <span><small>{{ productServiceLabel(product) }}</small><strong>{{ productDisplayTitle(product) }}</strong></span>
        <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
      </button>
    </div>
    <div class="olive-products-heading">
      <div>
        <p>{{ favoritesOnly ? localize('收藏护理', 'SAVED CARE') : localize('编辑推荐', 'EDITOR\'S PICKS') }}</p>
        <h2>{{ activeCategory?.label || localize('今日推荐', 'Today\'s picks') }}</h2>
      </div>
      <button
        v-if="favoritesOnly"
        type="button"
        class="olive-clear"
        :aria-label="localize('显示全部商品', 'Show all products')"
        :title="localize('显示全部商品', 'Show all products')"
        @click="emit('show-all')"
      ><i class="fas fa-xmark" aria-hidden="true"></i></button>
      <span v-else>{{ visibleProducts.length }} {{ localize('件', 'items') }}</span>
    </div>
    <div v-if="visibleProducts.length === 0" class="olive-empty">
      <i class="fas fa-flask" aria-hidden="true"></i>
      <p>{{ favoritesOnly ? localize('这里还没有收藏商品。', 'No saved items here yet.') : searchQuery ? localize('没有找到匹配商品。', 'No matching products found.') : localize('这个分类还没有商品。', 'No products in this category yet.') }}</p>
    </div>
    <div v-else class="olive-product-grid">
      <article
        v-for="product in visibleProducts"
        :key="product.id"
        class="shopping-product-card olive-product-card"
        :class="{ 'is-highlighted': product.id === highlightedProductId }"
        :data-product-template="productStorefrontTemplate(product)"
        :data-testid="`shopping-product-${product.id}`"
        role="button"
        tabindex="0"
        @click="emit('open-product', product.id)"
        @keydown.enter.prevent="emit('open-product', product.id)"
      >
        <div class="olive-product-visual">
          <img v-if="productImageUrl(product)" :src="productImageUrl(product)" :alt="product.image?.alt || productDisplayTitle(product)" />
          <div v-else class="olive-product-symbol" aria-hidden="true"><i :class="productCategoryIcon(product)"></i><span>{{ activeService?.mark || 'O' }}</span></div>
          <button
            type="button"
            class="olive-favorite"
            :class="{ 'is-favorite': isProductFavorite(product.id) }"
            :aria-label="localize('收藏或取消收藏', 'Toggle favorite')"
            :title="localize('收藏或取消收藏', 'Toggle favorite')"
            @click.stop="emit('toggle-favorite', product.id)"
          ><i class="fas fa-heart" aria-hidden="true"></i></button>
          <span class="olive-step-dot"></span>
        </div>
        <div class="olive-product-body">
          <p class="olive-product-brand">{{ productServiceLabel(product) }}</p>
          <h3>{{ productDisplayTitle(product) }}</h3>
          <p>{{ productDisplayDescription(product) }}</p>
          <div class="olive-product-tags">
            <span :class="stockStatusClass(product.stockStatus)">{{ stockStatusLabel(product.stockStatus) }}</span>
            <span v-if="product.assetEligible">{{ localize('可转资产', 'Asset-ready') }}</span>
            <span v-else-if="product.giftable">{{ localize('可赠礼', 'Giftable') }}</span>
          </div>
          <div class="olive-product-footer">
            <strong>{{ formatPrice(product) }}</strong>
            <div class="olive-product-actions">
              <button
                type="button"
                class="olive-routine-add"
                :class="{ 'is-selected': routineSelected(product.id) }"
                :aria-pressed="routineSelected(product.id)"
                :aria-label="`${localize('加入护理步骤', 'Add to routine')}: ${productDisplayTitle(product)}`"
                @click.stop="toggleRoutine(product)"
              >
                <i class="fas fa-list-check" aria-hidden="true"></i>
                <span>{{ routineSelected(product.id) ? localize('已加入', 'IN') : localize('步骤', 'STEP') }}</span>
              </button>
              <button
                type="button"
                class="olive-add"
                :disabled="product.stockStatus === 'sold_out'"
                :data-testid="`shopping-add-cart-${product.id}`"
                :aria-label="`${localize('加入购物车', 'Add to cart')}: ${productDisplayTitle(product)}`"
                @click.stop="emit('add-to-cart', product.id)"
              ><i class="fas fa-plus" aria-hidden="true"></i></button>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.shopping-olive-young-app { --olive-green:#6d961d; --olive-orange:#f58220; --olive-ink:#26311f; --olive-muted:#66705f; --olive-line:rgba(109,150,29,.18); display:block; color:var(--olive-ink); background:#f4f7ee; }
.olive-topbar,.olive-search-row,.olive-category-title,.olive-products-heading,.olive-product-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.olive-topbar { padding:14px 16px 10px; }
.olive-back,.olive-action,.olive-manage { position:relative; width:35px; height:35px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--olive-line); border-radius:50%; color:var(--olive-green); background:#fff; }
.olive-actions { display:flex; gap:6px; }
.olive-action b { position:absolute; top:-4px; right:-4px; min-width:15px; height:15px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; background:var(--olive-orange); font-size:8px; }
.olive-brand { min-width:0; flex:1; display:flex; align-items:center; gap:9px; }
.olive-mark { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; border-radius:50%; color:#fff; background:var(--olive-green); font-size:14px; font-weight:900; }
.olive-mark img { width:100%; height:100%; object-fit:cover; }
.olive-brand h1 { margin:0; overflow:hidden; font:800 16px/1.05 Arial, sans-serif; text-overflow:ellipsis; white-space:nowrap; }
.olive-brand p,.olive-category-title p,.olive-products-heading p { margin:4px 0 0; color:var(--olive-muted); font-size:8px; font-weight:900; letter-spacing:.09em; }
.olive-search-row { padding:0 16px 11px; }
.olive-search { min-width:0; flex:1; height:40px; display:flex; align-items:center; gap:9px; padding:0 12px; border:1px solid var(--olive-line); border-radius:20px; color:var(--olive-green); background:#fff; }
.olive-search input { min-width:0; flex:1; border:0; outline:0; color:var(--olive-ink); background:transparent; font-size:11px; }
.olive-routine-tabs { padding:0 16px 10px; display:flex; gap:18px; color:var(--olive-muted); font-size:9px; font-weight:900; letter-spacing:.08em; }
.olive-routine-tabs button { position:relative; padding:0 0 6px; color:inherit; background:transparent; font-size:inherit; font-weight:inherit; letter-spacing:inherit; }
.olive-routine-tabs button.is-active { color:var(--olive-green); }
.olive-routine-tabs button.is-active::after { content:''; position:absolute; right:0; bottom:0; left:0; height:2px; background:var(--olive-orange); }
.olive-routine-shelf { margin:0 16px 14px; padding:10px; border:1px solid var(--olive-line); border-radius:12px; background:#fff; }
.olive-routine-heading { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.olive-routine-heading > div { display:flex; flex-direction:column; gap:4px; }
.olive-routine-heading span { color:var(--olive-orange); font-size:8px; font-weight:900; letter-spacing:.1em; }
.olive-routine-heading strong { color:var(--olive-ink); font-size:13px; }
.olive-routine-heading b { color:var(--olive-green); font-size:13px; }
.olive-routine-items { margin-top:8px; display:flex; gap:5px; overflow-x:auto; }
.olive-routine-item { max-width:145px; padding:6px 7px; display:flex; align-items:center; gap:5px; border-radius:7px; color:var(--olive-green); background:#eef4e2; font-size:8px; font-weight:800; white-space:nowrap; }
.olive-routine-item span { overflow:hidden; text-overflow:ellipsis; }
.olive-routine-item > i:last-child { color:var(--olive-orange); }
.olive-routine-empty { margin:8px 0 0; color:var(--olive-muted); font-size:9px; }
.olive-routine-progress { height:3px; margin-top:9px; overflow:hidden; border-radius:3px; background:#edf0e8; }
.olive-routine-progress span { display:block; height:100%; border-radius:inherit; background:var(--olive-orange); transition:width .22s ease; }
.olive-hero { min-height:238px; padding:23px 16px 18px; display:grid; grid-template-columns:minmax(0,1.1fr) minmax(120px,.9fr); gap:15px; border-top:1px solid var(--olive-line); border-bottom:1px solid var(--olive-line); background:#fff; }
.olive-hero-copy { display:flex; flex-direction:column; justify-content:flex-end; }
.olive-eyebrow { margin:0 0 10px; color:var(--olive-orange); font-size:9px; font-weight:900; letter-spacing:.1em; }
.olive-hero h2 { max-width:8ch; margin:0; font:800 31px/1.02 Arial, sans-serif; letter-spacing:-.05em; }
.olive-hero-copy > p:not(.olive-eyebrow):not(.shopping-map-reference) { max-width:26ch; margin:14px 0 0; color:var(--olive-muted); font-size:11px; line-height:1.55; }
.olive-map-reference { margin-top:14px; padding-top:9px; display:grid; grid-template-columns:12px auto; gap:2px 7px; border-top:1px solid var(--olive-line); color:var(--olive-muted); }
.olive-map-reference i { grid-row:1 / span 2; align-self:center; color:var(--olive-green); }
.olive-map-reference span { font-size:8px; font-weight:900; letter-spacing:.08em; }
.olive-map-reference strong { color:var(--olive-ink); font:700 12px/1.2 Arial, sans-serif; }
.olive-hero-stage { position:relative; min-height:196px; overflow:hidden; border-radius:54px 12px 12px 12px; background:#edf2df; }
.olive-hero-stage img { width:100%; height:100%; object-fit:cover; }
.olive-sun { position:absolute; top:17px; left:18px; width:74px; height:74px; border-radius:50%; background:#f7cf88; }
.olive-bottle { position:absolute; right:25px; bottom:31px; width:80px; height:117px; display:flex; align-items:center; justify-content:center; border-radius:23px 23px 14px 14px; color:#fff; background:var(--olive-green); transform:rotate(6deg); }
.olive-bottle i { font-size:33px; }
.olive-hero-stage > span { position:absolute; right:9px; bottom:9px; left:9px; color:var(--olive-ink); font-size:8px; font-weight:900; text-align:center; letter-spacing:.08em; }
.olive-category-title { padding:15px 16px 8px; }
.olive-category-title p { margin:0; }
.olive-category-title strong { display:block; margin-top:4px; font:700 20px/1 Arial, sans-serif; }
.olive-category-title > span { color:var(--olive-orange); font:900 20px/1 Arial, sans-serif; }
.olive-category-grid { padding:0 16px 13px; display:flex; gap:7px; overflow-x:auto; }
.olive-category { min-width:72px; padding:9px 7px; display:flex; flex-direction:column; align-items:center; gap:4px; border:1px solid var(--olive-line); border-radius:12px; color:var(--olive-muted); background:#fff; font-size:8px; font-weight:800; }
.olive-category i { color:var(--olive-green); font-size:15px; }
.olive-category small { font-size:8px; opacity:.65; }
.olive-category.is-active { border-color:var(--olive-green); color:var(--olive-green); box-shadow:0 0 0 2px rgba(109,150,29,.1); }
.olive-store-nav { margin:0 16px 4px; padding:5px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:4px; border-radius:15px; background:#fff; }
.olive-store-nav button { position:relative; min-height:44px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; color:var(--olive-muted); font-size:9px; font-weight:800; }
.olive-store-nav button.is-active { border-radius:10px; color:var(--olive-green); background:#eef4e2; }
.olive-store-nav b { position:absolute; top:1px; right:17%; min-width:15px; height:15px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; background:var(--olive-orange); font-size:8px; }
.olive-products { padding:13px 16px 27px; }
.olive-products-heading { min-height:45px; margin-bottom:11px; }
.olive-products-heading h2 { margin:5px 0 0; font:800 22px/1.05 Arial, sans-serif; }
.olive-products-heading > span { color:var(--olive-green); font-size:9px; font-weight:900; }
.olive-clear { width:34px; height:34px; border:1px solid var(--olive-line); border-radius:50%; color:var(--olive-green); background:#fff; }
.olive-product-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.olive-product-card { overflow:hidden; border:1px solid var(--olive-line); border-radius:12px; color:var(--olive-ink); background:#fff; }
.olive-product-card.is-highlighted { border-color:var(--olive-orange); box-shadow:0 0 0 2px rgba(245,130,32,.13); }
.olive-product-visual { position:relative; aspect-ratio:1 / 1; overflow:hidden; background:#e6eed7; }
.olive-product-visual img { width:100%; height:100%; display:block; object-fit:cover; }
.olive-product-symbol { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#fff; background:var(--olive-green); font-size:29px; }
.olive-product-symbol span { position:absolute; right:8px; bottom:7px; font-size:9px; font-weight:900; }
.olive-favorite { position:absolute; top:8px; right:8px; width:31px; height:31px; border:1px solid rgba(109,150,29,.14); border-radius:50%; color:#aab19e; background:rgba(255,255,255,.92); }
.olive-favorite.is-favorite { color:var(--olive-orange); }
.olive-step-dot { position:absolute; bottom:8px; left:8px; width:13px; height:13px; border:3px solid #fff; border-radius:50%; background:var(--olive-orange); }
.olive-product-body { min-height:169px; padding:11px; display:flex; flex-direction:column; }
.olive-product-brand { margin:0; color:var(--olive-green); font-size:8px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
.olive-product-body h3 { min-height:35px; margin:5px 0 0; display:-webkit-box; overflow:hidden; font:700 14px/1.2 Arial, sans-serif; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.olive-product-body > p:not(.olive-product-brand) { min-height:31px; margin:7px 0 0; display:-webkit-box; overflow:hidden; color:var(--olive-muted); font-size:10px; line-height:1.5; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.olive-product-tags { min-height:19px; margin-top:7px; display:flex; flex-wrap:wrap; gap:4px; }
.olive-product-tags span { padding:3px 5px; border-radius:5px; color:var(--olive-muted); background:#f1f4ed; font-size:8px; font-weight:800; }
.olive-product-footer { margin-top:auto; padding-top:8px; }
.olive-product-footer strong { font-size:12px; }
.olive-product-actions { display:flex; align-items:center; gap:5px; }
.olive-routine-add { min-width:39px; height:30px; padding:0 6px; display:inline-flex; align-items:center; justify-content:center; gap:4px; border:1px solid var(--olive-line); border-radius:15px; color:var(--olive-green); background:#fff; font-size:8px; font-weight:900; }
.olive-routine-add.is-selected { color:#fff; border-color:var(--olive-green); background:var(--olive-green); }
.olive-add { width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; background:var(--olive-orange); }
.olive-add:disabled { opacity:.35; }
.olive-empty { min-height:160px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; border:1px dashed var(--olive-line); border-radius:12px; color:var(--olive-muted); background:#fff; }
.olive-empty p { margin:0; font-size:11px; }
.olive-back:focus-visible,.olive-action:focus-visible,.olive-manage:focus-visible,.olive-category:focus-visible,.olive-store-nav button:focus-visible,.olive-favorite:focus-visible,.olive-add:focus-visible,.olive-routine-tabs button:focus-visible,.olive-routine-item:focus-visible,.olive-routine-add:focus-visible { outline:3px solid var(--olive-orange); outline-offset:2px; }
@media (min-width:680px) { .olive-product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:350px) { .olive-product-grid { grid-template-columns:1fr; } }

.olive-store-nav { padding:0 16px 12px; display:flex; align-items:center; gap:19px; overflow-x:auto; border:0; background:#f4f7ee; }
.olive-store-nav button { min-height:29px; padding:0; display:inline-flex; align-items:center; gap:4px; color:var(--olive-muted); background:transparent; font-size:9px; font-weight:900; letter-spacing:.08em; white-space:nowrap; }
.olive-store-nav button.is-active { color:var(--olive-green); background:transparent; }
.olive-store-nav button.is-active::after { content:''; width:6px; height:6px; border-radius:50%; background:var(--olive-orange); }
.olive-store-nav b { position:static; min-width:auto; height:auto; color:var(--olive-orange); background:transparent; }
.olive-hero { position:relative; min-height:330px; padding:0; display:block; overflow:hidden; border:0; background:#d9e8be; }
.olive-hero-stage { position:absolute; inset:0; min-height:0; border:0; border-radius:0; background:linear-gradient(145deg,#d8efb1 0 52%,#f2a86a 52% 100%); }
.olive-hero-stage::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg,transparent 34%,rgba(31,48,19,.68)); }
.olive-hero-copy { position:absolute; z-index:1; right:18px; bottom:18px; left:18px; display:block; color:#fff; }
.olive-hero h2 { max-width:12ch; font-size:34px; }
.olive-hero-copy > p:not(.olive-eyebrow):not(.shopping-map-reference) { max-width:34ch; margin-top:9px; color:rgba(255,255,255,.84); }
.olive-map-reference { width:fit-content; margin-top:11px; padding:7px 9px; border:1px solid rgba(255,255,255,.42); border-radius:999px; color:#fff; background:rgba(41,57,29,.28); backdrop-filter:blur(7px); }
.olive-map-reference strong { color:#fff; }
.olive-category-title { padding-top:18px; }
.olive-category-grid { padding-bottom:10px; grid-template-columns:repeat(3,minmax(92px,1fr)); }
.olive-category { min-height:74px; border-radius:8px; }
.olive-routine-tabs { margin-top:4px; padding:13px 16px 9px; gap:14px; border-top:1px solid var(--olive-line); background:#fff; }
.olive-routine-tabs > span { margin-right:auto; color:var(--olive-ink); font-size:8px; font-weight:900; letter-spacing:.08em; white-space:nowrap; }
.olive-routine-shelf { margin:0 16px 16px; border-radius:5px 18px 5px 5px; box-shadow:0 8px 22px rgba(72,102,32,.08); }
.olive-ranking-strip { margin:0 0 18px; border-top:2px solid var(--olive-ink); }
.olive-ranking-strip button { width:100%; min-height:68px; padding:10px 4px; display:grid; grid-template-columns:42px minmax(0,1fr) 22px; align-items:center; gap:8px; border-bottom:1px solid var(--olive-line); color:var(--olive-ink); text-align:left; }
.olive-ranking-strip button > b { color:var(--olive-orange); font-size:23px; font-style:italic; }
.olive-ranking-strip button > span { min-width:0; display:flex; flex-direction:column; gap:5px; }
.olive-ranking-strip small { color:var(--olive-green); font-size:8px; font-weight:900; letter-spacing:.08em; }
.olive-ranking-strip strong { overflow:hidden; font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
.olive-ranking-strip i { color:var(--olive-muted); font-size:10px; }
@media (max-width:390px) { .olive-hero { min-height:300px; } .olive-category-grid { grid-template-columns:repeat(3,minmax(88px,1fr)); } }
</style>
