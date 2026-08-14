<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  order: { type: Object, default: null },
  conversation: { type: Object, default: null },
  journey: { type: Object, default: null },
  anchorOptions: { type: Array, default: () => [] },
  selectedAnchorId: { type: String, default: '' },
  languageBase: { type: String, default: 'en' },
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
const t = (zh, en) => (props.languageBase === 'zh' ? zh : en)
const selectedAnchor = computed(() => props.anchorOptions.find((item) => item.id === props.selectedAnchorId) || null)
const participantName = computed(() => {
  const name = props.conversation?.participant?.name || props.order?.courier?.name || ''
  return name === 'Food Delivery rider'
    ? t('外卖配送员', 'Food Delivery rider')
    : name || t('配送员', 'Rider')
})
const phaseLabel = computed(() => ({
  created: t('订单准备中', 'Preparing order'),
  cooking: t('商家正在备餐', 'Restaurant is preparing'),
  heading_to_pickup: t('配送员正前往商家', 'Rider heading to shop'),
  rider_pickup: t('配送员已取餐', 'Rider picked up'),
  en_route: t('配送途中', 'On the way'),
  address_confirmation_required: t('请确认配送地址', 'Confirm delivery address'),
  address_change_pending: t('改址请求处理中', 'Address request pending'),
  call_available: t('可联系配送员', 'Rider contact available'),
  rerouting: t('路线更新中', 'Route updating'),
  arrived: t('已到达', 'Arrived'),
  delivered: t('已送达', 'Delivered'),
  cancelled: t('已取消', 'Cancelled'),
}[props.order?.fulfillment?.phase || props.journey?.phase || 'created'] || t('订单进行中', 'Order in progress')) )
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
        <p class='food-order-chain__eyebrow'>{{ t('外卖 · 订单服务', 'Food Delivery · Order support') }}</p>
        <h2>{{ order.restaurantName || t('外卖', 'Food Delivery') }}</h2>
        <p class='food-order-chain__address'>{{ order.deliveryAddress || t('配送地址待确认', 'Delivery address pending') }}</p>
      </div>
      <button
        type='button'
        class='food-order-chain__icon'
        :aria-expanded='expanded'
        aria-controls='food-delivery-order-chain-body'
        :aria-label='expanded ? t("收起订单服务", "Collapse order support") : t("展开订单服务", "Expand order support")'
        @click='expanded = !expanded'
      >
        <i :class='expanded ? "fas fa-chevron-up" : "fas fa-chevron-down"' aria-hidden='true'></i>
      </button>
    </header>
    <div v-if='expanded' id='food-delivery-order-chain-body' class='food-order-chain__body'>
      <div class='food-order-chain__status'>
        <span class='food-order-chain__dot'></span>
        <strong>{{ phaseLabel }}</strong>
        <button type='button' class='food-order-chain__icon' :aria-label='t("刷新订单状态", "Refresh order status")' @click='refresh'>
          <i class='fas fa-rotate-right' aria-hidden='true'></i>
        </button>
      </div>
      <div v-if='journey' class='food-order-chain__route' data-testid='food-delivery-order-route'>
        <div><i class='fas fa-store'></i><span>{{ journey.pickup?.label || order.restaurantName }}</span></div>
        <div class='food-order-chain__bar'><span :style='{ width: `${Math.round((journey.progress || 0) * 100)}%` }'></span></div>
        <div><i class='fas fa-location-dot'></i><span>{{ journey.destination?.label || order.deliveryAddress }}</span></div>
      </div>
      <div class='food-order-chain__conversation' data-testid='food-delivery-order-conversation'>
        <div class='food-order-chain__conversation-head'>
          <div><p class='food-order-chain__eyebrow'>{{ t('配送服务', 'Delivery support') }}</p><strong>{{ participantName }}</strong></div>
          <span v-if='conversation?.unreadCount' class='food-order-chain__unread'>{{ t(`${conversation.unreadCount} 条新消息`, `${conversation.unreadCount} new`) }}</span>
        </div>
        <div v-if='conversation?.messages?.length' class='food-order-chain__messages'>
          <div v-for='message in conversation.messages' :key='message.id' class='food-order-chain__message' :class='`food-order-chain__message--${message.sender}`'>
            <span>{{ message.text }}</span><small>{{ message.sender === 'user' ? t('你', 'You') : message.sender === 'rider' ? t('配送员', 'Rider') : t('平台', 'Platform') }}</small>
          </div>
        </div>
        <p v-else class='food-order-chain__empty'>{{ t('这笔订单的服务消息会保留在外卖中。', 'Messages for this order stay inside Food Delivery.') }}</p>
        <div v-if='canRequestAddressChange' class='food-order-chain__composer'>
          <label for='food-delivery-address-anchor'>{{ t('新的配送地址', 'New delivery address') }}</label>
          <select id='food-delivery-address-anchor' :value='selectedAnchorId' data-testid='food-delivery-order-address-select' @change='emit("update:selectedAnchorId", $event.target.value)'>
            <option v-for='anchor in anchorOptions' :key='anchor.id' :value='anchor.id'>{{ anchor.label }} / {{ anchor.detail }}</option>
          </select>
          <textarea v-model='draft' rows='2' data-testid='food-delivery-order-message-input' :placeholder='t("说明需要修改的配送地址……", "Explain the address change…")'></textarea>
          <button type='button' class='food-order-chain__primary' :disabled='!draft.trim()' data-testid='food-delivery-order-send-address' @click='submit'>{{ t('提交改址请求', 'Submit address request') }}</button>
        </div>
        <div v-if='["address_confirmation_required", "address_change_pending"].includes(order.fulfillment?.phase)' class='food-order-chain__actions'>
          <button type='button' class='food-order-chain__secondary' @click='emit("keep-original-address")'>{{ t('继续送往原地址', 'Keep original address') }}</button>
          <button v-if='order.fulfillment?.callAvailable' type='button' class='food-order-chain__primary' data-testid='food-delivery-order-call-rider' @click='emit("call-rider")'>{{ t('联系配送员', 'Call rider') }}</button>
        </div>
        <button v-else-if='order.fulfillment?.callAvailable' type='button' class='food-order-chain__primary' data-testid='food-delivery-order-call-rider' @click='emit("call-rider")'>{{ t('联系配送员', 'Call rider') }}</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.food-order-chain { overflow:hidden; border:1px solid rgba(63,224,198,.28); border-radius:1.35rem; color:#edf8f6; background:linear-gradient(145deg,#172231,#0b111b); box-shadow:0 18px 44px rgba(5,10,18,.24); }
.food-order-chain__header,.food-order-chain__status,.food-order-chain__conversation-head,.food-order-chain__actions { display:flex; align-items:center; justify-content:space-between; gap:.7rem; }
.food-order-chain__header { align-items:flex-start; padding:1rem; }.food-order-chain__header > div { min-width:0; }.food-order-chain__header h2 { margin:.2rem 0 0; overflow-wrap:anywhere; font-size:1.1rem; }.food-order-chain__eyebrow { margin:0; color:#8ce5d9; font-size:.62rem; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }.food-order-chain__address,.food-order-chain__empty { margin:.35rem 0 0; overflow-wrap:anywhere; color:#9ba9ba; font-size:.72rem; }.food-order-chain__icon { display:inline-flex; width:2.75rem; height:2.75rem; flex:0 0 2.75rem; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.1); border-radius:.7rem; color:#cad6e1; background:rgba(255,255,255,.06); }.food-order-chain__body { padding:0 1rem 1rem; }.food-order-chain__status { justify-content:flex-start; padding:.75rem 0; border-top:1px solid rgba(255,255,255,.1); border-bottom:1px solid rgba(255,255,255,.1); font-size:.78rem; }.food-order-chain__dot { width:.58rem; height:.58rem; border-radius:50%; background:#5ce0c5; }.food-order-chain__status .food-order-chain__icon { margin-left:auto; }
.food-order-chain__route,.food-order-chain__conversation { margin-top:.8rem; padding:.8rem; border-radius:1rem; background:rgba(255,255,255,.05); }.food-order-chain__route { display:grid; gap:.55rem; }.food-order-chain__route > div { display:flex; align-items:center; gap:.55rem; min-width:0; color:#dce8f3; font-size:.72rem; font-weight:800; }.food-order-chain__route span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.food-order-chain__route i { color:#5ce0c5; }.food-order-chain__bar { height:.25rem; margin:0 1rem; overflow:hidden; border-radius:999px; background:rgba(255,255,255,.09); }.food-order-chain__bar span { display:block; height:100%; border-radius:inherit; background:#5ce0c5; }
.food-order-chain__conversation { background:rgba(8,12,20,.7); }.food-order-chain__conversation-head > div { min-width:0; }.food-order-chain__conversation-head strong { display:block; margin-top:.2rem; overflow-wrap:anywhere; font-size:.82rem; }.food-order-chain__unread { flex:none; padding:.25rem .45rem; border-radius:999px; color:#08211e; background:#5ce0c5; font-size:.6rem; font-weight:900; }.food-order-chain__messages { display:grid; gap:.5rem; max-height:14rem; margin:.8rem 0; overflow-y:auto; }.food-order-chain__message { display:grid; gap:.25rem; max-width:88%; padding:.58rem .7rem; overflow-wrap:anywhere; border-radius:.8rem; color:#dfe8f4; background:rgba(255,255,255,.07); font-size:.72rem; line-height:1.4; }.food-order-chain__message small { color:#8490a1; font-size:.56rem; text-transform:uppercase; }.food-order-chain__message--user { justify-self:end; color:#06211e; background:#a4f2e3; }
.food-order-chain__composer { display:grid; gap:.45rem; margin-top:.75rem; }.food-order-chain__composer label { color:#9ba9ba; font-size:.64rem; font-weight:800; }.food-order-chain__composer select,.food-order-chain__composer textarea { box-sizing:border-box; width:100%; border:1px solid rgba(255,255,255,.12); border-radius:.7rem; color:#edf8f6; background:rgba(255,255,255,.06); font:inherit; font-size:.72rem; }.food-order-chain__composer select { min-height:2.45rem; padding:.5rem .6rem; }.food-order-chain__composer textarea { min-height:3.1rem; padding:.55rem .6rem; resize:vertical; }.food-order-chain__primary,.food-order-chain__secondary { min-height:2.5rem; padding:.5rem .7rem; border-radius:.75rem; font-size:.7rem; font-weight:900; }.food-order-chain__primary { color:#06211e; background:#5ce0c5; }.food-order-chain__primary:disabled { opacity:.45; }.food-order-chain__secondary { color:#dbe7f3; background:rgba(255,255,255,.08); }.food-order-chain__actions { align-items:stretch; margin-top:.65rem; }.food-order-chain__actions > * { flex:1; }
</style>
