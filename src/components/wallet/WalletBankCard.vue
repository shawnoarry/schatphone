<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  interactive: {
    type: Boolean,
    default: true,
  },
  amountLabel: {
    type: String,
    default: '',
  },
  amountCaption: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select'])
const { t } = useI18n()

const institutionName = computed(() =>
  t(props.card.institution?.nameZh || '', props.card.institution?.nameEn || ''),
)

const cardName = computed(() => t(props.card.nameZh || '', props.card.nameEn || ''))

const accessibleName = computed(() =>
  [institutionName.value, cardName.value, props.amountLabel].filter(Boolean).join(' '),
)

const selectCard = () => {
  if (props.interactive) emit('select', props.card.id)
}
</script>

<template>
  <component
    :is="interactive ? 'button' : 'div'"
    :type="interactive ? 'button' : undefined"
    class="wallet-bank-card"
    :class="[`theme-${card.theme}`, { 'is-selected': selected, 'is-frozen': card.status === 'frozen' }]"
    :aria-label="interactive ? accessibleName : undefined"
    :aria-pressed="interactive ? selected : undefined"
    :data-testid="`wallet-payment-card-${card.id}`"
    @click="selectCard"
  >
    <span class="wallet-bank-card__rail" aria-hidden="true"></span>
    <span class="wallet-bank-card__topline">
      <span class="wallet-bank-card__mark">{{ card.institution?.shortName || 'BANK' }}</span>
      <span class="wallet-bank-card__issuer">{{ institutionName }}</span>
      <span v-if="card.isDefault" class="wallet-bank-card__status">
        {{ t('默认', 'Default') }}
      </span>
      <span v-else-if="card.status === 'frozen'" class="wallet-bank-card__status">
        {{ t('已冻结', 'Frozen') }}
      </span>
    </span>

    <span class="wallet-bank-card__middle">
      <span class="wallet-bank-card__chip" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
      <i class="fas fa-wifi wallet-bank-card__contactless" aria-hidden="true"></i>
    </span>

    <span class="wallet-bank-card__balance">
      <span class="wallet-bank-card__caption">{{ amountCaption }}</span>
      <strong>{{ amountLabel }}</strong>
    </span>

    <span class="wallet-bank-card__bottomline">
      <span class="wallet-bank-card__identity">
        <span>{{ cardName }}</span>
        <small>•••• {{ card.last4 }}</small>
      </span>
      <span class="wallet-bank-card__network">{{ card.network }}</span>
    </span>
  </component>
</template>

<style scoped>
.wallet-bank-card {
  --card-surface: #173f75;
  --card-ink: #ffffff;
  --card-muted: rgba(255, 255, 255, 0.72);
  --card-accent: #f3c35a;
  position: relative;
  display: flex;
  width: 100%;
  aspect-ratio: 1.586 / 1;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  padding: 1rem;
  color: var(--card-ink);
  text-align: left;
  background: var(--card-surface);
  box-shadow: 0 16px 34px rgba(22, 28, 36, 0.17);
  transform: translateY(0);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    opacity 180ms ease;
}

.wallet-bank-card::after {
  position: absolute;
  right: -20%;
  bottom: -70%;
  width: 58%;
  height: 160%;
  border-left: 1px solid color-mix(in srgb, var(--card-ink) 22%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--card-ink) 16%, transparent);
  content: '';
  pointer-events: none;
  transform: rotate(18deg);
}

.wallet-bank-card.is-selected {
  box-shadow:
    0 20px 42px rgba(22, 28, 36, 0.22),
    0 0 0 2px rgba(255, 255, 255, 0.9),
    0 0 0 4px #20242b;
  transform: translateY(-2px);
}

.wallet-bank-card.is-frozen {
  opacity: 0.64;
  filter: saturate(0.45);
}

.wallet-bank-card:focus-visible {
  outline: 3px solid rgba(33, 133, 189, 0.38);
  outline-offset: 4px;
}

.wallet-bank-card__rail {
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: var(--card-accent);
}

.wallet-bank-card__topline,
.wallet-bank-card__bottomline,
.wallet-bank-card__middle,
.wallet-bank-card__balance {
  position: relative;
  z-index: 1;
}

.wallet-bank-card__topline {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  min-height: 1.6rem;
}

.wallet-bank-card__mark {
  display: inline-flex;
  min-width: 2rem;
  height: 1.45rem;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--card-ink) 32%, transparent);
  border-radius: 4px;
  padding: 0 0.35rem;
  font-size: 0.65rem;
  font-weight: 900;
  line-height: 1;
}

.wallet-bank-card__issuer {
  overflow: hidden;
  font-size: 0.72rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-bank-card__status {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--card-muted);
}

.wallet-bank-card__middle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.9rem;
}

.wallet-bank-card__chip {
  position: relative;
  display: grid;
  width: 2.15rem;
  height: 1.65rem;
  grid-template-columns: repeat(3, 1fr);
  overflow: hidden;
  border: 1px solid rgba(83, 58, 13, 0.24);
  border-radius: 5px;
  background: #e8c46c;
}

.wallet-bank-card__chip i {
  border-right: 1px solid rgba(83, 58, 13, 0.22);
}

.wallet-bank-card__chip::after {
  position: absolute;
  inset: 50% 0 auto;
  border-top: 1px solid rgba(83, 58, 13, 0.22);
  content: '';
}

.wallet-bank-card__contactless {
  font-size: 0.9rem;
  opacity: 0.72;
  transform: rotate(90deg);
}

.wallet-bank-card__balance {
  display: flex;
  min-height: 3.25rem;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
  margin-top: 0.2rem;
}

.wallet-bank-card__caption {
  min-height: 1rem;
  font-size: 0.62rem;
  color: var(--card-muted);
}

.wallet-bank-card__balance strong {
  overflow: hidden;
  font-size: 1.15rem;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-bank-card__bottomline {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.6rem;
}

.wallet-bank-card__identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.1rem;
}

.wallet-bank-card__identity > span {
  overflow: hidden;
  font-size: 0.68rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-bank-card__identity small,
.wallet-bank-card__network {
  font-size: 0.62rem;
  color: var(--card-muted);
}

.wallet-bank-card__network {
  flex: none;
  font-weight: 800;
}

.theme-scarlet {
  --card-surface: #8d2430;
  --card-ink: #fff9f2;
  --card-muted: rgba(255, 249, 242, 0.7);
  --card-accent: #d6b56a;
}

.theme-sunflower {
  --card-surface: #edc644;
  --card-ink: #222326;
  --card-muted: rgba(34, 35, 38, 0.62);
  --card-accent: #222326;
}

.theme-cobalt {
  --card-surface: #194477;
  --card-ink: #f7fbff;
  --card-muted: rgba(247, 251, 255, 0.7);
  --card-accent: #78b6d7;
}

.theme-emerald {
  --card-surface: #0f604c;
  --card-ink: #f6fff9;
  --card-muted: rgba(246, 255, 249, 0.68);
  --card-accent: #d8c46b;
}

.theme-wine {
  --card-surface: #71233c;
  --card-ink: #fff7fa;
  --card-muted: rgba(255, 247, 250, 0.68);
  --card-accent: #d2b98a;
}

.theme-coral {
  --card-surface: #d84d48;
  --card-ink: #fffafa;
  --card-muted: rgba(255, 250, 250, 0.72);
  --card-accent: #f2d0a0;
}

.theme-teal {
  --card-surface: #086e64;
  --card-ink: #f5fffd;
  --card-muted: rgba(245, 255, 253, 0.7);
  --card-accent: #d8be76;
}

@media (prefers-reduced-motion: reduce) {
  .wallet-bank-card {
    transition: none;
  }
}
</style>
