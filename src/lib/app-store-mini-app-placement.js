const MINI_APP_ENTRY_ID_PATTERN = /^shop_app_[a-z0-9_-]{1,180}$/i

export const normalizeMiniAppEntryId = (entryId = '') => {
  const normalized = typeof entryId === 'string' ? entryId.trim() : ''
  return MINI_APP_ENTRY_ID_PATTERN.test(normalized) ? normalized : ''
}

const normalizeHiddenEntryIds = (input = []) => {
  const values = Array.isArray(input) ? input : []
  return [...new Set(values.map((entryId) => normalizeMiniAppEntryId(entryId)).filter(Boolean))].slice(0, 300)
}

export const normalizeAppStoreMiniAppPlacements = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  return {
    hiddenEntryIds: normalizeHiddenEntryIds(source.hiddenEntryIds || source.uninstalledEntryIds),
  }
}

export const isMiniAppEntryInstalled = (placements = {}, entryId = '') => {
  const normalizedId = normalizeMiniAppEntryId(entryId)
  if (!normalizedId) return true
  return !new Set(normalizeAppStoreMiniAppPlacements(placements).hiddenEntryIds).has(normalizedId)
}

export const setMiniAppEntryInstalled = (current = {}, entryId = '', installed = true) => {
  const normalizedId = normalizeMiniAppEntryId(entryId)
  const placements = normalizeAppStoreMiniAppPlacements(current)
  if (!normalizedId) return placements
  const hiddenIds = new Set(placements.hiddenEntryIds)
  if (installed) hiddenIds.delete(normalizedId)
  else hiddenIds.add(normalizedId)
  return normalizeAppStoreMiniAppPlacements({
    hiddenEntryIds: [...hiddenIds],
  })
}
