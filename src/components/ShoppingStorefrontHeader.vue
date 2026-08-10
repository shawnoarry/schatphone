<script setup>
import { computed } from 'vue'

const props = defineProps({
  activeService: { type: Object, default: null },
  activeCategory: { type: Object, default: null },
  activeLabel: { type: String, default: 'Shopping' },
  activeDescription: { type: String, default: '' },
  categoryCards: { type: Array, default: () => [] },
  coverImageUrl: { type: String, default: '' },
  brandAssetUrl: { type: String, default: '' },
  mapReference: { type: Object, default: null },
  languageBase: { type: String, default: 'zh' },
  searchQuery: { type: String, default: '' },
  favoriteCount: { type: Number, default: 0 },
  cartQuantity: { type: Number, default: 0 },
  orderCount: { type: Number, default: 0 },
})

const emit = defineEmits([
  'go-home',
  'select-category',
  'open-favorites',
  'open-cart',
  'open-orders',
  'open-manager',
  'update:searchQuery',
])

const isZh = computed(() => props.languageBase === 'zh')
const storefrontTemplate = computed(() => props.activeService?.storefrontTemplate || 'shopping_hub')
const activeKindLabel = computed(() => {
  if (props.activeService?.storefrontKind === 'specialty') {
    return isZh.value ? '专门店' : 'SPECIALTY STORE'
  }
  return isZh.value ? '购物平台' : 'MARKETPLACE'
})
const heroEyebrow = computed(() => {
  return isZh.value
    ? props.activeService.eyebrowZh || activeKindLabel.value
    : props.activeService.eyebrowEn || activeKindLabel.value
})
const heroTitle = computed(() => {
  return isZh.value
    ? props.activeService.heroZh || props.activeLabel
    : props.activeService.heroEn || props.activeLabel
})
const localize = (zh, en) => (isZh.value ? zh : en)
</script>

<template>
  <header
    class="shopping-storefront-header"
    :data-storefront="storefrontTemplate"
    :data-storefront-kind="activeService?.storefrontKind || 'hub'"
  >
    <div class="shopping-storefront-topbar">
      <button
        type="button"
        class="shopping-icon-button"
        :aria-label="localize('返回主屏幕', 'Back to Home')"
        :title="localize('返回主屏幕', 'Back to Home')"
        @click="emit('go-home')"
      >
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>

      <div class="shopping-storefront-identity">
        <span class="shopping-storefront-mark" aria-hidden="true">
          <img v-if="brandAssetUrl" :src="brandAssetUrl" alt="" />
          <template v-else>{{ activeService?.mark || 'S' }}</template>
        </span>
        <div>
          <h1>{{ activeLabel }}</h1>
          <p>{{ activeKindLabel }}</p>
        </div>
      </div>

      <div class="shopping-storefront-actions">
        <button
          type="button"
          class="shopping-icon-button"
          :aria-label="localize('收藏', 'Favorites')"
          :title="localize('收藏', 'Favorites')"
          @click="emit('open-favorites')"
        >
          <i class="fas fa-heart" aria-hidden="true"></i>
          <span v-if="favoriteCount" class="shopping-action-count">{{ favoriteCount }}</span>
        </button>
        <button
          type="button"
          class="shopping-icon-button"
          :aria-label="localize('购物车', 'Cart')"
          :title="localize('购物车', 'Cart')"
          @click="emit('open-cart')"
        >
          <i class="fas fa-bag-shopping" aria-hidden="true"></i>
          <span v-if="cartQuantity" class="shopping-action-count">{{ cartQuantity }}</span>
        </button>
        <button
          type="button"
          class="shopping-icon-button shopping-manager-button"
          :aria-label="localize('管理商品', 'Manage catalog')"
          :title="localize('管理商品', 'Manage catalog')"
          @click="emit('open-manager')"
        >
          <i class="fas fa-sliders" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <div class="shopping-brand-hero">
      <div class="shopping-brand-copy">
        <p class="shopping-brand-eyebrow">{{ heroEyebrow }}</p>
        <h2>{{ heroTitle }}</h2>
        <p class="shopping-brand-description">{{ activeDescription }}</p>
        <p
          v-if="mapReference?.placeId"
          class="shopping-map-reference"
          data-testid="shopping-map-reference"
          :data-map-place-id="mapReference.placeId"
        >
          <i class="fas fa-location-dot" aria-hidden="true"></i>
          <span>{{ localize('首尔场景锚点', 'SEOUL SETTING') }}</span>
          <strong>{{ mapReference.district }}</strong>
        </p>
      </div>

      <div class="shopping-brand-stage" aria-hidden="true">
        <img v-if="coverImageUrl" :src="coverImageUrl" :alt="`${activeLabel} cover`" />
        <template v-else>
          <div class="shopping-stage-primary">
            <i :class="activeService.icon" aria-hidden="true"></i>
          </div>
          <div class="shopping-stage-secondary">{{ activeService.mark }}</div>
          <div class="shopping-stage-caption">
            {{ activeCategory?.label || activeKindLabel }}
          </div>
        </template>
      </div>
    </div>

    <div class="shopping-search-row">
      <label class="shopping-search-field">
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
        <span class="sr-only">{{ localize('搜索商品', 'Search products') }}</span>
        <input
          :value="searchQuery"
          type="search"
          :placeholder="localize(`在 ${activeLabel} 搜索`, `Search ${activeLabel}`)"
          @input="emit('update:searchQuery', $event.target.value)"
        />
      </label>
      <button type="button" class="shopping-orders-button" @click="emit('open-orders')">
        <i class="fas fa-receipt" aria-hidden="true"></i>
        <span>{{ localize('订单', 'Orders') }}</span>
        <strong>{{ orderCount }}</strong>
      </button>
    </div>

    <nav class="shopping-category-rail" :aria-label="localize('商品分类', 'Product categories')">
      <button
        v-for="category in categoryCards"
        :key="category.key"
        type="button"
        class="shopping-category-chip"
        :class="{ 'is-active border-orange-300': category.active }"
        :data-testid="`shopping-category-${category.key}`"
        @click="emit('select-category', category.key)"
      >
        <i :class="category.icon" aria-hidden="true"></i>
        <span>{{ category.label }}</span>
        <small>{{ category.count }}</small>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.shopping-storefront-header {
  --store-bg: #f5f6f7;
  --store-surface: #ffffff;
  --store-ink: #1e2329;
  --store-muted: #66707a;
  --store-accent: #e52a2f;
  --store-accent-2: #00a4e4;
  --store-line: rgba(30, 35, 41, 0.14);
  position: relative;
  overflow: hidden;
  color: var(--store-ink);
  background: var(--store-bg);
}

.shopping-storefront-header[data-storefront='tech_catalog'] {
  --store-bg: #f7f7f7;
  --store-surface: #ffffff;
  --store-ink: #050505;
  --store-muted: #686868;
  --store-accent: #ff4800;
  --store-accent-2: #111111;
  --store-line: rgba(0, 0, 0, 0.16);
}

.shopping-storefront-header[data-storefront='fresh_market'] {
  --store-bg: #f7f3f8;
  --store-surface: #ffffff;
  --store-ink: #32113f;
  --store-muted: #74657a;
  --store-accent: #5f0080;
  --store-accent-2: #b5d948;
  --store-line: rgba(95, 0, 128, 0.16);
}

.shopping-storefront-header[data-storefront='fashion_editorial'] {
  --store-bg: #171a20;
  --store-surface: #22262e;
  --store-ink: #f8f8f5;
  --store-muted: #b4bac4;
  --store-accent: #ffda05;
  --store-accent-2: #e63838;
  --store-line: rgba(255, 255, 255, 0.18);
}

.shopping-storefront-header[data-storefront='room_planner'] {
  --store-bg: #f5f5f5;
  --store-surface: #ffffff;
  --store-ink: #111111;
  --store-muted: #5d5d5d;
  --store-accent: #0058a3;
  --store-accent-2: #ffda1a;
  --store-line: rgba(0, 88, 163, 0.2);
}

.shopping-storefront-header[data-storefront='care_lab'] {
  --store-bg: #f4f7ee;
  --store-surface: #ffffff;
  --store-ink: #26311f;
  --store-muted: #66705f;
  --store-accent: #6d961d;
  --store-accent-2: #f58220;
  --store-line: rgba(109, 150, 29, 0.18);
}

.shopping-storefront-topbar {
  min-height: 76px;
  padding: max(40px, env(safe-area-inset-top)) 16px 10px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--store-line);
}

.shopping-icon-button {
  position: relative;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--store-line);
  border-radius: 50%;
  color: var(--store-ink);
  background: var(--store-surface);
}

.shopping-icon-button:focus-visible,
.shopping-service-card:focus-visible,
.shopping-app-rail-item:focus-visible,
.shopping-category-chip:focus-visible,
.shopping-orders-button:focus-visible {
  outline: 3px solid var(--store-accent-2);
  outline-offset: 2px;
}

.shopping-storefront-identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
}

.shopping-storefront-mark {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--store-bg);
  background: var(--store-ink);
  font-size: 12px;
  font-weight: 900;
}

.shopping-storefront-mark img,
.shopping-service-mark img {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: inherit;
  object-fit: cover;
}

.shopping-storefront-identity h1 {
  overflow: hidden;
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 17px;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0;
}

.shopping-storefront-identity p {
  margin: 3px 0 0;
  color: var(--store-muted);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.shopping-storefront-actions {
  display: flex;
  gap: 6px;
}

.shopping-storefront-actions .shopping-icon-button {
  width: 36px;
  height: 36px;
}

.shopping-action-count {
  position: absolute;
  top: -4px;
  right: -3px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--store-bg);
  border-radius: 9px;
  color: #ffffff;
  background: var(--store-accent);
  font-size: 9px;
  font-weight: 900;
}

.shopping-brand-hero {
  min-height: 252px;
  padding: 24px 18px 20px;
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(118px, 0.7fr);
  gap: 16px;
  align-items: stretch;
  border-bottom: 1px solid var(--store-line);
}

.shopping-brand-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.shopping-brand-eyebrow {
  margin: 0 0 10px;
  color: var(--store-accent);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0;
}

.shopping-brand-copy h2,
.shopping-hub-hero h2 {
  max-width: 13ch;
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 33px;
  line-height: 1.06;
  letter-spacing: 0;
}

.shopping-brand-description {
  max-width: 32ch;
  margin: 16px 0 0;
  color: var(--store-muted);
  font-size: 11px;
  line-height: 1.65;
}

.shopping-map-reference {
  width: fit-content;
  max-width: 100%;
  margin: 16px 0 0;
  padding-top: 10px;
  display: grid;
  grid-template-columns: 12px minmax(0, auto);
  gap: 2px 7px;
  border-top: 1px solid var(--store-line);
  color: var(--store-muted);
}

.shopping-map-reference i {
  grid-row: 1 / span 2;
  align-self: center;
  color: var(--store-accent);
  font-size: 11px;
}

.shopping-map-reference span {
  font-size: 8px;
  font-weight: 900;
  text-transform: uppercase;
}

.shopping-map-reference strong {
  overflow-wrap: anywhere;
  color: var(--store-ink);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 12px;
  font-weight: 700;
}

.shopping-brand-stage {
  position: relative;
  min-height: 204px;
  overflow: hidden;
  border: 1px solid var(--store-line);
  border-radius: 6px;
  background: var(--store-surface);
}

.shopping-brand-stage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shopping-stage-primary {
  position: absolute;
  top: 16px;
  right: 14px;
  width: 74px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--store-bg);
  background: var(--store-ink);
  font-size: 30px;
  transform: rotate(3deg);
}

.shopping-stage-secondary {
  position: absolute;
  left: 12px;
  bottom: 34px;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--store-ink);
  background: var(--store-accent-2);
  font-size: 20px;
  font-weight: 900;
}

.shopping-stage-caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  min-height: 26px;
  padding: 7px 9px;
  border-top: 1px solid var(--store-line);
  color: var(--store-muted);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

[data-storefront='tech_catalog'] .shopping-stage-primary {
  border: 1px solid var(--store-accent);
  color: var(--store-accent);
  background: transparent;
  transform: none;
}

[data-storefront='tech_catalog'] .shopping-stage-secondary {
  color: #ffffff;
}

[data-storefront='fashion_editorial'] .shopping-brand-hero {
  grid-template-columns: minmax(0, 0.9fr) minmax(148px, 1.1fr);
}

[data-storefront='fashion_editorial'] .shopping-brand-copy h2 {
  font-size: 36px;
  text-transform: uppercase;
}

[data-storefront='fashion_editorial'] .shopping-stage-primary {
  top: 0;
  right: 0;
  width: 66%;
  height: 100%;
  border-radius: 0;
  color: var(--store-accent);
  background: #0f1116;
  transform: none;
}

[data-storefront='room_planner'] .shopping-stage-primary {
  top: 22px;
  right: 12px;
  width: 92px;
  height: 74px;
  color: var(--store-ink);
  background: var(--store-accent-2);
  transform: none;
}

[data-storefront='room_planner'] .shopping-stage-secondary {
  border-radius: 3px;
  color: #ffffff;
  background: var(--store-accent);
}

[data-storefront='care_lab'] .shopping-stage-primary {
  top: 20px;
  right: 24px;
  width: 52px;
  height: 120px;
  border-radius: 26px 26px 6px 6px;
  color: var(--store-ink);
  background: var(--store-accent-2);
  transform: none;
}

[data-storefront='care_lab'] .shopping-stage-secondary {
  width: 64px;
  height: 92px;
  border-radius: 6px 6px 30px 30px;
  color: #ffffff;
  background: var(--store-accent);
}

.shopping-hub-hero {
  padding: 32px 18px 24px;
  border-bottom: 1px solid var(--store-line);
}

.shopping-hub-hero h2 {
  max-width: 12ch;
  font-size: 36px;
}

.shopping-hub-hero > p:last-child {
  max-width: 42ch;
  margin: 14px 0 0;
  color: var(--store-muted);
  font-size: 12px;
  line-height: 1.7;
}

.shopping-service-switcher {
  padding: 16px;
  border-bottom: 1px solid var(--store-line);
}

.shopping-service-group + .shopping-service-group {
  margin-top: 22px;
}

.shopping-service-group-heading {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shopping-service-group-heading p,
.shopping-service-group-heading span {
  margin: 0;
  color: var(--store-muted);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.shopping-service-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.shopping-service-card {
  min-width: 0;
  min-height: 148px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 1px solid var(--store-line);
  border-radius: 6px;
  color: var(--store-ink);
  text-align: left;
  background: var(--store-surface);
}

.shopping-service-card > i {
  margin-top: auto;
  align-self: flex-end;
  color: var(--store-muted);
  font-size: 11px;
}

.shopping-service-mark {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #ffffff;
  background: #202020;
  font-size: 11px;
  font-weight: 900;
}

[data-template='city_market'] .shopping-service-mark {
  background: #e52a2f;
}

[data-template='tech_catalog'] .shopping-service-mark {
  color: #ffffff;
  background: #050505;
}

[data-template='fresh_market'] .shopping-service-mark {
  background: #5f0080;
}

[data-template='fashion_editorial'] .shopping-service-mark {
  color: #ffda05;
  background: #171a20;
}

[data-template='room_planner'] .shopping-service-mark {
  background: #0058a3;
}

[data-template='care_lab'] .shopping-service-mark {
  background: #6d961d;
}

.shopping-service-card-copy {
  min-width: 0;
  margin-top: 12px;
}

.shopping-service-card-copy strong {
  display: block;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 13px;
  line-height: 1.15;
}

.shopping-service-card-copy small {
  margin-top: 6px;
  display: -webkit-box;
  overflow: hidden;
  color: var(--store-muted);
  font-size: 9px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.shopping-app-rail,
.shopping-category-rail {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--store-accent) transparent;
}

.shopping-app-rail-item {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--store-line);
  border-radius: 6px;
  color: var(--store-muted);
  background: var(--store-surface);
  font-size: 10px;
  font-weight: 900;
}

.shopping-app-rail-item.is-active {
  color: var(--store-bg);
  border-color: var(--store-ink);
  background: var(--store-ink);
}

.shopping-app-rail-item img {
  width: 30px;
  height: 30px;
  border-radius: 5px;
  object-fit: cover;
}

.shopping-search-row {
  padding: 0 16px 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.shopping-search-field {
  min-height: 44px;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--store-line);
  border-radius: 6px;
  background: var(--store-surface);
}

.shopping-search-field input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--store-ink);
  background: transparent;
  font-size: 12px;
}

.shopping-search-field input::placeholder {
  color: var(--store-muted);
}

.shopping-orders-button {
  min-height: 44px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--store-line);
  border-radius: 6px;
  color: var(--store-bg);
  background: var(--store-ink);
  font-size: 11px;
  font-weight: 800;
}

.shopping-orders-button strong {
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: var(--store-ink);
  background: var(--store-accent-2);
  font-size: 9px;
}

.shopping-category-rail {
  padding: 0 16px 18px;
}

.shopping-category-chip {
  min-width: max-content;
  height: 40px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--store-line);
  border-radius: 5px;
  color: var(--store-muted);
  background: transparent;
  font-size: 11px;
  font-weight: 800;
}

.shopping-category-chip small {
  color: inherit;
  opacity: 0.72;
}

.shopping-category-chip.is-active {
  color: var(--store-bg);
  border-color: var(--store-ink);
  background: var(--store-ink);
}

@media (max-width: 370px) {
  .shopping-manager-button {
    display: none;
  }

  .shopping-brand-hero {
    grid-template-columns: minmax(0, 1fr) 112px;
  }

  .shopping-brand-copy h2,
  .shopping-hub-hero h2 {
    font-size: 29px;
  }

  .shopping-service-grid {
    grid-template-columns: 1fr;
  }

  .shopping-service-card {
    min-height: 92px;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) 16px;
    gap: 10px;
  }

  .shopping-service-card-copy {
    margin-top: 0;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .shopping-brand-copy,
  .shopping-brand-stage {
    animation: storefront-enter 360ms ease-out both;
  }

  .shopping-brand-stage {
    animation-delay: 70ms;
  }
}

@keyframes storefront-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
