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
const roomTone = ref('sunlit')
const roomToneOptions = Object.freeze([
  { key: 'blueprint', zh: '蓝图', en: 'BLUEPRINT' },
  { key: 'sunlit', zh: '日光', en: 'SUNLIT' },
  { key: 'night', zh: '夜晚', en: 'NIGHT' },
])
const roomToneLabel = (tone) => {
  const option = roomToneOptions.find((item) => item.key === tone) || roomToneOptions[1]
  return localize(option.zh, option.en)
}
const iconForCategory = (category) => category.icon || 'fas fa-cube'
const ikeaTitle = () =>
  props.languageBase === 'zh'
    ? props.activeService?.heroZh || props.activeService?.zh || '把房间过成日常'
    : props.activeService?.heroEn || props.activeService?.en || 'Make room for life'
</script>

<template>
  <header
    class="shopping-storefront-header shopping-ikea-app"
    :data-storefront="activeService?.storefrontTemplate || 'room_planner'"
    :data-room-tone="roomTone"
    data-storefront-kind="specialty"
  >
    <div class="ikea-topbar">
      <button
        type="button"
        class="ikea-back"
        data-testid="shopping-go-home"
        :aria-label="localize('返回主屏幕', 'Back to Home')"
        :title="localize('返回主屏幕', 'Back to Home')"
        @click="emit('go-home')"
      >
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>
      <div class="ikea-brand">
        <span class="ikea-mark"><img v-if="brandAssetUrl" :src="brandAssetUrl" alt="" /><template v-else>IKEA</template></span>
        <div>
          <h1>{{ activeLabel || activeService?.en || activeService?.zh || 'IKEA Korea' }}</h1>
          <p>{{ localize('家的规划工具', 'ROOM PLANNING STUDIO') }}</p>
        </div>
      </div>
      <div class="ikea-actions">
        <button
          type="button"
          class="ikea-action"
          :aria-label="localize('收藏', 'Favorites')"
          :title="localize('收藏', 'Favorites')"
          @click="emit('open-favorites')"
        >
          <i class="fas fa-heart" aria-hidden="true"></i><b v-if="favoriteCount">{{ favoriteCount }}</b>
        </button>
        <button
          type="button"
          class="ikea-action"
          :aria-label="localize('购物车', 'Cart')"
          :title="localize('购物车', 'Cart')"
          @click="emit('open-cart')"
        >
          <i class="fas fa-bag-shopping" aria-hidden="true"></i><b v-if="cartQuantity">{{ cartQuantity }}</b>
        </button>
      </div>
    </div>

    <div class="ikea-search-line">
      <label class="ikea-search">
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
        <input
          type="search"
          role="searchbox"
          :aria-label="localize('搜索商品', 'Search products')"
          :placeholder="localize('搜索房间、收纳与家具', 'Search rooms, storage, and furniture')"
          :value="searchQuery"
          @input="searchChanged"
        />
      </label>
      <button
        type="button"
        class="ikea-manage"
        :aria-label="localize('管理商品', 'Manage catalog')"
        :title="localize('管理商品', 'Manage catalog')"
        @click="emit('open-manager')"
      >
        <i class="fas fa-sliders" aria-hidden="true"></i>
      </button>
    </div>

    <div class="ikea-plan-banner">
      <span class="ikea-blue-dot"></span>
      <div>
        <strong>{{ localize('从一个房间开始', 'START WITH A ROOM') }}</strong>
        <p>{{ localize('先选空间，再慢慢放进生活。', 'Choose a space, then build it around life.') }}</p>
      </div>
      <i class="fas fa-arrow-right" aria-hidden="true"></i>
    </div>

    <nav class="ikea-store-nav" :aria-label="localize('店内导航', 'Store navigation')">
      <button type="button" :class="{ 'is-active': !favoritesOnly }" @click="emit('show-all')"><i class="fas fa-vector-square" aria-hidden="true"></i><span>{{ localize('房间灵感', 'Rooms') }}</span></button>
      <button type="button" :class="{ 'is-active': favoritesOnly }" @click="emit('open-favorites')"><i class="fas fa-ruler-combined" aria-hidden="true"></i><span>{{ localize('我的方案', 'Projects') }}</span><b v-if="favoriteCount">{{ favoriteCount }}</b></button>
      <button type="button" @click="emit('open-cart')"><i class="fas fa-list-check" aria-hidden="true"></i><span>{{ localize('购物清单', 'List') }}</span><b v-if="cartQuantity">{{ cartQuantity }}</b></button>
      <button type="button" @click="emit('open-orders')"><i class="fas fa-truck-ramp-box" aria-hidden="true"></i><span>{{ localize('配送组装', 'Orders & delivery') }}</span><b v-if="orderCount">{{ orderCount }}</b></button>
    </nav>

    <div class="ikea-hero">
      <div class="ikea-hero-copy">
        <p class="ikea-eyebrow">{{ localize('新家提案', 'THE NEW HOME EDIT') }}</p>
        <h2>{{ ikeaTitle() }}</h2>
        <p>{{ activeDescription || activeService?.descZh || activeService?.descEn || '' }}</p>
        <p
          v-if="mapReference?.placeId"
          class="shopping-map-reference ikea-map-reference"
          data-testid="shopping-map-reference"
          :data-map-place-id="mapReference.placeId"
        >
          <i class="fas fa-location-dot" aria-hidden="true"></i>
          <span>{{ localize('首尔场景锚点', 'SEOUL SETTING') }}</span>
          <strong>{{ mapReference.district }}</strong>
        </p>
      </div>
      <div class="ikea-room-stage" :class="`is-${roomTone}`" aria-hidden="true">
        <img v-if="coverImageUrl" :src="coverImageUrl" :alt="`${activeService?.en || 'IKEA Korea'} cover`" />
        <template v-else>
          <div class="ikea-room-sun"></div>
          <div class="ikea-room-chair"><i :class="activeService?.icon || 'fas fa-couch'"></i></div>
          <span>{{ localize('房间 01 / ', 'ROOM 01 / ') }}{{ roomToneLabel(roomTone) }}</span>
        </template>
      </div>
    </div>

    <div class="ikea-room-controls" role="tablist" :aria-label="localize('房间氛围', 'Room atmosphere')">
      <span>{{ localize('切换空间氛围', 'SHIFT THE ROOM') }}</span>
      <button
        v-for="tone in roomToneOptions"
        :key="tone.key"
        type="button"
        class="ikea-tone-button"
        :class="{ 'is-active': roomTone === tone.key }"
        role="tab"
        :aria-selected="roomTone === tone.key"
        :data-testid="`shopping-ikea-tone-${tone.key}`"
        @click="roomTone = tone.key"
      >
        {{ localize(tone.zh, tone.en) }}
      </button>
    </div>

    <div class="ikea-category-grid">
      <button
        v-for="category in categoryCards"
        :key="category.key"
        type="button"
        class="ikea-category"
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

  <section v-if="!activeCategoryIsLogistics" id="shopping-products" class="shopping-products-section ikea-products">
    <div v-if="!favoritesOnly && !searchQuery" class="ikea-measure-board">
      <div>
        <span>{{ localize('空间速记', 'ROOM NOTE') }}</span>
        <strong>3.2 × 4.6 m</strong>
        <small>{{ localize('客厅 · 自然光 · 2 个插座', 'LIVING · DAYLIGHT · 2 OUTLETS') }}</small>
      </div>
      <button type="button" @click="emit('open-favorites')"><i class="fas fa-plus" aria-hidden="true"></i>{{ localize('保存方案', 'Save project') }}</button>
    </div>
    <div class="ikea-products-heading">
      <div>
        <p>{{ favoritesOnly ? localize('已保存的空间', 'SAVED SPACES') : localize('让空间更好用', 'MAKE ROOM FOR LIFE') }}</p>
        <h2>{{ activeCategory?.label || localize('所有房间', 'All rooms') }}</h2>
      </div>
      <button
        v-if="favoritesOnly"
        type="button"
        class="ikea-clear"
        :aria-label="localize('显示全部商品', 'Show all products')"
        :title="localize('显示全部商品', 'Show all products')"
        @click="emit('show-all')"
      ><i class="fas fa-xmark" aria-hidden="true"></i></button>
      <span v-else>{{ visibleProducts.length }} {{ localize('件家具', 'pieces') }}</span>
    </div>
    <div v-if="visibleProducts.length === 0" class="ikea-empty">
      <i class="fas fa-ruler-combined" aria-hidden="true"></i>
      <p>{{ favoritesOnly ? localize('这里还没有收藏商品。', 'No saved items here yet.') : searchQuery ? localize('没有找到匹配商品。', 'No matching products found.') : localize('这个分类还没有商品。', 'No products in this category yet.') }}</p>
    </div>
    <div v-else class="ikea-product-grid">
      <article
        v-for="product in visibleProducts"
        :key="product.id"
        class="shopping-product-card ikea-product-card"
        :class="{ 'is-highlighted': product.id === highlightedProductId }"
        :data-product-template="productStorefrontTemplate(product)"
        :data-testid="`shopping-product-${product.id}`"
        role="button"
        tabindex="0"
        @click="emit('open-product', product.id)"
        @keydown.enter.prevent="emit('open-product', product.id)"
      >
        <div class="ikea-product-visual">
          <img v-if="productImageUrl(product)" :src="productImageUrl(product)" :alt="product.image?.alt || productDisplayTitle(product)" />
          <div v-else class="ikea-product-symbol" aria-hidden="true"><i :class="productCategoryIcon(product)"></i><span>{{ activeService?.mark || 'I' }}</span></div>
          <button
            type="button"
            class="ikea-favorite"
            :class="{ 'is-favorite': isProductFavorite(product.id) }"
            :aria-label="localize('收藏或取消收藏', 'Toggle favorite')"
            :title="localize('收藏或取消收藏', 'Toggle favorite')"
            @click.stop="emit('toggle-favorite', product.id)"
          ><i class="fas fa-heart" aria-hidden="true"></i></button>
        </div>
        <div class="ikea-product-body">
          <p class="ikea-product-brand">{{ productServiceLabel(product) }}</p>
          <h3>{{ productDisplayTitle(product) }}</h3>
          <p>{{ productDisplayDescription(product) }}</p>
          <div class="ikea-product-tags">
            <span :class="stockStatusClass(product.stockStatus)">{{ stockStatusLabel(product.stockStatus) }}</span>
            <span v-if="product.assetEligible">{{ localize('可转资产', 'Asset-ready') }}</span>
            <span v-else-if="product.giftable">{{ localize('可赠礼', 'Giftable') }}</span>
          </div>
          <div class="ikea-product-footer">
            <strong>{{ formatPrice(product) }}</strong>
            <button
              type="button"
              class="ikea-add"
              :disabled="product.stockStatus === 'sold_out'"
              :data-testid="`shopping-add-cart-${product.id}`"
              :aria-label="`${localize('加入购物车', 'Add to cart')}: ${productDisplayTitle(product)}`"
              @click.stop="emit('add-to-cart', product.id)"
            ><i class="fas fa-plus" aria-hidden="true"></i></button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.shopping-ikea-app { --ikea-blue:#0058a3; --ikea-yellow:#ffda1a; --ikea-ink:#111; --ikea-muted:#5d5d5d; --ikea-line:rgba(0,88,163,.2); display:block; color:var(--ikea-ink); background:#f5f5f5; }
.ikea-topbar,.ikea-search-line,.ikea-products-heading,.ikea-product-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.ikea-topbar { padding:14px 16px 10px; }
.ikea-back,.ikea-action,.ikea-manage { position:relative; width:35px; height:35px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--ikea-line); border-radius:50%; color:var(--ikea-blue); background:#fff; }
.ikea-actions { display:flex; gap:6px; }
.ikea-action b { position:absolute; top:-4px; right:-4px; min-width:15px; height:15px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; background:var(--ikea-blue); font-size:8px; }
.ikea-brand { min-width:0; flex:1; display:flex; align-items:center; gap:9px; }
.ikea-mark { width:39px; height:39px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; border-radius:50%; color:#fff; background:var(--ikea-blue); font-size:8px; font-weight:900; }
.ikea-mark img { width:100%; height:100%; object-fit:cover; }
.ikea-brand h1 { margin:0; overflow:hidden; font:800 16px/1.05 Arial, sans-serif; text-overflow:ellipsis; white-space:nowrap; }
.ikea-brand p,.ikea-products-heading p { margin:4px 0 0; color:var(--ikea-muted); font-size:8px; font-weight:900; letter-spacing:.09em; }
.ikea-search-line { padding:0 16px 12px; }
.ikea-search { min-width:0; flex:1; height:40px; display:flex; align-items:center; gap:9px; padding:0 12px; border:1px solid var(--ikea-line); border-radius:4px; color:var(--ikea-blue); background:#fff; }
.ikea-search input { min-width:0; flex:1; border:0; outline:0; color:var(--ikea-ink); background:transparent; font-size:11px; }
.ikea-plan-banner { margin:0 16px 14px; padding:10px 11px; display:flex; align-items:center; gap:9px; color:var(--ikea-blue); background:var(--ikea-yellow); }
.ikea-plan-banner > div { min-width:0; flex:1; }
.ikea-plan-banner strong { font-size:10px; }
.ikea-plan-banner p { margin:3px 0 0; font-size:9px; }
.ikea-blue-dot { width:18px; height:18px; flex:0 0 18px; border-radius:50%; background:var(--ikea-blue); }
.ikea-hero { min-height:240px; padding:23px 16px 18px; display:grid; grid-template-columns:minmax(0,1fr) minmax(122px,.85fr); gap:15px; border-top:1px solid var(--ikea-line); border-bottom:1px solid var(--ikea-line); background:#fff; }
.ikea-hero-copy { display:flex; flex-direction:column; justify-content:flex-end; }
.ikea-eyebrow { margin:0 0 10px; color:var(--ikea-blue); font-size:9px; font-weight:900; letter-spacing:.1em; }
.ikea-hero h2 { max-width:8ch; margin:0; font:800 32px/1.02 Arial, sans-serif; letter-spacing:-.05em; }
.ikea-hero-copy > p:not(.ikea-eyebrow):not(.shopping-map-reference) { max-width:25ch; margin:14px 0 0; color:var(--ikea-muted); font-size:11px; line-height:1.55; }
.ikea-map-reference { margin-top:14px; padding-top:9px; display:grid; grid-template-columns:12px auto; gap:2px 7px; border-top:1px solid var(--ikea-line); color:var(--ikea-muted); }
.ikea-map-reference i { grid-row:1 / span 2; align-self:center; color:var(--ikea-blue); }
.ikea-map-reference span { font-size:8px; font-weight:900; letter-spacing:.08em; }
.ikea-map-reference strong { color:var(--ikea-ink); font:700 12px/1.2 Arial, sans-serif; }
.ikea-room-stage { position:relative; min-height:198px; overflow:hidden; border:1px solid var(--ikea-line); background:#e4e7e9; }
.ikea-room-stage img { width:100%; height:100%; object-fit:cover; }
.ikea-room-sun { position:absolute; top:19px; right:16px; width:72px; height:72px; border-radius:50%; background:var(--ikea-yellow); }
.ikea-room-chair { position:absolute; right:25px; bottom:41px; width:94px; height:88px; display:flex; align-items:center; justify-content:center; color:var(--ikea-blue); background:#d6b894; transform:rotate(-4deg); }
.ikea-room-chair i { font-size:39px; }
.ikea-room-stage > span { position:absolute; right:0; bottom:0; left:0; padding:8px; color:#fff; background:var(--ikea-blue); font-size:8px; font-weight:900; letter-spacing:.08em; }
.ikea-room-stage.is-blueprint { background:#d7e4ee; }
.ikea-room-stage.is-blueprint .ikea-room-sun { width:54px; height:54px; border:2px dashed var(--ikea-blue); background:transparent; }
.ikea-room-stage.is-blueprint .ikea-room-chair { border:2px dashed var(--ikea-blue); color:var(--ikea-blue); background:transparent; }
.ikea-room-stage.is-night { background:#1e3d5d; }
.ikea-room-stage.is-night .ikea-room-sun { width:54px; height:54px; background:#f6f2c6; box-shadow:0 0 0 10px rgba(255,218,26,.12); }
.ikea-room-stage.is-night .ikea-room-chair { color:#fff; background:#334e68; }
.ikea-room-controls { padding:9px 16px 12px; display:flex; align-items:center; gap:5px; background:#fff; }
.ikea-room-controls > span { margin-right:auto; color:var(--ikea-muted); font-size:8px; font-weight:900; letter-spacing:.08em; }
.ikea-tone-button { min-height:28px; padding:0 7px; border:1px solid var(--ikea-line); color:var(--ikea-blue); background:#fff; font-size:8px; font-weight:900; }
.ikea-tone-button.is-active { color:#fff; background:var(--ikea-blue); box-shadow:inset 0 -3px 0 var(--ikea-yellow); }
.ikea-category-grid { padding:13px 16px 11px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:7px; }
.ikea-category { min-height:60px; padding:8px 5px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border:1px solid var(--ikea-line); color:var(--ikea-muted); background:#fff; font-size:8px; font-weight:800; }
.ikea-category i { color:var(--ikea-blue); font-size:15px; }
.ikea-category small { color:var(--ikea-muted); font-size:8px; opacity:.7; }
.ikea-category.is-active { border-color:var(--ikea-blue); color:var(--ikea-blue); box-shadow:inset 0 -3px 0 var(--ikea-yellow); }
.ikea-store-nav { margin:0 16px 4px; padding:5px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:4px; border-radius:3px; background:#fff; }
.ikea-store-nav button { position:relative; min-height:44px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; color:var(--ikea-muted); font-size:9px; font-weight:800; }
.ikea-store-nav button.is-active { color:var(--ikea-blue); }
.ikea-store-nav button.is-active::after { content:''; position:absolute; right:22%; bottom:1px; left:22%; height:3px; background:var(--ikea-yellow); }
.ikea-store-nav b { position:absolute; top:2px; right:17%; min-width:15px; height:15px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; background:var(--ikea-blue); font-size:8px; }
.ikea-products { padding:13px 16px 27px; }
.ikea-products-heading { min-height:45px; margin-bottom:11px; }
.ikea-products-heading h2 { margin:5px 0 0; font:800 23px/1.05 Arial, sans-serif; }
.ikea-products-heading > span { color:var(--ikea-blue); font-size:9px; font-weight:900; }
.ikea-clear { width:34px; height:34px; border:1px solid var(--ikea-line); color:var(--ikea-blue); background:#fff; }
.ikea-product-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:11px; }
.ikea-product-card { overflow:hidden; border:1px solid var(--ikea-line); color:var(--ikea-ink); background:#fff; }
.ikea-product-card.is-highlighted { border-color:var(--ikea-blue); box-shadow:0 0 0 2px rgba(0,88,163,.14); }
.ikea-product-visual { position:relative; aspect-ratio:1 / 1; overflow:hidden; background:#e8e8e8; }
.ikea-product-visual img { width:100%; height:100%; display:block; object-fit:cover; }
.ikea-product-symbol { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#fff; background:var(--ikea-blue); font-size:29px; }
.ikea-product-symbol span { position:absolute; right:8px; bottom:7px; color:var(--ikea-yellow); font-size:9px; font-weight:900; }
.ikea-favorite { position:absolute; top:8px; right:8px; width:31px; height:31px; border:1px solid rgba(0,88,163,.14); border-radius:50%; color:#a4adb6; background:rgba(255,255,255,.92); }
.ikea-favorite.is-favorite { color:var(--ikea-blue); }
.ikea-product-body { min-height:169px; padding:11px; display:flex; flex-direction:column; }
.ikea-product-brand { margin:0; color:var(--ikea-blue); font-size:8px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
.ikea-product-body h3 { min-height:35px; margin:5px 0 0; display:-webkit-box; overflow:hidden; font:700 14px/1.2 Arial, sans-serif; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.ikea-product-body > p:not(.ikea-product-brand) { min-height:31px; margin:7px 0 0; display:-webkit-box; overflow:hidden; color:var(--ikea-muted); font-size:10px; line-height:1.5; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.ikea-product-tags { min-height:19px; margin-top:7px; display:flex; flex-wrap:wrap; gap:4px; }
.ikea-product-tags span { padding:3px 5px; background:#f2f4f5; font-size:8px; font-weight:800; }
.ikea-product-footer { margin-top:auto; padding-top:8px; }
.ikea-product-footer strong { font-size:12px; }
.ikea-add { width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; color:#fff; background:var(--ikea-blue); }
.ikea-add:disabled { opacity:.35; }
.ikea-empty { min-height:160px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; border:1px dashed var(--ikea-line); color:var(--ikea-muted); background:#fff; }
.ikea-empty p { margin:0; font-size:11px; }
.ikea-back:focus-visible,.ikea-action:focus-visible,.ikea-manage:focus-visible,.ikea-category:focus-visible,.ikea-store-nav button:focus-visible,.ikea-favorite:focus-visible,.ikea-add:focus-visible,.ikea-tone-button:focus-visible { outline:3px solid var(--ikea-yellow); outline-offset:2px; }
@media (min-width:680px) { .ikea-product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:350px) { .ikea-product-grid { grid-template-columns:1fr; } }

.ikea-store-nav { margin:0 16px 14px; padding:0; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; border:0; background:transparent; }
.ikea-store-nav button { position:relative; min-height:62px; padding:10px 11px; display:grid; grid-template-columns:24px 1fr; align-items:center; gap:7px; border:1px solid rgba(0,88,163,.2); border-radius:4px; color:var(--ikea-blue); background:#fff; font-size:9px; font-weight:800; text-align:left; }
.ikea-store-nav button i { font-size:17px; }
.ikea-store-nav button.is-active { color:#fff; background:var(--ikea-blue); }
.ikea-store-nav b { position:absolute; top:6px; right:7px; color:var(--ikea-blue); background:var(--ikea-yellow); }
.ikea-hero { position:relative; min-height:340px; margin:0; padding:0; display:block; overflow:hidden; border-top:1px solid var(--ikea-line); border-bottom:1px solid var(--ikea-line); background:#dce4e7; }
.ikea-room-stage { position:absolute; inset:0; min-height:0; border:0; background:#dce4e7; }
.ikea-room-stage::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,rgba(0,0,0,.5),transparent 62%); }
.ikea-hero-copy { position:absolute; z-index:1; top:26px; bottom:26px; left:16px; max-width:54%; justify-content:center; color:#fff; }
.ikea-hero h2 { max-width:10ch; font-size:31px; }
.ikea-hero-copy > p:not(.ikea-eyebrow):not(.shopping-map-reference) { margin-top:12px; color:rgba(255,255,255,.84); }
.ikea-map-reference { margin-top:auto; padding-top:11px; border-top:1px solid rgba(255,255,255,.42); color:#fff; }
.ikea-map-reference strong { color:#fff; }
.ikea-room-controls { margin:-20px 16px 15px; position:relative; z-index:2; border:1px solid rgba(0,88,163,.22); box-shadow:0 8px 22px rgba(0,59,105,.12); }
.ikea-category-grid { grid-template-columns:repeat(3,minmax(94px,1fr)); padding-top:4px; }
.ikea-category { min-height:92px; align-items:flex-start; justify-content:flex-end; border-radius:0; text-align:left; }
.ikea-category i { align-self:flex-start; color:var(--ikea-blue); font-size:18px; }
.ikea-category.is-active { color:#111; background:var(--ikea-yellow); }
.ikea-measure-board { margin:0 0 18px; padding:14px; display:flex; align-items:flex-end; justify-content:space-between; gap:14px; border-left:8px solid var(--ikea-blue); color:#111; background:var(--ikea-yellow); }
.ikea-measure-board div { display:flex; flex-direction:column; gap:4px; }
.ikea-measure-board span,.ikea-measure-board small { font-size:8px; font-weight:900; letter-spacing:.08em; }
.ikea-measure-board strong { font-size:22px; }
.ikea-measure-board button { min-height:42px; padding:0 10px; display:inline-flex; align-items:center; gap:6px; color:#fff; background:var(--ikea-blue); font-size:9px; font-weight:900; }
.ikea-product-grid { gap:18px 8px; }
.ikea-product-card { border:0; background:transparent; }
.ikea-product-visual { border:1px solid var(--ikea-line); background:#fff; }
.ikea-product-body { padding:10px 2px 4px; }
@media (max-width:390px) { .ikea-hero { min-height:310px; } .ikea-hero-copy { max-width:64%; } }
</style>
