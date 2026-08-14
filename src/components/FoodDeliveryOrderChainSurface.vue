<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  order: { type: Object, default: null },
  conversation: { type: Object, default: null },
  journey: { type: Object, default: null },
  anchorOptions: { type: Array, default: () => [] },
  selectedAnchorId: { type: String, default: '' },
})
const emit = defineEmits([
  'update:selectedAnchorId',
  'request-address-change',
  'call-rider',
  'keep-original-address',
  'refresh',
])
const draft = ref('')
const expanded = ref(true)
watch(() => props.order?.id, () => { draft.value = ''; expanded.value = true })
const selectedAnchor = computed(() => props.anchorOptions.find((item) => item.id === props.selectedAnchorId) || null)
const phaseLabel = computed(() => ({
  created: 'Preparing order',
  cooking: 'Restaurant is preparing',
  heading_to_pickup: 'Rider heading to shop',
  rider_pickup: 'Rider picked up',
  en_route: 'On the way',
  address_confirmation_required: 'Confirm delivery address',
  address_change_pending: 'Waiting for rider',
  call_available: 'Call rider now',
  rerouting: 'Route updating',
  arrived: 'Arrived',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}[props.order?.fulfillment?.phase || props.journey?.phase || 'created'] || 'Order in progress') )
const canRequestAddressChange = computed(() => Boolean(
  props.order && selectedAnchor.value && !['delivered', 'cancelled'].includes(props.order.status) &&
  !['address_change_pending', 'call_available', 'rerouting'].includes(props.order.fulfillment?.phase),
))
const submit = () => {
  const text = draft.value.trim()
  if (!text || !selectedAnchor.value) return
  emit('request-address-change', { text, destinationAnchor: selectedAnchor.value })
  draft.value = ''
}
const refresh = () => emit('refresh')
</script>

<template>
  <section v-if='order' class='food-order-chain' data-testid='food-delivery-order-chain'>
    <header class='food-order-chain__header'>
      <div>
        <p class='food-order-chain__eyebrow'>Food Delivery / native order line</p>
        <h2>{{ order.restaurantName || 'Food Delivery' }}</h2>
        <p class='food-order-chain__address'>{{ order.deliveryAddress || 'Delivery address pending' }}</p>
      </div>
      <button type='button' class='food-order-chain__icon' @click='expanded = !expanded'>Toggle</button>
    </header>
    <div v-if='expanded' class='food-order-chain__body'>
      <div class='food-order-chain__status'>
        <span class='food-order-chain__dot'></span>
        <strong>{{ phaseLabel }}</strong>
        <button type='button' class='food-order-chain__icon' @click='refresh'>Refresh</button>
      </div>
      <div v-if='journey' class='food-order-chain__route' data-testid='food-delivery-order-route'>
        <div><i class='fas fa-store'></i><span>{{ journey.pickup?.label || order.restaurantName }}</span></div>
        <div class='food-order-chain__bar'><span :style='{ width: `${Math.round((journey.progress || 0) * 100)}%` }'></span></div>
        <div><i class='fas fa-location-dot'></i><span>{{ journey.destination?.label || order.deliveryAddress }}</span></div>
      </div>
      <div class='food-order-chain__conversation' data-testid='food-delivery-order-conversation'>
        <div class='food-order-chain__conversation-head'>
          <div><p class='food-order-chain__eyebrow'>Rider support</p><strong>{{ conversation?.participant?.name || order.courier?.name || 'Rider' }}</strong></div>
          <span v-if='conversation?.unreadCount' class='food-order-chain__unread'>{{ conversation.unreadCount }} new</span>
        </div>
        <div v-if='conversation?.messages?.length' class='food-order-chain__messages'>
          <div v-for='message in conversation.messages' :key='message.id' class='food-order-chain__message' :class='`food-order-chain__message--${message.sender}`'>
            <span>{{ message.text }}</span><small>{{ message.sender === 'user' ? 'You' : message.sender === 'rider' ? 'Rider' : 'Platform' }}</small>
          </div>
        </div>
        <p v-else class='food-order-chain__empty'>Messages from this order stay inside Food Delivery.</p>
        <div v-if='canRequestAddressChange' class='food-order-chain__composer'>
          <label for='food-delivery-address-anchor'>New delivery address</label>
          <select id='food-delivery-address-anchor' :value='selectedAnchorId' data-testid='food-delivery-order-address-select' @change='emit("update:selectedAnchorId", $event.target.value)'>
            <option v-for='anchor in anchorOptions' :key='anchor.id' :value='anchor.id'>{{ anchor.label }} / {{ anchor.detail }}</option>
          </select>
          <textarea v-model='draft' rows='2' data-testid='food-delivery-order-message-input' placeholder='Tell the rider what changed…'></textarea>
          <button type='button' class='food-order-chain__primary' :disabled='!draft.trim()' data-testid='food-delivery-order-send-address' @click='submit'>Send address request</button>
        </div>
        <div v-if='["address_confirmation_required", "address_change_pending"].includes(order.fulfillment?.phase)' class='food-order-chain__actions'>
          <button type='button' class='food-order-chain__secondary' @click='emit("keep-original-address")'>Keep original address</button>
          <button v-if='order.fulfillment?.callAvailable' type='button' class='food-order-chain__primary' data-testid='food-delivery-order-call-rider' @click='emit("call-rider")'>Call rider</button>
        </div>
        <button v-else-if='order.fulfillment?.callAvailable' type='button' class='food-order-chain__primary' data-testid='food-delivery-order-call-rider' @click='emit("call-rider")'>Call rider</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.food-order-chain { overflow:hidden; border:1px solid rgba(63,224,198,.28); border-radius:1.35rem; color:#edf8f6; background:linear-gradient(145deg,#172231,#0b111b); box-shadow:0 18px 44px rgba(5,10,18,.24); }
.food-order-chain__header,.food-order-chain__status,.food-order-chain__conversation-head,.food-order-chain__actions { display:flex; align-items:center; justify-content:space-between; gap:.7rem; }
.food-order-chain__header { align-items:flex-start; padding:1rem; }.food-order-chain__header h2 { margin:.2rem 0 0; font-size:1.1rem; }.food-order-chain__eyebrow { margin:0; color:#8ce5d9; font-size:.62rem; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }.food-order-chain__address,.food-order-chain__empty { margin:.35rem 0 0; color:#9ba9ba; font-size:.72rem; }.food-order-chain__icon { display:inline-flex; width:2rem; height:2rem; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.1); border-radius:.7rem; color:#cad6e1; background:rgba(255,255,255,.06); }.food-order-chain__body { padding:0 1rem 1rem; }.food-order-chain__status { justify-content:flex-start; padding:.75rem 0; border-top:1px solid rgba(255,255,255,.1); border-bottom:1px solid rgba(255,255,255,.1); font-size:.78rem; }.food-order-chain__dot { width:.58rem; height:.58rem; border-radius:50%; background:#5ce0c5; }.food-order-chain__status .food-order-chain__icon { margin-left:auto; }
.food-order-chain__route,.food-order-chain__conversation { margin-top:.8rem; padding:.8rem; border-radius:1rem; background:rgba(255,255,255,.05); }.food-order-chain__route { display:grid; gap:.55rem; }.food-order-chain__route > div { display:flex; align-items:center; gap:.55rem; min-width:0; color:#dce8f3; font-size:.72rem; font-weight:800; }.food-order-chain__route span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.food-order-chain__route i { color:#5ce0c5; }.food-order-chain__bar { height:.25rem; margin:0 1rem; overflow:hidden; border-radius:999px; background:rgba(255,255,255,.09); }.food-order-chain__bar span { display:block; height:100%; border-radius:inherit; background:#5ce0c5; }
.food-order-chain__conversation { background:rgba(8,12,20,.7); }.food-order-chain__conversation-head strong { display:block; margin-top:.2rem; font-size:.82rem; }.food-order-chain__unread { padding:.25rem .45rem; border-radius:999px; color:#08211e; background:#5ce0c5; font-size:.6rem; font-weight:900; }.food-order-chain__messages { display:grid; gap:.5rem; max-height:14rem; margin:.8rem 0; overflow-y:auto; }.food-order-chain__message { display:grid; gap:.25rem; max-width:88%; padding:.58rem .7rem; border-radius:.8rem; color:#dfe8f4; background:rgba(255,255,255,.07); font-size:.72rem; line-height:1.4; }.food-order-chain__message small { color:#8490a1; font-size:.56rem; text-transform:uppercase; }.food-order-chain__message--user { justify-self:end; color:#06211e; background:#a4f2e3; }
.food-order-chain__composer { display:grid; gap:.45rem; margin-top:.75rem; }.food-order-chain__composer label { color:#9ba9ba; font-size:.64rem; font-weight:800; }.food-order-chain__composer select,.food-order-chain__composer textarea { box-sizing:border-box; width:100%; border:1px solid rgba(255,255,255,.12); border-radius:.7rem; color:#edf8f6; background:rgba(255,255,255,.06); font:inherit; font-size:.72rem; }.food-order-chain__composer select { min-height:2.45rem; padding:.5rem .6rem; }.food-order-chain__composer textarea { min-height:3.1rem; padding:.55rem .6rem; resize:vertical; }.food-order-chain__primary,.food-order-chain__secondary { min-height:2.5rem; padding:.5rem .7rem; border-radius:.75rem; font-size:.7rem; font-weight:900; }.food-order-chain__primary { color:#06211e; background:#5ce0c5; }.food-order-chain__primary:disabled { opacity:.45; }.food-order-chain__secondary { color:#dbe7f3; background:rgba(255,255,255,.08); }.food-order-chain__actions { align-items:stretch; margin-top:.65rem; }.food-order-chain__actions > * { flex:1; }
</style>
