<script setup>
import { computed } from 'vue'

const props = defineProps({
  transaction: {
    type: Object,
    required: true,
  },
})

const sourceMeta = computed(() => {
  const module = String(props.transaction?.sourceModule || '').trim()
  if (module === 'shopping_wallet_expense') {
    return { kind: 'shopping', label: 'Shopping', icon: 'fas fa-bag-shopping' }
  }
  if (module === 'food_delivery_wallet_expense') {
    return { kind: 'food', label: 'Food Delivery', icon: 'fas fa-bowl-food' }
  }
  if (module === 'chat_transfer' || module === 'wallet_payee_transfer') {
    return { kind: 'chat', label: 'Chat', icon: 'fas fa-comment' }
  }
  if (module === 'seed') {
    return { kind: 'schatphone', label: 'SchatPhone', icon: 'fas fa-sparkles' }
  }
  return {
    kind: props.transaction?.type === 'expense' ? 'wallet-expense' : 'wallet-income',
    label: 'Wallet',
    icon: props.transaction?.type === 'expense' ? 'fas fa-arrow-up' : 'fas fa-arrow-down',
  }
})
</script>

<template>
  <span
    class="wallet-transaction-source-mark"
    :class="`is-${sourceMeta.kind}`"
    :title="sourceMeta.label"
    :aria-label="sourceMeta.label"
    :data-source-kind="sourceMeta.kind"
    :data-testid="`wallet-transaction-source-${transaction.id}`"
  >
    <i :class="sourceMeta.icon" aria-hidden="true"></i>
  </span>
</template>

<style scoped>
.wallet-transaction-source-mark {
  position: relative;
  display: inline-flex;
  width: 2.65rem;
  height: 2.65rem;
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(17, 20, 23, 0.08);
  border-radius: 11px;
  color: #26313a;
  background: #e9edf0;
  box-shadow: 0 2px 7px rgba(14, 18, 21, 0.08);
  font-size: 0.82rem;
}

.wallet-transaction-source-mark::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.42), transparent 48%);
  content: '';
}

.wallet-transaction-source-mark i {
  position: relative;
  z-index: 1;
}

.wallet-transaction-source-mark.is-shopping {
  color: #ffffff;
  background: #16191d;
}

.wallet-transaction-source-mark.is-food {
  color: #173d38;
  background: #4ed5bd;
}

.wallet-transaction-source-mark.is-chat {
  color: #352e13;
  background: #f5d957;
}

.wallet-transaction-source-mark.is-schatphone {
  color: #f7f9ff;
  background: #5e72c8;
}

.wallet-transaction-source-mark.is-wallet-income {
  color: #17634f;
  background: #dff2ea;
}

.wallet-transaction-source-mark.is-wallet-expense {
  color: #924039;
  background: #f6e5e2;
}
</style>
