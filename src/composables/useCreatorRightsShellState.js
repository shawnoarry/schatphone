import { computed, reactive } from 'vue'
import { CREATOR_RIGHTS_STORAGE_KEY, CREATOR_RIGHTS_STORAGE_VERSION, getCreatorWork } from '../lib/creator-rights-shell-data'

const TABS = new Set(['desk', 'works', 'statements', 'me'])
const defaults = () => ({ version: CREATOR_RIGHTS_STORAGE_VERSION, activeTab: 'desk', selectedYear: 2026, savedWorkIds: [], declarationDraft: { year: 2026, workIds: [], note: '' } })
const uniqueWorks = (items) => [...new Set((Array.isArray(items) ? items : []).filter((id) => getCreatorWork(id)))]
export const normalizeCreatorRightsState = (candidate) => {
  const base = defaults()
  if (!candidate || candidate.version !== CREATOR_RIGHTS_STORAGE_VERSION) return base
  return { version: CREATOR_RIGHTS_STORAGE_VERSION, activeTab: TABS.has(candidate.activeTab) ? candidate.activeTab : 'desk', selectedYear: [2025, 2026].includes(Number(candidate.selectedYear)) ? Number(candidate.selectedYear) : 2026, savedWorkIds: uniqueWorks(candidate.savedWorkIds), declarationDraft: { year: [2025, 2026].includes(Number(candidate.declarationDraft?.year)) ? Number(candidate.declarationDraft.year) : 2026, workIds: uniqueWorks(candidate.declarationDraft?.workIds), note: typeof candidate.declarationDraft?.note === 'string' ? candidate.declarationDraft.note.slice(0, 500) : '' } }
}
const load = () => { try { const raw = window.localStorage?.getItem(CREATOR_RIGHTS_STORAGE_KEY); return raw ? normalizeCreatorRightsState(JSON.parse(raw)) : defaults() } catch { return defaults() } }
const state = reactive(load())
const save = (next) => { try { window.localStorage.setItem(CREATOR_RIGHTS_STORAGE_KEY, JSON.stringify(next)); Object.assign(state, next); return { ok: true } } catch { return { ok: false, error: 'write_failed' } } }
const clone = () => JSON.parse(JSON.stringify(state))
export const useCreatorRightsShellState = () => ({
  previewState: state,
  activeTab: computed(() => state.activeTab), selectedYear: computed(() => state.selectedYear), savedWorkIds: computed(() => state.savedWorkIds), declarationDraft: computed(() => state.declarationDraft),
  setActiveTab(tab) { if (!TABS.has(tab)) return { ok: false, error: 'tab_invalid' }; const next = clone(); next.activeTab = tab; return save(next) },
  setYear(year) { if (![2025, 2026].includes(Number(year))) return { ok: false, error: 'year_invalid' }; const next = clone(); next.selectedYear = Number(year); return save(next) },
  toggleSaved(id) { if (!getCreatorWork(id)) return { ok: false, error: 'work_missing' }; const next = clone(); next.savedWorkIds = next.savedWorkIds.includes(id) ? next.savedWorkIds.filter((item) => item !== id) : [...next.savedWorkIds, id]; return save(next) },
  toggleDeclarationWork(id) { if (!getCreatorWork(id)) return { ok: false, error: 'work_missing' }; const next = clone(); next.declarationDraft.workIds = next.declarationDraft.workIds.includes(id) ? next.declarationDraft.workIds.filter((item) => item !== id) : [...next.declarationDraft.workIds, id]; return save(next) },
  updateDeclarationNote(note) { const next = clone(); next.declarationDraft.note = String(note || '').slice(0, 500); return save(next) },
})
export const resetCreatorRightsShellStateForTesting = () => { Object.assign(state, defaults()); try { window.localStorage?.removeItem(CREATOR_RIGHTS_STORAGE_KEY) } catch { /* best effort */ } }
