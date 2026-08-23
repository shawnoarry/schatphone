<template>
  <div
    class="daon-mail-app"
    :class="{ 'is-night': isNightTheme, 'show-read-pane': mobilePane !== 'list' }"
    data-app="mail"
    data-testid="daon-mail-app"
  >
    <header class="daon-mail-header">
      <button
        type="button"
        class="daon-mail-header__back"
        :aria-label="t('返回主屏幕', 'Back to Home')"
        data-testid="mail-home-back"
        @click="goHome"
      >
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>

      <div class="daon-mail-brand">
        <span class="daon-mail-brand__mark" aria-hidden="true">D</span>
        <span class="daon-mail-brand__meta">
          <span class="daon-mail-brand__word">{{ isZh ? brand.wordmarkZh : brand.wordmarkEn }}</span>
          <span class="daon-mail-brand__tag">{{ isZh ? brand.taglineZh : brand.taglineEn }}</span>
        </span>
      </div>

      <span class="daon-mail-header__spacer"></span>

      <button
        type="button"
        class="daon-mail-header__rail-toggle"
        :aria-expanded="railOpen ? 'true' : 'false'"
        :aria-label="t('文件夹', 'Folders')"
        data-testid="mail-rail-toggle"
        @click="railOpen = !railOpen"
      >
        <i class="fas fa-bars" aria-hidden="true"></i>
      </button>

      <button
        type="button"
        class="daon-mail-header__senders"
        :aria-label="t('发件人白名单设置', 'Sender whitelist settings')"
        data-testid="mail-senders-open"
        @click="openSenderSettings"
      >
        <i class="fas fa-user-gear" aria-hidden="true"></i>
      </button>

      <button
        type="button"
        class="daon-mail-header__receive"
        :class="{ 'is-loading': receiveStatus === 'loading' }"
        :disabled="receiveStatus === 'loading'"
        :aria-label="t('接收新邮件', 'Receive new mail')"
        data-testid="mail-receive"
        @click="receiveMail"
      >
        <i
          class="fas"
          :class="receiveStatus === 'loading' ? 'fa-circle-notch fa-spin' : 'fa-envelope-circle-check'"
          aria-hidden="true"
        ></i>
        <span class="daon-mail-header__receive-text">{{ t('接收', 'Receive') }}</span>
      </button>

      <button
        type="button"
        class="daon-mail-header__compose"
        :aria-label="t('写新邮件', 'Compose new mail')"
        data-testid="mail-compose-open"
        @click="openCompose"
      >
        <i class="fas fa-pen-to-square" aria-hidden="true"></i>
        <span>{{ t('写邮件', 'Write') }}</span>
      </button>
    </header>

    <div
      v-if="receiveStatus !== 'idle'"
      class="daon-mail-arrival"
      :class="`is-${receiveStatus}`"
      role="status"
      data-testid="mail-arrival-status"
    >
      <template v-if="receiveStatus === 'loading'">
        <i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i>
        {{ t('正在接收新邮件…', 'Receiving new mail…') }}
      </template>
      <template v-else-if="receiveStatus === 'success'">
        <i class="fas fa-circle-check" aria-hidden="true"></i>
        {{ t('收到 1 封新邮件', '1 new letter arrived') }}
      </template>
      <template v-else>
        <span class="daon-mail-arrival__error">{{ arrivalErrorText }}</span>
        <button
          type="button"
          class="daon-mail-arrival__action"
          data-testid="mail-arrival-retry"
          @click="receiveMail"
        >
          {{ t('重试', 'Retry') }}
        </button>
        <button
          v-if="receiveErrorCode === 'PROVIDER_MISSING'"
          type="button"
          class="daon-mail-arrival__action"
          data-testid="mail-arrival-settings"
          @click="openNetworkSettings"
        >
          {{ t('去设置', 'Set up') }}
        </button>
      </template>
    </div>

    <div class="daon-mail-body">
      <aside class="daon-mail-body__rail">
        <MailFolderRail
          :folders="folderRows"
          :account="accountRow"
          :rail-aria-label="t('邮件文件夹', 'Mail folders')"
          :foot-note="isZh ? brand.taglineZh : brand.taglineEn"
          @select="selectFolder"
        />
      </aside>

      <div class="daon-mail-body__list">
        <MailThreadList
          :rows="visibleRows"
          :search-query="searchQuery"
          :search-placeholder="t('搜索发件人、主题、正文', 'Search senders, subjects, bodies')"
          :search-aria-label="t('搜索邮件', 'Search mail')"
          :clear-search-label="t('清除搜索', 'Clear search')"
          :result-meta="resultMeta"
          :list-aria-label="t('邮件列表', 'Mail list')"
          :empty-icon="emptyIcon"
          :empty-title="emptyTitle"
          :empty-hint="emptyHint"
          :star-label="(name) => t(`星标 ${name}`, `Star ${name}`)"
          :unstar-label="(name) => t(`取消星标 ${name}`, `Unstar ${name}`)"
          :delete-draft-label="(subject) => t(`删除草稿 ${subject}`, `Delete draft ${subject}`)"
          @select="openRow"
          @toggle-star="toggleThreadStar"
          @delete-draft="removeDraft"
          @update:search-query="searchQuery = $event"
        />
      </div>

      <div class="daon-mail-body__read">
        <MailCompose
          v-if="rightPane === 'compose'"
          :draft="editingDraft"
          :saved-note="composeSavedNote"
          :compose-aria-label="t('写邮件', 'Compose mail')"
          :cancel-label="t('取消撰写', 'Cancel compose')"
          :cancel-text="t('取消', 'Cancel')"
          :save-draft-label="t('保存草稿', 'Save draft')"
          :save-draft-text="t('存草稿', 'Draft')"
          :send-label="t('保存到本地发件箱（不会投递）', 'Save to local Sent (not delivered)')"
          :send-text="t('存入发件箱', 'Save to Sent')"
          :to-label="t('收件人', 'To')"
          :to-placeholder="t('someone@example.kr', 'someone@example.kr')"
          :subject-label="t('主题', 'Subject')"
          :subject-placeholder="t('写下这封信的主题', 'Subject of this letter')"
          :body-label="t('正文', 'Body')"
          :body-placeholder="t('从这里开始写信…', 'Start writing here…')"
          @cancel="cancelCompose"
          @save="handleSaveDraft"
          @send="handleSend"
        />

        <MailThreadDetail
          v-else-if="detailView"
          :thread="detailView.thread"
          :read="detailView.read"
          :starred="detailView.starred"
          :archived="detailView.archived"
          :sender-name="detailView.senderName"
          :subject="detailView.subject"
          :avatar-text="detailView.avatarText"
          :chips="detailView.chips"
          :mails="detailView.mails"
          :detail-aria-label="t('邮件详情', 'Mail detail')"
          :back-label="t('返回列表', 'Back to list')"
          :back-text="t('返回', 'Back')"
          :star-label="t('星标', 'Star')"
          :unstar-label="t('取消星标', 'Unstar')"
          :toggle-read-label="detailView.read ? t('标为未读', 'Mark unread') : t('标为已读', 'Mark read')"
          :mark-read-text="t('已读', 'Read')"
          :mark-unread-text="t('未读', 'Unread')"
          :archive-label="t('归档', 'Archive')"
          :archive-text="t('归档', 'Archive')"
          :unarchive-label="t('移回收件箱', 'Move to inbox')"
          :unarchive-text="t('移回', 'Restore')"
          :mail-count-label="detailView.mailCountLabel"
          @back="backToList"
          @toggle-star="toggleStarForSelected"
          @toggle-read="toggleReadForSelected"
          @archive="archiveSelected"
          @unarchive="unarchiveSelected"
          @open-invite="openInvite"
        />

        <div v-else class="daon-mail-placeholder" data-testid="mail-read-placeholder">
          <i class="fas fa-envelope-open-text daon-mail-placeholder__icon" aria-hidden="true"></i>
          <p class="daon-mail-placeholder__title">{{ t('选择一封邮件', 'Select a letter') }}</p>
          <p class="daon-mail-placeholder__hint">
            {{ t('从列表中选择一封邮件，在这里阅读。', 'Pick a letter from the list to read it here.') }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="railOpen"
      class="daon-mail-drawer"
      data-testid="mail-rail-drawer"
    >
      <button
        type="button"
        class="daon-mail-drawer__scrim"
        :aria-label="t('关闭文件夹', 'Close folders')"
        @click="railOpen = false"
      ></button>
      <div class="daon-mail-drawer__panel">
        <MailFolderRail
          :folders="folderRows"
          :account="accountRow"
          :rail-aria-label="t('邮件文件夹', 'Mail folders')"
          :foot-note="isZh ? brand.taglineZh : brand.taglineEn"
          @select="selectFolder"
        />
        <button
          type="button"
          class="daon-mail-drawer__settings"
          data-testid="mail-drawer-senders-open"
          @click="openSenderSettings"
        >
          <i class="fas fa-user-gear" aria-hidden="true"></i>
          <span>{{ t('发件人设置', 'Sender settings') }}</span>
        </button>
      </div>
    </div>

    <MailSettingsSheet
      v-if="sendersSheetOpen"
      :senders="senders"
      :allow-new-senders="allowNewSenders"
      @close="sendersSheetOpen = false"
      @toggle-allow-new="setAllowNewSenders"
      @add="handleAddSender"
      @remove="removeSender"
      @restore="restoreDefaults"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  MAIL_SHELL_ACCOUNT,
  MAIL_SHELL_BRAND,
  MAIL_SHELL_FOLDERS,
  MAIL_SHELL_LABELS,
  MAIL_SHELL_THREADS,
  formatMailShellTime,
} from '../lib/mail-shell-data'
import {
  receiveMailArrival,
  resolveMailArrivalErrorCopy,
  resolveMailArrivalLanguageName,
} from '../lib/mail-shell-arrival'
import { useMailShellState } from '../composables/useMailShellState'
import { useMailShellSenders } from '../composables/useMailShellSenders'
import { resolveActiveWorldOverview } from '../lib/world-interface'
import { CONTACTS_ENTITY_TYPES } from '../lib/profile-template-schema'
import MailFolderRail from '../components/mail/MailFolderRail.vue'
import MailThreadList from '../components/mail/MailThreadList.vue'
import MailThreadDetail from '../components/mail/MailThreadDetail.vue'
import MailCompose from '../components/mail/MailCompose.vue'
import MailSettingsSheet from '../components/mail/MailSettingsSheet.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const { t, isZh, languageBase } = useI18n()

const isNightTheme = computed(() => systemStore.settings.appearance.currentTheme === 'zen')
const brand = MAIL_SHELL_BRAND

const {
  drafts,
  sentMails,
  receivedMails,
  isThreadRead,
  isThreadStarred,
  isThreadArchived,
  toggleThreadRead,
  markThreadRead,
  toggleThreadStar,
  archiveThread,
  unarchiveThread,
  saveDraft,
  deleteDraft,
  sendMail,
  receiveGeneratedMail,
} = useMailShellState()

const {
  senders,
  allowNewSenders,
  addSender,
  removeSender,
  enrollGeneratedSender,
  setAllowNewSenders,
  restoreDefaults,
} = useMailShellSenders()

const activeFolderId = ref('inbox')
const selectedRowId = ref('')
const rightPane = ref('detail')
const searchQuery = ref('')
const railOpen = ref(false)
const editingDraft = ref(null)
const composeSavedNote = ref('')
const nowMs = ref(Date.now())
const receiveStatus = ref('idle')
const receiveErrorCode = ref('')
const sendersSheetOpen = ref(false)

const activeFolderIdValue = computed(() => activeFolderId.value)

const fixtureThreadsByFolder = (folderId) =>
  MAIL_SHELL_THREADS.filter((thread) => thread.folder === folderId)

const inboxThreads = computed(() =>
  fixtureThreadsByFolder('inbox').filter((thread) => !isThreadArchived(thread.id)),
)
const spamThreads = computed(() =>
  fixtureThreadsByFolder('spam').filter((thread) => !isThreadArchived(thread.id)),
)
const archivedThreads = computed(() => MAIL_SHELL_THREADS.filter((thread) => isThreadArchived(thread.id)))
const starredThreads = computed(() =>
  MAIL_SHELL_THREADS.filter((thread) => isThreadStarred(thread.id) && !isThreadArchived(thread.id)),
)
const receivedNotArchived = computed(() =>
  receivedMails.value.filter((mail) => !isThreadArchived(mail.id)),
)
const archivedReceived = computed(() => receivedMails.value.filter((mail) => isThreadArchived(mail.id)))
const starredReceived = computed(() => receivedMails.value.filter((mail) => isThreadStarred(mail.id) && !isThreadArchived(mail.id)))

const isThreadUnread = (thread) => thread.defaultUnread && !isThreadRead(thread.id)

const unreadInboxCount = computed(
  () =>
    inboxThreads.value.filter(isThreadUnread).length +
    receivedNotArchived.value.filter((mail) => !isThreadRead(mail.id)).length,
)

const folderRows = computed(() =>
  MAIL_SHELL_FOLDERS.map((folder) => {
    let count = 0
    let unread = false
    if (folder.id === 'inbox') {
      count = unreadInboxCount.value
      unread = true
    } else if (folder.id === 'starred') count = starredThreads.value.length
    else if (folder.id === 'sent') count = sentMails.value.length
    else if (folder.id === 'drafts') count = drafts.value.length
    else if (folder.id === 'archive') count = archivedThreads.value.length
    else if (folder.id === 'spam') count = spamThreads.value.length
    return {
      id: folder.id,
      icon: folder.icon,
      label: isZh.value ? folder.nameZh : folder.nameEn,
      count,
      unread,
      active: folder.id === activeFolderIdValue.value,
    }
  }),
)

const accountRow = computed(() => ({
  avatarText: isZh.value ? '我' : 'Me',
  name: isZh.value ? MAIL_SHELL_ACCOUNT.nameZh : MAIL_SHELL_ACCOUNT.nameEn,
  address: MAIL_SHELL_ACCOUNT.address,
  plan: isZh.value ? MAIL_SHELL_ACCOUNT.planZh : MAIL_SHELL_ACCOUNT.planEn,
}))

const resolveChips = (labelIds) =>
  (labelIds || [])
    .map((labelId) => MAIL_SHELL_LABELS[labelId])
    .filter(Boolean)
    .map((label) => ({ id: label.id, tone: label.tone, text: isZh.value ? label.zh : label.en }))

const clipText = (text, limit = 92) =>
  typeof text === 'string' && text.length > limit ? `${text.slice(0, limit)}…` : text || ''

const timeLabelForOffset = (offsetMinutes) =>
  formatMailShellTime(nowMs.value, offsetMinutes, isZh.value)

const threadToRow = (thread) => {
  const latest = thread.mails[0]
  return {
    id: thread.id,
    variant: 'fixture',
    avatarText: Array.from(isZh.value ? thread.senderNameZh : thread.senderNameEn)[0] || '邮',
    avatarTone: thread.avatarTone,
    title: isZh.value ? thread.senderNameZh : thread.senderNameEn,
    timeLabel: timeLabelForOffset(latest.offsetMinutes),
    subject: isZh.value ? latest.subjectZh : latest.subjectEn,
    preview: clipText(isZh.value ? latest.bodyZh[0] : latest.bodyEn[0]),
    chips: resolveChips(thread.labelIds),
    unread: isThreadUnread(thread),
    starred: isThreadStarred(thread.id),
    hasAttachment: thread.mails.some((mail) => mail.attachments && mail.attachments.length),
    selected: thread.id === selectedRowId.value,
  }
}

const draftOffsetMinutes = (at) => Math.round((at - nowMs.value) / 60_000)

const draftToRow = (draft) => ({
  id: draft.id,
  variant: 'draft',
  avatarText: isZh.value ? '草' : 'D',
  avatarTone: 'slate',
  title: draft.to || t('（未填收件人）', '(no recipient)'),
  timeLabel: timeLabelForOffset(draftOffsetMinutes(draft.savedAt || draft.at)),
  subject: draft.subject || t('（无主题草稿）', '(untitled draft)'),
  preview: clipText(draft.body),
  chips: [],
  unread: false,
  starred: undefined,
  hasAttachment: false,
  deletable: true,
  selected: false,
})

const sentToRow = (mail) => ({
  id: mail.id,
  variant: 'sent',
  avatarText: isZh.value ? '我' : 'M',
  avatarTone: 'green',
  title: mail.to || t('（未填收件人）', '(no recipient)'),
  timeLabel: timeLabelForOffset(draftOffsetMinutes(mail.sentAt || mail.at)),
  subject: mail.subject || t('（无主题）', '(no subject)'),
  preview: clipText(mail.body),
  chips: [],
  unread: false,
  starred: undefined,
  hasAttachment: false,
  selected: mail.id === selectedRowId.value,
})

const receivedToRow = (mail) => ({
  id: mail.id,
  variant: 'received',
  avatarText: Array.from(mail.senderName)[0] || (isZh.value ? '邮' : 'M'),
  avatarTone: senders.value.find((sender) => sender.address === mail.senderAddress)?.tone || 'slate',
  title: mail.senderName,
  timeLabel: timeLabelForOffset(draftOffsetMinutes(mail.arrivedAt)),
  subject: mail.subject,
  preview: clipText(mail.body[0]),
  chips: resolveChips(mail.label ? [mail.label] : []),
  unread: !isThreadRead(mail.id),
  starred: isThreadStarred(mail.id),
  hasAttachment: false,
  selected: mail.id === selectedRowId.value,
})

const queryText = computed(() => searchQuery.value.trim().toLowerCase())

const fixtureThreadMatchesQuery = (thread, query) => {
  if (!query) return true
  const haystack = [
    thread.senderNameZh,
    thread.senderNameEn,
    thread.senderAddress,
    ...thread.mails.flatMap((mail) => [
      mail.subjectZh,
      mail.subjectEn,
      ...(mail.bodyZh || []),
      ...(mail.bodyEn || []),
    ]),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()
  return haystack.includes(query)
}

const localRecordMatchesQuery = (record, query) => {
  if (!query) return true
  return [record.to, record.subject, record.body]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()
    .includes(query)
}

const receivedRecordMatchesQuery = (record, query) => {
  if (!query) return true
  return [record.senderName, record.senderAddress, record.subject, ...(record.body || [])]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()
    .includes(query)
}

const baseRows = computed(() => {
  const folderId = activeFolderIdValue.value
  if (folderId === 'inbox') {
    return [...receivedNotArchived.value.map(receivedToRow), ...inboxThreads.value.map(threadToRow)]
  }
  if (folderId === 'starred') {
    return [...starredReceived.value.map(receivedToRow), ...starredThreads.value.map(threadToRow)]
  }
  if (folderId === 'spam') return spamThreads.value.map(threadToRow)
  if (folderId === 'archive') {
    return [...archivedReceived.value.map(receivedToRow), ...archivedThreads.value.map(threadToRow)]
  }
  if (folderId === 'drafts') return drafts.value.map(draftToRow)
  if (folderId === 'sent') return sentMails.value.map(sentToRow)
  return []
})

const visibleRows = computed(() => {
  const query = queryText.value
  if (!query) return baseRows.value
  if (['drafts', 'sent'].includes(activeFolderIdValue.value)) {
    const records =
      activeFolderIdValue.value === 'drafts'
        ? drafts.value.map((draft) => ({ ...draft, at: draft.savedAt }))
        : sentMails.value.map((mail) => ({ ...mail, at: mail.sentAt }))
    const allowedIds = new Set(records.filter((record) => localRecordMatchesQuery(record, query)).map((record) => record.id))
    return baseRows.value.filter((row) => allowedIds.has(row.id))
  }
  const allowedIds = new Set(
    MAIL_SHELL_THREADS.filter((thread) => fixtureThreadMatchesQuery(thread, query)).map((thread) => thread.id),
  )
  receivedMails.value
    .filter((mail) => receivedRecordMatchesQuery(mail, query))
    .forEach((mail) => allowedIds.add(mail.id))
  return baseRows.value.filter((row) => allowedIds.has(row.id))
})

const resultMeta = computed(() => {
  if (!queryText.value) return ''
  return t(
    `${visibleRows.value.length} 封相关邮件`,
    `${visibleRows.value.length} matching letter${visibleRows.value.length === 1 ? '' : 's'}`,
  )
})

const EMPTY_STATES = {
  inbox: { icon: 'fas fa-inbox' },
  starred: { icon: 'fas fa-star' },
  sent: { icon: 'fas fa-paper-plane' },
  drafts: { icon: 'fas fa-file-lines' },
  archive: { icon: 'fas fa-box-archive' },
  spam: { icon: 'fas fa-ban' },
}

const emptyIcon = computed(() => {
  if (queryText.value) return 'fas fa-magnifying-glass'
  return EMPTY_STATES[activeFolderIdValue.value]?.icon || 'fas fa-inbox'
})

const emptyTitle = computed(() => {
  if (queryText.value) return t('没有匹配的邮件', 'No matching letters')
  const folderId = activeFolderIdValue.value
  if (folderId === 'starred') return t('还没有星标邮件', 'No starred letters yet')
  if (folderId === 'sent') return t('还没有发送过邮件', 'Nothing sent yet')
  if (folderId === 'drafts') return t('没有草稿', 'No drafts')
  if (folderId === 'archive') return t('归档箱是空的', 'Archive is empty')
  if (folderId === 'spam') return t('垃圾邮件是空的', 'Spam is empty')
  return t('收件箱是空的', 'Inbox is clear')
})

const emptyHint = computed(() => {
  if (queryText.value) return t('换个关键词试试发件人、主题或正文。', 'Try another keyword for sender, subject, or body.')
  const folderId = activeFolderIdValue.value
  if (folderId === 'starred') return t('点列表右侧的星形，把重要邮件收进这里。', 'Tap the star beside a letter to collect it here.')
  if (folderId === 'sent') return t('写一封信，发送后会保存在这里。', 'Write a letter; sent mail is kept here.')
  if (folderId === 'drafts') return t('撰写中点“存草稿”，信会暂存在这里。', 'Tap Draft while writing to park a letter here.')
  if (folderId === 'archive') return t('读完后归档的邮件会收进这里。', 'Letters you archive after reading land here.')
  if (folderId === 'spam') return t('可疑邮件会被过滤器放进来。', 'Suspicious letters land here after filtering.')
  return t('新的邮件会出现在这里。', 'New letters will arrive here.')
})

const selectedFixtureThread = computed(() =>
  MAIL_SHELL_THREADS.find((thread) => thread.id === selectedRowId.value) || null,
)
const selectedReceivedMail = computed(
  () => receivedMails.value.find((mail) => mail.id === selectedRowId.value) || null,
)
const selectedSentMail = computed(
  () => sentMails.value.find((mail) => mail.id === selectedRowId.value) || null,
)

const detailView = computed(() => {
  const thread = selectedFixtureThread.value
  if (thread) {
    const latest = thread.mails[0]
    return {
      thread,
      read: isThreadRead(thread.id),
      starred: isThreadStarred(thread.id),
      archived: isThreadArchived(thread.id),
      senderName: isZh.value ? thread.senderNameZh : thread.senderNameEn,
      subject: isZh.value ? latest.subjectZh : latest.subjectEn,
      avatarText: Array.from(isZh.value ? thread.senderNameZh : thread.senderNameEn)[0] || '邮',
      chips: resolveChips(thread.labelIds),
      mails: thread.mails.map((mail) => ({
        id: mail.id,
        offsetMinutes: mail.offsetMinutes,
        timeLabel: timeLabelForOffset(mail.offsetMinutes),
        body: isZh.value ? mail.bodyZh : mail.bodyEn,
        invite: mail.invite
          ? {
              route: mail.invite.route,
              title: isZh.value ? mail.invite.titleZh : mail.invite.titleEn,
              when: isZh.value ? mail.invite.whenZh : mail.invite.whenEn,
              where: isZh.value ? mail.invite.whereZh : mail.invite.whereEn,
              action: isZh.value ? mail.invite.actionZh : mail.invite.actionEn,
            }
          : null,
        attachments: (mail.attachments || []).map((file) => ({
          id: file.id,
          name: file.name,
          kind: file.kind,
          size: isZh.value ? file.sizeZh : file.sizeEn,
        })),
      })),
      mailCountLabel:
        thread.mails.length > 1
          ? t(`${thread.mails.length} 封往来邮件`, `${thread.mails.length} letters in thread`)
          : '',
    }
  }

  const received = selectedReceivedMail.value
  if (received) {
    const offsetMinutes = draftOffsetMinutes(received.arrivedAt)
    const chips = [
      ...resolveChips(received.label ? [received.label] : []),
      ...(received.providerModel
        ? [{ id: 'generated', tone: 'slate', text: t('AI 生成', 'AI-generated') }]
        : []),
    ]
    return {
      thread: {
        id: received.id,
        avatarTone:
          senders.value.find((sender) => sender.address === received.senderAddress)?.tone || 'slate',
        senderAddress: received.senderAddress,
      },
      read: isThreadRead(received.id),
      starred: isThreadStarred(received.id),
      archived: isThreadArchived(received.id),
      senderName: received.senderName,
      subject: received.subject,
      avatarText: Array.from(received.senderName)[0] || (isZh.value ? '邮' : 'M'),
      chips,
      mails: [
        {
          id: received.id,
          offsetMinutes,
          timeLabel: timeLabelForOffset(offsetMinutes),
          body: received.body,
          invite: null,
          attachments: [],
        },
      ],
      mailCountLabel: received.providerModel
        ? t(`由 Daon 邮件生成 · ${received.providerModel}`, `Delivered by Daon Mail · ${received.providerModel}`)
        : '',
    }
  }

  const sent = selectedSentMail.value
  if (sent) {
    const offsetMinutes = draftOffsetMinutes(sent.sentAt || sent.at)
    return {
      thread: {
        id: sent.id,
        avatarTone: 'green',
        senderAddress: MAIL_SHELL_ACCOUNT.address,
      },
      read: true,
      starred: false,
      archived: false,
      senderName: `${t('发送至', 'Sent to')} ${sent.to || t('（未填收件人）', '(no recipient)')}`,
      subject: sent.subject || t('（无主题）', '(no subject)'),
      avatarText: isZh.value ? '我' : 'M',
      chips: [],
      mails: [
        {
          id: sent.id,
          offsetMinutes,
          timeLabel: timeLabelForOffset(offsetMinutes),
          body: sent.body ? [sent.body] : [t('（无正文）', '(no body)')],
          invite: null,
          attachments: [],
        },
      ],
      mailCountLabel: t('仅存于本机发件箱 · 尚未投递', 'Local Sent only · not delivered'),
    }
  }

  return null
})

const mobilePane = computed(() => {
  if (rightPane.value === 'compose') return 'compose'
  if (selectedRowId.value) return 'detail'
  return 'list'
})

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const selectFolder = (folderId) => {
  activeFolderId.value = folderId
  selectedRowId.value = ''
  rightPane.value = 'detail'
  railOpen.value = false
}

const openRow = (row) => {
  if (row.variant === 'draft') {
    const draft = drafts.value.find((item) => item.id === row.id)
    editingDraft.value = draft ? { ...draft } : null
    composeSavedNote.value = ''
    rightPane.value = 'compose'
    return
  }
  selectedRowId.value = row.id
  rightPane.value = 'detail'
  if (row.variant === 'received') {
    markThreadRead(row.id)
    return
  }
  const thread = MAIL_SHELL_THREADS.find((item) => item.id === row.id)
  if (thread) markThreadRead(thread.id)
}

const backToList = () => {
  selectedRowId.value = ''
  rightPane.value = 'detail'
}

const openCompose = () => {
  editingDraft.value = null
  composeSavedNote.value = ''
  rightPane.value = 'compose'
  railOpen.value = false
}

const openSenderSettings = () => {
  railOpen.value = false
  sendersSheetOpen.value = true
}

const cancelCompose = () => {
  editingDraft.value = null
  composeSavedNote.value = ''
  rightPane.value = 'detail'
}

const handleSaveDraft = (payload) => {
  const saved = saveDraft(payload)
  if (saved) {
    editingDraft.value = { ...saved }
    composeSavedNote.value = t('已保存到草稿箱', 'Saved to Drafts')
  }
}

const handleSend = (payload) => {
  const sent = sendMail(payload)
  if (!sent) return
  if (editingDraft.value?.id) deleteDraft(editingDraft.value.id)
  editingDraft.value = null
  composeSavedNote.value = ''
  activeFolderId.value = 'sent'
  selectedRowId.value = sent.id
  rightPane.value = 'detail'
}

const removeDraft = (draftId) => {
  deleteDraft(draftId)
  if (editingDraft.value?.id === draftId) {
    editingDraft.value = null
    rightPane.value = 'detail'
  }
}

const toggleStarForSelected = () => {
  const thread = selectedFixtureThread.value
  if (thread) toggleThreadStar(thread.id)
  else if (selectedReceivedMail.value) toggleThreadStar(selectedReceivedMail.value.id)
}

const toggleReadForSelected = () => {
  const thread = selectedFixtureThread.value
  if (thread) toggleThreadRead(thread.id)
  else if (selectedReceivedMail.value) toggleThreadRead(selectedReceivedMail.value.id)
}

const archiveSelected = () => {
  const thread = selectedFixtureThread.value
  const received = selectedReceivedMail.value
  if (!thread && !received) return
  archiveThread(thread ? thread.id : received.id)
  selectedRowId.value = ''
  rightPane.value = 'detail'
}

const unarchiveSelected = () => {
  const thread = selectedFixtureThread.value
  const received = selectedReceivedMail.value
  if (thread) unarchiveThread(thread.id)
  else if (received) unarchiveThread(received.id)
}

const worldContext = computed(() => {
  try {
    const overview = resolveActiveWorldOverview({ systemStore })
    const pack = overview?.activePack
    const name =
      typeof pack?.title === 'string' && pack.title
        ? pack.title
        : typeof pack?.name === 'string'
          ? pack.name
          : ''
    const worldview = typeof overview?.worldview === 'string' ? overview.worldview : ''
    return { name, worldview }
  } catch {
    return { name: '', worldview: '' }
  }
})

const personaText = computed(() => {
  const profiles = Array.isArray(chatStore.roleProfiles) ? chatStore.roleProfiles : []
  const profile = profiles.find((item) => item?.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE)
  if (!profile) return ''
  const name = typeof profile.name === 'string' ? profile.name.trim() : ''
  const role = typeof profile.role === 'string' ? profile.role.trim() : ''
  return [name, role].filter(Boolean).join(' · ')
})

const arrivalErrorText = computed(() => resolveMailArrivalErrorCopy(receiveErrorCode.value, isZh.value))

let receiveStatusTimer = null
onBeforeUnmount(() => {
  if (receiveStatusTimer) clearTimeout(receiveStatusTimer)
})

const receiveMail = async () => {
  if (receiveStatus.value === 'loading') return
  receiveStatus.value = 'loading'
  receiveErrorCode.value = ''
  const result = await receiveMailArrival({
    settings: systemStore.settings,
    senders: senders.value,
    allowNewSenders: allowNewSenders.value,
    worldName: worldContext.value.name,
    worldview: worldContext.value.worldview,
    persona: personaText.value,
    languageName: resolveMailArrivalLanguageName(languageBase.value),
  })

  if (!result.ok) {
    receiveStatus.value = 'error'
    receiveErrorCode.value = result.code || 'PROVIDER_FAILED'
    return
  }

  if (result.enrollSender) enrollGeneratedSender(result.enrollSender)
  const record = receiveGeneratedMail({ ...result.mail, providerModel: result.model })
  if (!record) {
    receiveStatus.value = 'error'
    receiveErrorCode.value = 'RESPONSE_INVALID'
    return
  }

  receiveStatus.value = 'success'
  activeFolderId.value = 'inbox'
  selectedRowId.value = ''
  rightPane.value = 'detail'
  if (receiveStatusTimer) clearTimeout(receiveStatusTimer)
  receiveStatusTimer = setTimeout(() => {
    if (receiveStatus.value === 'success') receiveStatus.value = 'idle'
  }, 2600)
}

const openNetworkSettings = () => {
  router.push({ path: '/network', query: { source: 'mail' } })
}

const handleAddSender = (payload) => (addSender(payload) ? undefined : false)

const openInvite = (path) => {
  if (typeof path !== 'string' || !path.startsWith('/')) return
  const rawHomePage = route.query.homePage
  const homePage = Array.isArray(rawHomePage) ? rawHomePage[0] : rawHomePage
  router.push({
    path,
    query: {
      source: 'mail',
      ...(typeof homePage === 'string' && homePage ? { homePage } : {}),
    },
  })
}
</script>

<style scoped>
.daon-mail-app {
  --daon-green: #0e7a4e;
  --daon-green-deep: #0a5c3a;
  --daon-green-ink: #073f29;
  --daon-action-bg: #0e7a4e;
  --daon-action-hover: #0a5c3a;
  --daon-accent-text: #0a5c3a;
  --daon-focus: #0e7a4e;
  --daon-header-start: #073f29;
  --daon-header-mid: #0a5c3a;
  --daon-header-end: #0e7a4e;
  --daon-header-action-ink: #073f29;
  --daon-green-soft: #e4f0e8;
  --daon-paper: #f3f5f1;
  --daon-panel: #ffffff;
  --daon-panel-soft: #fafbf9;
  --daon-line: #e0e6dd;
  --daon-line-strong: #c7d0c4;
  --daon-ink: #182219;
  --daon-ink-soft: #55624f;
  --daon-ink-faint: #8d9a8a;
  --daon-tone-green: #0e7a4e;
  --daon-tone-green-soft: #e0efe6;
  --daon-tone-blue: #2f6bb0;
  --daon-tone-blue-soft: #e2ecf7;
  --daon-tone-rose: #b3475b;
  --daon-tone-rose-soft: #f7e4e8;
  --daon-tone-amber: #a9740f;
  --daon-tone-amber-soft: #f6ecd8;
  --daon-tone-violet: #6d5bb0;
  --daon-tone-violet-soft: #eae6f6;
  --daon-tone-teal: #12808c;
  --daon-tone-teal-soft: #dfeef0;
  --daon-tone-slate: #5c6a5e;
  --daon-tone-slate-soft: #e8ebe6;
  --daon-star: #d99a1a;
  --daon-radius: 12px;
  --daon-radius-sm: 8px;
  --daon-shadow-card: 0 1px 2px rgba(24, 34, 25, 0.06);
  --daon-motion: 160ms ease;
  --daon-ease: cubic-bezier(0.2, 0.7, 0.3, 1);

  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--daon-paper);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', -apple-system,
    'Segoe UI', sans-serif;
  color: var(--daon-ink);
}

.daon-mail-app.is-night {
  --daon-green: #49c78d;
  --daon-green-deep: #12583b;
  --daon-green-ink: #092619;
  --daon-action-bg: #176b48;
  --daon-action-hover: #10563a;
  --daon-accent-text: #83e2b7;
  --daon-focus: #83e2b7;
  --daon-header-start: #07130d;
  --daon-header-mid: #0a3020;
  --daon-header-end: #0d5b3a;
  --daon-header-action-ink: #073c27;
  --daon-green-soft: rgba(73, 199, 141, 0.18);
  --daon-paper: #090f0c;
  --daon-panel: #111a15;
  --daon-panel-soft: #17221b;
  --daon-line: #2d3d33;
  --daon-line-strong: #4a6252;
  --daon-ink: #f1f6f2;
  --daon-ink-soft: #c2cec5;
  --daon-ink-faint: #91a095;
  --daon-tone-green: #72e0aa;
  --daon-tone-green-soft: rgba(76, 197, 141, 0.16);
  --daon-tone-blue: #74aade;
  --daon-tone-blue-soft: rgba(116, 170, 222, 0.16);
  --daon-tone-rose: #dd8a9b;
  --daon-tone-rose-soft: rgba(221, 138, 155, 0.15);
  --daon-tone-amber: #d3ac59;
  --daon-tone-amber-soft: rgba(211, 172, 89, 0.16);
  --daon-tone-violet: #a99ce0;
  --daon-tone-violet-soft: rgba(169, 156, 224, 0.16);
  --daon-tone-teal: #5cbcc7;
  --daon-tone-teal-soft: rgba(92, 188, 199, 0.15);
  --daon-tone-slate: #c4d0c1;
  --daon-tone-slate-soft: rgba(154, 168, 148, 0.16);
  --daon-star: #e3b04b;
  --daon-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.3);
  color-scheme: dark;
}

:global(.app-shell:has(.daon-mail-app) .status-fg) {
  color: #f2f8f4;
}

.daon-mail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: calc(34px + env(safe-area-inset-top)) 14px 10px;
  background: linear-gradient(120deg, var(--daon-header-start), var(--daon-header-mid) 55%, var(--daon-header-end));
  color: #fff;
  flex: none;
}

:global(.app-shell[data-statusbar='off']) .daon-mail-header {
  padding-top: calc(10px + env(safe-area-inset-top));
}

.daon-mail-header__back {
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  cursor: pointer;
  transition: background-color var(--daon-motion);
}

.daon-mail-header__back:hover {
  background: rgba(255, 255, 255, 0.24);
}

.daon-mail-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.daon-mail-brand__mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.28);
  display: grid;
  place-items: center;
  font-size: 17px;
  font-weight: 900;
  flex: none;
}

.daon-mail-brand__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.daon-mail-brand__word {
  font-size: 15.5px;
  font-weight: 900;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.daon-mail-brand__tag {
  font-size: 10px;
  opacity: 0.72;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daon-mail-header__spacer {
  flex: 1;
}

.daon-mail-header__rail-toggle {
  display: none;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  place-items: center;
  font-size: 14px;
  cursor: pointer;
}

.daon-mail-header__compose {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: #fff;
  color: var(--daon-header-action-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform var(--daon-motion), background-color var(--daon-motion);
}

.daon-mail-header__compose:hover {
  background: #eef6f0;
}

.daon-mail-header__senders {
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 14px;
  cursor: pointer;
  transition: background-color var(--daon-motion);
}

.daon-mail-header__senders:hover {
  background: rgba(255, 255, 255, 0.24);
}

.daon-mail-header__receive {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color var(--daon-motion);
}

.daon-mail-header__receive:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.22);
}

.daon-mail-header__receive:disabled {
  opacity: 0.65;
  cursor: progress;
}

.daon-mail-arrival {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex: none;
  padding: 7px 16px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--daon-accent-text);
  background: var(--daon-green-soft);
  border-bottom: 1px solid var(--daon-line);
}

.daon-mail-arrival.is-error {
  color: var(--daon-tone-rose);
  background: var(--daon-tone-rose-soft);
  flex-wrap: wrap;
}

.daon-mail-arrival__error {
  min-width: 0;
}

.daon-mail-arrival__action {
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  min-height: 36px;
  padding: 4px 14px;
  border-radius: 999px;
  cursor: pointer;
}

.daon-mail-arrival__action:hover {
  background: rgba(127, 29, 29, 0.08);
}

.daon-mail-header__senders:focus-visible,
.daon-mail-header__receive:focus-visible,
.daon-mail-arrival__action:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 2px;
}

.daon-mail-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 14.5rem 21rem minmax(0, 1fr);
  overflow: hidden;
}

.daon-mail-body__rail {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.daon-mail-body__list {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--daon-line);
}

.daon-mail-body__read {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.daon-mail-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 24px;
  text-align: center;
}

.daon-mail-placeholder__icon {
  font-size: 34px;
  color: var(--daon-line-strong);
}

.daon-mail-placeholder__title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--daon-ink-soft);
}

.daon-mail-placeholder__hint {
  margin: 0;
  font-size: 12px;
  color: var(--daon-ink-faint);
  max-width: 280px;
  line-height: 1.7;
}

.daon-mail-drawer {
  position: fixed;
  inset: 0;
  z-index: 60;
}

.daon-mail-drawer__scrim {
  position: absolute;
  inset: 0;
  border: none;
  padding: 0;
  background: rgba(10, 16, 12, 0.55);
  cursor: pointer;
}

.daon-mail-drawer__panel {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: min(17rem, 82vw);
  background: var(--daon-panel);
  border-right: 1px solid var(--daon-line);
  animation: daon-drawer-in 200ms var(--daon-ease) both;
  display: flex;
  flex-direction: column;
}

.daon-mail-drawer__settings {
  display: none;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  margin: 8px 10px calc(14px + env(safe-area-inset-bottom));
  padding: 8px 14px;
  border: 1px solid var(--daon-line);
  border-radius: var(--daon-radius-sm);
  background: var(--daon-panel-soft);
  color: var(--daon-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

@keyframes daon-drawer-in {
  from {
    transform: translateX(-24px);
    opacity: 0.4;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.daon-mail-header__back:focus-visible,
.daon-mail-header__rail-toggle:focus-visible,
.daon-mail-header__compose:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 2px;
}

.daon-mail-drawer__settings:focus-visible {
  outline: 3px solid var(--daon-focus);
  outline-offset: 2px;
}

@media (max-width: 1023px) {
  .daon-mail-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .daon-mail-body__rail {
    display: none;
  }

  .daon-mail-body__list {
    border-right: none;
  }

  .daon-mail-body__read {
    display: none;
  }

  .show-read-pane .daon-mail-body__read {
    display: flex;
  }

  .show-read-pane .daon-mail-body__list {
    display: none;
  }

  .daon-mail-header__rail-toggle {
    display: grid;
  }

  .daon-mail-brand__tag {
    display: none;
  }
}

@media (max-width: 700px) {
  .daon-mail-header__senders {
    display: none;
  }

  .daon-mail-drawer__settings {
    display: flex;
  }
}

@media (max-width: 480px) {
  .daon-mail-brand__meta {
    display: none;
  }

  .daon-mail-header__compose {
    width: 44px;
    padding: 0;
    justify-content: center;
  }

  .daon-mail-header__compose span,
  .daon-mail-header__receive-text {
    display: none;
  }

  .daon-mail-header__receive {
    width: 44px;
    padding: 0;
    justify-content: center;
  }
}

@media (max-width: 390px) {
  .daon-mail-header {
    padding: calc(34px + env(safe-area-inset-top)) 10px 8px;
    gap: 8px;
  }

  .daon-mail-brand__mark {
    width: 32px;
    height: 32px;
    font-size: 15px;
    border-radius: 9px;
  }

  .daon-mail-brand__word {
    font-size: 14.5px;
  }

}

@media (prefers-reduced-motion: reduce) {
  .daon-mail-drawer__panel {
    animation: none;
  }

  .daon-mail-header__back,
  .daon-mail-header__compose {
    transition: none;
  }
}
</style>
