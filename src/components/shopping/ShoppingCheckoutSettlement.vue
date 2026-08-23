<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  storefront: { type: String, default: 'city_market' },
  languageBase: { type: String, default: 'zh' },
  addressOptions: { type: Array, default: () => [] },
  selectedAddressId: { type: String, default: '' },
  recipientName: { type: String, default: '' },
  recipientPhone: { type: String, default: '' },
  paymentOptions: { type: Array, default: () => [] },
  selectedPaymentCardId: { type: String, default: '' },
  currentLocation: { type: Object, default: null },
  totalLabel: { type: String, default: '' },
  feedback: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:selectedAddressId',
  'update:recipientName',
  'update:recipientPhone',
  'update:selectedPaymentCardId',
  'save-address',
  'submit',
])

const localize = (zh, en) => props.languageBase === 'zh' ? zh : en
const addressEditorOpen = ref(false)
const addressLabel = ref('')
const addressDetail = ref('')

watch(
  () => props.currentLocation,
  (location) => {
    if (addressEditorOpen.value) return
    addressLabel.value = location?.label || ''
    addressDetail.value = location?.detail || ''
  },
  { immediate: true, deep: true },
)

const selectedAddress = computed(() =>
  props.addressOptions.find((option) => option.id === props.selectedAddressId) || null,
)
const selectedPayment = computed(() =>
  props.paymentOptions.find((option) => option.cardId === props.selectedPaymentCardId) || null,
)
const canSaveAddress = computed(() => Boolean(
  addressLabel.value.trim() &&
  addressDetail.value.trim() &&
  props.currentLocation?.position,
))
const canSubmit = computed(() => Boolean(
  selectedAddress.value &&
  props.recipientName.trim() &&
  selectedPayment.value?.available &&
  !props.busy,
))

const saveAddress = () => {
  if (!canSaveAddress.value) return
  emit('save-address', {
    label: addressLabel.value.trim(),
    detail: addressDetail.value.trim(),
  })
  addressEditorOpen.value = false
}
</script>

<template>
  <section class="checkout-settlement" :data-storefront="storefront" data-testid="shopping-checkout-settlement">
    <div class="settlement-section settlement-address">
      <header>
        <span>01</span>
        <div>
          <small>{{ localize('收货地址', 'DELIVERY ADDRESS') }}</small>
          <strong>{{ selectedAddress?.label || localize('请选择地址', 'Choose an address') }}</strong>
        </div>
        <button type="button" data-testid="shopping-checkout-new-address" @click="addressEditorOpen = !addressEditorOpen">
          {{ addressEditorOpen ? localize('收起', 'CLOSE') : localize('新增', 'ADD') }}
        </button>
      </header>
      <div class="address-list" data-testid="shopping-checkout-address-list">
        <button
          v-for="option in addressOptions"
          :key="option.id"
          type="button"
          :class="{ selected: option.id === selectedAddressId }"
          :aria-pressed="option.id === selectedAddressId"
          :data-testid="`shopping-checkout-address-${option.id}`"
          @click="emit('update:selectedAddressId', option.id)"
        >
          <i :class="option.kind === 'current' ? 'fas fa-location-crosshairs' : 'fas fa-location-dot'" aria-hidden="true"></i>
          <span><strong>{{ option.label }}</strong><small>{{ option.detail }}</small></span>
          <i class="fas fa-check" aria-hidden="true"></i>
        </button>
      </div>
      <div v-if="addressEditorOpen" class="address-editor" data-testid="shopping-checkout-address-editor">
        <p>{{ localize('新地址会保存到 Map 地址簿，并绑定当前地图位置。', 'The new address is saved to Map and anchored to the current map position.') }}</p>
        <input v-model="addressLabel" :placeholder="localize('地址名称，例如：家', 'Label, for example Home')" data-testid="shopping-checkout-address-label" />
        <textarea v-model="addressDetail" :placeholder="localize('门牌、楼层与详细地址', 'Street, building, floor, and unit')" data-testid="shopping-checkout-address-detail"></textarea>
        <button type="button" :disabled="!canSaveAddress" data-testid="shopping-checkout-save-address" @click="saveAddress">
          {{ localize('保存到 Map 地址簿', 'SAVE TO MAP') }}
        </button>
        <small v-if="!currentLocation?.position">{{ localize('请先在 Map 设置有坐标的当前位置。', 'Set a positioned current location in Map first.') }}</small>
      </div>
    </div>

    <div class="settlement-section settlement-recipient">
      <header><span>02</span><div><small>{{ localize('收件信息', 'RECIPIENT') }}</small><strong>{{ localize('配送联系信息', 'Delivery contact') }}</strong></div></header>
      <div class="recipient-fields">
        <input :value="recipientName" :placeholder="localize('收件人姓名', 'Recipient name')" data-testid="shopping-checkout-recipient" @input="emit('update:recipientName', $event.target.value)" />
        <input :value="recipientPhone" inputmode="tel" :placeholder="localize('联系电话（选填）', 'Phone (optional)')" data-testid="shopping-checkout-phone" @input="emit('update:recipientPhone', $event.target.value)" />
      </div>
    </div>

    <div class="settlement-section settlement-payment">
      <header><span>03</span><div><small>{{ localize('付款方式', 'PAYMENT') }}</small><strong>{{ localize('从 Wallet 安全付款', 'Pay securely with Wallet') }}</strong></div></header>
      <div class="payment-list" data-testid="shopping-checkout-payment-list">
        <button
          v-for="option in paymentOptions"
          :key="option.cardId"
          type="button"
          :disabled="!option.available"
          :class="{ selected: option.cardId === selectedPaymentCardId }"
          :aria-pressed="option.cardId === selectedPaymentCardId"
          :data-testid="`shopping-checkout-payment-${option.cardId}`"
          @click="emit('update:selectedPaymentCardId', option.cardId)"
        >
          <i class="fas fa-credit-card" aria-hidden="true"></i>
          <span><strong>{{ option.label }}</strong><small>{{ option.balanceLabel }}</small></span>
          <em>{{ option.available ? localize('可用', 'READY') : option.reasonLabel }}</em>
        </button>
      </div>
    </div>

    <div class="settlement-submit">
      <div><small>{{ localize('实付', 'PAY NOW') }}</small><strong>{{ totalLabel }}</strong></div>
      <button type="button" :disabled="!canSubmit" data-testid="shopping-payment-submit" @click="emit('submit')">
        <i class="fas fa-lock" aria-hidden="true"></i>
        {{ busy ? localize('正在付款…', 'PAYING…') : localize('付款并提交订单', 'PAY & PLACE ORDER') }}
      </button>
      <p v-if="feedback" data-testid="shopping-checkout-feedback">{{ feedback }}</p>
    </div>
  </section>
</template>

<style scoped>
.checkout-settlement{--accent:#1769e0;--ink:#111827;--paper:#fff;--soft:#f3f6fb;display:grid;gap:10px;margin-top:18px;color:var(--ink);font-family:Arial,"Noto Sans KR",sans-serif}.settlement-section,.settlement-submit{padding:14px;border:1px solid color-mix(in srgb,var(--accent) 24%,#cbd5e1);background:var(--paper)}.settlement-section>header{display:grid;grid-template-columns:24px 1fr auto;gap:9px;align-items:center}.settlement-section>header>span{width:24px;height:24px;display:grid;place-items:center;color:#fff;background:var(--accent);font-size:8px;font-weight:900}.settlement-section header small,.settlement-section header strong{display:block}.settlement-section header small{color:var(--accent);font-size:7px;font-weight:900;letter-spacing:.08em}.settlement-section header strong{margin-top:2px;font-size:11px}.settlement-section header button{color:var(--accent);font-size:8px;font-weight:900}.address-list,.payment-list{display:grid;gap:6px;margin-top:11px}.address-list>button,.payment-list>button{min-height:48px;padding:9px;display:grid;grid-template-columns:24px 1fr auto;gap:8px;align-items:center;text-align:left;border:1px solid #d8dee8;background:var(--soft)}.address-list>button>i:first-child,.payment-list>button>i{color:var(--accent)}.address-list>button>i:last-child{opacity:0}.address-list>button.selected,.payment-list>button.selected{border-color:var(--accent);box-shadow:inset 3px 0 var(--accent)}.address-list>button.selected>i:last-child{opacity:1}.address-list strong,.address-list small,.payment-list strong,.payment-list small{display:block}.address-list strong,.payment-list strong{font-size:9px}.address-list small,.payment-list small{margin-top:3px;color:#687386;font-size:7px;line-height:1.35}.payment-list em{color:var(--accent);font-size:7px;font-style:normal;font-weight:900}.payment-list button:disabled{opacity:.48}.address-editor{margin-top:9px;padding:10px;background:var(--soft)}.address-editor p,.address-editor>small{font-size:7px;line-height:1.5}.address-editor input,.address-editor textarea,.recipient-fields input{width:100%;margin-top:7px;padding:9px;border:1px solid #cbd5e1;background:#fff;font-size:9px}.address-editor textarea{min-height:64px;resize:vertical}.address-editor button{width:100%;min-height:38px;margin-top:7px;color:#fff;background:var(--accent);font-size:8px;font-weight:900}.address-editor button:disabled{opacity:.4}.recipient-fields{display:grid;grid-template-columns:1fr 1fr;gap:7px}.settlement-submit{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;color:#fff;background:var(--ink)}.settlement-submit small,.settlement-submit strong{display:block}.settlement-submit small{color:color-mix(in srgb,var(--accent) 72%,#fff);font-size:7px;font-weight:900}.settlement-submit strong{margin-top:3px;font-size:16px}.settlement-submit button{min-height:44px;padding:0 14px;color:#fff;background:var(--accent);font-size:8px;font-weight:900}.settlement-submit button:disabled{opacity:.38}.settlement-submit p{grid-column:1/-1;margin:0;color:#ffd7d7;font-size:8px;line-height:1.5}.checkout-settlement[data-storefront="tech_catalog"]{--accent:#ff4800;--ink:#111;--soft:#f5f4f0}.checkout-settlement[data-storefront="fresh_market"]{--accent:#5f247d;--ink:#2c1538;--soft:#f6eff8}.checkout-settlement[data-storefront="fashion_editorial"]{--accent:#d32f2f;--ink:#111;--soft:#eee}.checkout-settlement[data-storefront="room_planner"]{--accent:#0058a3;--ink:#102f4a;--soft:#eef5fb}.checkout-settlement[data-storefront="care_lab"]{--accent:#6d961d;--ink:#26311f;--soft:#f4f7ee}.checkout-settlement[data-storefront="member_warehouse"]{--accent:#f4b719;--ink:#142d58;--soft:#edf0f4}.checkout-settlement[data-storefront="neighborhood_convenience"]{--accent:#7356a5;--ink:#17243b;--soft:#f2eff8}.checkout-settlement[data-storefront="fashion_catalog"]{--accent:#111;--ink:#111;--soft:#f1f1f1}.checkout-settlement[data-storefront="buyer_atelier"]{--accent:#6f513c;--ink:#2f241d;--soft:#f4efe9}.checkout-settlement[data-storefront="luxury_hall"]{--accent:#b79b5d;--ink:#191713;--soft:#f4f0e7}@media(max-width:560px){.recipient-fields{grid-template-columns:1fr}.settlement-submit{grid-template-columns:1fr}.settlement-submit button{width:100%}}
</style>
