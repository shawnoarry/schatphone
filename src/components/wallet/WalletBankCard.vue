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
  testIdSuffix: {
    type: String,
    default: '',
  },
  presentation: {
    type: String,
    default: 'account',
    validator: (value) => ['account', 'collector'].includes(value),
  },
})

const emit = defineEmits(['select'])
const { t } = useI18n()

const institutionName = computed(() =>
  t(props.card.institution?.nameZh || '', props.card.institution?.nameEn || ''),
)

const cardName = computed(() => t(props.card.nameZh || '', props.card.nameEn || ''))

const activeAppearance = computed(() => props.card.appearance || null)

const isCollectorPresentation = computed(() => props.presentation === 'collector')

const completeArtwork = computed(() => {
  const item = activeAppearance.value
  return item?.collectorArtworkVerified ? item.collectorArtwork || '' : ''
})

const usesCompleteArtwork = computed(() => Boolean(completeArtwork.value))

const appearanceName = computed(() =>
  activeAppearance.value
    ? t(activeAppearance.value.titleZh || '', activeAppearance.value.titleEn || '')
    : '',
)

const appearanceStyle = computed(() => {
  const item = activeAppearance.value
  if (!item?.artwork) return undefined
  return {
    '--card-artwork': `url("${item.artwork}")`,
    '--card-artwork-overlay': item.overlay,
    '--card-ink': item.ink,
    '--card-muted': item.mutedInk,
    '--card-chip': item.chip,
    '--card-accent': item.accent,
  }
})

const completeArtworkStyle = computed(() =>
  completeArtwork.value ? { '--complete-artwork': `url("${completeArtwork.value}")` } : undefined,
)

const accessibleName = computed(() =>
  [institutionName.value, cardName.value, appearanceName.value, props.amountLabel]
    .filter(Boolean)
    .join(' '),
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
    :class="[
      `theme-${card.theme}`,
      activeAppearance?.material ? `material-${activeAppearance.material}` : '',
      { 'is-selected': selected, 'is-frozen': card.status === 'frozen' },
      { 'has-artwork': activeAppearance?.artwork },
      { 'is-collector': isCollectorPresentation },
      { 'has-complete-artwork': usesCompleteArtwork },
    ]"
    :style="[appearanceStyle, completeArtworkStyle]"
    :role="interactive ? undefined : 'img'"
    :aria-label="accessibleName"
    :aria-pressed="interactive ? selected : undefined"
    :data-presentation="presentation"
    :data-complete-artwork="usesCompleteArtwork ? 'true' : 'false'"
    :data-testid="`wallet-payment-card-${card.id}${testIdSuffix ? `-${testIdSuffix}` : ''}`"
    @click="selectCard"
  >
    <span
      v-if="usesCompleteArtwork"
      class="wallet-bank-card__complete-artwork"
      aria-hidden="true"
    ></span>
    <template v-else>
      <span class="wallet-bank-card__rail" aria-hidden="true"></span>
      <span class="wallet-bank-card__topline">
        <span class="wallet-bank-card__mark">{{ card.institution?.shortName || 'BANK' }}</span>
        <span class="wallet-bank-card__issuer">{{ institutionName }}</span>
      </span>

      <span class="wallet-bank-card__middle">
        <span class="wallet-bank-card__chip" aria-hidden="true"> <i></i><i></i><i></i> </span>
        <i class="fas fa-wifi wallet-bank-card__contactless" aria-hidden="true"></i>
      </span>

      <span v-if="!isCollectorPresentation" class="wallet-bank-card__bottomline">
        <span class="wallet-bank-card__identity">
          <span>{{ cardName }}</span>
          <small>•••• {{ card.last4 }}</small>
        </span>
        <span class="wallet-bank-card__network">{{ card.network }}</span>
      </span>
      <span v-else class="wallet-bank-card__collector-bottomline">
        <span>{{ card.settlementCurrency }}</span>
        <small>•••• {{ card.last4 }}</small>
      </span>
    </template>
  </component>
</template>

<style scoped>
.wallet-bank-card {
  --card-surface: #173f75;
  --card-ink: #ffffff;
  --card-muted: rgba(255, 255, 255, 0.72);
  --card-accent: #f3c35a;
  --card-chip: #e8c46c;
  --card-inline-padding: 1rem;
  --card-chip-padding-compensation: 0.287rem;
  position: relative;
  display: flex;
  width: 100%;
  aspect-ratio: 1.586 / 1;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  padding: 1rem var(--card-inline-padding);
  color: var(--card-ink);
  font: inherit;
  text-align: left;
  background-color: var(--card-surface);
  background-image: none;
  background-position: center;
  background-size: cover;
  box-shadow:
    0 10px 24px rgba(22, 28, 36, 0.18),
    0 1px 1px rgba(255, 255, 255, 0.14) inset;
  transform: translateY(0);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    opacity 180ms ease;
}

.wallet-bank-card.has-artwork {
  background-image: var(--card-artwork-overlay), var(--card-artwork);
}

.wallet-bank-card__complete-artwork {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: block;
  background-image: var(--complete-artwork);
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.wallet-bank-card.has-complete-artwork {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  filter: drop-shadow(0 10px 16px rgba(22, 28, 36, 0.2));
}

.wallet-bank-card.has-complete-artwork::after {
  display: none;
}

.wallet-bank-card.has-artwork::after {
  position: absolute;
  z-index: 0;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    118deg,
    rgba(255, 255, 255, 0.2) 0%,
    rgba(255, 255, 255, 0) 28%,
    rgba(255, 255, 255, 0.08) 68%,
    rgba(255, 255, 255, 0) 100%
  );
  content: '';
  opacity: 0.55;
}

.wallet-bank-card.material-matte::after,
.wallet-bank-card.material-oil::after {
  opacity: 0.24;
}

.wallet-bank-card.material-lacquer::after {
  opacity: 0.72;
}

button.wallet-bank-card {
  cursor: pointer;
}

button.wallet-bank-card:hover {
  box-shadow:
    0 13px 28px rgba(22, 28, 36, 0.22),
    0 1px 1px rgba(255, 255, 255, 0.14) inset;
}

button.wallet-bank-card.has-complete-artwork:hover {
  box-shadow: none;
  filter: drop-shadow(0 14px 20px rgba(22, 28, 36, 0.24));
}

.wallet-bank-card.is-selected {
  box-shadow:
    0 18px 38px rgba(22, 28, 36, 0.27),
    0 1px 1px rgba(255, 255, 255, 0.14) inset;
  transform: translateY(-1px);
}

.wallet-bank-card.has-complete-artwork.is-selected {
  box-shadow: none;
  filter: drop-shadow(0 16px 24px rgba(22, 28, 36, 0.27));
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
  z-index: 1;
  inset: 0 auto 0 0;
  width: 5px;
  background: var(--card-accent);
}

.wallet-bank-card__topline,
.wallet-bank-card__bottomline,
.wallet-bank-card__collector-bottomline,
.wallet-bank-card__middle {
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
  background: color-mix(in srgb, var(--card-surface) 18%, transparent);
  backdrop-filter: blur(5px);
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

.wallet-bank-card__middle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.9rem;
}

.wallet-bank-card__chip {
  position: relative;
  display: grid;
  width: calc(13.5% + var(--card-chip-padding-compensation));
  height: auto;
  aspect-ratio: 1.36 / 1;
  grid-template-columns: repeat(3, 1fr);
  flex: none;
  overflow: hidden;
  border: 1px solid rgba(83, 58, 13, 0.24);
  border-radius: 5px;
  background: var(--card-chip);
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

.wallet-bank-card__bottomline {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.6rem;
}

.wallet-bank-card__collector-bottomline {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: auto;
  color: var(--card-muted);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.wallet-bank-card.is-collector:not(.has-complete-artwork) {
  --card-inline-padding: 0.9rem;
  --card-chip-padding-compensation: 0.26rem;
  padding: 0.9rem var(--card-inline-padding);
}

.wallet-bank-card.is-collector:not(.has-complete-artwork) .wallet-bank-card__middle {
  margin-top: 1rem;
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

.wallet-bank-card__identity small {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-variant-numeric: tabular-nums;
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
