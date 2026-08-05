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
  return props.menuItems.filter((item) => (item.menuSection || 'signature') === sectionKey)
})

const isJournal = computed(() => props.templateId === 'daypart_journal')
const leadItem = computed(() => visibleItems.value[0] || null)
const supportingItems = computed(() => visibleItems.value.slice(1))
const daypartTimes = ['07:30', '10:30', '13:00', '16:00']

const itemPrice = (item = {}) =>
  `${(Number(item.priceCents || 0) / 100).toFixed(2)} ${item.currency || props.restaurant.currency || 'CNY'}`

const handleImageError = (event) => {
  const image = event?.currentTarget
  if (!image || image.dataset.fallbackApplied === 'true') return
  image.dataset.fallbackApplied = 'true'
  image.hidden = true
}
</script>

<template>
  <article
    class="editorial-template"
    :class="isJournal ? 'editorial-template--journal' : 'editorial-template--mosaic'"
    data-testid="food-delivery-store-shell"
    :data-store-id="restaurant.id"
    :data-store-template="templateId"
  >
    <header class="editorial-utility">
      <button
        type="button"
        class="editorial-icon-button"
        data-testid="food-delivery-store-home"
        :aria-label="t('返回主页', 'Back to Home')"
        :title="t('返回主页', 'Back to Home')"
        @click="emit('go-home')"
      >
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>

      <div class="editorial-utility-title">
        <span>{{ isJournal ? t('今日手帐', 'DAILY EDITION') : t('菜单图谱', 'MENU ATLAS') }}</span>
        <strong>{{ displayName }}</strong>
      </div>

      <button
        type="button"
        class="editorial-icon-button editorial-cart-button"
        data-testid="food-delivery-store-cart-shortcut"
        :aria-label="t('打开购物袋', 'Open bag')"
        :title="t('打开购物袋', 'Open bag')"
        @click="emit('open-cart')"
      >
        <i class="fas fa-bag-shopping" aria-hidden="true"></i>
        <span v-if="cartQuantity">{{ cartQuantity }}</span>
      </button>
    </header>

    <template v-if="isJournal">
      <section class="journal-masthead">
        <div class="journal-masthead-copy">
          <span>{{ t('从晨光到午后', 'FROM FIRST LIGHT') }}</span>
          <h1>{{ displayName }}</h1>
          <p>{{ shortDescription }}</p>
        </div>
        <div class="journal-cover" aria-hidden="true">
          <i class="fas fa-sun editorial-image-fallback"></i>
          <img
            v-if="coverImageUrl"
            :src="coverImageUrl"
            :alt="restaurant.image?.alt || displayName"
            @error="handleImageError"
          />
          <b>{{ t('今日', 'TODAY') }}</b>
        </div>
      </section>

      <section class="journal-service-line" :aria-label="t('配送信息', 'Delivery details')">
        <span><i class="fas fa-clock" aria-hidden="true"></i>{{ etaText }}</span>
        <span>{{ distanceText }}</span>
        <span>{{ t('配送', 'Delivery') }} {{ feeText }}</span>
      </section>

      <nav
        class="journal-dayparts"
        data-testid="food-delivery-store-menu-section-rail"
        :aria-label="t('时段菜单', 'Daypart menu')"
      >
        <button
          v-for="(section, index) in availableSections"
          :key="section.key"
          type="button"
          :class="{ 'is-active': section.key === activeSectionKey }"
          :data-testid="`food-delivery-store-menu-section-${section.key}`"
          @click="activeSectionKey = section.key"
        >
          <span>{{ daypartTimes[index] || `${index + 7}:00` }}</span>
          <i :class="section.icon" aria-hidden="true"></i>
          <strong>{{ section.shortLabel }}</strong>
          <small>{{ section.count }}</small>
        </button>
      </nav>

      <main class="journal-spread" data-testid="food-delivery-menu-panel">
        <div class="journal-section-heading">
          <div>
            <span>{{ t('本时段推荐', 'NOW SERVING') }}</span>
            <h2>{{ activeSection?.label }}</h2>
          </div>
          <b>{{ visibleItems.length }}</b>
        </div>

        <div
          class="journal-menu"
          data-testid="food-delivery-store-menu-items"
          :data-active-section="activeSection?.key"
        >
          <article
            v-if="leadItem"
            class="journal-lead"
            :data-testid="`food-delivery-menu-${leadItem.id}`"
            :data-menu-section="leadItem.menuSection || 'signature'"
            :data-template="templateId"
          >
            <button
              type="button"
              class="journal-lead-image"
              :data-testid="`food-delivery-menu-open-${leadItem.id}`"
              :aria-label="t('查看商品详情', 'View item details')"
              @click="emit('open-item', leadItem.id)"
            >
              <i class="fas fa-utensils editorial-image-fallback" aria-hidden="true"></i>
              <img
                v-if="imageUrl(leadItem)"
                :src="imageUrl(leadItem)"
                :alt="leadItem.image?.alt || leadItem.title"
                @error="handleImageError"
              />
              <span>{{ t('主编推荐', 'EDITOR\'S PICK') }}</span>
            </button>
            <div class="journal-lead-copy">
              <button type="button" @click="emit('open-item', leadItem.id)">
                <strong>{{ leadItem.title }}</strong>
                <span>{{ leadItem.desc }}</span>
              </button>
              <div>
                <b>{{ itemPrice(leadItem) }}</b>
                <button
                  type="button"
                  :data-testid="`food-delivery-add-${leadItem.id}`"
                  :aria-label="t('加入购物袋', 'Add to bag')"
                  :title="t('加入购物袋', 'Add to bag')"
                  @click="emit('add-item', leadItem.id, 1, $event.currentTarget)"
                >
                  <i class="fas fa-plus" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </article>

          <div class="journal-notes">
            <article
              v-for="(item, index) in supportingItems"
              :key="item.id"
              class="journal-note"
              :data-testid="`food-delivery-menu-${item.id}`"
              :data-menu-section="item.menuSection || 'signature'"
              :data-template="templateId"
            >
              <span class="journal-note-index">{{ String(index + 2).padStart(2, '0') }}</span>
              <button
                type="button"
                class="journal-note-image"
                :data-testid="`food-delivery-menu-open-${item.id}`"
                :aria-label="t('查看商品详情', 'View item details')"
                @click="emit('open-item', item.id)"
              >
                <i class="fas fa-utensils editorial-image-fallback" aria-hidden="true"></i>
                <img
                  v-if="imageUrl(item)"
                  :src="imageUrl(item)"
                  :alt="item.image?.alt || item.title"
                  @error="handleImageError"
                />
              </button>
              <button type="button" class="journal-note-copy" @click="emit('open-item', item.id)">
                <strong>{{ item.title }}</strong>
                <span>{{ item.desc }}</span>
                <b>{{ itemPrice(item) }}</b>
              </button>
              <button
                type="button"
                class="journal-add-button"
                :data-testid="`food-delivery-add-${item.id}`"
                :aria-label="t('加入购物袋', 'Add to bag')"
                :title="t('加入购物袋', 'Add to bag')"
                @click="emit('add-item', item.id, 1, $event.currentTarget)"
              >
                <i class="fas fa-plus" aria-hidden="true"></i>
              </button>
            </article>
          </div>
        </div>
      </main>
    </template>

    <template v-else>
      <section class="mosaic-intro">
        <div class="mosaic-wordmark">
          <span>{{ t('随心组合', 'MIX YOUR MENU') }}</span>
          <h1>{{ displayName }}</h1>
          <p>{{ shortDescription }}</p>
        </div>
        <div class="mosaic-cover">
          <i class="fas fa-store editorial-image-fallback" aria-hidden="true"></i>
          <img
            v-if="coverImageUrl"
            :src="coverImageUrl"
            :alt="restaurant.image?.alt || displayName"
            @error="handleImageError"
          />
        </div>
      </section>

      <nav
        class="mosaic-section-map"
        data-testid="food-delivery-store-menu-section-rail"
        :aria-label="t('菜单分类', 'Menu categories')"
      >
        <button
          v-for="(section, index) in availableSections"
          :key="section.key"
          type="button"
          :class="[{ 'is-active': section.key === activeSectionKey }, `mosaic-tone-${(index % 4) + 1}`]"
          :data-testid="`food-delivery-store-menu-section-${section.key}`"
          @click="activeSectionKey = section.key"
        >
          <i :class="section.icon" aria-hidden="true"></i>
          <strong>{{ section.shortLabel }}</strong>
          <span>{{ String(section.count).padStart(2, '0') }}</span>
        </button>
      </nav>

      <main class="mosaic-menu" data-testid="food-delivery-menu-panel">
        <div class="mosaic-menu-heading">
          <div>
            <span>{{ t('正在浏览', 'BROWSING') }}</span>
            <h2>{{ activeSection?.label }}</h2>
          </div>
          <p>{{ etaText }} · {{ feeText }}</p>
        </div>

        <div
          class="mosaic-product-grid"
          data-testid="food-delivery-store-menu-items"
          :data-active-section="activeSection?.key"
        >
          <article
            v-for="(item, index) in visibleItems"
            :key="item.id"
            class="mosaic-product"
            :class="{ 'is-wide': index % 3 === 0 }"
            :data-testid="`food-delivery-menu-${item.id}`"
            :data-menu-section="item.menuSection || 'signature'"
            :data-template="templateId"
          >
            <button
              type="button"
              class="mosaic-product-view"
              :data-testid="`food-delivery-menu-open-${item.id}`"
              :aria-label="t('查看商品详情', 'View item details')"
              @click="emit('open-item', item.id)"
            >
              <span class="mosaic-product-image">
                <i class="fas fa-utensils editorial-image-fallback" aria-hidden="true"></i>
                <img
                  v-if="imageUrl(item)"
                  :src="imageUrl(item)"
                  :alt="item.image?.alt || item.title"
                  @error="handleImageError"
                />
              </span>
              <span class="mosaic-product-copy">
                <small>{{ String(index + 1).padStart(2, '0') }}</small>
                <strong>{{ item.title }}</strong>
                <span>{{ item.desc }}</span>
              </span>
            </button>
            <div class="mosaic-product-action">
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
  </article>
</template>

<style scoped>
.editorial-template {
  --editorial-ink: #22201d;
  position: relative;
  min-height: 100vh;
  overflow: visible;
  color: var(--editorial-ink);
}

.editorial-utility {
  position: sticky;
  top: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
  align-items: center;
  gap: 0.75rem;
  min-height: 4.35rem;
  padding: 0.65rem 0.875rem;
  border-bottom: 1px solid rgba(34, 32, 29, 0.16);
  backdrop-filter: blur(16px);
}

.editorial-icon-button {
  position: relative;
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(34, 32, 29, 0.2);
  border-radius: 0.25rem;
  background: rgba(255, 255, 255, 0.76);
}

.editorial-icon-button:active { transform: scale(0.96); }
.editorial-utility-title { min-width: 0; text-align: center; }
.editorial-utility-title span { display: block; color: #6c655d; font-size: 0.52rem; font-weight: 900; }
.editorial-utility-title strong { display: block; overflow: hidden; margin-top: 0.1rem; font-size: 0.82rem; text-overflow: ellipsis; white-space: nowrap; }
.editorial-cart-button > span { position: absolute; top: -0.2rem; right: -0.2rem; display: inline-flex; min-width: 1.05rem; height: 1.05rem; align-items: center; justify-content: center; padding: 0 0.18rem; border-radius: 50%; background: #22201d; color: white; font-size: 0.5rem; font-weight: 900; }
.editorial-image-fallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }

.editorial-template--journal { background: #f7f5ed; }
.editorial-template--journal .editorial-utility { background: rgba(247, 245, 237, 0.92); }
.journal-masthead { display: grid; grid-template-columns: minmax(0, 1fr) 6.5rem; align-items: stretch; min-height: 10rem; border-bottom: 1px solid #272724; background: #f7f5ed; }
.journal-masthead-copy { display: flex; min-width: 0; flex-direction: column; justify-content: center; padding: 1.35rem 1rem 1.25rem; }
.journal-masthead-copy > span { color: #d85c3e; font-size: 0.56rem; font-weight: 950; }
.journal-masthead-copy h1 { margin: 0.25rem 0 0; font-family: Georgia, 'Times New Roman', serif; font-size: 2rem; font-weight: 700; line-height: 2rem; }
.journal-masthead-copy p { display: -webkit-box; overflow: hidden; margin: 0.65rem 0 0; color: #625f58; font-size: 0.66rem; line-height: 1rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.journal-cover { position: relative; display: flex; min-width: 0; align-items: center; justify-content: center; overflow: hidden; border-left: 1px solid #272724; background: #a8c9db; color: #f7f5ed; }
.journal-cover img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: cover; object-position: 68% center; }
.journal-cover b { position: absolute; z-index: 3; right: 0.35rem; bottom: 0.35rem; padding: 0.2rem 0.3rem; background: #f3c84b; color: #272724; font-size: 0.5rem; }
.journal-service-line { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-bottom: 1px solid #272724; background: #272724; color: #f7f5ed; }
.journal-service-line span { display: flex; min-width: 0; min-height: 2.25rem; align-items: center; justify-content: center; gap: 0.3rem; padding: 0.4rem; border-right: 1px solid rgba(255, 255, 255, 0.2); font-size: 0.56rem; font-weight: 850; text-align: center; }
.journal-service-line span:last-child { border-right: 0; }
.journal-dayparts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-bottom: 1px solid #272724; }
.journal-dayparts button { position: relative; display: flex; min-width: 0; min-height: 5.25rem; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 0.25rem; padding: 0.6rem 0.45rem; border-right: 1px solid #272724; background: #f7f5ed; text-align: left; }
.journal-dayparts button:last-child { border-right: 0; }
.journal-dayparts button > span { color: #77726a; font-size: 0.48rem; font-weight: 900; }
.journal-dayparts button i { color: #5e9fc5; font-size: 0.8rem; }
.journal-dayparts button strong { display: -webkit-box; overflow: hidden; width: 100%; min-height: 1.6rem; font-size: 0.61rem; line-height: 0.8rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.journal-dayparts button small { position: absolute; top: 0.45rem; right: 0.45rem; color: #77726a; font-size: 0.46rem; }
.journal-dayparts button.is-active { background: #f3c84b; }
.journal-dayparts button.is-active i { color: #d85c3e; }
.journal-spread { padding: 1.15rem 1rem 7rem; }
.journal-section-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; padding-bottom: 0.65rem; border-bottom: 3px double #272724; }
.journal-section-heading span { color: #d85c3e; font-size: 0.52rem; font-weight: 950; }
.journal-section-heading h2 { margin: 0.12rem 0 0; font-family: Georgia, 'Times New Roman', serif; font-size: 1.4rem; line-height: 1.6rem; }
.journal-section-heading > b { font-family: Georgia, 'Times New Roman', serif; font-size: 2.2rem; line-height: 2rem; }
.journal-menu { padding-top: 0.9rem; }
.journal-lead { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr); min-height: 12rem; border-bottom: 1px solid #aaa79f; padding-bottom: 0.9rem; }
.journal-lead-image { position: relative; display: flex; min-width: 0; min-height: 12rem; align-items: center; justify-content: center; overflow: hidden; background: #dce9ec; color: #d85c3e; }
.journal-lead-image img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: cover; }
.journal-lead-image > span { position: absolute; z-index: 3; top: 0.55rem; left: 0.55rem; padding: 0.25rem 0.35rem; background: #d85c3e; color: white; font-size: 0.48rem; font-weight: 900; }
.journal-lead-copy { display: flex; min-width: 0; flex-direction: column; justify-content: space-between; padding: 0.2rem 0 0.2rem 0.8rem; }
.journal-lead-copy > button { text-align: left; }
.journal-lead-copy strong { display: block; font-family: Georgia, 'Times New Roman', serif; font-size: 1.05rem; line-height: 1.2rem; }
.journal-lead-copy span { display: -webkit-box; overflow: hidden; margin-top: 0.5rem; color: #666158; font-size: 0.6rem; line-height: 0.9rem; -webkit-box-orient: vertical; -webkit-line-clamp: 5; }
.journal-lead-copy > div { display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; margin-top: 0.75rem; }
.journal-lead-copy > div b { font-size: 0.63rem; }
.journal-lead-copy > div button,
.journal-add-button { display: inline-flex; width: 2rem; height: 2rem; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: #272724; color: #f7f5ed; }
.journal-notes { display: grid; }
.journal-note { display: grid; grid-template-columns: 1.4rem 4.2rem minmax(0, 1fr) 2rem; align-items: center; gap: 0.6rem; min-height: 6.2rem; border-bottom: 1px solid #aaa79f; }
.journal-note-index { color: #d85c3e; font-family: Georgia, 'Times New Roman', serif; font-size: 0.72rem; }
.journal-note-image { position: relative; display: flex; width: 4.2rem; height: 4.2rem; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%; background: #dce9ec; color: #d85c3e; }
.journal-note-image img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: cover; }
.journal-note-copy { display: flex; min-width: 0; flex-direction: column; text-align: left; }
.journal-note-copy strong { font-size: 0.74rem; line-height: 1rem; }
.journal-note-copy span { display: -webkit-box; overflow: hidden; margin-top: 0.25rem; color: #666158; font-size: 0.56rem; line-height: 0.8rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.journal-note-copy b { margin-top: 0.35rem; color: #d85c3e; font-size: 0.58rem; }

.editorial-template--mosaic { background: #f1eee8; }
.editorial-template--mosaic .editorial-utility { background: rgba(241, 238, 232, 0.92); }
.mosaic-intro { display: grid; grid-template-columns: minmax(0, 1fr) 8rem; min-height: 10.5rem; border-bottom: 0.3rem solid #22201d; }
.mosaic-wordmark { display: flex; min-width: 0; flex-direction: column; justify-content: center; padding: 1.2rem 1rem; background: #f5ca52; }
.mosaic-wordmark > span { font-size: 0.54rem; font-weight: 950; }
.mosaic-wordmark h1 { margin: 0.25rem 0 0; font-size: 1.7rem; line-height: 1.8rem; }
.mosaic-wordmark p { display: -webkit-box; overflow: hidden; margin: 0.55rem 0 0; color: #5e5134; font-size: 0.62rem; line-height: 0.9rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.mosaic-cover { position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #4d7d72; color: #f5ca52; }
.mosaic-cover img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: cover; }
.mosaic-section-map { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-bottom: 0.3rem solid #22201d; }
.mosaic-section-map button { position: relative; display: grid; grid-template-columns: 1.5rem minmax(0, 1fr) auto; min-width: 0; min-height: 4.4rem; align-items: center; gap: 0.55rem; padding: 0.75rem; border-right: 1px solid #22201d; border-bottom: 1px solid #22201d; color: #22201d; text-align: left; }
.mosaic-section-map button:nth-child(even) { border-right: 0; }
.mosaic-section-map button i { font-size: 1rem; }
.mosaic-section-map button strong { overflow: hidden; font-size: 0.7rem; text-overflow: ellipsis; white-space: nowrap; }
.mosaic-section-map button span { font-size: 0.52rem; font-weight: 900; }
.mosaic-section-map button.is-active::after { content: ''; position: absolute; inset: 0.35rem; border: 2px solid #22201d; pointer-events: none; }
.mosaic-tone-1 { background: #e66b4d; }
.mosaic-tone-2 { background: #a8c9b6; }
.mosaic-tone-3 { background: #84afd0; }
.mosaic-tone-4 { background: #e4a7b8; }
.mosaic-menu { padding: 1rem 1rem 7rem; }
.mosaic-menu-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 0.85rem; }
.mosaic-menu-heading span { color: #d14e35; font-size: 0.52rem; font-weight: 950; }
.mosaic-menu-heading h2 { margin: 0.12rem 0 0; font-size: 1.45rem; line-height: 1.55rem; }
.mosaic-menu-heading p { margin: 0; color: #625d56; font-size: 0.55rem; font-weight: 800; white-space: nowrap; }
.mosaic-product-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
.mosaic-product { display: flex; min-width: 0; flex-direction: column; border: 1px solid #22201d; background: #fbfaf6; box-shadow: 0.3rem 0.3rem 0 #d7d1c7; }
.mosaic-product.is-wide { grid-column: span 2; }
.mosaic-product-view { display: grid; grid-template-rows: auto minmax(0, 1fr); min-width: 0; flex: 1; text-align: left; }
.mosaic-product.is-wide .mosaic-product-view { grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr); grid-template-rows: 1fr; }
.mosaic-product-image { position: relative; display: flex; width: 100%; aspect-ratio: 1 / 0.82; align-items: center; justify-content: center; overflow: hidden; background: #d9e3dc; color: #d14e35; }
.mosaic-product.is-wide .mosaic-product-image { aspect-ratio: 1.3 / 1; }
.mosaic-product-image img { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: cover; }
.mosaic-product-copy { display: flex; min-width: 0; flex-direction: column; padding: 0.65rem; }
.mosaic-product-copy small { color: #d14e35; font-size: 0.48rem; font-weight: 950; }
.mosaic-product-copy strong { display: -webkit-box; overflow: hidden; margin-top: 0.2rem; min-height: 1.8rem; font-size: 0.72rem; line-height: 0.9rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.mosaic-product-copy > span { display: -webkit-box; overflow: hidden; margin-top: 0.35rem; color: #625d56; font-size: 0.55rem; line-height: 0.78rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.mosaic-product-action { display: flex; min-height: 2.8rem; align-items: center; justify-content: space-between; gap: 0.3rem; padding: 0.45rem 0.55rem; border-top: 1px solid #22201d; }
.mosaic-product-action b { font-size: 0.58rem; }
.mosaic-product-action button { display: inline-flex; width: 1.85rem; height: 1.85rem; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 50%; background: #22201d; color: #f5ca52; }

@media (max-width: 360px) {
  .editorial-utility { grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem; padding-inline: 0.625rem; }
  .editorial-icon-button { width: 2.5rem; height: 2.5rem; }
  .journal-masthead { grid-template-columns: minmax(0, 1fr) 5.3rem; }
  .journal-masthead-copy h1 { font-size: 1.65rem; line-height: 1.7rem; }
  .journal-dayparts button { min-height: 4.8rem; padding-inline: 0.32rem; }
  .journal-dayparts button i { display: none; }
  .journal-lead { grid-template-columns: 1fr; }
  .journal-lead-image { min-height: 10rem; }
  .journal-lead-copy { padding: 0.7rem 0; }
  .journal-note { grid-template-columns: 1rem 3.5rem minmax(0, 1fr) 1.8rem; gap: 0.45rem; }
  .journal-note-image { width: 3.5rem; height: 3.5rem; }
  .journal-add-button { width: 1.8rem; height: 1.8rem; }
  .mosaic-intro { grid-template-columns: minmax(0, 1fr) 6.5rem; }
  .mosaic-section-map button { padding-inline: 0.55rem; }
  .mosaic-menu-heading { align-items: flex-start; flex-direction: column; gap: 0.25rem; }
}
</style>
