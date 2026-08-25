import { normalizeScheduleHandoffDraftV1 } from './schedule-handoff'

// Daon Mail S1 fixture data (roadmap 4.16 / SHP-1).
// Static shell-preview fixtures only: no Store, no backup section, no cross-owner writes.
// Fixture thread IDs are stable; the S1 preview state overlays read/star/archive/draft/sent on top.

export const MAIL_SHELL_BRAND = Object.freeze({
  id: 'daon_mail',
  nameZh: 'Daon 邮件',
  nameEn: 'Daon Mail',
  wordmarkZh: 'Daon Mail',
  wordmarkEn: 'Daon Mail',
  taglineZh: '把每封邮件都稳稳送达',
  taglineEn: 'Every letter arrives calm and on time',
  domain: 'daon.kr',
})

export const MAIL_SHELL_ACCOUNT = Object.freeze({
  address: 'me@daon.kr',
  nameZh: '我（李登锡）',
  nameEn: 'Me (Lee Deungseok)',
  planZh: 'Daon Mail Plus',
  planEn: 'Daon Mail Plus',
})

export const MAIL_SHELL_FOLDERS = Object.freeze([
  { id: 'inbox', icon: 'fas fa-inbox', nameZh: '收件箱', nameEn: 'Inbox', shortZh: '收件箱', shortEn: 'Inbox' },
  { id: 'starred', icon: 'fas fa-star', nameZh: '星标邮件', nameEn: 'Starred', shortZh: '星标', shortEn: 'Starred' },
  { id: 'sent', icon: 'fas fa-paper-plane', nameZh: '已发送', nameEn: 'Sent', shortZh: '已发送', shortEn: 'Sent' },
  { id: 'drafts', icon: 'fas fa-file-lines', nameZh: '草稿箱', nameEn: 'Drafts', shortZh: '草稿', shortEn: 'Drafts' },
  { id: 'archive', icon: 'fas fa-box-archive', nameZh: '归档', nameEn: 'Archive', shortZh: '归档', shortEn: 'Archive' },
  { id: 'spam', icon: 'fas fa-ban', nameZh: '垃圾邮件', nameEn: 'Spam', shortZh: '垃圾', shortEn: 'Spam' },
])

export const MAIL_SHELL_LABELS = Object.freeze({
  schedule: { id: 'schedule', zh: '日程', en: 'Schedule', tone: 'green' },
  notice: { id: 'notice', zh: '公告', en: 'Notice', tone: 'slate' },
  reservation: { id: 'reservation', zh: '预约', en: 'Reservation', tone: 'blue' },
  receipt: { id: 'receipt', zh: '收据', en: 'Receipt', tone: 'amber' },
  statement: { id: 'statement', zh: '账单', en: 'Statement', tone: 'violet' },
  listing: { id: 'listing', zh: '房源', en: 'Listing', tone: 'teal' },
  unverified: { id: 'unverified', zh: '未经证实', en: 'Unverified', tone: 'rose' },
  member: { id: 'member', zh: '会员', en: 'Member', tone: 'green' },
  personal: { id: 'personal', zh: '私人', en: 'Personal', tone: 'slate' },
})

const attachment = (id, name, kind, sizeZh, sizeEn) => ({ id, name, kind, sizeZh, sizeEn })

export const MAIL_SHELL_THREADS = Object.freeze([
  {
    id: 'mail_fixture_hanul_schedule',
    folder: 'inbox',
    senderNameZh: 'Hanul 娱乐',
    senderNameEn: 'Hanul Entertainment',
    senderAddress: 'schedule@hanul-enter.kr',
    avatarTone: 'green',
    labelIds: ['schedule', 'notice'],
    defaultUnread: true,
    mails: Object.freeze([
      {
        id: 'mail_fixture_hanul_schedule_2',
        offsetMinutes: -36,
        subjectZh: '[公告] 9 月回归准备日程已确认',
        subjectEn: '[Notice] September comeback preparation schedule confirmed',
        bodyZh: [
          '您好，经纪人。9 月回归准备日程现已确认，具体安排如下。',
          '下周二上午 10 点将在练习室召开全体会议，确认最终编舞版本；周四进行服装与发型的最终试装。相关资料已随邮件附上，请在会议前完成确认。',
          '如有变更，我们会再次通过此邮箱通知。谢谢。',
        ],
        bodyEn: [
          'Hello, manager. The September comeback preparation schedule is now confirmed.',
          'Next Tuesday 10:00 the full studio meeting will lock the final choreography version, and Thursday holds the final styling and hair fitting. Please review the listed materials before the meeting.',
          'If anything changes we will notify you again from this address. Thank you.',
        ],
      },
      {
        id: 'mail_fixture_hanul_schedule_1',
        offsetMinutes: -1495,
        subjectZh: '[提前通知] 9 月回归日程草案正在汇总',
        subjectEn: '[Early notice] September comeback draft schedule converging',
        bodyZh: [
          '回归日程草案正在汇总，确认后将通过另一封邮件正式通知。',
          '预计本周内完成确认，请预留周三和周四可安排移动的时间。',
        ],
        bodyEn: [
          'The comeback draft schedule is converging. A confirmation will follow in a separate mail.',
          'We expect to lock it this week, so please keep Wednesday and Thursday travel windows open.',
        ],
      },
    ]),
  },
  {
    id: 'mail_fixture_snuh_checkup',
    folder: 'inbox',
    senderNameZh: '首尔大学医院',
    senderNameEn: 'Seoul National University Hospital',
    senderAddress: 'reserve@snuh-health.kr',
    avatarTone: 'blue',
    labelIds: ['reservation'],
    defaultUnread: true,
    mails: Object.freeze([
      {
        id: 'mail_fixture_snuh_checkup_1',
        offsetMinutes: -187,
        subjectZh: '[预约确认] 8 月 28 日综合健康体检',
        subjectEn: '[Confirmed] Comprehensive health checkup on Fri Aug 28',
        bodyZh: [
          '您的预约已经确认。请在体检中心 3 层接待处出示身份证件和预约编号。',
          '体检前需要空腹 8 小时，可以少量饮水。请于当天上午 7:50 前到达，体检预计需要约 3 小时。',
          '如需调整时间，可以回复此邮件或在预约页面直接修改。',
        ],
        bodyEn: [
          'Your reservation is confirmed. Please present your ID and reservation number at the checkup center, floor 3.',
          'An 8-hour fast is required before the checkup; small amounts of water are fine. Please arrive by 7:50 AM. The checkup takes about three hours.',
          'To change the schedule, reply to this mail or edit the reservation directly on the booking page.',
        ],
        invite: Object.freeze({
          route: '/calendar',
          titleZh: '综合健康体检',
          titleEn: 'Comprehensive health checkup',
          whenZh: '8 月 28 日（周五）上午 7:50',
          whenEn: 'Fri Aug 28, 7:50 AM',
          whereZh: '首尔大学医院体检中心 3 层',
          whereEn: 'SNUH checkup center, floor 3',
          actionZh: '添加到日历',
          actionEn: 'Add to Calendar',
          scheduleHandoffDraft: Object.freeze({
            schemaVersion: 1,
            sourceOwner: 'mail',
            sourceRecordId: 'mail_fixture_snuh_checkup_1',
            sourceRevision: 'fixture-2026-08-25-v1',
            proposedTitleZh: '综合健康体检',
            proposedTitleEn: 'Comprehensive health checkup',
            proposedStartsAt: new Date(2026, 7, 28, 7, 50, 0, 0).getTime(),
            proposedEndsAt: new Date(2026, 7, 28, 10, 50, 0, 0).getTime(),
            proposedLocationRef: Object.freeze({
              owner: 'map',
              mapPackId: 'real-seoul-v1',
              placeId: 'seoul-national-university-hospital',
              labelZh: '首尔大学医院',
              labelEn: 'Seoul National University Hospital',
              detail: '体检中心 3 层 / Checkup center, floor 3',
            }),
            participantRefs: Object.freeze([]),
            sourceReturnContext: Object.freeze({
              path: '/mail',
              query: Object.freeze({ sourceRecordId: 'mail_fixture_snuh_checkup_1' }),
            }),
            proposalStatus: 'pending_review',
          }),
        }),
      },
    ]),
  },
  {
    id: 'mail_fixture_bitnari_letter',
    folder: 'inbox',
    senderNameZh: 'Bitnari 粉丝俱乐部',
    senderNameEn: 'Bitnari Fan Club',
    senderAddress: 'letter@bitnari-fan.kr',
    avatarTone: 'rose',
    labelIds: ['unverified'],
    defaultUnread: true,
    mails: Object.freeze([
      {
        id: 'mail_fixture_bitnari_letter_1',
        offsetMinutes: -1682,
        subjectZh: '每周来信：回归日期传闻与现场故事',
        subjectEn: 'Weekly letter: comeback-date rumor and scene stories',
        bodyZh: [
          '本周来信已经送达。社区中正在流传回归日期的说法，但经纪公司尚未正式公布；邮件中提到的日期仍是未经证实的传闻。',
          '这次整理了上周音乐节目现场照片、候场准备故事，以及粉丝们收集的应援留言。',
          '正式日程公布后，我们会在下一封来信中重新整理。',
        ],
        bodyEn: [
          'This week’s letter is here. Communities keep circulating a comeback-date rumor, but the agency has made no official announcement; the date talk in this mail is unverified.',
          'Instead we collected last week’s music-show scene photos, waiting-room prep stories, and fan support messages.',
          'Once the official schedule lands, the letter will summarize it again.',
        ],
      },
    ]),
  },
  {
    id: 'mail_fixture_daon_realty',
    folder: 'inbox',
    senderNameZh: 'Daon 房产',
    senderNameEn: 'Daon Realty',
    senderAddress: 'listing@daon-realty.kr',
    avatarTone: 'teal',
    labelIds: ['listing'],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_daon_realty_1',
        offsetMinutes: -2950,
        subjectZh: '您关注的韩南洞房源更新（新增 2 套）',
        subjectEn: 'Requested Hannam-dong listing alert (2 new)',
        bodyZh: [
          '现有 2 套新房源接近您的筛选条件：保证金低于 5000 万韩元、包含管理费、步行 10 分钟内可到地铁。',
          '韩南洞路口附近的半地下房源距离车站约 7 分钟，但采光较弱；梨泰院方向的 3 层房源带屋顶露台，管理费稍高。详情请查看附件摘要。',
          '如需预约看房，请回复邮件，我们会发送可选时间。',
        ],
        bodyEn: [
          'Two new listings close to your request (deposit under 50M · maintenance included · 10 min to subway) have been registered.',
          'The semi-basement near Hannam crossing is 7 minutes from the station but dim; the 3rd-floor unit toward Itaewon has a rooftop terrace with slightly higher maintenance. See the attached summaries.',
          'Reply if you would like a viewing; we will send the time table.',
        ],
        attachments: Object.freeze([
          attachment(
            'mail_fixture_daon_realty_att_1',
            '韩南洞-房源摘要-2608.pdf',
            'pdf',
            '1.2 MB',
            '1.2 MB',
          ),
        ]),
      },
    ]),
  },
  {
    id: 'mail_fixture_kurly_shipped',
    folder: 'inbox',
    senderNameZh: 'Kurly',
    senderNameEn: 'Kurly',
    senderAddress: 'order@kurly.kr',
    avatarTone: 'amber',
    labelIds: ['receipt'],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_kurly_shipped_1',
        offsetMinutes: -4390,
        subjectZh: '您的订单已开始配送（订单 2608-195-442）',
        subjectEn: 'Your order has shipped (order 2608-195-442)',
        bodyZh: [
          '您的商品已进入清晨配送，预计明早 7 点前送达。',
          '商品：首尔牛奶 1L ×2、洋葱贝果 ×6、冷冻蓝莓 500g。付款金额和配送员信息可在附件明细中查看。',
          '此邮件仅用于通知订单状态；如需修改订单，请前往 App 内的订单列表。',
        ],
        bodyEn: [
          'Your order has left for dawn delivery and should arrive before 7:00 AM tomorrow.',
          'Items: Seoul milk 1L ×2, onion bagels ×6, frozen blueberries 500g. Payment and courier details are in the attached statement.',
          'This mail is an order-status notice; order changes are made in the app’s order list.',
        ],
        attachments: Object.freeze([
          attachment('mail_fixture_kurly_att_1', '订单明细-2608194-442.pdf', 'pdf', '96 KB', '96 KB'),
          attachment('mail_fixture_kurly_att_2', '配送信息-配送员.jpg', 'img', '212 KB', '212 KB'),
        ]),
      },
    ]),
  },
  {
    id: 'mail_fixture_daon_bank_statement',
    folder: 'inbox',
    senderNameZh: 'Daon 银行',
    senderNameEn: 'Daon Bank',
    senderAddress: 'statement@daonbank.kr',
    avatarTone: 'violet',
    labelIds: ['statement'],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_daon_bank_statement_1',
        offsetMinutes: -7180,
        subjectZh: '您的 7 月账单已生成',
        subjectEn: 'Your July statement is ready',
        bodyZh: [
          '您的 7 月账单已经生成。本月支出以银行卡支付为主，其中包含 3 笔订阅扣款。',
          '详细内容可在附件账单或 App 交易记录中查看。此邮件不能直接修改金额或完成付款。',
        ],
        bodyEn: [
          'Your July statement is ready. This month’s spending is card-centered and includes three subscription charges.',
          'Details are in the attached statement or the in-app transaction list. This mail cannot change or make any payment.',
        ],
        attachments: Object.freeze([
          attachment('mail_fixture_daon_bank_att_1', 'Daon银行-2026年7月账单.pdf', 'pdf', '284 KB', '284 KB'),
        ]),
      },
    ]),
  },
  {
    id: 'mail_fixture_pharmacy_ready',
    folder: 'inbox',
    senderNameZh: '闪耀药房',
    senderNameEn: 'Bitnaneun Pharmacy',
    senderAddress: 'care@bitnaneun-pharm.kr',
    avatarTone: 'green',
    labelIds: ['notice'],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_pharmacy_ready_1',
        offsetMinutes: -8660,
        subjectZh: '您的处方药已配好（处方编号 P-2608-114）',
        subjectEn: 'Your prescription is ready (P-2608-114)',
        bodyZh: [
          '处方药已经配好。请在营业时间内到店，并向工作人员提供处方编号。',
          '服药时间为饭后 30 分钟，疗程还剩 5 天。如有疑问，也可以通过电话咨询。',
        ],
        bodyEn: [
          'Your prescription has been prepared. Visit during opening hours and give the prescription number.',
          'Take it 30 minutes after meals; five days remain. Questions can also be asked by phone.',
        ],
      },
    ]),
  },
  {
    id: 'mail_fixture_museum_member',
    folder: 'inbox',
    senderNameZh: '韩国国立中央博物馆',
    senderNameEn: 'National Museum of Korea',
    senderAddress: 'member@mus.kr',
    avatarTone: 'slate',
    labelIds: ['member', 'notice'],
    defaultUnread: true,
    mails: Object.freeze([
      {
        id: 'mail_fixture_museum_member_1',
        offsetMinutes: -11530,
        subjectZh: '会员 9 月展览指南',
        subjectEn: 'September exhibitions for members',
        bodyZh: [
          '9 月将开放两场会员优先预约展览。常设展馆会在每月最后一个周五延长夜间开放时间。',
          '会员预约比普通预约提前 3 天开放。此邮件仅用于展览通知，请通过 App 或官网完成预约。',
        ],
        bodyEn: [
          'Two member-priority exhibitions open in September. The permanent galleries stay open late on the last Friday of each month.',
          'Member booking opens three days before general booking. This mail is a notice; reservations are made directly in the app or on the website.',
        ],
      },
    ]),
  },
  {
    id: 'mail_fixture_yeonseo_recital',
    folder: 'inbox',
    senderNameZh: 'Yun I-seo',
    senderNameEn: 'Yun Seo',
    senderAddress: 'yunseo@daon.kr',
    avatarTone: 'rose',
    labelIds: ['personal'],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_yeonseo_recital_1',
        offsetMinutes: -17110,
        subjectZh: '邀请你参加下周的钢琴独奏会',
        subjectEn: 'Invitation to next week’s piano recital',
        bodyZh: [
          '好久不见。下周六晚上我要参加学校的独奏会。',
          '如果有时间，希望你能来。开场曲是你一直很喜欢的那首拉赫玛尼诺夫。结束后一起在附近吃晚饭吧。',
        ],
        bodyEn: [
          'It has been a while. I am on stage for the school recital next Saturday evening.',
          'I would love it if you could come. The program opens with the Rachmaninoff you always liked. Let’s have dinner nearby afterwards.',
        ],
      },
    ]),
  },
  {
    id: 'mail_fixture_daon_welcome',
    folder: 'inbox',
    senderNameZh: 'Daon 邮件',
    senderNameEn: 'Daon Mail',
    senderAddress: 'welcome@daon.kr',
    avatarTone: 'green',
    labelIds: ['notice'],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_daon_welcome_1',
        offsetMinutes: -28760,
        subjectZh: '欢迎使用 Daon 邮件',
        subjectEn: 'Welcome to Daon Mail',
        bodyZh: [
          '感谢使用 Daon 邮件。你可以通过收件箱、草稿箱和归档整理邮件，也可以用星标收藏重要消息。',
          '搜索范围包括发件人、主题和正文。暂时不需要的邮件可以移入归档。',
        ],
        bodyEn: [
          'Thank you for starting with Daon Mail. Organize letters with Inbox, Drafts, and Archive, and star what matters.',
          'Search covers senders, subjects, and bodies. Move letters you are done with into the Archive.',
        ],
      },
    ]),
  },
  {
    id: 'mail_fixture_lucky_spam',
    folder: 'spam',
    senderNameZh: '幸运活动中心',
    senderNameEn: 'Lucky Event',
    senderAddress: 'winner@lucky-event-kr.biz',
    avatarTone: 'slate',
    labelIds: [],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_lucky_spam_1',
        offsetMinutes: -1380,
        subjectZh: '恭喜中奖！奖品领取通知（需要确认）',
        subjectEn: 'Congratulations! Prize win notice (confirm needed)',
        bodyZh: [
          '您已在本次活动中获奖。请在下方链接填写账户和身份信息，以便领取奖品。',
          '此邮件是被 Daon 邮件垃圾过滤器识别的示例邮件，请勿点击其中的链接。',
        ],
        bodyEn: [
          'You won our event. Enter your account and ID details at the link below to claim the prize.',
          'This mail is a sample classified as spam by the Daon Mail filter. Do not click the link.',
        ],
      },
    ]),
  },
])

export const getMailShellThreadById = (threadId) =>
  MAIL_SHELL_THREADS.find((thread) => thread.id === threadId) || null

export const resolveMailScheduleHandoffDraftV1 = (sourceRecordId) => {
  const recordId = typeof sourceRecordId === 'string' ? sourceRecordId.trim() : ''
  if (!recordId) return null
  for (const thread of MAIL_SHELL_THREADS) {
    const mail = thread.mails.find((candidate) => candidate.id === recordId)
    if (mail?.invite?.scheduleHandoffDraft) {
      return normalizeScheduleHandoffDraftV1(mail.invite.scheduleHandoffDraft)
    }
  }
  return null
}

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const padTwo = (value) => String(value).padStart(2, '0')

const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

// Portal-mail time label: minutes ago for fresh, clock for today, then yesterday/weekday/date.
export const formatMailShellTime = (now, offsetMinutes, isZh) => {
  const nowDate = now instanceof Date ? now : new Date(now)
  const at = new Date(nowDate.getTime() + offsetMinutes * 60_000)
  const minutesAgo = Math.max(0, Math.floor((nowDate.getTime() - at.getTime()) / 60_000))
  if (minutesAgo < 60) {
    return isZh ? `${minutesAgo} 分钟前` : `${minutesAgo}m ago`
  }
  const hour = at.getHours()
  const minute = padTwo(at.getMinutes())
  if (isSameCalendarDay(at, nowDate)) {
    return isZh ? `今天 ${padTwo(hour)}:${minute}` : `${hour % 12 || 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`
  }
  const yesterday = new Date(dayStart(nowDate).getTime() - 86_400_000)
  if (isSameCalendarDay(at, yesterday)) {
    return isZh ? '昨天' : 'Yesterday'
  }
  const daysAgo = Math.floor((dayStart(nowDate).getTime() - dayStart(at).getTime()) / 86_400_000)
  if (daysAgo < 7) {
    return isZh ? `周${WEEKDAY_ZH[at.getDay()]}` : WEEKDAY_EN[at.getDay()]
  }
  return isZh ? `${at.getMonth() + 1}月${at.getDate()}日` : `${MONTH_EN[at.getMonth()]} ${at.getDate()}`
}
