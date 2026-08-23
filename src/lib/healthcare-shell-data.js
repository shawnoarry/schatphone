export const HEALTHCARE_SHELL_STORAGE_KEY = 'schatphone:healthcare-shell:s1'
export const HEALTHCARE_SHELL_STORAGE_VERSION = 1

export const HEALTHCARE_BRAND = Object.freeze({
  nameZh: '温谈健康',
  nameEn: 'Ondam Care',
  taglineZh: '把照护安排得从容一点',
  taglineEn: 'Care, arranged with calm',
})

const placeRef = (recordId, revision = 1) =>
  Object.freeze({
    owner: 'map',
    recordType: 'place',
    recordId,
    revision,
    worldId: 'world_modern_seoul',
  })

export const HEALTHCARE_CATEGORIES = Object.freeze([
  { id: 'all', icon: 'fa-compass', labelZh: '全部', labelEn: 'All' },
  { id: 'clinic', icon: 'fa-stethoscope', labelZh: '门诊', labelEn: 'Clinic' },
  { id: 'checkup', icon: 'fa-notes-medical', labelZh: '体检', labelEn: 'Checkup' },
  { id: 'dental', icon: 'fa-tooth', labelZh: '牙科', labelEn: 'Dental' },
  { id: 'counseling', icon: 'fa-seedling', labelZh: '心理咨询', labelEn: 'Counseling' },
])

export const HEALTHCARE_INSTITUTIONS = Object.freeze([
  {
    id: 'ondam-daehakro-clinic',
    category: 'clinic',
    nameZh: '温谈大学路门诊',
    nameEn: 'Ondam Daehak-ro Clinic',
    shortZh: '大学路',
    shortEn: 'Daehak-ro',
    summaryZh: '适合日常不适咨询、复诊安排与基础检查的世界内综合门诊。',
    summaryEn: 'An in-world general clinic for routine concerns, follow-ups, and basic checks.',
    hoursZh: '工作日 09:00–20:00',
    hoursEn: 'Weekdays 09:00–20:00',
    distanceZh: '预计 28 分钟',
    distanceEn: 'About 28 min',
    tone: 'pine',
    sourceStatus: 'available',
    locationReferenceZh: '地点参考：首尔大学医院区域',
    locationReferenceEn: 'Location reference: Seoul National University Hospital area',
    placeRef: placeRef('seoul-national-university-hospital', 1),
    departmentIds: ['general-care', 'family-medicine'],
    serviceIds: ['routine-consultation', 'follow-up-consultation'],
  },
  {
    id: 'ondam-songpa-checkup',
    category: 'checkup',
    nameZh: '温谈松坡体检中心',
    nameEn: 'Ondam Songpa Checkup Center',
    shortZh: '松坡',
    shortEn: 'Songpa',
    summaryZh: '提供预约制基础体检与工作日程友好的早间时段。',
    summaryEn: 'Appointment-based routine checkups with work-friendly morning slots.',
    hoursZh: '周一至周六 07:30–16:30',
    hoursEn: 'Mon–Sat 07:30–16:30',
    distanceZh: '预计 41 分钟',
    distanceEn: 'About 41 min',
    tone: 'apricot',
    sourceStatus: 'available',
    locationReferenceZh: '地点参考：首尔峨山医院区域',
    locationReferenceEn: 'Location reference: Asan Medical Center area',
    placeRef: placeRef('seoul-asan-medical-center', 1),
    departmentIds: ['health-screening'],
    serviceIds: ['basic-checkup', 'vocal-care-checkup'],
  },
  {
    id: 'ondam-sinchon-dental',
    category: 'dental',
    nameZh: '温谈新村牙科',
    nameEn: 'Ondam Sinchon Dental',
    shortZh: '新村',
    shortEn: 'Sinchon',
    summaryZh: '以检查、洁牙和日常口腔护理为主的预约制牙科。',
    summaryEn: 'Appointment-based dental exams, cleaning, and routine oral care.',
    hoursZh: '周二至周日 10:00–19:00',
    hoursEn: 'Tue–Sun 10:00–19:00',
    distanceZh: '预计 34 分钟',
    distanceEn: 'About 34 min',
    tone: 'blue',
    sourceStatus: 'available',
    locationReferenceZh: '地点参考：新村 Severance 医院区域',
    locationReferenceEn: 'Location reference: Severance Hospital area',
    placeRef: placeRef('seoul-severance-hospital', 1),
    departmentIds: ['dentistry'],
    serviceIds: ['dental-exam', 'dental-cleaning'],
  },
  {
    id: 'ondam-hannam-counseling',
    category: 'counseling',
    nameZh: '温谈汉南心安室',
    nameEn: 'Ondam Hannam Quiet Room',
    shortZh: '汉南',
    shortEn: 'Hannam',
    summaryZh: '世界内预约制心理支持空间；当前地点来源已撤回，无法继续预约。',
    summaryEn: 'An in-world counseling space. Its place source was withdrawn, so booking is unavailable.',
    hoursZh: '来源不可用',
    hoursEn: 'Source unavailable',
    distanceZh: '无法估算',
    distanceEn: 'Estimate unavailable',
    tone: 'lilac',
    sourceStatus: 'unavailable',
    locationReferenceZh: '地点来源已撤回',
    locationReferenceEn: 'Place source withdrawn',
    placeRef: placeRef('retired-ondam-hannam-counseling', 3),
    departmentIds: ['counseling'],
    serviceIds: ['support-consultation'],
  },
])

export const HEALTHCARE_DEPARTMENTS = Object.freeze([
  { id: 'general-care', nameZh: '综合门诊', nameEn: 'General Care' },
  { id: 'family-medicine', nameZh: '家庭医学', nameEn: 'Family Medicine' },
  { id: 'health-screening', nameZh: '健康检查', nameEn: 'Health Screening' },
  { id: 'dentistry', nameZh: '口腔科', nameEn: 'Dentistry' },
  { id: 'counseling', nameZh: '心理支持', nameEn: 'Counseling' },
])

export const HEALTHCARE_SERVICES = Object.freeze([
  {
    id: 'routine-consultation',
    institutionId: 'ondam-daehakro-clinic',
    departmentId: 'general-care',
    nameZh: '日常门诊咨询',
    nameEn: 'Routine consultation',
    durationZh: '约 20 分钟',
    durationEn: 'About 20 min',
    clinicianZh: '韩书妍 · 世界内虚构医师',
    clinicianEn: 'Han Seoyeon · fictional in-world clinician',
    preparationZh: '无需上传真实病历。选择一个概括性来访原因即可。',
    preparationEn: 'No real medical record is needed. Choose a general visit reason only.',
    dateSlots: [
      { date: '2026-08-25', times: ['10:20', '11:40', '16:10'] },
      { date: '2026-08-26', times: ['09:30', '14:20', '18:40'] },
    ],
  },
  {
    id: 'follow-up-consultation',
    institutionId: 'ondam-daehakro-clinic',
    departmentId: 'family-medicine',
    nameZh: '一般复诊',
    nameEn: 'General follow-up',
    durationZh: '约 15 分钟',
    durationEn: 'About 15 min',
    clinicianZh: '值班医师 · 世界内 fixture',
    clinicianEn: 'Duty clinician · in-world fixture',
    preparationZh: '可在预约详情中查看世界内准备事项。',
    preparationEn: 'In-world preparation notes appear in appointment details.',
    dateSlots: [{ date: '2026-08-27', times: ['13:10', '15:40', '19:00'] }],
  },
  {
    id: 'basic-checkup',
    institutionId: 'ondam-songpa-checkup',
    departmentId: 'health-screening',
    nameZh: '基础生活体检',
    nameEn: 'Routine life checkup',
    durationZh: '约 90 分钟',
    durationEn: 'About 90 min',
    clinicianZh: '体检团队 · 世界内 fixture',
    clinicianEn: 'Screening team · in-world fixture',
    preparationZh: '预约前一日 22:00 后仅饮水；这是世界内预约说明，不是现实医疗建议。',
    preparationEn: 'Water only after 22:00 the previous day. This is an in-world booking note, not real medical advice.',
    dateSlots: [
      { date: '2026-08-29', times: ['08:00', '09:10'] },
      { date: '2026-09-01', times: ['07:40', '10:20'] },
    ],
  },
  {
    id: 'vocal-care-checkup',
    institutionId: 'ondam-songpa-checkup',
    departmentId: 'health-screening',
    nameZh: '声音工作者基础检查',
    nameEn: 'Voice-worker routine check',
    durationZh: '约 45 分钟',
    durationEn: 'About 45 min',
    clinicianZh: '声音照护团队 · 世界内 fixture',
    clinicianEn: 'Voice-care team · in-world fixture',
    preparationZh: '仅用于默认 K-pop 世界的生活叙事，不会分析用户真实声音。',
    preparationEn: 'For everyday K-pop-world storytelling only; no real voice data is analyzed.',
    dateSlots: [{ date: '2026-08-28', times: ['11:00', '15:30'] }],
  },
  {
    id: 'dental-exam',
    institutionId: 'ondam-sinchon-dental',
    departmentId: 'dentistry',
    nameZh: '口腔基础检查',
    nameEn: 'Routine dental exam',
    durationZh: '约 30 分钟',
    durationEn: 'About 30 min',
    clinicianZh: '尹夏琳 · 世界内虚构医师',
    clinicianEn: 'Yoon Harin · fictional in-world clinician',
    preparationZh: '无需填写真实牙科病史。',
    preparationEn: 'No real dental history is requested.',
    dateSlots: [{ date: '2026-08-30', times: ['10:30', '13:30', '17:00'] }],
  },
  {
    id: 'dental-cleaning',
    institutionId: 'ondam-sinchon-dental',
    departmentId: 'dentistry',
    nameZh: '日常洁牙',
    nameEn: 'Routine cleaning',
    durationZh: '约 40 分钟',
    durationEn: 'About 40 min',
    clinicianZh: '口腔护理团队 · 世界内 fixture',
    clinicianEn: 'Dental care team · in-world fixture',
    preparationZh: '世界内模拟服务，不替代现实口腔护理建议。',
    preparationEn: 'An in-world simulated service, not a replacement for real dental advice.',
    dateSlots: [{ date: '2026-09-02', times: ['11:20', '15:10'] }],
  },
  {
    id: 'support-consultation',
    institutionId: 'ondam-hannam-counseling',
    departmentId: 'counseling',
    nameZh: '支持性谈话',
    nameEn: 'Support conversation',
    durationZh: '约 50 分钟',
    durationEn: 'About 50 min',
    clinicianZh: '来源不可用',
    clinicianEn: 'Source unavailable',
    preparationZh: '当前不可预约。',
    preparationEn: 'Booking is currently unavailable.',
    dateSlots: [],
  },
])

export const HEALTHCARE_VISIT_REASONS = Object.freeze([
  { id: 'routine', labelZh: '日常状态咨询', labelEn: 'Routine wellbeing question' },
  { id: 'follow-up', labelZh: '按既有安排复诊', labelEn: 'Scheduled follow-up' },
  { id: 'work-schedule', labelZh: '工作日前的基础检查', labelEn: 'Routine check before work schedule' },
  { id: 'preventive', labelZh: '常规预防性检查', labelEn: 'Routine preventive check' },
])

export const HEALTHCARE_FIXTURE_APPOINTMENTS = Object.freeze([
  {
    id: 'appt-fixture-voice-check-20260824',
    serviceId: 'vocal-care-checkup',
    institutionId: 'ondam-songpa-checkup',
    date: '2026-08-28',
    time: '11:00',
    reasonId: 'work-schedule',
    status: 'confirmed',
    revision: 1,
    createdAt: '2026-08-22T09:30:00.000Z',
    authored: true,
  },
])

export const HEALTHCARE_REPORTS = Object.freeze([
  {
    id: 'report-routine-screening-2026',
    revision: 2,
    priorRevision: 1,
    status: 'corrected',
    issuedAt: '2026-08-22T08:10:00.000Z',
    titleZh: '年度基础体检报告',
    titleEn: 'Annual routine checkup report',
    institutionZh: '温谈松坡体检中心',
    institutionEn: 'Ondam Songpa Checkup Center',
    summaryZh: '这是世界内 authored 示例报告。第 2 版修正了一个项目的单位显示，未改变数值。',
    summaryEn: 'This is an authored in-world sample. Revision 2 corrects one displayed unit without changing its value.',
    correctionZh: '修正记录：将“血红蛋白”单位由错误的 mg/dL 更正为 g/dL。第 1 版仍保留在修订记录中。',
    correctionEn: 'Correction: the hemoglobin unit was changed from an incorrect mg/dL to g/dL. Revision 1 remains in history.',
    rows: [
      { id: 'height', itemZh: '身高', itemEn: 'Height', value: '168.2', unit: 'cm', referenceZh: '记录值', referenceEn: 'Recorded value', flag: 'normal' },
      { id: 'weight', itemZh: '体重', itemEn: 'Weight', value: '54.6', unit: 'kg', referenceZh: '记录值', referenceEn: 'Recorded value', flag: 'normal' },
      { id: 'pulse', itemZh: '静息脉搏', itemEn: 'Resting pulse', value: '72', unit: 'bpm', referenceZh: '60–100', referenceEn: '60–100', flag: 'normal' },
      { id: 'hemoglobin', itemZh: '血红蛋白', itemEn: 'Hemoglobin', value: '13.1', unit: 'g/dL', referenceZh: '示例参考 12.0–16.0', referenceEn: 'Sample reference 12.0–16.0', flag: 'normal' },
      { id: 'vitamin-d', itemZh: '维生素 D（示例项目名称用于长表格适配）', itemEn: 'Vitamin D (sample long-name row for table adaptation)', value: '24.8', unit: 'ng/mL', referenceZh: '请按机构说明阅读', referenceEn: 'Read with institution guidance', flag: 'note' },
    ],
  },
  {
    id: 'report-vocal-baseline-2026',
    revision: 1,
    priorRevision: null,
    status: 'ready',
    issuedAt: '2026-08-18T12:20:00.000Z',
    titleZh: '声音工作者基础记录',
    titleEn: 'Voice-worker baseline record',
    institutionZh: '温谈大学路门诊',
    institutionEn: 'Ondam Daehak-ro Clinic',
    summaryZh: '世界内 authored 记录，仅用于展示工作日常中的预约与报告流程，不含现实诊断。',
    summaryEn: 'An authored in-world record demonstrating work-life appointment and report flow; it contains no real diagnosis.',
    correctionZh: '',
    correctionEn: '',
    rows: [
      { id: 'session', itemZh: '基础会话记录', itemEn: 'Baseline session record', value: '已完成', unit: '', referenceZh: '世界内记录', referenceEn: 'In-world record', flag: 'normal' },
      { id: 'follow-up', itemZh: '后续安排', itemEn: 'Follow-up', value: '按需预约', unit: '', referenceZh: '由用户自行决定', referenceEn: 'User decides', flag: 'note' },
    ],
  },
  {
    id: 'report-source-withdrawn',
    revision: 4,
    priorRevision: 3,
    status: 'unavailable',
    issuedAt: '2026-07-02T04:00:00.000Z',
    titleZh: '已撤回的报告来源',
    titleEn: 'Withdrawn report source',
    institutionZh: '旧合作机构',
    institutionEn: 'Former partner institution',
    summaryZh: '来源已撤回，缓存正文不会继续展示。',
    summaryEn: 'The source was withdrawn. Cached report content is not displayed.',
    correctionZh: '',
    correctionEn: '',
    rows: [],
  },
])

export const findHealthcareInstitution = (id) =>
  HEALTHCARE_INSTITUTIONS.find((institution) => institution.id === id) || null

export const findHealthcareService = (id) =>
  HEALTHCARE_SERVICES.find((service) => service.id === id) || null

export const findHealthcareDepartment = (id) =>
  HEALTHCARE_DEPARTMENTS.find((department) => department.id === id) || null

export const findHealthcareReport = (id) =>
  HEALTHCARE_REPORTS.find((report) => report.id === id) || null

export const formatHealthcareDate = (value, isZh = true) => {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(isZh ? 'zh-CN' : 'en-US', {
    month: isZh ? 'long' : 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

export const formatHealthcareIssuedAt = (value, isZh = true) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(isZh ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}
