<template>
  <div
    class="ondam-care-app"
    :class="{ 'is-night': isNightTheme, 'has-focused-page': focusedPage !== 'root' }"
    data-app="healthcare"
    data-testid="ondam-care-app"
  >
    <header class="care-app-header">
      <button
        type="button"
        class="care-icon-button care-app-header__home"
        :aria-label="t('返回主屏幕', 'Back to Home')"
        data-testid="healthcare-home-back"
        @click="goHome"
      >
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>

      <div class="care-brand">
        <span class="care-brand__mark" aria-hidden="true">
          <HealthcareMascot size="brand" pose="standing" />
        </span>
        <span class="care-brand__words">
          <strong>{{ isZh ? brand.nameZh : brand.nameEn }}</strong>
          <small>{{ isZh ? brand.taglineZh : brand.taglineEn }}</small>
        </span>
      </div>

      <span class="care-app-header__spacer"></span>
      <button
        type="button"
        class="care-icon-button"
        :aria-label="t('隐私说明', 'Privacy note')"
        data-testid="healthcare-privacy-open"
        @click="privacyOpen = true"
      >
        <i class="fas fa-shield-heart" aria-hidden="true"></i>
      </button>
    </header>

    <main class="care-app-main">
      <template v-if="focusedPage === 'root'">
        <section v-if="activeTab === 'discover'" class="care-discover" data-testid="healthcare-discover">
          <div class="care-hero">
            <div class="care-hero__copy">
              <span class="care-kicker">{{ t('世界内模拟医疗', 'IN-WORLD SIMULATED CARE') }}</span>
              <h1>{{ t('今天想安排什么照护？', 'What care would you like to arrange?') }}</h1>
              <p>
                {{ t('浏览门诊、体检与日常照护服务。这里不会收集你的真实健康资料。', 'Browse clinics, checkups, and everyday care. Your real health information is never requested here.') }}
              </p>
            </div>
            <span class="care-hero__mascot" aria-hidden="true">
              <HealthcareMascot size="hero" pose="standing" />
            </span>
          </div>

          <form class="care-search" role="search" @submit.prevent>
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <label class="sr-only" for="healthcare-search">{{ t('搜索机构、科室或服务', 'Search institutions, departments, or services') }}</label>
            <input
              id="healthcare-search"
              v-model="searchQuery"
              type="search"
              :placeholder="t('搜索机构、科室或服务', 'Search institutions, departments, or services')"
              data-testid="healthcare-search"
            />
            <button v-if="searchQuery" type="button" :aria-label="t('清除搜索', 'Clear search')" @click="searchQuery = ''">
              <i class="fas fa-circle-xmark" aria-hidden="true"></i>
            </button>
          </form>

          <div class="care-category-strip" :aria-label="t('服务类别', 'Service categories')">
            <button
              v-for="category in categories"
              :key="category.id"
              type="button"
              :class="{ 'is-active': category.id === activeCategory }"
              :aria-pressed="category.id === activeCategory"
              @click="activeCategory = category.id"
            >
              <i class="fas" :class="category.icon" aria-hidden="true"></i>
              <span>{{ category.label }}</span>
            </button>
          </div>

          <section class="care-overview" :aria-label="t('我的照护概览', 'My care overview')">
            <button type="button" data-testid="healthcare-overview-appointments" @click="activeTab = 'appointments'">
              <span class="care-overview__icon is-appointment" aria-hidden="true"><i class="fas fa-calendar-check"></i></span>
              <span class="care-overview__copy">
                <small>{{ t('预约中心', 'APPOINTMENTS') }}</small>
                <strong>{{ upcomingAppointment ? upcomingAppointment.serviceName : t('查看与管理预约', 'View and manage appointments') }}</strong>
                <span>{{ upcomingAppointment ? `${upcomingAppointment.dateLabel} · ${upcomingAppointment.time}` : t('当前没有待进行的本地预约', 'No upcoming local appointments') }}</span>
              </span>
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
            <button type="button" data-testid="healthcare-overview-reports" @click="activeTab = 'reports'">
              <span class="care-overview__icon is-report" aria-hidden="true"><i class="fas fa-file-waveform"></i></span>
              <span class="care-overview__copy">
                <small>{{ t('报告收件箱', 'REPORT INBOX') }}</small>
                <strong>{{ unreadReportCount ? t(`${unreadReportCount} 份报告待查看`, `${unreadReportCount} reports to review`) : t('报告已全部查看', 'All reports reviewed') }}</strong>
                <span>{{ reportPreview ? reportPreview.title : t('没有可用报告', 'No reports available') }}</span>
              </span>
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          </section>

          <div class="care-section-heading">
            <div>
              <span class="care-kicker">{{ t('照护目录', 'CARE DIRECTORY') }}</span>
              <h2>{{ t('可预约机构', 'Available places') }}</h2>
            </div>
            <span>{{ filteredInstitutions.length }} {{ t('处', 'places') }}</span>
          </div>

          <div v-if="filteredInstitutions.length" class="care-institution-grid">
            <article
              v-for="institution in filteredInstitutions"
              :key="institution.id"
              class="care-institution-card"
              :class="[`is-${institution.tone}`, { 'is-unavailable': institution.sourceStatus !== 'available' }]"
              :data-testid="`healthcare-institution-${institution.id}`"
            >
              <button type="button" class="care-institution-card__body" @click="openInstitution(institution.id)">
                <span class="care-institution-card__index" aria-hidden="true">{{ institution.index }}</span>
                <span class="care-institution-card__icon" aria-hidden="true">
                  <i class="fas" :class="institution.categoryIcon"></i>
                </span>
                <span class="care-institution-card__content">
                  <span class="care-institution-card__place">{{ institution.short }}</span>
                  <strong>{{ institution.name }}</strong>
                  <span>{{ institution.summary }}</span>
                  <span class="care-institution-card__meta">
                    <span><i class="fas fa-clock" aria-hidden="true"></i>{{ institution.hours }}</span>
                    <span><i class="fas fa-route" aria-hidden="true"></i>{{ institution.distance }}</span>
                  </span>
                </span>
                <i class="fas fa-arrow-up-right-from-square care-institution-card__arrow" aria-hidden="true"></i>
              </button>
              <span v-if="institution.sourceStatus !== 'available'" class="care-unavailable-ribbon">
                <i class="fas fa-link-slash" aria-hidden="true"></i>
                {{ t('来源不可用', 'Source unavailable') }}
              </span>
            </article>
          </div>

          <div v-else class="care-empty-state" data-testid="healthcare-empty-state">
            <HealthcareMascot size="empty" pose="thinking" />
            <h2>{{ t('没有找到合适的服务', 'No matching care found') }}</h2>
            <p>{{ t('换一个类别或缩短关键词试试。我们不会用模型补写医疗机构。', 'Try another category or a shorter phrase. We never invent medical providers with a model.') }}</p>
            <button type="button" class="care-secondary-button" @click="resetDiscovery">{{ t('查看全部', 'View all') }}</button>
          </div>
        </section>

        <section v-else-if="activeTab === 'appointments'" class="care-list-page" data-testid="healthcare-appointments">
          <div class="care-page-title">
            <span class="care-kicker">{{ t('我的安排', 'MY CARE') }}</span>
            <h1>{{ t('预约', 'Appointments') }}</h1>
            <p>{{ t('这些预约只保存在本设备的 S1 预览中，不会写入日历或钱包。', 'These appointments stay in this device-only S1 preview and do not write to Calendar or Wallet.') }}</p>
          </div>

          <div class="care-appointment-stack">
            <article
              v-for="appointment in appointmentRows"
              :key="appointment.id"
              class="care-appointment-card"
              :class="`is-${appointment.status}`"
              :data-testid="`healthcare-appointment-${appointment.id}`"
            >
              <div class="care-appointment-card__date">
                <span>{{ appointment.month }}</span>
                <strong>{{ appointment.day }}</strong>
                <small>{{ appointment.weekday }}</small>
              </div>
              <div class="care-appointment-card__body">
                <span class="care-status-chip">{{ appointment.statusLabel }}</span>
                <h2>{{ appointment.serviceName }}</h2>
                <p>{{ appointment.institutionName }}</p>
                <dl>
                  <div><dt>{{ t('时间', 'Time') }}</dt><dd>{{ appointment.time }}</dd></div>
                  <div><dt>{{ t('预约号', 'Reference') }}</dt><dd>{{ appointment.reference }}</dd></div>
                  <div><dt>{{ t('版本', 'Revision') }}</dt><dd>R{{ appointment.revision }}</dd></div>
                </dl>
                <div class="care-appointment-card__actions">
                  <button type="button" class="care-text-button" @click="openAppointment(appointment.id)">
                    {{ t('查看详情', 'View details') }}
                  </button>
                  <button
                    v-if="appointment.status !== 'cancelled'"
                    type="button"
                    class="care-text-button"
                    @click="startReschedule(appointment.raw)"
                  >
                    {{ t('改期', 'Reschedule') }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-else class="care-list-page" data-testid="healthcare-reports">
          <div class="care-page-title care-page-title--reports">
            <span class="care-kicker">{{ t('私人档案', 'PRIVATE RECORDS') }}</span>
            <h1>{{ t('报告收件箱', 'Report inbox') }}</h1>
            <p>{{ t('全部为世界内 authored 示例。报告正文不会进入 Community、角色记忆或 Event Runtime。', 'All records are authored in-world samples. Report content never enters Community, role memory, or Event Runtime.') }}</p>
          </div>

          <div class="care-report-stack">
            <button
              v-for="report in reportRows"
              :key="report.id"
              type="button"
              class="care-report-row"
              :class="{ 'is-unread': !report.read, 'is-unavailable': report.status === 'unavailable' }"
              :data-testid="`healthcare-report-${report.id}`"
              @click="openReport(report.id)"
            >
              <span class="care-report-row__marker" aria-hidden="true"></span>
              <span class="care-report-row__icon" aria-hidden="true">
                <i class="fas" :class="report.status === 'unavailable' ? 'fa-file-circle-xmark' : 'fa-file-waveform'"></i>
              </span>
              <span class="care-report-row__body">
                <span class="care-report-row__topline">
                  <span>{{ report.institution }}</span>
                  <time>{{ report.issuedLabel }}</time>
                </span>
                <strong>{{ report.title }}</strong>
                <span>{{ report.summary }}</span>
                <span class="care-report-row__chips">
                  <span>{{ t('版本', 'Revision') }} {{ report.revision }}</span>
                  <span v-if="report.status === 'corrected'" class="is-corrected">{{ t('有更正', 'Corrected') }}</span>
                  <span v-if="report.status === 'unavailable'" class="is-unavailable">{{ t('来源不可用', 'Unavailable') }}</span>
                </span>
              </span>
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </section>
      </template>

      <section v-else-if="focusedPage === 'institution' && activeInstitution" class="care-focus-page" data-testid="healthcare-institution-detail">
        <button type="button" class="care-detail-back" @click="closeFocus">
          <i class="fas fa-arrow-left" aria-hidden="true"></i>
          <span>{{ t('返回服务目录', 'Back to directory') }}</span>
        </button>
        <div class="care-institution-detail__hero" :class="`is-${activeInstitution.tone}`">
          <span class="care-institution-detail__monogram" aria-hidden="true">{{ activeInstitution.monogram }}</span>
          <span class="care-kicker">{{ activeInstitution.short }}</span>
          <h1>{{ activeInstitution.name }}</h1>
          <p>{{ activeInstitution.summary }}</p>
          <div class="care-institution-detail__meta">
            <span><i class="fas fa-clock" aria-hidden="true"></i>{{ activeInstitution.hours }}</span>
            <span><i class="fas fa-location-dot" aria-hidden="true"></i>{{ activeInstitution.locationReference }}</span>
          </div>
          <button
            v-if="activeInstitution.sourceStatus === 'available'"
            type="button"
            class="care-map-link"
            data-testid="healthcare-open-map"
            @click="openMap(activeInstitution.raw)"
          >
            <i class="fas fa-map-location-dot" aria-hidden="true"></i>
            <span>{{ t('在地图中查看地点参考', 'View location reference in Map') }}</span>
            <i class="fas fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>

        <div v-if="activeInstitution.sourceStatus !== 'available'" class="care-source-unavailable">
          <i class="fas fa-link-slash" aria-hidden="true"></i>
          <h2>{{ t('这个机构暂时无法预约', 'This place cannot be booked') }}</h2>
          <p>{{ t('地点来源已经撤回。温谈健康不会沿用旧缓存，也不会创建一个替代地点。', 'The place source was withdrawn. Ondam Care does not reuse stale cache or invent a replacement.') }}</p>
        </div>

        <div v-else class="care-service-list">
          <div class="care-section-heading">
            <div><span class="care-kicker">{{ t('可预约项目', 'BOOKABLE SERVICES') }}</span><h2>{{ t('选择服务', 'Choose a service') }}</h2></div>
          </div>
          <article v-for="service in activeInstitution.services" :key="service.id" class="care-service-card">
            <div class="care-service-card__number" aria-hidden="true">{{ service.index }}</div>
            <div class="care-service-card__body">
              <span>{{ service.departmentName }}</span>
              <h3>{{ service.name }}</h3>
              <p>{{ service.clinician }}</p>
              <dl>
                <div><dt>{{ t('时长', 'Length') }}</dt><dd>{{ service.duration }}</dd></div>
                <div><dt>{{ t('准备', 'Prepare') }}</dt><dd>{{ service.preparation }}</dd></div>
              </dl>
            </div>
            <button type="button" class="care-primary-button" :data-testid="`healthcare-book-${service.id}`" @click="startBooking(service.raw)">
              {{ t('选择时间', 'Choose time') }}
            </button>
          </article>
        </div>
      </section>

      <section v-else-if="focusedPage === 'appointment' && activeAppointment" class="care-focus-page" data-testid="healthcare-appointment-detail">
        <button type="button" class="care-detail-back" @click="closeFocus">
          <i class="fas fa-arrow-left" aria-hidden="true"></i><span>{{ t('返回预约', 'Back to appointments') }}</span>
        </button>
        <article class="care-appointment-detail">
          <header>
            <span class="care-kicker">{{ t('预约凭条', 'APPOINTMENT FOLIO') }}</span>
            <span class="care-status-chip">{{ activeAppointment.statusLabel }}</span>
            <h1>{{ activeAppointment.serviceName }}</h1>
            <p>{{ activeAppointment.institutionName }}</p>
          </header>
          <div class="care-appointment-detail__time">
            <strong>{{ activeAppointment.dateLabel }}</strong>
            <span>{{ activeAppointment.time }}</span>
          </div>
          <dl class="care-appointment-detail__facts">
            <div><dt>{{ t('来访原因', 'Visit reason') }}</dt><dd>{{ activeAppointment.reasonLabel }}</dd></div>
            <div><dt>{{ t('预约号', 'Reference') }}</dt><dd>{{ activeAppointment.reference }}</dd></div>
            <div><dt>{{ t('记录版本', 'Record revision') }}</dt><dd>R{{ activeAppointment.revision }}</dd></div>
            <div><dt>{{ t('保存范围', 'Saved in') }}</dt><dd>{{ t('仅本设备 S1 预览', 'This device-only S1 preview') }}</dd></div>
          </dl>
          <div v-if="activeAppointment.status !== 'cancelled'" class="care-appointment-detail__actions">
            <button type="button" class="care-primary-button" @click="startReschedule(activeAppointment.raw)">{{ t('更改时间', 'Change time') }}</button>
            <button type="button" class="care-danger-button" data-testid="healthcare-cancel-appointment" @click="cancelSelectedAppointment">{{ t('取消预约', 'Cancel appointment') }}</button>
          </div>
          <p v-if="actionNotice" class="care-action-notice" role="status">{{ actionNotice }}</p>
        </article>
      </section>

      <HealthcareReportDetail
        v-else-if="focusedPage === 'report' && activeReport"
        :report="activeReport"
        :copy="reportDetailCopy"
        :revision-acknowledged="isReportRevisionAcknowledged(activeReport.raw)"
        @back="closeFocus"
        @acknowledge="acknowledgeActiveReport"
      />
    </main>

    <nav v-if="focusedPage === 'root'" class="care-bottom-nav" :aria-label="t('温谈健康导航', 'Ondam Care navigation')">
      <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ 'is-active': activeTab === tab.id }" :aria-current="activeTab === tab.id ? 'page' : undefined" :data-testid="`healthcare-tab-${tab.id}`" @click="activeTab = tab.id">
        <span class="care-bottom-nav__icon"><i class="fas" :class="tab.icon" aria-hidden="true"></i><span v-if="tab.badge" class="care-bottom-nav__badge">{{ tab.badge }}</span></span>
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <HealthcareBookingSheet
      v-if="bookingService"
      :service-name="localizedService(bookingService).name"
      :reasons="localizedReasons"
      :date-slots="localizedDateSlots(bookingService)"
      :initial="reschedulingAppointment"
      :copy="bookingCopy"
      :error-text="bookingError"
      @close="closeBooking"
      @submit="confirmBooking"
    />

    <div v-if="privacyOpen" class="care-sheet" data-testid="healthcare-privacy-sheet">
      <button type="button" class="care-sheet__scrim" :aria-label="t('关闭隐私说明', 'Close privacy note')" @click="privacyOpen = false"></button>
      <section class="care-sheet__panel care-privacy-panel" role="dialog" aria-modal="true" aria-labelledby="healthcare-privacy-title">
        <header class="care-sheet__header">
          <div><span class="care-sheet__eyebrow">{{ t('隐私边界', 'PRIVACY BOUNDARY') }}</span><h2 id="healthcare-privacy-title">{{ t('这里只保存世界内安排', 'Only in-world arrangements live here') }}</h2></div>
          <button type="button" class="care-icon-button" :aria-label="t('关闭', 'Close')" @click="privacyOpen = false"><i class="fas fa-xmark" aria-hidden="true"></i></button>
        </header>
        <div class="care-sheet__body care-privacy-list">
          <p><i class="fas fa-user-shield" aria-hidden="true"></i><span>{{ t('不要求填写或上传你的真实病史、检查结果或身份材料。', 'No real medical history, test result, or identity document is requested.') }}</span></p>
          <p><i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i><span>{{ t('不调用 AI 生成诊断，也不从 Chat 或角色状态推断疾病。', 'AI does not generate diagnoses, and illness is never inferred from Chat or role state.') }}</span></p>
          <p><i class="fas fa-share-nodes" aria-hidden="true"></i><span>{{ t('S1 不写入日历、钱包、地图、电话、通知或事件系统。', 'S1 does not write to Calendar, Wallet, Map, Phone, notifications, or Event Runtime.') }}</span></p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  HEALTHCARE_BRAND,
  HEALTHCARE_CATEGORIES,
  HEALTHCARE_DEPARTMENTS,
  HEALTHCARE_INSTITUTIONS,
  HEALTHCARE_REPORTS,
  HEALTHCARE_VISIT_REASONS,
  findHealthcareInstitution,
  findHealthcareReport,
  findHealthcareService,
  formatHealthcareDate,
  formatHealthcareIssuedAt,
} from '../lib/healthcare-shell-data'
import { useHealthcareShellState } from '../composables/useHealthcareShellState'
import HealthcareBookingSheet from '../components/healthcare/HealthcareBookingSheet.vue'
import HealthcareMascot from '../components/healthcare/HealthcareMascot.vue'
import HealthcareReportDetail from '../components/healthcare/HealthcareReportDetail.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const { t, isZh } = useI18n()
const brand = HEALTHCARE_BRAND
const isNightTheme = computed(() => systemStore.settings.appearance.currentTheme === 'zen')

const {
  appointments,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  markReportRead,
  acknowledgeReportRevision,
  isReportRead,
  isReportRevisionAcknowledged,
} = useHealthcareShellState()

const activeTab = ref(['discover', 'appointments', 'reports'].includes(route.query.tab) ? route.query.tab : 'discover')
const focusedPage = ref('root')
const selectedInstitutionId = ref('')
const selectedAppointmentId = ref('')
const selectedReportId = ref('')
const searchQuery = ref('')
const activeCategory = ref('all')
const bookingService = ref(null)
const reschedulingAppointment = ref(null)
const bookingError = ref('')
const actionNotice = ref('')
const privacyOpen = ref(false)

const localText = (item, key) => item?.[`${key}${isZh.value ? 'Zh' : 'En'}`] || ''

const categories = computed(() =>
  HEALTHCARE_CATEGORIES.map((item) => ({ ...item, label: localText(item, 'label') })),
)

const categoryIcon = (categoryId) =>
  HEALTHCARE_CATEGORIES.find((item) => item.id === categoryId)?.icon || 'fa-house-medical'

const localizedInstitution = (institution, index = 0) => ({
  raw: institution,
  id: institution.id,
  index: String(index + 1).padStart(2, '0'),
  monogram: Array.from(localText(institution, 'short'))[0] || 'O',
  name: localText(institution, 'name'),
  short: localText(institution, 'short'),
  summary: localText(institution, 'summary'),
  hours: localText(institution, 'hours'),
  distance: localText(institution, 'distance'),
  locationReference: localText(institution, 'locationReference'),
  categoryIcon: categoryIcon(institution.category),
  tone: institution.tone,
  sourceStatus: institution.sourceStatus,
  services: institution.serviceIds
    .map((serviceId) => findHealthcareService(serviceId))
    .filter(Boolean)
    .map((service, serviceIndex) => localizedService(service, serviceIndex)),
})

const localizedService = (service, index = 0) => ({
  raw: service,
  id: service.id,
  index: String(index + 1).padStart(2, '0'),
  name: localText(service, 'name'),
  duration: localText(service, 'duration'),
  clinician: localText(service, 'clinician'),
  preparation: localText(service, 'preparation'),
  departmentName: localText(HEALTHCARE_DEPARTMENTS.find((item) => item.id === service.departmentId), 'name'),
})

const filteredInstitutions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return HEALTHCARE_INSTITUTIONS.filter((institution) => activeCategory.value === 'all' || institution.category === activeCategory.value)
    .filter((institution) => {
      if (!query) return true
      const services = institution.serviceIds.map(findHealthcareService).filter(Boolean)
      return [institution.nameZh, institution.nameEn, institution.summaryZh, institution.summaryEn, ...services.flatMap((service) => [service.nameZh, service.nameEn])].join(' ').toLowerCase().includes(query)
    })
    .map(localizedInstitution)
})

const appointmentStatusLabel = (status) => ({
  confirmed: t('已确认', 'Confirmed'),
  rescheduled: t('已改期', 'Rescheduled'),
  cancelled: t('已取消', 'Cancelled'),
}[status] || t('待确认', 'Pending'))

const localizedReason = (reasonId) => localText(HEALTHCARE_VISIT_REASONS.find((item) => item.id === reasonId), 'label') || t('一般预约', 'General appointment')

const appointmentToRow = (appointment) => {
  const service = findHealthcareService(appointment.serviceId)
  const institution = findHealthcareInstitution(appointment.institutionId)
  const date = new Date(`${appointment.date}T12:00:00`)
  const parts = new Intl.DateTimeFormat(isZh.value ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', weekday: 'short' }).formatToParts(date)
  const part = (type) => parts.find((item) => item.type === type)?.value || ''
  return {
    raw: appointment,
    id: appointment.id,
    serviceName: localText(service, 'name'),
    institutionName: localText(institution, 'name'),
    status: appointment.status,
    statusLabel: appointmentStatusLabel(appointment.status),
    dateLabel: formatHealthcareDate(appointment.date, isZh.value),
    month: part('month'),
    day: part('day'),
    weekday: part('weekday'),
    time: appointment.time,
    revision: appointment.revision,
    reference: `OD-${appointment.date.replaceAll('-', '')}-${appointment.time.replace(':', '')}`,
    reasonLabel: localizedReason(appointment.reasonId),
  }
}

const appointmentRows = computed(() => appointments.value.map(appointmentToRow))
const upcomingAppointment = computed(() => appointmentRows.value.find((appointment) => appointment.status !== 'cancelled') || null)
const activeAppointment = computed(() => {
  const appointment = appointments.value.find((item) => item.id === selectedAppointmentId.value)
  return appointment ? appointmentToRow(appointment) : null
})

const reportToRow = (report) => ({
  raw: report,
  id: report.id,
  title: localText(report, 'title'),
  institution: localText(report, 'institution'),
  summary: localText(report, 'summary'),
  correction: localText(report, 'correction'),
  status: report.status,
  revision: report.revision,
  issuedLabel: formatHealthcareIssuedAt(report.issuedAt, isZh.value),
  read: isReportRead(report.id),
  rows: report.rows.map((row) => ({ ...row, item: localText(row, 'item'), reference: localText(row, 'reference') })),
})

const reportRows = computed(() => HEALTHCARE_REPORTS.map(reportToRow))
const reportPreview = computed(() => reportRows.value.find((report) => !report.read && report.status !== 'unavailable') || reportRows.value.find((report) => report.status !== 'unavailable') || null)
const activeReport = computed(() => {
  const report = findHealthcareReport(selectedReportId.value)
  return report ? reportToRow(report) : null
})
const activeInstitution = computed(() => {
  const institution = findHealthcareInstitution(selectedInstitutionId.value)
  return institution ? localizedInstitution(institution) : null
})

const unreadReportCount = computed(() => HEALTHCARE_REPORTS.filter((report) => !isReportRead(report.id) && report.status !== 'unavailable').length)
const tabs = computed(() => [
  { id: 'discover', icon: 'fa-compass', label: t('发现', 'Discover'), badge: 0 },
  { id: 'appointments', icon: 'fa-calendar-check', label: t('预约', 'Appointments'), badge: 0 },
  { id: 'reports', icon: 'fa-file-waveform', label: t('报告', 'Reports'), badge: unreadReportCount.value },
])

const localizedReasons = computed(() => HEALTHCARE_VISIT_REASONS.map((reason) => ({ id: reason.id, label: localText(reason, 'label') })))
const localizedDateSlots = (service) => service.dateSlots.map((slot) => ({ ...slot, label: formatHealthcareDate(slot.date, isZh.value) }))

const bookingCopy = computed(() => ({
  close: t('关闭预约面板', 'Close booking panel'), eyebrow: t('本地预约', 'LOCAL BOOKING'), title: t('确认预约', 'Confirm appointment'), rescheduleTitle: t('更改预约时间', 'Change appointment time'), reason: t('概括性来访原因', 'General visit reason'), privacy: t('请选择概括性原因，不要填写现实健康资料。', 'Choose a general reason; do not enter real health information.'), date: t('日期', 'Date'), time: t('时间', 'Time'), times: t('个时段', 'times'), localTitle: t('保存到本设备', 'Saved on this device'), localBody: t('确认后只形成温谈健康 S1 预约，不会自动写入日历、钱包或地图。', 'Confirmation creates an Ondam Care S1 appointment only; it does not write to Calendar, Wallet, or Map.'), cancel: t('暂不预约', 'Not now'), confirm: t('确认本地预约', 'Confirm local appointment'), confirmReschedule: t('确认改期', 'Confirm change'),
}))

const reportDetailCopy = computed(() => ({
  back: t('返回报告收件箱', 'Back to report inbox'), authored: t('世界内 authored 报告', 'AUTHORED IN-WORLD REPORT'), revision: t('版本', 'Revision'), unavailableTitle: t('报告来源不可用', 'Report source unavailable'), unavailableBody: t('出于 fail-closed 规则，旧缓存正文和检查项目不会显示。', 'Under fail-closed rules, cached body text and result rows are not shown.'), issued: t('出具日期', 'Issued'), corrected: t('这份报告有更正', 'This report was corrected'), resultsKicker: t('结构化结果', 'STRUCTURED RESULTS'), results: t('检查项目', 'Result items'), items: t('项', 'items'), tableLabel: t('检查结果表，可横向滚动查看长项目', 'Result table; scroll horizontally for long items'), item: t('项目', 'Item'), value: t('结果', 'Result'), unit: t('单位', 'Unit'), reference: t('参考说明', 'Reference note'), boundary: t('这是一份世界内 authored 示例记录，不构成现实诊断或医疗建议。项目与数值不会被 AI 改写。', 'This authored in-world sample is not a real diagnosis or medical advice. Its items and values are never rewritten by AI.'), acknowledge: t('我已看到本次更正', 'Acknowledge correction'),
}))

const goHome = () => pushReturnTarget(router, route, '/home')
const resetDiscovery = () => { searchQuery.value = ''; activeCategory.value = 'all' }
const openInstitution = (id) => { selectedInstitutionId.value = id; focusedPage.value = 'institution' }
const openAppointment = (id) => { selectedAppointmentId.value = id; actionNotice.value = ''; focusedPage.value = 'appointment' }
const openReport = (id) => { selectedReportId.value = id; markReportRead(id); focusedPage.value = 'report' }
const closeFocus = () => { focusedPage.value = 'root'; selectedInstitutionId.value = ''; selectedAppointmentId.value = ''; selectedReportId.value = '' }

const openMap = (institution) => router.push({ path: '/map', query: { source: 'healthcare', placeId: institution.placeRef.recordId, mapPackId: 'real-seoul-v1', placeRevision: String(institution.placeRef.revision), world: institution.placeRef.worldId, returnPath: '/healthcare', returnLabel: isZh.value ? '返回温谈健康' : 'Back to Ondam Care' } })

const startBooking = (service) => { bookingError.value = ''; reschedulingAppointment.value = null; bookingService.value = service }
const startReschedule = (appointment) => { const service = findHealthcareService(appointment.serviceId); if (!service) return; bookingError.value = ''; reschedulingAppointment.value = { ...appointment }; bookingService.value = service }
const closeBooking = () => { bookingService.value = null; reschedulingAppointment.value = null; bookingError.value = '' }
const confirmBooking = (selection) => {
  const receipt = reschedulingAppointment.value
    ? rescheduleAppointment(reschedulingAppointment.value.id, selection)
    : createAppointment({ serviceId: bookingService.value.id, ...selection })
  if (!receipt.ok) {
    bookingError.value = receipt.error === 'duplicate' ? t('这个时段已经保存在你的预约中。', 'This slot is already in your appointments.') : t('本地保存失败，没有创建预约。请重试。', 'Local save failed. No appointment was created. Please retry.')
    return
  }
  activeTab.value = 'appointments'
  selectedAppointmentId.value = receipt.value?.id || reschedulingAppointment.value?.id || ''
  focusedPage.value = selectedAppointmentId.value ? 'appointment' : 'root'
  actionNotice.value = reschedulingAppointment.value ? t('预约时间已在本设备更新。', 'Appointment time updated on this device.') : t('预约已保存在本设备。', 'Appointment saved on this device.')
  closeBooking()
}

const cancelSelectedAppointment = () => {
  const receipt = cancelAppointment(selectedAppointmentId.value)
  actionNotice.value = receipt.ok ? t('预约已在本设备取消。', 'Appointment cancelled on this device.') : t('取消失败，预约没有改变。', 'Cancellation failed. The appointment did not change.')
}

const acknowledgeActiveReport = () => {
  if (!activeReport.value) return
  acknowledgeReportRevision(activeReport.value.id, activeReport.value.revision)
}
</script>

<style>
.ondam-care-app {
  --care-bg: #e8eef5;
  --care-panel: #fdf9ef;
  --care-panel-soft: #e2eaf3;
  --care-ink: #33465c;
  --care-muted: #6d7d92;
  --care-line: rgba(61, 84, 112, 0.16);
  --care-accent: #5b7396;
  --care-accent-strong: #3f5878;
  --care-action-text: #ffffff;
  --care-apricot: #df8d5b;
  --care-blue: #5f7ea3;
  --care-lilac: #8b789c;
  --care-danger: #9a453f;
  --care-shadow: 0 18px 52px rgba(51, 70, 92, 0.13);
  min-height: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--care-ink);
  background:
    radial-gradient(circle at 9% 3%, rgba(253, 241, 217, 0.6), transparent 31%),
    linear-gradient(145deg, #eef3f9 0%, var(--care-bg) 60%, #dde6f0 100%);
  font-family: "Aptos", "Segoe UI Variable", "Noto Sans SC", "Microsoft YaHei", sans-serif;
}

.ondam-care-app.is-night {
  --care-bg: #141c28;
  --care-panel: #1c2533;
  --care-panel-soft: #26334a;
  --care-ink: #eef3fa;
  --care-muted: #9aa9bd;
  --care-line: rgba(226, 236, 248, 0.14);
  --care-accent: #a8bedd;
  --care-accent-strong: #e2ecf8;
  --care-action-text: #1a2433;
  --care-apricot: #efad7f;
  --care-blue: #a8bedd;
  --care-lilac: #c0a8d0;
  --care-danger: #ef9c94;
  --care-shadow: 0 20px 55px rgba(0, 0, 0, 0.34);
  background:
    radial-gradient(circle at 12% 0%, rgba(168, 190, 221, 0.12), transparent 32%),
    linear-gradient(145deg, #182130 0%, #101725 63%, #1c2434 100%);
}

.ondam-care-app *,
.ondam-care-app *::before,
.ondam-care-app *::after {
  box-sizing: border-box;
}

.ondam-care-app button,
.ondam-care-app input {
  font: inherit;
}

.ondam-care-app button {
  color: inherit;
}

.care-app-header {
  min-height: 76px;
  padding: 12px clamp(16px, 3vw, 30px);
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--care-line);
  background: color-mix(in srgb, var(--care-panel) 90%, transparent);
  backdrop-filter: blur(18px);
  z-index: 6;
}

.care-icon-button {
  width: 44px;
  height: 44px;
  border: 1px solid var(--care-line);
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  color: var(--care-accent-strong);
  background: var(--care-panel);
  cursor: pointer;
}

.care-icon-button:hover,
.care-icon-button:focus-visible {
  border-color: var(--care-accent);
  background: var(--care-panel-soft);
}

.care-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.care-brand__mark {
  width: 44px;
  height: 44px;
  border-radius: 15px 15px 15px 5px;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #fff;
  background: transparent;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22), var(--care-shadow);
}

.is-night .care-brand__mark {
  color: #1a2433;
  background: transparent;
}

.care-brand__words {
  display: grid;
  min-width: 0;
}

.care-brand__words strong {
  font-family: Georgia, "Songti SC", serif;
  font-size: 18px;
  letter-spacing: 0.02em;
}

.care-brand__words small {
  margin-top: 1px;
  overflow: hidden;
  color: var(--care-muted);
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.care-app-header__spacer { flex: 1; }

.care-app-main {
  min-width: 0;
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--care-line) transparent;
}

.care-discover,
.care-list-page,
.care-focus-page,
.care-report-detail {
  width: min(1120px, 100%);
  min-width: 0;
  margin: 0 auto;
  padding: clamp(22px, 4vw, 48px) clamp(16px, 4vw, 48px) 118px;
}

.care-hero {
  position: relative;
  min-height: 210px;
  padding: clamp(26px, 5vw, 58px);
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  border-radius: 10px 44px 10px 44px;
  color: #f6f8fb;
  background:
    linear-gradient(112deg, rgba(43, 60, 84, 0.97), rgba(91, 115, 150, 0.86)),
    repeating-linear-gradient(90deg, transparent 0 40px, rgba(255,255,255,.05) 40px 41px);
  box-shadow: var(--care-shadow);
}

.care-hero::after {
  content: '';
  position: absolute;
  width: 310px;
  height: 310px;
  right: -90px;
  top: -150px;
  border: 1px solid rgba(255,255,255,.24);
  border-radius: 50%;
  box-shadow: 0 0 0 42px rgba(255,255,255,.04), 0 0 0 90px rgba(255,255,255,.025);
}

.care-hero__copy { position: relative; z-index: 1; max-width: 670px; padding-right: clamp(96px, 24vw, 150px); }
.care-kicker,
.care-sheet__eyebrow {
  display: block;
  margin-bottom: 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.care-hero h1,
.care-page-title h1,
.care-institution-detail__hero h1,
.care-appointment-detail h1,
.care-report-detail h2 {
  margin: 0;
  font-family: Georgia, "Songti SC", serif;
  font-weight: 600;
  line-height: 1.08;
  text-wrap: balance;
}

.care-hero h1 { font-size: clamp(30px, 5vw, 54px); }
.care-hero p { max-width: 620px; margin: 18px 0 0; color: rgba(248,252,248,.79); line-height: 1.65; }
.care-hero__mascot { position: absolute; right: clamp(20px, 4vw, 40px); top: clamp(18px, 3vw, 30px); z-index: 1; filter: drop-shadow(0 10px 22px rgba(30, 44, 62, 0.28)); }

.care-search {
  width: min(680px, calc(100% - 32px));
  min-height: 58px;
  margin: -28px auto 24px;
  padding: 0 18px;
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--care-line);
  border-radius: 19px;
  background: var(--care-panel);
  box-shadow: 0 12px 30px rgba(24, 48, 41, .14);
}

.care-search > i { color: var(--care-accent); }
.care-search input { min-width: 0; flex: 1; border: 0; outline: 0; color: var(--care-ink); background: transparent; }
.care-search input::placeholder { color: var(--care-muted); }
.care-search button { border: 0; color: var(--care-muted); background: none; cursor: pointer; }

.care-category-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 0 18px;
  scrollbar-width: none;
}
.care-category-strip::-webkit-scrollbar { display: none; }
.care-category-strip button {
  min-height: 42px;
  padding: 0 15px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  border: 1px solid var(--care-line);
  border-radius: 99px;
  background: var(--care-panel);
  cursor: pointer;
}
.care-category-strip button.is-active { color: var(--care-action-text); border-color: var(--care-accent-strong); background: var(--care-accent-strong); }

.care-overview {
  margin: 2px 0 22px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.care-overview > button {
  min-width: 0;
  min-height: 94px;
  padding: 15px;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--care-line);
  border-radius: 18px 18px 6px 18px;
  color: var(--care-ink);
  background: var(--care-panel);
  text-align: left;
  box-shadow: 0 8px 20px rgba(38, 58, 50, .055);
  cursor: pointer;
}
.care-overview > button:hover { background: var(--care-panel-soft); }
.care-overview > button > i { color: var(--care-muted); }
.care-overview__icon { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 16px 16px 16px 5px; }
.care-overview__icon.is-appointment { color: var(--care-accent-strong); background: var(--care-panel-soft); }
.care-overview__icon.is-report { color: #7b3d19; background: #f6dfcf; }
.is-night .care-overview__icon.is-report { color: #ffd3b4; background: #4b3023; }
.care-overview__copy { min-width: 0; display: grid; gap: 4px; }
.care-overview__copy small { color: var(--care-accent); font-size: 9px; font-weight: 850; letter-spacing: .12em; }
.care-overview__copy strong, .care-overview__copy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.care-overview__copy strong { font-family: Georgia, "Songti SC", serif; font-size: 17px; }
.care-overview__copy span { color: var(--care-muted); font-size: 11px; }

.care-section-heading {
  margin: 14px 0 18px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.care-section-heading h2 { margin: 0; font-family: Georgia, "Songti SC", serif; font-size: clamp(24px, 3vw, 34px); font-weight: 600; }
.care-section-heading > span { color: var(--care-muted); font-size: 13px; }

.care-institution-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.care-institution-card { position: relative; min-width: 0; overflow: hidden; border: 1px solid var(--care-line); border-radius: 8px 28px 8px 28px; background: var(--care-panel); box-shadow: 0 10px 24px rgba(38, 58, 50, .07); }
.care-institution-card__body { width: 100%; min-height: 226px; padding: 25px; display: grid; grid-template-columns: 50px minmax(0, 1fr) auto; align-items: start; gap: 14px; border: 0; text-align: left; background: none; cursor: pointer; }
.care-institution-card__body:hover { background: color-mix(in srgb, var(--care-panel-soft) 44%, transparent); }
.care-institution-card__index { position: absolute; right: 17px; bottom: 9px; color: color-mix(in srgb, var(--care-accent) 18%, transparent); font-family: Georgia, serif; font-size: 58px; line-height: 1; }
.care-institution-card__icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 17px 17px 17px 5px; color: var(--care-accent-strong); background: var(--care-panel-soft); }
.care-institution-card.is-apricot .care-institution-card__icon { color: #7b3d19; background: #f6dfcf; }
.is-night .care-institution-card.is-apricot .care-institution-card__icon { color: #ffd3b4; background: #4b3023; }
.care-institution-card.is-blue .care-institution-card__icon { color: #275565; background: #dbeaf0; }
.is-night .care-institution-card.is-blue .care-institution-card__icon { color: #b8ddea; background: #203b45; }
.care-institution-card.is-lilac .care-institution-card__icon { color: #654876; background: #ede4f2; }
.is-night .care-institution-card.is-lilac .care-institution-card__icon { color: #ddc8e9; background: #3d3045; }
.care-institution-card__content { min-width: 0; display: grid; gap: 7px; }
.care-institution-card__place { color: var(--care-accent); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.care-institution-card__content strong { font-family: Georgia, "Songti SC", serif; font-size: 21px; line-height: 1.25; overflow-wrap: anywhere; }
.care-institution-card__content > span:not(.care-institution-card__place):not(.care-institution-card__meta) { color: var(--care-muted); font-size: 13px; line-height: 1.55; }
.care-institution-card__meta { margin-top: 9px; display: grid; gap: 6px; color: var(--care-muted); font-size: 12px; }
.care-institution-card__meta span { display: flex; align-items: center; gap: 7px; }
.care-institution-card__arrow { margin-top: 4px; color: var(--care-muted); }
.care-institution-card.is-unavailable { opacity: .86; }
.care-unavailable-ribbon { position: absolute; left: 24px; bottom: 19px; display: flex; align-items: center; gap: 7px; color: var(--care-danger); font-size: 12px; font-weight: 700; }

.care-bottom-nav {
  min-height: 70px;
  padding: 7px max(12px, env(safe-area-inset-right)) calc(7px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  display: flex;
  justify-content: center;
  gap: clamp(6px, 5vw, 70px);
  border-top: 1px solid var(--care-line);
  background: color-mix(in srgb, var(--care-panel) 94%, transparent);
  backdrop-filter: blur(20px);
  z-index: 5;
}
.care-bottom-nav button { min-width: 82px; min-height: 52px; display: grid; place-items: center; align-content: center; gap: 4px; border: 0; border-radius: 16px; color: var(--care-muted); font-size: 11px; background: transparent; cursor: pointer; }
.care-bottom-nav button.is-active { color: var(--care-accent-strong); background: var(--care-panel-soft); }
.care-bottom-nav__icon { position: relative; font-size: 18px; }
.care-bottom-nav__badge { position: absolute; min-width: 17px; height: 17px; padding: 0 4px; top: -9px; right: -12px; display: grid; place-items: center; border: 2px solid var(--care-panel); border-radius: 99px; color: #fff; background: #a64d45; font-size: 9px; font-weight: 800; }

.care-page-title { max-width: 720px; margin-bottom: 30px; }
.care-page-title h1 { font-size: clamp(36px, 6vw, 62px); }
.care-page-title p { margin: 14px 0 0; color: var(--care-muted); line-height: 1.65; }
.care-page-title--reports { padding-left: 20px; border-left: 4px solid var(--care-apricot); }

.care-appointment-stack,
.care-report-stack { display: grid; gap: 14px; }
.care-appointment-card { min-width: 0; display: grid; grid-template-columns: 112px minmax(0, 1fr); border: 1px solid var(--care-line); border-radius: 9px 28px 9px 28px; overflow: hidden; background: var(--care-panel); box-shadow: 0 10px 24px rgba(38,58,50,.06); }
.care-appointment-card__date { padding: 25px 16px; display: grid; place-items: center; align-content: center; color: #f6fbf8; background: var(--care-accent-strong); text-align: center; }
.care-appointment-card__date span { font-size: 12px; font-weight: 800; text-transform: uppercase; }
.care-appointment-card__date strong { font-family: Georgia, serif; font-size: 44px; line-height: 1; }
.care-appointment-card__date small { margin-top: 5px; opacity: .75; }
.care-appointment-card.is-cancelled .care-appointment-card__date { color: var(--care-muted); background: var(--care-panel-soft); }
.care-appointment-card__body { min-width: 0; padding: 22px 25px; }
.care-appointment-card__body h2 { margin: 7px 0 4px; font-family: Georgia, "Songti SC", serif; font-size: 23px; overflow-wrap: anywhere; }
.care-appointment-card__body > p { margin: 0; color: var(--care-muted); }
.care-status-chip { width: fit-content; padding: 4px 9px; border-radius: 99px; color: var(--care-accent-strong); background: var(--care-panel-soft); font-size: 11px; font-weight: 800; }
.care-appointment-card__body dl { margin: 17px 0 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.care-appointment-card__body dl div { min-width: 0; }
.care-appointment-card__body dt { color: var(--care-muted); font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.care-appointment-card__body dd { margin: 4px 0 0; font-size: 13px; overflow-wrap: anywhere; }
.care-appointment-card__actions { margin-top: 17px; display: flex; gap: 8px; }
.care-text-button { min-height: 40px; padding: 0 12px; border: 1px solid var(--care-line); border-radius: 12px; color: var(--care-accent-strong); background: transparent; cursor: pointer; }

.care-report-row { position: relative; width: 100%; min-width: 0; padding: 20px 18px; display: grid; grid-template-columns: 5px 44px minmax(0, 1fr) auto; align-items: center; gap: 14px; border: 1px solid var(--care-line); border-radius: 8px 22px 8px 22px; text-align: left; background: var(--care-panel); cursor: pointer; }
.care-report-row:hover { background: color-mix(in srgb, var(--care-panel-soft) 45%, var(--care-panel)); }
.care-report-row__marker { width: 5px; height: 44px; border-radius: 99px; background: transparent; }
.care-report-row.is-unread .care-report-row__marker { background: var(--care-apricot); }
.care-report-row__icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; color: var(--care-accent-strong); background: var(--care-panel-soft); }
.care-report-row__body { min-width: 0; display: grid; gap: 5px; }
.care-report-row__topline { display: flex; justify-content: space-between; gap: 12px; color: var(--care-muted); font-size: 11px; }
.care-report-row__topline time { flex: 0 0 auto; }
.care-report-row__body strong { font-family: Georgia, "Songti SC", serif; font-size: 20px; overflow-wrap: anywhere; }
.care-report-row__body > span:not(.care-report-row__topline):not(.care-report-row__chips) { overflow: hidden; color: var(--care-muted); font-size: 13px; white-space: nowrap; text-overflow: ellipsis; }
.care-report-row__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 3px; }
.care-report-row__chips > span { padding: 3px 7px; border-radius: 99px; color: var(--care-muted); background: var(--care-panel-soft); font-size: 10px; font-weight: 700; }
.care-report-row__chips .is-corrected { color: #79401e; background: #f4ddce; }
.is-night .care-report-row__chips .is-corrected { color: #ffd7ba; background: #4d3122; }
.care-report-row__chips .is-unavailable { color: var(--care-danger); }

.care-detail-back { min-height: 42px; margin-bottom: 20px; padding: 0 12px 0 4px; display: inline-flex; align-items: center; gap: 9px; border: 0; color: var(--care-accent-strong); background: transparent; cursor: pointer; }
.care-institution-detail__hero { position: relative; overflow: hidden; padding: clamp(28px, 5vw, 60px); border-radius: 10px 46px 10px 46px; color: #f7fbfb; background: linear-gradient(135deg, #3f5878, #66809f); box-shadow: var(--care-shadow); }
.care-institution-detail__hero.is-apricot { background: linear-gradient(135deg, #6e3d28, #a35d36); }
.care-institution-detail__hero.is-blue { background: linear-gradient(135deg, #3a5470, #5f7ea3); }
.care-institution-detail__hero.is-lilac { background: linear-gradient(135deg, #4d3d59, #766187); }
.care-institution-detail__hero h1 { max-width: 760px; font-size: clamp(34px, 5vw, 56px); }
.care-institution-detail__hero > p { max-width: 700px; margin: 16px 0 0; color: rgba(255,255,255,.8); line-height: 1.65; }
.care-institution-detail__monogram { position: absolute; right: 6%; top: -32px; color: rgba(255,255,255,.1); font-family: Georgia, serif; font-size: 190px; line-height: 1; }
.care-institution-detail__meta { margin-top: 23px; display: flex; flex-wrap: wrap; gap: 10px 24px; color: rgba(255,255,255,.76); font-size: 13px; }
.care-institution-detail__meta span { display: flex; align-items: center; gap: 8px; }
.care-map-link { width: min(520px, 100%); min-height: 50px; margin-top: 26px; padding: 0 16px; display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 10px; border: 1px solid rgba(255,255,255,.28); border-radius: 15px; color: #fff; text-align: left; background: rgba(255,255,255,.12); cursor: pointer; }
.care-service-list { margin-top: 30px; }
.care-service-card { min-width: 0; margin-bottom: 12px; padding: 22px; display: grid; grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; gap: 18px; border: 1px solid var(--care-line); border-radius: 8px 24px 8px 24px; background: var(--care-panel); }
.care-service-card__number { color: var(--care-apricot); font-family: Georgia, serif; font-size: 28px; }
.care-service-card__body { min-width: 0; }
.care-service-card__body > span { color: var(--care-accent); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.care-service-card__body h3 { margin: 4px 0; font-family: Georgia, "Songti SC", serif; font-size: 21px; }
.care-service-card__body > p { margin: 0; color: var(--care-muted); font-size: 13px; }
.care-service-card dl { margin: 14px 0 0; display: grid; gap: 6px; }
.care-service-card dl div { display: grid; grid-template-columns: 58px minmax(0,1fr); gap: 8px; font-size: 12px; }
.care-service-card dt { color: var(--care-muted); }
.care-service-card dd { margin: 0; overflow-wrap: anywhere; }

.care-primary-button,
.care-secondary-button,
.care-danger-button { min-height: 44px; padding: 0 17px; border-radius: 14px; font-weight: 750; cursor: pointer; }
.care-primary-button { border: 1px solid var(--care-accent-strong); color: var(--care-action-text); background: var(--care-accent-strong); }
.care-secondary-button { border: 1px solid var(--care-line); color: var(--care-accent-strong); background: var(--care-panel); }
.care-danger-button { border: 1px solid color-mix(in srgb, var(--care-danger) 45%, transparent); color: var(--care-danger); background: transparent; }
.care-primary-button:disabled { opacity: .45; cursor: not-allowed; }

.care-appointment-detail { width: min(760px, 100%); margin: 0 auto; overflow: hidden; border: 1px solid var(--care-line); border-radius: 10px 38px 10px 38px; background: var(--care-panel); box-shadow: var(--care-shadow); }
.care-appointment-detail header { position: relative; padding: clamp(28px,5vw,52px); border-bottom: 1px dashed var(--care-line); }
.care-appointment-detail header::before,
.care-appointment-detail header::after { content:''; position:absolute; width:26px; height:26px; bottom:-13px; border-radius:50%; background:var(--care-bg); }
.care-appointment-detail header::before { left:-13px; }
.care-appointment-detail header::after { right:-13px; }
.care-appointment-detail h1 { margin-top: 14px; font-size: clamp(30px,5vw,49px); }
.care-appointment-detail header > p { color: var(--care-muted); }
.care-appointment-detail__time { padding: 30px clamp(28px,5vw,52px) 12px; display:flex; align-items:baseline; justify-content:space-between; gap:20px; }
.care-appointment-detail__time strong { font-family:Georgia,"Songti SC",serif; font-size:22px; }
.care-appointment-detail__time span { color:var(--care-accent-strong); font-family:Georgia,serif; font-size:36px; }
.care-appointment-detail__facts { padding: 10px clamp(28px,5vw,52px) 28px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; }
.care-appointment-detail__facts dt { color:var(--care-muted); font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.care-appointment-detail__facts dd { margin:5px 0 0; overflow-wrap:anywhere; }
.care-appointment-detail__actions { padding: 0 clamp(28px,5vw,52px) 34px; display:flex; gap:10px; flex-wrap:wrap; }
.care-action-notice { margin:0; padding:14px clamp(28px,5vw,52px); color:var(--care-accent-strong); background:var(--care-panel-soft); }

.care-report-detail { max-width: 1000px; }
.care-report-detail__header { position:relative; padding:clamp(24px,5vw,48px); display:grid; grid-template-columns:auto auto minmax(0,1fr) auto; align-items:center; gap:18px; overflow:hidden; border:1px solid var(--care-line); border-radius:10px 36px 0 0; background:var(--care-panel); }
.care-report-detail__header .care-detail-back { grid-column:1/-1; margin-bottom:2px; justify-self:start; }
.care-report-detail__seal { width:62px; height:62px; display:grid; place-items:center; border:1px solid var(--care-line); border-radius:50%; color:var(--care-accent-strong); background:var(--care-panel-soft); font-size:25px; }
.care-report-detail__heading { min-width:0; }
.care-report-detail__heading h2 { font-size:clamp(26px,4vw,42px); overflow-wrap:anywhere; }
.care-report-detail__heading p { margin:5px 0 0; color:var(--care-muted); }
.care-revision-chip { padding:7px 10px; border:1px solid var(--care-line); border-radius:99px; color:var(--care-accent-strong); font-size:11px; font-weight:800; }
.care-report-summary { padding:26px clamp(22px,5vw,48px); display:grid; grid-template-columns:150px minmax(0,1fr); gap:24px; border:1px solid var(--care-line); border-top:0; background:var(--care-panel); }
.care-report-summary div { display:grid; gap:4px; }
.care-report-summary span { color:var(--care-muted); font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.care-report-summary p { margin:0; line-height:1.7; }
.care-correction { padding:20px clamp(22px,5vw,48px); display:flex; gap:14px; color:#653719; background:#f5dfcf; border-inline:1px solid #e8c3a7; }
.is-night .care-correction { color:#ffddc5; background:#4a3022; border-color:#6a4630; }
.care-correction > i { margin-top:4px; }
.care-correction p { margin:5px 0 0; line-height:1.6; }
.care-results { padding:clamp(22px,4vw,40px); border:1px solid var(--care-line); border-top:0; background:var(--care-panel); }
.care-results__title { margin-bottom:16px; display:flex; align-items:flex-end; justify-content:space-between; gap:15px; }
.care-results__title h3 { margin:0; font-family:Georgia,"Songti SC",serif; font-size:27px; }
.care-results__title > span { color:var(--care-muted); font-size:12px; }
.care-results__scroller { max-width:100%; overflow-x:auto; border:1px solid var(--care-line); border-radius:14px; }
.care-results table { width:100%; min-width:690px; border-collapse:collapse; text-align:left; }
.care-results th,.care-results td { padding:14px 16px; border-bottom:1px solid var(--care-line); vertical-align:top; }
.care-results thead th { color:var(--care-muted); background:var(--care-panel-soft); font-size:10px; letter-spacing:.08em; text-transform:uppercase; }
.care-results tbody th { max-width:270px; font-weight:700; overflow-wrap:anywhere; }
.care-results tbody tr:last-child th,.care-results tbody tr:last-child td { border-bottom:0; }
.care-results tbody tr.is-note { background:color-mix(in srgb,var(--care-apricot) 9%,transparent); }
.care-results__value { color:var(--care-accent-strong); font-family:Georgia,serif; font-size:18px; font-weight:700; }
.care-report-boundary { padding:18px 22px; display:flex; align-items:flex-start; gap:12px; border:1px solid var(--care-line); border-top:0; color:var(--care-muted); background:var(--care-panel-soft); }
.care-report-boundary p { margin:0; line-height:1.6; }
.care-report-detail__ack { margin:20px 0 0 auto; display:block; }

.care-source-unavailable,.care-empty-state { padding:clamp(32px,6vw,66px); display:grid; justify-items:center; text-align:center; border:1px dashed var(--care-line); border-radius:10px 30px 10px 30px; background:var(--care-panel); }
.care-source-unavailable > i,.care-empty-state > i { font-size:34px; color:var(--care-danger); }
.care-source-unavailable h2,.care-source-unavailable h3,.care-empty-state h2 { margin:15px 0 7px; font-family:Georgia,"Songti SC",serif; }
.care-source-unavailable p,.care-empty-state p { max-width:600px; margin:4px 0 18px; color:var(--care-muted); line-height:1.65; }

.care-sheet { position:absolute; inset:0; z-index:30; display:grid; align-items:end; }
.care-sheet__scrim { position:absolute; inset:0; width:100%; height:100%; border:0; background:rgba(7,20,17,.58); backdrop-filter:blur(5px); cursor:pointer; }
.care-sheet__panel { position:relative; width:min(720px,calc(100% - 24px)); max-height:min(86%,820px); margin:0 auto 12px; display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--care-line); border-radius:24px 24px 10px 10px; color:var(--care-ink); background:var(--care-panel); box-shadow:0 28px 90px rgba(0,0,0,.3); }
.care-sheet__header { padding:22px 24px; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; border-bottom:1px solid var(--care-line); }
.care-sheet__header h2 { margin:0; font-family:Georgia,"Songti SC",serif; font-size:27px; }
.care-sheet__header p { margin:5px 0 0; color:var(--care-muted); }
.care-sheet__body { padding:22px 24px; overflow-y:auto; }
.care-sheet__footer { padding:16px 24px calc(16px + env(safe-area-inset-bottom)); display:flex; justify-content:flex-end; gap:10px; border-top:1px solid var(--care-line); }
.care-booking-step + .care-booking-step { margin-top:24px; }
.care-field-label { display:block; margin-bottom:10px; color:var(--care-muted); font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.care-choice-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.care-choice { min-height:48px; padding:10px 12px; display:flex; align-items:center; gap:9px; border:1px solid var(--care-line); border-radius:13px; text-align:left; background:transparent; cursor:pointer; }
.care-choice i { color:var(--care-line); }
.care-choice.is-selected { border-color:var(--care-accent); background:var(--care-panel-soft); }
.care-choice.is-selected i { color:var(--care-accent-strong); }
.care-field-note { display:flex; gap:8px; margin:10px 0 0; color:var(--care-muted); font-size:12px; line-height:1.5; }
.care-date-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.care-date-choice { min-height:62px; padding:10px 13px; display:grid; justify-items:start; gap:3px; border:1px solid var(--care-line); border-radius:13px; background:transparent; cursor:pointer; }
.care-date-choice small { color:var(--care-muted); }
.care-date-choice.is-selected { border-color:var(--care-accent); background:var(--care-panel-soft); }
.care-time-grid { display:flex; flex-wrap:wrap; gap:8px; }
.care-time-choice { min-width:78px; min-height:42px; border:1px solid var(--care-line); border-radius:12px; background:transparent; cursor:pointer; }
.care-time-choice.is-selected { color:var(--care-action-text); border-color:var(--care-accent-strong); background:var(--care-accent-strong); }
.care-booking-receipt { margin-top:24px; padding:15px; display:flex; align-items:flex-start; gap:12px; border-radius:14px; color:var(--care-accent-strong); background:var(--care-panel-soft); }
.care-booking-receipt p { margin:0; display:grid; gap:4px; }
.care-booking-receipt span { color:var(--care-muted); font-size:12px; line-height:1.5; }
.care-sheet__error { padding:12px; border-radius:10px; color:var(--care-danger); background:color-mix(in srgb,var(--care-danger) 10%,transparent); }
.care-privacy-list { display:grid; gap:10px; }
.care-privacy-list p { margin:0; padding:15px; display:grid; grid-template-columns:24px minmax(0,1fr); gap:10px; border:1px solid var(--care-line); border-radius:14px; line-height:1.6; }
.care-privacy-list i { margin-top:4px; color:var(--care-accent); }

.ondam-care-app :focus-visible { outline:3px solid color-mix(in srgb,var(--care-accent) 75%,white); outline-offset:3px; }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }

@media (max-width: 680px) {
  .care-app-header { min-height:66px; padding:9px 12px; }
  .care-brand__mark { width:40px; height:40px; }
  .care-brand__words small { display:none; }
  .care-discover,.care-list-page,.care-focus-page,.care-report-detail { padding:18px 12px 96px; }
  .care-hero { min-height:190px; padding:25px 22px 50px; border-radius:8px 30px 8px 30px; }
  .care-hero h1 { font-size:31px; }
  .care-hero p { font-size:13px; }
  .care-hero__mascot { right: 16px; bottom: 14px; }
  .care-search { width:calc(100% - 20px); min-height:54px; margin-top:-25px; }
  .care-overview { grid-template-columns:1fr; }
  .care-institution-grid { grid-template-columns:1fr; }
  .care-institution-card__body { min-height:215px; padding:20px; grid-template-columns:46px minmax(0,1fr); }
  .care-institution-card__arrow { display:none; }
  .care-unavailable-ribbon { left:80px; }
  .care-bottom-nav { justify-content:space-around; gap:3px; }
  .care-bottom-nav button { min-width:70px; }
  .care-appointment-card { grid-template-columns:80px minmax(0,1fr); }
  .care-appointment-card__date { padding:18px 10px; }
  .care-appointment-card__date strong { font-size:34px; }
  .care-appointment-card__body { padding:18px 16px; }
  .care-appointment-card__body dl { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .care-report-row { grid-template-columns:4px 38px minmax(0,1fr) auto; gap:10px; padding:16px 12px; }
  .care-report-row__icon { width:38px; height:38px; }
  .care-report-row__topline { display:grid; }
  .care-report-row__body strong { font-size:17px; }
  .care-institution-detail__hero { padding:30px 22px; border-radius:8px 30px 8px 30px; }
  .care-institution-detail__monogram { font-size:130px; }
  .care-service-card { grid-template-columns:34px minmax(0,1fr); padding:18px 15px; gap:10px; }
  .care-service-card > .care-primary-button { grid-column:2; justify-self:start; }
  .care-appointment-detail__time { display:grid; gap:6px; }
  .care-appointment-detail__facts { grid-template-columns:1fr; }
  .care-report-detail__header { grid-template-columns:auto minmax(0,1fr); padding:22px 18px; }
  .care-report-detail__seal { width:48px; height:48px; }
  .care-revision-chip { grid-column:2; justify-self:start; }
  .care-report-summary { grid-template-columns:1fr; padding:22px 18px; gap:14px; }
  .care-results { padding:20px 10px; }
  .care-results__title { padding:0 8px; }
  .care-sheet__panel { width:100%; max-height:91%; margin:0; border-radius:22px 22px 0 0; }
  .care-sheet__header,.care-sheet__body,.care-sheet__footer { padding-left:16px; padding-right:16px; }
  .care-choice-grid,.care-date-grid { grid-template-columns:1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .ondam-care-app *, .ondam-care-app *::before, .ondam-care-app *::after { scroll-behavior:auto !important; transition:none !important; animation:none !important; }
}
</style>
