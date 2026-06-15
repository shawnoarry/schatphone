import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSystemStore } from '../stores/system'
import {
  filterNetworkReports,
  summarizeNetworkReports,
} from '../lib/network-report-state'

export const useSystemApiReports = (options = {}) => {
  const systemStore = options.systemStore || useSystemStore()
  const { apiReports } = storeToRefs(systemStore)

  const reportItems = computed(() =>
    Array.isArray(apiReports.value) ? apiReports.value : [],
  )

  const reportSummary = computed(() => summarizeNetworkReports(reportItems.value))

  const listReports = (filters = {}) =>
    filterNetworkReports(reportItems.value, filters)

  const createReportSnapshot = () =>
    reportItems.value.map((report) => ({ ...report }))

  const addReport = (rawReport = {}) => systemStore.addApiReport(rawReport)

  const clearReports = (filters = {}) => systemStore.clearApiReports(filters)

  const latestReportByModule = (moduleKey) => {
    const normalizedModule = typeof moduleKey === 'string' ? moduleKey.trim() : ''
    if (!normalizedModule) return null
    return reportItems.value.find((item) => item?.module === normalizedModule) || null
  }

  const countReports = (filters = {}) =>
    listReports({ ...filters, limit: Number.MAX_SAFE_INTEGER }).length

  return {
    reportItems,
    reportSummary,
    listReports,
    createReportSnapshot,
    addReport,
    clearReports,
    latestReportByModule,
    countReports,
  }
}
