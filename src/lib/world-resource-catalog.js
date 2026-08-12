const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,179}$/i

const SUPPORTED_RESOURCE_OWNERS = Object.freeze({
  book_asset: 'book',
  gallery_asset_pack: 'gallery',
  map_pack: 'map',
})

const normalizeId = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  const normalized = String(value).normalize('NFKC').trim().slice(0, 180)
  return ID_PATTERN.test(normalized) ? normalized : ''
}

const normalizeVersion = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.floor(numeric))
}

const clone = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

const normalizeCatalogRecord = (rawRecord = {}) => {
  const source = rawRecord && typeof rawRecord === 'object' && !Array.isArray(rawRecord)
    ? rawRecord
    : {}
  const type = normalizeId(source.type)
  const expectedOwner = SUPPORTED_RESOURCE_OWNERS[type] || ''
  const owner = normalizeId(source.owner) || expectedOwner
  const catalogId = normalizeId(source.catalogId || source.id)
  const catalogVersion = normalizeVersion(source.catalogVersion || source.version)
  if (!type || !expectedOwner || owner !== expectedOwner || !catalogId || catalogVersion < 1) {
    return null
  }
  return {
    ...clone(source),
    type,
    owner,
    catalogId,
    catalogVersion,
  }
}

const buildKey = ({ owner, type, catalogId, catalogVersion }) =>
  `${owner}:${type}:${catalogId}:${catalogVersion}`

export const createWorldResourceCatalog = (initialRecords = []) => {
  const records = new Map()

  const register = (rawRecord) => {
    const record = normalizeCatalogRecord(rawRecord)
    if (!record) return { ok: false, code: 'catalog_record_invalid' }
    const key = buildKey(record)
    if (records.has(key)) return { ok: false, code: 'catalog_record_duplicate' }
    records.set(key, record)
    return { ok: true, code: '', record: clone(record) }
  }

  const initialErrors = []
  ;(Array.isArray(initialRecords) ? initialRecords : []).forEach((record) => {
    const result = register(record)
    if (!result.ok) initialErrors.push(result)
  })

  const get = ({ owner, type, catalogId, version } = {}) => {
    const query = {
      owner: normalizeId(owner),
      type: normalizeId(type),
      catalogId: normalizeId(catalogId),
      catalogVersion: normalizeVersion(version),
    }
    const record = records.get(buildKey(query))
    return record ? clone(record) : null
  }

  const createResolver = ({ owner, type } = {}) => {
    const normalizedOwner = normalizeId(owner)
    const normalizedType = normalizeId(type)
    return (catalogId, version) => get({
      owner: normalizedOwner,
      type: normalizedType,
      catalogId,
      version,
    })
  }

  return {
    initialErrors,
    register,
    unregister: ({ owner, type, catalogId, version } = {}) => {
      const query = {
        owner: normalizeId(owner),
        type: normalizeId(type),
        catalogId: normalizeId(catalogId),
        catalogVersion: normalizeVersion(version),
      }
      return records.delete(buildKey(query))
    },
    get,
    createResolver,
    list: ({ owner = '', type = '' } = {}) => {
      const normalizedOwner = normalizeId(owner)
      const normalizedType = normalizeId(type)
      return [...records.values()]
        .filter((record) => !normalizedOwner || record.owner === normalizedOwner)
        .filter((record) => !normalizedType || record.type === normalizedType)
        .sort((left, right) => buildKey(left).localeCompare(buildKey(right)))
        .map(clone)
    },
  }
}
