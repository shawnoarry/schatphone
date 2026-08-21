<script setup>
import { ref } from 'vue'
import {
  SHOPPING_STOREFRONT_EVENTS,
  SHOPPING_STOREFRONT_PROPS,
  localizeShoppingCopy,
} from './shopping-storefront-contract'

const props = defineProps(SHOPPING_STOREFRONT_PROPS)
const emit = defineEmits(SHOPPING_STOREFRONT_EVENTS)
const localize = (zh, en) => localizeShoppingCopy(props.languageBase, zh, en)
const searchChanged = (event) => emit('update:searchQuery', event.target.value)
const editorialMode = ref('objects')
const issueIndexOpen = ref(false)
const editorialModeOptions = Object.freeze([
  { key: 'objects', zh: '物件', en: 'OBJECTS' },
  { key: 'lookbook', zh: '图册', en: 'LOOKBOOK' },
])
const setEditorialMode = (mode) => {
  editorialMode.value = mode
  issueIndexOpen.value = false
}
const editorialTitle = () =>
  props.languageBase === 'zh'
    ? props.activeService?.heroZh || props.activeService?.zh || '日常之外'
    : props.activeService?.heroEn || props.activeService?.en || 'Beyond ordinary'
</script>

<template>
  <header
    class="shopping-storefront-header shopping-29cm-app"
    :data-storefront="activeService?.storefrontTemplate || 'tech_catalog'"
    :data-editorial-mode="editorialMode"
    data-storefront-kind="marketplace"
  >
    <div class="cm-topbar">
      <button
        type="button"
        class="cm-back"
        data-testid="shopping-go-home"
        :aria-label="localize('返回主屏幕', 'Back to Home')"
        :title="localize('返回主屏幕', 'Back to Home')"
        @click="emit('go-home')"
      >
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>
      <div class="cm-wordmark">
        <span v-if="brandAssetUrl" class="cm-logo"><img :src="brandAssetUrl" alt="" /></span>
        <span v-else class="cm-logo">29</span>
        <div>
          <h1>{{ activeLabel || activeService?.en || activeService?.zh || '29CM' }}</h1>
          <p>{{ localize('编辑式生活方式', 'CURATED LIFESTYLE') }}</p>
        </div>
      </div>
      <div class="cm-actions">
        <button
          type="button"
          class="cm-action"
          :aria-label="localize('收藏', 'Favorites')"
          :title="localize('收藏', 'Favorites')"
          @click="emit('open-favorites')"
        >
          <i class="fas fa-heart" aria-hidden="true"></i>
          <small v-if="favoriteCount">{{ favoriteCount }}</small>
        </button>
        <button
          type="button"
          class="cm-action"
          :aria-label="localize('购物车', 'Cart')"
          :title="localize('购物车', 'Cart')"
          @click="emit('open-cart')"
        >
          <i class="fas fa-bag-shopping" aria-hidden="true"></i>
          <small v-if="cartQuantity">{{ cartQuantity }}</small>
        </button>
      </div>
    </div>

    <nav class="cm-store-nav" :aria-label="localize('店内导航', 'Store navigation')">
      <button type="button" :class="{ 'is-active': !favoritesOnly }" @click="emit('show-all')"><span>{{ localize('本期', 'ISSUES') }}</span></button>
      <button type="button" :class="{ 'is-active': favoritesOnly }" @click="emit('open-favorites')"><span>{{ localize('收藏', 'SAVED') }}</span></button>
      <button type="button" @click="emit('open-cart')"><span>{{ localize('选品袋', 'SELECTION') }}</span><b v-if="cartQuantity">{{ cartQuantity }}</b></button>
      <button type="button" @click="emit('open-orders')"><span>{{ localize('档案', 'ARCHIVE') }}</span><b v-if="orderCount">{{ orderCount }}</b></button>
    </nav>

    <div class="cm-search-line">
      <label class="cm-search">
        <span>{{ localize('搜索', 'SEARCH') }}</span>
        <input
          type="search"
          role="searchbox"
          :aria-label="localize('搜索商品', 'Search products')"
          :placeholder="localize('搜索品牌、设计师和物件', 'Search brands, designers, and objects')"
          :value="searchQuery"
          @input="searchChanged"
        />
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
      </label>
      <button
        type="button"
        class="cm-manage"
        :aria-label="localize('管理商品', 'Manage catalog')"
        :title="localize('管理商品', 'Manage catalog')"
        @click="emit('open-manager')"
      >
        <i class="fas fa-sliders" aria-hidden="true"></i>
      </button>
    </div>

    <div class="cm-editorial-hero">
      <div class="cm-editorial-copy">
        <p class="cm-kicker">{{ localize('本周编辑精选', 'THE EDIT / WEEK 34') }}</p>
        <h2>{{ editorialTitle() }}</h2>
        <p>{{ activeDescription || activeService?.descZh || activeService?.descEn || '' }}</p>
        <p
          v-if="mapReference?.placeId"
          class="shopping-map-reference cm-map-reference"
          data-testid="shopping-map-reference"
          :data-map-place-id="mapReference.placeId"
        >
          <i class="fas fa-location-dot" aria-hidden="true"></i>
          <span>{{ localize('首尔场景锚点', 'SEOUL SETTING') }}</span>
          <strong>{{ mapReference.district }}</strong>
        </p>
      </div>
      <div class="cm-editorial-image" aria-hidden="true">
        <img v-if="coverImageUrl" :src="coverImageUrl" :alt="`${activeService?.en || '29CM'} cover`" />
        <template v-else>
          <span class="cm-image-note">OBJECT<br />OF<br />THE DAY</span>
          <i :class="activeService?.icon || 'fas fa-gem'"></i>
        </template>
      </div>
    </div>

    <div class="cm-editorial-controls" :aria-label="localize('编辑视图', 'Editorial view')">
      <div class="cm-mode-switch" role="tablist">
        <button
          v-for="mode in editorialModeOptions"
          :key="mode.key"
          type="button"
          class="cm-mode-button"
          :class="{ 'is-active': editorialMode === mode.key }"
          role="tab"
          :aria-selected="editorialMode === mode.key"
          :data-testid="`shopping-29cm-mode-${mode.key}`"
          @click="setEditorialMode(mode.key)"
        >
          {{ localize(mode.zh, mode.en) }}
        </button>
      </div>
      <button
        type="button"
        class="cm-issue-toggle"
        :aria-expanded="issueIndexOpen"
        data-testid="shopping-29cm-issue-toggle"
        @click="issueIndexOpen = !issueIndexOpen"
      >
        <span>{{ localize('目录索引', 'ISSUE INDEX') }}</span>
        <i :class="issueIndexOpen ? 'fas fa-minus' : 'fas fa-plus'" aria-hidden="true"></i>
      </button>
    </div>
    <div v-if="issueIndexOpen" class="cm-issue-index">
      <span>{{ localize('本期章节', 'THIS ISSUE') }}</span>
      <ol>
        <li>{{ localize('一件物件的日常', 'The daily life of an object') }}</li>
        <li>{{ localize('首尔的安静角落', 'Quiet corners of Seoul') }}</li>
        <li>{{ localize('把选择留给生活', 'Leave room for living') }}</li>
      </ol>
    </div>

    <div class="cm-category-bar">
      <button
        v-for="category in categoryCards"
        :key="category.key"
        type="button"
        class="cm-category"
        :class="{ 'is-active': category.active, 'border-orange-300': category.active }"
        :data-testid="`shopping-category-${category.key}`"
        @click="emit('select-category', category.key)"
      >
        <span>{{ category.label }}</span>
        <em>{{ category.count }}</em>
      </button>
    </div>

  </header>

  <section
    v-if="!activeCategoryIsLogistics"
    id="shopping-products"
    class="shopping-products-section cm-products"
    :class="{ 'is-lookbook': editorialMode === 'lookbook' }"
  >
    <div class="cm-products-heading">
      <div>
        <p>{{ favoritesOnly ? localize('已保存的单品', 'SAVED OBJECTS') : localize('当季灵感', 'CURRENT SELECTION') }}</p>
        <h2>{{ activeCategory?.label || localize('精选', 'Selection') }}</h2>
      </div>
      <button
        v-if="favoritesOnly"
        type="button"
        class="cm-clear"
        :aria-label="localize('显示全部商品', 'Show all products')"
        :title="localize('显示全部商品', 'Show all products')"
        @click="emit('show-all')"
      >
        {{ localize('清除', 'CLEAR') }}
      </button>
      <span v-else>{{ visibleProducts.length }} {{ localize('件', 'OBJECTS') }}</span>
    </div>
    <div v-if="visibleProducts.length === 0" class="cm-empty">
      <i class="fas fa-compass" aria-hidden="true"></i>
      <p>{{ favoritesOnly ? localize('这里还没有收藏商品。', 'No saved items here yet.') : searchQuery ? localize('没有找到匹配商品。', 'No matching products found.') : localize('这个分类还没有商品。', 'No products in this category yet.') }}</p>
    </div>
    <div v-else class="cm-product-grid">
      <article
        v-for="product in visibleProducts"
        :key="product.id"
        class="shopping-product-card cm-product-card"
        :class="{ 'is-highlighted': product.id === highlightedProductId }"
        :data-product-template="productStorefrontTemplate(product)"
        :data-testid="`shopping-product-${product.id}`"
        role="button"
        tabindex="0"
        @click="emit('open-product', product.id)"
        @keydown.enter.prevent="emit('open-product', product.id)"
      >
        <div class="cm-product-visual">
          <img v-if="productImageUrl(product)" :src="productImageUrl(product)" :alt="product.image?.alt || productDisplayTitle(product)" />
          <div v-else class="cm-product-symbol" aria-hidden="true">
            <span>{{ activeService?.mark || '29' }}</span>
            <i :class="productCategoryIcon(product)"></i>
          </div>
          <button
            type="button"
            class="cm-favorite"
            :class="{ 'is-favorite': isProductFavorite(product.id) }"
            :aria-label="localize('收藏或取消收藏', 'Toggle favorite')"
            :title="localize('收藏或取消收藏', 'Toggle favorite')"
            @click.stop="emit('toggle-favorite', product.id)"
          >
            <i class="fas fa-heart" aria-hidden="true"></i>
          </button>
        </div>
        <div class="cm-product-body">
          <p class="cm-product-brand">{{ productServiceLabel(product) }}</p>
          <h3>{{ productDisplayTitle(product) }}</h3>
          <p>{{ productDisplayDescription(product) }}</p>
          <div class="cm-product-meta">
            <span :class="stockStatusClass(product.stockStatus)">{{ stockStatusLabel(product.stockStatus) }}</span>
            <span v-if="product.assetEligible">{{ localize('可转资产', 'Asset-ready') }}</span>
            <span v-else-if="product.giftable">{{ localize('可赠礼', 'Giftable') }}</span>
          </div>
          <div class="cm-product-footer">
            <strong>{{ formatPrice(product) }}</strong>
            <button
              type="button"
              class="cm-add"
              :disabled="product.stockStatus === 'sold_out'"
              :data-testid="`shopping-add-cart-${product.id}`"
              :aria-label="`${localize('加入购物车', 'Add to cart')}: ${productDisplayTitle(product)}`"
              @click.stop="emit('add-to-cart', product.id)"
            >
              <span>+</span>
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.shopping-29cm-app { --cm-ink: #050505; --cm-muted: #686868; --cm-orange: #ff4800; --cm-line: rgba(0,0,0,.16); display: block; color: var(--cm-ink); background: #f7f7f7; }
.cm-topbar,.cm-search-line,.cm-products-heading,.cm-product-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.cm-topbar { padding:14px 16px 10px; }
.cm-back,.cm-action,.cm-manage { position:relative; width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--cm-line); border-radius:50%; color:var(--cm-ink); background:#fff; }
.cm-actions { display:flex; gap:6px; }
.cm-action small { position:absolute; top:-4px; right:-4px; min-width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; background:var(--cm-orange); font-size:8px; font-weight:900; }
.cm-wordmark { min-width:0; flex:1; display:flex; align-items:center; gap:9px; }
.cm-logo { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; color:#fff; background:#050505; font-size:13px; font-weight:900; }
.cm-logo img { width:100%; height:100%; object-fit:cover; }
.cm-wordmark h1 { margin:0; overflow:hidden; font:900 17px/1 Georgia, 'Times New Roman', serif; text-overflow:ellipsis; white-space:nowrap; }
.cm-wordmark p,.cm-products-heading p { margin:4px 0 0; color:var(--cm-muted); font-size:8px; font-weight:900; letter-spacing:.13em; }
.cm-search-line { padding:0 16px 14px; }
.cm-search { min-width:0; flex:1; display:flex; align-items:center; gap:9px; border-bottom:1px solid var(--cm-ink); padding:8px 0; }
.cm-search span { color:var(--cm-orange); font-size:8px; font-weight:900; letter-spacing:.11em; }
.cm-search input { min-width:0; flex:1; border:0; outline:0; color:var(--cm-ink); background:transparent; font-size:12px; }
.cm-editorial-hero { min-height:250px; padding:24px 16px 19px; display:grid; grid-template-columns:minmax(0,1fr) minmax(124px,.82fr); gap:16px; border-top:1px solid var(--cm-line); border-bottom:1px solid var(--cm-line); background:#fff; }
.cm-editorial-copy { display:flex; flex-direction:column; justify-content:flex-end; }
.cm-kicker { margin:0 0 11px; color:var(--cm-orange); font-size:9px; font-weight:900; letter-spacing:.12em; }
.cm-editorial-copy h2 { max-width:8ch; margin:0; font:900 36px/.95 Georgia, 'Times New Roman', serif; letter-spacing:-.04em; }
.cm-editorial-copy > p:not(.cm-kicker):not(.shopping-map-reference) { max-width:25ch; margin:16px 0 0; color:var(--cm-muted); font-size:11px; line-height:1.55; }
.cm-map-reference { margin-top:15px; padding-top:9px; display:grid; grid-template-columns:12px auto; gap:2px 7px; border-top:1px solid var(--cm-line); color:var(--cm-muted); }
.cm-map-reference i { grid-row:1 / span 2; align-self:center; color:var(--cm-orange); }
.cm-map-reference span { font-size:8px; font-weight:900; letter-spacing:.1em; }
.cm-map-reference strong { color:var(--cm-ink); font:700 12px/1.2 Georgia, 'Times New Roman', serif; }
.cm-editorial-image { position:relative; min-height:208px; overflow:hidden; display:flex; align-items:center; justify-content:center; border:1px solid var(--cm-ink); background:#ececec; }
.cm-editorial-image img { width:100%; height:100%; object-fit:cover; }
.cm-editorial-image i { color:#fff; font-size:46px; }
.cm-image-note { position:absolute; top:12px; left:11px; color:var(--cm-orange); font-size:9px; font-weight:900; line-height:1.2; letter-spacing:.06em; }
.cm-editorial-controls { padding:10px 16px; display:flex; align-items:center; justify-content:space-between; gap:10px; border-bottom:1px solid var(--cm-line); background:#fff; }
.cm-mode-switch { display:flex; gap:3px; }
.cm-mode-button,.cm-issue-toggle { min-height:30px; padding:0 9px; border:1px solid var(--cm-line); color:var(--cm-muted); background:#fff; font-size:8px; font-weight:900; letter-spacing:.1em; }
.cm-mode-button.is-active { border-color:var(--cm-ink); color:#fff; background:var(--cm-ink); }
.cm-issue-toggle { display:inline-flex; align-items:center; gap:7px; color:var(--cm-orange); }
.cm-issue-index { padding:12px 16px 14px; display:grid; grid-template-columns:90px 1fr; gap:12px; border-bottom:1px solid var(--cm-line); color:var(--cm-muted); background:#f1f1f1; animation:cm-index-reveal .22s ease both; }
.cm-issue-index > span { color:var(--cm-orange); font-size:8px; font-weight:900; letter-spacing:.1em; }
.cm-issue-index ol { margin:0; padding-left:17px; color:var(--cm-ink); font:700 12px/1.55 Georgia, 'Times New Roman', serif; }
.cm-products.is-lookbook .cm-product-grid { grid-template-columns:1fr; }
.cm-products.is-lookbook .cm-product-card { display:grid; grid-template-columns:minmax(120px,.78fr) 1fr; animation:cm-lookbook-reveal .28s ease both; }
.cm-products.is-lookbook .cm-product-visual { aspect-ratio:4 / 3; }
.cm-products.is-lookbook .cm-product-body { min-height:0; }
@keyframes cm-index-reveal { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } }
@keyframes cm-lookbook-reveal { from { opacity:.35; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
.cm-category-bar { padding:13px 16px 10px; display:flex; gap:18px; overflow-x:auto; border-bottom:1px solid var(--cm-line); background:#fff; }
.cm-category { position:relative; flex:0 0 auto; padding:0 0 8px; color:var(--cm-muted); font-size:11px; font-weight:800; white-space:nowrap; }
.cm-category em { margin-left:4px; color:var(--cm-muted); font-size:8px; font-style:normal; opacity:.7; }
.cm-category.is-active { color:var(--cm-ink); }
.cm-category.is-active::after { content:''; position:absolute; right:0; bottom:0; left:0; height:2px; background:var(--cm-orange); }
.cm-store-nav { padding:6px 16px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:4px; border-bottom:1px solid var(--cm-line); background:#fff; }
.cm-store-nav button { position:relative; min-height:34px; color:var(--cm-muted); font-size:9px; font-weight:900; letter-spacing:.08em; }
.cm-store-nav button.is-active { color:var(--cm-ink); }
.cm-store-nav button.is-active::after { content:''; position:absolute; right:22%; bottom:2px; left:22%; height:2px; background:var(--cm-orange); }
.cm-store-nav b { margin-left:3px; color:var(--cm-orange); font-size:8px; }
.cm-products { padding:22px 16px 27px; }
.cm-products-heading { min-height:44px; margin-bottom:13px; }
.cm-products-heading h2 { margin:5px 0 0; font:900 24px/1 Georgia, 'Times New Roman', serif; letter-spacing:-.03em; }
.cm-products-heading > span { color:var(--cm-muted); font-size:9px; font-weight:900; letter-spacing:.1em; }
.cm-clear { color:var(--cm-orange); font-size:9px; font-weight:900; letter-spacing:.08em; }
.cm-product-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:13px 10px; }
.cm-product-card { overflow:hidden; border:1px solid var(--cm-line); color:var(--cm-ink); background:#fff; }
.cm-product-card.is-highlighted { border-color:var(--cm-orange); box-shadow:0 0 0 2px rgba(255,72,0,.13); }
.cm-product-visual { position:relative; aspect-ratio:4 / 5; overflow:hidden; background:#e7e7e7; }
.cm-product-visual img { width:100%; height:100%; display:block; object-fit:cover; }
.cm-product-symbol { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#fff; background:#050505; }
.cm-product-symbol span { position:absolute; top:10px; left:10px; font-size:12px; font-weight:900; }
.cm-product-symbol i { font-size:35px; }
.cm-favorite { position:absolute; right:8px; bottom:8px; width:30px; height:30px; border:1px solid rgba(0,0,0,.2); border-radius:50%; color:#777; background:rgba(255,255,255,.9); }
.cm-favorite.is-favorite { color:var(--cm-orange); }
.cm-product-body { min-height:171px; padding:11px; display:flex; flex-direction:column; }
.cm-product-brand { margin:0; color:var(--cm-orange); font-size:8px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
.cm-product-body h3 { min-height:35px; margin:7px 0 0; display:-webkit-box; overflow:hidden; font:800 15px/1.16 Georgia, 'Times New Roman', serif; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.cm-product-body > p:not(.cm-product-brand) { min-height:31px; margin:7px 0 0; display:-webkit-box; overflow:hidden; color:var(--cm-muted); font-size:10px; line-height:1.5; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.cm-product-meta { min-height:19px; margin-top:7px; display:flex; flex-wrap:wrap; gap:4px; }
.cm-product-meta span { padding:3px 5px; color:var(--cm-muted); background:#f2f2f2; font-size:8px; font-weight:800; }
.cm-product-footer { margin-top:auto; padding-top:9px; }
.cm-product-footer strong { font-size:12px; }
.cm-add { width:33px; height:33px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--cm-ink); color:#fff; background:var(--cm-ink); font-size:19px; line-height:1; }
.cm-add:disabled { opacity:.35; }
.cm-empty { min-height:160px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; border:1px solid var(--cm-line); color:var(--cm-muted); background:#fff; }
.cm-empty p { margin:0; font-size:11px; }
.cm-back:focus-visible,.cm-action:focus-visible,.cm-manage:focus-visible,.cm-category:focus-visible,.cm-store-nav button:focus-visible,.cm-favorite:focus-visible,.cm-add:focus-visible,.cm-mode-button:focus-visible,.cm-issue-toggle:focus-visible { outline:3px solid var(--cm-orange); outline-offset:2px; }
@media (min-width:680px) { .cm-product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:350px) { .cm-product-grid { grid-template-columns:1fr; } .cm-products.is-lookbook .cm-product-card { display:block; } .cm-issue-index { grid-template-columns:1fr; gap:5px; } }

.cm-store-nav { padding:0 16px 12px; display:flex; align-items:center; gap:18px; overflow-x:auto; border:0; background:#f7f7f7; }
.cm-store-nav button { min-width:auto; min-height:28px; padding:0; display:inline-flex; align-items:center; gap:4px; color:#777; background:transparent; font-size:8px; font-weight:900; letter-spacing:.14em; white-space:nowrap; }
.cm-store-nav button.is-active { color:var(--cm-ink); background:transparent; }
.cm-store-nav button.is-active::after { content:' /'; position:static; width:auto; height:auto; color:var(--cm-orange); background:transparent; }
.cm-store-nav b { position:static; min-width:auto; height:auto; padding:0; color:var(--cm-orange); background:transparent; font-size:8px; }
.cm-editorial-hero { position:relative; min-height:360px; padding:0; display:block; overflow:hidden; border-top:1px solid var(--cm-ink); border-bottom:1px solid var(--cm-ink); background:#d9d9d9; }
.cm-editorial-image { position:absolute; inset:0; min-height:0; border:0; background:linear-gradient(135deg,#d9d9d9 0 56%,#111 56% 100%); }
.cm-editorial-image::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg,transparent 28%,rgba(0,0,0,.46)); }
.cm-editorial-copy { position:absolute; z-index:1; right:12px; bottom:14px; left:16px; max-width:78%; padding:15px 16px 14px; display:block; color:var(--cm-ink); background:rgba(255,255,255,.94); backdrop-filter:blur(8px); }
.cm-editorial-copy h2 { max-width:9ch; font-size:34px; }
.cm-editorial-copy > p:not(.cm-kicker):not(.shopping-map-reference) { margin-top:10px; }
.cm-map-reference { margin-top:10px; }
.cm-image-note { z-index:2; top:16px; right:14px; left:auto; color:#fff; text-align:right; }
.cm-editorial-image i { position:relative; z-index:1; font-size:62px; }
.cm-search-line { padding-top:12px; background:#fff; }
.cm-products.is-lookbook .cm-product-card:nth-child(even) { margin-left:12%; }
.cm-products:not(.is-lookbook) .cm-product-card:nth-child(3n + 2) { transform:translateY(24px); }
.cm-products:not(.is-lookbook) .cm-product-grid { padding-bottom:24px; }
@media (max-width:390px) { .cm-editorial-hero { min-height:330px; } .cm-editorial-copy { max-width:calc(100% - 44px); } }
</style>
