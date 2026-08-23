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
const displayMode = ref('drop')
const displayModeOptions = Object.freeze([
  { key: 'drop', zh: '上新', en: 'DROP' },
  { key: 'lookbook', zh: '造型册', en: 'LOOKBOOK' },
])
const campaigns = Object.freeze([
  { key: 'seoul-transit', tagZh: '首尔移动 01', tagEn: 'SEOUL TRANSIT 01', titleZh: '从站台到街角', titleEn: 'PLATFORM TO STREET', subZh: '功能层、反光线与夜色', subEn: 'UTILITY / REFLECTIVE / NIGHT', icon: 'fas fa-train-subway' },
  { key: 'uniform-reset', tagZh: '制服重组 02', tagEn: 'UNIFORM RESET 02', titleZh: '把制服拆开', titleEn: 'DECONSTRUCT THE UNIFORM', subZh: '比例、口袋与可重复穿着', subEn: 'PROPORTION / POCKETS / REPEAT', icon: 'fas fa-vest' },
  { key: 'studio-signal', tagZh: '工作室信号 03', tagEn: 'STUDIO SIGNAL 03', titleZh: '做给下一次移动', titleEn: 'MADE FOR THE NEXT MOVE', subZh: '独立品牌与城市装备', subEn: 'INDEPENDENT LABELS / CITY GEAR', icon: 'fas fa-tower-broadcast' },
])
const lookbookFrames = Object.freeze([
  { key: '01', titleZh: '出发', titleEn: 'DEPART', icon: 'fas fa-person-walking' },
  { key: '02', titleZh: '换层', titleEn: 'LAYER', icon: 'fas fa-layer-group' },
  { key: '03', titleZh: '转弯', titleEn: 'TURN', icon: 'fas fa-arrow-turn-up' },
  { key: '04', titleZh: '回到街上', titleEn: 'BACK OUT', icon: 'fas fa-road' },
])
const styleNotes = Object.freeze([
  { key: 'material', zh: '材质实验', en: 'MATERIAL LAB', icon: 'fas fa-cubes' },
  { key: 'silhouette', zh: '轮廓地图', en: 'SILHOUETTE MAP', icon: 'fas fa-vector-square' },
  { key: 'night-route', zh: '夜行路线', en: 'NIGHT ROUTE', icon: 'fas fa-route' },
])
const iconForCategory = (category) => category.icon || 'fas fa-star'
const worksoutTitle = () =>
  props.languageBase === 'zh'
    ? props.activeService?.heroZh || props.activeService?.zh || '穿出自己的路线'
    : props.activeService?.heroEn || props.activeService?.en || 'Make your own route'
</script>

<template>
  <header
    class="shopping-storefront-header shopping-worksout-app"
    :data-storefront="activeService?.storefrontTemplate || 'fashion_editorial'"
    :data-display-mode="displayMode"
    data-storefront-kind="specialty"
  >
    <div class="worksout-topbar">
      <button
        type="button"
        class="worksout-icon"
        data-testid="shopping-go-home"
        :aria-label="localize('返回主屏幕', 'Back to Home')"
        :title="localize('返回主屏幕', 'Back to Home')"
        @click="emit('go-home')"
      >
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>
      <div class="worksout-identity">
        <span class="worksout-mark"><img v-if="brandAssetUrl" :src="brandAssetUrl" alt="" /><template v-else>W</template></span>
        <div>
          <h1>{{ activeLabel || activeService?.en || activeService?.zh || 'WORKSOUT' }}</h1>
          <p>{{ localize('街头服饰专门店', 'STREETWEAR / SPECIALTY') }}</p>
        </div>
      </div>
      <div class="worksout-actions">
        <button
          type="button"
          class="worksout-icon"
          :aria-label="localize('收藏', 'Favorites')"
          :title="localize('收藏', 'Favorites')"
          @click="emit('open-favorites')"
        >
          <i class="fas fa-heart" aria-hidden="true"></i>
          <b v-if="favoriteCount">{{ favoriteCount }}</b>
        </button>
        <button
          type="button"
          class="worksout-icon"
          :aria-label="localize('购物车', 'Cart')"
          :title="localize('购物车', 'Cart')"
          @click="emit('open-cart')"
        >
          <i class="fas fa-bag-shopping" aria-hidden="true"></i>
          <b v-if="cartQuantity">{{ cartQuantity }}</b>
        </button>
        <button type="button" class="worksout-icon" :aria-label="localize('订单', 'Orders')" @click="emit('open-orders')">
          <i class="fas fa-user" aria-hidden="true"></i>
          <b v-if="orderCount">{{ orderCount }}</b>
        </button>
      </div>
    </div>

    <div class="worksout-search-row">
      <label class="worksout-search">
        <span>FIND /</span>
        <input
          type="search"
          role="searchbox"
          :aria-label="localize('搜索商品', 'Search products')"
          :placeholder="localize('搜索品牌、系列或尺码', 'Search labels, drops, or sizes')"
          :value="searchQuery"
          @input="searchChanged"
        />
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
      </label>
    </div>

    <div class="worksout-cover" :class="{ 'is-lookbook': displayMode === 'lookbook' }">
      <div class="worksout-cover-copy">
        <p>{{ localize('DROP 08 / SEOUL', 'DROP 08 / SEOUL') }}</p>
        <h2>{{ worksoutTitle() }}</h2>
        <span>{{ activeDescription || activeService?.descEn || activeService?.descZh || '' }}</span>
        <p
          v-if="mapReference?.placeId"
          class="shopping-map-reference worksout-map-reference"
          data-testid="shopping-map-reference"
          :data-map-place-id="mapReference.placeId"
        >
          <i class="fas fa-location-dot" aria-hidden="true"></i>
          <span>{{ localize('本期街区', 'NEIGHBORHOOD') }}</span>
          <strong>{{ mapReference.district }}</strong>
        </p>
      </div>
      <div class="worksout-cover-art" aria-hidden="true">
        <img v-if="coverImageUrl" :src="coverImageUrl" :alt="`${activeService?.en || 'WORKSOUT'} cover`" />
        <template v-else>
          <span class="worksout-art-number">08</span>
          <i :class="activeService?.icon || 'fas fa-shirt'"></i>
          <span class="worksout-art-caption">MOVE / MAKE / REPEAT</span>
        </template>
      </div>
    </div>

    <div class="worksout-view-switch" role="tablist" :aria-label="localize('浏览模式', 'Browse mode')">
      <button
        v-for="mode in displayModeOptions"
        :key="mode.key"
        type="button"
        class="worksout-view-button"
        :class="{ 'is-active': displayMode === mode.key }"
        role="tab"
        :aria-selected="displayMode === mode.key"
        :data-testid="`shopping-worksout-mode-${mode.key}`"
        @click="displayMode = mode.key"
      >
        {{ localize(mode.zh, mode.en) }}
      </button>
      <span>{{ displayMode === 'lookbook' ? localize('按章节浏览', 'CHAPTER VIEW') : localize('按编号浏览', 'INDEX VIEW') }}</span>
    </div>

    <section class="worksout-campaign-wall" :aria-label="localize('街头服饰广告专题', 'Streetwear campaign wall')">
      <div class="worksout-section-label"><span>DROP CAMPAIGN WALL / 03</span><strong>{{ localize('先进入场景，再看单品', 'ENTER THE SCENE BEFORE THE PIECE') }}</strong></div>
      <div class="worksout-campaign-grid">
        <article v-for="campaign in campaigns" :key="campaign.key" class="worksout-campaign-card" :data-testid="`shopping-worksout-campaign-${campaign.key}`"><span>{{ localize(campaign.tagZh, campaign.tagEn) }}</span><strong>{{ localize(campaign.titleZh, campaign.titleEn) }}</strong><small>{{ localize(campaign.subZh, campaign.subEn) }}</small><i :class="campaign.icon" aria-hidden="true"></i></article>
      </div>
    </section>

    <section class="worksout-lookbook-rail" :aria-label="localize('首尔画报章节', 'Seoul lookbook chapters')">
      <div class="worksout-section-label"><span>LOOKBOOK / SEOUL 08</span><strong>{{ localize('四帧连成一条移动路线', 'FOUR FRAMES / ONE MOVING ROUTE') }}</strong></div>
      <div class="worksout-lookbook-track"><article v-for="frame in lookbookFrames" :key="frame.key" class="worksout-lookbook-frame" :data-testid="`shopping-worksout-lookbook-${frame.key}`"><span>{{ frame.key }}</span><i :class="frame.icon" aria-hidden="true"></i><b>{{ localize(frame.titleZh, frame.titleEn) }}</b></article></div>
    </section>

    <section class="worksout-style-notes" :aria-label="localize('造型笔记', 'Style notes')">
      <div class="worksout-section-label"><span>STYLE NOTES / 08—21</span><strong>{{ localize('材质、比例与夜行搭配', 'MATERIAL / PROPORTION / NIGHT ROUTES') }}</strong></div>
      <div class="worksout-note-track"><article v-for="note in styleNotes" :key="note.key" class="worksout-note-card"><i :class="note.icon" aria-hidden="true"></i><span>{{ localize(note.zh, note.en) }}</span><b>STYLE FILE</b></article></div>
    </section>

    <div class="worksout-category-row">
      <button
        v-for="category in categoryCards"
        :key="category.key"
        type="button"
        class="worksout-category"
        :class="{ 'is-active': category.active, 'border-orange-300': category.active }"
        :data-testid="`shopping-category-${category.key}`"
        @click="emit('select-category', category.key)"
      >
        <span>{{ category.label }}</span><em>{{ category.count }}</em><i :class="iconForCategory(category)" aria-hidden="true"></i>
      </button>
    </div>

    <nav class="worksout-store-nav" :aria-label="localize('店内导航', 'Store navigation')">
      <button type="button" :class="{ 'is-active': !favoritesOnly }" @click="emit('show-all')">{{ localize('新品', 'DROP') }}</button>
      <button type="button" :class="{ 'is-active': favoritesOnly }" @click="emit('open-favorites')">{{ localize('收藏', 'SAVED') }}</button>
      <button type="button" @click="emit('open-cart')">{{ localize('购物袋', 'BAG') }}<b v-if="cartQuantity">{{ cartQuantity }}</b></button>
      <button type="button" @click="emit('open-orders')">{{ localize('订单', 'ORDERS') }}<b v-if="orderCount">{{ orderCount }}</b></button>
    </nav>
  </header>

  <section
    v-if="!activeCategoryIsLogistics"
    id="shopping-products"
    class="shopping-products-section worksout-products"
    :class="{ 'is-lookbook': displayMode === 'lookbook' }"
  >
    <div class="worksout-products-heading">
      <div>
        <p>{{ favoritesOnly ? localize('收藏目录', 'SAVED INDEX') : localize('当前上架', 'CURRENT DROP') }}</p>
        <h2>{{ activeCategory?.label || localize('全部单品', 'All pieces') }}</h2>
      </div>
      <button
        v-if="favoritesOnly"
        type="button"
        class="worksout-clear"
        :aria-label="localize('显示全部商品', 'Show all products')"
        :title="localize('显示全部商品', 'Show all products')"
        @click="emit('show-all')"
      >
        <i class="fas fa-xmark" aria-hidden="true"></i>
      </button>
      <span v-else>{{ String(visibleProducts.length).padStart(2, '0') }}</span>
    </div>
    <div v-if="visibleProducts.length === 0" class="worksout-empty">
      <i class="fas fa-asterisk" aria-hidden="true"></i>
      <p>{{ favoritesOnly ? localize('这里还没有收藏商品。', 'No saved items here yet.') : searchQuery ? localize('没有找到匹配商品。', 'No matching products found.') : localize('这个分类还没有商品。', 'No products in this category yet.') }}</p>
    </div>
    <div v-else class="worksout-product-grid">
      <article
        v-for="(product, index) in visibleProducts"
        :key="product.id"
        class="shopping-product-card worksout-product-card"
        :class="{ 'is-highlighted': product.id === highlightedProductId }"
        :data-product-template="productStorefrontTemplate(product)"
        :data-testid="`shopping-product-${product.id}`"
      >
        <div class="worksout-product-visual">
          <button type="button" class="worksout-product-open" :aria-label="productDisplayTitle(product)" @click="emit('open-product', product.id)">
            <img v-if="productImageUrl(product)" :src="productImageUrl(product)" :alt="product.image?.alt || productDisplayTitle(product)" />
            <span v-else class="worksout-product-symbol" aria-hidden="true"><span>{{ String(index + 1).padStart(2, '0') }}</span><i :class="productCategoryIcon(product)"></i></span>
          </button>
          <button
            type="button"
            class="worksout-favorite"
            :class="{ 'is-favorite': isProductFavorite(product.id) }"
            :aria-label="localize('收藏或取消收藏', 'Toggle favorite')"
            :title="localize('收藏或取消收藏', 'Toggle favorite')"
            @click.stop="emit('toggle-favorite', product.id)"
          >
            <i class="fas fa-heart" aria-hidden="true"></i>
          </button>
        </div>
        <div class="worksout-product-body">
          <div class="worksout-product-index">NO.{{ String(index + 1).padStart(2, '0') }} / {{ productServiceLabel(product) }}</div>
          <button type="button" class="worksout-product-title" @click="emit('open-product', product.id)"><h3>{{ productDisplayTitle(product) }}</h3></button>
          <p>{{ productDisplayDescription(product) }}</p>
          <div class="worksout-product-tags">
            <span :class="stockStatusClass(product.stockStatus)">{{ stockStatusLabel(product.stockStatus) }}</span>
            <span v-if="product.giftable">{{ localize('可赠礼', 'Giftable') }}</span>
          </div>
          <div class="worksout-product-footer">
            <strong>{{ formatPrice(product) }}</strong>
            <button
              type="button"
              class="worksout-add"
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
</template>

<style scoped>
.shopping-worksout-app { --worksout-yellow:#ffda05; --worksout-red:#e63838; --worksout-bg:#171a20; --worksout-surface:#22262e; --worksout-muted:#b4bac4; --worksout-line:rgba(255,255,255,.18); display:block; color:#f8f8f5; background:var(--worksout-bg); }
.worksout-topbar,.worksout-search-row,.worksout-products-heading,.worksout-product-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.worksout-topbar { padding:14px 16px 10px; }
.worksout-icon,.worksout-manage { position:relative; width:35px; height:35px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--worksout-line); border-radius:50%; color:#f8f8f5; background:transparent; }
.worksout-actions { display:flex; gap:6px; }
.worksout-icon b { position:absolute; top:-4px; right:-4px; min-width:15px; height:15px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:var(--worksout-bg); background:var(--worksout-yellow); font-size:8px; }
.worksout-identity { min-width:0; flex:1; display:flex; align-items:center; gap:9px; }
.worksout-mark { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; border:2px solid var(--worksout-yellow); color:var(--worksout-yellow); background:var(--worksout-bg); font-size:14px; font-weight:900; }
.worksout-mark img { width:100%; height:100%; object-fit:cover; border:0; }
.worksout-identity h1 { margin:0; overflow:hidden; font:900 17px/1 Arial, sans-serif; letter-spacing:.03em; text-overflow:ellipsis; white-space:nowrap; }
.worksout-identity p,.worksout-products-heading p { margin:4px 0 0; color:var(--worksout-muted); font-size:8px; font-weight:900; letter-spacing:.1em; }
.worksout-search-row { padding:0 16px 15px; }
.worksout-search { min-width:0; flex:1; display:flex; align-items:center; gap:9px; padding:8px 0; border-bottom:1px solid var(--worksout-line); }
.worksout-search span { color:var(--worksout-yellow); font:900 9px/1 Arial, sans-serif; }
.worksout-search input { min-width:0; flex:1; border:0; outline:0; color:#f8f8f5; background:transparent; font-size:12px; }
.worksout-search input::placeholder { color:#757b85; }
.worksout-cover { min-height:265px; padding:18px 16px 16px; display:grid; grid-template-columns:minmax(0,.9fr) minmax(145px,1.1fr); gap:16px; border-top:1px solid var(--worksout-line); border-bottom:1px solid var(--worksout-line); background:#0f1116; }
.worksout-cover-copy { display:flex; flex-direction:column; justify-content:flex-end; }
.worksout-cover-copy > p:first-child { margin:0 0 10px; color:var(--worksout-yellow); font:900 9px/1 Arial, sans-serif; letter-spacing:.14em; }
.worksout-cover h2 { max-width:8ch; margin:0; color:#f8f8f5; font:900 37px/.9 Arial, sans-serif; letter-spacing:-.04em; text-transform:uppercase; }
.worksout-cover-copy > span { max-width:22ch; margin-top:14px; color:var(--worksout-muted); font-size:10px; line-height:1.5; }
.worksout-map-reference { margin-top:14px; padding-top:9px; display:grid; grid-template-columns:12px auto; gap:2px 7px; border-top:1px solid var(--worksout-line); color:var(--worksout-muted); }
.worksout-map-reference i { grid-row:1 / span 2; align-self:center; color:var(--worksout-yellow); }
.worksout-map-reference span { font-size:8px; font-weight:900; letter-spacing:.08em; }
.worksout-map-reference strong { color:#f8f8f5; font:700 12px/1.2 Arial, sans-serif; }
.worksout-cover-art { position:relative; min-height:230px; overflow:hidden; display:flex; align-items:center; justify-content:center; border:1px solid var(--worksout-line); background:linear-gradient(145deg,#343a45,#181b21); }
.worksout-cover-art img { width:100%; height:100%; object-fit:cover; }
.worksout-cover-art i { color:var(--worksout-yellow); font-size:63px; transform:rotate(-9deg); }
.worksout-art-number { position:absolute; top:10px; right:11px; color:var(--worksout-red); font:900 27px/1 Arial, sans-serif; }
.worksout-art-caption { position:absolute; right:10px; bottom:10px; left:10px; color:#f8f8f5; font:900 8px/1 Arial, sans-serif; letter-spacing:.15em; }
.worksout-view-switch { padding:9px 16px; display:flex; align-items:center; gap:4px; border-bottom:1px solid var(--worksout-line); background:#11141a; }
.worksout-view-button { min-height:30px; padding:0 9px; border:1px solid var(--worksout-line); color:var(--worksout-muted); background:transparent; font:900 8px/1 Arial, sans-serif; letter-spacing:.11em; }
.worksout-view-button.is-active { border-color:var(--worksout-yellow); color:var(--worksout-bg); background:var(--worksout-yellow); }
.worksout-view-switch > span { margin-left:auto; color:var(--worksout-muted); font:900 8px/1 Arial, sans-serif; letter-spacing:.08em; }
.worksout-section-label { padding:12px 16px 8px; display:flex; align-items:center; justify-content:space-between; gap:10px; color:var(--worksout-muted); font:900 8px/1 Arial, sans-serif; letter-spacing:.1em; }
.worksout-section-label strong { color:#f8f8f5; font-size:8px; letter-spacing:.02em; text-align:right; }
.worksout-campaign-wall { padding-bottom:13px; border-bottom:1px solid var(--worksout-line); background:#20242c; }
.worksout-campaign-grid { padding:0 16px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
.worksout-campaign-card { position:relative; min-height:123px; padding:10px; display:flex; flex-direction:column; align-items:flex-start; justify-content:flex-end; gap:4px; overflow:hidden; border:1px solid var(--worksout-line); color:#f8f8f5; background:#2a303a; text-align:left; }
.worksout-campaign-card:nth-child(2) { background:#31333c; }
.worksout-campaign-card:nth-child(3) { background:#252a32; }
.worksout-campaign-card.is-active { border-color:var(--worksout-yellow); box-shadow:inset 0 -4px 0 var(--worksout-red); }
.worksout-campaign-card span { position:absolute; top:9px; left:10px; color:var(--worksout-yellow); font:900 7px/1 'Courier New',monospace; }
.worksout-campaign-card strong { max-width:12ch; color:#f8f8f5; font:900 16px/.95 Arial,sans-serif; letter-spacing:-.04em; }
.worksout-campaign-card small { max-width:19ch; color:var(--worksout-muted); font-size:8px; line-height:1.2; }
.worksout-campaign-card i { position:absolute; top:27px; right:12px; color:var(--worksout-red); font-size:27px; opacity:.65; }
.worksout-lookbook-rail { padding-bottom:13px; border-bottom:1px solid var(--worksout-line); background:#11141a; }
.worksout-lookbook-track,.worksout-note-track { padding:0 16px; display:flex; gap:7px; overflow-x:auto; }
.worksout-lookbook-frame { position:relative; min-width:128px; height:108px; display:flex; flex:0 0 auto; align-items:center; justify-content:center; overflow:hidden; border:1px solid var(--worksout-line); color:#f8f8f5; background:linear-gradient(145deg,#4c5665,#1c2027); }
.worksout-lookbook-frame:nth-child(2) { background:linear-gradient(145deg,#72614f,#1d2027); }
.worksout-lookbook-frame:nth-child(3) { background:linear-gradient(145deg,#485b5b,#191e24); }
.worksout-lookbook-frame:nth-child(4) { background:linear-gradient(145deg,#73383a,#1b1d22); }
.worksout-lookbook-frame.is-active { border-color:var(--worksout-yellow); box-shadow:0 0 0 2px rgba(255,218,5,.14); }
.worksout-lookbook-frame span { position:absolute; top:8px; left:9px; color:var(--worksout-red); font:900 11px 'Courier New',monospace; }
.worksout-lookbook-frame i { color:var(--worksout-yellow); font-size:28px; }
.worksout-lookbook-frame b { position:absolute; right:8px; bottom:8px; left:8px; color:#f8f8f5; font:900 8px/1 Arial,sans-serif; text-align:left; }
.worksout-style-notes { padding-bottom:13px; border-bottom:1px solid var(--worksout-line); background:#171a20; }
.worksout-note-card { min-width:145px; min-height:70px; padding:10px; display:flex; flex:0 0 auto; flex-direction:column; align-items:flex-start; justify-content:space-between; border:1px solid var(--worksout-line); color:#f8f8f5; background:transparent; text-align:left; }
.worksout-note-card:nth-child(2) { background:#22262e; }
.worksout-note-card i { color:var(--worksout-yellow); font-size:15px; }
.worksout-note-card span { font:900 11px/1 Arial,sans-serif; }
.worksout-note-card b { color:var(--worksout-muted); font:900 7px 'Courier New',monospace; }
.worksout-products.is-lookbook .worksout-product-grid { grid-template-columns:1fr; }
.worksout-products.is-lookbook .worksout-product-card { display:grid; grid-template-columns:minmax(130px,.9fr) 1fr; animation:worksout-lookbook-reveal .28s ease both; }
.worksout-products.is-lookbook .worksout-product-visual { aspect-ratio:4 / 3; }
.worksout-products.is-lookbook .worksout-product-body { min-height:0; }
@keyframes worksout-lookbook-reveal { from { opacity:.35; transform:translateX(8px); } to { opacity:1; transform:translateX(0); } }
.worksout-category-row { padding:13px 16px 10px; display:flex; gap:7px; overflow-x:auto; border-bottom:1px solid var(--worksout-line); }
.worksout-category { min-width:106px; padding:8px 9px; display:grid; grid-template-columns:1fr auto; gap:3px 8px; border:1px solid var(--worksout-line); color:var(--worksout-muted); background:transparent; text-align:left; font-size:10px; font-weight:800; }
.worksout-category i { grid-column:2; grid-row:1 / span 2; align-self:center; color:var(--worksout-yellow); }
.worksout-category em { color:#747a84; font-size:8px; font-style:normal; }
.worksout-category.is-active { border-color:var(--worksout-yellow); color:#f8f8f5; }
.worksout-store-nav { padding:6px 16px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:3px; border-bottom:1px solid var(--worksout-line); background:var(--worksout-bg); }
.worksout-store-nav button { position:relative; min-height:36px; color:var(--worksout-muted); font:900 9px/1 Arial, sans-serif; letter-spacing:.1em; }
.worksout-store-nav button.is-active { color:var(--worksout-yellow); }
.worksout-store-nav button.is-active::before { content:'//'; position:absolute; top:0; left:4px; color:var(--worksout-red); }
.worksout-store-nav b { margin-left:4px; color:var(--worksout-yellow); font-size:8px; }
.worksout-products { padding:21px 16px 28px; background:var(--worksout-bg); }
.worksout-products-heading { min-height:44px; margin-bottom:13px; }
.worksout-products-heading h2 { margin:5px 0 0; color:#f8f8f5; font:900 25px/.95 Arial, sans-serif; letter-spacing:-.03em; text-transform:uppercase; }
.worksout-products-heading > span { color:var(--worksout-yellow); font:900 17px/1 Arial, sans-serif; }
.worksout-clear { width:34px; height:34px; border:1px solid var(--worksout-line); color:var(--worksout-yellow); background:transparent; }
.worksout-product-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.worksout-product-card { overflow:hidden; border:1px solid var(--worksout-line); color:#f8f8f5; background:var(--worksout-surface); }
.worksout-product-card.is-highlighted { border-color:var(--worksout-yellow); box-shadow:0 0 0 2px rgba(255,218,5,.16); }
.worksout-product-visual { position:relative; aspect-ratio:1 / 1; overflow:hidden; background:#2b3039; }
.worksout-product-open { width:100%; height:100%; display:block; text-align:left; }
.worksout-product-open img { width:100%; height:100%; display:block; object-fit:cover; }
.worksout-product-symbol { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--worksout-yellow); background:#101216; }
.worksout-product-symbol span { position:absolute; top:9px; left:9px; color:var(--worksout-red); font:900 15px/1 Arial, sans-serif; }
.worksout-product-symbol i { font-size:32px; }
.worksout-favorite { position:absolute; top:8px; right:8px; width:31px; height:31px; border:1px solid var(--worksout-line); border-radius:50%; color:#8e959e; background:rgba(23,26,32,.88); }
.worksout-favorite.is-favorite { color:var(--worksout-yellow); }
.worksout-product-body { min-height:175px; padding:11px; display:flex; flex-direction:column; }
.worksout-product-index { color:var(--worksout-yellow); font:900 8px/1 Arial, sans-serif; letter-spacing:.05em; text-transform:uppercase; }
.worksout-product-title { width:100%; color:inherit; text-align:left; }
.worksout-product-body h3 { min-height:34px; margin:7px 0 0; display:-webkit-box; overflow:hidden; color:#f8f8f5; font:800 14px/1.2 Arial, sans-serif; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.worksout-product-body > p { min-height:31px; margin:7px 0 0; display:-webkit-box; overflow:hidden; color:var(--worksout-muted); font-size:10px; line-height:1.5; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.worksout-product-tags { min-height:19px; margin-top:7px; display:flex; flex-wrap:wrap; gap:4px; }
.worksout-product-tags span { padding:3px 5px; color:#15171b; background:var(--worksout-yellow); font-size:8px; font-weight:900; }
.worksout-product-footer { margin-top:auto; padding-top:9px; }
.worksout-product-footer strong { font-size:12px; }
.worksout-add { width:33px; height:33px; display:inline-flex; align-items:center; justify-content:center; color:var(--worksout-bg); background:var(--worksout-yellow); }
.worksout-add:disabled { opacity:.35; }
.worksout-empty { min-height:160px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; border:1px dashed var(--worksout-line); color:var(--worksout-muted); text-align:center; }
.worksout-empty p { margin:0; font-size:11px; }
.worksout-icon:focus-visible,.worksout-manage:focus-visible,.worksout-category:focus-visible,.worksout-store-nav button:focus-visible,.worksout-product-open:focus-visible,.worksout-product-title:focus-visible,.worksout-favorite:focus-visible,.worksout-add:focus-visible,.worksout-view-button:focus-visible,.worksout-campaign-card:focus-visible,.worksout-lookbook-frame:focus-visible,.worksout-note-card:focus-visible { outline:3px solid var(--worksout-yellow); outline-offset:2px; }
@media (min-width:680px) { .worksout-product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:350px) { .worksout-product-grid { grid-template-columns:1fr; } .worksout-products.is-lookbook .worksout-product-card { display:block; } .worksout-view-switch > span { display:none; } }
.shopping-worksout-app{--worksout-yellow:#111;--worksout-red:#d62f2f;--worksout-bg:#fff;--worksout-surface:#f3f3f1;--worksout-muted:#686868;--worksout-line:rgba(0,0,0,.18);color:#111;background:#fff}.worksout-topbar{min-height:66px;padding-block:10px;border-bottom:1px solid #111}.worksout-icon,.worksout-manage{border-radius:0;color:#111}.worksout-mark{border:0;color:#fff;background:#111}.worksout-identity p{color:#686868}.worksout-search-row{padding-block:10px;background:#fff}.worksout-search input{color:#111}.worksout-search input::placeholder{color:#777}.worksout-cover{position:relative;min-height:500px;padding:0;display:block;border:0;background:#111;overflow:hidden}.worksout-cover-art{position:absolute;inset:0;min-height:0;border:0;background:linear-gradient(145deg,#d7d7d4,#404040)}.worksout-cover-art:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.76))}.worksout-cover-art img{filter:saturate(.68)}.worksout-cover-copy{position:absolute;z-index:2;right:18px;bottom:24px;left:18px;display:block}.worksout-cover-copy>p:first-child{color:#fff}.worksout-cover h2{max-width:9ch;color:#fff;font-size:50px}.worksout-cover-copy>span{display:block;max-width:34ch;color:#e8e8e5}.worksout-map-reference{max-width:290px;color:#ccc}.worksout-map-reference strong{color:#fff}.worksout-view-switch{padding-block:11px;color:#111;background:#fff}.worksout-view-button{border-radius:0}.worksout-view-button.is-active{color:#fff;background:#111;border-color:#111}.worksout-campaign-wall{padding-bottom:25px;background:#fff}.worksout-campaign-grid{grid-template-columns:repeat(6,1fr)}.worksout-campaign-card{grid-column:span 2;min-height:175px;color:#fff;background:#111}.worksout-campaign-card:first-child{grid-column:span 4}.worksout-campaign-card:nth-child(2){grid-column:span 2;color:#111;background:#e7e7e3}.worksout-campaign-card:nth-child(2) span,.worksout-campaign-card:nth-child(2) small{color:#555}.worksout-lookbook-rail{padding-bottom:26px;background:#f2f2ef}.worksout-lookbook-frame{min-width:145px;height:205px;filter:grayscale(1)}.worksout-style-notes{padding-bottom:22px;background:#fff}.worksout-note-track{grid-template-columns:repeat(3,1fr)}.worksout-category-row{padding-block:12px;color:#fff;background:#111}.worksout-category{color:#aaa;border-color:#444}.worksout-category.is-active{color:#fff;border-color:#fff}.worksout-store-nav{display:none}.worksout-products{padding-top:32px;color:#111;background:#fff}.worksout-products-heading p{color:#111}.worksout-product-card{border:0;background:#fff}.worksout-product-media{background:#eee}.worksout-product-body{padding-inline:0}.worksout-product-body h3{color:#111}.worksout-product-body>p{color:#666}.worksout-product-footer{border-color:#ccc}.worksout-add{color:#fff;background:#111}@media(max-width:520px){.worksout-campaign-card,.worksout-campaign-card:first-child,.worksout-campaign-card:nth-child(2){grid-column:span 3}.worksout-actions{gap:2px}.worksout-icon{width:32px;height:32px}}
</style>
