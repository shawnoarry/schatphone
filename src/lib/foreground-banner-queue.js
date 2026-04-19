export const collectForegroundBannerNotes = (list, seenIds) => {
  const normalizedList = Array.isArray(list) ? list : []
  const seenSet = seenIds instanceof Set ? seenIds : new Set()

  return normalizedList
    .filter((note) => {
      const noteId = typeof note?.id === 'string' ? note.id.trim() : ''
      if (!noteId) return false
      if (seenSet.has(noteId)) return false
      if (note?.read) return false
      return true
    })
    .slice()
    .reverse()
}

export const appendForegroundBannerQueue = (queue, incomingNotes, activeNote = null) => {
  const nextQueue = Array.isArray(queue) ? [...queue] : []
  const queuedIds = new Set(
    nextQueue
      .map((note) => (typeof note?.id === 'string' ? note.id.trim() : ''))
      .filter(Boolean),
  )
  const activeId = typeof activeNote?.id === 'string' ? activeNote.id.trim() : ''
  if (activeId) queuedIds.add(activeId)

  ;(Array.isArray(incomingNotes) ? incomingNotes : []).forEach((note) => {
    const noteId = typeof note?.id === 'string' ? note.id.trim() : ''
    if (!noteId || queuedIds.has(noteId)) return
    queuedIds.add(noteId)
    nextQueue.push(note)
  })

  return nextQueue
}
