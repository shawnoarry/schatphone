<template>
  <section class="daon-detail" data-testid="mail-thread-detail" :aria-label="detailAriaLabel">
    <header class="daon-detail-toolbar">
      <button type="button" class="daon-detail-tool" :aria-label="backLabel" data-testid="mail-detail-back" @click="$emit('back')">
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
        <span class="daon-detail-tool__text">{{ backText }}</span>
      </button>
      <span class="daon-detail-toolbar__spacer"></span>
      <button
        type="button"
        class="daon-detail-tool"
        :class="{ 'is-on': starred }"
        :aria-label="starred ? unstarLabel : starLabel"
        data-testid="mail-detail-star"
        @click="$emit('toggle-star')"
      >
        <i class="fas fa-star" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="daon-detail-tool"
        :aria-label="toggleReadLabel"
        data-testid="mail-detail-toggle-read"
        @click="$emit('toggle-read')"
      >
        <i class="fas" :class="read ? 'fa-envelope' : 'fa-envelope-open'" aria-hidden="true"></i>
        <span class="daon-detail-tool__text">{{ read ? markUnreadText : markReadText }}</span>
      </button>
      <button
        v-if="archived"
        type="button"
        class="daon-detail-tool"
        :aria-label="unarchiveLabel"
        data-testid="mail-detail-unarchive"
        @click="$emit('unarchive')"
      >
        <i class="fas fa-inbox" aria-hidden="true"></i>
        <span class="daon-detail-tool__text">{{ unarchiveText }}</span>
      </button>
      <button
        v-else
        type="button"
        class="daon-detail-tool"
        :aria-label="archiveLabel"
        data-testid="mail-detail-archive"
        @click="$emit('archive')"
      >
        <i class="fas fa-box-archive" aria-hidden="true"></i>
        <span class="daon-detail-tool__text">{{ archiveText }}</span>
      </button>
    </header>

    <div class="daon-detail-scroll">
      <article class="daon-detail-article">
        <h2 class="daon-detail-subject">{{ subject }}</h2>

        <p v-if="mailCountLabel" class="daon-detail-count" data-testid="mail-detail-status">
          {{ mailCountLabel }}
        </p>

        <div
          v-for="mail in orderedMails"
          :key="mail.id"
          class="daon-detail-mail"
          :data-testid="`mail-detail-card-${mail.id}`"
        >
          <header class="daon-detail-mail__head">
            <span class="daon-detail-mail__avatar" :class="`is-tone-${thread.avatarTone}`" aria-hidden="true">
              {{ avatarText }}
            </span>
            <span class="daon-detail-mail__who">
              <span class="daon-detail-mail__name">{{ senderName }}</span>
              <span class="daon-detail-mail__address">{{ thread.senderAddress }}</span>
            </span>
            <span class="daon-detail-mail__time">{{ mail.timeLabel }}</span>
          </header>

          <div v-if="chips.length" class="daon-detail-mail__chips">
            <span v-for="chip in chips" :key="chip.id" class="daon-chip" :class="`is-tone-${chip.tone}`">
              {{ chip.text }}
            </span>
          </div>

          <div class="daon-detail-mail__body">
            <p v-for="(paragraph, index) in mail.body" :key="index">{{ paragraph }}</p>
          </div>

          <div v-if="mail.invite" class="daon-invite" :data-testid="`mail-invite-${mail.id}`">
            <div class="daon-invite__icon" aria-hidden="true">
              <i class="fas fa-calendar-check"></i>
            </div>
            <div class="daon-invite__meta">
              <p class="daon-invite__title">{{ mail.invite.title }}</p>
              <p class="daon-invite__when">{{ mail.invite.when }}</p>
              <p class="daon-invite__where">{{ mail.invite.where }}</p>
            </div>
            <button
              type="button"
              class="daon-invite__action"
              :data-testid="`mail-invite-open-${mail.id}`"
              @click="$emit('open-invite', {
                path: mail.invite.route,
                sourceRecordId: mail.id,
                calendarEventId: mail.invite.calendarEventId,
              })"
            >
              {{ mail.invite.action }}
              <i class="fas fa-arrow-right" aria-hidden="true"></i>
            </button>
          </div>

          <div v-if="mail.attachments && mail.attachments.length" class="daon-detail-attachments">
            <span
              v-for="file in mail.attachments"
              :key="file.id"
              class="daon-attachment"
              :data-testid="`mail-attachment-${file.id}`"
            >
              <i class="fas" :class="file.kind === 'img' ? 'fa-file-image' : 'fa-file-pdf'" aria-hidden="true"></i>
              <span class="daon-attachment__name">{{ file.name }}</span>
              <span class="daon-attachment__size">{{ file.size }}</span>
            </span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  thread: { type: Object, required: true },
  read: { type: Boolean, default: false },
  starred: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  senderName: { type: String, required: true },
  subject: { type: String, required: true },
  avatarText: { type: String, default: '' },
  chips: { type: Array, default: () => [] },
  mails: { type: Array, required: true },
  detailAriaLabel: { type: String, default: 'Mail thread' },
  backLabel: { type: String, default: 'Back' },
  backText: { type: String, default: '' },
  starLabel: { type: String, default: 'Star' },
  unstarLabel: { type: String, default: 'Unstar' },
  toggleReadLabel: { type: String, default: 'Toggle read' },
  markReadText: { type: String, default: '' },
  markUnreadText: { type: String, default: '' },
  archiveLabel: { type: String, default: 'Archive' },
  archiveText: { type: String, default: '' },
  unarchiveLabel: { type: String, default: 'Unarchive' },
  unarchiveText: { type: String, default: '' },
  mailCountLabel: { type: String, default: '' },
})

defineEmits(['back', 'toggle-star', 'toggle-read', 'archive', 'unarchive', 'open-invite'])

const orderedMails = computed(() => [...props.mails].sort((a, b) => b.offsetMinutes - a.offsetMinutes))
</script>

<style scoped>
.daon-detail {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  background: var(--daon-panel-soft);
}

.daon-detail-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--daon-line);
  background: var(--daon-panel);
}

.daon-detail-toolbar__spacer {
  flex: 1;
}

.daon-detail-tool {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  background: transparent;
  color: var(--daon-ink-soft);
  font: inherit;
  font-size: 13px;
  min-height: 44px;
  padding: 6px 10px;
  border-radius: var(--daon-radius-sm);
  cursor: pointer;
  transition: background-color var(--daon-motion), color var(--daon-motion);
}

.daon-detail-tool:hover {
  background: var(--daon-green-soft);
  color: var(--daon-ink);
}

.daon-detail-tool.is-on {
  color: var(--daon-star);
}

.daon-detail-tool__text {
  font-size: 12.5px;
}

.daon-detail-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.daon-detail-article {
  max-width: 780px;
  margin: 0 auto;
  padding: 24px clamp(14px, 3.5vw, 36px) 48px;
}

.daon-detail-subject {
  margin: 0 0 6px;
  font-size: clamp(18px, 2.6vw, 23px);
  line-height: 1.4;
  letter-spacing: -0.01em;
  font-weight: 800;
  color: var(--daon-ink);
  overflow-wrap: break-word;
}

.daon-detail-count {
  margin: 0 0 18px;
  font-size: 11.5px;
  color: var(--daon-ink-faint);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.daon-detail-mail {
  background: var(--daon-panel);
  border: 1px solid var(--daon-line);
  border-radius: var(--daon-radius);
  padding: 18px 20px;
  margin-bottom: 14px;
  box-shadow: var(--daon-shadow-card);
}

.daon-detail-mail__head {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--daon-line);
}

.daon-detail-mail__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 800;
}

.daon-detail-mail__avatar.is-tone-green {
  background: var(--daon-tone-green-soft);
  color: var(--daon-tone-green);
}
.daon-detail-mail__avatar.is-tone-blue {
  background: var(--daon-tone-blue-soft);
  color: var(--daon-tone-blue);
}
.daon-detail-mail__avatar.is-tone-rose {
  background: var(--daon-tone-rose-soft);
  color: var(--daon-tone-rose);
}
.daon-detail-mail__avatar.is-tone-amber {
  background: var(--daon-tone-amber-soft);
  color: var(--daon-tone-amber);
}
.daon-detail-mail__avatar.is-tone-violet {
  background: var(--daon-tone-violet-soft);
  color: var(--daon-tone-violet);
}
.daon-detail-mail__avatar.is-tone-teal {
  background: var(--daon-tone-teal-soft);
  color: var(--daon-tone-teal);
}
.daon-detail-mail__avatar.is-tone-slate {
  background: var(--daon-tone-slate-soft);
  color: var(--daon-tone-slate);
}

.daon-detail-mail__who {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.daon-detail-mail__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--daon-ink);
}

.daon-detail-mail__address {
  font-size: 11.5px;
  color: var(--daon-ink-faint);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daon-detail-mail__time {
  font-size: 11.5px;
  color: var(--daon-ink-faint);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.daon-detail-mail__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding-top: 12px;
}

.daon-chip {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 2.5px 9px;
  border-radius: 999px;
  white-space: nowrap;
}

.daon-chip.is-tone-green {
  background: var(--daon-tone-green-soft);
  color: var(--daon-tone-green);
}
.daon-chip.is-tone-blue {
  background: var(--daon-tone-blue-soft);
  color: var(--daon-tone-blue);
}
.daon-chip.is-tone-rose {
  background: var(--daon-tone-rose-soft);
  color: var(--daon-tone-rose);
}
.daon-chip.is-tone-amber {
  background: var(--daon-tone-amber-soft);
  color: var(--daon-tone-amber);
}
.daon-chip.is-tone-violet {
  background: var(--daon-tone-violet-soft);
  color: var(--daon-tone-violet);
}
.daon-chip.is-tone-teal {
  background: var(--daon-tone-teal-soft);
  color: var(--daon-tone-teal);
}
.daon-chip.is-tone-slate {
  background: var(--daon-tone-slate-soft);
  color: var(--daon-tone-slate);
}

.daon-detail-mail__body {
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.daon-detail-mail__body p {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.85;
  color: var(--daon-ink);
  overflow-wrap: break-word;
  white-space: pre-line;
}

.daon-invite {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 13px 15px;
  border: 1px solid var(--daon-accent-text);
  border-left: 4px solid var(--daon-accent-text);
  border-radius: var(--daon-radius);
  background: var(--daon-green-soft);
}

.daon-invite__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--daon-action-bg);
  color: #fff;
  font-size: 16px;
}

.daon-invite__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.daon-invite__title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 800;
  color: var(--daon-ink);
}

.daon-invite__when {
  margin: 0;
  font-size: 12px;
  color: var(--daon-accent-text);
  font-weight: 600;
}

.daon-invite__where {
  margin: 0;
  font-size: 11.5px;
  color: var(--daon-ink-faint);
}

.daon-invite__action {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  background: var(--daon-action-bg);
  color: #fff;
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--daon-motion);
}

.daon-invite__action:hover {
  background: var(--daon-action-hover);
}

.daon-detail-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 13px;
  border-top: 1px dashed var(--daon-line-strong);
}

.daon-attachment {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border: 1px solid var(--daon-line);
  border-radius: var(--daon-radius-sm);
  background: var(--daon-panel-soft);
  font-size: 11.5px;
  color: var(--daon-ink-soft);
  max-width: 100%;
}

.daon-attachment i {
  color: var(--daon-tone-amber);
  flex: none;
}

.daon-attachment__name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
}

.daon-attachment__size {
  color: var(--daon-ink-faint);
  font-variant-numeric: tabular-nums;
  flex: none;
}

.daon-detail-tool:focus-visible,
.daon-invite__action:focus-visible {
  outline: 3px solid var(--daon-focus);
  outline-offset: 2px;
}

@media (max-width: 700px) {
  .daon-detail-mail__head {
    grid-template-columns: 34px minmax(0, 1fr) auto;
  }

  .daon-detail-mail__avatar {
    width: 34px;
    height: 34px;
    font-size: 14px;
  }

  .daon-invite {
    grid-template-columns: minmax(0, 1fr);
    justify-items: start;
  }

  .daon-invite__icon {
    display: none;
  }

  .daon-detail-tool__text {
    display: none;
  }

  .daon-detail-tool:first-child .daon-detail-tool__text {
    display: inline;
  }
}

@media (max-width: 390px) {
  .daon-detail-article {
    padding: 16px 12px 40px;
  }

  .daon-detail-mail {
    padding: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .daon-detail-tool,
  .daon-invite__action {
    transition: none;
  }
}
</style>
