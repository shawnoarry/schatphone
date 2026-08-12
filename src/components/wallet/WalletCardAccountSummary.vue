<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
  amountLabel: {
    type: String,
    default: '',
  },
  amountCaption: {
    type: String,
    default: '',
  },
  compact: {
    type: Boolean,
    default: false,
  },
  testIdSuffix: {
    type: String,
    default: '',
  },
})

const { t } = useI18n()

const cardName = computed(() => t(props.card.nameZh || '', props.card.nameEn || ''))

const statusLabel = computed(() => {
  if (props.card.status === 'frozen') return t('已冻结', 'Frozen')
  if (props.card.isDefault) return t('默认卡', 'Default')
  return ''
})
</script>

<template>
  <div
    class="wallet-card-account-summary"
    :class="{ 'is-compact': compact, 'is-frozen': card.status === 'frozen' }"
    :data-testid="`wallet-card-account-summary-${card.id}${testIdSuffix ? `-${testIdSuffix}` : ''}`"
  >
    <span class="wallet-card-account-summary__amount">
      <small>{{ amountCaption }}</small>
      <strong>{{ amountLabel }}</strong>
    </span>
    <span class="wallet-card-account-summary__identity">
      <strong>{{ cardName }}</strong>
      <small>•••• {{ card.last4 }} · {{ card.network }}</small>
    </span>
    <span v-if="statusLabel" class="wallet-card-account-summary__status">
      <i
        :class="card.status === 'frozen' ? 'fas fa-lock' : 'fas fa-star'"
        aria-hidden="true"
      ></i>
      {{ statusLabel }}
    </span>
  </div>
</template>

<style scoped>
.wallet-card-account-summary {
  position: relative;
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--wallet-line-strong);
  overflow: hidden;
  border-radius: 0.82rem;
  padding: 0.72rem 0.82rem 0.72rem 0.94rem;
  color: var(--wallet-ink);
  background: color-mix(in srgb, var(--wallet-surface-solid) 88%, transparent);
  box-shadow:
    0 8px 20px rgba(27, 43, 48, 0.08),
    inset 0 1px var(--wallet-highlight);
  backdrop-filter: blur(16px);
}

.wallet-card-account-summary::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: color-mix(in srgb, var(--wallet-positive) 52%, var(--wallet-line-strong));
  content: '';
}

.wallet-card-account-summary__amount,
.wallet-card-account-summary__identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.12rem;
}

.wallet-card-account-summary__amount small,
.wallet-card-account-summary__identity small {
  overflow: hidden;
  color: var(--wallet-muted);
  font-size: 0.59rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-card-account-summary__amount strong {
  overflow: hidden;
  font-size: 0.96rem;
  font-variant-numeric: tabular-nums;
  font-weight: 850;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-card-account-summary__identity strong {
  overflow: hidden;
  font-size: 0.69rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-card-account-summary__status {
  display: inline-flex;
  min-height: 1.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  border: 1px solid var(--wallet-line);
  border-radius: 999px;
  padding: 0 0.58rem;
  color: var(--wallet-positive);
  background: color-mix(in srgb, var(--wallet-positive) 8%, transparent);
  font-size: 0.58rem;
  font-weight: 800;
  white-space: nowrap;
}

.wallet-card-account-summary.is-frozen .wallet-card-account-summary__status {
  color: #a65d58;
  background: color-mix(in srgb, #a65d58 8%, transparent);
}

.wallet-card-account-summary.is-compact {
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.9fr) auto;
  border: 0;
  border-top: 1px solid var(--wallet-line);
  border-radius: 0;
  padding: 0.62rem 0.18rem 0.08rem;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.wallet-card-account-summary.is-compact::before {
  display: none;
}

.wallet-card-account-summary.is-compact .wallet-card-account-summary__amount strong {
  font-size: 0.82rem;
}

@media (max-width: 360px) {
  .wallet-card-account-summary {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .wallet-card-account-summary__identity {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
