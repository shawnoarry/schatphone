<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'

const props = defineProps({
  templateId: {
    type: String,
    required: true,
  },
  restaurant: {
    type: Object,
    required: true,
  },
  displayName: {
    type: String,
    default: '',
  },
  shortDescription: {
    type: String,
    default: '',
  },
  menuItems: {
    type: Array,
    default: () => [],
  },
  menuSections: {
    type: Array,
    default: () => [],
  },
  coverImageUrl: {
    type: String,
    default: '',
  },
  imageUrl: {
    type: Function,
    required: true,
  },
  cartQuantity: {
    type: Number,
    default: 0,
  },
  etaText: {
    type: String,
    default: '',
  },
  feeText: {
    type: String,
    default: '',
  },
  distanceText: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['go-home', 'open-item', 'add-item', 'open-cart'])
const { t } = useI18n()
const activeSectionKey = ref('')

const availableSections = computed(() =>
  props.menuSections.filter((section) => section?.key && section.key !== 'all'),
)

watch(
  () => [
    props.templateId,
    props.restaurant?.id,
    availableSections.value.map((section) => section.key).join('|'),
  ],
  () => {
    if (!availableSections.value.some((section) => section.key === activeSectionKey.value)) {
      activeSectionKey.value = availableSections.value[0]?.key || ''
    }
  },
  { immediate: true },
)

const activeSection = computed(
  () =>
    availableSections.value.find((section) => section.key === activeSectionKey.value) ||
    availableSections.value[0] ||
    null,
)

const visibleItems = computed(() => {
  const sectionKey = activeSection.value?.key
  if (!sectionKey) return []
  return props.menuItems.filter(
    (item) => (item.menuSection || 'signature') === sectionKey,
  )
})

const isCafe = computed(() => props.templateId === 'cafe_counter')
const isShelf = computed(() => props.templateId === 'convenience_shelf')
const isStall = computed(() => props.templateId === 'street_food_stall')
const rootClass = computed(() => ({
  'discovery-template--cafe': isCafe.value,
  'discovery-template--shelf': isShelf.value,
  'discovery-template--stall': isStall.value,
}))

const itemPrice = (item = {}) =>
  `${(Number(item.priceCents || 0) / 100).toFixed(2)} ${item.currency || props.restaurant.currency || 'CNY'}`

const handleImageError = (event) => {
  const image = event?.currentTarget
  if (!image || image.dataset.fallbackApplied === 'true') return
  image.dataset.fallbackApplied = 'true'
  image.parentElement?.classList.add('is-image-fallback')
  image.hidden = true
}
</script>

<template>
  <article
    class="discovery-template"
    :class="rootClass"
    data-testid="food-delivery-store-shell"
    :data-store-id="restaurant.id"
    :data-store-template="templateId"
  >
    <header class="discovery-header">
      <button
        type="button"
        class="discovery-icon-button"
        data-testid="food-delivery-store-home"
        :aria-label="t('返回主页', 'Back to Home')"
        :title="t('返回主页', 'Back to Home')"
        @click="emit('go-home')"
      >
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>

      <div class="discovery-brand">
        <div v-if="coverImageUrl" class="discovery-brand-image">
          <span class="discovery-image-fallback" aria-hidden="true">
            <span class="discovery-fallback-lines"></span>
            <i class="fas fa-store"></i>
          </span>
          <img
            :src="coverImageUrl"
            :alt="restaurant.image?.alt || displayName"
            :class="isCafe ? 'object-[68%_center]' : ''"
            @error="handleImageError"
          />
        </div>
        <div class="min-w-0">
          <p class="discovery-kicker">
            {{
              isCafe
                ? t('今日柜台', 'TODAY AT THE COUNTER')
                : isShelf
                  ? t('甜品陈列室', 'SWEET DISPLAY')
                  : t('沿街开摊', 'STREET KITCHEN')
            }}
          </p>
          <h1>{{ displayName }}</h1>
        </div>
      </div>

      <button
        type="button"
        class="discovery-icon-button discovery-cart-button"
        data-testid="food-delivery-store-cart-shortcut"
        :aria-label="t('打开购物袋', 'Open bag')"
        :title="t('打开购物袋', 'Open bag')"
        @click="emit('open-cart')"
      >
        <i :class="isShelf ? 'fas fa-basket-shopping' : 'fas fa-bag-shopping'" aria-hidden="true"></i>
        <span v-if="cartQuantity" class="discovery-cart-count">{{ cartQuantity }}</span>
      </button>
    </header>

    <template v-if="isCafe">
      <section class="cafe-counter-intro" data-testid="food-delivery-cafe-intro">
        <div class="cafe-intro-copy">
          <span>{{ t('沿途现烘', 'ROASTED FOR THE ROUTE') }}</span>
          <strong>{{ displayName }}</strong>
          <p>{{ shortDescription }}</p>
        </div>
        <div class="cafe-intro-scene">
          <span>{{ t('柜台 07', 'COUNTER 07') }}</span>
          <i class="fas fa-mug-hot" aria-hidden="true"></i>
          <img
            v-if="coverImageUrl"
            :src="coverImageUrl"
            :alt="restaurant.image?.alt || displayName"
            @error="handleImageError"
          />
        </div>
      </section>

      <section class="cafe-counter-status" aria-label="Store status">
        <div>
          <span class="cafe-status-dot"></span>
          <strong>{{ t('正在接单', 'OPEN NOW') }}</strong>
        </div>
        <p>{{ shortDescription }}</p>
        <span>{{ etaText }}</span>
      </section>

      <div class="cafe-counter-layout" data-testid="food-delivery-menu-panel">
        <nav
          class="cafe-counter-track"
          data-testid="food-delivery-store-menu-section-rail"
          :aria-label="t('柜台分区', 'Counter sections')"
        >
          <button
            v-for="(section, index) in availableSections"
            :key="section.key"
            type="button"
            :class="{ 'is-active': section.key === activeSectionKey }"
            :data-testid="`food-delivery-store-menu-section-${section.key}`"
            @click="activeSectionKey = section.key"
          >
            <span class="cafe-track-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <i :class="section.icon" aria-hidden="true"></i>
            <span>{{ section.shortLabel }}</span>
          </button>
        </nav>

        <main class="cafe-menu-board">
          <div class="cafe-menu-heading">
            <div>
              <span>{{ t('现做', 'MADE TO ORDER') }}</span>
              <h2>{{ activeSection?.label }}</h2>
            </div>
            <p>{{ visibleItems.length }} {{ t('款', 'picks') }}</p>
          </div>

          <div
            class="cafe-menu-list"
            data-testid="food-delivery-store-menu-items"
            :data-active-section="activeSection?.key"
          >
            <article
              v-for="item in visibleItems"
              :key="item.id"
              class="cafe-menu-row"
              :data-testid="`food-delivery-menu-${item.id}`"
              :data-menu-section="item.menuSection || 'signature'"
              :data-template="templateId"
            >
              <button
                type="button"
                class="cafe-item-image"
                :data-testid="`food-delivery-menu-open-${item.id}`"
                :aria-label="t('查看商品详情', 'View item details')"
                @click="emit('open-item', item.id)"
              >
                <span class="discovery-image-fallback" aria-hidden="true">
                  <span class="discovery-fallback-lines"></span>
                  <i class="fas fa-mug-hot"></i>
                </span>
                <img
                  v-if="imageUrl(item)"
                  :src="imageUrl(item)"
                  :alt="item.image?.alt || item.title"
                  @error="handleImageError"
                />
              </button>
              <button
                type="button"
                class="cafe-item-copy"
                :aria-label="t('查看商品详情', 'View item details')"
                @click="emit('open-item', item.id)"
              >
                <strong>{{ item.title }}</strong>
                <span>{{ item.desc }}</span>
                <b>{{ itemPrice(item) }}</b>
              </button>
              <button
                type="button"
                class="cafe-add-button"
                :data-testid="`food-delivery-add-${item.id}`"
                :aria-label="t('加入购物袋', 'Add to bag')"
                :title="t('加入购物袋', 'Add to bag')"
                @click="emit('add-item', item.id, 1, $event.currentTarget)"
              >
                <i class="fas fa-plus" aria-hidden="true"></i>
              </button>
            </article>
          </div>
        </main>
      </div>
    </template>

    <template v-else-if="isShelf">
      <section class="shelf-store-sign">
        <div>
          <span>{{ t('本日上架', 'FRESHLY STOCKED') }}</span>
          <strong>{{ activeSection?.label }}</strong>
        </div>
        <span class="shelf-sign-art" aria-hidden="true">
          <i class="fas fa-cake-candles"></i>
        </span>
        <dl>
          <div><dt>{{ t('送达', 'ETA') }}</dt><dd>{{ etaText }}</dd></div>
          <div><dt>{{ t('配送', 'FEE') }}</dt><dd>{{ feeText }}</dd></div>
        </dl>
      </section>

      <nav
        class="shelf-label-rail"
        data-testid="food-delivery-store-menu-section-rail"
        :aria-label="t('货架分区', 'Shelf sections')"
      >
        <button
          v-for="section in availableSections"
          :key="section.key"
          type="button"
          :class="{ 'is-active': section.key === activeSectionKey }"
          :data-testid="`food-delivery-store-menu-section-${section.key}`"
          @click="activeSectionKey = section.key"
        >
          <i :class="section.icon" aria-hidden="true"></i>
          <span>{{ section.shortLabel }}</span>
          <small>{{ section.count }}</small>
        </button>
      </nav>

      <main class="shelf-display" data-testid="food-delivery-menu-panel">
        <div class="shelf-display-heading">
          <p>{{ shortDescription }}</p>
          <span>{{ distanceText }}</span>
        </div>
        <div
          class="shelf-product-grid"
          data-testid="food-delivery-store-menu-items"
          :data-active-section="activeSection?.key"
        >
          <article
            v-for="(item, index) in visibleItems"
            :key="item.id"
            class="shelf-product"
            :data-testid="`food-delivery-menu-${item.id}`"
            :data-menu-section="item.menuSection || 'signature'"
            :data-template="templateId"
          >
            <button
              type="button"
              class="shelf-product-view"
              :data-testid="`food-delivery-menu-open-${item.id}`"
              :aria-label="t('查看商品详情', 'View item details')"
              @click="emit('open-item', item.id)"
            >
              <span class="shelf-product-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="shelf-product-image">
                <span class="discovery-image-fallback" aria-hidden="true">
                  <span class="discovery-fallback-lines"></span>
                  <i class="fas fa-cake-candles"></i>
                </span>
                <img
                  v-if="imageUrl(item)"
                  :src="imageUrl(item)"
                  :alt="item.image?.alt || item.title"
                  @error="handleImageError"
                />
              </span>
              <strong>{{ item.title }}</strong>
              <span class="shelf-product-desc">{{ item.desc }}</span>
            </button>
            <div class="shelf-price-tag">
              <b>{{ itemPrice(item) }}</b>
              <button
                type="button"
                :data-testid="`food-delivery-add-${item.id}`"
                :aria-label="t('加入购物袋', 'Add to bag')"
                :title="t('加入购物袋', 'Add to bag')"
                @click="emit('add-item', item.id, 1, $event.currentTarget)"
              >
                <i class="fas fa-plus" aria-hidden="true"></i>
              </button>
            </div>
          </article>
        </div>
      </main>
    </template>

    <template v-else-if="isStall">
      <section class="stall-service-strip">
        <span><i class="fas fa-fire-flame-curved" aria-hidden="true"></i>{{ t('现点现做', 'COOKED TO ORDER') }}</span>
        <span>{{ etaText }}</span>
        <span>{{ feeText }}</span>
      </section>

      <nav
        class="stall-route-rail"
        data-testid="food-delivery-store-menu-section-rail"
        :aria-label="t('摊档路线', 'Stall route')"
      >
        <button
          v-for="(section, index) in availableSections"
          :key="section.key"
          type="button"
          :class="{ 'is-active': section.key === activeSectionKey }"
          :data-testid="`food-delivery-store-menu-section-${section.key}`"
          @click="activeSectionKey = section.key"
        >
          <span>{{ index + 1 }}</span>
          <strong>{{ section.shortLabel }}</strong>
        </button>
      </nav>

      <main class="stall-route" data-testid="food-delivery-menu-panel">
        <div class="stall-route-title">
          <div>
            <span>{{ t('当前摊位', 'CURRENT STOP') }}</span>
            <h2>{{ activeSection?.label }}</h2>
          </div>
          <p>{{ shortDescription }}</p>
        </div>

        <div
          class="stall-route-items"
          data-testid="food-delivery-store-menu-items"
          :data-active-section="activeSection?.key"
        >
          <article
            v-for="(item, index) in visibleItems"
            :key="item.id"
            class="stall-route-item"
            :class="{ 'is-even': index % 2 === 1 }"
            :data-testid="`food-delivery-menu-${item.id}`"
            :data-menu-section="item.menuSection || 'signature'"
            :data-template="templateId"
          >
            <span class="stall-route-node"></span>
            <button
              type="button"
              class="stall-route-image"
              :data-testid="`food-delivery-menu-open-${item.id}`"
              :aria-label="t('查看商品详情', 'View item details')"
              @click="emit('open-item', item.id)"
            >
              <span class="discovery-image-fallback" aria-hidden="true">
                <span class="discovery-fallback-lines"></span>
                <i class="fas fa-bowl-food"></i>
              </span>
              <img
                v-if="imageUrl(item)"
                :src="imageUrl(item)"
                :alt="item.image?.alt || item.title"
                @error="handleImageError"
              />
            </button>
            <div class="stall-route-copy">
              <button type="button" @click="emit('open-item', item.id)">
                <strong>{{ item.title }}</strong>
                <span>{{ item.desc }}</span>
              </button>
              <div>
                <b>{{ itemPrice(item) }}</b>
                <button
                  type="button"
                  :data-testid="`food-delivery-add-${item.id}`"
                  :aria-label="t('加入购物袋', 'Add to bag')"
                  :title="t('加入购物袋', 'Add to bag')"
                  @click="emit('add-item', item.id, 1, $event.currentTarget)"
                >
                  <i class="fas fa-plus" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </article>
        </div>
      </main>
    </template>

    <footer v-if="cartQuantity === 0" class="discovery-order-strip">
      <span>{{ activeSection?.label || t('菜单', 'Menu') }}</span>
      <button
        type="button"
        :disabled="cartQuantity === 0"
        data-testid="food-delivery-discovery-cart-cta"
        @click="emit('open-cart')"
      >
        <span>{{ cartQuantity ? `${cartQuantity} ${t('件', 'items')}` : t('选择商品', 'Pick an item') }}</span>
        <strong>{{ t('配送', 'Delivery') }} {{ feeText }}</strong>
      </button>
    </footer>
  </article>
</template>

<style scoped>
.discovery-template {
  --ink: #201c1a;
  --muted: #716966;
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: var(--ink);
}

.discovery-header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
  align-items: center;
  gap: 0.625rem;
  min-height: 4.75rem;
  padding: 0.75rem 0.875rem;
  border-bottom: 1px solid color-mix(in srgb, var(--ink) 15%, transparent);
  backdrop-filter: blur(16px);
}

.discovery-icon-button {
  position: relative;
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--ink) 18%, transparent);
  border-radius: 0.375rem;
  background: color-mix(in srgb, white 84%, transparent);
  color: var(--ink);
}

.discovery-icon-button:active { transform: scale(0.96); }
.discovery-brand { display: flex; min-width: 0; align-items: center; gap: 0.625rem; }
.discovery-brand-image { position: relative; display: flex; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%; background: white; color: var(--muted); }
.discovery-brand-image img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: cover; }
.discovery-image-fallback { position: absolute; z-index: 1; inset: 0; display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; overflow: hidden; }
.discovery-image-fallback i { position: relative; z-index: 2; }
.discovery-fallback-lines { position: absolute; inset: 12%; border: 1px solid currentColor; opacity: 0.34; }
.discovery-fallback-lines::before,
.discovery-fallback-lines::after { content: ''; position: absolute; background: currentColor; opacity: 0.45; }
.discovery-fallback-lines::before { top: 50%; right: -12%; left: -12%; height: 1px; }
.discovery-fallback-lines::after { top: -12%; bottom: -12%; left: 50%; width: 1px; }
.discovery-kicker { margin: 0; overflow: hidden; color: var(--muted); font-size: 0.55rem; font-weight: 900; line-height: 1rem; text-overflow: ellipsis; white-space: nowrap; }
.discovery-brand h1 { margin: 0; overflow: hidden; font-size: 1rem; font-weight: 950; line-height: 1.25rem; text-overflow: ellipsis; white-space: nowrap; }
.discovery-cart-count { position: absolute; top: -0.3rem; right: -0.25rem; display: inline-flex; min-width: 1.15rem; height: 1.15rem; align-items: center; justify-content: center; border-radius: 999px; padding: 0 0.25rem; background: var(--ink); color: white; font-size: 0.6rem; font-weight: 900; }

.discovery-template--cafe { --ink: #2b211b; --muted: #71645d; background: #f3efe7; }
.discovery-template--cafe .discovery-header { background: rgba(243, 239, 231, 0.93); }
.discovery-template--cafe .discovery-brand-image,
.cafe-item-image { background-color: #e4d2bc; background-image: repeating-linear-gradient(90deg, transparent 0 0.55rem, rgba(142,61,45,0.08) 0.55rem 0.62rem); }
.cafe-counter-intro { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(7rem, 0.65fr); min-height: 9rem; border-bottom: 1px solid #bdb3a9; background: #26201d; color: #fff9f2; }
.cafe-intro-copy { display: flex; min-width: 0; flex-direction: column; justify-content: center; padding: 1.2rem 1rem; }
.cafe-intro-copy > span { color: #d38a6c; font-size: 0.55rem; font-weight: 950; letter-spacing: 0; }
.cafe-intro-copy > strong { margin-top: 0.25rem; overflow-wrap: anywhere; font-family: Georgia, 'Times New Roman', serif; font-size: 1.7rem; font-weight: 700; line-height: 1.8rem; }
.cafe-intro-copy > p { display: -webkit-box; overflow: hidden; margin: 0.55rem 0 0; color: #d6cdc6; font-size: 0.66rem; line-height: 0.95rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.cafe-intro-scene { position: relative; display: flex; min-width: 0; align-items: center; justify-content: center; overflow: hidden; border-left: 1px solid #5b4b43; background-color: #7f392c; background-image: repeating-linear-gradient(90deg, transparent 0 1.1rem, rgba(255,249,242,0.08) 1.1rem 1.2rem); color: #f5d3b4; }
.cafe-intro-scene > span { position: absolute; z-index: 2; top: 0.65rem; right: 0.65rem; font-size: 0.5rem; font-weight: 950; }
.cafe-intro-scene > i { position: relative; z-index: 1; font-size: 2.2rem; }
.cafe-intro-scene > img { position: absolute; z-index: 3; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cafe-counter-status { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-bottom: 1px solid #cfc5b9; background: #f9f6f0; font-size: 0.66rem; }
.cafe-counter-status div { display: flex; align-items: center; gap: 0.35rem; color: #8e3d2d; }
.cafe-status-dot { width: 0.45rem; height: 0.45rem; border-radius: 50%; background: #d6543c; box-shadow: 0 0 0 0.2rem #f0cec4; }
.cafe-counter-status p { margin: 0; overflow: hidden; color: #71645d; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.cafe-counter-status > span { color: #2b211b; font-weight: 900; }
.cafe-counter-layout { display: grid; grid-template-columns: 5.4rem minmax(0, 1fr); min-height: 36rem; }
.cafe-counter-track { border-right: 1px solid #bdb3a9; background: #ded7cc; }
.cafe-counter-track button { position: relative; display: flex; width: 100%; min-height: 5.75rem; flex-direction: column; align-items: flex-start; justify-content: center; gap: 0.35rem; padding: 0.75rem 0.65rem; border-bottom: 1px solid #bdb3a9; color: #71645d; text-align: left; font-size: 0.68rem; font-weight: 900; }
.cafe-counter-track button i { font-size: 0.9rem; }
.cafe-counter-track button.is-active { background: #8e3d2d; color: #fff9f2; }
.cafe-track-index { position: absolute; top: 0.4rem; right: 0.45rem; font-size: 0.52rem; opacity: 0.65; }
.cafe-menu-board { min-width: 0; padding: 1.15rem 0.875rem 6.5rem; }
.cafe-menu-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 0.75rem; padding-bottom: 0.8rem; border-bottom: 2px solid #2b211b; }
.cafe-menu-heading span { color: #8e3d2d; font-size: 0.55rem; font-weight: 950; }
.cafe-menu-heading h2 { margin: 0.15rem 0 0; font-size: 1.35rem; line-height: 1.55rem; }
.cafe-menu-heading p { margin: 0; color: #71645d; font-size: 0.65rem; font-weight: 800; }
.cafe-menu-list { display: grid; }
.cafe-menu-row { display: grid; grid-template-columns: 4.25rem minmax(0, 1fr) 2rem; align-items: center; gap: 0.7rem; min-height: 6.25rem; padding: 0.85rem 0; border-bottom: 1px solid #cfc5b9; }
.cafe-item-image { position: relative; display: flex; width: 4.25rem; height: 4.25rem; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #c7aa91; border-radius: 50%; color: #8e3d2d; }
.cafe-item-image.is-image-fallback .discovery-image-fallback { box-shadow: inset 0 0 0 0.3rem rgba(255,249,242,0.5); }
.cafe-item-image img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: cover; }
.cafe-item-copy { display: flex; min-width: 0; flex-direction: column; text-align: left; }
.cafe-item-copy strong { font-size: 0.78rem; line-height: 1.05rem; }
.cafe-item-copy span { display: -webkit-box; overflow: hidden; margin-top: 0.3rem; color: #71645d; font-size: 0.62rem; line-height: 0.9rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.cafe-item-copy b { margin-top: 0.4rem; color: #8e3d2d; font-size: 0.68rem; }
.cafe-add-button { display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; border-radius: 50%; background: #2b211b; color: #fff9f2; }

.discovery-template--shelf { --ink: #33302e; --muted: #746d68; background: #f6f1ed; }
.discovery-template--shelf .discovery-header { background: rgba(253, 249, 246, 0.94); }
.discovery-template--shelf .discovery-brand-image { border-radius: 0.25rem; border: 1px solid #d8c7bd; }
.discovery-template--shelf .discovery-brand-image { background-color: #ead5cd; background-image: repeating-linear-gradient(135deg, transparent 0 0.35rem, rgba(129,78,89,0.08) 0.35rem 0.42rem); }
.shelf-store-sign { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.8rem; overflow: hidden; padding: 1rem; border-bottom: 0.4rem solid #4d6871; background-color: #e5cdc4; background-image: repeating-linear-gradient(90deg, transparent 0 2.5rem, rgba(255,255,255,0.17) 2.5rem 2.58rem); }
.shelf-store-sign > div,
.shelf-store-sign > dl { position: relative; z-index: 2; }
.shelf-sign-art { position: absolute; z-index: 1; top: -1.6rem; left: 54%; display: flex; width: 6.5rem; height: 6.5rem; align-items: center; justify-content: center; border: 1px solid rgba(129,78,89,0.22); color: rgba(129,78,89,0.16); font-size: 2.8rem; transform: rotate(8deg); }
.shelf-store-sign > div > span { display: block; color: #814e59; font-size: 0.58rem; font-weight: 950; }
.shelf-store-sign > div > strong { display: block; margin-top: 0.2rem; font-size: 1.35rem; line-height: 1.5rem; }
.shelf-store-sign dl { display: grid; grid-template-columns: repeat(2, auto); gap: 0.4rem; margin: 0; }
.shelf-store-sign dl div { min-width: 3.6rem; padding-left: 0.5rem; border-left: 1px solid #b98e86; }
.shelf-store-sign dt { color: #814e59; font-size: 0.5rem; font-weight: 900; }
.shelf-store-sign dd { margin: 0.2rem 0 0; font-size: 0.62rem; font-weight: 900; }
.shelf-label-rail { display: flex; gap: 0.4rem; overflow-x: auto; padding: 0.75rem 1rem; border-bottom: 1px solid #d8c7bd; background: #fffaf7; scrollbar-width: none; }
.shelf-label-rail button { display: grid; grid-template-columns: 1rem auto auto; align-items: center; gap: 0.35rem; min-width: max-content; height: 2.5rem; padding: 0 0.65rem; border: 1px solid #d8c7bd; border-radius: 0.25rem; background: #fff; color: #746d68; font-size: 0.68rem; font-weight: 900; }
.shelf-label-rail button.is-active { border-color: #4d6871; background: #4d6871; color: white; }
.shelf-label-rail small { display: inline-flex; min-width: 1.15rem; justify-content: center; border-radius: 999px; background: rgba(255,255,255,0.55); color: #4d6871; font-size: 0.55rem; }
.shelf-display { padding: 0.85rem 1rem 7rem; }
.shelf-display-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; color: #746d68; font-size: 0.62rem; font-weight: 700; }
.shelf-display-heading p { margin: 0; }
.shelf-display-heading span { flex: 0 0 auto; color: #4d6871; font-weight: 900; }
.shelf-product-grid { position: relative; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.1rem 0.65rem; padding: 0.75rem 0.45rem 1.5rem; background-image: linear-gradient(to bottom, transparent calc(50% - 0.28rem), #d7c5b8 calc(50% - 0.28rem), #b99f8c 50%, transparent 50%), linear-gradient(to bottom, transparent calc(100% - 0.3rem), #d7c5b8 calc(100% - 0.3rem), #b99f8c 100%); }
.shelf-product { position: relative; min-width: 0; padding: 0.55rem 0.55rem 0; border: 1px solid #e1d2c8; border-radius: 0.25rem; background: rgba(255,255,255,0.82); box-shadow: 0 0.5rem 1rem rgba(83,58,45,0.07); }
.shelf-product-view { display: flex; width: 100%; min-width: 0; flex-direction: column; align-items: stretch; text-align: left; }
.shelf-product-number { align-self: flex-start; color: #9b6e75; font-size: 0.52rem; font-weight: 950; }
.shelf-product-image { position: relative; display: flex; width: 100%; aspect-ratio: 4 / 3; align-items: center; justify-content: center; overflow: hidden; background-color: #fffaf7; color: #9b6e75; font-size: 1.5rem; }
.shelf-product-image.is-image-fallback { background-image: repeating-linear-gradient(135deg, transparent 0 1rem, rgba(155,110,117,0.06) 1rem 1.08rem); }
.shelf-product-image.is-image-fallback .discovery-fallback-lines { inset: 16%; }
.shelf-product-image img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: contain; }
.shelf-product-view strong { display: -webkit-box; overflow: hidden; min-height: 2rem; font-size: 0.72rem; line-height: 1rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.shelf-product-desc { display: -webkit-box; overflow: hidden; min-height: 1.8rem; margin-top: 0.25rem; color: #746d68; font-size: 0.58rem; line-height: 0.85rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.shelf-price-tag { display: flex; min-height: 2.5rem; align-items: center; justify-content: space-between; gap: 0.35rem; margin: 0.55rem -0.55rem 0; padding: 0.4rem 0.5rem; border-top: 1px dashed #bfa69b; background: #f5e6dc; }
.shelf-price-tag b { font-size: 0.62rem; }
.shelf-price-tag button { display: inline-flex; width: 1.8rem; height: 1.8rem; align-items: center; justify-content: center; border-radius: 0.25rem; background: #814e59; color: white; }

.discovery-template--stall { --ink: #1d2928; --muted: #5c6d69; background: #eef0e6; }
.discovery-template--stall::before { content: ''; display: block; height: 0.65rem; background: repeating-linear-gradient(90deg, #cc3f2d 0 2.25rem, #f6dfaa 2.25rem 4.5rem); }
.discovery-template--stall .discovery-header { top: 0.65rem; background: rgba(238, 240, 230, 0.94); }
.discovery-template--stall .discovery-brand-image { border: 2px solid #cc3f2d; border-radius: 0.25rem; background-color: #f7e6ba; background-image: repeating-linear-gradient(0deg, transparent 0 0.4rem, rgba(163,47,36,0.08) 0.4rem 0.46rem); }
.stall-service-strip { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.65rem 1rem; border-top: 1px solid #b9c3b4; border-bottom: 1px solid #b9c3b4; background: #f7e6ba; color: #485853; font-size: 0.6rem; font-weight: 900; }
.stall-service-strip span { display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap; }
.stall-service-strip span:first-child { color: #a32f24; }
.stall-route-rail { display: flex; gap: 0.5rem; overflow-x: auto; padding: 0.85rem 1rem; scrollbar-width: none; }
.stall-route-rail button { display: inline-flex; min-width: max-content; height: 2.5rem; align-items: center; gap: 0.4rem; padding: 0 0.75rem 0 0.35rem; border: 1px solid #9da99d; border-radius: 999px; background: #f7f4e8; color: #5c6d69; font-size: 0.68rem; }
.stall-route-rail button > span { display: inline-flex; width: 1.75rem; height: 1.75rem; align-items: center; justify-content: center; border-radius: 50%; background: #c5cec0; color: #1d2928; font-size: 0.6rem; font-weight: 950; }
.stall-route-rail button.is-active { border-color: #cc3f2d; background: #cc3f2d; color: white; }
.stall-route-rail button.is-active > span { background: #f7e6ba; color: #a32f24; }
.stall-route { padding: 0 1rem 7rem; }
.stall-route-title { display: grid; grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr); align-items: end; gap: 1rem; padding: 0.9rem 0; border-top: 2px solid #1d2928; border-bottom: 1px solid #9da99d; }
.stall-route-title span { color: #cc3f2d; font-size: 0.55rem; font-weight: 950; }
.stall-route-title h2 { margin: 0.15rem 0 0; font-size: 1.3rem; line-height: 1.5rem; }
.stall-route-title p { margin: 0; color: #5c6d69; font-size: 0.65rem; font-weight: 700; line-height: 1rem; }
.stall-route-items { position: relative; padding: 1rem 0; }
.stall-route-items::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; transform: translateX(-50%); background: #819087; }
.stall-route-item { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 1.5rem minmax(0, 1fr); align-items: center; min-height: 9rem; }
.stall-route-item .stall-route-image { grid-column: 1; }
.stall-route-item .stall-route-node { grid-column: 2; }
.stall-route-item .stall-route-copy { grid-column: 3; }
.stall-route-item.is-even .stall-route-image { grid-column: 3; }
.stall-route-item.is-even .stall-route-copy { grid-column: 1; grid-row: 1; text-align: right; }
.stall-route-item.is-even .stall-route-copy > div { justify-content: flex-end; }
.stall-route-node { position: relative; z-index: 2; display: block; width: 0.85rem; height: 0.85rem; justify-self: center; border: 3px solid #eef0e6; border-radius: 50%; background: #cc3f2d; box-shadow: 0 0 0 2px #cc3f2d; }
.stall-route-image { position: relative; display: flex; width: 100%; aspect-ratio: 1; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #9da99d; border-radius: 0.375rem; background: #f7f4e8; color: #cc3f2d; font-size: 1.5rem; transform: rotate(-2deg); box-shadow: 0.4rem 0.4rem 0 #d9dfd3; }
.stall-route-image.is-image-fallback { background-color: #f7f1df; background-image: repeating-linear-gradient(45deg, transparent 0 1.1rem, rgba(72,88,83,0.055) 1.1rem 1.18rem); }
.stall-route-image.is-image-fallback .discovery-fallback-lines { inset: 14%; border-width: 2px; border-color: #cc3f2d; }
.stall-route-item.is-even .stall-route-image { transform: rotate(2deg); box-shadow: -0.4rem 0.4rem 0 #d9dfd3; }
.stall-route-image img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: cover; }
.stall-route-copy { min-width: 0; }
.stall-route-copy > button { display: block; width: 100%; text-align: inherit; }
.stall-route-copy strong { display: -webkit-box; overflow: hidden; font-size: 0.75rem; line-height: 1.05rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.stall-route-copy span { display: -webkit-box; overflow: hidden; margin-top: 0.35rem; color: #5c6d69; font-size: 0.58rem; line-height: 0.85rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.stall-route-copy > div { display: flex; align-items: center; gap: 0.45rem; margin-top: 0.55rem; }
.stall-route-copy b { color: #a32f24; font-size: 0.62rem; }
.stall-route-copy > div button { display: inline-flex; width: 1.75rem; height: 1.75rem; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: #1d2928; color: #f7e6ba; }

.discovery-order-strip { position: fixed; z-index: 35; right: max(1rem, calc((100vw - 28rem) / 2 + 1rem)); bottom: 1rem; left: max(1rem, calc((100vw - 28rem) / 2 + 1rem)); display: flex; max-width: 26rem; align-items: center; justify-content: space-between; gap: 0.75rem; margin: 0 auto; padding: 0.55rem 0.65rem 0.55rem 0.85rem; border: 1px solid rgba(255,255,255,0.18); border-radius: 0.5rem; background: #201c1a; color: white; box-shadow: 0 1rem 2rem rgba(29,24,21,0.22); }
.discovery-order-strip > span { min-width: 0; overflow: hidden; font-size: 0.65rem; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.discovery-order-strip button { display: flex; min-width: 8.6rem; min-height: 2.65rem; flex-direction: column; align-items: flex-end; justify-content: center; border-radius: 0.375rem; padding: 0.35rem 0.7rem; background: #f4d59d; color: #2b211b; }
.discovery-order-strip button:disabled { background: #5c5652; color: #dad5d1; }
.discovery-order-strip button span { font-size: 0.55rem; font-weight: 800; }
.discovery-order-strip button strong { font-size: 0.68rem; }

@media (max-width: 360px) {
  .discovery-header { grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem; padding-inline: 0.625rem; }
  .discovery-icon-button { width: 2.5rem; height: 2.5rem; }
  .discovery-brand-image { display: none; }
  .cafe-counter-layout { grid-template-columns: 4.8rem minmax(0, 1fr); }
  .cafe-menu-row { grid-template-columns: 3.5rem minmax(0, 1fr) 1.9rem; gap: 0.5rem; }
  .cafe-item-image { width: 3.5rem; height: 3.5rem; }
  .cafe-counter-intro { grid-template-columns: minmax(0, 1fr) 6.5rem; }
  .cafe-intro-copy > strong { font-size: 1.4rem; line-height: 1.55rem; }
  .shelf-store-sign { grid-template-columns: 1fr; }
  .shelf-store-sign dl { justify-self: start; }
  .stall-route-title { grid-template-columns: 1fr; }
  .stall-route-copy span { display: none; }
}
</style>
