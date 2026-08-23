import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MailView from '../src/views/MailView.vue'
import { useSystemStore } from '../src/stores/system'
import { MAIL_SHELL_THREADS, formatMailShellTime } from '../src/lib/mail-shell-data'
import { setMailArrivalRunnerOverrideForTesting } from '../src/lib/mail-shell-arrival'
import {
  MAIL_SHELL_PREVIEW_STATE_STORAGE_KEY,
  resetMailShellStateForTesting,
} from '../src/composables/useMailShellState'
import { resetMailShellSendersForTesting, useMailShellSenders } from '../src/composables/useMailShellSenders'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: DummyView },
      { path: '/calendar', component: DummyView },
      { path: '/mail', component: MailView },
    ],
  })

const mountMail = async () => {
  const router = createTestRouter()
  await router.push('/mail')
  await router.isReady()
  const wrapper = mount(MailView, {
    global: { plugins: [router, createPinia()] },
  })
  return { router, wrapper }
}

const unreadInboxFixtureCount = () =>
  MAIL_SHELL_THREADS.filter((thread) => thread.folder === 'inbox' && thread.defaultUnread).length

describe('Mail S1 shell view', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMailShellStateForTesting()
    resetMailShellSendersForTesting()
    setMailArrivalRunnerOverrideForTesting(null)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-23T09:30:00.000Z'))
    setActivePinia(createPinia())
  })

  test('renders the portal shell, folders, and fixture inbox rows', async () => {
    const { wrapper } = await mountMail()
    expect(wrapper.get('[data-testid="daon-mail-app"]').classes()).toContain('daon-mail-app')
    expect(wrapper.get('[data-testid="mail-folder-rail"]').text()).toContain('me@daon.kr')
    expect(wrapper.get('[data-testid="mail-folder-inbox"]').text()).toContain(
      String(unreadInboxFixtureCount()),
    )
    const agencyRow = wrapper.get(
      '[data-testid="mail-thread-row-mail_fixture_hanul_schedule"]',
    )
    expect(agencyRow.text()).toContain('Hanul 娱乐')
    expect(agencyRow.text()).toContain('9 月回归')
    expect(wrapper.text()).not.toMatch(/[가-힣]/)
    expect(agencyRow.classes()).toContain('is-unread')
    wrapper.unmount()
  })

  test('opening a thread marks it read, opens the detail, and back returns to the list', async () => {
    const { wrapper } = await mountMail()
    await wrapper
      .get('[data-testid="mail-thread-row-mail_fixture_hanul_schedule"]')
      .trigger('click')
    await flushPromises()

    const detail = wrapper.get('[data-testid="mail-thread-detail"]')
    expect(detail.text()).toContain('9 月回归准备日程已确认')
    expect(detail.text()).toContain('schedule@hanul-enter.kr')
    expect(detail.text()).toContain('2 封往来邮件')

    expect(
      wrapper.get('[data-testid="mail-thread-row-mail_fixture_hanul_schedule"]').classes(),
    ).not.toContain('is-unread')

    await wrapper.get('[data-testid="mail-detail-back"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mail-thread-detail"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="mail-read-placeholder"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('starring from the list feeds the starred folder', async () => {
    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-star-mail_fixture_yeonseo_recital"]').trigger('click')
    await wrapper.get('[data-testid="mail-folder-starred"]').trigger('click')
    await flushPromises()
    const rows = wrapper.findAll('[data-testid^="mail-thread-row-"]')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('Yun I-seo')
    wrapper.unmount()
  })

  test('archive from detail moves the thread and unarchive restores it', async () => {
    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-thread-row-mail_fixture_kurly_shipped"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="mail-detail-archive"]').trigger('click')
    await flushPromises()

    expect(
      wrapper.find('[data-testid="mail-thread-row-mail_fixture_kurly_shipped"]').exists(),
    ).toBe(false)

    await wrapper.get('[data-testid="mail-folder-archive"]').trigger('click')
    await flushPromises()
    await wrapper
      .get('[data-testid="mail-thread-row-mail_fixture_kurly_shipped"]')
      .trigger('click')
    await wrapper.get('[data-testid="mail-detail-unarchive"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="mail-folder-inbox"]').trigger('click')
    await flushPromises()
    expect(
      wrapper.find('[data-testid="mail-thread-row-mail_fixture_kurly_shipped"]').exists(),
    ).toBe(true)
    wrapper.unmount()
  })

  test('compose drafts persist locally and reopen with their content', async () => {
    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-compose-open"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="mail-compose-to"]').setValue('yunseo@daon.kr')
    await wrapper.get('[data-testid="mail-compose-subject"]').setValue('独奏会回复')
    await wrapper.get('[data-testid="mail-compose-body"]').setValue('我会去！结束后一起吃晚饭吧。')
    await wrapper.get('[data-testid="mail-compose-save"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="mail-compose-note"]').text()).toContain('草稿')

    await wrapper.get('[data-testid="mail-compose-cancel"]').trigger('click')
    await wrapper.get('[data-testid="mail-folder-drafts"]').trigger('click')
    await flushPromises()
    const draftRow = wrapper.get('[data-testid^="mail-thread-row-mail_draft_"]')
    expect(draftRow.text()).toContain('yunseo@daon.kr')
    expect(draftRow.text()).toContain('独奏会回复')

    await draftRow.trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="mail-compose-to"]').element.value).toBe('yunseo@daon.kr')
    expect(wrapper.get('[data-testid="mail-compose-body"]').element.value).toContain('晚饭')
    wrapper.unmount()
  })

  test('local send stores the letter in the sent folder only', async () => {
    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-compose-open"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="mail-compose-to"]').setValue('schedule@hanul-enter.kr')
    await wrapper.get('[data-testid="mail-compose-subject"]').setValue('周二会议资料已确认')
    await wrapper.get('[data-testid="mail-compose-body"]').setValue('资料已经确认，我们会议上见。')
    await wrapper.get('[data-testid="mail-compose-send"]').trigger('click')
    await flushPromises()

    const detail = wrapper.get('[data-testid="mail-thread-detail"]')
    expect(detail.text()).toContain('schedule@hanul-enter.kr')
    expect(detail.text()).toContain('周二会议资料已确认')
    expect(detail.text()).toContain('仅存于本机发件箱')

    await wrapper.get('[data-testid="mail-folder-inbox"]').trigger('click')
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem(MAIL_SHELL_PREVIEW_STATE_STORAGE_KEY))
    expect(stored.sent).toHaveLength(1)
    expect(stored.sent[0].to).toBe('schedule@hanul-enter.kr')
    expect(stored.readIds).not.toContain('mail_fixture_hanul_schedule')
    wrapper.unmount()
  })

  test('draft rows can be deleted from the drafts folder', async () => {
    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-compose-open"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="mail-compose-subject"]').setValue('待删除草稿')
    await wrapper.get('[data-testid="mail-compose-save"]').trigger('click')
    await wrapper.get('[data-testid="mail-compose-cancel"]').trigger('click')

    await wrapper.get('[data-testid="mail-folder-drafts"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid^="mail-thread-row-mail_draft_"]')).toHaveLength(1)
    await wrapper.get('[data-testid^="mail-draft-delete-mail_draft_"]').trigger('click')
    await flushPromises()
    expect(
      wrapper.findAll('[data-testid^="mail-thread-row-mail_draft_"]'),
    ).toHaveLength(0)
    expect(wrapper.get('[data-testid="mail-list-empty"]').text()).toContain('草稿')
    wrapper.unmount()
  })

  test('search filters fixture threads and reports an honest empty state', async () => {
    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-search-input"]').setValue('回归')
    await flushPromises()
    const rows = wrapper.findAll('[data-testid^="mail-thread-row-mail_fixture_"]')
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows[0].attributes('data-testid')).toBe('mail-thread-row-mail_fixture_hanul_schedule')

    await wrapper.get('[data-testid="mail-search-input"]').setValue('不存在的关键词12345')
    await flushPromises()
    expect(wrapper.get('[data-testid="mail-list-empty"]').text()).toContain('没有匹配')

    await wrapper.get('[data-testid="mail-search-clear"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid^="mail-thread-row-mail_fixture_"]').length).toBe(
      MAIL_SHELL_THREADS.filter((thread) => thread.folder === 'inbox').length,
    )
    wrapper.unmount()
  })

  test('spam folder keeps its fixture and stays out of the inbox', async () => {
    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-folder-spam"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="mail-thread-row-mail_fixture_lucky_spam"]').exists()).toBe(
      true,
    )
    await wrapper.get('[data-testid="mail-folder-inbox"]').trigger('click')
    await flushPromises()
    expect(
      wrapper.find('[data-testid="mail-thread-row-mail_fixture_lucky_spam"]').exists(),
    ).toBe(false)
    wrapper.unmount()
  })

  test('invite card deep-links Calendar with the mail return source', async () => {
    const { router, wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-thread-row-mail_fixture_snuh_checkup"]').trigger('click')
    await flushPromises()
    await wrapper
      .get('[data-testid="mail-invite-open-mail_fixture_snuh_checkup_1"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/calendar')
    expect(router.currentRoute.value.query.source).toBe('mail')
    wrapper.unmount()
  })

  test('zen theme drives the portal night surface', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.appearance.currentTheme = 'zen'
    const { wrapper } = await mountMail()
    expect(wrapper.get('[data-testid="daon-mail-app"]').classes()).toContain('is-night')
    wrapper.unmount()
  })

  test('preview state round-trips through the registered local key', async () => {
    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-thread-row-mail_fixture_bitnari_letter"]').trigger('click')
    await wrapper.get('[data-testid="mail-detail-back"]').trigger('click')
    const stored = JSON.parse(localStorage.getItem(MAIL_SHELL_PREVIEW_STATE_STORAGE_KEY))
    expect(stored.version).toBe(2)
    expect(stored.readIds).toContain('mail_fixture_bitnari_letter')

    vi.resetModules()
    const freshState = await import('../src/composables/useMailShellState')
    const mailState = freshState.useMailShellState()
    expect(mailState.isThreadRead('mail_fixture_bitnari_letter')).toBe(true)
    wrapper.unmount()
  })

  test('receive with a configured provider commits one validated unread letter', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.api.url = 'https://mail.provider.test/v1'
    systemStore.settings.api.key = 'test-key'
    setMailArrivalRunnerOverrideForTesting(async () => ({
      text: JSON.stringify({
        senderName: 'Hanul 娱乐',
        senderAddress: 'schedule@hanul-enter.kr',
        subject: '[公告] 彩排时间调整通知',
        body: ['彩排时间提前一小时。', '请留意更新。'],
        label: 'schedule',
      }),
      model: 'test-model-a',
    }))

    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-receive"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="mail-arrival-status"]').text()).toContain('1')
    const receivedRow = wrapper.get('[data-testid^="mail-thread-row-mail_received_"]')
    expect(receivedRow.classes()).toContain('is-unread')
    expect(receivedRow.text()).toContain('彩排')

    await receivedRow.trigger('click')
    await flushPromises()
    const detail = wrapper.get('[data-testid="mail-thread-detail"]')
    expect(detail.text()).toContain('schedule@hanul-enter.kr')
    expect(detail.text()).toContain('test-model-a')

    const stored = JSON.parse(localStorage.getItem(MAIL_SHELL_PREVIEW_STATE_STORAGE_KEY))
    expect(stored.received).toHaveLength(1)
    expect(stored.received[0].providerModel).toBe('test-model-a')
    wrapper.unmount()
  })

  test('receive without a provider shows the honest recovery state and no letter', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.api.url = ''
    systemStore.settings.api.key = ''
    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-receive"]').trigger('click')
    await flushPromises()

    const status = wrapper.get('[data-testid="mail-arrival-status"]')
    expect(status.text()).toContain('模型服务')
    expect(wrapper.get('[data-testid="mail-arrival-settings"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid^="mail-thread-row-mail_received_"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('receive fails closed when the draft is invalid and new senders are disabled', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.api.url = 'https://mail.provider.test/v1'
    systemStore.settings.api.key = 'test-key'
    setMailArrivalRunnerOverrideForTesting(async () => ({
      text: JSON.stringify({
        senderName: 'Mystery New Sender',
        senderAddress: 'mystery@unknown-mail.kr',
        subject: 'Hello',
        body: ['This should be rejected.'],
        label: '',
      }),
    }))
    const sendersStore = useMailShellSenders()
    sendersStore.setAllowNewSenders(false)

    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-receive"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="mail-arrival-status"]').text()).toContain('校验')
    expect(wrapper.find('[data-testid^="mail-thread-row-mail_received_"]').exists()).toBe(false)
    expect(sendersStore.senders.value.some((sender) => sender.address === 'mystery@unknown-mail.kr')).toBe(false)
    wrapper.unmount()
  })

  test('validated new senders enroll into the managed whitelist', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.api.url = 'https://mail.provider.test/v1'
    systemStore.settings.api.key = 'test-key'
    setMailArrivalRunnerOverrideForTesting(async () => ({
      text: JSON.stringify({
        senderName: '스트릠리 Streamly',
        senderAddress: 'news@streamly.kr',
        subject: 'Your weekly watch list',
        body: ['Three new episodes landed this week.'],
        label: 'member',
      }),
      model: 'test-model-b',
    }))

    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-receive"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="mail-senders-open"]').trigger('click')

    const sheet = wrapper.get('[data-testid="mail-sender-sheet"]')
    expect(sheet.text()).toContain('news@streamly.kr')
    expect(sheet.text()).toContain('AI 新增')
    wrapper.unmount()
  })

  test('sender settings keep invalid and duplicate input visible with an honest error', async () => {
    const { wrapper } = await mountMail()
    await wrapper.get('[data-testid="mail-senders-open"]').trigger('click')

    const nameInput = wrapper.get('[data-testid="mail-sender-add-name"]')
    const addressInput = wrapper.get('[data-testid="mail-sender-add-address"]')
    await nameInput.setValue('Broken Sender')
    await addressInput.setValue('not-an-address')
    await wrapper.get('[data-testid="mail-sender-add-submit"]').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="mail-sender-add-error"]').text()).toContain('地址格式')
    expect(addressInput.element.value).toBe('not-an-address')

    await addressInput.setValue('schedule@hanul-enter.kr')
    await wrapper.get('[data-testid="mail-sender-add-submit"]').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="mail-sender-add-error"]').text()).toContain('已存在')
    expect(addressInput.element.value).toBe('schedule@hanul-enter.kr')
    wrapper.unmount()
  })
})

describe('formatMailShellTime portal labels', () => {
  const now = new Date('2026-08-23T12:00:00')

  test.each([
    [-10, '10 分钟前', '10m ago'],
    [-120, '今天 10:00', '10:00 AM'],
  ])('labels recent offsets (%p minutes)', (offset, zh, en) => {
    expect(formatMailShellTime(now, offset, true)).toBe(zh)
    expect(formatMailShellTime(now, offset, false)).toBe(en)
  })

  test('labels yesterday, weekday, and older dates', () => {
    const nowWednesday = new Date('2026-08-26T12:00:00')
    expect(formatMailShellTime(nowWednesday, -24 * 60, true)).toBe('昨天')
    expect(formatMailShellTime(nowWednesday, -2 * 24 * 60, true)).toBe('周一')
    expect(formatMailShellTime(nowWednesday, -12 * 24 * 60, false)).toBe('Aug 14')
  })
})
