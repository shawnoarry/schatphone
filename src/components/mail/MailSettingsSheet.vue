<template>
  <div class="daon-mail-sheet-scrim" @click.self="$emit('close')">
    <section
      class="daon-mail-sheet"
      role="dialog"
      aria-modal="true"
      :aria-label="t('发件人白名单', 'Sender whitelist')"
      data-testid="mail-sender-sheet"
    >
      <header class="daon-mail-sheet__head">
        <h2 class="daon-mail-sheet__title">{{ t('发件人白名单', 'Sender whitelist') }}</h2>
        <button
          type="button"
          class="daon-mail-sheet__close"
          :aria-label="t('关闭', 'Close')"
          data-testid="mail-sender-sheet-close"
          @click="$emit('close')"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </header>

      <div class="daon-mail-sheet__body">
        <label class="daon-mail-sheet__toggle">
          <input
            type="checkbox"
            :checked="allowNewSenders"
            data-testid="mail-allow-new-senders"
            @change="$emit('toggle-allow-new', $event.target.checked)"
          />
          <span>
            {{ t('允许 AI 创造新发件人', 'Allow the AI to invent new senders') }}
            <small>{{ t('创造成功后会自动进入此名单，可随时删除。', 'Validated inventions join this list automatically and can be removed anytime.') }}</small>
          </span>
        </label>

        <ul class="daon-mail-sheet__list" role="list">
          <li v-for="sender in senders" :key="sender.id" role="listitem" class="daon-mail-sheet__sender">
            <span class="daon-mail-sheet__sender-meta">
              <strong>{{ sender.name }}</strong>
              <span class="daon-mail-sheet__sender-address">{{ sender.address }}</span>
            </span>
            <span class="daon-mail-sheet__origin" :class="`is-${sender.origin}`">
              {{ originLabel(sender.origin) }}
            </span>
            <button
              type="button"
              class="daon-mail-sheet__remove"
              :aria-label="t(`移除 ${sender.name}`, `Remove ${sender.name}`)"
              :data-testid="`mail-sender-remove-${sender.id}`"
              @click="$emit('remove', sender.id)"
            >
              <i class="fas fa-trash-can" aria-hidden="true"></i>
            </button>
          </li>
        </ul>

        <form class="daon-mail-sheet__add" @submit.prevent="submitAdd">
          <input
            v-model="newName"
            type="text"
            class="daon-mail-sheet__input"
            :placeholder="t('机构或角色名', 'Institution or role name')"
            :aria-label="t('名称', 'Name')"
            data-testid="mail-sender-add-name"
          />
          <input
            v-model="newAddress"
            type="text"
            class="daon-mail-sheet__input"
            :placeholder="t('name@example.kr', 'name@example.kr')"
            :aria-label="t('邮箱地址', 'Mail address')"
            data-testid="mail-sender-add-address"
          />
          <button
            type="submit"
            class="daon-mail-sheet__add-btn"
            :disabled="!newName.trim() || !newAddress.trim()"
            data-testid="mail-sender-add-submit"
          >
            {{ t('添加', 'Add') }}
          </button>
        </form>
        <p v-if="addError" class="daon-mail-sheet__error" role="alert" data-testid="mail-sender-add-error">
          {{ addError }}
        </p>

        <button
          type="button"
          class="daon-mail-sheet__restore"
          data-testid="mail-sender-restore"
          @click="$emit('restore')"
        >
          <i class="fas fa-rotate-left" aria-hidden="true"></i>
          {{ t('恢复默认机构名单', 'Restore default institutions') }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from '../../composables/useI18n'

defineProps({
  senders: { type: Array, required: true },
  allowNewSenders: { type: Boolean, default: true },
})

const emit = defineEmits(['close', 'toggle-allow-new', 'add', 'remove', 'restore'])

const { t } = useI18n()

const newName = ref('')
const newAddress = ref('')
const addError = ref('')

const originLabel = (origin) =>
  origin === 'fixture'
    ? t('默认', 'Default')
    : origin === 'generated'
      ? t('AI 新增', 'AI-added')
      : t('手动添加', 'Manual')

const submitAdd = () => {
  const name = newName.value.trim()
  const address = newAddress.value.trim()
  if (!name || !address) return
  const accepted = emit('add', { name, address })
  if (accepted === false) {
    addError.value = t('地址格式不正确，或已存在于名单中。', 'Invalid address, or it already exists in the list.')
    return
  }
  addError.value = ''
  newName.value = ''
  newAddress.value = ''
}
</script>

<style scoped>
.daon-mail-sheet-scrim {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(10, 16, 12, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

@media (min-width: 700px) {
  .daon-mail-sheet-scrim {
    align-items: center;
  }
}

.daon-mail-sheet {
  width: min(34rem, 100%);
  max-height: min(38rem, 86vh);
  display: flex;
  flex-direction: column;
  background: var(--daon-panel);
  border-radius: var(--daon-radius) var(--daon-radius) 0 0;
  border: 1px solid var(--daon-line);
  overflow: hidden;
}

@media (min-width: 700px) {
  .daon-mail-sheet {
    border-radius: var(--daon-radius);
  }
}

.daon-mail-sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--daon-line);
}

.daon-mail-sheet__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--daon-ink);
}

.daon-mail-sheet__close {
  border: none;
  background: transparent;
  color: var(--daon-ink-soft);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  cursor: pointer;
}

.daon-mail-sheet__close:hover {
  background: var(--daon-green-soft);
}

.daon-mail-sheet__body {
  padding: 14px 16px 18px;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.daon-mail-sheet__toggle {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  color: var(--daon-ink);
}

.daon-mail-sheet__toggle input {
  margin-top: 3px;
  width: 18px;
  height: 18px;
  accent-color: var(--daon-green);
  flex: none;
}

.daon-mail-sheet__toggle small {
  display: block;
  color: var(--daon-ink-faint);
  font-size: 11.5px;
}

.daon-mail-sheet__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--daon-line);
  border-radius: var(--daon-radius-sm);
  overflow: hidden;
}

.daon-mail-sheet__sender {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border-bottom: 1px solid var(--daon-line);
}

.daon-mail-sheet__sender:last-child {
  border-bottom: none;
}

.daon-mail-sheet__sender-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.daon-mail-sheet__sender-meta strong {
  font-size: 13px;
  color: var(--daon-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daon-mail-sheet__sender-address {
  font-size: 11px;
  color: var(--daon-ink-faint);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daon-mail-sheet__origin {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
  background: var(--daon-tone-slate-soft);
  color: var(--daon-tone-slate);
}

.daon-mail-sheet__origin.is-fixture {
  background: var(--daon-tone-green-soft);
  color: var(--daon-tone-green);
}

.daon-mail-sheet__origin.is-generated {
  background: var(--daon-tone-violet-soft);
  color: var(--daon-tone-violet);
}

.daon-mail-sheet__remove {
  border: none;
  background: transparent;
  color: var(--daon-ink-faint);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  cursor: pointer;
}

.daon-mail-sheet__remove:hover {
  color: var(--daon-tone-rose);
  background: var(--daon-tone-rose-soft);
}

.daon-mail-sheet__add {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 8px;
}

.daon-mail-sheet__input {
  border: 1px solid var(--daon-line);
  border-radius: var(--daon-radius-sm);
  background: var(--daon-panel-soft);
  color: var(--daon-ink);
  font: inherit;
  font-size: 16px;
  padding: 9px 11px;
  min-width: 0;
}

.daon-mail-sheet__input::placeholder {
  font-size: 12.5px;
  color: var(--daon-ink-faint);
}

.daon-mail-sheet__input:focus-visible {
  outline: 3px solid var(--daon-green);
  outline-offset: 1px;
}

.daon-mail-sheet__add-btn {
  border: none;
  background: var(--daon-green);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: var(--daon-radius-sm);
  cursor: pointer;
}

.daon-mail-sheet__add-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.daon-mail-sheet__error {
  margin: 0;
  font-size: 12px;
  color: var(--daon-tone-rose);
}

.daon-mail-sheet__restore {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: var(--daon-green-deep);
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  min-height: 44px;
  cursor: pointer;
}

.daon-mail-sheet__close:focus-visible,
.daon-mail-sheet__remove:focus-visible,
.daon-mail-sheet__add-btn:focus-visible,
.daon-mail-sheet__restore:focus-visible {
  outline: 3px solid var(--daon-green);
  outline-offset: 2px;
}

@media (max-width: 390px) {
  .daon-mail-sheet__add {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
