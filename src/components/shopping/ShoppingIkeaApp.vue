<script setup>
import { computed, ref } from 'vue'
import {
  SHOPPING_STOREFRONT_EVENTS,
  SHOPPING_STOREFRONT_PROPS,
  localizeShoppingCopy,
} from './shopping-storefront-contract'

const props = defineProps(SHOPPING_STOREFRONT_PROPS)
const emit = defineEmits(SHOPPING_STOREFRONT_EVENTS)
const l = (zh, en) => localizeShoppingCopy(props.languageBase, zh, en)
const searchChanged = (event) => emit('update:searchQuery', event.target.value)
const roomTone = ref('day')
const activeSpot = ref(0)
const roomTones = Object.freeze([
  { key: 'plan', zh: '布置图', en: 'PLAN' },
  { key: 'day', zh: '日间', en: 'DAY' },
  { key: 'night', zh: '晚间', en: 'EVENING' },
])
const featuredProducts = computed(() => props.visibleProducts.slice(0, 3))
const focusedProduct = computed(() => featuredProducts.value[activeSpot.value] || props.visibleProducts[0] || null)
const title = computed(() => props.languageBase === 'zh'
  ? props.activeService?.heroZh || '让房间先回答生活的问题'
  : props.activeService?.heroEn || 'Let the room answer everyday needs')
</script>

<template>
  <header
    class="shopping-storefront-header shopping-ikea-app"
    :data-storefront="activeService?.storefrontTemplate || 'room_planner'"
    :data-room-tone="roomTone"
    data-storefront-kind="specialty"
  >
    <div class="ikea-shellbar">
      <button class="ikea-icon" type="button" data-testid="shopping-go-home" :aria-label="l('返回主屏幕','Back to Home')" @click="emit('go-home')"><i class="fas fa-arrow-left"></i></button>
      <div class="ikea-brand"><span><img v-if="brandAssetUrl" :src="brandAssetUrl" alt="" /><b v-else>IKEA</b></span><div><h1>{{ activeLabel || 'IKEA Korea' }}</h1><p>{{ l('家居与空间灵感','HOME & ROOM IDEAS') }}</p></div></div>
      <div class="ikea-shell-actions">
        <button class="ikea-icon" type="button" :aria-label="l('心愿清单','Wish list')" @click="emit('open-favorites')"><i class="fas fa-heart"></i><b v-if="favoriteCount">{{ favoriteCount }}</b></button>
        <button class="ikea-icon" type="button" aria-label="Cart" :title="l('购物清单','Shopping list')" @click="emit('open-cart')"><i class="fas fa-bag-shopping"></i><b v-if="cartQuantity">{{ cartQuantity }}</b></button>
      </div>
    </div>

    <form class="ikea-search" @submit.prevent="emit('submit-search')">
      <i class="fas fa-magnifying-glass"></i>
      <input type="search" role="searchbox" :value="searchQuery" :placeholder="l('搜索家具、收纳或房间','Search furniture, storage, or rooms')" @input="searchChanged" />
      <button type="submit" :aria-label="l('搜索商品','Search products')"><i class="fas fa-arrow-right"></i></button>
    </form>

    <nav class="ikea-primary-nav" :aria-label="l('店内导航','Store navigation')">
      <button type="button" :class="{ active: !favoritesOnly }" @click="emit('show-all')">{{ l('灵感','Ideas') }}</button>
      <button type="button" @click="emit('select-category', activeCategory?.key || categoryCards[0]?.key)">{{ l('商品','Products') }}</button>
      <button type="button" :class="{ active: favoritesOnly }" @click="emit('open-favorites')">{{ l('心愿单','Wish list') }}</button>
      <button type="button" @click="emit('open-orders')">{{ l('订单与配送','Orders') }}</button>
    </nav>

    <section class="ikea-room-hero">
      <div class="ikea-room-media ikea-room-stage" :class="`is-${roomTone}`">
        <img v-if="coverImageUrl" :src="coverImageUrl" :alt="l('布置完成的起居空间','Furnished living space')" />
        <div v-else class="ikea-room-illustration" aria-hidden="true">
          <span class="window"></span><span class="rug"></span><span class="sofa"></span><span class="table"></span><span class="lamp"></span>
        </div>
        <button
          v-for="(product, index) in featuredProducts"
          :key="product.id"
          type="button"
          class="ikea-hotspot"
          :class="[`spot-${index + 1}`, { active: activeSpot === index }]"
          :aria-label="productDisplayTitle(product)"
          @mouseenter="activeSpot = index"
          @focus="activeSpot = index"
          @click="emit('open-product', product.id)"
        >{{ index + 1 }}</button>
        <div class="ikea-room-caption"><span>{{ l('小户型起居室','COMPACT LIVING ROOM') }}</span><strong>{{ l('3 件可选单品','3 SHOPPABLE OBJECTS') }}</strong></div>
      </div>
      <div class="ikea-room-story">
        <p>{{ l('本周空间提案','ROOM OF THE WEEK') }}</p>
        <h2>{{ title }}</h2>
        <span>{{ activeDescription || l('从真实生活任务出发，组合休息、照明与收纳。','Build rest, light, and storage around real routines.') }}</span>
        <article v-if="focusedProduct" class="ikea-spot-card">
          <small>0{{ activeSpot + 1 }} / {{ l('场景单品','IN THIS ROOM') }}</small>
          <strong>{{ productDisplayTitle(focusedProduct) }}</strong>
          <span>{{ formatPrice(focusedProduct) }}</span>
          <button type="button" @click="emit('open-product', focusedProduct.id)">{{ l('查看商品','View product') }} <i class="fas fa-arrow-right"></i></button>
        </article>
        <p v-if="mapReference?.placeId" class="shopping-map-reference ikea-place" data-testid="shopping-map-reference" :data-map-place-id="mapReference.placeId"><i class="fas fa-location-dot"></i><span>{{ mapReference.district }}</span></p>
      </div>
    </section>

    <div class="ikea-tone-switch" role="tablist" :aria-label="l('空间呈现','Room view')">
      <span>{{ l('切换空间呈现','VIEW THE ROOM') }}</span>
      <button v-for="tone in roomTones" :key="tone.key" type="button" role="tab" :aria-selected="roomTone === tone.key" :class="{ active: roomTone === tone.key }" :data-testid="`shopping-ikea-tone-${tone.key}`" @click="roomTone = tone.key">{{ l(tone.zh, tone.en) }}</button>
    </div>

    <section class="ikea-journeys">
      <button type="button" @click="emit('select-category', categoryCards[0]?.key)"><i class="fas fa-couch"></i><span><b>{{ l('按空间逛','Shop by room') }}</b><small>{{ l('从房间进入目录','Start with a room') }}</small></span><i class="fas fa-arrow-right"></i></button>
      <button type="button" @click="emit('open-favorites')"><i class="fas fa-heart"></i><span><b>{{ l('继续我的清单','Continue my list') }}</b><small>{{ favoriteCount }} {{ l('件已收藏','saved items') }}</small></span><i class="fas fa-arrow-right"></i></button>
      <button type="button" @click="emit('open-cart')"><i class="fas fa-bag-shopping"></i><span><b>{{ l('准备购买','Ready to buy') }}</b><small>{{ cartQuantity }} {{ l('件商品','items') }}</small></span><i class="fas fa-arrow-right"></i></button>
    </section>

    <section class="ikea-category-section">
      <div><p>{{ l('快速进入','BROWSE PRODUCTS') }}</p><h2>{{ l('你想解决哪个空间？','Which space needs attention?') }}</h2></div>
      <div class="ikea-category-row">
        <button v-for="category in categoryCards" :key="category.key" type="button" :class="{ active: category.active, 'is-active': category.active }" :data-testid="`shopping-category-${category.key}`" @click="emit('select-category', category.key)"><i :class="category.icon || 'fas fa-cube'"></i><strong>{{ category.label }}</strong><small>{{ category.count }}</small></button>
      </div>
    </section>
  </header>

  <section v-if="!activeCategoryIsLogistics" id="shopping-products" class="ikea-home-products">
    <header><div><p>{{ favoritesOnly ? l('你的收藏','YOUR WISH LIST') : l('适合带回家的单品','READY FOR YOUR ROOM') }}</p><h2>{{ activeCategory?.label || l('本周推荐','This week') }}</h2></div><button v-if="favoritesOnly" type="button" @click="emit('show-all')">{{ l('查看全部','View all') }}</button><span v-else>{{ visibleProducts.length }} {{ l('件商品','items') }}</span></header>
    <div v-if="!visibleProducts.length" class="ikea-empty"><i class="fas fa-heart"></i><p>{{ favoritesOnly ? l('心愿清单还是空的。','Your wish list is empty.') : l('没有找到匹配商品。','No matching products found.') }}</p></div>
    <div v-else class="ikea-product-rail">
      <article v-for="product in visibleProducts" :key="product.id" class="shopping-product-card ikea-product-card" :data-product-template="productStorefrontTemplate(product)" :data-testid="`shopping-product-${product.id}`">
        <button class="ikea-product-media" type="button" @click.stop="emit('open-product', product.id)"><img v-if="productImageUrl(product)" :src="productImageUrl(product)" :alt="productDisplayTitle(product)" /><span v-else><i :class="productCategoryIcon(product)"></i></span></button>
        <button class="ikea-favorite" type="button" :class="{ active: isProductFavorite(product.id) }" :aria-label="l('切换收藏','Toggle favorite')" @click.stop="emit('toggle-favorite', product.id)"><i class="fas fa-heart"></i></button>
        <div><button type="button" @click.stop="emit('open-product', product.id)"><small>{{ productServiceLabel(product) }}</small><h3>{{ productDisplayTitle(product) }}</h3></button><p>{{ productDisplayDescription(product) }}</p><span :class="stockStatusClass(product.stockStatus)">{{ stockStatusLabel(product.stockStatus) }}</span><footer><strong>{{ formatPrice(product) }}</strong><button type="button" :disabled="product.stockStatus === 'sold_out'" :data-testid="`shopping-add-cart-${product.id}`" :aria-label="`${l('加入购物清单','Add to shopping list')}: ${productDisplayTitle(product)}`" @click.stop="emit('add-to-cart', product.id)"><i class="fas fa-plus"></i></button></footer></div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.shopping-ikea-app{--blue:#0058a3;--yellow:#ffda1a;--ink:#111;--muted:#666;display:block;color:var(--ink);background:#f6f6f4;font-family:Arial,"Noto Sans KR",sans-serif}.ikea-shellbar{height:64px;padding:0 18px;display:flex;align-items:center;gap:12px;background:#fff}.ikea-icon{position:relative;width:40px;height:40px;border-radius:50%;background:#f1f1ef}.ikea-icon>b{position:absolute;top:-2px;right:-2px;min-width:17px;height:17px;display:grid;place-items:center;border-radius:10px;color:#fff;background:var(--blue);font-size:8px}.ikea-brand{min-width:0;flex:1;display:flex;align-items:center;gap:10px}.ikea-brand>span{width:46px;height:32px;display:grid;place-items:center;overflow:hidden;border-radius:50%;color:var(--yellow);background:var(--blue);font-size:10px}.ikea-brand img{width:100%;height:100%;object-fit:cover}.ikea-brand h1{margin:0;font-size:15px}.ikea-brand p{margin:2px 0 0;color:#777;font-size:7px;font-weight:900;letter-spacing:.1em}.ikea-shell-actions{display:flex;gap:6px}.ikea-search{height:46px;margin:0 18px 10px;padding:0 8px 0 16px;display:grid;grid-template-columns:24px 1fr 40px;align-items:center;border-radius:24px;background:#ececea}.ikea-search input{min-width:0;border:0;outline:0;background:transparent;font-size:11px}.ikea-search>button{height:34px;border-radius:50%;background:#fff}.ikea-primary-nav{padding:0 18px 12px;display:flex;gap:22px;background:#fff}.ikea-primary-nav button{position:relative;padding:8px 0;color:#666;font-size:9px;font-weight:800}.ikea-primary-nav button.active{color:var(--ink)}.ikea-primary-nav button.active:after{content:"";position:absolute;right:0;bottom:2px;left:0;height:3px;background:var(--yellow)}.ikea-room-hero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.6fr);background:#fff}.ikea-room-media{position:relative;min-height:470px;overflow:hidden;background:#dce7e9}.ikea-room-media>img{width:100%;height:100%;object-fit:cover}.ikea-room-illustration{position:absolute;inset:0;background:linear-gradient(180deg,#dce8e9 0 62%,#c8b395 62%)}.ikea-room-illustration span{position:absolute;display:block;transition:.35s ease}.ikea-room-illustration .window{left:10%;top:9%;width:28%;height:38%;background:#f9f5df;box-shadow:inset 0 0 0 10px #fff}.ikea-room-illustration .rug{left:25%;right:10%;bottom:5%;height:25%;border-radius:50%;background:#e5d3a7}.ikea-room-illustration .sofa{left:23%;bottom:19%;width:48%;height:24%;border-radius:28px 28px 10px 10px;background:#315d68;box-shadow:0 30px 0 -18px #203e45}.ikea-room-illustration .table{right:14%;bottom:18%;width:18%;height:16%;border-radius:50%;background:#dc7e43}.ikea-room-illustration .lamp{right:9%;top:17%;width:6px;height:47%;background:#222}.ikea-room-illustration .lamp:before{content:"";position:absolute;left:-30px;top:0;border-right:32px solid transparent;border-left:32px solid transparent;border-bottom:52px solid #ffda1a}.ikea-room-stage.is-plan .ikea-room-illustration{filter:grayscale(1);background:#e8ecee}.ikea-room-stage.is-plan .ikea-room-illustration span{background:transparent!important;border:2px dashed var(--blue);box-shadow:none}.ikea-room-stage.is-night .ikea-room-illustration{filter:saturate(.75) brightness(.62)}.ikea-hotspot{position:absolute;z-index:3;width:29px;height:29px;border:3px solid #fff;border-radius:50%;color:#fff;background:var(--blue);font-size:9px;font-weight:900;box-shadow:0 2px 12px #0004}.ikea-hotspot.active{color:#111;background:var(--yellow);transform:scale(1.12)}.spot-1{left:38%;top:57%}.spot-2{right:18%;bottom:25%}.spot-3{right:10%;top:27%}.ikea-room-caption{position:absolute;right:0;bottom:0;left:0;padding:11px 15px;display:flex;justify-content:space-between;color:#fff;background:#111c;font-size:8px}.ikea-room-story{padding:36px 28px;display:flex;flex-direction:column;justify-content:center}.ikea-room-story>p:first-child,.ikea-category-section>div>p,.ikea-home-products header p{margin:0;color:var(--blue);font-size:8px;font-weight:900;letter-spacing:.12em}.ikea-room-story h2{margin:12px 0 0;font-size:38px;line-height:1;letter-spacing:-.06em}.ikea-room-story>span{margin-top:16px;color:var(--muted);font-size:10px;line-height:1.7}.ikea-spot-card{margin-top:24px;padding:16px;border-top:1px solid #ccc;border-bottom:1px solid #ccc}.ikea-spot-card>*{display:block}.ikea-spot-card small{color:#777;font-size:7px}.ikea-spot-card strong{margin-top:7px;font-size:14px}.ikea-spot-card span{margin-top:4px;font-size:10px}.ikea-spot-card button{margin-top:12px;color:var(--blue);font-size:8px;font-weight:900}.ikea-place{margin:18px 0 0;color:#777;font-size:8px}.ikea-tone-switch{padding:10px 18px;display:flex;align-items:center;gap:6px;background:#fff;border-top:1px solid #ddd}.ikea-tone-switch>span{margin-right:auto;font-size:8px;font-weight:900}.ikea-tone-switch button{padding:8px 10px;border:1px solid #bbb;font-size:8px}.ikea-tone-switch button.active{color:#fff;background:var(--blue);box-shadow:inset 0 -3px var(--yellow)}.ikea-journeys{padding:14px 18px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.ikea-journeys>button{min-height:78px;padding:14px;display:grid;grid-template-columns:30px 1fr auto;align-items:center;text-align:left;background:#fff}.ikea-journeys>button>i:first-child{color:var(--blue);font-size:18px}.ikea-journeys b,.ikea-journeys small{display:block}.ikea-journeys b{font-size:10px}.ikea-journeys small{margin-top:4px;color:#777;font-size:8px}.ikea-category-section{padding:28px 18px;background:#fff}.ikea-category-section h2{margin:6px 0 18px;font-size:24px}.ikea-category-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.ikea-category-row button{min-height:104px;padding:14px;display:flex;flex-direction:column;align-items:flex-start;border:1px solid #ddd}.ikea-category-row button.active{color:#fff;background:var(--blue)}.ikea-category-row button.active i{color:var(--yellow)}.ikea-category-row i{color:var(--blue);font-size:22px}.ikea-category-row strong{margin-top:auto;font-size:10px}.ikea-category-row small{margin-top:3px;font-size:8px}.ikea-home-products{padding:32px 18px 70px;background:#fff}.ikea-home-products>header{display:flex;align-items:end;justify-content:space-between}.ikea-home-products h2{margin:5px 0 0;font-size:28px}.ikea-home-products header span,.ikea-home-products header button{font-size:8px;font-weight:900}.ikea-product-rail{margin-top:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.ikea-product-card{position:relative;min-width:0;border-bottom:1px solid #ccc}.ikea-product-media{width:100%;aspect-ratio:1;display:grid;place-items:center;overflow:hidden;background:#efefed}.ikea-product-media img{width:100%;height:100%;object-fit:cover}.ikea-product-media span{color:var(--blue);font-size:48px}.ikea-favorite{position:absolute;right:9px;top:9px;width:34px;height:34px;border-radius:50%;color:#777;background:#fff}.ikea-favorite.active{color:var(--blue)}.ikea-product-card>div{padding:13px 2px}.ikea-product-card>div>button{text-align:left}.ikea-product-card small{color:#777;font-size:7px;font-weight:900}.ikea-product-card h3{margin:5px 0 0;font-size:13px}.ikea-product-card p{min-height:32px;margin:7px 0;color:#666;font-size:8px;line-height:1.55}.ikea-product-card>div>span{font-size:8px}.ikea-product-card footer{margin-top:12px;display:flex;align-items:center;justify-content:space-between}.ikea-product-card footer strong{font-size:11px}.ikea-product-card footer button{width:34px;height:34px;border-radius:50%;color:#fff;background:var(--blue)}.ikea-empty{min-height:220px;display:grid;place-items:center;color:#777}.ikea-empty i{font-size:28px}.ikea-empty p{font-size:9px}@media(max-width:720px){.ikea-shellbar{padding:0 12px}.ikea-search{margin:0 12px 8px}.ikea-primary-nav{padding:0 12px 10px;justify-content:space-between;gap:8px}.ikea-room-hero{grid-template-columns:1fr}.ikea-room-media{min-height:360px}.ikea-room-story{padding:24px 18px}.ikea-room-story h2{font-size:32px}.ikea-journeys{padding:10px 12px;grid-template-columns:1fr}.ikea-category-section{padding:24px 12px}.ikea-category-row{grid-template-columns:repeat(2,1fr)}.ikea-home-products{padding:28px 12px 70px}.ikea-product-rail{grid-template-columns:repeat(2,1fr)}.ikea-tone-switch{padding:9px 12px;overflow:auto}.ikea-tone-switch>span{white-space:nowrap}.ikea-brand p{display:none}}
</style>
