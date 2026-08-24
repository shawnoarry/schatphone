export const WORKPLACE_SHELL_STORAGE_KEY = 'schatphone:workplace-shell:preview-state'
export const WORKPLACE_SHELL_STORAGE_VERSION = 2

export const WORKPLACE_BRAND = Object.freeze({
  nameZh: '工作台',
  nameEn: 'Work Hub',
  companyZh: 'Morrow Entertainment',
  companyEn: 'Morrow Entertainment',
  taglineZh: '今天的工作，按现场顺序展开',
  taglineEn: 'Today, in working order',
})

export const WORKPLACE_ROLE_TEMPLATES = Object.freeze({
  artist: Object.freeze({
    id: 'artist',
    labelZh: '艺人',
    labelEn: 'Artist',
    modules: ['call_sheet', 'team', 'confirmations', 'content_review', 'status_report', 'credential'],
  }),
  manager: Object.freeze({
    id: 'manager',
    labelZh: '经纪人',
    labelEn: 'Manager',
    modules: ['represented_artists', 'conflicts', 'approvals', 'assignments', 'external_coordination'],
  }),
  assistant: Object.freeze({
    id: 'assistant',
    labelZh: '助理',
    labelEn: 'Assistant',
    modules: ['tasks', 'pickup_arrival', 'materials', 'status_report', 'team_channel'],
  }),
  producer: Object.freeze({
    id: 'producer',
    labelZh: '制作人',
    labelEn: 'Producer',
    modules: ['project_rooms', 'recording_schedule', 'files', 'review_deadlines', 'works_references'],
  }),
  employee: Object.freeze({
    id: 'employee',
    labelZh: '职员',
    labelEn: 'Employee',
    modules: ['department_channel', 'tasks', 'meetings', 'attendance', 'leave_approvals'],
  }),
  student: Object.freeze({
    id: 'student',
    labelZh: '学生',
    labelEn: 'Student',
    modules: ['class_channel', 'timetable', 'assignments', 'deadlines', 'attendance', 'clubs'],
  }),
})

export const resolveWorkplaceRoleTemplate = (roleId = 'artist') =>
  WORKPLACE_ROLE_TEMPLATES[roleId] || WORKPLACE_ROLE_TEMPLATES.artist

export const WORKPLACE_MEMBERSHIP = Object.freeze({
  id: 'membership-morrow-artist-001',
  organizationId: 'org-morrow-entertainment',
  userDisplayName: 'V',
  roleId: 'artist',
  stageName: 'V',
  teamNameZh: '艺人 1 组',
  teamNameEn: 'Artist Team 1',
  status: 'active_fixture',
  revision: 3,
  credentialLabelZh: 'Morrow · 艺人所属凭证',
  credentialLabelEn: 'Morrow · Artist affiliation credential',
})

export const WORKPLACE_TEAM = Object.freeze([
  Object.freeze({ id: 'member-han-seojun', initials: 'HS', nameZh: '韩瑞俊', nameEn: 'Han Seojun', roleZh: '总经纪人', roleEn: 'Lead manager', tone: 'ink' }),
  Object.freeze({ id: 'member-yoon-mina', initials: 'YM', nameZh: '尹敏雅', nameEn: 'Yoon Mina', roleZh: '现场经纪人', roleEn: 'Field manager', tone: 'coral' }),
  Object.freeze({ id: 'member-park-doyeon', initials: 'PD', nameZh: '朴度妍', nameEn: 'Park Doyeon', roleZh: '造型负责人', roleEn: 'Styling lead', tone: 'sage' }),
  Object.freeze({ id: 'member-choi-jun', initials: 'CJ', nameZh: '崔俊', nameEn: 'Choi Jun', roleZh: '内容企划', roleEn: 'Content coordinator', tone: 'gold' }),
])

export const WORKPLACE_CALL_SHEET = Object.freeze({
  id: 'call-sheet-kbs-music-bank-20260825',
  titleZh: 'Music Bank 预录',
  titleEn: 'Music Bank pre-recording',
  date: '2026-08-25',
  callTime: '05:40',
  onAirTime: '17:10',
  venueZh: 'KBS 新馆 · 公开厅',
  venueEn: 'KBS New Building · Open Hall',
  statusZh: '等待艺人确认',
  statusEn: 'Artist confirmation needed',
  calendarRef: Object.freeze({ owner: 'calendar', recordType: 'proposal', recordId: 'calendar-proposal-kbs-20260825', revision: 1 }),
  agendaRef: Object.freeze({ owner: 'agenda_journey', recordType: 'preview', recordId: 'agenda-preview-kbs-20260825', revision: 1 }),
  mapRef: Object.freeze({ owner: 'map', recordType: 'place', recordId: 'seoul-kbs-hq', mapPackId: 'real-seoul-v1', worldId: 'world_modern_seoul', revision: 1 }),
  checkpoints: Object.freeze([
    Object.freeze({ id: 'checkpoint-lobby', time: '05:40', labelZh: '大厅集合', labelEn: 'Lobby call' }),
    Object.freeze({ id: 'checkpoint-styling', time: '06:10', labelZh: '妆发与服装', labelEn: 'Hair, makeup & wardrobe' }),
    Object.freeze({ id: 'checkpoint-rehearsal', time: '08:20', labelZh: '走台', labelEn: 'Stage rehearsal' }),
    Object.freeze({ id: 'checkpoint-prerecord', time: '10:00', labelZh: '预录', labelEn: 'Pre-recording' }),
  ]),
})

export const WORKPLACE_TASKS = Object.freeze([
  Object.freeze({ id: 'task-in-ear-check', titleZh: '确认耳返盒已装包', titleEn: 'Confirm in-ear case is packed', ownerZh: '本人确认', ownerEn: 'Self confirmation', dueZh: '今晚 22:00', dueEn: 'Tonight 22:00', priority: 'high' }),
  Object.freeze({ id: 'task-stage-intro', titleZh: '审阅舞台介绍文案', titleEn: 'Review stage introduction copy', ownerZh: '内容企划', ownerEn: 'Content team', dueZh: '今天 19:30', dueEn: 'Today 19:30', priority: 'normal' }),
  Object.freeze({ id: 'task-outfit-pick', titleZh: '确认候选服装 A / B', titleEn: 'Confirm wardrobe option A / B', ownerZh: '造型组', ownerEn: 'Styling team', dueZh: '今天 18:40', dueEn: 'Today 18:40', priority: 'normal' }),
])

export const WORKPLACE_CHANNELS = Object.freeze([
  Object.freeze({
    id: 'channel-artist-team-1',
    nameZh: '艺人 1 组 · 现场',
    nameEn: 'Artist Team 1 · Field',
    descriptionZh: '行程确认、现场集合和随身物品。',
    descriptionEn: 'Schedule confirmations, field calls, and carry items.',
    messages: Object.freeze([
      Object.freeze({ id: 'message-field-1', authorId: 'member-yoon-mina', authorZh: '尹敏雅', authorEn: 'Yoon Mina', time: '17:42', bodyZh: '明早车辆 04:55 到楼下。服装箱由我先送到台里。', bodyEn: 'The car arrives downstairs at 04:55. I will send the wardrobe case to the station first.' }),
      Object.freeze({ id: 'message-field-2', authorId: 'member-park-doyeon', authorZh: '朴度妍', authorEn: 'Park Doyeon', time: '17:48', bodyZh: 'A 套已经改好腰线，B 套保留作直播候选。请在 18:40 前确认。', bodyEn: 'Option A has the waist adjustment. Option B stays as the live-broadcast alternative. Please confirm by 18:40.' }),
    ]),
  }),
  Object.freeze({
    id: 'channel-content-review',
    nameZh: '内容审阅',
    nameEn: 'Content review',
    descriptionZh: '公开文案、短片与节目资料的内部确认。',
    descriptionEn: 'Internal review for public copy, clips, and broadcast materials.',
    messages: Object.freeze([
      Object.freeze({ id: 'message-content-1', authorId: 'member-choi-jun', authorZh: '崔俊', authorEn: 'Choi Jun', time: '16:26', bodyZh: '舞台介绍第二版已放入审阅任务，修改点只涉及结尾一句。', bodyEn: 'The second stage-intro draft is in the review task. Only the closing sentence changed.' }),
    ]),
  }),
])

export const WORKPLACE_SCHEDULE_PROPOSALS = Object.freeze([
  Object.freeze({
    id: 'proposal-radio-20260827',
    titleZh: '电台《夜航》嘉宾录制',
    titleEn: 'Night Flight radio guest recording',
    dateZh: '8 月 27 日 · 20:00–21:20',
    dateEn: 'Aug 27 · 20:00–21:20',
    requesterZh: '宣传组 · 李彩琳',
    requesterEn: 'PR team · Lee Chaerin',
    noteZh: '与现有练习安排相邻，接受后仍需由排期人员正式写入日历。',
    noteEn: 'Adjacent to the current practice plan. Acceptance still requires scheduling staff to commit it to Calendar.',
  }),
])

export const WORKPLACE_STATUS_OPTIONS = Object.freeze([
  Object.freeze({ id: 'ready', labelZh: '准备完成', labelEn: 'Ready' }),
  Object.freeze({ id: 'needs_support', labelZh: '需要协助', labelEn: 'Need support' }),
  Object.freeze({ id: 'running_late', labelZh: '可能延迟', labelEn: 'May be delayed' }),
])

export const findWorkplaceChannel = (channelId) =>
  WORKPLACE_CHANNELS.find((channel) => channel.id === channelId) || null

export const findWorkplaceTask = (taskId) =>
  WORKPLACE_TASKS.find((task) => task.id === taskId) || null

export const findWorkplaceProposal = (proposalId) =>
  WORKPLACE_SCHEDULE_PROPOSALS.find((proposal) => proposal.id === proposalId) || null
