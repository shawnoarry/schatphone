<script setup>
import { useI18n } from '../../composables/useI18n'
import { MAP_USER_PLACE_CATEGORIES } from '../../lib/map-place-categories'

const emit = defineEmits(['close'])
const { t } = useI18n()
</script>

<template>
  <div class="map-pin-guide-backdrop" @click.self="emit('close')">
    <section
      class="map-pin-guide"
      role="dialog"
      aria-modal="true"
      :aria-label="t('图钉类型说明', 'Pin type guide')"
      data-testid="map-pin-category-guide"
    >
      <header class="map-pin-guide-header">
        <div>
          <span>{{ t('我的图钉', 'MY PINS') }}</span>
          <h2>{{ t('图钉类型', 'Pin types') }}</h2>
        </div>
        <button type="button" :aria-label="t('关闭', 'Close')" @click="emit('close')">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </header>

      <div class="map-pin-guide-list">
        <div
          v-for="category in MAP_USER_PLACE_CATEGORIES"
          :key="category.id"
          class="map-pin-guide-row"
          :style="{ '--map-place-tone': category.tone }"
          :data-testid="`map-pin-category-guide-${category.id}`"
        >
          <span class="map-pin-guide-icon"><i :class="category.icon" aria-hidden="true"></i></span>
          <span>
            <strong>{{ t(category.labelZh, category.labelEn) }}</strong>
            <small>{{ t(category.descriptionZh, category.descriptionEn) }}</small>
          </span>
        </div>
      </div>

      <div class="map-pin-guide-world">
        <span><i class="fas fa-landmark" aria-hidden="true"></i></span>
        <div>
          <strong>{{ t('世界地点', 'World places') }}</strong>
          <small>{{ t('由地图包定义，并按地点类型或阵营显示。', 'Defined by the map pack and styled by place type or faction.') }}</small>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.map-pin-guide-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(17, 28, 23, 0.46);
}

.map-pin-guide {
  width: min(100%, 620px);
  max-height: 84vh;
  overflow-y: auto;
  border: 1px solid #dce2de;
  border-radius: 8px 8px 0 0;
  background: #fafbf9;
  padding: 17px 18px calc(22px + env(safe-area-inset-bottom));
  color: #17211d;
  box-shadow: 0 -18px 60px rgba(20, 32, 26, 0.26);
}

.map-pin-guide-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.map-pin-guide-header span {
  display: block;
  color: #69746e;
  font-size: 9px;
  font-weight: 800;
}

.map-pin-guide-header h2 {
  margin-top: 2px;
  font-size: 18px;
  font-weight: 850;
  letter-spacing: 0;
}

.map-pin-guide-header button {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #dce2de;
  border-radius: 7px;
  background: #fff;
  color: #526158;
}

.map-pin-guide-list {
  margin-top: 14px;
  border-top: 1px solid #dce2de;
}

.map-pin-guide-row {
  display: grid;
  min-height: 58px;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #e4e8e5;
}

.map-pin-guide-icon,
.map-pin-guide-world > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--map-place-tone) 14%, white);
  color: var(--map-place-tone);
  font-size: 11px;
}

.map-pin-guide-row strong,
.map-pin-guide-row small,
.map-pin-guide-world strong,
.map-pin-guide-world small {
  display: block;
}

.map-pin-guide-row strong,
.map-pin-guide-world strong {
  font-size: 11px;
  font-weight: 850;
}

.map-pin-guide-row small,
.map-pin-guide-world small {
  margin-top: 3px;
  color: #69746e;
  font-size: 9px;
  line-height: 1.45;
}

.map-pin-guide-world {
  --map-place-tone: #475569;
  display: grid;
  min-height: 68px;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  border-radius: 7px;
  background: #eef1ef;
  padding: 8px;
}

@media (min-width: 720px) {
  .map-pin-guide {
    margin-bottom: 20px;
    border-radius: 8px;
  }
}
</style>
