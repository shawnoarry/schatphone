// Daon Mail S1 fixture data (roadmap 4.16 / SHP-1).
// Static shell-preview fixtures only: no Store, no backup section, no cross-owner writes.
// Fixture thread IDs are stable; the S1 preview state overlays read/star/archive/draft/sent on top.

export const MAIL_SHELL_BRAND = Object.freeze({
  id: 'daon_mail',
  nameZh: '다온메일',
  nameEn: 'Daon Mail',
  wordmarkZh: '다온메일',
  wordmarkEn: 'Daon Mail',
  taglineZh: '모든 소식을 다 온편하게 · 把每条消息都稳稳收到',
  taglineEn: 'Every letter arrives calm and on time',
  domain: 'daon.kr',
})

export const MAIL_SHELL_ACCOUNT = Object.freeze({
  address: 'me@daon.kr',
  nameZh: '나 (이등석)',
  nameEn: 'Me (Lee Deungseok)',
  planZh: '다온 메일 플러스',
  planEn: 'Daon Mail Plus',
})

export const MAIL_SHELL_FOLDERS = Object.freeze([
  { id: 'inbox', icon: 'fas fa-inbox', nameZh: '받은메일함 · 收件箱', nameEn: 'Inbox', shortZh: '收件箱', shortEn: 'Inbox' },
  { id: 'starred', icon: 'fas fa-star', nameZh: '중요메일 · 星标邮件', nameEn: 'Starred', shortZh: '星标', shortEn: 'Starred' },
  { id: 'sent', icon: 'fas fa-paper-plane', nameZh: '보낸메일함 · 已发送', nameEn: 'Sent', shortZh: '已发送', shortEn: 'Sent' },
  { id: 'drafts', icon: 'fas fa-file-lines', nameZh: '임시보관함 · 草稿箱', nameEn: 'Drafts', shortZh: '草稿', shortEn: 'Drafts' },
  { id: 'archive', icon: 'fas fa-box-archive', nameZh: '보관함 · 归档', nameEn: 'Archive', shortZh: '归档', shortEn: 'Archive' },
  { id: 'spam', icon: 'fas fa-ban', nameZh: '스팸메일함 · 垃圾邮件', nameEn: 'Spam', shortZh: '垃圾', shortEn: 'Spam' },
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
    senderNameZh: '한울 엔터테인먼트',
    senderNameEn: 'Hanul Entertainment',
    senderAddress: 'schedule@hanul-enter.kr',
    avatarTone: 'green',
    labelIds: ['schedule', 'notice'],
    defaultUnread: true,
    mails: Object.freeze([
      {
        id: 'mail_fixture_hanul_schedule_2',
        offsetMinutes: -36,
        subjectZh: '[공지] 9월 컴백 준비 스케줄 확정 안내',
        subjectEn: '[Notice] September comeback preparation schedule confirmed',
        bodyZh: [
          '안녕하세요, 매니저님. 9월 컴백 준비 스케줄이 확정되어 공유드립니다.',
          '다음 주 화요일 오전 10시 연습실 전체 회의에서 최종 안무 버전을 확정하고, 목요일에는 의상/헤어 최종 피팅이 진행됩니다. 사전에 확인할 자료를 첨부와 함께 전달드리니 회의 전까지 검토 부탁드립니다.',
          '변경 사항이 생길 경우 이 메일 주소로 다시 안내드립니다. 감사합니다.',
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
        subjectZh: '[사전 공지] 9월 컴백 일정 초안 수렴 중',
        subjectEn: '[Early notice] September comeback draft schedule converging',
        bodyZh: [
          '컴백 일정 초안이 수렴 중입니다. 확정 안내는 별도 메일로 다시 전달드립니다.',
          '이번 주 내로 확정될 예정이니, 수요일과 목요일의 이동 가능 시간을 확보해 주시면 감사하겠습니다.',
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
    senderNameZh: '서울대학교병원',
    senderNameEn: 'Seoul National University Hospital',
    senderAddress: 'reserve@snuh-health.kr',
    avatarTone: 'blue',
    labelIds: ['reservation'],
    defaultUnread: true,
    mails: Object.freeze([
      {
        id: 'mail_fixture_snuh_checkup_1',
        offsetMinutes: -187,
        subjectZh: '[예약 확정] 8/28(금) 종합건강검진 안내',
        subjectEn: '[Confirmed] Comprehensive health checkup on Fri Aug 28',
        bodyZh: [
          '예약이 확정되었습니다. 검진 센터 3층 접수처에서 신분증과 예약번호를 제시해 주세요.',
          '검진 전 8시간 공복이 필요하며, 물은 조금 마셔도 괜찮습니다. 당일 오전 7시 50분까지 도착 부탁드립니다. 검진 소요 시간은 약 3시간입니다.',
          '일정 변경이 필요하시면 이 메일에 회신하거나 예약 페이지에서 직접 변경하실 수 있습니다.',
        ],
        bodyEn: [
          'Your reservation is confirmed. Please present your ID and reservation number at the checkup center, floor 3.',
          'An 8-hour fast is required before the checkup; small amounts of water are fine. Please arrive by 7:50 AM. The checkup takes about three hours.',
          'To change the schedule, reply to this mail or edit the reservation directly on the booking page.',
        ],
        invite: Object.freeze({
          route: '/calendar',
          titleZh: '종합건강검진 · 综合健康体检',
          titleEn: 'Comprehensive health checkup',
          whenZh: '8월 28일(금) 오전 7:50 · 8月28日（周五）上午 7:50',
          whenEn: 'Fri Aug 28, 7:50 AM',
          whereZh: '서울대학교병원 검진센터 3층 · 体检中心 3 层',
          whereEn: 'SNUH checkup center, floor 3',
          actionZh: '日历中查看',
          actionEn: 'View in Calendar',
        }),
      },
    ]),
  },
  {
    id: 'mail_fixture_bitnari_letter',
    folder: 'inbox',
    senderNameZh: '빛나리 팬클럽',
    senderNameEn: 'Bitnari Fan Club',
    senderAddress: 'letter@bitnari-fan.kr',
    avatarTone: 'rose',
    labelIds: ['unverified'],
    defaultUnread: true,
    mails: Object.freeze([
      {
        id: 'mail_fixture_bitnari_letter_1',
        offsetMinutes: -1682,
        subjectZh: '주간 레터: 컴백 날짜 소문과 현장 이야기',
        subjectEn: 'Weekly letter: comeback-date rumor and scene stories',
        bodyZh: [
          '이번 주 레터가 도착했습니다. 컴백 날쯤이라는 이야기가 커뮤니티에서 돌고 있지만, 소속사 공식 발표는 아직 없습니다. 이 메일의 날짜 이야기는 확인되지 않은 소문입니다.',
          '대신 지난 주 음악 방송 현장 사진과 대기 준비 이야기, 그리고 팬들이 모은 응원 메시지를 정리해 전달합니다.',
          '공식 일정이 나오면 레터에서 다시 정리해 드릴게요.',
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
    senderNameZh: '다온부동산',
    senderNameEn: 'Daon Realty',
    senderAddress: 'listing@daon-realty.kr',
    avatarTone: 'teal',
    labelIds: ['listing'],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_daon_realty_1',
        offsetMinutes: -2950,
        subjectZh: '요청하신 한남동 매물 알림 (신규 2건)',
        subjectEn: 'Requested Hannam-dong listing alert (2 new)',
        bodyZh: [
          '말씀하신 조건(보증금 5천 이하 · 관리비 포함 · 지하철 10분)에 가까운 신규 매물 2건이 등록되었습니다.',
          '한남동 4거리 쪽 반지하는 역까지 7분이지만 채광이 약하고, 이태원 방향 3층은 옥상 테라스가 있으며 관리비가 조금 높습니다. 자세한 사항은 첨부 요약을 확인해 주세요.',
          '현장 예약을 원하시면 회신 주시면 시간표를 보내드립니다.',
        ],
        bodyEn: [
          'Two new listings close to your request (deposit under 50M · maintenance included · 10 min to subway) have been registered.',
          'The semi-basement near Hannam crossing is 7 minutes from the station but dim; the 3rd-floor unit toward Itaewon has a rooftop terrace with slightly higher maintenance. See the attached summaries.',
          'Reply if you would like a viewing; we will send the time table.',
        ],
        attachments: Object.freeze([
          attachment(
            'mail_fixture_daon_realty_att_1',
            '한남동-매물요약-2608.pdf',
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
        subjectZh: '주문하신 상품이 배송을 시작했습니다 (주문 2608-195-442)',
        subjectEn: 'Your order has shipped (order 2608-195-442)',
        bodyZh: [
          '주문하신 상품이 새벽 배송으로 출발했습니다. 내일 아침 7시 전 도착 예정입니다.',
          '상품: 서울 우유 1L 2팩, 어니언 베이글 6입, 냉동 블루베리 500g. 결제 금액과 배송 기사 정보는 첨부 내역에서 확인하실 수 있습니다.',
          '이 메일은 주문 상태 알림입니다. 주문 변경은 앱 내 주문 목록에서 가능합니다.',
        ],
        bodyEn: [
          'Your order has left for dawn delivery and should arrive before 7:00 AM tomorrow.',
          'Items: Seoul milk 1L ×2, onion bagels ×6, frozen blueberries 500g. Payment and courier details are in the attached statement.',
          'This mail is an order-status notice; order changes are made in the app’s order list.',
        ],
        attachments: Object.freeze([
          attachment('mail_fixture_kurly_att_1', '주문내역-2608194-442.pdf', 'pdf', '96 KB', '96 KB'),
          attachment('mail_fixture_kurly_att_2', '배송안내-배송기사.jpg', 'img', '212 KB', '212 KB'),
        ]),
      },
    ]),
  },
  {
    id: 'mail_fixture_daon_bank_statement',
    folder: 'inbox',
    senderNameZh: '다온뱅크',
    senderNameEn: 'Daon Bank',
    senderAddress: 'statement@daonbank.kr',
    avatarTone: 'violet',
    labelIds: ['statement'],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_daon_bank_statement_1',
        offsetMinutes: -7180,
        subjectZh: '7월 이용명세서가 준비되었습니다',
        subjectEn: 'Your July statement is ready',
        bodyZh: [
          '7월 이용명세서가 준비되었습니다. 이번 달 지출은 카드 결제 중심이며, 구독 결제 3건이 포함되어 있습니다.',
          '상세 내역은 첨부 명세서 또는 앱의 거래 내역에서 확인하실 수 있습니다. 이 메일에 금액을 직접 변경하거나 결제하는 기능은 없습니다.',
        ],
        bodyEn: [
          'Your July statement is ready. This month’s spending is card-centered and includes three subscription charges.',
          'Details are in the attached statement or the in-app transaction list. This mail cannot change or make any payment.',
        ],
        attachments: Object.freeze([
          attachment('mail_fixture_daon_bank_att_1', '다온뱅크-이용명세서-2026-07.pdf', 'pdf', '284 KB', '284 KB'),
        ]),
      },
    ]),
  },
  {
    id: 'mail_fixture_pharmacy_ready',
    folder: 'inbox',
    senderNameZh: '빛나는약국',
    senderNameEn: 'Bitnaneun Pharmacy',
    senderAddress: 'care@bitnaneun-pharm.kr',
    avatarTone: 'green',
    labelIds: ['notice'],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_pharmacy_ready_1',
        offsetMinutes: -8660,
        subjectZh: '조제가 완료되었습니다 (처방번호 P-2608-114)',
        subjectEn: 'Your prescription is ready (P-2608-114)',
        bodyZh: [
          '처방전에 따른 조제가 완료되었습니다. 영업 시간 내에 방문하셔서 처방번호를 말씀해 주시면 됩니다.',
          '복용 시간은 식후 30분이며, 남은 일수는 5일입니다. 궁금한 점은 전화로도 문의하실 수 있습니다.',
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
    senderNameZh: '국립중앙박물관',
    senderNameEn: 'National Museum of Korea',
    senderAddress: 'member@mus.kr',
    avatarTone: 'slate',
    labelIds: ['member', 'notice'],
    defaultUnread: true,
    mails: Object.freeze([
      {
        id: 'mail_fixture_museum_member_1',
        offsetMinutes: -11530,
        subjectZh: '회원님을 위한 9월 전시 안내',
        subjectEn: 'September exhibitions for members',
        bodyZh: [
          '9월 회원 우선 예약 전시 두 개가 열립니다. 상설관 야간 개관은 매달 마지막 주 금요일입니다.',
          '회원 우선 예약은 일반 예약보다 3일 먼저 열립니다. 이 메일은 전시 소식 안내이며, 예약은 앱 또는 홈페이지에서 직접 진행해 주세요.',
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
    senderNameZh: '윤이서',
    senderNameEn: 'Yun Seo',
    senderAddress: 'yunseo@daon.kr',
    avatarTone: 'rose',
    labelIds: ['personal'],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_yeonseo_recital_1',
        offsetMinutes: -17110,
        subjectZh: '다음 주 피아노 리사이틀 초대',
        subjectEn: 'Invitation to next week’s piano recital',
        bodyZh: [
          '오래간만이야. 다음 주 토요일 저녁에 학교 리사이틀 무대에 서게 됐어.',
          '시간 되면 와 줬으면 좋겠어. 프로그램 첫 곡은 네가 좋아하던 그 라흐마니노프야. 끝나고 근처에서 저녁 같이 먹자.',
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
    senderNameZh: '다온메일',
    senderNameEn: 'Daon Mail',
    senderAddress: 'welcome@daon.kr',
    avatarTone: 'green',
    labelIds: ['notice'],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_daon_welcome_1',
        offsetMinutes: -28760,
        subjectZh: '다온메일에 오신 것을 환영합니다',
        subjectEn: 'Welcome to Daon Mail',
        bodyZh: [
          '다온메일을 시작해 주셔서 감사합니다. 받은메일함, 임시보관함, 보관함으로 편지를 정리하고, 별표로 중요한 소식을 모아둘 수 있습니다.',
          '검색은 보낸 사람, 제목, 본문을 모두 찾아줍니다. 필요 없는 편지는 보관함으로 옮겨두세요.',
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
    senderNameZh: '럭키 이벤트',
    senderNameEn: 'Lucky Event',
    senderAddress: 'winner@lucky-event-kr.biz',
    avatarTone: 'slate',
    labelIds: [],
    defaultUnread: false,
    mails: Object.freeze([
      {
        id: 'mail_fixture_lucky_spam_1',
        offsetMinutes: -1380,
        subjectZh: '축하합니다! 경품 당첨 안내 (확인 필요)',
        subjectEn: 'Congratulations! Prize win notice (confirm needed)',
        bodyZh: [
          '귀하가 이벤트에 당첨되었습니다. 아래 링크에서 계좌와 신분 정보를 입력하시면 상품이 발송됩니다.',
          '본 메일은 다온메일 스팸 필터에 의해 스팸함으로 분류된 예시 메일입니다. 링크를 누르지 마세요.',
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
