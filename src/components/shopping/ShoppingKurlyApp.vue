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
const deliveryLane = ref('chilled')
const deliveryLaneOptions = Object.freeze([
  { key: 'chilled', zh: '冷藏', en: 'CHILLED', icon: 'fas fa-snowflake' },
  { key: 'frozen', zh: '冷冻', en: 'FROZEN', icon: 'fas fa-icicles' },
  { key: 'ambient', zh: '常温', en: 'AMBIENT', icon: 'fas fa-box-open' },
])
const deliveryLaneCopy = computed(() => {
  const lane = deliveryLaneOptions.find((option) => option.key === deliveryLane.value) || deliveryLaneOptions[0]
  const copy = {
    chilled: { titleZh: '冷鲜先到', titleEn: 'KEEP IT CHILLED', detailZh: '低温保管 · 分批打包', detailEn: 'LOW TEMP · BATCHED' },
    frozen: { titleZh: '冻库待命', titleEn: 'READY FROM FROZEN', detailZh: '深冷保管 · 独立分区', detailEn: 'DEEP COLD · SEPARATE LANE' },
    ambient: { titleZh: '常温备货', titleEn: 'PANTRY READY', detailZh: '干燥收纳 · 常温分区', detailEn: 'DRY STORAGE · AMBIENT LANE' },
  }[lane.key]
  return {
    label: localize(lane.zh, lane.en),
    icon: lane.icon,
    title: localize(copy.titleZh, copy.titleEn),
    detail: localize(copy.detailZh, copy.detailEn),
    badge: localize(`${lane.zh}批次`, `${lane.en} BATCH`),
  }
})
const iconForCategory = (category) => category.icon || 'fas fa-leaf'
const kurlyTitle = () =>
  props.languageBase === 'zh'
    ? props.activeService?.heroZh || props.activeService?.zh || '让今天更新鲜'
    : props.activeService?.heroEn || props.activeService?.en || 'Make today fresher'
</script>

<template>
  <header
    class="shopping-storefront-header shopping-kurly-app"
    :data-storefront="activeService?.storefrontTemplate || 'fresh_market'"
    :data-delivery-lane="deliveryLane"
    data-storefront-kind="marketplace"
  >
    <div class="kurly-topline">
      <button
        type="button"
        class="kurly-back"
        data-testid="shopping-go-home"
        :aria-label="localize('返回主屏幕', 'Back to Home')"
        :title="localize('返回主屏幕', 'Back to Home')"
        @click="emit('go-home')"
      >
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <div class="kurly-brand">
        <span class="kurly-mark"><img v-if="brandAssetUrl" :src="brandAssetUrl" alt="" /><template v-else>K</template></span>
        <div>
          <h1>{{ activeLabel || activeService?.en || activeService?.zh || 'Kurly' }}</h1>
          <p>{{ localize('新鲜日常超市', 'FRESH DAILY MARKET') }}</p>
        </div>
      </div>
      <button
        type="button"
        class="kurly-bag"
        :aria-label="localize('购物车', 'Cart')"
        :title="localize('购物车', 'Cart')"
        @click="emit('open-cart')"
      >
        <i class="fas fa-basket-shopping" aria-hidden="true"></i>
        <b v-if="cartQuantity">{{ cartQuantity }}</b>
      </button>
    </div>

    <div class="kurly-search-wrap">
      <label class="kurly-search">
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
        <input
          type="search"
          role="searchbox"
          :aria-label="localize('搜索商品', 'Search products')"
          :placeholder="localize('搜索食材、日用和今日好物', 'Search ingredients, home, and daily picks')"
          :value="searchQuery"
          @input="searchChanged"
        />
      </label>
      <button
        type="button"
        class="kurly-manage"
        :aria-label="localize('管理商品', 'Manage catalog')"
        :title="localize('管理商品', 'Manage catalog')"
        @click="emit('open-manager')"
      >
        <i class="fas fa-sliders" aria-hidden="true"></i>
      </button>
    </div>

    <div class="kurly-delivery-note">
      <span><i :class="deliveryLaneCopy.icon" aria-hidden="true"></i>{{ deliveryLaneCopy.label }}</span>
      <strong>{{ deliveryLaneCopy.title }}</strong>
      <span>{{ deliveryLaneCopy.detail }}</span>
    </div>

    <div class="kurly-lane-selector" role="tablist" :aria-label="localize('配送分区预览', 'Fulfillment lane preview')">
      <button
        v-for="lane in deliveryLaneOptions"
        :key="lane.key"
        type="button"
        class="kurly-lane-button"
        :class="{ 'is-active': deliveryLane === lane.key }"
        role="tab"
        :aria-selected="deliveryLane === lane.key"
        :data-testid="`shopping-kurly-lane-${lane.key}`"
        @click="deliveryLane = lane.key"
      >
        <i :class="lane.icon" aria-hidden="true"></i>
        <span>{{ localize(lane.zh, lane.en) }}</span>
      </button>
    </div>

    <div class="kurly-hero">
      <div class="kurly-hero-copy">
        <p class="kurly-eyebrow">{{ localize('今日采集', 'HARVESTED TODAY') }}</p>
        <h2>{{ kurlyTitle() }}</h2>
        <p>{{ activeDescription || activeService?.descZh || activeService?.descEn || '' }}</p>
        <p
          v-if="mapReference?.placeId"
          class="shopping-map-reference kurly-map-reference"
          data-testid="shopping-map-reference"
          :data-map-place-id="mapReference.placeId"
        >
          <i class="fas fa-location-dot" aria-hidden="true"></i>
          <span>{{ localize('首尔场景锚点', 'SEOUL SETTING') }}</span>
          <strong>{{ mapReference.district }}</strong>
        </p>
      </div>
      <div class="kurly-hero-stage" aria-hidden="true">
        <img v-if="coverImageUrl" :src="coverImageUrl" :alt="`${activeService?.en || 'Kurly'} cover`" />
        <template v-else>
          <div class="kurly-circle"><i :class="activeService?.icon || 'fas fa-leaf'"></i></div>
          <span>{{ localize('从农场到餐桌', 'FROM FARM TO TABLE') }}</span>
        </template>
      </div>
    </div>

    <div class="kurly-category-head">
      <p>{{ localize('一站式备餐', 'ONE CART, MANY TABLES') }}</p>
      <span>{{ activeCategory?.label || localize('全部', 'ALL') }}</span>
    </div>
    <div class="kurly-category-list">
      <button
        v-for="category in categoryCards"
        :key="category.key"
        type="button"
        class="kurly-category"
        :class="{ 'is-active': category.active, 'border-orange-300': category.active }"
        :data-testid="`shopping-category-${category.key}`"
        @click="emit('select-category', category.key)"
      >
        <span class="kurly-category-icon"><i :class="iconForCategory(category)" aria-hidden="true"></i></span>
        <span>{{ category.label }}</span>
        <small>{{ category.count }}</small>
      </button>
    </div>

  </header>

  <section v-if="!activeCategoryIsLogistics" id="shopping-products" class="shopping-products-section kurly-products">
    <div v-if="!favoritesOnly && !searchQuery" class="kurly-table-plan">
      <article>
        <span>{{ localize('晨间餐桌', 'MORNING TABLE') }}</span>
        <strong>{{ localize('打开冰箱就能完成的一餐', 'A breakfast that starts in the fridge') }}</strong>
        <small>{{ localize('冷藏食材 · 轻量准备', 'CHILLED · LIGHT PREP') }}</small>
      </article>
      <article>
        <span>{{ localize('今晚吃什么', 'DINNER NOTE') }}</span>
        <strong>{{ localize('三种温层，一次备齐', 'Three temperature lanes, one basket') }}</strong>
        <small>{{ localize('按保存条件整理', 'SORTED BY STORAGE') }}</small>
      </article>
    </div>
    <div class="kurly-products-heading">
      <div>
        <p>{{ favoritesOnly ? localize('收藏食材', 'SAVED INGREDIENTS') : localize('今天值得吃', 'GOOD TO EAT TODAY') }}</p>
        <h2>{{ activeCategory?.label || localize('新鲜上架', 'Fresh arrivals') }}</h2>
      </div>
      <button
        v-if="favoritesOnly"
        type="button"
        class="kurly-clear"
        :aria-label="localize('显示全部商品', 'Show all products')"
        :title="localize('显示全部商品', 'Show all products')"
        @click="emit('show-all')"
      >
        <i class="fas fa-xmark" aria-hidden="true"></i>
      </button>
      <span v-else>{{ visibleProducts.length }} {{ localize('种', 'picks') }}</span>
    </div>
    <div v-if="visibleProducts.length === 0" class="kurly-empty">
      <i class="fas fa-seedling" aria-hidden="true"></i>
      <p>{{ favoritesOnly ? localize('这里还没有收藏商品。', 'No saved items here yet.') : searchQuery ? localize('没有找到匹配商品。', 'No matching products found.') : localize('这个分类还没有商品。', 'No products in this category yet.') }}</p>
    </div>
    <div v-else class="kurly-product-grid">
      <article
        v-for="product in visibleProducts"
        :key="product.id"
        class="shopping-product-card kurly-product-card"
        :class="{ 'is-highlighted': product.id === highlightedProductId }"
        :data-product-template="productStorefrontTemplate(product)"
        :data-testid="`shopping-product-${product.id}`"
        role="button"
        tabindex="0"
        @click="emit('open-product', product.id)"
        @keydown.enter.prevent="emit('open-product', product.id)"
      >
        <div class="kurly-product-visual">
          <img v-if="productImageUrl(product)" :src="productImageUrl(product)" :alt="product.image?.alt || productDisplayTitle(product)" />
          <div v-else class="kurly-product-symbol" aria-hidden="true">
            <i :class="productCategoryIcon(product)"></i><span>{{ activeService?.mark || 'K' }}</span>
          </div>
          <button
            type="button"
            class="kurly-favorite"
            :class="{ 'is-favorite': isProductFavorite(product.id) }"
            :aria-label="localize('收藏或取消收藏', 'Toggle favorite')"
            :title="localize('收藏或取消收藏', 'Toggle favorite')"
            @click.stop="emit('toggle-favorite', product.id)"
          >
            <i class="fas fa-heart" aria-hidden="true"></i>
          </button>
          <span class="kurly-cold-badge"><i :class="deliveryLaneCopy.icon" aria-hidden="true"></i>{{ deliveryLaneCopy.badge }}</span>
        </div>
        <div class="kurly-product-body">
          <p class="kurly-product-brand">{{ productServiceLabel(product) }}</p>
          <h3>{{ productDisplayTitle(product) }}</h3>
          <p>{{ productDisplayDescription(product) }}</p>
          <div class="kurly-product-tags">
            <span :class="stockStatusClass(product.stockStatus)">{{ stockStatusLabel(product.stockStatus) }}</span>
            <span v-if="product.giftable">{{ localize('可赠礼', 'Giftable') }}</span>
          </div>
          <div class="kurly-product-footer">
            <strong>{{ formatPrice(product) }}</strong>
            <button
              type="button"
              class="kurly-add"
              :disabled="product.stockStatus === 'sold_out'"
              :data-testid="`shopping-add-cart-${product.id}`"
              :aria-label="`${localize('加入购物车', 'Add to cart')}: ${productDisplayTitle(product)}`"
              @click.stop="emit('add-to-cart', product.id)"
            >
              <i class="fas fa-plus" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>

  <nav class="kurly-store-nav" :aria-label="localize('店内导航', 'Store navigation')">
    <button type="button" :class="{ 'is-active': !favoritesOnly }" @click="emit('show-all')"><i class="fas fa-leaf" aria-hidden="true"></i><span>{{ localize('精选', 'Kurly') }}</span></button>
    <button type="button" :class="{ 'is-active': favoritesOnly }" @click="emit('open-favorites')"><i class="fas fa-clock-rotate-left" aria-hidden="true"></i><span>{{ localize('常买', 'Rebuy') }}</span><b v-if="favoriteCount">{{ favoriteCount }}</b></button>
    <button type="button" @click="emit('open-cart')"><i class="fas fa-basket-shopping" aria-hidden="true"></i><span>{{ localize('购物篮', 'Basket') }}</span><b v-if="cartQuantity">{{ cartQuantity }}</b></button>
    <button type="button" @click="emit('open-orders')"><i class="fas fa-box" aria-hidden="true"></i><span>{{ localize('晨配', 'Dawn') }}</span><b v-if="orderCount">{{ orderCount }}</b></button>
  </nav>
</template>

<style scoped>
.shopping-kurly-app { --kurly-purple:#5f0080; --kurly-lime:#b5d948; --kurly-ink:#32113f; --kurly-muted:#74657a; --kurly-line:rgba(95,0,128,.16); display:block; color:var(--kurly-ink); background:#f7f3f8; }
.kurly-topline,.kurly-search-wrap,.kurly-category-head,.kurly-products-heading,.kurly-product-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.kurly-topline { padding:14px 16px 10px; }
.kurly-back,.kurly-bag,.kurly-manage { position:relative; width:35px; height:35px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--kurly-line); border-radius:50%; color:var(--kurly-purple); background:#fff; }
.kurly-bag b { position:absolute; top:-4px; right:-4px; min-width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; background:var(--kurly-purple); font-size:8px; }
.kurly-brand { min-width:0; flex:1; display:flex; align-items:center; gap:9px; }
.kurly-mark { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; border-radius:50%; color:#fff; background:var(--kurly-purple); font-weight:900; }
.kurly-mark img { width:100%; height:100%; object-fit:cover; }
.kurly-brand h1 { margin:0; overflow:hidden; font:800 17px/1 Georgia, 'Times New Roman', serif; text-overflow:ellipsis; white-space:nowrap; }
.kurly-brand p,.kurly-category-head p,.kurly-products-heading p { margin:4px 0 0; color:var(--kurly-muted); font-size:8px; font-weight:900; letter-spacing:.09em; }
.kurly-search-wrap { padding:0 16px 12px; }
.kurly-search { min-width:0; flex:1; height:40px; display:flex; align-items:center; gap:9px; padding:0 12px; border:1px solid var(--kurly-line); border-radius:20px; color:var(--kurly-muted); background:#fff; }
.kurly-search input { min-width:0; flex:1; border:0; outline:0; color:var(--kurly-ink); background:transparent; font-size:11px; }
.kurly-delivery-note { margin:0 16px 14px; padding:9px 11px; display:flex; align-items:center; justify-content:space-between; gap:8px; border-radius:8px; color:var(--kurly-purple); background:var(--kurly-lime); font-size:8px; font-weight:900; }
.kurly-delivery-note span { display:flex; align-items:center; gap:4px; }
.kurly-delivery-note strong { font-size:9px; }
.kurly-lane-selector { margin:0 16px 14px; padding:4px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px; border:1px solid var(--kurly-line); border-radius:9px; background:#fff; }
.kurly-lane-button { min-height:34px; display:flex; align-items:center; justify-content:center; gap:5px; border-radius:6px; color:var(--kurly-muted); background:transparent; font-size:8px; font-weight:900; letter-spacing:.05em; }
.kurly-lane-button.is-active { color:var(--kurly-purple); background:#f1e8f3; box-shadow:inset 0 -2px 0 var(--kurly-lime); }
.kurly-hero { min-height:220px; padding:22px 16px 18px; display:grid; grid-template-columns:minmax(0,1.15fr) minmax(122px,.85fr); gap:15px; border-top:1px solid var(--kurly-line); border-bottom:1px solid var(--kurly-line); background:#fff; }
.kurly-hero-copy { display:flex; flex-direction:column; justify-content:flex-end; }
.kurly-eyebrow { margin:0 0 9px; color:var(--kurly-purple); font-size:9px; font-weight:900; letter-spacing:.12em; }
.kurly-hero h2 { max-width:9ch; margin:0; font:800 31px/1.02 Georgia, 'Times New Roman', serif; }
.kurly-hero-copy > p:not(.kurly-eyebrow):not(.shopping-map-reference) { max-width:26ch; margin:14px 0 0; color:var(--kurly-muted); font-size:11px; line-height:1.55; }
.kurly-map-reference { margin-top:14px; padding-top:9px; display:grid; grid-template-columns:12px auto; gap:2px 7px; border-top:1px solid var(--kurly-line); color:var(--kurly-muted); }
.kurly-map-reference i { grid-row:1 / span 2; align-self:center; color:var(--kurly-purple); }
.kurly-map-reference span { font-size:8px; font-weight:900; letter-spacing:.08em; }
.kurly-map-reference strong { color:var(--kurly-ink); font:700 12px/1.2 Georgia, 'Times New Roman', serif; }
.kurly-hero-stage { position:relative; min-height:182px; overflow:hidden; display:flex; align-items:center; justify-content:center; border-radius:12px 12px 36px 12px; background:#eee5f0; }
.kurly-hero-stage img { width:100%; height:100%; object-fit:cover; }
.kurly-circle { width:112px; height:112px; display:flex; align-items:center; justify-content:center; border:12px solid var(--kurly-lime); border-radius:50%; color:var(--kurly-purple); background:#fff; font-size:38px; }
.kurly-hero-stage > span { position:absolute; right:10px; bottom:10px; left:10px; color:var(--kurly-purple); font-size:8px; font-weight:900; text-align:center; letter-spacing:.1em; }
.kurly-category-head { padding:15px 16px 8px; }
.kurly-category-head p { margin:0; }
.kurly-category-head span { color:var(--kurly-purple); font:700 20px/1 Georgia, 'Times New Roman', serif; }
.kurly-category-list { padding:0 16px 14px; display:flex; gap:7px; overflow-x:auto; }
.kurly-category { min-width:72px; padding:8px 8px 7px; display:flex; align-items:center; gap:5px; border:1px solid var(--kurly-line); border-radius:9px; color:var(--kurly-muted); background:#fff; font-size:9px; font-weight:800; white-space:nowrap; }
.kurly-category-icon { width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:var(--kurly-purple); background:#f0e7f2; }
.kurly-category small { margin-left:auto; font-size:8px; opacity:.6; }
.kurly-category.is-active { border-color:var(--kurly-purple); color:var(--kurly-purple); box-shadow:0 0 0 2px rgba(95,0,128,.1); }
.kurly-store-nav { margin:0 16px 4px; padding:5px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:4px; border-radius:12px; background:#fff; box-shadow:0 4px 16px rgba(95,0,128,.08); }
.kurly-store-nav button { position:relative; min-height:43px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; color:var(--kurly-muted); font-size:9px; font-weight:800; }
.kurly-store-nav button.is-active { border-radius:8px; color:var(--kurly-purple); background:#f3eaf5; }
.kurly-store-nav b { position:absolute; top:1px; right:18%; min-width:15px; height:15px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; background:var(--kurly-purple); font-size:8px; }
.kurly-products { padding:13px 16px 26px; }
.kurly-products-heading { min-height:45px; margin-bottom:11px; }
.kurly-products-heading h2 { margin:5px 0 0; font:700 22px/1.05 Georgia, 'Times New Roman', serif; }
.kurly-products-heading > span { color:var(--kurly-muted); font-size:9px; font-weight:900; }
.kurly-clear { width:34px; height:34px; border:1px solid var(--kurly-line); border-radius:50%; color:var(--kurly-purple); background:#fff; }
.kurly-product-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.kurly-product-card { overflow:hidden; border:1px solid var(--kurly-line); border-radius:10px; color:var(--kurly-ink); background:#fff; }
.kurly-product-card.is-highlighted { border-color:var(--kurly-purple); box-shadow:0 0 0 2px rgba(95,0,128,.13); }
.kurly-product-visual { position:relative; aspect-ratio:1 / 1; overflow:hidden; background:#e7ddeb; }
.kurly-product-visual img { width:100%; height:100%; display:block; object-fit:cover; }
.kurly-product-symbol { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#fff; background:var(--kurly-purple); font-size:28px; }
.kurly-product-symbol span { position:absolute; right:8px; bottom:7px; font-size:9px; font-weight:900; }
.kurly-favorite { position:absolute; top:8px; right:8px; width:31px; height:31px; border:1px solid rgba(95,0,128,.14); border-radius:50%; color:#a99aae; background:rgba(255,255,255,.92); }
.kurly-favorite.is-favorite { color:var(--kurly-purple); }
.kurly-cold-badge { position:absolute; bottom:8px; left:8px; padding:4px 6px; border-radius:5px; color:var(--kurly-purple); background:var(--kurly-lime); font-size:8px; font-weight:900; }
.kurly-cold-badge i { margin-right:3px; }
.kurly-product-body { min-height:169px; padding:11px; display:flex; flex-direction:column; }
.kurly-product-brand { margin:0; color:var(--kurly-purple); font-size:8px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
.kurly-product-body h3 { min-height:35px; margin:5px 0 0; display:-webkit-box; overflow:hidden; font:700 14px/1.2 Georgia, 'Times New Roman', serif; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.kurly-product-body > p:not(.kurly-product-brand) { min-height:31px; margin:7px 0 0; display:-webkit-box; overflow:hidden; color:var(--kurly-muted); font-size:10px; line-height:1.5; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.kurly-product-tags { min-height:19px; margin-top:7px; display:flex; flex-wrap:wrap; gap:4px; }
.kurly-product-tags span { padding:3px 5px; border-radius:4px; color:var(--kurly-muted); background:#f5f1f6; font-size:8px; font-weight:800; }
.kurly-product-footer { margin-top:auto; padding-top:8px; }
.kurly-product-footer strong { font-size:12px; }
.kurly-add { width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; background:var(--kurly-purple); }
.kurly-add:disabled { opacity:.35; }
.kurly-empty { min-height:160px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; border:1px dashed var(--kurly-line); border-radius:10px; color:var(--kurly-muted); background:#fff; }
.kurly-empty p { margin:0; font-size:11px; }
.kurly-back:focus-visible,.kurly-bag:focus-visible,.kurly-manage:focus-visible,.kurly-category:focus-visible,.kurly-store-nav button:focus-visible,.kurly-favorite:focus-visible,.kurly-add:focus-visible,.kurly-lane-button:focus-visible { outline:3px solid var(--kurly-lime); outline-offset:2px; }
@media (min-width:680px) { .kurly-product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:350px) { .kurly-product-grid { grid-template-columns:1fr; } }

.kurly-hero { position:relative; min-height:310px; margin:0 16px 16px; padding:0; display:block; overflow:hidden; border:0; border-radius:20px 20px 8px 8px; background:#ece7ef; }
.kurly-hero-stage { position:absolute; inset:0; min-height:0; border:0; border-radius:0; background:linear-gradient(145deg,#dce8cb,#77518c); }
.kurly-hero-stage::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg,transparent 34%,rgba(35,17,45,.7)); }
.kurly-hero-copy { position:absolute; z-index:1; right:18px; bottom:17px; left:18px; display:block; color:#fff; }
.kurly-hero h2 { max-width:12ch; font-size:29px; }
.kurly-hero-copy > p:not(.kurly-eyebrow):not(.shopping-map-reference) { max-width:34ch; margin-top:9px; color:rgba(255,255,255,.8); }
.kurly-map-reference { width:fit-content; margin-top:11px; padding:7px 9px; border:1px solid rgba(255,255,255,.35); border-radius:999px; color:#fff; background:rgba(38,20,48,.32); backdrop-filter:blur(7px); }
.kurly-map-reference strong { color:#fff; }
.kurly-delivery-note { margin:0 16px; border-radius:12px 12px 0 0; box-shadow:none; }
.kurly-lane-selector { margin:0 16px 14px; padding:0 8px 9px; border-radius:0 0 12px 12px; background:#fff; }
.kurly-table-plan { margin:0 0 18px; display:grid; grid-template-columns:1.15fr .85fr; gap:8px; }
.kurly-table-plan article { min-height:132px; padding:15px 13px; display:flex; flex-direction:column; justify-content:flex-end; border-radius:14px; color:#fff; background:#4d2f5d; }
.kurly-table-plan article:last-child { color:#2d2530; background:#dbe9b9; }
.kurly-table-plan span { font-size:8px; font-weight:900; letter-spacing:.1em; }
.kurly-table-plan strong { margin-top:13px; font:800 15px/1.25 Georgia,'Times New Roman',serif; }
.kurly-table-plan small { margin-top:7px; font-size:8px; font-weight:800; opacity:.72; }
.kurly-store-nav { position:sticky; z-index:8; bottom:0; margin:0; padding:7px 10px calc(7px + env(safe-area-inset-bottom)); border:0; border-top:1px solid rgba(77,47,93,.16); border-radius:0; background:rgba(255,255,255,.96); box-shadow:0 -9px 25px rgba(46,28,55,.08); backdrop-filter:blur(10px); }
.kurly-store-nav button { min-height:48px; }
.kurly-store-nav button.is-active { background:transparent; }
.kurly-products { padding-bottom:18px; }
@media (max-width:390px) { .kurly-hero { min-height:285px; } .kurly-table-plan { grid-template-columns:1fr 1fr; } }
</style>
