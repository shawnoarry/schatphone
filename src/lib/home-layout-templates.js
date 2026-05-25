export const HOME_LAYOUT_GRID_COLUMNS = 4
export const HOME_LAYOUT_GRID_ROWS = 6

const createSlot = (id, col, row, colSpan, rowSpan) => ({
  id,
  col,
  row,
  colSpan,
  rowSpan,
  size: `${colSpan}x${rowSpan}`,
})

export const HOME_LAYOUT_TEMPLATES = Object.freeze([
  {
    id: 'layout-a',
    key: 'A',
    slots: Object.freeze([
      createSlot('a-hero', 1, 1, 4, 2),
      createSlot('a-left', 1, 3, 2, 2),
      createSlot('a-small-1', 3, 3, 1, 1),
      createSlot('a-small-2', 4, 3, 1, 1),
      createSlot('a-small-3', 3, 4, 1, 1),
      createSlot('a-small-4', 4, 4, 1, 1),
      createSlot('a-base', 1, 5, 4, 2),
    ]),
  },
  {
    id: 'layout-b',
    key: 'B',
    slots: Object.freeze([
      createSlot('b-large', 1, 1, 4, 3),
      createSlot('b-wide-1', 1, 4, 2, 1),
      createSlot('b-wide-2', 3, 4, 2, 1),
      createSlot('b-small-1', 1, 5, 1, 1),
      createSlot('b-small-2', 2, 5, 1, 1),
      createSlot('b-small-3', 3, 5, 1, 1),
      createSlot('b-small-4', 4, 5, 1, 1),
      createSlot('b-small-5', 1, 6, 1, 1),
      createSlot('b-small-6', 2, 6, 1, 1),
      createSlot('b-small-7', 3, 6, 1, 1),
      createSlot('b-small-8', 4, 6, 1, 1),
    ]),
  },
  {
    id: 'layout-c',
    key: 'C',
    slots: Object.freeze([
      createSlot('c-top-left', 1, 1, 2, 2),
      createSlot('c-top-right', 3, 1, 2, 2),
      createSlot('c-wide', 1, 3, 4, 2),
      createSlot('c-small-1', 1, 5, 1, 1),
      createSlot('c-small-2', 2, 5, 1, 1),
      createSlot('c-small-3', 3, 5, 1, 1),
      createSlot('c-small-4', 4, 5, 1, 1),
      createSlot('c-small-5', 1, 6, 1, 1),
      createSlot('c-small-6', 2, 6, 1, 1),
      createSlot('c-small-7', 3, 6, 1, 1),
      createSlot('c-small-8', 4, 6, 1, 1),
    ]),
  },
  {
    id: 'layout-d',
    key: 'D',
    slots: Object.freeze([
      createSlot('d-top', 1, 1, 4, 2),
      createSlot('d-strip', 1, 3, 4, 1),
      createSlot('d-middle', 1, 4, 4, 2),
      createSlot('d-small-1', 1, 6, 1, 1),
      createSlot('d-small-2', 2, 6, 1, 1),
      createSlot('d-small-3', 3, 6, 1, 1),
      createSlot('d-small-4', 4, 6, 1, 1),
    ]),
  },
  {
    id: 'layout-e',
    key: 'E',
    slots: Object.freeze([
      createSlot('e-top-left', 1, 1, 2, 2),
      createSlot('e-top-right', 3, 1, 2, 2),
      createSlot('e-wide', 1, 3, 4, 2),
      createSlot('e-bottom-left', 1, 5, 2, 2),
      createSlot('e-bottom-right', 3, 5, 2, 2),
    ]),
  },
  {
    id: 'layout-f',
    key: 'F',
    slots: Object.freeze([
      createSlot('f-left', 1, 1, 2, 2),
      createSlot('f-right', 3, 1, 2, 2),
      createSlot('f-strip', 1, 3, 4, 1),
      createSlot('f-wide', 1, 4, 4, 2),
      createSlot('f-small-1', 1, 6, 1, 1),
      createSlot('f-small-2', 2, 6, 1, 1),
      createSlot('f-small-3', 3, 6, 1, 1),
      createSlot('f-small-4', 4, 6, 1, 1),
    ]),
  },
  {
    id: 'layout-g',
    key: 'G',
    slots: Object.freeze([
      createSlot('g-poster', 1, 1, 4, 4),
      createSlot('g-bottom-left', 1, 5, 2, 2),
      createSlot('g-bottom-right', 3, 5, 2, 2),
    ]),
  },
])

export const HOME_LAYOUT_TEMPLATE_IDS = Object.freeze(HOME_LAYOUT_TEMPLATES.map((template) => template.id))
export const DEFAULT_HOME_LAYOUT_TEMPLATE_ID = 'layout-c'
export const DEFAULT_HOME_LAYOUT_TEMPLATE_SEQUENCE = Object.freeze([
  'layout-c',
  'layout-b',
  'layout-f',
  'layout-d',
  'layout-e',
])

export const getHomeLayoutTemplate = (templateId = DEFAULT_HOME_LAYOUT_TEMPLATE_ID) =>
  HOME_LAYOUT_TEMPLATES.find((template) => template.id === templateId) ||
  HOME_LAYOUT_TEMPLATES.find((template) => template.id === DEFAULT_HOME_LAYOUT_TEMPLATE_ID) ||
  HOME_LAYOUT_TEMPLATES[0]

export const normalizeHomeLayoutTemplateId = (
  templateId,
  fallback = DEFAULT_HOME_LAYOUT_TEMPLATE_ID,
) => {
  const normalized = typeof templateId === 'string' ? templateId.trim() : ''
  if (HOME_LAYOUT_TEMPLATE_IDS.includes(normalized)) return normalized
  return HOME_LAYOUT_TEMPLATE_IDS.includes(fallback) ? fallback : DEFAULT_HOME_LAYOUT_TEMPLATE_ID
}

export const createDefaultHomeLayoutTemplateIds = (pageCount = 5) => {
  const count = Math.max(1, Math.floor(Number(pageCount) || 5))
  return Array.from(
    { length: count },
    (_, index) =>
      DEFAULT_HOME_LAYOUT_TEMPLATE_SEQUENCE[index % DEFAULT_HOME_LAYOUT_TEMPLATE_SEQUENCE.length],
  )
}

export const normalizeHomeLayoutTemplateIds = (templateIds, pageCount = 5) => {
  const count = Math.max(1, Math.floor(Number(pageCount) || 5))
  const defaults = createDefaultHomeLayoutTemplateIds(count)
  if (!Array.isArray(templateIds)) return defaults

  return Array.from({ length: count }, (_, index) =>
    normalizeHomeLayoutTemplateId(templateIds[index], defaults[index]),
  )
}

export const normalizeHomeLayoutSlotPlacements = (
  slotPlacements,
  pages = [],
  templateIds = [],
  getTileSize,
) => {
  const pageCount = Math.max(
    1,
    Array.isArray(pages) ? pages.length : 0,
    Array.isArray(templateIds) ? templateIds.length : 0,
  )
  const normalizedTemplateIds = normalizeHomeLayoutTemplateIds(templateIds, pageCount)
  const usedTileIds = new Set()

  return Array.from({ length: pageCount }, (_, pageIndex) => {
    const pageTileIds = new Set(Array.isArray(pages[pageIndex]) ? pages[pageIndex] : [])
    const template = getHomeLayoutTemplate(normalizedTemplateIds[pageIndex])
    const slotById = new Map(template.slots.map((slot) => [slot.id, slot]))
    const usedSlotIds = new Set()
    const pagePlacements = Array.isArray(slotPlacements?.[pageIndex])
      ? slotPlacements[pageIndex]
      : []
    const shouldValidateSize = typeof getTileSize === 'function'

    return pagePlacements
      .map((placement) => {
        const slotId = typeof placement?.slotId === 'string' ? placement.slotId.trim() : ''
        const tileId = typeof placement?.tileId === 'string' ? placement.tileId.trim() : ''
        const slot = slotById.get(slotId)
        if (!slotId || !tileId) return null
        if (!slot) return null
        if (!pageTileIds.has(tileId)) return null
        if (usedSlotIds.has(slotId)) return null
        if (usedTileIds.has(tileId)) return null
        if (shouldValidateSize && !canHomeLayoutTileSizeUseSlot(getTileSize(tileId), slot)) return null
        usedSlotIds.add(slotId)
        usedTileIds.add(tileId)
        return { slotId, tileId }
      })
      .filter(Boolean)
  })
}

export const homeLayoutSlotToGridStyle = (slot) => ({
  gridColumn: `${slot.col} / span ${slot.colSpan}`,
  gridRow: `${slot.row} / span ${slot.rowSpan}`,
})

export const homeLayoutSlotIndex = (slot) =>
  (Math.max(1, slot.row) - 1) * HOME_LAYOUT_GRID_COLUMNS + (Math.max(1, slot.col) - 1)

export const assignHomeLayoutSlotPlacements = (
  tileIds = [],
  template,
  slotPlacements = [],
  getTileSize = () => '1x1',
) => {
  const slots = Array.isArray(template?.slots) ? template.slots : []
  const availableSlots = slots.map((slot, index) => ({ ...slot, index }))
  const slotById = new Map(availableSlots.map((slot) => [slot.id, slot]))
  const assignedSlotIds = new Set()
  const assignedTileIndexes = new Set()
  const placements = []
  const overflow = []
  const tiles = (Array.isArray(tileIds) ? tileIds : []).map((tileId, index) => ({
    tileId,
    index,
    size: typeof getTileSize === 'function' ? getTileSize(tileId) : '1x1',
  }))
  const tileById = new Map(tiles.map((tile) => [tile.tileId, tile]))
  const tilesByLayoutPriority = [...tiles].sort((a, b) => {
    const areaDelta = parseSlotArea(b.size) - parseSlotArea(a.size)
    return areaDelta || a.index - b.index
  })

  const assignTileToSlot = (tile, slot, isExactSize, isExplicit = false) => {
    assignedSlotIds.add(slot.id)
    assignedTileIndexes.add(tile.index)
    placements.push({
      tileId: tile.tileId,
      tileIndex: tile.index,
      slot,
      slotIndex: slot.index,
      isExactSize,
      isExplicit,
    })
  }

  if (Array.isArray(slotPlacements)) {
    slotPlacements.forEach((placement) => {
      const slot = slotById.get(placement?.slotId)
      const tile = tileById.get(placement?.tileId)
      if (!slot || !tile) return
      if (assignedSlotIds.has(slot.id) || assignedTileIndexes.has(tile.index)) return
      if (!canHomeLayoutTileSizeUseSlot(tile.size, slot)) return
      assignTileToSlot(tile, slot, slot.size === tile.size, true)
    })
  }

  tilesByLayoutPriority
    .filter((tile) => !assignedTileIndexes.has(tile.index))
    .forEach((tile) => {
      const exactSlot = availableSlots.find(
        (slot) => !assignedSlotIds.has(slot.id) && slot.size === tile.size,
      )
      if (exactSlot) {
        assignTileToSlot(tile, exactSlot, true)
      }
    })

  tilesByLayoutPriority
    .filter((tile) => !assignedTileIndexes.has(tile.index))
    .forEach((tile) => {
      const compatibleSlot = availableSlots
        .filter((slot) => !assignedSlotIds.has(slot.id))
        .filter((slot) => canHomeLayoutTileSizeUseSlot(tile.size, slot))
        .sort((a, b) => a.colSpan * a.rowSpan - b.colSpan * b.rowSpan || a.index - b.index)[0]

      if (!compatibleSlot) {
        overflow.push(tile.tileId)
        return
      }

      assignTileToSlot(tile, compatibleSlot, false)
    })

  const emptySlots = availableSlots.filter((slot) => !assignedSlotIds.has(slot.id))

  return {
    placements: placements.sort((a, b) => a.slotIndex - b.slotIndex),
    emptySlots: emptySlots.sort((a, b) => a.index - b.index),
    overflow,
  }
}

export const assignHomeLayoutSlots = (tileIds = [], template, getTileSize = () => '1x1') => {
  return assignHomeLayoutSlotPlacements(tileIds, template, [], getTileSize)
}

export const canHomeLayoutTileSizeUseSlot = (size, slot) => {
  const { cols, rows } = parseSlotSize(size)
  return cols === slot?.colSpan && rows === slot?.rowSpan
}

const parseSlotSize = (size = '1x1') => {
  if (typeof size !== 'string') return { cols: 1, rows: 1 }
  const [cols, rows] = size.split('x').map((value) => Number.parseInt(value, 10))
  return {
    cols: Number.isInteger(cols) ? Math.max(1, cols) : 1,
    rows: Number.isInteger(rows) ? Math.max(1, rows) : 1,
  }
}

const parseSlotArea = (size = '1x1') => {
  const { cols, rows } = parseSlotSize(size)
  return cols * rows
}
