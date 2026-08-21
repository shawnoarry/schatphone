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
const popularSearches = Object.freeze([
  { zh: '周末厨房', en: 'Weekend kitchen' },
  { zh: '桌面收纳', en: 'Desk storage' },
  { zh: '生日礼物', en: 'Birthday gifts' },
  { zh: '首尔日常补给', en: 'Seoul restock' },
])
const quickLanes = Object.freeze([
  { icon: 'fas fa-rocket', zh: '火箭路线', en: 'Rocket lane', detailZh: '把今天要用的先放到前面。', detailEn: 'Put today’s needs first.', tone: 'red' },
  { icon: 'fas fa-rotate', zh: '一键复购', en: 'Reorder ready', detailZh: '日常补给不必重新找。', detailEn: 'Everyday restocks stay easy.', tone: 'blue' },
  { icon: 'fas fa-route', zh: '物流可追踪', en: 'Delivery trace', detailZh: '从下单到抵达都有位置。', detailEn: 'Keep the order journey visible.', tone: 'green' },
])
const choosePopularSearch = (term) => emit('update:searchQuery', localize(term.zh, term.en))
const iconForCategory = (category) => category.icon || 'fas fa-tag'
const heroTitle = () =>
  props.languageBase === 'zh'
    ? props.activeService?.heroZh || props.activeService?.zh || '城市购物'
    : props.activeService?.heroEn || props.activeService?.en || 'City shopping'
</script>

<template>
  <header
    class="shopping-storefront-header shopping-coupang-app"
    :data-storefront="activeService?.storefrontTemplate || 'city_market'"
    data-storefront-kind="marketplace"
    data-coupang-ui="rocket-market"
  >
    <div class="coupang-topbar">
      <button
        type="button"
        class="coupang-icon-button"
        data-testid="shopping-go-home"
        :aria-label="localize('返回主屏幕', 'Back to Home')"
        :title="localize('返回主屏幕', 'Back to Home')"
        @click="emit('go-home')"
      >
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <div class="coupang-identity">
        <span class="coupang-mark" aria-hidden="true">
          <img v-if="brandAssetUrl" :src="brandAssetUrl" alt="" />
          <template v-else>{{ activeService?.mark || 'C' }}</template>
        </span>
        <div>
          <h1>{{ activeLabel || activeService?.zh || activeService?.en || 'Coupang' }}</h1>
          <p>{{ localize('城市购物平台', 'CITY MARKETPLACE') }}</p>
        </div>
      </div>
      <div class="coupang-rocket-status" aria-label="Rocket delivery status">
        <i class="fas fa-rocket" aria-hidden="true"></i>
        <span>{{ localize('今日到达', 'ARRIVES TODAY') }}</span>
      </div>
    </div>

    <div
      v-if="mapReference?.placeId"
      class="shopping-map-reference coupang-address-bar"
      data-testid="shopping-map-reference"
      :data-map-place-id="mapReference.placeId"
    >
      <i class="fas fa-location-dot" aria-hidden="true"></i>
      <span>{{ localize('送至', 'DELIVER TO') }}</span>
      <strong>{{ mapReference.district }}</strong>
      <i class="fas fa-chevron-down" aria-hidden="true"></i>
    </div>

    <div class="coupang-search-row">
      <label class="coupang-search">
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
        <input
          type="search"
          role="searchbox"
          :aria-label="localize('搜索商品', 'Search products')"
          :placeholder="localize('搜索商品、品牌或关键词', 'Search products, brands, or keywords')"
          :value="searchQuery"
          @input="searchChanged"
        />
      </label>
      <button
        type="button"
        class="coupang-manage"
        :aria-label="localize('管理商品', 'Manage catalog')"
        :title="localize('管理商品', 'Manage catalog')"
        @click="emit('open-manager')"
      >
        <i class="fas fa-sliders" aria-hidden="true"></i>
      </button>
    </div>

    <div class="coupang-popular-row" :aria-label="localize('热门搜索', 'Popular searches')">
      <span class="coupang-popular-label">{{ localize('热门', 'TRENDING') }}</span>
      <button
        v-for="term in popularSearches"
        :key="term.en"
        type="button"
        class="coupang-search-chip"
        @click="choosePopularSearch(term)"
      >
        {{ localize(term.zh, term.en) }}
      </button>
    </div>

    <section class="coupang-lane-strip" :aria-label="localize('购物路径', 'Shopping lanes')">
      <article v-for="lane in quickLanes" :key="lane.en" class="coupang-lane" :class="`is-${lane.tone}`">
        <span class="coupang-lane-icon"><i :class="lane.icon" aria-hidden="true"></i></span>
        <div>
          <strong>{{ localize(lane.zh, lane.en) }}</strong>
          <p>{{ localize(lane.detailZh, lane.detailEn) }}</p>
        </div>
      </article>
    </section>

    <div class="coupang-hero">
      <div class="coupang-hero-stage" aria-hidden="true">
        <img v-if="coverImageUrl" :src="coverImageUrl" :alt="`${activeService?.en || 'Coupang'} cover`" />
        <template v-else>
          <div class="coupang-stage-burst"><i :class="activeService?.icon || 'fas fa-bag-shopping'"></i></div>
          <span class="coupang-stage-label">ROCKET / CITY / DAILY</span>
        </template>
      </div>
      <div class="coupang-hero-copy">
        <p class="coupang-eyebrow">{{ localize('本周 생활精选', 'WEEKLY VALUE EDIT') }}</p>
        <h2>{{ heroTitle() }}</h2>
        <p>{{ activeDescription || activeService?.descZh || activeService?.descEn || '' }}</p>
      </div>
    </div>

    <div class="coupang-category-heading">
      <div>
        <p>{{ localize('按场景挑选', 'SHOP BY SCENE') }}</p>
        <strong>{{ activeCategory?.label || localize('全部商品', 'All products') }}</strong>
      </div>
      <span>{{ visibleProducts.length }} {{ localize('件', 'items') }}</span>
    </div>
    <div class="coupang-category-grid" role="list" :aria-label="localize('商品分类', 'Product categories')">
      <button
        v-for="category in categoryCards"
        :key="category.key"
        type="button"
        class="coupang-category-card"
        :class="{ 'is-active': category.active, 'border-orange-300': category.active }"
        :data-testid="`shopping-category-${category.key}`"
        @click="emit('select-category', category.key)"
      >
        <i :class="iconForCategory(category)" aria-hidden="true"></i>
        <span>{{ category.label }}</span>
        <small>{{ category.count }}</small>
      </button>
    </div>

  </header>

  <section v-if="!activeCategoryIsLogistics" id="shopping-products" class="shopping-products-section coupang-products">
    <div class="coupang-products-heading">
      <div>
        <p>{{ favoritesOnly ? localize('我的收藏', 'SAVED FOR LATER') : localize('即时可得', 'READY FOR NOW') }}</p>
        <h2>{{ activeCategory?.label || localize('全部商品', 'All products') }}</h2>
      </div>
      <button
        v-if="favoritesOnly"
        type="button"
        class="coupang-clear-filter"
        :aria-label="localize('显示全部商品', 'Show all products')"
        :title="localize('显示全部商品', 'Show all products')"
        @click="emit('show-all')"
      >
        <i class="fas fa-xmark" aria-hidden="true"></i>
      </button>
      <span v-else>{{ visibleProducts.length }} {{ localize('件商品', 'items') }}</span>
    </div>
    <div v-if="visibleProducts.length === 0" class="coupang-empty">
      <i class="fas fa-box-open" aria-hidden="true"></i>
      <p>{{ favoritesOnly ? localize('这里还没有收藏商品。', 'No saved items here yet.') : searchQuery ? localize('没有找到匹配商品。', 'No matching products found.') : localize('这个分类还没有商品。', 'No products in this category yet.') }}</p>
    </div>
    <div v-else class="coupang-product-grid">
      <article
        v-for="product in visibleProducts"
        :key="product.id"
        class="shopping-product-card coupang-product-card"
        :class="{ 'is-highlighted': product.id === highlightedProductId }"
        :data-product-template="productStorefrontTemplate(product)"
        :data-testid="`shopping-product-${product.id}`"
      >
        <div class="coupang-product-visual">
          <img v-if="productImageUrl(product)" :src="productImageUrl(product)" :alt="product.image?.alt || productDisplayTitle(product)" />
          <div v-else class="coupang-product-symbol" aria-hidden="true">
            <i :class="productCategoryIcon(product)"></i>
            <span>{{ activeService?.mark || 'C' }}</span>
          </div>
          <span class="coupang-product-lane">ROCKET</span>
          <button
            type="button"
            class="coupang-favorite"
            :class="{ 'is-favorite': isProductFavorite(product.id) }"
            :aria-label="localize('收藏或取消收藏', 'Toggle favorite')"
            :title="localize('收藏或取消收藏', 'Toggle favorite')"
            @click="emit('toggle-favorite', product.id)"
          >
            <i class="fas fa-heart" aria-hidden="true"></i>
          </button>
        </div>
        <div class="coupang-product-body">
          <button
            type="button"
            class="coupang-product-open"
            :aria-label="`${localize('查看商品详情', 'View product details')}: ${productDisplayTitle(product)}`"
            @click="emit('open-product', product.id)"
          >
            <p class="coupang-product-brand">{{ productServiceLabel(product) }}</p>
            <h3>{{ productDisplayTitle(product) }}</h3>
            <p>{{ productDisplayDescription(product) }}</p>
          </button>
          <div class="coupang-product-tags">
            <span :class="stockStatusClass(product.stockStatus)">{{ stockStatusLabel(product.stockStatus) }}</span>
            <span v-if="product.giftable">{{ localize('可赠礼', 'Giftable') }}</span>
          </div>
          <div class="coupang-product-footer">
            <strong>{{ formatPrice(product) }}</strong>
            <button
              type="button"
              class="coupang-add"
              :disabled="product.stockStatus === 'sold_out'"
              :data-testid="`shopping-add-cart-${product.id}`"
              :aria-label="`${localize('加入购物车', 'Add to cart')}: ${productDisplayTitle(product)}`"
              @click="emit('add-to-cart', product.id)"
            >
              <i class="fas fa-plus" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>

  <nav class="coupang-store-nav" :aria-label="localize('店内导航', 'Store navigation')">
    <button type="button" :class="{ 'is-active': !favoritesOnly }" @click="emit('show-all')">
      <i class="fas fa-house" aria-hidden="true"></i>
      <span>{{ localize('首页', 'Home') }}</span>
    </button>
    <button type="button" :class="{ 'is-active': favoritesOnly }" @click="emit('open-favorites')">
      <i class="fas fa-repeat" aria-hidden="true"></i>
      <span>{{ localize('复购', 'Reorder') }}</span>
      <b v-if="favoriteCount">{{ favoriteCount }}</b>
    </button>
    <button type="button" @click="emit('open-cart')">
      <i class="fas fa-cart-shopping" aria-hidden="true"></i>
      <span>{{ localize('购物车', 'Cart') }}</span>
      <b v-if="cartQuantity">{{ cartQuantity }}</b>
    </button>
    <button type="button" @click="emit('open-orders')">
      <i class="fas fa-user" aria-hidden="true"></i>
      <span>{{ localize('我的', 'My') }}</span>
      <b v-if="orderCount">{{ orderCount }}</b>
    </button>
  </nav>
</template>

<style scoped>
.shopping-coupang-app {
  --coupang-red: #e52a2f;
  --coupang-ink: #1e2329;
  --coupang-muted: #66707a;
  --coupang-line: rgba(30, 35, 41, 0.14);
  display: block;
  color: var(--coupang-ink);
  background: #f5f6f7;
}
.coupang-topbar,
.coupang-search-row,
.coupang-category-heading,
.coupang-products-heading,
.coupang-product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.coupang-topbar { padding: 14px 16px 10px; }
.coupang-icon-button,
.coupang-manage {
  position: relative;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  border: 1px solid var(--coupang-line);
  border-radius: 50%;
  color: var(--coupang-ink);
  background: #fff;
}
.coupang-actions { display: flex; gap: 6px; }
.coupang-count,
.coupang-store-nav b {
  position: absolute;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: #fff;
  background: var(--coupang-red);
  font-size: 8px;
  font-weight: 900;
}
.coupang-count { top: -4px; right: -3px; }
.coupang-identity { min-width: 0; display: flex; align-items: center; gap: 9px; flex: 1; }
.coupang-mark { width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 7px; color: #fff; background: var(--coupang-red); font-weight: 900; }
.coupang-mark img { width: 100%; height: 100%; object-fit: cover; }
.coupang-identity h1 { margin: 0; overflow: hidden; font: 800 17px/1.1 Georgia, 'Times New Roman', serif; text-overflow: ellipsis; white-space: nowrap; }
.coupang-identity p,
.coupang-category-heading p,
.coupang-products-heading p { margin: 3px 0 0; color: var(--coupang-muted); font-size: 9px; font-weight: 900; letter-spacing: .08em; }
.coupang-search-row { padding: 0 16px 14px; }
.coupang-search { min-width: 0; flex: 1; height: 42px; display: flex; align-items: center; gap: 9px; padding: 0 13px; border: 1px solid var(--coupang-line); border-radius: 9px; color: var(--coupang-muted); background: #fff; }
.coupang-search input { min-width: 0; flex: 1; border: 0; outline: 0; color: var(--coupang-ink); background: transparent; font-size: 12px; }
.coupang-hero { min-height: 238px; padding: 22px 16px 18px; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(120px, .85fr); gap: 15px; border-top: 1px solid var(--coupang-line); border-bottom: 1px solid var(--coupang-line); background: linear-gradient(135deg, #fff 0%, #fff 63%, #fff0f0 63%); }
.coupang-hero-copy { display: flex; flex-direction: column; justify-content: flex-end; }
.coupang-eyebrow { margin: 0 0 10px; color: var(--coupang-red); font-size: 9px; font-weight: 900; letter-spacing: .13em; }
.coupang-hero h2 { max-width: 9ch; margin: 0; font: 800 31px/1.06 Georgia, 'Times New Roman', serif; }
.coupang-hero-copy > p:not(.coupang-eyebrow):not(.shopping-map-reference) { max-width: 28ch; margin: 14px 0 0; color: var(--coupang-muted); font-size: 11px; line-height: 1.6; }
.shopping-map-reference { width: fit-content; max-width: 100%; margin: 14px 0 0; padding-top: 9px; display: grid; grid-template-columns: 12px minmax(0, auto); gap: 2px 7px; border-top: 1px solid var(--coupang-line); color: var(--coupang-muted); }
.shopping-map-reference i { grid-row: 1 / span 2; align-self: center; color: var(--coupang-red); font-size: 11px; }
.shopping-map-reference span { font-size: 8px; font-weight: 900; letter-spacing: .08em; }
.shopping-map-reference strong { overflow-wrap: anywhere; color: var(--coupang-ink); font: 700 12px/1.2 Georgia, 'Times New Roman', serif; }
.coupang-hero-stage { position: relative; min-height: 197px; overflow: hidden; border: 1px solid var(--coupang-line); border-radius: 9px; background: #fff; }
.coupang-hero-stage img { width: 100%; height: 100%; object-fit: cover; }
.coupang-stage-burst { position: absolute; top: 17px; right: 13px; width: 82px; height: 105px; display: flex; align-items: center; justify-content: center; color: #fff; background: var(--coupang-red); font-size: 30px; transform: rotate(4deg); }
.coupang-stage-label { position: absolute; right: 8px; bottom: 9px; left: 8px; color: var(--coupang-muted); font-size: 8px; font-weight: 900; letter-spacing: .1em; }
.coupang-category-heading { padding: 15px 16px 8px; }
.coupang-category-heading strong { display: block; margin-top: 5px; font: 700 20px/1.1 Georgia, 'Times New Roman', serif; }
.coupang-category-heading > span,
.coupang-products-heading > span { color: var(--coupang-muted); font-size: 10px; font-weight: 800; }
.coupang-category-grid { padding: 0 16px 14px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 7px; overflow-x: auto; }
.coupang-category-card { min-width: 62px; padding: 10px 5px 8px; display: flex; flex-direction: column; align-items: center; gap: 5px; border: 1px solid var(--coupang-line); border-radius: 9px; color: var(--coupang-muted); background: #fff; font-size: 9px; font-weight: 800; }
.coupang-category-card i { font-size: 15px; }
.coupang-category-card small { font-size: 8px; opacity: .65; }
.coupang-category-card.is-active { border-color: var(--coupang-red); color: var(--coupang-red); box-shadow: 0 0 0 2px rgba(229, 42, 47, .11); }
.coupang-store-nav { margin: 0 16px 4px; padding: 6px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; border: 1px solid var(--coupang-line); border-radius: 12px; background: #fff; }
.coupang-store-nav button { position: relative; min-height: 45px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--coupang-muted); font-size: 9px; font-weight: 800; }
.coupang-store-nav button.is-active { border-radius: 8px; color: var(--coupang-red); background: #fff0f0; }
.coupang-store-nav b { top: 3px; right: 19%; }
.coupang-products { padding: 12px 16px 24px; }
.coupang-products-heading { min-height: 47px; margin-bottom: 12px; }
.coupang-products-heading h2 { margin: 5px 0 0; color: var(--coupang-ink); font: 700 22px/1.05 Georgia, 'Times New Roman', serif; }
.coupang-clear-filter { width: 34px; height: 34px; border: 1px solid var(--coupang-line); border-radius: 50%; color: var(--coupang-ink); background: #fff; }
.coupang-product-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.coupang-product-card { overflow: hidden; border: 1px solid var(--coupang-line); border-radius: 9px; color: var(--coupang-ink); background: #fff; }
.coupang-product-card.is-highlighted { border-color: var(--coupang-red); box-shadow: 0 0 0 2px rgba(229, 42, 47, .12); }
.coupang-product-visual { position: relative; aspect-ratio: 1 / 1; overflow: hidden; background: #f0e5d8; }
.coupang-product-visual img { width: 100%; height: 100%; display: block; object-fit: cover; }
.coupang-product-symbol { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; background: var(--coupang-red); font-size: 27px; }
.coupang-product-symbol span { position: absolute; right: 8px; bottom: 6px; font-size: 9px; font-weight: 900; }
.coupang-favorite { position: absolute; top: 8px; right: 8px; width: 31px; height: 31px; border: 1px solid rgba(17, 24, 39, .12); border-radius: 50%; color: #afb4b8; background: rgba(255,255,255,.92); }
.coupang-favorite.is-favorite { color: var(--coupang-red); }
.coupang-product-body { min-height: 169px; padding: 11px; display: flex; flex-direction: column; }
.coupang-product-brand { margin: 0; color: var(--coupang-red); font-size: 8px; font-weight: 900; letter-spacing: .07em; text-transform: uppercase; }
.coupang-product-body h3 { min-height: 34px; margin: 5px 0 0; display: -webkit-box; overflow: hidden; color: var(--coupang-ink); font: 700 14px/1.22 Georgia, 'Times New Roman', serif; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.coupang-product-body > p:not(.coupang-product-brand) { min-height: 31px; margin: 7px 0 0; display: -webkit-box; overflow: hidden; color: var(--coupang-muted); font-size: 10px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.coupang-product-tags { min-height: 19px; margin-top: 7px; display: flex; flex-wrap: wrap; gap: 4px; }
.coupang-product-tags span { padding: 3px 5px; border-radius: 3px; background: #f2f3f4; font-size: 8px; font-weight: 800; }
.coupang-product-footer { margin-top: auto; padding-top: 8px; }
.coupang-product-footer strong { overflow-wrap: anywhere; font-size: 12px; }
.coupang-add { width: 33px; height: 33px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: var(--coupang-ink); }
.coupang-add:disabled { opacity: .35; }
.coupang-empty { min-height: 160px; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; border: 1px dashed var(--coupang-line); border-radius: 9px; color: var(--coupang-muted); text-align: center; background: #fff; }
.coupang-empty p { margin: 0; font-size: 11px; }
.coupang-icon-button:focus-visible,
.coupang-manage:focus-visible,
.coupang-category-card:focus-visible,
.coupang-store-nav button:focus-visible,
.coupang-favorite:focus-visible,
.coupang-add:focus-visible { outline: 3px solid #00a4e4; outline-offset: 2px; }
@media (min-width: 680px) { .coupang-product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 350px) { .coupang-product-grid { grid-template-columns: 1fr; } }

.shopping-coupang-app {
  --coupang-red: #e4292f;
  --coupang-red-deep: #c9161d;
  --coupang-blue: #0064d8;
  --coupang-green: #168a56;
  --coupang-yellow: #ffb800;
  --coupang-ink: #15191d;
  --coupang-muted: #67717b;
  --coupang-line: #e1e6ea;
  background: #f4f6f8;
  font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
}

.coupang-topbar {
  min-height: 54px;
  padding: 12px 16px 9px;
  background: #fff;
}

.coupang-icon-button,
.coupang-manage {
  min-width: 44px;
  min-height: 44px;
  flex-basis: 44px;
  border-color: var(--coupang-line);
  border-radius: 12px;
  transition: border-color 180ms ease, color 180ms ease, background 180ms ease, transform 180ms ease;
}

.coupang-icon-button:hover,
.coupang-manage:hover {
  border-color: rgba(228, 41, 47, .38);
  color: var(--coupang-red);
  background: #fff5f5;
}

.coupang-icon-button:active,
.coupang-manage:active,
.coupang-category-card:active,
.coupang-store-nav button:active,
.coupang-add:active,
.coupang-search-chip:active {
  transform: scale(.97);
}

.coupang-identity {
  gap: 10px;
}

.coupang-mark {
  width: 42px;
  height: 42px;
  flex-basis: 42px;
  border-radius: 12px;
}

.coupang-identity h1 {
  font: 800 18px/1.05 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  letter-spacing: -.04em;
}

.coupang-identity p,
.coupang-category-heading p,
.coupang-products-heading p {
  color: var(--coupang-muted);
  font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
}

.coupang-search-row {
  padding: 0 16px 7px;
  gap: 8px;
  background: #fff;
}

.coupang-search {
  min-height: 48px;
  height: 48px;
  padding: 0 13px;
  border: 2px solid var(--coupang-red);
  border-radius: 13px;
  box-shadow: 0 4px 14px rgba(228, 41, 47, .08);
}

.coupang-search:focus-within {
  box-shadow: 0 0 0 3px rgba(228, 41, 47, .14);
}

.coupang-search input {
  font: 500 13px/1.2 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
}

.coupang-manage {
  border: 1px solid var(--coupang-line);
  border-radius: 12px;
  background: #fff;
}

.coupang-hero {
  min-height: 214px;
  padding: 18px 16px 16px;
  grid-template-columns: minmax(0, 1.08fr) minmax(135px, .92fr);
  gap: 14px;
  background: linear-gradient(118deg, #fff 0%, #fff 59%, #fff4f4 59%, #fff4f4 100%);
}

.coupang-hero h2,
.coupang-products-heading h2,
.coupang-category-heading strong {
  font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  letter-spacing: -.05em;
}

.coupang-hero h2 {
  max-width: 10ch;
  margin-top: 12px;
  font-size: 30px;
  line-height: 1.08;
}

.coupang-hero-stage {
  min-height: 181px;
  border-radius: 14px;
  background: linear-gradient(145deg, var(--coupang-red-deep), var(--coupang-red));
  box-shadow: 0 10px 18px rgba(201, 22, 29, .16);
}

.coupang-stage-burst {
  top: 30%;
  left: 17%;
  right: auto;
  width: auto;
  height: auto;
  color: #fff;
  background: transparent;
  font-size: 48px;
  transform: rotate(-8deg);
}

.coupang-stage-label {
  right: 13px;
  bottom: 15px;
  left: auto;
  color: rgba(255, 255, 255, .9);
  font-size: 17px;
  line-height: .94;
  letter-spacing: -.06em;
  text-align: right;
}

.coupang-map-reference {
  margin-top: 13px;
  padding-top: 8px;
  border-color: var(--coupang-line);
}

.coupang-popular-row {
  min-width: 0;
  padding: 0 16px 11px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  background: #fff;
  scrollbar-width: none;
}

.coupang-popular-row::-webkit-scrollbar {
  display: none;
}

.coupang-popular-label {
  flex: 0 0 auto;
  color: var(--coupang-red);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .08em;
}

.coupang-search-chip {
  min-height: 28px;
  padding: 0 9px;
  flex: 0 0 auto;
  border: 1px solid var(--coupang-line);
  border-radius: 7px;
  color: var(--coupang-muted);
  background: #fff;
  font-size: 9px;
  font-weight: 700;
  transition: border-color 180ms ease, color 180ms ease, background 180ms ease, transform 180ms ease;
}

.coupang-search-chip:hover {
  border-color: rgba(228, 41, 47, .42);
  color: var(--coupang-red);
  background: #fff5f5;
}

.coupang-lane-strip {
  padding: 12px 16px 7px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  background: #f4f6f8;
}

.coupang-lane {
  min-width: 0;
  min-height: 76px;
  padding: 10px 8px;
  display: flex;
  align-items: flex-start;
  gap: 7px;
  border: 1px solid var(--coupang-line);
  border-radius: 10px;
  background: #fff;
}

.coupang-lane-icon {
  width: 25px;
  height: 25px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 25px;
  border-radius: 7px;
  font-size: 11px;
}

.coupang-lane.is-red .coupang-lane-icon { color: var(--coupang-red); background: #fff0f0; }
.coupang-lane.is-blue .coupang-lane-icon { color: var(--coupang-blue); background: #edf5ff; }
.coupang-lane.is-green .coupang-lane-icon { color: var(--coupang-green); background: #eef9f3; }
.coupang-lane strong { display: block; overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.coupang-lane p { margin: 4px 0 0; color: var(--coupang-muted); font-size: 8px; line-height: 1.35; }

.coupang-category-heading {
  padding: 15px 16px 9px;
  background: #f4f6f8;
}

.coupang-category-heading strong {
  margin-top: 5px;
  font-size: 20px;
  line-height: 1.05;
}

.coupang-category-grid {
  padding: 0 16px 14px;
  display: flex;
  gap: 7px;
  background: #f4f6f8;
  scrollbar-width: none;
}

.coupang-category-grid::-webkit-scrollbar { display: none; }

.coupang-category-card {
  min-width: 67px;
  min-height: 68px;
  padding: 9px 6px 7px;
  flex: 0 0 67px;
  border-color: var(--coupang-line);
  border-radius: 10px;
  transition: border-color 180ms ease, color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.coupang-category-card.is-active {
  border-color: var(--coupang-red);
  color: var(--coupang-red);
  box-shadow: 0 0 0 2px rgba(228, 41, 47, .11);
}

.coupang-store-nav {
  margin: 0 16px 4px;
  padding: 5px;
  gap: 4px;
  border-color: var(--coupang-line);
  border-radius: 12px;
  background: #fff;
}

.coupang-store-nav button {
  min-height: 48px;
  border-radius: 8px;
  transition: color 180ms ease, background 180ms ease, transform 180ms ease;
}

.coupang-store-nav button.is-active { color: var(--coupang-red); background: #fff0f0; }
.coupang-store-nav b { top: 3px; right: 17%; }

.coupang-products {
  padding: 13px 16px 26px;
  background: #f4f6f8;
}

.coupang-products-heading { min-height: 49px; margin-bottom: 12px; }

.coupang-products-heading h2 {
  margin: 5px 0 0;
  font: 800 22px/1.05 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  letter-spacing: -.05em;
}

.coupang-product-grid { gap: 12px; }

.coupang-product-card {
  border-color: var(--coupang-line);
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(21, 25, 29, .035);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.coupang-product-card:hover {
  border-color: rgba(228, 41, 47, .34);
  box-shadow: 0 8px 18px rgba(21, 25, 29, .08);
  transform: translateY(-2px);
}

.coupang-product-visual { aspect-ratio: 1 / .96; background: #f7f8f9; }

.coupang-product-visual img { transition: transform 240ms ease; }
.coupang-product-card:hover .coupang-product-visual img { transform: scale(1.035); }

.coupang-product-symbol { background: linear-gradient(145deg, var(--coupang-red), var(--coupang-red-deep)); }

.coupang-product-lane {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: 4px 6px;
  border-radius: 5px;
  color: #fff;
  background: var(--coupang-red);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .04em;
}

.coupang-favorite {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: color 180ms ease, background 180ms ease, transform 180ms ease;
}

.coupang-favorite:hover,
.coupang-favorite.is-favorite { color: var(--coupang-red); background: #fff5f5; }

.coupang-product-body { min-height: 175px; padding: 11px; }

.coupang-product-brand { color: var(--coupang-red); }

.coupang-product-body h3 {
  min-height: 35px;
  font: 700 13px/1.32 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
}

.coupang-product-description { min-height: 31px; margin-top: 6px; }

.coupang-product-tags span { padding: 4px 6px; border-radius: 4px; }

.coupang-product-footer { padding-top: 10px; }

.coupang-product-footer strong { font-size: 13px; font-weight: 900; }

.coupang-add {
  width: 44px;
  height: 44px;
  flex-basis: 44px;
  border-radius: 10px;
  background: var(--coupang-red);
  transition: background 180ms ease, transform 180ms ease, opacity 180ms ease;
}

.coupang-add:hover { background: var(--coupang-red-deep); }

.coupang-empty { border-radius: 12px; background: #fff; }

.coupang-icon-button:focus-visible,
.coupang-manage:focus-visible,
.coupang-category-card:focus-visible,
.coupang-store-nav button:focus-visible,
.coupang-search-chip:focus-visible,
.coupang-favorite:focus-visible,
.coupang-add:focus-visible {
  outline: 3px solid var(--coupang-blue);
  outline-offset: 2px;
}

@media (max-width: 390px) {
  .coupang-hero { grid-template-columns: minmax(0, 1fr) 118px; gap: 10px; }
  .coupang-hero h2 { font-size: 26px; }
  .coupang-lane-strip { gap: 5px; }
  .coupang-lane { min-height: 70px; padding: 8px 6px; gap: 5px; }
  .coupang-lane-icon { width: 22px; height: 22px; flex-basis: 22px; font-size: 10px; }
  .coupang-lane strong { font-size: 9px; }
  .coupang-lane p { font-size: 7px; }
}

@media (max-width: 350px) {
  .coupang-hero { grid-template-columns: 1fr; }
  .coupang-hero-stage { min-height: 132px; }
  .coupang-product-grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .coupang-icon-button,
  .coupang-manage,
  .coupang-search-chip,
  .coupang-category-card,
  .coupang-store-nav button,
  .coupang-add,
  .coupang-product-card,
  .coupang-product-visual img,
  .coupang-favorite { transition: none; }
}

.coupang-product-open {
  width: 100%;
  display: block;
  padding: 0;
  color: inherit;
  text-align: left;
  background: transparent;
}

.coupang-product-open:focus-visible {
  outline: 3px solid var(--coupang-blue);
  outline-offset: 3px;
  border-radius: 6px;
}

.coupang-rocket-status {
  min-width: 78px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: var(--coupang-blue);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .04em;
}

.coupang-rocket-status i { color: var(--coupang-red); font-size: 14px; }

.coupang-address-bar {
  width: auto;
  margin: 0;
  padding: 8px 16px 11px;
  display: grid;
  grid-template-columns: 16px auto minmax(0, 1fr) 12px;
  align-items: center;
  gap: 7px;
  border: 0;
  color: var(--coupang-muted);
  background: #fff;
}

.coupang-address-bar > i:first-child { color: var(--coupang-red); }
.coupang-address-bar > i:last-child { color: var(--coupang-muted); font-size: 9px; }
.coupang-address-bar i { grid-row: auto; align-self: center; }
.coupang-address-bar span { font-size: 9px; font-weight: 800; letter-spacing: 0; }
.coupang-address-bar strong {
  overflow: hidden;
  color: var(--coupang-ink);
  font: 800 11px/1.2 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupang-lane-strip {
  order: 0;
  padding: 2px 16px 13px;
  background: #fff;
}

.coupang-lane {
  min-height: 64px;
  border: 1px solid #e5e9ed;
  border-radius: 10px;
  background: #fff;
}

.coupang-hero {
  min-height: 160px;
  margin: 0 16px 10px;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(118px, .7fr);
  gap: 0;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: #182333;
}

.coupang-hero-stage {
  min-height: 160px;
  border: 0;
  border-radius: 0;
  background: #eef2f5;
}

.coupang-hero-copy {
  padding: 18px 14px;
  justify-content: center;
  color: #fff;
}

.coupang-hero h2 { max-width: none; font: 900 19px/1.12 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; }
.coupang-hero-copy > p:not(.coupang-eyebrow) { margin-top: 9px; color: rgba(255,255,255,.72); font-size: 9px; line-height: 1.45; }
.coupang-eyebrow { margin-bottom: 7px; color: #8fc9ff; font-size: 8px; }

.coupang-category-heading { padding-top: 13px; }
.coupang-category-heading strong { font: 900 18px/1.1 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; }
.coupang-category-grid { padding-bottom: 18px; }

.coupang-store-nav {
  position: sticky;
  z-index: 8;
  bottom: 0;
  margin: 0;
  padding: 7px 10px calc(7px + env(safe-area-inset-bottom));
  border: 0;
  border-top: 1px solid #dfe3e7;
  border-radius: 0;
  box-shadow: 0 -8px 24px rgba(18, 28, 40, .08);
}

.coupang-store-nav button { min-height: 48px; }
.coupang-store-nav button.is-active { background: transparent; }
.coupang-store-nav b { top: 2px; right: 24%; }

.coupang-products { padding-bottom: 18px; }

@media (max-width: 390px) {
  .coupang-hero { grid-template-columns: minmax(0, 1fr) 118px; }
  .coupang-lane p { display: none; }
}
</style>
